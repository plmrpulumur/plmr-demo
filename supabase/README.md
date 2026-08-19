# PLMR V.32 — Supabase Deployment Files

PLMR V.32 changes the authentication/session contract and **does require a forward Supabase deployment**.

## Required deployment order

1. Apply every existing migration in chronological order if the target project is behind.
2. Apply `migrations/20260819185000_v32_single_active_browser_session.sql`.
3. Deploy `functions/admin-users/index.ts` from this V.32 package.
4. Publish the V.32 frontend (`GitHub/`) only after steps 2–3 are complete.
5. Verify: first login, second-browser takeover, old-browser automatic logout, PIN reset/global logout, organization access and product entitlement.

## V.32 session contract

- `profiles.active_session_id` stores the newest successful Supabase JWT `session_id` for each PLMR user.
- `current_session_status_v1()` reports `SESSION_VALID`, `SESSION_REPLACED`, or revocation/identity failures.
- Existing `current_session_is_valid_v2()` remains the RLS-facing boolean contract and now delegates to the V.32 session status.
- `session_revoked_at` remains authoritative for PIN/global revocation.
- The `admin-users` login route records a successful login before replacing the active browser session, then commits `active_session_id` and best-effort revokes older refresh-token chains.

## Security

Do not place `.env`, service-role keys, `PLMR_PIN_PEPPER`, real PINs, passwords, auth tokens or local CLI caches in the release ZIP or GitHub tree. Runtime secrets remain Supabase Edge Function secrets/environment values.
