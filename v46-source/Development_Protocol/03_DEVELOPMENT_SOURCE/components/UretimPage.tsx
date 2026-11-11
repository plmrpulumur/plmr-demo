import {formatDateTime} from '../utils/formatters'
import {Ui,t} from '../i18n/react'
import {normalizeProjectStatus,normalizeProductionStatus} from '../domain/projectStatus'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ProjectMaster, ProjectStatus, ProductionItem, ProductionItemStatus, TechnicalReadiness } from '../domain/project'
import { PROJECT_STATUS, PRODUCTION_ITEM_STATUS } from '../config/projectStatuses'
import { useProjectStore } from '../state/ProjectStore'
import { useSelectionController } from '../hooks/useSelectionController'
import { useTablePreferences, type TablePreferences } from '../hooks/useTablePreferences'
import TableViewPanel from './TableViewPanel'
import { compareTextTr, parsePlmrDateTime, sortWithDirection } from '../utils/tableData'
import { exportRowsToXlsx } from '../utils/xlsxExport'
import { useAdvancedTable } from '../hooks/useAdvancedTable'
import DataGridFilterCell from './DataGridFilterCell'
import { useUserDirectory } from '../state/UserDirectoryStore'
import { usePermissionResolver } from '../state/PermissionContext'
import { awaitProjectMasterSave,cloudCall,cloudEnabled } from '../services/cloudPlatform'
import { assertTenantReadable } from '../services/platformAccess'

const PAGE_SIZE=5
type ProductionProject=Pick<ProjectMaster,'id'|'projectId'|'siraNo'|'projKodu'|'projeAdi'|'musteriAdi'|'cizen'|'uretimiAcan'|'orderApprovedAt'|'sonIslemTarihi'|'olusturmaTarihi'|'status'|'productionItems'|'approvals'> & {
  productionItemCount?:number
  productionLocked?:boolean
}
interface ProductionPage {
  rows:ProductionProject[]
  total:number
  available:number
  counts:Partial<Record<ProjectStatus,number>>
  products:string[]
  customers:string[]
}
async function readProduction(action:'production_page'|'production_items'|'production_export',data:Record<string,unknown>){
  const companyId=assertTenantReadable()
  const result=await cloudCall<ProductionPage>(action,{...data,companyId})
  if(assertTenantReadable()!==companyId)throw Error('Firma değişti.')
  return {...result,rows:result.rows.map(row=>({...row,status:normalizeProjectStatus(row.status),
    productionItems:row.productionItems.map(item=>({...item,status:normalizeProductionStatus(item.status)}))}))}
}

type P = { size?: number; style?: React.CSSProperties }
const I = (d: React.ReactNode) => ({ size = 14, style }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden><Ui value={d}/></svg>
)
const ILayers  = I(<><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></>)
const IChevD   = I(<polyline points="6 9 12 15 18 9"/>)
const IChevR   = I(<polyline points="9 18 15 12 9 6"/>)
const ISearch  = I(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>)
const IInfo    = I(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>)
const IFilter  = I(<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>)
const IEye     = I(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>)
const IMore    = I(<><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></>)
const IX       = I(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>)
const IDownload = I(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>)

const PRODUCTION_PROJECT_STATUSES: ProjectStatus[] = [20, 30, 40, 50, 60]
const TECHNICAL_FILTERS: Array<{ value: 'all' | TechnicalReadiness; label: string }> = [
  { value: 'all', label: 'Tüm teknik durumlar' },
  { value: 'complete', label: 'Tamamlandı' },
  { value: 'drawing_attached', label: 'Çizim Eklendi' },
  { value: 'pending', label: 'Eksik' },
]
const TECHNICAL_CONFIG: Record<TechnicalReadiness, { label: string; color: string; bg: string }> = {
  complete:         { label: 'Tamamlandı', color: '#16a34a', bg: '#f0fdf4' },
  drawing_attached: { label: 'Çizim Eklendi', color: '#0891b2', bg: '#ecfeff' },
  pending:          { label: 'Eksik', color: '#d97706', bg: '#fffbeb' },
}

