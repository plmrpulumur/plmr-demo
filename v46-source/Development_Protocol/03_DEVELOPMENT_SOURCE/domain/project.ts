import type { ProjectPricingSnapshot } from './commerce'
import {sameDocument} from './documentIdentity'
export { STATUS_QUOTATION, STATUS_PROCESSING, STATUS_PRODUCTION, STATUS_TRANSIT, STATUS_DELIVERY, STATUS_DELIVERED } from './projectStatus'
export type ProjectStatus = import('./projectStatus').ProjectStatus
export type ProductionItemStatus = 20 | 30 | 40 | 50 | 60

export type TechnicalReadiness = 'complete' | 'drawing_attached' | 'pending'
export type ProjectTechnicalReadiness = 'complete' | 'drawing_attached' | 'pending_production'

export interface ProductionMilestones {
  transfer?: string
  delivery?: string
  delivered?: string
  onaylandi?: string
  uretimde?: string
  sevkeHazir?: string
  sevkEdildi?: string
}

export interface ProductionItem {
  id: string
  /** Stable link back to the canonical drawing position when the item was created from a committed workspace. */
  sourcePositionId?: string
  kod: string
  urun: string
  miktar: number
  status: ProductionItemStatus
  teknikTamamlandi: TechnicalReadiness
  /** Human-readable reason used by Production UI tooltips. */
  technicalDetail?: string
  milestones: ProductionMilestones
}

export interface ProjectQuoteSnapshot {
  id: string
  kind: 'quick' | 'project'
  date: string
  amount: number
  currency: 'EUR' | 'USD' | 'TRY' | 'GBP'
  approved: boolean
  sourceQuoteId?: string
  calculatedTechnicalPrice?: number
  commercialPrice?: number
}


export interface ProjectRevisionSnapshot {
  revisionId: string
  label: string
  createdAt: string
  createdBy: string
  technicalSignature: string
  workspaceState?: Record<string, unknown>
  pricing?: ProjectPricingSnapshot
  customerSnapshot?: Record<string, unknown>
  masterSnapshot?: Record<string, unknown>
  previousCurrentRevisionId?: string | null
  derivedFromRevisionId?: string | null
  revisions?: ProjectRevisionSnapshot[]
}

export interface SavedGiyotinProduction { sourceRevisionId:string; sourceSignature:string; packageVersion:number; savedAt:string; savedBy:string; overrides:Record<string,Record<string,Record<string,string|number|null>>>; package:unknown; cutPlans?:import('./cutOptimization').SavedCutPlans }

export interface ProjectMaster {
  projectDetailsDeferred?: true
  /** Product totals in the cloud summary. Production positions are loaded on demand. */
  productionPositionCounts?: Record<string,number>
  packageRevisionIds?: string[]
  approvals?:import('./projectApprovals').ProjectApprovalMarkers
  workflowVersion?:number
  workflowOrigin?:'QUOTE'|'DRAWING'
  quoteRevision?:string
  drawingRevision?:string
  drawingLocked?:boolean
  sourceQuickQuoteId?: string
  sourceQuickQuoteVersion?: number
  hasTechnicalDrawing?: boolean
  statusSchemaVersion?: 54
  legacyStatus?: string

  productionPackages?: Record<string,SavedGiyotinProduction>
  id: number
  projectId?: string
  createdByUserId?: string
  ownerUserId?: string
  assignedUserIds?: string[]
  projectRepresentativeUserId?: string
  revisionId?: string
  siraNo: string
  projKodu: string
  musteriAdi: string
  customerId?: string
  projeAdi: string
  urunler: string[]
  revizyon: string
  musteriTemsilcisi: string
  cizen: string
  teklifVeren: string
  uretimiAcan: string | null
  olusturmaTarihi: string
  sonIslemTarihi: string
  status: ProjectStatus
  archivedFromStatus?: Exclude<ProjectStatus,'arsivlendi'>
  productionItems: ProductionItem[]
  productionReadyState?: ProjectTechnicalReadiness
  quotes: ProjectQuoteSnapshot[]
  pricing?: ProjectPricingSnapshot
  revisions?: ProjectRevisionSnapshot[]
  recordVersion?: number
  updatedAt?: string
  updatedBy?: string
  orderApprovedAt?: string
  deletedAt?: string
  deletedBy?: string
  purgeAt?: string
  purgedAt?: string
}

export function projectRevisionPackaged(project:ProjectMaster|undefined,revisionId?:string|null):boolean{
  return Boolean(revisionId&&(project?.productionPackages?.[revisionId]||project?.packageRevisionIds?.includes(revisionId)))
}


function activeRevision(project: ProjectMaster): ProjectRevisionSnapshot | undefined {
  const rows=project.revisions||[]
  return rows.find(row=>row.revisionId===project.revisionId) || rows.find(row=>row.label===project.revizyon)
}

function projectStatusAsProduction(status: ProjectStatus): ProductionItemStatus {
  return status===30||status===40||status===50||status===60 ? status : 20
}

/**
 * Projects own production tracking. The active committed drawing revision is the
 * canonical source for position count / codes / quantities. This repairs legacy
 * "one product = one production item" records without creating a second state.
 */
