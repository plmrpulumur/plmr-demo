import {Ui,t,formatMessage} from '../i18n/react'
import {formatDateTime} from '../utils/formatters'
import {tenantSessionStorage as sessionStorage} from '../services/platformAccess'
import ProductListHint from './ProductListHint'
import {useProjectContentSearch} from '../hooks/useProjectContentSearch'
import {awaitProjectMasterSave} from '../services/cloudPlatform'
import {createProjectSearch} from '../services/projectSearch'
import {normalizeProjectStatus,normalizeProductionStatus} from '../domain/projectStatus'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ProjectMaster, ProjectStatus } from '../domain/project'
import { PROJECT_STATUS as STATUS, PROJECT_STATUS_ORDER as STATUS_ORDER } from '../config/projectStatuses'
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
import { projectProgressIndex, projectTransitionPath } from '../domain/projectWorkflow'
import { DEFAULT_PROJECT_PAGE_SIZE, paginateProjects } from '../domain/projectQuery'

/* ─── Column widths & sticky offsets ────────────────────────────────────── */

const COL = {
  cb:       32,
  sira:     38,
  kod:     118,
  musteri: 120,
  urunler: 90,
  rev:      104,
  temsilci:84,
  cizen:   90,
  teklif:  80,
  uretim:  84,
  olusturma:86,
  son:     86,
  durum:   82,
  islemler: 78,
}

const STICKY_L = {
  cb:      0,
  sira:    COL.cb,
  kod:     COL.cb + COL.sira,
  musteri: COL.cb + COL.sira + COL.kod,
}


type ProjectColumnId = 'sira' | 'kod' | 'projeAdi' | 'musteri' | 'urunler' | 'rev' | 'temsilci' | 'cizen' | 'teklif' | 'uretim' | 'olusturma' | 'son' | 'durum'

const PROJECT_TABLE_DEFAULT: TablePreferences = {
  columns: [
    { id: 'sira', label: 'Sıra', visible: true, order: 0, width: COL.sira },
    { id: 'kod', label: 'Proje Kodu', visible: true, order: 1, width: COL.kod },
    { id: 'projeAdi', label: 'Proje Adı', visible: true, order: 2, width: 118 },
    { id: 'musteri', label: 'Müşteri Adı', visible: true, order: 3, width: COL.musteri },
    { id: 'urunler', label: 'Ürünler', visible: true, order: 3, width: COL.urunler },
    { id: 'rev', label: 'Rev.', visible: true, order: 4, width: COL.rev },
    { id: 'temsilci', label: 'Müş. Temsilcisi', visible: true, order: 5, width: COL.temsilci },
    { id: 'cizen', label: 'Proje Temsilcisi', visible: true, order: 6, width: COL.cizen },
    { id: 'teklif', label: 'Teklifi Veren', visible: true, order: 7, width: COL.teklif },
    { id: 'uretim', label: 'Üretime Açan', visible: true, order: 8, width: COL.uretim },
    { id: 'olusturma', label: 'Oluşturma', visible: true, order: 9, width: COL.olusturma },
    { id: 'son', label: 'Son İşlem', visible: true, order: 10, width: COL.son },
    { id: 'durum', label: 'Durum', visible: true, order: 11, width: COL.durum },
  ],
  sort: { columnId: 'olusturma', direction: 'desc' },
}


import {quoteWindow} from '../domain/recentQuotes'

function matchesSelectedDate(value:string, selected:string | undefined):boolean{
  if(!selected)return true
  const valueTs=parsePlmrDateTime(value)
  if(!valueTs)return false
  const selectedDate=new Date(`${selected}T00:00:00`)
  const valueDate=new Date(valueTs)
  return valueDate.getFullYear()===selectedDate.getFullYear() && valueDate.getMonth()===selectedDate.getMonth() && valueDate.getDate()===selectedDate.getDate()
}

function sortProjects(rows:ProjectMaster[], columnId:string, direction:'asc'|'desc'='desc',representative:(p:ProjectMaster)=>string=p=>p.cizen){
  return sortWithDirection(rows,(a,b)=>{
    switch(columnId){
      case 'sira': return compareTextTr(a.siraNo,b.siraNo)
      case 'olusturma': return parsePlmrDateTime(a.olusturmaTarihi)-parsePlmrDateTime(b.olusturmaTarihi)
      case 'son': return parsePlmrDateTime(a.sonIslemTarihi)-parsePlmrDateTime(b.sonIslemTarihi)
      case 'kod': return compareTextTr(a.projKodu,b.projKodu)
      case 'projeAdi': return compareTextTr(a.projeAdi,b.projeAdi)
      case 'musteri': return compareTextTr(a.musteriAdi,b.musteriAdi)
      case 'durum': return STATUS_ORDER.indexOf(a.status)-STATUS_ORDER.indexOf(b.status)
      case 'urunler': return compareTextTr(a.urunler[0],b.urunler[0])
      case 'rev': return compareTextTr(a.revizyon,b.revizyon)
      case 'temsilci': return compareTextTr(a.musteriTemsilcisi,b.musteriTemsilcisi)
      case 'cizen': return compareTextTr(representative(a),representative(b))
      case 'teklif': return compareTextTr(a.teklifVeren,b.teklifVeren)
      case 'uretim': return compareTextTr(a.uretimiAcan,b.uretimiAcan)
      default: return parsePlmrDateTime(a.olusturmaTarihi)-parsePlmrDateTime(b.olusturmaTarihi)
    }
  },direction)
}

const PROJECT_EXPORT_HEADERS: Record<ProjectColumnId,string> = {
  sira:'Sıra No', kod:'Proje Kodu', projeAdi:'Proje Adı', musteri:'Müşteri Adı', urunler:'Ürünler', rev:'Revizyon', temsilci:'Müşteri Temsilcisi', cizen:'Proje Temsilcisi', teklif:'Teklifi Veren', uretim:'Üretime Açan', olusturma:'Oluşturma Tarihi', son:'Son İşlem Tarihi', durum:'Durum'
}
function projectExportValue(project:ProjectMaster, id:ProjectColumnId,representative=project.cizen){
  switch(id){
    case 'sira': return project.siraNo
    case 'kod': return project.projKodu
    case 'projeAdi': return project.projeAdi
    case 'musteri': return project.musteriAdi
    case 'urunler': return project.urunler.join(', ')
    case 'rev': return project.revizyon
    case 'temsilci': return project.musteriTemsilcisi
    case 'cizen': return representative
    case 'teklif': return project.teklifVeren
    case 'uretim': return project.uretimiAcan ?? ''
    case 'olusturma': return project.olusturmaTarihi
    case 'son': return project.sonIslemTarihi
    case 'durum': return STATUS[project.status].label
  }
}

const PROJECT_SORT_OPTIONS = [
  { id: 'olusturma', label: 'Oluşturma', kind: 'date' as const },
  { id: 'son', label: 'Son İşlem', kind: 'date' as const },
  { id: 'kod', label: 'Proje Kodu', kind: 'text' as const },
  { id: 'projeAdi', label: 'Proje Adı', kind: 'text' as const },
  { id: 'musteri', label: 'Müşteri Adı', kind: 'text' as const },
  { id: 'durum', label: 'Durum', kind: 'text' as const },
  { id: 'urunler', label: 'Ürün', kind: 'text' as const },
  { id: 'rev', label: 'Revizyon', kind: 'text' as const },
  { id: 'temsilci', label: 'Müşteri Temsilcisi', kind: 'text' as const },
  { id: 'cizen', label: 'Proje Temsilcisi', kind: 'text' as const },
  { id: 'teklif', label: 'Teklifi Veren', kind: 'text' as const },
  { id: 'uretim', label: 'Üretime Açan', kind: 'text' as const },
]

/* ─── Small SVG icons ────────────────────────────────────────────────────── */

type P = { size?: number; style?: React.CSSProperties; className?: string }
const I = (d: string | React.ReactNode, vb = '0 0 24 24') =>
  ({ size = 14, style, className }: P) => (
    <svg width={size} height={size} viewBox={vb} fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
      style={style} className={className} aria-hidden>
      <Ui value={typeof d === 'string' ? <path d={d} /> : d}/>
    </svg>
  )

const ISearch  = I(<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>)
const IFilter  = I(<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>)
const IDraft   = I(<><path d="M2 20h20"/><path d="M5 20V8l7-6 7 6v12"/><rect x="9" y="12" width="6" height="8" rx="1"/></>)
const IFolderOpen = I(<><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></>)
const IPlus    = I(<><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>)
const IMore    = I(<><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></>)
const IChevD   = I(<polyline points="6 9 12 15 18 9"/>)
const ICheck   = I(<polyline points="20 6 9 17 4 12"/>)
const ILock    = I(<><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>)
const IX       = I(<><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>)
const IEdit    = I(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>)
const IRefresh = I(<><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>)
const ICopy    = I(<><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>)
const IDownload= I(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>)
const IArchive = I(<><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></>)
const ITrash   = I(<><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></>)
const IInfo    = I(<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>)