type ProductionColumnId = 'sira' | 'project' | 'code' | 'customer' | 'qty' | 'technical' | 'name' | 'representative' | 'openedBy' | 'orderDate' | 'lastAction' | 'status' | 'approved' | 'inProduction' | 'transfer' | 'ready' | 'shipped'
const PRODUCTION_TABLE_DEFAULT: TablePreferences = {
  columns: [
    {id:'sira',label:'Sıra',visible:true,order:0,width:52},
    {id:'project',label:'Proje Kodu',visible:true,order:1,width:175},
    {id:'name',label:'Proje Adı',visible:true,order:2,width:170},
    {id:'customer',label:'Müşteri Adı',visible:true,order:3,width:170},
    {id:'representative',label:'Proje Temsilcisi',visible:true,order:4,width:145},
    {id:'openedBy',label:'Üretime Açan',visible:true,order:5,width:145},
    {id:'orderDate',label:'Sipariş Sürecine Alınma Tarihi',visible:true,order:6,width:195},
    {id:'lastAction',label:'Son İşlem Tarihi',visible:true,order:7,width:160},
    {id:'code',label:'Poz Kodu',visible:true,order:8,width:90},
    {id:'qty',label:'Adet',visible:true,order:9,width:64},
    {id:'status',label:'Durum',visible:true,order:10,width:140},
    {id:'inProduction',label:'Üretim Sürecinde',visible:true,order:11,width:150},
    {id:'transfer',label:'Transfer Sürecinde',visible:true,order:12,width:150},
    {id:'ready',label:'Sevkiyat Sürecinde',visible:true,order:13,width:150},
    {id:'shipped',label:'Teslim Edildi',visible:true,order:14,width:150},
  ],
  sort: { columnId: 'created', direction: 'desc' },
}
const PRODUCTION_HEADER_FILTERS=['project','name','code','customer','sira','representative','openedBy','orderDate','lastAction','qty','approved','inProduction','transfer','ready','shipped'];
const PRODUCTION_SORT_OPTIONS = [
  { id: 'created', label: 'Oluşturma Tarihi', kind: 'date' as const },
  { id: 'project', label: 'Proje Kodu', kind: 'text' as const },
  { id: 'customer', label: 'Müşteri', kind: 'text' as const },
  { id: 'status', label: 'Proje Durumu', kind: 'text' as const },
  { id: 'productCount', label: 'Poz Sayısı', kind: 'number' as const },
]

interface UretimPageProps { onOpenProject?: (projKodu: string, musteriAdi: string, projectId?: string) => void }

