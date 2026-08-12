(function (root) {
  'use strict';
  function createDefaultStock(profile, options) {
    const cfg = profile.stockPolicy;
    const opts = options || profile.defaults;
    const rows = [];
    profile.profiles.forEach(item => {
      cfg.stockLengths.forEach(length => rows.push({
        stockItemId: `${item.code}-${length}-${String(opts.ralCode || '').replace(/\s+/g, '-')}-${opts.surface || 'MAT'}`,
        stockCode: `${item.code}-${length}`,
        profileCode: item.code,
        profileName: item.name,
        stockLength: length,
        availableQuantity: cfg.availableQuantityPerLength,
        reservedQuantity: 0,
        kerf: cfg.kerf,
        startTrim: cfg.startTrim,
        endTrim: cfg.endTrim,
        minimumReusableOffcut: cfg.minimumReusableOffcut,
        color: opts.ralCode || '',
        surface: opts.surface || '',
        unit: cfg.unit,
        notes: 'Albert Genau Sürme pilot varsayılan stoğu'
      }));
    });
    return rows;
  }
  function recolor(stock, options) {
    const opts = options || {};
    return (stock || []).map(item => ({ ...item, color: opts.ralCode || item.color || '', surface: opts.surface || item.surface || '' }));
  }
  root.PulumurAlbertGenauPilotStock = { createDefaultStock, recolor };
  if (typeof module !== 'undefined') module.exports = root.PulumurAlbertGenauPilotStock;
})(typeof window !== 'undefined' ? window : globalThis);
