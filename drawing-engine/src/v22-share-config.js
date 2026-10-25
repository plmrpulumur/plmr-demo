/* Deployment may set this before boot. Never put service-role keys or signing secrets here. */
window.PLMR_ANIMATION_SHARE_CONFIG=window.PLMR_ANIMATION_SHARE_CONFIG||{
 endpoint:'./api/animation-shares',
 // Supply async getAccessToken() using the application's existing signed-in session in production.
 getAccessToken:null
};
