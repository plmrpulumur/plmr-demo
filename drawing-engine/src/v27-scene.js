/* Muted presentation materials share the existing renderer and never alter product data. */
(function(root){'use strict';const T=root.THREE,cache=new Map();let E,decor,liftGroup,stamp='',current={},baseFov=38,checkFrame=0,lastCameraPosition;
const wallOptions=[['brick','İngiliz tipi tuğla'],['stone','Örme taş duvar'],['white','Kırık beyaz sıva'],['grey','Gri sıva'],['sand','Krem sıva']];
function texture(kind){if(cache.has(kind))return cache.get(kind);const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d');let seed=129;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;},colors={brick:'#ad9388',stone:'#b8b2a6',wood:'#9d8b75',deck:'#9b8975',laminate:'#b4a18a',tile:'#c6c3bb',concrete:'#b7b8b6',gravel:'#b4b0a6',plaster:'#f7f7f7'};x.fillStyle=colors[kind]||'#b9b7b1';x.fillRect(0,0,512,512);
if(['wood','deck','laminate'].includes(kind)){for(let row=0;row<6;row++){const y=row*512/6;x.fillStyle=row%2?'#ffffff07':'#00000005';x.fillRect(0,y,512,512/6);x.fillStyle='#6b615733';x.fillRect(0,y,512,1.2);x.fillRect(row%2?256:0,y,1,512/6);for(let n=0;n<18;n++){x.strokeStyle=rand()>.5?'#ffffff0b':'#554c410e';x.beginPath();x.moveTo(0,y+rand()*80);x.bezierCurveTo(160,y+rand()*80,350,y+rand()*80,512,y+rand()*80);x.stroke();}}}
else if(kind==='brick'||kind==='stone'){x.fillStyle=kind==='brick'?'#b9afa7':'#b9b6af';x.fillRect(0,0,512,512);const h=kind==='brick'?64:128,w=kind==='brick'?128:256;for(let y=0;y<512;y+=h)for(let col=-1;col<=512/w;col++){const offset=((y/h)%2)*w/2;x.fillStyle=kind==='brick'?`hsl(${19+rand()*4},${14+rand()*5}%,${58+rand()*5}%)`:`hsl(40,${6+rand()*4}%,${64+rand()*5}%)`;x.fillRect(col*w+offset+1.2,y+1.2,w-2.4,h-2.4);}}
else if(kind==='tile'){x.strokeStyle='#a9a8a266';x.lineWidth=1.4;for(let y=0;y<512;y+=256)for(let z=0;z<512;z+=256)x.strokeRect(z,y,256,256);}
else if(kind==='gravel'){for(let i=0;i<3000;i++){const v=157+rand()*27;x.fillStyle=`rgb(${v},${v*.99},${v*.96})`;x.beginPath();x.ellipse(rand()*512,rand()*512,1+rand()*4,1+rand()*3,rand()*6,0,7);x.fill();}}
for(let i=0;i<17000;i++){x.fillStyle=rand()>.5?'#ffffff05':'#00000004';x.fillRect(rand()*512,rand()*512,1+rand()*2,1+rand()*2);}
const tx=new T.CanvasTexture(c);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.encoding=T.sRGBEncoding;tx.anisotropy=4;tx.name=kind;cache.set(kind,tx);return tx;}
function material(color,map=null,bump=0){const m=new T.MeshStandardMaterial({color,map,roughness:.96,metalness:0});m.color.convertSRGBToLinear().multiplyScalar(.52);if(map&&bump){m.bumpMap=map;m.bumpScale=bump;}m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <encodings_fragment>','gl_FragColor = LinearTosRGB(gl_FragColor);');};m.customProgramCacheKey=()=> 'V28_MUTED_SURFACE';return m;}
function wallMaterials(size,appearance='brick'){const solid={white:'#deddd7',grey:'#929a9d',sand:'#cbbda4'},map=texture(solid[appearance]?'plaster':appearance==='stone'?'stone':'brick');return Array.from({length:6},()=>{const m=material(solid[appearance]||'#d7d7d7',map,solid[appearance] ? .5 : 1.2);m.polygonOffset=true;m.polygonOffsetFactor=1;m.polygonOffsetUnits=1;return m;});}
function wallGeometry(size){const g=new T.BoxGeometry(...size),p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++){const a=Math.abs(n.getX(i))>.5?2:0,b=Math.abs(n.getY(i))>.5?2:1;uv.setXY(i,(a===0?p.getX(i):p.getZ(i))/1536,(b===1?p.getY(i):p.getZ(i))/1536);}uv.needsUpdate=true;return g;}
function clear(){if(!decor)return;decor.parent?.remove(decor);decor.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[]){if(m.userData.ownedMap)m.map?.dispose();m.dispose();}});}
function slab(w,d,top,x,z,color,kind,name){const sides=Array.from({length:6},()=>material(color)),m=new T.Mesh(new T.BoxGeometry(w,250,d),sides);m.name=name;m.position.set(x,top-125,z);m.userData={presentationDecoration:true,slabDepth:250,top,bottom:top-250};if(kind){const tx=texture(kind).clone();tx.repeat.set(w/2400,d/2400);tx.needsUpdate=true;sides[2].dispose();sides[2]=material('#d9d9d9',tx,.35);sides[2].userData.ownedMap=true;}m.receiveShadow=true;decor.add(m);return m;}
function presentationLift(roots,floor){
  const y=floor==='deck'?250:0;
  if(!liftGroup){
    liftGroup=new T.Group();
    liftGroup.name='Presentation platform elevation';
    liftGroup.userData.presentationLift=true;
    E.scene.add(liftGroup);
  }
  let changed=liftGroup.position.y!==y;
  for(const r of roots)if(r.group.parent===E.scene){liftGroup.add(r.group);changed=true;}
  if(E.nativeGroup?.parent===E.scene){liftGroup.add(E.nativeGroup);changed=true;}
  for(const group of E.extraGroups?.()||[])if(group.parent===E.scene){liftGroup.add(group);changed=true;}
  if(changed){liftGroup.position.y=y;liftGroup.updateMatrixWorld(true);}
}

