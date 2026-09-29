(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PulumurMaterialMaster = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const SCHEMA = 'plmr-material-master-v1';
  const STORAGE_PREFIX = 'plmr_material_master_v1:';
  const SEED_URL = 'production/guillotine/v1/materialMaster.seed.json';
  const SEARCH_FIELDS = Object.freeze(['code','descriptionTr','descriptionEn','category1','category2','category3','unit']);
  const TYPE = Object.freeze({ PROFILE: 'PROFİL', ACCESSORY: 'AKSESUAR', SYSTEM: 'SİSTEM', GLASS: 'CAM', OTHER: 'DİĞER' });

  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function text(value) { return value == null ? '' : String(value).trim(); }
  function numberOrZero(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
  function nowIso() { return new Date().toISOString(); }
  function randomId() { return `mat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`; }

  function fold(value) {
    return text(value)
      .replace(/İ/g, 'i').replace(/I/g, 'i').replace(/ı/g, 'i')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function levenshtein(a, b) {
    const x = fold(a), y = fold(b);
    if (x === y) return 0;
    if (!x.length) return y.length;
    if (!y.length) return x.length;
    const row = Array.from({ length: y.length + 1 }, (_, i) => i);
    for (let i = 1; i <= x.length; i += 1) {
      let prev = row[0]; row[0] = i;
      for (let j = 1; j <= y.length; j += 1) {
        const hold = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (x[i - 1] === y[j - 1] ? 0 : 1));
        prev = hold;
      }
    }
    return row[y.length];
  }

  function fuzzyTokenScore(queryToken, candidateToken) {
    if (!queryToken || !candidateToken) return 0;
    if (candidateToken === queryToken) return 150;
    if (candidateToken.startsWith(queryToken) || (candidateToken.length >= 3 && queryToken.startsWith(candidateToken))) return 120;
    if (candidateToken.includes(queryToken) || (candidateToken.length >= 4 && queryToken.includes(candidateToken))) return 105;
    if (/^\d+$/.test(queryToken)) return 0;
    if (Math.min(queryToken.length, candidateToken.length) < 4) return 0;
    const d = levenshtein(queryToken, candidateToken);
    const limit = Math.max(1, Math.floor(Math.max(queryToken.length, candidateToken.length) * 0.24));
    return d <= limit ? Math.max(45, 90 - (d * 18)) : 0;
  }

  function materialSearchScore(material, query) {
    const q = fold(query);
    if (!q) return 1;
    const qTokens = q.split(/\s+/).filter(Boolean);
    let total = 0;
    let matchedTokens = 0;
    const fieldWeights = { code: 6, descriptionTr: 5, descriptionEn: 4, category1: 3, category2: 3, category3: 2, unit: 2 };
    const fieldValues = SEARCH_FIELDS.map(field => ({ field, value: fold(material && material[field]) })).filter(item => item.value);

    for (const qToken of qTokens) {
      let best = 0;
      for (const item of fieldValues) {
        const weight = fieldWeights[item.field] || 1;
        if (item.field === 'code' && item.value === qToken) best = Math.max(best, 1000);
        if (item.value === qToken) best = Math.max(best, 320 * weight);
        if (item.value.includes(qToken)) best = Math.max(best, 180 * weight);
        for (const token of item.value.split(/\s+/)) best = Math.max(best, fuzzyTokenScore(qToken, token) * weight);
      }
      if (best > 0) { matchedTokens += 1; total += best; }
    }
    if (matchedTokens !== qTokens.length) return 0;
    const combined = fold(SEARCH_FIELDS.map(field => material && material[field]).join(' '));
    if (combined.includes(q)) total += 750;
    return total;
  }

  function searchMaterials(materials, query) {
    const list = Array.isArray(materials) ? materials : [];
    const q = text(query);
    if (!q) return list.slice().sort((a,b) => text(a.code).localeCompare(text(b.code), 'tr', { numeric: true }));
    return list
      .map(material => ({ material, score: materialSearchScore(material, q) }))
      .filter(item => item.score > 0)
      .sort((a,b) => b.score - a.score || text(a.material.code).localeCompare(text(b.material.code), 'tr', { numeric: true }))
      .map(item => item.material);
  }

  function normalizeMaterial(input, context, existing) {
    const source = input || {};
    const previous = existing || {};
    const has = key => Object.prototype.hasOwnProperty.call(source, key);
    const pick = key => has(key) ? source[key] : previous[key];
    const orgId = text(context && context.organizationId);
    const userId = text(context && context.userId) || 'UNKNOWN_USER';
    const timestamp = nowIso();
    const category1 = text(pick('category1'));
    const materialType = text(pick('materialType') || category1 || TYPE.OTHER).toUpperCase();
    return {
      materialId: text(previous.materialId || source.materialId || randomId()),
      organizationId: orgId,
      materialType,
      code: text(pick('code')).toUpperCase(),
      descriptionTr: text(pick('descriptionTr')),
      descriptionEn: text(pick('descriptionEn')) || null,
      category1: category1 || materialType,
      category2: text(pick('category2')) || null,
      category3: text(pick('category3')) || null,
      unit: text(pick('unit')).toUpperCase(),
      unitWeight: numberOrZero(pick('unitWeight')),
      cost: numberOrZero(pick('cost')),
      salePrice: numberOrZero(pick('salePrice')),
      image: text(pick('image')) || null,
      imageSha256: text(pick('imageSha256')) || null,
      source: clone(previous.source || source.source || null),
      createdAt: previous.createdAt || timestamp,
      updatedAt: timestamp,
      createdBy: previous.createdBy || userId,
      updatedBy: userId,
      active: source.active !== undefined ? Boolean(source.active) : (previous.active !== undefined ? Boolean(previous.active) : true)
    };
  }

  function validateMaterial(input, existingList, editingId) {
    const material = input || {};
    const errors = [];
    if (!text(material.materialType)) errors.push('Malzeme Türü zorunludur.');
    if (!text(material.code)) errors.push('Kod zorunludur.');
    if (!text(material.descriptionTr)) errors.push('Türkçe Açıklama zorunludur.');
    if (!text(material.unit)) errors.push('Birim zorunludur.');
    const codeKey = fold(material.code);
    const duplicate = (Array.isArray(existingList) ? existingList : []).find(item => item.materialId !== editingId && fold(item.code) === codeKey && item.active !== false);
    if (duplicate) errors.push(`Kod zaten kullanılıyor: ${duplicate.code}`);
    ['unitWeight','cost','salePrice'].forEach(field => {
      const value = Number(material[field]);
      if (!Number.isFinite(value) || value < 0) errors.push(`${field} sıfır veya pozitif sayı olmalıdır.`);
    });
    return errors;
  }

  function defaultContextProvider() {
    try {
      return root && root.PulumurAccessContext && typeof root.PulumurAccessContext.getContext === 'function'
        ? root.PulumurAccessContext.getContext()
        : { userId: '', organizationId: '', role: '' };
    } catch (_) { return { userId: '', organizationId: '', role: '' }; }
  }

  function createMaterialMaster(options) {
    const opts = options || {};
    const fetchImpl = opts.fetchImpl || (root && root.fetch ? root.fetch.bind(root) : null);
    const storage = opts.storage || (root && root.localStorage ? root.localStorage : null);
    const contextProvider = opts.contextProvider || defaultContextProvider;
    const seedUrl = opts.seedUrl || SEED_URL;
    const cache = new Map();

    function context() {
      const value = contextProvider() || {};
      return { userId: text(value.userId), organizationId: text(value.organizationId), role: text(value.role) };
    }

    function requireContext() {
      const value = context();
      if (!value.organizationId) {
        const error = new Error('MATERIAL_TENANT_UNAVAILABLE'); error.code = 'MATERIAL_TENANT_UNAVAILABLE'; throw error;
      }
      return value;
    }

    function storageKey(orgId) { return `${STORAGE_PREFIX}${orgId}`; }

    function embeddedSeed() {
      const candidate = root && root.PulumurMaterialMasterSeedV1;
      if (!candidate || !Array.isArray(candidate.materials)) return null;
      const url = text(seedUrl).split('?')[0].replace(/\\/g, '/');
      if (url && !url.endsWith('/materialMaster.seed.json') && url !== 'materialMaster.seed.json') return null;
      return clone(candidate);
    }

    async function loadSeed(ctx) {
      let seed = null;
      const fileProtocol = Boolean(root && root.location && root.location.protocol === 'file:');
      if (fileProtocol) seed = embeddedSeed();
      if (!seed && fetchImpl) {
        try {
          const response = await fetchImpl(seedUrl, { cache: 'no-store' });
          if (!response || !response.ok) throw new Error(`MATERIAL_SEED_LOAD_FAILED:${response && response.status || 0}`);
          seed = await response.json();
        } catch (error) {
          seed = embeddedSeed();
          if (!seed) throw error;
        }
      }
      if (!seed) seed = embeddedSeed();
      if (!seed) throw new Error(fetchImpl ? 'MATERIAL_SEED_LOAD_FAILED:0' : 'MATERIAL_SEED_FETCH_UNAVAILABLE');
      const stamp = nowIso();
      const materials = (seed.materials || []).map(item => ({
        ...clone(item),
        organizationId: ctx.organizationId,
        materialType: text(item.category1 || TYPE.OTHER).toUpperCase(),
        createdAt: stamp,
        updatedAt: stamp,
        createdBy: 'SOURCE_SEED',
        updatedBy: 'SOURCE_SEED',
        active: item.active !== false
      }));
      return { schema: SCHEMA, organizationId: ctx.organizationId, source: clone(seed.scope || {}), importedAt: stamp, updatedAt: stamp, materials };
    }

    function readStored(ctx) {
      if (!storage) return null;
      try {
        const raw = storage.getItem(storageKey(ctx.organizationId));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.schema !== SCHEMA || parsed.organizationId !== ctx.organizationId || !Array.isArray(parsed.materials)) return null;
        return parsed;
      } catch (_) { return null; }
    }

    function writeStored(state) {
      if (!storage) throw new Error('MATERIAL_STORAGE_UNAVAILABLE');
      storage.setItem(storageKey(state.organizationId), JSON.stringify(state));
    }

    async function ensureState(force) {
      const ctx = requireContext();
      if (!force && cache.has(ctx.organizationId)) return cache.get(ctx.organizationId);
      const stored = !force ? readStored(ctx) : null;
      const state = stored || await loadSeed(ctx);
      if (!stored && storage) writeStored(state);
      cache.set(ctx.organizationId, state);
      return state;
    }

    async function list(params) {
      const state = await ensureState(false);
      const p = params || {};
      const typeFilter = text(p.materialType).toUpperCase();
      const activeOnly = p.activeOnly !== false;
      let rows = state.materials.filter(item => (!activeOnly || item.active !== false) && (!typeFilter || text(item.materialType).toUpperCase() === typeFilter));
      rows = searchMaterials(rows, p.query || '');
      return clone(rows);
    }

    async function get(materialId) {
      const state = await ensureState(false);
      return clone(state.materials.find(item => item.materialId === materialId) || null);
    }

    async function save(input) {
      const ctx = requireContext();
      const state = await ensureState(false);
      const editingId = text(input && input.materialId);
      const index = editingId ? state.materials.findIndex(item => item.materialId === editingId) : -1;
      const existing = index >= 0 ? state.materials[index] : null;
      if (existing && existing.organizationId !== ctx.organizationId) throw new Error('MATERIAL_TENANT_MISMATCH');
      const material = normalizeMaterial(input, ctx, existing);
      const errors = validateMaterial(material, state.materials, existing && existing.materialId);
      if (errors.length) { const error = new Error(errors[0]); error.code = 'MATERIAL_VALIDATION_FAILED'; error.errors = errors; throw error; }
      if (index >= 0) state.materials[index] = material; else state.materials.push(material);
      state.updatedAt = nowIso();
      writeStored(state);
      cache.set(ctx.organizationId, state);
      return clone(material);
    }

    async function resetTenantToSeed() {
      const ctx = requireContext();
      const state = await loadSeed(ctx);
      writeStored(state);
      cache.set(ctx.organizationId, state);
      return clone(state);
    }

    async function stats() {
      const rows = await list({ activeOnly: true });
      return {
        total: rows.length,
        profiles: rows.filter(item => item.materialType === TYPE.PROFILE).length,
        accessories: rows.filter(item => item.materialType === TYPE.ACCESSORY).length,
        systems: rows.filter(item => item.materialType === TYPE.SYSTEM).length,
        glass: rows.filter(item => item.materialType === TYPE.GLASS).length
      };
    }

    return Object.freeze({ list, get, save, stats, resetTenantToSeed, context, searchMaterials, materialSearchScore });
  }

  const singleton = createMaterialMaster();
  return Object.freeze({ SCHEMA, STORAGE_PREFIX, SEED_URL, SEARCH_FIELDS, TYPE, fold, levenshtein, materialSearchScore, searchMaterials, validateMaterial, normalizeMaterial, createMaterialMaster, store: singleton });
});
