(function (root) {
  'use strict';
  const profiles = new Map();
  function register(profile) {
    if (!profile || !profile.id) throw new Error('PRODUCTION_PROFILE_ID_REQUIRED');
    if (profiles.has(profile.id)) throw new Error(`PRODUCTION_PROFILE_ALREADY_REGISTERED:${profile.id}`);
    profiles.set(profile.id, Object.freeze(profile));
    return profile;
  }
  function get(id) { return profiles.get(String(id || '')) || null; }
  function requireProfile(id) {
    const profile = get(id);
    if (!profile) throw new Error(`PRODUCTION_PROFILE_NOT_FOUND:${id}`);
    return profile;
  }
  function list() { return Array.from(profiles.values()); }
  root.PulumurProductionProfileRegistry = { register, get, requireProfile, list };
  if (typeof module !== 'undefined') module.exports = root.PulumurProductionProfileRegistry;
})(typeof window !== 'undefined' ? window : globalThis);
