(function () {
  'use strict';

  const registry = window.PulumurProductRegistry;
  const model = window.PulumurStandaloneProject;
  const layout = window.PulumurStandaloneLayout;
  const exporter = window.PulumurStandaloneExport;
  const $ = id => document.getElementById(id);
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const WORKING_STORAGE_KEY = 'plmr.standalone.working.v45';
  const KNOWN = {
    glassThickness: ['8 MM', 'INSULATED GLASS'],
    glassColor: ['TRANSPARENT', 'SMOKED', 'BRONZE', 'LOW-E GLASS'],
    type: ['STANDARD', 'CLEANABLE', 'UPWARD COLLECTING'],
    mechanism: ['CHAIN', 'BELT'],
    panelCount: ['1+1', '1+2', '1+3'],
    motorDirection: ['RIGHT', 'LEFT'],
    view: ['INSIDE VIEW', 'OUTSIDE VIEW'],
    motorType: ['SOMFY RTS', 'SOMFY IO', 'CUPPON'],
    remoteControl: ['1 CHANNEL', '2 CHANNELS', '4 CHANNELS', '6 CHANNELS', '16 CHANNELS', '40 CHANNELS']
  };
  const LABEL = {
    '8 MM': '8 mm', 'INSULATED GLASS': 'Isıcam', TRANSPARENT: 'Şeffaf', SMOKED: 'Füme', GREY: 'Füme', BRONZE: 'Bronz', 'LOW-E GLASS': 'Low-e',
    STANDARD: 'Standart', CLEANABLE: 'Silinebilir', 'UPWARD COLLECTING': 'Yukarı Toplanan', 'DOWNWARD COLLECTING': 'Aşağı Toplanan',
    CHAIN: 'Zincir', BELT: 'Kayış', RIGHT: 'Sağ', LEFT: 'Sol', OPEN: 'Açık', CLOSED: 'Kapalı',
    'SOMFY RTS': 'Somfy RTS', 'SOMFY IO': 'Somfy IO', CUPPON: 'Cuppon',
    '1 CHANNEL': '1 Kanal', '2 CHANNELS': '2 Kanal', '4 CHANNELS': '4 Kanal', '6 CHANNELS': '6 Kanal', '16 CHANNELS': '16 Kanal', '40 CHANNELS': '40 Kanal',
    'INSIDE VIEW': 'İç Bakış', 'OUTSIDE VIEW': 'Dış Bakış', OTHER: 'Diğer'
  };

  let project;
  let drawing = null;
  let autoDrawTimer = null;
  let positionDraft = [];
  let detailDraftIndex = -1;
  let detailLivePositionId = '';
  let ralTarget = null;
  let pendingRalBase = '';
  let parentWorkspaceHash = '';
  let suppressParentRestore = false;
  let previewMode = requestedProduct() === 'GUILLOTINE' ? '3D' : '2D';
  let previewShowDimensions = false;
  let previewOpenState = 'CLOSED';
  const previewPositionOpenStates = new Map();
  let selectedPreviewPositionId = '';
  let dimensionDraftId = '';
  const selected = new Set();
  let bulkDetailIds = [];
  let identityRetryTimer = 0;
  let identityRequestAttempts = 0;
  let p3dvHandshakeTimer = 0;
  let p3dvHandshakeAttempts = 0;
  let stageSaveChain = Promise.resolve();
  const GUILLOTINE_HOST_SCHEMA = 'plmr-guillotine-workspace-host-v1';
  const P3DV_GUILLOTINE_SCHEMA = 'plmr-p3dv-guillotine-v1';
  const GUILLOTINE_PRODUCT_ID = 'GUILLOTINE';
  const hostSessionId = createSessionNonce('identity');
  const p3dvSessionId = createSessionNonce('p3dv');
  let activeIdentity = { userId:'', fullName:'', email:'' };
  let p3dvHostReady = false;

  function createSessionNonce(prefix) {
    try {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return `${prefix}-${Array.from(bytes, value => value.toString(16).padStart(2,'0')).join('')}`;
    } catch (_) {
      return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    }
  }
  function ownOrigin() {
    try { return window.location.protocol === 'file:' ? 'null' : String(window.location.origin || ''); } catch (_) { return ''; }
  }
  function controlledTargetOrigin() {
    const origin = ownOrigin();
    return origin && origin !== 'null' ? origin : '*';
  }
  function controlledOriginAccepted(eventOrigin) {
    const origin = ownOrigin();
    return origin && origin !== 'null' ? eventOrigin === origin : (eventOrigin === 'null' || eventOrigin === '' || (window.location.protocol === 'file:' && eventOrigin === 'file://'));
  }
  function activeIdentityAuthor() {
    return String(activeIdentity.fullName || activeIdentity.email || '').trim();
  }


  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }
  function safeName(value) { return String(value || 'plmr-proje').replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü_-]+/g, '-'); }

  function dateStamp() {
    const now = new Date();
    const p = value => String(value).padStart(2, '0');
    return `${now.getFullYear()}${p(now.getMonth()+1)}${p(now.getDate())}.${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  }
  function ensureProjectCode() {
    const info = project && project.projectInfo;
    if (!info) return '';
    if (String(info.projectCode || '').trim()) return info.projectCode;
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    info.projectCode = `PLMR.${requestedProduct()}.${dateStamp()}.${random}`;
    return info.projectCode;
  }
  function colorPartsFromValue(value) {
    const raw = String(value || '').trim();
    if (!raw || raw.toUpperCase() === 'NATURAL') return { base:'', finish:'', label:'' };
    const match = raw.match(/^(.*?)(?:\s+(PARLAK|MAT|TEXTURE))?$/i);
    const base = String(match && match[1] || raw).trim();
    const finish = String(match && match[2] || '').trim().toUpperCase();
    return { base, finish, label:[base, finish].filter(Boolean).join(' ') };
  }
  function buildColorValue(base, finish) {
    const b = String(base || '').trim();
    const f = String(finish || '').trim().toUpperCase();
    return [b, f].filter(Boolean).join(' ');
  }
  function currentColorParts(value) {
    const parts = colorPartsFromValue(value == null ? project.commonSettings.color : value);
    return { base: parts.base, finish: parts.finish, label: parts.label };
  }
  function updateColorButton(code, finish) {
    const base = String(code || '').trim();
    const normalizedFinish = String(finish || $('commonColorFinish') && $('commonColorFinish').value || '').trim().toUpperCase();
    const option = colorOption(base);
    $('commonColor').value = base || '';
    $('commonColorLabel').textContent = buildColorValue(base, normalizedFinish) || 'Renk seç';
    const swatch = $('commonColorSwatch');
    swatch.style.backgroundColor = option ? option.hex : '#d9e0e4';
    swatch.style.backgroundImage = option && option.image ? `url('../../modules/p3dv/${String(option.image).replace(/^\/+/, '')}')` : '';
    if ($('commonColorFinish')) $('commonColorFinish').value = normalizedFinish || '';
    if ($('commonColorCustom')) $('commonColorCustom').hidden = base !== 'OTHER';
  }
  function readCommonColorValue() {
    const code = String($('commonColor').value || '').trim();
    const finish = String($('commonColorFinish').value || '').trim().toUpperCase();
    const base = code === 'OTHER' ? String($('commonColorCustom').value || '').trim().toUpperCase() : code;
    return { base, finish, label: buildColorValue(base, finish) };
  }
  function requireCommonColor() {
    const color = readCommonColorValue();
    if (!color.base) { setStatus('Renk seçilmelidir.', true); return null; }
    if (!color.finish) { setStatus('Renk için yüzey seçimi zorunludur.', true); return null; }
    return color;
  }
  async function performStageSave(message) {
    ensureProjectCode();
    if (!project.projectInfo.projectName) project.projectInfo.projectName = project.projectInfo.projectCode || 'PROJE';
    syncProjectInfoToParent();
    persistWorkingCopy();
    const synced = syncStandaloneToParent();
    const owner = parentWindow();
    let commands = null; try { commands = owner && owner.PulumurProjectCommandService; } catch (_) { commands = null; }
    if (!synced || !commands || typeof commands.execute !== 'function' || !commands.has('project:save')) {
      setStatus('Çalışma kopyası yerel olarak kaydedildi; Projelerim bulut kaydı bu ortamda kullanılamıyor.', true);
      return false;
    }
    try {
      const before = parentState() && parentState().getRecord ? parentState().getRecord() : {};
      const ok = await commands.execute('project:save', { silent:true }, { source:'standalone-v43-stage-save' });
      if (!ok) { setStatus('Proje buluta kaydedilemedi. Projelerim kaydı oluşmadı.', true); return false; }
      const state = parentState();
      const record = state && state.getRecord ? state.getRecord() || {} : {};
      if (!record.projectId || !record.projectCode) { setStatus('Bulut kaydı tamamlandı fakat proje kimliği doğrulanamadı.', true); return false; }
      const serverCode = String(record.projectCode || '').trim();
      const codeChanged = serverCode && project.projectInfo.projectCode !== serverCode;
      if (codeChanged) {
        project.projectInfo.projectCode = serverCode;
        if (!project.projectInfo.projectName || project.projectInfo.projectName.startsWith('PLMR.GUILLOTINE.')) project.projectInfo.projectName = serverCode;
        persistWorkingCopy();
        syncStandaloneToParent();
        await commands.execute('project:save', { silent:true }, { source:'standalone-v43-server-code-sync' });
      }
      renderProjectSummary();
      setStatus(message || `Proje Projelerim'e kaydedildi: ${serverCode}`);
      return true;
    } catch (error) {
      setStatus(`Projelerim kaydı başarısız: ${error && error.message ? error.message : error}`, true);
      return false;
    }
  }
  function stageSave(message) {
    stageSaveChain = stageSaveChain.catch(() => false).then(() => performStageSave(message));
    return stageSaveChain;
  }
  function download(name, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 600);
  }
  function setStatus(message, error) {
    const node = $('status'); if (!node) return;
    node.textContent = message || ''; node.classList.toggle('error', Boolean(error));
  }
  function requestedProduct() {
    let stored = ''; try { stored = sessionStorage.getItem('plmr_selected_product') || ''; } catch (_) {}
    let query = ''; try { query = new URLSearchParams(location.search).get('product') || ''; } catch (_) {}
    return registry.resolveId(window.__PLMR_TEST_PRODUCT__ || query || stored || 'GUILLOTINE');
  }
  function localIsoDate() {
    const now = new Date(); const offset = now.getTimezoneOffset(); return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
  }
  function formatDate(value) {
    if (!value) return '—'; const parts = String(value).slice(0,10).split('-'); return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : value;
  }
  function displayValue(value) { return LABEL[String(value || '').toUpperCase()] || String(value || '—'); }
  function projectType() { return registry.resolveId(project.commonSettings && project.commonSettings.defaultProductType || requestedProduct()); }
  function parentWindow() {
    try { return window.parent && window.parent !== window ? window.parent : null; } catch (_) { return null; }
  }
  function parentState() {
    const owner = parentWindow();
    try { return owner && owner.PulumurProjectState ? owner.PulumurProjectState : null; } catch (_) { return null; }
  }
  function parentContext() {
    const state = parentState();
    let record = {}; let projectModel = null;
    try { record = state && state.getRecord ? state.getRecord() || {} : {}; } catch (_) {}
    try { projectModel = state && state.getModel ? state.getModel() : null; } catch (_) {}
    const meta = projectModel && projectModel.metadata || {};
    return {
      record,
      meta,
      userName: activeIdentityAuthor(),
      workspace: projectModel && projectModel.workspaces && projectModel.workspaces.standalone || null
    };
  }
  function scheduleIdentityRetry() {
    if (activeIdentityAuthor() || window.parent === window || identityRequestAttempts >= 30) return;
    if (identityRetryTimer) window.clearTimeout(identityRetryTimer);
    identityRetryTimer = window.setTimeout(() => { identityRetryTimer = 0; requestCanonicalIdentity(); }, Math.min(1200, 180 + identityRequestAttempts * 60));
  }
  function requestCanonicalIdentity() {
    if (window.parent === window || activeIdentityAuthor()) return false;
    identityRequestAttempts += 1;
    try {
      window.parent.postMessage({
        schema: GUILLOTINE_HOST_SCHEMA,
        source: 'plmr-guillotine-workspace',
        type: 'PLMR_IDENTITY_REQUEST',
        sessionId: hostSessionId,
        productId: GUILLOTINE_PRODUCT_ID
      }, controlledTargetOrigin());
      scheduleIdentityRetry();
      return true;
    } catch (_) { scheduleIdentityRetry(); return false; }
  }
  function applyCanonicalIdentity(identity) {
    const source = identity && typeof identity === 'object' ? identity : {};
    activeIdentity = {
      userId: String(source.userId || ''),
      fullName: String(source.fullName || source.displayName || '').trim(),
      email: String(source.email || '').trim()
    };
    const author = activeIdentityAuthor();
    if (!author) { scheduleIdentityRetry(); return; }
    if (identityRetryTimer) { window.clearTimeout(identityRetryTimer); identityRetryTimer = 0; }
    const info = project && project.projectInfo;
    if (!info || info.designer) return;
    info.designer = author;
    renderProjectSummary();
    persistWorkingCopy();
    syncStandaloneToParent();
  }


  function syncProjectInfoFromParent(options = {}) {
    const context = parentContext(); const info = project.projectInfo;
    const force = options.force === true;
    if (context.record.projectCode) info.projectCode = context.record.projectCode; else ensureProjectCode();
    if (context.record.revisionNo) info.revision = `R${String(context.record.revisionNo).padStart(2, '0')}`;
    if ((force || !info.customerName) && context.meta.customer) info.customerName = context.meta.customer;
    if ((force || !info.projectName) && context.meta.project && context.meta.project !== context.record.projectCode) info.projectName = context.meta.project;
    if (!info.designer) info.designer = context.meta.drawnBy || context.userName || '';
    if (force || !info.date) info.date = context.meta.date || localIsoDate();
    if (!info.revision || info.revision === 'R00') info.revision = 'R01';
  }
  function syncProjectInfoToParent() {
    const owner = parentWindow(); if (!owner) return false;
    try {
      // Same-origin compatibility only. Authenticated identity never comes from
      // this path; the canonical user is provided exclusively by postMessage.
      const doc = owner.document;
      const info = project.projectInfo;
      const name = String(info.projectName || '').trim() || String(info.projectCode || '').trim();
      const pairs = { customer: info.customerName || '', project: name, drawnBy: info.designer || '', date: info.date || '' };
      Object.entries(pairs).forEach(([id, value]) => {
        const input = doc.getElementById(id); if (!input) return;
        input.value = value;
        try { input.dispatchEvent(new owner.Event('input', { bubbles:true })); input.dispatchEvent(new owner.Event('change', { bubbles:true })); } catch (_) {}
      });
      return true;
    } catch (_) { return false; }
  }

  function persistWorkingCopy() {
    try { localStorage.setItem(WORKING_STORAGE_KEY, model.serialize(project)); } catch (_) {}
  }
  function workspacePayload() {
    return { schema:'plmr-standalone-workspace-v1', productId:projectType(), project:clone(project), updatedAt:new Date().toISOString() };
  }
  function syncStandaloneToParent() {
    const state = parentState(); if (!state || typeof state.dispatch !== 'function') return false;
    const payload = workspacePayload();
    suppressParentRestore = true;
    try { state.dispatch('PATCH_WORKSPACES', { standalone:payload }, { source:'standalone-v41-save', allowInvalid:true }); parentWorkspaceHash = JSON.stringify(payload.project); }
    finally { setTimeout(() => { suppressParentRestore = false; }, 0); }
    return true;
  }
  function restoreFromParentWorkspace() {
    if (suppressParentRestore) return false;
    const context = parentContext(); const stored = context.workspace && context.workspace.project;
    if (!stored || typeof stored !== 'object') return false;
    const hash = JSON.stringify(stored); if (hash === parentWorkspaceHash) return false;
    try {
      const restored = model.createProject(stored);
      project = restored; parentWorkspaceHash = hash; syncProjectInfoFromParent(); renderAll(); draw({ quiet:true }); return true;
    } catch (_) { return false; }
  }
  function subscribeParentState() {
    const state = parentState(); if (!state || typeof state.subscribe !== 'function') return;
    try { state.subscribe(() => restoreFromParentWorkspace()); } catch (_) {}
    const owner = parentWindow();
    if (owner) {
      try {
        owner.addEventListener('plmr:new-project-started', event => {
          const detail = event.detail || {};
          project = model.createProject({ productType:requestedProduct() });
          project.projectInfo.projectCode = detail.projectCode || '';
          ensureProjectCode();
          project.projectInfo.revision = 'R01';
          project.projectInfo.designer = activeIdentityAuthor() || '';
          project.projectInfo.date = detail.date || localIsoDate();
          parentWorkspaceHash = '';
          renderAll(); draw({ quiet:true }); persistWorkingCopy();
        });
      } catch (_) {}
    }
  }

  function fillLayoutModeSelect() {
    const select = $('layoutMode'); if (!select) return;
    select.innerHTML = '<option value="AUTO">Otomatik · En fazla 2 sütun</option>';
    for (let count=1; count<=10; count+=1) select.insertAdjacentHTML('beforeend', `<option value="COLUMNS_${count}">${count} sütun</option>`);
  }
  function layoutValueForProject() {
    const mode = String(project.layout && project.layout.mode || 'AUTO').toUpperCase();
    if (mode === 'AUTO') return 'AUTO';
    const count = Math.max(1, Math.min(10, Number(project.layout && project.layout.columnCount) || 2));
    return `COLUMNS_${count}`;
  }
  function parseLayoutSelection(value) {
    if (value === 'AUTO') return { mode:'AUTO', columnCount:2 };
    const match=String(value||'').match(/^COLUMNS_(\d+)$/); return { mode:'MANUAL', columnCount:Math.max(1,Math.min(10,Number(match&&match[1])||2)) };
  }

  function renderProjectSummary() {
    syncProjectInfoFromParent();
    ensureProjectCode();
    const info=project.projectInfo;
    $('projectInfoCode').textContent=info.projectCode||'Otomatik oluşturulacak';
    $('projectInfoCode').classList.toggle('is-placeholder', !info.projectCode);
    $('projectInfoCustomer').textContent=info.customerName||'Cari seçiminden otomatik gelecektir';
    $('projectInfoCustomer').classList.toggle('is-placeholder', !info.customerName);
    $('projectInfoName').textContent=info.projectName||info.projectCode||'İsim verilmezse proje kodu yazılacaktır';
    $('projectInfoName').classList.toggle('is-placeholder', !info.projectName);
    $('projectInfoRevision').textContent=info.revision||'R01';
    $('projectInfoDesigner').textContent=info.designer||activeIdentityAuthor()||'—';
    $('projectInfoDate').textContent=formatDate(info.date);
  }
  function commonDefaults() { return model.commonDefaults(project, projectType()); }
  function renderCommonSummary() {
    const type=projectType(); const values=commonDefaults(); const container=$('commonSettingsSummary');
    if (type === 'GUILLOTINE') {
      const colorLabel = project.commonSettings.color || '—';
      const rows=[
        ['Renk', colorLabel],
        ['Cam Kalınlığı', displayValue(values.glassThickness)], ['Cam Rengi', displayValue(values.glassColor)],
        ['Genel Açıklama', project.commonSettings.generalDescription || '—'], ['Tip', displayValue(values.type)],
        ['Mekanizma', displayValue(values.mechanism)], ['Panel Düzeni', displayValue(values.panelCount)],
        ['Motor Yönü', displayValue(values.motorDirection)], ['Görünüş', displayValue(values.view)],
        ['Motor', displayValue(values.motorType)], ['Kumanda', displayValue(values.remoteControl)],
        ['Kumanda Adet', String(values.remoteQuantity == null ? 0 : values.remoteQuantity)]
      ];
      container.innerHTML=rows.map(([label,value])=>`<div><span>${escapeHtml(label)}</span><strong class="${!value || value==='—' ? 'is-placeholder':''}">${escapeHtml(value || '—')}</strong></div>`).join('');
    } else {
      const rows=[['Renk', project.commonSettings.color||'—'],['Genel Açıklama',project.commonSettings.generalDescription||'—'],...model.optionDefinitions(type).map(field=>[field.label,displayValue(values[field.key])])];
      container.innerHTML=rows.map(([label,value])=>`<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
    }
  }
  function renderPositionTable(validation) {
    const result=validation||model.validateProject(project); const invalid=new Set(result.errors.map(item=>item.id).filter(Boolean));
    for (const id of [...selected]) if (!project.positions.some(item=>item.id===id)) selected.delete(id);
    $('positionRows').innerHTML=project.positions.map((p,index)=>`<tr data-id="${escapeHtml(p.id)}" class="${selected.has(p.id)?'selected ':''}${invalid.has(p.id)?'invalid':''}">
      <td class="select-column"><input class="row-select" type="checkbox" ${selected.has(p.id)?'checked':''} aria-label="${escapeHtml(p.positionNo)} seç" /></td>
      <td><input class="main-position-no" value="${escapeHtml(p.positionNo)}" aria-label="Poz numarası" /></td>
      <td>${escapeHtml(p.width)}</td><td>${escapeHtml(p.height)}</td><td>${escapeHtml(p.quantity)}</td><td>${escapeHtml(p.description||'—')}</td>
      <td><div class="row-actions compact-order"><button type="button" class="main-up secondary" ${index===0?'disabled':''}>↑</button><button type="button" class="main-down secondary" ${index===project.positions.length-1?'disabled':''}>↓</button></div></td></tr>`).join('');
    $('positionCount').textContent=`${project.positions.length} poz`;
    if ($('selectedCount')) $('selectedCount').textContent=String(selected.size);
    if ($('selectAll')) { $('selectAll').checked=project.positions.length>0&&selected.size===project.positions.length; $('selectAll').indeterminate=selected.size>0&&selected.size<project.positions.length; }
    $('validationSummary').hidden=result.valid; $('validationSummary').textContent=result.errors.map(item=>`• ${item.message}`).join('\n');
  }

  function renderDock() {
    $('layoutMode').value=layoutValueForProject(); $('expandQuantity').checked=Boolean(project.commonSettings.expandQuantity);
  }
  function renderAll() { ensureProjectCode(); renderProjectSummary(); renderCommonSummary(); renderPositionTable(); renderDock(); }

  function openProjectEditor() {
    syncProjectInfoFromParent({ force:true }); ensureProjectCode(); const info=project.projectInfo;
    $('customerProjectCode').value=''; $('customerProjectCode').placeholder=info.projectCode||'Otomatik oluşturulacak'; $('customerName').value=info.customerName||''; $('projectName').value=info.projectName||'';
    $('revision').value=info.revision||'R01'; $('designer').value=info.designer||activeIdentityAuthor()||''; $('projectDate').value=info.date||localIsoDate();
    $('projectInfoDialog').showModal();
  }
  function saveProjectInfo() {
    const info=project.projectInfo;
    ensureProjectCode();
    info.customerName=$('customerName').value.trim(); info.projectName=$('projectName').value.trim(); info.revision=$('revision').value.trim().toUpperCase()||'R01';
    info.designer=$('designer').value.trim()||activeIdentityAuthor()||''; info.date=$('projectDate').value||localIsoDate();
    if (!info.projectName) info.projectName=info.projectCode||'PROJE';
    $('projectInfoDialog').close(); renderProjectSummary(); drawing=null; scheduleDraw(); void stageSave('Proje bilgileri proje aşamasına ve Projelerim kaydına işlendi.');
  }

  function setCustomControl(selectId,inputId,value,known) {
    const select=$(selectId), input=$(inputId); const raw=String(value||'').toUpperCase();
    if (known.includes(raw)) { select.value=raw; input.value=''; input.hidden=true; }
    else { select.value='OTHER'; input.value=value||''; input.hidden=false; }
  }
  function customControlValue(selectId,inputId) {
    const select=$(selectId), input=$(inputId); return select.value==='OTHER' ? (input.value.trim().toUpperCase()||'OTHER') : select.value;
  }
  function bindCustomPair(selectId,inputId) {
    const select=$(selectId), input=$(inputId); if (!select||!input) return;
    select.addEventListener('change',()=>{ input.hidden=select.value!=='OTHER'; if (!input.hidden) input.focus(); });
  }
  function colorCatalog() { return window.P3DV_RAL_CATALOG && Array.isArray(window.P3DV_RAL_CATALOG.all) ? window.P3DV_RAL_CATALOG : { risingStandardCodes:[], all:[] }; }
  function colorOption(code) { const key=String(code||'').trim().toUpperCase(); return colorCatalog().all.find(item=>String(item.code).toUpperCase()===key) || null; }
  function ralTextureStyle(option) {
    const fallback = option && option.hex ? option.hex : '#d9e0e4';
    const image = option && option.image ? `../../modules/p3dv/${String(option.image).replace(/^\/+/, '')}` : '';
    return image ? `background-color:${escapeHtml(fallback)};background-image:url('${escapeHtml(image)}')` : `background-color:${escapeHtml(fallback)}`;
  }
  function resetRalPickerStage() {
    pendingRalBase='';
    if($('ralCatalogStage')) $('ralCatalogStage').hidden=false;
    if($('ralFinishStage')) $('ralFinishStage').hidden=true;
    if($('ralManualColorRow')) $('ralManualColorRow').hidden=true;
    if($('ralManualColorInput')) $('ralManualColorInput').value='';
  }
  function openRalPicker(setter) {
    ralTarget=setter; $('ralSearch').value=''; $('ralStandardOnly').checked=true; resetRalPickerStage(); renderRalGrid(); $('ralDialog').showModal();
  }
  function startRalFinish(base) {
    pendingRalBase=String(base||'').trim().toUpperCase();
    if(!pendingRalBase) return;
    $('ralCatalogStage').hidden=true; $('ralFinishStage').hidden=false;
    const manual = pendingRalBase==='OTHER';
    $('ralManualColorRow').hidden=!manual;
    $('ralFinishSummary').textContent=manual?'Diğer Renk':pendingRalBase;
    const selectedColor=colorOption(pendingRalBase);
    $('ralFinishStage').style.setProperty('--selected-ral-color',selectedColor?selectedColor.hex:'#d9e0e4');
    if(manual) window.setTimeout(()=>$('ralManualColorInput').focus(),0);
  }
  function applyRalFinish(finish) {
    let base=pendingRalBase;
    if(base==='OTHER') base=String($('ralManualColorInput').value||'').trim().toUpperCase();
    if(!base){ setStatus('Manuel renk adı girilmelidir.',true); return; }
    if(ralTarget) ralTarget(base,String(finish||'').toUpperCase());
    $('ralDialog').close(); resetRalPickerStage();
  }
  function renderRalGrid() {
    const catalog=colorCatalog(); const q=$('ralSearch').value.trim().toUpperCase(); const standardOnly=$('ralStandardOnly').checked; const standard=new Set(catalog.risingStandardCodes||[]);
    let rows=catalog.all.filter(item=>(!standardOnly||standard.has(item.code))&&(!q||item.code.includes(q)));
    if (!rows.length && standardOnly) rows=catalog.all.filter(item=>!q||item.code.includes(q)).slice(0,80);
    $('ralGrid').innerHTML=rows.map(item=>`<button type="button" class="ral-option" data-code="${escapeHtml(item.code)}"><span style="${ralTextureStyle(item)}"></span><strong>${escapeHtml(item.code)}</strong></button>`).join('');
  }

  function fillCommonEditor() {
    const type=projectType(); const values=commonDefaults();
    const parts = currentColorParts();
    const knownColor = parts.base && !!colorOption(parts.base);
    $('commonColor').value = parts.base ? (knownColor ? parts.base : 'OTHER') : '';
    $('commonColorCustom').value = knownColor ? '' : (parts.base || '');
    $('commonColorCustom').hidden = knownColor || !parts.base;
    updateColorButton($('commonColor').value || '', parts.finish || '');
    if (!knownColor && parts.base) $('commonColorLabel').textContent = buildColorValue(parts.base, parts.finish || '');
    $('generalDescription').value=project.commonSettings.generalDescription||'';
    const isG=type==='GUILLOTINE'; $('giyotinCommonFields').hidden=!isG; $('genericCommonFields').hidden=isG;
    document.querySelectorAll('[data-giyotin-common]').forEach(node=>{ node.hidden=!isG; });
    if (isG) {
      setCustomControl('gGlassThickness','gGlassThicknessCustom',values.glassThickness,KNOWN.glassThickness);
      setCustomControl('gGlassColor','gGlassColorCustom',values.glassColor,KNOWN.glassColor);
      setCustomControl('gType','gTypeCustom',values.type,KNOWN.type); setCustomControl('gMechanism','gMechanismCustom',values.mechanism,KNOWN.mechanism);
      setCustomControl('gPanelCount','gPanelCountCustom',values.panelCount,KNOWN.panelCount); setCustomControl('gMotorDirection','gMotorDirectionCustom',values.motorDirection,KNOWN.motorDirection);
      setCustomControl('gView','gViewCustom',values.view || 'OUTSIDE VIEW',KNOWN.view); setCustomControl('gMotorType','gMotorTypeCustom',values.motorType,KNOWN.motorType);
      setCustomControl('gRemoteControl','gRemoteControlCustom',values.remoteControl,KNOWN.remoteControl);
      $('gRemoteQuantity').value=Number(values.remoteQuantity)||0; $('gBottomPanel').value=values.bottomPanelState==='CLOSED'?'CLOSED':'OPEN'; $('gDisplayState').value=values.displayState==='CLOSED'?'CLOSED':'OPEN';
      syncBottomPanelAvailability();
    } else renderGenericOptionFields($('genericCommonFields'), type, values);
  }
  function syncBottomPanelAvailability() {
    const typeValue=customControlValue('gType','gTypeCustom'); const enabled=typeValue==='CLEANABLE'; $('gBottomPanel').disabled=!enabled; if (!enabled) $('gBottomPanel').value='CLOSED';
  }
  function openCommonEditor() { fillCommonEditor(); $('commonSettingsDialog').showModal(); }
  function readGiyotinCommonFromStatic() {
    const color=requireCommonColor(); if(!color) return null;
    return {
      color:color.label, glassThickness:customControlValue('gGlassThickness','gGlassThicknessCustom'), glassColor:customControlValue('gGlassColor','gGlassColorCustom'),
      type:customControlValue('gType','gTypeCustom'), mechanism:customControlValue('gMechanism','gMechanismCustom'), panelCount:customControlValue('gPanelCount','gPanelCountCustom'),
      motorDirection:customControlValue('gMotorDirection','gMotorDirectionCustom'), view:customControlValue('gView','gViewCustom'), motorType:customControlValue('gMotorType','gMotorTypeCustom'),
      remoteControl:customControlValue('gRemoteControl','gRemoteControlCustom'), remoteQuantity:Math.max(0,Math.trunc(Number($('gRemoteQuantity').value)||0)),
      bottomPanelState:'CLOSED', displayState:'CLOSED'
    };
  }
  function saveCommonSettings() {
    const type=projectType();
    let values;
    if (type==='GUILLOTINE') {
      values=readGiyotinCommonFromStatic(); if(!values) return;
      project.commonSettings.color=values.color;
      project.commonSettings.glassType=values.glassColor;
    } else {
      const color=requireCommonColor(); if(!color) return;
      project.commonSettings.color=color.label;
      values=readGenericOptionFields($('genericCommonFields'), type);
    }
    project.commonSettings.generalDescription=$('generalDescription').value.trim();
    model.setCommonDefaults(project,type,values); $('commonSettingsDialog').close(); renderCommonSummary(); renderPositionTable(); drawing=null; scheduleDraw(0); void stageSave('Ortak ürün ayarları proje aşamasına ve Projelerim kaydına işlendi.');
  }

  function genericFieldHtml(field,value) {
    const key=field.key; if (field.type==='number') return `<label><span>${escapeHtml(field.label)}</span><input data-option-key="${key}" type="number" value="${escapeHtml(value==null?'':value)}" /></label>`;
    if (field.type==='text') return `<label><span>${escapeHtml(field.label)}</span><input data-option-key="${key}" type="text" value="${escapeHtml(value==null?'':value)}" /></label>`;
    const known=(field.values||[]).includes(value); const selected=field.type==='select-custom'&&!known&&value?'OTHER':value; const opts=(field.values||[]).map(item=>`<option value="${escapeHtml(item)}" ${item===selected?'selected':''}>${escapeHtml(displayValue(item))}</option>`).join('');
    return `<label><span>${escapeHtml(field.label)}</span><div class="inline-custom-field"><select data-option-key="${key}" ${field.type==='select-custom'?'data-custom-select="1"':''}>${opts}</select>${field.type==='select-custom'?`<input data-custom-for="${key}" value="${escapeHtml(!known&&value?value:'')}" placeholder="Diğer" ${selected==='OTHER'?'':'hidden'} />`:''}</div></label>`;
  }
  function renderGenericOptionFields(container,type,values) {
    container.dataset.productType=type; container.innerHTML=model.optionDefinitions(type).map(field=>genericFieldHtml(field,values&&values[field.key])).join('');
    container.querySelectorAll('[data-custom-select]').forEach(select=>select.addEventListener('change',()=>{ const input=container.querySelector(`[data-custom-for="${CSS.escape(select.dataset.optionKey)}"]`); if(input) input.hidden=select.value!=='OTHER'; }));
  }
  function readGenericOptionFields(container,type) {
    const out={}; model.optionDefinitions(type).forEach(field=>{ const c=container.querySelector(`[data-option-key="${CSS.escape(field.key)}"]`); if(!c)return; let v=c.value; if(field.type==='number')v=Number(v); if(field.type==='select-custom'&&v==='OTHER'){const x=container.querySelector(`[data-custom-for="${CSS.escape(field.key)}"]`);v=String(x&&x.value||'OTHER').trim().toUpperCase()||'OTHER';} out[field.key]=v; }); return out;
  }

  function draftId() { return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }
  function blankDraft(index) {
    return { _placeholder:true, id:draftId(), positionNo:`P${String(index+1).padStart(2,'0')}`, productType:projectType(), width:'', height:'', quantity:1, description:'', options:{} };
  }
  function ensureSixDraftRows() { while(positionDraft.length<6) positionDraft.push(blankDraft(positionDraft.length)); }
  function openPositionsEditor() { positionDraft=clone(project.positions).map(row=>({...row,_placeholder:false})); ensureSixDraftRows(); renderPositionEditor(); $('positionsDialog').showModal(); }
  function renderPositionEditor() {
    $('positionEditRows').innerHTML=positionDraft.map((p,index)=>`<tr data-index="${index}" class="${p._placeholder?'is-placeholder':''}">
      <td><input class="edit-poz" value="${escapeHtml(p.positionNo||'')}" /></td>
      <td><input class="edit-width" type="number" min="1" value="${escapeHtml(p.width||'')}" /></td>
      <td><input class="edit-height" type="number" min="1" value="${escapeHtml(p.height||'')}" /></td>
      <td><input class="edit-quantity" type="number" min="1" value="${escapeHtml(p.quantity||1)}" /></td>
      <td><input class="edit-description" value="${escapeHtml(p.description||'')}" /></td>
      <td><button type="button" class="edit-detail secondary">Detay</button></td><td><button type="button" class="edit-copy secondary">Kopyala</button></td>
      <td><div class="row-actions compact-order"><button type="button" class="edit-up secondary" ${index===0?'disabled':''}>↑</button><button type="button" class="edit-down secondary" ${index===positionDraft.length-1?'disabled':''}>↓</button></div></td>
      <td><button type="button" class="edit-remove danger">Sil</button></td></tr>`).join('');
  }
  function readDraftRow(row,index) {
    const target=positionDraft[index]; if(!target)return;
    target.positionNo=row.querySelector('.edit-poz').value.trim(); target.width=row.querySelector('.edit-width').value; target.height=row.querySelector('.edit-height').value; target.quantity=row.querySelector('.edit-quantity').value; target.description=row.querySelector('.edit-description').value;
    if (target.width || target.height || target.description) target._placeholder=false;
  }
  function syncAllDraftInputs() { document.querySelectorAll('#positionEditRows tr[data-index]').forEach(row=>readDraftRow(row,Number(row.dataset.index))); }
  function draftToPosition(item,positions) {
    return model.createPosition(item.productType||projectType(), { id:item.id&&String(item.id).startsWith('draft-')?undefined:item.id, positionNo:item.positionNo||model.nextPositionNo(positions,'P'), width:Number(item.width), height:Number(item.height), quantity:Number(item.quantity)||1, description:item.description||'', options:item.options||{} }, positions, model.commonDefaults(project,item.productType||projectType()));
  }
  function savePositions() {
    syncAllDraftInputs(); const committed=[];
    for(const item of positionDraft){
      if(item._placeholder && !item.width && !item.height && !item.description) continue;
      if(!(Number(item.width)>0) || !(Number(item.height)>0)){ setStatus(`${item.positionNo||'Yeni poz'} için genişlik ve yükseklik girilmelidir.`,true); return; }
      committed.push(draftToPosition(item,committed));
    }
    if(!committed.length){ setStatus('En az bir poz bulunmalıdır.',true); return; }
    project.positions=committed; model.normalizeOrder(project); $('positionsDialog').close(); renderPositionTable(); drawing=null; scheduleDraw(0); void stageSave('Poz listesi proje aşamasına ve Projelerim kaydına işlendi.');
  }

  function giyotinDetailHtml(values) {
    function custom(label,key,known){ const value=String(values[key]||''); const isKnown=known.includes(value); const selected=isKnown?value:'OTHER'; return `<label><span>${label}</span><div class="inline-custom-field"><select data-dkey="${key}">${known.map(v=>`<option value="${escapeHtml(v)}" ${v===selected?'selected':''}>${escapeHtml(displayValue(v))}</option>`).join('')}<option value="OTHER" ${selected==='OTHER'?'selected':''}>Diğer</option></select><input data-dcustom="${key}" value="${escapeHtml(isKnown?'':value)}" placeholder="Diğer" ${selected==='OTHER'?'':'hidden'} /></div></label>`; }
    const parts = colorPartsFromValue(values.color||project.commonSettings.color||''); const c=colorOption(parts.base);
    return `<label><span>Renk</span><div class="color-selection-stack"><button id="detailColorButton" type="button" class="color-picker-button"><i id="detailColorSwatch" style="${ralTextureStyle(c)}"></i><strong id="detailColorLabel">${escapeHtml(parts.label||'Renk seç')}</strong><em>Renk kartelasını aç</em></button><input id="detailColorValue" type="hidden" value="${escapeHtml(parts.base||'')}" /><input id="detailColorCustom" placeholder="Diğer renk" hidden /><select id="detailColorFinish" hidden aria-hidden="true"><option value="">Yüzey seçin</option><option value="PARLAK" ${parts.finish==='PARLAK'?'selected':''}>Parlak</option><option value="MAT" ${parts.finish==='MAT'?'selected':''}>Mat</option><option value="TEXTURE" ${parts.finish==='TEXTURE'?'selected':''}>Texture</option></select></div></label>
      ${custom('Cam Kalınlığı','glassThickness',KNOWN.glassThickness)}${custom('Cam Rengi','glassColor',KNOWN.glassColor)}${custom('Tip','type',KNOWN.type)}${custom('Mekanizma','mechanism',KNOWN.mechanism)}${custom('Panel Düzeni','panelCount',KNOWN.panelCount)}${custom('Motor Yönü','motorDirection',KNOWN.motorDirection)}${custom('Görünüş','view',KNOWN.view)}${custom('Motor','motorType',KNOWN.motorType)}${custom('Kumanda','remoteControl',KNOWN.remoteControl)}
      <label><span>Kumanda Adet</span><input data-dkey="remoteQuantity" type="number" min="0" step="1" value="${escapeHtml(values.remoteQuantity==null?0:values.remoteQuantity)}" /></label>
      <label hidden><span>Alt Panel</span><select data-dkey="bottomPanelState" ${values.type==='CLEANABLE'?'':'disabled'}><option value="OPEN" ${values.bottomPanelState!=='CLOSED'?'selected':''}>Açık</option><option value="CLOSED" ${values.bottomPanelState==='CLOSED'?'selected':''}>Kapalı</option></select></label>
      <label hidden><span>Gösterim</span><select data-dkey="displayState"><option value="OPEN" ${values.displayState!=='CLOSED'?'selected':''}>Açık</option><option value="CLOSED" ${values.displayState==='CLOSED'?'selected':''}>Kapalı</option></select></label>`;
  }
  function populateDetailDialog(type, item, values, title) {
    $('detailTitle').textContent=title;
    const container=$('productOptions'); container.dataset.productType=type;
    if(type==='GUILLOTINE'){
      container.innerHTML=giyotinDetailHtml(values);
      container.querySelectorAll('[data-dkey]').forEach(select=>{ if(select.tagName==='SELECT' && container.querySelector(`[data-dcustom="${CSS.escape(select.dataset.dkey)}"]`)) select.addEventListener('change',()=>{const input=container.querySelector(`[data-dcustom="${CSS.escape(select.dataset.dkey)}"]`); input.hidden=select.value!=='OTHER'; if(select.dataset.dkey==='type'){const bottom=container.querySelector('[data-dkey="bottomPanelState"]');const clean=select.value==='CLEANABLE';bottom.disabled=!clean;if(!clean)bottom.value='CLOSED';}}); });
      $('detailColorButton').addEventListener('click',()=>openRalPicker((base,finish)=>{ $('detailColorValue').value=base; $('detailColorFinish').value=finish; $('detailColorLabel').textContent=buildColorValue(base, finish)||'Renk seç'; const o=colorOption(base); const swatch=$('detailColorSwatch'); swatch.style.backgroundColor=o?o.hex:'#d9e0e4'; swatch.style.backgroundImage=o&&o.image?`url('../../modules/p3dv/${String(o.image).replace(/^\/+/, '')}')`:''; $('detailColorCustom').hidden = true; }));
    } else renderGenericOptionFields(container,type,values);
    $('detailDialog').showModal();
  }
  function openDetailForDraft(index) {
    detailLivePositionId = '';
    syncAllDraftInputs(); detailDraftIndex=index; const item=positionDraft[index]; if(!item)return;
    const type=item.productType||projectType(); const values=model.resolveOptions(project,{...item,productType:type,width:Number(item.width)||1,height:Number(item.height)||1,quantity:Number(item.quantity)||1});
    populateDetailDialog(type, item, values, `${item.positionNo||'Yeni Poz'} · ${registry.requireProduct(type).label}`);
  }
  function openDetailForPositionId(positionId) {
    detailLivePositionId = positionId; detailDraftIndex = -1;
    const item = project.positions.find(entry => entry.id === positionId); if(!item) return;
    const type=item.productType||projectType(); const values=model.resolveOptions(project,item);
    populateDetailDialog(type, item, values, `${item.positionNo||'Poz'} · ${registry.requireProduct(type).label}`);
  }
  function readDetailOptions() {
    const container=$('productOptions'), type=container.dataset.productType;
    if(type!=='GUILLOTINE') return readGenericOptionFields(container,type);
    const finish = String($('detailColorFinish').value || '').trim().toUpperCase();
    const rawBase = $('detailColorValue').value === 'OTHER' ? String($('detailColorCustom').value || '').trim().toUpperCase() : $('detailColorValue').value;
    const out={color:buildColorValue(rawBase, finish)};
    container.querySelectorAll('[data-dkey]').forEach(control=>{ const key=control.dataset.dkey; if(control.disabled && key==='bottomPanelState'){out[key]='CLOSED';return;} let value=control.value; const custom=container.querySelector(`[data-dcustom="${CSS.escape(key)}"]`); if(value==='OTHER'&&custom)value=custom.value.trim().toUpperCase()||'OTHER'; if(control.type==='number')value=Math.max(0,Math.trunc(Number(value)||0)); out[key]=value; }); return out;
  }
  function saveDetail() {
    if (bulkDetailIds.length) {
      const first = project.positions.find(entry => bulkDetailIds.includes(entry.id));
      if (!first) { bulkDetailIds=[]; $('detailDialog').close(); return; }
      const detailValues = readDetailOptions();
      if ((first.productType||projectType())==='GUILLOTINE' && (!detailValues.color || !/\b(PARLAK|MAT|TEXTURE)\b/.test(detailValues.color))) { setStatus('Poz rengi için yüzey seçimi zorunludur.', true); return; }
      const ids=bulkDetailIds.slice();
      model.applyToSelected(project, ids, { options:detailValues });
      bulkDetailIds=[]; $('detailDialog').close(); renderPositionTable(); drawing=null; scheduleDraw(0); void stageSave(`${ids.length} pozun seçenekleri toplu güncellendi ve kaydedildi.`); return;
    }
    const liveItem = detailLivePositionId ? project.positions.find(entry => entry.id === detailLivePositionId) : null;
    if(!liveItem && (detailDraftIndex<0||!positionDraft[detailDraftIndex])) return;
    const item = liveItem || positionDraft[detailDraftIndex];
    const type=item.productType||projectType(); item.productType=type;
    const temp={...item,width:Number(item.width)||1,height:Number(item.height)||1,quantity:Number(item.quantity)||1}; const detailValues = readDetailOptions();
    if(type==='GUILLOTINE' && (!detailValues.color || !/\b(PARLAK|MAT|TEXTURE)\b/.test(detailValues.color))) { setStatus('Poz rengi için yüzey seçimi zorunludur.', true); return; }
    const result=model.setPositionOptions(project,temp,detailValues);
    if (liveItem) {
      liveItem.options = temp.options;
      $('detailDialog').close(); renderCommonSummary(); renderPositionTable(); drawing=null; scheduleDraw(0); void stageSave(`${item.positionNo}: detay ayarları güncellendi ve kaydedildi.`); detailLivePositionId='';
    } else {
      item.options=temp.options; item._placeholder=false;
      $('detailDialog').close(); renderPositionEditor(); setStatus(result.changes.length?`${item.positionNo}: ürün seçenekleri normalize edildi.`:`${item.positionNo}: detay ayarları güncellendi.`); detailLivePositionId='';
    }
  }

  function openBulkOptionsEditor() {
    const ids=[...selected];
    if (!ids.length) { setStatus('Toplu seçenek uygulamak için en az bir poz seçin.', true); return; }
    const first=project.positions.find(item=>item.id===ids[0]);
    if (!first) return;
    const type=first.productType||projectType();
    const incompatible=ids.some(id=>{const item=project.positions.find(entry=>entry.id===id);return !item||(item.productType||projectType())!==type;});
    if (incompatible) { setStatus('Toplu seçenek uygulamak için seçili pozların ürün tipi aynı olmalıdır.', true); return; }
    bulkDetailIds=ids; detailLivePositionId=''; detailDraftIndex=-1;
    populateDetailDialog(type, first, model.resolveOptions(project,first), `${ids.length} poz · Toplu Seçenek`);
  }
  function applyBulkDescription() {
    if (!selected.size) { setStatus('Açıklama uygulamak için en az bir poz seçin.', true); return; }
    const description=String($('bulkDescription').value||'').trim();
    if (!description) { setStatus('Uygulanacak açıklamayı yazın.', true); return; }
    const count=selected.size; model.applyToSelected(project,[...selected],{description});
    renderPositionTable(); drawing=null; scheduleDraw(0); void stageSave(`${count} poza açıklama uygulandı ve kaydedildi.`);
  }
  function deleteSelectedPositions() {
    if (!selected.size) { setStatus('Silmek için en az bir poz seçin.', true); return; }
    project.positions=project.positions.filter(item=>!selected.has(item.id)); selected.clear();
    if (!project.positions.length) project.positions.push(model.createPosition(projectType(),{},[],model.commonDefaults(project,projectType())));
    model.normalizeOrder(project); renderPositionTable(); drawing=null; scheduleDraw(0); void stageSave('Seçili pozlar silindi ve proje kaydedildi.');
  }
  function openBulkCreateDialog() {
    const last=project.positions.at(-1);
    $('bulkStartNo').value=model.nextPositionNo(project.positions,'P');
    $('bulkWidth').value=last&&Number(last.width)>0?last.width:3000;
    $('bulkHeight').value=last&&Number(last.height)>0?last.height:2400;
    $('bulkCount').value=4; $('bulkCreateDialog').showModal();
  }
  function confirmBulkCreate() {
    const count=Math.max(1,Math.min(100,Math.trunc(Number($('bulkCount').value)||1)));
    const width=Number($('bulkWidth').value)||0, height=Number($('bulkHeight').value)||0;
    if (!(width>0&&height>0)) { setStatus('Çoklu poz için genişlik ve yükseklik pozitif olmalıdır.', true); return; }
    const last=project.positions.at(-1)||model.createPosition(projectType(),{},[],model.commonDefaults(project,projectType()));
    model.addPositions(project,{...last,width,height},count,String($('bulkStartNo').value||model.nextPositionNo(project.positions,'P')));
    $('bulkCreateDialog').close(); renderPositionTable(); drawing=null; scheduleDraw(0); void stageSave(`${count} yeni poz oluşturuldu ve kaydedildi.`);
  }

  function validate(showStatus, renderValidation=true) {
    const result=model.validateProject(project); if(renderValidation)renderPositionTable(result); else { $('validationSummary').hidden=result.valid; $('validationSummary').textContent=result.errors.map(item=>`• ${item.message}`).join('\n'); }
    if(showStatus)setStatus(result.valid?`${project.positions.length} poz doğrulandı.`:result.errors[0].message,!result.valid); return result;
  }
  function isPreviewAccentLayer(name) { return /(TEXT|TITLE|DIM|ÖLÇÜ|PLMR_POZ_TEXT)/i.test(String(name||'')); }
  function buildPreviewDrawing(source) {
    const preview=clone(source); const layerStyle=preview.layerStyle||{}; preview.layerStyle=Object.fromEntries(Object.keys(layerStyle).map(name=>[name,{...(layerStyle[name]||{}),stroke:isPreviewAccentLayer(name)?'#c00000':'#000000'}]));
    preview.entities=(preview.entities||[]).map(entity=>!entity||entity.type==='interaction'?entity:(entity.type==='text'||entity.type==='mtext'||isPreviewAccentLayer(entity.layer)?{...entity,color:1}:{...entity,color:7})); return preview;
  }
  function panelCountFromValue(value) {
    const map = { '1+1': 2, '1+2': 3, '1+3': 4 };
    return map[String(value || '').toUpperCase()] || Math.max(2,Math.round(Number(value)||2));
  }
  function canonicalFinish(value) {
    const raw=String(value||'').toUpperCase();
    if(raw==='PARLAK') return 'GLOSS';
    if(raw==='TEXTURE') return 'TEXTURE';
    return 'MATTE';
  }
  function canonical3dColor() {
    const parts=currentColorParts();
    const option=colorOption(parts.base);
    return { code:parts.base||'RAL 7016', hex:option&&option.hex?option.hex:'#383e42', finish:canonicalFinish(parts.finish||'MAT'), kind:'ral' };
  }
  function canonical3dColorForValue(value) {
    const parts=colorPartsFromValue(value||project.commonSettings.color);
    const option=colorOption(parts.base);
    return { code:parts.base||'RAL 7016', hex:option&&option.hex?option.hex:'#383e42', finish:canonicalFinish(parts.finish||'MAT'), kind:'ral' };
  }
  function canonical3dItems(current) {
    const columns=Math.max(1,Number(current&&current.layout&&current.layout.columnCount)||2);
    return (current&&current.positions||[]).map(placed=>{
      const pos=placed.position; const options=model.resolveOptions(project,pos);
      const colorValue=String(options.color||project.commonSettings.color||'');
      const displayState=previewPositionOpenStates.get(String(pos.id)) || previewOpenState;
      return {
        id:String(pos.id), positionNo:String(pos.positionNo||''), width:Number(pos.width)||1, height:Number(pos.height)||1, quantity:Math.max(1,Math.trunc(Number(pos.quantity)||1)),
        series:'A SERIES', type:String(options.type||'STANDARD'), subtype:String(options.type||'STANDARD'), mechanism:String(options.mechanism||'CHAIN'),
        glassThickness:String(options.glassThickness||'8 MM'), glassColor:String(options.glassColor||'TRANSPARENT'), customGlassColor:String(options.customGlassColor||''),
        color:colorValue, finish:String(colorPartsFromValue(colorValue).finish||'MAT').toUpperCase(), surface:String(colorPartsFromValue(colorValue).finish||'MAT').toUpperCase(), systemColor:canonical3dColorForValue(colorValue),
        panelCount:String(options.panelCount||'1+1'), panels:panelCountFromValue(options.panelCount), panelType:String(options.panelCount||'1+1'), motorDirection:String(options.motorDirection||'RIGHT'),
        view:String(options.view||'OUTSIDE VIEW'), motorType:String(options.motorType||'SOMFY RTS'), remoteControl:String(options.remoteControl||'1 CHANNEL'),
        bottomPanelMode:String(options.type==='CLEANABLE'?'VASISTAS':'FIXED'), bottomPanelState:displayState, bottomPanelHinge:'BOTTOM',
        collectionState:(['STANDARD','UPWARD COLLECTING','DOWNWARD COLLECTING'].includes(String(options.type||'')) && displayState==='OPEN')?'COLLECTED':'NORMAL',
        displayState, showDimensions:previewShowDimensions, layoutColumns:columns
      };
    });
  }
  function postCanonical3d(type, payload) {
    const frame = $('canonical3dFrame');
    if (!frame || !frame.contentWindow) return false;
    const allowed = new Set(['P3DV_GUILLOTINE_INIT','P3DV_GUILLOTINE_STATE','P3DV_GUILLOTINE_PATCH','P3DV_GUILLOTINE_DISPOSE']);
    if (!allowed.has(type)) return false;
    try {
      frame.contentWindow.postMessage({
        schema: P3DV_GUILLOTINE_SCHEMA,
        source: 'plmr-guillotine-workspace',
        type,
        sessionId: p3dvSessionId,
        productId: GUILLOTINE_PRODUCT_ID,
        payload: payload && typeof payload === 'object' ? payload : {}
      }, controlledTargetOrigin());
      return true;
    } catch (error) {
      setStatus(`3D sahne hazırlanamadı: ${error && error.message ? error.message : error}`, true);
      return false;
    }
  }
  function canonical3dStatePayload(current) {
    const layoutColumns = Math.max(1,Math.min(10,Number(current&&current.layout&&current.layout.columnCount)||2));
    return {
      positions: canonical3dItems(current),
      commonSettings: {
        layoutColumns,
        systemColor: canonical3dColor(),
        color: String(project.commonSettings.color || ''),
        productType: projectType()
      },
      selectedPositionId: String(selectedPreviewPositionId || ''),
      openState: String(previewOpenState || 'CLOSED'),
      showDimensions: Boolean(previewShowDimensions)
    };
  }
  function stopCanonical3dHandshake() {
    if (p3dvHandshakeTimer) { window.clearTimeout(p3dvHandshakeTimer); p3dvHandshakeTimer=0; }
  }
  function callCanonical3dRenderer(current) {
    if (!current) return false;
    if (p3dvHostReady) {
      stopCanonical3dHandshake(); p3dvHandshakeAttempts=0;
      return postCanonical3d('P3DV_GUILLOTINE_STATE', canonical3dStatePayload(current));
    }
    if (p3dvHandshakeAttempts >= 30) {
      stopCanonical3dHandshake();
      setStatus('3D görüntüleyici bağlantısı kurulamadı. Yeniden denemek için Çizimi Oluştur düğmesine basın.', true);
      return false;
    }
    p3dvHandshakeAttempts += 1;
    postCanonical3d('P3DV_GUILLOTINE_INIT', { requestedAt:Date.now(), attempt:p3dvHandshakeAttempts });
    stopCanonical3dHandshake();
    p3dvHandshakeTimer=window.setTimeout(()=>{p3dvHandshakeTimer=0;if(previewMode==='3D'&&drawing&&!p3dvHostReady)callCanonical3dRenderer(drawing);},Math.min(900,160+p3dvHandshakeAttempts*35));
    return true;
  }
  function renderCanonical3D(current) {
    const panel=document.querySelector('.preview-panel'); if(panel) panel.classList.add('is-3d');
    const host=$('canonical3dHost'); if(host) host.hidden=false;
    const actions=$('canonical3dSelectionActions'); if(actions) actions.hidden=true;
    setStatus('3D çizim hazırlanıyor…');
    callCanonical3dRenderer(current);
  }

  function syncPreviewModeControls() {
    ['2D','3D'].forEach(mode=>{const button=$(mode==='3D'?'preview3dBtn':'preview2dBtn');button.classList.toggle('is-active',previewMode===mode);button.setAttribute('aria-pressed',String(previewMode===mode));});
  }
  function renderPreview(current, quiet) {
    syncPreviewModeControls();
    if (!current) return;
    const panel=document.querySelector('.preview-panel');
    if (previewMode === '3D') renderCanonical3D(current);
    else {
      if(panel) panel.classList.remove('is-3d');
      if($('canonical3dHost')) $('canonical3dHost').hidden=true;
      $('preview').innerHTML=window.PulumurGeometry.renderSvg(buildPreviewDrawing(current),{width:1500,height:1000});
    }
    $('previewMeta').textContent=`${current.positions.length} poz · ${current.layout.columnCount} sütun`;
    if(!quiet && previewMode !== '3D') setStatus(`${current.positions.length} poz için çizim oluşturuldu.`);
  }
  function draw(options={}) {
    const config={quiet:false,renderValidation:true,...options}; if(!config.quiet&&!p3dvHostReady)p3dvHandshakeAttempts=0; const result=validate(false,config.renderValidation); if(!result.valid){drawing=null;$('previewMeta').textContent='Geçerli ölçü bekleniyor';$('preview').innerHTML='';const panel=document.querySelector('.preview-panel');if(panel)panel.classList.remove('is-3d');if($('canonical3dHost'))$('canonical3dHost').hidden=true;if(!config.quiet||previewMode==='3D')setStatus(result.errors[0]&&result.errors[0].message||'Çizim oluşturulamadı. Hatalı pozları düzeltin.',true);return null;}
    try{drawing=layout.buildProjectDrawing(project);renderPreview(drawing, config.quiet);return drawing;}catch(error){drawing=null;if(!config.quiet||previewMode==='3D')setStatus(error.message||String(error),true);return null;}
  }
  function scheduleDraw(delay=140){if(autoDrawTimer)clearTimeout(autoDrawTimer);autoDrawTimer=setTimeout(()=>{autoDrawTimer=null;draw({quiet:true,renderValidation:false});},Math.max(0,Number(delay)||0));}
  function downloadPlmr(){ensureProjectCode();download(`${safeName(project.projectInfo.projectName||project.projectInfo.projectCode)}.plmr`,model.serialize(project),'application/json;charset=utf-8');setStatus('.plmr dosyası indirildi.');}
  function saveWholeProject(){ void stageSave("Tüm proje Projelerim'e kaydedildi."); }

  function openDimensionEditor(positionId) {
    const item = project.positions.find(entry => entry.id === positionId); if(!item) return;
    dimensionDraftId = item.id; $('dimensionTitle').textContent = `${item.positionNo} · Ölçüleri Düzenle`; $('dimensionWidth').value = Number(item.width)||''; $('dimensionHeight').value = Number(item.height)||''; $('dimensionQuantity').value = Number(item.quantity)||1; $('dimensionDialog').showModal();
  }
  function saveDimensionEditor() {
    const item = project.positions.find(entry => entry.id === dimensionDraftId); if(!item) return;
    const width = Number($('dimensionWidth').value)||0; const height = Number($('dimensionHeight').value)||0; const quantity = Math.max(1, Math.trunc(Number($('dimensionQuantity').value)||1));
    if(!(width>0) || !(height>0)) { setStatus('Genişlik ve yükseklik pozitif olmalıdır.', true); return; }
    item.width = width; item.height = height; item.quantity = quantity; $('dimensionDialog').close(); renderPositionTable(); drawing=null; scheduleDraw(0); void stageSave(`${item.positionNo} ölçüleri güncellendi ve kaydedildi.`);
  }

  function initializeProject() {
    const context=parentContext(); const stored=context.workspace&&context.workspace.project;
    if(stored&&typeof stored==='object'){try{project=model.createProject(stored);parentWorkspaceHash=JSON.stringify(stored);}catch(_){project=model.createProject({productType:requestedProduct()});}}
    else project=model.createProject({productType:requestedProduct()});
    project.commonSettings.defaultProductType=requestedProduct(); syncProjectInfoFromParent({ force:true });
    if(!project.projectInfo.date)project.projectInfo.date=localIsoDate(); if(!project.projectInfo.revision||project.projectInfo.revision==='R00')project.projectInfo.revision='R01';
    if(!project.projectInfo.designer) project.projectInfo.designer = activeIdentityAuthor() || '';
    ensureProjectCode();
  }

  fillLayoutModeSelect(); initializeProject(); renderAll(); syncPreviewModeControls(); draw({quiet:true}); subscribeParentState(); requestCanonicalIdentity();
  ['gGlassThickness','gGlassColor','gType','gMechanism','gPanelCount','gMotorDirection','gView','gMotorType','gRemoteControl'].forEach(id=>bindCustomPair(id,`${id}Custom`));
  $('gType').addEventListener('change',syncBottomPanelAvailability);
  $('editProjectInfoBtn').addEventListener('click',openProjectEditor); $('projectInfoSaveBtn').addEventListener('click',saveProjectInfo);
  $('editCommonSettingsBtn').addEventListener('click',openCommonEditor); $('commonSettingsSaveBtn').addEventListener('click',saveCommonSettings);
  $('commonColorButton').addEventListener('click',()=>openRalPicker((base,finish)=>updateColorButton(base,finish))); $('commonColorCustom').addEventListener('input',()=>{ if($('commonColor').value==='OTHER') $('commonColorLabel').textContent=buildColorValue($('commonColorCustom').value, $('commonColorFinish').value)||'Renk seç'; }); $('ralCloseBtn').addEventListener('click',()=>{ $('ralDialog').close(); resetRalPickerStage(); }); $('ralOtherBtn').addEventListener('click',()=>startRalFinish('OTHER')); $('ralFinishBackBtn').addEventListener('click',resetRalPickerStage); $('ralSearch').addEventListener('input',renderRalGrid); $('ralStandardOnly').addEventListener('change',renderRalGrid);
  $('ralGrid').addEventListener('click',event=>{const button=event.target.closest('[data-code]');if(!button)return;startRalFinish(button.dataset.code);});
  document.querySelectorAll('.ral-finish-option').forEach(button=>button.addEventListener('click',()=>applyRalFinish(button.dataset.finish)));
  $('editPositionsBtn').addEventListener('click',openPositionsEditor); $('addPositionRowBtn').addEventListener('click',()=>{syncAllDraftInputs();positionDraft.push(blankDraft(positionDraft.length));renderPositionEditor();}); $('positionsSaveBtn').addEventListener('click',savePositions);
  $('selectAll').addEventListener('change',event=>{selected.clear();if(event.target.checked)project.positions.forEach(item=>selected.add(item.id));renderPositionTable();});
  $('applySelectedBtn').addEventListener('click',applyBulkDescription); $('bulkOptionsBtn').addEventListener('click',openBulkOptionsEditor); $('deleteSelectedBtn').addEventListener('click',deleteSelectedPositions);
  $('bulkCreateBtn').addEventListener('click',openBulkCreateDialog); $('bulkConfirmBtn').addEventListener('click',confirmBulkCreate);
  $('positionEditRows').addEventListener('input',event=>{const row=event.target.closest('tr[data-index]');if(row)readDraftRow(row,Number(row.dataset.index));});
  $('positionEditRows').addEventListener('click',event=>{const row=event.target.closest('tr[data-index]');if(!row)return;const i=Number(row.dataset.index);readDraftRow(row,i);
    if(event.target.closest('.edit-detail'))openDetailForDraft(i);
    else if(event.target.closest('.edit-copy')){const copy=clone(positionDraft[i]);copy.id=draftId();copy._placeholder=false;copy.positionNo=model.nextPositionNo(positionDraft.filter(x=>!x._placeholder),'P');positionDraft.splice(i+1,0,copy);renderPositionEditor();}
    else if(event.target.closest('.edit-up')&&i>0){[positionDraft[i-1],positionDraft[i]]=[positionDraft[i],positionDraft[i-1]];renderPositionEditor();}
    else if(event.target.closest('.edit-down')&&i<positionDraft.length-1){[positionDraft[i+1],positionDraft[i]]=[positionDraft[i],positionDraft[i+1]];renderPositionEditor();}
    else if(event.target.closest('.edit-remove')){positionDraft.splice(i,1);ensureSixDraftRows();renderPositionEditor();}
  });
  $('detailSaveBtn').addEventListener('click',saveDetail);
  $('positionRows').addEventListener('input',event=>{if(!event.target.classList.contains('main-position-no'))return;const row=event.target.closest('tr[data-id]');const p=project.positions.find(x=>x.id===row.dataset.id);if(p){p.positionNo=event.target.value.trim();drawing=null;scheduleDraw();persistWorkingCopy();}});
  $('positionRows').addEventListener('change',event=>{if(!event.target.classList.contains('row-select'))return;const row=event.target.closest('tr[data-id]');if(!row)return;event.target.checked?selected.add(row.dataset.id):selected.delete(row.dataset.id);renderPositionTable();});
  $('positionRows').addEventListener('click',event=>{const row=event.target.closest('tr[data-id]');if(!row)return;const p=project.positions.find(x=>x.id===row.dataset.id);if(!p)return;if(event.target.closest('.main-up'))model.move(project,p.id,-1);else if(event.target.closest('.main-down'))model.move(project,p.id,1);else return;renderPositionTable();drawing=null;scheduleDraw(0);void stageSave('Poz sırası güncellendi ve kaydedildi.');});
  $('renumberBtn').addEventListener('click',()=>{if(model.hasCustomPositionNumbers(project)&&!confirm('Özel poz numaraları P01, P02 düzeninde değiştirilecek. Devam edilsin mi?'))return;model.renumber(project,'P');renderPositionTable();drawing=null;scheduleDraw(0);void stageSave('Poz sırası güncellendi ve kaydedildi.');setStatus('Poz numaraları yeniden numaralandırıldı.');});
  $('layoutMode').addEventListener('change',()=>{const state=parseLayoutSelection($('layoutMode').value);project.layout.mode=state.mode;project.layout.columnCount=state.columnCount;drawing=null;scheduleDraw(0);void stageSave('Yerleşim güncellendi ve kaydedildi.');});
  $('expandQuantity').addEventListener('change',()=>{project.commonSettings.expandQuantity=$('expandQuantity').checked;drawing=null;scheduleDraw(0);void stageSave('Poz çoğaltma seçeneği güncellendi ve kaydedildi.');});
  $('validateBtn').addEventListener('click',()=>validate(true)); $('drawBtn').addEventListener('click',()=>draw({quiet:false,renderValidation:true}));
  $('preview2dBtn').addEventListener('click',()=>{previewMode='2D';$('preview2dBtn').classList.add('is-active');$('preview2dBtn').setAttribute('aria-pressed','true');$('preview3dBtn').classList.remove('is-active');$('preview3dBtn').setAttribute('aria-pressed','false');draw({quiet:true,renderValidation:false});});
  $('preview3dBtn').addEventListener('click',()=>{previewMode='3D';$('preview3dBtn').classList.add('is-active');$('preview3dBtn').setAttribute('aria-pressed','true');$('preview2dBtn').classList.remove('is-active');$('preview2dBtn').setAttribute('aria-pressed','false');draw({quiet:true,renderValidation:false});});
  $('toggleDimensionsBtn').addEventListener('click',()=>{previewShowDimensions=!previewShowDimensions;$('toggleDimensionsBtn').textContent=previewShowDimensions?'Ölçüleri Gizle':'Ölçüleri Göster';if(previewMode==='3D')draw({quiet:true,renderValidation:false});});
  $('toggleOpenStateBtn').addEventListener('click',()=>{previewOpenState=previewOpenState==='OPEN'?'CLOSED':'OPEN';previewPositionOpenStates.clear();$('toggleOpenStateBtn').textContent=previewOpenState==='OPEN'?'Açık':'Kapalı';if(previewMode==='3D')draw({quiet:true,renderValidation:false});});
  $('dxfBtn').addEventListener('click',()=>{const current=draw({quiet:true,renderValidation:true});if(!current){setStatus('DXF için geçerli çizim oluşturulamadı.',true);return;}try{download(`${safeName(project.projectInfo.projectName||project.projectInfo.projectCode)}.dxf`,exporter.exportDxf(current),'application/dxf;charset=utf-8');setStatus('Modern DXF (AC1027 / AutoCAD 2013 uyumlu) indirildi. DWG için uzantı değiştirmek yerine gerçek DWG dönüştürme gerekir.');}catch(error){setStatus(error.message,true);}});
  $('pdfBtn').addEventListener('click',async()=>{const current=draw({quiet:true,renderValidation:true});if(!current){setStatus('PDF için geçerli çizim oluşturulamadı.',true);return;}try{const filename=`${safeName(project.projectInfo.projectName||project.projectInfo.projectCode)}.pdf`;download(filename,await exporter.exportPdf(project,current),'application/pdf');setStatus(`PDF indirildi: ${filename}`);}catch(error){setStatus(error.message,true);}});
  $('saveBtn').addEventListener('click',downloadPlmr); $('cloudSaveBtn').addEventListener('click',saveWholeProject); $('dimensionSaveBtn').addEventListener('click',saveDimensionEditor);
  window.addEventListener('message', event => {
    const data = event.data || {};
    if (event.source === window.parent && controlledOriginAccepted(event.origin)) {
      if (data.schema === GUILLOTINE_HOST_SCHEMA && data.source === 'plmr-erp-shell' && data.type === 'PLMR_IDENTITY_STATE' && data.productId === GUILLOTINE_PRODUCT_ID && data.sessionId === hostSessionId) {
        applyCanonicalIdentity(data.identity);
        return;
      }
    }
    const frame = $('canonical3dFrame');
    if (!frame || event.source !== frame.contentWindow || !controlledOriginAccepted(event.origin)) return;
    if (data.schema !== P3DV_GUILLOTINE_SCHEMA || data.source !== 'plmr-p3dv-host' || data.productId !== GUILLOTINE_PRODUCT_ID || data.sessionId !== p3dvSessionId) return;
    if (data.type === 'P3DV_HOST_READY') {
      p3dvHostReady = true; stopCanonical3dHandshake(); p3dvHandshakeAttempts=0;
      if (previewMode === '3D' && drawing) postCanonical3d('P3DV_GUILLOTINE_STATE', canonical3dStatePayload(drawing));
      return;
    }
    if (data.type === 'P3DV_GUILLOTINE_RENDERED') {
      if (previewMode === '3D' && drawing) setStatus(`${Number(data.payload && data.payload.positionCount) || drawing.positions.length} poz için 3D çizim oluşturuldu.`);
      return;
    }
    if (data.type === 'P3DV_GUILLOTINE_ERROR') {
      if (previewMode === '3D') setStatus(`3D çizim oluşturulamadı: ${String(data.payload && data.payload.message || 'Görüntüleyici başlatılamadı.').slice(0,500)}`, true);
      return;
    }
    if (data.type === 'P3DV_GUILLOTINE_TOGGLE_POSITION') {
      const id=String(data.payload && data.payload.positionId || '');
      if (!drawing || !drawing.positions.some(item=>String(item.position.id)===id)) return;
      previewPositionOpenStates.set(id,data.payload.open?'OPEN':'CLOSED');
      if (previewMode==='3D') draw({quiet:true,renderValidation:false});
      return;
    }
    if (data.type !== 'P3DV_GUILLOTINE_SELECT_POSITION') return;
    const positionId = String(data.payload && data.payload.positionId || '');
    selectedPreviewPositionId = positionId;
    const item = project.positions.find(p => p.id === selectedPreviewPositionId);
    if (!item) return;
    $('canonical3dSelectionLabel').textContent = item.positionNo || 'Poz';
    $('canonical3dSelectionActions').hidden = false;
  });
  const canonical3dFrame = $('canonical3dFrame');
  if (canonical3dFrame) canonical3dFrame.addEventListener('load', () => { p3dvHostReady=false; p3dvHandshakeAttempts=0; stopCanonical3dHandshake(); if (previewMode==='3D' && drawing) callCanonical3dRenderer(drawing); });
  $('canonical3dEditDimensionBtn').addEventListener('click',()=>{if(selectedPreviewPositionId)openDimensionEditor(selectedPreviewPositionId);});
  $('canonical3dEditDetailBtn').addEventListener('click',()=>{if(selectedPreviewPositionId)openDetailForPositionId(selectedPreviewPositionId);});
  $('openInput').addEventListener('change',async event=>{try{const file=event.target.files[0];if(!file)return;project=model.migrate(await file.text());previewOpenState='CLOSED';previewPositionOpenStates.clear();$('toggleOpenStateBtn').textContent='Kapalı';selected.clear();syncProjectInfoFromParent({ force:true });ensureProjectCode();renderAll();draw();persistWorkingCopy();setStatus(`${project.positions.length} pozlu proje açıldı.`);}catch(error){setStatus(error.message,true);}event.target.value='';});

  window.PulumurStandaloneApp={getProject:()=>project,setProject:value=>{previewOpenState='CLOSED';previewPositionOpenStates.clear();$('toggleOpenStateBtn').textContent='Kapalı';project=model.createProject(value);selected.clear();syncProjectInfoFromParent();renderAll();drawing=null;persistWorkingCopy();return draw();},draw,scheduleDraw,getDrawing:()=>drawing,syncToParent:saveWholeProject};
})();
