(function (global) {
  'use strict';

  const EPS = 1e-6;
  const PRODUCT = 'B-Cube Freedom';
  const MODULE = 'Free';
  const SCHEMA = 'bcube-freedom-project-v1';
  const AXIS_COLOR = '#808080';
  const POST_COLOR = '#ff00ff';
  const FRAME_COLOR = '#2563eb';

  function finiteNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function positiveNumber(value, fallback) {
    const n = finiteNumber(value, fallback);
    return n > 0 ? n : fallback;
  }

  function positiveInteger(value, fallback) {
    const n = Math.trunc(finiteNumber(value, fallback));
    return n > 0 ? n : fallback;
  }

  function nearlyEqual(a, b) {
    return Math.abs(Number(a) - Number(b)) <= EPS;
  }

  function coordinateSeries(start, end, divisions) {
    const count = positiveInteger(divisions, 1);
    const step = (end - start) / count;
    return Array.from({ length: count + 1 }, (_, index) => start + step * index);
  }

  function createGrid(config) {
    const totalWidth = positiveNumber(config && config.totalWidth, 4000);
    const totalOpening = positiveNumber(config && config.totalOpening, 4000);
    const verticalDivisions = positiveInteger(config && config.verticalDivisions, 2);
    const horizontalDivisions = positiveInteger(config && config.horizontalDivisions, 2);
    const offset = positiveNumber(config && config.offset, 1000);

    const xAxes = coordinateSeries(-totalWidth / 2, totalWidth / 2, verticalDivisions);
    const yAxes = coordinateSeries(totalOpening / 2, -totalOpening / 2, horizontalDivisions);
    const regions = [];

    for (let row = 0; row < horizontalDivisions; row += 1) {
      for (let col = 0; col < verticalDivisions; col += 1) {
        regions.push({
          id: `R${row + 1}C${col + 1}`,
          row,
          col,
          x1: xAxes[col],
          x2: xAxes[col + 1],
          yTop: yAxes[row],
          yBottom: yAxes[row + 1],
          type: 'unassigned',
          widthAxis: null
        });
      }
    }

    return {
      totalWidth,
      totalOpening,
      verticalDivisions,
      horizontalDivisions,
      offset,
      xAxes,
      yAxes,
      bounds: {
        left: xAxes[0],
        right: xAxes[xAxes.length - 1],
        top: yAxes[0],
        bottom: yAxes[yAxes.length - 1]
      },
      outerBounds: {
        left: xAxes[0] - offset,
        right: xAxes[xAxes.length - 1] + offset,
        top: yAxes[0] + offset,
        bottom: yAxes[yAxes.length - 1] - offset
      },
      regions
    };
  }

  function cloneGrid(grid) {
    if (!grid) return null;
    return {
      ...grid,
      xAxes: Array.isArray(grid.xAxes) ? grid.xAxes.slice() : [],
      yAxes: Array.isArray(grid.yAxes) ? grid.yAxes.slice() : [],
      bounds: { ...(grid.bounds || {}) },
      outerBounds: { ...(grid.outerBounds || {}) },
      regions: Array.isArray(grid.regions) ? grid.regions.map(region => ({ ...region })) : []
    };
  }

  function regionAt(grid, row, col) {
    if (!grid || row < 0 || col < 0 || row >= grid.horizontalDivisions || col >= grid.verticalDivisions) return null;
    return grid.regions[row * grid.verticalDivisions + col] || null;
  }

  function isRegionVisible(region) {
    return Boolean(region && region.type !== 'void');
  }

  function verticalSegmentVisible(grid, axisIndex, row) {
    const left = regionAt(grid, row, axisIndex - 1);
    const right = regionAt(grid, row, axisIndex);
    return isRegionVisible(left) || isRegionVisible(right);
  }

  function horizontalSegmentVisible(grid, axisIndex, col) {
    const above = regionAt(grid, axisIndex - 1, col);
    const below = regionAt(grid, axisIndex, col);
    return isRegionVisible(above) || isRegionVisible(below);
  }

  function visibleAxisSegments(grid) {
    if (!grid) return [];
    const segments = [];
    for (let ix = 0; ix < grid.xAxes.length; ix += 1) {
      let axisVisible = false;
      for (let row = 0; row < grid.horizontalDivisions; row += 1) {
        if (!verticalSegmentVisible(grid, ix, row)) continue;
        axisVisible = true;
        segments.push({
          id: `VX${ix}R${row}`,
          orientation: 'vertical',
          x1: grid.xAxes[ix],
          y1: grid.yAxes[row],
          x2: grid.xAxes[ix],
          y2: grid.yAxes[row + 1],
          ix,
          row
        });
      }
      if (axisVisible) {
        segments.push({ id: `VX${ix}TOP`, orientation: 'vertical', x1: grid.xAxes[ix], y1: grid.outerBounds.top, x2: grid.xAxes[ix], y2: grid.bounds.top, ix, extension: 'top' });
        segments.push({ id: `VX${ix}BOTTOM`, orientation: 'vertical', x1: grid.xAxes[ix], y1: grid.bounds.bottom, x2: grid.xAxes[ix], y2: grid.outerBounds.bottom, ix, extension: 'bottom' });
      }
    }
    for (let iy = 0; iy < grid.yAxes.length; iy += 1) {
      let axisVisible = false;
      for (let col = 0; col < grid.verticalDivisions; col += 1) {
        if (!horizontalSegmentVisible(grid, iy, col)) continue;
        axisVisible = true;
        segments.push({
          id: `HY${iy}C${col}`,
          orientation: 'horizontal',
          x1: grid.xAxes[col],
          y1: grid.yAxes[iy],
          x2: grid.xAxes[col + 1],
          y2: grid.yAxes[iy],
          iy,
          col
        });
      }
      if (axisVisible) {
        segments.push({ id: `HY${iy}LEFT`, orientation: 'horizontal', x1: grid.outerBounds.left, y1: grid.yAxes[iy], x2: grid.bounds.left, y2: grid.yAxes[iy], iy, extension: 'left' });
        segments.push({ id: `HY${iy}RIGHT`, orientation: 'horizontal', x1: grid.bounds.right, y1: grid.yAxes[iy], x2: grid.outerBounds.right, y2: grid.yAxes[iy], iy, extension: 'right' });
      }
    }
    return segments;
  }

  function adjacentRegionsForPoint(grid, ix, iy) {
    return [
      regionAt(grid, iy - 1, ix - 1),
      regionAt(grid, iy - 1, ix),
      regionAt(grid, iy, ix - 1),
      regionAt(grid, iy, ix)
    ].filter(Boolean);
  }

  function selectablePoints(grid) {
    if (!grid) return [];
    const points = [];
    for (let iy = 0; iy < grid.yAxes.length; iy += 1) {
      for (let ix = 0; ix < grid.xAxes.length; ix += 1) {
        const adjacent = adjacentRegionsForPoint(grid, ix, iy);
        if (!adjacent.some(isRegionVisible)) continue;
        points.push({
          id: `P${ix}_${iy}`,
          ix,
          iy,
          x: grid.xAxes[ix],
          y: grid.yAxes[iy]
        });
      }
    }
    return points;
  }

  function pointOnRange(value, a, b) {
    const min = Math.min(a, b) - EPS;
    const max = Math.max(a, b) + EPS;
    return value >= min && value <= max;
  }

  function wallCandidatesForPoint(grid, point) {
    if (!grid || !point) return [];
    const candidates = [];
    const seen = new Set();
    const walls = grid.regions.filter(region => region.type === 'wall');

    function add(region, side, orientation, coordinate, start, end) {
      const low = Math.min(start, end);
      const high = Math.max(start, end);
      const key = `${orientation}:${coordinate.toFixed(6)}:${low.toFixed(6)}:${high.toFixed(6)}`;
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push({
        id: `${region.id}:${side}`,
        regionId: region.id,
        side,
        orientation,
        coordinate,
        start: low,
        end: high,
        label: `${region.id} · ${sideLabel(side)}`
      });
    }

    walls.forEach(region => {
      if (nearlyEqual(point.x, region.x1) && pointOnRange(point.y, region.yBottom, region.yTop)) {
        add(region, 'left', 'vertical', region.x1, region.yBottom, region.yTop);
      }
      if (nearlyEqual(point.x, region.x2) && pointOnRange(point.y, region.yBottom, region.yTop)) {
        add(region, 'right', 'vertical', region.x2, region.yBottom, region.yTop);
      }
      if (nearlyEqual(point.y, region.yTop) && pointOnRange(point.x, region.x1, region.x2)) {
        add(region, 'top', 'horizontal', region.yTop, region.x1, region.x2);
      }
      if (nearlyEqual(point.y, region.yBottom) && pointOnRange(point.x, region.x1, region.x2)) {
        add(region, 'bottom', 'horizontal', region.yBottom, region.x1, region.x2);
      }
    });

    return candidates;
  }

  function sideLabel(side) {
    return ({ left: 'Sol duvar yüzü', right: 'Sağ duvar yüzü', top: 'Üst duvar yüzü', bottom: 'Alt duvar yüzü' })[side] || side;
  }

  function postDimensions(profile) {
    return String(profile || '').toUpperCase() === '220X100'
      ? { x: 220, y: 100 }
      : { x: 100, y: 220 };
  }

  function supportAllowsOrientation(support, orientation) {
    if (!support) return false;
    if (support.type === 'post') return true;
    if (support.type !== 'wallConnection' || !support.wallRef) return false;
    if (orientation === 'horizontal') return support.wallRef.orientation === 'vertical';
    if (orientation === 'vertical') return support.wallRef.orientation === 'horizontal';
    return false;
  }

  function supportOffset(support, orientation) {
    if (!support || support.type !== 'post') return 0;
    const dimensions = postDimensions(support.profile);
    return orientation === 'horizontal' ? dimensions.x / 2 : dimensions.y / 2;
  }

  function horizontalPathVisible(grid, iy, startIx, endIx) {
    for (let col = startIx; col < endIx; col += 1) {
      if (!horizontalSegmentVisible(grid, iy, col)) return false;
    }
    return true;
  }

  function verticalPathVisible(grid, ix, startIy, endIy) {
    for (let row = startIy; row < endIy; row += 1) {
      if (!verticalSegmentVisible(grid, ix, row)) return false;
    }
    return true;
  }

  function buildFrames(grid, supports) {
    if (!grid) return [];
    const anchors = Array.isArray(supports) ? supports.slice() : [];
    const frames = [];

    for (let iy = 0; iy < grid.yAxes.length; iy += 1) {
      const rowAnchors = anchors
        .filter(item => item.iy === iy && supportAllowsOrientation(item, 'horizontal'))
        .sort((a, b) => a.ix - b.ix);
      for (let index = 0; index < rowAnchors.length - 1; index += 1) {
        const left = rowAnchors[index];
        const right = rowAnchors[index + 1];
        if (left.ix === right.ix || !horizontalPathVisible(grid, iy, left.ix, right.ix)) continue;
        const x1 = grid.xAxes[left.ix] + supportOffset(left, 'horizontal');
        const x2 = grid.xAxes[right.ix] - supportOffset(right, 'horizontal');
        if (x2 - x1 <= EPS) continue;
        frames.push({
          id: `FH:${left.id}:${right.id}`,
          orientation: 'horizontal',
          x1,
          x2,
          y1: grid.yAxes[iy] + 50,
          y2: grid.yAxes[iy] - 50,
          thickness: 100,
          startSupportId: left.id,
          endSupportId: right.id
        });
      }
    }

    for (let ix = 0; ix < grid.xAxes.length; ix += 1) {
      const columnAnchors = anchors
        .filter(item => item.ix === ix && supportAllowsOrientation(item, 'vertical'))
        .sort((a, b) => a.iy - b.iy);
      for (let index = 0; index < columnAnchors.length - 1; index += 1) {
        const top = columnAnchors[index];
        const bottom = columnAnchors[index + 1];
        if (top.iy === bottom.iy || !verticalPathVisible(grid, ix, top.iy, bottom.iy)) continue;
        const yTop = grid.yAxes[top.iy] - supportOffset(top, 'vertical');
        const yBottom = grid.yAxes[bottom.iy] + supportOffset(bottom, 'vertical');
        if (yTop - yBottom <= EPS) continue;
        frames.push({
          id: `FV:${top.id}:${bottom.id}`,
          orientation: 'vertical',
          x1: grid.xAxes[ix] - 50,
          x2: grid.xAxes[ix] + 50,
          y1: yTop,
          y2: yBottom,
          thickness: 100,
          startSupportId: top.id,
          endSupportId: bottom.id
        });
      }
    }

    return frames;
  }

  function normalizeImportedState(raw) {
    if (!raw || typeof raw !== 'object') throw new Error('Geçersiz Freedom proje dosyası.');
    if (raw.schema !== SCHEMA) throw new Error('Bu dosya B-Cube Freedom Free modülüne ait değil.');
    const next = JSON.parse(JSON.stringify(raw));
    next.product = PRODUCT;
    next.moduleName = MODULE;
    if (next.grid) {
      const canonical = createGrid(next.grid);
      const savedRegions = new Map((next.grid.regions || []).map(region => [region.id, region]));
      canonical.regions = canonical.regions.map(region => ({ ...region, ...(savedRegions.get(region.id) || {}) }));
      next.grid = canonical;
    }
    next.supports = Array.isArray(next.supports) ? next.supports : [];
    next.options = next.options && typeof next.options === 'object' ? next.options : {};
    next.form = next.form && typeof next.form === 'object' ? next.form : {};
    next.project = next.project && typeof next.project === 'object' ? next.project : {};
    return next;
  }

  global.BCubeFreedomGeometry = Object.freeze({
    PRODUCT,
    MODULE,
    SCHEMA,
    AXIS_COLOR,
    POST_COLOR,
    FRAME_COLOR,
    createGrid,
    cloneGrid,
    regionAt,
    isRegionVisible,
    visibleAxisSegments,
    selectablePoints,
    wallCandidatesForPoint,
    sideLabel,
    postDimensions,
    buildFrames,
    normalizeImportedState
  });
})(typeof window !== 'undefined' ? window : globalThis);
