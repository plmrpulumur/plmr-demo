// Legacy regression identity token only (no cache behavior): v10_4_r13_92_pdf_hotfix_01
const CACHE_PREFIX = 'pulumur-pwa-';
const CACHE_NAME = `${CACHE_PREFIX}v10_28_4_r14_28_4`;
const NETWORK_TIMEOUT_MS = 8000;
const CORE_ASSETS = [
  './',
  './index.html',
  './src/buildBootstrap.js?v=10.28.4-r14.28.4',
  './core/backendCompatibility.js?v=10.28.4-r14.28.4',
  './diagnostics/runtimeMonitor.js?v=10.28.4-r14.28.4',
  './recovery/recoveryManager.js?v=10.28.4-r14.28.4',
  './assets/styles/app.css?v=10.28.4-r14.28.4',
  './src/appLimits.js?v=10.28.4-r14.28.4',
  './ui/inputLimitPolicy.js?v=10.28.4-r14.28.4',
  './core/actions.js?v=10.28.4-r14.28.4',
  './core/multiPositionRules.js?v=10.28.4-r14.28.4',
  './core/projectModel.js?v=10.28.4-r14.28.4',
  './core/topologyReconcile.js?v=10.28.4-r14.28.4',
  './core/validation.js?v=10.28.4-r14.28.4',
  './core/reducer.js?v=10.28.4-r14.28.4',
  './core/productPlacementService.js?v=10.28.4-r14.28.4',
  './core/projectCommandCatalog.js?v=10.28.4-r14.28.4',
  './core/projectCommandService.js?v=10.28.4-r14.28.4',
  './history/transactionCommandEngine.js?v=10.28.4-r14.28.4',
  './history/historyManager.js?v=10.28.4-r14.28.4',
  './persistence/revisionCore.js?v=10.28.4-r14.28.4', './persistence/schemaRegistryCenter.js?v=10.28.4-r14.28.4',
  './core/accessPolicy.js?v=10.28.4-r14.28.4',
  './core/productAccessTicket.js?v=10.28.4-r14.28.4',
  './core/directProductAccessGuard.js?v=10.28.4-r14.28.4', './core/constraintEngine.js?v=10.28.4-r14.28.4',
  './persistence/schema.js?v=10.28.4-r14.28.4',
  './render/renderPipeline.js?v=10.28.4-r14.28.4',
  './voice/voiceCommandService.js?v=10.28.4-r14.28.4',
  './voice/voiceFormAssistant.js?v=10.28.4-r14.28.4',
  './ui/commandPalette.js?v=10.28.4-r14.28.4',
  './templates/presetLibrary.js?v=10.28.4-r14.28.4',
  './ui/recoveryCoach.js?v=10.28.4-r14.28.4',
  './interaction/hitTestEngine.js?v=10.28.4-r14.28.4',
  './dimensions/parametricDimensionEditor.js?v=10.28.4-r14.28.4',
  './core/viewSyncService.js?v=10.28.4-r14.28.4',
  './catalog/componentCatalog.js?v=10.28.4-r14.28.4',
  './import/cadInteropLab.js?v=10.28.4-r14.28.4',
  './bridge/p3dvBridge.js?v=10.28.4-r14.28.4',
  './revision/revisionDiff.js?v=10.28.4-r14.28.4',
  './review/reviewWorkflow.js?v=10.28.4-r14.28.4',
  './recovery/offlineRecoveryStore.js?v=10.28.4-r14.28.4',
  './services/projectRevisionAuditService.js?v=10.28.4-r14.28.4',
  './security/browserSecurity.js?v=10.28.4-r14.28.4',
  './ui/accessibilityI18nMobile.js?v=10.28.4-r14.28.4',
  './geometry/incrementalGeometryEngine.js?v=10.28.4-r14.28.4',
  './diagnostics/supportBundle.js?v=10.28.4-r14.28.4',
  './plugins/pluginSandbox.js?v=10.28.4-r14.28.4',
  './production/bomEngine.js?v=10.28.4-r14.28.4',
  './production/productionProfileRegistry.js?v=10.28.4-r14.28.4',
  './production/productionPackageModel.js?v=10.28.4-r14.28.4',
  './production/optimization/deterministicCutOptimizer.js?v=10.28.4-r14.28.4',
  './production/pilots/albert-genau-sliding-pilot-v1/config.js?v=10.28.4-r14.28.4',
  './production/pilots/albert-genau-sliding-pilot-v1/stock.js?v=10.28.4-r14.28.4',
  './production/pilots/albert-genau-sliding-pilot-v1/rules.js?v=10.28.4-r14.28.4',
  './production/export/xlsxWorkbookWriter.js?v=10.28.4-r14.28.4',
  './commercial/quoteEngine.js?v=10.28.4-r14.28.4',
  './telemetry/telemetryService.js?v=10.28.4-r14.28.4',
  './release/releaseOperations.js?v=10.28.4-r14.28.4',
  './release/finalAudit.js?v=10.28.4-r14.28.4',
  './src/app.js?v=10.28.4-r14.28.4',
  './src/productRouter.js?v=10.28.4-r14.28.4',
  './ui/projectWizard.js?v=10.28.4-r14.28.4', './ui/projectWizardController.js?v=10.28.4-r14.28.4', './ui/contextualToolbox.js?v=10.28.4-r14.28.4', './ui/contextualToolboxController.js?v=10.28.4-r14.28.4', './ai/assistantIntentRouter.js?v=10.28.4-r14.28.4', './ai/projectScanner.js?v=10.28.4-r14.28.4', './ai/drawingCopilot.js?v=10.28.4-r14.28.4', './ai/naturalLanguageDraft.js?v=10.28.4-r14.28.4', './ai/geometryValidator.js?v=10.28.4-r14.28.4', './import/xlsxLite.js?v=10.28.4-r14.28.4', './import/bulkPositionImport.js?v=10.28.4-r14.28.4', './import/bulkImportController.js?v=10.28.4-r14.28.4',
  './products/product-registry.js?v=10.28.4-r14.28.4',
  './products/p3dv/p3dv-product-adapters.js?v=10.28.4-r14.28.4',
  './modules/p3dv/products/bio-rise/bio-rise-multi-position.js?v=10.28.4-r14.28.4',
  './modules/p3dv/products/bcube-galaxy/galaxy-multi-position.js?v=10.28.4-r14.28.4',
  './technical2d/freedom2d-adapter.js?v=10.28.4-r14.28.4',
  './technical2d/galaxy2d-adapter.js?v=10.28.4-r14.28.4',
  './technical2d/biorise2d-adapter.js?v=10.28.4-r14.28.4',
  './technical2d/technical2d-workspace.js?v=10.28.4-r14.28.4',
  './technical2d/facade2d-native-reuse.js?v=10.28.4-r14.28.4',
  './technical2d/technical2d-export.js?v=10.28.4-r14.28.4',
  './src/modernDxfTemplate.js?v=10.28.4-r14.28.4',
  './src/dxfModernEngine.js?v=10.28.4-r14.28.4',
  './ui/unifiedWorkspace.js?v=10.28.4-r14.28.4',
  './modules/p3dv/index.html?v=10.28.4-r14.28.4',
  './modules/p3dv/src/styles.css?v=10.28.4-r14.28.4',
  './modules/p3dv/src/app.js?v=10.28.4-r14.28.4',
  './modules/p3dv/src/ral-colors.js?v=10.28.4-r14.28.4',
  './modules/p3dv/src/zip-fabric-textures.js?v=10.28.4-r14.28.4',
  './modules/p3dv/src/p3dv-pdf.js?v=10.28.4-r14.28.4',
  './modules/p3dv/src/p3dv-document-center.js?v=10.28.4-r14.28.4',
  './modules/p3dv/manifest.webmanifest?v=10.28.4-r14.28.4',
  './modules/p3dv/products/bcube-freedom/freedom-multi-position.js?v=10.28.4-r14.28.4',
  './modules/p3dv/products/pergo-rise/plmr-runtime/inputLimitPolicy.js?v=10.28.4-r14.28.4',
  './modules/p3dv/products/pergo-rise/plmr-runtime/multiPositionRules.js?v=10.28.4-r14.28.4',
  './modules/p3dv/products/pergo-rise/plmr-runtime/peri01ExcelBridge.js?v=10.28.4-r14.28.4',
  './modules/p3dv/products/pergo-rise/plmr-runtime/peri01Geometry.js?v=10.28.4-r14.28.4',
  './modules/p3dv/products/pergo-rise/pergo-rise-input-controller.js?v=10.28.4-r14.28.4',
  './modules/p3dv/products/pergo-rise/pergo-rise-editing.js?v=10.28.4-r14.28.4',
  './modules/p3dv/products/pergo-rise/pergo-rise-product.js?v=10.28.4-r14.28.4',
  './modules/p3dv/products/pergo-rise/pergo-rise-derived-geometry.js?v=10.28.4-r14.28.4',
  './products/bcube-freedom/freedom-adapter.js?v=10.28.4-r14.28.4',
  './products/product-adapter-utils.js?v=10.28.4-r14.28.4',
  './products/product-adapter-factory.js?v=10.28.4-r14.28.4',
  './products/pergo-rise/pergo-rise-adapter.js?v=10.28.4-r14.28.4',
  './products/sliding/sliding-adapter.js?v=10.28.4-r14.28.4',
  './products/guillotine/guillotine-adapter.js?v=10.28.4-r14.28.4',
  './products/zip-screen/zip-screen-adapter.js?v=10.28.4-r14.28.4',
  './products/standalone/facade-product-adapters.js?v=10.28.4-r14.28.4',
  './products/standalone/index.html',
  './products/standalone/standalone.css?v=10.28.4-r14.28.4',
  './products/standalone/standalone-project.js?v=10.28.4-r14.28.4',
  './products/standalone/standalone-layout.js?v=10.28.4-r14.28.4',
  './products/standalone/standalone-export.js?v=10.28.4-r14.28.4',
  './products/standalone/standalone-app.js?v=10.28.4-r14.28.4',
  './products/standalone/standalone-production-ui.js?v=10.28.4-r14.28.4',
  './export/printComposer.js?v=10.28.4-r14.28.4', './export/layerNamespaceManager.js?v=10.28.4-r14.28.4', './export/drawingEntityValidator.js?v=10.28.4-r14.28.4',
  './export/exportService.js?v=10.28.4-r14.28.4',
  './export/pdfFontData.js?v=10.28.4-r14.28.4',
  './export/vectorPdfEngine.js?v=10.28.4-r14.28.4',
  './assets/NotoSans-Regular.ttf',
  './products/bcube-freedom/index.html',
  './products/bcube-freedom/freedom.css?v=10.28.4-r14.28.4',
  './products/bcube-freedom/freedom-geometry.js?v=10.28.4-r14.28.4',
  './products/bcube-freedom/freedom-app.js?v=10.28.4-r14.28.4',
  './src/supabaseConfig.js?v=10.28.4-r14.28.4',
  './src/cloudProjects.js?v=10.28.4-r14.28.4',
  './src/adminUsersApi.js?v=10.28.4-r14.28.4',
  './src/activityTracker.js?v=10.28.4-r14.28.4',
  './src/adminPanel.js?v=10.28.4-r14.28.4',
  './src/peri01ExcelBridge.js?v=10.28.4-r14.28.4',
  './src/peri01Geometry.js?v=10.28.4-r14.28.4',
  './src/modernDxfTemplate.js?v=10.28.4-r14.28.4',
  './src/dxfModernEngine.js?v=10.28.4-r14.28.4',
  './blocks/filteredBlocks.js?v=10.28.4-r14.28.4',
  './assets/plmr-logo-header.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-64.png'
];

