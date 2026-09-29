(function (root) {
  'use strict';

  // Customer-installation runtime profile. This does not replace backend tenant,
  // license, role or product-entitlement checks. It only removes the historical
  // hardcoded sales-demo lock from project/engineering UI paths while the staged
  // DEMO/FULL/PREMIUM backend access-mode migration remains unapplied.
  root.PulumurDeploymentProfile = Object.freeze({
    schema: 'plmr-deployment-profile-v1',
    channel: 'CUSTOMER',
    demoRestrictions: false,
    authenticatedProjectAccess: true,
    defaultProjectMode: 'FULL'
  });
})(typeof window !== 'undefined' ? window : globalThis);
