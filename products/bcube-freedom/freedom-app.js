(function () {
  'use strict';

  const geometry = window.BCubeFreedomGeometry;
  if (!geometry) throw new Error('B-Cube Freedom geometry module could not be loaded.');

  const $ = id => document.getElementById(id);
  const svgNS = 'http://www.w3.org/2000/svg';
  const STORAGE_KEY = 'plmr_bcube_freedom_free_autosave_v1';
  const APP_VERSION = '13.43';

  function todayText() {
    try { return new Intl.DateTimeFormat('tr-TR').format(new Date()); }
    catch (_) { return new Date().toISOString().slice(0, 10); }
  }

  function createDefaultState() {
    return {
      schema: geometry.SCHEMA,
      appVersion: APP_VERSION,
      product: geometry.PRODUCT,
      moduleName: geometry.MODULE,
      engine: 'Freedom Independent SVG',
      project: {
        customer: '',
        name: '',
        revision: 'R01',
        drawnBy: 'AYETULLAH KILINC',
        date: todayText()
      },
      form: {
        systemCount: '1',
        width: '4000',
        opening: '4000',
        rearHeight: '3200',
        frontHeight: '2600',
        angle: '0',
        motor: 'YOK',
        remote: 'HAYIR',
        led: 'HAYIR',
        parapetHeight: '0'
      },
      options: {
        glassTrack: false,
        triangleJoinery: false,
        waterStandard: true
      },
      grid: null,
      supports: [],
      updatedAt: new Date().toISOString()
    };
  }

  let state = createDefaultState();
  const history = { undo: [], redo: [] };
  const ui = {
    expanded: false,
    activeView: 'top',
    mode: 'idle',
    selectedRegions: new Set(),
    selectedPoints: new Set(),
    dimensionChoices: new Map(),
    pendingRegionIds: [],
    pendingWallChoices: new Map()
  };

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function setStatus(text, tone) {
    const node = $('freedomStatus');
    node.textContent = text;
    node.dataset.tone = tone || 'info';
  }

  function saveAutosave() {
    state.updatedAt = new Date().toISOString();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function commit(label, mutator) {
    history.undo.push(deepClone(state));
    if (history.undo.length > 80) history.undo.shift();
    history.redo = [];
    mutator(state);
    state.updatedAt = new Date().toISOString();
    saveAutosave();
    renderAll();
    setStatus(label, 'success');
  }

  function undo() {
    if (!history.undo.length) return;
    history.redo.push(deepClone(state));
    state = history.undo.pop();
    resetInteractionMode();
    saveAutosave();
    renderAll();
    setStatus('Son işlem geri alındı.', 'info');
  }

  function redo() {
    if (!history.redo.length) return;
    history.undo.push(deepClone(state));
    state = history.redo.pop();
    resetInteractionMode();
    saveAutosave();
    renderAll();
    setStatus('Geri alınan işlem yeniden uygulandı.', 'info');
  }

  function restoreAutosave() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      state = geometry.normalizeImportedState(JSON.parse(raw));
      return true;
    } catch (_) {
      return false;
    }
  }

  function svgElement(name, attrs, text) {
    const node = document.createElementNS(svgNS, name);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      node.setAttribute(key, String(value));
    });
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function clearSvg(svg) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
  }

  function mapperFor(bounds, width, height, padding) {
    const modelWidth = Math.max(1, bounds.right - bounds.left);
    const modelHeight = Math.max(1, bounds.top - bounds.bottom);
    const scale = Math.min((width - padding * 2) / modelWidth, (height - padding * 2) / modelHeight);
    const usedW = modelWidth * scale;
    const usedH = modelHeight * scale;
    const offsetX = (width - usedW) / 2;
    const offsetY = (height - usedH) / 2;
    return {
      scale,
      x: value => offsetX + (value - bounds.left) * scale,
      y: value => offsetY + (bounds.top - value) * scale,
      length: value => value * scale
    };
  }

  function regionById(id) {
    return state.grid && state.grid.regions.find(region => region.id === id);
  }

  function supportAtPoint(pointId) {
    return state.supports.find(item => item.id === pointId) || null;
  }

  function definePatterns(svg) {
    const defs = svgElement('defs');
    const wallPattern = svgElement('pattern', { id: 'freedomWallHatch', width: 18, height: 18, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    wallPattern.appendChild(svgElement('line', { x1: 0, y1: 0, x2: 0, y2: 18, stroke: '#5d6675', 'stroke-width': 5 }));
    defs.appendChild(wallPattern);
    const productPattern = svgElement('pattern', { id: 'freedomProductFill', width: 12, height: 12, patternUnits: 'userSpaceOnUse' });
    productPattern.appendChild(svgElement('circle', { cx: 3, cy: 3, r: 1.2, fill: '#0d7b71', opacity: 0.38 }));
    productPattern.appendChild(svgElement('circle', { cx: 9, cy: 9, r: 1.2, fill: '#0d7b71', opacity: 0.38 }));
    defs.appendChild(productPattern);
    svg.appendChild(defs);
  }

  function renderEmpty(svg, title, subtitle) {
    clearSvg(svg);
    svg.setAttribute('viewBox', '0 0 1200 760');
    svg.appendChild(svgElement('rect', { x: 0, y: 0, width: 1200, height: 760, fill: '#fbfcfe' }));
    svg.appendChild(svgElement('text', { x: 600, y: 342, 'text-anchor': 'middle', class: 'freedom-empty-title' }, title));
    svg.appendChild(svgElement('text', { x: 600, y: 382, 'text-anchor': 'middle', class: 'freedom-empty-subtitle' }, subtitle));
  }

  function renderTopView() {
    const svg = $('freedomTopSvg');
    if (!state.grid) {
      renderEmpty(svg, 'Üst görünüş henüz oluşturulmadı', 'Önizlemeyi büyütün ve “Aks Oluştur” komutunu kullanın.');
      return;
    }

    clearSvg(svg);
    svg.setAttribute('viewBox', '0 0 1200 760');
    svg.dataset.mode = ui.mode;
    definePatterns(svg);
    svg.appendChild(svgElement('rect', { x: 0, y: 0, width: 1200, height: 760, fill: '#fbfcfe' }));

    const map = mapperFor(state.grid.outerBounds, 1200, 760, 54);
    const outer = state.grid.outerBounds;
    svg.appendChild(svgElement('rect', {
      x: map.x(outer.left),
      y: map.y(outer.top),
      width: map.length(outer.right - outer.left),
      height: map.length(outer.top - outer.bottom),
      fill: 'none',
      stroke: geometry.AXIS_COLOR,
      'stroke-width': 2,
      'stroke-dasharray': '10 7',
      'vector-effect': 'non-scaling-stroke'
    }));

    state.grid.regions.forEach(region => {
      const x = map.x(region.x1);
      const y = map.y(region.yTop);
      const width = map.length(region.x2 - region.x1);
      const height = map.length(region.yTop - region.yBottom);
      let fill = 'transparent';
      let opacity = 1;
      if (region.type === 'wall') fill = 'url(#freedomWallHatch)';
      if (region.type === 'product') fill = 'url(#freedomProductFill)';
      if (region.type === 'void') { fill = '#ffffff'; opacity = 0.28; }
      if (ui.pendingRegionIds.includes(region.id)) fill = 'rgba(13,123,113,.16)';
      svg.appendChild(svgElement('rect', { x, y, width, height, fill, opacity, 'pointer-events': 'none' }));

      if (region.type !== 'unassigned') {
        const label = region.type === 'wall' ? 'DUVAR' : region.type === 'product' ? 'ÜRÜN' : 'BOŞLUK';
        svg.appendChild(svgElement('text', {
          x: x + width / 2,
          y: y + height / 2 + 5,
          'text-anchor': 'middle',
          class: `freedom-region-label freedom-region-label-${region.type}`
        }, label));
      }
    });

    const frames = geometry.buildFrames(state.grid, state.supports);
    frames.forEach(frame => {
      const x = map.x(Math.min(frame.x1, frame.x2));
      const y = map.y(Math.max(frame.y1, frame.y2));
      const width = map.length(Math.abs(frame.x2 - frame.x1));
      const height = map.length(Math.abs(frame.y1 - frame.y2));
      svg.appendChild(svgElement('rect', {
        x, y, width, height,
        fill: 'rgba(37,99,235,.16)',
        stroke: geometry.FRAME_COLOR,
        'stroke-width': 2.2,
        'vector-effect': 'non-scaling-stroke'
      }));
    });

    geometry.visibleAxisSegments(state.grid).forEach(segment => {
      svg.appendChild(svgElement('line', {
        x1: map.x(segment.x1),
        y1: map.y(segment.y1),
        x2: map.x(segment.x2),
        y2: map.y(segment.y2),
        stroke: geometry.AXIS_COLOR,
        'stroke-width': 1.65,
        'stroke-dasharray': '7 6',
        'vector-effect': 'non-scaling-stroke'
      }));
    });

    state.supports.forEach(support => {
      const x = state.grid.xAxes[support.ix];
      const y = state.grid.yAxes[support.iy];
      if (support.type === 'post') {
        const dims = geometry.postDimensions(support.profile);
        svg.appendChild(svgElement('rect', {
          x: map.x(x - dims.x / 2),
          y: map.y(y + dims.y / 2),
          width: map.length(dims.x),
          height: map.length(dims.y),
          fill: 'rgba(255,0,255,.18)',
          stroke: geometry.POST_COLOR,
          'stroke-width': 2.4,
          'vector-effect': 'non-scaling-stroke',
          'data-support-id': support.id
        }));
      } else {
        const size = Math.max(8, Math.min(16, map.length(120)));
        const cx = map.x(x);
        const cy = map.y(y);
        svg.appendChild(svgElement('path', {
          d: `M ${cx} ${cy - size} L ${cx + size} ${cy} L ${cx} ${cy + size} L ${cx - size} ${cy} Z`,
          fill: '#ffb347',
          stroke: '#8a4f00',
          'stroke-width': 1.8,
          'vector-effect': 'non-scaling-stroke',
          'data-support-id': support.id
        }));
      }
    });

    if (ui.mode === 'select-regions') renderRegionSelection(svg, map);
    if (ui.mode === 'choose-dimensions') renderDimensionChoices(svg, map);
    if (ui.mode === 'select-points') renderPointSelection(svg, map);

    svg.appendChild(svgElement('text', { x: 68, y: 40, class: 'freedom-view-caption' }, 'B-CUBE FREEDOM · FREE · ÜST GÖRÜNÜŞ'));
    svg.appendChild(svgElement('text', { x: 1134, y: 40, 'text-anchor': 'end', class: 'freedom-coordinate-caption' }, 'Başlangıç / merkez: (0,0)'));
  }

  function renderRegionSelection(svg, map) {
    state.grid.regions.forEach(region => {
      const selected = ui.selectedRegions.has(region.id);
      const rect = svgElement('rect', {
        x: map.x(region.x1),
        y: map.y(region.yTop),
        width: map.length(region.x2 - region.x1),
        height: map.length(region.yTop - region.yBottom),
        fill: selected ? 'rgba(13,123,113,.28)' : 'rgba(255,255,255,.025)',
        stroke: selected ? '#0d7b71' : 'transparent',
        'stroke-width': selected ? 3 : 0,
        class: 'freedom-click-region',
        'data-region-id': region.id
      });
      svg.appendChild(rect);
      if (selected) {
        svg.appendChild(svgElement('text', {
          x: map.x((region.x1 + region.x2) / 2),
          y: map.y((region.yTop + region.yBottom) / 2) + 5,
          'text-anchor': 'middle',
          class: 'freedom-selection-index'
        }, String(Array.from(ui.selectedRegions).indexOf(region.id) + 1)));
      }
    });
  }

  function renderDimensionChoices(svg, map) {
    ui.pendingRegionIds.forEach(regionId => {
      const region = regionById(regionId);
      if (!region) return;
      const x1 = map.x(region.x1);
      const x2 = map.x(region.x2);
      const yTop = map.y(region.yTop);
      const yBottom = map.y(region.yBottom);
      const width = x2 - x1;
      const height = yBottom - yTop;
      const chosen = ui.dimensionChoices.get(regionId) || '';
      const horizontal = svgElement('g', { class: `freedom-dimension-choice ${chosen === 'x' ? 'is-selected' : ''}`, 'data-region-id': regionId, 'data-axis': 'x' });
      horizontal.appendChild(svgElement('rect', { x: x1 + width * .21, y: yTop + 12, width: width * .58, height: 30, rx: 8 }));
      horizontal.appendChild(svgElement('text', { x: x1 + width / 2, y: yTop + 32, 'text-anchor': 'middle' }, `X = ${Math.round(region.x2 - region.x1)} mm`));
      svg.appendChild(horizontal);

      const vertical = svgElement('g', { class: `freedom-dimension-choice ${chosen === 'y' ? 'is-selected' : ''}`, 'data-region-id': regionId, 'data-axis': 'y' });
      const boxW = Math.min(150, Math.max(92, width * .38));
      vertical.appendChild(svgElement('rect', { x: x1 + 12, y: yTop + height / 2 - 15, width: boxW, height: 30, rx: 8 }));
      vertical.appendChild(svgElement('text', { x: x1 + 12 + boxW / 2, y: yTop + height / 2 + 5, 'text-anchor': 'middle' }, `Y = ${Math.round(region.yTop - region.yBottom)} mm`));
      svg.appendChild(vertical);
    });
  }

  function renderPointSelection(svg, map) {
    geometry.selectablePoints(state.grid).forEach(point => {
      const selected = ui.selectedPoints.has(point.id);
      const existing = supportAtPoint(point.id);
      svg.appendChild(svgElement('circle', {
        cx: map.x(point.x),
        cy: map.y(point.y),
        r: selected ? 11 : 8,
        fill: selected ? '#0d7b71' : existing ? '#ffb347' : '#ffffff',
        stroke: selected ? '#063f3c' : '#334155',
        'stroke-width': selected ? 3 : 2,
        class: 'freedom-click-point',
        'data-point-id': point.id
      }));
    });
  }

  function renderFrontView() {
    const svg = $('freedomFrontSvg');
    if (!state.grid) {
      renderEmpty(svg, 'Ön görünüş bekleniyor', 'Üst görünüş aksları ve taşıyıcı noktaları tanımlandığında otomatik oluşur.');
      return;
    }
    clearSvg(svg);
    svg.setAttribute('viewBox', '0 0 1200 620');
    svg.appendChild(svgElement('rect', { x: 0, y: 0, width: 1200, height: 620, fill: '#fbfcfe' }));
    const frontHeight = Math.max(1, Number(state.form.frontHeight) || 2600);
    const bounds = { left: state.grid.bounds.left - 400, right: state.grid.bounds.right + 400, top: frontHeight + 500, bottom: -250 };
    const map = mapperFor(bounds, 1200, 620, 58);
    svg.appendChild(svgElement('line', { x1: map.x(bounds.left), y1: map.y(0), x2: map.x(bounds.right), y2: map.y(0), stroke: '#475569', 'stroke-width': 2 }));

    const postsByIx = new Map();
    state.supports.filter(item => item.type === 'post').forEach(post => {
      if (!postsByIx.has(post.ix)) postsByIx.set(post.ix, post);
    });
    postsByIx.forEach(post => {
      const dims = geometry.postDimensions(post.profile);
      const x = state.grid.xAxes[post.ix];
      svg.appendChild(svgElement('rect', {
        x: map.x(x - dims.x / 2), y: map.y(frontHeight),
        width: map.length(dims.x), height: map.length(frontHeight),
        fill: 'rgba(255,0,255,.15)', stroke: geometry.POST_COLOR, 'stroke-width': 2.2
      }));
    });

    const horizontalFrames = geometry.buildFrames(state.grid, state.supports).filter(frame => frame.orientation === 'horizontal');
    horizontalFrames.forEach(frame => {
      svg.appendChild(svgElement('rect', {
        x: map.x(frame.x1), y: map.y(frontHeight),
        width: map.length(frame.x2 - frame.x1), height: Math.max(8, map.length(100)),
        fill: 'rgba(37,99,235,.16)', stroke: geometry.FRAME_COLOR, 'stroke-width': 2
      }));
    });
    svg.appendChild(svgElement('text', { x: 62, y: 38, class: 'freedom-view-caption' }, 'OTOMATİK ÖN GÖRÜNÜŞ · ŞEMATİK'));
    svg.appendChild(svgElement('text', { x: 62, y: 65, class: 'freedom-coordinate-caption' }, `Ön yükseklik: ${Math.round(frontHeight)} mm`));
  }

  function renderSideView() {
    const svg = $('freedomSideSvg');
    if (!state.grid) {
      renderEmpty(svg, 'Yan görünüş bekleniyor', 'Üst görünüş aksları ve taşıyıcı noktaları tanımlandığında otomatik oluşur.');
      return;
    }
    clearSvg(svg);
    svg.setAttribute('viewBox', '0 0 1200 620');
    svg.appendChild(svgElement('rect', { x: 0, y: 0, width: 1200, height: 620, fill: '#fbfcfe' }));
    const rearHeight = Math.max(1, Number(state.form.rearHeight) || 3200);
    const frontHeight = Math.max(1, Number(state.form.frontHeight) || 2600);
    const depth = state.grid.totalOpening;
    const maxHeight = Math.max(rearHeight, frontHeight);
    const bounds = { left: -400, right: depth + 400, top: maxHeight + 500, bottom: -250 };
    const map = mapperFor(bounds, 1200, 620, 58);
    const depthAtIy = iy => (state.grid.yAxes[0] - state.grid.yAxes[iy]);
    const heightAtIy = iy => {
      const ratio = state.grid.horizontalDivisions ? iy / state.grid.horizontalDivisions : 0;
      return rearHeight + (frontHeight - rearHeight) * ratio;
    };
    svg.appendChild(svgElement('line', { x1: map.x(0), y1: map.y(0), x2: map.x(depth), y2: map.y(0), stroke: '#475569', 'stroke-width': 2 }));

    const postsByIy = new Map();
    state.supports.filter(item => item.type === 'post').forEach(post => {
      if (!postsByIy.has(post.iy)) postsByIy.set(post.iy, post);
    });
    postsByIy.forEach(post => {
      const dims = geometry.postDimensions(post.profile);
      const x = depthAtIy(post.iy);
      const height = heightAtIy(post.iy);
      svg.appendChild(svgElement('rect', {
        x: map.x(x - dims.y / 2), y: map.y(height),
        width: map.length(dims.y), height: map.length(height),
        fill: 'rgba(255,0,255,.15)', stroke: geometry.POST_COLOR, 'stroke-width': 2.2
      }));
    });

    const verticalFrames = geometry.buildFrames(state.grid, state.supports).filter(frame => frame.orientation === 'vertical');
    verticalFrames.forEach(frame => {
      const startSupport = state.supports.find(item => item.id === frame.startSupportId);
      const endSupport = state.supports.find(item => item.id === frame.endSupportId);
      if (!startSupport || !endSupport) return;
      const x1 = depthAtIy(startSupport.iy);
      const x2 = depthAtIy(endSupport.iy);
      const y1 = heightAtIy(startSupport.iy);
      const y2 = heightAtIy(endSupport.iy);
      svg.appendChild(svgElement('line', {
        x1: map.x(x1), y1: map.y(y1), x2: map.x(x2), y2: map.y(y2),
        stroke: geometry.FRAME_COLOR, 'stroke-width': Math.max(8, map.length(100)), 'stroke-linecap': 'butt'
      }));
      svg.appendChild(svgElement('line', {
        x1: map.x(x1), y1: map.y(y1), x2: map.x(x2), y2: map.y(y2),
        stroke: '#1d4ed8', 'stroke-width': 2
      }));
    });
    svg.appendChild(svgElement('text', { x: 62, y: 38, class: 'freedom-view-caption' }, 'OTOMATİK YAN GÖRÜNÜŞ · ŞEMATİK'));
    svg.appendChild(svgElement('text', { x: 62, y: 65, class: 'freedom-coordinate-caption' }, `Arka / ön yükseklik: ${Math.round(rearHeight)} / ${Math.round(frontHeight)} mm`));
  }

  function renderViewTabs() {
    document.querySelectorAll('[data-view-tab]').forEach(button => button.classList.toggle('is-active', button.dataset.viewTab === ui.activeView));
    document.querySelectorAll('[data-view-panel]').forEach(panel => { panel.hidden = panel.dataset.viewPanel !== ui.activeView; });
  }

  function renderOptions() {
    document.querySelectorAll('[data-option-key]').forEach(button => {
      const active = Boolean(state.options[button.dataset.optionKey]);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      const value = button.querySelector('.freedom-toggle-value');
      if (value) value.textContent = active ? 'EVET' : 'HAYIR';
    });
  }

  function renderModeBar() {
    const bar = $('selectionModeBar');
    const label = $('selectionModeText');
    bar.hidden = ui.mode === 'idle';
    if (ui.mode === 'select-regions') label.textContent = `${ui.selectedRegions.size} bölge seçildi. Bölgeleri tıklayarak çoklu seçim yapın.`;
    if (ui.mode === 'choose-dimensions') label.textContent = `Her ürün bölgesi için genişlik olacak ölçüyü seçin. Diğer yön otomatik olarak açılım olur.`;
    if (ui.mode === 'select-points') label.textContent = `${ui.selectedPoints.size} köşe noktası seçildi. Dikme veya duvar bağlantısı olarak tanımlanacak noktaları işaretleyin.`;
    $('selectionCompleteBtn').textContent = ui.mode === 'choose-dimensions' ? 'Ölçüleri Tamamla' : 'Seçimi Tamamla';
  }

  function renderToolboxState() {
    $('freedomToolbox').hidden = !ui.expanded || ui.mode !== 'idle';
    $('axisCreateBtn').disabled = false;
    $('regionDefinitionsBtn').disabled = !state.grid;
    $('supportDefinitionsBtn').disabled = !state.grid;
    $('undoBtn').disabled = history.undo.length === 0;
    $('redoBtn').disabled = history.redo.length === 0;
  }

  function syncFormToDom() {
    Object.entries(state.form).forEach(([key, value]) => {
      const input = document.querySelector(`[data-form-key="${key}"]`);
      if (input && input.value !== String(value)) input.value = String(value);
    });
    Object.entries(state.project).forEach(([key, value]) => {
      const input = document.querySelector(`[data-project-key="${key}"]`);
      if (input && input.value !== String(value)) input.value = String(value);
    });
  }

  function renderAll() {
    syncFormToDom();
    renderOptions();
    renderTopView();
    renderFrontView();
    renderSideView();
    renderViewTabs();
    renderModeBar();
    renderToolboxState();
    $('expandPreviewBtn').textContent = ui.expanded ? 'Önizlemeyi Küçült' : 'Önizlemeyi Büyüt';
    document.body.classList.toggle('freedom-preview-expanded', ui.expanded);
  }

  function resetInteractionMode() {
    ui.mode = 'idle';
    ui.selectedRegions.clear();
    ui.selectedPoints.clear();
    ui.dimensionChoices.clear();
    ui.pendingRegionIds = [];
    ui.pendingWallChoices.clear();
  }

  function openDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function openAxisDialog() {
    const grid = state.grid;
    $('axisTotalWidth').value = grid ? String(Math.round(grid.totalWidth)) : state.form.width;
    $('axisTotalOpening').value = grid ? String(Math.round(grid.totalOpening)) : state.form.opening;
    $('axisHorizontalCount').value = grid ? String(grid.horizontalDivisions) : '2';
    $('axisVerticalCount').value = grid ? String(grid.verticalDivisions) : '2';
    $('axisDialogError').textContent = '';
    openDialog($('axisDialog'));
  }

  function applyAxisDialog(event) {
    event.preventDefault();
    const totalWidth = Number($('axisTotalWidth').value);
    const totalOpening = Number($('axisTotalOpening').value);
    const horizontalDivisions = Number($('axisHorizontalCount').value);
    const verticalDivisions = Number($('axisVerticalCount').value);
    if (!(totalWidth > 0 && totalOpening > 0)) {
      $('axisDialogError').textContent = 'Total genişlik ve total açılım sıfırdan büyük olmalıdır.';
      return;
    }
    if (!Number.isInteger(horizontalDivisions) || horizontalDivisions < 1 || horizontalDivisions > 30 || !Number.isInteger(verticalDivisions) || verticalDivisions < 1 || verticalDivisions > 30) {
      $('axisDialogError').textContent = 'Yatay ve dikey aks bölme sayıları 1–30 arasında tam sayı olmalıdır.';
      return;
    }
    commit('Freedom aks sistemi oluşturuldu.', draft => {
      draft.grid = geometry.createGrid({ totalWidth, totalOpening, horizontalDivisions, verticalDivisions, offset: 1000 });
      draft.supports = [];
      draft.form.width = String(Math.round(totalWidth));
      draft.form.opening = String(Math.round(totalOpening));
    });
    closeDialog($('axisDialog'));
  }

  function startRegionSelection() {
    if (!state.grid) return;
    resetInteractionMode();
    ui.mode = 'select-regions';
    renderAll();
    setStatus('Bölge seçim modu aktif. Birden fazla bölge seçebilirsiniz.', 'info');
  }

  function startPointSelection() {
    if (!state.grid) return;
    resetInteractionMode();
    ui.mode = 'select-points';
    renderAll();
    setStatus('Köşe noktası seçim modu aktif.', 'info');
  }

  function cancelSelectionMode() {
    resetInteractionMode();
    renderAll();
    setStatus('Seçim işlemi iptal edildi.', 'info');
  }

  function completeSelectionMode() {
    if (ui.mode === 'select-regions') {
      if (!ui.selectedRegions.size) {
        setStatus('En az bir bölge seçilmelidir.', 'error');
        return;
      }
      openDialog($('regionTypeDialog'));
      return;
    }
    if (ui.mode === 'choose-dimensions') {
      const missing = ui.pendingRegionIds.filter(id => !ui.dimensionChoices.has(id));
      if (missing.length) {
        setStatus(`Genişlik ölçüsü seçilmeyen bölge: ${missing.join(', ')}`, 'error');
        return;
      }
      const choices = new Map(ui.dimensionChoices);
      const ids = ui.pendingRegionIds.slice();
      commit('Ürün bölgeleri ve panel yönleri tanımlandı.', draft => {
        draft.grid.regions.forEach(region => {
          if (!ids.includes(region.id)) return;
          region.type = 'product';
          region.widthAxis = choices.get(region.id);
        });
      });
      resetInteractionMode();
      renderAll();
      return;
    }
    if (ui.mode === 'select-points') {
      if (!ui.selectedPoints.size) {
        setStatus('En az bir köşe noktası seçilmelidir.', 'error');
        return;
      }
      $('supportDefinitionMode').value = 'post';
      $('postProfileWrap').hidden = false;
      $('supportTypeDialogError').textContent = '';
      openDialog($('supportTypeDialog'));
    }
  }

  function applyRegionType(event) {
    event.preventDefault();
    const type = document.querySelector('input[name="regionDefinitionType"]:checked').value;
    const ids = Array.from(ui.selectedRegions);
    if (type === 'product') {
      ui.pendingRegionIds = ids;
      ui.dimensionChoices.clear();
      ids.forEach(id => {
        const region = regionById(id);
        if (region && region.widthAxis) ui.dimensionChoices.set(id, region.widthAxis);
      });
      ui.mode = 'choose-dimensions';
      ui.selectedRegions.clear();
      closeDialog($('regionTypeDialog'));
      renderAll();
      setStatus('Ürün bölgelerinde genişlik yönü seçimini tamamlayın.', 'info');
      return;
    }

    commit(type === 'wall' ? 'Seçilen bölgeler duvar olarak tanımlandı.' : 'Seçilen bölgeler boşluk olarak tanımlandı.', draft => {
      draft.grid.regions.forEach(region => {
        if (!ids.includes(region.id)) return;
        region.type = type;
        region.widthAxis = null;
      });
      const available = new Set(geometry.selectablePoints(draft.grid).map(point => point.id));
      draft.supports = draft.supports.filter(support => available.has(support.id));
    });
    closeDialog($('regionTypeDialog'));
    resetInteractionMode();
    renderAll();
  }

  function upsertSupports(draft, entries) {
    const ids = new Set(entries.map(entry => entry.id));
    draft.supports = draft.supports.filter(item => !ids.has(item.id)).concat(entries);
  }

  function applySupportType(event) {
    event.preventDefault();
    const mode = $('supportDefinitionMode').value;
    const pointMap = new Map(geometry.selectablePoints(state.grid).map(point => [point.id, point]));
    const points = Array.from(ui.selectedPoints).map(id => pointMap.get(id)).filter(Boolean);
    if (mode === 'post') {
      const profile = $('supportPostProfile').value;
      commit(`${points.length} nokta dikme olarak tanımlandı.`, draft => {
        upsertSupports(draft, points.map(point => ({ ...point, type: 'post', profile })));
      });
      closeDialog($('supportTypeDialog'));
      resetInteractionMode();
      renderAll();
      return;
    }

    const candidateMap = new Map();
    const missing = [];
    points.forEach(point => {
      const candidates = geometry.wallCandidatesForPoint(state.grid, point);
      candidateMap.set(point.id, candidates);
      if (!candidates.length) missing.push(point.id);
    });
    if (missing.length) {
      $('supportTypeDialogError').textContent = `Duvarla kesişmeyen noktalar duvar bağlantısı olamaz: ${missing.join(', ')}`;
      return;
    }
    closeDialog($('supportTypeDialog'));
    prepareWallChoiceDialog(points, candidateMap);
  }

  function prepareWallChoiceDialog(points, candidateMap) {
    ui.pendingWallChoices.clear();
    const list = $('wallChoiceList');
    list.innerHTML = '';
    points.forEach(point => {
      const candidates = candidateMap.get(point.id) || [];
      if (candidates.length === 1) ui.pendingWallChoices.set(point.id, candidates[0]);
      const row = document.createElement('div');
      row.className = 'freedom-wall-choice-row';
      const title = document.createElement('strong');
      title.textContent = `${point.id} · (${Math.round(point.x)}, ${Math.round(point.y)})`;
      row.appendChild(title);
      if (candidates.length === 1) {
        const value = document.createElement('span');
        value.textContent = candidates[0].label;
        row.appendChild(value);
      } else {
        const select = document.createElement('select');
        select.dataset.wallPointId = point.id;
        candidates.forEach(candidate => {
          const option = document.createElement('option');
          option.value = candidate.id;
          option.textContent = candidate.label;
          select.appendChild(option);
        });
        select.addEventListener('change', () => {
          const selected = candidates.find(candidate => candidate.id === select.value);
          if (selected) ui.pendingWallChoices.set(point.id, selected);
        });
        row.appendChild(select);
        ui.pendingWallChoices.set(point.id, candidates[0]);
      }
      list.appendChild(row);
    });
    openDialog($('wallChoiceDialog'));
  }

  function applyWallChoices(event) {
    event.preventDefault();
    const pointMap = new Map(geometry.selectablePoints(state.grid).map(point => [point.id, point]));
    const entries = Array.from(ui.selectedPoints).map(id => {
      const point = pointMap.get(id);
      const wallRef = ui.pendingWallChoices.get(id);
      return point && wallRef ? { ...point, type: 'wallConnection', wallRef } : null;
    }).filter(Boolean);
    commit(`${entries.length} nokta duvar bağlantısı olarak tanımlandı.`, draft => {
      upsertSupports(draft, entries);
    });
    closeDialog($('wallChoiceDialog'));
    resetInteractionMode();
    renderAll();
  }

  function handleTopSvgClick(event) {
    const region = event.target.closest && event.target.closest('[data-region-id]');
    const point = event.target.closest && event.target.closest('[data-point-id]');
    const dimension = event.target.closest && event.target.closest('.freedom-dimension-choice');
    if (ui.mode === 'select-regions' && region) {
      const id = region.getAttribute('data-region-id');
      if (ui.selectedRegions.has(id)) ui.selectedRegions.delete(id); else ui.selectedRegions.add(id);
      renderAll();
      return;
    }
    if (ui.mode === 'choose-dimensions' && dimension) {
      const id = dimension.getAttribute('data-region-id');
      const axis = dimension.getAttribute('data-axis');
      ui.dimensionChoices.set(id, axis);
      renderAll();
      return;
    }
    if (ui.mode === 'select-points' && point) {
      const id = point.getAttribute('data-point-id');
      if (ui.selectedPoints.has(id)) ui.selectedPoints.delete(id); else ui.selectedPoints.add(id);
      renderAll();
    }
  }

  function toggleExpanded() {
    ui.expanded = !ui.expanded;
    if (!ui.expanded) resetInteractionMode();
    renderAll();
    setStatus(ui.expanded ? 'Büyük önizleme ve Freedom toolbox açıldı.' : 'Önizleme normal boyuta döndü.', 'info');
  }

  function updateOption(key) {
    commit(`${key === 'glassTrack' ? 'Cam kaydı' : key === 'triangleJoinery' ? 'Üçgen doğrama' : 'Su çıkışı standardı'} güncellendi.`, draft => {
      draft.options[key] = !draft.options[key];
    });
  }

  function exportProject() {
    syncInputsIntoState(false);
    const payload = JSON.stringify(state, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const customer = String(state.project.customer || 'MUSTERI').replace(/[^A-Z0-9_-]+/gi, '-').toUpperCase();
    const project = String(state.project.name || 'B-CUBE-FREEDOM').replace(/[^A-Z0-9_-]+/gi, '-').toUpperCase();
    link.href = url;
    link.download = `${customer}-${project}-${state.project.revision || 'R01'}-FREEDOM.plmr`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus('B-Cube Freedom proje dosyası indirildi.', 'success');
  }

  async function importProject(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const imported = geometry.normalizeImportedState(JSON.parse(text));
      history.undo.push(deepClone(state));
      history.redo = [];
      state = imported;
      resetInteractionMode();
      saveAutosave();
      renderAll();
      setStatus('B-Cube Freedom proje dosyası açıldı.', 'success');
    } catch (error) {
      setStatus(error.message || 'Proje dosyası açılamadı.', 'error');
    }
  }

  function syncInputsIntoState(recordHistory) {
    const nextForm = { ...state.form };
    document.querySelectorAll('[data-form-key]').forEach(input => { nextForm[input.dataset.formKey] = input.value; });
    const nextProject = { ...state.project };
    document.querySelectorAll('[data-project-key]').forEach(input => { nextProject[input.dataset.projectKey] = input.value; });
    if (recordHistory) {
      commit('Veri giriş alanı güncellendi.', draft => {
        draft.form = nextForm;
        draft.project = nextProject;
      });
    } else {
      state.form = nextForm;
      state.project = nextProject;
      saveAutosave();
      renderFrontView();
      renderSideView();
    }
  }

  function resetFreedomProject() {
    if (!window.confirm('B-Cube Freedom çizimi ve tüm tanımlar sıfırlansın mı?')) return;
    history.undo.push(deepClone(state));
    history.redo = [];
    state = createDefaultState();
    resetInteractionMode();
    saveAutosave();
    renderAll();
    setStatus('Freedom çalışma alanı sıfırlandı.', 'info');
  }

  function bindEvents() {
    $('product').addEventListener('change', event => {
      if (event.target.value === 'Pergo Rise') window.location.href = '../../index.html';
    });
    $('expandPreviewBtn').addEventListener('click', toggleExpanded);
    $('axisCreateBtn').addEventListener('click', openAxisDialog);
    $('regionDefinitionsBtn').addEventListener('click', startRegionSelection);
    $('supportDefinitionsBtn').addEventListener('click', startPointSelection);
    $('selectionCompleteBtn').addEventListener('click', completeSelectionMode);
    $('selectionCancelBtn').addEventListener('click', cancelSelectionMode);
    $('freedomTopSvg').addEventListener('click', handleTopSvgClick);
    $('axisForm').addEventListener('submit', applyAxisDialog);
    $('axisDialogCancel').addEventListener('click', () => closeDialog($('axisDialog')));
    $('axisDialogCancelBottom').addEventListener('click', () => closeDialog($('axisDialog')));
    $('regionTypeForm').addEventListener('submit', applyRegionType);
    $('regionTypeCancel').addEventListener('click', () => closeDialog($('regionTypeDialog')));
    $('regionTypeCancelBottom').addEventListener('click', () => closeDialog($('regionTypeDialog')));
    $('supportTypeForm').addEventListener('submit', applySupportType);
    $('supportTypeCancel').addEventListener('click', () => closeDialog($('supportTypeDialog')));
    $('supportTypeCancelBottom').addEventListener('click', () => closeDialog($('supportTypeDialog')));
    $('supportDefinitionMode').addEventListener('change', event => { $('postProfileWrap').hidden = event.target.value !== 'post'; });
    $('wallChoiceForm').addEventListener('submit', applyWallChoices);
    $('wallChoiceCancel').addEventListener('click', () => closeDialog($('wallChoiceDialog')));
    $('wallChoiceCancelBottom').addEventListener('click', () => closeDialog($('wallChoiceDialog')));
    document.querySelectorAll('[data-option-key]').forEach(button => button.addEventListener('click', () => updateOption(button.dataset.optionKey)));
    document.querySelectorAll('[data-view-tab]').forEach(button => button.addEventListener('click', () => { ui.activeView = button.dataset.viewTab; renderViewTabs(); }));
    document.querySelectorAll('[data-form-key],[data-project-key]').forEach(input => input.addEventListener('change', () => syncInputsIntoState(true)));
    $('projectExportBtn').addEventListener('click', exportProject);
    $('previewProjectExportBtn').addEventListener('click', exportProject);
    $('projectImportBtn').addEventListener('click', () => $('projectImportInput').click());
    $('projectImportInput').addEventListener('change', event => { void importProject(event.target.files && event.target.files[0]); event.target.value = ''; });
    $('undoBtn').addEventListener('click', undo);
    $('redoBtn').addEventListener('click', redo);
    $('resetFreedomBtn').addEventListener('click', resetFreedomProject);
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); }
      if (event.key === 'Escape' && ui.mode !== 'idle') cancelSelectionMode();
    });
  }

  restoreAutosave();
  bindEvents();
  renderAll();
  setStatus(state.grid ? 'Freedom otomatik kaydı geri yüklendi.' : 'B-Cube Freedom Free modülü hazır.', 'info');
})();
