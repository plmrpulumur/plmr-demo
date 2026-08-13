(function () {
  'use strict';

  const build = '10.30-r30';
  const key = 'plmr_loaded_build';
  const cachePrefix = 'pulumur-pwa-';

  try {
    if (localStorage.getItem(key) !== build) {
      localStorage.setItem(key, build);
      if ('caches' in window) {
        caches.keys()
          .then(keys => Promise.all(keys.filter(name => name.startsWith(cachePrefix)).map(name => caches.delete(name))))
          .catch(() => {});
      }
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // A service-worker update must never interrupt an in-progress login or
          // authenticated workspace. Dynamic runtime assets are network-first and
          // versioned, so the current page can finish safely without a forced reload.
          window.PULUMUR_SW_UPDATED_BUILD = build;
          try {
            window.dispatchEvent(new CustomEvent('plmr:service-worker-updated', { detail: { build } }));
          } catch (_) {}
        }, { once: true });
        navigator.serviceWorker.getRegistrations()
          .then(registrations => Promise.all(registrations.map(registration => registration.update())))
          .catch(() => {});
      }
    }
  } catch (_) {}

  window.PULUMUR_BUILD = build;
})();
