(function (root) {
  'use strict';

  const MENU_STORAGE_KEY = 'plmr_erp_menu_v1';
  const SIDEBAR_STORAGE_KEY = 'plmr_erp_sidebar_collapsed_v1';
  const DEFAULT_MENU = [
    'Ana Menü',
    'Proje Çizimi',
    '_Yeni Proje',
    '_Projelerim',
    '_Proje Dosyası Aç',
    'Teklif',
    '_Yeni Teklif',
    '_Tekliflerim',
    '_Proforma Oluştur',
    'Üretim BOM',
    '_Yeni Proje',
    '_Projelerim',
    'Cariler',
    '_Cariler',
    '_Yeni Cari Ekle',
    'Ürünler',
    '_Sistemler',
    '_Profiller',
    '_Aksesuarlar',
    '_Yeni Ekle',
    'Yönetim',
    'Yardım',
    'Çıkış'
  ].join('\n');

  const $ = id => document.getElementById(id);
  const tabs = [];
  let activeTabId = 'home';
  let menuDefinition = DEFAULT_MENU;
  let initialized = false;
  let lastWorkspaceInactive = document.body.classList.contains('project-workspace-inactive');
  let dedicatedProductId = '';
  let dedicatedProductUrl = '';
  let moduleSelectorNode = null;
  let moduleSelectorAnchor = null;
  const openGroups = new Set(['Proje Çizimi', 'Teklif', 'Üretim BOM', 'Cariler', 'Ürünler']);

  function normalize(value) {
    return String(value || '').trim().toLocaleLowerCase('tr-TR');
  }

  function bodyReady() {
    return document.body.classList.contains('auth-ready');
  }

  function currentRole() {
    const badge = $('cloudRoleBadge');
    return String(badge && badge.dataset && badge.dataset.role || '').trim();
  }

  function canAdmin() {
    return ['system_admin', 'company_admin'].includes(currentRole());
  }

  function bridgeControl(id) {
    return $(id);
  }

  function bridgeAvailable(id) {
    const control = bridgeControl(id);
    return Boolean(control && !control.disabled);
  }

  function parseMenu(text) {
    const roots = [];
    const stack = [];
    const errors = [];
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    let count = 0;

    lines.forEach((rawLine, index) => {
      const trimmed = rawLine.trim();
      if (!trimmed) return;
      const match = trimmed.match(/^(_*)(.*)$/);
      const level = match ? match[1].length : 0;
      const title = String(match ? match[2] : trimmed).trim();
      if (!title) {
        errors.push(`Satır ${index + 1}: başlık boş olamaz.`);
        return;
      }
      if (level > 2) {
        errors.push(`Satır ${index + 1}: en fazla iki alt seviye (__ ) kullanılabilir.`);
        return;
      }
      if (count >= 60) {
        errors.push('Menü en fazla 60 öğe içerebilir.');
        return;
      }
      if (title.length > 48) {
        errors.push(`Satır ${index + 1}: başlık 48 karakteri geçemez.`);
        return;
      }
      if (level > 0 && !stack[level - 1]) {
        errors.push(`Satır ${index + 1}: alt menü için üst menü bulunamadı.`);
        return;
      }
      const parent = level > 0 ? stack[level - 1] : null;
      const path = parent ? parent.path.concat(title) : [title];
      const node = { title, level, path, children: [] };
      if (parent) parent.children.push(node); else roots.push(node);
      stack[level] = node;
      stack.length = level + 1;
      count += 1;
    });

    if (!roots.length) errors.push('Menü boş bırakılamaz.');
    return { roots, errors, count };
  }

  function actionFor(node) {
    const path = node.path.map(normalize).join('>');
    const exact = {
      'ana menü': 'home',
      'proje çizimi>yeni proje': 'project-new',
      'proje çizimi>projelerim': 'projects',
      'proje çizimi>proje dosyası aç': 'project-import',
      'yönetim': 'management',
      'yardım': 'help',
      'çıkış': 'logout'
    };
    return exact[path] || '';
  }

  function actionEnabled(action) {
    if (action === 'home' || action === 'help' || action === 'logout') return true;
    if (action === 'management') return canAdmin();
    if (action === 'project-new') return bridgeAvailable('startNewProjectBtn');
    if (action === 'projects') return bridgeAvailable('startOpenProjectsBtn');
    if (action === 'project-import') return bridgeAvailable('startImportProjectBtn');
    return false;
  }

  function iconFor(title) {
    const key = normalize(title);
    if (key.includes('ana menü')) return '⌂';
    if (key.includes('proje')) return '◇';
    if (key.includes('teklif')) return '▤';
    if (key.includes('üretim')) return '⚙';
    if (key.includes('cari')) return '◎';
    if (key.includes('ürün')) return '⬡';
    if (key.includes('yönetim')) return '⚙';
    if (key.includes('yardım')) return '?';
    if (key.includes('çıkış')) return '↪';
    if (key.includes('yeni')) return '+';
    return '•';
  }

  function createMenuBranch(node, depth) {
    const wrap = document.createElement('div');
    wrap.className = `erp-menu-node erp-menu-level-${depth}`;
    const action = actionFor(node);
    const isGroup = node.children.length > 0;
    const pathKey = node.path.join(' / ');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = isGroup ? 'erp-menu-button erp-menu-group' : 'erp-menu-button';
    button.dataset.path = pathKey;
    if (action) button.dataset.erpAction = action;

    const icon = document.createElement('span');
    icon.className = 'erp-menu-icon';
    icon.textContent = iconFor(node.title);
    const label = document.createElement('span');
    label.className = 'erp-menu-label';
    label.textContent = node.title;
    button.append(icon, label);

    if (isGroup) {
      const caret = document.createElement('span');
      caret.className = 'erp-menu-caret';
      caret.textContent = '⌄';
      button.appendChild(caret);
      const submenu = document.createElement('div');
      submenu.className = 'erp-submenu';
      const opened = openGroups.has(pathKey) || depth > 0;
      submenu.hidden = !opened;
      button.setAttribute('aria-expanded', opened ? 'true' : 'false');
      button.addEventListener('click', () => {
        const next = submenu.hidden;
        submenu.hidden = !next;
        button.setAttribute('aria-expanded', next ? 'true' : 'false');
        if (next) openGroups.add(pathKey); else openGroups.delete(pathKey);
      });
      node.children.forEach(child => submenu.appendChild(createMenuBranch(child, depth + 1)));
      wrap.append(button, submenu);
      return wrap;
    }

    const enabled = action && actionEnabled(action);
    if (!enabled) {
      button.disabled = true;
      button.classList.add('is-passive');
      button.title = action === 'management' ? 'Bu bölüm yalnız firma/sistem yöneticisine açıktır.' : 'Bu modül henüz aktif değil.';
    } else {
      button.addEventListener('click', () => executeAction(action));
    }
    wrap.appendChild(button);
    return wrap;
  }

  function renderSidebar() {
    const host = $('erpSidebarMenu');
    if (!host) return;
    const parsed = parseMenu(menuDefinition);
    host.replaceChildren();
    parsed.roots.forEach(node => host.appendChild(createMenuBranch(node, 0)));
    markActiveMenu();
  }

  function renderMenuPreview(text) {
    const host = $('erpMenuPreview');
    if (!host) return;
    const parsed = parseMenu(text);
    host.replaceChildren();
    if (parsed.errors.length) {
      const err = document.createElement('div');
      err.className = 'erp-preview-error';
      err.textContent = parsed.errors[0];
      host.appendChild(err);
      return;
    }
    parsed.roots.forEach(rootNode => {
      const group = document.createElement('div');
      group.className = 'erp-preview-group';
      const head = document.createElement('strong');
      head.textContent = `${iconFor(rootNode.title)}  ${rootNode.title}`;
      group.appendChild(head);
      if (rootNode.children.length) {
        const children = document.createElement('div');
        children.className = 'erp-preview-children';
        rootNode.children.forEach(child => {
          const row = document.createElement('span');
          row.textContent = child.title;
          if (!actionFor(child)) row.classList.add('is-passive');
          children.appendChild(row);
        });
        group.appendChild(children);
      }
      host.appendChild(group);
    });
  }

  function tabById(id) {
    return tabs.find(tab => tab.id === id) || null;
  }

  function ensureTab(id, label, panelId, closable) {
    let tab = tabById(id);
    if (!tab) {
      tab = { id, label, panelId, closable: closable !== false };
      tabs.push(tab);
    }
    renderTabs();
    return tab;
  }

  function activateTab(id) {
    const tab = tabById(id);
    if (!tab) return;
    activeTabId = id;
    document.querySelectorAll('.erp-panel-view').forEach(panel => { panel.hidden = panel.id !== tab.panelId; });
    renderTabs();
    markActiveMenu();
    if (id === 'help') syncHelpContent();
    if (id === 'management') syncManagementEditor();
    if (id === 'drawing') syncDrawingState();
  }

  function closeTab(id) {
    const index = tabs.findIndex(tab => tab.id === id);
    if (index < 0 || tabs[index].closable === false) return;
    const wasActive = activeTabId === id;
    tabs.splice(index, 1);
    if (wasActive) {
      const fallback = tabs[Math.max(0, index - 1)] || tabById('home');
      activeTabId = fallback ? fallback.id : 'home';
    }
    activateTab(activeTabId);
  }

  function renderTabs() {
    const host = $('erpTabs');
    if (!host) return;
    host.replaceChildren();
    tabs.forEach(tab => {
      const item = document.createElement('div');
      item.className = `erp-tab${tab.id === activeTabId ? ' is-active' : ''}`;
      item.setAttribute('role', 'tab');
      item.setAttribute('aria-selected', tab.id === activeTabId ? 'true' : 'false');
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'erp-tab-open';
      open.textContent = tab.label;
      open.addEventListener('click', () => activateTab(tab.id));
      item.appendChild(open);
      if (tab.closable !== false) {
        const close = document.createElement('button');
        close.type = 'button';
        close.className = 'erp-tab-close';
        close.textContent = '×';
        close.setAttribute('aria-label', `${tab.label} sekmesini kapat`);
        close.addEventListener('click', event => { event.stopPropagation(); closeTab(tab.id); });
        item.appendChild(close);
      }
      host.appendChild(item);
    });
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.className = 'erp-tab-plus';
    plus.textContent = '+';
    plus.title = 'Ana Menü';
    plus.addEventListener('click', () => activateTab('home'));
    host.appendChild(plus);
  }

  function markActiveMenu() {
    const actionByTab = { home: 'home', management: 'management', help: 'help', projects: 'projects', drawing: 'project-new' };
    const activeAction = actionByTab[activeTabId] || '';
    document.querySelectorAll('#erpSidebarMenu [data-erp-action]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.erpAction === activeAction);
    });
  }

  function triggerLegacy(id) {
    const control = bridgeControl(id);
    if (!control || control.disabled) return false;
    control.click();
    return true;
  }

  function executeAction(action) {
    if (!action) return;
    if (action === 'home') {
      activateTab('home');
      return;
    }
    if (action === 'management') {
      if (!canAdmin()) return;
      ensureTab('management', 'Yönetim', 'erpManagementPanel', true);
      activateTab('management');
      return;
    }
    if (action === 'help') {
      ensureTab('help', 'Yardım', 'erpHelpPanel', true);
      activateTab('help');
      return;
    }
    if (action === 'projects') {
      ensureTab('projects', 'Projelerim', 'erpProjectsPanel', true);
      activateTab('projects');
      triggerLegacy('startOpenProjectsBtn');
      return;
    }
    if (action === 'project-new') {
      ensureTab('drawing', 'Proje Çizimi', 'erpDrawingPanel', true);
      activateTab('drawing');
      triggerLegacy('startNewProjectBtn');
      return;
    }
    if (action === 'project-import') {
      ensureTab('drawing', 'Proje Çizimi', 'erpDrawingPanel', true);
      activateTab('drawing');
      triggerLegacy('startImportProjectBtn');
      return;
    }
    if (action === 'logout') {
      if (!triggerLegacy('startLogoutBtn')) triggerLegacy('logoutBtn');
    }
  }

  function syncDrawingState() {
    const empty = $('erpDrawingEmpty');
    const legacy = $('studioWorkspaceShell');
    const dedicatedHost = $('erpDedicatedProductHost');
    const hasDedicated = Boolean(dedicatedProductId && dedicatedHost && !dedicatedHost.hidden);
    const hasProjectWorkspace = bodyReady() && !document.body.classList.contains('project-workspace-inactive');
    if (empty) empty.hidden = hasDedicated || hasProjectWorkspace;
    if (legacy) {
      legacy.classList.toggle('erp-has-active-project', hasProjectWorkspace);
      legacy.hidden = hasDedicated;
    }
  }

  function embeddedProductUrl(href) {
    const raw = String(href || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw, window.location.href);
      url.searchParams.set('embedded', '1');
      url.searchParams.set('host', 'erp');
      url.searchParams.set('v', '10.47-r47');
      return url.href;
    } catch (_) {
      const join = raw.includes('?') ? '&' : '?';
      return `${raw}${join}embedded=1&host=erp&v=10.47-r47`;
    }
  }

  function openDedicatedProduct(productId, href) {
    if (!productId || !href) return false;
    const host = $('erpDedicatedProductHost');
    const frame = $('erpDedicatedProductFrame');
    if (!host || !frame) return false;
    dedicatedProductId = String(productId);
    dedicatedProductUrl = embeddedProductUrl(href);
    syncDrawingToolbarForProduct(dedicatedProductId);
    ensureTab('drawing', 'Proje Çizimi', 'erpDrawingPanel', true);
    host.hidden = false;
    host.dataset.productId = dedicatedProductId;
    if (frame.src !== dedicatedProductUrl) frame.src = dedicatedProductUrl;
    activateTab('drawing');
    syncDrawingState();
    return true;
  }

  function closeDedicatedProduct() {
    const host = $('erpDedicatedProductHost');
    const frame = $('erpDedicatedProductFrame');
    dedicatedProductId = '';
    dedicatedProductUrl = '';
    syncDrawingToolbarForProduct(document.getElementById('product') && document.getElementById('product').value);
    if (host) { host.hidden = true; delete host.dataset.productId; }
    if (frame) {
      try { frame.removeAttribute('src'); } catch (_) {}
    }
    syncDrawingState();
  }

  function onProductAuthorized(event) {
    const detail = event && event.detail || {};
    const adapter = detail.adapter;
    if (!adapter || !adapter.manifest || !adapter.manifest.navigation) return;
    const navigation = window.PulumurProductRegistry && window.PulumurProductRegistry.resolveNavigation
      ? window.PulumurProductRegistry.resolveNavigation(adapter.id)
      : adapter.manifest.navigation;
    syncDrawingToolbarForProduct(adapter.id);
    if (navigation.opensDedicatedPage && navigation.href) {
      openDedicatedProduct(adapter.id, navigation.href);
      return;
    }
    closeDedicatedProduct();
    ensureTab('drawing', 'Proje Çizimi', 'erpDrawingPanel', true);
    activateTab('drawing');
  }

  function syncHelpContent() {
    const source = $('helpContent');
    const target = $('erpHelpContent');
    if (target) target.textContent = source ? source.textContent : 'Yardım içeriği yüklenemedi.';
  }

  function syncManagementEditor() {
    const input = $('erpMenuDefinition');
    if (input && input.value !== menuDefinition) input.value = menuDefinition;
    renderMenuPreview(input ? input.value : menuDefinition);
    const openAdmin = $('erpOpenAdminBtn');
    if (openAdmin) {
      openAdmin.disabled = !canAdmin();
      openAdmin.title = canAdmin() ? '' : 'Yalnız firma/sistem yöneticisi kullanabilir.';
    }
  }

  function applyMenuFromEditor() {
    if (!canAdmin()) return;
    const input = $('erpMenuDefinition');
    const status = $('erpMenuStatus');
    const text = input ? input.value : '';
    const parsed = parseMenu(text);
    renderMenuPreview(text);
    if (parsed.errors.length) {
      if (status) { status.textContent = parsed.errors[0]; status.classList.add('is-error'); }
      return;
    }
    menuDefinition = text.trim();
    try { localStorage.setItem(MENU_STORAGE_KEY, menuDefinition); } catch (_) {}
    if (status) {
      status.textContent = `${parsed.count} menü öğesi bu tarayıcıda kaydedildi ve uygulandı.`;
      status.classList.remove('is-error');
    }
    renderSidebar();
  }

  function resetMenu() {
    if (!canAdmin()) return;
    menuDefinition = DEFAULT_MENU;
    try { localStorage.removeItem(MENU_STORAGE_KEY); } catch (_) {}
    const input = $('erpMenuDefinition');
    if (input) input.value = menuDefinition;
    const status = $('erpMenuStatus');
    if (status) { status.textContent = 'Varsayılan menü geri yüklendi.'; status.classList.remove('is-error'); }
    renderMenuPreview(menuDefinition);
    renderSidebar();
  }

  function loadStoredMenu() {
    try {
      const saved = localStorage.getItem(MENU_STORAGE_KEY);
      const parsed = parseMenu(saved || '');
      if (saved && !parsed.errors.length) menuDefinition = saved;
    } catch (_) {}
  }

  function captureModuleSelector(selectors) {
    if (!moduleSelectorNode) moduleSelectorNode = selectors.querySelector('.selector-module') || document.querySelector('.selector-module');
    if (moduleSelectorNode && !moduleSelectorAnchor && moduleSelectorNode.parentNode === selectors) {
      moduleSelectorAnchor = document.createComment('plmr-module-toolbar-slot');
      selectors.insertBefore(moduleSelectorAnchor, moduleSelectorNode);
    }
    return moduleSelectorNode;
  }

  function syncDrawingToolbarForProduct(productId) {
    const selectors = document.querySelector('.header-selector-grid');
    if (!selectors) return;
    const canonical = String(productId || dedicatedProductId || (document.getElementById('product') && document.getElementById('product').value) || '').trim().toUpperCase();
    const isGuillotine = canonical === 'GUILLOTINE';
    selectors.classList.toggle('is-guillotine-toolbar', isGuillotine);
    const moduleLabel = captureModuleSelector(selectors);
    const moduleSelect = moduleLabel && moduleLabel.querySelector('#moduleName');
    const staging = $('legacyControlStaging');
    const importButton = $('projectImportBtn');
    if (moduleLabel) {
      if (isGuillotine) {
        moduleLabel.hidden = true;
        moduleLabel.setAttribute('aria-hidden', 'true');
        if (staging && moduleLabel.parentNode !== staging) staging.appendChild(moduleLabel);
      } else {
        if (moduleSelectorAnchor && moduleSelectorAnchor.parentNode === selectors && moduleLabel.parentNode !== selectors) {
          selectors.insertBefore(moduleLabel, moduleSelectorAnchor.nextSibling);
        }
        moduleLabel.hidden = false;
        moduleLabel.removeAttribute('aria-hidden');
      }
    }
    if (moduleSelect) {
      moduleSelect.hidden = isGuillotine;
      moduleSelect.disabled = isGuillotine;
      moduleSelect.tabIndex = isGuillotine ? -1 : 0;
    }
    if (importButton) {
      if (importButton.parentElement !== selectors) selectors.appendChild(importButton);
      importButton.hidden = !isGuillotine;
      importButton.style.setProperty('display', isGuillotine ? 'inline-flex' : 'none', 'important');
      importButton.setAttribute('aria-hidden', isGuillotine ? 'false' : 'true');
    }
  }

  const GUILLOTINE_HOST_SCHEMA = 'plmr-guillotine-workspace-host-v1';
  const GUILLOTINE_HOST_PRODUCT = 'GUILLOTINE';
  const GUILLOTINE_HOST_REQUEST_TYPES = new Set(['PLMR_IDENTITY_REQUEST']);

  function guillotineHostOriginAccepted(event) {
    const ownOrigin = String(window.location.origin || '');
    if (ownOrigin && ownOrigin !== 'null') return event.origin === ownOrigin;
    return event.origin === 'null' || event.origin === '';
  }

  function guillotineHostTargetOrigin() {
    const ownOrigin = String(window.location.origin || '');
    return ownOrigin && ownOrigin !== 'null' ? ownOrigin : '*';
  }

  function canonicalIdentityPayload() {
    const identity = window.PulumurIdentityContext;
    if (!identity) return { userId:'', fullName:'', email:'' };
    try {
      if (typeof identity.getIdentity === 'function') {
        const value = identity.getIdentity() || {};
        return {
          userId: String(value.userId || ''),
          fullName: String(value.fullName || value.displayName || '').trim(),
          email: String(value.email || '').trim()
        };
      }
      return {
        userId: typeof identity.currentUserId === 'function' ? String(identity.currentUserId() || '') : '',
        fullName: typeof identity.currentAuthorName === 'function' ? String(identity.currentAuthorName() || '').trim() : '',
        email: typeof identity.currentEmail === 'function' ? String(identity.currentEmail() || '').trim() : ''
      };
    } catch (_) { return { userId:'', fullName:'', email:'' }; }
  }

  function bindGuillotineHostMessages() {
    window.addEventListener('message', event => {
      const frame = $('erpDedicatedProductFrame');
      if (!frame || event.source !== frame.contentWindow || !guillotineHostOriginAccepted(event)) return;
      const message = event.data || {};
      if (message.schema !== GUILLOTINE_HOST_SCHEMA || message.source !== 'plmr-guillotine-workspace') return;
      if (!GUILLOTINE_HOST_REQUEST_TYPES.has(String(message.type || ''))) return;
      if (String(message.productId || '') !== GUILLOTINE_HOST_PRODUCT || String(dedicatedProductId || '') !== GUILLOTINE_HOST_PRODUCT) return;
      const sessionId = String(message.sessionId || '');
      if (sessionId.length < 16 || sessionId.length > 160) return;
      const identity = canonicalIdentityPayload();
      try {
        frame.contentWindow.postMessage({
          schema: GUILLOTINE_HOST_SCHEMA,
          source: 'plmr-erp-shell',
          type: 'PLMR_IDENTITY_STATE',
          sessionId,
          productId: GUILLOTINE_HOST_PRODUCT,
          identity
        }, guillotineHostTargetOrigin());
      } catch (_) {}
    });
  }

  function moveLegacyControls() {
    const identity = document.querySelector('.header-user-summary');
    const identitySlot = $('erpIdentitySlot');
    if (identity && identitySlot && identity.parentElement !== identitySlot) identitySlot.appendChild(identity);

    const language = document.querySelector('.header-language-control');
    const languageSlot = $('erpLanguageSlot');
    if (language && languageSlot && language.parentElement !== languageSlot) languageSlot.appendChild(language);

    const selectors = document.querySelector('.header-selector-grid');
    const selectorSlot = $('erpDrawingSelectors');
    if (selectors && selectorSlot && selectors.parentElement !== selectorSlot) selectorSlot.appendChild(selectors);
    // V43: yalnız Giyotin ürününde Modül alanı kaldırılır ve aynı yere
    // Proje Dosyası Aç aksiyonu gelir. Diğer ürünlerin mevcut toolbar'ı korunur.
    const projectBar = $('cloudProjectBar');
    const actionSlot = $('erpDrawingProjectActions');
    if (projectBar && actionSlot && projectBar.parentElement !== actionSlot) actionSlot.appendChild(projectBar);
    const importButton = $('projectImportBtn');
    if (importButton && selectors && importButton.parentElement !== selectors) {
      importButton.classList.add('erp-inline-project-open');
      selectors.appendChild(importButton);
    }
    syncDrawingToolbarForProduct(dedicatedProductId);

    const legacy = $('studioWorkspaceShell');
    const legacyHost = $('erpLegacyHost');
    if (legacy && legacyHost && legacy.parentElement !== legacyHost) legacyHost.appendChild(legacy);
  }

  function syncAuthShell() {
    const shell = $('erpShell');
    if (!shell) return;
    const ready = bodyReady();
    shell.hidden = !ready;
    document.body.classList.toggle('erp-enabled', ready);
    if (!ready) return;
    syncDrawingState();
    renderSidebar();
  }

  function syncSidebarCollapse() {
    const shell = $('erpShell');
    const toggle = $('erpSidebarToggle');
    if (!shell || !toggle) return;
    let collapsed = false;
    try { collapsed = localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'; } catch (_) {}
    shell.classList.toggle('is-sidebar-collapsed', collapsed);
    toggle.textContent = collapsed ? '»' : '«';
    toggle.setAttribute('aria-label', collapsed ? 'Menüyü genişlet' : 'Menüyü daralt');
    toggle.title = collapsed ? 'Menüyü genişlet' : 'Menüyü daralt';
  }

  function toggleSidebar() {
    const shell = $('erpShell');
    if (!shell) return;
    const collapsed = !shell.classList.contains('is-sidebar-collapsed');
    shell.classList.toggle('is-sidebar-collapsed', collapsed);
    try { localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0'); } catch (_) {}
    syncSidebarCollapse();
  }

  function bind() {
    document.addEventListener('click', event => {
      const action = event.target && event.target.closest && event.target.closest('[data-erp-action]');
      if (!action || action.closest('#erpSidebarMenu')) return;
      if (action.disabled) return;
      executeAction(action.dataset.erpAction);
    });

    const toggle = $('erpSidebarToggle');
    if (toggle) toggle.addEventListener('click', toggleSidebar);
    const input = $('erpMenuDefinition');
    if (input) input.addEventListener('input', () => renderMenuPreview(input.value));
    const apply = $('erpApplyMenuBtn');
    if (apply) apply.addEventListener('click', applyMenuFromEditor);
    const reset = $('erpResetMenuBtn');
    if (reset) reset.addEventListener('click', resetMenu);
    const example = $('erpLoadMenuExampleBtn');
    if (example) example.addEventListener('click', () => {
      if (input) input.value = DEFAULT_MENU;
      renderMenuPreview(DEFAULT_MENU);
    });
    const openAdmin = $('erpOpenAdminBtn');
    if (openAdmin) openAdmin.addEventListener('click', () => { if (canAdmin()) triggerLegacy('adminPanelBtn'); });
    const openProjects = $('erpOpenProjectsDialogBtn');
    if (openProjects) openProjects.addEventListener('click', () => triggerLegacy('startOpenProjectsBtn'));
    const language = $('languageSelect');
    if (language) language.addEventListener('change', () => window.setTimeout(() => { syncHelpContent(); renderSidebar(); }, 0));
    const product = $('product');
    if (product) product.addEventListener('change', () => window.setTimeout(() => syncDrawingToolbarForProduct(product.value), 0));
    document.addEventListener('plmr:product-authorized', onProductAuthorized);
    window.addEventListener('plmr-project-file-loaded', () => {
      ensureTab('drawing', 'Proje Çizimi', 'erpDrawingPanel', true);
      activateTab('drawing');
    });
  }

  function observeState() {
    const bodyObserver = new MutationObserver(mutations => {
      const classChanged = mutations.some(m => m.type === 'attributes' && m.attributeName === 'class');
      if (!classChanged) return;
      const wasReady = !$('erpShell').hidden;
      const wasInactive = lastWorkspaceInactive;
      syncAuthShell();
      const nowReady = bodyReady();
      const isInactive = document.body.classList.contains('project-workspace-inactive');
      lastWorkspaceInactive = isInactive;
      if (nowReady && wasInactive && !isInactive && activeTabId !== 'drawing') {
        ensureTab('drawing', 'Proje Çizimi', 'erpDrawingPanel', true);
        activateTab('drawing');
      } else if (nowReady && wasReady) {
        syncDrawingState();
      }
    });
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    ['startNewProjectBtn', 'startOpenProjectsBtn', 'startImportProjectBtn', 'adminPanelBtn', 'cloudRoleBadge'].forEach(id => {
      const node = $(id);
      if (!node) return;
      new MutationObserver(() => {
        renderSidebar();
        if (activeTabId === 'management') syncManagementEditor();
      }).observe(node, { attributes: true, attributeFilter: ['disabled', 'hidden', 'data-role'] });
    });
  }

  function init() {
    if (initialized) return;
    initialized = true;
    loadStoredMenu();
    moveLegacyControls();
    ensureTab('home', 'Ana Menü', 'erpHomePanel', false);
    bind();
    bindGuillotineHostMessages();
    syncSidebarCollapse();
    renderSidebar();
    const input = $('erpMenuDefinition');
    if (input) input.value = menuDefinition;
    renderMenuPreview(menuDefinition);
    observeState();
    syncAuthShell();
    activateTab('home');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  root.PulumurErpWorkspace = Object.freeze({
    openHome: () => executeAction('home'),
    openManagement: () => executeAction('management'),
    openDrawing: () => { ensureTab('drawing', 'Proje Çizimi', 'erpDrawingPanel', true); activateTab('drawing'); },
    openProduct: (productId, href) => openDedicatedProduct(productId, href),
    closeProduct: () => closeDedicatedProduct(),
    defaultMenu: DEFAULT_MENU
  });
})(typeof window !== 'undefined' ? window : globalThis);
