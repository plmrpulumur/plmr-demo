/* JustPergola is a product workspace of the existing PLMR drawing document. */
(function(root){
  'use strict';
  function createIntegration(definition){
  const id=definition.id;
  let product=null,active=false,ready=false,publishing=false,expected='',pendingCommit=null,runtimeActive=true,failure=null,providerDocument=null;
  const $=id=>document.getElementById(id);
  const packet=()=>root.PLMRV24Host.getRoofProduct(id);
  const hasWorkspace=()=>!!root.PLMRV24Host?.hasRoofProduct(id);
  const signature=value=>JSON.stringify(value);
  function report(error){failure=error instanceof Error?error:Error(String(error));const node=$('rrV45ToolbarMessage');if(node){node.textContent=error.message||String(error);node.classList.add('show');}console.error(error);}
  function app(){return runtimeCurrent()?product.controller.PLMRJustPergolaApp:null;}
  function child(){return product?.controller.PLMRPergolaEmbedded;}
  function runtimeCurrent(){const runtime=$('viewerFrame')?.contentWindow?.PLMRDrawingRuntime;return !!(ready&&root.__P3DV_HOST_BRIDGE__?.runtimeDiagnostics().viewerReady&&runtime&&product?.runtime===runtime&&runtime.isCurrent());}
  function updateToolbar(){root.PLMRUnifiedDrawingWorkspaceV4?.syncProductToolbar();}
  function commit(next){
    // The host publishes synchronous layout events while accepting a write.
    // Those events may normalize the child view. Serialize that derived write
    // after the host returns its version; retain the stale-write comparison.
    if(publishing){pendingCommit=next;return;}
    publishing=true;
    try{
      let value=next;
      while(value){
        pendingCommit=null;
        const saved=root.PLMRV24Host.setRoofProduct(id,value,expected);
        expected=signature(saved);
        if(signature(value)!==expected)child().load(saved,root.PLMRFinalMetadata?.projectInfo);
        value=pendingCommit;
      }
    }finally{publishing=false;pendingCommit=null;requestAnimationFrame(updateToolbar);}
  }
  function accept(next){try{commit(next);}catch(error){expected='';synchronize();report(error);}}
  function observeProviders(){
    const current=$('viewerFrame')?.contentDocument;
    if(!current||current===providerDocument)return;
    providerDocument?.defaultView?.removeEventListener('plmr-v70-readiness',onModelChange);
    providerDocument=current;
    current.defaultView.addEventListener('plmr-v70-readiness',onModelChange);
  }
  function dependenciesReady(value){
    const scene=value.workspace?.model?.workspaces?.standalone?.project;
    const scenes=[scene,...(scene?.copies||[]).map(copy=>copy.input?.__pergolaScene)];
    const types=new Set();
    for(const state of scenes)for(const slots of Object.values(state?.facadeProducts||{}))
      for(const placement of Object.values(slots))if(placement?.type)types.add(placement.type);
    const registries=[root.PLMRV24Native,$('viewerFrame')?.contentWindow?.PLMRV24Native];
    for(const type of types)for(const registry of registries){
      if(!registry)return false;
      const status=registry.readiness(type);
      if(status.state==='failed')throw Error(registry.label(type)+' — '+status.message);
      if(status.state!=='ready')return false;
    }
    return true;
  }
  function ensureProduct(){
    const common=$('viewerFrame')?.contentWindow;
    if(!root.__P3DV_HOST_BRIDGE__?.runtimeDiagnostics().viewerReady||!common?.PLMRDrawingRuntime?.isCurrent())return false;
    if(product?.runtime===common.PLMRDrawingRuntime)return true;
    ready=false;expected=signature(packet());failure=null;
    product=root.PLMRCreateRoofProduct(common,root,id);
    child().attach({packet:packet(),projectInfo:root.PLMRFinalMetadata?.projectInfo,readOnly:root.PLMRFinalReadOnly?.()!==false,
      transaction:next=>{try{commit(next);return packet();}catch(error){synchronize();throw error;}},
      change:accept,view:view=>accept({workspace:packet().workspace,view}),
      undo:()=>root.PLMRV24Workspace.undo(),redo:()=>root.PLMRV24Workspace.redo(),error:report,
      message:text=>root.PLMRUnifiedDrawingWorkspaceV4.notify(text),selectionChanged:updateToolbar,
      pickColor:(current,surface,select)=>root.PLMRV27UI.coating(current,surface,select),
      dismissMenus:()=>root.PLMRUnifiedDrawingWorkspaceV4.closeToolbarMenus()});
    expected=signature(packet());ready=true;
    child().setActive(active&&runtimeActive);
    return true;
  }
  function synchronize(){
    if(publishing||!root.PLMRV24Host)return;
    if(!active&&!hasWorkspace()&&!product)return;
    try{
      observeProviders();
      let next=packet();
      if(!dependenciesReady(next)){ready=false;return;}
      if(!ensureProduct())return;
      // Mounting can synchronously normalize and publish the workspace. Read
      // again, then advance the expected version before load emits any events.
      next=packet();const stamp=signature(next);
      child().setReadOnly(root.PLMRFinalReadOnly?.()!==false);
      if(stamp!==expected){expected=stamp;child().load(next,root.PLMRFinalMetadata?.projectInfo);}
      ready=true;failure=null;
      child().setActive(active&&runtimeActive);
      if(active)app().refreshPresentation();
    }catch(error){ready=false;report(error);}
  }
  function applyPresentation(){if(active&&runtimeCurrent())app().refreshPresentation();}
  function activate(){
    active=true;document.body.classList.add(id+'-active');
    synchronize();requestAnimationFrame(updateToolbar);
  }
  function deactivate(){
    active=false;root.PLMRV27UI?.closeColor();if(runtimeCurrent())child().setActive(false);
    document.body.classList.remove(id+'-active');root.PLMRV24Workspace?.refresh();
  }
  function requireApp(){
    const engine=runtimeCurrent()?app():null;
    if(!engine)throw Error('Pergola hazırlanıyor.');
    return engine;
  }
  function command(name,...args){
    requireApp();
    return child().command(name,...args);
  }
  function download(format,extension,mime){
    const {text,filename}=requireApp().exportDrawing(format);
    const url=URL.createObjectURL(new Blob([text],{type:mime}));
    const link=document.createElement('a');
    link.href=url;
    link.download=filename||root.PLMRV5RoofSheet.safeName(root.PLMRFinalMetadata?.projectInfo,extension);
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const actions={
    rrV14LayoutBtn:['layout'],rrV45AddPositionBtn:['addPosition'],rrV45SettingsBtn:['openSettings'],
    rrV45EditMeasuresBtn:['openSettings'],rrV45ValidateBtn:['validateDrawing'],
    rrV45MmBtn:['toggleUnit','mm'],rrV45InchBtn:['toggleUnit','inch'],rrV45FeetBtn:['toggleUnit','ft'],
    rrV45ZonesBtn:['toggleZones'],
    rrV13GenerateZones:['generateZones'],rrV45PushPullToolBtn:['pushPull'],
    rrV11SelectionEditBtn:['editSelection'],rrV11SelectionDeleteBtn:['deleteSelection'],
    rrV42EqualZones:['equalZones'],rrV11SelectionClearBtn:['clearSelection'],rrV14SelectionMotion:['previewSelection'],rrV11SelectionShiftBtn:['shiftSelection'],
    rrV11MultiProfileAdd:['startBulk','add'],rrV11MultiProfileDelete:['startBulk','delete'],
    rrV11MultiProductAdd:['startBulk','product-add'],rrV11MultiProductDelete:['startBulk','product-delete'],
    rrV11BulkDone:['finishBulk'],rrV11BulkCancel:['cancelBulk'],toolboxSelectionDoneBtn:['finishBulk'],toolboxSelectionCancelBtn:['cancelBulk'],
    rrV11ResetDefaults:['resetOptions'],rrV16ResetAll:['resetDrawing'],
  };
  const exports={
    rrV45DxfBtn:()=>download('DXF','dxf','application/dxf'),
    rrV45DaeBtn:()=>download('DAE','dae','model/vnd.collada+xml')
  };
  const toolbar=Object.freeze({
    unavailable:['rrV45TemplateSelect','rrV45ProductionBtn','rrV13CommonPost'],
    action(id){
      if(Object.hasOwn(actions,id))return ()=>{const [name,...args]=actions[id];command(name,...args);updateToolbar();};
      return Object.hasOwn(exports,id)?exports[id]:null;
    },
    state:()=>app()?.toolbarState(),
    dimensionMenu:()=>requireApp().dimensionMenu,
    zoneMenu:()=>requireApp().zoneMenu,
    setParapetHeight:value=>command('setParapetHeight',value)
  });
  function register(){
    if(!root.PLMRUnifiedDrawingWorkspaceV4){document.addEventListener('plmr-workspace-ready',register,{once:true});return;}
    root.PLMRUnifiedDrawingWorkspaceV4.registerProduct({id,label:definition.label,activate,deactivate,toolbar});
    // Restoring the project decides the active product. Inactive workspaces
    // still synchronize their data without selecting a different product.
    synchronize();
  }
  function onModelChange(){synchronize();applyPresentation();}
  for(const name of ['plmr-v24-native-change','plmr-v12-change','plmr-model-changed','plmr-project-loaded','plmr-drawing-runtime-ready'])document.addEventListener(name,onModelChange);
  root.addEventListener('plmr-v70-readiness',onModelChange);
  root.addEventListener('pagehide',()=>{product=null;ready=false;providerDocument?.defaultView?.removeEventListener('plmr-v70-readiness',onModelChange);providerDocument=null;root.removeEventListener('plmr-v70-readiness',onModelChange);for(const name of ['plmr-v24-native-change','plmr-v12-change','plmr-model-changed','plmr-project-loaded','plmr-drawing-runtime-ready'])document.removeEventListener(name,onModelChange);});
  document.addEventListener('plmr-v11-dimensions',()=>api.setProjectDimensions(root.PLMRV11Commands.dimensions()));
  document.addEventListener('plmr:units',event=>{
    if(publishing||!runtimeCurrent())return;
    // Shared layout accepts its view before broadcasting units. Synchronize
    // that accepted version before the child publishes a derived view change.
    // Real stale physical commands still use the unchanged expected check.
    synchronize();
    if(runtimeCurrent())command('setUnits',event.detail);
  });
  const api=Object.freeze({id,isActive:()=>active,
    motion(command){const engine=app(),status=engine?.commonMotion(command);return status?{...status,selected:!!engine.selection()}:null;},
    ready:()=>!!root.PLMRV24Host&&(!hasWorkspace()&&!active||runtimeCurrent()),
    error:()=>failure,
    fov:value=>app()?.fov(value),
    flush(){if(runtimeCurrent()&&!root.PLMRFinalReadOnly?.())commit(child().capture());},
    edit:row=>row.kind==='facade'?requireApp().editFacade(row.zoneId,row.sourceOwner):command('openSettings',{owner:row.sourceOwner}),
    clearSelection:()=>command('clearSelection'),
    importPositions:entries=>command('importPositions',entries),
    generateZones:()=>command('generateZones'),
    zonesVisible:()=>!!app()?.toolbarState().zones,
    setZonesVisible:value=>{if(runtimeCurrent()&&product.controller.PLMRPergolaNative.drawing())child().viewChange(()=>product.controller.PLMRZones.setVisible(value));},
    setProjectDimensions:values=>{if(!runtimeCurrent())return;const next=JSON.parse(JSON.stringify(values));
      for(const field of ['byPosition','hiddenIds'])if(next[field])next[field]=Object.fromEntries(Object.entries(next[field]).filter(([key])=>key.startsWith(id+'~')).map(([key,value])=>[key.slice(id.length+1),value]));
      command('setDimensions',next);
    },
    rows(value=packet()){if(value.workspace&&!runtimeCurrent())throw failure||Error('Çizimin ürün modülleri hazırlanıyor.');return [...root.PLMRRoofProductContract.rows(value,id),...(runtimeCurrent()?app().facadeRows():[])].map(row=>({...row,roofProductId:id}));},synchronize,
    setRuntimeActive(value){runtimeActive=!!value;if(runtimeCurrent())child().setActive(active&&runtimeActive);},
    updateMetadata(info){if(runtimeCurrent())child().setMetadata(info);},
    hasWorkspace,
    async exportData(options){
      if(!runtimeCurrent())throw Error('Pergola çizimi hazırlanıyor.');
      const app=product.controller.PLMRJustPergolaApp;
      if(options.format==='PDF_2D')return {bytes:await root.PLMRPdf.drawing(app.exportDrawing('SVG').svg,options.paper)};
      if(options.format==='PDF_3D'){
        const output=$('viewerFrame').contentWindow.PLMRV24Viewer;
        return {bytes:await root.PLMRV24Workspace.export3d(options.paper,[options.camera||output.cameraState()])};
      }
      return app.exportDrawing(options.format);
    },
    view(options){
      if(!runtimeCurrent())throw Error('Pergola çizimi hazırlanıyor.');
      const app=product.controller.PLMRJustPergolaApp;
      if(options.mode)app.setView(options.mode);
      if(options.fit)app.fit();
      if(options.dimensions!==undefined){
        root.PLMRV24Workspace.setDimensionsVisible(options.dimensions);
      }
      if(options.motion!==undefined)app.commonMotion(typeof options.motion==='boolean'?{target:options.motion}:{seek:options.motion});
      if(options.unit){if(!root.PLMRUnits.positionUnits.includes(options.unit))throw Error('Pergola birimi desteklenmiyor.');command('toggleUnit',options.unit);}
    },
    inspect:()=>({active,ready:runtimeCurrent(),mode:active?(app()?.getView()??null):null,hasWorkspace:hasWorkspace(),document:'common-viewer',productFrames:0})});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',register,{once:true});else register();
  return api;
  }
  const products=new Map(root.PLMRRoofProducts.definitions.map(def=>[def.id,createIntegration(def)]));
  root.PLMRJustPergolaIntegration=products.get('justpergola');
  root.PLMRJustVerandaIntegration=products.get('justveranda');
  root.PLMRRoofIntegrations=Object.freeze({
    get:id=>products.get(id),all:()=>[...products.values()],active:()=>[...products.values()].find(p=>p.isActive()),
    rows:scene=>[...products.values()].flatMap(p=>p.rows(scene?root.PLMRRoofProducts.packet(scene,p.id):undefined)),
    each:(method,...args)=>[...products.values()].forEach(p=>p[method](...args)),
    ready:()=>[...products.values()].every(p=>p.ready()),error:()=>[...products.values()].map(p=>p.error()).find(Boolean)
  });
})(window);
