(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const app = window.PulumurStandaloneApp;
  const model = window.PulumurStandaloneProject;
  const contract = window.PulumurGuillotineProductionContractV1;
  const engine = window.PulumurGuillotineProductionEngineV1;
  const exportApi = window.PulumurGuillotineProductionExportV1;
  const materialApi = window.PulumurMaterialMaster;
  const workspace = $('productionWorkspace');
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeName = value => String(value || 'PLMR-GIYOTIN').replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü_-]+/g,'-').replace(/^-+|-+$/g,'');
  const clone = value => JSON.parse(JSON.stringify(value == null ? null : value));
  const roundMm = value => value == null || value === '' ? '' : Math.round(Number(value));
  const STATUS_LABEL = { NORMAL:'Normal', ZERO_RESULT:'Sonuç 0', MANUAL_OVERRIDE:'Manuel Değişiklik', MANUAL_REQUIRED:'Manuel Giriş Gerekli' };
  const GUILLOTINE_HOST_SCHEMA = 'plmr-guillotine-workspace-host-v1';
  const P3DV_SCHEMA = 'plmr-p3dv-guillotine-v1';
  const PRODUCT_ID = 'GUILLOTINE';

  let activeTab = 'summary';
  let activeFormPositionId = '';
  let lastPackage = null;
  let lastMaterials = [];
  let materialStore = null;
  let draftOverrides = {};
  let dirty = false;
  let productionVisible = false;
  let p3dvFrame = null;
  let p3dvSessionId = '';
  let p3dvReady = false;
  let p3dvPayload = null;
  let p3dvRetry = 0;
  let p3dvTimer = 0;

  function createNonce(prefix) {
    try {
      const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
      return `${prefix}-${Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('')}`;
    } catch (_) {
      return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    }
  }
  function targetOrigin() { try { const value=String(location.origin||''); return value&&value!=='null'?value:'*'; } catch (_) { return '*'; } }
  function acceptedOrigin(origin) { try { const own=String(location.origin||''); return !own||own==='null'||origin===own||origin==='null'; } catch (_) { return true; } }

  function download(name, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function currentProject(){ return app.getProject(); }
  function parentContext(){
    const candidates=[window];
    try { if(window.parent && window.parent!==window) candidates.push(window.parent); } catch(_){}
    for(const candidate of candidates){
      try {
        const access=candidate.PulumurAccessContext;
        if(access && typeof access.getContext==='function'){
          const c=access.getContext()||{};
          if(c.organizationId) return {userId:String(c.userId||''),organizationId:String(c.organizationId),role:String(c.role||'')};
        }
      } catch(_){}
    }
    return {userId:'LOCAL_PRODUCTION',organizationId:'LOCAL_STANDALONE',role:'LOCAL'};
  }
  function getMaterialStore(){
    if(materialStore) return materialStore;
    if(!materialApi || typeof materialApi.createMaterialMaster!=='function') throw new Error('MATERIAL_MASTER_UNAVAILABLE');
    materialStore=materialApi.createMaterialMaster({contextProvider:parentContext,seedUrl:'../../production/guillotine/v1/materialMaster.seed.json'});
    return materialStore;
  }
  function productionState(project){
    if(!project.production || typeof project.production!=='object') project.production={};
    if(!project.production.guillotineV1 || project.production.guillotineV1.contractId!==contract.CONTRACT_ID){
      project.production.guillotineV1={contractId:contract.CONTRACT_ID,overrides:{},lastGenerated:null};
    }
    const state=project.production.guillotineV1;
    if(!state.overrides || typeof state.overrides!=='object') state.overrides={};
    return state;
  }
  function lineStatusClass(status){ return exportApi.statusClass(status); }
  function fieldStatus(line,field){ return exportApi.fieldStatus(line,field); }
  function lineNote(line){ return line && line.description && line.description!==line.profileName ? line.description : ''; }
  function materialMap(){ const map=new Map(); lastMaterials.forEach(m=>{if(m&&m.code)map.set(String(m.code).toUpperCase(),m);}); return map; }
  function imageFor(code){ const item=materialMap().get(String(code||'').toUpperCase()); return item&&item.image?`../../${item.image}`:''; }
  function setFooter(message){ const el=$('productionFooterNote'); if(el)el.textContent=String(message||''); }
  function setDirty(value){ dirty=Boolean(value); const save=$('productionSaveBtn'); if(save){save.disabled=!dirty; save.classList.toggle('is-dirty',dirty);} }

  async function generatePackage(options){
    const opts=options||{};
    const project=currentProject(); const state=productionState(project);
    const materials=await getMaterialStore().list({activeOnly:true});
    const source=contract.projectToProductionSource(project,model);
    const pkg=engine.generatePackage({source,materials,overrides:opts.useSaved?state.overrides:draftOverrides});
    pkg.sourcePositions=source.positions;
    lastPackage=pkg; lastMaterials=materials;
    if(!activeFormPositionId || !pkg.positions.some(p=>p.positionId===activeFormPositionId)) activeFormPositionId=pkg.positions[0]&&pkg.positions[0].positionId||'';
    renderAll(pkg);
    return pkg;
  }

  function renderHeader(pkg){
    const supported=(pkg.positions||[]).length; const all=(pkg.sourcePositions||[]).length; const unsupported=(pkg.validation&&pkg.validation.errors||[]).length;
    const required=(pkg.allLines||[]).filter(x=>x.status==='MANUAL_REQUIRED').length;
    const badge=$('productionStatusBadge');
    badge.textContent=required?'MANUEL GİRİŞ GEREKLİ':(supported?'ÜRETİM PAKETİ HAZIR':'DESTEKLENEN POZ YOK');
    badge.className=`production-status ${required?'required':(supported?'ready':'required')}`;
    $('productionMeta').innerHTML=`<strong>${supported}</strong> desteklenen poz <span>·</span> <strong>${all}</strong> toplam poz${unsupported?` <span>·</span> <strong>${unsupported}</strong> kapsam dışı`:''}`;
    ['productionFormsBtn','productionXlsxBtn','productionPdfBtn','productionPrintBtn'].forEach(id=>{const b=$(id);if(b)b.disabled=!supported;});
  }

  function positionNav(pkg){
    return `<div class="production-form-navs">${(pkg.positions||[]).map((p,i)=>`<button type="button" class="production-form-nav ${p.positionId===activeFormPositionId?'active':''}" data-position-id="${esc(p.positionId)}">${esc(p.positionNo||`Poz ${i+1}`)}</button>`).join('')}</div>`;
  }
  function renderPositionToolbar(pkg, actions){
    return `<div class="production-position-toolbar"><div class="production-position-select">${positionNav(pkg)}</div><div class="production-position-actions">${actions||''}</div></div>`;
  }
  function renderSummary(pkg){
    if(!(pkg.positions||[]).length) return '<div class="production-empty"><strong>Üretim formu oluşturulamadı</strong><p>V45.4.3 reçetesine uyan poz bulunmuyor.</p></div>';
    const pos=(pkg.positions||[]).find(p=>p.positionId===activeFormPositionId)||pkg.positions[0];
    return `${renderPositionToolbar(pkg)}<div class="production-a4-preview">${exportApi.positionPageHtml(pkg,pos,lastMaterials,{imagePrefix:'../../'})}</div>`;
  }

  function editableNumber(line,field,value){
    const st=fieldStatus(line,field); const name=field==='length'?'length':'quantity';
    const shown=value==null?'':(field==='length'?roundMm(value):value);
    return `<input class="production-edit ${lineStatusClass(st)}" data-edit-field="${name}" data-position-id="${esc(line.positionIds&&line.positionIds[0]||'')}" data-rule-id="${esc(line.ruleId)}" type="number" step="1" min="0" value="${esc(shown)}" placeholder="${st==='MANUAL_REQUIRED'?'Giriş gerekli':''}" title="Hesaplanan: ${esc(field==='length'?roundMm(line.calculatedLength):line.calculatedQuantity)}"/>`;
  }
  function editableText(line,field,value){
    const st=fieldStatus(line,field);
    return `<input class="production-edit ${lineStatusClass(st)}" data-edit-field="${field}" data-position-id="${esc(line.positionIds&&line.positionIds[0]||'')}" data-rule-id="${esc(line.ruleId)}" type="text" value="${esc(value||'')}"/>`;
  }
  function renderCuts(pkg){
    const rows=(pkg.cutItems||[]).filter(line=>(line.positionIds||[]).includes(activeFormPositionId)).map(line=>{
      const image=imageFor(line.materialCode);
      return `<tr class="${lineStatusClass(line.status)}" data-line="${esc(line.ruleId)}"><td><strong>${esc(line.materialCode)}</strong></td><td class="production-material-image-cell">${image?`<img src="${esc(image)}" alt="${esc(line.materialCode)}"/>`:''}</td><td>${esc(line.profileName)}</td><td>${editableNumber(line,'length',line.effectiveLength)}</td><td>${editableNumber(line,'quantity',line.effectiveQuantity)}</td><td>${editableText(line,'ral',line.ral)}</td><td>${editableText(line,'surface',line.surface)}</td><td>${editableText(line,'description',lineNote(line))}</td><td><small>${esc(STATUS_LABEL[line.status]||line.status)}</small></td></tr>`;
    }).join('');
    const actions=`<button type="button" class="production-save secondary" data-production-save ${dirty?'':'disabled'}>Kaydet</button><button id="productionResetOverridesBtn" type="button" class="secondary">Tüm Override'ları Temizle</button>`;
    return `${renderPositionToolbar(pkg,actions)}<div class="production-table-wrap"><table class="production-table production-cut-table"><thead><tr><th>Kod</th><th>Görsel</th><th>Profil</th><th>Boy (mm)</th><th>Adet</th><th>RAL</th><th>Yüzey</th><th>Açıklama</th><th>Durum</th></tr></thead><tbody>${rows||'<tr><td colspan="9" class="production-empty-cell">Bu poz için kesim satırı yok.</td></tr>'}</tbody></table></div>`;
  }

  function renderAccessories(pkg){
    const rows=(pkg.accessoryItems||[]).filter(line=>(line.positionIds||[]).includes(activeFormPositionId)).map(line=>{
      const image=imageFor(line.materialCode);
      return `<tr class="${lineStatusClass(line.status)}" data-line="${esc(line.ruleId)}"><td><strong>${esc(line.materialCode)}</strong></td><td class="production-material-image-cell">${image?`<img src="${esc(image)}" alt="${esc(line.materialCode)}"/>`:''}</td><td>${esc(line.profileName)}</td><td>${editableNumber(line,'quantity',line.effectiveQuantity)}</td><td>${esc(line.unit||'')}</td><td>${editableText(line,'description',lineNote(line))}</td><td><small>${esc(STATUS_LABEL[line.status]||line.status)}</small></td></tr>`;
    }).join('');
    const actions=`<button type="button" class="production-save secondary" data-production-save ${dirty?'':'disabled'}>Kaydet</button><button id="productionResetOverridesBtn" type="button" class="secondary">Tüm Override'ları Temizle</button>`;
    return `${renderPositionToolbar(pkg,actions)}<div class="production-table-wrap"><table class="production-table production-accessory-table"><thead><tr><th>Kod</th><th>Görsel</th><th>Aksesuar</th><th>Adet</th><th>Birim</th><th>Açıklama</th><th>Durum</th></tr></thead><tbody>${rows||'<tr><td colspan="7" class="production-empty-cell">Bu poz için aksesuar satırı yok.</td></tr>'}</tbody></table></div>`;
  }

  function renderDrawing2d(){
    const current=app.draw({quiet:true,renderValidation:false});
    if(!current) return '<div class="production-empty"><strong>2D çıktı oluşturulamadı</strong><p>Geçerli proje çizimi bulunamadı.</p></div>';
    let svg='';
    try { svg=window.PulumurGeometry.renderSvg(current,{width:1500,height:1000}); } catch(_) {}
    return `<div class="production-page-head"><div><span>SALT OKUNUR ÇİZİM ÇIKTISI</span><h3>2D Proje Çizimi</h3><p>Bu sekme mevcut çizim motorunun çıktısını gösterir; üretim paketinden çizim düzenlenmez.</p></div></div><div class="production-drawing-output production-drawing-2d">${svg||'<p>2D önizleme üretilemedi.</p>'}</div>`;
  }

  function ralColor(code){
    const base=String(code||'RAL 7016').toUpperCase().match(/RAL\s+\d{4}/); const key=base?base[0]:'RAL 7016';
    const catalog=window.P3DV_RAL_CATALOG&&window.P3DV_RAL_CATALOG.all||[]; const found=catalog.find(item=>String(item.code).toUpperCase()===key);
    return {code:key,hex:found&&found.hex?found.hex:'#383e42'};
  }
  function finishName(surface){ const raw=String(surface||'').toUpperCase(); if(raw.includes('PARLAK')||raw.includes('GLOSS'))return'GLOSS'; if(raw.includes('TEXTURE'))return'TEXTURE'; return'MATTE'; }
  function p3dvStatePayload(){
    const pkg=lastPackage||{sourcePositions:[]}; const project=currentProject(); let columns=2;
    try { const current=app.getDrawing&&app.getDrawing(); columns=Math.max(1,Math.min(10,Number(current&&current.layout&&current.layout.columnCount)||2)); } catch(_){}
    const positions=(pkg.sourcePositions||[]).map(source=>{
      const color=ralColor(source.systemColor); const finish=finishName(source.surface);
      return {id:String(source.positionId||''),positionNo:String(source.positionNo||''),width:Number(source.width)||1,height:Number(source.height)||1,quantity:Math.max(1,Math.trunc(Number(source.quantity)||1)),series:'A SERIES',type:'STANDARD',subtype:'STANDARD',mechanism:String(source.mechanism||'CHAIN'),glassThickness:String(source.glassThickness||'INSULATED GLASS'),glassColor:String(source.glassColor||'TRANSPARENT'),customGlassColor:'',color:`${color.code} ${String(source.surface||'TEXTURE')}`.trim(),finish,surface:finish,systemColor:{code:color.code,hex:color.hex,finish,kind:'ral'},panelCount:String(source.panelLayout||'1+2'),panels:3,panelType:String(source.panelLayout||'1+2'),motorDirection:String(source.motorDirection||'RIGHT'),view:String(source.view||'OUTSIDE VIEW'),motorType:String(source.motorType||'SOMFY RTS'),remoteControl:String(source.remoteControl||'2 CHANNELS'),bottomPanelMode:'FIXED',bottomPanelState:'CLOSED',bottomPanelHinge:'BOTTOM',collectionState:'NORMAL',displayState:'OPEN',showDimensions:false,layoutColumns:columns};
    });
    const commonColor=positions[0]&&positions[0].systemColor||{code:'RAL 7016',hex:'#383e42',finish:'TEXTURE',kind:'ral'};
    return {positions,commonSettings:{layoutColumns:columns,systemColor:commonColor,color:`${commonColor.code} ${commonColor.finish}`,productType:'GUILLOTINE'},selectedPositionId:'',openState:'OPEN',showDimensions:false,projectId:project&&project.projectInfo&&project.projectInfo.projectCode||''};
  }
  function postP3dv(type,payload){
    if(!p3dvFrame||!p3dvFrame.contentWindow)return false;
    try {p3dvFrame.contentWindow.postMessage({schema:P3DV_SCHEMA,source:'plmr-guillotine-workspace',type,sessionId:p3dvSessionId,productId:PRODUCT_ID,payload:payload||{}},targetOrigin());return true;} catch(_){return false;}
  }
  function armP3dv(){
    clearTimeout(p3dvTimer); if(!p3dvFrame)return;
    if(p3dvReady){postP3dv('P3DV_GUILLOTINE_STATE',p3dvPayload||p3dvStatePayload());return;}
    if(p3dvRetry>=24)return;
    p3dvRetry+=1;postP3dv('P3DV_GUILLOTINE_INIT',{requestedAt:Date.now(),attempt:p3dvRetry});
    p3dvTimer=setTimeout(armP3dv,Math.min(850,180+p3dvRetry*35));
  }
  function renderDrawing3d(){
    p3dvSessionId=createNonce('production-p3dv');p3dvReady=false;p3dvRetry=0;p3dvPayload=p3dvStatePayload();
    return `<div class="production-page-head"><div><span>SALT OKUNUR ÇİZİM ÇIKTISI</span><h3>3D Proje Çizimi</h3><p>Mevcut P3DV sahnesi üretim paketinde yalnız görüntülenir; burada geometri düzenlenmez.</p></div></div><div class="production-drawing-output production-drawing-3d"><iframe id="production3dFrame" title="Giyotin 3D Proje Çizimi" tabindex="-1" aria-label="Salt okunur 3D proje çizimi" src="../../modules/p3dv/index.html?embedded=1&amp;standalonePreview=guillotine&amp;readonly=1&amp;v=10.48-r48"></iframe></div>`;
  }

  function renderGlass(){return `<div class="production-future"><span>CAM SİPARİŞ</span><h3>Cam Sipariş · Sonraki Aşama</h3><p>Gerçek camcı Excel formatı sonraki aşamada kullanıcı örneğine göre geliştirilecek; bu sürümde format veya kural uydurulmadı.</p></div>`;}
  function renderStock(){return `<div class="production-future"><span>STOK (PLANLANAN)</span><h3>Stok (Planlanan)</h3><p>Bu bölüm gerçek stok bilgisini içermez. Standart olarak stokta tutulması planlanan profilleri bilgi amacıyla göstermektedir.</p><div class="production-planned-badge">V45.5 / sonraki aşama operasyon mantığı</div></div>`;}
  function renderOptimization(){return `<div class="production-future"><span>OPTİMİZASYON</span><h3>Kesim Optimizasyonu · V45.5</h3><p>Bu sürümde optimizasyon motoru çalıştırılmaz. Gelecek anahtar ham profil kimliğine göre olacaktır: Profil Kodu + Ham Profil Tipi + Stok Boyu + gerekiyorsa diğer ham malzeme farkı. <strong>RAL ve yüzey gruplama anahtarı değildir.</strong></p></div>`;}
  function renderPurchase(){return `<div class="production-future"><span>SATIN ALMA</span><h3>Satın Alma · Sonraki Aşama</h3><p>V45.4.2 kapsamında hesap motoru uygulanmadı. Menü korunmuştur.</p></div>`;}
  function renderRules(){
    const rows=(engine.RULES||[]).map(r=>`<tr><td><code>${esc(r.ruleId)}</code></td><td><strong>${esc(r.materialCode)}</strong></td><td>${esc(r.kind)}</td><td><code>${esc(r.lengthFormula||'—')}</code></td><td><code>${esc(r.quantityFormula||'—')}</code></td><td>${esc((r.sourcePositions||[]).join(', '))}</td></tr>`).join('');
    return `<div class="production-page-head"><div><span>KAYNAK: ERGBEY GİYOTİN TABLOLAR.XLSX</span><h3>Kurallar</h3><p>1+2 Isıcam Standart reçete. H21 = H20 ve I19:I23 = H5×2 düzeltmeleri aktiftir.</p></div></div><div class="production-table-wrap"><table class="production-table"><thead><tr><th>Rule</th><th>Kod</th><th>Tür</th><th>Boy Formülü</th><th>Adet Formülü</th><th>Kaynak</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderContent(pkg){
    const views={summary:renderSummary,drawing3d:renderDrawing3d,drawing2d:renderDrawing2d,cuts:renderCuts,accessories:renderAccessories,glass:renderGlass,stock:renderStock,optimization:renderOptimization,purchase:renderPurchase,rules:renderRules};
    $('productionContent').innerHTML=(views[activeTab]||renderSummary)(pkg);
    if(activeTab==='drawing3d'){
      p3dvFrame=$('production3dFrame');
      if(p3dvFrame)p3dvFrame.addEventListener('load',()=>{p3dvReady=false;p3dvRetry=0;armP3dv();},{once:true});
    } else {p3dvFrame=null;clearTimeout(p3dvTimer);}
  }
  function renderAll(pkg){renderHeader(pkg);renderContent(pkg);setDirty(dirty);}
  function switchTab(tab){
    activeTab=tab;
    $('productionTabs').querySelectorAll('button[data-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===tab));
    if(lastPackage)renderContent(lastPackage);
  }

  function stageOverride(positionId,ruleId,field,raw){
    draftOverrides[positionId]=draftOverrides[positionId]||{}; draftOverrides[positionId][ruleId]=draftOverrides[positionId][ruleId]||{};
    const entry=draftOverrides[positionId][ruleId];
    const sourceLine=lastPackage&&(lastPackage.allLines||[]).find(l=>l.positionIds&&l.positionIds[0]===positionId&&l.ruleId===ruleId);
    if(field==='length'||field==='quantity'){
      if(raw==='') delete entry[field];
      else {let n=Number(raw);if(!Number.isFinite(n)||n<0)throw new Error('Üretim değeri sıfır veya pozitif sayı olmalıdır.');if(field==='length')n=Math.round(n);entry[field]=n;}
    } else if(field==='ral'||field==='surface'||field==='description'){
      const calculated=field==='ral'?sourceLine&&sourceLine.calculatedRal:field==='surface'?sourceLine&&sourceLine.calculatedSurface:sourceLine&&sourceLine.profileName;
      const text=String(raw||'').trim(); if(!text||text===String(calculated||'').trim())delete entry[field];else entry[field]=text;
    }
    if(!Object.keys(entry).length)delete draftOverrides[positionId][ruleId];
    if(!Object.keys(draftOverrides[positionId]||{}).length)delete draftOverrides[positionId];
    setDirty(true);
  }
  async function saveDraft(message){
    if(!dirty){setFooter(message||'Kaydedilecek yeni değişiklik yok.');return lastPackage;}
    const project=currentProject(); const state=productionState(project); state.overrides=clone(draftOverrides)||{};
    const pkg=await generatePackage({useSaved:true});
    state.lastGenerated={at:new Date().toISOString(),sourceProjectId:pkg.sourceProjectId||'',sourceRevision:pkg.sourceRevision||'',engineId:pkg.engineId,supportedPositions:pkg.positions.length};
    try {if(app&&typeof app.syncToParent==='function')app.syncToParent();} catch(_){}
    setDirty(false);setFooter(message||'Üretim paketi değişiklikleri kaydedildi.');return pkg;
  }
  async function resetOverrides(){ draftOverrides={};setDirty(true);await generatePackage();setFooter('Override temizliği taslakta. Kaydet veya Ctrl+S ile onaylayın.'); }

  function postHost(type){
    try {
      if(!window.parent||window.parent===window)return false;
      window.parent.postMessage({schema:GUILLOTINE_HOST_SCHEMA,source:'plmr-guillotine-workspace',type,productId:PRODUCT_ID,payload:{}},targetOrigin());return true;
    } catch(_){return false;}
  }
  function showProductionView(active){
    productionVisible=Boolean(active);
    document.querySelectorAll('body > .workspace, body > .preview-panel').forEach(node=>{node.hidden=productionVisible;});
    if(workspace)workspace.hidden=!productionVisible;
    document.body.classList.toggle('production-workspace-active',productionVisible);
    if(productionVisible && lastPackage)renderContent(lastPackage);
  }
  async function openProduction(){
    draftOverrides=clone(productionState(currentProject()).overrides)||{};setDirty(false);showProductionView(true);setFooter('Üretim paketi hazırlanıyor…');
    try {const pkg=await generatePackage();setFooter(`${pkg.positions.length} desteklenen poz için üretim paketi oluşturuldu.`);} catch(error){setFooter(error.message||String(error));}
    postHost('PLMR_PRODUCTION_TAB_OPEN');
  }
  function closeProduction(){postHost('PLMR_PRODUCTION_TAB_CLOSE');showProductionView(false);}

  async function ensureSavedForOutput(){if(dirty)await saveDraft('Değişiklikler kaydedildi; çıktı güncel değerlerle hazırlanıyor.');return generatePackage({useSaved:true});}

  $('productionBtn').addEventListener('click',()=>void openProduction());
  $('productionCloseBtn').addEventListener('click',closeProduction);
  $('productionGenerateBtn').addEventListener('click',async()=>{try{const state=productionState(currentProject());draftOverrides=clone(state.overrides)||{};setDirty(false);await generatePackage({useSaved:true});setFooter('Üretim paketi proje verisinden yeniden hesaplandı.');}catch(error){setFooter(error.message||String(error));}});
  $('productionSaveBtn').addEventListener('click',()=>void saveDraft());
  $('productionFormsBtn').addEventListener('click',()=>switchTab('summary'));
  $('productionTabs').addEventListener('click',event=>{const b=event.target.closest('button[data-tab]');if(b)switchTab(b.dataset.tab);});
  $('productionContent').addEventListener('click',event=>{
    const nav=event.target.closest('.production-form-nav[data-position-id]'); if(nav){activeFormPositionId=nav.dataset.positionId;if(lastPackage)renderContent(lastPackage);return;}
    if(event.target.closest('[data-production-save]')){void saveDraft();return;}
    if(event.target.closest('#productionResetOverridesBtn')){void resetOverrides();return;}
  });
  $('productionContent').addEventListener('change',event=>{
    const input=event.target.closest('[data-edit-field]');if(!input)return;
    try{stageOverride(input.dataset.positionId,input.dataset.ruleId,input.dataset.editField,input.value);void generatePackage().then(()=>setFooter('Değişiklik taslakta. Kaydet veya Ctrl+S ile onaylayın.'));}catch(error){setFooter(error.message||String(error));if(lastPackage)renderContent(lastPackage);}
  });

  document.addEventListener('keydown',event=>{
    if(!productionVisible)return;
    if((event.ctrlKey||event.metaKey)&&String(event.key).toLowerCase()==='s'){event.preventDefault();void saveDraft('Ctrl+S · Üretim paketi değişiklikleri kaydedildi.');}
  });

  $('productionXlsxBtn').addEventListener('click',async()=>{
    try{const pkg=await ensureSavedForOutput();if(!pkg.positions.length)throw new Error('Excel için desteklenen poz yok.');const code=pkg.projectInfo.projectCode||pkg.projectInfo.projectName||'PLMR';download(`${safeName(code)}-GIYOTIN-URETIM.xlsx`,exportApi.createWorkbook(pkg,lastMaterials),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');setFooter('Giyotin üretim Excel dosyası oluşturuldu.');}catch(error){setFooter(error.message||String(error));}
  });
  $('productionPdfBtn').addEventListener('click',async()=>{
    try{const pkg=await ensureSavedForOutput();if(!pkg.positions.length)throw new Error('PDF için desteklenen poz yok.');const code=pkg.projectInfo.projectCode||pkg.projectInfo.projectName||'PLMR';download(`${safeName(code)}-GIYOTIN-URETIM.pdf`,await exportApi.createPdf(pkg,lastMaterials),'application/pdf');setFooter('Her poz bir A4 olacak şekilde PDF oluşturuldu.');}catch(error){setFooter(error.message||String(error));}
  });
  $('productionPrintBtn').addEventListener('click',async()=>{
    try{const pkg=await ensureSavedForOutput();if(!pkg.positions.length)throw new Error('Yazdırmak için desteklenen poz yok.');const win=window.open('','_blank','noopener,noreferrer');if(!win)throw new Error('Yazdırma penceresi tarayıcı tarafından engellendi.');win.document.open();win.document.write(exportApi.buildPrintHtml(pkg,lastMaterials,{baseHref:document.baseURI,imagePrefix:'../../'}));win.document.close();win.addEventListener('load',()=>{setTimeout(()=>{win.focus();win.print();},120);},{once:true});setFooter('A4 yazdırma görünümü açıldı.');}catch(error){setFooter(error.message||String(error));}
  });

  window.addEventListener('message',event=>{
    const data=event.data||{};
    if(p3dvFrame && event.source===p3dvFrame.contentWindow && acceptedOrigin(event.origin) && data.schema===P3DV_SCHEMA && data.source==='plmr-p3dv-host' && data.productId===PRODUCT_ID && data.sessionId===p3dvSessionId && data.type==='P3DV_HOST_READY'){
      p3dvReady=true;clearTimeout(p3dvTimer);postP3dv('P3DV_GUILLOTINE_STATE',p3dvPayload||p3dvStatePayload());return;
    }
    if(event.source!==window.parent||!acceptedOrigin(event.origin))return;
    if(data.schema!==GUILLOTINE_HOST_SCHEMA||data.source!=='plmr-erp-shell'||data.productId!==PRODUCT_ID||data.type!=='PLMR_PRODUCTION_VIEW_STATE')return;
    showProductionView(Boolean(data.payload&&data.payload.active));
  });

  window.PulumurStandaloneProductionUI={open:openProduction,close:closeProduction,generatePackage,save:saveDraft,getLastPackage:()=>lastPackage,getMaterials:()=>lastMaterials,switchTab};
})();