export function syncProductionItemsFromActiveRevision(project: ProjectMaster, fallbackStatus?: ProductionItemStatus): ProductionItem[] {
  const revision=activeRevision(project)
  const workspace=(revision?.workspaceState||{}) as Record<string, any>
  const workspaceRows=workspace.productWorkspaces&&typeof workspace.productWorkspaces==='object'
    ? Object.values(workspace.productWorkspaces as Record<string,any>).map((row:any)=>({product:String(row.product||'Ürün'),positions:Array.isArray(row.positions)?row.positions as Array<Record<string,any>>:[]}))
    : [{product:String(workspace.product||project.urunler?.[0]||'Ürün'),positions:Array.isArray(workspace.positions)?workspace.positions as Array<Record<string,any>>:[]}]
  const canonical=workspaceRows.flatMap(row=>row.positions.map((position,index)=>({product:row.product,position,index})))
  if(!canonical.length)return project.productionItems

  const saved=revision?.revisionId ? project.productionPackages?.[revision.revisionId] : undefined
  const savedPackage=(saved?.package||{}) as any
  const packagedIds=new Set<string>(Array.isArray(savedPackage.positions)?savedPackage.positions.map((row:any)=>String(row.positionId||'')):[])
  const packageErrors=new Map<string,string>()
  if(Array.isArray(savedPackage.validation?.errors))for(const error of savedPackage.validation.errors){
    if(error?.positionId)packageErrors.set(String(error.positionId),String(error.message||error.code||'Üretim paketi bu poz için tamamlanamadı.'))
  }

  const existingBySource=new Map(project.productionItems.filter(item=>item.sourcePositionId).map(item=>[String(item.sourcePositionId),item]))
  const existingByCode=new Map(project.productionItems.map(item=>[`${item.urun}::${item.kod}`,item]))
  const legacySingleProduct=workspaceRows.length===1
  const existingByCodeOnly=new Map(project.productionItems.map(item=>[item.kod,item]))
  const defaultStatus=fallbackStatus||projectStatusAsProduction(project.status)

  return canonical.map(({product,position,index})=>{
    const sourcePositionId=String(position.id||`legacy-${product}-${index+1}`)
    const code=String(position.positionNo||`P${String(index+1).padStart(2,'0')}`)
    const previous=existingBySource.get(sourcePositionId)||existingByCode.get(`${product}::${code}`)||(legacySingleProduct?existingByCodeOnly.get(code):undefined)
    const productionPackageCapable=product==='Giyotin'
    let teknikTamamlandi:TechnicalReadiness=productionPackageCapable?'pending':(previous?.teknikTamamlandi||'drawing_attached')
    let technicalDetail=productionPackageCapable
      ? 'Çizim ve poz verisi kayıtlı; aktif revizyonun üretim paketi henüz kaydedilmedi.'
      : (previous?.technicalDetail||'Kaydedilmiş çizim ve poz verisi mevcut. Bu ürün için otomatik üretim paketi reçetesi henüz tanımlı değil.')
    if(productionPackageCapable&&saved){
      const error=packageErrors.get(sourcePositionId)
      if(error){teknikTamamlandi='pending';technicalDetail=`Üretim paketi eksik: ${error}`}
      else if(packagedIds.has(sourcePositionId)){teknikTamamlandi='complete';technicalDetail=`${revision?.label||project.revizyon} üretim paketi kaydedildi.`}
      else {teknikTamamlandi='pending';technicalDetail='Üretim paketi kaydedildi ancak bu poz pakete dahil edilmedi.'}
    }
    return {
      id: previous?.id||`${project.id}-POS-${sourcePositionId}`,
      sourcePositionId,
      kod:code,
      urun:product,
      miktar:Math.max(0,Number(position.quantity)||0),
      status:previous?.status||defaultStatus,
      teknikTamamlandi,
      technicalDetail,
      milestones:{...(previous?.milestones||{})},
    }
  })
}

export const PRODUCTION_STATUS_RANK: Record<ProductionItemStatus, number> = {20:1,30:2,40:3,50:4,60:5}

/**
 * Parent project progression rule used by the UI.
 * - All shipped => Sevk Edildi
 * - Every item has reached at least Sevke Hazır => Sevke Hazır
 * - Any item has entered production or later => Üretimde
 * - Otherwise => Onaylandı
 *
 * This intentionally prevents mixed child states from falsely advancing the
 * parent project to Sevke Hazır / Sevk Edildi.
 */
export function deriveProjectStatusFromProduction(items: ProductionItem[]): ProjectStatus | null {
  if (items.length === 0) return null

  const ranks = items.map(item => PRODUCTION_STATUS_RANK[item.status])
  if (ranks.every(rank => rank >= PRODUCTION_STATUS_RANK[60])) return 60
  if (ranks.every(rank => rank >= PRODUCTION_STATUS_RANK[50])) return 50
  if (ranks.every(rank => rank >= PRODUCTION_STATUS_RANK[40])) return 40
  if (ranks.some(rank => rank >= PRODUCTION_STATUS_RANK[30])) return 30
  return 20
}

export class ProjectConflictError extends Error {
  code='PROJECT_CONFLICT' as const
  constructor(public projectCode:string,public loadedVersion:number,public currentVersion:number){super(`Project ${projectCode} conflict: loaded v${loadedVersion}, current v${currentVersion}`)}
}

/** A new revision may be added, but saved production release history is immutable. */
export function assertLockedProductionHistory(existing: ProjectMaster | undefined, next: ProjectMaster): void {
  if (!existing) return
  for (const [revisionId, savedPackage] of Object.entries(existing.productionPackages || {})) {
    const oldRevision = existing.revisions?.find(revision => revision.revisionId === revisionId)
    const nextRevision = next.revisions?.find(revision => revision.revisionId === revisionId)
    if (!sameDocument(savedPackage,next.productionPackages?.[revisionId]) ||
        (oldRevision && !sameDocument(oldRevision,nextRevision))) {
      throw new Error('Kaydedilmiş üretim paketi ve kaynak revizyonu değiştirilemez.')
    }
  }
}
