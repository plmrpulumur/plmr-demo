(function (root) {
  'use strict';
  // Architecture-map boundary marker. The real P3DV V3.86 runtime remains an
  // intentionally isolated browser subsystem loaded from modules/p3dv/index.html.
  const CONTRACT = Object.freeze({
    schema: 'plmr-p3dv-module-boundary-v1',
    runtime: 'modules/p3dv/index.html?embedded=1',
    stateOwner: 'P3DV',
    hostOwner: 'PLMR',
    toolboxOwner: 'P3DV',
    transport: 'same-origin-postMessage'
  });
  root.P3DVModuleBoundary = CONTRACT;
})(typeof window !== 'undefined' ? window : globalThis);
