window.PLMR_PRODUCT={
  "name": "PLMR_FixedPanel",
  "id": "PLMR_FIXED_PANEL",
  "label": "Fixed Panel",
  "type": "fixed-panel",
  "minWidth": 1,
  "minHeight": 1,
  "fields": [
    {
      "key": "panelType",
      "label": "Panel Tipi",
      "options": [
        [
          "SHEET",
          "Levha"
        ],
        [
          "SANDWICH_PANEL",
          "Sandwich Panel"
        ]
      ]
    },
    {
      "key": "faceMode",
      "label": "Yüzey Renkleri",
      "options": [
        [
          "SAME",
          "Çift Yüzey Aynı Renk"
        ],
        [
          "DIFFERENT",
          "Çift Yüzey Farklı Renk"
        ]
      ]
    },
    {
      "key": "insideColor",
      "label": "İç Yüzey Rengi",
      "kind": "text"
    }
  ],
  "defaults": {
    "type": "fixed-panel",
    "width": 1000,
    "height": 2400,
    "panelType": "SHEET",
    "faceMode": "SAME",
    "insideColor": "",
    "color": "#718396",
    "colorMode": "default",
    "finish": "MATTE",
    "open": false,
    "progress": 0,
    "defaultView": "OUTSIDE VIEW"
  },
  "settingsLayout": {
    "left": [
      "panelType",
      "faceMode"
    ],
    "right": [
      "insideColor"
    ]
  },
  "reference": {
    "prefix": "FPN",
    "file": "PLMR Fixed Panel / 10 mm",
    "sha256": "model-v1",
    "infoLayer": "Panel - Bilgi",
    "layerColors": {
      "Panel - Levha": 7,
      "Panel - Sandwich": 7,
      "Panel - Bilgi": 7
    }
  }
};
