/* Product-local controls in the existing viewer document. No iframe or renderer. */
(function(root){
  'use strict';
  function create(common,id,html,active){
    const real=common.document;
    if(id==='justpergola'){
      const container=real.createElement('div');
      container.id='plmrPergolaController';container.style.display='contents';
      container.innerHTML=html;real.body.append(container);
      return {document:real,container,dispose:()=>container.remove()};
    }
    const host=real.createElement('div');
    host.id='plmrRoofProduct-'+id;host.style.display='contents';
    const shadow=host.attachShadow({mode:'open'}),body=real.createElement('div');
    body.id='plmrPergolaController';body.style.display='contents';body.innerHTML=html;
    shadow.append(body);real.body.append(host);
    for(const sheet of real.head.querySelectorAll('style,link[rel="stylesheet"]')){
      const copy=sheet.cloneNode(true);
      if(copy.tagName==='LINK')copy.href=sheet.href;
      shadow.prepend(copy);
    }
    const stopTranslation=common.PLMRI18n?.installScope?.(body);
    const listeners=new Set();
    function remove(type,fn,options){
      const capture=typeof options==='boolean'?options:!!options?.capture;
      for(const item of listeners)if(item.type===type&&item.fn===fn&&item.capture===capture){
        real.removeEventListener(type,item.wrapper,options);listeners.delete(item);
      }
    }
    function add(type,fn,options){
      remove(type,fn,options);
      const wrapper=event=>{
        const path=event.composedPath(),target=path[0]||event.target;
        if(!path.includes(host)&&!active())return;
        const local=new Proxy(event,{get(value,key){
          if(key==='target')return target;
          const member=Reflect.get(value,key,value);
          return typeof member==='function'?member.bind(value):member;
        }});
        if(typeof fn==='function')fn(local);else fn.handleEvent(local);
      };
      listeners.add({type,fn,wrapper,capture:typeof options==='boolean'?options:!!options?.capture});
      real.addEventListener(type,wrapper,options);
    }
    const doc=new Proxy(real,{get(value,key){
      if(key==='body'||key==='documentElement')return body;
      if(key==='activeElement')return shadow.activeElement||real.activeElement;
      if(key==='head')return shadow;
      if(key==='fullscreenElement')return null;
      if(key==='getElementById')return id=>shadow.getElementById(id);
      if(key==='querySelector')return selector=>shadow.querySelector(selector);
      if(key==='querySelectorAll')return selector=>shadow.querySelectorAll(selector);
      if(key==='addEventListener')return add;
      if(key==='removeEventListener')return remove;
      if(key==='dispatchEvent')return event=>shadow.dispatchEvent(event);
      const member=Reflect.get(value,key,value);
      return typeof member==='function'?member.bind(value):member;
    }});
    return {document:doc,container:body,shadow,dispose(){
      for(const item of listeners)real.removeEventListener(item.type,item.wrapper,item.capture);
      stopTranslation?.();listeners.clear();host.remove();
    }};
  }
  root.PLMRRoofProductContexts=Object.freeze({create});
})(window);
