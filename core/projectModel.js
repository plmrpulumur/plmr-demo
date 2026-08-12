(function (global) {
  'use strict';

  const SCHEMA_VERSION = 2;
  const META_FIELDS = new Set(['product', 'moduleName', 'engine', 'customer', 'project', 'version', 'drawnBy', 'date']);
  const TOPOLOGY_FIELDS = new Set(['systemCount', 'width', 'opening', 'rearHeight', 'frontHeight', 'rayCount', 'postCount']);
  const DEFAULT_WORKSPACE = Object.freeze({ product: 'P3DV_BIOCLIMATIC', moduleName: 'Module 1', engine: 'Web 3D' });
  const DEFAULT_FORM = Object.freeze({
    product: 'Pergo Rise', moduleName: 'Module 1', engine: 'Web DXF', customer: '', project: '', version: '01', drawnBy: 'AYETULLAH KILINC', date: '',
    systemCount: '1', width: '', opening: '', rearHeight: '', frontHeight: '', rayCount: '', postCount: '',
    parapet: 'HAYIR', parapetHeight: '-', glassTrack: 'HAYIR', glassRayBoundaryMode: 'DARALT', sideTrack: 'HAYIR', structureColor: '-', fabric: '-', fabricProfiles: '-', motor: '-', remote: '-', led: '-', dimmer: '-', extras: '-', triangleJoinery: 'HAYIR', waterStandard: 'EVET', waterOutletPlacement: 'BOTH'
  });

  function clone(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function object(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
  function array(value) { return Array.isArray(value) ? value : []; }
  function text(value, fallback = '') { return value === undefined || value === null ? fallback : String(value); }
  function positiveInteger(value, fallback = 1) {
    const number = Math.round(Number(value));
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }
  function finite(value, fallback = 0) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }

  function normalizeIndependentSideViewVisibility(raw) {
    const source = object(raw);
    const out = {};
    Object.entries(source).forEach(([groupId, positions]) => {
      const group = {};
      Object.entries(object(positions)).forEach(([positionId, visibility]) => {
        const item = object(visibility);
        group[String(positionId)] = {
          leftSideVisible: item.leftSideVisible !== false,
          rightSideVisible: item.rightSideVisible !== false
        };
      });
      out[String(groupId)] = group;
    });
    return out;
  }

  const REAR_POST_PRESETS = Object.freeze({
    '100x100x3': { width: 100, depth: 100, thickness: 3 },
    '100x150x3': { width: 100, depth: 150, thickness: 3 },
    '120x120x3': { width: 120, depth: 120, thickness: 3 },
    '150x150x3': { width: 150, depth: 150, thickness: 3 }
  });
  const REAR_BEAM_PRESETS = Object.freeze({
    '100x100x3': { planDepth: 100, elevationHeight: 100, thickness: 3 },
    '100x100x5': { planDepth: 100, elevationHeight: 100, thickness: 5 },
    '100x150x3': { planDepth: 100, elevationHeight: 150, thickness: 3 },
    '100x150x5': { planDepth: 100, elevationHeight: 150, thickness: 5 },
    '100x200x3': { planDepth: 100, elevationHeight: 200, thickness: 3 },
    '100x200x5': { planDepth: 100, elevationHeight: 200, thickness: 5 }
  });

  function profileLabel(first, second, thickness) {
    const clean = value => String(Number(Number(value).toFixed(3)));
    return `${clean(first)}x${clean(second)}x${clean(thickness)} mm`;
  }

  function normalizeRearPostProfile(raw) {
    const source = object(raw);
    const requestedKey = text(source.key).trim();
    const preset = REAR_POST_PRESETS[requestedKey];
    const isCustom = source.source === 'custom' || requestedKey === 'custom' || (!preset && (source.width !== undefined || source.depth !== undefined || source.thickness !== undefined));
    const fallback = REAR_POST_PRESETS['100x100x3'];
    const base = isCustom ? source : (preset || fallback);
    const width = Math.max(1, finite(base.width, fallback.width));
    const depth = Math.max(1, finite(base.depth, fallback.depth));
    const thickness = Math.min(width, depth, Math.max(0.1, finite(base.thickness, fallback.thickness)));
    const key = isCustom ? null : (preset ? requestedKey : '100x100x3');
    return { source: isCustom ? 'custom' : 'preset', key, width, depth, thickness, label: profileLabel(width, depth, thickness) };
  }

  function normalizeRearBeamProfile(raw) {
    const source = object(raw);
    const requestedKey = text(source.key).trim();
    const preset = REAR_BEAM_PRESETS[requestedKey] || REAR_BEAM_PRESETS['100x100x3'];
    const planDepth = Math.max(1, finite(source.planDepth !== undefined ? source.planDepth : source.width, preset.planDepth));
    const elevationHeight = Math.max(1, finite(source.elevationHeight !== undefined ? source.elevationHeight : source.height, preset.elevationHeight));
    const thickness = Math.min(planDepth, elevationHeight, Math.max(0.1, finite(source.thickness, preset.thickness)));
    const matchedKey = REAR_BEAM_PRESETS[requestedKey] ? requestedKey : '100x100x3';
    return { source: 'preset', key: matchedKey, width: planDepth, height: elevationHeight, planDepth, elevationHeight, thickness, label: profileLabel(planDepth, elevationHeight, thickness) };
  }

  function normalizeRearSupport(raw) {
    const source = object(raw);
    return {
      type: text(source.type).trim().toLowerCase() === 'steel' ? 'steel' : 'wall',
      postProfile: normalizeRearPostProfile(source.postProfile),
      beamProfile: normalizeRearBeamProfile(source.beamProfile)
    };
  }

  function legacyKeyToScopeName(rawKey) {
    const key = text(rawKey).trim().toLowerCase();
    if (key === 'right') return 'right';
    if (key === 'left' || key === '0' || key === '') return 'left';
    const index = Math.max(1, positiveInteger(key.replace(/^middle[_:-]?/, ''), 1));
    return `middle_${index}`;
  }

  function scopeNameToLegacyKey(scopeName) {
    const name = text(scopeName).trim().toLowerCase();
    if (name === 'right') return 'right';
    if (name === 'left') return '0';
    return String(Math.max(1, positiveInteger(name.replace(/^middle_?/, ''), 1)));
  }


  function backWallGridCellsAreValid(cells, bounds) {
    if (!Array.isArray(cells) || !cells.length) return false;
    const epsilon = 1e-7;
    const ids = new Set();
    for (const cell of cells) {
      if (!cell || ids.has(cell.id)) return false;
      ids.add(cell.id);
      if (!(cell.maxX > cell.minX && cell.maxY > cell.minY)) return false;
      if (cell.minX < bounds.minX - epsilon || cell.maxX > bounds.maxX + epsilon || cell.minY < bounds.minY - epsilon || cell.maxY > bounds.maxY + epsilon) return false;
    }
    const enabledCells = cells.filter(cell => cell.enabled !== false);
    for (let left = 0; left < enabledCells.length; left += 1) {
      for (let right = left + 1; right < enabledCells.length; right += 1) {
        const overlapX = Math.min(enabledCells[left].maxX, enabledCells[right].maxX) - Math.max(enabledCells[left].minX, enabledCells[right].minX);
        const overlapY = Math.min(enabledCells[left].maxY, enabledCells[right].maxY) - Math.max(enabledCells[left].minY, enabledCells[right].minY);
        if (overlapX > epsilon && overlapY > epsilon) return false;
      }
    }
    return true;
  }

  function normalizeBackWallGrid(rawGrid, legacySegments, depth, height) {
    const legacyList = array(legacySegments);
    const legacyDepth = legacyList.reduce((value, item) => Math.max(value, finite(object(item).end, 0)), 0);
    const legacyHeight = legacyList.reduce((value, item) => Math.max(value, finite(object(item).height, 0)), 0);
    const safeDepth = Math.max(1, finite(depth, 600), legacyDepth);
    const safeHeight = Math.max(0, finite(height, 0), legacyHeight);
    const source = object(rawGrid);
    const rawBounds = object(source.bounds);
    const rawMaxY = Number(rawBounds.maxY);
    // Yüksekliği 0 olan legacy/default duvar, gerçek yan görünüş arka
    // yüksekliğini render sırasında kullanır. V12.3'ün 1 mm'lik pozitif grid
    // yer tutucusu bu niyeti kaybetmemeli; aksi halde duvar görünmez ve hit-area
    // yalnız 1 mm kalır. Alan additive'dir ve gerçek kullanıcı gridlerini bozmaz.
    const autoHeight = (source.autoHeight === true && (!Number.isFinite(rawMaxY) || rawMaxY <= 1.000001)) || (source.autoHeight !== false
      && !(finite(height, 0) > 0) && !(legacyHeight > 0)
      && (!Number.isFinite(rawMaxY) || rawMaxY <= 1.000001));
    let minX = finite(rawBounds.minX, 0);
    let maxX = finite(rawBounds.maxX, safeDepth);
    let minY = finite(rawBounds.minY, 0);
    let maxY = finite(rawBounds.maxY, safeHeight);
    if (!(maxX > minX)) { minX = 0; maxX = safeDepth; }
    if (!(maxY > minY)) { minY = 0; maxY = Math.max(1, safeHeight); }

    const rawCells = array(source.cells);
    const candidateCells = rawCells.map((cell, index) => {
      const item = object(cell);
      const cellMinX = finite(item.minX, minX);
      const cellMaxX = finite(item.maxX, maxX);
      const cellMinY = finite(item.minY, minY);
      const cellMaxY = finite(item.maxY, maxY);
      if (!(cellMaxX > cellMinX && cellMaxY > cellMinY)) return null;
      return {
        id: text(item.id, `back_wall_cell_${index + 1}`), ...(item.enabled === false ? { enabled: false } : {}),
        minX: cellMinX, maxX: cellMaxX, minY: cellMinY, maxY: cellMaxY
      };
    }).filter(Boolean);
    const gridBounds = { minX, maxX, minY, maxY };
    const normalizedCells = candidateCells.length === rawCells.length && backWallGridCellsAreValid(candidateCells, gridBounds)
      ? candidateCells
      : [];

    const cells = normalizedCells.length ? normalizedCells : legacyList.map((segment, index) => {
      const item = object(segment);
      const start = Math.max(minX, finite(item.start, minX));
      const end = Math.min(maxX, finite(item.end, maxX));
      const segmentHeight = Math.min(maxY, Math.max(minY, finite(item.height, maxY)));
      if (!(end > start && segmentHeight > minY)) return null;
      return {
        id: text(item.id, `back_wall_cell_${index + 1}`),
        minX: start, maxX: end, minY, maxY: segmentHeight
      };
    }).filter(Boolean);

    const coordinateCount = (items, first, second) => new Set(items.flatMap(item => [item[first], item[second]]).map(value => Number(value).toFixed(6))).size;
    const finalCells = cells.length ? cells : [{ id: 'back_wall_cell_1', minX, maxX, minY, maxY }];
    return {
      version: 1,
      autoHeight,
      columns: Math.max(1, positiveInteger(source.columns, Math.max(1, coordinateCount(finalCells, 'minX', 'maxX') - 1))),
      rows: Math.max(1, positiveInteger(source.rows, Math.max(1, coordinateCount(finalCells, 'minY', 'maxY') - 1))),
      bounds: gridBounds,
      cells: finalCells
    };
  }

  function emptyScope(name, enabled) {
    return {
      key: name,
      enabled: enabled !== false,
      editable: true,
      master: name === 'right',
      glassTrack: { enabled: null, lengthOffset: 0, supportProfile: null },
      triangle: { enabled: null, divisionCount: null },
      supportCenters: null,
      supportPosts: [],
      horizontalProfiles: [],
      autoSupportSuppressed: false,
      parapetSegments: [],
      backWall: { enabled: true, xOffset: 0, depth: 600, height: 0, segments: [], grid: normalizeBackWallGrid(null, [], 600, 0) },
      products: { sliding: [], guillotine: [], zipScreen: [] },
      dimensionOffsets: {}
    };
  }

  function dimensionOffsetBelongsToScope(rawKey, scopeName) {
    const key = text(rawKey).toLowerCase();
    const legacyKey = scopeNameToLegacyKey(scopeName);
    const identifiers = scopeName === 'left' ? ['0', 'left'] : scopeName === 'right' ? ['right'] : [legacyKey];
    return identifiers.some(identifier => [
      `side_parapet_width_${identifier}_`,
      `side_gap_${identifier}_`,
      `side_glass_track_to_wall_${identifier}_`,
      `side_parapet_height_${identifier}_`,
      `side_gutter_to_parapet_${identifier}_`,
      `side_opening_${identifier}_`,
      `side_rear_height_${identifier}_`,
      `side_front_height_${identifier}_`
    ].some(prefix => key.startsWith(prefix)));
  }

  function scopedDimensionOffsets(allOffsets, scopeName) {
    return Object.fromEntries(Object.entries(object(allOffsets))
      .filter(([key]) => dimensionOffsetBelongsToScope(key, scopeName))
      .map(([key, value]) => [key, clone(value)]));
  }

  function normalizeScope(rawScope, name, enabled) {
    const base = emptyScope(name, enabled);
    const source = object(rawScope);
    const glassTrack = object(source.glassTrack);
    const triangle = object(source.triangle);
    const backWall = object(source.backWall);
    const products = object(source.products);
    return {
      ...base,
      ...clone(source),
      key: name,
      enabled: name === 'left' || name === 'right' ? true : source.enabled === true,
      editable: source.editable !== false,
      master: name === 'right',
      glassTrack: {
        enabled: glassTrack.enabled === undefined ? base.glassTrack.enabled : glassTrack.enabled,
        lengthOffset: finite(glassTrack.lengthOffset, 0),
        supportProfile: clone(glassTrack.supportProfile) || null
      },
      triangle: {
        enabled: triangle.enabled === undefined ? base.triangle.enabled : triangle.enabled,
        divisionCount: triangle.divisionCount === undefined ? base.triangle.divisionCount : triangle.divisionCount
      },
      supportCenters: source.supportCenters === null || source.supportCenters === undefined ? null : finite(source.supportCenters, 0),
      supportPosts: clone(array(source.supportPosts)),
      horizontalProfiles: clone(array(source.horizontalProfiles)),
      autoSupportSuppressed: source.autoSupportSuppressed === true,
      parapetSegments: clone(array(source.parapetSegments)),
      trapezSheetBounds: clone(object(source.trapezSheetBounds)),
      backWall: {
        enabled: backWall.enabled !== false,
        xOffset: finite(backWall.xOffset, 0),
        depth: Math.max(1, finite(backWall.depth, 600)),
        height: Math.max(0, finite(backWall.height, 0)),
        segments: clone(array(backWall.segments)),
        grid: normalizeBackWallGrid(backWall.grid, backWall.segments, backWall.depth, backWall.height)
      },
      products: {
        sliding: clone(array(products.sliding)),
        guillotine: clone(array(products.guillotine)),
        zipScreen: clone(array(products.zipScreen))
      },
      dimensionOffsets: clone(object(source.dimensionOffsets))
    };
  }

  function normalizeWorkspaces(raw) {
    const source = object(raw);
    const rawP3dv = object(source.p3dv);
    const identity = global.PulumurP3DVProductIdentity;
    const registry = global.PulumurProductRegistry;
    const canonicalWorkspaceProduct = value => {
      const rawValue = text(value, '').trim();
      if (!rawValue) return '';
      if (rawValue === 'PERGO_RISE' || rawValue === 'Pergo Rise') return 'PERGO_RISE';
      if (identity && typeof identity.productId === 'function') {
        const embedded = identity.productId(rawValue);
        if (embedded) return embedded;
      }
      if (registry && typeof registry.getProduct === 'function') {
        const adapter = registry.getProduct(rawValue);
        if (adapter) return adapter.id;
      }
      return rawValue;
    };
    const canonicalFromGroup = value => identity && typeof identity.productIdForGroup === 'function' ? identity.productIdForGroup(value) : '';
    const rawSnapshots = object(rawP3dv.snapshots);
    const snapshots = {};
    const snapshotStamps = {};
    Object.entries(rawSnapshots).forEach(([productId, entry]) => {
      const item = object(entry);
      const snapshot = item.snapshot && typeof item.snapshot === 'object' ? clone(item.snapshot) : null;
      if (!snapshot) return;
      const group = text(item.productGroup, text(object(snapshot.modelState).productGroup, ''));
      const canonicalId = canonicalFromGroup(group) || canonicalWorkspaceProduct(productId) || String(productId);
      const stamp = text(item.updatedAt, text(snapshot.capturedAt, ''));
      if (snapshots[canonicalId] && stamp < (snapshotStamps[canonicalId] || '')) return;
      snapshots[canonicalId] = {
        productGroup: group,
        snapshot,
        updatedAt: stamp
      };
      snapshotStamps[canonicalId] = stamp;
    });
    const defaultActiveProductId = DEFAULT_WORKSPACE.product;
    const activeSnapshotGroup = text(object(object(rawP3dv.snapshot).modelState).productGroup, '');
    const activeProductId = canonicalWorkspaceProduct(source.activeProductId)
      || canonicalWorkspaceProduct(rawP3dv.productId)
      || canonicalFromGroup(rawP3dv.productGroup)
      || canonicalFromGroup(activeSnapshotGroup)
      || defaultActiveProductId;
    const explicitMode = String(source.activeMode || '').toLowerCase();
    const activeMode = explicitMode === '2d' || explicitMode === '3d'
      ? explicitMode
      : (activeProductId === 'PERGO_RISE' ? '2d' : '3d');
    const productId = canonicalWorkspaceProduct(rawP3dv.productId)
      || canonicalFromGroup(rawP3dv.productGroup)
      || canonicalFromGroup(activeSnapshotGroup)
      || (activeProductId !== 'PERGO_RISE' ? activeProductId : '');
    const activeSnapshot = rawP3dv.snapshot && typeof rawP3dv.snapshot === 'object'
      ? clone(rawP3dv.snapshot)
      : (productId && snapshots[productId] ? clone(snapshots[productId].snapshot) : null);
    return {
      schema: 'plmr-unified-workspaces-v1',
      activeProductId,
      activeMode,
      p3dv: {
        schema: 'plmr-p3dv-workspace-v1',
        productId,
        productGroup: text(rawP3dv.productGroup, productId && snapshots[productId] ? snapshots[productId].productGroup : ''),
        snapshot: activeSnapshot,
        snapshots,
        updatedAt: text(rawP3dv.updatedAt, productId && snapshots[productId] ? snapshots[productId].updatedAt : '')
      }
    };
  }

  function patchWorkspaces(rawModel, patch) {
    const model = normalize(rawModel);
    const source = object(patch);
    const currentP3dv = object(model.workspaces.p3dv);
    const patchP3dv = object(source.p3dv);
    const mergedSnapshots = patchP3dv.replaceSnapshots === true
      ? clone(object(patchP3dv.snapshots))
      : {
          ...clone(object(currentP3dv.snapshots)),
          ...clone(object(patchP3dv.snapshots))
        };
    model.workspaces = normalizeWorkspaces({
      ...model.workspaces,
      ...clone(source),
      p3dv: { ...currentP3dv, ...clone(patchP3dv), snapshots: mergedSnapshots }
    });
    model.metadata.updatedAt = new Date().toISOString();
    return model;
  }

  function createEmpty() {
    const now = new Date().toISOString();
    return {
      schemaVersion: SCHEMA_VERSION,
      metadata: {
        product: DEFAULT_WORKSPACE.product, moduleName: DEFAULT_WORKSPACE.moduleName, engine: DEFAULT_WORKSPACE.engine,
        customer: '', project: '', version: '01', drawnBy: DEFAULT_FORM.drawnBy, date: '',
        createdAt: now, updatedAt: now
      },
      topology: {
        systemCount: 1,
        raw: { systemCount: '1', width: '', opening: '', rearHeight: '', frontHeight: '', rayCount: '', postCount: '' },
        systems: [],
        independentMode: false,
        independentPergoRiseGroups: [],
        rightMaster: true
      },
      positions: [],
      frontView: {
        manualPostPlacementMode: 'standard',
        glassTrackProfile: { mode: 'standard', en: 100, boy: 100, et: 2 },
        postCenters: null,
        rayPositions: null,
        postProfiles: [],
        horizontalProfiles: [],
        postExtensions: [],
        parapetSegments: [],
        topBackWallSegments: {},
        topBackWallGridState: {},
        rearSupport: normalizeRearSupport(null),
        gutter: { minusXDelta: 0, plusXDelta: 0 },
        waterOutletPipeState: { diameter: 70, length: 300, offsets: {}, deleted: {} },
        upperTableTransform: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
        trapezSheetBounds: {}
      },
      sideViews: { left: emptyScope('left', true), right: emptyScope('right', true), middle: {} },
      viewVisibility: { independentSideViews: {} },
      products: { front: { sliding: [], guillotine: [], zipScreen: [] } },
      dimensions: {
        filter: { main: true, all: false, preset: 'main', horizontal: true, vertical: true, editable: true, readonly: true, positions: null },
        offsets: {},
        hiddenIds: []
      },
      drawingOptions: Object.fromEntries(Object.entries(DEFAULT_FORM).filter(([key]) => !META_FIELDS.has(key) && !TOPOLOGY_FIELDS.has(key))),
      workspaces: normalizeWorkspaces(null),
      revisionInfo: { projectId: null, projectCode: null, revisionNo: 1, serverVersion: null },
      manualInputFlags: { rayCount: false, postCount: false },
      language: 'tr',
      orphans: { sideViews: {}, frontProducts: [], notes: [] },
      lastAction: null
    };
  }

  function normalizeFormData(raw) {
    const source = object(raw);
    const out = { ...DEFAULT_FORM };
    Object.keys(DEFAULT_FORM).forEach(key => {
      if (source[key] !== undefined && source[key] !== null) out[key] = text(source[key]);
    });
    out.systemCount = text(out.systemCount).trim();
    return out;
  }

  function normalizePositions(input, formData) {
    const normalized = object(input);
    const rules = global.PulumurMultiPositionRules;
    const normalizedPositions = array(normalized.positions);
    const count = normalized.independentMode && normalizedPositions.length
      ? normalizedPositions.length
      : Math.max(1, positiveInteger(formData.systemCount, 1));
    const normalizedSystems = array(normalized.systems);
    const canonicalSystemWidth = index => {
      const system = object(normalizedSystems[index]);
      const direct = finite(system.systemWidth, 0) || finite(system.mechanismWidth, 0) || finite(system.width, 0);
      if (direct > 0) return direct;
      const x1 = Number(system.mechanismStartX);
      const x2 = Number(system.mechanismEndX);
      return Number.isFinite(x1) && Number.isFinite(x2) && x2 > x1 ? x2 - x1 : 0;
    };
    if (normalizedPositions.length === count) {
      return normalizedPositions.map((position, index) => {
        const systemWidth = canonicalSystemWidth(index);
        const positionWidth = finite(position.width, 0);
        return {
          id: text(position.positionId || position.id, `position_${index + 1}`),
          positionId: text(position.positionId || position.id, `position_${index + 1}`), index,
          independentGroupId: text(position.independentGroupId || position.groupId, ''),
          independentGroupIndex: Math.max(0, finite(position.independentGroupIndex !== undefined ? position.independentGroupIndex : position.groupIndex, 0)),
          groupPositionIndex: Math.max(0, finite(position.groupPositionIndex !== undefined ? position.groupPositionIndex : position.positionIndex, index)),
          yAlignmentMode: text(position.yAlignmentMode, 'FRONT_GUTTER_ALIGNED'),
          width: systemWidth > 0 ? systemWidth : positionWidth,
          opening: finite(position.opening, 0), rearHeight: finite(position.rearHeight, 0),
          frontHeight: finite(position.frontHeight, finite(normalized.frontHeight, 0)),
          rayCount: positiveInteger(position.rayCount || normalizedSystems[index] && normalizedSystems[index].rayCount, 1)
        };
      });
    }
    const split = value => text(value).split(';').map(token => token.trim()).filter(token => token && token.toLocaleUpperCase('tr-TR') !== 'NO');
    const widthResult = rules ? rules.parseWidth(formData.width, count) : null;
    const parsedWidths = widthResult && widthResult.ok ? widthResult.widths : split(formData.width).map(value => finite(value, 0));
    const width = Array.from({ length: count }, (_, index) => canonicalSystemWidth(index) || finite(parsedWidths[index] === undefined ? (parsedWidths.length === 1 ? parsedWidths[0] : 0) : parsedWidths[index], 0));
    const openingResult = rules ? rules.parsePositionValues(formData.opening, count, { allowSingle: true }) : null;
    const rearResult = rules ? rules.parsePositionValues(formData.rearHeight, count, { allowSingle: true }) : null;
    const frontResult = rules ? rules.parsePositionValues(formData.frontHeight, count, { firstOnly: true }) : null;
    const rayResult = rules ? rules.parsePositionValues(formData.rayCount, count, { allowBlank: true, allowSingle: true }) : null;
    const opening = openingResult && openingResult.ok ? rules.expand(openingResult.values, count, 0) : split(formData.opening).map(value => finite(value, 0));
    const rearHeight = rearResult && rearResult.ok ? rules.expand(rearResult.values, count, 0) : split(formData.rearHeight).map(value => finite(value, 0));
    const front = frontResult && frontResult.ok && frontResult.values.length ? frontResult.values[0] : finite(split(formData.frontHeight)[0], 0);
    const rayCount = rayResult && rayResult.ok ? rules.expand(rayResult.values, count, 1) : split(formData.rayCount).map(value => positiveInteger(value, 1));
    const at = (list, index, fallback = 0) => finite(list[index] === undefined ? (list.length === 1 ? list[0] : fallback) : list[index], fallback);
    return Array.from({ length: count }, (_, index) => ({
      id: `position_${index + 1}`, index,
      width: at(width, index), opening: at(opening, index), rearHeight: at(rearHeight, index),
      frontHeight: front, rayCount: positiveInteger(at(rayCount, index, 1), 1)
    }));
  }

  function sideMapValue(source, scopeName, fallback) {
    const map = object(source);
    if (scopeName === 'left') return map.left !== undefined ? map.left : fallback;
    if (scopeName === 'right') return map.right !== undefined ? map.right : fallback;
    const key = scopeNameToLegacyKey(scopeName);
    return object(map.middle)[key] !== undefined ? object(map.middle)[key] : fallback;
  }

  function keyedValue(source, scopeName, fallback) {
    const map = object(source);
    const key = scopeNameToLegacyKey(scopeName);
    return map[key] !== undefined ? map[key] : fallback;
  }

  function scopeNamesFromState(state) {
    const names = new Set(['left', 'right']);
    const addLegacyKey = key => {
      const name = legacyKeyToScopeName(key);
      if (name.startsWith('middle_')) names.add(name);
    };
    const keyedSources = [state.sidePosts, state.sideSupportCenters, state.sideAutoSupportSuppressed, object(state.horizontalFacadeProfiles).side, object(state.parapetSegments).side, object(state.backWallSegments).side, object(state.backWallGridState).side];
    keyedSources.forEach(source => Object.keys(object(source)).forEach(addLegacyKey));
    ['middleEnabled'].forEach(key => Object.keys(object(object(state.sideFeatureState)[key])).forEach(addLegacyKey));
    ['glassTrack', 'triangle'].forEach(key => Object.keys(object(object(object(state.sideFeatureState)[key]).middle)).forEach(addLegacyKey));
    Object.keys(object(object(state.glassTrackLengthOffsets).middle)).forEach(addLegacyKey);
    Object.keys(object(object(state.triangleDivisionState).middle)).forEach(addLegacyKey);
    Object.keys(object(object(state.backWallState).middle)).forEach(addLegacyKey);
    array(state.sideSlidingPlacements).concat(array(state.sideGuillotinePlacements), array(state.sideZipScreenPlacements)).forEach(item => addLegacyKey(item.sideViewKey === undefined ? item.sideIndex : item.sideViewKey));
    return Array.from(names).sort((a, b) => {
      if (a === 'left') return -1;
      if (b === 'left') return 1;
      if (a === 'right') return 1;
      if (b === 'right') return -1;
      return positiveInteger(a.replace('middle_', ''), 1) - positiveInteger(b.replace('middle_', ''), 1);
    });
  }

  function scopeFromLegacy(scopeName, state) {
    const scope = emptyScope(scopeName, scopeName === 'left' || scopeName === 'right');
    const key = scopeNameToLegacyKey(scopeName);
    const sideFeatures = object(state.sideFeatureState);
    const middleEnabled = object(sideFeatures.middleEnabled);
    scope.enabled = scopeName === 'left' || scopeName === 'right' ? true : !!middleEnabled[key];
    scope.glassTrack.enabled = sideMapValue(object(sideFeatures.glassTrack), scopeName, null);
    scope.glassTrack.lengthOffset = finite(sideMapValue(object(state.glassTrackLengthOffsets), scopeName, 0), 0);
    const supportProfiles = object(state.glassTrackSupportProfiles);
    scope.glassTrack.supportProfile = clone(scopeName === 'left' ? supportProfiles.left : scopeName === 'right' ? supportProfiles.right : null);
    scope.triangle.enabled = sideMapValue(object(sideFeatures.triangle), scopeName, null);
    scope.triangle.divisionCount = sideMapValue(object(state.triangleDivisionState), scopeName, null);
    scope.supportCenters = keyedValue(state.sideSupportCenters, scopeName, null);
    scope.supportPosts = clone(keyedValue(state.sidePosts, scopeName, [])) || [];
    scope.horizontalProfiles = clone(keyedValue(object(state.horizontalFacadeProfiles).side, scopeName, [])) || [];
    scope.autoSupportSuppressed = keyedValue(state.sideAutoSupportSuppressed, scopeName, false) === true;
    scope.parapetSegments = clone(keyedValue(object(state.parapetSegments).side, scopeName, [])) || [];
    const wall = clone(sideMapValue(object(state.backWallState), scopeName, { xOffset: 0, depth: 600, height: 0 })) || {};
    scope.backWall = {
      enabled: wall.enabled !== false,
      xOffset: finite(wall.xOffset, 0), depth: Math.max(1, finite(wall.depth, 600)), height: Math.max(0, finite(wall.height, 0)),
      segments: clone(keyedValue(object(state.backWallSegments).side, scopeName, [])) || [],
      grid: normalizeBackWallGrid(keyedValue(object(state.backWallGridState).side, scopeName, null), keyedValue(object(state.backWallSegments).side, scopeName, []), wall.depth, wall.height)
    };
    const matches = item => legacyKeyToScopeName(item && (item.sideViewKey === undefined ? item.sideIndex : item.sideViewKey)) === scopeName;
    scope.products.sliding = clone(array(state.sideSlidingPlacements).filter(matches)) || [];
    scope.products.guillotine = clone(array(state.sideGuillotinePlacements).filter(matches)) || [];
    scope.products.zipScreen = clone(array(state.sideZipScreenPlacements).filter(matches)) || [];
    scope.dimensionOffsets = scopedDimensionOffsets(state.previewDimensionOffsets, scopeName);
    return scope;
  }

  function fromLegacy(legacy, previousModel, normalizedInput) {
    const source = object(legacy);
    const state = object(source.drawingState);
    const formData = normalizeFormData(source.formData);
    const previous = object(previousModel);
    const model = createEmpty();
    const previousMetadata = object(previous.metadata);
    model.metadata = {
      product: formData.product, moduleName: formData.moduleName, engine: formData.engine,
      customer: formData.customer, project: formData.project, version: formData.version,
      drawnBy: formData.drawnBy, date: formData.date,
      createdAt: previousMetadata.createdAt || source.createdAt || source.savedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    model.topology.raw = Object.fromEntries(Array.from(TOPOLOGY_FIELDS).map(key => [key, formData[key]]));
    model.topology.systemCount = positiveInteger(formData.systemCount, 1);
    const input = object(normalizedInput);
    model.topology.systems = clone(array(input.systems)) || [];
    model.topology.independentMode = input.independentMode === true;
    model.topology.independentPergoRiseGroups = clone(array(input.independentPergoRiseGroups)) || [];
    model.positions = normalizePositions(input, formData);
    model.topology.systemCount = model.topology.independentMode ? Math.max(1, model.positions.length) : positiveInteger(formData.systemCount, model.positions.length || 1);
    model.frontView = {
      manualPostPlacementMode: text(state.manualPostPlacementMode, 'standard'),
      glassTrackProfile: clone(state.glassTrackProfile) || { mode: 'standard', en: 100, boy: 100, et: 2 },
      postCenters: Array.isArray(state.frontPostCenters) ? state.frontPostCenters.map(value => finite(value, 0)) : null,
      rayPositions: clone(state.customRayPositions) || null,
      postProfiles: clone(array(state.frontPostProfiles)) || [],
      horizontalProfiles: clone(array(object(state.horizontalFacadeProfiles).front)) || [],
      postExtensions: array(state.frontPostExtensions).map(value => Math.max(0, finite(value, 0))),
      parapetSegments: clone(array(object(state.parapetSegments).front)) || [],
      topBackWallSegments: clone(object(state.topBackWallSegments)) || {},
      topBackWallGridState: clone(object(state.topBackWallGridState)) || {},
      rearSupport: normalizeRearSupport(state.rearSupport),
      gutter: {
        minusXDelta: finite(object(state.gutterEditState).minusXDelta, 0),
        plusXDelta: finite(object(state.gutterEditState).plusXDelta, 0),
        groups: clone(object(object(state.gutterEditState).groups)) || {}
      },
      waterOutletPipeState: {
        diameter: Math.max(1, finite(object(state.waterOutletPipeState).diameter, 70)),
        length: Math.max(1, finite(object(state.waterOutletPipeState).length, 300)),
        offsets: clone(object(object(state.waterOutletPipeState).offsets)) || {},
        deleted: clone(object(object(state.waterOutletPipeState).deleted)) || {}
      },
      upperTableTransform: {
        x: finite(object(state.upperTableTransform).x, 0), y: finite(object(state.upperTableTransform).y, 0),
        scaleX: Math.max(0.35, finite(object(state.upperTableTransform).scaleX, 1)),
        scaleY: Math.max(0.35, finite(object(state.upperTableTransform).scaleY, 1))
      },
      trapezSheetBounds: clone(object(state.trapezSheetBounds)) || {}
    };
    model.sideViews = { left: null, right: null, middle: {} };
    scopeNamesFromState(state).forEach(name => {
      const scope = scopeFromLegacy(name, state);
      if (name === 'left' || name === 'right') model.sideViews[name] = scope;
      else model.sideViews.middle[name] = scope;
    });
    model.sideViews.left = model.sideViews.left || emptyScope('left', true);
    model.sideViews.right = model.sideViews.right || emptyScope('right', true);
    model.viewVisibility = { independentSideViews: normalizeIndependentSideViewVisibility(state.independentSideViewVisibility || object(previous.viewVisibility).independentSideViews) };
    model.products.front = {
      sliding: clone(array(state.slidingPlacements)) || [],
      guillotine: clone(array(state.guillotinePlacements)) || [],
      zipScreen: clone(array(state.zipScreenPlacements)) || []
    };
    model.dimensions = {
      filter: clone(object(object(source.uiSettings).dimensions)) || clone(createEmpty().dimensions.filter),
      offsets: clone(object(state.previewDimensionOffsets)) || {},
      hiddenIds: Array.from(new Set(array(state.hiddenDimensionIds).map(value => text(value)).filter(Boolean)))
    };
    model.drawingOptions = Object.fromEntries(Object.entries(formData).filter(([key]) => !META_FIELDS.has(key) && !TOPOLOGY_FIELDS.has(key)));
    const record = object(source.record || source.revisionInfo);
    model.revisionInfo = {
      projectId: record.projectId ? text(record.projectId) : null,
      projectCode: record.projectCode ? text(record.projectCode) : null,
      revisionNo: positiveInteger(record.revisionNo, 1),
      serverVersion: Number.isInteger(Number(record.serverVersion)) && Number(record.serverVersion) > 0
        ? Number(record.serverVersion)
        : null
    };
    model.manualInputFlags = {
      rayCount: !!object(state.manualInputFlags).rayCount,
      postCount: !!object(state.manualInputFlags).postCount
    };
    model.language = object(source.uiSettings).language === 'en' ? 'en' : 'tr';
    model.workspaces = normalizeWorkspaces(previous.workspaces || source.workspaces);
    model.orphans = clone(object(previous.orphans)) || { sideViews: {}, frontProducts: [], notes: [] };
    model.lastAction = clone(source.lastAction || previous.lastAction) || null;
    return normalize(model);
  }

  function formDataFromModel(rawModel) {
    const model = normalize(rawModel);
    return {
      ...DEFAULT_FORM,
      ...clone(model.drawingOptions),
      product: model.metadata.product, moduleName: model.metadata.moduleName, engine: model.metadata.engine,
      customer: model.metadata.customer, project: model.metadata.project, version: model.metadata.version,
      drawnBy: model.metadata.drawnBy, date: model.metadata.date,
      ...clone(model.topology.raw),
      systemCount: text(object(model.topology.raw).systemCount, String(model.topology.systemCount))
    };
  }

  function writeSideMap(target, scopeName, value) {
    if (scopeName === 'left') target.left = clone(value);
    else if (scopeName === 'right') target.right = clone(value);
    else target.middle[scopeNameToLegacyKey(scopeName)] = clone(value);
  }

  function toLegacy(rawModel) {
    const model = normalize(rawModel);
    const sideFeatureState = { glassTrack: { left: null, right: null, middle: {} }, triangle: { left: null, right: null, middle: {} }, middleEnabled: {} };
    const glassTrackLengthOffsets = { left: 0, right: 0, middle: {} };
    const triangleDivisionState = { left: null, right: null, middle: {} };
    const backWallState = { left: { enabled: true, xOffset: 0, depth: 600, height: 0 }, right: { enabled: true, xOffset: 0, depth: 600, height: 0 }, middle: {} };
    const backWallSegments = { side: {} };
    const backWallGridState = { side: {} };
    const parapetSegments = { front: clone(model.frontView.parapetSegments) || [], side: {} };
    const horizontalFacadeProfiles = { front: clone(model.frontView.horizontalProfiles) || [], side: {} };
    const topBackWallSegments = clone(model.frontView.topBackWallSegments) || {};
    const topBackWallGridState = clone(model.frontView.topBackWallGridState) || {};
    const gutterGroups = clone(object(object(model.frontView.gutter).groups)) || {};
    const gutterEditState = {
      minusXDelta: finite(object(model.frontView.gutter).minusXDelta, 0),
      plusXDelta: finite(object(model.frontView.gutter).plusXDelta, 0)
    };
    if (Object.keys(gutterGroups).length) gutterEditState.groups = gutterGroups;
    const sidePosts = {};
    const sideAutoSupportSuppressed = {};
    const sideSupportCenters = {};
    const sideSlidingPlacements = [];
    const sideGuillotinePlacements = [];
    const sideZipScreenPlacements = [];
    const previewDimensionOffsets = clone(model.dimensions.offsets) || {};
    const allScopes = [model.sideViews.left, ...Object.values(model.sideViews.middle), model.sideViews.right].filter(Boolean);
    allScopes.forEach(scope => {
      const name = scope.key;
      const key = scopeNameToLegacyKey(name);
      if (name.startsWith('middle_')) sideFeatureState.middleEnabled[key] = !!scope.enabled;
      writeSideMap(sideFeatureState.glassTrack, name, scope.glassTrack.enabled);
      writeSideMap(sideFeatureState.triangle, name, scope.triangle.enabled);
      writeSideMap(glassTrackLengthOffsets, name, finite(scope.glassTrack.lengthOffset, 0));
      writeSideMap(triangleDivisionState, name, scope.triangle.divisionCount);
      writeSideMap(backWallState, name, { enabled: scope.backWall.enabled !== false, xOffset: finite(scope.backWall.xOffset, 0), depth: Math.max(1, finite(scope.backWall.depth, 600)), height: Math.max(0, finite(scope.backWall.height, 0)) });
      sidePosts[key] = clone(scope.supportPosts) || [];
      horizontalFacadeProfiles.side[key] = clone(scope.horizontalProfiles) || [];
      if (scope.autoSupportSuppressed === true) sideAutoSupportSuppressed[key] = true;
      if (scope.supportCenters !== null && scope.supportCenters !== undefined) sideSupportCenters[key] = finite(scope.supportCenters, 0);
      parapetSegments.side[key] = clone(scope.parapetSegments) || [];
      backWallSegments.side[key] = clone(scope.backWall.segments) || [];
      backWallGridState.side[key] = clone(scope.backWall.grid) || normalizeBackWallGrid(null, scope.backWall.segments, scope.backWall.depth, scope.backWall.height);
      Object.assign(previewDimensionOffsets, clone(scope.dimensionOffsets) || {});
      array(scope.products.sliding).forEach(item => sideSlidingPlacements.push({ ...clone(item), sideViewKey: key, placementView: key === 'right' ? 'side-right' : 'side-left' }));
      array(scope.products.guillotine).forEach(item => sideGuillotinePlacements.push({ ...clone(item), sideViewKey: key, placementView: key === 'right' ? 'side-right' : 'side-left' }));
      array(scope.products.zipScreen).forEach(item => sideZipScreenPlacements.push({ ...clone(item), sideViewKey: key, placementView: key === 'right' ? 'side-right' : 'side-left' }));
    });
    return {
      formData: formDataFromModel(model),
      drawingState: {
        manualPostPlacementMode: model.frontView.manualPostPlacementMode,
        glassTrackProfile: clone(model.frontView.glassTrackProfile),
        glassTrackSupportProfiles: { left: clone(model.sideViews.left.glassTrack.supportProfile), right: clone(model.sideViews.right.glassTrack.supportProfile) },
        frontPostCenters: clone(model.frontView.postCenters), customRayPositions: clone(model.frontView.rayPositions),
        sideSupportCenters, sidePosts, sideAutoSupportSuppressed,
        frontPostProfiles: clone(model.frontView.postProfiles), horizontalFacadeProfiles, frontPostExtensions: clone(model.frontView.postExtensions),
        parapetSegments, topBackWallSegments, topBackWallGridState, rearSupport: clone(model.frontView.rearSupport), gutterEditState, waterOutletPipeState: clone(model.frontView.waterOutletPipeState), upperTableTransform: clone(model.frontView.upperTableTransform), trapezSheetBounds: clone(model.frontView.trapezSheetBounds) || {}, sideFeatureState, glassTrackLengthOffsets, triangleDivisionState, backWallState, backWallSegments, backWallGridState,
        previewDimensionOffsets,
        hiddenDimensionIds: clone(array(model.dimensions.hiddenIds)) || [],
        slidingPlacements: clone(model.products.front.sliding), sideSlidingPlacements,
        guillotinePlacements: clone(model.products.front.guillotine), sideGuillotinePlacements,
        zipScreenPlacements: clone(model.products.front.zipScreen), sideZipScreenPlacements,
        independentSideViewVisibility: clone(object(model.viewVisibility).independentSideViews) || {},
        manualInputFlags: clone(model.manualInputFlags)
      },
      uiSettings: { language: model.language, dimensions: clone(model.dimensions.filter) },
      record: clone(model.revisionInfo)
    };
  }

  function geometryInputFromModel(rawModel) {
    const legacy = toLegacy(rawModel);
    const state = legacy.drawingState;
    return {
      ...legacy.formData,
      __manualPostPlacementMode: state.manualPostPlacementMode,
      __glassTrackProfile: clone(state.glassTrackProfile),
      __glassTrackSupportProfiles: clone(state.glassTrackSupportProfiles),
      __frontPostCenters: clone(state.frontPostCenters),
      __customRayPositions: clone(state.customRayPositions),
      __sideSupportCenters: clone(state.sideSupportCenters),
      __sidePosts: clone(state.sidePosts),
      __sideAutoSupportSuppressed: clone(state.sideAutoSupportSuppressed),
      __frontPostProfiles: clone(state.frontPostProfiles),
      __horizontalFacadeProfiles: clone(state.horizontalFacadeProfiles),
      __frontPostExtensions: clone(state.frontPostExtensions),
      __parapetSegments: clone(state.parapetSegments),
      __topBackWallSegments: clone(state.topBackWallSegments),
      __topBackWallGridState: clone(state.topBackWallGridState),
      __rearSupport: clone(state.rearSupport),
      __gutterEditState: clone(state.gutterEditState),
      __waterOutletPipeState: clone(state.waterOutletPipeState),
      __upperTableTransform: clone(state.upperTableTransform),
      __sideFeatureState: clone(state.sideFeatureState),
      __glassTrackLengthOffsets: clone(state.glassTrackLengthOffsets),
      __triangleDivisionState: clone(state.triangleDivisionState),
      __backWallState: clone(state.backWallState),
      __backWallSegments: clone(state.backWallSegments),
      __backWallGridState: clone(state.backWallGridState),
      __trapezSheetBounds: clone(state.trapezSheetBounds),
      __previewDimensionOffsets: clone(state.previewDimensionOffsets),
      __hiddenDimensionIds: clone(state.hiddenDimensionIds),
      __slidingPlacements: clone(state.slidingPlacements),
      __sideSlidingPlacements: clone(state.sideSlidingPlacements),
      __guillotinePlacements: clone(state.guillotinePlacements),
      __sideGuillotinePlacements: clone(state.sideGuillotinePlacements),
      __zipScreenPlacements: clone(state.zipScreenPlacements),
      __sideZipScreenPlacements: clone(state.sideZipScreenPlacements),
      __independentSideViewVisibility: clone(state.independentSideViewVisibility)
    };
  }

  function setFormField(rawModel, field, value) {
    const model = normalize(rawModel);
    const key = text(field);
    if (META_FIELDS.has(key)) model.metadata[key] = text(value);
    else if (TOPOLOGY_FIELDS.has(key)) {
      model.topology.raw[key] = text(value);
      if (key === 'systemCount') model.topology.systemCount = positiveInteger(value, 1);
    } else model.drawingOptions[key] = text(value);
    model.metadata.updatedAt = new Date().toISOString();
    return model;
  }

  function withNormalizedInput(rawModel, input) {
    const model = normalize(rawModel);
    const normalized = object(input);
    const formData = formDataFromModel(model);
    model.positions = normalizePositions(normalized, formData);
    model.topology.systemCount = Math.max(1, positiveInteger(normalized.systemCount, model.positions.length || model.topology.systemCount));
    model.topology.systems = clone(array(normalized.systems)) || [];
    model.metadata.updatedAt = new Date().toISOString();
    return model;
  }

  function mirrorToken(value) {
    if (typeof value !== 'string') return value;
    const placeholders = { RIGHT: '__PLMR_RIGHT__', LEFT: '__PLMR_LEFT__', INSIDE: '__PLMR_INSIDE__', OUTSIDE: '__PLMR_OUTSIDE__' };
    return value
      .replace(/RIGHT/gi, placeholders.RIGHT).replace(/LEFT/gi, placeholders.LEFT)
      .replace(/INSIDE/gi, placeholders.INSIDE).replace(/OUTSIDE/gi, placeholders.OUTSIDE)
      .replaceAll(placeholders.RIGHT, 'LEFT').replaceAll(placeholders.LEFT, 'RIGHT')
      .replaceAll(placeholders.INSIDE, 'OUTSIDE').replaceAll(placeholders.OUTSIDE, 'INSIDE');
  }

  function mirrorValue(value) {
    if (Array.isArray(value)) return value.map(mirrorValue);
    if (!value || typeof value !== 'object') return mirrorToken(value);
    const out = {};
    Object.entries(value).forEach(([key, item]) => { out[key] = mirrorValue(item); });
    if (Array.isArray(out.panels)) out.panels.reverse();
    if (Array.isArray(out.panelOrder)) out.panelOrder.reverse();
    return out;
  }

  function deriveLastLeftMirror(rawModel) {
    const model = normalize(rawModel);
    const mirror = mirrorValue(model.sideViews.right);
    mirror.key = 'last_left_mirror';
    mirror.enabled = model.topology.systemCount > 1;
    mirror.editable = false;
    mirror.master = false;
    mirror.derivedFrom = 'right';
    return mirror;
  }

  function normalize(rawModel) {
    const source = object(rawModel);
    const model = createEmpty();
    model.schemaVersion = SCHEMA_VERSION;
    model.metadata = { ...model.metadata, ...clone(object(source.metadata)) };
    model.topology = { ...model.topology, ...clone(object(source.topology)), raw: { ...model.topology.raw, ...clone(object(object(source.topology).raw)) }, systems: clone(array(object(source.topology).systems)) || [] };
    model.topology.systemCount = positiveInteger(model.topology.systemCount, 1);
    model.topology.independentMode = model.topology.independentMode === true;
    model.topology.independentPergoRiseGroups = clone(array(model.topology.independentPergoRiseGroups)) || [];
    model.positions = clone(array(source.positions)) || [];
    model.frontView = { ...model.frontView, ...clone(object(source.frontView)) };
    model.frontView.postProfiles = clone(array(model.frontView.postProfiles));
    model.frontView.horizontalProfiles = clone(array(model.frontView.horizontalProfiles));
    model.frontView.postExtensions = clone(array(model.frontView.postExtensions));
    model.frontView.parapetSegments = clone(array(model.frontView.parapetSegments));
    model.frontView.topBackWallSegments = clone(object(model.frontView.topBackWallSegments));
    model.frontView.topBackWallGridState = clone(object(model.frontView.topBackWallGridState));
    model.frontView.rearSupport = normalizeRearSupport(model.frontView.rearSupport);
    model.frontView.gutter = {
      minusXDelta: finite(object(model.frontView.gutter).minusXDelta, 0),
      plusXDelta: finite(object(model.frontView.gutter).plusXDelta, 0),
      groups: clone(object(object(model.frontView.gutter).groups)) || {}
    };
    model.frontView.waterOutletPipeState = {
      diameter: Math.max(1, finite(object(model.frontView.waterOutletPipeState).diameter, 70)),
      length: Math.max(1, finite(object(model.frontView.waterOutletPipeState).length, 300)),
      offsets: clone(object(object(model.frontView.waterOutletPipeState).offsets)) || {},
      deleted: clone(object(object(model.frontView.waterOutletPipeState).deleted)) || {}
    };
    model.frontView.upperTableTransform = {
      x: finite(object(model.frontView.upperTableTransform).x, 0), y: finite(object(model.frontView.upperTableTransform).y, 0),
      scaleX: Math.max(0.35, finite(object(model.frontView.upperTableTransform).scaleX, 1)),
      scaleY: Math.max(0.35, finite(object(model.frontView.upperTableTransform).scaleY, 1))
    };
    model.frontView.trapezSheetBounds = clone(object(model.frontView.trapezSheetBounds));
    const side = object(source.sideViews);
    model.sideViews.left = normalizeScope(side.left, 'left', true);
    model.sideViews.right = normalizeScope(side.right, 'right', true);
    model.sideViews.middle = {};
    Object.entries(object(side.middle)).forEach(([name, scope]) => {
      const canonical = legacyKeyToScopeName(name);
      if (!canonical.startsWith('middle_')) return;
      model.sideViews.middle[canonical] = normalizeScope(scope, canonical, false);
    });
    model.viewVisibility = { independentSideViews: normalizeIndependentSideViewVisibility(object(source.viewVisibility).independentSideViews) };
    model.products = { front: { sliding: clone(array(object(object(source.products).front).sliding)), guillotine: clone(array(object(object(source.products).front).guillotine)), zipScreen: clone(array(object(object(source.products).front).zipScreen)) } };
    model.dimensions = {
      filter: { ...model.dimensions.filter, ...clone(object(object(source.dimensions).filter)) },
      offsets: clone(object(object(source.dimensions).offsets)),
      hiddenIds: Array.from(new Set(array(object(source.dimensions).hiddenIds).map(value => text(value)).filter(Boolean)))
    };
    model.drawingOptions = { ...model.drawingOptions, ...clone(object(source.drawingOptions)) };
    model.workspaces = normalizeWorkspaces(source.workspaces);
    model.revisionInfo = {
      ...model.revisionInfo,
      ...clone(object(source.revisionInfo)),
      revisionNo: positiveInteger(object(source.revisionInfo).revisionNo, 1),
      serverVersion: Number.isInteger(Number(object(source.revisionInfo).serverVersion)) && Number(object(source.revisionInfo).serverVersion) > 0
        ? Number(object(source.revisionInfo).serverVersion)
        : null
    };
    model.manualInputFlags = { ...model.manualInputFlags, ...clone(object(source.manualInputFlags)) };
    model.language = source.language === 'en' ? 'en' : 'tr';
    model.orphans = { ...model.orphans, ...clone(object(source.orphans)), sideViews: clone(object(object(source.orphans).sideViews)), frontProducts: clone(array(object(source.orphans).frontProducts)), notes: clone(array(object(source.orphans).notes)) };
    model.lastAction = clone(source.lastAction) || null;
    return model;
  }

  const api = Object.freeze({
    schemaVersion: SCHEMA_VERSION,
    defaultForm: { ...DEFAULT_FORM },
    createEmpty, normalize, clone, fromLegacy, toLegacy, formDataFromModel, geometryInputFromModel,
    setFormField, withNormalizedInput, normalizeWorkspaces, patchWorkspaces, legacyKeyToScopeName, scopeNameToLegacyKey,
    deriveLastLeftMirror, normalizeBackWallGrid, normalizeRearSupport, normalizeRearPostProfile, normalizeRearBeamProfile, normalizeIndependentSideViewVisibility
  });

  global.PulumurProjectModel = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
