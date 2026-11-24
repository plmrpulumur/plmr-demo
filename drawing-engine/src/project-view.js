(async()=>{
 if(window.__PLMR_SHARE_REDIRECTING__)return;
 const status=document.querySelector('[role=status]'),english=!navigator.language.toLowerCase().startsWith('tr');
 const t=(tr,en)=>english?en:tr;
 const language=english?'EN':'TR',locale=window.PLMRI18n;
 window.PLMRLocale={...locale,getLanguage:()=>language,t:value=>locale.t(value,language),subscribe:()=>()=>{}};
 document.documentElement.lang=language.toLowerCase();
 try{
   const id=window.PLMRShareLinks.decode(location.hash.slice(1));
   status.textContent=t('Çizim yükleniyor…','Loading drawing…');
   const config=window.PLMR_ANIMATION_SHARE_CONFIG;
   const res=await fetch(config.endpoint+'?share='+id,{headers:{apikey:config.publicKey},cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(!res.ok)throw Error(t('Bağlantı geçersiz veya süresi doldu.','This link is unavailable or has expired.'));
   const {presentation}=await res.json(),frame=document.createElement('iframe'),session=crypto.randomUUID();
   frame.allow='fullscreen; camera; xr-spatial-tracking';frame.allowFullscreen=true;
   frame.title=t('Çizim','Drawing');frame.style.visibility='hidden';frame.src='./embedded.html';
   function command(type,payload={},requestId=crypto.randomUUID()){frame.contentWindow.postMessage({channel:'plmr-final-v1',session,type,payload,requestId},location.origin)}
   const deadline=setTimeout(()=>{status.textContent=t('Çizim açılamadı.','Drawing could not be opened.')},60000);
   window.addEventListener('message',event=>{
     if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.session!==session||event.data.channel!=='plmr-final-v1')return;
     const msg=event.data;
     if(msg.type==='READY')command('INIT',{readOnly:true,previewOnly:true,customerView:true,snapshot:presentation.snapshot,projectInfo:{}},'init');
     if(msg.type==='ERROR'||msg.payload?.error){clearTimeout(deadline);status.textContent=msg.payload?.error||msg.payload?.message||t('Çizim açılamadı.','Drawing could not be opened.');return}
     if(msg.type==='RESULT'&&msg.requestId==='init'){
       frame.style.visibility='visible';
       requestAnimationFrame(()=>command('VIEW',{mode:'3D',fit:true,dimensions:true},'view'));
     }
     if(msg.type==='RESULT'&&msg.requestId==='view'){clearTimeout(deadline);status.hidden=true}
   });
   frame.onload=()=>command('CONNECT');document.body.append(frame);

 }catch(error){status.textContent=error.message}
})();
