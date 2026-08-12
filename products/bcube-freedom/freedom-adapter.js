(function (root) {
  'use strict';
  const registry = root.PulumurProductRegistry;
  if (!registry) throw new Error('Product registry yüklenmedi.');
  const SCHEMA = 'bcube-freedom-project-v1';
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  function unsupported(name) {
    const error = new Error(`BCUBE_FREEDOM_${name}_UNAVAILABLE_IN_HOST_RUNTIME`);
    error.code = 'PRODUCT_CAPABILITY_UNAVAILABLE';
    throw error;
  }
  const adapter = {
    id: 'BCUBE_FREEDOM',
    label: 'B-Cube Freedom',
    aliases: ['BCUBE_FREEDOM'],
    legacyProductTypes: ['B-Cube Freedom', 'B CUBE FREEDOM', 'FREEDOM', 'B_CUBE_FREEDOM'],
    schemaVersion: 1,
    executionMode: 'ISOLATED_APP',
    navigation: { route: 'products/bcube-freedom/index.html', moduleName: 'Free', engineName: 'Freedom Independent SVG', opensDedicatedPage: true },
    projectSchemas: [SCHEMA],
    capabilities: { standaloneDrawing: false, isolatedApp: true, placementInsidePergoRise: false, svg: true, dxf: false, pdf: false, plmr: true, cloud: false },
    createDefaultProject(overrides) {
      return { schema: SCHEMA, productType: 'BCUBE_FREEDOM', project: {}, form: {}, grid: null, supports: [], ...(clone(overrides || {})) };
    },
    validateProject(project) {
      const errors = [];
      if (!project || typeof project !== 'object') errors.push('Freedom proje verisi bulunamadı.');
      if (project && project.schema && project.schema !== SCHEMA) errors.push(`Desteklenmeyen Freedom şeması: ${project.schema}`);
      return { valid: errors.length === 0, errors };
    },
    migrateProject(project) {
      const source = clone(project || {});
      const candidate = source.projectType || source.productType || source.product_type || 'BCUBE_FREEDOM';
      if (registry.migrateProductType(candidate, 'BCUBE_FREEDOM') !== 'BCUBE_FREEDOM') throw new Error('B-Cube Freedom projesi bekleniyordu.');
      return this.createDefaultProject({ ...source, schema: SCHEMA, productType: 'BCUBE_FREEDOM' });
    },
    buildStandaloneGeometry() { return unsupported('GEOMETRY'); },
    buildPlacementGeometry() { return unsupported('PLACEMENT'); },
    renderPreview() { return unsupported('HOST_PREVIEW'); },
    serializeProject(project) { return JSON.stringify(this.migrateProject(project), null, 2); },
    deserializeProject(text) { return this.migrateProject(typeof text === 'string' ? JSON.parse(text) : text); },
    exportDxf() { return unsupported('DXF'); },
    exportPdf() { return unsupported('PDF'); }
  };
  root.PulumurFreedomAdapter = registry.registerProduct(adapter);
  if (typeof module !== 'undefined') module.exports = root.PulumurFreedomAdapter;
})(typeof window !== 'undefined' ? window : globalThis);
