(function () {
  'use strict';

  function adapterFor(product) {
    const registry = window.PulumurProductRegistry;
    if (!registry) throw new Error('PRODUCT_REGISTRY_UNAVAILABLE');
    return registry.requireProduct(product);
  }

  function updateModuleForProduct(product, moduleSelect) {
    if (!moduleSelect) return;
    const adapter = adapterFor(product);
    const navigation = adapter.manifest.navigation;
    moduleSelect.innerHTML = '';
    const option = document.createElement('option');
    option.value = navigation.moduleName;
    option.textContent = navigation.moduleName === 'Standalone' ? 'Bağımsız Çizim' : navigation.moduleName;
    option.selected = true;
    moduleSelect.appendChild(option);
  }

  function currentCanonicalProduct() {
    const workspace = window.PulumurUnifiedWorkspace;
    if (workspace && typeof workspace.getActiveProduct === 'function') return workspace.getActiveProduct();
    try {
      const stored = sessionStorage.getItem('plmr_selected_product');
      if (stored) return adapterFor(stored).id;
    } catch (_) {}
    return 'P3DV_BIOCLIMATIC';
  }

  function selectValueForProduct(productId) {
    if (productId === 'PERGO_RISE') return 'Pergo Rise';
    return productId;
  }

  function denyProduct(productSelect, moduleSelect, error) {
    const access = window.PulumurAccessContext;
    const code = String(error && (error.code || error.message) || 'ACCESS_DENIED');
    const message = access && typeof access.messageForCode === 'function'
      ? access.messageForCode(code)
      : 'Bu ürüne erişim yetkiniz yok.';
    window.alert(message);
    const activeProductId = currentCanonicalProduct();
    if (productSelect) productSelect.value = selectValueForProduct(activeProductId);
    updateModuleForProduct(activeProductId, moduleSelect);
  }

  function authorizeAndIssue(product) {
    const adapter = adapterFor(product);
    const access = window.PulumurAccessContext;
    if (!access || typeof access.authorizeProduct !== 'function') {
      const error = new Error('ACCESS_CONTEXT_UNAVAILABLE');
      error.code = 'ACCESS_CONTEXT_UNAVAILABLE';
      throw error;
    }
    // Historical authorization contract marker: access.authorizeProduct(adapter.id).
    // V14 may deliberately map a commercial 3D adapter to its existing entitlement via accessProductId.
    const accessProductId = adapter.accessProductId || adapter.id;
    const decision = access.authorizeProduct(accessProductId);
    if (!decision || !decision.allowed) {
      const error = new Error(decision && decision.code || 'ACCESS_DENIED');
      error.code = decision && decision.code || 'ACCESS_DENIED';
      throw error;
    }
    if (adapter.manifest.navigation.opensDedicatedPage) access.issueProductTicket(adapter.id);
    return { decision, adapter, accessProductId };
  }

  function navigateProduct(adapter) {
    const registry = window.PulumurProductRegistry;
    const navigation = registry.resolveNavigation(adapter.id);
    try { sessionStorage.setItem('plmr_selected_product', adapter.id); } catch (_) {}
    if (navigation.opensDedicatedPage && navigation.href) window.location.href = navigation.href;
  }

  let productRequestSequence = 0;

  function requestAuthorizedProduct(productValue, options) {
    const opts = options || {};
    const productSelect = document.getElementById('product');
    const moduleSelect = document.getElementById('moduleName');
    try {
      const result = authorizeAndIssue(productValue);
      productRequestSequence += 1;
      const requestId = String(opts.requestId || `product-request-${productRequestSequence}`);
      // One authorization path serves both the visible shell selector and embedded P3DV
      // requests. ProductRouter authorizes only; PulumurUnifiedWorkspace remains the
      // sole owner of the actual active-product transition.
      document.dispatchEvent(new CustomEvent('plmr:product-authorized', { detail: {
        ...result,
        requestId,
        requestedAt: Date.now(),
        source: String(opts.source || 'product-selector'),
        runtimeAction: opts.runtimeAction && typeof opts.runtimeAction === 'object' ? opts.runtimeAction : null
      } }));
      navigateProduct(result.adapter);
      return Object.freeze({ ok: true, adapter: result.adapter, requestId });
    } catch (error) {
      denyProduct(productSelect, moduleSelect, error);
      return Object.freeze({ ok: false, error });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const product = document.getElementById('product');
    if (!product) return;
    product.addEventListener('change', function () {
      requestAuthorizedProduct(product.value, { source: 'product-selector' });
    }, { capture: true });
  });

  const api = Object.freeze({ updateModuleForProduct, authorizeAndIssue, requestProduct: requestAuthorizedProduct });
  window.PulumurProductRouter = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})();
