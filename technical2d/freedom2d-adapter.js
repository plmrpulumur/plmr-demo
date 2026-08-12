(function (root) {
  'use strict';

  const SCHEMA = 'plmr-freedom-technical2d-projection-v14.23';
  const PRODUCT_ID = 'P3DV_ROLLING_ROOF';
  const PRODUCT_GROUP = 'b-cube';
  // Rolling Roof / Freedom product-specific visible sections.  Geometry still
  // comes from the canonical P3DVFreedomMultiPosition engine below; these
  // values are only used by the 2D projection for section footprints.
  const PROFILE = Object.freeze({
    post: Object.freeze({ x: 100, z: 220 }),
    beam: Object.freeze({ vertical: 220, thickness: 100 }),
    frontRearFootprint: 100,
    sideFootprint: 100,
    gutterWidth: 0,
    gutterClearance: 0
  });

  function clone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function num(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function range(values, fallbackMin, fallbackMax) {
    const finite = (Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite);
    if (!finite.length) return { min: fallbackMin, max: fallbackMax };
    return { min: Math.min(...finite), max: Math.max(...finite) };
  }
  function entity(type, props) { return Object.freeze({ type, ...props }); }
  function rect(x, y, width, height, role, meta) {
    return entity('rect', { x: num(x, 0), y: num(y, 0), width: Math.max(0, num(width, 0)), height: Math.max(0, num(height, 0)), role: role || 'outline', meta: meta || null });
  }
  function line(x1, y1, x2, y2, role, meta) {
    return entity('line', { x1: num(x1, 0), y1: num(y1, 0), x2: num(x2, 0), y2: num(y2, 0), role: role || 'outline', meta: meta || null });
  }
  function label(x, y, text, role, meta) {
    return entity('text', { x: num(x, 0), y: num(y, 0), text: String(text || ''), role: role || 'label', meta: meta || null });
  }
  function dim(axis, start, end, offset, text, meta) {
    return entity('dimension', { axis: axis === 'y' ? 'y' : 'x', start: num(start, 0), end: num(end, 0), offset: num(offset, 0), text: String(text || ''), role: 'dimension', meta: meta || null });
  }

  const SIDE_TO_FACADE = Object.freeze({ rear: 'front', front: 'back', left: 'left', right: 'right' });
  function productLabel(type) {
    const key = String(type || '').toLowerCase();
    return ({ sliding: 'Sürme', guillotine: 'Giyotin', zip: 'Zip', door: 'Kapı', fixed: 'Sabit Doğrama', folding: 'Katlanır Cam' })[key] || String(type || 'Ürün');
  }
  function contractZones(contract, side) {
    const facadeId = SIDE_TO_FACADE[side] || side;
    return (contract && Array.isArray(contract.zones) ? contract.zones : [])
      .filter(zone => zone && zone.facadeId === facadeId)
      .map(zone => ({ ...zone }));
  }
  function productIsOpen(model, zoneId, slot) {
    const key = slot === 'zip' ? `zip:${zoneId}` : zoneId;
    const states = model && model.productOpenStates && typeof model.productOpenStates === 'object' ? model.productOpenStates : {};
    if (Object.prototype.hasOwnProperty.call(states, key)) return Boolean(states[key]);
    return Boolean(model && model.productsOpen);
  }

  function renderProductDetail(entities, model, zone, placement, slot, x, y, w, h) {
    if (!placement) return;
    const reuse = root.PulumurTechnical2DFacadeNativeReuse;
    if (!reuse || typeof reuse.renderInto !== 'function') throw new Error('TECHNICAL2D_NATIVE_FACADE_REUSE_MISSING');
    reuse.renderInto(entities, model, zone, placement, slot, x, y, w, h);
  }

  function addInteractionZones(entities, model, contract, side) {
    const height = Math.max(1, num(model.height, 0));
    contractZones(contract, side).forEach(zone => {
      const axis = zone.axis === 'z' ? 'z' : 'x';
      const center = axis === 'x' ? num(zone.cx, 0) : num(zone.cz, 0);
      const x = center - Math.max(1, num(zone.width, 0)) / 2;
      const y = num(zone.bottomY, -height / 2) + height / 2;
      const w = Math.max(1, num(zone.width, 0));
      const h = Math.max(1, num(zone.height, 0));
      const zoneMeta = { kind: 'zone', zoneId: zone.id, facadeId: zone.facadeId, zone: clone(zone), interactive: true };
      entities.push(rect(x, y, w, h, 'zone-area', zoneMeta));
      entities.push(dim('x', x, x + w, y - Math.max(80, h * 0.035), `${Math.round(w)}`, { kind: 'zone-width', zoneId: zone.id, facadeId: zone.facadeId, zone: clone(zone), interactive: true }));
      if (zone.bottomBoundaryId !== 'BOTTOM' || zone.topBoundaryId !== 'TOP') {
        entities.push(dim('y', y, y + h, x + w + Math.max(70, w * 0.018), `${Math.round(h)}`, { kind: 'zone-height', zoneId: zone.id, facadeId: zone.facadeId, zone: clone(zone), interactive: true }));
      }
      const primary = contract && contract.placements && contract.placements[zone.id];
      const zip = contract && contract.zipPlacements && contract.zipPlacements[zone.id];
      const reuse = root.PulumurTechnical2DFacadeNativeReuse;
      if (!reuse || typeof reuse.projectionBox !== 'function') throw new Error('TECHNICAL2D_FACADE_PROJECTION_BOX_MISSING');
      if (primary) {
        const box = reuse.projectionBox(zone, primary, 'primary', x, y, w, h);
        entities.push(rect(box.x, box.y, box.width, box.height, 'product-primary', { kind: 'product', slot: 'primary', zoneId: zone.id, facadeId: zone.facadeId, zone: clone(zone), placement: clone(primary), interactive: true }));
        renderProductDetail(entities, model, zone, primary, 'primary', box.x, box.y, box.width, box.height);
      }
      if (zip) {
        const box = reuse.projectionBox(zone, zip, 'zip', x, y, w, h);
        entities.push(rect(box.x, box.y, box.width, box.height, 'product-zip', { kind: 'product', slot: 'zip', zoneId: zone.id, facadeId: zone.facadeId, zone: clone(zone), placement: clone(zip), interactive: true }));
        renderProductDetail(entities, model, zone, zip, 'zip', box.x, box.y, box.width, box.height);
      }
    });
  }

  function postSection(model, post) {
    const section = post && post.section && typeof post.section === 'object' ? post.section : null;
    if (section) return { x: Math.max(20, num(section.x, PROFILE.post.x)), z: Math.max(20, num(section.z, PROFILE.post.z)) };
    const source = Array.isArray(model.postSections) ? model.postSections : [];
    const candidate = post && Number.isInteger(Number(post.sourceIndex)) && Number(post.sourceIndex) >= 0 ? source[Number(post.sourceIndex)] : null;
    return { x: Math.max(20, num(candidate && candidate.x, PROFILE.post.x)), z: Math.max(20, num(candidate && candidate.z, PROFILE.post.z)) };
  }

  function buildLayout(model) {
    const engine = root.P3DVFreedomMultiPosition;
    if (!engine || typeof engine.build !== 'function') throw new Error('FREEDOM_CANONICAL_MULTI_POSITION_ENGINE_MISSING');
    const postSections = Array.isArray(model.postSections) && model.postSections.length >= 4
      ? model.postSections.map(section => ({ x: num(section && section.x, PROFILE.post.x), z: num(section && section.z, PROFILE.post.z) }))
      : Array.from({ length: 4 }, () => ({ ...PROFILE.post }));
    return engine.build({
      systemCount: Math.max(1, Math.round(num(model.systemCount, 1))),
      totalWidth: num(model.width, 0),
      moduleWidths: Array.isArray(model.moduleWidths) ? model.moduleWidths.map(Number) : [],
      depth: num(model.depth, 0),
      moduleDepths: Array.isArray(model.moduleDepths) ? model.moduleDepths.map(Number) : [],
      alignment: model.multiAlignment === 'rear' ? 'rear' : 'front',
      rows: Array.isArray(model.multiRows) ? clone(model.multiRows) : [],
      rowAlignment: model.rowAlignment === 'right' ? 'right' : 'left',
      panelCollection: model.panelCollection === 'outer' ? 'outer' : 'center',
      panelCount: Math.max(0, Math.round(num(model.panelCount, 0))),
      panelCounts: Array.isArray(model.modulePanelCounts) ? model.modulePanelCounts.map(Number) : [],
      height: num(model.height, 0),
      postSections,
      interiorPostSection: { ...PROFILE.post },
      beamSection: model.beamSection || { ...PROFILE.beam }
    });
  }

  function envelopeOf(layout, model) {
    if (layout && layout.envelope) {
      return {
        minX: num(layout.envelope.minX, -num(model.width, 0) / 2),
        maxX: num(layout.envelope.maxX, num(model.width, 0) / 2),
        minZ: num(layout.envelope.minZ, -num(model.depth, 0) / 2),
        maxZ: num(layout.envelope.maxZ, num(model.depth, 0) / 2)
      };
    }
    const modules = Array.isArray(layout && layout.modules) ? layout.modules : [];
    const xs = modules.flatMap(module => [num(module.outerMinX, NaN), num(module.outerMaxX, NaN)]).filter(Number.isFinite);
    const zs = modules.flatMap(module => [num(module.rearOuterZ, NaN), num(module.frontOuterZ, NaN)]).filter(Number.isFinite);
    const xr = range(xs, -num(model.width, 0) / 2, num(model.width, 0) / 2);
    const zr = range(zs, -num(model.depth, 0) / 2, num(model.depth, 0) / 2);
    return { minX: xr.min, maxX: xr.max, minZ: zr.min, maxZ: zr.max };
  }

  function profilesFor(model, facadeId) {
    const map = model.facadeProfiles && typeof model.facadeProfiles === 'object' ? model.facadeProfiles : {};
    return (Array.isArray(map[facadeId]) ? map[facadeId] : []).map(item => ({ ...item }));
  }

  function addFacadeProfiles(entities, model, facadeId, horizontalMin, horizontalMax, clearHeight) {
    const span = Math.max(1, horizontalMax - horizontalMin);
    profilesFor(model, facadeId).forEach(profile => {
      const width = Math.max(40, num(profile.width, 100));
      if (profile.orientation === 'horizontal') {
        const ratio = clamp(num(profile.positionYRatio, 0.5), 0.01, 0.99);
        const y = ratio * clearHeight - width / 2;
        const scopeStart = clamp(num(profile.scopeStartRatio, 0), 0, 1);
        const scopeEnd = clamp(num(profile.scopeEndRatio, 1), 0, 1);
        entities.push(rect(horizontalMin + scopeStart * span, y, Math.max(1, (scopeEnd - scopeStart) * span), width, 'divider-profile', { kind: 'profile', facadeId, profileId: profile.id, orientation: 'horizontal', profile: clone({ ...profile, facadeId }), interactive: true }));
      } else {
        const ratio = clamp(num(profile.positionRatio, 0.5), 0.0001, 0.9999);
        const x = horizontalMin + ratio * span - width / 2;
        entities.push(rect(x, 0, width, clearHeight, 'divider-profile', { kind: 'profile', facadeId, profileId: profile.id, orientation: 'vertical', profile: clone({ ...profile, facadeId }), interactive: true }));
      }
    });
  }

  function freedomPanelProjection(module, model) {
    const zSign = num(module && module.rearToFrontSign, 1) < 0 ? -1 : 1;
    const centerZ = num(module && module.centerZ, 0);
    const centerT = zSign * centerZ;
    const depth = Math.max(200, num(module && module.depth, 0));
    const panelCount = Math.max(0, Math.round(num(module && module.panelCount, 0)));
    const panelLength = Math.max(1, num(module && module.panelLength, num(module && module.clearWidth, 1)));
    const centerX = num(module && module.centerX, 0);
    const moduleRD = Math.max(200, depth - 303);
    // Canonical 3D constants from buildModel/createFreedomPanelInstances:
    // railTop=151, railOffsetFrom151=-92, lamelInsetFrom151=50.
    const startT = centerT - moduleRD / 2 + 109;
    const opened = Boolean(model && model.panelMasterOpen);
    const spacing = opened ? 65 : 216;
    const edges = [];
    for (let i = 0; i < panelCount; i += 1) {
      const edgeT = opened
        ? startT + (panelCount - 1 - i) * spacing
        : 2 * centerT - startT - i * spacing;
      edges.push({ panelIndex: i, z: zSign * edgeT });
    }
    return { zSign, centerZ, centerX, panelCount, panelLength, opened, edges };
  }

  function addFreedomTopStructure(entities, model, layout) {
    const beamThickness = Math.max(20, num(model.beamSection && model.beamSection.thickness, PROFILE.beam.thickness));
    (Array.isArray(layout.beams) ? layout.beams : []).forEach(beam => {
      if (beam.kind === 'width') {
        const inward = Number.isFinite(Number(beam.inwardSign)) ? Number(beam.inwardSign) : (beam.row === 'rear' ? 1 : -1);
        const z = num(beam.z, 0) + inward * beamThickness / 2;
        entities.push(rect(num(beam.x, 0) - num(beam.length, 0) / 2, z - beamThickness / 2, num(beam.length, 0), beamThickness, 'frame-profile', { productKind: 'rolling-roof', beamId: beam.id, beamKind: 'width', moduleIndex: beam.moduleIndex, row: beam.row }));
      } else {
        entities.push(rect(num(beam.x, 0) - beamThickness / 2, num(beam.z, 0) - num(beam.length, 0) / 2, beamThickness, num(beam.length, 0), 'frame-profile', { productKind: 'rolling-roof', beamId: beam.id, beamKind: 'depth', lineIndex: beam.lineIndex }));
      }
    });
    (Array.isArray(layout.modules) ? layout.modules : []).forEach(module => {
      const zSign = num(module.rearToFrontSign, 1) < 0 ? -1 : 1;
      const centerZ = num(module.centerZ, 0), centerT = zSign * centerZ;
      const gutterDepth = Math.max(200, num(module.depth, 0) - 204), half = gutterDepth / 2;
      const gutterCross = 210;
      const rearEdge = zSign * (centerT - half), frontEdge = zSign * (centerT + half);
      const gutterLength = Math.max(1, num(module.gutterWidth, num(module.clearWidth, 1)));
      const centerX = num(module.centerX, 0);
      const rearY = zSign > 0 ? rearEdge : rearEdge - gutterCross;
      const frontY = zSign > 0 ? frontEdge - gutterCross : frontEdge;
      entities.push(rect(centerX - gutterLength / 2, rearY, gutterLength, gutterCross, 'gutter-profile', { productKind: 'rolling-roof', moduleIndex: module.moduleIndex, gutterSide: 'rear' }));
      entities.push(rect(centerX - gutterLength / 2, frontY, gutterLength, gutterCross, 'gutter-profile', { productKind: 'rolling-roof', moduleIndex: module.moduleIndex, gutterSide: 'front' }));
      entities.push(rect(num(module.clearMinX, centerX - gutterLength / 2) + 2, centerZ - gutterDepth / 2, gutterCross, gutterDepth, 'gutter-profile', { productKind: 'rolling-roof', moduleIndex: module.moduleIndex, gutterSide: 'left' }));
      entities.push(rect(num(module.clearMaxX, centerX + gutterLength / 2) - 2 - gutterCross, centerZ - gutterDepth / 2, gutterCross, gutterDepth, 'gutter-profile', { productKind: 'rolling-roof', moduleIndex: module.moduleIndex, gutterSide: 'right' }));
    });
  }

  function buildTopView(model, layout, envelope) {
    const entities = [];
    const modules = Array.isArray(layout.modules) ? layout.modules : [];
    modules.forEach((module, index) => {
      const minZ = Math.min(num(module.rearOuterZ, 0), num(module.frontOuterZ, 0));
      const maxZ = Math.max(num(module.rearOuterZ, 0), num(module.frontOuterZ, 0));
      const outerMinX = num(module.outerMinX, num(module.clearMinX, 0) - PROFILE.sideFootprint);
      const outerMaxX = num(module.outerMaxX, num(module.clearMaxX, 0) + PROFILE.sideFootprint);
      entities.push(rect(outerMinX, minZ, outerMaxX - outerMinX, maxZ - minZ, 'module-outline', { moduleIndex: index, rowIndex: module.rowIndex }));
    });
    addFreedomTopStructure(entities, model, layout);
    modules.forEach((module, index) => {
      const panel = freedomPanelProjection(module, model);
      const panelMinX = panel.centerX - panel.panelLength / 2, panelMaxX = panel.centerX + panel.panelLength / 2;
      const zs = panel.edges.map(item => item.z);
      const minZ = zs.length ? Math.min(...zs) : Math.min(num(module.rearOuterZ, 0), num(module.frontOuterZ, 0));
      const maxZ = zs.length ? Math.max(...zs) : Math.max(num(module.rearOuterZ, 0), num(module.frontOuterZ, 0));
      entities.push(rect(panelMinX, Math.min(minZ, maxZ), panel.panelLength, Math.max(1, Math.abs(maxZ - minZ)), 'panel-zone', { moduleIndex: index, rowIndex: module.rowIndex, canonicalPanelProjection: true }));
      panel.edges.forEach(item => entities.push(line(panelMinX, item.z, panelMaxX, item.z, panel.opened ? 'panel-package' : 'roof-panel', { moduleIndex: index, rowIndex: module.rowIndex, panelIndex: item.panelIndex, collected: panel.opened })));
      if (panel.opened && panel.edges.length) {
        const anchor = panel.edges[Math.floor(panel.edges.length / 2)].z;
        entities.push(label(panel.centerX, anchor, 'PAKET', 'product-state-label', { moduleIndex: index, rowIndex: module.rowIndex, state: 'OPEN/COLLECTED' }));
      }
      entities.push(label((num(module.outerMinX, panelMinX) + num(module.outerMaxX, panelMaxX)) / 2, (num(module.rearOuterZ, minZ) + num(module.frontOuterZ, maxZ)) / 2, `M${index + 1}`, 'module-label', { moduleIndex: index, rowIndex: module.rowIndex }));
    });
    (Array.isArray(layout.posts) ? layout.posts : []).forEach(post => {
      const section = postSection(model, post);
      entities.push(rect(num(post.x, 0) - section.x / 2, num(post.z, 0) - section.z / 2, section.x, section.z, 'post', { postId: post.id, shared: Boolean(post.sharedBoundary || post.sharedAcrossRows) }));
    });
    const width = envelope.maxX - envelope.minX;
    const depth = envelope.maxZ - envelope.minZ;
    const alignmentSide = model.multiAlignment === 'rear' ? envelope.minZ : envelope.maxZ;
    entities.push(line(envelope.minX, alignmentSide, envelope.maxX, alignmentSide, 'alignment-guide', { alignment: model.multiAlignment === 'rear' ? 'rear' : 'front', rowAlignment: model.rowAlignment || 'left', panelCollection: model.panelCollection || 'center' }));
    entities.push(dim('x', envelope.minX, envelope.maxX, envelope.minZ - Math.max(260, depth * 0.08), `${Math.round(width)} mm`, { kind: 'overall-width' }));
    entities.push(dim('y', envelope.minZ, envelope.maxZ, envelope.maxX + Math.max(260, width * 0.06), `${Math.round(depth)} mm`, { kind: 'overall-depth' }));
    modules.forEach((module, index) => {
      const a = num(module.outerMinX, NaN), b = num(module.outerMaxX, NaN);
      if (Number.isFinite(a) && Number.isFinite(b)) entities.push(dim('x', a, b, envelope.maxZ + 170 + (index % 2) * 90, `${Math.round(b - a)}`, { kind: 'module-width', moduleIndex: index }));
    });
    return { id: 'top', title: 'Üst Görünüş', axis: 'xz', bounds: { minX: envelope.minX, maxX: envelope.maxX, minY: envelope.minZ, maxY: envelope.maxZ }, entities };
  }

  function elevationPosts(layout, model, side, envelope) {
    const posts = Array.isArray(layout.posts) ? layout.posts : [];
    const tolerance = side === 'rear' || side === 'front' ? PROFILE.frontRearFootprint + 40 : PROFILE.sideFootprint + 40;
    if (side === 'rear') return posts.filter(post => Math.abs(num(post.z, 0) - envelope.minZ) <= tolerance);
    if (side === 'front') return posts.filter(post => Math.abs(num(post.z, 0) - envelope.maxZ) <= tolerance);
    if (side === 'left') return posts.filter(post => Math.abs(num(post.x, 0) - envelope.minX) <= tolerance);
    return posts.filter(post => Math.abs(num(post.x, 0) - envelope.maxX) <= tolerance);
  }

  function freedomVisibleModules(layout, side, envelope) {
    const modules = Array.isArray(layout.modules) ? layout.modules : [];
    if (side === 'left') return modules.filter(module => Math.abs(num(module.outerMinX, 0) - envelope.minX) < 1);
    if (side === 'right') return modules.filter(module => Math.abs(num(module.outerMaxX, 0) - envelope.maxX) < 1);
    return modules;
  }

  function addFreedomElevationStructure(entities, model, layout, envelope, side, clearHeight, beamHeight) {
    const beams = Array.isArray(layout.beams) ? layout.beams : [];
    if (side === 'rear' || side === 'front') {
      const row = side === 'rear' ? 'rear' : 'front';
      beams.filter(beam => beam.kind === 'width' && beam.row === row).forEach(beam => {
        entities.push(rect(num(beam.x, 0) - num(beam.length, 0) / 2, clearHeight, num(beam.length, 0), beamHeight, 'frame-profile', { productKind: 'rolling-roof', beamId: beam.id, side, moduleIndex: beam.moduleIndex }));
      });
    } else {
      const targetX = side === 'left' ? envelope.minX : envelope.maxX;
      const tol = Math.max(120, num(model.beamSection && model.beamSection.thickness, PROFILE.beam.thickness) + 30);
      beams.filter(beam => beam.kind !== 'width' && Math.abs(num(beam.x, 0) - targetX) <= tol).forEach(beam => {
        const start = Number.isFinite(Number(beam.startZ)) ? Number(beam.startZ) : num(beam.z, 0) - num(beam.length, 0) / 2;
        const end = Number.isFinite(Number(beam.endZ)) ? Number(beam.endZ) : num(beam.z, 0) + num(beam.length, 0) / 2;
        entities.push(rect(Math.min(start, end), clearHeight, Math.abs(end - start), beamHeight, 'frame-profile', { productKind: 'rolling-roof', beamId: beam.id, side }));
      });
    }
  }

  function addFreedomElevationPanels(entities, model, layout, envelope, side, clearHeight) {
    const panelY = clearHeight + 61;
    const modules = freedomVisibleModules(layout, side, envelope);
    if (side === 'left' || side === 'right') {
      modules.forEach(module => {
        const panel = freedomPanelProjection(module, model);
        panel.edges.forEach(item => {
          if (panel.opened) entities.push(line(item.z - 12, panelY, item.z + 10, panelY + 115, 'panel-package', { moduleIndex: module.moduleIndex, panelIndex: item.panelIndex, side, collected: true }));
          else entities.push(line(item.z - 45, panelY, item.z + 45, panelY, 'roof-panel', { moduleIndex: module.moduleIndex, panelIndex: item.panelIndex, side }));
        });
      });
    } else {
      modules.forEach(module => {
        const panel = freedomPanelProjection(module, model);
        entities.push(line(panel.centerX - panel.panelLength / 2, panelY, panel.centerX + panel.panelLength / 2, panelY, panel.opened ? 'panel-package' : 'roof-panel', { moduleIndex: module.moduleIndex, side, edgeProjection: true }));
      });
    }
  }

  function buildElevation(model, layout, envelope, side, contract) {
    const horizontalAxis = side === 'rear' || side === 'front' ? 'x' : 'z';
    const horizontalMin = horizontalAxis === 'x' ? envelope.minX : envelope.minZ;
    const horizontalMax = horizontalAxis === 'x' ? envelope.maxX : envelope.maxZ;
    const height = Math.max(1, num(model.height, num(layout.height, 0)));
    const beamHeight = Math.max(20, num(model.beamSection && model.beamSection.vertical, PROFILE.beam.vertical));
    const clearHeight = Math.max(1, height - beamHeight);
    const entities = [];
    entities.push(rect(horizontalMin, 0, horizontalMax - horizontalMin, height, 'elevation-envelope', { side }));
    addFreedomElevationStructure(entities, model, layout, envelope, side, clearHeight, beamHeight);
    addFreedomElevationPanels(entities, model, layout, envelope, side, clearHeight);
    elevationPosts(layout, model, side, envelope).forEach(post => {
      const section = postSection(model, post);
      const center = horizontalAxis === 'x' ? num(post.x, 0) : num(post.z, 0);
      const postWidth = horizontalAxis === 'x' ? section.x : section.z;
      const postHeight = Math.max(1, num(post.height, height));
      entities.push(rect(center - postWidth / 2, 0, postWidth, postHeight, 'post', { postId: post.id, shared: Boolean(post.sharedBoundary || post.sharedAcrossRows) }));
    });
    const modules = Array.isArray(layout.modules) ? layout.modules : [];
    if (horizontalAxis === 'x') {
      const boundaries = Array.from(new Set(modules.flatMap(module => [num(module.outerMinX, NaN), num(module.outerMaxX, NaN)]).filter(Number.isFinite).map(v => Math.round(v * 1000) / 1000))).sort((a, b) => a - b);
      boundaries.forEach(value => entities.push(line(value, 0, value, clearHeight, 'module-boundary', { side }))); 
    } else {
      const boundaries = Array.from(new Set(modules.flatMap(module => [num(module.rearOuterZ, NaN), num(module.frontOuterZ, NaN)]).filter(Number.isFinite).map(v => Math.round(v * 1000) / 1000))).sort((a, b) => a - b);
      boundaries.forEach(value => entities.push(line(value, 0, value, clearHeight, 'module-boundary', { side }))); 
    }
    const facadeId = side === 'rear' ? 'front' : (side === 'front' ? 'back' : side);
    addFacadeProfiles(entities, model, facadeId, horizontalMin, horizontalMax, clearHeight);
    addInteractionZones(entities, model, contract, side);
    entities.push(dim('x', horizontalMin, horizontalMax, -Math.max(180, height * 0.06), `${Math.round(horizontalMax - horizontalMin)} mm`, { kind: 'overall-horizontal', side }));
    entities.push(dim('y', 0, height, horizontalMax + Math.max(180, (horizontalMax - horizontalMin) * 0.04), `${Math.round(height)} mm`, { kind: 'overall-height', side }));
    const title = side === 'rear' ? 'Arka Cephe' : (side === 'front' ? 'Ön Görünüş' : (side === 'left' ? 'Sol Görünüş' : 'Sağ Görünüş'));
    return { id: side, title, axis: `${horizontalAxis}y`, bounds: { minX: horizontalMin, maxX: horizontalMax, minY: 0, maxY: height }, entities };
  }

  function inputContract(model) {
    const drafts = model.inputDrafts && typeof model.inputDrafts === 'object' ? model.inputDrafts : {};
    const width = String(drafts.width == null ? model.width || '' : drafts.width);
    const depth = String(drafts.depth == null ? model.depth || '' : drafts.depth);
    const height = String(drafts.height == null ? model.height || '' : drafts.height);
    let topology = 'TEK MODÜL';
    if (width.includes(':') || depth.includes(':')) topology = 'ÖN / ARKA SIRA (:)' + (/:NO$/i.test(width) || /:NO$/i.test(depth) ? ' · :NO' : '');
    else if (width.includes(';') || depth.includes(';')) topology = 'YAN YANA (;)';
    if (/;NO$/i.test(depth)) topology += ' · NO';
    return { width, depth, height, topology };
  }

  function build(snapshot, context) {
    const ctx = context && context.projectInfo ? context : { projectInfo: context || {}, contract: null };
    const projectInfo = ctx.projectInfo || {};
    const contract = ctx.contract || null;
    const source = snapshot && snapshot.snapshot ? snapshot.snapshot : snapshot;
    if (!source || source.schema !== 'p3dv-host-snapshot-v1' || !source.modelState) throw new Error('FREEDOM_TECHNICAL2D_SNAPSHOT_INVALID');
    const model = clone(source.modelState);
    if (model.productGroup !== PRODUCT_GROUP) throw new Error('FREEDOM_TECHNICAL2D_PRODUCT_MISMATCH');
    const layout = buildLayout(model);
    if (!layout || !layout.valid) {
      const errors = layout && Array.isArray(layout.errors) ? layout.errors.slice() : ['FREEDOM_LAYOUT_INVALID'];
      return Object.freeze({ schema: SCHEMA, productId: PRODUCT_ID, productGroup: PRODUCT_GROUP, valid: false, errors, sourceSchema: source.schema, modelState: model });
    }
    const envelope = envelopeOf(layout, model);
    const input = inputContract(model);
    const profileCount = Object.values(model.facadeProfiles || {}).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
    const rows = Array.isArray(layout.rows) && layout.rows.length ? layout.rows.length : 1;
    const summary = Object.freeze({
      width: Math.round(envelope.maxX - envelope.minX),
      depth: Math.round(envelope.maxZ - envelope.minZ),
      height: Math.round(num(model.height, layout.height)),
      moduleCount: Array.isArray(layout.modules) ? layout.modules.length : Math.max(1, Math.round(num(model.systemCount, 1))),
      rowCount: rows,
      panelCount: (Array.isArray(layout.modules) ? layout.modules : []).reduce((sum, module) => sum + Math.max(0, Math.round(num(module.panelCount, 0))), 0),
      postCount: Array.isArray(layout.posts) ? layout.posts.length : 0,
      beamCount: Array.isArray(layout.beams) ? layout.beams.length : 0,
      profileCount,
      sharedPostCount: (Array.isArray(layout.posts) ? layout.posts : []).filter(post => post.sharedBoundary || post.sharedAcrossRows).length,
      rowAlignment: layout.rowAlignment || model.rowAlignment || 'left',
      panelCollection: layout.panelCollection || model.panelCollection || 'center',
      input
    });
    const views = Object.freeze([
      buildElevation(model, layout, envelope, 'rear', contract),
      buildTopView(model, layout, envelope),
      buildElevation(model, layout, envelope, 'left', contract),
      buildElevation(model, layout, envelope, 'front', contract),
      buildElevation(model, layout, envelope, 'right', contract)
    ]);
    return Object.freeze({
      schema: SCHEMA,
      productId: PRODUCT_ID,
      productGroup: PRODUCT_GROUP,
      productLabel: 'Rolling Roof (Retractable)',
      valid: true,
      errors: Object.freeze([]),
      sourceSchema: source.schema,
      sourceProductInputSchema: source.productInputSchema || '',
      capturedAt: source.capturedAt || '',
      projectInfo: Object.freeze({ ...(projectInfo || {}) }),
      interactionContractSchema: contract && contract.schema || '',
      modelState: Object.freeze(model),
      layout: Object.freeze(clone(layout)),
      envelope: Object.freeze(envelope),
      summary,
      views
    });
  }

  const api = Object.freeze({ SCHEMA, PRODUCT_ID, PRODUCT_GROUP, PROFILE, build });
  root.PulumurFreedom2DAdapter = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
