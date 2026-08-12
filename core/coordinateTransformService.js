(function (root) {
  'use strict';

  const SCHEMA = 'plmr-coordinate-transform-v1';
  const EPSILON = 1e-12;
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function finiteNumber(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`TRANSFORM_NON_FINITE:${label || 'value'}`);
    return number;
  }

  function matrix(value) {
    if (!Array.isArray(value) || value.length !== 6) throw new Error('TRANSFORM_MATRIX_INVALID');
    return Object.freeze(value.map((item, index) => finiteNumber(item, `matrix[${index}]`)));
  }

  const identity = () => matrix([1, 0, 0, 1, 0, 0]);
  const translation = (dx, dy) => matrix([1, 0, 0, 1, finiteNumber(dx, 'dx'), finiteNumber(dy, 'dy')]);
  const scale = (sx, sy, cx, cy) => {
    const x = finiteNumber(sx, 'sx'); const y = finiteNumber(sy == null ? sx : sy, 'sy');
    const ox = finiteNumber(cx == null ? 0 : cx, 'cx'); const oy = finiteNumber(cy == null ? 0 : cy, 'cy');
    return multiply(translation(ox, oy), multiply(matrix([x, 0, 0, y, 0, 0]), translation(-ox, -oy)));
  };
  const rotation = (degrees, cx, cy) => {
    const radians = finiteNumber(degrees, 'degrees') * Math.PI / 180;
    const c = Math.cos(radians); const s = Math.sin(radians);
    const ox = finiteNumber(cx == null ? 0 : cx, 'cx'); const oy = finiteNumber(cy == null ? 0 : cy, 'cy');
    return multiply(translation(ox, oy), multiply(matrix([c, s, -s, c, 0, 0]), translation(-ox, -oy)));
  };

  function multiply(left, right) {
    const a = matrix(left); const b = matrix(right);
    return matrix([
      a[0] * b[0] + a[2] * b[1],
      a[1] * b[0] + a[3] * b[1],
      a[0] * b[2] + a[2] * b[3],
      a[1] * b[2] + a[3] * b[3],
      a[0] * b[4] + a[2] * b[5] + a[4],
      a[1] * b[4] + a[3] * b[5] + a[5]
    ]);
  }

  function invert(value) {
    const m = matrix(value); const determinant = m[0] * m[3] - m[1] * m[2];
    if (Math.abs(determinant) <= EPSILON) throw new Error('TRANSFORM_MATRIX_SINGULAR');
    return matrix([
      m[3] / determinant, -m[1] / determinant,
      -m[2] / determinant, m[0] / determinant,
      (m[2] * m[5] - m[3] * m[4]) / determinant,
      (m[1] * m[4] - m[0] * m[5]) / determinant
    ]);
  }

  function normalizePoint(value, label) {
    if (Array.isArray(value) && value.length >= 2) return [finiteNumber(value[0], `${label || 'point'}.x`), finiteNumber(value[1], `${label || 'point'}.y`)];
    if (value && typeof value === 'object') return [finiteNumber(value.x, `${label || 'point'}.x`), finiteNumber(value.y, `${label || 'point'}.y`)];
    throw new Error(`TRANSFORM_POINT_INVALID:${label || 'point'}`);
  }

  function applyPoint(value, transform) {
    const point = normalizePoint(value); const m = matrix(transform);
    return Object.freeze([m[0] * point[0] + m[2] * point[1] + m[4], m[1] * point[0] + m[3] * point[1] + m[5]]);
  }

  function normalizeBounds(value, options) {
    if (!value) {
      if (options && options.allowNull) return null;
      throw new Error('TRANSFORM_BOUNDS_MISSING');
    }
    const x1 = finiteNumber(value.minX, 'bounds.minX'); const y1 = finiteNumber(value.minY, 'bounds.minY');
    const x2 = finiteNumber(value.maxX, 'bounds.maxX'); const y2 = finiteNumber(value.maxY, 'bounds.maxY');
    const minX = Math.min(x1, x2); const minY = Math.min(y1, y2); const maxX = Math.max(x1, x2); const maxY = Math.max(y1, y2);
    return Object.freeze({ minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY });
  }

  function boundsFromPoints(values) {
    const points = (values || []).map((point, index) => normalizePoint(point, `points[${index}]`));
    if (!points.length) return null;
    return normalizeBounds({ minX: Math.min(...points.map(p => p[0])), minY: Math.min(...points.map(p => p[1])), maxX: Math.max(...points.map(p => p[0])), maxY: Math.max(...points.map(p => p[1])) });
  }

  function unionBounds(values) {
    const list = (values || []).map(value => value ? normalizeBounds(value) : null).filter(Boolean);
    if (!list.length) return null;
    return normalizeBounds({ minX: Math.min(...list.map(item => item.minX)), minY: Math.min(...list.map(item => item.minY)), maxX: Math.max(...list.map(item => item.maxX)), maxY: Math.max(...list.map(item => item.maxY)) });
  }

  function transformBounds(value, transform) {
    const b = normalizeBounds(value); const m = matrix(transform);
    return boundsFromPoints([[b.minX, b.minY], [b.maxX, b.minY], [b.maxX, b.maxY], [b.minX, b.maxY]].map(point => applyPoint(point, m)));
  }

  function transformEntity(entity, transform) {
    const item = clone(entity || {}); const m = matrix(transform);
    function applyPair(xKey, yKey) {
      if (item[xKey] !== undefined || item[yKey] !== undefined) {
        const p = applyPoint([item[xKey] == null ? 0 : item[xKey], item[yKey] == null ? 0 : item[yKey]], m);
        item[xKey] = p[0]; item[yKey] = p[1];
      }
    }
    applyPair('x', 'y'); applyPair('x1', 'y1'); applyPair('x2', 'y2');
    if (Array.isArray(item.points)) item.points = item.points.map(point => Array.from(applyPoint(point, m)));
    if (Array.isArray(item.p1)) item.p1 = Array.from(applyPoint(item.p1, m));
    if (Array.isArray(item.p2)) item.p2 = Array.from(applyPoint(item.p2, m));
    if (Array.isArray(item.dimLine)) item.dimLine = Array.from(applyPoint(item.dimLine, m));
    if (Array.isArray(item.graphics)) item.graphics = item.graphics.map(graphic => transformEntity(graphic, m));
    if (item.bounds) item.bounds = transformBounds(item.bounds, m);
    return item;
  }

  const translateEntity = (entity, dx, dy) => transformEntity(entity, translation(dx, dy));
  const convertUnits = (value, from, to) => {
    const mm = Object.freeze({ MM: 1, CM: 10, M: 1000, IN: 25.4 });
    const source = mm[String(from || 'MM').toUpperCase()]; const target = mm[String(to || 'MM').toUpperCase()];
    if (!source || !target) throw new Error('TRANSFORM_UNIT_UNSUPPORTED');
    return finiteNumber(value, 'unitValue') * source / target;
  };

  const api = Object.freeze({ SCHEMA, identity, translation, rotation, scale, multiply, invert, applyPoint, normalizeBounds, boundsFromPoints, unionBounds, transformBounds, transformEntity, translateEntity, convertUnits, finiteNumber });
  root.PulumurCoordinateTransformService = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
