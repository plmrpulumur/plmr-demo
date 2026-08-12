(function (root) {
  'use strict';

  const COMMANDS = Object.freeze({
    EXPORT_DXF: 'export:dxf',
    EXPORT_PDF: 'export:pdf',
    PREVIEW_UPDATE: 'preview:update',
    PROJECT_RESET: 'project:reset',
    PROJECT_FILE_EXPORT: 'project:export',
    PROJECT_CREATE_START: 'project:create:start',
    PROJECT_CREATE_SUBMIT: 'project:create:submit',
    PROJECT_SAVE: 'project:save',
    PRODUCT_DELETE_ALL: 'product:delete-all'
  });

  const values = Object.freeze(Object.values(COMMANDS));

  function isKnown(name) {
    return values.includes(String(name || ''));
  }

  const api = Object.freeze({ COMMANDS, values, isKnown });
  root.PulumurProjectCommands = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
