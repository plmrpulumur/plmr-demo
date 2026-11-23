"use strict";
var PLMRCompanyDrawingLogo = (() => {
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

  // engines/companyDrawingLogo.ts
  var companyDrawingLogo_exports = {};
  __export(companyDrawingLogo_exports, {
    applyCompanyDrawingLogo: () => applyCompanyDrawingLogo
  });

  // domain/drawingLogo.ts
  var DRAWING_LOGO_MAX_BYTES = 512 * 1024;
  function validateDrawingLogo(value) {
    const logo = value;
    if (!logo || logo.schema !== "plmr-drawing-logo-v1" || typeof logo.name !== "string" || !logo.name.trim() || logo.name.length > 100 || !Array.isArray(logo.paths) || !logo.paths.length || logo.paths.length > 1e4) throw new Error("Ge\xE7ersiz 2D vekt\xF6r logo.");
    let count = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const path of logo.paths) {
      if (!Array.isArray(path.points) || path.points.length < (path.closed ? 3 : 2) || typeof path.closed !== "boolean" || !/^#[\da-f]{6}$/i.test(path.stroke) || !Number.isFinite(path.strokeWidth) || path.strokeWidth <= 0 || path.strokeWidth > 10) throw new Error("2D logo \xE7izgileri veya renkleri ge\xE7ersiz.");
      for (const point of path.points) {
        if (!Array.isArray(point) || point.length !== 2 || point.some((n) => !Number.isFinite(n) || Math.abs(n) > 1e6)) throw new Error("2D logo koordinatlar\u0131 ge\xE7ersiz.");
        count++;
        minX = Math.min(minX, point[0]);
        minY = Math.min(minY, point[1]);
        maxX = Math.max(maxX, point[0]);
        maxY = Math.max(maxY, point[1]);
      }
    }
    if (count > 4e4 || maxX - minX < 1e-3 || maxY - minY < 1e-3 || (maxX - minX) / (maxY - minY) > 30 || (maxY - minY) / (maxX - minX) > 10) throw new Error("2D logo boyutu veya \xE7izgi say\u0131s\u0131 standarda uygun de\u011Fil.");
  }

  // engines/companyDrawingLogo.ts
  function applyCompanyDrawingLogo(doc, logo) {
    if (!logo) return;
    validateDrawingLogo(logo);
    const insert = doc.entities.find((e) => e.type === "insert" && e.name === "PLMR - LOGO");
    if (!insert) throw new Error("2D logo alan\u0131 bulunamad\u0131.");
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of logo.paths) for (const [x, y] of p.points) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    const cell = doc.titleBlock.bounds, cellWidth = 1150, cellHeight = doc.titleBlock.layout.bottomH;
    const scale = Math.min(4.5, (cellWidth - 180) / (maxX - minX), (cellHeight - 180) / (maxY - minY));
    const placement = { x: cell.minX + cellWidth / 2 - (minX + maxX) / 2 * scale, y: cell.minY + cellHeight / 2 - (minY + maxY) / 2 * scale, scaleX: scale, scaleY: scale, rotation: 0 };
    Object.assign(insert, placement);
    const titleInsert = doc.titleBlock.entities.find((e) => e.type === "insert" && e.name === "PLMR - LOGO");
    if (titleInsert) Object.assign(titleInsert, placement);
    doc.blocks["PLMR - LOGO"] = { name: logo.name, entities: logo.paths.map((p) => ({ type: "polyline", layer: "PLMR", role: "company-logo", closed: p.closed, points: p.points.map((x) => [...x]), stroke: p.stroke, strokeWidth: Math.max(0.15, Math.min(0.76, p.strokeWidth * 4.75)), trueColor: parseInt(p.stroke.slice(1), 16), color: p.stroke.toLowerCase() === "#be1e2d" ? 1 : 7 })) };
    doc.metadata = { ...doc.metadata, companyDrawingLogo: logo.name };
  }
  return __toCommonJS(companyDrawingLogo_exports);
})();
