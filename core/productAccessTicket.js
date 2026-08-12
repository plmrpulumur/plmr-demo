(function (root, factory) {
  'use strict';
  const policy = root && root.PulumurAccessPolicy || (typeof require === 'function' ? require('./accessPolicy.js') : null);
  const api = factory(policy);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PulumurProductAccessTicket = Object.freeze(api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (policy) {
  'use strict';

  const SCHEMA = 'plmr-product-access-ticket-v1';
  const STORAGE_KEY = 'plmr_product_access_ticket_v1';
  const DEFAULT_TTL_MS = 2 * 60 * 1000;

  function randomNonce() {
    const bytes = new Uint8Array(16);
    const cryptoApi = typeof globalThis !== 'undefined' && globalThis.crypto;
    if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') cryptoApi.getRandomValues(bytes);
    else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function storageOrThrow(storage) {
    const target = storage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null);
    if (!target || typeof target.getItem !== 'function' || typeof target.setItem !== 'function') throw new Error('ACCESS_TICKET_STORAGE_UNAVAILABLE');
    return target;
  }

  function issue(input, options) {
    const source = input || {};
    const opts = options || {};
    const product = policy.normalizeProduct(source.product || source.requestedProduct);
    const userId = String(source.userId || '').trim();
    const organizationId = String(source.organizationId || '').trim();
    if (!product || !userId || !organizationId) throw new Error('ACCESS_TICKET_CONTEXT_INVALID');
    const now = Number(opts.now == null ? Date.now() : opts.now);
    const ttlMs = Math.min(5 * 60 * 1000, Math.max(10 * 1000, Number(opts.ttlMs || DEFAULT_TTL_MS)));
    const ticket = Object.freeze({
      schema: SCHEMA,
      product,
      userId,
      organizationId,
      role: String(source.role || '').trim().toLowerCase(),
      issuedAt: now,
      expiresAt: now + ttlMs,
      nonce: typeof opts.nonce === 'string' ? opts.nonce : randomNonce()
    });
    storageOrThrow(opts.storage).setItem(STORAGE_KEY, JSON.stringify(ticket));
    return ticket;
  }

  function read(options) {
    const opts = options || {};
    try {
      const raw = storageOrThrow(opts.storage).getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function validate(requestedProduct, options) {
    const opts = options || {};
    const ticket = opts.ticket || read(opts);
    const product = policy.normalizeProduct(requestedProduct);
    const now = Number(opts.now == null ? Date.now() : opts.now);
    if (!ticket) return Object.freeze({ allowed: false, code: 'ACCESS_TICKET_MISSING' });
    if (ticket.schema !== SCHEMA) return Object.freeze({ allowed: false, code: 'ACCESS_TICKET_SCHEMA_INVALID' });
    if (!/^[0-9a-f]{32}$/i.test(String(ticket.nonce || ''))) return Object.freeze({ allowed: false, code: 'ACCESS_TICKET_NONCE_INVALID' });
    if (!Number.isFinite(Number(ticket.issuedAt)) || !Number.isFinite(Number(ticket.expiresAt)) || Number(ticket.expiresAt) <= Number(ticket.issuedAt)) {
      return Object.freeze({ allowed: false, code: 'ACCESS_TICKET_TIME_INVALID' });
    }
    if (now > Number(ticket.expiresAt)) return Object.freeze({ allowed: false, code: 'ACCESS_TICKET_EXPIRED' });
    if (now + 1000 < Number(ticket.issuedAt)) return Object.freeze({ allowed: false, code: 'ACCESS_TICKET_NOT_ACTIVE' });
    if (!product || policy.normalizeProduct(ticket.product) !== product) return Object.freeze({ allowed: false, code: 'ACCESS_TICKET_PRODUCT_MISMATCH' });
    if (!String(ticket.userId || '') || !String(ticket.organizationId || '')) return Object.freeze({ allowed: false, code: 'ACCESS_TICKET_CONTEXT_INVALID' });
    return Object.freeze({ allowed: true, code: 'ACCESS_TICKET_VALID', ticket: Object.freeze({ ...ticket, product }) });
  }

  function clear(options) {
    try { storageOrThrow(options && options.storage).removeItem(STORAGE_KEY); } catch (_) {}
  }

  return Object.freeze({ SCHEMA, STORAGE_KEY, DEFAULT_TTL_MS, issue, read, validate, clear });
});
