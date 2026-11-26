(function(root,factory){if(typeof module==="object"&&module.exports)factory(module);else{const m={exports:{}};factory(m);root.PLMRInfill=m.exports;}})(typeof window!=="undefined"?window:globalThis,function(module){
"use strict";
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

// domain/infill.ts
var infill_exports = {};
__export(infill_exports, {
  glassColourChoices: () => glassColourChoices,
  glassMaterialParameters: () => glassMaterialParameters,
  glassType: () => glassType,
  glassVisualColour: () => glassVisualColour,
  infillKind: () => infillKind,
  readInfills: () => readInfills,
  technicalThickness: () => technicalThickness,
  withInfill: () => withInfill
});
module.exports = __toCommonJS(infill_exports);

// domain/glass.ts
var glassColourChoices = [["TRANSPARENT", "\u015Eeffaf"], ["GREY", "F\xFCme"], ["BRONZE", "Bronz"], ["LOW-E GLASS", "Low-E"], ["OTHER", "Di\u011Fer"]];
function glassVisualColour(value, custom) {
  const key = String(value || "TRANSPARENT").toUpperCase();
  if (["GREY", "FUME", "SMOKED", "F\xDCME"].includes(key)) return "#6b7280";
  if (["BRONZE", "BRONZ"].includes(key)) return "#b68055";
  if (["LOW-E GLASS", "LOW-E"].includes(key)) return "#a9c9c4";
  if (["OTHER", "D\u0130\u011EER"].includes(key)) return /^#[0-9a-f]{6}$/i.test(String(custom)) ? String(custom) : "#93c5fd";
  return "#b7ddff";
}
function glassMaterialParameters(color, opacity = 0.34) {
  return { color, transparent: true, opacity, depthWrite: false, side: 2, toneMapped: false };
}

// domain/infill.ts
function glassType(value, thickness = "") {
  const v = String(value || "").toUpperCase();
  if (["SHEET", "LEVHA"].includes(v)) return "SHEET";
  if (["INSULATED", "INSULATED GLASS", "ISICAM", "YALITIMLI CAM"].includes(v)) return "INSULATED";
  if (["SINGLE", "SINGLE GLASS", "TEK CAM"].includes(v)) return "SINGLE";
  return /INSULATED|ISICAM|YALITIMLI/i.test(String(thickness)) ? "INSULATED" : "SINGLE";
}
function readInfills(value) {
  if (value == null || value === "") return {};
  if (typeof value !== "string" || value.length > 2e4) throw Error("B\xF6lme malzemesi ge\xE7ersiz.");
  let data;
  try {
    data = JSON.parse(value);
  } catch {
    throw Error("B\xF6lme malzemesi okunamad\u0131.");
  }
  if (!data || typeof data !== "object" || Array.isArray(data) || Object.keys(data).length > 1e3) throw Error("B\xF6lme malzemesi ge\xE7ersiz.");
  const out = {};
  for (const [key, v] of Object.entries(data)) {
    if (!key || key.length > 160 || ["__proto__", "prototype", "constructor"].includes(key) || !["GLASS", "SHEET"].includes(String(v))) throw Error("B\xF6lme malzemesi ge\xE7ersiz.");
    out[key] = v;
  }
  return out;
}
function infillKind(options, key) {
  return readInfills(options.panelInfills)[key] || (glassType(options.glassType, options.glassThickness) === "SHEET" ? "SHEET" : "GLASS");
}
function withInfill(value, key, kind) {
  const map = readInfills(value);
  map[key] = kind;
  return JSON.stringify(map);
}
function technicalThickness(value, old) {
  const type = glassType(value, old), prior = String(old || "8 MM");
  return type === "INSULATED" ? "INSULATED GLASS" : type === "SINGLE" && /INSULATED/i.test(prior) ? "8 MM" : prior;
}

});