/* ─── Main component ─────────────────────────────────────────────────────── */

interface ProjeCizimiPageProps {

  onOpenArchive?: () => void
  onOpenDeleted?: () => void
  onNewProject?: () => void
  onOpenProject?: (projKodu: string, musteriAdi: string, projectId?: string) => void
  onCloneProject?: (projectId: string, projectCode: string) => void
  defaultFilter?: 'arsiv' | null
}

export default function ProjeCizimiPage({ onOpenArchive, onOpenDeleted, onNewProject, onOpenProject, onCloneProject, defaultFilter }: ProjeCizimiPageProps = {}) {
  const directory=useUserDirectory(); const perms=usePermissionResolver(); const currentUser=directory.currentUser
  const { projects, updateProjectStatus, archiveProjectRecords, restoreArchivedProjects, softDeleteProjects } = useProjectStore()
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | null>(
    defaultFilter === 'arsiv' ? 'arsivlendi' : null
  )
  const [approvedPipelineFilter,setApprovedPipelineFilter]=useState(false)
  const [quote7dFilter,setQuote7dFilter]=useState(false)
  const selection = useSelectionController<number>()
  const { selectedIds: selected, selectedCount, anchorId, handleRowClick, handleCheckboxClick, selectAll, selectOnly, clearSelection } = selection
  const [actionMenuId, setActionMenuId]   = useState<number | null>(null)
  const [statusModalId, setStatusModalId] = useState<number | null>(null)
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false)
  const [newStatus, setNewStatus]     = useState<ProjectStatus>(20)
  const [newStatusNote, setNewStatusNote] = useState('')
  const [statusError, setStatusError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [productPopoverId, setProductPopoverId] = useState<number | null>(null)
  const [filterOpen, setFilterOpen]   = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportIncludeActive, setExportIncludeActive] = useState(defaultFilter !== 'arsiv')
  const [exportIncludeArchived, setExportIncludeArchived] = useState(defaultFilter === 'arsiv')
  const [exportScope, setExportScope] = useState<'all'|'filtered'>('all')
  const [exportLayout, setExportLayout] = useState<'current'|'default'>('current')
  const [productFilter, setProductFilter] = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const listDefaults=PROJECT_TABLE_DEFAULT
  const tableView = useTablePreferences(listDefaults, 'plmr.table.project-center.v6')
  const advanced = useAdvancedTable()
  const tableRef = useRef<HTMLDivElement>(null)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  useEffect(()=>{if(defaultFilter==='arsiv')return;try{const rawStatus=sessionStorage.getItem('plmr.projectCenter.initialStatusFilter');const status=rawStatus?normalizeProjectStatus(rawStatus):null;const pipeline=sessionStorage.getItem('plmr.projectCenter.approvedPipelineFilter');const quote7=sessionStorage.getItem('plmr.projectCenter.quote7dFilter');if(status){setStatusFilter(status);sessionStorage.removeItem('plmr.projectCenter.initialStatusFilter')}if(pipeline==='1'){setApprovedPipelineFilter(true);sessionStorage.removeItem('plmr.projectCenter.approvedPipelineFilter')}if(quote7==='1'){setQuote7dFilter(true);sessionStorage.removeItem('plmr.projectCenter.quote7dFilter')}}catch{}},[])

  /* Derived lists */
  // These lists depend on records and the current permission/directory context,
  // not on row selection, menus or modal drafts. Never cache across contexts.
  const undeletedProjects = useMemo(() => projects.filter(project => !project.deletedAt), [projects])
  const accessibleProjects = useMemo(() => undeletedProjects.filter(project =>
    (perms.can('project.view') || Boolean(project.sourceQuickQuoteId && !project.hasTechnicalDrawing && perms.can('commercial.quote.view'))) &&
    perms.canAccessRecord('PROJECTS', {
      ownerUserId: project.ownerUserId || directory.findUserByName(project.cizen)?.userId,
      assignedUserIds: project.assignedUserIds,
      createdByUserId: project.createdByUserId,
      representativeUserId: project.projectRepresentativeUserId || directory.findUserByName(project.musteriTemsilcisi)?.userId,
    })
  ), [undeletedProjects, perms, directory])
  const activeProjects = useMemo(() => accessibleProjects.filter(project =>
    defaultFilter === 'arsiv' ? project.status === 'arsivlendi' : project.status !== 'arsivlendi'
  ), [accessibleProjects, defaultFilter])
  const sortColumn=advanced.quickSort.direction?advanced.quickSort.columnId:tableView.preferences.sort.columnId
  const fullContent=Boolean(search.trim()||advanced.filters.cizen||sortColumn==='cizen'||exportOpen)
  const contentSearch=useProjectContentSearch(activeProjects,fullContent)
  const projectRepresentative = useCallback((project: ProjectMaster) =>
    contentSearch.index[project.projKodu]?.representative ||
    directory.getUser(project.projectRepresentativeUserId || '')?.fullName || project.cizen || '—',
    [contentSearch.index, directory])
  const[availableWidth,setAvailableWidth]=useState(1300)
  useEffect(()=>{const el=tableScrollRef.current;if(!el)return;const observer=new ResizeObserver(entries=>setAvailableWidth(entries[0].contentRect.width));observer.observe(el);return()=>observer.disconnect()},[])
  const productOptions = useMemo(() => Array.from(new Set(activeProjects.flatMap(project => project.urunler))).sort((a, b) => compareTextTr(a, b)), [activeProjects])
  const customerOptions = useMemo(() => Array.from(new Set(activeProjects.map(project => project.musteriAdi))).sort((a, b) => compareTextTr(a, b)), [activeProjects])

  const projectSearch=useMemo(()=>createProjectSearch(search,defaultFilter!=='arsiv'),[search,defaultFilter])

  const filtered = useMemo(() => {
    const inQuoteWindow=quoteWindow()
    const base = activeProjects.filter(project => {
      const matchQuote7d=!quote7dFilter||(project.quotes||[]).some(q=>inQuoteWindow(q.date))
      const matchStatus = approvedPipelineFilter ? [20,30,40,50,60].includes(Number(project.status)) : statusFilter ? project.status === statusFilter : true
      const matchProduct = productFilter === 'all' ? true : project.urunler.includes(productFilter)
      const matchCustomer = customerFilter === 'all' ? true : project.musteriAdi === customerFilter
      const matchSearch = projectSearch(project,contentSearch.index[project.projKodu],projectRepresentative(project))
      const f = advanced.filters
      const contains = (value:string, key:string) => !f[key] || value.toLocaleLowerCase('tr-TR').includes(f[key].toLocaleLowerCase('tr-TR'))
      const columnOk = contains(project.projKodu,'kod') && contains(project.projeAdi,'projeAdi') && contains(project.musteriAdi,'musteri') && contains(project.urunler.join(' '),'urunler') && contains(project.revizyon,'rev') && contains(project.musteriTemsilcisi,'temsilci') && contains(projectRepresentative(project),'cizen') && contains(project.teklifVeren,'teklif') && contains(project.uretimiAcan || '','uretim') && (!f.durum || String(project.status) === f.durum) && matchesSelectedDate(project.olusturmaTarihi,f.olusturmaDate) && matchesSelectedDate(project.sonIslemTarihi,f.sonDate)
      return matchQuote7d && matchStatus && matchProduct && matchCustomer && matchSearch && columnOk
    })
    const activeSort = advanced.quickSort.direction ? advanced.quickSort : tableView.preferences.sort
    const { columnId, direction } = activeSort
    return sortProjects(base,columnId,direction || 'desc',projectRepresentative)
  }, [activeProjects, customerFilter, productFilter, search, statusFilter, approvedPipelineFilter, quote7dFilter, tableView.preferences.sort, advanced.filters, advanced.quickSort,contentSearch.index,projectRepresentative,projectSearch])

  const inStatusQuoteWindow=quoteWindow()
  const statusContextProjects = useMemo(() => activeProjects.filter(project => {
    const matchQuote7d=!quote7dFilter||(project.quotes||[]).some(q=>inStatusQuoteWindow(q.date))
    const matchProduct = productFilter === 'all' ? true : project.urunler.includes(productFilter)
    const matchCustomer = customerFilter === 'all' ? true : project.musteriAdi === customerFilter
    const matchSearch = projectSearch(project,contentSearch.index[project.projKodu],projectRepresentative(project))
    const f = advanced.filters
    const contains = (value:string, key:string) => !f[key] || value.toLocaleLowerCase('tr-TR').includes(f[key].toLocaleLowerCase('tr-TR'))
    const columnOk = contains(project.projKodu,'kod') && contains(project.projeAdi,'projeAdi') && contains(project.musteriAdi,'musteri') && contains(project.urunler.join(' '),'urunler') && contains(project.revizyon,'rev') && contains(project.musteriTemsilcisi,'temsilci') && contains(projectRepresentative(project),'cizen') && contains(project.teklifVeren,'teklif') && contains(project.uretimiAcan || '','uretim') && matchesSelectedDate(project.olusturmaTarihi,f.olusturmaDate) && matchesSelectedDate(project.sonIslemTarihi,f.sonDate)
    return matchQuote7d && matchProduct && matchCustomer && matchSearch && columnOk
  }), [activeProjects, customerFilter, productFilter, search, quote7dFilter, advanced.filters,contentSearch.index,projectRepresentative,projectSearch])

  const pageResult=paginateProjects(filtered,currentPage,DEFAULT_PROJECT_PAGE_SIZE)
  const totalPages=pageResult.pageCount
  const safePage=pageResult.page
  const pageStart=(safePage-1)*pageResult.pageSize
  const pageRows=pageResult.rows
  const pageContent=useProjectContentSearch(pageRows,!fullContent,true)
  const displayedRepresentative=(project:ProjectMaster)=>
    pageContent.index[project.projKodu]?.representative||projectRepresentative(project)
  const filteredIds = pageRows.map(project => project.id)
  const selectedProjects = activeProjects.filter(project => selected.has(project.id))
  const bulkHasForwardSkip = selectedProjects.some(project => projectTransitionPath(project.status,newStatus).length>1)
  const bulkHasBackward = selectedProjects.some(project => {
    const from=projectProgressIndex(project.status), to=projectProgressIndex(newStatus)
    return from>=0 && to>=0 && to<from
  })
  useEffect(()=>{setCurrentPage(1)},[search,statusFilter,approvedPipelineFilter,quote7dFilter,productFilter,customerFilter,advanced.filters,advanced.quickSort,tableView.preferences.sort])
  const canonicalColumns=tableView.visibleColumns.map(c=>({...c,label:listDefaults.columns.find(d=>d.id===c.id)?.label||c.label,width:listDefaults.columns.find(d=>d.id===c.id)?.width||c.width}))
  const naturalWidth=COL.cb+COL.islemler+canonicalColumns.reduce((sum,c)=>sum+(c.width||100),0)
  const fit=Math.min(1,Math.max(.82,(availableWidth-COL.cb-COL.islemler-2)/(naturalWidth-COL.cb-COL.islemler)))
  const visibleProjectColumns=canonicalColumns.map(c=>({...c,width:Math.floor((c.width||100)*fit)}))
  const hasPanelFilters = Boolean(statusFilter || approvedPipelineFilter || productFilter !== 'all' || customerFilter !== 'all' || advanced.activeCount || search)
  const clearAllFilters = () => { setSearch(''); setStatusFilter(defaultFilter==='arsiv'?'arsivlendi':null); setApprovedPipelineFilter(false); setQuote7dFilter(false); setProductFilter('all'); setCustomerFilter('all'); advanced.clearFilters() }

  const openExportModal = () => {
    if(!perms.can('project.export')) return
    setExportOpen(true)
    setFilterOpen(false)
  }
  const currentSort = advanced.quickSort.direction ? advanced.quickSort : tableView.preferences.sort
  // The export preview is only consumed by its open dialog and download action.
  const exportRows = useMemo(() => {
    if (!exportOpen) return []
    const rows = (exportScope === 'filtered' ? filtered : accessibleProjects).filter(project =>
      project.status === 'arsivlendi' ? exportIncludeArchived : exportIncludeActive)
    if (exportLayout !== 'current') return rows.sort((a,b) => parsePlmrDateTime(b.olusturmaTarihi) - parsePlmrDateTime(a.olusturmaTarihi))
    return exportScope === 'filtered' ? rows : sortProjects(rows, currentSort.columnId, currentSort.direction || 'desc', projectRepresentative)
  }, [exportOpen, exportScope, filtered, accessibleProjects, exportIncludeArchived, exportIncludeActive, exportLayout, currentSort, projectRepresentative])
  const defaultExportColumns = [...listDefaults.columns].sort((a,b)=>a.order-b.order).filter(column=>column.visible)
  const exportColumns = (exportLayout==='current' ? visibleProjectColumns : defaultExportColumns).map(column=>column.id as ProjectColumnId)
  const exportProjectCenter = () => {
    if(!perms.can('project.export') || (!exportIncludeActive && !exportIncludeArchived) || !exportColumns.length) return
    exportRowsToXlsx('PLMR_Proje_Merkezi.xlsx', 'Proje Merkezi',
      exportColumns.map(id=>PROJECT_EXPORT_HEADERS[id]),
      exportRows.map(project=>exportColumns.map(id=>projectExportValue(project,id,projectRepresentative(project))))
    )
    setExportOpen(false)
  }

  /* ── Keyboard shortcuts — scoped to the focused table ── */

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (actionMenuId!=null || filterOpen) { setActionMenuId(null); setFilterOpen(false); event.preventDefault(); return }
        if (selectedCount) { clearSelection(); event.preventDefault(); return }
        if (hasPanelFilters) { clearAllFilters(); event.preventDefault(); return }
      }
      if (!tableRef.current?.contains(document.activeElement)) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        selectAll(filteredIds)
        return
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault()
        tableScrollRef.current?.scrollBy({left:event.key==='ArrowLeft'?-180:180,behavior:'smooth'})
        return
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        if(!filteredIds.length)return
        event.preventDefault()
        const currentId=anchorId!=null&&filteredIds.includes(anchorId)?anchorId:(selected.size===1?Array.from(selected)[0]:null)
        const currentIndex=currentId==null?(event.key==='ArrowDown'?-1:filteredIds.length):filteredIds.indexOf(currentId)
        const nextIndex=Math.max(0,Math.min(filteredIds.length-1,currentIndex+(event.key==='ArrowDown'?1:-1)))
        selectOnly(filteredIds[nextIndex])
        return
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [clearSelection, filteredIds.join(','), selectAll, selectOnly, anchorId, selected, actionMenuId, filterOpen, selectedCount, hasPanelFilters])

  /* ── Status update ── */

  const statusRequest=useRef(false)
  const applyStatusUpdate = async (ids: number[], status: ProjectStatus) => {
    if(statusRequest.current)return
    setStatusError('')
    if(status==='iptal'&&!window.confirm(t('Seçilen projeler iptal edilsin mi?')))return
    if(status==='arsivlendi'&&!window.confirm(t('Seçilen projeler arşive taşınsın mı?')))return
    statusRequest.current=true
    try {
      await updateProjectStatus(ids, status, newStatusNote)
      clearSelection()
      setStatusModalId(null)
      setBulkStatusOpen(false)
      setNewStatusNote('')
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Durum güncellenemedi.')
    } finally { statusRequest.current=false }
  }

  const archiveProjects = async (ids: number[]) => {
    if(statusRequest.current)return
    const restore=defaultFilter==='arsiv'
    if(!window.confirm(t(restore?'Seçilen projeler arşivden geri taşınsın mı?':'Seçilen projeler arşive taşınsın mı?')))return
    statusRequest.current=true
    try {
      (restore?restoreArchivedProjects:archiveProjectRecords)(ids)
      await Promise.all(ids.map(awaitProjectMasterSave))
    } catch(error) { window.alert(t(error instanceof Error?error.message:'İşlem tamamlanamadı.')); return }
    finally{statusRequest.current=false}
    clearSelection()
    setActionMenuId(null)
  }

  const deleteProjects = (ids: number[]) => {
    if (!window.confirm(formatMessage("{count} proje Silinenler'e taşınsın mı? 15 gün boyunca geri yüklenebilir.",{count:ids.length}))) return
    try { softDeleteProjects(ids, currentUser.userId) } catch(error) { window.alert(t(error instanceof Error?error.message:'Proje Silinenler alanına taşınamadı.')); return }
    clearSelection()
    setActionMenuId(null)
  }

  /* ── Current modal target ── */
  const modalProject = statusModalId != null ? projects.find(p => p.id === statusModalId) : null

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#eef0f3' }}
      onClick={() => { setActionMenuId(null); setFilterOpen(false) }}
    >

      {/* ── Page header ── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #dde1e7',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: '#eff6ff', border: '1px solid #bfdbfe',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb',
        }}>
          <IDraft size={14} />
        </div>
        <h1 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0, letterSpacing: 0.1 }}>
          <Ui value={'Proje Merkezi'}/>
        </h1>
        <div style={{ flex: 1 }} />
        {perms.can('project.export') && <HeaderBtn icon={IDownload} label="Excel" onClick={e => { e.stopPropagation(); openExportModal() }} />}
        <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
          <HeaderBtn icon={IFilter} label={`Tablo Ayarları${hasPanelFilters ? ' ·' : ''}`} onClick={e => { e.stopPropagation(); setFilterOpen(v => !v) }} active={filterOpen || hasPanelFilters} />
          {filterOpen && (
            <TableViewPanel
              columns={tableView.orderedColumns.map(c=>({...c,label:listDefaults.columns.find(d=>d.id===c.id)?.label||c.label}))}
              sort={tableView.preferences.sort}
              sortOptions={PROJECT_SORT_OPTIONS}
              onColumnVisible={tableView.setColumnVisible}
              onMoveColumn={tableView.moveColumn}
              onReorderColumns={tableView.reorderColumns}
              onSort={tableView.setSort}
              onResetView={tableView.reset}
              onClose={() => setFilterOpen(false)}
              onExportExcel={perms.can('project.export') ? openExportModal : undefined}
              hasFilters={hasPanelFilters}
              onClearFilters={clearAllFilters}
              filterContent={(
                <div style={{ display: 'grid', gap: 6 }}>
                  <select value={statusFilter ?? 'all'} onChange={e => setStatusFilter(e.target.value === 'all' ? null : normalizeProjectStatus(e.target.value))} style={panelSelectStyle}>
                    <option value="all"><Ui value={"Tüm durumlar"}/></option>
                    {STATUS_ORDER.map(status => <option key={status} value={status}><Ui value={STATUS[status].label}/></option>)}
                  </select>
                  <select value={productFilter} onChange={e => setProductFilter(e.target.value)} style={panelSelectStyle}>
                    <option value="all"><Ui value={"Tüm ürünler"}/></option>
                    {productOptions.map(product => <option key={product} value={product}><Ui value={product}/></option>)}
                  </select>
                  <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} style={panelSelectStyle}>
                    <option value="all"><Ui value={"Tüm müşteriler"}/></option>
                    {customerOptions.map(customer => <option key={customer} value={customer}><Ui value={customer}/></option>)}
                  </select>
                </div>
              )}
            />
          )}
        </div>
        <HeaderBtn icon={IPlus} label={"Yeni Proje"} primary disabled={!(perms.can('project.create')||perms.can('commercial.quote.create'))} disabledTitle="Yeni proje oluşturma yetkiniz bulunmuyor." onClick={e => { e.stopPropagation(); onNewProject?.() }} />
        <HeaderBtn icon={IArchive} label="Arşiv" tone="orange" onClick={()=>onOpenArchive?.()}/>
        <HeaderBtn icon={ITrash} label="Silinenler" tone="red" disabled={!perms.can('project.archive')} disabledTitle="Silinen kayıtlara erişim yetkiniz bulunmuyor." onClick={()=>onOpenDeleted?.()}/>
      </div>

      {/* ── Status summary cards ── */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid #dde1e7',
        padding: '10px 20px',
        display: 'flex',
        gap: 8,
        flexShrink: 0,
        overflowX: 'auto',
      }}>
        {STATUS_ORDER.filter(s=>defaultFilter==='arsiv'?s==='arsivlendi':s!=='arsivlendi').map(s => {
          const cfg = STATUS[s]
          const count = statusContextProjects.filter(p => p.status === s).length
          const isActive = statusFilter === s
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(isActive ? null : s)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '7px 13px',
                borderRadius: 7,
                border: `1.5px solid ${isActive ? cfg.border : '#e5e7eb'}`,
                background: isActive ? cfg.bg : '#fff',
                cursor: 'pointer',
                minWidth: 100,
                transition: 'border-color 120ms, background 120ms',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? cfg.color : '#6b7280', letterSpacing: 0.3 }}>
                  <Ui value={cfg.label.toUpperCase()}/>
                </span>
              </div>
              <span style={{
                fontSize: 22, fontWeight: 700,
                color: isActive ? cfg.color : '#111827',
                fontFamily: 'var(--font-mono)',
                letterSpacing: -0.5,
                lineHeight: 1,
              }}>
                <Ui value={count}/>
              </span>
            </button>
          )
        })}
        {statusFilter && (
          <button
            onClick={() => setStatusFilter(null)}
            style={{
              alignSelf: 'center',
              padding: '4px 9px',
              borderRadius: 5,
              border: '1px solid #e5e7eb',
              background: 'transparent',
              color: '#6b7280',
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              flexShrink: 0,
            }}
          >
            <IX size={10} /> <Ui value={" Filtreyi Kaldır "}/></button>
        )}
      </div>

      {/* ── Search toolbar ── */}
      <div style={{
        padding: '10px 20px',
        background: '#eef0f3',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: '#fff', border: '1.5px solid #dde1e7',
          borderRadius: 6, padding: '6px 12px',
          flex: 1, minWidth:300, maxWidth: 760,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <ISearch size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label={t(defaultFilter==='arsiv'?'Arşivde proje ara':'Projelerde derin arama')} placeholder={t(defaultFilter==='arsiv'?'Proje ara… Kod, müşteri, ürün veya kullanıcı':'Proje ara… Proje bilgileri, notlar ve açıklamalar dahil')}
            style={{ flex: 1, minWidth:0, border: 'none', background: 'transparent', fontSize: 12.5, color: '#374151', outline: 'none' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={iconBtnReset}>
              <IX size={11} />
            </button>
          )}
        </div>
        <span style={{ fontSize: 11.5, color: '#9ca3af' }}>
          <Ui value={filtered.length}/> / <Ui value={activeProjects.length}/> <Ui value={" kayıt "}/></span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: '#9ca3af',maxWidth:250 }}>
          <Ui value={" Ctrl+A sayfayı seç · Ctrl+tıkla çoklu seç · Shift+tıkla aralık · Esc seçimi temizle "}/></span>
      </div>

      {search&&defaultFilter!=='arsiv'&&(contentSearch.loading||contentSearch.error)&&<div role="status" style={{padding:'0 20px 8px',fontSize:11,color:contentSearch.error?'#b91c1c':'#64748b'}}><Ui value={contentSearch.error||'Kayıtlı proje içerikleri aranıyor…'}/></div>}
      {/* ── Table area ── */}
      <div
        ref={tableRef}
        style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: '0 20px 0', outline: 'none' }}
        tabIndex={0}
        onMouseDownCapture={event => {
          const target = event.target as HTMLElement
          if (!target.closest('input,button,textarea,select')) tableRef.current?.focus({ preventScroll: true })
        }}
      >
        <div ref={tableScrollRef} style={{
          background: '#fff',
          border: '1px solid #dde1e7',
          borderRadius: '8px 8px 0 0',
          overflow: 'auto',
          flex: 1,
          position: 'relative',
        }}>
          <table style={{ tableLayout:'fixed',borderCollapse: 'collapse', minWidth: (COL.cb + COL.islemler + visibleProjectColumns.reduce((sum, column) => sum + (column.width ?? 100), 0)) + 'px', width: '100%' }}>
            <colgroup>
              <col style={{ width: COL.cb, minWidth: COL.cb }} />
              {visibleProjectColumns.map(column => <col key={column.id} style={{ width: column.width ?? 100, minWidth: column.width ?? 100 }} />)}
              <col style={{ width: COL.islemler, minWidth: COL.islemler }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#f8f9fb' }}>
                <Th sticky="left" left={0} style={{ width: COL.cb, padding: '0 0 0 12px' }}>
                  <input type="checkbox" checked={pageRows.length > 0 && pageRows.every(project => selected.has(project.id))} onChange={event => event.target.checked ? selectAll(filteredIds) : clearSelection()} style={{ cursor: 'pointer', accentColor: '#0d9488' }} />
                </Th>
                {visibleProjectColumns.map((column, index) => (
                  <Th key={column.id} sticky={index < 3 ? 'left' : undefined} left={index < 3 ? COL.cb + visibleProjectColumns.slice(0, index).reduce((sum, item) => sum + (item.width ?? 100), 0) : undefined} style={{ width: column.width ?? 100, ...(index === 2 ? { borderRight: '1px solid #e5e7eb' } : {}) }}>
                    <button onClick={() => advanced.cycleSort(column.id)} style={{border:0,background:'transparent',padding:0,color:'inherit',font:'inherit',fontWeight:'inherit',cursor:'pointer',textTransform:'inherit'}}><Ui value={column.label}/><Ui value={advanced.quickSort.columnId===column.id&&advanced.quickSort.direction ? (advanced.quickSort.direction==='asc'?' ↑':' ↓') : ''}/></button>
                  </Th>
                ))}
                <Th sticky="right" right={0} style={{ width: COL.islemler, borderLeft: '1px solid #e5e7eb', textAlign: 'center' }}><Ui value={"İşlemler"}/></Th>
              </tr>
              <tr style={{ background:'#fbfdff' }}>
                <Th sticky="left" left={0} style={{ width:COL.cb, padding:'2px 4px' }} />
                {visibleProjectColumns.map((column,index)=><Th key={`filter-${column.id}`} sticky={index<3?'left':undefined} left={index<3?COL.cb+visibleProjectColumns.slice(0,index).reduce((sum,item)=>sum+(item.width??100),0):undefined} style={{padding:'3px 4px',width:column.width??100}}>{column.id==='durum'?<DataGridFilterCell value={advanced.filters.durum||''} onChange={v=>advanced.setFilter('durum',v)} type="select" options={STATUS_ORDER.map(status=>({value:String(status),label:STATUS[status].label}))}/>:column.id==='olusturma'?<DataGridFilterCell value={advanced.filters.olusturmaDate||''} onChange={v=>advanced.setFilter('olusturmaDate',v)} type="date"/>:column.id==='son'?<DataGridFilterCell value={advanced.filters.sonDate||''} onChange={v=>advanced.setFilter('sonDate',v)} type="date"/>:column.id==='sira'?null:<DataGridFilterCell value={advanced.filters[column.id]||''} onChange={v=>advanced.setFilter(column.id,v)} />}</Th>)}
                <Th sticky="right" right={0} style={{width:COL.islemler,borderLeft:'1px solid #e5e7eb'}} />
              </tr>
            </thead>
            <tbody>
              {activeProjects.length===0 && undeletedProjects.length===0 && <tr><td colSpan={visibleProjectColumns.length + 2} style={{ padding:'48px 20px',textAlign:'center',color:'#64748b',fontSize:13 }}><div style={{fontWeight:700,color:'#334155',marginBottom:6}}><Ui value={"Henüz proje bulunmuyor."}/></div><div><Ui value={"İlk projenizi oluşturarak başlayabilirsiniz."}/></div>{(perms.can('project.create')||perms.can('commercial.quote.create'))&&<button onClick={()=>onNewProject?.()} style={{marginTop:12,padding:'6px 10px',border:'1px solid #0d9488',borderRadius:6,background:'#0d9488',color:'#fff',fontWeight:700,cursor:'pointer'}}><Ui value={'+ Yeni Proje'}/></button>}</td></tr>}
              {activeProjects.length===0 && undeletedProjects.length>0 && <tr><td colSpan={visibleProjectColumns.length + 2} style={{ padding:'48px 20px',textAlign:'center',color:'#64748b',fontSize:13 }}><div style={{fontWeight:700,color:'#334155',marginBottom:6}}><Ui value={"Görüntüleme yetkiniz bulunan proje yok."}/></div><div><Ui value={"Proje erişiminiz için yöneticinizle iletişime geçebilirsiniz."}/></div></td></tr>}
              {activeProjects.length>0 && filtered.length===0 && <tr><td colSpan={visibleProjectColumns.length + 2} style={{ padding:'48px 20px',textAlign:'center',color:'#64748b',fontSize:13 }}><div style={{fontWeight:700,color:'#334155',marginBottom:6}}><Ui value={"Bu filtrelere uygun proje bulunamadı."}/></div><button onClick={clearAllFilters} style={{marginTop:8,padding:'5px 9px',border:'1px solid #dbe3ea',borderRadius:6,background:'#fff',color:'#334155',cursor:'pointer'}}><Ui value={"Filtreleri Temizle"}/></button></td></tr>}
              {pageRows.map(project => {
                const isSelected = selected.has(project.id)
                const isMenuOpen = actionMenuId === project.id
                const isPopoverOpen = productPopoverId === project.id
                return (
                  <tr data-project-row={project.projKodu} key={project.id} onMouseDown={event => { if (event.shiftKey) event.preventDefault() }} onClick={event => handleRowClick(project.id, event, filteredIds)} onDoubleClick={() => onOpenProject?.(project.projKodu, project.musteriAdi, project.projectId)} style={{ background: isSelected ? '#f0fdfa' : 'transparent', cursor: 'pointer', transition: 'background 80ms', borderBottom: '1px solid #f3f4f6', userSelect: 'none' }} onMouseEnter={event => { if (!isSelected) event.currentTarget.style.background = '#f8fafc' }} onMouseLeave={event => { if (!isSelected) event.currentTarget.style.background = 'transparent' }}>
                    <Td sticky="left" left={0} selected={isSelected} style={{ padding: '0 0 0 12px', width: COL.cb }}><input type="checkbox" checked={isSelected} onChange={() => {}} onClick={event => handleCheckboxClick(project.id, event, filteredIds)} style={{ cursor: 'pointer', accentColor: '#0d9488' }} /></Td>
                    {visibleProjectColumns.map((column, index) => {
                      const stickyLeft = index < 3 ? COL.cb + visibleProjectColumns.slice(0, index).reduce((sum, item) => sum + (item.width ?? 100), 0) : undefined
                      const common = { key: column.id, sticky: index < 3 ? 'left' as const : undefined, left: stickyLeft, selected: isSelected, style: { width: column.width ?? 100, ...(index === 2 ? { borderRight: '1px solid #f3f4f6' } : {}) } }
                      switch (column.id as ProjectColumnId) {
                        case 'sira': return <Td {...common}><span style={{ fontSize: 11.5, color: '#9ca3af', fontFamily: 'var(--font-mono)' }}><Ui value={project.siraNo}/></span></Td>
                        case 'kod': return <Td {...common}><span style={{ fontSize: 12.5, fontWeight: 700, color: '#1d4ed8', fontFamily: 'var(--font-mono)', letterSpacing: 0.2 }}>{project.projKodu}</span></Td>
                        case 'projeAdi': return <Td {...common}><span style={{fontSize:12,color:'#334155'}}><Ui value={project.projeAdi}/></span></Td>
                        case 'musteri': return <Td {...common}><span style={{ fontSize: 12.5, fontWeight: 500, color: '#111827' }}>{project.musteriAdi}</span></Td>
                        case 'urunler': return <Td {...common}><ProductListHint products={project.urunler}/></Td>
                        case 'rev': return <Td {...common}><span style={{ fontSize: 10.5, color: '#6b7280', fontFamily: 'var(--font-mono)', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 4, padding: '1px 4px',whiteSpace:'nowrap' }}><Ui value={project.quoteRevision||'—'}/> / <Ui value={project.drawingRevision||project.revizyon}/></span></Td>
                        case 'temsilci': return <Td {...common}><UserChip name={project.musteriTemsilcisi} /></Td>
                        case 'cizen': return <Td {...common}><UserChip name={displayedRepresentative(project)} /></Td>
                        case 'teklif': return <Td {...common}><UserChip name={project.teklifVeren} /></Td>
                        case 'uretim': return <Td {...common}><Ui value={project.uretimiAcan ? <UserChip name={project.uretimiAcan} /> : <span style={{ color: '#d1d5db' }}>—</span>}/></Td>
                        case 'olusturma': return <Td {...common}><span style={{ fontSize: 11.2, color: '#6b7280', fontFamily: 'var(--font-mono)' }}><CompactProjectDate value={project.olusturmaTarihi}/></span></Td>
                        case 'son': return <Td {...common}><span style={{ fontSize: 11.5, color: '#374151', fontFamily: 'var(--font-mono)', fontWeight: 500 }}><CompactProjectDate value={project.sonIslemTarihi}/></span></Td>
                        case 'durum': return <Td {...common}><StatusBadge status={project.status} /></Td>
                        default: return null
                      }
                    })}
                    <td onClick={event => event.stopPropagation()} style={{ position: 'sticky', right: 0, background: isSelected ? '#f0fdfa' : '#fff', width: COL.islemler, padding: '8px 8px', verticalAlign: 'middle', borderLeft: '1px solid #f3f4f6', boxShadow: '-2px 0 4px rgba(0,0,0,0.04)', zIndex: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                        <button onClick={() => onOpenProject?.(project.projKodu, project.musteriAdi, project.projectId)} style={{ padding: '3px 9px', borderRadius: 5, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}><Ui value={"Aç"}/></button>
                        <div style={{ position: 'relative' }}><button onClick={event => { event.stopPropagation(); setActionMenuId(isMenuOpen ? null : project.id) }} style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e5e7eb', borderRadius: 5, background: isMenuOpen ? '#f3f4f6' : '#fff', cursor: 'pointer', color: '#6b7280' }}><IMore size={13} /></button>{isMenuOpen && <ActionMenu archived={project.status==='arsivlendi'} onCancel={project.status!=='arsivlendi'&&project.status!=='iptal'&&!project.approvals?.quote&&perms.can('project.status.change')?()=>{setStatusModalId(project.id);setNewStatus('iptal');setNewStatusNote('');setStatusError('');setActionMenuId(null)}:undefined} canStatus={perms.can('project.status.change')||perms.can('project.approve')||perms.can('operations.start_production')||perms.can('operations.mark_ready_to_ship')||perms.can('operations.mark_shipped')} canClone={perms.can('project.create')} canArchive={perms.can('project.archive')} onStatusUpdate={() => { setStatusModalId(project.id); setNewStatus(project.status); setNewStatusNote(''); setStatusError(''); setActionMenuId(null) }} onClone={() => { if(project.projectId) onCloneProject?.(project.projectId,project.projKodu); setActionMenuId(null) }} onArchive={() => archiveProjects([project.id])} onDelete={() => deleteProjects([project.id])} onClose={() => setActionMenuId(null)} />}</div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Table footer ── */}
        <div style={{
          background: '#f8f9fb',
          border: '1px solid #dde1e7',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          padding: '6px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11.5, color: '#9ca3af' }}>
            <Ui value={filtered.length?`${pageStart+1}–${Math.min(pageStart+pageResult.pageSize,filtered.length)} / ${filtered.length}`:'0'}/> <Ui value={" gösteriliyor · "}/><Ui value={activeProjects.length}/> <Ui value={" toplam "}/></span>
          <div style={{display:'flex',alignItems:'center',gap:5,marginLeft:10}}>
            <button disabled={safePage<=1} onClick={()=>setCurrentPage(p=>Math.max(1,p-1))} style={{...pageBtn,opacity:(safePage<=1 ? .45 : 1)}}><Ui value={"‹ Önceki"}/></button>
            <span style={{fontSize:10.5,color:'#64748b',minWidth:70,textAlign:'center'}}><Ui value={safePage}/> / <Ui value={totalPages}/></span>
            <button disabled={safePage>=totalPages} onClick={()=>setCurrentPage(p=>Math.min(totalPages,p+1))} style={{...pageBtn,opacity:(safePage>=totalPages ? .45 : 1)}}><Ui value={"Sonraki ›"}/></button>
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10.5, color: '#c5cad3', fontFamily: 'var(--font-mono)' }}>
            <Ui value={" ← → yatay kaydırma · ↑ ↓ satır · Çift tıkla → proje aç "}/></span>
        </div>
      </div>

      {/* ── Multi-select action bar ── */}
      {selectedCount > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0f1623',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 100,
          minWidth: 440,
        }}>
          <div style={{
            background: '#0d9488', color: '#fff',
            borderRadius: 5, padding: '2px 9px',
            fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)',
          }}>
            <Ui value={selectedCount}/>
          </div>
          <span style={{ fontSize: 12.5, color: '#c9d1dc' }}>
            <Ui value={" proje seçildi "}/></span>
          <div style={{ flex: 1 }} />
          <BulkBtn
            icon={IRefresh}
            label="Durumu Güncelle"
            disabled={!(perms.can('project.status.change')||perms.can('project.approve')||perms.can('operations.start_production')||perms.can('operations.mark_ready_to_ship')||perms.can('operations.mark_shipped'))}
            disabledTitle="Seçili projelerin durumunu güncelleme yetkiniz bulunmuyor."
            onClick={() => { setNewStatus(20); setNewStatusNote(''); setStatusError(''); setBulkStatusOpen(true) }}
          />
          <BulkBtn
            icon={IArchive}
            label={defaultFilter==='arsiv'?'Geri Taşı':'Arşivle'}
            disabled={!perms.can('project.archive')}
            disabledTitle="Seçili projeleri arşivleme yetkiniz bulunmuyor."
            onClick={() => archiveProjects(Array.from(selected))}
          />
          <BulkBtn
            icon={ITrash}
            label="Silinenlere Taşı"
            danger
            disabled={!perms.can('project.archive')}
            disabledTitle="Seçili projeleri Silinenler alanına taşıma yetkiniz bulunmuyor."
            onClick={() => deleteProjects(Array.from(selected))}
          />
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <button
            onClick={clearSelection}
            style={{
              padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer',
            }}
          >
            <Ui value={" Seçimi Temizle "}/></button>
        </div>
      )}

      {exportOpen && (
        <Modal onClose={() => setExportOpen(false)} width={560}>
          <div style={{padding:'18px 20px',width:'100%',boxSizing:'border-box'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#111827',marginBottom:4}}><Ui value={"Excel'e Aktar"}/></div>
            <div style={{fontSize:11.5,color:'#6b7280',marginBottom:16}}><Ui value={"Kayıt kaynağını, kapsamı ve Excel düzenini seçin."}/></div>

            <ExportSection title={t("Kayıt Kaynağı")}>
              <ExportCheck checked={exportIncludeActive} onChange={setExportIncludeActive} label="Aktif Projeler" />
              <ExportCheck checked={exportIncludeArchived} onChange={setExportIncludeArchived} label="Arşivlenen Projeler" />
            </ExportSection>

            <ExportSection title={t("Kayıt Kapsamı")}>
              <ExportRadio checked={exportScope==='all'} onChange={()=>setExportScope('all')} label="Tüm Kayıtlar" description="Seçilen kaynaklardaki tüm erişilebilir kayıtları aktarır." />
              <ExportRadio checked={exportScope==='filtered'} onChange={()=>setExportScope('filtered')} label="Mevcut Filtre Sonuçları" description="Arama, durum, ürün, müşteri, tarih ve kolon filtreleriyle daralttığınız sonuçların tamamını aktarır." />
            </ExportSection>

            <ExportSection title={t("Excel Düzeni")}>
              <ExportRadio checked={exportLayout==='current'} onChange={()=>setExportLayout('current')} label="Mevcut Görünüm" description="Ekranda açık olan sütunları, sütun sırasını ve mevcut sıralamayı kullanır." />
              <ExportRadio checked={exportLayout==='default'} onChange={()=>setExportLayout('default')} label="Varsayılan Düzen" description="PLMR'nin standart Excel sütunlarını ve varsayılan sıralamasını kullanır." />
            </ExportSection>

            <div style={{marginTop:14,padding:'9px 10px',border:'1px solid #dbe3ea',borderRadius:6,background:'#f8fafc',fontSize:11.5,color:'#475569'}}>
              <strong style={{color:'#0f172a'}}><Ui value={exportRows.length}/></strong> <Ui value={" kayıt · "}/><strong style={{color:'#0f172a'}}><Ui value={exportColumns.length}/></strong> <Ui value={" sütun Excel'e aktarılacak. "}/>{!exportIncludeActive&&!exportIncludeArchived&&<div style={{marginTop:4,color:'#b91c1c'}}><Ui value={"En az bir kayıt kaynağı seçin."}/></div>}
              {exportColumns.length===0&&<div style={{marginTop:4,color:'#b91c1c'}}><Ui value={"Mevcut görünümde en az bir sütun açık olmalıdır."}/></div>}
            </div>

            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:18}}>
              <button onClick={()=>setExportOpen(false)} style={modalCancelStyle}><Ui value={"Vazgeç"}/></button>
              <button onClick={exportProjectCenter} disabled={(!exportIncludeActive&&!exportIncludeArchived)||exportColumns.length===0} style={{...modalPrimaryStyle,opacity:((!exportIncludeActive&&!exportIncludeArchived)||exportColumns.length===0)?.5:1,cursor:((!exportIncludeActive&&!exportIncludeArchived)||exportColumns.length===0)?'not-allowed':'pointer'}}><Ui value={"Excel Oluştur"}/></button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Single status update modal ── */}
      {statusModalId !== null && modalProject && (
        <Modal onClose={() => setStatusModalId(null)}>
          <div style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}><Ui value={"Durum Güncelle"}/></div>
            <div style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 16, fontFamily: 'var(--font-mono)' }}>{modalProject.projKodu} · {modalProject.musteriAdi}</div>

            <ModalRow label="Mevcut Durum">
              <StatusBadge status={modalProject.status} />
            </ModalRow>

            <ModalRow label="Yeni Durum">
              <StatusSelect value={newStatus} onChange={setNewStatus} />
            </ModalRow>

            <ModalRow label="Açıklama (zorunlu)">
              <textarea
                value={newStatusNote}
                onChange={e => setNewStatusNote(e.target.value)}
                placeholder={t("Örn. Müşteri teyidi alındı / geçmiş kayıt güncellemesi...")}
                rows={2}
                style={{
                  width: '100%', resize: 'none', border: '1px solid #dde1e7',
                  borderRadius: 6, padding: '6px 9px', fontSize: 12.5,
                  color: '#374151', outline: 'none', fontFamily: 'inherit',
                  background: '#f8f9fb',
                }}
              />
            </ModalRow>

            {statusError && <div style={{marginTop:10,padding:'8px 10px',border:'1px solid #fecaca',borderRadius:6,background:'#fef2f2',color:'#991b1b',fontSize:11.5,lineHeight:1.45}}><strong><Ui value={"İşlem yapılamadı."}/></strong><div><Ui value={statusError}/></div></div>}
            {!statusError && newStatusNote.trim() && statusModalId!==null && modalProject && projectTransitionPath(modalProject.status,newStatus).length>1 && <div style={{marginTop:10,padding:'8px 10px',border:'1px solid #fde68a',borderRadius:6,background:'#fffbeb',color:'#92400e',fontSize:11.2,lineHeight:1.45}}><Ui value={"Ara aşamalar aynı işlem zamanı ile kaydedilecek: "}/><strong>{projectTransitionPath(modalProject.status,newStatus).map(s=>t(STATUS[s].label)).join(' → ')}</strong></div>}
            {!statusError && modalProject && projectProgressIndex(newStatus)>=0 && projectProgressIndex(modalProject.status)>=0 && projectProgressIndex(newStatus)<projectProgressIndex(modalProject.status) && <div style={{marginTop:10,padding:'8px 10px',border:'1px solid #fde68a',borderRadius:6,background:'#fffbeb',color:'#92400e',fontSize:11.2,lineHeight:1.45}}><Ui value={modalProject.approvals?.quote?"Proje seçilen aşamaya çekilir. Sonraki aşamaların aktif onayları kaldırılır, kayıtlı belgeler geçmişte korunur.":"Proje seçilen aşamaya çekilir. Üretim ve durum geçmişi korunur."}/></div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setStatusModalId(null)} style={modalCancelStyle}><Ui value={"İptal"}/></button>
              <button
                onClick={() => applyStatusUpdate([statusModalId], newStatus)}
                disabled={!newStatusNote.trim()}
                style={{...modalPrimaryStyle,opacity:newStatusNote.trim()?1:.5,cursor:newStatusNote.trim()?'pointer':'not-allowed'}}
              >
                <Ui value={" Güncelle "}/></button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Bulk status update modal ── */}
      {bulkStatusOpen && (
        <Modal onClose={() => setBulkStatusOpen(false)}>
          <div style={{ padding: '20px 22px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}><Ui value={"Toplu Durum Güncelle"}/></div>
            <div style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 16 }}>
              <Ui value={" Seçilen "}/><strong style={{ color: '#0d9488' }}><Ui value={selectedCount}/> <Ui value={" proje"}/></strong> <Ui value={" için yeni durum: "}/></div>

            <ModalRow label="Yeni Durum">
              <StatusSelect value={newStatus} onChange={setNewStatus} />
            </ModalRow>

            <ModalRow label="Açıklama (zorunlu)">
              <textarea
                value={newStatusNote}
                onChange={e => setNewStatusNote(e.target.value)}
                placeholder={t("Seçilen projeler için ortak durum değişikliği nedeni...")}
                rows={2}
                style={{
                  width: '100%', resize: 'none', border: '1px solid #dde1e7',
                  borderRadius: 6, padding: '6px 9px', fontSize: 12.5,
                  color: '#374151', outline: 'none', fontFamily: 'inherit',
                  background: '#f8f9fb',
                }}
              />
            </ModalRow>

            {statusError && <div style={{marginTop:10,padding:'8px 10px',border:'1px solid #fecaca',borderRadius:6,background:'#fef2f2',color:'#991b1b',fontSize:11.5,lineHeight:1.45}}><strong><Ui value={"İşlem yapılamadı."}/></strong><div><Ui value={statusError}/></div></div>}
            {!statusError && bulkHasForwardSkip && <div style={{marginTop:10,padding:'8px 10px',border:'1px solid #fde68a',borderRadius:6,background:'#fffbeb',color:'#92400e',fontSize:11.2,lineHeight:1.45}}><Ui value={"Seçimde ileri aşama atlayan projeler var. Her proje için atlanan ara aşamalar aynı işlem zamanı ile "}/><strong><Ui value={"manuel geçiş"}/></strong> <Ui value={" olarak ayrı ayrı loglanacaktır."}/></div>}
            {!statusError && bulkHasBackward && <div style={{marginTop:10,padding:'8px 10px',border:'1px solid #fde68a',borderRadius:6,background:'#fffbeb',color:'#92400e',fontSize:11.2,lineHeight:1.45}}><Ui value={"Seçimde geri durum geçişleri var. Mevcut üretim kalemi ve milestone geçmişi silinmez; yalnız ilgili proje durumları manuel olarak geri alınır."}/></div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setBulkStatusOpen(false)} style={modalCancelStyle}><Ui value={"İptal"}/></button>
              <button
                onClick={() => applyStatusUpdate(Array.from(selected), newStatus)}
                disabled={!newStatusNote.trim()}
                style={{...modalPrimaryStyle,opacity:newStatusNote.trim()?1:.5,cursor:newStatusNote.trim()?'pointer':'not-allowed'}}
              >
                <Ui value={selectedCount}/> <Ui value={" Projeyi Güncelle "}/></button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function Th({ children, sticky, left, right, style }: {
  children?: React.ReactNode; sticky?: 'left' | 'right'
  left?: number; right?: number; style?: React.CSSProperties
}) {
  return (
    <th style={{
      padding: '9px 10px',
      fontSize: 10.5,
      fontWeight: 700,
      color: '#6b7280',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      whiteSpace: 'normal',
      textAlign: 'left',
      userSelect: 'none',
      borderBottom: '1.5px solid #e5e7eb',
      ...(sticky ? {
        position: 'sticky',
        [sticky === 'left' ? 'left' : 'right']: sticky === 'left' ? left : right,
        zIndex: 20,
        background: '#f8f9fb',
        boxShadow: sticky === 'left' ? '2px 0 4px rgba(0,0,0,0.04)' : '-2px 0 4px rgba(0,0,0,0.04)',
      } : {}),
      ...style,
    }}>
      {children}
    </th>
  )
}

function Td({ children, sticky, left, right, selected, style }: {
  children?: React.ReactNode; sticky?: 'left' | 'right'
  left?: number; right?: number; selected?: boolean; style?: React.CSSProperties
}) {
  return (
    <td style={{
      padding: '7px 6px',overflow:'hidden',overflowWrap:'anywhere',
      verticalAlign: 'middle',
      ...(sticky ? {
        position: 'sticky',
        [sticky === 'left' ? 'left' : 'right']: sticky === 'left' ? left : right,
        zIndex: 10,
        background: selected ? '#f0fdfa' : '#fff',
        boxShadow: sticky === 'left' ? '2px 0 4px rgba(0,0,0,0.04)' : '-2px 0 4px rgba(0,0,0,0.04)',
      } : {}),
      ...style,
    }}>
      {children}
    </td>
  )
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const s = STATUS[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,boxSizing:'border-box',width:'100%',
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: 5, padding: '3px',
      fontSize: 9.5, fontWeight: 600, whiteSpace:'normal',maxWidth:'100%',overflowWrap:'normal',wordBreak:'normal',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      <span style={{minWidth:0,overflowWrap:'anywhere'}}><Ui value={s.label}/></span>
    </span>
  )
}

function StatusSelect({ value, onChange }: { value: ProjectStatus; onChange: (s: ProjectStatus) => void }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <select
        value={value}
        onChange={e => onChange(normalizeProjectStatus(e.target.value))}
        style={{
          padding: '6px 30px 6px 10px',
          borderRadius: 6, border: '1.5px solid #dde1e7',
          background: '#fff', color: '#111827',
          fontSize: 12.5, cursor: 'pointer',
          appearance: 'none', outline: 'none',
          fontFamily: 'inherit',
        }}
      >
        {STATUS_ORDER.map(s => (
          <option key={s} value={s}><Ui value={STATUS[s].label}/></option>
        ))}
      </select>
      <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#9ca3af' }}>
        <IChevD size={12} />
      </span>
    </div>
  )
}

function UserChip({ name }: { name: string }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const colors = ['#2563eb','#0d9488','#7c3aed','#d97706','#dc2626']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div title={name} style={{ display: 'flex', alignItems: 'center', gap: 4,minWidth:0 }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: color + '18', border: `1px solid ${color}40`,
        color: color, fontSize: 9, fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, letterSpacing: 0.3,
      }}><Ui value={initials}/></div>
      <span style={{ fontSize: 12, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90,minWidth:0 }}><Ui value={name.split(' ')[0]}/></span>
    </div>
  )
}

function ExportSection({title,children}:{title:string;children:React.ReactNode}){
  return <div style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:700,color:'#94a3b8',letterSpacing:.55,textTransform:'uppercase',marginBottom:7}}><Ui value={title}/></div><div style={{display:'grid',gap:6}}>{children}</div></div>
}
function ExportCheck({checked,onChange,label}:{checked:boolean;onChange:(value:boolean)=>void;label:string}){
  return <label style={{display:'flex',alignItems:'center',gap:8,minHeight:30,padding:'5px 8px',border:'1px solid #edf0f3',borderRadius:6,background:'#fff',cursor:'pointer'}}><input type="checkbox" checked={checked} onChange={event=>onChange(event.target.checked)} style={{accentColor:'#0d9488'}}/><span style={{fontSize:12,color:'#334155',fontWeight:600}}><Ui value={label}/></span></label>
}
function ExportRadio({checked,onChange,label,description}:{checked:boolean;onChange:()=>void;label:string;description:string}){
  return <label style={{display:'grid',gridTemplateColumns:'18px 1fr',columnGap:7,rowGap:1,padding:'7px 8px',border:'1px solid '+(checked?'#99f6e4':'#edf0f3'),borderRadius:6,background:checked?'#f0fdfa':'#fff',cursor:'pointer'}}><input type="radio" checked={checked} onChange={onChange} style={{accentColor:'#0d9488',marginTop:2}}/><span style={{fontSize:12,color:'#334155',fontWeight:600}}><Ui value={label}/></span><span style={{gridColumn:'2',fontSize:10.5,color:'#64748b',lineHeight:1.35}}><Ui value={description}/></span></label>
}

