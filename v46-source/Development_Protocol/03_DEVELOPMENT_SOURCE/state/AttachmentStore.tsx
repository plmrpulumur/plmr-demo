import {projectRevisionPackaged} from '../domain/project'
import {assertTenantReadable,tenantStorage} from '../services/platformAccess'
import {awaitProjectMasterSave,cloudProjectFilesDeferred,cloudProjectFileStorage,cloudReadProjectFiles,flushCloud,projectMasterSavePending} from '../services/cloudPlatform'
import {changeProjectFile,copyProjectFile,listProjectFiles,listSearchableProjectFiles,projectFileUrl,uploadProjectFile} from '../services/projectFileStorage'
import {useProjectStore} from './ProjectStore'
import {createContext,useCallback,useContext,useMemo,useRef,useState,type ReactNode} from 'react'
import type {ProjectAttachment} from '../domain/attachment'
import {uuidv7} from '../domain/customer'
import {useUserDirectory} from './UserDirectoryStore'
import {usePermissionResolver} from './PermissionContext'
import {useLimitStore} from './LimitStore'

const KEY='plmr.project.attachments.v10'
const ALLOWED=new Set('pdf dwg dxf dae xls xlsx doc docx jpg jpeg png webp step stp stl zip rar txt csv'.split(' '))
function load(){
 try{const rows=JSON.parse(tenantStorage.getItem(KEY)||'[]');return Array.isArray(rows)?rows as ProjectAttachment[]:[]}
 catch{return []}
}
const extension=(name:string)=>(name.split('.').pop()||'').toLowerCase()
interface Value {
 loadFiles:(projectId?:string)=>Promise<void>
 fileProjectState:(projectId:string)=>'ready'|'waiting'|'unavailable'
 attachments:ProjectAttachment[]
 forProject:(projectId:string)=>ProjectAttachment[]
 deletedForProject:(projectId:string)=>ProjectAttachment[]
 getUrl:(attachment:ProjectAttachment,download?:boolean)=>Promise<string>
 addFiles:(projectId:string,files:File[],revisionId?:string|null,progress?:(value:number)=>void)=>Promise<{added:number;errors:string[]}>
 remove:(id:string)=>Promise<void>
 restore:(id:string)=>Promise<void>
 rename:(id:string,name:string)=>Promise<void>
 moveProjectScope:(fromProjectId:string,toProjectId:string,revisionId?:string|null)=>void
 cloneProjectScope:(fromProjectId:string,toProjectId:string,revisionId?:string|null)=>Promise<number>
}
const Ctx=createContext<Value|null>(null)
export function AttachmentStoreProvider({children}:{children:ReactNode}){
 const {projects}=useProjectStore()
 const directory=useUserDirectory(),perms=usePermissionResolver(),limits=useLimitStore()
 const [attachments,setAttachments]=useState(load), attachmentsRef=useRef(attachments)
 const projectsRef=useRef(projects);projectsRef.current=projects
 const loading=useRef(new Map<string,Promise<void>>())
 const loadedAt=useRef(new Map<string,number>())
 const copyIds=useRef(new Map<string,string>())
 const findProject=useCallback((id:string)=>projectsRef.current.find(p=>[p.projectId,p.projKodu,p.sourceQuickQuoteId].includes(id)),[])
 const canViewFiles=perms.can('project.files.view')
 const fileProjectState=useCallback((id:string)=>{
  if(!canViewFiles)return 'unavailable'
  if(!cloudProjectFileStorage())return 'ready'
  const project=findProject(id)
  return !project?.projectId?'unavailable':projectMasterSavePending(project.id)?'waiting':'ready'
 },[canViewFiles,findProject])
 const set=useCallback((next:ProjectAttachment[])=>{attachmentsRef.current=next;setAttachments(next)},[])
 const update=useCallback((fn:(rows:ProjectAttachment[])=>ProjectAttachment[])=>{
  const next=fn(attachmentsRef.current)
  if(next===attachmentsRef.current)return
  if(!cloudProjectFileStorage())tenantStorage.setItem(KEY,JSON.stringify(next))
  set(next)
 },[set])
 const upsert=useCallback((row:ProjectAttachment)=>update(rows=>[row,...rows.filter(a=>a.attachmentId!==row.attachmentId)]),[update])
 const assertWritable=useCallback((projectId:string,revisionId?:string|null)=>{
  const p=findProject(projectId)
  if(!p&&(cloudProjectFileStorage()||!projectId.startsWith('new-project-')))
   throw Error(cloudProjectFileStorage()?'Dosya eklemek için önce projeyi buluta kaydedin.':'Bu proje dosyalarına erişim yetkiniz yok.')
  if(p&&(p.deletedAt||p.approvals?.package||projectRevisionPackaged(p,p.revisionId)||projectRevisionPackaged(p,revisionId)))
   throw Error('Bu revizyonun dosyaları salt okunurdur.')
  return p?.projectId||projectId
 },[findProject])
 const loadFiles=useCallback(async(projectId?:string)=>{
  if(!canViewFiles)return
  if(!cloudProjectFileStorage()){
   if(!cloudProjectFilesDeferred())return
   const key='legacy'
   if(!loading.current.has(key)){
    loading.current.set(key,cloudReadProjectFiles(assertTenantReadable()).then(raw=>{
     const rows=raw===null?[]:JSON.parse(raw)
     if(!Array.isArray(rows))throw Error('Proje dosyalarının kaydı okunamadı.')
     set(rows)
    }).finally(()=>loading.current.delete(key)))
   }
   return loading.current.get(key)
  }
  const cid=assertTenantReadable()
  const target=projectId?findProject(projectId):undefined
  const ids=projectId?[target?.projectId]:projectsRef.current.filter(p=>!p.deletedAt).map(p=>p.projectId)
  async function loadOne(id:string){
   const key=cid+':'+id
   if(Date.now()-(loadedAt.current.get(key)??0)<15_000)return
   if(!loading.current.has(key)){
    const rowsAtStart=attachmentsRef.current
    loading.current.set(key,(async()=>{
     if(target)await awaitProjectMasterSave(target.id)
     if(assertTenantReadable()!==cid)throw Error('Firma veya oturum değişti.')
     return listProjectFiles(cid,id)
    })().then(rows=>{
     if(assertTenantReadable()!==cid)throw Error('Firma veya oturum değişti.')
     const touched=attachmentsRef.current.filter(a=>a.projectId===id&&!rowsAtStart.includes(a))
     const newIds=new Set(touched.map(a=>a.attachmentId))
     set([...attachmentsRef.current.filter(a=>a.projectId!==id),...touched,...rows.filter(a=>!newIds.has(a.attachmentId))])
     loadedAt.current.set(key,Date.now())
    }).finally(()=>loading.current.delete(key)))
   }
   return loading.current.get(key)
  }
  const active=[...new Set(ids.filter((id):id is string=>Boolean(id)))]
  if(projectId){if(active[0])await loadOne(active[0]);return}
  for(let start=0;start<active.length;start+=128){
   const ids=active.slice(start,start+128),scope=new Set(ids),previous=new Set(attachmentsRef.current)
   const rows=await listSearchableProjectFiles(cid,ids)
   if(assertTenantReadable()!==cid)throw Error('Firma veya oturum değişti.')
   const keep=attachmentsRef.current.filter(a=>!scope.has(a.projectId)||a.status==='deleted'||!previous.has(a))
   const keptIds=new Set(keep.map(a=>a.attachmentId))
   set([...keep,...rows.filter(a=>!keptIds.has(a.attachmentId))])
  }
 },[findProject,canViewFiles,set])
 const scoped=(projectId:string,status:ProjectAttachment['status'])=>{
  const p=findProject(projectId)
  if(!perms.can('project.files.view')||!p)return []
  return attachments.filter(a=>[p.projectId,p.projKodu].includes(a.projectId)&&a.status===status)
    .sort((a,b)=>b.uploadedAt.localeCompare(a.uploadedAt))
 }
 const addFiles=useCallback<Value['addFiles']>(async(projectId,files,revisionId,progress)=>{
  if(!perms.can('project.files.upload'))throw Error('Proje dosyası yükleme yetkiniz yok.')
  const id=assertWritable(projectId,revisionId)
  const storage=cloudProjectFileStorage()
  if(storage)await awaitProjectMasterSave(findProject(id)!.id)
  else await loadFiles(projectId)
  limits.validateUploadBatch(files)
  const errors:string[]=[]
  let added=0
  for(let i=0;i<files.length;i++){
   const file=files[i], ext=extension(file.name)
   try{
    if(!ALLOWED.has(ext))throw Error('desteklenmeyen format')
    limits.validateProjectFile(file)
    if(storage){
     const row=await uploadProjectFile(assertTenantReadable(),id,revisionId,file,p=>progress?.((i+p/100)*100/files.length))
     upsert(row)
    } else {
     const dataUrl=await new Promise<string>((resolve,reject)=>{
      const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(reader.error)
      reader.readAsDataURL(file)
     })
     const attachmentId=uuidv7()
     assertWritable(projectId,revisionId)
     upsert({attachmentId,projectId,revisionId,originalFileName:file.name,displayName:file.name,
      mimeType:file.type||'application/octet-stream',extension:ext,sizeBytes:file.size,category:'project-level',
      description:'',storagePath:'projects/'+projectId+'/'+attachmentId,uploadedBy:directory.currentUserId,
      uploadedAt:new Date().toISOString(),status:'active',dataUrl})
    }
    added++
   }catch(error){errors.push(file.name+': '+(error as Error).message)}
  }
  return {added,errors}
 },[assertWritable,directory.currentUserId,limits,loadFiles,perms,upsert])
 const modify=async(id:string,action:'rename'|'delete'|'restore',name?:string)=>{
  if(!perms.can('project.files.manage'))throw Error('Proje dosyalarını yönetme yetkiniz yok.')
  const row=attachmentsRef.current.find(a=>a.attachmentId===id)
  if(!row)return
  assertWritable(row.projectId,row.revisionId)
  if(cloudProjectFileStorage()){
   if(row.legacy)throw Error('Eski dosya biçimi salt okunurdur.')
   upsert(await changeProjectFile(assertTenantReadable(),row,action,name))
  } else upsert({...row,status:action==='delete'?'deleted':'active',displayName:name?.trim()||row.displayName})
 }
 const moveProjectScope=useCallback<Value['moveProjectScope']>((from,to,revisionId)=>{
  if(cloudProjectFileStorage())return
  update(rows=>rows.some(a=>a.projectId===from)?rows.map(a=>a.projectId===from?{
   ...a,projectId:to,revisionId:revisionId===undefined?a.revisionId:revisionId,
   storagePath:a.storagePath.replace('projects/'+from+'/','projects/'+to+'/')
  }:a):rows)
 },[update])
 const getUrl=useCallback<Value['getUrl']>((file,download)=>file.dataUrl?Promise.resolve(file.dataUrl):projectFileUrl(assertTenantReadable(),file,download),[])
 const cloneProjectScope=async(from:string,to:string,revisionId?:string|null)=>{
  if(!perms.can('project.files.view')||!perms.can('project.create')||!findProject(from))return 0
  if(cloudProjectFileStorage())await flushCloud()
  await loadFiles(from)
  const source=findProject(from)
  const rows=attachmentsRef.current.filter(a=>a.status==='active'&&[from,source?.projectId,source?.projKodu].includes(a.projectId))
  for(const row of rows){
   const key=to+':'+row.attachmentId,id=copyIds.current.get(key)??uuidv7()
   copyIds.current.set(key,id)
   if(cloudProjectFileStorage()){
    const cid=assertTenantReadable()
    if(row.legacy){
     const response=await fetch(await getUrl(row))
     if(!response.ok)throw Error('Kopyalanacak dosya okunamadı.')
     upsert(await uploadProjectFile(cid,to,revisionId,new File([await response.blob()],row.originalFileName),undefined,id))
    }else upsert(await copyProjectFile(cid,row,to,id,revisionId))
   }else upsert({...row,attachmentId:id,projectId:to,revisionId,storagePath:'projects/'+to+'/'+id,uploadedBy:directory.currentUserId,uploadedAt:new Date().toISOString()})
  }
  return rows.length
 }
 const accessibleAttachments=useMemo(()=>perms.can('project.files.view')?attachments.filter(a=>a.status==='active'&&findProject(a.projectId)):[],
  [attachments,findProject,perms,projects])
 return <Ctx.Provider value={{loadFiles,fileProjectState,attachments:accessibleAttachments,forProject:id=>scoped(id,'active'),
  deletedForProject:id=>scoped(id,'deleted'),getUrl,addFiles,remove:id=>modify(id,'delete'),
  restore:id=>modify(id,'restore'),rename:(id,name)=>modify(id,'rename',name),moveProjectScope,cloneProjectScope}}>{children}</Ctx.Provider>
}
export function useAttachmentStore(){
 const value=useContext(Ctx)
 if(!value)throw Error('useAttachmentStore must be inside AttachmentStoreProvider')
 return value
}
