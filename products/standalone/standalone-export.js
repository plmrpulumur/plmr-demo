(function (root) {
  'use strict';

  function pdfMetadata(project, pageIndex, pageTotal, productGroup) {
    const info = project.projectInfo || {};
    const date = info.date || new Date().toLocaleDateString('tr-TR');
    return {
      title: info.projectName || 'PLMR Bağımsız Ürün Projesi',
      left: [info.customerName, info.projectCode, info.revision].filter(Boolean).join('  |  '),
      right: [`Sayfa ${pageIndex + 1}/${pageTotal}`, productGroup, date, info.designer ? `Çizen: ${info.designer}` : ''].filter(Boolean).join('  |  ')
    };
  }

  async function exportPdf(project, projectDrawing) {
    if (root.PulumurConstraintEngine) root.PulumurConstraintEngine.assertExportable({ project, drawing: projectDrawing });
    const engine = root.PulumurVectorPdfEngine;
    const composer = root.PulumurPrintComposer;
    if (!engine) throw new Error('Ortak PLMR PDF motoru yüklenmedi.');
    if (!composer) throw new Error('PLMR Print Composer yüklenmedi.');
    if (!projectDrawing || !Array.isArray(projectDrawing.positions) || !projectDrawing.positions.length) throw new Error('PDF için çizim bulunamadı.');
    const PdfConstructor = await engine.ensureJsPdf();
    const prepared = projectDrawing.positions.map((item, index) => {
      const flat = engine.flattenDrawing(item.drawing);
      return { id: item.instanceId || item.positionNo || `position-${index + 1}`, item, flat, bounds: flat.bounds };
    });
    const plan = composer.compose(prepared, {
      paper: 'A3', orientation: 'landscape', margin: 12, headerHeight: 20,
      gap: 8, columns: 2, rows: 2, cellPadding: 4
    });
    const doc = new PdfConstructor({ orientation: plan.paper.orientation, unit: 'mm', format: plan.paper.name.toLowerCase() });
    const fontName = root.PulumurExportService && typeof root.PulumurExportService.ensurePdfFont === 'function'
      ? await root.PulumurExportService.ensurePdfFont(doc, '../../assets/NotoSans-Regular.ttf')
      : (doc.__plmrFontName || 'PLMRNoto');

    plan.pages.forEach((page, pageIndex) => {
      if (pageIndex) doc.addPage(plan.paper.name.toLowerCase(), plan.paper.orientation);
      const items = page.placements.map(placement => placement.source.item);
      const productGroup = [...new Set(items.map(item => item.adapter.label))].join(' / ');
      const meta = pdfMetadata(project, pageIndex, plan.pages.length, productGroup);
      const margin = plan.settings.margin;
      const headerH = plan.settings.headerHeight;
      const pageW = plan.paper.width;

      doc.setFont(fontName, 'normal');
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(13);
      doc.text(meta.title, margin, 9);
      doc.setFontSize(7.5);
      if (meta.left) doc.text(meta.left, margin, 14);
      doc.text(meta.right, pageW - margin, 10, { align: 'right' });
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.18);
      doc.line(margin, headerH, pageW - margin, headerH);

      page.placements.forEach(placement => {
        const cell = placement.cell;
        doc.setDrawColor(210, 210, 210);
        doc.setLineWidth(0.12);
        doc.rect(cell.x, cell.y, cell.width, cell.height);
        engine.drawDrawing(doc, placement.source.item.drawing, placement.transform, { fontName, flat: placement.source.flat });
      });
    });
    return doc.output('arraybuffer');
  }

  function exportDxf(drawing) {
    if (root.PulumurConstraintEngine) root.PulumurConstraintEngine.assertExportable({ drawing });
    const namespaced = root.PulumurLayerNamespaceManager ? root.PulumurLayerNamespaceManager.prepareForExport(drawing) : drawing;
    const prepared = root.PulumurExportService ? root.PulumurExportService.prepareDrawing(namespaced) : namespaced;
    if (!root.PulumurModernDXF || typeof root.PulumurModernDXF.toDxf !== 'function') throw new Error('Ortak PLMR DXF motoru yüklenmedi.');
    return root.PulumurModernDXF.toDxf(prepared);
  }

  const drawEntity = function (doc, entity, transform, fontName, layerStyle) {
    if (!root.PulumurVectorPdfEngine) throw new Error('Ortak PLMR PDF motoru yüklenmedi.');
    return root.PulumurVectorPdfEngine.drawEntity(doc, entity, transform, fontName, layerStyle);
  };

  root.PulumurStandaloneExport = { exportPdf, exportDxf, drawEntity, pdfMetadata };
  if (typeof module !== 'undefined') module.exports = root.PulumurStandaloneExport;
})(typeof window !== 'undefined' ? window : globalThis);