function ActionMenu({ onStatusUpdate, onClone, onArchive, onDelete, canStatus, canClone, canArchive, archived, onCancel }: { onStatusUpdate: () => void; onClone:()=>void; onArchive: () => void; onDelete: () => void; onClose: () => void; canStatus:boolean; canClone:boolean; canArchive:boolean;archived:boolean;onCancel?:()=>void }) {
  const items = [
    { icon: IRefresh,  label: 'Durumu Güncelle', action: onStatusUpdate, allowed:canStatus, blocked:'Proje durumunu güncelleme yetkiniz bulunmuyor.' },
    { icon: ICopy,     label: 'Kopyasını Oluştur', action: onClone, allowed:canClone, blocked:'Yeni proje oluşturma yetkiniz bulunmuyor.' },
    { icon: IArchive,  label: archived?'Geri Taşı':'Arşivle', action: onArchive, separatorBefore: true, allowed:canArchive, blocked:'Projeyi arşivleme yetkiniz bulunmuyor.' },
    ...(onCancel?[{icon:ITrash,label:'Projeyi İptal Et',action:onCancel,danger:true,allowed:true,blocked:''}]:[]),
    { icon: ITrash,    label: 'Silinenlere Taşı', action: onDelete, danger: true, allowed:canArchive, blocked:'Projeyi Silinenler alanına taşıma yetkiniz bulunmuyor.' },
  ]
  return (
    <div onClick={e => e.stopPropagation()} style={{position:'absolute',right:0,top:'100%',marginTop:3,background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,0.12)',zIndex:300,minWidth:220,overflow:'hidden',padding:'4px 0'}}>
      {items.map(item => { const Icon=item.icon; return <div key={item.label}><Ui value={item.separatorBefore&&<div style={{height:1,background:'#f3f4f6',margin:'3px 0'}}/>}/><button title={!item.allowed?item.blocked:undefined} onClick={item.allowed?item.action:undefined} style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'7px 14px',border:'none',background:'transparent',cursor:item.allowed?'pointer':'not-allowed',fontSize:12.5,color:item.allowed?(item.danger?'#dc2626':'#374151'):'#94a3b8',textAlign:'left',transition:'background 80ms',opacity:item.allowed?1:.72}} onMouseEnter={e=>{if(item.allowed)(e.currentTarget as HTMLElement).style.background='#f8fafc'}} onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}><Icon size={13} style={{flexShrink:0}}/><Ui value={item.label}/><Ui value={!item.allowed&&<span style={{marginLeft:'auto',fontSize:10}}>🔒</span>}/></button></div>})}
    </div>
  )
}

