(function(root){
 'use strict';
 const tr=s=>root.PLMRLocale?.t(s)||s;
 function open(){
   const config=root.PLMR_ANIMATION_SHARE_CONFIG,code=root.PLMRFinalMetadata?.projectInfo?.projectCode;
   const dialog=document.createElement('dialog'),title=document.createElement('h3'),status=document.createElement('p'),list=document.createElement('div'),actions=document.createElement('footer');
   dialog.className='plmr-share-dialog';title.textContent=tr('Projeyi Paylaş');status.setAttribute('role','status');
   const create=button('Bağlantı oluştur',()=>run(async()=>{await call('create');await refresh()}));
   const close=button('Kapat',()=>dialog.close());
   function button(label,onClick){const b=document.createElement('button');b.type='button';b.className='v33-tool light';b.textContent=tr(label);b.onclick=onClick;return b}
   const cid=config?.getCompanyId?.();
   async function call(op,id){
     if(!code||!cid||config?.mode!=='cloud')throw Error(tr('Çevrimiçi kaydedilmiş bir proje açın.'));
     if(cid!==config.getCompanyId()||code!==root.PLMRFinalMetadata?.projectInfo?.projectCode)throw Error(tr('Firma veya proje değişti.'));
     const token=await config.getAccessToken();if(!token)throw Error(tr('Bulut oturumu gerekli.'));
     const response=await fetch(config.endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:config.publicKey,Authorization:'Bearer '+token},
       body:JSON.stringify({action:'project_share_'+op,companyId:cid,key:code,id}),signal:AbortSignal.timeout(15000)});
     const data=await response.json();if(!response.ok)throw Error(tr(data.error||'Paylaşım servisi hazır değil.'));return data;
   }
   let busy=false;
   async function run(fn){if(busy)return;busy=true;create.disabled=true;status.textContent='';try{await fn()}catch(error){status.textContent=error.message}finally{busy=false;create.disabled=!cid||!code}}
   async function refresh(){const rows=await call('list');list.replaceChildren();
     for(const row of rows){if(!/^[a-f0-9]{32}$/.test(row.id))continue;
       const field=document.createElement('input'),line=document.createElement('p');
       field.value=root.PLMRShareLinks.url('project',row.id,config);field.readOnly=true;field.onfocus=()=>field.select();field.setAttribute('aria-label',tr('Paylaşım bağlantısı'));
       const copy=button('Bağlantıyı Kopyala',async()=>{
         try{
           if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
           await navigator.clipboard.writeText(field.value);status.textContent=tr('Bağlantı kopyalandı.');
         }catch(_){
           field.focus();field.select();
           status.textContent=tr(document.execCommand?.('copy')?'Bağlantı kopyalandı.':'Bağlantı seçildi. Kopyalayıp paylaşabilirsiniz.');
         }
       });
       copy.classList.remove('light');copy.classList.add('blue');
       line.append(field,copy,button('Bağlantıyı iptal et',()=>run(async()=>{await call('revoke',row.id);await refresh()})));list.append(line);
     }
   }
   actions.append(create,close);
   dialog.append(title,document.createTextNode(tr('Son kaydedilen çizim paylaşılır.')),list,status,actions);
   document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();void run(refresh);
 }
 root.PLMRProjectShare={open};
})(window);
