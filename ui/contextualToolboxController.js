(function(root,factory){
  const api=factory(root.PulumurContextualToolbox);
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.PulumurContextualToolboxController=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(core){
  'use strict';
  function create(options){
    const doc=(options&&options.document)||document;
    const win=(options&&options.window)||window;
    const storage=(options&&options.storage)||win.localStorage;
    const host=doc.getElementById('previewToolbox');
    if(!host||!core)return{destroy(){},refresh(){}};
    const product=doc.getElementById('product');
    const grid=host.querySelector('.preview-toolbox-grid');
    const workspace=host.closest('.preview-workspace');
    let state=core.readState(storage);
    let override=null;
    let observer=null;
    const header=doc.createElement('div');
    header.className='contextual-toolbox-head';
    header.innerHTML=`<div class="contextual-toolbox-actions">
      <button id="contextualToolboxExpand" type="button" class="contextual-toolbox-icon contextual-toolbox-expand" aria-expanded="false" aria-label="Araçları aç" title="Araçları aç / kapat"><span aria-hidden="true">›</span></button>
      <button id="contextualToolboxPin" type="button" class="contextual-toolbox-icon contextual-toolbox-pin" aria-pressed="false" aria-label="Araçları sabitle" title="Toolbox'ı sabitle"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l-1 6 3 3v2h-5v7l-2-2v-5H6v-2l3-3z"/></svg></button>
    </div>`;
    host.insertBefore(header,grid);
    const expand=header.querySelector('#contextualToolboxExpand');
    const pin=header.querySelector('#contextualToolboxPin');
    core.TOOL_DEFINITIONS.forEach(tool=>{const el=doc.getElementById(tool.elementId);if(el)el.dataset.contextTool=tool.id;});
    function context(){
      return core.normalizeContext({
        product:override&&override.product||product&&product.value||'Pergo Rise',
        view:override&&override.view||'PREVIEW',
        selection:override&&override.selection||core.inferSelection(doc),
        mobile:override&&typeof override.mobile==='boolean'?override.mobile:win.matchMedia&&win.matchMedia('(max-width: 820px)').matches,
        open:state.open,
        pinned:state.pinned
      });
    }
    function refresh(){
      const ctx=context();const resolved=core.resolve(ctx);const open=Boolean(state.open||state.pinned);
      resolved.forEach(tool=>{const el=doc.getElementById(tool.elementId);if(!el)return;el.hidden=!tool.visible;el.setAttribute('aria-hidden',tool.visible?'false':'true');el.classList.remove('is-context-pinned');});
      host.classList.toggle('is-open',open);host.classList.toggle('is-pinned',Boolean(state.pinned));
      if(workspace)workspace.classList.toggle('is-toolbox-collapsed',!open);
      grid.hidden=!open;
      expand.setAttribute('aria-expanded',String(open));
      expand.setAttribute('aria-label',open?'Araçları kapat':'Araçları aç');
      pin.setAttribute('aria-pressed',String(Boolean(state.pinned)));
      pin.setAttribute('aria-label',state.pinned?'Sabitlemeyi kaldır':'Araçları sabitle');
      host.dataset.contextSelection=ctx.selection;host.dataset.contextProduct=ctx.product;
      try{win.dispatchEvent(new CustomEvent('plmr-contextual-toolbox-updated',{detail:{context:ctx,tools:resolved,open,pinned:state.pinned}}));}catch(_){}
      return{context:ctx,tools:resolved,open,pinned:state.pinned};
    }
    function persist(next){state=core.writeState(storage,next||state);return refresh();}
    function toggleOpen(){if(state.pinned)return refresh();return persist(core.toggleOpen(state));}
    function togglePin(){return persist(core.togglePin(state));}
    function onKey(event){
      if(event.altKey&&String(event.key).toLowerCase()==='t'){
        event.preventDefault();state={...state,open:true};persist(state);host.classList.add('is-keyboard-open');const target=host.querySelector('button:not([hidden]):not([disabled])');if(target)target.focus();
      }
      if(event.key==='Escape'&&host.classList.contains('is-keyboard-open')){host.classList.remove('is-keyboard-open');if(!state.pinned)persist({...state,open:false});const preview=doc.getElementById('preview');if(preview)preview.focus();}
    }
    function onDocumentPointer(event){
      if(state.pinned||!state.open||host.contains(event.target))return;
      persist({...state,open:false});
    }
    expand.addEventListener('click',toggleOpen);pin.addEventListener('click',togglePin);
    if(product)product.addEventListener('change',refresh);
    win.addEventListener('resize',refresh);doc.addEventListener('keydown',onKey);doc.addEventListener('pointerdown',onDocumentPointer);
    win.addEventListener('plmr-toolbox-context',event=>{override=event.detail||null;refresh();});
    observer=new MutationObserver(()=>{if(state.open||state.pinned)refresh();});const preview=doc.getElementById('preview');if(preview)observer.observe(preview,{subtree:true,attributes:true,attributeFilter:['class','aria-selected']});
    refresh();
    return{refresh,setState(next){return persist({...state,...(next||{})});},getState(){return{...state};},setContext(next){override=next||null;return refresh();},clearContext(){override=null;return refresh();},destroy(){observer&&observer.disconnect();doc.removeEventListener('keydown',onKey);doc.removeEventListener('pointerdown',onDocumentPointer);win.removeEventListener('resize',refresh);header.remove();}};
  }
  function boot(){if(!window.__plmrContextualToolbox)window.__plmrContextualToolbox=create();}
  if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();}
  return{create,boot};
});
