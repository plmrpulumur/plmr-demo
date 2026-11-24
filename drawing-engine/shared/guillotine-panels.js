(function(root,factory){if(typeof module==="object"&&module.exports)factory(module);else{const m={exports:{}};factory(m);root.PLMRGuillotinePanels=m.exports;}})(typeof window!=="undefined"?window:globalThis,function(module){
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

// domain/guillotinePanels.ts
var guillotinePanels_exports = {};
__export(guillotinePanels_exports, {
  cascadedCenters: () => cascadedCenters,
  panelLayout: () => panelLayout,
  panelMetrics: () => panelMetrics,
  panelStandard: () => panelStandard,
  subtypeOf: () => subtypeOf,
  uniformClosed: () => uniformClosed,
  uniformOpen: () => uniformOpen
});
module.exports = __toCommonJS(guillotinePanels_exports);
var panelStandard = Object.freeze({ postWidth: 60, motorBoxHeight: 150, baseHeight: 50, panelFrameFace: 50, targetPanelOverlap: 50 });
function panelMetrics(width, height, count) {
  const c = panelStandard, panelW = Math.max(40, width - c.postWidth * 2), clearH = Math.max(1, height - c.motorBoxHeight - c.baseHeight);
  const rawOuterH = (clearH + c.targetPanelOverlap * Math.max(0, count - 1)) / count;
  const glassH = Math.max(1, Math.round(rawOuterH - c.panelFrameFace * 2)), panelH = glassH + c.panelFrameFace * 2;
  return { panelW, panelH, glassW: Math.max(1, panelW - c.panelFrameFace * 2), glassH, actualOverlap: count > 1 ? (panelH * count - clearH) / (count - 1) : 0, clearH };
}
function subtypeOf(raw) {
  const type = String(raw || "STANDARD").toUpperCase();
  return type === "STANDARD" ? "DOWNWARD COLLECTING" : type;
}
function uniformClosed(height, panelHeight, count) {
  const first = panelStandard.baseHeight + panelHeight / 2, last = height - panelStandard.motorBoxHeight - panelHeight / 2;
  return count === 1 ? [first] : Array.from({ length: count }, (_, i) => first + i * (last - first) / (count - 1));
}
function uniformOpen(height, panelHeight, count, raw) {
  const type = subtypeOf(raw), closed = uniformClosed(height, panelHeight, count);
  if (type === "UPWARD COLLECTING") return closed.map(() => closed[count - 1]);
  if (type === "DOWNWARD COLLECTING" || type === "CLEANABLE") return closed.map(() => closed[0]);
  return closed;
}
function panelLayout(width, height, count, raw, mode, custom, version = "") {
  if (!Number.isFinite(height) || !Number.isInteger(count) || count < 2 || count > 8) throw Error("Panel geometrisi ge\xE7ersiz.");
  const metrics = panelMetrics(width, height, count), type = subtypeOf(raw), fixedIndex = type === "UPWARD COLLECTING" ? count - 1 : 0;
  const explicit = String(version) === "2" && ["Di\u011Fer", "OTHER"].includes(String(mode)), heights = Array(count).fill(metrics.panelH);
  if (explicit) {
    if (!/^\d+$/.test(String(custom))) throw Error("\xD6zel Sabit Panel Y\xFCksekli\u011Fi pozitif tam say\u0131 olmal\u0131.");
    const fixed = Number(custom), moving = (metrics.clearH + metrics.actualOverlap * (count - 1) - fixed) / (count - 1);
    if (fixed > metrics.clearH || Math.min(fixed, moving) <= 2 * panelStandard.panelFrameFace) throw Error("Sabit panel y\xFCksekli\u011Fi di\u011Fer panellerde ge\xE7erli cam a\xE7\u0131kl\u0131\u011F\u0131 b\u0131rakmal\u0131.");
    heights.fill(moving);
    heights[fixedIndex] = fixed;
  }
  let station = panelStandard.baseHeight;
  const closed = heights.map((h) => {
    const center = station + h / 2;
    station += h - metrics.actualOverlap;
    return center;
  });
  const floor = panelStandard.baseHeight, ceiling = height - panelStandard.motorBoxHeight;
  const open = heights.map((h, i) => {
    if (i === fixedIndex) return closed[i];
    if (type === "UPWARD COLLECTING") return Math.min(closed[fixedIndex] - heights[fixedIndex] / 2 + h / 2, ceiling - h / 2);
    if (type === "DOWNWARD COLLECTING" || type === "CLEANABLE") return Math.max(closed[fixedIndex] + heights[fixedIndex] / 2 - h / 2, floor + h / 2);
    return closed[i];
  });
  return { metrics, type, fixedIndex, heights, closed, open };
}
function cascadedCenters(closed, open, raw, progress) {
  const p = Math.max(0, Math.min(1, Number(progress) || 0)), n = closed.length, type = subtypeOf(raw);
  if (n <= 1 || p <= 0) return [...closed];
  if (p >= 1) return [...open];
  const out = [...closed], segment = 1 / Math.max(1, n - 1);
  if (type === "DOWNWARD COLLECTING" || type === "CLEANABLE") {
    for (let step = 1; step < n; step++) {
      const local = Math.max(0, Math.min(1, (p - (step - 1) * segment) / segment));
      if (local <= 0) break;
      const delta = (open[step] - out[step]) * local;
      for (let i = step; i < n; i++) out[i] = Math.max(open[i], out[i] + delta);
    }
  } else if (type === "UPWARD COLLECTING") {
    for (let phase = 0; phase < n - 1; phase++) {
      const leader = n - 2 - phase, local = Math.max(0, Math.min(1, (p - phase * segment) / segment));
      if (local <= 0) break;
      const delta = (open[leader] - out[leader]) * local;
      for (let i = 0; i <= leader; i++) out[i] = Math.min(open[i], out[i] + delta);
    }
  } else return closed.map((v, i) => v + (open[i] - v) * p);
  return out;
}

});
