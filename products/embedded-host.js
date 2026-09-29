(function () {
  'use strict';
  let embedded = false;
  try {
    const params = new URL(window.location.href).searchParams;
    embedded = params.get('embedded') === '1' && params.get('host') === 'erp';
  } catch (_) {}
  if (embedded) {
    document.documentElement.setAttribute('data-plmr-embedded', 'erp');
    try { window.name = window.name || 'plmr-erp-drawing-frame'; } catch (_) {}
  }
  window.PulumurEmbeddedHost = Object.freeze({ embedded, host: embedded ? 'erp' : '' });
})();