export default function UretimPage({ onOpenProject }: UretimPageProps) {
  const directory=useUserDirectory(); const perms=usePermissionResolver()
  const { projects } = useProjectStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | null>(null)
  const [technicalFilter, setTechnicalFilter] = useState<'all' | TechnicalReadiness>('all')
  const [productFilter, setProductFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [filterOpen, setFilterOpen] = useState(false)
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())
  const [page,setPage]=useState(1)
  const [remote,setRemote]=useState<ProductionPage>()
  const [facets,setFacets]=useState<Pick<ProductionPage,'products'|'customers'>>()
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const [expanded,setExpanded]=useState<string|null>(null)
  const [expandedItems,setExpandedItems]=useState<{code:string;items:ProductionItem[]}>()
  const [detailError,setDetailError]=useState('')
  const [requestVersion,reload]=useState(0)
  const [exporting,setExporting]=useState(false)
  const online=cloudEnabled()
  const tableRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const selection = useSelectionController<number>()
  const tableView = useTablePreferences(PRODUCTION_TABLE_DEFAULT, 'plmr.table.production.v35')
  const advanced = useAdvancedTable()

  const productionProjects = useMemo(() => online?[]:projects
    .filter(project => perms.canAccessRecord('OPERATIONS',{ownerUserId:project.ownerUserId||directory.findUserByName(project.cizen)?.userId,assignedUserIds:project.assignedUserIds,createdByUserId:project.createdByUserId,representativeUserId:project.projectRepresentativeUserId||directory.findUserByName(project.musteriTemsilcisi)?.userId}))
    .filter(project => !project.deletedAt || (project.status === 'arsivlendi' && project.productionItems.length > 0 && project.productionItems.every(item => item.status === 60)))
    .filter(project => project.status !== 'iptal')
    .filter(project => project.productionItems.length > 0)
    .filter(project => PRODUCTION_PROJECT_STATUSES.includes(project.status) || (project.status === 'arsivlendi' && project.productionItems.every(item => item.status === 60))), [online,projects,perms,directory.users])

  const productOptions = useMemo(() => (online?[...facets?.products??[]]:Array.from(new Set(productionProjects.flatMap(project => project.productionItems.map(item => item.urun))))).sort(compareTextTr), [online,facets,productionProjects])
  const customerOptions = useMemo(() => (online?[...facets?.customers??[]]:Array.from(new Set(productionProjects.map(project => project.musteriAdi)))).sort(compareTextTr), [online,facets,productionProjects])
  useEffect(()=>{
    if(!online||!filterOpen||facets)return
    let active=true
    void readProduction('production_page',{facets:true}).then(result=>{
      if(active)setFacets({products:result.products,customers:result.customers})
    }).catch(e=>{if(active)setError(e.message)})
    return()=>{active=false}
  },[online,filterOpen,facets])

  const filteredLocal = useMemo(() => {
    const base = productionProjects.filter(project => {
      const effectiveStatus = project.status
      const matchesStatus = statusFilter ? effectiveStatus === statusFilter : true
      const matchesTechnical = technicalFilter === 'all' ? true : project.productionItems.some(item => item.teknikTamamlandi === technicalFilter)
      const matchesProduct = productFilter === 'all' ? true : project.productionItems.some(item => item.urun === productFilter)
      const matchesCustomer = customerFilter === 'all' ? true : project.musteriAdi === customerFilter
      const query = search.trim().toLocaleLowerCase('tr-TR')
      const matchesSearch = !query || [project.projKodu, project.projeAdi, project.musteriAdi, ...project.productionItems.flatMap(item=>[item.urun,item.kod])].some(value=>String(value||'').toLocaleLowerCase('tr-TR').includes(query))
      const f=advanced.filters
      const contains=(value:unknown,key:string)=>!f[key]||String(value??'').toLocaleLowerCase('tr-TR').includes(f[key].trim().toLocaleLowerCase('tr-TR'))
      const dateContains=(value:string|undefined,key:string)=>contains((value?formatDateTime(value)+' '+value:'—'),key)
      const milestones={approved:'onaylandi',inProduction:'uretimde',transfer:'transfer',ready:'delivery',shipped:'delivered'} as const
      const columnOk=contains(project.siraNo,'sira')&&contains(project.projKodu,'project')&&contains(project.projeAdi,'name')&&
        contains(project.musteriAdi,'customer')&&contains(project.cizen||'—','representative')&&contains(project.uretimiAcan||'—','openedBy')&&
        dateContains(project.orderApprovedAt,'orderDate')&&dateContains(project.sonIslemTarihi,'lastAction')&&
        (contains(project.productionItems.length,'qty')||project.productionItems.some(item=>contains(item.miktar,'qty')))&&
        (!f.status||String(effectiveStatus)===f.status)&&(!f.code||project.productionItems.some(item=>contains(item.kod,'code')))&&
        Object.entries(milestones).every(([key,field])=>!f[key]||project.productionItems.some(item=>dateContains(item.milestones[field],key)))
      return matchesStatus && matchesTechnical && matchesProduct && matchesCustomer && matchesSearch && columnOk
    })
    const activeSort=advanced.quickSort.direction?advanced.quickSort:tableView.preferences.sort
    const { columnId, direction } = activeSort
    return sortWithDirection(base, (a, b) => {
      switch (columnId) {
        case 'sira': return compareTextTr(a.siraNo,b.siraNo)
        case 'created': return parsePlmrDateTime(a.olusturmaTarihi) - parsePlmrDateTime(b.olusturmaTarihi)
        case 'name': return compareTextTr(a.projeAdi,b.projeAdi)
        case 'representative': return compareTextTr(a.cizen,b.cizen)
        case 'openedBy': return compareTextTr(a.uretimiAcan||'',b.uretimiAcan||'')
        case 'orderDate': return parsePlmrDateTime(a.orderApprovedAt||'')-parsePlmrDateTime(b.orderApprovedAt||'')
        case 'lastAction': return parsePlmrDateTime(a.sonIslemTarihi)-parsePlmrDateTime(b.sonIslemTarihi)
        case 'project': return compareTextTr(a.projKodu, b.projKodu)
        case 'customer': return compareTextTr(a.musteriAdi, b.musteriAdi)
        case 'qty': return a.productionItems.length-b.productionItems.length
        case 'status': return PRODUCTION_PROJECT_STATUSES.indexOf(a.status) - PRODUCTION_PROJECT_STATUSES.indexOf(b.status)
        case 'productCount': return a.productionItems.length - b.productionItems.length
        default: return parsePlmrDateTime(a.olusturmaTarihi) - parsePlmrDateTime(b.olusturmaTarihi)
      }
    }, direction || 'desc')
  }, [productionProjects, statusFilter, technicalFilter, productFilter, customerFilter, search, tableView.preferences.sort, advanced.filters, advanced.quickSort])

  const sort=advanced.quickSort.direction?advanced.quickSort:tableView.preferences.sort
  const query=useMemo(()=>({
    search,status:statusFilter===null?'':String(statusFilter),customer:customerFilter==='all'?'':customerFilter,
    sort:sort.columnId,direction:sort.direction,columns:{...advanced.filters,
      ...(productFilter!=='all'?{product:productFilter}:{}),
      ...(technicalFilter!=='all'?{technical:technicalFilter}:{})}
  }),[search,statusFilter,customerFilter,sort.columnId,sort.direction,advanced.filters,productFilter,technicalFilter])
  const priorQuery=useRef(query)
  useEffect(()=>{
    if(priorQuery.current!==query){
      priorQuery.current=query
      setPage(1)
      if(page!==1)return
    }
    if(!online)return
    let active=true
    setLoading(true);setError('');setExpanded(null)
    const timer=window.setTimeout(()=>{
      void readProduction('production_page',{query,offset:(page-1)*PAGE_SIZE}).then(result=>{
        if(!active)return
        setRemote(result)
        const lastPage=Math.max(1,Math.ceil(result.total/PAGE_SIZE))
        if(page>lastPage)setPage(lastPage)
      }).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)})
    },120)
    return()=>{active=false;clearTimeout(timer)}
  },[online,query,page,requestVersion])
  const filtered=online?remote?.rows??[]:filteredLocal.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE)
  const total=online?remote?.total??0:filteredLocal.length
  const available=online?remote?.available??0:productionProjects.length
  const pageCount=Math.max(1,Math.ceil(total/PAGE_SIZE))
  const expandedId=online?filtered.find(project=>project.projKodu===expanded)?.id:undefined
  useEffect(()=>{
    if(expandedId===undefined||!expanded)return
    let active=true
    setExpandedItems(undefined);setDetailError('')
    void readProduction('production_items',{id:expandedId}).then(result=>{
      if(!active)return
      if(!result.rows[0])throw Error('Üretim pozlarına erişilemiyor.')
      setExpandedItems({code:expanded,items:result.rows[0].productionItems})
    }).catch(e=>{if(active)setDetailError(e.message)})
    return()=>{active=false}
  },[expandedId,expanded,requestVersion])
  const filteredIds = (online?filtered:filteredLocal).map(project => project.id)
  const visibleColumns = tableView.visibleColumns
  const hasAdvancedFilter = Boolean(statusFilter || technicalFilter !== 'all' || productFilter !== 'all' || customerFilter !== 'all' || advanced.activeCount || search)
  const clearAllFilters = () => { setSearch(''); setStatusFilter(null); setTechnicalFilter('all'); setProductFilter('all'); setCustomerFilter('all'); advanced.clearFilters() }

  const summaryCounts = useMemo(() => online?remote?.counts??{}:PRODUCTION_PROJECT_STATUSES.reduce((result, status) => {
    result[status] = productionProjects.filter(project => (project.status) === status).length
    return result
  }, {} as Record<ProjectStatus, number>), [online,remote,productionProjects])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (filterOpen) { setFilterOpen(false); event.preventDefault(); return }
        if (selection.selectedCount > 0) { selection.clearSelection(); event.preventDefault(); return }
        if (hasAdvancedFilter) { clearAllFilters(); event.preventDefault(); return }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a' && tableRef.current?.contains(document.activeElement)) { event.preventDefault(); selection.selectAll(filteredIds) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [filteredIds.join(','), filterOpen, hasAdvancedFilter, selection.selectedCount, selection.clearSelection, selection.selectAll])

  useEffect(() => {
    if (!filterOpen) return
    const handler = (event: MouseEvent) => { if (filterRef.current && !filterRef.current.contains(event.target as Node)) setFilterOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  const toggleCollapse = (projectCode: string) => online?setExpanded(previous=>previous===projectCode?null:projectCode):setCollapsedProjects(previous => {
    const next = new Set(previous); next.has(projectCode) ? next.delete(projectCode) : next.add(projectCode); return next
  })


  const exportProduction = async () => {
    if(!perms.can('project.export')||exporting)return
    setExporting(true)
    try{
    const projects:ProductionProject[]=online?[]:productionProjects
    if(online){
      for(let offset=0;;offset+=100){
        const batch=await readProduction('production_export',{offset})
        projects.push(...batch.rows)
        if(offset+batch.rows.length>=batch.total||batch.rows.length===0)break
      }
    }
    const rows=projects.flatMap(project=>project.productionItems.map(item=>[
      project.siraNo,project.projKodu,project.projeAdi,project.musteriAdi,project.cizen,project.uretimiAcan||'',
      formatDateTime(project.orderApprovedAt||''),formatDateTime(project.sonIslemTarihi),item.kod,item.urun,item.miktar,
      PRODUCTION_ITEM_STATUS[item.status].label,item.milestones.uretimde||'',item.milestones.delivery||'',item.milestones.delivered||''
    ]))
    exportRowsToXlsx('PLMR_Uretim_Ozeti.xlsx','Üretim',['Sıra No','Proje Kodu','Proje Adı','Müşteri Adı','Proje Temsilcisi','Üretime Açan','Sipariş Sürecine Alınma Tarihi','Son İşlem Tarihi','Poz Kodu','Ürün','Adet','Durum','Üretim Sürecinde','Sevkiyat Sürecinde','Teslim Edildi'],rows)
    }catch(e){setError((e as Error).message)}finally{setExporting(false)}
  }

  const gridTemplateColumns = ['38px', ...visibleColumns.map(column => `${column.width ?? 100}px`), '92px'].join(' ')
  const minWidth = 38 + visibleColumns.reduce((sum, column) => sum + (column.width ?? 100), 0) + 92

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#eef0f3' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid #dde1e7', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, position: 'relative' }}>
        <div style={{ flex: 1 }} />
        {perms.can('project.export')&&<button onClick={exportProduction} style={headerButtonStyle}><IDownload size={12} /> <Ui value={" Excel"}/></button>}
        <div ref={filterRef} style={{ position: 'relative' }}>
          <button onClick={() => setFilterOpen(value => !value)} style={{ ...headerButtonStyle, border: `1px solid ${filterOpen || hasAdvancedFilter ? '#0d9488' : '#dde1e7'}`, background: filterOpen || hasAdvancedFilter ? '#f0fdfa' : '#fff', color: filterOpen || hasAdvancedFilter ? '#0d9488' : '#374151' }}><IFilter size={12} /> <Ui value={" Tablo Ayarları"}/><Ui value={hasAdvancedFilter ? ' ·' : ''}/></button>
          {filterOpen && <TableViewPanel title={t("Tablo Ayarları")} columns={tableView.orderedColumns} sort={tableView.preferences.sort} sortOptions={PRODUCTION_SORT_OPTIONS} onColumnVisible={tableView.setColumnVisible} onMoveColumn={tableView.moveColumn} onReorderColumns={tableView.reorderColumns} onSort={tableView.setSort} onResetView={tableView.reset} onClose={() => setFilterOpen(false)} onExportExcel={perms.can('project.export')?exportProduction:undefined} hasFilters={hasAdvancedFilter} onClearFilters={clearAllFilters} filterContent={<div style={{ display: 'grid', gap: 6 }}><select value={technicalFilter} onChange={event => setTechnicalFilter(event.target.value as 'all' | TechnicalReadiness)} style={panelSelectStyle}>{TECHNICAL_FILTERS.map(option => <option key={option.value} value={option.value}><Ui value={option.label}/></option>)}</select><select value={statusFilter ?? 'all'} onChange={event => setStatusFilter(event.target.value === 'all' ? null : normalizeProjectStatus(event.target.value))} style={panelSelectStyle}><option value="all"><Ui value={"Tüm proje durumları"}/></option>{PRODUCTION_PROJECT_STATUSES.map(status => <option key={status} value={status}><Ui value={PROJECT_STATUS[status].label}/></option>)}</select><select value={productFilter} onChange={event => setProductFilter(event.target.value)} style={panelSelectStyle}><option value="all"><Ui value={"Tüm ürünler"}/></option>{productOptions.map(product => <option key={product} value={product}><Ui value={product}/></option>)}</select><select value={customerFilter} onChange={event => setCustomerFilter(event.target.value)} style={panelSelectStyle}><option value="all"><Ui value={"Tüm müşteriler"}/></option>{customerOptions.map(customer => <option key={customer} value={customer}><Ui value={customer}/></option>)}</select></div>} />}
        </div>
      </div>

      <div style={{ padding: '6px 20px', background: '#f8f9fb', borderBottom: '1px solid #e5e7eb', fontSize: 10.5, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6 }}><IInfo size={11} /> <Ui value={" Üretim görünümünde fiyat bilgisi gösterilmez."}/></div>

      <div style={{ background: '#fff', padding: '10px 20px', borderBottom: '1px solid #dde1e7', display: 'flex', gap: 8 }}>
        {PRODUCTION_PROJECT_STATUSES.map(status => { const cfg = PROJECT_STATUS[status]; const active = statusFilter === status; return <button key={status} onClick={() => setStatusFilter(active ? null : status)} style={{ minWidth: 98, padding: '7px 11px', borderRadius: 7, border: `1.5px solid ${active ? cfg.border : '#e5e7eb'}`, background: active ? cfg.bg : '#fff', textAlign: 'left', cursor: 'pointer' }}><div style={{ display: 'flex', alignItems: 'center', gap: 5, color: active ? cfg.color : '#6b7280', fontSize: 10, fontWeight: 600 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} /><Ui value={cfg.label.toUpperCase()}/></div><div style={{ marginTop: 2, fontSize: 20, fontWeight: 700, color: active ? cfg.color : '#111827', fontFamily: 'var(--font-mono)' }}><Ui value={summaryCounts[status] ?? 0}/></div></button> })}
      </div>

      <div style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: '1.5px solid #dde1e7', borderRadius: 6, padding: '6px 12px', width: 360 }}><ISearch size={13} style={{ color: '#9ca3af' }} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t("Proje, müşteri veya ürün ara...")} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 12.5, color: '#374151' }} />{search && <button onClick={() => setSearch('')} style={{ border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer', padding: 0 }}><IX size={11} /></button>}</div>
        <span style={{ fontSize: 11.5, color: '#9ca3af' }}><Ui value={total}/> / <Ui value={available}/> <Ui value={" proje"}/></span>{hasAdvancedFilter&&<><span style={{fontSize:10.5,color:'#0f766e'}}><Ui value={advanced.activeCount + (search?1:0)}/> <Ui value={" filtre aktif"}/></span><button onClick={clearAllFilters} style={{border:0,background:'transparent',color:'#0d9488',fontSize:10,cursor:'pointer'}}><Ui value={"Tüm Filtreleri Temizle"}/></button></>}<div style={{ flex: 1 }} /><span style={{ fontSize: 11, color: '#9ca3af' }}><Ui value={"Ctrl+A sayfayı seç · Ctrl+tıkla çoklu seç · Shift+tıkla aralık · Esc seçimi temizle"}/></span>
      </div>

      <div ref={tableRef} tabIndex={0} onMouseDownCapture={event => { const target = event.target as HTMLElement; if (!target.closest('input,button,textarea,select')) tableRef.current?.focus({ preventScroll: true }) }} style={{ flex: 1, overflow: 'auto', margin: '0 20px 20px', outline: 'none' }}>
        <div style={{ background: '#fff', border: '1px solid #dde1e7', borderRadius: 8, overflow: 'hidden', minWidth }}>
          <div style={{ position:'sticky', top:0, zIndex:20 }}>
            <div style={{ display: 'grid', gridTemplateColumns, background: '#f8f9fb', borderBottom: '1px solid #e5e7eb' }}>
              <HeaderCell><input type="checkbox" checked={filtered.length > 0 && filtered.every(project => selection.selectedIds.has(project.id))} onChange={event => event.target.checked ? selection.selectAll(filteredIds) : selection.clearSelection()} style={{ cursor: 'pointer', accentColor: '#0d9488' }} /></HeaderCell>
              {visibleColumns.map(column => <HeaderCell key={column.id}><button onClick={()=>advanced.cycleSort(column.id)} style={{border:0,background:'transparent',padding:0,color:'inherit',font:'inherit',fontWeight:'inherit',cursor:'pointer',textTransform:'inherit'}}><Ui value={column.label}/><Ui value={advanced.quickSort.columnId===column.id&&advanced.quickSort.direction?(advanced.quickSort.direction==='asc'?' ↑':' ↓'):''}/></button></HeaderCell>)}
              <HeaderCell><Ui value={"İşlemler"}/></HeaderCell>
            </div>
            <div style={{ display:'grid', gridTemplateColumns, background:'#fbfdff', borderBottom:'1.5px solid #e5e7eb' }}>
              <HeaderCell />
              {visibleColumns.map(column=><HeaderCell key={`filter-${column.id}`} style={{padding:'3px 4px'}}>{column.id==='status'?<DataGridFilterCell label={column.label} value={advanced.filters.status||''} onChange={v=>advanced.setFilter('status',v)} type="select" options={PRODUCTION_PROJECT_STATUSES.map(status=>({value:String(status),label:PROJECT_STATUS[status].label}))}/>:PRODUCTION_HEADER_FILTERS.includes(column.id)?<DataGridFilterCell label={column.label} value={advanced.filters[column.id]||''} onChange={v=>advanced.setFilter(column.id,v)}/>:null}</HeaderCell>)}
              <HeaderCell />
            </div>
          </div>
          {loading&&<p role="status"><Ui value="Üretim projeleri yükleniyor…"/></p>}
          {error&&<p role="alert"><Ui value={error}/> <button onClick={()=>reload(v=>v+1)}><Ui value="Tekrar Dene"/></button></p>}
          {!loading&&!error&&filtered.length===0&&<div style={{padding:'42px 20px',textAlign:'center',color:'#9ca3af',fontSize:12.5}}><Ui value="Filtreye uygun üretim projesi bulunamadı."/></div>}
          {!loading&&filtered.map(project => {
            const open=online?expanded===project.projKodu:!collapsedProjects.has(project.projKodu)
            const items=online?expandedItems?.code===project.projKodu?expandedItems.items:[]:project.productionItems
            return <ProductionProjectGroup key={project.id} project={{...project,productionItems:items}}
              gridTemplateColumns={gridTemplateColumns} columns={visibleColumns.map(column => column.id as ProductionColumnId)}
              collapsed={!open} selected={selection.selectedIds.has(project.id)}
              onToggleCollapse={()=>toggleCollapse(project.projKodu)} onSelect={event=>selection.handleRowClick(project.id,event,filteredIds)}
              onCheckbox={event=>selection.handleCheckboxClick(project.id,event,filteredIds)} onOpenProject={onOpenProject}
              onChanged={online?()=>reload(v=>v+1):undefined}
              detailMessage={online&&open&&expandedItems?.code!==project.projKodu?detailError||'Üretim pozları yükleniyor…':''}/>
          })}
        </div>

      </div>

      <nav aria-label={t('Üretim sayfaları')} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'0 0 12px'}}>
        <button style={headerButtonStyle} disabled={loading||page<=1} onClick={()=>setPage(p=>p-1)}><Ui value="Önceki"/></button>
        <span aria-live="polite">{page} / {pageCount}</span>
        <button style={headerButtonStyle} disabled={loading||page>=pageCount} onClick={()=>setPage(p=>p+1)}><Ui value="Sonraki"/></button>
      </nav>

      {selection.selectedCount > 0 && <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: '#0f1623', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100, minWidth: 330 }}><div style={{ background: '#0d9488', color: '#fff', borderRadius: 5, padding: '2px 9px', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}><Ui value={selection.selectedCount}/></div><span style={{ fontSize: 12.5, color: '#c9d1dc' }}><Ui value={"üretim projesi seçildi"}/></span><div style={{ flex: 1 }} /><button onClick={selection.clearSelection} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}><Ui value={"İptal"}/></button></div>}
    </div>
  )
}

