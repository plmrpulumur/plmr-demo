"use strict";
var PLMRRoofSettings = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // domain/roofSettings.ts
  var roofSettings_exports = {};
  __export(roofSettings_exports, {
    ledChoices: () => ledChoices,
    ledValue: () => ledValue,
    roofGlassChoices: () => roofGlassChoices,
    roofOptionDefaults: () => roofOptionDefaults,
    roofSettingsFields: () => roofSettingsFields,
    selectedLed: () => selectedLed,
    validateRoofSettings: () => validateRoofSettings
  });

  // domain/glass.ts
  var glassColourChoices = [["TRANSPARENT", "\u015Eeffaf"], ["GREY", "F\xFCme"], ["BRONZE", "Bronz"], ["LOW-E GLASS", "Low-E"], ["OTHER", "Di\u011Fer"]];

  // domain/roofSettings.ts
  var ledChoices = [["DAYLIGHT", "G\xFCn\u0131\u015F\u0131\u011F\u0131"], ["RGB", "RGB"], ["RGB_WHITE", "RGB + White"], ["SPOT", "Spot"]];
  var roofGlassChoices = glassColourChoices;
  function roofSettingsFields(id) {
    const fields = [{ key: "systemColor", label: "Sistem Rengi" }];
    if (id === "justveranda") fields.push({ key: "verandaModel", label: "Model" }, { key: "rearHeight", label: "Arka H" }, { key: "glassType", label: "Cam Tipi" }, { key: "glassColor", label: "Cam Rengi" }, { key: "sandwichColor", label: "Sandwich Panel Rengi" });
    else if (id === "antero") fields.push({ key: "fabricColor", label: "Kuma\u015F Rengi" }, { key: "panelColor", label: "Kuma\u015F Profili Rengi" });
    else if (id === "cervin") fields.push({ key: "glassType", label: "Cam Tipi" }, { key: "glassColor", label: "Cam Rengi" }, { key: "sandwichColor", label: "Sandwich Panel Rengi" });
    else {
      fields.push({ key: "panelColor", label: "Panel Rengi" });
      if (id !== "jura") fields.push({ key: "panelFill", label: "Panel Dolgusu" });
    }
    fields.push({ key: "led", label: "Led Se\xE7imi" }, { key: "dimmer", label: "Dimmer" });
    return fields;
  }
  function selectedLed(value) {
    const raw = String(value ?? "").trim().toUpperCase();
    if (["YES", "EVET", "WARM WHITE", "DAYLIGHT", "G\xDCNI\u015EI\u011EI"].includes(raw)) return ["DAYLIGHT"];
    if (!raw || ["NO", "HAYIR", "NONE", "YOK", "-"].includes(raw)) return [];
    const result = [...new Set(raw.split(/[|;,]/).map((v) => v.trim()))];
    if (result.some((v) => !ledChoices.some(([key]) => key === v))) throw Error("LED se\xE7imi ge\xE7ersiz.");
    return result;
  }
  function ledValue(values) {
    return selectedLed(values.join("|")).join("|") || "NO";
  }
  function roofOptionDefaults(id) {
    return { systemColor: "Varsay\u0131lan", surface: "Varsay\u0131lan", panelColor: "Varsay\u0131lan", panelSurface: "Varsay\u0131lan", panelFill: "EVET", fabricColor: "#f2ead6", ...id === "justveranda" ? { verandaModel: "Lean", rearHeight: "3200" } : {}, glassType: id === "justveranda" ? "INSULATED" : "SINGLE", glassColor: "TRANSPARENT", glassColorOther: "", sandwichColor: "Varsay\u0131lan", sandwichSurface: "Mat", led: "NO", dimmer: "HAYIR" };
  }
  function validateRoofSettings(id, value) {
    selectedLed(value.led);
    if (value.dimmer !== void 0 && !["EVET", "HAYIR"].includes(String(value.dimmer))) throw Error("Dimmer se\xE7imi ge\xE7ersiz.");
    if (id === "antero" && value.fabricColor !== void 0 && !/^#[0-9a-f]{6}$/i.test(String(value.fabricColor))) throw Error("Kuma\u015F rengi ge\xE7ersiz.");
    if (id === "justveranda") {
      if (!["Lean", "Lean-Quad"].includes(String(value.verandaModel || "Lean"))) throw Error("Veranda modeli ge\xE7ersiz.");
      if (!(Number(value.rearHeight) > 0 && Number(value.rearHeight) <= 1e6)) throw Error("Arka y\xFCkseklik ge\xE7ersiz.");
    }
    if (id === "cervin" || id === "justveranda") {
      if (value.glassType !== void 0 && !(id === "justveranda" ? ["SINGLE", "INSULATED", "SANDWICH_PANEL"] : ["SINGLE", "INSULATED"]).includes(String(value.glassType))) throw Error("Cam tipi ge\xE7ersiz.");
      if (value.glassColor !== void 0 && !roofGlassChoices.some(([key]) => key === value.glassColor)) throw Error("Cam rengi ge\xE7ersiz.");
      if (value.glassColor === "OTHER" && !/^#[0-9a-f]{6}$/i.test(String(value.glassColorOther))) throw Error("Cam rengi i\xE7in #RRGGBB bi\xE7iminde renk girin.");
    }
  }
  return __toCommonJS(roofSettings_exports);
})();
