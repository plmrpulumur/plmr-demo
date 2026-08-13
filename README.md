# PLMR V.30 — AUTH / BOOTSTRAP STABILITY

PLMR V.30 is built from the accepted immutable `PLMR V.29` baseline.

## Corrective scope

- Initial Supabase session bootstrap and manual PIN login are serialized.
- Login controls remain disabled while `Oturum kontrol ediliyor…` is active.
- Manual login no longer emits a pre-`setSession()` local `SIGNED_OUT` transition.
- Duplicate same-user `SIGNED_IN` / `TOKEN_REFRESHED` events update in-memory tokens without rebuilding the authenticated UI.
- Browser credential restoration no longer blocks the initial session query.
- Service-worker activation no longer forces `window.location.reload()` during login or active use.

## Retained demo availability

Active: Pergola, Rolling Roof, Bioclimatic, Eco-Bioclimatic.

Visible but disabled: Sürme, Giyotin, Zip Perde, Kapı, Sabit Doğrama, Katlanır Cam.

## Runtime identity

- Release: `PLMR V.30`
- Runtime VERSION: `30`
- Build: `10.30-r30`
- Host/P3DV bridge: `plmr-p3dv-host-bridge-v30`
- Service-worker cache: `pulumur-pwa-v10_30_r30`

No Supabase migration, Edge Function, RLS, geometry, canonical-state, Technical2D, PDF/DXF or project-persistence owner is changed in V.30.
