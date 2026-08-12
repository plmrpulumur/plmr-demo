(function (root) {
  'use strict';

  const COLLECTIONS = Object.freeze({
    SLIDING: { front: 'slidingPlacements', side: 'sideSlidingPlacements' },
    GUILLOTINE: { front: 'guillotinePlacements', side: 'sideGuillotinePlacements' },
    ZIP_SCREEN: { front: 'zipScreenPlacements', side: 'sideZipScreenPlacements' }
  });

  function cloneState(state) {
    const next = {};
    Object.values(COLLECTIONS).forEach(names => {
      next[names.front] = Array.isArray(state && state[names.front]) ? state[names.front].slice() : [];
      next[names.side] = Array.isArray(state && state[names.side]) ? state[names.side].slice() : [];
    });
    return next;
  }

  function allPlacements(state) {
    const source = cloneState(state);
    return Object.values(COLLECTIONS).flatMap(names => [...source[names.front], ...source[names.side]]);
  }

  function sameId(first, second) {
    return String(first && first.id || '') === String(second && second.id || '');
  }

  function upsertExclusive(state, productType, placement, options) {
    const names = COLLECTIONS[productType];
    if (!names) throw new Error(`Desteklenmeyen placement ürünü: ${productType}`);
    if (!placement || typeof placement !== 'object') throw new Error('Ürün placement verisi gerekli.');
    const next = cloneState(state);
    const config = options || {};
    const existing = allPlacements(next).some(item => sameId(item, placement));
    const maxProducts = Math.max(1, Number(config.maxProducts) || Number.MAX_SAFE_INTEGER);
    if (!existing && allPlacements(next).length >= maxProducts) throw new Error(config.limitMessage || `Toplam ürün sınırı ${maxProducts}.`);

    const isSide = ['side-left', 'side-right'].includes(String(placement.placementView || ''));
    if (isSide) {
      const normalizeSideViewKey = config.normalizeSideViewKey || ((key, index) => key || (Number(index) === 1 ? 'right' : 'left'));
      const key = normalizeSideViewKey(placement.sideViewKey, placement.sideIndex);
      const normalizedPlacement = { ...placement, sideViewKey: key, placementView: key === 'right' ? 'side-right' : 'side-left' };
      const sameZone = item => normalizeSideViewKey(item.sideViewKey, item.sideIndex) === key && String(item.sideZone) === String(normalizedPlacement.sideZone);
      Object.values(COLLECTIONS).forEach(collection => {
        next[collection.side] = next[collection.side].filter(item => !sameZone(item) && (collection.side !== names.side || !sameId(item, normalizedPlacement)));
      });
      next[names.side].push(normalizedPlacement);
    } else {
      Object.values(COLLECTIONS).forEach(collection => {
        next[collection.front] = next[collection.front].filter(item => Number(item.gapIndex) !== Number(placement.gapIndex) && (collection.front !== names.front || !sameId(item, placement)));
      });
      next[names.front].push({ ...placement });
    }
    return next;
  }

  function removeById(state, placementId) {
    const next = cloneState(state);
    Object.values(COLLECTIONS).forEach(names => {
      next[names.front] = next[names.front].filter(item => String(item.id || '') !== String(placementId || ''));
      next[names.side] = next[names.side].filter(item => String(item.id || '') !== String(placementId || ''));
    });
    return next;
  }

  const api = { COLLECTIONS, cloneState, allPlacements, upsertExclusive, removeById };
  root.PulumurProductPlacementService = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
