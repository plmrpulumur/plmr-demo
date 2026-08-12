(function(root){
  'use strict';
  const SCHEMA='plmr-project-wizard-v1';
  const STORAGE_KEY='plmr_project_wizard_draft_v1';
  const STEPS=Object.freeze(['PROJECT','PRODUCT','POSITIONS','REVIEW']);
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  const finite=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
  const normalizeText=v=>String(v||'').trim();
  const normalizeProduct=v=>String(v||'PERGO_RISE').trim().toUpperCase();
  function defaultPosition(index){return {id:`WPOS-${String(index+1).padStart(3,'0')}`,positionNo:`P${String(index+1).padStart(2,'0')}`,width:4000,height:3000,projection:6000,quantity:1,options:{}};}
  function initialDraft(seed){const source=seed&&typeof seed==='object'?seed:{};const positions=Array.isArray(source.positions)&&source.positions.length?source.positions.map((p,i)=>({...defaultPosition(i),...clone(p)})):[defaultPosition(0)];return {schema:SCHEMA,stepIndex:Math.max(0,Math.min(STEPS.length-1,Number(source.stepIndex)||0)),project:{customerName:normalizeText(source.project&&source.project.customerName),projectName:normalizeText(source.project&&source.project.projectName)},productType:normalizeProduct(source.productType),positions,metadata:{createdAt:source.metadata&&source.metadata.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()}};}
  function validateStep(draft,index){const step=STEPS[index];const errors=[];
    if(step==='PROJECT'){if(!normalizeText(draft.project.customerName))errors.push('Müşteri adı gerekli.');if(!normalizeText(draft.project.projectName))errors.push('Proje adı gerekli.');}
    if(step==='PRODUCT'&&!normalizeText(draft.productType))errors.push('Ürün seçimi gerekli.');
    if(step==='POSITIONS'){if(!draft.positions.length)errors.push('En az bir poz gerekli.');const used=new Set();draft.positions.forEach((p,i)=>{const no=normalizeText(p.positionNo);if(!no)errors.push(`${i+1}. poz numarası gerekli.`);else if(used.has(no.toUpperCase()))errors.push(`${no} poz numarası tekrar ediyor.`);else used.add(no.toUpperCase());if(finite(p.width)<=0)errors.push(`${no||i+1}: genişlik geçersiz.`);if(finite(p.height)<=0)errors.push(`${no||i+1}: yükseklik geçersiz.`);if(finite(p.quantity)<=0||!Number.isInteger(finite(p.quantity)))errors.push(`${no||i+1}: adet pozitif tam sayı olmalı.`);});}
    return Object.freeze({valid:errors.length===0,errors:Object.freeze(errors)});
  }
  function create(options){const opts=options&&typeof options==='object'?options:{};const storage=opts.storage||null;let draft=initialDraft(opts.initial);const listeners=new Set();
    function emit(type){draft.metadata.updatedAt=new Date().toISOString();const event=Object.freeze({schema:SCHEMA,type,step:STEPS[draft.stepIndex],draft:clone(draft)});listeners.forEach(fn=>{try{fn(event);}catch(_){}});return event;}
    function persist(){if(storage&&typeof storage.setItem==='function')storage.setItem(STORAGE_KEY,JSON.stringify(draft));return clone(draft);}
    function restore(){if(!storage||typeof storage.getItem!=='function')return clone(draft);const raw=storage.getItem(STORAGE_KEY);if(raw){try{draft=initialDraft(JSON.parse(raw));emit('restored');}catch(_){}}return clone(draft);}
    function clearPersistence(){if(storage&&typeof storage.removeItem==='function')storage.removeItem(STORAGE_KEY);}
    function update(patch){const next=typeof patch==='function'?patch(clone(draft)):patch;draft=initialDraft({...draft,...clone(next||{}),stepIndex:draft.stepIndex,metadata:draft.metadata});persist();emit('updated');return clone(draft);}
    function updateProject(patch){draft.project={...draft.project,...clone(patch||{})};persist();emit('project:updated');return clone(draft);}
    function setProduct(productType){draft.productType=normalizeProduct(productType);persist();emit('product:updated');return clone(draft);}
    function addPosition(seed){draft.positions.push({...defaultPosition(draft.positions.length),...clone(seed||{})});persist();emit('position:added');return clone(draft);}
    function updatePosition(id,patch){const item=draft.positions.find(p=>p.id===id);if(!item)throw new Error('WIZARD_POSITION_NOT_FOUND');Object.assign(item,clone(patch||{}));persist();emit('position:updated');return clone(draft);}
    function removePosition(id){if(draft.positions.length<=1)throw new Error('WIZARD_POSITION_MINIMUM');draft.positions=draft.positions.filter(p=>p.id!==id);draft.positions.forEach((p,i)=>{p.positionNo=p.positionNo||`P${String(i+1).padStart(2,'0')}`;});persist();emit('position:removed');return clone(draft);}
    function next(){const check=validateStep(draft,draft.stepIndex);if(!check.valid)return check;if(draft.stepIndex<STEPS.length-1)draft.stepIndex++;persist();emit('step:next');return Object.freeze({valid:true,complete:draft.stepIndex===STEPS.length-1,draft:clone(draft)});}
    function back(){if(draft.stepIndex>0)draft.stepIndex--;persist();emit('step:back');return clone(draft);}
    function reset(){draft=initialDraft();clearPersistence();emit('reset');return clone(draft);}
    function complete(){for(let i=0;i<STEPS.length-1;i++){const check=validateStep(draft,i);if(!check.valid)return check;}const output=Object.freeze({schema:SCHEMA,projectInfo:clone(draft.project),productType:draft.productType,positions:Object.freeze(draft.positions.map(p=>Object.freeze({...clone(p),productType:draft.productType}))),systemCount:draft.positions.length,widthInput:draft.positions.map(p=>p.width).join(';'),height:Math.max(...draft.positions.map(p=>finite(p.height))),projection:Math.max(...draft.positions.map(p=>finite(p.projection))) });persist();emit('completed');return Object.freeze({valid:true,output});}
    function subscribe(fn){if(typeof fn!=='function')throw new Error('WIZARD_LISTENER_REQUIRED');listeners.add(fn);return()=>listeners.delete(fn);}
    return Object.freeze({SCHEMA,STEPS,STORAGE_KEY,getDraft:()=>clone(draft),getStep:()=>STEPS[draft.stepIndex],validate:()=>validateStep(draft,draft.stepIndex),update,updateProject,setProduct,addPosition,updatePosition,removePosition,next,back,reset,complete,persist,restore,subscribe});
  }
  const api=Object.freeze({SCHEMA,STEPS,STORAGE_KEY,initialDraft,validateStep,create});root.PulumurProjectWizard=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