function HeaderBtn({
  icon: Icon, label, primary, onClick, active, disabled=false, disabledTitle, tone,
}: {
  icon: React.ComponentType<P>; label: string
  tone?: 'orange'|'red'; primary?: boolean; onClick?: (e: React.MouseEvent) => void; active?: boolean; disabled?:boolean; disabledTitle?:string
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={disabled?undefined:onClick}
      title={disabled?disabledTitle:undefined}
      onMouseEnter={() => !disabled&&setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 6,
        border: tone ? '1px solid '+(tone==='orange'?'#d97706':'#dc2626') : primary ? 'none' : active ? '1.5px solid #0d9488' : '1px solid #dde1e7',
        background: tone ? (tone==='orange'?(hov?'#b45309':'#d97706'):(hov?'#b91c1c':'#dc2626')) : primary ? (hov ? '#0b8076' : '#0d9488') : active ? '#f0fdfa' : hov ? '#f8f9fb' : '#fff',
        color: tone||primary ? '#fff' : active ? '#0d9488' : '#374151',
        fontSize: 12.5, fontWeight: primary ? 600 : 500,
        cursor: disabled?'not-allowed':'pointer', whiteSpace: 'nowrap', opacity: disabled ? .55 : 1,
        transition: 'background 100ms',
        boxShadow: primary ? '0 1px 4px rgba(13,148,136,0.2)' : 'none',
      }}
    >
      <Icon size={13} />
      <Ui value={label}/>
    </button>
  )
}

