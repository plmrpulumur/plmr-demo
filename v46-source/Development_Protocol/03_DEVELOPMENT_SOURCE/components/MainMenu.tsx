import {Ui,t} from '../i18n/react'
import RoleDashboard from './RoleDashboard'
import {tenantStorage as localStorage,tenantSessionStorage as sessionStorage} from '../services/platformAccess'
import BrandWelcome from './BrandWelcome'
import LiveWorkflowCharts from './LiveWorkflowCharts'
import {useProjectContentSearch} from '../hooks/useProjectContentSearch'
import {createProjectSearch} from '../services/projectSearch'
import {recentProjectQuotes} from '../domain/recentQuotes'
import { useState, useRef, useEffect, useMemo } from 'react'
import UserMentionPicker from './UserMentionPicker'
import { useTaskReminderStore } from '../state/TaskReminderStore'
import { useNotificationStore } from '../state/NotificationStore'
import type { User } from '../domain/user'
import { useUserDirectory } from '../state/UserDirectoryStore'
import { usePermissionResolver } from '../state/PermissionContext'
import { useCompanySettings } from '../state/CompanySettingsStore'
import { useProjectStore } from '../state/ProjectStore'
import { useCustomerStore } from '../state/CustomerStore'
import { useCommerceStore } from '../state/CommerceStore'
import { useAttachmentStore } from '../state/AttachmentStore'
import { useCloudLibraryStore } from '../state/CloudLibraryStore'
import type { Reminder, Task, TaskStatus } from '../domain/taskReminder'
import { formatDateTime, formatLongDate, formatNumber } from '../utils/formatters'

