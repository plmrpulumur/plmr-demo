(function (root) {
  'use strict';

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const finite = value => Number.isFinite(Number(value)) ? Number(value) : 0;

  function translatePoint(point, dx, dy) { return [finite(point[0]) + dx, finite(point[1]) + dy]; }

  function translateEntity(entity, dx, dy) {
    if (root.PulumurCoordinateTransformService) return root.PulumurCoordinateTransformService.translateEntity(entity, dx, dy);
    const item = clone(entity);
    ['x', 'x1', 'x2'].forEach(key => { if (item[key] !== undefined) item[key] = finite(item[key]) + dx; });
    ['y', 'y1', 'y2'].forEach(key => { if (item[key] !== undefined) item[key] = finite(item[key]) + dy; });
    if (Array.isArray(item.points)) item.points = item.points.map(point => translatePoint(point, dx, dy));
    if (Array.isArray(item.p1)) item.p1 = translatePoint(item.p1, dx, dy);
    if (Array.isArray(item.p2)) item.p2 = translatePoint(item.p2, dx, dy);
    if (Array.isArray(item.dimLine)) item.dimLine = translatePoint(item.dimLine, dx, dy);
    if (Array.isArray(item.graphics)) item.graphics = item.graphics.map(graphic => translateEntity(graphic, dx, dy));
    return item;
  }

  function normalizeBounds(bounds) {
    if (root.PulumurCoordinateTransformService) return root.PulumurCoordinateTransformService.normalizeBounds(bounds);
    const normalized = {
      minX: finite(bounds && bounds.minX), minY: finite(bounds && bounds.minY),
      maxX: finite(bounds && bounds.maxX), maxY: finite(bounds && bounds.maxY)
    };
    normalized.width = normalized.maxX - normalized.minX;
    normalized.height = normalized.maxY - normalized.minY;
    return normalized;
  }

  function wrapText(value, maxChars) {
    const words = String(value || '').trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach(word => {
      const next = line ? `${line} ${word}` : word;
      if (line && next.length > maxChars) { lines.push(line); line = word; }
      else line = next;
    });
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  function optionSummary(position, options) {
    const values = options || position.options || {};
    if (position.productType === 'SLIDING') return [values.series, values.panelCount ? `${values.panelCount} PANEL` : '', values.openingType].filter(Boolean).join(' / ');
    if (position.productType === 'GUILLOTINE') return [values.type, values.panelCount ? `${values.panelCount} PANEL` : '', values.motorDirection].filter(Boolean).join(' / ');
    if (position.productType === 'ZIP_SCREEN') return [values.type, values.mountingLocation, values.motorDirection].filter(Boolean).join(' / ');
    if (position.productType === 'DOOR') return [values.doorType, values.doorOpenDirection, values.handleType].filter(Boolean).join(' / ');
    if (position.productType === 'FIXED_JOINERY') return [`D${values.verticalDivisions || 0}`, `Y${values.horizontalDivisions || 1}`, values.glassColor].filter(Boolean).join(' / ');
    if (position.productType === 'FOLDING_GLASS') return [values.series, values.panels ? `${values.panels} PANEL` : '', values.openingDirection, values.foldingOpenDirection].filter(Boolean).join(' / ');
    return '';
  }

  function titleEntities(position, adapter, drawing, titleGap, options) {
    const bounds = normalizeBounds(drawing.bounds);
    const startY = bounds.minY - Math.max(150, finite(titleGap));
    const layer = 'PLMR_POZ_TEXT';
    const detail = optionSummary(position, options);
    const description = position.description ? `${detail}  |  ${position.description}` : detail;
    const descriptionLines = wrapText(description, 68);
    const owner = { ownerInstance: position.id, positionId: position.id, entityNamespace: `${position.productType}_${position.positionNo}` };
    return [
      { type: 'text', x: bounds.minX, y: startY, value: `${position.positionNo} — ${adapter.label.toUpperCase()}`, height: 90, layer, color: 7, ...owner },
      { type: 'text', x: bounds.minX, y: startY - 125, value: `${position.width} × ${position.height} mm  |  ADET: ${position.quantity}`, height: 65, layer, color: 7, ...owner },
      { type: 'mtext', x: bounds.minX, y: startY - 205, value: descriptionLines.join('\\P'), width: Math.max(1200, Math.min(3600, 68 * 48 * 0.55)), height: 48, lineSpacing: 1.15, layer, color: 7, ...owner }
    ];
  }

  function geometryBounds(entities, blocks) {
    if (root.PulumurGeometry && typeof root.PulumurGeometry.bounds === 'function') return normalizeBounds(root.PulumurGeometry.bounds(entities, blocks || {}));
    return normalizeBounds({ minX: 0, minY: 0, maxX: 1, maxY: 1 });
  }

  function buildItem(project, position) {
    const adapter = root.PulumurProductRegistry.requireProduct(position.productType);
    const resolved = root.PulumurStandaloneProject.resolvePosition(project, position);
    const instanceId = `${position.productType}_${position.positionNo}`;
    const drawing = adapter.buildStandaloneGeometry({ project: resolved, instanceId, placementId: position.id, entityNamespace: instanceId });
    const titles = titleEntities(position, adapter, drawing, project.layout.titleGap, root.PulumurStandaloneProject.resolveOptions(project, position));
    const entities = [...drawing.entities, ...titles];
    const bounds = geometryBounds(entities, drawing.blocks);
    return { position, adapter, resolved, drawing: { ...drawing, entities, bounds }, bounds };
  }

  function intersects(first, second, gap) {
    const spacing = Math.max(0, finite(gap));
    return !(
      first.maxX + spacing <= second.minX || second.maxX + spacing <= first.minX ||
      first.maxY + spacing <= second.minY || second.maxY + spacing <= first.minY
    );
  }


  function resolveColumnCount(layout) {
    const mode = String(layout && layout.mode || 'AUTO').toUpperCase();
    if (mode === 'ONE_COLUMN') return 1;
    if (mode === 'TWO_COLUMNS') return 2;
    const parsedMode = mode.match(/^COLUMNS?_(\d+)$/);
    if (parsedMode) return Math.max(1, Math.min(10, Number(parsedMode[1]) || 1));
    if (mode !== 'AUTO' && Number(layout && layout.columnCount) > 0) return Math.max(1, Math.min(10, Number(layout.columnCount) || 1));
    return 2;
  }

  function buildProjectDrawing(project) {
    const validation = root.PulumurStandaloneProject.validateProject(project);
    if (!validation.valid) throw new Error(validation.errors.map(item => item.message).join('\n'));
    const visible = root.PulumurStandaloneProject.expandedPositions(project);
    const items = visible.map(position => buildItem(project, position));
    const config = {
      columnCount: resolveColumnCount(project.layout),
      horizontalGap: 800, verticalGap: 800, pageMargin: 200, titleGap: 150,
      ...project.layout
    };
    config.columnCount = config.mode === 'AUTO' ? 2 : resolveColumnCount(config);

    const entities = [];
    const placed = [];
    let cursorY = -Math.max(0, finite(config.pageMargin));
    let firstRow = true;
    for (let index = 0; index < items.length; index += config.columnCount) {
      const row = items.slice(index, index + config.columnCount);
      const rowPlaced = [];
      let cursorX = config.pageMargin;
      row.forEach((item, column) => {
        if (column > 0) cursorX = placed.at(-1).bounds.maxX + config.horizontalGap;
        const dx = cursorX - item.bounds.minX;
        const dy = firstRow ? cursorY - item.bounds.minY : cursorY - item.bounds.maxY;
        const translatedBounds = {
          minX: item.bounds.minX + dx, minY: item.bounds.minY + dy,
          maxX: item.bounds.maxX + dx, maxY: item.bounds.maxY + dy
        };
        translatedBounds.width = translatedBounds.maxX - translatedBounds.minX;
        translatedBounds.height = translatedBounds.maxY - translatedBounds.minY;
        const translated = item.drawing.entities.map(entity => translateEntity(entity, dx, dy));
        const interaction = {
          type: 'interaction', kind: 'productEditor', x: translatedBounds.minX, y: translatedBounds.minY,
          w: translatedBounds.width, h: translatedBounds.height, layoutNeutral: true,
          data: { placementId: item.position.id, productType: item.position.productType, pozNo: item.position.positionNo, placementView: 'standalone' }
        };
        translated.push(interaction);
        entities.push(...translated);
        const placedItem = { ...item, dx, dy, bounds: translatedBounds, entities: translated };
        placed.push(placedItem);
        rowPlaced.push(placedItem);
        cursorX = translatedBounds.maxX;
      });
      cursorY = Math.min(...rowPlaced.map(item => item.bounds.minY)) - config.verticalGap;
      firstRow = false;
    }

    for (let first = 0; first < placed.length; first += 1) {
      for (let second = first + 1; second < placed.length; second += 1) {
        if (intersects(placed[first].bounds, placed[second].bounds, 0.01)) {
          throw new Error(`${placed[first].position.positionNo} ile ${placed[second].position.positionNo} çizimleri çakışıyor.`);
        }
      }
    }

    const bounds = placed.length ? normalizeBounds({
      minX: Math.min(...placed.map(item => item.bounds.minX)), minY: Math.min(...placed.map(item => item.bounds.minY)),
      maxX: Math.max(...placed.map(item => item.bounds.maxX)), maxY: Math.max(...placed.map(item => item.bounds.maxY))
    }) : normalizeBounds({ minX: 0, minY: 0, maxX: 1, maxY: 1 });

    const result = {
      entities, blocks: {}, bounds,
      layers: [...new Set(['PLMR_POZ_TEXT', ...placed.flatMap(item => item.drawing.layers || [])])],
      layerStyle: (root.PulumurGeometry && root.PulumurGeometry.LAYER_STYLE) || {},
      positions: placed, layout: config
    };
    return root.PulumurSceneGraph && typeof root.PulumurSceneGraph.attachDrawing === 'function'
      ? root.PulumurSceneGraph.attachDrawing(result, { productType: 'STANDALONE_PROJECT', instanceId: project.id || project.projectInfo && project.projectInfo.projectCode || 'STANDALONE-PROJECT', viewId: 'LAYOUT' })
      : result;
  }

  function paginate(placed, pageCapacity) {
    const capacity = Math.max(1, Number(pageCapacity) || 4);
    const pages = [];
    for (let index = 0; index < placed.length; index += capacity) pages.push(placed.slice(index, index + capacity));
    return pages;
  }

  const api = { translateEntity, titleEntities, optionSummary, wrapText, geometryBounds, buildItem, buildProjectDrawing, intersects, paginate };
  root.PulumurStandaloneLayout = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
