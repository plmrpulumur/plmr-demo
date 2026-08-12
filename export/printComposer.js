(function (root) {
  'use strict';

  const PAPER_SIZES = Object.freeze({
    A0: Object.freeze({ width: 841, height: 1189 }),
    A1: Object.freeze({ width: 594, height: 841 }),
    A3: Object.freeze({ width: 297, height: 420 })
  });

  function finite(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error(`PRINT_INVALID_${String(label || 'VALUE').toUpperCase()}`);
    return number;
  }

  function normalizeBounds(bounds) {
    if (!bounds || typeof bounds !== 'object') throw new Error('PRINT_BOUNDS_REQUIRED');
    const normalized = {
      minX: finite(bounds.minX, 'minX'),
      minY: finite(bounds.minY, 'minY'),
      maxX: finite(bounds.maxX, 'maxX'),
      maxY: finite(bounds.maxY, 'maxY')
    };
    if (normalized.maxX < normalized.minX || normalized.maxY < normalized.minY) throw new Error('PRINT_BOUNDS_INVALID');
    normalized.width = Math.max(1, normalized.maxX - normalized.minX);
    normalized.height = Math.max(1, normalized.maxY - normalized.minY);
    return normalized;
  }

  function paperSize(name, orientation) {
    const key = String(name || 'A3').toUpperCase();
    const source = PAPER_SIZES[key];
    if (!source) throw new Error(`PRINT_PAPER_UNSUPPORTED:${key}`);
    const landscape = String(orientation || 'landscape').toLowerCase() === 'landscape';
    return Object.freeze({
      name: key,
      orientation: landscape ? 'landscape' : 'portrait',
      width: landscape ? source.height : source.width,
      height: landscape ? source.width : source.height
    });
  }

  function cloneRect(rect) {
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }

  function compose(items, options) {
    const settings = Object.assign({
      paper: 'A3',
      orientation: 'landscape',
      margin: 12,
      headerHeight: 20,
      footerHeight: 0,
      gap: 8,
      columns: 2,
      rows: 2,
      cellPadding: 4,
      maxScale: Infinity,
      minScale: 0,
      titleBlock: null
    }, options || {});
    if (!Array.isArray(items) || !items.length) throw new Error('PRINT_ITEMS_REQUIRED');
    const sheet = paperSize(settings.paper, settings.orientation);
    const margin = Math.max(0, finite(settings.margin, 'margin'));
    const headerHeight = Math.max(0, finite(settings.headerHeight, 'headerHeight'));
    const footerHeight = Math.max(0, finite(settings.footerHeight, 'footerHeight'));
    const gap = Math.max(0, finite(settings.gap, 'gap'));
    const padding = Math.max(0, finite(settings.cellPadding, 'cellPadding'));
    const columns = Math.max(1, Math.floor(finite(settings.columns, 'columns')));
    const rows = Math.max(1, Math.floor(finite(settings.rows, 'rows')));
    const itemsPerPage = columns * rows;
    const contentWidth = sheet.width - margin * 2;
    const contentHeight = sheet.height - margin * 2 - headerHeight - footerHeight;
    const cellWidth = (contentWidth - gap * (columns - 1)) / columns;
    const cellHeight = (contentHeight - gap * (rows - 1)) / rows;
    if (!(cellWidth > padding * 2) || !(cellHeight > padding * 2)) throw new Error('PRINT_SHEET_OVERFLOW');

    const prepared = items.map((source, index) => {
      const bounds = normalizeBounds(source && (source.bounds || (source.flat && source.flat.bounds)));
      return { source, index, id: String((source && source.id) || `item-${index + 1}`), bounds };
    });
    const pages = [];
    for (let offset = 0; offset < prepared.length; offset += itemsPerPage) {
      const pageItems = prepared.slice(offset, offset + itemsPerPage);
      const fitScale = Math.min(...pageItems.map(entry => Math.min(
        (cellWidth - padding * 2) / entry.bounds.width,
        (cellHeight - padding * 2) / entry.bounds.height
      )));
      const scale = Math.min(fitScale, Number.isFinite(settings.maxScale) ? Number(settings.maxScale) : fitScale);
      if (!Number.isFinite(scale) || scale <= 0 || scale < Number(settings.minScale || 0)) {
        const error = new Error('PRINT_ITEM_OVERFLOW');
        error.details = { page: pages.length + 1, fitScale, minScale: Number(settings.minScale || 0) };
        throw error;
      }
      const placements = pageItems.map((entry, pageItemIndex) => {
        const column = pageItemIndex % columns;
        const row = Math.floor(pageItemIndex / columns);
        const cell = {
          x: margin + column * (cellWidth + gap),
          y: margin + headerHeight + row * (cellHeight + gap),
          width: cellWidth,
          height: cellHeight
        };
        const drawingWidth = entry.bounds.width * scale;
        const drawingHeight = entry.bounds.height * scale;
        return Object.freeze({
          id: entry.id,
          source: entry.source,
          sourceIndex: entry.index,
          column,
          row,
          scale,
          bounds: Object.freeze(Object.assign({}, entry.bounds)),
          cell: Object.freeze(cloneRect(cell)),
          transform: Object.freeze({
            scale,
            x: cell.x + (cell.width - drawingWidth) / 2 - entry.bounds.minX * scale,
            y: cell.y + (cell.height + drawingHeight) / 2 + entry.bounds.minY * scale
          })
        });
      });
      pages.push(Object.freeze({
        index: pages.length,
        number: pages.length + 1,
        scale,
        placements: Object.freeze(placements),
        titleBlock: Object.freeze({
          x: margin,
          y: margin,
          width: contentWidth,
          height: headerHeight,
          metadata: typeof settings.titleBlock === 'function' ? settings.titleBlock(pages.length, pageItems.map(x => x.source)) : (settings.titleBlock || null)
        })
      }));
    }
    const totalPages = pages.length;
    const finalizedPages = pages.map(page => Object.freeze(Object.assign({}, page, { totalPages })));
    return Object.freeze({
      schema: 'plmr-print-composer-v1',
      paper: sheet,
      settings: Object.freeze({ margin, headerHeight, footerHeight, gap, columns, rows, cellPadding: padding }),
      cell: Object.freeze({ width: cellWidth, height: cellHeight }),
      pages: Object.freeze(finalizedPages),
      itemCount: prepared.length
    });
  }

  root.PulumurPrintComposer = { PAPER_SIZES, paperSize, normalizeBounds, compose };
  if (typeof module !== 'undefined') module.exports = root.PulumurPrintComposer;
})(typeof window !== 'undefined' ? window : globalThis);
