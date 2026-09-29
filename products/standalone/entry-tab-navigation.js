(function () {
  'use strict';

  function visibleControls(zone) {
    return Array.from(zone.querySelectorAll('input, select, textarea, button, [tabindex]')).filter(control => {
      if (!control || control.disabled || control.hidden) return false;
      if (control.getAttribute('tabindex') === '-1') return false;
      if (control.matches('input[type="hidden"]')) return false;
      const style = window.getComputedStyle(control);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }

  function bind() {
    const zone = document.querySelector('.entry-table-grid');
    if (!zone || zone.dataset.tabNavigationBound === '1') return;
    zone.dataset.tabNavigationBound = '1';
    zone.addEventListener('keydown', event => {
      if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
      const controls = visibleControls(zone);
      const index = controls.indexOf(document.activeElement);
      if (index < 0) return;
      const nextIndex = event.shiftKey ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= controls.length) return;
      event.preventDefault();
      controls[nextIndex].focus();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();

  window.PulumurEntryTabNavigation = Object.freeze({ bind, visibleControls });
})();