interface ProductionProjectGroupProps {
  project: ProductionProject
  gridTemplateColumns: string
  columns: ProductionColumnId[]
  collapsed: boolean
  selected: boolean
  onToggleCollapse: () => void
  onSelect: (event: React.MouseEvent) => void
  onCheckbox: (event: React.MouseEvent) => void
  onOpenProject?: (projKodu: string, musteriAdi: string, projectId?: string) => void
  onChanged?:()=>void
  detailMessage?:string
}

function ProductionProjectGroup({ project, gridTemplateColumns, columns, collapsed, selected, onToggleCollapse, onSelect, onCheckbox, onOpenProject,onChanged,detailMessage }: ProductionProjectGroupProps) {
  const {updateProductionItemStatus,hydrateProject}=useProjectStore()
  const perms=usePermissionResolver(),[message,setMessage]=useState('')
  const committing=useRef(false)
  const canSetStatus=(status:ProductionItemStatus)=>!project.productionLocked&&!project.approvals?.production&&perms.can(status===30?'operations.start_production':status===50?'operations.mark_ready_to_ship':status===40||status===60?'operations.mark_shipped':'operations.view')
  const setStatus=async(item:ProductionItem,status:ProductionItemStatus)=>{
    if(committing.current)return
    committing.current=true
    try{
      if(onChanged&&!(await hydrateProject(project.projKodu)))throw Error('Proje kaydı bulunamadı.')
      updateProductionItemStatus(project.id,item.id,status)
      if(onChanged){await awaitProjectMasterSave(project.id);onChanged()}
      setMessage('')
    }catch(error){setMessage(error instanceof Error?error.message:'Durum güncellenemedi.')}
    finally{committing.current=false}
  }
  const effectiveStatus = project.status
  const statusConfig = PROJECT_STATUS[effectiveStatus]
  const projectCell = (id: ProductionColumnId) => {
    switch (id) {
      case 'sira': return <Cell><span style={{ fontSize: 11.5, color: '#9ca3af', fontFamily: 'var(--font-mono)' }}><Ui value={project.siraNo}/></span></Cell>
      case 'project': return <Cell><button onClick={event => { event.stopPropagation(); onToggleCollapse() }} style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', padding: 0, color: '#6b7280', cursor: 'pointer' }}><Ui value={collapsed ? <IChevR size={11} /> : <IChevD size={11} />}/></button><span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8', fontFamily: 'var(--font-mono)' }}>{project.projKodu}</span></Cell>
      case 'name': return <Cell>{project.projeAdi}</Cell>
      case 'representative': return <Cell>{project.cizen||'—'}</Cell>
      case 'openedBy': return <Cell>{project.uretimiAcan||'—'}</Cell>
      case 'orderDate': return <MilestoneCell value={project.orderApprovedAt}/>
      case 'lastAction': return <MilestoneCell value={project.sonIslemTarihi}/>
      case 'code': return <Cell />
      case 'customer': return <Cell><span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{project.musteriAdi}</span></Cell>
      case 'qty': return <Cell><span style={{ fontSize: 11, color: '#9ca3af' }}><Ui value={project.productionItemCount??project.productionItems.length}/> <Ui value={" poz"}/></span></Cell>
      case 'technical': return <Cell />
      case 'status': return <Cell><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: statusConfig.bg, color: statusConfig.color, border: `1px solid ${statusConfig.border}`, borderRadius: 5, padding: '2px 8px', fontSize: 10.5, fontWeight: 600 }}><span style={{ width: 5, height: 5, borderRadius: '50%', background: statusConfig.dot }} /><Ui value={statusConfig.label}/></span></Cell>
      case 'approved': case 'inProduction': case 'ready': case 'shipped': return <Cell />
    }
  }
  return <div>
    <div onMouseDown={event => { if (event.shiftKey) event.preventDefault() }} onClick={onSelect} onDoubleClick={() => onOpenProject?.(project.projKodu, project.musteriAdi, project.projectId)} style={{ display: 'grid', gridTemplateColumns, background: selected ? '#e8f7f5' : '#f0f2f6', borderBottom: '1px solid #e5e7eb', cursor: 'pointer', userSelect: 'none', transition: 'background 80ms' }}>
      <Cell><input type="checkbox" checked={selected} onChange={() => {}} onClick={onCheckbox} style={{ cursor: 'pointer', accentColor: '#0d9488' }} /></Cell>
      {columns.map(id => <div key={id} style={{ display: 'contents' }}><Ui value={projectCell(id)}/></div>)}
      <Cell style={{ justifyContent: 'center', gap: 4 }}><button onClick={event => { event.stopPropagation(); onOpenProject?.(project.projKodu, project.musteriAdi, project.projectId) }} style={{ padding: '3px 9px', borderRadius: 5, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}><Ui value={"Aç"}/></button></Cell>
    </div>
    {message&&<div role="alert" style={{padding:8,color:'#b91c1c',fontSize:11}}><Ui value={message}/></div>}
    {detailMessage&&<div role="status" style={{padding:8}}><Ui value={detailMessage}/></div>}
    {!collapsed && project.productionItems.map((item, index) => <div key={item.id} style={{ display: 'grid', gridTemplateColumns, borderBottom: index < project.productionItems.length - 1 ? '1px solid #f9fafb' : '1px solid #e5e7eb', transition: 'background 80ms' }} onMouseEnter={event => event.currentTarget.style.background = '#f8fafc'} onMouseLeave={event => event.currentTarget.style.background = 'transparent'}><Cell />{columns.map(id => <div key={id} style={{ display: 'contents' }}>{renderItemCell(id, item, project.projKodu, canSetStatus, setStatus)}</div>)}<Cell /></div>)}
  </div>
}

