(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PulumurAccessPolicy = Object.freeze(api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA = 'plmr-access-policy-v1';
  const PRODUCT_ALIASES = Object.freeze({
    PERGO_RISE: ['PERGO_RISE', 'PERGO RISE', 'PERGORISE', 'PERGO-RISE'],
    SLIDING: ['SLIDING', 'SURME', 'SÜRME'],
    GUILLOTINE: ['GUILLOTINE', 'GIYOTIN', 'GİYOTİN'],
    ZIP_SCREEN: ['ZIP_SCREEN', 'ZIP SCREEN', 'ZIP-SCREEN', 'ZIP PERDE', 'ZIP_PERDE'],
    BCUBE_FREEDOM: ['BCUBE_FREEDOM', 'B_CUBE_FREEDOM', 'B-CUBE FREEDOM', 'B CUBE FREEDOM', 'FREEDOM']
  });
  const ALL_PRODUCTS = Object.freeze(Object.keys(PRODUCT_ALIASES));

  function upper(value) {
    return String(value == null ? '' : value).trim().toLocaleUpperCase('tr-TR');
  }

  function normalizeProduct(value) {
    const raw = upper(value).replace(/\s+/g, ' ');
    if (!raw) return '';
    if (raw === '*' || raw === 'ALL' || raw === 'TUMU' || raw === 'TÜMÜ') return '*';
    for (const [id, aliases] of Object.entries(PRODUCT_ALIASES)) {
      if (id === raw || aliases.some(alias => upper(alias) === raw)) return id;
    }
    return raw.replace(/[\s-]+/g, '_');
  }

  function normalizeEnabledProducts(value) {
    let source = value;
    if (typeof source === 'string') {
      try { source = JSON.parse(source); } catch (_) { source = source.split(/[;,]/); }
    }
    if (!Array.isArray(source)) return [];
    return Array.from(new Set(source.map(normalizeProduct).filter(Boolean)));
  }

  function parseTime(value) {
    if (value == null || value === '') return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value > 1e12 ? value : value * 1000;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function decodeJwtPayload(token) {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    try {
      const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
      const text = typeof Buffer !== 'undefined'
        ? Buffer.from(padded, 'base64').toString('utf8')
        : decodeURIComponent(Array.prototype.map.call(atob(padded), char => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
      const payload = JSON.parse(text);
      return payload && typeof payload === 'object' ? payload : null;
    } catch (_) {
      return null;
    }
  }

  function sessionIssuedAt(session) {
    const explicit = parseTime(session && (session.issued_at || session.issuedAt));
    if (explicit != null) return explicit;
    const payload = decodeJwtPayload(session && session.access_token);
    const tokenIssued = parseTime(payload && payload.iat);
    if (tokenIssued != null) return tokenIssued;
    return parseTime(session && session.user && session.user.last_sign_in_at);
  }

  function dateOnly(value) {
    if (!value) return '';
    const text = String(value).slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
  }

  function decision(allowed, code, details) {
    return Object.freeze({
      schema: SCHEMA,
      allowed: Boolean(allowed),
      code: String(code || (allowed ? 'ACCESS_GRANTED' : 'ACCESS_DENIED')),
      ...(details || {})
    });
  }

  function evaluateAccess(input) {
    const source = input || {};
    const session = source.session || null;
    const sessionUser = session && session.user || null;
    const verifiedUser = source.verifiedUser || null;
    const profile = source.profile || null;
    const organization = source.organization || null;
    const sessionUserId = String(sessionUser && sessionUser.id || '');
    const verifiedUserId = String(verifiedUser && verifiedUser.id || '');
    const profileId = String(profile && profile.id || '');
    const profileOrganizationId = String(profile && profile.organization_id || profile && profile.organizationId || '');
    const organizationId = String(organization && organization.id || '');
    const role = String(profile && profile.role || '').trim().toLowerCase();
    const requestedProduct = normalizeProduct(source.requestedProduct);
    const now = source.now == null ? Date.now() : parseTime(source.now);
    const today = new Date(now == null ? Date.now() : now).toISOString().slice(0, 10);

    if (!session || !sessionUserId || !session.access_token) return decision(false, 'AUTH_REQUIRED');
    if (!verifiedUserId) return decision(false, 'AUTH_NOT_VERIFIED');
    if (sessionUserId !== verifiedUserId) return decision(false, 'AUTH_IDENTITY_MISMATCH');
    if (!profile || !profileId) return decision(false, 'PROFILE_NOT_FOUND');
    if (profileId !== verifiedUserId) return decision(false, 'PROFILE_IDENTITY_MISMATCH');
    if (profile.is_active === false) return decision(false, 'PROFILE_INACTIVE');
    if (!profileOrganizationId || !organizationId || profileOrganizationId !== organizationId) return decision(false, 'TENANT_MISMATCH');
    if (organization.is_active === false) return decision(false, 'ORGANIZATION_INACTIVE');

    const licenseStart = dateOnly(organization.license_start || organization.licenseStart);
    const licenseEnd = dateOnly(organization.license_end || organization.licenseEnd);
    if (licenseStart && today < licenseStart) return decision(false, 'LICENSE_NOT_STARTED', { licenseStart, today });
    if (licenseEnd && today > licenseEnd) return decision(false, 'LICENSE_EXPIRED', { licenseEnd, today });

    const revokedAt = parseTime(profile.session_revoked_at || profile.sessionRevokedAt);
    if (revokedAt != null) {
      const issuedAt = sessionIssuedAt(session);
      if (issuedAt == null) return decision(false, 'SESSION_ISSUED_AT_MISSING');
      const revokedSecond = Math.floor(revokedAt / 1000) * 1000;
      if (issuedAt < revokedSecond) return decision(false, 'SESSION_REVOKED', { issuedAt, revokedAt });
    }

    const expectedOrganizationId = String(source.expectedOrganizationId || '');
    if (expectedOrganizationId && expectedOrganizationId !== organizationId) return decision(false, 'TENANT_ACCESS_DENIED');

    const enabledProducts = normalizeEnabledProducts(organization.enabled_products || organization.enabledProducts);
    if (requestedProduct) {
      const roleBypass = role === 'system_admin';
      const entitled = roleBypass || enabledProducts.includes('*') || enabledProducts.includes(requestedProduct);
      if (!entitled) return decision(false, 'PRODUCT_NOT_ENTITLED', { requestedProduct, enabledProducts, role });
    }

    return decision(true, 'ACCESS_GRANTED', {
      userId: verifiedUserId,
      organizationId,
      role,
      requestedProduct,
      enabledProducts
    });
  }

  function assertAccess(input) {
    const result = evaluateAccess(input);
    if (!result.allowed) {
      const error = new Error(result.code);
      error.code = result.code;
      error.decision = result;
      throw error;
    }
    return result;
  }

  function assertTenantRecord(record, organizationId) {
    const expected = String(organizationId || '');
    const actual = String(record && (record.organization_id || record.organizationId) || '');
    if (!expected || !actual || expected !== actual) {
      const error = new Error('TENANT_ACCESS_DENIED');
      error.code = 'TENANT_ACCESS_DENIED';
      throw error;
    }
    return record;
  }

  function filterTenantRows(rows, organizationId) {
    const expected = String(organizationId || '');
    if (!expected) return [];
    return (Array.isArray(rows) ? rows : []).filter(row => String(row && (row.organization_id || row.organizationId) || '') === expected);
  }

  return Object.freeze({
    SCHEMA,
    PRODUCT_ALIASES,
    ALL_PRODUCTS,
    normalizeProduct,
    normalizeEnabledProducts,
    decodeJwtPayload,
    sessionIssuedAt,
    evaluateAccess,
    assertAccess,
    assertTenantRecord,
    filterTenantRows
  });
});
