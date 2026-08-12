(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const app = window.PulumurStandaloneApp;
  const model = window.PulumurStandaloneProject;
  const packageModel = window.PulumurProductionPackageModel;
  const registry = window.PulumurProductionProfileRegistry;
  const stockModel = window.PulumurAlbertGenauPilotStock;
  const rules = window.PulumurAlbertGenauSlidingRules;
  const optimizer = window.PulumurDeterministicCutOptimizer;
  const xlsxWriter = window.PulumurProductionXlsxWriter;
  const profile = registry.requireProfile('albert-genau-sliding-pilot-v1');
  const dialog = $('productionDialog');
  let activeTab = 'summary';

  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = value => new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(Number(value) || 0);
  const safeName = value => String(value || 'PLMR-URETIM').replace(/[^A-Za-z0-9ÇĞİÖŞÜçğıöşü_-]+/g, '-').replace(/^-+|-+$/g, '');
  function download(name, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function currentProject() { return app.getProject(); }
  function productionState(project) {
    if (!project.production || project.production.pilotProfileId !== profile.id) {
      project.production = { pilotProfileId: profile.id, options: { ...profile.defaults, stockRevision: 1 }, stock: [], package: null };
    }
    project.production.options = { ...profile.defaults, stockRevision: 1, ...(project.production.options || {}) };
    return project.production;
  }
  function optionsFromControls(state) {
    return {
      ...state.options,
      ralCode: $('productionRal').value.trim() || profile.defaults.ralCode,
      surface: $('productionSurface').value,
      extraRailCount: Math.max(0, Math.trunc(Number($('productionExtraRail').value) || 0)),
      horizontalAdjustmentProfile: $('productionAdjustment').checked,
      insectScreen: false,
      shortageAcceptedForOrder: true
    };
  }
  function syncControls(state) {
    const options = state.options || profile.defaults;
    $('productionRal').value = options.ralCode || profile.defaults.ralCode;
    $('productionSurface').value = options.surface || profile.defaults.surface;
    $('productionExtraRail').value = Number(options.extraRailCount) || 0;
    $('productionAdjustment').checked = Boolean(options.horizontalAdjustmentProfile);
    $('productionInsect').checked = false;
  }
  function applyPilotDefaults(project) {
    let changed = 0;
    (project.positions || []).forEach(position => {
      if (position.productType !== 'SLIDING') return;
      const before = model.resolveOptions(project, position);
      model.setPositionOptions(project, position, { series: 'A SERIES', type: 'WITH THRESHOLD', openingType: 'SIDE OPENING', glassThickness: '10 MM' });
      const after = model.resolveOptions(project, position);
      if (JSON.stringify(before) !== JSON.stringify(after)) changed += 1;
    });
    if (changed) app.draw({ quiet: true, renderValidation: true });
    return changed;
  }
  function ensureStock(state) {
    if (!Array.isArray(state.stock) || !state.stock.length) state.stock = stockModel.createDefaultStock(profile, state.options);
    state.stock = stockModel.recolor(state.stock, state.options);
    return state.stock;
  }
  function generatePackage() {
    const project = currentProject();
    const state = productionState(project);
    state.options = optionsFromControls(state);
    ensureStock(state);
    const generated = rules.generate(project, model, profile, state.options);
    const optimizationResult = optimizer.optimize(generated.cutItems, state.stock);
    const errors = [...generated.errors];
    const warnings = [...generated.warnings];
    if (!optimizationResult.conservationValid) errors.push({ code: 'CUT_CONSERVATION_FAILED', message: 'Kesim koruma eşitliği sağlanamadı.' });
    if (optimizationResult.unassignedCount) warnings.push({ code: 'STOCK_SHORTAGE_ACCEPTED', message: `${optimizationResult.unassignedCount} kesim stok yetersizliği nedeniyle satın alma listesine aktarıldı. Pilot kararına göre sipariş durumunu engellemez.` });
    const generatedFromHash = packageModel.sourceHash(project, model, profile.id, state.options);
    const pkg = packageModel.createPackage({
      pilotProfileId: profile.id,
      company: profile.company,
      productType: profile.productType,
      projectInfo: project.projectInfo,
      sourceProjectId: project.projectInfo && project.projectInfo.projectCode,
      sourceRevision: project.projectInfo && project.projectInfo.revision,
      generatedFromHash,
      status: errors.length ? 'VALIDATION_REQUIRED' : 'READY_TO_ORDER',
      validation: { errors, warnings },
      options: state.options,
      positions: generated.positions,
      cutItems: generated.cutItems,
      accessoryItems: generated.accessoryItems,
      glassItems: generated.glassItems,
      stockItems: state.stock,
      optimizationResult,
      purchaseNeeds: optimizationResult.unassignedCuts,
      approvals: { stockShortageAccepted: true, accessoriesExcluded: true, insectScreenExcluded: true },
      exports: { xlsxAvailable: errors.length === 0, jsonAvailable: true, workbookProfile: profile.workbookVersion }
    });
    pkg.ruleCatalog = generated.ruleCatalog;
    state.package = pkg;
    renderAll(pkg);
    return pkg;
  }

  function kpiCard(label, value, meta, tone) {
    return `<article class="production-kpi ${tone || ''}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(meta || '')}</small></article>`;
  }
  function renderKpis(pkg) {
    const opt = pkg.optimizationResult || {};
    const cutQty = (pkg.cutItems || []).reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const glassQty = (pkg.glassItems || []).reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    $('productionKpis').innerHTML = [
      kpiCard('Üretim durumu', pkg.status === 'READY_TO_ORDER' ? 'Siparişe Hazır' : 'Doğrulama Gerekli', profile.system, pkg.status === 'READY_TO_ORDER' ? 'success' : 'danger'),
      kpiCard('Kesim', `${fmt(cutQty)} adet`, `${pkg.cutItems.length} detay satırı`),
      kpiCard('Cam', `${fmt(glassQty)} adet`, '10 mm temperli'),
      kpiCard('Stok çubuğu', fmt(opt.stockBarsUsed), `${fmt(opt.wasteTotal)} mm fire`),
      kpiCard('Satın alma', fmt(opt.unassignedCount), opt.unassignedCount ? 'stok dışı kesim' : 'stok yeterli', opt.unassignedCount ? 'warning' : 'success')
    ].join('');
    const badge = $('productionStatusBadge');
    badge.textContent = pkg.status;
    badge.className = `production-status ${pkg.status === 'READY_TO_ORDER' ? 'ready' : 'required'}`;
  }
  function validationHtml(pkg) {
    const errors = (pkg.validation && pkg.validation.errors) || [];
    const warnings = (pkg.validation && pkg.validation.warnings) || [];
    return `<div class="production-validation-grid"><section><h3>Doğrulama</h3>${errors.length ? errors.map(item => `<div class="production-alert error"><strong>${esc(item.code)}</strong><span>${esc(item.message)}</span></div>`).join('') : '<div class="production-alert success"><strong>GEÇERLİ</strong><span>Tüm SLIDEMASTER 10 side opening pozları üretime hazır.</span></div>'}</section><section><h3>Pilot Notları</h3>${warnings.map(item => `<div class="production-alert warning"><strong>${esc(item.code)}</strong><span>${esc(item.message)}</span></div>`).join('')}</section></div>`;
  }
  function table(headers, rows, className) {
    return `<div class="production-table-wrap"><table class="production-table ${className || ''}"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  }
  function renderSummary(pkg) {
    const positionCards = (pkg.positions || []).map(pos => `<article class="position-production-card"><div><span>${esc(pos.positionNo)}</span><strong>${fmt(pos.width)} × ${fmt(pos.height)} mm</strong></div><dl><dt>Adet</dt><dd>${fmt(pos.quantity)}</dd><dt>Panel</dt><dd>${fmt(pos.productOptions.panelCount)}</dd><dt>Cam</dt><dd>${fmt(pos.glass.width)} × ${fmt(pos.glass.height)}</dd><dt>Renk</dt><dd>${esc(pos.color.ralCode)} · ${esc(pos.color.surface)}</dd></dl></article>`).join('');
    return `<div class="production-summary-banner"><div><span>ÜRETİM PAKETİ</span><h3>${esc(pkg.projectInfo.projectCode || pkg.projectInfo.projectName || 'İsimsiz Proje')}</h3><p>${esc(pkg.company.name)} · ${esc(profile.system)} · SIDE OPENING · 10 MM</p></div><div class="production-hash"><span>KAYNAK HASH</span><code>${esc(pkg.generatedFromHash)}</code></div></div>${validationHtml(pkg)}<h3 class="production-section-title">Pozlar</h3><div class="position-production-grid">${positionCards || '<p>Poz yok.</p>'}</div>`;
  }
  function renderCuts(pkg) {
    const grouped = rules.groupCutItems(pkg.cutItems);
    const detailRows = (pkg.cutItems || []).map(row => `<tr><td>${esc(row.positionNo)}</td><td><strong>${esc(row.profileCode)}</strong></td><td>${esc(row.profileName)}</td><td class="num">${fmt(row.cutLength)}</td><td class="num">${fmt(row.quantity)}</td><td>${esc(row.color)}</td><td>${esc(row.surface)}</td><td><code>${esc(row.sourceRule)}</code></td></tr>`);
    const groupedRows = grouped.map(row => `<tr><td>${esc(row.positionNo)}</td><td><strong>${esc(row.profileCode)}</strong></td><td>${esc(row.profileName)}</td><td class="num">${fmt(row.cutLength)}</td><td class="num strong">${fmt(row.quantity)}</td><td>${esc(row.color)}</td><td>${esc(row.surface)}</td></tr>`);
    return `<div class="production-split-title"><div><span>GRUPLANMIŞ</span><h3>Aynı Profil ve Ölçüler</h3></div><strong>${grouped.length} satır</strong></div>${table(['Pozlar','Kod','Profil','Boy (mm)','Toplam Adet','RAL','Yüzey'], groupedRows)}<div class="production-split-title"><div><span>DETAYLI</span><h3>Poz Bazlı Kesim Listesi</h3></div><strong>${pkg.cutItems.length} satır</strong></div>${table(['Poz','Kod','Profil','Boy (mm)','Adet','RAL','Yüzey','Kural'], detailRows)}`;
  }
  function renderGlass(pkg) {
    const rows = (pkg.glassItems || []).map(row => `<tr><td>${esc(row.positionNo)}</td><td><strong>${esc(row.glassCode)}</strong></td><td>${esc(row.color)}</td><td class="num">${fmt(row.thickness)}</td><td class="num">${fmt(row.width)}</td><td class="num">${fmt(row.height)}</td><td class="num strong">${fmt(row.quantity)}</td><td><span class="mini-badge">TEMPER</span></td><td><code>${esc(row.sourceRule)}</code></td></tr>`);
    return `<div class="production-split-title"><div><span>CAM SİPARİŞ</span><h3>10 mm Temperli Cam</h3></div><strong>${fmt(rows.length)} poz satırı</strong></div>${table(['Poz','Cam Kodu','Renk','Kalınlık','Genişlik','Yükseklik','Adet','İşlem','Kural'], rows)}`;
  }
  function renderStock(pkg) {
    const rows = (pkg.stockItems || []).map((row, index) => `<tr data-stock-index="${index}"><td><strong>${esc(row.stockCode)}</strong></td><td>${esc(row.profileCode)}</td><td>${esc(row.profileName)}</td><td class="num">${fmt(row.stockLength)}</td><td><input class="stock-quantity" type="number" min="0" max="9999" value="${Number(row.availableQuantity) || 0}" aria-label="${esc(row.stockCode)} mevcut adet" /></td><td class="num">${fmt(row.kerf)}</td><td class="num">${fmt(row.startTrim)} / ${fmt(row.endTrim)}</td><td class="num">${fmt(row.minimumReusableOffcut)}</td><td>${esc(row.color)}</td><td>${esc(row.surface)}</td></tr>`);
    return `<div class="production-split-title"><div><span>DÜZENLENEBİLİR PİLOT STOK</span><h3>6 m ve 7 m Profil Çubukları</h3></div><button id="productionStockReset" type="button" class="secondary">Varsayılan 80 Adede Dön</button></div><div class="production-info-strip">Testere payı her kesim için <strong>3 mm</strong>; baş ve son temizleme <strong>10 + 10 mm</strong>; minimum kullanılabilir artık <strong>300 mm</strong>.</div>${table(['Stok Kodu','Profil','Açıklama','Boy','Mevcut Adet','Testere','Baş / Son','Min. Artık','RAL','Yüzey'], rows, 'stock-table')}`;
  }
  function renderOptimization(pkg) {
    const opt = pkg.optimizationResult || {};
    const rows = (opt.bars || []).map(bar => `<tr><td><span class="bar-number">${bar.barNo}</span></td><td><strong>${esc(bar.stockCode)}</strong><br><small>${esc(bar.profileCode)}</small></td><td class="num">${fmt(bar.stockLength)}</td><td><div class="cut-sequence">${bar.cuts.map(cut => `<span title="${esc(cut.positionNo)}">${fmt(cut.cutLength)}</span>`).join('<i>+3</i>')}</div><small>${bar.cuts.map(cut => esc(cut.positionNo)).join(' · ')}</small></td><td class="num">${fmt(bar.kerfTotal)}</td><td class="num">${fmt(bar.remaining)}</td><td class="num ${bar.waste ? 'danger-text' : ''}">${fmt(bar.waste)}</td><td class="num ${bar.reusableOffcut ? 'success-text' : ''}">${fmt(bar.reusableOffcut)}</td></tr>`);
    return `<div class="production-split-title"><div><span>${esc(opt.algorithm || '')}</span><h3>Deterministik Kesim Yerleşimi</h3></div><strong>${fmt(opt.assignedCuts)} / ${fmt(opt.totalCuts)} kesim atandı</strong></div><div class="production-info-strip">Koruma eşitliği: <strong>${opt.conservationValid ? 'DOĞRULANDI' : 'HATA'}</strong> · Atanan ${fmt(opt.assignedCuts)} + Atanamayan ${fmt(opt.unassignedCount)} = Toplam ${fmt(opt.totalCuts)}</div>${table(['Çubuk','Stok','Boy','Kesim Dizisi / Poz','Bıçak','Kalan','Fire','Kullanılabilir Artık'], rows)}`;
  }
  function renderPurchase(pkg) {
    const cuts = (pkg.optimizationResult && pkg.optimizationResult.unassignedCuts) || [];
    if (!cuts.length) return '<div class="production-empty success"><strong>Stok yeterli</strong><p>Satın alma listesine aktarılan kesim bulunmuyor.</p></div>';
    const rows = cuts.map(cut => `<tr><td><span class="mini-badge warning">SATIN ALMA</span></td><td>${esc(cut.positionNo)}</td><td><strong>${esc(cut.profileCode)}</strong></td><td>${esc(cut.profileName)}</td><td class="num">${fmt(cut.cutLength)}</td><td>${esc(cut.color)} · ${esc(cut.surface)}</td><td>${esc(cut.reason)}</td></tr>`);
    return `<div class="production-info-strip warning">Pilot kararına göre stok eksikleri satın alma ihtiyacına dönüşür ve paket <strong>READY_TO_ORDER</strong> olabilir.</div>${table(['Durum','Poz','Kod','Profil','Boy','RAL / Yüzey','Neden'], rows)}`;
  }
  function renderRules(pkg) {
    const rows = (pkg.ruleCatalog || []).map(rule => `<tr><td><code>${esc(rule.id)}</code></td><td><strong>${esc(rule.code)}</strong></td><td>${esc(rule.name)}</td><td>${esc(rule.formula)}</td><td>${esc(rule.quantity)}</td></tr>`);
    return `<div class="production-split-title"><div><span>TEKNİK MANUEL EŞLEMESİ</span><h3>Onaylı Pilot Üretim Kuralları</h3></div><strong>${rows.length} kural</strong></div>${table(['Kural Kimliği','Kod','Profil / Cam','Ölçü Formülü','Adet Formülü'], rows)}<div class="production-info-strip">Ekstra ray hesaplanmaz. Sineklik ve aksesuarlar bu sürümün üretim kural kataloğuna dahil değildir.</div>`;
  }
  function renderContent(pkg) {
    const views = { summary: renderSummary, cuts: renderCuts, glass: renderGlass, stock: renderStock, optimization: renderOptimization, purchase: renderPurchase, rules: renderRules };
    $('productionContent').innerHTML = (views[activeTab] || renderSummary)(pkg);
    const reset = $('productionStockReset');
    if (reset) reset.addEventListener('click', () => {
      const project = currentProject(); const state = productionState(project);
      state.options.stockRevision = Number(state.options.stockRevision || 1) + 1;
      state.stock = stockModel.createDefaultStock(profile, state.options);
      generatePackage();
    });
    $('productionContent').querySelectorAll('.stock-quantity').forEach(input => input.addEventListener('change', event => {
      const tr = event.target.closest('[data-stock-index]'); const index = Number(tr && tr.dataset.stockIndex);
      const project = currentProject(); const state = productionState(project);
      if (!state.stock[index]) return;
      state.stock[index].availableQuantity = Math.max(0, Math.trunc(Number(event.target.value) || 0));
      state.options.stockRevision = Number(state.options.stockRevision || 1) + 1;
      generatePackage();
    }));
  }
  function renderAll(pkg) { renderKpis(pkg); renderContent(pkg); }

  function openProduction() {
    const project = currentProject();
    const changed = applyPilotDefaults(project);
    const state = productionState(project);
    syncControls(state);
    dialog.showModal();
    const pkg = generatePackage();
    $('productionFooterNote').textContent = changed ? `${changed} Sürme pozuna SLIDEMASTER 10 / SIDE OPENING / 10 MM pilot varsayılanı uygulandı.` : 'Makrolar, ActiveX ve harici Excel bağlantıları kullanılmaz.';
    return pkg;
  }

  $('productionBtn').addEventListener('click', openProduction);
  $('productionCloseBtn').addEventListener('click', () => dialog.close());
  $('productionGenerateBtn').addEventListener('click', generatePackage);
  $('productionTabs').addEventListener('click', event => {
    const button = event.target.closest('[data-tab]'); if (!button) return;
    activeTab = button.dataset.tab;
    $('productionTabs').querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button));
    const state = productionState(currentProject());
    if (state.package) renderContent(state.package);
  });
  $('productionXlsxBtn').addEventListener('click', () => {
    try {
      const pkg = generatePackage();
      if (pkg.validation.errors.length) throw new Error('XLSX için üretim doğrulama hatalarını giderin.');
      const projectCode = pkg.projectInfo.projectCode || pkg.projectInfo.projectName || 'PLMR';
      download(`${safeName(projectCode)}-SLIDEMASTER10-URETIM.xlsx`, xlsxWriter.createWorkbook(pkg, profile), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      $('productionFooterNote').textContent = 'Makrosuz sipariş workbook’u oluşturuldu.';
    } catch (error) { $('productionFooterNote').textContent = error.message; }
  });
  $('productionJsonBtn').addEventListener('click', () => {
    const pkg = generatePackage();
    const projectCode = pkg.projectInfo.projectCode || pkg.projectInfo.projectName || 'PLMR';
    download(`${safeName(projectCode)}-PRODUCTION.json`, JSON.stringify(pkg, null, 2), 'application/json;charset=utf-8');
    $('productionFooterNote').textContent = 'Production Package JSON oluşturuldu.';
  });
  ['productionRal','productionSurface','productionExtraRail','productionAdjustment'].forEach(id => $(id).addEventListener('change', () => {
    const state = productionState(currentProject());
    const previousColor = `${state.options.ralCode}|${state.options.surface}`;
    state.options = optionsFromControls(state);
    if (`${state.options.ralCode}|${state.options.surface}` !== previousColor) state.options.stockRevision = Number(state.options.stockRevision || 1) + 1;
  }));

  window.PulumurStandaloneProductionUI = { open: openProduction, generatePackage, renderAll };
})();