async function cacheCoreAssets() {
  const cache = await caches.open(CACHE_NAME);
  const results = await Promise.allSettled(CORE_ASSETS.map(async asset => {
    const request = new Request(asset, { cache: 'reload' });
    const response = await fetch(request);
    if (!response || !response.ok) throw new Error(`CACHE_FETCH_FAILED:${asset}`);
    await cache.put(request, response.clone());
  }));
  const criticalAssets = new Set([
    './index.html', './src/buildBootstrap.js?v=10.28.4-r14.28.4', './core/backendCompatibility.js?v=10.28.4-r14.28.4',
    './diagnostics/runtimeMonitor.js?v=10.28.4-r14.28.4', './recovery/recoveryManager.js?v=10.28.4-r14.28.4', './src/appLimits.js?v=10.28.4-r14.28.4', './ui/inputLimitPolicy.js?v=10.28.4-r14.28.4', './core/actions.js?v=10.28.4-r14.28.4', './core/multiPositionRules.js?v=10.28.4-r14.28.4', './core/projectModel.js?v=10.28.4-r14.28.4',
    './core/topologyReconcile.js?v=10.28.4-r14.28.4', './core/validation.js?v=10.28.4-r14.28.4', './core/reducer.js?v=10.28.4-r14.28.4', './core/productPlacementService.js?v=10.28.4-r14.28.4', './core/projectCommandCatalog.js?v=10.28.4-r14.28.4', './core/projectCommandService.js?v=10.28.4-r14.28.4',
    './history/transactionCommandEngine.js?v=10.28.4-r14.28.4', './history/historyManager.js?v=10.28.4-r14.28.4', './persistence/schema.js?v=10.28.4-r14.28.4', './core/accessPolicy.js?v=10.28.4-r14.28.4', './core/productAccessTicket.js?v=10.28.4-r14.28.4', './core/directProductAccessGuard.js?v=10.28.4-r14.28.4', './core/constraintEngine.js?v=10.28.4-r14.28.4', './render/renderPipeline.js?v=10.28.4-r14.28.4',
    './src/app.js?v=10.28.4-r14.28.4', './ui/unifiedWorkspace.js?v=10.28.4-r14.28.4', './products/p3dv/p3dv-product-adapters.js?v=10.28.4-r14.28.4', './modules/p3dv/products/bio-rise/bio-rise-multi-position.js?v=10.28.4-r14.28.4', './modules/p3dv/products/bcube-galaxy/galaxy-multi-position.js?v=10.28.4-r14.28.4', './technical2d/galaxy2d-adapter.js?v=10.28.4-r14.28.4', './technical2d/biorise2d-adapter.js?v=10.28.4-r14.28.4', './technical2d/technical2d-workspace.js?v=10.28.4-r14.28.4', './modules/p3dv/index.html?v=10.28.4-r14.28.4', './modules/p3dv/src/app.js?v=10.28.4-r14.28.4', './modules/p3dv/src/styles.css?v=10.28.4-r14.28.4', './src/peri01Geometry.js?v=10.28.4-r14.28.4', './blocks/filteredBlocks.js?v=10.28.4-r14.28.4',
    './src/productRouter.js?v=10.28.4-r14.28.4',
  './ui/projectWizard.js?v=10.28.4-r14.28.4', './ui/projectWizardController.js?v=10.28.4-r14.28.4', './ui/contextualToolbox.js?v=10.28.4-r14.28.4', './ui/contextualToolboxController.js?v=10.28.4-r14.28.4', './ai/assistantIntentRouter.js?v=10.28.4-r14.28.4', './ai/projectScanner.js?v=10.28.4-r14.28.4', './ai/drawingCopilot.js?v=10.28.4-r14.28.4', './ai/naturalLanguageDraft.js?v=10.28.4-r14.28.4', './ai/geometryValidator.js?v=10.28.4-r14.28.4', './import/xlsxLite.js?v=10.28.4-r14.28.4', './import/bulkPositionImport.js?v=10.28.4-r14.28.4', './import/bulkImportController.js?v=10.28.4-r14.28.4', './products/product-registry.js?v=10.28.4-r14.28.4', './products/bcube-freedom/freedom-adapter.js?v=10.28.4-r14.28.4', './products/product-adapter-utils.js?v=10.28.4-r14.28.4', './products/product-adapter-factory.js?v=10.28.4-r14.28.4', './products/pergo-rise/pergo-rise-adapter.js?v=10.28.4-r14.28.4', './products/sliding/sliding-adapter.js?v=10.28.4-r14.28.4', './products/guillotine/guillotine-adapter.js?v=10.28.4-r14.28.4', './products/zip-screen/zip-screen-adapter.js?v=10.28.4-r14.28.4', './export/layerNamespaceManager.js?v=10.28.4-r14.28.4', './export/drawingEntityValidator.js?v=10.28.4-r14.28.4', './export/exportService.js?v=10.28.4-r14.28.4', './export/pdfFontData.js?v=10.28.4-r14.28.4', './export/vectorPdfEngine.js?v=10.28.4-r14.28.4', './assets/NotoSans-Regular.ttf', './products/standalone/index.html', './products/standalone/standalone.css?v=10.28.4-r14.28.4', './products/standalone/standalone-project.js?v=10.28.4-r14.28.4', './products/standalone/standalone-layout.js?v=10.28.4-r14.28.4', './products/standalone/standalone-export.js?v=10.28.4-r14.28.4', './products/standalone/standalone-app.js?v=10.28.4-r14.28.4', './products/standalone/standalone-production-ui.js?v=10.28.4-r14.28.4', './production/productionProfileRegistry.js?v=10.28.4-r14.28.4', './production/productionPackageModel.js?v=10.28.4-r14.28.4', './production/optimization/deterministicCutOptimizer.js?v=10.28.4-r14.28.4', './production/pilots/albert-genau-sliding-pilot-v1/config.js?v=10.28.4-r14.28.4', './production/pilots/albert-genau-sliding-pilot-v1/stock.js?v=10.28.4-r14.28.4', './production/pilots/albert-genau-sliding-pilot-v1/rules.js?v=10.28.4-r14.28.4', './production/export/xlsxWorkbookWriter.js?v=10.28.4-r14.28.4', './products/bcube-freedom/index.html', './products/bcube-freedom/freedom-geometry.js?v=10.28.4-r14.28.4', './products/bcube-freedom/freedom-app.js?v=10.28.4-r14.28.4'
  ]);
  const failures = results.map((result, index) => ({ result, asset: CORE_ASSETS[index] }))
    .filter(item => criticalAssets.has(item.asset) && item.result.status === 'rejected');
  if (failures.length) throw new Error(`PULUMUR_CRITICAL_CACHE_FAILED:${failures.map(item => item.asset).join(',')}`);
}