const backgrounds=new Map();
function themeFor(value){
  return ['sketchup-dark','adaptive'].includes(value)?value:'empty';
}
// OKLab lightness from linear sRGB. Only evaluated on a changed scene key.
function adaptiveBackdrop(palette){
  const catalog=E?.catalog||parent.P3DV_RAL_CATALOG;
  const table=catalog?.all||[];
  const lightness=[];
  for(const token of palette||[]){
    const hex=/^#[0-9a-f]{6}$/i.test(token)?token:table.find(entry=>entry.code===token)?.hex;
    if(!hex)continue;
    const [r,g,b]=[1,3,5].map(i=>{const c=parseInt(hex.slice(i,i+2),16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
    const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
    const m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
    const s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
    lightness.push(.2104542553*l+.793617785*m-.0040720468*s);
  }
  const mean=lightness.length?lightness.reduce((a,b)=>a+b,0)/lightness.length:.55;
  return new T.Color(mean<.62?'#dce6ef':'#344354');
}
function background(value,palette){
  const theme=themeFor(value);
  if(theme==='adaptive')return adaptiveBackdrop(palette);
  if(theme==='sketchup-dark')return new T.Color('#303641');
  if(backgrounds.has(theme))return backgrounds.get(theme);
  const canvas=document.createElement('canvas');
  canvas.width=2;canvas.height=256;
  const ctx=canvas.getContext('2d');
  const gradient=ctx.createLinearGradient(0,0,0,256);
  const stops=[[0,'#f5f8fb'],[.55,'#eaf1f6'],[1,'#dce7ef']];
  for(const [at,color] of stops)gradient.addColorStop(at,color);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,2,256);
  const texture=new T.CanvasTexture(canvas);
  texture.encoding=T.sRGBEncoding;
  backgrounds.set(theme,texture);
  return texture;
}
function rebuild(p){clear();decor=new T.Group();decor.name='Ortam ve zemin';decor.userData.presentationDecoration=true;E.scene.add(decor);const b=E.bounds(),s=b.isEmpty()?new T.Vector3(6000,3000,6000):b.getSize(new T.Vector3()),c=b.isEmpty()?new T.Vector3():b.getCenter(new T.Vector3()),ground=E.ground(),w=Math.max(6000,s.x+2500),d=Math.max(6000,s.z+2500),season=p.environment||'empty',floor=p.floor||'none';
const theme=themeFor(season);
E.scene.background=background(theme,p.palette);
if(floor!=='none')slab(w,d,ground+(floor==='deck'?250:0),c.x,c.z,'#b0aaa0',floor,'Floor '+floor);
current={environment:theme,backgroundColor:E.scene.background.isColor?'#'+E.scene.background.getHexString():null,floor,ground,slabDepth:250,lift:liftGroup.position.y,decorationCount:decor.children.length};}
function cameraTick(roots=E?.roots(),force=false){if(!E||root.__PLMR_ANIMATION_VIEWER__?.active())return;const position=E.camera.position;
if(!force&&lastCameraPosition?.distanceToSquared(position)<1e-8)return;
lastCameraPosition=position.clone();
let inside=false;for(const r of [...roots,...(E.extraRoofs?.()||[])]){r.group.updateWorldMatrix(true,false);const p=r.group.worldToLocal(position.clone());if(Math.abs(p.x)<r.width/2&&Math.abs(p.z)<r.depth/2&&p.y>-r.height/2&&p.y<r.height/2+120)inside=true;}const fov=inside?Math.max(110,baseFov):baseFov;if(Math.abs(E.camera.fov-fov)>.01){E.camera.fov=fov;E.camera.updateProjectionMatrix();E.controls.dispatchEvent({type:'change'});}current.inside=inside;current.fov=E.camera.fov;current.baseFov=baseFov;const label=(E.host?document:parent.document).getElementById('v28FovValue');if(label){const value=Math.round(E.camera.fov)+'°'+(inside?' · '+(parent.PLMRLocale?.t('İçeride geniş açı')||'İçeride geniş açı'):'');if(label.textContent!==value)label.textContent=value;}}
function attach(env){E=env;baseFov=E.camera.fov;lastCameraPosition=undefined;stamp='';tick();}
function tick(force=false){
  if(!E||E.renderer?.xr?.isPresenting)return;
  const host=E.host||parent.PLMRV27Host,roots=E.roots();
  presentationLift(roots,host?.floor());
  cameraTick(roots);
  if(!force&&checkFrame++%20)return;
  const frame=host?.frame();
  if(frame&&frame.key!==stamp){stamp=frame.key;rebuild(frame.presentation);}
}
root.PLMRV27Scene={context:()=>E,attach,tick,preparePresentation:()=>tick(true),background,lift:()=>liftGroup?.position.y||0,fov:value=>{baseFov=Math.max(38,Math.min(120,Number(value)||38));cameraTick(undefined,true);},wallOptions,wallMaterials,wallGeometry,walls:()=>{const out=[];E?.scene.traverse(o=>{if(o.userData.isSketchWallFace)out.push({id:o.userData.wallId,size:o.userData.p3dvSize,uvFinite:[...o.geometry.attributes.uv.array].every(Number.isFinite),materials:o.material.map(m=>({color:m.color.getHexString(),texture:m.map?.name||null,bumpScale:m.bumpScale}))});});return out;},inspect:()=>({...current,textures:cache.size,finiteDecorations:!decor||decor.children.every(o=>o.position.toArray().every(Number.isFinite)),orphanProductRoots:liftGroup?.children.filter(g=>g!==E.nativeGroup&&g.visible&&!E.roots().some(r=>r.group===g)).length||0,slabs:decor?.children.filter(o=>o.userData.slabDepth).map(o=>({name:o.name,...o.userData,center:o.position.toArray(),size:o.geometry.parameters}))||[]})};})(window);
