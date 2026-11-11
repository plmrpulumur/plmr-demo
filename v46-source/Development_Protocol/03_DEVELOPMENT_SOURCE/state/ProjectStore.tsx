import {awaitProjectMasterSave,cloudEnabled,cloudReadProjectMaster,cloudWriteProjectIndex} from '../services/cloudPlatform'
import {tenantStorage as localStorage,tenantKey,assertTenantReadable} from '../services/platformAccess'
import {projectFromWorkflow} from '../domain/projectWorkflow'
import type {DrawingProjectRecord} from '../services/drawingPersistence'
import {projectFromQuickQuote} from '../domain/quickQuoteProject'
import type {QuickQuote} from '../domain/quickQuote'
import {normalizeProjectStatus,normalizeProductionStatus} from '../domain/projectStatus'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { LEGACY_CUSTOMER_NAME_TO_ID } from '../data/mockCustomers'
import type { ProjectMaster, ProjectStatus, ProductionItem, ProductionItemStatus } from '../domain/project'
import {withdrawProject} from '../services/projectWorkflow'
import {assertApprovedMasterChange,canWithdrawProject} from '../domain/projectApprovals'
import { ProjectConflictError, assertLockedProductionHistory, projectRevisionPackaged } from '../domain/project'
import { uuidv7 } from '../domain/customer'
import { deriveProjectStatusFromProduction, PRODUCTION_STATUS_RANK, syncProductionItemsFromActiveRevision } from '../domain/project'
import { PROJECT_STATUS, PRODUCTION_ITEM_STATUS } from '../config/projectStatuses'
import { useNotificationStore } from './NotificationStore'
import { useUserDirectory } from './UserDirectoryStore'
import { usePermissionResolver } from './PermissionContext'
import { useAuditStore } from './AuditStore'
import { projectTransitionPath } from '../domain/projectWorkflow'

interface ProjectStoreValue {
  syncWorkflowProject:(record:DrawingProjectRecord,seed?:ProjectMaster)=>ProjectMaster

  linkQuickQuote:(quote:QuickQuote,representative?:string)=>ProjectMaster

  hydrateProject: (reference:string)=>Promise<ProjectMaster|undefined>
  projects: ProjectMaster[]
  getProjectByCode: (projKodu: string) => ProjectMaster | undefined
  getProjectById: (projectId: string) => ProjectMaster | undefined
  updateProjectStatus: (ids: number[], status: ProjectStatus, note: string) => Promise<DrawingProjectRecord|void>
  archiveProjectRecords: (ids: number[]) => void
  restoreArchivedProjects: (ids: number[]) => void
  updateProductionItemStatus: (projectId: number, itemId: string, status: ProductionItemStatus) => void
  softDeleteProjects: (ids: number[], deletedBy: string) => void
  restoreProject: (id: number) => void
  purgeProject: (id: number) => void
  upsertProject: (project: ProjectMaster, options?:{expectedVersion?:number;auditLabel?:string;auditNote?:string}) => void
  patchProject: (projKodu: string, patch: Partial<ProjectMaster>, options?:{expectedVersion?:number;auditLabel?:string;auditNote?:string;persistNow?:boolean}) => void
  assertProjectVersion: (projKodu:string, expectedVersion:number) => void
}

const ProjectStoreContext = createContext<ProjectStoreValue | null>(null)

const PROJECT_PROGRESS_RANK: Partial<Record<ProjectStatus, number>> = {
  10:0,
  20: 1,
  30: 2,
  40: 3,
  50: 4,
  60: 5,
}