function BulkBtn({
  icon: Icon, label, onClick, disabled, disabledTitle, danger,
}: {
  icon: React.ComponentType<P>; label: string
  onClick?: () => void; disabled?: boolean; disabledTitle?: string; danger?: boolean
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={disabled ? disabledTitle : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '5px 11px', borderRadius: 6,
        border: `1px solid ${danger ? 'rgba(220,38,38,0.3)' : 'rgba(255,255,255,0.14)'}`,
        background: danger ? 'rgba(220,38,38,0.15)' : 'rgba(255,255,255,0.08)',
        color: disabled ? '#4b5563' : danger ? '#fca5a5' : '#e2e8f0',
        fontSize: 12, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        whiteSpace: 'normal',
        transition: 'background 100ms',
      }}
    >
      <Icon size={12} />
      <Ui value={label}/>
      <Ui value={disabled && <ILock size={10} style={{ marginLeft: 2, color: '#4b5563' }} />}/>
    </button>
  )
}

function Modal({ children, onClose, width=400 }: { children: React.ReactNode; onClose: () => void; width?: number }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 10, width, maxWidth: 'calc(100vw - 36px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          border: '1px solid #e5e7eb',
        }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function ModalRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 5, letterSpacing: 0.3, textTransform: 'uppercase' }}><Ui value={label}/></div>
      {children}
    </div>
  )
}

