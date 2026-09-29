(function (root) {
  'use strict';

  const $ = id => document.getElementById(id);
  const TYPE = root.PulumurMaterialMaster && root.PulumurMaterialMaster.TYPE || { PROFILE: 'PROFİL', ACCESSORY: 'AKSESUAR', SYSTEM: 'SİSTEM', GLASS: 'CAM', OTHER: 'DİĞER' };
  const store = root.PulumurMaterialMaster && root.PulumurMaterialMaster.store;
  let activeView = 'profiles';
  let initialized = false;
  let currentRows = [];
  let editingId = '';
  let pendingImage = undefined;

  const VIEW = Object.freeze({
    profiles: { title: 'Profiller', subtitle: 'Malzeme Ana Kataloğu · Profil kayıtları', type: TYPE.PROFILE },
    accessories: { title: 'Aksesuarlar', subtitle: 'Malzeme Ana Kataloğu · Aksesuar ve sarf kayıtları', type: TYPE.ACCESSORY },
    systems: { title: 'Sistemler', subtitle: 'Malzeme Ana Kataloğu · Sistem kayıtları', type: TYPE.SYSTEM },
    all: { title: 'Tüm Malzemeler', subtitle: 'Malzeme Ana Kataloğu', type: '' }
  });

  function text(value) { return value == null ? '' : String(value); }
  function formatNumber(value, digits) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: digits == null ? 3 : digits }) : '—';
  }
  function escapeAttr(value) { return text(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

  function ensureShell() {
    const host = $('erpMaterialsPanel');
    if (!host || host.dataset.catalogReady === '1') return host;
    host.dataset.catalogReady = '1';
    host.innerHTML = `
      <div class="material-catalog-head">
        <div>
          <span class="material-catalog-kicker">ÜRÜNLER</span>
          <h2 id="materialCatalogTitle">Profiller</h2>
          <p id="materialCatalogSubtitle">Malzeme Ana Kataloğu</p>
        </div>
        <button id="materialCatalogAddBtn" type="button" class="erp-action erp-action-primary">+ Yeni Malzeme</button>
      </div>
      <div class="material-catalog-toolbar">
        <label class="material-search-wrap">
          <span>Arama</span>
          <input id="materialCatalogSearch" type="search" autocomplete="off" spellcheck="false" placeholder="Kod, açıklama, kategori, birim…" />
        </label>
        <div id="materialCatalogStats" class="material-catalog-stats"></div>
      </div>
      <div id="materialCatalogStatus" class="material-catalog-status" role="status" aria-live="polite"></div>
      <div class="material-table-wrap">
        <table class="material-table" aria-label="Malzeme ana kataloğu">
          <thead><tr>
            <th>Görsel</th><th>Kod</th><th>Türkçe Açıklama</th><th>İngilizce Açıklama</th><th>Kategori 1</th><th>Kategori 2</th><th>Kategori 3</th><th>Birim</th><th>Birim Ağırlık</th><th>Maliyet</th><th>Satış Fiyatı</th><th></th>
          </tr></thead>
          <tbody id="materialCatalogBody"></tbody>
        </table>
        <div id="materialCatalogEmpty" class="material-catalog-empty" hidden></div>
      </div>
      <dialog id="materialEditorDialog" class="material-editor-dialog">
        <form id="materialEditorForm" class="material-editor-card">
          <div class="material-editor-head">
            <div><span class="material-catalog-kicker">MALZEME KAYDI</span><h2 id="materialEditorTitle">Yeni Malzeme</h2></div>
            <button id="materialEditorClose" type="button" class="icon-btn" aria-label="Kapat">×</button>
          </div>
          <div class="material-editor-grid">
            <label><span>Malzeme Türü *</span><select id="materialFieldType" required><option>PROFİL</option><option>AKSESUAR</option><option>SİSTEM</option><option>CAM</option><option>DİĞER</option></select></label>
            <label><span>Kod *</span><input id="materialFieldCode" required autocomplete="off" /></label>
            <label class="span-2"><span>Türkçe Açıklama *</span><input id="materialFieldDescriptionTr" required autocomplete="off" /></label>
            <label class="span-2"><span>İngilizce Açıklama</span><input id="materialFieldDescriptionEn" autocomplete="off" /></label>
            <label><span>Kategori 1</span><input id="materialFieldCategory1" autocomplete="off" /></label>
            <label><span>Kategori 2</span><input id="materialFieldCategory2" autocomplete="off" /></label>
            <label><span>Kategori 3</span><input id="materialFieldCategory3" autocomplete="off" /></label>
            <label><span>Birim *</span><input id="materialFieldUnit" required autocomplete="off" placeholder="AD / MTR / KG/MTR / SET…" /></label>
            <label><span>Birim Ağırlık</span><input id="materialFieldUnitWeight" type="number" min="0" step="any" value="0" /></label>
            <label><span>Maliyet</span><input id="materialFieldCost" type="number" min="0" step="any" value="0" /></label>
            <label><span>Satış Fiyatı</span><input id="materialFieldSalePrice" type="number" min="0" step="any" value="0" /></label>
            <label class="span-2 material-image-field"><span>Görsel</span><input id="materialFieldImage" type="file" accept="image/png,image/jpeg,image/webp" /><small>PNG/JPG/WebP · en fazla 1.5 MB. Mevcut görsel seçilmezse korunur.</small></label>
            <div class="material-image-preview-wrap"><img id="materialImagePreview" alt="Malzeme görsel önizlemesi" hidden /><span id="materialImagePlaceholder">Görsel yok</span></div>
          </div>
          <p id="materialEditorMessage" class="material-editor-message" role="alert" aria-live="assertive"></p>
          <div class="material-editor-actions"><button id="materialEditorCancel" type="button" class="secondary-btn">İptal</button><button type="submit" class="primary-btn">Kaydet</button></div>
        </form>
      </dialog>`;
    bindShell();
    return host;
  }

  function setStatus(message, isError) {
    const node = $('materialCatalogStatus');
    if (!node) return;
    node.textContent = message || '';
    node.classList.toggle('is-error', Boolean(isError));
  }

  function setEditorMessage(message) {
    const node = $('materialEditorMessage'); if (node) node.textContent = message || '';
  }

  function viewConfig() { return VIEW[activeView] || VIEW.profiles; }

  function imageCell(row) {
    const wrap = document.createElement('div'); wrap.className = 'material-thumb-wrap';
    if (row.image) {
      const img = document.createElement('img'); img.className = 'material-thumb'; img.src = row.image; img.alt = `${row.code} ${row.descriptionTr || ''}`.trim(); img.loading = 'lazy';
      img.addEventListener('error', () => { img.hidden = true; wrap.classList.add('is-missing'); });
      wrap.appendChild(img);
    } else wrap.classList.add('is-missing');
    return wrap;
  }

  function appendTextCell(tr, value, className) {
    const td = document.createElement('td'); if (className) td.className = className; td.textContent = value == null || value === '' ? '—' : text(value); tr.appendChild(td);
  }

  function renderRows(rows) {
    const body = $('materialCatalogBody');
    const empty = $('materialCatalogEmpty');
    if (!body || !empty) return;
    body.replaceChildren();
    if (!rows.length) {
      empty.hidden = false;
      empty.textContent = activeView === 'systems'
        ? 'Henüz sistem kaydı yok. Sistemler menüsü korunmuştur; yeni bir sistem kaydı “Yeni Malzeme” ile eklenebilir.'
        : 'Arama veya filtreyle eşleşen kayıt bulunamadı.';
      return;
    }
    empty.hidden = true;
    rows.forEach(row => {
      const tr = document.createElement('tr'); tr.dataset.materialId = row.materialId;
      const imageTd = document.createElement('td'); imageTd.appendChild(imageCell(row)); tr.appendChild(imageTd);
      appendTextCell(tr, row.code, 'material-code-cell');
      appendTextCell(tr, row.descriptionTr);
      appendTextCell(tr, row.descriptionEn);
      appendTextCell(tr, row.category1);
      appendTextCell(tr, row.category2);
      appendTextCell(tr, row.category3);
      appendTextCell(tr, row.unit);
      appendTextCell(tr, formatNumber(row.unitWeight, 3), 'material-number-cell');
      appendTextCell(tr, formatNumber(row.cost, 4), 'material-number-cell');
      appendTextCell(tr, formatNumber(row.salePrice, 4), 'material-number-cell');
      const action = document.createElement('td'); action.className = 'material-row-actions';
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'material-edit-btn'; edit.textContent = 'Düzenle'; edit.addEventListener('click', () => openEditor(row.materialId));
      action.appendChild(edit); tr.appendChild(action); body.appendChild(tr);
    });
  }

  async function render() {
    ensureShell();
    if (!store) { setStatus('Malzeme veri katmanı yüklenemedi.', true); return; }
    const cfg = viewConfig();
    const title = $('materialCatalogTitle'); const subtitle = $('materialCatalogSubtitle');
    if (title) title.textContent = cfg.title;
    if (subtitle) subtitle.textContent = cfg.subtitle;
    const query = $('materialCatalogSearch') ? $('materialCatalogSearch').value : '';
    try {
      setStatus('Malzemeler yükleniyor…', false);
      const [rows, stats] = await Promise.all([store.list({ materialType: cfg.type, query }), store.stats()]);
      currentRows = rows;
      renderRows(rows);
      const statsNode = $('materialCatalogStats');
      if (statsNode) statsNode.textContent = `Toplam ${stats.total} · ${stats.profiles} profil · ${stats.accessories} aksesuar · ${stats.glass} cam`;
      const ctx = store.context();
      setStatus(`${rows.length} kayıt gösteriliyor · Firma scope: ${ctx.organizationId || 'yok'}`, false);
    } catch (error) {
      currentRows = [];
      renderRows([]);
      setStatus(error && error.code === 'MATERIAL_TENANT_UNAVAILABLE' ? 'Malzeme kataloğu için doğrulanmış firma kapsamı bulunamadı.' : `Malzeme kataloğu yüklenemedi: ${error && error.message || error}`, true);
    }
  }

  function resetForm() {
    editingId = '';
    pendingImage = undefined;
    const form = $('materialEditorForm'); if (form) form.reset();
    const type = $('materialFieldType'); if (type) type.value = activeView === 'accessories' ? TYPE.ACCESSORY : activeView === 'systems' ? TYPE.SYSTEM : TYPE.PROFILE;
    const cat1 = $('materialFieldCategory1'); if (cat1) cat1.value = type ? type.value : '';
    ['materialFieldUnitWeight','materialFieldCost','materialFieldSalePrice'].forEach(id => { const el=$(id); if(el) el.value='0'; });
    showImagePreview(''); setEditorMessage('');
  }

  function showImagePreview(src) {
    const img = $('materialImagePreview'); const placeholder = $('materialImagePlaceholder');
    if (!img || !placeholder) return;
    if (src) { img.src = src; img.hidden = false; placeholder.hidden = true; }
    else { img.removeAttribute('src'); img.hidden = true; placeholder.hidden = false; }
  }

  function setField(id, value) { const el=$(id); if(el) el.value = value == null ? '' : value; }

  async function openEditor(materialId) {
    ensureShell(); resetForm();
    const title = $('materialEditorTitle');
    if (materialId) {
      const row = await store.get(materialId);
      if (!row) { setStatus('Düzenlenecek malzeme bulunamadı.', true); return; }
      editingId = row.materialId;
      if (title) title.textContent = `${row.code} · Düzenle`;
      setField('materialFieldType', row.materialType || row.category1);
      setField('materialFieldCode', row.code);
      setField('materialFieldDescriptionTr', row.descriptionTr);
      setField('materialFieldDescriptionEn', row.descriptionEn);
      setField('materialFieldCategory1', row.category1);
      setField('materialFieldCategory2', row.category2);
      setField('materialFieldCategory3', row.category3);
      setField('materialFieldUnit', row.unit);
      setField('materialFieldUnitWeight', row.unitWeight);
      setField('materialFieldCost', row.cost);
      setField('materialFieldSalePrice', row.salePrice);
      showImagePreview(row.image || '');
    } else if (title) title.textContent = 'Yeni Malzeme';
    const dialog = $('materialEditorDialog'); if (dialog && typeof dialog.showModal === 'function') dialog.showModal(); else if (dialog) dialog.setAttribute('open','');
  }

  function closeEditor() {
    const dialog = $('materialEditorDialog'); if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close(); else dialog.removeAttribute('open');
  }

  function formData() {
    return {
      materialId: editingId || undefined,
      materialType: $('materialFieldType').value,
      code: $('materialFieldCode').value,
      descriptionTr: $('materialFieldDescriptionTr').value,
      descriptionEn: $('materialFieldDescriptionEn').value,
      category1: $('materialFieldCategory1').value,
      category2: $('materialFieldCategory2').value,
      category3: $('materialFieldCategory3').value,
      unit: $('materialFieldUnit').value,
      unitWeight: $('materialFieldUnitWeight').value,
      cost: $('materialFieldCost').value,
      salePrice: $('materialFieldSalePrice').value,
      ...(pendingImage !== undefined ? { image: pendingImage, imageSha256: null } : {})
    };
  }

  async function saveForm(event) {
    event.preventDefault();
    try {
      const saved = await store.save(formData());
      closeEditor();
      setStatus(`${saved.code} kaydedildi.`, false);
      await render();
    } catch (error) {
      const messages = error && error.errors && error.errors.length ? error.errors : [error && error.message || 'Kayıt başarısız.'];
      setEditorMessage(messages.join(' '));
    }
  }

  function handleImageChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) { pendingImage = undefined; return; }
    if (file.size > 1572864) { event.target.value=''; setEditorMessage('Görsel 1.5 MB sınırını aşıyor.'); return; }
    const reader = new FileReader();
    reader.onload = () => { pendingImage = text(reader.result); showImagePreview(pendingImage); setEditorMessage(''); };
    reader.onerror = () => setEditorMessage('Görsel okunamadı.');
    reader.readAsDataURL(file);
  }

  function bindShell() {
    $('materialCatalogAddBtn').addEventListener('click', () => openEditor(''));
    $('materialCatalogSearch').addEventListener('input', () => render());
    $('materialEditorForm').addEventListener('submit', saveForm);
    $('materialEditorClose').addEventListener('click', closeEditor);
    $('materialEditorCancel').addEventListener('click', closeEditor);
    $('materialFieldImage').addEventListener('change', handleImageChange);
    $('materialFieldType').addEventListener('change', event => {
      const cat1 = $('materialFieldCategory1');
      if (cat1 && (!cat1.value || [TYPE.PROFILE,TYPE.ACCESSORY,TYPE.SYSTEM,TYPE.GLASS,TYPE.OTHER].includes(cat1.value))) cat1.value = event.target.value;
    });
  }

  async function open(view, options) {
    activeView = VIEW[view] ? view : 'profiles';
    ensureShell();
    await render();
    if (options && options.openNew) await openEditor('');
  }

  function init() { if (initialized) return; initialized = true; ensureShell(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();

  root.PulumurMaterialCatalog = Object.freeze({ open, render, openEditor, get activeView(){ return activeView; }, get currentRows(){ return currentRows.slice(); } });
})(typeof window !== 'undefined' ? window : globalThis);
