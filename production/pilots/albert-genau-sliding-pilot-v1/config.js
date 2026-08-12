(function (root) {
  'use strict';
  const PROFILE_ID = 'albert-genau-sliding-pilot-v1';
  const profiles = Object.freeze([
    { code: 'B15082', name: '42×123 Kasa Üst Profili' },
    { code: 'B15083', name: '11×123 Yan Dikme' },
    { code: 'B15085', name: '96×26 Kanat Profili' },
    { code: 'B15086', name: '31×34 Kanat Çektirme' },
    { code: 'B15087', name: '33×19 Yan Birleşim Kilit Karşılık' },
    { code: 'B15081', name: '33×22 Yatay Ayar Profili' },
    { code: 'B15099', name: '70×44 Çektirmeli Kilit Ara Dikme' },
    { code: 'B15138', name: '18×24 Adaptör 10 mm' }
  ]);
  const config = Object.freeze({
    id: PROFILE_ID,
    label: 'Albert Genau · SLIDEMASTER 10',
    company: Object.freeze({ id: 'albert-genau', name: 'Albert Genau' }),
    productType: 'SLIDING',
    system: 'SLIDEMASTER 10',
    version: 1,
    ruleCatalogVersion: 'ag-sm10-side-v1',
    workbookVersion: 'ag-sm10-workbook-v1',
    supported: Object.freeze({ type: 'WITH THRESHOLD', openingType: 'SIDE OPENING', glassThickness: '10 MM' }),
    defaults: Object.freeze({
      ralCode: 'RAL 7016',
      surface: 'MAT',
      extraRailCount: 0,
      horizontalAdjustmentProfile: false,
      insectScreen: false,
      shortageAcceptedForOrder: true
    }),
    stockPolicy: Object.freeze({
      stockLengths: Object.freeze([6000, 7000]),
      availableQuantityPerLength: 80,
      kerf: 3,
      startTrim: 10,
      endTrim: 10,
      minimumReusableOffcut: 300,
      unit: 'mm'
    }),
    profiles,
    exclusions: Object.freeze({
      accessories: 'Pilot teknik manuelinde doğrulanmış aksesuar listesi bulunmadığı için kapsam dışıdır.',
      insectScreen: 'Pilot sürümünde sineklik üretimi pasiftir.',
      extraRailCalculation: 'Ekstra ray yalnız bilgi amaçlı gösterilir; kesim hesabına girmez.',
      macros: 'Kaynak XLSM makroları, ActiveX nesneleri ve harici bağlantıları exporta taşınmaz.'
    })
  });
  root.PulumurAlbertGenauSlidingPilotV1 = config;
  if (root.PulumurProductionProfileRegistry) root.PulumurProductionProfileRegistry.register(config);
  if (typeof module !== 'undefined') module.exports = config;
})(typeof window !== 'undefined' ? window : globalThis);
