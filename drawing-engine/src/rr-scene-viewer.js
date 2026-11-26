/* Structural member editing, environment dimensions and Push/Pull snapping. */
window.PLMRRollingRoofSceneTools=function(E){
'use strict';
const defaultContext={...E};
const T=THREE,C=window.PLMRRollingRoofSceneCore,canvas=E.renderer.domElement,ray=new T.Raycaster(),mouse=new T.Vector2();
let active='select',areaRoot=null,guide=null,snap=null,lock=null,alt=false,labels=[],referenceMode=true,member=null,memberOutline=null;
const overlay=document.createElement('div');overlay.id='rrSceneOverlay';document.body.appendChild(overlay);
const style=document.createElement('style');style.textContent='#rrSceneOverlay{position:absolute;inset:0;pointer-events:none;z-index:42}.rr-scene-dim{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;background:rgba(15,23,42,.90);color:#ef4444;border:1px solid rgba(239,68,68,.98);border-radius:4px;padding:3px 7px;font:700 12px/1.1 Segoe UI,Arial,sans-serif;box-shadow:0 1px 4px rgba(0,0,0,.24);cursor:text;white-space:nowrap}.rr-scene-dim.intermediate{color:#f59e0b;border-color:#f59e0b;font-size:7.8px;padding:2px 4.5px;border-radius:3px}.rr-scene-dim input{width:82px;border:0;outline:none;font:inherit;color:#ef4444;background:transparent}.rr-scene-dim:focus-within{border-color:#0d9488}.rr-scene-note{position:absolute;bottom:12px;left:12px;pointer-events:auto;padding:5px 8px;background:#fff;border:1px solid #cbd5e1;border-radius:6px;color:#334155;font:11px Arial}.rr-scene-note input{vertical-align:middle}';document.head.appendChild(style);
const ns='http://www.w3.org/2000/svg',dimensionLayer=document.createElementNS(ns,'svg');dimensionLayer.classList.add('three-dimension-layer');dimensionLayer.setAttribute('aria-hidden','true');overlay.prepend(dimensionLayer);
const dimStyle=document.createElement('style');dimStyle.textContent='.three-dimension-layer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}.screen-dimension-guide{filter:drop-shadow(0 1px 1px #64748b)}.screen-dimension-guide line{stroke:#fff;stroke-width:1.25;vector-effect:non-scaling-stroke;opacity:.96}.dimension-arrow{fill:#fff;stroke:none}.screen-dimension-guide.intermediate line{stroke:#f59e0b}.screen-dimension-guide.intermediate .dimension-arrow{fill:#f59e0b}.rr-member-panel{position:absolute;left:14px;top:14px;pointer-events:auto;z-index:65;width:260px;padding:14px;background:#fff;color:#334155;border:1px solid #dbe3ea;border-radius:9px;box-shadow:0 12px 32px rgba(15,23,42,.2);font:12px Segoe UI,Arial}.rr-member-panel[hidden]{display:none}.rr-member-panel h3{margin:0 0 10px;font-size:14px}.rr-member-panel label{display:block;margin:8px 0}.rr-member-panel input{width:100%;box-sizing:border-box;margin-top:6px;border:1px solid #cbd5e1;border-radius:5px;height:32px;padding:0 8px}.rr-member-panel button{padding:7px 11px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;font:600 12px Segoe UI;cursor:pointer;margin:8px 4px 0 0}.rr-member-panel .apply{background:#0284c7;color:#fff}.rr-member-panel .delete{color:#dc2626}.rr-member-panel small{display:block;margin-top:8px;color:#64748b}';document.head.appendChild(dimStyle);
const memberPanel=document.createElement('section');memberPanel.className='rr-member-panel';memberPanel.hidden=true;memberPanel.setAttribute('role','dialog');memberPanel.setAttribute('aria-label','Parçayı düzenle');memberPanel.innerHTML='<h3 id="rrMemberTitle"></h3><div id="rrMemberSection"></div><label id="rrMemberLabel">Uzunluk <input id="rrMemberLength" inputmode="decimal" aria-label="Parça uzunluğu"></label><button id="rrMemberSectionToggle">Dikme Kesitini Değiştir</button><div id="rrMemberSectionFields" hidden><label>Genişlik (mm)<input id="rrMemberWidth" aria-label="Dikme kesit genişliği (mm)" inputmode="numeric"></label><label>Derinlik (mm)<input id="rrMemberDepth" aria-label="Dikme kesit derinliği (mm)" inputmode="numeric"></label></div><div id="rrMemberError" role="status"></div><button id="rrMemberShift">Dikmeyi Kaydır</button><button class="delete" id="rrMemberDelete">Sil</button><button class="apply" id="rrMemberApply">Tamam</button><button id="rrMemberCancel">İptal</button><button id="rrMemberReset">Varsayılana Döndür</button><small id="rrMemberHint"></small>';overlay.appendChild(memberPanel);memberPanel.addEventListener('pointerdown',e=>e.stopPropagation());memberPanel.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape')closeMember();if(e.key==='Enter'){e.preventDefault();saveMember(false);}});
// Editing context follows the selected product. Measurement context always
// contains every visible product in the project and uses stable owner names.
const projections=new Map();
function measurementOwners(){
 const base=defaultContext.roofs().filter(o=>o.width>0&&o.depth>0).map(o=>({...o,measurementContext:defaultContext,sourceOwner:o,category:'Bioclimatic'}));
 for(const [key,context]of projections)for(const o of context.roofs())base.push({...o,id:key+'~'+o.id,measurementContext:context,sourceOwner:o,category:context.category||'Pergola'});
 return base.map(owner=>{
  owner.group.updateWorldMatrix(true,false);
  const position=owner.group.getWorldPosition(new T.Vector3()),axis=new T.Vector3(1,0,0).transformDirection(owner.group.matrixWorld);
  return {...owner,pose:{x:position.x,y:position.y-owner.height/2,z:position.z,angle:Math.atan2(axis.z,axis.x)*180/Math.PI},spec:{...owner.spec,sceneEditor:{...owner.spec.sceneEditor,groundY:0}}};
 });
}
function productMeasurements(){
 const out=[];
 for(const context of [defaultContext,...projections.values()]){
  const owners=measurementOwners().filter(o=>o.measurementContext===context),source=owners.map(o=>o.sourceOwner);
  const measures=context.productMeasurements?.()||window.PLMRV17Core?.measureDefinitions(source)||[];
  for(const m of measures){const owner=owners.find(o=>o.sourceOwner.id===m.owner);if(owner)out.push({...m,key:m.key??'intermediate',owner:owner.id,id:owner.id+'|'+m.id.slice(m.owner.length+1),offset:m.offset||[0,0,0]});}
  if(context===defaultContext)for(const o of owners){
   const height=o.height,clear=o.clearHeight;
   if(Number.isFinite(clear))for(const [key,value,x,title]of [['total-height',height,-o.width/2-850,'Toplam yükseklik'],['total-clear-height',clear,o.width/2+850,'Oluk altı yükseklik']])out.push({owner:o.id,moduleIndex:0,key,value,a:[x,-height/2,o.depth/2],b:[x,value-height/2,o.depth/2],offset:[0,0,0],id:o.id+'|'+key,title});
  }
 }
 return out;
}
const measurementEnvironment={...defaultContext,roofs:measurementOwners,productMeasurements,
 positionLabel:(o,index)=>o.measurementContext.positionLabel?.(o.sourceOwner,index)||window.PLMRV12Core.name(o.spec.pozNo,index),
 skipModuleHeight:(o,m)=>o.measurementContext.skipModuleHeight?.(o.sourceOwner,m)};
const measureViewer=window.PLMRV15MeasureViewer(measurementEnvironment);
const postEditor=window.PLMRV12PostEditor({get scene(){return E.scene;},canvas,post:(...args)=>E.post(...args),formatLength,inputScale,camera:E.camera,controls:E.controls,roofs:()=>E.roofs()});
document.getElementById('rrMemberShift').onclick=()=>{if(!member)return;const o=E.roofs().find(o=>o.id===member.owner),m=member.mesh;closeMember();postEditor.open(o,m);};
document.getElementById('rrMemberSectionToggle').onclick=()=>{const fields=document.getElementById('rrMemberSectionFields');fields.hidden=!fields.hidden;};
function units(){return E.state().dimensionUnits||{mm:true,inch:false};}
function formatLength(value){return window.PLMRUnits.formatMeasurement(value,units(),false);}
function inputUnit(){return window.PLMRUnits.inputUnitFromDisplay(units());}
function inputScale(){return window.PLMRUnits.mmPerUnit[inputUnit()];}
function closeMember(){memberPanel.hidden=true;member=null;dispose(memberOutline);memberOutline=null;canvas.focus({preventScroll:true});}
function openMember(o,m,options={}){
 if(window.parent.PLMRFinalReadOnly?.())return;
 closeMember();
 const data=m.userData,post=data.rrMemberAxis===1,beam=data.structuralBeam===true;
 const axes=beam?[1,2]:[0,2],length=data.p3dvSize[data.rrMemberAxis];
 member={owner:o.id,id:data.rrMemberId,mesh:m,beam,targets:options.targets||null};
 document.getElementById('rrMemberTitle').textContent=member.targets?'Seçili Dikmeler':beam?'Çelik Kiriş':post?'Dikme':'Mavi Profil';
 document.getElementById('rrMemberSection').textContent=member.targets?member.targets.length+' Dikme Seçili':data.name;
 const label=document.getElementById('rrMemberLabel');label.hidden=!!member.targets;
 label.firstChild.textContent=(beam?'Kiriş uzunluğu':post?'Dikme uzunluğu':'Profil uzunluğu')+' ('+inputUnit()+')';
 const input=document.getElementById('rrMemberLength');input.value=window.PLMRUnits.dimensionFromMm(String(length),inputUnit());member.initialInput=input.value;
 member.section={x:data.p3dvSize[axes[0]],z:data.p3dvSize[axes[1]]};member.initialSection={};
 for(const [id,key]of [['rrMemberWidth','x'],['rrMemberDepth','z']]){const field=document.getElementById(id);field.value=window.PLMRUnits.dimensionFromMm(String(member.section[key]),'mm');member.initialSection[key]=field.value;}
 const sectionToggle=document.getElementById('rrMemberSectionToggle');sectionToggle.hidden=!post&&!beam;
 sectionToggle.textContent=beam?'Kiriş Kesitini Değiştir':'Dikme Kesitini Değiştir';
 document.getElementById('rrMemberSectionFields').hidden=!member.targets;
 document.getElementById('rrMemberError').textContent='';
 const remove=document.getElementById('rrMemberDelete');remove.textContent=beam?'Kirişi Sil':post?'Dikmeyi Sil':'Profili Sil';remove.hidden=beam||!!member.targets;
 document.getElementById('rrMemberReset').hidden=!!member.targets;
 document.getElementById('rrMemberShift').hidden=!post||!!member.targets;
 document.getElementById('rrMemberHint').textContent=member.targets?'Kesit seçili bütün dikmelere tek işlemde uygulanır.':beam?'Kirişin üst kotu ve sistem dış ölçüleri korunur. Uzunluğu ve kesiti değiştirebilirsiniz.':post?'Üst bağlantı noktası sabit kalır. Sil: parçanın tamamını kaldırır.':'Profil merkezi sabit kalır. Sil: parçanın tamamını kaldırır.';
 memberPanel.hidden=false;document.getElementById('rrSketchHud').style.display='none';
 memberOutline=new T.BoxHelper(m,0x0284c7);E.scene.add(memberOutline);
 const focus=member.targets?document.getElementById('rrMemberWidth'):input;focus.focus();focus.select();
}
function openMembers(records){
 if(!records.length||records.some(r=>r.m.userData.rrMemberAxis!==1))throw Error('Dikmeleri seçin.');
 if(records.length===1)return openMember(records[0].o,records[0].m);
 openMember(records[0].o,records[0].m,{targets:records});
}
function saveMember(deleted){
 if(window.parent.PLMRFinalReadOnly?.()||!member)return;
 const text=document.getElementById('rrMemberLength').value,unit=inputUnit();
 const section=Object.fromEntries([['rrMemberWidth','x'],['rrMemberDepth','z']].map(([id,key])=>[key,document.getElementById(id).value===member.initialSection[key]?member.section[key]:Number(document.getElementById(id).value)]));
 const supportsSection=member.beam||member.mesh.userData.rrMemberAxis===1;
 if(supportsSection&&!Object.values(section).every(v=>Number.isFinite(v)&&v>0)){document.getElementById('rrMemberError').textContent='Geçerli kesit girin.';return;}
 const value=text===member.initialInput?member.mesh.userData.p3dvSize[member.mesh.userData.rrMemberAxis]:Number(window.PLMRUnits.dimensionToMm(text,unit));
 if(!deleted&&!member.targets&&(!window.PLMRUnits.validDimensionDraft(text,unit)||!Number.isFinite(value)||value<1||value>100000)){document.getElementById('rrMemberError').textContent='Uzunluk 1–100000 mm arasında olmalı.';return;}
 try{
  const command=member.targets?{type:'members',items:member.targets.map(({o,m})=>({id:o.id,memberId:m.userData.rrMemberId,section}))}:{type:'member',id:member.owner,memberId:member.id,length:value,deleted,...(supportsSection?{section}:{})};
  E.post('scene-commit',{command});closeMember();
 }catch(error){document.getElementById('rrMemberError').textContent=error.message;}
}
document.getElementById('rrMemberApply').onclick=()=>saveMember(false);document.getElementById('rrMemberDelete').onclick=()=>saveMember(true);document.getElementById('rrMemberCancel').onclick=closeMember;document.getElementById('rrMemberReset').onclick=()=>{if(!member)return;E.post('v13-member-reset',{owner:member.owner,memberId:member.id});closeMember();};
function pickable(m){for(let p=m;p;p=p.parent){if(!p.visible)return false;if(p===E.scene)return true;}return false;}
function memberHit(e){rayAt(e);const meshes=[];for(const o of E.roofs())o.group.traverse(m=>{if(m.isMesh&&pickable(m)&&!m.userData.zone&&!m.userData.isZonePicker&&!m.userData.isRoofZone)meshes.push(m);});for(const g of E.scene.children.filter(g=>g.userData.rrWallGroup||g.userData.rrEnvironment))g.traverse(m=>{if(m.isMesh&&pickable(m))meshes.push(m);});const hit=ray.intersectObjects(meshes,false)[0];if(!hit||!hit.object.userData.rrMemberId)return null;const o=E.roofs().find(o=>{for(let p=hit.object;p;p=p.parent)if(p===o.group)return true;return false;});return o?{o,m:hit.object}:null;}
const refToggle=document.createElement('label');refToggle.className='rr-scene-note';refToggle.innerHTML='<input type="checkbox" checked> Hizalama kılavuzları';refToggle.hidden=true;overlay.appendChild(refToggle);refToggle.querySelector('input').onchange=e=>{referenceMode=e.target.checked;clearGuide();};
function hud(title,value,hint){const n=document.getElementById('rrSketchHud');n.style.display='block';document.getElementById('rrSketchHudTitle').textContent=title;document.getElementById('rrSketchHudValue').textContent=value;document.getElementById('rrSketchHudHint').textContent=hint||'';}
function dispose(o){if(!o)return;if(o.parent)o.parent.remove(o);o.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material)(Array.isArray(n.material)?n.material:[n.material]).forEach(m=>m.dispose());});}
function project(p){const q=p.clone().project(E.camera),r=canvas.getBoundingClientRect();return {x:r.left+(q.x+1)*r.width/2,y:r.top+(1-q.y)*r.height/2,visible:q.z<1&&q.z>-1&&q.x>-1&&q.x<1&&q.y>-1&&q.y<1};}
function rayAt(e){const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);E.scene.updateMatrixWorld(true);E.camera.updateMatrixWorld(true);ray.setFromCamera(mouse,E.camera);}
function corners(o){const pts=[];for(const x of [-o.width/2,o.width/2])for(const y of [-o.height/2,o.height/2])for(const z of [-o.depth/2,o.depth/2])pts.push(o.group.localToWorld(new T.Vector3(x,y,z)));return pts;}
function clearGuide(){dispose(guide);guide=null;snap=null;}
function showGuide(a,b,label){clearGuide();guide=new T.Line(new T.BufferGeometry().setFromPoints([a,b]),new T.LineDashedMaterial({color:0x14b8a6,dashSize:60,gapSize:40,depthTest:false,transparent:true,opacity:.75}));guide.computeLineDistances();guide.renderOrder=70;E.scene.add(guide);snap={label,point:b.toArray()};}
function references(exclude){const points=[],planes=[];const g=Number(E.state().groundY);planes.push({normal:new T.Vector3(0,1,0),at:g,label:'Zemin kotu'});for(const o of E.roofs()){if(o.id===exclude)continue;const cs=corners(o);for(const p of cs)points.push({point:p,label:'Ürün köşesi'});const u=new T.Vector3(1,0,0).applyQuaternion(o.group.quaternion),v=new T.Vector3(0,1,0),t=new T.Vector3(0,0,1).applyQuaternion(o.group.quaternion),center=o.group.getWorldPosition(new T.Vector3());for(const [n,size,label]of [[u,o.width,'Ürün sınırı'],[t,o.depth,'Ürün sınırı'],[v,o.height,'Ürün kotu']])for(const sign of [-1,1]){const p=center.clone().addScaledVector(n,size/2*sign);planes.push({normal:n,at:n.dot(p),point:p,label});}const beam=center.clone();beam.y+=o.height/2-260;planes.push({normal:v,at:beam.y,point:beam,label:'Oluk alt kotu'});}
for(const w of E.walls()){if(w.id===exclude)continue;for(const s of w.solids||[]){for(const x of [s.min[0],s.max[0]])for(const y of [s.min[1],s.max[1]])for(const z of [s.min[2],s.max[2]])points.push({point:new T.Vector3(...C.wallPoint(w,[x,y,z])),label:'Duvar köşesi'});const f=w.frame||C.zoneFrame(w.zone);for(const [axis,key]of [[0,'u'],[1,'v'],[2,'t']])for(const value of [s.min[axis],s.max[axis]]){const p=s.min.slice();p[axis]=value;const world=new T.Vector3(...C.wallPoint(w,p)),n=new T.Vector3(...f[key]);planes.push({normal:n,at:n.dot(world),point:world,label:axis===1?'Duvar kotu':'Duvar yüzü'});}}}
for(const t of E.state().templates||[]){const ps=C.footprint(t,g);for(const p of ps)points.push({point:new T.Vector3(...p),label:'Alan köşesi'});planes.push({normal:new T.Vector3(0,1,0),at:g+t.elevation,point:new T.Vector3(...ps[0]),label:'Platform üstü'});}
return {points,planes};}
// Screen tolerance is independent of zoom. Leaving the tolerance releases the suggestion.
function snapDisplacement(start,n,delta,e,exclude){if(!referenceMode||e.altKey||alt){clearGuide();return {delta};}const target=start.clone().addScaledVector(n,delta),refs=references(exclude);let best=null,d=11;for(const plane of refs.planes){const dot=plane.normal.dot(n);if(Math.abs(dot)<.999)continue;const value=(plane.at-plane.normal.dot(start))/dot,p=start.clone().addScaledVector(n,value),A=project(target),B=project(p),dist=Math.hypot(A.x-B.x,A.y-B.y);if(dist<d&&B.visible){d=dist;best={delta:value,point:p,label:plane.label,ref:plane.point||p};}}if(snap&&Number.isFinite(snap.delta)){const held=new T.Vector3(...snap.point),A=project(target),B=project(held);if(Math.hypot(A.x-B.x,A.y-B.y)<18)best={delta:snap.delta,point:held,ref:held,label:snap.label};}if(lock)best=lock;if(best){showGuide(best.ref,best.point,best.label);snap.delta=best.delta;return best;}clearGuide();return {delta};}
function cancel(){lock=null;clearGuide();}
function command(cmd){if(cmd.type==='units')E.post('scene-commit',{command:cmd});}
function up(e){
 if(active!=='select'||window.parent.PLMRFinalReadOnly?.())return false;
 rayAt(e);
 const dim=measureViewer.hit(ray);
 if(dim){
  if(dim.zoneId){const z=E.zones().find(m=>m.userData.zone.id===dim.zoneId&&m.userData.zone.owner===dim.owner)?.userData.zone;if(z)E.post('select-zone',{zone:z});}
  else if(dim.owner)E.post('v13-edit-position',{owner:dim.owner,moduleIndex:dim.moduleIndex});
  return true;
 }
 const hit=memberHit(e);
 if(hit){openMember(hit.o,hit.m);return true;}
 if(member)closeMember();
 return false;
}
function setTool(t){closeMember();cancel();active=t;refToggle.style.display=t==='pushpull'?'block':'none';}
function key(e){if(e.key==='Alt')alt=true;if(e.key==='Shift'&&snap)lock={...snap,point:new T.Vector3(...snap.point),ref:new T.Vector3(...snap.point),delta:snap.delta};}
function keyUp(e){if(e.key==='Alt')alt=false;if(e.key==='Shift')lock=null;}
function addLabel(id,key,value,point,title,mapValue=n=>n){const button=document.createElement('button');button.type='button';button.className='rr-scene-dim';button.dataset.objectId=id;button.dataset.key=key;button.title=title+' · tıkla, ölçü yaz, Enter';const text=()=>key==='angle'?Number(value.toFixed(2))+'°':formatLength(value);button.textContent=text();button.addEventListener('pointerdown',e=>e.stopPropagation());button.addEventListener('click',e=>{e.stopPropagation();if(button.querySelector('input'))return;const input=document.createElement('input');input.type='text';input.value=key==='angle'?String(Number(value.toFixed(2))):window.PLMRUnits.dimensionFromMm(String(value),inputUnit());input.setAttribute('aria-label',title);button.replaceChildren(input);input.focus();input.select();const initialInput=input.value;let restoring=false;const restore=()=>{if(restoring)return;restoring=true;input.removeEventListener('blur',restore);button.replaceChildren(document.createTextNode(text()));};input.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){restore();return;}if(e.key==='Enter'){e.preventDefault();if(input.value===initialInput){restore();canvas.focus({preventScroll:true});return;}const n=Number(input.value.replace(',','.'))*(key==='angle'?1:inputScale());if(!Number.isFinite(n)){input.style.color='#dc2626';return;}E.post('scene-commit',{command:{type:id==='roof-main'?'main-dimension':id.startsWith('roof-copy')?'copy-dimension':'template-dimension',id,key,value:mapValue(n)}});restore();canvas.focus({preventScroll:true});}});input.addEventListener('blur',restore);});overlay.appendChild(button);labels.push({button,point,key,value,text});}
function rebuildAreas(){dispose(areaRoot);areaRoot=new T.Group();areaRoot.userData.rrEnvironment=true;E.scene.add(areaRoot);for(const l of labels)l.button.remove();labels=[];dimensionLayer.replaceChildren();const ground=Number(E.state().groundY);for(const t of E.state().templates||[]){const ps=C.footprint(t,ground).map(p=>new T.Vector3(...p)),points=[ps[0],ps[1],ps[2],ps[0],ps[2],ps[3]],geo=new T.BufferGeometry().setFromPoints(points);geo.computeVertexNormals();const plane=new T.Mesh(geo,new T.MeshStandardMaterial({color:0xd6d3d1,side:T.DoubleSide,roughness:.95,transparent:true,opacity:.8}));plane.userData.areaId=t.id;areaRoot.add(plane);const line=new T.LineLoop(new T.BufferGeometry().setFromPoints(ps),new T.LineBasicMaterial({color:0x64748b}));areaRoot.add(line);{const bottom=ps[0].y-250,vs=[];for(let i=0;i<4;i++){const a=ps[i],b=ps[(i+1)%4],c=new T.Vector3(b.x,bottom,b.z),d=new T.Vector3(a.x,bottom,a.z);vs.push(a,b,c,a,c,d);}vs.push(...[ps[0],ps[2],ps[1],ps[0],ps[3],ps[2]].map(p=>new T.Vector3(p.x,bottom,p.z)));const g=new T.BufferGeometry().setFromPoints(vs);g.computeVertexNormals();const sides=new T.Mesh(g,new T.MeshStandardMaterial({color:0xa8a6a0,side:T.DoubleSide,roughness:.98}));sides.userData.presentationDecoration=true;sides.userData.slabDepth=250;areaRoot.add(sides);}
const mid=(a,b)=>a.clone().add(b).multiplyScalar(.5).add(new T.Vector3(0,35,0));addLabel(t.id,'width',t.width,mid(ps[0],ps[1]),'Alan genişliği');addLabel(t.id,'depth',t.depth,mid(ps[0],ps[3]),'Alan derinliği');addLabel(t.id,'angle',t.angle,ps[0].clone().add(new T.Vector3(160,45,160)),'Köşe açısı');addLabel(t.id,'angle',180-t.angle,ps[1].clone().add(new T.Vector3(-160,45,160)),'Köşe açısı',n=>180-n);addLabel(t.id,'angle',t.angle,ps[2].clone().add(new T.Vector3(-160,45,-160)),'Köşe açısı');addLabel(t.id,'angle',180-t.angle,ps[3].clone().add(new T.Vector3(160,45,-160)),'Köşe açısı',n=>180-n);if(t.type!=='terrace'&&t.type!=='platform')addLabel(t.id,'height',t.height,ps[0].clone().add(new T.Vector3(0,t.height/2,0)),'Duvar yüksekliği');addLabel(t.id,'elevation',t.elevation,ps[2].clone().add(new T.Vector3(0,45,0)),'Zemin kot farkı');}
for(const o of measurementOwners()){for(const m of o.spec?.freedomLayout?.modules||[]){const badge=document.createElement('button');badge.className='rr-scene-dim rr-poz-badge';badge.type='button';badge.textContent=measurementEnvironment.positionLabel(o,m.moduleIndex);badge.style.cssText='color:#334155;background:#ffffffdd;border-color:#cbd5e1;font:600 6.5px Segoe UI;cursor:pointer;padding:2px 4px';badge.dataset.positionCode=o.spec.sceneEditor?.bioCodes?.[m.moduleIndex]||badge.textContent;badge.onclick=e=>{e.stopPropagation();if(e.ctrlKey||e.metaKey){E.post('v17-annotation-toggle',{item:{kind:'information',code:badge.dataset.positionCode,key:'information:'+badge.dataset.positionCode}});return;}o.measurementContext.post('v13-edit-position',{owner:o.sourceOwner.id,moduleIndex:m.moduleIndex});};overlay.append(badge);labels.push({button:badge,point:()=>o.group.localToWorld(new T.Vector3(m.centerX||0,o.height/2+220,m.centerZ||0)),text:()=>measurementEnvironment.positionLabel(o,m.moduleIndex),poz:true});}}
measureViewer.rebuild();


}
function updateOverlay(){measureViewer.tick();const occupied=[];
for(const l of labels){let p=project(typeof l.point==='function'?l.point():l.point);let visible=p.visible&&(l.poz||((l.intermediate?E.dimensionVisibility().intermediate:E.dimensionVisibility().main)!==false)&&(l.key==='angle'||units().mm||units().inch||units().ft)&&(l.totalMeasure?E.dimensionVisibility().total!==false:l.positionMeasure?E.dimensionVisibility().positions!==false:true));if(!l.button.querySelector('input'))l.button.textContent=l.text();if(l.guide){const A=project(l.guide.a()),B=project(l.guide.b()),c=project(l.guide.center()),dx=B.x-A.x,dy=B.y-A.y,len=Math.hypot(dx,dy);let nx=-dy/(len||1),ny=dx/(len||1);const mx=(A.x+B.x)/2,my=(A.y+B.y)/2;if((mx-c.x)*nx+(my-c.y)*ny<0){nx=-nx;ny=-ny;}const a={x:A.x+nx*30,y:A.y+ny*30},b={x:B.x+nx*30,y:B.y+ny*30};p={...p,x:(a.x+b.x)/2+nx*11,y:(a.y+b.y)/2+ny*11};visible=visible&&A.visible&&B.visible&&len>20;const arrow=(q,sign)=>`${q.x},${q.y} ${q.x+sign*dx/(len||1)*6+nx*2.8},${q.y+sign*dy/(len||1)*6+ny*2.8} ${q.x+sign*dx/(len||1)*6-nx*2.8},${q.y+sign*dy/(len||1)*6-ny*2.8}`;l.g.innerHTML=`<line x1="${A.x}" y1="${A.y}" x2="${a.x+nx*4}" y2="${a.y+ny*4}"/><line x1="${B.x}" y1="${B.y}" x2="${b.x+nx*4}" y2="${b.y+ny*4}"/><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/><polygon class="dimension-arrow" points="${arrow(a,1)}"/><polygon class="dimension-arrow" points="${arrow(b,-1)}"/>`;l.g.style.display=visible?'':'none';}
if(l.poz)visible=visible&&E.dimensionVisibility().information!==false&&E.dimensionVisibility().infoIds?.[l.button.dataset.positionCode]!==false;
l.button.style.pointerEvents=!l.totalMeasure&&active==='select'&&!(E.bulk&&E.bulk())?'auto':'none';l.button.style.display=visible?'block':'none';if(visible){const original={x:p.x,y:p.y},w=l.button.offsetWidth+8,h=l.button.offsetHeight+7,rect=canvas.getBoundingClientRect();const overlaps=q=>occupied.some(b=>Math.abs(q.x-b.x)<(w+b.w)/2&&Math.abs(q.y-b.y)<(h+b.h)/2);for(let attempt=0;attempt<32&&overlaps(p);attempt++){const distance=(Math.floor(attempt/2)+1)*(h+5),sign=attempt%2?1:-1;p.y=Math.max(rect.top+h/2+4,Math.min(rect.bottom-h/2-4,original.y+distance*sign));}occupied.push({x:p.x,y:p.y,w,h});if(l.g&&Math.abs(p.y-original.y)>.5){const leader=document.createElementNS(ns,'line');leader.setAttribute('x1',original.x);leader.setAttribute('y1',original.y);leader.setAttribute('x2',p.x);leader.setAttribute('y2',p.y);l.g.appendChild(leader);}}l.button.style.left=p.x+'px';l.button.style.top=p.y+'px';}}

