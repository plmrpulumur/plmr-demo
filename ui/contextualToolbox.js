(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.PulumurContextualToolbox=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const STORAGE_KEY='plmr.contextualToolbox.v3';
  const PERGO_ALIASES=Object.freeze(['PERI01','PERGO RISE','PERGO_RISE','PERGORISE']);
  const TOOL_DEFINITIONS=Object.freeze([
    {id:'check-drawing',elementId:'checkDrawingBtn',products:['*']},
    {id:'multi-product',elementId:'multiProductBtn',products:['PERGO']},
    {id:'multi-dimension',elementId:'multiDimensionBtn',products:['PERGO']},
    {id:'equalize-gaps',elementId:'equalizeGapsBtn',products:['PERGO']},
    {id:'post-settings',elementId:'postSettingsBtn',products:['PERGO']},
    {id:'bulk-extend',elementId:'bulkExtendBtn',products:['PERGO']},
    {id:'bulk-post-profile',elementId:'bulkPostProfileBtn',products:['PERGO']},
    {id:'convert-product',elementId:'convertProductBtn',products:['PERGO']},
    {id:'fit-products',elementId:'fitProductsBtn',products:['PERGO']},
    {id:'detail-copy',elementId:'detailCopyBtn',products:['PERGO']},
    {id:'multi-delete',elementId:'multiDeleteBtn',products:['PERGO']},
    {id:'delete-all-products',elementId:'deleteAllProductsBtn',products:['PERGO']}
  ]);
  function normalizeProduct(value){return String(value||'PERGO RISE').trim().toUpperCase();}
  function isPergoProduct(value){return PERGO_ALIASES.includes(normalizeProduct(value));}
  function normalizeContext(input){
    const source=input||{};
    return {
      product:normalizeProduct(source.product),
      view:String(source.view||'PREVIEW').trim().toUpperCase()||'PREVIEW',
      selection:['none','product','dimension','profile'].includes(source.selection)?source.selection:'none',
      mobile:Boolean(source.mobile),
      open:Boolean(source.open),
      pinned:Boolean(source.pinned)
    };
  }
  function resolve(input){
    const context=normalizeContext(input);
    const pergo=isPergoProduct(context.product);
    return TOOL_DEFINITIONS.map(tool=>({
      ...tool,
      visible:tool.products.includes('*')||pergo,
      pinned:context.pinned,
      reason:tool.products.includes('*')||pergo?null:'PRODUCT'
    }));
  }
  function readState(storage){
    try{
      const raw=storage&&storage.getItem(STORAGE_KEY);const parsed=raw?JSON.parse(raw):{};
      return{open:Boolean(parsed.open),pinned:Boolean(parsed.pinned)};
    }catch(_){return{open:false,pinned:false};}
  }
  function writeState(storage,state){
    const normalized={open:Boolean(state&&state.open),pinned:Boolean(state&&state.pinned)};
    if(normalized.pinned) normalized.open=true;
    if(storage&&storage.setItem) storage.setItem(STORAGE_KEY,JSON.stringify(normalized));
    return normalized;
  }
  function toggleOpen(state){
    const next={open:!(state&&state.open),pinned:Boolean(state&&state.pinned)};
    if(next.pinned) next.open=true;
    return next;
  }
  function togglePin(state){
    const pinned=!Boolean(state&&state.pinned);
    return{open:pinned?true:Boolean(state&&state.open),pinned};
  }
  function inferSelection(rootNode){
    if(!rootNode||!rootNode.querySelector)return'none';
    const preview=rootNode.querySelector('#preview');
    if(preview&&preview.querySelector('.editable-dimension-hit.toolbox-selected,.dimension-group.toolbox-selected'))return'dimension';
    if(preview&&preview.querySelector('[data-toolbox-profile-key].toolbox-selected,.profile-highlight.toolbox-selected'))return'profile';
    if(preview&&preview.querySelector('[data-product-id].toolbox-selected,.product-hit.toolbox-selected'))return'product';
    return'none';
  }
  return{STORAGE_KEY,PERGO_ALIASES,TOOL_DEFINITIONS,normalizeProduct,isPergoProduct,normalizeContext,resolve,readState,writeState,toggleOpen,togglePin,inferSelection};
});
