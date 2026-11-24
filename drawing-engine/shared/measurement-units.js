(function(root,factory){if(typeof module==="object"&&module.exports)factory(module);else{const mod={exports:{}};factory(mod);root.PLMRUnits=mod.exports;}})(typeof window!=="undefined"?window:globalThis,function(module){
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

// domain/positionUnits.ts
var positionUnits_exports = {};
__export(positionUnits_exports, {
  convertDimensionExpression: () => convertDimensionExpression,
  createDrawingView: () => createDrawingView,
  defaultPositionUnit: () => defaultPositionUnit,
  dimensionDecimals: () => dimensionDecimals,
  dimensionFromMm: () => dimensionFromMm,
  dimensionToMm: () => dimensionToMm,
  displayUnitsFor: () => displayUnitsFor,
  formatFeetAndInches: () => formatFeetAndInches,
  formatMeasurement: () => formatMeasurement,
  inputUnitFromDisplay: () => inputUnitFromDisplay,
  mmPerUnit: () => mmPerUnit,
  positionInputUnit: () => positionInputUnit,
  positionUnits: () => positionUnits,
  toggleDisplayUnit: () => toggleDisplayUnit,
  validDimensionDraft: () => validDimensionDraft,
  validPositionDimension: () => validPositionDimension
});
module.exports = __toCommonJS(positionUnits_exports);
var positionUnits = ["mm", "inch", "ft"];
var mmPerUnit = { mm: 1, inch: 25.4, ft: 304.8 };
var defaultPositionUnit = "inch";
function createDrawingView() {
  return {
    dimensionUnits: { mm: true, inch: false, ft: false },
    dimensions: { main: true, positions: true, total: true, roofs: true, intermediate: false, facades: true, byPosition: {} },
    presentation: { environment: "adaptive", floor: "none" }
  };
}
function toggleDisplayUnit(current, unit, mode) {
  const next = { ...current, [unit]: !current[unit] };
  if (mode === "2D" && !positionUnits.some((key) => next[key])) next[unit] = true;
  return next;
}
function displayUnitsFor(unit, single = false) {
  if (single && positionUnits.includes(unit)) return { mm: unit === "mm", inch: unit === "inch", ft: unit === "ft" };
  if (unit === "mm") return { mm: true, inch: false, ft: false };
  if (unit === "dual" || unit === "mm + inch") return { mm: true, inch: true, ft: false };
  return { mm: false, inch: true, ft: true };
}
var positionInputUnit = (unit, fallback = "mm") => unit === "in" ? "inch" : unit === "mm" || unit === "inch" || unit === "ft" ? unit : fallback === "inch" || fallback === "ft" ? fallback : "mm";
var inputUnitFromDisplay = (u) => u.mm ? "mm" : u.inch ? "inch" : u.ft ? "ft" : defaultPositionUnit;
var dimensionDecimals = (unit) => unit === "mm" ? 0 : 2;
function formatFeetAndInches(mm) {
  const hundredths = Math.round(Math.abs(mm) / mmPerUnit.inch * 100);
  const feet = Math.floor(hundredths / 1200);
  const inches = hundredths % 1200 / 100;
  return `${mm < 0 ? "-" : ""}${feet}' ${inches}"`;
}
function formatMeasurement(mm, units = { mm: true }, fallback = true) {
  const parts = positionUnits.flatMap((unit) => units[unit] ? [dimensionFromMm(String(mm), unit) + (unit === "inch" ? '"' : " " + unit)] : []);
  return parts.join(" - ") || (fallback ? Math.round(mm) + " mm" : "");
}
var numeric = (text) => {
  const s = text.trim().replace(",", ".");
  return /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s) ? Number(s) : NaN;
};
function dimensionFromMm(mm, unit, precision = dimensionDecimals(unit)) {
  if (!mm.trim()) return mm;
  const number = numeric(mm);
  return Number.isFinite(number) ? String(Number((number / mmPerUnit[unit]).toFixed(Math.min(dimensionDecimals(unit), precision)))) : mm;
}
function validDimensionDraft(text, unit) {
  const s = text.trim();
  if (unit === "mm") return /^\d*$/.test(s);
  return /^\d*(?:[.,]\d{0,2})?$/.test(s);
}
function dimensionToMm(text, unit) {
  if (!text.trim()) return "";
  const number = numeric(text);
  return Number.isFinite(number) ? String(Number((number * mmPerUnit[unit]).toFixed(6))) : text;
}
function validPositionDimension(text, max = 5e3) {
  const value = numeric(text);
  return Number.isFinite(value) && value > 0 && value <= max;
}
function convertDimensionExpression(value, convert) {
  return String(value ?? "").split(/([;:])/).map((token) => /^[;:]$|^NO$/i.test(token.trim()) ? token : convert(token)).join("");
}

});