type SvgProps = { size?: number; className?: string; style?: React.CSSProperties }
const Svg = ({ size = 16, className = '', style, children }: SvgProps & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
    className={className} style={style} aria-hidden>{children}</svg>
)
const ISearch  = (p: SvgProps) => <Svg {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Svg>
const IX       = (p: SvgProps) => <Svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Svg>
const IDraft   = (p: SvgProps) => <Svg {...p}><path d="M2 20h20"/><path d="M5 20V8l7-6 7 6v12"/><rect x="9" y="12" width="6" height="8" rx="1"/></Svg>
const IDoc     = (p: SvgProps) => <Svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/></Svg>
const IUsers   = (p: SvgProps) => <Svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></Svg>
const ICheck   = (p: SvgProps) => <Svg {...p}><polyline points="20 6 9 17 4 12"/></Svg>
const IPin     = (p: SvgProps) => <Svg {...p}><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/></Svg>
const IPlus    = (p: SvgProps) => <Svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></Svg>
const IChevD   = (p: SvgProps) => <Svg {...p}><polyline points="6 9 12 15 18 9"/></Svg>
const IChevR   = (p: SvgProps) => <Svg {...p}><polyline points="9 18 15 12 9 6"/></Svg>
const IUser    = (p: SvgProps) => <Svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Svg>
const ITrash   = (p: SvgProps) => <Svg {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></Svg>
const IClock   = (p: SvgProps) => <Svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Svg>
const IBell    = (p: SvgProps) => <Svg {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></Svg>
const IMore    = (p: SvgProps) => <Svg {...p}><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></Svg>
const IEdit2   = (p: SvgProps) => <Svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></Svg>
const IEye     = (p: SvgProps) => <Svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></Svg>
const IEyeOff  = (p: SvgProps) => <Svg {...p}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></Svg>
const IPackage = (p: SvgProps) => <Svg {...p}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></Svg>

/* ─── Types ──────────────────────────────────────────────────────────────── */

type SystemTab = 'gunluk' | 'haftalik' | 'aylik' | 'hatirlatici' | 'atanan-isler'
type TabId = SystemTab | string

interface NoteTab {
  id: TabId
  label: string
  system: boolean
  icon?: React.ComponentType<SvgProps>
}

interface Note {
  id: string
  text: string
  done: boolean
  pinned: boolean
  tab: TabId
  createdAt: string
}


/* ─── Seed data ──────────────────────────────────────────────────────────── */

const SEED_NOTES: Note[] = [
  { id: 'n1', text: 'Makrosky sunumunu kontrol et',          done: false, pinned: true,  tab: 'gunluk',   createdAt: '09:15' },
  { id: 'n2', text: 'Giyotin üretim formunu gözden geçir',  done: false, pinned: true,  tab: 'gunluk',   createdAt: '09:20' },
  { id: 'n3', text: 'Profil fiyatlarını sisteme gir',        done: false, pinned: false, tab: 'gunluk',   createdAt: '10:00' },
  { id: 'n4', text: 'Cam siparişini hazırla ve onayla',      done: false, pinned: false, tab: 'gunluk',   createdAt: '10:30' },
  { id: 'n5', text: 'Aksesuar stok kontrolü yap',            done: false, pinned: false, tab: 'gunluk',   createdAt: '11:00' },
  { id: 'n6', text: 'Proje PDF\'ini Koçak İnşaat\'a gönder', done: true,  pinned: false, tab: 'gunluk',   createdAt: '08:45' },
  { id: 'n7', text: 'Mertaş teklif revizyonunu tamamla',    done: true,  pinned: false, tab: 'gunluk',   createdAt: '08:00' },
  { id: 'n8', text: 'Haftalık üretim planını gözden geçir', done: false, pinned: true,  tab: 'haftalik', createdAt: 'Pzt' },
  { id: 'n9', text: 'Müşteri ziyaret raporlarını topla',    done: false, pinned: false, tab: 'haftalik', createdAt: 'Sal' },
  { id: 'n10',text: 'Aylık sipariş özeti hazırla',          done: false, pinned: false, tab: 'aylik',    createdAt: 'Eki' },
]


const SYSTEM_TABS: NoteTab[] = [
  { id: 'gunluk',       label: 'Günlük',          system: true },
  { id: 'haftalik',     label: 'Haftalık',         system: true },
  { id: 'aylik',        label: 'Aylık',            system: true },
  { id: 'hatirlatici',  label: 'Hatırlatıcı',      system: true, icon: IBell   },
  { id: 'atanan-isler', label: 'Atanan İşler',     system: true, icon: IUsers  },
]

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function MainMenu({ onOpenModule, onOpenProject }: { onOpenModule?: (id:string)=>void; onOpenProject?: (code:string, customer:string, projectId?:string)=>void }) {
  const [searchValue, setSearchValue] = useState('')
  const [activeTab, setActiveTab]     = useState<TabId>('gunluk')
  const [userTabs, setUserTabs]       = useState<NoteTab[]>([])
  const [notes, setNotes]             = useState<Note[]>([])
  const taskReminder = useTaskReminderStore()
  const currentReminders = taskReminder.remindersForUser()
  const currentTasks = taskReminder.tasksForUser()
  const [newNoteText, setNewNoteText] = useState('')
  const [selectMode, setSelectMode]   = useState(false)
  const [selected, setSelected]       = useState<Set<string>>(new Set())
  const [completedOpen, setCompletedOpen] = useState(true)
  const [notesHidden, setNotesHidden]     = useState(false)
  const [addingTab, setAddingTab]         = useState(false)
  const [newTabName, setNewTabName]       = useState('')
  const [editingTabId, setEditingTabId]   = useState<string | null>(null)
  const [editingTabName, setEditingTabName] = useState('')
  const [multiDeleteConfirm, setMultiDeleteConfirm] = useState(false)
  const [newReminder, setNewReminder]     = useState(false)
  const newNoteRef = useRef<HTMLInputElement>(null)
  const noteCounter = useRef(200)

  const allTabs: NoteTab[] = [...SYSTEM_TABS, ...userTabs]

  const tabNotes = notes.filter(n => n.tab === activeTab)
  const pinnedActive = tabNotes.filter(n => n.pinned && !n.done)
  const active       = tabNotes.filter(n => !n.pinned && !n.done)
  const completed    = tabNotes.filter(n => n.done)

  const toggleDone = (id: string) => setNotes(prev => prev.map(n => n.id === id ? { ...n, done: !n.done, pinned: n.done ? n.pinned : false } : n))
  const togglePin  = (id: string) => setNotes(prev => prev.map(n => n.id === id ? { ...n, pinned: !n.pinned } : n))

  const addNote = () => {
    const text = newNoteText.trim()
    if (!text) return
    noteCounter.current++
    setNotes(prev => [{ id: `n${noteCounter.current}`, text, done: false, pinned: false, tab: activeTab, createdAt: new Date().toLocaleTimeString('tr', { hour: '2-digit', minute: '2-digit' }) }, ...prev])
    setNewNoteText('')
    newNoteRef.current?.focus()
  }

  const toggleSelect  = (id: string) => setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  const exitSelectMode = () => { setSelectMode(false); setSelected(new Set()); setMultiDeleteConfirm(false) }
  const deleteSelected = () => { setNotes(prev => prev.filter(n => !selected.has(n.id))); exitSelectMode() }

  const addUserTab = () => {
    const label = newTabName.trim()
    if (!label) return
    const id = `user-${Date.now()}`
    setUserTabs(prev => [...prev, { id, label, system: false }])
    setNewTabName('')
    setAddingTab(false)
    setActiveTab(id)
  }

  const renameTab = (id: string) => {
    const newLabel = editingTabName.trim()
    if (!newLabel) return
    setUserTabs(prev => prev.map(t => t.id === id ? { ...t, label: newLabel } : t))
    setEditingTabId(null)
  }

  const deleteTab = (id: string) => {
    setUserTabs(prev => prev.filter(t => t.id !== id))
    setNotes(prev => prev.filter(n => n.tab !== id))
    if (activeTab === id) setActiveTab('gunluk')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', background: '#eef0f3' }}>
      <div style={{ flex: 1, padding: '20px 24px 32px', minWidth: 720, display: 'flex', flexDirection: 'column', gap: 20 }}>

        <OperationalDashboard onOpenModule={onOpenModule} onOpenProject={onOpenProject}>

        {/* Personal notes */}
        <section data-personal-notes style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <SectionLabel style={{ margin: 0 }}><Ui value={"Kişisel Notlarım"}/></SectionLabel>
            <div style={{ flex: 1 }} />
            {/* Toggle hide/show */}
            <button onClick={() => setNotesHidden(v => !v)} style={ghostBtnStyle} title={t(notesHidden ? 'Göster' : 'Gizle')}>
              <Ui value={notesHidden ? <IEye size={12} /> : <IEyeOff size={12} />}/>
            </button>
            {!selectMode && !notesHidden ? (
              <button onClick={() => setSelectMode(true)} style={ghostBtnStyle}><Ui value={"Seç"}/></button>
            ) : !notesHidden ? (
              <button onClick={exitSelectMode} style={ghostBtnStyle}><Ui value={"İptal"}/></button>
            ) : null}
          </div>

          {notesHidden ? null : (
            <div style={{ background: '#fff', border: '1px solid #dde1e7', borderRadius: 9, overflow: 'hidden', flex: 1 }}>

              {/* Tab strip */}
              <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f8f9fb', overflowX: 'auto', flexShrink: 0 }}>
                {allTabs.map(tab => {
                  const isActive = activeTab === tab.id
                  const count = tab.id === 'hatirlatici'
                    ? currentReminders.filter(r => r.status === 'ACTIVE').length
                    : tab.id === 'atanan-isler'
                    ? currentTasks.filter(t => t.status === 'OPEN').length
                    : notes.filter(n => n.tab === tab.id && !n.done).length
                  const Icon = tab.icon

                  if (editingTabId === tab.id) {
                    return (
                      <div key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderBottom: '2px solid #0d9488' }}>
                        <input
                          autoFocus
                          value={editingTabName}
                          onChange={e => setEditingTabName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') renameTab(tab.id); if (e.key === 'Escape') setEditingTabId(null) }}
                          style={{ fontSize: 12.5, border: 'none', outline: 'none', background: 'transparent', width: 80 }}
                        />
                        <button onClick={() => renameTab(tab.id)} style={{ fontSize: 10, color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer' }}>✓</button>
                      </div>
                    )
                  }

                  return (
                    <div key={tab.id} style={{ position: 'relative', flexShrink: 0 }} className="group">
                      <button onClick={() => setActiveTab(tab.id)} style={{
                        padding: '8px 14px', border: 'none',
                        borderBottom: isActive ? '2px solid #0d9488' : '2px solid transparent',
                        background: 'transparent', cursor: 'pointer',
                        fontSize: 12.5, fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#0d9488' : '#6b7280',
                        display: 'flex', alignItems: 'center', gap: 5,
                        whiteSpace: 'nowrap',
                      }}>
                        <Ui value={Icon && <Icon size={12} />}/>
                        <Ui value={tab.label}/>
                        {count > 0 && <span style={{ background: isActive ? 'rgba(13,148,136,0.14)' : '#f3f4f6', color: isActive ? '#0d9488' : '#9ca3af', borderRadius: 9, padding: '0 5px', fontSize: 10.5, fontWeight: 600, lineHeight: '16px' }}><Ui value={count}/></span>}
                      </button>
                      {/* User tab context actions */}
                      {!tab.system && isActive && (
                        <div style={{ position: 'absolute', top: 4, right: 2, display: 'flex', gap: 2 }}>
                          <button onClick={() => { setEditingTabId(tab.id); setEditingTabName(tab.label) }} style={{ ...iconBtnSm, color: '#9ca3af' }} title={t("Yeniden adlandır")}><IEdit2 size={10} /></button>
                          <button onClick={() => deleteTab(tab.id)} style={{ ...iconBtnSm, color: '#dc2626' }} title={t("Başlığı sil")}><IX size={10} /></button>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Add new tab button */}
                {addingTab ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px' }}>
                    <input
                      autoFocus value={newTabName} onChange={e => setNewTabName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addUserTab(); if (e.key === 'Escape') { setAddingTab(false); setNewTabName('') } }}
                      placeholder={t("Başlık adı...")}
                      style={{ fontSize: 12.5, border: 'none', borderBottom: '1px solid #0d9488', outline: 'none', background: 'transparent', width: 100 }}
                    />
                    <button onClick={addUserTab} style={{ fontSize: 10.5, color: '#0d9488', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}><Ui value={"Ekle"}/></button>
                    <button onClick={() => { setAddingTab(false); setNewTabName('') }} style={{ fontSize: 10.5, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}><Ui value={"İptal"}/></button>
                  </div>
                ) : (
                  <button onClick={() => setAddingTab(true)} title={t("Yeni başlık ekle")} style={{ padding: '8px 10px', border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <IPlus size={11} /> <Ui value={" Yeni Başlık "}/></button>
                )}
              </div>

              {/* Tab content */}
              <div style={{ padding: '12px 16px 16px' }}>
                <Ui value={activeTab === 'hatirlatici' ? (
                  <ReminderTab />
                ) : activeTab === 'atanan-isler' ? (
                  <AtananIslerTab />
                ) : (
                  <NoteTabContent
                    pinnedActive={pinnedActive} active={active} completed={completed}
                    selectMode={selectMode} selected={selected}
                    onToggleSelect={toggleSelect} onToggleDone={toggleDone} onTogglePin={togglePin}
                    completedOpen={completedOpen} setCompletedOpen={setCompletedOpen}
                    newNoteText={newNoteText} setNewNoteText={setNewNoteText}
                    onAddNote={addNote} newNoteRef={newNoteRef}
                    multiDeleteConfirm={multiDeleteConfirm} setMultiDeleteConfirm={setMultiDeleteConfirm}
                    deleteSelected={deleteSelected} exitSelectMode={exitSelectMode}
                    selectedCount={selected.size}
                  />
                )}/>
              </div>
            </div>
          )}
        </section>
        </OperationalDashboard>
      </div>
    </div>
  )
}

/* ─── Reminder tab ───────────────────────────────────────────────────────── */

function ReminderTab() {
  const directory = useUserDirectory()
  const perms = usePermissionResolver()
  const store = useTaskReminderStore()
  const { addNotification } = useNotificationStore()
  const reminders = store.remindersForUser()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title: '', note: '', date: '', time: '' })
  const [assignee, setAssignee] = useState<User | null>(null)
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null)
  const [message, setMessage] = useState('')

  const save = () => {
    if (!form.title.trim()) { setMessage('Başlık zorunludur.'); return }
    if (!form.date || !form.time) { setMessage('Hatırlatıcı için tarih ve saat zorunludur.'); return }
    const remindAt = new Date(`${form.date}T${form.time}:00`).toISOString()
    try {
      const result = store.saveReminder({ reminderId:editingReminder?.reminderId, taskId:editingReminder?.taskId || undefined, title:form.title, note:form.note, userId:assignee?.userId || store.currentUserId, remindAt, createAssignedTask:!!assignee })
      if (assignee && assignee.userId !== store.currentUserId) addNotification({ type:'TASK_ASSIGNED', message:`${assignee.fullName} kullanıcısına görev/hatırlatıcı atandı: ${result.reminder.title}`, recipientUserIds:[assignee.userId] })
      setForm({ title:'', note:'', date:'', time:'' }); setAssignee(null); setEditingReminder(null); setAdding(false); setMessage('')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Hatırlatıcı kaydedilemedi.') }
  }

  const startEditReminder = (reminder: Reminder) => {
    const date = new Date(reminder.remindAt)
    const linkedTask = reminder.taskId ? store.tasks.find(task => task.taskId === reminder.taskId) : undefined
    setEditingReminder(reminder)
    setForm({ title:reminder.title, note:reminder.note || '', date:date.toLocaleDateString('sv-SE'), time:date.toTimeString().slice(0,5) })
    setAssignee(linkedTask ? (directory.getUser(linkedTask.assigneeUserId) || null) : null)
    setAdding(true)
    setMessage('')
  }

  return (
    <div>
      <div style={{ marginBottom: 10, fontSize: 11.5, color: '#6b7280' }}>
        <Ui value={" Hatırlatıcılar tarih ve saatte görünür olur. Başlıkta "}/><strong>@</strong> <Ui value={" yazarak aktif bir kullanıcıya görev + hatırlatıcı atayabilirsiniz. "}/></div>
      {message && <div style={{ marginBottom:8, padding:'6px 8px', border:'1px solid #fde68a', borderRadius:5, background:'#fffbeb', color:'#92400e', fontSize:10.5 }}><Ui value={message}/></div>}
      {reminders.map(r => {
        const linkedTask = r.taskId ? store.tasks.find(t => t.taskId === r.taskId) : undefined
        const active = r.status === 'ACTIVE'
        return <div key={r.reminderId} style={{ display:'flex', gap:10, padding:'8px 6px', borderBottom:'1px solid #f3f4f6', opacity:active ? 1 : .55 }}>
          {(active ? perms.can('task.complete') : perms.can('task.edit')) ? <button onClick={() => linkedTask ? store.setTaskStatus(linkedTask.taskId, active ? 'COMPLETED' : 'OPEN') : store.setReminderStatus(r.reminderId, active ? 'COMPLETED' : 'ACTIVE')} style={{ width:16,height:16,borderRadius:'50%',flexShrink:0,marginTop:2,border:`1.5px solid ${active?'#d1d5db':'#0d9488'}`,background:active?'#fff':'#f0fdfa',cursor:'pointer',padding:0,display:'flex',alignItems:'center',justifyContent:'center' }}><Ui value={!active && <ICheck size={9} style={{ color:'#0d9488', strokeWidth:2.5 } as React.CSSProperties}/>}/></button> : <span style={{width:16,height:16,borderRadius:'50%',flexShrink:0,marginTop:2,border:`1.5px solid ${active?'#d1d5db':'#0d9488'}`,background:active?'#fff':'#f0fdfa',display:'flex',alignItems:'center',justifyContent:'center'}}><Ui value={!active && <ICheck size={9} style={{ color:'#0d9488', strokeWidth:2.5 } as React.CSSProperties}/>}/></span>}
          <div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:500,color:active?'#111827':'#9ca3af',textDecoration:active?'none':'line-through'}}>{r.title}</div>{r.note&&<div style={{fontSize:11.5,color:'#9ca3af',marginTop:2}}>{r.note}</div>}{linkedTask&&<div style={{fontSize:10,color:'#2563eb',marginTop:3}}><Ui value={"Görev · Atayan: "}/>{directory.getUser(linkedTask.createdByUserId)?.fullName || '—'}</div>}</div>
          {perms.can('task.edit') && <button onClick={() => startEditReminder(r)} style={{alignSelf:'center',padding:'4px 7px',border:'1px solid #dde1e7',background:'#fff',color:'#64748b',borderRadius:5,fontSize:9.8,cursor:'pointer'}}><Ui value={"Düzenle"}/></button>}
          <div style={{textAlign:'right',flexShrink:0}}><div style={{fontSize:11,color:'#374151',fontFamily:'var(--font-mono)',display:'flex',alignItems:'center',gap:4}}><IClock size={11} style={{color:'#d97706'}}/><Ui value={formatDateTime(r.remindAt)}/></div><div style={{fontSize:9.5,color:'#9ca3af',marginTop:2}}><Ui value={r.status==='ACTIVE'?'Aktif':r.status==='COMPLETED'?'Tamamlandı':'İptal'}/></div></div>
        </div>
      })}
      {adding && (editingReminder ? perms.can('task.edit') : perms.can('task.create')) ? <div style={{ marginTop:12,padding:12,background:'#f8f9fb',border:'1px solid #dde1e7',borderRadius:7 }}>
        <UserMentionPicker value={form.title} onChange={title=>setForm(f=>({...f,title}))} users={store.activeUsers} selectedUser={assignee} onSelectUser={setAssignee} placeholder={t("Hatırlatıcı başlığı · @ kullanıcı...")} autoFocus />
        <input value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} placeholder={t("Not (isteğe bağlı)")} style={{ width:'100%',padding:'6px 9px',border:'1px solid #dde1e7',borderRadius:5,fontSize:12.5,outline:'none',margin:'6px 0',background:'#fff',boxSizing:'border-box' }} />
        <div style={{display:'flex',gap:8,marginBottom:10}}><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{flex:1,padding:'6px 9px',border:'1px solid #dde1e7',borderRadius:5,fontSize:12.5,outline:'none',background:'#fff'}}/><input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} style={{width:110,padding:'6px 9px',border:'1px solid #dde1e7',borderRadius:5,fontSize:12.5,outline:'none',background:'#fff'}}/></div>
        <div style={{display:'flex',gap:6}}><button onClick={save} style={{padding:'5px 14px',borderRadius:5,border:'none',background:'#0d9488',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer'}}><Ui value={editingReminder?'Güncelle':'Kaydet'}/></button><button onClick={()=>{setAdding(false);setAssignee(null);setEditingReminder(null);setForm({title:'',note:'',date:'',time:''});setMessage('')}} style={{padding:'5px 10px',borderRadius:5,border:'1px solid #e5e7eb',background:'#fff',fontSize:12,cursor:'pointer'}}><Ui value={"İptal"}/></button></div>
      </div> : perms.can('task.create') ? <button onClick={()=>setAdding(true)} style={{ marginTop:10,display:'flex',alignItems:'center',gap:6,padding:'7px 12px',border:'1px dashed #d1d5db',borderRadius:6,background:'#f8f9fb',color:'#9ca3af',fontSize:12.5,cursor:'pointer',width:'100%' }}><IPlus size={13}/> <Ui value={" Yeni Hatırlatıcı Ekle"}/></button> : null}
    </div>
  )
}

/* ─── Atanan İşler tab ───────────────────────────────────────────────────── */

function AtananIslerTab() {
  const directory = useUserDirectory()
  const perms = usePermissionResolver()
  const store = useTaskReminderStore()
  const { addNotification } = useNotificationStore()
  const [filter, setFilter] = useState<TaskStatus>('OPEN')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({title:'',description:'',date:'',time:''})
  const [assignee, setAssignee] = useState<User|null>(null)
  const [editingTask, setEditingTask] = useState<Task|null>(null)
  const [message, setMessage] = useState('')
  const tasks = store.tasksForUser().filter(task => task.status === filter)
  const counts = { OPEN:store.tasksForUser().filter(t=>t.status==='OPEN').length, COMPLETED:store.tasksForUser().filter(t=>t.status==='COMPLETED').length, CANCELLED:store.tasksForUser().filter(t=>t.status==='CANCELLED').length }

  const save = () => {
    if (!form.title.trim()) { setMessage('Görev başlığı zorunludur.'); return }
    if (!assignee) { setMessage('@ yazarak görev atanacak aktif kullanıcıyı seçin.'); return }
    const dueAt = form.date && form.time ? new Date(`${form.date}T${form.time}:00`).toISOString() : null
    try {
      const result = store.saveTask({taskId:editingTask?.taskId,title:form.title,description:form.description,assigneeUserId:assignee.userId,dueAt})
      addNotification({type:'TASK_ASSIGNED',message:`${assignee.fullName} kullanıcısına yeni görev atandı: ${result.task.title}`,recipientUserIds:[assignee.userId]})
      setForm({title:'',description:'',date:'',time:''});setAssignee(null);setEditingTask(null);setAdding(false);setMessage(assignee.userId===store.currentUserId?'Görev Atanan İşler listenize kaydedildi.':`Görev ${assignee.fullName} kullanıcısının Atanan İşler listesine kaydedildi.`)
    } catch(error){setMessage(error instanceof Error?error.message:'Görev kaydedilemedi.')}
  }
  const startEditTask = (task: Task) => {
    const user = directory.getUser(task.assigneeUserId) || null
    const due = task.dueAt ? new Date(task.dueAt) : null
    setEditingTask(task)
    setForm({title:task.title,description:task.description || '',date:due?due.toLocaleDateString('sv-SE'):'',time:due?due.toTimeString().slice(0,5):''})
    setAssignee(user)
    setAdding(true)
    setMessage('')
  }
  return <div>
    <div style={{marginBottom:8,fontSize:11.5,color:'#6b7280'}}><Ui value={"Atanan İşler yalnız oturum açmış kullanıcıya atanan görevleri gösterir. Her aktif kullanıcı, "}/><strong><Ui value={"@kullanıcı"}/></strong> <Ui value={" ile başka bir aktif kullanıcıya görev atayabilir."}/></div>
    <div style={{display:'flex',gap:5,alignItems:'center',marginBottom:9}}>{([['OPEN','Açık'],['COMPLETED','Tamamlandı'],['CANCELLED','İptal']] as [TaskStatus,string][]).map(([id,label])=><button key={id} onClick={()=>setFilter(id)} style={{padding:'4px 8px',borderRadius:12,border:`1px solid ${filter===id?'#99f6e4':'#e5e7eb'}`,background:filter===id?'#f0fdfa':'#fff',color:filter===id?'#0d9488':'#6b7280',fontSize:10.5,cursor:'pointer'}}><Ui value={label}/> · <Ui value={counts[id]}/></button>)}<div style={{flex:1}}/>{perms.can('task.create')&&<button onClick={()=>setAdding(v=>!v)} style={{padding:'5px 10px',borderRadius:5,border:'1px solid #0d9488',background:'#0d9488',color:'#fff',fontSize:10.8,fontWeight:600,cursor:'pointer'}}><Ui value={editingTask?'Görevi Düzenle':'+ Görev Ata'}/></button>}</div>
    {message&&<div style={{marginBottom:8,padding:'6px 8px',border:'1px solid #dbeafe',background:'#eff6ff',borderRadius:5,color:'#1d4ed8',fontSize:10.5}}><Ui value={message}/></div>}
    {adding&&(editingTask?perms.can('task.edit'):perms.can('task.create'))&&<div style={{marginBottom:10,padding:10,background:'#f8f9fb',border:'1px solid #dde1e7',borderRadius:7}}><UserMentionPicker value={form.title} onChange={title=>setForm(f=>({...f,title}))} users={store.activeUsers} selectedUser={assignee} onSelectUser={setAssignee} placeholder={t("Görev başlığı · @ kullanıcı...")} autoFocus/><input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder={t("Açıklama (isteğe bağlı)")} style={{width:'100%',padding:'6px 9px',border:'1px solid #dde1e7',borderRadius:5,fontSize:12,margin:'6px 0',boxSizing:'border-box'}}/><div style={{display:'flex',gap:8,marginBottom:8}}><input type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} style={{flex:1,padding:'6px 8px',border:'1px solid #dde1e7',borderRadius:5,fontSize:11.5}}/><input type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} style={{width:110,padding:'6px 8px',border:'1px solid #dde1e7',borderRadius:5,fontSize:11.5}}/></div><div style={{fontSize:9.5,color:'#9ca3af',marginBottom:8}}><Ui value={"Tarih ve saat birlikte girilirse aynı görev için tek bağlı hatırlatıcı oluşturulur. Boş bırakılırsa görev yine oluşturulur."}/></div><div style={{display:'flex',gap:6}}><button onClick={save} style={{padding:'5px 12px',border:0,borderRadius:5,background:'#0d9488',color:'#fff',fontSize:11,fontWeight:600,cursor:'pointer'}}><Ui value={editingTask?'Güncelle':'Kaydet'}/></button><button onClick={()=>{setAdding(false);setAssignee(null);setEditingTask(null);setForm({title:'',description:'',date:'',time:''});setMessage('')}} style={{padding:'5px 10px',border:'1px solid #dde1e7',borderRadius:5,background:'#fff',fontSize:11,cursor:'pointer'}}><Ui value={"İptal"}/></button></div></div>}
    {tasks.map(task=><TaskRow key={task.taskId} task={task} onStatus={status=>store.setTaskStatus(task.taskId,status)} onEdit={()=>startEditTask(task)} canEdit={perms.can('task.edit')} canComplete={perms.can('task.complete')} canCancel={perms.can('task.cancel')}/>)}{tasks.length===0&&<div style={{padding:'18px 0',textAlign:'center',fontSize:11,color:'#9ca3af'}}><Ui value={"Bu durumda size atanmış görev bulunmuyor."}/></div>}
  </div>
}

function TaskRow({task,onStatus,onEdit,canEdit,canComplete,canCancel}:{task:Task;onStatus:(status:TaskStatus)=>void;onEdit:()=>void;canEdit:boolean;canComplete:boolean;canCancel:boolean}){
  const directory=useUserDirectory(); const creator=directory.getUser(task.createdByUserId);const due=task.dueAt?formatDateTime(task.dueAt):'—'
  return <div style={{display:'flex',gap:10,padding:'8px 4px',borderBottom:'1px solid #f3f4f6',opacity:task.status==='OPEN'?1:.62}}><div style={{width:16,height:16,borderRadius:'50%',marginTop:2,border:`1.5px solid ${task.status==='COMPLETED'?'#0d9488':task.status==='CANCELLED'?'#dc2626':'#d1d5db'}`,background:task.status==='COMPLETED'?'#f0fdfa':'#fff',display:'grid',placeItems:'center'}}><Ui value={task.status==='COMPLETED'&&<ICheck size={9} style={{color:'#0d9488'}}/>}/></div><div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:500,color:task.status==='OPEN'?'#111827':'#9ca3af',textDecoration:task.status==='COMPLETED'?'line-through':'none'}}>{task.title}</div>{task.description&&<div style={{fontSize:10.8,color:'#9ca3af',marginTop:2}}>{task.description}</div>}<div style={{fontSize:10.2,color:'#9ca3af',marginTop:3}}><Ui value={"Atayan: "}/><strong style={{color:'#6b7280'}}>{creator?.fullName||'—'}</strong> <Ui value={" · Termin: "}/><Ui value={due}/></div></div><div style={{display:'flex',gap:4,alignItems:'center'}}>{canEdit&&<button onClick={onEdit} style={{padding:'4px 7px',border:'1px solid #dde1e7',background:'#fff',color:'#64748b',borderRadius:5,fontSize:9.8,cursor:'pointer'}}><Ui value={"Düzenle"}/></button>}{task.status==='OPEN'?<>{canComplete&&<button onClick={()=>onStatus('COMPLETED')} style={{padding:'4px 7px',border:'1px solid #99f6e4',background:'#f0fdfa',color:'#0d9488',borderRadius:5,fontSize:9.8,cursor:'pointer'}}><Ui value={"Tamamla"}/></button>}{canCancel&&<button onClick={()=>onStatus('CANCELLED')} style={{padding:'4px 7px',border:'1px solid #fecaca',background:'#fff',color:'#b91c1c',borderRadius:5,fontSize:9.8,cursor:'pointer'}}><Ui value={"İptal"}/></button>}</>:canEdit?<button onClick={()=>onStatus('OPEN')} style={{padding:'4px 7px',border:'1px solid #dde1e7',background:'#fff',color:'#64748b',borderRadius:5,fontSize:9.8,cursor:'pointer'}}><Ui value={"Yeniden Aç"}/></button>:null}</div></div>
}

/* ─── Note tab content ───────────────────────────────────────────────────── */

function NoteTabContent({
  pinnedActive, active, completed, selectMode, selected,
  onToggleSelect, onToggleDone, onTogglePin,
  completedOpen, setCompletedOpen,
  newNoteText, setNewNoteText, onAddNote, newNoteRef,
  multiDeleteConfirm, setMultiDeleteConfirm,
  deleteSelected, exitSelectMode, selectedCount,
}: any) {
  return (
    <>
      {pinnedActive.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <NoteGroupLabel><Ui value={"Sabitlenenler"}/></NoteGroupLabel>
          {pinnedActive.map((note: Note) => <NoteRow key={note.id} note={note} selectMode={selectMode} selected={selected.has(note.id)} onToggleSelect={() => onToggleSelect(note.id)} onToggleDone={() => onToggleDone(note.id)} onTogglePin={() => onTogglePin(note.id)} pinned />)}
        </div>
      )}

      {active.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          {pinnedActive.length > 0 && <NoteGroupLabel><Ui value={"Notlar"}/></NoteGroupLabel>}
          {active.map((note: Note) => <NoteRow key={note.id} note={note} selectMode={selectMode} selected={selected.has(note.id)} onToggleSelect={() => onToggleSelect(note.id)} onToggleDone={() => onToggleDone(note.id)} onTogglePin={() => onTogglePin(note.id)} />)}
        </div>
      )}

      {active.length === 0 && pinnedActive.length === 0 && (
        <div style={{ padding: '20px 0', textAlign: 'center', color: '#d1d5db', fontSize: 12 }}><Ui value={"Bu sekmede henüz not yok."}/></div>
      )}

      {/* Add note */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#f8f9fb', border: '1px dashed #d1d5db', borderRadius: 6, padding: '7px 12px' }}>
          <IPlus size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
          <input ref={newNoteRef} value={newNoteText} onChange={e => setNewNoteText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') onAddNote() }} placeholder={t("Yeni not ekle...")} style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 12.5, color: '#374151', outline: 'none' }} />
          {newNoteText && <button onClick={onAddNote} style={{ padding: '3px 10px', background: '#0d9488', color: '#fff', border: 'none', borderRadius: 5, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}><Ui value={"Ekle"}/></button>}
        </div>
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <button onClick={() => setCompletedOpen((v: boolean) => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 6px', color: '#9ca3af', fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', width: '100%', textAlign: 'left' }}>
            <Ui value={completedOpen ? <IChevD size={12} /> : <IChevR size={12} />}/>
            <Ui value={" Tamamlananlar "}/><span style={{ background: '#f3f4f6', color: '#6b7280', borderRadius: 9, padding: '0 5px', fontSize: 10, fontWeight: 600, lineHeight: '16px', letterSpacing: 0 }}><Ui value={completed.length}/></span>
          </button>
          {completedOpen && completed.map((note: Note) => <NoteRow key={note.id} note={note} selectMode={selectMode} selected={selected.has(note.id)} onToggleSelect={() => onToggleSelect(note.id)} onToggleDone={() => onToggleDone(note.id)} onTogglePin={() => onTogglePin(note.id)} completed />)}
        </div>
      )}

      {/* Multi-select bar */}
      {selectMode && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#1a2235', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '8px 14px', marginTop: 8 }}>
          <span style={{ fontSize: 12.5, color: '#c9d1dc', flex: 1 }}>
            <Ui value={selectedCount > 0 ? `${selectedCount} not seçildi` : 'Silmek istediğiniz notları seçin'}/>
          </span>
          {selectedCount > 0 && !multiDeleteConfirm && (
            <button onClick={() => setMultiDeleteConfirm(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 5, color: '#fca5a5', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <ITrash size={12} /> <Ui value={" Sil "}/></button>
          )}
          {multiDeleteConfirm && (
            <>
              <span style={{ fontSize: 12, color: '#fca5a5' }}><Ui value={"Emin misiniz?"}/></span>
              <button onClick={deleteSelected} style={{ padding: '5px 12px', background: '#dc2626', border: 'none', borderRadius: 5, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><Ui value={"Evet, Sil"}/></button>
              <button onClick={() => setMultiDeleteConfirm(false)} style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, color: '#c9d1dc', fontSize: 12, cursor: 'pointer' }}><Ui value={"İptal"}/></button>
            </>
          )}
          {!multiDeleteConfirm && selectedCount === 0 && <button onClick={exitSelectMode} style={{ ...ghostBtnStyle, color: '#64748b' }}><Ui value={"İptal"}/></button>}
        </div>
      )}
    </>
  )
}

/* ─── NoteRow ────────────────────────────────────────────────────────────── */

function NoteRow({ note, selectMode, selected, onToggleSelect, onToggleDone, onTogglePin, pinned, completed }: {
  note: Note; selectMode: boolean; selected: boolean
  onToggleSelect: () => void; onToggleDone: () => void; onTogglePin: () => void
  pinned?: boolean; completed?: boolean
}) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={selectMode ? onToggleSelect : undefined}
      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 4px', borderRadius: 5, background: selected ? 'rgba(13,148,136,0.07)' : hov ? '#f8fafc' : 'transparent', transition: 'background 100ms', cursor: selectMode ? 'pointer' : 'default' }}
    >
      {selectMode ? (
        <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${selected ? '#0d9488' : '#d1d5db'}`, background: selected ? '#0d9488' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Ui value={selected && <ICheck size={10} style={{ color: '#fff', strokeWidth: 3 } as React.CSSProperties} />}/>
        </div>
      ) : (
        <button onClick={onToggleDone} style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${completed ? '#0d9488' : '#d1d5db'}`, background: completed ? '#f0fdfa' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', padding: 0 }}>
          <Ui value={completed && <ICheck size={9} style={{ color: '#0d9488', strokeWidth: 2.5 } as React.CSSProperties} />}/>
        </button>
      )}
      <Ui value={pinned && !selectMode && <IPin size={11} style={{ color: '#0d9488', flexShrink: 0 }} />}/>
      <span style={{ flex: 1, fontSize: 12.5, color: completed ? '#9ca3af' : '#111827', textDecoration: completed ? 'line-through' : 'none', lineHeight: 1.4 }}><Ui value={note.text}/></span>
      <span style={{ fontSize: 10, color: '#c9d1dc', fontFamily: 'var(--font-mono)', flexShrink: 0 }}><Ui value={note.createdAt}/></span>
      {hov && !selectMode && (
        <button onClick={e => { e.stopPropagation(); onTogglePin() }} title={t(note.pinned ? 'Sabitlemeyi kaldır' : 'Sabitle')} style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer', padding: 0, color: note.pinned ? '#0d9488' : '#9ca3af', flexShrink: 0 }}>
          <IPin size={11} />
        </button>
      )}
    </div>
  )
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */



const QUICK_ROUTES = [
  {id:'yeni-cari',label:'Yeni Cari',permission:'customer.create'},
  {id:'cariler',label:'Cariler',permission:'customer.view'},
  {id:'proje-merkezi',label:'Proje Merkezi',permission:'project.view'},
  {id:'uretim',label:'Üretim',permission:'operations.view'},
  {id:'profiller',label:'Profiller',permission:'product.view'},
  {id:'aksesuarlar',label:'Aksesuarlar',permission:'product.view'},
  {id:'camlar',label:'Camlar',permission:'product.view'},
  {id:'bulut',label:'Bulut',permission:'cloud.view'},
] as const

function money(n:number){return formatNumber(n,{maximumFractionDigits:2})}

function OperationalDashboard({onOpenModule,onOpenProject,children}:{children?:React.ReactNode;onOpenModule?:(id:string)=>void;onOpenProject?:(code:string,customer:string,projectId?:string)=>void}){
  const directory=useUserDirectory(); const currentUser=directory.currentUser
  const company=useCompanySettings(); const perms=usePermissionResolver()
  const {projects}=useProjectStore(); const {customers}=useCustomerStore(); const commerce=useCommerceStore(); const attachments=useAttachmentStore(); const cloud=useCloudLibraryStore()
  const[query,setQuery]=useState(''); const[searchOpen,setSearchOpen]=useState(false); const[searchIndex,setSearchIndex]=useState(0); const searchRef=useRef<HTMLInputElement>(null)
  const[shortcutOpen,setShortcutOpen]=useState(false)
  const shortcutKey=`plmr.quick-start.v14.${currentUser.userId}`
  const loadShortcuts=(userId:string)=>{try{const raw=localStorage.getItem(`plmr.quick-start.v14.${userId}`)||localStorage.getItem(`plmr.quick-start.v13.${userId}`)||'[]';const value=JSON.parse(raw);return Array.isArray(value)?value.slice(0,5):[]}catch{return[]}}
  const[shortcutState,setShortcutState]=useState<{userId:string;items:string[]}>(()=>({userId:currentUser.userId,items:loadShortcuts(currentUser.userId)}))
  const customShortcuts=shortcutState.items
  const[shortcutMessage,setShortcutMessage]=useState('')
  useEffect(()=>{setShortcutState({userId:currentUser.userId,items:loadShortcuts(currentUser.userId)});setShortcutMessage('')},[currentUser.userId])
  useEffect(()=>{if(shortcutState.userId!==currentUser.userId)return;try{localStorage.setItem(shortcutKey,JSON.stringify(shortcutState.items.slice(0,5)))}catch{}},[shortcutKey,shortcutState,currentUser.userId])
  const scope=perms.scope('DASHBOARD')
  const salesOnly=['SALES_REPRESENTATIVE','DEALER'].includes(currentUser.roleId),productionOnly=['PRODUCTION_OPERATOR','OPERATIONS_CONTROL','INSTALLATION_SERVICE'].includes(currentUser.roleId)
  const ownCustomers=customers.filter(c=>{const rep=c.accountRepresentativeUserId||directory.findUserByName(c.accountRepresentative)?.userId;return rep?rep===currentUser.userId:c.createdBy===currentUser.userId})
  const ownCustomerIds=new Set(ownCustomers.map(c=>c.id))
  const scopedProjects=useMemo(()=>projects.filter(p=>!p.deletedAt&&p.status!=='arsivlendi'&&(!salesOnly||(p.customerId?ownCustomerIds.has(p.customerId):ownCustomers.some(c=>c.name===p.musteriAdi)))&&(!productionOnly||Number(p.status)>=20)&&perms.canAccessRecord('DASHBOARD',{ownerUserId:p.ownerUserId||directory.findUserByName(p.cizen)?.userId,createdByUserId:p.createdByUserId,representativeUserId:p.projectRepresentativeUserId||directory.findUserByName(p.musteriTemsilcisi)?.userId,assignedUserIds:p.assignedUserIds})),[projects,customers,currentUser.userId,currentUser.roleId,scope,directory.users])
  const searchableProjects=scopedProjects.filter(p=>(perms.can('project.view')||Boolean(p.sourceQuickQuoteId&&!p.hasTechnicalDrawing&&perms.can('commercial.quote.view')))&&perms.canAccessRecord('PROJECTS',{ownerUserId:p.ownerUserId||directory.findUserByName(p.cizen)?.userId,createdByUserId:p.createdByUserId,representativeUserId:p.projectRepresentativeUserId,assignedUserIds:p.assignedUserIds}))
  const contentSearch=useProjectContentSearch(searchableProjects,searchOpen&&Boolean(query.trim()))
  const loadFiles=attachments.loadFiles
  const [filesSearchError,setFilesSearchError]=useState('')
  useEffect(()=>{
    if(!searchOpen||!query.trim())return
    let alive=true
    setFilesSearchError('')
    void loadFiles().catch(error=>{if(alive)setFilesSearchError(error.message)})
    return()=>{alive=false}
  },[loadFiles,searchOpen,Boolean(query.trim())])
  const scopedCustomers=useMemo(()=>customers.filter(c=>(!salesOnly||ownCustomerIds.has(c.id))&&perms.canAccessRecord('CUSTOMERS',{createdByUserId:c.createdBy,ownerUserId:c.accountRepresentativeUserId||directory.findUserByName(c.accountRepresentative)?.userId,representativeUserId:c.accountRepresentativeUserId||directory.findUserByName(c.accountRepresentative)?.userId})),[customers,currentUser.userId,currentUser.roleId,directory.users])
  const projectIds=new Set(scopedProjects.map(p=>p.projectId).filter(Boolean)); const projectCodes=new Set(scopedProjects.map(p=>p.projKodu))
  const scopedOrders=(perms.can('customer.orders.view')?commerce.orders:[]).filter(o=>o.active&&(!salesOnly||ownCustomerIds.has(o.customerId))&&(scope==='ALL_COMPANY'||(o.projectId?projectIds.has(o.projectId):o.projectCode?projectCodes.has(o.projectCode):o.createdByUserId===currentUser.userId)))
  const orderTotals=useMemo(()=>{const m:Record<string,number>={};scopedOrders.forEach(o=>m[o.currency]=(m[o.currency]||0)+o.amount);return m},[scopedOrders])
  const recentQuoteRows=recentProjectQuotes(scopedProjects)
  const recentQuotes=recentQuoteRows.length
  const quoteTotals=useMemo(()=>{const m:Record<string,number>={};recentQuoteRows.forEach(q=>m[q.currency]=(m[q.currency]||0)+q.amount);return m},[recentQuoteRows])
  const approved=scopedProjects.filter(p=>[20,30,40,50,60].includes(Number(p.status))).length
  const ready=scopedProjects.filter(p=>p.status===50).length; const shipped=scopedProjects.filter(p=>p.status===60).length
  const cards=[
    ['dashboard.widget.quote_7d','Son 7 Günde Teklifler',String(recentQuotes),'proje-merkezi'],
    ['dashboard.widget.approved_projects','Onaylanan Projeler',String(approved),'proje-merkezi'],
    ['dashboard.widget.ready_to_ship','Sevkiyat Sürecinde',String(ready),'proje-merkezi'],
    ['dashboard.widget.shipped','Sevk Edilen',String(shipped),'proje-merkezi'],
  ].filter(c=>perms.can(c[0] as any))
  const alerts=useMemo(()=>!perms.can('customer.credit.view')||!perms.can('customer.orders.view')?[]:scopedCustomers.flatMap(c=>{if(!c.creditLimitAmount||!c.creditLimitCurrency)return[];const exposure=scopedOrders.filter(o=>o.customerId===c.id&&o.currency===c.creditLimitCurrency&&o.exposureOpen!==false).reduce((a,o)=>a+o.amount,0);return exposure>c.creditLimitAmount?[{id:c.id,text:`${c.name}: Kredi Limiti Aşıldı — ${money(exposure)} ${c.creditLimitCurrency} / ${money(c.creditLimitAmount)} ${c.creditLimitCurrency}`}]:[]}),[scopedCustomers,scopedOrders])
  const searchResults=useMemo(()=>{
    const q=query.trim().toLocaleLowerCase('tr'); if(!q)return[] as {group:string;label:string;sub:string;action:()=>void}[]; const out:{group:string;label:string;sub:string;action:()=>void}[]=[]
    const projectSearch=createProjectSearch(q,true)
    if(perms.can('project.view')||perms.can('commercial.quote.view')) searchableProjects.filter(p=>projectSearch(p,contentSearch.index[p.projKodu])).slice(0,8).forEach(p=>out.push({group:'PROJELER',label:p.projKodu,sub:p.projeAdi||p.musteriAdi,action:()=>onOpenProject?.(p.projKodu,p.musteriAdi,p.projectId)}))
    if(perms.can('customer.view')) scopedCustomers.filter(c=>c.status==='active'&&`${c.name} ${c.customerAccountCode} ${c.supplierAccountCode} ${c.taxNumber}`.toLocaleLowerCase('tr').includes(q)).slice(0,8).forEach(c=>out.push({group:'CARİLER',label:c.name,sub:c.customerAccountCode||c.supplierAccountCode||c.taxNumber,action:()=>{sessionStorage.setItem('plmr.open.customer',c.id);onOpenModule?.('cariler')}}))
    if(perms.can('commercial.order.view')) scopedOrders.filter(o=>`${o.projectCode||''} ${o.orderId} ${o.description}`.toLocaleLowerCase('tr').includes(q)).slice(0,6).forEach(o=>out.push({group:'SİPARİŞLER',label:o.projectCode||'Manuel Sipariş',sub:`${money(o.amount)} ${o.currency}`,action:()=>{sessionStorage.setItem('plmr.open.customer',o.customerId);onOpenModule?.('cariler')}}))
    if(perms.can('project.files.view')) attachments.attachments.filter(a=>a.status==='active'&&`${a.displayName} ${a.originalFileName}`.toLocaleLowerCase('tr').includes(q)&&projectIds.has(a.projectId)).slice(0,6).forEach(a=>out.push({group:'DOSYALAR',label:a.displayName,sub:'Proje Dosyası',action:()=>{const p=scopedProjects.find(x=>x.projectId===a.projectId);if(p)onOpenProject?.(p.projKodu,p.musteriAdi,p.projectId)}}))
    if(perms.can('cloud.view')) cloud.items.filter(i=>i.status==='ACTIVE'&&`${i.title} ${i.fileName||''}`.toLocaleLowerCase('tr').includes(q)).slice(0,6).forEach(i=>out.push({group:'DOSYALAR',label:i.title,sub:'Bulut',action:()=>{sessionStorage.setItem('plmr.open.cloudItem',i.itemId);onOpenModule?.('bulut')}}))
    return out
  },[query,scopedProjects,scopedCustomers,scopedOrders,attachments.attachments,cloud.items,scope,currentUser.userId,contentSearch.index])
  useEffect(()=>{const fn=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setSearchOpen(true);setTimeout(()=>searchRef.current?.focus(),0)}else if(searchOpen&&e.key==='Escape'){setSearchOpen(false);setQuery('')}else if(searchOpen&&e.key==='ArrowDown'){e.preventDefault();setSearchIndex(i=>Math.min(searchResults.length-1,i+1))}else if(searchOpen&&e.key==='ArrowUp'){e.preventDefault();setSearchIndex(i=>Math.max(0,i-1))}else if(searchOpen&&e.key==='Enter'&&searchResults[searchIndex]){searchResults[searchIndex].action();setSearchOpen(false);setQuery('')}};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn)},[searchOpen,searchResults,searchIndex])
  const toggleShortcut=(id:string)=>setShortcutState(prev=>{if(prev.userId!==currentUser.userId)return prev;if(prev.items.includes(id)){setShortcutMessage('');return {...prev,items:prev.items.filter(x=>x!==id)}}if(prev.items.length>=5){setShortcutMessage('Maksimum 7 hızlı işlem ekleyebilirsiniz.');return prev}setShortcutMessage('');return {...prev,items:[...prev.items,id]}})
  const moveShortcut=(id:string,dir:number)=>setShortcutState(prev=>{const i=prev.items.indexOf(id),j=i+dir;if(i<0||j<0||j>=prev.items.length)return prev;const n=[...prev.items];[n[i],n[j]]=[n[j],n[i]];return {...prev,items:n}})
  const allowedRoutes=QUICK_ROUTES.filter(r=>perms.can(r.permission as any))
  return <>
    <BrandWelcome/>
    <div style={{position:'relative'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,background:'#fff',border:'1.5px solid #dde1e7',borderRadius:8,padding:'9px 14px',boxShadow:'0 1px 3px rgba(0,0,0,.04)'}}><ISearch size={15} style={{color:'#9ca3af',flexShrink:0}}/><input ref={searchRef} value={query} onFocus={()=>setSearchOpen(true)} onChange={e=>{setQuery(e.target.value);setSearchOpen(true);setSearchIndex(0)}} aria-label={t("Ana menü derin arama")} placeholder={t("Proje, not, açıklama, cari veya dosya ara…")} style={{flex:1,border:'none',background:'transparent',fontSize:13.5,color:'#374151',outline:'none'}}/>{query&&<button onClick={()=>setQuery('')} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',padding:2,display:'flex'}}><IX size={14}/></button>}<div style={{width:1,height:16,background:'#e5e7eb'}}/><kbd style={{fontSize:10.5,color:'#9ca3af',background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:4,padding:'2px 5px',fontFamily:'var(--font-mono)'}}><Ui value={"Ctrl K"}/></kbd></div>
      {searchOpen&&query.trim()&&<div style={{position:'absolute',zIndex:80,left:0,right:0,top:'calc(100% + 4px)',background:'#fff',border:'1px solid #dfe3e8',borderRadius:8,boxShadow:'0 12px 28px rgba(15,23,42,.14)',maxHeight:360,overflow:'auto'}}>{contentSearch.loading&&<div role="status" style={{padding:10,fontSize:11,color:'#64748b'}}><Ui value={"Kayıtlı proje içerikleri aranıyor…"}/></div>}{(contentSearch.error||filesSearchError)&&<div role="alert" style={{padding:10,fontSize:11,color:'#b91c1c'}}><Ui value={contentSearch.error||filesSearchError}/></div>}{searchResults.length===0?<div style={{padding:16,fontSize:12,color:'#9ca3af'}}><Ui value={"Yetkiniz ve veri kapsamınız içinde sonuç bulunamadı."}/></div>:searchResults.map((r,i)=><button key={`${r.group}-${i}`} onMouseEnter={()=>setSearchIndex(i)} onClick={()=>{r.action();setSearchOpen(false);setQuery('')}} style={{display:'flex',width:'100%',textAlign:'left',alignItems:'center',gap:12,padding:'9px 12px',border:0,borderBottom:'1px solid #f3f4f6',background:i===searchIndex?'#f0fdfa':'#fff',cursor:'pointer'}}><span style={{width:72,fontSize:9.5,fontWeight:700,color:'#9ca3af'}}><Ui value={r.group}/></span><span><b style={{fontSize:12,color:'#111827'}}><Ui value={r.label}/></b><span style={{display:'block',fontSize:10.5,color:'#9ca3af',marginTop:1}}><Ui value={r.sub}/></span></span></button>)}</div>}
    </div>
    <section><SectionLabel><Ui value={"Hızlı Başlat"}/></SectionLabel><div style={{display:'flex',gap:8,marginTop:8,position:'relative',flexWrap:'nowrap'}}><QuickBtn icon={IDraft} label="Yeni Proje" disabled={!(perms.can('project.create')||perms.can('commercial.quote.create'))} onClick={()=>(perms.can('project.create')||perms.can('commercial.quote.create'))&&onOpenModule?.('yeni-proje')}/>{customShortcuts.map(id=>{const r=QUICK_ROUTES.find(x=>x.id===id);return r&&perms.can(r.permission as any)?<QuickBtn key={id} icon={IPackage} label={r.label} onClick={()=>onOpenModule?.(r.id)}/>:null})}<button onClick={()=>setShortcutOpen(v=>!v)} style={{...ghostBtnStyle,padding:'8px 11px'}} title={t("Kısayol ekle")}><IPlus size={14}/></button>{shortcutOpen&&<div style={{position:'absolute',zIndex:60,top:40,right:0,width:300,background:'#fff',border:'1px solid #dfe3e8',borderRadius:8,boxShadow:'0 10px 26px rgba(15,23,42,.12)',padding:8}}>{shortcutMessage&&<div style={{fontSize:10,color:'#b45309',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:5,padding:'6px 8px',marginBottom:6}}><Ui value={shortcutMessage}/></div>}{allowedRoutes.map(r=>{const selected=customShortcuts.includes(r.id);return <div key={r.id} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 3px'}}><button onClick={()=>toggleShortcut(r.id)} style={{flex:1,textAlign:'left',border:0,background:selected?'#f0fdfa':'transparent',borderRadius:5,padding:'6px 8px',fontSize:11.5,cursor:'pointer',color:selected?'#0d9488':'#374151'}}><Ui value={selected?'✓ ':''}/><Ui value={r.label}/></button>{selected&&<><button style={iconBtnSm} onClick={()=>moveShortcut(r.id,-1)}>↑</button><button style={iconBtnSm} onClick={()=>moveShortcut(r.id,1)}>↓</button></>}</div>})}</div>}</div></section>
    {children}
    <section data-company-workflow><SectionLabel><Ui value={"İş Akışı ve Performans"}/></SectionLabel><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(148px,1fr))',gap:10,marginTop:8}}>{cards.map(c=><button key={c[1]} onClick={()=>{if(c[1]==='Son 7 Günde Teklifler')sessionStorage.setItem('plmr.projectCenter.quote7dFilter','1');if(c[1]==='Onaylanan Projeler')sessionStorage.setItem('plmr.projectCenter.approvedPipelineFilter','1');if(c[1]==='Sevkiyat Sürecinde')sessionStorage.setItem('plmr.projectCenter.initialStatusFilter','50');if(c[1]==='Sevk Edilen')sessionStorage.setItem('plmr.projectCenter.initialStatusFilter','60');onOpenModule?.(c[3])}} style={{textAlign:'left',background:'#fff',border:'1px solid #dde1e7',borderRadius:8,padding:'12px 13px',cursor:'pointer'}}><div style={{fontSize:10.5,color:'#9ca3af',fontWeight:600}}><Ui value={c[1]}/></div><div style={{fontSize:22,fontWeight:700,color:'#111827',marginTop:4,fontFamily:'var(--font-mono)'}}><Ui value={c[2]}/></div>{c[1]==='Son 7 Günde Teklifler'&&perms.can('commercial.price.view')&&Object.entries(quoteTotals).length>0&&<div style={{fontSize:9.5,color:'#64748b',marginTop:4,fontFamily:'var(--font-mono)'}}>{Object.entries(quoteTotals).map(([ccy,v])=>`${ccy} ${money(v)}`).join(' · ')}</div>}</button>)}{perms.can('dashboard.widget.order_total')&&perms.can('customer.orders.view')&&<button onClick={()=>{sessionStorage.setItem('plmr.customers.orderContext','1');onOpenModule?.('cariler')}} style={{background:'#fff',border:'1px solid #dde1e7',borderRadius:8,padding:'12px 13px',textAlign:'left',cursor:'pointer'}}><div style={{fontSize:10.5,color:'#9ca3af',fontWeight:600}}><Ui value={"Sipariş Toplamı"}/></div>{Object.keys(orderTotals).length===0?<div style={{fontSize:12,color:'#9ca3af',marginTop:5}}>—</div>:Object.entries(orderTotals).map(([ccy,v])=><div key={ccy} style={{fontSize:13,fontWeight:700,color:'#111827',marginTop:4,fontFamily:'var(--font-mono)'}}><Ui value={ccy}/> <Ui value={money(v)}/></div>)}</button>}</div><LiveWorkflowCharts projects={scopedProjects} showStatus={perms.can('dashboard.view')&&perms.can('project.view')} showQuotes={perms.can('dashboard.widget.quote_7d')&&perms.can('commercial.quote.view')} onOpenModule={onOpenModule} onOpenProject={onOpenProject}/><RoleDashboard role={currentUser.roleId} projects={scopedProjects} customers={scopedCustomers} orders={scopedOrders} onOpenProject={onOpenProject}/></section>
    {perms.can('dashboard.widget.alerts')&&alerts.length>0&&<section><SectionLabel><Ui value={"Dikkat Gerektirenler"}/></SectionLabel><div style={{marginTop:8,background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:8,overflow:'hidden'}}>{alerts.map(a=><button key={a.id} onClick={()=>{sessionStorage.setItem('plmr.open.customer',a.id);onOpenModule?.('cariler')}} style={{display:'block',width:'100%',textAlign:'left',padding:'9px 12px',border:0,borderBottom:'1px solid #ffedd5',background:'transparent',color:'#9a3412',fontSize:11.5,cursor:'pointer'}}><Ui value={a.text}/></button>)}</div></section>}
  </>
}

function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase', color: '#6b7280', ...style }}>{children}</div>
}

function NoteGroupLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#9ca3af', padding: '0 2px 5px', display: 'flex', alignItems: 'center', gap: 5 }}>{children}</div>
}

function QuickBtn({ icon: Icon, label, onClick, disabled=false }: { icon: React.ComponentType<SvgProps>; label: string; onClick?: () => void; disabled?: boolean }) {
  const [hov, setHov] = useState(false)
  return (
    <button disabled={disabled} onClick={onClick} onMouseEnter={() => !disabled&&setHov(true)} onMouseLeave={() => setHov(false)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', background: disabled?'#94a3b8':hov ? '#0b8076' : '#0d9488', border: 'none', borderRadius: 6, color: '#fff', fontSize: 12.5, fontWeight: 500, cursor: disabled?'not-allowed':'pointer', opacity:disabled?.55:1, whiteSpace: 'nowrap', transition: 'background 120ms', boxShadow: disabled?'none':hov ? '0 2px 8px rgba(13,148,136,0.35)' : '0 1px 3px rgba(13,148,136,0.2)' }}>
      <Icon size={14} /><Ui value={label}/>
    </button>
  )
}

interface SummaryCard { id: string; label: string; value: string; sub: string; icon: React.ComponentType<SvgProps>; accent: string; locked?: boolean }
function SummaryCardComp({ card }: { card: SummaryCard }) {
  const [hov, setHov] = useState(false)
  const [tip, setTip] = useState(false)
  const Icon = card.icon
  return (
    <div onMouseEnter={() => { setHov(true); if (card.locked) setTip(true) }} onMouseLeave={() => { setHov(false); setTip(false) }} style={{ position: 'relative', background: '#fff', border: `1px solid ${hov && !card.locked ? card.accent + '55' : '#dde1e7'}`, borderRadius: 8, padding: '12px 14px', cursor: card.locked ? 'not-allowed' : 'pointer', opacity: card.locked ? 0.55 : 1, transition: 'border-color 130ms, box-shadow 130ms', boxShadow: hov && !card.locked ? `0 2px 10px ${card.accent}18` : '0 1px 3px rgba(0,0,0,0.04)' }}>
      <Ui value={card.locked && <div style={{ position: 'absolute', top: 8, right: 8, color: '#9ca3af' }}><ILockIcon size={11} /></div>}/>
      {tip && card.locked && <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: '#1a2235', color: '#c9d1dc', fontSize: 11, padding: '5px 9px', borderRadius: 5, whiteSpace: 'nowrap', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.4)', pointerEvents: 'none' }}><Ui value={"Bu bölüme erişim yetkiniz yok."}/></div>}
      <div style={{ width: 28, height: 28, borderRadius: 7, background: card.accent + '14', border: `1px solid ${card.accent}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: card.accent, marginBottom: 8 }}><Icon size={14} /></div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#111827', fontFamily: 'var(--font-mono)', letterSpacing: -1, lineHeight: 1, marginBottom: 4 }}><Ui value={card.value}/></div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: '#374151', marginBottom: 2 }}><Ui value={card.label}/></div>
      <div style={{ fontSize: 10.5, color: '#9ca3af' }}><Ui value={card.sub}/></div>
      <Ui value={!card.locked && <div style={{ position: 'absolute', top: 0, left: 14, right: 14, height: 2, background: card.accent, borderRadius: '0 0 2px 2px', opacity: hov ? 1 : 0, transition: 'opacity 130ms' }} />}/>
    </div>
  )
}

const ILockIcon = ({ size = 11 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>

const ghostBtnStyle: React.CSSProperties = { padding: '4px 10px', background: 'transparent', border: '1px solid #dde1e7', borderRadius: 5, fontSize: 11.5, color: '#6b7280', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }
const iconBtnSm: React.CSSProperties = { width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', borderRadius: 3, cursor: 'pointer', padding: 0 }


