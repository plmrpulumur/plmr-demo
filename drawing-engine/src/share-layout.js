/* Shared recipient viewport. Rotate an iframe, never a renderer/camera or its
   pointer math. The child always receives real landscape viewport dimensions. */
(function(){
  'use strict';
  const url=new URL(location.href),shell=url.pathname.endsWith('/share-shell.html');
  if(!shell){
    const project=url.pathname.endsWith('/project-view.html');
    if(!project&&url.searchParams.get('presentation')!=='1')return;
    if(url.searchParams.get('plmr_landscape')==='1')return;
    const target=new URL('./share-shell.html',url);
    target.searchParams.set('view',project?'project':'animation');target.hash=url.hash;
    window.__PLMR_SHARE_REDIRECTING__=true;location.replace(target.href);return;
  }
  const kind=url.searchParams.get('view');
  if(!['project','animation'].includes(kind)){document.body.textContent='Sunum bağlantısı geçersiz. / Invalid presentation link.';return;}
  const target=new URL(kind==='project'?'./project-view.html':'./embedded.html',url);
  target.searchParams.set('plmr_landscape','1');
  if(kind==='animation')target.searchParams.set('presentation','1');
  target.hash=url.hash;
  const frame=document.createElement('iframe');
  frame.title='PLMR · 3D Presentation';frame.allow='fullscreen; camera; xr-spatial-tracking';frame.allowFullscreen=true;
  frame.src=target.href;document.body.append(frame);
  let pending=0;
  function layout(){
    pending=0;
    const width=window.innerWidth,height=window.innerHeight,portrait=height>width;
    frame.style.width=Math.max(width,height)+'px';frame.style.height=Math.min(width,height)+'px';
    frame.style.transform=portrait?'translateX('+width+'px) rotate(90deg)':'none';
  }
  function resize(){if(!pending)pending=requestAnimationFrame(layout);}
  window.addEventListener('resize',resize);layout();
  window.addEventListener('pagehide',()=>{window.removeEventListener('resize',resize);cancelAnimationFrame(pending);},{once:true});
})();
