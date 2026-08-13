(function () {
  'use strict';

  const APP_VERSION = '10.5';
  const PROJECT_FORMAT = 'PULUMUR_PROJECT';
  const PROJECT_SCHEMA_VERSION = 2;

  const ids = [
    'product', 'moduleName', 'engine', 'customer', 'project', 'version', 'drawnBy', 'date',
    'systemCount', 'width', 'opening', 'rearHeight', 'frontHeight', 'rayCount', 'postCount',
    'parapet', 'parapetHeight', 'glassTrack', 'glassRayBoundaryMode', 'sideTrack', 'structureColor', 'fabric', 'fabricProfiles',
    'motor', 'remote', 'led', 'dimmer', 'extras', 'triangleJoinery', 'waterStandard', 'waterOutletPlacement'
  ];

  const $ = id => document.getElementById(id);
  const statusText = $('statusText');
  const preview = $('preview');
  const previewPanel = document.querySelector('.preview-panel');
  let previewBrowserFullscreenActive = false;
  let previewFullscreenFallback = false;
  let lastDrawing = null;
  let lastCalc = null;
  const upperTableFieldIds = ['structureColor', 'fabric', 'fabricProfiles', 'motor', 'remote', 'led', 'dimmer', 'extras'];
  const PROJECT_TEXT_FIELD_IDS = new Set(['customer', 'project', 'drawnBy', 'structureColor', 'fabric', 'fabricProfiles', 'motor', 'remote', 'led', 'dimmer', 'extras']);

  const BOOLEAN_FIELD_IDS = ['parapet', 'glassTrack', 'triangleJoinery', 'waterStandard'];
  const BOOLEAN_CANONICAL = {
    EVET: { tr: 'EVET', en: 'YES' },
    HAYIR: { tr: 'HAYIR', en: 'NO' }
  };
  let currentLanguage = 'tr';
  let deferredInstallPrompt = null;
  let pendingDimensionEdit = null;
  let suppressFormPreviewUpdate = false;
  let previewUpdateTimer = null;
  let topologyReconcileReport = null;

  let wrappingFields = false;
  const previewState = { zoom: 1, baseScale: 1, minZoom: 0.35, maxZoom: 12, dragActive: false, dragStartX: 0, dragStartY: 0, dragScrollLeft: 0, dragScrollTop: 0, pointerId: null, dragMoved: false };
  const previewGestureState = {
    pointers: new Map(),
    active: false,
    startDistance: 0,
    startZoom: 1,
    anchorWorldX: 0,
    anchorWorldY: 0,
    latestMetrics: null,
    frameId: 0,
    suppressClickUntil: 0
  };
  let previewResizeFrame = 0;
  const previewDimensionFilter = { main: true, all: false, preset: 'main', horizontal: true, vertical: true, editable: true, readonly: true, positions: null };
  let manualPostPlacementMode = 'standard';
  let glassTrackProfileState = { mode: 'standard', en: 100, boy: 100, et: 2 };
  let glassSupportProfileState = { left: null, right: null };
  let customFrontPostCenters = null;
  let customSideSupportCenters = {};
  let customSidePosts = {};
  let sideAutoSupportSuppressed = {};
  let frontPostProfiles = [];
  let horizontalFacadeProfiles = { front: [], side: {} };
  let slidingPlacements = [];
  let sideSlidingPlacements = [];
  let pendingSlidingPlacementMeta = null;
  let guillotinePlacements = [];
  let sideGuillotinePlacements = [];
  let pendingGuillotinePlacementMeta = null;
  let zipScreenPlacements = [];
  let sideZipScreenPlacements = [];
  let pendingZipScreenPlacementMeta = null;
  let toolboxSelectionMode = null;
  let toolboxSelectionItems = new Map();
  let toolboxContextMenu = null;
  let toolboxSelectionBanner = null;
  const bulkProfileSelectionState = {
    selected: new Map(), groupKey: null, active: false, ctrlDown: false, shiftDown: false,
    opening: false, editorOpen: false, pendingOpenTimer: 0, generation: 0
  };
  let bulkProfileSelectionBanner = null;
  let drawingCheckHighlightTimer = null;
  let customRayPositions = null;
  let frontPostExtensions = [];
  let parapetSegments = { front: [], side: {} };
  let topBackWallSegments = {};
  let topBackWallGridState = {};
  let rearSupportState = normalizeRearSupportStateForApp(null);
  let pendingRearSupportEdit = null;
  let gutterEditState = { minusXDelta: 0, plusXDelta: 0, groups: {} };
  let independentSideViewVisibility = {};
  let waterOutletPipeState = { diameter: 70, length: 300, offsets: {}, deleted: {} };
  let upperTableTransform = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
  let upperTableDragState = null;
  let sideFeatureState = {
    glassTrack: { left: null, right: null, middle: {} },
    triangle: { left: null, right: null, middle: {} },
    middleEnabled: {}
  };
  let glassTrackLengthOffsets = { left: 0, right: 0, middle: {} };
  let triangleDivisionState = { left: null, right: null, middle: {} };
  let backWallState = { left: { enabled: true, xOffset: 0, depth: 600, height: 0 }, right: { enabled: true, xOffset: 0, depth: 600, height: 0 }, middle: {} };
  let backWallSegments = { side: {} };
  let backWallGridState = { side: {} };
  let trapezSheetBounds = {};
  let selectedBackWallCopySource = null;
  let syncingSideFeatureForm = false;
  let previewDimensionOffsets = {};
  let hiddenDimensionIds = [];
  let dimensionDragState = null;
  let dimensionFilterMenuBound = false;
  const projectStore = window.PulumurProjectReducer.createStore(window.PulumurProjectModel.createEmpty(), {
    validate: model => window.PulumurProjectValidation.validateProjectModel(model)
  });
  const projectHistoryManager = window.PulumurHistoryManager.create({
    getLimit: () => Number(applicationLimits().historySteps) || 20
  });
  const projectHistory = projectHistoryManager.state;
  const projectTransactionHistory = window.PulumurTransactionCommandEngine
    ? window.PulumurTransactionCommandEngine.createLegacyAdapter({ historyManager: projectHistoryManager })
    : null;
  let lastProjectAction = null;
  projectStore.subscribe((model, action, report) => {
    lastProjectAction = action || lastProjectAction;
    if (report) topologyReconcileReport = report;
  });

  function dispatchProjectAction(type, payload, meta = {}) {
    const action = window.PulumurProjectActions.create(type, payload, meta);
    projectStore.dispatch(action);
    if (window.PulumurRuntimeMonitor && typeof window.PulumurRuntimeMonitor.setLastAction === 'function') {
      window.PulumurRuntimeMonitor.setLastAction(action);
    }
    return action;
  }

  function applicationLimits() {
    const api = window.PulumurLimits;
    return api && typeof api.get === 'function' ? api.get() : {
      maxSystems: 30, maxRaysPerSystem: 4, maxFrontPosts: 150,
      maxSideSupportsPerView: 8, maxProducts: 200,
      maxSegmentsPerView: 50, historySteps: 20, maxProjectFileMb: 10,
      maxWidthDigits: 5, maxOpeningDigits: 5, maxHeightDigits: 4,
      maxRayCountDigits: 1, maxPostCountDigits: 2, minPostClearSpacingMm: 150
    };
  }

  function splitNumericTokens(value) {
    return String(value == null ? '' : value).split(';').map(token => token.trim()).filter(token => token && token.toLocaleUpperCase('tr-TR') !== 'NO');
  }

  function inputPolicyError(field, code, message, details = {}) {
    const error = new Error(message);
    error.code = code;
    error.field = field;
    Object.assign(error, details || {});
    return error;
  }

  function fieldDigitPolicies() {
    const limits = applicationLimits();
    return {
      width: Number(limits.maxWidthDigits) || 5,
      opening: Number(limits.maxOpeningDigits) || 5,
      rearHeight: Number(limits.maxHeightDigits) || 4,
      frontHeight: Number(limits.maxHeightDigits) || 4,
      rayCount: Number(limits.maxRayCountDigits) || 1,
      postCount: Number(limits.maxPostCountDigits) || 2
    };
  }

  function assertInputDigitPolicies(raw) {
    const policy = window.PulumurInputLimitPolicy;
    if (!policy || typeof policy.firstDigitViolation !== 'function') return;
    const labels = currentLanguage === 'en'
      ? { width: 'Width', opening: 'Projection', rearHeight: 'Rear H', frontHeight: 'Front H', rayCount: 'Rail Count', postCount: 'Post Count' }
      : { width: 'Genişlik', opening: 'Açılım', rearHeight: 'Arka H', frontHeight: 'Ön H', rayCount: 'Ray Sayısı', postCount: 'Dikme Sayısı' };
    Object.entries(fieldDigitPolicies()).forEach(([field, limit]) => {
      const violation = policy.firstDigitViolation(raw && raw[field], limit);
      if (!violation) return;
      const message = currentLanguage === 'en'
        ? `${labels[field]} allows at most ${limit} digits for each value separated by ; or :.`
        : `${labels[field]} alanında ; veya : ile ayrılan her değer en fazla ${limit} hane olabilir.`;
      throw inputPolicyError(field, 'INPUT_TOKEN_DIGIT_LIMIT', message, violation);
    });
  }

  function effectiveManualPostMaximum(limits = applicationLimits()) {
    const digits = Math.max(1, Number(limits.maxPostCountDigits) || 2);
    const digitMaximum = Math.pow(10, digits) - 1;
    return Math.min(Number(limits.maxFrontPosts) || digitMaximum, digitMaximum);
  }

  function assertPostSpacingPolicy(raw) {
    const policy = window.PulumurInputLimitPolicy;
    const rules = window.PulumurMultiPositionRules;
    if (!policy || !rules || !String(raw && raw.postCount || '').trim()) return;
    const limits = applicationLimits();
    const minimumClear = Math.max(0, Number(limits.minPostClearSpacingMm) || 150);
    const hardMaximum = effectiveManualPostMaximum(limits);
    const fail = (count, width, maximum) => {
      const message = currentLanguage === 'en'
        ? `For ${Math.round(width)} mm width, the post count cannot exceed ${maximum}. A minimum clear distance of ${minimumClear} mm is required between 100 mm posts.`
        : `${Math.round(width)} mm genişlikte dikme sayısı en fazla ${maximum} olabilir. 100 mm dikmeler arasında en az ${minimumClear} mm net mesafe korunmalıdır.`;
      throw inputPolicyError('postCount', 'POST_CLEAR_SPACING_MINIMUM', message, { count, width, maximum, minimumClear });
    };
    const check = (count, width) => {
      const safeCount = Math.max(0, Math.round(Number(count) || 0));
      if (!safeCount) return;
      const spacingMaximum = policy.maxPostsForWidth(width, minimumClear, policy.DEFAULT_POST_WIDTH_MM || 100);
      const maximum = Math.max(0, Math.min(hardMaximum, spacingMaximum));
      if (safeCount > maximum) fail(safeCount, width, maximum);
    };
    const independentWidth = typeof rules.parseIndependentWidthGroups === 'function'
      ? rules.parseIndependentWidthGroups(raw.width, limits) : null;
    if (independentWidth && independentWidth.ok && independentWidth.independent) {
      const postValues = rules.parseIndependentPositionField(raw.postCount, independentWidth, { field: 'postCount', allowBlank: true, integer: true, minimum: 0 });
      if (!postValues.ok || !postValues.values.length) return;
      const widths = independentWidth.groups.flatMap(group => group.widths || []);
      postValues.values.forEach((count, index) => check(count, widths[index]));
      return;
    }
    const countResult = rules.systemCount(raw.systemCount, limits.maxSystems);
    if (!countResult.ok) return;
    const widthResult = rules.parseWidth(raw.width, countResult.count, limits);
    if (!widthResult.ok) return;
    const tokens = policy.numericTokenStrings(raw.postCount).map(Number).filter(Number.isFinite);
    if (!tokens.length) return;
    if (tokens.length === 1) check(tokens[0], widthResult.total);
    else if (tokens.length === widthResult.widths.length) tokens.forEach((count, index) => check(count, widthResult.widths[index]));
  }

  function stateProductCount() {
    return slidingPlacements.length + sideSlidingPlacements.length + guillotinePlacements.length + sideGuillotinePlacements.length + zipScreenPlacements.length + sideZipScreenPlacements.length;
  }

  function assertStateWithinLimits(raw) {
    const limits = applicationLimits();
    const widthText = String(raw && raw.width || '');
    const widthTokenCount = /(?:^|;)\s*NO\s*(?:;|$)/i.test(widthText)
      ? Math.ceil(splitNumericTokens(widthText).length / 2)
      : splitNumericTokens(widthText).length;
    const systemTokens = Math.max(widthTokenCount, splitNumericTokens(raw && raw.opening).length, splitNumericTokens(raw && raw.rearHeight).length, splitNumericTokens(raw && raw.rayCount).length);
    const requestedSystems = Math.max(1, Math.round(Number(raw && raw.systemCount) || 1), systemTokens);
    if (requestedSystems > limits.maxSystems) throw new Error(currentLanguage === 'en' ? `System/position limit exceeded (${requestedSystems}/${limits.maxSystems}).` : `Poz/sistem sınırı aşıldı (${requestedSystems}/${limits.maxSystems}).`);
    const rays = splitNumericTokens(raw && raw.rayCount).map(Number).filter(Number.isFinite);
    if (rays.some(value => value > limits.maxRaysPerSystem)) throw new Error(currentLanguage === 'en' ? `The rail limit per position is ${limits.maxRaysPerSystem}.` : `Poz başına ray sınırı ${limits.maxRaysPerSystem}.`);
    const posts = Math.max(0, Math.round(Number(String(raw && raw.postCount || '').split(';')[0]) || 0));
    if (posts > limits.maxFrontPosts) throw new Error(currentLanguage === 'en' ? `The front-post limit is ${limits.maxFrontPosts}.` : `Ön dikme sınırı ${limits.maxFrontPosts}.`);
    Object.entries(customSidePosts || {}).forEach(([key, items]) => {
      if (Array.isArray(items) && items.length > limits.maxSideSupportsPerView) throw new Error(currentLanguage === 'en' ? `Side support limit exceeded in view ${key}.` : `${key} yan görünüşünde destek dikmesi sınırı aşıldı.`);
    });
    if (stateProductCount() > limits.maxProducts) throw new Error(currentLanguage === 'en' ? `The total product limit is ${limits.maxProducts}.` : `Toplam ürün sınırı ${limits.maxProducts}.`);
    const segmentLists = [];
    if (parapetSegments && Array.isArray(parapetSegments.front)) segmentLists.push(parapetSegments.front);
    if (parapetSegments && parapetSegments.side) Object.values(parapetSegments.side).forEach(list => segmentLists.push(list));
    if (topBackWallSegments && typeof topBackWallSegments === 'object') Object.values(topBackWallSegments).forEach(list => segmentLists.push(list));
    if (backWallSegments && backWallSegments.side) Object.values(backWallSegments.side).forEach(list => segmentLists.push(list));
    if (backWallGridState && backWallGridState.side) Object.values(backWallGridState.side).forEach(grid => segmentLists.push(grid && grid.cells));
    if (segmentLists.some(list => Array.isArray(list) && list.length > limits.maxSegmentsPerView)) throw new Error(currentLanguage === 'en' ? `The wall/parapet segment limit per view is ${limits.maxSegmentsPerView}.` : `Görünüş başına duvar/parapet parça sınırı ${limits.maxSegmentsPerView}.`);
  }

  function trimProjectHistory() {
    projectHistoryManager.trim();
  }
  let currentProjectRecord = { projectId: null, projectCode: null, revisionNo: 1, serverVersion: null };
  const EXCEL_COMBO_OPTIONS = {
    motor: ['-', 'RISING MOTOR', 'SOMFY RTS', 'SOMFY IO'],
    fabric: [
      '-',
      'C 1602 - 3D (8118-1622)',
      'C 3017 - 3D',
      'C 3105 - 3D',
      'C 6001 - 3D',
      'C 7019 - 3D (8118-7024)',
      'C 7075 - 3D (8118-7340)',
      'C 7995 - 3D (8118-7999)',
      'C 9012 - 3D (8118-9002)',
      'C 1602 - M (8116-1622)',
      'C 1638 - M',
      'C 7009 - M',
      'C 9012 - M (8116-9002)',
      'C 1602 - K (8290-1622)',
      'C 9012 - D (8290-9002)'
    ]
  };
  const REMOTE_OPTIONS_BY_MOTOR = {
    'RISING MOTOR': ['-', 'RISING 6 CHANNELS'],
    'SOMFY RTS': ['-', 'SITUO 2 RTS', 'SITUO 5 RTS', 'TELIS 16 RTS'],
    'SOMFY IO': ['-', 'SITUO 2 IO', 'SITUO 5 IO'],
    '-': ['-'],
    '': ['-']
  };
  const EXCEL_DEFAULT_INPUT = {
    product: 'Pergo Rise', moduleName: 'Module 1', engine: 'Web DXF',
    customer: '', project: '', version: '01', drawnBy: 'AYETULLAH KILINC', date: '',
    systemCount: '', width: '', opening: '', rearHeight: '', frontHeight: '', rayCount: '', postCount: '',
    parapet: 'HAYIR', parapetHeight: '-', glassTrack: 'HAYIR', glassRayBoundaryMode: 'DARALT', sideTrack: 'HAYIR',
    structureColor: '-', fabric: '-', fabricProfiles: '-', motor: '-', remote: '-', led: '-', dimmer: '-', extras: '-',
    triangleJoinery: 'HAYIR', waterStandard: 'EVET', waterOutletPlacement: 'BOTH'
  };

  // V8.2.66: Ölçü -> Zone -> Profil / Ürün -> görünüş ilişkisi için UI altyapısı
  const SMART_ACTION_LABELS = {
    tr: { resize: 'Sadece ölçüyü değiştir', addSameProfile: 'Bu aralığa aynı profilden ekle', addDifferentProfile: 'Bu aralığa farklı profil ekle', addHorizontalProfile: 'Yatay Profil Ekle (100 × 100)', placeProduct: 'Bu alana ürün yerleştir', editProfile: 'Mevcut ürünü düzenle', removeElement: 'Mevcut elemanı kaldır' },
    en: { resize: 'Resize this dimension only', addSameProfile: 'Add same profile to this gap', addDifferentProfile: 'Add different profile to this gap', addHorizontalProfile: 'Add Horizontal Profile (100 × 100)', placeProduct: 'Place product in this zone', editProfile: 'Edit existing product', removeElement: 'Remove current element' }
  };
  const SMART_PRODUCT_OPTIONS = [
    { id: 'sliding_glass', tr: 'Sürme Cam', en: 'Sliding Glass' },
    { id: 'guillotine_glass', tr: 'Giyotin Cam', en: 'Guillotine' },
    { id: 'zip_screen', tr: 'Zip Perde', en: 'Zip Screen' }
  ];
  const SMART_PROFILE_OPTIONS = [
    { id: 'same_post', tr: 'Aynı dikme profili', en: 'Same post profile', side: 100, top: 100 },
    { id: 'side_register_100', tr: 'Yan Kayıt 100', en: 'Side register 100', side: 100, top: 100 },
    { id: 'side_register_40x130', tr: 'Yan Kayıt 40x130', en: 'Side register 40x130', side: 40, top: 130 }
  ];


  function sanitizeGlassTrackProfile(profile) {
    const raw = profile || {};
    let mode = String(raw.mode || 'standard').trim().toLowerCase();
    let en = Number(raw.en);
    let boy = Number(raw.boy);
    let et = Number(raw.et);
    if (mode === '40x130x2' || mode === '40x130') {
      en = 40; boy = 130; et = 2; mode = '40x130x2';
    } else if (mode !== 'other') {
      en = 100; boy = 100; et = 2; mode = 'standard';
    }
    en = Math.max(5, Number.isFinite(en) ? en : 100);
    boy = Math.max(5, Number.isFinite(boy) ? boy : 100);
    et = Math.max(0, Number.isFinite(et) ? et : 2);
    et = Math.min(et, Math.max(0, Math.min(en, boy) / 2 - 0.1));
    return { mode, en, boy, et };
  }

  function sanitizeOptionalGlassTrackProfile(profile) {
    if (!profile) return null;
    return sanitizeGlassTrackProfile(profile);
  }


  function normalizeSideViewKey(rawKey, sideIndex = 0) {
    const key = String(rawKey == null ? '' : rawKey).trim().toLowerCase();
    if (key === 'right') return 'right';
    const n = Number(key === '' ? sideIndex : key.replace(/^middle[_:-]?/, ''));
    return String(Math.max(0, Number.isFinite(n) ? Math.round(n) : Number(sideIndex) || 0));
  }

  function sideViewKeyFromMeta(meta) {
    if (!meta) return '0';
    if (String(meta.sideViewKey || '').trim()) return normalizeSideViewKey(meta.sideViewKey, meta.sideIndex ?? meta.index);
    if (meta.placementView === 'side-right' || meta.view === 'Right') return 'right';
    return normalizeSideViewKey('', meta.sideIndex ?? meta.index ?? 0);
  }

  function normalizeSideFeatureStateForApp(raw = null) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const defaultGlass = normalizeYesNo($('glassTrack') && $('glassTrack').value) === 'EVET';
    const defaultTriangle = normalizeYesNo($('triangleJoinery') && $('triangleJoinery').value) === 'EVET';
    const bool = (value, fallback) => value === null || value === undefined ? !!fallback : !!value;
    const middle = value => {
      const out = {};
      if (value && typeof value === 'object') Object.entries(value).forEach(([key, enabled]) => { out[normalizeSideViewKey(key, Number(key) || 0)] = !!enabled; });
      return out;
    };
    return {
      glassTrack: { left: bool(source.glassTrack && source.glassTrack.left, defaultGlass), right: bool(source.glassTrack && source.glassTrack.right, defaultGlass), middle: middle(source.glassTrack && source.glassTrack.middle) },
      triangle: { left: bool(source.triangle && source.triangle.left, defaultTriangle), right: bool(source.triangle && source.triangle.right, defaultTriangle), middle: middle(source.triangle && source.triangle.middle) },
      middleEnabled: middle(source.middleEnabled)
    };
  }

  function normalizeGlassTrackLengthOffsetsForApp(raw = null) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
    const middle = {};
    if (source.middle && typeof source.middle === 'object') Object.entries(source.middle).forEach(([key, value]) => { middle[normalizeSideViewKey(key, Number(key) || 0)] = num(value); });
    return { left: num(source.left), right: num(source.right), middle };
  }


  function normalizeTriangleDivisionStateForApp(raw = null) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const norm = value => value === undefined || value === null || String(value).trim() === ''
      ? null
      : (Number.isFinite(Number(value)) ? Math.max(1, Math.round(Number(value))) : null);
    const middle = {};
    if (source.middle && typeof source.middle === 'object') Object.entries(source.middle).forEach(([key, value]) => { middle[normalizeSideViewKey(key, Number(key) || 0)] = norm(value); });
    return { left: norm(source.left), right: norm(source.right), middle };
  }

  function normalizeSideAutoSupportSuppressedForApp(raw = null) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return Object.fromEntries(Object.entries(source)
      .map(([key, value]) => [normalizeSideViewKey(key, Number(key) || 0), value === true])
      .filter(([, value]) => value));
  }

  function sanitizeSignedDecimalForApp(value) {
    if (window.PulumurGeometry && typeof window.PulumurGeometry.sanitizeSignedDecimalInput === 'function') {
      return window.PulumurGeometry.sanitizeSignedDecimalInput(value);
    }
    const source = String(value == null ? '' : value).replace(/[\u2212\u2013\u2014]/g, '-');
    const sign = source.includes('-') ? '-' : (source.includes('+') ? '+' : '');
    let separatorSeen = false;
    let body = '';
    for (const char of source.replace(/[+-]/g, '')) {
      if (/[0-9]/.test(char)) body += char;
      else if ((char === ',' || char === '.') && !separatorSeen) { body += char; separatorSeen = true; }
    }
    return sign + body;
  }

  const REAR_STEEL_POST_PRESETS = Object.freeze({
    '100x100x3': { width: 100, depth: 100, thickness: 3 },
    '100x150x3': { width: 100, depth: 150, thickness: 3 },
    '120x120x3': { width: 120, depth: 120, thickness: 3 },
    '150x150x3': { width: 150, depth: 150, thickness: 3 }
  });
  const REAR_STEEL_BEAM_PRESETS = Object.freeze({
    '100x100x3': { planDepth: 100, elevationHeight: 100, thickness: 3 },
    '100x100x5': { planDepth: 100, elevationHeight: 100, thickness: 5 },
    '100x150x3': { planDepth: 100, elevationHeight: 150, thickness: 3 },
    '100x150x5': { planDepth: 100, elevationHeight: 150, thickness: 5 },
    '100x200x3': { planDepth: 100, elevationHeight: 200, thickness: 3 },
    '100x200x5': { planDepth: 100, elevationHeight: 200, thickness: 5 }
  });

  function rearSteelProfileLabel(first, second, thickness) {
    const clean = value => String(Number(Number(value).toFixed(3)));
    return `${clean(first)}x${clean(second)}x${clean(thickness)} mm`;
  }

  function normalizeRearSupportStateForApp(raw = null) {
    if (window.PulumurProjectModel && typeof window.PulumurProjectModel.normalizeRearSupport === 'function') {
      return window.PulumurProjectModel.normalizeRearSupport(raw);
    }
    const source = raw && typeof raw === 'object' ? raw : {};
    const postRaw = source.postProfile && typeof source.postProfile === 'object' ? source.postProfile : {};
    const beamRaw = source.beamProfile && typeof source.beamProfile === 'object' ? source.beamProfile : {};
    const postKey = REAR_STEEL_POST_PRESETS[postRaw.key] ? postRaw.key : '100x100x3';
    const postBase = postRaw.source === 'custom' ? postRaw : REAR_STEEL_POST_PRESETS[postKey];
    const width = Math.max(1, Number(postBase.width) || 100), depth = Math.max(1, Number(postBase.depth) || 100);
    const postThickness = Math.min(width, depth, Math.max(0.1, Number(postBase.thickness) || 3));
    const beamKey = REAR_STEEL_BEAM_PRESETS[beamRaw.key] ? beamRaw.key : '100x100x3';
    const beamBase = REAR_STEEL_BEAM_PRESETS[beamKey];
    const planDepth = Math.max(1, Number(beamRaw.planDepth ?? beamRaw.width) || beamBase.planDepth);
    const elevationHeight = Math.max(1, Number(beamRaw.elevationHeight ?? beamRaw.height) || beamBase.elevationHeight);
    const beamThickness = Math.min(planDepth, elevationHeight, Math.max(0.1, Number(beamRaw.thickness) || beamBase.thickness));
    return {
      type: String(source.type || '').toLowerCase() === 'steel' ? 'steel' : 'wall',
      postProfile: { source: postRaw.source === 'custom' ? 'custom' : 'preset', key: postRaw.source === 'custom' ? null : postKey, width, depth, thickness: postThickness, label: rearSteelProfileLabel(width, depth, postThickness) },
      beamProfile: { source: 'preset', key: beamKey, width: planDepth, height: elevationHeight, planDepth, elevationHeight, thickness: beamThickness, label: rearSteelProfileLabel(planDepth, elevationHeight, beamThickness) }
    };
  }

  function normalizeBackWallStateForApp(raw = null) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const wall = value => {
      const item = value && typeof value === 'object' ? value : {};
      return {
        enabled: item.enabled !== false,
        xOffset: Number.isFinite(Number(item.xOffset)) ? Number(item.xOffset) : 0,
        depth: Math.max(1, Number(item.depth) || 600),
        height: Math.max(0, Number(item.height) || 0)
      };
    };
    const middle = {};
    if (source.middle && typeof source.middle === 'object') Object.entries(source.middle).forEach(([key, value]) => { middle[normalizeSideViewKey(key, Number(key) || 0)] = wall(value); });
    return { left: wall(source.left), right: wall(source.right), middle };
  }

  function normalizeBackWallSegmentsForApp(raw = null) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const side = {};
    if (source.side && typeof source.side === 'object') {
      Object.entries(source.side).forEach(([rawKey, items]) => {
        const key = normalizeSideViewKey(rawKey, Number(rawKey) || 0);
        const cleaned = Array.isArray(items) ? items.map((item, index) => ({
          id: String(item && item.id || `back_wall_${key}_${index + 1}`),
          start: Math.max(0, Number(item && item.start) || 0),
          end: Math.max(0, Number(item && item.end) || 0),
          height: Math.max(0, Number(item && item.height) || 0)
        })).filter(item => item.end > item.start).sort((a, b) => a.start - b.start) : [];
        if (cleaned.length) side[key] = cleaned;
      });
    }
    return { side };
  }


  function normalizeBackWallGridStateForApp(raw = null) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const side = {};
    if (source.side && typeof source.side === 'object') {
      Object.entries(source.side).forEach(([rawKey, value]) => {
        const key = normalizeSideViewKey(rawKey, Number(rawKey) || 0);
        const item = value && typeof value === 'object' ? value : {};
        const bounds = item.bounds && typeof item.bounds === 'object' ? item.bounds : {};
        let minX = Number.isFinite(Number(bounds.minX)) ? Number(bounds.minX) : 0;
        let maxX = Number.isFinite(Number(bounds.maxX)) ? Number(bounds.maxX) : 600;
        let minY = Number.isFinite(Number(bounds.minY)) ? Number(bounds.minY) : 0;
        let maxY = Number.isFinite(Number(bounds.maxY)) ? Number(bounds.maxY) : 1;
        if (!(maxX > minX)) { minX = 0; maxX = 600; }
        if (!(maxY > minY)) { minY = 0; maxY = 1; }
        const cells = Array.isArray(item.cells) ? item.cells.map((cell, index) => {
          const rawCell = cell && typeof cell === 'object' ? cell : {};
          const cellMinX = Number(rawCell.minX);
          const cellMaxX = Number(rawCell.maxX);
          const cellMinY = Number(rawCell.minY);
          const cellMaxY = Number(rawCell.maxY);
          if (![cellMinX, cellMaxX, cellMinY, cellMaxY].every(Number.isFinite) || !(cellMaxX > cellMinX && cellMaxY > cellMinY)) return null;
          return { id: String(rawCell.id || `back_wall_cell_${key}_${index + 1}`), ...(rawCell.enabled === false ? { enabled: false } : {}), minX: cellMinX, maxX: cellMaxX, minY: cellMinY, maxY: cellMaxY };
        }).filter(Boolean) : [];
        const legacyAutomaticHeight = item.autoHeight === true || (item.autoHeight == null && Math.abs(minY) <= 0.000001 && maxY <= 1.000001);
        const xs = new Set(cells.flatMap(cell => [cell.minX, cell.maxX]).map(value => Number(value).toFixed(6)));
        const ys = new Set(cells.flatMap(cell => [cell.minY, cell.maxY]).map(value => Number(value).toFixed(6)));
        const columns = Math.max(1, Math.floor(Number(item.columns) || Math.max(1, xs.size - 1)));
        const rows = Math.max(1, Math.floor(Number(item.rows) || Math.max(1, ys.size - 1)));
        const candidate = { version: 1, autoHeight: legacyAutomaticHeight, columns, rows, bounds: { minX, maxX, minY, maxY }, cells };
        side[key] = window.PulumurProjectModel && typeof window.PulumurProjectModel.normalizeBackWallGrid === 'function'
          ? window.PulumurProjectModel.normalizeBackWallGrid(candidate, [], maxX - minX, maxY - minY)
          : candidate;
      });
    }
    return { side };
  }


  function backWallGridForKey(sideKey, rearHeight = 0) {
    const key = normalizeSideViewKey(sideKey, 0);
    const stored = backWallGridState && backWallGridState.side ? backWallGridState.side[key] : null;
    if (stored && stored.bounds && Array.isArray(stored.cells) && stored.cells.length) {
      const grid = deepCloneJson(stored);
      const rawWall = sideScopedStateValue(backWallState, key, null) || {};
      const hasSegments = !!(backWallSegments && backWallSegments.side && Array.isArray(backWallSegments.side[key]) && backWallSegments.side[key].length);
      const oldMaxY = Number(grid.bounds.maxY) || 1;
      const automaticHeight = grid.autoHeight === true || (grid.autoHeight !== false && !(Number(rawWall.height) > 0) && !hasSegments && Number(grid.bounds.minY) === 0 && oldMaxY <= 1.000001);
      if (automaticHeight) {
        const resolvedMaxY = Math.max(1, Number(rearHeight) || wallStateForKey(key, rearHeight).height);
        grid.autoHeight = true;
        grid.bounds.minY = 0;
        grid.bounds.maxY = resolvedMaxY;
        grid.cells = grid.cells.map(cell => ({
          ...cell,
          minY: Number(cell.minY) <= 0.000001 ? 0 : Number(cell.minY) / oldMaxY * resolvedMaxY,
          maxY: Number(cell.maxY) >= oldMaxY - 0.000001 ? resolvedMaxY : Number(cell.maxY) / oldMaxY * resolvedMaxY
        }));
      }
      return grid;
    }
    const wall = wallStateForKey(key, rearHeight);
    const segments = backWallSegmentsForKey(key, rearHeight);
    const maxX = segments.reduce((value, item) => Math.max(value, Number(item.end) || 0), wall.depth);
    const maxY = segments.reduce((value, item) => Math.max(value, Number(item.height) || 0), wall.height);
    return {
      version: 1,
      columns: Math.max(1, segments.length),
      rows: 1,
      bounds: { minX: 0, maxX: Math.max(1, maxX), minY: 0, maxY: Math.max(1, maxY) },
      cells: segments.map((item, index) => ({
        id: String(item.id || `back_wall_cell_${key}_${index + 1}`),
        minX: Math.max(0, Number(item.start) || 0), maxX: Math.max(0, Number(item.end) || 0),
        minY: 0, maxY: Math.max(1, Number(item.height) || maxY)
      })).filter(item => item.maxX > item.minX)
    };
  }

  function storeBackWallGridForKey(sideKey, grid) {
    const key = normalizeSideViewKey(sideKey, 0);
    if (!backWallGridState || typeof backWallGridState !== 'object') backWallGridState = { side: {} };
    if (!backWallGridState.side || typeof backWallGridState.side !== 'object') backWallGridState.side = {};
    const normalized = normalizeBackWallGridStateForApp({ side: { [key]: grid } }).side[key];
    if (normalized && normalized.cells.length) backWallGridState.side[key] = normalized;
    else delete backWallGridState.side[key];
  }


  function backWallGridBoundsFromCells(cells, fallbackBounds = null) {
    const valid = (Array.isArray(cells) ? cells : []).filter(cell => cell && [cell.minX, cell.maxX, cell.minY, cell.maxY].every(value => Number.isFinite(Number(value))) && Number(cell.maxX) > Number(cell.minX) && Number(cell.maxY) > Number(cell.minY));
    if (!valid.length) return fallbackBounds ? { ...fallbackBounds } : { minX: 0, maxX: 600, minY: 0, maxY: 1 };
    return {
      minX: Math.min(...valid.map(cell => Number(cell.minX))),
      maxX: Math.max(...valid.map(cell => Number(cell.maxX))),
      minY: Math.min(...valid.map(cell => Number(cell.minY))),
      maxY: Math.max(...valid.map(cell => Number(cell.maxY)))
    };
  }

  function backWallCellOverlapsEnabledCell(cells, candidate, ignoredId = '') {
    const epsilon = 1e-7;
    return (Array.isArray(cells) ? cells : []).some(cell => {
      if (!cell || cell.enabled === false || String(cell.id) === String(ignoredId)) return false;
      const overlapX = Math.min(Number(cell.maxX), Number(candidate.maxX)) - Math.max(Number(cell.minX), Number(candidate.minX));
      const overlapY = Math.min(Number(cell.maxY), Number(candidate.maxY)) - Math.max(Number(cell.minY), Number(candidate.minY));
      return overlapX > epsilon && overlapY > epsilon;
    });
  }

  function syncBackWallCompatibilityFromGrid(sideKey, grid) {
    const key = normalizeSideViewKey(sideKey, 0);
    const bounds = grid && grid.bounds ? grid.bounds : { minY: 0 };
    const bottom = (grid && Array.isArray(grid.cells) ? grid.cells : [])
      .filter(cell => cell && cell.enabled !== false && Number(cell.minY) <= Number(bounds.minY) + 0.001)
      .sort((a, b) => Number(a.minX) - Number(b.minX) || Number(a.maxX) - Number(b.maxX));
    const segments = bottom.map((cell, index) => ({
      id: `back_wall_${key}_${String(cell.id || index + 1)}`,
      start: Math.max(0, Number(cell.minX) || 0),
      end: Math.max(0, Number(cell.maxX) || 0),
      height: Math.max(1, Number(cell.maxY) || 1)
    })).filter(item => item.end > item.start);
    storeBackWallSegmentsForKey(key, segments);
  }

  function backWallSegmentsForKey(sideKey, rearHeight = 0) {
    const key = normalizeSideViewKey(sideKey, 0);
    const stored = backWallSegments && backWallSegments.side && Array.isArray(backWallSegments.side[key]) ? backWallSegments.side[key] : null;
    if (stored && stored.length) return stored.map(item => ({ ...item }));
    const wall = wallStateForKey(key, rearHeight);
    return [{ id: `back_wall_${key}_1`, start: 0, end: wall.depth, height: wall.height }];
  }

  function storeBackWallSegmentsForKey(sideKey, list) {
    const key = normalizeSideViewKey(sideKey, 0);
    if (!backWallSegments || typeof backWallSegments !== 'object') backWallSegments = { side: {} };
    if (!backWallSegments.side || typeof backWallSegments.side !== 'object') backWallSegments.side = {};
    const cleaned = (Array.isArray(list) ? list : []).map((item, index) => ({
      id: String(item && item.id || `back_wall_${key}_${index + 1}`),
      start: Math.max(0, Number(item && item.start) || 0),
      end: Math.max(0, Number(item && item.end) || 0),
      height: Math.max(0, Number(item && item.height) || 0)
    })).filter(item => item.end > item.start).sort((a, b) => a.start - b.start);
    if (cleaned.length) backWallSegments.side[key] = cleaned;
    else delete backWallSegments.side[key];
  }

  function sideScopedStateValue(state, sideKey, fallback = null) {
    const key = normalizeSideViewKey(sideKey, 0);
    if (!state) return fallback;
    if (key === 'right') return state.right == null ? fallback : state.right;
    if (key === '0') return state.left == null ? fallback : state.left;
    return state.middle && state.middle[key] != null ? state.middle[key] : fallback;
  }

  function setSideScopedStateValue(state, sideKey, value) {
    const key = normalizeSideViewKey(sideKey, 0);
    if (key === 'right') state.right = value;
    else if (key === '0') state.left = value;
    else { if (!state.middle) state.middle = {}; state.middle[key] = value; }
  }

  function triangleDivisionForKey(sideKey, fallback = null) {
    return sideScopedStateValue(triangleDivisionState, sideKey, fallback);
  }

  function wallStateForKey(sideKey, rearHeight = 0) {
    const raw = sideScopedStateValue(backWallState, sideKey, null) || {};
    return {
      enabled: raw.enabled !== false,
      xOffset: Number.isFinite(Number(raw.xOffset)) ? Number(raw.xOffset) : 0,
      depth: Math.max(1, Number(raw.depth) || 600),
      height: Math.max(1, Number(raw.height) || Number(rearHeight) || 1)
    };
  }

  function ensureSideFeatureStateInitialized() {
    if (sideFeatureState.glassTrack.left === null || sideFeatureState.glassTrack.right === null || sideFeatureState.triangle.left === null || sideFeatureState.triangle.right === null) {
      sideFeatureState = normalizeSideFeatureStateForApp(sideFeatureState);
    }
  }

  function sideFeatureValue(feature, sideKey) {
    ensureSideFeatureStateInitialized();
    const key = normalizeSideViewKey(sideKey, 0);
    const state = sideFeatureState[feature];
    if (!state) return false;
    if (key === 'right') return !!state.right;
    if (key === '0') return !!state.left;
    return !!(state.middle && state.middle[key]);
  }

  function setSideFeatureValue(feature, sideKey, enabled) {
    ensureSideFeatureStateInitialized();
    const key = normalizeSideViewKey(sideKey, 0);
    const state = sideFeatureState[feature];
    if (!state) return;
    if (key === 'right') state.right = !!enabled;
    else if (key === '0') state.left = !!enabled;
    else { if (!state.middle) state.middle = {}; state.middle[key] = !!enabled; }
  }

  function setMainSideFeatureValue(field, enabled) {
    const feature = field === 'triangleJoinery' ? 'triangle' : 'glassTrack';
    ensureSideFeatureStateInitialized();
    sideFeatureState[feature].left = !!enabled;
    sideFeatureState[feature].right = !!enabled;
    Object.keys(sideFeatureState[feature].middle || {}).forEach(key => { sideFeatureState[feature].middle[key] = !!enabled && !!sideFeatureState.middleEnabled[key]; });
  }

  function syncMainFormFromSideFeature(feature) {
    const field = feature === 'triangle' ? 'triangleJoinery' : 'glassTrack';
    const select = $(field);
    if (!select) return;
    ensureSideFeatureStateInitialized();
    const state = sideFeatureState[feature];
    const any = !!state.left || !!state.right || Object.values(state.middle || {}).some(Boolean);
    syncingSideFeatureForm = true;
    try { select.value = any ? 'EVET' : 'HAYIR'; }
    finally { syncingSideFeatureForm = false; }
    if (feature === 'glassTrack') syncGlassRayBoundaryControl();
  }

  function normalizeGlassRayBoundaryMode(value) {
    return String(value || '').trim().toLocaleUpperCase('tr-TR') === 'DEGISTIRME' ? 'DEGISTIRME' : 'DARALT';
  }

  function syncGlassRayBoundaryControl() {
    const hidden = $('glassRayBoundaryMode');
    const quick = $('glassRayBoundaryQuickBtn');
    const enabled = normalizeYesNo($('glassTrack') && $('glassTrack').value) === 'EVET';
    const mode = normalizeGlassRayBoundaryMode(hidden && hidden.value);
    const shrinkEnabled = mode === 'DARALT';
    if (hidden) hidden.value = mode;
    if (!quick) return;
    quick.disabled = !enabled;
    quick.setAttribute('aria-disabled', enabled ? 'false' : 'true');
    quick.setAttribute('aria-pressed', shrinkEnabled ? 'true' : 'false');
    quick.classList.toggle('is-disabled', !enabled);
    quick.classList.toggle('is-yes', shrinkEnabled);
    quick.classList.toggle('is-no', !shrinkEnabled);
    const state = quick.querySelector('.boolean-quick-state');
    if (state) state.textContent = BOOLEAN_CANONICAL[shrinkEnabled ? 'EVET' : 'HAYIR'][currentLanguage] || (shrinkEnabled ? 'EVET' : 'HAYIR');
    quick.title = enabled
      ? (currentLanguage === 'en' ? 'Toggle whether outside glass tracks narrow the rail boundaries.' : 'Dış cam kayıtlarının ray sınırlarını daraltıp daraltmayacağını değiştirir.')
      : (currentLanguage === 'en' ? 'Enabled when Glass Track is YES.' : 'Cam Kaydı EVET olduğunda aktifleşir.');
  }

  function setGlassRayBoundaryMode(value, options = {}) {
    const hidden = $('glassRayBoundaryMode');
    const mode = normalizeGlassRayBoundaryMode(value);
    if (hidden) hidden.value = mode;
    syncGlassRayBoundaryControl();
    if (options.dispatch !== false) dispatchProjectAction(window.PulumurProjectActions.TYPES.SET_FORM_FIELD, { field: 'glassRayBoundaryMode', value: mode }, { source: 'glass-ray-boundary', allowInvalid: true });
    if (options.update !== false) {
      applyAutoRayPost(false);
      schedulePreviewUpdate(0);
    }
    return mode;
  }

  function glassTrackLengthOffsetForKey(sideKey) {
    const key = normalizeSideViewKey(sideKey, 0);
    if (key === 'right') return Number(glassTrackLengthOffsets.right) || 0;
    if (key === '0') return Number(glassTrackLengthOffsets.left) || 0;
    return Number(glassTrackLengthOffsets.middle && glassTrackLengthOffsets.middle[key]) || 0;
  }

  function setGlassTrackLengthOffsetForKey(sideKey, value) {
    const key = normalizeSideViewKey(sideKey, 0), numeric = Number(value) || 0;
    if (key === 'right') glassTrackLengthOffsets.right = numeric;
    else if (key === '0') glassTrackLengthOffsets.left = numeric;
    else { if (!glassTrackLengthOffsets.middle) glassTrackLengthOffsets.middle = {}; glassTrackLengthOffsets.middle[key] = numeric; }
  }

  function supportProfileScopeLabel(scope, isEn) {
    if (scope === 'left') return isEn ? 'left-side support post' : 'sol yan destek dikmesi';
    if (scope === 'right') return isEn ? 'right-side support post' : 'sağ yan destek dikmesi';
    if (String(scope || '').startsWith('middle_')) {
      const n = Number(String(scope).replace('middle_', '')) + 1;
      return isEn ? `intermediate position ${n} support post` : `${n}. ara poz destek dikmesi`;
    }
    return isEn ? 'support post' : 'destek dikmesi';
  }

  const UI_TEXT = {
    tr: {
      langLabel: 'Dil', helpBtn: 'Yardım', installBtn: 'Ana Ekrana Ekle',
      appTitleMain: 'Pülümür Automation Studio', appTitleSub: '| Parametrik Çizim ve Proje Otomasyonu | Hazırlayan / Geliştiren : Ayetullah KILINÇ',
      labelProduct: 'Ürün', labelModule: 'Modül', labelEngine: 'Çizim Motoru',
      legendProject: 'Proje Bilgileri', legendSystem: 'Sistem Ölçüleri <b>*(mm)</b>', legendOptions: 'Opsiyonlar', legendExtra: 'Ek Opsiyonlar',
      labelSystemCount: 'Sistem Adedi', labelWidth: 'Genişlik', labelOpening: 'Açılım',
      labelRearHeight: 'Arka H', labelFrontHeight: 'Ön H <em>Oluk Altı</em>',
      labelRayCount: 'Ray Sayısı <b>Bir Sistem</b>', labelPostCount: 'Dikme Sayısı <b>Tüm Sistem</b>',
      project_customer: 'Müşteri', project_project: 'Proje', project_version: 'Revizyon', project_drawnBy: 'Çizen', project_date: 'Tarih', project_code: 'Proje Kodu', project_revision: 'Revizyon', editSectionBtn: 'Düzenle', sectionResetBtn: 'Resetle',
      options_parapet: 'Parapet', options_parapetHeight: 'Parapet H <b>*(mm)</b>', options_glassTrack: 'Cam Kaydı', glassRayBoundaryToggle: 'Ray Sınırlarını Daralt',
      options_structureColor: 'Taşıyıcı Rengi', options_fabric: 'Kumaş', options_fabricProfiles: 'Kumaş Profilleri',
      options_motor: 'Motor', options_remote: 'Kumanda', options_led: 'LED', options_dimmer: 'Dimmer', options_extras: 'Ekstralar / Notlar',
      extra_triangleJoinery: 'Üçgen Doğrama', extra_waterStandard: 'Su Çıkışı Standart mı?', extra_waterOutletPlacement: 'Fi70 Pipe Konumu', waterOutletFront: 'Ön', waterOutletSides: 'Yan', waterOutletBoth: 'Ön + Yan', quickTestsHead: 'Hızlı Testler',
      previewTitle: 'Çizim Ön İzleme', previewBtn: 'Önizlemeyi Yenile', expandPreviewBtn: 'Önizlemeyi Büyüt', undoPreviewBtn: 'Geri Al', redoPreviewBtn: 'İleri Al', historyGroupLabel: 'Çizim geçmişi', shrinkPreviewBtn: 'Önizlemeyi Küçült', showMainDimsLabel: 'Ana ölçüleri göster', showAllDimsLabel: 'Tüm ölçüleri göster',
      pdfBtn: 'PDF İndir', generateBtn: 'DXF İndir', resetBtn: 'Tüm Değerleri Resetle', calcBtn: 'Pülümür Hesaplayıcı', projectExportBtn: 'Proje Dosyası İndir', previewProjectExportBtn: 'Proje Dosyası İndir', projectImportBtn: 'Proje Dosyası Aç', checkDrawingBtn: 'Çizimi Kontrol Et', multiProductBtn: 'Çoklu Ürün Ekleme', multiDimensionBtn: 'Çoklu Ölçü Düzenleme', equalizeGapsBtn: 'Aralıkları Eşitle', postSettingsBtn: 'Dikme Ayarları', bulkExtendBtn: 'Çoklu Profil Uzat', bulkPostProfileBtn: 'Dikme Profilini Toplu Değiştir', convertProductBtn: 'Ürün Tipini Değiştir', fitProductsBtn: 'Ürünü Alana Uydur', detailCopyBtn: 'Detay Kopyala', multiDeleteBtn: 'Çoklu Ürün Silme', deleteAllProductsBtn: 'Tüm Ürünleri Sil',
      calcTitle: 'Pülümür Hesaplayıcı', calcSub: '4 satırdan herhangi 3 tanesini doldur. Boş olan değer hesaplanır.',
      calcGuide: '<strong>TR</strong><ul><li>4 alandan 3 tanesini doldur.</li><li>Hesaplanacak alanı boş bırak.</li><li>Hesapla’ya bas.</li><li>Sonucu ana forma aktar.</li></ul>',
      calcWaiting: 'Sonuç bekleniyor.', calcReady: 'Sonuç', calcPoz: 'poz', calcOpenNote: 'Ana formdaki açılım / arka / ön değerleri aktarıldı. Açıyı hesaplamak için Hesapla’ya bas.',
      calcAngleLabel: 'Sistem Açısı (°)', calcOpeningLabel: 'Açılım *(mm)', calcRearLabel: 'Arka H *(mm)', calcFrontLabel: 'Ön H *(mm)',
      calcComputeBtn: 'Hesapla', calcTransferBtn: 'Sonucu Hücrelere Aktar', calcClearBtn: 'Sıfırla', helpTitle: 'Yardım / Kullanım Kılavuzu', helpCloseBtn: 'Kapat', emptyPreview: 'Önizleme için zorunlu ölçüleri doldur.',
      placeholders: {
        systemCount: 'Örn. 1', width: 'Örn. 4000 veya 3000;100;2500;NO', opening: 'Örn. 6000 veya 4500;5200', rearHeight: 'Örn. 3200 veya 3200;3400', frontHeight: 'Örn. 2600',
        rayCount: 'Örn. 2 veya 2;3;2', postCount: 'Örn. 2 veya boş: otomatik', calcAngle: 'Örn. 4.16 veya boş', calcOpening: 'Örn. 4500;5200 veya boş', calcRear: 'Örn. 3200;3400 veya boş', calcFront: 'Örn. 2600 veya boş'
      }
    },
    en: {
      langLabel: 'Language', helpBtn: 'Help', installBtn: 'Add to Home Screen',
      appTitleMain: 'Pülümür Automation Studio', appTitleSub: '| Parametric Drawing and Project Automation | Prepared / Developed by: Ayetullah KILINÇ',
      labelProduct: 'Product', labelModule: 'Module', labelEngine: 'Drawing Engine',
      legendProject: 'Project Info', legendSystem: 'System Dimensions <b>*(mm)</b>', legendOptions: 'Options', legendExtra: 'Extra Options',
      labelSystemCount: 'System Count', labelWidth: 'Width', labelOpening: 'Projection',
      labelRearHeight: 'Rear H', labelFrontHeight: 'Front H <em>Gutter Bottom</em>',
      labelRayCount: 'Rail Count <b>Per System</b>', labelPostCount: 'Post Count <b>All Systems</b>',
      project_customer: 'Customer', project_project: 'Project', project_version: 'Revision', project_drawnBy: 'Drawn By', project_date: 'Date', project_code: 'Project Code', project_revision: 'Revision', editSectionBtn: 'Edit', sectionResetBtn: 'Reset',
      options_parapet: 'Parapet', options_parapetHeight: 'Parapet H <b>*(mm)</b>', options_glassTrack: 'Glass Track', glassRayBoundaryToggle: 'Narrow Rail Boundaries',
      options_structureColor: 'Structure Color', options_fabric: 'Fabric', options_fabricProfiles: 'Fabric Profiles',
      options_motor: 'Motor', options_remote: 'Remote', options_led: 'LED', options_dimmer: 'Dimmer', options_extras: 'Extras / Notes',
      extra_triangleJoinery: 'Triangle Joinery', extra_waterStandard: 'Standard Water Outlet?', extra_waterOutletPlacement: 'Fi70 Pipe Position', waterOutletFront: 'Front', waterOutletSides: 'Side', waterOutletBoth: 'Front + Side', quickTestsHead: 'Quick Tests',
      previewTitle: 'Drawing Preview', previewBtn: 'Refresh Preview', expandPreviewBtn: 'Expand Preview', undoPreviewBtn: 'Undo', redoPreviewBtn: 'Redo', historyGroupLabel: 'Drawing history', shrinkPreviewBtn: 'Collapse Preview', showMainDimsLabel: 'Show main dimensions', showAllDimsLabel: 'Show all dimensions',
      pdfBtn: 'Download PDF', generateBtn: 'Download DXF', resetBtn: 'Reset All Values', calcBtn: 'Pulumur Calculator', projectExportBtn: 'Download Project File', previewProjectExportBtn: 'Download Project File', projectImportBtn: 'Open Project File', checkDrawingBtn: 'Check Drawing', multiProductBtn: 'Multiple Product Placement', multiDimensionBtn: 'Multiple Dimension Editing', equalizeGapsBtn: 'Equalize Gaps', postSettingsBtn: 'Post Settings', bulkExtendBtn: 'Extend Multiple Profiles', bulkPostProfileBtn: 'Change Post Profiles in Bulk', convertProductBtn: 'Change Product Type', fitProductsBtn: 'Fit Product to Opening', detailCopyBtn: 'Copy Detail', multiDeleteBtn: 'Delete Multiple Products', deleteAllProductsBtn: 'Delete All Products',
      calcTitle: 'Pulumur Calculator', calcSub: 'Fill any 3 of the 4 rows. The empty value will be calculated.',
      calcGuide: '<strong>EN</strong><ul><li>Fill 3 of the 4 fields.</li><li>Leave one field empty.</li><li>Click Calculate.</li><li>Transfer the result to the main form.</li></ul>',
      calcWaiting: 'Waiting for result.', calcReady: 'Result', calcPoz: 'position', calcOpenNote: 'Projection / rear H / front H values were copied from the main form. Click Calculate to calculate the angle.',
      calcAngleLabel: 'System Angle (°)', calcOpeningLabel: 'Projection *(mm)', calcRearLabel: 'Rear H *(mm)', calcFrontLabel: 'Front H *(mm)',
      calcComputeBtn: 'Calculate', calcTransferBtn: 'Transfer Result', calcClearBtn: 'Clear', helpTitle: 'Help / User Guide', helpCloseBtn: 'Close', emptyPreview: 'Fill the required dimensions for preview.',
      placeholders: {
        systemCount: 'Ex. 1', width: 'Ex. 4000 or 3000;100;2500;NO', opening: 'Ex. 6000 or 4500;5200', rearHeight: 'Ex. 3200 or 3200;3400', frontHeight: 'Ex. 2600',
        rayCount: 'Ex. 2 or 2;3;2', postCount: 'Ex. 2 or blank: auto', calcAngle: 'Ex. 4.16 or blank', calcOpening: 'Ex. 4500;5200 or blank', calcRear: 'Ex. 3200;3400 or blank', calcFront: 'Ex. 2600 or blank'
      }
    }
  };


  const SLIDING_UI_TEXT = {
    tr: {
      title: 'Sürme Detayları', productSeries: 'Ürün Serisi', type: 'Tip', openingType: 'Açılım Tipi',
      glassThickness: 'Cam Kalınlığı', glassColor: 'Cam Rengi', aSeries: 'A Serisi', kSeries: 'K Serisi',
      withThreshold: 'Eşikli', withoutThreshold: 'Eşiksiz', sideOpening: 'Yana Açılım', centerOpening: 'Ortadan Açılım',
      mm8: '8 mm', mm10: '10 mm', insulatedGlass: 'Yalıtımlı Cam', transparent: 'Şeffaf', grey: 'Gri',
      bronze: 'Bronz', lowEGlass: 'Low-e Cam', other: 'Diğer', otherPlaceholder: 'Özel cam rengini yazın',
      pozNo: 'Poz No', width: 'Genişlik *', height: 'Yükseklik *', panelCount: 'Panel Sayısı',
      cancel: 'İptal', confirm: 'Tamam', close: 'Kapat',
      otherRequired: 'Diğer seçildiğinde cam rengini yazmalısın.',
      placed: (poz, left, right) => `${poz} sürme cam, Dikme ${left} ile Dikme ${right} arasına yerleştirildi.`
    },
    en: {
      title: 'Sliding Details', productSeries: 'Product Series', type: 'Type', openingType: 'Opening Type',
      glassThickness: 'Glass Thickness', glassColor: 'Glass Color', aSeries: 'A Series', kSeries: 'K Series',
      withThreshold: 'With Threshold', withoutThreshold: 'Without Threshold', sideOpening: 'Side Opening', centerOpening: 'Center Opening',
      mm8: '8 mm', mm10: '10 mm', insulatedGlass: 'Insulated Glass', transparent: 'Transparent', grey: 'Grey',
      bronze: 'Bronze', lowEGlass: 'Low-e Glass', other: 'Other', otherPlaceholder: 'Enter custom glass color',
      pozNo: 'Position No.', width: 'Width *', height: 'Height *', panelCount: 'Panel Count',
      cancel: 'Cancel', confirm: 'Confirm', close: 'Close',
      otherRequired: 'Enter a glass color when Other is selected.',
      placed: (poz, left, right) => `${poz} sliding glass was placed between Post ${left} and Post ${right}.`
    }
  };


  const GUILLOTINE_UI_TEXT = {
    tr: {
      title: 'Giyotin Detayları', productSeries: 'Ürün Serisi', type: 'Tip', mechanism: 'Mekanizma',
      glassThickness: 'Cam Kalınlığı', glassColor: 'Cam Rengi', panelCount: 'Panel Tipi',
      motorDirection: 'Motor Yönü', view: 'Görünüş', motorType: 'Motor Tipi', remoteControl: 'Kumanda',
      aSeries: 'A Serisi', kSeries: 'K Serisi', standard: 'Standart', cleanable: 'Temizlenebilir',
      upwardCollecting: 'Yukarı Toplanan', chain: 'Zincir', belt: 'Kayış', mm8: '8 mm',
      insulatedGlass: 'Yalıtımlı Cam', transparent: 'Şeffaf', grey: 'Gri', bronze: 'Bronz',
      lowEGlass: 'Low-e Cam', other: 'Diğer', otherPlaceholder: 'Özel cam rengini yazın',
      panel11: '1+1', panel12: '1+2', right: 'Sağ', left: 'Sol', insideView: 'İç Görünüş',
      outsideView: 'Dış Görünüş', somfyRts: 'Somfy RTS', somfyIo: 'Somfy IO', rising: 'Rising',
      ch1: '1 Kanal', ch2: '2 Kanal', ch4: '4 Kanal', ch6: '6 Kanal', ch16: '16 Kanal', ch40: '40 Kanal',
      pozNo: 'Poz No', width: 'Genişlik *', height: 'Yükseklik *', cancel: 'İptal', confirm: 'Tamam', close: 'Kapat',
      otherRequired: 'Diğer seçildiğinde cam rengini yazmalısın.',
      placed: (poz, leftPost, rightPost) => `${poz} giyotin cam, Dikme ${leftPost} ile Dikme ${rightPost} arasına yerleştirildi.`
    },
    en: {
      title: 'Guillotine Details', productSeries: 'Product Series', type: 'Type', mechanism: 'Mechanism',
      glassThickness: 'Glass Thickness', glassColor: 'Glass Color', panelCount: 'Panel Type',
      motorDirection: 'Motor Direction', view: 'View', motorType: 'Motor Type', remoteControl: 'Remote Control',
      aSeries: 'A Series', kSeries: 'K Series', standard: 'Standard', cleanable: 'Cleanable',
      upwardCollecting: 'Upward Collecting', chain: 'Chain', belt: 'Belt', mm8: '8 mm',
      insulatedGlass: 'Insulated Glass', transparent: 'Transparent', grey: 'Grey', bronze: 'Bronze',
      lowEGlass: 'Low-e Glass', other: 'Other', otherPlaceholder: 'Enter custom glass color',
      panel11: '1+1', panel12: '1+2', right: 'Right', left: 'Left', insideView: 'Inside View',
      outsideView: 'Outside View', somfyRts: 'Somfy RTS', somfyIo: 'Somfy IO', rising: 'Rising',
      ch1: '1 Channel', ch2: '2 Channels', ch4: '4 Channels', ch6: '6 Channels', ch16: '16 Channels', ch40: '40 Channels',
      pozNo: 'Position No.', width: 'Width *', height: 'Height *', cancel: 'Cancel', confirm: 'Confirm', close: 'Close',
      otherRequired: 'Enter a glass color when Other is selected.',
      placed: (poz, leftPost, rightPost) => `${poz} guillotine was placed between Post ${leftPost} and Post ${rightPost}.`
    }
  };

  function translateGuillotineDetailsOverlay(overlay = $('guillotineDetailsOverlay')) {
    if (!overlay) return;
    const txt = GUILLOTINE_UI_TEXT[currentLanguage] || GUILLOTINE_UI_TEXT.tr;
    overlay.querySelectorAll('[data-guillotine-text]').forEach(el => {
      const key = el.dataset.guillotineText;
      if (Object.prototype.hasOwnProperty.call(txt, key) && typeof txt[key] === 'string') el.textContent = txt[key];
    });
    const otherInput = overlay.querySelector('#guillotineOtherColor');
    if (otherInput) otherInput.placeholder = txt.otherPlaceholder;
    const closeButton = overlay.querySelector('#guillotineDetailsClose');
    if (closeButton) closeButton.setAttribute('aria-label', txt.close);
    const form = overlay.querySelector('#guillotineDetailsForm');
    if (form) form.setAttribute('aria-label', txt.title);
  }

  function translateSlidingDetailsOverlay(overlay = $('slidingDetailsOverlay')) {
    if (!overlay) return;
    const txt = SLIDING_UI_TEXT[currentLanguage] || SLIDING_UI_TEXT.tr;
    overlay.querySelectorAll('[data-sliding-text]').forEach(el => {
      const key = el.dataset.slidingText;
      if (Object.prototype.hasOwnProperty.call(txt, key) && typeof txt[key] === 'string') el.textContent = txt[key];
    });
    const otherInput = overlay.querySelector('#slidingOtherColor');
    if (otherInput) otherInput.placeholder = txt.otherPlaceholder;
    const closeButton = overlay.querySelector('#slidingDetailsClose');
    if (closeButton) closeButton.setAttribute('aria-label', txt.close);
    const form = overlay.querySelector('#slidingDetailsForm');
    if (form) form.setAttribute('aria-label', txt.title);
  }

  const QUICK_TEST_PRESETS = [
    { name: 'Test 1', title: '1 adet · 2 ray · aynı ölçüler · otomatik dikme', values: { customer: 'TEST', project: 'TEST 1', systemCount: '1', width: '4000', opening: '4500', rearHeight: '3200', frontHeight: '2600' } },
    { name: 'Test 2', title: '1 adet · Cam kaydı EVET · 8060 => 3 ray', values: { customer: 'TEST', project: 'TEST 2', systemCount: '1', width: '8060', opening: '4500', rearHeight: '3200', frontHeight: '2600', glassTrack: 'EVET' } },
    { name: 'Test 3', title: '2 adet · aynı genişlik · 2;2 ray', values: { customer: 'TEST', project: 'TEST 3', systemCount: '2', width: '3000;3000', opening: '4500;4500', rearHeight: '3200;3200', frontHeight: '2600' } },
    { name: 'Test 4', title: '2 adet · farklı genişlik/açılım · Cam kaydı EVET', values: { customer: 'TEST', project: 'TEST 4', systemCount: '2', width: '4000;4500', opening: '4500;5200', rearHeight: '3200;3400', frontHeight: '2600', glassTrack: 'EVET' } },
    { name: 'Test 5', title: '2 adet · NO boşluk modu', values: { customer: 'TEST', project: 'TEST 5', systemCount: '2', width: '3000;100;3000;NO', opening: '4500;4500', rearHeight: '3200;3200', frontHeight: '2600' } },
    { name: 'Test 6', title: '3 adet · aynı açılım · otomatik', values: { customer: 'TEST', project: 'TEST 6', systemCount: '3', width: '3200;3200;3200', opening: '4500;4500;4500', rearHeight: '3200;3200;3200', frontHeight: '2600' } },
    { name: 'Test 7', title: '3 adet · farklı genişlik/açılım/arka yükseklik', values: { customer: 'TEST', project: 'TEST 7', systemCount: '3', width: '4000;4500;5000', opening: '4500;5200;6000', rearHeight: '3200;3400;3600', frontHeight: '2600' } },
    { name: 'Test 8', title: '3 adet · dikme sayısı otomatikten 2 eksik', values: { customer: 'TEST', project: 'TEST 8', systemCount: '3', width: '4000;4500;5000', opening: '4500;5200;6000', rearHeight: '3200;3400;3600', frontHeight: '2600', postCount: '4' } },
    { name: 'Test 9', title: '5 adet · aynı genişlik/açılım', values: { customer: 'TEST', project: 'TEST 9', systemCount: '5', width: '4000;4000;4000;4000;4000', opening: '4500;4500;4500;4500;4500', rearHeight: '3200;3200;3200;3200;3200', frontHeight: '2600' } },
    { name: 'Test 10', title: '5 adet · farklı genişlik/açılım · 3 raylar', values: { customer: 'TEST', project: 'TEST 10', systemCount: '5', width: '6000;6200;6400;6600;6800', opening: '4500;4600;4700;4800;4900', rearHeight: '3200;3300;3400;3500;3600', frontHeight: '2600' } },
    { name: 'Test 11', title: '7 adet · aynı genişlik · 2 raylar', values: { customer: 'TEST', project: 'TEST 11', systemCount: '7', width: '3000;3000;3000;3000;3000;3000;3000', opening: '4500;4500;4500;4500;4500;4500;4500', rearHeight: '3200;3200;3200;3200;3200;3200;3200', frontHeight: '2600' } },
    { name: 'Test 12', title: '7 adet · farklı genişlik · karışık 2/3 ray', values: { customer: 'TEST', project: 'TEST 12', systemCount: '7', width: '4000;4200;4400;4600;4800;5000;5200', opening: '4500;4550;4600;4650;4700;4750;4800', rearHeight: '3200;3250;3300;3350;3400;3450;3500', frontHeight: '2600' } },
    { name: 'Test 13', title: 'Parapet EVET · 600 mm', values: { customer: 'TEST', project: 'TEST 13', systemCount: '2', width: '4000;4500', opening: '4500;5200', rearHeight: '3200;3400', frontHeight: '2600', parapet: 'EVET', parapetHeight: '600' } },
    { name: 'Test 14', title: 'Üçgen doğrama EVET', values: { customer: 'TEST', project: 'TEST 14', systemCount: '2', width: '4000;4500', opening: '4500;5200', rearHeight: '3200;3400', frontHeight: '2600', triangleJoinery: 'EVET' } },
    { name: 'Test 15', title: 'Su çıkışı standart HAYIR', values: { customer: 'TEST', project: 'TEST 15', systemCount: '2', width: '4000;4500', opening: '4500;5200', rearHeight: '3200;3400', frontHeight: '2600', waterStandard: 'HAYIR' } },
    { name: 'Test 16', title: 'Kombine test · parapet+cam+üçgen', values: { customer: 'TEST', project: 'TEST 16', systemCount: '3', width: '4000;4500;5000', opening: '4500;5200;6000', rearHeight: '3200;3400;3600', frontHeight: '2600', parapet: 'EVET', parapetHeight: '600', glassTrack: 'EVET', triangleJoinery: 'EVET', waterStandard: 'HAYIR' } }
  ];

  function today() {
    return new Date().toISOString().slice(0, 10);
  }
  function normalizeYesNo(value) {
    const upper = String(value ?? '').trim().toLocaleUpperCase('tr-TR');
    if (['EVET', 'YES'].includes(upper)) return 'EVET';
    if (['HAYIR', 'HAYR', 'NO'].includes(upper)) return 'HAYIR';
    return String(value ?? '').trim();
  }

  function normalizeExtrasFormValue(value, preserveTrailingSpace = true) {
    if (window.PulumurGeometry && typeof window.PulumurGeometry.normalizeExtrasText === 'function') {
      return window.PulumurGeometry.normalizeExtrasText(value, { preserveTrailingSpace });
    }
    return String(value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').slice(0, 5).map(line => line.slice(0, 82)).join('\n');
  }

  function normalizeProjectText(value, options = {}) {
    const multiline = options.multiline === true;
    const preserveTrailingSpace = options.preserveTrailingSpace === true;
    let text = String(value ?? '')
      .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      .replace(/[çÇ]/g, 'C').replace(/[ğĞ]/g, 'G')
      .replace(/[ıİi]/g, 'I').replace(/[öÖ]/g, 'O')
      .replace(/[şŞ]/g, 'S').replace(/[üÜ]/g, 'U')
      .replace(/[–—−]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
      .replace(/\u00a0/g, ' ');
    if (typeof text.normalize === 'function') text = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    text = text.toUpperCase().replace(/[^\x09\x0A\x20-\x7E]/g, '');
    if (multiline) return text.replace(/\t/g, ' ');
    text = text.replace(/\n/g, ' ').replace(/[\t ]+/g, ' ').replace(/^ +/g, '');
    return preserveTrailingSpace ? text : text.replace(/ +$/g, '');
  }

  function normalizeProjectFieldValue(id, value, preserveTrailingSpace = true) {
    if (BOOLEAN_FIELD_IDS.includes(id)) return normalizeYesNo(value);
    if (id === 'extras') return normalizeExtrasFormValue(normalizeProjectText(value, { multiline: true }), preserveTrailingSpace);
    if (PROJECT_TEXT_FIELD_IDS.has(id)) return normalizeProjectText(value, { preserveTrailingSpace });
    if (upperTableFieldIds.includes(id)) return String(value || '').replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    return value;
  }

  function revisionVersionValue(revisionNo) {
    const value = Math.max(1, Math.round(Number(revisionNo) || 1));
    return String(value).padStart(2, '0');
  }

  function setProjectWorkspaceActive(active) {
    document.body.classList.toggle('project-workspace-inactive', active !== true);
    const startScreen = $('projectStartScreen');
    if (startScreen) startScreen.hidden = false;
  }

  function applyProjectMetadataFields(metadata = {}, options = {}) {
    const revisionNo = Math.max(1, Math.round(Number(metadata.revisionNo ?? currentProjectRecord.revisionNo) || 1));
    const allowBlankIdentity = options.allowBlankIdentity === true;
    const values = {
      customer: allowBlankIdentity ? '' : normalizeProjectText(metadata.customer ?? ($('customer') ? $('customer').value : '')),
      project: allowBlankIdentity ? '' : normalizeProjectText(metadata.project ?? ($('project') ? $('project').value : '')),
      version: allowBlankIdentity ? '' : revisionVersionValue(revisionNo),
      drawnBy: allowBlankIdentity ? '' : normalizeProjectText(metadata.drawnBy ?? ($('drawnBy') ? $('drawnBy').value : '')),
      date: allowBlankIdentity ? '' : (String(metadata.date ?? ($('date') ? $('date').value : today())).slice(0, 10) || today())
    };
    const previousSuppression = suppressFormPreviewUpdate;
    suppressFormPreviewUpdate = true;
    try {
      Object.entries(values).forEach(([id, value]) => {
        const el = $(id);
        if (el) el.value = value;
        dispatchProjectAction(window.PulumurProjectActions.TYPES.SET_FORM_FIELD, { field: id, value }, { source: options.source || 'project-metadata', allowInvalid: true });
      });
    } finally {
      suppressFormPreviewUpdate = previousSuppression;
    }
    if (options.updatePreview !== false) schedulePreviewUpdate(0);
    return values;
  }

  function setBooleanSelectTexts(lang) {
    BOOLEAN_FIELD_IDS.forEach(id => {
      const el = $(id);
      if (!el) return;
      Array.from(el.options).forEach(opt => {
        const canonical = normalizeYesNo(opt.value || opt.textContent);
        if (BOOLEAN_CANONICAL[canonical]) opt.textContent = BOOLEAN_CANONICAL[canonical][lang];
      });
    });
  }

  function setText(id, value, html = false) {
    const el = $(id);
    if (!el) return;
    if (html) el.innerHTML = value; else el.textContent = value;
  }

  function labelSpan(id) {
    const el = $(id);
    const label = el && el.closest('label');
    return label ? (label.querySelector('.metadata-label') || label.querySelector('span')) : null;
  }

  function setSelectOptions(id, items) {
    const el = $(id);
    if (!el || !Array.isArray(items)) return;
    const current = String(el.value || '');
    el.innerHTML = '';
    items.forEach(item => {
      const option = document.createElement('option');
      option.value = String(item && item.value !== undefined ? item.value : '');
      option.textContent = String(item && item.label !== undefined ? item.label : option.value);
      el.appendChild(option);
    });
    if (Array.from(el.options).some(option => option.value === current)) el.value = current;
  }

  function translateUI(lang) {
    currentLanguage = (lang === 'en') ? 'en' : 'tr';
    const txt = UI_TEXT[currentLanguage];
    document.documentElement.lang = currentLanguage;
    setText('langLabel', txt.langLabel);
    setText('helpBtn', txt.helpBtn);
    setText('installBtn', txt.installBtn);
    setText('appTitleMain', txt.appTitleMain);
    setText('appTitleSub', txt.appTitleSub);
    setText('labelProduct', txt.labelProduct);
    setText('labelModule', txt.labelModule);
    setText('labelEngine', txt.labelEngine);
    setText('legendProject', txt.legendProject);
    setText('legendSystem', txt.legendSystem, true);
    setText('legendOptions', txt.legendOptions);
    setText('legendExtra', txt.legendExtra);
    setText('projectCodeLabel', txt.project_code);
    setText('projectRevisionLabel', txt.project_revision);
    setText('editProjectInfoBtn', txt.editSectionBtn);
    setText('systemResetBtn', txt.sectionResetBtn);
    setText('optionsResetBtn', txt.sectionResetBtn);
    setText('extraOptionsResetBtn', txt.sectionResetBtn);
    setText('labelSystemCount', txt.labelSystemCount);
    setText('labelWidth', txt.labelWidth, true);
    setText('labelOpening', txt.labelOpening, true);
    setText('labelRearHeight', txt.labelRearHeight, true);
    setText('labelFrontHeight', txt.labelFrontHeight, true);
    setText('labelRayCount', txt.labelRayCount, true);
    setText('labelPostCount', txt.labelPostCount, true);
    const projectMap = {customer:'project_customer', project:'project_project', version:'project_version', drawnBy:'project_drawnBy', date:'project_date'};
    Object.entries(projectMap).forEach(([id,key]) => { const s=labelSpan(id); if (s) s.textContent = txt[key]; });
    const optionMap = {parapet:'options_parapet', parapetHeight:'options_parapetHeight', glassTrack:'options_glassTrack', structureColor:'options_structureColor', fabric:'options_fabric', fabricProfiles:'options_fabricProfiles', motor:'options_motor', remote:'options_remote', led:'options_led', dimmer:'options_dimmer', extras:'options_extras', triangleJoinery:'extra_triangleJoinery'};
    Object.entries(optionMap).forEach(([id,key]) => { const s=labelSpan(id); if (s) { if (key.endsWith('Height')) s.innerHTML = txt[key]; else s.textContent = txt[key]; } });
    setText('glassRayBoundaryQuickLabel', txt.glassRayBoundaryToggle);
    setText('labelWaterStandard', txt.extra_waterStandard);
    setText('labelWaterOutletPlacement', txt.extra_waterOutletPlacement);
    setText('waterOutletPlacementMenuTitle', txt.extra_waterOutletPlacement);
    setText('waterOutletFrontQuickLabel', txt.waterOutletFront);
    setText('waterOutletSidesQuickLabel', txt.waterOutletSides);
    setText('waterOutletBothQuickLabel', txt.waterOutletBoth);
    setSelectOptions('waterOutletPlacement', [{ value: 'FRONT', label: txt.waterOutletFront }, { value: 'SIDES', label: txt.waterOutletSides }, { value: 'BOTH', label: txt.waterOutletBoth }]);
    syncWaterOutletPlacementControl();
    setText('quickTestsHead', txt.quickTestsHead);
    setText('previewTitle', txt.previewTitle);
    setText('previewBtn', txt.previewBtn);
    const expandText = previewPanel.classList.contains('is-expanded') ? txt.shrinkPreviewBtn : txt.expandPreviewBtn;
    setText('expandPreviewBtn', expandText);
    setText('undoPreviewLabel', txt.undoPreviewBtn);
    setText('redoPreviewLabel', txt.redoPreviewBtn);
    updateHistoryControls();
    if ($('historyControlGroup')) $('historyControlGroup').setAttribute('aria-label', txt.historyGroupLabel);
    setText('pdfBtn', txt.pdfBtn);
    setText('generateBtn', txt.generateBtn);
    setText('resetBtn', txt.resetBtn);
    setText('calcBtn', txt.calcBtn);
    setText('projectExportBtn', txt.projectExportBtn);
    setText('previewProjectExportBtn', txt.previewProjectExportBtn);
    setText('projectImportBtn', txt.projectImportBtn);
    setText('checkDrawingBtn', txt.checkDrawingBtn);
    setText('headerCheckDrawingBtn', txt.checkDrawingBtn);
    setText('multiProductBtn', txt.multiProductBtn);
    setText('multiDimensionBtn', txt.multiDimensionBtn);
    setText('equalizeGapsBtn', txt.equalizeGapsBtn);
    setText('postSettingsBtn', txt.postSettingsBtn);
    setText('bulkExtendBtn', txt.bulkExtendBtn);
    setText('bulkPostProfileBtn', txt.bulkPostProfileBtn);
    setText('convertProductBtn', txt.convertProductBtn);
    setText('fitProductsBtn', txt.fitProductsBtn);
    setText('detailCopyBtn', txt.detailCopyBtn);
    setText('multiDeleteBtn', txt.multiDeleteBtn);
    setText('deleteAllProductsBtn', txt.deleteAllProductsBtn);
    if ($('bulkPostProfileBtn')) $('bulkPostProfileBtn').title = currentLanguage === 'en' ? 'This feature will be activated in a future revision.' : 'Bu özellik sonraki revizyonlardan birinde aktif edilecek.';
    syncToolboxBooleanButtons();
    syncGlassRayBoundaryControl();
    syncParapetQuickInput();
    setText('calcTitle', txt.calcTitle);
    setText('calcSub', txt.calcSub);
    setText('calcGuide', txt.calcGuide, true);
    const calcMap = {calcAngle:'calcAngleLabel', calcOpening:'calcOpeningLabel', calcRear:'calcRearLabel', calcFront:'calcFrontLabel'};
    Object.entries(calcMap).forEach(([id,key]) => { const s=labelSpan(id); if (s) s.textContent = txt[key]; });
    setText('calcComputeBtn', txt.calcComputeBtn);
    setText('calcTransferBtn', txt.calcTransferBtn);
    setText('calcClearBtn', txt.calcClearBtn);
    setText('helpTitle', txt.helpTitle);
    setText('showMainDimsLabel', txt.showMainDimsLabel);
    setText('showAllDimsLabel', txt.showAllDimsLabel);
    syncHiddenDimensionRestoreControl();
    const helpClose = document.querySelector('#helpDialog .modal-actions button');
    if (helpClose) helpClose.textContent = txt.helpCloseBtn;
    Object.entries(txt.placeholders).forEach(([id,val]) => { if ($(id)) $(id).placeholder = val; });
    setBooleanSelectTexts(currentLanguage);
    translateSlidingDetailsOverlay();
    translateGuillotineDetailsOverlay();
    try { localStorage.setItem('pulumur_lang', currentLanguage); } catch (e) {}
  }

  function setupPwaInstall() {
    const btn = $('installBtn');
    if (!btn) return;

    const isStandalone = () =>
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      window.navigator.standalone === true;

    const syncInstallButton = () => {
      btn.hidden = isStandalone();
    };

    syncInstallButton();

    window.addEventListener('beforeinstallprompt', evt => {
      evt.preventDefault();
      deferredInstallPrompt = evt;
      syncInstallButton();
    });

    btn.addEventListener('click', async () => {
      if (isStandalone()) {
        btn.hidden = true;
        return;
      }
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        try { await deferredInstallPrompt.userChoice; } catch (e) {}
        deferredInstallPrompt = null;
        syncInstallButton();
        return;
      }
      const isEn = currentLanguage === 'en';
      window.alert(isEn
        ? 'To use it like an app: open the browser menu and choose “Install app” or “Add to Home screen”.'
        : 'Uygulama gibi kullanmak için tarayıcı menüsünden “Uygulamayı yükle” veya “Ana ekrana ekle” seçeneğini kullan.');
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      btn.hidden = true;
    });

    if (window.matchMedia) {
      const mq = window.matchMedia('(display-mode: standalone)');
      if (mq && typeof mq.addEventListener === 'function') mq.addEventListener('change', syncInstallButton);
      else if (mq && typeof mq.addListener === 'function') mq.addListener(syncInstallButton);
    }

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=10.29-r29').catch(() => {}), { once: true });
    }
  }

  function fillInitial() {
    const d = { ...EXCEL_DEFAULT_INPUT, date: today() };
    // V14 unified shell ownership: Product / Module / Drawing Engine are not
    // native Pergola form fields anymore. Resetting the 2D form must never
    // overwrite the canonical product selected by PulumurUnifiedWorkspace.
    const shellOwnedFields = new Set(['product', 'moduleName', 'engine']);
    ids.forEach(id => {
      if (shellOwnedFields.has(id)) return;
      if ($(id) && d[id] !== undefined) $(id).value = d[id];
    });
    if ($('date')) $('date').value = d.date;
    updateRemoteOptions(false);
    ['rayCount', 'postCount'].forEach(id => {
      if ($(id)) $(id).dataset.userEdited = 'false';
    });
    manualPostPlacementMode = 'standard';
    glassTrackProfileState = { mode: 'standard', en: 100, boy: 100, et: 2 };
    glassSupportProfileState = { left: null, right: null };
    customFrontPostCenters = null;
    customRayPositions = null;
    frontPostExtensions = [];
    parapetSegments = { front: [], side: {} };
    topBackWallSegments = {};
    topBackWallGridState = {};
    rearSupportState = normalizeRearSupportStateForApp(null);
    pendingRearSupportEdit = null;
    gutterEditState = { minusXDelta: 0, plusXDelta: 0, groups: {} };
    independentSideViewVisibility = {};
    waterOutletPipeState = { diameter: 70, length: 300, offsets: {}, deleted: {} };
    upperTableTransform = { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    sideFeatureState = { glassTrack: { left: false, right: false, middle: {} }, triangle: { left: false, right: false, middle: {} }, middleEnabled: {} };
    glassTrackLengthOffsets = { left: 0, right: 0, middle: {} };
    triangleDivisionState = { left: null, right: null, middle: {} };
    backWallState = { left: { enabled: true, xOffset: 0, depth: 600, height: 0 }, right: { enabled: true, xOffset: 0, depth: 600, height: 0 }, middle: {} };
    backWallSegments = { side: {} };
    backWallGridState = { side: {} };
    trapezSheetBounds = {};
    previewDimensionOffsets = {};
    hiddenDimensionIds = [];
    customSideSupportCenters = {};
    customSidePosts = {};
    sideAutoSupportSuppressed = {};
    frontPostProfiles = [];
    horizontalFacadeProfiles = { front: [], side: {} };
    slidingPlacements = [];
    sideSlidingPlacements = [];
    pendingSlidingPlacementMeta = null;
    guillotinePlacements = [];
    sideGuillotinePlacements = [];
    pendingGuillotinePlacementMeta = null;
    zipScreenPlacements = [];
    sideZipScreenPlacements = [];
    pendingZipScreenPlacementMeta = null;
    toolboxSelectionMode = null;
    toolboxSelectionItems = new Map();
    currentProjectRecord = { projectId: null, projectCode: null, revisionNo: 1, serverVersion: null };
    syncGlassRayBoundaryControl();
    syncWaterOutletPlacementControl();
    applyAutoRayPost(true);
  }

  function applyAutoRayPost(force = false) {
    const br = window.PulumurExcelBridge;
    if (!br || typeof br.autoRayPostCount !== 'function') return;
    const raw = collectForm();
    const auto = br.autoRayPostCount(raw.systemCount, raw.width, raw.frontHeight, raw.glassTrack, raw.glassRayBoundaryMode, raw.__sideFeatureState);
    const independent = window.PulumurMultiPositionRules && typeof window.PulumurMultiPositionRules.parseIndependentWidthGroups === 'function'
      ? window.PulumurMultiPositionRules.parseIndependentWidthGroups(raw.width, applicationLimits()) : null;
    if (independent && independent.ok && independent.independent && $('systemCount')) $('systemCount').value = String(independent.totalPositionCount);
    const rayEl = $('rayCount');
    const postEl = $('postCount');
    const rayWasManual = rayEl && rayEl.dataset.userEdited === 'true';
    const postWasManual = postEl && postEl.dataset.userEdited === 'true';

    if (rayEl && (force || !rayWasManual)) {
      rayEl.value = auto.rayText || '';
      rayEl.dataset.userEdited = 'false';
    }

    const currentRayText = rayEl ? rayEl.value : auto.rayText;
    const autoPost = br.postCountFromRayText ? br.postCountFromRayText(currentRayText, raw.systemCount, raw.width, raw.frontHeight) : (auto.postText ?? auto.postCount);
    if (postEl && (force || !postWasManual)) {
      postEl.value = autoPost === '' || autoPost === null || autoPost === undefined ? '' : String(autoPost);
      postEl.dataset.userEdited = 'false';
    }
  }

  function normalizeHorizontalFacadeProfilesForApp(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const normalizeList = list => (Array.isArray(list) ? list : []).map((item, index) => {
      const value = item && typeof item === 'object' ? item : {};
      return {
        id: String(value.id || `hpf_legacy_${index + 1}`),
        orientation: 'horizontal',
        zoneId: String(value.zoneId || ''),
        view: String(value.view || 'front'),
        sideViewKey: String(value.sideViewKey || ''),
        sideIndex: Math.max(0, Number(value.sideIndex || 0) || 0),
        sideGapIndex: Math.max(0, Number(value.sideGapIndex || 0) || 0),
        positionYRatio: Math.max(.01, Math.min(.99, Number(value.positionYRatio) || .5)),
        width: Math.max(40, Math.min(300, Math.round(Number(value.width) || 100))),
        depth: Math.max(30, Math.min(300, Math.round(Number(value.depth) || 100))),
        label: String(value.label || 'Yatay Profil')
      };
    });
    const side = {};
    Object.entries(source.side && typeof source.side === 'object' ? source.side : {}).forEach(([key, list]) => { side[String(key)] = normalizeList(list); });
    return { front: normalizeList(source.front), side };
  }

  function horizontalProfileListsForApp() {
    const lists = [horizontalFacadeProfiles.front || []];
    Object.values(horizontalFacadeProfiles.side || {}).forEach(list => { if (Array.isArray(list)) lists.push(list); });
    return lists;
  }
  function nextHorizontalProfileId() {
    const used = new Set(horizontalProfileListsForApp().flat().map(item => String(item && item.id || '')));
    let index = 1;
    while (used.has(`hpf${index}`)) index += 1;
    return `hpf${index}`;
  }
  function horizontalProfileListForMeta(meta, create) {
    const view = String(meta && meta.view || '').toLowerCase();
    if (view === 'front') return horizontalFacadeProfiles.front;
    const key = normalizeSideViewKey(meta && meta.sideViewKey, Number(meta && meta.sideIndex || 0) || 0);
    if (!horizontalFacadeProfiles.side[key] && create) horizontalFacadeProfiles.side[key] = [];
    return horizontalFacadeProfiles.side[key] || [];
  }
  function findHorizontalProfileById(profileId) {
    const id = String(profileId || '');
    for (const list of horizontalProfileListsForApp()) {
      const profile = list.find(item => item && item.id === id);
      if (profile) return profile;
    }
    return null;
  }
  function addHorizontalProfileToZone(meta) {
    const list = horizontalProfileListForMeta(meta, true);
    const zoneId = String(meta && meta.zoneId || '');
    if (!zoneId) throw new Error(currentLanguage === 'en' ? 'Zone identity is missing.' : 'Alan kimliği bulunamadı.');
    const profile = {
      id: nextHorizontalProfileId(), orientation: 'horizontal', zoneId,
      view: String(meta.view || 'Front').toLowerCase() === 'front' ? 'front' : 'side',
      sideViewKey: String(meta.sideViewKey || ''), sideIndex: Number(meta.sideIndex || 0) || 0, sideGapIndex: Number(meta.sideGapIndex || 0) || 0,
      positionYRatio: .5, width: 100, depth: 100, label: 'Yatay Profil 100 × 100'
    };
    list.push(profile);
    return profile;
  }
  function validateHorizontalProfileLayout(list, zoneId, clearHeight) {
    const profiles = (list || []).filter(item => item && item.zoneId === zoneId).slice().sort((a,b)=>a.positionYRatio-b.positionYRatio);
    let cursor = 0;
    for (const profile of profiles) {
      const center = profile.positionYRatio * clearHeight;
      const half = profile.width / 2;
      if (center - half - cursor < 250) return false;
      cursor = center + half;
    }
    return clearHeight - cursor >= 250;
  }
  function moveHorizontalProfileFromDimension(meta, value) {
    const profile = findHorizontalProfileById(meta.horizontalProfileId);
    if (!profile) throw new Error(currentLanguage === 'en' ? 'Horizontal profile was not found.' : 'Yatay profil bulunamadı.');
    const clearHeight = Number(meta.horizontalClearHeight || 0);
    if (!(clearHeight > 0)) throw new Error(currentLanguage === 'en' ? 'Clear height is unavailable.' : 'Net yükseklik bulunamadı.');
    const target = Number(value);
    if (!(target >= 250)) throw new Error(currentLanguage === 'en' ? 'Clear segment must be at least 250 mm.' : 'Net yükseklik en az 250 mm olmalıdır.');
    const old = profile.positionYRatio;
    if (meta.horizontalMoveFrom === 'upper') {
      profile.positionYRatio = (clearHeight - target - profile.width / 2) / clearHeight;
    } else {
      let anchor = 0;
      if (meta.horizontalAnchorProfileId) {
        const lower = findHorizontalProfileById(meta.horizontalAnchorProfileId);
        if (lower) anchor = lower.positionYRatio * clearHeight + lower.width / 2;
      }
      profile.positionYRatio = (anchor + target + profile.width / 2) / clearHeight;
    }
    profile.positionYRatio = Math.max(.01, Math.min(.99, profile.positionYRatio));
    const list = horizontalProfileListForMeta(meta, false);
    if (!validateHorizontalProfileLayout(list, profile.zoneId, clearHeight)) { profile.positionYRatio = old; throw new Error(currentLanguage === 'en' ? 'This height leaves less than 250 mm in an adjacent zone.' : 'Bu yükseklik komşu alanı 250 mm sınırının altına düşürüyor.'); }
    return profile;
  }

  function collectForm() {
    return ids.reduce((acc, id) => {
      const el = $(id);
      if (!el) return acc;
      const value = el.value;
      acc[id] = normalizeProjectFieldValue(id, value, false);
      return acc;
    }, {
      sideTrack: 'HAYIR',
      __manualPostPlacementMode: manualPostPlacementMode,
      __glassTrackProfile: sanitizeGlassTrackProfile(glassTrackProfileState),
      __glassTrackSupportProfiles: {
        left: sanitizeOptionalGlassTrackProfile(glassSupportProfileState.left),
        right: sanitizeOptionalGlassTrackProfile(glassSupportProfileState.right)
      },
      __frontPostCenters: Array.isArray(customFrontPostCenters) ? customFrontPostCenters.slice() : null,
      __customRayPositions: deepCloneJson(customRayPositions),
      __sideSupportCenters: { ...customSideSupportCenters },
      __sidePosts: deepCloneJson(customSidePosts) || {},
      __sideAutoSupportSuppressed: deepCloneJson(sideAutoSupportSuppressed) || {},
      __frontPostProfiles: deepCloneJson(frontPostProfiles) || [],
      __horizontalFacadeProfiles: deepCloneJson(horizontalFacadeProfiles) || { front: [], side: {} },
      __frontPostExtensions: deepCloneJson(frontPostExtensions) || [],
      __parapetSegments: deepCloneJson(parapetSegments) || { front: [], side: {} },
      __topBackWallSegments: deepCloneJson(topBackWallSegments) || {},
      __topBackWallGridState: deepCloneJson(topBackWallGridState) || {},
      __rearSupport: deepCloneJson(rearSupportState) || normalizeRearSupportStateForApp(null),
      __gutterEditState: deepCloneJson(gutterEditState) || { minusXDelta: 0, plusXDelta: 0, groups: {} },
      __independentSideViewVisibility: deepCloneJson(independentSideViewVisibility) || {},
      __waterOutletPipeState: deepCloneJson(waterOutletPipeState) || { diameter: 70, length: 300, offsets: {}, deleted: {} },
      __upperTableTransform: deepCloneJson(upperTableTransform) || { x: 0, y: 0, scaleX: 1, scaleY: 1 },
      __sideFeatureState: deepCloneJson(sideFeatureState) || normalizeSideFeatureStateForApp(),
      __glassTrackLengthOffsets: deepCloneJson(glassTrackLengthOffsets) || { left: 0, right: 0, middle: {} },
      __triangleDivisionState: deepCloneJson(triangleDivisionState) || { left: null, right: null, middle: {} },
      __backWallState: deepCloneJson(backWallState) || { left: { xOffset: 0, depth: 600, height: 0 }, right: { xOffset: 0, depth: 600, height: 0 }, middle: {} },
      __backWallSegments: deepCloneJson(backWallSegments) || { side: {} },
      __backWallGridState: deepCloneJson(backWallGridState) || { side: {} },
      __trapezSheetBounds: deepCloneJson(trapezSheetBounds) || {},
      __previewDimensionOffsets: deepCloneJson(previewDimensionOffsets) || {},
      __hiddenDimensionIds: hiddenDimensionIds.slice(),
      __slidingPlacements: slidingPlacements.map(item => ({ ...item })),
      __sideSlidingPlacements: sideSlidingPlacements.map(item => ({ ...item })),
      __guillotinePlacements: guillotinePlacements.map(item => ({ ...item })),
      __sideGuillotinePlacements: sideGuillotinePlacements.map(item => ({ ...item })),
      __zipScreenPlacements: zipScreenPlacements.map(item => ({ ...item })),
      __sideZipScreenPlacements: sideZipScreenPlacements.map(item => ({ ...item }))
    });
  }


  function createHistoryEntry() {
    syncProjectModelFromLegacy(collectForm(), lastDrawing && lastDrawing.input, 'history-capture');
    return projectHistoryManager.createEntry(projectStore.getState(), lastProjectAction);
  }

  function updateHistoryControls() {
    const unifiedHistory = window.PulumurUnifiedWorkspace;
    if (unifiedHistory && typeof unifiedHistory.isTechnical2DActive === 'function' && unifiedHistory.isTechnical2DActive()) {
      if (typeof unifiedHistory.syncTechnical2DHistoryControls === 'function') unifiedHistory.syncTechnical2DHistoryControls();
      return;
    }
    const undoBtn = $('undoPreviewBtn');
    const redoBtn = $('redoPreviewBtn');
    const canUndo = projectHistory.index > 0;
    const canRedo = projectHistory.index >= 0 && projectHistory.index < projectHistory.entries.length - 1;
    const step = projectHistory.index >= 0 ? projectHistory.index + 1 : 0;
    const total = projectHistory.entries.length;
    if (undoBtn) {
      undoBtn.disabled = !canUndo;
      undoBtn.setAttribute('aria-disabled', canUndo ? 'false' : 'true');
      undoBtn.title = currentLanguage === 'en'
        ? `Undo (Ctrl+Z) · Step ${step}/${total}`
        : `Geri Al (Ctrl+Z) · Adım ${step}/${total}`;
    }
    if (redoBtn) {
      redoBtn.disabled = !canRedo;
      redoBtn.setAttribute('aria-disabled', canRedo ? 'false' : 'true');
      redoBtn.title = currentLanguage === 'en'
        ? `Redo (Ctrl+Y / Ctrl+Shift+Z) · Step ${step}/${total}`
        : `İleri Al (Ctrl+Y / Ctrl+Shift+Z) · Adım ${step}/${total}`;
    }
  }

  function resetProjectHistory(captureCurrent = false) {
    projectHistoryManager.reset();
    if (captureCurrent && lastDrawing) recordProjectHistoryState({ force: true });
    else updateHistoryControls();
  }

  function recordProjectHistoryState(options = {}) {
    if (projectHistory.restoring) return;
    if (projectHistory.suspendDepth > 0) {
      projectHistory.dirtyWhileSuspended = true;
      return;
    }
    try {
      syncProjectModelFromLegacy(collectForm(), lastDrawing && lastDrawing.input, 'history-record');
      projectHistoryManager.record(projectStore.getState(), { force: options.force === true, action: lastProjectAction });
    } catch (_) { return; }
    updateHistoryControls();
  }

  function beginHistoryTransaction() {
    if (projectTransactionHistory) return projectTransactionHistory.begin(lastProjectAction);
    projectHistoryManager.begin(lastProjectAction);
    return null;
  }

  function endHistoryTransaction(commit = true) {
    try { syncProjectModelFromLegacy(collectForm(), lastDrawing && lastDrawing.input, 'history-transaction'); }
    catch (_) {}
    if (projectTransactionHistory) projectTransactionHistory.end(projectStore.getState(), commit);
    else projectHistoryManager.end(projectStore.getState(), commit);
    updateHistoryControls();
  }

  function schedulePreviewUpdate(delay = 350) {
    if (previewUpdateTimer) window.clearTimeout(previewUpdateTimer);
    previewUpdateTimer = window.setTimeout(() => {
      previewUpdateTimer = null;
      updatePreview(false);
    }, Math.max(0, Number(delay) || 0));
  }

  function clearPendingPreviewTimers() {
    let hadPendingTimer = false;
    if (previewUpdateTimer) {
      hadPendingTimer = true;
      window.clearTimeout(previewUpdateTimer);
      previewUpdateTimer = null;
    }
    ids.forEach(id => {
      const el = $(id);
      if (!el || !el._previewTimer) return;
      hadPendingTimer = true;
      window.clearTimeout(el._previewTimer);
      el._previewTimer = null;
    });
    return hadPendingTimer;
  }

  function closeTransientPreviewEditorsForHistory() {
    toolboxSelectionMode = null;
    toolboxSelectionItems = new Map();
    if (toolboxContextMenu) toolboxContextMenu.hidden = true;
    if (toolboxSelectionBanner) toolboxSelectionBanner.hidden = true;
    pendingSlidingPlacementMeta = null;
    pendingGuillotinePlacementMeta = null;
    if (selectedIndependentSideView) closeSideViewSelectionOverlay();
    if (previewPanel) previewPanel.querySelectorAll('.dim-edit-overlay').forEach(node => { node.hidden = true; });
    refreshToolboxSelectionDecorations();
  }

  function snapshotForHistoryRestore(entry) {
    const model = window.PulumurProjectModel.normalize(entry.model);
    model.revisionInfo = deepCloneJson(currentProjectRecord);
    model.language = currentLanguage;
    model.dimensions.filter = serializePreviewDimensionFilter();
    return window.PulumurProjectSchema.createEnvelope(model, { appVersion: APP_VERSION });
  }

  function restoreHistoryIndex(nextIndex, direction) {
    const entry = projectHistoryManager.entryAt(nextIndex);
    if (!entry) return false;
    clearPendingPreviewTimers();
    closeTransientPreviewEditorsForHistory();
    projectHistory.restoring = true;
    let drawing = null;
    try {
      drawing = restoreProjectSnapshot(snapshotForHistoryRestore(entry), { resetZoom: false, requireValidDrawing: true });
    } catch (err) {
      statusText.textContent = err.message;
      console.error(err);
      return false;
    } finally {
      projectHistory.restoring = false;
    }
    if (!drawing) return false;
    projectHistory.index = nextIndex;
    updateHistoryControls();
    const step = projectHistory.index + 1;
    const total = projectHistory.entries.length;
    statusText.textContent = direction === 'redo'
      ? (currentLanguage === 'en' ? `Redone. History step ${step}/${total}.` : `İleri alındı. Geçmiş adımı ${step}/${total}.`)
      : (currentLanguage === 'en' ? `Undone. History step ${step}/${total}.` : `Geri alındı. Geçmiş adımı ${step}/${total}.`);
    focusPreviewCanvas();
    return true;
  }

  function flushCurrentStateBeforeHistoryMove() {
    if (projectHistory.restoring) return;
    const hadPendingTimer = clearPendingPreviewTimers();
    // Buton/modal işlemleri updatePreview sırasında zaten geçmişe kaydedilir.
    // Her Undo/Redo tıklamasında yeniden updatePreview çalıştırmak, geri alınmış
    // bir adımın türetilmiş/normalize edilmiş halini yeni dal olarak kaydedip
    // ileri alma zincirini silebiliyordu. Yalnızca kullanıcı formda bir değer
    // yazmış ve 350 ms önizleme zamanlayıcısı henüz çalışmamışsa güncel durumu
    // senkronlayıp tek kez kaydet.
    if (!hadPendingTimer) return;
    const previousRestoring = projectHistory.restoring;
    projectHistory.restoring = true;
    try {
      updatePreview(false);
    } finally {
      projectHistory.restoring = previousRestoring;
    }
    if (lastDrawing) recordProjectHistoryState({ force: projectHistory.index < 0 });
  }

  function undoProjectHistory() {
    const unifiedHistory = window.PulumurUnifiedWorkspace;
    if (unifiedHistory && typeof unifiedHistory.isTechnical2DActive === 'function' && unifiedHistory.isTechnical2DActive()) {
      if (typeof unifiedHistory.undoTechnical2DHistory === 'function') void unifiedHistory.undoTechnical2DHistory();
      return;
    }
    flushCurrentStateBeforeHistoryMove();
    if (projectHistory.index <= 0) {
      updateHistoryControls();
      return;
    }
    restoreHistoryIndex(projectHistory.index - 1, 'undo');
  }

  function redoProjectHistory() {
    const unifiedHistory = window.PulumurUnifiedWorkspace;
    if (unifiedHistory && typeof unifiedHistory.isTechnical2DActive === 'function' && unifiedHistory.isTechnical2DActive()) {
      if (typeof unifiedHistory.redoTechnical2DHistory === 'function') void unifiedHistory.redoTechnical2DHistory();
      return;
    }
    flushCurrentStateBeforeHistoryMove();
    if (projectHistory.index < 0 || projectHistory.index >= projectHistory.entries.length - 1) {
      updateHistoryControls();
      return;
    }
    restoreHistoryIndex(projectHistory.index + 1, 'redo');
  }

  window.PulumurRefreshNativeHistoryControls = updateHistoryControls;

  function bindHistoryKeyboardShortcuts() {
    document.addEventListener('keydown', evt => {
      if (!previewPanel || !previewPanel.classList.contains('is-expanded')) return;
      if (!(evt.ctrlKey || evt.metaKey) || evt.altKey) return;
      const active = document.activeElement;
      const tag = active && active.tagName ? active.tagName.toLowerCase() : '';
      if (active && (active.isContentEditable || ['input', 'textarea', 'select'].includes(tag))) return;
      const key = String(evt.key || '').toLowerCase();
      if (key === 'z') {
        evt.preventDefault();
        if (evt.shiftKey) redoProjectHistory();
        else undoProjectHistory();
      } else if (key === 'y') {
        evt.preventDefault();
        redoProjectHistory();
      }
    });
  }

  function firstNumber(value) {
    const token = String(value ?? '').split(';').map(s => s.trim()).find(s => s && s.toLocaleUpperCase('tr-TR') !== 'NO');
    const parsed = Number(String(token ?? '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function multiPositionValidationMessage(code, fieldName, details = {}) {
    const en = currentLanguage === 'en';
    const names = en
      ? { width: 'Width', opening: 'Projection', rearHeight: 'Rear H', rayCount: 'Rail Count', systemCount: 'System Count' }
      : { width: 'Genişlik', opening: 'Açılım', rearHeight: 'Arka H', rayCount: 'Ray Sayısı', systemCount: 'Sistem Adedi' };
    const name = names[fieldName] || fieldName;
    const map = en ? {
      SYSTEM_COUNT_REQUIRED: 'Enter the system count.', SYSTEM_COUNT_INVALID: 'System count must be a positive whole number.',
      SYSTEM_COUNT_LIMIT: `System count cannot exceed ${details.limit || 30}.`, WIDTH_REQUIRED: 'Enter the width.',
      WIDTH_SYSTEM_COUNT_MISMATCH: `${name} values must be a single total value or match the system count exactly.`,
      NO_TOKEN_COUNT_MISMATCH: 'The ;NO format must contain N widths and N-1 physical gaps.',
      NO_GAP_MINIMUM: `Physical gaps in ;NO mode cannot be less than ${details.minimum || 13} mm.`,
      NO_TOKEN_POSITION: 'NO may only be used as the final token.', WIDTH_NUMERIC_REQUIRED: 'Width values must be numeric.',
      WIDTH_POSITIVE_REQUIRED: 'Width values must be positive.', TOTAL_WIDTH_TOO_SMALL: 'The total width is too small for the selected system count.',
      SYSTEM_WIDTH_TOO_SMALL: 'A system is too narrow for the rail and rear-mechanism layout.',
      VALUE_SYSTEM_COUNT_MISMATCH: `${name} must contain one common value or exactly one value per system.`,
      VALUE_REQUIRED: `Enter ${name}.`, VALUE_NUMERIC_REQUIRED: `${name} values must be numeric.`,
      VALUE_MINIMUM: `${name} contains a value below the permitted minimum.`, VALUE_MAXIMUM: `${name} contains a value above the permitted maximum.`,
      INDEPENDENT_WIDTH_FORMAT: 'Independent PergoRise width must use Group:Gap:Group format.',
      INDEPENDENT_GROUP_GAP_POSITIVE: 'The gap between independent PergoRise groups must be a positive number.',
      INDEPENDENT_INTERNAL_GAP_POSITIVE: 'The internal gap inside an independent group must be a positive number.',
      INDEPENDENT_FIELD_GROUP_COUNT: `${name} does not match the independent group structure defined by Width.`,
      INDEPENDENT_FIELD_COLON_NOT_ALLOWED: `The colon character is supported only in Width. Use a semicolon-separated global ${name} list.`,
      INDEPENDENT_GROUP_VALUE_COUNT: `Enter one common value or one value per position for the indicated independent group.`,
      INDEPENDENT_NO_POSITION: 'NO may only be used at the end of an independent projection group.',
      NO_NOT_ALLOWED: `NO is not supported in ${name}.`, INDEPENDENT_FIELD_GAP_POSITIVE: 'Group separator gaps must be positive.', VALUE_INTEGER_REQUIRED: `${name} must contain whole numbers.`
    } : {
      SYSTEM_COUNT_REQUIRED: 'SİSTEM ADEDİ GİRİN.', SYSTEM_COUNT_INVALID: 'Sistem adedi pozitif tam sayı olmalıdır.',
      SYSTEM_COUNT_LIMIT: `Sistem adedi ${details.limit || 30} değerini aşamaz.`, WIDTH_REQUIRED: 'GENİŞLİK GİRİN.',
      WIDTH_SYSTEM_COUNT_MISMATCH: `${name} değer adedi sistem adediyle uyuşmuyor. Tek toplam değer veya sistem adedi kadar değer girin.`,
      NO_TOKEN_COUNT_MISMATCH: ';NO biçiminde N adet genişlik ve N-1 adet fiziksel boşluk bulunmalıdır.',
      NO_GAP_MINIMUM: `;NO fiziksel boşlukları ${details.minimum || 13} mm'den küçük olamaz.`,
      NO_TOKEN_POSITION: 'NO yalnız son token olarak kullanılabilir.', WIDTH_NUMERIC_REQUIRED: 'Genişlik değerleri sayısal olmalıdır.',
      WIDTH_POSITIVE_REQUIRED: 'Genişlik değerleri pozitif olmalıdır.', TOTAL_WIDTH_TOO_SMALL: 'Toplam genişlik seçilen sistem adedi için yetersiz.',
      SYSTEM_WIDTH_TOO_SMALL: 'Bir sistem ray ve arka mekanizma yerleşimi için fazla dar.',
      VALUE_SYSTEM_COUNT_MISMATCH: `${name} için tek ortak değer veya sistem adedi kadar değer girin.`,
      VALUE_REQUIRED: `${name} alanını doldurun.`, VALUE_NUMERIC_REQUIRED: `${name} değerleri sayısal olmalıdır.`,
      VALUE_MINIMUM: `${name} izin verilen minimum değerin altında.`, VALUE_MAXIMUM: `${name} izin verilen maksimum değerin üzerinde.`,
      INDEPENDENT_WIDTH_FORMAT: 'Bağımsız PergoRise genişlik formatı Grup:Boşluk:Grup biçiminde olmalıdır.',
      INDEPENDENT_GROUP_GAP_POSITIVE: 'Gruplar arası boşluk pozitif bir sayı olmalıdır.',
      INDEPENDENT_INTERNAL_GAP_POSITIVE: 'Bağımsız grup içi boşluk pozitif bir sayı olmalıdır.',
      INDEPENDENT_FIELD_GROUP_COUNT: `${name} değerleri genişlikteki bağımsız grup yapısıyla eşleşmiyor.`,
      INDEPENDENT_FIELD_COLON_NOT_ALLOWED: `İki nokta üst üste (:) yalnız Genişlik alanında kullanılabilir. ${name} için noktalı virgüllü global liste girin.`,
      INDEPENDENT_GROUP_VALUE_COUNT: `Belirtilen bağımsız grup için 1 veya grup poz sayısı kadar ${name} değeri girilmelidir.`,
      INDEPENDENT_NO_POSITION: 'NO yalnızca bağımsız açılım grubunun sonunda kullanılabilir.',
      NO_NOT_ALLOWED: `${name} alanında NO kullanılamaz.`, INDEPENDENT_FIELD_GAP_POSITIVE: 'Grup ayırıcı boşlukları pozitif olmalıdır.', VALUE_INTEGER_REQUIRED: `${name} pozitif tam sayı olmalıdır.`
    };
    return map[code] || (en ? 'Multi-position input is invalid.' : 'Çoklu poz girişi geçersiz.');
  }

  function multiPositionInputError(code, fieldName, details) {
    const error = new Error(multiPositionValidationMessage(code, fieldName, details));
    error.code = code;
    error.field = fieldName;
    error.plmrClearPreview = [
      'SYSTEM_COUNT_REQUIRED', 'SYSTEM_COUNT_INVALID', 'SYSTEM_COUNT_LIMIT',
      'WIDTH_SYSTEM_COUNT_MISMATCH', 'NO_TOKEN_COUNT_MISMATCH', 'NO_TOKEN_POSITION',
      'VALUE_SYSTEM_COUNT_MISMATCH'
    ].includes(code);
    return error;
  }

  function clearMultiPositionFieldError() {
    ['systemCount', 'width', 'opening', 'rearHeight', 'frontHeight', 'rayCount', 'postCount'].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.classList.remove('plmr-input-error');
      el.removeAttribute('aria-invalid');
      if (el.dataset && el.dataset.validationMessage) {
        el.removeAttribute('title');
        delete el.dataset.validationMessage;
      }
    });
  }

  function syncSystemCountValidationState() {
    const el = $('systemCount');
    if (!el) return false;
    const rules = window.PulumurMultiPositionRules;
    const result = rules && typeof rules.systemCount === 'function'
      ? rules.systemCount(el.value, applicationLimits().maxSystems)
      : { ok: /^\d+$/.test(String(el.value || '').trim()) && Number(el.value) > 0 };
    el.classList.toggle('plmr-input-valid', !!result.ok);
    if (result.ok) {
      el.classList.remove('plmr-input-error');
      el.setAttribute('aria-invalid', 'false');
      if (el.dataset && el.dataset.validationMessage) {
        el.removeAttribute('title');
        delete el.dataset.validationMessage;
      }
    } else {
      el.classList.remove('plmr-input-valid');
      if (el.getAttribute('aria-invalid') === 'false') el.removeAttribute('aria-invalid');
    }
    return !!result.ok;
  }

  function markMultiPositionFieldError(field, message) {
    clearMultiPositionFieldError();
    const el = $(field);
    if (!el) return;
    el.classList.remove('plmr-input-valid');
    el.classList.add('plmr-input-error');
    el.setAttribute('aria-invalid', 'true');
    el.dataset.validationMessage = String(message || '');
    el.setAttribute('title', String(message || ''));
  }

  function validateInput(d) {
    const oversizedField = ['systemCount', 'width', 'opening', 'rearHeight', 'frontHeight', 'rayCount', 'postCount']
      .find(key => String(d && d[key] == null ? '' : d[key]).length > 4096);
    if (oversizedField) throw new Error(currentLanguage === 'en' ? `The ${oversizedField} input is too long.` : `${oversizedField} alanı izin verilenden uzun.`);
    assertInputDigitPolicies(d);
    assertStateWithinLimits(d);
    assertPostSpacingPolicy(d);
    const rules = window.PulumurMultiPositionRules;
    if (!rules) throw new Error('MULTI_POSITION_RULES_NOT_READY');
    const independent = typeof rules.parseIndependentPergoRiseInput === 'function'
      ? rules.parseIndependentPergoRiseInput(d || {}, { maxRaysPerSystem: applicationLimits().maxRaysPerSystem })
      : { ok: true, independent: false };
    if (independent && independent.independent) {
      if (!independent.ok) throw multiPositionInputError(independent.code, independent.field || 'width', independent);
      if (independent.totalPositionCount > applicationLimits().maxSystems) throw multiPositionInputError('SYSTEM_COUNT_LIMIT', 'systemCount', { limit: applicationLimits().maxSystems });
      return;
    }
    const countResult = rules.systemCount(d && d.systemCount, applicationLimits().maxSystems);
    if (!countResult.ok) throw multiPositionInputError(countResult.code, 'systemCount', countResult);
    const count = countResult.count;
    const widthResult = rules.parseWidth(d && d.width, count);
    if (!widthResult.ok) throw multiPositionInputError(widthResult.code, 'width', widthResult);
    const checks = [
      ['opening', rules.parsePositionValues(d && d.opening, count, { allowSingle: true, minimum: 1 })],
      ['rearHeight', rules.parsePositionValues(d && d.rearHeight, count, { allowSingle: true, minimum: 1 })],
      ['rayCount', rules.parsePositionValues(d && d.rayCount, count, { allowBlank: true, allowSingle: true, minimum: 1, maximum: applicationLimits().maxRaysPerSystem })]
    ];
    checks.forEach(([field, result]) => { if (!result.ok) throw multiPositionInputError(result.code, field, result); });
    const front = rules.parsePositionValues(d && d.frontHeight, count, { firstOnly: true, minimum: 1 });
    if (!front.ok) throw new Error(currentLanguage === 'en' ? 'Enter Front H.' : 'Ön H alanını doldurun.');
  }

  function validateBuiltDrawingLimits(drawing) {
    const limits = applicationLimits();
    const input = drawing && drawing.input;
    if (!input) throw new Error(currentLanguage === 'en' ? 'The geometry model is missing.' : 'Geometri modeli oluşturulamadı.');
    const systems = Array.isArray(input.systems) ? input.systems : [];
    const systemCount = Math.max(Number(input.systemCount) || 0, systems.length, Array.isArray(input.positions) ? input.positions.length : 0);
    if (systemCount > limits.maxSystems) throw new Error(currentLanguage === 'en' ? `System/position limit exceeded (${systemCount}/${limits.maxSystems}).` : `Poz/sistem sınırı aşıldı (${systemCount}/${limits.maxSystems}).`);
    const maxRays = systems.reduce((maximum, system) => Math.max(maximum, Number(system && system.rayCount) || 0), 0);
    if (maxRays > limits.maxRaysPerSystem) throw new Error(currentLanguage === 'en' ? `The rail limit per position is ${limits.maxRaysPerSystem}.` : `Poz başına ray sınırı ${limits.maxRaysPerSystem}.`);
    if (Number(input.postCount) > limits.maxFrontPosts) throw new Error(currentLanguage === 'en' ? `The front-post limit is ${limits.maxFrontPosts}.` : `Ön dikme sınırı ${limits.maxFrontPosts}.`);
  }

  function autosizeTextarea(el) {
    if (!el || el.tagName !== 'TEXTAREA') return;
    el.style.height = 'auto';
    el.style.height = Math.max(42, el.scrollHeight) + 'px';
  }

  function syncUpperInputWrap(data) {
    if (wrappingFields || !window.PulumurGeometry || typeof window.PulumurGeometry.wrapTextForUpperInput !== 'function') return;
    wrappingFields = true;
    try {
      upperTableFieldIds.forEach(id => {
        const el = $(id);
        if (!el || el.tagName !== 'TEXTAREA') return;
        const wrapped = id === 'extras'
          ? normalizeExtrasFormValue(el.value, true)
          : window.PulumurGeometry.wrapTextForUpperInput(String(el.value || '').replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(), data);
        if (el.value !== wrapped) el.value = wrapped;
        autosizeTextarea(el);
      });
    } finally {
      wrappingFields = false;
    }
  }

  function updatePreview(resetZoom = false) {
    if (previewUpdateTimer) {
      window.clearTimeout(previewUpdateTimer);
      previewUpdateTimer = null;
    }
    try {
      const unifiedWorkspace = window.PulumurUnifiedWorkspace;
      if (unifiedWorkspace && typeof unifiedWorkspace.isTechnical2DActive === 'function' && unifiedWorkspace.isTechnical2DActive()) {
        const projection = typeof unifiedWorkspace.refreshTechnical2D === 'function' ? unifiedWorkspace.refreshTechnical2D({ fit: resetZoom }) : null;
        if (projection) {
          lastDrawing = null;
          return projection;
        }
        // Do not let Pergola geometry overwrite the common preview while the
        // Bioclimatic canonical runtime is still settling.
        return null;
      }
      applyAutoRayPost(false);
      const runtimeForm = collectForm();
      syncProjectModelFromLegacy(runtimeForm, null, 'preview-input');
      let pipeline = window.PulumurRenderPipeline.buildFromModel(projectStore.getState(), {
        limits: applicationLimits(),
        validateInput,
        validateDrawing: validateBuiltDrawingLimits,
        buildGeometry: data => window.PulumurGeometry.buildDrawing(data)
      });
      dispatchProjectAction(window.PulumurProjectActions.TYPES.RECONCILE_TOPOLOGY, { normalizedInput: pipeline.drawing.input }, { source: 'preview-topology' });
      applyProjectModelRuntimeState(projectStore.getState());
      if (topologyReconcileReport && topologyReconcileReport.orphaned && topologyReconcileReport.orphaned.length) {
        pipeline = window.PulumurRenderPipeline.buildFromModel(projectStore.getState(), {
          limits: applicationLimits(),
          validateInput,
          validateDrawing: validateBuiltDrawingLimits,
          buildGeometry: data => window.PulumurGeometry.buildDrawing(data)
        });
      }
      const drawing = pipeline.drawing;
      clearMultiPositionFieldError();
      syncSystemCountValidationState();
      syncUpperInputWrap(pipeline.formData);
      lastDrawing = drawing;
      if (drawing.input && drawing.input.frontPostCentersAutoReconciled && Array.isArray(customFrontPostCenters)) {
        // V12.12.9: Tek poz standart bölmede eski otomatik ray düzeninden
        // kalmış dikme aksı listesini kalıcı manuel veri olarak taşımayı bırak.
        // Gerçek kullanıcı tarafından değiştirilmiş özel akslar geometri tarafında
        // otomatik liste olarak işaretlenmez ve burada korunur.
        customFrontPostCenters = null;
      }
      renderPreview(drawing, resetZoom);
      applyPreviewDimensionOffsets();
      applyPreviewDimensionFilter();
      syncHiddenDimensionRestoreControl();
      syncToolboxBooleanButtons();
      refreshToolboxSelectionDecorations();
      refreshBulkProfileSelectionDecorations();
      recordProjectHistoryState();
      const d = drawing.input;
      const previewUsage = isLargePreviewMode()
        ? (currentLanguage === 'en' ? 'Mouse wheel: zoom; left-button drag: pan; two-finger gesture: pinch/pan.' : 'Tekerlek: zoom; sol tuş sürükleme: pan; iki parmak: yakınlaştırma/kaydırma.')
        : (currentLanguage === 'en' ? 'Compact preview is read-only; open the large preview for drawing edits.' : 'Küçük ön izleme salt okunurdur; çizim düzenlemek için büyük ön izlemeyi açın.');
      statusText.textContent = currentLanguage === 'en'
        ? `Ready: Page1 B1=${d.sayfa1 ? d.sayfa1.B1_width : Math.round(d.width)} | ${Math.round(d.opening)} mm projection, ${d.systems.map(s => s.rayCount).join(';')} rails, ${d.postCount} posts, angle ${window.PulumurGeometry.formatDeg(d.angle)}. ${previewUsage} V10.4: ProjectModel owns persistent state; the final right-side view is the editing master and the final left-side view is its semantic mirror.`
        : `Hazır: Sayfa1 B1=${d.sayfa1 ? d.sayfa1.B1_width : Math.round(d.width)} | ${Math.round(d.opening)} mm açılım, ${d.systems.map(s => s.rayCount).join(';')} ray, ${d.postCount} dikme, açı ${window.PulumurGeometry.formatDeg(d.angle)}. ${previewUsage} V10.4: kalıcı durum merkezi ProjectModel içinde tutulur; son sağ yan görünüş düzenleme kaynağı, son sol yan görünüş semantik aynasıdır.`;
      return drawing;
    } catch (err) {
      const txt = UI_TEXT[currentLanguage] || UI_TEXT.tr;
      // Sistem adedi veya poz/token topolojisi geçersizse eski çizim ekranda
      // bırakılmaz; kullanıcı geçersiz girdinin hâlâ çizildiğini düşünmemelidir.
      // Sayı yazımı sırasındaki diğer geçici hatalarda mevcut zoom/pan korunur.
      if (err && err.plmrClearPreview) {
        lastDrawing = null;
        preview.innerHTML = `<div class="empty-state">${escapeHtml(txt.emptyPreview)}</div>`;
      } else if (!getPreviewSvg()) {
        preview.innerHTML = `<div class="empty-state">${escapeHtml(txt.emptyPreview)}</div>`;
      }
      if (err && err.field) markMultiPositionFieldError(err.field, err.message);
      statusText.textContent = err.message;
      return null;
    }
  }


  function isPreviewToggleOn(el) {
    return !!(el && el.classList.contains('is-on'));
  }

  function setPreviewToggleState(el, on) {
    if (!el) return;
    el.classList.toggle('is-on', !!on);
    el.classList.toggle('is-off', !on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
  }


  function normalizeHiddenDimensionIds(raw) {
    if (!Array.isArray(raw)) return [];
    return Array.from(new Set(raw.map(value => String(value || '').trim()).filter(Boolean)));
  }

  function syncHiddenDimensionRestoreControl() {
    const button = $('restoreHiddenDimensionsBtn');
    if (!button) return;
    const count = hiddenDimensionIds.length;
    button.hidden = !(count > 0 && isLargePreviewMode());
    button.textContent = currentLanguage === 'en' ? `Show Hidden Dimensions (${count})` : `Gizli Ölçüleri Göster (${count})`;
  }

  function hiddenDimensionIdFromMeta(meta) {
    return String(meta && (meta.dimId || meta.previewDimKey) || '').trim();
  }

  function hideDimension(meta) {
    const id = hiddenDimensionIdFromMeta(meta);
    if (!id) return false;
    hiddenDimensionIds = normalizeHiddenDimensionIds([...hiddenDimensionIds, id]);
    delete previewDimensionOffsets[id];
    updatePreview(false);
    syncHiddenDimensionRestoreControl();
    statusText.textContent = currentLanguage === 'en' ? 'Dimension hidden from preview and exports.' : 'Ölçü önizleme ve çıktılarda gizlendi.';
    return true;
  }

  function restoreAllHiddenDimensions() {
    if (!hiddenDimensionIds.length) return;
    hiddenDimensionIds = [];
    updatePreview(false);
    syncHiddenDimensionRestoreControl();
    statusText.textContent = currentLanguage === 'en' ? 'Hidden dimensions are visible again.' : 'Gizli ölçüler yeniden görünür yapıldı.';
  }

  function normalizePreviewDimensionOffsets(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    Object.entries(raw).forEach(([key, value]) => {
      if (!key || !value || typeof value !== 'object') return;
      const x = Number(value.x) || 0;
      const y = Number(value.y) || 0;
      if (Math.abs(x) > 0.001 || Math.abs(y) > 0.001) out[String(key)] = { x, y };
    });
    return out;
  }

  function applyPreviewDimensionOffsets() {
    preview.querySelectorAll('[data-preview-dim-key]').forEach(group => {
      const key = String(group.dataset.previewDimKey || '');
      const axis = String(group.dataset.dimensionAxis || 'aligned').toLowerCase();
      const saved = previewDimensionOffsets[key] || { x: 0, y: 0 };
      const x = axis === 'vertical' ? (Number(saved.x) || 0) : 0;
      const y = axis === 'horizontal' ? (Number(saved.y) || 0) : 0;
      group.setAttribute('transform', `translate(${x} ${y})`);
    });
  }

  function previewDimensionDragCandidate(target) {
    if (!target || !target.closest || toolboxSelectionMode) return null;
    const group = target.closest('.editable-dimension,.preview-dimension-plain');
    if (!group) return null;
    const axis = String(group.dataset.dimensionAxis || '').toLowerCase();
    if (!['horizontal','vertical'].includes(axis)) return null;
    const key = String(group.dataset.previewDimKey || group.dataset.dimId || '');
    if (!key) return null;
    return { group, axis, key };
  }

  function svgDeltaFromClient(dx, dy) {
    const svg = getPreviewSvg();
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : null;
    if (!rect.width || !rect.height || !vb) return { x: 0, y: 0 };
    return { x: dx * vb.width / rect.width, y: dy * vb.height / rect.height };
  }

  function beginPreviewDimensionDrag(evt) {
    if (evt.button !== 0) return false;
    const candidate = previewDimensionDragCandidate(evt.target);
    if (!candidate) return false;
    const saved = previewDimensionOffsets[candidate.key] || { x: 0, y: 0 };
    dimensionDragState = { ...candidate, pointerId: evt.pointerId, startClientX: evt.clientX, startClientY: evt.clientY, baseX: Number(saved.x) || 0, baseY: Number(saved.y) || 0, moved: false, captured: false };
    evt.stopPropagation();
    return true;
  }

  function movePreviewDimensionDrag(evt) {
    const state = dimensionDragState;
    if (!state || state.pointerId !== evt.pointerId) return false;
    const clientDx = evt.clientX - state.startClientX;
    const clientDy = evt.clientY - state.startClientY;
    if (!state.moved && Math.hypot(clientDx, clientDy) >= 3) {
      state.moved = true;
      state.group.classList.add('is-dimension-dragging');
      if (preview.setPointerCapture) { try { preview.setPointerCapture(evt.pointerId); state.captured = true; } catch (_) {} }
    }
    if (!state.moved) { evt.stopPropagation(); return true; }
    const delta = svgDeltaFromClient(clientDx, clientDy);
    const x = state.axis === 'vertical' ? state.baseX + delta.x : 0;
    const y = state.axis === 'horizontal' ? state.baseY + delta.y : 0;
    state.group.setAttribute('transform', `translate(${x} ${y})`);
    if (state.moved) {
      previewState.dragMoved = true;
      statusText.textContent = currentLanguage === 'en' ? `Dimension line moved on the ${state.axis === 'horizontal' ? 'Y' : 'X'} axis.` : `Ölçü çizgisi ${state.axis === 'horizontal' ? 'Y' : 'X'} ekseninde kaydırılıyor.`;
    }
    evt.preventDefault(); evt.stopPropagation(); return true;
  }

  function endPreviewDimensionDrag(evt) {
    const state = dimensionDragState;
    if (!state || (evt && state.pointerId !== evt.pointerId)) return false;
    state.group.classList.remove('is-dimension-dragging');
    if (state.moved) {
      const transform = state.group.getAttribute('transform') || '';
      const match = /translate\(([-+0-9.eE]+)[ ,]+([-+0-9.eE]+)\)/.exec(transform);
      const x = match ? Number(match[1]) || 0 : 0, y = match ? Number(match[2]) || 0 : 0;
      previewDimensionOffsets[state.key] = { x: state.axis === 'vertical' ? x : 0, y: state.axis === 'horizontal' ? y : 0 };
      recordProjectHistoryState();
      statusText.textContent = currentLanguage === 'en' ? 'Dimension line position saved for the preview.' : 'Ölçü çizgisi konumu önizleme için kaydedildi.';
    }
    if (evt && state.captured && preview.releasePointerCapture) { try { preview.releasePointerCapture(state.pointerId); } catch (_) {} }
    dimensionDragState = null;
    window.setTimeout(() => { if (previewState.dragMoved) previewState.dragMoved = false; }, 0);
    if (evt && state.moved) { evt.preventDefault(); evt.stopPropagation(); }
    return true;
  }

  function availablePreviewPositionCount() {
    const d = lastDrawing && lastDrawing.input ? lastDrawing.input : null;
    if (!d) return 1;
    return Math.max(1, Number(d.positionCount) || 0, Array.isArray(d.positions) ? d.positions.length : 0, Array.isArray(d.systems) ? d.systems.length : 0);
  }

  function serializePreviewDimensionFilter() {
    return {
      main: previewDimensionFilter.main !== false,
      all: previewDimensionFilter.all === true,
      preset: String(previewDimensionFilter.preset || 'main'),
      horizontal: previewDimensionFilter.horizontal !== false,
      vertical: previewDimensionFilter.vertical !== false,
      editable: previewDimensionFilter.editable !== false,
      readonly: previewDimensionFilter.readonly !== false,
      positions: Array.isArray(previewDimensionFilter.positions) ? previewDimensionFilter.positions.map(Number).filter(Number.isInteger) : null
    };
  }

  function restorePreviewDimensionFilter(raw) {
    const value = raw && typeof raw === 'object' ? raw : {};
    // v8.9.21 ve daha eski proje dosyalarıyla geriye dönük uyumluluk.
    if (!Object.prototype.hasOwnProperty.call(value, 'preset')) {
      previewDimensionFilter.main = value.main !== false;
      previewDimensionFilter.all = value.main !== false && value.all === true;
      previewDimensionFilter.preset = previewDimensionFilter.main ? (previewDimensionFilter.all ? 'all' : 'main') : 'none';
      previewDimensionFilter.horizontal = true;
      previewDimensionFilter.vertical = true;
      previewDimensionFilter.editable = true;
      previewDimensionFilter.readonly = true;
      previewDimensionFilter.positions = null;
      return;
    }
    previewDimensionFilter.main = value.main !== false;
    previewDimensionFilter.all = value.all === true;
    previewDimensionFilter.preset = ['main','all','none','custom'].includes(String(value.preset)) ? String(value.preset) : 'custom';
    previewDimensionFilter.horizontal = value.horizontal !== false;
    previewDimensionFilter.vertical = value.vertical !== false;
    previewDimensionFilter.editable = value.editable !== false;
    previewDimensionFilter.readonly = value.readonly !== false;
    previewDimensionFilter.positions = Array.isArray(value.positions) ? value.positions.map(Number).filter(Number.isInteger) : null;
  }

  function setDimensionFilterPreset(preset) {
    const next = String(preset || 'all');
    if (next === 'none') {
      previewDimensionFilter.main = false;
      previewDimensionFilter.all = false;
      previewDimensionFilter.preset = 'none';
    } else if (next === 'main') {
      previewDimensionFilter.main = true;
      previewDimensionFilter.all = false;
      previewDimensionFilter.preset = 'main';
      previewDimensionFilter.horizontal = true;
      previewDimensionFilter.vertical = true;
      previewDimensionFilter.editable = true;
      previewDimensionFilter.readonly = true;
      previewDimensionFilter.positions = null;
    } else {
      previewDimensionFilter.main = true;
      previewDimensionFilter.all = true;
      previewDimensionFilter.preset = 'all';
      previewDimensionFilter.horizontal = true;
      previewDimensionFilter.vertical = true;
      previewDimensionFilter.editable = true;
      previewDimensionFilter.readonly = true;
      previewDimensionFilter.positions = null;
    }
    syncDimensionFilterControls();
    applyPreviewDimensionFilter();
  }

  function dimensionNodeEditable(node) {
    return node.classList.contains('editable-dimension') && String(node.dataset.editable || 'true') !== 'false';
  }

  function dimensionMatchesAdvancedFilter(node) {
    const axis = String(node.dataset.dimensionAxis || 'aligned').toLowerCase();
    let axisMatch = false;
    if (axis === 'horizontal') axisMatch = previewDimensionFilter.horizontal;
    else if (axis === 'vertical') axisMatch = previewDimensionFilter.vertical;
    else axisMatch = previewDimensionFilter.horizontal && previewDimensionFilter.vertical;
    if (!axisMatch) return false;

    const editable = dimensionNodeEditable(node);
    if (editable && !previewDimensionFilter.editable) return false;
    if (!editable && !previewDimensionFilter.readonly) return false;

    const selectedPositions = previewDimensionFilter.positions;
    if (Array.isArray(selectedPositions)) {
      const positionIndex = Number(node.dataset.positionIndex);
      if (!Number.isInteger(positionIndex) || positionIndex < 0 || !selectedPositions.includes(positionIndex)) return false;
    }
    return true;
  }

  function applyPreviewDimensionFilter() {
    const showMain = previewDimensionFilter.main !== false;
    const showAll = showMain && previewDimensionFilter.all === true;
    setPreviewToggleState($('showMainDims'), showMain && !showAll);
    const allBtn = $('showAllDims');
    if (allBtn) {
      const state = dimensionFilterMasterState();
      setPreviewToggleState(allBtn, state.all);
      allBtn.classList.toggle('is-mixed', state.partial);
      if (state.partial) {
        allBtn.classList.remove('is-on', 'is-off');
        allBtn.setAttribute('aria-pressed', 'mixed');
      }
    }

    preview.querySelectorAll('.editable-dimension, .preview-dimension-plain').forEach(node => {
      const type = String(node.dataset.dimensionType || 'main').toLowerCase();
      const baseVisible = showMain && (showAll || type !== 'detail');
      const visible = baseVisible && dimensionMatchesAdvancedFilter(node);
      node.style.display = visible ? '' : 'none';
    });
    syncDimensionFilterControls();
  }

  function dimensionFilterText() {
    return currentLanguage === 'en' ? {
      title: 'Dimension Filter', axis: 'Orientation', horizontal: 'Horizontal', vertical: 'Vertical', edit: 'Status', editable: 'Editable', readonly: 'Reference only', position: 'Position', all: 'All', close: 'Close'
    } : {
      title: 'Ölçü Filtresi', axis: 'Yön', horizontal: 'Yatay', vertical: 'Dikey', edit: 'Durum', editable: 'Düzenlenebilir', readonly: 'Bilgi amaçlı', position: 'Poz', all: 'Hepsi', close: 'Kapat'
    };
  }

  function rebuildDimensionPositionFilters() {
    const host = $('dimensionFilterPositions');
    if (!host) return;
    const count = availablePreviewPositionCount();
    const selected = previewDimensionFilter.positions;
    host.innerHTML = Array.from({ length: count }, (_, index) => {
      const checked = !Array.isArray(selected) || selected.includes(index);
      const label = currentLanguage === 'en' ? `Position ${index + 1}` : `Poz ${index + 1}`;
      return `<label><input type="checkbox" data-dim-position="${index}"${checked ? ' checked' : ''}><span>${label}</span></label>`;
    }).join('');
  }

  function dimensionFilterMasterState() {
    const flags = [
      previewDimensionFilter.horizontal !== false,
      previewDimensionFilter.vertical !== false,
      previewDimensionFilter.editable !== false,
      previewDimensionFilter.readonly !== false
    ];
    const count = availablePreviewPositionCount();
    const selected = Array.isArray(previewDimensionFilter.positions)
      ? new Set(previewDimensionFilter.positions.map(Number).filter(Number.isInteger))
      : null;
    for (let index = 0; index < count; index += 1) flags.push(!selected || selected.has(index));
    const selectedCount = flags.filter(Boolean).length;
    return {
      all: previewDimensionFilter.main !== false && previewDimensionFilter.all === true && selectedCount === flags.length,
      none: selectedCount === 0,
      partial: selectedCount > 0 && selectedCount < flags.length
    };
  }

  function syncDimensionFilterControls() {
    const text = dimensionFilterText();
    const set = (id, value) => { const el = $(id); if (el) el.textContent = value; };
    set('dimensionFilterTitle', text.title);
    set('dimensionFilterAxisTitle', text.axis);
    set('dimensionFilterHorizontalLabel', text.horizontal);
    set('dimensionFilterVerticalLabel', text.vertical);
    set('dimensionFilterEditTitle', text.edit);
    set('dimensionFilterEditableLabel', text.editable);
    set('dimensionFilterReadonlyLabel', text.readonly);
    set('dimensionFilterPositionTitle', text.position);
    set('dimensionFilterMasterLabel', text.all);
    const close = $('dimensionFilterClose'); if (close) close.setAttribute('aria-label', text.close);
    const checks = {
      horizontal: previewDimensionFilter.horizontal,
      vertical: previewDimensionFilter.vertical,
      editable: previewDimensionFilter.editable,
      readonly: previewDimensionFilter.readonly
    };
    Object.entries(checks).forEach(([key, checked]) => {
      const input = document.querySelector(`[data-dim-filter="${key}"]`);
      if (input) input.checked = !!checked;
    });
    rebuildDimensionPositionFilters();
    const master = $('dimensionFilterMaster');
    if (master) {
      const state = dimensionFilterMasterState();
      master.checked = state.all;
      master.indeterminate = state.partial;
      master.setAttribute('aria-checked', state.partial ? 'mixed' : (state.all ? 'true' : 'false'));
    }
  }

  function closeDimensionFilterMenu() {
    const menu = $('dimensionFilterMenu');
    const btn = $('showAllDims');
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function toggleDimensionFilterMenu(forceOpen = null) {
    const menu = $('dimensionFilterMenu');
    const btn = $('showAllDims');
    if (!menu || !btn) return;
    const open = forceOpen == null ? menu.hidden : !!forceOpen;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) syncDimensionFilterControls();
  }

  function updateDimensionFilterFromMenu() {
    previewDimensionFilter.main = true;
    previewDimensionFilter.all = true;
    previewDimensionFilter.preset = 'custom';
    ['horizontal','vertical','editable','readonly'].forEach(key => {
      const input = document.querySelector(`[data-dim-filter="${key}"]`);
      previewDimensionFilter[key] = !!(input && input.checked);
    });
    const positions = Array.from(document.querySelectorAll('[data-dim-position]'));
    const selected = positions.filter(input => input.checked).map(input => Number(input.dataset.dimPosition)).filter(Number.isInteger);
    previewDimensionFilter.positions = selected.length === positions.length ? null : selected;
    applyPreviewDimensionFilter();
  }

  function setAllDimensionFilterChoices(checked) {
    const next = !!checked;
    previewDimensionFilter.main = next;
    previewDimensionFilter.all = next;
    previewDimensionFilter.preset = next ? 'all' : 'none';
    previewDimensionFilter.horizontal = next;
    previewDimensionFilter.vertical = next;
    previewDimensionFilter.editable = next;
    previewDimensionFilter.readonly = next;
    previewDimensionFilter.positions = next ? null : [];
    applyPreviewDimensionFilter();
  }

  function bindPreviewFilterControls() {
    const mainEl = $('showMainDims');
    const allEl = $('showAllDims');
    const menu = $('dimensionFilterMenu');
    if (!mainEl || !allEl || !menu || dimensionFilterMenuBound) return;
    dimensionFilterMenuBound = true;

    mainEl.onclick = () => {
      if (previewDimensionFilter.preset === 'main' && previewDimensionFilter.main) setDimensionFilterPreset('none');
      else setDimensionFilterPreset('main');
      closeDimensionFilterMenu();
    };
    allEl.onclick = evt => { evt.preventDefault(); evt.stopPropagation(); toggleDimensionFilterMenu(); };
    $('dimensionFilterClose').onclick = closeDimensionFilterMenu;
    menu.addEventListener('click', evt => { evt.stopPropagation(); });
    menu.addEventListener('change', evt => {
      const target = evt.target;
      if (!target) return;
      if (target.id === 'dimensionFilterMaster') {
        setAllDimensionFilterChoices(target.checked);
        return;
      }
      if (target.matches('[data-dim-filter]') || target.matches('[data-dim-position]')) updateDimensionFilterFromMenu();
    });
    document.addEventListener('click', evt => {
      const control = $('dimensionFilterControl');
      if (control && !control.contains(evt.target)) closeDimensionFilterMenu();
    });
    document.addEventListener('keydown', evt => { if (evt.key === 'Escape' && !$('dimensionFilterMenu').hidden) closeDimensionFilterMenu(); });
    setDimensionFilterPreset('main');
  }

  function isLargePreviewMode() {
    return !!(previewPanel && previewPanel.classList.contains('is-expanded'));
  }

  function syncPreviewMode() {
    const interactive = isLargePreviewMode();
    preview.dataset.previewMode = interactive ? 'interactive' : 'compact';
    preview.dataset.interactive = interactive ? 'true' : 'false';
    preview.setAttribute('aria-readonly', interactive ? 'false' : 'true');
    preview.tabIndex = interactive ? 0 : -1;
    if (!interactive) {
      previewState.dragActive = false;
      previewState.pointerId = null;
      preview.classList.remove('is-dragging', 'is-touch-gesturing');
    }
    syncHiddenDimensionRestoreControl();
  }

  function previewInteractionLocked() {
    return previewGestureState.active || performance.now() < previewGestureState.suppressClickUntil;
  }

  function cancelPreviewGestureFrame() {
    if (previewGestureState.frameId) {
      window.cancelAnimationFrame(previewGestureState.frameId);
      previewGestureState.frameId = 0;
    }
  }

  function resetPreviewGestureState(releaseCapture = false) {
    cancelPreviewGestureFrame();
    if (releaseCapture && preview && preview.releasePointerCapture) {
      previewGestureState.pointers.forEach((_, pointerId) => {
        try { preview.releasePointerCapture(pointerId); } catch (_) {}
      });
    }
    previewGestureState.pointers.clear();
    previewGestureState.active = false;
    previewGestureState.startDistance = 0;
    previewGestureState.latestMetrics = null;
    preview.classList.remove('is-touch-gesturing');
  }

  function getPreviewStage() {
    return preview.querySelector('.preview-stage');
  }

  function getPreviewSvg() {
    return preview.querySelector('svg');
  }

  function getSvgViewBoxSize(svg) {
    const vb = svg && svg.viewBox && svg.viewBox.baseVal;
    return {
      width: Math.max(1, vb && vb.width ? vb.width : (svg ? (svg.clientWidth || 1000) : 1000)),
      height: Math.max(1, vb && vb.height ? vb.height : (svg ? (svg.clientHeight || 1000) : 1000))
    };
  }

  function computePreviewFitScale(svg) {
    const box = getSvgViewBoxSize(svg);
    const compact = !isLargePreviewMode();
    const adaptivePadding = Math.max(8, Math.min(24, Math.round(Math.min(preview.clientWidth || 0, preview.clientHeight || 0) * 0.025)));
    const padding = compact ? adaptivePadding : 24;
    const availableW = Math.max(120, preview.clientWidth - padding * 2);
    const availableH = Math.max(120, preview.clientHeight - padding * 2);
    const fitScale = Math.max(0.01, Math.min(availableW / box.width, availableH / box.height));
    return compact ? Math.min(1.25, fitScale) : fitScale;
  }

  function applyPreviewScale() {
    const stage = getPreviewStage();
    const svg = getPreviewSvg();
    if (!stage || !svg) return;
    const box = getSvgViewBoxSize(svg);
    previewState.baseScale = computePreviewFitScale(svg);
    const totalScale = previewState.baseScale * previewState.zoom;
    stage.style.width = `${Math.max(80, box.width * totalScale)}px`;
    stage.style.height = `${Math.max(80, box.height * totalScale)}px`;
  }

  function commercialProductText(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/PERGO RISE/g, 'PERGOLA')
      .replace(/Pergo Rise/g, 'Pergola');
  }

  function renderPreview(drawing, resetZoom = false) {
    // Product naming is a presentation-only translation. Native PLMR geometry,
    // colors, viewBox, toolbox and interaction markup remain untouched.
    const svg = commercialProductText(window.PulumurGeometry.renderSvg(drawing));
    const oldStage = getPreviewStage();
    const oldSvg = getPreviewSvg();
    const compact = !isLargePreviewMode();

    // V13.23: Küçük ön izleme her render'da salt-okunur ve fit-to-view başlar.
    // Büyük ön izleme ise mevcut masaüstü zoom/pan görünümünü korur.
    if (compact || resetZoom || !oldStage || !oldSvg) {
      preview.innerHTML = `<div class="preview-stage">${svg}</div>`;
      previewState.zoom = 1;
      preview.scrollLeft = 0;
      preview.scrollTop = 0;
      window.requestAnimationFrame(() => applyPreviewScale());
      return;
    }

    // Dinamik güncellemelerde mevcut zoom/pan sahnesini bozmadan sadece SVG içeriğini yenile.
    const keepLeftRatio = preview.scrollLeft / Math.max(1, preview.scrollWidth - preview.clientWidth);
    const keepTopRatio = preview.scrollTop / Math.max(1, preview.scrollHeight - preview.clientHeight);
    const totalScale = Math.max(0.0001, (Number(previewState.baseScale) || 1) * (Number(previewState.zoom) || 1));
    const keepWorldCenterX = (preview.scrollLeft + preview.clientWidth / 2) / totalScale;
    const keepWorldCenterY = (preview.scrollTop + preview.clientHeight / 2) / totalScale;
    const keepScrollLeft = preview.scrollLeft;
    const keepScrollTop = preview.scrollTop;

    if (oldStage && oldSvg) {
      const temp = document.createElement('div');
      temp.innerHTML = svg;
      const nextSvg = temp.firstElementChild;
      if (nextSvg) {
        oldSvg.replaceWith(nextSvg);
        // Yeni çizimin viewBox ölçüsü değişse bile aynı gerçek ölçek korunur.
        // Böylece ürün/ölçü düzenleme sonrasında kullanıcının zoom seviyesi değişmez.
        const nextBox = getSvgViewBoxSize(nextSvg);
        oldStage.style.width = `${Math.max(80, nextBox.width * totalScale)}px`;
        oldStage.style.height = `${Math.max(80, nextBox.height * totalScale)}px`;
        const restore = () => {
          preview.scrollLeft = Math.max(0, keepWorldCenterX * totalScale - preview.clientWidth / 2);
          preview.scrollTop = Math.max(0, keepWorldCenterY * totalScale - preview.clientHeight / 2);
        };
        restore();
        window.requestAnimationFrame(restore);
        return;
      }
    }

    // Yedek yol: stage yoksa kur ama zoom resetleme.
    preview.innerHTML = `<div class="preview-stage">${svg}</div>`;
    const stage = getPreviewStage();
    const newSvg = getPreviewSvg();
    if (stage && newSvg) {
      const box = getSvgViewBoxSize(newSvg);
      const totalScale = Math.max(0.0001, (Number(previewState.baseScale) || 1) * (Number(previewState.zoom) || 1));
      stage.style.width = `${Math.max(80, box.width * totalScale)}px`;
      stage.style.height = `${Math.max(80, box.height * totalScale)}px`;
    }
    preview.scrollLeft = keepScrollLeft;
    preview.scrollTop = keepScrollTop;
    window.requestAnimationFrame(() => {
      preview.scrollLeft = keepScrollLeft || keepLeftRatio * Math.max(1, preview.scrollWidth - preview.clientWidth);
      preview.scrollTop = keepScrollTop || keepTopRatio * Math.max(1, preview.scrollHeight - preview.clientHeight);
    });
  }

  function fitPreview() {
    previewState.zoom = 1;
    preview.scrollLeft = 0;
    preview.scrollTop = 0;
    applyPreviewScale();
  }

  function setPreviewZoom(nextZoom, clientX, clientY) {
    const svg = getPreviewSvg();
    if (!svg || !isLargePreviewMode()) return;
    const rect = preview.getBoundingClientRect();
    const oldScale = Math.max(0.0001, previewState.baseScale * previewState.zoom);
    const localX = (clientX ?? (rect.left + rect.width / 2)) - rect.left;
    const localY = (clientY ?? (rect.top + rect.height / 2)) - rect.top;
    const worldX = (preview.scrollLeft + localX) / oldScale;
    const worldY = (preview.scrollTop + localY) / oldScale;
    previewState.zoom = Math.max(previewState.minZoom, Math.min(previewState.maxZoom, nextZoom));
    applyPreviewScale();
    const newScale = Math.max(0.0001, previewState.baseScale * previewState.zoom);
    preview.scrollLeft = Math.max(0, worldX * newScale - localX);
    preview.scrollTop = Math.max(0, worldY * newScale - localY);
  }


  function previewTouchMetrics() {
    const points = Array.from(previewGestureState.pointers.values()).slice(0, 2);
    if (points.length < 2) return null;
    const dx = points[1].clientX - points[0].clientX;
    const dy = points[1].clientY - points[0].clientY;
    return {
      midX: (points[0].clientX + points[1].clientX) / 2,
      midY: (points[0].clientY + points[1].clientY) / 2,
      distance: Math.max(1, Math.hypot(dx, dy))
    };
  }

  function beginPreviewTouchGesture() {
    const metrics = previewTouchMetrics();
    if (!metrics || !isLargePreviewMode() || !getPreviewSvg()) return false;
    const rect = preview.getBoundingClientRect();
    const totalScale = Math.max(0.0001, previewState.baseScale * previewState.zoom);
    previewGestureState.active = true;
    previewGestureState.startDistance = metrics.distance;
    previewGestureState.startZoom = previewState.zoom;
    previewGestureState.anchorWorldX = (preview.scrollLeft + metrics.midX - rect.left) / totalScale;
    previewGestureState.anchorWorldY = (preview.scrollTop + metrics.midY - rect.top) / totalScale;
    previewGestureState.latestMetrics = metrics;
    previewState.dragMoved = true;
    preview.classList.add('is-touch-gesturing');
    return true;
  }

  function applyPreviewTouchGestureFrame() {
    previewGestureState.frameId = 0;
    if (!previewGestureState.active || !previewGestureState.latestMetrics || !isLargePreviewMode()) return;
    const metrics = previewGestureState.latestMetrics;
    const ratio = metrics.distance / Math.max(1, previewGestureState.startDistance);
    previewState.zoom = Math.max(previewState.minZoom, Math.min(previewState.maxZoom, previewGestureState.startZoom * ratio));
    applyPreviewScale();
    const rect = preview.getBoundingClientRect();
    const totalScale = Math.max(0.0001, previewState.baseScale * previewState.zoom);
    const localX = metrics.midX - rect.left;
    const localY = metrics.midY - rect.top;
    preview.scrollLeft = Math.max(0, previewGestureState.anchorWorldX * totalScale - localX);
    preview.scrollTop = Math.max(0, previewGestureState.anchorWorldY * totalScale - localY);
  }

  function schedulePreviewTouchGesture(metrics) {
    previewGestureState.latestMetrics = metrics;
    if (!previewGestureState.frameId) {
      previewGestureState.frameId = window.requestAnimationFrame(applyPreviewTouchGestureFrame);
    }
  }

  function registerPreviewTouchPointer(evt) {
    if (!isLargePreviewMode() || evt.pointerType !== 'touch') return false;
    previewGestureState.pointers.set(evt.pointerId, { clientX: evt.clientX, clientY: evt.clientY });
    if (preview.setPointerCapture) {
      try { preview.setPointerCapture(evt.pointerId); } catch (_) {}
    }
    if (previewGestureState.pointers.size >= 2) {
      if (!previewGestureState.active) beginPreviewTouchGesture();
      evt.preventDefault();
      evt.stopPropagation();
    }
    return true;
  }

  function movePreviewTouchPointer(evt) {
    if (evt.pointerType !== 'touch' || !previewGestureState.pointers.has(evt.pointerId)) return false;
    previewGestureState.pointers.set(evt.pointerId, { clientX: evt.clientX, clientY: evt.clientY });
    if (previewGestureState.pointers.size >= 2) {
      if (!previewGestureState.active) beginPreviewTouchGesture();
      const metrics = previewTouchMetrics();
      if (metrics) schedulePreviewTouchGesture(metrics);
      evt.preventDefault();
      evt.stopPropagation();
    }
    return true;
  }

  function endPreviewTouchPointer(evt) {
    if (!evt || evt.pointerType !== 'touch' || !previewGestureState.pointers.has(evt.pointerId)) return false;
    previewGestureState.pointers.delete(evt.pointerId);
    if (preview.releasePointerCapture) {
      try { preview.releasePointerCapture(evt.pointerId); } catch (_) {}
    }
    if (previewGestureState.active && previewGestureState.pointers.size < 2) {
      cancelPreviewGestureFrame();
      previewGestureState.active = false;
      previewGestureState.latestMetrics = null;
      previewGestureState.suppressClickUntil = performance.now() + 450;
      previewState.dragMoved = true;
      preview.classList.remove('is-touch-gesturing');
    }
    if (!previewGestureState.pointers.size) previewGestureState.pointers.clear();
    return true;
  }

  function refitPreviewForContainer() {
    if (!getPreviewSvg()) return;
    if (!isLargePreviewMode()) {
      fitPreview();
      return;
    }
    const oldScale = Math.max(0.0001, previewState.baseScale * previewState.zoom);
    const worldCenterX = (preview.scrollLeft + preview.clientWidth / 2) / oldScale;
    const worldCenterY = (preview.scrollTop + preview.clientHeight / 2) / oldScale;
    applyPreviewScale();
    const nextScale = Math.max(0.0001, previewState.baseScale * previewState.zoom);
    preview.scrollLeft = Math.max(0, worldCenterX * nextScale - preview.clientWidth / 2);
    preview.scrollTop = Math.max(0, worldCenterY * nextScale - preview.clientHeight / 2);
  }

  function schedulePreviewRefit() {
    if (previewResizeFrame) window.cancelAnimationFrame(previewResizeFrame);
    previewResizeFrame = window.requestAnimationFrame(() => {
      previewResizeFrame = 0;
      refitPreviewForContainer();
    });
  }

  function bindPreviewResizeHandling() {
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(() => schedulePreviewRefit());
      observer.observe(preview);
    } else {
      window.addEventListener('resize', schedulePreviewRefit, { passive: true });
    }
    window.addEventListener('orientationchange', schedulePreviewRefit, { passive: true });
  }

  function splitEditableList(value) {
    return String(value ?? '').split(';').map(x => x.trim()).filter(Boolean);
  }

  function currentIndependentInputParse() {
    const rules = window.PulumurMultiPositionRules;
    if (!rules || typeof rules.parseIndependentPergoRiseInput !== 'function') return null;
    const raw = Object.fromEntries(['width','opening','rearHeight','frontHeight','rayCount','postCount'].map(id => [id, $(id) ? $(id).value : '']));
    const parsed = rules.parseIndependentPergoRiseInput(raw, applicationLimits());
    return parsed && parsed.ok && parsed.independent ? parsed : null;
  }

  function serializeIndependentWidthGroups(parsed, changedIndex, changedValue) {
    return parsed.groups.map(group => {
      const widths = group.widths.slice();
      const local = group.positions.findIndex(position => Number(position.globalPositionIndex) === Number(changedIndex));
      if (local >= 0) widths[local] = Math.round(Number(changedValue));
      const parts = [];
      widths.forEach((width, i) => { parts.push(String(width)); if (i < group.internalGaps.length) parts.push(String(group.internalGaps[i])); });
      return parts.join(';');
    }).flatMap((expr, groupIndex) => groupIndex < parsed.groupGaps.length ? [expr, String(parsed.groupGaps[groupIndex])] : [expr]).join(':');
  }

  function updateIndependentFieldValue(field, index, value, silent = false) {
    const parsed = currentIndependentInputParse();
    if (!parsed) return false;
    const cleanNumber = Math.round(Number(value));
    if (!Number.isFinite(cleanNumber) || cleanNumber <= 0) return false;
    const el = $(field);
    if (!el) return false;
    if (field === 'width') el.value = serializeIndependentWidthGroups(parsed.width, index, cleanNumber);
    else {
      const source = parsed[field];
      if (!source || !Array.isArray(source.values)) return false;
      const values = source.values.slice();
      if (Number(index) < 0 || Number(index) >= values.length) return false;
      values[Number(index)] = cleanNumber;
      const globalOpeningNo = field === 'opening' && Array.isArray(source.groups) && source.groups.length > 0 && source.groups.every(group => group.alignToFirst === true);
      el.value = `${values.join(';')}${globalOpeningNo ? ';NO' : ''}`;
    }
    if (!silent) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return true;
  }

  function updateEditableListValue(field, index, value, silent = false) {
    const el = $(field);
    if (!el || String(field || '').startsWith('__')) return;
    if (String($('width') && $('width').value || '').includes(':') && updateIndependentFieldValue(field, index, value, silent)) return;
    const clean = String(value ?? '').replace(/[^0-9]/g, '');
    if (!clean || Number(clean) <= 0) return;
    if (field === 'frontHeight') {
      el.value = clean;
      if (!silent) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }
    const list = splitEditableList(el.value);
    const count = Math.max(index + 1, list.length, lastDrawing && lastDrawing.input ? (lastDrawing.input.sidePositionCount || 1) : 1);
    const fallback = list[0] || clean;
    while (list.length < count) list.push(fallback);
    list[index] = clean;
    el.value = count > 1 ? list.join(';') : clean;
    if (!silent) {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function updateTopSystemMechanismWidth(meta, value, silent = false) {
    const drawingInput = lastDrawing && lastDrawing.input;
    const systems = drawingInput && Array.isArray(drawingInput.systems) ? drawingInput.systems : [];
    const index = Math.max(0, Number(meta && meta.index) || 0);
    if (!systems[index]) throw new Error(currentLanguage === 'en' ? 'The selected system could not be found.' : 'Seçilen sistem bulunamadı.');
    const desiredMechanismWidth = Math.round(Number(value) || 0);
    const system = systems[index];
    const rules = window.PulumurMultiPositionRules;
    const minimumMechanismWidth = rules && typeof rules.minimumMechanismWidthForRayCount === 'function'
      ? rules.minimumMechanismWidthForRayCount(system.rayCount, 80, 12)
      : Math.max(92, Math.max(1, Math.round(Number(system.rayCount) || 1)) * 80 + 12);
    if (desiredMechanismWidth < minimumMechanismWidth) {
      throw new Error(currentLanguage === 'en'
        ? `Rear-mechanism width must be at least ${minimumMechanismWidth} mm for ${system.rayCount} rail(s).`
        : `${system.rayCount} ray için arka mekanizma dıştan dışa genişliği en az ${minimumMechanismWidth} mm olmalıdır.`);
    }
    const nominalWidths = systems.map(item => Math.round(Number(item.nominalWidth) || 0));
    const boundaryDeduction = Math.max(0, Math.round(Number(system.mechanismDeductLeft) || 0))
      + Math.max(0, Math.round(Number(system.mechanismDeductRight) || 0));
    nominalWidths[index] = desiredMechanismWidth + boundaryDeduction;
    const widthEl = $('width');
    if (!widthEl) throw new Error(currentLanguage === 'en' ? 'Width field is unavailable.' : 'Genişlik alanı bulunamadı.');
    widthEl.value = nominalWidths.join(';');
    if (!silent) {
      widthEl.dispatchEvent(new Event('input', { bubbles: true }));
      widthEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function currentEditableListValue(field, index, fallback) {
    const el = $(field);
    if (!el || String(field || '').startsWith('__')) return fallback || '';
    if (field === 'frontHeight') return String(el.value || fallback || '').trim();
    const list = splitEditableList(el.value);
    return String(list[index] || list[0] || fallback || '').trim();
  }

  function smartText(key, fallback) {
    const lang = currentLanguage === 'en' ? 'en' : 'tr';
    return key && key[lang] ? key[lang] : fallback;
  }

  function dimensionMetaFromHit(hit) {
    return {
      dimId: hit.dataset.dimId || '',
      field: hit.dataset.editField || '',
      index: Math.max(0, Number(hit.dataset.editIndex || 0) || 0),
      label: hit.dataset.editLabel || 'Ölçü',
      value: hit.dataset.editValue || '',
      view: hit.dataset.view || '',
      zoneId: hit.dataset.zoneId || '',
      editable: hit.dataset.editable !== 'false',
      dimensionType: hit.dataset.dimensionType || 'main',
      actionType: hit.dataset.actionType || 'main_resize',
      canResize: hit.dataset.canResize === 'true',
      canAddSameProfile: hit.dataset.canAddSameProfile === 'true',
      canAddDifferentProfile: hit.dataset.canAddDifferentProfile === 'true',
      canPlaceProduct: hit.dataset.canPlaceProduct === 'true',
      canRemoveElement: hit.dataset.canRemoveElement === 'true',
      passiveReason: hit.dataset.passiveReason || '',
      profileInstanceId: hit.dataset.profileInstanceId || '',
      sideGapIndex: Math.max(0, Number(hit.dataset.sideGapIndex || 0) || 0),
      horizontalProfileId: hit.dataset.horizontalProfileId || '',
      horizontalAnchorProfileId: hit.dataset.horizontalAnchorProfileId || '',
      horizontalMoveFrom: hit.dataset.horizontalMoveFrom || '',
      horizontalClearHeight: Math.max(0, Number(hit.dataset.horizontalClearHeight || 0) || 0),
      sidePostId: hit.dataset.sidePostId || '',
      raySystemIndex: Math.max(0, Number(hit.dataset.raySystemIndex || 0) || 0),
      rayIntervalIndex: Math.max(0, Number(hit.dataset.rayIntervalIndex || 0) || 0),
      raySpanMode: hit.dataset.raySpanMode || '',
      parapetView: hit.dataset.parapetView || '',
      parapetSegmentId: hit.dataset.parapetSegmentId || '',
      parapetSegmentIndex: Math.max(0, Number(hit.dataset.parapetSegmentIndex || 0) || 0),
      segmentStart: Number(hit.dataset.segmentStart || 0) || 0,
      segmentEnd: Number(hit.dataset.segmentEnd || 0) || 0,
      sideIndex: Math.max(0, Number(hit.dataset.sideIndex || 0) || 0),
      sideViewKey: normalizeSideViewKey(hit.dataset.sideViewKey, Number(hit.dataset.sideIndex || 0) || 0),
      independentGroupId: hit.dataset.independentGroupId || hit.dataset.groupId || '',
      positionId: hit.dataset.positionId || '',
      viewId: hit.dataset.viewId || '',
      viewType: hit.dataset.viewType || '',
      side: hit.dataset.side || '',
      actionType: hit.dataset.sideActionType || hit.dataset.actionType || '',
      dimensionAxis: hit.dataset.dimensionAxis || '',
      previewDimKey: hit.dataset.previewDimKey || '',
      layer: hit.dataset.layer || ''
    };
  }

  function viewLabel(view) {
    const isEn = currentLanguage === 'en';
    const map = isEn
      ? { Top: 'Top View', Front: 'Front View', Side: 'Side View', Right: 'Right View' }
      : { Top: 'Üst Görünüş', Front: 'Ön Görünüş', Side: 'Yan Görünüş', Right: 'Sağ Görünüş' };
    return map[view] || view || (isEn ? 'Drawing' : 'Çizim');
  }

  function isFrontPostGapMeta(meta) {
    return !!meta && meta.view === 'Front' && /^front_post_gap_\d+$/i.test(String(meta.dimId || ''));
  }

  function isLeftSideSupportGapMeta(meta) {
    if (!meta || !['Side', 'Right'].includes(String(meta.view || ''))) return false;
    const id = String(meta.dimId || '');
    return String(meta.field || '') === '__zone__' && /^side_gap_/i.test(id) && Number.isFinite(Number(meta.sideGapIndex));
  }

  function currentSideSupportGeometry(meta) {
    const d = lastDrawing && lastDrawing.input ? lastDrawing.input : null;
    const key = sideViewKeyFromMeta(meta);
    const geom = key === 'right'
      ? (d && d.rightSideSupportGeometry)
      : (d && d.sideSupportGeometry ? d.sideSupportGeometry[key] : null);
    return geom && geom.exists ? geom : null;
  }

  function currentSideGap(meta) {
    const geom = currentSideSupportGeometry(meta);
    if (!geom || !Array.isArray(geom.gaps)) return null;
    const idx = Math.max(0, Number(meta && meta.sideGapIndex) || 0);
    return geom.gaps[idx] || null;
  }

  function materializeSidePosts(meta) {
    const key = sideViewKeyFromMeta(meta);
    const geom = currentSideSupportGeometry(meta);
    if (Object.prototype.hasOwnProperty.call(customSidePosts, key)) {
      const stored = Array.isArray(customSidePosts[key]) ? customSidePosts[key].map(item => ({ ...item, profile: sanitizeGlassTrackProfile(item.profile) })) : [];
      // Proje modeli boş listeyi de serileştirir. 5000 mm üzerindeki açıklıkta
      // geometri bu boşluğu zorunlu otomatik destekle tamamlar; düzenleyici de
      // ekranda görünen aynı dikmeyi malzeme haline getirmelidir.
      if (stored.length || !(geom && Array.isArray(geom.posts) && geom.posts.length)) return stored;
    }
    const posts = geom && Array.isArray(geom.posts) ? geom.posts.map((post, i) => ({
      id: String(post.id || `side_${key}_${i}`),
      centerX: Number(post.centerX),
      profile: sanitizeGlassTrackProfile(post.profile || { mode: 'standard', en: post.width || 100, boy: 100, et: 2 }),
      extension: Number.isFinite(Number(post.extension)) ? Number(post.extension) : 0
    })) : [];
    customSidePosts[key] = posts;
    return posts.map(item => ({ ...item, profile: { ...item.profile } }));
  }

  function storeSidePosts(meta, posts) {
    const key = sideViewKeyFromMeta(meta);
    customSidePosts[key] = posts.map(item => ({
      id: String(item.id || `side_${key}_${Date.now()}`),
      centerX: Number(item.centerX),
      profile: sanitizeGlassTrackProfile(item.profile),
      extension: Number.isFinite(Number(item.extension)) ? Number(item.extension) : 0
    })).sort((a, b) => a.centerX - b.centerX);
    if (customSidePosts[key].length) delete sideAutoSupportSuppressed[key];
    delete customSideSupportCenters[key];
  }

  function reindexSidePlacementsAfterInsert(sideIndex, gapIndex, sideViewKey = null) {
    const key = normalizeSideViewKey(sideViewKey, sideIndex);
    const shift = item => {
      if (normalizeSideViewKey(item.sideViewKey, item.sideIndex) !== key) return item;
      const idx = Number(item.sideGapIndex ?? 0);
      if (idx === gapIndex) return null;
      return { ...item, sideGapIndex: idx > gapIndex ? idx + 1 : idx, sideZone: `gap_${idx > gapIndex ? idx + 1 : idx}` };
    };
    sideSlidingPlacements = sideSlidingPlacements.map(shift).filter(Boolean);
    sideGuillotinePlacements = sideGuillotinePlacements.map(shift).filter(Boolean);
    sideZipScreenPlacements = sideZipScreenPlacements.map(shift).filter(Boolean);
  }

  function resizeLeftSideSupportGap(meta, targetGap) {
    const geom = currentSideSupportGeometry(meta);
    const gap = currentSideGap(meta);
    if (!geom || !gap || !Array.isArray(geom.posts) || !geom.posts.length) throw new Error(currentLanguage === 'en' ? 'No movable support post exists in this side view.' : 'Bu yan görünüşte hareket ettirilebilir destek dikmesi yok.');
    const target = Number(targetGap);
    if (!Number.isFinite(target) || target < 0) throw new Error(currentLanguage === 'en' ? 'Enter zero or a positive number.' : 'Sıfır veya pozitif bir sayı gir.');
    const posts = materializeSidePosts(meta);
    const gapIndex = Math.max(0, Math.min(posts.length, Number(meta.sideGapIndex) || 0));
    const movingIndex = gapIndex < posts.length ? gapIndex : posts.length - 1;
    const moving = posts[movingIndex];
    const width = Number(moving.profile && moving.profile.en) || 100;
    let nextCenter;
    if (gapIndex < posts.length) nextCenter = Number(gap.left) + target + width / 2;
    else nextCenter = Number(gap.right) - target - width / 2;
    const leftLimit = movingIndex === 0 ? Number(geom.wallX) : posts[movingIndex - 1].centerX + (Number(posts[movingIndex - 1].profile.en) || 100) / 2;
    const rightLimit = movingIndex === posts.length - 1 ? Number(geom.frontPostRearFace) : posts[movingIndex + 1].centerX - (Number(posts[movingIndex + 1].profile.en) || 100) / 2;
    if (nextCenter - width / 2 < leftLimit - 0.001 || nextCenter + width / 2 > rightLimit + 0.001) {
      throw new Error(currentLanguage === 'en' ? 'The support post would overlap another post, the wall or the front post.' : 'Destek dikmesi başka bir dikmeyle, duvarla veya ön dikmeyle üst üste gelir.');
    }
    moving.centerX = nextCenter;
    storeSidePosts(meta, posts);
  }

  function addSidePostToGap(meta, profile) {
    const geom = currentSideSupportGeometry(meta);
    const gap = currentSideGap(meta);
    if (!geom || !gap) throw new Error(currentLanguage === 'en' ? 'Side gap not found.' : 'Yan görünüş aralığı bulunamadı.');
    const nextProfile = sanitizeGlassTrackProfile(profile || { mode: 'standard', en: 100, boy: 100, et: 2 });
    const gapWidth = Number(gap.width) || (Number(gap.right) - Number(gap.left));
    if (gapWidth + 0.001 < nextProfile.en) throw new Error(currentLanguage === 'en' ? 'The selected gap is narrower than the profile.' : 'Seçilen aralık profil genişliğinden daha dar.');
    const posts = materializeSidePosts(meta);
    const supportLimit = applicationLimits().maxSideSupportsPerView;
    if (posts.length >= supportLimit) throw new Error(currentLanguage === 'en' ? `The side-support limit per view is ${supportLimit}.` : `Görünüş başına destek dikmesi sınırı ${supportLimit}.`);
    const gapIndex = Math.max(0, Number(meta.sideGapIndex) || 0);
    posts.push({ id: `side_${sideViewKeyFromMeta(meta)}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, centerX: (Number(gap.left) + Number(gap.right)) / 2, profile: nextProfile, extension: 0 });
    storeSidePosts(meta, posts);
    reindexSidePlacementsAfterInsert(Number(meta.index) || 0, gapIndex, sideViewKeyFromMeta(meta));
  }

  function deleteSidePost(sideIndex, postId, sideViewKey = null) {
    const meta = { index: Number(sideIndex) || 0, sideViewKey: normalizeSideViewKey(sideViewKey, sideIndex) };
    const key = sideViewKeyFromMeta(meta);
    const posts = materializeSidePosts(meta);
    const next = posts.filter(item => String(item.id) !== String(postId));
    if (next.length === posts.length) throw new Error(currentLanguage === 'en' ? 'Support post not found.' : 'Destek dikmesi bulunamadı.');
    storeSidePosts(meta, next);
    if (next.length === 0) sideAutoSupportSuppressed[key] = true;
    sideSlidingPlacements = sideSlidingPlacements.filter(item => normalizeSideViewKey(item.sideViewKey, item.sideIndex) !== key);
    sideGuillotinePlacements = sideGuillotinePlacements.filter(item => normalizeSideViewKey(item.sideViewKey, item.sideIndex) !== key);
    sideZipScreenPlacements = sideZipScreenPlacements.filter(item => normalizeSideViewKey(item.sideViewKey, item.sideIndex) !== key);
  }

  function segmentHeightFromList(list, coordinate, fallback = 0) {
    const x = Number(coordinate) || 0;
    const items = Array.isArray(list) ? list : [];
    const hit = items.find((item, index) => {
      const start = Number(item && item.start) || 0;
      const end = Number(item && item.end) || 0;
      return x >= start - 0.001 && (x < end - 0.001 || (index === items.length - 1 && x <= end + 0.001));
    });
    if (!hit) return Math.max(0, Number(fallback) || 0);
    const start = Number(hit.start) || 0;
    const end = Number(hit.end) || start;
    const h0 = Math.max(0, Number.isFinite(Number(hit.startHeight)) ? Number(hit.startHeight) : Number(hit.height) || 0);
    const h1 = Math.max(0, Number.isFinite(Number(hit.endHeight)) ? Number(hit.endHeight) : Number(hit.height) || 0);
    const ratio = end - start > 0.001 ? Math.max(0, Math.min(1, (x - start) / (end - start))) : 0;
    return h0 + (h1 - h0) * ratio;
  }

  function currentFrontParapetHeightAt(absoluteX) {
    const d = lastDrawing && lastDrawing.input ? lastDrawing.input : {};
    const list = d.parapetSegments && Array.isArray(d.parapetSegments.front) ? d.parapetSegments.front : [];
    return segmentHeightFromList(list, (Number(absoluteX) || 0) - Number(d.systemStartX || 300), Number(d.parapetHeight) || 0);
  }

  function currentSideParapetHeightAt(sideIndex, absoluteX, sideViewKey = null) {
    const d = lastDrawing && lastDrawing.input ? lastDrawing.input : null;
    const key = normalizeSideViewKey(sideViewKey, sideIndex);
    const geom = key === 'right' ? (d && d.rightSideSupportGeometry) : (d && d.sideSupportGeometry ? d.sideSupportGeometry[key] : null);
    const wallX = geom && Number.isFinite(Number(geom.wallX)) ? Number(geom.wallX) : 0;
    const list = parapetSegments && parapetSegments.side ? parapetSegments.side[key] : [];
    return segmentHeightFromList(list, Number(absoluteX) - wallX, Number(d && d.parapetHeight) || 0);
  }

  function currentSideGlassTrackClearHeight(localParapetHeight = 0, sideViewKey = '0', sideIndex = 0) {
    const d = lastDrawing && lastDrawing.input ? lastDrawing.input : {};
    const key = normalizeSideViewKey(sideViewKey, sideIndex);
    const trackActive = sideFeatureValue('glassTrack', key);
    const profile = sanitizeGlassTrackProfile(d.glassTrackProfile || glassTrackProfileState);
    // Cam kaydı o yan görünüşte gerçekten varsa üst referans profilin -Y dış
    // kenarıdır. O tarafta cam kaydı kapalıysa oluk altı / Ön H referansı kullanılır.
    const trackDrop = trackActive ? 3 + Number(profile.en || 0) : 0;
    return Math.max(1, Number(d.frontHeight || 0) - trackDrop - Math.max(0, Number(localParapetHeight) || 0));
  }

  function sideProductMeta(meta) {
    const geom = currentSideSupportGeometry(meta);
    const gap = currentSideGap(meta);
    if (!geom || !gap) return null;
    const gapIndex = Math.max(0, Number(meta.sideGapIndex) || 0);
    const zoneWidth = Number(gap.width) || Math.max(0, Number(gap.right) - Number(gap.left));
    const d = lastDrawing && lastDrawing.input ? lastDrawing.input : {};
    const sideViewKey = sideViewKeyFromMeta(meta);
    const localParapet = currentSideParapetHeightAt(Number(meta.index) || 0, (Number(gap.left) + Number(gap.right)) / 2, sideViewKey);
    // v8.9.32: Yan görünüşte yeni ürün eklenirken her iki yönde de 5 mm
    // montaj payı otomatik düşülür. Bu yalnız başlangıç/Alana Uydur değeridir;
    // kullanıcı detay ekranında genişlik ve yüksekliği sonradan manuel değiştirebilir.
    const placementHeight = Math.max(1, currentSideGlassTrackClearHeight(localParapet, sideViewKey, Number(meta.index) || 0) - 5);
    return {
      ...meta,
      placementView: sideViewKey === 'right' ? 'side-right' : 'side-left',
      sideViewKey,
      sideIndex: Number(meta.index) || 0,
      sideGapIndex: gapIndex,
      sideZone: `gap_${gapIndex}`,
      value: zoneWidth,
      placementWidth: Math.max(1, zoneWidth - 5),
      placementHeight
    };
  }

  function productRecordForMeta(meta) {
    if (!meta) return null;
    const isSide = ['side-left','side-right'].includes(String(meta.placementView || '')) || (['Side','Right'].includes(String(meta.view || '')) && isLeftSideSupportGapMeta(meta));
    if (isSide) {
      const sideIndex = Number(meta.sideIndex ?? meta.index) || 0;
      const sideViewKey = sideViewKeyFromMeta(meta);
      const sideGapIndex = Number(meta.sideGapIndex) || 0;
      const sideZone = String(meta.sideZone || `gap_${sideGapIndex}`);
      const sameView = item => normalizeSideViewKey(item.sideViewKey, item.sideIndex) === sideViewKey;
      const sliding = sideSlidingPlacements.find(item => sameView(item) && (String(item.sideZone || '') === sideZone || Number(item.sideGapIndex) === sideGapIndex));
      if (sliding) return { type: 'sliding_glass', placement: sliding, collection: 'sideSlidingPlacements', isSide: true };
      const guillotine = sideGuillotinePlacements.find(item => sameView(item) && (String(item.sideZone || '') === sideZone || Number(item.sideGapIndex) === sideGapIndex));
      if (guillotine) return { type: 'guillotine_glass', placement: guillotine, collection: 'sideGuillotinePlacements', isSide: true };
      const zipScreen = sideZipScreenPlacements.find(item => sameView(item) && (String(item.sideZone || '') === sideZone || Number(item.sideGapIndex) === sideGapIndex));
      if (zipScreen) return { type: 'zip_screen', placement: zipScreen, collection: 'sideZipScreenPlacements', isSide: true };
      return null;
    }
    const gapIndex = Number(meta.gapIndex ?? meta.index) || 0;
    const sliding = slidingPlacements.find(item => Number(item.gapIndex) === gapIndex);
    if (sliding) return { type: 'sliding_glass', placement: sliding, collection: 'slidingPlacements', isSide: false };
    const guillotine = guillotinePlacements.find(item => Number(item.gapIndex) === gapIndex);
    if (guillotine) return { type: 'guillotine_glass', placement: guillotine, collection: 'guillotinePlacements', isSide: false };
    const zipScreen = zipScreenPlacements.find(item => Number(item.gapIndex) === gapIndex);
    if (zipScreen) return { type: 'zip_screen', placement: zipScreen, collection: 'zipScreenPlacements', isSide: false };
    return null;
  }

  function findProductForMeta(meta) {
    return productRecordForMeta(meta);
  }

  function findProductByInteraction(meta) {
    if (!meta) return null;
    const id = String(meta.placementId || '');
    const all = [
      ['sliding_glass', 'slidingPlacements', slidingPlacements],
      ['sliding_glass', 'sideSlidingPlacements', sideSlidingPlacements],
      ['guillotine_glass', 'guillotinePlacements', guillotinePlacements],
      ['guillotine_glass', 'sideGuillotinePlacements', sideGuillotinePlacements],
      ['zip_screen', 'zipScreenPlacements', zipScreenPlacements],
      ['zip_screen', 'sideZipScreenPlacements', sideZipScreenPlacements]
    ];
    for (const [type, collection, items] of all) {
      const placement = items.find(item => String(item.id || '') === id);
      if (placement) return { type, collection, placement, isSide: collection.startsWith('side') };
    }
    return productRecordForMeta(meta);
  }

  function deleteProductRecord(record) {
    if (!record || !record.placement) return false;
    const id = String(record.placement.id || '');
    const remove = items => items.filter(item => id ? String(item.id || '') !== id : item !== record.placement);
    if (record.collection === 'slidingPlacements') slidingPlacements = remove(slidingPlacements);
    else if (record.collection === 'sideSlidingPlacements') sideSlidingPlacements = remove(sideSlidingPlacements);
    else if (record.collection === 'guillotinePlacements') guillotinePlacements = remove(guillotinePlacements);
    else if (record.collection === 'sideGuillotinePlacements') sideGuillotinePlacements = remove(sideGuillotinePlacements);
    else if (record.collection === 'zipScreenPlacements') zipScreenPlacements = remove(zipScreenPlacements);
    else if (record.collection === 'sideZipScreenPlacements') sideZipScreenPlacements = remove(sideZipScreenPlacements);
    else return false;
    return true;
  }

  function setRadioGroupValue(overlay, name, value, fallback) {
    let matched = false;
    overlay.querySelectorAll(`input[name="${name}"]`).forEach(el => {
      el.checked = String(el.value) === String(value);
      if (el.checked) matched = true;
    });
    if (!matched && fallback !== undefined) {
      overlay.querySelectorAll(`input[name="${name}"]`).forEach(el => { el.checked = String(el.value) === String(fallback); });
    }
  }

  function allocatePozNos(prefix, count) {
    const source = prefix === 'S'
      ? [...slidingPlacements, ...sideSlidingPlacements]
      : prefix === 'Z'
        ? [...zipScreenPlacements, ...sideZipScreenPlacements]
        : [...guillotinePlacements, ...sideGuillotinePlacements];
    const used = new Set(source.map(item => String(item.pozNo || '').toUpperCase()));
    const result = [];
    let n = 1;
    while (result.length < count) {
      const candidate = `${prefix}${String(n).padStart(2, '0')}`;
      if (!used.has(candidate)) { result.push(candidate); used.add(candidate); }
      n += 1;
    }
    return result;
  }

  function frontProductMeta(meta) {
    const d = lastDrawing && lastDrawing.input ? lastDrawing.input : {};
    const gapIndex = Number(meta.index) || 0;
    const clearWidth = Math.max(1, Number(meta.value) || 1);
    const centers = currentFrontPostCenters();
    const left = centers[gapIndex] != null ? centers[gapIndex] + frontPostWidthAt(gapIndex) / 2 : 0;
    const right = centers[gapIndex + 1] != null ? centers[gapIndex + 1] - frontPostWidthAt(gapIndex + 1) / 2 : left;
    const parapetH = currentFrontParapetHeightAt((left + right) / 2);
    return {
      ...meta,
      placementView: 'front',
      gapIndex,
      placementWidth: Math.max(1, Number(meta.placementWidth) || clearWidth - 5),
      placementHeight: Math.max(1, Number(meta.placementHeight) || (Number(d.frontHeight || 0) - parapetH - 5))
    };
  }

  function normalizedProductMeta(meta) {
    if (!meta) return null;
    if (['side-left','side-right'].includes(String(meta.placementView || '')) || isLeftSideSupportGapMeta(meta)) return sideProductMeta(meta);
    if (meta.placementView === 'front' || isFrontPostGapMeta(meta)) return frontProductMeta(meta);
    return null;
  }

  function interactionMetaToProductMeta(interactionMeta, record) {
    const placement = record && record.placement ? record.placement : {};
    if (['side-left','side-right'].includes(String(interactionMeta.placementView || '')) || record && record.isSide) {
      const sideIndex = Number(interactionMeta.sideIndex ?? placement.sideIndex) || 0;
      const sideViewKey = normalizeSideViewKey(interactionMeta.sideViewKey || placement.sideViewKey, sideIndex);
      const sideGapIndex = Number(interactionMeta.sideGapIndex ?? placement.sideGapIndex) || 0;
      const node = Array.from(preview.querySelectorAll(`.editable-dimension[data-side-gap-index="${sideGapIndex}"]`)).find(el => normalizeSideViewKey(el.dataset.sideViewKey, sideIndex) === sideViewKey && Number(el.dataset.editIndex || el.dataset.sideIndex || 0) === sideIndex);
      const fromDim = node ? sideProductMeta(dimensionMetaFromHit(node)) : null;
      return fromDim || {
        placementView: sideViewKey === 'right' ? 'side-right' : 'side-left', view: sideViewKey === 'right' ? 'Right' : 'Side', index: sideIndex, sideIndex, sideViewKey, sideGapIndex,
        sideZone: String(interactionMeta.sideZone || placement.sideZone || `gap_${sideGapIndex}`),
        value: Number(placement.width || 1) + 5, placementWidth: Number(placement.width || 1), placementHeight: Number(placement.height || 1)
      };
    }
    const gapIndex = Number(interactionMeta.gapIndex ?? placement.gapIndex) || 0;
    const node = preview.querySelector(`[data-dim-id="front_post_gap_${gapIndex + 1}"]`);
    const fromDim = node ? dimensionMetaFromHit(node) : null;
    return fromDim ? frontProductMeta(fromDim) : {
      placementView: 'front', view: 'Front', index: gapIndex, gapIndex,
      value: Number(placement.width || 1) + 5, placementWidth: Number(placement.width || 1), placementHeight: Number(placement.height || 1)
    };
  }

  function syncSideFeatureMenu(feature) {
    const prefix = feature === 'triangle' ? 'triangleJoinery' : 'glassTrack';
    const menu = $(`${prefix}SideMenu`);
    if (!menu) return;
    const left = menu.querySelector('[data-side-key="0"]');
    const right = menu.querySelector('[data-side-key="right"]');
    if (left) left.checked = sideFeatureValue(feature, '0');
    if (right) right.checked = sideFeatureValue(feature, 'right');
  }

  function normalizeGutterEditStateForApp(value) {
    const source = value && typeof value === 'object' ? value : {};
    const minusXDelta = Number(source.minusXDelta);
    const plusXDelta = Number(source.plusXDelta);
    const groups = source.groups && typeof source.groups === 'object'
      ? Object.fromEntries(Object.entries(source.groups).map(([key, item]) => {
          const group = item && typeof item === 'object' ? item : {};
          const minus = Number(group.minusXDelta), plus = Number(group.plusXDelta);
          return [String(key), { minusXDelta: Number.isFinite(minus) ? minus : 0, plusXDelta: Number.isFinite(plus) ? plus : 0 }];
        })) : {};
    return {
      minusXDelta: Number.isFinite(minusXDelta) ? minusXDelta : 0,
      plusXDelta: Number.isFinite(plusXDelta) ? plusXDelta : 0,
      groups
    };
  }

  function normalizeIndependentSideViewVisibilityForApp(value) {
    const source = value && typeof value === 'object' ? value : {};
    const out = {};
    Object.entries(source).forEach(([groupId, positions]) => {
      const group = {};
      Object.entries(positions && typeof positions === 'object' ? positions : {}).forEach(([positionId, raw]) => {
        const item = raw && typeof raw === 'object' ? raw : {};
        group[String(positionId)] = { leftSideVisible: item.leftSideVisible !== false, rightSideVisible: item.rightSideVisible !== false };
      });
      out[String(groupId)] = group;
    });
    return out;
  }

  function normalizeWaterOutletPipeStateForApp(value) {
    const source = value && typeof value === 'object' ? value : {};
    const diameter = Math.max(1, Number(source.diameter) || 70);
    const length = Math.max(1, Number(source.length) || 300);
    const offsets = source.offsets && typeof source.offsets === 'object'
      ? Object.fromEntries(Object.entries(source.offsets).map(([key, item]) => [String(key), Number(item)]).filter(([, item]) => Number.isFinite(item))) : {};
    const deleted = source.deleted && typeof source.deleted === 'object'
      ? Object.fromEntries(Object.entries(source.deleted).filter(([, item]) => item === true).map(([key]) => [String(key), true])) : {};
    return { diameter, length, offsets, deleted };
  }

  function normalizeUpperTableTransformForApp(value) {
    const source = value && typeof value === 'object' ? value : {};
    const x = Number(source.x), y = Number(source.y), scaleX = Number(source.scaleX), scaleY = Number(source.scaleY);
    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
      scaleX: Number.isFinite(scaleX) ? Math.max(0.35, Math.min(4, scaleX)) : 1,
      scaleY: Number.isFinite(scaleY) ? Math.max(0.35, Math.min(4, scaleY)) : 1
    };
  }

  function syncWaterOutletPlacementControl() {
    const wrap = $('waterOutletPlacementWrap');
    const select = $('waterOutletPlacement');
    if (!select) return;
    const enabled = normalizeYesNo($('waterStandard') && $('waterStandard').value) === 'HAYIR';
    if (wrap) wrap.hidden = !enabled;
    select.disabled = !enabled;
    if (!['FRONT', 'SIDES', 'BOTH'].includes(String(select.value || '').toUpperCase())) select.value = 'BOTH';
    const menuBtn = $('waterOutletPlacementMenuBtn');
    const menu = $('waterOutletPlacementMenu');
    if (menuBtn) {
      menuBtn.disabled = !enabled;
      menuBtn.setAttribute('aria-disabled', enabled ? 'false' : 'true');
      menuBtn.classList.toggle('is-disabled', !enabled);
      menuBtn.title = enabled
        ? (currentLanguage === 'en' ? 'Choose front/side water outlet placement.' : 'Su çıkışı borularının Ön / Yan yerleşimini seç.')
        : (currentLanguage === 'en' ? 'Enabled when Standard Water Outlet is NO.' : 'Su Çıkışı Standart mı? HAYIR olduğunda aktifleşir.');
    }
    if (!enabled && menu) menu.hidden = true;
    document.querySelectorAll('[data-water-outlet-placement]').forEach(input => {
      input.checked = String(input.value || '').toUpperCase() === String(select.value || '').toUpperCase();
      input.disabled = !enabled;
    });
  }

  function toggleWaterOutletPlacementMenu() {
    const menu = $('waterOutletPlacementMenu');
    const btn = $('waterOutletPlacementMenuBtn');
    if (!menu || !btn || btn.disabled) return;
    const open = menu.hidden;
    document.querySelectorAll('.side-feature-menu').forEach(node => { node.hidden = true; });
    menu.hidden = !open;
  }

  function applyWaterOutletPlacementQuick(input) {
    const select = $('waterOutletPlacement');
    if (!select || !input) return;
    const value = String(input.value || '').toUpperCase();
    if (!['FRONT', 'SIDES', 'BOTH'].includes(value)) return;
    select.value = value;
    syncWaterOutletPlacementControl();
    const menu = $('waterOutletPlacementMenu');
    if (menu) menu.hidden = true;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function syncToolboxBooleanButtons() {
    ensureSideFeatureStateInitialized();
    const text = UI_TEXT[currentLanguage] || UI_TEXT.tr;
    const labels = { glassTrack: text.options_glassTrack, triangleJoinery: text.extra_triangleJoinery, waterStandard: text.extra_waterStandard };
    document.querySelectorAll('[data-boolean-field]').forEach(btn => {
      const field = btn.dataset.booleanField;
      const labelEl = btn.querySelector('.boolean-quick-label');
      const stateEl = btn.querySelector('.boolean-quick-state');
      if (labelEl) labelEl.textContent = labels[field] || field;
      if (field === 'glassTrack' || field === 'triangleJoinery') {
        const feature = field === 'triangleJoinery' ? 'triangle' : 'glassTrack';
        const left = sideFeatureValue(feature, '0'), right = sideFeatureValue(feature, 'right');
        const value = left && right ? 'EVET' : (!left && !right ? 'HAYIR' : 'KISMİ');
        if (stateEl) stateEl.textContent = value === 'KISMİ' ? (currentLanguage === 'en' ? 'PARTIAL' : 'KISMİ') : BOOLEAN_CANONICAL[value][currentLanguage];
        btn.classList.toggle('is-yes', value === 'EVET');
        btn.classList.toggle('is-no', value === 'HAYIR');
        btn.classList.toggle('is-partial', value === 'KISMİ');
        btn.setAttribute('aria-pressed', value === 'EVET' ? 'true' : 'mixed');
        syncSideFeatureMenu(feature);
        return;
      }
      const select = $(field);
      if (!select) return;
      const value = normalizeYesNo(select.value) === 'EVET' ? 'EVET' : 'HAYIR';
      if (stateEl) stateEl.textContent = BOOLEAN_CANONICAL[value][currentLanguage];
      btn.classList.toggle('is-yes', value === 'EVET');
      btn.classList.toggle('is-no', value !== 'EVET');
      btn.setAttribute('aria-pressed', value === 'EVET' ? 'true' : 'false');
    });
  }

  function toggleToolboxBoolean(field) {
    if (field === 'glassTrack' || field === 'triangleJoinery') {
      const feature = field === 'triangleJoinery' ? 'triangle' : 'glassTrack';
      const allOn = sideFeatureValue(feature, '0') && sideFeatureValue(feature, 'right');
      setSideFeatureValue(feature, '0', !allOn);
      setSideFeatureValue(feature, 'right', !allOn);
      syncMainFormFromSideFeature(feature);
      syncToolboxBooleanButtons();
      updatePreview(false);
      return;
    }
    const select = $(field);
    if (!select) return;
    select.value = normalizeYesNo(select.value) === 'EVET' ? 'HAYIR' : 'EVET';
    syncToolboxBooleanButtons();
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function toggleSideFeatureMenu(field) {
    const menu = $(`${field}SideMenu`);
    if (!menu) return;
    const next = menu.hidden;
    document.querySelectorAll('.side-feature-menu').forEach(node => { node.hidden = true; });
    menu.hidden = !next;
  }

  function applySideFeatureCheckbox(input) {
    const field = input.dataset.sideFeatureField;
    const feature = field === 'triangleJoinery' ? 'triangle' : 'glassTrack';
    setSideFeatureValue(feature, input.dataset.sideKey, input.checked);
    syncMainFormFromSideFeature(feature);
    syncToolboxBooleanButtons();
    updatePreview(false);
  }

  function toolboxSelectionKey(type, meta) {
    if (type === 'product') {
      const id = String(meta.placementId || '').trim();
      if (id) return `product:${id}`;
      const view = String(meta.placementView || 'front');
      const zone = ['side-left','side-right'].includes(view)
        ? `${sideViewKeyFromMeta(meta)}:${String(meta.sideZone || `gap_${Number(meta.sideGapIndex) || 0}`)}`
        : String(Number(meta.gapIndex) || 0);
      return `product:${String(meta.productType || 'product')}:${view}:${zone}`;
    }
    return `dimension:${String(meta.dimId || '')}`;
  }

  function isProductSelectionMode(mode) {
    return ['multi-delete', 'convert-product', 'fit-products'].includes(String(mode || ''));
  }

  function isProfileSelectionMode(mode) { return String(mode || '') === 'bulk-extend'; }

  function isEligibleToolboxDimension(meta, mode) {
    if (!meta) return false;
    if (mode === 'multi-product') {
      const productMeta = normalizedProductMeta(meta);
      return !!productMeta && !!meta.canPlaceProduct && !productRecordForMeta(productMeta);
    }
    if (mode === 'multi-dimension') {
      if (!meta.editable || !meta.canResize) return false;
      if (isFrontPostGapMeta(meta)) {
        const count = lastDrawing && lastDrawing.input ? Number(lastDrawing.input.postCount) || 0 : 0;
        return count > 2;
      }
      return true;
    }
    if (mode === 'equalize-gaps') {
      const count = lastDrawing && lastDrawing.input ? Number(lastDrawing.input.postCount) || 0 : 0;
      if (count > 2 && isFrontPostGapMeta(meta)) return true;
      if (isLeftSideSupportGapMeta(meta)) {
        const geom = currentSideSupportGeometry(meta);
        return !!geom && Array.isArray(geom.posts) && geom.posts.length > 0;
      }
      return false;
    }
    return false;
  }

  function createToolboxMarker(hit, selected) {
    const ns = 'http://www.w3.org/2000/svg';
    const host = hit.closest('g') || hit.parentNode;
    if (!host || !host.appendChild) return;
    const isDimension = host.classList && (host.classList.contains('editable-dimension') || host.classList.contains('preview-dimension-plain'));
    let x = Number(hit.getAttribute('x') || 0);
    let y = Number(hit.getAttribute('y') || 0);
    let w = Math.max(1, Number(hit.getAttribute('width') || 0));
    let h = Math.max(1, Number(hit.getAttribute('height') || 0));
    if ((!Number.isFinite(w) || w <= 1) && hit.getBBox) {
      try { const box = hit.getBBox(); x = box.x; y = box.y; w = Math.max(1, box.width); h = Math.max(1, box.height); } catch (_) {}
    }
    const size = Math.max(88, Math.min(150, Math.max(88, Math.min(Math.max(w, 88), Math.max(h, 88)) * 0.22)));
    let markerX = x + (w - size) / 2;
    let markerY = y + (h - size) / 2;

    // Bütün ölçü seçim kutuları, ölçü yazısının ekran üzerindeki üst orta noktasına yerleşir.
    if (isDimension) {
      const textNode = host.querySelector('text');
      if (textNode) {
        let placed = false;
        try {
          const rect = textNode.getBoundingClientRect();
          const ctm = host.getScreenCTM && host.getScreenCTM();
          const svg = host.ownerSVGElement;
          if (rect && ctm && svg && typeof DOMPoint === 'function') {
            const screenPoint = new DOMPoint(rect.left + rect.width / 2, rect.top - 6);
            const localPoint = screenPoint.matrixTransform(ctm.inverse());
            markerX = localPoint.x - size / 2;
            markerY = localPoint.y - size;
            placed = true;
          }
        } catch (_) {}
        if (!placed) {
          const textX = Number(textNode.getAttribute('x'));
          const textY = Number(textNode.getAttribute('y'));
          if (Number.isFinite(textX) && Number.isFinite(textY)) {
            markerX = textX - size / 2;
            markerY = textY - size - 18;
          }
        }
      }
    }

    const marker = document.createElementNS(ns, 'g');
    marker.setAttribute('class', `toolbox-selection-marker${selected ? ' is-selected' : ''}`);
    marker.setAttribute('pointer-events', 'all');
    marker.setAttribute('role', 'checkbox');
    marker.setAttribute('aria-checked', selected ? 'true' : 'false');
    marker.setAttribute('tabindex', '0');
    // Kutunun kendisi de seçim hedefidir. Kaynak hit öğesi, ürün ve ölçü
    // seçimlerinde aynı çözümleyici üzerinden kullanılabilsin diye saklanır.
    marker.__toolboxSelectionSource = hit;
    // İşaretleyici doğrudan seçim hedefidir. SVG üst üste binme/çizim sırası
    // nedeniyle alttaki profil hit alanına güvenmeden olayı burada tamamla.
    marker.addEventListener('pointerdown', evt => {
      // Pan/drag dinleyicisinin touch veya mouse pointerdown olayını seçim
      // kutusundan devralmasını önle; click olayı tek toggle yapmaya devam eder.
      evt.stopPropagation();
    });
    marker.addEventListener('click', evt => {
      evt.preventDefault();
      evt.stopPropagation();
      toggleToolboxSelectionFromHit(marker);
    });
    const rect = document.createElementNS(ns, 'rect');
    rect.setAttribute('x', String(markerX)); rect.setAttribute('y', String(markerY));
    rect.setAttribute('width', String(size)); rect.setAttribute('height', String(size));
    rect.setAttribute('rx', String(size * 0.16)); rect.setAttribute('ry', String(size * 0.16));
    const check = document.createElementNS(ns, 'path');
    check.setAttribute('d', `M ${markerX + size * 0.24} ${markerY + size * 0.56} L ${markerX + size * 0.45} ${markerY + size * 0.78} L ${markerX + size * 0.82} ${markerY + size * 0.28}`);
    marker.append(rect, check);
    host.appendChild(marker);
  }

  function toolboxSelectionFilterLabel(mode) {
    const labels = {
      'multi-product': currentLanguage === 'en' ? 'Product placement dimensions' : 'Ürün yerleştirme ölçüleri',
      'multi-dimension': currentLanguage === 'en' ? 'Resizable dimensions' : 'Düzenlenebilir ölçüler',
      'equalize-gaps': currentLanguage === 'en' ? 'Front / side post gaps' : 'Ön / yan dikme aralıkları',
      'convert-product': currentLanguage === 'en' ? 'Existing products' : 'Mevcut ürünler',
      'fit-products': currentLanguage === 'en' ? 'Existing products' : 'Mevcut ürünler',
      'multi-delete': currentLanguage === 'en' ? 'Existing products' : 'Mevcut ürünler',
      'bulk-extend': currentLanguage === 'en' ? 'Extendable profiles' : 'Uzatılabilir profiller'
    };
    return labels[mode] || '';
  }

  function clearToolboxElementFilter() {
    preview.querySelectorAll('.toolbox-filtered-out').forEach(node => node.classList.remove('toolbox-filtered-out'));
  }

  function toolboxProfileSelectionKey(meta) {
    const item = meta || {};
    if (['postEditor', 'frontPostProfileEditor'].includes(item.interactionType)) {
      return `profile:frontPost:${Math.max(0, Number(item.postIndex) || 0)}`;
    }
    return `profile:${item.interactionType}:${item.sideViewKey}:${item.sidePostId || item.postIndex || item.profilePart}`;
  }


  function isEditableKeyboardTarget(target) {
    const node = target && target.nodeType === 1 ? target : document.activeElement;
    const tag = node && node.tagName ? node.tagName.toLowerCase() : '';
    return !!(node && (node.isContentEditable || ['input', 'textarea', 'select'].includes(tag)));
  }

  function bulkProfileSelectionGroupKey(descriptor) {
    if (!descriptor) return '';
    return [descriptor.productType, descriptor.entityType, descriptor.profileFamily, descriptor.structuralRole, descriptor.editorType].join('|');
  }

  function frontPostProfileDescriptor(index) {
    const idx = Math.max(0, Number(index) || 0);
    const centers = currentFrontPostCenters();
    const count = centers.length || Math.max(0, Number(lastDrawing && lastDrawing.input && lastDrawing.input.postCount) || 0);
    if (idx >= count) return null;
    const profile = frontPostProfiles[idx]
      ? sanitizeGlassTrackProfile(frontPostProfiles[idx])
      : sanitizeGlassTrackProfile({ mode: 'standard', en: 100, boy: 100, et: 2 });
    return {
      physicalProfileId: toolboxProfileSelectionKey({ interactionType: 'postEditor', postIndex: idx }),
      postIndex: idx,
      productType: 'PERGORISE',
      entityType: 'POST',
      profileFamily: 'PERGOLA_FRONT_POST',
      structuralRole: 'FRONT_POST',
      editorType: 'FRONT_POST_PROFILE_EDITOR',
      editable: true,
      generationSource: Array.isArray(customFrontPostCenters) ? 'manual' : 'automatic',
      profile: { mode: profile.mode || 'standard', en: Number(profile.en) || 100, boy: Number(profile.boy) || 100, et: Number(profile.et) || 2, rotation: 0, material: 'ALUMINUM' }
    };
  }

  function bulkProfileDescriptorFromHit(target) {
    const hit = target && target.closest
      ? target.closest('[data-interaction-type="postEditor"],[data-interaction-type="frontPostProfileEditor"],[data-interaction-type="horizontalProfileEditor"]')
      : null;
    if (!hit) return null;
    const meta = previewInteractionMetaFromHit(hit);
    if (!['postEditor', 'frontPostProfileEditor'].includes(meta.interactionType)) return null;
    return frontPostProfileDescriptor(meta.postIndex);
  }

  function bulkProfileExactSignature(descriptor) {
    const p = descriptor && descriptor.profile ? descriptor.profile : {};
    const n = value => Number(Number(value || 0).toFixed(6));
    return [bulkProfileSelectionGroupKey(descriptor), p.mode || '', n(p.en), n(p.boy), n(p.et), n(p.rotation), p.material || ''].join('|');
  }

  function allEligiblePhysicalProfileDescriptors() {
    const count = currentFrontPostCenters().length || Math.max(0, Number(lastDrawing && lastDrawing.input && lastDrawing.input.postCount) || 0);
    return Array.from({ length: count }, (_, index) => frontPostProfileDescriptor(index)).filter(Boolean);
  }

  function ensureBulkProfileSelectionBanner() {
    if (bulkProfileSelectionBanner) return bulkProfileSelectionBanner;
    bulkProfileSelectionBanner = document.createElement('div');
    bulkProfileSelectionBanner.className = 'bulk-profile-selection-banner';
    bulkProfileSelectionBanner.hidden = true;
    bulkProfileSelectionBanner.setAttribute('aria-live', 'polite');
    previewPanel.appendChild(bulkProfileSelectionBanner);
    return bulkProfileSelectionBanner;
  }

  function refreshBulkProfileSelectionDecorations() {
    preview.querySelectorAll('.bulk-profile-selected').forEach(node => node.classList.remove('bulk-profile-selected'));
    const banner = ensureBulkProfileSelectionBanner();
    const show = isLargePreviewMode() && bulkProfileSelectionState.selected.size > 0;
    if (show) {
      preview.querySelectorAll('[data-interaction-type="postEditor"],[data-interaction-type="frontPostProfileEditor"],[data-interaction-type="horizontalProfileEditor"]').forEach(hit => {
        const descriptor = bulkProfileDescriptorFromHit(hit);
        if (!descriptor || !bulkProfileSelectionState.selected.has(descriptor.physicalProfileId)) return;
        hit.classList.add('bulk-profile-selected');
        const host = hit.closest('g');
        if (host) host.classList.add('bulk-profile-selected');
      });
      const count = bulkProfileSelectionState.selected.size;
      banner.textContent = currentLanguage === 'en' ? `${count} physical profile(s) selected` : `${count} fiziksel profil seçildi`;
    }
    banner.hidden = !show;
  }

  function clearBulkProfileSelection(options = {}) {
    if (bulkProfileSelectionState.pendingOpenTimer) {
      window.clearTimeout(bulkProfileSelectionState.pendingOpenTimer);
      bulkProfileSelectionState.pendingOpenTimer = 0;
    }
    bulkProfileSelectionState.generation += 1;
    bulkProfileSelectionState.selected = new Map();
    bulkProfileSelectionState.groupKey = null;
    bulkProfileSelectionState.active = false;
    bulkProfileSelectionState.opening = false;
    bulkProfileSelectionState.ctrlDown = false;
    bulkProfileSelectionState.shiftDown = false;
    if (!options.keepEditor) bulkProfileSelectionState.editorOpen = false;
    refreshBulkProfileSelectionDecorations();
  }

  function cancelBulkProfileSelection(message = '') {
    const overlay = $('frontPostProfileOverlay');
    if (overlay && overlay.dataset.bulkMode === 'true') {
      overlay.hidden = true;
      overlay.dataset.bulkMode = 'false';
      overlay._bulkProfileIds = [];
    }
    clearBulkProfileSelection();
    if (message) statusText.textContent = message;
    focusPreviewCanvas();
  }

  function selectAllMatchingBulkProfiles(reference) {
    const signature = bulkProfileExactSignature(reference);
    bulkProfileSelectionState.selected = new Map();
    allEligiblePhysicalProfileDescriptors().forEach(descriptor => {
      if (bulkProfileExactSignature(descriptor) === signature) bulkProfileSelectionState.selected.set(descriptor.physicalProfileId, descriptor);
    });
    bulkProfileSelectionState.groupKey = bulkProfileSelectionGroupKey(reference);
  }

  function handleBulkProfileSelectionClick(evt) {
    if (!isLargePreviewMode() || toolboxSelectionMode || evt.altKey || !(evt.ctrlKey || evt.metaKey)) return false;
    bulkProfileSelectionState.active = true;
    bulkProfileSelectionState.ctrlDown = true;
    bulkProfileSelectionState.shiftDown = !!evt.shiftKey;
    const descriptor = bulkProfileDescriptorFromHit(evt.target);
    evt.preventDefault();
    evt.stopPropagation();
    if (!descriptor) {
      statusText.textContent = currentLanguage === 'en' ? 'Only compatible physical profiles can be selected together.' : 'Yalnızca aynı türdeki fiziksel profiller birlikte seçilebilir.';
      return true;
    }
    const groupKey = bulkProfileSelectionGroupKey(descriptor);
    if (bulkProfileSelectionState.groupKey && bulkProfileSelectionState.groupKey !== groupKey) {
      statusText.textContent = currentLanguage === 'en' ? 'Only profiles using the same editor can be selected together.' : 'Yalnızca aynı düzenleme ekranını kullanan profiller birlikte seçilebilir.';
      return true;
    }
    if (evt.shiftKey) {
      selectAllMatchingBulkProfiles(descriptor);
    } else {
      bulkProfileSelectionState.groupKey = groupKey;
      if (bulkProfileSelectionState.selected.has(descriptor.physicalProfileId)) bulkProfileSelectionState.selected.delete(descriptor.physicalProfileId);
      else bulkProfileSelectionState.selected.set(descriptor.physicalProfileId, descriptor);
      if (!bulkProfileSelectionState.selected.size) bulkProfileSelectionState.groupKey = null;
    }
    refreshBulkProfileSelectionDecorations();
    const count = bulkProfileSelectionState.selected.size;
    statusText.textContent = count
      ? (currentLanguage === 'en' ? `${count} profile(s) selected. Release Ctrl${evt.shiftKey ? ' and Shift' : ''} to edit.` : `${count} profil seçildi. Düzenlemek için Ctrl${evt.shiftKey ? ' ve Shift' : ''} tuşunu bırakın.`)
      : (currentLanguage === 'en' ? 'Bulk profile selection is empty.' : 'Toplu profil seçimi boş.');
    return true;
  }

  function scheduleBulkProfileEditorOpen() {
    if (!bulkProfileSelectionState.active || bulkProfileSelectionState.ctrlDown || bulkProfileSelectionState.shiftDown) return;
    if (!bulkProfileSelectionState.selected.size) {
      clearBulkProfileSelection();
      return;
    }
    if (bulkProfileSelectionState.opening || bulkProfileSelectionState.editorOpen) return;
    bulkProfileSelectionState.opening = true;
    const generation = ++bulkProfileSelectionState.generation;
    bulkProfileSelectionState.pendingOpenTimer = window.setTimeout(() => {
      bulkProfileSelectionState.pendingOpenTimer = 0;
      if (generation !== bulkProfileSelectionState.generation || !bulkProfileSelectionState.active || !bulkProfileSelectionState.selected.size) return;
      bulkProfileSelectionState.opening = false;
      bulkProfileSelectionState.editorOpen = true;
      showBulkFrontPostProfileOverlay(Array.from(bulkProfileSelectionState.selected.values()));
    }, 0);
  }

  function bindBulkProfileKeyboardInteractions() {
    document.addEventListener('keydown', evt => {
      if (evt.key === 'Escape' && (bulkProfileSelectionState.active || bulkProfileSelectionState.editorOpen || bulkProfileSelectionState.opening)) {
        evt.preventDefault();
        evt.stopPropagation();
        cancelBulkProfileSelection(currentLanguage === 'en' ? 'Bulk profile selection cancelled.' : 'Toplu profil seçimi iptal edildi.');
        return;
      }
      if (!isLargePreviewMode() || toolboxSelectionMode || evt.altKey || isEditableKeyboardTarget(evt.target)) return;
      if (evt.key === 'Control' || evt.key === 'Meta') bulkProfileSelectionState.ctrlDown = true;
      if (evt.key === 'Shift' && (bulkProfileSelectionState.ctrlDown || bulkProfileSelectionState.active)) bulkProfileSelectionState.shiftDown = true;
    }, true);
    document.addEventListener('keyup', evt => {
      if (evt.key === 'Control' || evt.key === 'Meta') bulkProfileSelectionState.ctrlDown = false;
      if (evt.key === 'Shift') bulkProfileSelectionState.shiftDown = false;
      if (bulkProfileSelectionState.active) scheduleBulkProfileEditorOpen();
    }, true);
    window.addEventListener('blur', () => {
      if (bulkProfileSelectionState.active || bulkProfileSelectionState.opening) cancelBulkProfileSelection();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && (bulkProfileSelectionState.active || bulkProfileSelectionState.opening)) cancelBulkProfileSelection();
    });
  }

  function refreshToolboxSelectionDecorations() {
    preview.querySelectorAll('.toolbox-selection-marker').forEach(node => node.remove());
    preview.querySelectorAll('.toolbox-selectable,.toolbox-selected').forEach(node => node.classList.remove('toolbox-selectable', 'toolbox-selected'));
    clearToolboxElementFilter();
    preview.classList.toggle('toolbox-selection-active', !!toolboxSelectionMode);
    updateToolboxSelectionBanner();
    ['multiProductBtn','multiDimensionBtn','equalizeGapsBtn','convertProductBtn','fitProductsBtn','multiDeleteBtn','bulkExtendBtn'].forEach(id => {
      const btn = $(id); if (btn) btn.classList.toggle('is-active-command',
        (id === 'multiProductBtn' && toolboxSelectionMode === 'multi-product') ||
        (id === 'multiDimensionBtn' && toolboxSelectionMode === 'multi-dimension') ||
        (id === 'equalizeGapsBtn' && toolboxSelectionMode === 'equalize-gaps') ||
        (id === 'convertProductBtn' && toolboxSelectionMode === 'convert-product') ||
        (id === 'fitProductsBtn' && toolboxSelectionMode === 'fit-products') ||
        (id === 'multiDeleteBtn' && toolboxSelectionMode === 'multi-delete') ||
        (id === 'bulkExtendBtn' && toolboxSelectionMode === 'bulk-extend'));
    });
    if (!toolboxSelectionMode) { applyPreviewDimensionFilter(); return; }
    const dimensionGroups = Array.from(preview.querySelectorAll('.editable-dimension,.preview-dimension-plain'));
    const interactionGroups = Array.from(preview.querySelectorAll('[data-interaction-type]')).map(hit => hit.closest('g') || hit);
    dimensionGroups.forEach(group => group.classList.add('toolbox-filtered-out'));
    interactionGroups.forEach(group => group.classList.add('toolbox-filtered-out'));
    if (isProfileSelectionMode(toolboxSelectionMode)) {
      preview.querySelectorAll('[data-interaction-type="glassTrackEditor"],[data-interaction-type="postEditor"],[data-interaction-type="frontPostProfileEditor"],[data-interaction-type="horizontalProfileEditor"]').forEach(hit => {
        const meta=previewInteractionMetaFromHit(hit);
        if(meta.interactionType==='glassTrackEditor' && meta.profilePart==='support' && !meta.sidePostId) return;
        const host=hit.closest('g')||hit;host.classList.remove('toolbox-filtered-out');
        const key=toolboxProfileSelectionKey(meta);
        hit.dataset.toolboxProfileKey=key;hit.classList.add('toolbox-selectable');if(toolboxSelectionItems.has(key))hit.classList.add('toolbox-selected');createToolboxMarker(hit,toolboxSelectionItems.has(key));
      });
      return;
    }
    if (isProductSelectionMode(toolboxSelectionMode)) {
      preview.querySelectorAll('[data-interaction-type="productEditor"]').forEach(hit => {
        const host = hit.closest('g') || hit; host.classList.remove('toolbox-filtered-out');
        const meta = previewInteractionMetaFromHit(hit), key = toolboxSelectionKey('product', meta);
        hit.classList.add('toolbox-selectable'); if (toolboxSelectionItems.has(key)) hit.classList.add('toolbox-selected');
        createToolboxMarker(hit, toolboxSelectionItems.has(key));
      });
      return;
    }
    preview.querySelectorAll('.editable-dimension').forEach(group => {
      const meta = dimensionMetaFromHit(group);
      if (!isEligibleToolboxDimension(meta, toolboxSelectionMode)) return;
      group.classList.remove('toolbox-filtered-out'); group.style.display = '';
      const key = toolboxSelectionKey('dimension', meta), hit = group.querySelector('.editable-dimension-hit') || group;
      group.classList.add('toolbox-selectable'); if (toolboxSelectionItems.has(key)) group.classList.add('toolbox-selected');
      createToolboxMarker(hit, toolboxSelectionItems.has(key));
    });
  }

  function selectionMetaFromTarget(target) {
    if (!toolboxSelectionMode || !target || !target.closest) return null;
    const marker = target.closest('.toolbox-selection-marker');
    if (marker && marker.__toolboxSelectionSource) target = marker.__toolboxSelectionSource;
    if (isProfileSelectionMode(toolboxSelectionMode)) {
      const hit=target.closest('[data-interaction-type="glassTrackEditor"],[data-interaction-type="postEditor"],[data-interaction-type="frontPostProfileEditor"],[data-interaction-type="horizontalProfileEditor"]');
      if(!hit)return null;
      const meta=previewInteractionMetaFromHit(hit); const key=hit.dataset.toolboxProfileKey||toolboxProfileSelectionKey(meta);
      return { type:'profile', key, meta };
    }
    if (isProductSelectionMode(toolboxSelectionMode)) {
      const hit = target.closest('[data-interaction-type="productEditor"]');
      if (!hit) return null;
      const meta = previewInteractionMetaFromHit(hit);
      return { type: 'product', meta, key: toolboxSelectionKey('product', meta) };
    }
    const group = target.closest('.editable-dimension');
    if (!group) return null;
    const meta = dimensionMetaFromHit(group);
    if (!isEligibleToolboxDimension(meta, toolboxSelectionMode)) return null;
    return { type: 'dimension', meta, key: toolboxSelectionKey('dimension', meta) };
  }

  function toggleToolboxSelectionFromHit(target) {
    const candidate = selectionMetaFromTarget(target);
    if (!candidate) return;
    if (toolboxSelectionItems.has(candidate.key)) toolboxSelectionItems.delete(candidate.key);
    else toolboxSelectionItems.set(candidate.key, candidate.meta);
    refreshToolboxSelectionDecorations();
    const count = toolboxSelectionItems.size;
    statusText.textContent = currentLanguage === 'en' ? `${count} item(s) selected. Press Enter or right-click to finish.` : `${count} öğe seçildi. Bitirmek için Enter'a bas veya sağ tıkla.`;
  }

  function hideToolboxContextMenu() {
    if (toolboxContextMenu) toolboxContextMenu.hidden = true;
  }

  function ensureToolboxSelectionBanner() {
    if (toolboxSelectionBanner) return toolboxSelectionBanner;
    toolboxSelectionBanner = document.createElement('div');
    toolboxSelectionBanner.className = 'toolbox-selection-banner';
    toolboxSelectionBanner.hidden = true;
    toolboxSelectionBanner.innerHTML = `<span class="toolbox-selection-banner-text"></span><span class="toolbox-selection-banner-actions"><button type="button" data-action="finish">Tamam / Enter</button><button type="button" data-action="cancel">İptal / Esc</button></span>`;
    const host = previewPanel.querySelector('.preview-workspace') || previewPanel;
    host.appendChild(toolboxSelectionBanner);
    toolboxSelectionBanner.addEventListener('click', evt => {
      const action = evt.target && evt.target.dataset ? evt.target.dataset.action : '';
      if (action === 'finish') finishToolboxSelection();
      else if (action === 'cancel') cancelToolboxSelection(currentLanguage === 'en' ? 'Selection cancelled.' : 'Seçim iptal edildi.');
    });
    return toolboxSelectionBanner;
  }

  function updateToolboxSelectionBanner() {
    const banner = ensureToolboxSelectionBanner();
    if (!toolboxSelectionMode) { banner.hidden = true; return; }
    const count = toolboxSelectionItems.size;
    const modeText = {
      'multi-product': currentLanguage === 'en' ? 'Select product placement dimensions.' : 'Ürün eklenecek ölçüleri seç.',
      'multi-dimension': currentLanguage === 'en' ? 'Select dimensions to edit.' : 'Düzenlenecek ölçüleri seç.',
      'equalize-gaps': currentLanguage === 'en' ? 'Select front or left-side post gaps to equalize.' : 'Eşitlenecek ön veya sol yan dikme aralıklarını seç.',
      'convert-product': currentLanguage === 'en' ? 'Select one or more products whose type will be changed.' : 'Tipi değiştirilecek bir veya daha fazla ürün seç.',
      'fit-products': currentLanguage === 'en' ? 'Select products to fit to their openings.' : 'Alana uydurulacak ürünleri seç.',
      'multi-delete': currentLanguage === 'en' ? 'Select products to delete.' : 'Silinecek ürünleri seç.',
      'bulk-extend': currentLanguage === 'en' ? 'Select profiles to extend or shorten.' : 'Uzatılacak veya kısaltılacak profilleri seç.'
    }[toolboxSelectionMode] || '';
    const countText = currentLanguage === 'en' ? `${count} selected` : `${count} seçili`;
    const filterText = toolboxSelectionFilterLabel(toolboxSelectionMode);
    banner.querySelector('.toolbox-selection-banner-text').textContent = `${modeText} ${countText}${filterText ? ` · ${currentLanguage === 'en' ? 'Filter' : 'Filtre'}: ${filterText}` : ''}`;
    const buttons = banner.querySelectorAll('button');
    if (buttons[0]) buttons[0].textContent = currentLanguage === 'en' ? 'Finish / Enter' : 'Tamam / Enter';
    if (buttons[1]) buttons[1].textContent = currentLanguage === 'en' ? 'Cancel / Esc' : 'İptal / Esc';
    banner.hidden = false;
  }

  function ensureToolboxContextMenu() {
    if (toolboxContextMenu) return toolboxContextMenu;
    toolboxContextMenu = document.createElement('div');
    toolboxContextMenu.className = 'toolbox-context-menu';
    toolboxContextMenu.hidden = true;
    toolboxContextMenu.innerHTML = `<button type="button" data-action="finish">Tamam / Enter</button><button type="button" data-action="cancel">İptal / Escape</button>`;
    document.body.appendChild(toolboxContextMenu);
    toolboxContextMenu.addEventListener('click', evt => {
      const action = evt.target && evt.target.dataset ? evt.target.dataset.action : '';
      if (action === 'finish') finishToolboxSelection();
      else if (action === 'cancel') cancelToolboxSelection();
    });
    document.addEventListener('mousedown', evt => { if (toolboxContextMenu && !toolboxContextMenu.contains(evt.target)) hideToolboxContextMenu(); });
    return toolboxContextMenu;
  }

  function showToolboxContextMenu(x, y) {
    const menu = ensureToolboxContextMenu();
    const buttons = menu.querySelectorAll('button');
    if (buttons[0]) buttons[0].textContent = currentLanguage === 'en' ? 'Finish / Enter' : 'Tamam / Enter';
    if (buttons[1]) buttons[1].textContent = currentLanguage === 'en' ? 'Cancel / Escape' : 'İptal / Escape';
    menu.style.left = `${Math.max(8, Math.min(window.innerWidth - 210, x))}px`;
    menu.style.top = `${Math.max(8, Math.min(window.innerHeight - 110, y))}px`;
    menu.hidden = false;
  }

  function startToolboxSelection(mode) {
    if (bulkProfileSelectionState.active || bulkProfileSelectionState.editorOpen) cancelBulkProfileSelection();
    if (toolboxSelectionMode === mode) {
      cancelToolboxSelection(currentLanguage === 'en' ? 'Selection cancelled.' : 'Seçim iptal edildi.');
      return;
    }
    if (!lastDrawing) updatePreview(false);
    if (!lastDrawing) return;
    toolboxSelectionMode = mode;
    toolboxSelectionItems = new Map();
    hideToolboxContextMenu();
    refreshToolboxSelectionDecorations();
    const messages = {
      'multi-product': currentLanguage === 'en' ? 'Select product placement dimensions, then press Enter or right-click.' : 'Ürün eklenecek ölçüleri seç; sonra Enter’a bas veya sağ tıkla.',
      'multi-dimension': currentLanguage === 'en' ? 'Select dimensions to edit, then press Enter or right-click.' : 'Düzenlenecek ölçüleri seç; sonra Enter’a bas veya sağ tıkla.',
      'equalize-gaps': currentLanguage === 'en' ? 'Select at least two gaps in the same front/side view, then press Enter or right-click.' : 'Aynı ön/yan görünüşte en az iki aralık seç; sonra Enter’a bas veya sağ tıkla.',
      'convert-product': currentLanguage === 'en' ? 'Select one or more sliding or guillotine products, then press Enter or right-click.' : 'Bir veya daha fazla sürme ya da giyotin seç; sonra Enter’a bas veya sağ tıkla.',
      'fit-products': currentLanguage === 'en' ? 'Select one or more products, then press Enter or right-click.' : 'Bir veya daha fazla ürün seç; sonra Enter’a bas veya sağ tıkla.',
      'multi-delete': currentLanguage === 'en' ? 'Select products to delete, then press Enter or right-click.' : 'Silinecek ürünleri seç; sonra Enter’a bas veya sağ tıkla.',
      'bulk-extend': currentLanguage === 'en' ? 'Select extendable profiles, then press Enter or right-click.' : 'Uzatılabilir profilleri seç; sonra Enter’a bas veya sağ tıkla.'
    };
    statusText.textContent = messages[mode] || '';
    focusPreviewCanvas();
  }

  function cancelToolboxSelection(message = '') {
    toolboxSelectionMode = null;
    toolboxSelectionItems = new Map();
    hideToolboxContextMenu();
    refreshToolboxSelectionDecorations();
    if (message) statusText.textContent = message;
  }

  function ensureBulkProductChooser() {
    let overlay = $('bulkProductChooserOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'bulkProductChooserOverlay';
    overlay.className = 'dim-edit-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `<form class="dim-edit-card bulk-product-chooser-card"><div class="dim-edit-title" id="bulkProductChooserTitle">Çoklu Ürün Ekleme</div><div id="bulkProductChooserRows" class="bulk-selection-list"></div><label class="dim-edit-label"><span id="bulkProductTypeLabel">Ürün</span><select id="bulkProductType"><option value="sliding_glass">Sürme Cam</option><option value="guillotine_glass">Giyotin Cam</option><option value="zip_screen">Zip Perde</option></select></label><div class="dim-edit-actions"><button id="bulkProductChooserCancel" type="button" class="dim-edit-cancel">İptal</button><button type="submit" class="dim-edit-apply">Tamam</button></div></form>`;
    previewPanel.appendChild(overlay);
    overlay.querySelector('#bulkProductChooserCancel').addEventListener('click', () => { overlay.hidden = true; });
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) overlay.hidden = true; });
    overlay.querySelector('form').addEventListener('submit', evt => {
      evt.preventDefault();
      const metas = Array.isArray(overlay._metas) ? overlay._metas : [];
      const product = overlay.querySelector('#bulkProductType').value;
      overlay.hidden = true;
      if (product === 'guillotine_glass') showGuillotineDetailsOverlay({ batchMetas: metas, bulk: true });
      else if (product === 'zip_screen') showZipScreenDetailsOverlay({ batchMetas: metas, bulk: true });
      else showSlidingDetailsOverlay({ batchMetas: metas, bulk: true });
    });
    return overlay;
  }

  function showBulkProductChooser(metas) {
    const overlay = ensureBulkProductChooser();
    overlay._metas = metas.map(meta => ({ ...meta }));
    const isEn = currentLanguage === 'en';
    overlay.querySelector('#bulkProductChooserTitle').textContent = isEn ? 'Multiple Product Placement' : 'Çoklu Ürün Ekleme';
    overlay.querySelector('#bulkProductTypeLabel').textContent = isEn ? 'Product' : 'Ürün';
    overlay.querySelector('#bulkProductChooserCancel').textContent = isEn ? 'Cancel' : 'İptal';
    const options = overlay.querySelectorAll('#bulkProductType option');
    if (options[0]) options[0].textContent = isEn ? 'Sliding Glass' : 'Sürme Cam';
    if (options[1]) options[1].textContent = isEn ? 'Guillotine' : 'Giyotin Cam';
    if (options[2]) options[2].textContent = isEn ? 'Zip Screen' : 'Zip Perde';
    overlay.querySelector('#bulkProductChooserRows').innerHTML = metas.map((meta, i) => `<div><b>${i + 1}.</b> ${escapeHtml(viewLabel(meta.view))} · ${escapeHtml(meta.label || '')} · ${Math.round(Number(meta.placementWidth || 0))} × ${Math.round(Number(meta.placementHeight || 0))} mm</div>`).join('');
    overlay.hidden = false;
    window.setTimeout(() => overlay.querySelector('#bulkProductType').focus({ preventScroll: true }), 20);
  }

  function captureBulkEditState() {
    return createProjectSnapshot();
  }

  function applyDimensionValueForBulk(meta, value) {
    if (String(meta.actionType||'') === 'horizontal_profile_y_resize') moveHorizontalProfileFromDimension(meta, value);
    else if (String(meta.actionType||'') === 'ray_interval_resize') resizeRayInterval(meta, value);
    else if (isParapetWidthMeta(meta)) resizeParapetSegmentWidth(meta, value);
    else if (isLeftSideSupportGapMeta(meta)) resizeLeftSideSupportGap(meta, value);
    else if (isFrontPostGapMeta(meta)) resizeFrontPostGap(meta, value);
    else {
      if (!meta.canResize || String(meta.field || '').startsWith('__')) throw new Error(currentLanguage === 'en' ? `${meta.label}: not directly editable.` : `${meta.label}: doğrudan düzenlenebilir değil.`);
      updateEditableListValue(meta.field, meta.index, String(value), true);
    }
    const drawing = updatePreview(false);
    if (!drawing) throw new Error(statusText.textContent || (currentLanguage === 'en' ? 'Drawing could not be rebuilt.' : 'Çizim yeniden oluşturulamadı.'));
  }

  function ensureBulkDimensionOverlay() {
    let overlay = $('bulkDimensionOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'bulkDimensionOverlay';
    overlay.className = 'dim-edit-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `<form class="dim-edit-card bulk-dimension-card"><div class="dim-edit-title" id="bulkDimensionTitle">Çoklu Ölçü Düzenleme</div><div id="bulkDimensionRows" class="bulk-selection-list"></div><label class="dim-edit-label"><span id="bulkDimensionValueLabel">Yeni ölçü *(mm)</span><input id="bulkDimensionValue" type="text" inputmode="numeric" autocomplete="off"></label><div id="bulkDimensionError" class="dim-edit-error"></div><div class="dim-edit-actions"><button id="bulkDimensionCancel" type="button" class="dim-edit-cancel">İptal</button><button type="submit" class="dim-edit-apply">Tamam</button></div></form>`;
    previewPanel.appendChild(overlay);
    const input = overlay.querySelector('#bulkDimensionValue');
    input.addEventListener('input', () => { input.value = String(input.value || '').replace(/[^0-9]/g, ''); overlay.querySelector('#bulkDimensionError').textContent = ''; });
    overlay.querySelector('#bulkDimensionCancel').addEventListener('click', () => { overlay.hidden = true; });
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) overlay.hidden = true; });
    overlay.querySelector('form').addEventListener('submit', evt => {
      evt.preventDefault();
      const metas = Array.isArray(overlay._metas) ? overlay._metas : [];
      const value = Number(input.value || 0);
      const error = overlay.querySelector('#bulkDimensionError');
      if (!(value > 0)) { error.textContent = currentLanguage === 'en' ? 'Enter a positive number.' : 'Pozitif bir sayı gir.'; return; }
      const rollback = captureBulkEditState();
      suppressFormPreviewUpdate = true;
      beginHistoryTransaction();
      let commitHistory = false;
      try {
        metas.forEach(meta => applyDimensionValueForBulk(meta, value));
        overlay.hidden = true;
        commitHistory = true;
        statusText.textContent = currentLanguage === 'en' ? `${metas.length} dimensions updated.` : `${metas.length} ölçü güncellendi.`;
      } catch (err) {
        projectHistory.restoring = true;
        try { restoreProjectSnapshot(rollback, { resetZoom: false }); } catch (_) {}
        finally { projectHistory.restoring = false; }
        error.textContent = err.message;
      } finally {
        suppressFormPreviewUpdate = false;
        endHistoryTransaction(commitHistory);
      }
    });
    return overlay;
  }

  function showBulkDimensionOverlay(metas) {
    const overlay = ensureBulkDimensionOverlay();
    const isEn = currentLanguage === 'en';
    overlay._metas = metas.map(meta => ({ ...meta }));
    overlay.querySelector('#bulkDimensionTitle').textContent = isEn ? 'Multiple Dimension Editing' : 'Çoklu Ölçü Düzenleme';
    overlay.querySelector('#bulkDimensionValueLabel').textContent = isEn ? 'New dimension *(mm)' : 'Yeni ölçü *(mm)';
    overlay.querySelector('#bulkDimensionCancel').textContent = isEn ? 'Cancel' : 'İptal';
    overlay.querySelector('#bulkDimensionRows').innerHTML = metas.map((meta, i) => `<div><b>${i + 1}.</b> ${escapeHtml(viewLabel(meta.view))} · ${escapeHtml(meta.label || '')} · ${escapeHtml(String(meta.value || ''))} mm</div>`).join('');
    overlay.querySelector('#bulkDimensionValue').value = '';
    overlay.querySelector('#bulkDimensionError').textContent = '';
    overlay.hidden = false;
    window.setTimeout(() => overlay.querySelector('#bulkDimensionValue').focus({ preventScroll: true }), 20);
  }

  function finishToolboxSelection() {
    hideToolboxContextMenu();
    if (!toolboxSelectionMode) return;
    if (!toolboxSelectionItems.size) {
      statusText.textContent = currentLanguage === 'en' ? 'Select at least one item.' : 'En az bir öğe seç.';
      return;
    }
    const mode = toolboxSelectionMode;
    const items = Array.from(toolboxSelectionItems.values());
    cancelToolboxSelection();
    if (mode === 'bulk-extend') {
      showBulkExtendOverlay(items);
      return;
    }
    if (mode === 'multi-product') {
      const metas = items.map(normalizedProductMeta).filter(Boolean);
      showBulkProductChooser(metas);
      return;
    }
    if (mode === 'multi-dimension') {
      showBulkDimensionOverlay(items);
      return;
    }
    if (mode === 'equalize-gaps') {
      try { equalizeSelectedGaps(items); }
      catch (err) { statusText.textContent = err.message; window.alert(err.message); }
      return;
    }
    if (mode === 'convert-product') {
      try { beginProductTypeConversion(items); }
      catch (err) { statusText.textContent = err.message; window.alert(err.message); }
      return;
    }
    if (mode === 'fit-products') {
      try { fitSelectedProductsToOpenings(items); }
      catch (err) { statusText.textContent = err.message; window.alert(err.message); }
      return;
    }
    if (mode === 'multi-delete') {
      const records = items.map(findProductByInteraction).filter(Boolean);
      const ok = window.confirm(currentLanguage === 'en' ? `Delete ${records.length} selected product(s)?` : `${records.length} seçili ürün silinsin mi?`);
      if (!ok) return;
      records.forEach(deleteProductRecord);
      updatePreview(false);
      statusText.textContent = currentLanguage === 'en' ? `${records.length} products deleted.` : `${records.length} ürün silindi.`;
    }
  }

  function deleteAllProducts() {
    if (toolboxSelectionMode) cancelToolboxSelection();
    const count = stateProductCount() + (normalizeYesNo($('triangleJoinery') && $('triangleJoinery').value) === 'EVET' ? 1 : 0);
    if (!count) {
      statusText.textContent = currentLanguage === 'en' ? 'There are no added products to delete.' : 'Silinecek eklenmiş ürün yok.';
      return;
    }
    if (!window.confirm(currentLanguage === 'en' ? 'Delete all sliding, guillotine, zip-screen and triangle joinery products?' : 'Tüm sürme, giyotin, zip perde ve üçgen doğrama ürünleri silinsin mi?')) return;
    slidingPlacements = [];
    sideSlidingPlacements = [];
    guillotinePlacements = [];
    sideGuillotinePlacements = [];
    zipScreenPlacements = [];
    sideZipScreenPlacements = [];
    if ($('triangleJoinery')) $('triangleJoinery').value = 'HAYIR';
    setSideFeatureValue('triangle', '0', false);
    setSideFeatureValue('triangle', 'right', false);
    Object.keys(sideFeatureState.triangle.middle || {}).forEach(key => { sideFeatureState.triangle.middle[key] = false; });
    syncToolboxBooleanButtons();
    updatePreview(false);
    statusText.textContent = currentLanguage === 'en' ? 'All added products were deleted.' : 'Sonradan eklenen tüm ürünler silindi.';
  }


  function allProductRecords() {
    return [
      ...slidingPlacements.map(placement => ({ type: 'sliding_glass', collection: 'slidingPlacements', placement, isSide: false })),
      ...sideSlidingPlacements.map(placement => ({ type: 'sliding_glass', collection: 'sideSlidingPlacements', placement, isSide: true })),
      ...guillotinePlacements.map(placement => ({ type: 'guillotine_glass', collection: 'guillotinePlacements', placement, isSide: false })),
      ...sideGuillotinePlacements.map(placement => ({ type: 'guillotine_glass', collection: 'sideGuillotinePlacements', placement, isSide: true })),
      ...zipScreenPlacements.map(placement => ({ type: 'zip_screen', collection: 'zipScreenPlacements', placement, isSide: false })),
      ...sideZipScreenPlacements.map(placement => ({ type: 'zip_screen', collection: 'sideZipScreenPlacements', placement, isSide: true }))
    ];
  }

  function productZoneKey(record) {
    if (!record || !record.placement) return '';
    const p = record.placement;
    if (record.isSide || ['side-left', 'side-right'].includes(String(p.placementView || ''))) {
      const key = normalizeSideViewKey(p.sideViewKey, p.sideIndex);
      return `side:${key}:${String(p.sideZone || `gap_${Number(p.sideGapIndex) || 0}`)}`;
    }
    return `front:${Number(p.gapIndex) || 0}`;
  }

  function productTypeLabel(type) {
    if (String(type) === 'guillotine_glass') return currentLanguage === 'en' ? 'Guillotine' : 'Giyotin';
    if (String(type) === 'zip_screen') return currentLanguage === 'en' ? 'Zip Screen' : 'Zip Perde';
    return currentLanguage === 'en' ? 'Sliding' : 'Sürme';
  }

  function zipBoxHeight(type) {
    const key = String(type || '').trim().toUpperCase();
    if (key.includes('130')) return 130;
    if (key.includes('115')) return 115;
    if (key.includes('110')) return 110;
    if (key === 'HERCULE') return 130;
    return 100;
  }

  function zipPlacementAvailability(record, base) {
    if (!record || record.type !== 'zip_screen' || !base) return base;
    const p = record.placement || {};
    const outside = String(p.mountingLocation || 'BETWEEN POSTS').toUpperCase() === 'OUTSIDE POSTS';
    const boxHeight = zipBoxHeight(p.type);
    if (record.isSide || ['side-left', 'side-right'].includes(String(p.placementView || ''))) {
      const d = lastDrawing && lastDrawing.input;
      const sideIndex = Number(p.sideIndex) || 0;
      const sideViewKey = normalizeSideViewKey(p.sideViewKey, sideIndex);
      const geom = sideViewKey === 'right' ? d && d.rightSideSupportGeometry : d && d.sideSupportGeometry && (d.sideSupportGeometry[sideViewKey] || d.sideSupportGeometry[String(sideIndex)]);
      const gap = geom && Array.isArray(geom.gaps) ? geom.gaps[Number(p.sideGapIndex) || 0] : null;
      if (!gap) return base;
      const postWidth = id => {
        const post = Array.isArray(geom.posts) ? geom.posts.find(item => String(item.id || '') === String(id || '')) : null;
        return post ? Math.max(1, Number(post.width || (post.profile && post.profile.en)) || 100) : 0;
      };
      const leftAdd = gap.leftPostId ? postWidth(gap.leftPostId) : 0;
      const rightAdd = gap.rightPostId ? postWidth(gap.rightPostId) : (Number(gap.right) >= Number(geom.frontPostRearFace) - 0.01 ? 100 : 0);
      return {
        ...base,
        placementWidth: outside ? Math.max(1, Number(gap.width || 0) + leftAdd + rightAdd - 5) : Math.max(1, Number(gap.width || 0) - 3),
        placementHeight: outside ? Math.max(1, Number(base.placementHeight || 1) + 5 + boxHeight) : Math.max(1, Number(base.placementHeight || 1) + 2)
      };
    }
    const gapIndex = Number(p.gapIndex) || 0;
    const centers = currentFrontPostCenters();
    if (gapIndex < 0 || gapIndex >= centers.length - 1) return base;
    const clearWidth = Math.max(0, Number(base.value) || 0);
    const outerWidth = clearWidth + frontPostWidthAt(gapIndex) + frontPostWidthAt(gapIndex + 1);
    return {
      ...base,
      placementWidth: outside ? Math.max(1, outerWidth - 5) : Math.max(1, clearWidth - 3),
      placementHeight: outside ? Math.max(1, Number(base.placementHeight || 1) + 5 + boxHeight) : Math.max(1, Number(base.placementHeight || 1) + 2)
    };
  }

  function productDisplayLabel(record) {
    const p = record && record.placement ? record.placement : {};
    return `${String(p.pozNo || '?')} · ${productTypeLabel(record && record.type)}`;
  }

  function productAvailableMetaForRecord(record) {
    if (!record || !record.placement || !lastDrawing || !lastDrawing.input) return null;
    const p = record.placement;
    const d = lastDrawing.input;
    if (record.isSide || ['side-left', 'side-right'].includes(String(p.placementView || ''))) {
      const sideIndex = Number(p.sideIndex) || 0;
      const sideViewKey = normalizeSideViewKey(p.sideViewKey, sideIndex);
      const sideGapIndex = Number(p.sideGapIndex) || 0;
      const geom = sideViewKey === 'right'
        ? d.rightSideSupportGeometry
        : (d.sideSupportGeometry && (d.sideSupportGeometry[sideViewKey] || d.sideSupportGeometry[String(sideIndex)]));
      const gap = geom && Array.isArray(geom.gaps) ? geom.gaps[sideGapIndex] : null;
      if (!geom || !gap) return null;
      const localParapet = currentSideParapetHeightAt(sideIndex, (Number(gap.left) + Number(gap.right)) / 2, sideViewKey);
      const base = {
        placementView: sideViewKey === 'right' ? 'side-right' : 'side-left',
        view: sideViewKey === 'right' ? 'Right' : 'Side',
        index: sideIndex, sideIndex, sideViewKey, sideGapIndex,
        sideZone: String(p.sideZone || `gap_${sideGapIndex}`),
        value: Math.max(0, Number(gap.width) || 0),
        placementWidth: Math.max(1, (Number(gap.width) || 0) - 5),
        placementHeight: Math.max(1, currentSideGlassTrackClearHeight(localParapet, sideViewKey, sideIndex) - 5)
      };
      return zipPlacementAvailability(record, base);
    }
    const gapIndex = Number(p.gapIndex) || 0;
    const centers = currentFrontPostCenters();
    if (gapIndex < 0 || gapIndex >= centers.length - 1) return null;
    const left = centers[gapIndex] + frontPostWidthAt(gapIndex) / 2;
    const right = centers[gapIndex + 1] - frontPostWidthAt(gapIndex + 1) / 2;
    const clear = Math.max(0, right - left);
    const base = {
      placementView: 'front', view: 'Front', index: gapIndex, gapIndex,
      value: clear,
      placementWidth: Math.max(1, clear - 5),
      placementHeight: Math.max(1, Number(d.frontHeight || 0) - currentFrontParapetHeightAt((left + right) / 2) - 5)
    };
    return zipPlacementAvailability(record, base);
  }

  function centerRemainderOrder(count) {
    const center = (Math.max(1, count) - 1) / 2;
    return Array.from({ length: count }, (_, i) => i).sort((a, b) => Math.abs(a - center) - Math.abs(b - center) || a - b);
  }

  function equalizedGapTargets(total, count) {
    const safeCount = Math.max(1, Number(count) || 1);
    const base = Math.floor(total / safeCount);
    const targets = Array.from({ length: safeCount }, () => base);
    let remainder = Math.max(0, Math.min(safeCount - 1, Math.round(total - base * safeCount)));
    const order = centerRemainderOrder(safeCount);
    for (let i = 0; i < remainder; i += 1) targets[order[i]] += 1;
    const residual = total - targets.reduce((sum, value) => sum + value, 0);
    if (Math.abs(residual) > 1e-9) targets[order[0]] += residual;
    return targets;
  }

  function equalizeSelectedFrontGaps(metas) {
    const indices = Array.from(new Set((metas || []).filter(isFrontPostGapMeta).map(meta => Number(meta.index) || 0))).sort((a, b) => a - b);
    if (indices.length < 2) throw new Error(currentLanguage === 'en' ? 'Select at least two front post gaps.' : 'En az iki ön dikme aralığı seç.');
    const centers = currentFrontPostCenters();
    if (centers.length < 3 || indices.some(i => i < 0 || i >= centers.length - 1)) throw new Error(currentLanguage === 'en' ? 'Selected post gaps are no longer valid.' : 'Seçilen dikme aralıkları artık geçerli değil.');
    const widths = centers.map((_, i) => frontPostWidthAt(i));
    const allGaps = Array.from({length: centers.length - 1}, (_, i) => centers[i + 1] - widths[i + 1] / 2 - (centers[i] + widths[i] / 2));
    if (indices.some(i => !(allGaps[i] > 0))) throw new Error(currentLanguage === 'en' ? 'One selected gap is zero or negative.' : 'Seçilen aralıklardan biri sıfır veya negatiftir.');
    const selectedTotal = indices.reduce((sum, i) => sum + allGaps[i], 0);
    const targets = equalizedGapTargets(selectedTotal, indices.length);
    indices.forEach((gapIndex, order) => { allGaps[gapIndex] = targets[order]; });
    const rollback = createProjectSnapshot(); beginHistoryTransaction(); let commit = false;
    try {
      const next = centers.slice();
      for (let i = 0; i < allGaps.length; i += 1) next[i + 1] = next[i] + widths[i] / 2 + allGaps[i] + widths[i + 1] / 2;
      next[next.length - 1] = centers[centers.length - 1];
      // Sağ uç sabit kalırken olası kayan toplamı, seçilmemiş merkez aralığa dağıt.
      const drift = next[next.length - 1] - centers[centers.length - 1];
      if (Math.abs(drift) > 0.001) {
        const adjustable = allGaps.map((_,i)=>i).filter(i=>!indices.includes(i));
        if (!adjustable.length) throw new Error(currentLanguage === 'en' ? 'The selected gaps cannot be equalized while both edge posts remain fixed.' : 'İki kenar dikme sabitken seçilen aralıklar eşitlenemiyor.');
        const targetGap = adjustable[Math.floor(adjustable.length/2)];
        allGaps[targetGap] -= drift;
        if (!(allGaps[targetGap] > 0)) throw new Error(currentLanguage === 'en' ? 'The remaining gap is insufficient.' : 'Arada kalan bölüm kaydırma için yetersiz.');
        for (let i = 0; i < allGaps.length; i += 1) next[i + 1] = next[i] + widths[i] / 2 + allGaps[i] + widths[i + 1] / 2;
      }
      customFrontPostCenters = next;
      // v8.9.27: Aralık geometrisi değişse bile kullanıcı tarafından kaydedilmiş
      // ürün genişlikleri korunur. Otomatik yeniden sığdırma yalnız toolbox’taki
      // “Ürünü Alana Uydur” komutuyla yapılır.
      const drawing=updatePreview(false); if(!drawing) throw new Error(statusText.textContent || 'Çizim yeniden oluşturulamadı.');
      commit=true; statusText.textContent=currentLanguage==='en'?`${indices.length} selected gaps equalized.`:`${indices.length} seçili aralık eşitlendi.`;
    } catch(err){ projectHistory.restoring=true; try{restoreProjectSnapshot(rollback,{resetZoom:false});}catch(_){} finally{projectHistory.restoring=false;} throw err; }
    finally{endHistoryTransaction(commit);}
  }


  function equalizeSelectedSideGaps(metas) {
    const groups = new Map();
    (metas || []).filter(isLeftSideSupportGapMeta).forEach(meta => {
      const key = String(Number(meta.index) || 0);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(meta);
    });
    if (groups.size !== 1) throw new Error(currentLanguage === 'en' ? 'Select gaps from one side view at a time.' : 'Tek seferde aynı yan görünüşteki aralıkları seç.');
    const [sideKey, selectedMetas] = Array.from(groups.entries())[0] || [];
    const meta = selectedMetas && selectedMetas[0];
    const geom = currentSideSupportGeometry(meta);
    if (!geom || !Array.isArray(geom.posts) || !geom.posts.length || !Array.isArray(geom.gaps)) throw new Error(currentLanguage === 'en' ? 'Side support geometry could not be found.' : 'Yan destek geometrisi bulunamadı.');
    const indices = Array.from(new Set(selectedMetas.map(item => Number(item.sideGapIndex) || 0))).sort((a,b)=>a-b);
    if (indices.length < 2) throw new Error(currentLanguage === 'en' ? 'Select at least two side gaps.' : 'En az iki yan görünüş aralığı seç.');
    if (indices.some(i => i < 0 || i >= geom.gaps.length)) throw new Error(currentLanguage === 'en' ? 'One selected side gap is no longer valid.' : 'Seçilen yan aralıklardan biri artık geçerli değil.');
    const posts = materializeSidePosts(meta);
    const gaps = geom.gaps.map(item => Number(item.width) || 0);
    if (indices.some(i => !(gaps[i] >= 0))) throw new Error(currentLanguage === 'en' ? 'One selected gap is invalid.' : 'Seçilen aralıklardan biri geçersiz.');
    const selectedTotal = indices.reduce((sum,i)=>sum+gaps[i],0);
    const targets = equalizedGapTargets(selectedTotal, indices.length);
    indices.forEach((gapIndex, order)=>{gaps[gapIndex]=targets[order];});
    let cursor = Number(geom.wallX) || 0;
    posts.forEach((post, i) => {
      const width = Math.max(1, Number(post.profile && post.profile.en) || 100);
      cursor += gaps[i] + width / 2;
      post.centerX = cursor;
      cursor += width / 2;
    });
    const finalRight = cursor + gaps[gaps.length - 1];
    if (Math.abs(finalRight - Number(geom.frontPostRearFace)) > 0.01) throw new Error(currentLanguage === 'en' ? 'The equalized gaps do not fit between the wall and front post.' : 'Eşitlenen aralıklar duvar ile ön dikme arasına sığmıyor.');
    storeSidePosts(meta, posts);
    // v8.9.27: Yan aralıklar eşitlendiğinde ürünlerin manuel genişlikleri
    // değiştirilmez. Gerekirse kullanıcı “Ürünü Alana Uydur” komutunu çalıştırır.
  }

  function equalizeSelectedGaps(metas) {
    const front = (metas || []).filter(isFrontPostGapMeta);
    const side = (metas || []).filter(isLeftSideSupportGapMeta);
    if (front.length && side.length) throw new Error(currentLanguage === 'en' ? 'Front and side gaps cannot be equalized in the same operation.' : 'Ön ve yan görünüş aralıkları aynı işlemde eşitlenemez.');
    if (front.length) return equalizeSelectedFrontGaps(front);
    if (side.length) {
      const rollback = createProjectSnapshot(); beginHistoryTransaction(); let commit=false;
      try {
        equalizeSelectedSideGaps(side);
        const drawing=updatePreview(false); if(!drawing) throw new Error(statusText.textContent || 'Çizim yeniden oluşturulamadı.');
        commit=true;
        statusText.textContent=currentLanguage==='en'?`${side.length} selected side gaps equalized.`:`${side.length} seçili yan görünüş aralığı eşitlendi.`;
      } catch(err) {
        projectHistory.restoring=true; try{restoreProjectSnapshot(rollback,{resetZoom:false});}catch(_){} finally{projectHistory.restoring=false;}
        throw err;
      } finally { endHistoryTransaction(commit); }
      return;
    }
    throw new Error(currentLanguage === 'en' ? 'Select at least two valid gaps.' : 'En az iki geçerli aralık seç.');
  }

  function fitSelectedProductsToOpenings(interactionMetas) {
    const records = [];
    const seen = new Set();
    (interactionMetas || []).forEach(meta => {
      const record = findProductByInteraction(meta);
      const id = record && record.placement ? String(record.placement.id || '') : '';
      if (!record || (id && seen.has(id))) return;
      if (id) seen.add(id);
      records.push(record);
    });
    if (!records.length) throw new Error(currentLanguage === 'en' ? 'No valid product was selected.' : 'Geçerli bir ürün seçilmedi.');
    const rollback = createProjectSnapshot();
    beginHistoryTransaction();
    let commit = false;
    try {
      records.forEach(record => {
        const available = productAvailableMetaForRecord(record);
        if (!available) throw new Error(currentLanguage === 'en' ? `${productDisplayLabel(record)} opening could not be found.` : `${productDisplayLabel(record)} yerleşim alanı bulunamadı.`);
        record.placement.width = Math.max(1, Number(available.placementWidth) || 1);
        record.placement.height = Math.max(1, Number(available.placementHeight) || 1);
        if (record.type === 'sliding_glass' && String(record.placement.panelCountMode || 'AUTO').toUpperCase() !== 'MANUAL') {
          record.placement.panelCount = slidingPanelCount(record.placement.width, record.placement.openingType);
          record.placement.panelCountMode = 'AUTO';
        }
        if (record.type === 'zip_screen') record.placement.sizeMode = 'AUTO';
      });
      const drawing = updatePreview(false);
      if (!drawing) throw new Error(statusText.textContent || (currentLanguage === 'en' ? 'Drawing could not be rebuilt.' : 'Çizim yeniden oluşturulamadı.'));
      commit = true;
      statusText.textContent = currentLanguage === 'en'
        ? `${records.length} product size(s) were fitted to their openings.`
        : `${records.length} ürünün ölçüsü yerleşim alanına uyduruldu.`;
    } catch (err) {
      projectHistory.restoring = true;
      try { restoreProjectSnapshot(rollback, { resetZoom: false }); } catch (_) {}
      finally { projectHistory.restoring = false; }
      throw err;
    } finally {
      endHistoryTransaction(commit);
    }
  }

  function beginProductTypeConversion(interactionMetas) {
    const metas = Array.isArray(interactionMetas) ? interactionMetas : [interactionMetas];
    const records=[]; const seen=new Set();
    metas.forEach(meta=>{const r=findProductByInteraction(meta); const id=r&&r.placement?String(r.placement.id||''):''; if(r&&!seen.has(id)){seen.add(id);records.push(r);}});
    if(!records.length) throw new Error(currentLanguage==='en'?'The selected products could not be found.':'Seçilen ürünler bulunamadı.');
    const sourceType=records[0].type;
    if(records.some(r=>r.type!==sourceType)) throw new Error(currentLanguage==='en'?'Select products of the same type in one conversion.':'Tek dönüşümde aynı tip ürünleri seç.');
    const batchMetas=records.map(record=>{
      const available=productAvailableMetaForRecord(record)||{};
      return {...available, placementWidth:Math.max(1,Number(record.placement.width)||Number(available.placementWidth)||1), placementHeight:Math.max(1,Number(record.placement.height)||Number(available.placementHeight)||1)};
    });
    const payload={...batchMetas[0],batchMetas};
    if(sourceType==='sliding_glass') showGuillotineDetailsOverlay(payload,{convertFromRecords:records});
    else if(sourceType==='guillotine_glass') showZipScreenDetailsOverlay(payload,{convertFromRecords:records});
    else showSlidingDetailsOverlay(payload,{convertFromRecords:records});
  }

  function numericTokens(value) {
    return (String(value == null ? '' : value).match(/-?\d+(?:[.,]\d+)?/g) || []).map(token => Number(token.replace(',', '.'))).filter(Number.isFinite);
  }

  function makeDrawingIssue(code, severity, trTitle, enTitle, trDetail, enDetail, target = null) {
    return {
      code,
      severity: severity === 'warning' ? 'warning' : 'error',
      title: currentLanguage === 'en' ? enTitle : trTitle,
      detail: currentLanguage === 'en' ? enDetail : trDetail,
      target
    };
  }

  function productTarget(record) {
    return record && record.placement ? { kind: 'product', placementId: String(record.placement.id || '') } : null;
  }

  function validateDuplicateZoneProducts(context) {
    const issues = [];
    const groups = new Map();
    context.products.forEach(record => {
      const key = productZoneKey(record);
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    });
    groups.forEach(records => {
      if (records.length < 2) return;
      const labels = records.map(productDisplayLabel).join(', ');
      issues.push(makeDrawingIssue('duplicate-zone-products', 'error', 'Aynı aralıkta birden fazla ürün', 'Multiple products in the same opening', `${labels} aynı yerleşim alanını kullanıyor.`, `${labels} use the same placement opening.`, productTarget(records[0])));
    });
    return issues;
  }

  function sideGeometryEntriesForChecks(drawingInput) {
    const d = drawingInput || {};
    const entries = [];
    const leftMap = d.sideSupportGeometry && typeof d.sideSupportGeometry === 'object' ? d.sideSupportGeometry : {};
    Object.entries(leftMap).forEach(([key, geom]) => {
      if (geom) entries.push({ key: normalizeSideViewKey(key, Number(key) || 0), geom, sideIndex: Number(geom.sideIndex ?? key) || 0 });
    });
    if (d.rightSideSupportGeometry) {
      entries.push({ key: 'right', geom: d.rightSideSupportGeometry, sideIndex: Number(d.rightSideSupportGeometry.sideIndex ?? Math.max(0, Number(d.sidePositionCount || 1) - 1)) || 0 });
    }
    return entries;
  }

  function sidePositionLabel(key, sideIndex) {
    if (key === 'right') return currentLanguage === 'en' ? 'right side view' : 'sağ yan görünüş';
    if (String(key) === '0') return currentLanguage === 'en' ? 'left side view' : 'sol yan görünüş';
    return currentLanguage === 'en' ? `side position ${Number(sideIndex) + 1}` : `Poz ${Number(sideIndex) + 1} yan görünüş`;
  }

  function validatePostOverlaps(context) {
    const issues = [];
    if (!context.drawing) return issues;
    const centers = currentFrontPostCenters();
    for (let i = 0; i < centers.length - 1; i += 1) {
      const clear = centers[i + 1] - frontPostWidthAt(i + 1) / 2 - (centers[i] + frontPostWidthAt(i) / 2);
      if (clear < -0.001) issues.push(makeDrawingIssue('front-post-overlap', 'error', 'Ön dikmeler üst üste geliyor', 'Front posts overlap', `${i + 1}. ve ${i + 2}. ön dikme ${Math.abs(clear).toFixed(1)} mm çakışıyor.`, `Front posts ${i + 1} and ${i + 2} overlap by ${Math.abs(clear).toFixed(1)} mm.`, { kind: 'frontPost', postIndex: i + 1 }));
    }
    sideGeometryEntriesForChecks(context.drawing.input).forEach(({ key: sideKey, geom, sideIndex }) => {
      if (!geom || !Array.isArray(geom.posts)) return;
      const label = sidePositionLabel(sideKey, sideIndex);
      const posts = geom.posts.slice().sort((a, b) => Number(a.centerX) - Number(b.centerX));
      posts.forEach((post, index) => {
        const left = Number(post.left != null ? post.left : Number(post.centerX) - Number(post.width || (post.profile && post.profile.en) || 100) / 2);
        const right = Number(post.right != null ? post.right : Number(post.centerX) + Number(post.width || (post.profile && post.profile.en) || 100) / 2);
        const previous = index > 0 ? posts[index - 1] : null;
        const target = { kind: 'sidePost', sidePostId: String(post.id || ''), sideIndex, sideViewKey: sideKey };
        if (previous) {
          const previousRight = Number(previous.right != null ? previous.right : Number(previous.centerX) + Number(previous.width || (previous.profile && previous.profile.en) || 100) / 2);
          if (left < previousRight - 0.001) issues.push(makeDrawingIssue('side-post-overlap', 'error', 'Yan destek dikmeleri üst üste geliyor', 'Side support posts overlap', `${label} içinde iki destek dikmesi çakışıyor.`, `Two support posts overlap in the ${label}.`, target));
        }
        if (left < Number(geom.wallX) - 0.001 || right > Number(geom.frontPostRearFace) + 0.001) issues.push(makeDrawingIssue('side-post-boundary', 'error', 'Yan destek dikmesi sınır dışına taşıyor', 'Side support post exceeds its limits', `${label} destek dikmesi duvar veya ön dikme sınırını aşıyor.`, `A support post in the ${label} exceeds the wall or front-post limit.`, target));
      });
    });
    return issues;
  }

  function validateNonPositiveDimensions(context) {
    const issues = [];
    const fields = [
      ['width', 'Genişlik', 'Width', 'front_total_width'],
      ['opening', 'Açılım', 'Projection', 'side_opening_pos_1'],
      ['rearHeight', 'Arka yükseklik', 'Rear height', 'side_rear_height_pos_1'],
      ['frontHeight', 'Ön yükseklik', 'Front height', 'front_height']
    ];
    if (normalizeYesNo(context.form.parapet) === 'EVET') fields.push(['parapetHeight', 'Parapet yüksekliği', 'Parapet height', 'front_parapet_height_info']);
    fields.forEach(([field, trName, enName, dimId]) => {
      numericTokens(context.form[field]).forEach((value, index) => {
        if (value > 0) return;
        issues.push(makeDrawingIssue('non-positive-dimension', 'error', 'Sıfır veya negatif ölçü', 'Zero or negative dimension', `${trName}${index ? ` (${index + 1}. değer)` : ''}: ${value} mm.`, `${enName}${index ? ` (value ${index + 1})` : ''}: ${value} mm.`, { kind: 'dimension', dimId: index && field === 'opening' ? `side_opening_pos_${index + 1}` : index && field === 'rearHeight' ? `side_rear_height_pos_${index + 1}` : dimId, field }));
      });
    });
    context.products.forEach(record => {
      const p = record.placement;
      if (!(Number(p.width) > 0) || !(Number(p.height) > 0)) issues.push(makeDrawingIssue('non-positive-product-size', 'error', 'Ürün ölçüsü sıfır veya negatif', 'Product size is zero or negative', `${productDisplayLabel(record)} ölçüsü ${Number(p.width) || 0} × ${Number(p.height) || 0} mm.`, `${productDisplayLabel(record)} size is ${Number(p.width) || 0} × ${Number(p.height) || 0} mm.`, productTarget(record)));
    });
    return issues;
  }

  function validateProfilesAgainstGaps(context) {
    const issues = [];
    if (!context.drawing) return issues;
    const centers = currentFrontPostCenters();
    centers.forEach((center, index) => {
      const profile = frontPostProfiles[index];
      if (!profile) return;
      const width = Math.max(1, Number(profile.en) || 1);
      const leftDistance = index > 0 ? center - centers[index - 1] : Infinity;
      const rightDistance = index < centers.length - 1 ? centers[index + 1] - center : Infinity;
      if (width >= Math.min(leftDistance, rightDistance) - 0.001) issues.push(makeDrawingIssue('front-profile-too-wide', 'error', 'Dikme profili aralıktan geniş', 'Post profile is wider than its spacing', `${index + 1}. ön dikmenin ${width} mm profili komşu dikme aralığına sığmıyor.`, `The ${width} mm profile of front post ${index + 1} does not fit between adjacent posts.`, { kind: 'frontPost', postIndex: index }));
    });
    sideGeometryEntriesForChecks(context.drawing.input).forEach(({ key: sideKey, geom, sideIndex }) => {
      if (!geom || !Array.isArray(geom.posts)) return;
      const label = sidePositionLabel(sideKey, sideIndex);
      const posts = geom.posts.slice().sort((a, b) => Number(a.centerX) - Number(b.centerX));
      posts.forEach((post, index) => {
        const width = Math.max(1, Number(post.width || (post.profile && post.profile.en)) || 1);
        const leftBoundary = index ? Number(posts[index - 1].centerX) : Number(geom.wallX);
        const rightBoundary = index < posts.length - 1 ? Number(posts[index + 1].centerX) : Number(geom.frontPostRearFace);
        if (width >= Math.min(Number(post.centerX) - leftBoundary, rightBoundary - Number(post.centerX)) * 2 - 0.001) issues.push(makeDrawingIssue('side-profile-too-wide', 'error', 'Destek profili aralıktan geniş', 'Support profile is wider than its spacing', `${label} içindeki ${width} mm destek profili mevcut aralığa sığmıyor.`, `The ${width} mm support profile in the ${label} does not fit its available spacing.`, { kind: 'sidePost', sidePostId: String(post.id || ''), sideIndex, sideViewKey: sideKey }));
      });
    });
    return issues;
  }

  function validateMissingProductInformation(context) {
    const issues = [];
    context.products.forEach(record => {
      const p = record.placement || {};
      const required = record.type === 'guillotine_glass'
        ? ['id','pozNo','series','type','mechanism','glassThickness','glassColor','panelCount','motorDirection','view','motorType','remoteControl']
        : record.type === 'zip_screen'
          ? ['id','pozNo','series','type','mountingLocation','fabricColor','cableExitDirection','motorDirection','panelCount']
          : ['id','pozNo','series','type','openingType','glassThickness','glassColor','panelCount'];
      const missing = required.filter(key => String(p[key] == null ? '' : p[key]).trim() === '');
      if (missing.length) issues.push(makeDrawingIssue('missing-product-information', 'error', 'Eksik ürün bilgisi', 'Missing product information', `${productDisplayLabel(record)}: ${missing.join(', ')} alanları eksik.`, `${productDisplayLabel(record)}: ${missing.join(', ')} fields are missing.`, productTarget(record)));
    });
    return issues;
  }

  function validateDuplicatePozNumbers(context) {
    const issues = [];
    const groups = new Map();
    context.products.forEach(record => {
      const poz = String(record.placement && record.placement.pozNo || '').trim().toUpperCase();
      if (!poz) return;
      if (!groups.has(poz)) groups.set(poz, []);
      groups.get(poz).push(record);
    });
    groups.forEach((records, poz) => {
      if (records.length < 2) return;
      records.forEach(record => issues.push(makeDrawingIssue('duplicate-poz-number', 'error', 'Aynı poz numarası tekrar kullanılmış', 'Duplicate position number', `${poz} numarası ${records.length} üründe kullanılıyor.`, `${poz} is used by ${records.length} products.`, productTarget(record))));
    });
    return issues;
  }

  function validateProductFitsOpening(context) {
    const issues = [];
    if (!context.drawing) return issues;
    context.products.forEach(record => {
      const available = productAvailableMetaForRecord(record);
      if (!available) {
        issues.push(makeDrawingIssue('product-opening-missing', 'error', 'Ürün yerleşim alanı bulunamadı', 'Product opening could not be found', `${productDisplayLabel(record)} artık geçerli bir aralığa bağlı değil.`, `${productDisplayLabel(record)} is no longer linked to a valid opening.`, productTarget(record)));
        return;
      }
      const p = record.placement;
      const tooWide = Number(p.width) > Number(available.placementWidth) + 0.5;
      const tooHigh = Number(p.height) > Number(available.placementHeight) + 0.5;
      if (tooWide || tooHigh) issues.push(makeDrawingIssue('product-too-large', 'error', 'Ürün ölçüsü yerleşim alanından büyük', 'Product is larger than its opening', `${productDisplayLabel(record)} ${Math.round(Number(p.width) || 0)} × ${Math.round(Number(p.height) || 0)} mm; kullanılabilir alan ${Math.round(available.placementWidth)} × ${Math.round(available.placementHeight)} mm.`, `${productDisplayLabel(record)} is ${Math.round(Number(p.width) || 0)} × ${Math.round(Number(p.height) || 0)} mm; available opening is ${Math.round(available.placementWidth)} × ${Math.round(available.placementHeight)} mm.`, productTarget(record)));
    });
    return issues;
  }

  function validateTriangleProductConflicts(context) {
    const issues = [];
    context.products.filter(record => record.isSide || ['side-left','side-right'].includes(String(record.placement && record.placement.placementView || ''))).forEach(record => {
      const placement = record.placement || {};
      const key = normalizeSideViewKey(placement.sideViewKey, placement.sideIndex);
      if (!sideFeatureValue('triangle', key)) return;
      issues.push(makeDrawingIssue('triangle-product-conflict', 'error', 'Üçgen doğrama ile ürün çakışması', 'Triangle joinery conflicts with a product', `${productDisplayLabel(record)} ile aynı yan görünüşte üçgen doğrama bulunuyor. Üretim öncesi yerleşim kontrol edilmeli.`, `${productDisplayLabel(record)} shares the same side opening with triangle joinery. Check the placement before production.`, productTarget(record)));
    });
    return issues;
  }

  function validatePergolaProductionRules(context) {
    const issues = [];
    const d = context.drawing && context.drawing.input;
    if (!d) return issues;

    const warning = (code, trTitle, enTitle, trDetail, enDetail, target) =>
      issues.push(makeDrawingIssue(code, 'warning', trTitle, enTitle, trDetail, enDetail, target));

    (d.positions || []).forEach((p, i) => {
      const opening = Number(p.opening) || 0;
      if (opening > 7000) warning(
        'opening-over-7000', 'Açılım sınırı aşıldı', 'Projection limit exceeded',
        `Poz ${i + 1} açılımı ${Math.round(opening)} mm; tavsiye edilen üst sınır 7000 mm.`,
        `Position ${i + 1} projection is ${Math.round(opening)} mm; the recommended upper limit is 7000 mm.`,
        { kind: 'dimension', dimId: `side_opening_pos_${i + 1}` }
      );

      const deg = Math.abs(Number(p.angleRad) || 0) * 180 / Math.PI;
      if (deg < 6 || deg > 15) warning(
        'ray-angle-outside-6-15', 'Ray açısı 6°–15° aralığı dışında', 'Ray angle is outside 6°–15°',
        `Poz ${i + 1} ray açısı ${deg.toFixed(2)}°. Üretim için önerilen aralık 6° ile 15° arasındadır.`,
        `Position ${i + 1} ray angle is ${deg.toFixed(2)}°. The recommended production range is 6° to 15°.`,
        { kind: 'dimension', dimId: `side_opening_pos_${i + 1}` }
      );
    });

    (d.systems || []).forEach((sys, s) => {
      (sys.rays || []).slice(0, -1).forEach((x, r) => {
        const clear = Number(sys.rays[r + 1]) - Number(x) - 80;
        const targetId = sys.rays.length > 2 ? `top_ray_spacing_${s}_${r}` : null;
        if (clear > 4000) warning(
          'ray-gap-over-4000', 'İki ray arası sınırı aşıldı', 'Ray spacing limit exceeded',
          `Poz ${s + 1}, ray ${r + 1}-${r + 2} net arası ${Math.round(clear)} mm; tavsiye edilen üst sınır 4000 mm.`,
          `Position ${s + 1}, rays ${r + 1}-${r + 2} clear spacing is ${Math.round(clear)} mm; the recommended upper limit is 4000 mm.`,
          targetId ? { kind: 'dimension', dimId: targetId } : null
        );
        if (clear < 25) warning(
          'ray-gap-under-25', 'İki ray arası çok düşük', 'Ray spacing is too small',
          `Poz ${s + 1}, ray ${r + 1}-${r + 2} net arası ${Math.round(clear)} mm; üretim kontrol değeri en az 25 mm.`,
          `Position ${s + 1}, rays ${r + 1}-${r + 2} clear spacing is ${Math.round(clear)} mm; the production check value is at least 25 mm.`,
          targetId ? { kind: 'dimension', dimId: targetId } : null
        );
      });
    });

    const centers = currentFrontPostCenters();
    for (let i = 0; i < centers.length - 1; i += 1) {
      const clear = centers[i + 1] - frontPostWidthAt(i + 1) / 2 - (centers[i] + frontPostWidthAt(i) / 2);
      if (clear > 4000) warning(
        'front-post-gap-over-4000', 'Ön dikme aralığı sınırı aşıldı', 'Front post spacing limit exceeded',
        `${i + 1}-${i + 2}. ön dikmeler arası ${Math.round(clear)} mm; tavsiye edilen üst sınır 4000 mm.`,
        `Front posts ${i + 1}-${i + 2}: ${Math.round(clear)} mm; the recommended upper limit is 4000 mm.`,
        { kind: 'dimension', dimId: `front_post_gap_${i + 1}` }
      );
    }

    sideGeometryEntriesForChecks(d).forEach(({ key, geom, sideIndex }) => (geom.gaps || []).forEach((gap, i) => {
      if (Number(gap.width) > 5000) warning(
        'side-support-gap-over-5000', 'Destek dikmesi aralığı sınırı aşıldı', 'Support-post spacing limit exceeded',
        `${sidePositionLabel(key, sideIndex)}, yan aralık ${i + 1}: ${Math.round(gap.width)} mm; tavsiye edilen üst sınır 5000 mm.`,
        `${sidePositionLabel(key, sideIndex)}, side gap ${i + 1}: ${Math.round(gap.width)} mm; the recommended upper limit is 5000 mm.`,
        { kind: 'dimension', dimId: `side_gap_${key}_${sideIndex}_${i}`, sideViewKey: key }
      );
    }));

    const parapet = Number(context.form.parapetHeight) || 0;
    const front = numericTokens(context.form.frontHeight).reduce((value, item) => Math.max(value, item), 0);
    if (parapet > front) warning(
      'parapet-over-front-height', 'Parapet yüksekliği ön H değerini aşıyor', 'Parapet exceeds front height',
      `Parapet ${parapet} mm, ön H ${front} mm.`, `Parapet is ${parapet} mm, front height is ${front} mm.`,
      { kind: 'dimension', dimId: 'front_parapet_height_info' }
    );
    return issues;
  }

  function validateSegmentedParapetsAndExtensions(context) {
    const issues = [];
    const d = context.drawing && context.drawing.input;
    if (!d) return issues;
    const warning = (code, trTitle, enTitle, trDetail, enDetail, target) => issues.push(makeDrawingIssue(code, 'warning', trTitle, enTitle, trDetail, enDetail, target));
    const frontHeight = Number(d.frontHeight) || 0;
    const rawState = context.form && context.form.__parapetSegments && typeof context.form.__parapetSegments === 'object' ? context.form.__parapetSegments : {};
    const inspect = (list, length, labelTr, labelEn, view, sideIndex = 0) => {
      const items = Array.isArray(list) && list.length ? list.map(item => ({ ...item })).sort((a,b)=>(Number(a.start)||0)-(Number(b.start)||0)) : [];
      items.forEach((item, index) => {
        const start = Number(item.start), end = Number(item.end), height = Number(item.height);
        const target = { kind: 'parapet', segmentId: String(item.id || '') };
        if (!(end > start)) warning('parapet-nonpositive-width', 'Parapet parçası genişliği geçersiz', 'Invalid parapet segment width', `${labelTr} ${index + 1}. parçasının genişliği sıfır veya negatiftir.`, `${labelEn} segment ${index + 1} has zero or negative width.`, target);
        if (start < -0.001 || end > length + 0.001) warning('parapet-outside-range', 'Parapet sistem sınırının dışında', 'Parapet is outside the system range', `${labelTr} ${index + 1}. parçası 0–${Math.round(length)} mm sınırının dışına taşıyor.`, `${labelEn} segment ${index + 1} exceeds the 0–${Math.round(length)} mm range.`, target);
        if (height > frontHeight + 0.001) warning('parapet-segment-over-front-height', 'Parapet yüksekliği ön H değerini aşıyor', 'Parapet exceeds front height', `${labelTr} ${index + 1}. parçası ${Math.round(height)} mm; ön H ${Math.round(frontHeight)} mm.`, `${labelEn} segment ${index + 1} is ${Math.round(height)} mm; front height is ${Math.round(frontHeight)} mm.`, target);
        if (index > 0) {
          const previous = items[index - 1];
          const delta = start - Number(previous.end);
          if (delta < -0.001) warning('parapet-segment-overlap', 'Parapet parçaları üst üste geliyor', 'Parapet segments overlap', `${labelTr} ${index}. ve ${index + 1}. parçaları ${Math.round(Math.abs(delta))} mm üst üste geliyor.`, `${labelEn} segments ${index} and ${index + 1} overlap by ${Math.round(Math.abs(delta))} mm.`, target);
          else if (delta > 0.001) warning('parapet-segment-gap', 'Parapet parçaları arasında boşluk var', 'Gap between parapet segments', `${labelTr} ${index}. ve ${index + 1}. parçaları arasında ${Math.round(delta)} mm boşluk var.`, `${labelEn} segments ${index} and ${index + 1} have a ${Math.round(delta)} mm gap.`, target);
        }
      });
      if (items.length) {
        if (Number(items[0].start) > 0.001) warning('parapet-leading-gap', 'Parapet başlangıcında boşluk var', 'Gap at parapet start', `${labelTr} başlangıcında ${Math.round(Number(items[0].start))} mm parapetsiz bölüm var.`, `${labelEn} has a ${Math.round(Number(items[0].start))} mm uncovered section at the start.`, { kind: 'parapet', segmentId: String(items[0].id || '') });
        if (Number(items[items.length - 1].end) < length - 0.001) warning('parapet-trailing-gap', 'Parapet bitişinde boşluk var', 'Gap at parapet end', `${labelTr} bitişinde ${Math.round(length - Number(items[items.length - 1].end))} mm parapetsiz bölüm var.`, `${labelEn} has a ${Math.round(length - Number(items[items.length - 1].end))} mm uncovered section at the end.`, { kind: 'parapet', segmentId: String(items[items.length - 1].id || '') });
      }
    };
    if (normalizeYesNo(context.form.parapet) === 'EVET') {
      inspect(rawState.front || (d.parapetSegments && d.parapetSegments.front), Number(d.width) || 0, 'Ön görünüş parapeti', 'Front-view parapet', 'front');
      (d.positions || []).slice(0, Number(d.sidePositionCount) || 1).forEach((position, index) => {
        const source = rawState.side && (rawState.side[String(index)] || rawState.side[index]);
        inspect(source || (d.parapetSegments && d.parapetSegments.side && d.parapetSegments.side[String(index)]), Number(position.opening) || 0, `Poz ${index + 1} sol/ara yan parapeti`, `Position ${index + 1} left/intermediate side parapet`, 'side', index);
      });
      const rightIndex = Math.max(0, Number(d.sidePositionCount || 1) - 1);
      const rightPosition = Array.isArray(d.positions) ? (d.positions[rightIndex] || d.positions[0]) : null;
      const rightSource = rawState.side && rawState.side.right;
      const rightFallback = d.parapetSegments && d.parapetSegments.side && d.parapetSegments.side.right;
      if (rightPosition && (sideFeatureValue('glassTrack', 'right') || sideFeatureValue('triangle', 'right') || (Array.isArray(rightSource) && rightSource.length) || (Array.isArray(rightFallback) && rightFallback.length))) {
        inspect(rightSource || rightFallback, Number(rightPosition.opening) || 0, 'Sağ yan parapeti', 'Right-side parapet', 'side', rightIndex);
      }
    }
    (Array.isArray(context.form.__frontPostExtensions) ? context.form.__frontPostExtensions : []).forEach((value, index) => {
      const extension = Number(value) || 0;
      if (extension > frontHeight) warning('front-post-extension-deep', 'Dikme zeminin çok altına uzatılmış', 'Post extends far below floor level', `${index + 1}. ön dikme ${Math.round(extension)} mm -Y yönüne uzatılmış. Üretim öncesi temel/gömme detayı kontrol edilmeli.`, `Front post ${index + 1} extends ${Math.round(extension)} mm in the -Y direction. Check the foundation/embed detail before production.`, { kind: 'frontPost', postIndex: index });
    });
    const sidePostsState = context.form.__sidePosts && typeof context.form.__sidePosts === 'object' ? context.form.__sidePosts : {};
    Object.entries(sidePostsState).forEach(([rawSideKey, items]) => {
      const sideKey = normalizeSideViewKey(rawSideKey, Number(rawSideKey) || 0);
      const sideIndex = sideKey === 'right' ? Math.max(0, Number(d.sidePositionCount || 1) - 1) : (Number(sideKey) || 0);
      const label = sidePositionLabel(sideKey, sideIndex);
      (Array.isArray(items) ? items : []).forEach((item, index) => {
        const extension = Number(item && item.extension);
        if (!Number.isFinite(extension) || Math.abs(extension) < 0.001) return;
        const postId = String((item && item.id) || `side_${sideKey}_${index}`);
        const target = { kind: 'sidePost', sidePostId: postId, sideIndex, sideViewKey: sideKey };
        if (extension > frontHeight) warning('side-post-extension-deep', 'Destek dikmesi zeminin çok altına uzatılmış', 'Support post extends far below floor level', `${label} destek dikmesi ${Math.round(extension)} mm -Y yönüne uzatılmış. Üretim öncesi temel/gömme detayı kontrol edilmeli.`, `A support post in the ${label} extends ${Math.round(extension)} mm in the -Y direction. Check the foundation/embed detail before production.`, target);
        if (extension < -frontHeight) warning('side-post-shortening-excessive', 'Destek dikmesi aşırı kısaltılmış', 'Support post is shortened excessively', `${label} destek dikmesi alttan ${Math.round(Math.abs(extension))} mm kısaltılmış. Profil boyu üretim için kontrol edilmeli.`, `A support post in the ${label} is shortened by ${Math.round(Math.abs(extension))} mm from the lower end. Check the resulting profile length.`, target);
      });
    });
    const custom = context.form.__customRayPositions && typeof context.form.__customRayPositions === 'object' ? context.form.__customRayPositions : {};
    (d.systems || []).forEach((sys, systemIndex) => {
      const rays = Array.isArray(custom[String(systemIndex)]) ? custom[String(systemIndex)].map(Number) : null;
      if (!rays || rays.length !== Number(sys.rayCount)) return;
      const expectedFirst = Number(sys.rayAreaStartX);
      const expectedLast = Number(sys.rayAreaEndX) - 80;
      if (Math.abs(rays[0] - expectedFirst) > 0.01 || Math.abs(rays[rays.length - 1] - expectedLast) > 0.01) warning('outer-ray-moved', 'İlk veya son ray sabit konumdan ayrılmış', 'First or last rail moved from its fixed position', `Poz ${systemIndex + 1} dış ray konumları sistem sınırlarıyla uyuşmuyor.`, `Position ${systemIndex + 1} outer rail positions do not match the system boundaries.`, null);
    });
    return issues;
  }

  const DRAWING_PRODUCTION_VALIDATORS = [
    validateDuplicateZoneProducts,
    validatePostOverlaps,
    validateNonPositiveDimensions,
    validateProfilesAgainstGaps,
    validateMissingProductInformation,
    validateDuplicatePozNumbers,
    validateProductFitsOpening,
    validateTriangleProductConflicts,
    validatePergolaProductionRules,
    validateSegmentedParapetsAndExtensions
  ];

  function runDrawingProductionChecks(drawing) {
    const context = { drawing: drawing || null, form: collectForm(), products: allProductRecords() };
    return DRAWING_PRODUCTION_VALIDATORS.flatMap(validator => {
      try { return validator(context) || []; }
      catch (err) { return [makeDrawingIssue('validator-failure', 'warning', 'Kontrol tamamlanamadı', 'A validation check could not be completed', err.message || String(err), err.message || String(err), null)]; }
    });
  }

  function clearDrawingCheckHighlight() {
    if (drawingCheckHighlightTimer) window.clearTimeout(drawingCheckHighlightTimer);
    drawingCheckHighlightTimer = null;
    preview.querySelectorAll('.drawing-check-highlight').forEach(node => node.classList.remove('drawing-check-highlight'));
    preview.classList.remove('drawing-check-canvas-highlight');
  }

  function selectorAttribute(value) {
    return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function highlightDrawingCheckIssue(issue) {
    clearDrawingCheckHighlight();
    const target = issue && issue.target;
    let nodes = [];
    if (target && target.kind === 'product' && target.placementId) nodes = Array.from(preview.querySelectorAll(`[data-placement-id="${selectorAttribute(target.placementId)}"]`));
    else if (target && target.kind === 'frontPost') nodes = Array.from(preview.querySelectorAll(`[data-interaction-type="frontPostProfileEditor"][data-post-index="${Number(target.postIndex) || 0}"],[data-interaction-type="postEditor"][data-post-index="${Number(target.postIndex) || 0}"]`));
    else if (target && target.kind === 'sidePost' && target.sidePostId) nodes = Array.from(preview.querySelectorAll(`[data-side-post-id="${selectorAttribute(target.sidePostId)}"]`));
    else if (target && target.kind === 'parapet' && target.segmentId) nodes = Array.from(preview.querySelectorAll(`[data-interaction-type="parapetEditor"][data-parapet-segment-id="${selectorAttribute(target.segmentId)}"]`));
    else if (target && target.kind === 'dimension' && target.dimId) nodes = Array.from(preview.querySelectorAll(`[data-dim-id="${selectorAttribute(target.dimId)}"]`));
    nodes = nodes.flatMap(node => {
      const group = node.closest && (node.closest('.preview-product-zone') || node.closest('.preview-post-zone') || node.closest('.editable-dimension') || node.closest('g'));
      return group && group !== node ? [node, group] : [node];
    });
    if (!nodes.length) preview.classList.add('drawing-check-canvas-highlight');
    else nodes.forEach(node => node.classList.add('drawing-check-highlight'));
    drawingCheckHighlightTimer = window.setTimeout(clearDrawingCheckHighlight, 5000);
  }

  function ensureDrawingCheckOverlay() {
    let overlay = $('drawingCheckOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'drawingCheckOverlay';
    overlay.className = 'dim-edit-overlay drawing-check-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `<section class="dim-edit-card drawing-check-card" role="dialog" aria-modal="true" aria-labelledby="drawingCheckTitle">
      <div class="drawing-check-head"><div><div id="drawingCheckTitle" class="dim-edit-title">Çizimi Kontrol Et</div><div id="drawingCheckSub" class="drawing-check-sub"></div></div><button id="drawingCheckCloseTop" type="button" class="sliding-modal-close" aria-label="Kapat"><span aria-hidden="true"></span></button></div>
      <div id="drawingCheckSummary" class="drawing-check-summary"></div>
      <div id="drawingCheckList" class="drawing-check-list"></div>
      <div class="dim-edit-actions"><button id="drawingCheckRerun" type="button" class="dim-edit-cancel">Tekrar Kontrol Et</button><button id="drawingCheckClose" type="button" class="dim-edit-apply">Kapat</button></div>
    </section>`;
    previewPanel.appendChild(overlay);
    const close = () => { overlay.hidden = true; clearDrawingCheckHighlight(); focusPreviewCanvas(); };
    overlay.querySelector('#drawingCheckClose').addEventListener('click', close);
    overlay.querySelector('#drawingCheckCloseTop').addEventListener('click', close);
    overlay.querySelector('#drawingCheckRerun').addEventListener('click', checkDrawingForProduction);
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) close(); });
    overlay.addEventListener('keydown', evt => { if (evt.key === 'Escape') { evt.preventDefault(); close(); } });
    overlay.querySelector('#drawingCheckList').addEventListener('click', evt => {
      const row = evt.target && evt.target.closest ? evt.target.closest('[data-check-index]') : null;
      if (!row) return;
      const issue = Array.isArray(overlay._issues) ? overlay._issues[Number(row.dataset.checkIndex)] : null;
      if (issue) highlightDrawingCheckIssue(issue);
    });
    return overlay;
  }

  function showDrawingCheckResults(issues, drawingAvailable) {
    const overlay = ensureDrawingCheckOverlay();
    const isEn = currentLanguage === 'en';
    const errors = issues.filter(issue => issue.severity === 'error').length;
    const warnings = issues.length - errors;
    overlay._issues = issues;
    overlay.querySelector('#drawingCheckTitle').textContent = isEn ? 'Check Drawing' : 'Çizimi Kontrol Et';
    overlay.querySelector('#drawingCheckSub').textContent = isEn ? 'Advisory production checks for the pergola, sliding and guillotine products. Warnings never block drawing generation.' : 'Pergola, sürme ve giyotinler için tavsiye niteliğinde üretim kontrolleri. Uyarılar çizim oluşturmayı engellemez.';
    overlay.querySelector('#drawingCheckRerun').textContent = isEn ? 'Check Again' : 'Tekrar Kontrol Et';
    overlay.querySelector('#drawingCheckClose').textContent = isEn ? 'Close' : 'Kapat';
    overlay.querySelector('#drawingCheckCloseTop').setAttribute('aria-label', isEn ? 'Close' : 'Kapat');
    const summary = overlay.querySelector('#drawingCheckSummary');
    summary.className = `drawing-check-summary ${errors ? 'has-errors' : warnings ? 'has-warnings' : 'is-clean'}`;
    summary.innerHTML = issues.length
      ? `<strong>${isEn ? `${errors} error(s), ${warnings} warning(s)` : `${errors} hata, ${warnings} uyarı`}</strong><span>${isEn ? 'Click an item to highlight the related element.' : 'İlgili elemanı vurgulamak için sonuca tıkla.'}</span>`
      : `<strong>${isEn ? 'No issue found' : 'Sorun bulunmadı'}</strong><span>${isEn ? 'The drawing passed the currently defined production checks.' : 'Çizim, şu an tanımlı üretim kontrollerinden geçti.'}</span>`;
    const list = overlay.querySelector('#drawingCheckList');
    list.innerHTML = issues.length ? issues.map((issue, index) => `<button type="button" class="drawing-check-row is-${issue.severity}" data-check-index="${index}"><span class="drawing-check-icon" aria-hidden="true">${issue.severity === 'warning' ? '!' : '×'}</span><span class="drawing-check-copy"><strong>${escapeHtml(issue.title)}</strong><small>${escapeHtml(issue.detail)}</small></span><span class="drawing-check-locate">${isEn ? 'Highlight' : 'Vurgula'}</span></button>`).join('') : `<div class="drawing-check-empty">✓ ${isEn ? 'Ready according to current rules.' : 'Mevcut kurallara göre hazır.'}</div>`;
    if (!drawingAvailable && issues.length) list.insertAdjacentHTML('afterbegin', `<div class="drawing-check-stale-note">${isEn ? 'The current form could not be rebuilt; geometry-dependent checks were skipped.' : 'Mevcut form yeniden çizilemedi; geometriye bağlı kontroller atlandı.'}</div>`);
    overlay.hidden = false;
    window.setTimeout(() => overlay.querySelector('#drawingCheckClose').focus({ preventScroll: true }), 20);
  }

  function checkDrawingForProduction() {
    if (toolboxSelectionMode) cancelToolboxSelection();
    const drawing = updatePreview(false);
    const issues = runDrawingProductionChecks(drawing);
    showDrawingCheckResults(issues, !!drawing);
    statusText.textContent = issues.length
      ? (currentLanguage === 'en' ? `${issues.length} production check result(s) found.` : `${issues.length} üretim kontrol sonucu bulundu.`)
      : (currentLanguage === 'en' ? 'No issue was found in the current production checks.' : 'Mevcut üretim kontrollerinde sorun bulunmadı.');
  }

  function currentFrontPostCenters() {
    const fromDrawing = lastDrawing && lastDrawing.input && Array.isArray(lastDrawing.input.postCenterXs)
      ? lastDrawing.input.postCenterXs.map(Number)
      : [];
    if (Array.isArray(customFrontPostCenters) && customFrontPostCenters.length === fromDrawing.length) {
      return customFrontPostCenters.map(Number);
    }
    return fromDrawing;
  }


  function currentFrontPostProfiles(count = null) {
    const n = count == null ? currentFrontPostCenters().length : Math.max(0, Number(count) || 0);
    return Array.from({ length: n }, (_, i) => frontPostProfiles[i] ? sanitizeGlassTrackProfile(frontPostProfiles[i]) : null);
  }

  function frontPostWidthAt(index) {
    const d = lastDrawing && lastDrawing.input ? lastDrawing.input : {};
    const widths = Array.isArray(d.frontPostWidths) ? d.frontPostWidths : [];
    return Math.max(1, Number(widths[index]) || 100);
  }

  function shiftFrontPlacementsAfterInsert(gapIndex) {
    const shift = item => {
      const idx = Number(item.gapIndex) || 0;
      if (idx === gapIndex) return null;
      return { ...item, gapIndex: idx > gapIndex ? idx + 1 : idx };
    };
    slidingPlacements = slidingPlacements.map(shift).filter(Boolean);
    guillotinePlacements = guillotinePlacements.map(shift).filter(Boolean);
    zipScreenPlacements = zipScreenPlacements.map(shift).filter(Boolean);
  }

  function insertFrontPostInGap(meta, profile = null) {
    const centers = currentFrontPostCenters();
    const gapIndex = Math.max(0, Number(meta.index) || 0);
    if (gapIndex >= centers.length - 1) throw new Error(currentLanguage === 'en' ? 'Front post gap not found.' : 'Ön dikme aralığı bulunamadı.');
    const leftFace = centers[gapIndex] + frontPostWidthAt(gapIndex) / 2;
    const rightFace = centers[gapIndex + 1] - frontPostWidthAt(gapIndex + 1) / 2;
    const nextProfile = profile ? sanitizeGlassTrackProfile(profile) : null;
    const nextWidth = nextProfile ? nextProfile.en : 100;
    if (rightFace - leftFace + 0.001 < nextWidth) throw new Error(currentLanguage === 'en' ? 'The selected gap is narrower than the post profile.' : 'Seçilen aralık dikme profilinden daha dar.');
    const center = (leftFace + rightFace) / 2;
    centers.splice(gapIndex + 1, 0, center);
    const profiles = currentFrontPostProfiles(centers.length - 1);
    profiles.splice(gapIndex + 1, 0, nextProfile);
    frontPostExtensions.splice(gapIndex + 1, 0, 0);
    customFrontPostCenters = centers;
    frontPostProfiles = profiles;
    const postEl = $('postCount');
    if (postEl) { postEl.value = String(centers.length); postEl.dataset.userEdited = 'true'; }
    shiftFrontPlacementsAfterInsert(gapIndex);
  }

  function deleteFrontPost(postIndex) {
    const centers = currentFrontPostCenters();
    const idx = Math.max(0, Number(postIndex) || 0);
    if (centers.length <= 2) throw new Error(currentLanguage === 'en' ? 'At least two front posts must remain.' : 'En az iki ön dikme kalmalıdır.');
    if (idx >= centers.length) throw new Error(currentLanguage === 'en' ? 'Front post not found.' : 'Ön dikme bulunamadı.');
    centers.splice(idx, 1);
    const profiles = currentFrontPostProfiles(centers.length + 1);
    profiles.splice(idx, 1);
    frontPostExtensions.splice(idx, 1);
    const remap = item => {
      const gap = Number(item.gapIndex) || 0;
      const leftAdjacent = Math.max(0, idx - 1);
      if (gap === leftAdjacent || gap === idx) return null;
      return { ...item, gapIndex: gap > idx ? gap - 1 : gap };
    };
    slidingPlacements = slidingPlacements.map(remap).filter(Boolean);
    guillotinePlacements = guillotinePlacements.map(remap).filter(Boolean);
    zipScreenPlacements = zipScreenPlacements.map(remap).filter(Boolean);
    customFrontPostCenters = centers;
    frontPostProfiles = profiles;
    const postEl = $('postCount');
    if (postEl) { postEl.value = String(centers.length); postEl.dataset.userEdited = 'true'; }
  }

  function nextSlidingPozNo() {
    const used = new Set([...slidingPlacements, ...sideSlidingPlacements].map(item => String(item.pozNo || '').toUpperCase()));
    let n = 1;
    while (used.has(`S${String(n).padStart(2, '0')}`)) n += 1;
    return `S${String(n).padStart(2, '0')}`;
  }

  function slidingPanelCount(width, openingType) {
    let count = Math.max(2, Math.ceil(Math.max(1, Number(width) || 1) / 1200));
    if (String(openingType || '').toUpperCase() === 'CENTER OPENING') {
      count = Math.max(4, count);
      if (count % 2 !== 0) count += 1;
    }
    return count;
  }

  function normalizeSlidingPanelCount(value, openingType) {
    let count = Math.round(Number(value));
    if (!Number.isFinite(count)) return null;
    const centered = String(openingType || '').toUpperCase() === 'CENTER OPENING';
    if (count < (centered ? 4 : 2)) return null;
    if (centered && count % 2 !== 0) return null;
    return count;
  }

  function resizeRayInterval(meta, targetValue) {
    const target = Number(targetValue);
    if (!(target > 0)) throw new Error(currentLanguage === 'en' ? 'Enter a positive ray dimension.' : 'Pozitif bir ray ölçüsü gir.');
    const d = lastDrawing && lastDrawing.input;
    if (!d || !Array.isArray(d.systems)) throw new Error(currentLanguage === 'en' ? 'Ray geometry could not be found.' : 'Ray geometrisi bulunamadı.');

    const s = Number(meta.raySystemIndex ?? meta.index ?? 0);
    const segment = Number(meta.rayIntervalIndex ?? 0);
    const sys = d.systems[s];
    if (!sys || !Array.isArray(sys.rays)) throw new Error(currentLanguage === 'en' ? 'Ray system could not be found.' : 'Ray sistemi bulunamadı.');
    if (sys.rays.length <= 2) throw new Error(currentLanguage === 'en' ? 'Two-ray spacing editing will be defined later.' : 'İki raylı sistem mesafe düzenleme kuralı daha sonra tanımlanacak.');

    const rays = (customRayPositions && Array.isArray(customRayPositions[s]) ? customRayPositions[s].slice() : sys.rays.slice()).map(Number);
    const rayCount = rays.length;
    const segmentCount = rayCount - 1;
    if (segment < 0 || segment >= segmentCount) throw new Error(currentLanguage === 'en' ? 'Ray dimension could not be found.' : 'Ray ölçüsü bulunamadı.');

    const leftOuter = rays[0];
    const rightOuter = rays[rayCount - 1] + 80;
    const centers = rays.map(x => x + 40);

    if (segment === 0) {
      centers[1] = leftOuter + target;
    } else if (segment === segmentCount - 1) {
      centers[rayCount - 2] = rightOuter - target;
    } else {
      // Dört raylı sistemde orta bölme merkezini korur; iki orta ray
      // hedef ölçünün yarısı kadar -X / +X yönünde simetrik hareket eder.
      const leftIndex = segment;
      const rightIndex = segment + 1;
      const midpoint = (centers[leftIndex] + centers[rightIndex]) / 2;
      centers[leftIndex] = midpoint - target / 2;
      centers[rightIndex] = midpoint + target / 2;
    }

    const next = centers.map(c => c - 40);
    next[0] = leftOuter;
    next[next.length - 1] = rightOuter - 80;

    // Üretim tavsiyeleri çizimi engellemez; yalnız fiziksel ray çakışması engellenir.
    for (let i = 1; i < next.length; i += 1) {
      if (next[i] < next[i - 1] + 80 - 0.001) {
        throw new Error(currentLanguage === 'en' ? 'The entered value causes the rays to overlap.' : 'Girilen değer rayların üst üste gelmesine neden oluyor.');
      }
    }

    customRayPositions = customRayPositions || {};
    customRayPositions[s] = next;
    customFrontPostCenters = null;
  }

  function resizeFrontPostGap(meta, targetGap) {
    const centers = currentFrontPostCenters();
    const gapIndex = Math.max(0, Number(meta.index) || 0);
    if (centers.length < 3) {
      throw new Error(currentLanguage === 'en' ? 'The gap cannot be resized in a two-post system because the first and last posts are fixed.' : 'İki dikmeli sistemde ilk ve son dikme sabit olduğu için aralık değiştirilemez.');
    }
    if (gapIndex >= centers.length - 1) throw new Error(currentLanguage === 'en' ? 'Post gap not found.' : 'Dikme aralığı bulunamadı.');
    const isLastGap = gapIndex === centers.length - 2;
    const leftWidth = frontPostWidthAt(gapIndex);
    const rightWidth = frontPostWidthAt(gapIndex + 1);
    if (isLastGap) {
      const nextX = centers[gapIndex + 1] - rightWidth / 2 - targetGap - leftWidth / 2;
      if (gapIndex > 0) {
        const previousRight = centers[gapIndex - 1] + frontPostWidthAt(gapIndex - 1) / 2;
        if (nextX - leftWidth / 2 < previousRight - 0.001) throw new Error(currentLanguage === 'en' ? 'The entered dimension overlaps the previous post.' : 'Girilen ölçü bir önceki dikmeyle çakışmaya neden oluyor.');
      }
      centers[gapIndex] = nextX;
    } else {
      const nextX = centers[gapIndex] + leftWidth / 2 + targetGap + rightWidth / 2;
      if (gapIndex + 2 < centers.length) {
        const nextLeft = centers[gapIndex + 2] - frontPostWidthAt(gapIndex + 2) / 2;
        if (nextX + rightWidth / 2 > nextLeft + 0.001) throw new Error(currentLanguage === 'en' ? 'The entered dimension overlaps the next post.' : 'Girilen ölçü bir sonraki dikmeyle çakışmaya neden oluyor.');
      }
      centers[gapIndex + 1] = nextX;
    }
    customFrontPostCenters = centers;
    // v8.9.27: Tek bir dikme aralığı değiştirildiğinde mevcut ürün ölçüsü
    // manuel değer olarak korunur. Alan dışına taşarsa Çizimi Kontrol Et uyarır.
  }

  function placementIsSide(meta) {
    return !!meta && ['side-left', 'side-right'].includes(String(meta.placementView || ''));
  }

  function placementMetasFromPending(meta) {
    return Array.isArray(meta && meta.batchMetas) ? meta.batchMetas : (meta ? [meta] : []);
  }

  function productPlacementState() {
    return { slidingPlacements, sideSlidingPlacements, guillotinePlacements, sideGuillotinePlacements, zipScreenPlacements, sideZipScreenPlacements };
  }

  function applyProductPlacementState(next) {
    slidingPlacements = next.slidingPlacements;
    sideSlidingPlacements = next.sideSlidingPlacements;
    guillotinePlacements = next.guillotinePlacements;
    sideGuillotinePlacements = next.sideGuillotinePlacements;
    zipScreenPlacements = next.zipScreenPlacements;
    sideZipScreenPlacements = next.sideZipScreenPlacements;
  }

  function storeProductPlacement(productType, placement) {
    const limit = applicationLimits().maxProducts;
    const next = window.PulumurProductPlacementService.upsertExclusive(productPlacementState(), productType, placement, {
      maxProducts: limit,
      normalizeSideViewKey,
      limitMessage: currentLanguage === 'en' ? `The total product limit is ${limit}.` : `Toplam ürün sınırı ${limit}.`
    });
    applyProductPlacementState(next);
  }

  function storeSlidingPlacement(placement) {
    storeProductPlacement('SLIDING', placement);
  }

  function storeGuillotinePlacement(placement) {
    storeProductPlacement('GUILLOTINE', placement);
  }

  function storeZipScreenPlacement(placement) {
    storeProductPlacement('ZIP_SCREEN', placement);
  }

  function ensureSlidingDetailsOverlay() {
    let overlay = $('slidingDetailsOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'slidingDetailsOverlay';
    overlay.className = 'dim-edit-overlay sliding-details-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <form id="slidingDetailsForm" class="dim-edit-card sliding-details-card">
        <div class="sliding-modal-head">
          <div class="sliding-modal-title"><span class="sliding-title-icon" aria-hidden="true"></span><span data-sliding-text="title">Sliding Details</span></div>
          <button id="slidingDetailsClose" class="sliding-modal-close" type="button" aria-label="Close"><span aria-hidden="true"></span></button>
        </div>
        <div class="sliding-details-grid">
          <section class="sliding-choice-group sliding-series-group" role="group" aria-labelledby="slidingSeriesTitle">
            <div id="slidingSeriesTitle" class="sliding-group-title"><span class="sliding-group-icon icon-series" aria-hidden="true"></span><span data-sliding-text="productSeries">Product Series</span></div>
            <label><input type="radio" name="slidingSeries" value="A SERIES" checked><span data-sliding-text="aSeries">A Series</span></label>
            <label><input type="radio" name="slidingSeries" value="K SERIES"><span data-sliding-text="kSeries">K Series</span></label>
          </section>
          <section class="sliding-choice-group sliding-type-group" role="group" aria-labelledby="slidingTypeTitle">
            <div id="slidingTypeTitle" class="sliding-group-title"><span class="sliding-group-icon icon-type" aria-hidden="true"></span><span data-sliding-text="type">Type</span></div>
            <label><input type="radio" name="slidingType" value="WITH THRESHOLD" checked><span data-sliding-text="withThreshold">With Threshold</span></label>
            <label><input type="radio" name="slidingType" value="WITHOUT THRESHOLD"><span data-sliding-text="withoutThreshold">Without Threshold</span></label>
          </section>
          <section class="sliding-choice-group sliding-opening-group" role="group" aria-labelledby="slidingOpeningTitle">
            <div id="slidingOpeningTitle" class="sliding-group-title"><span class="sliding-group-icon icon-opening" aria-hidden="true"></span><span data-sliding-text="openingType">Opening Type</span></div>
            <label><input type="radio" name="slidingOpening" value="SIDE OPENING" checked><span data-sliding-text="sideOpening">Side Opening</span></label>
            <label><input type="radio" name="slidingOpening" value="CENTER OPENING"><span data-sliding-text="centerOpening">Center Opening</span></label>
          </section>
          <section class="sliding-choice-group sliding-thickness-group" role="group" aria-labelledby="slidingThicknessTitle">
            <div id="slidingThicknessTitle" class="sliding-group-title"><span class="sliding-group-icon icon-thickness" aria-hidden="true"></span><span data-sliding-text="glassThickness">Glass Thickness</span></div>
            <label><input type="radio" name="slidingThickness" value="8 MM"><span data-sliding-text="mm8">8 mm</span></label>
            <label id="slidingThickness10Wrap"><input type="radio" name="slidingThickness" value="10 MM" checked><span data-sliding-text="mm10">10 mm</span></label>
            <label><input type="radio" name="slidingThickness" value="INSULATED GLASS"><span data-sliding-text="insulatedGlass">Insulated Glass</span></label>
          </section>
          <section class="sliding-choice-group sliding-color-group" role="group" aria-labelledby="slidingColorTitle">
            <div id="slidingColorTitle" class="sliding-group-title"><span class="sliding-group-icon icon-color" aria-hidden="true"></span><span data-sliding-text="glassColor">Glass Color</span></div>
            <label><input type="radio" name="slidingColor" value="TRANSPARENT" checked><span data-sliding-text="transparent">Transparent</span></label>
            <label><input type="radio" name="slidingColor" value="GREY"><span data-sliding-text="grey">Grey</span></label>
            <label><input type="radio" name="slidingColor" value="BRONZE"><span data-sliding-text="bronze">Bronze</span></label>
            <label id="slidingLowEWrap"><input type="radio" name="slidingColor" value="LOW-E GLASS" disabled><span data-sliding-text="lowEGlass">Low-e Glass</span></label>
            <label><input type="radio" name="slidingColor" value="OTHER"><span data-sliding-text="other">Other</span></label>
            <div id="slidingOtherRow" class="sliding-other-row" hidden>
              <input id="slidingOtherColor" class="sliding-other-input" type="text" placeholder="Enter custom glass color" autocomplete="off">
            </div>
          </section>
          <div class="sliding-auto-fields">
            <label class="sliding-summary-field sliding-poz-field"><span data-sliding-text="pozNo">Position No.</span><input id="slidingPozNo" type="text" readonly></label>
            <label class="sliding-summary-field"><span><span data-sliding-text="width">Width *</span> <small>(mm)</small></span><input id="slidingWidth" type="text" inputmode="numeric" autocomplete="off"></label>
            <label class="sliding-summary-field"><span><span data-sliding-text="height">Height *</span> <small>(mm)</small></span><input id="slidingHeight" type="text" inputmode="numeric" autocomplete="off"></label>
            <label class="sliding-summary-field sliding-panel-field"><span data-sliding-text="panelCount">Panel Count</span><input id="slidingPanelCount" type="text" inputmode="numeric" autocomplete="off"></label>
          </div>
          <div id="slidingBatchList" class="bulk-selection-list product-batch-list" hidden></div>
        </div>
        <input id="slidingQuantity" type="hidden" value="1">
        <div id="slidingDetailsError" class="dim-edit-error sliding-details-error" aria-live="polite"></div>
        <div class="dim-edit-actions sliding-details-actions">
          <button id="slidingDetailsDelete" type="button" class="dim-edit-delete" hidden>Mevcut Ürünü Sil</button>
          <button id="slidingDetailsCancel" type="button" class="dim-edit-cancel" data-sliding-text="cancel">Cancel</button>
          <button type="submit" class="dim-edit-apply" data-sliding-text="confirm">Confirm</button>
        </div>
      </form>`;
    previewPanel.appendChild(overlay);
    translateSlidingDetailsOverlay(overlay);

    const form = overlay.querySelector('#slidingDetailsForm');
    const otherInput = overlay.querySelector('#slidingOtherColor');
    const error = overlay.querySelector('#slidingDetailsError');

    const checkedValue = name => (overlay.querySelector(`input[name="${name}"]:checked`) || {}).value || '';
    const refreshRules = () => {
      const series = checkedValue('slidingSeries');
      const thickness10 = overlay.querySelector('input[name="slidingThickness"][value="10 MM"]');
      const isK = series === 'K SERIES';
      thickness10.disabled = isK;
      overlay.querySelector('#slidingThickness10Wrap').classList.toggle('is-disabled', isK);
      if (isK && thickness10.checked) overlay.querySelector('input[name="slidingThickness"][value="8 MM"]').checked = true;
      const thickness = checkedValue('slidingThickness');
      const lowE = overlay.querySelector('input[name="slidingColor"][value="LOW-E GLASS"]');
      const lowEActive = thickness === 'INSULATED GLASS';
      lowE.disabled = !lowEActive;
      overlay.querySelector('#slidingLowEWrap').classList.toggle('is-disabled', !lowEActive);
      if (!lowEActive && lowE.checked) overlay.querySelector('input[name="slidingColor"][value="TRANSPARENT"]').checked = true;
      const color = checkedValue('slidingColor');
      overlay.querySelector('#slidingOtherRow').hidden = color !== 'OTHER';
      const openingType = checkedValue('slidingOpening');
      const width = Number(overlay.querySelector('#slidingWidth').value) || 1;
      const mainPanel = overlay.querySelector('#slidingPanelCount');
      if (mainPanel && mainPanel.dataset.manual !== 'true') mainPanel.value = String(slidingPanelCount(width, openingType));
      const batchList = overlay.querySelector('#slidingBatchList');
      if (batchList) {
        batchList.querySelectorAll('.product-batch-row').forEach(row => {
          const widthInput = row.querySelector('[data-batch-field="width"]');
          const panelInput = row.querySelector('[data-batch-field="panel"]');
          if (widthInput && panelInput && panelInput.dataset.manual !== 'true') panelInput.value = String(slidingPanelCount(Number(widthInput.value) || 1, openingType));
        });
      }
      error.textContent = '';
    };

    overlay.querySelectorAll('input[type="radio"]').forEach(radio => radio.addEventListener('change', refreshRules));
    const cleanDimensionInput = input => {
      const clean = String(input.value || '').replace(/[^0-9]/g, '');
      if (input.value !== clean) input.value = clean;
      error.textContent = '';
    };
    [overlay.querySelector('#slidingWidth'), overlay.querySelector('#slidingHeight')].forEach(input => {
      input.addEventListener('input', () => { cleanDimensionInput(input); refreshRules(); });
    });
    overlay.querySelector('#slidingPanelCount').addEventListener('input', evt => {
      cleanDimensionInput(evt.target);
      evt.target.dataset.manual = 'true';
    });
    overlay.querySelector('#slidingBatchList').addEventListener('input', evt => {
      const input = evt.target && evt.target.matches && evt.target.matches('[data-batch-field="width"],[data-batch-field="height"],[data-batch-field="panel"]') ? evt.target : null;
      if (!input) return;
      cleanDimensionInput(input);
      if (input.dataset.batchField === 'panel') {
        input.dataset.manual = 'true';
      } else if (input.dataset.batchField === 'width') {
        const row = input.closest('.product-batch-row');
        const panel = row && row.querySelector('[data-batch-field="panel"]');
        if (panel && panel.dataset.manual !== 'true') panel.value = String(slidingPanelCount(Number(input.value) || 1, checkedValue('slidingOpening')));
      }
    });
    otherInput.addEventListener('input', () => { error.textContent = ''; });

    const close = () => {
      overlay.hidden = true;
      pendingSlidingPlacementMeta = null;
      focusPreviewCanvas();
    };
    overlay.querySelector('#slidingDetailsCancel').addEventListener('click', close);
    overlay.querySelector('#slidingDetailsClose').addEventListener('click', close);
    overlay.querySelector('#slidingDetailsDelete').addEventListener('click', () => {
      const record = pendingSlidingPlacementMeta && pendingSlidingPlacementMeta.editRecord;
      if (!record) return;
      if (!window.confirm(currentLanguage === 'en' ? 'Delete this existing sliding product?' : 'Bu mevcut sürme ürünü silinsin mi?')) return;
      deleteProductRecord(record);
      close();
      updatePreview(false);
      statusText.textContent = currentLanguage === 'en' ? 'Existing product deleted.' : 'Mevcut ürün silindi.';
    });
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) close(); });
    overlay.addEventListener('keydown', evt => { if (evt.key === 'Escape') { evt.preventDefault(); close(); } });

    form.addEventListener('submit', evt => {
      evt.preventDefault();
      if (!pendingSlidingPlacementMeta) return;
      const qty = 1;
      let glassColor = checkedValue('slidingColor');
      if (glassColor === 'OTHER') {
        glassColor = String(otherInput.value || '').trim().toUpperCase();
        if (!glassColor) {
          error.textContent = (SLIDING_UI_TEXT[currentLanguage] || SLIDING_UI_TEXT.tr).otherRequired;
          otherInput.focus();
          return;
        }
      }
      const meta = pendingSlidingPlacementMeta;
      const metas = placementMetasFromPending(meta);
      const openingType = checkedValue('slidingOpening');
      const editRecord = meta.editRecord || null;
      const convertRecord = meta.convertRecord || null;
      const pozNos = Array.isArray(meta.batchPozNos) ? meta.batchPozNos : [editRecord ? editRecord.placement.pozNo : overlay.querySelector('#slidingPozNo').value];
      const dimensionInputs = metas.map((item, index) => {
        const widthInput = index === 0
          ? overlay.querySelector('#slidingWidth')
          : overlay.querySelector(`#slidingBatchList [data-batch-index="${index}"][data-batch-field="width"]`);
        const heightInput = index === 0
          ? overlay.querySelector('#slidingHeight')
          : overlay.querySelector(`#slidingBatchList [data-batch-index="${index}"][data-batch-field="height"]`);
        const width = Number(widthInput && widthInput.value);
        const height = Number(heightInput && heightInput.value);
        const panelInput = index === 0
          ? overlay.querySelector('#slidingPanelCount')
          : overlay.querySelector(`#slidingBatchList [data-batch-index="${index}"][data-batch-field="panel"]`);
        const panelCount = normalizeSlidingPanelCount(panelInput && panelInput.value, openingType);
        if (!(width > 0) || !(height > 0) || panelCount === null) return { invalid: true, input: !(width > 0) ? widthInput : (!(height > 0) ? heightInput : panelInput), index, panelInvalid: panelCount === null };
        return { width, height, panelCount, panelCountMode: panelInput && panelInput.dataset.manual === 'true' ? 'MANUAL' : 'AUTO' };
      });
      const invalidDimension = dimensionInputs.find(item => item.invalid);
      if (invalidDimension) {
        const poz = String(pozNos[invalidDimension.index] || '');
        error.textContent = invalidDimension.panelInvalid
          ? (currentLanguage === 'en' ? `Enter a valid panel count for ${poz}. Center opening requires an even value of at least 4; side opening requires at least 2.` : `${poz} için geçerli panel sayısı gir. Ortadan açılımda en az 4 ve çift; yandan açılımda en az 2 olmalıdır.`)
          : (currentLanguage === 'en' ? `Enter positive width and height values for ${poz}.` : `${poz} için pozitif genişlik ve yükseklik gir.`);
        if (invalidDimension.input) invalidDimension.input.focus();
        return;
      }
      const placements = metas.map((item, index) => {
        const isSidePlacement = placementIsSide(item);
        const width = dimensionInputs[index].width;
        const height = dimensionInputs[index].height;
        const existing = editRecord && index === 0 ? editRecord.placement : null;
        return {
          id: existing && existing.id ? existing.id : (isSidePlacement ? `sliding_side_${Date.now()}_${index}_${sideViewKeyFromMeta(item)}_${item.sideZone}` : `sliding_${Date.now()}_${index}_${item.index}`),
          gapIndex: Number(item.index) || 0,
          placementView: isSidePlacement ? (sideViewKeyFromMeta(item) === 'right' ? 'side-right' : 'side-left') : 'front',
          sideIndex: isSidePlacement ? (Number(item.sideIndex) || 0) : null,
          sideViewKey: isSidePlacement ? sideViewKeyFromMeta(item) : '',
          sideZone: isSidePlacement ? String(item.sideZone || '') : '',
          sideGapIndex: isSidePlacement ? (Number(item.sideGapIndex) || 0) : null,
          series: checkedValue('slidingSeries'),
          type: checkedValue('slidingType'),
          openingType,
          glassThickness: checkedValue('slidingThickness'),
          glassColor,
          width,
          height,
          panelCount: dimensionInputs[index].panelCount,
          panelCountMode: dimensionInputs[index].panelCountMode,
          quantity: Math.round(qty),
          pozNo: String(pozNos[index] || pozNos[0] || nextSlidingPozNo()),
          leftPostStandard: isSidePlacement ? true : !frontPostProfiles[Number(item.index) || 0]
        };
      });
      placements.forEach(storeSlidingPlacement);
      overlay.hidden = true;
      pendingSlidingPlacementMeta = null;
      suppressFormPreviewUpdate = true;
      try { updatePreview(false); }
      finally { window.setTimeout(() => { suppressFormPreviewUpdate = false; }, 450); }
      if (editRecord) statusText.textContent = currentLanguage === 'en' ? `${placements[0].pozNo} updated.` : `${placements[0].pozNo} güncellendi.`;
      else if (convertRecord) statusText.textContent = currentLanguage === 'en' ? `${String(convertRecord.placement.pozNo || '')} was converted to ${placements[0].pozNo} sliding product.` : `${String(convertRecord.placement.pozNo || '')}, ${placements[0].pozNo} sürme ürününe dönüştürüldü.`;
      else if (placements.length > 1) statusText.textContent = currentLanguage === 'en' ? `${placements.length} sliding products placed.` : `${placements.length} sürme ürün yerleştirildi.`;
      else {
        const placement = placements[0];
        const slidingTxt = SLIDING_UI_TEXT[currentLanguage] || SLIDING_UI_TEXT.tr;
        statusText.textContent = ['side-left','side-right'].includes(String(placement.placementView || ''))
          ? (currentLanguage === 'en' ? `${placement.pozNo} placed in the ${sidePositionLabel(normalizeSideViewKey(placement.sideViewKey, placement.sideIndex), placement.sideIndex)}.` : `${placement.pozNo} ${sidePositionLabel(normalizeSideViewKey(placement.sideViewKey, placement.sideIndex), placement.sideIndex)} içine yerleştirildi.`)
          : slidingTxt.placed(placement.pozNo, placement.gapIndex + 1, placement.gapIndex + 2);
      }
    });
    return overlay;
  }

  function showSlidingDetailsOverlay(meta, options = {}) {
    const overlay = ensureSlidingDetailsOverlay();
    translateSlidingDetailsOverlay(overlay);
    const batchMetas = Array.isArray(meta && meta.batchMetas) ? meta.batchMetas.map(normalizedProductMeta).filter(Boolean) : null;
    const baseMeta = batchMetas && batchMetas.length ? batchMetas[0] : normalizedProductMeta(meta) || { ...meta };
    const conversionRecords = Array.isArray(options.convertFromRecords) ? options.convertFromRecords : (options.convertFrom ? [options.convertFrom] : []);
    const conversionRecord = conversionRecords[0] || null;
    const record = options.editExisting || meta.editProduct || meta.placementId ? (meta.placementId ? findProductByInteraction(meta) : productRecordForMeta(baseMeta)) : null;
    const existing = record && record.type === 'sliding_glass' ? record.placement : null;
    pendingSlidingPlacementMeta = { ...baseMeta, batchMetas: batchMetas || undefined, editRecord: existing ? record : null, convertRecord: conversionRecord, convertRecords: conversionRecords };
    const allMetas = batchMetas || [baseMeta];
    const gap = Math.max(1, Number(baseMeta.value) || 1);
    const width = Math.max(1, Number(baseMeta.placementWidth) || (gap - 5));
    const d = lastDrawing && lastDrawing.input ? lastDrawing.input : {};
    const height = Math.max(1, Number(baseMeta.placementHeight) || (Number(d.frontHeight || 0) - Number(d.parapetHeight || 0) - 5));
    setRadioGroupValue(overlay, 'slidingSeries', existing && existing.series, 'A SERIES');
    setRadioGroupValue(overlay, 'slidingType', existing && existing.type, 'WITH THRESHOLD');
    setRadioGroupValue(overlay, 'slidingOpening', existing && existing.openingType, 'SIDE OPENING');
    setRadioGroupValue(overlay, 'slidingThickness', existing && existing.glassThickness, '10 MM');
    const knownColors = ['TRANSPARENT','GREY','BRONZE','LOW-E GLASS'];
    const existingColor = existing ? String(existing.glassColor || 'TRANSPARENT') : 'TRANSPARENT';
    setRadioGroupValue(overlay, 'slidingColor', knownColors.includes(existingColor) ? existingColor : (existing ? 'OTHER' : 'TRANSPARENT'), 'TRANSPARENT');
    overlay.querySelector('#slidingOtherColor').value = knownColors.includes(existingColor) ? '' : existingColor;
    overlay.querySelector('#slidingOtherRow').hidden = knownColors.includes(existingColor);
    overlay.querySelector('#slidingWidth').value = String(Math.round(existing ? existing.width : width));
    overlay.querySelector('#slidingHeight').value = String(Math.round(existing ? existing.height : height));
    const mainPanelInput = overlay.querySelector('#slidingPanelCount');
    mainPanelInput.value = String(existing && Number(existing.panelCount) ? existing.panelCount : slidingPanelCount(existing ? existing.width : width, existing ? existing.openingType : 'SIDE OPENING'));
    mainPanelInput.dataset.manual = existing && String(existing.panelCountMode || '').toUpperCase() === 'MANUAL' ? 'true' : 'false';
    overlay.querySelector('#slidingQuantity').value = '1';
    const pozNos = batchMetas ? allocatePozNos('S', batchMetas.length) : [existing ? existing.pozNo : nextSlidingPozNo()];
    pendingSlidingPlacementMeta.batchPozNos = pozNos;
    overlay.querySelector('#slidingPozNo').value = pozNos[0];
    const batchList = overlay.querySelector('#slidingBatchList');
    const slidingTxt = SLIDING_UI_TEXT[currentLanguage] || SLIDING_UI_TEXT.tr;
    batchList.hidden = !(batchMetas && batchMetas.length > 1);
    batchList.innerHTML = batchMetas && batchMetas.length > 1 ? batchMetas.slice(1).map((item, offset) => {
      const index = offset + 1;
      const itemWidth = Math.max(1, Math.round(Number(item.placementWidth) || 1));
      const itemHeight = Math.max(1, Math.round(Number(item.placementHeight) || 1));
      return `<div class="product-batch-row product-batch-row-sliding" data-batch-index="${index}">
        <label class="product-batch-field product-batch-poz"><span>${escapeHtml(slidingTxt.pozNo)}</span><input type="text" value="${escapeHtml(pozNos[index])}" readonly></label>
        <label class="product-batch-field"><span>${escapeHtml(slidingTxt.width)} <small>(mm)</small></span><input type="text" inputmode="numeric" autocomplete="off" data-batch-index="${index}" data-batch-field="width" value="${itemWidth}"></label>
        <label class="product-batch-field"><span>${escapeHtml(slidingTxt.height)} <small>(mm)</small></span><input type="text" inputmode="numeric" autocomplete="off" data-batch-index="${index}" data-batch-field="height" value="${itemHeight}"></label>
        <label class="product-batch-field product-batch-panel"><span>${escapeHtml(slidingTxt.panelCount)}</span><input type="text" inputmode="numeric" autocomplete="off" data-manual="false" data-batch-index="${index}" data-batch-field="panel" value="${slidingPanelCount(itemWidth, existing ? existing.openingType : 'SIDE OPENING')}"></label>
      </div>`;
    }).join('') : '';
    const deleteBtn = overlay.querySelector('#slidingDetailsDelete');
    deleteBtn.hidden = !existing;
    deleteBtn.textContent = currentLanguage === 'en' ? 'Delete Existing Product' : 'Mevcut Ürünü Sil';
    overlay.querySelector('#slidingDetailsError').textContent = '';
    overlay.hidden = false;
    const active = overlay.querySelector('input[name="slidingSeries"]:checked');
    if (active) active.dispatchEvent(new Event('change', { bubbles: true }));
    window.setTimeout(() => { const first = overlay.querySelector('input[name="slidingSeries"]:checked'); if (first) first.focus({ preventScroll: true }); }, 20);
  }


  function nextGuillotinePozNo() {
    const used = new Set([...guillotinePlacements, ...sideGuillotinePlacements].map(item => String(item.pozNo || '').toUpperCase()));
    let n = 1;
    while (used.has(`G${String(n).padStart(2, '0')}`)) n += 1;
    return `G${String(n).padStart(2, '0')}`;
  }

  function ensureGuillotineDetailsOverlay() {
    let overlay = $('guillotineDetailsOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'guillotineDetailsOverlay';
    overlay.className = 'dim-edit-overlay sliding-details-overlay guillotine-details-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <form id="guillotineDetailsForm" class="dim-edit-card sliding-details-card guillotine-details-card">
        <div class="sliding-modal-head">
          <div class="sliding-modal-title"><span class="guillotine-title-icon" aria-hidden="true"></span><span data-guillotine-text="title">Guillotine Details</span></div>
          <button id="guillotineDetailsClose" class="sliding-modal-close" type="button" aria-label="Close"><span aria-hidden="true"></span></button>
        </div>
        <div class="guillotine-details-grid">
          <section class="sliding-choice-group guillotine-series-group" role="group">
            <div class="sliding-group-title"><span class="sliding-group-icon icon-series" aria-hidden="true"></span><span data-guillotine-text="productSeries">Product Series</span></div>
            <label><input type="radio" name="guillotineSeries" value="A SERIES" checked><span data-guillotine-text="aSeries">A Series</span></label>
            <label><input type="radio" name="guillotineSeries" value="K SERIES"><span data-guillotine-text="kSeries">K Series</span></label>
          </section>
          <section class="sliding-choice-group guillotine-type-group" role="group">
            <div class="sliding-group-title"><span class="sliding-group-icon icon-type" aria-hidden="true"></span><span data-guillotine-text="type">Type</span></div>
            <label><input type="radio" name="guillotineType" value="STANDARD" checked><span data-guillotine-text="standard">Standard</span></label>
            <label><input type="radio" name="guillotineType" value="CLEANABLE"><span data-guillotine-text="cleanable">Cleanable</span></label>
            <label id="guillotineUpwardWrap"><input type="radio" name="guillotineType" value="UPWARD COLLECTING"><span data-guillotine-text="upwardCollecting">Upward Collecting</span></label>
          </section>
          <section class="sliding-choice-group guillotine-mechanism-group" role="group">
            <div class="sliding-group-title"><span class="sliding-group-icon icon-mechanism" aria-hidden="true"></span><span data-guillotine-text="mechanism">Mechanism</span></div>
            <label id="guillotineChainWrap"><input type="radio" name="guillotineMechanism" value="CHAIN" checked><span data-guillotine-text="chain">Chain</span></label>
            <label><input type="radio" name="guillotineMechanism" value="BELT"><span data-guillotine-text="belt">Belt</span></label>
          </section>
          <section class="sliding-choice-group guillotine-thickness-group" role="group">
            <div class="sliding-group-title"><span class="sliding-group-icon icon-thickness" aria-hidden="true"></span><span data-guillotine-text="glassThickness">Glass Thickness</span></div>
            <label id="guillotine8mmWrap"><input type="radio" name="guillotineThickness" value="8 MM" checked><span data-guillotine-text="mm8">8 mm</span></label>
            <label><input type="radio" name="guillotineThickness" value="INSULATED GLASS"><span data-guillotine-text="insulatedGlass">Insulated Glass</span></label>
          </section>
          <section class="sliding-choice-group guillotine-panel-group" role="group">
            <div class="sliding-group-title"><span class="sliding-group-icon icon-panel" aria-hidden="true"></span><span data-guillotine-text="panelCount">Panel Type</span></div>
            <label><input type="radio" name="guillotinePanel" value="1+1" checked><span data-guillotine-text="panel11">1+1</span></label>
            <label><input type="radio" name="guillotinePanel" value="1+2"><span data-guillotine-text="panel12">1+2</span></label>
          </section>
          <section class="sliding-choice-group guillotine-motor-direction-group" role="group">
            <div class="sliding-group-title"><span class="sliding-group-icon icon-direction" aria-hidden="true"></span><span data-guillotine-text="motorDirection">Motor Direction</span></div>
            <label><input type="radio" name="guillotineMotorDirection" value="RIGHT" checked><span data-guillotine-text="right">Right</span></label>
            <label><input type="radio" name="guillotineMotorDirection" value="LEFT"><span data-guillotine-text="left">Left</span></label>
          </section>
          <section class="sliding-choice-group guillotine-view-group" role="group">
            <div class="sliding-group-title"><span class="sliding-group-icon icon-view" aria-hidden="true"></span><span data-guillotine-text="view">View</span></div>
            <label><input type="radio" name="guillotineView" value="INSIDE VIEW" checked><span data-guillotine-text="insideView">Inside View</span></label>
            <label><input type="radio" name="guillotineView" value="OUTSIDE VIEW"><span data-guillotine-text="outsideView">Outside View</span></label>
          </section>
          <section class="sliding-choice-group guillotine-motor-type-group" role="group">
            <div class="sliding-group-title"><span class="sliding-group-icon icon-motor" aria-hidden="true"></span><span data-guillotine-text="motorType">Motor Type</span></div>
            <label><input type="radio" name="guillotineMotorType" value="SOMFY RTS" checked><span data-guillotine-text="somfyRts">Somfy RTS</span></label>
            <label><input type="radio" name="guillotineMotorType" value="SOMFY IO"><span data-guillotine-text="somfyIo">Somfy IO</span></label>
            <label><input type="radio" name="guillotineMotorType" value="RISING"><span data-guillotine-text="rising">Rising</span></label>
          </section>
          <section class="sliding-choice-group sliding-color-group guillotine-color-group" role="group">
            <div class="sliding-group-title"><span class="sliding-group-icon icon-color" aria-hidden="true"></span><span data-guillotine-text="glassColor">Glass Color</span></div>
            <label><input type="radio" name="guillotineColor" value="TRANSPARENT" checked><span data-guillotine-text="transparent">Transparent</span></label>
            <label><input type="radio" name="guillotineColor" value="GREY"><span data-guillotine-text="grey">Grey</span></label>
            <label><input type="radio" name="guillotineColor" value="BRONZE"><span data-guillotine-text="bronze">Bronze</span></label>
            <label id="guillotineLowEWrap"><input type="radio" name="guillotineColor" value="LOW-E GLASS" disabled><span data-guillotine-text="lowEGlass">Low-e Glass</span></label>
            <label><input type="radio" name="guillotineColor" value="OTHER"><span data-guillotine-text="other">Other</span></label>
            <div id="guillotineOtherRow" class="sliding-other-row" hidden><input id="guillotineOtherColor" class="sliding-other-input" type="text" autocomplete="off"></div>
          </section>
          <section class="sliding-choice-group guillotine-remote-group" role="group">
            <div class="sliding-group-title"><span class="sliding-group-icon icon-remote" aria-hidden="true"></span><span data-guillotine-text="remoteControl">Remote Control</span></div>
            <label><input type="radio" name="guillotineRemote" value="1 CHANNEL" checked><span data-guillotine-text="ch1">1 Channel</span></label>
            <label><input type="radio" name="guillotineRemote" value="2 CHANNELS"><span data-guillotine-text="ch2">2 Channels</span></label>
            <label><input type="radio" name="guillotineRemote" value="4 CHANNELS"><span data-guillotine-text="ch4">4 Channels</span></label>
            <label><input type="radio" name="guillotineRemote" value="6 CHANNELS"><span data-guillotine-text="ch6">6 Channels</span></label>
            <label><input type="radio" name="guillotineRemote" value="16 CHANNELS"><span data-guillotine-text="ch16">16 Channels</span></label>
            <label><input type="radio" name="guillotineRemote" value="40 CHANNELS"><span data-guillotine-text="ch40">40 Channels</span></label>
          </section>
          <div class="sliding-auto-fields guillotine-auto-fields">
            <label class="sliding-summary-field sliding-poz-field"><span data-guillotine-text="pozNo">Position No.</span><input id="guillotinePozNo" type="text" readonly></label>
            <label class="sliding-summary-field"><span><span data-guillotine-text="width">Width *</span> <small>(mm)</small></span><input id="guillotineWidth" type="text" inputmode="numeric" autocomplete="off"></label>
            <label class="sliding-summary-field"><span><span data-guillotine-text="height">Height *</span> <small>(mm)</small></span><input id="guillotineHeight" type="text" inputmode="numeric" autocomplete="off"></label>
          </div>
          <div id="guillotineBatchList" class="bulk-selection-list product-batch-list" hidden></div>
        </div>
        <div id="guillotineDetailsError" class="dim-edit-error sliding-details-error" aria-live="polite"></div>
        <div class="dim-edit-actions sliding-details-actions">
          <button id="guillotineDetailsDelete" type="button" class="dim-edit-delete" hidden>Mevcut Ürünü Sil</button>
          <button id="guillotineDetailsCancel" type="button" class="dim-edit-cancel" data-guillotine-text="cancel">Cancel</button>
          <button type="submit" class="dim-edit-apply" data-guillotine-text="confirm">Confirm</button>
        </div>
      </form>`;
    previewPanel.appendChild(overlay);
    translateGuillotineDetailsOverlay(overlay);

    const form = overlay.querySelector('#guillotineDetailsForm');
    const error = overlay.querySelector('#guillotineDetailsError');
    const otherInput = overlay.querySelector('#guillotineOtherColor');
    const checkedValue = name => (overlay.querySelector(`input[name="${name}"]:checked`) || {}).value || '';
    const setDisabled = (wrapId, input, disabled) => {
      input.disabled = disabled;
      overlay.querySelector(`#${wrapId}`).classList.toggle('is-disabled', disabled);
    };
    const refreshRules = () => {
      const isK = checkedValue('guillotineSeries') === 'K SERIES';
      const mm8 = overlay.querySelector('input[name="guillotineThickness"][value="8 MM"]');
      const insulated = overlay.querySelector('input[name="guillotineThickness"][value="INSULATED GLASS"]');
      setDisabled('guillotine8mmWrap', mm8, isK);
      if (isK && mm8.checked) insulated.checked = true;
      const upward = overlay.querySelector('input[name="guillotineType"][value="UPWARD COLLECTING"]');
      setDisabled('guillotineUpwardWrap', upward, isK);
      if (isK && upward.checked) overlay.querySelector('input[name="guillotineType"][value="STANDARD"]').checked = true;
      const chain = overlay.querySelector('input[name="guillotineMechanism"][value="CHAIN"]');
      setDisabled('guillotineChainWrap', chain, isK);
      if (isK && chain.checked) overlay.querySelector('input[name="guillotineMechanism"][value="BELT"]').checked = true;
      const lowE = overlay.querySelector('input[name="guillotineColor"][value="LOW-E GLASS"]');
      const lowEActive = checkedValue('guillotineThickness') === 'INSULATED GLASS';
      setDisabled('guillotineLowEWrap', lowE, !lowEActive);
      if (!lowEActive && lowE.checked) overlay.querySelector('input[name="guillotineColor"][value="TRANSPARENT"]').checked = true;
      overlay.querySelector('#guillotineOtherRow').hidden = checkedValue('guillotineColor') !== 'OTHER';
      error.textContent = '';
    };
    overlay.querySelectorAll('input[type="radio"]').forEach(radio => radio.addEventListener('change', refreshRules));
    const cleanDimensionInput = input => {
      const clean = String(input.value || '').replace(/[^0-9]/g, '');
      if (input.value !== clean) input.value = clean;
      error.textContent = '';
    };
    [overlay.querySelector('#guillotineWidth'), overlay.querySelector('#guillotineHeight')].forEach(input => {
      input.addEventListener('input', () => cleanDimensionInput(input));
    });
    overlay.querySelector('#guillotineBatchList').addEventListener('input', evt => {
      const input = evt.target && evt.target.matches && evt.target.matches('[data-batch-field="width"],[data-batch-field="height"]') ? evt.target : null;
      if (input) cleanDimensionInput(input);
    });
    otherInput.addEventListener('input', () => { error.textContent = ''; });
    const close = () => { overlay.hidden = true; pendingGuillotinePlacementMeta = null; focusPreviewCanvas(); };
    overlay.querySelector('#guillotineDetailsCancel').addEventListener('click', close);
    overlay.querySelector('#guillotineDetailsClose').addEventListener('click', close);
    overlay.querySelector('#guillotineDetailsDelete').addEventListener('click', () => {
      const record = pendingGuillotinePlacementMeta && pendingGuillotinePlacementMeta.editRecord;
      if (!record) return;
      if (!window.confirm(currentLanguage === 'en' ? 'Delete this existing guillotine product?' : 'Bu mevcut giyotin ürünü silinsin mi?')) return;
      deleteProductRecord(record);
      close();
      updatePreview(false);
      statusText.textContent = currentLanguage === 'en' ? 'Existing product deleted.' : 'Mevcut ürün silindi.';
    });
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) close(); });
    overlay.addEventListener('keydown', evt => { if (evt.key === 'Escape') { evt.preventDefault(); close(); } });
    form.addEventListener('submit', evt => {
      evt.preventDefault();
      if (!pendingGuillotinePlacementMeta) return;
      let glassColor = checkedValue('guillotineColor');
      if (glassColor === 'OTHER') {
        glassColor = String(otherInput.value || '').trim().toUpperCase();
        if (!glassColor) {
          error.textContent = (GUILLOTINE_UI_TEXT[currentLanguage] || GUILLOTINE_UI_TEXT.tr).otherRequired;
          otherInput.focus();
          return;
        }
      }
      const meta = pendingGuillotinePlacementMeta;
      const metas = placementMetasFromPending(meta);
      const editRecord = meta.editRecord || null;
      const convertRecord = meta.convertRecord || null;
      const pozNos = Array.isArray(meta.batchPozNos) ? meta.batchPozNos : [editRecord ? editRecord.placement.pozNo : overlay.querySelector('#guillotinePozNo').value];
      const dimensionInputs = metas.map((item, index) => {
        const widthInput = index === 0
          ? overlay.querySelector('#guillotineWidth')
          : overlay.querySelector(`#guillotineBatchList [data-batch-index="${index}"][data-batch-field="width"]`);
        const heightInput = index === 0
          ? overlay.querySelector('#guillotineHeight')
          : overlay.querySelector(`#guillotineBatchList [data-batch-index="${index}"][data-batch-field="height"]`);
        const width = Number(widthInput && widthInput.value);
        const height = Number(heightInput && heightInput.value);
        if (!(width > 0) || !(height > 0)) return { invalid: true, input: !(width > 0) ? widthInput : heightInput, index };
        return { width, height };
      });
      const invalidDimension = dimensionInputs.find(item => item.invalid);
      if (invalidDimension) {
        const poz = String(pozNos[invalidDimension.index] || '');
        error.textContent = currentLanguage === 'en' ? `Enter positive width and height values for ${poz}.` : `${poz} için pozitif genişlik ve yükseklik gir.`;
        if (invalidDimension.input) invalidDimension.input.focus();
        return;
      }
      const placements = metas.map((item, index) => {
        const isSidePlacement = placementIsSide(item);
        const existing = editRecord && index === 0 ? editRecord.placement : null;
        return {
          id: existing && existing.id ? existing.id : (isSidePlacement ? `guillotine_side_${Date.now()}_${index}_${sideViewKeyFromMeta(item)}_${item.sideZone}` : `guillotine_${Date.now()}_${index}_${item.index}`),
          gapIndex: Number(item.index) || 0,
          placementView: isSidePlacement ? (sideViewKeyFromMeta(item) === 'right' ? 'side-right' : 'side-left') : 'front',
          sideIndex: isSidePlacement ? (Number(item.sideIndex) || 0) : null,
          sideViewKey: isSidePlacement ? sideViewKeyFromMeta(item) : '',
          sideZone: isSidePlacement ? String(item.sideZone || '') : '',
          sideGapIndex: isSidePlacement ? (Number(item.sideGapIndex) || 0) : null,
          series: checkedValue('guillotineSeries'),
          type: checkedValue('guillotineType'),
          mechanism: checkedValue('guillotineMechanism'),
          glassThickness: checkedValue('guillotineThickness'),
          glassColor,
          panelCount: checkedValue('guillotinePanel'),
          motorDirection: checkedValue('guillotineMotorDirection'),
          view: checkedValue('guillotineView'),
          motorType: checkedValue('guillotineMotorType'),
          remoteControl: checkedValue('guillotineRemote'),
          width: dimensionInputs[index].width,
          height: dimensionInputs[index].height,
          quantity: 1,
          pozNo: String(pozNos[index] || pozNos[0] || nextGuillotinePozNo()),
          leftPostStandard: isSidePlacement ? true : !frontPostProfiles[Number(item.index) || 0]
        };
      });
      placements.forEach(storeGuillotinePlacement);
      overlay.hidden = true;
      pendingGuillotinePlacementMeta = null;
      suppressFormPreviewUpdate = true;
      try { updatePreview(false); }
      finally { window.setTimeout(() => { suppressFormPreviewUpdate = false; }, 450); }
      if (editRecord) statusText.textContent = currentLanguage === 'en' ? `${placements[0].pozNo} updated.` : `${placements[0].pozNo} güncellendi.`;
      else if (convertRecord) statusText.textContent = currentLanguage === 'en' ? `${String(convertRecord.placement.pozNo || '')} was converted to ${placements[0].pozNo} guillotine product.` : `${String(convertRecord.placement.pozNo || '')}, ${placements[0].pozNo} giyotin ürününe dönüştürüldü.`;
      else if (placements.length > 1) statusText.textContent = currentLanguage === 'en' ? `${placements.length} guillotine products placed.` : `${placements.length} giyotin ürün yerleştirildi.`;
      else {
        const placement = placements[0];
        const txt = GUILLOTINE_UI_TEXT[currentLanguage] || GUILLOTINE_UI_TEXT.tr;
        statusText.textContent = ['side-left','side-right'].includes(String(placement.placementView || ''))
          ? (currentLanguage === 'en' ? `${placement.pozNo} placed in the ${sidePositionLabel(normalizeSideViewKey(placement.sideViewKey, placement.sideIndex), placement.sideIndex)}.` : `${placement.pozNo} ${sidePositionLabel(normalizeSideViewKey(placement.sideViewKey, placement.sideIndex), placement.sideIndex)} içine yerleştirildi.`)
          : txt.placed(placement.pozNo, placement.gapIndex + 1, placement.gapIndex + 2);
      }
    });
    return overlay;
  }

  function showGuillotineDetailsOverlay(meta, options = {}) {
    const overlay = ensureGuillotineDetailsOverlay();
    translateGuillotineDetailsOverlay(overlay);
    const batchMetas = Array.isArray(meta && meta.batchMetas) ? meta.batchMetas.map(normalizedProductMeta).filter(Boolean) : null;
    const baseMeta = batchMetas && batchMetas.length ? batchMetas[0] : normalizedProductMeta(meta) || { ...meta };
    const conversionRecords = Array.isArray(options.convertFromRecords) ? options.convertFromRecords : (options.convertFrom ? [options.convertFrom] : []);
    const conversionRecord = conversionRecords[0] || null;
    const record = options.editExisting || meta.editProduct || meta.placementId ? (meta.placementId ? findProductByInteraction(meta) : productRecordForMeta(baseMeta)) : null;
    const existing = record && record.type === 'guillotine_glass' ? record.placement : null;
    pendingGuillotinePlacementMeta = { ...baseMeta, batchMetas: batchMetas || undefined, editRecord: existing ? record : null, convertRecord: conversionRecord, convertRecords: conversionRecords };
    const gap = Math.max(1, Number(baseMeta.value) || 1);
    const width = Math.max(1, Number(baseMeta.placementWidth) || (gap - 5));
    const d = lastDrawing && lastDrawing.input ? lastDrawing.input : {};
    const height = Math.max(1, Number(baseMeta.placementHeight) || (Number(d.frontHeight || 0) - Number(d.parapetHeight || 0) - 5));
    const defaults = {
      guillotineSeries: 'A SERIES', guillotineType: 'STANDARD', guillotineMechanism: 'CHAIN',
      guillotineThickness: '8 MM', guillotineColor: 'TRANSPARENT', guillotinePanel: '1+1',
      guillotineMotorDirection: 'RIGHT', guillotineView: 'INSIDE VIEW', guillotineMotorType: 'SOMFY RTS', guillotineRemote: '1 CHANNEL'
    };
    const values = existing ? {
      guillotineSeries: existing.series, guillotineType: existing.type, guillotineMechanism: existing.mechanism,
      guillotineThickness: existing.glassThickness, guillotineColor: existing.glassColor, guillotinePanel: existing.panelCount,
      guillotineMotorDirection: existing.motorDirection, guillotineView: existing.view, guillotineMotorType: existing.motorType, guillotineRemote: existing.remoteControl
    } : defaults;
    const knownColors = ['TRANSPARENT','GREY','BRONZE','LOW-E GLASS'];
    Object.entries(defaults).forEach(([name, fallback]) => {
      let value = values[name] || fallback;
      if (name === 'guillotineColor' && !knownColors.includes(String(value))) value = 'OTHER';
      setRadioGroupValue(overlay, name, value, fallback);
    });
    const existingColor = existing ? String(existing.glassColor || 'TRANSPARENT') : 'TRANSPARENT';
    overlay.querySelector('#guillotineOtherColor').value = knownColors.includes(existingColor) ? '' : existingColor;
    overlay.querySelector('#guillotineOtherRow').hidden = knownColors.includes(existingColor);
    overlay.querySelector('#guillotineWidth').value = String(Math.round(existing ? existing.width : width));
    overlay.querySelector('#guillotineHeight').value = String(Math.round(existing ? existing.height : height));
    const pozNos = batchMetas ? allocatePozNos('G', batchMetas.length) : [existing ? existing.pozNo : nextGuillotinePozNo()];
    pendingGuillotinePlacementMeta.batchPozNos = pozNos;
    overlay.querySelector('#guillotinePozNo').value = pozNos[0];
    const batchList = overlay.querySelector('#guillotineBatchList');
    const guillotineTxt = GUILLOTINE_UI_TEXT[currentLanguage] || GUILLOTINE_UI_TEXT.tr;
    batchList.hidden = !(batchMetas && batchMetas.length > 1);
    batchList.innerHTML = batchMetas && batchMetas.length > 1 ? batchMetas.slice(1).map((item, offset) => {
      const index = offset + 1;
      const itemWidth = Math.max(1, Math.round(Number(item.placementWidth) || 1));
      const itemHeight = Math.max(1, Math.round(Number(item.placementHeight) || 1));
      return `<div class="product-batch-row product-batch-row-guillotine" data-batch-index="${index}">
        <label class="product-batch-field product-batch-poz"><span>${escapeHtml(guillotineTxt.pozNo)}</span><input type="text" value="${escapeHtml(pozNos[index])}" readonly></label>
        <label class="product-batch-field"><span>${escapeHtml(guillotineTxt.width)} <small>(mm)</small></span><input type="text" inputmode="numeric" autocomplete="off" data-batch-index="${index}" data-batch-field="width" value="${itemWidth}"></label>
        <label class="product-batch-field"><span>${escapeHtml(guillotineTxt.height)} <small>(mm)</small></span><input type="text" inputmode="numeric" autocomplete="off" data-batch-index="${index}" data-batch-field="height" value="${itemHeight}"></label>
      </div>`;
    }).join('') : '';
    const deleteBtn = overlay.querySelector('#guillotineDetailsDelete');
    deleteBtn.hidden = !existing;
    deleteBtn.textContent = currentLanguage === 'en' ? 'Delete Existing Product' : 'Mevcut Ürünü Sil';
    overlay.querySelector('#guillotineDetailsError').textContent = '';
    overlay.hidden = false;
    const active = overlay.querySelector('input[name="guillotineSeries"]:checked');
    if (active) active.dispatchEvent(new Event('change', { bubbles: true }));
    window.setTimeout(() => { const first = overlay.querySelector('input[name="guillotineSeries"]:checked'); if (first) first.focus({ preventScroll: true }); }, 20);
  }


  function nextZipScreenPozNo() {
    const used = new Set([...zipScreenPlacements, ...sideZipScreenPlacements].map(item => String(item.pozNo || '').toUpperCase()));
    let n = 1;
    while (used.has(`Z${String(n).padStart(2, '0')}`)) n += 1;
    return `Z${String(n).padStart(2, '0')}`;
  }

  function zipAvailabilityForMeta(meta, mountingLocation, type) {
    const base = normalizedProductMeta(meta) || meta || {};
    const placement = {
      placementView: base.placementView,
      sideIndex: base.sideIndex,
      sideViewKey: base.sideViewKey,
      sideGapIndex: base.sideGapIndex,
      sideZone: base.sideZone,
      gapIndex: Number(base.gapIndex ?? base.index) || 0,
      mountingLocation,
      type
    };
    return zipPlacementAvailability({ type: 'zip_screen', placement, isSide: placementIsSide(base) }, base) || base;
  }

  function ensureZipScreenDetailsOverlay() {
    let overlay = $('zipScreenDetailsOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'zipScreenDetailsOverlay';
    overlay.className = 'dim-edit-overlay sliding-details-overlay zip-screen-details-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <form id="zipScreenDetailsForm" class="dim-edit-card sliding-details-card zip-screen-details-card">
        <div class="sliding-modal-head">
          <div class="sliding-modal-title"><span class="zip-screen-title-icon" aria-hidden="true"></span><span id="zipScreenTitle">Zip Perde Detayları</span></div>
          <button id="zipScreenDetailsClose" class="sliding-modal-close" type="button" aria-label="Close"><span aria-hidden="true"></span></button>
        </div>
        <div class="zip-screen-form-grid">
          <label class="dim-edit-label zip-screen-full"><span id="zipProductLabel">Ürün</span><input type="text" value="Zip Perde" readonly></label>
          <label class="dim-edit-label"><span id="zipSeriesLabel">Ürün Serisi</span><select id="zipSeries"><option value="G SERIES">G Serisi</option><option value="P SERIES">P Serisi</option></select></label>
          <label class="dim-edit-label"><span id="zipTypeLabel">Tip</span><select id="zipType"><option value="100X100 BOX" data-series="G SERIES">100x100 Kutu</option><option value="110X110 BOX" data-series="G SERIES">110x110 Kutu</option><option value="HERCULE" data-series="G SERIES">Hercule</option><option value="115X115 BOX" data-series="P SERIES">115x115 Kutu</option><option value="130X130 BOX" data-series="P SERIES">130x130 Kutu</option></select></label>
          <label class="dim-edit-label"><span id="zipMountingLabel">Yerleşim Yeri</span><select id="zipMountingLocation"><option value="BETWEEN POSTS">Dikme Arası</option><option value="OUTSIDE POSTS">Dikmenin Dışı</option></select></label>
          <label class="dim-edit-label"><span id="zipFabricLabel">Kumaş Rengi</span><select id="zipFabricColor"><option value="SOLTIS">Soltis</option><option value="OTHER">Diğer</option></select></label>
          <label id="zipOtherFabricRow" class="dim-edit-label zip-screen-full" hidden><span id="zipOtherFabricLabel">Diğer Kumaş Rengi</span><input id="zipOtherFabricColor" type="text" autocomplete="off"></label>
          <label class="dim-edit-label"><span id="zipCableLabel">Kablo Çıkış Yönü</span><select id="zipCableExit"><option value="REAR">Arkadan</option><option value="TOP">Üstten</option><option value="SIDE">Yandan</option></select></label>
          <label class="dim-edit-label"><span id="zipMotorLabel">Motor Yönü</span><select id="zipMotorDirection"><option value="RIGHT">Sağ</option><option value="LEFT">Sol</option></select></label>
          <label class="dim-edit-label"><span id="zipPozLabel">Poz No.</span><input id="zipPozNo" type="text" readonly></label>
          <label class="dim-edit-label"><span id="zipWidthLabel">Genişlik (mm)</span><input id="zipWidth" type="text" inputmode="numeric" autocomplete="off"></label>
          <label class="dim-edit-label"><span id="zipHeightLabel">Yükseklik (mm)</span><input id="zipHeight" type="text" inputmode="numeric" autocomplete="off"></label>
          <div id="zipBatchList" class="bulk-selection-list product-batch-list zip-screen-full" hidden></div>
        </div>
        <div id="zipScreenDetailsError" class="dim-edit-error sliding-details-error" aria-live="polite"></div>
        <div class="dim-edit-actions sliding-details-actions">
          <button id="zipScreenDetailsDelete" type="button" class="dim-edit-delete" hidden>Mevcut Ürünü Sil</button>
          <button id="zipScreenDetailsCancel" type="button" class="dim-edit-cancel">İptal</button>
          <button id="zipScreenDetailsApply" type="submit" class="dim-edit-apply">Tamam</button>
        </div>
      </form>`;
    previewPanel.appendChild(overlay);

    const error = overlay.querySelector('#zipScreenDetailsError');
    const widthInput = overlay.querySelector('#zipWidth');
    const heightInput = overlay.querySelector('#zipHeight');
    const cleanNumeric = input => {
      const clean = String(input.value || '').replace(/[^0-9]/g, '');
      if (input.value !== clean) input.value = clean;
      error.textContent = '';
    };
    [widthInput, heightInput].forEach(input => input.addEventListener('input', () => { cleanNumeric(input); input.dataset.manual = 'true'; }));
    overlay.querySelector('#zipBatchList').addEventListener('input', evt => {
      const input = evt.target && evt.target.matches && evt.target.matches('[data-batch-field="width"],[data-batch-field="height"]') ? evt.target : null;
      if (!input) return;
      cleanNumeric(input);
      input.dataset.manual = 'true';
    });

    const refreshTypes = () => {
      const series = overlay.querySelector('#zipSeries').value;
      const type = overlay.querySelector('#zipType');
      Array.from(type.options).forEach(option => {
        const enabled = option.dataset.series === series;
        option.hidden = !enabled;
        option.disabled = !enabled;
      });
      if (!type.selectedOptions[0] || type.selectedOptions[0].disabled) {
        const first = Array.from(type.options).find(option => !option.disabled);
        if (first) type.value = first.value;
      }
    };
    const refreshFabric = () => { overlay.querySelector('#zipOtherFabricRow').hidden = overlay.querySelector('#zipFabricColor').value !== 'OTHER'; };
    const refreshAutoSizes = () => {
      if (!pendingZipScreenPlacementMeta) return;
      const metas = placementMetasFromPending(pendingZipScreenPlacementMeta);
      const mounting = overlay.querySelector('#zipMountingLocation').value;
      const type = overlay.querySelector('#zipType').value;
      metas.forEach((meta, index) => {
        const available = zipAvailabilityForMeta(meta, mounting, type);
        const w = index === 0 ? widthInput : overlay.querySelector(`#zipBatchList [data-batch-index="${index}"][data-batch-field="width"]`);
        const h = index === 0 ? heightInput : overlay.querySelector(`#zipBatchList [data-batch-index="${index}"][data-batch-field="height"]`);
        if (w && w.dataset.manual !== 'true') w.value = String(Math.round(Number(available.placementWidth) || 1));
        if (h && h.dataset.manual !== 'true') h.value = String(Math.round(Number(available.placementHeight) || 1));
      });
      error.textContent = '';
    };
    overlay.querySelector('#zipSeries').addEventListener('change', () => { refreshTypes(); refreshAutoSizes(); });
    overlay.querySelector('#zipType').addEventListener('change', refreshAutoSizes);
    overlay.querySelector('#zipMountingLocation').addEventListener('change', refreshAutoSizes);
    overlay.querySelector('#zipFabricColor').addEventListener('change', refreshFabric);
    overlay.querySelector('#zipOtherFabricColor').addEventListener('input', () => { error.textContent = ''; });

    const close = () => { overlay.hidden = true; pendingZipScreenPlacementMeta = null; focusPreviewCanvas(); };
    overlay.querySelector('#zipScreenDetailsCancel').addEventListener('click', close);
    overlay.querySelector('#zipScreenDetailsClose').addEventListener('click', close);
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) close(); });
    overlay.addEventListener('keydown', evt => { if (evt.key === 'Escape') { evt.preventDefault(); close(); } });
    overlay.querySelector('#zipScreenDetailsDelete').addEventListener('click', () => {
      const record = pendingZipScreenPlacementMeta && pendingZipScreenPlacementMeta.editRecord;
      if (!record) return;
      if (!window.confirm(currentLanguage === 'en' ? 'Delete this existing zip screen?' : 'Bu mevcut zip perde silinsin mi?')) return;
      deleteProductRecord(record);
      close();
      updatePreview(false);
      statusText.textContent = currentLanguage === 'en' ? 'Existing zip screen deleted.' : 'Mevcut zip perde silindi.';
    });

    overlay.querySelector('#zipScreenDetailsForm').addEventListener('submit', evt => {
      evt.preventDefault();
      if (!pendingZipScreenPlacementMeta) return;
      const meta = pendingZipScreenPlacementMeta;
      const metas = placementMetasFromPending(meta);
      const editRecord = meta.editRecord || null;
      let fabricColor = overlay.querySelector('#zipFabricColor').value;
      if (fabricColor === 'OTHER') {
        fabricColor = String(overlay.querySelector('#zipOtherFabricColor').value || '').trim().toUpperCase();
        if (!fabricColor) { error.textContent = currentLanguage === 'en' ? 'Enter the other fabric color.' : 'Diğer kumaş rengini gir.'; overlay.querySelector('#zipOtherFabricColor').focus(); return; }
      }
      const pozNos = Array.isArray(meta.batchPozNos) ? meta.batchPozNos : [editRecord ? editRecord.placement.pozNo : overlay.querySelector('#zipPozNo').value];
      const dimensions = metas.map((item, index) => {
        const w = index === 0 ? widthInput : overlay.querySelector(`#zipBatchList [data-batch-index="${index}"][data-batch-field="width"]`);
        const h = index === 0 ? heightInput : overlay.querySelector(`#zipBatchList [data-batch-index="${index}"][data-batch-field="height"]`);
        const width = Number(w && w.value), height = Number(h && h.value);
        return { width, height, widthInput: w, heightInput: h, invalid: !(width > 0) || !(height > 0), sizeMode: (w && w.dataset.manual === 'true') || (h && h.dataset.manual === 'true') ? 'MANUAL' : 'AUTO' };
      });
      const invalid = dimensions.find(item => item.invalid);
      if (invalid) { error.textContent = currentLanguage === 'en' ? 'Enter positive width and height values.' : 'Pozitif genişlik ve yükseklik değerleri gir.'; (invalid.width > 0 ? invalid.heightInput : invalid.widthInput).focus(); return; }
      const placements = metas.map((item, index) => {
        const isSidePlacement = placementIsSide(item);
        const existing = editRecord && index === 0 ? editRecord.placement : null;
        return {
          id: existing && existing.id ? existing.id : (isSidePlacement ? `zip_side_${Date.now()}_${index}_${sideViewKeyFromMeta(item)}_${item.sideZone}` : `zip_${Date.now()}_${index}_${item.index}`),
          gapIndex: Number(item.index) || 0,
          placementView: isSidePlacement ? (sideViewKeyFromMeta(item) === 'right' ? 'side-right' : 'side-left') : 'front',
          sideIndex: isSidePlacement ? (Number(item.sideIndex) || 0) : null,
          sideViewKey: isSidePlacement ? sideViewKeyFromMeta(item) : '',
          sideZone: isSidePlacement ? String(item.sideZone || '') : '',
          sideGapIndex: isSidePlacement ? (Number(item.sideGapIndex) || 0) : null,
          series: overlay.querySelector('#zipSeries').value,
          type: overlay.querySelector('#zipType').value,
          mountingLocation: overlay.querySelector('#zipMountingLocation').value,
          fabricColor,
          cableExitDirection: overlay.querySelector('#zipCableExit').value,
          motorDirection: overlay.querySelector('#zipMotorDirection').value,
          width: dimensions[index].width,
          height: dimensions[index].height,
          sizeMode: dimensions[index].sizeMode,
          panelCount: 1,
          quantity: 1,
          pozNo: String(pozNos[index] || pozNos[0] || nextZipScreenPozNo())
        };
      });
      placements.forEach(storeZipScreenPlacement);
      overlay.hidden = true;
      pendingZipScreenPlacementMeta = null;
      suppressFormPreviewUpdate = true;
      try { updatePreview(false); } finally { window.setTimeout(() => { suppressFormPreviewUpdate = false; }, 450); }
      statusText.textContent = currentLanguage === 'en' ? `${placements.length} zip screen product(s) saved.` : `${placements.length} zip perde ürünü kaydedildi.`;
    });
    return overlay;
  }

  function showZipScreenDetailsOverlay(meta, options = {}) {
    const overlay = ensureZipScreenDetailsOverlay();
    const isEn = currentLanguage === 'en';
    const batchMetas = Array.isArray(meta && meta.batchMetas) ? meta.batchMetas.map(normalizedProductMeta).filter(Boolean) : null;
    const baseMeta = batchMetas && batchMetas.length ? batchMetas[0] : normalizedProductMeta(meta) || { ...meta };
    const conversionRecords = Array.isArray(options.convertFromRecords) ? options.convertFromRecords : (options.convertFrom ? [options.convertFrom] : []);
    const conversionRecord = conversionRecords[0] || null;
    const record = options.editExisting || meta.editProduct || meta.placementId ? (meta.placementId ? findProductByInteraction(meta) : productRecordForMeta(baseMeta)) : null;
    const existing = record && record.type === 'zip_screen' ? record.placement : null;
    pendingZipScreenPlacementMeta = { ...baseMeta, batchMetas: batchMetas || undefined, editRecord: existing ? record : null, convertRecord: conversionRecord, convertRecords: conversionRecords };

    overlay.querySelector('#zipScreenTitle').textContent = isEn ? 'Zip Screen Details' : 'Zip Perde Detayları';
    overlay.querySelector('#zipProductLabel').textContent = isEn ? 'Product' : 'Ürün';
    overlay.querySelector('#zipSeriesLabel').textContent = isEn ? 'Product Series' : 'Ürün Serisi';
    overlay.querySelector('#zipTypeLabel').textContent = isEn ? 'Type' : 'Tip';
    overlay.querySelector('#zipMountingLabel').textContent = isEn ? 'Mounting Location' : 'Yerleşim Yeri';
    overlay.querySelector('#zipFabricLabel').textContent = isEn ? 'Fabric Color' : 'Kumaş Rengi';
    overlay.querySelector('#zipCableLabel').textContent = isEn ? 'Cable Exit Direction' : 'Kablo Çıkış Yönü';
    overlay.querySelector('#zipMotorLabel').textContent = isEn ? 'Motor Side' : 'Motor Yönü';
    overlay.querySelector('#zipPozLabel').textContent = isEn ? 'Position No.' : 'Poz No.';
    overlay.querySelector('#zipWidthLabel').textContent = isEn ? 'Width (mm)' : 'Genişlik (mm)';
    overlay.querySelector('#zipHeightLabel').textContent = isEn ? 'Height (mm)' : 'Yükseklik (mm)';
    overlay.querySelector('#zipScreenDetailsCancel').textContent = isEn ? 'Cancel' : 'İptal';
    overlay.querySelector('#zipScreenDetailsApply').textContent = isEn ? 'Confirm' : 'Tamam';

    overlay.querySelector('#zipSeries').value = existing ? existing.series : 'G SERIES';
    overlay.querySelector('#zipType').value = existing ? existing.type : '100X100 BOX';
    overlay.querySelector('#zipMountingLocation').value = existing ? existing.mountingLocation : 'BETWEEN POSTS';
    const knownFabric = !existing || String(existing.fabricColor || 'SOLTIS').toUpperCase() === 'SOLTIS';
    overlay.querySelector('#zipFabricColor').value = knownFabric ? 'SOLTIS' : 'OTHER';
    overlay.querySelector('#zipOtherFabricColor').value = knownFabric ? '' : String(existing.fabricColor || '');
    overlay.querySelector('#zipOtherFabricRow').hidden = knownFabric;
    overlay.querySelector('#zipCableExit').value = existing ? existing.cableExitDirection : 'REAR';
    overlay.querySelector('#zipMotorDirection').value = existing ? existing.motorDirection : 'RIGHT';
    overlay.querySelector('#zipSeries').dispatchEvent(new Event('change', { bubbles: true }));
    if (existing) overlay.querySelector('#zipType').value = existing.type;

    const available = zipAvailabilityForMeta(baseMeta, overlay.querySelector('#zipMountingLocation').value, overlay.querySelector('#zipType').value);
    const widthInput = overlay.querySelector('#zipWidth'), heightInput = overlay.querySelector('#zipHeight');
    widthInput.value = String(Math.round(existing ? existing.width : Number(available.placementWidth) || 1));
    heightInput.value = String(Math.round(existing ? existing.height : Number(available.placementHeight) || 1));
    widthInput.dataset.manual = existing && String(existing.sizeMode || '').toUpperCase() === 'MANUAL' ? 'true' : 'false';
    heightInput.dataset.manual = widthInput.dataset.manual;

    const pozNos = batchMetas ? allocatePozNos('Z', batchMetas.length) : [existing ? existing.pozNo : nextZipScreenPozNo()];
    pendingZipScreenPlacementMeta.batchPozNos = pozNos;
    overlay.querySelector('#zipPozNo').value = pozNos[0];
    const batchList = overlay.querySelector('#zipBatchList');
    batchList.hidden = !(batchMetas && batchMetas.length > 1);
    batchList.innerHTML = batchMetas && batchMetas.length > 1 ? batchMetas.slice(1).map((item, offset) => {
      const index = offset + 1;
      const itemAvailable = zipAvailabilityForMeta(item, overlay.querySelector('#zipMountingLocation').value, overlay.querySelector('#zipType').value);
      return `<div class="product-batch-row product-batch-row-zip" data-batch-index="${index}">
        <label class="product-batch-field product-batch-poz"><span>${isEn ? 'Position No.' : 'Poz No.'}</span><input type="text" value="${escapeHtml(pozNos[index])}" readonly></label>
        <label class="product-batch-field"><span>${isEn ? 'Width' : 'Genişlik'} <small>(mm)</small></span><input type="text" inputmode="numeric" autocomplete="off" data-manual="false" data-batch-index="${index}" data-batch-field="width" value="${Math.round(Number(itemAvailable.placementWidth) || 1)}"></label>
        <label class="product-batch-field"><span>${isEn ? 'Height' : 'Yükseklik'} <small>(mm)</small></span><input type="text" inputmode="numeric" autocomplete="off" data-manual="false" data-batch-index="${index}" data-batch-field="height" value="${Math.round(Number(itemAvailable.placementHeight) || 1)}"></label>
      </div>`;
    }).join('') : '';
    const deleteBtn = overlay.querySelector('#zipScreenDetailsDelete');
    deleteBtn.hidden = !existing;
    deleteBtn.textContent = isEn ? 'Delete Existing Product' : 'Mevcut Ürünü Sil';
    overlay.querySelector('#zipScreenDetailsError').textContent = '';
    overlay.hidden = false;
    window.setTimeout(() => overlay.querySelector('#zipSeries').focus({ preventScroll: true }), 20);
  }

  function ensureDimensionEditOverlay() {
    let overlay = $('dimensionEditOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'dimensionEditOverlay';
    overlay.className = 'dim-edit-overlay v66-smart-dim-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <form id="dimensionEditForm" class="dim-edit-card v66-smart-dim-card">
        <div class="dim-edit-title" id="dimensionEditTitle">Ölçü Düzenle</div>
        <div class="dim-edit-meta" id="dimensionEditMeta"></div>
        <label class="dim-edit-label" id="dimensionValueWrap">
          <span id="dimensionEditLabel">Yeni değer</span>
          <input id="dimensionEditInput" type="text" inputmode="numeric" autocomplete="off" />
        </label>
        <fieldset class="v66-action-fieldset">
          <legend id="dimensionActionLegend">İşlem</legend>
          <label><input type="radio" name="dimensionAction" value="resize" checked /> <span id="dimActionResize">Sadece ölçüyü değiştir</span></label>
          <label><input type="radio" name="dimensionAction" value="addSameProfile" /> <span id="dimActionAddSame">Bu aralığa aynı profilden ekle</span></label>
          <label><input type="radio" name="dimensionAction" value="addDifferentProfile" /> <span id="dimActionAddDifferent">Bu aralığa farklı profil ekle</span></label>
          <label><input type="radio" name="dimensionAction" value="addHorizontalProfile" /> <span id="dimActionAddHorizontal">Yatay Profil Ekle (100 × 100)</span></label>
          <label><input type="radio" name="dimensionAction" value="placeProduct" /> <span id="dimActionProduct">Bu alana ürün yerleştir</span></label>
          <label><input type="radio" name="dimensionAction" value="editProduct" /> <span id="dimActionProfile">Mevcut ürünü düzenle</span></label>
        </fieldset>
        <div class="v66-action-options" id="dimensionActionOptions">
          <label id="productOptionWrap">Ürün
            <select id="dimensionProductSelect"></select>
          </label>
          <label id="profileOptionWrap">Profil
            <select id="dimensionProfileSelect"></select>
          </label>
          <div id="dimensionCustomProfileFields" class="dimension-custom-profile-fields" hidden>
            <label><span>En</span><input id="dimensionProfileEn" type="text" inputmode="numeric" autocomplete="off" value="100" /></label>
            <label><span>Boy</span><input id="dimensionProfileBoy" type="text" inputmode="numeric" autocomplete="off" value="100" /></label>
            <label><span>Et</span><input id="dimensionProfileEt" type="text" inputmode="numeric" autocomplete="off" value="2" /></label>
          </div>
          <div class="v66-profile-hint" id="dimensionProfileHint"></div>
        </div>
        <div id="dimensionEditError" class="dim-edit-error" aria-live="polite"></div>
        <div class="dim-edit-actions">
          <button id="dimensionEditHide" type="button" class="danger-btn">Gizle</button>
          <button id="dimensionEditCancel" type="button" class="dim-edit-cancel">İptal</button>
          <button id="dimensionEditApply" type="submit" class="dim-edit-apply">Tamam</button>
        </div>
      </form>`;
    previewPanel.appendChild(overlay);

    const input = overlay.querySelector('#dimensionEditInput');
    const form = overlay.querySelector('#dimensionEditForm');
    const cancel = overlay.querySelector('#dimensionEditCancel');
    const hideButton = overlay.querySelector('#dimensionEditHide');
    const productSelect = overlay.querySelector('#dimensionProductSelect');
    const profileSelect = overlay.querySelector('#dimensionProfileSelect');
    SMART_PRODUCT_OPTIONS.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = currentLanguage === 'en' ? p.en : p.tr;
      productSelect.appendChild(opt);
    });
    SMART_PROFILE_OPTIONS.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = currentLanguage === 'en' ? p.en : p.tr;
      profileSelect.appendChild(opt);
    });

    const closeOverlay = () => {
      overlay.hidden = true;
      pendingDimensionEdit = null;
      focusPreviewCanvas();
    };

    const refreshActionOptions = () => {
      const action = (overlay.querySelector('input[name="dimensionAction"]:checked') || {}).value || 'resize';
      overlay.querySelector('#productOptionWrap').hidden = action !== 'placeProduct';
      overlay.querySelector('#profileOptionWrap').hidden = true;
      profileSelect.disabled = true;
      overlay.querySelector('#dimensionCustomProfileFields').hidden = action !== 'addDifferentProfile';
      overlay.querySelector('#dimensionProfileHint').textContent = '';
      input.disabled = action !== 'resize';
    };

    overlay.querySelectorAll('input[name="dimensionAction"]').forEach(r => r.addEventListener('change', refreshActionOptions));
    profileSelect.addEventListener('change', refreshActionOptions);

    overlay.querySelectorAll('#dimensionProfileEn,#dimensionProfileBoy,#dimensionProfileEt').forEach(profileInput => {
      profileInput.addEventListener('input', () => {
        const clean = String(profileInput.value || '').replace(/[^0-9]/g, '');
        if (profileInput.value !== clean) profileInput.value = clean;
        overlay.querySelector('#dimensionEditError').textContent = '';
      });
    });

    input.addEventListener('input', () => {
      const clean = String(input.value || '').replace(/[^0-9]/g, '');
      if (input.value !== clean) input.value = clean;
      overlay.querySelector('#dimensionEditError').textContent = '';
    });

    hideButton.addEventListener('click', () => {
      if (!pendingDimensionEdit) return;
      const hidden = hideDimension(pendingDimensionEdit);
      if (hidden) closeOverlay();
    });
    cancel.addEventListener('click', closeOverlay);
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) closeOverlay(); });

    form.addEventListener('submit', evt => {
      evt.preventDefault();
      evt.stopPropagation();
      if (!pendingDimensionEdit) return;
      const meta = pendingDimensionEdit;
      const action = (overlay.querySelector('input[name="dimensionAction"]:checked') || {}).value || 'resize';
      const clean = String(input.value || '').replace(/[^0-9]/g, '');
      const error = overlay.querySelector('#dimensionEditError');

      const finishUpdate = (message) => {
        overlay.hidden = true;
        pendingDimensionEdit = null;
        suppressFormPreviewUpdate = true;
        try { updatePreview(false); }
        finally { window.setTimeout(() => { suppressFormPreviewUpdate = false; }, 450); }
        if (message) statusText.textContent = message;
      };

      if (action === 'resize') {
        const horizontalProfileResize = String(meta.actionType || '') === 'horizontal_profile_y_resize';
        const rayInterval = String(meta.actionType || '') === 'ray_interval_resize';
        const sideSupportGap = isLeftSideSupportGapMeta(meta);
        if (!clean || (!sideSupportGap && Number(clean) <= 0) || (sideSupportGap && Number(clean) < 0)) {
          error.textContent = sideSupportGap
            ? (currentLanguage === 'en' ? 'Enter zero or a positive number.' : 'Sıfır veya pozitif bir sayı gir.')
            : (currentLanguage === 'en' ? 'Enter a positive number.' : 'Pozitif bir sayı gir.');
          input.focus();
          return;
        }
        if (horizontalProfileResize) {
          try { moveHorizontalProfileFromDimension(meta, Number(clean)); }
          catch (err) { error.textContent = err.message; return; }
          finishUpdate(currentLanguage === 'en' ? 'Horizontal profile Y position updated.' : 'Yatay profil Y konumu güncellendi.');
          return;
        }
        if (rayInterval) {
          try { resizeRayInterval(meta, Number(clean)); }
          catch (err) { error.textContent = err.message; return; }
          finishUpdate(currentLanguage === 'en' ? 'Ray positions updated.' : 'Ray konumları güncellendi.');
          return;
        }
        if (isParapetWidthMeta(meta)) {
          try { resizeParapetSegmentWidth(meta, Number(clean)); }
          catch (err) { error.textContent = err.message; return; }
          finishUpdate(currentLanguage === 'en' ? 'Parapet segment width updated.' : 'Parapet parçası genişliği güncellendi.');
          return;
        }
        if (sideSupportGap) {
          try {
            resizeLeftSideSupportGap(meta, Number(clean));
          } catch (err) {
            error.textContent = err.message;
            return;
          }
          finishUpdate(currentLanguage === 'en' ? 'Support post position updated.' : 'Destek dikmesi konumu güncellendi.');
          return;
        }
        if (isFrontPostGapMeta(meta)) {
          try {
            resizeFrontPostGap(meta, Number(clean));
          } catch (err) {
            error.textContent = err.message;
            return;
          }
          finishUpdate(currentLanguage === 'en' ? 'Post gap updated.' : 'Dikme aralığı güncellendi.');
          return;
        }
        if (!meta.canResize || String(meta.field || '').startsWith('__')) {
          error.textContent = currentLanguage === 'en' ? 'This dimension is not connected to a direct resize field yet.' : 'Bu ölçü henüz doğrudan ölçü değiştirme alanına bağlı değil.';
          return;
        }
        if (/^top_system_\d+_width$/.test(String(meta.dimId || ''))) {
          try { updateTopSystemMechanismWidth(meta, Number(clean), true); }
          catch (err) { error.textContent = err.message; return; }
          finishUpdate(currentLanguage === 'en' ? 'Rear-mechanism system width updated.' : 'Arka mekanizma sistem genişliği güncellendi.');
          return;
        }
        const editedEl = $(meta.field);
        if (editedEl && editedEl._previewTimer) window.clearTimeout(editedEl._previewTimer);
        updateEditableListValue(meta.field, meta.index, clean, true);
        finishUpdate(currentLanguage === 'en' ? 'Dimension updated.' : 'Ölçü güncellendi.');
        return;
      }

      if (action === 'addHorizontalProfile') {
        const sideGap = isLeftSideSupportGapMeta(meta);
        const frontGap = isFrontPostGapMeta(meta);
        if (!sideGap && !frontGap) {
          error.textContent = currentLanguage === 'en' ? 'Horizontal profile insertion is not available in this zone.' : 'Bu bölgeye yatay profil ekleme aktif değil.';
          return;
        }
        try { addHorizontalProfileToZone(meta); }
        catch (err) { error.textContent = err.message; return; }
        finishUpdate(currentLanguage === 'en' ? 'Horizontal 100 × 100 profile added at mid-height.' : '100 × 100 yatay profil net yüksekliğin ortasına eklendi.');
        return;
      }

      if (action === 'addSameProfile' || action === 'addDifferentProfile') {
        const sideGap = isLeftSideSupportGapMeta(meta);
        const frontGap = isFrontPostGapMeta(meta);
        if (!sideGap && !frontGap) {
          error.textContent = currentLanguage === 'en' ? 'Profile insertion is not available in this zone.' : 'Bu bölgeye profil ekleme aktif değil.';
          return;
        }
        let profile = null;
        if (action === 'addDifferentProfile') {
          const rawEn = Number(overlay.querySelector('#dimensionProfileEn').value || 0);
          const rawBoy = Number(overlay.querySelector('#dimensionProfileBoy').value || 0);
          const rawEt = Number(overlay.querySelector('#dimensionProfileEt').value || 0);
          if (!(rawEn > 0) || !(rawBoy > 0) || !(rawEt > 0) || rawEt * 2 >= Math.min(rawEn, rawBoy)) {
            error.textContent = currentLanguage === 'en'
              ? 'Enter positive width, depth and wall thickness values. Thickness must be less than half of the smaller side.'
              : 'En, Boy ve Et Kalınlığı pozitif olmalı; et kalınlığı küçük kenarın yarısından az olmalıdır.';
            return;
          }
          profile = sanitizeGlassTrackProfile({ mode: 'other', en: rawEn, boy: rawBoy, et: rawEt });
        }
        try {
          if (sideGap) addSidePostToGap(meta, profile || { mode: 'standard', en: 100, boy: 100, et: 2 });
          else insertFrontPostInGap(meta, profile);
        } catch (err) {
          error.textContent = err.message;
          return;
        }
        finishUpdate(currentLanguage === 'en' ? 'Post added at the center of the selected gap.' : 'Dikme seçilen aralığın tam ortasına eklendi.');
        return;
      }

      if (action === 'editProduct') {
        const productMeta = normalizedProductMeta(meta);
        const record = productRecordForMeta(productMeta);
        if (!record) {
          error.textContent = currentLanguage === 'en' ? 'No existing product was found in this zone.' : 'Bu alanda düzenlenecek mevcut ürün bulunamadı.';
          return;
        }
        overlay.hidden = true;
        pendingDimensionEdit = null;
        const editMeta = { ...productMeta, editProduct: true, placementId: record.placement.id, productType: record.type };
        if (record.type === 'guillotine_glass') showGuillotineDetailsOverlay(editMeta, { editExisting: true });
        else if (record.type === 'zip_screen') showZipScreenDetailsOverlay(editMeta, { editExisting: true });
        else showSlidingDetailsOverlay(editMeta, { editExisting: true });
        return;
      }

      if (action === 'placeProduct') {
        const frontGap = isFrontPostGapMeta(meta);
        const sideGap = isLeftSideSupportGapMeta(meta);
        if (!frontGap && !sideGap) {
          error.textContent = currentLanguage === 'en' ? 'This zone is not ready for product placement.' : 'Bu bölge ürün yerleşimine hazır değil.';
          return;
        }
        const placementMeta = sideGap ? sideProductMeta(meta) : meta;
        if (!placementMeta || Number(placementMeta.placementWidth || placementMeta.value || 0) <= 0 || (sideGap && Number(placementMeta.placementHeight || 0) <= 0)) {
          error.textContent = currentLanguage === 'en' ? 'The selected zone is too small for a product.' : 'Seçilen bölge ürün yerleşimi için çok küçük.';
          return;
        }
        const selectedProduct = productSelect.value || 'sliding_glass';
        overlay.hidden = true;
        pendingDimensionEdit = null;
        if (selectedProduct === 'guillotine_glass') showGuillotineDetailsOverlay(placementMeta);
        else if (selectedProduct === 'zip_screen') showZipScreenDetailsOverlay(placementMeta);
        else showSlidingDetailsOverlay(placementMeta);
      }
    });

    overlay.addEventListener('keydown', evt => {
      if (evt.key === 'Escape') {
        evt.preventDefault();
        closeOverlay();
      }
    });

    return overlay;
  }

  function showDimensionEditOverlay(meta) {
    const overlay = ensureDimensionEditOverlay();
    pendingDimensionEdit = meta;
    const isEn = currentLanguage === 'en';
    const labels = SMART_ACTION_LABELS[isEn ? 'en' : 'tr'];
    overlay.querySelector('#dimensionEditTitle').textContent = isEn ? 'Edit Smart Dimension' : 'Akıllı Ölçü Düzenle';
    overlay.querySelector('#dimensionEditMeta').innerHTML = `
      <b>${isEn ? 'View' : 'Görünüş'}:</b> ${escapeHtml(viewLabel(meta.view))}<br>
      <b>${isEn ? 'Dimension' : 'Ölçü'}:</b> ${escapeHtml(meta.label || '')}<br>
      <b>${isEn ? 'Current value' : 'Mevcut değer'}:</b> ${escapeHtml(meta.value || '')} mm<br>
      <b>Zone:</b> ${escapeHtml(meta.zoneId || '-')}`;
    overlay.querySelector('#dimensionEditLabel').textContent = isEn ? `${meta.label} value *(mm)` : `${meta.label} değeri *(mm)`;
    overlay.querySelector('#dimensionActionLegend').textContent = isEn ? 'Action' : 'İşlem';
    overlay.querySelector('#dimActionResize').textContent = labels.resize;
    overlay.querySelector('#dimActionAddSame').textContent = labels.addSameProfile;
    overlay.querySelector('#dimActionAddDifferent').textContent = labels.addDifferentProfile;
    overlay.querySelector('#dimActionAddHorizontal').textContent = labels.addHorizontalProfile;
    overlay.querySelector('#dimActionProduct').textContent = labels.placeProduct;
    overlay.querySelector('#dimActionProfile').textContent = labels.editProfile;
    overlay.querySelector('#dimensionEditHide').hidden = false;
    overlay.querySelector('#dimensionEditHide').textContent = isEn ? 'Hide' : 'Gizle';
    overlay.querySelector('#dimensionEditCancel').textContent = isEn ? 'Cancel' : 'İptal';
    overlay.querySelector('#dimensionEditApply').textContent = isEn ? 'OK' : 'Tamam';
    overlay.querySelector('#dimensionEditError').textContent = '';
    overlay.querySelector('#dimensionProductSelect').querySelectorAll('option').forEach((opt, i) => { const p = SMART_PRODUCT_OPTIONS[i]; if (p) opt.textContent = isEn ? p.en : p.tr; });
    overlay.querySelector('#dimensionProfileSelect').querySelectorAll('option').forEach((opt, i) => { const p = SMART_PROFILE_OPTIONS[i]; if (p) opt.textContent = isEn ? p.en : p.tr; });

    const frontPostGap = isFrontPostGapMeta(meta);
    const sideSupportGap = isLeftSideSupportGapMeta(meta);
    const postCountForGap = lastDrawing && lastDrawing.input ? Number(lastDrawing.input.postCount) || 0 : 0;
    const existingProduct = productRecordForMeta(normalizedProductMeta(meta));
    const actionMap = {
      resize: sideSupportGap ? !!meta.canResize : (frontPostGap ? (!!meta.canResize && postCountForGap > 2) : !!meta.canResize),
      addSameProfile: (frontPostGap || sideSupportGap) && !!meta.canAddSameProfile,
      addDifferentProfile: (frontPostGap || sideSupportGap) && !!meta.canAddDifferentProfile,
      addHorizontalProfile: (frontPostGap || sideSupportGap) && !existingProduct,
      placeProduct: (frontPostGap || sideSupportGap) && !!meta.canPlaceProduct && !existingProduct,
      editProduct: !!existingProduct
    };
    overlay.querySelectorAll('input[name="dimensionAction"]').forEach(r => {
      r.disabled = !actionMap[r.value];
      r.closest('label').classList.toggle('disabled', r.disabled);
      r.checked = false;
    });
    const firstAllowed = Array.from(overlay.querySelectorAll('input[name="dimensionAction"]')).find(r => !r.disabled);
    if (firstAllowed) firstAllowed.checked = true;
    const input = overlay.querySelector('#dimensionEditInput');
    input.value = String(currentEditableListValue(meta.field, meta.index, meta.value) || '').replace(/[^0-9]/g, '');
    input.disabled = !(firstAllowed && firstAllowed.value === 'resize');
    overlay.querySelectorAll('input[name="dimensionAction"]').forEach(r => {
      r.onchange = () => {
        input.disabled = r.value !== 'resize' || r.disabled;
        overlay.querySelector('#productOptionWrap').hidden = r.value !== 'placeProduct';
        overlay.querySelector('#dimensionCustomProfileFields').hidden = r.value !== 'addDifferentProfile';
      };
    });
    overlay.querySelector('#dimensionProfileSelect').disabled = true;
    overlay.querySelector('#dimensionCustomProfileFields').hidden = !(firstAllowed && firstAllowed.value === 'addDifferentProfile');
    overlay.querySelector('#profileOptionWrap').classList.add('is-disabled');
    overlay.hidden = false;
    const profileSelect = overlay.querySelector('#dimensionProfileSelect');
    profileSelect.dispatchEvent(new Event('change'));
    window.setTimeout(() => {
      if (!input.disabled) {
        input.focus({ preventScroll: true });
        input.select();
      }
    }, 20);
  }

  function showPassiveDimensionInfo(meta) {
    const overlay = ensureDimensionEditOverlay();
    pendingDimensionEdit = meta;
    const isEn = currentLanguage === 'en';
    overlay.querySelector('#dimensionEditTitle').textContent = isEn ? 'Information Dimension' : 'Bilgi Ölçüsü';
    overlay.querySelector('#dimensionEditMeta').innerHTML = `
      <b>${isEn ? 'View' : 'Görünüş'}:</b> ${escapeHtml(viewLabel(meta.view))}<br>
      <b>${isEn ? 'Dimension' : 'Ölçü'}:</b> ${escapeHtml(meta.label || '')}<br>
      <b>${isEn ? 'Current value' : 'Mevcut değer'}:</b> ${escapeHtml(meta.value || '')} mm<br>
      <b>${isEn ? 'Note' : 'Not'}:</b> ${escapeHtml(meta.passiveReason || (isEn ? 'This dimension is for information only.' : 'Bu ölçü şu an sadece bilgi amaçlıdır.'))}`;
    overlay.querySelector('#dimensionValueWrap').hidden = true;
    overlay.querySelector('.v66-action-fieldset').hidden = true;
    overlay.querySelector('#dimensionActionOptions').hidden = true;
    overlay.querySelector('#dimensionEditError').textContent = '';
    overlay.querySelector('#dimensionEditHide').hidden = false;
    overlay.querySelector('#dimensionEditHide').textContent = isEn ? 'Hide' : 'Gizle';
    overlay.querySelector('#dimensionEditCancel').textContent = isEn ? 'Close' : 'Kapat';
    overlay.querySelector('#dimensionEditApply').hidden = true;
    overlay.hidden = false;
  }

  function restoreActiveDimensionPanelParts() {
    const overlay = ensureDimensionEditOverlay();
    overlay.querySelector('#dimensionValueWrap').hidden = false;
    overlay.querySelector('.v66-action-fieldset').hidden = false;
    overlay.querySelector('#dimensionActionOptions').hidden = false;
    overlay.querySelector('#dimensionEditHide').hidden = false;
    overlay.querySelector('#dimensionEditApply').hidden = false;
  }


  function previewInteractionMetaFromHit(hit) {
    return {
      interactionType: hit.dataset.interactionType || '',
      postIndex: Math.max(0, Number(hit.dataset.postIndex || 0) || 0),
      postX: Number.isFinite(Number(hit.dataset.postX)) ? Number(hit.dataset.postX) : 0,
      currentPostCount: Math.max(0, Number(hit.dataset.currentPostCount || 0) || 0),
      totalRayCount: Math.max(0, Number(hit.dataset.totalRayCount || 0) || 0),
      placementMode: (hit.dataset.placementMode || 'standard').toLowerCase() === 'equal' ? 'equal' : 'standard',
      profileMode: hit.dataset.profileMode || '',
      profilePart: hit.dataset.profilePart || '',
      profileScope: hit.dataset.profileScope || '',
      en: Number(hit.dataset.en || 0) || 0,
      boy: Number(hit.dataset.boy || 0) || 0,
      et: Number(hit.dataset.et || 0) || 0,
      sidePostId: hit.dataset.sidePostId || '',
      sideIndex: Math.max(0, Number(hit.dataset.sideIndex || 0) || 0),
      sideViewKey: normalizeSideViewKey(hit.dataset.sideViewKey, Number(hit.dataset.sideIndex || 0) || 0),
      independentGroupId: hit.dataset.independentGroupId || hit.dataset.groupId || '',
      positionId: hit.dataset.positionId || '',
      viewId: hit.dataset.viewId || '',
      viewType: hit.dataset.viewType || '',
      side: hit.dataset.side || '',
      actionType: hit.dataset.sideActionType || hit.dataset.actionType || '',
      placementId: hit.dataset.placementId || '',
      productType: hit.dataset.productType || '',
      placementView: hit.dataset.placementView || '',
      gapIndex: Math.max(0, Number(hit.dataset.gapIndex || 0) || 0),
      sideGapIndex: Math.max(0, Number(hit.dataset.sideGapIndex || 0) || 0),
      horizontalProfileId: hit.dataset.horizontalProfileId || '',
      zoneId: hit.dataset.zoneId || '',
      profileView: hit.dataset.profileView || '',
      horizontalClearHeight: Math.max(0, Number(hit.dataset.horizontalClearHeight || 0) || 0),
      sideZone: hit.dataset.sideZone || '',
      postExtension: Number.isFinite(Number(hit.dataset.postExtension)) ? Number(hit.dataset.postExtension) : 0,
      trackLengthOffset: Number.isFinite(Number(hit.dataset.trackLengthOffset)) ? Number(hit.dataset.trackLengthOffset) : 0,
      parapetView: hit.dataset.parapetView || '',
      parapetSegmentId: hit.dataset.parapetSegmentId || '',
      parapetSegmentIndex: Math.max(0, Number(hit.dataset.parapetSegmentIndex || 0) || 0),
      segmentStart: Number(hit.dataset.segmentStart || 0) || 0,
      segmentEnd: Number(hit.dataset.segmentEnd || 0) || 0,
      segmentHeight: Number(hit.dataset.segmentHeight || 0) || 0,
      segmentStartHeight: Number(hit.dataset.segmentStartHeight || hit.dataset.segmentHeight || 0) || 0,
      segmentEndHeight: Number(hit.dataset.segmentEndHeight || hit.dataset.segmentHeight || 0) || 0,
      gutterMinusXDelta: Number.isFinite(Number(hit.dataset.gutterMinusXDelta)) ? Number(hit.dataset.gutterMinusXDelta) : 0,
      gutterPlusXDelta: Number.isFinite(Number(hit.dataset.gutterPlusXDelta)) ? Number(hit.dataset.gutterPlusXDelta) : 0,
      waterPipeId: hit.dataset.waterPipeId || '',
      waterPipeOrientation: hit.dataset.waterPipeOrientation || '',
      waterPipeDiameter: Math.max(1, Number(hit.dataset.waterPipeDiameter || 70) || 70),
      waterPipeLength: Math.max(1, Number(hit.dataset.waterPipeLength || 300) || 300),
      waterPipeXOffset: Number.isFinite(Number(hit.dataset.waterPipeXOffset)) ? Number(hit.dataset.waterPipeXOffset) : 0,
      tableX: Number(hit.dataset.tableX || 0) || 0, tableY: Number(hit.dataset.tableY || 0) || 0,
      tableScaleX: Math.max(0.35, Number(hit.dataset.tableScaleX || 1) || 1), tableScaleY: Math.max(0.35, Number(hit.dataset.tableScaleY || 1) || 1),
      tableMinX: Number(hit.dataset.tableMinX || 0) || 0, tableMinY: Number(hit.dataset.tableMinY || 0) || 0, tableMaxX: Number(hit.dataset.tableMaxX || 0) || 0, tableMaxY: Number(hit.dataset.tableMaxY || 0) || 0,
      sideEnabled: hit.dataset.sideEnabled === 'true',
      triangleDivisionCount: Math.max(1, Number(hit.dataset.triangleDivisionCount || 1) || 1),
      wallXOffset: Number(hit.dataset.wallXOffset || 0) || 0,
      wallEnabled: hit.dataset.wallEnabled !== 'false',
      wallCellEnabled: hit.dataset.wallCellEnabled !== 'false',
      systemIndex: Math.max(0, Number(hit.dataset.systemIndex || 0) || 0),
      boundMinX: Number(hit.dataset.boundMinX || 0) || 0,
      boundMaxX: Number(hit.dataset.boundMaxX || 0) || 0,
      boundMinY: Number(hit.dataset.boundMinY || 0) || 0,
      boundMaxY: Number(hit.dataset.boundMaxY || 0) || 0,
      defaultBoundMinX: Number(hit.dataset.defaultBoundMinX || hit.dataset.boundMinX || 0) || 0,
      defaultBoundMaxX: Number(hit.dataset.defaultBoundMaxX || hit.dataset.boundMaxX || 0) || 0,
      defaultBoundMinY: Number(hit.dataset.defaultBoundMinY || hit.dataset.boundMinY || 0) || 0,
      defaultBoundMaxY: Number(hit.dataset.defaultBoundMaxY || hit.dataset.boundMaxY || 0) || 0,
      wallDepth: Math.max(1, Number(hit.dataset.wallDepth || 600) || 600),
      wallHeight: Math.max(1, Number(hit.dataset.wallHeight || 1) || 1),
      wallSegmentId: hit.dataset.wallSegmentId || '',
      wallSegmentIndex: Math.max(0, Number(hit.dataset.wallSegmentIndex || 0) || 0),
      wallCellId: hit.dataset.wallCellId || '',
      wallCellIndex: Math.max(0, Number(hit.dataset.wallCellIndex || 0) || 0),
      cellMinX: Number(hit.dataset.cellMinX || 0) || 0,
      cellMaxX: Number(hit.dataset.cellMaxX || 0) || 0,
      cellMinY: Number(hit.dataset.cellMinY || 0) || 0,
      cellMaxY: Number(hit.dataset.cellMaxY || 0) || 0,
      startNearDepth: Math.max(0, Number(hit.dataset.startNearDepth || 0) || 0), endNearDepth: Math.max(0, Number(hit.dataset.endNearDepth || 0) || 0),
      startFarDepth: Math.max(0, Number(hit.dataset.startFarDepth || 0) || 0), endFarDepth: Math.max(0, Number(hit.dataset.endFarDepth || 0) || 0),
      wallMinX: Number(hit.dataset.wallMinX || 0) || 0,
      wallMaxX: Number(hit.dataset.wallMaxX || 0) || 0,
      wallMinY: Number(hit.dataset.wallMinY || 0) || 0,
      wallMaxY: Number(hit.dataset.wallMaxY || 0) || 0
    };
  }


  function ensureGlassTrackEditorOverlay() {
    let overlay = $('glassTrackEditorOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'glassTrackEditorOverlay';
    overlay.className = 'dim-edit-overlay glass-track-editor-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <form id="glassTrackEditorForm" class="dim-edit-card glass-track-editor-card">
        <div class="dim-edit-title" id="glassTrackEditorTitle">Cam Kaydı Profili Düzenle</div>
        <div class="dim-edit-meta" id="glassTrackEditorMeta"></div>
        <div class="glass-profile-options">
          <label><input type="radio" name="glassProfileMode" value="standard" checked /> <span id="glassProfileStandard">Standart 100x100x2</span></label>
          <label><input type="radio" name="glassProfileMode" value="40x130x2" /> <span id="glassProfile40130">40x130x2</span></label>
          <label><input type="radio" name="glassProfileMode" value="other" /> <span id="glassProfileOther">Diğer</span></label>
        </div>
        <div id="glassProfileCustomFields" class="glass-profile-custom-fields" hidden>
          <label><span>En</span><input id="glassProfileEn" type="text" inputmode="numeric" autocomplete="off" /></label>
          <label><span>Boy</span><input id="glassProfileBoy" type="text" inputmode="numeric" autocomplete="off" /></label>
          <label><span>Et</span><input id="glassProfileEt" type="text" inputmode="numeric" autocomplete="off" /></label>
        </div>
        <div id="glassTrackEditorNote" class="post-editor-note"></div>
        <div id="glassTrackEditorError" class="dim-edit-error" aria-live="polite"></div>
        <div class="dim-edit-actions">
          <button id="glassTrackEditorDelete" type="button" class="dim-edit-delete" hidden>Dikmeyi Sil</button>
          <button id="glassTrackEditorSeatOnParapet" type="button" class="dim-edit-delete" hidden>Parapete Oturt</button>
          <button id="glassTrackEditorExtend" type="button" class="dim-edit-cancel" hidden>Uzat / Kısalt</button>
          <button id="glassTrackEditorWallFit" type="button" class="dim-edit-cancel" hidden disabled>Duvara Oturt</button>
          <button id="glassTrackEditorCancel" type="button" class="dim-edit-cancel">İptal</button>
          <button id="glassTrackEditorApply" type="submit" class="dim-edit-apply">Tamam</button>
        </div>
      </form>`;
    previewPanel.appendChild(overlay);

    const customWrap = overlay.querySelector('#glassProfileCustomFields');
    const refresh = () => {
      const mode = (overlay.querySelector('input[name="glassProfileMode"]:checked') || {}).value || 'standard';
      customWrap.hidden = mode !== 'other';
    };
    overlay.querySelectorAll('input[name="glassProfileMode"]').forEach(r => r.addEventListener('change', refresh));
    overlay.querySelectorAll('#glassProfileEn,#glassProfileBoy,#glassProfileEt').forEach(input => {
      input.addEventListener('input', () => {
        const clean = String(input.value || '').replace(/[^0-9]/g, '');
        if (input.value !== clean) input.value = clean;
        overlay.querySelector('#glassTrackEditorError').textContent = '';
      });
    });
    const close = () => { overlay.hidden = true; focusPreviewCanvas(); };
    overlay.querySelector('#glassTrackEditorCancel').addEventListener('click', close);
    overlay.querySelector('#glassTrackEditorDelete').addEventListener('click', () => {
      const postId = overlay.dataset.sidePostId || '';
      const sideIndex = Number(overlay.dataset.sideIndex || 0) || 0;
      const sideViewKey = normalizeSideViewKey(overlay.dataset.sideViewKey, sideIndex);
      const isTrack = overlay.dataset.profilePart === 'track';
      const message = isTrack
        ? (currentLanguage === 'en' ? 'Delete the glass track only on this side?' : 'Cam kaydı yalnızca bu tarafta silinsin mi?')
        : (currentLanguage === 'en' ? 'Delete this support post?' : 'Bu destek dikmesi silinsin mi?');
      if (!window.confirm(message)) return;
      try {
        if (isTrack) {
          setSideFeatureValue('glassTrack', sideViewKey, false);
          syncMainFormFromSideFeature('glassTrack');
        } else deleteSidePost(sideIndex, postId, sideViewKey);
      } catch (err) { overlay.querySelector('#glassTrackEditorError').textContent = err.message; return; }
      close();
      updatePreview(false);
      statusText.textContent = isTrack
        ? (currentLanguage === 'en' ? 'Glass track deleted on this side.' : 'Cam kaydı bu tarafta silindi.')
        : (currentLanguage === 'en' ? 'Support post deleted.' : 'Destek dikmesi silindi.');
    });
    overlay.querySelector('#glassTrackEditorSeatOnParapet').addEventListener('click', () => {
      if (overlay.dataset.profilePart !== 'support') return;
      const postId = overlay.dataset.sidePostId || '';
      const sideIndex = Number(overlay.dataset.sideIndex || 0) || 0;
      const sideViewKey = normalizeSideViewKey(overlay.dataset.sideViewKey, sideIndex);
      if (!postId) return;
      const meta = { index: sideIndex, sideViewKey };
      const posts = materializeSidePosts(meta);
      const target = posts.find(item => String(item.id) === String(postId));
      if (!target) {
        overlay.querySelector('#glassTrackEditorError').textContent = currentLanguage === 'en' ? 'Support post not found.' : 'Destek dikmesi bulunamadı.';
        return;
      }
      target.extension = 0;
      storeSidePosts(meta, posts);
      overlay.hidden = true;
      updatePreview(false);
      statusText.textContent = currentLanguage === 'en' ? 'Support post seated on the local parapet.' : 'Destek dikmesi yerel parapete oturtuldu.';
    });
    overlay.querySelector('#glassTrackEditorExtend').addEventListener('click', () => {
      const postId = overlay.dataset.sidePostId || '';
      const sideIndex = Number(overlay.dataset.sideIndex || 0) || 0;
      const sideViewKey = normalizeSideViewKey(overlay.dataset.sideViewKey, sideIndex);
      overlay.hidden = true;
      if (overlay.dataset.profilePart === 'track') showGlassTrackLengthOverlay(sideViewKey, sideIndex);
      else if (postId) showSidePostExtensionOverlay(sideIndex, postId, sideViewKey);
    });
    overlay.querySelector('#glassTrackEditorWallFit').addEventListener('click', () => {
      if (overlay.dataset.profilePart !== 'track') return;
      const sideIndex = Number(overlay.dataset.sideIndex || 0) || 0;
      const sideViewKey = normalizeSideViewKey(overlay.dataset.sideViewKey, sideIndex);
      const d = lastDrawing && lastDrawing.input;
      const geom = d ? (sideViewKey === 'right' ? d.rightSideSupportGeometry : (d.sideSupportGeometry && d.sideSupportGeometry[sideViewKey])) : null;
      const position = d && Array.isArray(d.positions) ? (d.positions[sideIndex] || d.positions[0]) : null;
      if (!geom || !geom.exists || !position) {
        overlay.querySelector('#glassTrackEditorError').textContent = currentLanguage === 'en' ? 'Wall/track geometry could not be found.' : 'Duvar/cam kaydı geometrisi bulunamadı.';
        return;
      }
      if (!geom.hasWallContact || !Number.isFinite(Number(geom.wallContactX))) {
        overlay.querySelector('#glassTrackEditorError').textContent = currentLanguage === 'en' ? 'No visible wall face was found at the glass-track height.' : 'Cam kaydı yüksekliğinde görünür duvar yüzü bulunamadı.';
        return;
      }
      const desiredLength = Math.max(1, Number(geom.frontPostRearFace) - Number(geom.wallContactX));
      const baseLength = Math.max(1, Number(position.opening) - 100);
      setGlassTrackLengthOffsetForKey(sideViewKey, desiredLength - baseLength);
      overlay.hidden = true;
      updatePreview(false);
      statusText.textContent = currentLanguage === 'en' ? 'Glass track fitted to the back wall.' : 'Cam kaydı arka duvara oturtuldu.';
    });
    overlay.addEventListener('click', evt => { if (evt.target === overlay) close(); });
    overlay.addEventListener('keydown', evt => { if (evt.key === 'Escape') { evt.preventDefault(); close(); } });
    overlay.querySelector('#glassTrackEditorForm').addEventListener('submit', evt => {
      evt.preventDefault();
      const mode = (overlay.querySelector('input[name="glassProfileMode"]:checked') || {}).value || 'standard';
      let next = { mode, en: 100, boy: 100, et: 2 };
      if (mode === '40x130x2') next = { mode, en: 40, boy: 130, et: 2 };
      if (mode === 'other') {
        next = {
          mode,
          en: Number(overlay.querySelector('#glassProfileEn').value || 0),
          boy: Number(overlay.querySelector('#glassProfileBoy').value || 0),
          et: Number(overlay.querySelector('#glassProfileEt').value || 0)
        };
      }
      next = sanitizeGlassTrackProfile(next);
      const err = overlay.querySelector('#glassTrackEditorError');
      if (!Number.isFinite(next.en) || !Number.isFinite(next.boy) || next.en <= 0 || next.boy <= 0) {
        err.textContent = currentLanguage === 'en' ? 'Enter positive profile dimensions.' : 'Profil ölçüleri pozitif olmalı.';
        return;
      }
      const modeType = overlay.dataset.profilePart || 'track';
      const scope = overlay.dataset.profileScope || '';
      if (modeType === 'support') {
        const sidePostId = overlay.dataset.sidePostId || '';
        const sideIndex = Number(overlay.dataset.sideIndex || 0) || 0;
        const sideViewKey = normalizeSideViewKey(overlay.dataset.sideViewKey, sideIndex);
        if (sidePostId) {
          const meta = { index: sideIndex, sideViewKey };
          const posts = materializeSidePosts(meta);
          const target = posts.find(item => String(item.id) === String(sidePostId));
          if (!target) {
            err.textContent = currentLanguage === 'en' ? 'Support post not found.' : 'Destek dikmesi bulunamadı.';
            return;
          }
          target.profile = next;
          storeSidePosts(meta, posts);
        } else if (scope === 'left' || scope === 'right') glassSupportProfileState[scope] = next;
      } else {
        glassTrackProfileState = next;
        glassSupportProfileState = { left: null, right: null };
      }
      overlay.hidden = true;
      updatePreview(false);
      statusText.textContent = currentLanguage === 'en'
        ? (modeType === 'support'
            ? `${supportProfileScopeLabel(scope, true)} profile set to ${Math.round(next.en)}x${Math.round(next.boy)}x${Math.round(next.et)}.`
            : `Glass profile set to ${Math.round(next.en)}x${Math.round(next.boy)}x${Math.round(next.et)}.`)
        : (modeType === 'support'
            ? `${supportProfileScopeLabel(scope, false)} profili ${Math.round(next.en)}x${Math.round(next.boy)}x${Math.round(next.et)} olarak ayarlandı.`
            : `Cam kaydı profili ${Math.round(next.en)}x${Math.round(next.boy)}x${Math.round(next.et)} olarak ayarlandı.`);
    });
    return overlay;
  }

  function showGlassTrackEditorOverlay(meta) {
    const overlay = ensureGlassTrackEditorOverlay();
    const isEn = currentLanguage === 'en';
    const isSupport = (meta.profilePart || '') === 'support';
    const scope = meta.profileScope || '';
    const current = sanitizeGlassTrackProfile(isSupport
      ? ({ mode: meta.profileMode || 'other', en: meta.en || 100, boy: meta.boy || 100, et: meta.et || 2 })
      : glassTrackProfileState);
    overlay.dataset.sidePostId = isSupport ? (meta.sidePostId || '') : '';
    overlay.dataset.sideIndex = String(Number(meta.sideIndex) || 0);
    overlay.dataset.sideViewKey = normalizeSideViewKey(meta.sideViewKey || meta.profileScope, Number(meta.sideIndex) || 0);
    overlay.dataset.profilePart = isSupport ? 'support' : 'track';
    overlay.dataset.profileScope = scope;
    overlay.querySelector('#glassTrackEditorTitle').textContent = isSupport
      ? (isEn ? 'Edit Support Profile' : 'Destek Dikmesi Profili Düzenle')
      : (isEn ? 'Edit Glass Track Profile' : 'Cam Kaydı Profili Düzenle');
    overlay.querySelector('#glassProfileStandard').textContent = isEn ? 'Standard 100x100x2' : 'Standart 100x100x2';
    overlay.querySelector('#glassProfile40130').textContent = '40x130x2';
    overlay.querySelector('#glassProfileOther').textContent = isEn ? 'Other' : 'Diğer';
    overlay.querySelector('#glassTrackEditorCancel').textContent = isEn ? 'Cancel' : 'İptal';
    overlay.querySelector('#glassTrackEditorApply').textContent = isEn ? 'OK' : 'Tamam';
    const deleteBtn = overlay.querySelector('#glassTrackEditorDelete');
    deleteBtn.hidden = isSupport ? !meta.sidePostId : false;
    deleteBtn.textContent = isSupport ? (isEn ? 'Delete Post' : 'Dikmeyi Sil') : (isEn ? 'Delete Glass Track' : 'Cam Kaydını Sil');
    const seatOnParapetBtn = overlay.querySelector('#glassTrackEditorSeatOnParapet');
    seatOnParapetBtn.hidden = !isSupport || !meta.sidePostId;
    seatOnParapetBtn.textContent = isEn ? 'Seat on Parapet' : 'Parapete Oturt';
    const extendBtn = overlay.querySelector('#glassTrackEditorExtend');
    extendBtn.hidden = isSupport ? !meta.sidePostId : false;
    extendBtn.textContent = isSupport ? (isEn ? 'Extend / Shorten Post' : 'Dikmeyi Uzat / Kısalt') : (isEn ? 'Extend / Shorten Profile' : 'Profili Uzat / Kısalt');
    const wallFitBtn = overlay.querySelector('#glassTrackEditorWallFit');
    wallFitBtn.hidden = isSupport;
    wallFitBtn.disabled = false;
    wallFitBtn.classList.remove('disabled');
    wallFitBtn.textContent = isEn ? 'Fit to Wall' : 'Duvara Oturt';
    overlay.querySelector('#glassTrackEditorMeta').innerHTML = `
      <b>${isEn ? 'Clicked area' : 'Tıklanan alan'}:</b> ${escapeHtml(isSupport ? supportProfileScopeLabel(scope, isEn) : (isEn ? 'glass track - whole system' : 'cam kaydı - tüm sistem'))}<br>
      <b>${isEn ? 'Effect' : 'Etki'}:</b> ${escapeHtml(isSupport ? (isEn ? 'only this support and its top-view section' : 'sadece bu destek dikmesi ve üst görünüş kesiti') : (isEn ? 'all glass tracks + default support profiles' : 'tüm cam kayıtları + varsayılan destek profilleri'))}<br>
      <b>${isEn ? 'Current' : 'Mevcut'}:</b> ${Math.round(current.en)}x${Math.round(current.boy)}x${Math.round(current.et)}${isSupport && meta.sidePostId ? `<br><b>${isEn ? 'Lower-end offset' : 'Alt uç ofseti'}:</b> ${Math.round(Number(meta.postExtension) || 0)} mm` : ''}`;
    overlay.querySelector('#glassTrackEditorNote').textContent = isSupport
      ? (isEn
          ? 'Support edit changes the section only. By default the lower end sits on the local parapet. Use Extend / Shorten Post to override the lower end; the main glass track is not affected.'
          : 'Destek düzenleme yalnızca kesiti değiştirir. Alt uç varsayılan olarak bulunduğu parapet parçasına oturur. Alt ucu manuel değiştirmek için Dikmeyi Uzat / Kısalt seçeneğini kullan; ana cam kaydı etkilenmez.')
      : (isEn
          ? 'The section profile is shared, while delete and length operations affect only the clicked side.'
          : 'Kesit profili ortaktır; silme ve uzunluk işlemleri yalnızca tıklanan tarafı etkiler.');
    overlay.querySelector('#glassTrackEditorError').textContent = '';
    overlay.querySelectorAll('input[name="glassProfileMode"]').forEach(r => {
      r.checked = r.value === current.mode || (current.mode === '40x130' && r.value === '40x130x2');
    });
    if (!overlay.querySelector('input[name="glassProfileMode"]:checked')) overlay.querySelector('input[name="glassProfileMode"][value="standard"]').checked = true;
    overlay.querySelector('#glassProfileEn').value = String(Math.round(current.en));
    overlay.querySelector('#glassProfileBoy').value = String(Math.round(current.boy));
    overlay.querySelector('#glassProfileEt').value = String(Math.round(current.et));
    const customWrap = overlay.querySelector('#glassProfileCustomFields');
    customWrap.hidden = (overlay.querySelector('input[name="glassProfileMode"]:checked') || {}).value !== 'other';
    overlay.hidden = false;
  }


  function ensureFrontPostProfileOverlay() {
    let overlay = $('frontPostProfileOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'frontPostProfileOverlay';
    overlay.className = 'dim-edit-overlay post-profile-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `<form class="dim-edit-card"><div class="dim-edit-title" id="frontPostProfileTitle">Ön Dikme Profili Düzenle</div>
      <div class="dim-edit-meta" id="frontPostProfileMeta"></div>
      <div class="glass-profile-options">
        <label><input type="radio" name="frontPostProfileMode" value="standard"><span id="frontPostProfileStandard">Standart 100×100×2</span></label>
        <label><input type="radio" name="frontPostProfileMode" value="40x130x2"><span>40×130×2</span></label>
        <label><input type="radio" name="frontPostProfileMode" value="other"><span id="frontPostProfileOther">Diğer</span></label>
      </div>
      <div id="frontPostProfileFields" class="dimension-custom-profile-fields" hidden>
        <label><span>En</span><input id="frontPostProfileEn" type="text" inputmode="numeric"></label>
        <label><span>Boy</span><input id="frontPostProfileBoy" type="text" inputmode="numeric"></label>
        <label><span>Et</span><input id="frontPostProfileEt" type="text" inputmode="numeric"></label>
      </div>
      <div class="post-editor-note" id="frontPostProfileNote"></div><div id="frontPostProfileError" class="dim-edit-error"></div>
      <div class="dim-edit-actions"><button id="frontPostProfileDelete" type="button" class="dim-edit-delete">Dikmeyi Sil</button><button id="frontPostProfileSeatOnParapet" type="button" class="dim-edit-delete">Parapete Oturt</button><button id="frontPostProfileExtend" type="button" class="dim-edit-cancel">Dikmeyi Uzat / Kısalt</button><button id="frontPostProfileCancel" type="button" class="dim-edit-cancel">İptal</button><button type="submit" class="dim-edit-apply">Tamam</button></div></form>`;
    previewPanel.appendChild(overlay);
    const sync = () => { overlay.querySelector('#frontPostProfileFields').hidden = (overlay.querySelector('input[name="frontPostProfileMode"]:checked') || {}).value !== 'other'; };
    overlay.querySelectorAll('input[name="frontPostProfileMode"]').forEach(r => r.addEventListener('change', sync));
    overlay.querySelectorAll('#frontPostProfileEn,#frontPostProfileBoy,#frontPostProfileEt').forEach(input => input.addEventListener('input', () => { input.value = String(input.value || '').replace(/[^0-9]/g, ''); overlay.querySelector('#frontPostProfileError').textContent=''; }));
    const close=()=>closeFrontPostProfileOverlay(true);
    overlay.querySelector('#frontPostProfileCancel').addEventListener('click', close);
    overlay.addEventListener('mousedown', evt=>{if(evt.target===overlay)close();});
    overlay.addEventListener('keydown', evt=>{if(evt.key==='Escape'){evt.preventDefault();evt.stopPropagation();close();}});
    overlay.querySelector('#frontPostProfileDelete').addEventListener('click',()=>{
      const idx=Math.max(0,Number(overlay.dataset.postIndex)||0);
      if(!window.confirm(currentLanguage==='en'?'Delete this front post?':'Bu ön dikme silinsin mi?'))return;
      try{deleteFrontPost(idx);}catch(err){overlay.querySelector('#frontPostProfileError').textContent=err.message;return;}
      close();updatePreview(false);
    });
    overlay.querySelector('#frontPostProfileSeatOnParapet').addEventListener('click',()=>{
      const idx=Math.max(0,Number(overlay.dataset.postIndex)||0);
      while(frontPostExtensions.length<=idx)frontPostExtensions.push(0);
      frontPostExtensions[idx]=0;
      close();updatePreview(false);
      statusText.textContent=currentLanguage==='en'?'Front post seated on its local parapet.':'Ön dikme yerel parapete oturtuldu.';
    });
    overlay.querySelector('#frontPostProfileExtend').addEventListener('click',()=>{const idx=Math.max(0,Number(overlay.dataset.postIndex)||0);overlay.hidden=true;showFrontPostExtensionOverlay(idx);});
    overlay.querySelector('form').addEventListener('submit', evt=>{
      evt.preventDefault();
      const error=overlay.querySelector('#frontPostProfileError');
      const nextProfile=frontPostProfileFromEditor(overlay,error);
      if(nextProfile===undefined)return;
      const bulkMode=overlay.dataset.bulkMode==='true';
      if(!bulkMode){
        const idx=Math.max(0,Number(overlay.dataset.postIndex)||0);
        frontPostProfiles[idx]=nextProfile?deepCloneJson(nextProfile):null;
        closeFrontPostProfileOverlay(false);updatePreview(false);return;
      }
      const ids=Array.isArray(overlay._bulkProfileIds)?overlay._bulkProfileIds.slice():[];
      const indexes=Array.from(new Set(ids.map(id=>Number(String(id).split(':').pop())).filter(index=>Number.isInteger(index)&&index>=0&&frontPostProfileDescriptor(index))));
      if(!indexes.length){error.textContent=currentLanguage==='en'?'The selected physical profiles are no longer available.':'Seçilen fiziksel profiller artık mevcut değil.';return;}
      const previous=deepCloneJson(frontPostProfiles)||[];
      beginHistoryTransaction();
      try{
        indexes.forEach(index=>{frontPostProfiles[index]=nextProfile?deepCloneJson(nextProfile):null;});
        overlay.hidden=true;
        overlay.dataset.bulkMode='false';
        overlay._bulkProfileIds=[];
        updatePreview(false);
        endHistoryTransaction(true);
        clearBulkProfileSelection();
        statusText.textContent=currentLanguage==='en'?`${indexes.length} physical profile(s) updated in one operation.`:`${indexes.length} fiziksel profil tek işlemde güncellendi.`;
        focusPreviewCanvas();
      }catch(err){
        frontPostProfiles=previous;
        endHistoryTransaction(false);
        error.textContent=err&&err.message?err.message:String(err);
        overlay.hidden=false;
      }
    });
    return overlay;
  }

  function frontPostProfileFromEditor(overlay,errorNode) {
    const mode=(overlay.querySelector('input[name="frontPostProfileMode"]:checked')||{}).value||'standard';
    if(mode==='other'){
      const en=Number(overlay.querySelector('#frontPostProfileEn').value||0), boy=Number(overlay.querySelector('#frontPostProfileBoy').value||0), et=Number(overlay.querySelector('#frontPostProfileEt').value||0);
      if(!(en>0&&boy>0&&et>=0)){if(errorNode)errorNode.textContent=currentLanguage==='en'?'Enter valid width, depth and thickness values.':'Geçerli En, Boy ve Et değerleri gir.';return undefined;}
      return sanitizeGlassTrackProfile({mode:'other',en,boy,et});
    }
    if(mode==='40x130x2')return sanitizeGlassTrackProfile({mode:'40x130x2',en:40,boy:130,et:2});
    return null;
  }

  function closeFrontPostProfileOverlay(cancelBulk=true) {
    const overlay=$('frontPostProfileOverlay');
    if(!overlay)return;
    const wasBulk=overlay.dataset.bulkMode==='true';
    overlay.hidden=true;
    overlay.dataset.bulkMode='false';
    overlay._bulkProfileIds=[];
    if(wasBulk&&cancelBulk)clearBulkProfileSelection();
    focusPreviewCanvas();
  }

  function showBulkFrontPostProfileOverlay(descriptors) {
    const items=(descriptors||[]).filter(Boolean);
    if(!items.length){clearBulkProfileSelection();return;}
    const overlay=ensureFrontPostProfileOverlay(),isEn=currentLanguage==='en';
    const ids=Array.from(new Set(items.map(item=>item.physicalProfileId)));
    const signatures=new Set(items.map(item=>bulkProfileExactSignature(item)));
    const first=items[0],current=first.profile;
    overlay.dataset.bulkMode='true';
    overlay.dataset.postIndex=String(first.postIndex);
    overlay._bulkProfileIds=ids;
    overlay.querySelector('#frontPostProfileTitle').textContent=isEn?'Bulk Front Post Profile Change':'Toplu Ön Dikme Profili Değiştir';
    overlay.querySelector('#frontPostProfileMeta').innerHTML=`<b>${isEn?'Profile type':'Profil türü'}:</b> ${isEn?'Front post':'Ön dikme'}<br><b>${isEn?'Selected':'Seçili'}:</b> ${ids.length}<br><b>${isEn?'Current profile':'Mevcut profil'}:</b> ${signatures.size===1?`${Math.round(current.en)} × ${Math.round(current.boy)} × ${Math.round(current.et)} mm`:(isEn?'Multiple':'Birden fazla')}`;
    overlay.querySelector('#frontPostProfileNote').textContent=isEn?'Only the section profile is changed. Axes, centers, extensions and topology remain unchanged.':'Yalnızca kesit profili değiştirilir. Akslar, merkezler, uzatmalar ve topoloji korunur.';
    ['#frontPostProfileDelete','#frontPostProfileSeatOnParapet','#frontPostProfileExtend'].forEach(selector=>{overlay.querySelector(selector).hidden=true;});
    const mode=current.mode==='40x130x2'?'40x130x2':(current.mode==='standard'?'standard':'other');
    overlay.querySelectorAll('input[name="frontPostProfileMode"]').forEach(r=>{r.checked=r.value===mode;});
    overlay.querySelector('#frontPostProfileEn').value=String(Math.round(current.en));
    overlay.querySelector('#frontPostProfileBoy').value=String(Math.round(current.boy));
    overlay.querySelector('#frontPostProfileEt').value=String(Math.round(current.et));
    overlay.querySelector('#frontPostProfileFields').hidden=mode!=='other';
    overlay.querySelector('#frontPostProfileError').textContent='';
    overlay.hidden=false;
    refreshBulkProfileSelectionDecorations();
    window.setTimeout(()=>{const checked=overlay.querySelector('input[name="frontPostProfileMode"]:checked');if(checked)checked.focus({preventScroll:true});},20);
  }

  function showFrontPostProfileOverlay(postIndex) {
    const overlay=ensureFrontPostProfileOverlay();
    const idx=Math.max(0,Number(postIndex)||0), isEn=currentLanguage==='en';
    const current=frontPostProfiles[idx]?sanitizeGlassTrackProfile(frontPostProfiles[idx]):{mode:'standard',en:100,boy:100,et:2};
    overlay.dataset.bulkMode='false';
    overlay._bulkProfileIds=[];
    overlay.dataset.postIndex=String(idx);
    overlay.querySelector('#frontPostProfileTitle').textContent=isEn?'Edit Front Post Profile':'Ön Dikme Profili Düzenle';
    overlay.querySelector('#frontPostProfileMeta').innerHTML=`<b>${isEn?'Front post':'Ön dikme'}:</b> ${idx+1}<br><b>${isEn?'Current':'Mevcut'}:</b> ${Math.round(current.en)} × ${Math.round(current.boy)} × ${Math.round(current.et)} mm<br><b>${isEn?'Lower-end offset':'Alt uç ofseti'}:</b> ${Math.round(Number(frontPostExtensions[idx])||0)} mm`;
    overlay.querySelector('#frontPostProfileStandard').textContent=isEn?'Standard 100×100×2':'Standart 100×100×2';
    overlay.querySelector('#frontPostProfileOther').textContent=isEn?'Other':'Diğer';
    overlay.querySelector('#frontPostProfileNote').textContent=isEn?'The front view uses En; the top view uses En × Boy × Et and keeps the gutter-side -Y edge aligned.':'Ön görünüşte En, yan görünüşte Boy kullanılır. Profil ve uzatma aynı fiziksel dikmenin eş görünüşlerine uygulanır.';
    overlay.querySelector('#frontPostProfileDelete').textContent=isEn?'Delete Post':'Dikmeyi Sil';
    overlay.querySelector('#frontPostProfileSeatOnParapet').textContent=isEn?'Seat on Parapet':'Parapete Oturt';
    overlay.querySelector('#frontPostProfileExtend').textContent=isEn?'Extend / Shorten Post':'Dikmeyi Uzat / Kısalt';
    overlay.querySelector('#frontPostProfileCancel').textContent=isEn?'Cancel':'İptal';
    ['#frontPostProfileDelete','#frontPostProfileSeatOnParapet','#frontPostProfileExtend'].forEach(selector=>{overlay.querySelector(selector).hidden=false;});
    const mode=current.mode==='40x130x2'?'40x130x2':(frontPostProfiles[idx]?'other':'standard');
    overlay.querySelectorAll('input[name="frontPostProfileMode"]').forEach(r=>{r.checked=r.value===mode;});
    overlay.querySelector('#frontPostProfileEn').value=String(Math.round(current.en));
    overlay.querySelector('#frontPostProfileBoy').value=String(Math.round(current.boy));
    overlay.querySelector('#frontPostProfileEt').value=String(Math.round(current.et));
    overlay.querySelector('#frontPostProfileFields').hidden=mode!=='other';
    overlay.querySelector('#frontPostProfileError').textContent='';
    overlay.hidden=false;
  }

  function normalizeSignedMillimeterInput(value) {
    const raw = String(value == null ? '' : value).replace(/[^0-9-]/g, '');
    const negative = raw.includes('-');
    const digits = raw.replace(/-/g, '');
    return `${negative ? '-' : ''}${digits}`;
  }

  function ensureSidePostExtensionOverlay() {
    let overlay = $('sidePostExtensionOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'sidePostExtensionOverlay';
    overlay.className = 'dim-edit-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `<form class="dim-edit-card">
      <div class="dim-edit-title" id="sidePostExtensionTitle">Destek Dikmesini Uzat / Kısalt</div>
      <div class="dim-edit-meta" id="sidePostExtensionMeta"></div>
      <label class="dim-edit-label"><span id="sidePostExtensionLabel">Alt uç ofseti *(mm)</span><input id="sidePostExtensionInput" type="text" inputmode="decimal" autocomplete="off"></label>
      <div class="post-editor-note" id="sidePostExtensionNote"></div>
      <div id="sidePostExtensionError" class="dim-edit-error"></div>
      <div class="dim-edit-actions"><button id="sidePostExtensionCancel" type="button" class="dim-edit-cancel">İptal</button><button type="submit" class="dim-edit-apply">Tamam</button></div>
    </form>`;
    previewPanel.appendChild(overlay);
    const input = overlay.querySelector('#sidePostExtensionInput');
    input.addEventListener('input', () => {
      const clean = normalizeSignedMillimeterInput(input.value);
      if (input.value !== clean) input.value = clean;
      overlay.querySelector('#sidePostExtensionError').textContent = '';
    });
    const close = () => { overlay.hidden = true; focusPreviewCanvas(); };
    overlay.querySelector('#sidePostExtensionCancel').addEventListener('click', close);
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) close(); });
    const applyValue = value => {
      const sideIndex = Math.max(0, Number(overlay.dataset.sideIndex) || 0);
      const postId = overlay.dataset.sidePostId || '';
      const sideViewKey = normalizeSideViewKey(overlay.dataset.sideViewKey, sideIndex);
      const numeric = Number(value);
      if (!postId || !Number.isFinite(numeric)) {
        overlay.querySelector('#sidePostExtensionError').textContent = currentLanguage === 'en' ? 'Enter a valid signed millimetre value.' : 'Geçerli, işaretli bir milimetre değeri gir.';
        return;
      }
      const meta = { index: sideIndex, sideViewKey };
      const posts = materializeSidePosts(meta);
      const target = posts.find(item => String(item.id) === String(postId));
      if (!target) {
        overlay.querySelector('#sidePostExtensionError').textContent = currentLanguage === 'en' ? 'Support post not found.' : 'Destek dikmesi bulunamadı.';
        return;
      }
      target.extension = Math.round(numeric);
      storeSidePosts(meta, posts);
      overlay.hidden = true;
      updatePreview(false);
      statusText.textContent = currentLanguage === 'en'
        ? `Support-post lower-end offset set to ${Math.round(numeric)} mm.`
        : `Destek dikmesi alt uç ofseti ${Math.round(numeric)} mm olarak ayarlandı.`;
    };
    overlay.querySelector('form').addEventListener('submit', evt => { evt.preventDefault(); applyValue(input.value); });
    return overlay;
  }

  function showSidePostExtensionOverlay(sideIndex, postId, sideViewKey = null) {
    const overlay = ensureSidePostExtensionOverlay();
    const index = Math.max(0, Number(sideIndex) || 0);
    const id = String(postId || '');
    const key = normalizeSideViewKey(sideViewKey, index);
    const posts = materializeSidePosts({ index, sideViewKey: key });
    const target = posts.find(item => String(item.id) === id);
    const current = target && Number.isFinite(Number(target.extension)) ? Number(target.extension) : 0;
    const isEn = currentLanguage === 'en';
    overlay.dataset.sideIndex = String(index);
    overlay.dataset.sidePostId = id;
    overlay.dataset.sideViewKey = key;
    overlay.dataset.sideIndex = String(Math.max(0, Number(sideIndex) || 0));
    overlay.querySelector('#sidePostExtensionTitle').textContent = isEn ? 'Extend / Shorten Support Post' : 'Destek Dikmesini Uzat / Kısalt';
    overlay.querySelector('#sidePostExtensionMeta').textContent = isEn ? `Side view ${index + 1} · support post` : `Yan görünüş ${index + 1} · destek dikmesi`;
    overlay.querySelector('#sidePostExtensionLabel').textContent = isEn ? 'Lower-end offset *(mm)' : 'Alt uç ofseti *(mm)';
    overlay.querySelector('#sidePostExtensionNote').textContent = isEn
      ? 'The +Y upper end stays fixed. 0 seats the lower end on the local parapet; a positive value extends it in -Y, and a negative value shortens it upward.'
      : '+Y yönündeki üst uç sabit kalır. 0 değeri alt ucu yerel parapete oturtur; pozitif değer -Y yönüne uzatır, negatif değer alttan kısaltır.';
    overlay.querySelector('#sidePostExtensionCancel').textContent = isEn ? 'Cancel' : 'İptal';
    overlay.querySelector('#sidePostExtensionInput').value = String(Math.round(current));
    overlay.querySelector('#sidePostExtensionError').textContent = '';
    overlay.hidden = false;
    window.setTimeout(() => { const input = overlay.querySelector('#sidePostExtensionInput'); input.focus({ preventScroll: true }); input.select(); }, 20);
  }

  function ensureGlassTrackLengthOverlay() {
    let overlay = $('glassTrackLengthOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'glassTrackLengthOverlay';
    overlay.className = 'dim-edit-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `<form class="dim-edit-card"><div class="dim-edit-title" id="glassTrackLengthTitle">Cam Kaydı Profilini Uzat / Kısalt</div><div class="dim-edit-meta" id="glassTrackLengthMeta"></div><label class="dim-edit-label"><span id="glassTrackLengthLabel">Duvar yönü uzunluk ofseti *(mm)</span><input id="glassTrackLengthInput" type="text" inputmode="decimal"></label><div class="post-editor-note" id="glassTrackLengthNote"></div><div id="glassTrackLengthError" class="dim-edit-error"></div><div class="dim-edit-actions"><button id="glassTrackLengthWallFit" type="button" class="dim-edit-delete">Duvara Oturt</button><button id="glassTrackLengthCancel" type="button" class="dim-edit-cancel">İptal</button><button type="submit" class="dim-edit-apply">Tamam</button></div></form>`;
    previewPanel.appendChild(overlay);
    const input = overlay.querySelector('#glassTrackLengthInput');
    input.addEventListener('input', () => { input.value = normalizeSignedMillimeterInput(input.value); overlay.querySelector('#glassTrackLengthError').textContent = ''; });
    const close = () => { overlay.hidden = true; focusPreviewCanvas(); };
    overlay.querySelector('#glassTrackLengthCancel').addEventListener('click', close);
    overlay.querySelector('#glassTrackLengthWallFit').addEventListener('click', () => {
      const key = normalizeSideViewKey(overlay.dataset.sideViewKey, Number(overlay.dataset.sideIndex || 0) || 0);
      const d = lastDrawing && lastDrawing.input;
      const lastIndex = Math.max(0, Number(d && d.sidePositionCount || 1) - 1);
      const index = key === 'right' ? lastIndex : Math.max(0, Number(key) || Number(overlay.dataset.sideIndex || 0) || 0);
      const geom = key === 'right' ? (d && d.rightSideSupportGeometry) : (d && d.sideSupportGeometry && d.sideSupportGeometry[key]);
      const p = d && d.positions && d.positions[index];
      if (!geom || !p) {
        overlay.querySelector('#glassTrackLengthError').textContent = currentLanguage === 'en' ? 'Wall/track geometry could not be found.' : 'Duvar/cam kaydı geometrisi bulunamadı.';
        return;
      }
      if (!geom.hasWallContact || !Number.isFinite(Number(geom.wallContactX))) {
        overlay.querySelector('#glassTrackLengthError').textContent = currentLanguage === 'en' ? 'No visible wall face was found at the glass-track height.' : 'Cam kaydı yüksekliğinde görünür duvar yüzü bulunamadı.';
        return;
      }
      const offset = Number(geom.frontPostRearFace) - Number(geom.wallContactX) - (Number(p.opening) - 100);
      setGlassTrackLengthOffsetForKey(key, Math.round(offset));
      input.value = String(Math.round(offset));
      close();
      updatePreview(false);
      statusText.textContent = currentLanguage === 'en' ? 'Glass track seated on the local back wall.' : 'Cam kaydı yerel arka duvara oturtuldu.';
    });
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) close(); });
    overlay.querySelector('form').addEventListener('submit', evt => {
      evt.preventDefault();
      const value = Number(input.value);
      if (!Number.isFinite(value)) { overlay.querySelector('#glassTrackLengthError').textContent = currentLanguage === 'en' ? 'Enter a valid signed value.' : 'Geçerli işaretli bir değer gir.'; return; }
      setGlassTrackLengthOffsetForKey(overlay.dataset.sideViewKey, Math.round(value));
      close(); updatePreview(false);
    });
    return overlay;
  }

  function showGlassTrackLengthOverlay(sideViewKey, sideIndex = 0) {
    const overlay = ensureGlassTrackLengthOverlay();
    const key = normalizeSideViewKey(sideViewKey, sideIndex), isEn = currentLanguage === 'en';
    overlay.dataset.sideViewKey = key;
    overlay.querySelector('#glassTrackLengthTitle').textContent = isEn ? 'Extend / Shorten Glass Track' : 'Cam Kaydı Profilini Uzat / Kısalt';
    overlay.querySelector('#glassTrackLengthMeta').textContent = key === 'right' ? (isEn ? 'Right side' : 'Sağ yan görünüş') : (key === '0' ? (isEn ? 'Left side' : 'Sol yan görünüş') : `${isEn ? 'Intermediate position' : 'Ara poz'} ${Number(key)+1}`);
    overlay.querySelector('#glassTrackLengthLabel').textContent = isEn ? 'Wall-direction length offset *(mm)' : 'Duvar yönü uzunluk ofseti *(mm)';
    overlay.querySelector('#glassTrackLengthNote').textContent = isEn ? 'Positive extends toward the local wall; negative shortens from that wall side. Fit to Wall calculates the exact local wall contact.' : 'Pozitif değer ilgili duvar yönüne uzatır; negatif değer aynı taraftan kısaltır. Duvara Oturt, yerel duvar temasını otomatik hesaplar.';
    overlay.querySelector('#glassTrackLengthWallFit').textContent = isEn ? 'Fit to Wall' : 'Duvara Oturt';
    overlay.querySelector('#glassTrackLengthInput').value = String(Math.round(glassTrackLengthOffsetForKey(key)));
    overlay.querySelector('#glassTrackLengthError').textContent = '';
    overlay.hidden = false;
    window.setTimeout(() => { const input=overlay.querySelector('#glassTrackLengthInput'); input.focus({preventScroll:true}); input.select(); },20);
  }

  function ensureFrontPostExtensionOverlay() {
    let overlay=$('frontPostExtensionOverlay');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='frontPostExtensionOverlay';
    overlay.className='dim-edit-overlay';
    overlay.hidden=true;
    overlay.innerHTML=`<form class="dim-edit-card"><div class="dim-edit-title" id="frontPostExtensionTitle">Dikmeyi Uzat</div><div class="dim-edit-meta" id="frontPostExtensionMeta"></div><label class="dim-edit-label"><span id="frontPostExtensionLabel">-Y uzatma *(mm)</span><input id="frontPostExtensionInput" type="text" inputmode="numeric"></label><div class="post-editor-note" id="frontPostExtensionNote"></div><div id="frontPostExtensionError" class="dim-edit-error"></div><div class="dim-edit-actions"><button id="frontPostExtensionReset" type="button" class="dim-edit-delete">Sıfırla</button><button id="frontPostExtensionCancel" type="button" class="dim-edit-cancel">İptal</button><button type="submit" class="dim-edit-apply">Tamam</button></div></form>`;
    previewPanel.appendChild(overlay);
    const input=overlay.querySelector('#frontPostExtensionInput');
    input.addEventListener('input',()=>{input.value=String(input.value||'').replace(/[^0-9]/g,'');overlay.querySelector('#frontPostExtensionError').textContent='';});
    const close=()=>{overlay.hidden=true;focusPreviewCanvas();};
    overlay.querySelector('#frontPostExtensionCancel').addEventListener('click',close);
    overlay.addEventListener('mousedown',evt=>{if(evt.target===overlay)close();});
    const applyValue=value=>{const idx=Math.max(0,Number(overlay.dataset.postIndex)||0);while(frontPostExtensions.length<=idx)frontPostExtensions.push(0);frontPostExtensions[idx]=Math.max(0,Number(value)||0);overlay.hidden=true;updatePreview(false);statusText.textContent=currentLanguage==='en'?`Front post ${idx+1} extension updated.`:`${idx+1}. ön dikme uzatması güncellendi.`;};
    overlay.querySelector('#frontPostExtensionReset').addEventListener('click',()=>applyValue(0));
    overlay.querySelector('form').addEventListener('submit',evt=>{evt.preventDefault();applyValue(input.value);});
    return overlay;
  }

  function showFrontPostExtensionOverlay(postIndex) {
    const overlay=ensureFrontPostExtensionOverlay();
    const idx=Math.max(0,Number(postIndex)||0), isEn=currentLanguage==='en';
    overlay.dataset.postIndex=String(idx);
    overlay.querySelector('#frontPostExtensionTitle').textContent=isEn?'Extend Front Post':'Dikmeyi Uzat';
    overlay.querySelector('#frontPostExtensionMeta').textContent=isEn?`Front post ${idx+1}`:`Ön dikme ${idx+1}`;
    overlay.querySelector('#frontPostExtensionLabel').textContent=isEn?'-Y extension *(mm)':'-Y uzatma *(mm)';
    overlay.querySelector('#frontPostExtensionNote').textContent=isEn?'The top connection and roof angle remain fixed. The lower end may enter the parapet or pass below floor level.':'Üst bağlantı ve çatı açısı sabit kalır. Alt uç parapetin içine veya zemin kotunun altına gidebilir.';
    overlay.querySelector('#frontPostExtensionReset').textContent=isEn?'Reset':'Sıfırla';
    overlay.querySelector('#frontPostExtensionCancel').textContent=isEn?'Cancel':'İptal';
    overlay.querySelector('#frontPostExtensionInput').value=String(Math.round(Number(frontPostExtensions[idx])||0));
    overlay.querySelector('#frontPostExtensionError').textContent='';
    overlay.hidden=false;
    window.setTimeout(()=>overlay.querySelector('#frontPostExtensionInput').focus({preventScroll:true}),20);
  }

  function isTopBackWallMeta(meta) {
    return String(meta && meta.parapetView || '').toLowerCase() === 'top-back-wall';
  }

  function parapetEditorEntityName(meta, isEn = currentLanguage === 'en') {
    if (isTopBackWallMeta(meta)) return isEn ? 'top-view rear wall' : 'üst görünüş arka duvar';
    return isEn ? 'parapet' : 'parapet';
  }

  function isParapetWidthMeta(meta) {
    return !!meta && String(meta.actionType || '') === 'parapet_width_resize' && String(meta.parapetSegmentId || '').trim() !== '';
  }

  function resizeParapetSegmentWidth(meta, targetWidth) {
    const width = Number(targetWidth);
    if (!Number.isFinite(width) || width <= 0) throw new Error(currentLanguage === 'en' ? 'Enter a positive parapet width.' : 'Pozitif bir parapet genişliği gir.');
    const list = materializeParapetSegments(meta);
    let index = list.findIndex(item => String(item.id) === String(meta.parapetSegmentId));
    if (index < 0) index = Math.max(0, Math.min(list.length - 1, Number(meta.parapetSegmentIndex) || 0));
    if (index < 0 || !list[index]) throw new Error(currentLanguage === 'en' ? 'Parapet segment could not be found.' : 'Parapet parçası bulunamadı.');
    if (list.length < 2) throw new Error(currentLanguage === 'en' ? 'Divide the parapet before changing an individual segment width.' : 'Tek bir parapet parçasının genişliğini değiştirmek için önce parapeti böl.');
    const current = list[index], minWidth = 1;
    if (index === list.length - 1) {
      const fixedEnd = Number(current.end) || 0, nextStart = fixedEnd - width, previous = list[index - 1];
      if (!previous || nextStart <= Number(previous.start) + minWidth - 0.001) throw new Error(currentLanguage === 'en' ? 'The previous parapet segment would have zero or negative width.' : 'Önceki parapet parçasının genişliği sıfır veya negatif olur.');
      current.start = nextStart; previous.end = nextStart;
    } else {
      const fixedStart = Number(current.start) || 0, nextEnd = fixedStart + width, following = list[index + 1];
      if (!following || nextEnd >= Number(following.end) - minWidth + 0.001) throw new Error(currentLanguage === 'en' ? 'The next parapet segment would have zero or negative width.' : 'Sonraki parapet parçasının genişliği sıfır veya negatif olur.');
      current.end = nextEnd; following.start = nextEnd;
    }
    storeParapetSegments(meta, list);
  }

  function parapetLengthForMeta(meta) {
    const d = lastDrawing && lastDrawing.input ? lastDrawing.input : {};
    if (isTopBackWallMeta(meta)) {
      const boundLength = Number(meta && meta.defaultBoundMaxX) - Number(meta && meta.defaultBoundMinX);
      if (Number.isFinite(boundLength) && boundLength > 0) return boundLength;
      const index = Math.max(0, Number(meta && meta.systemIndex) || 0);
      const sys = Array.isArray(d.systems) ? (d.systems[index] || d.systems[0]) : null;
      const startX = Number.isFinite(Number(sys && sys.outerStartX)) ? Number(sys.outerStartX) : Number(sys && sys.startX);
      const endX = Number.isFinite(Number(sys && sys.outerEndX)) ? Number(sys.outerEndX) : Number(sys && sys.endX);
      return Math.max(0, endX - startX);
    }
    if (String(meta && meta.parapetView || '').toLowerCase() === 'side') {
      const index = Number(meta && meta.sideIndex) || 0;
      const p = Array.isArray(d.positions) ? (d.positions[index] || d.positions[0]) : null;
      return Math.max(0, Number(p && p.opening) || 0);
    }
    return Math.max(0, Number(d.width) || 0);
  }

  function parapetSourceListForMeta(meta) {
    const d = lastDrawing && lastDrawing.input ? lastDrawing.input : {};
    if (isTopBackWallMeta(meta)) {
      const key = String(Math.max(0, Number(meta && meta.systemIndex) || 0));
      const map = d.topBackWallSegments && typeof d.topBackWallSegments === 'object' ? d.topBackWallSegments : {};
      return deepCloneJson(map[key] || []) || [];
    }
    if (String(meta && meta.parapetView || '').toLowerCase() === 'side') {
      const index = Number(meta && meta.sideIndex) || 0;
      const key = sideViewKeyFromMeta(meta);
      const map = d.parapetSegments && d.parapetSegments.side ? d.parapetSegments.side : {};
      return deepCloneJson(map[key] || map[String(index)] || []) || [];
    }
    return deepCloneJson(d.parapetSegments && d.parapetSegments.front || []) || [];
  }

  function materializeParapetSegments(meta) {
    if (isTopBackWallMeta(meta)) {
      const key = String(Math.max(0, Number(meta && meta.systemIndex) || 0));
      topBackWallSegments = topBackWallSegments && typeof topBackWallSegments === 'object' ? topBackWallSegments : {};
      if (!Array.isArray(topBackWallSegments[key]) || !topBackWallSegments[key].length) topBackWallSegments[key] = parapetSourceListForMeta(meta);
      return (topBackWallSegments[key] || []).map(item => ({ ...item }));
    }
    const side = String(meta && meta.parapetView || '').toLowerCase() === 'side';
    if (side) {
      const key = sideViewKeyFromMeta(meta);
      parapetSegments.side = parapetSegments.side && typeof parapetSegments.side === 'object' ? parapetSegments.side : {};
      if (!Array.isArray(parapetSegments.side[key]) || !parapetSegments.side[key].length) parapetSegments.side[key] = parapetSourceListForMeta(meta);
      return parapetSegments.side[key].map(item => ({ ...item }));
    }
    if (!Array.isArray(parapetSegments.front) || !parapetSegments.front.length) parapetSegments.front = parapetSourceListForMeta(meta);
    return parapetSegments.front.map(item => ({ ...item }));
  }

  function storeParapetSegments(meta, list) {
    const clean = (Array.isArray(list) ? list : []).map((item, index) => {
      const legacyHeight = Math.max(0, Number(item.height) || 0);
      const startHeight = Math.max(0, Number.isFinite(Number(item.startHeight)) ? Number(item.startHeight) : legacyHeight);
      const endHeight = Math.max(0, Number.isFinite(Number(item.endHeight)) ? Number(item.endHeight) : legacyHeight);
      return {
        id: String(item.id || `parapet_${Date.now()}_${index}`),
        start: Number(item.start) || 0,
        end: Number(item.end) || 0,
        height: Math.max(startHeight, endHeight),
        startHeight,
        endHeight
      };
    }).sort((a, b) => a.start - b.start || a.end - b.end);
    if (isTopBackWallMeta(meta)) {
      const key = String(Math.max(0, Number(meta && meta.systemIndex) || 0));
      topBackWallSegments = topBackWallSegments && typeof topBackWallSegments === 'object' ? topBackWallSegments : {};
      topBackWallSegments[key] = clean;
      return;
    }
    if (String(meta && meta.parapetView || '').toLowerCase() === 'side') {
      const key = sideViewKeyFromMeta(meta);
      parapetSegments.side = parapetSegments.side && typeof parapetSegments.side === 'object' ? parapetSegments.side : {};
      parapetSegments.side[key] = clean;
    } else parapetSegments.front = clean;
    const all = [
      ...(Array.isArray(parapetSegments.front) ? parapetSegments.front : []),
      ...Object.values(parapetSegments.side || {}).flatMap(items => Array.isArray(items) ? items : [])
    ];
    const maxHeight = all.reduce((max, item) => Math.max(max, Number(item.height) || 0, Number(item.startHeight) || 0, Number(item.endHeight) || 0), 0);
    if ($('parapet')) $('parapet').value = maxHeight > 0 ? 'EVET' : 'HAYIR';
    const currentBase = Number($('parapetHeight') && $('parapetHeight').value) || 0;
    if ($('parapetHeight') && !(currentBase > 0) && maxHeight > 0) $('parapetHeight').value = String(Math.round(maxHeight));
    syncToolboxBooleanButtons();
    syncGlassRayBoundaryControl();
    syncParapetQuickInput();
  }

  function parapetDisplayAngleForMeta(meta, modelAngle) {
    if (window.PulumurGeometry && typeof window.PulumurGeometry.parapetDisplayAngleDegrees === 'function') {
      return window.PulumurGeometry.parapetDisplayAngleDegrees(modelAngle, meta && meta.parapetView, sideViewKeyFromMeta(meta));
    }
    const rightSide = String(meta && meta.parapetView || '').toLowerCase() === 'side' && sideViewKeyFromMeta(meta) === 'right';
    return Number(modelAngle) * (rightSide ? -1 : 1);
  }

  function parapetModelAngleForMeta(meta, displayAngle) {
    if (window.PulumurGeometry && typeof window.PulumurGeometry.parapetModelAngleDegrees === 'function') {
      return window.PulumurGeometry.parapetModelAngleDegrees(displayAngle, meta && meta.parapetView, sideViewKeyFromMeta(meta));
    }
    const rightSide = String(meta && meta.parapetView || '').toLowerCase() === 'side' && sideViewKeyFromMeta(meta) === 'right';
    return Number(displayAngle) * (rightSide ? -1 : 1);
  }

  function ensureParapetEditorOverlay() {
    let overlay = $('parapetEditorOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'parapetEditorOverlay';
    overlay.className = 'dim-edit-overlay parapet-editor-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `<form class="dim-edit-card parapet-editor-card">
      <div class="dim-edit-title" id="parapetEditorTitle">Parapet Parçasını Düzenle</div>
      <div class="dim-edit-meta" id="parapetEditorMeta"></div>
      <div class="parapet-editor-grid">
        <label><span id="parapetStartLabel">Başlangıç X *(mm)</span><input id="parapetStartInput" type="text" inputmode="numeric"></label>
        <label><span id="parapetEndLabel">Bitiş X *(mm)</span><input id="parapetEndInput" type="text" inputmode="numeric"></label>
        <label><span id="parapetHeightLabel">Başlangıç Yüksekliği *(mm)</span><input id="parapetSegmentHeightInput" type="text" inputmode="numeric"></label>
        <label><span id="parapetEndHeightLabel">Bitiş Yüksekliği *(mm)</span><input id="parapetSegmentEndHeightInput" type="text" inputmode="numeric"></label>
        <label><span id="parapetAngleLabel">Eğim *(°)</span><input id="parapetAngleInput" type="text" inputmode="text" autocomplete="off" placeholder="0"></label>
        <label><span id="parapetDivideLabel">Eşit parçaya böl</span><input id="parapetDivideInput" type="text" inputmode="numeric" placeholder="1"></label>
      </div>
      <div id="parapetEditorNote" class="post-editor-note"></div>
      <div id="parapetEditorError" class="dim-edit-error" aria-live="polite"></div>
      <div class="dim-edit-actions">
        <button id="parapetMergeAll" type="button" class="secondary-btn">Tek Parçaya Döndür</button>
        <button id="parapetEditorCancel" type="button" class="dim-edit-cancel">İptal</button>
        <button type="submit" class="dim-edit-apply">Tamam</button>
      </div>
    </form>`;
    previewPanel.appendChild(overlay);
    const syncAngleFromHeights = () => {
      const start = Number(overlay.querySelector('#parapetStartInput').value);
      const end = Number(overlay.querySelector('#parapetEndInput').value);
      const startHeight = Number(overlay.querySelector('#parapetSegmentHeightInput').value);
      const endHeight = Number(overlay.querySelector('#parapetSegmentEndHeightInput').value);
      if (![start, end, startHeight, endHeight].every(Number.isFinite) || !(end > start)) return;
      const modelAngle = window.PulumurGeometry && typeof window.PulumurGeometry.parapetAngleDegrees === 'function'
        ? window.PulumurGeometry.parapetAngleDegrees(start, end, startHeight, endHeight)
        : Math.atan2(endHeight - startHeight, end - start) * 180 / Math.PI;
      const displayAngle = parapetDisplayAngleForMeta(overlay._meta || {}, modelAngle);
      overlay.querySelector('#parapetAngleInput').value = Math.abs(displayAngle) < 0.0001 ? '0' : String(Number(displayAngle.toFixed(3)));
    };
    overlay.querySelectorAll('#parapetStartInput,#parapetEndInput,#parapetSegmentHeightInput,#parapetSegmentEndHeightInput,#parapetDivideInput').forEach(input => input.addEventListener('input', () => {
      if (input.id === 'parapetStartInput' || input.id === 'parapetEndInput') input.value = sanitizeSignedDecimalForApp(input.value);
      else input.value = String(input.value || '').replace(/[^0-9]/g, '');
      if (input.id !== 'parapetDivideInput') {
        overlay.dataset.parapetSlopeSource = 'heights';
        syncAngleFromHeights();
      }
      overlay.querySelector('#parapetEditorError').textContent = '';
    }));
    overlay.querySelector('#parapetAngleInput').addEventListener('input', input => { input.target.value = sanitizeSignedDecimalForApp(input.target.value); overlay.dataset.parapetSlopeSource = 'angle'; overlay.querySelector('#parapetEditorError').textContent = ''; });
    const close = () => { overlay.hidden = true; focusPreviewCanvas(); };
    overlay.querySelector('#parapetEditorCancel').addEventListener('click', close);
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) close(); });
    overlay.addEventListener('keydown', evt => { if (evt.key === 'Escape') { evt.preventDefault(); close(); } });
    overlay.querySelector('#parapetMergeAll').addEventListener('click', () => {
      const meta = overlay._meta || {};
      const length = parapetLengthForMeta(meta);
      const startValue = Number(overlay.querySelector('#parapetSegmentHeightInput').value);
      const endValue = Number(overlay.querySelector('#parapetSegmentEndHeightInput').value);
      const height = Math.max(0, Number.isFinite(startValue) ? startValue : Number(meta.segmentHeight) || Number($('parapetHeight') && $('parapetHeight').value) || 0);
      const endHeight = Math.max(0, Number.isFinite(endValue) ? endValue : height);
      if (!(length > 0 && Math.max(height, endHeight) > 0)) return;
      const entityPrefix = isTopBackWallMeta(meta) ? `top_back_wall_${Number(meta.systemIndex) || 0}` : `${meta.parapetView || 'front'}_${Number(meta.sideIndex) || 0}_parapet`;
      storeParapetSegments(meta, [{ id: `${entityPrefix}_1`, start: 0, end: length, height: Math.max(height, endHeight), startHeight: height, endHeight }]);
      close();
      updatePreview(false);
      statusText.textContent = currentLanguage === 'en' ? `The ${parapetEditorEntityName(meta, true)} was returned to one piece.` : `${isTopBackWallMeta(meta) ? 'Üst görünüş arka duvarı' : 'Parapet'} tek parçaya döndürüldü.`;
    });
    overlay.querySelector('form').addEventListener('submit', evt => {
      evt.preventDefault();
      const meta = overlay._meta || {};
      const error = overlay.querySelector('#parapetEditorError');
      const length = parapetLengthForMeta(meta);
      const start = Number(overlay.querySelector('#parapetStartInput').value);
      const end = Number(overlay.querySelector('#parapetEndInput').value);
      const startHeight = Number(overlay.querySelector('#parapetSegmentHeightInput').value);
      const angleText = sanitizeSignedDecimalForApp(overlay.querySelector('#parapetAngleInput').value).replace(',', '.');
      const displayAngle = angleText.trim() === '' ? null : Number(angleText);
      const modelAngle = Number.isFinite(displayAngle) ? parapetModelAngleForMeta(meta, displayAngle) : displayAngle;
      let endHeight = Number(overlay.querySelector('#parapetSegmentEndHeightInput').value);
      if (window.PulumurGeometry && typeof window.PulumurGeometry.resolveParapetEndHeight === 'function') {
        endHeight = window.PulumurGeometry.resolveParapetEndHeight(start, end, startHeight, endHeight, Number.isFinite(modelAngle) ? String(modelAngle) : angleText, overlay.dataset.parapetSlopeSource || 'heights');
      } else if (overlay.dataset.parapetSlopeSource === 'angle' && Number.isFinite(modelAngle)) {
        endHeight = startHeight + Math.tan(modelAngle * Math.PI / 180) * (end - start);
      }
      const height = Math.max(startHeight, endHeight);
      const divide = Math.max(1, Math.floor(Number(overlay.querySelector('#parapetDivideInput').value) || 1));
      const allowOutsideSystem = String(meta.parapetView || '').toLowerCase() === 'front';
      if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(startHeight) || !Number.isFinite(endHeight) || end <= start || (!allowOutsideSystem && (start < 0 || end > length + 0.001)) || startHeight < 0 || endHeight < 0) {
        error.textContent = allowOutsideSystem
          ? (currentLanguage === 'en' ? 'Enter a valid increasing X range and a non-negative height.' : 'Artan geçerli bir X aralığı ve sıfır veya pozitif yükseklik gir.')
          : (currentLanguage === 'en' ? `Enter a valid range between 0 and ${Math.round(length)} mm and a non-negative height.` : `0–${Math.round(length)} mm arasında geçerli bir aralık ve sıfır veya pozitif yükseklik gir.`);
        return;
      }
      const list = materializeParapetSegments(meta);
      let index = list.findIndex(item => String(item.id) === String(meta.parapetSegmentId));
      if (index < 0) index = Math.max(0, Math.min(list.length - 1, Number(meta.parapetSegmentIndex) || 0));
      if (index < 0 || !list[index]) { error.textContent = currentLanguage === 'en' ? 'Parapet segment could not be found.' : 'Parapet parçası bulunamadı.'; return; }
      const before = index > 0 ? list[index - 1] : null;
      const after = index < list.length - 1 ? list[index + 1] : null;
      if (before && start <= Number(before.start) + 0.001) { error.textContent = currentLanguage === 'en' ? 'The previous segment would have zero or negative width.' : 'Önceki parapet parçasının genişliği sıfır veya negatif olur.'; return; }
      if (after && end >= Number(after.end) - 0.001) { error.textContent = currentLanguage === 'en' ? 'The next segment would have zero or negative width.' : 'Sonraki parapet parçasının genişliği sıfır veya negatif olur.'; return; }
      if (window.PulumurGeometry && typeof window.PulumurGeometry.alignParapetNeighborEndpoints === 'function') {
        window.PulumurGeometry.alignParapetNeighborEndpoints(list, index, start, end);
      } else {
        if (before) before.end = start;
        if (after) after.start = end;
      }
      const originalId = String(list[index].id || meta.parapetSegmentId || `parapet_${Date.now()}`);
      const replacement = [];
      const segmentLimit = applicationLimits().maxSegmentsPerView;
      if (list.length - 1 + divide > segmentLimit) {
        error.textContent = currentLanguage === 'en' ? `The segment limit per view is ${segmentLimit}.` : `Görünüş başına parça sınırı ${segmentLimit}.`;
        return;
      }
      const piece = (end - start) / divide;
      for (let i = 0; i < divide; i += 1) {
        const ratio0 = i / divide;
        const ratio1 = (i + 1) / divide;
        const pieceStartHeight = startHeight + (endHeight - startHeight) * ratio0;
        const pieceEndHeight = startHeight + (endHeight - startHeight) * ratio1;
        replacement.push({
          id: divide === 1 ? originalId : `${originalId}_${Date.now()}_${i + 1}`,
          start: start + piece * i,
          end: i === divide - 1 ? end : start + piece * (i + 1),
          height: Math.max(pieceStartHeight, pieceEndHeight),
          startHeight: pieceStartHeight,
          endHeight: pieceEndHeight
        });
      }
      list.splice(index, 1);
      replacement.forEach((item, replacementIndex) => list.splice(index + replacementIndex, 0, item));
      storeParapetSegments(meta, list);
      close();
      updatePreview(false);
      const topWall = isTopBackWallMeta(meta);
      statusText.textContent = divide > 1
        ? (currentLanguage === 'en' ? `The ${parapetEditorEntityName(meta, true)} was divided into ${divide} equal parts.` : `${topWall ? 'Üst görünüş arka duvarı' : 'Parapet'} ${divide} eşit parçaya bölündü.`)
        : (currentLanguage === 'en' ? `The ${parapetEditorEntityName(meta, true)} segment was updated.` : `${topWall ? 'Üst görünüş arka duvar' : 'Parapet'} parçası güncellendi.`);
    });
    return overlay;
  }

  function showParapetEditorOverlay(meta) {
    const overlay = ensureParapetEditorOverlay();
    const isEn = currentLanguage === 'en';
    const list = materializeParapetSegments(meta);
    let index = list.findIndex(item => String(item.id) === String(meta.parapetSegmentId));
    if (index < 0) index = Math.max(0, Math.min(list.length - 1, Number(meta.parapetSegmentIndex) || 0));
    const segment = list[index] || { start: meta.segmentStart, end: meta.segmentEnd, height: meta.segmentHeight, startHeight: meta.segmentStartHeight, endHeight: meta.segmentEndHeight };
    overlay._meta = { ...meta, parapetSegmentId: segment.id || meta.parapetSegmentId, parapetSegmentIndex: index };
    const topWall = isTopBackWallMeta(meta);
    overlay.querySelector('#parapetEditorTitle').textContent = topWall
      ? (isEn ? 'Edit Top-View Rear Wall Segment' : 'Üst Görünüş Arka Duvar Parçasını Düzenle')
      : (isEn ? 'Edit Parapet Segment' : 'Parapet Parçasını Düzenle');
    let viewText;
    if (topWall) viewText = `${isEn ? 'Top View · System' : 'Üst Görünüş · Poz'} ${Number(meta.systemIndex || 0) + 1}`;
    else if (String(meta.parapetView).toLowerCase() === 'side') viewText = sideViewKeyFromMeta(meta) === 'right' ? (isEn ? 'Right Side' : 'Sağ Yan') : (sideViewKeyFromMeta(meta) === '0' ? (isEn ? 'Left Side' : 'Sol Yan') : `${isEn ? 'Intermediate Position' : 'Ara Poz'} ${Number(meta.sideIndex || 0) + 1}`);
    else viewText = isEn ? 'Front View' : 'Ön Görünüş';
    overlay.querySelector('#parapetEditorMeta').textContent = `${isEn ? 'View' : 'Görünüş'}: ${viewText} · ${index + 1}/${Math.max(1, list.length)}`;
    overlay.querySelector('#parapetStartLabel').textContent = isEn ? 'Start X *(mm)' : 'Başlangıç X *(mm)';
    overlay.querySelector('#parapetEndLabel').textContent = isEn ? 'End X *(mm)' : 'Bitiş X *(mm)';
    overlay.querySelector('#parapetHeightLabel').textContent = topWall ? (isEn ? 'Start −Y Depth *(mm)' : 'Başlangıç −Y Derinliği *(mm)') : (isEn ? 'Start Height *(mm)' : 'Başlangıç Yüksekliği *(mm)');
    overlay.querySelector('#parapetEndHeightLabel').textContent = topWall ? (isEn ? 'End −Y Depth *(mm)' : 'Bitiş −Y Derinliği *(mm)') : (isEn ? 'End Height *(mm)' : 'Bitiş Yüksekliği *(mm)');
    overlay.querySelector('#parapetAngleLabel').textContent = isEn ? 'Slope *(°)' : 'Eğim *(°)';
    overlay.querySelector('#parapetDivideLabel').textContent = isEn ? 'Divide into equal parts' : 'Eşit parçaya böl';
    overlay.querySelector('#parapetEditorNote').textContent = topWall
      ? (isEn ? 'The +Y edge is fixed. Depth and slope changes move only the −Y edge. Shared X boundaries and split/merge behavior match the parapet editor.' : '+Y kenarı sabittir. Derinlik ve eğim değişiklikleri yalnız −Y kenarını hareket ettirir. Ortak X sınırları ile bölme/birleştirme davranışı parapetle aynıdır.')
      : (isEn ? 'Changing a shared X boundary moves only the adjacent segment boundary; endpoint heights remain independent. Enter a number greater than 1 to split this segment.' : 'Ortak X sınırı değiştirildiğinde komşu parçanın yalnız sınırı hareket eder; yükseklik uçları bağımsız kalır. Bu parçayı bölmek için 1’den büyük sayı gir.');
    overlay.querySelector('#parapetMergeAll').textContent = isEn ? 'Return to One Piece' : 'Tek Parçaya Döndür';
    overlay.querySelector('#parapetEditorCancel').textContent = isEn ? 'Cancel' : 'İptal';
    overlay.querySelector('#parapetStartInput').value = String(Math.round(Number(segment.start) || 0));
    overlay.querySelector('#parapetEndInput').value = String(Math.round(Number(segment.end) || 0));
    const startHeight = Math.max(0, Number.isFinite(Number(segment.startHeight)) ? Number(segment.startHeight) : Number(segment.height) || 0);
    const endHeight = Math.max(0, Number.isFinite(Number(segment.endHeight)) ? Number(segment.endHeight) : Number(segment.height) || 0);
    const width = Math.max(0.001, Number(segment.end) - Number(segment.start));
    const modelAngle = window.PulumurGeometry && typeof window.PulumurGeometry.parapetAngleDegrees === 'function'
      ? window.PulumurGeometry.parapetAngleDegrees(segment.start, segment.end, startHeight, endHeight)
      : Math.atan2(endHeight - startHeight, width) * 180 / Math.PI;
    const displayAngle = parapetDisplayAngleForMeta(overlay._meta, modelAngle);
    overlay.querySelector('#parapetSegmentHeightInput').value = String(Math.round(startHeight));
    overlay.querySelector('#parapetSegmentEndHeightInput').value = String(Math.round(endHeight));
    overlay.querySelector('#parapetAngleInput').value = Math.abs(displayAngle) < 0.0001 ? '0' : String(Number(displayAngle.toFixed(3)));
    overlay.dataset.parapetSlopeSource = 'heights';
    overlay.querySelector('#parapetDivideInput').value = '1';
    overlay.querySelector('#parapetEditorError').textContent = '';
    overlay.hidden = false;
    window.setTimeout(() => overlay.querySelector('#parapetSegmentHeightInput').focus({ preventScroll: true }), 20);
  }

  let selectedIndependentSideView = null;

  function setIndependentSideViewHighlight(viewId, active) {
    if (!preview) return;
    preview.querySelectorAll('.preview-side-view-envelope').forEach(node => {
      node.classList.toggle('is-selected', !!active && String(node.dataset.viewId || '') === String(viewId || ''));
    });
  }

  function closeSideViewSelectionOverlay() {
    const overlay = $('sideViewSelectionOverlay');
    if (selectedIndependentSideView) setIndependentSideViewHighlight(selectedIndependentSideView.viewId, false);
    selectedIndependentSideView = null;
    if (overlay) { overlay.hidden = true; overlay._meta = null; }
    focusPreviewCanvas();
  }

  function ensureSideViewSelectionOverlay() {
    let overlay = $('sideViewSelectionOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'sideViewSelectionOverlay';
    overlay.className = 'dim-edit-overlay side-view-selection-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `<div class="dim-edit-card">
      <div class="dim-edit-title" id="sideViewSelectionTitle">Yan Görünüş Seçildi</div>
      <div class="dim-edit-meta" id="sideViewSelectionMeta"></div>
      <div class="post-editor-note" id="sideViewSelectionNote"></div>
      <div class="dim-edit-actions">
        <button id="sideViewSelectionDelete" type="button" class="danger-btn">Sil</button>
        <button id="sideViewSelectionDone" type="button" class="dim-edit-apply">Tamam</button>
      </div>
    </div>`;
    previewPanel.appendChild(overlay);
    overlay.querySelector('#sideViewSelectionDone').addEventListener('click', closeSideViewSelectionOverlay);
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) closeSideViewSelectionOverlay(); });
    overlay.querySelector('#sideViewSelectionDelete').addEventListener('click', () => {
      const meta = overlay._meta;
      if (!meta || !meta.independentGroupId || !meta.positionId || !['left', 'right'].includes(meta.side)) return;
      beginHistoryTransaction();
      try {
        const groupId = String(meta.independentGroupId);
        const positionId = String(meta.positionId);
        if (!independentSideViewVisibility[groupId]) independentSideViewVisibility[groupId] = {};
        const previous = independentSideViewVisibility[groupId][positionId] || { leftSideVisible: true, rightSideVisible: true };
        independentSideViewVisibility[groupId][positionId] = {
          leftSideVisible: previous.leftSideVisible !== false,
          rightSideVisible: previous.rightSideVisible !== false,
          [meta.side === 'right' ? 'rightSideVisible' : 'leftSideVisible']: false
        };
        closeSideViewSelectionOverlay();
        updatePreview(false);
        statusText.textContent = currentLanguage === 'en'
          ? 'Only the selected side-view output was hidden. The physical PergoRise position is preserved.'
          : 'Yalnız seçili yan görünüş çıktısı gizlendi; fiziksel PergoRise pozu korundu.';
      } finally { endHistoryTransaction(true); }
    });
    return overlay;
  }

  function showSideViewSelectionOverlay(meta) {
    const overlay = ensureSideViewSelectionOverlay();
    closeSideViewSelectionOverlay();
    selectedIndependentSideView = { ...meta };
    overlay._meta = selectedIndependentSideView;
    const right = meta.side === 'right';
    overlay.querySelector('#sideViewSelectionTitle').textContent = currentLanguage === 'en' ? 'Side View Selected' : 'Yan Görünüş Seçildi';
    overlay.querySelector('#sideViewSelectionMeta').textContent = `${meta.independentGroupId} · ${meta.positionId} · ${right ? (currentLanguage === 'en' ? 'Right Side' : 'Sağ Yan') : (currentLanguage === 'en' ? 'Left Side' : 'Sol Yan')}`;
    overlay.querySelector('#sideViewSelectionNote').textContent = currentLanguage === 'en'
      ? 'Delete hides only this drawing view; it does not delete the position, group, profiles or dimensions.'
      : 'Sil yalnız bu çizim görünüşünü gizler; poz, grup, profil veya ölçüleri silmez.';
    overlay.querySelector('#sideViewSelectionDelete').textContent = currentLanguage === 'en' ? 'Delete' : 'Sil';
    overlay.querySelector('#sideViewSelectionDone').textContent = currentLanguage === 'en' ? 'Done' : 'Tamam';
    overlay.hidden = false;
    setIndependentSideViewHighlight(meta.viewId, true);
  }

  function ensureGutterEditorOverlay() {
    let overlay = $('gutterEditorOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'gutterEditorOverlay';
    overlay.className = 'dim-edit-overlay gutter-editor-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `<form class="dim-edit-card">
      <div class="dim-edit-title" id="gutterEditorTitle">Üst Görünüş Oluğu Düzenle</div>
      <div class="dim-edit-meta" id="gutterEditorMeta"></div>
      <div class="parapet-editor-grid">
        <label><span id="gutterMinusXLabel">−X tarafı uzatma / kısaltma *(mm)</span><input id="gutterMinusXInput" type="text" inputmode="text" autocomplete="off"></label>
        <label><span id="gutterPlusXLabel">+X tarafı uzatma / kısaltma *(mm)</span><input id="gutterPlusXInput" type="text" inputmode="text" autocomplete="off"></label>
      </div>
      <div id="gutterEditorNote" class="post-editor-note"></div>
      <div id="gutterEditorError" class="dim-edit-error" aria-live="polite"></div>
      <div class="dim-edit-actions">
        <button id="gutterEditorReset" type="button" class="secondary-btn">Sıfırla</button>
        <button id="gutterEditorCancel" type="button" class="dim-edit-cancel">İptal</button>
        <button type="submit" class="dim-edit-apply">Tamam</button>
      </div>
    </form>`;
    previewPanel.appendChild(overlay);
    const minusInput = overlay.querySelector('#gutterMinusXInput');
    const plusInput = overlay.querySelector('#gutterPlusXInput');
    [minusInput, plusInput].forEach(input => input.addEventListener('input', () => {
      input.value = sanitizeSignedDecimalForApp(input.value);
      overlay.querySelector('#gutterEditorError').textContent = '';
    }));
    const close = () => { overlay.hidden = true; focusPreviewCanvas(); };
    const apply = (nextState) => {
      const meta = overlay._meta || {};
      const minus = Number(String(nextState.minusXDelta).replace(',', '.'));
      const plus = Number(String(nextState.plusXDelta).replace(',', '.'));
      const defaultStart = Number(meta.defaultBoundMinX);
      const defaultEnd = Number(meta.defaultBoundMaxX);
      const width = (defaultEnd + plus) - (defaultStart - minus);
      if (![minus, plus, defaultStart, defaultEnd].every(Number.isFinite) || width < 100) {
        overlay.querySelector('#gutterEditorError').textContent = currentLanguage === 'en' ? 'Enter valid signed values; the gutter must remain at least 100 mm long.' : 'Geçerli artı/eksi değerler gir; oluk en az 100 mm uzunluğunda kalmalı.';
        return false;
      }
      const groupId = String(meta.independentGroupId || '');
      if (groupId) {
        const normalized = normalizeGutterEditStateForApp(gutterEditState);
        normalized.groups[groupId] = { minusXDelta: minus, plusXDelta: plus };
        gutterEditState = normalized;
      } else gutterEditState = { minusXDelta: minus, plusXDelta: plus, groups: normalizeGutterEditStateForApp(gutterEditState).groups };
      close();
      updatePreview(false);
      statusText.textContent = currentLanguage === 'en' ? 'The top and front gutters were updated from one shared state.' : 'Üst ve karşı görünüş olukları ortak veriden birlikte güncellendi.';
      return true;
    };
    overlay.querySelector('#gutterEditorCancel').addEventListener('click', close);
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) close(); });
    overlay.addEventListener('keydown', evt => { if (evt.key === 'Escape') { evt.preventDefault(); close(); } });
    overlay.querySelector('#gutterEditorReset').addEventListener('click', () => apply({ minusXDelta: 0, plusXDelta: 0 }));
    overlay.querySelector('form').addEventListener('submit', evt => {
      evt.preventDefault();
      apply({ minusXDelta: minusInput.value, plusXDelta: plusInput.value });
    });
    return overlay;
  }

  function showGutterEditorOverlay(meta) {
    const overlay = ensureGutterEditorOverlay();
    const isEn = currentLanguage === 'en';
    const normalizedGutter = normalizeGutterEditStateForApp(gutterEditState);
    const groupState = meta && meta.independentGroupId ? (normalizedGutter.groups[String(meta.independentGroupId)] || normalizedGutter) : normalizedGutter;
    const state = normalizeGutterEditStateForApp({
      minusXDelta: Number.isFinite(Number(meta && meta.gutterMinusXDelta)) ? Number(meta.gutterMinusXDelta) : groupState.minusXDelta,
      plusXDelta: Number.isFinite(Number(meta && meta.gutterPlusXDelta)) ? Number(meta.gutterPlusXDelta) : groupState.plusXDelta
    });
    overlay._meta = { ...meta };
    overlay.querySelector('#gutterEditorTitle').textContent = isEn ? 'Edit Top-View Gutter' : 'Üst Görünüş Oluğu Düzenle';
    overlay.querySelector('#gutterEditorMeta').textContent = isEn ? 'The front/opposite view uses the same canonical gutter bounds.' : 'Karşı görünüş oluğu aynı kanonik sınırları otomatik kullanır.';
    overlay.querySelector('#gutterMinusXLabel').textContent = isEn ? '−X side extension / shortening *(mm)' : '−X tarafı uzatma / kısaltma *(mm)';
    overlay.querySelector('#gutterPlusXLabel').textContent = isEn ? '+X side extension / shortening *(mm)' : '+X tarafı uzatma / kısaltma *(mm)';
    overlay.querySelector('#gutterEditorNote').textContent = isEn ? 'Positive values extend that side; negative values shorten it. Both views update together.' : 'Pozitif değer o tarafı uzatır, negatif değer kısaltır. İki görünüş birlikte güncellenir.';
    overlay.querySelector('#gutterEditorReset').textContent = isEn ? 'Reset' : 'Sıfırla';
    overlay.querySelector('#gutterEditorCancel').textContent = isEn ? 'Cancel' : 'İptal';
    overlay.querySelector('#gutterMinusXInput').value = String(Number(state.minusXDelta.toFixed(3)));
    overlay.querySelector('#gutterPlusXInput').value = String(Number(state.plusXDelta.toFixed(3)));
    overlay.querySelector('#gutterEditorError').textContent = '';
    overlay.hidden = false;
    window.setTimeout(() => overlay.querySelector('#gutterMinusXInput').focus({ preventScroll: true }), 20);
  }

  function ensurePostEditorOverlay() {
    let overlay = $('postEditorOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'postEditorOverlay';
    overlay.className = 'dim-edit-overlay post-editor-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <form id="postEditorForm" class="dim-edit-card">
        <div class="dim-edit-title" id="postEditorTitle">Ön Dikme Düzenle</div>
        <div class="dim-edit-meta" id="postEditorMeta"></div>
        <div class="post-editor-grid">
          <label><span id="postEditorCountLabel">Dikme adedi</span><input id="postEditorCountInput" type="text" inputmode="numeric" autocomplete="off" /></label>
          <label><span id="postEditorXLabel">Seçili dikme X aksı *(mm)</span><input id="postEditorXInput" type="text" inputmode="decimal" autocomplete="off" /></label>
          <div>
            <div class="dim-edit-label"><span id="postPlacementLegend">Dikme yerleşim mantığı</span></div>
            <div class="post-placement-options">
              <label><input type="radio" name="postPlacementMode" value="standard" checked /> <span id="postPlacementStandard">Standart bölme</span></label>
              <label><input type="radio" name="postPlacementMode" value="equal" /> <span id="postPlacementEqual">Eşit bölme</span></label>
            </div>
          </div>
          <div id="postEditorNote" class="post-editor-note"></div>
        </div>
        <div class="dim-edit-actions">
          <button id="postEditorChangeProfile" type="button" class="secondary-btn">Dikmeyi Değiştir</button>
          <button id="postEditorExtend" type="button" class="secondary-btn">Dikmeyi Uzat</button>
          <button id="postEditorDelete" type="button" class="dim-edit-delete">Dikmeyi Sil</button>
          <button id="postEditorCancel" type="button" class="dim-edit-cancel">İptal</button>
          <button id="postEditorApply" type="submit" class="dim-edit-apply">Tamam</button>
        </div>
      </form>`;
    previewPanel.appendChild(overlay);
    overlay.querySelector('#postEditorCancel').addEventListener('click', () => { overlay.hidden = true; });
    overlay.querySelector('#postEditorChangeProfile').addEventListener('click', () => { const idx=Number(overlay.dataset.postIndex||0)||0; overlay.hidden=true; showFrontPostProfileOverlay(idx); });
    overlay.querySelector('#postEditorExtend').addEventListener('click', () => { const idx=Number(overlay.dataset.postIndex||0)||0; overlay.hidden=true; showFrontPostExtensionOverlay(idx); });
    overlay.querySelector('#postEditorDelete').addEventListener('click', () => {
      const idx = Number(overlay.dataset.postIndex || 0) || 0;
      if (!window.confirm(currentLanguage === 'en' ? 'Delete this front post?' : 'Bu ön dikme silinsin mi?')) return;
      try { deleteFrontPost(idx); }
      catch (err) { window.alert(err.message); return; }
      overlay.hidden = true;
      updatePreview(false);
      statusText.textContent = currentLanguage === 'en' ? 'Front post deleted.' : 'Ön dikme silindi.';
    });
    overlay.addEventListener('click', evt => { if (evt.target === overlay) overlay.hidden = true; });
    overlay.addEventListener('keydown', evt => { if (evt.key === 'Escape') { evt.preventDefault(); overlay.hidden = true; } });
    overlay.querySelector('#postEditorForm').addEventListener('submit', evt => {
      evt.preventDefault();
      const countInput = overlay.querySelector('#postEditorCountInput');
      const nextCount = Math.max(0, Number(String(countInput.value || '').replace(/[^0-9]/g, '')) || 0);
      const mode = (overlay.querySelector('input[name="postPlacementMode"]:checked') || {}).value || 'standard';
      const postEl = $('postCount');
      if (postEl) {
        postEl.value = String(nextCount);
        postEl.dataset.userEdited = 'true';
      }
      manualPostPlacementMode = mode === 'equal' ? 'equal' : 'standard';
      const currentCenters = currentFrontPostCenters();
      const selectedIndex = Math.max(0, Number(overlay.dataset.postIndex || 0) || 0);
      const xValue = Number(String(overlay.querySelector('#postEditorXInput').value || '').replace(',', '.'));
      if (nextCount === currentCenters.length && Number.isFinite(xValue) && currentCenters[selectedIndex] !== undefined) {
        const nextCenters = currentCenters.slice();
        const ownW = frontPostWidthAt(selectedIndex);
        if (selectedIndex > 0) {
          const minX = nextCenters[selectedIndex - 1] + (frontPostWidthAt(selectedIndex - 1) + ownW) / 2 + 1;
          if (xValue < minX) { window.alert(currentLanguage === 'en' ? 'The post would overlap the previous post.' : 'Dikme önceki dikmeyle çakışır.'); return; }
        }
        if (selectedIndex < nextCenters.length - 1) {
          const maxX = nextCenters[selectedIndex + 1] - (frontPostWidthAt(selectedIndex + 1) + ownW) / 2 - 1;
          if (xValue > maxX) { window.alert(currentLanguage === 'en' ? 'The post would overlap the next post.' : 'Dikme sonraki dikmeyle çakışır.'); return; }
        }
        nextCenters[selectedIndex] = xValue;
        customFrontPostCenters = nextCenters;
      } else {
        customFrontPostCenters = null;
        // Dikme adedi değiştiğinde profil ve manuel -Y uzatma bilgileri indeks bazında korunur.
        frontPostProfiles = Array.from({ length: nextCount }, (_, index) => frontPostProfiles[index] ? deepCloneJson(frontPostProfiles[index]) : null);
        frontPostExtensions = Array.from({ length: nextCount }, (_, index) => Math.max(0, Number(frontPostExtensions[index]) || 0));
        slidingPlacements = [];
        guillotinePlacements = [];
        zipScreenPlacements = [];
      }
      overlay.hidden = true;
      updatePreview(false);
      statusText.textContent = currentLanguage === 'en'
        ? `Front post count set to ${nextCount}. Placement mode: ${manualPostPlacementMode === 'equal' ? 'equal division' : 'standard division'}.`
        : `Ön dikme adedi ${nextCount} olarak ayarlandı. Yerleşim modu: ${manualPostPlacementMode === 'equal' ? 'eşit bölme' : 'standart bölme'}.`;
    });
    return overlay;
  }

  function showPostEditorOverlay(meta) {
    const overlay = ensurePostEditorOverlay();
    const isEn = currentLanguage === 'en';
    overlay.querySelector('#postEditorTitle').textContent = isEn ? 'Edit Front Posts' : 'Ön Dikme Düzenle';
    overlay.querySelector('#postEditorCountLabel').textContent = isEn ? 'Post count' : 'Dikme adedi';
    overlay.querySelector('#postEditorXLabel').textContent = isEn ? 'Selected post X axis *(mm)' : 'Seçili dikme X aksı *(mm)';
    overlay.querySelector('#postPlacementLegend').textContent = isEn ? 'Post placement logic' : 'Dikme yerleşim mantığı';
    overlay.querySelector('#postPlacementStandard').textContent = isEn ? 'Standard division' : 'Standart bölme';
    overlay.querySelector('#postPlacementEqual').textContent = isEn ? 'Equal division' : 'Eşit bölme';
    overlay.querySelector('#postEditorCancel').textContent = isEn ? 'Cancel' : 'İptal';
    overlay.querySelector('#postEditorApply').textContent = isEn ? 'OK' : 'Tamam';
    overlay.querySelector('#postEditorChangeProfile').textContent = isEn ? 'Change Post' : 'Dikmeyi Değiştir';
    overlay.querySelector('#postEditorExtend').textContent = isEn ? 'Extend Post' : 'Dikmeyi Uzat';
    overlay.querySelector('#postEditorDelete').textContent = isEn ? 'Delete Post' : 'Dikmeyi Sil';
    overlay.querySelector('#postEditorDelete').disabled = Number(meta.currentPostCount || 0) <= 2;
    overlay.querySelector('#postEditorDelete').classList.toggle('disabled', Number(meta.currentPostCount || 0) <= 2);
    overlay.dataset.postIndex = String(meta.postIndex || 0);
    overlay.querySelector('#postEditorMeta').innerHTML = `
      <b>${isEn ? 'Clicked front post' : 'Tıklanan ön dikme'}:</b> ${meta.postIndex + 1} / ${Math.max(meta.currentPostCount || 0, meta.postIndex + 1)}<br>
      <b>${isEn ? 'Current post count' : 'Mevcut dikme adedi'}:</b> ${meta.currentPostCount}<br>
      <b>${isEn ? 'Ray axis count' : 'Ray aks adedi'}:</b> ${meta.totalRayCount}<br>
      <b>${isEn ? 'Profile' : 'Profil'}:</b> ${Math.round(meta.en || 100)} × ${Math.round(meta.boy || 100)} × ${Math.round(meta.et || 2)} mm<br>
      <b>${isEn ? '-Y extension' : '-Y uzatma'}:</b> ${Math.round(meta.postExtension || frontPostExtensions[meta.postIndex] || 0)} mm`;
    overlay.querySelector('#postEditorCountInput').value = String(meta.currentPostCount || ($('postCount') ? $('postCount').value : '') || '');
    overlay.querySelector('#postEditorXInput').value = String(Number.isFinite(Number(meta.postX)) ? Number(meta.postX) : (currentFrontPostCenters()[meta.postIndex] || 0));
    overlay.querySelectorAll('input[name="postPlacementMode"]').forEach(r => { r.checked = r.value === manualPostPlacementMode; });
    overlay.querySelector('#postEditorNote').textContent = isEn
      ? 'Standard division keeps the existing axis-based logic when post count and ray axis count match. Equal division always distributes posts equally.'
      : 'Standart bölme, dikme sayısı ile ray aks sayısı eşitse mevcut aks mantığını korur. Eşit bölme seçilirse dikmeler her durumda eşit aralıkla dağıtılır.';
    overlay.hidden = false;
    const input = overlay.querySelector('#postEditorCountInput');
    window.setTimeout(() => { input.focus({ preventScroll: true }); input.select(); }, 20);
  }


  function ensureTriangleEditorOverlay() {
    let overlay = $('triangleEditorOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'triangleEditorOverlay';
    overlay.className = 'dim-edit-overlay triangle-editor-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <form id="triangleEditorForm" class="dim-edit-card">
        <div class="dim-edit-title" id="triangleEditorTitle">Üçgen Doğrama Düzenle</div>
        <div class="dim-edit-meta" id="triangleEditorMeta"></div>
        <label class="dim-edit-value-wrap"><span id="triangleDivisionLabel">Bölme sayısı</span><input id="triangleDivisionInput" type="text" inputmode="numeric" autocomplete="off" /></label>
        <div id="triangleEditorError" class="dim-edit-error" aria-live="polite"></div>
        <div class="dim-edit-actions">
          <button id="triangleEditorDelete" type="button" class="dim-edit-delete">Üçgen Doğramayı Sil</button>
          <button id="triangleEditorCancel" type="button" class="dim-edit-cancel">İptal</button>
          <button id="triangleEditorApply" type="submit" class="dim-edit-apply">Tamam</button>
        </div>
      </form>`;
    previewPanel.appendChild(overlay);
    overlay.addEventListener('click', evt => { if (evt.target === overlay) overlay.hidden = true; });
    overlay.querySelector('#triangleEditorCancel').addEventListener('click', () => { overlay.hidden = true; });
    overlay.querySelector('#triangleEditorDelete').addEventListener('click', () => {
      const key = normalizeSideViewKey(overlay.dataset.sideViewKey, Number(overlay.dataset.sideIndex || 0));
      if (!window.confirm(currentLanguage === 'en' ? 'Delete this triangle joinery?' : 'Bu üçgen doğrama silinsin mi?')) return;
      setSideFeatureValue('triangle', key, false);
      setSideScopedStateValue(triangleDivisionState, key, null);
      syncMainFormFromSideFeature('triangle');
      syncToolboxBooleanButtons();
      overlay.hidden = true;
      updatePreview(false);
      statusText.textContent = currentLanguage === 'en' ? 'Triangle joinery deleted from this side.' : 'Üçgen doğrama yalnızca bu yan görünüşten silindi.';
    });
    overlay.querySelector('#triangleEditorForm').addEventListener('submit', evt => {
      evt.preventDefault();
      const input = overlay.querySelector('#triangleDivisionInput');
      const count = Math.max(1, Math.min(50, Number(String(input.value || '').replace(/[^0-9]/g, '')) || 1));
      const key = normalizeSideViewKey(overlay.dataset.sideViewKey, Number(overlay.dataset.sideIndex || 0));
      setSideScopedStateValue(triangleDivisionState, key, count);
      setSideFeatureValue('triangle', key, true);
      syncMainFormFromSideFeature('triangle');
      syncToolboxBooleanButtons();
      overlay.hidden = true;
      updatePreview(false);
      statusText.textContent = currentLanguage === 'en' ? `Triangle joinery division count set to ${count}.` : `Üçgen doğrama bölme sayısı ${count} olarak ayarlandı.`;
    });
    return overlay;
  }

  function showTriangleEditorOverlay(meta) {
    const overlay = ensureTriangleEditorOverlay();
    const isEn = currentLanguage === 'en';
    const key = normalizeSideViewKey(meta.sideViewKey, meta.sideIndex);
    overlay.dataset.sideViewKey = key;
    overlay.dataset.sideIndex = String(meta.sideIndex || 0);
    overlay.querySelector('#triangleEditorTitle').textContent = isEn ? 'Edit Triangle Joinery' : 'Üçgen Doğrama Düzenle';
    overlay.querySelector('#triangleEditorMeta').innerHTML = `<b>${isEn ? 'Side view' : 'Yan görünüş'}:</b> ${key === 'right' ? (isEn ? 'Right' : 'Sağ') : (key === '0' ? (isEn ? 'Left' : 'Sol') : `${Number(meta.sideIndex || 0) + 1}. ${isEn ? 'position' : 'poz'}`)}<br><b>${isEn ? 'Outer frame' : 'Dış çerçeve'}:</b> ${isEn ? 'kept unchanged' : 'değişmeden korunur'}`;
    overlay.querySelector('#triangleDivisionLabel').textContent = isEn ? 'Division count' : 'Bölme sayısı';
    overlay.querySelector('#triangleEditorDelete').textContent = isEn ? 'Delete Triangle' : 'Üçgen Doğramayı Sil';
    overlay.querySelector('#triangleEditorCancel').textContent = isEn ? 'Cancel' : 'İptal';
    overlay.querySelector('#triangleEditorApply').textContent = isEn ? 'OK' : 'Tamam';
    overlay.querySelector('#triangleEditorError').textContent = '';
    overlay.querySelector('#triangleDivisionInput').value = String(triangleDivisionForKey(key, meta.triangleDivisionCount || 1) || 1);
    overlay.hidden = false;
    window.setTimeout(() => { const input = overlay.querySelector('#triangleDivisionInput'); input.focus({ preventScroll: true }); input.select(); }, 20);
  }

  function ensureBackWallEditorOverlay() {
    let overlay = $('backWallEditorOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'backWallEditorOverlay';
    overlay.className = 'dim-edit-overlay back-wall-editor-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <form id="backWallEditorForm" class="dim-edit-card back-wall-editor-card">
        <div class="dim-edit-title" id="backWallEditorTitle">Arka Duvar Düzenleme</div>
        <div class="dim-edit-meta" id="backWallEditorMeta"></div>
        <div class="back-wall-editor-grid">
          <div class="back-wall-editor-row">
            <div class="back-wall-editor-name" id="backWallWidthName">Genişlik</div>
            <label><span id="backWallWidthDirectionLabel">Yön</span><select id="backWallWidthDirection"><option value="equal">Eşit</option><option value="wall">Duvar Tarafı</option><option value="front">Ön Dikme Tarafı</option></select></label>
            <label><span id="backWallWidthValueLabel">Değer *(mm)</span><input id="backWallWidthValue" type="text" inputmode="numeric" autocomplete="off" placeholder="Boş: değiştirme" /></label>
            <label><span id="backWallWidthOperationLabel">İşlem</span><select id="backWallWidthOperation"><option value="extend">Uzat</option><option value="shorten">Kısalt</option></select></label>
          </div>
          <div class="back-wall-editor-row">
            <div class="back-wall-editor-name" id="backWallHeightName">Yükseklik</div>
            <label><span id="backWallHeightDirectionLabel">Yön</span><select id="backWallHeightDirection"><option value="equal">Eşit</option><option value="down">Aşağı</option><option value="up">Yukarı</option></select></label>
            <label><span id="backWallHeightValueLabel">Değer *(mm)</span><input id="backWallHeightValue" type="text" inputmode="numeric" autocomplete="off" placeholder="Boş: değiştirme" /></label>
            <label><span id="backWallHeightOperationLabel">İşlem</span><select id="backWallHeightOperation"><option value="extend">Uzat</option><option value="shorten">Kısalt</option></select></label>
          </div>
          <div class="back-wall-division-grid">
            <label><span id="backWallColumnsLabel">Dikey Bölme</span><input id="backWallColumnsInput" type="text" inputmode="numeric" autocomplete="off" value="1" /></label>
            <label><span id="backWallRowsLabel">Yatay Bölme</span><input id="backWallRowsInput" type="text" inputmode="numeric" autocomplete="off" value="1" /></label>
          </div>
        </div>
        <div class="post-editor-note" id="backWallEditorNote"></div>
        <div id="backWallEditorError" class="dim-edit-error" aria-live="polite"></div>
        <div class="dim-edit-actions">
          <button id="backWallEditorReset" type="button" class="secondary-btn">Default</button>
          <button id="backWallEditorDelete" type="button" class="dim-edit-delete">Duvarı Sil</button>
          <button id="backWallEditorCancel" type="button" class="dim-edit-cancel">İptal</button>
          <button id="backWallEditorApply" type="submit" class="dim-edit-apply">Tamam</button>
        </div>
      </form>`;
    previewPanel.appendChild(overlay);
    const close = () => { overlay.hidden = true; focusPreviewCanvas(); };
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) close(); });
    overlay.addEventListener('keydown', evt => { if (evt.key === 'Escape') { evt.preventDefault(); close(); } });
    overlay.querySelector('#backWallEditorCancel').addEventListener('click', close);
    overlay.querySelectorAll('#backWallWidthValue,#backWallHeightValue,#backWallColumnsInput,#backWallRowsInput').forEach(input => input.addEventListener('input', () => {
      input.value = String(input.value || '').replace(/[^0-9]/g, '');
      overlay.querySelector('#backWallEditorError').textContent = '';
    }));
    overlay.querySelectorAll('select').forEach(select => select.addEventListener('change', () => { overlay.querySelector('#backWallEditorError').textContent = ''; }));
    overlay.querySelector('#backWallEditorReset').addEventListener('click', () => {
      const key = normalizeSideViewKey(overlay.dataset.sideViewKey, Number(overlay.dataset.sideIndex || 0));
      beginHistoryTransaction();
      try {
        setSideScopedStateValue(backWallState, key, { enabled: true, xOffset: 0, depth: 600, height: 0 });
        if (backWallSegments && backWallSegments.side) delete backWallSegments.side[key];
        if (backWallGridState && backWallGridState.side) delete backWallGridState.side[key];
        close();
        updatePreview(false);
      } finally { endHistoryTransaction(true); }
      statusText.textContent = currentLanguage === 'en' ? 'Back wall restored to default.' : 'Arka duvar varsayılan ölçülerine döndürüldü.';
    });
    overlay.querySelector('#backWallEditorDelete').addEventListener('click', () => {
      const key = normalizeSideViewKey(overlay.dataset.sideViewKey, Number(overlay.dataset.sideIndex || 0));
      const sideIndex = Number(overlay.dataset.sideIndex || 0);
      const rearHeight = Number(overlay.dataset.rearHeight || 1);
      const current = sideScopedStateValue(backWallState, key, { enabled: true, xOffset: 0, depth: 600, height: 0 }) || {};
      beginHistoryTransaction();
      try {
        setSideScopedStateValue(backWallState, key, { ...current, enabled: false });
        updatePreview(false);
      } finally { endHistoryTransaction(true); }
      showBackWallEditorOverlay({ sideViewKey: key, sideIndex, wallHeight: rearHeight });
      statusText.textContent = currentLanguage === 'en' ? 'Back wall deleted. Default restores it; no drawing-area restore target remains.' : 'Arka duvar silindi. Default ile geri yüklenebilir; çizim alanında yeniden ekleme hedefi bırakılmadı.';
    });
    overlay.querySelector('#backWallEditorForm').addEventListener('submit', evt => {
      evt.preventDefault();
      const readOptionalPositiveInteger = selector => {
        const text = String(overlay.querySelector(selector).value || '').trim();
        if (text === '') return '';
        const value = Number(text);
        return Number.isInteger(value) && value > 0 ? String(value) : null;
      };
      const widthValue = readOptionalPositiveInteger('#backWallWidthValue');
      const heightValue = readOptionalPositiveInteger('#backWallHeightValue');
      const columnsText = readOptionalPositiveInteger('#backWallColumnsInput');
      const rowsText = readOptionalPositiveInteger('#backWallRowsInput');
      const error = overlay.querySelector('#backWallEditorError');
      if (widthValue === null || heightValue === null || columnsText === null || rowsText === null || columnsText === '' || rowsText === '') {
        error.textContent = currentLanguage === 'en' ? 'Enter positive whole-number millimetre values and positive division counts.' : 'Yalnız pozitif tam sayı milimetre değeri ve pozitif bölme sayıları gir.';
        return;
      }
      const columns = Number(columnsText), rows = Number(rowsText);
      const limit = applicationLimits().maxSegmentsPerView;
      if (columns * rows > limit) {
        error.textContent = currentLanguage === 'en' ? `Total cells may not exceed ${limit}.` : `Toplam hücre sayısı ${limit} değerini aşamaz.`;
        return;
      }
      const key = normalizeSideViewKey(overlay.dataset.sideViewKey, Number(overlay.dataset.sideIndex || 0));
      const currentBounds = overlay._currentBounds || { minX: 0, maxX: 600, minY: 0, maxY: Math.max(1, Number(overlay.dataset.rearHeight || 1)) };
      const widthDirection = overlay.querySelector('#backWallWidthDirection').value;
      const heightDirection = overlay.querySelector('#backWallHeightDirection').value;
      const settings = {
        width: {
          placement: widthDirection === 'wall' ? 'left' : (widthDirection === 'front' ? 'right' : 'equal'),
          operation: overlay.querySelector('#backWallWidthOperation').value,
          value: widthValue
        },
        length: {
          placement: heightDirection,
          operation: overlay.querySelector('#backWallHeightOperation').value,
          value: heightValue
        }
      };
      const bounds = window.PulumurGeometry && typeof window.PulumurGeometry.trapezSheetBoundsFromEditor === 'function'
        ? window.PulumurGeometry.trapezSheetBoundsFromEditor(currentBounds, currentBounds, settings)
        : currentBounds;
      if (!Object.values(bounds).every(Number.isFinite) || !(bounds.maxX > bounds.minX) || !(bounds.maxY > bounds.minY)) {
        error.textContent = currentLanguage === 'en' ? 'The selected shortening would reduce wall width or height to zero.' : 'Seçilen kısaltma duvar genişliğini veya yüksekliğini sıfıra indiriyor.';
        return;
      }
      const dx = (bounds.maxX - bounds.minX) / columns;
      const dy = (bounds.maxY - bounds.minY) / rows;
      const stamp = Date.now();
      const cells = [];
      for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) cells.push({
        id: `back_wall_cell_${key}_${stamp}_${row + 1}_${column + 1}`,
        minX: bounds.minX + dx * column,
        maxX: column === columns - 1 ? bounds.maxX : bounds.minX + dx * (column + 1),
        minY: bounds.minY + dy * row,
        maxY: row === rows - 1 ? bounds.maxY : bounds.minY + dy * (row + 1)
      });
      const currentState = sideScopedStateValue(backWallState, key, { enabled: true, xOffset: 0, depth: 600, height: 0 }) || {};
      beginHistoryTransaction();
      try {
        const nextGrid = { version: 1, autoHeight: false, columns, rows, bounds, cells };
        storeBackWallGridForKey(key, nextGrid);
        syncBackWallCompatibilityFromGrid(key, nextGrid);
        setSideScopedStateValue(backWallState, key, {
          enabled: true,
          xOffset: Number.isFinite(Number(currentState.xOffset)) ? Number(currentState.xOffset) : 0,
          depth: Math.max(1, Number(bounds.maxX) || 600),
          height: Math.max(0, Number(bounds.maxY) || 0)
        });
        close();
        updatePreview(false);
      } finally { endHistoryTransaction(true); }
      statusText.textContent = currentLanguage === 'en' ? 'Back wall updated.' : 'Arka duvar güncellendi.';
    });
    return overlay;
  }

  function showBackWallEditorOverlay(meta) {
    const overlay = ensureBackWallEditorOverlay();
    const isEn = currentLanguage === 'en';
    const key = normalizeSideViewKey(meta.sideViewKey, meta.sideIndex);
    const positionIndex = key === 'right' ? Math.max(0, Number(lastDrawing && lastDrawing.input && lastDrawing.input.sidePositionCount || 1) - 1) : Math.max(0, Number(meta.sideIndex) || Number(key) || 0);
    const rearHeight = lastDrawing && lastDrawing.input && lastDrawing.input.positions && lastDrawing.input.positions[positionIndex] ? Number(lastDrawing.input.positions[positionIndex].rearHeight) : Number(meta.wallHeight || 1);
    const state = wallStateForKey(key, rearHeight);
    const grid = backWallGridForKey(key, rearHeight);
    selectedBackWallCopySource = { key, sideIndex: positionIndex };
    const sideLabel = key === 'right' ? (isEn ? 'Right' : 'Sağ') : key === '0' ? (isEn ? 'Left' : 'Sol') : `${isEn ? 'Middle' : 'Ara'} ${Number(key) + 1}`;
    overlay.dataset.sideViewKey = key;
    overlay.dataset.sideIndex = String(positionIndex);
    overlay.dataset.rearHeight = String(rearHeight);
    overlay._currentBounds = { ...grid.bounds };
    overlay.querySelector('#backWallEditorTitle').textContent = isEn ? 'Back Wall Editing' : 'Arka Duvar Düzenleme';
    overlay.querySelector('#backWallEditorMeta').innerHTML = `<b>${isEn ? 'Side view' : 'Yan görünüş'}:</b> ${sideLabel}<br><b>${isEn ? 'Current size' : 'Mevcut ölçü'}:</b> ${Math.round(grid.bounds.maxX - grid.bounds.minX)} × ${Math.round(grid.bounds.maxY - grid.bounds.minY)} mm · ${isEn ? 'Cells' : 'Hücre'}: ${grid.cells.length}`;
    overlay.querySelector('#backWallWidthName').textContent = isEn ? 'Width' : 'Genişlik';
    overlay.querySelector('#backWallHeightName').textContent = isEn ? 'Height' : 'Yükseklik';
    overlay.querySelectorAll('#backWallWidthDirectionLabel,#backWallHeightDirectionLabel').forEach(node => { node.textContent = isEn ? 'Direction' : 'Yön'; });
    overlay.querySelectorAll('#backWallWidthValueLabel,#backWallHeightValueLabel').forEach(node => { node.textContent = isEn ? 'Value *(mm)' : 'Değer *(mm)'; });
    overlay.querySelectorAll('#backWallWidthOperationLabel,#backWallHeightOperationLabel').forEach(node => { node.textContent = isEn ? 'Operation' : 'İşlem'; });
    const widthDirection = overlay.querySelector('#backWallWidthDirection');
    widthDirection.options[0].textContent = isEn ? 'Equal' : 'Eşit';
    widthDirection.options[1].textContent = isEn ? 'Wall Side' : 'Duvar Tarafı';
    widthDirection.options[2].textContent = isEn ? 'Front Post Side' : 'Ön Dikme Tarafı';
    const heightDirection = overlay.querySelector('#backWallHeightDirection');
    heightDirection.options[0].textContent = isEn ? 'Equal' : 'Eşit';
    heightDirection.options[1].textContent = isEn ? 'Down' : 'Aşağı';
    heightDirection.options[2].textContent = isEn ? 'Up' : 'Yukarı';
    [overlay.querySelector('#backWallWidthOperation'), overlay.querySelector('#backWallHeightOperation')].forEach(select => {
      select.options[0].textContent = isEn ? 'Extend' : 'Uzat';
      select.options[1].textContent = isEn ? 'Shorten' : 'Kısalt';
    });
    overlay.querySelector('#backWallColumnsLabel').textContent = isEn ? 'Vertical Divisions' : 'Dikey Bölme';
    overlay.querySelector('#backWallRowsLabel').textContent = isEn ? 'Horizontal Divisions' : 'Yatay Bölme';
    overlay.querySelector('#backWallEditorNote').textContent = state.enabled
      ? (isEn ? 'Blank width or height leaves that size unchanged. Changing division counts rebuilds the grid and resets individual part edits.' : 'Boş bırakılan genişlik veya yükseklik değişmez. Bölme sayıları değiştirildiğinde grid yeniden kurulur ve bağımsız parça düzenlemeleri sıfırlanır.')
      : (isEn ? 'This wall is deleted. Use Default to restore the original wall; no restore target remains on the drawing.' : 'Bu duvar silinmiş durumda. Başlangıç duvarını geri getirmek için Default kullan; çizim üzerinde yeniden ekleme hedefi yoktur.');
    overlay.querySelector('#backWallEditorReset').textContent = 'Default';
    overlay.querySelector('#backWallEditorDelete').textContent = isEn ? 'Delete Wall' : 'Duvarı Sil';
    overlay.querySelector('#backWallEditorDelete').hidden = !state.enabled;
    overlay.querySelector('#backWallEditorCancel').textContent = isEn ? 'Cancel' : 'İptal';
    overlay.querySelector('#backWallEditorApply').textContent = isEn ? 'OK' : 'Tamam';
    overlay.querySelector('#backWallEditorApply').hidden = !state.enabled;
    overlay.querySelector('#backWallWidthDirection').value = 'equal';
    overlay.querySelector('#backWallHeightDirection').value = 'equal';
    overlay.querySelector('#backWallWidthOperation').value = 'extend';
    overlay.querySelector('#backWallHeightOperation').value = 'extend';
    overlay.querySelector('#backWallWidthValue').value = '';
    overlay.querySelector('#backWallHeightValue').value = '';
    const xs = new Set(grid.cells.flatMap(cell => [cell.minX, cell.maxX]).map(value => Number(value).toFixed(6)));
    const ys = new Set(grid.cells.flatMap(cell => [cell.minY, cell.maxY]).map(value => Number(value).toFixed(6)));
    overlay.querySelector('#backWallColumnsInput').value = String(Math.max(1, Math.floor(Number(grid.columns) || Math.max(1, xs.size - 1))));
    overlay.querySelector('#backWallRowsInput').value = String(Math.max(1, Math.floor(Number(grid.rows) || Math.max(1, ys.size - 1))));
    overlay.querySelector('#backWallEditorError').textContent = '';
    overlay.hidden = false;
    window.setTimeout(() => overlay.querySelector('#backWallWidthValue').focus({ preventScroll: true }), 20);
  }



  function ensureBackWallCellEditorOverlay() {
    let overlay = $('backWallCellEditorOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'backWallCellEditorOverlay';
    overlay.className = 'dim-edit-overlay back-wall-editor-overlay back-wall-cell-editor-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <form id="backWallCellEditorForm" class="dim-edit-card back-wall-editor-card back-wall-cell-editor-card">
        <div class="dim-edit-title" id="backWallCellEditorTitle">Arka Duvar Parçası Düzenleme</div>
        <div class="dim-edit-meta" id="backWallCellEditorMeta"></div>
        <div class="back-wall-editor-grid">
          <div class="back-wall-editor-row">
            <div class="back-wall-editor-name" id="backWallCellWidthName">Genişlik</div>
            <label><span id="backWallCellWidthDirectionLabel">Yön</span><select id="backWallCellWidthDirection"><option value="equal">Eşit</option><option value="wall">Duvar Tarafı</option><option value="front">Ön Dikme Tarafı</option></select></label>
            <label><span id="backWallCellWidthValueLabel">Değer *(mm)</span><input id="backWallCellWidthValue" type="text" inputmode="numeric" autocomplete="off" placeholder="Boş: değiştirme" /></label>
            <label><span id="backWallCellWidthOperationLabel">İşlem</span><select id="backWallCellWidthOperation"><option value="extend">Uzat</option><option value="shorten">Kısalt</option></select></label>
          </div>
          <div class="back-wall-editor-row">
            <div class="back-wall-editor-name" id="backWallCellHeightName">Yükseklik</div>
            <label><span id="backWallCellHeightDirectionLabel">Yön</span><select id="backWallCellHeightDirection"><option value="equal">Eşit</option><option value="down">Aşağı</option><option value="up">Yukarı</option></select></label>
            <label><span id="backWallCellHeightValueLabel">Değer *(mm)</span><input id="backWallCellHeightValue" type="text" inputmode="numeric" autocomplete="off" placeholder="Boş: değiştirme" /></label>
            <label><span id="backWallCellHeightOperationLabel">İşlem</span><select id="backWallCellHeightOperation"><option value="extend">Uzat</option><option value="shorten">Kısalt</option></select></label>
          </div>
          <div class="back-wall-editor-row">
            <div class="back-wall-editor-name">Alt Bölme</div>
            <label><span>Dikey bölme</span><input id="backWallCellColumnsInput" type="text" inputmode="numeric" value="1" /></label>
            <label><span>Yatay bölme</span><input id="backWallCellRowsInput" type="text" inputmode="numeric" value="1" /></label>
          </div>
        </div>
        <div class="post-editor-note" id="backWallCellEditorNote"></div>
        <div id="backWallCellEditorError" class="dim-edit-error" aria-live="polite"></div>
        <div class="dim-edit-actions">
          <button id="backWallCellEditorWhole" type="button" class="secondary-btn">Tüm Duvarı Düzenle</button>
          <button id="backWallCellEditorDelete" type="button" class="dim-edit-delete">Parçayı Sil</button>
          <button id="backWallCellEditorCancel" type="button" class="dim-edit-cancel">İptal</button>
          <button id="backWallCellEditorApply" type="submit" class="dim-edit-apply">Tamam</button>
        </div>
      </form>`;
    previewPanel.appendChild(overlay);
    const close = () => { overlay.hidden = true; focusPreviewCanvas(); };
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) close(); });
    overlay.addEventListener('keydown', evt => { if (evt.key === 'Escape') { evt.preventDefault(); close(); } });
    overlay.querySelector('#backWallCellEditorCancel').addEventListener('click', close);
    overlay.querySelectorAll('#backWallCellWidthValue,#backWallCellHeightValue,#backWallCellColumnsInput,#backWallCellRowsInput').forEach(input => input.addEventListener('input', () => {
      input.value = String(input.value || '').replace(/[^0-9]/g, '');
      overlay.querySelector('#backWallCellEditorError').textContent = '';
    }));
    overlay.querySelectorAll('select').forEach(select => select.addEventListener('change', () => { overlay.querySelector('#backWallCellEditorError').textContent = ''; }));
    overlay.querySelector('#backWallCellEditorWhole').addEventListener('click', () => {
      const meta = { ...(overlay._meta || {}) };
      close();
      showBackWallEditorOverlay(meta);
    });
    overlay.querySelector('#backWallCellEditorDelete').addEventListener('click', () => {
      const meta = overlay._meta || {};
      const key = normalizeSideViewKey(meta.sideViewKey, meta.sideIndex);
      const grid = backWallGridForKey(key, Number(overlay.dataset.rearHeight || meta.wallHeight || 1));
      const index = grid.cells.findIndex(cell => String(cell.id) === String(meta.wallCellId));
      if (index < 0) return;
      const cells = grid.cells.map(cell => ({ ...cell }));
      cells[index] = { ...cells[index], enabled: false };
      const nextGrid = { ...grid, autoHeight: false, bounds: backWallGridBoundsFromCells(cells, grid.bounds), cells };
      beginHistoryTransaction();
      try {
        storeBackWallGridForKey(key, nextGrid);
        syncBackWallCompatibilityFromGrid(key, nextGrid);
        updatePreview(false);
      } finally { endHistoryTransaction(true); }
      showBackWallCellEditorOverlay({ ...meta, wallCellEnabled: false });
      statusText.textContent = currentLanguage === 'en' ? 'Back-wall part deleted. Default in the whole-wall editor restores the initial wall; no drawing-area restore target remains.' : 'Arka duvar parçası silindi. Başlangıç duvarı Tüm Duvarı Düzenle içindeki Default ile geri getirilebilir; çizim alanında yeniden ekleme hedefi bırakılmadı.';
    });
    overlay.querySelector('#backWallCellEditorForm').addEventListener('submit', evt => {
      evt.preventDefault();
      const readOptionalPositiveInteger = selector => {
        const text = String(overlay.querySelector(selector).value || '').trim();
        if (text === '') return '';
        const value = Number(text);
        return Number.isInteger(value) && value > 0 ? String(value) : null;
      };
      const widthValue = readOptionalPositiveInteger('#backWallCellWidthValue');
      const heightValue = readOptionalPositiveInteger('#backWallCellHeightValue');
      const columnsValue = readOptionalPositiveInteger('#backWallCellColumnsInput') || '1';
      const rowsValue = readOptionalPositiveInteger('#backWallCellRowsInput') || '1';
      const error = overlay.querySelector('#backWallCellEditorError');
      if (widthValue === null || heightValue === null || columnsValue === null || rowsValue === null) {
        error.textContent = currentLanguage === 'en' ? 'Enter positive whole-number millimetre values.' : 'Yalnız pozitif tam sayı milimetre değeri gir.';
        return;
      }
      const meta = overlay._meta || {};
      const key = normalizeSideViewKey(meta.sideViewKey, meta.sideIndex);
      const grid = backWallGridForKey(key, Number(overlay.dataset.rearHeight || meta.wallHeight || 1));
      const index = grid.cells.findIndex(cell => String(cell.id) === String(meta.wallCellId));
      if (index < 0) { error.textContent = currentLanguage === 'en' ? 'Wall part could not be found.' : 'Arka duvar parçası bulunamadı.'; return; }
      const cell = grid.cells[index];
      if (cell.enabled === false) {
        error.textContent = currentLanguage === 'en' ? 'This part is deleted. Use Default in the whole-wall editor to restore the initial wall.' : 'Bu parça silinmiş durumda. Başlangıç duvarını geri getirmek için Tüm Duvarı Düzenle içindeki Default düğmesini kullan.';
        return;
      }
      const currentBounds = { minX: Number(cell.minX), maxX: Number(cell.maxX), minY: Number(cell.minY), maxY: Number(cell.maxY) };
      const widthDirection = overlay.querySelector('#backWallCellWidthDirection').value;
      const heightDirection = overlay.querySelector('#backWallCellHeightDirection').value;
      const settings = {
        width: {
          placement: widthDirection === 'wall' ? 'left' : (widthDirection === 'front' ? 'right' : 'equal'),
          operation: overlay.querySelector('#backWallCellWidthOperation').value,
          value: widthValue
        },
        length: {
          placement: heightDirection,
          operation: overlay.querySelector('#backWallCellHeightOperation').value,
          value: heightValue
        }
      };
      const bounds = window.PulumurGeometry && typeof window.PulumurGeometry.trapezSheetBoundsFromEditor === 'function'
        ? window.PulumurGeometry.trapezSheetBoundsFromEditor(currentBounds, currentBounds, settings)
        : currentBounds;
      if (!Object.values(bounds).every(Number.isFinite) || !(bounds.maxX > bounds.minX) || !(bounds.maxY > bounds.minY)) {
        error.textContent = currentLanguage === 'en' ? 'The selected shortening would reduce the part width or height to zero.' : 'Seçilen kısaltma parça genişliğini veya yüksekliğini sıfıra indiriyor.';
        return;
      }
      const candidate = { ...cell, ...bounds, enabled: true };
      if (backWallCellOverlapsEnabledCell(grid.cells, candidate, cell.id)) {
        error.textContent = currentLanguage === 'en' ? 'This change would overlap another visible wall part.' : 'Bu değişiklik başka bir görünür duvar parçasıyla çakışıyor.';
        return;
      }
      const columns = Math.max(1, Number(columnsValue) || 1), rows = Math.max(1, Number(rowsValue) || 1);
      const replacements = [];
      for (let column = 0; column < columns; column += 1) {
        for (let row = 0; row < rows; row += 1) {
          const minX = candidate.minX + (candidate.maxX - candidate.minX) * column / columns;
          const maxX = candidate.minX + (candidate.maxX - candidate.minX) * (column + 1) / columns;
          const minY = candidate.minY + (candidate.maxY - candidate.minY) * row / rows;
          const maxY = candidate.minY + (candidate.maxY - candidate.minY) * (row + 1) / rows;
          replacements.push({ ...candidate, id: `${candidate.id}_${Date.now()}_${column}_${row}`, minX, maxX, minY, maxY, enabled: true });
        }
      }
      const limit = Number(window.PulumurLimits && window.PulumurLimits.get && window.PulumurLimits.get().maxSegmentsPerView) || 50;
      if (grid.cells.length - 1 + replacements.length > limit) { error.textContent = `${currentLanguage === 'en' ? 'Part limit' : 'Parça sınırı'} ${limit}.`; return; }
      const cells = grid.cells.flatMap((item, cellIndex) => cellIndex === index ? replacements : [{ ...item }]);
      const nextBounds = backWallGridBoundsFromCells(cells, grid.bounds);
      const nextGrid = { ...grid, columns: Math.max(Number(grid.columns) || 1, columns), rows: Math.max(Number(grid.rows) || 1, rows), autoHeight: false, bounds: nextBounds, cells };
      const currentState = sideScopedStateValue(backWallState, key, { enabled: true, xOffset: 0, depth: 600, height: 0 }) || {};
      beginHistoryTransaction();
      try {
        storeBackWallGridForKey(key, nextGrid);
        syncBackWallCompatibilityFromGrid(key, nextGrid);
        setSideScopedStateValue(backWallState, key, {
          ...currentState, enabled: true,
          depth: Math.max(1, Number(nextBounds.maxX) || Number(currentState.depth) || 600),
          height: Math.max(0, Number(nextBounds.maxY) || Number(currentState.height) || 0)
        });
        close();
        updatePreview(false);
      } finally { endHistoryTransaction(true); }
      statusText.textContent = currentLanguage === 'en' ? 'Back-wall part updated.' : 'Arka duvar parçası güncellendi.';
    });
    return overlay;
  }

  function showBackWallCellEditorOverlay(meta) {
    const isEn = currentLanguage === 'en';
    const key = normalizeSideViewKey(meta.sideViewKey, meta.sideIndex);
    const positionIndex = key === 'right' ? Math.max(0, Number(lastDrawing && lastDrawing.input && lastDrawing.input.sidePositionCount || 1) - 1) : Math.max(0, Number(meta.sideIndex) || Number(key) || 0);
    const rearHeight = lastDrawing && lastDrawing.input && lastDrawing.input.positions && lastDrawing.input.positions[positionIndex]
      ? Number(lastDrawing.input.positions[positionIndex].rearHeight) : Number(meta.wallHeight || 1);
    const grid = backWallGridForKey(key, rearHeight);
    let index = grid.cells.findIndex(cell => String(cell.id) === String(meta.wallCellId));
    if (index < 0) index = Math.max(0, Math.min(grid.cells.length - 1, Number(meta.wallCellIndex) || 0));
    const cell = grid.cells[index];
    if (!cell) { showBackWallEditorOverlay(meta); return; }
    const overlay = ensureBackWallCellEditorOverlay();
    overlay._meta = { ...meta, sideViewKey: key, sideIndex: positionIndex, wallCellId: cell.id, wallCellIndex: index };
    overlay.dataset.rearHeight = String(rearHeight);
    const sideLabel = key === 'right' ? (isEn ? 'Right' : 'Sağ') : key === '0' ? (isEn ? 'Left' : 'Sol') : `${isEn ? 'Middle' : 'Ara'} ${Number(key) + 1}`;
    const active = cell.enabled !== false;
    overlay.querySelector('#backWallCellEditorTitle').textContent = isEn ? 'Back Wall Part Editing' : 'Arka Duvar Parçası Düzenleme';
    overlay.querySelector('#backWallCellEditorMeta').innerHTML = `<b>${isEn ? 'Side view' : 'Yan görünüş'}:</b> ${sideLabel}<br><b>${isEn ? 'Part' : 'Parça'}:</b> ${index + 1}/${grid.cells.length} · ${Math.round(Number(cell.maxX) - Number(cell.minX))} × ${Math.round(Number(cell.maxY) - Number(cell.minY))} mm`;
    overlay.querySelector('#backWallCellWidthName').textContent = isEn ? 'Width' : 'Genişlik';
    overlay.querySelector('#backWallCellHeightName').textContent = isEn ? 'Height' : 'Yükseklik';
    overlay.querySelectorAll('#backWallCellWidthDirectionLabel,#backWallCellHeightDirectionLabel').forEach(node => { node.textContent = isEn ? 'Direction' : 'Yön'; });
    overlay.querySelectorAll('#backWallCellWidthValueLabel,#backWallCellHeightValueLabel').forEach(node => { node.textContent = isEn ? 'Value *(mm)' : 'Değer *(mm)'; });
    overlay.querySelectorAll('#backWallCellWidthOperationLabel,#backWallCellHeightOperationLabel').forEach(node => { node.textContent = isEn ? 'Operation' : 'İşlem'; });
    const widthDirection = overlay.querySelector('#backWallCellWidthDirection');
    widthDirection.options[0].textContent = isEn ? 'Equal' : 'Eşit';
    widthDirection.options[1].textContent = isEn ? 'Wall Side' : 'Duvar Tarafı';
    widthDirection.options[2].textContent = isEn ? 'Front Post Side' : 'Ön Dikme Tarafı';
    const heightDirection = overlay.querySelector('#backWallCellHeightDirection');
    heightDirection.options[0].textContent = isEn ? 'Equal' : 'Eşit';
    heightDirection.options[1].textContent = isEn ? 'Down' : 'Aşağı';
    heightDirection.options[2].textContent = isEn ? 'Up' : 'Yukarı';
    [overlay.querySelector('#backWallCellWidthOperation'), overlay.querySelector('#backWallCellHeightOperation')].forEach(select => {
      select.options[0].textContent = isEn ? 'Extend' : 'Uzat';
      select.options[1].textContent = isEn ? 'Shorten' : 'Kısalt';
    });
    overlay.querySelector('#backWallCellEditorNote').textContent = active
      ? (isEn ? 'Only this part changes. It can be divided again vertically and horizontally; neighbouring boundaries remain independent and overlaps are not allowed.' : 'Yalnız bu parça değişir. Parça yeniden dikey ve yatay bölünebilir; komşu sınırlar bağımsız kalır ve üst üste gelmeye izin verilmez.')
      : (isEn ? 'This part is deleted and leaves no restore target on the drawing. Use Edit Whole Wall > Default to restore the initial wall.' : 'Bu parça silinmiştir ve çizim üzerinde yeniden ekleme hedefi bırakmaz. Başlangıç duvarını geri getirmek için Tüm Duvarı Düzenle > Default kullan.');
    overlay.querySelector('#backWallCellEditorWhole').textContent = isEn ? 'Edit Whole Wall' : 'Tüm Duvarı Düzenle';
    overlay.querySelector('#backWallCellEditorDelete').textContent = isEn ? 'Delete Part' : 'Parçayı Sil';
    overlay.querySelector('#backWallCellEditorDelete').hidden = !active;
    overlay.querySelector('#backWallCellEditorCancel').textContent = isEn ? 'Cancel' : 'İptal';
    overlay.querySelector('#backWallCellEditorApply').textContent = isEn ? 'OK' : 'Tamam';
    overlay.querySelector('#backWallCellEditorApply').hidden = !active;
    overlay.querySelector('#backWallCellWidthDirection').value = 'equal';
    overlay.querySelector('#backWallCellHeightDirection').value = 'equal';
    overlay.querySelector('#backWallCellWidthOperation').value = 'extend';
    overlay.querySelector('#backWallCellHeightOperation').value = 'extend';
    overlay.querySelector('#backWallCellWidthValue').value = '';
    overlay.querySelector('#backWallCellHeightValue').value = '';
    overlay.querySelector('#backWallCellColumnsInput').value = '1';
    overlay.querySelector('#backWallCellRowsInput').value = '1';
    overlay.querySelector('#backWallCellEditorError').textContent = '';
    overlay.hidden = false;
    window.setTimeout(() => overlay.querySelector('#backWallCellWidthValue').focus({ preventScroll: true }), 20);
  }

  function showBackWallInteractionOverlay(meta) {
    const key = normalizeSideViewKey(meta.sideViewKey, meta.sideIndex);
    const grid = backWallGridForKey(key, Number(meta.wallHeight || 1));
    if (meta.wallCellId && grid.cells.length > 1) showBackWallCellEditorOverlay(meta);
    else showBackWallEditorOverlay(meta);
  }

  function mirrorBackWallGrid(grid) {
    const source = deepCloneJson(grid) || { version: 1, bounds: { minX: 0, maxX: 600, minY: 0, maxY: 1 }, cells: [] };
    const minX = Number(source.bounds.minX) || 0, maxX = Number(source.bounds.maxX) || 0;
    source.bounds.minX = -maxX; source.bounds.maxX = -minX;
    source.cells = (source.cells || []).map(cell => ({ ...cell, minX: -Number(cell.maxX || 0), maxX: -Number(cell.minX || 0) })).sort((a, b) => a.minX - b.minX || a.minY - b.minY);
    return source;
  }

  function ensureDetailCopyOverlay() {
    let overlay = $('detailCopyOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div'); overlay.id = 'detailCopyOverlay'; overlay.className = 'dim-edit-overlay'; overlay.hidden = true;
    overlay.innerHTML = `<form class="dim-edit-card"><div class="dim-edit-title" id="detailCopyTitle">Detay Kopyala</div><div class="dim-edit-meta" id="detailCopyMeta"></div><div id="detailCopyTargets" class="dimension-filter-positions"></div><div class="dim-edit-grid"><label><span>Uygulama</span><select id="detailCopyMode"><option value="direct">Doğrudan Uygula</option><option value="mirror">Aynalayarak Uygula</option></select></label></div><div class="post-editor-note" id="detailCopyNote">Bu sürümde yalnız arka duvar detayı kopyalanır.</div><div id="detailCopyError" class="dim-edit-error"></div><div class="dim-edit-actions"><button type="button" id="detailCopyCancel" class="dim-edit-cancel">İptal</button><button type="submit" class="dim-edit-apply">Uygula</button></div></form>`;
    previewPanel.appendChild(overlay);
    const close = () => { overlay.hidden = true; focusPreviewCanvas(); };
    overlay.querySelector('#detailCopyCancel').addEventListener('click', close);
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) close(); });
    overlay.querySelector('form').addEventListener('submit', evt => {
      evt.preventDefault();
      const source = selectedBackWallCopySource;
      const targets = Array.from(overlay.querySelectorAll('input[data-detail-target]:checked')).map(input => input.dataset.detailTarget);
      const error = overlay.querySelector('#detailCopyError');
      if (!source || !targets.length) { error.textContent = currentLanguage === 'en' ? 'Select at least one target.' : 'En az bir hedef seç.'; return; }
      const sourceGrid = backWallGridForKey(source.key, Number(overlay.dataset.rearHeight || 1));
      const sourceWall = sideScopedStateValue(backWallState, source.key, { xOffset: 0, depth: 600, height: 0 });
      const mode = overlay.querySelector('#detailCopyMode').value;
      targets.forEach(targetKey => {
        const nextGrid = mode === 'mirror' ? mirrorBackWallGrid(sourceGrid) : deepCloneJson(sourceGrid);
        storeBackWallGridForKey(targetKey, nextGrid);
        const nextWall = { ...deepCloneJson(sourceWall), xOffset: mode === 'mirror' ? -Number(sourceWall.xOffset || 0) : Number(sourceWall.xOffset || 0) };
        setSideScopedStateValue(backWallState, targetKey, nextWall);
        syncBackWallCompatibilityFromGrid(targetKey, nextGrid);
      });
      close(); updatePreview(false);
      statusText.textContent = currentLanguage === 'en' ? 'Back-wall detail copied.' : 'Arka duvar detayı kopyalandı.';
    });
    return overlay;
  }

  function showDetailCopyOverlay() {
    if (!selectedBackWallCopySource) { statusText.textContent = currentLanguage === 'en' ? 'Select a back wall first.' : 'Önce bir arka duvar seç.'; return; }
    const overlay = ensureDetailCopyOverlay();
    const d = lastDrawing && lastDrawing.input; const count = Math.max(1, Number(d && d.sidePositionCount || 1));
    const keys = ['0', ...Array.from({ length: Math.max(0, count - 2) }, (_, index) => String(index + 1)), 'right'];
    const targetBox = overlay.querySelector('#detailCopyTargets'); targetBox.innerHTML = '';
    keys.filter(key => key !== selectedBackWallCopySource.key).forEach(key => {
      const label = document.createElement('label'); const name = key === '0' ? (currentLanguage === 'en' ? 'Left' : 'Sol') : key === 'right' ? (currentLanguage === 'en' ? 'Right' : 'Sağ') : `${Number(key) + 1}. ${currentLanguage === 'en' ? 'position' : 'poz'}`;
      label.innerHTML = `<input type="checkbox" data-detail-target="${key}"><span>${name}</span>`; targetBox.appendChild(label);
    });
    overlay.querySelector('#detailCopyTitle').textContent = currentLanguage === 'en' ? 'Copy Detail' : 'Detay Kopyala';
    overlay.querySelector('#detailCopyMeta').textContent = currentLanguage === 'en' ? 'Back wall only' : 'Yalnız arka duvar';
    overlay.querySelector('#detailCopyNote').textContent = currentLanguage === 'en' ? 'Choose direct or mirrored application.' : 'Doğrudan veya aynalı uygulama seç.';
    overlay.querySelector('#detailCopyError').textContent = ''; overlay.dataset.rearHeight = String(d && d.rearHeight || 1); overlay.hidden = false;
  }

  function toggleMiddleSideView(sideIndex) {
    const index = Math.max(1, Number(sideIndex) || 1), key = String(index);
    ensureSideFeatureStateInitialized();
    if (!sideFeatureState.middleEnabled[key]) {
      const initialized = Object.prototype.hasOwnProperty.call(customSidePosts || {}, key)
        || !!(parapetSegments && parapetSegments.side && Object.prototype.hasOwnProperty.call(parapetSegments.side, key))
        || (sideSlidingPlacements || []).some(item => normalizeSideViewKey(item.sideViewKey, item.sideIndex) === key)
        || (sideGuillotinePlacements || []).some(item => normalizeSideViewKey(item.sideViewKey, item.sideIndex) === key)
        || (sideZipScreenPlacements || []).some(item => normalizeSideViewKey(item.sideViewKey, item.sideIndex) === key)
        || !!(triangleDivisionState && triangleDivisionState.middle && Object.prototype.hasOwnProperty.call(triangleDivisionState.middle, key))
        || !!(backWallState && backWallState.middle && Object.prototype.hasOwnProperty.call(backWallState.middle, key))
        || !!(backWallSegments && backWallSegments.side && Object.prototype.hasOwnProperty.call(backWallSegments.side, key));
      if (initialized) {
        sideFeatureState.middleEnabled[key] = true;
        updatePreview(false);
        statusText.textContent = currentLanguage === 'en' ? `Intermediate side view ${index + 1} re-enabled.` : `${index + 1}. ara poz yan görünüşü yeniden açıldı.`;
      } else activateMiddleSideView(index);
      return;
    }
    sideFeatureState.middleEnabled[key] = false;
    updatePreview(false);
    statusText.textContent = currentLanguage === 'en' ? `Intermediate side view ${index + 1} disabled. Its settings were preserved.` : `${index + 1}. ara poz yan görünüşü kapatıldı; özel ayarları korundu.`;
  }

  function readPositiveWholeInput(input) {
    const text = String(input && input.value || '').trim();
    if (text === '') return null;
    if (!/^\d+$/.test(text)) return NaN;
    const value = Number(text);
    return Number.isInteger(value) && value > 0 ? value : NaN;
  }

  function trapezBoundsEqual(left, right, epsilon = 0.001) {
    return ['minX', 'maxX', 'minY', 'maxY'].every(key => Math.abs(Number(left && left[key]) - Number(right && right[key])) <= epsilon);
  }

  function ensureTrapezSheetEditorOverlay() {
    let overlay = $('trapezSheetEditorOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'trapezSheetEditorOverlay';
    overlay.className = 'dim-edit-overlay trapez-sheet-editor-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `<form id="trapezSheetEditorForm" class="dim-edit-card trapez-sheet-editor-card">
      <div class="dim-edit-title" id="trapezSheetEditorTitle">Trapez Sac Alanını Düzenle</div>
      <div class="dim-edit-meta" id="trapezSheetEditorMeta"></div>
      <div class="trapez-sheet-editor-grid">
        <div class="trapez-sheet-editor-row">
          <div class="trapez-sheet-editor-name" id="trapWidthLabel">Genişlik</div>
          <label><span id="trapWidthPlacementLabel">Yön</span><select id="trapWidthPlacement"><option value="left">Sol</option><option value="right">Sağ</option><option value="equal">Eşit</option></select></label>
          <label><span id="trapWidthValueLabel">Değer *(mm)</span><input id="trapWidthValue" type="text" inputmode="numeric" autocomplete="off" placeholder="Boş: değiştirme"></label>
          <label><span id="trapWidthOperationLabel">İşlem</span><select id="trapWidthOperation"><option value="extend">Uzat</option><option value="shorten">Kısalt</option></select></label>
        </div>
        <div class="trapez-sheet-editor-row">
          <div class="trapez-sheet-editor-name" id="trapLengthLabel">Uzunluk</div>
          <label><span id="trapLengthPlacementLabel">Yön</span><select id="trapLengthPlacement"><option value="down">Aşağı</option><option value="up">Yukarı</option><option value="equal">Eşit</option></select></label>
          <label><span id="trapLengthValueLabel">Değer *(mm)</span><input id="trapLengthValue" type="text" inputmode="numeric" autocomplete="off" placeholder="Boş: değiştirme"></label>
          <label><span id="trapLengthOperationLabel">İşlem</span><select id="trapLengthOperation"><option value="extend">Uzat</option><option value="shorten">Kısalt</option></select></label>
        </div>
      </div>
      <div class="post-editor-note" id="trapezSheetEditorNote"></div>
      <div id="trapEditError" class="dim-edit-error" aria-live="polite"></div>
      <div class="dim-edit-actions">
        <button type="button" id="trapReset" class="dim-edit-delete">Default</button>
        <button type="button" id="trapCancel" class="dim-edit-cancel">İptal</button>
        <button type="submit" id="trapApply" class="dim-edit-apply">Tamam</button>
      </div>
    </form>`;
    previewPanel.appendChild(overlay);
    const close = () => { overlay.hidden = true; focusPreviewCanvas(); };
    overlay.querySelector('#trapCancel').addEventListener('click', close);
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) close(); });
    overlay.addEventListener('keydown', evt => { if (evt.key === 'Escape') { evt.preventDefault(); close(); } });
    overlay.querySelectorAll('#trapWidthValue,#trapLengthValue').forEach(input => input.addEventListener('input', () => {
      input.value = String(input.value || '').replace(/[^0-9]/g, '');
      overlay.querySelector('#trapEditError').textContent = '';
    }));
    overlay.querySelectorAll('select').forEach(select => select.addEventListener('change', () => { overlay.querySelector('#trapEditError').textContent = ''; }));
    overlay.querySelector('#trapReset').addEventListener('click', () => {
      beginHistoryTransaction();
      try {
        delete trapezSheetBounds[String(overlay.dataset.systemIndex || 0)];
        close();
        updatePreview(false);
        statusText.textContent = currentLanguage === 'en' ? 'Trapezoidal sheet restored to default.' : 'Trapez sac alanı başlangıç değerlerine döndürüldü.';
      } finally { endHistoryTransaction(true); }
    });
    overlay.querySelector('#trapezSheetEditorForm').addEventListener('submit', evt => {
      evt.preventDefault();
      const widthValue = readPositiveWholeInput(overlay.querySelector('#trapWidthValue'));
      const lengthValue = readPositiveWholeInput(overlay.querySelector('#trapLengthValue'));
      const error = overlay.querySelector('#trapEditError');
      if (Number.isNaN(widthValue) || Number.isNaN(lengthValue)) {
        error.textContent = currentLanguage === 'en' ? 'Enter positive whole millimetre values only.' : 'Yalnız pozitif tam sayı milimetre değeri gir.';
        return;
      }
      if (widthValue == null && lengthValue == null) {
        error.textContent = currentLanguage === 'en' ? 'Enter a value for width or length, or use Default.' : 'Genişlik veya uzunluk için bir değer gir ya da Default düğmesini kullan.';
        return;
      }
      const base = overlay._defaultBounds || { minX: 0, maxX: 0, minY: 0, maxY: 0 };
      const current = overlay._currentBounds || base;
      const settings = {
        width: { placement: overlay.querySelector('#trapWidthPlacement').value, operation: overlay.querySelector('#trapWidthOperation').value, value: widthValue == null ? '' : String(widthValue) },
        length: { placement: overlay.querySelector('#trapLengthPlacement').value, operation: overlay.querySelector('#trapLengthOperation').value, value: lengthValue == null ? '' : String(lengthValue) }
      };
      const bounds = window.PulumurGeometry && typeof window.PulumurGeometry.trapezSheetBoundsFromEditor === 'function'
        ? window.PulumurGeometry.trapezSheetBoundsFromEditor(base, current, settings)
        : current;
      if (!Object.values(bounds).every(Number.isFinite) || bounds.maxX - bounds.minX < 50 || bounds.maxY - bounds.minY < 50) {
        error.textContent = currentLanguage === 'en' ? 'The resulting width and length must each be at least 50 mm.' : 'İşlem sonunda genişlik ve uzunluk en az 50 mm olmalıdır.';
        return;
      }
      beginHistoryTransaction();
      try {
        const key = String(overlay.dataset.systemIndex || 0);
        if (trapezBoundsEqual(bounds, base)) delete trapezSheetBounds[key];
        else trapezSheetBounds[key] = bounds;
        close();
        updatePreview(false);
        statusText.textContent = currentLanguage === 'en' ? 'Trapezoidal sheet area updated.' : 'Trapez sac alanı güncellendi.';
      } finally { endHistoryTransaction(true); }
    });
    return overlay;
  }

  function showTrapezSheetEditorOverlay(meta) {
    const overlay = ensureTrapezSheetEditorOverlay();
    const isEn = currentLanguage === 'en';
    const defaults = { minX: meta.defaultBoundMinX, maxX: meta.defaultBoundMaxX, minY: meta.defaultBoundMinY, maxY: meta.defaultBoundMaxY };
    const current = { minX: meta.boundMinX, maxX: meta.boundMaxX, minY: meta.boundMinY, maxY: meta.boundMaxY };
    const editorState = window.PulumurGeometry && typeof window.PulumurGeometry.trapezSheetEditorState === 'function'
      ? window.PulumurGeometry.trapezSheetEditorState(defaults, current)
      : { width: { placement: 'equal', operation: 'extend', value: '', custom: false }, length: { placement: 'equal', operation: 'extend', value: '', custom: false } };
    overlay.dataset.systemIndex = String(meta.systemIndex || 0);
    overlay._defaultBounds = defaults;
    overlay._currentBounds = current;
    overlay.querySelector('#trapezSheetEditorTitle').textContent = isEn ? 'Edit Trapezoidal Sheet Area' : 'Trapez Sac Alanını Düzenle';
    overlay.querySelector('#trapezSheetEditorMeta').textContent = `${isEn ? 'Position' : 'Poz'} ${Number(meta.systemIndex || 0) + 1} · ${isEn ? 'Current' : 'Mevcut'} ${Math.round(current.maxX - current.minX)} × ${Math.round(current.maxY - current.minY)} mm`;
    overlay.querySelector('#trapWidthLabel').textContent = isEn ? 'Width' : 'Genişlik';
    overlay.querySelector('#trapLengthLabel').textContent = isEn ? 'Length' : 'Uzunluk';
    overlay.querySelectorAll('#trapWidthPlacementLabel,#trapLengthPlacementLabel').forEach(node => { node.textContent = isEn ? 'Distribution' : 'Yön'; });
    overlay.querySelectorAll('#trapWidthValueLabel,#trapLengthValueLabel').forEach(node => { node.textContent = isEn ? 'Value *(mm)' : 'Değer *(mm)'; });
    overlay.querySelectorAll('#trapWidthOperationLabel,#trapLengthOperationLabel').forEach(node => { node.textContent = isEn ? 'Operation' : 'İşlem'; });
    const widthPlacement = overlay.querySelector('#trapWidthPlacement');
    widthPlacement.querySelector('option[value="left"]').textContent = isEn ? 'Left' : 'Sol';
    widthPlacement.querySelector('option[value="right"]').textContent = isEn ? 'Right' : 'Sağ';
    widthPlacement.querySelector('option[value="equal"]').textContent = isEn ? 'Equal' : 'Eşit';
    const lengthPlacement = overlay.querySelector('#trapLengthPlacement');
    lengthPlacement.querySelector('option[value="down"]').textContent = isEn ? 'Down' : 'Aşağı';
    lengthPlacement.querySelector('option[value="up"]').textContent = isEn ? 'Up' : 'Yukarı';
    lengthPlacement.querySelector('option[value="equal"]').textContent = isEn ? 'Equal' : 'Eşit';
    overlay.querySelectorAll('#trapWidthOperation,#trapLengthOperation').forEach(select => {
      select.options[0].textContent = isEn ? 'Extend' : 'Uzat';
      select.options[1].textContent = isEn ? 'Shorten' : 'Kısalt';
    });
    overlay.querySelector('#trapWidthPlacement').value = editorState.width.placement;
    overlay.querySelector('#trapWidthOperation').value = editorState.width.operation;
    overlay.querySelector('#trapWidthValue').value = editorState.width.value;
    overlay.querySelector('#trapLengthPlacement').value = editorState.length.placement;
    overlay.querySelector('#trapLengthOperation').value = editorState.length.operation;
    overlay.querySelector('#trapLengthValue').value = editorState.length.value;
    overlay.querySelector('#trapWidthValue').placeholder = isEn ? 'Blank: no change' : 'Boş: değiştirme';
    overlay.querySelector('#trapLengthValue').placeholder = isEn ? 'Blank: no change' : 'Boş: değiştirme';
    const customNote = editorState.width.custom || editorState.length.custom
      ? (isEn ? 'An existing asymmetric value cannot be represented by one number; leave that row blank to preserve it.' : 'Mevcut asimetrik değer tek sayıyla gösterilemiyor; korumak için ilgili satırı boş bırak.')
      : '';
    overlay.querySelector('#trapezSheetEditorNote').textContent = `${isEn ? 'Equal applies the entered positive whole number to both edges. Length uses the Y axis: Down moves the -Y edge and Up moves the +Y edge. The roof track aligned with the -Y edge moves together with it. A blank row is not changed. Default restores the original area.' : 'Eşit seçimi girilen pozitif tam sayıyı iki kenara da uygular. Uzunluk Y ekseninde çalışır: Aşağı -Y ucunu, Yukarı +Y ucunu değiştirir. -Y ucuyla aynı hizadaki çatı kayıt profili bu uçla birlikte hareket eder. Boş bırakılan satır değişmez. Default başlangıç alanına döndürür.'}${customNote ? ` ${customNote}` : ''}`;
    overlay.querySelector('#trapReset').textContent = 'Default';
    overlay.querySelector('#trapCancel').textContent = isEn ? 'Cancel' : 'İptal';
    overlay.querySelector('#trapApply').textContent = isEn ? 'OK' : 'Tamam';
    overlay.querySelector('#trapEditError').textContent = '';
    overlay.hidden = false;
    window.setTimeout(() => overlay.querySelector('#trapWidthValue').focus({ preventScroll: true }), 20);
  }

  function ensureWaterPipeEditorOverlay() {
    let overlay = $('waterPipeEditorOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'waterPipeEditorOverlay';
    overlay.className = 'dim-edit-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <form class="dim-edit-card" id="waterPipeEditorForm">
        <div class="dim-edit-title" id="waterPipeEditorTitle">Fi70 Pipe Düzenle</div>
        <div class="dim-edit-meta" id="waterPipeEditorMeta"></div>
        <div class="post-editor-grid">
          <label><span id="waterPipeDiameterLabel">Tüm boruların çapı *(mm)</span><input id="waterPipeDiameterInput" type="text" inputmode="numeric" /></label>
          <label><span id="waterPipeLengthLabel">Tüm boruların uzunluğu *(mm)</span><input id="waterPipeLengthInput" type="text" inputmode="numeric" /></label>
          <label><span id="waterPipeOffsetLabel">Seçili boru X kaydırma *(mm)</span><input id="waterPipeOffsetInput" type="text" inputmode="decimal" /></label>
        </div>
        <div class="post-editor-note" id="waterPipeEditorNote"></div>
        <div class="dim-edit-error" id="waterPipeEditorError"></div>
        <div class="dim-edit-actions">
          <button type="button" id="waterPipeReset" class="secondary-btn">Varsayılan 70 / 300</button>
          <button type="button" id="waterPipeDelete" class="dim-edit-delete">Boruyu Sil</button>
          <button type="button" id="waterPipeCancel" class="dim-edit-cancel">İptal</button>
          <button type="submit" id="waterPipeApply" class="dim-edit-apply">Tamam</button>
        </div>
      </form>`;
    previewPanel.appendChild(overlay);
    const close = () => { overlay.hidden = true; focusPreviewCanvas(); };
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) close(); });
    overlay.querySelector('#waterPipeCancel').addEventListener('click', close);
    overlay.querySelector('#waterPipeReset').addEventListener('click', () => {
      overlay.querySelector('#waterPipeDiameterInput').value = '70';
      overlay.querySelector('#waterPipeLengthInput').value = '300';
      overlay.querySelector('#waterPipeOffsetInput').value = '0';
    });
    overlay.querySelector('#waterPipeDelete').addEventListener('click', () => {
      const id = String(overlay.dataset.pipeId || '');
      if (!id) return;
      waterOutletPipeState = normalizeWaterOutletPipeStateForApp(waterOutletPipeState);
      waterOutletPipeState.deleted[id] = true;
      close(); updatePreview(false);
      statusText.textContent = currentLanguage === 'en' ? 'Selected water outlet pipe deleted.' : 'Seçili su çıkış borusu silindi.';
    });
    overlay.querySelector('#waterPipeEditorForm').addEventListener('submit', evt => {
      evt.preventDefault();
      const diameter = Number(String(overlay.querySelector('#waterPipeDiameterInput').value || '').replace(',', '.'));
      const length = Number(String(overlay.querySelector('#waterPipeLengthInput').value || '').replace(',', '.'));
      const offset = Number(String(overlay.querySelector('#waterPipeOffsetInput').value || '').replace(',', '.'));
      const error = overlay.querySelector('#waterPipeEditorError');
      if (!(diameter > 0) || !(length > 0) || !Number.isFinite(offset)) {
        error.textContent = currentLanguage === 'en' ? 'Enter positive diameter/length and a valid signed X offset.' : 'Pozitif çap/uzunluk ve geçerli işaretli X kaydırma değeri gir.';
        return;
      }
      const id = String(overlay.dataset.pipeId || '');
      waterOutletPipeState = normalizeWaterOutletPipeStateForApp(waterOutletPipeState);
      waterOutletPipeState.diameter = diameter;
      waterOutletPipeState.length = length;
      if (id) { waterOutletPipeState.offsets[id] = offset; delete waterOutletPipeState.deleted[id]; }
      close(); updatePreview(false);
      statusText.textContent = currentLanguage === 'en' ? 'Water outlet pipes updated.' : 'Su çıkış boruları güncellendi.';
    });
    return overlay;
  }

  function showWaterPipeEditorOverlay(meta) {
    const overlay = ensureWaterPipeEditorOverlay();
    const state = normalizeWaterOutletPipeStateForApp(waterOutletPipeState);
    const isEn = currentLanguage === 'en';
    overlay.dataset.pipeId = String(meta.waterPipeId || '');
    overlay.querySelector('#waterPipeEditorTitle').textContent = isEn ? 'Edit Water Outlet Pipe' : 'Fi70 Pipe Düzenle';
    overlay.querySelector('#waterPipeEditorMeta').textContent = `${meta.waterPipeId || ''} · ${String(meta.waterPipeOrientation || '').startsWith('side') ? (isEn ? 'side outlet' : 'yan çıkış') : (isEn ? 'front outlet' : 'ön çıkış')}`;
    overlay.querySelector('#waterPipeDiameterLabel').textContent = isEn ? 'All pipes diameter *(mm)' : 'Tüm boruların çapı *(mm)';
    overlay.querySelector('#waterPipeLengthLabel').textContent = isEn ? 'All pipes length *(mm)' : 'Tüm boruların uzunluğu *(mm)';
    overlay.querySelector('#waterPipeOffsetLabel').textContent = isEn ? 'Selected pipe X shift *(mm)' : 'Seçili boru X kaydırma *(mm)';
    overlay.querySelector('#waterPipeEditorNote').textContent = isEn ? 'Diameter and length apply to every pipe. X shift and delete apply only to the selected pipe.' : 'Çap ve uzunluk tüm borulara; X kaydırma ve silme yalnız seçili boruya uygulanır.';
    overlay.querySelector('#waterPipeDiameterInput').value = String(state.diameter);
    overlay.querySelector('#waterPipeLengthInput').value = String(state.length);
    overlay.querySelector('#waterPipeOffsetInput').value = String(Number(state.offsets[meta.waterPipeId] || 0));
    overlay.querySelector('#waterPipeEditorError').textContent = '';
    overlay.hidden = false;
    window.setTimeout(() => overlay.querySelector('#waterPipeOffsetInput').focus({ preventScroll: true }), 20);
  }

  function topBackWallGridForSystem(systemIndex, meta = {}) {
    const key = String(Math.max(0, Number(systemIndex) || 0));
    topBackWallGridState = topBackWallGridState && typeof topBackWallGridState === 'object' ? topBackWallGridState : {};
    if (!topBackWallGridState[key] || !Array.isArray(topBackWallGridState[key].cells) || !topBackWallGridState[key].cells.length) {
      const fromDrawing = lastDrawing && lastDrawing.input && lastDrawing.input.topBackWallGridState && lastDrawing.input.topBackWallGridState[key];
      if (fromDrawing && Array.isArray(fromDrawing.cells) && fromDrawing.cells.length) topBackWallGridState[key] = deepCloneJson(fromDrawing);
      else {
        const width = Math.max(1, Number(meta.defaultBoundMaxX) - Number(meta.defaultBoundMinX) || Number(meta.cellMaxX) - Number(meta.cellMinX) || 1);
        const depth = Math.max(1, Number(meta.wallDepth) || Number(meta.defaultBoundMaxY) - Number(meta.defaultBoundMinY) || 600);
        topBackWallGridState[key] = { cells: [{ id: `top_wall_${key}_${Date.now()}`, enabled: true, minX: 0, maxX: width, startNearDepth: 0, endNearDepth: 0, startFarDepth: depth, endFarDepth: depth }] };
      }
    }
    return deepCloneJson(topBackWallGridState[key]);
  }

  function splitTopBackWallCell(cell, columns, rows) {
    const cols = Math.max(1, Math.floor(Number(columns) || 1));
    const rws = Math.max(1, Math.floor(Number(rows) || 1));
    const x0 = Number(cell.minX), x1 = Number(cell.maxX);
    const lerp = (a,b,t) => Number(a) + (Number(b)-Number(a))*t;
    const out = [];
    for (let c=0;c<cols;c+=1) {
      const ta=c/cols, tb=(c+1)/cols;
      const cx0=lerp(x0,x1,ta), cx1=lerp(x0,x1,tb);
      const nearA=lerp(cell.startNearDepth,cell.endNearDepth,ta), nearB=lerp(cell.startNearDepth,cell.endNearDepth,tb);
      const farA=lerp(cell.startFarDepth,cell.endFarDepth,ta), farB=lerp(cell.startFarDepth,cell.endFarDepth,tb);
      for (let r=0;r<rws;r+=1) {
        const ra=r/rws, rb=(r+1)/rws;
        out.push({
          id:`${cell.id}_${Date.now()}_${c}_${r}`, enabled:true, minX:cx0, maxX:cx1,
          startNearDepth:lerp(nearA,farA,ra), endNearDepth:lerp(nearB,farB,ra),
          startFarDepth:lerp(nearA,farA,rb), endFarDepth:lerp(nearB,farB,rb)
        });
      }
    }
    return out;
  }

  function ensureTopBackWallEditorOverlay() {
    let overlay = $('topBackWallEditorOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'topBackWallEditorOverlay';
    overlay.className = 'dim-edit-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <form class="dim-edit-card" id="topBackWallEditorForm">
        <div class="dim-edit-title" id="topBackWallEditorTitle">Üst Görünüş Arka Duvar</div>
        <div class="dim-edit-meta" id="topBackWallEditorMeta"></div>
        <div class="post-editor-grid">
          <label><span>Parça başlangıç X *(mm)</span><input id="topWallMinX" type="text" inputmode="decimal" /></label>
          <label><span>Parça bitiş X *(mm)</span><input id="topWallMaxX" type="text" inputmode="decimal" /></label>
          <label><span>−X ucunda −Y derinliği *(mm)</span><input id="topWallStartDepth" type="text" inputmode="numeric" /></label>
          <label><span>+X ucunda −Y derinliği *(mm)</span><input id="topWallEndDepth" type="text" inputmode="numeric" /></label>
          <label><span>Eğim *(°)</span><input id="topWallAngle" type="text" inputmode="decimal" /></label>
          <label><span>Dikey bölme</span><input id="topWallColumns" type="text" inputmode="numeric" value="1" /></label>
          <label><span>Yatay bölme</span><input id="topWallRows" type="text" inputmode="numeric" value="1" /></label>
          <label><span>Taşıyıcı Tipi</span><select id="topWallSupportType"><option value="wall">Standart Duvar Taşıyıcı</option><option value="steel">Çelik Taşıyıcı</option></select></label>
        </div>
        <div class="post-editor-note" id="topBackWallEditorNote">+Y kenarı sabittir. Girilen eğim ürün zarfına girecekse derinlikler birlikte ötelenerek çakışma önlenir. Bölünen her alt parça tekrar bölünebilir.</div>
        <div class="dim-edit-error" id="topBackWallEditorError"></div>
        <div class="dim-edit-actions">
          <button type="button" id="topBackWallDelete" class="dim-edit-delete">Parçayı Sil</button>
          <button type="button" id="topBackWallCancel" class="dim-edit-cancel">İptal</button>
          <button type="submit" class="dim-edit-apply">Tamam</button>
        </div>
      </form>`;
    previewPanel.appendChild(overlay);
    const close=()=>{overlay.hidden=true;focusPreviewCanvas();};
    overlay.addEventListener('mousedown',evt=>{if(evt.target===overlay)close();});
    overlay.querySelector('#topBackWallCancel').addEventListener('click',close);
    overlay.querySelector('#topBackWallDelete').addEventListener('click',()=>{
      const meta=overlay._meta||{}, key=String(meta.systemIndex||0), grid=topBackWallGridForSystem(meta.systemIndex,meta);
      const idx=grid.cells.findIndex(c=>String(c.id)===String(meta.wallCellId));
      if(idx>=0) grid.cells[idx]={...grid.cells[idx],enabled:false};
      topBackWallGridState[key]=grid; close(); updatePreview(false);
    });
    overlay.querySelector('#topBackWallEditorForm').addEventListener('submit',evt=>{
      evt.preventDefault(); const meta=overlay._meta||{}, key=String(meta.systemIndex||0), grid=topBackWallGridForSystem(meta.systemIndex,meta);
      const idx=grid.cells.findIndex(c=>String(c.id)===String(meta.wallCellId));
      if(idx<0)return;
      const num=id=>Number(String(overlay.querySelector(id).value||'').replace(',','.'));
      const minX=num('#topWallMinX'),maxX=num('#topWallMaxX'),startFar=num('#topWallStartDepth');
      let endFar=num('#topWallEndDepth');
      const angle=num('#topWallAngle');
      const originalAngle=Number(overlay.dataset.originalAngle);
      if (Number.isFinite(angle) && (!Number.isFinite(originalAngle) || Math.abs(angle-originalAngle)>0.0005)) endFar=startFar+Math.tan(angle*Math.PI/180)*(maxX-minX);
      const cols=Math.max(1,Math.floor(num('#topWallColumns')||1)),rows=Math.max(1,Math.floor(num('#topWallRows')||1));
      const error=overlay.querySelector('#topBackWallEditorError');
      if(![minX,maxX,startFar,endFar].every(Number.isFinite)||!(maxX>minX)||startFar<0||endFar<0){error.textContent='Geçerli parça sınırları ve pozitif derinlikler gir.';return;}
      const cell={...grid.cells[idx],enabled:true,minX,maxX,startFarDepth:startFar,endFarDepth:endFar};
      const replacements=(cols>1||rows>1)?splitTopBackWallCell(cell,cols,rows):[cell];
      const limit=Number(window.PulumurLimits&&window.PulumurLimits.get&&window.PulumurLimits.get().maxSegmentsPerView)||50;
      if(grid.cells.length-1+replacements.length>limit){error.textContent=`Parça sınırı ${limit}.`;return;}
      grid.cells.splice(idx,1,...replacements);
      const requestedType=overlay.querySelector('#topWallSupportType').value==='steel'?'steel':'wall';
      if(requestedType==='steel'){
        pendingRearSupportEdit={key,grid:deepCloneJson(grid),rearSupport:deepCloneJson(rearSupportState)};
        close(); showRearSteelProfileOverlay();
        return;
      }
      topBackWallGridState[key]=grid; rearSupportState=normalizeRearSupportStateForApp({...rearSupportState,type:'wall'}); close(); updatePreview(false);
      statusText.textContent='Üst görünüş arka duvar parçası ve standart taşıyıcı güncellendi.';
    });
    return overlay;
  }

  function showTopBackWallEditorOverlay(meta) {
    const overlay=ensureTopBackWallEditorOverlay(), grid=topBackWallGridForSystem(meta.systemIndex,meta);
    let idx=grid.cells.findIndex(c=>String(c.id)===String(meta.wallCellId)); if(idx<0)idx=Math.max(0,Number(meta.wallCellIndex)||0);
    const cell=grid.cells[idx]; if(!cell)return;
    overlay._meta={...meta,wallCellId:cell.id,wallCellIndex:idx};
    overlay.querySelector('#topBackWallEditorMeta').textContent=`Sistem ${Number(meta.systemIndex||0)+1} · Parça ${idx+1}/${grid.cells.length}`;
    overlay.querySelector('#topWallMinX').value=String(Number(cell.minX)); overlay.querySelector('#topWallMaxX').value=String(Number(cell.maxX));
    overlay.querySelector('#topWallStartDepth').value=String(Math.round(Number(cell.startFarDepth))); overlay.querySelector('#topWallEndDepth').value=String(Math.round(Number(cell.endFarDepth)));
    const angle=Math.atan2(Number(cell.endFarDepth)-Number(cell.startFarDepth),Math.max(0.001,Number(cell.maxX)-Number(cell.minX)))*180/Math.PI; overlay.querySelector('#topWallAngle').value=String(Number(angle.toFixed(3))); overlay.dataset.originalAngle=String(angle);
    overlay.querySelector('#topWallColumns').value='1';overlay.querySelector('#topWallRows').value='1';overlay.querySelector('#topWallSupportType').value=rearSupportState.type==='steel'?'steel':'wall';overlay.querySelector('#topBackWallEditorError').textContent='';
    overlay.hidden=false;
  }

  function ensureRearSteelProfileOverlay() {
    let overlay=$('rearSteelProfileOverlay');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='rearSteelProfileOverlay'; overlay.className='dim-edit-overlay'; overlay.hidden=true;
    const postOptions=Object.keys(REAR_STEEL_POST_PRESETS).map(key=>`<option value="${key}">${key} mm</option>`).join('');
    const beamOptions=Object.keys(REAR_STEEL_BEAM_PRESETS).map(key=>`<option value="${key}">${key} mm</option>`).join('');
    overlay.innerHTML=`<form class="dim-edit-card rear-steel-profile-card" id="rearSteelProfileForm">
      <div class="dim-edit-title">Çelik Taşıyıcı Profil Seçimi</div>
      <div class="post-editor-grid">
        <label><span>Dikme Profili</span><select id="rearSteelPostPreset">${postOptions}<option value="custom">Diğer</option></select></label>
        <label><span>Kiriş Profili</span><select id="rearSteelBeamPreset">${beamOptions}</select></label>
      </div>
      <div class="post-editor-grid rear-steel-custom-fields" id="rearSteelCustomFields" hidden>
        <label><span>Profil genişliği (mm)</span><input id="rearSteelPostWidth" type="text" inputmode="decimal" /></label>
        <label><span>Profil derinliği (mm)</span><input id="rearSteelPostDepth" type="text" inputmode="decimal" /></label>
        <label><span>Et kalınlığı (mm)</span><input id="rearSteelPostThickness" type="text" inputmode="decimal" /></label>
      </div>
      <div class="post-editor-note rear-steel-summary" id="rearSteelProfileSummary"></div>
      <div class="dim-edit-error" id="rearSteelProfileError"></div>
      <div class="dim-edit-actions"><button type="button" id="rearSteelProfileCancel" class="dim-edit-cancel">İptal</button><button type="submit" class="dim-edit-apply">Uygula</button></div>
    </form>`;
    previewPanel.appendChild(overlay);
    const close=()=>{overlay.hidden=true;pendingRearSupportEdit=null;focusPreviewCanvas();};
    const numberValue=id=>Number(String(overlay.querySelector(id).value||'').replace(',','.'));
    const updateSummary=()=>{
      const postKey=overlay.querySelector('#rearSteelPostPreset').value;
      overlay.querySelector('#rearSteelCustomFields').hidden=postKey!=='custom';
      let postLabel=postKey==='custom'?rearSteelProfileLabel(numberValue('#rearSteelPostWidth'),numberValue('#rearSteelPostDepth'),numberValue('#rearSteelPostThickness')):`${postKey} mm`;
      if(postLabel.includes('NaN'))postLabel='Özel profil';
      overlay.querySelector('#rearSteelProfileSummary').textContent=`Dikme Profili: ${postLabel} · Kiriş Profili: ${overlay.querySelector('#rearSteelBeamPreset').value} mm · Taşıyıcı Tipi: Çelik Taşıyıcı`;
    };
    overlay.addEventListener('mousedown',evt=>{if(evt.target===overlay)close();});
    overlay.querySelector('#rearSteelProfileCancel').addEventListener('click',close);
    ['#rearSteelPostPreset','#rearSteelBeamPreset','#rearSteelPostWidth','#rearSteelPostDepth','#rearSteelPostThickness'].forEach(id=>overlay.querySelector(id).addEventListener('input',updateSummary));
    overlay.querySelector('#rearSteelProfileForm').addEventListener('submit',evt=>{
      evt.preventDefault(); const pending=pendingRearSupportEdit; if(!pending)return close();
      const error=overlay.querySelector('#rearSteelProfileError'); error.textContent='';
      const postKey=overlay.querySelector('#rearSteelPostPreset').value;
      let postProfile;
      if(postKey==='custom'){
        const width=numberValue('#rearSteelPostWidth'),depth=numberValue('#rearSteelPostDepth'),thickness=numberValue('#rearSteelPostThickness');
        if(![width,depth,thickness].every(Number.isFinite)||width<=0||depth<=0||thickness<=0){error.textContent='Özel profil ölçülerinin tamamı pozitif sayı olmalı.';return;}
        if(thickness>width||thickness>depth){error.textContent='Et kalınlığı profil genişliği veya derinliğinden büyük olamaz.';return;}
        postProfile={source:'custom',key:null,width,depth,thickness,label:rearSteelProfileLabel(width,depth,thickness)};
      }else{
        const preset=REAR_STEEL_POST_PRESETS[postKey]||REAR_STEEL_POST_PRESETS['100x100x3'];
        postProfile={source:'preset',key:postKey,...preset,label:rearSteelProfileLabel(preset.width,preset.depth,preset.thickness)};
      }
      const beamKey=overlay.querySelector('#rearSteelBeamPreset').value;
      const beam=REAR_STEEL_BEAM_PRESETS[beamKey]||REAR_STEEL_BEAM_PRESETS['100x100x3'];
      const beamProfile={source:'preset',key:beamKey,width:beam.planDepth,height:beam.elevationHeight,planDepth:beam.planDepth,elevationHeight:beam.elevationHeight,thickness:beam.thickness,label:rearSteelProfileLabel(beam.planDepth,beam.elevationHeight,beam.thickness)};
      topBackWallGridState[pending.key]=deepCloneJson(pending.grid);
      rearSupportState=normalizeRearSupportStateForApp({type:'steel',postProfile,beamProfile});
      pendingRearSupportEdit=null; overlay.hidden=true; updatePreview(false); focusPreviewCanvas();
      statusText.textContent='Çelik arka duvar taşıyıcı profilleri uygulandı.';
    });
    overlay._updateSummary=updateSummary;
    return overlay;
  }

  function showRearSteelProfileOverlay() {
    const overlay=ensureRearSteelProfileOverlay();
    const state=normalizeRearSupportStateForApp(pendingRearSupportEdit&&pendingRearSupportEdit.rearSupport||rearSupportState);
    const post=state.postProfile,beam=state.beamProfile;
    overlay.querySelector('#rearSteelPostPreset').value=post.source==='custom'?'custom':(REAR_STEEL_POST_PRESETS[post.key]?post.key:'100x100x3');
    overlay.querySelector('#rearSteelBeamPreset').value=REAR_STEEL_BEAM_PRESETS[beam.key]?beam.key:'100x100x3';
    overlay.querySelector('#rearSteelPostWidth').value=String(post.width); overlay.querySelector('#rearSteelPostDepth').value=String(post.depth); overlay.querySelector('#rearSteelPostThickness').value=String(post.thickness);
    overlay.querySelector('#rearSteelProfileError').textContent=''; overlay._updateSummary(); overlay.hidden=false;
  }

  function ensureUpperTableEditorOverlay() {
    let overlay=$('upperTableEditorOverlay'); if(overlay)return overlay;
    overlay=document.createElement('div');overlay.id='upperTableEditorOverlay';overlay.className='dim-edit-overlay';overlay.hidden=true;
    overlay.innerHTML=`<form class="dim-edit-card" id="upperTableEditorForm"><div class="dim-edit-title">Üst Tablo Düzenle</div><div class="post-editor-grid">
      <label><span>X kaydırma *(mm)</span><input id="upperTableX" type="text" inputmode="decimal" /></label><label><span>Y kaydırma *(mm)</span><input id="upperTableY" type="text" inputmode="decimal" /></label>
      <label><span>+X ölçek</span><input id="upperTableScaleX" type="text" inputmode="decimal" /></label><label><span>−Y ölçek</span><input id="upperTableScaleY" type="text" inputmode="decimal" /></label></div>
      <div class="post-editor-note">Üst-sol köşe taban noktasıdır. Tablo fareyle sürüklenebilir; bırakıldığı konum ürün görünüşleriyle çakışırsa eski yerine döner.</div><div class="dim-edit-error" id="upperTableEditorError"></div>
      <div class="dim-edit-actions"><button type="button" id="upperTableReset" class="secondary-btn">Sıfırla</button><button type="button" id="upperTableCancel" class="dim-edit-cancel">İptal</button><button type="submit" class="dim-edit-apply">Tamam</button></div></form>`;
    previewPanel.appendChild(overlay);const close=()=>{overlay.hidden=true;focusPreviewCanvas();};overlay.addEventListener('mousedown',e=>{if(e.target===overlay)close();});overlay.querySelector('#upperTableCancel').addEventListener('click',close);
    overlay.querySelector('#upperTableReset').addEventListener('click',()=>{upperTableTransform={x:0,y:0,scaleX:1,scaleY:1};close();updatePreview(false);});
    overlay.querySelector('#upperTableEditorForm').addEventListener('submit',evt=>{evt.preventDefault();const n=id=>Number(String(overlay.querySelector(id).value||'').replace(',','.'));const next={x:n('#upperTableX'),y:n('#upperTableY'),scaleX:n('#upperTableScaleX'),scaleY:n('#upperTableScaleY')};if(!Object.values(next).every(Number.isFinite)||next.scaleX<.35||next.scaleY<.35||next.scaleX>4||next.scaleY>4){overlay.querySelector('#upperTableEditorError').textContent='Geçerli değerler gir. Ölçek aralığı 0,35–4 olmalıdır.';return;}if(!upperTableTransformIsValid(next)){overlay.querySelector('#upperTableEditorError').textContent='Bu konum veya ölçek ürün görünüşleriyle çakışıyor. Değişiklik uygulanmadı.';return;}upperTableTransform=normalizeUpperTableTransformForApp(next);close();updatePreview(false);});return overlay;
  }

  function showUpperTableEditorOverlay() {
    const o=ensureUpperTableEditorOverlay(),s=normalizeUpperTableTransformForApp(upperTableTransform);o.querySelector('#upperTableX').value=String(s.x);o.querySelector('#upperTableY').value=String(s.y);o.querySelector('#upperTableScaleX').value=String(s.scaleX);o.querySelector('#upperTableScaleY').value=String(s.scaleY);o.querySelector('#upperTableEditorError').textContent='';o.hidden=false;
  }

  function rectanglesOverlapWithGap(a,b,gap=0){return a.minX<b.maxX+gap&&a.maxX>b.minX-gap&&a.minY<b.maxY+gap&&a.maxY>b.minY-gap;}

  function upperTableCollisionBounds(drawing=lastDrawing) {
    const env=drawing&&drawing.input&&drawing.input.viewEnvelopeBounds||{};
    return Object.values(env).filter(bound=>bound&&['minX','minY','maxX','maxY'].every(key=>Number.isFinite(Number(bound[key]))));
  }

  function upperTableOverlapAreaWithGap(a,b,gap=0) {
    const left=Math.max(Number(a.minX),Number(b.minX)-gap),right=Math.min(Number(a.maxX),Number(b.maxX)+gap);
    const bottom=Math.max(Number(a.minY),Number(b.minY)-gap),top=Math.min(Number(a.maxY),Number(b.maxY)+gap);
    return Math.max(0,right-left)*Math.max(0,top-bottom);
  }

  function upperTableCandidateConflicts(candidate,drawing=lastDrawing,gap=80,referenceCandidate=null,referenceDrawing=lastDrawing) {
    const candidateBounds=upperTableCollisionBounds(drawing),referenceBounds=upperTableCollisionBounds(referenceDrawing);
    return candidateBounds.some((bound,index)=>{
      const candidateArea=upperTableOverlapAreaWithGap(candidate,bound,gap);
      if(!referenceCandidate)return candidateArea>0;
      const referenceBound=referenceBounds[index]||bound;
      const acceptedArea=upperTableOverlapAreaWithGap(referenceCandidate,referenceBound,gap);
      return candidateArea>acceptedArea+1;
    });
  }

  function upperTableTransformIsValid(next) {
    const previous=upperTableTransform,currentTable=lastDrawing&&lastDrawing.input&&lastDrawing.input.upperTableBounds;
    try {
      upperTableTransform=normalizeUpperTableTransformForApp(next);
      const drawing=window.PulumurGeometry&&typeof window.PulumurGeometry.buildDrawing==='function'?window.PulumurGeometry.buildDrawing(collectForm()):null;
      const table=drawing&&drawing.input&&drawing.input.upperTableBounds;
      return !!table&&!upperTableCandidateConflicts(table,drawing,80,currentTable,lastDrawing);
    } catch (_) {
      return false;
    } finally {
      upperTableTransform=previous;
    }
  }

  function upperTableModelRectToSvg(svg,bound,expand=0) {
    const minX=Number(svg&&svg.dataset&&svg.dataset.modelMinX)||0;
    const maxY=Number(svg&&svg.dataset&&svg.dataset.modelMaxY)||0;
    const pad=Number(svg&&svg.dataset&&svg.dataset.modelPadding)||0;
    const left=Number(bound.minX)-expand,right=Number(bound.maxX)+expand;
    const bottom=Number(bound.minY)-expand,top=Number(bound.maxY)+expand;
    return {x:left-minX+pad,y:maxY-top+pad,w:Math.max(0,right-left),h:Math.max(0,top-bottom)};
  }

  function clearUpperTablePlacementMap() {
    const svg=getPreviewSvg();
    if(svg)svg.querySelectorAll('.upper-table-placement-map').forEach(node=>node.remove());
    preview.classList.remove('upper-table-placement-active');
  }

  function renderUpperTablePlacementMap(candidate) {
    clearUpperTablePlacementMap();
    const svg=getPreviewSvg(),vb=svg&&svg.viewBox&&svg.viewBox.baseVal;
    if(!svg||!vb||!candidate)return;
    const ns='http://www.w3.org/2000/svg',group=document.createElementNS(ns,'g');
    group.setAttribute('class','upper-table-placement-map');
    group.setAttribute('pointer-events','none');
    const minX=Number(svg.dataset.modelMinX)||0,maxY=Number(svg.dataset.modelMaxY)||0,pad=Number(svg.dataset.modelPadding)||0;
    const visibleModel={minX:minX-pad,maxX:minX+vb.width-pad,minY:maxY+pad-vb.height,maxY:maxY+pad};
    const addRect=(bound,className,expand=0)=>{const box=upperTableModelRectToSvg(svg,bound,expand);const rect=document.createElementNS(ns,'rect');rect.setAttribute('class',className);rect.setAttribute('x',String(box.x));rect.setAttribute('y',String(box.y));rect.setAttribute('width',String(box.w));rect.setAttribute('height',String(box.h));rect.setAttribute('rx','12');rect.setAttribute('ry','12');group.appendChild(rect);return rect;};
    addRect(visibleModel,'upper-table-placement-allowed');
    upperTableCollisionBounds(lastDrawing).forEach(bound=>addRect(bound,'upper-table-placement-blocked',80));
    const accepted=lastDrawing&&lastDrawing.input&&lastDrawing.input.upperTableBounds;
    addRect(candidate,upperTableCandidateConflicts(candidate,lastDrawing,80,accepted,lastDrawing)?'upper-table-placement-candidate is-invalid':'upper-table-placement-candidate is-valid');
    const background=svg.querySelector('rect[width="100%"][height="100%"]');
    if(background&&background.parentNode===svg)background.insertAdjacentElement('afterend',group);else svg.insertBefore(group,svg.firstChild);
    preview.classList.add('upper-table-placement-active');
  }

  function clearUpperTableAlignmentGuides() {
    const svg=getPreviewSvg();
    if(svg)svg.querySelectorAll('.upper-table-alignment-guide').forEach(node=>node.remove());
  }

  function appendUpperTableAlignmentGuide(axis,modelValue) {
    const svg=getPreviewSvg(),vb=svg&&svg.viewBox&&svg.viewBox.baseVal;
    if(!svg||!vb)return;
    const ns='http://www.w3.org/2000/svg',line=document.createElementNS(ns,'line');
    const minX=Number(svg.dataset.modelMinX)||0,maxY=Number(svg.dataset.modelMaxY)||0,pad=Number(svg.dataset.modelPadding)||0;
    line.setAttribute('class','upper-table-alignment-guide');
    line.setAttribute('stroke','#7c3aed');line.setAttribute('stroke-width','2');line.setAttribute('stroke-dasharray','18 12');line.setAttribute('pointer-events','none');
    if(axis==='x'){
      const x=Number(modelValue)-minX+pad;line.setAttribute('x1',String(x));line.setAttribute('x2',String(x));line.setAttribute('y1','0');line.setAttribute('y2',String(vb.height));
    }else{
      const y=maxY-Number(modelValue)+pad;line.setAttribute('x1','0');line.setAttribute('x2',String(vb.width));line.setAttribute('y1',String(y));line.setAttribute('y2',String(y));
    }
    svg.appendChild(line);
  }

  function beginUpperTableDrag(evt) {
    const hit=evt.target&&evt.target.closest?evt.target.closest('[data-interaction-type="upperTableEditor"]'):null;
    if(!hit||evt.button!==0)return false;
    const meta=previewInteractionMetaFromHit(hit);upperTableDragState={pointerId:evt.pointerId,startClientX:evt.clientX,startClientY:evt.clientY,meta,base:normalizeUpperTableTransformForApp(upperTableTransform),dxModel:0,dyModel:0,moved:false};
    renderUpperTablePlacementMap({minX:meta.tableMinX,maxX:meta.tableMaxX,minY:meta.tableMinY,maxY:meta.tableMaxY});
    statusText.textContent=currentLanguage==='en'?'Green areas are available; red envelopes are blocked. Click without dragging to scale.':'Yeşil alanlar uygun, kırmızı zarflar yasak. Ölçeklemek için sürüklemeden tıklayın.';
    if(preview.setPointerCapture)try{preview.setPointerCapture(evt.pointerId);}catch(_){}
    evt.preventDefault();evt.stopPropagation();return true;
  }

  function moveUpperTableDrag(evt) {
    if(!upperTableDragState||evt.pointerId!==upperTableDragState.pointerId)return false;
    const svg=getPreviewSvg(),rect=svg&&svg.getBoundingClientRect(),vb=svg&&svg.viewBox&&svg.viewBox.baseVal;if(!svg||!rect||!vb)return false;
    clearUpperTableAlignmentGuides();
    let dxModel=(evt.clientX-upperTableDragState.startClientX)*vb.width/Math.max(1,rect.width);let dyModel=-(evt.clientY-upperTableDragState.startClientY)*vb.height/Math.max(1,rect.height);
    const env=lastDrawing&&lastDrawing.input&&lastDrawing.input.viewEnvelopeBounds||{};const meta=upperTableDragState.meta;
    let candidate={minX:meta.tableMinX+dxModel,maxX:meta.tableMaxX+dxModel,minY:meta.tableMinY+dyModel,maxY:meta.tableMaxY+dyModel};
    const xRefs=[],yRefs=[];Object.values(env).forEach(b=>{if(b){xRefs.push(b.minX,b.maxX,(b.minX+b.maxX)/2);yRefs.push(b.minY,b.maxY,(b.minY+b.maxY)/2);}});
    const nearestSnap=(targets,refs)=>{let best=null;for(const target of targets)for(const ref of refs){const delta=ref-target;if(Math.abs(delta)<35&&(!best||Math.abs(delta)<Math.abs(best.delta)))best={delta,ref};}return best;};
    const xSnap=nearestSnap([candidate.minX,candidate.maxX,(candidate.minX+candidate.maxX)/2],xRefs);
    if(xSnap){dxModel+=xSnap.delta;appendUpperTableAlignmentGuide('x',xSnap.ref);}
    candidate={minX:meta.tableMinX+dxModel,maxX:meta.tableMaxX+dxModel,minY:meta.tableMinY+dyModel,maxY:meta.tableMaxY+dyModel};
    const ySnap=nearestSnap([candidate.minY,candidate.maxY,(candidate.minY+candidate.maxY)/2],yRefs);
    if(ySnap){dyModel+=ySnap.delta;appendUpperTableAlignmentGuide('y',ySnap.ref);}
    upperTableDragState.dxModel=dxModel;upperTableDragState.dyModel=dyModel;
    upperTableDragState.moved=upperTableDragState.moved||Math.abs(dxModel)>2||Math.abs(dyModel)>2;
    if(upperTableDragState.moved)previewState.dragMoved=true;
    preview.querySelectorAll('.preview-upper-table-entity,.preview-upper-table-zone').forEach(node=>node.setAttribute('transform',`translate(${dxModel} ${-dyModel})`));
    candidate={minX:meta.tableMinX+dxModel,maxX:meta.tableMaxX+dxModel,minY:meta.tableMinY+dyModel,maxY:meta.tableMaxY+dyModel};
    renderUpperTablePlacementMap(candidate);
    return true;
  }

  function endUpperTableDrag(evt) {
    if(!upperTableDragState||evt.pointerId!==upperTableDragState.pointerId)return false;
    clearUpperTableAlignmentGuides();
    clearUpperTablePlacementMap();
    const st=upperTableDragState;upperTableDragState=null;
    if(!st.moved){
      preview.querySelectorAll('.preview-upper-table-entity,.preview-upper-table-zone').forEach(node=>node.removeAttribute('transform'));
      if(preview.releasePointerCapture)try{preview.releasePointerCapture(evt.pointerId);}catch(_){}
      previewState.dragMoved=true;
      showUpperTableEditorOverlay();
      return true;
    }
    const meta=st.meta;const candidate={minX:meta.tableMinX+st.dxModel,maxX:meta.tableMaxX+st.dxModel,minY:meta.tableMinY+st.dyModel,maxY:meta.tableMaxY+st.dyModel};
    const accepted=lastDrawing&&lastDrawing.input&&lastDrawing.input.upperTableBounds;const invalid=upperTableCandidateConflicts(candidate,lastDrawing,80,accepted,lastDrawing);
    if(invalid){updatePreview(false);statusText.textContent=currentLanguage==='en'?'The upper table returned to its previous position because it overlaps a red envelope.':'Üst tablo kırmızı zarfla çakıştığı için eski konumuna döndü.';}
    else{upperTableTransform={...st.base,x:st.base.x+st.dxModel,y:st.base.y+st.dyModel};updatePreview(false);statusText.textContent=currentLanguage==='en'?'Upper table position updated.':'Üst tablo konumu güncellendi.';}
    return true;
  }


  function handlePreviewDimensionEdit(evt) {
    if (!isLargePreviewMode() || previewInteractionLocked()) {
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }
    if (toolboxSelectionMode) {
      evt.preventDefault();
      evt.stopPropagation();
      toggleToolboxSelectionFromHit(evt.target);
      return;
    }
    if (handleBulkProfileSelectionClick(evt)) return;
    if ((evt.ctrlKey || evt.metaKey) && evt.target && evt.target.closest && evt.target.closest('[data-interaction-type],[data-dim-id],[data-edit-field],[data-preview-dim-key]')) {
      evt.preventDefault();
      evt.stopPropagation();
      statusText.textContent=currentLanguage==='en'?'Only compatible physical profiles can be selected together.':'Yalnızca aynı türdeki fiziksel profiller birlikte seçilebilir.';
      return;
    }
    const dimHit = evt.target && evt.target.closest ? evt.target.closest('[data-dim-id],[data-edit-field],[data-preview-dim-key]') : null;
    const interactionHit = !dimHit && evt.target && evt.target.closest ? evt.target.closest('[data-interaction-type="postEditor"],[data-interaction-type="frontPostProfileEditor"],[data-interaction-type="horizontalProfileEditor"],[data-interaction-type="glassTrackEditor"],[data-interaction-type="productEditor"],[data-interaction-type="parapetEditor"],[data-interaction-type="sideViewEnable"],[data-interaction-type="triangleEditor"],[data-interaction-type="backWallEditor"],[data-interaction-type="trapezSheetEditor"],[data-interaction-type="gutterEditor"],[data-interaction-type="waterPipeEditor"],[data-interaction-type="topBackWallEditor"],[data-interaction-type="upperTableEditor"],[data-interaction-type="sideViewSelector"]') : null;
    if (!dimHit && !interactionHit) return;
    evt.preventDefault();
    evt.stopPropagation();
    if (previewState.dragMoved) {
      previewState.dragMoved = false;
      return;
    }
    if (interactionHit) {
      const interactionMeta = previewInteractionMetaFromHit(interactionHit);
      if (interactionMeta.interactionType === 'glassTrackEditor') showGlassTrackEditorOverlay(interactionMeta);
      else if (interactionMeta.interactionType === 'postEditor') showPostEditorOverlay(interactionMeta);
      else if (interactionMeta.interactionType === 'frontPostProfileEditor') showFrontPostProfileOverlay(interactionMeta.postIndex);
      else if (interactionMeta.interactionType === 'horizontalProfileEditor') showHorizontalProfileEditorOverlay(interactionMeta);
      else if (interactionMeta.interactionType === 'sideViewEnable') toggleMiddleSideView(interactionMeta.sideIndex);
      else if (interactionMeta.interactionType === 'parapetEditor') showParapetEditorOverlay(interactionMeta);
      else if (interactionMeta.interactionType === 'triangleEditor') showTriangleEditorOverlay(interactionMeta);
      else if (interactionMeta.interactionType === 'backWallEditor') showBackWallInteractionOverlay(interactionMeta);
      else if (interactionMeta.interactionType === 'trapezSheetEditor') showTrapezSheetEditorOverlay(interactionMeta);
      else if (interactionMeta.interactionType === 'gutterEditor') showGutterEditorOverlay(interactionMeta);
      else if (interactionMeta.interactionType === 'waterPipeEditor') showWaterPipeEditorOverlay(interactionMeta);
      else if (interactionMeta.interactionType === 'topBackWallEditor') showTopBackWallEditorOverlay(interactionMeta);
      else if (interactionMeta.interactionType === 'upperTableEditor') showUpperTableEditorOverlay();
      else if (interactionMeta.interactionType === 'sideViewSelector') showSideViewSelectionOverlay(interactionMeta);
      else if (interactionMeta.interactionType === 'productEditor') {
        const record = findProductByInteraction(interactionMeta);
        if (!record) return;
        const editMeta = interactionMetaToProductMeta(interactionMeta, record);
        editMeta.editProduct = true;
        editMeta.placementId = record.placement.id;
        editMeta.productType = record.type;
        if (record.type === 'guillotine_glass') showGuillotineDetailsOverlay(editMeta, { editExisting: true });
        else if (record.type === 'zip_screen') showZipScreenDetailsOverlay(editMeta, { editExisting: true });
        else showSlidingDetailsOverlay(editMeta, { editExisting: true });
      }
      return;
    }
    const meta = dimensionMetaFromHit(dimHit);
    restoreActiveDimensionPanelParts();
    if (!meta.editable && !meta.canAddSameProfile && !meta.canAddDifferentProfile && !meta.canPlaceProduct && !findProductForMeta(normalizedProductMeta(meta))) {
      showPassiveDimensionInfo(meta);
      return;
    }
    showDimensionEditOverlay(meta);
  }

  function ensureHorizontalProfileEditorOverlay() {
    let overlay = $('horizontalProfileEditorOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'horizontalProfileEditorOverlay';
    overlay.className = 'dim-edit-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `<form class="dim-edit-card"><div class="dim-edit-title" id="horizontalProfileEditorTitle">Yatay Profil Düzenle</div><div class="dim-edit-meta" id="horizontalProfileEditorMeta"></div><label class="dim-edit-label"><span>Profil eni / düşey kalınlık (mm)</span><input id="horizontalProfileWidth" type="text" inputmode="numeric"></label><label class="dim-edit-label"><span>Profil derinliği (mm)</span><input id="horizontalProfileDepth" type="text" inputmode="numeric"></label><div id="horizontalProfileEditorError" class="dim-edit-error"></div><div class="dim-edit-actions"><button id="horizontalProfileDelete" type="button" class="danger-btn">Profili Sil</button><button id="horizontalProfileCancel" type="button" class="dim-edit-cancel">İptal</button><button type="submit" class="dim-edit-apply">Uygula</button></div></form>`;
    previewPanel.appendChild(overlay);
    const close = () => { overlay.hidden = true; overlay._meta = null; focusPreviewCanvas(); };
    overlay.querySelector('#horizontalProfileCancel').addEventListener('click', close);
    overlay.addEventListener('mousedown', evt => { if (evt.target === overlay) close(); });
    ['horizontalProfileWidth','horizontalProfileDepth'].forEach(id => $(id).addEventListener('input', evt => { evt.target.value = String(evt.target.value || '').replace(/[^0-9]/g,''); $('horizontalProfileEditorError').textContent=''; }));
    overlay.querySelector('#horizontalProfileDelete').addEventListener('click', () => {
      const meta = overlay._meta || {}; const profile = findHorizontalProfileById(meta.horizontalProfileId); if (!profile) return close();
      const list = horizontalProfileListForMeta(profile, false); const index = list.indexOf(profile); if (index >= 0) list.splice(index,1);
      close(); updatePreview(false); statusText.textContent = currentLanguage === 'en' ? 'Horizontal profile deleted.' : 'Yatay profil silindi.';
    });
    overlay.querySelector('form').addEventListener('submit', evt => {
      evt.preventDefault(); const meta=overlay._meta||{}; const profile=findHorizontalProfileById(meta.horizontalProfileId); const error=$('horizontalProfileEditorError');
      if (!profile) { error.textContent='Yatay profil bulunamadı.'; return; }
      const width=Number($('horizontalProfileWidth').value||0), depth=Number($('horizontalProfileDepth').value||0);
      if (!(width>=40&&width<=300&&depth>=30&&depth<=300)) { error.textContent='Profil 40–300 × 30–300 mm aralığında olmalıdır.'; return; }
      const oldW=profile.width, oldD=profile.depth; profile.width=Math.round(width); profile.depth=Math.round(depth); profile.label=`Yatay Profil ${profile.width} × ${profile.depth}`;
      const list=horizontalProfileListForMeta(profile,false), clearHeight=Number(meta.horizontalClearHeight||0);
      if (clearHeight>0 && !validateHorizontalProfileLayout(list, profile.zoneId, clearHeight)) { profile.width=oldW; profile.depth=oldD; error.textContent='Yeni kesit komşu alanı 250 mm sınırının altına düşürüyor.'; return; }
      close(); updatePreview(false); statusText.textContent=currentLanguage==='en'?'Horizontal profile section updated.':'Yatay profil kesiti güncellendi.';
    });
    return overlay;
  }
  function showHorizontalProfileEditorOverlay(meta) {
    const profile=findHorizontalProfileById(meta && meta.horizontalProfileId); if (!profile) return;
    const overlay=ensureHorizontalProfileEditorOverlay(); overlay._meta={...meta};
    $('horizontalProfileEditorTitle').textContent=currentLanguage==='en'?'Edit Horizontal Profile':'Yatay Profil Düzenle';
    $('horizontalProfileEditorMeta').textContent=`${profile.id} · ${profile.zoneId}`;
    $('horizontalProfileWidth').value=String(Math.round(profile.width||100)); $('horizontalProfileDepth').value=String(Math.round(profile.depth||100)); $('horizontalProfileEditorError').textContent='';
    overlay.hidden=false; window.setTimeout(()=>$('horizontalProfileWidth').focus({preventScroll:true}),20);
  }

  function bindPreviewKeyboardGuard() {
    document.addEventListener('keydown', evt => {
      if (evt.key === 'Escape' && selectedIndependentSideView) { evt.preventDefault(); closeSideViewSelectionOverlay(); return; }
      if (toolboxSelectionMode) {
        const active = document.activeElement;
        const tag = active && active.tagName ? active.tagName.toLowerCase() : '';
        const isFormField = ['input','select','textarea','button'].includes(tag) && active !== preview;
        if (evt.key === 'Escape') {
          evt.preventDefault();
          cancelToolboxSelection(currentLanguage === 'en' ? 'Selection cancelled.' : 'Seçim iptal edildi.');
          return;
        }
        if (evt.key === 'Enter' && !isFormField) {
          evt.preventDefault();
          finishToolboxSelection();
          return;
        }
      }
      if (evt.key !== 'Enter' && evt.key !== ' ') return;
      const expanded = !!(previewPanel && previewPanel.classList.contains('is-expanded'));
      if (!expanded) return;
      const active = document.activeElement;
      if (active && active.id === 'expandPreviewBtn') {
        evt.preventDefault();
        evt.stopPropagation();
        focusPreviewCanvas();
      }
    }, true);
  }

  function bindPreviewInteractions() {
    preview.addEventListener('click', handlePreviewDimensionEdit);
    preview.addEventListener('keydown', evt => {
      if (!isLargePreviewMode() || !toolboxSelectionMode || !['Enter', ' '].includes(evt.key)) return;
      const marker = evt.target && evt.target.closest ? evt.target.closest('.toolbox-selection-marker') : null;
      if (!marker) return;
      evt.preventDefault();
      evt.stopPropagation();
      toggleToolboxSelectionFromHit(marker);
    });
    preview.addEventListener('contextmenu', evt => {
      if (!isLargePreviewMode()) {
        evt.preventDefault();
        return;
      }
      if (!toolboxSelectionMode) return;
      evt.preventDefault();
      evt.stopPropagation();
      showToolboxContextMenu(evt.clientX, evt.clientY);
    });

    preview.addEventListener('wheel', evt => {
      if (!isLargePreviewMode() || !getPreviewSvg()) return;
      evt.preventDefault();
      const factor = evt.deltaY < 0 ? 1.14 : (1 / 1.14);
      setPreviewZoom(previewState.zoom * factor, evt.clientX, evt.clientY);
    }, { passive: false });

    preview.addEventListener('pointerdown', evt => {
      if (!isLargePreviewMode()) return;
      if (registerPreviewTouchPointer(evt)) return;
      if (beginUpperTableDrag(evt)) return;
      if (beginPreviewDimensionDrag(evt)) return;
      if (evt.target && evt.target.closest && evt.target.closest('[data-dim-id],[data-edit-field],[data-interaction-type],.preview-dimension-plain')) return;
      if (evt.button !== 0 || !getPreviewSvg()) return;
      previewState.dragActive = true;
      previewState.pointerId = evt.pointerId;
      previewState.dragStartX = evt.clientX;
      previewState.dragStartY = evt.clientY;
      previewState.dragMoved = false;
      previewState.dragScrollLeft = preview.scrollLeft;
      previewState.dragScrollTop = preview.scrollTop;
      preview.classList.add('is-dragging');
      if (preview.setPointerCapture) {
        try { preview.setPointerCapture(evt.pointerId); } catch (_) {}
      }
      evt.preventDefault();
    });

    preview.addEventListener('pointermove', evt => {
      if (movePreviewTouchPointer(evt)) return;
      if (!isLargePreviewMode()) return;
      if (moveUpperTableDrag(evt)) return;
      if (movePreviewDimensionDrag(evt)) return;
      if (!previewState.dragActive) return;
      const dx = evt.clientX - previewState.dragStartX;
      const dy = evt.clientY - previewState.dragStartY;
      if (Math.abs(dx) + Math.abs(dy) > 6) previewState.dragMoved = true;
      preview.scrollLeft = previewState.dragScrollLeft - dx;
      preview.scrollTop = previewState.dragScrollTop - dy;
    });

    const stopDrag = evt => {
      if (endPreviewTouchPointer(evt)) return;
      if (endUpperTableDrag(evt)) return;
      if (endPreviewDimensionDrag(evt)) return;
      if (evt && preview.releasePointerCapture && previewState.pointerId !== null) {
        try { preview.releasePointerCapture(previewState.pointerId); } catch (_) {}
      }
      previewState.dragActive = false;
      previewState.pointerId = null;
      preview.classList.remove('is-dragging');
    };

    preview.addEventListener('pointerup', stopDrag);
    preview.addEventListener('pointercancel', stopDrag);
    preview.addEventListener('lostpointercapture', evt => {
      if (evt.pointerType === 'touch') endPreviewTouchPointer(evt);
    });
    preview.addEventListener('dblclick', evt => {
      if (!isLargePreviewMode() || previewInteractionLocked()) return;
      if (evt.target && evt.target.closest && evt.target.closest('.editable-dimension,.preview-dimension-plain')) return;
      if (!getPreviewSvg()) return;
      const next = previewState.zoom < 1.6 ? Math.max(1.8, previewState.zoom * 1.6) : 1;
      setPreviewZoom(next, evt.clientX, evt.clientY);
    });
  }

  function deepCloneJson(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function cleanProjectFileToken(value, fallback, options = {}) {
    const preserveDots = options.preserveDots === true;
    const maxLength = Math.max(12, Number(options.maxLength) || 64);
    let safe = normalizeProjectText(value)
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(preserveDots ? /[^A-Z0-9._-]+/g : /[^A-Z0-9_-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[._-]+|[._-]+$/g, '');
    if (safe.length > maxLength) safe = safe.slice(0, maxLength).replace(/[._-]+$/g, '');
    return safe || fallback;
  }

  function isQuickDrawingMode() {
    return Boolean(document.body && document.body.classList && document.body.classList.contains('quick-drawing-mode'));
  }

  function quickDrawingArtifactNameRoot() {
    const stamp = cleanProjectFileToken(document.body && document.body.dataset ? document.body.dataset.quickExportStamp : '', '', { maxLength: 20 });
    return `HIZLI-CIZIM-${stamp || 'GECICI'}`;
  }

  function projectArtifactNameRoot(metadata = {}, record = {}) {
    if (isQuickDrawingMode()) return quickDrawingArtifactNameRoot();
    const customer = cleanProjectFileToken(metadata.customer, 'MUSTERI', { maxLength: 60 });
    const projectName = cleanProjectFileToken(metadata.project, 'PROJE', { maxLength: 60 });
    const projectCode = cleanProjectFileToken(record.projectCode, 'LOCAL', { preserveDots: true, maxLength: 40 });
    const revisionNo = Math.max(1, Math.round(Number(record.revisionNo) || 1));
    const revision = `R${String(revisionNo).padStart(2, '0')}`;
    return `${customer}-${projectName}-${projectCode}-${revision}`;
  }

  function captureRuntimeFormData() {
    const formData = {};
    ids.forEach(id => {
      const el = $(id);
      if (!el) return;
      const rawValue = String(el.value ?? '');
      formData[id] = normalizeProjectFieldValue(id, rawValue, false);
    });
    return formData;
  }

  function captureRuntimeDrawingState() {
    return {
      manualPostPlacementMode,
      glassTrackProfile: sanitizeGlassTrackProfile(glassTrackProfileState),
      glassTrackSupportProfiles: {
        left: sanitizeOptionalGlassTrackProfile(glassSupportProfileState.left),
        right: sanitizeOptionalGlassTrackProfile(glassSupportProfileState.right)
      },
      frontPostCenters: Array.isArray(customFrontPostCenters) ? customFrontPostCenters.map(Number) : null,
      customRayPositions: deepCloneJson(customRayPositions),
      sideSupportCenters: { ...customSideSupportCenters },
      sidePosts: deepCloneJson(customSidePosts) || {},
      sideAutoSupportSuppressed: deepCloneJson(sideAutoSupportSuppressed) || {},
      frontPostProfiles: deepCloneJson(frontPostProfiles) || [],
      horizontalFacadeProfiles: deepCloneJson(horizontalFacadeProfiles) || { front: [], side: {} },
      frontPostExtensions: deepCloneJson(frontPostExtensions) || [],
      parapetSegments: deepCloneJson(parapetSegments) || { front: [], side: {} },
      topBackWallSegments: deepCloneJson(topBackWallSegments) || {},
      topBackWallGridState: deepCloneJson(topBackWallGridState) || {},
      rearSupport: deepCloneJson(rearSupportState) || normalizeRearSupportStateForApp(null),
      gutterEditState: deepCloneJson(gutterEditState) || { minusXDelta: 0, plusXDelta: 0, groups: {} },
      independentSideViewVisibility: deepCloneJson(independentSideViewVisibility) || {},
      waterOutletPipeState: deepCloneJson(waterOutletPipeState) || { diameter: 70, length: 300, offsets: {}, deleted: {} },
      upperTableTransform: deepCloneJson(upperTableTransform) || { x: 0, y: 0, scaleX: 1, scaleY: 1 },
      sideFeatureState: deepCloneJson(sideFeatureState) || normalizeSideFeatureStateForApp(),
      glassTrackLengthOffsets: deepCloneJson(glassTrackLengthOffsets) || { left: 0, right: 0, middle: {} },
      triangleDivisionState: deepCloneJson(triangleDivisionState) || { left: null, right: null, middle: {} },
      backWallState: deepCloneJson(backWallState) || { left: { xOffset: 0, depth: 600, height: 0 }, right: { xOffset: 0, depth: 600, height: 0 }, middle: {} },
      backWallSegments: deepCloneJson(backWallSegments) || { side: {} },
      backWallGridState: deepCloneJson(backWallGridState) || { side: {} },
      trapezSheetBounds: deepCloneJson(trapezSheetBounds) || {},
      previewDimensionOffsets: deepCloneJson(previewDimensionOffsets) || {},
      hiddenDimensionIds: hiddenDimensionIds.slice(),
      slidingPlacements: deepCloneJson(slidingPlacements) || [],
      sideSlidingPlacements: deepCloneJson(sideSlidingPlacements) || [],
      guillotinePlacements: deepCloneJson(guillotinePlacements) || [],
      sideGuillotinePlacements: deepCloneJson(sideGuillotinePlacements) || [],
      zipScreenPlacements: deepCloneJson(zipScreenPlacements) || [],
      sideZipScreenPlacements: deepCloneJson(sideZipScreenPlacements) || [],
      manualInputFlags: {
        rayCount: Boolean($('rayCount') && $('rayCount').dataset.userEdited === 'true'),
        postCount: Boolean($('postCount') && $('postCount').dataset.userEdited === 'true')
      }
    };
  }

  function legacyRuntimeEnvelope(formData = captureRuntimeFormData()) {
    return {
      record: deepCloneJson(currentProjectRecord),
      formData,
      drawingState: captureRuntimeDrawingState(),
      uiSettings: {
        language: currentLanguage,
        dimensions: serializePreviewDimensionFilter()
      }
    };
  }

  function syncProjectModelFromLegacy(formData, normalizedInput, source = 'runtime-sync') {
    dispatchProjectAction(window.PulumurProjectActions.TYPES.SYNC_LEGACY_STATE, {
      legacy: legacyRuntimeEnvelope(formData || captureRuntimeFormData()),
      normalizedInput: normalizedInput || null
    }, { source, allowInvalid: true });
    if (normalizedInput) {
      dispatchProjectAction(window.PulumurProjectActions.TYPES.RECONCILE_TOPOLOGY, { normalizedInput }, { source: `${source}:reconcile` });
    }
    return projectStore.getState();
  }

  function applyProjectModelRuntimeState(model) {
    const state = window.PulumurProjectModel.toLegacy(model).drawingState;
    manualPostPlacementMode = typeof state.manualPostPlacementMode === 'string' ? state.manualPostPlacementMode : 'standard';
    glassTrackProfileState = sanitizeGlassTrackProfile(state.glassTrackProfile);
    const supports = state.glassTrackSupportProfiles || {};
    glassSupportProfileState = {
      left: sanitizeOptionalGlassTrackProfile(supports.left),
      right: sanitizeOptionalGlassTrackProfile(supports.right)
    };
    customFrontPostCenters = Array.isArray(state.frontPostCenters) ? state.frontPostCenters.map(Number).filter(Number.isFinite) : null;
    customRayPositions = state.customRayPositions && typeof state.customRayPositions === 'object' ? deepCloneJson(state.customRayPositions) : null;
    customSideSupportCenters = state.sideSupportCenters && typeof state.sideSupportCenters === 'object'
      ? Object.fromEntries(Object.entries(state.sideSupportCenters).map(([key, value]) => [String(key), Number(value)]).filter(([, value]) => Number.isFinite(value)))
      : {};
    customSidePosts = state.sidePosts && typeof state.sidePosts === 'object' ? deepCloneJson(state.sidePosts) || {} : {};
    sideAutoSupportSuppressed = normalizeSideAutoSupportSuppressedForApp(state.sideAutoSupportSuppressed);
    frontPostProfiles = Array.isArray(state.frontPostProfiles) ? deepCloneJson(state.frontPostProfiles) || [] : [];
    horizontalFacadeProfiles = normalizeHorizontalFacadeProfilesForApp(state.horizontalFacadeProfiles);
    frontPostExtensions = Array.isArray(state.frontPostExtensions) ? state.frontPostExtensions.map(value => Math.max(0, Number(value) || 0)) : [];
    parapetSegments = state.parapetSegments && typeof state.parapetSegments === 'object' ? deepCloneJson(state.parapetSegments) || { front: [], side: {} } : { front: [], side: {} };
    topBackWallSegments = state.topBackWallSegments && typeof state.topBackWallSegments === 'object' ? deepCloneJson(state.topBackWallSegments) || {} : {};
    topBackWallGridState = state.topBackWallGridState && typeof state.topBackWallGridState === 'object' ? deepCloneJson(state.topBackWallGridState) || {} : {};
    rearSupportState = normalizeRearSupportStateForApp(state.rearSupport);
    pendingRearSupportEdit = null;
    gutterEditState = normalizeGutterEditStateForApp(state.gutterEditState);
    independentSideViewVisibility = normalizeIndependentSideViewVisibilityForApp(state.independentSideViewVisibility);
    waterOutletPipeState = normalizeWaterOutletPipeStateForApp(state.waterOutletPipeState);
    upperTableTransform = normalizeUpperTableTransformForApp(state.upperTableTransform);
    sideFeatureState = normalizeSideFeatureStateForApp(state.sideFeatureState);
    glassTrackLengthOffsets = normalizeGlassTrackLengthOffsetsForApp(state.glassTrackLengthOffsets);
    triangleDivisionState = normalizeTriangleDivisionStateForApp(state.triangleDivisionState);
    backWallState = normalizeBackWallStateForApp(state.backWallState);
    backWallSegments = normalizeBackWallSegmentsForApp(state.backWallSegments);
    backWallGridState = normalizeBackWallGridStateForApp(state.backWallGridState);
    trapezSheetBounds = state.trapezSheetBounds && typeof state.trapezSheetBounds === 'object' ? deepCloneJson(state.trapezSheetBounds) || {} : {};
    previewDimensionOffsets = normalizePreviewDimensionOffsets(state.previewDimensionOffsets);
    hiddenDimensionIds = normalizeHiddenDimensionIds(state.hiddenDimensionIds);
    slidingPlacements = Array.isArray(state.slidingPlacements) ? deepCloneJson(state.slidingPlacements) || [] : [];
    sideSlidingPlacements = Array.isArray(state.sideSlidingPlacements) ? deepCloneJson(state.sideSlidingPlacements) || [] : [];
    guillotinePlacements = Array.isArray(state.guillotinePlacements) ? deepCloneJson(state.guillotinePlacements) || [] : [];
    sideGuillotinePlacements = Array.isArray(state.sideGuillotinePlacements) ? deepCloneJson(state.sideGuillotinePlacements) || [] : [];
    zipScreenPlacements = Array.isArray(state.zipScreenPlacements) ? deepCloneJson(state.zipScreenPlacements) || [] : [];
    sideZipScreenPlacements = Array.isArray(state.sideZipScreenPlacements) ? deepCloneJson(state.sideZipScreenPlacements) || [] : [];
    syncGlassRayBoundaryControl();
    syncWaterOutletPlacementControl();
  }

  function createProjectSnapshot() {
    const model = syncProjectModelFromLegacy(captureRuntimeFormData(), lastDrawing && lastDrawing.input, 'snapshot');
    return window.PulumurProjectSchema.createEnvelope(model, { appVersion: APP_VERSION, limits: applicationLimits() });
  }

  function normalizeProjectSnapshot(raw) {
    try {
      let candidate = raw;
      if (raw && raw.format === PROJECT_FORMAT && Number(raw.schemaVersion) !== PROJECT_SCHEMA_VERSION
          && window.PulumurRevisionCore && typeof window.PulumurRevisionCore.migrateProjectEnvelope === 'function') {
        candidate = window.PulumurRevisionCore.migrateProjectEnvelope(raw, PROJECT_SCHEMA_VERSION);
      }
      return window.PulumurProjectSchema.normalizeEnvelope(candidate, { limits: applicationLimits() });
    } catch (error) {
      const code = String(error && error.message || '');
      if (code.includes('PROJECT_MODEL_MISSING')) throw new Error(currentLanguage === 'en' ? 'The Schema v2 ProjectModel is missing.' : 'Schema v2 ProjectModel verisi eksik.');
      if (code.includes('PROJECT_SCHEMA')) throw new Error(currentLanguage === 'en' ? `This build accepts only project schema v${PROJECT_SCHEMA_VERSION}.` : `Bu sürüm yalnızca v${PROJECT_SCHEMA_VERSION} proje veri şemasını kabul eder.`);
      if (code.includes('PROJECT_FORMAT')) throw new Error(currentLanguage === 'en' ? 'This is not a Pülümür project file.' : 'Bu dosya Pülümür proje dosyası değil.');
      if (code.includes('PROJECT_CHECKSUM')) throw new Error(currentLanguage === 'en' ? 'The project file checksum is invalid.' : 'Proje dosyası bütünlük doğrulamasından geçemedi.');
      throw error;
    }
  }

  function restoreProjectSnapshot(rawSnapshot, options = {}) {
    const snapshot = normalizeProjectSnapshot(rawSnapshot);
    const restoredModel = window.PulumurProjectModel.normalize(snapshot.projectModel);
    const legacy = window.PulumurProjectModel.toLegacy(restoredModel);
    const formData = legacy.formData || {};
    const record = legacy.record || {};
    const drawingState = legacy.drawingState || {};
    const uiSettings = legacy.uiSettings || {};
    const nextLanguage = uiSettings.language === 'en' ? 'en' : 'tr';

    suppressFormPreviewUpdate = true;
    try {
      currentProjectRecord = {
        projectId: record.projectId ? String(record.projectId) : null,
        projectCode: record.projectCode ? String(record.projectCode) : null,
        revisionNo: Number.isInteger(Number(record.revisionNo)) && Number(record.revisionNo) > 0 ? Number(record.revisionNo) : 1,
        serverVersion: Number.isInteger(Number(record.serverVersion)) && Number(record.serverVersion) > 0 ? Number(record.serverVersion) : null
      };

      if ($('languageSelect')) $('languageSelect').value = nextLanguage;
      translateUI(nextLanguage);

      ids.forEach(id => {
        const el = $(id);
        if (!el || formData[id] === undefined || formData[id] === null) return;
        el.value = normalizeProjectFieldValue(id, String(formData[id]), false);
        autosizeTextarea(el);
      });
      if ($('version')) $('version').value = revisionVersionValue(currentProjectRecord.revisionNo);

      manualPostPlacementMode = typeof drawingState.manualPostPlacementMode === 'string'
        ? drawingState.manualPostPlacementMode
        : 'standard';
      glassTrackProfileState = sanitizeGlassTrackProfile(drawingState.glassTrackProfile);
      const supports = drawingState.glassTrackSupportProfiles || {};
      glassSupportProfileState = {
        left: sanitizeOptionalGlassTrackProfile(supports.left),
        right: sanitizeOptionalGlassTrackProfile(supports.right)
      };
      customRayPositions = drawingState.customRayPositions && typeof drawingState.customRayPositions === 'object' ? deepCloneJson(drawingState.customRayPositions) : null;
      customFrontPostCenters = Array.isArray(drawingState.frontPostCenters)
        ? drawingState.frontPostCenters.map(Number).filter(Number.isFinite)
        : null;
      customSideSupportCenters = drawingState.sideSupportCenters && typeof drawingState.sideSupportCenters === 'object'
        ? Object.fromEntries(Object.entries(drawingState.sideSupportCenters).map(([key, value]) => [String(key), Number(value)]).filter(([, value]) => Number.isFinite(value)))
        : {};
      customSidePosts = drawingState.sidePosts && typeof drawingState.sidePosts === 'object'
        ? deepCloneJson(drawingState.sidePosts) || {}
        : {};
      sideAutoSupportSuppressed = normalizeSideAutoSupportSuppressedForApp(drawingState.sideAutoSupportSuppressed);
      frontPostProfiles = Array.isArray(drawingState.frontPostProfiles)
        ? deepCloneJson(drawingState.frontPostProfiles) || []
        : [];
      horizontalFacadeProfiles = normalizeHorizontalFacadeProfilesForApp(drawingState.horizontalFacadeProfiles);
      frontPostExtensions = Array.isArray(drawingState.frontPostExtensions)
        ? drawingState.frontPostExtensions.map(value => Math.max(0, Number(value) || 0))
        : [];
      parapetSegments = drawingState.parapetSegments && typeof drawingState.parapetSegments === 'object'
        ? deepCloneJson(drawingState.parapetSegments) || { front: [], side: {} }
        : { front: [], side: {} };
      topBackWallSegments = drawingState.topBackWallSegments && typeof drawingState.topBackWallSegments === 'object' ? deepCloneJson(drawingState.topBackWallSegments) || {} : {};
      topBackWallGridState = drawingState.topBackWallGridState && typeof drawingState.topBackWallGridState === 'object' ? deepCloneJson(drawingState.topBackWallGridState) || {} : {};
      rearSupportState = normalizeRearSupportStateForApp(drawingState.rearSupport);
      pendingRearSupportEdit = null;
      gutterEditState = normalizeGutterEditStateForApp(drawingState.gutterEditState);
      independentSideViewVisibility = normalizeIndependentSideViewVisibilityForApp(drawingState.independentSideViewVisibility);
      waterOutletPipeState = normalizeWaterOutletPipeStateForApp(drawingState.waterOutletPipeState);
      upperTableTransform = normalizeUpperTableTransformForApp(drawingState.upperTableTransform);
      sideFeatureState = normalizeSideFeatureStateForApp(drawingState.sideFeatureState);
      glassTrackLengthOffsets = normalizeGlassTrackLengthOffsetsForApp(drawingState.glassTrackLengthOffsets);
      triangleDivisionState = normalizeTriangleDivisionStateForApp(drawingState.triangleDivisionState);
      backWallState = normalizeBackWallStateForApp(drawingState.backWallState);
      backWallSegments = normalizeBackWallSegmentsForApp(drawingState.backWallSegments);
      backWallGridState = normalizeBackWallGridStateForApp(drawingState.backWallGridState);
      trapezSheetBounds = drawingState.trapezSheetBounds && typeof drawingState.trapezSheetBounds === 'object' ? deepCloneJson(drawingState.trapezSheetBounds) || {} : {};
      previewDimensionOffsets = drawingState.previewDimensionOffsets && typeof drawingState.previewDimensionOffsets === 'object'
        ? normalizePreviewDimensionOffsets(drawingState.previewDimensionOffsets)
        : {};
      hiddenDimensionIds = normalizeHiddenDimensionIds(drawingState.hiddenDimensionIds);
      slidingPlacements = Array.isArray(drawingState.slidingPlacements)
        ? deepCloneJson(drawingState.slidingPlacements)
        : [];
      sideSlidingPlacements = Array.isArray(drawingState.sideSlidingPlacements)
        ? (deepCloneJson(drawingState.sideSlidingPlacements) || []).map(item => {
            const key = normalizeSideViewKey(item.sideViewKey, item.sideIndex);
            return { ...item, sideViewKey: key, placementView: key === 'right' ? 'side-right' : 'side-left' };
          })
        : [];
      guillotinePlacements = Array.isArray(drawingState.guillotinePlacements)
        ? deepCloneJson(drawingState.guillotinePlacements)
        : [];
      sideGuillotinePlacements = Array.isArray(drawingState.sideGuillotinePlacements)
        ? (deepCloneJson(drawingState.sideGuillotinePlacements) || []).map(item => {
            const key = normalizeSideViewKey(item.sideViewKey, item.sideIndex);
            return { ...item, sideViewKey: key, placementView: key === 'right' ? 'side-right' : 'side-left' };
          })
        : [];
      zipScreenPlacements = Array.isArray(drawingState.zipScreenPlacements)
        ? deepCloneJson(drawingState.zipScreenPlacements)
        : [];
      sideZipScreenPlacements = Array.isArray(drawingState.sideZipScreenPlacements)
        ? (deepCloneJson(drawingState.sideZipScreenPlacements) || []).map(item => {
            const key = normalizeSideViewKey(item.sideViewKey, item.sideIndex);
            return { ...item, sideViewKey: key, placementView: key === 'right' ? 'side-right' : 'side-left' };
          })
        : [];
      pendingSlidingPlacementMeta = null;
      pendingGuillotinePlacementMeta = null;
      pendingZipScreenPlacementMeta = null;

      const manualFlags = drawingState.manualInputFlags || {};
      if ($('rayCount')) $('rayCount').dataset.userEdited = manualFlags.rayCount ? 'true' : 'false';
      if ($('postCount')) $('postCount').dataset.userEdited = manualFlags.postCount ? 'true' : 'false';

      updateRemoteOptions(true);
      syncWaterOutletPlacementControl();

      const dimensions = uiSettings.dimensions || {};
      restorePreviewDimensionFilter(dimensions);
      syncDimensionFilterControls();

      document.querySelectorAll('.quick-test-btn.active').forEach(btn => btn.classList.remove('active'));
      projectStore.replaceSilently(restoredModel);
    } finally {
      suppressFormPreviewUpdate = false;
    }

    const workspace = restoredModel && restoredModel.workspaces || {};
    const embeddedP3dv = /^P3DV_/.test(String(workspace.activeProductId || ''))
      && workspace.p3dv && workspace.p3dv.snapshot && typeof workspace.p3dv.snapshot === 'object';
    const drawing = embeddedP3dv
      ? { kind: 'P3DV_EMBEDDED_WORKSPACE', entities: [], input: null, productId: workspace.activeProductId, mode: workspace.activeMode === '2d' ? '2d' : '3d' }
      : updatePreview(options.resetZoom === true);
    if (!drawing && options.requireValidDrawing === true) {
      throw new Error(currentLanguage === 'en'
        ? 'The project data was loaded, but the drawing could not be rebuilt.'
        : 'Proje verileri yüklendi ancak çizim yeniden oluşturulamadı.');
    }
    return drawing;
  }

  function preflightProjectSnapshot(rawSnapshot) {
    const normalized = normalizeProjectSnapshot(rawSnapshot);
    let model = window.PulumurProjectValidation.validateProjectModel(normalized.projectModel, { limits: applicationLimits() });
    const workspace = model && model.workspaces || {};
    const p3dvWorkspace = workspace && workspace.p3dv || {};
    const embeddedP3dv = /^P3DV_/.test(String(workspace.activeProductId || ''))
      && p3dvWorkspace.snapshot && typeof p3dvWorkspace.snapshot === 'object';
    // P3DV projects own their geometry in the canonical P3DV snapshot in both 2D and 3D modes.
    // Never preflight them through the native Pergola geometry contract merely because the saved
    // presentation mode is Technical2D.
    if (embeddedP3dv) {
      return window.PulumurProjectSchema.createEnvelope(model, { appVersion: APP_VERSION, limits: applicationLimits() });
    }
    const build = candidate => {
      const geometryInput = window.PulumurProjectModel.geometryInputFromModel(candidate);
      const oversizedField = ['systemCount', 'width', 'opening', 'rearHeight', 'frontHeight', 'rayCount', 'postCount']
        .find(key => String(geometryInput && geometryInput[key] == null ? '' : geometryInput[key]).length > 4096);
      if (oversizedField) throw new Error(currentLanguage === 'en' ? `The ${oversizedField} input is too long.` : `${oversizedField} alanı izin verilenden uzun.`);
      const required = ['width', 'opening', 'rearHeight', 'frontHeight'].filter(key => firstNumber(geometryInput[key]) <= 0);
      if (required.length) throw new Error(currentLanguage === 'en' ? `Required geometry fields are invalid: ${required.join(', ')}.` : `Zorunlu geometri alanları geçersiz: ${required.join(', ')}.`);
      const drawing = window.PulumurGeometry.buildDrawing(geometryInput);
      validateBuiltDrawingLimits(drawing);
      return drawing;
    };
    let drawing = build(model);
    const reconciled = window.PulumurTopologyReconcile.reconcileProjectTopology(model, drawing.input);
    model = window.PulumurProjectValidation.validateProjectModel(reconciled.model, { limits: applicationLimits() });
    if (reconciled.report && reconciled.report.orphaned && reconciled.report.orphaned.length) drawing = build(model);
    if (!drawing || !Array.isArray(drawing.entities)) throw new Error(currentLanguage === 'en' ? 'The temporary geometry could not be built.' : 'Geçici geometri oluşturulamadı.');
    return window.PulumurProjectSchema.createEnvelope(model, { appVersion: APP_VERSION, limits: applicationLimits() });
  }


  function restoreProjectSnapshotWithHistory(rawSnapshot, options = {}) {
    const preparedSnapshot = options.skipPreflight === true ? rawSnapshot : preflightProjectSnapshot(rawSnapshot);
    const shouldResetHistory = options.resetHistory === true;
    const rollback = lastDrawing ? createProjectSnapshot() : null;
    const previousRestoring = projectHistory.restoring;
    projectHistory.restoring = true;
    let drawing;
    try {
      drawing = restoreProjectSnapshot(preparedSnapshot, { ...options, requireValidDrawing: true });
      if (!drawing) throw new Error(currentLanguage === 'en' ? 'The project could not be rebuilt.' : 'Proje çizimi yeniden oluşturulamadı.');
    } catch (error) {
      if (rollback) {
        try { restoreProjectSnapshot(rollback, { resetZoom: false, requireValidDrawing: true }); }
        catch (rollbackError) { console.error('Project rollback failed', rollbackError); }
      }
      throw error;
    } finally {
      projectHistory.restoring = previousRestoring;
    }
    if (shouldResetHistory) {
      resetProjectHistory(false);
      recordProjectHistoryState({ force: true });
    }
    try { window.dispatchEvent(new CustomEvent('plmr:project-restored', { detail: { model: projectStore.getState() } })); } catch (_) {}
    return drawing;
  }

  function serializeProjectSnapshot(snapshot = createProjectSnapshot()) {
    const normalized = normalizeProjectSnapshot(snapshot);
    const text = JSON.stringify(normalized, null, 2);
    const maxMb = applicationLimits().maxProjectFileMb;
    if (new Blob([text]).size > maxMb * 1024 * 1024) throw new Error(currentLanguage === 'en' ? `The project file exceeds the ${maxMb} MB limit.` : `Proje dosyası ${maxMb} MB sınırını aşıyor.`);
    return text;
  }

  function parseProjectSnapshot(text) {
    try {
      return window.PulumurProjectSchema.parse(text, { limits: applicationLimits() });
    } catch (err) {
      if (!String(err && err.message || '').includes('PROJECT_JSON_INVALID')) throw err;
      throw new Error(currentLanguage === 'en' ? 'The project file contains invalid JSON.' : 'Proje dosyasındaki JSON içeriği geçersiz.');
    }
  }

  function projectSnapshotFileName(snapshot) {
    const model = window.PulumurProjectModel.normalize(snapshot && snapshot.projectModel);
    const meta = model.metadata || {};
    const record = model.revisionInfo || {};
    return `${projectArtifactNameRoot(meta, record)}.plmr`;
  }

  function exportProjectSnapshot() {
    try {
      const snapshot = createProjectSnapshot();
      const filename = projectSnapshotFileName(snapshot);
      const serialized = serializeProjectSnapshot(snapshot);
      const maxMb = applicationLimits().maxProjectFileMb;
      const byteSize = new Blob([serialized]).size;
      if (byteSize > maxMb * 1024 * 1024) throw new Error(currentLanguage === 'en' ? `The project file exceeds the ${maxMb} MB limit.` : `Proje dosyası ${maxMb} MB sınırını aşıyor.`);
      downloadText(filename, serialized, 'application/json;charset=utf-8');
      statusText.textContent = currentLanguage === 'en'
        ? `Project file downloaded: ${filename}`
        : `Proje dosyası indirildi: ${filename}`;
      if (window.PulumurActivity) {
        const record = getCurrentProjectRecord();
        void window.PulumurActivity.log('project_file_download', {
          projectId: record.projectId, projectCode: record.projectCode, revisionNo: record.revisionNo,
          detail: { filename }
        });
      }
    } catch (err) {
      statusText.textContent = err.message;
      window.alert(err.message);
      console.error(err);
    }
  }

  async function importProjectSnapshotFile(file) {
    if (!file) return;
    const maxMb = applicationLimits().maxProjectFileMb;
    if (file.size > maxMb * 1024 * 1024) {
      throw new Error(currentLanguage === 'en' ? `The project file is larger than ${maxMb} MB.` : `Proje dosyası ${maxMb} MB sınırından büyük.`);
    }
    const text = await file.text();
    const parsed = parseProjectSnapshot(text);
    const detachedModel = window.PulumurProjectModel.normalize(parsed.projectModel);
    detachedModel.revisionInfo = { projectId: null, projectCode: null, revisionNo: 1, serverVersion: null };
    const snapshot = window.PulumurProjectSchema.createEnvelope(detachedModel, { appVersion: APP_VERSION, limits: applicationLimits() });
    restoreProjectSnapshotWithHistory(snapshot, { resetZoom: false, resetHistory: true });
    setProjectWorkspaceActive(true);
    const importedMetadata = detachedModel.metadata || {};
    const quickDrawing = !String(importedMetadata.customer || '').trim() && !String(importedMetadata.project || '').trim();
    window.dispatchEvent(new CustomEvent('plmr-project-file-loaded', { detail: { quickDrawing } }));
    statusText.textContent = currentLanguage === 'en'
      ? `Project loaded: ${file.name}`
      : `Proje yüklendi: ${file.name}`;
  }

  function openProjectSnapshotPicker() {
    const input = $('projectImportInput');
    if (!input) return;
    input.value = '';
    input.click();
  }

  function getCurrentProjectRecord() {
    return deepCloneJson(currentProjectRecord);
  }

  function setCurrentProjectRecord(record = {}) {
    currentProjectRecord = {
      projectId: record.projectId ? String(record.projectId) : null,
      projectCode: record.projectCode ? String(record.projectCode) : null,
      revisionNo: Number.isInteger(Number(record.revisionNo)) && Number(record.revisionNo) > 0 ? Number(record.revisionNo) : 1,
      serverVersion: Number.isInteger(Number(record.serverVersion)) && Number(record.serverVersion) > 0 ? Number(record.serverVersion) : null
    };
    dispatchProjectAction(window.PulumurProjectActions.TYPES.SET_REVISION_INFO, currentProjectRecord, { source: 'project-record' });
    const versionValue = revisionVersionValue(currentProjectRecord.revisionNo);
    if ($('version')) $('version').value = versionValue;
    dispatchProjectAction(window.PulumurProjectActions.TYPES.SET_FORM_FIELD, { field: 'version', value: versionValue }, { source: 'revision-version', allowInvalid: true });
    return getCurrentProjectRecord();
  }

  if (window.PulumurLimits && typeof window.PulumurLimits.subscribe === 'function') {
    window.PulumurLimits.subscribe(() => { trimProjectHistory(); updateHistoryControls(); schedulePreviewUpdate(0); });
  }

  window.PulumurProjectUi = Object.freeze({
    normalizeText: (value, options = {}) => normalizeProjectText(value, options),
    normalizeField: (id, value, preserveTrailingSpace = true) => normalizeProjectFieldValue(id, value, preserveTrailingSpace),
    setWorkspaceActive: active => setProjectWorkspaceActive(active),
    applyMetadata: (metadata, options) => applyProjectMetadataFields(metadata, options),
    revisionVersion: revisionNo => revisionVersionValue(revisionNo),
    artifactNameRoot: (metadata, record) => projectArtifactNameRoot(metadata, record)
  });

  window.PulumurDiagnostics = Object.freeze({
    getHistory: () => ({ index: projectHistory.index, entries: projectHistory.entries.length, limit: applicationLimits().historySteps }),
    getLimits: () => applicationLimits(),
    getProjectModel: () => projectStore.getState(),
    getProjectActions: () => projectStore.debug(),
    getTopologyReport: () => deepCloneJson(topologyReconcileReport),
    getLastLeftMirror: () => window.PulumurProjectModel.deriveLastLeftMirror(projectStore.getState()),
    getLastAction: () => deepCloneJson(lastProjectAction),
    getRuntimeErrors: () => window.PulumurRuntimeMonitor ? window.PulumurRuntimeMonitor.getEntries() : [],
    downloadRuntimeReport: () => window.PulumurRuntimeMonitor && window.PulumurRuntimeMonitor.downloadReport(),
    validateCurrentState: () => { const raw = collectForm(); assertStateWithinLimits(raw); window.PulumurProjectValidation.validateProjectModel(projectStore.getState()); return true; }
  });


  function clearSensitiveProjectState() {
    // Authentication is host-owned. A sign-out must not leave the previous
    // tenant's project model or embedded 3D snapshot resident for the next user.
    const emptyModel = window.PulumurProjectModel.createEmpty();
    projectStore.replaceSilently(emptyModel);
    currentProjectRecord = { projectId: null, projectCode: null, revisionNo: 1, serverVersion: null };
    slidingPlacements = [];
    sideSlidingPlacements = [];
    guillotinePlacements = [];
    sideGuillotinePlacements = [];
    zipScreenPlacements = [];
    sideZipScreenPlacements = [];
    lastDrawing = null;
    resetProjectHistory(false);
    try { window.dispatchEvent(new CustomEvent('plmr:project-sensitive-state-cleared')); } catch (_) {}
    return true;
  }

  window.PulumurProjectState = Object.freeze({
    format: PROJECT_FORMAT,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    createSnapshot: createProjectSnapshot,
    restoreSnapshot: restoreProjectSnapshotWithHistory,
    resetHistory: (captureCurrent = true) => resetProjectHistory(captureCurrent),
    serialize: serializeProjectSnapshot,
    parse: parseProjectSnapshot,
    getModel: () => projectStore.getState(),
    dispatch: (type, payload, meta) => dispatchProjectAction(type, payload, meta),
    subscribe: (listener) => projectStore.subscribe(listener),
    getRecord: getCurrentProjectRecord,
    setRecord: setCurrentProjectRecord,
    clearSensitiveState: clearSensitiveProjectState
  });

  function downloadBlob(filename, blob) {
    if (window.navigator && typeof window.navigator.msSaveOrOpenBlob === 'function') {
      window.navigator.msSaveOrOpenBlob(blob, filename);
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1500);
  }

  function downloadText(filename, text, mime = 'application/octet-stream;charset=utf-8') {
    downloadBlob(filename, new Blob([text], { type: mime }));
  }

  function buildNameRoot(drawing) {
    const record = currentProjectRecord || {};
    const input = drawing && drawing.input ? drawing.input : {};
    return projectArtifactNameRoot({ customer: input.customer, project: input.project }, record);
  }

  function currentDxfDimensionHiddenLayers() {
    const mainOn = previewDimensionFilter.main !== false;
    const allOn = mainOn && previewDimensionFilter.all === true;
    return {
      'Ölçüler - Ana': !mainOn,
      'Ölçüler - Detay': !allOn
    };
  }

  function generateDxf() {
    try {
      const drawing = updatePreview();
      if (!drawing) return;
      drawing.hiddenLayers = currentDxfDimensionHiddenLayers();
      const engine = window.PulumurModernDXF;
      if (!engine || typeof engine.toDxf !== 'function') {
        throw new Error(currentLanguage === 'en'
          ? 'The Modern DXF engine could not be loaded (modernDxfTemplate.js / dxfModernEngine.js).'
          : 'Modern DXF motoru yüklenemedi (modernDxfTemplate.js / dxfModernEngine.js).');
      }
      const dxf = commercialProductText(engine.toDxf(drawing));
      if (!dxf || dxf.length < 100) throw new Error(currentLanguage === 'en' ? 'The generated DXF is empty.' : 'DXF içeriği boş oluştu.');
      const nameRoot = buildNameRoot(drawing);
      downloadText(`${nameRoot}.dxf`, dxf, 'application/dxf;charset=utf-8');
      statusText.textContent = currentLanguage === 'en'
        ? `DXF downloaded: ${nameRoot}.dxf`
        : `DXF indirildi: ${nameRoot}.dxf`;
      if (window.PulumurActivity) {
        const record = getCurrentProjectRecord();
        void window.PulumurActivity.log('dxf_download', {
          projectId: record.projectId, projectCode: record.projectCode, revisionNo: record.revisionNo,
          detail: { filename: `${nameRoot}.dxf` }
        });
      }
    } catch (err) {
      statusText.textContent = currentLanguage === 'en' ? `DXF generation error: ${err.message}` : `DXF oluşturma hatası: ${err.message}`;
      window.alert(currentLanguage === 'en' ? `DXF generation error:
${err.message}` : `DXF oluşturma hatası:
${err.message}`);
      console.error(err);
    }
  }

  function ensureJsPdf() {
    if (window.PulumurVectorPdfEngine && typeof window.PulumurVectorPdfEngine.ensureJsPdf === 'function') {
      return window.PulumurVectorPdfEngine.ensureJsPdf();
    }
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    return Promise.reject(new Error(currentLanguage === 'en' ? 'PLMR PDF engine is not available.' : 'PLMR PDF motoru yüklenmedi.'));
  }

  function hexToRgb(hex) {
    const clean = String(hex || '#000000').replace('#', '').trim();
    if (clean.length !== 6) return [0, 0, 0];
    const value = Number.parseInt(clean, 16);
    if (!Number.isFinite(value)) return [0, 0, 0];
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }

  const ACI_HEX = {
    1: '#ff0000',
    2: '#ffff00',
    3: '#00ff00',
    4: '#00ffff',
    5: '#0000ff',
    6: '#ff00ff',
    7: '#000000',
    8: '#808080',
    9: '#c0c0c0',
    42: '#ffbf00',
    130: '#00bf00',
    256: null
  };

  function aciColorToHex(color, fallback = '#000000') {
    if (window.PulumurGeometry && typeof window.PulumurGeometry.aciColorToHex === 'function') {
      return window.PulumurGeometry.aciColorToHex(color, fallback);
    }
    const n = Number(color);
    if (!Number.isFinite(n) || n === 256 || n === 0) return fallback;
    return ACI_HEX[n] || fallback;
  }

  function entityPdfColor(ent, st) {
    return aciColorToHex(ent && ent.color, (st && st.stroke) || '#000000');
  }

  function pdfPageForBounds(box) {
    const ratio = Math.max(0.1, Math.min(10, box.width / Math.max(1, box.height)));
    const landscape = ratio >= 1;
    return landscape
      ? { width: 1189, height: 841, orientation: 'landscape' }
      : { width: 841, height: 1189, orientation: 'portrait' };
  }

  function setPdfStroke(pdf, ent, layerStyle, scale) {
    const st = layerStyle[ent.layer] || layerStyle.OUTLINE || { stroke: '#000000', width: 1 };
    const [r, g, b] = hexToRgb(entityPdfColor(ent, st));
    pdf.setDrawColor(r, g, b);
    pdf.setTextColor(r, g, b);
    // DraftSight çıktısına yakın A0 görünümü: ince, vektörel ve keskin çizgi.
    const lw = Math.max(0.04, Math.min(0.30, (Number(st.width) || 1) * scale * 0.85));
    pdf.setLineWidth(lw);
    if (st.dash && typeof pdf.setLineDashPattern === 'function') {
      const dash = String(st.dash).split(/\s+/).map(Number).filter(Number.isFinite).map(v => Math.max(0.12, v * scale));
      pdf.setLineDashPattern(dash.length ? dash : [], 0);
    } else if (typeof pdf.setLineDashPattern === 'function') {
      pdf.setLineDashPattern([], 0);
    }
  }

  function writePdfText(pdf, ent, mx, my, scale) {
    const raw = commercialProductText(ent.value || '');
    if (!raw) return;
    const fontMm = Math.max(0.75, (Number(ent.height) || 100) * scale);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(fontMm * 72 / 25.4);
    const align = ent.align === 'center' ? 'center' : (ent.align === 'right' ? 'right' : 'left');
    const lines = ent.type === 'mtext' ? raw.split('\\P') : [raw];
    lines.forEach((line, idx) => {
      pdf.text(line, mx(ent.x), my(ent.y) + idx * fontMm * 1.15, {
        align,
        baseline: 'middle',
        angle: -(Number(ent.rotation) || 0)
      });
    });
  }

  function drawVectorPdf(pdf, drawing, page, margin) {
    if (window.PulumurVectorPdfEngine && typeof window.PulumurVectorPdfEngine.drawFitPage === 'function') {
      return window.PulumurVectorPdfEngine.drawFitPage(pdf, drawing, page, margin, { fontName: pdf.__plmrFontName || 'PLMRNoto' });
    }
    const flat = window.PulumurGeometry.flattenDrawingForExport
      ? window.PulumurGeometry.flattenDrawingForExport(drawing)
      : { entities: drawing.entities || [], bounds: window.PulumurGeometry.bounds(drawing.entities || []), layerStyle: drawing.layerStyle || window.PulumurGeometry.LAYER_STYLE };
    const box = flat.bounds;
    const usableW = Math.max(1, page.width - margin * 2);
    const usableH = Math.max(1, page.height - margin * 2);
    const scale = Math.min(usableW / Math.max(1, box.width), usableH / Math.max(1, box.height));
    const contentW = box.width * scale;
    const contentH = box.height * scale;
    const offsetX = (page.width - contentW) / 2 - box.minX * scale;
    const offsetY = (page.height - contentH) / 2 + box.maxY * scale;
    const mx = x => offsetX + x * scale;
    const my = y => offsetY - y * scale;
    const layerStyle = flat.layerStyle || window.PulumurGeometry.LAYER_STYLE;

    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, page.width, page.height, 'F');
    (flat.entities || []).forEach(ent => {
      setPdfStroke(pdf, ent, layerStyle, scale);
      if (ent.type === 'line') {
        pdf.line(mx(ent.x1), my(ent.y1), mx(ent.x2), my(ent.y2));
      } else if (ent.type === 'polyline') {
        const pts = ent.points || [];
        for (let i = 0; i < pts.length - 1; i += 1) pdf.line(mx(pts[i][0]), my(pts[i][1]), mx(pts[i + 1][0]), my(pts[i + 1][1]));
        if (ent.closed && pts.length > 2) pdf.line(mx(pts[pts.length - 1][0]), my(pts[pts.length - 1][1]), mx(pts[0][0]), my(pts[0][1]));
      } else if (ent.type === 'circle') {
        pdf.circle(mx(ent.x), my(ent.y), Math.abs(ent.r) * scale, 'S');
      } else if (ent.type === 'text' || ent.type === 'mtext') {
        writePdfText(pdf, ent, mx, my, scale);
      }
    });
    if (typeof pdf.setLineDashPattern === 'function') pdf.setLineDashPattern([], 0);
  }

  async function generatePdf() {
    preview.classList.add('is-loading');
    try {
      const drawing = updatePreview();
      if (!drawing) return;
      const jsPDF = await ensureJsPdf();
      if (!jsPDF) throw new Error(currentLanguage === 'en' ? 'PDF library is not available.' : 'PDF kütüphanesi aktif değil.');
      const flat = window.PulumurGeometry.flattenDrawingForExport
        ? window.PulumurGeometry.flattenDrawingForExport(drawing)
        : { bounds: window.PulumurGeometry.bounds(drawing.entities || []) };
      const page = pdfPageForBounds(flat.bounds);
      if (window.PulumurExportService) window.PulumurExportService.assertPdfLayout([{ viewId: 'PRODUCTION_DRAWING', bounds: flat.bounds }]);
      const pdf = new jsPDF({ orientation: page.orientation, unit: 'mm', format: [page.width, page.height], compress: true, precision: 12, putOnlyUsedFonts: true });
      if (window.PulumurExportService) await window.PulumurExportService.ensurePdfFont(pdf, 'assets/NotoSans-Regular.ttf');
      drawVectorPdf(pdf, drawing, page, 6);
      const blob = pdf.output('blob');
      const nameRoot = buildNameRoot(drawing);
      downloadBlob(`${nameRoot}.pdf`, blob);
      statusText.textContent = currentLanguage === 'en' ? `PDF downloaded: ${nameRoot}.pdf` : `PDF indirildi: ${nameRoot}.pdf`;
      if (window.PulumurActivity) {
        const record = getCurrentProjectRecord();
        void window.PulumurActivity.log('pdf_download', {
          projectId: record.projectId, projectCode: record.projectCode, revisionNo: record.revisionNo,
          detail: { filename: `${nameRoot}.pdf` }
        });
      }
    } catch (err) {
      statusText.textContent = currentLanguage === 'en' ? `PDF generation error: ${err.message}` : `PDF oluşturma hatası: ${err.message}`;
      window.alert(currentLanguage === 'en' ? `PDF generation error:\n${err.message}` : `PDF oluşturma hatası:\n${err.message}`);
      console.error(err);
    } finally {
      preview.classList.remove('is-loading');
    }
  }

  function syncExpandButton() {
    const btn = $('expandPreviewBtn');
    if (!btn || !previewPanel) return;
    const expanded = previewPanel.classList.contains('is-expanded');
    const txt = UI_TEXT[currentLanguage] || UI_TEXT.tr;
    btn.textContent = expanded ? txt.shrinkPreviewBtn : txt.expandPreviewBtn;
  }

  function focusPreviewCanvas() {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    if (preview && typeof preview.focus === 'function') {
      window.setTimeout(() => preview.focus({ preventScroll: true }), 30);
    }
  }

  function capturePreviewViewport() {
    const totalScale = Math.max(0.0001, (Number(previewState.baseScale) || 1) * (Number(previewState.zoom) || 1));
    return {
      worldCenterX: (preview.scrollLeft + preview.clientWidth / 2) / totalScale,
      worldCenterY: (preview.scrollTop + preview.clientHeight / 2) / totalScale,
      totalScale
    };
  }

  function restorePreviewViewport(viewport) {
    if (!viewport) return;
    const totalScale = Math.max(0.0001, viewport.totalScale || ((Number(previewState.baseScale) || 1) * (Number(previewState.zoom) || 1)));
    preview.scrollLeft = Math.max(0, viewport.worldCenterX * totalScale - preview.clientWidth / 2);
    preview.scrollTop = Math.max(0, viewport.worldCenterY * totalScale - preview.clientHeight / 2);
  }

  function browserFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function applyPreviewExpandedState(expanded, options) {
    const opts = options || {};
    if (!previewPanel) return;
    const next = Boolean(expanded);
    if (!next && (bulkProfileSelectionState.active || bulkProfileSelectionState.editorOpen || bulkProfileSelectionState.opening)) cancelBulkProfileSelection();
    if (!next && selectedIndependentSideView) closeSideViewSelectionOverlay();
    resetPreviewGestureState(true);
    previewPanel.classList.toggle('is-expanded', next);
    document.body.classList.toggle('preview-expanded-open', next);
    if (next) {
      try {
        const productValue = $('product') && $('product').value;
        const toolboxCore = window.PulumurContextualToolbox;
        const toolboxController = window.__plmrContextualToolbox;
        if (toolboxCore && typeof toolboxCore.isPergoProduct === 'function' && toolboxCore.isPergoProduct(productValue) && toolboxController && typeof toolboxController.setState === 'function') {
          toolboxController.setState({ open: true, pinned: true });
        }
      } catch (_) {}
    }
    syncPreviewMode();
    window.requestAnimationFrame(() => {
      updatePreview(true);
      if (next && opts.focus !== false) focusPreviewCanvas();
    });
    syncExpandButton();
  }

  async function togglePreviewFullscreen() {
    if (!previewPanel) return;
    const expanded = previewPanel.classList.contains('is-expanded');
    if (!expanded) {
      previewFullscreenFallback = false;
      applyPreviewExpandedState(true);
      const request = previewPanel.requestFullscreen || previewPanel.webkitRequestFullscreen;
      if (typeof request === 'function') {
        try {
          await request.call(previewPanel);
          previewBrowserFullscreenActive = browserFullscreenElement() === previewPanel;
        } catch (_) {
          previewFullscreenFallback = true;
        }
      } else {
        previewFullscreenFallback = true;
      }
    } else {
      const current = browserFullscreenElement();
      if (current === previewPanel) {
        try {
          const exit = document.exitFullscreen || document.webkitExitFullscreen;
          if (typeof exit === 'function') await exit.call(document);
        } catch (_) {}
      }
      previewBrowserFullscreenActive = false;
      previewFullscreenFallback = false;
      applyPreviewExpandedState(false, { focus: false });
    }
  }

  function handlePreviewFullscreenChange() {
    if (!previewPanel) return;
    const active = browserFullscreenElement() === previewPanel;
    if (active) {
      previewBrowserFullscreenActive = true;
      previewFullscreenFallback = false;
      if (!previewPanel.classList.contains('is-expanded')) applyPreviewExpandedState(true);
      return;
    }
    if (previewBrowserFullscreenActive) {
      // ESC/browser exit returns the native 2D workspace to its exact normal layout.
      previewBrowserFullscreenActive = false;
      previewFullscreenFallback = false;
      if (previewPanel.classList.contains('is-expanded')) applyPreviewExpandedState(false, { focus: false });
    }
  }

  function resetForm() {
    const metadata = {
      customer: $('customer') ? $('customer').value : '',
      project: $('project') ? $('project').value : '',
      revisionNo: currentProjectRecord.revisionNo,
      drawnBy: $('drawnBy') ? $('drawnBy').value : '',
      date: $('date') ? $('date').value : today()
    };
    resetProjectHistory(false);
    fillInitial();
    applyProjectMetadataFields(metadata, { source: 'form-reset', updatePreview: false, allowBlankIdentity: isQuickDrawingMode() });
    document.querySelectorAll('.quick-test-btn.active').forEach(btn => btn.classList.remove('active'));
    updatePreview();
  }

  function resetVisibleFields(fieldIds) {
    fieldIds.forEach(id => {
      const el = $(id);
      if (!el || !Object.prototype.hasOwnProperty.call(EXCEL_DEFAULT_INPUT, id)) return;
      el.value = EXCEL_DEFAULT_INPUT[id];
    });
  }

  function resetSystemFields() {
    resetVisibleFields(['systemCount', 'width', 'opening', 'rearHeight', 'frontHeight', 'rayCount', 'postCount']);
    ['rayCount', 'postCount'].forEach(id => {
      const el = $(id);
      if (el) el.dataset.userEdited = 'false';
    });
    applyAutoRayPost(true);
    updatePreview();
    statusText.textContent = currentLanguage === 'en' ? 'System dimensions were reset.' : 'Sistem ölçüleri resetlendi.';
  }

  function resetOptionsFields() {
    resetVisibleFields(['parapet', 'parapetHeight', 'glassTrack', 'glassRayBoundaryMode', 'structureColor', 'fabric', 'fabricProfiles', 'motor', 'remote', 'led', 'dimmer', 'extras']);
    setMainSideFeatureValue('glassTrack', false);
    glassTrackProfileState = { mode: 'standard', en: 100, boy: 100, et: 2 };
    glassSupportProfileState = { left: null, right: null };
    glassTrackLengthOffsets = { left: 0, right: 0, middle: {} };
    parapetSegments = { front: [], side: {} };
    updateRemoteOptions(false);
    syncGlassRayBoundaryControl();
    syncToolboxBooleanButtons();
    updatePreview();
    statusText.textContent = currentLanguage === 'en' ? 'Options were reset.' : 'Opsiyonlar resetlendi.';
  }

  function resetExtraOptionsFields() {
    resetVisibleFields(['triangleJoinery', 'waterStandard', 'waterOutletPlacement']);
    setMainSideFeatureValue('triangleJoinery', false);
    triangleDivisionState = { left: null, right: null, middle: {} };
    document.querySelectorAll('.quick-test-btn.active').forEach(btn => btn.classList.remove('active'));
    syncToolboxBooleanButtons();
    syncWaterOutletPlacementControl();
    updatePreview();
    statusText.textContent = currentLanguage === 'en' ? 'Extra options were reset.' : 'Ek opsiyonlar resetlendi.';
  }

  function n(id) {
    const value = $(id).value;
    if (value === '') return null;
    const parsed = Number(String(value).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }

  function setValue(id, value, digits = 0) {
    if (value === null || value === undefined || !Number.isFinite(value)) return;
    $(id).value = Number(value).toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
  }

  function calculateMissing() {
    const angle = $('calcAngle').value;
    const opening = $('calcOpening').value;
    const rear = $('calcRear').value;
    const front = $('calcFront').value;
    try {
      const br = window.PulumurExcelBridge;
      const result = br.calculateSystem({ angle, opening, rear, front });
      lastCalc = result;

      const ids = ['calcAngle', 'calcOpening', 'calcRear', 'calcFront'];
      const targetId = ids[result.missingIndex];
      $(targetId).value = result.resultText;
      {
        const txt = UI_TEXT[currentLanguage] || UI_TEXT.tr;
        $('calcResult').textContent = `${txt.calcReady} (${result.pozSay} ${txt.calcPoz}): ${result.resultText}`;
      }
      return result;
    } catch (err) {
      $('calcResult').textContent = err.message;
      lastCalc = null;
      return null;
    }
  }

  function transferCalc() {
    const result = lastCalc || calculateMissing();
    if (!result) return;
    const ids = ['calcAngle', 'calcOpening', 'calcRear', 'calcFront'];
    // Excel "Değerleri Hücrelere Aktar" davranışına web karşılığı:
    // Açılım / Arka Yükseklik / Ön Yükseklik ana forma aktarılır.
    if ($('calcOpening').value) $('opening').value = $('calcOpening').value;
    if ($('calcRear').value) $('rearHeight').value = $('calcRear').value;
    if ($('calcFront').value) $('frontHeight').value = $('calcFront').value;
    updatePreview();
    $('calculatorDialog').close();
  }

  function clearCalc() {
    ['calcAngle', 'calcOpening', 'calcRear', 'calcFront'].forEach(id => { $(id).value = ''; });
    $('calcResult').textContent = (UI_TEXT[currentLanguage] || UI_TEXT.tr).calcWaiting;
    lastCalc = null;
  }

  function openCalculator() {
    $('calcOpening').value = $('opening').value || '';
    $('calcRear').value = $('rearHeight').value || '';
    $('calcFront').value = $('frontHeight').value || '';
    $('calcAngle').value = '';
    $('calcResult').textContent = (UI_TEXT[currentLanguage] || UI_TEXT.tr).calcOpenNote;
    $('calculatorDialog').showModal();
  }

  const WEB_HELP_TEXT_TR = `PLMR DEMO SÜRÜMÜ — KISA KULLANIM
Bu paket müşteri demosu içindir. Bazı proje yönetimi ve bazı ürünler demo kapsamında bilinçli olarak pasiftir.

1) BAŞLANGIÇ
- Demo kullanımına Hızlı Çizim ile başla.
- Yeni Proje, Akıllı Proje Sihirbazı, Projelerim ve Proje Dosyası Aç demo sürümünde pasiftir.

2) BIOCLIMATIC / ECO-BIOCLIMATIC / ROLLING ROOF
- Genişlik, açılım ve yükseklik gibi ölçüleri mm olarak gir; model mevcut ürün motorundan otomatik oluşur.
- 2D düğmesi aynı ürün verisinden teknik 2D görünümü açar; Technical2D içindeki 3D Görünüm düğmesi modele geri döner.

3) 3D KULLANIM
- Sol mouse ile döndür, tekerlek ile yakınlaştır/uzaklaştır, sağ mouse ile pan yap.
- Önizlemeyi Büyüt gerçek tarayıcı tam ekranını açar; Esc ile çıkabilirsin.
- Uygun cephe/alan seçildiğinde mevcut demo menülerinden profil ve ürün yerleştirme/düzenleme işlemleri kullanılabilir.

4) PERGOLA
- Pergola demo kapsamında yalnız native 2D çizim kullanır. Pergola için 3D beklenmemelidir.

5) GİRİŞ FORMATLARI
Ana 3D ürünlerde:
- ;  yan yana modülleri ayırır.
- :  ön/arka iki sıra tanımlar.
- NO yalnız parserın izin verdiği son konumda özel hizalama/toplama davranışını açar. Genişlikte sondaki :NO son sırayı sağdan hizalar; açılımda :NO panelleri dış uçlara toplar.
Pergola native 2D'de:
- ; çoklu poz değerlerini ayırır.
- Genişlikte terminal ;NO kullanıldığında genişlik ve fiziksel ara boşluklar ayrı girilir; N sistem için N genişlik + N-1 boşluk gerekir ve boşluk 13 mm'den küçük olamaz.

6) PDF
- 3D ekrandaki PDF İndir, Doküman Merkezi'ni açar.
- Ürünün gerçekten desteklediği bölümler arasından fiyat teklifi, üretim formu, ürün listesi, 3D/2D görünüş, kesim listesi, aksesuar, optimizasyon ve stok profili gibi bölümler seçilebilir. Her ürün bütün bölümleri sunmayabilir.

7) DXF
- DXF teknik CAD çıktısıdır. Mevcut teknik çizim exportları model alanında mm ve 1:1 ölçü mantığını kullanır.

8) DEMO KISITLAMALARI
- Sürme, Giyotin, Zip Perde, Kapı, Sabit Doğrama ve Katlanır Cam görünür fakat pasiftir.
- Proje Kontrol Merkezi proje yönetimi işlemleri demo kapsamında pasiftir.
- Internal hızlı test kontrolleri kullanıcı arayüzünde gösterilmez.`;

  const WEB_HELP_TEXT_EN = `PLMR DEMO — QUICK GUIDE
This package is intended for customer demonstrations. Some project-management functions and products are intentionally disabled in the demo.

1) START
- Start the demo with Quick Drawing.
- New Project, Smart Project Wizard, My Projects and Open Project File are disabled in this demo.

2) BIOCLIMATIC / ECO-BIOCLIMATIC / ROLLING ROOF
- Enter width, projection and height values in mm; the existing product engine builds the model automatically.
- 2D opens the technical projection from the same product data; the 3D View button inside Technical2D returns to the model.

3) 3D USE
- Left-drag rotates, mouse wheel zooms, right-drag pans.
- Enlarge Preview enters native browser fullscreen; press Esc to exit.
- Where supported, select a facade/zone to use the existing profile and product placement/editing actions.

4) PERGOLA
- Pergola uses native 2D drawing only in this demo. Do not expect a Pergola 3D view.

5) INPUT FORMATS
For the main 3D products:
- ; separates side-by-side modules.
- : defines front/rear rows.
- NO is accepted only in the parser's permitted terminal position and enables the special alignment/collection rule. A terminal :NO in width right-aligns the last row; in projection it collects panels toward the outer ends.
For native Pergola 2D:
- ; separates multiple positions.
- A terminal ;NO in Width uses separate widths and physical gaps; N systems require N widths + N-1 gaps, and a gap cannot be below 13 mm.

6) PDF
- Download PDF in the 3D screen opens the Document Center.
- Depending on actual product capability, selectable sections can include quote, production form, product list, 3D/2D views, cut list, accessories, optimization and stock profiles. Not every product supports every section.

7) DXF
- DXF is the technical CAD output. Current technical exports use millimetres and 1:1 model-space measurement logic.

8) DEMO LIMITS
- Sliding, Guillotine, Zip Screen, Door, Fixed Joinery and Folding Glass remain visible but disabled.
- Project Control Center project-management actions are disabled in the demo.
- Internal quick-test controls are not shown in the user interface.`;

  function showHelp() {
    const dialog = $('helpDialog');
    const box = $('helpContent');
    const text = currentLanguage === 'en' ? WEB_HELP_TEXT_EN : WEB_HELP_TEXT_TR;
    if (dialog && box) {
      box.textContent = text;
      dialog.showModal();
    } else {
      alert(text);
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function optionValuesForInput(input) {
    const key = input && input.dataset ? input.dataset.excelCombo : '';
    if (key === 'remote') {
      const motorValue = $('motor') ? $('motor').value : '-';
      const motorKey = String(motorValue || '-').trim().toLocaleUpperCase('tr-TR');
      return REMOTE_OPTIONS_BY_MOTOR[motorKey] || ['-'];
    }
    return key && EXCEL_COMBO_OPTIONS[key] ? EXCEL_COMBO_OPTIONS[key] : [];
  }

  function closeAllCombos(except) {
    document.querySelectorAll('.excel-combo.open').forEach(box => {
      if (box !== except) box.classList.remove('open');
    });
  }

  function buildComboMenu(input, box) {
    let menu = box.querySelector('.excel-combo-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.className = 'excel-combo-menu';
      box.appendChild(menu);
    }
    const values = optionValuesForInput(input);
    const current = String(input.value || '').trim().toLocaleUpperCase('tr-TR');
    menu.innerHTML = values.map(v => {
      const selected = String(v).trim().toLocaleUpperCase('tr-TR') === current ? ' selected' : '';
      return `<button type="button" class="excel-combo-option${selected}" data-value="${escapeHtml(v)}">${escapeHtml(v)}</button>`;
    }).join('') || '<div class="excel-combo-empty">Liste yok</div>';
    menu.querySelectorAll('.excel-combo-option').forEach(btn => {
      btn.addEventListener('mousedown', evt => evt.preventDefault());
      btn.addEventListener('click', () => {
        input.value = btn.dataset.value || '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        box.classList.remove('open');
        input.focus();
      });
    });
  }

  function enhanceExcelCombos() {
    document.querySelectorAll('input[data-excel-combo]').forEach(input => {
      if (input.closest('.excel-combo')) return;
      const box = document.createElement('div');
      box.className = 'excel-combo';
      const parent = input.parentNode;
      parent.insertBefore(box, input);
      box.appendChild(input);
      input.setAttribute('autocomplete', 'off');
      input.classList.add('excel-combo-input');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'excel-combo-button';
      btn.setAttribute('aria-label', 'Listeyi aç');
      btn.textContent = '▾';
      box.appendChild(btn);
      const toggle = () => {
        const willOpen = !box.classList.contains('open');
        closeAllCombos(box);
        if (willOpen) {
          buildComboMenu(input, box);
          box.classList.add('open');
        } else {
          box.classList.remove('open');
        }
      };
      btn.addEventListener('click', evt => { evt.preventDefault(); toggle(); });
      input.addEventListener('focus', () => buildComboMenu(input, box));
      input.addEventListener('keydown', evt => {
        if (evt.key === 'ArrowDown' && evt.altKey) {
          evt.preventDefault();
          closeAllCombos(box);
          buildComboMenu(input, box);
          box.classList.add('open');
        } else if (evt.key === 'Escape') {
          box.classList.remove('open');
        }
      });
    });
    document.addEventListener('click', evt => {
      if (!evt.target.closest('.excel-combo')) closeAllCombos(null);
    });
  }

  function updateRemoteOptions(preserve = true) {
    const remoteEl = $('remote');
    if (!remoteEl) return;
    const options = optionValuesForInput(remoteEl);
    const previous = preserve ? String(remoteEl.value || '-') : '-';
    if (!preserve || !options.includes(previous)) remoteEl.value = '-';
    const box = remoteEl.closest('.excel-combo');
    if (box && box.classList.contains('open')) buildComboMenu(remoteEl, box);
  }

  function filterSemiNumeric(value, allowNo, allowColon = false) {
    const src = String(value || '').toLocaleUpperCase('tr-TR');
    let out = '';
    for (const ch of src) {
      if (/[0-9;]/.test(ch) || (allowColon && ch === ':')) out += ch;
      else if (allowNo && (ch === 'N' || ch === 'O')) out += ch;
    }
    return out;
  }

  function applyPresetValues(values) {
    const metadata = {
      customer: $('customer') ? $('customer').value : '',
      project: $('project') ? $('project').value : '',
      revisionNo: currentProjectRecord.revisionNo,
      drawnBy: $('drawnBy') ? $('drawnBy').value : '',
      date: $('date') ? $('date').value : today()
    };
    resetProjectHistory(false);
    fillInitial();
    const deferredManual = {};
    Object.entries(values || {}).forEach(([id, value]) => {
      if (['customer', 'project', 'version', 'drawnBy', 'date'].includes(id)) return;
      const el = $(id);
      if (!el) return;
      if (id === 'rayCount' || id === 'postCount') {
        deferredManual[id] = value;
        return;
      }
      el.value = value;
    });
    applyProjectMetadataFields(metadata, { source: 'quick-test', updatePreview: false, allowBlankIdentity: isQuickDrawingMode() });
    if (Object.prototype.hasOwnProperty.call(values || {}, 'glassTrack')) setMainSideFeatureValue('glassTrack', normalizeYesNo(values.glassTrack) === 'EVET');
    if (Object.prototype.hasOwnProperty.call(values || {}, 'triangleJoinery')) setMainSideFeatureValue('triangleJoinery', normalizeYesNo(values.triangleJoinery) === 'EVET');
    updateRemoteOptions(false);
    applyAutoRayPost(true);
    ['rayCount', 'postCount'].forEach(id => {
      if (!$(id)) return;
      $(id).dataset.userEdited = 'false';
    });
    if (deferredManual.rayCount !== undefined && $('rayCount')) {
      $('rayCount').value = deferredManual.rayCount;
      $('rayCount').dataset.userEdited = String(deferredManual.rayCount || '').trim() ? 'true' : 'false';
      if (deferredManual.postCount === undefined && $('postCount')) {
        const raw = collectForm();
        const br = window.PulumurExcelBridge;
        if (br && br.postCountFromRayText) $('postCount').value = br.postCountFromRayText($('rayCount').value, raw.systemCount, raw.width, raw.frontHeight);
      }
    }
    if (deferredManual.postCount !== undefined && $('postCount')) {
      $('postCount').value = deferredManual.postCount;
      $('postCount').dataset.userEdited = String(deferredManual.postCount || '').trim() ? 'true' : 'false';
    }
    updateRemoteOptions(true);
    updatePreview();
  }

  function renderQuickTests() {
    const host = $('quickTestsGrid');
    if (!host) return;
    host.innerHTML = QUICK_TEST_PRESETS.map((preset, index) => (
      `<button type="button" class="quick-test-btn" data-test-index="${index}" title="${escapeHtml(preset.title)}">${escapeHtml(preset.name)}</button>`
    )).join('');
    host.querySelectorAll('.quick-test-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.testIndex);
        const preset = QUICK_TEST_PRESETS[idx];
        if (!preset) return;
        host.querySelectorAll('.quick-test-btn').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        applyPresetValues(preset.values);
        statusText.textContent = currentLanguage === 'en' ? `${preset.name} loaded.` : `${preset.name} yüklendi: ${preset.title}`;
      });
    });
  }


  function syncParapetQuickInput() {
    const quick=$('parapetQuickInput'), wrap=$('parapetQuickWrap'), source=$('parapetHeight');
    if(!quick||!wrap||!source) return;
    if(document.activeElement!==quick) quick.value=String(source.value||'').replace(/[^0-9]/g,'');
    const has=Number(quick.value)>0;
    wrap.classList.toggle('is-filled',has); wrap.classList.toggle('is-empty',!has);
  }
  function applyParapetQuickValue() {
    const quick=$('parapetQuickInput'), source=$('parapetHeight'), select=$('parapet'); if(!quick||!source||!select)return;
    const clean=String(quick.value||'').replace(/[^0-9]/g,''); quick.value=clean;
    const value=Number(clean||0); const front=numericTokens($('frontHeight')?$('frontHeight').value:0).reduce((out,item)=>Math.max(out,item),0);
    if(value>front && front>0){ quick.value=String(front); source.value=String(front); window.alert(currentLanguage==='en'?'Parapet height cannot exceed front height.':'Parapet yüksekliği ön H değerinden büyük olamaz.'); }
    else source.value=value>0?String(value):'';
    select.value=Number(source.value)>0?'EVET':'HAYIR'; syncToolboxBooleanButtons(); syncParapetQuickInput(); updatePreview(false);
  }

  function cloneSideParapetSegments(sourceKey, targetKey, sourceOpening, targetOpening) {
    const source = parapetSegments && parapetSegments.side ? parapetSegments.side[sourceKey] : [];
    if (!Array.isArray(source) || !source.length) return [];
    const ratio = targetOpening > 0 && sourceOpening > 0 ? targetOpening / sourceOpening : 1;
    return source.map((item, index) => ({ ...item, id: `side_${targetKey}_parapet_${index+1}_${Date.now()}`, start: Number(item.start||0)*ratio, end: Number(item.end||0)*ratio }));
  }

  function cloneSidePreviewDimensionOffsets(sourceKey, targetKey, sourceIndex, targetIndex, parapetIdMap = {}) {
    const sourceSideKey = normalizeSideViewKey(sourceKey, sourceIndex);
    const targetSideKey = normalizeSideViewKey(targetKey, targetIndex);
    const replacements = [
      [`side_parapet_width_${sourceIndex}_`, `side_parapet_width_${targetIndex}_`],
      [`side_gap_${sourceSideKey}_${sourceIndex}_`, `side_gap_${targetSideKey}_${targetIndex}_`],
      [`side_glass_track_to_wall_${sourceSideKey}_${sourceIndex}`, `side_glass_track_to_wall_${targetSideKey}_${targetIndex}`],
      [`side_parapet_height_${sourceSideKey}_${sourceIndex}_`, `side_parapet_height_${targetSideKey}_${targetIndex}_`],
      [`side_gutter_to_parapet_${sourceSideKey}_${sourceIndex}_`, `side_gutter_to_parapet_${targetSideKey}_${targetIndex}_`],
      [`side_opening_${sourceSideKey}_pos_${sourceIndex + 1}`, `side_opening_${targetSideKey}_pos_${targetIndex + 1}`],
      [`side_rear_height_${sourceSideKey}_pos_${sourceIndex + 1}`, `side_rear_height_${targetSideKey}_pos_${targetIndex + 1}`],
      [`side_front_height_${sourceSideKey}_pos_${sourceIndex + 1}`, `side_front_height_${targetSideKey}_pos_${targetIndex + 1}`]
    ];
    const copied = {};
    Object.entries(previewDimensionOffsets || {}).forEach(([rawKey, value]) => {
      const key = String(rawKey || '');
      const rule = replacements.find(([from]) => key.startsWith(from));
      if (!rule) return;
      let nextKey = `${rule[1]}${key.slice(rule[0].length)}`;
      Object.entries(parapetIdMap || {}).forEach(([sourceId, targetId]) => {
        if (sourceId && targetId) nextKey = nextKey.split(String(sourceId)).join(String(targetId));
      });
      copied[nextKey] = { x: Number(value && value.x) || 0, y: Number(value && value.y) || 0 };
    });
    Object.assign(previewDimensionOffsets, copied);
  }

  function activateMiddleSideView(sideIndex) {
    const index = Math.max(1, Number(sideIndex) || 1), key = String(index);
    ensureSideFeatureStateInitialized();
    if (sideFeatureState.middleEnabled[key]) return;
    const d = lastDrawing && lastDrawing.input;
    const sourceGeom = d && d.sideSupportGeometry ? d.sideSupportGeometry['0'] : null;
    const targetOpening = d && d.positions && d.positions[index] ? Number(d.positions[index].opening) : 0;
    const sourceOpening = d && d.positions && d.positions[0] ? Number(d.positions[0].opening) : targetOpening;
    sideFeatureState.middleEnabled[key] = true;
    sideFeatureState.glassTrack.middle[key] = sideFeatureValue('glassTrack','0');
    sideFeatureState.triangle.middle[key] = sideFeatureValue('triangle','0');
    setSideScopedStateValue(triangleDivisionState, key, triangleDivisionForKey('0', null));
    // Arka duvarın ham ayarını kopyala. Yükseklik 0 ise bu, her pozun kendi
    // arka yüksekliğini otomatik kullanma kuralını korur; 1 mm'lik duvar hatası
    // oluşturacak şekilde çözülmüş fallback değer kopyalanmaz.
    const sourceWallRaw = sideScopedStateValue(backWallState, '0', { xOffset: 0, depth: 600, height: 0 }) || { xOffset: 0, depth: 600, height: 0 };
    setSideScopedStateValue(backWallState, key, { ...sourceWallRaw });
    const sourceWallSegments = backWallSegmentsForKey('0', d && d.positions && d.positions[0] ? Number(d.positions[0].rearHeight) : 0);
    storeBackWallSegmentsForKey(key, deepCloneJson(sourceWallSegments) || []);
    if (sourceGeom && Array.isArray(sourceGeom.posts)) {
      const sourceSpan = Number(sourceGeom.frontPostRearFace) - Number(sourceGeom.wallX);
      const targetSpan = Math.max(1, sourceSpan + targetOpening - sourceOpening);
      const targetFront = Number(sourceGeom.frontPostRearFace);
      const targetWall = targetFront - targetSpan;
      customSidePosts[key] = sourceGeom.posts.map((post, i) => {
        const fraction = sourceSpan > 0 ? (Number(post.centerX)-Number(sourceGeom.wallX))/sourceSpan : 0.5;
        return { id:`side_${key}_${Date.now()}_${i}`, centerX:targetWall+fraction*targetSpan, profile:sanitizeGlassTrackProfile(post.profile), extension:Number(post.extension)||0 };
      });
    }
    if (!parapetSegments.side) parapetSegments.side = {};
    const sourceParapets = Array.isArray(parapetSegments.side['0']) ? parapetSegments.side['0'] : [];
    const targetParapets = cloneSideParapetSegments('0', key, sourceOpening, targetOpening);
    parapetSegments.side[key] = targetParapets;
    const parapetIdMap = {};
    sourceParapets.forEach((segment, i) => {
      if (segment && targetParapets[i]) parapetIdMap[String(segment.id || '')] = String(targetParapets[i].id || '');
    });
    if (!glassTrackLengthOffsets.middle) glassTrackLengthOffsets.middle = {};
    glassTrackLengthOffsets.middle[key] = glassTrackLengthOffsetForKey('0');
    cloneSidePreviewDimensionOffsets('0', key, 0, index, parapetIdMap);
    const copyPlacements = (items, prefix) => {
      const source = items.filter(item => normalizeSideViewKey(item.sideViewKey, item.sideIndex) === '0');
      const pozNos = allocatePozNos(prefix === 'sliding' ? 'S' : (prefix === 'zip' ? 'Z' : 'G'), source.length);
      return source.map((item, i) => ({
        ...deepCloneJson(item),
        id: `${prefix}_${key}_${Date.now()}_${i}`,
        sideIndex: index,
        sideViewKey: key,
        placementView: 'side-left',
        pozNo: pozNos[i]
      }));
    };
    const copiedSliding = copyPlacements(sideSlidingPlacements, 'sliding');
    const copiedGuillotine = copyPlacements(sideGuillotinePlacements, 'guillotine');
    const copiedZip = copyPlacements(sideZipScreenPlacements, 'zip');
    if (stateProductCount() + copiedSliding.length + copiedGuillotine.length + copiedZip.length > applicationLimits().maxProducts) {
      sideFeatureState.middleEnabled[key] = false;
      throw new Error(currentLanguage === 'en' ? `The total product limit is ${applicationLimits().maxProducts}.` : `Toplam ürün sınırı ${applicationLimits().maxProducts}.`);
    }
    copiedSliding.forEach(item => sideSlidingPlacements.push(item));
    copiedGuillotine.forEach(item => sideGuillotinePlacements.push(item));
    copiedZip.forEach(item => sideZipScreenPlacements.push(item));
    updatePreview(false);
    statusText.textContent=currentLanguage==='en'?`Intermediate side view ${index+1} activated from the left-side template.`:`${index+1}. ara poz yan görünüşü sol yan görünüş kopyasıyla düzenlemeye açıldı.`;
  }

  function openPostSettingsFromToolbox() {
    const d=lastDrawing&&lastDrawing.input;
    showPostEditorOverlay({postIndex:0,currentPostCount:Number(d&&d.postCount)||Number($('postCount')&&$('postCount').value)||0,totalRayCount:Number(d&&d.totalRayCount)||0});
  }

  function ensureBulkExtendOverlay() {
    let overlay=$('bulkExtendOverlay'); if(overlay)return overlay;
    overlay=document.createElement('div'); overlay.id='bulkExtendOverlay'; overlay.className='dim-edit-overlay'; overlay.hidden=true;
    overlay.innerHTML=`<form class="dim-edit-card"><div class="dim-edit-title" id="bulkExtendTitle">Çoklu Profil Uzat / Kısalt</div><div id="bulkExtendRows" class="bulk-selection-list"></div><label class="dim-edit-label"><span id="bulkExtendLabel">Alt uç / duvar yönü ofseti *(mm)</span><input id="bulkExtendInput" type="text" inputmode="decimal"></label><div id="bulkExtendError" class="dim-edit-error"></div><div class="dim-edit-actions"><button id="bulkExtendCancel" type="button" class="dim-edit-cancel">İptal</button><button type="submit" class="dim-edit-apply">Tamam</button></div></form>`;
    previewPanel.appendChild(overlay); const input=overlay.querySelector('#bulkExtendInput');
    input.addEventListener('input',()=>{input.value=normalizeSignedMillimeterInput(input.value);overlay.querySelector('#bulkExtendError').textContent='';});
    overlay.querySelector('#bulkExtendCancel').addEventListener('click',()=>overlay.hidden=true);
    overlay.querySelector('form').addEventListener('submit',evt=>{evt.preventDefault();const value=Number(input.value);if(!Number.isFinite(value)){overlay.querySelector('#bulkExtendError').textContent='Geçerli işaretli değer gir.';return;}beginHistoryTransaction();try{(overlay._items||[]).forEach(meta=>{if(meta.interactionType==='glassTrackEditor'&&meta.profilePart==='track')setGlassTrackLengthOffsetForKey(meta.sideViewKey,value);else if(meta.interactionType==='glassTrackEditor'&&meta.sidePostId){const posts=materializeSidePosts({index:meta.sideIndex,sideViewKey:meta.sideViewKey});const target=posts.find(p=>String(p.id)===String(meta.sidePostId));if(target)target.extension=Math.round(value);storeSidePosts({index:meta.sideIndex,sideViewKey:meta.sideViewKey},posts);}else if(['postEditor','frontPostProfileEditor'].includes(meta.interactionType)){while(frontPostExtensions.length<=meta.postIndex)frontPostExtensions.push(0);frontPostExtensions[meta.postIndex]=Math.max(0,Math.round(value));}});overlay.hidden=true;updatePreview(false);}finally{endHistoryTransaction(true);}});
    return overlay;
  }

  function showBulkExtendOverlay(items){const o=ensureBulkExtendOverlay();o._items=items;o.querySelector('#bulkExtendRows').innerHTML=items.map((m,i)=>`<div><b>${i+1}.</b> ${escapeHtml(m.interactionType==='glassTrackEditor'?(m.profilePart==='track'?'Cam kaydı':'Destek dikmesi'):'Ön dikme')}</div>`).join('');o.querySelector('#bulkExtendInput').value='';o.hidden=false;}

  function bindStrictInputs() {
    const numericOnly = id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('input', () => {
        const clean = String(el.value || '').replace(/[^0-9]/g, '');
        if (el.value !== clean) el.value = clean;
      });
    };
    const tokenLimited = (id, limitKey, allowNo = false, allowColon = false) => {
      const el = $(id);
      if (!el) return;
      const apply = () => {
        const limits = applicationLimits();
        const policy = window.PulumurInputLimitPolicy;
        const maxDigits = Math.max(1, Number(limits[limitKey]) || 1);
        const clean = policy && typeof policy.filterTokenInput === 'function'
          ? policy.filterTokenInput(el.value, { maxDigits, allowNo, allowColon })
          : filterSemiNumeric(el.value, allowNo, allowColon);
        if (el.value !== clean) el.value = clean;
        el.dataset.maxTokenDigits = String(maxDigits);
      };
      el.addEventListener('input', apply);
      apply();
    };
    numericOnly('parapetHeight');
    numericOnly('parapetQuickInput');
    tokenLimited('width', 'maxWidthDigits', true, true);
    tokenLimited('opening', 'maxOpeningDigits', true, true);
    tokenLimited('rearHeight', 'maxHeightDigits', false, true);
    tokenLimited('frontHeight', 'maxHeightDigits', false, true);
    tokenLimited('rayCount', 'maxRayCountDigits', false, true);
    tokenLimited('postCount', 'maxPostCountDigits', false, true);
  }

  function showToolboxPlaceholder(command) {
    const isEn = currentLanguage === 'en';
    const message = command === 'product'
      ? (isEn ? 'Multiple product placement will be activated in the next toolbox revision.' : 'Çoklu ürün ekleme komutu sonraki toolbox revizyonunda aktif edilecek.')
      : (isEn ? 'Multiple dimension editing will be activated in the next toolbox revision.' : 'Çoklu ölçü düzenleme komutu sonraki toolbox revizyonunda aktif edilecek.');
    statusText.textContent = message;
    window.alert(message);
  }

  function commandNames() {
    const catalog = window.PulumurProjectCommands && window.PulumurProjectCommands.COMMANDS;
    return catalog || {
      EXPORT_DXF: 'export:dxf', EXPORT_PDF: 'export:pdf', PREVIEW_UPDATE: 'preview:update',
      PROJECT_RESET: 'project:reset', PROJECT_FILE_EXPORT: 'project:export', PRODUCT_DELETE_ALL: 'product:delete-all'
    };
  }

  function setupProjectCommands() {
    const commands = window.PulumurProjectCommandService;
    if (!commands) return;
    const names = commandNames();
    commands.register(names.EXPORT_DXF, generateDxf);
    commands.register(names.EXPORT_PDF, generatePdf);
    commands.register(names.PREVIEW_UPDATE, updatePreview);
    commands.register(names.PROJECT_RESET, resetForm);
    commands.register(names.PROJECT_FILE_EXPORT, exportProjectSnapshot);
    commands.register(names.PRODUCT_DELETE_ALL, deleteAllProducts);
  }

  function bindEvents() {
    const commands = window.PulumurProjectCommandService;
    const names = commandNames();
    const executeUiCommand = (name, payload, source) => commands.execute(name, payload, { source });
    $('generateBtn').addEventListener('click', () => executeUiCommand(names.EXPORT_DXF, undefined, 'ui:generate-dxf'));
    $('pdfBtn').addEventListener('click', () => { void executeUiCommand(names.EXPORT_PDF, undefined, 'ui:generate-pdf'); });
    $('previewBtn').addEventListener('click', () => executeUiCommand(names.PREVIEW_UPDATE, undefined, 'ui:preview-update'));
    $('resetBtn').addEventListener('click', () => executeUiCommand(names.PROJECT_RESET, undefined, 'ui:project-reset'));
    if ($('systemResetBtn')) $('systemResetBtn').addEventListener('click', resetSystemFields);
    if ($('optionsResetBtn')) $('optionsResetBtn').addEventListener('click', resetOptionsFields);
    if ($('extraOptionsResetBtn')) $('extraOptionsResetBtn').addEventListener('click', resetExtraOptionsFields);
    $('expandPreviewBtn').addEventListener('click', () => { void togglePreviewFullscreen(); });
    if ($('undoPreviewBtn')) $('undoPreviewBtn').addEventListener('click', undoProjectHistory);
    if ($('redoPreviewBtn')) $('redoPreviewBtn').addEventListener('click', redoProjectHistory);
    $('calcBtn').addEventListener('click', openCalculator);
    if ($('projectExportBtn')) $('projectExportBtn').addEventListener('click', () => executeUiCommand(names.PROJECT_FILE_EXPORT, undefined, 'ui:project-file-export'));
    if ($('previewProjectExportBtn')) $('previewProjectExportBtn').addEventListener('click', () => executeUiCommand(names.PROJECT_FILE_EXPORT, undefined, 'ui:preview-project-file-export'));
    if ($('checkDrawingBtn')) $('checkDrawingBtn').addEventListener('click', checkDrawingForProduction);
    if ($('headerCheckDrawingBtn')) $('headerCheckDrawingBtn').addEventListener('click', checkDrawingForProduction);
    if ($('multiProductBtn')) $('multiProductBtn').addEventListener('click', () => startToolboxSelection('multi-product'));
    if ($('multiDimensionBtn')) $('multiDimensionBtn').addEventListener('click', () => startToolboxSelection('multi-dimension'));
    if ($('restoreHiddenDimensionsBtn')) $('restoreHiddenDimensionsBtn').addEventListener('click', restoreAllHiddenDimensions);
    if ($('equalizeGapsBtn')) $('equalizeGapsBtn').addEventListener('click', () => startToolboxSelection('equalize-gaps'));
    if ($('convertProductBtn')) $('convertProductBtn').addEventListener('click', () => startToolboxSelection('convert-product'));
    if ($('fitProductsBtn')) $('fitProductsBtn').addEventListener('click', () => startToolboxSelection('fit-products'));
    if ($('detailCopyBtn')) $('detailCopyBtn').addEventListener('click', showDetailCopyOverlay);
    if ($('multiDeleteBtn')) $('multiDeleteBtn').addEventListener('click', () => startToolboxSelection('multi-delete'));
    if ($('deleteAllProductsBtn')) $('deleteAllProductsBtn').addEventListener('click', () => executeUiCommand(names.PRODUCT_DELETE_ALL, undefined, 'ui:delete-all-products'));
    if ($('postSettingsBtn')) $('postSettingsBtn').addEventListener('click', openPostSettingsFromToolbox);
    if ($('bulkExtendBtn')) $('bulkExtendBtn').addEventListener('click', () => startToolboxSelection('bulk-extend'));
    ['glassTrack','triangleJoinery'].forEach(field=>{const btn=$(`${field}SideMenuBtn`);if(btn)btn.addEventListener('click',evt=>{evt.stopPropagation();toggleSideFeatureMenu(field);});const menu=$(`${field}SideMenu`);if(menu){menu.addEventListener('click',evt=>evt.stopPropagation());menu.querySelectorAll('[data-side-feature-field]').forEach(input=>input.addEventListener('change',()=>applySideFeatureCheckbox(input)));}});
    if ($('waterOutletPlacementMenuBtn')) $('waterOutletPlacementMenuBtn').addEventListener('click', evt => { evt.stopPropagation(); toggleWaterOutletPlacementMenu(); });
    if ($('waterOutletPlacementMenu')) {
      $('waterOutletPlacementMenu').addEventListener('click', evt => evt.stopPropagation());
      $('waterOutletPlacementMenu').querySelectorAll('[data-water-outlet-placement]').forEach(input => input.addEventListener('change', () => applyWaterOutletPlacementQuick(input)));
    }
    document.addEventListener('click',()=>document.querySelectorAll('.side-feature-menu').forEach(menu=>{menu.hidden=true;}));
    document.querySelectorAll('[data-boolean-field]').forEach(btn => btn.addEventListener('click', () => toggleToolboxBoolean(btn.dataset.booleanField)));
    if($('parapetQuickInput')){ $('parapetQuickInput').addEventListener('change',applyParapetQuickValue); $('parapetQuickInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyParapetQuickValue();}}); }
    if($('parapetHeight')) $('parapetHeight').addEventListener('input',syncParapetQuickInput);
    $('projectImportBtn').addEventListener('click', openProjectSnapshotPicker);
    $('projectImportInput').addEventListener('change', async evt => {
      try {
        await importProjectSnapshotFile(evt.target.files && evt.target.files[0]);
      } catch (err) {
        statusText.textContent = err.message;
        window.alert(err.message);
        console.error(err);
      } finally {
        evt.target.value = '';
      }
    });
    $('helpBtn').addEventListener('click', showHelp);
    $('languageSelect').addEventListener('change', evt => {
      translateUI(evt.target.value);
      dispatchProjectAction(window.PulumurProjectActions.TYPES.SET_LANGUAGE, evt.target.value, { source: 'form-language' });
      schedulePreviewUpdate(0);
    });
    $('motor').addEventListener('input', () => { updateRemoteOptions(true); });
    $('motor').addEventListener('change', () => { updateRemoteOptions(true); schedulePreviewUpdate(0); });
    $('calcComputeBtn').addEventListener('click', () => {
      try { calculateMissing(); } catch (err) { $('calcResult').textContent = err.message; }
    });
    $('calcTransferBtn').addEventListener('click', () => {
      try { transferCalc(); } catch (err) { $('calcResult').textContent = err.message; }
    });
    $('calcClearBtn').addEventListener('click', clearCalc);
    if ($('glassRayBoundaryQuickBtn')) $('glassRayBoundaryQuickBtn').addEventListener('click', () => {
      if ($('glassRayBoundaryQuickBtn').disabled) return;
      const current = normalizeGlassRayBoundaryMode($('glassRayBoundaryMode') && $('glassRayBoundaryMode').value);
      setGlassRayBoundaryMode(current === 'DARALT' ? 'DEGISTIRME' : 'DARALT');
    });
    ids.forEach(id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('change', () => {
        if (suppressFormPreviewUpdate) return;
        if (BOOLEAN_FIELD_IDS.includes(id)) {
          if (!syncingSideFeatureForm && (id === 'glassTrack' || id === 'triangleJoinery')) setMainSideFeatureValue(id, normalizeYesNo(el.value) === 'EVET');
          if (id === 'glassTrack') syncGlassRayBoundaryControl();
          if (id === 'waterStandard') syncWaterOutletPlacementControl();
          syncToolboxBooleanButtons();
        }
        if (id === 'waterOutletPlacement') syncWaterOutletPlacementControl();
        dispatchProjectAction(window.PulumurProjectActions.TYPES.SET_FORM_FIELD, { field: id, value: el.value }, { source: 'form-change', allowInvalid: true });
        schedulePreviewUpdate(0);
      });
      el.addEventListener('input', () => {
        if (suppressFormPreviewUpdate) return;
        if (wrappingFields) return;
        if (PROJECT_TEXT_FIELD_IDS.has(id)) {
          const selectionStart = typeof el.selectionStart === 'number' ? el.selectionStart : null;
          const originalValue = String(el.value);
          const normalized = normalizeProjectFieldValue(id, originalValue, true);
          if (originalValue !== normalized) {
            const caret = selectionStart === null ? null : normalizeProjectFieldValue(id, originalValue.slice(0, selectionStart), true).length;
            el.value = normalized;
            if (caret !== null && typeof el.setSelectionRange === 'function') {
              try { el.setSelectionRange(Math.min(caret, normalized.length), Math.min(caret, normalized.length)); } catch (_) {}
            }
          }
        }
        autosizeTextarea(el);
        if (id === 'rayCount' || id === 'postCount') {
          // V13.33: Kullanıcının silme işlemi de manuel sahipliktir. Boş bırakılan
          // satır, sonraki otomatik hesap turunda kendiliğinden doldurulmaz.
          el.dataset.userEdited = 'true';
          if (id === 'rayCount' && $('postCount') && $('postCount').dataset.userEdited !== 'true') {
            const raw = collectForm();
            const br = window.PulumurExcelBridge;
            if (br && br.postCountFromRayText) $('postCount').value = br.postCountFromRayText(el.value, raw.systemCount, raw.width, raw.frontHeight);
          }
        }
        if (id === 'systemCount') syncSystemCountValidationState();
        if (['systemCount', 'width', 'frontHeight', 'glassTrack', 'glassRayBoundaryMode'].includes(id)) {
          applyAutoRayPost(false);
        }
        dispatchProjectAction(window.PulumurProjectActions.TYPES.SET_FORM_FIELD, { field: id, value: el.value }, { source: 'form-input', allowInvalid: true });
        schedulePreviewUpdate(350);
      });
    });
  }

  window.PulumurPreviewShell = Object.freeze({
    fit: () => fitPreview(),
    setZoom: (value, keepCenter) => {
      const next = Math.max(0.25, Math.min(4, Number(value) || 1));
      const old = previewState.zoom || 1;
      const centerX = preview.scrollLeft + preview.clientWidth / 2;
      const centerY = preview.scrollTop + preview.clientHeight / 2;
      previewState.zoom = next;
      applyPreviewScale();
      if (keepCenter && old > 0) {
        preview.scrollLeft = Math.max(0, centerX * next / old - preview.clientWidth / 2);
        preview.scrollTop = Math.max(0, centerY * next / old - preview.clientHeight / 2);
      }
      return previewState.zoom;
    },
    getZoom: () => previewState.zoom,
    getPreview: () => preview,
    refresh: (reset) => updatePreview(Boolean(reset))
  });

  document.addEventListener('fullscreenchange', handlePreviewFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handlePreviewFullscreenChange);
  syncPreviewMode();
  bindPreviewInteractions();
  bindPreviewResizeHandling();
  bindPreviewKeyboardGuard();
  bindBulkProfileKeyboardInteractions();
  bindHistoryKeyboardShortcuts();
  bindPreviewFilterControls();
  enhanceExcelCombos();
  bindStrictInputs();
  renderQuickTests();
  fillInitial();
  setProjectWorkspaceActive(false);
  setupProjectCommands();
  bindEvents();
  setupPwaInstall();
  const savedLang = (() => { try { return localStorage.getItem('pulumur_lang') || 'tr'; } catch (e) { return 'tr'; } })();
  if ($('languageSelect')) $('languageSelect').value = savedLang === 'en' ? 'en' : 'tr';
  translateUI(savedLang);
  updatePreview();
  syncExpandButton();
})();
