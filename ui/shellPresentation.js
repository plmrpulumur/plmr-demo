(function (root) {
  'use strict';
  const COPY = Object.freeze({
    tr: Object.freeze({ demo: 'Demo sürümü', inactive: 'Demo sürümünde pasif', demoProjects: 'DEMO · PROJE YÖNETİMİ PASİF', account: 'Aktif kullanıcı bilgileri', engine: 'Aktif çizim motoru', controls: 'Proje kontrol merkezi', controlTitle: 'PROJE\nKONTROL\nMERKEZİ', projects: 'Proje yönetimi', wizard: 'Akıllı Proje Sihirbazı' }),
    en: Object.freeze({ demo: 'Demo version', inactive: 'Unavailable in the demo', demoProjects: 'DEMO · PROJECT MANAGEMENT UNAVAILABLE', account: 'Current user details', engine: 'Active drawing engine', controls: 'Project control center', controlTitle: 'PROJECT\nCONTROL\nCENTER', projects: 'Project management', wizard: 'Smart Project Wizard' })
  });

  function labelOptions(select, language, formatter) {
    if (!select) return;
    Array.from(select.options).forEach(option => {
      // Options without an explicit value derive it from their visible text.
      // Pin the existing value before translating so saved IDs cannot change.
      const value = option.value;
      option.value = value;
      option.textContent = formatter(value, language);
    });
  }

  function apply(language) {
    const lang = language === 'en' ? 'en' : 'tr';
    const copy = COPY[lang];
    const names = root.PulumurProductPresentation;
    if (!names) return;
    const access = root.PulumurAccessContext;
    const tier = access && access.authorizeCapability ? access.authorizeCapability('project_access') : null;
    const projectsAllowed = Boolean(tier && tier.allowed);
    ['product', 'wizardProduct'].forEach(id => labelOptions(document.getElementById(id), lang, names.name));
    labelOptions(document.getElementById('moduleName'), lang, names.moduleName);
    const attribute = (selector, key, value) => document.querySelectorAll(selector).forEach(node => node.setAttribute(key, value));
    const mode = tier && tier.modeVerified ? tier.mode : 'DEMO';
    document.querySelectorAll('.plmr-release-badge').forEach(node => {
      node.textContent = `PLMR ${mode}`;
      node.setAttribute('aria-label', mode === 'DEMO' ? copy.demo : `PLMR ${mode}`);
    });
    attribute('.demo-disabled-control', 'title', copy.inactive);
    attribute('.header-user-summary', 'aria-label', copy.account);
    attribute('#engine', 'aria-label', copy.engine);
    attribute('.studio-side-rail', 'aria-label', copy.controls);
    attribute('#cloudProjectBar', 'aria-label', copy.projects);
    attribute('.cloud-project-actions', 'data-demo-label', projectsAllowed ? '' : copy.demoProjects);
    document.querySelectorAll('[data-project-capability]').forEach(node => {
      node.setAttribute('title', projectsAllowed ? '' : copy.inactive);
    });
    const moduleNames = lang === 'en' ? ['CRM / Accounts', 'Quotations', 'Production', 'Shipment'] : ['Cari / CRM', 'Teklifler', 'Üretim', 'Sevkiyat'];
    document.querySelectorAll('[data-premium-preview]').forEach((node, index) => {
      node.textContent = moduleNames[index] || '';
      node.setAttribute('title', mode === 'PREMIUM'
        ? (lang === 'en' ? 'In development' : 'Geliştirme sürüyor')
        : (lang === 'en' ? 'Premium module · In development' : 'Premium modül · Geliştirme sürüyor'));
    });
    document.querySelectorAll('.studio-control-title > span').forEach(node => { node.textContent = copy.controlTitle; });
    const wizardButton = document.getElementById('startWizardBtn');
    if (wizardButton) wizardButton.textContent = copy.wizard;
  }

  root.PulumurShellPresentation = Object.freeze({ apply });
})(typeof window !== 'undefined' ? window : globalThis);
