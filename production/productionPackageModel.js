(function (root) {
  'use strict';
  const SCHEMA = 'plmr-production-package-v1';
  const SCHEMA_VERSION = 1;
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function canonical(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('PRODUCTION_HASH_NUMBER_INVALID');
    return JSON.stringify(value);
  }
  function fnv1a(text) {
    let hash = 2166136261;
    const value = String(text || '');
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
  function sourceProjection(project, model, pilotProfileId, productionOptions) {
    const positions = (project.positions || []).filter(item => !item.hidden).sort((a, b) => a.order - b.order).map(position => ({
      id: position.id,
      positionNo: position.positionNo,
      productType: position.productType,
      width: Number(position.width),
      height: Number(position.height),
      quantity: Number(position.quantity),
      options: model && typeof model.resolveOptions === 'function' ? model.resolveOptions(project, position) : clone(position.options || {})
    }));
    return {
      pilotProfileId: String(pilotProfileId || ''),
      projectInfo: clone(project.projectInfo || {}),
      common: {
        color: project.commonSettings && project.commonSettings.color,
        glassType: project.commonSettings && project.commonSettings.glassType
      },
      productionOptions: clone(productionOptions || {}),
      positions
    };
  }
  function sourceHash(project, model, pilotProfileId, productionOptions) {
    const text = canonical(sourceProjection(project, model, pilotProfileId, productionOptions));
    return `fnv1a32:${fnv1a(text)}:${text.length}`;
  }
  function newId(prefix) {
    return `${prefix || 'production'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }
  function createPackage(input) {
    const source = input || {};
    return {
      packageId: source.packageId || newId('prod'),
      schema: SCHEMA,
      schemaVersion: SCHEMA_VERSION,
      pilotProfileId: source.pilotProfileId,
      company: clone(source.company || {}),
      productType: source.productType || 'SLIDING',
      projectInfo: clone(source.projectInfo || {}),
      sourceProjectId: source.sourceProjectId || '',
      sourceRevision: source.sourceRevision || '',
      createdAt: source.createdAt || new Date().toISOString(),
      generatedFromHash: source.generatedFromHash || '',
      status: source.status || 'DRAFT',
      validation: clone(source.validation || { errors: [], warnings: [] }),
      options: clone(source.options || {}),
      positions: clone(source.positions || []),
      cutItems: clone(source.cutItems || []),
      accessoryItems: clone(source.accessoryItems || []),
      glassItems: clone(source.glassItems || []),
      stockItems: clone(source.stockItems || []),
      optimizationResult: clone(source.optimizationResult || {}),
      purchaseNeeds: clone(source.purchaseNeeds || []),
      approvals: clone(source.approvals || {}),
      exports: clone(source.exports || {})
    };
  }
  function markStale(project, model) {
    const production = project && project.production;
    const pkg = production && production.package;
    if (!pkg || !production.pilotProfileId) return false;
    const actual = sourceHash(project, model, production.pilotProfileId, production.options || {});
    if (actual === pkg.generatedFromHash) return false;
    pkg.status = 'VALIDATION_REQUIRED';
    pkg.validation = pkg.validation || { errors: [], warnings: [] };
    pkg.validation.warnings = (pkg.validation.warnings || []).filter(item => item.code !== 'SOURCE_STALE');
    pkg.validation.warnings.unshift({ code: 'SOURCE_STALE', message: 'Çizim veya üretim seçenekleri değişti. Üretim paketi yeniden oluşturulmalıdır.' });
    pkg.stale = true;
    pkg.currentSourceHash = actual;
    return true;
  }
  function isStale(project, model) {
    const production = project && project.production;
    const pkg = production && production.package;
    if (!pkg) return false;
    return sourceHash(project, model, production.pilotProfileId, production.options || {}) !== pkg.generatedFromHash;
  }
  root.PulumurProductionPackageModel = { SCHEMA, SCHEMA_VERSION, canonical, sourceProjection, sourceHash, createPackage, markStale, isStale };
  if (typeof module !== 'undefined') module.exports = root.PulumurProductionPackageModel;
})(typeof window !== 'undefined' ? window : globalThis);
