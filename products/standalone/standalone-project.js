(function (root) {
  'use strict';

  const FORMAT = 'PLMR_STANDALONE_MULTI_PROJECT';
  const SCHEMA = 'plmr-standalone-products-v2';
  const PRODUCT_IDS = Object.freeze((root.PulumurProductRegistry ? root.PulumurProductRegistry.listProducts({ capability: 'standaloneDrawing' }).filter(item => item.id !== 'PERGO_RISE').map(item => item.id) : ['SLIDING', 'GUILLOTINE', 'ZIP_SCREEN']));
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const uid = () => `pos-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const pad = value => String(value).padStart(2, '0');

  const OPTION_DEFINITIONS = Object.freeze({
    SLIDING: Object.freeze([
      { key: 'series', label: 'Seri', type: 'select', values: ['A SERIES', 'K SERIES'] },
      { key: 'type', label: 'Alt ray / kasa', type: 'select', values: ['WITH THRESHOLD', 'WITHOUT THRESHOLD'] },
      { key: 'openingType', label: 'Açılım', type: 'select', values: ['SIDE OPENING', 'CENTER OPENING'] },
      { key: 'slidingView', label: 'Bakış', type: 'select', values: ['OUTSIDE VIEW', 'INSIDE VIEW'] },
      { key: 'openingDirection', label: 'Açılma yönü', type: 'select', values: ['LEFT', 'RIGHT', 'INSIDE', 'OUTSIDE'] },
      { key: 'collectionState', label: 'Gösterim', type: 'select', values: ['NORMAL', 'COLLECTED'] },
      { key: 'glassThickness', label: 'Cam kalınlığı', type: 'select', values: ['8 MM', '10 MM', 'INSULATED GLASS'] },
      { key: 'glassColor', label: 'Cam rengi', type: 'select-custom', values: ['TRANSPARENT', 'GREY', 'BRONZE', 'LOW-E GLASS', 'OTHER'] },
      { key: 'panelCountMode', label: 'Panel hesabı', type: 'select', values: ['AUTO', 'MANUAL'] },
      { key: 'panelCount', label: 'Panel sayısı', type: 'number', min: 2, max: 100 }
    ]),
    GUILLOTINE: Object.freeze([
      { key: 'series', label: 'Seri', type: 'select', values: ['A SERIES', 'K SERIES'] },
      { key: 'type', label: 'Tip', type: 'select', values: ['STANDARD', 'CLEANABLE', 'UPWARD COLLECTING', 'DOWNWARD COLLECTING'] },
      { key: 'mechanism', label: 'Mekanizma', type: 'select', values: ['CHAIN', 'BELT'] },
      { key: 'glassThickness', label: 'Cam kalınlığı', type: 'select', values: ['8 MM', 'INSULATED GLASS'] },
      { key: 'glassColor', label: 'Cam rengi', type: 'select-custom', values: ['TRANSPARENT', 'GREY', 'BRONZE', 'LOW-E GLASS', 'OTHER'] },
      { key: 'panelCount', label: 'Panel düzeni', type: 'select', values: ['1+1', '1+2'] },
      { key: 'motorDirection', label: 'Motor yönü', type: 'select', values: ['RIGHT', 'LEFT'] },
      { key: 'view', label: 'Görünüş', type: 'select', values: ['INSIDE VIEW', 'OUTSIDE VIEW'] },
      { key: 'motorType', label: 'Motor', type: 'select', values: ['SOMFY RTS', 'SOMFY IO', 'RISING'] },
      { key: 'remoteControl', label: 'Kumanda', type: 'select', values: ['1 CHANNEL', '2 CHANNELS', '4 CHANNELS', '6 CHANNELS', '16 CHANNELS', '40 CHANNELS'] },
      { key: 'bottomPanelState', label: 'Alt panel', type: 'select', values: ['OPEN', 'CLOSED'] },
      { key: 'collectionState', label: 'Gösterim', type: 'select', values: ['NORMAL', 'COLLECTED'] }
    ]),
    ZIP_SCREEN: Object.freeze([
      { key: 'series', label: 'Seri', type: 'select', values: ['G SERIES', 'P SERIES'] },
      { key: 'type', label: 'Kutu tipi', type: 'select', values: ['100X100 BOX', '110X110 BOX', 'HERCULE', '115X115 BOX', '130X130 BOX'] },
      { key: 'mountingLocation', label: 'Montaj', type: 'select', values: ['BETWEEN POSTS', 'OUTSIDE POSTS'] },
      { key: 'fabricColor', label: 'Kumaş kodu', type: 'select-custom', values: ['7635-52101', '7635-52102', '7635-52103', '7635-52105', '7635-52106', '7635-52107', '7635-52173', '7635-52174', '7635-52176', '7635-52142', '7635-52144', '92-2044', '92-2135', '92-2171', '92-2043', '92-2047', '86-2044', '86-2135', '86-2171', '86-2043', '86-2047', 'W88-8102', 'W88-2047', 'OTHER'] },
      { key: 'motorDirection', label: 'Motor yönü', type: 'select', values: ['RIGHT', 'LEFT'] },
      { key: 'cableExitDirection', label: 'Kablo çıkışı', type: 'select', values: ['REAR', 'TOP', 'SIDE'] },
      { key: 'sizeMode', label: 'Ölçü modu', type: 'select', values: ['AUTO', 'MANUAL'] },
      { key: 'collectionState', label: 'Gösterim', type: 'select', values: ['NORMAL', 'COLLECTED'] }
    ]),
    DOOR: Object.freeze([
      { key: 'doorType', label: 'Kapı tipi', type: 'select', values: ['SINGLE','LEFT_FIXED_RIGHT_MOVING','RIGHT_FIXED_LEFT_MOVING','TOP_FIXED','LEFT_FIXED_TOP','RIGHT_FIXED_TOP','BOTH_FIXED_TOP','DOUBLE','DOUBLE_TOP','DOUBLE_LEFT_FIXED','DOUBLE_LEFT_FIXED_TOP','DOUBLE_RIGHT_FIXED_TOP','DOUBLE_BOTH_FIXED_TOP'] },
      { key: 'hingeDirection', label: 'Menteşe', type: 'select', values: ['LEFT','RIGHT'] },
      { key: 'activeLeaf', label: 'Aktif kanat', type: 'select', values: ['LEFT','RIGHT'] },
      { key: 'doorOpenDirection', label: 'Açılma yönü', type: 'select', values: ['INWARD','OUTWARD'] },
      { key: 'handleType', label: 'Kol', type: 'select', values: ['NORMAL','PANIC'] },
      { key: 'movingLeafHeight', label: 'Kanat yüksekliği', type: 'number', min: 1200, max: 4000 },
      { key: 'topFixedHeight', label: 'Üst sabit', type: 'number', min: 110, max: 2000 },
      { key: 'glassThickness', label: 'Cam kalınlığı', type: 'select', values: ['8 MM','INSULATED GLASS'] },
      { key: 'glassColor', label: 'Cam rengi', type: 'select-custom', values: ['TRANSPARENT','GREY','BRONZE','LOW-E GLASS','OTHER'] }
    ]),
    FIXED_JOINERY: Object.freeze([
      { key: 'glassThickness', label: 'Cam kalınlığı', type: 'select', values: ['8 MM','INSULATED GLASS'] },
      { key: 'glassColor', label: 'Cam rengi', type: 'select-custom', values: ['TRANSPARENT','GREY','BRONZE','LOW-E GLASS','OTHER'] },
      { key: 'verticalDivisions', label: 'Dikey bölücü', type: 'number', min: 0, max: 20 },
      { key: 'horizontalDivisions', label: 'Yatay göz sayısı', type: 'number', min: 1, max: 10 },
      { key: 'horizontalHeights', label: 'Yatay yükseklikler', type: 'text' }
    ]),
    FOLDING_GLASS: Object.freeze([
      { key: 'series', label: 'Seri', type: 'select', values: ['A SERIES','K SERIES'] },
      { key: 'subtype', label: 'Tip', type: 'select', values: ['STANDARD','TOP-HUNG'] },
      { key: 'openingDirection', label: 'Katlanma yönü', type: 'select', values: ['LEFT','RIGHT','BOTH'] },
      { key: 'foldingView', label: 'Bakış', type: 'select', values: ['INSIDE VIEW','OUTSIDE VIEW'] },
      { key: 'foldingOpenDirection', label: 'Açılma', type: 'select', values: ['INWARD','OUTWARD'] },
      { key: 'glassThickness', label: 'Cam kalınlığı', type: 'select', values: ['8 MM','10 MM','12 MM','INSULATED GLASS'] },
      { key: 'glassColor', label: 'Cam rengi', type: 'select-custom', values: ['TRANSPARENT','GREY','BRONZE','LOW-E GLASS','OTHER'] },
      { key: 'panels', label: 'Panel sayısı', type: 'number', min: 2, max: 24 },
      { key: 'collectionState', label: 'Gösterim', type: 'select', values: ['NORMAL','COLLECTED'] }
    ])
  });

  function canonicalProduct(productType) {
    const registry = root.PulumurProductRegistry;
    const resolved = registry && registry.migrateProductType(productType || 'SLIDING', 'SLIDING');
    return PRODUCT_IDS.includes(resolved) ? resolved : 'SLIDING';
  }

  function optionDefinitions(productType) {
    return OPTION_DEFINITIONS[canonicalProduct(productType)] || [];
  }

  function nextPositionNo(positions, prefix) {
    const used = new Set((positions || []).map(item => String(item.positionNo || '').trim().toUpperCase()).filter(Boolean));
    const base = String(prefix || 'P').trim().toUpperCase() || 'P';
    let index = 1;
    while (used.has(`${base}${pad(index)}`)) index += 1;
    return `${base}${pad(index)}`;
  }

  function nextFromSeed(seed, used) {
    const value = String(seed || 'P01').trim().toUpperCase();
    const match = value.match(/^(.*?)(\d+)$/);
    const prefix = match ? match[1] : value;
    const width = match ? match[2].length : 2;
    let index = match ? Number(match[2]) : 1;
    const occupied = used instanceof Set ? used : new Set();
    let candidate = `${prefix}${String(index).padStart(width, '0')}`;
    while (occupied.has(candidate)) {
      index += 1;
      candidate = `${prefix}${String(index).padStart(width, '0')}`;
    }
    return candidate;
  }

  function defaultOptions(productType) {
    const type = canonicalProduct(productType);
    const adapter = root.PulumurProductRegistry && root.PulumurProductRegistry.requireProduct(type);
    if (!adapter) throw new Error(`Ürün adapterı bulunamadı: ${type}`);
    const project = adapter.createDefaultProject();
    ['productType', 'schemaVersion', 'projectName', 'width', 'height', 'id', 'pozNo', 'quantity', 'description'].forEach(key => delete project[key]);
    return project;
  }

  function slidingPanelCount(width, openingType) {
    let count = Math.max(2, Math.ceil(Math.max(1, Number(width) || 1) / 1200));
    if (openingType === 'CENTER OPENING') {
      count = Math.max(4, count);
      if (count % 2) count += 1;
    }
    return count;
  }

  function normalizeOptions(productType, source, context) {
    const type = canonicalProduct(productType);
    const input = { ...defaultOptions(type), ...clone(source || {}) };
    const changes = [];
    const set = (key, value, reason) => {
      if (input[key] !== value) {
        changes.push({ key, from: input[key], to: value, reason });
        input[key] = value;
      }
    };

    if (type === 'SLIDING') {
      if (input.series === 'K SERIES' && input.glassThickness === '10 MM') set('glassThickness', '8 MM', 'K SERIES 10 MM camla uyumlu değil.');
      if (input.glassColor === 'LOW-E GLASS' && input.glassThickness !== 'INSULATED GLASS') set('glassColor', 'TRANSPARENT', 'LOW-E GLASS yalnız ısıcamla kullanılabilir.');
      input.slidingView = input.slidingView === 'INSIDE VIEW' ? 'INSIDE VIEW' : 'OUTSIDE VIEW';
      if (input.openingType === 'CENTER OPENING') input.openingDirection = input.openingDirection === 'INSIDE' ? 'INSIDE' : 'OUTSIDE';
      else input.openingDirection = input.openingDirection === 'LEFT' ? 'LEFT' : 'RIGHT';
      input.collectionState = input.collectionState === 'COLLECTED' ? 'COLLECTED' : 'NORMAL';
      if (input.panelCountMode === 'AUTO' && context && Number(context.width) > 0) set('panelCount', slidingPanelCount(context.width, input.openingType), 'Panel sayısı otomatik hesaplandı.');
      else input.panelCount = Math.max(2, Math.trunc(Number(input.panelCount) || 2));
    } else if (type === 'GUILLOTINE') {
      if (input.series === 'K SERIES' && input.glassThickness === '8 MM') set('glassThickness', 'INSULATED GLASS', 'K SERIES 8 MM camla uyumlu değil.');
      if (input.series === 'K SERIES' && ['UPWARD COLLECTING','DOWNWARD COLLECTING'].includes(input.type)) set('type', 'CLEANABLE', 'K SERIES toplanır tip ile uyumlu değil.');
      if (input.series === 'K SERIES' && input.mechanism === 'CHAIN') set('mechanism', 'BELT', 'K SERIES zincir mekanizma ile uyumlu değil.');
      if (input.glassColor === 'LOW-E GLASS' && input.glassThickness !== 'INSULATED GLASS') set('glassColor', 'TRANSPARENT', 'LOW-E GLASS yalnız ısıcamla kullanılabilir.');
      input.bottomPanelState = input.bottomPanelState === 'CLOSED' ? 'CLOSED' : 'OPEN';
      input.collectionState = ['UPWARD COLLECTING','DOWNWARD COLLECTING'].includes(input.type) && input.collectionState === 'COLLECTED' ? 'COLLECTED' : 'NORMAL';
    } else if (type === 'ZIP_SCREEN') {
      const allowedTypes = input.series === 'P SERIES' ? ['115X115 BOX', '130X130 BOX'] : ['100X100 BOX', '110X110 BOX', 'HERCULE'];
      if (!allowedTypes.includes(input.type)) set('type', allowedTypes[0], `${input.series} için kutu tipi düzeltildi.`);
      input.panelCount = 1;
      input.collectionState = input.collectionState === 'COLLECTED' ? 'COLLECTED' : 'NORMAL';
    } else if (type === 'DOOR') {
      const doorTypes = ['SINGLE','LEFT_FIXED_RIGHT_MOVING','RIGHT_FIXED_LEFT_MOVING','TOP_FIXED','LEFT_FIXED_TOP','RIGHT_FIXED_TOP','BOTH_FIXED_TOP','DOUBLE','DOUBLE_TOP','DOUBLE_LEFT_FIXED','DOUBLE_LEFT_FIXED_TOP','DOUBLE_RIGHT_FIXED_TOP','DOUBLE_BOTH_FIXED_TOP'];
      if (!doorTypes.includes(input.doorType)) set('doorType','SINGLE','Kapı tipi düzeltildi.');
      input.hingeDirection = input.hingeDirection === 'RIGHT' ? 'RIGHT' : 'LEFT';
      input.activeLeaf = input.activeLeaf === 'LEFT' ? 'LEFT' : 'RIGHT';
      input.doorOpenDirection = input.doorOpenDirection === 'INWARD' ? 'INWARD' : 'OUTWARD';
      input.handleType = input.handleType === 'PANIC' ? 'PANIC' : 'NORMAL';
      input.movingLeafHeight = Math.max(1200, Math.round(Number(input.movingLeafHeight) || 2200));
      input.topFixedHeight = Math.max(110, Math.round(Number(input.topFixedHeight) || 500));
    } else if (type === 'FIXED_JOINERY') {
      input.verticalDivisions = Math.max(0, Math.min(20, Math.round(Number(input.verticalDivisions) || 0)));
      input.horizontalDivisions = Math.max(1, Math.min(10, Math.round(Number(input.horizontalDivisions) || 1)));
      input.horizontalHeights = String(input.horizontalHeights || '');
    } else if (type === 'FOLDING_GLASS') {
      input.series = input.series === 'K SERIES' ? 'K SERIES' : 'A SERIES';
      input.subtype = input.series === 'A SERIES' && input.subtype === 'TOP-HUNG' ? 'TOP-HUNG' : 'STANDARD';
      if (input.series === 'K SERIES' && input.glassThickness !== 'INSULATED GLASS') set('glassThickness', 'INSULATED GLASS', 'K SERIES yalnız yalıtımlı cam ile kullanılır.');
      if (input.series === 'A SERIES' && !['8 MM','10 MM','12 MM','INSULATED GLASS'].includes(input.glassThickness)) set('glassThickness', '8 MM', 'A SERIES cam kalınlığı düzeltildi.');
      input.panels = Math.max(2, Math.min(24, Math.round(Number(input.panels) || 4)));
      input.openingDirection = input.panels > 8 ? 'BOTH' : (['LEFT','RIGHT','BOTH'].includes(input.openingDirection) ? input.openingDirection : 'RIGHT');
      input.foldingView = input.foldingView === 'OUTSIDE VIEW' ? 'OUTSIDE VIEW' : 'INSIDE VIEW';
      input.foldingOpenDirection = input.foldingOpenDirection === 'OUTWARD' ? 'OUTWARD' : 'INWARD';
      input.collectionState = input.collectionState === 'COLLECTED' ? 'COLLECTED' : 'NORMAL';
      input.thresholdProfile = 70;
    }
    return { options: input, changes };
  }

  function compactOptions(productType, options, commonDefaults, context) {
    const type = canonicalProduct(productType);
    const common = normalizeOptions(type, { ...defaultOptions(type), ...(commonDefaults || {}) }, context).options;
    const resolved = normalizeOptions(type, { ...common, ...(options || {}) }, context).options;
    const compact = {};
    optionDefinitions(type).forEach(field => {
      if (resolved[field.key] !== common[field.key]) compact[field.key] = clone(resolved[field.key]);
    });
    return compact;
  }

  function createPosition(productType, overrides, positions, commonDefaults) {
    const type = canonicalProduct(productType);
    const adapter = root.PulumurProductRegistry.requireProduct(type);
    const base = adapter.createDefaultProject();
    const source = overrides || {};
    const width = Number(source.width) || base.width;
    const height = Number(source.height) || base.height;
    return {
      id: source.id || uid(),
      positionNo: String(source.positionNo || nextPositionNo(positions || [], 'P')).trim(),
      order: Number.isFinite(Number(source.order)) ? Number(source.order) : (positions || []).length + 1,
      productType: type,
      quantity: Math.max(1, Math.trunc(Number(source.quantity) || 1)),
      width,
      height,
      description: String(source.description || ''),
      hidden: Boolean(source.hidden),
      options: compactOptions(type, source.options || {}, commonDefaults || {}, { width, height })
    };
  }

  function createDefaultMap(source) {
    const incoming = source || {};
    const map = {};
    PRODUCT_IDS.forEach(type => {
      map[type] = normalizeOptions(type, { ...defaultOptions(type), ...(incoming[type] || {}) }, {}).options;
    });
    return map;
  }

  function createProject(overrides) {
    const source = overrides || {};
    const incoming = Array.isArray(source.positions) ? source.positions : [];
    const initialProductType = canonicalProduct((source.commonSettings && source.commonSettings.defaultProductType) || source.productType || (incoming[0] && incoming[0].productType) || 'SLIDING');
    const legacyDefaults = source.commonSettings && source.commonSettings.defaultsByProduct;
    const defaultsByProduct = createDefaultMap(legacyDefaults);
    const project = {
      format: FORMAT,
      schema: SCHEMA,
      schemaVersion: 2,
      projectInfo: {
        customerName: '', projectName: 'Bağımsız Ürün Projesi', projectCode: '', revision: 'R00', designer: '', date: '',
        ...(source.projectInfo || {})
      },
      commonSettings: {
        color: 'NATURAL', glassType: 'CLEAR', generalDescription: '', outputScale: 'AUTO', expandQuantity: false, defaultProductType: initialProductType,
        ...(source.commonSettings || {}), defaultsByProduct
      },
      layout: {
        mode: 'AUTO', columnCount: 2, horizontalGap: 800, verticalGap: 800, titleGap: 150, pageMargin: 200,
        ...(source.layout || {})
      },
      positions: [],
      production: source.production ? clone(source.production) : null
    };
    project.commonSettings.defaultProductType = canonicalProduct(project.commonSettings.defaultProductType || initialProductType);
    incoming.forEach((item, index) => {
      const type = canonicalProduct(item.productType);
      project.positions.push(createPosition(type, { ...item, order: index + 1 }, project.positions, project.commonSettings.defaultsByProduct[type]));
    });
    if (!project.positions.length) {
      const type = canonicalProduct(source.productType || project.commonSettings.defaultProductType || 'SLIDING');
      project.positions.push(createPosition(type, {}, project.positions, project.commonSettings.defaultsByProduct[type]));
    }
    if (project.production && root.PulumurProductionPackageModel) root.PulumurProductionPackageModel.markStale(project, api);
    return project;
  }

  function commonDefaults(project, productType) {
    const type = canonicalProduct(productType);
    const map = project && project.commonSettings && project.commonSettings.defaultsByProduct;
    return normalizeOptions(type, { ...defaultOptions(type), ...(map && map[type] || {}) }, {}).options;
  }

  function setCommonDefaults(project, productType, values) {
    const type = canonicalProduct(productType);
    if (!project.commonSettings.defaultsByProduct) project.commonSettings.defaultsByProduct = createDefaultMap();
    const normalized = normalizeOptions(type, { ...commonDefaults(project, type), ...(values || {}) }, {}).options;
    project.commonSettings.defaultsByProduct[type] = normalized;
    project.positions.filter(position => position.productType === type).forEach(position => {
      const resolved = normalizeOptions(type, { ...normalized, ...(position.options || {}) }, { width: position.width, height: position.height }).options;
      position.options = compactOptions(type, resolved, normalized, { width: position.width, height: position.height });
    });
    return normalized;
  }

  function resolveOptions(project, position) {
    const type = canonicalProduct(position.productType);
    return normalizeOptions(type, { ...commonDefaults(project, type), ...(position.options || {}) }, { width: position.width, height: position.height }).options;
  }

  function setPositionOptions(project, position, values) {
    const type = canonicalProduct(position.productType);
    const normalized = normalizeOptions(type, { ...resolveOptions(project, position), ...(values || {}) }, { width: position.width, height: position.height });
    position.options = compactOptions(type, normalized.options, commonDefaults(project, type), { width: position.width, height: position.height });
    return normalized;
  }

  function resolvePosition(project, position) {
    const adapter = root.PulumurProductRegistry.requireProduct(position.productType);
    return adapter.createDefaultProject({
      ...clone(project.commonSettings || {}),
      ...clone(resolveOptions(project, position)),
      id: position.id,
      pozNo: position.positionNo,
      width: position.width,
      height: position.height,
      quantity: position.quantity,
      description: position.description
    });
  }

  function expandedPositions(project) {
    const source = (project.positions || []).filter(item => !item.hidden).sort((a, b) => a.order - b.order);
    if (!project.commonSettings.expandQuantity) return source.map(clone);
    const result = [];
    const used = new Set(source.map(item => String(item.positionNo || '').toUpperCase()));
    source.forEach(position => {
      const total = Math.max(1, Math.trunc(Number(position.quantity) || 1));
      for (let index = 0; index < total; index += 1) {
        const copy = clone(position);
        copy.id = index === 0 ? position.id : `${position.id}-Q${index + 1}`;
        if (index > 0) {
          copy.positionNo = nextPositionNo(Array.from(used).map(positionNo => ({ positionNo })), 'P');
          used.add(copy.positionNo.toUpperCase());
        }
        copy.quantity = 1;
        copy.order = result.length + 1;
        result.push(copy);
      }
    });
    return result;
  }

  function optionErrors(project, position) {
    const errors = [];
    const options = resolveOptions(project, position);
    if (position.productType === 'SLIDING' && options.panelCountMode === 'MANUAL') {
      const count = Number(options.panelCount);
      if (!Number.isInteger(count) || count < 2) errors.push('Panel sayısı en az 2 olmalıdır.');
      if (options.openingType === 'CENTER OPENING' && (count < 4 || count % 2)) errors.push('Merkez açılımda panel sayısı en az 4 ve çift olmalıdır.');
    }
    if (position.productType === 'ZIP_SCREEN') {
      const allowed = options.series === 'P SERIES' ? ['115X115 BOX', '130X130 BOX'] : ['100X100 BOX', '110X110 BOX', 'HERCULE'];
      if (!allowed.includes(options.type)) errors.push(`${options.series} ile ${options.type} kutu tipi uyumsuz.`);
    }
    return errors;
  }

  function validateProject(project) {
    const errors = [];
    if (!project || !Array.isArray(project.positions) || !project.positions.length) errors.push({ code: 'EMPTY', message: 'En az bir poz eklenmelidir.' });
    const seenNo = new Map();
    const seenId = new Set();
    (project && project.positions || []).forEach((position, index) => {
      const label = String(position.positionNo || '').trim();
      const prefix = label || `Satır ${index + 1}`;
      if (!position.id || seenId.has(position.id)) errors.push({ id: position.id, code: 'DUPLICATE_ID', message: `${prefix}: Benzersiz poz kimliği oluşturulamadı.` });
      else seenId.add(position.id);
      if (!label) errors.push({ id: position.id, code: 'POSITION_NO', message: `${prefix}: Poz numarası boş.` });
      else if (seenNo.has(label.toUpperCase())) errors.push({ id: position.id, code: 'DUPLICATE_POSITION_NO', message: `${prefix}: Poz numarası ${seenNo.get(label.toUpperCase())} ile tekrar ediyor.` });
      else seenNo.set(label.toUpperCase(), label);
      if (!PRODUCT_IDS.includes(position.productType)) errors.push({ id: position.id, code: 'PRODUCT', message: `${prefix}: Geçerli ürün seçilmedi.` });
      if (!(Number(position.quantity) > 0 && Number.isInteger(Number(position.quantity)))) errors.push({ id: position.id, code: 'QUANTITY', message: `${prefix}: Adet pozitif tam sayı olmalıdır.` });
      optionErrors(project, position).forEach(message => errors.push({ id: position.id, code: 'OPTION_VALIDATION', message: `${prefix}: ${message}` }));
      try {
        const adapter = root.PulumurProductRegistry.requireProduct(position.productType);
        const result = adapter.validateProject(resolvePosition(project, position));
        result.errors.forEach(message => errors.push({ id: position.id, code: 'PRODUCT_VALIDATION', message: `${prefix}: ${message}` }));
      } catch (error) {
        errors.push({ id: position.id, code: 'GEOMETRY', message: `${prefix}: ${error.message}` });
      }
    });
    return { valid: errors.length === 0, errors };
  }

  function copyPosition(project, id) {
    const source = project.positions.find(item => item.id === id);
    if (!source) return project;
    const index = project.positions.indexOf(source);
    const copied = createPosition(source.productType, { ...clone(source), id: uid(), positionNo: nextPositionNo(project.positions, 'P') }, project.positions, commonDefaults(project, source.productType));
    project.positions.splice(index + 1, 0, copied);
    return normalizeOrder(project);
  }

  function addPositions(project, template, count, startPositionNo) {
    const total = Math.max(1, Math.min(100, Math.trunc(Number(count) || 1)));
    const used = new Set(project.positions.map(item => String(item.positionNo || '').toUpperCase()));
    let seed = String(startPositionNo || nextPositionNo(project.positions, 'P')).toUpperCase();
    for (let index = 0; index < total; index += 1) {
      const positionNo = nextFromSeed(seed, used);
      used.add(positionNo);
      const match = positionNo.match(/^(.*?)(\d+)$/);
      seed = match ? `${match[1]}${String(Number(match[2]) + 1).padStart(match[2].length, '0')}` : nextPositionNo(project.positions, 'P');
      project.positions.push(createPosition(template.productType, { ...clone(template), id: uid(), positionNo }, project.positions, commonDefaults(project, template.productType)));
    }
    return normalizeOrder(project);
  }

  function changeProduct(projectOrPosition, positionOrType, maybeType) {
    const hasProject = projectOrPosition && Array.isArray(projectOrPosition.positions);
    const project = hasProject ? projectOrPosition : null;
    const position = hasProject ? positionOrType : projectOrPosition;
    const productType = hasProject ? maybeType : positionOrType;
    const type = canonicalProduct(productType);
    if (!position || type === position.productType) return [];
    const oldKeys = Object.keys(resolveOptions(project || createProject({ productType: position.productType }), position));
    position.productType = type;
    position.options = {};
    return oldKeys;
  }

  function applyToSelected(project, ids, patch) {
    const selected = new Set(ids || []);
    const reset = [];
    project.positions.forEach(position => {
      if (!selected.has(position.id)) return;
      if (patch.productType) reset.push(...changeProduct(project, position, patch.productType));
      ['width', 'height', 'quantity', 'description'].forEach(key => {
        if (patch[key] !== undefined && patch[key] !== '') position[key] = key === 'description' ? String(patch[key]) : Number(patch[key]);
      });
      if (patch.options && Object.keys(patch.options).length) setPositionOptions(project, position, patch.options);
    });
    return [...new Set(reset)];
  }

  function normalizeOrder(project) {
    project.positions.forEach((position, index) => { position.order = index + 1; });
    return project;
  }

  function move(project, id, delta) {
    const index = project.positions.findIndex(item => item.id === id);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= project.positions.length) return project;
    const [item] = project.positions.splice(index, 1);
    project.positions.splice(target, 0, item);
    return normalizeOrder(project);
  }

  function renumber(project, prefix) {
    project.positions.forEach((position, index) => { position.positionNo = `${String(prefix || 'P').toUpperCase()}${pad(index + 1)}`; });
    return project;
  }

  function hasCustomPositionNumbers(project) {
    return (project.positions || []).some((position, index) => String(position.positionNo || '').toUpperCase() !== `P${pad(index + 1)}`);
  }

  function serialize(project) {
    if (root.PulumurProductionPackageModel) root.PulumurProductionPackageModel.markStale(project, api);
    return JSON.stringify({ format: FORMAT, schema: SCHEMA, schemaVersion: 2, savedAt: new Date().toISOString(), project: createProject(project) }, null, 2);
  }

  function legacyOptions(legacy) {
    const blocked = new Set(['productType', 'schemaVersion', 'projectName', 'width', 'height', 'id', 'pozNo', 'positionNo', 'quantity', 'description']);
    return Object.fromEntries(Object.entries(legacy || {}).filter(([key]) => !blocked.has(key)));
  }

  function migrate(payload) {
    const source = typeof payload === 'string' ? JSON.parse(payload) : clone(payload);
    if (source && source.format === FORMAT) return createProject(source.project || source);
    if (source && source.format === 'PLMR_PRODUCT_PROJECT' && source.project) {
      const legacy = source.project;
      return createProject({
        projectInfo: { projectName: legacy.projectName || 'İçe Aktarılan Proje' },
        positions: [{
          productType: source.productType || legacy.productType,
          positionNo: legacy.pozNo || legacy.positionNo || 'P01',
          width: legacy.width,
          height: legacy.height,
          quantity: legacy.quantity || 1,
          description: legacy.description || '',
          options: legacyOptions(legacy)
        }]
      });
    }
    if (source && Array.isArray(source.positions)) return createProject(source);
    throw new Error('Desteklenmeyen PLMR bağımsız ürün dosyası.');
  }

  const api = {
    FORMAT, SCHEMA, PRODUCT_IDS, OPTION_DEFINITIONS,
    createProject, createPosition, nextPositionNo, nextFromSeed, defaultOptions, optionDefinitions,
    slidingPanelCount, normalizeOptions, compactOptions, commonDefaults, setCommonDefaults, resolveOptions,
    setPositionOptions, resolvePosition, expandedPositions, validateProject, copyPosition, addPositions,
    changeProduct, applyToSelected, normalizeOrder, move, renumber, hasCustomPositionNumbers, serialize, migrate
  };
  root.PulumurStandaloneProject = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
