(function (root) {
  'use strict';

  const SCHEMA = 'plmr-scene-graph-v1';
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const finite = value => Number.isFinite(Number(value));
  const number = (value, fallback = 0) => finite(value) ? Number(value) : fallback;
  const token = value => String(value == null ? '' : value).trim().replace(/[^A-Za-z0-9_:\-.]+/g, '_') || 'UNSPECIFIED';

  function normalizeBounds(value) {
    if (root.PulumurCoordinateTransformService) {
      try { return root.PulumurCoordinateTransformService.normalizeBounds(value, { allowNull: true }); } catch (_) { return null; }
    }
    if (!value || ![value.minX, value.minY, value.maxX, value.maxY].every(finite)) return null;
    const minX = Math.min(Number(value.minX), Number(value.maxX));
    const minY = Math.min(Number(value.minY), Number(value.maxY));
    const maxX = Math.max(Number(value.minX), Number(value.maxX));
    const maxY = Math.max(Number(value.minY), Number(value.maxY));
    return Object.freeze({ minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY });
  }

  function unionBounds(values) {
    if (root.PulumurCoordinateTransformService) {
      try { return root.PulumurCoordinateTransformService.unionBounds(values); } catch (_) { return null; }
    }
    const list = (values || []).map(normalizeBounds).filter(Boolean);
    if (!list.length) return null;
    return normalizeBounds({
      minX: Math.min(...list.map(item => item.minX)), minY: Math.min(...list.map(item => item.minY)),
      maxX: Math.max(...list.map(item => item.maxX)), maxY: Math.max(...list.map(item => item.maxY))
    });
  }

  function manualEntityBounds(entity) {
    if (!entity || typeof entity !== 'object') return null;
    if (entity.bounds) return normalizeBounds(entity.bounds);
    if (entity.type === 'interaction') return normalizeBounds({ minX: number(entity.x), minY: number(entity.y), maxX: number(entity.x) + Math.max(0, number(entity.w)), maxY: number(entity.y) + Math.max(0, number(entity.h)) });
    if (entity.type === 'line') return normalizeBounds({ minX: number(entity.x1), minY: number(entity.y1), maxX: number(entity.x2), maxY: number(entity.y2) });
    if (entity.type === 'circle' || entity.type === 'arc') {
      const r = Math.abs(number(entity.r)); return normalizeBounds({ minX: number(entity.x) - r, minY: number(entity.y) - r, maxX: number(entity.x) + r, maxY: number(entity.y) + r });
    }
    const points = [];
    if (Array.isArray(entity.points)) points.push(...entity.points);
    if (Array.isArray(entity.p1)) points.push(entity.p1);
    if (Array.isArray(entity.p2)) points.push(entity.p2);
    if (points.length && points.every(point => Array.isArray(point) && finite(point[0]) && finite(point[1]))) {
      return normalizeBounds({ minX: Math.min(...points.map(p => Number(p[0]))), minY: Math.min(...points.map(p => Number(p[1]))), maxX: Math.max(...points.map(p => Number(p[0]))), maxY: Math.max(...points.map(p => Number(p[1]))) });
    }
    if (['text', 'mtext'].includes(entity.type)) {
      const height = Math.max(1, Math.abs(number(entity.height, 20)));
      const width = Math.max(height, number(entity.width, String(entity.value || '').length * height * 0.6));
      return normalizeBounds({ minX: number(entity.x), minY: number(entity.y) - height, maxX: number(entity.x) + width, maxY: number(entity.y) + height * 0.25 });
    }
    if (finite(entity.x) && finite(entity.y)) return normalizeBounds({ minX: Number(entity.x), minY: Number(entity.y), maxX: Number(entity.x), maxY: Number(entity.y) });
    return null;
  }

  function entityBounds(entity, blocks) {
    if (root.PulumurGeometry && typeof root.PulumurGeometry.bounds === 'function' && entity && entity.type !== 'interaction') {
      try { const value = normalizeBounds(root.PulumurGeometry.bounds([entity], blocks || {})); if (value) return value; } catch (_) { /* deterministic fallback below */ }
    }
    return manualEntityBounds(entity);
  }

  function flags(entity) {
    const visible = entity && entity.visible !== false && entity.hidden !== true;
    const uiOnly = Boolean(entity && (entity.uiOnly === true || entity.layoutNeutral === true || entity.type === 'interaction' || String(entity.drawingScope || '').toUpperCase() === 'UI'));
    return Object.freeze({ visible, selectable: visible && entity.selectable !== false, exportable: visible && !uiOnly && entity.exportable !== false, uiOnly });
  }

  function createFromDrawing(drawing, context) {
    const source = drawing || {};
    const scope = source.productScope || context || {};
    const entities = Array.isArray(source.entities) ? source.entities : [];
    const blocks = source.blocks || {};
    const sceneId = `scene:${token(scope.sceneId || scope.instanceId || scope.placementId || 'ROOT')}`;
    const nodes = [];
    const nodeById = new Map();
    const children = new Map();
    function add(node) {
      if (nodeById.has(node.id)) throw new Error(`SCENE_GRAPH_DUPLICATE_NODE_ID:${node.id}`);
      const frozen = Object.freeze(node); nodes.push(frozen); nodeById.set(node.id, frozen);
      if (node.parentId) { if (!children.has(node.parentId)) children.set(node.parentId, []); children.get(node.parentId).push(node.id); }
      return frozen;
    }
    add({ id: sceneId, type: 'SCENE', parentId: null, ownerId: token(scope.ownerId || 'ROOT'), bounds: normalizeBounds(source.bounds), visible: true, selectable: false, exportable: true });
    const entityIds = new Set();
    entities.forEach((raw, index) => {
      const entity = clone(raw || {});
      const productType = token(entity.productType || scope.productType || context && context.productType || 'UNKNOWN_PRODUCT');
      const instanceId = token(entity.ownerInstance || scope.instanceId || entity.placementId || scope.placementId || `${productType}-001`);
      const ownerId = token(entity.ownerId || entity.ownerInstance || scope.ownerId || instanceId);
      const placementId = token(entity.placementId || scope.placementId || instanceId);
      const viewId = token(entity.viewId || scope.viewId || context && context.viewId || 'DEFAULT');
      const layerId = token(entity.layer || '0');
      const explicit = entity.entityId == null ? '' : String(entity.entityId).trim();
      const entityId = token(explicit || `${productType}:${instanceId}:${placementId}:${viewId}:${layerId}:${index + 1}`);
      if (entityIds.has(entityId)) throw new Error(`SCENE_GRAPH_DUPLICATE_ENTITY_ID:${entityId}`);
      entityIds.add(entityId);
      const productNodeId = `${sceneId}/product:${productType}:${instanceId}`;
      const viewNodeId = `${productNodeId}/view:${viewId}`;
      const layerNodeId = `${viewNodeId}/layer:${layerId}`;
      if (!nodeById.has(productNodeId)) add({ id: productNodeId, type: 'PRODUCT_INSTANCE', parentId: sceneId, productType, instanceId, placementId, ownerId, bounds: null, visible: true, selectable: false, exportable: true });
      if (!nodeById.has(viewNodeId)) add({ id: viewNodeId, type: 'VIEW', parentId: productNodeId, productType, instanceId, placementId, viewId, ownerId, bounds: null, visible: true, selectable: false, exportable: true });
      if (!nodeById.has(layerNodeId)) add({ id: layerNodeId, type: 'LAYER', parentId: viewNodeId, productType, instanceId, placementId, viewId, layerId, ownerId, bounds: null, visible: true, selectable: false, exportable: true });
      const state = flags(entity);
      add({ id: `${layerNodeId}/entity:${entityId}`, entityId, type: 'ENTITY', entityType: token(entity.type || 'UNKNOWN'), parentId: layerNodeId, productType, instanceId, placementId, viewId, layerId, ownerId, bounds: entityBounds(entity, blocks), ...state, sourceIndex: index, entity: Object.freeze({ ...entity, entityId, ownerId, ownerInstance: instanceId, placementId, productType, viewId, layer: entity.layer || layerId }) });
    });
    for (let index = nodes.length - 1; index >= 0; index -= 1) {
      const node = nodes[index]; if (node.type === 'ENTITY') continue;
      const childBounds = (children.get(node.id) || []).map(id => nodeById.get(id).bounds).filter(Boolean);
      const bounds = unionBounds(childBounds) || node.bounds;
      if (bounds !== node.bounds) { const replacement = Object.freeze({ ...node, bounds }); nodes[index] = replacement; nodeById.set(node.id, replacement); }
    }
    const scene = Object.freeze({ schema: SCHEMA, version: 1, rootId: sceneId, nodes: Object.freeze(nodes), stats: Object.freeze({ nodes: nodes.length, entities: entityIds.size, products: nodes.filter(n => n.type === 'PRODUCT_INSTANCE').length, views: nodes.filter(n => n.type === 'VIEW').length, layers: nodes.filter(n => n.type === 'LAYER').length }) });
    const checked = validate(scene); if (!checked.valid) throw new Error(`SCENE_GRAPH_INVALID:${checked.errors.join('|')}`);
    return scene;
  }

  function validate(scene) {
    const errors = []; const ids = new Set(); const entityIds = new Set();
    const nodes = scene && Array.isArray(scene.nodes) ? scene.nodes : [];
    if (!scene || scene.schema !== SCHEMA) errors.push('SCHEMA');
    nodes.forEach(node => {
      if (!node || !node.id) errors.push('NODE_ID_MISSING');
      else if (ids.has(node.id)) errors.push(`NODE_ID_DUPLICATE:${node.id}`); else ids.add(node.id);
      if (node.parentId && !nodes.some(candidate => candidate.id === node.parentId)) errors.push(`PARENT_MISSING:${node.id}`);
      if (node.type === 'ENTITY') {
        if (!node.entityId) errors.push(`ENTITY_ID_MISSING:${node.id}`);
        else if (entityIds.has(node.entityId)) errors.push(`ENTITY_ID_DUPLICATE:${node.entityId}`); else entityIds.add(node.entityId);
        if (!node.ownerId) errors.push(`OWNER_MISSING:${node.id}`);
        if (!node.productType || !node.instanceId || !node.viewId || !node.layerId) errors.push(`IDENTITY_INCOMPLETE:${node.id}`);
      }
      if (node.bounds && ![node.bounds.minX,node.bounds.minY,node.bounds.maxX,node.bounds.maxY].every(finite)) errors.push(`BOUNDS_INVALID:${node.id}`);
    });
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), stats: Object.freeze({ nodes: nodes.length, entities: entityIds.size }) });
  }

  const entityNodes = scene => (scene && scene.nodes || []).filter(node => node.type === 'ENTITY');
  const selectionEntities = scene => entityNodes(scene).filter(node => node.visible && node.selectable).map(node => clone(node.entity));
  const exportEntities = scene => entityNodes(scene).filter(node => node.visible && node.exportable).map(node => clone(node.entity));
  const findByOwner = (scene, ownerId) => entityNodes(scene).filter(node => node.ownerId === token(ownerId));
  function toDrawing(scene, mode, sourceDrawing) {
    const source = sourceDrawing || {};
    const entities = mode === 'selection' ? selectionEntities(scene) : exportEntities(scene);
    return { ...source, entities, bounds: unionBounds(entityNodes(scene).filter(n => mode === 'selection' ? n.selectable : n.exportable).map(n => n.bounds)) || normalizeBounds(source.bounds), sceneGraph: scene };
  }
  function attachDrawing(drawing, context) { const sceneGraph = createFromDrawing(drawing, context || {}); return { ...drawing, sceneGraph, sceneGraphSchema: SCHEMA }; }

  const api = Object.freeze({ SCHEMA, normalizeBounds, unionBounds, entityBounds, flags, createFromDrawing, attachDrawing, validate, entityNodes, selectionEntities, exportEntities, findByOwner, toDrawing });
  root.PulumurSceneGraph = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
