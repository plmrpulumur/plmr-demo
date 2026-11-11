import {awaitProjectMasterSave} from '../services/cloudPlatform'
import {useRef,useState} from 'react'
import {Ui,t} from '../i18n/react'
import {Modal,blueBtn,smallSecondary} from './WorkspaceForm'
import {APPROVAL_STAGES,approvalLabels,approvalPermissions,type ApprovalStage} from '../domain/projectApprovals'
import type {ProjectMaster} from '../domain/project'
import type {DrawingProjectRecord} from '../services/drawingPersistence'
import {approveProject} from '../services/projectApprovals'
import {usePermissionResolver} from '../state/PermissionContext'
import {useProjectStore} from '../state/ProjectStore'
import {useAuditStore} from '../state/AuditStore'
import type {ProjectOverview} from '../domain/projectOverview'

const colors={quote:'#0d9488',package:'#7c3aed',production:'#0891b2',shipment:'#16a34a'}
export default function ProjectApprovalActions({project,record,overview,readOnly,onApproved,compact=false,onBusy}:{project:ProjectMaster;record:DrawingProjectRecord|null;overview?:ProjectOverview|null;readOnly:boolean;onApproved:(next?:DrawingProjectRecord)=>void;compact?:boolean;onBusy?:(busy:boolean)=>void}) {
 const perms=usePermissionResolver(),store=useProjectStore()
 const audit=useAuditStore()
 const [pending,setPending]=useState<ApprovalStage|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const approvals=overview?.approvals||project.approvals
 const version=overview?.workflowVersion??record?.workflow?.version??project.workflowVersion
 const committing=useRef(false)
 const inactive=readOnly||project.status==='iptal'||project.status==='arsivlendi'
 async function commit(){
  if(!pending||version===undefined||committing.current||inactive)return
  committing.current=true
  setBusy(true);onBusy?.(true);setError('')
  try {
   const stage=pending;
   const current=await store.hydrateProject(project.projKodu)||project;
   const next=await approveProject(project.projKodu,stage,version,current,record||undefined)
   const master=store.syncWorkflowProject(next),stamp=next.workflow!.approvals![stage]!
   await awaitProjectMasterSave(master.id)
   audit.record({actorUserId:stamp.by,actorDisplaySnapshot:stamp.name,timestamp:stamp.at,eventType:'PROJECT_APPROVED',entityType:'PROJECT',entityId:project.projectId||project.projKodu,entityDisplaySnapshot:project.projKodu,oldValue:{status:project.status},newValue:{status:master.status},details:approvalLabels[stage],metadata:{activityLabel:approvalLabels[stage],status:master.status,revision:master.revizyon,note:'Onaylandı.'}})
   setPending(null);onApproved(next)
  }
  catch(e){setError(e instanceof Error?e.message:String(e));onApproved()}
  finally {committing.current=false;setBusy(false);onBusy?.(false)}
 }
 return <section data-project-approvals style={{display:compact?'grid':'flex',gridTemplateColumns:compact?'repeat(2,minmax(0,1fr))':undefined,alignItems:'stretch',gap:7,flexWrap:'wrap',padding:compact?'8px':'12px',background:'#fff',border:'1px solid #dbe3ea',borderRadius:8}}>
  {APPROVAL_STAGES.map((stage,i)=>{const done=!!approvals?.[stage],blocked=i>0&&!approvals?.[APPROVAL_STAGES[i-1]];return <button key={stage} data-approval={stage} disabled={inactive||busy||done||blocked||version===undefined||!perms.can(approvalPermissions[stage])} onClick={()=>{setError('');setPending(stage)}} style={{padding:'8px 10px',border:'1px solid '+colors[stage],borderRadius:6,fontSize:10,fontWeight:700,color:done?colors[stage]:'#fff',background:done?'#fff':colors[stage],opacity:blocked?.5:1,cursor:'pointer'}}><Ui value={approvalLabels[stage]}/>{done?' ✓':''}</button>})}
  {error&&<p role="alert" style={{width:'100%',gridColumn:'1 / -1',color:'#b91c1c',fontSize:11,margin:0}}><Ui value={error}/></p>}
  {pending&&<Modal eyebrow="ONAY" title={approvalLabels[pending]} onClose={()=>{if(!busy)setPending(null)}} footer={<><button disabled={busy} style={smallSecondary()} onClick={()=>setPending(null)}><Ui value="Vazgeç"/></button><button disabled={busy} style={blueBtn()} onClick={()=>void commit()}><Ui value={busy?"Proje onaylanıyor…":"Onayla"}/></button></>}><p style={{fontSize:12,color:'#334155'}}><Ui value="Bu aşama onaylanacak ve ilgili kayıtlar kilitlenecek. Devam edilsin mi?"/></p>{error&&<p role="alert"><Ui value={error}/></p>}</Modal>}
 </section>
}