function fit(){const box=new T.Box3();for(const o of E.roofs())for(const p of corners(o))box.expandByPoint(p);for(const w of E.walls())for(const cell of w.solids||[])for(const x of [cell.min[0],cell.max[0]])for(const y of [cell.min[1],cell.max[1]])for(const z of [cell.min[2],cell.max[2]])box.expandByPoint(new T.Vector3(...C.wallPoint(w,[x,y,z])));for(const t of E.state().templates||[])for(const p of C.footprint(t,Number(E.state().groundY)))box.expandByPoint(new T.Vector3(...p));window.PLMRDrawingRuntime.fitBounds(box);}
function rebuild(){postEditor.close();closeMember();cancel();rebuildAreas();updateOverlay();}
function error(message){cancel();hud('İşlem uygulanmadı',message,'Ölçüyü/konumu düzeltip tekrar deneyin.');}
// Only the screen overlay is cached. Geometry, camera and canonical data stay live.
let disposed=false,overlayActive=true,overlayFrame=0,overlayStamp='';
function screenStamp(){
 const rect=canvas.getBoundingClientRect();
 const roofs=measurementOwners().map(roof=>{
  roof.group.updateWorldMatrix(true,false);
  return [roof.id,roof.group.uuid,...roof.group.matrixWorld.elements];
 });
 return JSON.stringify([
  E.camera.matrixWorld.elements,E.camera.projectionMatrix.elements,
  rect.left,rect.top,rect.width,rect.height,roofs,E.state().dimensionUnits,
  E.dimensionVisibility(),active,labels.length,
  Boolean(E.bulk?.()),Boolean(overlay.querySelector('input'))
 ]);
}
function tick(){
 overlayFrame=0;
 if(disposed||!overlayActive)return;
 if(!document.hidden){
  const stamp=screenStamp();
  if(stamp!==overlayStamp){overlayStamp=stamp;updateOverlay();}
 }
 overlayFrame=requestAnimationFrame(tick);
}
function setActive(value){
 overlayActive=Boolean(value);
 if(overlayActive&&!overlayFrame){overlayStamp='';overlayFrame=requestAnimationFrame(tick);}
 else if(!overlayActive){cancelAnimationFrame(overlayFrame);overlayFrame=0;}
}
overlayFrame=requestAnimationFrame(tick);
window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(overlayFrame);},{once:true});
let projectStamp='';
return {measurementOwners,projectMeasurements:()=>measureViewer.inspect(),
 registerProjection(key,context){projections.set(key,context);rebuild();return()=>{projections.delete(key);rebuild();};},
 refreshProject(){const stamp=measurementOwners().map(o=>o.id+o.group.uuid+o.width+o.depth+o.height).join('|');if(stamp!==projectStamp){projectStamp=stamp;rebuild();}},
 setContext(context){
 closeMember();postEditor.close();cancel();
 for(const key of Object.keys(E))if(!(key in defaultContext))delete E[key];
 Object.assign(E,defaultContext,context||{});
 measureViewer.rebind();rebuild();
},openMember,openMembers,setActive,measureHit:ray=>measureViewer.hit(ray),measureSelected:keys=>measureViewer.selected(keys),refreshDimensions:()=>measureViewer.tick(),measurements:()=>measureViewer.inspect(),memberHit:e=>{const h=memberHit(e);return h?{owner:h.o.id,id:h.m.userData.rrMemberId}:null;},escape:()=>{if(postEditor.active()){postEditor.close();return true;}if(member){closeMember();return true;}cancel();document.getElementById('rrSketchHud').style.display='none';return false;},postEditor,clearSelection:()=>{closeMember();postEditor.close();document.getElementById('rrSketchHud').style.display='none';},refreshUnits:()=>{postEditor.close();closeMember();updateOverlay();},formatLength,inputScale,fit,rebuild,up,setTool,key,keyUp,cancel,command,error,references,snapDisplacement,clearGuide,project,getState:()=>({member:member?{owner:member.owner,id:member.id}:null,active,snap:snap?{...snap}:null,roofs:E.roofs().map(o=>({id:o.id,pose:o.pose,renderedPose:{x:o.group.position.x,y:o.group.position.y-Number(E.state().groundY)-o.height/2,z:o.group.position.z,angle:-o.group.rotation.y*180/Math.PI},width:o.width,height:o.height,depth:o.depth,corners:corners(o).map(p=>p.toArray()),screens:corners(o).map(project)})),templates:E.state().templates})};
};