function renderItemCell(id: ProductionColumnId, item: ProductionItem, projectCode:string, canSetStatus:(status:ProductionItemStatus)=>boolean, setStatus:(item:ProductionItem,status:ProductionItemStatus)=>void) {
  const itemConfig = PRODUCTION_ITEM_STATUS[item.status as ProductionItemStatus]
  const technicalConfig = TECHNICAL_CONFIG[item.teknikTamamlandi]
  switch (id) {
    case 'sira': return <Cell />
    case 'project': return <Cell style={{ paddingLeft: 34 }}><span style={{ width: 4, height: 4, borderRadius: '50%', background: '#d1d5db', flexShrink: 0 }} /><span style={{ fontSize: 12.5, color: '#374151' }}><Ui value={item.urun}/></span></Cell>
    case 'code': return <Cell><span style={{ fontSize: 11.5, color: '#9ca3af', fontFamily: 'var(--font-mono)' }}><Ui value={item.kod}/></span></Cell>
    case 'name': case 'representative': case 'openedBy': case 'orderDate': case 'lastAction':
    case 'customer': return <Cell />
    case 'qty': return <Cell><span style={{ fontSize: 12, color: '#374151', fontFamily: 'var(--font-mono)' }}><Ui value={item.miktar}/></span></Cell>
    case 'technical': return <Cell><span title={technicalTooltip(item)} style={{ fontSize: 10.5, fontWeight: 600, color: technicalConfig.color, background: technicalConfig.bg, borderRadius: 4, padding: '1px 6px', cursor:'help', borderBottom:'1px dotted currentColor' }}><Ui value={technicalConfig.label}/></span></Cell>
    case 'status': return <Cell><select aria-label={`${projectCode} ${item.kod} üretim durumu`} value={item.status} disabled={!Object.keys(PRODUCTION_ITEM_STATUS).some(s=>canSetStatus(normalizeProductionStatus(s)))} onChange={event=>setStatus(item,normalizeProductionStatus(event.target.value))} style={{width:'100%',minWidth:0,height:27,fontSize:11,fontWeight:600,color:itemConfig.color,background:itemConfig.bg,border:'1px solid #dbe3ea',borderRadius:4,padding:'0 4px'}}>{(Object.keys(PRODUCTION_ITEM_STATUS).map(normalizeProductionStatus)).map(status=><option key={status} value={status} disabled={!canSetStatus(status)}><Ui value={PRODUCTION_ITEM_STATUS[status].label}/><Ui value={!canSetStatus(status)?' · Yetki yok':''}/></option>)}</select></Cell>
    case 'approved': return <MilestoneCell value={item.milestones.onaylandi} />
    case 'inProduction': return <MilestoneCell value={item.milestones.uretimde} />
    case 'transfer': return <MilestoneCell value={item.milestones.transfer} />
    case 'ready': return <MilestoneCell value={item.milestones.delivery} />
    case 'shipped': return <MilestoneCell value={item.milestones.delivered} />
  }
}

