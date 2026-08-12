(function () {
  'use strict';

  const DOCUMENTS = Object.freeze([
    { id: 'quote', label: 'Fiyat Teklifi' },
    { id: 'production', label: 'Üretim Formu' },
    { id: 'product-list', label: 'Ürün Listesi' },
    { id: '3d', label: '3D' },
    { id: '2d', label: '2D' },
    { id: 'cut-list', label: 'Kesim Listesi' },
    { id: 'accessories', label: 'Aksesuar Listesi' },
    { id: 'optimization', label: 'Kesim Optimizasyonu' },
    { id: 'stock', label: 'Stok Profilleri' }
  ]);

  const PRODUCT_LABELS = Object.freeze({
    'b-cube': 'Rolling Roof (Retractable)',
    'bio-rise': 'Eco-Bioclimatic (Tilt)',
    'b-cube-galaxy': 'Bioclimatic (Tilt)',
    'pergo-rise': 'Pergola'
  });

  const PAGE = Object.freeze({ width: 1120, height: 1584, margin: 64, header: 164, footer: 70 });
  const FONT = 'Inter, Segoe UI, Arial, sans-serif';
  const COLORS = Object.freeze({
    ink: '#0f172a', text: '#334155', muted: '#64748b', faint: '#94a3b8', line: '#dbe3ef',
    soft: '#f8fafc', softBlue: '#eff6ff', blue: '#1d4ed8', blue2: '#2563eb', navy: '#112442',
    green: '#047857', amber: '#b45309', white: '#ffffff', dark: '#020617'
  });
  const BRAND_LOGO_URL = 'data:image/png;base64,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';

  let panel = null;
  let brandLogoPromise = null;
  let anchorButton = null;
  let busy = false;

  const nf0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const money = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  function bridge() {
    return window.__P3DV_DOCUMENT_BRIDGE__ || null;
  }

  function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function round5(value) {
    return Math.max(1, Math.round(safeNumber(value) / 5) * 5);
  }

  function mm(value) {
    return `${nf0.format(Math.round(safeNumber(value)))} mm`;
  }

  function kg(value) {
    return `${nf1.format(safeNumber(value))} kg`;
  }

  function productLabel(group) {
    return PRODUCT_LABELS[group] || String(group || 'P3DV Ürünü');
  }

  function finishText(value) {
    const text = String(value || '').toUpperCase();
    if (text === 'GLOSSY' || text === 'GLOSS') return 'Parlak';
    if (text === 'TEXTURE') return 'Texture';
    if (text === 'MATTE') return 'Mat';
    return value || '-';
  }

  function colorText(color, mode) {
    if (mode !== 'ral') return 'Default teknik renk';
    if (!color) return '-';
    return `${color.code || '-'} · ${finishText(color.finish)}`;
  }

  function compactColorText(color, mode) {
    if (mode !== 'ral') return 'Default';
    if (!color) return '-';
    return String(color.code || '-');
  }

  function size2d(width, height) {
    return `${nf0.format(Math.round(safeNumber(width)))} × ${nf0.format(Math.round(safeNumber(height)))} mm`;
  }

  function size3d(width, depth, height) {
    return `${nf0.format(Math.round(safeNumber(width)))} × ${nf0.format(Math.round(safeNumber(depth)))} × ${nf0.format(Math.round(safeNumber(height)))} mm`;
  }

  function todayText() {
    return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  }

  function projectNumber(model) {
    const date = new Date();
    const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const group = ({ 'b-cube': 'FR', 'bio-rise': 'BR', 'b-cube-galaxy': 'GX', 'pergo-rise': 'PR' })[model.productGroup] || 'PD';
    const seed = Math.abs(Math.round(safeNumber(model.width) + safeNumber(model.depth) * 3 + safeNumber(model.height) * 7 + safeNumber(model.systemCount) * 97)) % 10000;
    return `P3DV-${group}-${stamp}-${String(seed).padStart(4, '0')}`;
  }

  function activeLayout(model) {
    if (model.productGroup === 'b-cube') return model.freedomLayout;
    if (model.productGroup === 'bio-rise') return model.bioRiseLayout;
    if (model.productGroup === 'b-cube-galaxy') return model.galaxyLayout;
    return null;
  }

  function moduleData(model) {
    if (model.productGroup === 'pergo-rise') {
      const derived = model.pergoRiseProject && model.pergoRiseProject.derived;
      const systems = derived && Array.isArray(derived.systems) ? derived.systems : [];
      if (systems.length) {
        return systems.map((system, index) => ({
          index,
          id: system.id || `PR-${index + 1}`,
          row: 'Ön sıra',
          width: safeNumber(system.width, model.width),
          depth: safeNumber(system.opening, model.depth),
          height: safeNumber(system.rearHeight, model.height),
          frontHeight: safeNumber(system.frontHeight, model.height),
          panelCount: 1,
          railCount: Math.max(1, Math.round(safeNumber(system.railCount, 2))),
          panelLength: safeNumber(system.width, model.width)
        }));
      }
    }
    const layout = activeLayout(model);
    if (layout && Array.isArray(layout.modules) && layout.modules.length) {
      return layout.modules.map((item, index) => ({
        index,
        id: item.id || `M-${index + 1}`,
        row: item.rowIndex === 1 || item.rowLabel === 'rear-row' ? 'Arka sıra' : 'Ön sıra',
        width: safeNumber(item.referenceWidth || item.outerWidth || item.clearWidth, model.width),
        depth: safeNumber(item.depth, model.depth),
        height: safeNumber(model.height),
        panelCount: Math.max(1, Math.round(safeNumber(item.panelCount, (model.modulePanelCounts || [])[index] || model.panelCount || model.lamellaCount))),
        panelLength: safeNumber(item.panelLength || item.clearWidth, model.width),
        gutterWidth: safeNumber(item.gutterWidth || item.clearWidth, model.width),
        railWidth: safeNumber(item.railWidth || item.clearWidth, model.width),
        frontBeamLength: safeNumber(item.frontBeamLength || item.frontClearWidth || item.clearWidth, model.width),
        rearBeamLength: safeNumber(item.rearBeamLength || item.rearClearWidth || item.clearWidth, model.width),
        leftSideBeamLength: safeNumber(item.leftSideBeamLength || item.frameClearDepth || item.depth, model.depth),
        rightSideBeamLength: safeNumber(item.rightSideBeamLength || item.frameClearDepth || item.depth, model.depth)
      }));
    }
    const widths = Array.isArray(model.moduleWidths) && model.moduleWidths.length ? model.moduleWidths : [model.width];
    const depths = Array.isArray(model.moduleDepths) && model.moduleDepths.length ? model.moduleDepths : widths.map(() => model.depth);
    const panels = Array.isArray(model.modulePanelCounts) && model.modulePanelCounts.length ? model.modulePanelCounts : widths.map(() => model.panelCount || model.lamellaCount || 1);
    return widths.map((width, index) => ({
      index, id: `M-${index + 1}`, row: 'Ön sıra', width: safeNumber(width), depth: safeNumber(depths[index], model.depth), height: safeNumber(model.height),
      panelCount: Math.max(1, Math.round(safeNumber(panels[index], 1))), panelLength: Math.max(80, safeNumber(width) - 185),
      gutterWidth: Math.max(200, safeNumber(width) - 4), railWidth: Math.max(80, safeNumber(width) - 8),
      frontBeamLength: safeNumber(width), rearBeamLength: safeNumber(width), leftSideBeamLength: safeNumber(depths[index], model.depth), rightSideBeamLength: safeNumber(depths[index], model.depth)
    }));
  }

  function selectedOptions(model) {
    const options = model.options || {};
    const rows = [];
    Object.entries(options).forEach(([key, value]) => {
      if (value == null || value === '' || value === '-' || value === 'Yok' || value === 'HAYIR' || value === 'NO' || value === false) return;
      const labelMap = {
        motor: 'Motor', remote: 'Kumanda', led: 'LED', dimmer: 'Dimmer', parapet: 'Parapet', parapetHeight: 'Parapet H', glassTrack: 'Cam Kaydı',
        fabric: 'Kumaş', fabricProfiles: 'Kumaş Profilleri', triangleJoinery: 'Üçgen Doğrama', waterStandard: 'Su Çıkışı', waterOutletPlacement: 'Su Çıkışı Konumu', extras: 'Ek Bilgiler'
      };
      rows.push({ label: labelMap[key] || key, value: String(value) });
    });
    if (model.productGroup !== 'pergo-rise' && model.pdfRequest && Array.isArray(model.pdfRequest.sections)) {
      model.pdfRequest.sections.forEach((section) => {
        (section.rows || []).forEach((field) => {
          if (!field || field.value == null) return;
          const value = Array.isArray(field.value) ? field.value.join(', ') : String(field.value);
          if (!value || value === '-' || /^no$/i.test(value) || /^none$/i.test(value)) return;
          if (!rows.some((item) => item.label === field.label && item.value === value)) rows.push({ label: field.label, value });
        });
      });
    }
    return rows.slice(0, 12);
  }

  function postPieces(model, modules, add, cfg) {
    const layout = activeLayout(model);
    if (layout && Array.isArray(layout.posts) && layout.posts.length) {
      const grouped = new Map();
      layout.posts.forEach((post) => {
        const length = round5(post.height || model.height);
        grouped.set(length, (grouped.get(length) || 0) + 1);
      });
      grouped.forEach((qty, length) => add(cfg.name, cfg.code, length, qty, cfg.gram, cfg.section, cfg.stock || 6000, 'Dikme / taşıyıcı'));
      return;
    }
    const pergoCounts = model.pergoRiseProject && model.pergoRiseProject.derived && model.pergoRiseProject.derived.counts || {};
    const qty = model.productGroup === 'pergo-rise' ? Math.max(2, safeNumber(pergoCounts.posts, modules.length * 2)) : Math.max(4, modules.length * 2 + 2);
    add(cfg.name, cfg.code, round5(model.height), qty, cfg.gram, cfg.section, cfg.stock || 6000, 'Dikme / taşıyıcı');
  }

  function profilePieces(model, modules) {
    const pieces = [];
    const add = (profile, code, length, qty, gram, section, stock, note) => {
      const safeQty = Math.max(0, Math.round(safeNumber(qty)));
      const safeLength = Math.max(1, round5(length));
      if (!safeQty || !safeLength) return;
      pieces.push({ profile, code, length: safeLength, qty: safeQty, gram: safeNumber(gram), section, stock: safeNumber(stock, 6000), note: note || '' });
    };

    if (model.productGroup === 'b-cube') {
      modules.forEach((m) => {
        add('Freedom Ön / Arka Oluk Profili', 'BCF-OL-220', m.gutterWidth || m.width, 2, 3.85, 'gutter', 7000, `Modül ${m.index + 1}`);
        add('Freedom Yan Kayıt Profili', 'BCF-YK-220', Math.max(200, m.depth - 200), 2, 3.10, 'beam', 7000, `Modül ${m.index + 1}`);
        add('Freedom Lamel Profili', 'BCF-LM-216', m.panelLength, m.panelCount, 2.15, 'panel', 7000, `Modül ${m.index + 1}`);
      });
      postPieces(model, modules, add, { name: 'Freedom Dikme Profili', code: 'BCF-DK-100220', gram: 4.75, section: 'post', stock: 6000 });
      if (String(model.options && model.options.led || '').toUpperCase() === 'YES') add('Freedom LED Profili', 'BCF-LED-01', modules.reduce((s, m) => s + m.width, 0) / Math.max(1, modules.length), modules.length * 2, 0.42, 'led', 6000, 'LED opsiyonu');
    } else if (model.productGroup === 'bio-rise') {
      modules.forEach((m) => {
        add('Eco-Bioclimatic Ön Kayıt / Oluk', 'BR-ON-218', m.frontBeamLength || m.width, 1, 4.55, 'gutter', 7000, `Modül ${m.index + 1}`);
        add('Eco-Bioclimatic Arka Kayıt', 'BR-AR-218', m.rearBeamLength || m.width, 1, 3.95, 'beam', 7000, `Modül ${m.index + 1}`);
        add('Eco-Bioclimatic Yan Kayıt / Oluk', 'BR-YN-218', m.leftSideBeamLength || m.depth, 2, 3.70, 'gutter-side', 7000, `Modül ${m.index + 1}`);
        add('Eco-Bioclimatic Lamel Profili', 'BR-LM-200', m.panelLength, m.panelCount, 1.95, 'panel', 7000, `Modül ${m.index + 1}`);
      });
      postPieces(model, modules, add, { name: 'Eco-Bioclimatic Dikme Profili', code: 'BR-DK-150100', gram: 4.20, section: 'post', stock: 6000 });
    } else if (model.productGroup === 'b-cube-galaxy') {
      modules.forEach((m) => {
        add('Galaxy Birleşik Ön / Arka Kayıt + Oluk', 'GX-KO-140225', m.frontBeamLength || m.width, 1, 5.90, 'galaxy-front', 7000, `Modül ${m.index + 1} · Ön`);
        add('Galaxy Birleşik Ön / Arka Kayıt + Oluk', 'GX-KO-140225', m.rearBeamLength || m.width, 1, 5.90, 'galaxy-front', 7000, `Modül ${m.index + 1} · Arka`);
        add('Galaxy Birleşik Sol / Sağ Kayıt + Oluk', 'GX-KO-180225', m.leftSideBeamLength || m.depth, 1, 6.35, 'galaxy-side', 7000, `Modül ${m.index + 1} · Sol`);
        add('Galaxy Birleşik Sol / Sağ Kayıt + Oluk', 'GX-KO-180225', m.rightSideBeamLength || m.depth, 1, 6.35, 'galaxy-side', 7000, `Modül ${m.index + 1} · Sağ`);
        add('Galaxy Lamel Profili', 'GX-LM-200', m.panelLength, m.panelCount, 2.05, 'panel', 7000, `Modül ${m.index + 1}`);
      });
      postPieces(model, modules, add, { name: 'Galaxy Dikme Profili', code: 'GX-DK-180140', gram: 5.10, section: 'post', stock: 6000 });
    } else {
      const input = model.pergoRiseProject && model.pergoRiseProject.input || {};
      modules.forEach((m) => {
        add('Pergola Arka Mekanizma Profili', 'PR-ARK-01', m.width, 1, 4.10, 'beam', 7000, `Poz ${m.index + 1}`);
        add('Pergola Ön Kafa Profili', 'PR-ONK-01', m.width, 1, 3.65, 'gutter', 7000, `Poz ${m.index + 1}`);
        add('Pergola Ray Profili', 'PR-RAY-01', m.depth, m.railCount || 2, 2.75, 'rail', 7000, `Poz ${m.index + 1}`);
        add('Pergola Kumaş Taşıyıcı Profili', 'PR-KMS-01', Math.max(500, m.width - 120), 2, 1.15, 'panel', 7000, `Poz ${m.index + 1}`);
      });
      postPieces(model, modules, add, { name: 'Pergola Dikme Profili', code: 'PR-DK-100100', gram: 3.35, section: 'post', stock: 6000 });
      if (String(input.led || '').toUpperCase() !== '-' && String(input.led || '').toUpperCase() !== 'NO') add('Pergola LED Profili', 'PR-LED-01', modules[0] ? modules[0].width : model.width, modules.length, 0.38, 'led', 6000, 'LED opsiyonu');
    }
    return pieces;
  }

  function aggregateCuts(pieces) {
    const map = new Map();
    pieces.forEach((piece) => {
      const key = `${piece.code}|${piece.length}|${piece.note}`;
      const row = map.get(key) || { ...piece, qty: 0 };
      row.qty += piece.qty;
      map.set(key, row);
    });
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code) || b.length - a.length);
  }

  function productionRows(cuts, surface) {
    return cuts.map((cut) => ({
      ...cut,
      surface,
      totalKg: cut.length / 1000 * cut.gram * cut.qty
    }));
  }

  function accessoryRows(model, modules, counts) {
    const rows = [];
    const add = (name, code, qty, unit, note) => { if (qty > 0) rows.push({ name, code, qty: Math.round(qty), unit, note }); };
    const moduleCount = modules.length;
    const panelCount = counts.panelCount;
    const postCount = counts.postCount;
    const motor = String(model.options && model.options.motor || '').trim();
    const remote = String(model.options && model.options.remote || '').trim();
    add('Paslanmaz bağlantı vidası', 'AKS-VDA-A2', postCount * 8 + moduleCount * 12, 'adet', 'Taşıyıcı ve çerçeve bağlantıları');
    add('Köşe / birleşim bağlantı plakası', 'AKS-PLK-01', moduleCount * 4 + Math.max(0, moduleCount - 1) * 2, 'adet', 'Demo montaj seti');
    add('EPDM fitil / conta', 'AKS-EPDM', Math.max(1, panelCount * 2), 'm', 'Panel ve profil sızdırmazlığı');
    if (motor && !/^(yok|-|no)$/i.test(motor)) add(`Motor · ${motor}`, 'AKS-MTR-01', moduleCount, 'adet', 'Seçili motor opsiyonu');
    if (remote && !/^(yok|-|no)$/i.test(remote)) add(`Kumanda · ${remote}`, 'AKS-KMD-01', Math.max(1, Math.ceil(moduleCount / 2)), 'adet', 'Seçili kumanda opsiyonu');
    if (model.productGroup === 'b-cube') {
      add('Freedom oluk kapağı', 'BCF-AKS-KPK', moduleCount * 4, 'adet', 'Ön/arka oluk kapakları');
      add('Lamel burç seti', 'BCF-AKS-BRC', panelCount * 2, 'set', 'Panel hareket seti');
      add('Drenaj çıkış adaptörü', 'BCF-AKS-DRN', moduleCount * 2, 'adet', 'Su tahliyesi');
    } else if (model.productGroup === 'bio-rise') {
      add('Eco-Bioclimatic hareket kolu seti', 'BR-AKS-HRK', moduleCount * 2, 'set', 'Lamel hareketi');
      add('Oluk drenaj parçası', 'BR-AKS-DRN', moduleCount * 2, 'adet', 'Su tahliyesi');
    } else if (model.productGroup === 'b-cube-galaxy') {
      add('Galaxy birleşik profil köşe kapağı', 'GX-AKS-KPK', moduleCount * 4, 'adet', 'Birleşik kayıt + oluk uçları');
      add('Galaxy drenaj adaptörü', 'GX-AKS-DRN', moduleCount * 4, 'adet', 'Dört cephe drenajı');
    } else {
      const railCount = modules.reduce((s, m) => s + (m.railCount || 0), 0);
      add('Pergola ray arabası', 'PR-AKS-RAY', railCount * 2, 'adet', 'Ray mekanizması');
      add('Kumaş bağlantı seti', 'PR-AKS-KMS', moduleCount * 2, 'set', 'Kumaş taşıyıcı bağlantıları');
      add('Fi70 drenaj bağlantısı', 'PR-AKS-F70', moduleCount * 2, 'adet', 'Su tahliyesi');
    }
    return rows;
  }

  function chooseStockLength(pieceLength, preferred) {
    const candidates = [safeNumber(preferred, 6000), 6000, 7000, 7500, 8000, 12000, 14000].filter((v, i, arr) => v >= pieceLength && arr.indexOf(v) === i).sort((a, b) => a - b);
    if (candidates.length) return candidates[0];
    return Math.ceil(pieceLength / 1000) * 1000;
  }

  function optimizeCuts(cuts) {
    const profiles = new Map();
    cuts.forEach((cut) => {
      const bucket = profiles.get(cut.code) || { code: cut.code, profile: cut.profile, preferred: cut.stock, pieces: [] };
      for (let i = 0; i < cut.qty; i += 1) bucket.pieces.push(cut.length);
      profiles.set(cut.code, bucket);
    });
    const result = [];
    profiles.forEach((group) => {
      const bars = [];
      group.pieces.sort((a, b) => b - a).forEach((length) => {
        let target = bars.find((bar) => bar.remaining >= length);
        if (!target) {
          const stock = chooseStockLength(length, group.preferred);
          target = { stock, remaining: stock, segments: [] };
          bars.push(target);
        }
        target.segments.push(length);
        target.remaining -= length;
      });
      bars.forEach((bar, index) => {
        const used = bar.stock - bar.remaining;
        result.push({
          code: group.code, profile: group.profile, index: index + 1, stock: bar.stock, segments: bar.segments.slice(), used, fire: bar.remaining,
          efficiency: bar.stock ? used / bar.stock * 100 : 0
        });
      });
    });
    return result;
  }

  function stockRows(optimization) {
    const map = new Map();
    optimization.forEach((bar) => {
      const key = `${bar.code}|${bar.stock}`;
      const row = map.get(key) || { profile: bar.profile, code: bar.code, stock: bar.stock, qty: 0, remaining: 0, used: 0 };
      row.qty += 1;
      row.remaining += bar.fire;
      row.used += bar.used;
      map.set(key, row);
    });
    return Array.from(map.values()).map((row) => ({ ...row, note: `Ort. fire ${mm(row.remaining / Math.max(1, row.qty))}` }));
  }

  function countsFor(model, modules) {
    const layout = activeLayout(model);
    const pergoCounts = model.pergoRiseProject && model.pergoRiseProject.derived && model.pergoRiseProject.derived.counts || {};
    return {
      modules: modules.length,
      panelCount: modules.reduce((sum, item) => sum + Math.max(1, safeNumber(item.panelCount, 1)), 0),
      postCount: model.productGroup === 'pergo-rise' ? Math.max(0, safeNumber(pergoCounts.posts, modules.length * 2)) : (layout && Array.isArray(layout.posts) ? layout.posts.length : Math.max(4, modules.length * 2 + 2)),
      railCount: model.productGroup === 'pergo-rise' ? modules.reduce((sum, item) => sum + safeNumber(item.railCount, 0), 0) : modules.length * 2
    };
  }

  function normalizeReportProducts(reportProducts, model) {
    const fallbackColor = compactColorText(model.systemColor, model.colorMode);
    return (Array.isArray(reportProducts) ? reportProducts : []).map((item, index) => ({
      id: String(item && item.id || `report-product-${index + 1}`),
      type: String(item && item.type || ''),
      name: String(item && item.name || 'Yan Ürün'),
      width: Math.max(1, Math.round(safeNumber(item && item.width))),
      height: Math.max(1, Math.round(safeNumber(item && item.height))),
      quantity: Math.max(1, Math.round(safeNumber(item && item.quantity, 1))),
      facade: String(item && item.facade || ''),
      color: compactColorText(item && item.color || model.systemColor, item && item.colorMode || model.colorMode) || fallbackColor
    })).filter((item) => item.width > 0 && item.height > 0);
  }

  function quoteDisplayOptions(options) {
    const hiddenLabels = new Set([
      'panelcolorindependent', 'panel fill', 'panelfill', 'width', 'projection', 'height (top of the gutter)',
      'system quantity', 'system color', 'panel color', 'product', 'product group', 'finish'
    ]);
    return (Array.isArray(options) ? options : []).filter((item) => {
      const label = String(item && item.label || '').trim().toLowerCase();
      const value = String(item && item.value || '').trim();
      if (!value || value === '-' || value === '—' || /^yok$/i.test(value) || /^no$/i.test(value) || /^hayır$/i.test(value)) return false;
      return label && !hiddenLabels.has(label);
    });
  }

  function quoteData(model, modules, options, reportProducts) {
    const area = modules.reduce((sum, item) => sum + safeNumber(item.width) * safeNumber(item.depth) / 1000000, 0);
    const rates = { 'b-cube': 520, 'bio-rise': 490, 'b-cube-galaxy': 565, 'pergo-rise': 395 };
    const baseRate = rates[model.productGroup] || 450;
    const optionFactor = 1 + Math.min(0.22, quoteDisplayOptions(options).length * 0.018);
    const mainSubtotal = Math.max(1250, area * baseRate * optionFactor + modules.length * 220);
    const productRates = {
      guillotine: 315, guillotine_glass: 315, sliding: 235, sliding_glass: 235, zip: 145, zip_screen: 145, zipper: 145,
      folding: 285, fixed: 165, door: 355
    };
    const productBase = { guillotine: 180, guillotine_glass: 180, sliding: 120, sliding_glass: 120, zip: 90, zip_screen: 90, zipper: 90, folding: 160, fixed: 80, door: 220 };
    const attachedItems = reportProducts.map((item) => {
      const key = String(item.type || '').toLowerCase();
      const productArea = item.width * item.height / 1000000;
      const rate = productRates[key] || 210;
      const demoPrice = Math.max(160, productArea * rate + (productBase[key] || 100));
      return { kind: 'attached', name: item.name, size: size2d(item.width, item.height), color: item.color, qty: item.quantity, price: demoPrice, source: item };
    });
    const mainItem = {
      kind: 'system', name: productLabel(model.productGroup), size: size3d(model.width, model.depth, model.height),
      color: compactColorText(model.systemColor, model.colorMode), qty: Math.max(1, modules.length), price: mainSubtotal
    };
    const items = [mainItem, ...attachedItems];
    const subtotal = mainSubtotal + attachedItems.reduce((sum, item) => sum + item.price * Math.max(1, item.qty), 0);
    const vat = subtotal * 0.20;
    return { area, baseRate, mainSubtotal, subtotal, vat, total: subtotal + vat, unitPrice: mainSubtotal / Math.max(1, modules.length), items };
  }

  function buildDocumentData(model, reportProducts) {
    const modules = moduleData(model);
    const counts = countsFor(model, modules);
    const options = selectedOptions(model);
    const attachedProducts = normalizeReportProducts(reportProducts, model);
    const pieces = profilePieces(model, modules);
    const cuts = aggregateCuts(pieces);
    const surface = colorText(model.systemColor, model.colorMode);
    const production = productionRows(cuts, surface);
    const accessories = accessoryRows(model, modules, counts);
    const optimization = optimizeCuts(cuts);
    const stock = stockRows(optimization);
    const quote = quoteData(model, modules, options, attachedProducts);
    const productRows = modules.map((module, index) => ({
      kind: 'system', name: `${productLabel(model.productGroup)} · Sistem ${index + 1}`,
      size: size3d(module.width, module.depth, module.height), color: compactColorText(model.systemColor, model.colorMode), qty: 1
    })).concat(attachedProducts.map((item) => ({ kind: 'attached', name: item.name, size: size2d(item.width, item.height), color: item.color, qty: item.quantity })));
    return {
      model, modules, counts, options, attachedProducts, productRows, pieces, cuts, production, accessories, optimization, stock, quote,
      product: productLabel(model.productGroup),
      systemColor: colorText(model.systemColor, model.colorMode),
      panelColor: colorText(model.panelColor, model.colorMode),
      compactSystemColor: compactColorText(model.systemColor, model.colorMode),
      date: todayText(), projectNo: projectNumber(model), customer: 'Demo Müşteri', projectName: 'P3DV Satış Demosu', salesperson: 'P3DV Kullanıcısı'
    };
  }

  function font(ctx, weight, size) {
    ctx.font = `${weight} ${size}px ${FONT}`;
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function fillRound(ctx, x, y, w, h, r, color) {
    roundedRect(ctx, x, y, w, h, r);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function strokeRound(ctx, x, y, w, h, r, color, width = 1) {
    roundedRect(ctx, x, y, w, h, r);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function ellipsizeText(ctx, text, maxWidth) {
    const raw = String(text == null ? '' : text);
    if (ctx.measureText(raw).width <= maxWidth) return raw;
    let out = raw;
    while (out.length > 1 && ctx.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1);
    return out ? `${out}…` : '';
  }

  function wrapLines(ctx, text, maxWidth, maxLines = 3) {
    const words = String(text == null ? '' : text).split(/\s+/).filter(Boolean);
    if (!words.length) return [''];
    const lines = [];
    let line = '';
    let truncated = false;
    for (let index = 0; index < words.length; index += 1) {
      const word = words[index];
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > maxWidth) {
        if (line) {
          if (lines.length >= maxLines - 1) { truncated = true; break; }
          lines.push(ellipsizeText(ctx, line, maxWidth));
          line = ctx.measureText(word).width > maxWidth ? ellipsizeText(ctx, word, maxWidth) : word;
        } else {
          line = ellipsizeText(ctx, word, maxWidth);
        }
      } else {
        line = next;
      }
      if (index === words.length - 1 && line) lines.push(ellipsizeText(ctx, line, maxWidth));
    }
    if (!lines.length && line) lines.push(ellipsizeText(ctx, line, maxWidth));
    if (truncated && lines.length) lines[lines.length - 1] = ellipsizeText(ctx, `${lines[lines.length - 1]}…`, maxWidth);
    return lines.slice(0, maxLines);
  }

  function drawTextBlock(ctx, text, x, y, width, lineHeight, maxLines, color, weight, size) {
    font(ctx, weight || 500, size || 22);
    ctx.fillStyle = color || COLORS.text;
    const lines = wrapLines(ctx, text, width, maxLines || 2);
    lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
    return lines.length * lineHeight;
  }

  function createCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE.width;
    canvas.height = PAGE.height;
    return canvas;
  }

  function drawBrandLogo(ctx, image, x, y, maxW, maxH) {
    if (!image || !image.width || !image.height) {
      font(ctx, 850, 25); ctx.fillStyle = COLORS.navy; ctx.fillText('PLMR', x, y + 24);
      return { width: 82, height: 28 };
    }
    const scale = Math.min(maxW / image.width, maxH / image.height);
    const w = image.width * scale; const h = image.height * scale;
    ctx.drawImage(image, x, y, w, h);
    return { width: w, height: h };
  }

  function basePage(ctx, data, title, kicker, pageNo, totalPages, brandLogo) {
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(0, 0, PAGE.width, PAGE.height);
    ctx.fillStyle = COLORS.navy;
    ctx.fillRect(0, 0, PAGE.width, 18);

    drawBrandLogo(ctx, brandLogo, PAGE.margin, 43, 150, 34);
    font(ctx, 650, 11);
    ctx.fillStyle = COLORS.blue2;
    ctx.fillText('P3DV · DOCUMENT CENTER', PAGE.margin, 101);

    font(ctx, 800, 34);
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(ellipsizeText(ctx, title, 500), PAGE.margin, 137);
    if (kicker) {
      font(ctx, 500, 15);
      ctx.fillStyle = COLORS.muted;
      ctx.textAlign = 'right';
      ctx.fillText(ellipsizeText(ctx, kicker, 390), PAGE.width - PAGE.margin, 137);
      ctx.textAlign = 'left';
    }

    font(ctx, 700, 14);
    ctx.fillStyle = COLORS.ink;
    ctx.textAlign = 'right';
    ctx.fillText(ellipsizeText(ctx, data.product, 330), PAGE.width - PAGE.margin, 65);
    font(ctx, 500, 12);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(data.projectNo, PAGE.width - PAGE.margin, 89);
    ctx.fillText(data.date, PAGE.width - PAGE.margin, 110);
    ctx.textAlign = 'left';

    ctx.strokeStyle = COLORS.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAGE.margin, PAGE.header - 12);
    ctx.lineTo(PAGE.width - PAGE.margin, PAGE.header - 12);
    ctx.stroke();

    const footerY = PAGE.height - PAGE.footer + 12;
    ctx.beginPath();
    ctx.moveTo(PAGE.margin, footerY - 28);
    ctx.lineTo(PAGE.width - PAGE.margin, footerY - 28);
    ctx.stroke();
    font(ctx, 500, 12);
    ctx.fillStyle = COLORS.muted;
    ctx.fillText('PLMR · P3DV Demo Dokümanı · Üretim doğruluğu prototip seviyesindedir.', PAGE.margin, footerY);
    ctx.textAlign = 'right';
    ctx.fillText(`Sayfa ${pageNo} / ${totalPages}`, PAGE.width - PAGE.margin, footerY);
    ctx.textAlign = 'left';
    return { x: PAGE.margin, y: PAGE.header + 8, w: PAGE.width - PAGE.margin * 2, h: PAGE.height - PAGE.header - PAGE.footer - 28 };
  }

  function infoCard(ctx, x, y, w, label, value, accent) {
    fillRound(ctx, x, y, w, 82, 10, COLORS.soft);
    strokeRound(ctx, x, y, w, 82, 10, COLORS.line);
    font(ctx, 600, 12); ctx.fillStyle = COLORS.muted; ctx.fillText(label.toUpperCase(), x + 16, y + 25);
    font(ctx, 750, 20); ctx.fillStyle = accent || COLORS.ink; drawTextBlock(ctx, value, x + 16, y + 55, w - 32, 22, 1, accent || COLORS.ink, 750, 20);
  }

  function drawProfileIcon(ctx, kind, x, y, w, h) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = COLORS.navy;
    ctx.fillStyle = '#eef2f7';
    ctx.lineWidth = 3;
    if (kind === 'galaxy-front' || kind === 'galaxy-side') {
      const pts = kind === 'galaxy-side'
        ? [[45,225],[0,225],[0,0],[180,0],[180,100],[160,100],[160,70],[45,70]]
        : [[45,225],[0,225],[0,0],[140,0],[140,100],[120,100],[120,70],[45,70]];
      const maxX = kind === 'galaxy-side' ? 180 : 140;
      const scale = Math.min((w - 14) / maxX, (h - 14) / 225);
      const ox = (w - maxX * scale) / 2;
      const oy = (h - 225 * scale) / 2;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const px = ox + p[0] * scale;
        const py = oy + (225 - p[1]) * scale;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (kind === 'post') {
      ctx.fillRect(w * .28, h * .14, w * .44, h * .72); ctx.strokeRect(w * .28, h * .14, w * .44, h * .72);
      ctx.strokeRect(w * .37, h * .23, w * .26, h * .54);
    } else if (kind === 'panel') {
      ctx.beginPath(); ctx.moveTo(w*.1,h*.62); ctx.lineTo(w*.85,h*.62); ctx.lineTo(w*.92,h*.45); ctx.lineTo(w*.22,h*.45); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (kind === 'rail') {
      ctx.strokeRect(w*.18,h*.2,w*.64,h*.6); ctx.beginPath(); ctx.moveTo(w*.35,h*.2);ctx.lineTo(w*.35,h*.8);ctx.moveTo(w*.65,h*.2);ctx.lineTo(w*.65,h*.8);ctx.stroke();
    } else if (kind === 'gutter' || kind === 'gutter-side') {
      ctx.beginPath(); ctx.moveTo(w*.18,h*.2);ctx.lineTo(w*.18,h*.78);ctx.lineTo(w*.82,h*.78);ctx.lineTo(w*.82,h*.55);ctx.lineTo(w*.38,h*.55);ctx.lineTo(w*.38,h*.2);ctx.closePath();ctx.fill();ctx.stroke();
    } else if (kind === 'led') {
      ctx.strokeRect(w*.2,h*.3,w*.6,h*.4); ctx.beginPath(); ctx.arc(w*.5,h*.5,Math.min(w,h)*.1,0,Math.PI*2); ctx.stroke();
    } else {
      ctx.strokeRect(w*.16,h*.28,w*.68,h*.44); ctx.beginPath();ctx.moveTo(w*.34,h*.28);ctx.lineTo(w*.34,h*.72);ctx.moveTo(w*.66,h*.28);ctx.lineTo(w*.66,h*.72);ctx.stroke();
    }
    ctx.restore();
  }

  function tablePageDescriptor(title, kicker, columns, rows, options = {}) {
    return { title, kicker, type: 'table', columns, rows, ...options };
  }

  function splitTableDescriptors(title, kicker, columns, rows, options = {}) {
    const perPage = options.rowsPerPage || 14;
    if (!rows.length) return [tablePageDescriptor(title, kicker, columns, [{ empty: true }], options)];
    const pages = [];
    for (let i = 0; i < rows.length; i += perPage) {
      pages.push(tablePageDescriptor(title, pages.length ? `${kicker} · devam` : kicker, columns, rows.slice(i, i + perPage), options));
    }
    return pages;
  }

  function drawTable(ctx, box, descriptor) {
    const columns = descriptor.columns;
    const rows = descriptor.rows;
    const headerH = 58;
    const rowH = descriptor.rowHeight || 72;
    const totalWeight = columns.reduce((s, c) => s + c.width, 0);
    const colWidths = columns.map((c) => box.w * c.width / totalWeight);
    fillRound(ctx, box.x, box.y, box.w, headerH, 9, COLORS.navy);
    let x = box.x;
    columns.forEach((col, idx) => {
      font(ctx, 700, 12); ctx.fillStyle = COLORS.white;
      const lines = wrapLines(ctx, col.label, colWidths[idx] - 16, 2);
      lines.forEach((line, li) => ctx.fillText(line, x + 8, box.y + 24 + li * 16));
      x += colWidths[idx];
    });
    let y = box.y + headerH;
    rows.forEach((row, rowIndex) => {
      ctx.fillStyle = rowIndex % 2 ? COLORS.soft : COLORS.white;
      ctx.fillRect(box.x, y, box.w, rowH);
      ctx.strokeStyle = COLORS.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(box.x, y + rowH); ctx.lineTo(box.x + box.w, y + rowH); ctx.stroke();
      let cellX = box.x;
      columns.forEach((col, colIndex) => {
        const value = row.empty ? (colIndex === 0 ? 'Bu proje için listelenecek veri bulunamadı.' : '') : (typeof col.value === 'function' ? col.value(row) : row[col.value]);
        if (col.icon && !row.empty) {
          drawProfileIcon(ctx, row.section, cellX + 8, y + 10, colWidths[colIndex] - 16, rowH - 20);
        } else {
          font(ctx, col.bold ? 700 : 500, col.size || 12);
          ctx.fillStyle = col.color || COLORS.text;
          const lines = wrapLines(ctx, value == null ? '-' : String(value), colWidths[colIndex] - 16, col.maxLines || 2);
          lines.forEach((line, li) => ctx.fillText(line, cellX + 8, y + 28 + li * 17));
        }
        if (colIndex < columns.length - 1) {
          ctx.strokeStyle = '#edf1f6'; ctx.beginPath(); ctx.moveTo(cellX + colWidths[colIndex], y + 8); ctx.lineTo(cellX + colWidths[colIndex], y + rowH - 8); ctx.stroke();
        }
        cellX += colWidths[colIndex];
      });
      y += rowH;
    });
  }

  function quoteDescriptors(data) {
    const rows = data.quote && Array.isArray(data.quote.items) ? data.quote.items : [];
    const perPage = 8;
    if (!rows.length) return [{ title: 'Fiyat Teklifi', kicker: 'Satış Teklifi · Demo', type: 'quote', rows: [], isFirst: true, isLast: true }];
    const pages = [];
    for (let i = 0; i < rows.length; i += perPage) {
      pages.push({
        title: 'Fiyat Teklifi',
        kicker: i ? 'Satış Teklifi · devam' : 'Satış Teklifi · Demo',
        type: 'quote',
        rows: rows.slice(i, i + perPage),
        isFirst: i === 0,
        isLast: i + perPage >= rows.length
      });
    }
    return pages;
  }

  function productionDescriptors(data) {
    const productionRows = data.production.map((row, index) => ({ ...row, index: index + 1 }));
    const cols = [
      { label: '#', width: .05, value: 'index' },
      { label: 'Profil Adı', width: .21, value: 'profile', bold: true },
      { label: 'Profil Kodu', width: .11, value: 'code' },
      { label: 'Profil Kesit', width: .13, icon: true },
      { label: 'Boy', width: .09, value: (r) => mm(r.length) },
      { label: 'Adet', width: .06, value: 'qty' },
      { label: 'Yüzey / RAL', width: .13, value: 'surface' },
      { label: 'g/m', width: .07, value: (r) => nf1.format(r.gram) },
      { label: 'Toplam Kg', width: .08, value: (r) => nf1.format(r.totalKg) },
      { label: 'Kontrol', width: .07, value: () => '□  □  □' }
    ];
    return splitTableDescriptors('Üretim Formu', 'Sipariş ve Üretim · Demo', cols, productionRows, { rowsPerPage: 10, rowHeight: 92, productionHeader: true });
  }

  function productListDescriptors(data) {
    const cols = [
      { label: 'Ürün', width: .47, value: 'name', bold: true, maxLines: 2 },
      { label: 'Ölçü', width: .27, value: 'size', maxLines: 2 },
      { label: 'Renk', width: .18, value: 'color', maxLines: 1 },
      { label: 'Adet', width: .08, value: 'qty', maxLines: 1 }
    ];
    return splitTableDescriptors('Ürün Listesi', 'Proje Ürünleri · Ana Sistem + Yan Ürünler', cols, data.productRows, { rowsPerPage: 17, rowHeight: 64 });
  }

  function cutListDescriptors(data) {
    const rows = data.cuts.map((cut, index) => ({ ...cut, index: index + 1, angle: cut.section === 'panel' ? '90°' : '90° / demo' }));
    const cols = [
      { label: '#', width: .06, value: 'index' },
      { label: 'Profil', width: .27, value: 'profile', bold: true },
      { label: 'Profil Kodu', width: .15, value: 'code' },
      { label: 'Kesim Boyu', width: .14, value: (r) => mm(r.length) },
      { label: 'Adet', width: .09, value: 'qty' },
      { label: 'Açı', width: .12, value: 'angle' },
      { label: 'Açıklama', width: .17, value: 'note' }
    ];
    return splitTableDescriptors('Kesim Listesi', 'Dinamik Demo Kesim Verisi', cols, rows, { rowsPerPage: 15, rowHeight: 70 });
  }

  function accessoryDescriptors(data) {
    const rows = data.accessories.map((row, index) => ({ ...row, index: index + 1 }));
    const cols = [
      { label: '#', width: .06, value: 'index' },
      { label: 'Aksesuar', width: .30, value: 'name', bold: true },
      { label: 'Kod', width: .18, value: 'code' },
      { label: 'Adet', width: .10, value: 'qty' },
      { label: 'Birim', width: .12, value: 'unit' },
      { label: 'Açıklama', width: .24, value: 'note' }
    ];
    return splitTableDescriptors('Aksesuar Listesi', 'Ürüne Bağlı Demo Aksesuarlar', cols, rows, { rowsPerPage: 16, rowHeight: 70 });
  }

  function stockDescriptors(data) {
    const rows = data.stock.map((row, index) => ({ ...row, index: index + 1 }));
    const cols = [
      { label: '#', width: .06, value: 'index' },
      { label: 'Profil', width: .27, value: 'profile', bold: true },
      { label: 'Profil Kodu', width: .15, value: 'code' },
      { label: 'Stok Boyu', width: .13, value: (r) => mm(r.stock) },
      { label: 'Kullanılacak Adet', width: .13, value: 'qty' },
      { label: 'Tahmini Kalan', width: .14, value: (r) => mm(r.remaining) },
      { label: 'Açıklama', width: .12, value: 'note' }
    ];
    return splitTableDescriptors('Stoktan Kullanılacak Profiller', 'Stok Profilleri', cols, rows, { rowsPerPage: 15, rowHeight: 72 });
  }

  function optimizationDescriptors(data) {
    const bars = data.optimization;
    const maxVisualBars = 24;
    const visible = bars.slice(0, maxVisualBars);
    const descriptors = [];
    for (let i = 0; i < visible.length; i += 7) {
      descriptors.push({
        title: 'Kesim Optimizasyonu',
        kicker: i ? 'Stok Yerleşimi · devam' : 'Görsel Stok Yerleşimi · Demo',
        type: 'optimization',
        rows: visible.slice(i, i + 7), totalBars: bars.length, hiddenBars: Math.max(0, bars.length - maxVisualBars)
      });
    }
    return descriptors.length ? descriptors : [{ title: 'Kesim Optimizasyonu', kicker: 'Görsel Stok Yerleşimi · Demo', type: 'optimization', rows: [], totalBars: 0, hiddenBars: 0 }];
  }

  function viewDescriptors(data, views) {
    const byPreset = new Map((views || []).map((v) => [v.preset, v]));
    const ordered = [
      { preset: 'perspective', label: 'Perspektif' }, { preset: 'front', label: 'Ön Görünüş' },
      { preset: 'side', label: 'Yan Görünüş' }, { preset: 'top', label: 'Üst Görünüş' }
    ].map((item) => ({ ...item, view: byPreset.get(item.preset) }));
    return [
      { title: '3D Görselleştirme', kicker: 'Perspektif + Ön', type: '3d', views: ordered.slice(0, 2) },
      { title: '3D Görselleştirme', kicker: 'Yan + Üst', type: '3d', views: ordered.slice(2, 4) }
    ];
  }

  function twoDDescriptors(data, view2d) {
    return [{ title: '2D Teknik Görünüş', kicker: data.model.productGroup === 'pergo-rise' ? 'PLMR Web DXF / 2D' : 'Canonical Technical 2D', type: '2d', data, view: view2d || null }];
  }

  function buildDescriptors(selection, data, views, view2d) {
    const descriptors = [];
    DOCUMENTS.forEach((doc) => {
      if (!selection.has(doc.id)) return;
      if (doc.id === 'quote') descriptors.push(...quoteDescriptors(data));
      if (doc.id === 'production') descriptors.push(...productionDescriptors(data));
      if (doc.id === 'product-list') descriptors.push(...productListDescriptors(data));
      if (doc.id === '3d') descriptors.push(...viewDescriptors(data, views));
      if (doc.id === '2d') descriptors.push(...twoDDescriptors(data, view2d));
      if (doc.id === 'cut-list') descriptors.push(...cutListDescriptors(data));
      if (doc.id === 'accessories') descriptors.push(...accessoryDescriptors(data));
      if (doc.id === 'optimization') descriptors.push(...optimizationDescriptors(data));
      if (doc.id === 'stock') descriptors.push(...stockDescriptors(data));
    });
    return descriptors;
  }

  function drawCustomerPlaceholder(ctx, x, y, w, h) {
    fillRound(ctx, x, y, w, h, 8, COLORS.white);
    strokeRound(ctx, x, y, w, h, 8, '#d7e0eb');
    font(ctx, 800, 12); ctx.fillStyle = COLORS.faint; ctx.textAlign = 'center';
    ctx.fillText('MÜŞTERİ', x + w / 2, y + h / 2 + 4);
    ctx.textAlign = 'left';
  }

  function drawQuotePartyCard(ctx, x, y, w, label, name, side, brandLogo) {
    const h = 112;
    fillRound(ctx, x, y, w, h, 12, side === 'seller' ? COLORS.softBlue : COLORS.soft);
    strokeRound(ctx, x, y, w, h, 12, side === 'seller' ? '#c7dafd' : COLORS.line);
    font(ctx, 700, 11); ctx.fillStyle = COLORS.muted; ctx.fillText(label, x + 18, y + 24);
    if (side === 'seller') {
      drawBrandLogo(ctx, brandLogo, x + 18, y + 38, 126, 27);
      font(ctx, 650, 12); ctx.fillStyle = COLORS.text;
      ctx.fillText(ellipsizeText(ctx, name || 'P3DV Çözüm Merkezi', w - 180), x + 164, y + 60);
      font(ctx, 500, 11); ctx.fillStyle = COLORS.muted;
      ctx.fillText('Teklif ve proje dokümantasyonu', x + 18, y + 91);
    } else {
      drawCustomerPlaceholder(ctx, x + 18, y + 38, 92, 48);
      font(ctx, 750, 15); ctx.fillStyle = COLORS.ink;
      ctx.fillText(ellipsizeText(ctx, name || 'Müşteri', w - 142), x + 126, y + 61);
      font(ctx, 500, 11); ctx.fillStyle = COLORS.muted;
      ctx.fillText('Müşteri logosu eklenmedi', x + 126, y + 83);
    }
    return h;
  }

  function drawQuoteLineTable(ctx, x, y, w, rows) {
    const columns = [
      { label: 'Ürün', width: .30 },
      { label: 'Ölçü', width: .27 },
      { label: 'Renk', width: .17 },
      { label: 'Adet', width: .08 },
      { label: 'Demo Fiyat', width: .18 }
    ];
    const totalWeight = columns.reduce((sum, col) => sum + col.width, 0);
    const widths = columns.map((col) => w * col.width / totalWeight);
    const headerH = 46, rowH = 61;
    fillRound(ctx, x, y, w, headerH, 8, COLORS.navy);
    let cx = x;
    columns.forEach((column, index) => {
      font(ctx, 700, 11); ctx.fillStyle = COLORS.white;
      ctx.fillText(ellipsizeText(ctx, column.label, widths[index] - 14), cx + 7, y + 28);
      cx += widths[index];
    });
    let yy = y + headerH;
    (rows || []).forEach((row, rowIndex) => {
      ctx.fillStyle = rowIndex % 2 ? COLORS.soft : COLORS.white;
      ctx.fillRect(x, yy, w, rowH);
      ctx.strokeStyle = COLORS.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, yy + rowH); ctx.lineTo(x + w, yy + rowH); ctx.stroke();
      const values = [
        row.name || '-', row.size || '-', row.color || '-', String(row.qty || 1),
        money.format(row.kind === 'system' ? safeNumber(row.price) : safeNumber(row.price) * Math.max(1, safeNumber(row.qty, 1)))
      ];
      let cellX = x;
      values.forEach((value, index) => {
        font(ctx, index === 0 || index === 4 ? 700 : 550, index === 4 ? 11 : 12);
        ctx.fillStyle = index === 4 ? COLORS.navy : COLORS.text;
        if (index === 3 || index === 4) {
          ctx.textAlign = 'right';
          ctx.fillText(ellipsizeText(ctx, value, widths[index] - 14), cellX + widths[index] - 7, yy + 36);
          ctx.textAlign = 'left';
        } else {
          const lines = wrapLines(ctx, value, widths[index] - 14, index === 0 ? 2 : 1);
          lines.forEach((line, lineIndex) => ctx.fillText(line, cellX + 7, yy + 26 + lineIndex * 17));
        }
        if (index < values.length - 1) {
          ctx.strokeStyle = '#edf1f6';
          ctx.beginPath(); ctx.moveTo(cellX + widths[index], yy + 7); ctx.lineTo(cellX + widths[index], yy + rowH - 7); ctx.stroke();
        }
        cellX += widths[index];
      });
      yy += rowH;
    });
    return headerH + (rows || []).length * rowH;
  }

  function drawQuote(ctx, box, data, descriptor, brandLogo) {
    let y = box.y;
    if (descriptor.isFirst) {
      const gap = 18;
      const partyW = (box.w - gap) / 2;
      drawQuotePartyCard(ctx, box.x, y, partyW, 'SATICI / FİRMA', 'P3DV Çözüm Merkezi', 'seller', brandLogo);
      drawQuotePartyCard(ctx, box.x + partyW + gap, y, partyW, 'MÜŞTERİ', data.customer, 'customer', brandLogo);
      y += 130;

      const meta = [
        ['Teklif No', data.projectNo], ['Teklif Tarihi', data.date],
        ['Ana Sistem', data.product], ['Sistem Rengi', data.compactSystemColor]
      ];
      const metaGap = 12;
      const metaW = (box.w - metaGap * 3) / 4;
      meta.forEach((item, index) => {
        fillRound(ctx, box.x + index * (metaW + metaGap), y, metaW, 66, 9, COLORS.soft);
        font(ctx, 600, 10); ctx.fillStyle = COLORS.muted;
        ctx.fillText(ellipsizeText(ctx, item[0].toUpperCase(), metaW - 20), box.x + index * (metaW + metaGap) + 10, y + 21);
        font(ctx, 750, 13); ctx.fillStyle = COLORS.ink;
        ctx.fillText(ellipsizeText(ctx, String(item[1]), metaW - 20), box.x + index * (metaW + metaGap) + 10, y + 45);
      });
      y += 84;

      const visibleOptions = quoteDisplayOptions(data.options).slice(0, 8);
      const optionText = visibleOptions.length
        ? visibleOptions.map((item) => `${item.label}: ${item.value}`).join('  ·  ')
        : 'Standart sistem · Ek opsiyon seçilmedi';
      font(ctx, 700, 12); ctx.fillStyle = COLORS.muted; ctx.fillText('SEÇİLEN OPSİYONLAR', box.x, y + 14);
      font(ctx, 550, 12); ctx.fillStyle = COLORS.text;
      const optionLines = wrapLines(ctx, optionText, box.w, 2);
      optionLines.forEach((line, index) => ctx.fillText(line, box.x, y + 38 + index * 17));
      y += 76;
    } else {
      fillRound(ctx, box.x, y, box.w, 66, 10, COLORS.softBlue);
      font(ctx, 750, 14); ctx.fillStyle = COLORS.navy;
      ctx.fillText(`${data.projectNo} · ${data.customer}`, box.x + 18, y + 27);
      font(ctx, 500, 12); ctx.fillStyle = COLORS.muted;
      ctx.fillText('Teklif kalemleri devam ediyor.', box.x + 18, y + 49);
      y += 86;
    }

    font(ctx, 800, 19); ctx.fillStyle = COLORS.ink; ctx.fillText('Teklif Kalemleri', box.x, y + 18);
    y += 34;
    const used = drawQuoteLineTable(ctx, box.x, y, box.w, descriptor.rows || []);
    y += used + 24;

    if (descriptor.isLast) {
      const summaryH = 208;
      const leftW = box.w * .45;
      const rightX = box.x + leftW + 18;
      const rightW = box.w - leftW - 18;
      fillRound(ctx, box.x, y, leftW, summaryH, 12, COLORS.soft);
      strokeRound(ctx, box.x, y, leftW, summaryH, 12, COLORS.line);
      font(ctx, 800, 16); ctx.fillStyle = COLORS.ink; ctx.fillText('Teklif Notu', box.x + 20, y + 34);
      drawTextBlock(ctx, 'Ana sistem ve projeye eklenen yan ürünler birlikte gösterilir. Fiyatlar P3DV satış demosu için ölçü ve ürün tipine bağlı dinamik prototip değerlerdir; üretim / sipariş fiyatı değildir.', box.x + 20, y + 66, leftW - 40, 22, 6, COLORS.text, 500, 13);

      fillRound(ctx, rightX, y, rightW, summaryH, 12, COLORS.navy);
      font(ctx, 700, 12); ctx.fillStyle = '#cbd5e1'; ctx.fillText('DEMO FİYAT ÖZETİ', rightX + 22, y + 32);
      const totals = [
        ['Ara toplam', money.format(data.quote.subtotal)],
        ['KDV (Demo %20)', money.format(data.quote.vat)],
        ['GENEL TOPLAM', money.format(data.quote.total)]
      ];
      totals.forEach((line, index) => {
        const yy = y + 76 + index * 50;
        font(ctx, index === 2 ? 800 : 600, index === 2 ? 17 : 13);
        ctx.fillStyle = index === 2 ? COLORS.white : '#dbeafe';
        ctx.fillText(line[0], rightX + 22, yy);
        ctx.textAlign = 'right';
        ctx.fillText(line[1], rightX + rightW - 22, yy);
        ctx.textAlign = 'left';
      });
    } else {
      fillRound(ctx, box.x, y, box.w, 54, 9, COLORS.softBlue);
      font(ctx, 650, 12); ctx.fillStyle = COLORS.navy;
      ctx.fillText('Teklif kalemleri sonraki sayfada devam eder.', box.x + 18, y + 33);
    }
  }

  function drawProductionHeader(ctx, box, data) {
    const h = 165;
    fillRound(ctx, box.x, box.y, box.w, h, 12, COLORS.softBlue);
    const items = [
      ['Proje / Müşteri', `${data.projectName} · ${data.customer}`], ['Ürün', data.product], ['Sipariş No', data.projectNo], ['Tarih', data.date],
      ['Genişlik', mm(data.model.width)], ['Açılım', mm(data.model.depth)], ['Yükseklik', mm(data.model.height)], ['Sistem Rengi', data.systemColor],
      ['Panel Rengi', data.panelColor], ['Kullanıcı', data.salesperson]
    ];
    const colW = box.w / 2;
    items.forEach((item, index) => {
      const col = index % 2; const row = Math.floor(index / 2);
      const x = box.x + col * colW + 18; const y = box.y + 28 + row * 27;
      font(ctx, 600, 11); ctx.fillStyle = COLORS.muted; ctx.fillText(`${item[0]}:`, x, y);
      font(ctx, 700, 12); ctx.fillStyle = COLORS.ink; ctx.fillText(String(item[1]).slice(0, 55), x + 112, y);
    });
    return h + 22;
  }

  function drawOptimization(ctx, box, descriptor) {
    const rows = descriptor.rows || [];
    if (!rows.length) {
      font(ctx, 600, 18); ctx.fillStyle = COLORS.muted; ctx.fillText('Optimizasyon için kesim parçası bulunamadı.', box.x, box.y + 40); return;
    }
    let y = box.y;
    rows.forEach((bar) => {
      fillRound(ctx, box.x, y, box.w, 137, 12, COLORS.soft);
      strokeRound(ctx, box.x, y, box.w, 137, 12, COLORS.line);
      font(ctx, 750, 15); ctx.fillStyle = COLORS.ink; ctx.fillText(`${bar.code} · Stok ${mm(bar.stock)} · Çubuk ${bar.index}`, box.x + 18, y + 28);
      ctx.textAlign = 'right'; font(ctx, 700, 14); ctx.fillStyle = bar.efficiency >= 85 ? COLORS.green : COLORS.amber; ctx.fillText(`Verim %${nf1.format(bar.efficiency)} · Fire ${mm(bar.fire)}`, box.x + box.w - 18, y + 28); ctx.textAlign = 'left';
      const barX = box.x + 18, barY = y + 55, barW = box.w - 36, barH = 48;
      fillRound(ctx, barX, barY, barW, barH, 6, '#e2e8f0');
      let cursor = barX;
      const usedSegments = bar.segments;
      usedSegments.forEach((segment, index) => {
        const width = barW * segment / bar.stock;
        ctx.fillStyle = index % 2 ? '#60a5fa' : '#2563eb';
        ctx.fillRect(cursor, barY, width, barH);
        if (width > 48) {
          ctx.save(); ctx.beginPath(); ctx.rect(cursor, barY, width, barH); ctx.clip();
          font(ctx, 700, 11); ctx.fillStyle = COLORS.white; ctx.fillText(nf0.format(segment), cursor + 6, barY + 30); ctx.restore();
        }
        cursor += width;
      });
      const fireW = barW * bar.fire / bar.stock;
      if (fireW > 0) {
        ctx.fillStyle = '#cbd5e1'; ctx.fillRect(barX + barW - fireW, barY, fireW, barH);
        if (fireW > 45) { font(ctx, 700, 10); ctx.fillStyle = COLORS.text; ctx.fillText('FIRE', barX + barW - fireW + 5, barY + 30); }
      }
      font(ctx, 500, 12); ctx.fillStyle = COLORS.muted; ctx.fillText(`${usedSegments.length} parça · kullanılan ${mm(bar.used)} · kalan ${mm(bar.fire)}`, box.x + 18, y + 126);
      y += 154;
    });
    if (descriptor.hiddenBars > 0 && y < box.y + box.h - 50) {
      font(ctx, 600, 13); ctx.fillStyle = COLORS.muted; ctx.fillText(`Görsel örnek sınırı: ${descriptor.hiddenBars} ek stok çubuğu özet tabloda hesaba dahil edilmiştir.`, box.x, y + 10);
    }
  }

  function drawDimensionLine(ctx, x1, y1, x2, y2, label, vertical) {
    ctx.strokeStyle = COLORS.blue2; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const tick = 8;
    ctx.beginPath();
    if (vertical) { ctx.moveTo(x1 - tick, y1); ctx.lineTo(x1 + tick, y1); ctx.moveTo(x2 - tick, y2); ctx.lineTo(x2 + tick, y2); }
    else { ctx.moveTo(x1, y1 - tick); ctx.lineTo(x1, y1 + tick); ctx.moveTo(x2, y2 - tick); ctx.lineTo(x2, y2 + tick); }
    ctx.stroke();
    font(ctx, 700, 12); ctx.fillStyle = COLORS.blue;
    if (vertical) { ctx.save(); ctx.translate(x1 - 14, (y1 + y2) / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillText(label, 0, 0); ctx.restore(); }
    else { ctx.textAlign = 'center'; ctx.fillText(label, (x1 + x2) / 2, y1 - 12); ctx.textAlign = 'left'; }
  }

  function drawTechnicalView(ctx, x, y, w, h, title, widthValue, heightValue, partitions) {
    fillRound(ctx, x, y, w, h, 12, COLORS.soft);
    strokeRound(ctx, x, y, w, h, 12, COLORS.line);
    font(ctx, 800, 16); ctx.fillStyle = COLORS.ink; ctx.fillText(title, x + 20, y + 30);
    const pad = 68;
    const dw = w - pad * 2, dh = h - pad * 2 - 20;
    const ratio = Math.min(dw / Math.max(1, widthValue), dh / Math.max(1, heightValue));
    const rw = widthValue * ratio, rh = heightValue * ratio;
    const rx = x + (w - rw) / 2, ry = y + 60 + (dh - rh) / 2;
    ctx.strokeStyle = COLORS.navy; ctx.lineWidth = 4; ctx.strokeRect(rx, ry, rw, rh);
    if (Array.isArray(partitions) && partitions.length > 1) {
      let acc = 0;
      partitions.slice(0, -1).forEach((part) => { acc += part; const px = rx + rw * acc / partitions.reduce((s, v) => s + v, 0); ctx.strokeStyle = COLORS.faint; ctx.lineWidth = 2; ctx.beginPath();ctx.moveTo(px, ry);ctx.lineTo(px, ry + rh);ctx.stroke(); });
    }
    drawDimensionLine(ctx, rx, ry + rh + 30, rx + rw, ry + rh + 30, mm(widthValue), false);
    drawDimensionLine(ctx, rx - 34, ry, rx - 34, ry + rh, mm(heightValue), true);
  }

  async function draw2d(ctx, box, data, descriptor) {
    if (descriptor && descriptor.view && descriptor.view.dataUrl) {
      fillRound(ctx, box.x, box.y, box.w, box.h - 20, 14, COLORS.soft);
      strokeRound(ctx, box.x, box.y, box.w, box.h - 20, 14, COLORS.line);
      const img = await loadImage(descriptor.view.dataUrl);
      if (img) {
        const imageBox = { x: box.x + 22, y: box.y + 22, w: box.w - 44, h: box.h - 64 };
        const scale = Math.min(imageBox.w / Math.max(1, img.width), imageBox.h / Math.max(1, img.height));
        const dw = img.width * scale, dh = img.height * scale;
        ctx.drawImage(img, imageBox.x + (imageBox.w - dw) / 2, imageBox.y + (imageBox.h - dh) / 2, dw, dh);
        font(ctx, 600, 12); ctx.fillStyle = COLORS.muted;
        ctx.fillText(descriptor.view.source === 'canonical-technical2d' ? `${data.product} · canonical Technical 2D state` : 'PLMR Pergola Web DXF motorundan canlı üretilen 2D görünüş', box.x + 22, box.y + box.h - 22);
        return;
      }
    }
    if (['b-cube','b-cube-galaxy','bio-rise'].includes(String(data.model.productGroup || ''))) throw new Error('Canonical Technical 2D capture oluşturulamadı.');
    const widths = data.modules.map((m) => m.width);
    const topH = 430;
    drawTechnicalView(ctx, box.x, box.y, box.w, topH, 'ÖN GÖRÜNÜŞ', safeNumber(data.model.width), safeNumber(data.model.height), widths);
    const gap = 22;
    drawTechnicalView(ctx, box.x, box.y + topH + gap, (box.w - gap) / 2, 420, 'YAN GÖRÜNÜŞ', safeNumber(data.model.depth), safeNumber(data.model.height), null);
    drawTechnicalView(ctx, box.x + (box.w + gap) / 2, box.y + topH + gap, (box.w - gap) / 2, 420, 'ÜST GÖRÜNÜŞ', safeNumber(data.model.width), safeNumber(data.model.depth), widths);
    const y = box.y + topH + gap + 455;
    fillRound(ctx, box.x, y, box.w, 160, 10, COLORS.softBlue);
    font(ctx, 800, 16); ctx.fillStyle = COLORS.navy; ctx.fillText('Teknik Not', box.x + 20, y + 34);
    drawTextBlock(ctx, 'Bu sayfa P3DV kanonik ölçülerinden üretilen demo teknik görünüşüdür. Ölçü ve modül bölünmeleri proje girdileri değiştiğinde güncellenir; CAD/imalat paftası doğruluğu bu prototip kapsamının dışındadır.', box.x + 20, y + 68, box.w - 40, 24, 4, COLORS.text, 500, 14);
  }

  function loadImage(dataUrl) {
    return new Promise((resolve) => {
      if (!dataUrl) return resolve(null);
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = dataUrl;
    });
  }

  function getBrandLogo() {
    if (!brandLogoPromise) brandLogoPromise = loadImage(BRAND_LOGO_URL);
    return brandLogoPromise;
  }

  async function draw3d(ctx, box, descriptor) {
    let y = box.y;
    for (const item of descriptor.views) {
      fillRound(ctx, box.x, y, box.w, 520, 14, COLORS.soft);
      strokeRound(ctx, box.x, y, box.w, 520, 14, COLORS.line);
      font(ctx, 800, 18); ctx.fillStyle = COLORS.ink; ctx.fillText(item.label, box.x + 20, y + 34);
      const img = await loadImage(item.view && item.view.dataUrl);
      const imageBox = { x: box.x + 20, y: y + 54, w: box.w - 40, h: 438 };
      if (img) {
        const scale = Math.min(imageBox.w / img.width, imageBox.h / img.height);
        const dw = img.width * scale, dh = img.height * scale;
        ctx.drawImage(img, imageBox.x + (imageBox.w - dw) / 2, imageBox.y + (imageBox.h - dh) / 2, dw, dh);
      } else {
        font(ctx, 600, 16); ctx.fillStyle = COLORS.muted; ctx.fillText('3D görüntü alınamadı', imageBox.x + 20, imageBox.y + 50);
      }
      y += 548;
    }
  }

  async function renderDescriptor(descriptor, data, pageNo, totalPages) {
    const canvas = createCanvas();
    const ctx = canvas.getContext('2d');
    const brandLogo = await getBrandLogo();
    const box = basePage(ctx, data, descriptor.title, descriptor.kicker, pageNo, totalPages, brandLogo);
    if (descriptor.type === 'quote') drawQuote(ctx, box, data, descriptor, brandLogo);
    else if (descriptor.type === 'optimization') drawOptimization(ctx, box, descriptor);
    else if (descriptor.type === '2d') await draw2d(ctx, box, data, descriptor);
    else if (descriptor.type === '3d') await draw3d(ctx, box, descriptor);
    else if (descriptor.type === 'table') {
      let tableBox = { ...box };
      if (descriptor.productionHeader) {
        const used = drawProductionHeader(ctx, box, data);
        tableBox = { x: box.x, y: box.y + used, w: box.w, h: box.h - used };
      }
      drawTable(ctx, tableBox, descriptor);
      if (descriptor.productionHeader) {
        const total = descriptor.rows.reduce((sum, row) => sum + safeNumber(row.totalKg), 0);
        font(ctx, 700, 13); ctx.fillStyle = COLORS.muted; ctx.textAlign = 'right';
        ctx.fillText(`Bu sayfadaki yaklaşık profil ağırlığı: ${kg(total)}`, box.x + box.w, Math.min(PAGE.height - PAGE.footer - 28, tableBox.y + 58 + descriptor.rows.length * (descriptor.rowHeight || 72) + 30));
        ctx.textAlign = 'left';
      }
    }
    return canvas;
  }

  function pdfFileName(data, selection) {
    const slug = data.product.toLowerCase().replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/gi, '-').replace(/^-|-$/g, '');
    const suffix = selection.size === DOCUMENTS.length ? 'tum-dokumanlar' : selection.size === 1 ? Array.from(selection)[0] : `${selection.size}-dokuman`;
    return `P3DV.v3.86-${slug}-${data.model.width}x${data.model.depth}-${suffix}.pdf`;
  }


  function vector2DSource(descriptor) {
    const view = descriptor && descriptor.type === '2d' && descriptor.view;
    if (!view || !view.vectorTechnical2D || !view.drawing) return null;
    return view;
  }

  function drawVector2DPage(pdf, descriptor, data, pageIndex, pageTotal) {
    const view = vector2DSource(descriptor);
    const engine = window.PulumurVectorPdfEngine;
    if (!view || !engine || typeof engine.flattenDrawing !== 'function' || typeof engine.drawDrawing !== 'function') return false;
    const drawing = view.drawing;
    if (String(view.modelUnits || drawing.units || '') !== 'mm' || Number(view.modelScale == null ? drawing.modelScale : view.modelScale) !== 1) throw new Error('Technical 2D PDF model units 1:1 mm değil.');
    const flat = engine.flattenDrawing(drawing);
    const bounds = flat && flat.bounds || drawing.bounds;
    if (!bounds || !Array.isArray(flat.entities) || !flat.entities.length) throw new Error('Technical 2D PDF drawing entity seti boş.');
    const pageW = 210, pageH = 297;
    const margin = 12, top = 28, bottom = 20;
    const boxW = pageW - margin * 2, boxH = pageH - top - bottom;
    const width = Math.max(1, Number(bounds.width || (bounds.maxX - bounds.minX)) || 1);
    const height = Math.max(1, Number(bounds.height || (bounds.maxY - bounds.minY)) || 1);
    const scale = Math.min(boxW / width, boxH / height);
    const usedW = width * scale, usedH = height * scale;
    const left = margin + (boxW - usedW) / 2;
    const topY = top + (boxH - usedH) / 2;
    const transform = { scale, x: left - Number(bounds.minX || 0) * scale, y: topY + Number(bounds.maxY || 0) * scale };

    pdf.setFillColor(255,255,255); pdf.rect(0,0,pageW,pageH,'F');
    // Keep the existing PLMR document identity as vector text; only the Technical2D geometry changed from raster to shared vector drawing.
    pdf.setTextColor(23,37,84); pdf.setFont('helvetica','bold'); pdf.setFontSize(8.5); pdf.text('PLMR', margin, 7.5);
    pdf.setFontSize(12); pdf.text('2D Teknik Görünüş', margin, 13);
    pdf.setFont('helvetica','normal'); pdf.setFontSize(7.5); pdf.setTextColor(75,85,99);
    pdf.text(`${data.product} · canonical/shared vector Technical 2D`, margin, 18);
    const technicalScale = Number(view.technicalScale);
    const sourceLabel = Number.isFinite(technicalScale) && technicalScale > 0 ? `Ortak görünüş ölçeği: ${technicalScale.toFixed(6)} px/mm · DXF model: 1:1 mm` : 'DXF model: 1:1 mm';
    pdf.text(sourceLabel, margin, 22);
    pdf.text(`Sayfa ${pageIndex + 1}/${pageTotal}`, pageW - margin, 8, { align:'right' });
    pdf.setDrawColor(180,186,196); pdf.setLineWidth(0.18); pdf.rect(margin, top - 2, boxW, boxH + 4);
    engine.drawDrawing(pdf, drawing, transform, { flat, fontName: 'helvetica' });
    pdf.setFont('helvetica','normal'); pdf.setFontSize(7); pdf.setTextColor(100,110,125);
    pdf.text(`Kaynak: ${view.source || 'canonical-technical2d'} · ${drawing.schema || '-'} · ${flat.entities.length} entity`, margin, pageH - 8);
    pdf.__plmrLastVectorTechnical2D = { source: view.source || '', schema: drawing.schema || '', entityCount: flat.entities.length, modelUnits: 'mm', modelScale: 1, technicalScale: Number.isFinite(technicalScale) ? technicalScale : null, pageScale: scale };
    return true;
  }


  function documentAvailability() {
    const api = bridge();
    const raw = api && typeof api.documentCapabilities === 'function' ? api.documentCapabilities() : null;
    const availability = {};
    DOCUMENTS.forEach((doc) => { availability[doc.id] = raw && Object.prototype.hasOwnProperty.call(raw, doc.id) ? Boolean(raw[doc.id]) : true; });
    return availability;
  }

  function sanitizeSelection(selection) {
    const availability = documentAvailability();
    return new Set(Array.from(selection || []).filter((id) => DOCUMENTS.some((doc) => doc.id === id) && availability[id] !== false));
  }

  async function generate(selection) {
    const api = bridge();
    if (!api || typeof api.readModel !== 'function') throw new Error('Doküman veri köprüsü hazır değil.');
    const safeSelection = sanitizeSelection(selection);
    const model = api.readModel();
    if (typeof api.isReady === 'function' && !api.isReady()) throw new Error('Önce geçerli bir proje/çizim oluşturun.');
    const reportProducts = typeof api.readReportProducts === 'function' ? api.readReportProducts() : [];
    const data = buildDocumentData(model, reportProducts);
    let views = [];
    let view2d = null;
    if (safeSelection.has('3d')) views = typeof api.captureViews === 'function' ? await Promise.resolve(api.captureViews()) : [];
    if (safeSelection.has('2d')) view2d = typeof api.capture2DView === 'function' ? await Promise.resolve(api.capture2DView()) : null;
    const descriptors = buildDescriptors(safeSelection, data, views, view2d);
    if (!descriptors.length) throw new Error('Bu ürün için aktif en az bir doküman seçin.');
    const Pdf = window.jspdf && window.jspdf.jsPDF;
    if (!Pdf) throw new Error('P3DV PDF motoru yüklenemedi.');
    const pdf = new Pdf({ orientation: 'p', unit: 'mm', format: 'a4' });
    for (let i = 0; i < descriptors.length; i += 1) {
      if (i > 0) pdf.addPage();
      const descriptor = descriptors[i];
      const vector2D = descriptor.type === '2d' ? drawVector2DPage(pdf, descriptor, data, i, descriptors.length) : false;
      if (descriptor.type === '2d' && descriptor.view && ['canonical-technical2d','pergola-canonical-drawing'].includes(String(descriptor.view.source || '')) && !vector2D) {
        throw new Error('TECHNICAL2D_VECTOR_PDF_UNAVAILABLE: Canlı Technical 2D shared vector PDF kaynağı oluşturulamadı.');
      }
      if (!vector2D) {
        const canvas = await renderDescriptor(descriptor, data, i + 1, descriptors.length);
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.91), 'JPEG', 0, 0, 210, 297);
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    pdf.save(pdfFileName(data, safeSelection));
    return { pages: descriptors.length, data, selection: Array.from(safeSelection) };
  }

  function updatePanelState() {
    if (!panel) return;
    const availability = documentAvailability();
    const boxes = Array.from(panel.querySelectorAll('input[data-doc-id]'));
    boxes.forEach((box) => {
      const enabled = availability[box.dataset.docId] !== false;
      box.disabled = !enabled;
      if (!enabled) box.checked = false;
      const option = box.closest('.p3dv-document-option');
      if (option) option.classList.toggle('is-unavailable', !enabled);
    });
    const enabledBoxes = boxes.filter((box) => !box.disabled);
    const selected = enabledBoxes.filter((box) => box.checked);
    const all = panel.querySelector('#p3dvDocumentAll');
    const button = panel.querySelector('#p3dvDocumentCreate');
    if (all) {
      all.checked = enabledBoxes.length > 0 && selected.length === enabledBoxes.length;
      all.indeterminate = selected.length > 0 && selected.length < enabledBoxes.length;
    }
    if (button) button.disabled = busy || selected.length === 0;
    const count = panel.querySelector('#p3dvDocumentSelectedCount');
    if (count) count.textContent = selected.length ? `${selected.length} doküman seçildi` : 'Doküman seçin';
  }

  function selectionFromPanel() {
    return new Set(Array.from(panel.querySelectorAll('input[data-doc-id]:checked:not(:disabled)')).map((box) => box.dataset.docId));
  }

  function close() {
    if (!panel || busy) return;
    panel.hidden = true;
    if (anchorButton) anchorButton.setAttribute('aria-expanded', 'false');
  }

  function position() {
    if (!panel || !anchorButton || panel.hidden) return;
    const rect = anchorButton.getBoundingClientRect();
    const width = Math.min(438, window.innerWidth - 24);
    panel.style.width = `${width}px`;
    const left = clamp(rect.right - width, 12, Math.max(12, window.innerWidth - width - 12));
    const maxTop = Math.max(12, window.innerHeight - panel.offsetHeight - 12);
    const preferredTop = rect.bottom + 10;
    panel.style.left = `${left}px`;
    panel.style.top = `${Math.min(preferredTop, maxTop)}px`;
  }

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'p3dv-document-center';
    panel.id = 'p3dvDocumentCenter';
    panel.hidden = true;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Dokümanları Seç');
    panel.innerHTML = `
      <div class="p3dv-document-center-head">
        <div><strong>Dokümanları Seç</strong><span>Tek PDF · çoklu bölüm</span></div>
        <button type="button" class="p3dv-document-close" aria-label="Kapat">×</button>
      </div>
      <div class="p3dv-document-grid">
        ${DOCUMENTS.map((doc) => `<label class="p3dv-document-option"><input type="checkbox" data-doc-id="${doc.id}"><span class="p3dv-document-check"></span><b>${doc.label}</b></label>`).join('')}
        <label class="p3dv-document-option p3dv-document-all"><input type="checkbox" id="p3dvDocumentAll"><span class="p3dv-document-check"></span><b>Hepsi</b></label>
      </div>
      <div class="p3dv-document-center-foot">
        <span id="p3dvDocumentSelectedCount">Doküman seçin</span>
        <button type="button" id="p3dvDocumentCreate" disabled><span class="p3dv-document-create-label">PDF Oluştur</span><span class="p3dv-document-spinner" aria-hidden="true"></span></button>
      </div>`;
    document.body.appendChild(panel);
    panel.querySelector('.p3dv-document-close').addEventListener('click', close);
    panel.querySelectorAll('input[data-doc-id]').forEach((box) => box.addEventListener('change', updatePanelState));
    panel.querySelector('#p3dvDocumentAll').addEventListener('change', (event) => {
      panel.querySelectorAll('input[data-doc-id]:not(:disabled)').forEach((box) => { box.checked = event.target.checked; });
      updatePanelState();
    });
    panel.querySelector('#p3dvDocumentCreate').addEventListener('click', async () => {
      if (busy) return;
      const selection = selectionFromPanel();
      if (!selection.size) return;
      busy = true;
      const createButton = panel.querySelector('#p3dvDocumentCreate');
      const label = panel.querySelector('.p3dv-document-create-label');
      panel.classList.add('is-busy');
      createButton.disabled = true;
      label.textContent = 'PDF Hazırlanıyor';
      try {
        const result = await generate(selection);
        panel.dataset.lastPageCount = String(result.pages);
        panel.dataset.lastSelection = result.selection.join(',');
        label.textContent = 'PDF Oluşturuldu';
        setTimeout(() => { if (!busy && label) label.textContent = 'PDF Oluştur'; }, 1000);
      } catch (error) {
        console.error('P3DV Doküman Merkezi PDF hatası', error);
        window.alert(error && error.message ? error.message : 'PDF oluşturulamadı.');
        label.textContent = 'PDF Oluştur';
      } finally {
        busy = false;
        panel.classList.remove('is-busy');
        updatePanelState();
      }
    });
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    document.addEventListener('pointerdown', (event) => {
      if (!panel || panel.hidden || busy) return;
      if (panel.contains(event.target) || (anchorButton && anchorButton.contains(event.target))) return;
      close();
    });
    return panel;
  }

  function open(button) {
    const api = bridge();
    if (!api || typeof api.isReady !== 'function' || !api.isReady()) {
      window.alert('Önce geçerli bir proje/çizim oluşturun.');
      return;
    }
    anchorButton = button || document.getElementById('toolbarPdfBtn');
    const target = ensurePanel();
    if (!target.hidden) { close(); return; }
    target.hidden = false;
    if (anchorButton) anchorButton.setAttribute('aria-expanded', 'true');
    updatePanelState();
    requestAnimationFrame(position);
  }

  window.P3DVDocumentCenter = Object.freeze({
    open,
    close,
    generateFromSelection: async (ids) => generate(new Set((ids || []).filter((id) => DOCUMENTS.some((doc) => doc.id === id)))),
    documentIds: DOCUMENTS.map((item) => item.id),
    availabilityForTest: () => ({ ...documentAvailability() }),
    refreshAvailability: () => updatePanelState(),
    buildDataForTest: (model, reportProducts) => buildDocumentData(
      model,
      Array.isArray(reportProducts) ? reportProducts : (bridge() && typeof bridge().readReportProducts === 'function' ? bridge().readReportProducts() : [])
    )
  });
})();
