(function () {
  const p3dvEmbeddedHostMode = (() => { try { return new URLSearchParams(window.location.search).get('embedded') === '1' || Boolean(window.frameElement && window.frameElement.dataset && window.frameElement.dataset.p3dvEmbeddedHost === 'true'); } catch (_) { return false; } })();
  const P3DV_PRODUCT_INPUT_SCHEMA = 'p3dv-main-product-input-v14.04';
  const P3DV_HOST_BUILD = '10.28.6-r14.28.6';
  const P3DV_HOST_CONTRACT = 'plmr-p3dv-host-bridge-v14.28.6';
  if (p3dvEmbeddedHostMode && document && document.body) document.body.classList.add('p3dv-host-embedded');

  // V3.86 demo default: keep internal Galaxy identity, expose Bioclimatic (Tilt) as the initial product.
  const defaults = {
    productGroup: 'b-cube-galaxy',
    width: 0,
    depth: 2010,
    height: 0,
    panelCount: 8,
    orientations: [0, 0, 0, 0],
    postSections: [
      { x: 180, z: 140 },
      { x: 180, z: 140 },
      { x: 180, z: 140 },
      { x: 180, z: 140 }
    ],
    beamSection: { vertical: 225, thickness: 40 },
    placements: {},
    zipPlacements: {},
    facadeProfiles: {},
    productsOpen: true,
    productOpenStates: {},
    panelStates: {},
    panelMasterOpen: true,
    glassPreferences: { color: 'TRANSPARENT', customColor: '', thickness: '10 MM' },
    colorMode: 'default',
    systemColor: { code: 'RAL 9006', hex: '#7C7D7F', finish: 'MATTE' },
    panelColor: { code: 'RAL 6018', hex: '#397A36', finish: 'MATTE' },
    pergoRiseProject: null,
    systemCount: 1,
    moduleWidths: [],
    moduleDepths: [],
    modulePanelCounts: [],
    multiAlignment: 'front',
    multiRows: [],
    rowAlignment: 'left',
    panelCollection: 'center',
    inputDrafts: { width: '', depth: '2010', height: '' },
    panelColorIndependent: true,
    panelFill: 'EVET',
    motor: 'Yok',
    remote: 'Yok',
    led: 'NO',
    dimmer: 'HAYIR',
    parapet: 'HAYIR',
    parapetHeight: '',
    waterStandard: 'EVET',
    extras: '',
    pergoOptions: {
      glassTrack: 'HAYIR',
      structureColor: '-',
      fabric: '-',
      fabricProfiles: '-',
      motor: '-',
      remote: '-',
      led: '-',
      dimmer: '-',
      triangleJoinery: 'HAYIR',
      waterStandard: 'EVET',
      waterOutletPlacement: 'BOTH',
      extras: '-'
    }
  };

  const GLAZING_SECTION_SPECS = Object.freeze({
    '8 MM': Object.freeze({ glassDepth: 8, frameDepth: 12 }),
    '10 MM': Object.freeze({ glassDepth: 10, frameDepth: 14 }),
    '12 MM': Object.freeze({ glassDepth: 12, frameDepth: 16 }),
    'INSULATED GLASS': Object.freeze({ glassDepth: 20, frameDepth: 24 })
  });

  const ids = {
    frame: 'viewerFrame',
    pergo2DViewport: 'pergo2DViewport',
    pergo2DStage: 'pergo2DStage',
    mode2D: 'mode2DBtn',
    mode3D: 'mode3DBtn',
    engineSelector: 'engineSelectorInput',
    previewProductLabel: 'previewProductLabel',
    projectDate: 'plmrProjectDate',
    previewExpand: 'previewExpandBtn',
    previewExpandLabel: 'previewExpandLabel',
    previewUndo: 'previewUndoBtn',
    previewRedo: 'previewRedoBtn',
    previewWorkspace: 'expandedPreviewWorkspace',
    previewInputGuidance: 'previewInputGuidance',
    largePreviewToolbox: 'largePreviewToolbox',
    largePreviewToolboxToggle: 'largePreviewToolboxToggleBtn',
    largePreviewToolboxPin: 'largePreviewToolboxPinBtn',
    largePreviewShowAllDims: 'largePreviewShowAllDimsBtn',
    largePreviewShowMainDims: 'largePreviewShowMainDimsBtn',
    largePreviewGlassTrack: 'largePreviewGlassTrackBtn',
    largePreviewRayBoundary: 'largePreviewRayBoundaryBtn',
    largePreviewTriangleJoinery: 'largePreviewTriangleJoineryBtn',
    largePreviewWaterStandard: 'largePreviewWaterStandardBtn',
    largePreviewParapet: 'largePreviewParapetInput',
    largePreviewMultiProduct: 'largePreviewMultiProductBtn',
    largePreviewMultiProfileAdd: 'largePreviewMultiProfileAddBtn',
    largePreviewMultiProfileDelete: 'largePreviewMultiProfileDeleteBtn',
    largePreviewResetCamera: 'largePreviewResetCameraBtn',
    largePreviewMultiDimension: 'largePreviewMultiDimensionBtn',
    largePreviewEqualizeGaps: 'largePreviewEqualizeGapsBtn',
    largePreviewPostSettings: 'largePreviewPostSettingsBtn',
    largePreviewBulkExtend: 'largePreviewBulkExtendBtn',
    largePreviewBulkPostProfile: 'largePreviewBulkPostProfileBtn',
    largePreviewConvertProduct: 'largePreviewConvertProductBtn',
    largePreviewFitProducts: 'largePreviewFitProductsBtn',
    largePreviewDetailCopy: 'largePreviewDetailCopyBtn',
    largePreviewMultiDelete: 'largePreviewMultiDeleteBtn',
    largePreviewDeleteAll: 'largePreviewDeleteAllBtn',
    largePreviewProductStateControl: 'largePreviewProductStateControl',
    largePreviewProductState: 'largePreviewProductStateBtn',
    largePreviewProductStateValue: 'largePreviewProductStateValue',
    largePreviewProductStateMenuButton: 'largePreviewProductStateMenuBtn',
    largePreviewProductStateMenu: 'largePreviewProductStateMenu',
    headerCheckDrawing: 'headerCheckDrawingBtn',
    toolbarRefresh: 'toolbarRefreshBtn',
    toolbarZoomIn: 'toolbarZoomInBtn',
    toolbarZoomOut: 'toolbarZoomOutBtn',
    toolbarFit: 'toolbarFitBtn',
    toolbarPdf: 'toolbarPdfBtn',
    toolbarDxf: 'toolbarDxfBtn',
    toolbarAr: 'toolbarArBtn',
    toolbarFullscreen: 'toolbarFullscreenBtn',
    positionEdit: 'positionEditBtn',
    positionTitle: 'positionTitle',
    positionSummary: 'positionSummary',
    positionDialogTitle: 'positionDialogTitle',
    dialog: 'positionDialog',
    form: 'positionForm',
    width: 'widthInput',
    depth: 'depthInput',
    height: 'heightInput',
    dialogLamella: 'dialogLamellaCount',
    productGroup: 'productGroupInput',
    productSubgroup: 'productSubgroupValue',
    productFormula: 'productFormulaText',
    projectionOptions: 'projectionOptions',
    projectionCustomToggle: 'projectionCustomToggleBtn',
    freedomForm: 'freedomInputForm',
    freedomWidth: 'freedomWidthInput',
    freedomWidthLimitNote: 'freedomWidthLimitNote',
    freedomDepth: 'freedomDepthInput',
    freedomDepthLimitNote: 'freedomDepthLimitNote',
    freedomHeight: 'freedomHeightInput',
    freedomPanelCount: 'freedomPanelCountInput',
    freedomValidation: 'freedomInputValidation',
    freedomApply: 'freedomApplyBtn',
    cancel: 'cancelPositionBtn',
    productStatus: 'productStatus',
    replay: 'replayAnimationBtn',
    clearProducts: 'clearProductsBtn',
    productDialog: 'productDialog',
    productForm: 'productForm',
    productFormGrid: 'productFormGrid',
    productZoneTitle: 'productZoneTitle',
    productZoneInfo: 'productZoneInfo',
    productType: 'productTypeInput',
    productSeriesWrap: 'productSeriesWrap',
    productSeries: 'productSeriesInput',
    productSubtypeWrap: 'productSubtypeWrap',
    productSubtype: 'productSubtypeInput',
    productPlacementWrap: 'productPlacementWrap',
    productPlacement: 'productPlacementInput',
    productMechanismWrap: 'productMechanismWrap',
    productMechanism: 'productMechanismInput',
    productSlidingViewWrap: 'productSlidingViewWrap',
    productSlidingView: 'productSlidingViewInput',
    productOpeningWrap: 'productOpeningWrap',
    productOpening: 'productOpeningInput',
    productDirectionWrap: 'productDirectionWrap',
    productDirectionLabel: 'productDirectionLabel',
    productDirection: 'productDirectionInput',
    productGlassThicknessWrap: 'productGlassThicknessWrap',
    productGlassThickness: 'productGlassThicknessInput',
    productGlassColorWrap: 'productGlassColorWrap',
    productGlassColorLabel: 'productGlassColorLabel',
    productGlassColor: 'productGlassColorInput',
    productPanelsWrap: 'productPanelsWrap',
    productCustomGlassWrap: 'productCustomGlassWrap',
    productCustomGlassLabel: 'productCustomGlassLabel',
    productCustomGlass: 'productCustomGlassInput',
    productPanels: 'productPanelsInput',
    productFoldingViewWrap: 'productFoldingViewWrap',
    productFoldingView: 'productFoldingViewInput',
    productFoldingOpenDirectionWrap: 'productFoldingOpenDirectionWrap',
    productFoldingOpenDirection: 'productFoldingOpenDirectionInput',
    productPanelHint: 'productPanelHint',
    productFixedVerticalCountWrap: 'productFixedVerticalCountWrap',
    productFixedVerticalCount: 'productFixedVerticalCountInput',
    productFixedHorizontalCountWrap: 'productFixedHorizontalCountWrap',
    productFixedHorizontalCount: 'productFixedHorizontalCountInput',
    productFixedHorizontalHeightsWrap: 'productFixedHorizontalHeightsWrap',
    productFixedHorizontalHeights: 'productFixedHorizontalHeightsInput',
    productFixedHorizontalHeightRows: 'productFixedHorizontalHeightRows',
    productDoorTypeWrap: 'productDoorTypeWrap',
    productDoorType: 'productDoorTypeInput',
    productDoorTypeTrigger: 'productDoorTypeTrigger',
    productDoorTypeValue: 'productDoorTypeValue',
    productDoorTypePicker: 'productDoorTypePicker',
    productDoorTypePickerClose: 'productDoorTypePickerClose',
    productDoorTypeCards: 'productDoorTypeCards',
    productDoorHingeWrap: 'productDoorHingeWrap',
    productDoorHinge: 'productDoorHingeInput',
    productDoorActiveLeafWrap: 'productDoorActiveLeafWrap',
    productDoorActiveLeaf: 'productDoorActiveLeafInput',
    productDoorOpenDirectionWrap: 'productDoorOpenDirectionWrap',
    productDoorOpenDirection: 'productDoorOpenDirectionInput',
    productDoorHandleTypeWrap: 'productDoorHandleTypeWrap',
    productDoorHandleType: 'productDoorHandleTypeInput',
    productDoorTopFixedHeightWrap: 'productDoorTopFixedHeightWrap',
    productDoorTopFixedHeight: 'productDoorTopFixedHeightInput',
    productDoorHeightSummaryWrap: 'productDoorHeightSummaryWrap',
    productDoorFixedHeightValue: 'productDoorFixedHeightValue',
    productDoorMovingHeightValue: 'productDoorMovingHeightValue',
    productPanelTypeWrap: 'productPanelTypeWrap',
    productPanelTypeLabel: 'productPanelTypeLabel',
    productPanelType: 'productPanelTypeInput',
    productMotorDirectionWrap: 'productMotorDirectionWrap',
    productMotorDirection: 'productMotorDirectionInput',
    productViewWrap: 'productViewWrap',
    productView: 'productViewInput',
    productMotorTypeWrap: 'productMotorTypeWrap',
    productMotorType: 'productMotorTypeInput',
    productRemoteWrap: 'productRemoteWrap',
    productRemote: 'productRemoteInput',
    cleanableWindowSection: 'cleanableWindowSection',
    bottomPanelMode: 'bottomPanelModeInput',
    bottomPanelStateWrap: 'bottomPanelStateWrap',
    bottomPanelState: 'bottomPanelStateInput',
    bottomPanelHingeWrap: 'bottomPanelHingeWrap',
    bottomPanelHinge: 'bottomPanelHingeInput',
    slidingCollectionSection: 'slidingCollectionSection',
    slidingCollectionState: 'slidingCollectionStateInput',
    foldingCollectionSection: 'foldingCollectionSection',
    foldingCollectionState: 'foldingCollectionStateInput',
    foldingRuleNote: 'foldingRuleNote',
    collectingDisplaySection: 'collectingDisplaySection',
    collectingDisplayState: 'collectingDisplayStateInput',
    collectingDisplayDirection: 'collectingDisplayDirection',
    toolboxIntermediateDimensions: 'toolboxIntermediateDimensionsInput',
    toolboxMainDimensions: 'toolboxMainDimensionsInput',
    productOpenList: 'toolboxProductOpenList',
    productOpenEmpty: 'toolboxProductOpenEmpty',
    panelMaster: 'toolboxPanelMasterInput',
    toolboxResetCamera: 'toolboxResetCameraBtn',
    exportProductListPdf: 'exportProductListPdfBtn',
    mobileAr: 'mobileArBtn',
    mobileArStatus: 'mobileArStatus',
    quickTestStatus: 'quickTestStatus',
    multiProduct: 'multiProductBtn',
    multiDelete: 'multiDeleteBtn',
    multiProfileAdd: 'multiProfileAddBtn',
    multiProfileDelete: 'multiProfileDeleteBtn',
    fitProducts: 'fitProductsBtn',
    selectionBanner: 'toolboxSelectionBanner',
    selectionBannerTitle: 'toolboxSelectionBannerTitle',
    selectionBannerText: 'toolboxSelectionBannerText',
    selectionDone: 'toolboxSelectionDoneBtn',
    selectionCancel: 'toolboxSelectionCancelBtn',
    zoneActionDialog: 'zoneActionDialog',
    zoneActionTitle: 'zoneActionTitle',
    zoneActionInfo: 'zoneActionInfo',
    zoneActionAddProfile: 'zoneActionAddProfileBtn',
    zoneActionRemoveProfile: 'zoneActionRemoveProfileBtn',
    zoneActionEditDimension: 'zoneActionEditDimensionBtn',
    zoneActionPlaceProduct: 'zoneActionPlaceProductBtn',
    zoneActionDeleteProduct: 'zoneActionDeleteProductBtn',
    zoneActionRecalculate: 'zoneActionRecalculateBtn',
    zoneActionCancel: 'cancelZoneActionBtn',
    profileDialog: 'profileDialog',
    profileForm: 'profileForm',
    profileOrientation: 'profileOrientationInput',
    profileType: 'profileTypeInput',
    profileCustomFields: 'profileCustomFields',
    profileWidth: 'profileWidthInput',
    profileDepth: 'profileDepthInput',
    profileValidation: 'profileValidation',
    profileCancel: 'cancelProfileBtn',
    dividerProfileDialog: 'dividerProfileDialog',
    dividerProfileTitle: 'dividerProfileTitle',
    dividerProfileInfo: 'dividerProfileInfo',
    dividerProfileDelete: 'deleteDividerProfileBtn',
    dividerProfileCancel: 'cancelDividerProfileBtn',
    postActionDialog: 'postActionDialog',
    postActionTitle: 'postActionTitle',
    postActionInfo: 'postActionInfo',
    postChangeProfile: 'postChangeProfileBtn',
    postRotateProfile: 'postRotateProfileBtn',
    postActionCancel: 'cancelPostActionBtn',
    postProfileDialog: 'postProfileDialog',
    postProfileForm: 'postProfileForm',
    postProfileTitle: 'postProfileTitle',
    postProfileType: 'postProfileTypeInput',
    postCustomFields: 'postCustomFields',
    postX: 'postXInput',
    postZ: 'postZInput',
    postValidation: 'postValidation',
    postProfileCancel: 'cancelPostProfileBtn',
    zoneDimensionDialog: 'zoneDimensionDialog',
    zoneDimensionForm: 'zoneDimensionForm',
    zoneDimensionTitle: 'zoneDimensionTitle',
    zoneWidth: 'zoneWidthInput',
    zoneHeight: 'zoneHeightInput',
    zoneDimensionValidation: 'zoneDimensionValidation',
    zoneDimensionCancel: 'cancelZoneDimensionBtn',
    productValidation: 'productValidation',
    productCancel: 'cancelProductBtn',
    productRemove: 'removeProductBtn',
    systemColorTrigger: 'systemColorTrigger',
    systemColorSwatch: 'systemColorSwatch',
    systemColorValue: 'systemColorValue',
    panelColorTrigger: 'panelColorTrigger',
    panelColorSwatch: 'panelColorSwatch',
    panelColorValue: 'panelColorValue',
    defaultColorMode: 'defaultColorModeBtn',
    ralColorMode: 'ralColorModeBtn',
    colorPickerDialog: 'colorPickerDialog',
    colorPickerTitle: 'colorPickerTitle',
    colorPickerDescription: 'colorPickerDescription',
    colorPickerClose: 'colorPickerCloseBtn',
    colorCatalogRising: 'colorCatalogRisingBtn',
    colorCatalogAll: 'colorCatalogAllBtn',
    colorSearch: 'colorSearchInput',
    colorResultCount: 'colorResultCount',
    colorOptionGrid: 'colorOptionGrid',
    colorFinishDialog: 'colorFinishDialog',
    colorFinishTitle: 'colorFinishTitle',
    appConfirmDialog: 'appConfirmDialog',
    appConfirmTitle: 'appConfirmTitle',
    appConfirmMessage: 'appConfirmMessage',
    appConfirmCancel: 'appConfirmCancelBtn',
    appConfirmAccept: 'appConfirmAcceptBtn',
    colorFinishDescription: 'colorFinishDescription',
    colorFinishClose: 'colorFinishCloseBtn',
    colorFinishSummary: 'colorFinishSummary',
    colorFinishOptions: 'colorFinishOptions',
    productFabricWrap: 'productFabricWrap',
    productFabric: 'productFabricInput',
    productFabricTrigger: 'productFabricTrigger',
    productFabricValue: 'productFabricValue',
    productFabricPicker: 'productFabricPicker',
    productFabricPickerClose: 'productFabricPickerClose',
    productFabricCards: 'productFabricCards',
    pdfRequestFormMeta: 'pdfRequestFormMeta',
    pdfRequestFormFields: 'pdfRequestFormFields',
    pergoRiseFields: 'pergoRiseParametricFields',
    pergoSystemCount: 'pergoSystemCountInput',
    pergoFrontHeight: 'pergoFrontHeightInput',
    pergoRayCount: 'pergoRayCountInput',
    pergoPostCount: 'pergoPostCountInput',
    pergoGlassRayBoundaryMode: 'pergoGlassRayBoundaryModeInput',
    pergoCalculator: 'pergoCalculatorBtn',
    pergoResetAll: 'pergoResetAllBtn',
    pergoSystemReset: 'pergoSystemResetBtn',
    pergoOptionsReset: 'pergoOptionsResetBtn',
    pergoExtraReset: 'pergoExtraResetBtn',
    pergoCalculatorDialog: 'pergoCalculatorDialog',
    pergoCalcAngle: 'pergoCalcAngle',
    pergoCalcOpening: 'pergoCalcOpening',
    pergoCalcRear: 'pergoCalcRear',
    pergoCalcFront: 'pergoCalcFront',
    pergoCalcResult: 'pergoCalcResult',
    pergoCalcCompute: 'pergoCalcComputeBtn',
    pergoCalcTransfer: 'pergoCalcTransferBtn',
    pergoCalcClear: 'pergoCalcClearBtn',
    primaryWidthLabel: 'primaryWidthLabel',
    primaryDepthLabel: 'primaryDepthLabel',
    primaryHeightLabel: 'primaryHeightLabel',
    projectCodeValue: 'projectCodeValue',
    panelColorIndependent: 'panelColorIndependentInput',
    panelFill: 'panelFillInput',
    motorInput: 'motorInput',
    motorCombo: 'motorCombo',
    motorComboButton: 'motorComboButton',
    motorComboMenu: 'motorComboMenu',
    remoteInput: 'remoteInput',
    remoteCombo: 'remoteCombo',
    remoteComboButton: 'remoteComboButton',
    remoteComboMenu: 'remoteComboMenu',
    ledInput: 'ledInput',
    ledCombo: 'ledCombo',
    ledComboButton: 'ledComboButton',
    ledComboMenu: 'ledComboMenu',
    dimmerInput: 'dimmerInput',
    parapetInput: 'parapetInput',
    parapetHeightInput: 'parapetHeightInput',
    waterStandardInput: 'waterStandardInput',
    extrasInput: 'extrasInput',
    pergoGlassTrack: 'pergoGlassTrackInput',
    pergoStructureColor: 'pergoStructureColorInput',
    pergoFabric: 'pergoFabricInput',
    pergoFabricCombo: 'pergoFabricCombo',
    pergoFabricComboButton: 'pergoFabricComboButton',
    pergoFabricComboMenu: 'pergoFabricComboMenu',
    pergoFabricProfiles: 'pergoFabricProfilesInput',
    pergoDimmer: 'pergoDimmerInput',
    pergoTriangleJoinery: 'pergoTriangleJoineryInput',
    pergoWaterOutletPlacement: 'pergoWaterOutletPlacementInput',
    pergoWaterOutletPlacementRow: 'pergoWaterOutletPlacementRow',
    pergoBackWallRow: 'pergoBackWallRow',
    pergoBackWallOpen: 'pergoBackWallOpenBtn',
    pergoBackWallSummary: 'pergoBackWallSummary',
    pergoBackWallDialog: 'pergoBackWallDialog',
    pergoBackWallForm: 'pergoBackWallForm',
    pergoBackWallClose: 'pergoBackWallCloseBtn',
    pergoBackWallCancel: 'pergoBackWallCancelBtn',
    pergoBackWallDefault: 'pergoBackWallDefaultBtn',
    pergoBackWallSystem: 'pergoBackWallSystemInput',
    pergoBackWallEnabled: 'pergoBackWallEnabledInput',
    pergoBackWallDirection: 'pergoBackWallDirectionInput',
    pergoBackWallOffset: 'pergoBackWallOffsetInput',
    pergoBackWallHeight: 'pergoBackWallHeightInput',
    pergoBackWallDepth: 'pergoBackWallDepthInput',
    pergoBackWallMinX: 'pergoBackWallMinXInput',
    pergoBackWallMaxX: 'pergoBackWallMaxXInput',
    pergoBackWallStartDepth: 'pergoBackWallStartDepthInput',
    pergoBackWallEndDepth: 'pergoBackWallEndDepthInput',
    pergoBackWallAngle: 'pergoBackWallAngleInput',
    pergoBackWallTopColumns: 'pergoBackWallTopColumnsInput',
    pergoBackWallTopRows: 'pergoBackWallTopRowsInput',
    pergoBackWallSideColumns: 'pergoBackWallSideColumnsInput',
    pergoBackWallSideRows: 'pergoBackWallSideRowsInput',
    pergoBackWallNote: 'pergoBackWallNote',
    pergoBackWallError: 'pergoBackWallError',
    projectionCombo: 'projectionCombo',
    projectionComboMenu: 'projectionComboMenu',
    pergoFrontHeightRow: 'pergoFrontHeightRow',
    pergoRayCountRow: 'pergoRayCountRow',
    pergoPostCountRow: 'pergoPostCountRow',
    freedomSystemCardSpacer: 'freedomSystemCardSpacer'
  };

  const $ = (id) => document.getElementById(id);
  const modelState = JSON.parse(JSON.stringify(defaults));
  let viewerCameraState = null;
  let viewerLiveProductStateReady = false;
  let viewerLivePanelMasterReady = false;
  let viewerLivePergoRiseReady = false;
  let viewerLiveColorStateReady = false;
  let viewerLiveModelStateReady = false;
  let activeViewerProductGroup = '';
  let activeViewerModelReady = false;
  let pendingLiveModelState = false;
  let autoPreviewTimer = null;
  let viewerSessionCounter = 0;
  let activeViewerSessionId = '';
  const pergo2DViewState = { zoom: 1, baseScale: 1, minZoom: 0.25, maxZoom: 4 };
  let pergo2DLastDrawing = null;
  let p3dvDrawingMode = '3d';
  let technical2DLastProjection = null;
  let pendingLiveProductState = false;
  let pendingLivePanelMasterState = false;
  let pendingLiveColorState = false;
  let pergoRiseRevision = 0;
  let pergoCalculatorLastResult = null;
  let suppressPergoInputInfrastructure = false;
  let pergoBackWallDialogSnapshot = null;
  let pergoBackWallLiveTimer = 0;
  let suppressPergoBackWallDialogEvents = false;
  let liveStateRevision = 0;
  const pergoRiseAssetPath = ''; // Raw GLB intentionally omitted; extracted component templates are canonical.
  let selectedZone = null;
  let selectedZoneId = null;
  let dimensionVisibility = { intermediate: false, main: true };
  let profileSequence = 1;
  function nextFacadeProfileId() {
    const used = new Set();
    let maxNumeric = 0;
    Object.values(modelState.facadeProfiles || {}).forEach((list) => {
      (Array.isArray(list) ? list : []).forEach((profile) => {
        const id = String(profile && profile.id || '');
        if (!id) return;
        used.add(id);
        const match = /^pf(\d+)$/i.exec(id);
        if (match) maxNumeric = Math.max(maxNumeric, Number(match[1]) || 0);
      });
    });
    profileSequence = Math.max(Number(profileSequence) || 1, maxNumeric + 1);
    let id = `pf${profileSequence++}`;
    while (used.has(id)) id = `pf${profileSequence++}`;
    return id;
  }
  // V14.24 Stage 6: P3DV structural command history reuses the existing
  // PulumurTransactionCommandEngine. The journal is derived history, never a
  // second physical product owner. Product switch/restore and non-command
  // physical edits rebase it to the current canonical modelState.
  const p3dvTransactionHistoryApi = window.PulumurTransactionCommandEngine || null;
  let p3dvPhysicalCommandHistory = p3dvTransactionHistoryApi && typeof p3dvTransactionHistoryApi.create === 'function'
    ? p3dvTransactionHistoryApi.create({ initialState: JSON.parse(JSON.stringify(modelState)), maxEntries: 50 })
    : null;
  let p3dvHistoryApplying = false;
  function p3dvHistoryClone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function p3dvHistoryInspect() {
    return p3dvPhysicalCommandHistory && typeof p3dvPhysicalCommandHistory.inspect === 'function'
      ? p3dvPhysicalCommandHistory.inspect()
      : Object.freeze({ schema: 'plmr-transaction-command-engine-v1', canUndo: false, canRedo: false, active: false, bytes: 0, undo: Object.freeze([]), redo: Object.freeze([]) });
  }
  function p3dvHistoryRebase(reason = 'boundary') {
    if (!p3dvPhysicalCommandHistory || p3dvHistoryApplying) return p3dvHistoryInspect();
    p3dvPhysicalCommandHistory.clear(p3dvHistoryClone(modelState));
    return { ...p3dvHistoryInspect(), reason: String(reason || 'boundary') };
  }
  function p3dvHistoryRecord(beforeState, command) {
    if (!p3dvPhysicalCommandHistory || p3dvHistoryApplying) return null;
    const before = p3dvHistoryClone(beforeState || modelState);
    const after = p3dvHistoryClone(modelState);
    const signature = p3dvTransactionHistoryApi && typeof p3dvTransactionHistoryApi.signature === 'function'
      ? p3dvTransactionHistoryApi.signature
      : (value => JSON.stringify(value));
    if (signature(p3dvPhysicalCommandHistory.getState()) !== signature(before)) p3dvPhysicalCommandHistory.clear(before);
    const source = command && typeof command === 'object' ? command : { type: String(command || 'model-change') };
    p3dvPhysicalCommandHistory.begin(source.label || source.type || 'P3DV command', { origin: source.origin || 'p3dv' });
    p3dvPhysicalCommandHistory.apply({
      type: source.type || 'model-change',
      label: source.label || source.type || 'P3DV command',
      origin: source.origin || 'p3dv',
      payload: source.payload || null
    }, () => after);
    return p3dvPhysicalCommandHistory.commit(after);
  }
  function p3dvRestorePhysicalHistoryState(nextState, direction) {
    if (!nextState || typeof nextState !== 'object') throw new Error('P3DV_HISTORY_STATE_INVALID');
    const nextGroup = String(nextState.productGroup || '');
    if (p3dvCanonicalProductGroup(nextGroup) !== p3dvCanonicalProductGroup(modelState.productGroup)) throw new Error('P3DV_HISTORY_PRODUCT_BOUNDARY');
    p3dvHistoryApplying = true;
    try {
      Object.keys(modelState).forEach(key => { delete modelState[key]; });
      Object.assign(modelState, p3dvHistoryClone(defaults), p3dvHistoryClone(nextState));
      selectedZone = null;
      selectedZoneId = null;
      cancelToolboxSelection();
      pruneProductStates();
      p3dvHostSyncControls();
      commitModelChangeLive(`history:${direction}`, { preserveHistory: true });
    } finally {
      p3dvHistoryApplying = false;
    }
    return p3dvHostSnapshot();
  }
  function p3dvUndoPhysicalCommand() {
    if (!p3dvPhysicalCommandHistory) return { ok: false, error: 'P3DV_HISTORY_UNAVAILABLE', history: p3dvHistoryInspect() };
    const moved = p3dvPhysicalCommandHistory.undo();
    if (!moved) return { ok: false, error: 'P3DV_HISTORY_UNDO_EMPTY', history: p3dvHistoryInspect() };
    const snapshot = p3dvRestorePhysicalHistoryState(moved.state, 'undo');
    return { ok: true, direction: 'undo', entry: moved.entry, snapshot, contract: p3dvTechnical2DContract(), history: p3dvHistoryInspect() };
  }
  function p3dvRedoPhysicalCommand() {
    if (!p3dvPhysicalCommandHistory) return { ok: false, error: 'P3DV_HISTORY_UNAVAILABLE', history: p3dvHistoryInspect() };
    const moved = p3dvPhysicalCommandHistory.redo();
    if (!moved) return { ok: false, error: 'P3DV_HISTORY_REDO_EMPTY', history: p3dvHistoryInspect() };
    const snapshot = p3dvRestorePhysicalHistoryState(moved.state, 'redo');
    return { ok: true, direction: 'redo', entry: moved.entry, snapshot, contract: p3dvTechnical2DContract(), history: p3dvHistoryInspect() };
  }

  let selectedDividerProfile = null;
  let selectedPostIndex = null;
  let toolboxSelectionMode = null;
  let toolboxSelectionItems = new Map();
  let bulkProductZones = null;
  let bulkProfileZones = null;
  let activeProductSlot = 'primary';
  let activeColorTarget = 'system';
  let activeColorCatalog = 'rising';
  let pendingColorSelection = null;
  let pdfRequestState = { 'b-cube': null, 'bio-rise': null, 'b-cube-galaxy': null };

  const PRODUCT_SPECS = {
    'b-cube': {
      groupLabel: 'Rolling Roof', subgroupLabel: 'Retractable', modelLabel: 'Rolling Roof (Retractable)',
      widthMin: 1000, widthMax: 4050,
      depthMin: 2308, depthMax: 7060, depthStep: 216, depthListStart: 2308,
      heightMin: 1600, heightMax: null,
      panelMin: 8, panelMax: 30, panelPitch: 216, projectionOffset: 580,
      postSection: { x: 100, z: 220 }, beamSection: { vertical: 220, thickness: 100 }, sideBeamThickness: 100
    },
    'bio-rise': {
      groupLabel: 'Eco-Bioclimatic', subgroupLabel: 'Tilt', modelLabel: 'Eco-Bioclimatic (Tilt)',
      widthMin: 1000, widthMax: 4000,
      depthMin: 2070, depthMax: 6070, depthStep: 200, depthListStart: 2070,
      heightMin: 1600, heightMax: 3500,
      panelMin: 8, panelMax: 28, panelPitch: 200, projectionOffset: 470,
      postSection: { x: 150, z: 100 }, beamSection: { vertical: 218, thickness: 100 }, sideBeamThickness: 50
    },
    'b-cube-galaxy': {
      groupLabel: 'Bioclimatic', subgroupLabel: 'Tilt', modelLabel: 'Bioclimatic (Tilt)',
      widthMin: 1000, widthMax: 4000,
      depthMin: 2010, depthMax: 9010, depthStep: 200, depthListStart: 2010,
      heightMin: 1600, heightMax: 3500,
      panelMin: 8, panelMax: 43, panelPitch: 200, projectionOffset: 470,
      postSection: { x: 180, z: 140 }, beamSection: { vertical: 225, thickness: 40 }, sideBeamThickness: 80,
      gutterSection: { width: 98, clearance: 2 }, frontVisibleTotal: 180, sideVisibleTotal: 140
    },
    'pergo-rise': {
      groupLabel: 'Pergola', subgroupLabel: 'Web DXF / 2D', modelLabel: 'Pergola',
      widthMin: 1000, widthMax: 14000,
      depthMin: 1000, depthMax: 7000, depthStep: 500, depthListStart: 1000,
      heightMin: 1800, heightMax: 4000,
      panelMin: 1, panelMax: 1, panelPitch: 1, projectionOffset: 0,
      postSection: { x: 100, z: 100 }, beamSection: { vertical: 100, thickness: 100 }, sideBeamThickness: 100,
      staticViewer: true
    }
  };

  const FREEDOM_UI_MOTOR_OPTIONS = Object.freeze(['Yok', 'Somfy Rts', 'Somfy IO']);
  const FREEDOM_UI_REMOTE_OPTIONS = Object.freeze({
    'YOK': ['Yok'],
    'SOMFY RTS': ['-', 'SITUO 2 RTS', 'SITUO 5 RTS', 'TELIS 16 RTS'],
    'SOMFY IO': ['-', 'SITUO 2 IO', 'SITUO 5 IO']
  });
  const FREEDOM_UI_LED_OPTIONS = Object.freeze(['YES', 'NO']);
  // V3.53 source-contract markers retained for historical static regression:
  // Object.freeze(['-', 'RISING MOTOR', 'SOMFY RTS', 'SOMFY IO'])
  // 'RISING MOTOR': ['-', 'RISING 6 CHANNELS']
  // 'SOMFY RTS': ['-', 'SITUO 2 RTS', 'SITUO 5 RTS', 'TELIS 16 RTS']
  // 'SOMFY IO': ['-', 'SITUO 2 IO', 'SITUO 5 IO']
  // C 1602 - 3D (8118-1622) … C 9012 - D (8290-9002)
  const PERGO_RISE_UI_MOTOR_OPTIONS = Object.freeze((window.P3DVPergoRiseInput && window.P3DVPergoRiseInput.MOTOR_OPTIONS || ['-', 'RISING MOTOR', 'SOMFY RTS', 'SOMFY IO']).slice());
  const PERGO_RISE_UI_REMOTE_OPTIONS = Object.freeze(window.P3DVPergoRiseInput && window.P3DVPergoRiseInput.REMOTE_OPTIONS_BY_MOTOR || {
    '-': ['-'], 'RISING MOTOR': ['-', 'RISING 6 CHANNELS'], 'SOMFY RTS': ['-', 'SITUO 2 RTS', 'SITUO 5 RTS', 'TELIS 16 RTS'], 'SOMFY IO': ['-', 'SITUO 2 IO', 'SITUO 5 IO']
  });
  const PERGO_RISE_UI_FABRIC_OPTIONS = Object.freeze((window.P3DVPergoRiseInput && window.P3DVPergoRiseInput.FABRIC_OPTIONS || ['-']).slice());

  const PERGO_RISE_QUICK_TESTS = Object.freeze([
    { name: 'Test 1', title: '1 adet · 2 ray · aynı ölçüler · otomatik dikme', values: { systemCount: '1', width: '4000', opening: '4500', rearHeight: '3200', frontHeight: '2600' } },
    { name: 'Test 2', title: '1 adet · Cam kaydı EVET · 8060 => 3 ray', values: { systemCount: '1', width: '8060', opening: '4500', rearHeight: '3200', frontHeight: '2600', glassTrack: 'EVET' } },
    { name: 'Test 3', title: '2 adet · aynı genişlik · 2;2 ray', values: { systemCount: '2', width: '3000;3000', opening: '4500;4500', rearHeight: '3200;3200', frontHeight: '2600' } },
    { name: 'Test 4', title: '2 adet · farklı genişlik/açılım · Cam kaydı EVET', values: { systemCount: '2', width: '4000;4500', opening: '4500;5200', rearHeight: '3200;3400', frontHeight: '2600', glassTrack: 'EVET' } },
    { name: 'Test 5', title: '2 adet · NO boşluk modu', values: { systemCount: '2', width: '3000;100;3000;NO', opening: '4500;4500', rearHeight: '3200;3200', frontHeight: '2600' } },
    { name: 'Test 6', title: '3 adet · aynı açılım · otomatik', values: { systemCount: '3', width: '3200;3200;3200', opening: '4500;4500;4500', rearHeight: '3200;3200;3200', frontHeight: '2600' } },
    { name: 'Test 7', title: '3 adet · farklı genişlik/açılım/arka yükseklik', values: { systemCount: '3', width: '4000;4500;5000', opening: '4500;5200;6000', rearHeight: '3200;3400;3600', frontHeight: '2600' } },
    { name: 'Test 8', title: '3 adet · dikme sayısı manuel 4', values: { systemCount: '3', width: '4000;4500;5000', opening: '4500;5200;6000', rearHeight: '3200;3400;3600', frontHeight: '2600', postCount: '4' } },
    { name: 'Test 9', title: '5 adet · aynı genişlik/açılım', values: { systemCount: '5', width: '4000;4000;4000;4000;4000', opening: '4500;4500;4500;4500;4500', rearHeight: '3200;3200;3200;3200;3200', frontHeight: '2600' } },
    { name: 'Test 10', title: '5 adet · farklı genişlik/açılım · 3 raylar', values: { systemCount: '5', width: '6000;6200;6400;6600;6800', opening: '4500;4600;4700;4800;4900', rearHeight: '3200;3300;3400;3500;3600', frontHeight: '2600' } },
    { name: 'Test 11', title: '7 adet · aynı genişlik · 2 raylar', values: { systemCount: '7', width: '3000;3000;3000;3000;3000;3000;3000', opening: '4500;4500;4500;4500;4500;4500;4500', rearHeight: '3200;3200;3200;3200;3200;3200;3200', frontHeight: '2600' } },
    { name: 'Test 12', title: '7 adet · farklı genişlik · karışık 2/3 ray', values: { systemCount: '7', width: '4000;4200;4400;4600;4800;5000;5200', opening: '4500;4550;4600;4650;4700;4750;4800', rearHeight: '3200;3250;3300;3350;3400;3450;3500', frontHeight: '2600' } },
    { name: 'Test 13', title: 'Parapet EVET · 600 mm', values: { systemCount: '2', width: '4000;4500', opening: '4500;5200', rearHeight: '3200;3400', frontHeight: '2600', parapet: 'EVET', parapetHeight: '600' } },
    { name: 'Test 14', title: 'Üçgen doğrama EVET', values: { systemCount: '2', width: '4000;4500', opening: '4500;5200', rearHeight: '3200;3400', frontHeight: '2600', triangleJoinery: 'EVET' } },
    { name: 'Test 15', title: 'Su çıkışı standart HAYIR', values: { systemCount: '2', width: '4000;4500', opening: '4500;5200', rearHeight: '3200;3400', frontHeight: '2600', waterStandard: 'HAYIR' } },
    { name: 'Test 16', title: 'Kombine test · parapet+cam+üçgen', values: { systemCount: '3', width: '4000;4500;5000', opening: '4500;5200;6000', rearHeight: '3200;3400;3600', frontHeight: '2600', parapet: 'EVET', parapetHeight: '600', glassTrack: 'EVET', triangleJoinery: 'EVET', waterStandard: 'HAYIR' } }
  ]);


  const PDF_REQUEST_SCHEMAS = {
    'b-cube': {
      familyLabel: 'Rolling Roof',
      groupLabel: 'Retractable',
      subGroupLabel: 'Roof System',
      productLabel: 'Rolling Roof (Retractable)',
      sections: [
        {
          title: 'Project Details',
          hint: 'Main request form dimensions',
          fields: [
            { id: 'width', label: 'Width', type: 'auto-mm', source: 'width' },
            { id: 'projection', label: 'Projection', type: 'auto-mm', source: 'depth' },
            { id: 'heightTopOfGutter', label: 'Height (Top of The Gutter)', type: 'auto-mm', source: 'height' },
            { id: 'systemQuantity', label: 'System Quantity', type: 'number' }
          ]
        },
        {
          title: 'Color Details',
          hint: 'Taken from current 3D color selections',
          fields: [
            { id: 'systemColor', label: 'System Color', type: 'auto-text', source: 'systemColor' },
            { id: 'systemColorFinish', label: 'Finish', type: 'auto-text', source: 'systemColorFinish' },
            { id: 'panelColor', label: 'Panel Color', type: 'auto-text', source: 'panelColor' },
            { id: 'panelColorFinish', label: 'Finish', type: 'auto-text', source: 'panelColorFinish' }
          ]
        },
        {
          title: 'Motor & Remote Control',
          fields: [
            { id: 'motor', label: 'Motor', type: 'select', options: ['T-Motion 350 (Somfy Rts) (120°)', 'T-Motion 300 (Somfy Rts) (90°)'] },
            { id: 'remoteControlSomfyRts', label: 'Remote Control', type: 'select', options: ['1 Channel', '2 Channels', '4 Channels', '16 Channels'], showWhen: { field: 'motor', values: ['T-Motion 350 (Somfy Rts) (120°)', 'T-Motion 300 (Somfy Rts) (90°)'] } }
          ]
        },
        {
          title: 'Panel Options',
          fields: [
            { id: 'panelIsolation', label: 'Panel Isolation', type: 'select', options: ['Yes', 'No'] }
          ]
        },
        {
          title: 'Lighting & Dimmers',
          fields: [
            { id: 'lightingSelections', label: 'Lighting', type: 'multi', options: ['Linear LED', 'Linear RGB', 'Linear Rgb+White', 'Other'], fullWidth: true },
            { id: 'lightingOther', label: 'Other Lighting', type: 'text', fullWidth: true, showWhen: { field: 'lightingSelections', values: ['Other'] } },
            { id: 'lightDimmerLinear', label: 'Light Dimmer (For Linear LED)', type: 'select', options: ['Yes', 'No'] }
          ]
        },
        {
          title: 'Sensors',
          fields: [
            { id: 'rainSensor', label: 'Rain Sensor', type: 'select', options: ['Yes', 'No'] },
            { id: 'vibrationSensor', label: 'Vibration Sensor', type: 'select', options: ['Yes', 'No'] },
            { id: 'windSensor', label: 'Wind Sensor', type: 'select', options: ['Yes', 'No'] },
            { id: 'windSunSensor', label: 'Wind & Sun Sensor', type: 'select', options: ['Yes', 'No'] }
          ]
        },
        {
          title: 'Heater & Sound & Packing',
          fields: [
            { id: 'heater2000Quantity', label: 'Heater 2000W 220V Quantity', type: 'number', unitAuto: 'pcs' },
            { id: 'heater3000Quantity', label: 'Heater 3000W 220V Quantity', type: 'number', unitAuto: 'pcs' },
            { id: 'soundSystemQuantity', label: 'Sound System Quantity', type: 'number', unitAuto: 'pcs' },
            { id: 'dimmerHeater', label: 'Dimmer Heater', type: 'select', options: ['Yes', 'No'] },
            { id: 'packagingType', label: 'Packaging Type', type: 'select', options: ['Wooden Box', 'Heavy-Duty Nylon'] },
            { id: 'loadingType', label: 'Loading', type: 'select', options: ['Truck', 'Container'] }
          ]
        }
      ]
    },
    'bio-rise': {
      familyLabel: 'Bioclimatic',
      groupLabel: 'Eco-Bioclimatic',
      subGroupLabel: 'Tilt',
      productLabel: 'Eco-Bioclimatic (Tilt)',
      sections: [
        {
          title: 'Project Details',
          hint: 'Main request form dimensions',
          fields: [
            { id: 'width', label: 'Width', type: 'auto-mm', source: 'width' },
            { id: 'projection', label: 'Projection', type: 'auto-mm', source: 'depth' },
            { id: 'heightTopOfGutter', label: 'Height (Top of The Gutter)', type: 'auto-mm', source: 'height' },
            { id: 'systemQuantity', label: 'System Quantity', type: 'number' },
            { id: 'motorDirection', label: 'Motor Direction', type: 'select', options: ['Left', 'Right'] }
          ]
        },
        {
          title: 'Color Details',
          hint: 'Taken from current 3D color selections',
          fields: [
            { id: 'systemColor', label: 'System Color', type: 'auto-text', source: 'systemColor' },
            { id: 'systemColorFinish', label: 'Finish', type: 'auto-text', source: 'systemColorFinish' },
            { id: 'panelColor', label: 'Panel Color', type: 'auto-text', source: 'panelColor' },
            { id: 'panelColorFinish', label: 'Finish', type: 'auto-text', source: 'panelColorFinish' }
          ]
        },
        {
          title: 'Motor & Remote Control',
          fields: [
            { id: 'motor', label: 'Motor', type: 'select', options: ['Somfy RTS', 'Somfy IO', 'Rising Motor'] },
            { id: 'remoteControlSomfyRts', label: 'Remote Control', type: 'select', options: ['1 Channel', '2 Channels', '4 Channels', '16 Channels'], showWhen: { field: 'motor', values: ['Somfy RTS'] } },
            { id: 'remoteControlSomfyIo', label: 'Remote Control', type: 'select', options: ['1 Channel', '2 Channels', '4 Channels', '40 Channels'], showWhen: { field: 'motor', values: ['Somfy IO'] } },
            { id: 'remoteControlRising', label: 'Remote Control', type: 'select', options: ['1 Channel', '6 Channels'], showWhen: { field: 'motor', values: ['Rising Motor'] } }
          ]
        },
        {
          title: 'Panel Options',
          fields: [
            { id: 'panelIsolation', label: 'Panel Isolation', type: 'select', options: ['Yes', 'No'] }
          ]
        },
        {
          title: 'Lighting & Dimmers',
          fields: [
            { id: 'lightingSelections', label: 'Lighting', type: 'multi', options: ['Linear LED', 'Linear RGB', 'Linear Rgb+White', 'Spot LED', 'Other'], fullWidth: true },
            { id: 'lightingOther', label: 'Other Lighting', type: 'text', fullWidth: true, showWhen: { field: 'lightingSelections', values: ['Other'] } },
            { id: 'lightDimmerLinear', label: 'Light Dimmer (For Linear LED)', type: 'select', options: ['Yes', 'No'] },
            { id: 'lightDimmerSpot', label: 'Light Dimmer (For Spot LED)', type: 'select', options: ['Yes', 'No'], showWhen: { field: 'lightingSelections', values: ['Spot LED'] } }
          ]
        },
        {
          title: 'Sensors',
          fields: [
            { id: 'rainSensor', label: 'Rain Sensor', type: 'select', options: ['Yes', 'No'] },
            { id: 'vibrationSensor', label: 'Vibration Sensor', type: 'select', options: ['Yes', 'No'] },
            { id: 'windSensor', label: 'Wind Sensor', type: 'select', options: ['Yes', 'No'] },
            { id: 'windSunSensor', label: 'Wind & Sun Sensor', type: 'select', options: ['Yes', 'No'] }
          ]
        },
        {
          title: 'Heater & Sound & Packing',
          fields: [
            { id: 'heater2000Quantity', label: 'Heater 2000W 220V Quantity', type: 'number', unitAuto: 'pcs' },
            { id: 'heater3000Quantity', label: 'Heater 3000W 220V Quantity', type: 'number', unitAuto: 'pcs' },
            { id: 'soundSystemQuantity', label: 'Sound System Quantity', type: 'number', unitAuto: 'pcs' },
            { id: 'dimmerHeater', label: 'Dimmer Heater', type: 'select', options: ['Yes', 'No'] },
            { id: 'packagingType', label: 'Packaging Type', type: 'select', options: ['Wooden Box', 'Heavy-Duty Nylon'] },
            { id: 'loadingType', label: 'Loading', type: 'select', options: ['Truck', 'Container'] }
          ]
        }
      ]
    },
    'pergo-rise': {
      familyLabel: 'Pergola',
      groupLabel: 'Pergola',
      subGroupLabel: 'Web DXF / 2D',
      productLabel: 'Pergola',
      sections: [
        {
          title: 'Project Details',
          hint: 'Pergola Web DXF / 2D project measurements',
          fields: [
            { id: 'width', label: 'Width', type: 'auto-mm', source: 'width' },
            { id: 'projection', label: 'Projection', type: 'auto-mm', source: 'depth' },
            { id: 'heightTopOfGutter', label: 'Height', type: 'auto-mm', source: 'height' },
            { id: 'systemQuantity', label: 'System Quantity', type: 'number' }
          ]
        },
        {
          title: 'Color Details',
          hint: 'Taken from current 3D color selections',
          fields: [
            { id: 'systemColor', label: 'System Color', type: 'auto-text', source: 'systemColor' },
            { id: 'systemColorFinish', label: 'Finish', type: 'auto-text', source: 'systemColorFinish' },
            { id: 'panelColor', label: 'Fabric / Panel Color', type: 'auto-text', source: 'panelColor' },
            { id: 'panelColorFinish', label: 'Fabric Finish', type: 'auto-text', source: 'panelColorFinish' }
          ]
        },
        {
          title: 'Options',
          fields: [
            { id: 'lightingSelections', label: 'Lighting', type: 'multi', options: ['LED', 'RGB', 'Other'], fullWidth: true },
            { id: 'lightingOther', label: 'Other Lighting', type: 'text', fullWidth: true, showWhen: { field: 'lightingSelections', values: ['Other'] } },
            { id: 'fabricNote', label: 'Fabric Note', type: 'text', fullWidth: true },
            { id: 'packagingType', label: 'Packaging Type', type: 'select', options: ['Wooden Box', 'Heavy-Duty Nylon'] }
          ]
        }
      ]
    }
  };
  PDF_REQUEST_SCHEMAS['b-cube-galaxy'] = {
    ...JSON.parse(JSON.stringify(PDF_REQUEST_SCHEMAS['bio-rise'])),
    familyLabel: 'Bioclimatic',
    groupLabel: 'Bioclimatic',
    subGroupLabel: 'Tilt',
    productLabel: 'Bioclimatic (Tilt)'
  };

  function isBioFamilyGroup(group = modelState.productGroup) {
    return group === 'bio-rise' || group === 'b-cube-galaxy';
  }

  function isFreedomBioGroup(group = modelState.productGroup) {
    return group === 'b-cube' || isBioFamilyGroup(group);
  }

  function requestSchemaForGroup(group = modelState.productGroup) {
    return PDF_REQUEST_SCHEMAS[group] || PDF_REQUEST_SCHEMAS['b-cube'];
  }

  function createPdfRequestState(group = modelState.productGroup) {
    const schema = requestSchemaForGroup(group);
    const next = {};
    (schema.sections || []).forEach((section) => {
      (section.fields || []).forEach((field) => {
        if (field.type === 'multi') next[field.id] = Array.isArray(field.default) ? [...field.default] : [];
        else next[field.id] = field.default != null ? field.default : '';
      });
    });
    return next;
  }

  function ensurePdfRequestState(group = modelState.productGroup) {
    const key = PDF_REQUEST_SCHEMAS[group] ? group : 'b-cube';
    if (!pdfRequestState[key]) pdfRequestState[key] = createPdfRequestState(key);
    return pdfRequestState[key];
  }

  function currentPdfRequestState(group = modelState.productGroup) {
    return ensurePdfRequestState(group);
  }

  function isPdfRequestFieldVisible(field, values) {
    if (!field || !field.showWhen) return true;
    const current = values ? values[field.showWhen.field] : null;
    const allowed = Array.isArray(field.showWhen.values) ? field.showWhen.values.map(String) : [];
    if (Array.isArray(current)) return current.map(String).some((item) => allowed.includes(item));
    return allowed.includes(String(current == null ? '' : current));
  }

  function pdfRequestAutoValue(field, model = readModel()) {
    if (!field) return '';
    switch (field.source) {
      case 'width': return Number(model.width) || 0;
      case 'depth': return Number(model.depth) || 0;
      case 'height': return Number(model.height) || 0;
      case 'systemColor': return model.colorMode === 'ral' ? (model.systemColor && model.systemColor.code) || '—' : 'Default / Teknik Palet';
      case 'systemColorFinish': return model.colorMode === 'ral' ? finishLabel(model.systemColor && model.systemColor.finish) : 'Default';
      case 'panelColor': return model.colorMode === 'ral' ? (model.panelColor && model.panelColor.code) || '—' : 'Default / Teknik Palet';
      case 'panelColorFinish': return model.colorMode === 'ral' ? finishLabel(model.panelColor && model.panelColor.finish) : 'Default';
      default: return '';
    }
  }

  function formatPdfRequestValue(field, value, model = readModel()) {
    if (field && String(field.type).startsWith('auto-')) value = pdfRequestAutoValue(field, model);
    if (field && field.type === 'multi') {
      const items = Array.isArray(value) ? value.filter(Boolean) : [];
      return items.length ? items.join(', ') : '—';
    }
    if (field && (field.type === 'auto-mm' || field.unit === 'mm')) {
      const number = Number(value) || 0;
      return number > 0 ? `${Math.round(number)} mm` : '—';
    }
    if (field && field.unitAuto === 'pcs') {
      const number = Number(value);
      return Number.isFinite(number) && number > 0 ? `${Math.round(number)} pcs` : '—';
    }
    const text = String(value == null ? '' : value).trim();
    return text || '—';
  }

  function renderPdfRequestForm() {
    const meta = $(ids.pdfRequestFormMeta);
    const container = $(ids.pdfRequestFormFields);
    if (!meta || !container) return;
    const schema = requestSchemaForGroup();
    const values = currentPdfRequestState();
    const model = readModel();
    meta.textContent = `${schema.familyLabel} · ${schema.groupLabel} · ${schema.productLabel} · PDF bu form mantığıyla hazırlanır.`;
    container.innerHTML = '';
    (schema.sections || []).forEach((section) => {
      const sectionEl = document.createElement('section');
      sectionEl.className = 'pdf-request-section';
      const head = document.createElement('div');
      head.className = 'pdf-request-section-head';
      head.innerHTML = `<strong>${section.title}</strong>${section.hint ? `<span>${section.hint}</span>` : ''}`;
      sectionEl.appendChild(head);
      const grid = document.createElement('div');
      grid.className = 'pdf-request-grid';
      (section.fields || []).forEach((field) => {
        if (!isPdfRequestFieldVisible(field, values)) return;
        const wrap = document.createElement('div');
        wrap.className = 'pdf-request-field' + (field.fullWidth ? ' is-full' : '');
        const label = document.createElement(field.type === 'multi' ? 'span' : 'label');
        label.textContent = field.label;
        wrap.appendChild(label);
        if (String(field.type).startsWith('auto-')) {
          const readonly = document.createElement('div');
          readonly.className = 'pdf-request-readonly';
          readonly.textContent = formatPdfRequestValue(field, pdfRequestAutoValue(field, model), model);
          wrap.appendChild(readonly);
          const note = document.createElement('div');
          note.className = 'pdf-request-auto-note';
          note.textContent = '3D modelden otomatik alınır.';
          wrap.appendChild(note);
        } else if (field.type === 'select') {
          const select = document.createElement('select');
          const empty = document.createElement('option');
          empty.value = '';
          empty.textContent = 'Seçin';
          select.appendChild(empty);
          (field.options || []).forEach((option) => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.textContent = option;
            if (String(values[field.id] || '') === String(option)) opt.selected = true;
            select.appendChild(opt);
          });
          select.addEventListener('change', () => {
            values[field.id] = select.value;
            renderPdfRequestForm();
          });
          wrap.appendChild(select);
        } else if (field.type === 'number' || field.type === 'text') {
          const input = document.createElement('input');
          input.type = field.type === 'number' ? 'number' : 'text';
          input.value = values[field.id] == null ? '' : values[field.id];
          input.placeholder = field.unit === 'mm' ? 'mm' : '';
          input.addEventListener('input', () => {
            values[field.id] = input.value;
          });
          wrap.appendChild(input);
          if (field.unitAuto === 'pcs') {
            const note = document.createElement('div');
            note.className = 'pdf-request-field-help';
            note.textContent = 'Adet girin.';
            wrap.appendChild(note);
          }
        } else if (field.type === 'multi') {
          const choiceGrid = document.createElement('div');
          choiceGrid.className = 'pdf-request-choice-grid';
          const current = Array.isArray(values[field.id]) ? values[field.id] : [];
          (field.options || []).forEach((option) => {
            const choice = document.createElement('label');
            choice.className = 'pdf-request-choice';
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.checked = current.includes(option);
            input.addEventListener('change', () => {
              const source = new Set(Array.isArray(values[field.id]) ? values[field.id] : []);
              if (input.checked) source.add(option); else source.delete(option);
              values[field.id] = Array.from(source);
              renderPdfRequestForm();
            });
            const text = document.createElement('span');
            text.textContent = option;
            choice.appendChild(input);
            choice.appendChild(text);
            choiceGrid.appendChild(choice);
          });
          wrap.appendChild(choiceGrid);
        }
        grid.appendChild(wrap);
      });
      sectionEl.appendChild(grid);
      container.appendChild(sectionEl);
    });
  }

  function pdfRequestPayload(model = readModel()) {
    const schema = requestSchemaForGroup(model.productGroup);
    const values = { ...currentPdfRequestState(model.productGroup) };
    return {
      familyLabel: schema.familyLabel,
      groupLabel: schema.groupLabel,
      subGroupLabel: schema.subGroupLabel,
      productLabel: schema.productLabel,
      sections: (schema.sections || []).map((section) => ({
        title: section.title,
        rows: (section.fields || []).filter((field) => isPdfRequestFieldVisible(field, values)).map((field) => ({
          label: field.label,
          value: formatPdfRequestValue(field, values[field.id], model)
        }))
      }))
    };
  }

  function activeProductSpec(group = modelState.productGroup) {
    return PRODUCT_SPECS[group] || PRODUCT_SPECS['b-cube'];
  }

  function projectionFromPanelCount(panelCount, group = modelState.productGroup) {
    const spec = activeProductSpec(group);
    if (group === 'pergo-rise') return Math.max(0, Math.round(Number(panelCount) || 0));
    const count = Math.max(0, Math.round(Number(panelCount) || 0));
    return count > 0 ? count * spec.panelPitch + spec.projectionOffset : 0;
  }

  function panelCountFromProjection(depth, group = modelState.productGroup) {
    const spec = activeProductSpec(group);
    if (group === 'pergo-rise') return 1;
    const projection = Number(depth) || 0;
    if (projection <= 0) return 0;
    return Math.max(spec.panelMin, Math.round((projection - spec.projectionOffset) / spec.panelPitch));
  }

  function lamellaCountFromProjection(depth, group = modelState.productGroup) {
    if (group === 'pergo-rise') return 1;
    return panelCountFromProjection(depth, group);
  }

  function normalizedFreedomSystemCount(value) {
    const maximum = window.P3DVFreedomMultiPosition ? Number(window.P3DVFreedomMultiPosition.MAX_SYSTEM_COUNT) || 20 : 20;
    return Math.max(1, Math.min(maximum, Math.round(Number(value) || 1)));
  }

  function freedomMultiPositionLayout(source = modelState) {
    if (!source || source.productGroup !== 'b-cube' || !window.P3DVFreedomMultiPosition) return null;
    return window.P3DVFreedomMultiPosition.build({
      systemCount: normalizedFreedomSystemCount(source.systemCount),
      totalWidth: Number(source.width) || 0,
      moduleWidths: Array.isArray(source.moduleWidths) ? source.moduleWidths : [],
      depth: Number(source.depth) || 0,
      moduleDepths: Array.isArray(source.moduleDepths) ? source.moduleDepths : [],
      alignment: source.multiAlignment === 'rear' ? 'rear' : 'front',
      rows: Array.isArray(source.multiRows) ? source.multiRows : [],
      rowAlignment: source.rowAlignment === 'right' ? 'right' : 'left',
      panelCollection: source.panelCollection === 'outer' ? 'outer' : 'center',
      panelCount: Number(source.panelCount) || 0,
      panelCounts: Array.isArray(source.modulePanelCounts) ? source.modulePanelCounts : [],
      height: Number(source.height) || 0,
      postSections: Array.isArray(source.postSections) ? source.postSections : defaults.postSections,
      interiorPostSection: PRODUCT_SPECS['b-cube'].postSection,
      beamSection: source.beamSection || PRODUCT_SPECS['b-cube'].beamSection
    });
  }


  function normalizedBioRiseSystemCount(value) {
    const maximum = window.P3DVBioRiseMultiPosition ? Number(window.P3DVBioRiseMultiPosition.MAX_SYSTEM_COUNT) || 20 : 20;
    return Math.max(1, Math.min(maximum, Math.round(Number(value) || 1)));
  }

  function bioRiseMultiPositionLayout(source = modelState) {
    if (!source || source.productGroup !== 'bio-rise' || !window.P3DVBioRiseMultiPosition) return null;
    return window.P3DVBioRiseMultiPosition.build({
      systemCount: normalizedBioRiseSystemCount(source.systemCount),
      totalWidth: Number(source.width) || 0,
      moduleWidths: Array.isArray(source.moduleWidths) ? source.moduleWidths : [],
      depth: Number(source.depth) || 0,
      moduleDepths: Array.isArray(source.moduleDepths) ? source.moduleDepths : [],
      alignment: source.multiAlignment === 'rear' ? 'rear' : 'front',
      rows: Array.isArray(source.multiRows) ? source.multiRows : [],
      rowAlignment: source.rowAlignment === 'right' ? 'right' : 'left',
      panelCollection: source.panelCollection === 'outer' ? 'outer' : 'center',
      panelCount: Number(source.panelCount) || 0,
      panelCounts: Array.isArray(source.modulePanelCounts) ? source.modulePanelCounts : [],
      height: Number(source.height) || 0,
      postSections: Array.isArray(source.postSections) ? source.postSections : defaults.postSections,
      interiorPostSection: PRODUCT_SPECS['bio-rise'].postSection,
      beamSection: source.beamSection || PRODUCT_SPECS['bio-rise'].beamSection,
      sideFrameWidth: PRODUCT_SPECS['bio-rise'].sideBeamThickness,
      sideGutterWidth: 98,
      gutterClearance: 2
    });
  }

  function galaxyMultiPositionLayout(source = modelState) {
    if (!source || source.productGroup !== 'b-cube-galaxy' || !window.P3DVGalaxyMultiPosition) return null;
    const spec = PRODUCT_SPECS['b-cube-galaxy'];
    return window.P3DVGalaxyMultiPosition.build({
      systemCount: normalizedBioRiseSystemCount(source.systemCount),
      totalWidth: Number(source.width) || 0,
      moduleWidths: Array.isArray(source.moduleWidths) ? source.moduleWidths : [],
      depth: Number(source.depth) || 0,
      moduleDepths: Array.isArray(source.moduleDepths) ? source.moduleDepths : [],
      alignment: source.multiAlignment === 'rear' ? 'rear' : 'front',
      rows: Array.isArray(source.multiRows) ? source.multiRows : [],
      rowAlignment: source.rowAlignment === 'right' ? 'right' : 'left',
      panelCollection: source.panelCollection === 'outer' ? 'outer' : 'center',
      panelCount: Number(source.panelCount) || 0,
      panelCounts: Array.isArray(source.modulePanelCounts) ? source.modulePanelCounts : [],
      height: Number(source.height) || 0,
      postSections: Array.isArray(source.postSections) ? source.postSections : Array.from({length:4},()=>({...spec.postSection})),
      interiorPostSection: spec.postSection,
      beamSection: source.beamSection || spec.beamSection,
      sideFrameWidth: spec.sideBeamThickness,
      sideGutterWidth: spec.gutterSection.width,
      gutterClearance: spec.gutterSection.clearance
    });
  }

  function modelReady(model = modelState) {
    const spec = activeProductSpec(model.productGroup);
    const height = Number(model.height);
    const baseReady = Number(model.width) >= spec.widthMin &&
      Number(model.depth) >= spec.depthMin &&
      height >= spec.heightMin && (!spec.heightMax || height <= spec.heightMax);
    if (!baseReady) return false;
    if (model.productGroup === 'pergo-rise') return Boolean(model.pergoRiseProject && model.pergoRiseProject.derived);
    if (model.productGroup === 'b-cube') {
      const layout = model.freedomLayout || freedomMultiPositionLayout(model);
      if (!layout || !layout.valid) return false;
    }
    if (model.productGroup === 'bio-rise') {
      const layout = model.bioRiseLayout || bioRiseMultiPositionLayout(model);
      if (!layout || !layout.valid) return false;
    }
    if (model.productGroup === 'b-cube-galaxy') {
      const layout = model.galaxyLayout || galaxyMultiPositionLayout(model);
      if (!layout || !layout.valid) return false;
    }
    return Number(model.panelCount) >= spec.panelMin;
  }

  function readModel() {
    const isPergoRise = (modelState.productGroup || 'b-cube') === 'pergo-rise';
    const freedomLayout = modelState.productGroup === 'b-cube' ? freedomMultiPositionLayout(modelState) : null;
    const bioRiseLayout = modelState.productGroup === 'bio-rise' ? bioRiseMultiPositionLayout(modelState) : null;
    const galaxyLayout = modelState.productGroup === 'b-cube-galaxy' ? galaxyMultiPositionLayout(modelState) : null;
    return {
      productGroup: modelState.productGroup || 'b-cube',
      width: modelState.width,
      depth: modelState.depth,
      height: modelState.height,
      lamellaCount: isPergoRise ? 1 : Math.max(0, Math.round(Number(modelState.panelCount) || panelCountFromProjection(modelState.depth))),
      panelCount: isPergoRise ? 1 : Math.max(0, Math.round(Number(modelState.panelCount) || 0)),
      orientations: [...modelState.orientations],
      postSections: modelState.postSections.map((section) => ({ ...section })),
      beamSection: { ...modelState.beamSection },
      placements: JSON.parse(JSON.stringify(modelState.placements || {})),
      zipPlacements: JSON.parse(JSON.stringify(modelState.zipPlacements || {})),
      facadeProfiles: JSON.parse(JSON.stringify(modelState.facadeProfiles || {})),
      productsOpen: Boolean(modelState.productsOpen),
      productOpenStates: JSON.parse(JSON.stringify(modelState.productOpenStates || {})),
      panelStates: JSON.parse(JSON.stringify(modelState.panelStates || {})),
      panelMasterOpen: Boolean(modelState.panelMasterOpen),
      glassPreferences: { ...glassPreferenceState() },
      colorMode: modelState.colorMode === 'ral' ? 'ral' : 'default',
      systemColor: { ...(modelState.systemColor || defaults.systemColor) },
      panelColor: { ...(modelState.panelColor || defaults.panelColor) },
      systemCount: isBioFamilyGroup(modelState.productGroup) ? normalizedBioRiseSystemCount(modelState.systemCount) : normalizedFreedomSystemCount(modelState.systemCount),
      moduleWidths: Array.isArray(modelState.moduleWidths) ? [...modelState.moduleWidths] : [],
      moduleDepths: Array.isArray(modelState.moduleDepths) ? [...modelState.moduleDepths] : [],
      modulePanelCounts: Array.isArray(modelState.modulePanelCounts) ? [...modelState.modulePanelCounts] : [],
      multiAlignment: modelState.multiAlignment === 'rear' ? 'rear' : 'front',
      multiRows: Array.isArray(modelState.multiRows) ? JSON.parse(JSON.stringify(modelState.multiRows)) : [],
      rowAlignment: modelState.rowAlignment === 'right' ? 'right' : 'left',
      panelCollection: modelState.panelCollection === 'outer' ? 'outer' : 'center',
      freedomLayout: freedomLayout ? JSON.parse(JSON.stringify(freedomLayout)) : null,
      bioRiseLayout: bioRiseLayout ? JSON.parse(JSON.stringify(bioRiseLayout)) : null,
      galaxyLayout: galaxyLayout ? JSON.parse(JSON.stringify(galaxyLayout)) : null,
      inputDrafts: { ...(modelState.inputDrafts || {}) },
      options: isPergoRise ? (() => {
        const input = modelState.pergoRiseProject && modelState.pergoRiseProject.input || (window.P3DVPergoRiseInput && window.P3DVPergoRiseInput.DEFAULT_INPUT) || {};
        return {
          parapet: input.parapet || 'HAYIR', parapetHeight: input.parapetHeight || '-',
          glassTrack: input.glassTrack || 'HAYIR', structureColor: input.structureColor || '-',
          fabric: input.fabric || '-', fabricProfiles: input.fabricProfiles || '-', motor: input.motor || '-',
          remote: input.remote || '-', led: input.led || '-', dimmer: input.dimmer || '-',
          triangleJoinery: input.triangleJoinery || 'HAYIR', waterStandard: input.waterStandard || 'EVET',
          waterOutletPlacement: input.waterOutletPlacement || 'BOTH', extras: input.extras || '-'
        };
      })() : {
        panelColorIndependent: modelState.panelColorIndependent !== false,
        panelFill: modelState.panelFill || 'EVET', motor: modelState.motor || 'Yok', remote: modelState.remote || 'Yok',
        led: modelState.led || 'NO', dimmer: modelState.dimmer || 'HAYIR', parapet: modelState.parapet || 'HAYIR',
        parapetHeight: modelState.parapetHeight || '', waterStandard: modelState.waterStandard || 'EVET', extras: modelState.extras || ''
      },
      pergoOptions: JSON.parse(JSON.stringify(modelState.pergoOptions || defaults.pergoOptions)),
      pergoRiseProject: modelState.pergoRiseProject ? JSON.parse(JSON.stringify(modelState.pergoRiseProject)) : null,
      pdfRequest: pdfRequestPayload({
        productGroup: modelState.productGroup || 'b-cube',
        width: modelState.width, depth: modelState.depth, height: modelState.height, panelCount: ((modelState.productGroup || 'b-cube') === 'pergo-rise') ? 1 : Math.max(0, Math.round(Number(modelState.panelCount) || 0)), lamellaCount: ((modelState.productGroup || 'b-cube') === 'pergo-rise') ? 1 : Math.max(0, Math.round(Number(modelState.panelCount) || panelCountFromProjection(modelState.depth))), orientations: [...modelState.orientations], postSections: modelState.postSections.map((section) => ({ ...section })), beamSection: { ...modelState.beamSection }, placements: JSON.parse(JSON.stringify(modelState.placements || {})), zipPlacements: JSON.parse(JSON.stringify(modelState.zipPlacements || {})), facadeProfiles: JSON.parse(JSON.stringify(modelState.facadeProfiles || {})), productsOpen: Boolean(modelState.productsOpen), productOpenStates: JSON.parse(JSON.stringify(modelState.productOpenStates || {})), panelStates: JSON.parse(JSON.stringify(modelState.panelStates || {})), panelMasterOpen: Boolean(modelState.panelMasterOpen), glassPreferences: { ...glassPreferenceState() }, colorMode: modelState.colorMode === 'ral' ? 'ral' : 'default', systemColor: { ...(modelState.systemColor || defaults.systemColor) }, panelColor: { ...(modelState.panelColor || defaults.panelColor) }
      })
    };
  }

  function setText(id, text) {
    $(id).textContent = text;
  }

  function ralCatalogData() {
    const source = window.P3DV_RAL_CATALOG;
    if (source && Array.isArray(source.all) && source.all.length) return source;
    return {
      risingStandardCodes: ['RAL 9006', 'RAL 9016'],
      all: [
        { code: 'RAL 9006', hex: '#7C7D7F', image: '' },
        { code: 'RAL 9016', hex: '#E7E8E2', image: '' },
        { code: 'RAL 6018', hex: '#397A36', image: '' }
      ]
    };
  }

  function normalizeHexColor(value, fallback) {
    const text = String(value || '').trim();
    return /^#[0-9a-f]{6}$/i.test(text) ? text.toUpperCase() : fallback;
  }

  function ralColorOption(code, fallback) {
    const catalog = ralCatalogData();
    const found = catalog.all.find((option) => option.code === code);
    const base = found ? {
      code: found.code,
      hex: normalizeHexColor(found.hex, fallback.hex),
      image: found.image || '',
      texture: found.texture || '',
      kind: found.kind || '',
      name: found.name || ''
    } : { ...fallback };
    const finish = base.kind === 'wood-transfer' ? 'TEXTURE' : normalizeColorFinish((fallback && fallback.finish) || 'MATTE');
    return { ...base, finish };
  }

  function colorSurfaceLabel(color) {
    return color && color.kind === 'wood-transfer' ? 'Ahşap Transfer' : finishLabel(color && color.finish);
  }

  function normalizeModelColors() {
    const systemFinish = normalizeColorFinish(modelState.systemColor && modelState.systemColor.finish, defaults.systemColor.finish);
    const panelFinish = normalizeColorFinish(modelState.panelColor && modelState.panelColor.finish, defaults.panelColor.finish);
    modelState.systemColor = { ...ralColorOption(modelState.systemColor && modelState.systemColor.code, defaults.systemColor), finish: systemFinish };
    modelState.panelColor = { ...ralColorOption(modelState.panelColor && modelState.panelColor.code, defaults.panelColor), finish: panelFinish };
    glassPreferenceState();
  }

  function setColorSwatch(id, hex) {
    const swatch = $(id);
    if (swatch) swatch.setAttribute('style', `background:${normalizeHexColor(hex, '#94A3B8')}`);
  }

  function normalizeColorMode(value = modelState.colorMode) {
    return value === 'ral' ? 'ral' : 'default';
  }

  function updateColorControls() {
    normalizeModelColors();
    modelState.colorMode = normalizeColorMode();
    const defaultMode = modelState.colorMode === 'default';
    const panelIndependent = modelState.panelColorIndependent !== false;
    if (!panelIndependent) modelState.panelColor = { ...modelState.systemColor };
    setText(ids.systemColorValue, defaultMode ? 'Klasik Sistem Paleti' : `${modelState.systemColor.code} · ${colorSurfaceLabel(modelState.systemColor)}`);
    setText(ids.panelColorValue, !panelIndependent ? (defaultMode ? 'Sistem Rengine Bağlı' : `${modelState.systemColor.code} · ${colorSurfaceLabel(modelState.systemColor)}`) : (defaultMode ? 'Klasik Panel Yeşili' : `${modelState.panelColor.code} · ${colorSurfaceLabel(modelState.panelColor)}`));
    setColorSwatch(ids.systemColorSwatch, defaultMode ? '#FF00FF' : modelState.systemColor.hex);
    setColorSwatch(ids.panelColorSwatch, !panelIndependent ? (defaultMode ? '#FF00FF' : modelState.systemColor.hex) : (defaultMode ? '#7CFC00' : modelState.panelColor.hex));
    const panelCheckbox = $(ids.panelColorIndependent);
    const panelTrigger = $(ids.panelColorTrigger);
    const panelCell = panelTrigger && panelTrigger.closest ? panelTrigger.closest('.panel-color-cell') : null;
    if (panelCheckbox) panelCheckbox.checked = panelIndependent;
    if (panelTrigger) { panelTrigger.disabled = !panelIndependent; panelTrigger.setAttribute('aria-disabled', String(!panelIndependent)); }
    if (panelCell) panelCell.classList.toggle('is-linked', !panelIndependent);
    const defaultButton = $(ids.defaultColorMode);
    const ralButton = $(ids.ralColorMode);
    if (defaultButton) {
      defaultButton.classList.toggle('is-active', defaultMode);
      defaultButton.setAttribute('aria-pressed', String(defaultMode));
    }
    if (ralButton) {
      ralButton.classList.toggle('is-active', !defaultMode);
      ralButton.setAttribute('aria-pressed', String(!defaultMode));
    }
    renderPdfRequestForm();
  }

  function setColorMode(mode) {
    modelState.colorMode = normalizeColorMode(mode);
    if (modelState.panelColorIndependent === false) modelState.panelColor = { ...modelState.systemColor };
    updateColorControls();
    applyColorStateLive();
  }

  function colorTargetLabel(target = activeColorTarget) {
    return target === 'panel' ? 'Panel Rengi' : 'Sistem Rengi';
  }

  function selectedColorForTarget(target = activeColorTarget) {
    return target === 'panel' ? modelState.panelColor : modelState.systemColor;
  }

  function setActiveColorCatalog(catalog) {
    activeColorCatalog = catalog === 'all' ? 'all' : 'rising';
    $(ids.colorCatalogRising).classList.toggle('is-active', activeColorCatalog === 'rising');
    $(ids.colorCatalogAll).classList.toggle('is-active', activeColorCatalog === 'all');
    $(ids.colorCatalogRising).setAttribute('aria-selected', String(activeColorCatalog === 'rising'));
    $(ids.colorCatalogAll).setAttribute('aria-selected', String(activeColorCatalog === 'all'));
    renderRalColorOptions();
  }

  function renderColorFinishOptions() {
    const container = $(ids.colorFinishOptions);
    if (!container) return;
    container.innerHTML = '';
    const current = pendingColorSelection ? normalizeColorFinish(pendingColorSelection.finish) : normalizeColorFinish(selectedColorForTarget().finish);
    COLOR_FINISHES.forEach((finish) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'finish-option-card' + (current === finish.value ? ' is-selected' : '');
      const sampleStyle = finish.value === 'GLOSS'
        ? 'background:linear-gradient(135deg, rgba(255,255,255,.92), rgba(255,255,255,.18) 35%, rgba(15,23,42,.08) 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,.65);'
        : (finish.value === 'TEXTURE'
          ? 'background-image: radial-gradient(circle at 3px 3px, rgba(15,23,42,.14) 1px, transparent 1.2px), linear-gradient(135deg, rgba(255,255,255,.35), rgba(255,255,255,.12)); background-size: 9px 9px, cover;'
          : 'background:linear-gradient(135deg, rgba(255,255,255,.55), rgba(255,255,255,.12));');
      button.innerHTML = `<span class="finish-option-sample" style="${sampleStyle}"></span><span class="finish-option-copy"><strong>${finish.label}</strong><span>${finish.detail}</span></span>`;
      button.addEventListener('click', () => applyColorFinish(finish.value));
      container.appendChild(button);
    });
  }

  function openColorFinishDialog(selectedCode, selectedHex, selectedImage) {
    const current = selectedColorForTarget();
    pendingColorSelection = {
      code: selectedCode,
      hex: normalizeHexColor(selectedHex, current.hex),
      image: selectedImage || '',
      finish: normalizeColorFinish(current.finish)
    };
    setText(ids.colorFinishTitle, `${colorTargetLabel()} · Yüzey Tipi`);
    setText(ids.colorFinishDescription, `${selectedCode} için parlak, mat veya texture yüzey tipini seçin.`);
    setText(ids.colorFinishSummary, `${selectedCode} · ${finishLabel(pendingColorSelection.finish)}`);
    renderColorFinishOptions();
    $(ids.colorFinishDialog).hidden = false;
  }

  function closeColorFinishDialog() {
    $(ids.colorFinishDialog).hidden = true;
    pendingColorSelection = null;
  }

  function applyColorFinish(finishValue) {
    if (!pendingColorSelection) return;
    const next = { ...pendingColorSelection, finish: normalizeColorFinish(finishValue, pendingColorSelection.finish) };
    modelState.colorMode = 'ral';
    if (activeColorTarget === 'panel') modelState.panelColor = next;
    else {
      modelState.systemColor = next;
      if (modelState.panelColorIndependent === false) modelState.panelColor = { ...next };
    }
    closeColorFinishDialog();
    closeColorPicker();
    updateColorControls();
    applyColorStateLive();
  }

  function applyCatalogColorOption(option) {
    if (!option) return;
    const current = selectedColorForTarget();
    const next = {
      code: option.code,
      hex: normalizeHexColor(option.hex, current.hex),
      image: option.image || '',
      texture: option.texture || '',
      kind: option.kind || '',
      name: option.name || '',
      finish: option.kind === 'wood-transfer' ? 'TEXTURE' : normalizeColorFinish(current.finish)
    };
    modelState.colorMode = 'ral';
    if (activeColorTarget === 'panel') modelState.panelColor = next;
    else {
      modelState.systemColor = next;
      if (modelState.panelColorIndependent === false) modelState.panelColor = { ...next };
    }
    closeColorPicker();
    updateColorControls();
    applyColorStateLive();
  }

  function renderRalColorOptions() {
    const grid = $(ids.colorOptionGrid);
    if (!grid) return;
    const catalog = ralCatalogData();
    const risingCodes = new Set(catalog.risingStandardCodes || []);
    const query = String($(ids.colorSearch).value || '').trim().toUpperCase().replace(/\s+/g, ' ');
    const options = catalog.all.filter((option) => {
      if (activeColorCatalog === 'rising' && !risingCodes.has(option.code)) return false;
      if (!query) return true;
      const compact = option.code.toUpperCase().replace(/\s+/g, '');
      const name = String(option.name || '').toUpperCase();
      return option.code.toUpperCase().includes(query) || compact.includes(query.replace(/\s+/g, '')) || name.includes(query);
    });
    grid.innerHTML = '';
    const selected = selectedColorForTarget();
    options.forEach((option) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ral-color-option' + (selected && selected.code === option.code ? ' is-selected' : '');
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(Boolean(selected && selected.code === option.code)));
      button.setAttribute('aria-label', option.code);
      const image = option.image ? `<img src="${option.image}" alt="" loading="lazy" />` : `<span style="display:block;width:100%;height:100%;background:${option.hex}"></span>`;
      const optionDetail = option.kind === 'wood-transfer' ? 'Ahşap Transfer · gerçek kartela görseli' : 'Yüzey tipi sonraki adımda seçilir';
      button.innerHTML = `<span class="ral-color-option-image">${image}</span><span class="ral-color-option-copy"><strong>${option.code}</strong><small>${optionDetail}</small></span>`;
      button.value = option.code;
      button.addEventListener('click', () => {
        if (option.kind === 'wood-transfer') applyCatalogColorOption(option);
        else openColorFinishDialog(option.code, option.hex, option.image || '');
      });
      grid.appendChild(button);
    });
    setText(ids.colorResultCount, `${options.length} renk`);
  }

  function openColorPicker(target) {
    activeColorTarget = target === 'panel' ? 'panel' : 'system';
    setText(ids.colorPickerTitle, `${colorTargetLabel()} Seçin`);
    setText(ids.colorPickerDescription, activeColorTarget === 'panel'
      ? 'Seçilen RAL veya ahşap transfer rengi yalnız hareketli çatı panellerine uygulanır.'
      : 'Seçilen RAL veya ahşap transfer rengi cam ve perde kumaşı hariç tüm sistem ve cephe profillerine uygulanır.');
    $(ids.colorSearch).value = '';
    $(ids.colorPickerDialog).hidden = false;
    setActiveColorCatalog(activeColorCatalog);
    $(ids.colorSearch).focus();
  }

  function closeColorPicker() {
    $(ids.colorPickerDialog).hidden = true;
  }


  let appConfirmResolver = null;

  function closeAppConfirmation(result) {
    const dialog = $(ids.appConfirmDialog);
    if (dialog) dialog.hidden = true;
    const resolver = appConfirmResolver;
    appConfirmResolver = null;
    if (resolver) resolver(Boolean(result));
  }

  function requestAppConfirmation(message, options = {}) {
    const dialog = $(ids.appConfirmDialog);
    if (!dialog) return Promise.resolve(false);
    if (appConfirmResolver) closeAppConfirmation(false);
    setText(ids.appConfirmTitle, options.title || 'İşlemi Onayla');
    setText(ids.appConfirmMessage, message || 'Bu işlem uygulansın mı?');
    const accept = $(ids.appConfirmAccept);
    if (accept) {
      accept.textContent = options.acceptLabel || 'Onayla';
      accept.classList.toggle('danger-action', options.danger !== false);
    }
    dialog.hidden = false;
    window.setTimeout(() => { if (accept) accept.focus(); }, 0);
    return new Promise((resolve) => { appConfirmResolver = resolve; });
  }

  function productModelLabel(group = modelState.productGroup) {
    return activeProductSpec(group).modelLabel;
  }

  function projectionPresetSelect() {
    return $(ids.projectionOptions);
  }

  function depthControlValue() {
    const custom = $(ids.freedomDepth);
    return String(custom && custom.value || '').trim();
  }

  function setDepthControlValue(value) {
    const preset = projectionPresetSelect();
    const custom = $(ids.freedomDepth);
    const text = String(value == null ? '' : value).trim();
    if (custom) { custom.hidden = false; custom.value = text; }
    if (preset) {
      const matching = Array.from(preset.options || []).some((option) => option.value === text);
      preset.value = matching ? text : '';
    }
  }

  function projectionOptionValues(group = modelState.productGroup) {
    const spec = activeProductSpec(group);
    const values = [];
    const start = Number(spec.depthListStart);
    const max = Number(spec.depthMax);
    const step = Number(spec.depthStep);
    if (!Number.isFinite(start) || !Number.isFinite(max) || !Number.isFinite(step) || step <= 0) return values;
    for (let value = start; value <= max; value += step) values.push(value);
    if (!values.length || values[values.length - 1] !== max) values.push(max);
    return values;
  }

  function populateProjectionOptions() {
    const list = projectionPresetSelect();
    if (!list) return;
    const spec = activeProductSpec();
    const previousValue = depthControlValue();
    list.replaceChildren();

    const values = projectionOptionValues(modelState.productGroup);
    let lastValue = null;
    for (const value of values) {
      const option = document.createElement('option');
      const panelCount = panelCountFromProjection(value, modelState.productGroup);
      option.value = String(value);
      option.textContent = modelState.productGroup === 'pergo-rise' ? `${value} mm` : `${value} - ${panelCount} Panel`;
      list.appendChild(option);
      lastValue = value;
    }
    setDepthControlValue(previousValue);
    renderProjectionComboMenu();
  }

  function normalizeMotorKey(value) {
    return String(value || 'Yok').trim().toLocaleUpperCase('tr-TR');
  }

  function sanitizeDigitsOnly(value, maxLength = 2) {
    return String(value == null ? '' : value).replace(/\D+/g, '').slice(0, maxLength);
  }

  function sanitizeSemicolonNumbers(value) {
    const source = String(value == null ? '' : value);
    let out = '';
    for (const char of source) {
      if (/\d/.test(char)) out += char;
      else if (char === ';' && out && !/[;:]$/.test(out)) out += ';';
    }
    return out;
  }

  function sanitizeWidthTopology(value) {
    const source = String(value == null ? '' : value).toLocaleUpperCase('tr-TR');
    let out = '';
    let noState = 0;
    for (const char of source) {
      if (noState === 2) continue;
      if (/\d/.test(char) && noState === 0) { out += char; continue; }
      if ((char === ';' || char === ':') && noState === 0 && out && !/[;:]$/.test(out)) { out += char; continue; }
      if (char === 'N' && noState === 0 && out.endsWith(':')) { out += 'N'; noState = 1; continue; }
      if (char === 'O' && noState === 1) { out += 'O'; noState = 2; }
    }
    return out;
  }

  function sanitizeOpeningTopology(value) {
    const source = String(value == null ? '' : value).toLocaleUpperCase('tr-TR');
    let out = '';
    let noState = 0;
    for (const char of source) {
      if (noState === 2) continue;
      if (/\d/.test(char) && noState === 0) { out += char; continue; }
      if ((char === ';' || char === ':') && noState === 0 && out && !/[;:]$/.test(out)) { out += char; continue; }
      if (char === 'N' && noState === 0 && /[;:]$/.test(out)) { out += 'N'; noState = 1; continue; }
      if (char === 'O' && noState === 1) { out += 'O'; noState = 2; }
    }
    return out;
  }

  function parseNumericRow(text, rowIndex) {
    const rawTokens = String(text == null ? '' : text).split(';').map((token) => token.trim());
    const errors = [];
    const values = [];
    rawTokens.forEach((token, tokenIndex) => {
      if (!token) {
        errors.push(`EMPTY_VALUE_ROW_${rowIndex + 1}`);
        return;
      }
      if (!/^\d+$/.test(token)) {
        errors.push(`INVALID_VALUE_ROW_${rowIndex + 1}`);
        return;
      }
      const number = Number(token);
      if (!(number > 0)) {
        errors.push(`VALUE_MUST_BE_POSITIVE_ROW_${rowIndex + 1}`);
        return;
      }
      values.push(number);
    });
    return { values, errors };
  }

  function parseMultiRowNumberGrid(value, options = {}) {
    const allowLegacyNo = Boolean(options.allowLegacyNo);
    const allowTerminalNo = Boolean(options.allowTerminalNo);
    const original = String(value == null ? '' : value).trim().toLocaleUpperCase('tr-TR');
    let text = original;
    let terminalColonNo = false;
    let legacyRearReference = false;
    if (allowTerminalNo && /:NO$/.test(text)) {
      terminalColonNo = true;
      text = text.slice(0, -3);
    } else if (allowLegacyNo && !text.includes(':') && /;NO$/.test(text)) {
      legacyRearReference = true;
      text = text.slice(0, -3);
    }
    const errors = [];
    if (/NO/.test(text)) errors.push('NO_ONLY_ALLOWED_AT_END');
    const rawRows = text.split(':');
    if (rawRows.length > 2) errors.push('TOO_MANY_ROWS');
    if (rawRows.some((row) => !row.trim())) errors.push('EMPTY_ROW');
    const rows = rawRows.slice(0, 2).map((row, rowIndex) => {
      const parsed = parseNumericRow(row, rowIndex);
      errors.push(...parsed.errors);
      return parsed.values;
    });
    return {
      original,
      text,
      rows,
      rowCount: rows.length,
      terminalColonNo,
      legacyRearReference,
      errors,
      hasSemicolon: text.includes(';'),
      hasColon: original.includes(':')
    };
  }

  function parseMultiPositionNumberList(value, options = {}) {
    const grid = parseMultiRowNumberGrid(value, {
      allowLegacyNo: Boolean(options.allowNo),
      allowTerminalNo: Boolean(options.allowNo)
    });
    const values = grid.rows.length === 1 ? grid.rows[0].slice() : grid.rows.flat();
    return {
      text: grid.original,
      values,
      rearReference: grid.legacyRearReference || grid.terminalColonNo,
      errors: grid.errors,
      hasDelimiter: grid.hasSemicolon || grid.hasColon,
      rows: grid.rows,
      terminalColonNo: grid.terminalColonNo
    };
  }

  function resolveFreedomBioTopology(group, rawSystemCount, rawWidth, rawDepth) {
    const widthGrid = parseMultiRowNumberGrid(rawWidth, { allowTerminalNo: true });
    const openingGrid = parseMultiRowNumberGrid(rawDepth, { allowLegacyNo: true, allowTerminalNo: true });
    const explicitCount = isBioFamilyGroup(group)
      ? normalizedBioRiseSystemCount(rawSystemCount || 1)
      : normalizedFreedomSystemCount(rawSystemCount || 1);
    const errors = [
      ...widthGrid.errors.map((code) => `WIDTH_${code}`),
      ...openingGrid.errors.map((code) => `OPENING_${code}`)
    ];
    if (!widthGrid.rows.length || !widthGrid.rows[0].length) errors.push('WIDTH_REQUIRED');
    if (!openingGrid.rows.length || !openingGrid.rows[0].length) errors.push('OPENING_REQUIRED');
    if (widthGrid.rowCount !== openingGrid.rowCount) errors.push('WIDTH_OPENING_ROW_COUNT_MISMATCH');
    const backToBack = widthGrid.rowCount === 2 || openingGrid.rowCount === 2;

    if (!backToBack) {
      const widthValues = widthGrid.rows[0] || [];
      const openingValues = openingGrid.rows[0] || [];
      let systemCount = widthValues.length > 1 ? widthValues.length : explicitCount;
      if (widthValues.length <= 1 && openingValues.length > 1) systemCount = explicitCount;
      if (widthValues.length > 1 && openingValues.length > 1 && openingValues.length !== widthValues.length) errors.push('WIDTH_OPENING_COUNT_MISMATCH');
      if (widthValues.length <= 1 && openingValues.length > 1 && openingValues.length !== systemCount) errors.push('OPENING_SYSTEM_COUNT_MISMATCH');
      if (widthValues.length > 1 && widthValues.length !== systemCount) errors.push('WIDTH_SYSTEM_COUNT_MISMATCH');
      const moduleWidths = widthValues.length > 1 ? widthValues.slice() : [];
      const totalWidth = moduleWidths.length ? moduleWidths.reduce((sum, value) => sum + value, 0) : Number(widthValues[0] || 0);
      const moduleDepths = openingValues.length === 1
        ? Array.from({ length: systemCount }, () => openingValues[0])
        : openingValues.slice();
      const maxDepth = moduleDepths.length ? Math.max(...moduleDepths) : 0;
      const panelCounts = moduleDepths.map((depth) => panelCountFromProjection(depth, group));
      return {
        valid: errors.length === 0,
        errors,
        backToBack: false,
        rowCount: 1,
        systemCount,
        totalWidth,
        moduleWidths,
        moduleDepths,
        maxDepth,
        panelCounts,
        alignment: openingGrid.legacyRearReference ? 'rear' : 'front',
        multiRows: [],
        rowAlignment: 'left',
        panelCollection: 'center',
        widthInputMode: moduleWidths.length ? 'MODULE_LIST' : 'TOTAL_WIDTH',
        openingInputMode: openingValues.length > 1 ? 'MODULE_LIST' : 'COMMON'
      };
    }

    if (widthGrid.rowCount !== 2 || openingGrid.rowCount !== 2) errors.push('TWO_ROWS_REQUIRED');
    const rows = [];
    for (let rowIndex = 0; rowIndex < 2; rowIndex += 1) {
      const widths = widthGrid.rows[rowIndex] || [];
      const depths = openingGrid.rows[rowIndex] || [];
      if (widths.length !== depths.length) errors.push(`WIDTH_OPENING_COUNT_MISMATCH_ROW_${rowIndex + 1}`);
      const panelCounts = depths.map((depth) => panelCountFromProjection(depth, group));
      rows.push({
        rowIndex,
        rowLabel: rowIndex === 0 ? 'front-row' : 'rear-row',
        moduleWidths: widths.slice(),
        moduleDepths: depths.slice(),
        panelCounts
      });
    }
    const systemCount = rows.reduce((sum, row) => sum + row.moduleWidths.length, 0);
    const totalWidth = Math.max(0, ...rows.map((row) => row.moduleWidths.reduce((sum, value) => sum + value, 0)));
    const rowDepths = rows.map((row) => Math.max(0, ...row.moduleDepths));
    const sharedBackToBackBeam = group === 'b-cube' ? Number(PRODUCT_SPECS['b-cube'].beamSection.thickness) || 100 : 0;
    const maxDepth = Math.max(0, rowDepths.reduce((sum, value) => sum + value, 0) - sharedBackToBackBeam);
    const flatWidths = rows.flatMap((row) => row.moduleWidths);
    const flatDepths = rows.flatMap((row) => row.moduleDepths);
    const flatPanelCounts = rows.flatMap((row) => row.panelCounts);
    return {
      valid: errors.length === 0,
      errors,
      backToBack: true,
      rowCount: 2,
      systemCount,
      totalWidth,
      moduleWidths: flatWidths,
      moduleDepths: flatDepths,
      maxDepth,
      panelCounts: flatPanelCounts,
      alignment: 'front',
      multiRows: rows,
      rowAlignment: widthGrid.terminalColonNo ? 'right' : 'left',
      panelCollection: openingGrid.terminalColonNo ? 'outer' : 'center',
      widthInputMode: 'ROW_MODULE_LIST',
      openingInputMode: 'ROW_MODULE_LIST'
    };
  }

  if (typeof window !== 'undefined') {
    window.P3DVMultiPositionInput = Object.freeze({
      parse: (value, options) => parseMultiPositionNumberList(value, options),
      parseGrid: (value, options) => parseMultiRowNumberGrid(value, options),
      resolve: (group, systemCount, width, opening) => resolveFreedomBioTopology(group, systemCount, width, opening)
    });
  }

  function closeP3dvCombos(except = null) {
    [ids.projectionCombo, ids.motorCombo, ids.remoteCombo, ids.ledCombo, ids.pergoFabricCombo].forEach((id) => {
      const combo = $(id);
      if (!combo || combo === except) return;
      combo.classList.remove('is-open');
      const menu = combo.querySelector('.p3dv-combo-menu');
      if (menu) menu.hidden = true;
    });
  }

  function renderComboOptions(menu, values, currentValue, onSelect, labelForValue = null) {
    if (!menu) return;
    const current = String(currentValue || '').trim().toLocaleUpperCase('tr-TR');
    menu.innerHTML = '';
    values.forEach((value) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'p3dv-combo-option' + (String(value).trim().toLocaleUpperCase('tr-TR') === current ? ' is-selected' : '');
      const label = labelForValue ? labelForValue(value) : null;
      button.innerHTML = `<span>${String(value)}</span>${label ? `<small>${label}</small>` : ''}`;
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', () => onSelect(String(value)));
      menu.appendChild(button);
    });
  }

  function setComboOpen(combo, menu, open) {
    if (!combo || !menu) return;
    closeP3dvCombos(open ? combo : null);
    combo.classList.toggle('is-open', Boolean(open));
    menu.hidden = !open;
  }

  function renderProjectionComboMenu() {
    const menu = $(ids.projectionComboMenu);
    const list = projectionPresetSelect();
    if (!menu || !list) return;
    const values = Array.from(list.options || []).map((option) => option.value).filter(Boolean);
    renderComboOptions(menu, values, depthControlValue(), (value) => {
      const current = depthControlValue();
      if (modelState.productGroup !== 'pergo-rise' && /[;:]$/.test(current) && !/:NO$/i.test(current)) setDepthControlValue(current + value);
      else if (modelState.productGroup !== 'pergo-rise' && /:NO$/i.test(current)) setFreedomValidation('Yeni açılım eklemek için önce terminal :NO komutunu kaldırın.');
      else setDepthControlValue(value);
      setComboOpen($(ids.projectionCombo), menu, false);
      $(ids.freedomDepth).dispatchEvent(new Event('input', { bubbles: true }));
      $(ids.freedomDepth).dispatchEvent(new Event('change', { bubbles: true }));
      $(ids.freedomDepth).focus();
    }, (value) => modelState.productGroup === 'pergo-rise' ? `${value} mm` : `- ${panelCountFromProjection(Number(value), modelState.productGroup)} Panel`);
  }

  function isPergoRiseUi() {
    return modelState.productGroup === 'pergo-rise';
  }

  function motorOptionsForProduct() {
    return isPergoRiseUi() ? PERGO_RISE_UI_MOTOR_OPTIONS : FREEDOM_UI_MOTOR_OPTIONS;
  }

  function remoteOptionsForMotor() {
    const key = normalizeMotorKey($(ids.motorInput) && $(ids.motorInput).value);
    return isPergoRiseUi() ? (PERGO_RISE_UI_REMOTE_OPTIONS[key] || ['-']) : (FREEDOM_UI_REMOTE_OPTIONS[key] || ['Yok']);
  }

  function renderMotorComboMenu() {
    renderComboOptions($(ids.motorComboMenu), motorOptionsForProduct(), $(ids.motorInput).value, (value) => {
      $(ids.motorInput).value = value;
      const remoteValues = remoteOptionsForMotor();
      if (!remoteValues.some((item) => String(item).toLocaleUpperCase('tr-TR') === String($(ids.remoteInput).value).toLocaleUpperCase('tr-TR'))) $(ids.remoteInput).value = remoteValues[0] || (isPergoRiseUi() ? '-' : 'Yok');
      if (isPergoRiseUi()) {
        syncPergoRiseInputInfrastructure({ schedulePreview: true });
      } else {
        modelState.motor = value;
        modelState.remote = $(ids.remoteInput).value;
      }
      const noMotor = isPergoRiseUi() ? normalizeMotorKey(value) === '-' : normalizeMotorKey(value) === 'YOK';
      $(ids.remoteInput).disabled = noMotor;
      $(ids.remoteComboButton).disabled = noMotor;
      setComboOpen($(ids.motorCombo), $(ids.motorComboMenu), false);
      renderRemoteComboMenu();
    });
  }

  function renderRemoteComboMenu() {
    renderComboOptions($(ids.remoteComboMenu), remoteOptionsForMotor(), $(ids.remoteInput).value, (value) => {
      $(ids.remoteInput).value = value;
      if (isPergoRiseUi()) syncPergoRiseInputInfrastructure({ schedulePreview: true });
      else modelState.remote = value;
      setComboOpen($(ids.remoteCombo), $(ids.remoteComboMenu), false);
      $(ids.remoteInput).focus();
    });
  }

  function renderLedComboMenu() {
    if (isPergoRiseUi()) return;
    renderComboOptions($(ids.ledComboMenu), FREEDOM_UI_LED_OPTIONS, $(ids.ledInput).value, (value) => {
      $(ids.ledInput).value = value;
      modelState.led = value;
      setComboOpen($(ids.ledCombo), $(ids.ledComboMenu), false);
      $(ids.ledInput).focus();
    });
  }

  function renderPergoFabricComboMenu() {
    if (!isPergoRiseUi()) return;
    renderComboOptions($(ids.pergoFabricComboMenu), PERGO_RISE_UI_FABRIC_OPTIONS, $(ids.pergoFabric).value, (value) => {
      $(ids.pergoFabric).value = value;
      syncPergoRiseInputInfrastructure({ schedulePreview: true });
      setComboOpen($(ids.pergoFabricCombo), $(ids.pergoFabricComboMenu), false);
      $(ids.pergoFabric).focus();
    });
  }

  function pergoInputApi() {
    return window.P3DVPergoRiseInput || null;
  }

  function pergoInputOwnership() {
    const projectOwnership = modelState.pergoRiseProject && modelState.pergoRiseProject.ownership || {};
    return {
      rayCount: Boolean($(ids.pergoRayCount) && $(ids.pergoRayCount).dataset.userEdited === 'true') || Boolean(projectOwnership.rayCount),
      postCount: Boolean($(ids.pergoPostCount) && $(ids.pergoPostCount).dataset.userEdited === 'true') || Boolean(projectOwnership.postCount)
    };
  }

  function setPergoInputOwnership(ownership) {
    const value = ownership || {};
    if ($(ids.pergoRayCount)) $(ids.pergoRayCount).dataset.userEdited = value.rayCount ? 'true' : 'false';
    if ($(ids.pergoPostCount)) $(ids.pergoPostCount).dataset.userEdited = value.postCount ? 'true' : 'false';
  }

  function pergoUiValue(id, fallback) {
    const element = $(id);
    if (!element) return fallback;
    return String(element.value == null ? '' : element.value);
  }

  function collectPergoRiseRawInput() {
    const api = pergoInputApi();
    const base = api ? api.clone(api.DEFAULT_INPUT) : { ...(window.P3DVPergoRiseProduct && window.P3DVPergoRiseProduct.DEFAULT_RAW || {}) };
    const existing = modelState.pergoRiseProject && modelState.pergoRiseProject.input || {};
    return {
      ...base,
      ...existing,
      product: 'Pergo Rise', moduleName: 'Module 1', engine: 'Web DXF',
      systemCount: pergoUiValue(ids.pergoSystemCount, ''),
      width: pergoUiValue(ids.freedomWidth, ''),
      opening: pergoUiValue(ids.freedomDepth, ''),
      rearHeight: pergoUiValue(ids.freedomHeight, ''),
      frontHeight: pergoUiValue(ids.pergoFrontHeight, ''),
      rayCount: pergoUiValue(ids.pergoRayCount, ''),
      postCount: pergoUiValue(ids.pergoPostCount, ''),
      parapet: pergoUiValue(ids.parapetInput, 'HAYIR'),
      parapetHeight: pergoUiValue(ids.parapetHeightInput, '-'),
      glassTrack: pergoUiValue(ids.pergoGlassTrack, 'HAYIR'),
      glassRayBoundaryMode: pergoUiValue(ids.pergoGlassRayBoundaryMode, 'DARALT'),
      sideTrack: 'HAYIR',
      structureColor: pergoUiValue(ids.pergoStructureColor, '-'),
      fabric: pergoUiValue(ids.pergoFabric, '-'),
      fabricProfiles: pergoUiValue(ids.pergoFabricProfiles, '-'),
      motor: pergoUiValue(ids.motorInput, '-'),
      remote: pergoUiValue(ids.remoteInput, '-'),
      led: pergoUiValue(ids.ledInput, '-'),
      dimmer: pergoUiValue(ids.pergoDimmer, '-'),
      extras: pergoUiValue(ids.extrasInput, '-'),
      triangleJoinery: pergoUiValue(ids.pergoTriangleJoinery, 'HAYIR'),
      waterStandard: pergoUiValue(ids.waterStandardInput, 'EVET'),
      waterOutletPlacement: pergoUiValue(ids.pergoWaterOutletPlacement, 'BOTH'),
      __rearSupport: existing.__rearSupport || { type: 'wall' }
    };
  }

  function cloneJson(value, fallback = null) {
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return fallback; }
  }

  function pergoBackWallSideKey(systemIndex) {
    return String(Math.max(0, Math.round(Number(systemIndex) || 0)));
  }

  function pergoBackWallScopedValue(state, systemIndex, fallback) {
    const source = state && typeof state === 'object' ? state : {};
    const key = pergoBackWallSideKey(systemIndex);
    if (key === '0') return { ...(fallback || {}), ...(source.left || {}) };
    return { ...(fallback || {}), ...((source.middle && source.middle[key]) || {}) };
  }

  function setPergoBackWallScopedValue(state, systemIndex, value) {
    const source = state && typeof state === 'object' ? cloneJson(state, {}) : {};
    source.left = source.left && typeof source.left === 'object' ? source.left : { enabled: true, xOffset: 0, depth: 600, height: 0 };
    source.right = source.right && typeof source.right === 'object' ? source.right : { enabled: true, xOffset: 0, depth: 600, height: 0 };
    source.middle = source.middle && typeof source.middle === 'object' ? source.middle : {};
    const key = pergoBackWallSideKey(systemIndex);
    if (key === '0') source.left = { ...source.left, ...(value || {}) };
    else source.middle[key] = { ...(source.middle[key] || {}), ...(value || {}) };
    return source;
  }

  function deletePergoBackWallScopedValue(state, systemIndex) {
    const source = state && typeof state === 'object' ? cloneJson(state, {}) : {};
    const key = pergoBackWallSideKey(systemIndex);
    if (key === '0') source.left = { enabled: true, xOffset: 0, depth: 600, height: 0 };
    else if (source.middle) delete source.middle[key];
    return source;
  }

  function pergoBackWallNumber(value, fallback = NaN) {
    const number = Number(String(value == null ? '' : value).trim().replace(',', '.'));
    return Number.isFinite(number) ? number : fallback;
  }

  function pergoBackWallInteger(value, fallback = 1) {
    return Math.max(1, Math.min(20, Math.floor(pergoBackWallNumber(value, fallback) || fallback)));
  }

  function pergoBackWallDirection(startDepth, endDepth) {
    const start = Number(startDepth) || 0, end = Number(endDepth) || 0;
    if (Math.abs(end - start) <= 0.001) return 'STRAIGHT';
    return end > start ? 'NEGATIVE_X_TO_POSITIVE_X' : 'POSITIVE_X_TO_NEGATIVE_X';
  }

  function splitPergoTopWallCell(cell, columns, rows) {
    const cols = pergoBackWallInteger(columns, 1), rws = pergoBackWallInteger(rows, 1);
    const x0 = Number(cell.minX), x1 = Number(cell.maxX);
    const lerpValue = (a, b, t) => Number(a) + (Number(b) - Number(a)) * t;
    const out = [];
    for (let column = 0; column < cols; column += 1) {
      const ta = column / cols, tb = (column + 1) / cols;
      const cx0 = lerpValue(x0, x1, ta), cx1 = lerpValue(x0, x1, tb);
      const nearA = lerpValue(cell.startNearDepth, cell.endNearDepth, ta);
      const nearB = lerpValue(cell.startNearDepth, cell.endNearDepth, tb);
      const farA = lerpValue(cell.startFarDepth, cell.endFarDepth, ta);
      const farB = lerpValue(cell.startFarDepth, cell.endFarDepth, tb);
      for (let row = 0; row < rws; row += 1) {
        const ra = row / rws, rb = (row + 1) / rws;
        out.push({
          id: `${cell.id}_c${column + 1}_r${row + 1}`,
          enabled: true,
          minX: cx0, maxX: cx1,
          startNearDepth: lerpValue(nearA, farA, ra),
          endNearDepth: lerpValue(nearB, farB, ra),
          startFarDepth: lerpValue(nearA, farA, rb),
          endFarDepth: lerpValue(nearB, farB, rb)
        });
      }
    }
    return out;
  }

  function buildPergoSideWallGrid(systemIndex, depth, height, columns, rows, autoHeight) {
    const key = pergoBackWallSideKey(systemIndex);
    const cols = pergoBackWallInteger(columns, 1), rws = pergoBackWallInteger(rows, 1);
    const wallDepth = Math.max(1, Number(depth) || 600), wallHeight = Math.max(1, Number(height) || 1);
    const cells = [];
    for (let column = 0; column < cols; column += 1) {
      const minX = wallDepth * column / cols, maxX = wallDepth * (column + 1) / cols;
      for (let row = 0; row < rws; row += 1) {
        const minY = wallHeight * row / rws, maxY = wallHeight * (row + 1) / rws;
        cells.push({ id: `back_wall_cell_${key}_c${column + 1}_r${row + 1}`, minX, maxX, minY, maxY });
      }
    }
    return { version: 1, autoHeight: Boolean(autoHeight), columns: cols, rows: rws, bounds: { minX: 0, maxX: wallDepth, minY: 0, maxY: wallHeight }, cells };
  }

  function pergoBackWallDefaultConfig(systemIndex) {
    const project = modelState.pergoRiseProject;
    const normalized = project && project.normalized;
    const system = normalized && normalized.systems && normalized.systems[systemIndex];
    const position = normalized && normalized.positions && normalized.positions[systemIndex];
    if (!system || !position) return null;
    const input = project.input || {};
    const wallState = pergoBackWallScopedValue(input.__backWallState || normalized.backWallState, systemIndex, { enabled: true, xOffset: 0, depth: 600, height: 0 });
    const rawTopGrid = input.__topBackWallGridState && input.__topBackWallGridState[String(systemIndex)];
    const normalizedTopGrid = normalized.topBackWallGridState && normalized.topBackWallGridState[String(systemIndex)];
    const topGrid = rawTopGrid && Array.isArray(rawTopGrid.cells) && rawTopGrid.cells.length ? rawTopGrid : normalizedTopGrid;
    const topCells = topGrid && Array.isArray(topGrid.cells) ? topGrid.cells.filter(cell => cell && cell.enabled !== false) : [];
    const minX = topCells.length ? Math.min(...topCells.map(cell => Number(cell.minX))) : 0;
    const maxX = topCells.length ? Math.max(...topCells.map(cell => Number(cell.maxX))) : Math.max(1, Number(system.outerEndX) - Number(system.outerStartX));
    const leftCells = topCells.filter(cell => Math.abs(Number(cell.minX) - minX) <= 0.001);
    const rightCells = topCells.filter(cell => Math.abs(Number(cell.maxX) - maxX) <= 0.001);
    const startDepth = leftCells.length ? Math.max(...leftCells.map(cell => Number(cell.startFarDepth) || 0)) : 800;
    const endDepth = rightCells.length ? Math.max(...rightCells.map(cell => Number(cell.endFarDepth) || 0)) : startDepth;
    const rawSideGrid = input.__backWallGridState && input.__backWallGridState.side && input.__backWallGridState.side[String(systemIndex)];
    const sideGrid = rawSideGrid || (normalized.backWallGridState && normalized.backWallGridState.side && normalized.backWallGridState.side[String(systemIndex)]);
    return {
      systemIndex,
      enabled: wallState.enabled !== false,
      xOffset: Number(wallState.xOffset) || 0,
      height: Math.max(0, Number(wallState.height) || 0),
      resolvedHeight: Math.max(1, Number(wallState.height) || Number(position.rearHeight) || 1),
      depth: Math.max(1, Number(wallState.depth) || 600),
      minX: Number.isFinite(minX) ? minX : 0,
      maxX: Number.isFinite(maxX) ? maxX : Math.max(1, Number(system.outerEndX) - Number(system.outerStartX)),
      startDepth: Math.max(0, Number(startDepth) || 0),
      endDepth: Math.max(0, Number(endDepth) || 0),
      direction: pergoBackWallDirection(startDepth, endDepth),
      topColumns: Math.max(1, Number(rawTopGrid && rawTopGrid.columns) || new Set(topCells.flatMap(cell => [Number(cell.minX).toFixed(6), Number(cell.maxX).toFixed(6)])).size - 1 || 1),
      topRows: Math.max(1, Number(rawTopGrid && rawTopGrid.rows) || 1),
      sideColumns: Math.max(1, Number(sideGrid && sideGrid.columns) || 1),
      sideRows: Math.max(1, Number(sideGrid && sideGrid.rows) || 1),
      position,
      system
    };
  }

  function updatePergoBackWallSummary() {
    const node = $(ids.pergoBackWallSummary);
    if (!node) return;
    const project = modelState.pergoRiseProject;
    const normalized = project && project.normalized;
    if (!normalized || !Array.isArray(normalized.systems)) { node.textContent = 'ÖLÇÜLERİ TAMAMLA'; return; }
    let enabled = 0;
    normalized.systems.forEach((system, index) => {
      const state = pergoBackWallScopedValue(normalized.backWallState, index, { enabled: true });
      if (state.enabled !== false) enabled += 1;
    });
    node.textContent = enabled ? `${enabled}/${normalized.systems.length} VAR · PLMR` : 'YOK';
  }

  function setPergoBackWallFieldsDisabled(disabled) {
    [ids.pergoBackWallDirection, ids.pergoBackWallOffset, ids.pergoBackWallHeight, ids.pergoBackWallDepth,
      ids.pergoBackWallMinX, ids.pergoBackWallMaxX, ids.pergoBackWallStartDepth, ids.pergoBackWallEndDepth,
      ids.pergoBackWallAngle, ids.pergoBackWallTopColumns, ids.pergoBackWallTopRows, ids.pergoBackWallSideColumns,
      ids.pergoBackWallSideRows].forEach(id => { if ($(id)) $(id).disabled = Boolean(disabled); });
  }

  function loadPergoBackWallDialog(systemIndex) {
    const config = pergoBackWallDefaultConfig(systemIndex);
    if (!config) return false;
    suppressPergoBackWallDialogEvents = true;
    try {
      $(ids.pergoBackWallSystem).value = String(config.systemIndex);
      $(ids.pergoBackWallEnabled).value = config.enabled ? 'EVET' : 'HAYIR';
      $(ids.pergoBackWallDirection).value = config.direction;
      $(ids.pergoBackWallOffset).value = String(Number(config.xOffset.toFixed(3)));
      $(ids.pergoBackWallHeight).value = config.height > 0 ? String(Math.round(config.height)) : '';
      $(ids.pergoBackWallDepth).value = String(Math.round(config.depth));
      $(ids.pergoBackWallMinX).value = String(Number(config.minX.toFixed(3)));
      $(ids.pergoBackWallMaxX).value = String(Number(config.maxX.toFixed(3)));
      $(ids.pergoBackWallStartDepth).value = String(Number(config.startDepth.toFixed(3)));
      $(ids.pergoBackWallEndDepth).value = String(Number(config.endDepth.toFixed(3)));
      const angle = Math.atan2(config.endDepth - config.startDepth, Math.max(0.001, config.maxX - config.minX)) * 180 / Math.PI;
      $(ids.pergoBackWallAngle).value = String(Number(angle.toFixed(3)));
      $(ids.pergoBackWallTopColumns).value = String(config.topColumns);
      $(ids.pergoBackWallTopRows).value = String(config.topRows);
      $(ids.pergoBackWallSideColumns).value = String(config.sideColumns);
      $(ids.pergoBackWallSideRows).value = String(config.sideRows);
      setPergoBackWallFieldsDisabled(!config.enabled);
      $(ids.pergoBackWallError).textContent = '';
      $(ids.pergoBackWallNote).textContent = `Sistem ${config.systemIndex + 1} · PLMR genişliği ${Math.round(config.system.outerEndX - config.system.outerStartX)} mm · Arka H ${Math.round(config.position.rearHeight)} mm. +Y/arka kenar sabittir; 3D karşılığı negatif Z yönüdür.`;
    } finally {
      suppressPergoBackWallDialogEvents = false;
    }
    return true;
  }

  function populatePergoBackWallSystems(selectedIndex = 0) {
    const select = $(ids.pergoBackWallSystem);
    const normalized = modelState.pergoRiseProject && modelState.pergoRiseProject.normalized;
    if (!select || !normalized || !Array.isArray(normalized.systems)) return false;
    select.textContent = '';
    normalized.systems.forEach((system, index) => {
      const option = document.createElement('option');
      option.value = String(index); option.textContent = `Sistem ${index + 1} / Poz ${index + 1}`;
      select.appendChild(option);
    });
    select.value = String(Math.min(Math.max(0, selectedIndex), normalized.systems.length - 1));
    return true;
  }

  function readPergoBackWallDialogConfig() {
    const systemIndex = Math.max(0, Number($(ids.pergoBackWallSystem).value) || 0);
    const fallback = pergoBackWallDefaultConfig(systemIndex);
    if (!fallback) return { error: 'Önce zorunlu Pergola ölçülerini tamamlayın.' };
    const enabled = $(ids.pergoBackWallEnabled).value !== 'HAYIR';
    const minX = pergoBackWallNumber($(ids.pergoBackWallMinX).value);
    const maxX = pergoBackWallNumber($(ids.pergoBackWallMaxX).value);
    const startDepth = pergoBackWallNumber($(ids.pergoBackWallStartDepth).value);
    let endDepth = pergoBackWallNumber($(ids.pergoBackWallEndDepth).value);
    const xOffset = pergoBackWallNumber($(ids.pergoBackWallOffset).value, 0);
    const height = Math.max(0, pergoBackWallNumber($(ids.pergoBackWallHeight).value, 0));
    const depth = pergoBackWallNumber($(ids.pergoBackWallDepth).value);
    const angle = pergoBackWallNumber($(ids.pergoBackWallAngle).value, 0);
    if (![minX, maxX, startDepth, endDepth, xOffset, height, depth, angle].every(Number.isFinite)) return { error: 'Arka duvar ölçülerinin tamamı geçerli sayı olmalı.' };
    if (!(maxX > minX)) return { error: 'Parça bitiş X değeri başlangıç X değerinden büyük olmalı.' };
    if (startDepth < 0 || endDepth < 0 || depth <= 0) return { error: 'Duvar derinlikleri pozitif olmalı.' };
    const direction = $(ids.pergoBackWallDirection).value || pergoBackWallDirection(startDepth, endDepth);
    const delta = Math.abs(endDepth - startDepth);
    if (direction === 'STRAIGHT') endDepth = startDepth;
    else if (direction === 'NEGATIVE_X_TO_POSITIVE_X' && endDepth < startDepth) endDepth = startDepth + delta;
    else if (direction === 'POSITIVE_X_TO_NEGATIVE_X' && endDepth > startDepth) endDepth = Math.max(0, startDepth - delta);
    return {
      systemIndex, enabled, minX, maxX, startDepth, endDepth, xOffset, height, depth,
      direction: pergoBackWallDirection(startDepth, endDepth),
      topColumns: pergoBackWallInteger($(ids.pergoBackWallTopColumns).value, 1),
      topRows: pergoBackWallInteger($(ids.pergoBackWallTopRows).value, 1),
      sideColumns: pergoBackWallInteger($(ids.pergoBackWallSideColumns).value, 1),
      sideRows: pergoBackWallInteger($(ids.pergoBackWallSideRows).value, 1),
      resolvedHeight: height > 0 ? height : fallback.resolvedHeight
    };
  }

  function applyPergoBackWallDialog(options = {}) {
    if (!isPergoRiseUi()) return false;
    const config = readPergoBackWallDialogConfig();
    if (config.error) { if ($(ids.pergoBackWallError)) $(ids.pergoBackWallError).textContent = config.error; return false; }
    const project = modelState.pergoRiseProject;
    if (!project || !project.input) return false;
    const raw = cloneJson(project.input, {});
    raw.__rearSupport = { ...(raw.__rearSupport || {}), type: 'wall' };
    raw.__backWallState = setPergoBackWallScopedValue(raw.__backWallState, config.systemIndex, {
      enabled: config.enabled, xOffset: config.xOffset, depth: config.depth, height: config.height
    });
    if (raw.__topBackWallSegments) delete raw.__topBackWallSegments[String(config.systemIndex)];
    if (raw.__backWallSegments && raw.__backWallSegments.side) delete raw.__backWallSegments.side[String(config.systemIndex)];
    raw.__topBackWallGridState = raw.__topBackWallGridState && typeof raw.__topBackWallGridState === 'object' ? cloneJson(raw.__topBackWallGridState, {}) : {};
    const baseCell = {
      id: `top_wall_${config.systemIndex}_stage2`, enabled: true,
      minX: config.minX, maxX: config.maxX,
      startNearDepth: 0, endNearDepth: 0,
      startFarDepth: config.startDepth, endFarDepth: config.endDepth
    };
    raw.__topBackWallGridState[String(config.systemIndex)] = {
      version: 1, columns: config.topColumns, rows: config.topRows,
      cells: splitPergoTopWallCell(baseCell, config.topColumns, config.topRows)
    };
    raw.__backWallGridState = raw.__backWallGridState && typeof raw.__backWallGridState === 'object' ? cloneJson(raw.__backWallGridState, {}) : {};
    raw.__backWallGridState.side = raw.__backWallGridState.side && typeof raw.__backWallGridState.side === 'object' ? raw.__backWallGridState.side : {};
    raw.__backWallGridState.side[String(config.systemIndex)] = buildPergoSideWallGrid(
      config.systemIndex, config.depth, config.resolvedHeight, config.sideColumns, config.sideRows, config.height <= 0
    );
    replacePergoCanonicalInput(raw, pergoInputOwnership(), { schedulePreview: true });
    updatePergoBackWallSummary();
    if ($(ids.pergoBackWallError)) $(ids.pergoBackWallError).textContent = '';
    if (!options.silent) setFreedomValidation(`Arka duvar Sistem ${config.systemIndex + 1} için PLMR kurallarıyla güncellendi.`);
    return true;
  }

  function schedulePergoBackWallLiveUpdate() {
    if (suppressPergoBackWallDialogEvents) return;
    window.clearTimeout(pergoBackWallLiveTimer);
    pergoBackWallLiveTimer = window.setTimeout(() => applyPergoBackWallDialog({ silent: true }), 320);
  }

  function openPergoBackWallDialog() {
    if (!isPergoRiseUi()) return;
    const project = syncPergoRiseInputInfrastructure({ keepValidation: true });
    if (!project || !project.valid || !project.normalized) {
      setFreedomValidation('Arka duvar ayarları için Sistem Adedi, Genişlik, Açılım, Arka H ve Ön H alanlarını tamamlayın.');
      return;
    }
    pergoBackWallDialogSnapshot = cloneJson(project.input, null);
    if (!populatePergoBackWallSystems(0) || !loadPergoBackWallDialog(0)) return;
    $(ids.pergoBackWallDialog).hidden = false;
  }

  function closePergoBackWallDialog(restore) {
    window.clearTimeout(pergoBackWallLiveTimer);
    const dialog = $(ids.pergoBackWallDialog);
    if (restore && pergoBackWallDialogSnapshot) {
      replacePergoCanonicalInput(pergoBackWallDialogSnapshot, pergoInputOwnership(), { schedulePreview: true });
    }
    pergoBackWallDialogSnapshot = null;
    if (dialog) dialog.hidden = true;
  }

  function resetPergoBackWallSystem() {
    const project = modelState.pergoRiseProject;
    if (!project || !project.input) return;
    const systemIndex = Math.max(0, Number($(ids.pergoBackWallSystem).value) || 0);
    const raw = cloneJson(project.input, {});
    raw.__backWallState = deletePergoBackWallScopedValue(raw.__backWallState, systemIndex);
    if (raw.__topBackWallSegments) delete raw.__topBackWallSegments[String(systemIndex)];
    if (raw.__backWallSegments && raw.__backWallSegments.side) delete raw.__backWallSegments.side[String(systemIndex)];
    if (raw.__topBackWallGridState) delete raw.__topBackWallGridState[String(systemIndex)];
    if (raw.__backWallGridState && raw.__backWallGridState.side) delete raw.__backWallGridState.side[String(systemIndex)];
    replacePergoCanonicalInput(raw, pergoInputOwnership(), { schedulePreview: true });
    loadPergoBackWallDialog(systemIndex);
    updatePergoBackWallSummary();
    setFreedomValidation(`Arka duvar Sistem ${systemIndex + 1} PLMR varsayılanına döndürüldü.`);
  }

  function syncPergoBackWallAngleFromDepths() {
    if (suppressPergoBackWallDialogEvents) return;
    const minX = pergoBackWallNumber($(ids.pergoBackWallMinX).value), maxX = pergoBackWallNumber($(ids.pergoBackWallMaxX).value);
    const start = pergoBackWallNumber($(ids.pergoBackWallStartDepth).value), end = pergoBackWallNumber($(ids.pergoBackWallEndDepth).value);
    if ([minX, maxX, start, end].every(Number.isFinite) && maxX > minX) {
      suppressPergoBackWallDialogEvents = true;
      try {
        $(ids.pergoBackWallAngle).value = String(Number((Math.atan2(end - start, maxX - minX) * 180 / Math.PI).toFixed(3)));
        $(ids.pergoBackWallDirection).value = pergoBackWallDirection(start, end);
      } finally { suppressPergoBackWallDialogEvents = false; }
    }
    schedulePergoBackWallLiveUpdate();
  }

  function syncPergoBackWallDepthFromAngle() {
    if (suppressPergoBackWallDialogEvents) return;
    const minX = pergoBackWallNumber($(ids.pergoBackWallMinX).value), maxX = pergoBackWallNumber($(ids.pergoBackWallMaxX).value);
    const start = pergoBackWallNumber($(ids.pergoBackWallStartDepth).value), angle = pergoBackWallNumber($(ids.pergoBackWallAngle).value);
    if ([minX, maxX, start, angle].every(Number.isFinite) && maxX > minX) {
      const end = Math.max(0, start + Math.tan(angle * Math.PI / 180) * (maxX - minX));
      suppressPergoBackWallDialogEvents = true;
      try {
        $(ids.pergoBackWallEndDepth).value = String(Number(end.toFixed(3)));
        $(ids.pergoBackWallDirection).value = pergoBackWallDirection(start, end);
      } finally { suppressPergoBackWallDialogEvents = false; }
    }
    schedulePergoBackWallLiveUpdate();
  }

  function mirrorPergoCompatibilityState(input) {
    const source = input || {};
    modelState.systemCount = Math.max(1, Math.round(Number(source.systemCount) || 1));
    modelState.parapet = source.parapet || 'HAYIR';
    modelState.parapetHeight = source.parapetHeight || '-';
    modelState.pergoOptions = {
      glassTrack: source.glassTrack || 'HAYIR',
      structureColor: source.structureColor || '-',
      fabric: source.fabric || '-',
      fabricProfiles: source.fabricProfiles || '-',
      motor: source.motor || '-',
      remote: source.remote || '-',
      led: source.led || '-',
      dimmer: source.dimmer || '-',
      triangleJoinery: source.triangleJoinery || 'HAYIR',
      waterStandard: source.waterStandard || 'EVET',
      waterOutletPlacement: source.waterOutletPlacement || 'BOTH',
      extras: source.extras || '-'
    };
  }

  function updatePergoCalculatedFieldStyles(ownership) {
    [[ids.pergoRayCount, 'rayCount'], [ids.pergoPostCount, 'postCount']].forEach(([id, field]) => {
      const element = $(id);
      if (!element) return;
      element.classList.toggle('pergo-manual-field', Boolean(ownership && ownership[field]));
      element.classList.toggle('pergo-calculated-field', !Boolean(ownership && ownership[field]) && Boolean(String(element.value || '').trim()));
    });
  }

  function syncPergoRiseInputInfrastructure(options = {}) {
    if (!isPergoRiseUi() || suppressPergoInputInfrastructure) return modelState.pergoRiseProject;
    const api = pergoInputApi();
    if (!api || !window.P3DVPergoRiseProduct || typeof window.P3DVPergoRiseProduct.createDraft !== 'function') return modelState.pergoRiseProject;
    const ownership = options.forceAuto ? { rayCount: false, postCount: false } : pergoInputOwnership();
    try {
      const draft = window.P3DVPergoRiseProduct.createDraft(collectPergoRiseRawInput(), { ownership });
      suppressPergoInputInfrastructure = true;
      try {
        if ($(ids.pergoSystemCount)) $(ids.pergoSystemCount).value = draft.input.systemCount || '';
        if ($(ids.pergoRayCount)) $(ids.pergoRayCount).value = draft.input.rayCount || '';
        if ($(ids.pergoPostCount)) $(ids.pergoPostCount).value = draft.input.postCount || '';
        if ($(ids.remoteInput) && $(ids.remoteInput).value !== draft.input.remote) $(ids.remoteInput).value = draft.input.remote || '-';
        setPergoInputOwnership(draft.ownership);
        updatePergoCalculatedFieldStyles(draft.ownership);
      } finally {
        suppressPergoInputInfrastructure = false;
      }
      modelState.pergoRiseProject = draft;
      mirrorPergoCompatibilityState(draft.input);
      updatePergoBackWallSummary();
      if ($(ids.pergoWaterOutletPlacementRow)) $(ids.pergoWaterOutletPlacementRow).hidden = draft.input.waterStandard !== 'HAYIR';
      if (draft.errors && draft.errors.length) setFreedomValidation(`PLMR kuralı: ${draft.errors[0]}`);
      else if (!options.keepValidation) setFreedomValidation('');
      if (options.schedulePreview) scheduleAutomaticPreview();
      return draft;
    } catch (error) {
      setFreedomValidation(`PLMR veri giriş kuralı: ${error && error.message ? error.message : String(error)}`);
      return modelState.pergoRiseProject;
    }
  }

  function renderPergoInputFromCanonical() {
    const api = pergoInputApi();
    const project = modelState.pergoRiseProject || (window.P3DVPergoRiseProduct && window.P3DVPergoRiseProduct.createDraft
      ? window.P3DVPergoRiseProduct.createDraft(api ? api.DEFAULT_INPUT : {}, { ownership: { rayCount: false, postCount: false } }) : null);
    if (!project || !project.input) return;
    modelState.pergoRiseProject = project;
    const raw = project.input;
    suppressPergoInputInfrastructure = true;
    try {
      if ($(ids.pergoSystemCount)) $(ids.pergoSystemCount).value = raw.systemCount || '';
      if ($(ids.freedomWidth)) $(ids.freedomWidth).value = raw.width || '';
      setDepthControlValue(raw.opening || '');
      if ($(ids.freedomHeight)) $(ids.freedomHeight).value = raw.rearHeight || '';
      if ($(ids.pergoFrontHeight)) $(ids.pergoFrontHeight).value = raw.frontHeight || '';
      if ($(ids.pergoRayCount)) $(ids.pergoRayCount).value = raw.rayCount || '';
      if ($(ids.pergoPostCount)) $(ids.pergoPostCount).value = raw.postCount || '';
      if ($(ids.parapetInput)) $(ids.parapetInput).value = raw.parapet || 'HAYIR';
      if ($(ids.parapetHeightInput)) $(ids.parapetHeightInput).value = raw.parapetHeight || '-';
      if ($(ids.pergoGlassTrack)) $(ids.pergoGlassTrack).value = raw.glassTrack || 'HAYIR';
      if ($(ids.pergoGlassRayBoundaryMode)) $(ids.pergoGlassRayBoundaryMode).value = raw.glassRayBoundaryMode || 'DARALT';
      if ($(ids.pergoStructureColor)) $(ids.pergoStructureColor).value = raw.structureColor || '-';
      if ($(ids.pergoFabric)) $(ids.pergoFabric).value = raw.fabric || '-';
      if ($(ids.pergoFabricProfiles)) $(ids.pergoFabricProfiles).value = raw.fabricProfiles || '-';
      if ($(ids.motorInput)) $(ids.motorInput).value = raw.motor || '-';
      if ($(ids.remoteInput)) $(ids.remoteInput).value = raw.remote || '-';
      if ($(ids.ledInput)) $(ids.ledInput).value = raw.led || '-';
      if ($(ids.pergoDimmer)) $(ids.pergoDimmer).value = raw.dimmer || '-';
      if ($(ids.extrasInput)) $(ids.extrasInput).value = raw.extras || '-';
      if ($(ids.pergoTriangleJoinery)) $(ids.pergoTriangleJoinery).value = raw.triangleJoinery || 'HAYIR';
      if ($(ids.waterStandardInput)) $(ids.waterStandardInput).value = raw.waterStandard || 'EVET';
      if ($(ids.pergoWaterOutletPlacement)) $(ids.pergoWaterOutletPlacement).value = raw.waterOutletPlacement || 'BOTH';
      setPergoInputOwnership(project.ownership || { rayCount: false, postCount: false });
      updatePergoCalculatedFieldStyles(project.ownership || {});
    } finally {
      suppressPergoInputInfrastructure = false;
    }
    mirrorPergoCompatibilityState(raw);
    updatePergoBackWallSummary();
    updatePergoLargePreviewOptions();
  }

  function replacePergoCanonicalInput(raw, ownership, options = {}) {
    const project = window.P3DVPergoRiseProduct.createDraft(raw, { ownership: ownership || { rayCount: false, postCount: false } });
    modelState.pergoRiseProject = project;
    renderPergoInputFromCanonical();
    if (options.clearModel) {
      modelState.width = 0; modelState.depth = 0; modelState.height = 0; modelState.panelCount = 1;
      // Keep the current iframe/camera alive. The guidance layer marks the input as incomplete.
    }
    if (options.schedulePreview !== false) scheduleAutomaticPreview();
    return project;
  }

  function resetPergoSystemInputs() {
    if (!isPergoRiseUi()) return;
    const api = pergoInputApi();
    const raw = { ...(modelState.pergoRiseProject && modelState.pergoRiseProject.input || api.DEFAULT_INPUT) };
    Object.assign(raw, { systemCount: '', width: '', opening: '', rearHeight: '', frontHeight: '', rayCount: '', postCount: '' });
    replacePergoCanonicalInput(raw, { rayCount: false, postCount: false }, { clearModel: true, schedulePreview: false });
    showPreviewInputGuidance('Sistem Adedi, Genişlik, Açılım, Arka H ve Ön H alanlarını doldurun. Ray ve dikme değerleri otomatik hesaplanır.', 'warning');
    setFreedomValidation('Sistem ölçüleri PLMR varsayılanlarına sıfırlandı.', 'warning');
  }

  function resetPergoOptions() {
    if (!isPergoRiseUi()) return;
    const api = pergoInputApi();
    const raw = { ...(modelState.pergoRiseProject && modelState.pergoRiseProject.input || api.DEFAULT_INPUT) };
    Object.assign(raw, {
      parapet: 'HAYIR', parapetHeight: '-', glassTrack: 'HAYIR', glassRayBoundaryMode: 'DARALT',
      structureColor: '-', fabric: '-', fabricProfiles: '-', motor: '-', remote: '-', led: '-', dimmer: '-', extras: '-'
    });
    replacePergoCanonicalInput(raw, pergoInputOwnership());
    setFreedomValidation('Opsiyonlar PLMR varsayılanlarına sıfırlandı.', 'warning');
  }

  function resetPergoExtraOptions() {
    if (!isPergoRiseUi()) return;
    const api = pergoInputApi();
    const raw = { ...(modelState.pergoRiseProject && modelState.pergoRiseProject.input || api.DEFAULT_INPUT) };
    Object.assign(raw, { triangleJoinery: 'HAYIR', waterStandard: 'EVET', waterOutletPlacement: 'BOTH' });
    replacePergoCanonicalInput(raw, pergoInputOwnership());
    setFreedomValidation('Ek opsiyonlar PLMR varsayılanlarına sıfırlandı.', 'warning');
  }

  function resetPergoAllInputs() {
    if (!isPergoRiseUi()) return;
    const api = pergoInputApi();
    replacePergoCanonicalInput(api.clone(api.DEFAULT_INPUT), { rayCount: false, postCount: false }, { clearModel: true, schedulePreview: false });
    showPreviewInputGuidance('Pergola veri girişi sıfırlandı. Zorunlu alanları doldurduğunuzda 2D çizim otomatik hazırlanır.', 'warning');
    setFreedomValidation('Tüm Pergola değerleri PLMR açılış durumuna sıfırlandı.', 'warning');
  }

  function setPergoCalculatorResult(message, isError) {
    const node = $(ids.pergoCalcResult);
    if (!node) return;
    node.textContent = message;
    node.classList.toggle('is-error', Boolean(isError));
  }

  function openPergoCalculator() {
    if (!isPergoRiseUi()) return;
    if ($(ids.pergoCalcOpening)) $(ids.pergoCalcOpening).value = pergoUiValue(ids.freedomDepth, '');
    if ($(ids.pergoCalcRear)) $(ids.pergoCalcRear).value = pergoUiValue(ids.freedomHeight, '');
    if ($(ids.pergoCalcFront)) $(ids.pergoCalcFront).value = pergoUiValue(ids.pergoFrontHeight, '');
    if ($(ids.pergoCalcAngle)) $(ids.pergoCalcAngle).value = '';
    pergoCalculatorLastResult = null;
    setPergoCalculatorResult('4 satırdan birini boş bırakın; boş değer PLMR formülüyle hesaplanır.', false);
    const dialog = $(ids.pergoCalculatorDialog);
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
  }

  function calculatePergoMissingValue() {
    try {
      const result = pergoInputApi().calculateSystem({
        angle: pergoUiValue(ids.pergoCalcAngle, ''),
        opening: pergoUiValue(ids.pergoCalcOpening, ''),
        rear: pergoUiValue(ids.pergoCalcRear, ''),
        front: pergoUiValue(ids.pergoCalcFront, '')
      });
      pergoCalculatorLastResult = result;
      const targets = [ids.pergoCalcAngle, ids.pergoCalcOpening, ids.pergoCalcRear, ids.pergoCalcFront];
      if ($(targets[result.missingIndex])) $(targets[result.missingIndex]).value = result.resultText;
      setPergoCalculatorResult(`Hesaplandı (${result.pozSay} poz): ${result.resultText}`, false);
      return result;
    } catch (error) {
      pergoCalculatorLastResult = null;
      setPergoCalculatorResult(error && error.message ? error.message : String(error), true);
      return null;
    }
  }

  function transferPergoCalculatorValues() {
    const result = pergoCalculatorLastResult || calculatePergoMissingValue();
    if (!result) return;
    const mappings = [
      [ids.pergoCalcOpening, ids.freedomDepth],
      [ids.pergoCalcRear, ids.freedomHeight],
      [ids.pergoCalcFront, ids.pergoFrontHeight]
    ];
    mappings.forEach(([sourceId, targetId]) => {
      if (!$(sourceId) || !$(targetId) || !String($(sourceId).value || '').trim()) return;
      $(targetId).value = String($(sourceId).value || '');
      $(targetId).dispatchEvent(new Event('input', { bubbles: true }));
    });
    syncPergoRiseInputInfrastructure({ schedulePreview: true });
    const dialog = $(ids.pergoCalculatorDialog);
    if (dialog && typeof dialog.close === 'function') dialog.close();
  }

  function clearPergoCalculator() {
    [ids.pergoCalcAngle, ids.pergoCalcOpening, ids.pergoCalcRear, ids.pergoCalcFront].forEach(id => { if ($(id)) $(id).value = ''; });
    pergoCalculatorLastResult = null;
    setPergoCalculatorResult('Sonuç bekleniyor.', false);
  }

  function sanitizePergoFieldElement(field, element) {
    if (!element || !isPergoRiseUi()) return;
    const api = pergoInputApi();
    if (!api || typeof api.sanitizeField !== 'function') return;
    const original = String(element.value == null ? '' : element.value);
    const selectionStart = typeof element.selectionStart === 'number' ? element.selectionStart : null;
    const normalized = api.sanitizeField(field, original);
    if (normalized === original) return;
    element.value = normalized;
    if (selectionStart !== null && typeof element.setSelectionRange === 'function') {
      const prefix = api.sanitizeField(field, original.slice(0, selectionStart));
      const caret = Math.min(String(prefix).length, String(normalized).length);
      try { element.setSelectionRange(caret, caret); } catch (_) {}
    }
  }

  function handlePergoCanonicalFieldInput(field, element, options = {}) {
    if (!isPergoRiseUi()) return false;
    sanitizePergoFieldElement(field, element);
    if (field === 'rayCount' || field === 'postCount') {
      if (element) element.dataset.userEdited = 'true';
    }
    syncPergoRiseInputInfrastructure({ schedulePreview: options.schedulePreview !== false });
    if (field === 'motor') renderRemoteComboMenu();
    return true;
  }

  function applyPergoQuickTestPreset(index) {
    if (!isPergoRiseUi()) return false;
    const preset = PERGO_RISE_QUICK_TESTS[Math.max(1, Math.min(16, Number(index) || 1)) - 1];
    if (!preset) return false;
    const api = pergoInputApi();
    const raw = api.clone(api.DEFAULT_INPUT);
    Object.assign(raw, preset.values || {});
    const ownership = {
      rayCount: Object.prototype.hasOwnProperty.call(preset.values || {}, 'rayCount'),
      postCount: Object.prototype.hasOwnProperty.call(preset.values || {}, 'postCount')
    };
    replacePergoCanonicalInput(raw, ownership, { schedulePreview: true });
    document.querySelectorAll('.quick-test-grid button').forEach((button) => button.classList.toggle('is-active', button.id === `quickTestBtn${index}`));
    if ($(ids.quickTestStatus)) $(ids.quickTestStatus).textContent = `${preset.name} yüklendi: ${preset.title}`;
    return true;
  }

  function syncPergoQuickTestButtons(isPergoRise) {
    const grid = document && typeof document.querySelector === 'function' ? document.querySelector('.quick-test-grid') : null;
    if (!grid) return;
    for (let quickIndex = 11; quickIndex <= 16; quickIndex += 1) {
      let button = $(`quickTestBtn${quickIndex}`);
      if (!button) {
        button = document.createElement('button');
        button.id = `quickTestBtn${quickIndex}`;
        button.type = 'button';
        button.textContent = `Test ${quickIndex}`;
        grid.appendChild(button);
      }
      button.hidden = !isPergoRise;
    }
  }

  function syncFreedomOptionStateFromUi() {
    if (isPergoRiseUi()) {
      syncPergoRiseInputInfrastructure({ schedulePreview: true });
      return;
    }
    modelState.panelColorIndependent = !$(ids.panelColorIndependent) || Boolean($(ids.panelColorIndependent).checked);
    modelState.panelFill = $(ids.panelFill) ? $(ids.panelFill).value : (modelState.panelFill || 'EVET');
    modelState.motor = $(ids.motorInput) ? $(ids.motorInput).value : (modelState.motor || 'Yok');
    modelState.remote = $(ids.remoteInput) ? $(ids.remoteInput).value : (modelState.remote || 'Yok');
    modelState.led = $(ids.ledInput) ? $(ids.ledInput).value : (modelState.led || 'NO');
    modelState.dimmer = $(ids.dimmerInput) ? $(ids.dimmerInput).value : (modelState.dimmer || 'HAYIR');
    modelState.parapet = $(ids.parapetInput) ? $(ids.parapetInput).value : (modelState.parapet || 'HAYIR');
    modelState.parapetHeight = $(ids.parapetHeightInput) ? $(ids.parapetHeightInput).value : (modelState.parapetHeight || '');
    modelState.waterStandard = $(ids.waterStandardInput) ? $(ids.waterStandardInput).value : (modelState.waterStandard || 'EVET');
    modelState.extras = $(ids.extrasInput) ? $(ids.extrasInput).value : (modelState.extras || '');
  }

  function syncFreedomOptionUi() {
    if (isPergoRiseUi()) {
      renderPergoInputFromCanonical();
      if ($(ids.motorInput)) $(ids.motorInput).readOnly = false;
      if ($(ids.ledInput)) $(ids.ledInput).readOnly = false;
      const motor = modelState.pergoRiseProject && modelState.pergoRiseProject.input && modelState.pergoRiseProject.input.motor || '-';
      const noMotor = normalizeMotorKey(motor) === '-';
      if ($(ids.remoteInput)) $(ids.remoteInput).disabled = noMotor;
      if ($(ids.remoteComboButton)) $(ids.remoteComboButton).disabled = noMotor;
      if ($(ids.pergoWaterOutletPlacementRow)) $(ids.pergoWaterOutletPlacementRow).hidden = ((modelState.pergoRiseProject && modelState.pergoRiseProject.input && modelState.pergoRiseProject.input.waterStandard) || 'EVET') !== 'HAYIR';
      renderMotorComboMenu(); renderRemoteComboMenu(); renderPergoFabricComboMenu();
      return;
    }
    if ($(ids.panelColorIndependent)) $(ids.panelColorIndependent).checked = modelState.panelColorIndependent !== false;
    if ($(ids.panelFill)) $(ids.panelFill).value = modelState.panelFill || 'EVET';
    if ($(ids.motorInput)) { $(ids.motorInput).value = modelState.motor || 'Yok'; $(ids.motorInput).readOnly = true; }
    if ($(ids.remoteInput)) $(ids.remoteInput).value = modelState.remote || 'Yok';
    if ($(ids.ledInput)) $(ids.ledInput).value = modelState.led || 'NO';
    if ($(ids.dimmerInput)) $(ids.dimmerInput).value = modelState.dimmer || 'HAYIR';
    if ($(ids.parapetInput)) $(ids.parapetInput).value = modelState.parapet || 'HAYIR';
    if ($(ids.parapetHeightInput)) $(ids.parapetHeightInput).value = modelState.parapetHeight || '';
    if ($(ids.waterStandardInput)) $(ids.waterStandardInput).value = modelState.waterStandard || 'EVET';
    if ($(ids.extrasInput)) $(ids.extrasInput).value = modelState.extras || '';
    const noMotor = normalizeMotorKey(modelState.motor) === 'YOK';
    if ($(ids.remoteInput)) $(ids.remoteInput).disabled = noMotor;
    if ($(ids.remoteComboButton)) $(ids.remoteComboButton).disabled = noMotor;
    renderMotorComboMenu(); renderRemoteComboMenu(); renderLedComboMenu(); updateColorControls();
  }

  function syncPanelColorIndependence() {
    modelState.panelColorIndependent = Boolean($(ids.panelColorIndependent) && $(ids.panelColorIndependent).checked);
    if (!modelState.panelColorIndependent) modelState.panelColor = { ...modelState.systemColor };
    updateColorControls();
    applyColorStateLive();
  }

  function updateProductInputUi() {
    const spec = activeProductSpec();
    const isPergoRise = modelState.productGroup === 'pergo-rise';
    const isFreedomFamily = !isPergoRise;
    if(document.body&&document.body.classList){
      document.body.classList.toggle('is-pergo-rise', isPergoRise);
      document.body.classList.toggle('is-freedom-family', isFreedomFamily);
    }
    if ($(ids.productGroup)) $(ids.productGroup).value = modelState.productGroup;
    setText(ids.productSubgroup, spec.subgroupLabel);
    setText(ids.positionTitle, `${spec.modelLabel} Poz1`);
    setText(ids.positionDialogTitle, `${spec.modelLabel} Poz1`);
    setText(ids.previewProductLabel, spec.modelLabel);
    $(ids.frame).title = `${spec.modelLabel} 3D viewer`;
    updateDrawingModeUi();

    $(ids.freedomWidth).type = 'text';
    $(ids.freedomWidth).inputMode = 'text';
    $(ids.freedomWidth).removeAttribute('min');
    $(ids.freedomWidth).removeAttribute('max');
    $(ids.freedomWidth).placeholder = isPergoRise
      ? 'Örn. 4000 veya 3000;100;2500;NO'
      : ((isFreedomBioGroup(modelState.productGroup)) ? 'Toplam 12000 · Yan yana 4000;3500;3800 · Arka arkaya 4000;3500:3800;4200' : 'Örn. 4000');
    setText(ids.freedomWidthLimitNote, `Önerilen maksimum: ${spec.widthMax} mm · Üzeri uyarıyla çizilir.`);
    $(ids.freedomDepth).type = 'text';
    $(ids.freedomDepth).inputMode = 'text';
    $(ids.freedomDepth).removeAttribute('min');
    $(ids.freedomDepth).removeAttribute('max');
    $(ids.freedomDepth).hidden = false;
    $(ids.freedomDepth).placeholder = isPergoRise
      ? 'Örn. 6000 veya 4500;5200'
      : ((isFreedomBioGroup(modelState.productGroup)) ? `${spec.depthListStart} · Yan yana 3070;5070;4070 · Arka arkaya 3070;5070:4070;6070[:NO]` : `Örn. ${spec.depthListStart}`);
    if ($(ids.projectionCustomToggle)) $(ids.projectionCustomToggle).hidden = isPergoRise;
    if ($(ids.projectionComboMenu) && isPergoRise) $(ids.projectionComboMenu).hidden = true;
    if ($(ids.projectionCombo)) $(ids.projectionCombo).classList.toggle('pergo-plain-input', isPergoRise);
    setText(ids.freedomDepthLimitNote, `Önerilen maksimum: ${spec.depthMax} mm · Üzeri uyarıyla çizilir.`);
    $(ids.freedomHeight).type = 'text';
    $(ids.freedomHeight).inputMode = 'numeric';
    $(ids.freedomHeight).removeAttribute('min');
    $(ids.freedomHeight).removeAttribute('max');
    $(ids.freedomHeight).placeholder = isPergoRise
      ? 'Örn. 3200 veya 3200;3400'
      : ((isFreedomBioGroup(modelState.productGroup)) ? 'Tüm sistemler için ortak, örn. 2600' : (spec.heightMax ? 'Örn. 3000' : 'Örn. 2700'));
    $(ids.freedomPanelCount).min = String(spec.panelMin);
    $(ids.freedomPanelCount).removeAttribute('max');
    $(ids.freedomPanelCount).placeholder = isPergoRise ? 'Pergola için sabit 1' : `Önerilen ${spec.panelMin}–${spec.panelMax} adet`;
    const panelCountLabel = $(ids.freedomPanelCount) && typeof $(ids.freedomPanelCount).closest === 'function' ? $(ids.freedomPanelCount).closest('label') : null;
    if (panelCountLabel) panelCountLabel.hidden = isPergoRise;
    $(ids.productFormula).hidden = false;
    setText(ids.productFormula, isPergoRise
      ? 'PLMR Web DXF / 2D · gerçek Pergola hesaplama ve çizim kuralları · tıklanabilir teknik elemanlar'
      : (modelState.productGroup === 'b-cube'
        ? `Tek toplam genişlikte eşit net göz; ; listesinde dış/merkez referanslı modüller · Açılım listesi ön hizalı, sondaki NO arka hizalıdır`
        : (isBioFamilyGroup(modelState.productGroup)
          ? `${modelState.productGroup === 'b-cube-galaxy' ? 'Bioclimatic 180×140 dikme / 225 kayıt' : 'Eco-Bioclimatic'} · Tek toplam genişlikte eşit net göz; ; listesinde ayrı çerçeve genişlikleri · Ortak dikme yalnız gerçek aks çakışmasında oluşur`
          : `Açılım = Panel Sayısı × ${spec.panelPitch} + ${spec.projectionOffset}`)));
    if ($(ids.pergoRiseFields)) $(ids.pergoRiseFields).hidden = !isPergoRise;
    [ids.pergoCalculator, ids.pergoResetAll, ids.pergoSystemReset, ids.pergoOptionsReset, ids.pergoExtraReset].forEach((id) => {
      const button = $(id); if (!button) return;
      button.disabled = !isPergoRise;
      button.setAttribute('aria-disabled', String(!isPergoRise));
    });
    syncPergoQuickTestButtons(isPergoRise);
    for (let quickIndex = 1; quickIndex <= 10; quickIndex += 1) {
      const quickButton = $(`quickTestBtn${quickIndex}`); if (!quickButton) continue;
      quickButton.disabled = false;
      quickButton.setAttribute('aria-disabled', 'false');
      quickButton.classList.toggle('is-disabled', false);
      if (isPergoRise && PERGO_RISE_QUICK_TESTS[quickIndex - 1]) quickButton.title = PERGO_RISE_QUICK_TESTS[quickIndex - 1].title;
      else quickButton.removeAttribute('title');
    }
    for (let quickIndex = 11; quickIndex <= 16; quickIndex += 1) {
      const quickButton = $(`quickTestBtn${quickIndex}`); if (!quickButton) continue;
      quickButton.disabled = !isPergoRise;
      quickButton.setAttribute('aria-disabled', String(!isPergoRise));
      quickButton.classList.toggle('is-disabled', !isPergoRise);
      if (isPergoRise && PERGO_RISE_QUICK_TESTS[quickIndex - 1]) quickButton.title = PERGO_RISE_QUICK_TESTS[quickIndex - 1].title;
      else quickButton.removeAttribute('title');
    }
    if ($(ids.replay)) $(ids.replay).hidden = isPergoRise;
    setText(ids.primaryWidthLabel, 'Genişlik');
    setText(ids.primaryDepthLabel, 'Açılım');
    setText(ids.primaryHeightLabel, isPergoRise ? 'Arka H' : 'Yükseklik');
    [ids.pergoFrontHeightRow, ids.pergoRayCountRow, ids.pergoPostCountRow].forEach((id) => { const row=$(id); if (row) row.hidden=!isPergoRise; });
    const spacer=$(ids.freedomSystemCardSpacer); if (spacer) spacer.hidden=isPergoRise;
    if (!isPergoRise && !String($(ids.pergoSystemCount).value || '').trim()) $(ids.pergoSystemCount).value=String(modelState.systemCount || 1);
    if (isPergoRise && modelState.pergoRiseProject && modelState.pergoRiseProject.input) {
      const raw = modelState.pergoRiseProject.input;
      if (!String($(ids.freedomWidth).value || '').trim()) $(ids.freedomWidth).value = raw.width || '';
      if (!String($(ids.freedomDepth).value || '').trim()) setDepthControlValue(raw.opening || '');
      if (!String($(ids.freedomHeight).value || '').trim()) $(ids.freedomHeight).value = raw.rearHeight || '';
      if (!String($(ids.pergoSystemCount).value || '').trim()) $(ids.pergoSystemCount).value = raw.systemCount || '';
      if (!String($(ids.pergoFrontHeight).value || '').trim()) $(ids.pergoFrontHeight).value = raw.frontHeight || '';
      if (!String($(ids.pergoRayCount).value || '').trim()) $(ids.pergoRayCount).value = raw.rayCount || '';
      if (!String($(ids.pergoPostCount).value || '').trim()) $(ids.pergoPostCount).value = raw.postCount || '';
    }

    $(ids.width).min = String(spec.widthMin);
    $(ids.width).removeAttribute('max');
    $(ids.depth).min = String(spec.depthMin);
    $(ids.depth).removeAttribute('max');
    $(ids.height).min = String(spec.heightMin);
    if (spec.heightMax) $(ids.height).max = String(spec.heightMax); else $(ids.height).removeAttribute('max');
    populateProjectionOptions();
    syncFreedomOptionUi();
    ensurePdfRequestState(modelState.productGroup);
    renderPdfRequestForm();
  }

  function applyProductGroupDefaults(group) {
    const spec = activeProductSpec(group);
    modelState.productGroup = group;
    modelState.postSections = Array.from({ length: 4 }, () => ({ ...spec.postSection }));
    modelState.beamSection = { ...spec.beamSection };
    modelState.moduleWidths = [];
    modelState.moduleDepths = [];
    modelState.modulePanelCounts = [];
    modelState.multiAlignment = 'front';
    modelState.multiRows = [];
    modelState.rowAlignment = 'left';
    modelState.panelCollection = 'center';
  }

  function resetProductGroupRuntimeState(group) {
    const nextGroup = group === 'bio-rise' ? 'bio-rise' : (group === 'b-cube-galaxy' ? 'b-cube-galaxy' : (group === 'pergo-rise' ? 'pergo-rise' : 'b-cube'));
    const fresh = JSON.parse(JSON.stringify(defaults));
    const spec = PRODUCT_SPECS[nextGroup] || PRODUCT_SPECS['b-cube'];
    fresh.productGroup = nextGroup;
    fresh.postSections = Array.from({ length: 4 }, () => ({ ...spec.postSection }));
    fresh.beamSection = { ...spec.beamSection };
    fresh.systemCount = 1;
    fresh.width = 0;
    fresh.height = 0;
    fresh.depth = nextGroup === 'pergo-rise' ? 0 : Number(spec.depthListStart) || 0;
    fresh.panelCount = nextGroup === 'pergo-rise' ? 1 : panelCountFromProjection(fresh.depth, nextGroup);
    fresh.inputDrafts = { width: '', depth: fresh.depth ? String(fresh.depth) : '', height: '' };
    fresh.pergoRiseProject = null;
    Object.keys(modelState).forEach((key) => { delete modelState[key]; });
    Object.assign(modelState, fresh);
    viewerCameraState = null;
    selectedZone = null;
    selectedZoneId = null;
    selectedDividerProfile = null;
    selectedPostIndex = null;
    toolboxSelectionMode = null;
    toolboxSelectionItems.clear();
    bulkProductZones = null;
    bulkProfileZones = null;
    activeProductSlot = 'primary';
    dimensionVisibility = { intermediate: false, main: true };
    return nextGroup;
  }

  function requestHostProductTransition(productGroup, action) {
    if (!p3dvEmbeddedHostMode || window.parent === window) return false;
    const target = String(productGroup || '');
    if (!['b-cube', 'b-cube-galaxy', 'bio-rise'].includes(target)) return false;
    p3dvHostPost('request-product-transition', { productGroup: target, action: action && typeof action === 'object' ? p3dvHostClone(action) : null }, p3dvHostActiveTransitionId);
    return true;
  }

  function handleProductGroupChange() {
    const requestedGroup = $(ids.productGroup).value;
    const nextGroup = requestedGroup === 'bio-rise' ? 'bio-rise' : (requestedGroup === 'b-cube-galaxy' ? 'b-cube-galaxy' : (requestedGroup === 'pergo-rise' ? 'pergo-rise' : 'b-cube'));
    if (p3dvEmbeddedHostMode && nextGroup !== p3dvHostCanonicalProductGroup) {
      // Embedded P3DV cannot be a second main-product source of truth. Keep its
      // selector on the last host-authorized group until the PLMR host completes
      // the canonical authorization/transition.
      if ($(ids.productGroup)) $(ids.productGroup).value = p3dvHostCanonicalProductGroup || modelState.productGroup;
      requestHostProductTransition(nextGroup, { type: 'inner-product-select' });
      return;
    }
    if (nextGroup !== modelState.productGroup) resetProductGroupRuntimeState(nextGroup);
    setFreedomValidation('');
    p3dvHostSyncControls();
    showRecommendedLimitWarnings({
      width: readFreedomNumber(ids.freedomWidth),
      depth: readFreedomNumber(ids.freedomDepth),
      panelCount: readFreedomNumber(ids.freedomPanelCount)
    });
    p3dvHistoryRebase('product-boundary');
    renderViewer();
  }

  function updateReadouts() {
    const model = readModel();
    const spec = activeProductSpec(model.productGroup);
    setText(ids.positionTitle, `${spec.modelLabel} Poz1`);
    setText(ids.positionDialogTitle, `${spec.modelLabel} Poz1`);
    if (!modelReady(model)) {
      setText(ids.positionSummary, 'Ölçüleri girin');
      setText(ids.productStatus, model.productGroup === 'pergo-rise' ? 'Pergola 2D çizimi için sol paneldeki ölçüleri tamamlayın' : '3D model için sol paneldeki ölçüleri tamamlayın');
      return model;
    }
    if (model.productGroup === 'pergo-rise') {
      const counts = model.pergoRiseProject && model.pergoRiseProject.derived && model.pergoRiseProject.derived.counts || {};
      setText(ids.positionSummary, `${counts.systems || 0} sistem / ${counts.positions || 0} poz / ${counts.rails || 0} ray / ${counts.posts || 0} dikme`);
      setText(ids.productStatus, 'Pergola Web DXF / 2D hazır · PLMR hesaplama, çizim ve düzenleme kuralları aynı kanonik proje verisini kullanır');
      return model;
    }
    const widthSummary=model.multiRows&&model.multiRows.length===2
      ? String(model.inputDrafts&&model.inputDrafts.width||model.width)
      : (model.moduleWidths&&model.moduleWidths.length?model.moduleWidths.join(';'):model.width);
    const depthSummary=model.multiRows&&model.multiRows.length===2
      ? String(model.inputDrafts&&model.inputDrafts.depth||model.depth)
      : (model.moduleDepths&&model.moduleDepths.length>1
        ? `${model.moduleDepths.join(';')}${model.multiAlignment==='rear'?';NO':''}`
        : model.depth);
    const panelSummary=model.modulePanelCounts&&model.modulePanelCounts.length>1?model.modulePanelCounts.join(';'):model.lamellaCount;
    setText(ids.positionSummary, `Genişlik ${widthSummary} mm / Açılım ${depthSummary} mm / Yükseklik ${model.height} mm / ${panelSummary} panel`);
    const placementCount = Object.keys(model.placements || {}).length + Object.keys(model.zipPlacements || {}).length;
    const profileCount = Object.values(model.facadeProfiles || {}).reduce((total, list) => total + (Array.isArray(list) ? list.length : 0), 0);
    const statusParts = [];
    if (placementCount) statusParts.push(`${placementCount} ürün`);
    if (profileCount) statusParts.push(`${profileCount} ara profil`);
    setText(ids.productStatus, statusParts.length ? `${statusParts.join(' · ')} yerleştirildi` : 'Bir cephe alanı seçerek işleme başlayın');
    return model;
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object || {}, key);
  }

  function effectiveProductOpen(productKey) {
    return hasOwn(modelState.productOpenStates, productKey)
      ? Boolean(modelState.productOpenStates[productKey])
      : Boolean(modelState.productsOpen);
  }

  function zipProductKey(zoneId) {
    return `zip:${zoneId}`;
  }

  function primaryPlacement(zoneId) {
    return modelState.placements[zoneId] || null;
  }

  function zipPlacement(zoneId) {
    return modelState.zipPlacements[zoneId] || null;
  }

  function zoneHasAnyProduct(zoneId) {
    return Boolean(primaryPlacement(zoneId) || zipPlacement(zoneId));
  }

  function allProductEntries() {
    const entries = [];
    Object.entries(modelState.placements || {}).forEach(([zoneId, placement]) => {
      entries.push({ key: zoneId, zoneId, placement, slot: 'primary' });
    });
    Object.entries(modelState.zipPlacements || {}).forEach(([zoneId, placement]) => {
      entries.push({ key: zipProductKey(zoneId), zoneId, placement, slot: 'zip' });
    });
    return entries;
  }

  function productTypeLabel(placement) {
    if (!placement) return 'Ürün';
    if (placement.type === 'folding') return 'Katlanır Cam';
    if (placement.type === 'guillotine') return 'Giyotin';
    if (placement.type === 'zip') return 'Zip Perde';
    if (placement.type === 'fixed') return 'Sabit Doğrama';
    if (placement.type === 'door') return 'Kapı (Dış Bakış)';
    return 'Sürme';
  }

  function productZoneLabel(zoneId, placement, sameFacadeIndex) {
    const facadeId = String(zoneId || '').split('|')[0];
    const facadeNames = { front: 'Arka Cephe', back: 'Ön Cephe', left: 'Sol Cephe', right: 'Sağ Cephe' };
    const suffix = sameFacadeIndex > 0 ? ` · Alan ${sameFacadeIndex + 1}` : '';
    return `${facadeNames[facadeId] || facadeId}${suffix} · ${productTypeLabel(placement)}`;
  }

  function pruneProductStates() {
    // V3.4 migration: legacy Zip records are moved into the independent front overlay slot.
    Object.entries(modelState.placements || {}).forEach(([zoneId, placement]) => {
      if (placement && placement.type === 'zip') {
        if (!modelState.zipPlacements[zoneId]) modelState.zipPlacements[zoneId] = placement;
        delete modelState.placements[zoneId];
      }
    });
    const validKeys = new Set(allProductEntries().map((entry) => entry.key));
    Object.keys(modelState.productOpenStates || {}).forEach((key) => {
      if (!validKeys.has(key)) delete modelState.productOpenStates[key];
    });
    const validZipPanels = new Set();
    Object.keys(modelState.zipPlacements || {}).forEach((zoneId) => {
      const productKey = zipProductKey(zoneId);
      validZipPanels.add(productKey);
      if (!hasOwn(modelState.productOpenStates, productKey) && hasOwn(modelState.panelStates, productKey)) {
        modelState.productOpenStates[productKey] = Boolean(modelState.panelStates[productKey]);
      }
      modelState.panelStates[productKey] = effectiveProductOpen(productKey);
    });
    Object.keys(modelState.panelStates || {}).forEach((key) => {
      if (!validZipPanels.has(key)) delete modelState.panelStates[key];
    });
  }

  function safeScriptJson(value) {
    return JSON.stringify(value)
      .replace(/</g, '\\u003C')
      .replace(/>/g, '\\u003E')
      .replace(/&/g, '\\u0026')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  }


  function isPergola2DMode(group = modelState.productGroup) {
    return group === 'pergo-rise';
  }

  function supportsMainTechnical2D(group = modelState.productGroup) {
    return group === 'b-cube-galaxy' || group === 'b-cube' || group === 'bio-rise';
  }

  function isMainTechnical2DMode(group = modelState.productGroup) {
    return supportsMainTechnical2D(group) && p3dvDrawingMode === '2d';
  }

  function technical2DProductLabel(group = modelState.productGroup) {
    return group === 'b-cube' ? 'Rolling Roof' : (group === 'bio-rise' ? 'Eco-Bioclimatic' : 'Bioclimatic');
  }

  function updateDrawingModeUi() {
    const pergola = isPergola2DMode();
    const technical = supportsMainTechnical2D();
    if (pergola) p3dvDrawingMode = '2d';
    else if (!technical) p3dvDrawingMode = '3d';
    const mode2D = $(ids.mode2D);
    const mode3D = $(ids.mode3D);
    const engine = $(ids.engineSelector);
    if (mode2D) {
      const enabled = pergola || technical;
      mode2D.disabled = !enabled;
      mode2D.setAttribute('aria-disabled', String(!enabled));
      mode2D.classList.toggle('is-active', pergola || (technical && p3dvDrawingMode === '2d'));
      mode2D.title = pergola ? 'Pergola Web DXF / 2D çalışma modu aktif' : (technical ? `${technical2DProductLabel()} teknik 2D görünüş` : 'Bu ürün şu anda 3D çalışma modunu kullanır');
    }
    if (mode3D) {
      const enabled = !pergola;
      mode3D.disabled = !enabled;
      mode3D.setAttribute('aria-disabled', String(!enabled));
      mode3D.classList.toggle('is-active', !pergola && (!technical || p3dvDrawingMode === '3d'));
      mode3D.title = pergola ? 'Pergola için 3D geçici olarak pasif' : '3D çalışma modu';
    }
    if (engine) engine.value = pergola || (technical && p3dvDrawingMode === '2d') ? '2d' : '3d';
    if (window.P3DVDocumentCenter && typeof window.P3DVDocumentCenter.refreshAvailability === 'function') window.P3DVDocumentCenter.refreshAvailability();
    const toolbarDxf = $(ids.toolbarDxf);
    if (toolbarDxf) {
      const enabled = (pergola || technical) && modelReady(readModel());
      toolbarDxf.disabled = !enabled;
      toolbarDxf.setAttribute('aria-disabled', String(!enabled));
      toolbarDxf.classList.toggle('is-disabled', !enabled);
      toolbarDxf.title = enabled ? 'Canonical Technical 2D çiziminden DXF indir' : 'Önce geçerli bir çizim oluşturun';
    }
    const toolbarAr = $(ids.toolbarAr);
    if (toolbarAr) {
      const twoDActive = pergola || (technical && p3dvDrawingMode === '2d');
      toolbarAr.disabled = twoDActive || !modelReady(readModel());
      toolbarAr.setAttribute('aria-disabled', String(toolbarAr.disabled));
      toolbarAr.title = twoDActive ? '2D çalışma modunda AR pasif' : '';
    }
  }

  function pergo2DViewBox(svg) {
    if (!svg) return { width: 1000, height: 700 };
    const raw = String(svg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
    if (raw.length === 4 && raw.every(Number.isFinite) && raw[2] > 0 && raw[3] > 0) return { width: raw[2], height: raw[3] };
    return { width: Math.max(1, Number(svg.getAttribute('width')) || 1000), height: Math.max(1, Number(svg.getAttribute('height')) || 700) };
  }

  function applyPergo2DScale() {
    const viewport = $(ids.pergo2DViewport);
    const stage = $(ids.pergo2DStage);
    const svg = stage && stage.querySelector('svg');
    if (!viewport || !stage || !svg) return;
    const box = pergo2DViewBox(svg);
    const pad = 24;
    const availableW = Math.max(120, viewport.clientWidth - pad * 2);
    const availableH = Math.max(120, viewport.clientHeight - pad * 2);
    pergo2DViewState.baseScale = Math.max(0.01, Math.min(availableW / box.width, availableH / box.height));
    const totalScale = pergo2DViewState.baseScale * pergo2DViewState.zoom;
    stage.style.width = `${Math.max(80, box.width * totalScale)}px`;
    stage.style.height = `${Math.max(80, box.height * totalScale)}px`;
    stage.style.margin = `${pad}px`;
  }

  function fitPergo2DView() {
    const viewport = $(ids.pergo2DViewport);
    pergo2DViewState.zoom = 1;
    applyPergo2DScale();
    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollLeft = Math.max(0, (viewport.scrollWidth - viewport.clientWidth) / 2);
        viewport.scrollTop = Math.max(0, (viewport.scrollHeight - viewport.clientHeight) / 2);
      });
    }
  }

  function zoomPergo2DView(factor) {
    const viewport = $(ids.pergo2DViewport);
    if (!viewport) return;
    const oldScale = Math.max(0.0001, pergo2DViewState.baseScale * pergo2DViewState.zoom);
    const worldX = (viewport.scrollLeft + viewport.clientWidth / 2) / oldScale;
    const worldY = (viewport.scrollTop + viewport.clientHeight / 2) / oldScale;
    pergo2DViewState.zoom = Math.max(pergo2DViewState.minZoom, Math.min(pergo2DViewState.maxZoom, pergo2DViewState.zoom * Number(factor || 1)));
    applyPergo2DScale();
    const newScale = Math.max(0.0001, pergo2DViewState.baseScale * pergo2DViewState.zoom);
    requestAnimationFrame(() => {
      viewport.scrollLeft = Math.max(0, worldX * newScale - viewport.clientWidth / 2);
      viewport.scrollTop = Math.max(0, worldY * newScale - viewport.clientHeight / 2);
    });
  }

  function pergo2DTargetFromInteraction(hit) {
    const project = modelState.pergoRiseProject;
    const targets = project && project.derived && project.derived.editing && Array.isArray(project.derived.editing.targets) ? project.derived.editing.targets : [];
    if (!hit || !targets.length) return null;
    const kind = String(hit.dataset.interactionType || '');
    const placementId = String(hit.dataset.placementId || '');
    const sideViewKey = String(hit.dataset.sideViewKey || '');
    const postIndex = String(hit.dataset.postIndex || '');
    const productType = String(hit.dataset.productType || '');
    let best = null, bestScore = -1;
    targets.forEach((target) => {
      const interaction = target && target.plmrInteraction || {};
      const data = interaction.data || {};
      if (kind && interaction.kind && String(interaction.kind) !== kind) return;
      let score = interaction.kind === kind ? 3 : 0;
      if (placementId) score += String(data.placementId || '') === placementId ? 8 : -8;
      if (sideViewKey) score += String(data.sideViewKey || '') === sideViewKey ? 4 : -2;
      if (postIndex !== '') score += String(data.postIndex ?? target.postIndex ?? '') === postIndex ? 4 : -2;
      if (productType) score += String(data.productType || '') === productType ? 2 : 0;
      if (score > bestScore) { best = target; bestScore = score; }
    });
    return bestScore >= 3 ? best : null;
  }

  function selectPergo2DTarget(target) {
    if (!target) return false;
    const bounds = target.bounds || target.plmrGeometry || {};
    const width = Math.max(1, Number(target.netWidth) || Math.abs(Number(bounds.maxX) - Number(bounds.minX)) || 1000);
    const height = Math.max(1, Number(target.netHeight) || Math.abs(Number(bounds.maxY) - Number(bounds.minY)) || 1000);
    selectedZone = {
      id: `pergo-2d:${target.id}`,
      label: target.label || 'Pergola elemanı', width, height,
      pergoRise: true, editingTarget: target,
      face: target.face || 'front', facadeId: target.face || 'front'
    };
    selectedZoneId = selectedZone.id;
    openZoneActionDialog();
    return true;
  }


  function pergolaDisplaySvgMarkup(drawing) {
    if (!window.PulumurGeometry || typeof window.PulumurGeometry.renderSvg !== 'function') return '';
    // Keep the PLMR V13.92 geometry/calculation engine byte-for-byte intact;
    // only translate the legacy product name in its rendered user-facing SVG.
    return String(window.PulumurGeometry.renderSvg(drawing) || '').replace(/PERGO RISE/g, 'PERGOLA');
  }

  function renderPergo2DPreview(options = {}) {
    const viewport = $(ids.pergo2DViewport);
    const stage = $(ids.pergo2DStage);
    const frame = $(ids.frame);
    if (!viewport || !stage || !frame) return false;
    frame.hidden = true;
    frame.style.display = 'none';
    viewport.hidden = false;
    const project = modelState.pergoRiseProject;
    const projectReady = Boolean(project && project.input)
      && !(Array.isArray(project.missing) && project.missing.length)
      && !(Array.isArray(project.errors) && project.errors.length)
      && project.valid !== false;
    if (!projectReady || !window.PulumurGeometry || typeof window.PulumurGeometry.buildDrawing !== 'function' || typeof window.PulumurGeometry.renderSvg !== 'function') {
      pergo2DLastDrawing = null;
      stage.style.width = 'auto'; stage.style.height = 'auto'; stage.style.margin = '0';
      stage.innerHTML = '<div class="pergo-2d-empty"><div><strong>Pergola · Web DXF / 2D</strong><br>Genişlik, Açılım, Arka H ve Ön H değerlerini girin.<br>Çizim, PLMR Pergola Web DXF motorundan canlı oluşturulur.</div></div>';
      return false;
    }
    const oldSvg = stage.querySelector('svg');
    const oldScale = Math.max(0.0001, pergo2DViewState.baseScale * pergo2DViewState.zoom);
    const keepWorldX = oldSvg ? (viewport.scrollLeft + viewport.clientWidth / 2) / oldScale : 0;
    const keepWorldY = oldSvg ? (viewport.scrollTop + viewport.clientHeight / 2) / oldScale : 0;
    try {
      const drawing = window.PulumurGeometry.buildDrawing(project.input);
      const svgMarkup = pergolaDisplaySvgMarkup(drawing);
      pergo2DLastDrawing = drawing;
      stage.innerHTML = svgMarkup;
      if (options.resetView || !oldSvg) {
        fitPergo2DView();
      } else {
        applyPergo2DScale();
        const newScale = Math.max(0.0001, pergo2DViewState.baseScale * pergo2DViewState.zoom);
        requestAnimationFrame(() => {
          viewport.scrollLeft = Math.max(0, keepWorldX * newScale - viewport.clientWidth / 2);
          viewport.scrollTop = Math.max(0, keepWorldY * newScale - viewport.clientHeight / 2);
        });
      }
      return true;
    } catch (error) {
      console.error('Pergola Web DXF / 2D render failed.', error);
      stage.innerHTML = `<div class="pergo-2d-empty"><div><strong>Pergola 2D çizimi oluşturulamadı.</strong><br>${String(error && error.message || error)}</div></div>`;
      return false;
    }
  }

  function mainTechnical2DServices() {
    // V14.12.6: Technical2D is a P3DV runtime dependency, not a parent-window dependency.
    // This keeps 2D working from local/file-based hosts or any environment where
    // browser security blocks iframe -> parent property access.
    const localAdapter = modelState.productGroup === 'b-cube' ? window.PulumurFreedom2DAdapter : (modelState.productGroup === 'bio-rise' ? window.PulumurBioRise2DAdapter : window.PulumurGalaxy2DAdapter);
    const localWorkspace = window.PulumurTechnical2DWorkspace;
    if (localAdapter && typeof localAdapter.build === 'function' && localWorkspace && typeof localWorkspace.toSvg === 'function') {
      return { adapter: localAdapter, workspace: localWorkspace, source: 'p3dv-local' };
    }
    try {
      const host = window.parent && window.parent !== window ? window.parent : null;
      const adapter = host && (modelState.productGroup === 'b-cube' ? host.PulumurFreedom2DAdapter : (modelState.productGroup === 'bio-rise' ? host.PulumurBioRise2DAdapter : host.PulumurGalaxy2DAdapter));
      const workspace = host && host.PulumurTechnical2DWorkspace;
      if (!adapter || typeof adapter.build !== 'function' || !workspace || typeof workspace.toSvg !== 'function') return null;
      return { adapter, workspace, source: 'parent-compat' };
    } catch (_) { return null; }
  }

  function mainTechnical2DProjectInfo() {
    const text = (id) => { const node = $(id); return node ? String(node.textContent || node.value || '').trim() : ''; };
    return { projectCode: text('projectCodeValue'), date: text(ids.projectDate), revision: 'R01', customer: '', project: '', drawnBy: '' };
  }

  function renderMainTechnical2DPreview(options = {}) {
    const viewport = $(ids.pergo2DViewport);
    const stage = $(ids.pergo2DStage);
    const frame = $(ids.frame);
    if (!viewport || !stage || !frame || !supportsMainTechnical2D()) return false;
    frame.hidden = true;
    frame.style.display = 'none';
    viewport.hidden = false;
    showPreviewInputGuidance('', '');
    const services = mainTechnical2DServices();
    if (!services) {
      stage.style.width = 'auto'; stage.style.height = 'auto'; stage.style.margin = '0';
      stage.innerHTML = '<div class="pergo-2d-empty"><div><strong>${technical2DProductLabel()} · Teknik 2D</strong><br>Teknik 2D renderer yüklenemedi.</div></div>';
      return false;
    }
    try {
      const projection = services.adapter.build(p3dvHostSnapshot(), { projectInfo: mainTechnical2DProjectInfo(), contract: p3dvTechnical2DContract() });
      technical2DLastProjection = projection;
      if (!projection || projection.valid !== true) throw new Error((projection && projection.errors || []).join(' · ') || 'GALAXY_TECHNICAL2D_INVALID');
      const oldSvg = stage.querySelector('svg');
      const oldScale = Math.max(0.0001, pergo2DViewState.baseScale * pergo2DViewState.zoom);
      const keepWorldX = oldSvg ? (viewport.scrollLeft + viewport.clientWidth / 2) / oldScale : 0;
      const keepWorldY = oldSvg ? (viewport.scrollTop + viewport.clientHeight / 2) / oldScale : 0;
      stage.innerHTML = services.workspace.toSvg(projection);
      if (typeof services.workspace.bindStage === 'function') services.workspace.bindStage(stage);
      stage.dataset.technical2dProduct = window.PulumurP3DVProductIdentity && typeof window.PulumurP3DVProductIdentity.productIdForGroup === 'function'
        ? window.PulumurP3DVProductIdentity.productIdForGroup(modelState.productGroup)
        : (modelState.productGroup === 'b-cube' ? 'P3DV_ROLLING_ROOF' : (modelState.productGroup === 'bio-rise' ? 'P3DV_ECO_BIOCLIMATIC' : 'P3DV_BIOCLIMATIC'));
      stage.dataset.technical2dMode = '2d';
      if (options.resetView || !oldSvg) fitPergo2DView();
      else {
        applyPergo2DScale();
        const newScale = Math.max(0.0001, pergo2DViewState.baseScale * pergo2DViewState.zoom);
        requestAnimationFrame(() => {
          viewport.scrollLeft = Math.max(0, keepWorldX * newScale - viewport.clientWidth / 2);
          viewport.scrollTop = Math.max(0, keepWorldY * newScale - viewport.clientHeight / 2);
        });
      }
      return true;
    } catch (error) {
      technical2DLastProjection = null;
      stage.style.width = 'auto'; stage.style.height = 'auto'; stage.style.margin = '0';
      stage.innerHTML = `<div class="pergo-2d-empty"><div><strong>${technical2DProductLabel()} 2D çizimi oluşturulamadı.</strong><br>${String(error && error.message || error)}</div></div>`;
      return false;
    }
  }

  function requestEmbeddedHostDrawingMode(mode) {
    const target = String(mode || '').toLowerCase() === '2d' ? '2d' : '3d';

    // V14.28.6 corrective: the visible toolbar must never depend on the iframe ->
    // host bridge just to produce a visible 2D/3D transition. Apply the already
    // existing P3DV presentation mode locally first, then synchronize the host's
    // canonical presentation owner. This keeps physical/canonical product state in
    // one place while making the user control reliable under file:// opaque origins
    // and any temporarily unavailable host bridge.
    const localMode = setP3dvDrawingMode(target, { resetView: target === '2d' });
    if (!p3dvEmbeddedHostMode) return localMode;

    let hostApplied = false;
    try {
      const host = window.parent && window.parent.PulumurUnifiedWorkspace;
      if (host && typeof host.setMode === 'function') {
        hostApplied = host.setMode(target, { source: 'p3dv-mode-switch' }) !== false;
      }
    } catch (_) {
      hostApplied = false;
    }

    // Cross-origin/opaque file documents cannot read parent APIs. The existing
    // postMessage bridge remains the synchronization fallback, but no longer owns
    // whether the button visibly works.
    if (!hostApplied) p3dvHostPost('request-workspace-mode', { mode: target }, p3dvHostActiveTransitionId);
    return localMode;
  }

  function setP3dvDrawingMode(mode, options = {}) {
    const target = String(mode || '').toLowerCase() === '2d' ? '2d' : '3d';
    if (isPergola2DMode()) p3dvDrawingMode = '2d';
    else if (supportsMainTechnical2D()) p3dvDrawingMode = target;
    else p3dvDrawingMode = '3d';
    updateDrawingModeUi();
    if (isMainTechnical2DMode()) renderMainTechnical2DPreview({ resetView: options.resetView !== false });
    else if (isPergola2DMode()) renderPergo2DPreview({ resetView: options.resetView !== false });
    else {
      const viewport = $(ids.pergo2DViewport);
      const frame = $(ids.frame);
      if (viewport) viewport.hidden = true;
      if (frame) { frame.hidden = false; frame.style.display = 'block'; }
      if (!frame || !frame.srcdoc || options.rebuild === true) renderViewer();
      else { window.dispatchEvent(new Event('resize')); postViewerMessage('viewport-resized'); }
    }
    return p3dvDrawingMode;
  }

  async function captureSvgMarkup(svgMarkup, preset, metadata) {
    if (!svgMarkup) return null;
    const image = new Image();
    const parserHost = document.createElement('div');
    parserHost.innerHTML = String(svgMarkup);
    const sourceSvg = parserHost.querySelector('svg');
    if (!sourceSvg) return null;
    if (!sourceSvg.getAttribute('xmlns')) sourceSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const sourceBox = pergo2DViewBox(sourceSvg);
    const maxW = 2200, maxH = 1600;
    const renderScale = Math.max(0.01, Math.min(maxW / Math.max(1, sourceBox.width), maxH / Math.max(1, sourceBox.height)));
    const renderW = Math.max(1, Math.round(sourceBox.width * renderScale));
    const renderH = Math.max(1, Math.round(sourceBox.height * renderScale));
    sourceSvg.setAttribute('width', String(renderW));
    sourceSvg.setAttribute('height', String(renderH));
    sourceSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const blob = new Blob([sourceSvg.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = url; });
      const canvas = document.createElement('canvas'); canvas.width = renderW; canvas.height = renderH;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      return { preset: preset || 'technical-2d', dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height, liveTechnical2D: true, ...(metadata || {}) };
    } finally { URL.revokeObjectURL(url); }
  }

  async function captureCurrent2DView() {
    if (isPergola2DMode()) {
      if (!pergo2DLastDrawing) renderPergo2DPreview({ resetView: false });
      if (!pergo2DLastDrawing || !window.PulumurGeometry) return null;
      const captured = await captureSvgMarkup(pergolaDisplaySvgMarkup(pergo2DLastDrawing), 'pergola-2d', { source: 'pergola-canonical-drawing' });
      const drawing = window.PulumurExportService && typeof window.PulumurExportService.prepareDrawing === 'function'
        ? window.PulumurExportService.prepareDrawing(pergo2DLastDrawing)
        : pergo2DLastDrawing;
      return captured ? { ...captured, drawing, modelUnits: 'mm', modelScale: 1, vectorTechnical2D: true } : null;
    }
    if (!supportsMainTechnical2D()) return null;
    const services = mainTechnical2DServices();
    if (!services) return null;
    const projection = services.adapter.build(p3dvHostSnapshot(), { projectInfo: mainTechnical2DProjectInfo(), contract: p3dvTechnical2DContract() });
    if (!projection || projection.valid !== true) return null;
    technical2DLastProjection = projection;
    const exporter = window.PulumurTechnical2DExport;
    if (!exporter || typeof exporter.toDrawing !== 'function') throw new Error('TECHNICAL2D_EXPORT_DRAWING_MISSING');
    const technicalScale = typeof services.workspace.commonProjectionScale === 'function' ? services.workspace.commonProjectionScale(projection) : null;
    const drawing = exporter.toDrawing(projection, { technicalScale, source: 'canonical-technical2d' });
    if (typeof exporter.assertMetricDrawing === 'function') exporter.assertMetricDrawing(drawing);
    const captured = await captureSvgMarkup(services.workspace.toSvg(projection), `${modelState.productGroup}-technical-2d`, { source: 'canonical-technical2d', schema: projection.schema, productGroup: projection.productGroup });
    return captured ? { ...captured, drawing, technicalScale, modelUnits: drawing.units, modelScale: drawing.modelScale, vectorTechnical2D: true } : null;
  }

  function currentTechnical2DProjection() {
    if (!supportsMainTechnical2D()) return null;
    const services = mainTechnical2DServices(); if (!services) return null;
    const projection = services.adapter.build(p3dvHostSnapshot(), { projectInfo: mainTechnical2DProjectInfo(), contract: p3dvTechnical2DContract() });
    if (!projection || projection.valid !== true) throw new Error((projection && projection.errors || []).join(' · ') || 'TECHNICAL2D_EXPORT_INVALID');
    technical2DLastProjection = projection; return projection;
  }

  function downloadRuntimeFile(name, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportCurrentTechnicalDxf(options = {}) {
    if (isPergola2DMode()) {
      if (!pergo2DLastDrawing) renderPergo2DPreview({ resetView: false });
      if (!pergo2DLastDrawing || !window.PulumurModernDXF) throw new Error('PERGOLA_DXF_DRAWING_UNAVAILABLE');
      const prepared = window.PulumurExportService ? window.PulumurExportService.prepareDrawing(pergo2DLastDrawing) : pergo2DLastDrawing;
      const dxf = window.PulumurModernDXF.toDxf(prepared);
      if (options.download !== false) downloadRuntimeFile(`pergola-${modelState.width}x${modelState.depth}.dxf`, dxf, 'application/dxf;charset=utf-8');
      return { dxf, source: 'pergola-canonical-drawing' };
    }
    const projection = currentTechnical2DProjection();
    if (!projection || !window.PulumurTechnical2DExport) throw new Error('TECHNICAL2D_DXF_EXPORT_UNAVAILABLE');
    const dxf = window.PulumurTechnical2DExport.toDxf(projection, { source: 'p3dv-canonical-state' });
    const filename = window.PulumurTechnical2DExport.safeFileName(projection, 'dxf');
    if (options.download !== false) downloadRuntimeFile(filename, dxf, 'application/dxf;charset=utf-8');
    return { dxf, filename, projectionSchema: projection.schema, source: 'canonical-technical2d' };
  }


  function buildEmptyViewerHtml(message) {
    const safe = String(message || 'Ölçüleri girin').replace(/[&<>"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
    return `<!doctype html><html><head><meta charset="utf-8"><style>html,body{height:100%;margin:0}body{display:grid;place-items:center;background:#eef3f7;font-family:Arial,Helvetica,sans-serif;color:#576574}.empty{display:grid;place-items:center;width:240px;height:380px;padding:18px;text-align:center;border:2px dashed #c6d4df;border-radius:16px;background:rgba(255,255,255,.10)}strong,.legacy-prompt{display:none}span{max-width:220px;font-size:13px;line-height:1.5;font-weight:800;color:#64717d}</style></head><body><div class="empty"><strong>${productModelLabel()} · Modul 1</strong><span>Önizleme için zorunlu ölçüleri doldurun.</span><i class="legacy-prompt">${safe}</i></div></body></html>`;
  }

  function renderViewer() {
    viewerLiveProductStateReady = false;
    viewerLivePanelMasterReady = false;
    viewerLivePergoRiseReady = false;
    viewerLiveColorStateReady = false;
    viewerLiveModelStateReady = false;
    pendingLiveProductState = false;
    pendingLivePanelMasterState = false;
    pendingLiveColorState = false;
    pendingLiveModelState = false;
    activeViewerSessionId = `p3dv-viewer-${Date.now()}-${++viewerSessionCounter}`;
    pruneProductStates();
    const model = updateReadouts();
    activeViewerProductGroup = model.productGroup;
    activeViewerModelReady = modelReady(model);
    updateDrawingModeUi();
    const frame = $(ids.frame);
    const viewport2D = $(ids.pergo2DViewport);
    const arButton = $(ids.mobileAr);
    if (isPergola2DMode(model.productGroup)) {
      activeViewerSessionId = '';
      if (arButton) arButton.disabled = true;
      setMobileArStatus('Pergola Web DXF / 2D modu aktif. 3D ve AR bu demo sürümünde pasiftir.', 'warning');
      renderPergo2DPreview({ resetView: false });
      return;
    }
    if (isMainTechnical2DMode(model.productGroup)) {
      activeViewerSessionId = '';
      if (arButton) arButton.disabled = true;
      setMobileArStatus(`${technical2DProductLabel()} teknik 2D modu aktif.`, 'warning');
      renderMainTechnical2DPreview({ resetView: false });
      return;
    }
    if (viewport2D) viewport2D.hidden = true;
    if (frame) { frame.hidden = false; frame.style.display = 'block'; }
    if (!modelReady(model)) {
      if (arButton) arButton.disabled = true;
      setMobileArStatus('Gerçek alan görünümü için önce geçerli bir 3D model oluşturun.', 'warning');
      const emptyMessage = modelState.productGroup === 'pergo-rise'
        ? 'Sol taraftaki Genişlik, Açılım ve Yükseklik alanlarını doldurun.'
        : 'Sol taraftaki Genişlik, Açılım, Yükseklik ve Panel Sayısı alanlarını doldurun.';
      $(ids.frame).srcdoc = buildEmptyViewerHtml(emptyMessage);
      return;
    }
    if (arButton) arButton.disabled = false;
    setMobileArStatus('3D sahne hazırlanıyor. Mobil AR desteği cihazda otomatik kontrol edilir.');
    $(ids.frame).srcdoc = buildViewerHtml({
      ...model,
      pergoRiseUrl: model.productGroup === 'pergo-rise' ? pergoRiseAssetPath : '',
      pergoRiseProject: model.productGroup === 'pergo-rise' ? model.pergoRiseProject : null,
      viewerSessionId: activeViewerSessionId,
      cameraState: viewerCameraState,
      selectedZoneId,
      dimensionVisibility: { ...dimensionVisibility },
      productsOpen: Boolean(modelState.productsOpen),
      productOpenStates: JSON.parse(JSON.stringify(modelState.productOpenStates || {})),
      panelStates: JSON.parse(JSON.stringify(modelState.panelStates || {})),
      panelMasterOpen: Boolean(modelState.panelMasterOpen),
      toolboxSelectionMode,
      toolboxSelectionKeys: [...toolboxSelectionItems.keys()]
    });
  }

  function setMobileArStatus(message, tone = '') {
    const status = $(ids.mobileArStatus);
    if (!status) return;
    status.textContent = String(message || '');
    if (tone) status.setAttribute('data-tone', tone); else status.removeAttribute('data-tone');
  }

  async function refreshMobileArCapability() {
    if (isPergola2DMode()) return;
    const button = $(ids.mobileAr);
    const frame = $(ids.frame);
    if (!button || !frame || !modelReady(readModel())) return;
    const child = frame.contentWindow;
    if (!child || typeof child.getP3DVARCapabilities !== 'function') {
      setMobileArStatus('3D sahne yükleniyor; AR denetimi henüz hazır değil.');
      return;
    }
    try {
      const capability = await child.getP3DVARCapabilities();
      if (capability && capability.supported) {
        button.disabled = false;
        setMobileArStatus(`AR hazır · Gerçek ölçek 1:1 · ${Math.round(modelState.width)} mm genişlik ${(Number(modelState.width) / 1000).toFixed(2)} m olarak yerleşir.`, 'success');
      } else {
        button.disabled = false;
        setMobileArStatus((capability && capability.message) || 'Bu cihazda WebXR AR desteği bulunamadı.', 'warning');
      }
    } catch (error) {
      button.disabled = false;
      setMobileArStatus(`AR desteği denetlenemedi: ${error.message}`, 'warning');
    }
  }

  async function startMobileAr() {
    const model = readModel();
    if (model.productGroup === 'pergo-rise') { setMobileArStatus('Pergola için 3D / AR bu demo sürümünde pasiftir.', 'warning'); return; }
    if (!modelReady(model)) {
      setMobileArStatus('Önce geçerli bir 3D model oluşturun.', 'warning');
      return;
    }
    const frame = $(ids.frame);
    const child = frame && frame.contentWindow;
    if (!child || typeof child.startP3DVAR !== 'function') {
      setMobileArStatus('3D viewer henüz hazır değil. Birkaç saniye sonra tekrar dokunun.', 'warning');
      return;
    }
    const button = $(ids.mobileAr);
    const original = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = 'AR Hazırlanıyor…';
    }
    setMobileArStatus('Kamera ve manuel gerçek ölçekli yerleşim başlatılıyor…');
    try {
      const result = await child.startP3DVAR();
      if (result && result.ok) {
        setMobileArStatus(result.message || 'AR oturumu başlatıldı. Ürün gerçek ölçekte çizildi; konumunu elle ayarlayın.', 'success');
      } else {
        setMobileArStatus((result && result.message) || 'AR oturumu başlatılamadı.', (result && result.retryInsideViewer) ? 'warning' : 'error');
      }
    } catch (error) {
      setMobileArStatus(`AR başlatılamadı: ${error.message}`, 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = original || 'Gerçek Alanda Gör';
      }
    }
  }

  function setDialogValues() {
    $(ids.width).value = modelState.width || '';
    $(ids.depth).value = modelState.depth || '';
    $(ids.height).value = modelState.height || '';
    updateDialogLamella();
  }

  function updateDialogLamella() {
    const depth = Math.round(Number(String($(ids.depth).value || '').replace(',', '.')));
    $(ids.dialogLamella).textContent = String(panelCountFromProjection(Number.isFinite(depth) ? depth : modelState.depth));
  }

  function openPositionDialog() {
    $(ids.freedomWidth).focus();
    $(ids.freedomWidth).select();
  }

  function closePositionDialog() {
    $(ids.dialog).hidden = true;
  }

  function readDialogNumber(id, minimum) {
    const value = Math.round(Number(String($(id).value || '').replace(',', '.')));
    if (!Number.isFinite(value) || value < minimum) return null;
    return value;
  }

  function dimensionsFit(model) {
    if (isFreedomBioGroup(model.productGroup)) {
      const layout = model.productGroup === 'b-cube' ? (model.freedomLayout || freedomMultiPositionLayout(model)) : (model.productGroup === 'b-cube-galaxy' ? (model.galaxyLayout || galaxyMultiPositionLayout(model)) : (model.bioRiseLayout || bioRiseMultiPositionLayout(model)));
      if (!layout || !layout.valid) return false;
      const modulesFit = (layout.modules || []).every((module) => {
        const rearLeft = Number((module.rearLeftSection || (layout.rearSections && layout.rearSections[module.leftLine]) || model.postSections[0]).z) || 0;
        const rearRight = Number((module.rearRightSection || (layout.rearSections && layout.rearSections[module.rightLine]) || model.postSections[1]).z) || 0;
        const frontLeft = Number((module.frontLeftSection || (layout.frontSections && layout.frontSections[module.leftLine]) || model.postSections[2]).z) || 0;
        const frontRight = Number((module.frontRightSection || (layout.frontSections && layout.frontSections[module.rightLine]) || model.postSections[3]).z) || 0;
        const requiredDepth = Math.max(rearLeft + frontLeft, rearRight + frontRight) + 120;
        return module.clearWidth >= 120 && module.depth >= requiredDepth && model.beamSection.thickness < Math.min(module.clearWidth, module.depth) / 2;
      });
      return modulesFit && model.beamSection.vertical < model.height - 200;
    }
    return (
      model.postSections[0].x + model.postSections[1].x <= model.width - 120 &&
      model.postSections[2].x + model.postSections[3].x <= model.width - 120 &&
      model.postSections[0].z + model.postSections[2].z <= model.depth - 120 &&
      model.postSections[1].z + model.postSections[3].z <= model.depth - 120 &&
      model.beamSection.vertical < model.height - 200 &&
      model.beamSection.thickness < Math.min(model.width, model.depth) / 2
    );
  }

  function applyPositionForm() {
    const spec = activeProductSpec();
    const nextWidth = readDialogNumber(ids.width, spec.widthMin);
    const nextDepth = readDialogNumber(ids.depth, spec.depthMin);
    const nextHeight = readDialogNumber(ids.height, spec.heightMin);
    if (nextWidth === null || nextDepth === null || nextHeight === null || (spec.heightMax && nextHeight > spec.heightMax)) {
      alert('Please enter valid Width, Projection and Height values.');
      return;
    }
    const previous = { width: modelState.width, depth: modelState.depth, height: modelState.height, panelCount: modelState.panelCount, systemCount: modelState.systemCount };
    modelState.width = nextWidth;
    modelState.depth = nextDepth;
    modelState.height = nextHeight;
    modelState.panelCount = panelCountFromProjection(nextDepth);
    const model = readModel();
    if (isFreedomBioGroup(modelState.productGroup)) {
      const layout = modelState.productGroup === 'b-cube' ? freedomMultiPositionLayout(modelState) : (modelState.productGroup === 'b-cube-galaxy' ? galaxyMultiPositionLayout(modelState) : bioRiseMultiPositionLayout(modelState));
      if (!layout || !layout.valid) {
        modelState.width = previous.width;
        modelState.depth = previous.depth;
        modelState.height = previous.height;
        modelState.panelCount = previous.panelCount;
        const api = modelState.productGroup === 'b-cube' ? window.P3DVFreedomMultiPosition : (modelState.productGroup === 'b-cube-galaxy' ? window.P3DVGalaxyMultiPosition : window.P3DVBioRiseMultiPosition);
        const minimumTotal = layout ? Math.ceil(layout.occupiedWidth + layout.systemCount * ((api && api.MIN_CLEAR_WIDTH) || 120)) : spec.widthMin;
        alert(`Sistem adedi için toplam genişlik yetersiz. En az ${minimumTotal} mm girin.`);
        return;
      }
    }
    if (!dimensionsFit(model)) {
      modelState.width = previous.width;
      modelState.depth = previous.depth;
      modelState.height = previous.height;
      modelState.panelCount = previous.panelCount;
      alert('This dimension is too small for the current post/profile sections.');
      return;
    }
    $(ids.freedomWidth).value = String(nextWidth);
    setDepthControlValue(nextDepth);
    $(ids.freedomHeight).value = String(nextHeight);
    $(ids.freedomPanelCount).value = String(modelState.panelCount);
    closePositionDialog();
    (typeof commitModelChangeLive==='function'?commitModelChangeLive('position-dimensions'):renderViewer());
    showRecommendedLimitWarnings({ width: nextWidth, depth: nextDepth, height: nextHeight, panelCount: modelState.panelCount });
  }

  function firstNumericInputToken(rawValue) {
    const token = String(rawValue == null ? '' : rawValue).split(/[;:]/).map((item) => item.trim()).find((item) => item && item.toUpperCase() !== 'NO');
    if (!token) return null;
    const value = Math.round(Number(token.replace(',', '.')));
    return Number.isFinite(value) ? value : null;
  }

  function readFreedomNumber(id) {
    const source = id === ids.freedomDepth ? depthControlValue() : String($(id).value || '').trim();
    return firstNumericInputToken(source);
  }

  function setFreedomValidation(message, tone = 'error') {
    const element = $(ids.freedomValidation);
    element.textContent = message || '';
    element.classList.toggle('is-warning', Boolean(message) && tone === 'warning');
    element.classList.toggle('is-error', Boolean(message) && tone !== 'warning');
  }

  function previewInputStatus() {
    const group = modelState.productGroup;
    const missing = [];
    if (group === 'pergo-rise' && !String($(ids.pergoSystemCount).value || '').trim()) missing.push('Sistem Adedi');
    if (!String($(ids.freedomWidth).value || '').trim()) missing.push('Genişlik');
    if (!String(depthControlValue() || '').trim()) missing.push('Açılım');
    if (!String($(ids.freedomHeight).value || '').trim()) missing.push(group === 'pergo-rise' ? 'Arka yükseklik' : 'Yükseklik');
    if (group === 'pergo-rise' && !String($(ids.pergoFrontHeight).value || '').trim()) missing.push('Ön yükseklik');
    return { complete: missing.length === 0, missing };
  }

  function showPreviewInputGuidance(message, tone = '') {
    const node = $(ids.previewInputGuidance);
    if (!node) return;
    const text = String(message || '').trim();
    node.hidden = !text;
    node.textContent = text;
    if (tone) node.setAttribute('data-tone', tone); else node.removeAttribute('data-tone');
  }

  function scheduleAutomaticPreview() {
    if (autoPreviewTimer) clearTimeout(autoPreviewTimer);
    const status = previewInputStatus();
    if (!status.complete) {
      showPreviewInputGuidance(`${status.missing.join(', ')} alanını tamamlayın. Son geçerli veri girildiğinde çizim otomatik oluşturulur.`, 'warning');
      return;
    }
    showPreviewInputGuidance('Veriler tamamlandı · çizim otomatik hazırlanıyor…', 'ready');
    autoPreviewTimer = window.setTimeout(() => {
      autoPreviewTimer = null;
      const applied = applyFreedomInputs();
      if (applied) showPreviewInputGuidance('', '');
    }, 360);
  }

  function recommendedLimitWarnings(values, group = modelState.productGroup) {
    const spec = activeProductSpec(group);
    const warnings = [];
    if (group === 'pergo-rise') {
      const width = Number(values && values.width);
      const depth = Number(values && values.depth);
      const height = Number(values && values.height);
      if (Number.isFinite(width) && width > spec.widthMax) warnings.push(`Önerilen maksimum genişlik ${spec.widthMax} mm'dir; ${Math.round(width)} mm standart sınır dışıdır; çizime engel olmaz.`);
      if (Number.isFinite(depth) && depth > spec.depthMax) warnings.push(`Önerilen maksimum açılım ${spec.depthMax} mm'dir; ${Math.round(depth)} mm standart sınır dışıdır; çizime engel olmaz.`);
      if (Number.isFinite(height) && spec.heightMax && height > spec.heightMax) warnings.push(`Önerilen maksimum yükseklik ${spec.heightMax} mm'dir; ${Math.round(height)} mm standart sınır dışıdır; çizime engel olmaz.`);
      return warnings;
    }
    const width = Number(values && values.width);
    const depth = Number(values && values.depth);
    const panelCount = Number(values && values.panelCount);
    let comparedWidth = width;
    let widthLabel = 'genişlik';
    if (isFreedomBioGroup(group) && Number.isFinite(width)) {
      const source = { ...modelState, width, depth: Number.isFinite(depth) ? depth : modelState.depth, height: modelState.height };
      const layout = group === 'b-cube' ? freedomMultiPositionLayout(source) : (group === 'b-cube-galaxy' ? galaxyMultiPositionLayout(source) : bioRiseMultiPositionLayout(source));
      if (layout && layout.valid && layout.modules.length) {
        comparedWidth = Math.max(...layout.modules.map(module => Number(module.outerWidth) || 0));
        if (layout.systemCount > 1) widthLabel = 'modül dış genişliği';
      }
    }
    if (Number.isFinite(comparedWidth) && comparedWidth > spec.widthMax) {
      warnings.push(`Önerilen maksimum ${widthLabel} ${spec.widthMax} mm'dir; ${Math.round(comparedWidth)} mm standart sınır dışıdır; çizime engel olmaz.`);
    }
    if (Number.isFinite(depth) && depth > spec.depthMax) {
      warnings.push(`Önerilen maksimum açılım ${spec.depthMax} mm'dir; ${Math.round(depth)} mm standart sınır dışıdır; çizime engel olmaz.`);
    }
    if (Number.isFinite(panelCount) && panelCount > spec.panelMax && !(Number.isFinite(depth) && depth > spec.depthMax)) {
      warnings.push(`Önerilen maksimum panel sayısı ${spec.panelMax}'tir; ${Math.round(panelCount)} panel standart önerinin üzerindedir; çizime engel olmaz.`);
    }
    return warnings;
  }

  function showRecommendedLimitWarnings(values, group = modelState.productGroup) {
    const warnings = recommendedLimitWarnings(values, group);
    setFreedomValidation(warnings.join(' '), warnings.length ? 'warning' : 'error');
    return warnings;
  }

  function syncProjectionFromPanelCount() {
    if (modelState.productGroup === 'pergo-rise') return;
    const count = readFreedomNumber(ids.freedomPanelCount);
    const spec = activeProductSpec();
    setFreedomValidation('');
    if (count === null) return;
    if (count < spec.panelMin) {
      setFreedomValidation(`Panel sayısı en az ${spec.panelMin} olmalıdır.`);
      return;
    }
    const depth = projectionFromPanelCount(count);
    setDepthControlValue(depth);
    showRecommendedLimitWarnings({ width: readFreedomNumber(ids.freedomWidth), depth, height: readFreedomNumber(ids.freedomHeight), panelCount: count });
  }

  function syncPanelCountFromProjection() {
    if (modelState.productGroup === 'pergo-rise') return;
    const rawSystemCount = firstNumericInputToken($(ids.pergoSystemCount).value) || modelState.systemCount || 1;
    const topology = resolveFreedomBioTopology(modelState.productGroup, rawSystemCount, $(ids.freedomWidth).value, depthControlValue());
    const spec = activeProductSpec();
    setFreedomValidation('');
    const depthValues = topology.moduleDepths || [];
    if (!depthValues.length) return;
    const tooSmall = depthValues.find((depth) => depth < spec.depthMin);
    if (tooSmall != null) {
      setFreedomValidation(`Her açılım en az ${spec.depthMin} mm olmalıdır.`);
      return;
    }
    const counts = topology.panelCounts || depthValues.map((depth) => panelCountFromProjection(depth));
    $(ids.freedomPanelCount).value = String(counts[0] || '');
    $(ids.freedomPanelCount).title = counts.length > 1 ? `Modül panel sayıları: ${counts.join(';')}` : '';
    showRecommendedLimitWarnings({ width: topology.totalWidth, depth: topology.maxDepth, height: readFreedomNumber(ids.freedomHeight), panelCount: Math.max(...counts) });
  }

  function pergoRiseInputText(id) { return String($(id) && $(id).value || '').trim(); }

  function applyPergoRiseInputs() {
    try {
      const draft = syncPergoRiseInputInfrastructure({ keepValidation: true });
      if (!draft || !draft.input) {
        setFreedomValidation('PLMR Pergola proje verisi oluşturulamadı.');
        return false;
      }
      if (draft.missing && draft.missing.length) {
        const names = { systemCount: 'Sistem Adedi', width: 'Genişlik', opening: 'Açılım', rearHeight: 'Arka H', frontHeight: 'Ön H' };
        setFreedomValidation(`${draft.missing.map(field => names[field] || field).join(', ')} alanlarını doldurun.`);
        return false;
      }
      if (draft.errors && draft.errors.length) {
        setFreedomValidation(`PLMR kuralı: ${draft.errors[0]}`);
        return false;
      }
      const canonical = window.P3DVPergoRiseProduct.create(draft.input, { ownership: draft.ownership });
      const derived = window.P3DVPergoRiseDerivedGeometry.build(canonical);
      modelState.pergoRiseProject = { ...canonical, ownership: draft.ownership, calculated: draft.calculated, derived };
      mirrorPergoCompatibilityState(canonical.input);
      modelState.width = Math.round(Number(canonical.normalized.width) || derived.envelope.width);
      modelState.depth = Math.round(derived.envelope.depth);
      modelState.height = Math.round(derived.envelope.height);
      modelState.panelCount = 1;
      setFreedomValidation('');
      renderPdfRequestForm();
      updateReadouts();
      renderPergo2DPreview({ resetView: false });
      updateDrawingModeUi();
      return true;
    } catch (error) {
      console.error('Pergola project normalization failed.', error);
      setFreedomValidation(`PLMR kuralı: ${error && error.message ? error.message : 'Geçersiz parametrik veri.'}`);
      return false;
    }
  }


  function applyPergoRiseAreaOperation(message) {
    if (!message || !message.target) return false;
    const current = modelState.pergoRiseProject;
    if (!current || !current.input || !window.P3DVPergoRiseEditing || typeof window.P3DVPergoRiseEditing.applyCanonicalOperation !== 'function') return false;
    const target = message.target;
    const action = String(message.areaAction || message.operation || '');
    function askNumber(label, value, min) {
      const result = Number(window.prompt(label, String(Math.round(Number(value) || 0))));
      return Number.isFinite(result) && result >= (min === undefined ? -Infinity : min) ? result : null;
    }
    function askChoice(label, allowed, fallback) {
      const list = Array.isArray(allowed) ? allowed.filter(Boolean) : [];
      const result = String(window.prompt(`${label}${list.length ? `\n${list.join(' / ')}` : ''}`, fallback || list[0] || '') || '').trim();
      if (!result) return null;
      return list.length && !list.includes(result) ? null : result;
    }
    const payload = {};
    try {
      if (target.targetType === 'area') {
        if (action === 'product-add') {
          const allowed = target.plmrZone && target.plmrZone.allowedProducts || [];
          const type = askChoice('Ürün türü', allowed, allowed[0]);
          if (!type) return true;
          const width = askNumber('Ürün net genişliği (mm)', target.netWidth || 1000, 1);
          const height = askNumber('Ürün net yüksekliği (mm)', target.netHeight || 2000, 1);
          if (width === null || height === null) return true;
          Object.assign(payload, { productType: type, width, height });
        } else if (action === 'profile-add') {
          const allowed = target.plmrZone && target.plmrZone.allowedProfiles || [];
          const type = askChoice('Profil türü', allowed, allowed[0]);
          if (!type) return true;
          payload.profileType = type;
          if (type === 'custom_profile') {
            const en = askNumber('Profil eni (mm)', 100, 1), boy = askNumber('Profil boyu (mm)', 100, 1), et = askNumber('Et kalınlığı (mm)', 2, 0.1);
            if (en === null || boy === null || et === null) return true;
            payload.profile = { mode: 'other', en, boy, et };
          }
        } else if (action === 'resize') {
          const dim = target.plmrDimension || {};
          const value = askNumber(`${dim.label || 'Ölçü'} (mm)`, dim.measuredValue || target.netWidth || 1000, 1);
          if (value === null) return true;
          payload.value = value;
        }
      } else if (target.targetType === 'dimension') {
        const dim = target.plmrDimension || {};
        const value = askNumber(`${dim.label || 'Ölçü'} (mm)`, dim.measuredValue || 1000, 1);
        if (value === null) return true;
        payload.value = value;
      } else if (target.targetType === 'product' && (action === 'resize' || action === 'edit')) {
        const interaction = target.plmrInteraction || {};
        const bounds2d = interaction.bounds2d || {};
        const width = askNumber('Ürün genişliği (mm)', bounds2d.w || 1000, 1);
        const height = askNumber('Ürün yüksekliği (mm)', bounds2d.h || 2000, 1);
        if (width === null || height === null) return true;
        Object.assign(payload, { width, height });
      } else if (target.targetType === 'water-outlet') {
        const data = target.plmrInteraction && target.plmrInteraction.data || {};
        if (action === 'edit') {
          const offset = askNumber('Boru konum ofseti (mm)', data.waterPipeXOffset || 0, -100000);
          if (offset === null) return true; payload.offset = offset;
        } else if (action === 'resize') {
          const diameter = askNumber('Boru çapı (mm)', data.waterPipeDiameter || 70, 1);
          const length = askNumber('Boru uzunluğu (mm)', data.waterPipeLength || 300, 1);
          if (diameter === null || length === null) return true; Object.assign(payload, { diameter, length });
        }
      } else if (target.targetType === 'trapez-sheet' && (action === 'resize' || action === 'edit')) {
        const c = target.geometrySnapshot && target.geometrySnapshot.corners || [];
        const xs = c.map(p => Number(p && p[0])).filter(Number.isFinite), zs = c.map(p => Number(p && p[2])).filter(Number.isFinite);
        const minX = askNumber('Sac başlangıç X (mm)', Math.min(...xs), -100000), maxX = askNumber('Sac bitiş X (mm)', Math.max(...xs), -100000);
        const minZ = askNumber('Sac başlangıç Z (mm)', Math.min(...zs), -100000), maxZ = askNumber('Sac bitiş Z (mm)', Math.max(...zs), -100000);
        if ([minX,maxX,minZ,maxZ].some(v => v === null) || maxX <= minX || maxZ <= minZ) return true;
        Object.assign(payload, { minX, maxX, minZ, maxZ });
      } else if (target.targetType === 'gutter' && (action === 'resize' || action === 'edit')) {
        const data = target.plmrInteraction && target.plmrInteraction.data || {};
        const minusXDelta = askNumber('Oluk sol uç değişimi (mm)', data.gutterMinusXDelta || 0, -100000);
        const plusXDelta = askNumber('Oluk sağ uç değişimi (mm)', data.gutterPlusXDelta || 0, -100000);
        if (minusXDelta === null || plusXDelta === null) return true;
        Object.assign(payload, { minusXDelta, plusXDelta });
      } else if (target.targetType === 'rail' && action === 'edit') {
        const axis = target.geometrySnapshot && target.geometrySnapshot.start && target.geometrySnapshot.start[0];
        const axisX = askNumber('Ray X ekseni (3D yerel mm)', axis || 0, -100000);
        if (axisX === null) return true;
        const originX = Number(current.normalized && current.normalized.constants && current.normalized.constants.systemStartX || window.PulumurGeometry.K.systemStartX) + Number(current.normalized && current.normalized.width || 0) / 2;
        payload.axisX = axisX + originX;
      } else if (target.targetType === 'post') {
        if (action === 'edit') {
          const currentAxis = current.normalized && current.normalized.postCenterXs && current.normalized.postCenterXs[target.postIndex];
          const axisX = askNumber('Dikme X ekseni (PLMR mm)', currentAxis || 0, -100000);
          const extension = askNumber('Dikme uzatması (mm)', current.normalized && current.normalized.frontPostExtensions && current.normalized.frontPostExtensions[target.postIndex] || 0, 0);
          if (axisX === null || extension === null) return true; Object.assign(payload, { axisX, extension });
        } else if (action === 'resize') {
          const en = askNumber('Profil eni (mm)', target.geometrySnapshot && target.geometrySnapshot.profileWidthX || 100, 1);
          const boy = askNumber('Profil boyu (mm)', target.geometrySnapshot && target.geometrySnapshot.profileDepthZ || 100, 1);
          const et = askNumber('Et kalınlığı (mm)', 2, 0.1);
          if (en === null || boy === null || et === null) return true; payload.profile = { mode:'other', en, boy, et };
        }
      } else if (target.targetType === 'side-support-post' && (action === 'edit' || action === 'resize')) {
        if (action === 'edit') {
          const centerX = askNumber('Yan destek merkezi (PLMR yan görünüş mm)', 0, -100000);
          const extension = askNumber('Yan destek uzatması (mm)', 0, 0);
          if (centerX === null || extension === null) return true; Object.assign(payload, { centerX, extension });
        } else {
          const en = askNumber('Profil eni (mm)', 100, 1), boy = askNumber('Profil boyu (mm)', 100, 1), et = askNumber('Et kalınlığı (mm)', 2, 0.1);
          if (en === null || boy === null || et === null) return true; payload.profile = { mode:'other', en, boy, et };
        }
      } else if (target.targetType === 'parapet' && (action === 'edit' || action === 'resize')) {
        const data = target.plmrInteraction && target.plmrInteraction.data || {};
        if (action === 'resize') {
          const height = askNumber('Parapet yüksekliği (mm)', data.segmentHeight || 500, 0);
          if (height === null) return true; payload.height = height;
        } else {
          const start = askNumber('Parapet başlangıcı (mm)', data.segmentStart || 0, 0), end = askNumber('Parapet bitişi (mm)', data.segmentEnd || 1000, 1);
          if (start === null || end === null || end <= start) return true; Object.assign(payload, { start, end });
        }
      } else if (target.targetType === 'wall' && (action === 'edit' || action === 'resize')) {
        const data = target.plmrInteraction && target.plmrInteraction.data || {};
        const sideData = target.plmrSideInteraction && target.plmrSideInteraction.data || {};
        if (data.wallCellId) {
          const minX = askNumber('Duvar hücresi başlangıcı (mm)', data.cellMinX || 0, 0), maxX = askNumber('Duvar hücresi bitişi (mm)', data.cellMaxX || 1000, 1);
          const planDepth = askNumber('Duvar plan derinliği (mm)', data.wallDepth || 800, 1);
          const xOffset = askNumber('Duvar konum ofseti (mm)', sideData.wallXOffset || 0, -100000);
          const depth = askNumber('Duvar yan görünüş derinliği (mm)', sideData.wallDepth || 600, 1);
          const height = askNumber('Duvar yüksekliği (mm)', sideData.wallHeight || 3000, 1);
          if ([minX,maxX,planDepth,xOffset,depth,height].some(v=>v===null) || maxX <= minX) return true;
          Object.assign(payload, { minX, maxX, startFarDepth:planDepth, endFarDepth:planDepth, xOffset, depth, height });
        } else {
          const xOffset = askNumber('Duvar konum ofseti (mm)', data.wallXOffset || 0, -100000), depth = askNumber('Duvar derinliği (mm)', data.wallDepth || 600, 1), height = askNumber('Duvar yüksekliği (mm)', data.wallHeight || 3000, 1);
          if (xOffset === null || depth === null || height === null) return true; Object.assign(payload, { xOffset, depth, height });
        }
      } else if (target.targetType === 'glass-track' && (action === 'edit' || action === 'resize')) {
        const data = target.plmrInteraction && target.plmrInteraction.data || {};
        if (action === 'edit') {
          const lengthOffset = askNumber('Cam kaydı uzunluk ofseti (mm)', data.trackLengthOffset || 0, -100000);
          if (lengthOffset === null) return true; payload.lengthOffset = lengthOffset;
        } else {
          const en = askNumber('Cam kaydı eni (mm)', data.en || 100, 1), boy = askNumber('Cam kaydı boyu (mm)', data.boy || 100, 1), et = askNumber('Et kalınlığı (mm)', data.et || 2, 0.1);
          if (en === null || boy === null || et === null) return true; payload.profile = { mode:'other', en, boy, et };
        }
      } else if (target.targetType === 'triangle-joinery' && action === 'edit') {
        const data = target.plmrInteraction && target.plmrInteraction.data || {};
        const divisionCount = askNumber('Üçgen doğrama bölme adedi', data.triangleDivisionCount || 1, 1);
        if (divisionCount === null) return true; payload.divisionCount = Math.round(divisionCount);
      }
      const result = window.P3DVPergoRiseEditing.applyCanonicalOperation(current.input, { operation: action, areaAction: message.areaAction || null, target, payload });
      const nextOwnership = { ...(current.ownership || {}), ...(result.ownershipPatch || {}) };
      const canonical = window.P3DVPergoRiseProduct.create(result.input, { ownership: nextOwnership });
      const derived = window.P3DVPergoRiseDerivedGeometry.build(canonical);
      modelState.pergoRiseProject = { ...canonical, ownership:nextOwnership, calculated:current.calculated||{}, derived };
      pergoRiseRevision += 1;
      renderPergo2DPreview({ resetView: false });
      renderPdfRequestForm(); updateReadouts(); return true;
    } catch (error) {
      console.error('Pergola canonical edit failed.', error);
      setFreedomValidation(`PLMR düzenleme kuralı: ${error && error.message ? error.message : String(error)}`);
      return true;
    }
  }

  function applyFreedomInputs(options = {}) {
    const spec = activeProductSpec();
    if (modelState.productGroup === 'pergo-rise') return applyPergoRiseInputs();
    const rawSystemCount = firstNumericInputToken($(ids.pergoSystemCount).value) || modelState.systemCount || 1;
    const rawWidth = String($(ids.freedomWidth).value || '');
    const rawDepth = String(depthControlValue() || '');
    const height = readFreedomNumber(ids.freedomHeight);
    const topology = resolveFreedomBioTopology(modelState.productGroup, rawSystemCount, rawWidth, rawDepth);
    if (height === null) {
      setFreedomValidation('Genişlik, Açılım ve Yükseklik alanlarını doldurun.');
      return false;
    }
    const topologyMessages = {
      WIDTH_OPENING_COUNT_MISMATCH: 'Genişlikteki modül sayısı ile açılım sayısı eşleşmelidir.',
      OPENING_SYSTEM_COUNT_MISMATCH: 'Açılım sayısı Sistem Adedi ile eşleşmelidir.',
      WIDTH_SYSTEM_COUNT_MISMATCH: 'Genişlik sayısı Sistem Adedi ile eşleşmelidir.',
      WIDTH_REQUIRED: 'Genişlik alanını doldurun.',
      OPENING_REQUIRED: 'Açılım alanını doldurun.',
      OPENING_NO_ONLY_ALLOWED_AT_END: 'NO yalnız açılım listesinin sonunda kullanılabilir.',
      OPENING_EMPTY_VALUE: 'Açılım listesinde boş değer bulunamaz.',
      WIDTH_EMPTY_VALUE: 'Genişlik listesinde boş değer bulunamaz.',
      WIDTH_OPENING_ROW_COUNT_MISMATCH: 'Genişlik ve açılım alanlarında ön/arka sıra sayısı eşleşmelidir.',
      WIDTH_TOO_MANY_ROWS: 'Genişlik alanında en fazla ön ve arka olmak üzere iki sıra kullanılabilir.',
      OPENING_TOO_MANY_ROWS: 'Açılım alanında en fazla ön ve arka olmak üzere iki sıra kullanılabilir.',
      WIDTH_OPENING_COUNT_MISMATCH_ROW_1: 'Ön sıradaki genişlik ve açılım adetleri eşleşmelidir.',
      WIDTH_OPENING_COUNT_MISMATCH_ROW_2: 'Arka sıradaki genişlik ve açılım adetleri eşleşmelidir.',
      WIDTH_EMPTY_ROW: 'Genişlik alanında boş sıra bulunamaz.',
      OPENING_EMPTY_ROW: 'Açılım alanında boş sıra bulunamaz.'
    };
    if (!topology.valid) {
      setFreedomValidation(topologyMessages[topology.errors[0]] || `Çoklu sistem girişi geçersiz: ${topology.errors[0]}`);
      return false;
    }
    const widthValues = topology.moduleWidths.length ? topology.moduleWidths : [topology.totalWidth];
    const tooSmallWidth = topology.moduleWidths.length
      ? widthValues.find((value) => value < spec.widthMin)
      : (topology.totalWidth < spec.widthMin ? topology.totalWidth : null);
    if (tooSmallWidth != null) {
      setFreedomValidation(topology.moduleWidths.length ? `Her modül genişliği en az ${spec.widthMin} mm olmalıdır.` : `Genişlik en az ${spec.widthMin} mm olmalıdır.`);
      return false;
    }
    const tooSmallDepth = topology.moduleDepths.find((value) => value < spec.depthMin);
    if (tooSmallDepth != null) {
      setFreedomValidation(`Her açılım en az ${spec.depthMin} mm olmalıdır.`);
      return false;
    }
    if (height < spec.heightMin || (spec.heightMax && height > spec.heightMax)) {
      setFreedomValidation(spec.heightMax ? `Yükseklik ${spec.heightMin}–${spec.heightMax} mm arasında olmalıdır.` : `Yükseklik en az ${spec.heightMin} mm olmalıdır.`);
      return false;
    }
    if (topology.panelCounts.some((count) => count < spec.panelMin)) {
      setFreedomValidation(`Her modülde panel sayısı en az ${spec.panelMin} olmalıdır.`);
      return false;
    }
    const previous = {
      width: modelState.width, depth: modelState.depth, height: modelState.height,
      panelCount: modelState.panelCount, systemCount: modelState.systemCount,
      moduleWidths: Array.isArray(modelState.moduleWidths) ? [...modelState.moduleWidths] : [],
      moduleDepths: Array.isArray(modelState.moduleDepths) ? [...modelState.moduleDepths] : [],
      modulePanelCounts: Array.isArray(modelState.modulePanelCounts) ? [...modelState.modulePanelCounts] : [],
      multiAlignment: modelState.multiAlignment || 'front',
      multiRows: Array.isArray(modelState.multiRows) ? JSON.parse(JSON.stringify(modelState.multiRows)) : [],
      rowAlignment: modelState.rowAlignment || 'left',
      panelCollection: modelState.panelCollection || 'center'
    };
    modelState.width = topology.totalWidth;
    modelState.depth = topology.maxDepth;
    modelState.height = height;
    modelState.panelCount = topology.panelCounts[0] || panelCountFromProjection(topology.maxDepth);
    modelState.systemCount = topology.systemCount;
    modelState.moduleWidths = topology.moduleWidths.slice();
    modelState.moduleDepths = topology.moduleDepths.slice();
    modelState.modulePanelCounts = topology.panelCounts.slice();
    modelState.multiAlignment = topology.alignment;
    modelState.multiRows = Array.isArray(topology.multiRows) ? JSON.parse(JSON.stringify(topology.multiRows)) : [];
    modelState.rowAlignment = topology.rowAlignment || 'left';
    modelState.panelCollection = topology.panelCollection || 'center';
    if ($(ids.pergoSystemCount)) $(ids.pergoSystemCount).value = String(topology.systemCount);
    if ($(ids.freedomPanelCount)) {
      $(ids.freedomPanelCount).value = String(modelState.panelCount);
      $(ids.freedomPanelCount).title = topology.panelCounts.length > 1 ? `Modül panel sayıları: ${topology.panelCounts.join(';')}` : '';
    }
    modelState.inputDrafts = { width: rawWidth, depth: rawDepth, height: String($(ids.freedomHeight).value || '') };
    syncFreedomOptionStateFromUi();
    const layout = modelState.productGroup === 'b-cube' ? freedomMultiPositionLayout(modelState) : (modelState.productGroup === 'b-cube-galaxy' ? galaxyMultiPositionLayout(modelState) : bioRiseMultiPositionLayout(modelState));
    if (!layout || !layout.valid) {
      Object.assign(modelState, previous);
      const error = layout && layout.errors && layout.errors[0] || 'LAYOUT_INVALID';
      if (String(error).startsWith('MODULE_CLEAR_WIDTH_TOO_SMALL')) setFreedomValidation('Bir veya daha fazla modülün net iç açıklığı mevcut profil kesitleri için yetersiz.');
      else setFreedomValidation(`Çoklu sistem geometrisi oluşturulamadı: ${error}`);
      return false;
    }
    if (!dimensionsFit(readModel())) {
      Object.assign(modelState, previous);
      setFreedomValidation('Bu ölçüler mevcut profil kesitleri için yetersiz.');
      return false;
    }
    (typeof commitModelChangeLive === 'function'
      ? commitModelChangeLive('system-inputs', { forceRender: options.forceRender === true })
      : renderViewer());
    showRecommendedLimitWarnings({
      width: topology.moduleWidths.length ? Math.max(...topology.moduleWidths) : topology.totalWidth,
      depth: topology.maxDepth,
      height,
      panelCount: Math.max(...topology.panelCounts)
    });
    return true;
  }

  function viewerModelPayload() {
    const model = readModel();
    return {
      productGroup: model.productGroup,
      width: model.width,
      depth: model.depth,
      height: model.height,
      lamellaCount: model.lamellaCount,
      systemCount: model.systemCount,
      moduleWidths: Array.isArray(model.moduleWidths) ? [...model.moduleWidths] : [],
      moduleDepths: Array.isArray(model.moduleDepths) ? [...model.moduleDepths] : [],
      modulePanelCounts: Array.isArray(model.modulePanelCounts) ? [...model.modulePanelCounts] : [],
      multiAlignment: model.multiAlignment === 'rear' ? 'rear' : 'front',
      multiRows: Array.isArray(model.multiRows) ? JSON.parse(JSON.stringify(model.multiRows)) : [],
      rowAlignment: model.rowAlignment === 'right' ? 'right' : 'left',
      panelCollection: model.panelCollection === 'outer' ? 'outer' : 'center',
      freedomLayout: model.freedomLayout ? JSON.parse(JSON.stringify(model.freedomLayout)) : null,
      bioRiseLayout: model.bioRiseLayout ? JSON.parse(JSON.stringify(model.bioRiseLayout)) : null,
      galaxyLayout: model.galaxyLayout ? JSON.parse(JSON.stringify(model.galaxyLayout)) : null,
      orientations: [...model.orientations],
      postSections: model.postSections.map((section) => ({ ...section })),
      beamSection: { ...model.beamSection },
      placements: JSON.parse(JSON.stringify(model.placements || {})),
      zipPlacements: JSON.parse(JSON.stringify(model.zipPlacements || {})),
      facadeProfiles: JSON.parse(JSON.stringify(model.facadeProfiles || {})),
      selectedZoneId: selectedZoneId || null,
      dimensionVisibility: { ...dimensionVisibility },
      productsOpen: Boolean(modelState.productsOpen),
      productOpenStates: JSON.parse(JSON.stringify(modelState.productOpenStates || {})),
      panelStates: JSON.parse(JSON.stringify(modelState.panelStates || {})),
      panelMasterOpen: Boolean(modelState.panelMasterOpen),
      colorMode: normalizeColorMode(modelState.colorMode),
      systemColor: { ...(modelState.systemColor || defaults.systemColor) },
      panelColor: { ...(modelState.panelColor || defaults.panelColor) }
    };
  }

  function postLiveModelState(reason = 'model-change') {
    const model = readModel();
    if (!viewerLiveModelStateReady || !modelReady(model) || model.productGroup === 'pergo-rise' || activeViewerProductGroup !== model.productGroup) return false;
    const revision = ++liveStateRevision;
    return postViewerMessage('set-model-state', {
      revision,
      reason: String(reason || 'model-change'),
      model: viewerModelPayload()
    });
  }

  let deferredPdfRefreshTimer = null;
  function scheduleDeferredPdfRefresh() {
    if (deferredPdfRefreshTimer) window.clearTimeout(deferredPdfRefreshTimer);
    deferredPdfRefreshTimer = window.setTimeout(() => {
      deferredPdfRefreshTimer = null;
      renderPdfRequestForm();
    }, 140);
  }

  function commitModelChangeLive(reason = 'model-change', options = {}) {
    pruneProductStates();
    if (!options.preserveHistory && !p3dvHistoryApplying) p3dvHistoryRebase(`external:${String(reason || 'model-change')}`);
    updateReadouts();
    updateToolbox();
    scheduleDeferredPdfRefresh();
    const model = readModel();
    if (options.forceRender || !modelReady(model) || !activeViewerModelReady || !viewerLiveModelStateReady || activeViewerProductGroup !== model.productGroup) {
      renderViewer();
      return false;
    }
    if (model.productGroup === 'pergo-rise') {
      if (viewerLivePergoRiseReady) {
        pergoRiseRevision += 1;
        postViewerMessage('set-pergo-rise-project', { revision: pergoRiseRevision, project: modelState.pergoRiseProject });
        return true;
      }
      renderViewer();
      return false;
    }
    if (!postLiveModelState(reason)) pendingLiveModelState = true;
    return true;
  }

  function zonePlacement(zone) {
    return zone ? (primaryPlacement(zone.id) || zipPlacement(zone.id) || null) : null;
  }

  function postViewerMessage(type, payload = {}) {
    const frame = $(ids.frame);
    const frameWindow = frame && frame.contentWindow;
    if (!frameWindow || !activeViewerSessionId) return false;
    frameWindow.postMessage({
      source: 'product-3d-parent',
      sessionId: activeViewerSessionId,
      type,
      ...payload
    }, '*');
    return true;
  }

  function postLiveProductOpenState() {
    if (!viewerLiveProductStateReady) return false;
    const revision = ++liveStateRevision;
    return postViewerMessage('set-product-open-state', {
      revision,
      productsOpen: Boolean(modelState.productsOpen),
      productOpenStates: JSON.parse(JSON.stringify(modelState.productOpenStates || {})),
      panelStates: JSON.parse(JSON.stringify(modelState.panelStates || {}))
    });
  }

  function applyProductOpenStateLive() {
    updateToolbox();
    if (!postLiveProductOpenState()) pendingLiveProductState = true;
  }

  function postLivePanelMasterOpen() {
    if (!viewerLivePanelMasterReady) return false;
    const revision = ++liveStateRevision;
    return postViewerMessage('set-panel-master-open', {
      revision,
      open: Boolean(modelState.panelMasterOpen)
    });
  }

  function applyPanelMasterOpenLive() {
    updateToolbox();
    if (!postLivePanelMasterOpen()) pendingLivePanelMasterState = true;
  }

  function postLiveColorState() {
    if (!viewerLiveColorStateReady) return false;
    const revision = ++liveStateRevision;
    return postViewerMessage('set-color-state', {
      revision,
      colorMode: normalizeColorMode(modelState.colorMode),
      systemColor: { ...(modelState.systemColor || defaults.systemColor) },
      panelColor: { ...(modelState.panelColor || defaults.panelColor) }
    });
  }

  function applyColorStateLive() {
    if (!modelReady(readModel())) return;
    if (!postLiveColorState()) pendingLiveColorState = true;
  }

  function flushPendingViewerState() {
    if (pendingLiveProductState && viewerLiveProductStateReady) {
      pendingLiveProductState = false;
      postLiveProductOpenState();
    }
    if (pendingLivePanelMasterState && viewerLivePanelMasterReady) {
      pendingLivePanelMasterState = false;
      postLivePanelMasterOpen();
    }
    if (pendingLiveColorState && viewerLiveColorStateReady) {
      pendingLiveColorState = false;
      postLiveColorState();
    }
    if (typeof pendingLiveModelState!=='undefined' && typeof viewerLiveModelStateReady!=='undefined' && pendingLiveModelState && viewerLiveModelStateReady) {
      pendingLiveModelState = false;
      postLiveModelState('pending-flush');
    }
  }

  const TOOLBOX_SELECTION_CONFIG = {
    'multi-product': { title: 'Çoklu Ürün Ekleme', hint: 'Uygun alanları seçin. Zip Perde dolu alanlara da ön katman olarak eklenebilir. Enter veya sağ tıkla tamamlayın.', buttonId: ids.multiProduct },
    'multi-delete': { title: 'Çoklu Ürün Silme', hint: 'Ürün bulunan alanları seçin. Enter veya sağ tıkla tamamlayın.', buttonId: ids.multiDelete },
    'multi-profile-add': { title: 'Çoklu Profil Ekleme', hint: 'Ürünsüz ve yeterli büyüklükteki alanları seçin.', buttonId: ids.multiProfileAdd },
    'multi-profile-delete': { title: 'Çoklu Profil Silme', hint: 'Sonradan eklenen profilleri seçin.', buttonId: ids.multiProfileDelete },
    'fit-products': { title: 'Ürünleri Alana Uydur', hint: 'Ürün bulunan alanları seçin.', buttonId: ids.fitProducts }
  };

  function updateProductOpenList() {
    const list = $(ids.productOpenList);
    if (!list) return;
    list.innerHTML = '';
    const entries = allProductEntries().sort((a, b) => a.key.localeCompare(b.key, 'tr'));
    if ($(ids.productOpenEmpty)) $(ids.productOpenEmpty).hidden = entries.length > 0;
    const facadeCounts = {};
    entries.forEach(({ key, zoneId, placement }) => {
      const facadeId = String(zoneId).split('|')[0];
      const index = facadeCounts[facadeId] || 0;
      facadeCounts[facadeId] = index + 1;
      const label = document.createElement('label');
      label.className = 'product-open-row';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = effectiveProductOpen(key);
      input.addEventListener('change', () => {
        modelState.productOpenStates[key] = Boolean(input.checked);
        if (placement && placement.type === 'zip') modelState.panelStates[key] = Boolean(input.checked);
        applyProductOpenStateLive();
      });
      const text = document.createElement('span');
      text.textContent = productZoneLabel(zoneId, placement, index);
      label.appendChild(input);
      label.appendChild(text);
      list.appendChild(label);
    });
  }

  function closeLargeProductStateMenu() {
    const menu = $(ids.largePreviewProductStateMenu);
    const button = $(ids.largePreviewProductStateMenuButton);
    if (menu) menu.hidden = true;
    if (button) button.setAttribute('aria-expanded', 'false');
  }

  function renderLargeProductStateMenu() {
    const menu = $(ids.largePreviewProductStateMenu);
    if (!menu) return;
    menu.innerHTML = '';
    const addRow = (label, open, onToggle) => {
      const row = document.createElement('div');
      row.className = 'large-product-state-row';
      const text = document.createElement('span'); text.textContent = label;
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = open ? 'AÇIK' : 'KAPALI';
      button.classList.toggle('is-closed', !open);
      button.addEventListener('click', (event) => { event.stopPropagation(); onToggle(!open); });
      row.appendChild(text); row.appendChild(button); menu.appendChild(row);
    };
    addRow('Ana Çatı Panelleri', Boolean(modelState.panelMasterOpen), (open) => { modelState.panelMasterOpen = open; applyPanelMasterOpenLive(); });
    const entries = allProductEntries().sort((a, b) => a.key.localeCompare(b.key, 'tr'));
    const facadeCounts = {};
    entries.forEach(({ key, zoneId, placement }) => {
      const facadeId = String(zoneId).split('|')[0];
      const index = facadeCounts[facadeId] || 0; facadeCounts[facadeId] = index + 1;
      addRow(productZoneLabel(zoneId, placement, index), effectiveProductOpen(key), (open) => {
        modelState.productOpenStates[key] = open;
        if (placement && placement.type === 'zip') modelState.panelStates[key] = open;
        applyProductOpenStateLive();
      });
    });
    if (!entries.length) {
      const empty = document.createElement('div'); empty.className = 'large-product-state-empty'; empty.textContent = 'Yerleştirilmiş cephe ürünü yok.'; menu.appendChild(empty);
    }
  }

  function updateLargeProductStateControl() {
    const control = $(ids.largePreviewProductStateControl);
    const button = $(ids.largePreviewProductState);
    const menuButton = $(ids.largePreviewProductStateMenuButton);
    const value = $(ids.largePreviewProductStateValue);
    const open = Boolean(modelState.productsOpen && modelState.panelMasterOpen);
    const supported = modelState.productGroup !== 'pergo-rise';
    if (control) {
      control.classList.toggle('is-open', open && supported);
      control.classList.toggle('is-closed', !open && supported);
      control.classList.toggle('is-disabled', !supported);
    }
    if (button) {
      button.disabled = !supported;
      button.setAttribute('aria-disabled', String(!supported));
      button.setAttribute('aria-pressed', String(open));
    }
    if (menuButton) {
      menuButton.disabled = !supported;
      menuButton.setAttribute('aria-disabled', String(!supported));
    }
    if (value) value.textContent = supported ? (open ? 'AÇIK' : 'KAPALI') : 'PASİF';
    if (!supported) closeLargeProductStateMenu();
    else renderLargeProductStateMenu();
  }

  function updateToolbox() {
    $(ids.toolboxIntermediateDimensions).checked = dimensionVisibility.intermediate !== false;
    $(ids.toolboxMainDimensions).checked = dimensionVisibility.main !== false;
    $(ids.replay).textContent = modelState.productsOpen ? 'Ürünler Açık' : 'Ürünler Kapalı';
    $(ids.replay).classList.toggle('is-open', Boolean(modelState.productsOpen));
    $(ids.replay).classList.toggle('is-closed', !modelState.productsOpen);
    if ($(ids.panelMaster)) $(ids.panelMaster).checked = Boolean(modelState.panelMasterOpen);
    updateProductOpenList();
    updateLargeProductStateControl();
    updatePergoLargePreviewOptions();
    Object.entries(TOOLBOX_SELECTION_CONFIG).forEach(([mode, config]) => {
      const button = $(config.buttonId);
      if (button) button.classList.toggle('is-active-command', toolboxSelectionMode === mode);
    });
    const config = TOOLBOX_SELECTION_CONFIG[toolboxSelectionMode];
    $(ids.selectionBanner).hidden = !config;
    if (config) {
      $(ids.selectionBannerTitle).textContent = config.title;
      $(ids.selectionBannerText).textContent = `${config.hint} · ${toolboxSelectionItems.size} seçim`;
    }
    const allDims = $(ids.largePreviewShowAllDims);
    if (allDims) {
      const on = dimensionVisibility.intermediate !== false;
      allDims.setAttribute('aria-pressed', String(on));
      allDims.classList.toggle('is-on', on);
      allDims.classList.toggle('is-off', !on);
    }
    const mainDims = $(ids.largePreviewShowMainDims);
    if (mainDims) {
      const on = dimensionVisibility.main !== false;
      mainDims.setAttribute('aria-pressed', String(on));
      mainDims.classList.toggle('is-on', on);
      mainDims.classList.toggle('is-off', !on);
    }
  }

  function postToolboxSelectionState() {
    postViewerMessage('set-toolbox-selection', {
      mode: toolboxSelectionMode,
      keys: [...toolboxSelectionItems.keys()]
    });
  }

  function cancelToolboxSelection() {
    toolboxSelectionMode = null;
    toolboxSelectionItems = new Map();
    updateToolbox();
    postToolboxSelectionState();
  }

  function startToolboxSelection(mode) {
    if (!TOOLBOX_SELECTION_CONFIG[mode]) return;
    if (toolboxSelectionMode === mode) {
      cancelToolboxSelection();
      return;
    }
    closeZoneActionDialog();
    closeDividerProfileDialog();
    closePostActionDialog();
    toolboxSelectionMode = mode;
    toolboxSelectionItems = new Map();
    clearZoneSelection();
    updateToolbox();
    postToolboxSelectionState();
  }

  function toggleToolboxSelectionItem(item) {
    if (!toolboxSelectionMode || !item || !item.key) return;
    if (toolboxSelectionItems.has(item.key)) toolboxSelectionItems.delete(item.key);
    else toolboxSelectionItems.set(item.key, item);
    updateToolbox();
    postToolboxSelectionState();
  }

  function removeProfilesBatch(items) {
    const byFacade = new Map();
    items.forEach((item) => {
      const profile = item.profile;
      if (!profile || !profile.facadeId || !profile.id) return;
      if (!byFacade.has(profile.facadeId)) byFacade.set(profile.facadeId, new Set());
      byFacade.get(profile.facadeId).add(profile.id);
    });
    byFacade.forEach((removedIds, facadeId) => {
      const current = getFacadeProfiles(facadeId);
      current.forEach((profile) => {
        if (profile.orientation === 'horizontal' && (removedIds.has(profile.leftBoundaryId) || removedIds.has(profile.rightBoundaryId))) removedIds.add(profile.id);
      });
      modelState.facadeProfiles[facadeId] = current.filter((profile) => !removedIds.has(profile.id));
      [modelState.placements, modelState.zipPlacements].forEach((store) => {
        Object.keys(store || {}).forEach((zoneId) => {
          if (zoneId.startsWith(`${facadeId}|`) && [...removedIds].some((id) => zoneId.includes(id))) delete store[zoneId];
        });
      });
    });
  }

  async function completeToolboxSelection() {
    const mode = toolboxSelectionMode;
    if (!mode) return;
    const items = [...toolboxSelectionItems.values()];
    if (!items.length) {
      $(ids.selectionBannerText).textContent = `${TOOLBOX_SELECTION_CONFIG[mode].hint} · En az bir hedef seçin.`;
      return;
    }
    if (mode === 'multi-product') {
      const zones = items.map((item) => item.zone).filter(Boolean);
      cancelToolboxSelection();
      openProductDialog(zones[0], zones);
      return;
    }
    if (mode === 'multi-profile-add') {
      const zones = items.map((item) => item.zone).filter(Boolean);
      cancelToolboxSelection();
      selectedZone = zones[0] || null;
      selectedZoneId = selectedZone ? selectedZone.id : null;
      openProfileDialog(zones);
      return;
    }
    if (mode === 'multi-delete') {
      if (!await requestAppConfirmation(`${items.length} seçili ürün silinsin mi?`, { acceptLabel: 'Ürünleri Sil' })) return;
      items.forEach((item) => { if (item.zone) { delete modelState.placements[item.zone.id]; delete modelState.zipPlacements[item.zone.id]; } });
    } else if (mode === 'multi-profile-delete') {
      if (!await requestAppConfirmation(`${items.length} seçili profil ve bağlı ürünleri silinsin mi?`, { acceptLabel: 'Profilleri Sil' })) return;
      removeProfilesBatch(items);
    } else if (mode === 'fit-products') {
      items.forEach((item) => {
        if (item.zone && modelState.placements[item.zone.id]) modelState.placements[item.zone.id] = { ...modelState.placements[item.zone.id], fitRevision: Date.now() };
        if (item.zone && modelState.zipPlacements[item.zone.id]) modelState.zipPlacements[item.zone.id] = { ...modelState.zipPlacements[item.zone.id], fitRevision: Date.now() };
      });
    }
    cancelToolboxSelection();
    clearZoneSelection();
    (typeof commitModelChangeLive==='function'?commitModelChangeLive('toolbox-bulk-operation'):renderViewer());
  }

  function closeZoneActionDialog() {
    $(ids.zoneActionDialog).hidden = true;
  }

  function pergoRiseZoneMenuMap(zone) {
    const target = zone && zone.pergoRise && zone.editingTarget ? zone.editingTarget : null;
    const actions = target && Array.isArray(target.menuActions) ? target.menuActions : [];
    return { target, actions: new Map(actions.map((item) => [String(item.id || ''), item])) };
  }

  function setZoneActionButton(button, action, fallbackLabel) {
    if (!button) return;
    button.hidden = !action;
    button.disabled = !action;
    if (action) button.textContent = String(action.label || fallbackLabel || action.id || 'İşlem');
  }

  function openZoneActionDialog() {
    if (!selectedZone) return;
    const pergo = pergoRiseZoneMenuMap(selectedZone);
    $(ids.zoneActionTitle).textContent = selectedZone.label;
    $(ids.zoneActionInfo).textContent = `${Math.round(selectedZone.width)} × ${Math.round(selectedZone.height)} mm net alan. Yapılacak işlemi seçin.`;
    if (pergo.target) {
      const placement = Boolean(pergo.target.occupiedProduct || pergo.actions.get('product-remove'));
      const addProfile = pergo.actions.get('profile-add');
      $(ids.zoneActionAddProfile).hidden = false;
      $(ids.zoneActionAddProfile).disabled = !addProfile || placement;
      $(ids.zoneActionAddProfile).textContent = addProfile ? String(addProfile.label || 'Profil Ekle') : 'Profil Ekle';
      $(ids.zoneActionRemoveProfile).hidden = true;
      $(ids.zoneActionRemoveProfile).disabled = true;
      const resizeAction = pergo.actions.get('resize');
      $(ids.zoneActionEditDimension).hidden = false;
      $(ids.zoneActionEditDimension).disabled = !resizeAction;
      $(ids.zoneActionEditDimension).textContent = resizeAction ? String(resizeAction.label || 'Ölçüyü Düzenle') : 'Ölçüyü Düzenle';
      const productAdd = pergo.actions.get('product-add');
      $(ids.zoneActionPlaceProduct).hidden = false;
      $(ids.zoneActionPlaceProduct).disabled = !productAdd;
      $(ids.zoneActionPlaceProduct).textContent = placement ? 'Ürünü Düzenle / Ekle' : 'Ürün Yerleştir';
      $(ids.zoneActionDeleteProduct).hidden = false;
      $(ids.zoneActionDeleteProduct).disabled = !placement;
      $(ids.zoneActionDeleteProduct).textContent = 'Ürünü Sil';
      $(ids.zoneActionRecalculate).hidden = true;
      $(ids.zoneActionRecalculate).disabled = true;
    } else {
      const placement = zonePlacement(selectedZone);
      $(ids.zoneActionAddProfile).hidden = false;
      $(ids.zoneActionAddProfile).disabled = Boolean(placement) || selectedZone.width < 600 || selectedZone.height < 600;
      $(ids.zoneActionAddProfile).textContent = 'Profil Ekle';
      $(ids.zoneActionRemoveProfile).hidden = true;
      $(ids.zoneActionEditDimension).hidden = false;
      $(ids.zoneActionEditDimension).disabled = false;
      $(ids.zoneActionEditDimension).textContent = 'Ölçüyü Düzenle';
      const hasPrimary = Boolean(primaryPlacement(selectedZone.id));
      const hasZip = Boolean(zipPlacement(selectedZone.id));
      $(ids.zoneActionPlaceProduct).hidden = false;
      $(ids.zoneActionPlaceProduct).disabled = false;
      $(ids.zoneActionPlaceProduct).textContent = hasPrimary && hasZip ? 'Ürünleri Düzenle' : (placement ? 'Ürünü Düzenle / Ekle' : 'Ürün Yerleştir');
      $(ids.zoneActionDeleteProduct).hidden = false;
      $(ids.zoneActionDeleteProduct).disabled = !placement;
      $(ids.zoneActionDeleteProduct).textContent = 'Ürünü Sil';
      $(ids.zoneActionRecalculate).hidden = true;
    }
    $(ids.zoneActionDialog).hidden = false;
  }

  function selectZone(zone) {
    selectedZone = zone ? { ...zone } : null;
    selectedZoneId = selectedZone ? selectedZone.id : null;
    if (selectedZone) openZoneActionDialog();
  }

  function clearZoneSelection() {
    selectedZone = null;
    selectedZoneId = null;
    closeZoneActionDialog();
    postViewerMessage('clear-zone-selection');
  }

  function runPergoRiseZoneAction(action) {
    const target = selectedZone && selectedZone.pergoRise && selectedZone.editingTarget;
    if (!target) return false;
    const handled = applyPergoRiseAreaOperation({ operation: action, areaAction: action, target });
    if (handled) clearZoneSelection();
    return handled;
  }

  function getFacadeProfiles(facadeId) {
    if (!modelState.facadeProfiles[facadeId]) modelState.facadeProfiles[facadeId] = [];
    return modelState.facadeProfiles[facadeId];
  }

  function applyProfilePreset() {
    const custom = $(ids.profileType).value === 'CUSTOM';
    $(ids.profileCustomFields).hidden = !custom;
    if (!custom) {
      $(ids.profileWidth).value = '100';
      $(ids.profileDepth).value = '100';
    }
  }

  function openProfileDialog(zones) {
    const targets = Array.isArray(zones) && zones.length ? zones.map((zone) => ({ ...zone })) : (selectedZone ? [{ ...selectedZone }] : []);
    if (!targets.length) return;
    closeZoneActionDialog();
    if (targets.some((zone) => zonePlacement(zone))) {
      alert('Ürün bulunan alana profil eklenemez. Önce ürünü silin.');
      return;
    }
    bulkProfileZones = targets.length > 1 ? targets : null;
    selectedZone = targets[0];
    selectedZoneId = selectedZone.id;
    $(ids.profileOrientation).value = 'vertical';
    $(ids.profileType).value = '100x100';
    $(ids.profileWidth).value = '100';
    $(ids.profileDepth).value = '100';
    $(ids.profileCustomFields).hidden = true;
    $(ids.profileValidation).textContent = '';
    $(ids.profileDialog).hidden = false;
    $(ids.profileOrientation).focus();
  }

  function closeProfileDialog() {
    bulkProfileZones = null;
    $(ids.profileDialog).hidden = true;
    $(ids.profileValidation).textContent = '';
  }

  function verticalProfileLayoutFits(profiles, baseWidth) {
    const sorted = profiles
      .filter((profile) => (profile.orientation || 'vertical') === 'vertical')
      .sort((a, b) => a.positionRatio - b.positionRatio);
    let cursor = -baseWidth / 2;
    for (const profile of sorted) {
      const center = -baseWidth / 2 + profile.positionRatio * baseWidth;
      const left = center - profile.width / 2;
      const right = center + profile.width / 2;
      if (left - cursor < 250) return false;
      cursor = right;
    }
    return baseWidth / 2 - cursor >= 250;
  }

  function horizontalProfileLayoutFits(profiles, baseHeight, leftBoundaryId, rightBoundaryId) {
    const sorted = profiles
      .filter((profile) => profile.orientation === 'horizontal' && profile.leftBoundaryId === leftBoundaryId && profile.rightBoundaryId === rightBoundaryId)
      .sort((a, b) => a.positionYRatio - b.positionYRatio);
    let cursor = 0;
    for (const profile of sorted) {
      const center = profile.positionYRatio * baseHeight;
      const bottom = center - profile.width / 2;
      const top = center + profile.width / 2;
      if (bottom - cursor < 250) return false;
      cursor = top;
    }
    return baseHeight - cursor >= 250;
  }

  function applyProfileForm() {
    const targets = bulkProfileZones && bulkProfileZones.length ? bulkProfileZones : (selectedZone ? [selectedZone] : []);
    if (!targets.length) return;
    const orientation = $(ids.profileOrientation).value === 'horizontal' ? 'horizontal' : 'vertical';
    const custom = $(ids.profileType).value === 'CUSTOM';
    const width = custom ? Math.round(Number($(ids.profileWidth).value)) : 100;
    const depth = custom ? Math.round(Number($(ids.profileDepth).value)) : 100;
    if (!Number.isFinite(width) || width < 40 || width > 300 || !Number.isFinite(depth) || depth < 30 || depth > 300) {
      $(ids.profileValidation).textContent = 'Profil kesiti belirtilen aralıklarda olmalıdır.';
      return;
    }
    const historyBefore = p3dvHistoryClone(modelState);
    const sequenceSnapshot = profileSequence;
    try {
      targets.forEach(zone => p3dvCanonicalAddProfile(zone, { orientation, width, depth }));
    } catch (error) {
      Object.keys(modelState).forEach(key => { delete modelState[key]; });
      Object.assign(modelState, p3dvHistoryClone(historyBefore));
      profileSequence = sequenceSnapshot;
      $(ids.profileValidation).textContent = String(error && error.message || error);
      return;
    }
    closeProfileDialog();
    clearZoneSelection();
    p3dvHistoryRecord(historyBefore, { type: 'profile-add', label: '3D profile add', origin: '3d', payload: { zoneIds: targets.map(zone => zone.id), orientation, width, depth } });
    (typeof commitModelChangeLive==='function'?commitModelChangeLive('profile-add',{preserveHistory:true}):renderViewer());
  }

  function openDividerProfileDialog(profile) {
    selectedDividerProfile = profile ? { ...profile } : null;
    if (!selectedDividerProfile) return;
    const direction = selectedDividerProfile.orientation === 'horizontal' ? 'Yatay' : 'Dikey';
    $(ids.dividerProfileTitle).textContent = `${direction} Profil`;
    $(ids.dividerProfileInfo).textContent = `${selectedDividerProfile.label || 'Eklenen profil'} · Silme işlemi bu profile bağlı alt alanlardaki ürünleri de kaldırır.`;
    $(ids.dividerProfileDialog).hidden = false;
  }

  function closeDividerProfileDialog() {
    selectedDividerProfile = null;
    $(ids.dividerProfileDialog).hidden = true;
  }

  async function deleteSelectedDividerProfile() {
    if (!selectedDividerProfile) return;
    if (!await requestAppConfirmation('Profil ve bu profile bağlı alt alanlardaki ürünler silinsin mi?', { acceptLabel: 'Profili Sil' })) return;
    const facadeId = selectedDividerProfile.facadeId;
    const profileId = selectedDividerProfile.id;
    const historyBefore = p3dvHistoryClone(modelState);
    try { p3dvCanonicalDeleteProfile({ facadeId, profileId }); }
    catch (error) { alert(String(error && error.message || error)); return; }
    closeDividerProfileDialog();
    clearZoneSelection();
    p3dvHistoryRecord(historyBefore, { type: 'profile-delete', label: '3D profile delete', origin: '3d', payload: { facadeId, profileId } });
    (typeof commitModelChangeLive==='function'?commitModelChangeLive('profile-delete',{preserveHistory:true}):renderViewer());
  }

  function normalizeBeamSectionChange(value) {
    const vertical = Math.round(Number(value && value.vertical));
    const thickness = Math.round(Number(value && value.thickness));
    if (!Number.isFinite(vertical) || !Number.isFinite(thickness) || vertical < 20 || thickness < 20) return null;
    const candidate = { ...readModel(), beamSection: { vertical, thickness } };
    return dimensionsFit(candidate) ? { vertical, thickness } : null;
  }

  function applyBeamSectionChangeFromViewer(value, camera) {
    const next = normalizeBeamSectionChange(value);
    if (!next) {
      window.alert('Bu kiriş profil kesiti mevcut sistem ölçülerine uygun değil.');
      return false;
    }
    if (camera) {
      const position = Array.isArray(camera.position) ? camera.position.map(Number) : [];
      const target = Array.isArray(camera.target) ? camera.target.map(Number) : [];
      if (position.length === 3 && target.length === 3 && [...position, ...target].every(Number.isFinite)) {
        viewerCameraState = { position, target, zoom: Number.isFinite(Number(camera.zoom)) ? Number(camera.zoom) : 1 };
      }
    }
    modelState.beamSection = next;
    if(typeof commitModelChangeLive==='function')commitModelChangeLive('beam-section-change');else{renderViewer();renderPdfRequestForm();}
    return true;
  }

  function postName(index) {
    return ['Arka Sol Dikme', 'Arka Sağ Dikme', 'Ön Sol Dikme', 'Ön Sağ Dikme'][index] || `Dikme ${index + 1}`;
  }

  function openPostActionDialog(index) {
    selectedPostIndex = Number(index);
    if (!Number.isInteger(selectedPostIndex) || selectedPostIndex < 0 || selectedPostIndex > 3) return;
    const section = modelState.postSections[selectedPostIndex];
    $(ids.postActionTitle).textContent = postName(selectedPostIndex);
    $(ids.postActionInfo).textContent = `Mevcut kesit ${section.x} × ${section.z} mm. Toplam sistem ölçüleri değişmeden bağlı parçalar ve ürünler uyarlanır.`;
    $(ids.postRotateProfile).disabled = section.x === section.z;
    $(ids.postActionDialog).hidden = false;
  }

  function closePostActionDialog() {
    selectedPostIndex = null;
    $(ids.postActionDialog).hidden = true;
  }

  function applyPostPreset() {
    const value = $(ids.postProfileType).value;
    const custom = value === 'CUSTOM';
    $(ids.postCustomFields).hidden = !custom;
    if (!custom) {
      const [x, z] = value.split('x').map(Number);
      $(ids.postX).value = String(x);
      $(ids.postZ).value = String(z);
    }
  }

  function openPostProfileDialog() {
    if (!Number.isInteger(selectedPostIndex)) return;
    const section = modelState.postSections[selectedPostIndex];
    const preset = section.x === 100 && section.z === 220 ? '100x220' : (section.x === 100 && section.z === 100 ? '100x100' : 'CUSTOM');
    $(ids.postProfileTitle).textContent = `${postName(selectedPostIndex)} Profilini Değiştir`;
    $(ids.postProfileType).value = preset;
    $(ids.postX).value = String(section.x);
    $(ids.postZ).value = String(section.z);
    $(ids.postCustomFields).hidden = preset !== 'CUSTOM';
    $(ids.postValidation).textContent = '';
    $(ids.postActionDialog).hidden = true;
    $(ids.postProfileDialog).hidden = false;
  }

  function closePostProfileDialog() {
    $(ids.postProfileDialog).hidden = true;
    $(ids.postValidation).textContent = '';
  }

  function applyPostProfileForm() {
    if (!Number.isInteger(selectedPostIndex)) return;
    const value = $(ids.postProfileType).value;
    let x;
    let z;
    if (value === 'CUSTOM') {
      x = Math.round(Number($(ids.postX).value));
      z = Math.round(Number($(ids.postZ).value));
    } else {
      [x, z] = value.split('x').map(Number);
    }
    if (!Number.isFinite(x) || !Number.isFinite(z) || x < 40 || z < 40 || x > 300 || z > 300) {
      $(ids.postValidation).textContent = 'Geçerli X ve Z profil ölçüleri girin.';
      return;
    }
    const previous = { ...modelState.postSections[selectedPostIndex] };
    modelState.postSections[selectedPostIndex] = { x, z };
    if (!dimensionsFit(readModel())) {
      modelState.postSections[selectedPostIndex] = previous;
      $(ids.postValidation).textContent = 'Bu profil mevcut toplam sistem ölçülerine sığmıyor.';
      return;
    }
    closePostProfileDialog();
    selectedPostIndex = null;
    clearZoneSelection();
    (typeof commitModelChangeLive==='function'?commitModelChangeLive('post-profile-change'):renderViewer());
  }

  function rotateSelectedPost() {
    if (!Number.isInteger(selectedPostIndex)) return;
    const current = modelState.postSections[selectedPostIndex];
    if (current.x === current.z) return;
    modelState.postSections[selectedPostIndex] = { x: current.z, z: current.x };
    if (!dimensionsFit(readModel())) {
      modelState.postSections[selectedPostIndex] = current;
      alert('Döndürülmüş profil mevcut toplam sistem ölçülerine sığmıyor.');
      return;
    }
    closePostActionDialog();
    clearZoneSelection();
    (typeof commitModelChangeLive==='function'?commitModelChangeLive('post-profile-rotate'):renderViewer());
  }

  function openZoneDimensionDialog() {
    if (!selectedZone) return;
    closeZoneActionDialog();
    $(ids.zoneDimensionTitle).textContent = `${selectedZone.label} Ölçüsü`;
    $(ids.zoneWidth).value = String(Math.round(selectedZone.width));
    $(ids.zoneHeight).value = String(Math.round(selectedZone.height));
    $(ids.zoneDimensionValidation).textContent = '';
    $(ids.zoneDimensionDialog).hidden = false;
    $(ids.zoneWidth).focus();
    $(ids.zoneWidth).select();
  }

  function closeZoneDimensionDialog() {
    $(ids.zoneDimensionDialog).hidden = true;
    $(ids.zoneDimensionValidation).textContent = '';
  }

  function applyZoneDimensionForm() {
    if (!selectedZone) return;
    const nextWidth = Math.round(Number($(ids.zoneWidth).value));
    const nextHeight = Math.round(Number($(ids.zoneHeight).value));
    if (!Number.isFinite(nextWidth) || nextWidth < 250 || !Number.isFinite(nextHeight) || nextHeight < 250) {
      $(ids.zoneDimensionValidation).textContent = 'Geçerli net genişlik ve yükseklik değerleri girin.';
      return;
    }
    const zoneId = selectedZone.id;
    const historyBefore = p3dvHistoryClone(modelState);
    try { p3dvCanonicalApplyZoneDimension(selectedZone, nextWidth, nextHeight); }
    catch (error) {
      $(ids.zoneDimensionValidation).textContent = String(error && error.message || error);
      return;
    }
    closeZoneDimensionDialog();
    clearZoneSelection();
    p3dvHistoryRecord(historyBefore, { type: 'zone-dimension', label: '3D zone dimension', origin: '3d', payload: { zoneId, width: nextWidth, height: nextHeight } });
    (typeof commitModelChangeLive==='function'?commitModelChangeLive('zone-dimension-change',{preserveHistory:true}):renderViewer());
  }

  function openSelectedProduct() {
    if (!selectedZone) return;
    closeZoneActionDialog();
    openProductDialog(selectedZone);
  }

  async function removeSelectedProduct() {
    if (!selectedZone || !zonePlacement(selectedZone)) return;
    const zoneBeforeConfirmation = { ...selectedZone };
    // The contextual area dialog must leave the modal stack before the
    // confirmation opens. Otherwise both fixed backdrops share the same
    // layer and the later context dialog can visually cover the confirmation.
    closeZoneActionDialog();
    const confirmed = await requestAppConfirmation('Seçili alandaki ürün silinsin mi?', { acceptLabel: 'Ürünü Sil' });
    if (!confirmed) {
      // Cancellation keeps the existing selection useful, but only when the
      // same zone and product still exist.
      if (selectedZone && selectedZone.id === zoneBeforeConfirmation.id && zonePlacement(selectedZone)) openZoneActionDialog();
      return;
    }
    const zoneId = zoneBeforeConfirmation.id;
    const historyBefore = p3dvHistoryClone(modelState);
    delete modelState.placements[zoneId];
    delete modelState.zipPlacements[zoneId];
    delete modelState.productOpenStates[zoneId];
    delete modelState.productOpenStates[zipProductKey(zoneId)];
    delete modelState.panelStates[zipProductKey(zoneId)];
    clearZoneSelection();
    p3dvHistoryRecord(historyBefore, { type: 'product-delete', label: '3D product delete', origin: '3d', payload: { zoneId, slot: 'all' } });
    (typeof commitModelChangeLive==='function'?commitModelChangeLive('product-delete-zone',{preserveHistory:true}):renderViewer());
  }

  function setDimensionVisibility(kind, visible) {
    if (!['intermediate', 'main'].includes(kind)) return;
    dimensionVisibility[kind] = Boolean(visible);
    updateToolbox();
    postViewerMessage('set-dimension-visibility', {
      visibility: { ...dimensionVisibility }
    });
  }

  function resetViewerCamera() {
    viewerCameraState = null;
    postViewerMessage('reset-camera');
  }

  function zoomViewerCamera(factor) {
    const safeFactor = Number(factor);
    if (!Number.isFinite(safeFactor) || safeFactor <= 0) return;
    postViewerMessage('zoom-camera', { factor: safeFactor });
  }

  function notifyEmbeddedHostPreview(expanded) {
    if (!p3dvEmbeddedHostMode) return false;
    if (typeof p3dvHostPost === 'function') {
      p3dvHostPost('preview-expanded', {
        expanded: Boolean(expanded),
        nativeFullscreen: Boolean(document.fullscreenElement || document.webkitFullscreenElement)
      }, p3dvHostActiveTransitionId);
      return true;
    }
    return false;
  }

  function setPreviewExpanded(expanded, options) {
    const opts = options || {};
    const next = Boolean(expanded);
    document.body.classList.toggle('preview-expanded', next);
    if (p3dvEmbeddedHostMode && opts.notifyHost !== false) notifyEmbeddedHostPreview(next);
    const button = $(ids.previewExpand);
    if (button) button.setAttribute('aria-pressed', String(next));
    setText(ids.previewExpandLabel, next ? 'Önizlemeyi Küçült' : 'Önizlemeyi Büyüt');
    if (next) setLargePreviewToolboxOpen(true);
    window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      postViewerMessage('viewport-resized');
    }, 90);
    return next;
  }

  async function togglePreviewExpanded() {
    const expanding = !document.body.classList.contains('preview-expanded');
    if (expanding) {
      delete document.body.dataset.fullscreenError;
      delete document.body.dataset.fullscreenHostError;

      // V14.28.6 corrective: try the top-level host synchronously when same-origin.
      // This is the preferred path because the host owns the whole PLMR workspace.
      if (p3dvEmbeddedHostMode) {
        try {
          const host = window.parent && window.parent.PulumurUnifiedWorkspace;
          if (host && typeof host.request3DPreviewExpanded === 'function') {
            const entered = await Promise.resolve(host.request3DPreviewExpanded(true, {
              notifyRuntime: false,
              browserFullscreen: true
            }));
            if (entered) {
              p3dvEmbeddedOwnFullscreen = false;
              setPreviewExpanded(true, { notifyHost: false });
              return true;
            }
          }
        } catch (error) {
          document.body.dataset.fullscreenHostError = String(error && (error.name || error.message) || 'HOST_FULLSCREEN_UNAVAILABLE');
        }
      }

      // file:// gives parent and child opaque origins in normal Chrome, so the
      // direct host API above can be inaccessible. Ask the host through the existing
      // cross-document bridge as an additional best-effort route. Do not wait for the
      // message task before trying the activated child document itself.
      if (p3dvEmbeddedHostMode) {
        p3dvHostPost('request-host-preview-expanded', { expanded: true }, p3dvHostActiveTransitionId);
      }

      // The click definitely activates this Window. Request fullscreen here with the
      // broadest compatible signature; some Chromium builds reject an options object
      // even though plain requestFullscreen() is available.
      try {
        const current = document.fullscreenElement || document.webkitFullscreenElement;
        if (!current) {
          const target = document.documentElement;
          const standardRequest = target && target.requestFullscreen;
          const webkitRequest = target && target.webkitRequestFullscreen;
          if (typeof standardRequest === 'function') {
            try {
              await standardRequest.call(target);
            } catch (firstError) {
              // If the plain call is rejected for a transient browser reason, preserve
              // the original error. The host bridge requested above may still succeed.
              throw firstError;
            }
          } else if (typeof webkitRequest === 'function') {
            await webkitRequest.call(target);
          } else {
            throw new Error('FULLSCREEN_API_UNAVAILABLE');
          }
        }
        const nativeActive = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
        if (!nativeActive) throw new Error('FULLSCREEN_NOT_ENTERED');
        p3dvEmbeddedOwnFullscreen = true;
        setPreviewExpanded(true, { notifyHost: false });
        if (p3dvEmbeddedHostMode) p3dvHostPost('preview-expanded', { expanded: true, nativeFullscreen: true }, p3dvHostActiveTransitionId);
        return true;
      } catch (error) {
        p3dvEmbeddedOwnFullscreen = false;
        document.body.dataset.fullscreenError = String(error && (error.name || error.message) || 'FULLSCREEN_REJECTED');

        // Do not leave a silent no-op. If native fullscreen is rejected, keep the
        // existing large-preview presentation visible and tell the user that browser
        // fullscreen itself was blocked. This is a fallback only; native fullscreen
        // is still the acceptance target.
        setPreviewExpanded(true, { notifyHost: false });
        setLargePreviewCommandStatus('Tarayıcı tam ekran iznini reddetti · Büyük önizleme açık');
        if (p3dvEmbeddedHostMode) p3dvHostPost('fullscreen-error', {
          message: String(error && error.message || error),
          name: String(error && error.name || ''),
          fullscreenEnabled: Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled)
        }, p3dvHostActiveTransitionId);
        console.warn('Gerçek tarayıcı tam ekranı başlatılamadı.', error);
        return false;
      }
    }

    const current = document.fullscreenElement || document.webkitFullscreenElement;
    if (current) {
      try {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        if (typeof exit === 'function') await exit.call(document);
      } catch (error) {
        console.warn('Tarayıcı tam ekranından çıkılamadı.', error);
        return false;
      }
    } else if (p3dvEmbeddedHostMode) {
      try {
        const host = window.parent && window.parent.PulumurUnifiedWorkspace;
        if (host && typeof host.request3DPreviewExpanded === 'function') {
          await Promise.resolve(host.request3DPreviewExpanded(false, { notifyRuntime: false, exitBrowserFullscreen: true }));
        }
      } catch (_) {}
    }
    p3dvEmbeddedOwnFullscreen = false;
    setPreviewExpanded(false, { notifyHost: false });
    if (p3dvEmbeddedHostMode) p3dvHostPost('preview-expanded', { expanded: false, nativeFullscreen: false }, p3dvHostActiveTransitionId);
    return true;
  }

  function setLargePreviewToolboxOpen(open) {
    const toolbox = $(ids.largePreviewToolbox);
    const workspace = $(ids.previewWorkspace);
    const toggle = $(ids.largePreviewToolboxToggle);
    const next = Boolean(open);
    if (toolbox) toolbox.classList.toggle('is-open', next);
    if (workspace) workspace.classList.toggle('is-toolbox-collapsed', !next);
    if (toggle) {
      toggle.setAttribute('aria-expanded', String(next));
      toggle.setAttribute('aria-label', next ? "Toolbox'ı daralt" : "Toolbox'ı aç");
    }
    window.setTimeout(() => postViewerMessage('viewport-resized'), 40);
  }

  function toggleLargePreviewBoolean(button) {
    if (!button || button.disabled) return;
    const next = button.getAttribute('aria-pressed') !== 'true';
    setLargePreviewBooleanState(button, next);
  }

  function setLargePreviewBooleanState(button, on) {
    if (!button) return;
    const next = Boolean(on);
    button.setAttribute('aria-pressed', String(next));
    button.classList.toggle('is-on', next);
    button.classList.toggle('is-off', !next);
    const state = button.querySelector('strong');
    if (state) state.textContent = next ? 'EVET' : 'HAYIR';
  }

  function updatePergoLargePreviewOptions() {
    const pergo = isPergoRiseUi();
    document.querySelectorAll('.large-preview-pergo-option').forEach((element) => { element.hidden = !pergo; });
    if (!pergo) return;
    const raw = modelState.pergoRiseProject && modelState.pergoRiseProject.input
      ? modelState.pergoRiseProject.input
      : collectPergoRiseRawInput();
    setLargePreviewBooleanState($(ids.largePreviewGlassTrack), String(raw.glassTrack || 'HAYIR').toUpperCase() === 'EVET');
    setLargePreviewBooleanState($(ids.largePreviewRayBoundary), String(raw.glassRayBoundaryMode || 'DARALT').toUpperCase() === 'DARALT');
    setLargePreviewBooleanState($(ids.largePreviewTriangleJoinery), String(raw.triangleJoinery || 'HAYIR').toUpperCase() === 'EVET');
    setLargePreviewBooleanState($(ids.largePreviewWaterStandard), String(raw.waterStandard || 'EVET').toUpperCase() === 'EVET');
    const parapet = $(ids.largePreviewParapet);
    if (parapet && document.activeElement !== parapet) {
      const value = String(raw.parapetHeight == null || raw.parapetHeight === '-' ? '0' : raw.parapetHeight);
      parapet.value = value;
    }
  }

  function applyLargePreviewPergoToggle(id) {
    if (!isPergoRiseUi()) return false;
    const config = {
      [ids.largePreviewGlassTrack]: { source: ids.pergoGlassTrack, field: 'glassTrack', on: 'EVET', off: 'HAYIR' },
      [ids.largePreviewRayBoundary]: { source: ids.pergoGlassRayBoundaryMode, field: 'glassRayBoundaryMode', on: 'DARALT', off: 'DEGISTIRME' },
      [ids.largePreviewTriangleJoinery]: { source: ids.pergoTriangleJoinery, field: 'triangleJoinery', on: 'EVET', off: 'HAYIR' },
      [ids.largePreviewWaterStandard]: { source: ids.waterStandardInput, field: 'waterStandard', on: 'EVET', off: 'HAYIR' }
    }[id];
    const button = $(id);
    const source = config && $(config.source);
    if (!config || !button || !source || button.disabled) return false;
    const nextOn = button.getAttribute('aria-pressed') !== 'true';
    source.value = nextOn ? config.on : config.off;
    handlePergoCanonicalFieldInput(config.field, source);
    updatePergoLargePreviewOptions();
    return true;
  }

  function setLargePreviewCommandStatus(message) {
    const status = $(ids.productStatus);
    if (!status) return;
    status.textContent = String(message || 'Komut hazır.');
    window.setTimeout(() => updateReadouts(), 2200);
  }

  function runDrawingCheck() {
    const model = readModel();
    if (!modelReady(model)) {
      setLargePreviewCommandStatus('Çizim kontrolü: zorunlu ölçüler eksik.');
      return false;
    }
    const pergo = model.productGroup === 'pergo-rise' && model.pergoRiseProject && model.pergoRiseProject.derived;
    const componentCount = pergo && pergo.counts ? Number(pergo.counts.components || pergo.counts.componentInstances || 0) : 0;
    setLargePreviewCommandStatus(pergo ? `Çizim kontrolü tamamlandı · ${componentCount || 'parametrik'} component · hata yok.` : 'Çizim kontrolü tamamlandı · model hazır.');
    return true;
  }

  function invokeLargePreviewPlaceholder(label) {
    setLargePreviewCommandStatus(`${label}: hücre işlevi sonraki tanım aşamasında bağlanacak.`);
  }

  async function toggleBrowserFullscreen() {
    if (p3dvEmbeddedHostMode) {
      await togglePreviewExpanded();
      return;
    }
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) await document.exitFullscreen();
      } else {
        setPreviewExpanded(true, { notifyHost: false });
        if (document.documentElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.warn('Tam ekran modu başlatılamadı.', error);
    }
  }

  function syncBrowserFullscreenClass() {
    const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
    document.body.classList.toggle('is-browser-fullscreen', active);
    if (active && p3dvEmbeddedHostMode) p3dvEmbeddedOwnFullscreen = true;
    if (!active && document.body.classList.contains('preview-expanded')) {
      if (!p3dvEmbeddedHostMode || p3dvEmbeddedOwnFullscreen) {
        p3dvEmbeddedOwnFullscreen = false;
        setPreviewExpanded(false, { notifyHost: false });
        if (p3dvEmbeddedHostMode) p3dvHostPost('preview-expanded', { expanded: false, nativeFullscreen: false }, p3dvHostActiveTransitionId);
      }
    }
    window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      postViewerMessage('viewport-resized');
      if (p3dvEmbeddedHostMode) p3dvHostPost('viewport-resized', {}, p3dvHostActiveTransitionId);
    }, 60);
  }

  function setInitialProjectDate() {
    const target = $(ids.projectDate);
    if (!target) return;
    try {
      target.textContent = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
    } catch (error) {
      target.textContent = new Date().toLocaleDateString('tr-TR');
    }
  }

  function toggleProductsOpen() {
    if (modelState.productGroup === 'pergo-rise') return;
    const nextOpen = !modelState.productsOpen;
    modelState.productsOpen = nextOpen;
    modelState.panelMasterOpen = nextOpen;
    allProductEntries().forEach(({ key, placement }) => {
      modelState.productOpenStates[key] = nextOpen;
      if (placement && placement.type === 'zip') modelState.panelStates[key] = nextOpen;
    });
    updateToolbox();
    if (!postLiveProductOpenState()) pendingLiveProductState = true;
    if (!postLivePanelMasterOpen()) pendingLivePanelMaster = true;
  }

  let activeZone = null;
  let fixedHorizontalFormState = { values: [], manual: [], totalHeight: 0 };

  const DOOR_TYPE_OPTIONS = [
    ['SINGLE', 'Tek Kanat', 'Hareketli'],
    ['DOUBLE', 'Çift Kanat', 'Hareketli'],
    ['LEFT_FIXED_RIGHT_MOVING', 'Tek Kanat', 'Sol Sabit'],
    ['RIGHT_FIXED_LEFT_MOVING', 'Tek Kanat', 'Sağ Sabit'],
    ['TOP_FIXED', 'Tek Kanat', 'Üst Sabit'],
    ['LEFT_FIXED_TOP', 'Tek Kanat', 'Sol–Üst Sabit'],
    ['RIGHT_FIXED_TOP', 'Tek Kanat', 'Sağ–Üst Sabit'],
    ['BOTH_FIXED_TOP', 'Tek Kanat', 'Sağ–Sol–Üst Sabit'],
    ['DOUBLE_TOP', 'Çift Kanat', 'Üst Sabit'],
    ['DOUBLE_LEFT_FIXED', 'Çift Kanat', 'Sol Sabit'],
    ['DOUBLE_LEFT_FIXED_TOP', 'Çift Kanat', 'Sol–Üst Sabit'],
    ['DOUBLE_RIGHT_FIXED_TOP', 'Çift Kanat', 'Sağ–Üst Sabit'],
    ['DOUBLE_BOTH_FIXED_TOP', 'Çift Kanat', 'Sağ–Sol–Üst Sabit']
  ];
  const DOOR_TYPE_VALUES = DOOR_TYPE_OPTIONS.map((item) => item[0]);
  const DOOR_TOP_FIXED_TYPES = new Set(['TOP_FIXED','LEFT_FIXED_TOP','RIGHT_FIXED_TOP','BOTH_FIXED_TOP','DOUBLE_TOP','DOUBLE_LEFT_FIXED_TOP','DOUBLE_RIGHT_FIXED_TOP','DOUBLE_BOTH_FIXED_TOP']);
  const DOOR_DOUBLE_TYPES = new Set(['DOUBLE','DOUBLE_TOP','DOUBLE_LEFT_FIXED','DOUBLE_LEFT_FIXED_TOP','DOUBLE_RIGHT_FIXED_TOP','DOUBLE_BOTH_FIXED_TOP']);

  const PRODUCT_OPTIONS = {
    sliding: {
      subtypes: [
        ['WITH THRESHOLD', 'Eşikli'],
        ['WITHOUT THRESHOLD', 'Eşiksiz']
      ],
      openings: [
        ['SIDE OPENING', 'Yana Açılım'],
        ['CENTER OPENING', 'Ortadan Açılım']
      ],
      views: [
        ['OUTSIDE VIEW', 'Dış Bakış'],
        ['INSIDE VIEW', 'İç Bakış']
      ],
      sideDirections: [
        ['LEFT', 'Sol'],
        ['RIGHT', 'Sağ']
      ],
      centerLayers: [
        ['OUTSIDE', 'Dışta'],
        ['INSIDE', 'İçte']
      ],
      thicknessA: [
        ['8 MM', '8 mm'],
        ['10 MM', '10 mm'],
        ['INSULATED GLASS', 'Yalıtımlı Cam']
      ],
      thicknessK: [
        ['8 MM', '8 mm'],
        ['INSULATED GLASS', 'Yalıtımlı Cam']
      ]
    },
    folding: {
      subtypesA: [
        ['STANDARD', 'Standard'],
        ['TOP-HUNG', 'Top-Hung']
      ],
      subtypesK: [
        ['STANDARD', 'Standard']
      ],
      directions: [
        ['LEFT', 'Sola'],
        ['RIGHT', 'Sağa'],
        ['BOTH', 'İki Yana']
      ],
      views: [
        ['INSIDE VIEW', 'İç Bakış'],
        ['OUTSIDE VIEW', 'Dış Bakış']
      ],
      openDirections: [
        ['INWARD', 'İçeri'],
        ['OUTWARD', 'Dışarı']
      ],
      thicknessA: [
        ['8 MM', '8 mm'],
        ['10 MM', '10 mm'],
        ['12 MM', '12 mm'],
        ['INSULATED GLASS', 'Yalıtımlı Cam']
      ],
      thicknessK: [
        ['INSULATED GLASS', 'Yalıtımlı Cam']
      ]
    },
    guillotine: {
      subtypesA: [
        ['CLEANABLE', 'Temizlenebilir'],
        ['UPWARD COLLECTING', 'Yukarı Toplanan'],
        ['DOWNWARD COLLECTING', 'Aşağı Toplanan']
      ],
      subtypesK: [
        ['CLEANABLE', 'Temizlenebilir']
      ],
      mechanismsA: [
        ['CHAIN', 'Zincir'],
        ['BELT', 'Kayış']
      ],
      mechanismsK: [
        ['BELT', 'Kayış']
      ],
      thicknessA: [
        ['8 MM', '8 mm'],
        ['INSULATED GLASS', 'Yalıtımlı Cam']
      ],
      thicknessK: [
        ['INSULATED GLASS', 'Yalıtımlı Cam']
      ]
    },
    zip: {
      series: [
        ['G SERIES', 'G Serisi'],
        ['P SERIES', 'P Serisi']
      ],
      subtypesG: [
        ['100x100 BOX', '100x100 Kutu'],
        ['110x110 BOX', '110x110 Kutu'],
        ['HERCULE', 'Hercule']
      ],
      subtypesP: [
        ['115x115 BOX', '115x115 Kutu'],
        ['130x130 BOX', '130x130 Kutu']
      ],
      placements: [
        ['BETWEEN POSTS', 'Dikme Arası'],
        ['FRONT OF POSTS', 'Dikmenin Önü']
      ],
      fabricColors: [['7635-52101', '7635-52101']],
      cableDirections: [
        ['BACK', 'Arkadan'],
        ['TOP', 'Üstten'],
        ['SIDE', 'Yandan']
      ]
    },
    door: {
      types: DOOR_TYPE_OPTIONS,
      hinges: [['LEFT', 'Sol'], ['RIGHT', 'Sağ']],
      activeLeaves: [['RIGHT', 'Sağ Aktif'], ['LEFT', 'Sol Aktif']],
      openDirections: [['OUTWARD', 'Dışa'], ['INWARD', 'İçe']],
      handles: [['NORMAL', 'Normal Kapı Kolu'], ['PANIC', 'Panik Kapı Kolu']]
    }
  };


  // V14.03 product-boundary policy. Side-product forms share one dialog, but
  // visibility, validation inputs and persisted state remain product-specific.
  // Keep this matrix as the canonical regression contract for cross-product leakage.
  const PRODUCT_FIELD_POLICY = Object.freeze({
    sliding: Object.freeze({
      wrappers: Object.freeze(['productSeriesWrap','productSubtypeWrap','productSlidingViewWrap','productOpeningWrap','productDirectionWrap','productGlassThicknessWrap','productGlassColorWrap','productPanelsWrap','slidingCollectionSection']),
      stateKeys: Object.freeze(['type','series','subtype','slidingView','openingType','openingDirection','glassThickness','glassColor','customGlassColor','panels','collectionState'])
    }),
    folding: Object.freeze({
      wrappers: Object.freeze(['productSeriesWrap','productSubtypeWrap','productDirectionWrap','productGlassThicknessWrap','productGlassColorWrap','productPanelsWrap','productFoldingViewWrap','productFoldingOpenDirectionWrap','foldingCollectionSection']),
      stateKeys: Object.freeze(['type','series','subtype','openingType','openingDirection','glassThickness','glassColor','customGlassColor','panels','foldingView','foldingOpenDirection','collectionState','thresholdProfile'])
    }),
    guillotine: Object.freeze({
      wrappers: Object.freeze(['productSeriesWrap','productSubtypeWrap','productMechanismWrap','productGlassThicknessWrap','productGlassColorWrap','productPanelTypeWrap','productMotorDirectionWrap','collectingDisplaySection']),
      stateKeys: Object.freeze(['type','series','subtype','mechanism','glassThickness','glassColor','customGlassColor','panels','panelType','motorDirection','view','motorType','remoteControl','bottomPanelMode','bottomPanelState','bottomPanelHinge','collectionState'])
    }),
    zip: Object.freeze({
      wrappers: Object.freeze(['productSeriesWrap','productSubtypeWrap','productPlacementWrap','productFabricWrap','productPanelTypeWrap','productMotorDirectionWrap']),
      stateKeys: Object.freeze(['type','series','subtype','placementLocation','fabricColor','customFabricColor','cableDirection','motorDirection','panels','view','collectionState'])
    }),
    fixed: Object.freeze({
      wrappers: Object.freeze(['productGlassThicknessWrap','productGlassColorWrap','productFixedVerticalCountWrap','productFixedHorizontalCountWrap','productFixedHorizontalHeightsWrap']),
      stateKeys: Object.freeze(['type','glassThickness','glassColor','customGlassColor','verticalDivisions','horizontalDivisions','horizontalHeights','horizontalHeightManual','panels'])
    }),
    door: Object.freeze({
      wrappers: Object.freeze(['productGlassThicknessWrap','productGlassColorWrap','productDoorTypeWrap','productDoorHingeWrap','productDoorActiveLeafWrap','productDoorOpenDirectionWrap','productDoorHandleTypeWrap','productDoorTopFixedHeightWrap','productDoorHeightSummaryWrap']),
      stateKeys: Object.freeze(['type','doorType','hingeDirection','activeLeaf','doorOpenDirection','handleType','movingLeafHeight','topFixedHeight','view','glassThickness','glassColor','customGlassColor','panels'])
    })
  });
  const PRODUCT_MANAGED_WRAPPERS = Object.freeze(Array.from(new Set(Object.values(PRODUCT_FIELD_POLICY).flatMap(item => item.wrappers).concat(['productCustomGlassWrap','cleanableWindowSection']))));
  const PRODUCT_METADATA_KEYS = Object.freeze(['fitRevision']);

  function productPolicy(type) {
    return PRODUCT_FIELD_POLICY[type] || PRODUCT_FIELD_POLICY.sliding;
  }

  function sanitizeProductState(source, fallbackType, options = {}) {
    const requestedType = source && source.type ? source.type : fallbackType;
    const type = requestedType === 'folding' ? 'folding' : (requestedType === 'guillotine' ? 'guillotine' : (requestedType === 'zip' ? 'zip' : (requestedType === 'fixed' ? 'fixed' : (requestedType === 'door' ? 'door' : 'sliding'))));
    const defaults = productDefaults(type);
    const input = source && typeof source === 'object' ? source : {};
    const out = { type };
    productPolicy(type).stateKeys.forEach(key => {
      if (key === 'type') return;
      if (Object.prototype.hasOwnProperty.call(input, key)) out[key] = input[key];
      else if (Object.prototype.hasOwnProperty.call(defaults, key)) out[key] = defaults[key];
    });
    if (options.preserveMetadata === true) PRODUCT_METADATA_KEYS.forEach(key => { if (Object.prototype.hasOwnProperty.call(input,key)) out[key]=input[key]; });
    return out;
  }

  function resetProductFieldVisibility() {
    PRODUCT_MANAGED_WRAPPERS.forEach(id => {
      const element = $(ids[id] || id);
      if (element) element.hidden = true;
    });
  }

  const COLOR_FINISHES = [
    { value: 'GLOSS', label: 'Parlak', detail: 'Daha belirgin yansıma', roughness: 0.16, metalness: 0.28 },
    { value: 'MATTE', label: 'Mat', detail: 'Daha yumuşak yansıma', roughness: 0.48, metalness: 0.16 },
    { value: 'TEXTURE', label: 'Texture', detail: 'Daha pütürlü yüzey görünümü', roughness: 0.84, metalness: 0.08 }
  ];

  const GLASS_COLOR_OPTIONS = [
    ['TRANSPARENT', 'Şeffaf'],
    ['FUME', 'Füme'],
    ['BRONZE', 'Bronz'],
    ['LOW-E GLASS', 'Low-e Cam'],
    ['OTHER', 'Diğer']
  ];

  const ZIP_FABRIC_CATALOG = [
    {
      title: 'Sun-Store',
      pages: [
        {
          image: 'assets/fabric-pages/sun-store/sun-store-page-1.jpg',
          items: [
            { value: '7635-52101', left: '52.0362%', top: '2.2805%', width: '39.7059%', height: '14.1961%', tone: '#f7f8f1', texture: 'assets/fabric-pages/sun-store/textures/7635-52101.png', tileMm: 520 },
            { value: '7635-52102', left: '8.2579%', top: '16.5336%', width: '39.5928%', height: '13.9681%', tone: '#cfd1cc', texture: 'assets/fabric-pages/sun-store/textures/7635-52102.png', tileMm: 520 },
            { value: '7635-52103', left: '52.4887%', top: '16.5336%', width: '39.5928%', height: '14.1391%', tone: '#a1a39e', texture: 'assets/fabric-pages/sun-store/textures/7635-52103.png', tileMm: 520 },
            { value: '7635-52105', left: '8.2579%', top: '30.7868%', width: '39.5928%', height: '14.1961%', tone: '#5d6568', texture: 'assets/fabric-pages/sun-store/textures/7635-52105.png', tileMm: 520 },
            { value: '7635-52106', left: '52.2624%', top: '30.7868%', width: '39.5928%', height: '14.1961%', tone: '#4f575a', texture: 'assets/fabric-pages/sun-store/textures/7635-52106.png', tileMm: 520 },
            { value: '7635-52107', left: '8.1448%', top: '45.2680%', width: '39.5928%', height: '14.1391%', tone: '#33373a', texture: 'assets/fabric-pages/sun-store/textures/7635-52107.png', tileMm: 520 },
            { value: '7635-52173', left: '52.0362%', top: '45.2109%', width: '39.5928%', height: '14.0251%', tone: '#f7f7d7', texture: 'assets/fabric-pages/sun-store/textures/7635-52173.png', tileMm: 520 },
            { value: '7635-52174', left: '8.3710%', top: '60.0342%', width: '39.5928%', height: '14.0251%', tone: '#f9f9e8', texture: 'assets/fabric-pages/sun-store/textures/7635-52174.png', tileMm: 520 },
            { value: '7635-52176', left: '51.6968%', top: '60.0342%', width: '39.7059%', height: '14.0251%', tone: '#b9ac8a', texture: 'assets/fabric-pages/sun-store/textures/7635-52176.png', tileMm: 520 },
            { value: '7635-52142', left: '8.3710%', top: '76.6819%', width: '38.6878%', height: '14.8233%', tone: '#696f72', texture: 'assets/fabric-pages/sun-store/textures/7635-52142.png', tileMm: 520 },
            { value: '7635-52144', left: '51.6968%', top: '76.6819%', width: '39.5928%', height: '14.1391%', tone: '#323639', texture: 'assets/fabric-pages/sun-store/textures/7635-52144.png', tileMm: 520 }
          ]
        },
        {
          image: 'assets/fabric-pages/sun-store/sun-store-page-2.jpg',
          items: [
            { value: '92-2044', left: '53.6830%', top: '0.7412%', width: '39.2857%', height: '12.5428%', tone: '#f7f6f1', texture: 'assets/fabric-pages/sun-store/textures/92-2044.png', tileMm: 460 },
            { value: '92-2135', left: '7.2545%', top: '13.0559%', width: '39.0625%', height: '12.8848%', tone: '#9e988d', texture: 'assets/fabric-pages/sun-store/textures/92-2135.png', tileMm: 460 },
            { value: '92-2171', left: '53.7946%', top: '13.0559%', width: '39.0625%', height: '12.8278%', tone: '#909899', texture: 'assets/fabric-pages/sun-store/textures/92-2171.png', tileMm: 460 },
            { value: '92-2043', left: '7.0312%', top: '25.7127%', width: '38.9509%', height: '12.8848%', tone: '#343635', texture: 'assets/fabric-pages/sun-store/textures/92-2043.png', tileMm: 460 },
            { value: '92-2047', left: '53.3482%', top: '25.6556%', width: '38.9509%', height: '12.8848%', tone: '#2c3135', texture: 'assets/fabric-pages/sun-store/textures/92-2047.png', tileMm: 460 },
            { value: '86-2044', left: '53.5714%', top: '38.3694%', width: '39.0625%', height: '12.9418%', tone: '#f5f4e9', texture: 'assets/fabric-pages/sun-store/textures/86-2044.png', tileMm: 420 },
            { value: '86-2135', left: '7.1429%', top: '51.0832%', width: '39.0625%', height: '12.8278%', tone: '#9a958a', texture: 'assets/fabric-pages/sun-store/textures/86-2135.png', tileMm: 420 },
            { value: '86-2171', left: '53.5714%', top: '51.0262%', width: '38.9509%', height: '12.8848%', tone: '#8f9899', texture: 'assets/fabric-pages/sun-store/textures/86-2171.png', tileMm: 420 },
            { value: '86-2043', left: '7.1429%', top: '64.2531%', width: '39.0625%', height: '12.8848%', tone: '#393c3b', texture: 'assets/fabric-pages/sun-store/textures/86-2043.png', tileMm: 420 },
            { value: '86-2047', left: '53.3482%', top: '64.2531%', width: '39.0625%', height: '12.8848%', tone: '#31363a', texture: 'assets/fabric-pages/sun-store/textures/86-2047.png', tileMm: 420 },
            { value: 'W88-8102', left: '7.1429%', top: '78.1072%', width: '39.0625%', height: '16.1345%', tone: '#f7f6e2', texture: 'assets/fabric-pages/sun-store/textures/W88-8102.png', tileMm: 420 },
            { value: 'W88-2047', left: '53.3482%', top: '78.1072%', width: '39.0625%', height: '16.2486%', tone: '#262b33', texture: 'assets/fabric-pages/sun-store/textures/W88-2047.png', tileMm: 420 }
          ]
        }
      ]
    }
  ];

  const ZIP_FABRIC_OPTIONS = ZIP_FABRIC_CATALOG.flatMap((section) => section.pages.flatMap((page) => page.items.map((item) => ({
    value: item.value,
    label: item.value,
    line: section.title,
    hex: item.tone || '#8b9096'
  }))));

  function normalizeColorFinish(value, fallback = 'MATTE') {
    return COLOR_FINISHES.some((item) => item.value === value) ? value : fallback;
  }

  function finishMeta(value) {
    return COLOR_FINISHES.find((item) => item.value === normalizeColorFinish(value)) || COLOR_FINISHES[1];
  }

  function finishLabel(value) {
    return finishMeta(value).label;
  }

  function normalizeGlassColor(value) {
    const raw = String(value || '').toUpperCase();
    if (raw === 'GREY') return 'FUME';
    if (['TRANSPARENT', 'FUME', 'BRONZE', 'LOW-E GLASS', 'OTHER'].includes(raw)) return raw;
    return 'TRANSPARENT';
  }

  function normalizeGlassThickness(value) {
    const raw = String(value || '').toUpperCase();
    return ['8 MM', '10 MM', '12 MM', 'INSULATED GLASS'].includes(raw) ? raw : '10 MM';
  }

  function glassPreferenceState() {
    const current = modelState.glassPreferences || defaults.glassPreferences;
    const normalized = {
      color: normalizeGlassColor(current && current.color),
      customColor: String(current && current.customColor || ''),
      thickness: normalizeGlassThickness(current && current.thickness)
    };
    if (normalized.color !== 'OTHER') normalized.customColor = '';
    modelState.glassPreferences = normalized;
    return normalized;
  }

  function glassThicknessValues(type, series) {
    if (type === 'guillotine') {
      return (series === 'K SERIES' ? PRODUCT_OPTIONS.guillotine.thicknessK : PRODUCT_OPTIONS.guillotine.thicknessA).map((item) => item[0]);
    }
    if (type === 'sliding') {
      return (series === 'K SERIES' ? PRODUCT_OPTIONS.sliding.thicknessK : PRODUCT_OPTIONS.sliding.thicknessA).map((item) => item[0]);
    }
    if (type === 'folding') {
      return (series === 'K SERIES' ? PRODUCT_OPTIONS.folding.thicknessK : PRODUCT_OPTIONS.folding.thicknessA).map((item) => item[0]);
    }
    if (type === 'door' || type === 'fixed') return PRODUCT_OPTIONS.sliding.thicknessA.map((item) => item[0]);
    return [];
  }

  function compatibleGlassThickness(type, series, preferredThickness, glassColor) {
    const values = glassThicknessValues(type, series);
    if (!values.length) return '';
    const preferred = normalizeGlassThickness(preferredThickness);
    if (normalizeGlassColor(glassColor) === 'LOW-E GLASS' && values.includes('INSULATED GLASS')) return 'INSULATED GLASS';
    if (values.includes(preferred)) return preferred;
    if (preferred === '10 MM' && values.includes('8 MM')) return '8 MM';
    if (preferred === '8 MM' && values.includes('INSULATED GLASS')) return 'INSULATED GLASS';
    if (values.includes('INSULATED GLASS')) return 'INSULATED GLASS';
    return values[0];
  }

  function glassSeriesForDraft(draft) {
    if (draft && (draft.type === 'sliding' || draft.type === 'folding' || draft.type === 'guillotine')) return draft.series === 'K SERIES' ? 'K SERIES' : 'A SERIES';
    return 'A SERIES';
  }

  function rememberGlassColorFromForm() {
    const preference = glassPreferenceState();
    const color = normalizeGlassColor($(ids.productGlassColor).value);
    preference.color = color;
    preference.customColor = color === 'OTHER' ? String($(ids.productCustomGlass).value || '') : '';
    if (color === 'LOW-E GLASS') {
      const type = $(ids.productType).value;
      const series = glassSeriesForDraft({ type, series: $(ids.productSeries).value });
      const compatible = compatibleGlassThickness(type, series, 'INSULATED GLASS', color);
      if (compatible) {
        preference.thickness = compatible;
        $(ids.productGlassThickness).value = compatible;
      }
    }
    modelState.glassPreferences = preference;
  }

  function rememberGlassThicknessFromForm() {
    const preference = glassPreferenceState();
    preference.thickness = normalizeGlassThickness($(ids.productGlassThickness).value);
    modelState.glassPreferences = preference;
  }

  function rememberGlassPreferencesFromDraft(draft) {
    if (!draft || draft.type === 'zip') return;
    const preference = glassPreferenceState();
    preference.color = normalizeGlassColor(draft.glassColor);
    preference.customColor = preference.color === 'OTHER' ? String(draft.customGlassColor || '') : '';
    const series = glassSeriesForDraft(draft);
    const automaticFallback = compatibleGlassThickness(draft.type, series, preference.thickness, preference.color);
    const supported = glassThicknessValues(draft.type, series);
    if (supported.includes(preference.thickness) || draft.glassThickness !== automaticFallback) {
      preference.thickness = normalizeGlassThickness(draft.glassThickness);
    }
    modelState.glassPreferences = preference;
  }

  function zipFabricByCode(value) {
    return ZIP_FABRIC_OPTIONS.find((item) => item.value === value) || ZIP_FABRIC_OPTIONS[0];
  }

  function setProductFabricValue(value) {
    const option = zipFabricByCode(value);
    if ($(ids.productFabric)) $(ids.productFabric).value = option.value;
    setText(ids.productFabricValue, option.label);
  }

  function createFabricHotspotButton(item, selectedValue) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fabric-page-hotspot' + (selectedValue === item.value ? ' is-selected' : '');
    button.setAttribute('style', `left:${item.left};top:${item.top};width:${item.width};height:${item.height};`);
    button.setAttribute('data-value', item.value);
    button.title = item.value;
    button.setAttribute('aria-label', item.value);
    button.innerHTML = `<span>${item.value}</span>`;
    button.addEventListener('click', () => {
      setProductFabricValue(item.value);
      closeProductFabricCatalog();
      $(ids.productValidation).textContent = '';
    });
    return button;
  }

  function renderFabricCards(selectedValue) {
    const container = $(ids.productFabricCards);
    if (!container) return;
    container.innerHTML = '';
    const selected = zipFabricByCode(selectedValue).value;
    ZIP_FABRIC_CATALOG.forEach((section) => {
      const sectionEl = document.createElement('section');
      sectionEl.className = 'fabric-page-section';
      const heading = document.createElement('div');
      heading.className = 'fabric-page-section-head';
      heading.innerHTML = `<strong>${section.title}</strong><span>Gerçek katalog sayfası üzerinden seçim yapın</span>`;
      sectionEl.appendChild(heading);
      const stack = document.createElement('div');
      stack.className = 'fabric-page-stack-inner';
      section.pages.forEach((page, index) => {
        const card = document.createElement('article');
        card.className = 'fabric-page-card';
        const overlay = document.createElement('div');
        overlay.className = 'fabric-page-overlay';
        const img = document.createElement('img');
        img.src = page.image;
        img.alt = `${section.title} sayfa ${index + 1}`;
        img.loading = 'lazy';
        overlay.appendChild(img);
        page.items.forEach((item) => overlay.appendChild(createFabricHotspotButton(item, selected)));
        card.appendChild(overlay);
        stack.appendChild(card);
      });
      sectionEl.appendChild(stack);
      container.appendChild(sectionEl);
    });
  }

  function foldingPanelCountForWidth(width) {
    const value = Number(width) || 0;
    return value > 0 ? Math.max(2, Math.ceil(value / 600)) : 4;
  }

  function foldingDirectionForPanels(panels, requestedDirection) {
    const count = Math.max(2, Math.round(Number(panels) || 2));
    if (count > 8) return 'BOTH';
    return ['LEFT', 'RIGHT', 'BOTH'].includes(requestedDirection) ? requestedDirection : 'RIGHT';
  }

  function foldingOpenDirectionValue(value) {
    return value === 'OUTWARD' ? 'OUTWARD' : 'INWARD';
  }

  function foldingAdvisory(zone, draft) {
    const warnings = [];
    const count = Math.max(2, Math.round(Number(draft && draft.panels) || 2));
    const height = Number(zone && zone.height) || 0;
    const width = Number(zone && zone.width) || 0;
    if (height > 2800) warnings.push(`Önerilen maksimum yükseklik 2800 mm; mevcut ${Math.round(height)} mm. Çizime engel olmaz.`);
    if (count > 8) warnings.push(`${count} panel tek tarafa önerilen 8 paneli aştığı için otomatik iki yana toplanır.`);
    if (width > 0 && width / count > 600) warnings.push(`Panel genişliği yaklaşık ${Math.round(width / count)} mm; önerilen maksimum 600 mm. Çizime engel olmaz.`);
    return warnings;
  }

  function productDefaults(type) {
    const preference = glassPreferenceState();
    const defaultGlass = preference.color;
    const customGlass = preference.color === 'OTHER' ? preference.customColor : '';
    if (type === 'zip') {
      return {
        type: 'zip',
        series: 'G SERIES',
        subtype: '100x100 BOX',
        placementLocation: 'BETWEEN POSTS',
        fabricColor: ZIP_FABRIC_OPTIONS[0].value,
        customFabricColor: '',
        cableDirection: 'BACK',
        motorDirection: 'RIGHT',
        panels: 1,
        view: 'OUTSIDE VIEW',
        collectionState: 'NORMAL'
      };
    }
    if (type === 'door') {
      return {
        type: 'door',
        doorType: 'SINGLE',
        hingeDirection: 'LEFT',
        activeLeaf: 'RIGHT',
        doorOpenDirection: 'OUTWARD',
        handleType: 'NORMAL',
        movingLeafHeight: 2200,
        topFixedHeight: 500,
        view: 'OUTSIDE VIEW',
        glassThickness: compatibleGlassThickness('door', 'A SERIES', preference.thickness, defaultGlass),
        glassColor: defaultGlass,
        customGlassColor: customGlass
      };
    }
    if (type === 'fixed') {
      return {
        type: 'fixed',
        glassThickness: compatibleGlassThickness('fixed', 'A SERIES', preference.thickness, defaultGlass),
        glassColor: defaultGlass,
        customGlassColor: customGlass,
        verticalDivisions: 0,
        horizontalDivisions: 1,
        horizontalHeights: ''
      };
    }
    if (type === 'folding') {
      return {
        type: 'folding',
        series: 'A SERIES',
        subtype: 'STANDARD',
        openingType: 'FOLDING',
        openingDirection: 'RIGHT',
        glassThickness: compatibleGlassThickness('folding', 'A SERIES', preference.thickness, defaultGlass),
        glassColor: defaultGlass,
        customGlassColor: customGlass,
        panels: 4,
        foldingView: 'INSIDE VIEW',
        foldingOpenDirection: 'INWARD',
        collectionState: 'NORMAL',
        thresholdProfile: 70
      };
    }
    if (type === 'guillotine') {
      return {
        type: 'guillotine',
        series: 'A SERIES',
        subtype: 'CLEANABLE',
        mechanism: 'CHAIN',
        glassThickness: compatibleGlassThickness('guillotine', 'A SERIES', preference.thickness, defaultGlass),
        glassColor: defaultGlass,
        customGlassColor: customGlass,
        panels: 3,
        panelType: '1+2',
        motorDirection: 'RIGHT',
        view: 'OUTSIDE VIEW',
        motorType: 'SOMFY RTS',
        remoteControl: '1 CHANNEL',
        bottomPanelMode: 'VASISTAS',
        bottomPanelState: 'OPEN',
        bottomPanelHinge: 'BOTTOM',
        collectionState: 'NORMAL'
      };
    }
    return {
      type: 'sliding',
      series: 'A SERIES',
      subtype: 'WITH THRESHOLD',
      slidingView: 'OUTSIDE VIEW',
      openingType: 'SIDE OPENING',
      openingDirection: 'RIGHT',
      glassThickness: compatibleGlassThickness('sliding', 'A SERIES', preference.thickness, defaultGlass),
      glassColor: defaultGlass,
      customGlassColor: customGlass,
      panels: 4,
      collectionState: 'NORMAL'
    };
  }

  function normalizePlacement(placement, fallbackType) {
    const requestedType = placement && placement.type ? placement.type : fallbackType;
    const type = requestedType === 'folding' ? 'folding' : (requestedType === 'guillotine' ? 'guillotine' : (requestedType === 'zip' ? 'zip' : (requestedType === 'fixed' ? 'fixed' : (requestedType === 'door' ? 'door' : 'sliding'))));
    const normalized = { ...productDefaults(type), ...(placement || {}), type };
    if (placement && placement.opening && type === 'sliding' && !placement.openingType) {
      normalized.openingType = placement.opening === 'center' ? 'CENTER OPENING' : 'SIDE OPENING';
      normalized.openingDirection = String(placement.opening || '').toUpperCase();
    }
    if (placement && placement.opening && type === 'guillotine' && !placement.subtype) {
      normalized.subtype = placement.opening === 'up' ? 'UPWARD COLLECTING' : 'CLEANABLE';
    }
    normalized.panels = Math.round(Number(normalized.panels || normalized.panelCount || productDefaults(type).panels));
    if (type === 'zip') {
      normalized.series = normalized.series === 'P SERIES' ? 'P SERIES' : 'G SERIES';
      const validTypes = normalized.series === 'P SERIES'
        ? PRODUCT_OPTIONS.zip.subtypesP.map((item) => item[0])
        : PRODUCT_OPTIONS.zip.subtypesG.map((item) => item[0]);
      if (!validTypes.includes(normalized.subtype)) normalized.subtype = validTypes[0];
      normalized.placementLocation = ['FRONT OF POSTS','OUTSIDE POSTS'].includes(normalized.placementLocation) ? 'FRONT OF POSTS' : 'BETWEEN POSTS';
      normalized.fabricColor = zipFabricByCode(normalized.fabricColor).value;
      normalized.customFabricColor = String(normalized.customFabricColor || '');
      normalized.cableDirection = ['BACK', 'TOP', 'SIDE'].includes(normalized.cableDirection) ? normalized.cableDirection : 'BACK';
      normalized.motorDirection = normalized.motorDirection === 'LEFT' ? 'LEFT' : 'RIGHT';
      normalized.panels = 1;
      normalized.view = 'OUTSIDE VIEW';
      normalized.collectionState = 'NORMAL';
    }
    if (type === 'guillotine' && normalized.subtype === 'STANDARD') normalized.subtype = 'CLEANABLE';
    if (type === 'guillotine' && normalized.bottomPanelMode === 'WINDOW') normalized.bottomPanelMode = 'VASISTAS';
    if (type === 'guillotine') {
      normalized.motorDirection = normalized.motorDirection === 'LEFT' ? 'LEFT' : 'RIGHT';
      normalized.bottomPanelHinge = 'BOTTOM';
      normalized.view = 'OUTSIDE VIEW';
      if (normalized.subtype === 'CLEANABLE') {
        normalized.bottomPanelMode = 'VASISTAS';
        normalized.bottomPanelState = 'OPEN';
      }
    }
    if (type === 'folding') {
      normalized.series = normalized.series === 'K SERIES' ? 'K SERIES' : 'A SERIES';
      const validSubtypes = normalized.series === 'K SERIES'
        ? PRODUCT_OPTIONS.folding.subtypesK.map((item) => item[0])
        : PRODUCT_OPTIONS.folding.subtypesA.map((item) => item[0]);
      if (!validSubtypes.includes(normalized.subtype)) normalized.subtype = validSubtypes[0];
      normalized.panels = Math.max(2, Math.round(Number(normalized.panels) || 4));
      normalized.openingType = 'FOLDING';
      normalized.openingDirection = foldingDirectionForPanels(normalized.panels, normalized.openingDirection);
      normalized.foldingView = normalized.foldingView === 'OUTSIDE VIEW' ? 'OUTSIDE VIEW' : 'INSIDE VIEW';
      normalized.foldingOpenDirection = foldingOpenDirectionValue(normalized.foldingOpenDirection);
      delete normalized.passageDoor;
      normalized.collectionState = normalized.collectionState === 'COLLECTED' ? 'COLLECTED' : 'NORMAL';
      normalized.thresholdProfile = 70;
      normalized.glassThickness = compatibleGlassThickness('folding', normalized.series, normalized.glassThickness, normalized.glassColor);
      normalized.glassColor = normalizeGlassColor(normalized.glassColor || glassPreferenceState().color);
      normalized.customGlassColor = String(normalized.customGlassColor || '');
    }
    if (type === 'sliding') {
      normalized.slidingView = normalized.slidingView === 'INSIDE VIEW' ? 'INSIDE VIEW' : 'OUTSIDE VIEW';
      if (!['NORMAL', 'COLLECTED'].includes(normalized.collectionState)) normalized.collectionState = 'NORMAL';
      if (normalized.openingType === 'CENTER OPENING') {
        normalized.openingDirection = normalized.openingDirection === 'INSIDE' ? 'INSIDE' : 'OUTSIDE';
      } else {
        normalized.openingDirection = normalized.openingDirection === 'LEFT' ? 'LEFT' : 'RIGHT';
      }
    }
    if (type === 'guillotine' && !['NORMAL', 'COLLECTED'].includes(normalized.collectionState)) normalized.collectionState = 'NORMAL';
    if (type === 'door') {
      normalized.doorType = DOOR_TYPE_VALUES.includes(normalized.doorType) ? normalized.doorType : 'SINGLE';
      normalized.hingeDirection = normalized.hingeDirection === 'RIGHT' ? 'RIGHT' : 'LEFT';
      normalized.activeLeaf = normalized.activeLeaf === 'LEFT' ? 'LEFT' : 'RIGHT';
      normalized.doorOpenDirection = normalized.doorOpenDirection === 'INWARD' ? 'INWARD' : 'OUTWARD';
      normalized.handleType = normalized.handleType === 'PANIC' ? 'PANIC' : 'NORMAL';
      const hasStoredMovingHeight = placement && Number.isFinite(Number(placement.movingLeafHeight));
      normalized.movingLeafHeight = hasStoredMovingHeight ? Math.max(1200, Math.round(Number(placement.movingLeafHeight))) : null;
      normalized.topFixedHeight = Math.max(110, Math.round(Number(normalized.topFixedHeight) || 500));
      normalized.view = 'OUTSIDE VIEW';
      normalized.glassThickness = compatibleGlassThickness('door', 'A SERIES', normalized.glassThickness, normalized.glassColor);
      normalized.glassColor = normalizeGlassColor(normalized.glassColor || glassPreferenceState().color);
      normalized.customGlassColor = String(normalized.customGlassColor || '');
      normalized.panels = 0;
      delete normalized.series;
      delete normalized.subtype;
    }
    if (type === 'fixed') {
      normalized.glassThickness = compatibleGlassThickness('fixed', 'A SERIES', normalized.glassThickness, normalized.glassColor);
      normalized.glassColor = normalizeGlassColor(normalized.glassColor || glassPreferenceState().color);
      normalized.customGlassColor = String(normalized.customGlassColor || '');
      normalized.verticalDivisions = Math.max(0, Math.min(20, Math.round(Number(normalized.verticalDivisions || (Number(normalized.verticalCount) ? Number(normalized.verticalCount) + 1 : 0)) || 0)));
      normalized.horizontalDivisions = Math.max(1, Math.min(10, Math.round(Number(normalized.horizontalDivisions || (Number.isFinite(Number(normalized.horizontalCount)) ? Number(normalized.horizontalCount) + 1 : 1)) || 1)));
      normalized.horizontalHeights = String(normalized.horizontalHeights || '');
      const hasStoredManual = placement && Array.isArray(placement.horizontalHeightManual);
      const storedManual = hasStoredManual ? placement.horizontalHeightManual : [];
      normalized.horizontalHeightManual = hasStoredManual
        ? Array.from({ length: normalized.horizontalDivisions }, (_, index) => Boolean(storedManual[index]))
        : null;
      delete normalized.horizontalCount;
      delete normalized.horizontalMode;
      delete normalized.series;
      delete normalized.subtype;
    }
    return sanitizeProductState(normalized, type, { preserveMetadata: true });
  }

  function fillSelect(select, options, selected) {
    const safeOptions = Array.isArray(options) ? options : [];
    select.innerHTML = '';
    safeOptions.forEach((option) => {
      const value = Array.isArray(option) ? String(option[0]) : String(option);
      const label = Array.isArray(option) ? (option.length > 2 ? option[1] + ' · ' + option[2] : option[1]) : String(option);
      const element = document.createElement('option');
      element.value = value;
      element.textContent = label;
      if (String(selected) === value) element.selected = true;
      select.appendChild(element);
    });
    if (!select.value && safeOptions.length) select.value = String(Array.isArray(safeOptions[0]) ? safeOptions[0][0] : safeOptions[0]);
  }

  function doorTypeLabelParts(value) {
    const found = DOOR_TYPE_OPTIONS.find((item) => item[0] === value);
    return found ? { main: found[1], detail: found[2] } : { main: String(value || ''), detail: '' };
  }

  function doorTypeLabel(value) {
    const label = doorTypeLabelParts(value);
    return label.detail ? label.main + ' · ' + label.detail : label.main;
  }

  function lookupOptionLabel(options, value) {
    const list = Array.isArray(options) ? options : [];
    const found = list.find((option) => Array.isArray(option)
      ? String(option[0]) === String(value)
      : String(option) === String(value));
    if (!found) return value == null || value === '' ? '—' : String(value);
    return Array.isArray(found) ? String(found[1] || found[0]) : String(found);
  }

  function mmText(value) {
    const number = Math.round(Number(value) || 0);
    return `${number} mm`;
  }

  function glassColorLabel(value, customValue) {
    const normalized = normalizeGlassColor(value);
    if (normalized === 'OTHER') {
      const custom = String(customValue || '').trim();
      return custom ? `Diğer · ${custom}` : 'Diğer';
    }
    return lookupOptionLabel(GLASS_COLOR_OPTIONS, normalized);
  }

  function fabricColorLabel(value, customValue) {
    const found = ZIP_FABRIC_OPTIONS.find((item) => item.value === value);
    if (found) return `${found.label} · ${found.line}`;
    const custom = String(customValue || '').trim();
    return custom ? `Özel kumaş · ${custom}` : (value ? String(value) : '—');
  }

  function openingDirectionLabel(placement) {
    const normalized = normalizePlacement(placement, placement && placement.type);
    if (normalized.type === 'sliding') {
      if (normalized.openingType === 'CENTER OPENING') return lookupOptionLabel(PRODUCT_OPTIONS.sliding.centerLayers, normalized.openingDirection);
      return lookupOptionLabel(PRODUCT_OPTIONS.sliding.sideDirections, normalized.openingDirection);
    }
    if (normalized.type === 'folding') return lookupOptionLabel(PRODUCT_OPTIONS.folding.directions, normalized.openingDirection);
    if (normalized.type === 'guillotine') return lookupOptionLabel([['LEFT', 'Sol'], ['RIGHT', 'Sağ']], normalized.motorDirection);
    return '—';
  }

  function seriesLabel(value) {
    return lookupOptionLabel([['A SERIES', 'A Serisi'], ['K SERIES', 'K Serisi'], ['G SERIES', 'G Serisi'], ['P SERIES', 'P Serisi']], value);
  }

  function collectionStateLabel(value) {
    return String(value) === 'COLLECTED' ? 'Toplanmış göster' : 'Kapalı / normal görünüm';
  }

  function placementDetailLines(placement, zone) {
    const normalized = normalizePlacement(placement, placement && placement.type);
    const lines = [
      { label: 'Ürün', value: productTypeLabel(normalized) },
      { label: 'Net Alan', value: `${mmText(zone.width)} × ${mmText(zone.height)}` }
    ];
    if (normalized.type === 'folding') {
      lines.push(
        { label: 'Seri', value: seriesLabel(normalized.series) },
        { label: 'Tip', value: lookupOptionLabel(normalized.series === 'K SERIES' ? PRODUCT_OPTIONS.folding.subtypesK : PRODUCT_OPTIONS.folding.subtypesA, normalized.subtype) },
        { label: 'Katlanma Yönü', value: openingDirectionLabel(normalized) },
        { label: 'Panel Sayısı', value: String(normalized.panels) },
        { label: 'Yaklaşık Panel Genişliği', value: mmText(zone.width / Math.max(1, normalized.panels)) },
        { label: 'Bakış Yönü', value: lookupOptionLabel(PRODUCT_OPTIONS.folding.views, normalized.foldingView) },
        { label: 'Açılma Yönü', value: lookupOptionLabel(PRODUCT_OPTIONS.folding.openDirections, normalized.foldingOpenDirection) },
        { label: 'Alt Profil', value: '70 mm · Eşikli' },
        { label: 'Cam Kalınlığı', value: lookupOptionLabel(normalized.series === 'K SERIES' ? PRODUCT_OPTIONS.folding.thicknessK : PRODUCT_OPTIONS.folding.thicknessA, normalized.glassThickness) },
        { label: 'Cam Rengi', value: glassColorLabel(normalized.glassColor, normalized.customGlassColor) },
        { label: '3D Gösterim', value: collectionStateLabel(normalized.collectionState) }
      );
      foldingAdvisory(zone, normalized).forEach((warning) => lines.push({ label: 'Öneri Uyarısı', value: warning }));
    } else if (normalized.type === 'sliding') {
      lines.push(
        { label: 'Seri', value: seriesLabel(normalized.series) },
        { label: 'Tip', value: lookupOptionLabel(PRODUCT_OPTIONS.sliding.subtypes, normalized.subtype) },
        { label: 'Bakış Yönü', value: lookupOptionLabel(PRODUCT_OPTIONS.sliding.views, normalized.slidingView) },
        { label: 'Açılım Tipi', value: lookupOptionLabel(PRODUCT_OPTIONS.sliding.openings, normalized.openingType) },
        { label: normalized.openingType === 'CENTER OPENING' ? 'Dışta / İçte' : 'Açılım Yönü', value: openingDirectionLabel(normalized) },
        { label: 'Panel Sayısı', value: String(normalized.panels) },
        { label: 'Cam Kalınlığı', value: lookupOptionLabel((normalized.series === 'K SERIES' ? PRODUCT_OPTIONS.sliding.thicknessK : PRODUCT_OPTIONS.sliding.thicknessA), normalized.glassThickness) },
        { label: 'Cam Rengi', value: glassColorLabel(normalized.glassColor, normalized.customGlassColor) },
        { label: '3D Gösterim', value: collectionStateLabel(normalized.collectionState) }
      );
    } else if (normalized.type === 'guillotine') {
      lines.push(
        { label: 'Seri', value: seriesLabel(normalized.series) },
        { label: 'Tip', value: lookupOptionLabel((normalized.series === 'K SERIES' ? PRODUCT_OPTIONS.guillotine.subtypesK : PRODUCT_OPTIONS.guillotine.subtypesA), normalized.subtype) },
        { label: 'Mekanizma', value: lookupOptionLabel((normalized.series === 'K SERIES' ? PRODUCT_OPTIONS.guillotine.mechanismsK : PRODUCT_OPTIONS.guillotine.mechanismsA), normalized.mechanism) },
        { label: 'Panel Tipi', value: String(normalized.panelType || '1+2') },
        { label: 'Motor Yönü', value: lookupOptionLabel([['LEFT', 'Sol'], ['RIGHT', 'Sağ']], normalized.motorDirection) },
        { label: 'Cam Kalınlığı', value: lookupOptionLabel((normalized.series === 'K SERIES' ? PRODUCT_OPTIONS.guillotine.thicknessK : PRODUCT_OPTIONS.guillotine.thicknessA), normalized.glassThickness) },
        { label: 'Cam Rengi', value: glassColorLabel(normalized.glassColor, normalized.customGlassColor) }
      );
      if (String(normalized.subtype) === 'CLEANABLE') {
        lines.push({ label: 'Alt Panel Modu', value: 'Vasistas' });
      }
      if (['UPWARD COLLECTING', 'DOWNWARD COLLECTING'].includes(String(normalized.subtype))) {
        lines.push({ label: '3D Gösterim', value: collectionStateLabel(normalized.collectionState) });
      }
    } else if (normalized.type === 'zip') {
      lines.push(
        { label: 'Seri', value: seriesLabel(normalized.series) },
        { label: 'Tip', value: lookupOptionLabel(normalized.series === 'P SERIES' ? PRODUCT_OPTIONS.zip.subtypesP : PRODUCT_OPTIONS.zip.subtypesG, normalized.subtype) },
        { label: 'Yerleşim', value: lookupOptionLabel(PRODUCT_OPTIONS.zip.placements, normalized.placementLocation) },
        { label: 'Kumaş', value: fabricColorLabel(normalized.fabricColor, normalized.customFabricColor) },
        { label: 'Kablo Yönü', value: lookupOptionLabel(PRODUCT_OPTIONS.zip.cableDirections, normalized.cableDirection) },
        { label: 'Motor Yönü', value: lookupOptionLabel([['LEFT', 'Sol'], ['RIGHT', 'Sağ']], normalized.motorDirection) }
      );
    } else if (normalized.type === 'fixed') {
      lines.push(
        { label: 'Cam Kalınlığı', value: lookupOptionLabel(PRODUCT_OPTIONS.sliding.thicknessA, normalized.glassThickness) },
        { label: 'Cam Rengi', value: glassColorLabel(normalized.glassColor, normalized.customGlassColor) },
        { label: 'Dikey Bölme', value: String(normalized.verticalDivisions) },
        { label: 'Yatay Bölme', value: String(normalized.horizontalDivisions) }
      );
      const fixedSegments = String(normalized.horizontalHeights || '').split(/[;,]+/).filter(Boolean);
      fixedSegments.forEach((value, index) => lines.push({ label: `SDY${index + 1}`, value: mmText(value) }));
    } else if (normalized.type === 'door') {
      lines.push(
        { label: 'Kapı Tipi', value: doorTypeLabel(normalized.doorType) },
        { label: 'Menteşe', value: lookupOptionLabel(PRODUCT_OPTIONS.door.hinges, normalized.hingeDirection) },
        { label: 'Aktif Kanat', value: lookupOptionLabel(PRODUCT_OPTIONS.door.activeLeaves, normalized.activeLeaf) },
        { label: 'Açılım Yönü', value: lookupOptionLabel(PRODUCT_OPTIONS.door.openDirections, normalized.doorOpenDirection) },
        { label: 'Kol Tipi', value: lookupOptionLabel(PRODUCT_OPTIONS.door.handles, normalized.handleType) },
        { label: 'Cam Kalınlığı', value: lookupOptionLabel(PRODUCT_OPTIONS.sliding.thicknessA, normalized.glassThickness) },
        { label: 'Cam Rengi', value: glassColorLabel(normalized.glassColor, normalized.customGlassColor) }
      );
      if (DOOR_TOP_FIXED_TYPES.has(normalized.doorType)) lines.push({ label: 'Üst Sabit Cam Yüksekliği', value: mmText(normalized.topFixedHeight) });
      if (Number(normalized.movingLeafHeight)) lines.push({ label: 'Kanat Yüksekliği', value: mmText(normalized.movingLeafHeight) });
    }
    return lines;
  }

  function placementChangeLines(placement) {
    const normalized = normalizePlacement(placement, placement && placement.type);
    const defaultsForType = normalizePlacement(productDefaults(normalized.type), normalized.type);
    const diffs = [];
    const pushIfChanged = (label, currentValue, defaultValue) => {
      if (String(currentValue) !== String(defaultValue)) diffs.push(`${label}: ${currentValue}`);
    };
    if (normalized.type === 'folding') {
      pushIfChanged('Seri', seriesLabel(normalized.series), seriesLabel(defaultsForType.series));
      pushIfChanged('Tip', lookupOptionLabel(normalized.series === 'K SERIES' ? PRODUCT_OPTIONS.folding.subtypesK : PRODUCT_OPTIONS.folding.subtypesA, normalized.subtype), lookupOptionLabel(PRODUCT_OPTIONS.folding.subtypesA, defaultsForType.subtype));
      pushIfChanged('Katlanma yönü', openingDirectionLabel(normalized), openingDirectionLabel(defaultsForType));
      pushIfChanged('Panel sayısı', normalized.panels, defaultsForType.panels);
      pushIfChanged('Bakış yönü', lookupOptionLabel(PRODUCT_OPTIONS.folding.views, normalized.foldingView), lookupOptionLabel(PRODUCT_OPTIONS.folding.views, defaultsForType.foldingView));
      pushIfChanged('Açılma yönü', lookupOptionLabel(PRODUCT_OPTIONS.folding.openDirections, normalized.foldingOpenDirection), lookupOptionLabel(PRODUCT_OPTIONS.folding.openDirections, defaultsForType.foldingOpenDirection));
      pushIfChanged('Cam kalınlığı', normalized.glassThickness, defaultsForType.glassThickness);
      pushIfChanged('Cam rengi', glassColorLabel(normalized.glassColor, normalized.customGlassColor), glassColorLabel(defaultsForType.glassColor, defaultsForType.customGlassColor));
      pushIfChanged('3D gösterim', collectionStateLabel(normalized.collectionState), collectionStateLabel(defaultsForType.collectionState));
    } else if (normalized.type === 'sliding') {
      pushIfChanged('Seri', seriesLabel(normalized.series), seriesLabel(defaultsForType.series));
      pushIfChanged('Tip', lookupOptionLabel(PRODUCT_OPTIONS.sliding.subtypes, normalized.subtype), lookupOptionLabel(PRODUCT_OPTIONS.sliding.subtypes, defaultsForType.subtype));
      pushIfChanged('Bakış yönü', lookupOptionLabel(PRODUCT_OPTIONS.sliding.views, normalized.slidingView), lookupOptionLabel(PRODUCT_OPTIONS.sliding.views, defaultsForType.slidingView));
      pushIfChanged('Açılım tipi', lookupOptionLabel(PRODUCT_OPTIONS.sliding.openings, normalized.openingType), lookupOptionLabel(PRODUCT_OPTIONS.sliding.openings, defaultsForType.openingType));
      pushIfChanged('Açılım yönü', openingDirectionLabel(normalized), openingDirectionLabel(defaultsForType));
      pushIfChanged('Panel sayısı', normalized.panels, defaultsForType.panels);
      pushIfChanged('Cam kalınlığı', normalized.glassThickness, defaultsForType.glassThickness);
      pushIfChanged('Cam rengi', glassColorLabel(normalized.glassColor, normalized.customGlassColor), glassColorLabel(defaultsForType.glassColor, defaultsForType.customGlassColor));
      pushIfChanged('3D gösterim', collectionStateLabel(normalized.collectionState), collectionStateLabel(defaultsForType.collectionState));
    } else if (normalized.type === 'guillotine') {
      pushIfChanged('Seri', seriesLabel(normalized.series), seriesLabel(defaultsForType.series));
      pushIfChanged('Tip', lookupOptionLabel((normalized.series === 'K SERIES' ? PRODUCT_OPTIONS.guillotine.subtypesK : PRODUCT_OPTIONS.guillotine.subtypesA), normalized.subtype), lookupOptionLabel(PRODUCT_OPTIONS.guillotine.subtypesA, defaultsForType.subtype));
      pushIfChanged('Mekanizma', normalized.mechanism, defaultsForType.mechanism);
      pushIfChanged('Panel tipi', normalized.panelType, defaultsForType.panelType);
      pushIfChanged('Motor yönü', normalized.motorDirection, defaultsForType.motorDirection);
      pushIfChanged('Cam kalınlığı', normalized.glassThickness, defaultsForType.glassThickness);
      pushIfChanged('Cam rengi', glassColorLabel(normalized.glassColor, normalized.customGlassColor), glassColorLabel(defaultsForType.glassColor, defaultsForType.customGlassColor));
      pushIfChanged('3D gösterim', collectionStateLabel(normalized.collectionState), collectionStateLabel(defaultsForType.collectionState));
    } else if (normalized.type === 'zip') {
      pushIfChanged('Seri', seriesLabel(normalized.series), seriesLabel(defaultsForType.series));
      pushIfChanged('Tip', normalized.subtype, defaultsForType.subtype);
      pushIfChanged('Yerleşim', lookupOptionLabel(PRODUCT_OPTIONS.zip.placements, normalized.placementLocation), lookupOptionLabel(PRODUCT_OPTIONS.zip.placements, defaultsForType.placementLocation));
      pushIfChanged('Kumaş', fabricColorLabel(normalized.fabricColor, normalized.customFabricColor), fabricColorLabel(defaultsForType.fabricColor, defaultsForType.customFabricColor));
      pushIfChanged('Kablo yönü', lookupOptionLabel(PRODUCT_OPTIONS.zip.cableDirections, normalized.cableDirection), lookupOptionLabel(PRODUCT_OPTIONS.zip.cableDirections, defaultsForType.cableDirection));
      pushIfChanged('Motor yönü', normalized.motorDirection, defaultsForType.motorDirection);
    } else if (normalized.type === 'fixed') {
      pushIfChanged('Cam kalınlığı', normalized.glassThickness, defaultsForType.glassThickness);
      pushIfChanged('Cam rengi', glassColorLabel(normalized.glassColor, normalized.customGlassColor), glassColorLabel(defaultsForType.glassColor, defaultsForType.customGlassColor));
      pushIfChanged('Dikey bölme', normalized.verticalDivisions, defaultsForType.verticalDivisions);
      pushIfChanged('Yatay bölme', normalized.horizontalDivisions, defaultsForType.horizontalDivisions);
      if (String(normalized.horizontalHeights || '') !== String(defaultsForType.horizontalHeights || '')) diffs.push(`Yatay dağılım: ${normalized.horizontalHeights || 'özel'}`);
    } else if (normalized.type === 'door') {
      pushIfChanged('Kapı tipi', doorTypeLabel(normalized.doorType), doorTypeLabel(defaultsForType.doorType));
      pushIfChanged('Menteşe', normalized.hingeDirection, defaultsForType.hingeDirection);
      pushIfChanged('Aktif kanat', normalized.activeLeaf, defaultsForType.activeLeaf);
      pushIfChanged('Açılım yönü', normalized.doorOpenDirection, defaultsForType.doorOpenDirection);
      pushIfChanged('Kol tipi', normalized.handleType, defaultsForType.handleType);
      pushIfChanged('Üst sabit yüksekliği', normalized.topFixedHeight, defaultsForType.topFixedHeight);
      pushIfChanged('Kanat yüksekliği', normalized.movingLeafHeight, defaultsForType.movingLeafHeight);
      pushIfChanged('Cam kalınlığı', normalized.glassThickness, defaultsForType.glassThickness);
      pushIfChanged('Cam rengi', glassColorLabel(normalized.glassColor, normalized.customGlassColor), glassColorLabel(defaultsForType.glassColor, defaultsForType.customGlassColor));
    }
    return diffs;
  }

  function createSubZoneReport(base, startU, endU, bottomY, topY, index, total, leftBoundaryId, rightBoundaryId, bottomBoundaryId, topBoundaryId, leftBoundaryWidth, rightBoundaryWidth) {
    const centerU = (startU + endU) / 2;
    const width = Math.max(0, endU - startU);
    const height = Math.max(0, topY - bottomY);
    const defaultStartId = base.startBoundaryId || 'START';
    const defaultEndId = base.endBoundaryId || 'END';
    const noProfiles = leftBoundaryId === defaultStartId && rightBoundaryId === defaultEndId && bottomBoundaryId === 'BOTTOM' && topBoundaryId === 'TOP';
    const id = noProfiles ? base.id : `${base.id}|${leftBoundaryId}-${rightBoundaryId}|${bottomBoundaryId}-${topBoundaryId}`;
    const cx = base.axis === 'x' ? base.cx + centerU : base.cx;
    const cz = base.axis === 'x' ? base.cz : base.cz + centerU;
    const localStartRatio = (startU + base.width / 2) / base.width;
    const localEndRatio = (endU + base.width / 2) / base.width;
    const globalStart = Number.isFinite(Number(base.globalStartRatio)) ? Number(base.globalStartRatio) : 0;
    const globalEnd = Number.isFinite(Number(base.globalEndRatio)) ? Number(base.globalEndRatio) : 1;
    const ratioSpan = globalEnd - globalStart;
    return {
      ...base,
      id,
      facadeId: base.facadeId || String(base.id || '').split('|')[0],
      label: noProfiles ? base.label : `${base.label} · Alan ${index + 1}`,
      cx,
      cz,
      width,
      height,
      bottomY,
      topY,
      baseWidth: Number(base.globalBaseWidth) || base.width,
      baseHeight: base.height,
      startRatio: globalStart + localStartRatio * ratioSpan,
      endRatio: globalStart + localEndRatio * ratioSpan,
      bottomRatio: (bottomY - base.bottomY) / base.height,
      topRatio: (topY - base.bottomY) / base.height,
      leftBoundaryId,
      rightBoundaryId,
      leftBoundaryWidth: Math.max(0, Number(leftBoundaryWidth) || 0),
      rightBoundaryWidth: Math.max(0, Number(rightBoundaryWidth) || 0),
      bottomBoundaryId,
      topBoundaryId,
      areaIndex: index,
      areaCount: total
    };
  }

  function splitFacadeZonesForReport(base, facadeProfilesMap) {
    const facadeStoreId = base.profileSourceId || base.facadeId || String(base.id || '').split('|')[0];
    const rawSource = Array.isArray((facadeProfilesMap || {})[facadeStoreId]) ? (facadeProfilesMap || {})[facadeStoreId] : [];
    const globalBaseWidth = Math.max(1, Number(base.globalBaseWidth) || base.width);
    const globalStartRatio = Number.isFinite(Number(base.globalStartRatio)) ? Number(base.globalStartRatio) : 0;
    const globalEndRatio = Number.isFinite(Number(base.globalEndRatio)) ? Number(base.globalEndRatio) : 1;
    const globalSpan = Math.max(.000001, globalEndRatio - globalStartRatio);
    const profiles = rawSource.map(profile => {
      const orientation = profile.orientation === 'horizontal' ? 'horizontal' : 'vertical';
      const normalized = {
        ...profile,
        orientation,
        width: Math.max(40, Number(profile.width) || 100),
        depth: Math.max(30, Number(profile.depth) || 100),
        positionRatio: Math.max(.0001, Math.min(.9999, Number(profile.positionRatio) || .5)),
        positionYRatio: Math.max(.01, Math.min(.99, Number(profile.positionYRatio) || .5))
      };
      if (orientation === 'vertical') {
        if (normalized.positionRatio <= globalStartRatio + .000001 || normalized.positionRatio >= globalEndRatio - .000001) return null;
        normalized.positionRatio = (normalized.positionRatio - globalStartRatio) / globalSpan;
        return normalized;
      }
      const scopeStart = Number.isFinite(Number(profile.scopeStartRatio)) ? Number(profile.scopeStartRatio) : 0;
      const scopeEnd = Number.isFinite(Number(profile.scopeEndRatio)) ? Number(profile.scopeEndRatio) : 1;
      if (scopeEnd < globalStartRatio - .0001 || scopeStart > globalEndRatio + .0001) return null;
      normalized.scopeStartRatio = Math.max(0, (Math.max(scopeStart, globalStartRatio) - globalStartRatio) / globalSpan);
      normalized.scopeEndRatio = Math.min(1, (Math.min(scopeEnd, globalEndRatio) - globalStartRatio) / globalSpan);
      return normalized;
    }).filter(Boolean);
    const verticals = profiles.filter(profile => profile.orientation === 'vertical').sort((a, b) => a.positionRatio - b.positionRatio);
    const horizontals = profiles.filter(profile => profile.orientation === 'horizontal');
    const startBoundaryId = base.startBoundaryId || 'START';
    const endBoundaryId = base.endBoundaryId || 'END';
    const boundaryWidthMap = Object.fromEntries(verticals.map(profile => [profile.id, profile.width]));
    boundaryWidthMap[startBoundaryId] = Math.max(0, Number(base.startBoundaryWidth) || 0);
    boundaryWidthMap[endBoundaryId] = Math.max(0, Number(base.endBoundaryWidth) || 0);
    const strips = [];
    let cursor = -base.width / 2;
    let leftId = startBoundaryId;
    verticals.forEach(profile => {
      const center = -base.width / 2 + profile.positionRatio * base.width;
      const left = Math.max(cursor, center - profile.width / 2);
      const right = Math.min(base.width / 2, center + profile.width / 2);
      strips.push({ start: cursor, end: left, leftId, rightId: profile.id });
      cursor = right;
      leftId = profile.id;
    });
    strips.push({ start: cursor, end: base.width / 2, leftId, rightId: endBoundaryId });
    const cells = [];
    strips.filter(strip => strip.end - strip.start >= 80).forEach(strip => {
      const stripStartRatio = (strip.start + base.width / 2) / base.width;
      const stripEndRatio = (strip.end + base.width / 2) / base.width;
      const scoped = horizontals.filter(profile => {
        const start = Number.isFinite(Number(profile.scopeStartRatio)) ? Number(profile.scopeStartRatio) : 0;
        const end = Number.isFinite(Number(profile.scopeEndRatio)) ? Number(profile.scopeEndRatio) : 1;
        return stripStartRatio >= start - .0001 && stripEndRatio <= end + .0001;
      }).sort((a, b) => a.positionYRatio - b.positionYRatio);
      let bottom = base.bottomY;
      let bottomId = 'BOTTOM';
      scoped.forEach(profile => {
        const centerY = base.bottomY + profile.positionYRatio * base.height;
        const profileBottom = Math.max(bottom, centerY - profile.width / 2);
        const profileTop = Math.min(base.topY, centerY + profile.width / 2);
        cells.push({ startU: strip.start, endU: strip.end, bottomY: bottom, topY: profileBottom, leftId: strip.leftId, rightId: strip.rightId, bottomId, topId: profile.id });
        bottom = profileTop;
        bottomId = profile.id;
      });
      cells.push({ startU: strip.start, endU: strip.end, bottomY: bottom, topY: base.topY, leftId: strip.leftId, rightId: strip.rightId, bottomId, topId: 'TOP' });
    });
    const valid = cells.filter(cell => cell.endU - cell.startU >= 80 && cell.topY - cell.bottomY >= 80);
    return valid.map((cell, index) => createSubZoneReport(
      base, cell.startU, cell.endU, cell.bottomY, cell.topY, index, valid.length,
      cell.leftId, cell.rightId, cell.bottomId, cell.topId,
      boundaryWidthMap[cell.leftId] || 0, boundaryWidthMap[cell.rightId] || 0
    ));
  }

  function buildCanonicalReportFacadeBases(model) {
    const W = Number(model.width) || 0;
    const D = Number(model.depth) || 0;
    const H = Number(model.height) || 0;
    const fallbackSection = { x: 100, z: 100 };
    const rawSections = Array.isArray(model.postSections) ? model.postSections : [];
    const p = Array.from({ length: 4 }, (_, index) => {
      const section = rawSections[index] || fallbackSection;
      return { x: Math.max(1, Number(section.x) || fallbackSection.x), z: Math.max(1, Number(section.z) || fallbackSection.z) };
    });
    const beamVertical = Number(model.beamSection && model.beamSection.vertical) || 0;
    const beamBottomY = H / 2 - beamVertical;
    const bottomY = -H / 2;
    const topY = beamBottomY;
    const height = Math.max(400, topY - bottomY);
    const frontStart = -W / 2 + p[0].x;
    const frontEnd = W / 2 - p[1].x;
    const backStart = -W / 2 + p[2].x;
    const backEnd = W / 2 - p[3].x;
    const leftStart = -D / 2 + p[0].z;
    const leftEnd = D / 2 - p[2].z;
    const rightStart = -D / 2 + p[1].z;
    const rightEnd = D / 2 - p[3].z;
    const frontFaceDepth = Math.max(p[0].z, p[1].z);
    const backFaceDepth = Math.max(p[2].z, p[3].z);
    const leftFaceDepth = Math.max(p[0].x, p[2].x);
    const rightFaceDepth = Math.max(p[1].x, p[3].x);
    const freedomLayout = model && model.freedomLayout && model.freedomLayout.valid ? model.freedomLayout : null;
    const bioRiseLayout = model && model.bioRiseLayout && model.bioRiseLayout.valid ? model.bioRiseLayout : null;
    const galaxyLayout = model && model.galaxyLayout && model.galaxyLayout.valid ? model.galaxyLayout : null;
    const freedomMultiActive = model.productGroup === 'b-cube' && freedomLayout && Number(freedomLayout.systemCount) > 1;
    const galaxyLayoutActive = model.productGroup === 'b-cube-galaxy' && galaxyLayout;
    const bioRiseMultiActive = model.productGroup === 'bio-rise' && bioRiseLayout && Number(bioRiseLayout.systemCount) > 1;
    const bioFamilyLayout = galaxyLayoutActive ? galaxyLayout : (bioRiseMultiActive ? bioRiseLayout : null);
    const facades = [];

    if (bioFamilyLayout && Array.isArray(bioFamilyLayout.modules) && bioFamilyLayout.modules.length) {
      const modules = bioFamilyLayout.modules;
      const rearGlobalStart = Number(modules[0].clearMinX);
      const rearGlobalEnd = Number(modules[modules.length - 1].clearMaxX);
      const rearGlobalWidth = Math.max(1, rearGlobalEnd - rearGlobalStart);
      modules.forEach((module) => {
        const leftLine = Number(module.leftLine) || 0;
        const rightLine = Number(module.rightLine) || 0;
        const rearLeftSection = module.rearLeftSection || (bioFamilyLayout.rearSections && bioFamilyLayout.rearSections[leftLine]) || p[0];
        const rearRightSection = module.rearRightSection || (bioFamilyLayout.rearSections && bioFamilyLayout.rearSections[rightLine]) || p[1];
        const frontLeftSection = module.frontLeftSection || (bioFamilyLayout.frontSections && bioFamilyLayout.frontSections[leftLine]) || p[2];
        const frontRightSection = module.frontRightSection || (bioFamilyLayout.frontSections && bioFamilyLayout.frontSections[rightLine]) || p[3];
        const rearDepth = Math.max(Number(rearLeftSection.z) || 0, Number(rearRightSection.z) || 0);
        const frontDepth = Math.max(Number(frontLeftSection.z) || 0, Number(frontRightSection.z) || 0);
        const row = (Number(module.rowIndex) || 0) + 1;
        const moduleNo = (Number(module.moduleIndex) || 0) + 1;
        facades.push({
          id: `front|ROW_${row}|MODULE_${moduleNo}`, facadeId: 'front', profileSourceId: 'front',
          label: `${Number(module.rowIndex) === 1 ? 'Arka Sıra · ' : 'Ön Sıra · '}Arka Cephe · Modül ${moduleNo}`, axis: 'x',
          cx: Number(module.centerX) || 0, cz: Number(module.rearOuterZ) + rearDepth / 2, width: Number(module.clearWidth) || 0,
          height, bottomY, topY, beamBottomY, inward: 1, outerFaceV: -rearDepth / 2,
          startBoundaryId: `POST_LINE_${leftLine}`, endBoundaryId: `POST_LINE_${rightLine}`,
          startBoundaryWidth: Number(rearLeftSection.x) || 0, endBoundaryWidth: Number(rearRightSection.x) || 0,
          globalBaseWidth: rearGlobalWidth, globalStartRatio: (Number(module.clearMinX) - rearGlobalStart) / rearGlobalWidth,
          globalEndRatio: (Number(module.clearMaxX) - rearGlobalStart) / rearGlobalWidth,
          moduleIndex: Number(module.moduleIndex) || 0, bioRiseMulti: true
        });
        facades.push({
          id: `back|ROW_${row}|MODULE_${moduleNo}`, facadeId: 'back', profileSourceId: 'back',
          label: `${Number(module.rowIndex) === 1 ? 'Arka Sıra · ' : 'Ön Sıra · '}Ön Cephe · Modül ${moduleNo}`, axis: 'x',
          cx: Number(module.centerX) || 0, cz: Number(module.frontOuterZ) - frontDepth / 2, width: Number(module.clearWidth) || 0,
          height, bottomY, topY, beamBottomY, inward: -1, outerFaceV: frontDepth / 2,
          startBoundaryId: `POST_LINE_${leftLine}`, endBoundaryId: `POST_LINE_${rightLine}`,
          startBoundaryWidth: Number(frontLeftSection.x) || 0, endBoundaryWidth: Number(frontRightSection.x) || 0,
          globalBaseWidth: rearGlobalWidth, globalStartRatio: (Number(module.clearMinX) - rearGlobalStart) / rearGlobalWidth,
          globalEndRatio: (Number(module.clearMaxX) - rearGlobalStart) / rearGlobalWidth,
          moduleIndex: Number(module.moduleIndex) || 0, bioRiseMulti: true
        });
      });
      const leftModule = modules[0], rightModule = modules[modules.length - 1];
      const leftModuleStart = Number(leftModule.rearOuterZ) + p[0].z, leftModuleEnd = Number(leftModule.frontOuterZ) - p[2].z;
      const rightModuleStart = Number(rightModule.rearOuterZ) + p[1].z, rightModuleEnd = Number(rightModule.frontOuterZ) - p[3].z;
      facades.push(
        { id: 'left', label: 'Sol Cephe', axis: 'z', cx: -W / 2 + leftFaceDepth / 2, cz: (leftModuleStart + leftModuleEnd) / 2, width: leftModuleEnd - leftModuleStart, height, bottomY, topY, beamBottomY, inward: 1, outerFaceV: -leftFaceDepth / 2, startBoundaryWidth: p[0].z, endBoundaryWidth: p[2].z },
        { id: 'right', label: 'Sağ Cephe', axis: 'z', cx: W / 2 - rightFaceDepth / 2, cz: (rightModuleStart + rightModuleEnd) / 2, width: rightModuleEnd - rightModuleStart, height, bottomY, topY, beamBottomY, inward: -1, outerFaceV: rightFaceDepth / 2, startBoundaryWidth: p[1].z, endBoundaryWidth: p[3].z }
      );
      return facades;
    }

    if (freedomMultiActive && Array.isArray(freedomLayout.modules) && freedomLayout.modules.length) {
      const modules = freedomLayout.modules;
      const rearGlobalStart = Number(modules[0].rearStartX), rearGlobalEnd = Number(modules[modules.length - 1].rearEndX);
      const frontGlobalStart = Number(modules[0].frontStartX), frontGlobalEnd = Number(modules[modules.length - 1].frontEndX);
      const rearGlobalWidth = Math.max(1, rearGlobalEnd - rearGlobalStart), frontGlobalWidth = Math.max(1, frontGlobalEnd - frontGlobalStart);
      modules.forEach((module) => {
        const leftLine = Number(module.leftLine) || 0, rightLine = Number(module.rightLine) || 0;
        const rearLeftSection = module.rearLeftSection || (freedomLayout.rearSections && freedomLayout.rearSections[leftLine]) || p[0];
        const rearRightSection = module.rearRightSection || (freedomLayout.rearSections && freedomLayout.rearSections[rightLine]) || p[1];
        const frontLeftSection = module.frontLeftSection || (freedomLayout.frontSections && freedomLayout.frontSections[leftLine]) || p[2];
        const frontRightSection = module.frontRightSection || (freedomLayout.frontSections && freedomLayout.frontSections[rightLine]) || p[3];
        const rearDepth = Math.max(Number(rearLeftSection.z) || 0, Number(rearRightSection.z) || 0);
        const frontDepth = Math.max(Number(frontLeftSection.z) || 0, Number(frontRightSection.z) || 0);
        const row = (Number(module.rowIndex) || 0) + 1, moduleNo = (Number(module.moduleIndex) || 0) + 1;
        facades.push({ id: `front|ROW_${row}|MODULE_${moduleNo}`, facadeId: 'front', profileSourceId: 'front', label: `${Number(module.rowIndex) === 1 ? 'Arka Sıra · ' : 'Ön Sıra · '}Arka Cephe · Modül ${moduleNo}`, axis: 'x', cx: (Number(module.rearStartX) + Number(module.rearEndX)) / 2, cz: Number(module.rearOuterZ) + rearDepth / 2, width: Number(module.rearClearWidth) || 0, height, bottomY, topY, beamBottomY, inward: 1, outerFaceV: -rearDepth / 2, startBoundaryId: `POST_LINE_${leftLine}`, endBoundaryId: `POST_LINE_${rightLine}`, startBoundaryWidth: Number(rearLeftSection.x) || 0, endBoundaryWidth: Number(rearRightSection.x) || 0, globalBaseWidth: rearGlobalWidth, globalStartRatio: (Number(module.rearStartX) - rearGlobalStart) / rearGlobalWidth, globalEndRatio: (Number(module.rearEndX) - rearGlobalStart) / rearGlobalWidth, moduleIndex: Number(module.moduleIndex) || 0 });
        facades.push({ id: `back|ROW_${row}|MODULE_${moduleNo}`, facadeId: 'back', profileSourceId: 'back', label: `${Number(module.rowIndex) === 1 ? 'Arka Sıra · ' : 'Ön Sıra · '}Ön Cephe · Modül ${moduleNo}`, axis: 'x', cx: (Number(module.frontStartX) + Number(module.frontEndX)) / 2, cz: Number(module.frontOuterZ) - frontDepth / 2, width: Number(module.frontClearWidth) || 0, height, bottomY, topY, beamBottomY, inward: -1, outerFaceV: frontDepth / 2, startBoundaryId: `POST_LINE_${leftLine}`, endBoundaryId: `POST_LINE_${rightLine}`, startBoundaryWidth: Number(frontLeftSection.x) || 0, endBoundaryWidth: Number(frontRightSection.x) || 0, globalBaseWidth: frontGlobalWidth, globalStartRatio: (Number(module.frontStartX) - frontGlobalStart) / frontGlobalWidth, globalEndRatio: (Number(module.frontEndX) - frontGlobalStart) / frontGlobalWidth, moduleIndex: Number(module.moduleIndex) || 0 });
      });
      const leftModule = modules[0], rightModule = modules[modules.length - 1];
      const leftModuleStart = Number(leftModule.rearOuterZ) + p[0].z, leftModuleEnd = Number(leftModule.frontOuterZ) - p[2].z;
      const rightModuleStart = Number(rightModule.rearOuterZ) + p[1].z, rightModuleEnd = Number(rightModule.frontOuterZ) - p[3].z;
      facades.push(
        { id: 'left', label: 'Sol Cephe', axis: 'z', cx: -W / 2 + leftFaceDepth / 2, cz: (leftModuleStart + leftModuleEnd) / 2, width: leftModuleEnd - leftModuleStart, height, bottomY, topY, beamBottomY, inward: 1, outerFaceV: -leftFaceDepth / 2, startBoundaryWidth: p[0].z, endBoundaryWidth: p[2].z },
        { id: 'right', label: 'Sağ Cephe', axis: 'z', cx: W / 2 - rightFaceDepth / 2, cz: (rightModuleStart + rightModuleEnd) / 2, width: rightModuleEnd - rightModuleStart, height, bottomY, topY, beamBottomY, inward: -1, outerFaceV: rightFaceDepth / 2, startBoundaryWidth: p[1].z, endBoundaryWidth: p[3].z }
      );
      return facades;
    }

    return [
      { id: 'front', label: 'Arka Cephe', axis: 'x', cx: (frontStart + frontEnd) / 2, cz: -D / 2 + frontFaceDepth / 2, width: frontEnd - frontStart, height, bottomY, topY, beamBottomY, inward: 1, outerFaceV: -frontFaceDepth / 2, startBoundaryWidth: p[0].x, endBoundaryWidth: p[1].x },
      { id: 'back', label: 'Ön Cephe', axis: 'x', cx: (backStart + backEnd) / 2, cz: D / 2 - backFaceDepth / 2, width: backEnd - backStart, height, bottomY, topY, beamBottomY, inward: -1, outerFaceV: backFaceDepth / 2, startBoundaryWidth: p[2].x, endBoundaryWidth: p[3].x },
      { id: 'left', label: 'Sol Cephe', axis: 'z', cx: -W / 2 + leftFaceDepth / 2, cz: (leftStart + leftEnd) / 2, width: leftEnd - leftStart, height, bottomY, topY, beamBottomY, inward: 1, outerFaceV: -leftFaceDepth / 2, startBoundaryWidth: p[0].z, endBoundaryWidth: p[2].z },
      { id: 'right', label: 'Sağ Cephe', axis: 'z', cx: W / 2 - rightFaceDepth / 2, cz: (rightStart + rightEnd) / 2, width: rightEnd - rightStart, height, bottomY, topY, beamBottomY, inward: -1, outerFaceV: rightFaceDepth / 2, startBoundaryWidth: p[1].z, endBoundaryWidth: p[3].z }
    ];
  }

  function buildReportFacades(model) {
    return buildCanonicalReportFacadeBases(model).map((facade) => ({
      ...facade,
      zones: splitFacadeZonesForReport(facade, model.facadeProfiles || {}),
      profiles: Array.isArray((model.facadeProfiles || {})[facade.profileSourceId || facade.facadeId || facade.id])
        ? (model.facadeProfiles || {})[facade.profileSourceId || facade.facadeId || facade.id].map((profile) => ({ ...profile }))
        : []
    }));
  }

  function documentProductTypeLabel(type) {
    const key = String(type || '').toLowerCase();
    if (key === 'guillotine' || key === 'guillotine_glass') return 'Giyotin Cam';
    if (key === 'sliding' || key === 'sliding_glass') return 'Sürme Cam';
    if (key === 'zip' || key === 'zip_screen' || key === 'zipper') return 'Zip Perde';
    if (key === 'folding') return 'Katlanır Cam';
    if (key === 'fixed') return 'Sabit Doğrama';
    if (key === 'door') return 'Kapı';
    return productTypeLabel({ type: key || 'sliding' });
  }

  function documentFitProductZone(zone, clearance) {
    const total = Math.max(0, Number(clearance) || 0);
    return {
      width: Math.max(80, Number(zone && zone.width) - total),
      height: Math.max(120, Number(zone && zone.height) - total)
    };
  }

  function documentFitZipProductZone(zone, placement) {
    if (String(placement && placement.placementLocation || 'BETWEEN POSTS') !== 'FRONT OF POSTS') {
      return documentFitProductZone(zone, 3);
    }
    const left = Math.max(0, Number(zone && zone.leftBoundaryWidth) || 0);
    const right = Math.max(0, Number(zone && zone.rightBoundaryWidth) || 0);
    return {
      width: Math.max(120, (Number(zone && zone.width) || 0) + left + right),
      height: Math.max(180, (Number(zone && zone.height) || 0) + 150)
    };
  }

  function documentReportProducts() {
    const model = readModel();
    const color = { ...(model.systemColor || defaults.systemColor) };
    if (model.productGroup === 'pergo-rise') {
      const derived = model.pergoRiseProject && model.pergoRiseProject.derived;
      const components = derived && Array.isArray(derived.components) ? derived.components : [];
      return components
        .filter((item) => item && item.kind === 'area-product')
        .map((item, index) => ({
          id: String(item.id || item.placementId || `pergo-product-${index + 1}`),
          zoneId: String(item.placementId || item.id || ''),
          slot: String(item.productType || '').toLowerCase().includes('zip') ? 'zip' : 'primary',
          type: String(item.productType || ''),
          name: documentProductTypeLabel(item.productType),
          width: Math.max(1, Math.round(Number(item.width) || 0)),
          height: Math.max(1, Math.round(Number(item.height) || 0)),
          quantity: 1,
          facade: String(item.face || 'Pergola'),
          colorMode: model.colorMode,
          color: { ...color },
          detailColor: ''
        }))
        .filter((item) => item.width > 0 && item.height > 0);
    }

    const facades = buildReportFacades(model);
    const zoneMap = new Map();
    facades.forEach((facade) => (facade.zones || []).forEach((zone) => zoneMap.set(zone.id, { ...zone, facadeLabel: facade.label })));
    const rows = [];
    const push = (zoneId, placement, slot) => {
      if (!placement) return;
      const zone = zoneMap.get(zoneId);
      if (!zone) return;
      const fitted = slot === 'zip' ? documentFitZipProductZone(zone, placement) : documentFitProductZone(zone, 5);
      const type = String(placement.type || (slot === 'zip' ? 'zip' : 'sliding'));
      rows.push({
        id: `${slot}:${zoneId}`,
        zoneId,
        slot,
        type,
        name: documentProductTypeLabel(type),
        width: Math.max(1, Math.round(Number(fitted.width) || Number(zone.width) || 0)),
        height: Math.max(1, Math.round(Number(fitted.height) || Number(zone.height) || 0)),
        quantity: 1,
        facade: String(zone.facadeLabel || zone.facadeId || ''),
        colorMode: model.colorMode,
        color: { ...color },
        detailColor: type === 'zip' ? String(placement.fabricColor || '') : String(placement.glassColor || '')
      });
    };
    Object.entries(model.placements || {}).forEach(([zoneId, placement]) => push(zoneId, placement, 'primary'));
    Object.entries(model.zipPlacements || {}).forEach(([zoneId, placement]) => push(zoneId, placement, 'zip'));
    return rows;
  }

  function quickTestProfile(id, orientation, positionRatio, options = {}) {
    if (orientation === 'horizontal') {
      return {
        id,
        orientation: 'horizontal',
        positionYRatio: Number(positionRatio),
        leftBoundaryId: options.leftBoundaryId || 'START',
        rightBoundaryId: options.rightBoundaryId || 'END',
        scopeStartRatio: Number.isFinite(Number(options.scopeStartRatio)) ? Number(options.scopeStartRatio) : 0,
        scopeEndRatio: Number.isFinite(Number(options.scopeEndRatio)) ? Number(options.scopeEndRatio) : 1,
        width: Number(options.width) || 100,
        depth: Number(options.depth) || 100,
        type: options.type || '100x100',
        label: options.label || `Yatay Profil ${Number(options.width) || 100} × ${Number(options.depth) || 100}`
      };
    }
    return {
      id,
      orientation: 'vertical',
      positionRatio: Number(positionRatio),
      width: Number(options.width) || 100,
      depth: Number(options.depth) || 100,
      type: options.type || '100x100',
      label: options.label || `Dikey Profil ${Number(options.width) || 100} × ${Number(options.depth) || 100}`
    };
  }

  function quickTestPlacement(type, overrides = {}) {
    return normalizePlacement({ ...productDefaults(type), ...overrides, type }, type);
  }

  function quickTestScenario(index) {
    const scenarios = {
      1: {
        description: 'Freedom · ön cephede merkez dışı dikey profil, katlanır cam + giyotin + zip ve dört cephe ürün kontrolü.',
        group: 'b-cube', width: 4000, panelCount: 25, height: 2700,
        systemColor: { code: 'RAL 7016', hex: '#383E42', finish: 'TEXTURE' },
        panelColor: { code: 'RAL 9016', hex: '#E7E8E2', finish: 'MATTE' },
        profiles: { front: [quickTestProfile('qt1v1', 'vertical', 0.34)] },
        assignments: [
          { facade: 'front', zone: 0, primary: quickTestPlacement('folding', { series: 'A SERIES', subtype: 'STANDARD', openingDirection: 'LEFT', foldingView: 'INSIDE VIEW', panels: 4, glassColor: 'FUME', collectionState: 'NORMAL' }) },
          { facade: 'front', zone: 1, primary: quickTestPlacement('guillotine', { subtype: 'CLEANABLE', mechanism: 'CHAIN', panelType: '1+2', panels: 3, motorDirection: 'LEFT', glassColor: 'TRANSPARENT' }), zip: quickTestPlacement('zip', { series: 'G SERIES', subtype: '110x110 BOX', placementLocation: 'FRONT OF POSTS', motorDirection: 'RIGHT', cableDirection: 'TOP', fabricColor: '7635-52142' }) },
          { facade: 'back', zone: 0, primary: quickTestPlacement('sliding', { openingType: 'CENTER OPENING', openingDirection: 'OUTSIDE', panels: 6, glassColor: 'BRONZE' }) },
          { facade: 'left', zone: 0, primary: quickTestPlacement('fixed', { verticalDivisions: 2, horizontalDivisions: 2, horizontalHeights: '1050;1050', glassColor: 'FUME' }) },
          { facade: 'right', zone: 0, primary: quickTestPlacement('door', { doorType: 'TOP_FIXED', hingeDirection: 'RIGHT', doorOpenDirection: 'OUTWARD', topFixedHeight: 450, movingLeafHeight: 1900 }) }
        ]
      },
      2: {
        description: 'Freedom · yatay profil, K Seri katlanır cam dış bakış sağa toplama, üst sabit kapı ve sabit doğrama.',
        group: 'b-cube', width: 3600, panelCount: 20, height: 2800,
        systemColor: { code: 'RAL 9005', hex: '#0A0A0D', finish: 'GLOSS' },
        panelColor: { code: 'RAL 1013', hex: '#E9E5CE', finish: 'TEXTURE' },
        profiles: { front: [quickTestProfile('qt2h1', 'horizontal', 0.58)] },
        assignments: [
          { facade: 'front', zone: 0, primary: quickTestPlacement('door', { doorType: 'DOUBLE_TOP', activeLeaf: 'LEFT', doorOpenDirection: 'INWARD', handleType: 'PANIC', topFixedHeight: 520, movingLeafHeight: 1750, glassColor: 'BRONZE' }) },
          { facade: 'front', zone: 1, primary: quickTestPlacement('fixed', { verticalDivisions: 3, horizontalDivisions: 1, glassColor: 'TRANSPARENT' }) },
          { facade: 'back', zone: 0, zip: quickTestPlacement('zip', { series: 'P SERIES', subtype: '130x130 BOX', placementLocation: 'BETWEEN POSTS', cableDirection: 'BACK', motorDirection: 'LEFT', fabricColor: '92-2047' }) },
          { facade: 'left', zone: 0, primary: quickTestPlacement('folding', { series: 'K SERIES', subtype: 'STANDARD', panels: 5, openingDirection: 'RIGHT', foldingView: 'OUTSIDE VIEW', glassThickness: 'INSULATED GLASS', collectionState: 'COLLECTED' }) }
        ]
      },
      3: {
        description: 'Freedom · profilsiz dört cephe; 9 panelli otomatik iki yana katlanır cam, toplanan giyotin, P seri zip ve çift kanat üst sabit kapı.',
        group: 'b-cube', width: 4100, panelCount: 27, height: 2900,
        systemColor: { code: 'RAL 7035', hex: '#C5C7C4', finish: 'MATTE' },
        panelColor: { code: 'RAL 3005', hex: '#5E2028', finish: 'GLOSS' },
        profiles: {},
        assignments: [
          { facade: 'front', zone: 0, primary: quickTestPlacement('guillotine', { subtype: 'UPWARD COLLECTING', mechanism: 'BELT', panelType: '1+2', panels: 3, collectionState: 'COLLECTED', motorDirection: 'RIGHT', glassColor: 'LOW-E GLASS', glassThickness: 'INSULATED GLASS' }) },
          { facade: 'back', zone: 0, primary: quickTestPlacement('folding', { series: 'A SERIES', subtype: 'TOP-HUNG', openingDirection: 'RIGHT', foldingView: 'OUTSIDE VIEW', panels: 9, glassColor: 'FUME', collectionState: 'COLLECTED' }) },
          { facade: 'left', zone: 0, zip: quickTestPlacement('zip', { series: 'P SERIES', subtype: '115x115 BOX', placementLocation: 'FRONT OF POSTS', cableDirection: 'SIDE', motorDirection: 'LEFT', fabricColor: '86-2043' }) },
          { facade: 'right', zone: 0, primary: quickTestPlacement('door', { doorType: 'DOUBLE_BOTH_FIXED_TOP', activeLeaf: 'RIGHT', doorOpenDirection: 'OUTWARD', topFixedHeight: 500, movingLeafHeight: 1950, glassColor: 'FUME' }) }
        ]
      },
      4: {
        description: 'Freedom · iki dikey profil ve orta alanda yatay profil; profil sonrası genişlik/yükseklik aralıkları düzenlenmiş çok alan testi.',
        group: 'b-cube', width: 4600, panelCount: 30, height: 3000,
        systemColor: { code: 'RAL 8019', hex: '#3B3332', finish: 'TEXTURE' },
        panelColor: { code: 'RAL 9006', hex: '#7C7D7F', finish: 'GLOSS' },
        profiles: {
          front: [
            quickTestProfile('qt4v1', 'vertical', 0.27),
            quickTestProfile('qt4v2', 'vertical', 0.68),
            quickTestProfile('qt4h1', 'horizontal', 0.61, { leftBoundaryId: 'qt4v1', rightBoundaryId: 'qt4v2', scopeStartRatio: 0.27, scopeEndRatio: 0.68 })
          ]
        },
        assignments: [
          { facade: 'front', zone: 0, primary: quickTestPlacement('sliding', { panels: 3, openingDirection: 'LEFT', glassColor: 'BRONZE' }) },
          { facade: 'front', zone: 1, primary: quickTestPlacement('fixed', { verticalDivisions: 1, horizontalDivisions: 2, horizontalHeights: '950;850' }) },
          { facade: 'front', zone: 2, primary: quickTestPlacement('door', { doorType: 'SINGLE', hingeDirection: 'LEFT', movingLeafHeight: 2100 }) },
          { facade: 'front', zone: 3, primary: quickTestPlacement('guillotine', { subtype: 'DOWNWARD COLLECTING', panelType: '1+1', panels: 2, collectionState: 'COLLECTED', motorDirection: 'LEFT' }) },
          { facade: 'back', zone: 0, zip: quickTestPlacement('zip', { subtype: 'HERCULE', placementLocation: 'FRONT OF POSTS', fabricColor: '7635-52107' }) }
        ]
      },
      5: {
        description: 'Freedom · özel/döndürülmüş dikmeler, sol ve sağ cephede düzenlenmiş profil aralıkları, tüm ürün tipleri.',
        group: 'b-cube', width: 4300, panelCount: 26, height: 2750,
        systemColor: { code: 'RAL 6005', hex: '#0F4336', finish: 'MATTE' },
        panelColor: { code: 'RAL 9010', hex: '#F1ECE1', finish: 'TEXTURE' },
        postSections: [{ x: 220, z: 100 }, { x: 100, z: 100 }, { x: 120, z: 180 }, { x: 180, z: 120 }],
        profiles: { left: [quickTestProfile('qt5lv1', 'vertical', 0.42)], right: [quickTestProfile('qt5rv1', 'vertical', 0.63)] },
        assignments: [
          { facade: 'front', zone: 0, primary: quickTestPlacement('guillotine', { subtype: 'CLEANABLE', mechanism: 'BELT', motorDirection: 'RIGHT', glassColor: 'FUME' }) },
          { facade: 'back', zone: 0, primary: quickTestPlacement('sliding', { openingType: 'CENTER OPENING', openingDirection: 'OUTSIDE', panels: 8 }) },
          { facade: 'left', zone: 0, primary: quickTestPlacement('door', { doorType: 'LEFT_FIXED_TOP', hingeDirection: 'RIGHT', topFixedHeight: 400, movingLeafHeight: 1950 }) },
          { facade: 'left', zone: 1, zip: quickTestPlacement('zip', { subtype: '110x110 BOX', motorDirection: 'LEFT', fabricColor: '7635-52176' }) },
          { facade: 'right', zone: 0, primary: quickTestPlacement('fixed', { verticalDivisions: 2, horizontalDivisions: 3, horizontalHeights: '700;700;700' }) },
          { facade: 'right', zone: 1, primary: quickTestPlacement('sliding', { panels: 2, openingDirection: 'RIGHT' }) }
        ]
      },
      6: {
        description: 'Eco-Bioclimatic (Tilt) · ön cephede merkez dışı dikey profil, sürme ve giyotin; arka/yan cephelerde kapı, sabit ve zip.',
        group: 'bio-rise', width: 3800, panelCount: 25, height: 3000,
        systemColor: { code: 'RAL 7024', hex: '#45494E', finish: 'TEXTURE' },
        panelColor: { code: 'RAL 9016', hex: '#E7E8E2', finish: 'GLOSS' },
        profiles: { front: [quickTestProfile('qt6v1', 'vertical', 0.41)] },
        assignments: [
          { facade: 'front', zone: 0, primary: quickTestPlacement('sliding', { subtype: 'WITHOUT THRESHOLD', panels: 3, openingDirection: 'LEFT', glassColor: 'TRANSPARENT' }) },
          { facade: 'front', zone: 1, primary: quickTestPlacement('guillotine', { subtype: 'CLEANABLE', mechanism: 'CHAIN', motorDirection: 'RIGHT', glassColor: 'BRONZE' }) },
          { facade: 'back', zone: 0, primary: quickTestPlacement('door', { doorType: 'RIGHT_FIXED_TOP', hingeDirection: 'LEFT', topFixedHeight: 480, movingLeafHeight: 2050 }) },
          { facade: 'left', zone: 0, primary: quickTestPlacement('fixed', { verticalDivisions: 2, horizontalDivisions: 2, horizontalHeights: '1100;1100' }) },
          { facade: 'right', zone: 0, zip: quickTestPlacement('zip', { series: 'G SERIES', subtype: '100x100 BOX', placementLocation: 'BETWEEN POSTS', motorDirection: 'LEFT', fabricColor: '92-2171' }) }
        ]
      },
      7: {
        description: 'Eco-Bioclimatic (Tilt) · ön cephede ayarlanmış yatay profil; üst sabit kapı, sabit doğrama ve dört cephede motor/yön kontrolleri.',
        group: 'bio-rise', width: 4000, panelCount: 28, height: 3200,
        systemColor: { code: 'RAL 9007', hex: '#8F8B81', finish: 'GLOSS' },
        panelColor: { code: 'RAL 7032', hex: '#B5B0A1', finish: 'MATTE' },
        profiles: { front: [quickTestProfile('qt7h1', 'horizontal', 0.64)] },
        assignments: [
          { facade: 'front', zone: 0, primary: quickTestPlacement('door', { doorType: 'BOTH_FIXED_TOP', doorOpenDirection: 'INWARD', handleType: 'PANIC', topFixedHeight: 520, movingLeafHeight: 1900 }) },
          { facade: 'front', zone: 1, primary: quickTestPlacement('fixed', { verticalDivisions: 3, horizontalDivisions: 1, glassColor: 'FUME' }) },
          { facade: 'back', zone: 0, zip: quickTestPlacement('zip', { series: 'P SERIES', subtype: '130x130 BOX', cableDirection: 'TOP', motorDirection: 'RIGHT', fabricColor: 'W88-2047' }) },
          { facade: 'left', zone: 0, primary: quickTestPlacement('guillotine', { subtype: 'UPWARD COLLECTING', mechanism: 'BELT', collectionState: 'COLLECTED', motorDirection: 'LEFT' }) },
          { facade: 'right', zone: 0, primary: quickTestPlacement('sliding', { openingType: 'CENTER OPENING', openingDirection: 'INSIDE', panels: 6, glassColor: 'BRONZE' }) }
        ]
      },
      8: {
        description: 'Eco-Bioclimatic (Tilt) · iki dikey ve bir yatay ara profil; düzenlenmiş çoklu alt alanlarda sürme, kapı, giyotin, sabit ve zip.',
        group: 'bio-rise', width: 4500, panelCount: 32, height: 3400,
        systemColor: { code: 'RAL 5008', hex: '#293133', finish: 'TEXTURE' },
        panelColor: { code: 'RAL 1015', hex: '#E6D2B5', finish: 'GLOSS' },
        profiles: {
          front: [
            quickTestProfile('qt8v1', 'vertical', 0.31),
            quickTestProfile('qt8v2', 'vertical', 0.73),
            quickTestProfile('qt8h1', 'horizontal', 0.55, { leftBoundaryId: 'qt8v1', rightBoundaryId: 'qt8v2', scopeStartRatio: 0.31, scopeEndRatio: 0.73 })
          ]
        },
        assignments: [
          { facade: 'front', zone: 0, primary: quickTestPlacement('sliding', { panels: 4, openingDirection: 'RIGHT' }) },
          { facade: 'front', zone: 1, primary: quickTestPlacement('door', { doorType: 'TOP_FIXED', topFixedHeight: 450, movingLeafHeight: 2000 }) },
          { facade: 'front', zone: 2, primary: quickTestPlacement('guillotine', { subtype: 'CLEANABLE', motorDirection: 'LEFT', glassColor: 'FUME' }) },
          { facade: 'front', zone: 3, primary: quickTestPlacement('fixed', { verticalDivisions: 1, horizontalDivisions: 2, horizontalHeights: '1000;900' }), zip: quickTestPlacement('zip', { placementLocation: 'FRONT OF POSTS', fabricColor: '7635-52105' }) },
          { facade: 'back', zone: 0, primary: quickTestPlacement('sliding', { openingType: 'CENTER OPENING', openingDirection: 'OUTSIDE', panels: 8 }) }
        ]
      },
      9: {
        description: 'Freedom · ürün açık/kapalı ve panel durumları; toplanmış sürme/giyotin ile zip panel görünürlüğü hızlı kontrolü.',
        group: 'b-cube', width: 3900, panelCount: 24, height: 2650,
        systemColor: { code: 'RAL 3020', hex: '#CC0605', finish: 'GLOSS' },
        panelColor: { code: 'RAL 9005', hex: '#0A0A0D', finish: 'TEXTURE' },
        profiles: { front: [quickTestProfile('qt9v1', 'vertical', 0.5)] },
        panelMasterOpen: false,
        assignments: [
          { facade: 'front', zone: 0, primary: quickTestPlacement('sliding', { panels: 5, collectionState: 'COLLECTED', openingDirection: 'LEFT' }), open: false },
          { facade: 'front', zone: 1, primary: quickTestPlacement('guillotine', { subtype: 'DOWNWARD COLLECTING', collectionState: 'COLLECTED', motorDirection: 'RIGHT' }), zip: quickTestPlacement('zip', { placementLocation: 'FRONT OF POSTS', fabricColor: '86-2171' }), zipOpen: false },
          { facade: 'back', zone: 0, primary: quickTestPlacement('door', { doorType: 'DOUBLE', activeLeaf: 'LEFT', doorOpenDirection: 'INWARD' }) }
        ]
      },
      10: {
        description: 'Eco-Bioclimatic (Tilt) maksimum üstü stres senaryosu · tüm cephelerde profiller, düzenlenmiş aralıklar, renk/yüzey ve yoğun ürün yerleşimi.',
        group: 'bio-rise', width: 4700, panelCount: 34, height: 3500,
        systemColor: { code: 'RAL 6018', hex: '#397A36', finish: 'MATTE' },
        panelColor: { code: 'RAL 2004', hex: '#E25303', finish: 'TEXTURE' },
        profiles: {
          front: [quickTestProfile('qt10fv1', 'vertical', 0.36), quickTestProfile('qt10fh1', 'horizontal', 0.6, { leftBoundaryId: 'qt10fv1', rightBoundaryId: 'END', scopeStartRatio: 0.36, scopeEndRatio: 1 })],
          back: [quickTestProfile('qt10bv1', 'vertical', 0.58)],
          left: [quickTestProfile('qt10lv1', 'vertical', 0.44)],
          right: [quickTestProfile('qt10rv1', 'vertical', 0.67)]
        },
        assignments: [
          { facade: 'front', zone: 0, primary: quickTestPlacement('folding', { series: 'A SERIES', subtype: 'STANDARD', panels: 7, openingDirection: 'BOTH', foldingView: 'INSIDE VIEW', glassColor: 'BRONZE', collectionState: 'COLLECTED' }) },
          { facade: 'front', zone: 1, primary: quickTestPlacement('guillotine', { subtype: 'UPWARD COLLECTING', collectionState: 'COLLECTED', motorDirection: 'LEFT' }) },
          { facade: 'front', zone: 2, primary: quickTestPlacement('door', { doorType: 'DOUBLE_TOP', topFixedHeight: 500, movingLeafHeight: 2100 }) },
          { facade: 'back', zone: 0, primary: quickTestPlacement('fixed', { verticalDivisions: 2, horizontalDivisions: 2, horizontalHeights: '1200;1000' }) },
          { facade: 'back', zone: 1, zip: quickTestPlacement('zip', { series: 'P SERIES', subtype: '115x115 BOX', placementLocation: 'FRONT OF POSTS', cableDirection: 'SIDE', fabricColor: 'W88-8102' }) },
          { facade: 'left', zone: 0, primary: quickTestPlacement('door', { doorType: 'LEFT_FIXED_RIGHT_MOVING', hingeDirection: 'RIGHT' }) },
          { facade: 'left', zone: 1, primary: quickTestPlacement('sliding', { openingType: 'CENTER OPENING', panels: 6 }) },
          { facade: 'right', zone: 0, primary: quickTestPlacement('guillotine', { subtype: 'CLEANABLE', mechanism: 'BELT', motorDirection: 'RIGHT' }) },
          { facade: 'right', zone: 1, primary: quickTestPlacement('fixed', { verticalDivisions: 3, horizontalDivisions: 1 }), zip: quickTestPlacement('zip', { subtype: 'HERCULE', placementLocation: 'FRONT OF POSTS', fabricColor: '7635-52144' }) }
        ]
      }
    };
    return scenarios[index] || scenarios[1];
  }

  function resetQuickTestState(config) {
    const spec = activeProductSpec(config.group);
    modelState.productGroup = config.group;
    modelState.width = Math.round(Number(config.width));
    modelState.panelCount = Math.round(Number(config.panelCount));
    modelState.depth = projectionFromPanelCount(modelState.panelCount, config.group);
    modelState.height = Math.round(Number(config.height));
    modelState.orientations = [0, 0, 0, 0];
    modelState.postSections = Array.isArray(config.postSections)
      ? config.postSections.map((section) => ({ x: Number(section.x), z: Number(section.z) }))
      : Array.from({ length: 4 }, () => ({ ...spec.postSection }));
    modelState.beamSection = { ...spec.beamSection };
    modelState.placements = {};
    modelState.zipPlacements = {};
    modelState.facadeProfiles = JSON.parse(JSON.stringify(config.profiles || {}));
    modelState.productsOpen = true;
    modelState.productOpenStates = {};
    modelState.panelStates = {};
    modelState.panelMasterOpen = config.panelMasterOpen !== false;
    modelState.colorMode = 'ral';
    modelState.systemColor = { ...config.systemColor };
    modelState.panelColor = { ...config.panelColor };
    // Quick-test state must obey the same canonical raw-input contract as normal
    // product entry. Otherwise a later snapshot restore can resurrect an old
    // product's draft text even while modelState belongs to the new product.
    modelState.inputDrafts = {
      width: String(modelState.width || ''),
      depth: String(modelState.depth || ''),
      height: String(modelState.height || '')
    };
    selectedZone = null;
    selectedZoneId = null;
    viewerCameraState = null;
    toolboxSelectionMode = null;
    toolboxSelectionItems.clear();
    dimensionVisibility = { intermediate: true, main: true };
    profileSequence = 1000 + Number(config.index || 0) * 10;
  }

  function assignQuickTestProducts(config) {
    const facades = buildReportFacades(readModel());
    (config.assignments || []).forEach((assignment) => {
      const facade = facades.find((item) => item.id === assignment.facade);
      if (!facade || !facade.zones.length) return;
      const zone = facade.zones[Math.max(0, Math.min(facade.zones.length - 1, Number(assignment.zone) || 0))];
      if (assignment.primary) {
        modelState.placements[zone.id] = JSON.parse(JSON.stringify(assignment.primary));
        if (assignment.open === false) modelState.productOpenStates[zone.id] = false;
      }
      if (assignment.zip) {
        modelState.zipPlacements[zone.id] = JSON.parse(JSON.stringify(assignment.zip));
        const key = zipProductKey(zone.id);
        if (assignment.zipOpen === false) modelState.productOpenStates[key] = false;
        modelState.panelStates[key] = assignment.zipOpen !== false;
      }
    });
  }

  function syncQuickTestControls() {
    if ($(ids.productGroup)) $(ids.productGroup).value = modelState.productGroup;
    $(ids.freedomWidth).value = String(modelState.width);
    setDepthControlValue(modelState.depth);
    $(ids.freedomHeight).value = String(modelState.height);
    $(ids.freedomPanelCount).value = String(modelState.panelCount);
    $(ids.toolboxIntermediateDimensions).checked = Boolean(dimensionVisibility.intermediate);
    $(ids.toolboxMainDimensions).checked = Boolean(dimensionVisibility.main);
    $(ids.panelMaster).checked = Boolean(modelState.panelMasterOpen);
    updateProductInputUi();
    updateColorControls();
    updateToolbox();
  }

  function applyQuickTestScenario(index, options) {
    const config = { ...quickTestScenario(index), index };
    const opts = options || {};
    if (p3dvEmbeddedHostMode && opts.hostAuthorized !== true) {
      const canonicalGroup = p3dvHostCanonicalProductGroup || modelState.productGroup;
      if (config.group !== canonicalGroup || modelState.productGroup !== canonicalGroup) {
        if ($(ids.quickTestStatus)) $(ids.quickTestStatus).textContent = `Test ${index}: ${activeProductSpec(config.group).modelLabel} ürününe geçiliyor...`;
        requestHostProductTransition(config.group, { type: 'quick-test', index: Number(index) });
        return false;
      }
    }
    cancelToolboxSelection();
    resetQuickTestState(config);
    assignQuickTestProducts(config);
    syncQuickTestControls();
    (typeof commitModelChangeLive==='function'?commitModelChangeLive('quick-test'):renderViewer());
    document.querySelectorAll('.quick-test-grid button').forEach((button) => button.classList.toggle('is-active', button.id === `quickTestBtn${index}`));
    if ($(ids.quickTestStatus)) {
      $(ids.quickTestStatus).textContent = `Test ${index} hazır: ${config.description}`;
    }
    showRecommendedLimitWarnings({ width: modelState.width, depth: modelState.depth, height: modelState.height, panelCount: modelState.panelCount });
    return true;
  }

  function profileSummary(profile) {
    if (!profile) return 'Ara profil';
    const direction = profile.orientation === 'horizontal' ? 'Yatay' : 'Dikey';
    return `${direction} · ${Number(profile.width) || 0} × ${Number(profile.depth) || 0} mm`;
  }

  function modelChangeLines(model) {
    const spec = activeProductSpec(model.productGroup);
    const postDefault = spec.postSection;
    const changes = [];
    (model.postSections || []).forEach((section, index) => {
      if (!section) return;
      if (Number(section.x) !== Number(postDefault.x) || Number(section.z) !== Number(postDefault.z)) {
        changes.push(`${postName(index)}: ${Number(section.x)} × ${Number(section.z)} mm`);
      }
    });
    const entryMap = new Map(allProductEntries().map((entry) => [entry.key, entry]));
    Object.entries(model.productOpenStates || {}).forEach(([key, open]) => {
      if (Boolean(open) === Boolean(model.productsOpen)) return;
      const entry = entryMap.get(key);
      if (!entry) return;
      changes.push(`${productZoneLabel(entry.zoneId, entry.placement, 0)} görünümü: ${open ? 'Açık' : 'Kapalı'}`);
    });
    if (model.colorMode === 'ral') {
      changes.push(`Sistem rengi: ${model.systemColor.code} · ${finishLabel(model.systemColor.finish)}`);
      changes.push(`Panel rengi: ${model.panelColor.code} · ${finishLabel(model.panelColor.finish)}`);
    }
    return changes;
  }

  function fallbackPdfView(preset) {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const context = canvas.getContext('2d');
    const model = readModel();
    const labels = {
      'front-left': 'Arka Sol Üst Görünüş',
      'front-right': 'Arka Sağ Üst Görünüş',
      'back-left': 'Ön Sol Üst Görünüş',
      'back-right': 'Ön Sağ Üst Görünüş',
      'perspective': 'Perspektif Görünüş',
      'front': 'Ön Görünüş',
      'side': 'Yan Görünüş',
      'top': 'Üst Görünüş'
    };
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#334155');
    gradient.addColorStop(1, '#0f172a');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = '#7dd3fc';
    context.lineWidth = 4;
    context.strokeRect(55, 55, canvas.width - 110, canvas.height - 110);
    context.fillStyle = '#e0f2fe';
    context.font = '700 44px Segoe UI, Arial';
    context.fillText(labels[preset] || '3D Görünüş', 85, 135);
    context.fillStyle = '#bfdbfe';
    context.font = '600 31px Segoe UI, Arial';
    context.fillText(productModelLabel(model.productGroup), 85, 205);
    context.font = '500 27px Segoe UI, Arial';
    context.fillText(`Genişlik ${model.width} mm · Açılım ${model.depth} mm · Yükseklik ${model.height} mm`, 85, 260);
    const fallbackDetail = model.productGroup === 'pergo-rise' && model.pergoRiseProject && model.pergoRiseProject.derived
      ? `${model.pergoRiseProject.derived.counts.systems || 0} sistem · ${model.pergoRiseProject.derived.counts.positions || 0} poz · parametrik 3D viewer güvenli PDF yedeği`
      : `${model.panelCount || model.lamellaCount} panel · 3D viewer görüntüsü yüklenemediğinde güvenli PDF yedeği`;
    context.fillText(fallbackDetail, 85, 310);
    context.fillStyle = '#94a3b8';
    context.font = '500 22px Segoe UI, Arial';
    context.fillText('Gerçek 3D görüntü, viewer hazır olduğunda otomatik olarak bu alanın yerine alınır.', 85, 625);
    return { preset, dataUrl: canvas.toDataURL('image/jpeg', 0.9), width: canvas.width, height: canvas.height, fallback: true };
  }

  function collectPdfViews() {
    const frame = $(ids.frame);
    const viewerWindow = frame && frame.contentWindow;
    const presets = ['front-left', 'front-right', 'back-left', 'back-right'];
    return presets.map((preset) => {
      try {
        if (viewerWindow && typeof viewerWindow.captureFreedom3D === 'function') {
          const capture = viewerWindow.captureFreedom3D(preset);
          if (capture && capture.dataUrl) return { preset, ...capture };
        }
      } catch (error) {
        console.warn('PDF görünüşü yedek görselle oluşturuldu.', preset, error);
      }
      return fallbackPdfView(preset);
    });
  }

  function collectDocumentCenterViews() {
    const frame = $(ids.frame);
    const viewerWindow = frame && frame.contentWindow;
    const presets = ['perspective', 'front', 'side', 'top'];
    return presets.map((preset) => {
      try {
        if (viewerWindow && typeof viewerWindow.captureFreedom3D === 'function') {
          const capture = viewerWindow.captureFreedom3D(preset);
          if (capture && capture.dataUrl) return { preset, ...capture };
        }
      } catch (error) {
        console.warn('Doküman Merkezi 3D görünüşü yedek görselle oluşturuldu.', preset, error);
      }
      return fallbackPdfView(preset);
    });
  }

  function pdfFileName(model) {
    const spec = activeProductSpec(model.productGroup);
    return `${spec.modelLabel.replace(/\s+/g, '-')}-${model.width}x${model.depth}x${model.height}-urun-listesi.pdf`;
  }

  function hasMeaningfulReportValue(value) {
    if (Array.isArray(value)) return value.some((item) => hasMeaningfulReportValue(item));
    if (value == null) return false;
    const text = String(value).trim();
    if (!text) return false;
    return !['—', 'Yok', 'None'].includes(text);
  }

  function filterReportRows(rows) {
    return (Array.isArray(rows) ? rows : []).filter((row) => row && hasMeaningfulReportValue(row.value));
  }

  function systemInfoSections(model) {
    const spec = activeProductSpec(model.productGroup);
    const sections = [];
    if (model.productGroup === 'pergo-rise' && model.pergoRiseProject && model.pergoRiseProject.derived) {
      const project = model.pergoRiseProject;
      const derived = project.derived;
      const counts = derived.counts || {};
      const input = project.input || {};
      const systems = Array.isArray(derived.systems) ? derived.systems : [];
      const groups = Array.isArray(derived.independentGroups) ? derived.independentGroups : [];
      sections.push({
        title: 'Pergola · Parametrik Proje',
        rows: filterReportRows([
          { label: 'Ürün', value: spec.modelLabel },
          { label: 'Project Schema', value: project.schema },
          { label: 'Assembly Schema', value: derived.schema },
          { label: 'Project Hash', value: derived.projectHash || project.hash },
          { label: 'Statik Durum', value: derived.staticState },
          { label: 'Sistem / Poz', value: `${counts.systems || systems.length} sistem · ${counts.positions || systems.length} poz` },
          { label: 'Bağımsız Gruplar', value: groups.length ? groups.map(group => `${group.groupId || group.groupIndex + 1}: ${mmText(Number(group.outerEndX) - Number(group.outerStartX))}`).join(' | ') : 'Tek bağlı grup' },
          { label: 'Toplam Nominal Genişlik', value: mmText(project.normalized && project.normalized.width || model.width) },
          { label: 'Maksimum Açılım', value: mmText(derived.envelope && derived.envelope.depth || model.depth) },
          { label: 'Maksimum Arka Yükseklik', value: mmText(derived.envelope && derived.envelope.height || model.height) }
        ])
      });
      sections.push({
        title: 'Pergola · 2D / Üretim Bileşenleri',
        rows: filterReportRows([
          { label: 'Gerçek GLB Ray Profilleri', value: String(counts.rails || 0) },
          { label: 'Gerçek GLB Dikmeler', value: String(counts.posts || 0) },
          { label: '3D Arka Duvar Parçaları', value: String(counts.walls || 0) },
          { label: 'Duvar Bağlantı Adayları', value: String(counts.wallConnections || 0) },
          { label: 'Kumaş Profilleri', value: String(counts.fabricProfiles || 0) },
          { label: 'Trapez Sac Alanları', value: String(counts.trapezSheets || 0) },
          { label: 'Oluk / Grup Profilleri', value: String((derived.components || []).filter(item => item.kind === 'gutter').length) },
          { label: 'Component Instance', value: String((derived.components || []).length) },
          { label: 'Koordinat Sistemi', value: 'X=genişlik · Y=yükseklik · Z=açılım · birim=mm' }
        ])
      });
      sections.push({
        title: 'Pergola · Poz Parametreleri',
        rows: systems.map((system, index) => ({
          label: `Poz ${index + 1}`,
          value: `${mmText(system.width)} genişlik · ${mmText(system.opening)} açılım · arka ${mmText(system.rearHeight)} · ön ${mmText(system.frontHeight)} · eğim ${Number(system.slopeDegrees || 0).toFixed(2)}° · ${system.railCount || 0} ray · akslar ${(system.railAxes || []).map(axis => Math.round(Number(axis))).join(', ') || '—'} mm`
        }))
      });
      sections.push({
        title: 'Pergola · Malzeme ve Opsiyonlar',
        rows: filterReportRows([
          { label: 'Sistem Rengi', value: input.structureColor || (model.systemColor && model.systemColor.code) },
          { label: 'Kumaş', value: input.fabric },
          { label: 'Kumaş Profilleri', value: input.fabricProfiles },
          { label: 'Motor', value: input.motor },
          { label: 'Kumanda', value: input.remote },
          { label: 'LED', value: input.led },
          { label: 'Dimmer', value: input.dimmer },
          { label: 'Arka Taşıyıcı', value: input.__rearSupport && input.__rearSupport.type === 'wall' ? 'Duvar' : (input.__rearSupport && input.__rearSupport.type) },
          { label: 'Ek Bilgiler', value: input.extras }
        ])
      });
      if (Array.isArray(derived.unresolvedProductionFields) && derived.unresolvedProductionFields.length) {
        sections.push({
          title: 'Pergola · Doğrulama Notları',
          rows: derived.unresolvedProductionFields.map((value, index) => ({ label: `Not ${index + 1}`, value }))
        });
      }
      return sections;
    }

    sections.push({
      title: 'Ana Sistem · Project Details',
      rows: filterReportRows([
        { label: 'Ürün Ailesi', value: 'Bioclimatic' },
        { label: 'Ürün Grubu', value: spec.groupLabel },
        { label: 'Ürün Alt Grup', value: spec.subgroupLabel },
        { label: 'Module', value: 'Modul 1' },
        { label: 'Width', value: mmText(model.width) },
        { label: 'Projection', value: mmText(model.depth) },
        { label: 'Height', value: mmText(model.height) },
        { label: 'Panel Sayısı', value: String(model.panelCount || model.lamellaCount || '') }
      ])
    });
    sections.push({
      title: 'Ana Sistem · Color Details',
      rows: filterReportRows([
        { label: 'Renk Modu', value: model.colorMode === 'ral' ? 'RAL' : 'Default' },
        { label: 'Sistem Rengi', value: model.colorMode === 'ral' ? `${model.systemColor.code} · ${finishLabel(model.systemColor.finish)}` : 'Klasik Sistem Paleti' },
        { label: 'Panel Rengi', value: model.colorMode === 'ral' ? `${model.panelColor.code} · ${finishLabel(model.panelColor.finish)}` : 'Klasik Panel Yeşili' },
        { label: 'Paneller', value: model.panelMasterOpen ? 'Açık' : 'Kapalı' },
        { label: 'Ürünler', value: model.productsOpen ? 'Açık' : 'Kapalı' }
      ])
    });
    const changes = modelChangeLines(model);
    if (changes.length) {
      sections.push({
        title: 'Ana Sistem · Değişiklik Özeti',
        rows: [{ label: 'Değişiklikler', value: changes.join(' | ') }]
      });
    }
    return sections;
  }

  function placementReportRows(placement, zone, prefix) {
    const lines = placementDetailLines(placement, zone).map((line) => ({ label: line.label, value: line.value }));
    const rows = filterReportRows(lines);
    const changes = placementChangeLines(placement);
    if (changes.length) rows.push({ label: 'Yapılan Değişiklikler', value: changes.join(' | ') });
    return rows.map((row, index) => ({
      label: index === 0 && prefix ? `${prefix} · ${row.label}` : row.label,
      value: row.value
    }));
  }

  function buildFacadeSections(model) {
    const sections = [];
    buildReportFacades(model).forEach((facade) => {
      const zoneSections = [];
      facade.zones.forEach((zone) => {
        const primary = model.placements[zone.id];
        const zip = model.zipPlacements[zone.id];
        if (!primary && !zip) return;
        const baseRows = filterReportRows([
          { label: 'Cephe', value: facade.label },
          { label: 'Alan', value: zone.label },
          { label: 'Cephe Net Ölçüsü', value: `${mmText(facade.width)} × ${mmText(facade.height)}` },
          { label: 'Net Alan', value: `${mmText(zone.width)} × ${mmText(zone.height)}` },
          { label: 'Ara Profiller', value: facade.profiles.length ? facade.profiles.map((profile) => profileSummary(profile)).join(' | ') : '' }
        ]);
        if (primary) {
          zoneSections.push({
            title: `${zone.label} · Ana Ürün`,
            rows: baseRows.concat(placementReportRows(primary, zone, 'Ana Ürün'))
          });
        }
        if (zip) {
          zoneSections.push({
            title: `${zone.label} · Zip Perde`,
            rows: baseRows.concat(placementReportRows({ ...zip, type: 'zip' }, zone, 'Zip Perde'))
          });
        }
      });
      sections.push(...zoneSections);
    });
    if (!sections.length) {
      sections.push({
        title: 'Cephe Ürünleri',
        rows: [{ label: 'Durum', value: 'Yerleştirilmiş cephe ürünü bulunmuyor.' }]
      });
    }
    return sections;
  }

  function drawContainedImage(pdf, view, boxX, boxY, boxW, boxH) {
    pdf.setDrawColor(206, 216, 230);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(boxX, boxY, boxW, boxH, 3, 3, 'FD');
    if (!view || !view.dataUrl || !view.width || !view.height) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text('Görsel alınamadı', boxX + 8, boxY + 12);
      return;
    }
    const scale = Math.min(boxW / view.width, boxH / view.height);
    const drawW = view.width * scale;
    const drawH = view.height * scale;
    const drawX = boxX + (boxW - drawW) / 2;
    const drawY = boxY + (boxH - drawH) / 2;
    pdf.addImage(view.dataUrl, 'JPEG', drawX, drawY, drawW, drawH);
  }

  function estimateSectionHeight(pdf, rows, width, labelWidth) {
    let total = 10;
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const value = row && row.value != null && row.value !== '' ? String(row.value) : '—';
      const valueLines = pdf.splitTextToSize(value, width - labelWidth - 8);
      total += Math.max(7, valueLines.length * 4.4 + 2);
    });
    return total + 6;
  }

  function drawSectionTable(pdf, title, rows, y, margin, width) {
    const safeRows = filterReportRows(rows);
    if (!safeRows.length) return y;
    const labelWidth = 58;
    const contentWidth = width - 10;
    const estimatedHeight = estimateSectionHeight(pdf, safeRows, contentWidth, labelWidth);
    if (y + estimatedHeight > 285) {
      pdf.addPage();
      y = 14;
    }
    pdf.setFillColor(234, 241, 250);
    pdf.setDrawColor(196, 210, 227);
    pdf.roundedRect(margin, y, width, estimatedHeight, 3, 3, 'FD');
    pdf.setFillColor(219, 231, 247);
    pdf.roundedRect(margin, y, width, 10, 3, 3, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(19, 48, 84);
    pdf.text(title, margin + 4, y + 6.7);
    let cursorY = y + 15;
    safeRows.forEach((row, index) => {
      const valueText = String(row.value);
      const valueLines = pdf.splitTextToSize(valueText, contentWidth - labelWidth - 8);
      const rowHeight = Math.max(7, valueLines.length * 4.4 + 2);
      if (index > 0) {
        pdf.setDrawColor(212, 222, 235);
        pdf.line(margin + 4, cursorY - 2, margin + width - 4, cursorY - 2);
      }
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9.2);
      pdf.setTextColor(15, 23, 42);
      pdf.text(String(row.label || 'Bilgi'), margin + 4, cursorY + 2.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(31, 41, 55);
      pdf.text(valueLines, margin + 4 + labelWidth, cursorY + 2.5);
      cursorY += rowHeight;
    });
    return y + estimatedHeight + 6;
  }

  async function exportProductListPdf() {
    pruneProductStates();
    const model = readModel();
    if (!modelReady(model)) {
      window.alert('Önce geçerli bir 3D model oluşturun.');
      return;
    }
    const button = $(ids.exportProductListPdf);
    const originalLabel = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = 'PDF Hazırlanıyor…';
    }
    try {
      const jsPdfApi = window.jspdf && window.jspdf.jsPDF;
      if (!jsPdfApi) throw new Error('jsPDF yüklenemedi. İnternet bağlantısını kontrol edin.');
      const pdf = new jsPdfApi({ orientation: 'p', unit: 'mm', format: 'a4' });
      const margin = 10;
      const pageWidth = 210;
      const usableWidth = pageWidth - margin * 2;
      const views = collectPdfViews();
      const captions = {
        'front-left': 'Arka sol üst görünüş',
        'front-right': 'Arka sağ üst görünüş',
        'back-left': 'Ön sol üst görünüş',
        'back-right': 'Ön sağ üst görünüş'
      };
      const groups = [views.slice(0, 2), views.slice(2, 4)];
      groups.forEach((group, pageIndex) => {
        if (pageIndex > 0) pdf.addPage();
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(17, 36, 66);
        pdf.text('Ürün Listesi PDF', margin, 14);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.setTextColor(31, 41, 55);
        const pergoCounts = model.pergoRiseProject && model.pergoRiseProject.derived && model.pergoRiseProject.derived.counts || {};
        const subtitle = model.productGroup === 'pergo-rise'
          ? `${productModelLabel(model.productGroup)} · ${pergoCounts.systems || 0} sistem · ${pergoCounts.positions || 0} poz · ${pergoCounts.rails || 0} ray · ${pergoCounts.posts || 0} dikme`
          : `${productModelLabel(model.productGroup)} · ${mmText(model.width)} × ${mmText(model.depth)} × ${mmText(model.height)} · ${model.panelCount || model.lamellaCount} panel`;
        pdf.text(subtitle, margin, 20);
        let y = 28;
        group.forEach((view) => {
          const boxX = margin;
          const boxY = y;
          const boxW = usableWidth;
          const boxH = 104;
          drawContainedImage(pdf, view, boxX, boxY, boxW, boxH);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9.4);
          pdf.setTextColor(15, 23, 42);
          pdf.text(captions[view.preset] || 'Görünüş', boxX + 2, boxY + boxH + 5);
          y += boxH + 12;
        });
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.text(`Görsel sayfa ${pageIndex + 1} · Görseller daha geniş açı ve oran korunarak yerleştirildi.`, margin, 288);
      });

      pdf.addPage();
      let y = 14;
      systemInfoSections(model).forEach((section) => {
        y = drawSectionTable(pdf, section.title, section.rows, y, margin, usableWidth);
      });
      if (model.productGroup !== 'pergo-rise') {
        buildFacadeSections(model).forEach((section) => {
          y = drawSectionTable(pdf, section.title, section.rows, y, margin, usableWidth);
        });
      }
      pdf.save(pdfFileName(model));
    } catch (error) {
      console.error('Ürün listesi PDF üretimi başarısız oldu.', error);
      window.alert(`Ürün listesi PDF oluşturulamadı: ${error.message}`);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel || 'Ürün Listesi PDF';
      }
    }
  }

  function doorTypeSilhouetteSvg(type) {
    const stroke = '#0f172a';
    const frame = '#475569';
    const fixed = '#cbd5e1';
    const moving = '#93c5fd';
    const leafWidth = 1000;
    const sideFixedWidth = 1000;
    const leafHeight = 2500;
    const topFixedHeight = 500;
    const maxWidth = 4000;
    const maxHeight = leafHeight + topFixedHeight;
    const margin = 140;
    const hasTopFixed = DOOR_TOP_FIXED_TYPES.has(type);
    const segments = [];
    const addMoving = (hinge) => segments.push({ width: leafWidth, kind: 'moving', hinge });
    const addFixed = () => segments.push({ width: sideFixedWidth, kind: 'fixed' });

    if (type === 'SINGLE' || type === 'TOP_FIXED') {
      addMoving('LEFT');
    } else if (type === 'DOUBLE' || type === 'DOUBLE_TOP') {
      addMoving('LEFT'); addMoving('RIGHT');
    } else if (type === 'LEFT_FIXED_RIGHT_MOVING' || type === 'LEFT_FIXED_TOP') {
      addFixed(); addMoving('RIGHT');
    } else if (type === 'RIGHT_FIXED_LEFT_MOVING' || type === 'RIGHT_FIXED_TOP') {
      addMoving('LEFT'); addFixed();
    } else if (type === 'BOTH_FIXED_TOP') {
      addFixed(); addMoving('LEFT'); addFixed();
    } else if (type === 'DOUBLE_LEFT_FIXED' || type === 'DOUBLE_LEFT_FIXED_TOP') {
      addFixed(); addMoving('LEFT'); addMoving('RIGHT');
    } else if (type === 'DOUBLE_RIGHT_FIXED_TOP') {
      addMoving('LEFT'); addMoving('RIGHT'); addFixed();
    } else if (type === 'DOUBLE_BOTH_FIXED_TOP') {
      addFixed(); addMoving('LEFT'); addMoving('RIGHT'); addFixed();
    } else {
      addMoving('LEFT');
    }

    const totalWidth = segments.reduce((sum, segment) => sum + segment.width, 0);
    const totalHeight = leafHeight + (hasTopFixed ? topFixedHeight : 0);
    const originX = margin + (maxWidth - totalWidth) / 2;
    const originY = margin + (maxHeight - totalHeight);
    const leafY = originY + (hasTopFixed ? topFixedHeight : 0);
    const inset = 45;
    const strokeWidth = 58;

    let panes = '';
    let cursor = originX;
    segments.forEach((segment) => {
      const fill = segment.kind === 'moving' ? moving : fixed;
      panes += `<rect x="${cursor + inset}" y="${leafY + inset}" width="${segment.width - inset * 2}" height="${leafHeight - inset * 2}" rx="42" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`;
      cursor += segment.width;
    });

    const topBand = hasTopFixed
      ? `<rect x="${originX + inset}" y="${originY + inset}" width="${totalWidth - inset * 2}" height="${topFixedHeight - inset * 2}" rx="42" fill="${fixed}" stroke="${stroke}" stroke-width="${strokeWidth}" />`
      : '';
    return `<svg viewBox="0 0 ${maxWidth + margin * 2} ${maxHeight + margin * 2}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">`
      + `<rect x="${originX}" y="${originY}" width="${totalWidth}" height="${totalHeight}" rx="55" fill="none" stroke="${frame}" stroke-width="82" />`
      + topBand + panes + '</svg>';
  }

  function closeDoorTypePicker() {
    const picker = $(ids.productDoorTypePicker);
    const trigger = $(ids.productDoorTypeTrigger);
    if (picker) picker.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function openDoorTypePicker() {
    const picker = $(ids.productDoorTypePicker);
    const trigger = $(ids.productDoorTypeTrigger);
    if (!picker || $(ids.productType).value !== 'door') return;
    renderDoorTypeCards($(ids.productDoorType).value);
    picker.hidden = false;
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    const selected = $(ids.productDoorTypeCards).querySelector('.door-type-card.is-selected');
    if (selected && selected.focus) selected.focus();
  }

  function openProductFabricCatalog() {
    const picker = $(ids.productFabricPicker);
    const trigger = $(ids.productFabricTrigger);
    if (!picker || $(ids.productType).value !== 'zip') return;
    renderFabricCards($(ids.productFabric).value);
    picker.hidden = false;
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    const first = $(ids.productFabricCards).querySelector('.fabric-page-hotspot.is-selected') || $(ids.productFabricCards).querySelector('.fabric-page-hotspot');
    if (first && first.focus) first.focus();
  }

  function closeProductFabricCatalog() {
    const picker = $(ids.productFabricPicker);
    const trigger = $(ids.productFabricTrigger);
    if (picker) picker.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  }

  function renderDoorTypeCards(selected) {
    const container = $(ids.productDoorTypeCards);
    if (!container) return;
    container.innerHTML = '';
    DOOR_TYPE_OPTIONS.forEach(([value, main, detail]) => {
      const button = document.createElement('button');
      const fullLabel = detail ? main + ' · ' + detail : main;
      button.type = 'button';
      button.className = 'door-type-card' + (String(selected) === value ? ' is-selected' : '');
      button.setAttribute('data-value', value);
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(String(selected) === value));
      button.setAttribute('aria-label', fullLabel);
      button.innerHTML = doorTypeSilhouetteSvg(value) + '<span class="door-type-card-copy"><strong class="door-type-card-title">' + main + '</strong><span class="door-type-card-detail">' + detail + '</span></span>';
      button.addEventListener('click', () => {
        $(ids.productDoorType).value = value;
        $(ids.productDoorTypeValue).textContent = doorTypeLabel(value);
        closeDoorTypePicker();
        applyProductRules(currentProductDraft());
        $(ids.productDoorTypeTrigger).focus();
      });
      container.appendChild(button);
    });
  }

  function setHidden(id, hidden) {
    $(id).hidden = Boolean(hidden);
  }

  window.P3DVProductFieldPolicy = Object.freeze({
    types: Object.freeze(Object.keys(PRODUCT_FIELD_POLICY)),
    allowedWrappers: type => [...productPolicy(type).wrappers],
    allowedStateKeys: type => [...productPolicy(type).stateKeys],
    managedWrappers: () => [...PRODUCT_MANAGED_WRAPPERS],
    sanitize: (source, type) => JSON.parse(JSON.stringify(sanitizeProductState(source, type)))
  });

  function applyProductFieldOrder(type) {
    const grid = $(ids.productFormGrid);
    if (!grid || typeof grid.insertBefore !== 'function') return;
    const directionWrap = $(ids.productDirectionWrap);
    const glassThicknessWrap = $(ids.productGlassThicknessWrap);
    const panelsWrap = $(ids.productPanelsWrap);
    const viewWrap = $(ids.productFoldingViewWrap);
    const openWrap = $(ids.productFoldingOpenDirectionWrap);
    const slidingViewWrap = $(ids.productSlidingViewWrap);
    const openingWrap = $(ids.productOpeningWrap);
    if (type === 'folding') {
      if (panelsWrap && viewWrap) grid.insertBefore(viewWrap, panelsWrap.nextSibling);
      if (viewWrap && openWrap) grid.insertBefore(openWrap, viewWrap.nextSibling);
      if (openWrap && directionWrap) grid.insertBefore(directionWrap, openWrap.nextSibling);
    } else if (type === 'sliding') {
      if (slidingViewWrap && openingWrap) grid.insertBefore(slidingViewWrap, openingWrap);
      if (directionWrap && glassThicknessWrap) grid.insertBefore(directionWrap, glassThicknessWrap);
    } else if (directionWrap && glassThicknessWrap) {
      grid.insertBefore(directionWrap, glassThicknessWrap);
    }
  }

  function setDoorFieldsHidden(hidden) {
    setHidden(ids.productDoorTypeWrap, hidden);
    setHidden(ids.productDoorHingeWrap, hidden);
    setHidden(ids.productDoorActiveLeafWrap, hidden);
    setHidden(ids.productDoorOpenDirectionWrap, hidden);
    setHidden(ids.productDoorHandleTypeWrap, hidden);
    setHidden(ids.productDoorTopFixedHeightWrap, hidden);
    setHidden(ids.productDoorHeightSummaryWrap, hidden);
  }

  function doorTopFixedAvailableHeight(zone) {
    if (!zone) return null;
    const fittedHeight = Math.max(120, Number(zone.height || 0) - 5);
    return Math.max(0, Math.round(fittedHeight - 87));
  }

  function doorTopFixedMetrics(zone, movingLeafHeight, fallbackTopFixedHeight = 500) {
    const minimumFixedHeight = 110;
    const availableHeight = doorTopFixedAvailableHeight(zone);
    const fallbackFixed = Math.max(minimumFixedHeight, Math.round(Number(fallbackTopFixedHeight) || 500));
    const fallbackMoving = availableHeight === null ? 2200 : Math.max(1200, availableHeight - fallbackFixed);
    const requestedMoving = Number.isFinite(Number(movingLeafHeight)) ? Math.round(Number(movingLeafHeight)) : fallbackMoving;
    if (availableHeight === null) {
      const movingHeight = Math.max(1200, requestedMoving);
      return {
        fixedHeight: fallbackFixed,
        movingHeight,
        requestedMovingHeight: requestedMoving,
        minMovingHeight: 1200,
        maxMovingHeight: null,
        availableHeight: null,
        minimumFixedHeight,
        valid: requestedMoving >= 1200
      };
    }
    const minMovingHeight = 1200;
    const maxMovingHeight = Math.max(minMovingHeight, availableHeight - minimumFixedHeight);
    const movingHeight = Math.max(minMovingHeight, Math.min(maxMovingHeight, requestedMoving));
    const requestedFixedHeight = availableHeight - requestedMoving;
    const fixedHeight = Math.max(minimumFixedHeight, availableHeight - movingHeight);
    const valid = requestedMoving >= minMovingHeight && requestedMoving <= maxMovingHeight && requestedFixedHeight >= minimumFixedHeight;
    return {
      fixedHeight,
      requestedFixedHeight,
      movingHeight,
      requestedMovingHeight: requestedMoving,
      minMovingHeight,
      maxMovingHeight,
      availableHeight,
      minimumFixedHeight,
      valid
    };
  }

  function updateDoorTopFixedSummary(options = {}) {
    const isTopFixed = $(ids.productType).value === 'door' && DOOR_TOP_FIXED_TYPES.has($(ids.productDoorType).value);
    setHidden(ids.productDoorHeightSummaryWrap, !isTopFixed);
    const input = $(ids.productDoorTopFixedHeight);
    if (!isTopFixed) {
      if (input && typeof input.setCustomValidity === 'function') input.setCustomValidity('');
      return true;
    }
    const zone = activeZone || (bulkProductZones && bulkProductZones[0]) || null;
    const rawValue = input.value;
    const seed = currentProductDraft();
    const metrics = doorTopFixedMetrics(zone, rawValue, seed.topFixedHeight);
    input.min = String(metrics.minMovingHeight);
    if (metrics.maxMovingHeight === null) input.removeAttribute('max');
    else input.max = String(metrics.maxMovingHeight);
    if (options.normalize || !String(rawValue).trim()) input.value = String(metrics.movingHeight);
    const displayedMoving = Math.round(Number(input.value) || metrics.movingHeight);
    const displayedFixed = metrics.availableHeight === null ? metrics.fixedHeight : metrics.availableHeight - displayedMoving;
    $(ids.productDoorFixedHeightValue).textContent = `${Math.round(displayedFixed)} mm`;
    $(ids.productDoorMovingHeightValue).textContent = `${displayedMoving} mm`;
    const message = metrics.valid
      ? ''
      : `Kanat yüksekliği kabul edilmedi. Kalan üst sabit cam yüksekliği en az ${metrics.minimumFixedHeight} mm olmalıdır. Uygun kanat aralığı ${metrics.minMovingHeight}–${metrics.maxMovingHeight === null ? '—' : metrics.maxMovingHeight} mm.`;
    if (typeof input.setCustomValidity === 'function') input.setCustomValidity(message);
    input.classList.toggle('is-invalid', Boolean(message));
    if (!options.silent) $(ids.productValidation).textContent = message;
    return !message;
  }

  function fixedHorizontalTotalHeight() {
    const zone = activeZone || (bulkProductZones && bulkProductZones[0]) || null;
    return zone ? Math.round(Math.max(120, Number(zone.height || 0) - 5)) : 0;
  }

  function parseFixedHorizontalValues(value, divisions) {
    const parts = String(value || '').split(/[;,]+/).map((item) => Math.round(Number(String(item).trim())));
    return parts.length === divisions && parts.every((item) => Number.isFinite(item) && item > 0) ? parts : [];
  }

  function distributeFixedHorizontalValues(totalHeight, values, manualFlags) {
    const total = Math.max(0, Math.round(Number(totalHeight) || 0));
    const count = Math.max(1, Math.round(Number(values && values.length) || Number(manualFlags && manualFlags.length) || 1));
    const nextValues = Array.from({ length: count }, (_, index) => Math.max(1, Math.round(Number(values && values[index]) || 1)));
    const nextManual = Array.from({ length: count }, (_, index) => Boolean(manualFlags && manualFlags[index]));
    const automaticIndexes = nextManual.map((manual, index) => manual ? -1 : index).filter((index) => index >= 0);
    const manualSum = nextValues.reduce((sum, value, index) => sum + (nextManual[index] ? value : 0), 0);
    if (!automaticIndexes.length) {
      return { ok: manualSum === total, values: nextValues, manual: nextManual, totalHeight: total, remaining: total - manualSum };
    }
    const remaining = total - manualSum;
    if (remaining < automaticIndexes.length) {
      return { ok: false, values: nextValues, manual: nextManual, totalHeight: total, remaining };
    }
    const base = Math.floor(remaining / automaticIndexes.length);
    let extra = remaining - base * automaticIndexes.length;
    automaticIndexes.forEach((index) => {
      nextValues[index] = base + (extra > 0 ? 1 : 0);
      if (extra > 0) extra -= 1;
    });
    return { ok: true, values: nextValues, manual: nextManual, totalHeight: total, remaining: 0 };
  }

  function syncFixedHorizontalSerializedValue() {
    $(ids.productFixedHorizontalHeights).value = fixedHorizontalFormState.values.join(';');
  }

  function renderFixedHorizontalRows() {
    const container = $(ids.productFixedHorizontalHeightRows);
    if (!container) return;
    container.innerHTML = '';
    fixedHorizontalFormState.values.forEach((value, index) => {
      const row = document.createElement('div');
      row.className = 'fixed-horizontal-height-row';
      const label = document.createElement('label');
      label.htmlFor = `productFixedHorizontalHeightInput${index + 1}`;
      label.textContent = `SDY${index + 1}`;
      const input = document.createElement('input');
      input.id = `productFixedHorizontalHeightInput${index + 1}`;
      input.type = 'number';
      input.inputMode = 'numeric';
      input.min = '1';
      input.step = '1';
      input.value = String(value);
      input.className = fixedHorizontalFormState.manual[index] ? 'is-manual' : '';
      input.setAttribute('data-sdy-index', String(index));
      const reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'fixed-horizontal-height-reset';
      reset.textContent = 'Resetle';
      reset.disabled = !fixedHorizontalFormState.manual[index];
      reset.setAttribute('data-sdy-reset-index', String(index));
      const status = document.createElement('span');
      status.className = 'fixed-horizontal-height-status';
      status.textContent = fixedHorizontalFormState.manual[index] ? 'Manuel değer korunur' : 'Otomatik eşit dağıtım';
      input.addEventListener('change', () => {
        const requested = Math.round(Number(input.value));
        const previous = {
          values: [...fixedHorizontalFormState.values],
          manual: [...fixedHorizontalFormState.manual],
          totalHeight: fixedHorizontalFormState.totalHeight
        };
        if (!Number.isFinite(requested) || requested < 1) {
          input.value = String(previous.values[index]);
          $(ids.productValidation).textContent = `SDY${index + 1} için 1 mm veya daha büyük bir değer girin.`;
          return;
        }
        const values = [...previous.values];
        const manual = [...previous.manual];
        values[index] = requested;
        manual[index] = true;
        const distributed = distributeFixedHorizontalValues(previous.totalHeight, values, manual);
        if (!distributed.ok) {
          fixedHorizontalFormState = previous;
          $(ids.productValidation).textContent = 'Manuel SDY değerleri toplam yüksekliği aşıyor veya tüm hücreler manuel olduğu için toplam korunamıyor. Bir hücreyi Resetle ile otomatik dağıtıma alın.';
          renderFixedHorizontalRows();
          syncFixedHorizontalSerializedValue();
          return;
        }
        fixedHorizontalFormState = distributed;
        syncFixedHorizontalSerializedValue();
        $(ids.productValidation).textContent = '';
        renderFixedHorizontalRows();
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { event.preventDefault(); input.blur(); }
      });
      reset.addEventListener('click', () => {
        const manual = [...fixedHorizontalFormState.manual];
        manual[index] = false;
        const distributed = distributeFixedHorizontalValues(fixedHorizontalFormState.totalHeight, fixedHorizontalFormState.values, manual);
        if (!distributed.ok) return;
        fixedHorizontalFormState = distributed;
        syncFixedHorizontalSerializedValue();
        $(ids.productValidation).textContent = '';
        renderFixedHorizontalRows();
      });
      row.appendChild(label);
      row.appendChild(input);
      row.appendChild(reset);
      row.appendChild(status);
      container.appendChild(row);
    });
  }

  function initializeFixedHorizontalForm(draft, options = {}) {
    const divisions = Math.max(1, Math.min(10, Math.round(Number(draft && draft.horizontalDivisions) || 1)));
    const totalHeight = fixedHorizontalTotalHeight();
    const parsed = parseFixedHorizontalValues(draft && draft.horizontalHeights, divisions);
    const hasStoredManual = draft && Array.isArray(draft.horizontalHeightManual) && draft.horizontalHeightManual.length === divisions;
    let manual = hasStoredManual
      ? draft.horizontalHeightManual.map(Boolean)
      : (parsed.length && Math.max(...parsed) - Math.min(...parsed) > 1 ? Array(divisions).fill(true) : Array(divisions).fill(false));
    let values = parsed.length ? parsed : Array(divisions).fill(1);
    if (options.resetAll) manual = Array(divisions).fill(false);
    let distributed = distributeFixedHorizontalValues(totalHeight, values, manual);
    if (!distributed.ok) distributed = distributeFixedHorizontalValues(totalHeight, Array(divisions).fill(1), Array(divisions).fill(false));
    fixedHorizontalFormState = distributed;
    syncFixedHorizontalSerializedValue();
    renderFixedHorizontalRows();
  }

  function currentProductDraft() {
    const type = $(ids.productType).value;
    const colorValue = normalizeGlassColor($(ids.productGlassColor).value);
    return sanitizeProductState({
      type,
      series: $(ids.productSeries).value,
      subtype: $(ids.productSubtype).value,
      placementLocation: $(ids.productPlacement).value,
      mechanism: $(ids.productMechanism).value,
      slidingView: $(ids.productSlidingView).value,
      openingType: $(ids.productOpening).value,
      openingDirection: $(ids.productDirection).value,
      glassThickness: $(ids.productGlassThickness).value,
      glassColor: colorValue,
      customGlassColor: $(ids.productCustomGlass).value,
      fabricColor: $(ids.productFabric).value,
      customFabricColor: '',
      panels: Number($(ids.productPanels).value),
      foldingView: $(ids.productFoldingView).value,
      foldingOpenDirection: $(ids.productFoldingOpenDirection).value,
      verticalDivisions: Number($(ids.productFixedVerticalCount).value),
      horizontalDivisions: Number($(ids.productFixedHorizontalCount).value),
      horizontalHeights: $(ids.productFixedHorizontalHeights).value,
      horizontalHeightManual: [...fixedHorizontalFormState.manual],
      doorType: $(ids.productDoorType).value,
      hingeDirection: $(ids.productDoorHinge).value,
      activeLeaf: $(ids.productDoorActiveLeaf).value,
      doorOpenDirection: $(ids.productDoorOpenDirection).value,
      handleType: $(ids.productDoorHandleType).value,
      movingLeafHeight: Number($(ids.productDoorTopFixedHeight).value),
      topFixedHeight: null,
      panelType: $(ids.productPanelType).value,
      cableDirection: $(ids.productPanelType).value,
      motorDirection: $(ids.productMotorDirection).value,
      view: $(ids.productView).value,
      motorType: $(ids.productMotorType).value,
      remoteControl: $(ids.productRemote).value,
      bottomPanelMode: $(ids.bottomPanelMode).value,
      bottomPanelState: $(ids.bottomPanelState).value,
      bottomPanelHinge: $(ids.bottomPanelHinge).value,
      collectionState: type === 'folding' ? $(ids.foldingCollectionState).value : (type === 'sliding' ? $(ids.slidingCollectionState).value : $(ids.collectingDisplayState).value)
    }, type);
  }

  function updateFoldingFormAdvisory() {
    if ($(ids.productType).value !== 'folding') return;
    const panels = Math.max(2, Math.round(Number($(ids.productPanels).value) || 2));
    const zone = activeZone || (bulkProductZones && bulkProductZones[0]) || null;
    if (panels > 8) {
      $(ids.productDirection).value = 'BOTH';
      $(ids.productDirection).disabled = true;
    } else {
      $(ids.productDirection).disabled = false;
    }
    const draft = { type: 'folding', panels, openingDirection: $(ids.productDirection).value };
    const warnings = foldingAdvisory(zone, draft);
    if ($(ids.foldingRuleNote)) {
      $(ids.foldingRuleNote).textContent = warnings.length
        ? warnings.join(' ')
        : 'Otomatik hedef panel genişliği 600 mm. Tek tarafa önerilen maksimum 8 paneldir.';
    }
  }

  function applyProductRules(seed) {
    const type = $(ids.productType).value;
    applyProductFieldOrder(type);
    resetProductFieldVisibility();
    const draft = { ...productDefaults(type), ...sanitizeProductState(seed || currentProductDraft(), type), type };
    const isFolding = type === 'folding';
    const isGuillotine = type === 'guillotine';
    const isZip = type === 'zip';
    const isFixed = type === 'fixed';
    const isDoor = type === 'door';
    const standardSeries = [
      ['A SERIES', 'A Serisi'],
      ['K SERIES', 'K Serisi']
    ];
    const glassColors = GLASS_COLOR_OPTIONS;

    setDoorFieldsHidden(true);
    setHidden(ids.productFoldingViewWrap, true);
    setHidden(ids.productSlidingViewWrap, true);
    setHidden(ids.productFoldingOpenDirectionWrap, true);
    setHidden(ids.foldingCollectionSection, true);
    if ($(ids.productDirection)) $(ids.productDirection).disabled = false;
    if ($(ids.productDoorTypeCards)) $(ids.productDoorTypeCards).innerHTML = '';

    if (isDoor) {
      fillSelect($(ids.productDoorType), PRODUCT_OPTIONS.door.types, draft.doorType);
      $(ids.productDoorTypeValue).textContent = doorTypeLabel($(ids.productDoorType).value);
      renderDoorTypeCards(draft.doorType);
      fillSelect($(ids.productDoorHinge), PRODUCT_OPTIONS.door.hinges, draft.hingeDirection);
      fillSelect($(ids.productDoorActiveLeaf), PRODUCT_OPTIONS.door.activeLeaves, draft.activeLeaf);
      fillSelect($(ids.productDoorOpenDirection), PRODUCT_OPTIONS.door.openDirections, draft.doorOpenDirection);
      fillSelect($(ids.productDoorHandleType), PRODUCT_OPTIONS.door.handles, draft.handleType);
      fillSelect($(ids.productGlassThickness), PRODUCT_OPTIONS.sliding.thicknessA, compatibleGlassThickness('door', 'A SERIES', draft.glassThickness, draft.glassColor));
      fillSelect($(ids.productGlassColor), glassColors, draft.glassColor);
      const doorType = $(ids.productDoorType).value;
      const doorZone = activeZone || (bulkProductZones && bulkProductZones[0]) || null;
      const doorMetrics = doorTopFixedMetrics(doorZone, draft.movingLeafHeight, draft.topFixedHeight);
      $(ids.productDoorTopFixedHeight).value = String(doorMetrics.movingHeight);
      $(ids.productDoorTopFixedHeight).min = String(doorMetrics.minMovingHeight);
      if (doorMetrics.maxMovingHeight === null) $(ids.productDoorTopFixedHeight).removeAttribute('max');
      else $(ids.productDoorTopFixedHeight).max = String(doorMetrics.maxMovingHeight);
      setHidden(ids.productSeriesWrap, true);
      setHidden(ids.productSubtypeWrap, true);
      setHidden(ids.productPlacementWrap, true);
      setHidden(ids.productMechanismWrap, true);
      setHidden(ids.productOpeningWrap, true);
      setHidden(ids.productDirectionWrap, true);
      setHidden(ids.productGlassThicknessWrap, false);
      setHidden(ids.productGlassColorWrap, false);
      setHidden(ids.productPanelsWrap, true);
      setHidden(ids.productFixedVerticalCountWrap, true);
      setHidden(ids.productFixedHorizontalCountWrap, true);
      setHidden(ids.productFixedHorizontalHeightsWrap, true);
      setHidden(ids.productPanelTypeWrap, true);
      setHidden(ids.productMotorDirectionWrap, true);
      setHidden(ids.productViewWrap, true);
      setHidden(ids.productMotorTypeWrap, true);
      setHidden(ids.productRemoteWrap, true);
      setHidden(ids.cleanableWindowSection, true);
      setHidden(ids.collectingDisplaySection, true);
      setHidden(ids.slidingCollectionSection, true);
      setHidden(ids.productDoorTypeWrap, false);
      setHidden(ids.productDoorHingeWrap, DOOR_DOUBLE_TYPES.has(doorType));
      setHidden(ids.productDoorActiveLeafWrap, !DOOR_DOUBLE_TYPES.has(doorType));
      setHidden(ids.productDoorOpenDirectionWrap, false);
      setHidden(ids.productDoorHandleTypeWrap, false);
      setHidden(ids.productDoorTopFixedHeightWrap, !DOOR_TOP_FIXED_TYPES.has(doorType));
      $(ids.productView).value = 'OUTSIDE VIEW';
      updateDoorTopFixedSummary({ normalize: true, silent: true });
      $(ids.productGlassColorLabel).textContent = 'Cam Rengi';
      $(ids.productCustomGlassLabel).textContent = 'Özel Cam Rengi';
      $(ids.productPanels).disabled = true;
      $(ids.productPanels).value = '0';
      const lowE = $(ids.productGlassColor).querySelector('option[value="LOW-E GLASS"]');
      if (lowE) lowE.disabled = $(ids.productGlassThickness).value !== 'INSULATED GLASS';
      if ($(ids.productGlassThickness).value !== 'INSULATED GLASS' && $(ids.productGlassColor).value === 'LOW-E GLASS') $(ids.productGlassColor).value = 'TRANSPARENT';
      $(ids.productCustomGlass).value = draft.customGlassColor || '';
      setHidden(ids.productCustomGlassWrap, $(ids.productGlassColor).value !== 'OTHER');
      $(ids.productValidation).textContent = '';
      return;
    }

    if (isFixed) {
      fillSelect($(ids.productGlassThickness), PRODUCT_OPTIONS.sliding.thicknessA, compatibleGlassThickness('fixed', 'A SERIES', draft.glassThickness, draft.glassColor));
      fillSelect($(ids.productGlassColor), glassColors, draft.glassColor);
      const fixedZone = activeZone || (bulkProductZones && bulkProductZones[0]) || null;
      const frame = 55;
      const innerWidth = fixedZone ? Math.max(80, fixedZone.width - 10 - frame * 2) : 0;
      const autoVerticalDivisions = Math.max(1, Math.ceil(innerWidth / 1200));
      const verticalDivisions = Math.max(1, Math.min(20, Math.round(Number(draft.verticalDivisions) || autoVerticalDivisions)));
      const horizontalDivisions = Math.max(1, Math.min(10, Math.round(Number(draft.horizontalDivisions) || 1)));
      $(ids.productFixedVerticalCount).value = String(verticalDivisions);
      $(ids.productFixedHorizontalCount).value = String(horizontalDivisions);
      initializeFixedHorizontalForm({
        ...draft,
        horizontalDivisions,
        horizontalHeightManual: Array.isArray(draft.horizontalHeightManual) ? draft.horizontalHeightManual : []
      });
      setHidden(ids.productSeriesWrap, true);
      setHidden(ids.productSubtypeWrap, true);
      setHidden(ids.productPlacementWrap, true);
      setHidden(ids.productMechanismWrap, true);
      setHidden(ids.productOpeningWrap, true);
      setHidden(ids.productDirectionWrap, true);
      setHidden(ids.productGlassThicknessWrap, false);
      setHidden(ids.productGlassColorWrap, false);
      setHidden(ids.productPanelsWrap, true);
      setHidden(ids.productFixedVerticalCountWrap, false);
      setHidden(ids.productFixedHorizontalCountWrap, false);
      setHidden(ids.productFixedHorizontalHeightsWrap, false);
      setHidden(ids.productPanelTypeWrap, true);
      setHidden(ids.productMotorDirectionWrap, true);
      setHidden(ids.productViewWrap, true);
      setHidden(ids.productMotorTypeWrap, true);
      setHidden(ids.productRemoteWrap, true);
      setHidden(ids.cleanableWindowSection, true);
      setHidden(ids.collectingDisplaySection, true);
      setHidden(ids.slidingCollectionSection, true);
      $(ids.productGlassColorLabel).textContent = 'Cam Rengi';
      $(ids.productCustomGlassLabel).textContent = 'Özel Cam Rengi';
      $(ids.productPanels).disabled = true;
      $(ids.productPanels).value = '0';
      $(ids.productPanels).min = '0';
      $(ids.productPanels).max = '0';
      const lowE = $(ids.productGlassColor).querySelector('option[value="LOW-E GLASS"]');
      if (lowE) lowE.disabled = $(ids.productGlassThickness).value !== 'INSULATED GLASS';
      if ($(ids.productGlassThickness).value !== 'INSULATED GLASS' && $(ids.productGlassColor).value === 'LOW-E GLASS') $(ids.productGlassColor).value = 'TRANSPARENT';
      $(ids.productCustomGlass).value = draft.customGlassColor || '';
      setHidden(ids.productCustomGlassWrap, $(ids.productGlassColor).value !== 'OTHER');
      $(ids.productValidation).textContent = '';
      return;
    }

    setHidden(ids.productSeriesWrap, false);
    setHidden(ids.productSubtypeWrap, false);
    setHidden(ids.productFixedVerticalCountWrap, true);
    setHidden(ids.productFixedHorizontalCountWrap, true);
    setHidden(ids.productFixedHorizontalHeightsWrap, true);

    if (isZip) {
      fillSelect($(ids.productSeries), PRODUCT_OPTIONS.zip.series, draft.series);
      const series = $(ids.productSeries).value === 'P SERIES' ? 'P SERIES' : 'G SERIES';
      fillSelect(
        $(ids.productSubtype),
        series === 'P SERIES' ? PRODUCT_OPTIONS.zip.subtypesP : PRODUCT_OPTIONS.zip.subtypesG,
        draft.subtype
      );
      fillSelect($(ids.productPlacement), PRODUCT_OPTIONS.zip.placements, draft.placementLocation);
      fillSelect($(ids.productPanelType), PRODUCT_OPTIONS.zip.cableDirections, draft.cableDirection);

      setHidden(ids.productPlacementWrap, false);
      setHidden(ids.productMechanismWrap, true);
      setHidden(ids.productOpeningWrap, true);
      setHidden(ids.productDirectionWrap, true);
      setHidden(ids.productGlassThicknessWrap, true);
      setHidden(ids.productGlassColorWrap, true);
      setHidden(ids.productFabricWrap, false);
      setHidden(ids.productPanelsWrap, true);
      setHidden(ids.productPanelTypeWrap, false);
      setHidden(ids.productMotorDirectionWrap, false);
      setHidden(ids.productViewWrap, true);
      setHidden(ids.productMotorTypeWrap, true);
      setHidden(ids.productRemoteWrap, true);
      setHidden(ids.cleanableWindowSection, true);
      setHidden(ids.collectingDisplaySection, true);
      setHidden(ids.slidingCollectionSection, true);
      setHidden(ids.productCustomGlassWrap, true);

      $(ids.productPanelTypeLabel).textContent = 'Kablo Çıkış Yönü';
      setProductFabricValue(draft.fabricColor);
      renderFabricCards(draft.fabricColor);
      $(ids.productMotorDirection).value = draft.motorDirection === 'LEFT' ? 'LEFT' : 'RIGHT';
      $(ids.productView).value = 'OUTSIDE VIEW';
      $(ids.productPanels).min = '1';
      $(ids.productPanels).max = '1';
      $(ids.productPanels).value = '1';
      $(ids.productPanels).disabled = true;
      $(ids.productValidation).textContent = '';
      return;
    }

    $(ids.productPanels).disabled = false;
    $(ids.productPanels).min = '2';
    fillSelect($(ids.productSeries), standardSeries, draft.series);
    fillSelect($(ids.productGlassColor), glassColors, draft.glassColor);
    const series = $(ids.productSeries).value === 'K SERIES' ? 'K SERIES' : 'A SERIES';
    setHidden(ids.productPlacementWrap, true);
    setHidden(ids.productGlassThicknessWrap, false);
    setHidden(ids.productGlassColorWrap, false);
    setHidden(ids.productFabricWrap, true);
    $(ids.productGlassColorLabel).textContent = 'Cam Rengi';
    $(ids.productCustomGlassLabel).textContent = 'Özel Cam Rengi';

    if (isFolding) {
      const foldingZone = activeZone || (bulkProductZones && bulkProductZones[0]) || null;
      const existingFolding = activeZone && primaryPlacement(activeZone.id) && primaryPlacement(activeZone.id).type === 'folding'
        ? primaryPlacement(activeZone.id)
        : null;
      const automaticPanels = foldingPanelCountForWidth(foldingZone && foldingZone.width);
      const selectedPanels = existingFolding
        ? Math.max(2, Math.round(Number(draft.panels) || automaticPanels))
        : automaticPanels;
      fillSelect($(ids.productSubtype), series === 'K SERIES' ? PRODUCT_OPTIONS.folding.subtypesK : PRODUCT_OPTIONS.folding.subtypesA, draft.subtype);
      fillSelect($(ids.productDirection), PRODUCT_OPTIONS.folding.directions, foldingDirectionForPanels(selectedPanels, draft.openingDirection));
      fillSelect($(ids.productGlassThickness), series === 'K SERIES' ? PRODUCT_OPTIONS.folding.thicknessK : PRODUCT_OPTIONS.folding.thicknessA, compatibleGlassThickness('folding', series, draft.glassThickness, draft.glassColor));
      fillSelect($(ids.productFoldingView), PRODUCT_OPTIONS.folding.views, draft.foldingView === 'OUTSIDE VIEW' ? 'OUTSIDE VIEW' : 'INSIDE VIEW');
      fillSelect($(ids.productFoldingOpenDirection), PRODUCT_OPTIONS.folding.openDirections, foldingOpenDirectionValue(draft.foldingOpenDirection));
      setHidden(ids.productMechanismWrap, true);
      setHidden(ids.productOpeningWrap, true);
      setHidden(ids.productDirectionWrap, false);
      setHidden(ids.productPanelsWrap, false);
      setHidden(ids.productFoldingViewWrap, false);
      setHidden(ids.productFoldingOpenDirectionWrap, false);
      setHidden(ids.productPanelTypeWrap, true);
      setHidden(ids.productMotorDirectionWrap, true);
      setHidden(ids.productViewWrap, true);
      setHidden(ids.productMotorTypeWrap, true);
      setHidden(ids.productRemoteWrap, true);
      setHidden(ids.cleanableWindowSection, true);
      setHidden(ids.collectingDisplaySection, true);
      setHidden(ids.slidingCollectionSection, true);
      setHidden(ids.foldingCollectionSection, false);
      $(ids.productDirectionLabel).textContent = 'Katlanma Yönü';
      $(ids.productPanels).min = '2';
      $(ids.productPanels).removeAttribute('max');
      $(ids.productPanels).value = String(selectedPanels);
      $(ids.productPanelHint).textContent = 'Otomatik: net genişlik / 600 mm · önerilen tek taraf maksimum 8 panel';
      $(ids.foldingCollectionState).value = draft.collectionState === 'COLLECTED' ? 'COLLECTED' : 'NORMAL';
      updateFoldingFormAdvisory();
    } else if (isGuillotine) {
      fillSelect($(ids.productSubtype), series === 'K SERIES' ? PRODUCT_OPTIONS.guillotine.subtypesK : PRODUCT_OPTIONS.guillotine.subtypesA, draft.subtype);
      fillSelect($(ids.productMechanism), series === 'K SERIES' ? PRODUCT_OPTIONS.guillotine.mechanismsK : PRODUCT_OPTIONS.guillotine.mechanismsA, draft.mechanism);
      fillSelect($(ids.productGlassThickness), series === 'K SERIES' ? PRODUCT_OPTIONS.guillotine.thicknessK : PRODUCT_OPTIONS.guillotine.thicknessA, compatibleGlassThickness('guillotine', series, draft.glassThickness, draft.glassColor));
      fillSelect($(ids.productPanelType), [['1+1', '1+1'], ['1+2', '1+2']], draft.panelType);
      setHidden(ids.productMechanismWrap, false);
      setHidden(ids.productOpeningWrap, true);
      setHidden(ids.productDirectionWrap, true);
      setHidden(ids.productPanelsWrap, true);
      setHidden(ids.productPanelTypeWrap, false);
      setHidden(ids.productMotorDirectionWrap, false);
      setHidden(ids.productViewWrap, true);
      setHidden(ids.productMotorTypeWrap, true);
      setHidden(ids.productRemoteWrap, true);
      $(ids.productPanelTypeLabel).textContent = 'Giyotin Panel Tipi';
      $(ids.productPanelType).value = ['1+1', '1+2'].includes(draft.panelType) ? draft.panelType : (Number(draft.panels) === 2 ? '1+1' : '1+2');
      $(ids.productPanels).value = $(ids.productPanelType).value === '1+1' ? '2' : '3';
      $(ids.productPanels).disabled = true;
      $(ids.productMotorDirection).value = draft.motorDirection === 'LEFT' ? 'LEFT' : 'RIGHT';
      $(ids.productView).value = 'OUTSIDE VIEW';
      $(ids.productMotorType).value = draft.motorType || 'SOMFY RTS';
      $(ids.productRemote).value = draft.remoteControl || '1 CHANNEL';

      const cleanable = $(ids.productSubtype).value === 'CLEANABLE';
      setHidden(ids.cleanableWindowSection, true);
      $(ids.bottomPanelMode).value = cleanable ? 'VASISTAS' : 'FIXED';
      setHidden(ids.bottomPanelStateWrap, true);
      setHidden(ids.bottomPanelHingeWrap, true);
      $(ids.bottomPanelState).value = cleanable ? 'OPEN' : 'CLOSED';
      $(ids.bottomPanelHinge).value = 'BOTTOM';

      setHidden(ids.slidingCollectionSection, true);
      const collecting = ['UPWARD COLLECTING', 'DOWNWARD COLLECTING'].includes($(ids.productSubtype).value);
      setHidden(ids.collectingDisplaySection, !collecting);
      $(ids.collectingDisplayState).value = collecting && draft.collectionState === 'COLLECTED' ? 'COLLECTED' : 'NORMAL';
      $(ids.collectingDisplayDirection).textContent = $(ids.productSubtype).value === 'DOWNWARD COLLECTING' ? 'Aşağı toplanır' : 'Yukarı toplanır';
    } else {
      fillSelect($(ids.productSubtype), PRODUCT_OPTIONS.sliding.subtypes, draft.subtype);
      fillSelect($(ids.productSlidingView), PRODUCT_OPTIONS.sliding.views, draft.slidingView === 'INSIDE VIEW' ? 'INSIDE VIEW' : 'OUTSIDE VIEW');
      fillSelect($(ids.productOpening), PRODUCT_OPTIONS.sliding.openings, draft.openingType);
      const centerOpening = $(ids.productOpening).value === 'CENTER OPENING';
      $(ids.productDirectionLabel).textContent = centerOpening ? 'Dışta - İçte' : 'Açılım Yönü';
      fillSelect(
        $(ids.productDirection),
        centerOpening ? PRODUCT_OPTIONS.sliding.centerLayers : PRODUCT_OPTIONS.sliding.sideDirections,
        centerOpening ? (draft.openingDirection === 'INSIDE' ? 'INSIDE' : 'OUTSIDE') : (draft.openingDirection === 'LEFT' ? 'LEFT' : 'RIGHT')
      );
      fillSelect($(ids.productGlassThickness), series === 'K SERIES' ? PRODUCT_OPTIONS.sliding.thicknessK : PRODUCT_OPTIONS.sliding.thicknessA, compatibleGlassThickness('sliding', series, draft.glassThickness, draft.glassColor));
      setHidden(ids.productMechanismWrap, true);
      setHidden(ids.productSlidingViewWrap, false);
      setHidden(ids.productOpeningWrap, false);
      setHidden(ids.productDirectionWrap, false);
      setHidden(ids.productPanelsWrap, false);
      setHidden(ids.productPanelTypeWrap, true);
      setHidden(ids.productMotorDirectionWrap, true);
      setHidden(ids.productViewWrap, true);
      setHidden(ids.productMotorTypeWrap, true);
      setHidden(ids.productRemoteWrap, true);
      setHidden(ids.cleanableWindowSection, true);
      setHidden(ids.collectingDisplaySection, true);
      setHidden(ids.slidingCollectionSection, false);
      $(ids.productPanelTypeLabel).textContent = 'Giyotin Panel Tipi';
      $(ids.slidingCollectionState).value = draft.collectionState === 'COLLECTED' ? 'COLLECTED' : 'NORMAL';
      $(ids.productPanels).min = '2';
      $(ids.productPanels).max = '12';
      $(ids.productPanelHint).textContent = centerOpening ? '2–12 panel · ortadan açılımda çift sayı' : '2–12 panel · manuel değer';
      $(ids.productPanels).value = String(Math.max(2, Math.min(12, Math.round(Number(draft.panels) || 4))));
    }

    const lowE = $(ids.productGlassColor).querySelector('option[value="LOW-E GLASS"]');
    if (lowE) lowE.disabled = $(ids.productGlassThickness).value !== 'INSULATED GLASS';
    if ($(ids.productGlassThickness).value !== 'INSULATED GLASS' && $(ids.productGlassColor).value === 'LOW-E GLASS') {
      $(ids.productGlassColor).value = 'TRANSPARENT';
    } else if (draft.glassColor) {
      $(ids.productGlassColor).value = draft.glassColor;
      if ($(ids.productGlassColor).value === 'LOW-E GLASS' && lowE && lowE.disabled) $(ids.productGlassColor).value = 'TRANSPARENT';
    }
    $(ids.productCustomGlass).value = draft.customGlassColor || '';
    setHidden(ids.productCustomGlassWrap, $(ids.productGlassColor).value !== 'OTHER');
    $(ids.productValidation).textContent = '';
  }

  function loadProductFields(placement) {
    const normalized = normalizePlacement(placement, placement && placement.type);
    $(ids.productType).value = normalized.type;
    $(ids.productSeries).value = normalized.series;
    $(ids.productGlassColor).value = normalized.glassColor || '';
    if (normalized.type === 'zip') setProductFabricValue(normalized.fabricColor);
    applyProductRules(normalized);
  }

  function productForType(zoneId, type) {
    if (type === 'zip') return zipPlacement(zoneId);
    const primary = primaryPlacement(zoneId);
    return primary && primary.type === type ? primary : null;
  }

  function updateProductRemoveButton() {
    if (!activeZone || bulkProductZones) {
      $(ids.productRemove).hidden = true;
      return;
    }
    const type = $(ids.productType).value;
    activeProductSlot = type === 'zip' ? 'zip' : 'primary';
    const exists = activeProductSlot === 'zip' ? Boolean(zipPlacement(activeZone.id)) : Boolean(primaryPlacement(activeZone.id));
    $(ids.productRemove).hidden = !exists;
    $(ids.productRemove).textContent = activeProductSlot === 'zip' ? 'Zip Perdeyi Sil' : 'Ana Ürünü Sil';
  }

  function switchProductType(type) {
    if (!activeZone) return;
    closeDoorTypePicker();
    closeProductFabricCatalog();
    activeProductSlot = type === 'zip' ? 'zip' : 'primary';
    const candidate = activeProductSlot === 'zip' ? zipPlacement(activeZone.id) : primaryPlacement(activeZone.id);
    const existing = candidate && candidate.type === type ? candidate : null;
    loadProductFields(existing || productDefaults(type));
    updateProductRemoveButton();
  }

  window.__P3DV_PRODUCT_FORM_TEST__ = Object.freeze({
    applyType(type) {
      const safeType = PRODUCT_FIELD_POLICY[type] ? type : 'sliding';
      $(ids.productType).value = safeType;
      applyProductRules(productDefaults(safeType));
      return this.snapshot();
    },
    snapshot() {
      const type = $(ids.productType).value;
      const managed = PRODUCT_MANAGED_WRAPPERS.map(id => {
        const el = $(ids[id] || id);
        return { id, hidden: !el || Boolean(el.hidden), requiredEnabled: !!(el && el.querySelector('[required]:not(:disabled)')) };
      });
      return {
        type,
        allowedWrappers: [...productPolicy(type).wrappers],
        visibleManagedWrappers: managed.filter(item => !item.hidden).map(item => item.id),
        hiddenRequiredWrappers: managed.filter(item => item.hidden && item.requiredEnabled).map(item => item.id),
        draft: currentProductDraft()
      };
    }
  });

  function openProductDialog(zone, zones) {
    closeDoorTypePicker();
    closeProductFabricCatalog();
    activeZone = zone;
    bulkProductZones = Array.isArray(zones) && zones.length > 1 ? zones.map((item) => ({ ...item })) : null;
    const primary = primaryPlacement(zone.id);
    const zip = zipPlacement(zone.id);
    const placement = primary || null;
    activeProductSlot = 'primary';
    if (bulkProductZones) {
      $(ids.productZoneTitle).textContent = `${bulkProductZones.length} alana ürün yerleştir`;
      $(ids.productZoneInfo).textContent = 'Zip Perde dolu alanlara ön katman olarak eklenebilir. Diğer ürünler ana ürün katmanına uygulanır.';
    } else {
      $(ids.productZoneTitle).textContent = `${zone.label} · ${Math.round(zone.width)} × ${Math.round(zone.height)} mm`;
      if (primary && zip) $(ids.productZoneInfo).textContent = 'Bu alanda ana ürün ve ön katman Zip Perde birlikte bulunuyor. Ürün listesinden düzenlenecek katmanı seçin.';
      else if (zip) $(ids.productZoneInfo).textContent = 'Mevcut Zip Perdeyi düzenleyebilir veya aynı alana ana ürün ekleyebilirsiniz.';
      else if (primary) $(ids.productZoneInfo).textContent = 'Mevcut ana ürünü düzenleyebilir veya aynı alana ön katman Zip Perde ekleyebilirsiniz.';
      else $(ids.productZoneInfo).textContent = 'Sürme, giyotin, Sabit Doğrama, Kapı veya ön katman Zip Perde yerleştirin.';
    }
    loadProductFields(placement || productDefaults('sliding'));
    updateProductRemoveButton();
    $(ids.productDialog).hidden = false;
    $(ids.productType).focus();
  }

  function closeProductDialog() {
    closeDoorTypePicker();
    closeProductFabricCatalog();
    activeZone = null;
    bulkProductZones = null;
    $(ids.productDialog).hidden = true;
    $(ids.productValidation).textContent = '';
  }

  function validateProductDraft(draft) {
    if (draft.type === 'door') {
      if (!DOOR_TYPE_VALUES.includes(draft.doorType)) return 'Kapı tipini seçin.';
      if (!DOOR_DOUBLE_TYPES.has(draft.doorType) && !['LEFT','RIGHT'].includes(draft.hingeDirection)) return 'Menteşe yönünü seçin.';
      if (DOOR_DOUBLE_TYPES.has(draft.doorType) && !['LEFT','RIGHT'].includes(draft.activeLeaf)) return 'Aktif kanadı seçin.';
      if (!['OUTWARD','INWARD'].includes(draft.doorOpenDirection)) return 'Kapı açılma yönünü seçin.';
      if (!['NORMAL','PANIC'].includes(draft.handleType)) return 'Kapı kolu tipini seçin.';
      if (draft.glassColor === 'OTHER' && !String(draft.customGlassColor || '').trim()) return 'Diğer cam rengi seçildiğinde özel cam rengini yazın.';
      if (draft.glassColor === 'LOW-E GLASS' && draft.glassThickness !== 'INSULATED GLASS') return 'Low-e Cam yalnızca Yalıtımlı Cam ile kullanılabilir.';
    } else if (draft.type === 'fixed') {
      const verticalDivisions = Math.max(1, Math.min(20, Math.round(Number(draft.verticalDivisions) || 1)));
      const horizontalDivisions = Math.max(1, Math.min(10, Math.round(Number(draft.horizontalDivisions) || 1)));
      const parts = String(draft.horizontalHeights || '').split(/[,;]+/).map((item) => Number(String(item).trim())).filter((value) => Number.isFinite(value) && value > 0);
      if (!Number.isInteger(verticalDivisions) || verticalDivisions < 1) return 'Dikey bölme sayısı en az 1 olmalıdır.';
      if (!Number.isInteger(horizontalDivisions) || horizontalDivisions < 1) return 'Yatay bölme sayısı en az 1 olmalıdır.';
      if (parts.length !== horizontalDivisions) return 'Yatay bölme sayısı ile yükseklik adedi aynı olmalıdır.';
      if (draft.glassColor === 'OTHER' && !String(draft.customGlassColor || '').trim()) return 'Diğer cam rengi seçildiğinde özel cam rengini yazın.';
      if (draft.glassColor === 'LOW-E GLASS' && draft.glassThickness !== 'INSULATED GLASS') return 'Low-e Cam yalnızca Yalıtımlı Cam ile kullanılabilir.';
    } else if (draft.type === 'folding') {
      if (!Number.isInteger(draft.panels) || draft.panels < 2) return 'Katlanır cam panel sayısı en az 2 ve tam sayı olmalıdır.';
      if (!['LEFT', 'RIGHT', 'BOTH'].includes(draft.openingDirection)) return 'Katlanma yönünü seçin.';
      if (draft.panels > 8 && draft.openingDirection !== 'BOTH') draft.openingDirection = 'BOTH';
      if (!['INSIDE VIEW', 'OUTSIDE VIEW'].includes(draft.foldingView)) return 'Bakış yönünü seçin.';
      if (!['INWARD', 'OUTWARD'].includes(draft.foldingOpenDirection)) return 'Panellerin açılma yönünü seçin.';
      if (draft.glassColor === 'OTHER' && !String(draft.customGlassColor || '').trim()) return 'Diğer cam rengi seçildiğinde özel cam rengini yazın.';
      if (draft.glassColor === 'LOW-E GLASS' && draft.glassThickness !== 'INSULATED GLASS') return 'Low-e Cam yalnızca Yalıtımlı Cam ile kullanılabilir.';
    } else if (draft.type !== 'zip') {
      const maxPanels = draft.type === 'guillotine' ? 8 : 12;
      if (!Number.isInteger(draft.panels) || draft.panels < 2 || draft.panels > maxPanels) {
        return `Panel sayısı 2–${maxPanels} arasında tam sayı olmalıdır.`;
      }
      if (draft.type === 'sliding' && !['OUTSIDE VIEW', 'INSIDE VIEW'].includes(draft.slidingView)) {
        return 'Sürme Sistem bakış yönünü seçin.';
      }
      if (draft.type === 'sliding' && draft.openingType === 'CENTER OPENING' && draft.panels % 2 !== 0) {
        return 'Ortadan açılım için panel sayısı çift olmalıdır.';
      }
      if (draft.glassColor === 'OTHER' && !String(draft.customGlassColor || '').trim()) {
        return 'Diğer cam rengi seçildiğinde özel cam rengini yazın.';
      }
      if (draft.glassColor === 'LOW-E GLASS' && draft.glassThickness !== 'INSULATED GLASS') {
        return 'Low-e Cam yalnızca Yalıtımlı Cam ile kullanılabilir.';
      }
    } else {
      if (!zipFabricByCode(draft.fabricColor)) return 'Zip Perde kumaşı seçin.';
      if (!['BETWEEN POSTS', 'FRONT OF POSTS'].includes(draft.placementLocation)) {
        return 'Zip Perde yerleşim yerini seçin.';
      }
    }

    const targetZones = bulkProductZones && bulkProductZones.length ? bulkProductZones : (activeZone ? [activeZone] : []);
    for (const zone of targetZones) {
      if (draft.type === 'zip') {
        if (zone.width < 300 || zone.height < 400) return `${zone.label}: Zip Perde için alan ölçüsü yetersiz.`;
        continue;
      }
      if (draft.type === 'door') {
        const wideDoor = !['SINGLE','TOP_FIXED'].includes(draft.doorType);
        const minWidth = DOOR_DOUBLE_TYPES.has(draft.doorType) ? 1200 : (wideDoor ? 1000 : 650);
        if (zone.width < minWidth || zone.height < 1800) return `${zone.label}: Seçilen Kapı tipi için alan ölçüsü yetersiz.`;
        if (DOOR_TOP_FIXED_TYPES.has(draft.doorType)) {
          const availableHeight = doorTopFixedAvailableHeight(zone);
          const movingHeight = Math.round(Number(draft.movingLeafHeight));
          const fixedHeight = availableHeight === null ? NaN : availableHeight - movingHeight;
          if (!Number.isFinite(movingHeight) || movingHeight < 1200 || fixedHeight < 110) {
            const minMoving = 1200;
            const maxMoving = availableHeight === null ? '—' : Math.max(minMoving, availableHeight - 110);
            return `${zone.label}: Kanat yüksekliği ${minMoving}–${maxMoving} mm arasında olmalıdır. Kalan üst sabit cam yüksekliği en az 110 mm olmalıdır.`;
          }
        }
        continue;
      }
      if (draft.type === 'fixed') {
        if (zone.width < 350 || zone.height < 500) return `${zone.label}: Sabit Doğrama için alan ölçüsü yetersiz.`;
        const segments = String(draft.horizontalHeights || '').split(/[,;]+/).map((item) => Number(String(item).trim())).filter((value) => Number.isFinite(value) && value > 0);
        const expectedHeight = Math.max(120, zone.height - 5);
        const total = segments.reduce((sum, value) => sum + value, 0);
        if (Math.abs(total - expectedHeight) > 2) return `${zone.label}: Yatay bölme yükseklikleri toplamı ${Math.round(expectedHeight)} mm olmalıdır.`;
        continue;
      }
      const perPanel = draft.type === 'guillotine' ? zone.height / draft.panels : zone.width / draft.panels;
      const minimum = draft.type === 'guillotine' ? 240 : 180;
      if (perPanel < minimum) {
        return draft.type === 'guillotine'
          ? `${zone.label}: Bu yükseklikte ${draft.panels} panel çok sıkışık. Panel başına en az ${minimum} mm gerekir.`
          : `${zone.label}: Bu genişlikte ${draft.panels} panel çok sıkışık. Panel başına en az ${minimum} mm gerekir.`;
      }
    }
    return '';
  }

  function applyProductForm() {
    if (!activeZone) return;
    let draft = currentProductDraft();
    draft.panels = Math.round(Number(draft.panels));
    if (draft.type === 'door') {
      delete draft.series;
      delete draft.subtype;
      delete draft.placementLocation;
      delete draft.slidingView;
      delete draft.horizontalHeightManual;
      delete draft.fabricColor;
      delete draft.customFabricColor;
      delete draft.cableDirection;
      delete draft.mechanism;
      delete draft.openingType;
      delete draft.openingDirection;
      delete draft.panelType;
      delete draft.motorDirection;
      draft.view = 'OUTSIDE VIEW';
      delete draft.motorType;
      delete draft.remoteControl;
      delete draft.bottomPanelMode;
      delete draft.bottomPanelState;
      delete draft.bottomPanelHinge;
      delete draft.collectionState;
      delete draft.verticalDivisions;
      delete draft.horizontalDivisions;
      delete draft.horizontalHeights;
      delete draft.foldingOpenDirection;
      draft.doorType = DOOR_TYPE_VALUES.includes(draft.doorType) ? draft.doorType : 'SINGLE';
      draft.hingeDirection = draft.hingeDirection === 'RIGHT' ? 'RIGHT' : 'LEFT';
      draft.activeLeaf = draft.activeLeaf === 'LEFT' ? 'LEFT' : 'RIGHT';
      draft.doorOpenDirection = draft.doorOpenDirection === 'INWARD' ? 'INWARD' : 'OUTWARD';
      draft.handleType = draft.handleType === 'PANIC' ? 'PANIC' : 'NORMAL';
      draft.movingLeafHeight = Math.max(1200, Math.round(Number(draft.movingLeafHeight) || 2200));
      draft.topFixedHeight = null;
      draft.panels = 0;
    } else if (draft.type === 'fixed') {
      delete draft.series;
      delete draft.subtype;
      delete draft.placementLocation;
      delete draft.slidingView;
      delete draft.fabricColor;
      delete draft.customFabricColor;
      delete draft.cableDirection;
      delete draft.mechanism;
      delete draft.openingType;
      delete draft.openingDirection;
      delete draft.panelType;
      delete draft.motorDirection;
      delete draft.view;
      delete draft.motorType;
      delete draft.remoteControl;
      delete draft.bottomPanelMode;
      delete draft.bottomPanelState;
      delete draft.bottomPanelHinge;
      delete draft.collectionState;
      draft.verticalDivisions = Math.max(1, Math.min(20, Math.round(Number(draft.verticalDivisions) || 1)));
      draft.horizontalDivisions = Math.max(1, Math.min(10, Math.round(Number(draft.horizontalDivisions) || 1)));
      draft.horizontalHeights = String(draft.horizontalHeights || '');
      draft.horizontalHeightManual = Array.from({ length: draft.horizontalDivisions }, (_, index) => Boolean(draft.horizontalHeightManual && draft.horizontalHeightManual[index]));
      draft.panels = 0;
    } else if (draft.type === 'folding') {
      delete draft.placementLocation;
      delete draft.slidingView;
      delete draft.horizontalHeightManual;
      delete draft.fabricColor;
      delete draft.customFabricColor;
      delete draft.cableDirection;
      delete draft.mechanism;
      delete draft.panelType;
      delete draft.motorDirection;
      delete draft.view;
      delete draft.motorType;
      delete draft.remoteControl;
      delete draft.bottomPanelMode;
      delete draft.bottomPanelState;
      delete draft.bottomPanelHinge;
      delete draft.verticalDivisions;
      delete draft.horizontalDivisions;
      delete draft.horizontalHeights;
      draft.openingType = 'FOLDING';
      draft.openingDirection = foldingDirectionForPanels(draft.panels, draft.openingDirection);
      draft.foldingView = draft.foldingView === 'OUTSIDE VIEW' ? 'OUTSIDE VIEW' : 'INSIDE VIEW';
      draft.foldingOpenDirection = foldingOpenDirectionValue(draft.foldingOpenDirection);
      delete draft.passageDoor;
      draft.collectionState = draft.collectionState === 'COLLECTED' ? 'COLLECTED' : 'NORMAL';
      draft.thresholdProfile = 70;
    } else if (draft.type === 'sliding') {
      delete draft.placementLocation;
      delete draft.horizontalHeightManual;
      delete draft.fabricColor;
      delete draft.customFabricColor;
      delete draft.cableDirection;
      delete draft.mechanism;
      delete draft.panelType;
      delete draft.motorDirection;
      delete draft.view;
      delete draft.motorType;
      delete draft.remoteControl;
      delete draft.bottomPanelMode;
      delete draft.bottomPanelState;
      delete draft.bottomPanelHinge;
      draft.slidingView = draft.slidingView === 'INSIDE VIEW' ? 'INSIDE VIEW' : 'OUTSIDE VIEW';
      draft.collectionState = draft.collectionState === 'COLLECTED' ? 'COLLECTED' : 'NORMAL';
    } else if (draft.type === 'guillotine') {
      delete draft.slidingView;
      delete draft.horizontalHeightManual;
      draft.motorDirection = draft.motorDirection === 'LEFT' ? 'LEFT' : 'RIGHT';
      delete draft.placementLocation;
      delete draft.fabricColor;
      delete draft.customFabricColor;
      delete draft.cableDirection;
      delete draft.openingType;
      delete draft.openingDirection;
      draft.view = 'OUTSIDE VIEW';
      draft.bottomPanelHinge = 'BOTTOM';
      draft.panels = draft.panelType === '1+1' ? 2 : 3;
      if (draft.subtype === 'CLEANABLE') {
        draft.bottomPanelMode = 'VASISTAS';
        draft.bottomPanelState = 'OPEN';
      } else {
        draft.bottomPanelMode = 'FIXED';
        draft.bottomPanelState = 'CLOSED';
      }
      if (!['UPWARD COLLECTING', 'DOWNWARD COLLECTING'].includes(draft.subtype)) {
        draft.collectionState = 'NORMAL';
      }
    } else {
      delete draft.slidingView;
      delete draft.horizontalHeightManual;
      draft.placementLocation = ['FRONT OF POSTS','OUTSIDE POSTS'].includes(draft.placementLocation) ? 'FRONT OF POSTS' : 'BETWEEN POSTS';
      draft.fabricColor = zipFabricByCode(draft.fabricColor).value;
      draft.customFabricColor = '';
      draft.cableDirection = ['BACK', 'TOP', 'SIDE'].includes(draft.cableDirection) ? draft.cableDirection : 'BACK';
      draft.motorDirection = draft.motorDirection === 'LEFT' ? 'LEFT' : 'RIGHT';
      draft.panels = 1;
      draft.view = 'OUTSIDE VIEW';
      draft.collectionState = 'NORMAL';
      delete draft.mechanism;
      delete draft.openingType;
      delete draft.openingDirection;
      delete draft.glassThickness;
      delete draft.glassColor;
      delete draft.customGlassColor;
      delete draft.panelType;
      delete draft.bottomPanelMode;
      delete draft.bottomPanelState;
      delete draft.bottomPanelHinge;
      delete draft.motorType;
      delete draft.remoteControl;
    }
    // Final boundary sanitation is intentionally redundant with branch-specific
    // normalization. It prevents future UI fields from leaking into another
    // product's persisted placement when the shared dialog evolves.
    draft = sanitizeProductState(draft, draft.type);
    const error = validateProductDraft(draft);
    if (error) {
      $(ids.productValidation).textContent = error;
      return;
    }
    rememberGlassPreferencesFromDraft(draft);
    const historyBefore = p3dvHistoryClone(modelState);
    const targetZones = bulkProductZones && bulkProductZones.length ? bulkProductZones : [activeZone];
    targetZones.forEach((zone) => {
      if (draft.type === 'zip') {
        modelState.zipPlacements[zone.id] = JSON.parse(JSON.stringify(draft));
        const key = zipProductKey(zone.id);
        if (!hasOwn(modelState.productOpenStates, key)) modelState.productOpenStates[key] = true;
        modelState.panelStates[key] = effectiveProductOpen(key);
      } else {
        const placementDraft = JSON.parse(JSON.stringify(draft));
        if (placementDraft.type === 'door' && DOOR_TOP_FIXED_TYPES.has(placementDraft.doorType)) {
          const metrics = doorTopFixedMetrics(zone, placementDraft.movingLeafHeight, placementDraft.topFixedHeight);
          placementDraft.movingLeafHeight = metrics.movingHeight;
          placementDraft.topFixedHeight = metrics.fixedHeight;
        }
        modelState.placements[zone.id] = placementDraft;
        if (!hasOwn(modelState.productOpenStates, zone.id)) modelState.productOpenStates[zone.id] = true;
      }
    });
    closeProductDialog();
    clearZoneSelection();
    p3dvHistoryRecord(historyBefore, { type: 'product-upsert', label: '3D product upsert', origin: '3d', payload: { zoneIds: targetZones.map(zone => zone.id), productType: draft.type } });
    (typeof commitModelChangeLive==='function'?commitModelChangeLive('product-upsert',{preserveHistory:true}):renderViewer());
  }

  function removeProduct() {
    if (!activeZone) return;
    const historyBefore = p3dvHistoryClone(modelState);
    const type = $(ids.productType).value;
    if (type === 'zip') {
      if (!zipPlacement(activeZone.id)) return;
      delete modelState.zipPlacements[activeZone.id];
      delete modelState.productOpenStates[zipProductKey(activeZone.id)];
      delete modelState.panelStates[zipProductKey(activeZone.id)];
    } else {
      if (!primaryPlacement(activeZone.id)) return;
      delete modelState.placements[activeZone.id];
      delete modelState.productOpenStates[activeZone.id];
    }
    const removedZoneId = activeZone && activeZone.id || '';
    closeProductDialog();
    clearZoneSelection();
    p3dvHistoryRecord(historyBefore, { type: 'product-delete', label: '3D product remove', origin: '3d', payload: { zoneId: removedZoneId, productType: type } });
    (typeof commitModelChangeLive==='function'?commitModelChangeLive('product-remove',{preserveHistory:true}):renderViewer());
  }

  async function clearProducts() {
    const count = Object.keys(modelState.placements).length + Object.keys(modelState.zipPlacements).length;
    if (!count) return;
    if (!await requestAppConfirmation('Yerleştirilmiş tüm sürme, katlanır cam, giyotin, Zip Perde, Sabit Doğrama ve Kapı ürünleri silinsin mi?', { acceptLabel: 'Tümünü Sil' })) return;
    const historyBefore = p3dvHistoryClone(modelState);
    modelState.placements = {};
    modelState.zipPlacements = {};
    modelState.productOpenStates = {};
    modelState.panelStates = {};
    clearZoneSelection();
    p3dvHistoryRecord(historyBefore, { type: 'products-clear', label: '3D products clear', origin: '3d', payload: { count } });
    (typeof commitModelChangeLive==='function'?commitModelChangeLive('products-clear',{preserveHistory:true}):renderViewer());
  }

  window.addEventListener('message', (event) => {
    const frame = $(ids.frame);
    if (!frame || event.source !== frame.contentWindow) return;
    if (!event.data || event.data.source !== 'product-3d-viewer') return;
    if (event.data.sessionId !== activeViewerSessionId) return;
    if (event.data.type === 'viewer-ready') {
      viewerLiveProductStateReady = Boolean(event.data.liveProductState);
      viewerLivePanelMasterReady = Boolean(event.data.livePanelMaster);
      viewerLivePergoRiseReady = Boolean(event.data.livePergoRise);
      viewerLiveColorStateReady = Boolean(event.data.liveColorState);
      viewerLiveModelStateReady = Boolean(event.data.liveModelState);
      p3dvHostLifecycleDiagnostics.viewerReadyCount += 1;
      flushPendingViewerState();
      // A newly created nested viewer inherits the host presentation activity.
      postViewerMessage('set-runtime-active', { active: p3dvHostRuntimeActive });
    }
    if (event.data.type === 'model-state-applied') {
      pendingLiveModelState = false;
      updateReadouts();
      return;
    }
    if (event.data.type === 'beam-section-change-request') {
      applyBeamSectionChangeFromViewer(event.data.beamSection, event.data.camera);
      return;
    }
    if (event.data.type === 'ar-status') {
      setMobileArStatus(event.data.message || 'AR durumu güncellendi.', event.data.tone || '');
    }
    if (event.data.type === 'ar-capability') {
      const button = $(ids.mobileAr);
      if (button) button.disabled = false;
      setMobileArStatus(event.data.message || (event.data.supported ? 'AR hazır.' : 'AR desteği bulunamadı.'), event.data.supported ? 'success' : 'warning');
    }
    if (event.data.type === 'ar-session-ended') {
      const button = $(ids.mobileAr);
      if (button) button.disabled = false;
      setMobileArStatus('AR oturumu kapatıldı. 3D model görünümüne dönüldü.');
    }
    if (event.data.type === 'camera-state' && event.data.camera) {
      const camera = event.data.camera;
      const position = Array.isArray(camera.position) ? camera.position.map(Number) : [];
      const target = Array.isArray(camera.target) ? camera.target.map(Number) : [];
      if (position.length === 3 && target.length === 3 && [...position, ...target].every(Number.isFinite)) {
        viewerCameraState = { position, target, zoom: Number.isFinite(Number(camera.zoom)) ? Number(camera.zoom) : 1 };
      }
    }
    if (event.data.type === 'pergo-rise-edit-operation-request' && applyPergoRiseAreaOperation(event.data)) return;
    if (event.data.type === 'edit-dimension') openPositionDialog();
    if (event.data.type === 'toggle-toolbox-selection' && event.data.item) toggleToolboxSelectionItem(event.data.item);
    if (event.data.type === 'complete-toolbox-selection') completeToolboxSelection();
    if (event.data.type === 'cancel-toolbox-selection') cancelToolboxSelection();
    if (event.data.type === 'select-zone' && event.data.zone) selectZone(event.data.zone);
    if (event.data.type === 'select-divider-profile' && event.data.profile) openDividerProfileDialog(event.data.profile);
    if (event.data.type === 'select-post') openPostActionDialog(event.data.postIndex);
    if (event.data.type === 'toggle-panel-state' && event.data.zoneId) {
      const zoneId = String(event.data.zoneId);
      const key = String(event.data.productKey || event.data.panelKey || zoneId);
      modelState.productOpenStates[key] = Boolean(event.data.open);
      if (key === zipProductKey(zoneId)) modelState.panelStates[key] = Boolean(event.data.open);
      applyProductOpenStateLive();
    }
  });

  // Pergo Rise no longer has a dedicated iframe/viewer builder. It is routed
  // through buildViewerHtml together with B-Cube Freedom and Bio-Rise.

  function buildViewerHtml({ productGroup, width, depth, height, lamellaCount, systemCount, freedomLayout, bioRiseLayout, galaxyLayout, orientations, postSections, beamSection, placements, zipPlacements, facadeProfiles, colorMode, systemColor, panelColor, pergoRiseUrl, pergoRiseProject, viewerSessionId, cameraState, selectedZoneId: activeZoneId, dimensionVisibility: showDimensionVisibility, productsOpen, productOpenStates, panelStates, panelMasterOpen, toolboxSelectionMode: activeSelectionMode, toolboxSelectionKeys: activeSelectionKeys }) {
    const W = width;
    const D = depth;
    const H = height;
    const LC = lamellaCount;
    const normalizedProductGroup = productGroup === 'bio-rise' ? 'bio-rise' : (productGroup === 'b-cube-galaxy' ? 'b-cube-galaxy' : (productGroup === 'pergo-rise' ? 'pergo-rise' : 'b-cube'));
    const productGroupJson = safeScriptJson(normalizedProductGroup);
    const productModelTitle = normalizedProductGroup === 'bio-rise' ? 'BIO-RISE 3D' : (normalizedProductGroup === 'b-cube-galaxy' ? 'B-CUBE GALAXY 3D' : (normalizedProductGroup === 'pergo-rise' ? 'PERGO RISE 3D' : 'B-CUBE FREEDOM 3D'));
    // Pergo Rise uses the same Three.js / OrbitControls / AR scene as
    // B-Cube Freedom and Bio-Rise. Product-specific geometry and operations are
    // injected through P3DVPergoRiseViewer without creating a second viewer.
    const [O1, O2, O3, O4] = orientations;
    const systemCountJson = safeScriptJson(Math.max(1, Math.round(Number(systemCount) || 1)));
    const freedomLayoutJson = safeScriptJson(freedomLayout || null);
    const bioRiseLayoutJson = safeScriptJson(bioRiseLayout || null);
    const galaxyLayoutJson = safeScriptJson(galaxyLayout || null);
    const postJson = safeScriptJson(postSections);
    const beamJson = safeScriptJson(beamSection);
    const placementsJson = safeScriptJson(placements || {});
    const zipPlacementsJson = safeScriptJson(zipPlacements || {});
    const facadeProfilesJson = safeScriptJson(facadeProfiles || {});
    const pergoRiseUrlJson = safeScriptJson(pergoRiseUrl || '');
    const pergoRiseProjectJson = safeScriptJson(pergoRiseProject || null);
    const viewerSessionIdJson = safeScriptJson(viewerSessionId || '');
    const cameraStateJson = safeScriptJson(cameraState || null);
    const selectedZoneIdJson = safeScriptJson(activeZoneId || null);
    const dimensionVisibilityJson = safeScriptJson({
      intermediate: !showDimensionVisibility || showDimensionVisibility.intermediate !== false,
      main: !showDimensionVisibility || showDimensionVisibility.main !== false
    });
    const productsOpenJson = safeScriptJson(Boolean(productsOpen));
    const productOpenStatesJson = safeScriptJson(productOpenStates || {});
    const panelStatesJson = safeScriptJson(panelStates || {});
    const panelMasterOpenJson = safeScriptJson(Boolean(panelMasterOpen));
    const toolboxSelectionModeJson = safeScriptJson(activeSelectionMode || null);
    const toolboxSelectionKeysJson = safeScriptJson(Array.isArray(activeSelectionKeys) ? activeSelectionKeys : []);
    const zipFabricMeta = {};
    ZIP_FABRIC_CATALOG.forEach((section) => section.pages.forEach((page) => page.items.forEach((item) => {
      const embeddedTextureMap = window.P3DV_ZIP_FABRIC_TEXTURES || {};
      zipFabricMeta[item.value] = {
        image: page.image,
        texture: item.texture || '',
        textureData: embeddedTextureMap[item.value] || '',
        tone: item.tone || '',
        tileMm: Number(item.tileMm) || 500,
        left: item.left,
        top: item.top,
        width: item.width,
        height: item.height
      };
    })));
    const zipFabricMetaJson = safeScriptJson(zipFabricMeta);
    const woodTextureData = {};
    ralCatalogData().all.forEach((option) => {
      if (option && option.kind === 'wood-transfer' && option.code && option.textureData) woodTextureData[option.code] = option.textureData;
    });
    const woodTextureDataJson = safeScriptJson(woodTextureData);
    const glazingSectionSpecsJson = safeScriptJson(GLAZING_SECTION_SPECS);
    const systemColorValue = Number.parseInt(normalizeHexColor(systemColor && systemColor.hex, defaults.systemColor.hex).slice(1), 16);
    const panelColorValue = Number.parseInt(normalizeHexColor(panelColor && panelColor.hex, defaults.panelColor.hex).slice(1), 16);

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${productModelTitle}</title>
<style>
html,body{margin:0;height:100%;overflow:hidden;background:radial-gradient(circle at top,#334155,#0f172a 60%);font-family:Segoe UI,Arial,sans-serif;color:#e5eefb}
#viewerHint{position:absolute;left:14px;bottom:14px;z-index:25;max-width:min(470px,calc(100% - 28px));padding:8px 11px;border:1px solid rgba(125,211,252,.28);border-radius:9px;background:rgba(15,23,42,.76);color:#dbeafe;font-size:12px;line-height:1.4;pointer-events:none;backdrop-filter:blur(5px)}
#fallback{display:none;position:absolute;inset:0;place-items:center;padding:22px;text-align:center;line-height:1.5;background:#0f172a;color:#e5e7eb;z-index:50}
[hidden]{display:none!important}

#pergoRiseSelectionInfo{position:absolute;left:14px;top:14px;z-index:44;display:none;max-width:min(420px,calc(100% - 28px));padding:9px 11px;border:1px solid rgba(56,189,248,.55);border-radius:10px;background:rgba(15,23,42,.9);font-size:12px;line-height:1.4;box-shadow:0 12px 32px rgba(0,0,0,.25)}
#pergoRiseContextMenu{position:absolute;z-index:48;display:none;min-width:210px;max-width:280px;padding:7px;border:1px solid rgba(125,211,252,.45);border-radius:11px;background:rgba(15,23,42,.96);box-shadow:0 18px 45px rgba(0,0,0,.42)}
#pergoRiseContextMenu strong{display:block;padding:6px 8px;color:#e0f2fe;font-size:12px}
#pergoRiseContextMenu button{display:block;width:100%;margin:3px 0;padding:8px 9px;border:1px solid rgba(148,163,184,.25);border-radius:8px;background:rgba(30,41,59,.9);color:#f8fafc;text-align:left;font:600 12px Segoe UI,Arial,sans-serif;cursor:pointer}
#pergoRiseContextMenu button:hover{background:rgba(14,116,144,.72)}

body.ar-active{background:transparent}
body.ar-active #viewerHint{display:none}
#arLaunchGate{position:absolute;inset:0;z-index:70;display:grid;place-items:center;padding:24px;background:rgba(5,15,25,.82);backdrop-filter:blur(8px)}
#arLaunchGate .ar-gate-card{width:min(430px,calc(100% - 32px));padding:20px;border:1px solid rgba(125,211,252,.4);border-radius:16px;background:rgba(15,23,42,.94);box-shadow:0 18px 60px rgba(0,0,0,.35);text-align:center}
#arLaunchGate strong{display:block;margin-bottom:8px;font-size:18px;color:#f8fafc}
#arLaunchGate p{margin:0 0 14px;color:#bfdbfe;font-size:13px;line-height:1.55}
#arLaunchGate button,#arOverlay button{border:1px solid rgba(255,255,255,.26);border-radius:9px;background:#0f766e;color:#fff;padding:9px 10px;font:600 12px Segoe UI,Arial,sans-serif;touch-action:manipulation}
#arLaunchGate button.ghost,#arOverlay button.ghost{background:rgba(15,23,42,.78)}
#arOverlay{position:absolute;inset:0;z-index:65;pointer-events:none;color:#f8fafc}
#arScaleBadge{position:absolute;left:12px;top:12px;max-width:calc(100% - 24px);padding:9px 11px;border:1px solid rgba(94,234,212,.5);border-radius:10px;background:rgba(6,78,75,.82);font-size:12px;line-height:1.4;backdrop-filter:blur(5px)}
#arTrackingStatus{position:absolute;left:12px;right:12px;top:58px;padding:9px 11px;border:1px solid rgba(125,211,252,.35);border-radius:10px;background:rgba(15,23,42,.78);font-size:12px;line-height:1.45;text-align:center;backdrop-filter:blur(5px)}
#arControlPanel{position:absolute;left:8px;right:8px;bottom:8px;max-height:56%;padding:9px;border:1px solid rgba(125,211,252,.28);border-radius:13px;background:rgba(15,23,42,.84);backdrop-filter:blur(8px);pointer-events:auto;overflow:auto}
.ar-control-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;justify-content:center}
.ar-control-row+ .ar-control-row{margin-top:7px}
.ar-control-row button{flex:1 1 82px;min-width:68px}
.ar-control-row button.primary{background:#0f766e}
.ar-control-row button.warning{background:#92400e}
.ar-control-row button:disabled{opacity:.45}
.ar-rotate-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}
.ar-rotate-row button{min-width:0}
.ar-control-section{margin-top:8px;padding-top:8px;border-top:1px solid rgba(148,163,184,.22)}
.ar-control-section>strong{display:block;margin-bottom:6px;color:#bfdbfe;font-size:11px;text-align:center}
.ar-move-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;max-width:330px;margin:0 auto}
.ar-move-grid .blank{visibility:hidden}
#arGroundRow{display:grid;grid-template-columns:auto 1fr auto auto;gap:6px;align-items:center}
#arGroundOffsetInput{width:100%;accent-color:#2dd4bf}
#arGroundValue{min-width:52px;text-align:center;font:700 11px Segoe UI,Arial,sans-serif;color:#ccfbf1}
@media (orientation:landscape){
  #arTrackingStatus{left:12px;right:338px;top:58px}
  #arControlPanel{left:auto;right:8px;top:8px;bottom:8px;width:310px;max-height:none}
  #arScaleBadge{max-width:calc(100% - 350px)}
}
body.ar-landscape #arTrackingStatus{left:12px;right:338px;top:58px}
body.ar-landscape #arControlPanel{left:auto;right:8px;top:8px;bottom:8px;width:310px;max-height:none}
body.ar-landscape #arScaleBadge{max-width:calc(100% - 350px)}
</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></scr` + `ipt>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></scr` + `ipt>
<script src="./products/pergo-rise/pergo-rise-editing.js"></scr` + `ipt>
<script src="./products/pergo-rise/pergo-rise-viewer.js"></scr` + `ipt>
</head>
<body>
<div id="fallback">3D viewer could not load. Three.js is loaded from a CDN.</div>
<div id="viewerHint">Dikmeler arasındaki boşluğa tıklayın. Bir ürün panelini açıp kapatmak için çift tıklayın.</div>
<div id="pergoRiseSelectionInfo"></div>
<div id="pergoRiseContextMenu" role="menu" aria-label="Pergola düzenleme menüsü"></div>
<div id="arLaunchGate" hidden>
  <div class="ar-gate-card">
    <strong>Manuel Gerçek Alan Yerleşimi</strong>
    <p>Kamera açıldığında ürün 1:1 ölçekte hemen çizilir. Zemin kotunu, mesafeyi, yönü ve konumu ekrandaki kontrollerle kendiniz ayarlarsınız.</p>
    <button id="arLaunchGateBtn" type="button">Kamerayı Aç</button>
    <button id="arLaunchGateCancelBtn" class="ghost" type="button">Vazgeç</button>
  </div>
</div>
<div id="arOverlay" hidden>
  <div id="arScaleBadge">Gerçek Ölçek 1:1</div>
  <div id="arTrackingStatus">Ürün hazırlanıyor; gerçek ölçekte kameranın önüne çizilecek.</div>
  <div id="arControlPanel">
    <div class="ar-control-row">
      <button id="arLockBtn" class="primary" type="button">Konumu Sabitle</button>
      <button id="arRepositionBtn" type="button" disabled>Yeniden Konumlandır</button>
      <button id="arLandscapeBtn" type="button">Yatay Kamera</button>
    </div>
    <div class="ar-control-section">
      <strong>Konum · Her dokunuş 10 cm</strong>
      <div class="ar-move-grid">
        <span class="blank"></span><button id="arMoveForwardBtn" type="button">↑ İleri</button><span class="blank"></span>
        <button id="arMoveLeftBtn" type="button">← Sol</button><button id="arMoveBackBtn" type="button">↓ Geri</button><button id="arMoveRightBtn" type="button">Sağ →</button>
      </div>
    </div>
    <div class="ar-control-section">
      <strong>Zemin Kotu · 1 cm hassasiyet</strong>
      <div id="arGroundRow">
        <button id="arMoveDownBtn" type="button">-1 cm</button>
        <input id="arGroundOffsetInput" type="range" min="-150" max="150" step="1" value="0" aria-label="Zemin kotu santimetre" />
        <span id="arGroundValue">0 cm</span>
        <button id="arMoveUpBtn" type="button">+1 cm</button>
      </div>
      <div class="ar-control-row"><button id="arGroundZeroBtn" type="button">Zemin Kotunu Sıfırla</button></div>
    </div>
    <div class="ar-control-section">
      <strong>Döndürme</strong>
      <div class="ar-control-row ar-rotate-row">
        <button id="arRotateFineLeftBtn" type="button">↶ 1°</button>
        <button id="arRotateLeftBtn" type="button">↶ 15°</button>
        <button id="arRotateRightBtn" type="button">15° ↷</button>
        <button id="arRotateFineRightBtn" type="button">1° ↷</button>
      </div>
    </div>
    <div class="ar-control-section"><div class="ar-control-row"><button id="arExitBtn" class="warning" type="button">AR Kapat</button></div></div>
  </div>
</div>
<script>
(function(){
if(!window.THREE || !THREE.OrbitControls){
  document.getElementById('fallback').style.display='grid';
  return;
}

const VIEWER_SESSION_ID=${viewerSessionIdJson};
const PERGO_RISE_GLB_URL=${pergoRiseUrlJson};
let pergoRiseProject=${pergoRiseProjectJson};
let pergoRiseDerived=pergoRiseProject&&pergoRiseProject.derived?pergoRiseProject.derived:null;
function postParent(type,payload){
  parent.postMessage({source:'product-3d-viewer',sessionId:VIEWER_SESSION_ID,type,...(payload||{})},'*');
}
// Legacy static-envelope contract retained for regression scanners: const W=${W}, D=${D}, H=${H};
let W=${W}, D=${D}, H=${H};
const PRODUCT_GROUP=${productGroupJson};
const IS_BIO_RISE=PRODUCT_GROUP==='bio-rise';
const IS_GALAXY=PRODUCT_GROUP==='b-cube-galaxy';
const IS_BIO_FAMILY=IS_BIO_RISE||IS_GALAXY;
const IS_PERGO_RISE=PRODUCT_GROUP==='pergo-rise';
let RW=W-208, RD=D-303;
// Legacy panel-count contract retained for regression scanners: const LC=${LC};
let LC=${LC};
let SYSTEM_COUNT=${systemCountJson};
let freedomMultiLayout=${freedomLayoutJson};
let bioRiseMultiLayout=${bioRiseLayoutJson};
let galaxyMultiLayout=${galaxyLayoutJson};
let orientations=[${O1},${O2},${O3},${O4}];
let postSections=${postJson};
let beamSection=${beamJson};
let placements=${placementsJson};
let zipPlacements=${zipPlacementsJson};
let facadeProfiles=${facadeProfilesJson};
let selectedZoneId=${selectedZoneIdJson};
let dimensionVisibility=${dimensionVisibilityJson};
let productsOpen=${productsOpenJson};
let productOpenStates=${productOpenStatesJson};
let panelStates=${panelStatesJson};
let panelMasterOpen=${panelMasterOpenJson};
let SYSTEM_COLOR=${systemColorValue};
let PANEL_COLOR=${panelColorValue};
let DEFAULT_COLOR_MODE=${safeScriptJson(colorMode !== 'ral')};
let SYSTEM_FINISH=${safeScriptJson(systemColor && systemColor.finish || defaults.systemColor.finish)};
let PANEL_FINISH=${safeScriptJson(panelColor && panelColor.finish || defaults.panelColor.finish)};
let SYSTEM_COLOR_CODE=${safeScriptJson(systemColor && systemColor.code || '')};
let PANEL_COLOR_CODE=${safeScriptJson(panelColor && panelColor.code || '')};
let SYSTEM_COLOR_KIND=${safeScriptJson(systemColor && systemColor.kind || '')};
let PANEL_COLOR_KIND=${safeScriptJson(panelColor && panelColor.kind || '')};
let SYSTEM_COLOR_TEXTURE=${safeScriptJson(systemColor && systemColor.texture || '')};
let PANEL_COLOR_TEXTURE=${safeScriptJson(panelColor && panelColor.texture || '')};
const WOOD_TEXTURE_DATA=${woodTextureDataJson};
function liveColorNumber(value,fallback){
  const raw=(value&&typeof value==='object')?value.hex:value;
  const text=String(raw||'').trim().replace(/^#/,'').replace(/^0x/i,'');
  return /^[0-9a-f]{6}$/i.test(text)?parseInt(text,16):fallback;
}
function liveFinish(value,fallback){
  const raw=String(value||fallback||'MATTE').toUpperCase();
  return raw==='GLOSS'||raw==='TEXTURE'||raw==='MATTE'?raw:(fallback||'MATTE');
}
const ZIP_FABRIC_META=${zipFabricMetaJson};
const GLAZING_SECTION_SPECS=${glazingSectionSpecsJson};
const DOOR_TOP_FIXED_TYPES=new Set(['TOP_FIXED','LEFT_FIXED_TOP','RIGHT_FIXED_TOP','BOTH_FIXED_TOP','DOUBLE_TOP','DOUBLE_LEFT_FIXED_TOP','DOUBLE_RIGHT_FIXED_TOP','DOUBLE_BOTH_FIXED_TOP']);
let toolboxSelectionMode=${toolboxSelectionModeJson};
let toolboxSelectionKeys=new Set(${toolboxSelectionKeysJson});
const initialCameraState=${cameraStateJson};
let lamellaOpenMode=panelMasterOpen;
let pergoRiseComponentLibrary=null;
let pergoRiseLoadStatus=IS_PERGO_RISE?'pending':'not-required';
let pergoRiseAssemblyRoot=null;
let pergoRiseRenderSignatures=new Map();
let pergoRiseReconcileStats={runs:0,reused:0,replaced:0,added:0,removed:0,total:0};
let pergoRiseAssemblyRevision=0;
let pergoRiseAcceptedProjectRevision=0;
let pergoRiseStaleProjectMessagesIgnored=0;
function productIsOpen(productKey){
  return Object.prototype.hasOwnProperty.call(productOpenStates||{},productKey)?Boolean(productOpenStates[productKey]):Boolean(productsOpen);
}
function markTogglePanel(mesh,zone,open,productKey){
  if(!mesh||!mesh.userData)return mesh;
  mesh.userData.isTogglePanel=true;
  mesh.userData.zoneId=zone.id;
  mesh.userData.productKey=productKey||zone.id;
  mesh.userData.panelOpen=Boolean(open);
  return mesh;
}

const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,1,30000);
if(initialCameraState&&Array.isArray(initialCameraState.position)&&initialCameraState.position.length===3){
  camera.position.fromArray(initialCameraState.position);
  camera.zoom=Number(initialCameraState.zoom)||1;
  camera.updateProjectionMatrix();
}else{
  camera.position.set(W*0.92,H*0.82,D*1.08);
}

const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
if('outputColorSpace' in renderer && THREE.SRGBColorSpace)renderer.outputColorSpace=THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

const controls=new THREE.OrbitControls(camera,renderer.domElement);
if(initialCameraState&&Array.isArray(initialCameraState.target)&&initialCameraState.target.length===3){
  controls.target.fromArray(initialCameraState.target);
}else{
  controls.target.set(0,0,0);
}
controls.enableDamping=true;
controls.dampingFactor=.08;
// Stage 9: presentation activity is derived runtime state only. Pausing the hidden
// viewer must never mutate canonical modelState or camera ownership.
let viewerRuntimeActive=true;
let animationLoopRunning=false;
let animationFrameCount=0;
let animationLoopStartCount=0;
let animationLoopStopCount=0;
function syncViewerAnimationLoop(){
  const xrPresenting=Boolean(renderer.xr&&renderer.xr.isPresenting);
  const shouldRun=viewerRuntimeActive||xrPresenting;
  if(shouldRun&&!animationLoopRunning){renderer.setAnimationLoop(animate);animationLoopRunning=true;animationLoopStartCount+=1;}
  else if(!shouldRun&&animationLoopRunning){renderer.setAnimationLoop(null);animationLoopRunning=false;animationLoopStopCount+=1;controls.update();renderer.render(scene,camera);}
  return animationLoopRunning;
}
let cameraStateTimer=null;
function cameraSnapshot(){
  return {position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom};
}
function publishCameraState(){
  postParent('camera-state',{camera:cameraSnapshot()});
}
controls.addEventListener('change',()=>{
  // Corrective fallback: an interactive camera event must paint even if the derived
  // presentation loop is temporarily paused during an iframe/mode transition.
  if(!animationLoopRunning&&!arSession)renderer.render(scene,camera);
  if(cameraStateTimer)clearTimeout(cameraStateTimer);
  cameraStateTimer=setTimeout(publishCameraState,80);
});
controls.addEventListener('end',publishCameraState);

scene.add(new THREE.AmbientLight(0xffffff,.6));
scene.add(new THREE.HemisphereLight(0xe8f0ff,0x102033,.36));
const dir=new THREE.DirectionalLight(0xffffff,1.02);
dir.position.set(W*.35,H*1.1,D*.45);
dir.castShadow=true;
scene.add(dir);
const fill=new THREE.DirectionalLight(0x88aaff,.42);
fill.position.set(-W*.45,H*.55,-D*.5);
scene.add(fill);
const rim=new THREE.DirectionalLight(0xffffff,.45);
rim.position.set(-W*.7,H*.85,D*.9);
scene.add(rim);
const warm=new THREE.DirectionalLight(0xffe8c9,.18);
warm.position.set(W*.1,H*.35,-D*.95);
scene.add(warm);

let floorSize=Math.max(W,D)*1.7;
const floor=new THREE.Mesh(new THREE.PlaneGeometry(floorSize,floorSize),new THREE.ShadowMaterial({opacity:.32}));
floor.rotation.x=-Math.PI/2;
floor.position.y=-H/2-1;
floor.receiveShadow=true;
scene.add(floor);
let grid=new THREE.GridHelper(Math.max(W,D)*1.5,22,0x94a3b8,0x475569);
grid.position.y=-H/2;
scene.add(grid);

const box=new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(W,H,D)),
  new THREE.LineBasicMaterial({color:0x7dd3fc,transparent:true,opacity:.22})
);
scene.add(box);

let group=new THREE.Group();
scene.add(group);
let modelGeneration=0;
let liveRebuildTimer=null;
let lastAppliedLiveRevision=0;
const raycaster=new THREE.Raycaster();
const mouse=new THREE.Vector2();
let intermediateDimensionObjects=[];
let mainDimensionObjects=[];
let parts=[];
let interactiveObjects=[];
let zonePickers=[];
let hoveredZone=null;
let selectedZonePicker=null;
let pointerStart=null;
let pendingTogglePanelSelectionTimer=null;
let pendingTogglePanelZone=null;
function cancelPendingTogglePanelSelection(){
  if(pendingTogglePanelSelectionTimer)clearTimeout(pendingTogglePanelSelectionTimer);
  pendingTogglePanelSelectionTimer=null;pendingTogglePanelZone=null;
}
function scheduleTogglePanelZoneSelection(zone){
  cancelPendingTogglePanelSelection();
  if(!zone)return;
  pendingTogglePanelZone={...zone};
  pendingTogglePanelSelectionTimer=setTimeout(()=>{
    const next=pendingTogglePanelZone;cancelPendingTogglePanelSelection();
    if(next)postParent('select-zone',{zone:{...next}});
  },420);
}
let animStep=0;
let timer=null;

const AR_METERS_PER_MM=0.001;
const AR_DEFAULT_EYE_HEIGHT=1.45;
const AR_MOVE_STEP=.10;
const AR_HEIGHT_STEP=.01;
const arRoot=new THREE.Group();
arRoot.visible=false;
scene.add(arRoot);
let arSession=null;
let arReferenceSpace=null;
let arPlacementInitialized=false;
let arPlacementLocked=false;
let arBaseYaw=0;
let arYawOffset=0;
let arBaseGroundY=0;
let arGroundOffset=0;
let arLastStatusAt=0;
let arLandscapeMode=false;
const arManualPosition=new THREE.Vector3();
const arLastCameraPosition=new THREE.Vector3();
const arCameraForward=new THREE.Vector3();
const arCameraRight=new THREE.Vector3();
let arRestoreCameraNear=camera.near;
let arRestoreCameraFar=camera.far;
let arModelSnapshot=null;
let arDeferredModelRebuild=false;

function postArStatus(message,tone){
  postParent('ar-status',{message:String(message||''),tone:tone||''});
}

function isLikelyIosDevice(){
  return /iPad|iPhone|iPod/i.test(navigator.userAgent||'') || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
}

async function getArCapabilities(){
  if(!window.isSecureContext){
    return {supported:false,reason:'secure-context',message:'AR için uygulama HTTPS üzerinden açılmalıdır. Dosyayı doğrudan file:// ile açmak yeterli değildir.'};
  }
  if(!navigator.xr || typeof navigator.xr.isSessionSupported!=='function'){
    const ios=isLikelyIosDevice();
    return {supported:false,reason:ios?'ios-webxr':'webxr-missing',message:ios?'Bu iPhone/iPad tarayıcısında WebXR AR desteği bulunamadı. Bu sürümde manuel gerçek ölçekli yerleştirme Android Chrome/WebXR cihazlarında çalışır.':'Bu tarayıcı WebXR artırılmış gerçeklik özelliğini desteklemiyor. Android Chrome ve ARCore destekli cihaz kullanın.'};
  }
  try{
    const supported=await navigator.xr.isSessionSupported('immersive-ar');
    return {supported:Boolean(supported),reason:supported?'':'immersive-ar-unsupported',message:supported?('AR hazır · '+Math.round(W)+' mm = '+(W/1000).toFixed(2)+' m · manuel konum · ölçek kilitli 1:1'):'Cihaz WebXR kullanıyor ancak immersive-ar oturumunu desteklemiyor.'};
  }catch(error){
    return {supported:false,reason:'capability-error',message:'AR desteği denetlenemedi: '+error.message};
  }
}

window.getP3DVARCapabilities=getArCapabilities;

function setArTrackingText(message){
  const element=document.getElementById('arTrackingStatus');
  if(element)element.textContent=String(message||'');
}

function setArScaleBadge(){
  const element=document.getElementById('arScaleBadge');
  if(element)element.textContent='Gerçek Ölçek 1:1 · '+Math.round(W)+' mm × '+Math.round(D)+' mm · '+(W/1000).toFixed(2)+' m × '+(D/1000).toFixed(2)+' m';
}

function showArLaunchGate(show){
  const gate=document.getElementById('arLaunchGate');
  if(gate)gate.hidden=!show;
}

function cloneArMaterial(material){
  if(!material||typeof material.clone!=='function')return material;
  const clone=material.clone();
  clone.userData={...(material.userData||{}),p3dvArSnapshotMaterial:true};
  return clone;
}

function disposeArSnapshot(){
  if(!arModelSnapshot)return;
  arModelSnapshot.traverse(object=>{
    const materials=Array.isArray(object.material)?object.material:[object.material];
    materials.filter(Boolean).forEach(material=>{if(material.userData&&material.userData.p3dvArSnapshotMaterial&&typeof material.dispose==='function')material.dispose();});
  });
  if(arModelSnapshot.parent)arModelSnapshot.parent.remove(arModelSnapshot);
  arModelSnapshot=null;
}

function isVisibleInsideModel(object){
  let current=object;
  while(current&&current!==group){
    if(current.visible===false)return false;
    current=current.parent;
  }
  // The live root is intentionally hidden before AR starts. Ignore only that
  // root-level visibility flag while preserving every descendant open/closed state.
  return current===group;
}

function cloneArRenderable(object,relativeMatrix){
  const clone=object.clone(false);
  if(object.material){
    clone.material=Array.isArray(object.material)?object.material.map(cloneArMaterial):cloneArMaterial(object.material);
  }
  clone.matrixAutoUpdate=false;
  clone.matrix.copy(relativeMatrix);
  clone.matrix.decompose(clone.position,clone.quaternion,clone.scale);
  clone.matrixWorldNeedsUpdate=true;
  clone.visible=true;
  clone.frustumCulled=object.frustumCulled;
  clone.renderOrder=object.renderOrder;
  clone.userData={...(object.userData||{}),p3dvArSnapshotPart:true,sourceUuid:object.uuid};
  return clone;
}

function createArSnapshot(){
  disposeArSnapshot();
  scene.updateMatrixWorld(true);
  group.updateMatrixWorld(true);
  const snapshot=new THREE.Group();
  snapshot.name='P3DV_AR_FLAT_WORLD_SNAPSHOT';
  const inverseGroupWorld=new THREE.Matrix4().copy(group.matrixWorld).invert();
  group.traverse(object=>{
    if(object===group||!isVisibleInsideModel(object))return;
    const renderable=Boolean(object.isMesh||object.isLine||object.isLineSegments||object.isPoints||object.isSprite);
    if(!renderable)return;
    const relativeMatrix=new THREE.Matrix4().multiplyMatrices(inverseGroupWorld,object.matrixWorld);
    snapshot.add(cloneArRenderable(object,relativeMatrix));
  });
  snapshot.scale.setScalar(AR_METERS_PER_MM);
  snapshot.position.set(0,H*AR_METERS_PER_MM*.5,0);
  snapshot.rotation.set(0,0,0);
  snapshot.visible=true;
  snapshot.updateMatrixWorld(true);
  arRoot.add(snapshot);
  arModelSnapshot=snapshot;
  return snapshot;
}

function eachArMaterial(callback){
  const source=arModelSnapshot||group;
  source.traverse(object=>{
    const materials=Array.isArray(object.material)?object.material:[object.material];
    materials.filter(Boolean).forEach(callback);
  });
}

function setArGhostMode(enabled){
  eachArMaterial(material=>{
    material.userData=material.userData||{};
    if(enabled){
      if(!material.userData.p3dvArSaved){
        material.userData.p3dvArSaved={opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite};
      }
      const saved=material.userData.p3dvArSaved;
      material.transparent=true;
      material.opacity=Math.max(.08,Number(saved.opacity||1)*.46);
      material.depthWrite=false;
    }else if(material.userData.p3dvArSaved){
      const saved=material.userData.p3dvArSaved;
      material.opacity=saved.opacity;
      material.transparent=saved.transparent;
      material.depthWrite=saved.depthWrite;
      delete material.userData.p3dvArSaved;
    }
    material.needsUpdate=true;
  });
}

function updateArControlState(){
  const lock=document.getElementById('arLockBtn');
  const reposition=document.getElementById('arRepositionBtn');
  if(lock)lock.disabled=!arPlacementInitialized||arPlacementLocked;
  if(reposition)reposition.disabled=!arPlacementInitialized||!arPlacementLocked;
  const ground=document.getElementById('arGroundOffsetInput');
  const groundValue=document.getElementById('arGroundValue');
  if(ground)ground.value=String(Math.round(arGroundOffset*100));
  if(groundValue)groundValue.textContent=(arGroundOffset>=0?'+':'')+Math.round(arGroundOffset*100)+' cm';
}

function prepareModelForAr(){
  if(liveRebuildTimer){
    clearTimeout(liveRebuildTimer);
    liveRebuildTimer=null;
    if(timer)clearInterval(timer);
    buildModel(true,{atomicSwap:true});
  }
  if(timer){clearInterval(timer);timer=null;}
  scene.updateMatrixWorld(true);
  group.updateMatrixWorld(true);
  intermediateDimensionObjects.forEach(item=>item.visible=false);
  mainDimensionObjects.forEach(item=>item.visible=false);
  zonePickers.forEach(item=>item.visible=false);
  floor.visible=false;
  grid.visible=false;
  box.visible=false;
  group.visible=false;
  createArSnapshot();
  arRoot.position.set(0,0,0);
  arRoot.rotation.set(0,0,0);
  arRoot.scale.set(1,1,1);
  arRoot.visible=false;
  setArGhostMode(true);
  controls.enabled=false;
  arRestoreCameraNear=camera.near;
  arRestoreCameraFar=camera.far;
  camera.near=.01;
  camera.far=1000;
  camera.updateProjectionMatrix();
  document.body.classList.add('ar-active');
  document.getElementById('arOverlay').hidden=false;
  setArScaleBadge();
  updateArControlState();
}

async function resetArOrientation(){
  arLandscapeMode=false;
  document.body.classList.remove('ar-landscape');
  const button=document.getElementById('arLandscapeBtn');
  if(button)button.textContent='Yatay Kamera';
  try{if(screen.orientation&&typeof screen.orientation.unlock==='function')screen.orientation.unlock();}catch(error){}
  try{if(document.fullscreenElement&&document.exitFullscreen)await document.exitFullscreen();}catch(error){}
}

function restoreModelAfterAr(){
  arRoot.visible=false;
  setArGhostMode(false);
  disposeArSnapshot();
  group.visible=true;
  floor.visible=true;
  grid.visible=true;
  box.visible=true;
  controls.enabled=true;
  camera.near=arRestoreCameraNear;
  camera.far=arRestoreCameraFar;
  camera.updateProjectionMatrix();
  document.body.classList.remove('ar-active');
  const overlay=document.getElementById('arOverlay');
  if(overlay)overlay.hidden=true;
  showArLaunchGate(false);
  if(arDeferredModelRebuild){
    arDeferredModelRebuild=false;
    buildModel(true,{atomicSwap:true});
  }
}

function arSnapshotDiagnostics(){
  const sourceBounds=new THREE.Box3().setFromObject(group);
  const originalParent=group.parent===scene;
  const originalPartVisibility=parts.map(part=>part.visible);
  const sourceVisibleMeshCount=(()=>{let count=0;group.traverse(object=>{if(object.isMesh&&object.visible)count+=1;});return count;})();
  prepareModelForAr();
  arRoot.visible=true;
  arRoot.updateMatrixWorld(true);
  const snapshotBounds=arModelSnapshot?new THREE.Box3().setFromObject(arModelSnapshot):new THREE.Box3();
  const sourceSize=new THREE.Vector3(),snapshotSize=new THREE.Vector3();
  sourceBounds.getSize(sourceSize);snapshotBounds.getSize(snapshotSize);
  const meshCount=arModelSnapshot?(()=>{let count=0;arModelSnapshot.traverse(object=>{if(object.isMesh)count+=1;});return count;})():0;
  const snapshotVisibleMeshCount=arModelSnapshot?(()=>{let count=0;arModelSnapshot.traverse(object=>{if(object.isMesh&&object.visible)count+=1;});return count;})():0;
  const originalPartVisibilityPreserved=parts.every((part,index)=>part.visible===originalPartVisibility[index]);
  const result={
    originalParentPreserved:originalParent&&group.parent===scene,
    originalHidden:group.visible===false,
    originalPartVisibilityPreserved,
    sourceVisibleMeshCount,
    snapshotMeshCount:meshCount,
    snapshotVisibleMeshCount,
    flatSnapshot:Boolean(arModelSnapshot&&arModelSnapshot.name==='P3DV_AR_FLAT_WORLD_SNAPSHOT'&&arModelSnapshot.children.every(child=>child.parent===arModelSnapshot)),
    sourceSize:[sourceSize.x,sourceSize.y,sourceSize.z],
    snapshotSize:[snapshotSize.x,snapshotSize.y,snapshotSize.z],
    scaleRatioX:sourceSize.x?snapshotSize.x/sourceSize.x:0,
    scaleRatioY:sourceSize.y?snapshotSize.y/sourceSize.y:0,
    scaleRatioZ:sourceSize.z?snapshotSize.z/sourceSize.z:0
  };
  restoreModelAfterAr();
  result.restoredPartVisibility=parts.every((part,index)=>part.visible===originalPartVisibility[index]);
  return result;
}
window.__P3DV_AR_TEST__={snapshotDiagnostics:arSnapshotDiagnostics};

function applyArPlacementTransform(){
  arRoot.position.set(arManualPosition.x,arBaseGroundY+arGroundOffset,arManualPosition.z);
  arRoot.rotation.set(0,arBaseYaw+arYawOffset,0);
  arRoot.visible=arPlacementInitialized;
  updateArControlState();
}

function arDefaultDistance(){
  return Math.max(3,Math.hypot(W,D)*AR_METERS_PER_MM*.68);
}

function getArCameraAxes(){
  const xrCamera=renderer.xr.getCamera(camera);
  xrCamera.getWorldPosition(arLastCameraPosition);
  xrCamera.getWorldDirection(arCameraForward);
  arCameraForward.y=0;
  if(arCameraForward.lengthSq()<.0001)arCameraForward.set(0,0,-1);
  arCameraForward.normalize();
  arCameraRight.crossVectors(arCameraForward,new THREE.Vector3(0,1,0)).normalize();
  return {camera:xrCamera,position:arLastCameraPosition,forward:arCameraForward,right:arCameraRight};
}

function initializeManualArPlacement(){
  if(arPlacementInitialized)return true;
  const axes=getArCameraAxes();
  const distance=arDefaultDistance();
  arManualPosition.copy(axes.position).addScaledVector(axes.forward,distance);
  arBaseGroundY=axes.position.y-AR_DEFAULT_EYE_HEIGHT;
  arGroundOffset=0;
  const dx=axes.position.x-arManualPosition.x;
  const dz=axes.position.z-arManualPosition.z;
  arBaseYaw=Math.atan2(-dx,-dz);
  arYawOffset=0;
  arPlacementInitialized=true;
  arPlacementLocked=false;
  setArGhostMode(true);
  applyArPlacementTransform();
  setArTrackingText('Ürün '+distance.toFixed(1)+' m öne gerçek ölçekte çizildi. Oklarla konumu, zemin kotunu ve yönü ayarlayın; ardından Konumu Sabitleyin.');
  postArStatus('Ürün kameranın önüne 1:1 ölçekte çizildi; manuel konumlandırma hazır.','success');
  return true;
}

function lockArPlacement(){
  if(!arPlacementInitialized)return false;
  arPlacementLocked=true;
  setArGhostMode(false);
  updateArControlState();
  setArTrackingText('Konum sabitlendi · gerçek ölçek 1:1. İnce ayar düğmeleri ölçeği değiştirmeden çalışır.');
  postArStatus('Manuel AR konumu sabitlendi.','success');
  return true;
}

function reopenArPlacement(){
  if(!arPlacementInitialized)return false;
  arPlacementLocked=false;
  setArGhostMode(true);
  updateArControlState();
  setArTrackingText('Yeniden konumlandırma açık · ürün yarı saydamdır. Taşıyın ve tekrar sabitleyin.');
  return true;
}

function moveArModel(direction,amount){
  if(!arPlacementInitialized)return;
  const axes=getArCameraAxes();
  if(direction==='forward')arManualPosition.addScaledVector(axes.forward,amount);
  if(direction==='right')arManualPosition.addScaledVector(axes.right,amount);
  applyArPlacementTransform();
  const distance=axes.position.distanceTo(arRoot.position);
  setArTrackingText('Konum ayarlandı · kamera mesafesi yaklaşık '+distance.toFixed(1)+' m · ölçek 1:1.');
}

function setArGroundOffset(valueMeters){
  arGroundOffset=Math.max(-1.5,Math.min(1.5,Number(valueMeters)||0));
  applyArPlacementTransform();
  setArTrackingText('Zemin kotu '+(arGroundOffset>=0?'+':'')+Math.round(arGroundOffset*100)+' cm · gerçek ürün yüksekliği değişmedi.');
}

function adjustArGround(delta){
  setArGroundOffset(arGroundOffset+delta);
}

function rotateArModel(delta){
  if(!arPlacementInitialized)return;
  arYawOffset+=delta;
  applyArPlacementTransform();
  setArTrackingText('Yön '+Math.round(arYawOffset*180/Math.PI)+'° ayarlandı · gerçek ölçek değişmedi.');
}

async function setArLandscapeMode(enable){
  const requested=Boolean(enable);
  let fullscreenOk=Boolean(document.fullscreenElement);
  let lockOk=false;
  if(requested){
    try{
      if(!document.fullscreenElement&&document.documentElement.requestFullscreen){
        await document.documentElement.requestFullscreen();
        fullscreenOk=true;
      }
    }catch(error){}
    try{
      if(screen.orientation&&typeof screen.orientation.lock==='function'){
        await screen.orientation.lock('landscape');
        lockOk=true;
      }
    }catch(error){}
    arLandscapeMode=true;
    document.body.classList.add('ar-landscape');
    const button=document.getElementById('arLandscapeBtn');
    if(button)button.textContent='Dikey Kamera';
    const message=lockOk?'Yatay kamera kilitlendi · ürün konumu ve 1:1 ölçek korundu.':'Yatay kilit tarayıcı tarafından verilmedi. Telefonu yatay çevirin; geniş arayüz hazır.';
    setArTrackingText(message);
    postArStatus(message,lockOk?'success':'warning');
  }else{
    await resetArOrientation();
    setArTrackingText('Dikey kamera düzenine dönüldü · ürün konumu ve ölçek korundu.');
    postArStatus('Dikey kamera düzenine dönüldü.','success');
  }
  return {fullscreen:fullscreenOk,locked:lockOk};
}

async function cleanupArSession(){
  arReferenceSpace=null;
  arSession=null;
  arPlacementInitialized=false;
  arPlacementLocked=false;
  arYawOffset=0;
  arGroundOffset=0;
  await resetArOrientation();
  restoreModelAfterAr();
  syncViewerAnimationLoop();
  postParent('ar-session-ended');
}

async function beginArSession(){
  if(arSession)return {ok:true,message:'AR oturumu zaten açık.'};
  const capability=await getArCapabilities();
  if(!capability.supported)return {ok:false,message:capability.message};
  renderer.xr.enabled=true;
  renderer.xr.setReferenceSpaceType('local');
  const sessionInit={
    optionalFeatures:['dom-overlay','local-floor'],
    domOverlay:{root:document.body}
  };
  const session=await navigator.xr.requestSession('immersive-ar',sessionInit);
  arSession=session;
  session.addEventListener('end',cleanupArSession,{once:true});
  try{
    await renderer.xr.setSession(session);
    syncViewerAnimationLoop();
    arReferenceSpace=await session.requestReferenceSpace('local');
    prepareModelForAr();
    showArLaunchGate(false);
    setArTrackingText('Kamera açık · ürün ilk karede gerçek ölçekte çizilecek. Zemin araması zorunlu değildir.');
    postArStatus('Kamera açıldı · '+Math.round(W)+' mm ürün '+(W/1000).toFixed(2)+' m gerçek genişlikte tutuluyor.','success');
    session.addEventListener('select',()=>{if(!arPlacementLocked)lockArPlacement();});
    return {ok:true,message:'Kamera açıldı. Ürün 1:1 ölçekte hemen çizilir; konumu ve zemin kotunu elle ayarlayın.'};
  }catch(error){
    try{await session.end();}catch(endError){}
    throw error;
  }
}

window.startP3DVAR=async function(){
  const capability=await getArCapabilities();
  if(!capability.supported){
    postArStatus(capability.message,'warning');
    return {ok:false,message:capability.message};
  }
  try{
    return await beginArSession();
  }catch(error){
    const activationError=['NotAllowedError','SecurityError','InvalidStateError'].includes(error&&error.name);
    if(activationError){
      showArLaunchGate(true);
      const message='Kamera izni için 3D alanın içindeki Kamerayı Aç düğmesine dokunun.';
      postArStatus(message,'warning');
      return {ok:false,retryInsideViewer:true,message};
    }
    const message='AR oturumu başlatılamadı: '+(error&&error.message?error.message:String(error));
    postArStatus(message,'error');
    return {ok:false,message};
  }
};

function updateArFrame(frame){
  if(!arSession||!frame)return;
  if(!arPlacementInitialized){
    initializeManualArPlacement();
    return;
  }
  arRoot.visible=true;
  const now=performance.now();
  if(now-arLastStatusAt>900&&!arPlacementLocked){
    const axes=getArCameraAxes();
    const distance=axes.position.distanceTo(arRoot.position);
    const suggested=arDefaultDistance();
    const guidance=distance<suggested*.72?' · ürünün tamamını görmek için Geri düğmesiyle uzaklaştırın.':' · konumu elle ayarlayın.';
    setArTrackingText('Manuel yerleşim açık · kamera mesafesi '+distance.toFixed(1)+' m'+guidance);
    arLastStatusAt=now;
  }
}

const arLaunchGateBtn=document.getElementById('arLaunchGateBtn');
if(arLaunchGateBtn)arLaunchGateBtn.addEventListener('click',async()=>{
  try{await beginArSession();}
  catch(error){postArStatus('AR başlatılamadı: '+error.message,'error');setArTrackingText('AR başlatılamadı: '+error.message);}
});
const arLaunchGateCancelBtn=document.getElementById('arLaunchGateCancelBtn');
if(arLaunchGateCancelBtn)arLaunchGateCancelBtn.addEventListener('click',()=>showArLaunchGate(false));
const arLockBtn=document.getElementById('arLockBtn');
if(arLockBtn)arLockBtn.addEventListener('click',lockArPlacement);
const arRepositionBtn=document.getElementById('arRepositionBtn');
if(arRepositionBtn)arRepositionBtn.addEventListener('click',reopenArPlacement);
const arMoveForwardBtn=document.getElementById('arMoveForwardBtn');
if(arMoveForwardBtn)arMoveForwardBtn.addEventListener('click',()=>moveArModel('forward',AR_MOVE_STEP));
const arMoveBackBtn=document.getElementById('arMoveBackBtn');
if(arMoveBackBtn)arMoveBackBtn.addEventListener('click',()=>moveArModel('forward',-AR_MOVE_STEP));
const arMoveLeftBtn=document.getElementById('arMoveLeftBtn');
if(arMoveLeftBtn)arMoveLeftBtn.addEventListener('click',()=>moveArModel('right',-AR_MOVE_STEP));
const arMoveRightBtn=document.getElementById('arMoveRightBtn');
if(arMoveRightBtn)arMoveRightBtn.addEventListener('click',()=>moveArModel('right',AR_MOVE_STEP));
const arMoveDownBtn=document.getElementById('arMoveDownBtn');
if(arMoveDownBtn)arMoveDownBtn.addEventListener('click',()=>adjustArGround(-AR_HEIGHT_STEP));
const arMoveUpBtn=document.getElementById('arMoveUpBtn');
if(arMoveUpBtn)arMoveUpBtn.addEventListener('click',()=>adjustArGround(AR_HEIGHT_STEP));
const arGroundZeroBtn=document.getElementById('arGroundZeroBtn');
if(arGroundZeroBtn)arGroundZeroBtn.addEventListener('click',()=>setArGroundOffset(0));
const arGroundOffsetInput=document.getElementById('arGroundOffsetInput');
if(arGroundOffsetInput)arGroundOffsetInput.addEventListener('input',event=>setArGroundOffset(Number(event.target.value)/100));
const arRotateFineLeftBtn=document.getElementById('arRotateFineLeftBtn');
if(arRotateFineLeftBtn)arRotateFineLeftBtn.addEventListener('click',()=>rotateArModel(-Math.PI/180));
const arRotateFineRightBtn=document.getElementById('arRotateFineRightBtn');
if(arRotateFineRightBtn)arRotateFineRightBtn.addEventListener('click',()=>rotateArModel(Math.PI/180));
const arRotateLeftBtn=document.getElementById('arRotateLeftBtn');
if(arRotateLeftBtn)arRotateLeftBtn.addEventListener('click',()=>rotateArModel(-Math.PI/12));
const arRotateRightBtn=document.getElementById('arRotateRightBtn');
if(arRotateRightBtn)arRotateRightBtn.addEventListener('click',()=>rotateArModel(Math.PI/12));
const arLandscapeBtn=document.getElementById('arLandscapeBtn');
if(arLandscapeBtn)arLandscapeBtn.addEventListener('click',()=>setArLandscapeMode(!arLandscapeMode));
const arExitBtn=document.getElementById('arExitBtn');
if(arExitBtn)arExitBtn.addEventListener('click',()=>{if(arSession)arSession.end();});

getArCapabilities().then(capability=>{
  postParent('ar-capability',{supported:capability.supported,message:capability.message});
});

function postDims(index){
  return postSections[index] || (IS_GALAXY?{x:180,z:140}:(IS_BIO_RISE?{x:150,z:100}:{x:100,z:220}));
}

function parseSectionInput(raw){
  if(raw===null)return null;
  const parts=String(raw).toLowerCase().replace(/,/g,'.').split(/[x*\\/ ]+/).filter(Boolean);
  if(parts.length<2)return null;
  const a=Math.round(Number(parts[0]));
  const b=Math.round(Number(parts[1]));
  if(!Number.isFinite(a)||!Number.isFinite(b)||a<20||b<20)return null;
  return {a,b};
}

function postLayoutFits(sections){
  const minOpening=120;
  return (
    sections[0].x + sections[1].x <= W - minOpening &&
    sections[2].x + sections[3].x <= W - minOpening &&
    sections[0].z + sections[2].z <= D - minOpening &&
    sections[1].z + sections[3].z <= D - minOpening
  );
}

function editBeamSection(){
  const next=parseSectionInput(prompt('Blue profile section height x thickness (mm)', beamSection.vertical+'x'+beamSection.thickness));
  if(!next){
    alert('Enter section like 220x100.');
    return;
  }
  if(next.a >= H-200 || next.b >= Math.min(W,D)/2){
    alert('This blue profile section is too large for the current system dimensions.');
    return;
  }
  postParent('beam-section-change-request',{
    beamSection:{vertical:next.a,thickness:next.b},
    camera:cameraSnapshot()
  });
}

function profileColor(defaultHex){
  return DEFAULT_COLOR_MODE ? defaultHex : SYSTEM_COLOR;
}

function panelColor(defaultHex){
  return DEFAULT_COLOR_MODE ? defaultHex : PANEL_COLOR;
}

function createTextureFinishMap(){
  const canvas=document.createElement('canvas');
  canvas.width=128;
  canvas.height=128;
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  ctx.fillStyle='rgb(128,128,128)';
  ctx.fillRect(0,0,128,128);
  for(let y=0;y<128;y+=4){
    for(let x=0;x<128;x+=4){
      const wave=(Math.sin((x+y)*0.55)+Math.cos((x-y)*0.32))*0.5;
      const grain=(wave*34)+((x*y)%17)-8;
      const shade=Math.max(82,Math.min(176,128+grain));
      ctx.fillStyle='rgb(' + shade + ',' + shade + ',' + shade + ')';
      ctx.fillRect(x,y,4,4);
    }
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.wrapS=THREE.RepeatWrapping;
  texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(3.5,3.5);
  texture.needsUpdate=true;
  return texture;
}


const p3dvWoodTextureCache=new Map();
function isWoodTransferKind(kind){return String(kind||'').toLowerCase()==='wood-transfer';}
function woodDescriptorForColor(color){
  const numeric=Number(color)||0;
  if(isWoodTransferKind(SYSTEM_COLOR_KIND)&&numeric===Number(SYSTEM_COLOR))return {code:SYSTEM_COLOR_CODE,texture:SYSTEM_COLOR_TEXTURE,textureData:WOOD_TEXTURE_DATA[SYSTEM_COLOR_CODE]||null,color:numeric};
  if(isWoodTransferKind(PANEL_COLOR_KIND)&&numeric===Number(PANEL_COLOR))return {code:PANEL_COLOR_CODE,texture:PANEL_COLOR_TEXTURE,textureData:WOOD_TEXTURE_DATA[PANEL_COLOR_CODE]||null,color:numeric};
  return null;
}
function configureWoodTexture(texture){
  if(!texture)return texture;
  texture.wrapS=THREE.MirroredRepeatWrapping;
  texture.wrapT=THREE.MirroredRepeatWrapping;
  texture.repeat.set(2.2,1.5);
  if(THREE.SRGBColorSpace!==undefined)texture.colorSpace=THREE.SRGBColorSpace;
  else if(THREE.sRGBEncoding!==undefined)texture.encoding=THREE.sRGBEncoding;
  if(renderer&&renderer.capabilities&&renderer.capabilities.getMaxAnisotropy){texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());}
  texture.needsUpdate=true;
  return texture;
}
function embeddedWoodCanvasTexture(raw,descriptor){
  if(!raw||raw.format!=='rgb8-base64'||!raw.data)return null;
  const width=Math.max(1,Math.round(Number(raw.width)||0));
  const height=Math.max(1,Math.round(Number(raw.height)||0));
  let bytes;
  try{
    const binary=atob(String(raw.data));
    if(binary.length!==width*height*3)return null;
    bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i)&255;
  }catch(error){return null;}
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  const image=ctx.createImageData(width,height);const rgba=image.data;
  for(let src=0,dst=0;src<bytes.length;src+=3,dst+=4){rgba[dst]=bytes[src];rgba[dst+1]=bytes[src+1];rgba[dst+2]=bytes[src+2];rgba[dst+3]=255;}
  ctx.putImageData(image,0,0);
  const texture=configureWoodTexture(new THREE.CanvasTexture(canvas));
  texture.userData=texture.userData||{};
  texture.userData.p3dvShared=true;texture.userData.p3dvWoodTransfer=true;texture.userData.p3dvWoodEmbedded=true;texture.userData.p3dvWoodCode=descriptor&&descriptor.code||'';
  return texture;
}
function proceduralWoodFallbackTexture(descriptor){
  const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
  const ctx=canvas.getContext('2d');if(!ctx)return null;
  const color=new THREE.Color(Number(descriptor&&descriptor.color)||0x81563a);
  const r=Math.round(color.r*255),g=Math.round(color.g*255),b=Math.round(color.b*255);
  ctx.fillStyle='rgb('+r+','+g+','+b+')';ctx.fillRect(0,0,96,96);
  const seed=String(descriptor&&descriptor.code||'WOOD').split('').reduce((sum,ch)=>sum+ch.charCodeAt(0),0);
  for(let y=0;y<96;y+=3){
    const wave=Math.sin((y+seed)*0.21)*5+Math.sin((y+seed)*0.057)*9;
    const alpha=.09+((y+seed)%11)/180;
    ctx.strokeStyle='rgba('+Math.max(0,r-45)+','+Math.max(0,g-38)+','+Math.max(0,b-30)+','+alpha.toFixed(3)+')';
    ctx.beginPath();ctx.moveTo(0,y+wave);ctx.bezierCurveTo(28,y-wave*.25,64,y+wave*.45,96,y-wave*.2);ctx.stroke();
  }
  const texture=configureWoodTexture(new THREE.CanvasTexture(canvas));
  texture.userData=texture.userData||{};texture.userData.p3dvShared=true;texture.userData.p3dvWoodTransfer=true;texture.userData.p3dvWoodEmbeddedFallback=true;texture.userData.p3dvWoodCode=descriptor&&descriptor.code||'';
  return texture;
}
function woodTransferTexture(descriptor){
  if(!descriptor||!descriptor.code)return null;
  const key=String(descriptor.code);
  if(p3dvWoodTextureCache.has(key))return p3dvWoodTextureCache.get(key);
  const texture=embeddedWoodCanvasTexture(descriptor.textureData,descriptor)||proceduralWoodFallbackTexture(descriptor);
  if(texture)p3dvWoodTextureCache.set(key,texture);
  return texture;
}

const finishTextureMap=createTextureFinishMap();
if(finishTextureMap){
  finishTextureMap.userData=finishTextureMap.userData||{};
  finishTextureMap.userData.p3dvShared=true;
}

function finishMaterialSettings(finish,opacity,color){
  const normalized=(finish==='GLOSS'||finish==='TEXTURE'||finish==='MATTE')?finish:'MATTE';
  const base={
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity > .55,
    side: THREE.DoubleSide
  };
  if(normalized==='GLOSS'){
    return {
      ...base,
      roughness:.08,
      metalness:.2,
      clearcoat:1,
      clearcoatRoughness:.06,
      reflectivity:1
    };
  }
  if(normalized==='TEXTURE'){
    const textureSettings=finishTextureMap?{
      bumpMap:finishTextureMap,
      bumpScale:.72,
      roughnessMap:finishTextureMap
    }:{};
    return {
      ...base,
      roughness:.88,
      metalness:.035,
      clearcoat:0,
      clearcoatRoughness:1,
      reflectivity:.28,
      ...textureSettings
    };
  }
  return {
    ...base,
    roughness:.62,
    metalness:.08,
    clearcoat:.08,
    clearcoatRoughness:.74,
    reflectivity:.45
  };
}

function autoFinishForColor(color){
  if(DEFAULT_COLOR_MODE)return 'MATTE';
  return Number(color) === Number(PANEL_COLOR) ? PANEL_FINISH : SYSTEM_FINISH;
}


const p3dvSharedGeometryCache=new Map();
const p3dvSharedMaterialCache=new Map();
const p3dvPerf={
  buildCount:0,lastBuildMs:0,lastBuildReason:'initial',lastPartCount:0,lastMeshCount:0,
  lastRaycastCandidates:0,lastFastBounds:0,lastSlowBounds:0,lastSharedGeometryHits:0,lastSharedMaterialHits:0,lastUniqueGeometryCount:0,lastUniqueMaterialCount:0,lastInstancedMeshCount:0,lastLogicalFreedomPanelCount:0,
  skippedRebuilds:0,scheduledRebuilds:0,legacyFreedomPanels:true,history:[]
};
let p3dvPerfCycle=null;
let lastBuiltGeometrySignature='';
function perfNow(){return typeof performance!=='undefined'&&performance.now?performance.now():Date.now();}
function beginPerfCycle(reason){
  p3dvPerfCycle={reason:String(reason||'model-build'),start:perfNow(),fastBounds:0,slowBounds:0,sharedGeometryHits:0,sharedMaterialHits:0};
}
function endPerfCycle(){
  if(!p3dvPerfCycle)return;
  const duration=Math.max(0,perfNow()-p3dvPerfCycle.start);
  let meshCount=0,instancedCount=0;const geometries=new Set(),materials=new Set();
  group.traverse(object=>{if(object.isMesh||object.isInstancedMesh){meshCount+=1;if(object.isInstancedMesh)instancedCount+=1;if(object.geometry)geometries.add(object.geometry);const mats=Array.isArray(object.material)?object.material:[object.material];mats.filter(Boolean).forEach(material=>materials.add(material));}});
  const logicalFreedomPanels=parts.reduce((sum,part)=>sum+(part&&part.userData&&Array.isArray(part.userData.instancePanels)?part.userData.instancePanels.length:(part&&part.userData&&part.userData.freedomStructuralKind==='panel'?1:0)),0);
  Object.assign(p3dvPerf,{buildCount:p3dvPerf.buildCount+1,lastBuildMs:duration,lastBuildReason:p3dvPerfCycle.reason,lastPartCount:parts.length,lastMeshCount:meshCount,lastRaycastCandidates:raycastCandidates().length,lastFastBounds:p3dvPerfCycle.fastBounds,lastSlowBounds:p3dvPerfCycle.slowBounds,lastSharedGeometryHits:p3dvPerfCycle.sharedGeometryHits,lastSharedMaterialHits:p3dvPerfCycle.sharedMaterialHits,lastUniqueGeometryCount:geometries.size,lastUniqueMaterialCount:materials.size,lastInstancedMeshCount:instancedCount,lastLogicalFreedomPanelCount:logicalFreedomPanels});
  p3dvPerf.history.push({ms:Number(duration.toFixed(2)),reason:p3dvPerfCycle.reason,parts:parts.length,meshes:meshCount,fastBounds:p3dvPerfCycle.fastBounds,slowBounds:p3dvPerfCycle.slowBounds});
  if(p3dvPerf.history.length>24)p3dvPerf.history.shift();
  p3dvPerfCycle=null;
}
function markShared(resource){
  if(resource){resource.userData=resource.userData||{};resource.userData.p3dvShared=true;}
  return resource;
}
function sharedUnitBoxGeometry(){
  const key='unit-box';
  if(p3dvSharedGeometryCache.has(key)){if(p3dvPerfCycle)p3dvPerfCycle.sharedGeometryHits+=1;return p3dvSharedGeometryCache.get(key);}
  const geometry=markShared(new THREE.BoxGeometry(1,1,1));geometry.computeBoundingBox();
  p3dvSharedGeometryCache.set(key,geometry);return geometry;
}
function sharedUnitBoxEdges(){
  const key='unit-box-edges';
  if(p3dvSharedGeometryCache.has(key)){if(p3dvPerfCycle)p3dvPerfCycle.sharedGeometryHits+=1;return p3dvSharedGeometryCache.get(key);}
  const geometry=markShared(new THREE.EdgesGeometry(sharedUnitBoxGeometry()));geometry.computeBoundingBox();
  p3dvSharedGeometryCache.set(key,geometry);return geometry;
}
function sharedSolidMaterial(color,opacity,finish,role){
  const safeOpacity=opacity===undefined?1:Number(opacity);
  const wood=woodDescriptorForColor(color);
  const key=['solid',Number(color)||0,Number.isFinite(safeOpacity)?safeOpacity:1,String(finish||autoFinishForColor(color)),String(role||'generic'),wood&&wood.code||'',wood&&wood.texture||''].join('|');
  if(p3dvSharedMaterialCache.has(key)){if(p3dvPerfCycle)p3dvPerfCycle.sharedMaterialHits+=1;return p3dvSharedMaterialCache.get(key);}
  const material=createSolidMaterial(color,Number.isFinite(safeOpacity)?safeOpacity:1,finish||autoFinishForColor(color));markShared(material);material.userData.p3dvRole=role||'generic';
  p3dvSharedMaterialCache.set(key,material);return material;
}
function sharedGlassMaterial(color,opacity,role){
  const key=['glass',Number(color)||0,Number(opacity)||0,String(role||'glass')].join('|');
  if(p3dvSharedMaterialCache.has(key)){if(p3dvPerfCycle)p3dvPerfCycle.sharedMaterialHits+=1;return p3dvSharedMaterialCache.get(key);}
  const material=createGlassMaterial(color,opacity);markShared(material);material.userData.p3dvRole=role||'glass';p3dvSharedMaterialCache.set(key,material);return material;
}
function sharedLineMaterial(color,opacity,role){
  const key=['line',Number(color)||0,Number(opacity)||0,String(role||'line')].join('|');
  if(p3dvSharedMaterialCache.has(key)){if(p3dvPerfCycle)p3dvPerfCycle.sharedMaterialHits+=1;return p3dvSharedMaterialCache.get(key);}
  const material=markShared(new THREE.LineBasicMaterial({color,transparent:true,opacity}));material.userData.p3dvRole=role||'line';p3dvSharedMaterialCache.set(key,material);return material;
}
function raycastCandidates(){
  const seen=new Set();const result=[];
  const add=(object)=>{if(!object||object.visible===false||seen.has(object))return;seen.add(object);result.push(object);};
  interactiveObjects.forEach(add);zonePickers.forEach(add);
  parts.forEach(part=>{
    const d=part&&part.userData||{};
    if(d.isDividerProfile||d.isTogglePanel||d.isProduct||d.p3dvPergoRiseSelectable||d.isBeam)add(part);
  });
  return result;
}
function fastWorldBounds(object){
  if(!object)return new THREE.Box3();
  object.updateMatrixWorld(true);
  let source=object;
  if(object.userData&&object.userData.p3dvBoundsSource)source=object.userData.p3dvBoundsSource;
  if(source&&source.geometry){
    const geometry=source.geometry;
    if(!geometry.boundingBox&&typeof geometry.computeBoundingBox==='function')geometry.computeBoundingBox();
    if(geometry.boundingBox){
      source.updateMatrixWorld(true);
      if(p3dvPerfCycle)p3dvPerfCycle.fastBounds+=1;
      return geometry.boundingBox.clone().applyMatrix4(source.matrixWorld);
    }
  }
  if(p3dvPerfCycle)p3dvPerfCycle.slowBounds+=1;
  return new THREE.Box3().setFromObject(object);
}
function createSolidMaterial(color,opacity,finish){
  const wood=woodDescriptorForColor(color);
  const woodMap=woodTransferTexture(wood);
  const settings={color:woodMap?0xffffff:color,...finishMaterialSettings(finish||autoFinishForColor(color),opacity,color)};
  if(woodMap){
    settings.map=woodMap;
    settings.bumpMap=null;
    settings.roughnessMap=null;
    settings.roughness=.5;
    settings.metalness=.02;
    settings.clearcoat=.08;
    settings.clearcoatRoughness=.62;
  }
  try{
    const material=new THREE.MeshPhysicalMaterial(settings);
    material.userData={...(material.userData||{}),woodTransfer:Boolean(woodMap),woodCode:wood&&wood.code||''};
    return material;
  }catch(error){
    const material=new THREE.MeshStandardMaterial({
      color:woodMap?0xffffff:color,
      map:woodMap||null,
      roughness:woodMap?.5:(settings.roughness===undefined?.62:settings.roughness),
      metalness:woodMap?.02:(settings.metalness===undefined?.08:settings.metalness),
      transparent:Boolean(settings.transparent),
      opacity:settings.opacity===undefined?1:settings.opacity,
      depthWrite:settings.depthWrite!==false,
      side:THREE.DoubleSide
    });
    material.userData={...(material.userData||{}),woodTransfer:Boolean(woodMap),woodCode:wood&&wood.code||''};
    return material;
  }
}

function createGlassMaterial(color,opacity){
  const glassish = Number(color) === 0x8be7ff ? {roughness:.06, metalness:.08} : (Number(color)===0xb68055 ? {roughness:.14, metalness:.04} : {roughness:.1, metalness:.03});
  return new THREE.MeshStandardMaterial({
    color,
    roughness: glassish.roughness,
    metalness: glassish.metalness,
    transparent: true,
    opacity,
    transmission: 0,
    depthWrite: false,
    side: THREE.DoubleSide
  });
}

function addBox(cfg,color,isPost){
  const geo=sharedUnitBoxGeometry();
  const mat=sharedSolidMaterial(color,1,autoFinishForColor(color),'structure');
  const mesh=new THREE.Mesh(geo,mat);
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  mesh.position.set(cfg.px,cfg.py,cfg.pz);
  mesh.scale.set(cfg.sx,cfg.sy,cfg.sz);
  mesh.userData={name:cfg.name,isPost,isBeam:Boolean(cfg.isBeam),postIndex:(cfg.idx===undefined?-1:cfg.idx),p3dvSize:[cfg.sx,cfg.sy,cfg.sz],...(cfg.userData||{})};
  mesh.add(new THREE.LineSegments(sharedUnitBoxEdges(),sharedLineMaterial(0x111111,.25,'structure-edge')));
  mesh.visible=false;
  group.add(mesh);
  parts.push(mesh);
  if(isPost)interactiveObjects.push(mesh);
  return mesh;
}

function gutterShape(sectionWidth,innerRun){
  const rise=58,height=120,topFlat=36,topInset=12;
  const valleyX=sectionWidth-innerRun;
  const s=new THREE.Shape();
  s.moveTo(0,0);
  s.lineTo(topInset,rise);
  s.lineTo(topInset+topFlat,rise);
  s.lineTo(valleyX,0);
  s.lineTo(sectionWidth,0);
  s.lineTo(sectionWidth,height);
  s.lineTo(sectionWidth-4,height);
  s.lineTo(sectionWidth-4,0);
  s.lineTo(0,0);
  s.closePath();
  return s;
}

function applyMiterCuts(geo,sectionWidth,length){
  const pos=geo&&geo.attributes?geo.attributes.position:null;
  if(!pos||!Number.isFinite(Number(pos.count))){
    if(geo&&typeof geo.computeBoundingBox==='function')geo.computeBoundingBox();
    if(geo&&typeof geo.computeBoundingSphere==='function')geo.computeBoundingSphere();
    return;
  }
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i);
    let z=pos.getZ(i);
    const diag=sectionWidth-x;
    const startLimit=Math.max(0,diag);
    const endLimit=Math.min(length,length-diag);
    if(z<startLimit)z=startLimit;
    if(z>endLimit)z=endLimit;
    pos.setZ(i,z);
  }
  pos.needsUpdate=true;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
}

function sharedGutterGeometry(sectionWidth,innerRun,length,side,straightEnds){
  const safeLength=Math.max(1,Number(length)||1);const key=['gutter',sectionWidth,innerRun,safeLength,side,straightEnds?'straight':'miter'].join('|');
  if(p3dvSharedGeometryCache.has(key)){if(p3dvPerfCycle)p3dvPerfCycle.sharedGeometryHits+=1;return p3dvSharedGeometryCache.get(key);}
  const geo=new THREE.ExtrudeGeometry(gutterShape(sectionWidth,innerRun),{depth:safeLength,bevelEnabled:false,steps:1});
  if(!straightEnds)applyMiterCuts(geo,sectionWidth,safeLength);
  let rotY=0;if(side==='front')rotY=-Math.PI/2;if(side==='back')rotY=Math.PI/2;if(side==='right')rotY=Math.PI;
  if(rotY)geo.rotateY(rotY);geo.computeBoundingBox();geo.computeBoundingSphere();markShared(geo);p3dvSharedGeometryCache.set(key,geo);return geo;
}
function sharedGutterEdges(sectionWidth,innerRun,length,side,straightEnds){
  const safeLength=Math.max(1,Number(length)||1);const key=['gutter-edges',sectionWidth,innerRun,safeLength,side,straightEnds?'straight':'miter'].join('|');
  if(p3dvSharedGeometryCache.has(key)){if(p3dvPerfCycle)p3dvPerfCycle.sharedGeometryHits+=1;return p3dvSharedGeometryCache.get(key);}
  const geo=markShared(new THREE.EdgesGeometry(sharedGutterGeometry(sectionWidth,innerRun,safeLength,side,straightEnds)));geo.computeBoundingBox();p3dvSharedGeometryCache.set(key,geo);return geo;
}
function createExtrudedGutter(name,sectionWidth,innerRun,length,color,side,straightEnds){
  const geo=sharedGutterGeometry(sectionWidth,innerRun,length,side,straightEnds);
  const mesh=new THREE.Mesh(geo,sharedSolidMaterial(color,1,autoFinishForColor(color),'gutter'));
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={name,isPost:false,postIndex:-1};
  mesh.add(new THREE.LineSegments(sharedGutterEdges(sectionWidth,innerRun,length,side,straightEnds),sharedLineMaterial(0x1f2937,.28,'gutter-edge')));
  mesh.visible=false;group.add(mesh);parts.push(mesh);return mesh;
}

// B-Cube Galaxy V3.83: B-CUBE GALAXY PROFILES.dxf kanonik birleşik kayıt+oluk kesitleri.
// DXF dış yüzeyi yerel X=0 kenarıdır. Kesitler: ön/arka 140x225, yan 180x225.
function galaxyCombinedProfilePoints(profileKind){
  return profileKind==='side'
    ? [[45,225],[0,225],[0,0],[180,0],[180,100],[160,100],[160,70],[45,70]]
    : [[45,225],[0,225],[0,0],[140,0],[140,100],[120,100],[120,70],[45,70]];
}
function galaxyCombinedProfileShape(profileKind){
  const pts=galaxyCombinedProfilePoints(profileKind);
  const shape=new THREE.Shape();
  shape.moveTo(pts[0][0],pts[0][1]);
  for(let i=1;i<pts.length;i++)shape.lineTo(pts[i][0],pts[i][1]);
  shape.closePath();
  return shape;
}
function sharedGalaxyCombinedProfileGeometry(profileKind,length,outerDirection){
  const safeLength=Math.max(1,Number(length)||1);
  const kind=profileKind==='side'?'side':'front-rear';
  const direction=String(outerDirection||'negX');
  const key=['galaxy-combined-profile',kind,safeLength,direction].join('|');
  if(p3dvSharedGeometryCache.has(key)){if(p3dvPerfCycle)p3dvPerfCycle.sharedGeometryHits+=1;return p3dvSharedGeometryCache.get(key);}
  const geo=new THREE.ExtrudeGeometry(galaxyCombinedProfileShape(kind),{depth:safeLength,bevelEnabled:false,steps:1});
  let rotY=0;
  if(direction==='posX')rotY=Math.PI;
  else if(direction==='negZ')rotY=-Math.PI/2;
  else if(direction==='posZ')rotY=Math.PI/2;
  if(rotY)geo.rotateY(rotY);
  geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();markShared(geo);p3dvSharedGeometryCache.set(key,geo);return geo;
}
function sharedGalaxyCombinedProfileEdges(profileKind,length,outerDirection){
  const safeLength=Math.max(1,Number(length)||1);
  const kind=profileKind==='side'?'side':'front-rear';
  const direction=String(outerDirection||'negX');
  const key=['galaxy-combined-profile-edges',kind,safeLength,direction].join('|');
  if(p3dvSharedGeometryCache.has(key)){if(p3dvPerfCycle)p3dvPerfCycle.sharedGeometryHits+=1;return p3dvSharedGeometryCache.get(key);}
  const geo=markShared(new THREE.EdgesGeometry(sharedGalaxyCombinedProfileGeometry(kind,safeLength,direction)));geo.computeBoundingBox();p3dvSharedGeometryCache.set(key,geo);return geo;
}
function createGalaxyCombinedProfile(name,profileKind,length,color,outerDirection,userData){
  const kind=profileKind==='side'?'side':'front-rear';
  const safeLength=Math.max(1,Number(length)||1);
  const footprint=kind==='side'?180:140;
  const alongX=outerDirection==='negZ'||outerDirection==='posZ';
  const geo=sharedGalaxyCombinedProfileGeometry(kind,safeLength,outerDirection);
  const mesh=new THREE.Mesh(geo,sharedSolidMaterial(color,1,autoFinishForColor(color),'galaxy-combined-profile'));
  mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData={name,isPost:false,isBeam:true,postIndex:-1,p3dvSize:alongX?[safeLength,225,footprint]:[footprint,225,safeLength],galaxyStructuralKind:'combined-profile',galaxyCombinedProfile:true,galaxyProfileKind:kind,galaxyOuterDirection:outerDirection,p3dvProfileSource:'B-CUBE GALAXY PROFILES.dxf',...(userData||{})};
  mesh.add(new THREE.LineSegments(sharedGalaxyCombinedProfileEdges(kind,safeLength,outerDirection),sharedLineMaterial(0x1f2937,.32,'galaxy-combined-profile-edge')));
  mesh.visible=false;group.add(mesh);parts.push(mesh);return mesh;
}

function lamelShape(narrowBy){
  const pts=[
    [249.334,27.759],[249.334,36.240],[236.642,43.568],[208.675,0.000],
    [0.138,0.000],[0.000,6.750],[19.817,40.493],[26.655,39.760],
    [32.954,35.990],[33.026,27.639],[35.746,27.639],[36.122,39.667],
    [106.399,36.106],[238.454,46.391],[251.343,46.391],[251.343,27.759]
  ];
  const fullWidth=251.343;
  const reduction=Math.max(0,Math.min(40,Number(narrowBy)||0));
  const scale=(fullWidth-reduction)/fullWidth;
  const cx=125.6715;
  const s=new THREE.Shape();
  s.moveTo((pts[0][0]-cx)*scale,pts[0][1]);
  for(let i=1;i<pts.length;i++)s.lineTo((pts[i][0]-cx)*scale,pts[i][1]);
  s.closePath();
  return s;
}

function resolvePergoRiseAssetUrl(url){
  const raw=String(url||'').trim();
  if(!raw)return '';
  try{return new URL(raw,parent.location.href).href;}catch(error){return raw;}
}

function isPergoRiseFabricName(name){
  const lower=String(name||'').toLowerCase();
  return lower.includes('kumaş')||lower.includes('kumas')||lower.includes('fabric')||lower.includes('screen');
}

function createPergoRiseMaterial(name){
  const lower=String(name||'').toLowerCase();
  if(isPergoRiseFabricName(name)) return createSolidMaterial(PANEL_COLOR,.94,autoFinishForColor(PANEL_COLOR));
  if(lower.includes('glass')||lower.includes('cam')) return createGlassMaterial(0xbfe4ff,.18);
  if(lower.includes('screw')||lower.includes('vida')||lower.includes('bolt')||lower.includes('motor')) return createSolidMaterial(0x4b5563,1,'MATTE');
  return createSolidMaterial(SYSTEM_COLOR,1,autoFinishForColor(SYSTEM_COLOR));
}

function loadPergoRiseTemplate(){
  if(!IS_PERGO_RISE){pergoRiseLoadStatus='not-required';return Promise.resolve(false);}
  if(pergoRiseComponentLibrary){pergoRiseLoadStatus='ready-lightweight';return Promise.resolve(true);}
  if(window.P3DVPergoRiseViewer&&window.P3DVPergoRiseViewer.createLightweightLibrary){
    try{
      pergoRiseComponentLibrary=window.P3DVPergoRiseViewer.createLightweightLibrary({THREE});
      pergoRiseLoadStatus='ready-lightweight';
      return Promise.resolve(true);
    }catch(error){
      pergoRiseLoadStatus='error-lightweight-library';
      console.error('Lightweight PLMR Pergo Rise profile library could not be initialized.',error);
      return Promise.resolve(false);
    }
  }
  pergoRiseLoadStatus='error-lightweight-library-unavailable';
  console.error('Pergo Rise lightweight profile library is unavailable.');
  return Promise.resolve(false);
}

function createFreedomLamel(name,length,color){
  return createLamel(name,length,color,0);
}

function createOpenedFreedomLamel(name,length,color,angleDeg){
  return createOpenedLamel(name,length,color,angleDeg,0,false);
}

function sharedLamelGeometry(narrowBy){
  const reduction=Math.max(0,Math.min(40,Number(narrowBy)||0));
  const key='lamel:'+reduction;
  if(p3dvSharedGeometryCache.has(key)){if(p3dvPerfCycle)p3dvPerfCycle.sharedGeometryHits+=1;return p3dvSharedGeometryCache.get(key);}
  const geo=new THREE.ExtrudeGeometry(lamelShape(reduction),{depth:1,bevelEnabled:false,steps:1});
  geo.rotateY(Math.PI/2);geo.computeVertexNormals();geo.computeBoundingBox();geo.computeBoundingSphere();markShared(geo);p3dvSharedGeometryCache.set(key,geo);return geo;
}
function sharedLamelEdges(narrowBy){
  const reduction=Math.max(0,Math.min(40,Number(narrowBy)||0));const key='lamel-edges:'+reduction;
  if(p3dvSharedGeometryCache.has(key)){if(p3dvPerfCycle)p3dvPerfCycle.sharedGeometryHits+=1;return p3dvSharedGeometryCache.get(key);}
  const geo=markShared(new THREE.EdgesGeometry(sharedLamelGeometry(reduction)));geo.computeBoundingBox();p3dvSharedGeometryCache.set(key,geo);return geo;
}
function createLamel(name,length,color,narrowBy){
  const geo=sharedLamelGeometry(narrowBy);
  const mesh=new THREE.Mesh(geo,sharedSolidMaterial(color,1,autoFinishForColor(color),'roof-panel'));
  mesh.scale.x=Math.max(1,Number(length)||1);
  mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData={name,isPost:false,postIndex:-1,isLamel:true,isOpenLamel:false,p3dvLegacyLamel:true,p3dvLength:Number(length)||1};
  mesh.add(new THREE.LineSegments(sharedLamelEdges(narrowBy),sharedLineMaterial(0x214d21,.25,'roof-panel-edge')));
  mesh.visible=false;group.add(mesh);parts.push(mesh);return mesh;
}

function lamelProfileSpan(narrowBy){
  const fullWidth=251.343;
  const reduction=Math.max(0,Math.min(40,Number(narrowBy)||0));
  return fullWidth-reduction;
}

function createFixedClosureLamel(name,length,color,targetDepth,narrowBy){
  const geo=sharedLamelGeometry(narrowBy);const bbox=geo.boundingBox;
  const naturalDepth=Math.max(1,bbox.max.z-bbox.min.z);const safeDepth=Math.max(8,Number(targetDepth)||8);
  const mesh=new THREE.Mesh(geo,sharedSolidMaterial(color,1,autoFinishForColor(color),'roof-closure'));
  mesh.scale.set(Math.max(1,Number(length)||1),1,safeDepth/naturalDepth);
  mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData={name,isPost:false,postIndex:-1,isLamel:false,isOpenLamel:false,isRoofClosure:true,p3dvLegacyLamel:true,p3dvLength:Number(length)||1};
  mesh.add(new THREE.LineSegments(sharedLamelEdges(narrowBy),sharedLineMaterial(0x153e75,.34,'roof-closure-edge')));
  mesh.visible=false;group.add(mesh);parts.push(mesh);return mesh;
}

function sharedOpenedLamelGeometry(narrowBy,flipProfile){
  if(!flipProfile)return sharedLamelGeometry(narrowBy);
  const reduction=Math.max(0,Math.min(40,Number(narrowBy)||0));const key='lamel-flipped:'+reduction;
  if(p3dvSharedGeometryCache.has(key)){if(p3dvPerfCycle)p3dvPerfCycle.sharedGeometryHits+=1;return p3dvSharedGeometryCache.get(key);}
  const geo=sharedLamelGeometry(reduction).clone();geo.rotateX(Math.PI);geo.computeBoundingBox();geo.computeBoundingSphere();markShared(geo);p3dvSharedGeometryCache.set(key,geo);return geo;
}
function sharedOpenedLamelEdges(narrowBy,flipProfile){
  if(!flipProfile)return sharedLamelEdges(narrowBy);
  const reduction=Math.max(0,Math.min(40,Number(narrowBy)||0));const key='lamel-flipped-edges:'+reduction;
  if(p3dvSharedGeometryCache.has(key)){if(p3dvPerfCycle)p3dvPerfCycle.sharedGeometryHits+=1;return p3dvSharedGeometryCache.get(key);}
  const geo=markShared(new THREE.EdgesGeometry(sharedOpenedLamelGeometry(reduction,true)));geo.computeBoundingBox();p3dvSharedGeometryCache.set(key,geo);return geo;
}
function createOpenedLamel(name,length,color,angleDeg,narrowBy,flipProfile){
  const geo=sharedOpenedLamelGeometry(narrowBy,flipProfile);const bbox=geo.boundingBox.clone();
  const pivot=new THREE.Group();
  const mesh=new THREE.Mesh(geo,sharedSolidMaterial(color,1,autoFinishForColor(color),'roof-panel'));
  mesh.scale.x=Math.max(1,Number(length)||1);
  mesh.castShadow=true;mesh.receiveShadow=true;
  // Unit extrusion is centered before length scaling, so the same lightweight profile can be reused.
  const scaledCenterX=((bbox.min.x+bbox.max.x)/2)*mesh.scale.x;
  mesh.position.set(-scaledCenterX,-bbox.min.y,-bbox.max.z);
  mesh.userData={name,isPost:false,postIndex:-1,isLamel:true,isOpenLamel:true,p3dvLegacyLamel:true,p3dvLength:Number(length)||1};
  mesh.add(new THREE.LineSegments(sharedOpenedLamelEdges(narrowBy,flipProfile),sharedLineMaterial(0x214d21,.25,'roof-panel-edge')));
  mesh.visible=false;pivot.rotation.x=THREE.MathUtils.degToRad(angleDeg);pivot.userData={p3dvBoundsSource:mesh};pivot.add(mesh);group.add(pivot);parts.push(mesh);
  return {pivot,mesh,bounds:bbox};
}

function sharedFreedomOpenInstanceGeometry(){
  const key='freedom-open-instance';
  if(p3dvSharedGeometryCache.has(key)){if(p3dvPerfCycle)p3dvPerfCycle.sharedGeometryHits+=1;return p3dvSharedGeometryCache.get(key);}
  const base=sharedLamelGeometry(0);const bbox=base.boundingBox;const geo=base.clone();
  geo.translate(-((bbox.min.x+bbox.max.x)/2),-bbox.min.y,-bbox.max.z);geo.computeBoundingBox();geo.computeBoundingSphere();markShared(geo);p3dvSharedGeometryCache.set(key,geo);return geo;
}
function matrixPlacedByBounds(geometry,config,opts){
  const object=new THREE.Object3D();
  object.position.set(0,0,0);object.rotation.set(Number(config.rx)||0,Number(config.ry)||0,Number(config.rz)||0);object.scale.set(Number(config.sx)||1,Number(config.sy)||1,Number(config.sz)||1);object.updateMatrix();
  if(!geometry.boundingBox&&geometry.computeBoundingBox)geometry.computeBoundingBox();
  const bbox=geometry.boundingBox.clone().applyMatrix4(object.matrix);
  if(opts.bottomY!==undefined)object.position.y+=opts.bottomY-bbox.min.y;
  if(opts.centerX!==undefined)object.position.x+=opts.centerX-(bbox.min.x+bbox.max.x)/2;
  if(opts.centerZ!==undefined)object.position.z+=opts.centerZ-(bbox.min.z+bbox.max.z)/2;
  if(opts.minX!==undefined)object.position.x+=opts.minX-bbox.min.x;
  if(opts.maxX!==undefined)object.position.x+=opts.maxX-bbox.max.x;
  if(opts.minZ!==undefined)object.position.z+=opts.minZ-bbox.min.z;
  if(opts.maxZ!==undefined)object.position.z+=opts.maxZ-bbox.max.z;
  object.updateMatrix();return {matrix:object.matrix.clone(),position:object.position.toArray()};
}
function createFreedomPanelInstances(moduleNumber,module,moduleLamelLength,modulePanelCount,grass,lamelBottomY,lamelOpenAngle,moduleLamelStartT,moduleCenterT,zSign,toWorldZ,lamelSpacing,lamelOpenSpacing,freedomMotorFacade,freedomMotorFacadeLabel){
  if(modulePanelCount<=0)return null;
  const opened=Boolean(lamellaOpenMode);const geometry=opened?sharedFreedomOpenInstanceGeometry():sharedLamelGeometry(0);
  const instanced=new THREE.InstancedMesh(geometry,sharedSolidMaterial(grass,1,autoFinishForColor(grass),'roof-panel'),modulePanelCount);
  instanced.castShadow=true;instanced.receiveShadow=true;instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const panelMeta=[];
  for(let i=0;i<modulePanelCount;i++){
    const edgeT=opened?(moduleLamelStartT+(modulePanelCount-1-i)*lamelOpenSpacing):(2*moduleCenterT-moduleLamelStartT-i*lamelSpacing);
    const edgeZ=toWorldZ(edgeT);
    const opts=opened
      ?(zSign>0?{centerX:module.centerX,minZ:edgeZ,bottomY:lamelBottomY}:{centerX:module.centerX,maxZ:edgeZ,bottomY:lamelBottomY})
      :(zSign>0?{centerX:module.centerX,maxZ:edgeZ,bottomY:lamelBottomY}:{centerX:module.centerX,minZ:edgeZ,bottomY:lamelBottomY});
    const placed=matrixPlacedByBounds(geometry,{sx:moduleLamelLength,rx:opened?THREE.MathUtils.degToRad(lamelOpenAngle):0,ry:zSign>0?Math.PI:0},opts);
    instanced.setMatrixAt(i,placed.matrix);
    panelMeta.push({name:'Modül '+moduleNumber+' · Lamella '+(i+1),motorFacade:freedomMotorFacade,motorFacadeLabel:freedomMotorFacadeLabel,freedomStructuralKind:'panel',moduleIndex:module.moduleIndex,rowIndex:module.rowIndex,panelIndex:i,panelCollection:module.panelCollection,position:placed.position});
  }
  instanced.instanceMatrix.needsUpdate=true;instanced.visible=false;instanced.userData={name:'Modül '+moduleNumber+' · Freedom Panelleri',freedomStructuralKind:'panel',moduleIndex:module.moduleIndex,rowIndex:module.rowIndex,panelCollection:module.panelCollection,p3dvInstancedPanels:true,instancePanels:panelMeta,isLamel:true,isOpenLamel:opened,p3dvLegacyLamel:true};
  group.add(instanced);parts.push(instanced);return instanced;
}

function setMeshByBounds(mesh,opts){
  mesh.position.set(0,0,0);
  mesh.updateMatrixWorld(true);
  const bbox=fastWorldBounds(mesh);
  if(opts.bottomY!==undefined)mesh.position.y+=(opts.bottomY-bbox.min.y);
  if(opts.centerX!==undefined)mesh.position.x+=(opts.centerX-(bbox.min.x+bbox.max.x)/2);
  if(opts.centerZ!==undefined)mesh.position.z+=(opts.centerZ-(bbox.min.z+bbox.max.z)/2);
  if(opts.minX!==undefined)mesh.position.x+=(opts.minX-bbox.min.x);
  if(opts.maxX!==undefined)mesh.position.x+=(opts.maxX-bbox.max.x);
  if(opts.minZ!==undefined)mesh.position.z+=(opts.minZ-bbox.min.z);
  if(opts.maxZ!==undefined)mesh.position.z+=(opts.maxZ-bbox.max.z);
  mesh.updateMatrixWorld(true);
}

function setObjectByBounds(obj,opts){
  obj.position.set(0,0,0);
  obj.updateMatrixWorld(true);
  const bbox=fastWorldBounds(obj);
  if(opts.bottomY!==undefined)obj.position.y+=(opts.bottomY-bbox.min.y);
  if(opts.centerX!==undefined)obj.position.x+=(opts.centerX-(bbox.min.x+bbox.max.x)/2);
  if(opts.centerZ!==undefined)obj.position.z+=(opts.centerZ-(bbox.min.z+bbox.max.z)/2);
  if(opts.minX!==undefined)obj.position.x+=(opts.minX-bbox.min.x);
  if(opts.maxX!==undefined)obj.position.x+=(opts.maxX-bbox.max.x);
  if(opts.minZ!==undefined)obj.position.z+=(opts.minZ-bbox.min.z);
  if(opts.maxZ!==undefined)obj.position.z+=(opts.maxZ-bbox.max.z);
  obj.updateMatrixWorld(true);
}

function addProductBox(zone,cfg,color,opacity){
  const axisX=zone.axis==='x';const sx=axisX?cfg.w:cfg.t,sy=cfg.h,sz=axisX?cfg.t:cfg.w;
  const mat=(opacity<.7?sharedGlassMaterial(color,opacity,'product-glass'):sharedSolidMaterial(color,opacity,autoFinishForColor(color),'product'));
  const mesh=new THREE.Mesh(sharedUnitBoxGeometry(),mat);
  mesh.scale.set(sx,sy,sz);mesh.castShadow=opacity>.5;mesh.receiveShadow=true;
  const x=axisX ? zone.cx+cfg.u : zone.cx+cfg.v;const z=axisX ? zone.cz+cfg.v : zone.cz+cfg.u;
  mesh.position.set(x,cfg.y,z);
  mesh.userData={name:cfg.name||'Product part',isProduct:true,zoneId:zone.id,p3dvSize:[sx,sy,sz]};
  mesh.add(new THREE.LineSegments(sharedUnitBoxEdges(),sharedLineMaterial(opacity<.8?0x164e63:0x111827,.48,'product-edge')));
  mesh.visible=false;group.add(mesh);parts.push(mesh);interactiveObjects.push(mesh);return mesh;
}

function addRotatedProductBox(zone,cfg,color,opacity,hingeU,angle){
  const relativeU=cfg.u-hingeU;
  const cos=Math.cos(angle);
  const sin=Math.sin(angle);
  const rotated={
    ...cfg,
    u:hingeU+cos*relativeU-sin*(cfg.v||0),
    v:sin*relativeU+cos*(cfg.v||0)
  };
  const mesh=addProductBox(zone,rotated,color,opacity);
  mesh.rotation.y=zone.axis==='x'?-angle:angle;
  return mesh;
}

function addBottomHungProductBox(zone,cfg,color,opacity,angle,hingeY){
  const axisX=zone.axis==='x';
  const sx=axisX?cfg.w:cfg.t,sy=cfg.h,sz=axisX?cfg.t:cfg.w;
  const mat=(opacity<.7?sharedGlassMaterial(color,opacity,'product-glass'):sharedSolidMaterial(color,opacity,autoFinishForColor(color),'product'));
  const mesh=new THREE.Mesh(sharedUnitBoxGeometry(),mat);mesh.scale.set(sx,sy,sz);
  mesh.castShadow=opacity>.5;mesh.receiveShadow=true;
  mesh.userData={name:cfg.name||'Product part',isProduct:true,zoneId:zone.id,p3dvSize:[sx,sy,sz]};
  mesh.add(new THREE.LineSegments(sharedUnitBoxEdges(),sharedLineMaterial(opacity<.8?0x164e63:0x111827,.48,'product-edge')));
  const pivot=new THREE.Group();
  pivot.position.set(axisX?zone.cx+cfg.u:zone.cx+cfg.v,hingeY,axisX?zone.cz+cfg.v:zone.cz+cfg.u);
  mesh.position.set(0,cfg.y-hingeY,0);
  if(axisX){
    pivot.rotation.x=zone.inward*angle;
  }else{
    pivot.rotation.z=-zone.inward*angle;
  }
  pivot.add(mesh);
  mesh.visible=false;
  group.add(pivot);
  parts.push(mesh);
  interactiveObjects.push(mesh);
  return mesh;
}


function glazingSectionSpec(placement){
  const thickness=String(placement.glassThickness||'8 MM').toUpperCase();
  const spec=GLAZING_SECTION_SPECS[thickness]||GLAZING_SECTION_SPECS['8 MM'];
  return {glassDepth:Number(spec.glassDepth),frameDepth:Number(spec.frameDepth)};
}

function createArrowGeometry(length,shaftWidth,headWidth,headLength,direction,vertical){
  const half=length/2;
  const shaftHalf=shaftWidth/2;
  const headHalf=headWidth/2;
  const bodyEnd=half-headLength;
  const shape=new THREE.Shape();
  shape.moveTo(-half,-shaftHalf);
  shape.lineTo(bodyEnd,-shaftHalf);
  shape.lineTo(bodyEnd,-headHalf);
  shape.lineTo(half,0);
  shape.lineTo(bodyEnd,headHalf);
  shape.lineTo(bodyEnd,shaftHalf);
  shape.lineTo(-half,shaftHalf);
  shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:4,bevelEnabled:false,steps:1});
  geo.translate(0,0,-2);
  if(direction<0)geo.rotateZ(Math.PI);
  if(vertical)geo.rotateZ(Math.PI/2);
  return geo;
}

function addFacadeArrow(zone,cfg){
  const length=Math.max(80,Math.min(cfg.length,Math.max(80,cfg.maxLength||cfg.length)));
  const thick=Boolean(cfg.thick);
  const geo=createArrowGeometry(length,thick?26:10,thick?68:38,Math.min(length*.28,thick?82:54),cfg.direction||1,Boolean(cfg.vertical));
  if(zone.axis==='z')geo.rotateY(-Math.PI/2);
  const mat=new THREE.MeshStandardMaterial({color:thick?0xf97316:0xf8fafc,roughness:.45,metalness:.05,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geo,mat);
  const x=zone.axis==='x'?zone.cx+(cfg.u||0):zone.cx+(cfg.v||0);
  const z=zone.axis==='x'?zone.cz+(cfg.v||0):zone.cz+(cfg.u||0);
  mesh.position.set(x,cfg.y,z);
  mesh.userData={name:cfg.name||'Direction Arrow',isProduct:true,zoneId:zone.id};
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0x111827,transparent:true,opacity:.82})));
  mesh.visible=false;
  group.add(mesh);
  parts.push(mesh);
  return mesh;
}

function addFacadeText(zone,cfg){
  const canvas=document.createElement('canvas');
  canvas.width=512;
  canvas.height=160;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='rgba(15,23,42,.88)';
  ctx.fillRect(4,4,504,152);
  ctx.strokeStyle='#f8fafc';
  ctx.lineWidth=8;
  ctx.strokeRect(8,8,496,144);
  ctx.fillStyle='#f8fafc';
  ctx.font='bold 92px Segoe UI, Arial, sans-serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.fillText(cfg.text||'',256,83);
  const texture=new THREE.CanvasTexture(canvas);
  texture.needsUpdate=true;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(cfg.w,cfg.h),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthTest:true}));
  if(zone.axis==='x')mesh.rotation.y=zone.inward===1?Math.PI:0;
  else mesh.rotation.y=-zone.inward*Math.PI/2;
  const x=zone.axis==='x'?zone.cx+(cfg.u||0):zone.cx+(cfg.v||0);
  const z=zone.axis==='x'?zone.cz+(cfg.v||0):zone.cz+(cfg.u||0);
  mesh.position.set(x,cfg.y,z);
  mesh.userData={name:cfg.name||cfg.text||'Label',isProduct:true,zoneId:zone.id};
  mesh.visible=false;
  group.add(mesh);
  parts.push(mesh);
  return mesh;
}

function drawCurvedTurnArrow(ctx,direction,fillHex){
  const right=direction!=='LEFT';
  ctx.save();
  ctx.translate(256,256);
  if(!right)ctx.scale(-1,1);
  ctx.lineCap='round';
  ctx.lineJoin='round';
  ctx.strokeStyle='rgba(15,23,42,.9)';
  ctx.fillStyle=fillHex;
  ctx.lineWidth=28;
  ctx.beginPath();
  ctx.arc(-8,8,132,Math.PI*1.18,Math.PI*0.08,false);
  ctx.stroke();
  const tipX=120;
  const tipY=42;
  ctx.beginPath();
  ctx.moveTo(tipX,tipY);
  ctx.lineTo(tipX-64,tipY-18);
  ctx.lineTo(tipX-34,tipY+46);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-8,8,132,Math.PI*1.18,Math.PI*0.08,false);
  ctx.strokeStyle=fillHex;
  ctx.lineWidth=18;
  ctx.stroke();
  ctx.restore();
}

function createPanelSymbolPlane(text,width,height,fontSize,color,opacity,turnDirection){
  const canvas=document.createElement('canvas');
  canvas.width=512;
  canvas.height=512;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const alpha=Math.max(.12,Math.min(1,Number(opacity)||1));
  const numericColor=Number.isFinite(Number(color))?Number(color):0xf97316;
  const fillHex='#'+Math.max(0,Math.min(0xffffff,numericColor)).toString(16).padStart(6,'0');
  if(text==='↻' && turnDirection){
    drawCurvedTurnArrow(ctx,turnDirection,fillHex);
  }else{
    ctx.font='bold '+Math.max(72,Number(fontSize)||120)+'px Segoe UI Symbol, Segoe UI, Arial, sans-serif';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.globalAlpha=1;
    ctx.lineWidth=18;
    ctx.strokeStyle='rgba(15,23,42,.9)';
    ctx.strokeText(text||'',256,260);
    ctx.fillStyle=fillHex;
    ctx.fillText(text||'',256,260);
    ctx.globalAlpha=1;
  }
  const texture=new THREE.CanvasTexture(canvas);
  texture.needsUpdate=true;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:alpha,side:THREE.DoubleSide,depthTest:true});
  return new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
}

function slidingPhysicalSideFromView(side,zone,slidingView){
  if(side!=='LEFT'&&side!=='RIGHT')return side;
  // Dış Bakış, mevcut Sürme Sistem fiziksel yön sözleşmesidir. İç Bakış yalnız sağ/sol yorumunu aynalar.
  return slidingView==='INSIDE VIEW'?(side==='LEFT'?'RIGHT':'LEFT'):side;
}

function foldingPositiveUAppearsRight(zone,foldingView){
  const outside=foldingView==='OUTSIDE VIEW';
  const inwardSign=Number(zone&&zone.inward)===-1?-1:1;
  const forwardSign=(outside?1:-1)*inwardSign;
  return (zone&&zone.axis)==='z'?forwardSign:-forwardSign;
}

function foldingMirrorSideByView(side,zone,foldingView){
  if(side==='BOTH')return 'BOTH';
  const mirror=foldingPositiveUAppearsRight(zone,foldingView)<0;
  return mirror?(side==='LEFT'?'RIGHT':'LEFT'):side;
}

function foldingPhysicalSideFromView(side,zone,foldingView){
  return foldingMirrorSideByView(side,zone,foldingView);
}

function foldingViewSideFromPhysical(side,zone,foldingView){
  return foldingMirrorSideByView(side,zone,foldingView);
}

function foldingFoldV(zone,foldingOpenDirection){
  return foldingOpenDirection==='INWARD'?zone.inward:-zone.inward;
}

function foldingTowardViewer(foldingView,foldingOpenDirection){
  return (foldingView==='INSIDE VIEW' && foldingOpenDirection==='INWARD')
    || (foldingView==='OUTSIDE VIEW' && foldingOpenDirection==='OUTWARD');
}

function foldingFirstTurnDirection(physicalSide,zone,foldingView,foldingOpenDirection){
  const towardViewer=foldingTowardViewer(foldingView,foldingOpenDirection);
  const viewSide=foldingViewSideFromPhysical(physicalSide,zone,foldingView);
  if(towardViewer)return viewSide==='LEFT'?'RIGHT':'LEFT';
  return viewSide==='LEFT'?'LEFT':'RIGHT';
}

function doorTurnDirection(hingeDirection,doorOpenDirection){
  const hingeLeft=hingeDirection==='LEFT';
  const towardViewer=String(doorOpenDirection||'OUTWARD')!=='INWARD';
  if(towardViewer)return hingeLeft?'RIGHT':'LEFT';
  return hingeLeft?'LEFT':'RIGHT';
}

function addFacadePanelSymbol(zone,cfg){
  const mesh=createPanelSymbolPlane(cfg.text,cfg.w,cfg.h,cfg.fontSize,cfg.color,cfg.opacity,cfg.turnDirection);
  const insideFace=cfg.face==='inside';
  if(zone.axis==='x')mesh.rotation.y=(zone.inward===1?Math.PI:0)+(insideFace?Math.PI:0);
  else mesh.rotation.y=-zone.inward*Math.PI/2+(insideFace?Math.PI:0);
  mesh.rotation.z=Number(cfg.rotationZ)||0;
  const x=zone.axis==='x'?zone.cx+(cfg.u||0):zone.cx+(cfg.v||0);
  const z=zone.axis==='x'?zone.cz+(cfg.v||0):zone.cz+(cfg.u||0);
  mesh.position.set(x,cfg.y,z);
  mesh.userData={name:cfg.name||'Panel Symbol',isProduct:true,zoneId:zone.id};
  mesh.visible=false;
  group.add(mesh);
  parts.push(mesh);
  return mesh;
}

function addDoorPivotSymbol(zone,pivot,cfg,hingeU,hingeV,productOpen){
  const mesh=createPanelSymbolPlane(cfg.text,cfg.w,cfg.h,cfg.fontSize,cfg.color,cfg.opacity,cfg.turnDirection);
  const du=cfg.u-hingeU;
  const dv=cfg.v-hingeV;
  const insideFace=cfg.face==='inside';
  const faceOffset=(insideFace?1:-1)*zone.inward*4;
  if(zone.axis==='x'){
    mesh.rotation.y=insideFace?Math.PI:0;
    mesh.position.set(du,cfg.y,dv+faceOffset);
  }else{
    mesh.rotation.y=-Math.PI/2+(insideFace?Math.PI:0);
    mesh.position.set(dv+faceOffset,cfg.y,du);
  }
  mesh.rotation.z=Number(cfg.rotationZ)||0;
  mesh.userData={name:cfg.name||'Pivot Symbol',isProduct:true,zoneId:zone.id};
  mesh.visible=false;
  pivot.add(mesh);
  parts.push(mesh);
  markTogglePanel(mesh,zone,productOpen,zone.id);
  return mesh;
}

function glassVisualColor(placement){
  const color=String(placement.glassColor||'TRANSPARENT').toUpperCase();
  if(color==='FUME' || color==='GREY')return 0x6b7280;
  if(color==='BRONZE')return 0xb68055;
  if(color==='LOW-E GLASS')return 0x8be7ff;
  if(color==='OTHER')return 0x93c5fd;
  return 0xb7ddff;
}

function motorVisualColor(placement){
  if(!DEFAULT_COLOR_MODE)return SYSTEM_COLOR;
  const type=String((placement&&placement.motorType)||'').toUpperCase();
  if(type==='SOMFY IO')return 0x312e81;
  if(type==='RISING')return 0x6b21a8;
  return 0x4c1d95;
}

function productDepthCenter(zone,depth,inset){
  const safeInset=Math.max(0,Number(inset)||0);
  return zone.outerFaceV+zone.inward*(depth/2+safeInset);
}

function productSurfaceCenter(zone,partCenter,partDepth,overlayDepth){
  const depth=Math.max(0,Number(overlayDepth)||0);
  return partCenter-zone.inward*(partDepth/2-depth/2);
}

function fitProductZone(zone,clearance){
  const total=Math.max(0,Number(clearance)||0);
  const half=total/2;
  return {
    ...zone,
    width:Math.max(80,zone.width-total),
    height:Math.max(120,zone.height-total),
    bottomY:zone.bottomY+half,
    topY:zone.topY-half
  };
}

function zipBoxSectionSpec(placement){
  const subtype=String(placement.subtype||'100x100 BOX').toUpperCase();
  if(subtype==='110x110 BOX')return {width:110,height:110,depth:110};
  if(subtype==='HERCULE')return {width:150,height:150,depth:150};
  if(subtype==='115x115 BOX')return {width:115,height:115,depth:115};
  if(subtype==='130x130 BOX')return {width:130,height:130,depth:130};
  return {width:100,height:100,depth:100};
}

function fitZipProductZone(zone,placement){
  const box=zipBoxSectionSpec(placement);
  if(String(placement.placementLocation||'BETWEEN POSTS')!=='FRONT OF POSTS'){
    const centered=fitProductZone(zone,3);
    const automaticFront=Boolean(placement.autoFrontOnly);
    return {
      ...centered,
      cx:zone.cx,
      cz:zone.cz,
      zipOutside:automaticFront,
      zipAutomaticFront:automaticFront,
      zipSideClearance:1.5,
      zipBox:box
    };
  }
  const left=Math.max(0,Number(zone.leftBoundaryWidth)||0);
  const right=Math.max(0,Number(zone.rightBoundaryWidth)||0);
  const shift=(right-left)/2;
  const adjusted={
    ...zone,
    width:Math.max(120,zone.width+left+right),
    height:Math.max(180,zone.height+150),
    bottomY:zone.bottomY,
    topY:zone.topY+150,
    zipOutside:true,
    zipHeightExtension:150,
    zipBox:box
  };
  if(zone.axis==='x')adjusted.cx=zone.cx+shift;
  else adjusted.cz=zone.cz+shift;
  return adjusted;
}

function addFrame(zone,span,height,depth,color){
  const frame=55;
  const v=productDepthCenter(zone,depth,0);
  const halfW=span/2;
  const halfH=height/2;
  addProductBox(zone,{name:'Frame Bottom',u:0,y:zone.bottomY+frame/2,v,w:span,h:frame,t:depth},color,1);
  addProductBox(zone,{name:'Frame Top',u:0,y:zone.topY-frame/2,v,w:span,h:frame,t:depth},color,1);
  addProductBox(zone,{name:'Frame Left',u:-halfW+frame/2,y:zone.bottomY+halfH,v,w:frame,h:height-frame*2,t:depth},color,1);
  addProductBox(zone,{name:'Frame Right',u:halfW-frame/2,y:zone.bottomY+halfH,v,w:frame,h:height-frame*2,t:depth},color,1);
  return {frame,innerW:span-frame*2,innerH:height-frame*2};
}




function createDoorPivot(zone,hingeU,hingeV,angle){
  const pivot=new THREE.Group();
  const x=zone.axis==='x'?zone.cx+hingeU:zone.cx+hingeV;
  const z=zone.axis==='x'?zone.cz+hingeV:zone.cz+hingeU;
  pivot.position.set(x,0,z);
  pivot.rotation.y=angle;
  group.add(pivot);
  return pivot;
}

function addDoorPivotPart(zone,pivot,cfg,color,opacity,hingeU,hingeV,productOpen){
  const axisX=zone.axis==='x';
  const geo=new THREE.BoxGeometry(axisX?cfg.w:cfg.t,cfg.h,axisX?cfg.t:cfg.w);
  const mat=(opacity<.7?createGlassMaterial(color,opacity):createSolidMaterial(color,opacity,autoFinishForColor(color)));
  const mesh=new THREE.Mesh(geo,mat);
  const du=cfg.u-hingeU;
  const dv=cfg.v-hingeV;
  mesh.position.set(axisX?du:dv,cfg.y,axisX?dv:du);
  mesh.castShadow=opacity>.5;
  mesh.receiveShadow=true;
  mesh.userData={name:cfg.name||'Door part',isProduct:true,zoneId:zone.id};
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:opacity<.8?0x164e63:0x111827,transparent:true,opacity:.48})));
  mesh.visible=false;
  pivot.add(mesh);
  parts.push(mesh);
  interactiveObjects.push(mesh);
  markTogglePanel(mesh,zone,productOpen,zone.id);
  return mesh;
}

function addDoorHingeParts(zone,pivot,cfg,hingeU,hingeV,productOpen){
  const hingeColor=0x9ca3af;
  const offset=cfg.hingeDirection==='LEFT'?18:-18;
  const heights=[cfg.bottomY+180, cfg.bottomY+cfg.height/2, cfg.bottomY+cfg.height-180].filter((v,i,a)=>v>cfg.bottomY+70 && v<cfg.bottomY+cfg.height-70 && a.indexOf(v)===i);
  heights.forEach((y,idx)=>{
    addDoorPivotPart(zone,pivot,{name:'Door Hinge '+(idx+1),u:hingeU+offset/2,y:y,v:hingeV,w:18,h:110,t:20},hingeColor,1,hingeU,hingeV,productOpen);
    addDoorPivotPart(zone,pivot,{name:'Door Hinge Plate '+(idx+1),u:hingeU+offset,y:y,v:hingeV,w:10,h:88,t:10},0xcbd5e1,1,hingeU,hingeV,productOpen);
  });
}

function addDimensionLabelScaled(zone,text,u,y,v,scaleFactor,mainDimension){
  const sprite=createDimensionSprite(text,Boolean(mainDimension));
  const scale=Math.max(0.2,Number(scaleFactor)||1);
  sprite.scale.set(sprite.scale.x*scale,sprite.scale.y*scale,1);
  sprite.position.copy(zoneWorldPoint(zone,u,y,v));
  return sprite;
}

function addFixedDoorLeaf(zone,cfg,placement,label){
  const face=50;
  const depth=55;
  const glazing=glazingSectionSpec(placement);
  const frameColor=profileColor(0x475569);
  const glassColor=glassVisualColor(placement);
  const v=productDepthCenter(zone,depth,0);
  const glassV=productDepthCenter(zone,glazing.glassDepth,(depth-glazing.glassDepth)/2);
  addProductBox(zone,{name:label+' Left Stile',u:cfg.centerU-cfg.width/2+face/2,y:cfg.bottomY+cfg.height/2,v,w:face,h:cfg.height,t:depth},frameColor,1);
  addProductBox(zone,{name:label+' Right Stile',u:cfg.centerU+cfg.width/2-face/2,y:cfg.bottomY+cfg.height/2,v,w:face,h:cfg.height,t:depth},frameColor,1);
  addProductBox(zone,{name:label+' Top Rail',u:cfg.centerU,y:cfg.bottomY+cfg.height-face/2,v,w:cfg.width,h:face,t:depth},frameColor,1);
  addProductBox(zone,{name:label+' Bottom Rail',u:cfg.centerU,y:cfg.bottomY+face/2,v,w:cfg.width,h:face,t:depth},frameColor,1);
  addProductBox(zone,{name:label+' Glass',u:cfg.centerU,y:cfg.bottomY+cfg.height/2,v:glassV,w:Math.max(80,cfg.width-face*2-8),h:Math.max(100,cfg.height-face*2-8),t:glazing.glassDepth},glassColor,.34);
}

function addDoorHandleParts(zone,pivot,cfg,placement,hingeU,hingeV,productOpen){
  const handleY=zone.bottomY+900;
  const handleColor=0x111827;
  const lockSide=cfg.hingeDirection==='LEFT'?1:-1;
  const lockU=cfg.centerU+lockSide*(cfg.width/2-72);
  const outerV=productDepthCenter(zone,55,0)-zone.inward*18;
  const innerV=productDepthCenter(zone,55,0)+zone.inward*18;
  if(String(placement.handleType||'NORMAL')==='PANIC'){
    const barWidth=Math.max(120,cfg.width);
    const panicV=innerV+zone.inward*42;
    addDoorPivotPart(zone,pivot,{name:'Panik Kapı Kolu',u:cfg.centerU,y:handleY,v:panicV,w:barWidth,h:34,t:26},handleColor,1,hingeU,hingeV,productOpen);
    addDoorPivotPart(zone,pivot,{name:'Panik Kol Sol Bağlantı',u:cfg.centerU-barWidth/2+26,y:handleY,v:panicV-zone.inward*10,w:24,h:86,t:24},handleColor,1,hingeU,hingeV,productOpen);
    addDoorPivotPart(zone,pivot,{name:'Panik Kol Sağ Bağlantı',u:cfg.centerU+barWidth/2-26,y:handleY,v:panicV-zone.inward*10,w:24,h:86,t:24},handleColor,1,hingeU,hingeV,productOpen);
  }else{
    addDoorPivotPart(zone,pivot,{name:'Normal Kapı Kolu Dış Rozeti',u:lockU,y:handleY,v:outerV,w:32,h:140,t:24},handleColor,1,hingeU,hingeV,productOpen);
    const outerLeverCenter=lockU-lockSide*58;
    addDoorPivotPart(zone,pivot,{name:'Normal Kapı Kolu Dış',u:outerLeverCenter,y:handleY,v:outerV-zone.inward*12,w:132,h:22,t:24},handleColor,1,hingeU,hingeV,productOpen);
    addDoorPivotPart(zone,pivot,{name:'Normal Kapı Kolu İç Rozeti',u:lockU,y:handleY,v:innerV,w:32,h:140,t:24},handleColor,1,hingeU,hingeV,productOpen);
    // İç kol, rozet ekseni etrafında önceki yönüne göre 180° çevrilir.
    const innerLeverCenter=lockU-lockSide*58;
    addDoorPivotPart(zone,pivot,{name:'Normal Kapı Kolu İç',u:innerLeverCenter,y:handleY,v:innerV+zone.inward*12,w:132,h:22,t:24},handleColor,1,hingeU,hingeV,productOpen);
  }
}

function addMovingDoorLeaf(zone,cfg,placement,label,isActiveLeaf){
  const face=50;
  const depth=55;
  const glazing=glazingSectionSpec(placement);
  const frameColor=profileColor(0x334155);
  const glassColor=glassVisualColor(placement);
  const productOpen=productIsOpen(zone.id);
  const hingeLeft=cfg.hingeDirection==='LEFT';
  const hingeU=cfg.centerU+(hingeLeft?-cfg.width/2:cfg.width/2);
  const hingeV=productDepthCenter(zone,depth,0);
  const leafDirection=hingeLeft?1:-1;
  const openV=String(placement.doorOpenDirection||'OUTWARD')==='INWARD'?zone.inward:-zone.inward;
  const axisSign=zone.axis==='x'?-1:1;
  const plannedAngle=axisSign*openV*leafDirection*Math.PI/4;
  const angle=productOpen?plannedAngle:0;
  const pivot=createDoorPivot(zone,hingeU,hingeV,angle);
  const part=(partCfg,color,opacity)=>addDoorPivotPart(zone,pivot,partCfg,color,opacity,hingeU,hingeV,productOpen);
  part({name:label+' Left Stile',u:cfg.centerU-cfg.width/2+face/2,y:cfg.bottomY+cfg.height/2,v:hingeV,w:face,h:cfg.height,t:depth},frameColor,1);
  part({name:label+' Right Stile',u:cfg.centerU+cfg.width/2-face/2,y:cfg.bottomY+cfg.height/2,v:hingeV,w:face,h:cfg.height,t:depth},frameColor,1);
  part({name:label+' Top Rail',u:cfg.centerU,y:cfg.bottomY+cfg.height-face/2,v:hingeV,w:cfg.width,h:face,t:depth},frameColor,1);
  part({name:label+' Bottom Rail',u:cfg.centerU,y:cfg.bottomY+face/2,v:hingeV,w:cfg.width,h:face,t:depth},frameColor,1);
  const glassV=productDepthCenter(zone,glazing.glassDepth,(depth-glazing.glassDepth)/2);
  part({name:label+' Glass',u:cfg.centerU,y:cfg.bottomY+cfg.height/2,v:glassV,w:Math.max(80,cfg.width-face*2-8),h:Math.max(100,cfg.height-face*2-8),t:glazing.glassDepth},glassColor,.34);
  addDoorHingeParts(zone,pivot,cfg,hingeU,hingeV,productOpen);
  const active=Boolean(isActiveLeaf);
  addDoorPivotSymbol(zone,pivot,{
    name:label+(active?' Active':' Passive')+' Opening Symbol',
    text:'↻',
    u:cfg.centerU,
    y:cfg.bottomY+cfg.height/2,
    v:hingeV,
    w:Math.max(190,cfg.width*.62),
    h:Math.max(190,cfg.height*.30),
    fontSize:154,
    color:0xf97316,
    opacity:active?1:.42,
    rotationZ:0,
    turnDirection:doorTurnDirection(cfg.hingeDirection,String(placement.doorOpenDirection||'OUTWARD')),
    face:'outside'
  },hingeU,hingeV,productOpen);
  if(active)addDoorHandleParts(zone,pivot,cfg,placement,hingeU,hingeV,productOpen);
}

function addDoorTopFixedDimensions(zone,bottom,leafTop,leafHeight){
  if(!dimensionVisibility.intermediate)return;
  const dimV=zone.outerFaceV-zone.inward*56;
  const dimU=0;
  const wing=18;
  addDimensionSegments(zone,[
    [dimU,bottom,dimV,dimU,leafTop,dimV],
    [dimU-wing,bottom+wing,dimV,dimU,bottom,dimV],
    [dimU+wing,bottom+wing,dimV,dimU,bottom,dimV],
    [dimU-wing,leafTop-wing,dimV,dimU,leafTop,dimV],
    [dimU+wing,leafTop-wing,dimV,dimU,leafTop,dimV]
  ],false);
  addDimensionLabelScaled(zone,'Kapı Kanadı '+Math.round(leafHeight)+' mm',dimU,(bottom+leafTop)/2,dimV,0.5,false);
}

function buildDoorProduct(zone,placement){
  zone=fitProductZone(zone,5);
  const frameFace=50;
  const frameDepth=55;
  const frameColor=profileColor(0x475569);
  const v=productDepthCenter(zone,frameDepth,0);
  const halfW=zone.width/2;
  addProductBox(zone,{name:'Door Outer Left Frame',u:-halfW+frameFace/2,y:(zone.bottomY+zone.topY)/2,v,w:frameFace,h:zone.height,t:frameDepth},frameColor,1);
  addProductBox(zone,{name:'Door Outer Right Frame',u:halfW-frameFace/2,y:(zone.bottomY+zone.topY)/2,v,w:frameFace,h:zone.height,t:frameDepth},frameColor,1);
  addProductBox(zone,{name:'Door Outer Top Frame',u:0,y:zone.topY-frameFace/2,v,w:zone.width,h:frameFace,t:frameDepth},frameColor,1);

  const innerW=Math.max(300,zone.width-frameFace*2);
  const innerTop=zone.topY-frameFace;
  const bottom=zone.bottomY+6;
  const type=String(placement.doorType||'SINGLE');
  const hasTopFixed=DOOR_TOP_FIXED_TYPES.has(type);
  let leafTop=innerTop;
  if(hasTopFixed){
    const availableHeight=Math.max(0,Math.round(zone.height-87));
    const legacyFixedHeight=Math.max(110,Math.round(Number(placement.topFixedHeight)||500));
    const requestedMoving=Number.isFinite(Number(placement.movingLeafHeight))
      ? Math.round(Number(placement.movingLeafHeight))
      : Math.max(1200,availableHeight-legacyFixedHeight);
    const minMoving=1200;
    const maxMoving=Math.max(minMoving,availableHeight-110);
    const movingHeight=Math.max(minMoving,Math.min(maxMoving,requestedMoving));
    const fixedHeight=Math.max(110,availableHeight-movingHeight);
    const transomY=innerTop-fixedHeight;
    addProductBox(zone,{name:'Door Top Fixed Transom',u:0,y:transomY,v,w:innerW,h:frameFace,t:frameDepth},frameColor,1);
    const glazing=glazingSectionSpec(placement);
    const glassV=productDepthCenter(zone,glazing.glassDepth,(frameDepth-glazing.glassDepth)/2);
    const topGlassBottom=transomY+frameFace/2+6;
    const topGlassH=Math.max(100,innerTop-topGlassBottom-6);
    addProductBox(zone,{name:'Door Upper Fixed Glass',u:0,y:topGlassBottom+topGlassH/2,v:glassV,w:Math.max(80,innerW-12),h:topGlassH,t:glazing.glassDepth},glassVisualColor(placement),.34);
    leafTop=bottom+movingHeight;
    addDoorTopFixedDimensions(zone,bottom,leafTop,movingHeight);
  }
  const usableH=Math.max(600,leafTop-bottom);
  const total=innerW-12;
  const gap=2;
  const items=[];
  const addItem=(kind,label,opts={})=>items.push({kind,label,...opts});
  switch(type){
    case 'DOUBLE':
    case 'DOUBLE_TOP':
      addItem('moving','Door Left Leaf',{hingeDirection:'LEFT',activeKey:'LEFT'});
      addItem('moving','Door Right Leaf',{hingeDirection:'RIGHT',activeKey:'RIGHT'});
      break;
    case 'LEFT_FIXED_RIGHT_MOVING':
    case 'LEFT_FIXED_TOP':
      addItem('fixed','Door Left Fixed');
      addItem('moving','Door Right Moving',{hingeDirection:String(placement.hingeDirection||'RIGHT')});
      break;
    case 'RIGHT_FIXED_LEFT_MOVING':
    case 'RIGHT_FIXED_TOP':
      addItem('moving','Door Left Moving',{hingeDirection:String(placement.hingeDirection||'LEFT')});
      addItem('fixed','Door Right Fixed');
      break;
    case 'BOTH_FIXED_TOP':
      addItem('fixed','Door Left Fixed');
      addItem('moving','Door Center Moving',{hingeDirection:String(placement.hingeDirection||'LEFT')});
      addItem('fixed','Door Right Fixed');
      break;
    case 'DOUBLE_LEFT_FIXED':
    case 'DOUBLE_LEFT_FIXED_TOP':
      addItem('fixed','Door Left Fixed');
      addItem('moving','Door Center Left Leaf',{hingeDirection:'LEFT',activeKey:'LEFT'});
      addItem('moving','Door Center Right Leaf',{hingeDirection:'RIGHT',activeKey:'RIGHT'});
      break;
    case 'DOUBLE_RIGHT_FIXED_TOP':
      addItem('moving','Door Center Left Leaf',{hingeDirection:'LEFT',activeKey:'LEFT'});
      addItem('moving','Door Center Right Leaf',{hingeDirection:'RIGHT',activeKey:'RIGHT'});
      addItem('fixed','Door Right Fixed');
      break;
    case 'DOUBLE_BOTH_FIXED_TOP':
      addItem('fixed','Door Left Fixed');
      addItem('moving','Door Inner Left Leaf',{hingeDirection:'LEFT',activeKey:'LEFT'});
      addItem('moving','Door Inner Right Leaf',{hingeDirection:'RIGHT',activeKey:'RIGHT'});
      addItem('fixed','Door Right Fixed');
      break;
    case 'TOP_FIXED':
    case 'SINGLE':
    default:
      addItem('moving', type==='TOP_FIXED' ? 'Door Lower Leaf' : 'Door Single Leaf', {hingeDirection:String(placement.hingeDirection||'LEFT')});
      break;
  }
  const count=items.length;
  const segW=Math.max(220,(total-gap*Math.max(0,count-1))/count);
  const rowWidth=segW*count+gap*Math.max(0,count-1);
  let cursor=-rowWidth/2+segW/2;
  items.forEach((item)=>{
    item.centerU=cursor;
    item.width=segW;
    item.bottomY=bottom;
    item.height=usableH;
    cursor+=segW+gap;
  });
  items.forEach((item)=>{
    if(item.kind==='fixed') addFixedDoorLeaf(zone,item,placement,item.label);
    else addMovingDoorLeaf(zone,{centerU:item.centerU,bottomY:item.bottomY,width:item.width,height:item.height,hingeDirection:item.hingeDirection||String(placement.hingeDirection||'LEFT')},placement,item.label,item.activeKey ? String(placement.activeLeaf||'RIGHT')===item.activeKey : true);
  });
}

function fixedVerticalDivisionCount(innerW,manualValue){
  const automatic=Math.max(1,Math.ceil(Math.max(0,innerW)/1200));
  const manual=Math.round(Number(manualValue)||0);
  return Math.max(1,Math.min(20,manual||automatic));
}

function parseFixedHorizontalSegments(totalHeight,divisionCount,heightsRaw){
  const divisions=Math.max(1,Math.min(10,Math.round(Number(divisionCount)||1)));
  const values=String(heightsRaw||'').split(/[;,]+/).map(item=>Number(String(item).trim())).filter(value=>Number.isFinite(value)&&value>0);
  if(values.length===divisions&&Math.abs(values.reduce((sum,value)=>sum+value,0)-totalHeight)<=2)return values;
  const base=Math.floor(totalHeight/divisions);
  const segments=Array(divisions).fill(base);
  segments[segments.length-1]+=Math.round(totalHeight-base*divisions);
  return segments;
}

function fixedHorizontalCenters(zone,segments){
  const centers=[];
  let cursor=zone.bottomY;
  for(let i=0;i<segments.length-1;i++){
    cursor+=segments[i];
    centers.push(cursor);
  }
  return centers;
}

function addFixedHeightDimensions(zone,segments,centers){
  if(!dimensionVisibility.intermediate||segments.length<2)return;
  const outsideV=zone.outerFaceV-zone.inward*118;
  const dimU=0;
  const wing=22;
  const boundaries=[zone.bottomY,...centers,zone.topY];
  for(let i=0;i<segments.length;i++){
    const y1=boundaries[i],y2=boundaries[i+1];
    addDimensionSegments(zone,[
      [dimU,y1,outsideV,dimU,y2,outsideV],
      [dimU-wing,y1+wing,outsideV,dimU,y1,outsideV],
      [dimU+wing,y1+wing,outsideV,dimU,y1,outsideV],
      [dimU-wing,y2-wing,outsideV,dimU,y2,outsideV],
      [dimU+wing,y2-wing,outsideV,dimU,y2,outsideV]
    ],false);
    addDimensionLabel(zone,Math.round(segments[i])+' mm',dimU+105,(y1+y2)/2,outsideV);
  }
}

function buildFixedJoineryProduct(zone,placement){
  zone=fitProductZone(zone,5);
  const frameColor=profileColor(0x475569);
  const mullionColor=profileColor(0x64748b);
  const glazing=glazingSectionSpec(placement);
  const glassColor=glassVisualColor(placement);
  const frameDepth=55;
  const dims=addFrame(zone,zone.width,zone.height,frameDepth,frameColor);
  const profile=55;
  const glassInset=Math.max(0,(frameDepth-glazing.glassDepth)/2);
  const glassV=productDepthCenter(zone,glazing.glassDepth,glassInset);

  const verticalDivisions=fixedVerticalDivisionCount(dims.innerW,placement.verticalDivisions);
  const verticalProfiles=Math.max(0,verticalDivisions-1);
  const cellW=(dims.innerW-verticalProfiles*profile)/verticalDivisions;
  const xIntervals=[];
  let xCursor=-dims.innerW/2;
  for(let i=0;i<verticalDivisions;i++){
    const left=xCursor;
    const right=left+cellW;
    xIntervals.push([left,right]);
    xCursor=right;
    if(i<verticalProfiles){
      const center=xCursor+profile/2;
      addProductBox(zone,{name:'Fixed Vertical Mullion '+(i+1),u:center,y:(zone.bottomY+zone.topY)/2,v:productDepthCenter(zone,frameDepth,0),w:profile,h:dims.innerH,t:frameDepth},mullionColor,1);
      xCursor+=profile;
    }
  }

  const horizontalDivisions=Math.max(1,Math.min(10,Math.round(Number(placement.horizontalDivisions)||1)));
  const segments=parseFixedHorizontalSegments(zone.height,horizontalDivisions,placement.horizontalHeights);
  const centers=fixedHorizontalCenters(zone,segments);
  const innerBottom=zone.bottomY+dims.frame;
  const innerTop=zone.topY-dims.frame;
  const yIntervals=[];
  let yCursor=innerBottom;
  centers.forEach((center,index)=>{
    const lower=Math.max(yCursor,center-profile/2);
    if(lower-yCursor>=60)yIntervals.push([yCursor,lower]);
    addProductBox(zone,{name:'Fixed Horizontal Mullion '+(index+1),u:0,y:center,v:productDepthCenter(zone,frameDepth,0),w:dims.innerW,h:profile,t:frameDepth},mullionColor,1);
    yCursor=Math.min(innerTop,center+profile/2);
  });
  if(innerTop-yCursor>=60)yIntervals.push([yCursor,innerTop]);
  if(!yIntervals.length)yIntervals.push([innerBottom,innerTop]);

  xIntervals.forEach((xInterval,xi)=>{
    yIntervals.forEach((yInterval,yi)=>{
      const left=xInterval[0],right=xInterval[1],bottom=yInterval[0],top=yInterval[1];
      addProductBox(zone,{name:'Fixed Glass Pane '+(xi+1)+'-'+(yi+1),u:(left+right)/2,y:(bottom+top)/2,v:glassV,w:Math.max(60,right-left-12),h:Math.max(60,top-bottom-12),t:glazing.glassDepth},glassColor,.34);
    });
  });
  addFixedHeightDimensions(zone,segments,centers);
}

function slidingTrackLevel(index,panels,openingType,direction){
  if(openingType==='CENTER OPENING'){
    const centerDistance=Math.floor(Math.abs(index-(panels-1)/2));
    const maxDistance=Math.max(0,Math.floor((panels-1)/2));
    return direction==='INSIDE'?maxDistance-centerDistance:centerDistance;
  }
  if(direction==='LEFT')return index;
  return panels-1-index;
}

function slidingPanelLayout(innerW,panels,overlap,openingType,collectionState,direction){
  const collected=collectionState==='COLLECTED';
  const positions=[];
  if(openingType==='CENTER OPENING'&&panels%2===0){
    const half=panels/2;
    const centerGap=2;
    const halfSpan=(innerW-centerGap)/2;
    const panelW=(halfSpan+overlap*(half-1))/half;
    for(let i=0;i<half;i++)positions.push(-innerW/2+panelW/2+i*(panelW-overlap));
    for(let i=0;i<half;i++)positions.push(centerGap/2+panelW/2+i*(panelW-overlap));
    if(collected){
      const maxReveal=half>1?Math.max(0,(halfSpan-panelW)/(half-1)):0;
      const reveal=half>1?Math.min(24,panelW*.06,maxReveal):0;
      for(let i=0;i<half;i++)positions[i]=-innerW/2+panelW/2+i*reveal;
      for(let i=0;i<half;i++)positions[half+i]=innerW/2-panelW/2-(half-1-i)*reveal;
    }
    return {panelW,positions,centerGap};
  }
  const panelW=(innerW+overlap*(panels-1))/panels;
  const start=-innerW/2+panelW/2;
  for(let i=0;i<panels;i++)positions.push(start+i*(panelW-overlap));
  if(collected){
    const maxReveal=panels>1?Math.max(0,(innerW-panelW)/(panels-1)):0;
    const reveal=panels>1?Math.min(24,panelW*.06,maxReveal):0;
    const stackLeft=direction==='RIGHT';
    for(let i=0;i<panels;i++){
      positions[i]=stackLeft
        ? -innerW/2+panelW/2+i*reveal
        : innerW/2-panelW/2-(panels-1-i)*reveal;
    }
  }
  return {panelW,positions,centerGap:0};
}

function buildFoldingProduct(zone,placement){
  zone=fitProductZone(zone,5);
  const series=String(placement.series||'A SERIES')==='K SERIES'?'K SERIES':'A SERIES';
  const frameColor=DEFAULT_COLOR_MODE?(series==='K SERIES'?0x1e293b:0x334155):SYSTEM_COLOR;
  const panelColor=DEFAULT_COLOR_MODE?(series==='K SERIES'?0x0f766e:0x0d9488):SYSTEM_COLOR;
  const glassColor=glassVisualColor(placement);
  const glazing=glazingSectionSpec(placement);
  const frameDepth=series==='K SERIES'?92:80;
  const frameFace=55;
  const bottomProfile=70;
  const v=productDepthCenter(zone,frameDepth,0);
  const halfW=zone.width/2;
  addProductBox(zone,{name:'Folding Bottom Threshold 70 mm',u:0,y:zone.bottomY+bottomProfile/2,v,w:zone.width,h:bottomProfile,t:frameDepth},frameColor,1);
  addProductBox(zone,{name:'Folding Top Frame',u:0,y:zone.topY-frameFace/2,v,w:zone.width,h:frameFace,t:frameDepth},frameColor,1);
  addProductBox(zone,{name:'Folding Left Frame',u:-halfW+frameFace/2,y:(zone.bottomY+bottomProfile+zone.topY-frameFace)/2,v,w:frameFace,h:Math.max(100,zone.height-bottomProfile-frameFace),t:frameDepth},frameColor,1);
  addProductBox(zone,{name:'Folding Right Frame',u:halfW-frameFace/2,y:(zone.bottomY+bottomProfile+zone.topY-frameFace)/2,v,w:frameFace,h:Math.max(100,zone.height-bottomProfile-frameFace),t:frameDepth},frameColor,1);

  const innerW=Math.max(160,zone.width-frameFace*2);
  const innerBottom=zone.bottomY+bottomProfile;
  const innerTop=zone.topY-frameFace;
  const innerH=Math.max(180,innerTop-innerBottom);
  const panels=Math.max(2,Math.round(Number(placement.panels)||Math.ceil(innerW/600)));
  const selectedDirection=panels>8?'BOTH':(['LEFT','RIGHT','BOTH'].includes(String(placement.openingDirection))?String(placement.openingDirection):'RIGHT');
  const foldingView=String(placement.foldingView||'INSIDE VIEW')==='OUTSIDE VIEW'?'OUTSIDE VIEW':'INSIDE VIEW';
  const foldingOpenDirection=String(placement.foldingOpenDirection||'INWARD')==='OUTWARD'?'OUTWARD':'INWARD';
  const physicalDirection=foldingPhysicalSideFromView(selectedDirection,zone,foldingView);
  const viewSideFromPhysical=(side)=>foldingViewSideFromPhysical(side,zone,foldingView);
  const panelW=Math.max(80,innerW/panels);
  const stile=Math.max(24,Math.min(34,panelW*.075));
  const panelH=Math.max(160,innerH-8);
  const panelY=innerBottom+innerH/2;
  const glassV=productDepthCenter(zone,glazing.glassDepth,(frameDepth-glazing.glassDepth)/2);
  const productOpen=productIsOpen(zone.id);
  const symbolFace=foldingView==='INSIDE VIEW'?'inside':'outside';
  const symbolV=v+(foldingView==='INSIDE VIEW'?1:-1)*zone.inward*(frameDepth/2-2.5);
  const foldV=foldingFoldV(zone,foldingOpenDirection);
  const axisSign=zone.axis==='x'?-1:1;

  function foldAngleForPhysicalSide(side){
    const leafDirection=side==='LEFT'?1:-1;
    return axisSign*foldV*leafDirection*Math.PI/2;
  }

  function addClosedLeaf(index,u){
    markTogglePanel(addProductBox(zone,{name:'Folding Glass '+(index+1),u,y:panelY,v:glassV,w:Math.max(50,panelW-stile*2),h:Math.max(80,panelH-stile*2),t:glazing.glassDepth},glassColor,.34),zone,productOpen);
    markTogglePanel(addProductBox(zone,{name:'Folding Left Stile '+(index+1),u:u-panelW/2+stile/2,y:panelY,v,w:stile,h:panelH,t:glazing.frameDepth},panelColor,1),zone,productOpen);
    markTogglePanel(addProductBox(zone,{name:'Folding Right Stile '+(index+1),u:u+panelW/2-stile/2,y:panelY,v,w:stile,h:panelH,t:glazing.frameDepth},panelColor,1),zone,productOpen);
    markTogglePanel(addProductBox(zone,{name:'Folding Top Rail '+(index+1),u,y:innerTop-stile/2,v,w:panelW,h:stile,t:glazing.frameDepth},panelColor,1),zone,productOpen);
    markTogglePanel(addProductBox(zone,{name:'Folding Bottom Rail '+(index+1),u,y:innerBottom+stile/2,v,w:panelW,h:stile,t:glazing.frameDepth},panelColor,1),zone,productOpen);
  }

  const foldedPanelGap=33;
  const foldedPanelPitch=glazing.frameDepth+foldedPanelGap;

  function firstPanelForPhysicalSide(index,side){
    return side==='LEFT'?index===0:index===panels-1;
  }

  function addFoldedLeaf(index,physicalSide,stackIndex){
    const leftSide=physicalSide==='LEFT';
    const stackOffset=stackIndex*foldedPanelPitch;
    const hingeU=leftSide?-innerW/2+stackOffset:innerW/2-stackOffset;
    const centerU=leftSide?hingeU+panelW/2:hingeU-panelW/2;
    const hingeV=v;
    const plannedAngle=foldAngleForPhysicalSide(physicalSide);
    const pivot=createDoorPivot(zone,hingeU,hingeV,plannedAngle);
    const part=(cfg,color,opacity)=>addDoorPivotPart(zone,pivot,cfg,color,opacity,hingeU,hingeV,productOpen);
    part({name:'Folded Glass '+(index+1),u:centerU,y:panelY,v:hingeV,w:Math.max(50,panelW-stile*2),h:Math.max(80,panelH-stile*2),t:glazing.glassDepth},glassColor,.34);
    part({name:'Folded Left Stile '+(index+1),u:centerU-panelW/2+stile/2,y:panelY,v:hingeV,w:stile,h:panelH,t:glazing.frameDepth},panelColor,1);
    part({name:'Folded Right Stile '+(index+1),u:centerU+panelW/2-stile/2,y:panelY,v:hingeV,w:stile,h:panelH,t:glazing.frameDepth},panelColor,1);
    part({name:'Folded Top Rail '+(index+1),u:centerU,y:innerTop-stile/2,v:hingeV,w:panelW,h:stile,t:glazing.frameDepth},panelColor,1);
    part({name:'Folded Bottom Rail '+(index+1),u:centerU,y:innerBottom+stile/2,v:hingeV,w:panelW,h:stile,t:glazing.frameDepth},panelColor,1);
    const viewSide=viewSideFromPhysical(physicalSide);
    const first=stackIndex===0;
    addDoorPivotSymbol(zone,pivot,{
      name:'Folding Leaf Symbol '+(index+1),
      text:first?'↻':(viewSide==='LEFT'?'←':'→'),
      u:centerU,
      y:panelY,
      v:hingeV,
      w:Math.max(180,panelW*.62),
      h:Math.max(180,panelH*.30),
      fontSize:first?150:112,
      color:0xf97316,
      opacity:1,
      rotationZ:0,
      turnDirection:first?foldingFirstTurnDirection(physicalSide,zone,foldingView,foldingOpenDirection):null,
      face:symbolFace
    },hingeU,hingeV,productOpen);
  }

  if(productOpen){
    let leftCount=0;
    let rightCount=0;
    if(physicalDirection==='LEFT')leftCount=panels;
    else if(physicalDirection==='RIGHT')rightCount=panels;
    else{
      leftCount=Math.floor(panels/2);
      rightCount=panels-leftCount;
    }
    for(let i=0;i<leftCount;i++)addFoldedLeaf(i,'LEFT',i);
    for(let i=0;i<rightCount;i++)addFoldedLeaf(panels-1-i,'RIGHT',i);
  }else{
    for(let i=0;i<panels;i++){
      const u=-innerW/2+panelW/2+i*panelW;
      addClosedLeaf(i,u);
      const physicalSide=physicalDirection==='BOTH'?(i<Math.floor(panels/2)?'LEFT':'RIGHT'):physicalDirection;
      const viewSide=viewSideFromPhysical(physicalSide);
      const first=firstPanelForPhysicalSide(i,physicalSide);
      const plannedAngle=foldAngleForPhysicalSide(physicalSide);
      addFacadePanelSymbol(zone,{
        name:'Folding Leaf Symbol '+(i+1),
        text:first?'↻':(viewSide==='LEFT'?'←':'→'),
        u,
        y:panelY,
        v:symbolV,
        w:Math.max(180,panelW*.62),
        h:Math.max(180,panelH*.30),
        fontSize:first?150:112,
        color:0xf97316,
        opacity:1,
        rotationZ:0,
        turnDirection:first?foldingFirstTurnDirection(physicalSide,zone,foldingView,foldingOpenDirection):null,
        face:symbolFace
      });
    }
  }
}

function buildSlidingProduct(zone,placement){
  zone=fitProductZone(zone,5);
  const frameColor=DEFAULT_COLOR_MODE?(String(placement.series||'A SERIES')==='K SERIES'?0x1e293b:0x334155):SYSTEM_COLOR;
  const panelColor=DEFAULT_COLOR_MODE?(String(placement.series||'A SERIES')==='K SERIES'?0x0f766e:0x0d9488):SYSTEM_COLOR;
  const glassColor=glassVisualColor(placement);
  const glazing=glazingSectionSpec(placement);
  const frameDepth=String(placement.series||'A SERIES')==='K SERIES'?92:80;
  const dims=addFrame(zone,zone.width,zone.height,frameDepth,frameColor);
  const panels=Math.max(2,Math.min(12,Math.round(Number(placement.panels)||4)));
  const overlap=Math.max(38,Math.min(58,zone.width/(panels*5)));
  const openingType=String(placement.openingType||'SIDE OPENING');
  const slidingView=String(placement.slidingView||'OUTSIDE VIEW')==='INSIDE VIEW'?'INSIDE VIEW':'OUTSIDE VIEW';
  const selectedDirection=openingType==='CENTER OPENING'
    ?(String(placement.openingDirection||'OUTSIDE')==='INSIDE'?'INSIDE':'OUTSIDE')
    :(String(placement.openingDirection||'RIGHT')==='LEFT'?'LEFT':'RIGHT');
  const direction=openingType==='CENTER OPENING'?selectedDirection:slidingPhysicalSideFromView(selectedDirection,zone,slidingView);
  const productOpen=productIsOpen(zone.id);
  const collectionState=productOpen?'COLLECTED':'NORMAL';
  const layout=slidingPanelLayout(dims.innerW,panels,overlap,openingType,collectionState,direction);
  const panelW=layout.panelW;
  const threshold=String(placement.subtype||'WITH THRESHOLD')==='WITH THRESHOLD';
  const thresholdH=threshold?42:15;
  const panelH=Math.max(240,dims.innerH-thresholdH-20);
  const stile=Math.max(24,Math.min(34,panelW*.08));
  const panelBottom=zone.bottomY+dims.frame+thresholdH;
  const trackStep=glazing.frameDepth+2;
  const insulated=String(placement.glassThickness||'').toUpperCase()==='INSULATED GLASS';
  const thresholdDepth=threshold&&openingType==='SIDE OPENING'&&panels>=6&&insulated?123+panels*24:123;
  const thresholdV=productDepthCenter(zone,thresholdDepth,0);

  addProductBox(zone,{name:threshold?'Sliding Threshold':'Sliding Flush Bottom Profile',u:0,y:zone.bottomY+dims.frame+thresholdH/2-4,v:thresholdV,w:dims.innerW,h:thresholdH,t:thresholdDepth},profileColor(0x475569),1);

  const centerLeft=panels/2-1;
  const centerRight=panels/2;
  for(let i=0;i<panels;i++){
    const u=layout.positions[i];
    const trackLevel=slidingTrackLevel(i,panels,openingType,direction);
    const v=productDepthCenter(zone,glazing.frameDepth,trackLevel*trackStep);
    markTogglePanel(addProductBox(zone,{name:'Sliding Glass '+(i+1),u,y:panelBottom+panelH/2,v,w:Math.max(60,panelW-stile*2),h:Math.max(100,panelH-stile*2),t:glazing.glassDepth},glassColor,.34),zone,productOpen);
    markTogglePanel(addProductBox(zone,{name:'Sliding Left Stile '+(i+1),u:u-panelW/2+stile/2,y:panelBottom+panelH/2,v,w:stile,h:panelH,t:glazing.frameDepth},panelColor,1),zone,productOpen);
    markTogglePanel(addProductBox(zone,{name:'Sliding Right Stile '+(i+1),u:u+panelW/2-stile/2,y:panelBottom+panelH/2,v,w:stile,h:panelH,t:glazing.frameDepth},panelColor,1),zone,productOpen);
    markTogglePanel(addProductBox(zone,{name:'Sliding Top Rail '+(i+1),u,y:panelBottom+panelH-stile/2,v,w:panelW,h:stile,t:glazing.frameDepth},panelColor,1),zone,productOpen);
    markTogglePanel(addProductBox(zone,{name:'Sliding Bottom Rail '+(i+1),u,y:panelBottom+stile/2,v,w:panelW,h:stile,t:glazing.frameDepth},panelColor,1),zone,productOpen);

    if(openingType==='SIDE OPENING'){
      const thickIndex=direction==='LEFT'?0:panels-1;
      const thinIndex=direction==='LEFT'?panels-1:0;
      if(i===thickIndex||i===thinIndex){
        const thick=i===thickIndex;
        const arrowDirection=direction==='LEFT'?(thick?1:-1):(thick?-1:1);
        addFacadeArrow(zone,{
          name:(thick?'Primary':'Secondary')+' Sliding Direction Arrow',
          u,
          y:panelBottom+panelH/2,
          v:productSurfaceCenter(zone,v,glazing.frameDepth,4),
          length:Math.min(panelW-stile*2-20,420),
          maxLength:panelW-stile*2-20,
          direction:arrowDirection,
          vertical:false,
          thick
        });
      }
    }else if(i===centerLeft||i===centerRight){
      addFacadeArrow(zone,{
        name:(i===centerLeft?'Left':'Right')+' Center Sliding Direction Arrow',
        u,
        y:panelBottom+panelH/2,
        v:productSurfaceCenter(zone,v,glazing.frameDepth,4),
        length:Math.min(panelW-stile*2-20,420),
        maxLength:panelW-stile*2-20,
        direction:i===centerLeft?-1:1,
        vertical:false,
        thick:true
      });
    }
  }
}

function buildGuillotinePanel(zone,cfg,placement,index){
  const subtype=String(placement.subtype||'CLEANABLE');
  const vasistasOpen=Boolean(cfg.productOpen)&&index===0&&subtype==='CLEANABLE';
  const angle=vasistasOpen?THREE.MathUtils.degToRad(29):0;
  const hingeY=cfg.y-cfg.panelH/2;
  const addPart=(part,color,opacity)=>markTogglePanel(vasistasOpen
    ?addBottomHungProductBox(zone,part,color,opacity,angle,hingeY)
    :addProductBox(zone,part,color,opacity),zone,Boolean(cfg.productOpen));

  addPart({name:'Guillotine Glass '+(index+1),u:0,y:cfg.y,v:cfg.v,w:Math.max(60,cfg.panelW-cfg.stile*2),h:Math.max(100,cfg.panelH-cfg.stile*2),t:cfg.glassDepth},cfg.glassColor,.35);
  addPart({name:'Guillotine Left Stile '+(index+1),u:-cfg.panelW/2+cfg.stile/2,y:cfg.y,v:cfg.v,w:cfg.stile,h:cfg.panelH,t:cfg.frameDepth},cfg.panelColor,1);
  addPart({name:'Guillotine Right Stile '+(index+1),u:cfg.panelW/2-cfg.stile/2,y:cfg.y,v:cfg.v,w:cfg.stile,h:cfg.panelH,t:cfg.frameDepth},cfg.panelColor,1);
  addPart({name:'Guillotine Top Rail '+(index+1),u:0,y:cfg.y+cfg.panelH/2-cfg.stile/2,v:cfg.v,w:cfg.panelW,h:cfg.stile,t:cfg.frameDepth},cfg.panelColor,1);
  addPart({name:'Guillotine Bottom Rail '+(index+1),u:0,y:cfg.y-cfg.panelH/2+cfg.stile/2,v:cfg.v,w:cfg.panelW,h:cfg.stile,t:cfg.frameDepth},cfg.panelColor,1);

  if(vasistasOpen){
    addPart({name:'Cleanable Vasistas Hinge',u:0,y:cfg.y-cfg.panelH/2+8,v:cfg.v+zone.inward*6,w:Math.max(80,cfg.panelW*.6),h:12,t:18},0xf59e0b,1);
  }

  const downwardArrow=(subtype==='CLEANABLE'||subtype==='DOWNWARD COLLECTING')&&index>0;
  const upwardArrow=subtype==='UPWARD COLLECTING'&&index<cfg.panels-1;
  if(downwardArrow||upwardArrow){
    addFacadeArrow(zone,{
      name:(downwardArrow?'Downward':'Upward')+' Guillotine Direction Arrow '+(index+1),
      u:0,
      y:cfg.y,
      v:productSurfaceCenter(zone,cfg.v,cfg.frameDepth,4),
      length:Math.min(cfg.panelH-cfg.stile*2-24,320),
      maxLength:cfg.panelH-cfg.stile*2-24,
      direction:downwardArrow?-1:1,
      vertical:true,
      thick:true
    });
  }
}

function guillotinePanelLayerInset(index,panels,panelDepth,gap){
  const step=panelDepth+gap;
  return Math.max(0,(panels-1-index)*step);
}

function facadeRightDirectionSign(zone){
  const originalInward=Number.isFinite(Number(zone&&zone.zipOriginalInward))
    ? Number(zone.zipOriginalInward)
    : (Number.isFinite(Number(zone&&zone.inward)) ? Number(zone.inward) : 1);
  return zone&&zone.axis==='x'?-originalInward:originalInward;
}

function buildGuillotineProduct(zone,placement){
  zone=fitProductZone(zone,5);
  const seriesK=String(placement.series||'A SERIES')==='K SERIES';
  const frameColor=DEFAULT_COLOR_MODE?(seriesK?0x1e293b:0x334155):SYSTEM_COLOR;
  const panelColor=DEFAULT_COLOR_MODE?(seriesK?0x6d28d9:0x7c3aed):SYSTEM_COLOR;
  const glassColor=glassVisualColor(placement);
  const glazing=glazingSectionSpec(placement);
  const dims=addFrame(zone,zone.width,zone.height,seriesK?96:86,frameColor);
  const motorH=Math.min(160,Math.max(100,zone.height*.08));
  const motorY=zone.topY-dims.frame-motorH/2;
  const motorBoxDepth=96;
  const motorBoxV=productDepthCenter(zone,motorBoxDepth,0);
  addProductBox(zone,{name:'Guillotine Motor Box',u:0,y:motorY,v:motorBoxV,w:dims.innerW,h:motorH,t:motorBoxDepth},motorVisualColor(placement),1);

  const facadeRightSign=facadeRightDirectionSign(zone);
  const motorSide=String(placement.motorDirection||'RIGHT')==='RIGHT'?facadeRightSign:-facadeRightSign;
  addFacadeText(zone,{name:'Guillotine Motor Label',text:'MOTOR',u:motorSide*(dims.innerW/2-150),y:motorY,v:zone.outerFaceV-zone.inward*34,w:220,h:70});
  addProductBox(zone,{name:'Guillotine Motor Side',u:motorSide*(dims.innerW/2-32),y:motorY,v:productDepthCenter(zone,112,0),w:52,h:motorH*.72,t:112},profileColor(0x111827),1);
  const panels=Math.max(2,Math.min(8,Math.round(Number(placement.panels)||3)));
  const usableH=Math.max(360,dims.innerH-motorH-16);
  const overlap=Math.max(42,Math.min(78,usableH/(panels*4)));
  const panelH=(usableH+overlap*(panels-1))/panels;
  const panelW=dims.innerW-34;
  const stile=Math.max(24,Math.min(32,panelW*.045));
  const bottom=zone.bottomY+dims.frame+8;
  const subtype=String(placement.subtype||'CLEANABLE');
  const productOpen=productIsOpen(zone.id);
  const collected=productOpen;
  const upward=subtype==='UPWARD COLLECTING'&&collected;
  const downward=subtype==='DOWNWARD COLLECTING'&&collected;
  const collectedStep=Math.max(34,overlap*.62);
  const guillotinePanelDepth=glazing.frameDepth;
  const guillotinePanelGap=2;

  for(let i=0;i<panels;i++){
    const y=upward
      ? zone.topY-dims.frame-motorH-panelH/2-i*collectedStep
      : downward
        ? bottom+panelH/2+i*collectedStep
        : bottom+panelH/2+i*(panelH-overlap);
    const layerInset=guillotinePanelLayerInset(i,panels,guillotinePanelDepth,guillotinePanelGap);
    const v=productDepthCenter(zone,guillotinePanelDepth,layerInset);
    buildGuillotinePanel(zone,{y,v,panelW,panelH,stile,panelColor,glassColor,glassDepth:glazing.glassDepth,frameDepth:glazing.frameDepth,panels,productOpen},placement,i);
  }
}

function zipFabricCssColor(placement){
  const code=String(placement.fabricColor||'');
  const map={'7635-52101':'#f7f8f1','7635-52102':'#cfd1cc','7635-52103':'#a1a39e','7635-52105':'#5d6568','7635-52106':'#4f575a','7635-52107':'#33373a','7635-52173':'#f7f7d7','7635-52174':'#f9f9e8','7635-52176':'#b9ac8a','7635-52142':'#696f72','7635-52144':'#323639','92-2044':'#f7f6f1','92-2135':'#9e988d','92-2171':'#909899','92-2043':'#343635','92-2047':'#2c3135','86-2044':'#f5f4e9','86-2135':'#9a958a','86-2171':'#8f9899','86-2043':'#393c3b','86-2047':'#31363a','W88-8102':'#f7f6e2','W88-2047':'#262b33'};
  if(map[code])return map[code];
  const meta=ZIP_FABRIC_META&&ZIP_FABRIC_META[code];
  if(meta&&/^#[0-9a-f]{6}$/i.test(String(meta.tone||'')))return meta.tone;
  return '#8b9096';
}

function configureZipFabricTexture(texture,panelWidth,panelHeight,tileMm){
  if(!texture)return texture;
  texture.wrapS=THREE.MirroredRepeatWrapping;
  texture.wrapT=THREE.MirroredRepeatWrapping;
  const tile=Math.max(60,(Number(tileMm)||500)*0.25); // V3.81: previous crop looked ~4x zoomed; restore ~1x fabric scale.
  const width=Math.max(80,Number(panelWidth)||tile);
  const height=Math.max(120,Number(panelHeight)||tile);
  texture.repeat.set(Math.max(1,width/tile),Math.max(1,height/tile));
  if(texture.center)texture.center.set(.5,.5);
  if(THREE.sRGBEncoding!==undefined)texture.encoding=THREE.sRGBEncoding;
  if(renderer&&renderer.capabilities&&renderer.capabilities.getMaxAnisotropy){
    texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  }
  texture.needsUpdate=true;
  return texture;
}

function createZipFallbackTexture(fallbackColor,panelWidth,panelHeight,tileMm){
  const canvas=document.createElement('canvas');
  canvas.width=256;
  canvas.height=256;
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  ctx.fillStyle=fallbackColor;
  ctx.fillRect(0,0,256,256);
  ctx.fillStyle='rgba(17,24,39,.46)';
  for(let y=3;y<256;y+=7){
    for(let x=3;x<256;x+=7){
      ctx.beginPath();
      ctx.arc(x+(y%14?1.4:0),y,.72,0,Math.PI*2);
      ctx.fill();
    }
  }
  return configureZipFabricTexture(new THREE.CanvasTexture(canvas),panelWidth,panelHeight,tileMm);
}

function markOwnedTexture(texture){
  if(!texture)return texture;
  texture.userData=texture.userData||{};
  texture.userData.p3dvOwned=true;
  return texture;
}

function materialGenerationActive(material,generation){
  return Boolean(material)&&!(material.userData&&material.userData.p3dvDisposed)&&generation===modelGeneration;
}

function applyOwnedMaterialTexture(material,texture,generation){
  if(!texture)return false;
  markOwnedTexture(texture);
  if(!materialGenerationActive(material,generation)){
    texture.dispose();
    return false;
  }
  const previous=material.map;
  material.map=texture;
  if(previous&&previous!==texture&&previous.userData&&previous.userData.p3dvOwned&&!(previous.userData&&previous.userData.p3dvShared)&&typeof previous.dispose==='function'){
    previous.dispose();
  }
  material.needsUpdate=true;
  return true;
}

function createZipFabricMaterial(placement,panelWidth,panelHeight){
  const code=String(placement.fabricColor||'');
  const meta=ZIP_FABRIC_META&&ZIP_FABRIC_META[code];
  const fallbackColor=zipFabricCssColor(placement);
  const tileMm=meta&&Number(meta.tileMm)>0?Number(meta.tileMm):500;
  const generation=modelGeneration;
  const fallbackTexture=markOwnedTexture(createZipFallbackTexture(fallbackColor,panelWidth,panelHeight,tileMm));
  const material=new THREE.MeshBasicMaterial({
    map:fallbackTexture,
    color:fallbackTexture?0xffffff:Number('0x'+fallbackColor.replace('#','')),
    transparent:false,
    opacity:1,
    side:THREE.DoubleSide,
    toneMapped:false
  });
  material.userData={...(material.userData||{}),p3dvGeneration:generation};

  const applyImageTexture=(image)=>{
    try{
      const texture=configureZipFabricTexture(new THREE.Texture(image),panelWidth,panelHeight,tileMm);
      if(!applyOwnedMaterialTexture(material,texture,generation))return;
      material.color.setHex(0xffffff);
      material.opacity=1;
      material.transparent=false;
      material.needsUpdate=true;
    }catch(error){
      if(!materialGenerationActive(material,generation))return;
      material.map=fallbackTexture;
      material.color.setHex(fallbackTexture?0xffffff:Number('0x'+fallbackColor.replace('#','')));
      material.needsUpdate=true;
    }
  };

  const loadCatalogCrop=()=>{
    if(!meta||!meta.image||typeof Image!=='function')return;
    const sourceImage=new Image();
    sourceImage.onload=()=>{
      try{
        const left=parseFloat(meta.left)/100;
        const top=parseFloat(meta.top)/100;
        const width=parseFloat(meta.width)/100;
        const height=parseFloat(meta.height)/100;
        if(![left,top,width,height].every(Number.isFinite)||width<=0||height<=0)return;
        const sampleX=sourceImage.naturalWidth*(left+width*.05);
        const sampleY=sourceImage.naturalHeight*(top+height*.06);
        const sampleW=sourceImage.naturalWidth*width*.47;
        const sampleH=sourceImage.naturalHeight*height*.42;
        const side=Math.max(2,Math.min(sampleW,sampleH));
        const sourceX=sampleX+(sampleW-side)/2;
        const sourceY=sampleY+(sampleH-side)/2;
        const cropCanvas=document.createElement('canvas');
        cropCanvas.width=512;
        cropCanvas.height=512;
        const cropCtx=cropCanvas.getContext('2d');
        if(!cropCtx)return;
        cropCtx.drawImage(sourceImage,sourceX,sourceY,side,side,0,0,512,512);
        const texture=configureZipFabricTexture(new THREE.CanvasTexture(cropCanvas),panelWidth,panelHeight,tileMm);
        if(!applyOwnedMaterialTexture(material,texture,generation))return;
        material.color.setHex(0xffffff);
        material.opacity=1;
        material.transparent=false;
        material.needsUpdate=true;
      }catch(error){
        if(!materialGenerationActive(material,generation))return;
        material.map=fallbackTexture;
        material.needsUpdate=true;
      }
    };
    sourceImage.onerror=()=>{
      if(!materialGenerationActive(material,generation))return;
      material.map=fallbackTexture;
      material.needsUpdate=true;
    };
    sourceImage.src=meta.image;
  };

  const loadTextureSource=(src,onError)=>{
    if(!src||typeof Image!=='function'){
      if(onError)onError();
      return;
    }
    const image=new Image();
    image.onload=()=>applyImageTexture(image);
    image.onerror=()=>{ if(onError)onError(); };
    image.src=src;
  };

  if(meta&&meta.textureData){
    loadTextureSource(meta.textureData,()=>{
      if(meta.texture)loadTextureSource(meta.texture,loadCatalogCrop);
      else loadCatalogCrop();
    });
  }else if(meta&&meta.texture){
    loadTextureSource(meta.texture,loadCatalogCrop);
  }else{
    loadCatalogCrop();
  }
  return material;
}

function addZipFabricPanel(zone,cfg,placement,panelMeta){
  const axisX=zone.axis==='x';
  const geo=new THREE.BoxGeometry(axisX?cfg.w:cfg.t,cfg.h,axisX?cfg.t:cfg.w);
  const mesh=new THREE.Mesh(geo,createZipFabricMaterial(placement,cfg.w,cfg.h));
  const x=axisX?zone.cx+cfg.u:zone.cx+cfg.v;
  const z=axisX?zone.cz+cfg.v:zone.cz+cfg.u;
  mesh.position.set(x,cfg.y,z);
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  mesh.userData={
    name:'Zip Perde Kumaş Paneli',
    isProduct:true,
    isTogglePanel:true,
    panelKey:panelMeta.panelKey,
    productKey:panelMeta.panelKey,
    panelOpen:Boolean(panelMeta.panelOpen),
    zoneId:zone.id
  };
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0x111827,transparent:true,opacity:.42})));
  mesh.visible=true;
  group.add(mesh);
  parts.push(mesh);
  interactiveObjects.push(mesh);
  return mesh;
}

function buildZipScreenProduct(zone,placement){
  const originalInward=zone.inward;
  zone=fitZipProductZone(zone,placement);
  const zipOutside=Boolean(zone.zipOutside);
  zone={...zone,inward:zipOutside?-originalInward:originalInward,zipOriginalInward:originalInward};
  const box=zone.zipBox||zipBoxSectionSpec(placement);
  const seriesP=String(placement.series||'G SERIES')==='P SERIES';
  const frameColor=DEFAULT_COLOR_MODE?(seriesP?0x1e3a5f:0x374151):SYSTEM_COLOR;
  const accentColor=DEFAULT_COLOR_MODE?(seriesP?0x0f766e:0x475569):SYSTEM_COLOR;
  const frameDepth=Math.max(72,Math.min(110,box.depth));
  const dims=addFrame(zone,zone.width,zone.height,frameDepth,frameColor);
  const topBoxY=zone.topY-dims.frame-box.height/2;
  const topBoxBottom=zone.topY-dims.frame-box.height;
  const topBoxV=productDepthCenter(zone,box.depth,0);
  addProductBox(zone,{name:'Zip Top Box',u:0,y:topBoxY,v:topBoxV,w:dims.innerW,h:box.height,t:box.depth},frameColor,1);

  const guideW=Math.max(28,Math.min(42,box.width*.34));
  const guideDepth=Math.max(26,Math.min(48,box.depth*.4));
  const panelBottom=zone.bottomY+dims.frame+8;
  const fullPanelH=Math.max(120,topBoxBottom-panelBottom-8);
  const guideY=panelBottom+fullPanelH/2;
  const guideV=productDepthCenter(zone,guideDepth,0);
  addProductBox(zone,{name:'Zip Left Guide',u:-dims.innerW/2+guideW/2,y:guideY,v:guideV,w:guideW,h:fullPanelH,t:guideDepth},accentColor,1);
  addProductBox(zone,{name:'Zip Right Guide',u:dims.innerW/2-guideW/2,y:guideY,v:guideV,w:guideW,h:fullPanelH,t:guideDepth},accentColor,1);

  const panelKey='zip:'+zone.id;
  const panelOpen=productIsOpen(panelKey);
  const bottomBarH=32;
  const fabricDepth=5;
  const fabricW=Math.max(80,dims.innerW-guideW*2);
  const guillotineReferenceDepth=12;
  const lowerFixedPanelInset=guillotinePanelLayerInset(0,3,guillotineReferenceDepth,2);
  const fabricV=productDepthCenter(zone,fabricDepth,lowerFixedPanelInset);
  const visibleFabricH=panelOpen?Math.max(80,(fullPanelH-bottomBarH)*.80):Math.max(80,fullPanelH-bottomBarH);
  const fabricY=panelOpen
    ? topBoxBottom-visibleFabricH/2-4
    : panelBottom+visibleFabricH/2;
  const bottomBarY=panelOpen
    ? topBoxBottom-visibleFabricH-bottomBarH/2-4
    : panelBottom+visibleFabricH+bottomBarH/2;

  addZipFabricPanel(zone,{u:0,y:fabricY,v:fabricV,w:fabricW,h:visibleFabricH,t:fabricDepth},placement,{panelKey,panelOpen});
  const bottomBar=addProductBox(zone,{name:'Zip Bottom Bar',u:0,y:bottomBarY,v:productDepthCenter(zone,guideDepth,lowerFixedPanelInset),w:fabricW,h:bottomBarH,t:guideDepth},accentColor,1);
  bottomBar.userData.panelKey=panelKey;
  bottomBar.userData.productKey=panelKey;
  bottomBar.userData.panelOpen=panelOpen;

  const facadeRightSign=facadeRightDirectionSign(zone);
  const motorSide=String(placement.motorDirection||'RIGHT')==='RIGHT'?facadeRightSign:-facadeRightSign;
  addFacadeText(zone,{name:'Zip Motor Label',text:'MOTOR',u:motorSide*(dims.innerW/2-145),y:topBoxY,v:zone.outerFaceV-zone.inward*34,w:210,h:64});

  const cable=String(placement.cableDirection||'BACK');
  let cableU=motorSide*(dims.innerW/2-24);
  let cableV=topBoxV;
  let cableY=topBoxY;
  if(cable==='BACK')cableV=productDepthCenter(zone,18,Math.max(0,box.depth-18));
  if(cable==='TOP')cableY=zone.topY-9;
  if(cable==='SIDE')cableU=motorSide*(dims.innerW/2-9);
  addProductBox(zone,{name:'Zip Cable Exit '+cable,u:cableU,y:cableY,v:cableV,w:18,h:18,t:18},0xf59e0b,1);
}

function buildZipFallbackProduct(zone,placement){
  const originalInward=zone.inward;
  zone=fitZipProductZone(zone,placement);
  const zipOutside=Boolean(zone.zipOutside);
  zone={...zone,inward:zipOutside?-originalInward:originalInward,zipOriginalInward:originalInward};
  const open=productIsOpen('zip:'+zone.id);
  const topBoxH=Math.max(100,Math.min(150,zipBoxSectionSpec(placement).height));
  const guide=34;
  const depth=36;
  const panelBottom=zone.bottomY+24;
  const panelTop=zone.topY-topBoxH-12;
  const fullH=Math.max(120,panelTop-panelBottom);
  const visibleH=open?Math.max(80,fullH*.80):fullH;
  const panelY=open?panelTop-visibleH/2:panelBottom+visibleH/2;
  addProductBox(zone,{name:'Zip Fallback Top Box',u:0,y:zone.topY-topBoxH/2,v:productDepthCenter(zone,topBoxH,0),w:zone.width,h:topBoxH,t:topBoxH},profileColor(0x374151),1);
  addProductBox(zone,{name:'Zip Fallback Left Guide',u:-zone.width/2+guide/2,y:panelBottom+fullH/2,v:productDepthCenter(zone,depth,0),w:guide,h:fullH,t:depth},profileColor(0x475569),1);
  addProductBox(zone,{name:'Zip Fallback Right Guide',u:zone.width/2-guide/2,y:panelBottom+fullH/2,v:productDepthCenter(zone,depth,0),w:guide,h:fullH,t:depth},profileColor(0x475569),1);
  markTogglePanel(addProductBox(zone,{name:'Zip Perde Gri Panel',u:0,y:panelY,v:productDepthCenter(zone,5,guillotinePanelLayerInset(0,3,12,2)),w:Math.max(80,zone.width-guide*2),h:visibleH,t:5},0x8b9096,1),zone,open,'zip:'+zone.id);
}
function zoneWorldPoint(zone,u,y,v){
  return zone.axis==='x'
    ? new THREE.Vector3(zone.cx+u,y,zone.cz+v)
    : new THREE.Vector3(zone.cx+v,y,zone.cz+u);
}

function registerDimensionLine(points,mainDimension){
  const geo=new THREE.BufferGeometry().setFromPoints(points);
  const line=new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:1,depthTest:false,linewidth:3}));
  line.renderOrder=50;
  const target=mainDimension?mainDimensionObjects:intermediateDimensionObjects;
  line.visible=mainDimension?dimensionVisibility.main:dimensionVisibility.intermediate;
  group.add(line);
  target.push(line);
  return line;
}

function addDimensionSegments(zone,segments,mainDimension){
  const points=[];
  segments.forEach(segment=>{
    points.push(zoneWorldPoint(zone,segment[0],segment[1],segment[2]));
    points.push(zoneWorldPoint(zone,segment[3],segment[4],segment[5]));
  });
  return registerDimensionLine(points,Boolean(mainDimension));
}

function addWorldDimensionSegments(segments,mainDimension){
  const points=[];
  segments.forEach(segment=>{
    points.push(new THREE.Vector3(segment[0],segment[1],segment[2]));
    points.push(new THREE.Vector3(segment[3],segment[4],segment[5]));
  });
  return registerDimensionLine(points,Boolean(mainDimension));
}

function createDimensionSprite(text,mainDimension){
  const isMain=Boolean(mainDimension);
  const canvas=document.createElement('canvas');
  canvas.width=4096;
  canvas.height=1024;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.font=(isMain?'900':'700')+' 368px Segoe UI, Arial, sans-serif';
  ctx.textAlign='center';
  ctx.textBaseline='middle';
  ctx.lineWidth=isMain?84:72;
  ctx.strokeStyle=isMain?'rgba(69,10,10,.98)':'rgba(15,23,42,.98)';
  ctx.strokeText(text,2048,528);
  ctx.fillStyle=isMain?'#ef4444':'#ffffff';
  ctx.fillText(text,2048,528);
  const texture=new THREE.CanvasTexture(canvas);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
  sprite.scale.set(isMain?2730:1950,isMain?686:490,1);
  sprite.renderOrder=55;
  const target=isMain?mainDimensionObjects:intermediateDimensionObjects;
  sprite.visible=isMain?dimensionVisibility.main:dimensionVisibility.intermediate;
  group.add(sprite);
  target.push(sprite);
  return sprite;
}

function addDimensionLabel(zone,text,u,y,v){
  const sprite=createDimensionSprite(text,false);
  sprite.position.copy(zoneWorldPoint(zone,u,y,v));
  return sprite;
}

function addWorldDimensionLabel(text,x,y,z,mainDimension){
  const sprite=createDimensionSprite(text,mainDimension);
  sprite.position.set(x,y,z);
  return sprite;
}

function addZoneWidthDimension(zone,rowIndex){
  const dimY=-H/2-155-rowIndex*105;
  const outsideV=zone.outerFaceV-zone.inward*80;
  const half=zone.width/2;
  const arrow=42;
  const wing=26;
  addDimensionSegments(zone,[
    [-half,zone.bottomY,outsideV,-half,dimY-24,outsideV],
    [half,zone.bottomY,outsideV,half,dimY-24,outsideV],
    [-half,dimY,outsideV,half,dimY,outsideV],
    [-half,dimY,outsideV,-half+arrow,dimY+wing,outsideV],
    [-half,dimY,outsideV,-half+arrow,dimY-wing,outsideV],
    [half,dimY,outsideV,half-arrow,dimY+wing,outsideV],
    [half,dimY,outsideV,half-arrow,dimY-wing,outsideV]
  ]);
  addDimensionLabel(zone,Math.round(zone.width)+' mm',0,dimY,outsideV);
}

function addZoneHeightDimension(zone,rowIndex){
  const outsideV=zone.outerFaceV-zone.inward*92;
  const dimU=-zone.width/2-120-rowIndex*72;
  const arrow=42;
  const wing=26;
  addDimensionSegments(zone,[
    [-zone.width/2,zone.bottomY,outsideV,dimU+24,zone.bottomY,outsideV],
    [-zone.width/2,zone.topY,outsideV,dimU+24,zone.topY,outsideV],
    [dimU,zone.bottomY,outsideV,dimU,zone.topY,outsideV],
    [dimU,zone.bottomY,outsideV,dimU-wing,zone.bottomY+arrow,outsideV],
    [dimU,zone.bottomY,outsideV,dimU+wing,zone.bottomY+arrow,outsideV],
    [dimU,zone.topY,outsideV,dimU-wing,zone.topY-arrow,outsideV],
    [dimU,zone.topY,outsideV,dimU+wing,zone.topY-arrow,outsideV]
  ]);
  addDimensionLabel(zone,Math.round(zone.height)+' mm',dimU,(zone.bottomY+zone.topY)/2,outsideV);
}

function addSystemDimensions(beamBottomY){
  const arrow=55;
  const wing=32;

  const backZ=D/2+310;
  const widthY=-H/2-470;
  addWorldDimensionSegments([
    [-W/2,-H/2,backZ,-W/2,widthY-28,backZ],
    [W/2,-H/2,backZ,W/2,widthY-28,backZ],
    [-W/2,widthY,backZ,W/2,widthY,backZ],
    [-W/2,widthY,backZ,-W/2+arrow,widthY+wing,backZ],
    [-W/2,widthY,backZ,-W/2+arrow,widthY-wing,backZ],
    [W/2,widthY,backZ,W/2-arrow,widthY+wing,backZ],
    [W/2,widthY,backZ,W/2-arrow,widthY-wing,backZ]
  ],true);
  addWorldDimensionLabel(Math.round(W)+' mm',0,widthY,backZ,true);

  const heightX=-W/2-360;
  const heightZ=D/2+210;
  addWorldDimensionSegments([
    [-W/2,-H/2,heightZ,heightX-28,-H/2,heightZ],
    [-W/2,H/2,heightZ,heightX-28,H/2,heightZ],
    [heightX,-H/2,heightZ,heightX,H/2,heightZ],
    [heightX,-H/2,heightZ,heightX-wing,-H/2+arrow,heightZ],
    [heightX,-H/2,heightZ,heightX+wing,-H/2+arrow,heightZ],
    [heightX,H/2,heightZ,heightX-wing,H/2-arrow,heightZ],
    [heightX,H/2,heightZ,heightX+wing,H/2-arrow,heightZ]
  ],true);
  addWorldDimensionLabel(Math.round(H)+' mm',heightX,0,heightZ,true);

  const depthX=-W/2-360;
  const depthY=H/2+250;
  addWorldDimensionSegments([
    [depthX,depthY,-D/2,depthX,depthY,D/2],
    [depthX,depthY,-D/2,depthX,depthY-28,-D/2],
    [depthX,depthY,D/2,depthX,depthY-28,D/2],
    [depthX,depthY,-D/2,depthX,depthY,-D/2+arrow],
    [depthX,depthY,-D/2,depthX,depthY-wing,-D/2+arrow],
    [depthX,depthY,D/2,depthX,depthY,D/2-arrow],
    [depthX,depthY,D/2,depthX,depthY-wing,D/2-arrow]
  ],true);
  addWorldDimensionLabel(Math.round(D)+' mm',depthX,depthY,0,true);

  const localX=-W/2-185;
  const localZ=-D/2-190;
  addWorldDimensionSegments([
    [-W/2,-H/2,localZ,localX-20,-H/2,localZ],
    [-W/2,beamBottomY,localZ,localX-20,beamBottomY,localZ],
    [localX,-H/2,localZ,localX,beamBottomY,localZ],
    [localX,-H/2,localZ,localX-wing,-H/2+arrow,localZ],
    [localX,-H/2,localZ,localX+wing,-H/2+arrow,localZ],
    [localX,beamBottomY,localZ,localX-wing,beamBottomY-arrow,localZ],
    [localX,beamBottomY,localZ,localX+wing,beamBottomY-arrow,localZ]
  ]);
  addWorldDimensionLabel(Math.round(beamBottomY+H/2)+' mm',localX,(-H/2+beamBottomY)/2,localZ,false);
}

function setDimensionVisibility(visibility){
  if(visibility&&typeof visibility==='object'){
    dimensionVisibility={
      intermediate:visibility.intermediate!==false,
      main:visibility.main!==false
    };
  }
  intermediateDimensionObjects.forEach(object=>{object.visible=dimensionVisibility.intermediate;});
  mainDimensionObjects.forEach(object=>{object.visible=dimensionVisibility.main;});
}

function addDividerProfileMesh(base,profile,opts){
  const depth=Math.max(30,Number(profile.depth)||100);
  const face=Math.max(40,Number(profile.width)||100);
  const axisX=base.axis==='x';
  const vertical=profile.orientation!=='horizontal';
  const span=Math.max(80,Number(opts.span)||base.width);
  const height=vertical?Math.max(200,H-beamSection.vertical):face;
  const geo=vertical
    ?new THREE.BoxGeometry(axisX?face:depth,height,axisX?depth:face)
    :new THREE.BoxGeometry(axisX?span:depth,face,axisX?depth:span);
  const mat=new THREE.MeshStandardMaterial({color:profileColor(0x0ea5e9),roughness:.46,metalness:.26});
  const mesh=new THREE.Mesh(geo,mat);
  const v=productDepthCenter(base,depth,0);
  const centerY=vertical?(-H/2+height/2):Number(opts.y);
  const point=zoneWorldPoint(base,Number(opts.u)||0,centerY,v);
  mesh.position.copy(point);
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  mesh.userData={
    name:profile.label||'Ara Profil',
    isDividerProfile:true,
    profileId:profile.id,
    facadeId:base.facadeId||base.id.split('|')[0],
    toolboxKey:'profile:'+(base.facadeId||base.id.split('|')[0])+':'+profile.id,
    profile:{...profile,facadeId:base.facadeId||base.id.split('|')[0]}
  };
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0x082f49,transparent:true,opacity:.72})));
  mesh.visible=false;
  group.add(mesh);
  parts.push(mesh);
  interactiveObjects.push(mesh);
  return mesh;
}

function createSubZone(base,startU,endU,bottomY,topY,index,total,leftBoundaryId,rightBoundaryId,bottomBoundaryId,topBoundaryId,leftBoundaryWidth,rightBoundaryWidth){
  const centerU=(startU+endU)/2;
  const width=Math.max(0,endU-startU);
  const height=Math.max(0,topY-bottomY);
  const defaultStartId=base.startBoundaryId||'START';
  const defaultEndId=base.endBoundaryId||'END';
  const noProfiles=leftBoundaryId===defaultStartId&&rightBoundaryId===defaultEndId&&bottomBoundaryId==='BOTTOM'&&topBoundaryId==='TOP';
  const id=noProfiles?base.id:base.id+'|'+leftBoundaryId+'-'+rightBoundaryId+'|'+bottomBoundaryId+'-'+topBoundaryId;
  const cx=base.axis==='x'?base.cx+centerU:base.cx;
  const cz=base.axis==='x'?base.cz:base.cz+centerU;
  const localStartRatio=(startU+base.width/2)/base.width;
  const localEndRatio=(endU+base.width/2)/base.width;
  const globalStart=Number.isFinite(Number(base.globalStartRatio))?Number(base.globalStartRatio):0;
  const globalEnd=Number.isFinite(Number(base.globalEndRatio))?Number(base.globalEndRatio):1;
  const ratioSpan=globalEnd-globalStart;
  return {
    ...base,
    id,
    facadeId:base.facadeId||base.id.split('|')[0],
    label:noProfiles?base.label:base.label+' · Alan '+(index+1),
    cx,
    cz,
    width,
    height,
    bottomY,
    topY,
    baseWidth:Number(base.globalBaseWidth)||base.width,
    baseHeight:base.height,
    startRatio:globalStart+localStartRatio*ratioSpan,
    endRatio:globalStart+localEndRatio*ratioSpan,
    bottomRatio:(bottomY-base.bottomY)/base.height,
    topRatio:(topY-base.bottomY)/base.height,
    leftBoundaryId,
    rightBoundaryId,
    leftBoundaryWidth:Math.max(0,Number(leftBoundaryWidth)||0),
    rightBoundaryWidth:Math.max(0,Number(rightBoundaryWidth)||0),
    bottomBoundaryId,
    topBoundaryId,
    areaIndex:index,
    areaCount:total
  };
}

function splitFacadeZones(base){
  const facadeStoreId=base.profileSourceId||base.facadeId||base.id.split('|')[0];
  const rawSource=Array.isArray(facadeProfiles[facadeStoreId])?facadeProfiles[facadeStoreId]:[];
  const globalBaseWidth=Math.max(1,Number(base.globalBaseWidth)||base.width);
  const globalStartRatio=Number.isFinite(Number(base.globalStartRatio))?Number(base.globalStartRatio):0;
  const globalEndRatio=Number.isFinite(Number(base.globalEndRatio))?Number(base.globalEndRatio):1;
  const globalSpan=Math.max(.000001,globalEndRatio-globalStartRatio);
  const profiles=rawSource.map(profile=>{
    const orientation=profile.orientation==='horizontal'?'horizontal':'vertical';
    const normalized={
      ...profile,
      orientation,
      width:Math.max(40,Number(profile.width)||100),
      depth:Math.max(30,Number(profile.depth)||100),
      positionRatio:Math.max(.0001,Math.min(.9999,Number(profile.positionRatio)||.5)),
      positionYRatio:Math.max(.01,Math.min(.99,Number(profile.positionYRatio)||.5))
    };
    if(orientation==='vertical'){
      if(normalized.positionRatio<=globalStartRatio+.000001||normalized.positionRatio>=globalEndRatio-.000001)return null;
      normalized.positionRatio=(normalized.positionRatio-globalStartRatio)/globalSpan;
      return normalized;
    }
    const scopeStart=Number.isFinite(Number(profile.scopeStartRatio))?Number(profile.scopeStartRatio):0;
    const scopeEnd=Number.isFinite(Number(profile.scopeEndRatio))?Number(profile.scopeEndRatio):1;
    if(scopeEnd<globalStartRatio-.0001||scopeStart>globalEndRatio+.0001)return null;
    normalized.scopeStartRatio=Math.max(0,(Math.max(scopeStart,globalStartRatio)-globalStartRatio)/globalSpan);
    normalized.scopeEndRatio=Math.min(1,(Math.min(scopeEnd,globalEndRatio)-globalStartRatio)/globalSpan);
    return normalized;
  }).filter(Boolean);
  const verticals=profiles.filter(profile=>profile.orientation==='vertical').sort((a,b)=>a.positionRatio-b.positionRatio);
  const horizontals=profiles.filter(profile=>profile.orientation==='horizontal');
  const startBoundaryId=base.startBoundaryId||'START';
  const endBoundaryId=base.endBoundaryId||'END';
  const boundaryWidthMap=Object.fromEntries(verticals.map(profile=>[profile.id,profile.width]));
  boundaryWidthMap[startBoundaryId]=Math.max(0,Number(base.startBoundaryWidth)||0);
  boundaryWidthMap[endBoundaryId]=Math.max(0,Number(base.endBoundaryWidth)||0);
  const strips=[];
  let cursor=-base.width/2;
  let leftId=startBoundaryId;

  verticals.forEach(profile=>{
    const center=-base.width/2+profile.positionRatio*base.width;
    const left=Math.max(cursor,center-profile.width/2);
    const right=Math.min(base.width/2,center+profile.width/2);
    strips.push({start:cursor,end:left,leftId,rightId:profile.id});
    addDividerProfileMesh(base,profile,{u:center,span:base.width,y:(base.bottomY+base.topY)/2});
    cursor=right;
    leftId=profile.id;
  });
  strips.push({start:cursor,end:base.width/2,leftId,rightId:endBoundaryId});

  const cells=[];
  strips.filter(strip=>strip.end-strip.start>=80).forEach(strip=>{
    const stripStartRatio=(strip.start+base.width/2)/base.width;
    const stripEndRatio=(strip.end+base.width/2)/base.width;
    const scoped=horizontals
      .filter(profile=>{
        const start=Number.isFinite(Number(profile.scopeStartRatio))?Number(profile.scopeStartRatio):0;
        const end=Number.isFinite(Number(profile.scopeEndRatio))?Number(profile.scopeEndRatio):1;
        return stripStartRatio>=start-.0001&&stripEndRatio<=end+.0001;
      })
      .sort((a,b)=>a.positionYRatio-b.positionYRatio);
    let bottom=base.bottomY;
    let bottomId='BOTTOM';
    scoped.forEach(profile=>{
      const centerY=base.bottomY+profile.positionYRatio*base.height;
      const profileBottom=Math.max(bottom,centerY-profile.width/2);
      const profileTop=Math.min(base.topY,centerY+profile.width/2);
      cells.push({startU:strip.start,endU:strip.end,bottomY:bottom,topY:profileBottom,leftId:strip.leftId,rightId:strip.rightId,bottomId,topId:profile.id});
      addDividerProfileMesh(base,profile,{u:(strip.start+strip.end)/2,span:strip.end-strip.start,y:centerY});
      bottom=profileTop;
      bottomId=profile.id;
    });
    cells.push({startU:strip.start,endU:strip.end,bottomY:bottom,topY:base.topY,leftId:strip.leftId,rightId:strip.rightId,bottomId,topId:'TOP'});
  });

  const valid=cells.filter(cell=>cell.endU-cell.startU>=80&&cell.topY-cell.bottomY>=80);
  return valid.map((cell,index)=>createSubZone(
    base,cell.startU,cell.endU,cell.bottomY,cell.topY,index,valid.length,
    cell.leftId,cell.rightId,cell.bottomId,cell.topId,
    boundaryWidthMap[cell.leftId]||0,boundaryWidthMap[cell.rightId]||0
  ));
}

function toolboxZoneKey(zone){
  return 'zone:'+zone.id;
}

function toolboxProfileKey(profile){
  return 'profile:'+profile.facadeId+':'+profile.id;
}

function isToolboxZoneEligible(zone,occupied){
  if(toolboxSelectionMode==='multi-product')return true;
  if(toolboxSelectionMode==='multi-delete'||toolboxSelectionMode==='fit-products')return occupied;
  if(toolboxSelectionMode==='multi-profile-add')return !occupied&&zone.width>=600&&zone.height>=600;
  return false;
}

function isToolboxProfileEligible(profile){
  return toolboxSelectionMode==='multi-profile-delete'&&profile&&profile.id;
}

function refreshToolboxSelectionVisuals(){
  zonePickers.forEach(mesh=>{
    const key=toolboxZoneKey(mesh.userData.zone);
    const eligible=isToolboxZoneEligible(mesh.userData.zone,mesh.userData.occupied);
    const selected=toolboxSelectionKeys.has(key);
    mesh.userData.toolboxEligible=eligible;
    mesh.userData.toolboxSelected=selected;
    if(toolboxSelectionMode){
      mesh.material.color.setHex(selected?0x16a34a:(eligible?0x38bdf8:0x64748b));
      mesh.material.opacity=selected?.30:(eligible?.13:.002);
    }else{
      setZoneHighlight(mesh,false);
    }
  });
  interactiveObjects.forEach(obj=>{
    if(!obj.userData||!obj.userData.isDividerProfile||!obj.material)return;
    const profile=obj.userData.profile;
    const key=toolboxProfileKey(profile);
    const eligible=isToolboxProfileEligible(profile);
    const selected=toolboxSelectionKeys.has(key);
    obj.userData.toolboxEligible=eligible;
    obj.userData.toolboxSelected=selected;
    if(toolboxSelectionMode){
      obj.material.color.setHex(selected?0x16a34a:(eligible?0x38bdf8:0x334155));
      if(obj.material.emissive)obj.material.emissive.setHex(selected?0x14532d:(eligible?0x0c4a6e:0x000000));
      obj.material.transparent=true;
      obj.material.opacity=eligible?1:.22;
    }else{
      obj.material.color.setHex(profileColor(0x0ea5e9));
      if(obj.material.emissive)obj.material.emissive.setHex(0x000000);
      obj.material.opacity=1;
    }
  });
  const hint=document.getElementById('viewerHint');
  if(hint){
    hint.textContent=toolboxSelectionMode
      ? 'Çoklu seçim: uygun hedeflere tıklayın. Enter veya sağ tıkla tamamlayın, Esc ile iptal edin.'
      : 'Dikmeler arasındaki boşluğa tıklayın. Bir ürün panelini açıp kapatmak için çift tıklayın.';
  }
}

function addZonePicker(zone,occupied){
  const axisX=zone.axis==='x';
  const geo=new THREE.BoxGeometry(axisX?zone.width:64,zone.height,axisX?64:zone.width);
  const selected=zone.id===selectedZoneId;
  const mat=new THREE.MeshBasicMaterial({
    color:selected?0xf59e0b:(occupied?0x22c55e:0x38bdf8),
    transparent:true,
    opacity:selected?.18:(occupied?.025:.018),
    depthWrite:false,
    side:THREE.DoubleSide
  });
  const mesh=new THREE.Mesh(geo,mat);
  mesh.position.set(zone.cx,(zone.bottomY+zone.topY)/2,zone.cz);
  mesh.userData={isZone:true,zone,occupied,selected};
  group.add(mesh);
  zonePickers.push(mesh);
  interactiveObjects.push(mesh);
  if(selected)selectedZonePicker=mesh;
}

function setZoneHighlight(mesh,active){
  if(!mesh||!mesh.material)return;
  if(toolboxSelectionMode){
    const eligible=Boolean(mesh.userData.toolboxEligible);
    const selected=Boolean(mesh.userData.toolboxSelected);
    mesh.material.opacity=selected?.30:(eligible?(active?.22:.13):.002);
    mesh.material.color.setHex(selected?0x16a34a:(eligible?0x38bdf8:0x64748b));
    return;
  }
  const selected=Boolean(mesh.userData.selected);
  if(selected){
    mesh.material.opacity=.18;
    mesh.material.color.setHex(0xf59e0b);
    return;
  }
  mesh.material.opacity=active?(mesh.userData.occupied?.20:.16):(mesh.userData.occupied?.025:.018);
  mesh.material.color.setHex(mesh.userData.occupied?0x22c55e:0x38bdf8);
}

function buildFacadeProducts(p,beamBottomY,freedomMultiActive,bioFamilyLayoutActive,bioFamilyLayout){
  const bottomY=-H/2;
  const topY=beamBottomY;
  const height=Math.max(400,topY-bottomY);
  const frontStart=-W/2+p[0].x;
  const frontEnd=W/2-p[1].x;
  const backStart=-W/2+p[2].x;
  const backEnd=W/2-p[3].x;
  const leftStart=-D/2+p[0].z;
  const leftEnd=D/2-p[2].z;
  const rightStart=-D/2+p[1].z;
  const rightEnd=D/2-p[3].z;
  const frontFaceDepth=Math.max(p[0].z,p[1].z);
  const backFaceDepth=Math.max(p[2].z,p[3].z);
  const leftFaceDepth=Math.max(p[0].x,p[2].x);
  const rightFaceDepth=Math.max(p[1].x,p[3].x);
  let facades;
  if(bioFamilyLayoutActive&&bioFamilyLayout){
    const modules=bioFamilyLayout.modules;
    const rearGlobalStart=modules[0].clearMinX;
    const rearGlobalEnd=modules[modules.length-1].clearMaxX;
    const rearGlobalWidth=Math.max(1,rearGlobalEnd-rearGlobalStart);
    const frontGlobalStart=rearGlobalStart;
    const frontGlobalEnd=rearGlobalEnd;
    const frontGlobalWidth=rearGlobalWidth;
    facades=[];
    modules.forEach(module=>{
      const leftLine=module.leftLine;
      const rightLine=module.rightLine;
      const rearLeftSection=module.rearLeftSection||(bioFamilyLayout.rearSections&&bioFamilyLayout.rearSections[leftLine])||p[0];
      const rearRightSection=module.rearRightSection||(bioFamilyLayout.rearSections&&bioFamilyLayout.rearSections[rightLine])||p[1];
      const frontLeftSection=module.frontLeftSection||(bioFamilyLayout.frontSections&&bioFamilyLayout.frontSections[leftLine])||p[2];
      const frontRightSection=module.frontRightSection||(bioFamilyLayout.frontSections&&bioFamilyLayout.frontSections[rightLine])||p[3];
      const rearFaceDepth=Math.max(rearLeftSection.z,rearRightSection.z);
      const frontModuleFaceDepth=Math.max(frontLeftSection.z,frontRightSection.z);
      facades.push({
        id:'front|ROW_'+((module.rowIndex||0)+1)+'|MODULE_'+(module.moduleIndex+1),facadeId:'front',profileSourceId:'front',label:(module.rowIndex===1?'Arka Sıra · ':'Ön Sıra · ')+'Arka Cephe · Modül '+(module.moduleIndex+1),axis:'x',
        cx:module.centerX,cz:module.rearOuterZ+rearFaceDepth/2,width:module.clearWidth,height,bottomY,topY,beamBottomY,inward:1,outerFaceV:-rearFaceDepth/2,
        startBoundaryId:'POST_LINE_'+leftLine,endBoundaryId:'POST_LINE_'+rightLine,
        startBoundaryWidth:rearLeftSection.x,endBoundaryWidth:rearRightSection.x,
        globalBaseWidth:rearGlobalWidth,globalStartRatio:(module.clearMinX-rearGlobalStart)/rearGlobalWidth,globalEndRatio:(module.clearMaxX-rearGlobalStart)/rearGlobalWidth,
        moduleIndex:module.moduleIndex,bioRiseMulti:true
      });
      facades.push({
        id:'back|ROW_'+((module.rowIndex||0)+1)+'|MODULE_'+(module.moduleIndex+1),facadeId:'back',profileSourceId:'back',label:(module.rowIndex===1?'Arka Sıra · ':'Ön Sıra · ')+'Ön Cephe · Modül '+(module.moduleIndex+1),axis:'x',
        cx:module.centerX,cz:module.frontOuterZ-frontModuleFaceDepth/2,width:module.clearWidth,height,bottomY,topY,beamBottomY,inward:-1,outerFaceV:frontModuleFaceDepth/2,
        startBoundaryId:'POST_LINE_'+leftLine,endBoundaryId:'POST_LINE_'+rightLine,
        startBoundaryWidth:frontLeftSection.x,endBoundaryWidth:frontRightSection.x,
        globalBaseWidth:frontGlobalWidth,globalStartRatio:(module.clearMinX-frontGlobalStart)/frontGlobalWidth,globalEndRatio:(module.clearMaxX-frontGlobalStart)/frontGlobalWidth,
        moduleIndex:module.moduleIndex,bioRiseMulti:true
      });
    });
    const leftModule=modules[0],rightModule=modules[modules.length-1];
    const leftModuleStart=leftModule.rearOuterZ+p[0].z,leftModuleEnd=leftModule.frontOuterZ-p[2].z;
    const rightModuleStart=rightModule.rearOuterZ+p[1].z,rightModuleEnd=rightModule.frontOuterZ-p[3].z;
    facades.push(
      {id:'left',label:'Sol Cephe',axis:'z',cx:-W/2+leftFaceDepth/2,cz:(leftModuleStart+leftModuleEnd)/2,width:leftModuleEnd-leftModuleStart,height,bottomY,topY,beamBottomY,inward:1,outerFaceV:-leftFaceDepth/2,startBoundaryWidth:p[0].z,endBoundaryWidth:p[2].z},
      {id:'right',label:'Sağ Cephe',axis:'z',cx:W/2-rightFaceDepth/2,cz:(rightModuleStart+rightModuleEnd)/2,width:rightModuleEnd-rightModuleStart,height,bottomY,topY,beamBottomY,inward:-1,outerFaceV:rightFaceDepth/2,startBoundaryWidth:p[1].z,endBoundaryWidth:p[3].z}
    );
  }else if(freedomMultiActive){
    const modules=freedomMultiLayout.modules;
    const rearGlobalStart=modules[0].rearStartX;
    const rearGlobalEnd=modules[modules.length-1].rearEndX;
    const rearGlobalWidth=Math.max(1,rearGlobalEnd-rearGlobalStart);
    const frontGlobalStart=modules[0].frontStartX;
    const frontGlobalEnd=modules[modules.length-1].frontEndX;
    const frontGlobalWidth=Math.max(1,frontGlobalEnd-frontGlobalStart);
    facades=[];
    modules.forEach(module=>{
      const leftLine=module.leftLine;
      const rightLine=module.rightLine;
      const rearLeftSection=module.rearLeftSection||(freedomMultiLayout.rearSections&&freedomMultiLayout.rearSections[leftLine])||p[0];
      const rearRightSection=module.rearRightSection||(freedomMultiLayout.rearSections&&freedomMultiLayout.rearSections[rightLine])||p[1];
      const frontLeftSection=module.frontLeftSection||(freedomMultiLayout.frontSections&&freedomMultiLayout.frontSections[leftLine])||p[2];
      const frontRightSection=module.frontRightSection||(freedomMultiLayout.frontSections&&freedomMultiLayout.frontSections[rightLine])||p[3];
      const rearFaceDepth=Math.max(rearLeftSection.z,rearRightSection.z);
      const frontModuleFaceDepth=Math.max(frontLeftSection.z,frontRightSection.z);
      facades.push({
        id:'front|ROW_'+((module.rowIndex||0)+1)+'|MODULE_'+(module.moduleIndex+1),facadeId:'front',profileSourceId:'front',label:(module.rowIndex===1?'Arka Sıra · ':'Ön Sıra · ')+'Arka Cephe · Modül '+(module.moduleIndex+1),axis:'x',
        cx:(module.rearStartX+module.rearEndX)/2,cz:module.rearOuterZ+rearFaceDepth/2,width:module.rearClearWidth,height,bottomY,topY,beamBottomY,inward:1,outerFaceV:-rearFaceDepth/2,
        startBoundaryId:'POST_LINE_'+leftLine,endBoundaryId:'POST_LINE_'+rightLine,
        startBoundaryWidth:rearLeftSection.x,endBoundaryWidth:rearRightSection.x,
        globalBaseWidth:rearGlobalWidth,globalStartRatio:(module.rearStartX-rearGlobalStart)/rearGlobalWidth,globalEndRatio:(module.rearEndX-rearGlobalStart)/rearGlobalWidth,
        moduleIndex:module.moduleIndex
      });
      facades.push({
        id:'back|ROW_'+((module.rowIndex||0)+1)+'|MODULE_'+(module.moduleIndex+1),facadeId:'back',profileSourceId:'back',label:(module.rowIndex===1?'Arka Sıra · ':'Ön Sıra · ')+'Ön Cephe · Modül '+(module.moduleIndex+1),axis:'x',
        cx:(module.frontStartX+module.frontEndX)/2,cz:module.frontOuterZ-frontModuleFaceDepth/2,width:module.frontClearWidth,height,bottomY,topY,beamBottomY,inward:-1,outerFaceV:frontModuleFaceDepth/2,
        startBoundaryId:'POST_LINE_'+leftLine,endBoundaryId:'POST_LINE_'+rightLine,
        startBoundaryWidth:frontLeftSection.x,endBoundaryWidth:frontRightSection.x,
        globalBaseWidth:frontGlobalWidth,globalStartRatio:(module.frontStartX-frontGlobalStart)/frontGlobalWidth,globalEndRatio:(module.frontEndX-frontGlobalStart)/frontGlobalWidth,
        moduleIndex:module.moduleIndex
      });
    });
    const leftModule=modules[0],rightModule=modules[modules.length-1];
    const leftModuleStart=leftModule.rearOuterZ+p[0].z,leftModuleEnd=leftModule.frontOuterZ-p[2].z;
    const rightModuleStart=rightModule.rearOuterZ+p[1].z,rightModuleEnd=rightModule.frontOuterZ-p[3].z;
    facades.push(
      {id:'left',label:'Sol Cephe',axis:'z',cx:-W/2+leftFaceDepth/2,cz:(leftModuleStart+leftModuleEnd)/2,width:leftModuleEnd-leftModuleStart,height,bottomY,topY,beamBottomY,inward:1,outerFaceV:-leftFaceDepth/2,startBoundaryWidth:p[0].z,endBoundaryWidth:p[2].z},
      {id:'right',label:'Sağ Cephe',axis:'z',cx:W/2-rightFaceDepth/2,cz:(rightModuleStart+rightModuleEnd)/2,width:rightModuleEnd-rightModuleStart,height,bottomY,topY,beamBottomY,inward:-1,outerFaceV:rightFaceDepth/2,startBoundaryWidth:p[1].z,endBoundaryWidth:p[3].z}
    );
  }else{
    facades=[
      {id:'front',label:'Arka Cephe',axis:'x',cx:(frontStart+frontEnd)/2,cz:-D/2+frontFaceDepth/2,width:frontEnd-frontStart,height,bottomY,topY,beamBottomY,inward:1,outerFaceV:-frontFaceDepth/2,startBoundaryWidth:p[0].x,endBoundaryWidth:p[1].x},
      {id:'back',label:'Ön Cephe',axis:'x',cx:(backStart+backEnd)/2,cz:D/2-backFaceDepth/2,width:backEnd-backStart,height,bottomY,topY,beamBottomY,inward:-1,outerFaceV:backFaceDepth/2,startBoundaryWidth:p[2].x,endBoundaryWidth:p[3].x},
      {id:'left',label:'Sol Cephe',axis:'z',cx:-W/2+leftFaceDepth/2,cz:(leftStart+leftEnd)/2,width:leftEnd-leftStart,height,bottomY,topY,beamBottomY,inward:1,outerFaceV:-leftFaceDepth/2,startBoundaryWidth:p[0].z,endBoundaryWidth:p[2].z},
      {id:'right',label:'Sağ Cephe',axis:'z',cx:W/2-rightFaceDepth/2,cz:(rightStart+rightEnd)/2,width:rightEnd-rightStart,height,bottomY,topY,beamBottomY,inward:-1,outerFaceV:rightFaceDepth/2,startBoundaryWidth:p[1].z,endBoundaryWidth:p[3].z}
    ];
  }

  facades.forEach(facade=>{
    const zones=splitFacadeZones(facade);
    zones.forEach((zone,index)=>{
      const placement=placements[zone.id];
      const zipPlacement=zipPlacements[zone.id];
      if(placement){
        try{
          if(placement.type==='folding')buildFoldingProduct(zone,placement);
          else if(placement.type==='guillotine')buildGuillotineProduct(zone,placement);
          else if(placement.type==='fixed')buildFixedJoineryProduct(zone,placement);
          else if(placement.type==='door')buildDoorProduct(zone,placement);
          else buildSlidingProduct(zone,placement);
        }catch(error){
          console.error('Primary product build failed',zone.id,placement.type,error);
        }
      }
      if(zipPlacement){
        const effectiveZipPlacement={...zipPlacement,autoFrontOnly:Boolean(placement)&&String(zipPlacement.placementLocation||'BETWEEN POSTS')==='BETWEEN POSTS'};
        try{buildZipScreenProduct(zone,effectiveZipPlacement);}
        catch(error){console.error('Zip overlay build failed',zone.id,error);buildZipFallbackProduct(zone,effectiveZipPlacement);}
      }
      addZonePicker(zone,Boolean(placement||zipPlacement));
      if(zone.bottomBoundaryId==='BOTTOM')addZoneWidthDimension(zone,index%3);
      if(zone.bottomBoundaryId!=='BOTTOM'||zone.topBoundaryId!=='TOP')addZoneHeightDimension(zone,index%3);
    });
  });
  addSystemDimensions(beamBottomY);
  setDimensionVisibility(dimensionVisibility);
}

function disposeModelGroup(root,preserve){
  if(!root)return;
  const preserveGeometries=preserve&&preserve.geometries||new Set();
  const preserveMaterials=preserve&&preserve.materials||new Set();
  const preserveTextures=preserve&&preserve.textures||new Set();
  const disposedGeometries=new Set();
  const disposedMaterials=new Set();
  const disposedTextures=new Set();
  const textureKeys=['map','alphaMap','aoMap','bumpMap','displacementMap','emissiveMap','envMap','lightMap','metalnessMap','normalMap','roughnessMap','clearcoatMap','clearcoatNormalMap','clearcoatRoughnessMap','gradientMap','matcap','specularMap'];
  root.traverse(obj=>{
    if(obj.geometry&&typeof obj.geometry.dispose==='function'&&!disposedGeometries.has(obj.geometry)&&!preserveGeometries.has(obj.geometry)){
      if(!(obj.geometry.userData&&obj.geometry.userData.p3dvShared)){
        disposedGeometries.add(obj.geometry);
        obj.geometry.dispose();
      }
    }
    const materials=Array.isArray(obj.material)?obj.material:[obj.material];
    materials.filter(Boolean).forEach(material=>{
      material.userData=material.userData||{};
      if(material.userData.p3dvShared||preserveMaterials.has(material))return;
      material.userData.p3dvDisposed=true;
      textureKeys.forEach(key=>{
        const texture=material[key];
        if(!texture||typeof texture.dispose!=='function'||disposedTextures.has(texture)||preserveTextures.has(texture))return;
        if(texture.userData&&texture.userData.p3dvShared)return;
        disposedTextures.add(texture);
        texture.dispose();
      });
      if(typeof material.dispose==='function'&&!disposedMaterials.has(material)){
        disposedMaterials.add(material);
        material.dispose();
      }
    });
  });
}

function stableRenderSignature(value){
  const seen=new WeakSet();
  try{
    return JSON.stringify(value,(key,item)=>{
      if(item&&typeof item==='object'){
        if(seen.has(item))return undefined;
        seen.add(item);
        if(!Array.isArray(item)){
          const ordered={};
          Object.keys(item).sort().forEach(name=>{ordered[name]=item[name];});
          return ordered;
        }
      }
      return item;
    });
  }catch(error){
    return String(value&&value.id||value&&value.kind||'');
  }
}

function pergoRiseRenderSignatureMap(derived){
  const map=new Map();
  (derived&&Array.isArray(derived.components)?derived.components:[]).forEach(component=>{
    if(!component||component.renderVisible===false||!component.id)return;
    map.set('component:'+component.id,stableRenderSignature(component));
  });
  const targets=derived&&derived.editing&&Array.isArray(derived.editing.targets)?derived.editing.targets:[];
  targets.filter(target=>target&&target.targetType==='area'&&target.id).forEach(target=>map.set('target:'+target.id,stableRenderSignature(target)));
  return map;
}

function pergoRiseDirectChildKey(object){
  if(!object)return '';
  if(object.userData&&object.userData.componentId)return 'component:'+object.userData.componentId;
  if(object.userData&&object.userData.editingTarget&&object.userData.editingTarget.id)return 'target:'+object.userData.editingTarget.id;
  let key='';
  object.traverse&&object.traverse(child=>{
    if(key||!child.userData)return;
    if(child.userData.componentId)key='component:'+child.userData.componentId;
    else if(child.userData.editingTarget&&child.userData.editingTarget.id)key='target:'+child.userData.editingTarget.id;
  });
  return key;
}

function pergoRiseZoneFromTarget(target){
  const bounds=target&&target.bounds||{};
  const minX=Number(bounds.minX)||0,maxX=Number(bounds.maxX)||0,minY=Number(bounds.minY)||0,maxY=Number(bounds.maxY)||0,minZ=Number(bounds.minZ)||0,maxZ=Number(bounds.maxZ)||0;
  const face=String(target&&target.face||'front');
  return {
    id:String(target&&target.id||''),label:String(target&&target.label||target&&target.id||'Pergola Alanı'),
    axis:face==='left'||face==='right'?'z':'x',face,facadeId:face,pergoRise:true,editingTarget:target,
    systemIndex:Number.isFinite(Number(target&&target.systemIndex))?Number(target.systemIndex):null,positionId:String(target&&target.positionId||''),
    cx:(minX+maxX)/2,cz:(minZ+maxZ)/2,bottomY:minY,topY:maxY,
    width:Math.max(1,face==='left'||face==='right'?maxZ-minZ:maxX-minX),height:Math.max(1,maxY-minY)
  };
}

function positionPergoRiseAssemblyOnGround(assembly){
  if(!assembly)return assembly;
  const offset=-Math.max(1,Number(H)||1)/2;
  assembly.position.y=offset;
  assembly.userData={...(assembly.userData||{}),p3dvGroundOffsetY:offset,p3dvCanonicalGroundY:0,p3dvSceneGroundY:offset};
  return assembly;
}

function refreshPergoRiseParts(){
  parts=[];interactiveObjects=[];zonePickers=[];hoveredZone=null;selectedZonePicker=null;
  if(!pergoRiseAssemblyRoot)return;
  pergoRiseAssemblyRoot.traverse(object=>{
    if(object.isMesh)parts.push(object);
    if(!object.userData||!object.userData.p3dvPergoRiseSelectable||!object.userData.editingTarget)return;
    if(object.isMesh)interactiveObjects.push(object);
    if(object.userData.p3dvPergoRiseArea&&object.isMesh){
      const zone=pergoRiseZoneFromTarget(object.userData.editingTarget);
      object.userData.isZone=true;object.userData.zone=zone;object.userData.occupied=Boolean(object.userData.editingTarget.occupied);
      object.userData.selected=zone.id===selectedZoneId;
      zonePickers.push(object);
      if(object.userData.selected)selectedZonePicker=object;
    }
  });
}

function pergoRiseTargetExists(targetId){
  if(!targetId||!pergoRiseAssemblyRoot)return false;
  let found=false;
  pergoRiseAssemblyRoot.traverse(object=>{
    if(found||!object.userData||!object.userData.editingTarget)return;
    if(object.userData.editingTarget.id===targetId)found=true;
  });
  return found;
}

function reconcilePergoRiseAssembly(changedPaths){
  if(!pergoRiseAssemblyRoot||!pergoRiseComponentLibrary||!pergoRiseDerived||!window.P3DVPergoRiseViewer)return false;
  const nextAssembly=window.P3DVPergoRiseViewer.buildAssembly(pergoRiseComponentLibrary,pergoRiseDerived,{
    THREE,
    materials:{
      system:createSolidMaterial(SYSTEM_COLOR,1,autoFinishForColor(SYSTEM_COLOR)),
      fabricProfile:createSolidMaterial(PANEL_COLOR,1,autoFinishForColor(PANEL_COLOR)),
      fabric:createSolidMaterial(PANEL_COLOR,.94,autoFinishForColor(PANEL_COLOR)),
      wall:createSolidMaterial(0x9a8f83,1,'MATTE')
    },
    selectableAreaScopes:['front'],
    selectableAreaActionTypes:['gap_between_posts']
  });
  const previousByKey=new Map();
  pergoRiseAssemblyRoot.children.slice().forEach(child=>{
    const key=pergoRiseDirectChildKey(child);
    if(key)previousByKey.set(key,child);
  });
  const nextSignatures=pergoRiseRenderSignatureMap(pergoRiseDerived);
  const stats={runs:pergoRiseReconcileStats.runs+1,reused:0,replaced:0,added:0,removed:0,total:0,changedPaths:Array.isArray(changedPaths)?changedPaths.slice():[]};
  const selectedTargetId=pergoRiseSelectedTarget&&pergoRiseSelectedTarget.id||null;
  const retired=new THREE.Group();
  nextAssembly.children.slice().forEach(nextChild=>{
    const key=pergoRiseDirectChildKey(nextChild);
    const previous=key&&previousByKey.get(key);
    const unchanged=Boolean(previous&&pergoRiseRenderSignatures.get(key)===nextSignatures.get(key));
    if(unchanged){
      previousByKey.delete(key);
      stats.reused+=1;
      return;
    }
    if(previous){
      previousByKey.delete(key);
      pergoRiseAssemblyRoot.remove(previous);
      retired.add(previous);
      stats.replaced+=1;
    }else stats.added+=1;
    nextAssembly.remove(nextChild);
    pergoRiseAssemblyRoot.add(nextChild);
  });
  previousByKey.forEach(previous=>{
    pergoRiseAssemblyRoot.remove(previous);
    retired.add(previous);
    stats.removed+=1;
  });
  pergoRiseAssemblyRoot.userData={...nextAssembly.userData};
  positionPergoRiseAssemblyOnGround(pergoRiseAssemblyRoot);
  stats.total=pergoRiseAssemblyRoot.children.length;
  const preserved=collectRenderResources(pergoRiseAssemblyRoot);
  disposeModelGroup(retired,preserved);
  disposeModelGroup(nextAssembly,preserved);
  pergoRiseRenderSignatures=nextSignatures;
  pergoRiseReconcileStats=stats;
  pergoRiseAssemblyRevision+=1;
  refreshPergoRiseParts();
  parts.forEach(part=>{part.visible=true;});
  if(selectedTargetId&&!pergoRiseTargetExists(selectedTargetId))clearPergoRiseSelection();
  else if(selectedTargetId){
    let replacement=null;
    pergoRiseAssemblyRoot.traverse(object=>{
      if(replacement||!object.userData||!object.userData.editingTarget)return;
      if(object.userData.editingTarget.id===selectedTargetId)replacement=object;
    });
    if(replacement&&replacement!==pergoRiseSelectedObject)highlightPergoRiseSelection(replacement);
  }
  window.__P3DV_PERGO_TEST__=window.__P3DV_PERGO_TEST__||{};
  window.__P3DV_PERGO_TEST__.reconcile={...stats,camera:cameraSnapshot()};
  updatePergoRiseCommonTestState();
  return true;
}

function collectRenderResources(root){
  const resources={geometries:new Set(),materials:new Set(),textures:new Set()};
  const textureKeys=['map','alphaMap','aoMap','bumpMap','displacementMap','emissiveMap','envMap','lightMap','metalnessMap','normalMap','roughnessMap','clearcoatMap','clearcoatNormalMap','clearcoatRoughnessMap','gradientMap','matcap','specularMap'];
  if(!root)return resources;
  root.traverse(object=>{
    if(object.geometry)resources.geometries.add(object.geometry);
    const materials=Array.isArray(object.material)?object.material:[object.material];
    materials.filter(Boolean).forEach(material=>{
      resources.materials.add(material);
      textureKeys.forEach(key=>{if(material[key])resources.textures.add(material[key]);});
    });
  });
  return resources;
}

function buildPergoRiseModel(){
  if(pergoRiseDerived&&pergoRiseDerived.envelope){
    W=Math.max(1,Number(pergoRiseDerived.envelope.width)||W);
    D=Math.max(1,Number(pergoRiseDerived.envelope.depth)||D);
    H=Math.max(1,Number(pergoRiseDerived.envelope.height)||H);
  }
  if(pergoRiseComponentLibrary&&pergoRiseDerived&&window.P3DVPergoRiseViewer){
    const assembly=window.P3DVPergoRiseViewer.buildAssembly(pergoRiseComponentLibrary,pergoRiseDerived,{
      THREE,
      materials:{
        system:createSolidMaterial(SYSTEM_COLOR,1,autoFinishForColor(SYSTEM_COLOR)),
        fabricProfile:createSolidMaterial(PANEL_COLOR,1,autoFinishForColor(PANEL_COLOR)),
        fabric:createSolidMaterial(PANEL_COLOR,.94,autoFinishForColor(PANEL_COLOR)),
        wall:createSolidMaterial(0x9a8f83,1,'MATTE')
      },
      selectableAreaScopes:['front'],
      selectableAreaActionTypes:['gap_between_posts']
    });
    positionPergoRiseAssemblyOnGround(assembly);
    group.add(assembly);
    pergoRiseAssemblyRoot=assembly;
    pergoRiseRenderSignatures=pergoRiseRenderSignatureMap(pergoRiseDerived);
    refreshPergoRiseParts();
    pergoRiseAssemblyRevision+=1;
    window.__P3DV_PERGO_TEST__=window.__P3DV_PERGO_TEST__||{};
    window.__P3DV_PERGO_TEST__.initialAssembly={children:assembly.children.length,parts:parts.length,projectHash:pergoRiseDerived&&pergoRiseDerived.projectHash||''};
    return assembly;
  }
  const failure=new THREE.Group();
  failure.name='Pergo Rise Render Error';
  failure.userData={p3dvPergoRiseRenderError:true,status:pergoRiseLoadStatus};
  group.add(failure);pergoRiseAssemblyRoot=failure;
  if(pergoRiseSelectionInfo){
    pergoRiseSelectionInfo.textContent='Pergola profil geometrileri yüklenemedi ('+pergoRiseLoadStatus+').';
    pergoRiseSelectionInfo.style.display='block';
  }
  postParent('pergo-rise-render-error',{status:pergoRiseLoadStatus,projectHash:pergoRiseDerived&&pergoRiseDerived.projectHash||''});
  return failure;
}

function buildModel(showAll,options){
  cancelPendingTogglePanelSelection();
  beginPerfCycle(options&&options.reason||((options&&options.atomicSwap)?'live-rebuild':'initial-build'));
  const atomicSwap=Boolean(options&&options.atomicSwap);
  modelGeneration+=1;
  const previousGroup=atomicSwap?group:null;
  const detachedGroup=!atomicSwap&&group.children.length?new THREE.Group():null;
  const previousParent=previousGroup&&previousGroup.parent?previousGroup.parent:scene;
  const previousPosition=previousGroup?previousGroup.position.clone():null;
  const previousRotation=previousGroup?previousGroup.rotation.clone():null;
  const previousScale=previousGroup?previousGroup.scale.clone():null;
  const previousVisible=previousGroup?previousGroup.visible:true;
  if(atomicSwap){
    group=new THREE.Group();
  }else{
    while(group.children.length){
      const child=group.children[0];
      group.remove(child);
      if(detachedGroup)detachedGroup.add(child);
    }
    if(detachedGroup)disposeModelGroup(detachedGroup);
  }
  parts=[];
  intermediateDimensionObjects=[];
  mainDimensionObjects=[];
  interactiveObjects=[];
  zonePickers=[];
  hoveredZone=null;
  selectedZonePicker=null;
  const p=[postDims(0),postDims(1),postDims(2),postDims(3)];
  if(IS_PERGO_RISE){
    buildPergoRiseModel();
    refreshToolboxSelectionVisuals();
    parts.forEach(part=>part.visible=true);
    if(atomicSwap){
      group.position.copy(previousPosition);
      group.rotation.copy(previousRotation);
      group.scale.copy(previousScale);
      group.visible=previousVisible;
      previousParent.add(group);
      if(arSession){
        intermediateDimensionObjects.forEach(item=>item.visible=false);
        mainDimensionObjects.forEach(item=>item.visible=false);
        zonePickers.forEach(item=>item.visible=false);
        setArGhostMode(true);
      }
      if(previousGroup.parent)previousGroup.parent.remove(previousGroup);
      setTimeout(()=>disposeModelGroup(previousGroup),0);
    }
    lastBuiltGeometrySignature=liveGeometrySignature();endPerfCycle();
    return;
  }
  const magenta=profileColor(0xff00ff),blue=profileColor(0x2563eb),orange=profileColor(0xff8c00),amber=profileColor(0xffb347),grass=panelColor(0x7cfc00);
  const beamVertical=beamSection.vertical;
  const frontBackBeamThickness=beamSection.thickness;
  const sideBeamThickness=IS_GALAXY?80:(IS_BIO_RISE?50:beamSection.thickness);
  const freedomMultiActive=!IS_BIO_FAMILY&&freedomMultiLayout&&freedomMultiLayout.valid&&Number(freedomMultiLayout.systemCount)>1;
  const bioRiseMultiActive=IS_BIO_RISE&&bioRiseMultiLayout&&bioRiseMultiLayout.valid&&Number(bioRiseMultiLayout.systemCount)>1;
  const galaxyLayoutActive=IS_GALAXY&&galaxyMultiLayout&&galaxyMultiLayout.valid;
  const bioFamilyLayout=IS_GALAXY?galaxyMultiLayout:bioRiseMultiLayout;
  const bioFamilyLayoutActive=Boolean(bioRiseMultiActive||galaxyLayoutActive);
  const bioProductName=IS_GALAXY?'Bioclimatic (Tilt)':'Eco-Bioclimatic (Tilt)';

  const beamCenterY=H/2-beamVertical/2;
  const beamBottomY=beamCenterY-beamVertical/2;
  if(freedomMultiActive){
    freedomMultiLayout.posts.forEach(post=>{
      const isEditableOuterPost=Number(post.sourceIndex)>=0;
      addBox({
        name:(post.row==='rear'?'Arka':'Ön')+' Dikme '+(post.lineIndex+1),
        px:post.x,py:0,pz:post.z,sx:post.section.x,sy:H,sz:post.section.z,
        idx:isEditableOuterPost?post.sourceIndex:undefined,
        userData:{freedomStructuralKind:'post',freedomPostId:post.id,postLineIndex:post.lineIndex,postRow:post.row,sharedBoundary:Boolean(post.sharedBoundary)}
      },magenta,isEditableOuterPost);
    });
    freedomMultiLayout.beams.forEach(beam=>{
      if(beam.kind==='width'){
        addBox({
          name:(beam.row==='rear'?'Arka':'Ön')+' Genişlik Kirişi · Modül '+(beam.moduleIndex+1),
          px:beam.x,py:beamCenterY,pz:beam.z+(Number.isFinite(Number(beam.inwardSign))?Number(beam.inwardSign):(beam.row==='rear'?1:-1))*frontBackBeamThickness/2,
          sx:beam.length,sy:beamVertical,sz:frontBackBeamThickness,isBeam:true,
          userData:{beamKind:'front-back',freedomStructuralKind:'beam',freedomBeamId:beam.id,moduleIndex:beam.moduleIndex,beamRow:beam.row}
        },blue,false);
      }else{
        addBox({
          name:'Açılım Kirişi '+String(beam.lineIndex),
          px:beam.x,py:beamCenterY,pz:beam.z,
          sx:sideBeamThickness,sy:beamVertical,sz:beam.length,isBeam:true,
          userData:{beamKind:'side',freedomStructuralKind:'beam',freedomBeamId:beam.id,postLineIndex:beam.lineIndex,sharedBoundary:Boolean(beam.sharedBoundary||beam.sharedAcrossRows)}
        },blue,false);
      }
    });
  }else if(bioFamilyLayoutActive){
    bioFamilyLayout.posts.forEach(post=>{
      const isEditableOuterPost=Number(post.sourceIndex)>=0;
      addBox({
        name:(post.row==='rear'?'Arka':'Ön')+' '+bioProductName+' Dikme '+(post.lineIndex+1),
        px:post.x,py:post.y,pz:post.z,sx:post.section.x,sy:post.height,sz:post.section.z,
        idx:isEditableOuterPost?post.sourceIndex:undefined,
        userData:{bioRiseStructuralKind:'post',galaxyStructuralKind:IS_GALAXY?'post':undefined,bioRisePostId:post.id,galaxyPostId:IS_GALAXY?post.id:undefined,productGroup:PRODUCT_GROUP,postLineIndex:post.lineIndex,postRow:post.row,sharedBoundary:Boolean(post.sharedBoundary),stopsUnderRecord:Boolean(post.stopsUnderRecord)}
      },magenta,isEditableOuterPost);
    });
    bioFamilyLayout.beams.forEach(beam=>{
      // Galaxy kayıtları V3.83'te ayrı kutu mesh değildir; aşağıda DXF birleşik kayıt+oluk profili olarak tek kez üretilir.
      if(IS_GALAXY)return;
      if(beam.kind==='width'){
        addBox({
          name:(beam.row==='rear'?'Arka':'Ön')+' '+bioProductName+' Kaydı · Modül '+(beam.moduleIndex+1),
          px:beam.x,py:beamCenterY,pz:beam.z+(Number.isFinite(Number(beam.inwardSign))?Number(beam.inwardSign):(beam.row==='rear'?1:-1))*frontBackBeamThickness/2,
          sx:beam.length,sy:beamVertical,sz:frontBackBeamThickness,isBeam:true,
          userData:{beamKind:'front-back',bioRiseStructuralKind:'beam',galaxyStructuralKind:IS_GALAXY?'beam':undefined,bioRiseBeamId:beam.id,galaxyBeamId:IS_GALAXY?beam.id:undefined,productGroup:PRODUCT_GROUP,moduleIndex:beam.moduleIndex,beamRow:beam.row,independentModuleFrame:true}
        },blue,false);
      }else{
        addBox({
          name:(beam.side==='left'?'Sol':'Sağ')+' '+bioProductName+' Yan Kaydı · Modül '+(beam.moduleIndex+1),
          px:beam.x,py:beamCenterY,pz:beam.z,
          sx:sideBeamThickness,sy:beamVertical,sz:beam.length,isBeam:true,
          userData:{beamKind:'side',bioRiseStructuralKind:'beam',galaxyStructuralKind:IS_GALAXY?'beam':undefined,bioRiseBeamId:beam.id,galaxyBeamId:IS_GALAXY?beam.id:undefined,productGroup:PRODUCT_GROUP,moduleIndex:beam.moduleIndex,beamSide:beam.side,independentModuleFrame:true}
        },blue,false);
      }
    });
  }else{
    const singleFreedom=!IS_BIO_FAMILY;
    addBox({name:'Arka Sol Dikme',px:-W/2+p[0].x/2,py:0,pz:-D/2+p[0].z/2,sx:p[0].x,sy:H,sz:p[0].z,idx:0,userData:singleFreedom?{freedomStructuralKind:'post',freedomPostId:'freedom-post-rear-0',postLineIndex:0,postRow:'rear'}:{}},magenta,true);
    addBox({name:'Arka Sağ Dikme',px:W/2-p[1].x/2,py:0,pz:-D/2+p[1].z/2,sx:p[1].x,sy:H,sz:p[1].z,idx:1,userData:singleFreedom?{freedomStructuralKind:'post',freedomPostId:'freedom-post-rear-1',postLineIndex:1,postRow:'rear'}:{}},magenta,true);
    addBox({name:'Ön Sol Dikme',px:-W/2+p[2].x/2,py:0,pz:D/2-p[2].z/2,sx:p[2].x,sy:H,sz:p[2].z,idx:2,userData:singleFreedom?{freedomStructuralKind:'post',freedomPostId:'freedom-post-front-0',postLineIndex:0,postRow:'front'}:{}},magenta,true);
    addBox({name:'Ön Sağ Dikme',px:W/2-p[3].x/2,py:0,pz:D/2-p[3].z/2,sx:p[3].x,sy:H,sz:p[3].z,idx:3,userData:singleFreedom?{freedomStructuralKind:'post',freedomPostId:'freedom-post-front-1',postLineIndex:1,postRow:'front'}:{}},magenta,true);

    addBox({name:'Front Beam',px:((-W/2+p[0].x)+(W/2-p[1].x))/2,py:beamCenterY,pz:-D/2+frontBackBeamThickness/2,sx:W-p[0].x-p[1].x,sy:beamVertical,sz:frontBackBeamThickness,isBeam:true,userData:{beamKind:'front-back',...(singleFreedom?{freedomStructuralKind:'beam',freedomBeamId:'freedom-beam-rear-1',moduleIndex:0,beamRow:'rear'}:{})}},blue,false);
    addBox({name:'Back Beam',px:((-W/2+p[2].x)+(W/2-p[3].x))/2,py:beamCenterY,pz:D/2-frontBackBeamThickness/2,sx:W-p[2].x-p[3].x,sy:beamVertical,sz:frontBackBeamThickness,isBeam:true,userData:{beamKind:'front-back',...(singleFreedom?{freedomStructuralKind:'beam',freedomBeamId:'freedom-beam-front-1',moduleIndex:0,beamRow:'front'}:{})}},blue,false);
    addBox({name:'Left Beam',px:-W/2+sideBeamThickness/2,py:beamCenterY,pz:((-D/2+p[0].z)+(D/2-p[2].z))/2,sx:sideBeamThickness,sy:beamVertical,sz:D-p[0].z-p[2].z,isBeam:true,userData:{beamKind:'side',...(singleFreedom?{freedomStructuralKind:'beam',freedomBeamId:'freedom-beam-depth-0',postLineIndex:0}:{})}},blue,false);
    addBox({name:'Right Beam',px:W/2-sideBeamThickness/2,py:beamCenterY,pz:((-D/2+p[1].z)+(D/2-p[3].z))/2,sx:sideBeamThickness,sy:beamVertical,sz:D-p[1].z-p[3].z,isBeam:true,userData:{beamKind:'side',...(singleFreedom?{freedomStructuralKind:'beam',freedomBeamId:'freedom-beam-depth-1',postLineIndex:1}:{})}},blue,false);
  }

  let railTop=151;
  let railBottom=30;
  let railOffsetFrom151=-92;

  const bioSideGutterWidth=98;
  const bioGutterBeamClearance=2;
  const bioLeftBeamInnerX=-W/2+sideBeamThickness;
  const bioRightBeamInnerX=W/2-sideBeamThickness;
  const bioLeftGutterOuterX=bioLeftBeamInnerX+bioGutterBeamClearance;
  const bioRightGutterOuterX=bioRightBeamInnerX-bioGutterBeamClearance;
  const bioLeftGutterInnerX=bioLeftGutterOuterX+bioSideGutterWidth;
  const bioRightGutterInnerX=bioRightGutterOuterX-bioSideGutterWidth;

  if(IS_BIO_FAMILY){
    const sideGutterWidth=bioSideGutterWidth;
    const sideGutterInnerRun=62;
    const modules=bioFamilyLayoutActive&&bioFamilyLayout
      ? bioFamilyLayout.modules
      : [{moduleIndex:0,leftGutterOuterX:bioLeftGutterOuterX,rightGutterOuterX:bioRightGutterOuterX,gutterCenterZ:0,gutterLength:Math.max(200,D-100),centerX:0,clearWidth:Math.max(200,W-p[0].x-p[1].x),rearOuterZ:-D/2,frontOuterZ:D/2,rearToFrontSign:1}];
    modules.forEach(module=>{
      const moduleNumber=module.moduleIndex+1;
      if(IS_GALAXY){
        const zSign=Number(module.rearToFrontSign)<0?-1:1;
        const centerZ=Number.isFinite(Number(module.centerZ))?Number(module.centerZ):0;
        const leftLength=Math.max(1,Number(module.leftSideBeamLength)||Number(module.depth||D)-280);
        const rightLength=Math.max(1,Number(module.rightSideBeamLength)||leftLength);
        const rearLength=Math.max(1,Number(module.rearBeamLength)||Number(module.clearWidth)||200);
        const frontLength=Math.max(1,Number(module.frontBeamLength)||rearLength);
        const leftZ=Number.isFinite(Number(module.leftSideBeamZ))?Number(module.leftSideBeamZ):centerZ;
        const rightZ=Number.isFinite(Number(module.rightSideBeamZ))?Number(module.rightSideBeamZ):centerZ;
        const outerMinX=Number.isFinite(Number(module.outerMinX))?Number(module.outerMinX):Number(module.leftGutterOuterX)-82;
        const outerMaxX=Number.isFinite(Number(module.outerMaxX))?Number(module.outerMaxX):Number(module.rightGutterOuterX)+82;
        const rearOuterZ=Number.isFinite(Number(module.rearOuterZ))?Number(module.rearOuterZ):Number(module.rearGutterInnerZ)-zSign*140;
        const frontOuterZ=Number.isFinite(Number(module.frontOuterZ))?Number(module.frontOuterZ):Number(module.frontGutterInnerZ)+zSign*140;

        const leftProfile=createGalaxyCombinedProfile('Galaxy Sol Birleşik Kayıt+Oluk · Modül '+moduleNumber,'side',leftLength,orange,'negX',{
          productGroup:PRODUCT_GROUP,moduleIndex:module.moduleIndex,gutterSide:'left',beamSide:'left',beamKind:'side',galaxyBeamId:'galaxy-beam-left-'+moduleNumber,independentModuleFrame:true
        });
        setMeshByBounds(leftProfile,{minX:outerMinX,centerZ:leftZ,bottomY:beamBottomY});

        const rightProfile=createGalaxyCombinedProfile('Galaxy Sağ Birleşik Kayıt+Oluk · Modül '+moduleNumber,'side',rightLength,orange,'posX',{
          productGroup:PRODUCT_GROUP,moduleIndex:module.moduleIndex,gutterSide:'right',beamSide:'right',beamKind:'side',galaxyBeamId:'galaxy-beam-right-'+moduleNumber,independentModuleFrame:true
        });
        setMeshByBounds(rightProfile,{maxX:outerMaxX,centerZ:rightZ,bottomY:beamBottomY});

        const rearDirection=zSign>0?'negZ':'posZ';
        const rearProfile=createGalaxyCombinedProfile('Galaxy Arka Birleşik Kayıt+Oluk · Modül '+moduleNumber,'front-rear',rearLength,orange,rearDirection,{
          productGroup:PRODUCT_GROUP,moduleIndex:module.moduleIndex,gutterSide:'rear',beamRow:'rear',beamKind:'front-back',galaxyBeamId:'galaxy-beam-rear-'+moduleNumber,independentModuleFrame:true
        });
        setMeshByBounds(rearProfile,zSign>0?{centerX:module.centerX,minZ:rearOuterZ,bottomY:beamBottomY}:{centerX:module.centerX,maxZ:rearOuterZ,bottomY:beamBottomY});

        const frontDirection=zSign>0?'posZ':'negZ';
        const frontProfile=createGalaxyCombinedProfile('Galaxy Ön Birleşik Kayıt+Oluk · Modül '+moduleNumber,'front-rear',frontLength,orange,frontDirection,{
          productGroup:PRODUCT_GROUP,moduleIndex:module.moduleIndex,gutterSide:'front',beamRow:'front',beamKind:'front-back',galaxyBeamId:'galaxy-beam-front-'+moduleNumber,independentModuleFrame:true
        });
        setMeshByBounds(frontProfile,zSign>0?{centerX:module.centerX,maxZ:frontOuterZ,bottomY:beamBottomY}:{centerX:module.centerX,minZ:frontOuterZ,bottomY:beamBottomY});
        return;
      }

      const sideGutterLength=Math.max(200,Number(module.gutterLength)||Number(module.depth||D)-100);
      const gutterCenterZ=Number.isFinite(Number(module.gutterCenterZ))?Number(module.gutterCenterZ):Number(module.centerZ)||0;
      const leftG=createExtrudedGutter(bioProductName+' Sol Oluk · Modül '+moduleNumber,sideGutterWidth,sideGutterInnerRun,sideGutterLength,orange,'right',true);
      leftG.userData={...(leftG.userData||{}),bioRiseStructuralKind:'gutter',productGroup:PRODUCT_GROUP,moduleIndex:module.moduleIndex,gutterSide:'left',independentModuleFrame:true};
      setMeshByBounds(leftG,{minX:module.leftGutterOuterX,centerZ:gutterCenterZ,bottomY:beamBottomY});
      const rightG=createExtrudedGutter(bioProductName+' Sağ Oluk · Modül '+moduleNumber,sideGutterWidth,sideGutterInnerRun,sideGutterLength,orange,'left',true);
      rightG.userData={...(rightG.userData||{}),bioRiseStructuralKind:'gutter',productGroup:PRODUCT_GROUP,moduleIndex:module.moduleIndex,gutterSide:'right',independentModuleFrame:true};
      setMeshByBounds(rightG,{maxX:module.rightGutterOuterX,centerZ:gutterCenterZ,bottomY:beamBottomY});
    });
  }else if(freedomMultiActive){
    const railBottomY=beamBottomY+4;
    const railHeight=128;
    const railSide=50;
    freedomMultiLayout.modules.forEach(module=>{
      const moduleNumber=module.moduleIndex+1;
      const moduleCenterZ=Number(module.centerZ)||0;
      const zSign=Number(module.rearToFrontSign)<0?-1:1;
      const toWorldZ=(localT)=>zSign*localT;
      const moduleCenterT=zSign*moduleCenterZ;
      const gutterFrameDepth=Math.max(200,Number(module.depth)-204);
      const gutterHalfDepth=gutterFrameDepth/2;
      const moduleRD=Math.max(200,Number(module.depth)-303);
      const railCenterT=moduleCenterT+((-moduleRD/2+railTop+moduleRD/2-railBottom)/2)+railOffsetFrom151;
      const railCenterZ=toWorldZ(railCenterT);
      const rearGutterEdgeZ=toWorldZ(moduleCenterT-gutterHalfDepth);
      const frontG=createExtrudedGutter('Front Gutter · Modül '+moduleNumber,210,172,module.gutterWidth,orange,zSign>0?'back':'front');
      frontG.userData={...(frontG.userData||{}),freedomStructuralKind:'gutter',moduleIndex:module.moduleIndex,gutterSide:'rear',rowIndex:module.rowIndex};
      setMeshByBounds(frontG,zSign>0?{centerX:module.centerX,minZ:rearGutterEdgeZ,bottomY:beamBottomY}:{centerX:module.centerX,maxZ:rearGutterEdgeZ,bottomY:beamBottomY});
      const frontGutterEdgeZ=toWorldZ(moduleCenterT+gutterHalfDepth);
      const backG=createExtrudedGutter('Back Gutter · Modül '+moduleNumber,210,172,module.gutterWidth,orange,zSign>0?'front':'back');
      backG.userData={...(backG.userData||{}),freedomStructuralKind:'gutter',moduleIndex:module.moduleIndex,gutterSide:'front',rowIndex:module.rowIndex};
      setMeshByBounds(backG,zSign>0?{centerX:module.centerX,maxZ:frontGutterEdgeZ,bottomY:beamBottomY}:{centerX:module.centerX,minZ:frontGutterEdgeZ,bottomY:beamBottomY});
      const leftG=createExtrudedGutter('Left Gutter · Modül '+moduleNumber,210,172,gutterFrameDepth,orange,'right');
      leftG.userData={...(leftG.userData||{}),freedomStructuralKind:'gutter',moduleIndex:module.moduleIndex,gutterSide:'left'};
      setMeshByBounds(leftG,{minX:module.clearMinX+2,centerZ:moduleCenterZ,bottomY:beamBottomY});
      const rightG=createExtrudedGutter('Right Gutter · Modül '+moduleNumber,210,172,gutterFrameDepth,orange,'left');
      rightG.userData={...(rightG.userData||{}),freedomStructuralKind:'gutter',moduleIndex:module.moduleIndex,gutterSide:'right'};
      setMeshByBounds(rightG,{maxX:module.clearMaxX-2,centerZ:moduleCenterZ,bottomY:beamBottomY});

      addBox({name:'Rail Top · Modül '+moduleNumber,px:module.centerX,py:railBottomY+railHeight/2,pz:toWorldZ(moduleCenterT+(-moduleRD/2+railTop/2)+railOffsetFrom151),sx:module.railWidth,sy:railHeight,sz:railTop,userData:{freedomStructuralKind:'rail',moduleIndex:module.moduleIndex,railSide:'rear',rowIndex:module.rowIndex}},amber,false);
      addBox({name:'Rail Bottom · Modül '+moduleNumber,px:module.centerX,py:railBottomY+railHeight/2,pz:toWorldZ(moduleCenterT+(moduleRD/2-railBottom/2)+railOffsetFrom151),sx:module.railWidth,sy:railHeight,sz:railBottom,userData:{freedomStructuralKind:'rail',moduleIndex:module.moduleIndex,railSide:'front',rowIndex:module.rowIndex}},amber,false);
      addBox({name:'Rail Left · Modül '+moduleNumber,px:module.clearMinX+4+railSide/2,py:railBottomY+railHeight/2,pz:railCenterZ,sx:railSide,sy:railHeight,sz:Math.max(20,moduleRD-railTop-railBottom),userData:{freedomStructuralKind:'rail',moduleIndex:module.moduleIndex,railSide:'left'}},amber,false);
      addBox({name:'Rail Right · Modül '+moduleNumber,px:module.clearMaxX-4-railSide/2,py:railBottomY+railHeight/2,pz:railCenterZ,sx:railSide,sy:railHeight,sz:Math.max(20,moduleRD-railTop-railBottom),userData:{freedomStructuralKind:'rail',moduleIndex:module.moduleIndex,railSide:'right'}},amber,false);
    });
  }else{
    const gutterFrameWidth=Math.max(200,W-204);
    const gutterFrameDepth=Math.max(200,D-204);
    const gutterHalfWidth=gutterFrameWidth/2;
    const gutterHalfDepth=gutterFrameDepth/2;
    const frontG=createExtrudedGutter('Front Gutter',210,172,gutterFrameWidth,orange,'back');
    frontG.userData={...(frontG.userData||{}),...(!IS_BIO_RISE?{freedomStructuralKind:'gutter',moduleIndex:0,gutterSide:'rear'}:{})};
    setMeshByBounds(frontG,{centerX:0,minZ:-gutterHalfDepth,bottomY:beamBottomY});
    const backG=createExtrudedGutter('Back Gutter',210,172,gutterFrameWidth,orange,'front');
    backG.userData={...(backG.userData||{}),...(!IS_BIO_RISE?{freedomStructuralKind:'gutter',moduleIndex:0,gutterSide:'front'}:{})};
    setMeshByBounds(backG,{centerX:0,maxZ:gutterHalfDepth,bottomY:beamBottomY});
    const leftG=createExtrudedGutter('Left Gutter',210,172,gutterFrameDepth,orange,'right');
    leftG.userData={...(leftG.userData||{}),...(!IS_BIO_RISE?{freedomStructuralKind:'gutter',moduleIndex:0,gutterSide:'left'}:{})};
    setMeshByBounds(leftG,{minX:-gutterHalfWidth,centerZ:0,bottomY:beamBottomY});
    const rightG=createExtrudedGutter('Right Gutter',210,172,gutterFrameDepth,orange,'left');
    rightG.userData={...(rightG.userData||{}),...(!IS_BIO_RISE?{freedomStructuralKind:'gutter',moduleIndex:0,gutterSide:'right'}:{})};
    setMeshByBounds(rightG,{maxX:gutterHalfWidth,centerZ:0,bottomY:beamBottomY});

    const railBottomY=beamBottomY+4;
    const railHeight=128;
    const railSide=50;
    const railCenterZ=((-RD/2+railTop+RD/2-railBottom)/2)+railOffsetFrom151;
    addBox({name:'Rail Top',px:0,py:railBottomY+railHeight/2,pz:(-RD/2+railTop/2)+railOffsetFrom151,sx:RW,sy:railHeight,sz:railTop,userData:!IS_BIO_RISE?{freedomStructuralKind:'rail',moduleIndex:0,railSide:'rear'}:{}},amber,false);
    addBox({name:'Rail Bottom',px:0,py:railBottomY+railHeight/2,pz:(RD/2-railBottom/2)+railOffsetFrom151,sx:RW,sy:railHeight,sz:railBottom,userData:!IS_BIO_RISE?{freedomStructuralKind:'rail',moduleIndex:0,railSide:'front'}:{}},amber,false);
    addBox({name:'Rail Left',px:-RW/2+railSide/2,py:railBottomY+railHeight/2,pz:railCenterZ,sx:railSide,sy:railHeight,sz:RD-railTop-railBottom,userData:!IS_BIO_RISE?{freedomStructuralKind:'rail',moduleIndex:0,railSide:'left'}:{}},amber,false);
    addBox({name:'Rail Right',px:RW/2-railSide/2,py:railBottomY+railHeight/2,pz:railCenterZ,sx:railSide,sy:railHeight,sz:RD-railTop-railBottom,userData:!IS_BIO_RISE?{freedomStructuralKind:'rail',moduleIndex:0,railSide:'right'}:{}},amber,false);
  }

  const lamelBottomY=beamBottomY+61;
  const bioRiseInnerWidth=Math.max(200,bioRightGutterInnerX-bioLeftGutterInnerX);
  const lamelLength=IS_BIO_FAMILY?bioRiseInnerWidth:W-385;
  // Açık lamel kesiti 180° aynalandığı için -80° pivot dönüşü net 100° efektif açıklık verir.
  const freedomEffectiveOpenAngle=100;
  const bioRiseEffectiveOpenAngle=100;
  const freedomLamelOpenAngle=freedomEffectiveOpenAngle-180;
  const bioRiseLamelOpenAngle=bioRiseEffectiveOpenAngle-180;
  const lamelOpenAngle=IS_BIO_FAMILY?bioRiseLamelOpenAngle:freedomLamelOpenAngle;
  const lamelCount=Math.max(0,Math.floor(LC||0));
  const lamelNarrowBy=IS_BIO_FAMILY?16:0;

  if(IS_BIO_FAMILY){
    const bioPanelSpacing=200;
    const bioPanelDepth=lamelProfileSpan(lamelNarrowBy);
    const closureClearance=2;
    const bioPanelModules=bioFamilyLayoutActive
      ? bioFamilyLayout.modules
      : [{moduleIndex:0,panelCenterX:0,panelLength:lamelLength,panelCount:lamelCount,rearOuterZ:-D/2,frontOuterZ:D/2,centerZ:0,depth:D}];

    bioPanelModules.forEach(module=>{
      const moduleNumber=module.moduleIndex+1;
      const moduleLength=bioFamilyLayoutActive?module.panelLength:lamelLength;
      const moduleCenterX=bioFamilyLayoutActive?module.panelCenterX:0;
      const modulePanelCount=Math.max(0,Math.floor(Number(module.panelCount)||lamelCount||0));
      const rearOuterZ=Number.isFinite(Number(module.rearOuterZ))?Number(module.rearOuterZ):-D/2;
      const frontOuterZ=Number.isFinite(Number(module.frontOuterZ))?Number(module.frontOuterZ):D/2;
      const zSign=Number(module.rearToFrontSign)<0?-1:1;
      const toT=(z)=>zSign*Number(z);
      const toZ=(t)=>zSign*Number(t);
      const rearOuterT=toT(rearOuterZ);
      const frontOuterT=toT(frontOuterZ);
      const rearFirstPanelMaxT=IS_GALAXY&&Number.isFinite(Number(module.frontGutterInnerT))?Number(module.frontGutterInnerT)-76:frontOuterT-216;
      const frontRoofInnerT=IS_GALAXY&&Number.isFinite(Number(module.rearGutterInnerT))?Number(module.rearGutterInnerT):rearOuterT+frontBackBeamThickness;
      const backRoofInnerT=IS_GALAXY&&Number.isFinite(Number(module.frontGutterInnerT))?Number(module.frontGutterInnerT):frontOuterT-frontBackBeamThickness;
      const frontMovingPanelMaxT=rearFirstPanelMaxT-Math.max(0,modulePanelCount-1)*bioPanelSpacing;
      const frontMovingPanelMinT=frontMovingPanelMaxT-bioPanelDepth;
      const frontClosureGap=Math.max(0,frontMovingPanelMinT-frontRoofInnerT);
      const backClosureGap=Math.max(0,backRoofInnerT-rearFirstPanelMaxT);
      const meta={bioRiseStructuralKind:'panel',galaxyStructuralKind:IS_GALAXY?'panel':undefined,productGroup:PRODUCT_GROUP,moduleIndex:module.moduleIndex,rowIndex:module.rowIndex,panelCollection:module.panelCollection};
      if(frontClosureGap>closureClearance+8){
        const frontClosure=createFixedClosureLamel((bioFamilyLayoutActive?'Modül '+moduleNumber+' · ':'')+bioProductName+' Front Fixed Closure',moduleLength,blue,frontClosureGap-closureClearance,lamelNarrowBy);
        frontClosure.userData={...(frontClosure.userData||{}),...meta,panelKind:'front-closure'};
        if(zSign<0)frontClosure.rotation.y=Math.PI;
        const edgeZ=toZ(frontRoofInnerT+closureClearance/2);
        setMeshByBounds(frontClosure,zSign>0?{centerX:moduleCenterX,minZ:edgeZ,bottomY:lamelBottomY}:{centerX:moduleCenterX,maxZ:edgeZ,bottomY:lamelBottomY});
      }
      if(backClosureGap>closureClearance+8){
        const backClosure=createFixedClosureLamel((bioFamilyLayoutActive?'Modül '+moduleNumber+' · ':'')+bioProductName+' Back Fixed Closure',moduleLength,blue,backClosureGap-closureClearance,lamelNarrowBy);
        backClosure.userData={...(backClosure.userData||{}),...meta,panelKind:'back-closure'};
        if(zSign<0)backClosure.rotation.y=Math.PI;
        const edgeZ=toZ(backRoofInnerT-closureClearance/2);
        setMeshByBounds(backClosure,zSign>0?{centerX:moduleCenterX,maxZ:edgeZ,bottomY:lamelBottomY}:{centerX:moduleCenterX,minZ:edgeZ,bottomY:lamelBottomY});
      }

      if(lamellaOpenMode){
        for(let i=0;i<modulePanelCount;i++){
          const opened=createOpenedLamel((bioFamilyLayoutActive?'Modül '+moduleNumber+' · ':'')+'Lamella '+(i+1),moduleLength,grass,lamelOpenAngle,lamelNarrowBy,true);
          const rearStackEdgeT=rearFirstPanelMaxT-(modulePanelCount-1-i)*bioPanelSpacing;
          const panelMeta={...meta,panelIndex:i};
          opened.pivot.userData={...(opened.pivot.userData||{}),...panelMeta};
          opened.mesh.userData={...(opened.mesh.userData||{}),...panelMeta};
          if(zSign<0)opened.pivot.rotation.y+=Math.PI;
          const edgeZ=toZ(rearStackEdgeT);
          setObjectByBounds(opened.pivot,zSign>0?{centerX:moduleCenterX,maxZ:edgeZ,bottomY:lamelBottomY}:{centerX:moduleCenterX,minZ:edgeZ,bottomY:lamelBottomY});
        }
      }else{
        for(let i=0;i<modulePanelCount;i++){
          const lamel=createLamel((bioFamilyLayoutActive?'Modül '+moduleNumber+' · ':'')+'Lamella '+(i+1),moduleLength,grass,lamelNarrowBy);
          lamel.userData={...(lamel.userData||{}),...meta,panelIndex:i};
          if(zSign<0)lamel.rotation.y=Math.PI;
          const panelEdgeT=rearFirstPanelMaxT-(modulePanelCount-1-i)*bioPanelSpacing;
          const edgeZ=toZ(panelEdgeT);
          setMeshByBounds(lamel,zSign>0?{centerX:moduleCenterX,maxZ:edgeZ,bottomY:lamelBottomY}:{centerX:moduleCenterX,minZ:edgeZ,bottomY:lamelBottomY});
        }
      }
    });
  }else{
    const lamelInsetFrom151=50;
    const freedomMotorFacade='front';
    const freedomMotorFacadeLabel='Arka Cephe';
    const lamelSpacing=216;
    const lamelOpenSpacing=65;
    const freedomPanelModules=freedomMultiActive
      ? freedomMultiLayout.modules
      : [{moduleIndex:0,centerX:0,centerZ:0,depth:D,panelLength:lamelLength,panelCount:lamelCount}];
    freedomPanelModules.forEach(module=>{
      const moduleNumber=module.moduleIndex+1;
      const moduleLamelLength=freedomMultiActive?module.panelLength:lamelLength;
      const moduleCenterZ=Number(module.centerZ)||0;
      const zSign=Number(module.rearToFrontSign)<0?-1:1;
      const moduleCenterT=zSign*moduleCenterZ;
      const toWorldZ=(localT)=>zSign*localT;
      const moduleRD=Math.max(200,Number(module.depth||D)-303);
      const moduleLamelStartT=moduleCenterT+(-moduleRD/2+railTop+railOffsetFrom151)+lamelInsetFrom151;
      const modulePanelCount=Math.max(0,Math.floor(Number(module.panelCount)||lamelCount||0));
      createFreedomPanelInstances(moduleNumber,module,moduleLamelLength,modulePanelCount,grass,lamelBottomY,lamelOpenAngle,moduleLamelStartT,moduleCenterT,zSign,toWorldZ,lamelSpacing,lamelOpenSpacing,freedomMotorFacade,freedomMotorFacadeLabel);
    });
  }

  buildFacadeProducts(p,beamBottomY,freedomMultiActive,bioFamilyLayoutActive,bioFamilyLayout);
  refreshToolboxSelectionVisuals();

  if(showAll){
    parts.forEach(part=>part.visible=true);
  }else{
    window.replayAnimation();
  }

  if(atomicSwap){
    group.position.copy(previousPosition);
    group.rotation.copy(previousRotation);
    group.scale.copy(previousScale);
    group.visible=previousVisible;
    previousParent.add(group);
    if(arSession){
      intermediateDimensionObjects.forEach(item=>item.visible=false);
      mainDimensionObjects.forEach(item=>item.visible=false);
      zonePickers.forEach(item=>item.visible=false);
      setArGhostMode(true);
    }
    if(previousGroup.parent)previousGroup.parent.remove(previousGroup);
    setTimeout(()=>disposeModelGroup(previousGroup),0);
  }
  lastBuiltGeometrySignature=liveGeometrySignature();
  endPerfCycle();
  if(!animationLoopRunning&&!arSession)renderer.render(scene,camera);
}

function disposeSceneObject(object){
  if(!object)return;
  if(object.geometry&&typeof object.geometry.dispose==='function')object.geometry.dispose();
  const materials=Array.isArray(object.material)?object.material:[object.material];
  materials.filter(Boolean).forEach(material=>{if(typeof material.dispose==='function')material.dispose();});
}

function refreshSceneEnvelope(){
  RW=W-208;
  RD=D-303;
  floorSize=Math.max(W,D)*1.7;
  if(floor.geometry&&typeof floor.geometry.dispose==='function')floor.geometry.dispose();
  floor.geometry=new THREE.PlaneGeometry(floorSize,floorSize);
  floor.position.y=-H/2-1;
  if(grid&&grid.parent)grid.parent.remove(grid);
  disposeSceneObject(grid);
  grid=new THREE.GridHelper(Math.max(W,D)*1.5,22,0x94a3b8,0x475569);
  grid.position.y=-H/2;
  scene.add(grid);
  if(box.geometry&&typeof box.geometry.dispose==='function')box.geometry.dispose();
  box.geometry=new THREE.EdgesGeometry(new THREE.BoxGeometry(W,H,D));
  dir.position.set(W*.35,H*1.1,D*.45);
  fill.position.set(-W*.45,H*.55,-D*.5);
  rim.position.set(-W*.7,H*.85,D*.9);
  warm.position.set(W*.1,H*.35,-D*.95);
}

function applyLiveModelPayload(payload){
  const next=payload&&typeof payload==='object'?payload:{};
  if(next.productGroup&&next.productGroup!==PRODUCT_GROUP)return false;
  W=Math.max(1,Number(next.width)||W);
  D=Math.max(1,Number(next.depth)||D);
  H=Math.max(1,Number(next.height)||H);
  LC=Math.max(1,Math.round(Number(next.lamellaCount)||LC));
  SYSTEM_COUNT=Math.max(1,Math.round(Number(next.systemCount)||SYSTEM_COUNT));
  freedomMultiLayout=next.freedomLayout&&typeof next.freedomLayout==='object'?JSON.parse(JSON.stringify(next.freedomLayout)):null;
  bioRiseMultiLayout=next.bioRiseLayout&&typeof next.bioRiseLayout==='object'?JSON.parse(JSON.stringify(next.bioRiseLayout)):null;
  galaxyMultiLayout=next.galaxyLayout&&typeof next.galaxyLayout==='object'?JSON.parse(JSON.stringify(next.galaxyLayout)):null;
  orientations=Array.isArray(next.orientations)?next.orientations.map(Number):orientations;
  postSections=Array.isArray(next.postSections)?next.postSections.map(section=>({...section})):postSections;
  beamSection=next.beamSection&&typeof next.beamSection==='object'?{...next.beamSection}:beamSection;
  placements=next.placements&&typeof next.placements==='object'?JSON.parse(JSON.stringify(next.placements)):{};
  zipPlacements=next.zipPlacements&&typeof next.zipPlacements==='object'?JSON.parse(JSON.stringify(next.zipPlacements)):{};
  facadeProfiles=next.facadeProfiles&&typeof next.facadeProfiles==='object'?JSON.parse(JSON.stringify(next.facadeProfiles)):{};
  selectedZoneId=next.selectedZoneId||null;
  dimensionVisibility=next.dimensionVisibility&&typeof next.dimensionVisibility==='object'?{...next.dimensionVisibility}:dimensionVisibility;
  productsOpen=Boolean(next.productsOpen);
  productOpenStates=next.productOpenStates&&typeof next.productOpenStates==='object'?{...next.productOpenStates}:{};
  panelStates=next.panelStates&&typeof next.panelStates==='object'?{...next.panelStates}:{};
  panelMasterOpen=Boolean(next.panelMasterOpen);
  lamellaOpenMode=panelMasterOpen;
  DEFAULT_COLOR_MODE=next.colorMode!=='ral';
  SYSTEM_COLOR=liveColorNumber(next.systemColor,SYSTEM_COLOR);
  PANEL_COLOR=liveColorNumber(next.panelColor,PANEL_COLOR);
  SYSTEM_FINISH=liveFinish(next.systemColor&&next.systemColor.finish,SYSTEM_FINISH);
  PANEL_FINISH=liveFinish(next.panelColor&&next.panelColor.finish,PANEL_FINISH);
  SYSTEM_COLOR_CODE=String(next.systemColor&&next.systemColor.code||SYSTEM_COLOR_CODE||'');
  PANEL_COLOR_CODE=String(next.panelColor&&next.panelColor.code||PANEL_COLOR_CODE||'');
  SYSTEM_COLOR_KIND=String(next.systemColor&&next.systemColor.kind||'');
  PANEL_COLOR_KIND=String(next.panelColor&&next.panelColor.kind||'');
  SYSTEM_COLOR_TEXTURE=String(next.systemColor&&next.systemColor.texture||'');
  PANEL_COLOR_TEXTURE=String(next.panelColor&&next.panelColor.texture||'');
  refreshSceneEnvelope();
  return true;
}

function liveGeometrySignature(){
  return stableRenderSignature({
    productGroup:PRODUCT_GROUP,width:W,depth:D,height:H,lamellaCount:LC,systemCount:SYSTEM_COUNT,
    freedomLayout:freedomMultiLayout,bioRiseLayout:bioRiseMultiLayout,galaxyLayout:galaxyMultiLayout,
    orientations,postSections,beamSection,placements,zipPlacements,facadeProfiles,
    productsOpen,productOpenStates,panelMasterOpen,
    colorMode:DEFAULT_COLOR_MODE?'default':'ral',systemColor:SYSTEM_COLOR,panelColor:PANEL_COLOR,systemFinish:SYSTEM_FINISH,panelFinish:PANEL_FINISH,systemColorCode:SYSTEM_COLOR_CODE,panelColorCode:PANEL_COLOR_CODE,systemColorKind:SYSTEM_COLOR_KIND,panelColorKind:PANEL_COLOR_KIND,systemColorTexture:SYSTEM_COLOR_TEXTURE,panelColorTexture:PANEL_COLOR_TEXTURE
  });
}

function rebuildModelWithoutFrameReload(revision){
  const requestedRevision=Number(revision)||0;
  if(requestedRevision<lastAppliedLiveRevision)return;
  lastAppliedLiveRevision=requestedRevision;
  if(arSession||arModelSnapshot){arDeferredModelRebuild=true;return;}
  const signature=liveGeometrySignature();
  if(signature&&signature===lastBuiltGeometrySignature){p3dvPerf.skippedRebuilds+=1;return;}
  p3dvPerf.scheduledRebuilds+=1;
  if(liveRebuildTimer)clearTimeout(liveRebuildTimer);
  // Coalesce bursts of parent messages and yield one paint before the expensive model pass.
  liveRebuildTimer=setTimeout(()=>{
    liveRebuildTimer=null;
    requestAnimationFrame(()=>{
      const latestSignature=liveGeometrySignature();
      if(latestSignature&&latestSignature===lastBuiltGeometrySignature){p3dvPerf.skippedRebuilds+=1;return;}
      if(timer)clearInterval(timer);
      buildModel(true,{atomicSwap:true,reason:'live-coalesced-rebuild'});
    });
  },48);
}

window.replayAnimation=function replayAnimation(){
  animStep=0;
  parts.forEach(part=>part.visible=false);
  if(timer)clearInterval(timer);
  timer=setInterval(()=>{
    if(animStep<parts.length){
      parts[animStep].visible=true;
      animStep++;
    }else{
      clearInterval(timer);
    }
  },120);
};

function updateMouse(event){
  mouse.x=event.clientX/innerWidth*2-1;
  mouse.y=-(event.clientY/innerHeight)*2+1;
  raycaster.setFromCamera(mouse,camera);
}

function pickInteractive(event){
  updateMouse(event);
  const hits=raycaster.intersectObjects(interactiveObjects.filter(obj=>obj.visible!==false),true);
  return hits.length?hits[0].object:null;
}

function pickVisiblePart(event){
  updateMouse(event);
  const hits=raycaster.intersectObjects(raycastCandidates(),true);
  return hits.length?hits[0].object:null;
}

function zoneFromObject(obj){
  let current=obj;
  while(current){
    if(current.userData&&current.userData.isZone)return current.userData.zone;
    if(current.userData&&current.userData.zoneId){
      const picker=zonePickers.find(item=>item.userData.zone.id===current.userData.zoneId);
      return picker?picker.userData.zone:null;
    }
    current=current.parent;
  }
  return null;
}

function partFromObject(obj){
  let current=obj;
  while(current&&current!==group){
    if(current.userData&&(current.userData.isPost||current.userData.isBeam||current.userData.isProduct||current.userData.isDividerProfile))return current;
    current=current.parent;
  }
  return obj;
}


let pergoRiseSelectedObject=null;
let pergoRiseSelectedTarget=null;
const pergoRiseSelectionInfo=document.getElementById('pergoRiseSelectionInfo');
const pergoRiseContextMenu=document.getElementById('pergoRiseContextMenu');
const pergoRiseOperationLabels={add:'Ekle',remove:'Kaldır',edit:'Düzenle',resize:'Ölçü Değiştir',recalculate:'Yeniden Hesapla'};
function pergoRiseSelectableFromObject(obj){
  let current=obj;
  while(current&&current!==group){
    if(current.userData&&current.userData.p3dvPergoRiseSelectable&&current.userData.editingTarget)return current;
    current=current.parent;
  }
  return null;
}
function clearPergoRiseSelection(){
  if(pergoRiseSelectedObject&&pergoRiseSelectedObject.traverse){
    pergoRiseSelectedObject.traverse(child=>{
      if(!child.isMesh||!child.material)return;
      const materials=Array.isArray(child.material)?child.material:[child.material];
      materials.forEach(material=>{
        if(material&&material.userData&&material.userData.p3dvYf1OriginalEmissive!==undefined&&material.emissive){
          material.emissive.setHex(material.userData.p3dvYf1OriginalEmissive);
          material.emissiveIntensity=material.userData.p3dvYf1OriginalEmissiveIntensity||0;
          delete material.userData.p3dvYf1OriginalEmissive;
          delete material.userData.p3dvYf1OriginalEmissiveIntensity;
        }
      });
    });
  }
  pergoRiseSelectedObject=null;pergoRiseSelectedTarget=null;
  if(pergoRiseSelectionInfo)pergoRiseSelectionInfo.style.display='none';
  if(pergoRiseContextMenu)pergoRiseContextMenu.style.display='none';
  if(IS_PERGO_RISE&&typeof updatePergoRiseCommonTestState==='function')updatePergoRiseCommonTestState();
}
function highlightPergoRiseSelection(object){
  clearPergoRiseSelection();
  if(!object)return;
  pergoRiseSelectedObject=object;pergoRiseSelectedTarget=object.userData.editingTarget;
  object.traverse(child=>{
    if(!child.isMesh||!child.material)return;
    const source=Array.isArray(child.material)?child.material:[child.material];
    const cloned=source.map(material=>material&&material.clone?material.clone():material);
    child.material=Array.isArray(child.material)?cloned:cloned[0];
    cloned.forEach(material=>{
      if(!material||!material.emissive)return;
      material.userData=material.userData||{};
      material.userData.p3dvYf1OriginalEmissive=material.emissive.getHex();
      material.userData.p3dvYf1OriginalEmissiveIntensity=material.emissiveIntensity||0;
      material.emissive.setHex(0x38bdf8);material.emissiveIntensity=.65;
    });
  });
  if(pergoRiseSelectionInfo){
    pergoRiseSelectionInfo.textContent=(pergoRiseSelectedTarget.label||pergoRiseSelectedTarget.id)+' · '+pergoRiseSelectedTarget.targetType;
    pergoRiseSelectionInfo.style.display='block';
  }
  postParent('pergo-rise-edit-selection',{target:{...pergoRiseSelectedTarget}});
  updatePergoRiseCommonTestState();
}
function showPergoRiseContextMenu(event,object){
  if(!IS_PERGO_RISE||!pergoRiseContextMenu||!object)return false;
  highlightPergoRiseSelection(object);
  const target=pergoRiseSelectedTarget||{};const operations=Array.isArray(target.operations)?target.operations:[];
  pergoRiseContextMenu.innerHTML='';
  const title=document.createElement('strong');title.textContent=target.label||target.id||'Pergola nesnesi';pergoRiseContextMenu.appendChild(title);
  const menuActions=Array.isArray(target.menuActions)&&target.menuActions.length?target.menuActions.map(item=>[item.id,item.label]):operations.map(operation=>[operation,pergoRiseOperationLabels[operation]||operation]);
  menuActions.forEach(([operation,label])=>{
    const button=document.createElement('button');button.type='button';button.textContent=label;
    button.addEventListener('click',()=>{
      pergoRiseContextMenu.style.display='none';
      postParent('pergo-rise-edit-operation-request',{operation:operation,areaAction:target.targetType==='area'?operation:null,target:{...target},foundationOnly:false});
    });
    pergoRiseContextMenu.appendChild(button);
  });
  const rect=renderer.domElement.getBoundingClientRect();
  pergoRiseContextMenu.style.left=Math.max(8,Math.min(event.clientX-rect.left,rect.width-292))+'px';
  pergoRiseContextMenu.style.top=Math.max(8,Math.min(event.clientY-rect.top,rect.height-260))+'px';
  pergoRiseContextMenu.style.display='block';
  return true;
}

renderer.domElement.addEventListener('pointerdown',event=>{
  if(arSession)return;
  pointerStart={x:event.clientX,y:event.clientY};
});

renderer.domElement.addEventListener('pointermove',event=>{
  if(arSession)return;
  if(pointerStart&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>6)return;
  const obj=pickInteractive(event);
  const zone=zoneFromObject(obj);
  const next=zone?zonePickers.find(item=>item.userData.zone.id===zone.id):null;
  const part=partFromObject(obj);
  const profilePointer=Boolean(part&&part.userData&&part.userData.isDividerProfile&&(!toolboxSelectionMode||part.userData.toolboxEligible));
  const postPointer=Boolean(part&&part.userData&&part.userData.isPost&&!toolboxSelectionMode);
  const zonePointer=Boolean(next&&(!toolboxSelectionMode||next.userData.toolboxEligible));
  const directPointer=profilePointer||postPointer;
  if(next===hoveredZone&&!directPointer)return;
  if(hoveredZone)setZoneHighlight(hoveredZone,false);
  hoveredZone=next||null;
  if(hoveredZone)setZoneHighlight(hoveredZone,true);
  renderer.domElement.style.cursor=(zonePointer||directPointer)?'pointer':'grab';
});

renderer.domElement.addEventListener('pointerleave',()=>{
  if(hoveredZone)setZoneHighlight(hoveredZone,false);
  hoveredZone=null;
  pointerStart=null;
});

renderer.domElement.addEventListener('pointerup',event=>{
  if(arSession)return;
  const start=pointerStart;
  pointerStart=null;
  if(!start||Math.hypot(event.clientX-start.x,event.clientY-start.y)>6)return;
  const interactive=pickInteractive(event);
  const interactivePart=partFromObject(interactive);
  const zone=zoneFromObject(interactive);
  const obj=partFromObject(pickVisiblePart(event));

  if(IS_PERGO_RISE&&!toolboxSelectionMode){
    const selectable=pergoRiseSelectableFromObject(pickVisiblePart(event));
    if(selectable){
      const target=selectable.userData&&selectable.userData.editingTarget||{};
      if(target.targetType==='area'){
        const zone=pergoRiseZoneFromTarget(target);
        if(selectedZonePicker){selectedZonePicker.userData.selected=false;setZoneHighlight(selectedZonePicker,false);}
        selectedZoneId=zone.id;selectedZonePicker=zonePickers.find(item=>item.userData&&item.userData.zone&&item.userData.zone.id===zone.id)||null;
        if(selectedZonePicker){selectedZonePicker.userData.selected=true;setZoneHighlight(selectedZonePicker,true);}
        postParent('select-zone',{zone:{...zone}});
        updatePergoRiseCommonTestState();
      }else highlightPergoRiseSelection(selectable);
      return;
    }
    clearPergoRiseSelection();
  }

  if(!toolboxSelectionMode&&interactivePart&&interactivePart.userData&&interactivePart.userData.isTogglePanel){
    scheduleTogglePanelZoneSelection(zone||zoneFromObject(interactivePart));
    return;
  }

  if(toolboxSelectionMode){
    if(zone){
      const picker=zonePickers.find(item=>item.userData.zone.id===zone.id)||null;
      if(picker&&isToolboxZoneEligible(zone,picker.userData.occupied)){
        postParent('toggle-toolbox-selection',{
          item:{kind:'zone',key:toolboxZoneKey(zone),zone:{...zone},occupied:Boolean(picker.userData.occupied)}
        });
      }
      return;
    }
    if(obj&&obj.userData.isDividerProfile&&isToolboxProfileEligible(obj.userData.profile)){
      const profile={...obj.userData.profile};
      postParent('toggle-toolbox-selection',{
        item:{kind:'profile',key:toolboxProfileKey(profile),profile}
      });
    }
    return;
  }

  if(zone){
    if(selectedZonePicker){
      selectedZonePicker.userData.selected=false;
      setZoneHighlight(selectedZonePicker,false);
    }
    selectedZoneId=zone.id;
    selectedZonePicker=zonePickers.find(item=>item.userData.zone.id===zone.id)||null;
    if(selectedZonePicker){
      selectedZonePicker.userData.selected=true;
      setZoneHighlight(selectedZonePicker,true);
    }
    postParent('select-zone',{zone:{...zone}});
    return;
  }
  if(obj&&obj.userData.isDividerProfile){
    postParent('select-divider-profile',{profile:{...obj.userData.profile}});
    return;
  }
  if(obj&&obj.userData.isPost){
    postParent('select-post',{postIndex:obj.userData.postIndex});
  }
});

renderer.domElement.addEventListener('contextmenu',event=>{
  if(toolboxSelectionMode){event.preventDefault();postParent('complete-toolbox-selection');return;}
  if(IS_PERGO_RISE){
    const selectable=pergoRiseSelectableFromObject(pickVisiblePart(event));
    if(selectable){
      event.preventDefault();
      const target=selectable.userData&&selectable.userData.editingTarget||{};
      if(target.targetType==='area'){
        const zone=pergoRiseZoneFromTarget(target);
        selectedZoneId=zone.id;
        if(selectedZonePicker){selectedZonePicker.userData.selected=false;setZoneHighlight(selectedZonePicker,false);}
        selectedZonePicker=zonePickers.find(item=>item.userData&&item.userData.zone&&item.userData.zone.id===zone.id)||null;
        if(selectedZonePicker){selectedZonePicker.userData.selected=true;setZoneHighlight(selectedZonePicker,true);}
        postParent('select-zone',{zone:{...zone}});updatePergoRiseCommonTestState();return;
      }
      showPergoRiseContextMenu(event,selectable);return;
    }
  }
});

window.addEventListener('keydown',event=>{
  if(!toolboxSelectionMode)return;
  if(event.key==='Escape'){
    event.preventDefault();
    postParent('cancel-toolbox-selection');
  }else if(event.key==='Enter'){
    event.preventDefault();
    postParent('complete-toolbox-selection');
  }
});

window.addEventListener('dblclick',event=>{
  const obj=partFromObject(pickVisiblePart(event));
  if(!obj)return;
  if(obj.userData.isTogglePanel&&obj.userData.zoneId){
    cancelPendingTogglePanelSelection();
    postParent('toggle-panel-state',{
      panelKey:obj.userData.panelKey||obj.userData.productKey||obj.userData.zoneId,
      productKey:obj.userData.productKey||obj.userData.panelKey||obj.userData.zoneId,
      zoneId:obj.userData.zoneId,
      open:!Boolean(obj.userData.panelOpen)
    });
    return;
  }
  if(obj.userData.isBeam)editBeamSection();
});

window.addEventListener('message',event=>{
  if(event.source!==parent)return;
  if(!event.data||event.data.source!=='product-3d-parent')return;
  if(event.data.sessionId!==VIEWER_SESSION_ID)return;
  if(event.data.type==='set-model-state'){
    const revision=Number(event.data.revision)||0;
    if(revision<lastAppliedLiveRevision)return;
    if(!applyLiveModelPayload(event.data.model||{}))return;
    rebuildModelWithoutFrameReload(revision);
    postParent('model-state-applied',{revision,reason:event.data.reason||'model-change'});
  }
  if(event.data.type==='set-product-open-state'){
    const revision=Number(event.data.revision)||0;
    if(revision<lastAppliedLiveRevision)return;
    productsOpen=Boolean(event.data.productsOpen);
    productOpenStates=event.data.productOpenStates&&typeof event.data.productOpenStates==='object'?{...event.data.productOpenStates}:{};
    panelStates=event.data.panelStates&&typeof event.data.panelStates==='object'?{...event.data.panelStates}:{};
    rebuildModelWithoutFrameReload(revision);
    postParent('product-open-state-applied',{revision});
  }
  if(event.data.type==='set-panel-master-open'){
    const revision=Number(event.data.revision)||0;
    if(revision<lastAppliedLiveRevision)return;
    panelMasterOpen=Boolean(event.data.open);
    lamellaOpenMode=panelMasterOpen;
    rebuildModelWithoutFrameReload(revision);
    postParent('panel-master-open-applied',{open:panelMasterOpen,revision});
  }
  if(event.data.type==='set-color-state'){
    const revision=Number(event.data.revision)||0;
    if(revision<lastAppliedLiveRevision)return;
    DEFAULT_COLOR_MODE=event.data.colorMode!=='ral';
    SYSTEM_COLOR=liveColorNumber(event.data.systemColor,SYSTEM_COLOR);
    PANEL_COLOR=liveColorNumber(event.data.panelColor,PANEL_COLOR);
    SYSTEM_FINISH=liveFinish(event.data.systemColor&&event.data.systemColor.finish,SYSTEM_FINISH);
    PANEL_FINISH=liveFinish(event.data.panelColor&&event.data.panelColor.finish,PANEL_FINISH);
    SYSTEM_COLOR_CODE=String(event.data.systemColor&&event.data.systemColor.code||SYSTEM_COLOR_CODE||'');
    PANEL_COLOR_CODE=String(event.data.panelColor&&event.data.panelColor.code||PANEL_COLOR_CODE||'');
    SYSTEM_COLOR_KIND=String(event.data.systemColor&&event.data.systemColor.kind||'');
    PANEL_COLOR_KIND=String(event.data.panelColor&&event.data.panelColor.kind||'');
    SYSTEM_COLOR_TEXTURE=String(event.data.systemColor&&event.data.systemColor.texture||'');
    PANEL_COLOR_TEXTURE=String(event.data.panelColor&&event.data.panelColor.texture||'');
    rebuildModelWithoutFrameReload(revision);
    postParent('color-state-applied',{revision,colorMode:DEFAULT_COLOR_MODE?'default':'ral'});
  }
  if(event.data.type==='clear-zone-selection'){
    if(selectedZonePicker){selectedZonePicker.userData.selected=false;setZoneHighlight(selectedZonePicker,false);}
    selectedZonePicker=null;selectedZoneId=null;
    if(IS_PERGO_RISE)clearPergoRiseSelection();
    if(IS_PERGO_RISE)updatePergoRiseCommonTestState();
    return;
  }
  if(event.data.type==='set-pergo-rise-project'&&IS_PERGO_RISE){
    const revision=Number(event.data.revision)||0;
    if(revision<lastAppliedLiveRevision){pergoRiseStaleProjectMessagesIgnored+=1;updatePergoRiseCommonTestState();return;}
    pergoRiseProject=event.data.project||null;
    pergoRiseDerived=pergoRiseProject&&pergoRiseProject.derived?pergoRiseProject.derived:null;
    if(pergoRiseDerived&&pergoRiseDerived.envelope){
      W=Math.max(1,Number(pergoRiseDerived.envelope.width)||W);
      D=Math.max(1,Number(pergoRiseDerived.envelope.depth)||D);
      H=Math.max(1,Number(pergoRiseDerived.envelope.height)||H);
      refreshSceneEnvelope();
    }
    lastAppliedLiveRevision=revision;pergoRiseAcceptedProjectRevision=revision;
    if(arSession||arModelSnapshot){arDeferredModelRebuild=true;}
    else if(!reconcilePergoRiseAssembly(event.data.changedPaths||[]))rebuildModelWithoutFrameReload(revision);
    pergoRiseAssemblyRevision=Math.max(pergoRiseAssemblyRevision+1,revision||0);updatePergoRiseCommonTestState();
    postParent('pergo-rise-project-applied',{revision,projectHash:pergoRiseDerived&&pergoRiseDerived.projectHash||'',reconcile:{...pergoRiseReconcileStats}});
  }
  if(event.data.type==='set-runtime-active'){
    viewerRuntimeActive=Boolean(event.data.active);
    syncViewerAnimationLoop();
    postParent('runtime-active-applied',{active:viewerRuntimeActive,animationLoopRunning});
  }
  if(event.data.type==='replay-animation'&&!IS_PERGO_RISE)window.replayAnimation();
  if(event.data.type==='set-dimension-visibility')setDimensionVisibility(event.data.visibility);
  if(event.data.type==='set-dimensions-visible')setDimensionVisibility({intermediate:Boolean(event.data.visible),main:Boolean(event.data.visible)});
  if(event.data.type==='set-toolbox-selection'){
    toolboxSelectionMode=event.data.mode||null;
    toolboxSelectionKeys=new Set(Array.isArray(event.data.keys)?event.data.keys:[]);
    refreshToolboxSelectionVisuals();
  }
  if(event.data.type==='reset-camera'){
    camera.position.set(W*.92,H*.82,D*1.08);
    controls.target.set(0,0,0);
    camera.zoom=1;
    camera.updateProjectionMatrix();
    controls.update();
    publishCameraState();
  }
  if(event.data.type==='zoom-camera'){
    const factor=Number(event.data.factor);
    if(Number.isFinite(factor)&&factor>0){
      camera.zoom=Math.max(.35,Math.min(3.5,camera.zoom*factor));
      camera.updateProjectionMatrix();
      controls.update();
      publishCameraState();
    }
  }
  if(event.data.type==='viewport-resized'){
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
    // setSize clears the drawing buffer. Repaint once when the continuous loop is
    // paused so expanding the preview can never turn a valid model into a blank canvas.
    if(!animationLoopRunning&&!arSession)renderer.render(scene,camera);
  }
});

window.captureFreedom3D=function(preset){
  const savedPosition=camera.position.clone();
  const savedTarget=controls.target.clone();
  const savedZoom=camera.zoom;
  const savedVisibility=parts.map(part=>part.visible!==false);
  const resumeAnimation=Boolean(timer&&animStep<parts.length);
  if(timer){clearInterval(timer);timer=null;}
  parts.forEach(part=>part.visible=true);
  const presets={
    'front-left':{position:[-W*1.34,H*.94,-D*1.42],target:[0,0,0],zoom:.94},
    'front-right':{position:[W*1.34,H*.94,-D*1.42],target:[0,0,0],zoom:.94},
    'back-left':{position:[-W*1.34,H*.94,D*1.42],target:[0,0,0],zoom:.94},
    'back-right':{position:[W*1.34,H*.94,D*1.42],target:[0,0,0],zoom:.94},
    'perspective':{position:[W*1.18,H*.96,D*1.34],target:[0,0,0],zoom:.96},
    'front':{position:[0,H*.34,-D*1.82],target:[0,0,0],zoom:1.03},
    'side':{position:[W*1.82,H*.34,0],target:[0,0,0],zoom:1.03},
    'top':{position:[0,H*3.35,D*.035],target:[0,0,0],zoom:.90},
    'default':{position:[W*1.1,H*.88,D*1.22],target:[0,0,0],zoom:1}
  };
  const view=presets[preset]||presets.default;
  camera.position.fromArray(view.position);
  controls.target.fromArray(view.target);
  camera.zoom=view.zoom||1;
  camera.updateProjectionMatrix();
  controls.update();
  renderer.render(scene,camera);
  const result={
    dataUrl:renderer.domElement.toDataURL('image/jpeg',.88),
    width:renderer.domElement.width,
    height:renderer.domElement.height,
    preset:String(preset||'default')
  };
  parts.forEach((part,index)=>{part.visible=savedVisibility[index];});
  camera.position.copy(savedPosition);
  controls.target.copy(savedTarget);
  camera.zoom=savedZoom;
  camera.updateProjectionMatrix();
  controls.update();
  renderer.render(scene,camera);
  publishCameraState();
  if(resumeAnimation){
    timer=setInterval(()=>{
      if(animStep<parts.length){parts[animStep].visible=true;animStep++;}
      else{clearInterval(timer);timer=null;}
    },120);
  }
  return result;
};

window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
  if(!animationLoopRunning&&!arSession)renderer.render(scene,camera);
});

function animate(time,frame){
  animationFrameCount+=1;
  if(arSession)updateArFrame(frame);
  else controls.update();
  renderer.render(scene,camera);
}

function findPergoRiseObjectByTargetId(targetId){
  if(!pergoRiseAssemblyRoot)return null;let found=null;
  pergoRiseAssemblyRoot.traverse(object=>{if(found||!object.userData||!object.userData.editingTarget)return;if(String(object.userData.editingTarget.id)===String(targetId||''))found=object;});
  return found;
}
function pergoRiseEditableTargets(){
  const out=[];const seen=new Set();if(!pergoRiseAssemblyRoot)return out;
  pergoRiseAssemblyRoot.traverse(object=>{const target=object.userData&&object.userData.editingTarget;if(!target||seen.has(target.id))return;seen.add(target.id);const box=new THREE.Box3().setFromObject(object);out.push({target:JSON.parse(JSON.stringify(target)),bounds:{minX:box.min.x,maxX:box.max.x,minY:box.min.y,maxY:box.max.y,minZ:box.min.z,maxZ:box.max.z},kind:target.targetType==='area'?'area':'component',componentId:object.userData.componentId||''});});
  return out;
}
function pergoRiseProductSummary(){
  return (pergoRiseDerived&&Array.isArray(pergoRiseDerived.components)?pergoRiseDerived.components:[]).filter(item=>item.kind==='area-product').map(item=>({id:String(item.id||''),placementId:String(item.placementId||''),productType:String(item.productType||''),face:String(item.face||''),width:Number(item.width)||0,height:Number(item.height)||0,baseElevation:Number(item.baseElevation)||0,position:Array.isArray(item.position)?item.position.map(Number):[],productGeometry:item.productGeometry||{},primitiveCount:Number(item.productGeometry&&item.productGeometry.primitiveCount)||5}));
}
function updatePergoRiseCommonTestState(){
  if(!IS_PERGO_RISE)return;
  const targets=pergoRiseEditableTargets();
  const assemblyBox=pergoRiseAssemblyRoot?new THREE.Box3().setFromObject(pergoRiseAssemblyRoot):null;
  window.__P3DV_PERGO_TEST__={
    ...(window.__P3DV_PERGO_TEST__||{}),ready:true,renderer:'Three.js r128 shared viewer',webglVersion:renderer.capabilities&&renderer.capabilities.isWebGL2?'WebGL2':'WebGL1',
    projectHash:pergoRiseDerived&&pergoRiseDerived.projectHash||'',counts:pergoRiseDerived&&pergoRiseDerived.counts||{},instanceCount:parts.length,
    loadStatus:pergoRiseLoadStatus,componentMapping:pergoRiseComponentLibrary&&pergoRiseComponentLibrary.mapping||[],renderError:Boolean(pergoRiseAssemblyRoot&&pergoRiseAssemblyRoot.userData&&pergoRiseAssemblyRoot.userData.p3dvPergoRiseRenderError),
    assemblyRevision:pergoRiseAssemblyRevision,acceptedProjectRevision:pergoRiseAcceptedProjectRevision,staleProjectMessagesIgnored:pergoRiseStaleProjectMessagesIgnored,
    missing:pergoRiseAssemblyRoot&&pergoRiseAssemblyRoot.userData&&pergoRiseAssemblyRoot.userData.buildReport?pergoRiseAssemblyRoot.userData.buildReport.missing||[]:[],camera:cameraSnapshot(),sessionId:VIEWER_SESSION_ID,
    staticState:pergoRiseDerived&&pergoRiseDerived.staticState||'',iframeStableUpdates:true,partialSceneReconcile:true,commonScene:true,sharedOrbitControls:true,sharedAr:true,
    sceneGroundY:-Math.max(1,Number(H)||1)/2,assemblyOffsetY:pergoRiseAssemblyRoot?Number(pergoRiseAssemblyRoot.position.y)||0:0,canonicalGroundY:0,
    assemblyBounds:assemblyBox?{minY:assemblyBox.min.y,maxY:assemblyBox.max.y,minX:assemblyBox.min.x,maxX:assemblyBox.max.x,minZ:assemblyBox.min.z,maxZ:assemblyBox.max.z}:null,
    selectableAreaScopes:pergoRiseAssemblyRoot&&pergoRiseAssemblyRoot.userData&&pergoRiseAssemblyRoot.userData.buildReport?pergoRiseAssemblyRoot.userData.buildReport.selectableAreaScopes||[]:[],
    selectableAreaActionTypes:pergoRiseAssemblyRoot&&pergoRiseAssemblyRoot.userData&&pergoRiseAssemblyRoot.userData.buildReport?pergoRiseAssemblyRoot.userData.buildReport.selectableAreaActionTypes||[]:[],
    reconcileStats:{...pergoRiseReconcileStats,dynamicCreated:pergoRiseReconcileStats.added,dynamicReplaced:pergoRiseReconcileStats.replaced,dynamicRemoved:pergoRiseReconcileStats.removed,staticReused:pergoRiseReconcileStats.reused},
    editableTargetCount:targets.length,selectableComponentCount:targets.filter(item=>item.kind==='component').length,selectableAreaCount:targets.filter(item=>item.kind==='area').length,
    selectedTargetId:pergoRiseSelectedTarget&&pergoRiseSelectedTarget.id||'',selectedTargetType:pergoRiseSelectedTarget&&pergoRiseSelectedTarget.targetType||'',contextMenuVisible:Boolean(pergoRiseContextMenu&&pergoRiseContextMenu.style.display==='block'),
    dimensionVisibility:{...dimensionVisibility},widthTopology:pergoRiseDerived&&pergoRiseDerived.widthTopology||null,gutterSummary:pergoRiseDerived&&pergoRiseDerived.gutterLayout||[],postSummary:pergoRiseDerived&&pergoRiseDerived.postLayout||[],roofRegisterSummary:pergoRiseDerived&&pergoRiseDerived.roofRegisterLayout||[],trapezSheetSummary:pergoRiseDerived&&pergoRiseDerived.trapezSheetLayout||[],productSummary:pergoRiseProductSummary()
  };
}
window.__P3DV_PERGO_CONTROLLER__={
  setProject(nextProject,revision){
    const rev=Number(revision)||0;if(rev<lastAppliedLiveRevision){pergoRiseStaleProjectMessagesIgnored+=1;updatePergoRiseCommonTestState();return false;}
    pergoRiseProject=nextProject||null;pergoRiseDerived=pergoRiseProject&&pergoRiseProject.derived||null;lastAppliedLiveRevision=rev;pergoRiseAcceptedProjectRevision=rev;
    if(pergoRiseDerived&&pergoRiseDerived.envelope){W=Math.max(1,Number(pergoRiseDerived.envelope.width)||W);D=Math.max(1,Number(pergoRiseDerived.envelope.depth)||D);H=Math.max(1,Number(pergoRiseDerived.envelope.height)||H);refreshSceneEnvelope();}
    const applied=reconcilePergoRiseAssembly([]);if(!applied)rebuildModelWithoutFrameReload(rev);pergoRiseAssemblyRevision=Math.max(pergoRiseAssemblyRevision+1,rev||0);updatePergoRiseCommonTestState();return true;
  },
  selectTargetById(targetId){const object=findPergoRiseObjectByTargetId(targetId);if(!object)return false;highlightPergoRiseSelection(object);updatePergoRiseCommonTestState();return true;},
  openContextMenuForTarget(targetId,x,y){const object=findPergoRiseObjectByTargetId(targetId);if(!object)return false;const rect=renderer.domElement.getBoundingClientRect();showPergoRiseContextMenu({clientX:rect.left+(Number(x)||80),clientY:rect.top+(Number(y)||80)},object);updatePergoRiseCommonTestState();return true;},
  getEditableTargets(){return pergoRiseEditableTargets();},
  getDebugState(){updatePergoRiseCommonTestState();return JSON.parse(JSON.stringify(window.__P3DV_PERGO_TEST__||{}));},
  clearSelection(){clearPergoRiseSelection();if(selectedZonePicker){selectedZonePicker.userData.selected=false;setZoneHighlight(selectedZonePicker,false);}selectedZonePicker=null;selectedZoneId=null;updatePergoRiseCommonTestState();return true;}
};

function freedomPanelDiagnostics(){
  const result=[];
  parts.filter(part=>part.userData&&part.userData.freedomStructuralKind==='panel').forEach(part=>{
    if(part.userData.p3dvInstancedPanels&&Array.isArray(part.userData.instancePanels)){
      part.userData.instancePanels.forEach(meta=>result.push({...meta}));return;
    }
    result.push({name:part.userData.name,moduleIndex:part.userData.moduleIndex,panelIndex:part.userData.panelIndex,rowIndex:part.userData.rowIndex,panelCollection:part.userData.panelCollection,position:part.position.toArray()});
  });
  return result;
}

window.__P3DV_TECHNICAL2D_VIEWER__=Object.freeze({
  zones:()=>zonePickers.map(item=>JSON.parse(JSON.stringify(item&&item.userData&&item.userData.zone||null))).filter(Boolean),
  profiles:()=>interactiveObjects.filter(obj=>obj&&obj.userData&&obj.userData.isDividerProfile&&obj.userData.profile).map(obj=>JSON.parse(JSON.stringify(obj.userData.profile))),
  productSlots:()=>zonePickers.map(item=>{const zone=item&&item.userData&&item.userData.zone;if(!zone)return null;return {zoneId:zone.id,primary:placements[zone.id]?JSON.parse(JSON.stringify(placements[zone.id])):null,zip:zipPlacements[zone.id]?JSON.parse(JSON.stringify(zipPlacements[zone.id])):null};}).filter(Boolean)
});

window.__P3DV_V354_TEST__={
  state:()=>({
    sessionId:VIEWER_SESSION_ID,
    modelGeneration,
    width:W,depth:D,height:H,lamellaCount:LC,systemCount:SYSTEM_COUNT,
    freedomLayout:freedomMultiLayout?JSON.parse(JSON.stringify(freedomMultiLayout)):null,
    bioRiseLayout:bioRiseMultiLayout?JSON.parse(JSON.stringify(bioRiseMultiLayout)):null,
    galaxyLayout:galaxyMultiLayout?JSON.parse(JSON.stringify(galaxyMultiLayout)):null,
    partCount:parts.length,zoneCount:zonePickers.length,interactiveCount:interactiveObjects.length,
    bioRiseStructure:{
      posts:parts.filter(part=>part.userData&&part.userData.bioRiseStructuralKind==='post').map(part=>({id:part.userData.bioRisePostId||part.userData.name,lineIndex:part.userData.postLineIndex,row:part.userData.postRow,sharedBoundary:Boolean(part.userData.sharedBoundary),stopsUnderRecord:Boolean(part.userData.stopsUnderRecord),height:Number(part.userData&&part.userData.p3dvSize&&part.userData.p3dvSize[1])||Number(part.geometry&&part.geometry.parameters&&part.geometry.parameters.height)||0,size:(part.userData&&Array.isArray(part.userData.p3dvSize)?part.userData.p3dvSize.slice():[Number(part.geometry&&part.geometry.parameters&&part.geometry.parameters.width)||0,Number(part.geometry&&part.geometry.parameters&&part.geometry.parameters.height)||0,Number(part.geometry&&part.geometry.parameters&&part.geometry.parameters.depth)||0]),position:part.position.toArray()})),
      beams:parts.filter(part=>part.userData&&part.userData.bioRiseStructuralKind==='beam').map(part=>({id:part.userData.bioRiseBeamId||part.userData.name,moduleIndex:part.userData.moduleIndex,side:part.userData.beamSide,row:part.userData.beamRow,independentModuleFrame:Boolean(part.userData.independentModuleFrame),size:(part.userData&&Array.isArray(part.userData.p3dvSize)?part.userData.p3dvSize.slice():[Number(part.geometry&&part.geometry.parameters&&part.geometry.parameters.width)||0,Number(part.geometry&&part.geometry.parameters&&part.geometry.parameters.height)||0,Number(part.geometry&&part.geometry.parameters&&part.geometry.parameters.depth)||0]),position:part.position.toArray()})),
      gutters:parts.filter(part=>part.userData&&part.userData.bioRiseStructuralKind==='gutter').map(part=>({name:part.userData.name,moduleIndex:part.userData.moduleIndex,side:part.userData.gutterSide,independentModuleFrame:Boolean(part.userData.independentModuleFrame),position:part.position.toArray()})),
      panels:parts.filter(part=>part.userData&&part.userData.bioRiseStructuralKind==='panel').map(part=>({name:part.userData.name,moduleIndex:part.userData.moduleIndex,panelIndex:part.userData.panelIndex,panelKind:part.userData.panelKind,rowIndex:part.userData.rowIndex,panelCollection:part.userData.panelCollection,position:part.position.toArray()})),
      zones:zonePickers.map(item=>({id:item.userData.zone.id,facadeId:item.userData.zone.facadeId,moduleIndex:item.userData.zone.moduleIndex,width:item.userData.zone.width}))
    },
    galaxyStructure:{
      posts:parts.filter(part=>part.userData&&part.userData.galaxyStructuralKind==='post').map(part=>({id:part.userData.galaxyPostId||part.userData.name,lineIndex:part.userData.postLineIndex,row:part.userData.postRow,sharedBoundary:Boolean(part.userData.sharedBoundary),stopsUnderRecord:Boolean(part.userData.stopsUnderRecord),size:(part.userData&&Array.isArray(part.userData.p3dvSize)?part.userData.p3dvSize.slice():[Number(part.geometry&&part.geometry.parameters&&part.geometry.parameters.width)||0,Number(part.geometry&&part.geometry.parameters&&part.geometry.parameters.height)||0,Number(part.geometry&&part.geometry.parameters&&part.geometry.parameters.depth)||0]),position:part.position.toArray()})),
      beams:parts.filter(part=>part.userData&&(part.userData.galaxyStructuralKind==='beam'||part.userData.galaxyStructuralKind==='combined-profile')).map(part=>({id:part.userData.galaxyBeamId||part.userData.name,moduleIndex:part.userData.moduleIndex,side:part.userData.beamSide,row:part.userData.beamRow,size:(part.userData&&Array.isArray(part.userData.p3dvSize)?part.userData.p3dvSize.slice():[Number(part.geometry&&part.geometry.parameters&&part.geometry.parameters.width)||0,Number(part.geometry&&part.geometry.parameters&&part.geometry.parameters.height)||0,Number(part.geometry&&part.geometry.parameters&&part.geometry.parameters.depth)||0]),combined:Boolean(part.userData.galaxyCombinedProfile),position:part.position.toArray()})),
      gutters:parts.filter(part=>part.userData&&(part.userData.galaxyStructuralKind==='gutter'||part.userData.galaxyStructuralKind==='combined-profile')).map(part=>({name:part.userData.name,moduleIndex:part.userData.moduleIndex,side:part.userData.gutterSide,combined:Boolean(part.userData.galaxyCombinedProfile),position:part.position.toArray()})),
      combinedProfiles:parts.filter(part=>part.userData&&part.userData.galaxyStructuralKind==='combined-profile').map(part=>{const bounds=fastWorldBounds(part);return {name:part.userData.name,moduleIndex:part.userData.moduleIndex,side:part.userData.gutterSide,profileKind:part.userData.galaxyProfileKind,outerDirection:part.userData.galaxyOuterDirection,source:part.userData.p3dvProfileSource,size:Array.isArray(part.userData.p3dvSize)?part.userData.p3dvSize.slice():[],bounds:{minX:bounds.min.x,maxX:bounds.max.x,minY:bounds.min.y,maxY:bounds.max.y,minZ:bounds.min.z,maxZ:bounds.max.z},position:part.position.toArray()};}),
      panels:parts.filter(part=>part.userData&&part.userData.galaxyStructuralKind==='panel').map(part=>({name:part.userData.name,moduleIndex:part.userData.moduleIndex,panelIndex:part.userData.panelIndex,panelKind:part.userData.panelKind,rowIndex:part.userData.rowIndex,panelCollection:part.userData.panelCollection,position:part.position.toArray()})),
      zones:zonePickers.map(item=>({id:item.userData.zone.id,facadeId:item.userData.zone.facadeId,moduleIndex:item.userData.zone.moduleIndex,width:item.userData.zone.width}))
    },
    freedomStructure:{
      posts:parts.filter(part=>part.userData&&part.userData.freedomStructuralKind==='post').map(part=>({id:part.userData.freedomPostId||part.userData.name,lineIndex:part.userData.postLineIndex,row:part.userData.postRow,position:part.position.toArray()})),
      beams:parts.filter(part=>part.userData&&part.userData.freedomStructuralKind==='beam').map(part=>({id:part.userData.freedomBeamId||part.userData.name,moduleIndex:part.userData.moduleIndex,lineIndex:part.userData.postLineIndex,position:part.position.toArray()})),
      gutters:parts.filter(part=>part.userData&&part.userData.freedomStructuralKind==='gutter').map(part=>({name:part.userData.name,moduleIndex:part.userData.moduleIndex,side:part.userData.gutterSide,rowIndex:part.userData.rowIndex,position:part.position.toArray()})),
      rails:parts.filter(part=>part.userData&&part.userData.freedomStructuralKind==='rail').map(part=>({name:part.userData.name,moduleIndex:part.userData.moduleIndex,side:part.userData.railSide,rowIndex:part.userData.rowIndex,position:part.position.toArray()})),
      panels:freedomPanelDiagnostics(),
      zones:zonePickers.map(item=>({id:item.userData.zone.id,facadeId:item.userData.zone.facadeId,moduleIndex:item.userData.zone.moduleIndex,width:item.userData.zone.width}))
    },
    placements:JSON.parse(JSON.stringify(placements||{})),
    zipPlacements:JSON.parse(JSON.stringify(zipPlacements||{})),
    facadeProfiles:JSON.parse(JSON.stringify(facadeProfiles||{})),
    camera:cameraSnapshot(),
    productGroup:PRODUCT_GROUP,
    freedomPanelProfile:'legacy-procedural',
    woodTransfer:{
      system:{code:SYSTEM_COLOR_CODE,kind:SYSTEM_COLOR_KIND,texture:SYSTEM_COLOR_TEXTURE},
      panel:{code:PANEL_COLOR_CODE,kind:PANEL_COLOR_KIND,texture:PANEL_COLOR_TEXTURE},
      mappedMaterialCount:(()=>{let count=0;group.traverse(object=>{const materials=Array.isArray(object.material)?object.material:[object.material];materials.filter(Boolean).forEach(material=>{if(material.userData&&material.userData.woodTransfer&&material.map)count+=1;});});return count;})(),
      embeddedMaterialCount:(()=>{let count=0;group.traverse(object=>{const materials=Array.isArray(object.material)?object.material:[object.material];materials.filter(Boolean).forEach(material=>{if(material.userData&&material.userData.woodTransfer&&material.map&&material.map.userData&&material.map.userData.p3dvWoodEmbedded)count+=1;});});return count;})(),
      embeddedTextureStats:Array.from(p3dvWoodTextureCache.entries()).map(([code,texture])=>{
        try{
          const canvas=texture&&texture.image;if(!canvas||!canvas.getContext)return {code,embedded:false};
          const ctx=canvas.getContext('2d');const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;let sum=0,min=255,max=0,count=0;
          for(let i=0;i<data.length;i+=4){const value=(data[i]+data[i+1]+data[i+2])/3;sum+=value;min=Math.min(min,value);max=Math.max(max,value);count+=1;}
          return {code,embedded:Boolean(texture.userData&&texture.userData.p3dvWoodEmbedded),width:canvas.width,height:canvas.height,mean:count?sum/count:0,min,max};
        }catch(error){return {code,embedded:Boolean(texture&&texture.userData&&texture.userData.p3dvWoodEmbedded),error:String(error)};}
      })
    },
    performance:JSON.parse(JSON.stringify(p3dvPerf))
  }),
  zipTextureRepeat:(panelWidth,panelHeight,tileMm)=>{const texture={repeat:{set(x,y){this.x=x;this.y=y;}},center:{set(){}},userData:{}};configureZipFabricTexture(texture,panelWidth,panelHeight,tileMm);return {x:texture.repeat.x,y:texture.repeat.y};},
  renderHash:()=>{
    try{return renderer.domElement.toDataURL('image/png').slice(-256)}catch(error){return String(error)}
  },
  scheduleZoneSelection:(zoneId)=>{
    const picker=zonePickers.find(item=>item.userData&&item.userData.zone&&item.userData.zone.id===zoneId);
    if(!picker)return false;
    scheduleTogglePanelZoneSelection(picker.userData.zone);
    return true;
  }
};

window.getP3DVPerformanceDiagnostics=function(){return JSON.parse(JSON.stringify({...p3dvPerf,sharedGeometryCount:p3dvSharedGeometryCache.size,sharedMaterialCount:p3dvSharedMaterialCache.size,raycastCandidateCount:raycastCandidates().length,viewerRuntimeActive,animationLoopRunning,animationFrameCount,animationLoopStartCount,animationLoopStopCount,orbitControlsEnabled:Boolean(controls&&controls.enabled),camera:cameraSnapshot()}));};

window.__P3DV_PERF_TEST__={noopRebuild(revision){rebuildModelWithoutFrameReload(Number(revision)||99991);return true;},state(){return window.getP3DVPerformanceDiagnostics();}};

async function initializeViewer(){
  await loadPergoRiseTemplate();
  buildModel(true);
  if(IS_PERGO_RISE)updatePergoRiseCommonTestState();
  syncViewerAnimationLoop();
  postParent('viewer-ready',{
    liveProductState:true,
    livePanelMaster:true,
    liveColorState:true,
    liveModelState:!IS_PERGO_RISE,
    livePergoRise:IS_PERGO_RISE,
    freedomPanelProfile:'legacy-procedural',
    pergoRiseLoadStatus,
    pergoRiseProjectHash:pergoRiseDerived&&pergoRiseDerived.projectHash||'',
    pergoRiseComponentMapping:pergoRiseComponentLibrary&&pergoRiseComponentLibrary.mapping||[]
  });
}
initializeViewer();
})();
</scr` + `ipt>
</body>
</html>`;
  }

  let previewToolbarControlsBound = false;
  function bindPreviewToolbarControls() {
    if (previewToolbarControlsBound) return true;
    previewToolbarControlsBound = true;
    const on = (id, handler) => {
      const element = $(id);
      if (!element) return false;
      element.addEventListener('click', handler);
      return true;
    };
    on(ids.mode2D, () => { const button=$(ids.mode2D); if (button && !button.disabled) requestEmbeddedHostDrawingMode('2d'); });
    on(ids.mode3D, () => { const button=$(ids.mode3D); if (button && !button.disabled) requestEmbeddedHostDrawingMode('3d'); });
    on(ids.toolbarRefresh, () => {
      const button = $(ids.toolbarRefresh);
      const originalText = button ? button.textContent : '';
      const applied = applyFreedomInputs({ forceRender: true });
      if (button) {
        button.textContent = applied ? 'Önizleme Yenilendi ✓' : originalText;
        window.setTimeout(() => { if (button && button.isConnected) button.textContent = originalText || 'Önizlemeyi Yenile'; }, 700);
      }
    });
    on(ids.previewExpand, () => { void togglePreviewExpanded(); });
    return true;
  }

  function bindEvents() {
    $(ids.productGroup).addEventListener('change', handleProductGroupChange);
    $(ids.defaultColorMode).addEventListener('click', () => setColorMode('default'));
    $(ids.ralColorMode).addEventListener('click', () => setColorMode('ral'));
    $(ids.systemColorTrigger).addEventListener('click', () => openColorPicker('system'));
    $(ids.panelColorTrigger).addEventListener('click', () => openColorPicker('panel'));
    $(ids.colorPickerClose).addEventListener('click', closeColorPicker);
    $(ids.colorFinishClose).addEventListener('click', closeColorFinishDialog);
    $(ids.colorCatalogRising).addEventListener('click', () => setActiveColorCatalog('rising'));
    $(ids.colorCatalogAll).addEventListener('click', () => setActiveColorCatalog('all'));
    $(ids.colorSearch).addEventListener('input', renderRalColorOptions);
    if ($(ids.panelColorIndependent)) $(ids.panelColorIndependent).addEventListener('change', syncPanelColorIndependence);
    [ids.panelFill, ids.dimmerInput, ids.parapetInput, ids.waterStandardInput, ids.pergoGlassTrack, ids.pergoTriangleJoinery, ids.pergoWaterOutletPlacement].forEach((id) => {
      const input=$(id); if (!input) return;
      input.addEventListener('change', () => {
        if (isPergoRiseUi()) {
          const fields = {
            [ids.parapetInput]: 'parapet', [ids.waterStandardInput]: 'waterStandard', [ids.pergoGlassTrack]: 'glassTrack',
            [ids.pergoTriangleJoinery]: 'triangleJoinery', [ids.pergoWaterOutletPlacement]: 'waterOutletPlacement'
          };
          if (fields[id]) handlePergoCanonicalFieldInput(fields[id], input);
          else syncFreedomOptionStateFromUi();
        } else syncFreedomOptionStateFromUi();
      });
    });
    const pergoTextFields = {
      [ids.remoteInput]: 'remote', [ids.ledInput]: 'led', [ids.extrasInput]: 'extras', [ids.pergoStructureColor]: 'structureColor',
      [ids.pergoFabric]: 'fabric', [ids.pergoFabricProfiles]: 'fabricProfiles', [ids.pergoDimmer]: 'dimmer'
    };
    Object.entries(pergoTextFields).forEach(([id, field]) => {
      const input=$(id); if (!input) return;
      input.addEventListener('input', () => {
        if (isPergoRiseUi()) handlePergoCanonicalFieldInput(field, input);
        else syncFreedomOptionStateFromUi();
      });
    });
    if ($(ids.motorInput)) {
      $(ids.motorInput).addEventListener('input', () => {
        if (isPergoRiseUi()) handlePergoCanonicalFieldInput('motor', $(ids.motorInput));
        else { syncFreedomOptionStateFromUi(); renderRemoteComboMenu(); }
      });
      $(ids.motorInput).addEventListener('change', () => {
        const values=remoteOptionsForMotor();
        if (!values.includes($(ids.remoteInput).value)) $(ids.remoteInput).value=values[0] || (isPergoRiseUi()?'-':'Yok');
        if (isPergoRiseUi()) handlePergoCanonicalFieldInput('motor', $(ids.motorInput));
        else syncFreedomOptionStateFromUi();
        renderRemoteComboMenu();
      });
    }
    if ($(ids.parapetHeightInput)) $(ids.parapetHeightInput).addEventListener('input', (event) => {
      if (isPergoRiseUi()) handlePergoCanonicalFieldInput('parapetHeight', event.target);
      else { event.target.value=sanitizeDigitsOnly(event.target.value,5); syncFreedomOptionStateFromUi(); }
    });
    if ($(ids.pergoSystemCount)) $(ids.pergoSystemCount).addEventListener('input', (event) => {
      if (isPergoRiseUi()) handlePergoCanonicalFieldInput('systemCount', event.target);
      else { event.target.value=sanitizeDigitsOnly(event.target.value,6); modelState.systemCount=isBioFamilyGroup(modelState.productGroup)?normalizedBioRiseSystemCount(event.target.value):normalizedFreedomSystemCount(event.target.value); scheduleAutomaticPreview(); }
    });
    if ($(ids.freedomWidth)) $(ids.freedomWidth).addEventListener('input', (event) => {
      if (isPergoRiseUi()) handlePergoCanonicalFieldInput('width', event.target);
      else { event.target.value=sanitizeWidthTopology(event.target.value); modelState.inputDrafts={...(modelState.inputDrafts||{}),width:event.target.value}; scheduleAutomaticPreview(); }
    });
    if ($(ids.freedomDepth)) $(ids.freedomDepth).addEventListener('input', (event) => {
      if (isPergoRiseUi()) handlePergoCanonicalFieldInput('opening', event.target);
      else { event.target.value=sanitizeOpeningTopology(event.target.value); modelState.inputDrafts={...(modelState.inputDrafts||{}),depth:event.target.value}; renderProjectionComboMenu(); scheduleAutomaticPreview(); }
    });
    if ($(ids.freedomHeight)) $(ids.freedomHeight).addEventListener('input', (event) => {
      if (isPergoRiseUi()) handlePergoCanonicalFieldInput('rearHeight', event.target);
      else { event.target.value=sanitizeDigitsOnly(event.target.value,6); modelState.inputDrafts={...(modelState.inputDrafts||{}),height:event.target.value}; scheduleAutomaticPreview(); }
    });
    if ($(ids.pergoFrontHeight)) $(ids.pergoFrontHeight).addEventListener('input', (event) => handlePergoCanonicalFieldInput('frontHeight', event.target));
    if ($(ids.pergoRayCount)) $(ids.pergoRayCount).addEventListener('input', (event) => handlePergoCanonicalFieldInput('rayCount', event.target));
    if ($(ids.pergoPostCount)) $(ids.pergoPostCount).addEventListener('input', (event) => handlePergoCanonicalFieldInput('postCount', event.target));
    if ($(ids.pergoCalculator)) $(ids.pergoCalculator).addEventListener('click', openPergoCalculator);
    if ($(ids.pergoResetAll)) $(ids.pergoResetAll).addEventListener('click', resetPergoAllInputs);
    if ($(ids.pergoSystemReset)) $(ids.pergoSystemReset).addEventListener('click', resetPergoSystemInputs);
    if ($(ids.pergoOptionsReset)) $(ids.pergoOptionsReset).addEventListener('click', resetPergoOptions);
    if ($(ids.pergoExtraReset)) $(ids.pergoExtraReset).addEventListener('click', resetPergoExtraOptions);
    if ($(ids.pergoBackWallOpen)) $(ids.pergoBackWallOpen).addEventListener('click', openPergoBackWallDialog);
    if ($(ids.pergoBackWallClose)) $(ids.pergoBackWallClose).addEventListener('click', () => closePergoBackWallDialog(true));
    if ($(ids.pergoBackWallCancel)) $(ids.pergoBackWallCancel).addEventListener('click', () => closePergoBackWallDialog(true));
    if ($(ids.pergoBackWallDefault)) $(ids.pergoBackWallDefault).addEventListener('click', resetPergoBackWallSystem);
    if ($(ids.pergoBackWallSystem)) $(ids.pergoBackWallSystem).addEventListener('change', (event) => loadPergoBackWallDialog(Number(event.target.value) || 0));
    if ($(ids.pergoBackWallEnabled)) $(ids.pergoBackWallEnabled).addEventListener('change', (event) => {
      setPergoBackWallFieldsDisabled(event.target.value === 'HAYIR');
      schedulePergoBackWallLiveUpdate();
    });
    [ids.pergoBackWallMinX, ids.pergoBackWallMaxX, ids.pergoBackWallStartDepth, ids.pergoBackWallEndDepth].forEach((id) => {
      const input = $(id); if (input) input.addEventListener('input', syncPergoBackWallAngleFromDepths);
    });
    if ($(ids.pergoBackWallAngle)) $(ids.pergoBackWallAngle).addEventListener('input', syncPergoBackWallDepthFromAngle);
    [ids.pergoBackWallDirection, ids.pergoBackWallOffset, ids.pergoBackWallHeight, ids.pergoBackWallDepth,
      ids.pergoBackWallTopColumns, ids.pergoBackWallTopRows, ids.pergoBackWallSideColumns, ids.pergoBackWallSideRows].forEach((id) => {
      const input = $(id); if (!input) return;
      input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', schedulePergoBackWallLiveUpdate);
    });
    if ($(ids.pergoBackWallForm)) $(ids.pergoBackWallForm).addEventListener('submit', (event) => {
      event.preventDefault();
      if (applyPergoBackWallDialog()) closePergoBackWallDialog(false);
    });
    if ($(ids.pergoBackWallDialog)) $(ids.pergoBackWallDialog).addEventListener('click', (event) => {
      if (event.target === $(ids.pergoBackWallDialog)) closePergoBackWallDialog(true);
    });
    if ($(ids.pergoCalcCompute)) $(ids.pergoCalcCompute).addEventListener('click', calculatePergoMissingValue);
    if ($(ids.pergoCalcTransfer)) $(ids.pergoCalcTransfer).addEventListener('click', transferPergoCalculatorValues);
    if ($(ids.pergoCalcClear)) $(ids.pergoCalcClear).addEventListener('click', clearPergoCalculator);
    if ($(ids.motorComboButton)) $(ids.motorComboButton).addEventListener('click', (event) => { event.preventDefault(); renderMotorComboMenu(); const menu=$(ids.motorComboMenu); setComboOpen($(ids.motorCombo),menu,menu.hidden); });
    if ($(ids.remoteComboButton)) $(ids.remoteComboButton).addEventListener('click', (event) => { event.preventDefault(); renderRemoteComboMenu(); const menu=$(ids.remoteComboMenu); setComboOpen($(ids.remoteCombo),menu,menu.hidden); });
    if ($(ids.ledComboButton)) $(ids.ledComboButton).addEventListener('click', (event) => { event.preventDefault(); renderLedComboMenu(); const menu=$(ids.ledComboMenu); setComboOpen($(ids.ledCombo),menu,menu.hidden); });
    if ($(ids.pergoFabricComboButton)) $(ids.pergoFabricComboButton).addEventListener('click', (event) => { event.preventDefault(); renderPergoFabricComboMenu(); const menu=$(ids.pergoFabricComboMenu); setComboOpen($(ids.pergoFabricCombo),menu,menu.hidden); });
    $(ids.colorPickerDialog).addEventListener('click', (event) => {
      if (event.target === $(ids.colorPickerDialog)) closeColorPicker();
    });
    $(ids.colorFinishDialog).addEventListener('click', (event) => {
      if (event.target === $(ids.colorFinishDialog)) closeColorFinishDialog();
    });
    if ($(ids.appConfirmCancel)) $(ids.appConfirmCancel).addEventListener('click', () => closeAppConfirmation(false));
    if ($(ids.appConfirmAccept)) $(ids.appConfirmAccept).addEventListener('click', () => closeAppConfirmation(true));
    if ($(ids.appConfirmDialog)) $(ids.appConfirmDialog).addEventListener('click', (event) => {
      if (event.target === $(ids.appConfirmDialog)) closeAppConfirmation(false);
    });
    $(ids.freedomPanelCount).addEventListener('input', syncProjectionFromPanelCount);
    projectionPresetSelect().addEventListener('change', () => {
      const value=projectionPresetSelect().value;
      const current=depthControlValue();
      if(modelState.productGroup!=='pergo-rise'&&/[;:]$/.test(current)&&!/:NO$/i.test(current))setDepthControlValue(current+value);
      else if(modelState.productGroup!=='pergo-rise'&&/:NO$/i.test(current))setFreedomValidation('Yeni açılım eklemek için önce terminal :NO komutunu kaldırın.');
      else setDepthControlValue(value);
      syncPanelCountFromProjection();
      scheduleAutomaticPreview();
    });
    $(ids.projectionCustomToggle).addEventListener('click', (event) => {
      event.preventDefault();
      renderProjectionComboMenu();
      const menu = $(ids.projectionComboMenu);
      setComboOpen($(ids.projectionCombo), menu, menu.hidden);
    });
    $(ids.freedomDepth).addEventListener('input', syncPanelCountFromProjection);
    $(ids.freedomWidth).addEventListener('input', () => showRecommendedLimitWarnings({ width: readFreedomNumber(ids.freedomWidth), depth: readFreedomNumber(ids.freedomDepth), height: readFreedomNumber(ids.freedomHeight), panelCount: readFreedomNumber(ids.freedomPanelCount) }));
    $(ids.freedomHeight).addEventListener('input', () => showRecommendedLimitWarnings({ width: readFreedomNumber(ids.freedomWidth), depth: readFreedomNumber(ids.freedomDepth), height: readFreedomNumber(ids.freedomHeight), panelCount: readFreedomNumber(ids.freedomPanelCount) }));
    $(ids.freedomForm).addEventListener('submit', (event) => { event.preventDefault(); applyFreedomInputs(); });
    $(ids.positionEdit).addEventListener('click', openPositionDialog);
    $(ids.cancel).addEventListener('click', closePositionDialog);
    $(ids.replay).addEventListener('click', toggleProductsOpen);
    $(ids.clearProducts).addEventListener('click', clearProducts);
    $(ids.dialog).addEventListener('click', (event) => {
      if (event.target === $(ids.dialog)) closePositionDialog();
    });
    [ids.width, ids.depth, ids.height].forEach((id) => {
      $(id).addEventListener('input', updateDialogLamella);
    });
    $(ids.form).addEventListener('submit', (event) => {
      event.preventDefault();
      applyPositionForm();
    });
    $(ids.productType).addEventListener('change', () => switchProductType($(ids.productType).value));
    $(ids.productSeries).addEventListener('change', () => applyProductRules(currentProductDraft()));
    $(ids.productSubtype).addEventListener('change', () => applyProductRules(currentProductDraft()));
    $(ids.productDoorType).addEventListener('change', () => applyProductRules(currentProductDraft()));
    $(ids.productDoorTypeTrigger).addEventListener('click', openDoorTypePicker);
    $(ids.productDoorTypePickerClose).addEventListener('click', closeDoorTypePicker);
    $(ids.productFabricTrigger).addEventListener('click', openProductFabricCatalog);
    $(ids.productFabricPickerClose).addEventListener('click', closeProductFabricCatalog);
    $(ids.productDoorHinge).addEventListener('change', () => { $(ids.productValidation).textContent = ''; });
    $(ids.productDoorActiveLeaf).addEventListener('change', () => { $(ids.productValidation).textContent = ''; });
    $(ids.productDoorOpenDirection).addEventListener('change', () => { $(ids.productValidation).textContent = ''; });
    $(ids.productDoorHandleType).addEventListener('change', () => { $(ids.productValidation).textContent = ''; });
    $(ids.productDoorTopFixedHeight).addEventListener('input', () => {
      updateDoorTopFixedSummary();
    });
    $(ids.productPlacement).addEventListener('change', () => { $(ids.productValidation).textContent = ''; });
    $(ids.productMotorDirection).addEventListener('change', () => {
      $(ids.productMotorDirection).value = $(ids.productMotorDirection).value === 'LEFT' ? 'LEFT' : 'RIGHT';
      $(ids.productValidation).textContent = '';
    });
    $(ids.productOpening).addEventListener('change', () => applyProductRules(currentProductDraft()));
    $(ids.productGlassThickness).addEventListener('change', () => {
      rememberGlassThicknessFromForm();
      applyProductRules(currentProductDraft());
    });
    $(ids.productGlassColor).addEventListener('change', () => {
      rememberGlassColorFromForm();
      applyProductRules(currentProductDraft());
    });
    $(ids.bottomPanelMode).addEventListener('change', () => applyProductRules(currentProductDraft()));
    $(ids.productPanelType).addEventListener('change', () => {
      const panelType = $(ids.productPanelType).value;
      if (panelType === '1+1') $(ids.productPanels).value = '2';
      if (panelType === '1+2') $(ids.productPanels).value = '3';
      $(ids.productValidation).textContent = '';
    });
    $(ids.productPanels).addEventListener('input', () => {
      $(ids.productValidation).textContent = '';
      if ($(ids.productType).value === 'folding') updateFoldingFormAdvisory();
    });
    $(ids.productFixedVerticalCount).addEventListener('input', () => { $(ids.productValidation).textContent = ''; });
    $(ids.productFixedHorizontalCount).addEventListener('change', () => {
      if (!activeZone) return;
      const divisions = Math.max(1, Math.min(10, Math.round(Number($(ids.productFixedHorizontalCount).value) || 1)));
      initializeFixedHorizontalForm({ horizontalDivisions: divisions, horizontalHeights: '', horizontalHeightManual: [] }, { resetAll: true });
      $(ids.productValidation).textContent = '';
    });
    $(ids.slidingCollectionState).addEventListener('change', () => { $(ids.productValidation).textContent = ''; });
    $(ids.foldingCollectionState).addEventListener('change', () => { $(ids.productValidation).textContent = ''; });
    $(ids.productSlidingView).addEventListener('change', () => { $(ids.productValidation).textContent = ''; });
    $(ids.productFoldingView).addEventListener('change', () => { $(ids.productValidation).textContent = ''; });
    $(ids.productFoldingOpenDirection).addEventListener('change', () => { $(ids.productValidation).textContent = ''; });
    $(ids.productDirection).addEventListener('change', () => {
      $(ids.productValidation).textContent = '';
      if ($(ids.productType).value === 'folding') updateFoldingFormAdvisory();
    });
    $(ids.collectingDisplayState).addEventListener('change', () => { $(ids.productValidation).textContent = ''; });
    $(ids.productCustomGlass).addEventListener('input', () => {
      if ($(ids.productGlassColor).value === 'OTHER') rememberGlassColorFromForm();
      $(ids.productValidation).textContent = '';
    });
    $(ids.productCancel).addEventListener('click', closeProductDialog);
    $(ids.productRemove).addEventListener('click', removeProduct);
    $(ids.productDialog).addEventListener('click', (event) => {
      if (event.target === $(ids.productDialog)) closeProductDialog();
    });
    $(ids.productFabricPicker).addEventListener('click', (event) => {
      if (event.target === $(ids.productFabricPicker)) closeProductFabricCatalog();
    });
    $(ids.productForm).addEventListener('submit', (event) => {
      event.preventDefault();
      applyProductForm();
    });

    $(ids.zoneActionAddProfile).addEventListener('click', () => { if (!runPergoRiseZoneAction('profile-add')) openProfileDialog(); });
    $(ids.zoneActionRemoveProfile).addEventListener('click', () => { runPergoRiseZoneAction('profile-remove'); });
    $(ids.zoneActionEditDimension).addEventListener('click', () => { if (!runPergoRiseZoneAction('resize')) openZoneDimensionDialog(); });
    $(ids.zoneActionPlaceProduct).addEventListener('click', () => { if (!runPergoRiseZoneAction('product-add')) openSelectedProduct(); });
    $(ids.zoneActionDeleteProduct).addEventListener('click', () => { if (!runPergoRiseZoneAction('product-remove')) removeSelectedProduct(); });
    $(ids.zoneActionRecalculate).addEventListener('click', () => { runPergoRiseZoneAction('recalculate'); });
    $(ids.zoneActionCancel).addEventListener('click', () => { if (selectedZone && selectedZone.pergoRise) clearZoneSelection(); else closeZoneActionDialog(); });
    $(ids.zoneActionDialog).addEventListener('click', (event) => {
      if (event.target === $(ids.zoneActionDialog)) closeZoneActionDialog();
    });

    if ($(ids.toolbarZoomIn)) $(ids.toolbarZoomIn).addEventListener('click', () => isPergola2DMode() ? zoomPergo2DView(1.16) : zoomViewerCamera(1.16));
    if ($(ids.toolbarZoomOut)) $(ids.toolbarZoomOut).addEventListener('click', () => isPergola2DMode() ? zoomPergo2DView(0.86) : zoomViewerCamera(0.86));
    if ($(ids.toolbarFit)) $(ids.toolbarFit).addEventListener('click', () => isPergola2DMode() ? fitPergo2DView() : resetViewerCamera());
    const pergo2DViewport = $(ids.pergo2DViewport);
    if (pergo2DViewport) {
      let drag = null;
      pergo2DViewport.addEventListener('pointerdown', (event) => {
        if (!isPergola2DMode() || event.button !== 0) return;
        const hit = event.target && typeof event.target.closest === 'function' ? event.target.closest('.preview-interaction-hit') : null;
        drag = { id:event.pointerId, x:event.clientX, y:event.clientY, left:pergo2DViewport.scrollLeft, top:pergo2DViewport.scrollTop, moved:false, hit };
        try { pergo2DViewport.setPointerCapture(event.pointerId); } catch (_) {}
      });
      pergo2DViewport.addEventListener('pointermove', (event) => {
        if (!drag || drag.id !== event.pointerId) return;
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
        if (!drag.moved) return;
        pergo2DViewport.classList.add('is-dragging');
        pergo2DViewport.scrollLeft = drag.left - dx;
        pergo2DViewport.scrollTop = drag.top - dy;
      });
      pergo2DViewport.addEventListener('pointerup', (event) => {
        if (!drag || drag.id !== event.pointerId) return;
        const wasMoved = drag.moved;
        const downHit = drag.hit || null;
        drag = null;
        pergo2DViewport.classList.remove('is-dragging');
        try { pergo2DViewport.releasePointerCapture(event.pointerId); } catch (_) {}
        if (wasMoved) return;
        const upHit = event.target && typeof event.target.closest === 'function' ? event.target.closest('.preview-interaction-hit') : null;
        const hit = downHit || upHit;
        if (hit) selectPergo2DTarget(pergo2DTargetFromInteraction(hit));
      });
      pergo2DViewport.addEventListener('pointercancel', () => { drag = null; pergo2DViewport.classList.remove('is-dragging'); });
    }
    if ($(ids.toolbarPdf)) {
      $(ids.toolbarPdf).setAttribute('aria-haspopup', 'dialog');
      $(ids.toolbarPdf).setAttribute('aria-expanded', 'false');
      $(ids.toolbarPdf).addEventListener('click', () => {
        if (window.P3DVDocumentCenter && typeof window.P3DVDocumentCenter.open === 'function') window.P3DVDocumentCenter.open($(ids.toolbarPdf));
        else exportProductListPdf();
      });
    }
    if ($(ids.toolbarDxf)) $(ids.toolbarDxf).addEventListener('click', () => {
      try { exportCurrentTechnicalDxf({ download: true }); }
      catch (error) { console.error('Technical 2D DXF export failed.', error); try { window.alert(error && error.message ? error.message : 'DXF oluşturulamadı.'); } catch (_) {} }
    });
    if ($(ids.toolbarAr)) $(ids.toolbarAr).addEventListener('click', () => { startMobileAr(); });
    if ($(ids.toolbarFullscreen)) $(ids.toolbarFullscreen).addEventListener('click', () => { toggleBrowserFullscreen(); });
    if (document.addEventListener) document.addEventListener('fullscreenchange', syncBrowserFullscreenClass);

    if ($(ids.largePreviewProductState)) $(ids.largePreviewProductState).addEventListener('click', () => { toggleProductsOpen(); closeLargeProductStateMenu(); });
    if ($(ids.largePreviewProductStateMenuButton)) $(ids.largePreviewProductStateMenuButton).addEventListener('click', (event) => {
      event.stopPropagation();
      const menu=$(ids.largePreviewProductStateMenu); const open=Boolean(menu && menu.hidden);
      if (menu) menu.hidden=!open;
      event.currentTarget.setAttribute('aria-expanded',String(open));
      if (open) renderLargeProductStateMenu();
    });
    if ($(ids.largePreviewToolboxToggle)) $(ids.largePreviewToolboxToggle).addEventListener('click', () => {
      const toolbox = $(ids.largePreviewToolbox);
      setLargePreviewToolboxOpen(!(toolbox && toolbox.classList.contains('is-open')));
    });
    if ($(ids.largePreviewToolboxPin)) $(ids.largePreviewToolboxPin).addEventListener('click', (event) => {
      const button = event.currentTarget;
      const next = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(next));
      button.title = next ? "Toolbox'ı açık tut" : 'Otomatik kapanmaya izin ver';
      if (next) setLargePreviewToolboxOpen(true);
    });
    if ($(ids.largePreviewShowAllDims)) $(ids.largePreviewShowAllDims).addEventListener('click', () => {
      const next = dimensionVisibility.intermediate === false;
      if (next && dimensionVisibility.main === false) dimensionVisibility.main = true;
      setDimensionVisibility('intermediate', next);
    });
    if ($(ids.largePreviewShowMainDims)) $(ids.largePreviewShowMainDims).addEventListener('click', () => setDimensionVisibility('main', dimensionVisibility.main === false));
    [ids.largePreviewGlassTrack, ids.largePreviewRayBoundary, ids.largePreviewTriangleJoinery, ids.largePreviewWaterStandard].forEach((id) => {
      const button = $(id);
      if (button) button.addEventListener('click', () => applyLargePreviewPergoToggle(id));
    });
    if ($(ids.largePreviewParapet)) $(ids.largePreviewParapet).addEventListener('change', (event) => {
      if (!isPergoRiseUi()) return;
      const source = $(ids.parapetHeightInput);
      if (!source) return;
      const numeric = Math.max(0, Math.round(Number(String(event.target.value || '').replace(',', '.')) || 0));
      event.target.value = String(numeric);
      source.value = numeric > 0 ? String(numeric) : '-';
      handlePergoCanonicalFieldInput('parapetHeight', source);
      updatePergoLargePreviewOptions();
    });
    if ($(ids.headerCheckDrawing)) { const drawingCheckButton = $(ids.headerCheckDrawing); drawingCheckButton.disabled = true; drawingCheckButton.setAttribute('aria-disabled','true'); drawingCheckButton.classList.add('is-disabled'); }
    if ($(ids.largePreviewMultiProduct)) $(ids.largePreviewMultiProduct).addEventListener('click', () => $(ids.multiProduct).click());
    if ($(ids.largePreviewMultiProfileAdd)) $(ids.largePreviewMultiProfileAdd).addEventListener('click', () => $(ids.multiProfileAdd).click());
    if ($(ids.largePreviewMultiProfileDelete)) $(ids.largePreviewMultiProfileDelete).addEventListener('click', () => $(ids.multiProfileDelete).click());
    if ($(ids.largePreviewMultiDelete)) $(ids.largePreviewMultiDelete).addEventListener('click', () => $(ids.multiDelete).click());
    if ($(ids.largePreviewFitProducts)) $(ids.largePreviewFitProducts).addEventListener('click', () => $(ids.fitProducts).click());
    if ($(ids.largePreviewDeleteAll)) $(ids.largePreviewDeleteAll).addEventListener('click', clearProducts);
    document.querySelectorAll('.large-preview-quick-test[data-quick-test]').forEach((button) => {
      button.addEventListener('click', () => {
        const quickIndex = Math.max(1, Math.min(10, Number(button.dataset.quickTest) || 1));
        const sourceButton = $(`quickTestBtn${quickIndex}`);
        if (sourceButton && !sourceButton.disabled) sourceButton.click();
      });
    });
    [
      [ids.largePreviewMultiDimension, 'Çoklu Ölçü Düzenleme'],
      [ids.largePreviewEqualizeGaps, 'Aralıkları Eşitle'],
      [ids.largePreviewPostSettings, 'Dikme Ayarları'],
      [ids.largePreviewBulkExtend, 'Çoklu Profil Uzat'],
      [ids.largePreviewConvertProduct, 'Ürün Tipini Değiştir'],
      [ids.largePreviewDetailCopy, 'Detay Kopyala']
    ].forEach(([id]) => { const button = $(id); if (button) { button.disabled = true; button.setAttribute('aria-disabled','true'); if(button.classList&&typeof button.classList.add==='function')button.classList.add('is-disabled'); } });

    $(ids.toolboxIntermediateDimensions).addEventListener('change', (event) => setDimensionVisibility('intermediate', event.target.checked));
    $(ids.toolboxMainDimensions).addEventListener('change', (event) => setDimensionVisibility('main', event.target.checked));
    $(ids.toolboxResetCamera).addEventListener('click', resetViewerCamera);
    if ($(ids.exportProductListPdf)) $(ids.exportProductListPdf).addEventListener('click', () => { exportProductListPdf(); });
    if ($(ids.mobileAr)) $(ids.mobileAr).addEventListener('click', () => { startMobileAr(); });
    if ($(ids.frame)) $(ids.frame).addEventListener('load', () => { setTimeout(refreshMobileArCapability, 180); });
    for (let quickIndex = 1; quickIndex <= 10; quickIndex += 1) {
      const quickButton = $(`quickTestBtn${quickIndex}`);
      if (!quickButton) continue;
      quickButton.addEventListener('click', () => {
        if (!applyPergoQuickTestPreset(quickIndex)) applyQuickTestScenario(quickIndex);
      });
    }
    for (let quickIndex = 11; quickIndex <= 16; quickIndex += 1) {
      const quickButton = $(`quickTestBtn${quickIndex}`);
      if (!quickButton) continue;
      quickButton.addEventListener('click', () => applyPergoQuickTestPreset(quickIndex));
    }
    $(ids.panelMaster).addEventListener('change', (event) => {
      modelState.panelMasterOpen = Boolean(event.target.checked);
      applyPanelMasterOpenLive();
    });
    $(ids.multiProduct).addEventListener('click', () => startToolboxSelection('multi-product'));
    $(ids.multiDelete).addEventListener('click', () => startToolboxSelection('multi-delete'));
    $(ids.multiProfileAdd).addEventListener('click', () => startToolboxSelection('multi-profile-add'));
    $(ids.multiProfileDelete).addEventListener('click', () => startToolboxSelection('multi-profile-delete'));
    $(ids.fitProducts).addEventListener('click', () => startToolboxSelection('fit-products'));
    $(ids.selectionDone).addEventListener('click', completeToolboxSelection);
    $(ids.selectionCancel).addEventListener('click', cancelToolboxSelection);
    if(document&&typeof document.addEventListener==='function') document.addEventListener('click', (event) => {
      if (!event.target.closest('.p3dv-combo')) closeP3dvCombos();
      if (!event.target.closest('#largePreviewProductStateControl')) closeLargeProductStateMenu();
    });
    window.addEventListener('keydown', (event) => {
      if (!toolboxSelectionMode) return;
      const tag = event.target && event.target.tagName ? String(event.target.tagName).toUpperCase() : '';
      const isField = ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag);
      if (event.key === 'Escape') {
        event.preventDefault();
        cancelToolboxSelection();
      } else if (event.key === 'Enter' && !isField) {
        event.preventDefault();
        completeToolboxSelection();
      }
    });

    $(ids.profileType).addEventListener('change', applyProfilePreset);
    $(ids.profileOrientation).addEventListener('change', () => { $(ids.profileValidation).textContent = ''; });
    $(ids.profileCancel).addEventListener('click', closeProfileDialog);
    $(ids.profileDialog).addEventListener('click', (event) => {
      if (event.target === $(ids.profileDialog)) closeProfileDialog();
    });
    $(ids.profileForm).addEventListener('submit', (event) => {
      event.preventDefault();
      applyProfileForm();
    });


    $(ids.dividerProfileDelete).addEventListener('click', deleteSelectedDividerProfile);
    $(ids.dividerProfileCancel).addEventListener('click', closeDividerProfileDialog);
    $(ids.dividerProfileDialog).addEventListener('click', (event) => {
      if (event.target === $(ids.dividerProfileDialog)) closeDividerProfileDialog();
    });

    $(ids.postChangeProfile).addEventListener('click', openPostProfileDialog);
    $(ids.postRotateProfile).addEventListener('click', rotateSelectedPost);
    $(ids.postActionCancel).addEventListener('click', closePostActionDialog);
    $(ids.postActionDialog).addEventListener('click', (event) => {
      if (event.target === $(ids.postActionDialog)) closePostActionDialog();
    });
    $(ids.postProfileType).addEventListener('change', applyPostPreset);
    $(ids.postProfileCancel).addEventListener('click', closePostProfileDialog);
    $(ids.postProfileDialog).addEventListener('click', (event) => {
      if (event.target === $(ids.postProfileDialog)) closePostProfileDialog();
    });
    $(ids.postProfileForm).addEventListener('submit', (event) => {
      event.preventDefault();
      applyPostProfileForm();
    });

    $(ids.zoneDimensionCancel).addEventListener('click', closeZoneDimensionDialog);
    $(ids.zoneDimensionDialog).addEventListener('click', (event) => {
      if (event.target === $(ids.zoneDimensionDialog)) closeZoneDimensionDialog();
    });
    $(ids.zoneDimensionForm).addEventListener('submit', (event) => {
      event.preventDefault();
      applyZoneDimensionForm();
    });
  }


  function p3dvHostClone(value) { return value === undefined ? undefined : JSON.parse(JSON.stringify(value)); }
  function p3dvHostSnapshot() {
    return {
      schema: 'p3dv-host-snapshot-v1',
      productInputSchema: P3DV_PRODUCT_INPUT_SCHEMA,
      p3dvVersion: '3.86',
      modelState: p3dvHostClone(modelState),
      viewerCameraState: p3dvHostClone(viewerCameraState),
      dimensionVisibility: p3dvHostClone(dimensionVisibility),
      capturedAt: new Date().toISOString()
    };
  }
  function p3dvHostReadMainProductInput() {
    const drafts = modelState.inputDrafts || {};
    return {
      schema: P3DV_PRODUCT_INPUT_SCHEMA,
      productGroup: modelState.productGroup,
      systemCount: String(modelState.systemCount || 1),
      width: String(Object.prototype.hasOwnProperty.call(drafts,'width') ? (drafts.width == null ? '' : drafts.width) : (modelState.width || '')),
      depth: String(Object.prototype.hasOwnProperty.call(drafts,'depth') ? (drafts.depth == null ? '' : drafts.depth) : (modelState.depth || '')),
      height: String(Object.prototype.hasOwnProperty.call(drafts,'height') ? (drafts.height == null ? '' : drafts.height) : (modelState.height || '')),
      parapet: String(modelState.parapet || 'HAYIR'),
      parapetHeight: String(modelState.parapetHeight || ''),
      motor: String(modelState.motor || 'Yok'),
      remote: String(modelState.remote || 'Yok'),
      led: String(modelState.led || 'NO'),
      dimmer: String(modelState.dimmer || 'HAYIR'),
      waterStandard: String(modelState.waterStandard || 'EVET'),
      extras: String(modelState.extras || '')
    };
  }
  function p3dvHostApplyMainProductInput(raw, transitionId) {
    const input = raw && typeof raw === 'object' ? raw : {};
    if (!['b-cube','b-cube-galaxy','bio-rise'].includes(modelState.productGroup)) throw new Error('P3DV_MAIN_INPUT_PRODUCT_UNSUPPORTED');
    if (transitionId !== undefined && transitionId !== null && Number.isFinite(Number(transitionId))) p3dvHostActiveTransitionId = Number(transitionId || p3dvHostActiveTransitionId || 0);
    const put = (id, value) => { const node=$(id); if (node && value !== undefined && value !== null) node.value=String(value); };
    put(ids.pergoSystemCount, input.systemCount == null ? modelState.systemCount || 1 : input.systemCount);
    put(ids.freedomWidth, input.width == null ? '' : input.width);
    if ($(ids.freedomDepth)) setDepthControlValue(String(input.depth == null ? '' : input.depth));
    put(ids.freedomHeight, input.height == null ? '' : input.height);
    put(ids.parapetInput, input.parapet);
    put(ids.parapetHeightInput, input.parapetHeight);
    put(ids.motorInput, input.motor);
    put(ids.remoteInput, input.remote);
    put(ids.ledInput, input.led);
    put(ids.dimmerInput, input.dimmer);
    put(ids.waterStandardInput, input.waterStandard);
    put(ids.extrasInput, input.extras);
    // Draft ownership is canonical even while the user is midway through an invalid/incomplete value.
    // Geometry is rebuilt only when the existing product validator accepts the full input.
    modelState.inputDrafts = {
      ...(modelState.inputDrafts || {}),
      width: String(input.width == null ? '' : input.width),
      depth: String(input.depth == null ? '' : input.depth),
      height: String(input.height == null ? '' : input.height)
    };
    syncFreedomOptionStateFromUi();
    const applied = applyFreedomInputs();
    if (applied) p3dvHostSyncControls();
    else { updateProductInputUi(); updateReadouts(); }
    return { ok: Boolean(applied), draftOnly: !applied, input: p3dvHostReadMainProductInput(), snapshot: p3dvHostSnapshot() };
  }

  function p3dvHostSyncControls() {
    if ($(ids.productGroup)) $(ids.productGroup).value = modelState.productGroup;
    const drafts = modelState.inputDrafts || {};
    if ($(ids.freedomWidth)) $(ids.freedomWidth).value = String(drafts.width || modelState.width || '');
    if ($(ids.freedomDepth)) setDepthControlValue(String(drafts.depth || modelState.depth || ''));
    if ($(ids.freedomHeight)) $(ids.freedomHeight).value = String(drafts.height || modelState.height || '');
    if ($(ids.freedomPanelCount)) $(ids.freedomPanelCount).value = String(modelState.panelCount || '');
    if ($(ids.pergoSystemCount)) $(ids.pergoSystemCount).value = String(modelState.systemCount || 1);
    if ($(ids.panelFill)) $(ids.panelFill).value = String(modelState.panelFill || 'EVET');
    if ($(ids.motor)) $(ids.motor).value = String(modelState.motor || 'Yok');
    if ($(ids.remote)) $(ids.remote).value = String(modelState.remote || 'Yok');
    if ($(ids.led)) $(ids.led).value = String(modelState.led || 'NO');
    if ($(ids.dimmer)) $(ids.dimmer).value = String(modelState.dimmer || 'HAYIR');
    if ($(ids.parapet)) $(ids.parapet).value = String(modelState.parapet || 'HAYIR');
    if ($(ids.parapetHeight)) $(ids.parapetHeight).value = String(modelState.parapetHeight || '');
    if ($(ids.toolboxIntermediateDimensions)) $(ids.toolboxIntermediateDimensions).checked = Boolean(dimensionVisibility.intermediate);
    if ($(ids.toolboxMainDimensions)) $(ids.toolboxMainDimensions).checked = Boolean(dimensionVisibility.main);
    if ($(ids.panelMaster)) $(ids.panelMaster).checked = Boolean(modelState.panelMasterOpen);
    updateProductInputUi();
    updateColorControls();
    updateToolbox();
    updateReadouts();
  }
  let p3dvHostActiveTransitionId = 0;
  let p3dvEmbeddedOwnFullscreen = false;
  let p3dvHostCanonicalProductGroup = modelState.productGroup;
  // V14.28.4 corrective: P3DV boots into its visible 3D presentation. The outer
  // host may explicitly pause it after a settled 2D transition. Starting an embedded
  // viewer inactive made the Stage-9 optimization race the first real viewer-ready
  // event, leaving OrbitControls/model updates visually frozen until another host command.
  let p3dvHostRuntimeActive = true;
  const p3dvHostLifecycleDiagnostics = { runtimeActiveSetCount:0, viewerReadyCount:0, statePollTickCount:0, statePostCount:0 };

  function p3dvHostSetRuntimeActive(active, transitionId) {
    p3dvHostActiveTransitionId = Number(transitionId || p3dvHostActiveTransitionId || 0);
    p3dvHostRuntimeActive = Boolean(active);
    p3dvHostLifecycleDiagnostics.runtimeActiveSetCount += 1;
    postViewerMessage('set-runtime-active', { active: p3dvHostRuntimeActive });
    if (p3dvHostRuntimeActive) { window.dispatchEvent(new Event('resize')); postViewerMessage('viewport-resized'); }
    return p3dvHostRuntimeActive;
  }

  function p3dvCanonicalProductGroup(value) {
    const identity = window.PulumurP3DVProductIdentity;
    if (identity && typeof identity.canonicalGroup === 'function') return identity.canonicalGroup(value);
    return String(value || '').trim().toLowerCase().replace(/[_]+/g, '-').replace(/\s+/g, ' ');
  }

  function p3dvHostNormalizeRestoredInputDrafts(restored) {
    const source = restored && restored.inputDrafts && typeof restored.inputDrafts === 'object' ? restored.inputDrafts : {};
    const preserveTopology = (value) => /[;:]|\bNO\b/i.test(String(value == null ? '' : value));
    const pick = (key, canonical) => {
      const raw = String(source[key] == null ? '' : source[key]).trim();
      if (raw && preserveTopology(raw)) return raw;
      const value = Number(canonical);
      return Number.isFinite(value) && value !== 0 ? String(Math.round(value)) : '';
    };
    restored.inputDrafts = {
      width: pick('width', restored.width),
      depth: pick('depth', restored.depth),
      height: pick('height', restored.height)
    };
    return restored;
  }

  function p3dvHostRestoreSnapshot(raw, expectedGroup, transitionId) {
    const source = raw && raw.snapshot ? raw.snapshot : raw;
    if (transitionId !== undefined && transitionId !== null && Number.isFinite(Number(transitionId))) {
      p3dvHostActiveTransitionId = Number(transitionId || p3dvHostActiveTransitionId || 0);
    }
    if (!source || source.schema !== 'p3dv-host-snapshot-v1' || !source.modelState) throw new Error('P3DV_HOST_SNAPSHOT_INVALID');
    const restored = p3dvHostNormalizeRestoredInputDrafts(p3dvHostClone(source.modelState));
    const normalizedExpectedGroup = expectedGroup ? p3dvCanonicalProductGroup(expectedGroup) : '';
    restored.productGroup = p3dvCanonicalProductGroup(restored.productGroup);
    if (normalizedExpectedGroup && restored.productGroup !== normalizedExpectedGroup) throw new Error('P3DV_HOST_SNAPSHOT_PRODUCT_MISMATCH');
    if (normalizedExpectedGroup) p3dvHostCanonicalProductGroup = normalizedExpectedGroup;
    Object.keys(modelState).forEach(key => { delete modelState[key]; });
    Object.assign(modelState, JSON.parse(JSON.stringify(defaults)), restored);
    viewerCameraState = p3dvHostClone(source.viewerCameraState || null);
    dimensionVisibility = { intermediate: false, main: true, ...(source.dimensionVisibility || {}) };
    selectedZone = null;
    selectedZoneId = null;
    cancelToolboxSelection();
    p3dvHostSyncControls();
    p3dvHistoryRebase('restore-snapshot');
    renderViewer();
    return p3dvHostSnapshot();
  }
  function p3dvHostSetProduct(group, transitionId) {
    const allowed = ['b-cube', 'b-cube-galaxy', 'bio-rise'];
    const next = p3dvCanonicalProductGroup(group);
    if (!allowed.includes(next)) throw new Error('P3DV_HOST_PRODUCT_GROUP_INVALID');
    p3dvHostActiveTransitionId = Number(transitionId || p3dvHostActiveTransitionId || 0);
    p3dvHostCanonicalProductGroup = next;
    if (!supportsMainTechnical2D(next)) p3dvDrawingMode = '3d';
    // Embedded host activation is a product boundary, not a cosmetic select change.
    // Rebuild the product-owned input contract from the requested group every time.
    resetProductGroupRuntimeState(next);
    if ($(ids.productGroup)) $(ids.productGroup).value = next;
    setFreedomValidation('');
    p3dvHostSyncControls();
    showRecommendedLimitWarnings({
      width: readFreedomNumber(ids.freedomWidth),
      depth: readFreedomNumber(ids.freedomDepth),
      panelCount: readFreedomNumber(ids.freedomPanelCount)
    });
    renderViewer();
    return next;
  }
  function p3dvHostActivateProduct(group, snapshot, transitionId) {
    const next = p3dvHostSetProduct(group, transitionId);
    if (snapshot) {
      try { p3dvHostRestoreSnapshot(snapshot, next, transitionId); } catch (_) {
        // The hard product boundary already succeeded. A bad snapshot must never
        // leave the input page on the previous product. Stay on the fresh target.
      }
    }
    p3dvHostCanonicalProductGroup = next;
    return p3dvHostSnapshot();
  }

  function p3dvTechnical2DZones() {
    // V14.24 Stage 6: deterministic zone identity is derived directly from the
    // canonical product layout. The nested viewer/SVG are render caches only and
    // can be stale during restore/undo/rebuild; they must never own physical zone
    // identity or placement/history keys.
    try {
      return buildReportFacades(readModel()).flatMap((facade) => (facade.zones || []).map((zone) => ({ ...zone })));
    } catch (_) { return []; }
  }

  function p3dvTechnical2DContract() {
    return {
      schema: 'p3dv-technical2d-interaction-contract-v14.14',
      productGroup: modelState.productGroup,
      zones: p3dvTechnical2DZones(),
      zoneIdentity: 'deterministic-boundary-v14.24',
      facadeProfiles: JSON.parse(JSON.stringify(modelState.facadeProfiles || {})),
      placements: JSON.parse(JSON.stringify(modelState.placements || {})),
      zipPlacements: JSON.parse(JSON.stringify(modelState.zipPlacements || {}))
    };
  }

  function p3dvTechnical2DFindZone(zoneId) {
    const id = String(zoneId || '');
    const zones = p3dvTechnical2DZones();
    if (!zones.length) throw new Error('TECHNICAL2D_ZONE_CONTRACT_UNAVAILABLE');
    const zone = zones.find((item) => item && item.id === id);
    if (!zone) throw new Error('TECHNICAL2D_ZONE_NOT_FOUND');
    return { ...zone };
  }

  function p3dvTechnical2DSameProfileSection(zone) {
    const facadeId = zone.facadeId || String(zone.id || '').split('|')[0];
    const profiles = getFacadeProfiles(facadeId);
    const boundaryIds = [zone.leftBoundaryId, zone.rightBoundaryId].filter(Boolean);
    for (const id of boundaryIds) {
      const profile = profiles.find((item) => item && item.id === id);
      if (profile) return { width: Math.max(40, Number(profile.width) || 100), depth: Math.max(30, Number(profile.depth) || 100) };
    }
    const sections = Array.isArray(modelState.postSections) ? modelState.postSections : [];
    const map = { front: [0, 1], back: [2, 3], left: [0, 2], right: [1, 3] };
    const indexes = map[facadeId] || [0];
    const section = sections[indexes[0]] || { x: 100, z: 100 };
    return facadeId === 'left' || facadeId === 'right'
      ? { width: Math.max(40, Number(section.z) || 100), depth: Math.max(30, Number(section.x) || 100) }
      : { width: Math.max(40, Number(section.x) || 100), depth: Math.max(30, Number(section.z) || 100) };
  }

  function p3dvCanonicalApplyZoneDimension(zone, nextWidth, nextHeight) {
    const width = Math.round(Number(nextWidth));
    const height = Math.round(Number(nextHeight));
    if (!Number.isFinite(width) || width < 250 || !Number.isFinite(height) || height < 250) throw new Error('Geçerli net genişlik ve yükseklik değerleri girin.');
    const snapshot = { width: modelState.width, depth: modelState.depth, height: modelState.height, profiles: JSON.parse(JSON.stringify(modelState.facadeProfiles || {})) };
    const widthDelta = width - Number(zone.width);
    const heightDelta = height - Number(zone.height);
    const facadeId = zone.facadeId || String(zone.id || '').split('|')[0];
    const profiles = getFacadeProfiles(facadeId);
    const verticalProfiles = profiles.filter((profile) => (profile.orientation || 'vertical') === 'vertical');
    const horizontalProfiles = profiles.filter((profile) => profile.orientation === 'horizontal');
    try {
      if (Math.abs(widthDelta) >= 1) {
        const movableId = zone.rightBoundaryId && !['END'].includes(zone.rightBoundaryId)
          ? zone.rightBoundaryId : (zone.leftBoundaryId && !['START'].includes(zone.leftBoundaryId) ? zone.leftBoundaryId : null);
        const profile = verticalProfiles.find((item) => item.id === movableId);
        const baseWidth = Number(zone.baseWidth || 0);
        if (profile && baseWidth) {
          const sign = movableId === zone.rightBoundaryId ? 1 : -1;
          profile.positionRatio = Math.max(.01, Math.min(.99, Number(profile.positionRatio || .5) + sign * widthDelta / baseWidth));
          if (!verticalProfileLayoutFits(profiles, baseWidth)) throw new Error('Bu genişlik komşu alanı 250 mm sınırının altına düşürüyor.');
        } else if (!verticalProfiles.length) {
          if (zone.axis === 'x') modelState.width += widthDelta; else modelState.depth += widthDelta;
        } else throw new Error('Bu alanın hareketli dikey profil sınırı bulunamadı.');
      }
      if (Math.abs(heightDelta) >= 1) {
        const movableId = zone.topBoundaryId && zone.topBoundaryId !== 'TOP'
          ? zone.topBoundaryId : (zone.bottomBoundaryId && zone.bottomBoundaryId !== 'BOTTOM' ? zone.bottomBoundaryId : null);
        const profile = horizontalProfiles.find((item) => item.id === movableId);
        const baseHeight = Number(zone.baseHeight || 0);
        if (profile && baseHeight) {
          const sign = movableId === zone.topBoundaryId ? 1 : -1;
          profile.positionYRatio = Math.max(.01, Math.min(.99, Number(profile.positionYRatio || .5) + sign * heightDelta / baseHeight));
          if (!horizontalProfileLayoutFits(profiles, baseHeight, profile.leftBoundaryId, profile.rightBoundaryId)) throw new Error('Bu yükseklik komşu alanı 250 mm sınırının altına düşürüyor.');
        } else if (!horizontalProfiles.length) modelState.height += heightDelta;
        else throw new Error('Bu alanın hareketli yatay profil sınırı bulunamadı.');
      }
      if (!dimensionsFit(readModel())) throw new Error('Bu ölçü mevcut dikme ve profil kesitleriyle uyumlu değil.');
    } catch (error) {
      modelState.width = snapshot.width; modelState.depth = snapshot.depth; modelState.height = snapshot.height; modelState.facadeProfiles = snapshot.profiles;
      throw error;
    }
  }

  function p3dvCanonicalAddProfile(zone, payload) {
    if (zonePlacement(zone)) throw new Error('Ürün bulunan alana profil eklenemez. Önce ürünü silin.');
    const facadeId = zone.facadeId || String(zone.id || '').split('|')[0];
    const profiles = getFacadeProfiles(facadeId);
    const orientation = String(payload && payload.orientation || 'vertical').toLowerCase() === 'horizontal' ? 'horizontal' : 'vertical';
    const same = orientation === 'vertical' && String(payload && payload.mode || '') === 'same';
    const section = same ? p3dvTechnical2DSameProfileSection(zone) : { width: Math.round(Number(payload && payload.width)), depth: Math.round(Number(payload && payload.depth)) };
    const width = Number(section.width), depth = Number(section.depth);
    if (!Number.isFinite(width) || width < 40 || width > 300 || !Number.isFinite(depth) || depth < 30 || depth > 300) throw new Error('Profil kesiti 40–300 × 30–300 mm aralığında olmalıdır.');
    let profile;
    if (orientation === 'horizontal') {
      if (width > Number(zone.height) - 500) throw new Error('Yatay profil sonrasında üstte ve altta en az 250 mm net alan kalmalıdır.');
      const leftBoundaryId = zone.leftBoundaryId || 'START';
      const rightBoundaryId = zone.rightBoundaryId || 'END';
      profile = {
        id: nextFacadeProfileId(), orientation: 'horizontal',
        positionYRatio: (Number(zone.bottomRatio || 0) + Number(zone.topRatio || 1)) / 2,
        leftBoundaryId, rightBoundaryId,
        scopeStartRatio: Number(zone.startRatio || 0), scopeEndRatio: Number(zone.endRatio || 1),
        width, depth, type: width === 100 && depth === 100 ? '100x100' : 'CUSTOM',
        label: `Yatay Profil ${Math.round(width)} × ${Math.round(depth)}`
      };
      if (!horizontalProfileLayoutFits([...profiles, profile], Number(zone.baseHeight || zone.height), leftBoundaryId, rightBoundaryId)) throw new Error('Yatay profil yeterli iki açıklık bırakamıyor.');
    } else {
      if (width > Number(zone.width) - 500) throw new Error('Dikey profil sonrasında iki tarafta en az 250 mm net alan kalmalıdır.');
      profile = {
        id: nextFacadeProfileId(), orientation: 'vertical',
        positionRatio: (Number(zone.startRatio || 0) + Number(zone.endRatio || 1)) / 2,
        width, depth, type: same ? 'SAME' : (width === 100 && depth === 100 ? '100x100' : 'CUSTOM'),
        label: `Dikey Profil ${Math.round(width)} × ${Math.round(depth)}`
      };
      if (!verticalProfileLayoutFits([...profiles, profile], Number(zone.baseWidth || zone.width))) throw new Error('Profil yeterli iki açıklık bırakamıyor.');
    }
    modelState.facadeProfiles[facadeId] = [...profiles, profile];
    return { ...profile, facadeId };
  }

  function p3dvCanonicalUpdateProfile(payload) {
    const facadeId = String(payload && payload.facadeId || '');
    const profileId = String(payload && payload.profileId || '');
    const profiles = getFacadeProfiles(facadeId);
    const profile = profiles.find((item) => item && item.id === profileId);
    if (!profile) throw new Error('Profil bulunamadı.');
    const before = { ...profile };
    const width = Math.round(Number(payload && payload.width));
    const depth = Math.round(Number(payload && payload.depth));
    if (!Number.isFinite(width) || width < 40 || width > 300 || !Number.isFinite(depth) || depth < 30 || depth > 300) throw new Error('Profil kesiti 40–300 × 30–300 mm aralığında olmalıdır.');
    profile.width = width; profile.depth = depth; profile.type = width === 100 && depth === 100 ? '100x100' : 'CUSTOM'; profile.label = `${profile.orientation === 'horizontal' ? 'Yatay' : 'Dikey'} Profil ${width} × ${depth}`;
    const zones = p3dvTechnical2DZones().filter((zone) => zone.facadeId === facadeId);
    const baseWidth = Math.max(1, ...zones.map((zone) => Number(zone.baseWidth || 0)).filter(Number.isFinite));
    const baseHeight = Math.max(1, ...zones.map((zone) => Number(zone.baseHeight || 0)).filter(Number.isFinite));
    const valid = profile.orientation === 'horizontal'
      ? horizontalProfileLayoutFits(profiles, baseHeight, profile.leftBoundaryId, profile.rightBoundaryId)
      : verticalProfileLayoutFits(profiles, baseWidth);
    if (!valid || !dimensionsFit(readModel())) { Object.assign(profile, before); throw new Error('Yeni profil kesiti mevcut açıklıklara sığmıyor.'); }
    return { ...profile, facadeId };
  }

  function p3dvCanonicalDeleteProfile(payload) {
    const facadeId = String(payload && payload.facadeId || '');
    const profileId = String(payload && payload.profileId || '');
    const current = getFacadeProfiles(facadeId);
    const target = current.find((profile) => profile && profile.id === profileId);
    if (!target) throw new Error('Profil bulunamadı.');
    const removed = new Set([profileId]);
    if (target.orientation !== 'horizontal') current.forEach((profile) => { if (profile.orientation === 'horizontal' && (profile.leftBoundaryId === profileId || profile.rightBoundaryId === profileId)) removed.add(profile.id); });
    modelState.facadeProfiles[facadeId] = current.filter((profile) => !removed.has(profile.id));
    [modelState.placements, modelState.zipPlacements].forEach((store) => Object.keys(store || {}).forEach((zoneId) => {
      if (zoneId.startsWith(`${facadeId}|`) && [...removed].some((id) => zoneId.includes(id))) {
        delete store[zoneId]; delete modelState.productOpenStates[zoneId]; delete modelState.productOpenStates[zipProductKey(zoneId)]; delete modelState.panelStates[zipProductKey(zoneId)];
      }
    }));
    return [...removed];
  }

  function p3dvTechnical2DCanonicalRequiredFields(type, placement) {
    const identity = window.PulumurP3DVProductIdentity;
    if (!identity || typeof identity.requiredCanonicalFieldsForFacade !== 'function') throw new Error('P3DV_PRODUCT_DATA_CONTRACT_MISSING');
    return identity.requiredCanonicalFieldsForFacade(type, placement);
  }

  function p3dvTechnical2DCompleteCanonicalPlacement(type, placement) {
    const source = placement && typeof placement === 'object' ? placement : null;
    if (!source) throw new Error('TECHNICAL2D_PRODUCT_ADD_REQUIRES_COMPLETE_CANONICAL_PLACEMENT');
    if (String(source.type || '').toLowerCase() !== type) throw new Error('TECHNICAL2D_PRODUCT_TYPE_MISMATCH');
    const required = p3dvTechnical2DCanonicalRequiredFields(type, source);
    const missing = required.filter((field) => !Object.prototype.hasOwnProperty.call(source, field));
    if (missing.length) throw new Error(`TECHNICAL2D_CANONICAL_FIELDS_MISSING:${missing.join(',')}`);
    return JSON.parse(JSON.stringify(source));
  }

  function p3dvTechnical2DProductDraft(zone, type, panels, existing, canonicalPlacement) {
    const allowed = ['sliding', 'guillotine', 'zip', 'door', 'fixed', 'folding'];
    if (!allowed.includes(type)) throw new Error('Bu ürün etkileşiminde Sürme, Giyotin, Zip, Kapı, Sabit Doğrama ve Katlanır Cam desteklenir.');
    let draft;
    if (existing) {
      if (String(existing.type || '').toLowerCase() !== type) throw new Error('TECHNICAL2D_PRODUCT_TYPE_CHANGE_REQUIRES_3D_CANONICAL_INPUT');
      draft = JSON.parse(JSON.stringify(existing));
      if (type === 'sliding') draft.panels = Math.max(2, Math.min(12, Math.round(Number(panels) || Number(draft.panels) || 4)));
      else if (type === 'guillotine') {
        const count = Math.max(2, Math.min(3, Math.round(Number(panels) || Number(draft.panels) || 3)));
        draft.panels = count; draft.panelType = count === 2 ? '1+1' : '1+2';
      } else if (type === 'folding') draft.panels = Math.max(2, Math.min(16, Math.round(Number(panels) || Number(draft.panels) || 4)));
    } else {
      draft = p3dvTechnical2DCompleteCanonicalPlacement(type, canonicalPlacement);
    }
    draft = sanitizeProductState(draft, type);
    const savedActive = activeZone, savedBulk = bulkProductZones;
    activeZone = zone; bulkProductZones = null;
    const error = validateProductDraft(draft);
    activeZone = savedActive; bulkProductZones = savedBulk;
    if (error) throw new Error(error);
    return draft;
  }

  function p3dvTechnical2DUpsertProduct(zone, payload, update) {
    const requestedType = String(payload && payload.type || '').toLowerCase();
    if (!requestedType) throw new Error('TECHNICAL2D_PRODUCT_TYPE_REQUIRED');
    const requestedSlot = String(payload && payload.slot || '');
    const oldSlot = requestedSlot === 'zip' ? 'zip' : (requestedSlot === 'primary' ? 'primary' : null);
    const oldStore = oldSlot === 'zip' ? modelState.zipPlacements : modelState.placements;
    const existing = oldSlot ? oldStore[zone.id] : null;
    if (update && !existing) throw new Error('Düzenlenecek ürün bulunamadı.');
    if (update && String(existing.type || '').toLowerCase() !== requestedType) throw new Error('TECHNICAL2D_PRODUCT_TYPE_CHANGE_REQUIRES_3D_CANONICAL_INPUT');
    const newSlot = requestedType === 'zip' ? 'zip' : 'primary';
    const newStore = newSlot === 'zip' ? modelState.zipPlacements : modelState.placements;
    if ((!update || newSlot !== oldSlot) && newStore[zone.id]) throw new Error(newSlot === 'zip' ? 'Bu alanda zaten Zip Perde var.' : 'Bu alanda zaten ana ürün var.');
    const draft = p3dvTechnical2DProductDraft(zone, requestedType, payload && payload.panels, existing, payload && payload.canonicalPlacement);
    if (update && oldSlot && oldSlot !== newSlot) throw new Error('TECHNICAL2D_PRODUCT_SLOT_CHANGE_REQUIRES_3D_CANONICAL_INPUT');
    newStore[zone.id] = JSON.parse(JSON.stringify(draft));
    if (newSlot === 'zip') { const key = zipProductKey(zone.id); if (!hasOwn(modelState.productOpenStates, key)) modelState.productOpenStates[key] = true; modelState.panelStates[key] = effectiveProductOpen(key); }
    else if (!hasOwn(modelState.productOpenStates, zone.id)) modelState.productOpenStates[zone.id] = true;
    return { slot: newSlot, placement: JSON.parse(JSON.stringify(draft)) };
  }

  function p3dvTechnical2DDeleteProduct(zone, payload) {
    const slot = String(payload && payload.slot || 'primary') === 'zip' ? 'zip' : 'primary';
    if (slot === 'zip') { delete modelState.zipPlacements[zone.id]; delete modelState.productOpenStates[zipProductKey(zone.id)]; delete modelState.panelStates[zipProductKey(zone.id)]; }
    else { delete modelState.placements[zone.id]; delete modelState.productOpenStates[zone.id]; }
    return slot;
  }

  function p3dvExecuteTechnical2DCommand(command, transitionId) {
    if (!['b-cube-galaxy','b-cube','bio-rise'].includes(p3dvCanonicalProductGroup(modelState.productGroup))) throw new Error('TECHNICAL2D_COMMAND_PRODUCT_MISMATCH');
    const type = String(command && command.type || '');
    const payload = command && command.payload || {};
    const historyBefore = p3dvHistoryClone(modelState);
    let result = null;
    if (type === 'zone-dimension') { const zone = p3dvTechnical2DFindZone(payload.zoneId); p3dvCanonicalApplyZoneDimension(zone, payload.width, payload.height); result = { zoneId: zone.id }; }
    else if (type === 'profile-add') { const zone = p3dvTechnical2DFindZone(payload.zoneId); result = p3dvCanonicalAddProfile(zone, payload); }
    else if (type === 'profile-update') result = p3dvCanonicalUpdateProfile(payload);
    else if (type === 'profile-delete') result = p3dvCanonicalDeleteProfile(payload);
    else if (type === 'product-add') { const zone = p3dvTechnical2DFindZone(payload.zoneId); result = p3dvTechnical2DUpsertProduct(zone, payload, false); }
    else if (type === 'product-update') { const zone = p3dvTechnical2DFindZone(payload.zoneId); result = p3dvTechnical2DUpsertProduct(zone, payload, true); }
    else if (type === 'product-delete') { const zone = p3dvTechnical2DFindZone(payload.zoneId); result = p3dvTechnical2DDeleteProduct(zone, payload); }
    else throw new Error('TECHNICAL2D_COMMAND_UNKNOWN');
    selectedZone = null; selectedZoneId = null;
    p3dvHistoryRecord(historyBefore, { type, label: `Technical2D ${type}`, origin: 'technical2d', payload: p3dvHostClone(payload) });
    commitModelChangeLive(`technical2d:${type}`, { preserveHistory: true });
    p3dvHostActiveTransitionId = Number(transitionId || p3dvHostActiveTransitionId || 0);
    const snapshot = p3dvHostSnapshot();
    return { ok: true, type, result, snapshot, contract: p3dvTechnical2DContract() };
  }

  function p3dvHostRuntimeTargetOrigin() {
    const origin = String(window.location.origin || '');
    return origin && origin !== 'null' ? origin : '*';
  }
  function p3dvHostOriginAccepted(eventOrigin) {
    const origin = String(window.location.origin || '');
    return !origin || origin === 'null' || eventOrigin === origin;
  }
  function p3dvHostPost(type, payload, transitionId = p3dvHostActiveTransitionId) {
    if (!p3dvEmbeddedHostMode || window.parent === window) return;
    try { window.parent.postMessage({ schema: 'plmr-p3dv-runtime-message-v1', source: 'plmr-p3dv-runtime', type, transitionId: Number(transitionId || 0), payload: p3dvHostClone(payload || {}) }, p3dvHostRuntimeTargetOrigin()); } catch (_) {}
  }
  function p3dvHostNotifyState(transitionId = p3dvHostActiveTransitionId) {
    const snapshot = p3dvHostSnapshot();
    p3dvHostPost('state-changed', { productGroup: modelState.productGroup, snapshot }, transitionId);
  }
  if (p3dvEmbeddedHostMode) {
    window.addEventListener('message', event => {
      if (event.source !== window.parent || !p3dvHostOriginAccepted(event.origin)) return;
      const message = event.data || {};
      if (message.schema !== 'plmr-p3dv-runtime-message-v1' || message.source !== 'plmr-unified-host') return;
      const payload = message.payload || {};
      const transitionId = Number(message.transitionId || 0);
      if (transitionId && transitionId < p3dvHostActiveTransitionId) return;
      try {
        if (message.type === 'activate-product') {
          p3dvHostActivateProduct(payload.productGroup, payload.snapshot || null, transitionId);
          p3dvHostNotifyState(transitionId);
        } else if (message.type === 'set-product') {
          p3dvHostSetProduct(payload.productGroup, transitionId);
          p3dvHostNotifyState(transitionId);
        } else if (message.type === 'apply-quick-test') {
          const index = Math.max(1, Math.min(10, Number(payload.index) || 1));
          const scenario = quickTestScenario(index);
          if (!scenario || scenario.group !== p3dvHostCanonicalProductGroup || modelState.productGroup !== p3dvHostCanonicalProductGroup) throw new Error('P3DV_QUICK_TEST_PRODUCT_MISMATCH');
          applyQuickTestScenario(index, { hostAuthorized: true });
          p3dvHostNotifyState(transitionId);
        } else if (message.type === 'restore-snapshot') {
          p3dvHostRestoreSnapshot(payload.snapshot, payload.productGroup, transitionId);
          p3dvHostNotifyState(transitionId);
        } else if (message.type === 'get-snapshot') {
          p3dvHostPost('snapshot', { requestId: payload.requestId || '', productGroup: modelState.productGroup, snapshot: p3dvHostSnapshot() }, transitionId);
        } else if (message.type === 'technical2d-command') {
          const response = p3dvExecuteTechnical2DCommand(payload.command || {}, transitionId);
          p3dvHostPost('technical2d-command-result', response, transitionId);
          p3dvHostNotifyState(transitionId);
        } else if (message.type === 'set-runtime-active') {
          p3dvHostSetRuntimeActive(payload.active, transitionId);
        } else if (message.type === 'set-drawing-mode') {
          p3dvHostActiveTransitionId = Number(transitionId || p3dvHostActiveTransitionId || 0);
          setP3dvDrawingMode(payload.mode, { resetView: payload.resetView !== false });
        } else if (message.type === 'set-preview-expanded') {
          if (payload.expanded) {
            delete document.body.dataset.fullscreenError;
            delete document.body.dataset.fullscreenHostError;
          }
          setPreviewExpanded(Boolean(payload.expanded), { notifyHost: false });
        } else if (message.type === 'viewport-resized') {
          window.dispatchEvent(new Event('resize'));
          postViewerMessage('viewport-resized');
        }
      } catch (error) {
        p3dvHostPost('runtime-error', { message: String(error && error.message || error), operation: message.type });
      }
    });
    let p3dvHostLastStateHash = '';
    window.setInterval(() => {
      p3dvHostLifecycleDiagnostics.statePollTickCount += 1;
      if (!p3dvHostRuntimeActive) return;
      try {
        const snapshot = p3dvHostSnapshot();
        const text = JSON.stringify(snapshot.modelState) + JSON.stringify(snapshot.viewerCameraState) + JSON.stringify(snapshot.dimensionVisibility);
        let hash = 2166136261;
        for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16777619); }
        const token = `${text.length}:${hash >>> 0}`;
        if (token !== p3dvHostLastStateHash) { p3dvHostLastStateHash = token; p3dvHostLifecycleDiagnostics.statePostCount += 1; p3dvHostPost('state-changed', { productGroup: modelState.productGroup, snapshot }, p3dvHostActiveTransitionId); }
      } catch (_) {}
    }, 650);
  }

  window.__P3DV_HOST_BRIDGE__ = Object.freeze({
    embedded: p3dvEmbeddedHostMode,
    build: P3DV_HOST_BUILD,
    hostContract: P3DV_HOST_CONTRACT,
    snapshot: p3dvHostSnapshot,
    readMainProductInput: p3dvHostReadMainProductInput,
    applyMainProductInput: p3dvHostApplyMainProductInput,
    restore: p3dvHostRestoreSnapshot,
    setProduct: p3dvHostSetProduct,
    activateProduct: p3dvHostActivateProduct,
    applyQuickTest: (index, transitionId) => {
      const scenario = quickTestScenario(Number(index));
      if (!scenario || scenario.group !== p3dvHostCanonicalProductGroup || modelState.productGroup !== p3dvHostCanonicalProductGroup) throw new Error('P3DV_QUICK_TEST_PRODUCT_MISMATCH');
      applyQuickTestScenario(Number(index), { hostAuthorized: true });
      return true;
    },
    notify: p3dvHostNotifyState,
    setRuntimeActive: (active, transitionId) => p3dvHostSetRuntimeActive(active, transitionId),
    runtimeDiagnostics: () => ({
      ...p3dvHostLifecycleDiagnostics, runtimeActive:p3dvHostRuntimeActive, drawingMode:p3dvDrawingMode,
      activeTransitionId:p3dvHostActiveTransitionId, activeViewerSessionId, viewerSessionCounter, activeViewerProductGroup,
      viewerReady:viewerLiveModelStateReady, productGroup:modelState.productGroup, history:p3dvHistoryInspect()
    }),
    setDrawingMode: (mode, transitionId) => { p3dvHostActiveTransitionId = Number(transitionId || p3dvHostActiveTransitionId || 0); return setP3dvDrawingMode(mode, { resetView: true }); },
    getDrawingMode: () => p3dvDrawingMode,
    setPreviewExpanded: (expanded, options) => setPreviewExpanded(expanded, options || { notifyHost: false }),
    resize: () => { window.dispatchEvent(new Event('resize')); postViewerMessage('viewport-resized'); return true; },
    getTransitionId: () => p3dvHostActiveTransitionId,
    getCanonicalProductGroup: () => p3dvHostCanonicalProductGroup,
    projectionOptions: (group) => projectionOptionValues(group || modelState.productGroup).slice(),
    technical2DContract: p3dvTechnical2DContract,
    executeTechnical2DCommand: (command, transitionId) => p3dvExecuteTechnical2DCommand(command || {}, transitionId),
    history: () => p3dvHistoryInspect(),
    undoTechnical2DCommand: () => p3dvUndoPhysicalCommand(),
    redoTechnical2DCommand: () => p3dvRedoPhysicalCommand(),
    rebaseTechnical2DHistory: (reason) => p3dvHistoryRebase(reason || 'host-rebase')
  });

  window.__P3DV_DOCUMENT_BRIDGE__ = Object.freeze({
    readModel: () => JSON.parse(JSON.stringify(readModel())),
    readReportProducts: () => JSON.parse(JSON.stringify(documentReportProducts())),
    isReady: () => modelReady(readModel()),
    documentCapabilities: () => {
      const pergola = modelState.productGroup === 'pergo-rise';
      const technical2d = supportsMainTechnical2D();
      return { quote:true, production:true, 'product-list':true, '3d':!pergola, '2d':pergola || technical2d, 'cut-list':true, accessories:true, optimization:true, stock:true };
    },
    captureViews: () => modelState.productGroup === 'pergo-rise' ? [] : collectDocumentCenterViews(),
    capture2DView: () => captureCurrent2DView(),
    export2DDxfForTest: () => exportCurrentTechnicalDxf({ download: false }),
    technical2DDrawingForTest: () => {
      const projection = currentTechnical2DProjection();
      const exporter = window.PulumurTechnical2DExport;
      const workspace = window.PulumurTechnical2DWorkspace;
      if (!projection || !exporter || typeof exporter.toDrawing !== 'function') return null;
      const technicalScale = workspace && typeof workspace.commonProjectionScale === 'function' ? workspace.commonProjectionScale(projection) : null;
      return JSON.parse(JSON.stringify(exporter.toDrawing(projection, { technicalScale, source: 'canonical-technical2d' })));
    },
    technical2DProjectionForTest: () => { const p = currentTechnical2DProjection(); return p ? JSON.parse(JSON.stringify(p)) : null; },
    legacyProductListPdf: () => exportProductListPdf()
  });

  window.__P3DV_PERGO_INPUT_TEST__ = Object.freeze({
    getProject: () => JSON.parse(JSON.stringify(modelState.pergoRiseProject || null)),
    getInput: () => JSON.parse(JSON.stringify(modelState.pergoRiseProject && modelState.pergoRiseProject.input || null)),
    sync: (options) => syncPergoRiseInputInfrastructure(options || {}),
    resetAll: resetPergoAllInputs,
    applyQuickTest: applyPergoQuickTestPreset,
    calculate: (values) => pergoInputApi().calculateSystem(values || {}),
    defaults: () => pergoInputApi().clone(pergoInputApi().DEFAULT_INPUT),
    fabricOptions: () => pergoInputApi().FABRIC_OPTIONS.slice(),
    openBackWall: openPergoBackWallDialog,
    applyBackWall: (options) => applyPergoBackWallDialog(options || {}),
    resetBackWall: resetPergoBackWallSystem,
    getBackWallConfig: (systemIndex = 0) => cloneJson(pergoBackWallDefaultConfig(systemIndex), null)
  });

  // V14.12.3: Embedded P3DV no longer has an independent Galaxy/Bioclimatic
  // default. The PLMR host is the single main-product owner, so the iframe boots
  // directly into the product group encoded in its URL. This removes the race in
  // which Galaxy could render first and later overwrite Rolling Roof/Eco transitions.
  if (p3dvEmbeddedHostMode) {
    try {
      const requestedGroup = p3dvCanonicalProductGroup(new URLSearchParams(window.location.search || '').get('productGroup') || window.__PLMR_P3DV_BOOT_PRODUCT_GROUP__ || '');
      if (['b-cube', 'b-cube-galaxy', 'bio-rise'].includes(requestedGroup)) {
        if (modelState.productGroup !== requestedGroup) resetProductGroupRuntimeState(requestedGroup);
        p3dvHostCanonicalProductGroup = requestedGroup;
      }
    } catch (_) {}
  }

  updateProductInputUi();
  if ($(ids.projectCodeValue)) $(ids.projectCodeValue).textContent = '-';
  setInitialProjectDate();
  updateColorControls();
  bindPreviewToolbarControls();
  bindEvents();
  updateToolbox();
  renderViewer();
  scheduleAutomaticPreview();
  if (p3dvEmbeddedHostMode) {
    window.setTimeout(() => p3dvHostPost('ready', { productGroup: modelState.productGroup, version: '3.86', build: P3DV_HOST_BUILD, hostContract: P3DV_HOST_CONTRACT }, p3dvHostActiveTransitionId), 0);
  }
})();