function technicalTooltip(item:ProductionItem):string{
  if(item.technicalDetail)return item.technicalDetail
  if(item.teknikTamamlandi==='complete')return 'Aktif revizyonun üretim paketi kaydedildi.'
  if(item.teknikTamamlandi==='drawing_attached')return 'Çizim ve poz verisi kayıtlı; üretim paketi henüz kaydedilmedi.'
  return 'Aktif revizyon için üretime hazır teknik veri veya üretim paketi eksik.'
}

function HeaderCell({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) { return <div style={{ padding: '8px 10px', fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: 0.4, textTransform: 'uppercase', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', ...style }}>{children}</div> }
function Cell({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) { return <div style={{ padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, ...style }}>{children}</div> }
function MilestoneCell({ value }: { value?: string }) { return <Cell>{value ? <span style={{ fontSize: 10.5, color: '#374151', fontFamily: 'var(--font-mono)' }}><Ui value={formatDateTime(value)}/></span> : <span style={{ fontSize: 12, color: '#e5e7eb' }}>—</span>}</Cell> }

const panelSelectStyle: React.CSSProperties = { width: '100%', height: 32, border: '1px solid #dde1e7', borderRadius: 6, background: '#fff', color: '#374151', fontSize: 11.5, padding: '0 8px', outline: 'none' }
const headerButtonStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, border: '1px solid #dde1e7', background: '#fff', color: '#374151', fontSize: 12, cursor: 'pointer' }
