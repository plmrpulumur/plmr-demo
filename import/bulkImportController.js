(function(root){'use strict';
function boot(){const api=root.PulumurBulkPositionImport,xlsx=root.PulumurXlsxLite,app=root.PulumurStandaloneApp;if(!api||!app)return;const $=id=>document.getElementById(id),dialog=$('importDialog'),text=$('importText'),file=$('importFile'),summary=$('importSummary'),body=$('importPreviewRows'),apply=$('importApplyBtn');let last=null;
function render(result){last=result;summary.textContent=`${result.rows.length} satır · ${result.validPositions.length} geçerli · ${result.invalidRows.length} hatalı`;body.innerHTML=result.rows.map(r=>`<tr class="${r.status==='ERROR'?'invalid':''}"><td>${r.line}</td><td>${r.candidate.positionNo||''}</td><td>${r.candidate.productType||''}</td><td>${r.candidate.width||''}</td><td>${r.candidate.height||''}</td><td>${r.status}</td><td>${r.errors.join(', ')}</td></tr>`).join('');apply.disabled=!result.canApply;}
function runRows(rows){render(api.fromRows(rows,{existingPositions:app.getProject().positions}));}
$('importPositionsBtn').addEventListener('click',()=>{last=null;text.value='Poz No;Ürün;Genişlik;Yükseklik;Adet;Opsiyonlar;Açıklama\nP01;SÜRME;2000;2400;1;railCount=3|direction=RIGHT;Salon';body.innerHTML='';summary.textContent='Önce dry-run doğrulaması çalıştırılır.';apply.disabled=true;dialog.showModal();});
$('importDryRunBtn').addEventListener('click',()=>{try{runRows(api.parseDelimited(text.value));}catch(e){summary.textContent=e.message;apply.disabled=true;}});
file.addEventListener('change',async()=>{try{const f=file.files[0];if(!f)return;if(/\.xlsx$/i.test(f.name))runRows(await xlsx.parse(await f.arrayBuffer()));else{text.value=await f.text();runRows(api.parseDelimited(text.value));}}catch(e){summary.textContent=e.message;apply.disabled=true;}finally{file.value='';}});
apply.addEventListener('click',event=>{event.preventDefault();try{const next=api.apply(app.getProject(),last,{allowPartial:$('importAllowPartial').checked});app.setProject(next);dialog.close();}catch(e){summary.textContent=e.message;}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof globalThis!=='undefined'?globalThis:this);
