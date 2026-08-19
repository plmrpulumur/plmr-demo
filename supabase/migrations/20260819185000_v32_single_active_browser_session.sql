-- PLMR V.32 — one active browser session per user.
-- The newest successful login owns profiles.active_session_id. Older JWTs remain
-- cryptographically valid until expiry, but application RLS rejects them immediately.

begin;

alter table public.profiles
  add column if not exists active_session_id uuid;

comment on column public.profiles.active_session_id is
  'PLMR V.32 authoritative Supabase JWT session_id. Newest browser login wins.';

create or replace function public.current_session_status_v1()
returns table (is_valid boolean, reason text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_revoked_at timestamptz;
  v_issued_at timestamptz;
  v_active_session_id uuid;
  v_jwt_session_id uuid;
begin
  if auth.uid() is null then
    return query select false, 'AUTH_REQUIRED'::text;
    return;
  end if;

  select p.session_revoked_at, p.active_session_id
  into v_revoked_at, v_active_session_id
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true;

  if not found then
    return query select false, 'PROFILE_NOT_FOUND'::text;
    return;
  end if;

  -- active_session_id is nullable for pre-V.32 sessions. The first successful
  -- V.32 login claims it and enables deterministic single-browser ownership.
  if v_active_session_id is not null then
    begin
      v_jwt_session_id := nullif(auth.jwt() ->> 'session_id', '')::uuid;
    exception when others then
      return query select false, 'SESSION_ID_MISSING'::text;
      return;
    end;

    if v_jwt_session_id is null or v_jwt_session_id <> v_active_session_id then
      return query select false, 'SESSION_REPLACED'::text;
      return;
    end if;
  end if;

  if v_revoked_at is not null then
    begin
      v_issued_at := to_timestamp((auth.jwt() ->> 'iat')::double precision);
    exception when others then
      return query select false, 'SESSION_ISSUED_AT_MISSING'::text;
      return;
    end;

    -- JWT iat has second precision while timestamptz has sub-second precision.
    if v_issued_at < date_trunc('second', v_revoked_at) then
      return query select false, 'SESSION_REVOKED'::text;
      return;
    end if;
  end if;

  return query select true, 'SESSION_VALID'::text;
end;
$$;

-- Preserve every existing RLS/policy dependency on current_session_is_valid_v2.
-- The public contract stays the same while V.32 adds exact session_id ownership.
create or replace function public.current_session_is_valid_v2()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select s.is_valid from public.current_session_status_v1() s limit 1), false);
$$;

revoke all on function public.current_session_status_v1() from public, anon;
revoke all on function public.current_session_is_valid_v2() from public, anon;
grant execute on function public.current_session_status_v1() to authenticated, service_role;
grant execute on function public.current_session_is_valid_v2() to authenticated, service_role;

commit;
