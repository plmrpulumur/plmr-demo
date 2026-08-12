(function (root) {
  'use strict';

  const RELEASE = 'PLMR V14.28.4';
  const PRODUCT_INPUT_SCHEMA = 'p3dv-main-product-input-v14.04';
  const RUNTIME_BUILD = '10.28.4-r14.28.4';
  const RUNTIME_CONTRACT = 'plmr-p3dv-host-bridge-v14.28.4';
  function embedUrlForProduct(productId, suffix) {
    const group = PRODUCT_TO_GROUP[String(productId || '')] || PRODUCT_TO_GROUP[DEFAULT_PRODUCT_ID];
    return `modules/p3dv/index.html?embedded=1&host=plmr-v14.28.4&v=${encodeURIComponent(RUNTIME_BUILD)}&productGroup=${encodeURIComponent(group)}${suffix || ''}`;
  }
  const RUNTIME_SOURCE = 'plmr-p3dv-runtime';
  const HOST_SOURCE = 'plmr-unified-host';
  const PRODUCT_IDENTITY = root.PulumurP3DVProductIdentity;
  if (!PRODUCT_IDENTITY) throw new Error('P3DV_PRODUCT_IDENTITY_UNAVAILABLE');
  const DEFAULT_PRODUCT_ID = PRODUCT_IDENTITY.DEFAULT_PRODUCT_ID;
  const PRODUCT_TO_GROUP = PRODUCT_IDENTITY.PRODUCT_TO_GROUP;
  const GROUP_TO_PRODUCT = PRODUCT_IDENTITY.GROUP_TO_PRODUCT;
  const SELECT_VALUE = Object.freeze({
    PERGO_RISE: 'Pergo Rise',
    P3DV_ROLLING_ROOF: 'P3DV_ROLLING_ROOF',
    P3DV_BIOCLIMATIC: 'P3DV_BIOCLIMATIC',
    P3DV_ECO_BIOCLIMATIC: 'P3DV_ECO_BIOCLIMATIC'
  });

  const $ = id => document.getElementById(id);
  let frameReady = false;
  let activeProductId = DEFAULT_PRODUCT_ID;
  let activeWorkspaceMode = '3d';
  let activeTransitionId = 0;
  let restorePending = null;
  let pendingRuntimeAction = null;
  let lastStoredHashByProduct = Object.create(null);
  let unsubscribeProject = null;
  const TECHNICAL2D_COMMAND_NAME = 'technical2d.canonical-mutation';
  let unregisterTechnical2DCommand = null;
  let initialized = false;
  let destroyed = false;
  let projectEpoch = 0;
  let modeButtonsBound = false;
  let fullscreenListenerBound = false;
  let runtimeReloadAttempts = 0;
  let sharedMainInputBound = false;
  let sharedMainInputTimer = 0;
  let suppressSharedMainInput = false;
  // Stage 9 diagnostics are derived lifecycle counters only. They are never persisted
  // and never participate in product geometry, project ownership or restore decisions.
  const lifecycleDiagnostics = {
    transitionCount: 0, modeSwitchCount: 0, projectRestoreCount: 0, sensitiveClearCount: 0,
    frameInitialLoadCount: 0, frameRetargetCount: 0, hardReloadCount: 0, runtimeReadyCount: 0,
    snapshotPersistCount: 0, initCount: 0, destroyCount: 0, modeButtonBindCount: 0, modeButtonUnbindCount: 0
  };
  const SHARED_MAIN_INPUT_IDS = Object.freeze(['systemCount','width','opening','rearHeight','parapet','parapetHeight','motor','remote','led','dimmer','waterStandard','extras']);

  function registry() { return root.PulumurProductRegistry; }
  function projectState() { return root.PulumurProjectState; }
  function actionTypes() { return root.PulumurProjectActions && root.PulumurProjectActions.TYPES; }
  function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function isEmbeddedProduct(productId) { return Object.prototype.hasOwnProperty.call(PRODUCT_TO_GROUP, String(productId || '')); }
  function canonicalProductGroup(value) { return PRODUCT_IDENTITY.canonicalGroup(value); }
  function canonicalProduct(value) {
    const adapter = registry() && registry().getProduct(value);
    if (adapter) return adapter.id;
    const raw = String(value || '').trim();
    if (!raw) return DEFAULT_PRODUCT_ID;
    if (raw === 'Pergo Rise') return 'PERGO_RISE';
    return raw;
  }
  function workspaceProductOwner(workspaces) {
    const source = workspaces && typeof workspaces === 'object' ? workspaces : {};
    const p3dv = source.p3dv && typeof source.p3dv === 'object' ? source.p3dv : {};
    const candidates = [source.activeProductId, p3dv.productId];
    for (const candidate of candidates) {
      if (!candidate) continue;
      const id = canonicalProduct(candidate);
      if (id === 'PERGO_RISE' || isEmbeddedProduct(id)) return id;
    }
    const groupCandidates = [p3dv.productGroup, p3dv.snapshot && p3dv.snapshot.modelState && p3dv.snapshot.modelState.productGroup];
    for (const group of groupCandidates) {
      const id = GROUP_TO_PRODUCT[canonicalProductGroup(group)];
      if (id) return id;
    }
    const snapshots = p3dv.snapshots && typeof p3dv.snapshots === 'object' ? p3dv.snapshots : {};
    let selected = null;
    let selectedStamp = '';
    Object.entries(snapshots).forEach(([key, entry]) => {
      const item = entry && typeof entry === 'object' ? entry : {};
      const snapshot = item.snapshot && typeof item.snapshot === 'object' ? item.snapshot : null;
      const id = GROUP_TO_PRODUCT[canonicalProductGroup(item.productGroup || snapshot && snapshot.modelState && snapshot.modelState.productGroup || '')] || canonicalProduct(key);
      if (!isEmbeddedProduct(id)) return;
      const stamp = String(item.updatedAt || snapshot && snapshot.capturedAt || '');
      if (!selected || stamp >= selectedStamp) { selected = id; selectedStamp = stamp; }
    });
    return selected || DEFAULT_PRODUCT_ID;
  }
  function workspaceModel() {
    const state = projectState();
    const model = state && typeof state.getModel === 'function' ? state.getModel() : null;
    return model && model.workspaces || null;
  }
  function hashSnapshot(value) {
    const text = JSON.stringify(value || null);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16777619); }
    return `${text.length}:${hash >>> 0}`;
  }
  function resetProjectTransitionCaches() {
    projectEpoch += 1;
    restorePending = null;
    pendingRuntimeAction = null;
    lastStoredHashByProduct = Object.create(null);
  }
  function dispatchWorkspace(patch, source) {
    const state = projectState();
    const types = actionTypes();
    if (!state || !types || !types.PATCH_WORKSPACES) return;
    state.dispatch(types.PATCH_WORKSPACES, patch, { source: source || 'unified-workspace', allowInvalid: true });
  }
  function setButton(button, active, disabled) {
    if (!button) return;
    button.disabled = Boolean(disabled);
    button.classList.toggle('is-active', Boolean(active));
    button.classList.toggle('is-disabled', Boolean(disabled));
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.setAttribute('aria-disabled', disabled ? 'true' : 'false');
  }
  function syncModule(productId) {
    const moduleSelect = $('moduleName');
    const adapter = registry() && registry().getProduct(productId);
    if (!moduleSelect || !adapter) return;
    const moduleName = adapter.manifest && adapter.manifest.navigation && adapter.manifest.navigation.moduleName || 'Module 1';
    moduleSelect.replaceChildren();
    const option = document.createElement('option');
    option.value = moduleName;
    option.textContent = moduleName === 'Standalone' ? 'Bağımsız Çizim' : moduleName;
    option.selected = true;
    moduleSelect.appendChild(option);
  }
  function syncSelector(productId) {
    const select = $('product');
    const value = SELECT_VALUE[productId];
    if (select && value && Array.from(select.options).some(option => option.value === value)) select.value = value;
  }
  function setRowHiddenByInput(id, hidden) {
    const node = $(id);
    const row = node && typeof node.closest === 'function' ? node.closest('label') : null;
    if (row) row.hidden = Boolean(hidden);
  }
  function configureSharedMainProductInputs(productId) {
    const embedded = isEmbeddedProduct(productId);
    setRowHiddenByInput('frontHeight', embedded);
    setRowHiddenByInput('rayCount', embedded);
    setRowHiddenByInput('postCount', embedded);
    ['glassTrack','fabric','fabricProfiles','triangleJoinery','waterOutletPlacement'].forEach(id => setRowHiddenByInput(id, embedded));
    const rearLabel = $('labelRearHeight');
    if (rearLabel) rearLabel.textContent = embedded ? 'Yükseklik' : 'Arka H';
    const openingLabel = $('labelOpening');
    if (openingLabel) openingLabel.textContent = 'Açılım';
    const systemLabel = $('labelSystemCount');
    if (systemLabel) systemLabel.textContent = 'Sistem Adedi';
    const widthLabel = $('labelWidth');
    if (widthLabel) widthLabel.textContent = 'Genişlik';
  }
  function sharedMainInputPayload() {
    const value = id => { const node=$(id); return node && 'value' in node ? String(node.value == null ? '' : node.value) : ''; };
    return {
      systemCount: value('systemCount'), width: value('width'), depth: value('opening'), height: value('rearHeight'),
      parapet: value('parapet'), parapetHeight: value('parapetHeight'), motor: value('motor'), remote: value('remote'),
      led: value('led'), dimmer: value('dimmer'), waterStandard: value('waterStandard'), extras: value('extras')
    };
  }
  function syncSharedMainInputsFromSnapshot(snapshot) {
    if (!isEmbeddedProduct(activeProductId) || !snapshotBelongsToProduct(activeProductId, snapshot)) return false;
    const model = snapshot.modelState || {};
    const drafts = model.inputDrafts || {};
    const values = {
      systemCount: String(model.systemCount || 1),
      width: String(Object.prototype.hasOwnProperty.call(drafts,'width') ? (drafts.width == null ? '' : drafts.width) : (model.width || '')),
      opening: String(Object.prototype.hasOwnProperty.call(drafts,'depth') ? (drafts.depth == null ? '' : drafts.depth) : (model.depth || '')),
      rearHeight: String(Object.prototype.hasOwnProperty.call(drafts,'height') ? (drafts.height == null ? '' : drafts.height) : (model.height || '')),
      parapet: String(model.parapet || 'HAYIR'), parapetHeight: String(model.parapetHeight || ''),
      motor: String(model.motor || 'Yok'), remote: String(model.remote || 'Yok'), led: String(model.led || 'NO'),
      dimmer: String(model.dimmer || 'HAYIR'), waterStandard: String(model.waterStandard || 'EVET'), extras: String(model.extras || '')
    };
    suppressSharedMainInput = true;
    try {
      Object.entries(values).forEach(([id,value]) => { const node=$(id); if (node && 'value' in node) node.value=value; });
    } finally { suppressSharedMainInput = false; }
    return true;
  }
  function clearSharedMainInputs() {
    suppressSharedMainInput = true;
    try {
      const reset = { systemCount:'1', width:'', opening:'', rearHeight:'', parapet:'HAYIR', parapetHeight:'', motor:'Yok', remote:'Yok', led:'NO', dimmer:'HAYIR', waterStandard:'EVET', extras:'' };
      Object.entries(reset).forEach(([id,value]) => { const node=$(id); if (node && 'value' in node) node.value=value; });
    } finally { suppressSharedMainInput = false; }
  }
  function applySharedMainInputsToCanonical(options) {
    const opts=options||{};
    if (!isEmbeddedProduct(activeProductId)) return null;
    const bridge=runtimeBridge();
    if (!bridge || typeof bridge.applyMainProductInput !== 'function') return null;
    try {
      const response=bridge.applyMainProductInput(sharedMainInputPayload(), activeTransitionId);
      const snapshot=response && response.snapshot ? response.snapshot : (typeof bridge.snapshot==='function' ? bridge.snapshot() : null);
      if (!snapshotBelongsToProduct(activeProductId,snapshot)) return null;
      const group=PRODUCT_TO_GROUP[activeProductId];
      persistSnapshot(activeProductId,group,snapshot,opts.source||'unified-workspace:shared-main-input');
      syncSharedMainInputsFromSnapshot(snapshot);
      if (activeWorkspaceMode==='2d' && supportsTechnical2D(activeProductId)) renderTechnical2D(snapshot,{fit:opts.fit===true});
      return snapshot;
    } catch(error) {
      if (!opts.silent) console.error('Shared main-product input apply failed',error);
      return null;
    }
  }
  function scheduleSharedMainInputApply() {
    if (suppressSharedMainInput || !isEmbeddedProduct(activeProductId) || activeWorkspaceMode!=='2d') return;
    if (sharedMainInputTimer) window.clearTimeout(sharedMainInputTimer);
    sharedMainInputTimer=window.setTimeout(()=>{ sharedMainInputTimer=0; applySharedMainInputsToCanonical({source:'unified-workspace:shared-main-input-live',silent:true}); },120);
  }
  function handleSharedMainInputEvent(event) {
    const target=event && event.target;
    if (!target || !SHARED_MAIN_INPUT_IDS.includes(target.id)) return;
    scheduleSharedMainInputApply();
  }
  function bindSharedMainInputEvents() {
    if (sharedMainInputBound) return;
    sharedMainInputBound=true;
    document.addEventListener('input',handleSharedMainInputEvent,true);
    document.addEventListener('change',handleSharedMainInputEvent,true);
  }
  function unbindSharedMainInputEvents() {
    if (!sharedMainInputBound) return;
    sharedMainInputBound=false;
    document.removeEventListener('input',handleSharedMainInputEvent,true);
    document.removeEventListener('change',handleSharedMainInputEvent,true);
    if (sharedMainInputTimer) window.clearTimeout(sharedMainInputTimer);
    sharedMainInputTimer=0;
  }

  function supportsTechnical2D(productId) {
    const productRegistry = registry();
    return Boolean(productRegistry && typeof productRegistry.supports === 'function' && productRegistry.supports(productId, 'technical2D'));
  }
  function technical2DProjectInfo() {
    const value = id => { const node = $(id); return node && 'value' in node ? String(node.value || '').trim() : String(node && node.textContent || '').trim(); };
    return Object.freeze({
      customer: value('customer'),
      project: value('project'),
      projectCode: value('cloudProjectCode'),
      drawnBy: value('drawnBy'),
      revision: value('cloudRevision') || value('version'),
      date: value('date')
    });
  }
  function renderTechnical2D(snapshot, options) {
    if (!supportsTechnical2D(activeProductId)) return null;
    let source = snapshot || null;
    if (!source) {
      const bridge = runtimeBridge();
      try {
        const live = bridge && typeof bridge.snapshot === 'function' ? bridge.snapshot() : null;
        if (snapshotBelongsToProduct(activeProductId, live)) source = live;
      } catch (_) {}
    }
    if (!source) source = productSnapshotFor(activeProductId);
    const workspace = root.PulumurTechnical2DWorkspace;
    if (!source || !workspace || typeof workspace.project !== 'function') return null;
    if (typeof workspace.setActive === 'function') workspace.setActive(true);
    let contract = options && options.contract || null;
    if (!contract) {
      const bridge = runtimeBridge();
      try { if (bridge && typeof bridge.technical2DContract === 'function') contract = bridge.technical2DContract(); } catch (_) {}
    }
    try { return workspace.project(source, { projectInfo: technical2DProjectInfo(), contract, fit: !(options && options.fit === false) }); }
    catch (error) { console.error('Technical2D projection failed', error); return null; }
  }
  async function executeTechnical2DCommandInternal(command) {
    if (!supportsTechnical2D(activeProductId) || activeWorkspaceMode !== '2d') return { ok: false, error: 'TECHNICAL2D_COMMAND_MODE_MISMATCH' };
    const bridge = runtimeBridge();
    if (!bridge || typeof bridge.executeTechnical2DCommand !== 'function') return { ok: false, error: 'TECHNICAL2D_COMMAND_BRIDGE_UNAVAILABLE' };
    try {
      const response = bridge.executeTechnical2DCommand(clone(command || {}), activeTransitionId);
      if (!response || response.ok === false || !response.snapshot) return { ok: false, error: response && response.error || 'TECHNICAL2D_COMMAND_FAILED' };
      const group = canonicalProductGroup(response.snapshot && response.snapshot.modelState && response.snapshot.modelState.productGroup);
      if (group !== PRODUCT_TO_GROUP[activeProductId]) return { ok: false, error: 'TECHNICAL2D_COMMAND_PRODUCT_MISMATCH' };
      persistSnapshot(activeProductId, group, response.snapshot, `technical2d:${String(command && command.type || 'command')}`);
      renderTechnical2D(response.snapshot, { fit: false, contract: response.contract || null });
      syncTechnical2DHistoryControls();
      try { window.dispatchEvent(new CustomEvent('plmr:workspace-dirty', { detail: { productId: activeProductId, mode: '2d', command: String(command && command.type || '') } })); } catch (_) {}
      window.setTimeout(() => {
        if (!supportsTechnical2D(activeProductId) || activeWorkspaceMode !== '2d') return;
        try {
          const live = bridge.snapshot();
          const contract = typeof bridge.technical2DContract === 'function' ? bridge.technical2DContract() : null;
          if (snapshotBelongsToProduct(activeProductId, live)) {
            persistSnapshot(activeProductId, group, live, 'technical2d:post-command-settle');
            renderTechnical2D(live, { fit: false, contract });
          }
        } catch (_) {}
      }, 90);
      return response;
    } catch (error) {
      console.error('Technical2D canonical command failed', error);
      return { ok: false, error: String(error && error.message || error) };
    }
  }
  function getTechnical2DHistory() {
    if (!isEmbeddedProduct(activeProductId)) return null;
    const bridge = runtimeBridge();
    try { return bridge && typeof bridge.history === 'function' ? clone(bridge.history()) : null; }
    catch (_) { return null; }
  }
  function syncTechnical2DHistoryControls() {
    if (!(activeWorkspaceMode === '2d' && supportsTechnical2D(activeProductId))) return false;
    const history = getTechnical2DHistory() || { canUndo: false, canRedo: false, undo: [], redo: [] };
    const undoBtn = $('undoPreviewBtn');
    const redoBtn = $('redoPreviewBtn');
    const step = Array.isArray(history.undo) ? history.undo.length : 0;
    const total = step + (Array.isArray(history.redo) ? history.redo.length : 0);
    if (undoBtn) {
      undoBtn.disabled = !history.canUndo;
      undoBtn.setAttribute('aria-disabled', history.canUndo ? 'false' : 'true');
      undoBtn.title = `Geri Al (Ctrl+Z) · P3DV ${step}/${total}`;
    }
    if (redoBtn) {
      redoBtn.disabled = !history.canRedo;
      redoBtn.setAttribute('aria-disabled', history.canRedo ? 'false' : 'true');
      redoBtn.title = `İleri Al (Ctrl+Y / Ctrl+Shift+Z) · P3DV ${step}/${total}`;
    }
    return true;
  }
  async function moveTechnical2DHistory(direction) {
    if (!(activeWorkspaceMode === '2d' && supportsTechnical2D(activeProductId))) return { ok: false, error: 'TECHNICAL2D_HISTORY_MODE_MISMATCH' };
    const bridge = runtimeBridge();
    const method = direction === 'redo' ? 'redoTechnical2DCommand' : 'undoTechnical2DCommand';
    if (!bridge || typeof bridge[method] !== 'function') return { ok: false, error: 'TECHNICAL2D_HISTORY_BRIDGE_UNAVAILABLE' };
    try {
      const response = bridge[method]();
      if (!response || response.ok === false || !response.snapshot) {
        syncTechnical2DHistoryControls();
        return response || { ok: false, error: 'TECHNICAL2D_HISTORY_MOVE_FAILED' };
      }
      const group = canonicalProductGroup(response.snapshot && response.snapshot.modelState && response.snapshot.modelState.productGroup);
      if (group !== PRODUCT_TO_GROUP[activeProductId]) return { ok: false, error: 'TECHNICAL2D_HISTORY_PRODUCT_MISMATCH' };
      persistSnapshot(activeProductId, group, response.snapshot, `technical2d:history-${direction}`);
      renderTechnical2D(response.snapshot, { fit: false, contract: response.contract || null });
      syncSharedMainInputsFromSnapshot(response.snapshot);
      syncTechnical2DHistoryControls();
      try { window.dispatchEvent(new CustomEvent('plmr:workspace-dirty', { detail: { productId: activeProductId, mode: '2d', command: `history-${direction}` } })); } catch (_) {}
      return response;
    } catch (error) {
      syncTechnical2DHistoryControls();
      return { ok: false, error: String(error && error.message || error) };
    }
  }
  function undoTechnical2DHistory() { return moveTechnical2DHistory('undo'); }
  function redoTechnical2DHistory() { return moveTechnical2DHistory('redo'); }

  function ensureTechnical2DCommandRegistration() {
    if (typeof unregisterTechnical2DCommand === 'function') return true;
    const commands = root.PulumurProjectCommandService;
    if (!commands || typeof commands.register !== 'function' || typeof commands.execute !== 'function') return false;
    if (typeof commands.has === 'function' && commands.has(TECHNICAL2D_COMMAND_NAME)) commands.unregister(TECHNICAL2D_COMMAND_NAME);
    unregisterTechnical2DCommand = commands.register(TECHNICAL2D_COMMAND_NAME, (command) => executeTechnical2DCommandInternal(command));
    return true;
  }
  async function executeTechnical2DCommand(command) {
    const commands = root.PulumurProjectCommandService;
    if (!ensureTechnical2DCommandRegistration() || !commands) return { ok: false, error: 'PROJECT_COMMAND_SERVICE_UNAVAILABLE' };
    try { return await Promise.resolve(commands.execute(TECHNICAL2D_COMMAND_NAME, clone(command || {}), { source: 'technical2d' })); }
    catch (error) { return { ok: false, error: String(error && error.message || error) }; }
  }
  function syncProductUI(productId) {
    const embedded = isEmbeddedProduct(productId);
    const technical = embedded && supportsTechnical2D(productId);
    if (!embedded) activeWorkspaceMode = '2d';
    else if (!technical && activeWorkspaceMode === '2d') activeWorkspaceMode = '3d';
    const mode = embedded ? activeWorkspaceMode : '2d';
    const native = $('plmr2DWorkspace');
    const twoD = $('technical2DWorkspace');
    const three = $('p3dv3DWorkspace');
    const engine = $('engine');
    const shared2D = productId === 'PERGO_RISE';
    syncSelector(productId);
    syncModule(productId);
    configureSharedMainProductInputs(productId);
    // V14.12.3: There is one 2D application shell. Pergola and every Technical2D
    // projection reuse the exact same header/input/preview/toolbox/table workspace.
    // Product-specific code may replace only the drawing inside #preview.
    if (native) native.hidden = !(shared2D || (technical && mode === '2d'));
    if (twoD) twoD.hidden = true;
    if (three) three.hidden = !(embedded && mode === '3d');
    const t2dWorkspace = root.PulumurTechnical2DWorkspace;
    if (t2dWorkspace && typeof t2dWorkspace.setActive === 'function') t2dWorkspace.setActive(false);
    if (engine) engine.value = mode === '3d' ? '3d' : '2d';
    // V14.28.4 demo: the duplicate header 2D/3D selector is gone. The real 3D
    // runtime owns the 3D -> 2D request; while Technical2D is visible, this
    // drawing-workspace control provides the return path to the same host mode owner.
    const return3D = $('technical2DTo3DBtn');
    if (return3D) {
      const canReturn3D = !!(technical && mode === '2d');
      return3D.hidden = !canReturn3D;
      return3D.disabled = !canReturn3D;
      return3D.setAttribute('aria-hidden', canReturn3D ? 'false' : 'true');
    }
    document.body.dataset.workspaceMode = mode;
    document.body.dataset.activeProduct = productId;
    if (technical && mode === '2d') window.setTimeout(syncTechnical2DHistoryControls, 0);
    else if (typeof root.PulumurRefreshNativeHistoryControls === 'function') window.setTimeout(root.PulumurRefreshNativeHistoryControls, 0);
  }
  function ensureFrame() {
    const frame = $('p3dvRuntimeFrame');
    if (!frame) throw new Error('P3DV_RUNTIME_FRAME_MISSING');
    const desiredGroup = PRODUCT_TO_GROUP[activeProductId] || PRODUCT_TO_GROUP[DEFAULT_PRODUCT_ID];
    const raw = rawRuntimeBridge();
    if (raw && (raw.hostContract !== RUNTIME_CONTRACT || raw.build !== RUNTIME_BUILD)) {
      hardReloadRuntime('stale-runtime-bridge', activeProductId);
      return frame;
    }
    if (!frame.dataset.runtimeLoaded) {
      lifecycleDiagnostics.frameInitialLoadCount += 1;
      frame.dataset.runtimeLoaded = 'true';
      frame.dataset.bootProductGroup = desiredGroup;
      frame.src = embedUrlForProduct(activeProductId);
    } else if (!frameReady && frame.dataset.bootProductGroup && frame.dataset.bootProductGroup !== desiredGroup) {
      // A fast header switch may happen while the iframe is still booting. Never
      // let the original default Galaxy boot win that race: retarget the same iframe
      // DOM to the host-owned product before its bridge becomes authoritative.
      frameReady = false;
      frame.dataset.bootProductGroup = desiredGroup;
      frame.src = embedUrlForProduct(activeProductId, `&retarget=${Date.now()}`);
    }
    return frame;
  }
  function retargetFrameForProduct(productId, reason, transitionId) {
    const frame = $('p3dvRuntimeFrame');
    if (!frame || !isEmbeddedProduct(productId)) return false;
    const desiredGroup = PRODUCT_TO_GROUP[productId];
    lifecycleDiagnostics.frameRetargetCount += 1;
    frameReady = false;
    runtimeReloadAttempts = 0;
    frame.dataset.runtimeLoaded = 'true';
    frame.dataset.bootProductGroup = desiredGroup;
    frame.dataset.runtimeReloadReason = String(reason || 'product-transition');
    frame.src = embedUrlForProduct(productId, `&transition=${Number(transitionId || activeTransitionId || 0)}&ts=${Date.now()}`);
    return true;
  }

  function runtimeTargetOrigin() {
    const origin = String(window.location.origin || '');
    return origin && origin !== 'null' ? origin : '*';
  }
  function originAccepted(eventOrigin) {
    const origin = String(window.location.origin || '');
    return !origin || origin === 'null' || eventOrigin === origin;
  }
  function post(type, payload, transitionId = activeTransitionId) {
    const frame = $('p3dvRuntimeFrame');
    if (!frame || !frame.contentWindow || !frameReady) return false;
    frame.contentWindow.postMessage({ schema: 'plmr-p3dv-runtime-message-v1', source: HOST_SOURCE, type, transitionId, payload: clone(payload || {}) }, runtimeTargetOrigin());
    return true;
  }
  // Snapshot identity and snapshot form-restoration trust are separate concerns.
  // A physically valid live product state must remain usable for Technical2D even
  // when it came from an older project envelope whose draft/schema metadata needs
  // normalization. P3DV restore already normalizes legacy simple input drafts.
  function snapshotBelongsToProduct(productId, snapshot) {
    if (!isEmbeddedProduct(productId) || !snapshot || snapshot.schema !== 'p3dv-host-snapshot-v1' || !snapshot.modelState) return false;
    return canonicalProductGroup(snapshot.modelState.productGroup) === PRODUCT_TO_GROUP[productId];
  }
  function snapshotFromEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;
    if (entry.schema === 'p3dv-host-snapshot-v1' && entry.modelState) return entry;
    return entry.snapshot && typeof entry.snapshot === 'object' ? entry.snapshot : null;
  }
  function snapshotEntryProductId(key, entry) {
    const item = entry && typeof entry === 'object' ? entry : {};
    const snapshot = snapshotFromEntry(item);
    const group = canonicalProductGroup(item.productGroup || snapshot && snapshot.modelState && snapshot.modelState.productGroup || '');
    if (GROUP_TO_PRODUCT[group]) return GROUP_TO_PRODUCT[group];
    const byKey = canonicalProduct(key);
    return isEmbeddedProduct(byKey) ? byKey : '';
  }
  function snapshotEntryStamp(entry) {
    const snapshot = snapshotFromEntry(entry);
    return String(entry && entry.updatedAt || snapshot && snapshot.capturedAt || '');
  }
  function legacySnapshotEntryFor(p3dv, productId) {
    const snapshots = p3dv && p3dv.snapshots && typeof p3dv.snapshots === 'object' ? p3dv.snapshots : {};
    let selected = null;
    let selectedStamp = '';
    Object.entries(snapshots).forEach(([key, entry]) => {
      const snapshot = snapshotFromEntry(entry);
      if (!snapshot || snapshotEntryProductId(key, entry) !== productId || !snapshotBelongsToProduct(productId, snapshot)) return;
      const stamp = snapshotEntryStamp(entry);
      if (!selected || stamp >= selectedStamp) { selected = { entry, snapshot }; selectedStamp = stamp; }
    });
    return selected;
  }
  function productSnapshotFor(productId) {
    const workspaces = workspaceModel();
    const p3dv = workspaces && workspaces.p3dv;
    if (!p3dv) return null;
    const selected = legacySnapshotEntryFor(p3dv, productId);
    const activeProduct = canonicalProduct(p3dv.productId || GROUP_TO_PRODUCT[canonicalProductGroup(p3dv.productGroup)] || '');
    const activeSnapshot = p3dv.snapshot;
    const activeStamp = String(p3dv.updatedAt || activeSnapshot && activeSnapshot.capturedAt || '');
    if (activeProduct === productId && snapshotBelongsToProduct(productId, activeSnapshot) && (!selected || activeStamp >= snapshotEntryStamp(selected.entry))) return clone(activeSnapshot);
    if (selected) return clone(selected.snapshot);
    return null;
  }
  function canonicalSnapshotMap(p3dv) {
    const raw = p3dv && p3dv.snapshots && typeof p3dv.snapshots === 'object' ? p3dv.snapshots : {};
    const next = {};
    const stamps = {};
    Object.entries(raw).forEach(([key, entry]) => {
      const item = entry && typeof entry === 'object' ? entry : {};
      const snapshot = snapshotFromEntry(item);
      const id = snapshotEntryProductId(key, item);
      if (!id) { next[key] = clone(item); return; }
      const stamp = snapshotEntryStamp(item);
      if (!next[id] || stamp >= (stamps[id] || '')) {
        next[id] = { productGroup: PRODUCT_TO_GROUP[id], snapshot: clone(snapshot), updatedAt: stamp };
        stamps[id] = stamp;
      }
    });
    return next;
  }
  function persistSnapshot(productId, productGroup, snapshot, source) {
    productGroup = canonicalProductGroup(productGroup);
    if (!isEmbeddedProduct(productId) || PRODUCT_TO_GROUP[productId] !== productGroup || !snapshot) return false;
    const nextHash = hashSnapshot(snapshot);
    if (lastStoredHashByProduct[productId] === nextHash) return false;
    lastStoredHashByProduct[productId] = nextHash;
    const stamp = new Date().toISOString();
    const workspaces = workspaceModel();
    const snapshots = canonicalSnapshotMap(workspaces && workspaces.p3dv);
    snapshots[productId] = { productGroup, snapshot: clone(snapshot), updatedAt: stamp };
    lifecycleDiagnostics.snapshotPersistCount += 1;
    dispatchWorkspace({
      p3dv: {
        productId,
        productGroup,
        snapshot: clone(snapshot),
        snapshots,
        replaceSnapshots: true,
        updatedAt: stamp
      }
    }, source || 'p3dv-runtime:snapshot');
    return true;
  }
  function captureCurrent3DBeforeSwitch(previousProductId) {
    if (!isEmbeddedProduct(previousProductId)) return;
    const frame = $('p3dvRuntimeFrame');
    try {
      const bridge = frame && frame.contentWindow && frame.contentWindow.__P3DV_HOST_BRIDGE__;
      if (!bridge || typeof bridge.snapshot !== 'function') return;
      const snapshot = bridge.snapshot();
      const group = canonicalProductGroup(snapshot && snapshot.modelState && snapshot.modelState.productGroup);
      if (GROUP_TO_PRODUCT[group] !== previousProductId) return;
      persistSnapshot(previousProductId, group, snapshot, 'unified-workspace:pre-switch-snapshot');
    } catch (_) {}
  }
  function rawRuntimeBridge() {
    const frame = $('p3dvRuntimeFrame');
    try {
      const bridge = frame && frame.contentWindow && frame.contentWindow.__P3DV_HOST_BRIDGE__;
      return bridge && bridge.embedded ? bridge : null;
    } catch (_) { return null; }
  }
  function runtimeBridge() {
    const bridge = rawRuntimeBridge();
    if (!bridge) return null;
    return bridge.hostContract === RUNTIME_CONTRACT && bridge.build === RUNTIME_BUILD ? bridge : null;
  }
  function hardReloadRuntime(reason, productId) {
    const frame = $('p3dvRuntimeFrame');
    if (!frame || runtimeReloadAttempts >= 3) return false;
    runtimeReloadAttempts += 1;
    lifecycleDiagnostics.hardReloadCount += 1;
    const targetProductId = isEmbeddedProduct(productId) ? productId : activeProductId;
    const desiredGroup = PRODUCT_TO_GROUP[targetProductId] || PRODUCT_TO_GROUP[DEFAULT_PRODUCT_ID];
    frameReady = false;
    frame.dataset.runtimeLoaded = 'true';
    frame.dataset.bootProductGroup = desiredGroup;
    frame.dataset.runtimeReloadReason = String(reason || 'runtime-contract');
    frame.src = embedUrlForProduct(targetProductId, `&reload=${runtimeReloadAttempts}&ts=${Date.now()}`);
    return true;
  }
  function settleRuntimeSnapshot(productId, transitionId, options) {
    if (!isEmbeddedProduct(productId) || productId !== activeProductId || transitionId !== activeTransitionId) return null;
    const bridge = runtimeBridge();
    if (!bridge || typeof bridge.snapshot !== 'function') return null;
    try {
      const snapshot = bridge.snapshot();
      const group = canonicalProductGroup(snapshot && snapshot.modelState && snapshot.modelState.productGroup);
      if (!snapshotBelongsToProduct(productId, snapshot) || PRODUCT_TO_GROUP[productId] !== group) return null;
      persistSnapshot(productId, group, snapshot, 'unified-workspace:live-settle');
      syncSharedMainInputsFromSnapshot(snapshot);
      if (activeWorkspaceMode === '2d' && supportsTechnical2D(productId)) {
        let contract = null;
        try { if (typeof bridge.technical2DContract === 'function') contract = bridge.technical2DContract(); } catch (_) {}
        renderTechnical2D(snapshot, { fit: !(options && options.fit === false), contract });
      }
      return snapshot;
    } catch (_) { return null; }
  }
  function hostFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }
  function host3DFullscreenActive() {
    const current = hostFullscreenElement();
    const workspace = $('p3dv3DWorkspace');
    return Boolean(current && (current === document.documentElement || current === document.body || current === workspace));
  }
  function notifyRuntimePreviewExpanded(expanded) {
    const bridge = runtimeBridge();
    try {
      if (bridge && typeof bridge.setPreviewExpanded === 'function') {
        bridge.setPreviewExpanded(Boolean(expanded), { notifyHost: false });
        return true;
      }
    } catch (_) {}
    return post('set-preview-expanded', { expanded: Boolean(expanded) }, activeTransitionId);
  }
  function setHostPreviewExpandedVisual(expanded) {
    const next = Boolean(expanded) && isEmbeddedProduct(activeProductId);
    document.body.classList.toggle('p3dv-host-preview-expanded', next);
    document.body.dataset.p3dvPreviewExpanded = next ? 'true' : 'false';
    const workspace = $('p3dv3DWorkspace');
    if (workspace) workspace.setAttribute('aria-expanded', next ? 'true' : 'false');
    return next;
  }
  async function setHostPreviewExpanded(expanded, options) {
    const opts = options || {};
    const workspace = $('p3dv3DWorkspace');
    const requested = Boolean(expanded) && isEmbeddedProduct(activeProductId);
    if (!workspace) return false;

    if (requested && opts.browserFullscreen !== false) {
      if (!host3DFullscreenActive()) {
        try {
          const target = document.documentElement || workspace;
          const standardRequest = target && target.requestFullscreen;
          const webkitRequest = target && target.webkitRequestFullscreen;
          if (typeof standardRequest === 'function') await standardRequest.call(target, { navigationUI: 'hide' });
          else if (typeof webkitRequest === 'function') await webkitRequest.call(target);
          else throw new Error('FULLSCREEN_API_UNAVAILABLE');
        } catch (error) {
          document.body.dataset.p3dvFullscreenError = String(error && (error.name || error.message) || 'FULLSCREEN_REJECTED');
          setHostPreviewExpandedVisual(false);
          if (opts.notifyRuntime !== false) notifyRuntimePreviewExpanded(false);
          console.warn('PLMR host native fullscreen request failed.', error);
          return false;
        }
      }
      if (!host3DFullscreenActive()) {
        document.body.dataset.p3dvFullscreenError = 'FULLSCREEN_NOT_ENTERED';
        setHostPreviewExpandedVisual(false);
        if (opts.notifyRuntime !== false) notifyRuntimePreviewExpanded(false);
        return false;
      }
      delete document.body.dataset.p3dvFullscreenError;
      setHostPreviewExpandedVisual(true);
    } else if (requested) {
      setHostPreviewExpandedVisual(true);
    } else {
      if (host3DFullscreenActive() && opts.exitBrowserFullscreen !== false) {
        try {
          const exit = document.exitFullscreen || document.webkitExitFullscreen;
          if (typeof exit === 'function') await exit.call(document);
        } catch (error) {
          document.body.dataset.p3dvFullscreenError = String(error && (error.name || error.message) || 'FULLSCREEN_EXIT_REJECTED');
          console.warn('PLMR host native fullscreen exit failed.', error);
          return false;
        }
      }
      setHostPreviewExpandedVisual(false);
      delete document.body.dataset.p3dvFullscreenError;
    }

    if (opts.notifyRuntime !== false) notifyRuntimePreviewExpanded(requested);
    window.requestAnimationFrame(() => {
      try { window.dispatchEvent(new Event('resize')); } catch (_) {}
      post('viewport-resized', {}, activeTransitionId);
    });
    return requested;
  }

  function handleHostFullscreenChange() {
    const workspace = $('p3dv3DWorkspace');
    if (!workspace) return;
    const active = host3DFullscreenActive();
    const visuallyExpanded = document.body.classList.contains('p3dv-host-preview-expanded');
    if (!active && visuallyExpanded) {
      setHostPreviewExpandedVisual(false);
      notifyRuntimePreviewExpanded(false);
    }
    if (active) delete document.body.dataset.p3dvFullscreenError;
    window.requestAnimationFrame(() => {
      try { window.dispatchEvent(new Event('resize')); } catch (_) {}
      post('viewport-resized', {}, activeTransitionId);
    });
  }
  function handleHostFullscreenError(event) {
    document.body.dataset.p3dvFullscreenError = String(event && event.type || 'fullscreenerror');
    if (!host3DFullscreenActive()) {
      setHostPreviewExpandedVisual(false);
      notifyRuntimePreviewExpanded(false);
    }
  }

  function syncProjectMetadataForProduct(productId) {
    const state = projectState();
    const types = actionTypes();
    const adapter = registry() && registry().getProduct(productId);
    if (!state || !types || !types.SET_FORM_FIELD || !adapter) return;
    const selectValue = SELECT_VALUE[productId] || productId;
    const moduleName = adapter.manifest && adapter.manifest.navigation && adapter.manifest.navigation.moduleName || 'Module 1';
    const engineName = isEmbeddedProduct(productId) && activeWorkspaceMode === '3d' ? 'Web 3D' : 'Web DXF / 2D';
    state.dispatch(types.SET_FORM_FIELD, { field: 'product', value: selectValue }, { source: 'unified-workspace:metadata-product', allowInvalid: true });
    state.dispatch(types.SET_FORM_FIELD, { field: 'moduleName', value: moduleName }, { source: 'unified-workspace:metadata-module', allowInvalid: true });
    state.dispatch(types.SET_FORM_FIELD, { field: 'engine', value: engineName }, { source: 'unified-workspace:metadata-engine', allowInvalid: true });
  }
  function directRuntimeCommand(type, payload, transitionId) {
    const bridge = runtimeBridge();
    if (!bridge) return false;
    try {
      if (type === 'activate-product' && typeof bridge.activateProduct === 'function') bridge.activateProduct(payload.productGroup, payload.snapshot || null, transitionId);
      else if (type === 'restore-snapshot' && typeof bridge.restore === 'function') bridge.restore(payload.snapshot, payload.productGroup, transitionId);
      else if (type === 'set-product' && typeof bridge.setProduct === 'function') bridge.setProduct(payload.productGroup, transitionId);
      else if (type === 'apply-quick-test' && typeof bridge.applyQuickTest === 'function') bridge.applyQuickTest(Number(payload.index), transitionId);
      else if (type === 'set-runtime-active' && typeof bridge.setRuntimeActive === 'function') bridge.setRuntimeActive(Boolean(payload.active), transitionId);
      else if (type === 'set-drawing-mode' && typeof bridge.setDrawingMode === 'function') bridge.setDrawingMode(payload.mode, transitionId);
      else if (type === 'set-preview-expanded' && typeof bridge.setPreviewExpanded === 'function') bridge.setPreviewExpanded(Boolean(payload.expanded), { notifyHost: false });
      else if (type === 'viewport-resized' && typeof bridge.resize === 'function') bridge.resize();
      else return false;
      frameReady = true;
      if ((type === 'activate-product' || type === 'restore-snapshot' || type === 'set-product' || type === 'apply-quick-test') && typeof bridge.notify === 'function') bridge.notify(transitionId);
      return true;
    } catch (error) {
      if (type === 'restore-snapshot') return false;
      console.error('P3DV direct runtime command failed', error);
      return false;
    }
  }

  // Product identity is never restored *instead of* activating the requested product.
  // Every 3D transition first establishes a hard product boundary in P3DV, then an
  // optional trusted same-product snapshot is applied inside that boundary.
  function issueRuntimeCommand(productId, transitionId, options) {
    const opts = options || {};
    const group = PRODUCT_TO_GROUP[productId];
    if (!group || productId !== activeProductId || transitionId !== activeTransitionId) return;
    const bridge = runtimeBridge();
    if (bridge) frameReady = true;
    const stored = opts.forceFresh === true ? null : productSnapshotFor(productId);
    restorePending = stored ? { transitionId, productId, group, snapshot: stored } : null;
    if (!frameReady && !bridge) return;
    const payload = {
      productId,
      productGroup: group,
      snapshot: stored || null,
      reason: opts.reason || 'activate-product'
    };
    const direct = directRuntimeCommand('activate-product', payload, transitionId);
    if (!direct) post('activate-product', payload, transitionId);
    else {
      settleRuntimeSnapshot(productId, transitionId, { fit: activeWorkspaceMode === '2d' });
      window.requestAnimationFrame(() => settleRuntimeSnapshot(productId, transitionId, { fit: false }));
    }
    restorePending = null;
    if (supportsTechnical2D(productId)) {
      const modePayload = { mode: activeWorkspaceMode === '2d' ? '2d' : '3d' };
      if (!directRuntimeCommand('set-drawing-mode', modePayload, transitionId)) post('set-drawing-mode', modePayload, transitionId);
    }
    verifyRuntimeProduct(productId, transitionId);
  }

  function verifyRuntimeProduct(productId, transitionId) {
    window.setTimeout(() => {
      if (transitionId !== activeTransitionId || productId !== activeProductId || !isEmbeddedProduct(productId)) return;
      const bridge = runtimeBridge();
      if (!bridge || typeof bridge.snapshot !== 'function') return;
      try {
        const snapshot = bridge.snapshot();
        const actual = canonicalProductGroup(snapshot && snapshot.modelState && snapshot.modelState.productGroup);
        const expected = PRODUCT_TO_GROUP[productId];
        if (actual !== expected) hardReloadRuntime(`product-settle-mismatch-${actual || 'empty'}-to-${expected}`, productId);
      } catch (_) {}
    }, 140);
  }

  function dispatchPendingRuntimeAction(productId, productGroup, transitionId) {
    const pending = pendingRuntimeAction;
    if (!pending || pending.transitionId !== transitionId || pending.productId !== productId || pending.productGroup !== productGroup) return false;
    pendingRuntimeAction = null;
    const action = pending.action || {};
    if (action.type === 'quick-test') {
      const payload = { index: Number(action.index) || 0, productId, productGroup };
      if (!directRuntimeCommand('apply-quick-test', payload, transitionId)) post('apply-quick-test', payload, transitionId);
      return true;
    }
    return false;
  }
  function switchWorkspaceMode(value, options) {
    const opts = options || {};
    lifecycleDiagnostics.modeSwitchCount += 1;
    const target = String(value || '').toLowerCase() === '2d' ? '2d' : '3d';
    if (activeProductId === 'PERGO_RISE') {
      activeWorkspaceMode = '2d';
      syncProductUI(activeProductId);
      return target === '2d';
    }
    if (!isEmbeddedProduct(activeProductId)) return false;
    if (target === '2d' && !supportsTechnical2D(activeProductId)) return false;
    let captured = null;
    if (target === '3d' && activeWorkspaceMode === '2d') {
      captured = applySharedMainInputsToCanonical({ source: 'unified-workspace:mode-switch-2d-to-3d', silent: false });
    }
    if (target === '2d') {
      const bridge = runtimeBridge();
      try {
        captured = bridge && typeof bridge.snapshot === 'function' ? bridge.snapshot() : null;
        const group = canonicalProductGroup(captured && captured.modelState && captured.modelState.productGroup);
        if (!snapshotBelongsToProduct(activeProductId, captured) || PRODUCT_TO_GROUP[activeProductId] !== group) captured = null;
        else { persistSnapshot(activeProductId, group, captured, 'unified-workspace:mode-switch-snapshot'); syncSharedMainInputsFromSnapshot(captured); }
      } catch (_) { captured = null; }
    }
    activeWorkspaceMode = target;
    void setHostPreviewExpanded(false, { notifyRuntime: false });
    syncProductUI(activeProductId);
    syncProjectMetadataForProduct(activeProductId);
    if (target === '2d') {
      ensureFrame();
      // Stage 9: 2D is a presentation mode, but the hidden 3D runtime must not keep
      // its state polling / render loop active. Canonical state remains in modelState.
      if (!directRuntimeCommand('set-runtime-active', { active: false }, activeTransitionId)) post('set-runtime-active', { active: false }, activeTransitionId);
      if (!directRuntimeCommand('set-drawing-mode', { mode: '2d' }, activeTransitionId)) post('set-drawing-mode', { mode: '2d' }, activeTransitionId);
      // V14.24: mode switching is a real presentation transition, so activate and
      // populate the shared Technical2D workspace immediately.  Waiting for a later
      // runtime notification left the real host preview inactive even though the
      // internal projection contract was valid.
      if (captured && snapshotBelongsToProduct(activeProductId, captured)) renderTechnical2D(captured, { fit: true });
      else if (!settleRuntimeSnapshot(activeProductId, activeTransitionId, { fit: true })) renderTechnical2D(null, { fit: true });
    } else {
      ensureFrame();
      if (!directRuntimeCommand('set-runtime-active', { active: true }, activeTransitionId)) post('set-runtime-active', { active: true }, activeTransitionId);
      if (!directRuntimeCommand('set-drawing-mode', { mode: '3d' }, activeTransitionId)) post('set-drawing-mode', { mode: '3d' }, activeTransitionId);
      if (!directRuntimeCommand('viewport-resized', {}, activeTransitionId)) post('viewport-resized', {}, activeTransitionId);
    }
    if (opts.persist !== false) dispatchWorkspace({ activeProductId, activeMode: target, p3dv: { productId: activeProductId, productGroup: PRODUCT_TO_GROUP[activeProductId] } }, `unified-workspace:mode-${target}`);
    try { window.dispatchEvent(new CustomEvent('plmr:workspace-mode-changed', { detail: { productId: activeProductId, mode: target, transitionId: activeTransitionId, source: opts.source || 'mode-switch' } })); } catch (_) {}
    return true;
  }

  function transitionProduct(value, options) {
    const opts = options || {};
    lifecycleDiagnostics.transitionCount += 1;
    const productId = canonicalProduct(value);
    if (productId !== 'PERGO_RISE' && !isEmbeddedProduct(productId)) return productId;
    const previousProductId = activeProductId;
    const manualProductChange = previousProductId !== productId && !opts.restoring && !opts.initial && !opts.projectBoundary;
    activeTransitionId += 1;
    const transitionId = activeTransitionId;
    if (opts.capturePrevious !== false && !opts.restoring && !opts.projectBoundary) captureCurrent3DBeforeSwitch(previousProductId);
    activeProductId = productId;
    activeWorkspaceMode = productId === 'PERGO_RISE' ? '2d' : ((opts.mode === '2d' && supportsTechnical2D(productId)) ? '2d' : '3d');
    restorePending = null;
    void setHostPreviewExpanded(false, { notifyRuntime: false });
    syncProductUI(productId);
    if (manualProductChange) clearSharedMainInputs();
    syncProjectMetadataForProduct(productId);
    try { sessionStorage.setItem('plmr_selected_product', productId); } catch (_) {}

    if (isEmbeddedProduct(productId)) {
      // Main-product transitions are hard ownership boundaries. Reboot the P3DV
      // subruntime into the requested canonical group instead of relying on a
      // late message to mutate a Galaxy-default boot. The iframe DOM stays the
      // same; only its product-owned document is retargeted.
      if (isEmbeddedProduct(previousProductId) && previousProductId !== productId) retargetFrameForProduct(productId, 'main-product-transition', transitionId);
      else ensureFrame();
      if (!directRuntimeCommand('set-runtime-active', { active: true }, transitionId)) post('set-runtime-active', { active: true }, transitionId);
      issueRuntimeCommand(productId, transitionId, { forceFresh: manualProductChange || opts.forceFresh === true, reason: opts.reason || 'activate' });
      if (activeWorkspaceMode === '2d') {
        if (!directRuntimeCommand('set-runtime-active', { active: false }, transitionId)) post('set-runtime-active', { active: false }, transitionId);
        if (!settleRuntimeSnapshot(productId, transitionId, { fit: true })) renderTechnical2D(null, { fit: true });
      }
      if (opts.persist !== false) dispatchWorkspace({ activeProductId: productId, activeMode: activeWorkspaceMode, p3dv: { productId, productGroup: PRODUCT_TO_GROUP[productId] } }, `unified-workspace:activate-${activeWorkspaceMode}`);
    } else {
      if (frameReady) {
        if (!directRuntimeCommand('set-runtime-active', { active: false }, transitionId)) post('set-runtime-active', { active: false }, transitionId);
      }
      if (opts.persist !== false) dispatchWorkspace({ activeProductId: 'PERGO_RISE', activeMode: '2d' }, 'unified-workspace:activate-2d');
      if (root.PulumurPreviewShell && typeof root.PulumurPreviewShell.refresh === 'function') {
        requestAnimationFrame(() => root.PulumurPreviewShell.refresh(true));
      }
    }

    try { window.dispatchEvent(new CustomEvent('plmr:active-product-changed', { detail: { productId, previousProductId, transitionId, mode: isEmbeddedProduct(productId) ? activeWorkspaceMode : '2d', reason: opts.reason || 'activate' } })); } catch (_) {}
    return productId;
  }
  function restoreFromProject(event) {
    lifecycleDiagnostics.projectRestoreCount += 1;
    const detailModel = event && event.detail && event.detail.model;
    const workspaces = detailModel && detailModel.workspaces || workspaceModel();
    const raw = workspaces && workspaces.activeProductId;
    const productId = workspaceProductOwner(workspaces);
    // Project boundary: never write the outgoing runtime snapshot into the incoming project.
    resetProjectTransitionCaches();
    const restoredMode = workspaces && workspaces.activeMode === '2d' && supportsTechnical2D(productId) ? '2d' : undefined;
    transitionProduct(productId, { persist: false, restoring: true, capturePrevious: false, mode: restoredMode, reason: 'project-restore' });
  }
  function handleSensitiveProjectClear() {
    lifecycleDiagnostics.sensitiveClearCount += 1;
    resetProjectTransitionCaches();
    void setHostPreviewExpanded(false, { notifyRuntime: false });
    transitionProduct(DEFAULT_PRODUCT_ID, { persist: false, forceFresh: true, projectBoundary: true, capturePrevious: false, reason: 'project-sensitive-state-cleared' });
  }
  function receiveRuntimeMessage(event) {
    const frame = $('p3dvRuntimeFrame');
    if (!frame || event.source !== frame.contentWindow || !originAccepted(event.origin)) return;
    const message = event.data || {};
    if (message.schema !== 'plmr-p3dv-runtime-message-v1' || message.source !== RUNTIME_SOURCE) return;
    const messageTransitionId = Number(message.transitionId || 0);
    if (message.type === 'ready') {
      const readyPayload = message.payload || {};
      if (readyPayload.hostContract !== RUNTIME_CONTRACT || readyPayload.build !== RUNTIME_BUILD) {
        hardReloadRuntime('ready-contract-mismatch');
        return;
      }
      const readyGroup = canonicalProductGroup(readyPayload.productGroup || '');
      const expectedReadyGroup = PRODUCT_TO_GROUP[activeProductId] || '';
      if (expectedReadyGroup && readyGroup !== expectedReadyGroup) {
        hardReloadRuntime(`ready-product-mismatch-${readyGroup || 'empty'}-to-${expectedReadyGroup}`, activeProductId);
        return;
      }
      runtimeReloadAttempts = 0;
      lifecycleDiagnostics.runtimeReadyCount += 1;
      frameReady = true;
      const frameNode = $('p3dvRuntimeFrame');
      if (frameNode) frameNode.dataset.bootProductGroup = canonicalProductGroup(readyPayload.productGroup || '') || frameNode.dataset.bootProductGroup || '';
      const active3D = isEmbeddedProduct(activeProductId) && activeWorkspaceMode === '3d';
      if (!directRuntimeCommand('set-runtime-active', { active: active3D }, activeTransitionId)) post('set-runtime-active', { active: active3D }, activeTransitionId);
      if (isEmbeddedProduct(activeProductId)) {
        issueRuntimeCommand(activeProductId, activeTransitionId, { reason: 'runtime-ready' });
        if (activeWorkspaceMode === '2d') {
          if (!directRuntimeCommand('set-runtime-active', { active: false }, activeTransitionId)) post('set-runtime-active', { active: false }, activeTransitionId);
        }
      }
      return;
    }
    if (message.type === 'preview-expanded') {
      const payload = message.payload || {};
      // A native fullscreen owned by the iframe already removes browser chrome/taskbar;
      // do not request a second parent fullscreen or apply CSS fallback on top of it.
      if (payload.nativeFullscreen === true) {
        setHostPreviewExpandedVisual(false);
        return;
      }
      if (!messageTransitionId || messageTransitionId === activeTransitionId) void setHostPreviewExpanded(Boolean(payload.expanded));
      return;
    }
    if (message.type === 'request-workspace-mode') {
      if (messageTransitionId && messageTransitionId !== activeTransitionId) return;
      const payload = message.payload || {};
      switchWorkspaceMode(payload.mode, { source: 'p3dv-mode-switch' });
      return;
    }
    if (message.type === 'fullscreen-error') {
      const payload = message.payload || {};
      document.body.dataset.p3dvFullscreenError = String(payload.name || payload.message || 'FULLSCREEN_REJECTED');
      setHostPreviewExpandedVisual(false);
      return;
    }
    if (message.type === 'request-product-transition') {
      // Embedded P3DV is not allowed to become a second main-product owner. Any
      // inner selector / quick-test request is routed back through the same host
      // authorization path used by the visible Product dropdown.
      if (messageTransitionId && messageTransitionId !== activeTransitionId) return;
      const payload = message.payload || {};
      const targetGroup = String(payload.productGroup || '');
      const targetProductId = GROUP_TO_PRODUCT[canonicalProductGroup(targetGroup)];
      const router = root.PulumurProductRouter;
      if (!targetProductId || !router || typeof router.requestProduct !== 'function') return;
      router.requestProduct(targetProductId, {
        source: 'p3dv-runtime',
        requestId: `p3dv-runtime-${Date.now()}-${activeTransitionId + 1}`,
        runtimeAction: payload.action && typeof payload.action === 'object' ? clone(payload.action) : null
      });
      return;
    }
    if (messageTransitionId && messageTransitionId !== activeTransitionId) return;
    if (message.type === 'state-changed' || message.type === 'snapshot') {
      const payload = message.payload || {};
      const snapshot = payload.snapshot;
      const productGroup = canonicalProductGroup(payload.productGroup || snapshot && snapshot.modelState && snapshot.modelState.productGroup || '');
      const productId = GROUP_TO_PRODUCT[productGroup];
      if (!productId || productId !== activeProductId || PRODUCT_TO_GROUP[activeProductId] !== productGroup || !snapshot) return;
      persistSnapshot(productId, productGroup, snapshot, 'p3dv-runtime:state');
      if (activeWorkspaceMode === '2d' && supportsTechnical2D(productId)) renderTechnical2D(snapshot, { fit: false });
      try { window.dispatchEvent(new CustomEvent('plmr:workspace-dirty', { detail: { productId, mode: activeWorkspaceMode } })); } catch (_) {}
      try { window.dispatchEvent(new CustomEvent('plmr:product-transition-settled', { detail: { productId, productGroup, transitionId: activeTransitionId, mode: activeWorkspaceMode } })); } catch (_) {}
      dispatchPendingRuntimeAction(productId, productGroup, activeTransitionId);
      return;
    }
    if (message.type === 'runtime-error') {
      const payload = message.payload || {};
      // If an old/corrupt snapshot cannot be restored, immediately fall back to the
      // canonical product instead of leaving the iframe on the previous product.
      if ((payload.operation === 'restore-snapshot' || payload.operation === 'activate-product') && isEmbeddedProduct(activeProductId) && (!messageTransitionId || messageTransitionId === activeTransitionId)) {
        restorePending = null;
        post('set-product', { productId: activeProductId, productGroup: PRODUCT_TO_GROUP[activeProductId], reason: 'snapshot-restore-fallback' }, activeTransitionId);
        return;
      }
      console.error('P3DV runtime error', payload);
    }
  }
  function handleModeButtonClick(event) {
    const button = event && event.currentTarget;
    if (!button || button.disabled) { if (event) event.preventDefault(); return; }
    const targetMode = button.id === 'workspace2DBtn' ? '2d' : '3d';
    switchWorkspaceMode(targetMode, { source: button.id === 'technical2DTo3DBtn' ? 'technical2d-mode-switch' : 'header-mode-switch' });
  }
  function bindModeButtons() {
    if (modeButtonsBound) return;
    modeButtonsBound = true;
    lifecycleDiagnostics.modeButtonBindCount += 1;
    const two = $('workspace2DBtn');
    const three = $('workspace3DBtn');
    const technicalReturn = $('technical2DTo3DBtn');
    if (two) two.addEventListener('click', handleModeButtonClick);
    if (three) three.addEventListener('click', handleModeButtonClick);
    if (technicalReturn) technicalReturn.addEventListener('click', handleModeButtonClick);
  }
  function unbindModeButtons() {
    if (!modeButtonsBound) return;
    modeButtonsBound = false;
    lifecycleDiagnostics.modeButtonUnbindCount += 1;
    const two = $('workspace2DBtn');
    const three = $('workspace3DBtn');
    const technicalReturn = $('technical2DTo3DBtn');
    if (two) two.removeEventListener('click', handleModeButtonClick);
    if (three) three.removeEventListener('click', handleModeButtonClick);
    if (technicalReturn) technicalReturn.removeEventListener('click', handleModeButtonClick);
  }
  function onAuthorized(event) {
    const detail = event && event.detail || {};
    const adapter = detail.adapter;
    if (!adapter || adapter.manifest && adapter.manifest.navigation && adapter.manifest.navigation.opensDedicatedPage) return;
    transitionProduct(adapter.id, { reason: detail.requestId || 'product-selector' });
    if (detail.runtimeAction && isEmbeddedProduct(adapter.id)) {
      pendingRuntimeAction = {
        transitionId: activeTransitionId,
        productId: adapter.id,
        productGroup: PRODUCT_TO_GROUP[adapter.id],
        action: clone(detail.runtimeAction)
      };
    } else pendingRuntimeAction = null;
  }
  function init() {
    if (initialized || destroyed) return;
    lifecycleDiagnostics.initCount += 1;
    ensureTechnical2DCommandRegistration();
    bindModeButtons();
    bindSharedMainInputEvents();
    document.addEventListener('plmr:product-authorized', onAuthorized);
    window.addEventListener('message', receiveRuntimeMessage);
    window.addEventListener('plmr:project-restored', restoreFromProject);
    window.addEventListener('plmr:project-sensitive-state-cleared', handleSensitiveProjectClear);
    if (!fullscreenListenerBound) {
      document.addEventListener('fullscreenchange', handleHostFullscreenChange);
      document.addEventListener('webkitfullscreenchange', handleHostFullscreenChange);
      document.addEventListener('fullscreenerror', handleHostFullscreenError);
      document.addEventListener('webkitfullscreenerror', handleHostFullscreenError);
      fullscreenListenerBound = true;
    }
    const state = projectState();
    if (state && typeof state.subscribe === 'function') unsubscribeProject = state.subscribe(() => {});
    const initialWorkspaces = workspaceModel();
    const initialRaw = initialWorkspaces && initialWorkspaces.activeProductId;
    const initialProductId = workspaceProductOwner(initialWorkspaces);
    const initialMode = initialWorkspaces && initialWorkspaces.activeMode === '2d' && supportsTechnical2D(initialProductId) ? '2d' : undefined;
    const initialP3dv = initialWorkspaces && initialWorkspaces.p3dv;
    const hasProjectSelection = Boolean(initialRaw || initialP3dv && (initialP3dv.productId || initialP3dv.productGroup || initialP3dv.snapshot || Object.keys(initialP3dv.snapshots || {}).length));
    transitionProduct(hasProjectSelection ? initialProductId : DEFAULT_PRODUCT_ID, { persist: !hasProjectSelection, initial: true, restoring: Boolean(hasProjectSelection), capturePrevious: false, mode: initialMode, reason: hasProjectSelection ? 'initial-project-state' : 'initial-default' });
    initialized = true;
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    lifecycleDiagnostics.destroyCount += 1;
    if (typeof unregisterTechnical2DCommand === 'function') unregisterTechnical2DCommand();
    unregisterTechnical2DCommand = null;
    if (typeof unsubscribeProject === 'function') unsubscribeProject();
    unsubscribeProject = null;
    unbindModeButtons();
    unbindSharedMainInputEvents();
    document.removeEventListener('plmr:product-authorized', onAuthorized);
    window.removeEventListener('message', receiveRuntimeMessage);
    window.removeEventListener('plmr:project-restored', restoreFromProject);
    window.removeEventListener('plmr:project-sensitive-state-cleared', handleSensitiveProjectClear);
    if (fullscreenListenerBound) {
      document.removeEventListener('fullscreenchange', handleHostFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleHostFullscreenChange);
      document.removeEventListener('fullscreenerror', handleHostFullscreenError);
      document.removeEventListener('webkitfullscreenerror', handleHostFullscreenError);
      fullscreenListenerBound = false;
    }
  }

  function lifecycleSnapshot() {
    const workspaces = workspaceModel();
    const p3dv = workspaces && workspaces.p3dv && typeof workspaces.p3dv === 'object' ? workspaces.p3dv : {};
    const frame = $('p3dvRuntimeFrame');
    return {
      ...lifecycleDiagnostics,
      activeProductId, activeWorkspaceMode, activeTransitionId, projectEpoch, frameReady,
      modeButtonsBound, fullscreenListenerBound, sharedMainInputBound, initialized, destroyed,
      runtimeReloadAttempts, frameBootProductGroup: frame && frame.dataset.bootProductGroup || '',
      frameRuntimeLoaded: Boolean(frame && frame.dataset.runtimeLoaded),
      snapshotKeyCount: Object.keys(p3dv.snapshots && typeof p3dv.snapshots === 'object' ? p3dv.snapshots : {}).length
    };
  }

  const api = Object.freeze({
    RELEASE,
    activateProduct: transitionProduct,
    setMode: switchWorkspaceMode,
    syncProductUI: () => syncProductUI(activeProductId),
    restoreFromProject,
    getActiveProduct: () => activeProductId,
    getMode: () => activeWorkspaceMode,
    getLifecycleDiagnostics: lifecycleSnapshot,
    getFrame: () => $('p3dvRuntimeFrame'),
    getCanonicalSnapshot: () => productSnapshotFor(activeProductId),
    getTechnical2DProjection: () => root.PulumurTechnical2DWorkspace && root.PulumurTechnical2DWorkspace.getLastProjection ? root.PulumurTechnical2DWorkspace.getLastProjection() : null,
    isTechnical2DActive: () => activeWorkspaceMode === '2d' && supportsTechnical2D(activeProductId),
    refreshTechnical2D: (options) => renderTechnical2D(null, options || { fit: false }),
    getSharedMainInput: () => clone(sharedMainInputPayload()),
    applySharedMainInput: (options) => applySharedMainInputsToCanonical(options || {}),
    executeTechnical2DCommand,
    getTechnical2DHistory,
    syncTechnical2DHistoryControls,
    undoTechnical2DHistory,
    redoTechnical2DHistory,
    getTransitionState: () => Object.freeze({ activeProductId, transitionId: activeTransitionId, frameReady, projectEpoch, runtimeBuild: RUNTIME_BUILD, runtimeContract: RUNTIME_CONTRACT, runtimeReloadAttempts, pending: restorePending ? clone(restorePending) : null, runtimeAction: pendingRuntimeAction ? clone(pendingRuntimeAction) : null }),
    request3DPreviewExpanded: (expanded, options) => setHostPreviewExpanded(expanded, options),
    destroy
  });
  root.PulumurUnifiedWorkspace = api;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})(typeof window !== 'undefined' ? window : globalThis);
