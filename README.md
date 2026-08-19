# PLMR V.33 — DETERMINISTIC BROWSER AUTH RESET

PLMR V.33 is built directly from the frozen `PLMR V.32` source baseline. V.32 remains unchanged.

## Corrective scope

- Retains V.31/V.32 single-authoritative `src/peri01Geometry.js` architecture for Sürme, Giyotin and Zip Perde.
- Retains V.32 one-active-browser-session enforcement through `profiles.active_session_id` and JWT `session_id`.
- Uses a dedicated Supabase browser auth namespace: `plmr_supabase_auth_v1`.
- Removes only PLMR's legacy default Supabase auth keys on first V.33 startup.
- Every explicit login starts from a verified empty local Supabase session before fresh tokens are installed.
- Explicit logout verifies `getSession() === null` before returning to a usable login state.
- Same-browser login → logout → login and user-switch flows no longer depend on page refresh, cache clearing or private browsing.

## Ownership preserved

- P3DV canonical placement/3D state is unchanged.
- `src/peri01Geometry.js` remains the only native Peri01 geometry source.
- Rolling Roof, Bioclimatic and Eco-Bioclimatic Technical2D adapters are unchanged.
- Pergola remains native 2D.
- PDF, DXF and persistence owners are unchanged.

## Supabase

V.33 adds no new database migration and does not modify the V.32 Edge Function contract. If the V.32 backend has not yet been deployed, deploy `20260819185000_v32_single_active_browser_session.sql` and the packaged `admin-users` function before publishing the V.33 frontend.

## Runtime identity

- Release: `PLMR V.33`
- Runtime VERSION: `33`
- Build: `10.33-r33`
- Host/P3DV bridge: `plmr-p3dv-host-bridge-v33`
- Service-worker cache: `pulumur-pwa-v10_33_r33`
