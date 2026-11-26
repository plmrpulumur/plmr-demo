/* Start the public read while the existing drawing modules load. No private data,
   long-lived cache or retry loop; one request belongs to this receiving page. */
(function(root){
 'use strict';
 if(new URLSearchParams(location.search).get('presentation')!=='1')return;
 const id=new URLSearchParams(location.hash.slice(1)).get('share');
 if(!/^[a-f0-9]{32}$/.test(id||''))return;
 const config=root.PLMR_ANIMATION_SHARE_CONFIG,controller=new AbortController();
 const url=new URL(config?.endpoint||'./api/animation-shares',location.href);url.pathname=url.pathname.replace(/\/$/,'')+'/'+id;
 const timer=setTimeout(()=>controller.abort(),15000);
 const promise=fetch(url,{headers:config?.publicKey?{apikey:config.publicKey}:{},signal:controller.signal,cache:'no-store'}).then(async response=>{
  const value=await response.json();if(!response.ok)throw Error(value.error||'Sunum bulunamadı veya süresi doldu.');return {value:value.presentation};
 }).catch(error=>({error:error.message})).finally(()=>clearTimeout(timer));
 root.PLMRSharedPresentation={id,promise};
 root.addEventListener('pagehide',()=>{controller.abort();clearTimeout(timer);root.PLMRSharedPresentation=null;},{once:true});
})(window);
