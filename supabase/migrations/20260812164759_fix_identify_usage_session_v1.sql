create or replace function public.identify_usage_session_v1(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_session_id is null then
    raise exception 'SESSION_ID_REQUIRED';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  insert into public.usage_sessions (
    id,
    organization_id,
    user_id,
    username_snapshot,
    full_name_snapshot,
    started_at,
    last_seen_at,
    page_views
  ) values (
    p_session_id,
    v_profile.organization_id,
    v_profile.id,
    v_profile.username,
    v_profile.full_name,
    now(),
    now(),
    1
  )
  on conflict (id) do update
  set organization_id = excluded.organization_id,
      user_id = excluded.user_id,
      username_snapshot = excluded.username_snapshot,
      full_name_snapshot = excluded.full_name_snapshot,
      last_seen_at = now();
end;
$$;
