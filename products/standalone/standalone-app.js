(function () {
  'use strict';

  const registry = window.PulumurProductRegistry;
  const model = window.PulumurStandaloneProject;
  const layout = window.PulumurStandaloneLayout;
  const exporter = window.PulumurStandaloneExport;
  const $ = id => document.getElementById(id);
  const selected = new Set();
  let project;
  let drawing = null;
  let editingId = null;
  let applyOptionType = 'SLIDING';
  let autoDrawTimer = null;
  let commonDraftDirty = false;
  const COMMON_SETTINGS_STORAGE_KEY = 'plmr.standalone.commonSettings.v1';

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function requestedProduct() {
    let stored = '';
    try { stored = sessionStorage.getItem('plmr_selected_product') || ''; } catch (_) { stored = ''; }
    let query = '';
    try { query = new URLSearchParams(location.search).get('product') || ''; } catch (_) { query = ''; }
    return registry.resolveId(window.__PLMR_TEST_PRODUCT__ || query || stored || 'SLIDING');
  }

  function setStatus(message, error) {
    $('status').textContent = message || '';
    $('status').classList.toggle('error', Boolean(error));
  }

  function safeName(value) {
    return String(value || 'plmr-proje').replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü_-]+/g, '-');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function download(name, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 600);
  }

  function productAdapters() {
    return registry.listProducts({ capability: 'standaloneDrawing' }).filter(item => model.PRODUCT_IDS.includes(item.id));
  }

  function fillProductSelect(select, includeEmpty) {
    select.innerHTML = includeEmpty ? '<option value="">Ürünü koru</option>' : '';
    productAdapters().forEach(adapter => {
      const option = document.createElement('option');
      option.value = adapter.id;
      option.textContent = adapter.label;
      select.appendChild(option);
    });
  }

  function syncProjectInfoFromHeader() {
    ['customerName', 'projectName', 'projectCode', 'revision', 'designer'].forEach(key => { project.projectInfo[key] = $(key).value.trim(); });
    project.projectInfo.date = $('projectDate').value || '';
  }

  function layoutValueForProject() {
    const mode = String(project.layout && project.layout.mode || 'AUTO').toUpperCase();
    if (mode === 'AUTO') return 'AUTO';
    if (mode === 'ONE_COLUMN') return 'COLUMNS_1';
    if (mode === 'TWO_COLUMNS') return 'COLUMNS_2';
    const count = Math.max(1, Math.min(10, Number(project.layout && project.layout.columnCount) || 2));
    return `COLUMNS_${count}`;
  }

  function parseLayoutSelection(value) {
    if (value === 'AUTO') return { mode: 'AUTO', columnCount: 2 };
    const match = String(value || '').match(/^COLUMNS_(\d+)$/);
    const columnCount = Math.max(1, Math.min(10, Number(match && match[1]) || 2));
    return { mode: 'MANUAL', columnCount };
  }

  function fillLayoutModeSelect() {
    const select = $('layoutMode');
    select.innerHTML = '<option value="AUTO">Otomatik · En fazla 2 sütun</option>';
    for (let count = 1; count <= 10; count += 1) {
      const option = document.createElement('option');
      option.value = `COLUMNS_${count}`;
      option.textContent = count === 1 ? '1 sütun' : `${count} sütun`;
      select.appendChild(option);
    }
  }

  function setCommonDraftState(message) {
    const status = $('commonSettingsStatus');
    const button = $('saveCommonSettingsBtn');
    if (status) {
      status.textContent = message || (commonDraftDirty ? 'Kaydedilmedi' : 'Kaydedildi');
      status.classList.toggle('dirty', commonDraftDirty);
      status.classList.toggle('saved', !commonDraftDirty);
    }
    if (button) {
      button.classList.toggle('is-dirty', commonDraftDirty);
      button.classList.toggle('is-clean', !commonDraftDirty);
    }
  }

  function markCommonDraftDirty(message) {
    commonDraftDirty = true;
    setCommonDraftState(message || 'Kaydedilmedi');
  }

  function savedDefaultProductType() {
    return registry.resolveId(project.commonSettings && project.commonSettings.defaultProductType || requestedProduct());
  }

  function syncCommonPanelFromProject() {
    $('commonColor').value = project.commonSettings.color || 'NATURAL';
    $('commonGlass').value = project.commonSettings.glassType || 'CLEAR';
    $('generalDescription').value = project.commonSettings.generalDescription || '';
    $('expandQuantity').checked = Boolean(project.commonSettings.expandQuantity);
    $('layoutMode').value = layoutValueForProject();
    $('productType').value = savedDefaultProductType();
    renderCommonOptions();
    commonDraftDirty = false;
    setCommonDraftState('Kaydedildi');
  }

  function syncHeaderFromProject() {
    ['customerName', 'projectName', 'projectCode', 'revision', 'designer'].forEach(key => { $(key).value = project.projectInfo[key] || ''; });
    $('projectDate').value = project.projectInfo.date || '';
    syncCommonPanelFromProject();
  }

  function applyCommonSettings(options) {
    const config = { quiet: false, ...(options || {}) };
    const type = registry.resolveId($('productType').value || requestedProduct());
    project.commonSettings.defaultProductType = type;
    project.commonSettings.color = $('commonColor').value;
    project.commonSettings.glassType = $('commonGlass').value;
    project.commonSettings.generalDescription = $('generalDescription').value.trim();
    project.commonSettings.expandQuantity = $('expandQuantity').checked;
    const layoutState = parseLayoutSelection($('layoutMode').value);
    project.layout.mode = layoutState.mode;
    project.layout.columnCount = layoutState.columnCount;
    const normalized = model.setCommonDefaults(project, type, readOptionFields($('commonProductOptions'), false));
    renderOptionFields($('commonProductOptions'), type, normalized, false);
    commonDraftDirty = false;
    setCommonDraftState('Kaydedildi');
    drawing = null;
    renderTable();
    scheduleDraw(0);
    if (!config.quiet) setStatus(`${registry.requireProduct(type).label} ortak ayarları kaydedildi.`);
  }

  function readPanelState() {
    try {
      const raw = localStorage.getItem(COMMON_SETTINGS_STORAGE_KEY);
      if (!raw) return { open: true, pinned: false };
      const parsed = JSON.parse(raw);
      return { open: parsed.open !== false, pinned: Boolean(parsed.pinned) };
    } catch (_) { return { open: true, pinned: false }; }
  }

  function writePanelState(state) {
    try { localStorage.setItem(COMMON_SETTINGS_STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* no-op */ }
  }

  function applyPanelState(state) {
    const body = $('commonSettingsBody');
    const expand = $('commonSettingsExpand');
    const pin = $('commonSettingsPin');
    const open = state.pinned ? true : state.open !== false;
    body.classList.toggle('is-collapsed', !open);
    expand.textContent = open ? '▾' : '▸';
    expand.setAttribute('aria-expanded', String(open));
    pin.setAttribute('aria-pressed', String(Boolean(state.pinned)));
  }

  function togglePanelOpen() {
    const state = readPanelState();
    if (state.pinned) { applyPanelState(state); return; }
    state.open = !state.open;
    writePanelState(state);
    applyPanelState(state);
  }

  function togglePanelPin() {
    const state = readPanelState();
    state.pinned = !state.pinned;
    if (state.pinned) state.open = true;
    writePanelState(state);
    applyPanelState(state);
  }

  function fieldHtml(field, value, allowBlank) {
    const name = field.key;
    const blank = allowBlank ? '<option value="">Değiştirme</option>' : '';
    if (field.type === 'number') {
      const numeric = allowBlank ? '' : value;
      return `<label>${field.label}<input name="${name}" data-option-key="${name}" type="number" ${field.min ? `min="${field.min}"` : ''} ${field.max ? `max="${field.max}"` : ''} value="${escapeHtml(numeric == null ? '' : numeric)}" placeholder="${allowBlank ? 'Değiştirme' : ''}" /></label>`;
    }
    if (field.type === 'text') {
      const textValue = allowBlank ? '' : value;
      return `<label>${field.label}<input name="${name}" data-option-key="${name}" type="text" value="${escapeHtml(textValue == null ? '' : textValue)}" placeholder="${allowBlank ? 'Değiştirme' : 'Örn: 1200;1200'}" /></label>`;
    }
    const values = field.values || [];
    const custom = field.type === 'select-custom';
    const known = values.includes(value);
    const selectedValue = custom && value && !known ? 'OTHER' : value;
    const options = values.map(item => `<option value="${escapeHtml(item)}" ${String(item) === String(selectedValue) ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('');
    const customValue = custom && value && !known ? value : '';
    return `<label>${field.label}<select name="${name}" data-option-key="${name}" ${custom ? 'data-custom-select="true"' : ''}>${blank}${options}</select>${custom ? `<input class="custom-option" name="${name}Custom" data-custom-for="${name}" value="${escapeHtml(customValue)}" placeholder="Özel değer" ${selectedValue === 'OTHER' ? '' : 'hidden'} />` : ''}</label>`;
  }

  function renderOptionFields(container, productType, values, allowBlank) {
    const fields = model.optionDefinitions(productType);
    container.dataset.productType = productType;
    container.innerHTML = fields.map(field => fieldHtml(field, values && values[field.key], allowBlank)).join('');
    container.querySelectorAll('[data-custom-select="true"]').forEach(select => {
      const toggle = () => {
        const input = container.querySelector(`[data-custom-for="${CSS.escape(select.name)}"]`);
        if (input) input.hidden = select.value !== 'OTHER';
      };
      select.addEventListener('change', toggle);
      toggle();
    });
  }

  function readOptionFields(container, allowBlank) {
    const result = {};
    model.optionDefinitions(container.dataset.productType).forEach(field => {
      const control = container.querySelector(`[name="${CSS.escape(field.key)}"]`);
      if (!control || (allowBlank && control.value === '')) return;
      let value = control.value;
      if (field.type === 'number') value = Number(value);
      if (field.type === 'select-custom' && value === 'OTHER') {
        const custom = container.querySelector(`[name="${CSS.escape(field.key)}Custom"]`);
        value = String(custom && custom.value || 'OTHER').trim().toUpperCase() || 'OTHER';
      }
      result[field.key] = value;
    });
    return result;
  }

  function renderCommonOptions() {
    const type = registry.resolveId($('productType').value || savedDefaultProductType());
    renderOptionFields($('commonProductOptions'), type, model.commonDefaults(project, type), false);
  }

  function rowHtml(position, index, errors) {
    const invalid = errors.some(item => item.id === position.id);
    const products = productAdapters().map(item => `<option value="${item.id}" ${item.id === position.productType ? 'selected' : ''}>${item.label}</option>`).join('');
    const resolved = model.resolveOptions(project, position);
    const summary = layout.optionSummary(position, resolved) || 'Varsayılan seçenekler';
    return `<tr data-id="${position.id}" class="${selected.has(position.id) ? 'selected ' : ''}${invalid ? 'invalid' : ''}">
      <td><input class="row-select" type="checkbox" ${selected.has(position.id) ? 'checked' : ''} aria-label="${escapeHtml(position.positionNo)} seç" /></td>
      <td><input class="position-no" value="${escapeHtml(position.positionNo)}" /></td>
      <td><select class="row-product">${products}</select></td>
      <td><input ${index === 0 ? 'id="width"' : ''} class="row-width" type="number" min="1" value="${position.width}" /></td>
      <td><input ${index === 0 ? 'id="height"' : ''} class="row-height" type="number" min="1" value="${position.height}" /></td>
      <td><input class="row-quantity" type="number" min="1" value="${position.quantity}" /></td>
      <td class="summary" title="${escapeHtml(summary)}">${escapeHtml(summary)}</td>
      <td><input class="row-description" value="${escapeHtml(position.description)}" /></td>
      <td><div class="row-actions"><button type="button" class="detail secondary">Detay</button><button type="button" class="copy secondary">Kopyala</button><button type="button" class="up secondary" title="Yukarı">↑</button><button type="button" class="down secondary" title="Aşağı">↓</button><button type="button" class="remove danger">Sil</button></div></td>
    </tr>`;
  }

  function renderTable(validation) {
    const result = validation || model.validateProject(project);
    $('positionRows').innerHTML = project.positions.map((position, index) => rowHtml(position, index, result.errors)).join('');
    $('positionCount').textContent = `${project.positions.length} poz`;
    $('selectedCount').textContent = selected.size;
    $('selectAll').checked = selected.size === project.positions.length && project.positions.length > 0;
    $('selectAll').indeterminate = selected.size > 0 && selected.size < project.positions.length;
    $('validationSummary').hidden = result.valid;
    $('validationSummary').textContent = result.errors.map(item => `• ${item.message}`).join('\n');
    highlightPreviewSelection();
  }

  function findRow(target) {
    const row = target.closest('tr[data-id]');
    return row ? project.positions.find(item => item.id === row.dataset.id) : null;
  }

  function updateFromCell(target, position) {
    if (target.classList.contains('position-no')) position.positionNo = target.value.trim();
    if (target.classList.contains('row-width')) position.width = Number(target.value);
    if (target.classList.contains('row-height')) position.height = Number(target.value);
    if (target.classList.contains('row-quantity')) position.quantity = Number(target.value);
    if (target.classList.contains('row-description')) position.description = target.value;
    if (target.classList.contains('row-product')) {
      const reset = model.changeProduct(project, position, target.value);
      setStatus(reset.length ? `${position.positionNo}: Ürün değişti; ${reset.length} uyumsuz seçenek temizlendi.` : `${position.positionNo} ürünü değiştirildi.`);
    }
    drawing = null;
  }

  function updateValidationDisplay(result) {
    const invalidIds = new Set(result.errors.map(item => item.id).filter(Boolean));
    document.querySelectorAll('#positionRows tr[data-id]').forEach(row => {
      row.classList.toggle('invalid', invalidIds.has(row.dataset.id));
    });
    $('positionCount').textContent = `${project.positions.length} poz`;
    $('selectedCount').textContent = selected.size;
    $('validationSummary').hidden = result.valid;
    $('validationSummary').textContent = result.errors.map(item => `• ${item.message}`).join('\n');
  }

  function validate(showStatus, renderValidation = true) {
    syncProjectInfoFromHeader();
    const result = model.validateProject(project);
    if (renderValidation) renderTable(result);
    else updateValidationDisplay(result);
    if (showStatus) setStatus(result.valid ? `${project.positions.length} poz doğrulandı.` : result.errors[0].message, !result.valid);
    return result;
  }

  function highlightPreviewSelection() {
    document.querySelectorAll('#preview [data-placement-id]').forEach(element => {
      element.classList.toggle('position-selected', selected.has(element.getAttribute('data-placement-id')));
    });
  }

  function selectPosition(id, additive) {
    if (!additive) selected.clear();
    if (id) selected.add(id);
    renderTable();
    const row = document.querySelector(`#positionRows tr[data-id="${CSS.escape(id)}"]`);
    if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function isPreviewAccentLayer(name) {
    return /(TEXT|TITLE|DIM|ÖLÇÜ|PLMR_POZ_TEXT)/i.test(String(name || ''));
  }

  function buildPreviewDrawing(source) {
    const preview = clone(source);
    const layerStyle = preview.layerStyle || {};
    preview.layerStyle = Object.fromEntries(Object.keys(layerStyle).map(name => {
      const style = layerStyle[name] || {};
      return [name, { ...style, stroke: isPreviewAccentLayer(name) ? '#c00000' : '#000000' }];
    }));
    preview.entities = (preview.entities || []).map(entity => {
      if (!entity || entity.type === 'interaction') return entity;
      if (entity.type === 'text' || entity.type === 'mtext' || isPreviewAccentLayer(entity.layer)) return { ...entity, color: 1 };
      return { ...entity, color: 7 };
    });
    return preview;
  }

  function draw(options) {
    const config = { quiet: false, renderValidation: true, ...(options || {}) };
    const result = validate(false, config.renderValidation);
    if (!result.valid) {
      drawing = null;
      $('previewMeta').textContent = 'Geçerli ölçü bekleniyor';
      if (!config.quiet) setStatus('Çizim oluşturulamadı. Hatalı pozları düzeltin.', true);
      return null;
    }
    try {
      drawing = layout.buildProjectDrawing(project);
      const previewDrawing = buildPreviewDrawing(drawing);
      $('preview').innerHTML = window.PulumurGeometry.renderSvg(previewDrawing, { width: 1500, height: 1000 });
      $('previewMeta').textContent = `${drawing.positions.length} poz · ${drawing.entities.length} entity · ${drawing.layout.columnCount} sütun`;
      highlightPreviewSelection();
      if (!config.quiet) setStatus(`${drawing.positions.length} poz için üretim çizimi oluşturuldu.`);
      return drawing;
    } catch (error) {
      drawing = null;
      if (!config.quiet) setStatus(error.message || String(error), true);
      return null;
    }
  }

  function scheduleDraw(delay = 140) {
    if (autoDrawTimer) window.clearTimeout(autoDrawTimer);
    autoDrawTimer = window.setTimeout(() => {
      autoDrawTimer = null;
      draw({ quiet: true, renderValidation: false });
    }, Math.max(0, Number(delay) || 0));
  }

  function renderDetail(position) {
    editingId = position.id;
    $('detailTitle').textContent = `${position.positionNo} · ${registry.requireProduct(position.productType).label}`;
    renderOptionFields($('productOptions'), position.productType, model.resolveOptions(project, position), false);
    $('detailDialog').showModal();
  }

  function newPosition(copyLast) {
    syncProjectInfoFromHeader();
    const last = project.positions.at(-1);
    if (copyLast && last) model.copyPosition(project, last.id);
    else {
      const type = last ? last.productType : savedDefaultProductType();
      project.positions.push(model.createPosition(type, { options: last ? last.options : {} }, project.positions, model.commonDefaults(project, type)));
      model.normalizeOrder(project);
    }
    renderTable();
    scheduleDraw(0);
    const width = $('positionRows').querySelector('tr:last-child .row-width');
    if (width) { width.focus(); width.select(); }
  }

  function saveProject() {
    syncProjectInfoFromHeader();
    download(`${safeName(project.projectInfo.projectName)}.plmr`, model.serialize(project), 'application/json;charset=utf-8');
  }

  function openApplyDialog() {
    if (!selected.size) { setStatus('Toplu işlem için en az bir poz seçin.', true); return; }
    const first = project.positions.find(position => selected.has(position.id));
    applyOptionType = $('bulkProduct').value || (first && first.productType) || 'SLIDING';
    $('applyProduct').value = $('bulkProduct').value || '';
    $('applyDescription').value = '';
    renderOptionFields($('applyProductOptions'), applyOptionType, {}, true);
    $('applyDialog').showModal();
  }

  fillProductSelect($('productType'), false);
  fillProductSelect($('bulkProduct'), true);
  fillProductSelect($('applyProduct'), true);
  fillLayoutModeSelect();
  project = model.createProject({ productType: requestedProduct() });
  syncHeaderFromProject();
  applyPanelState(readPanelState());
  renderTable();
  draw();

  $('commonProductOptions').addEventListener('change', () => {
    markCommonDraftDirty();
  });
  $('commonProductOptions').addEventListener('input', () => {
    markCommonDraftDirty();
  });

  $('positionRows').addEventListener('input', event => {
    const position = findRow(event.target);
    if (!position) return;
    updateFromCell(event.target, position);
    scheduleDraw();
  });

  $('positionRows').addEventListener('change', event => {
    const position = findRow(event.target);
    if (!position) return;
    if (event.target.classList.contains('row-select')) {
      event.target.checked ? selected.add(position.id) : selected.delete(position.id);
      renderTable();
    } else {
      updateFromCell(event.target, position);
      if (event.target.classList.contains('row-product')) renderTable();
      else updateValidationDisplay(model.validateProject(project));
      scheduleDraw();
    }
  });

  $('positionRows').addEventListener('click', event => {
    const position = findRow(event.target);
    if (!position) return;
    if (event.target.classList.contains('detail')) renderDetail(position);
    else if (event.target.classList.contains('copy')) { model.copyPosition(project, position.id); drawing = null; renderTable(); scheduleDraw(0); }
    else if (event.target.classList.contains('remove')) {
      project.positions = project.positions.filter(item => item.id !== position.id);
      selected.delete(position.id);
      if (!project.positions.length) { const type = savedDefaultProductType(); project.positions.push(model.createPosition(type, {}, [], model.commonDefaults(project, type))); }
      model.normalizeOrder(project); drawing = null; renderTable(); scheduleDraw(0);
    } else if (event.target.classList.contains('up')) { model.move(project, position.id, -1); drawing = null; renderTable(); scheduleDraw(0); }
    else if (event.target.classList.contains('down')) { model.move(project, position.id, 1); drawing = null; renderTable(); scheduleDraw(0); }
    else if (!event.target.matches('input,select,button')) selectPosition(position.id, event.ctrlKey || event.metaKey);
  });

  $('preview').addEventListener('click', event => {
    const hit = event.target.closest('[data-placement-id]');
    if (!hit) return;
    selectPosition(hit.getAttribute('data-placement-id'), event.ctrlKey || event.metaKey);
    setStatus(`${hit.getAttribute('data-poz-no') || 'Poz'} seçildi.`);
  });

  $('addBtn').addEventListener('click', () => newPosition(false));
  $('copyLastBtn').addEventListener('click', () => newPosition(true));
  $('bulkCreateBtn').addEventListener('click', () => {
    const last = project.positions.at(-1);
    $('bulkWidth').value = last.width;
    $('bulkHeight').value = last.height;
    $('bulkStartNo').value = model.nextPositionNo(project.positions, 'P');
    $('bulkDialog').showModal();
  });
  $('bulkConfirmBtn').addEventListener('click', event => {
    event.preventDefault();
    const last = project.positions.at(-1);
    model.addPositions(project, { ...last, width: Number($('bulkWidth').value), height: Number($('bulkHeight').value) }, Number($('bulkCount').value), $('bulkStartNo').value);
    $('bulkDialog').close(); drawing = null; renderTable(); scheduleDraw(0);
  });
  $('detailSaveBtn').addEventListener('click', event => {
    event.preventDefault();
    const position = project.positions.find(item => item.id === editingId);
    if (position) {
      const result = model.setPositionOptions(project, position, readOptionFields($('productOptions'), false));
      if (result.changes.length) setStatus(`${position.positionNo}: ${result.changes.map(change => change.reason).join(' ')}`);
    }
    $('detailDialog').close(); drawing = null; renderTable(); draw();
  });
  $('selectAll').addEventListener('change', event => {
    selected.clear();
    if (event.target.checked) project.positions.forEach(item => selected.add(item.id));
    renderTable();
  });
  $('applySelectedBtn').addEventListener('click', () => {
    if (!selected.size) { setStatus('En az bir poz seçin.', true); return; }
    const patch = { productType: $('bulkProduct').value || undefined, description: $('bulkDescription').value || undefined };
    const reset = model.applyToSelected(project, [...selected], patch);
    setStatus(reset.length ? `${selected.size} poz güncellendi; uyumsuz ürün seçenekleri temizlendi.` : `${selected.size} poza değer uygulandı.`);
    drawing = null; renderTable(); scheduleDraw(0);
  });
  $('bulkOptionsBtn').addEventListener('click', openApplyDialog);
  $('applyProduct').addEventListener('change', () => {
    const first = project.positions.find(position => selected.has(position.id));
    applyOptionType = $('applyProduct').value || (first && first.productType) || 'SLIDING';
    renderOptionFields($('applyProductOptions'), applyOptionType, {}, true);
  });
  $('applyConfirmBtn').addEventListener('click', event => {
    event.preventDefault();
    const productType = $('applyProduct').value || undefined;
    const options = readOptionFields($('applyProductOptions'), true);
    const description = $('applyDescription').value || undefined;
    let ids = [...selected];
    if (!productType && Object.keys(options).length) ids = ids.filter(id => project.positions.find(position => position.id === id && position.productType === applyOptionType));
    const reset = model.applyToSelected(project, [...selected], { productType, description });
    if (Object.keys(options).length) model.applyToSelected(project, ids, { options });
    $('applyDialog').close(); drawing = null; renderTable(); scheduleDraw(0);
    setStatus(`${selected.size} poz toplu güncellendi${reset.length ? '; uyumsuz seçenekler temizlendi' : ''}.`);
  });
  $('deleteSelectedBtn').addEventListener('click', () => {
    project.positions = project.positions.filter(item => !selected.has(item.id));
    selected.clear();
    if (!project.positions.length) { const type = savedDefaultProductType(); project.positions.push(model.createPosition(type, {}, [], model.commonDefaults(project, type))); }
    model.normalizeOrder(project); drawing = null; renderTable(); scheduleDraw(0);
  });
  $('renumberBtn').addEventListener('click', () => {
    if (model.hasCustomPositionNumbers(project) && !window.confirm('Özel poz numaraları P01, P02 düzeninde değiştirilecek. Devam edilsin mi?')) return;
    model.renumber(project, 'P'); drawing = null; renderTable(); scheduleDraw(0); setStatus('Poz numaraları P01 düzeninde yenilendi.');
  });
  $('validateBtn').addEventListener('click', () => validate(true));
  $('drawBtn').addEventListener('click', () => draw({ quiet: false, renderValidation: true }));
  $('dxfBtn').addEventListener('click', () => {
    const current = draw({ quiet: true, renderValidation: true });
    if (!current) { setStatus('DXF için geçerli çizim oluşturulamadı. Hatalı pozları düzeltin.', true); return; }
    try {
      download(`${safeName(project.projectInfo.projectName)}.dxf`, exporter.exportDxf(current), 'application/dxf;charset=utf-8');
      setStatus('DXF ortak PLMR motoruyla indirildi.');
    } catch (error) { setStatus(error.message, true); }
  });
  $('pdfBtn').addEventListener('click', async () => {
    const current = draw({ quiet: true, renderValidation: true });
    if (!current) { setStatus('PDF için geçerli çizim oluşturulamadı. Hatalı pozları düzeltin.', true); return; }
    try {
      const filename = `${safeName(project.projectInfo.projectName)}.pdf`;
      download(filename, await exporter.exportPdf(project, current), 'application/pdf');
      setStatus(`PDF indirildi: ${filename} (ortak yerel PLMR motoru).`);
    } catch (error) { setStatus(error.message, true); }
  });
  $('saveBtn').addEventListener('click', saveProject);
  $('openInput').addEventListener('change', async event => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      project = model.migrate(await file.text());
      selected.clear(); drawing = null;
      syncHeaderFromProject(); renderTable(); draw();
      setStatus(`${project.positions.length} pozlu proje açıldı.`);
    } catch (error) { setStatus(error.message, true); }
    event.target.value = '';
  });
  $('newProjectBtn').addEventListener('click', () => {
    project = model.createProject({ productType: savedDefaultProductType() });
    selected.clear(); drawing = null;
    syncHeaderFromProject(); renderTable(); draw();
    setStatus('Yeni proje oluşturuldu. Önceki proje değerleri taşınmadı.');
  });
  $('productType').addEventListener('change', () => {
    renderCommonOptions();
    markCommonDraftDirty();
    setStatus(`${registry.requireProduct($('productType').value).label} ortak ayar taslağı güncellendi. Kaydet ile uygulanır.`);
  });
  ['commonColor', 'commonGlass', 'generalDescription', 'layoutMode', 'expandQuantity'].forEach(id => {
    const control = $(id);
    const refresh = () => { markCommonDraftDirty(); };
    control.addEventListener('change', refresh);
    if (control.matches('input:not([type="checkbox"])')) control.addEventListener('input', refresh);
  });
  ['customerName', 'projectName', 'projectCode', 'revision', 'designer', 'projectDate'].forEach(id => {
    const control = $(id);
    const refresh = () => { syncProjectInfoFromHeader(); drawing = null; scheduleDraw(); };
    control.addEventListener('change', refresh);
    if (control.matches('input:not([type="checkbox"])')) control.addEventListener('input', refresh);
  });
  $('saveCommonSettingsBtn').addEventListener('click', () => applyCommonSettings());
  $('commonSettingsExpand').addEventListener('click', togglePanelOpen);
  $('commonSettingsPin').addEventListener('click', togglePanelPin);

  window.PulumurStandaloneApp = {
    getProject: () => project,
    setProject: value => { project = model.createProject(value); selected.clear(); drawing = null; syncHeaderFromProject(); renderTable(); return draw(); },
    draw,
    scheduleDraw,
    getDrawing: () => drawing
  };
})();
