(async()=>{
 if(window.__PLMR_SHARE_REDIRECTING__)return;
 const status=document.querySelector('[role=status]'),english=!navigator.language.toLowerCase().startsWith('tr');
 const t=(tr,en)=>english?en:tr;
 const language=english?'EN':'TR',locale=window.PLMRI18n;
 window.PLMRLocale={...locale,getLanguage:()=>language,t:value=>locale.t(value,language),subscribe:()=>()=>{}};
 document.documentElement.lang=language.toLowerCase();
 const lifetime=new AbortController();let deadline=0,disposed=false;
 const frame=document.createElement('iframe'),session=crypto.randomUUID();
 frame.allow='fullscreen; camera; xr-spatial-tracking';frame.allowFullscreen=true;
 frame.title=t('Çizim','Drawing');frame.style.visibility='hidden';frame.src='./embedded.html';
 let ready=false,presentation=null,started=false;
 function command(type,payload={},requestId=crypto.randomUUID()){if(!disposed)frame.contentWindow.postMessage({channel:'plmr-final-v1',session,type,payload,requestId},location.origin)}
 function initialize(){if(started||!ready||!presentation||disposed)return;started=true;command('INIT',{readOnly:true,previewOnly:true,customerView:true,snapshot:presentation.snapshot,projectInfo:{}},'init');}
 function fail(error){clearTimeout(deadline);if(!disposed){status.hidden=false;status.textContent=error.message;}}
 function message(event){
  if(event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.session!==session||event.data.channel!=='plmr-final-v1')return;
  const msg=event.data;
  if(msg.type==='READY'){ready=true;initialize();}
  if(msg.type==='ERROR'||msg.payload?.error){fail(Error(msg.payload?.error||msg.payload?.message||t('Çizim açılamadı.','Drawing could not be opened.')));return;}
  if(msg.type==='RESULT'&&msg.requestId==='init'){frame.style.visibility='visible';requestAnimationFrame(()=>command('VIEW',{mode:'3D',fit:true,dimensions:true},'view'));}
  if(msg.type==='RESULT'&&msg.requestId==='view'){clearTimeout(deadline);status.hidden=true;}
 }
 window.addEventListener('message',message);
 window.addEventListener('pagehide',()=>{disposed=true;lifetime.abort();clearTimeout(deadline);window.removeEventListener('message',message);frame.onload=null;},{once:true});
 try{
  const id=window.PLMRShareLinks.decode(location.hash.slice(1));
  status.textContent=t('Çizim yükleniyor…','Loading drawing…');
  deadline=setTimeout(()=>{lifetime.abort();fail(Error(t('Çizim açılamadı. Bağlantıyı yeniden açın.','Drawing could not be opened. Please reopen the link.')));},60000);
  frame.onload=()=>command('CONNECT');document.body.append(frame);
  const config=window.PLMR_ANIMATION_SHARE_CONFIG;
  const res=await fetch(config.endpoint+'?share='+id,{headers:{apikey:config.publicKey},cache:'no-store',signal:AbortSignal.any([lifetime.signal,AbortSignal.timeout(15000)])});
  if(!res.ok)throw Error(t('Bağlantı geçersiz veya süresi doldu.','This link is unavailable or has expired.'));
  const result=await res.json();if(disposed)return;
  if(!result.presentation?.snapshot)throw Error(t('Paylaşım verisi eksik.','Shared drawing is incomplete.'));
  presentation=result.presentation;initialize();
 }catch(error){fail(error);}
})();
