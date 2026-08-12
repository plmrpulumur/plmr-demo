(function (root) {
  'use strict';
  const roundMm = value => Math.max(0, Math.round(Number(value) || 0));
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const makeId = (positionNo, rule, suffix) => `${positionNo}-${rule}${suffix ? `-${suffix}` : ''}`;

  const RULE_CATALOG = Object.freeze([
    { id: 'AG-SM10-CUT-B15082', code: 'B15082', name: '42×123 Kasa Üst Profili', formula: 'W − 22', quantity: '2 × poz adedi' },
    { id: 'AG-SM10-CUT-B15083', code: 'B15083', name: '11×123 Yan Dikme', formula: 'H', quantity: '2 × poz adedi' },
    { id: 'AG-SM10-CUT-B15085', code: 'B15085', name: '96×26 Kanat Profili', formula: 'Cam genişliği + 3', quantity: '2 × panel × poz adedi' },
    { id: 'AG-SM10-CUT-B15086', code: 'B15086', name: '31×34 Kanat Çektirme', formula: 'H − 58', quantity: '2 × (panel − 1) × poz adedi' },
    { id: 'AG-SM10-CUT-B15087', code: 'B15087', name: '33×19 Yan Birleşim Kilit Karşılık', formula: 'H − 22', quantity: '2 × poz adedi' },
    { id: 'AG-SM10-CUT-B15081', code: 'B15081', name: '33×22 Yatay Ayar Profili', formula: 'H − 22', quantity: 'Seçiliyse 2 × poz adedi' },
    { id: 'AG-SM10-CUT-B15099', code: 'B15099', name: '70×44 Çektirmeli Kilit Ara Dikme', formula: 'H − 58', quantity: '2 × poz adedi' },
    { id: 'AG-SM10-CUT-B15138-H', code: 'B15138', name: '18×24 Adaptör 10 mm · Yatay', formula: 'Cam genişliği + 3', quantity: '2 × panel × poz adedi' },
    { id: 'AG-SM10-CUT-B15138-V', code: 'B15138', name: '18×24 Adaptör 10 mm · Dikey', formula: 'H − 250', quantity: '2 × panel × poz adedi' },
    { id: 'AG-SM10-GLASS', code: 'GLASS-10-TEMPERED', name: '10 mm Temperli Cam', formula: 'Genişlik: ROUND((W−171−0,6×(N−1))/N); Yükseklik: H−220', quantity: 'panel × poz adedi' }
  ]);

  function item(rule, position, length, quantity, productionOptions, note) {
    return {
      itemId: makeId(position.positionNo, rule.id),
      profileCode: rule.code,
      profileName: rule.name,
      positionId: position.id,
      positionNo: position.positionNo,
      cutLength: roundMm(length),
      quantity: Math.max(0, Math.trunc(Number(quantity) || 0)),
      angleLeft: 90,
      angleRight: 90,
      color: productionOptions.ralCode,
      surface: productionOptions.surface,
      unit: 'mm',
      sourceRule: rule.id,
      notes: note || ''
    };
  }

  function generate(project, model, profile, productionOptions) {
    const options = { ...profile.defaults, ...(productionOptions || {}) };
    const errors = [];
    const warnings = [];
    const positions = [];
    const cutItems = [];
    const glassItems = [];
    const sourcePositions = (project.positions || []).filter(position => !position.hidden).sort((a, b) => a.order - b.order);
    if (!sourcePositions.length) errors.push({ code: 'NO_POSITIONS', message: 'Üretim için en az bir poz gereklidir.' });

    sourcePositions.forEach(position => {
      if (position.productType !== 'SLIDING') {
        errors.push({ code: 'UNSUPPORTED_PRODUCT', positionNo: position.positionNo, message: `${position.positionNo}: Albert Genau pilotu yalnız Sürme pozlarını kabul eder.` });
        return;
      }
      const resolved = model.resolveOptions(project, position);
      if (resolved.type !== profile.supported.type) errors.push({ code: 'THRESHOLD_REQUIRED', positionNo: position.positionNo, message: `${position.positionNo}: SLIDEMASTER 10 için eşikli tip gereklidir.` });
      if (resolved.openingType !== profile.supported.openingType) errors.push({ code: 'SIDE_OPENING_REQUIRED', positionNo: position.positionNo, message: `${position.positionNo}: Pilot yalnız SIDE OPENING üretim formunu destekler.` });
      if (resolved.glassThickness !== profile.supported.glassThickness) errors.push({ code: 'GLASS_10_REQUIRED', positionNo: position.positionNo, message: `${position.positionNo}: Cam kalınlığı 10 MM olmalıdır.` });
      const width = roundMm(position.width);
      const height = roundMm(position.height);
      const panelCount = Math.max(2, Math.trunc(Number(resolved.panelCount) || 2));
      const positionQuantity = Math.max(1, Math.trunc(Number(position.quantity) || 1));
      const glassWidth = roundMm((width - 171 - (0.6 * (panelCount - 1))) / panelCount);
      const glassHeight = roundMm(height - 220);
      if (glassWidth <= 0 || glassHeight <= 0) errors.push({ code: 'GLASS_DIMENSION_INVALID', positionNo: position.positionNo, message: `${position.positionNo}: Cam ölçüsü pozitif üretilemedi.` });
      positions.push({
        positionId: position.id,
        positionNo: position.positionNo,
        width,
        height,
        quantity: positionQuantity,
        productOptions: clone(resolved),
        color: { ralCode: options.ralCode, surface: options.surface },
        glass: { code: 'GLASS-10-TEMPERED', type: 'TEMPERED', thickness: 10, color: resolved.glassColor, width: glassWidth, height: glassHeight },
        productionNotes: position.description || ''
      });
      const byId = id => RULE_CATALOG.find(rule => rule.id === id);
      cutItems.push(item(byId('AG-SM10-CUT-B15082'), position, width - 22, 2 * positionQuantity, options));
      cutItems.push(item(byId('AG-SM10-CUT-B15083'), position, height, 2 * positionQuantity, options));
      cutItems.push(item(byId('AG-SM10-CUT-B15085'), position, glassWidth + 3, 2 * panelCount * positionQuantity, options));
      cutItems.push(item(byId('AG-SM10-CUT-B15086'), position, height - 58, 2 * (panelCount - 1) * positionQuantity, options));
      cutItems.push(item(byId('AG-SM10-CUT-B15087'), position, height - 22, 2 * positionQuantity, options));
      if (options.horizontalAdjustmentProfile) cutItems.push(item(byId('AG-SM10-CUT-B15081'), position, height - 22, 2 * positionQuantity, options, 'Kullanıcı seçimiyle eklendi.'));
      cutItems.push(item(byId('AG-SM10-CUT-B15099'), position, height - 58, 2 * positionQuantity, options));
      cutItems.push(item(byId('AG-SM10-CUT-B15138-H'), position, glassWidth + 3, 2 * panelCount * positionQuantity, options, '10 mm cam yatay adaptörü'));
      cutItems.push(item(byId('AG-SM10-CUT-B15138-V'), position, height - 250, 2 * panelCount * positionQuantity, options, '10 mm cam dikey adaptörü'));
      glassItems.push({
        itemId: makeId(position.positionNo, 'AG-SM10-GLASS'),
        positionId: position.id,
        positionNo: position.positionNo,
        glassCode: 'GLASS-10-TEMPERED',
        glassType: 'TEMPERED',
        thickness: 10,
        color: resolved.glassColor,
        width: glassWidth,
        height: glassHeight,
        quantity: panelCount * positionQuantity,
        processing: { temper: true, laminated: false, insulated: false, lowE: resolved.glassColor === 'LOW-E GLASS', edge: '', holes: '' },
        sourceRule: 'AG-SM10-GLASS',
        notes: 'SLIDEMASTER 10 side opening pilot camı'
      });
    });

    if (Number(options.extraRailCount) > 0) warnings.push({ code: 'EXTRA_RAIL_INFORMATION_ONLY', message: `Ekstra ray adedi ${Math.trunc(Number(options.extraRailCount))} yalnız bilgi amaçlıdır; kesim hesabına dahil edilmedi.` });
    warnings.push({ code: 'ACCESSORIES_SKIPPED', message: profile.exclusions.accessories });
    warnings.push({ code: 'INSECT_SCREEN_DISABLED', message: profile.exclusions.insectScreen });
    return { options, positions, cutItems: cutItems.filter(row => row.quantity > 0 && row.cutLength > 0), accessoryItems: [], glassItems, errors, warnings, ruleCatalog: clone(RULE_CATALOG) };
  }

  function groupCutItems(items) {
    const map = new Map();
    (items || []).forEach(item => {
      const key = [item.profileCode, item.cutLength, item.angleLeft, item.angleRight, item.color, item.surface].join('|');
      if (!map.has(key)) map.set(key, { ...item, itemId: `GROUP-${map.size + 1}`, positionNo: item.positionNo, sourcePositions: [item.positionNo] });
      else {
        const target = map.get(key);
        target.quantity += item.quantity;
        if (!target.sourcePositions.includes(item.positionNo)) target.sourcePositions.push(item.positionNo);
        target.positionNo = target.sourcePositions.join(', ');
      }
    });
    return Array.from(map.values());
  }

  root.PulumurAlbertGenauSlidingRules = { RULE_CATALOG, generate, groupCutItems, roundMm };
  if (typeof module !== 'undefined') module.exports = root.PulumurAlbertGenauSlidingRules;
})(typeof window !== 'undefined' ? window : globalThis);
