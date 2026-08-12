(function (root, factory) {
  'use strict';
  const ticketApi = root && root.PulumurProductAccessTicket || (typeof require === 'function' ? require('./productAccessTicket.js') : null);
  const api = factory(ticketApi);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PulumurDirectProductAccessGuard = Object.freeze(api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ticketApi) {
  'use strict';

  function requestedProduct(script, locationObject) {
    const dataset = script && script.dataset || {};
    if (dataset.product) return dataset.product;
    const parameter = dataset.productParam || 'product';
    try { return new URL(locationObject.href).searchParams.get(parameter) || ''; } catch (_) { return ''; }
  }

  function guard(options) {
    const opts = options || {};
    const locationObject = opts.location || (typeof location !== 'undefined' ? location : null);
    const script = opts.script || (typeof document !== 'undefined' ? document.currentScript : null);
    const product = opts.product || requestedProduct(script, locationObject || { href: '' });
    const result = ticketApi.validate(product, { storage: opts.storage, now: opts.now, ticket: opts.ticket });
    const documentObject = opts.document || (typeof document !== 'undefined' ? document : null);
    if (result.allowed) {
      if (documentObject && documentObject.documentElement) {
        documentObject.documentElement.removeAttribute('data-plmr-access-pending');
        documentObject.documentElement.setAttribute('data-plmr-access-granted', result.ticket.product);
      }
      return result;
    }
    if (documentObject && documentObject.documentElement) {
      documentObject.documentElement.removeAttribute('data-plmr-access-pending');
      documentObject.documentElement.setAttribute('data-plmr-access-denied', result.code);
    }
    const fallback = opts.fallback || (script && script.dataset && script.dataset.fallback) || '../../index.html';
    if (locationObject && typeof locationObject.replace === 'function' && opts.redirect !== false) {
      const separator = String(fallback).includes('?') ? '&' : '?';
      locationObject.replace(`${fallback}${separator}accessDenied=${encodeURIComponent(result.code)}`);
    }
    return result;
  }

  if (typeof document !== 'undefined' && document.currentScript && document.currentScript.dataset && document.currentScript.dataset.auto !== 'false') {
    guard({ script: document.currentScript });
  }

  return Object.freeze({ requestedProduct, guard });
});
