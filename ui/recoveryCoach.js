(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.PulumurRecoveryCoach=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const HELP=Object.freeze({
    DUPLICATE_POSITION:Object.freeze({control:'positionNo',title:'Poz numarası tekrar ediyor',example:'P01, P02, P03',steps:['Tekrarlanan poz satırını seçin','Benzersiz bir poz numarası girin','Tümünü Doğrula ile tekrar kontrol edin']}),
    INVALID_DIMENSION:Object.freeze({control:'width',title:'Ölçü geçerli değil',example:'Genişlik: 2000 mm',steps:['Kırmızı işaretli ölçüyü açın','Pozitif milimetre değeri girin','Ürün sınırlarını yeniden doğrulayın']}),
    DXF_EXPORT_FAILED:Object.freeze({control:'dxfDownloadBtn',title:'DXF oluşturulamadı',example:'Önce Tümünü Doğrula, sonra DXF',steps:['Hatalı pozları düzeltin','Çizimi yeniden oluşturun','DXF indirmeyi tekrar deneyin']}),
    PDF_EXPORT_FAILED:Object.freeze({control:'pdfDownloadBtn',title:'PDF oluşturulamadı',example:'Sayfa yerleşimini doğrulayın',steps:['Geçersiz pozları düzeltin','Önizlemeyi yenileyin','PDF indirmeyi tekrar deneyin']}),
    RECOVERY_SNAPSHOT:Object.freeze({control:'recoveryAction',title:'Kurtarma kopyası bulundu',example:'Önizle → doğrula → geri yükle',steps:['Kopyanın tarihini ve checksum bilgisini inceleyin','Salt okunur simülasyonu çalıştırın','Sonuç uygunsa geri yüklemeyi açıkça onaylayın']})
  });
  const clone=v=>JSON.parse(JSON.stringify(v));
  function route(code,context={}){
    const item=HELP[String(code||'').trim().toUpperCase()];
    if(!item)return Object.freeze({code:'UNKNOWN',control:null,title:'Yardım bulunamadı',example:'Hata ayrıntılarını destek paketine ekleyin',steps:['İşlemi tekrar deneyin','Sorun sürerse destek paketi oluşturun'],ariaLive:'polite',focusTarget:null,externalDataSent:false,context:{}});
    const safeContext={positionNo:context.positionNo?String(context.positionNo):null,productType:context.productType?String(context.productType):null};
    return Object.freeze({code:String(code).toUpperCase(),...clone(item),ariaLive:'polite',focusTarget:`#${item.control}`,externalDataSent:false,context:safeContext});
  }
  function simulate(code,context={},checks=[]){
    const help=route(code,context);const results=(checks||[]).map((check,index)=>{
      try{const value=typeof check==='function'?check(clone(context)):check;return Object.freeze({index,status:value===false?'BLOCKED':'READY',detail:value===true||value==null?null:clone(value)});}catch(error){return Object.freeze({index,status:'ERROR',detail:String(error&&error.message||error)});}
    });
    const ready=results.every(x=>x.status==='READY');
    return Object.freeze({schema:'plmr-recovery-simulation-v1',help,results:Object.freeze(results),ready,mutated:false,requiresConfirmation:true,externalDataSent:false});
  }
  async function recover(simulation,options={}){
    if(!simulation||simulation.schema!=='plmr-recovery-simulation-v1')throw new Error('RECOVERY_SIMULATION_REQUIRED');
    if(simulation.ready!==true)throw new Error('RECOVERY_NOT_READY');
    if(options.confirmed!==true)throw new Error('RECOVERY_CONFIRMATION_REQUIRED');
    if(typeof options.executor!=='function')throw new Error('RECOVERY_EXECUTOR_REQUIRED');
    const result=await options.executor(clone(options.payload||{}));
    return Object.freeze({status:'APPLIED',result:clone(result),externalDataSent:false});
  }
  function announce(documentRef,message){
    const doc=documentRef;if(!doc||!doc.createElement)return null;
    let node=doc.getElementById&&doc.getElementById('plmrRecoveryCoachLive');
    if(!node){node=doc.createElement('div');node.id='plmrRecoveryCoachLive';node.setAttribute('role','status');node.setAttribute('aria-live','polite');node.setAttribute('aria-atomic','true');node.style.position='absolute';node.style.width='1px';node.style.height='1px';node.style.overflow='hidden';node.style.clip='rect(0 0 0 0)';(doc.body||doc.documentElement).appendChild(node);}
    node.textContent=String(message||'');return node;
  }
  function focusControl(documentRef,help){const selector=help&&help.focusTarget;if(!selector||!documentRef||!documentRef.querySelector)return false;const node=documentRef.querySelector(selector);if(!node||typeof node.focus!=='function')return false;node.focus();return true;}
  return Object.freeze({HELP,route,simulate,recover,announce,focusControl});
});