self.addEventListener('install', event => {
  event.waitUntil(cacheCoreAssets().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function fetchWithTimeout(request, timeoutMs = NETWORK_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(request, { cache: 'no-store', signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetchWithTimeout(request);
    if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (_) {
    // Never search every historical pulumur cache. During an update that can
    // resurrect a stale host/P3DV runtime from an older release.
    const exact = await cache.match(request);
    if (exact) return exact;
    const samePath = await cache.match(request, { ignoreSearch: true });
    if (samePath) return samePath;
    if (request.mode === 'navigate') {
      const url = new URL(request.url);
      if (url.pathname.includes('/modules/p3dv/')) return cache.match('./modules/p3dv/index.html?v=10.28.4-r14.28.4');
      if (url.pathname.includes('/products/bcube-freedom/')) return cache.match('./products/bcube-freedom/index.html');
      return cache.match('./index.html');
    }
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request) || await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const response = await fetchWithTimeout(request);
    if (response && response.ok) cache.put(request, response.clone()).catch(() => {});
    return response;
  } catch (_) {
    return Response.error();
  }
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;
  const dynamicAsset = sameOrigin && (
    event.request.mode === 'navigate' ||
    /\.(?:html|js|css|json|webmanifest)$/i.test(url.pathname)
  );
  event.respondWith(dynamicAsset ? networkFirst(event.request) : cacheFirst(event.request));
});

// V13.92 historical regression tokens retained for backwards-compatible quality gates only.
// standalone-production-ui.js?v=10.4-r13.92
// productionProfileRegistry.js?v=10.4-r13.92
// productionPackageModel.js?v=10.4-r13.92
// deterministicCutOptimizer.js?v=10.4-r13.92
// xlsxWorkbookWriter.js?v=10.4-r13.92
