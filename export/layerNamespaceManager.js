(function (root) {
  'use strict';

  const SCHEMA = 'plmr-layer-namespace-v1';
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const token = value => String(value == null ? '' : value).trim().replace(/[^A-Za-z0-9_.$-]+/g, '_') || 'UNSPECIFIED';
  const key = value => String(value == null ? '' : value).trim().toUpperCase();

  const DEFAULT_LAYERS = Object.freeze([
    { name: '0', color: 7, visible: true, aliases: ['BYBLOCK', 'DEFAULT'] },
    { name: 'PLMR_POZ_TEXT', color: 1, visible: true, aliases: ['POZ_TEXT', 'POSITION_TEXT'] },
    { name: 'PLMR_DIMENSION', color: 1, visible: true, aliases: ['DIMENSION', 'DIMENSIONS'] },
    { name: 'PLMR_UI', color: 8, visible: false, exportable: false, aliases: ['UI', 'INTERACTION'] }
  ]);

  function createRegistry(options) {
    const config = { includeDefaults: true, ...(options || {}) };
    const layers = new Map(); const aliases = new Map(); const blocks = new Map();

    function registerLayer(definition) {
      const source = typeof definition === 'string' ? { name: definition } : { ...(definition || {}) };
      const name = String(source.name || '').trim(); if (!name) throw new Error('LAYER_NAME_REQUIRED');
      const id = key(name); const existing = layers.get(id);
      if (existing && existing.name !== name) throw new Error(`LAYER_DUPLICATE_CASE:${name}`);
      const record = Object.freeze({ name, color: source.color == null ? 7 : Number(source.color), visible: source.visible !== false, exportable: source.exportable !== false, aliases: Object.freeze([...(source.aliases || [])].map(String)) });
      layers.set(id, record); aliases.set(id, id);
      record.aliases.forEach(alias => {
        const aliasKey = key(alias); const owner = aliases.get(aliasKey);
        if (owner && owner !== id) throw new Error(`LAYER_ALIAS_CONFLICT:${alias}`);
        aliases.set(aliasKey, id);
      });
      return record;
    }

    function resolveLayer(name, options) {
      const raw = String(name == null || name === '' ? '0' : name).trim(); const id = aliases.get(key(raw));
      if (!id) {
        if (options && options.create) return registerLayer({ name: raw });
        return null;
      }
      return layers.get(id);
    }

    function registerBlock(name, owner) {
      const raw = String(name || '').trim(); if (!raw) throw new Error('BLOCK_NAME_REQUIRED');
      const id = key(raw); const existing = blocks.get(id);
      if (existing) throw new Error(`BLOCK_DUPLICATE:${raw}`);
      const record = Object.freeze({ name: raw, owner: token(owner || 'ROOT') }); blocks.set(id, record); return record;
    }

    function resolveBlock(name) { return blocks.get(key(name)) || null; }
    if (config.includeDefaults) DEFAULT_LAYERS.forEach(registerLayer);
    return Object.freeze({ schema: SCHEMA, registerLayer, resolveLayer, registerBlock, resolveBlock, listLayers: () => Array.from(layers.values()), listBlocks: () => Array.from(blocks.values()) });
  }

  function namespace(context, suffix) {
    const source = context || {};
    return [source.productType || source.product || 'PRODUCT', source.positionNo || source.position || 'POSITION', source.instanceId || source.instance || 'INSTANCE', source.viewId || source.view || 'VIEW', suffix || 'ENTITY'].map(token).join('__');
  }

  function buildRegistry(drawing) {
    const source = drawing || {}; const registry = createRegistry();
    (source.layers || []).forEach(layer => {
      const definition = typeof layer === 'string' ? { name: layer, ...(source.layerStyle && source.layerStyle[layer] || {}) } : layer;
      if (!registry.resolveLayer(definition.name)) registry.registerLayer(definition);
    });
    Object.keys(source.layerStyle || {}).forEach(name => { if (!registry.resolveLayer(name)) registry.registerLayer({ name, ...(source.layerStyle[name] || {}) }); });
    const blockNames = Array.isArray(source.blockRecords) ? source.blockRecords.map(item => typeof item === 'string' ? item : item && item.name) : Object.keys(source.blocks || {});
    blockNames.filter(Boolean).forEach(name => registry.registerBlock(name, source.productScope && source.productScope.instanceId));
    return registry;
  }

  function validateDrawing(drawing, options) {
    const source = drawing || {}; const config = { strictLayers: false, ...(options || {}) }; const errors = []; const warnings = [];
    let registry;
    try { registry = buildRegistry(source); } catch (error) { errors.push(error.message); registry = createRegistry(); }
    const knownBlocks = new Set(Object.keys(source.blocks || {}).map(key));
    (source.entities || []).forEach((entity, index) => {
      if (!entity || typeof entity !== 'object') return;
      const layerName = entity.layer || '0'; let layer = registry.resolveLayer(layerName);
      if (!layer) {
        if (config.strictLayers) errors.push(`LAYER_MISSING:${layerName}:ENTITY_${index + 1}`);
        else { layer = registry.registerLayer({ name: layerName }); warnings.push(`LAYER_INFERRED:${layerName}`); }
      }
      if (entity.type === 'insert' && (!entity.name || !knownBlocks.has(key(entity.name)))) errors.push(`BLOCK_MISSING:${entity.name || '(empty)'}`);
    });
    return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), warnings: Object.freeze(warnings), registry });
  }

  function prepareForExport(drawing, options) {
    const source = clone(drawing || {}); const config = { strictLayers: false, canonicalizeAliases: false, ...(options || {}) };
    const checked = validateDrawing(source, config); if (!checked.valid) throw new Error(`LAYER_NAMESPACE_INVALID:${checked.errors.join('|')}`);
    source.entities = (source.entities || []).filter(entity => {
      if (!entity || entity.hidden === true || entity.visible === false || entity.exportable === false || entity.uiOnly === true || entity.type === 'interaction') return false;
      const layer = checked.registry.resolveLayer(entity.layer || '0', { create: !config.strictLayers });
      if (layer && (!layer.visible || !layer.exportable)) return false;
      if (config.canonicalizeAliases && layer) entity.layer = layer.name;
      return true;
    });
    source.layerNamespaceSchema = SCHEMA;
    return source;
  }

  const api = Object.freeze({ SCHEMA, DEFAULT_LAYERS, createRegistry, namespace, validateDrawing, prepareForExport });
  root.PulumurLayerNamespaceManager = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