const pageBtn:React.CSSProperties={height:24,padding:'0 8px',border:'1px solid #dbe3ea',borderRadius:5,background:'#fff',color:'#475569',fontSize:10.5,cursor:'pointer'}

const panelSelectStyle: React.CSSProperties = { width: '100%', height: 32, border: '1px solid #dde1e7', borderRadius: 6, background: '#fff', color: '#374151', fontSize: 11.5, padding: '0 8px', outline: 'none' }

const iconBtnReset: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#9ca3af', padding: 2, display: 'flex', alignItems: 'center',
}

const modalCancelStyle: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 6,
  border: '1px solid #dde1e7', background: '#fff',
  color: '#374151', fontSize: 13, cursor: 'pointer',
}

const modalPrimaryStyle: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 6,
  border: 'none', background: '#0d9488',
  color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
}

function CompactProjectDate({value}:{value:string}){value=formatDateTime(value);const m=value.match(/^(.*?)(?:[ T]+)(\d{1,2}:\d{2})(?::\d{2})?$/);return <span style={{display:'inline-flex',flexDirection:'column',gap:2,fontSize:10.5}}><span><Ui value={m?m[1]:value}/></span>{m&&<small style={{color:'#94a3b8',fontSize:9.5}}><Ui value={m[2]}/></small>}</span>}
