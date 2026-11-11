import {fileContentType} from '../services/projectFileStorage'
import type {ProjectAttachment} from '../domain/attachment'
import {beginOperation} from '../services/operationProgress'
import {Ui,t} from '../i18n/react'
import { useEffect, useRef, useState } from 'react'
import { useAttachmentStore } from '../state/AttachmentStore'
import { formatDate } from '../utils/formatters'
function fmtBytes(n:number){if(n<1024)return`${n} B`;if(n<1024*1024)return`${(n/1024).toFixed(1)} KB`;return`${(n/1024/1024).toFixed(1)} MB`}
const PREVIEWABLE=new Set(['pdf','jpg','jpeg','png','webp','txt','csv'])
export default function ProjectAttachments({projectId,revisionId,compact=false,readOnly=false}:{projectId:string;revisionId?:string|null;compact?:boolean;readOnly?:boolean}){const{forProject,deletedForProject,addFiles,remove,restore,rename,loadFiles,getUrl,fileProjectState}=useAttachmentStore();const rows=forProject(projectId);const deleted=deletedForProject(projectId).filter(a=>a.deletedAt&&Date.now()-Date.parse(a.deletedAt)<30*86400_000);const input=useRef<HTMLInputElement>(null),uploading=useRef(false);const [busy,setBusy]=useState(false);const[drag,setDrag]=useState(false);const[msg,setMsg]=useState('');const[fileError,setFileError]=useState('');
const [loadingProject,setLoadingProject]=useState('');
const waitingForFiles=loadingProject===projectId&&Boolean(projectId);
const fileState=fileProjectState(projectId)
const fetchFiles=()=>{setFileError('');void loadFiles(projectId).catch(error=>setFileError(error.message))};
const mayLoad=fileState!=='unavailable'
useEffect(()=>{if(!mayLoad||!projectId||projectId.startsWith('project-entry:')||projectId.startsWith('final-draft-'))return;
 let alive=true
 setFileError('')
 const notice=fileState==='waiting'?window.setTimeout(()=>{if(alive)setLoadingProject(projectId)},300):undefined
 void loadFiles(projectId).catch(error=>{if(alive)setFileError(error.message)}).finally(()=>{clearTimeout(notice);if(alive)setLoadingProject('')})
 return()=>{alive=false;clearTimeout(notice);setLoadingProject('')}

},[loadFiles,projectId,mayLoad]);
async function openFile(file:ProjectAttachment,download:boolean){
 const popup=download?null:window.open('about:blank','_blank')
 if(!download&&!popup){setMsg('Dosya önizlemesi için açılır pencereye izin verin.');return}
 if(popup)popup.opener=null
 try{
  const url=await getUrl(file,download)
  if(download){
   const anchor=document.createElement('a');anchor.href=url;anchor.download=file.displayName;anchor.rel='noreferrer';anchor.click()
  }else{
   const response=await fetch(url,{referrerPolicy:'no-referrer'})
   if(!response.ok)throw Error('Dosya okunamadı.')
   const type=fileContentType(file.extension)
   const blob=new Blob([await response.blob()],{type})
   const objectUrl=URL.createObjectURL(blob)
   popup?.location.replace(objectUrl)
   setTimeout(()=>URL.revokeObjectURL(objectUrl),60000)
  }
 }catch(error){popup?.close();setMsg((error as Error).message)}
}
const onFiles=async(list:FileList|null)=>{if(readOnly||fileState==='waiting'||!list||uploading.current)return;uploading.current=true;setBusy(true);const operation=beginOperation('Proje dosyaları yükleniyor…');try{const r=await addFiles(projectId,Array.from(list),revisionId,value=>operation.update(value));setMsg(r.errors.length?r.errors.join(' · '):`${r.added} dosya eklendi.`)}catch(e){setMsg((e as Error).message||'Dosya eklenemedi.')}finally{uploading.current=false;setBusy(false);operation.end();if(input.current)input.current.value=''}};return <section style={{background:'#fff',border:'1px solid #dbe3ea',borderRadius:8,overflow:'hidden'}}><div style={{height:38,display:'flex',alignItems:'center',padding:'0 10px',borderBottom:'1px solid #edf1f5'}}><strong style={{fontSize:11,color:'#0f766e',letterSpacing:.45}}><Ui value={"PROJE DOSYALARI"}/></strong><span style={{marginLeft:7,fontSize:9,color:'#64748b',background:'#f1f5f9',padding:'1px 5px',borderRadius:4}}><Ui value={rows.length}/></span></div><div style={{padding:10}}>{waitingForFiles&&<p role="status"><Ui value="Proje kaydı doğrulanıyor, dosyalar hazırlanıyor…"/></p>}<div onDragOver={e=>{e.preventDefault();if(!readOnly)setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);if(!readOnly)void onFiles(e.dataTransfer.files)}} style={{border:`1.5px dashed ${drag?'#0d9488':'#cbd5e1'}`,background:drag?'#f0fdfa':'#f8fafc',borderRadius:7,padding:compact?'8px':'12px',display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontSize:10,color:'#64748b'}}><Ui value={readOnly?'Proje dosyaları salt okunur':'Dosyaları buraya sürükleyip bırakın'}/> {!readOnly&&<><button disabled={busy||fileState==='waiting'} onClick={()=>input.current?.click()} style={{height:26,padding:'0 9px',border:'1px solid #dbe3ea',borderRadius:5,background:'#fff',fontSize:9.5,fontWeight:700,cursor:'pointer'}}><Ui value={"Dosya Seç"}/></button><input ref={input} type="file" multiple hidden onChange={e=>void onFiles(e.target.files)}/></>}</div>{fileError&&<div role="alert"><Ui value={fileError}/> <button onClick={fetchFiles}><Ui value="Tekrar Dene"/></button></div>}{msg&&<div style={{fontSize:9,color:msg.includes('desteklenmeyen')||msg.includes('limiti')?'#b91c1c':'#0f766e',marginTop:5}}><Ui value={msg}/></div>}{rows.length>0&&<div style={{marginTop:8,border:'1px solid #edf1f5',borderRadius:6,overflow:'auto',maxHeight:compact?135:220}}>{rows.map(a=><div key={a.attachmentId} style={{display:'grid',gridTemplateColumns:compact?'repeat(4,minmax(0,1fr))':'1.45fr .45fr .6fr .75fr .75fr auto',gap:7,alignItems:'center',padding:'6px 8px',borderBottom:'1px solid #f1f5f9',fontSize:9.5}}><span title={a.originalFileName} style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'#334155',gridColumn:compact?'1 / -1':undefined}}><Ui value={a.displayName}/></span><span style={{color:'#64748b',textTransform:'uppercase'}}><Ui value={a.extension}/></span><span style={{color:'#64748b'}}><Ui value={fmtBytes(a.sizeBytes)}/></span><span style={{color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}><Ui value={a.uploadedBy}/></span><span style={{color:'#94a3b8'}}><Ui value={formatDate(a.uploadedAt)}/></span><span style={{display:'flex',gap:3,gridColumn:compact?'1 / -1':undefined,flexWrap:'wrap'}}>{PREVIEWABLE.has(a.extension)&&<button onClick={()=>void openFile(a,false)} style={mini}><Ui value={"Önizle"}/></button>}{<button onClick={()=>void openFile(a,true)} style={mini}><Ui value="İndir"/></button>}{!readOnly&&!a.legacy&&<><button onClick={()=>{const n=prompt(t('Yeni dosya adı'),a.displayName);if(n)void rename(a.attachmentId,n).catch(e=>setMsg(e.message))}} style={mini}><Ui value={"Ad"}/></button><button onClick={()=>{if(confirm(t('Dosya silinsin mi?')))void remove(a.attachmentId).catch(e=>setMsg(e.message))}} style={{...mini,color:'#b91c1c'}}><Ui value={"Sil"}/></button></>}</span></div>)}</div>}{!readOnly&&deleted.length>0&&<details><summary><Ui value="Silinen dosyalar"/></summary>{deleted.map(a=><div key={a.attachmentId}>{a.displayName} <button style={mini} onClick={()=>void restore(a.attachmentId).catch(e=>setMsg(e.message))}><Ui value="Geri yükle"/></button></div>)}</details>}</div></section>}
const mini:React.CSSProperties={height:22,padding:'0 5px',border:'1px solid #dbe3ea',borderRadius:4,background:'#fff',color:'#475569',fontSize:8.5,cursor:'pointer'}