function formatMilestoneTimestamp(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${day}.${month}.${year} ${hour}:${minute}`
}

function withMilestone(item: ProductionItem, status: ProductionItemStatus, timestamp=formatMilestoneTimestamp()): ProductionItem {
  const milestones = { ...item.milestones }
  if(status===40&&!milestones.transfer)milestones.transfer=timestamp
  if(status===50&&!milestones.delivery)milestones.delivery=timestamp
  if(status===60&&!milestones.delivered)milestones.delivered=timestamp
  if (status === 20 && !milestones.onaylandi) milestones.onaylandi = timestamp
  if (status === 30 && !milestones.uretimde) milestones.uretimde = timestamp
  if (status === 50 && !milestones.sevkeHazir) milestones.sevkeHazir = timestamp
  if (status === 60 && !milestones.sevkEdildi) milestones.sevkEdildi = timestamp
  return { ...item, status, milestones }
}

function createProductionItems(project: ProjectMaster, status: ProductionItemStatus): ProductionItem[] {
  const stamp = formatMilestoneTimestamp()
  const products = project.urunler.length ? project.urunler : ['Ürün']
  return products.map((urun, index) => {
    let item: ProductionItem = {
      id: `${project.id}-AUTO-${index+1}`,
      kod: `P${String(index+1).padStart(2,'0')}`,
      urun,
      miktar: 1,
      status:20,
      teknikTamamlandi:'pending',
      milestones:{ onaylandi:stamp },
    }
    if (PRODUCTION_STATUS_RANK[status] >= PRODUCTION_STATUS_RANK[30]) item = withMilestone(item,30,stamp)
    if (PRODUCTION_STATUS_RANK[status] >= PRODUCTION_STATUS_RANK[40]) item = withMilestone(item,40,stamp)
    if (PRODUCTION_STATUS_RANK[status] >= PRODUCTION_STATUS_RANK[50]) item = withMilestone(item,50,stamp)
    if (PRODUCTION_STATUS_RANK[status] >= PRODUCTION_STATUS_RANK[60]) item = withMilestone(item,60,stamp)
    return item
  })
}

function targetProductionStatus(status: ProjectStatus): ProductionItemStatus | null {
  return status === 20 || status === 30 || status === 40 || status === 50 || status === 60 ? status : null
}

function syncProductionBridge(project: ProjectMaster, nextStatus: ProjectStatus, currentUserName:string, currentUserId?:string): ProjectMaster {
  const target = targetProductionStatus(nextStatus)
  if (!target) return { ...project, status:nextStatus }
  const stamp = formatMilestoneTimestamp()
  const projected = syncProductionItemsFromActiveRevision({ ...project, status:nextStatus }, target)
  const baseItems = projected.length ? projected : project.sourceQuickQuoteId&&!project.hasTechnicalDrawing ? [] : createProductionItems(project,target)
  // Project-level manual status is independent of existing position progress.
  // The canonical projector already preserves each saved item's stage/milestones.
  const items = baseItems

  return {
    ...project,
    status:nextStatus,
    productionItems:items,
    uretimiAcan: typeof nextStatus==='number'&&nextStatus>=30 ? project.uretimiAcan || currentUserName : project.uretimiAcan,
    ownerUserId: project.ownerUserId || currentUserId,
    assignedUserIds: project.assignedUserIds || (currentUserId?[currentUserId]:[]),
    orderApprovedAt: nextStatus===20 && project.status!==20 ? new Date().toISOString() : project.orderApprovedAt,
    sonIslemTarihi:stamp,
  }
}

function normalizeProject(project: ProjectMaster, currentUserId:string, currentUserName:string): ProjectMaster {
  const originalStatus=project.status
  project={...project,status:normalizeProjectStatus(originalStatus),statusSchemaVersion:54,legacyStatus:typeof originalStatus==='string'&&!['iptal','arsivlendi'].includes(originalStatus)?originalStatus:project.legacyStatus,productionItems:(project.productionItems||[]).map(item=>({...item,status:normalizeProductionStatus(item.status)}))}
  let next:ProjectMaster={...project,projectId:project.projectId || uuidv7(),revisionId:project.revisionId || uuidv7(),revisions:project.projectDetailsDeferred?undefined:project.revisions||[],customerId:project.customerId || LEGACY_CUSTOMER_NAME_TO_ID[project.musteriAdi],recordVersion:Math.max(1,Number(project.recordVersion||1)),updatedAt:project.updatedAt || new Date().toISOString(),updatedBy:project.updatedBy || currentUserId,createdByUserId:project.createdByUserId||currentUserId,ownerUserId:project.ownerUserId||currentUserId,assignedUserIds:project.assignedUserIds||[],projectRepresentativeUserId:project.projectRepresentativeUserId||currentUserId}
  const target=targetProductionStatus(project.status)
  if(target){
    const projected=syncProductionItemsFromActiveRevision(next,target)
    // Normalization repairs canonical position links without flattening per-position
    // operational progress. Direct project status changes still use syncProductionBridge.
    if(projected.length) next={...next,productionItems:projected}
    else if(next.productionItems.length===0&&!next.productionPositionCounts) next=syncProductionBridge(next,project.status,currentUserName,currentUserId)
  }
  return next
}

const PROJECT_INDEX_KEY = 'plmr.project.index.v11'
const LEGACY_KEYS = ['plmr.project.index.v10','plmr.project.index.v9','plmr.v8.project.index','plmr.v7.project.index']
function loadInitialProjects(): ProjectMaster[] {
  try {
    const raw = localStorage.getItem(PROJECT_INDEX_KEY) || LEGACY_KEYS.map(key=>localStorage.getItem(key)).find(Boolean)
    const source = raw ? JSON.parse(raw) : []
    return (Array.isArray(source)?source:[])
  } catch (_) {
    return []
  }
}

export function ProjectStoreProvider({ children }: { children: ReactNode }) {
  const directory=useUserDirectory(); const perms=usePermissionResolver(); const audit=useAuditStore(); const currentUser=directory.currentUser
  const readProjects=useCallback(()=>loadInitialProjects().map(p=>{
    const owner=directory.findUserByName(p.cizen)?.userId||directory.findUserByName(p.musteriTemsilcisi)?.userId||currentUser.userId
    return normalizeProject(p,owner,p.cizen||currentUser.fullName)
  }),[directory,currentUser])
  const [projects,setProjects]=useState<ProjectMaster[]>(readProjects)
  const projectsRef=useRef(projects)
  const persisted=useRef<ProjectMaster[]|undefined>(cloudEnabled()?projects:undefined)
  const persistProjects=useCallback((rows:ProjectMaster[])=>{
    if(persisted.current===rows)return
    if(!persisted.current||!cloudEnabled()||!cloudWriteProjectIndex(tenantKey(PROJECT_INDEX_KEY),persisted.current,rows))
      localStorage.setItem(PROJECT_INDEX_KEY,JSON.stringify(rows))
    persisted.current=rows
  },[])
  const updateProjects=useCallback((update:(previous:ProjectMaster[])=>ProjectMaster[])=>{const next=update(projectsRef.current);projectsRef.current=next;setProjects(next)},[])
  const detailRequests=useRef(new Map<number,Promise<ProjectMaster|undefined>>())
  const hydrateProject=useCallback((reference:string)=>{
    const project=projectsRef.current.find(p=>p.projKodu===reference||p.projectId===reference)
    if(!project?.projectDetailsDeferred)return Promise.resolve(project)
    const pending=detailRequests.current.get(project.id)
    if(pending)return pending
    const cid=assertTenantReadable()
    const request=cloudReadProjectMaster(cid,project.id).then(detail=>{
      const current=projectsRef.current.find(p=>p.id===project.id)
      if(current!==project)throw Error('Proje güncellendi. Çalışma alanını yenileyin.')
      const hydrated=normalizeProject(detail,currentUser.userId,currentUser.fullName)
      // Hydration is a read. Use the same object as the baseline so it cannot
      // enqueue a master update or overwrite unrelated pending operations.
      if(persisted.current)persisted.current=persisted.current.map(p=>p===project?hydrated:p)
      updateProjects(rows=>rows.map(p=>p===project?hydrated:p))
      return hydrated
    }).finally(()=>detailRequests.current.delete(project.id))
    detailRequests.current.set(project.id,request)
    return request
  },[currentUser.userId,currentUser.fullName,updateProjects])
  const { addNotification } = useNotificationStore()
  useEffect(()=>{
    function refresh(){
      const rows=readProjects();persisted.current=rows;updateProjects(()=>rows)
    }
    window.addEventListener('plmr-project-index-replayed',refresh)
    return()=>window.removeEventListener('plmr-project-index-replayed',refresh)
  },[readProjects,updateProjects])


  useEffect(() => { if(projectsRef.current===projects)try { persistProjects(projects) } catch (_) {} }, [projects,persistProjects])
  const canSeeProject=(project:ProjectMaster)=>(perms.can('project.view')||Boolean(project.sourceQuickQuoteId&&!project.hasTechnicalDrawing&&perms.can('commercial.quote.view')))&&perms.canAccessRecord('PROJECTS',{ownerUserId:project.ownerUserId||directory.findUserByName(project.cizen)?.userId,assignedUserIds:project.assignedUserIds,createdByUserId:project.createdByUserId,representativeUserId:project.projectRepresentativeUserId||directory.findUserByName(project.musteriTemsilcisi)?.userId})
  const getProjectByCode = useCallback((projKodu: string) => projectsRef.current.find(project => project.projKodu === projKodu && canSeeProject(project)), [projects,perms,directory.users])
  const getProjectById = useCallback((projectId: string) => projectsRef.current.find(project => project.projectId === projectId && canSeeProject(project)), [projects,perms,directory.users])

  const setArchiveState = useCallback((ids:number[],restore:boolean,note?:string)=>{
    if(!perms.can('project.archive'))throw Error('Bu işlem için proje arşivleme yetkiniz yok.')
    const requested=new Set(ids)
    if(cloudEnabled()&&requested.size>250)throw Error('Tek işlemde en fazla 250 proje seçin.')
    const targets=projectsRef.current.filter(project=>requested.has(project.id))
    if(targets.length!==requested.size||targets.some(p=>p.deletedAt||!canSeeProject(p)))throw Error('Seçilen projelerden en az biri için erişim yetkiniz bulunmuyor.')
    if(targets.some(p=>p.approvals?.quote))throw Error('Onaylanmış proje yalnız önceki bir aşamaya geri çekilebilir.')
    const now=new Date(),label=restore?'Proje arşivden geri taşındı':'Proje arşivlendi'
    const updates=new Map<number,ProjectMaster>()
    for(const project of targets){
      if(restore!==(project.status==='arsivlendi'))continue
      const entry=restore&&!project.archivedFromStatus?audit.events.find(e=>
        (project.projectId&&e.entityId===project.projectId||e.entityDisplaySnapshot===project.projKodu)&&
        (e.newValue as {status?:ProjectStatus}|undefined)?.status==='arsivlendi'
      ):undefined
      const previous=project.archivedFromStatus??normalizeProjectStatus((entry?.oldValue as {status?:ProjectStatus}|undefined)?.status)
      const status:ProjectStatus=restore?(previous==='arsivlendi'?10:previous):'arsivlendi'
      const next={...project,status,recordVersion:Number(project.recordVersion||1)+1,updatedAt:now.toISOString(),updatedBy:currentUser.userId,sonIslemTarihi:formatMilestoneTimestamp(now)}
      if(restore)delete next.archivedFromStatus
      else if(project.status!=='arsivlendi')next.archivedFromStatus=project.status
      updates.set(project.id,next)
    }
    if(!updates.size)return
    const rows=projectsRef.current.map(project=>updates.get(project.id)||project)
    persistProjects(rows)
    updateProjects(()=>rows)
    for(const project of targets){
      const next=updates.get(project.id);if(!next)continue
      audit.record({timestamp:now.toISOString(),actorUserId:currentUser.userId,actorDisplaySnapshot:currentUser.fullName,eventType:'PROJECT_STATUS_CHANGED',entityType:'PROJECT',entityId:project.projectId||project.projKodu,entityDisplaySnapshot:project.projKodu,oldValue:{status:project.status},newValue:{status:next.status},details:note||label,metadata:{activityLabel:label,status:next.status,revision:project.revizyon,note:note||''}})
    }
  },[perms,directory.users,currentUser.userId,currentUser.fullName,audit,persistProjects,updateProjects])
  const archiveProjectRecords=useCallback((ids:number[])=>setArchiveState(ids,false),[setArchiveState])
  const restoreArchivedProjects=useCallback((ids:number[])=>setArchiveState(ids,true),[setArchiveState])

  const updateProjectStatus = useCallback(async (ids: number[], status: ProjectStatus, note: string) => {
    const cleanNote=String(note||'').trim()
    if(!cleanNote) throw new Error('Durum değişikliği açıklaması zorunludur. Lütfen işlemin nedenini kısaca yazın.')
    const selected=new Set(ids)
    if(cloudEnabled()&&selected.size>250)throw Error('Tek işlemde en fazla 250 proje seçin.')
    if(status==='arsivlendi'){
      setArchiveState(ids,false,cleanNote)
      await Promise.all([...selected].map(awaitProjectMasterSave))
      return
    }
    const required = status===20?'project.approve':status===30?'operations.start_production':status===50?'operations.mark_ready_to_ship':(status===40||status===60)?'operations.mark_shipped':'project.status.change'
    const requestedProjects=projectsRef.current.filter(project=>selected.has(project.id))
    if(requestedProjects.length!==selected.size)throw Error('Seçilen projelerden en az biri artık bulunamadı.')
    if(requestedProjects.some(p=>p.approvals?.shipment))throw Error('Sevkiyat onaylandı. Proje salt okunurdur.')
    if(requestedProjects.some(project=>!canSeeProject(project))) throw new Error('Bu işlem yapılamadı. Seçilen projelerden en az biri için erişim yetkiniz bulunmuyor.')
    if(requestedProjects.some(project=>project.status==='arsivlendi'))throw Error('Önce projeyi arşivden geri taşıyın.')
    const approved=requestedProjects.find(p=>p.approvals?.quote)
    if(approved){
      if(requestedProjects.length!==1)throw Error('Onaylanmış projeleri ayrı ayrı geri çekin.')
      if(typeof status!=='number'||!canWithdrawProject(approved.status,status))throw Error('Onaylanmış proje yalnız önceki bir aşamaya geri çekilebilir.')
      if(!perms.can('project.status.change'))throw Error('Projeyi geri çekme yetkiniz yok.')
      if(approved.workflowVersion===undefined)throw Error('Önce projeyi yeniden açın.')
      await hydrateProject(approved.projKodu)
      const record=await withdrawProject(approved.projKodu,status,approved.workflowVersion,cleanNote)
      const latest=projectsRef.current.find(p=>p.projKodu===approved.projKodu)||approved
      const next=projectFromWorkflow(record,latest)
      assertLockedProductionHistory(latest,next)
      const rows=projectsRef.current.map(p=>p.projKodu===next.projKodu?next:p)
      persistProjects(rows);updateProjects(()=>rows)
      await awaitProjectMasterSave(next.id)
      audit.record({actorUserId:currentUser.userId,actorDisplaySnapshot:currentUser.fullName,eventType:'PROJECT_STATUS_CHANGED',entityType:'PROJECT',entityId:next.projectId||next.projKodu,entityDisplaySnapshot:next.projKodu,oldValue:{status:approved.status},newValue:{status},details:cleanNote,metadata:{activityLabel:'Proje geri çekildi',status,revision:next.revizyon,note:cleanNote}})
      window.dispatchEvent(new Event('plmr-workflow-changed'))
      return record
    }
    if(!perms.can(required as any))throw Error(`Bu işlem yapılamadı. ${PROJECT_STATUS[status].label} durumuna geçmek için gerekli yetkiniz bulunmuyor.`)
    const targets = requestedProjects.filter(project => project.status !== status)
    if(!targets.length) throw new Error('Seçilen proje veya projeler zaten bu durumda.')
    if(targetProductionStatus(status)){
      for(let i=0;i<targets.length;i+=5){
        await Promise.all(targets.slice(i,i+5).filter(p=>p.productionPositionCounts).map(p=>hydrateProject(p.projKodu)))
      }
    }
    const transactionId=uuidv7()
    const transitionTime=new Date().toISOString()
    const rows=projectsRef.current.map(project=>selected.has(project.id)&&project.status!==status
      ?{...syncProductionBridge(project,status,currentUser.fullName,currentUser.userId),
        sonIslemTarihi:formatMilestoneTimestamp(new Date(transitionTime)),recordVersion:Number(project.recordVersion||1)+1,
        updatedAt:transitionTime,updatedBy:currentUser.userId}
      :project)
    persistProjects(rows)
    updateProjects(()=>rows)
    await Promise.all(targets.map(project=>awaitProjectMasterSave(project.id)))
    targets.forEach(project => {
      const currentRank = PROJECT_PROGRESS_RANK[project.status]
      const nextRank = PROJECT_PROGRESS_RANK[status]
      const regressed = currentRank !== undefined && nextRank !== undefined && nextRank < currentRank
      addNotification({
        type: regressed ? 'PROJECT_STATUS_REGRESSED' : 'PROJECT_STATUS_CHANGED',
        projectCode: project.projKodu,
        message: `${project.projKodu} durumu ${PROJECT_STATUS[project.status].label} → ${PROJECT_STATUS[status].label} olarak güncellendi`,
        audience: 'internal',
      })
      if(status===20 && project.productionItems.length===0) addNotification({type:'PRODUCTION_STATUS_CHANGED',projectCode:project.projKodu,message:`${project.projKodu} onaylandı ve Üretim takip ekranına aktarıldı`,audience:'internal'})
      const path=projectTransitionPath(project.status,status)
      path.forEach((stage,index)=>{
        const isTarget=index===path.length-1
        audit.record({
          timestamp:transitionTime,
          actorUserId:currentUser.userId,
          actorDisplaySnapshot:currentUser.fullName,
          eventType:stage===20?'PROJECT_APPROVED':'PROJECT_STATUS_CHANGED',
          entityType:'PROJECT',
          entityId:project.projectId||project.projKodu,
          entityDisplaySnapshot:project.projKodu,
          oldValue:{status:index===0?project.status:path[index-1]},
          newValue:{status:stage},
          details:isTarget?cleanNote:'Manuel durum geçişi nedeniyle tamamlandı.',
          metadata:{transactionId,eventType:isTarget?'USER_TARGET':'AUTO_INTERMEDIATE',directTransition:true,activityLabel:isTarget?'Durum güncellendi':'Ara aşama tamamlandı',status:stage,revision:project.revizyon,note:isTarget?cleanNote:'Manuel durum geçişi nedeniyle tamamlandı.'}
        })
      })
    })
  }, [projects,addNotification,perms,currentUser.fullName,currentUser.userId,audit,persistProjects,updateProjects,setArchiveState,hydrateProject])

  const updateProductionItemStatus = useCallback((projectId: number, itemId: string, status: ProductionItemStatus) => {
    const required = status===30?'operations.start_production':status===50?'operations.mark_ready_to_ship':(status===40||status===60)?'operations.mark_shipped':'operations.view'
    if(!perms.can(required as any)) throw new Error('Bu üretim işlemi için yetkiniz yok.')
    const project = projectsRef.current.find(candidate => candidate.id === projectId)
    if(project?.approvals?.production)throw Error('Üretim onaylandı. Üretim işlemleri salt okunurdur.')
    const currentItem = project?.productionItems.find(item => item.id === itemId)
    if (!project || !currentItem || currentItem.status === status) return
    const movingBackward = PRODUCTION_STATUS_RANK[status] < PRODUCTION_STATUS_RANK[currentItem.status]
    const productionItems = project.productionItems.map(item => item.id === itemId ? withMilestone(item, status) : item)
    const derivedStatus = deriveProjectStatusFromProduction(productionItems)
    const currentRank = PROJECT_PROGRESS_RANK[project.status] ?? 0
    const derivedRank = derivedStatus ? (PROJECT_PROGRESS_RANK[derivedStatus] ?? 0) : 0
    const nextProjectStatus = derivedStatus && derivedRank > currentRank ? derivedStatus : project.status

    addNotification({ type:'PRODUCTION_STATUS_CHANGED', projectCode:project.projKodu, message:`${project.projKodu} / ${currentItem.kod} ${PRODUCTION_ITEM_STATUS[currentItem.status].label} → ${PRODUCTION_ITEM_STATUS[status].label}`, audience:'internal' })
    if (movingBackward) addNotification({ type:'PROJECT_STATUS_REGRESSED', projectCode:project.projKodu, message:`${project.projKodu} içinde ${currentItem.kod} geriye alındı. Proje durumu otomatik geriletilmedi.`, audience:'internal' })
    if (nextProjectStatus !== project.status) addNotification({ type:'PROJECT_STATUS_CHANGED', projectCode:project.projKodu, message:`${project.projKodu} durumu ürün eşiklerine göre otomatik ${PROJECT_STATUS[nextProjectStatus].label} oldu`, audience:'internal' })

    const rows=projectsRef.current.map(candidate => candidate.id === projectId ? { ...candidate, productionItems, status:nextProjectStatus, sonIslemTarihi:formatMilestoneTimestamp(), recordVersion:Number(candidate.recordVersion||1)+1, updatedAt:new Date().toISOString(), updatedBy:currentUser.userId } : candidate)
    persistProjects(rows)
    updateProjects(()=>rows)
  }, [addNotification,perms,currentUser.userId,persistProjects,updateProjects])

  const softDeleteProjects = useCallback((ids: number[], deletedBy: string) => {
    if(!perms.can('project.archive')) throw new Error('Bu işlem yapılamadı. Projeyi Silinenler alanına taşıma yetkiniz bulunmuyor.')
    deletedBy=currentUser.userId
    const deletedAt = new Date(); const purgeAt = new Date(deletedAt.getTime() + 15 * 24 * 60 * 60 * 1000)
    const requestedProjects=projectsRef.current.filter(project=>ids.includes(project.id))
    if(requestedProjects.some(p=>p.approvals?.shipment))throw Error('Sevkiyat onaylandı. Proje salt okunurdur.')
    if(requestedProjects.some(project=>!canSeeProject(project))) throw new Error('Bu işlem yapılamadı. Seçilen projelerden en az biri için erişim yetkiniz bulunmuyor.')
    const targets=requestedProjects.filter(project=>!project.deletedAt)
    targets.forEach(project=>audit.record({timestamp:deletedAt.toISOString(),actorUserId:currentUser.userId,actorDisplaySnapshot:currentUser.fullName,eventType:'PROJECT_DELETED',entityType:'PROJECT',entityId:project.projectId||project.projKodu,entityDisplaySnapshot:project.projKodu,newValue:{deletedAt:deletedAt.toISOString()},details:'Proje Silinenler alanına taşındı.',metadata:{activityLabel:'Silinenlere taşındı',status:project.status,revision:project.revizyon}}))
    updateProjects(previous => previous.map(project => ids.includes(project.id) ? { ...project, deletedAt:deletedAt.toISOString(), deletedBy, purgeAt:purgeAt.toISOString(), recordVersion:Number(project.recordVersion||1)+1, updatedAt:deletedAt.toISOString(), updatedBy:currentUser.userId } : project))
  }, [projects,perms,currentUser.userId,currentUser.fullName,audit])
  const restoreProject = useCallback((id: number) => {
    if(!perms.can('project.archive')) throw new Error('Bu işlem yapılamadı. Projeyi geri yükleme yetkiniz bulunmuyor.')
    const project=projectsRef.current.find(item=>item.id===id);if(!project||!canSeeProject(project))throw new Error('Bu projeye erişim yetkiniz yok.'); const now=new Date().toISOString()
    if(project.approvals?.shipment)throw Error('Sevkiyat onaylandı. Proje salt okunurdur.');
    if(project)audit.record({timestamp:now,actorUserId:currentUser.userId,actorDisplaySnapshot:currentUser.fullName,eventType:'PROJECT_RESTORED',entityType:'PROJECT',entityId:project.projectId||project.projKodu,entityDisplaySnapshot:project.projKodu,details:'Proje Silinenler alanından geri yüklendi.',metadata:{activityLabel:'Proje geri yüklendi',status:project.status,revision:project.revizyon}})
    updateProjects(previous => previous.map(project => project.id === id ? { ...project, deletedAt:undefined, deletedBy:undefined, purgeAt:undefined, recordVersion:Number(project.recordVersion||1)+1, updatedAt:now, updatedBy:currentUser.userId } : project))
  }, [projects,perms,currentUser.userId,currentUser.fullName,audit])
  const purgeProject = useCallback((id: number) => { if(!perms.can('project.archive')) throw new Error('Bu işlem yapılamadı. Projeyi Silinenler görünümünden kaldırma yetkiniz bulunmuyor.');const target=projectsRef.current.find(p=>p.id===id);if(!target||!canSeeProject(target))throw new Error('Bu projeye erişim yetkiniz yok.'); if(target.approvals?.shipment)throw Error('Sevkiyat onaylandı. Proje salt okunurdur.');const now=new Date().toISOString(); updateProjects(previous => previous.map(project => project.id===id?{...project,purgedAt:now,recordVersion:Number(project.recordVersion||1)+1,updatedAt:now,updatedBy:currentUser.userId}:project)) }, [perms,currentUser.userId])
  const assertProjectVersion = useCallback((projKodu:string, expectedVersion:number) => {
    const current=projectsRef.current.find(item=>item.projKodu===projKodu)
    if(current&&!canSeeProject(current))throw new Error('Bu projeye erişim yetkiniz yok.');
    if(current && Number(current.recordVersion||1)!==Number(expectedVersion)) throw new ProjectConflictError(projKodu,Number(expectedVersion),Number(current.recordVersion||1))
  },[projects])

  const upsertProject = useCallback((project: ProjectMaster, options?:{expectedVersion?:number;auditLabel?:string;auditNote?:string}) => {
    const existingProject=projectsRef.current.find(item=>item.projKodu===project.projKodu);if(existingProject&&!canSeeProject(existingProject))throw new Error('Bu projeye erişim yetkiniz yok.'); if(!perms.can(existingProject?'project.edit':'project.create')) throw new Error('Proje kayıt yetkiniz yok.'); if(existingProject&&options?.expectedVersion!==undefined&&Number(existingProject.recordVersion||1)!==Number(options.expectedVersion)) throw new ProjectConflictError(project.projKodu,Number(options.expectedVersion),Number(existingProject.recordVersion||1)); const createsRevision=Boolean(existingProject&&((project.revizyon&&project.revizyon!==existingProject.revizyon)||(project.revisionId&&project.revisionId!==existingProject.revisionId))); if(createsRevision&&!perms.can('project.revision.create')) throw new Error('Yeni revizyon oluşturma yetkiniz bulunmuyor.'); const activeRevisionLocked=Boolean(existingProject?.revisionId&&existingProject.productionPackages?.[existingProject.revisionId]); if(activeRevisionLocked&&!createsRevision&&project.workflowVersion===undefined) throw new Error('Aktif revizyonun üretim paketi kaydedildi. Bu revizyon salt okunurdur; değişiklik için yeni revizyon oluşturun.')
    assertLockedProductionHistory(existingProject,project)
    assertApprovedMasterChange(existingProject,project)
    project={...project,createdByUserId:project.createdByUserId||currentUser.userId,ownerUserId:project.ownerUserId||currentUser.userId,projectRepresentativeUserId:project.projectRepresentativeUserId||currentUser.userId,recordVersion:existingProject?Number(existingProject.recordVersion||1)+1:Math.max(1,Number(project.recordVersion||1)),updatedAt:new Date().toISOString(),updatedBy:currentUser.userId}
    audit.record({actorUserId:currentUser.userId,actorDisplaySnapshot:currentUser.fullName,eventType:existingProject?'PROJECT_SAVED':'PROJECT_CREATED',entityType:'PROJECT',entityId:project.projectId||project.projKodu,entityDisplaySnapshot:project.projKodu,newValue:{revision:project.revizyon,status:project.status},details:options?.auditNote||options?.auditLabel,metadata:options?.auditLabel?{activityLabel:options.auditLabel,revision:project.revizyon,status:project.status,note:options.auditNote||''}:undefined})
    if(existingProject && existingProject.revizyon!==project.revizyon) audit.record({actorUserId:currentUser.userId,actorDisplaySnapshot:currentUser.fullName,eventType:'REVISION_CREATED',entityType:'PROJECT',entityId:project.projectId||project.projKodu,entityDisplaySnapshot:project.projKodu,oldValue:{revision:existingProject.revizyon},newValue:{revision:project.revizyon}})
    updateProjects(previous => {
      const existing = previous.find(item => item.projKodu === project.projKodu)
      const normalized=normalizeProject(project,currentUser.userId,currentUser.fullName)
      if (existing) return previous.map(item => item.projKodu === project.projKodu ? normalizeProject({ ...existing, ...normalized, id:existing.id, siraNo:existing.siraNo },currentUser.userId,currentUser.fullName) : item)
      return [normalized, ...previous]
    })
  }, [projects,perms,currentUser.userId,currentUser.fullName,audit])

  const patchProject = useCallback((projKodu: string, patch: Partial<ProjectMaster>, options?:{expectedVersion?:number;auditLabel?:string;auditNote?:string;persistNow?:boolean}) => {
    if(!perms.can('project.edit')) throw new Error('Proje düzenleme yetkiniz yok.')
    const now=new Date().toISOString()
    const existing=projectsRef.current.find(project=>project.projKodu===projKodu)
    if(!existing||!canSeeProject(existing))throw new Error('Bu projeye erişim yetkiniz yok.');
    if(existing&&options?.expectedVersion!==undefined&&Number(existing.recordVersion||1)!==Number(options.expectedVersion)) throw new ProjectConflictError(projKodu,Number(options.expectedVersion),Number(existing.recordVersion||1))
    const createsRevision=Boolean(existing && ((patch.revizyon && patch.revizyon!==existing.revizyon) || (patch.revisionId && patch.revisionId!==existing.revisionId)))
    const activeRevisionLocked=projectRevisionPackaged(existing,existing?.revisionId)
    if(activeRevisionLocked&&!createsRevision) throw new Error('Aktif revizyonun üretim paketi kaydedildi. Bu revizyon salt okunurdur; değişiklik için yeni revizyon oluşturun.')
    if(createsRevision&&!perms.can('project.revision.create')) throw new Error('Yeni revizyon oluşturma yetkiniz bulunmuyor.')
    if(existing){assertLockedProductionHistory(existing,{...existing,...patch});assertApprovedMasterChange(existing,{...existing,...patch})}
    const rows=projectsRef.current.map(project=>project.projKodu===projKodu?normalizeProject({...project,...patch,projectId:project.projectId,revisionId:patch.revisionId??project.revisionId,id:project.id,projKodu:project.projKodu,recordVersion:Number(project.recordVersion||1)+1,updatedAt:now,updatedBy:currentUser.userId},currentUser.userId,currentUser.fullName):project)
    if(options?.persistNow)persistProjects(rows)
    audit.record({actorUserId:currentUser.userId,actorDisplaySnapshot:currentUser.fullName,eventType:'PROJECT_SAVED',entityType:'PROJECT',entityId:existing?.projectId||projKodu,entityDisplaySnapshot:projKodu,newValue:{fields:Object.keys(patch)},details:options?.auditNote||options?.auditLabel,metadata:options?.auditLabel?{activityLabel:options.auditLabel,revision:String(patch.revizyon||existing?.revizyon||''),status:String(patch.status||existing?.status||''),note:options.auditNote||''}:undefined})
    if(existing && patch.revizyon && patch.revizyon!==existing.revizyon) audit.record({actorUserId:currentUser.userId,actorDisplaySnapshot:currentUser.fullName,eventType:'REVISION_CREATED',entityType:'PROJECT',entityId:existing.projectId||projKodu,entityDisplaySnapshot:projKodu,oldValue:{revision:existing.revizyon},newValue:{revision:patch.revizyon}})
    updateProjects(()=>rows)
  }, [projects,perms,currentUser.userId,currentUser.fullName,audit,persistProjects,updateProjects])

  const syncWorkflowProject=useCallback((record:DrawingProjectRecord,seed?:ProjectMaster)=>{
    const existing=projectsRef.current.find(p=>p.projKodu===record.projectCode)
    if(existing?.workflowVersion!==undefined&&record.workflow&&existing.workflowVersion>=record.workflow.version)return existing
    if(existing?.projectDetailsDeferred)throw Error('Proje ayrıntıları yüklenmeden kayıt tamamlanamaz.')
    const q=record.workflow?.quote
    let base=existing||seed||(q?projectFromQuickQuote(q):undefined)
    if(!base)throw new Error('Proje ana kaydı bulunamadı.')
    if(!existing&&!seed)base={...base,revisions:[],revisionId:undefined}
    if(!perms.canAccessRecord('PROJECTS',{ownerUserId:base.ownerUserId||base.createdByUserId,assignedUserIds:base.assignedUserIds,createdByUserId:base.createdByUserId,representativeUserId:base.projectRepresentativeUserId}))throw new Error('Proje erişim yetkiniz yok.')
    const next=projectFromWorkflow(record,base)
    assertLockedProductionHistory(existing,next)
    const rows=existing?projectsRef.current.map(p=>p.projKodu===next.projKodu?next:p):[next,...projectsRef.current]
    persistProjects(rows);updateProjects(()=>rows);return next
  },[perms,persistProjects,updateProjects])

  const linkQuickQuote=useCallback((quote:QuickQuote,representative='')=>{
    if(!perms.can('commercial.quote.view')||!perms.canAccessRecord('PROJECTS',{ownerUserId:quote.ownerUserId}))throw new Error('Teklif proje kaydına erişim yetkiniz yok.')
    const existing=projectsRef.current.find(p=>p.projKodu===quote.projectCode)
    if(quote.workflowManaged||existing?.workflowVersion!==undefined){if(existing)return existing;throw new Error('Teklif çalışma kaydı eşitlenmelidir.')}
    if(existing?.hasTechnicalDrawing||existing?.sourceQuickQuoteVersion===quote.version)return existing
    if(existing&&!existing.sourceQuickQuoteId&&(existing.hasTechnicalDrawing||existing.revisions?.some(r=>((r.workspaceState as any)?.positions||[]).length)))throw new Error('Teknik çizim içeren proje, çizimsiz teklifle değiştirilemez.')
    const next=projectFromQuickQuote(quote,existing,representative)
    const rows=existing?projectsRef.current.map(p=>p.projectId===existing.projectId?next:p):[next,...projectsRef.current]
    // Publish only after the master write succeeds; quote DB remains retryable on failure.
    persistProjects(rows)
    updateProjects(()=>rows)
    return next
  },[perms,persistProjects,updateProjects])

  const value = useMemo<ProjectStoreValue>(() => ({ hydrateProject,projects:projects.filter(canSeeProject),linkQuickQuote,syncWorkflowProject,getProjectByCode,getProjectById,updateProjectStatus,archiveProjectRecords,restoreArchivedProjects,updateProductionItemStatus,softDeleteProjects,restoreProject,purgeProject,upsertProject,patchProject,assertProjectVersion }), [projects,hydrateProject,linkQuickQuote,syncWorkflowProject,getProjectByCode,getProjectById,updateProjectStatus,archiveProjectRecords,restoreArchivedProjects,updateProductionItemStatus,softDeleteProjects,restoreProject,purgeProject,upsertProject,patchProject,assertProjectVersion])
  return <ProjectStoreContext.Provider value={value}>{children}</ProjectStoreContext.Provider>
}

export function useProjectStore(): ProjectStoreValue {
  const value = useContext(ProjectStoreContext)
  if (!value) throw new Error('useProjectStore must be used inside ProjectStoreProvider')
  return value
}
