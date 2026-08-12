(function (root) {
  'use strict';
  const registry = root.PulumurProductRegistry;
  const utils = root.PulumurProductAdapterUtils;
  if (!registry || !utils || !root.PulumurGeometry) throw new Error('Pergola adapter bağımlılıkları yüklenmedi.');

  const adapter = {
    id: 'PERGO_RISE',
    label: 'Pergola',
    aliases: ['Pergo Rise', 'PERGO', 'PERGO-RISE'],
    schemaVersion: 2,
    executionMode: 'IN_PROCESS_ADAPTER',
    navigation: { route: '', moduleName: 'Module 1', engineName: 'Web DXF / 2D', opensDedicatedPage: false },
    projectSchemas: ['plmr-project-v2', 'PLMR_PROJECT'],
    legacyProductTypes: ['Pergo Rise', 'PERGO', 'PERGO-RISE'],
    capabilities: { standaloneDrawing: true, placementInsidePergoRise: false, svg: true, dxf: true, pdf: true, plmr: true, cloud: true },
    createDefaultProject(overrides) {
      return { ...utils.clone(root.PulumurGeometry.SAMPLE_INPUT || {}), ...(utils.clone(overrides || {})), productType: 'PERGO_RISE' };
    },
    validateProject(project) {
      try {
        root.PulumurGeometry.normalizeInput(project || {});
        return { valid: true, errors: [] };
      } catch (error) {
        return { valid: false, errors: [error.message || String(error)] };
      }
    },
    migrateProject(project) {
      return { ...utils.clone(project || {}), productType: 'PERGO_RISE' };
    },
    buildStandaloneGeometry(context) {
      const source = context || {};
      const drawing = root.PulumurGeometry.buildDrawing((source.project || source.productConfig) || source);
      return utils.attachSceneGraph(drawing, { productType: 'PERGO_RISE', instanceId: source.instanceId || 'PERGO_RISE-001', placementId: source.placementId || source.instanceId || 'PERGO_RISE-001', viewId: source.viewId || 'PRODUCTION_DRAWING' });
    },
    buildPlacementGeometry(context) {
      const source = context || {};
      const productAdapter = registry.requireProduct(source.productType || (source.productConfig && source.productConfig.productType));
      if (productAdapter.id === 'PERGO_RISE') throw new Error('Pergola kendi içine ürün olarak yerleştirilemez.');
      return productAdapter.buildPlacementGeometry({ ...source, hostProduct: 'PERGO_RISE', drawingScope: 'PLACEMENT' });
    },
    renderPreview: (drawing, options) => utils.renderPreview(drawing, options),
    serializeProject(project) {
      if (root.PulumurProjectSchema && typeof root.PulumurProjectSchema.serialize === 'function') return root.PulumurProjectSchema.serialize(project);
      return JSON.stringify(this.migrateProject(project), null, 2);
    },
    deserializeProject(text) {
      if (root.PulumurProjectSchema && typeof root.PulumurProjectSchema.parse === 'function') return root.PulumurProjectSchema.parse(text);
      return this.migrateProject(typeof text === 'string' ? JSON.parse(text) : text);
    },
    exportDxf: drawing => utils.exportDxf(drawing),
    exportPdf: (drawing, metadata) => utils.exportPdf(drawing, { title: 'Pergola Üretim Çizimi', ...(metadata || {}) })
  };

  root.PulumurPergoRiseAdapter = registry.registerProduct(adapter);
})(typeof window !== 'undefined' ? window : globalThis);
