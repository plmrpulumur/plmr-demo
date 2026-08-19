# PLMR V.32 — AUTH STABILITY + SINGLE ACTIVE BROWSER SESSION

PLMR V.32 is built directly from the accepted immutable `PLMR V.31` baseline. V.31 remains unchanged.

## Corrective scope

- Retains V.31 single-authoritative `src/peri01Geometry.js` architecture for Sürme, Giyotin and Zip Perde.
- Fixes intermittent new-user first-login identity mismatch by clearing only a different stale local browser session before installing the newly verified session.
- Enforces one active browser session per user. The newest successful login owns the Supabase JWT `session_id`; older browser sessions are rejected by backend session validation and are logged out locally by the frontend.
- A visible old browser checks ownership periodically; a hidden/background browser checks immediately when it becomes visible or receives focus.
- Older refresh-token chains are revoked on a best-effort basis; database `active_session_id` remains the authoritative enforcement layer.
- Existing PIN/global session revocation continues through `session_revoked_at`.

## Ownership preserved

- P3DV canonical placement/3D state remains unchanged.
- `src/peri01Geometry.js` remains the only native Peri01 geometry source.
- Rolling Roof, Bioclimatic and Eco-Bioclimatic Technical2D adapters are unchanged.
- Pergola remains native 2D.
- PDF, DXF and persistence owners are unchanged.

## Supabase

V.32 adds one forward-only migration: `20260819185000_v32_single_active_browser_session.sql`. It adds nullable `profiles.active_session_id`, adds `current_session_status_v1()`, and preserves the existing `current_session_is_valid_v2()` policy contract while adding exact JWT session ownership. `admin-users` login commits the newest session ID and revokes older refresh-token chains.

## Runtime identity

- Release: `PLMR V.32`
- Runtime VERSION: `32`
- Build: `10.32-r32`
- Host/P3DV bridge: `plmr-p3dv-host-bridge-v32`
- Service-worker cache: `pulumur-pwa-v10_32_r32`
