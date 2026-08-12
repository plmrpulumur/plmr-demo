


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_code" character varying(4),
    "is_active" boolean DEFAULT true NOT NULL,
    "license_start" "date",
    "license_end" "date",
    "max_users" integer DEFAULT 5 NOT NULL,
    "enabled_products" "jsonb" DEFAULT '["PERGO_RISE"]'::"jsonb" NOT NULL,
    CONSTRAINT "organizations_company_code_format" CHECK ((("company_code" IS NULL) OR (("company_code")::"text" ~ '^[0-9]{4}$'::"text"))),
    CONSTRAINT "organizations_enabled_products_array" CHECK (("jsonb_typeof"("enabled_products") = 'array'::"text")),
    CONSTRAINT "organizations_max_users_range" CHECK ((("max_users" >= 1) AND ("max_users" <= 9999)))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_create_organization_v1"("p_name" "text", "p_license_end" "date" DEFAULT NULL::"date", "p_max_users" integer DEFAULT 5) RETURNS "public"."organizations"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_number integer;
  v_code varchar(4);
  v_org public.organizations%rowtype;
begin
  if not public.current_user_is_system_admin() then
    raise exception 'SYSTEM_ADMIN_REQUIRED';
  end if;
  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'ORGANIZATION_NAME_REQUIRED';
  end if;
  if coalesce(p_max_users, 0) not between 1 and 9999 then
    raise exception 'MAX_USERS_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtext('PLMR_ORGANIZATION_CODE'));

  select coalesce(max(company_code::integer), 0) + 1
  into v_number
  from public.organizations
  where company_code ~ '^[0-9]{4}$';

  if v_number > 9999 then raise exception 'COMPANY_CODE_LIMIT_REACHED'; end if;
  v_code := lpad(v_number::text, 4, '0');

  insert into public.organizations (
    name, slug, company_code, is_active,
    license_start, license_end, max_users, enabled_products
  ) values (
    btrim(p_name),
    'firma-' || v_code,
    v_code,
    true,
    current_date,
    p_license_end,
    p_max_users,
    '["PERGO_RISE"]'::jsonb
  )
  returning * into v_org;

  return v_org;
end;
$_$;


ALTER FUNCTION "public"."admin_create_organization_v1"("p_name" "text", "p_license_end" "date", "p_max_users" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_activity_logs_v1"("p_organization_id" "uuid" DEFAULT NULL::"uuid", "p_from" timestamp with time zone DEFAULT ("now"() - '7 days'::interval), "p_to" timestamp with time zone DEFAULT "now"(), "p_limit" integer DEFAULT 1000) RETURNS TABLE("id" bigint, "session_id" "uuid", "organization_id" "uuid", "company_code" character varying, "organization_name" "text", "user_id" "uuid", "username" "text", "full_name" "text", "action" "text", "project_id" "uuid", "project_code" "text", "revision_no" integer, "detail" "jsonb", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_role text;
  v_limit integer := least(greatest(coalesce(p_limit, 1000), 1), 5000);
begin
  select p.role
  into v_role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true;

  if v_role <> 'system_admin' then
    raise exception 'SYSTEM_ADMIN_REQUIRED';
  end if;

  return query
  select
    a.id,
    a.session_id,
    a.organization_id,
    o.company_code,
    o.name,
    a.user_id,
    a.username_snapshot,
    a.full_name_snapshot,
    a.action,
    a.project_id,
    a.project_code,
    a.revision_no,
    a.detail,
    a.created_at
  from public.activity_logs a
  left join public.organizations o on o.id = a.organization_id
  where a.created_at >= coalesce(p_from, now() - interval '7 days')
    and a.created_at < coalesce(p_to, now() + interval '1 day')
    and (p_organization_id is null or a.organization_id = p_organization_id)
  order by a.created_at desc
  limit v_limit;
end;
$$;


ALTER FUNCTION "public"."admin_list_activity_logs_v1"("p_organization_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_organizations_v1"() RETURNS TABLE("id" "uuid", "company_code" character varying, "name" "text", "slug" "text", "is_active" boolean, "license_start" "date", "license_end" "date", "max_users" integer, "enabled_products" "jsonb", "created_at" timestamp with time zone, "user_count" integer, "active_user_count" integer, "project_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_role text;
  v_org_id uuid;
begin
  select p.role, p.organization_id
  into v_role, v_org_id
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true;

  if v_role not in ('system_admin', 'company_admin') then
    raise exception 'ADMIN_REQUIRED';
  end if;

  return query
  select
    o.id,
    o.company_code,
    o.name,
    o.slug,
    o.is_active,
    o.license_start,
    o.license_end,
    o.max_users,
    o.enabled_products,
    o.created_at,
    (select count(*)::integer from public.profiles p where p.organization_id = o.id),
    (select count(*)::integer from public.profiles p where p.organization_id = o.id and p.is_active = true),
    (select count(*)::integer from public.projects pr where pr.organization_id = o.id)
  from public.organizations o
  where v_role = 'system_admin' or o.id = v_org_id
  order by o.company_code nulls last, o.name;
end;
$$;


ALTER FUNCTION "public"."admin_list_organizations_v1"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_usage_sessions_v1"("p_organization_id" "uuid" DEFAULT NULL::"uuid", "p_from" timestamp with time zone DEFAULT ("now"() - '7 days'::interval), "p_to" timestamp with time zone DEFAULT "now"(), "p_limit" integer DEFAULT 500) RETURNS TABLE("id" "uuid", "organization_id" "uuid", "company_code" character varying, "organization_name" "text", "user_id" "uuid", "username" "text", "full_name" "text", "started_at" timestamp with time zone, "last_seen_at" timestamp with time zone, "ended_at" timestamp with time zone, "page_views" integer, "action_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_role text;
  v_limit integer := least(greatest(coalesce(p_limit, 500), 1), 2000);
begin
  select p.role
  into v_role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true;

  if v_role <> 'system_admin' then
    raise exception 'SYSTEM_ADMIN_REQUIRED';
  end if;

  return query
  select
    s.id,
    s.organization_id,
    o.company_code,
    o.name,
    s.user_id,
    s.username_snapshot,
    s.full_name_snapshot,
    s.started_at,
    s.last_seen_at,
    s.ended_at,
    s.page_views,
    (select count(*)::integer from public.activity_logs a where a.session_id = s.id)
  from public.usage_sessions s
  left join public.organizations o on o.id = s.organization_id
  where s.started_at >= coalesce(p_from, now() - interval '7 days')
    and s.started_at < coalesce(p_to, now() + interval '1 day')
    and (p_organization_id is null or s.organization_id = p_organization_id)
  order by s.started_at desc
  limit v_limit;
end;
$$;


ALTER FUNCTION "public"."admin_list_usage_sessions_v1"("p_organization_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_list_users_v1"("p_organization_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "organization_id" "uuid", "company_code" character varying, "organization_name" "text", "user_code" character varying, "username" "text", "email" "text", "full_name" "text", "role" "text", "language" "text", "is_active" boolean, "next_project_number" bigint, "created_at" timestamp with time zone, "project_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_role text;
  v_org_id uuid;
begin
  select p.role, p.organization_id
  into v_role, v_org_id
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true;

  if v_role not in ('system_admin', 'company_admin') then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if v_role = 'company_admin'
     and p_organization_id is not null
     and p_organization_id <> v_org_id then
    raise exception 'ORGANIZATION_ACCESS_DENIED';
  end if;

  return query
  select
    p.id,
    p.organization_id,
    o.company_code,
    o.name,
    p.user_code,
    p.username,
    p.email,
    p.full_name,
    p.role,
    p.language,
    p.is_active,
    p.next_project_number,
    p.created_at,
    (select count(*)::integer from public.projects pr where pr.created_by = p.id)
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  where
    (
      v_role = 'system_admin'
      and (p_organization_id is null or p.organization_id = p_organization_id)
    )
    or
    (
      v_role = 'company_admin'
      and p.organization_id = v_org_id
    )
  order by o.company_code, p.user_code nulls last, p.full_name;
end;
$$;


ALTER FUNCTION "public"."admin_list_users_v1"("p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_organization_v1"("p_organization_id" "uuid", "p_name" "text", "p_is_active" boolean, "p_license_end" "date", "p_max_users" integer, "p_enabled_products" "jsonb" DEFAULT '["PERGO_RISE"]'::"jsonb") RETURNS "public"."organizations"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_org public.organizations%rowtype;
  v_active_users integer;
  v_self_org uuid;
begin
  if not public.current_user_is_system_admin() then
    raise exception 'SYSTEM_ADMIN_REQUIRED';
  end if;
  if nullif(btrim(coalesce(p_name, '')), '') is null then
    raise exception 'ORGANIZATION_NAME_REQUIRED';
  end if;
  if coalesce(p_max_users, 0) not between 1 and 9999 then
    raise exception 'MAX_USERS_INVALID';
  end if;
  if jsonb_typeof(coalesce(p_enabled_products, '[]'::jsonb)) <> 'array' then
    raise exception 'PRODUCT_LIST_INVALID';
  end if;

  select organization_id into v_self_org
  from public.profiles
  where id = auth.uid();

  if p_organization_id = v_self_org
     and (coalesce(p_is_active, false) is false
          or (p_license_end is not null and p_license_end < current_date)) then
    raise exception 'CANNOT_LOCK_OWN_ORGANIZATION';
  end if;

  select count(*)::integer into v_active_users
  from public.profiles
  where organization_id = p_organization_id
    and is_active = true;

  if p_max_users < v_active_users then
    raise exception 'MAX_USERS_BELOW_ACTIVE_COUNT';
  end if;

  update public.organizations
  set name = btrim(p_name),
      is_active = coalesce(p_is_active, false),
      license_end = p_license_end,
      max_users = p_max_users,
      enabled_products = coalesce(p_enabled_products, '["PERGO_RISE"]'::jsonb)
  where id = p_organization_id
  returning * into v_org;

  if not found then raise exception 'ORGANIZATION_NOT_FOUND'; end if;
  return v_org;
end;
$$;


ALTER FUNCTION "public"."admin_update_organization_v1"("p_organization_id" "uuid", "p_name" "text", "p_is_active" boolean, "p_license_end" "date", "p_max_users" integer, "p_enabled_products" "jsonb") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "full_name" "text",
    "role" "text" DEFAULT 'designer'::"text" NOT NULL,
    "language" "text" DEFAULT 'tr'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "username" "text",
    "email" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "user_code" character varying(4),
    "next_project_number" bigint DEFAULT 1 NOT NULL,
    CONSTRAINT "profiles_language_check" CHECK (("language" = ANY (ARRAY['tr'::"text", 'en'::"text"]))),
    CONSTRAINT "profiles_next_project_number_range" CHECK ((("next_project_number" >= 1) AND ("next_project_number" <= 100000000))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['system_admin'::"text", 'company_admin'::"text", 'designer'::"text"]))),
    CONSTRAINT "profiles_user_code_format" CHECK ((("user_code" IS NULL) OR (("user_code")::"text" ~ '^[0-9]{4}$'::"text"))),
    CONSTRAINT "profiles_username_format" CHECK ((("username" IS NULL) OR ("username" ~ '^[a-z0-9._-]{3,32}$'::"text")))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_user_v1"("p_user_id" "uuid", "p_full_name" "text", "p_username" "text", "p_role" "text", "p_is_active" boolean) RETURNS "public"."profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_actor public.profiles%rowtype;
  v_target public.profiles%rowtype;
  v_result public.profiles%rowtype;
  v_other_admins integer;
begin
  select * into v_actor
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if not found or v_actor.role not in ('system_admin', 'company_admin') then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select * into v_target
  from public.profiles
  where id = p_user_id
  for update;

  if not found then raise exception 'USER_NOT_FOUND'; end if;
  if v_target.role = 'system_admin' then raise exception 'SYSTEM_ADMIN_PROTECTED'; end if;
  if p_user_id = auth.uid() then raise exception 'SELF_MANAGEMENT_NOT_ALLOWED'; end if;
  if v_actor.role = 'company_admin' and v_target.organization_id <> v_actor.organization_id then
    raise exception 'ORGANIZATION_ACCESS_DENIED';
  end if;
  if p_role not in ('company_admin', 'designer') then raise exception 'ROLE_INVALID'; end if;
  if nullif(btrim(coalesce(p_full_name, '')), '') is null then raise exception 'FULL_NAME_REQUIRED'; end if;
  if lower(btrim(coalesce(p_username, ''))) !~ '^[a-z0-9._-]{3,32}$' then
    raise exception 'USERNAME_INVALID';
  end if;

  if v_target.role = 'company_admin'
     and (p_role <> 'company_admin' or coalesce(p_is_active, false) is false) then
    select count(*)::integer into v_other_admins
    from public.profiles
    where organization_id = v_target.organization_id
      and id <> v_target.id
      and role = 'company_admin'
      and is_active = true;

    if v_other_admins = 0 then raise exception 'LAST_COMPANY_ADMIN_REQUIRED'; end if;
  end if;

  update public.profiles
  set full_name = btrim(p_full_name),
      username = lower(btrim(p_username)),
      role = p_role,
      is_active = coalesce(p_is_active, false)
  where id = p_user_id
  returning * into v_result;

  return v_result;
end;
$_$;


ALTER FUNCTION "public"."admin_update_user_v1"("p_user_id" "uuid", "p_full_name" "text", "p_username" "text", "p_role" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "project_code" "text" NOT NULL,
    "customer_name" "text",
    "project_name" "text" NOT NULL,
    "product_type" "text" DEFAULT 'PERGO_RISE'::"text" NOT NULL,
    "current_revision" integer DEFAULT 1 NOT NULL,
    "project_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "app_version" "text" DEFAULT '8.5.0'::"text" NOT NULL,
    "schema_version" integer DEFAULT 1 NOT NULL,
    "created_by" "uuid",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "archived_at" timestamp with time zone,
    CONSTRAINT "projects_current_revision_check" CHECK (("current_revision" > 0))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_project_v1"("p_project_name" "text", "p_customer_name" "text", "p_product_type" "text", "p_project_data" "jsonb", "p_app_version" "text", "p_schema_version" integer) RETURNS "public"."projects"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_profile public.profiles%rowtype;
  v_org public.organizations%rowtype;
  v_project public.projects%rowtype;
  v_project_code text;
  v_number bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(btrim(coalesce(p_project_name, '')), '') is null then
    raise exception 'PROJECT_NAME_REQUIRED';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid()
  for update;

  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_profile.is_active is not true then raise exception 'USER_INACTIVE'; end if;
  if v_profile.role not in ('system_admin', 'company_admin', 'designer') then
    raise exception 'READ_ONLY_USER';
  end if;
  if v_profile.organization_id is null then raise exception 'ORGANIZATION_NOT_ASSIGNED'; end if;
  if v_profile.user_code is null or v_profile.user_code !~ '^[0-9]{4}$' then
    raise exception 'USER_CODE_NOT_ASSIGNED';
  end if;

  select * into v_org
  from public.organizations
  where id = v_profile.organization_id;

  if not found then raise exception 'ORGANIZATION_NOT_FOUND'; end if;
  if v_org.company_code is null or v_org.company_code !~ '^[0-9]{4}$' then
    raise exception 'COMPANY_CODE_NOT_ASSIGNED';
  end if;

  v_number := v_profile.next_project_number;
  if v_number < 1 or v_number > 99999999 then
    raise exception 'PROJECT_COUNTER_LIMIT_REACHED';
  end if;

  v_project_code := v_org.company_code
    || '.' || v_profile.user_code
    || '.' || lpad(v_number::text, 8, '0');

  insert into public.projects (
    organization_id, project_code, customer_name, project_name, product_type,
    current_revision, project_data, app_version, schema_version,
    created_by, updated_by
  ) values (
    v_profile.organization_id,
    v_project_code,
    nullif(btrim(coalesce(p_customer_name, '')), ''),
    btrim(p_project_name),
    coalesce(nullif(btrim(coalesce(p_product_type, '')), ''), 'PERGO_RISE'),
    1,
    coalesce(p_project_data, '{}'::jsonb),
    coalesce(nullif(btrim(coalesce(p_app_version, '')), ''), '8.8.0'),
    greatest(coalesce(p_schema_version, 1), 1),
    auth.uid(),
    auth.uid()
  )
  returning * into v_project;

  insert into public.project_revisions (
    project_id, revision_no, project_data, app_version,
    schema_version, change_note, created_by
  ) values (
    v_project.id, 1, v_project.project_data, v_project.app_version,
    v_project.schema_version, 'İlk kayıt', auth.uid()
  );

  update public.profiles
  set next_project_number = next_project_number + 1
  where id = auth.uid();

  return v_project;
end;
$_$;


ALTER FUNCTION "public"."create_project_v1"("p_project_name" "text", "p_customer_name" "text", "p_product_type" "text", "p_project_data" "jsonb", "p_app_version" "text", "p_schema_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_revision_v1"("p_project_id" "uuid", "p_change_note" "text" DEFAULT NULL::"text") RETURNS "public"."projects"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_profile public.profiles%rowtype;
  v_project public.projects%rowtype;
  v_next_revision integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_profile.is_active is not true then raise exception 'USER_INACTIVE'; end if;
  if v_profile.role not in ('system_admin', 'company_admin', 'designer') then
    raise exception 'READ_ONLY_USER';
  end if;

  select p.* into v_project
  from public.projects p
  where p.id = p_project_id
    and p.organization_id = v_profile.organization_id
  for update;

  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;

  insert into public.project_revisions (
    project_id, revision_no, project_data, app_version,
    schema_version, change_note, created_by
  ) values (
    v_project.id,
    v_project.current_revision,
    v_project.project_data,
    v_project.app_version,
    v_project.schema_version,
    case when v_project.current_revision = 1 then 'İlk kayıt' else null end,
    auth.uid()
  )
  on conflict (project_id, revision_no)
  do update set
    project_data = excluded.project_data,
    app_version = excluded.app_version,
    schema_version = excluded.schema_version;

  v_next_revision := v_project.current_revision + 1;

  insert into public.project_revisions (
    project_id, revision_no, project_data, app_version,
    schema_version, change_note, created_by
  ) values (
    v_project.id,
    v_next_revision,
    v_project.project_data,
    v_project.app_version,
    v_project.schema_version,
    nullif(btrim(coalesce(p_change_note, '')), ''),
    auth.uid()
  );

  update public.projects
  set current_revision = v_next_revision,
      updated_by = auth.uid()
  where id = v_project.id
  returning * into v_project;

  return v_project;
end;
$$;


ALTER FUNCTION "public"."create_revision_v1"("p_project_id" "uuid", "p_change_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_organization_has_access"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(
    exists (
      select 1
      from public.profiles p
      join public.organizations o on o.id = p.organization_id
      where p.id = auth.uid()
        and p.is_active = true
        and o.is_active = true
        and (o.license_start is null or current_date >= o.license_start)
        and (o.license_end is null or current_date <= o.license_end)
    ),
    false
  );
$$;


ALTER FUNCTION "public"."current_organization_has_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_organization_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select p.organization_id
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1;
$$;


ALTER FUNCTION "public"."current_organization_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_can_write_projects"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(
    public.current_user_role() in ('system_admin', 'company_admin', 'designer'),
    false
  );
$$;


ALTER FUNCTION "public"."current_user_can_write_projects"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role in ('system_admin', 'company_admin')
    ),
    false
  );
$$;


ALTER FUNCTION "public"."current_user_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_is_system_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select coalesce(
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.role = 'system_admin'
    ),
    false
  );
$$;


ALTER FUNCTION "public"."current_user_is_system_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_role"() RETURNS "text"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
  limit 1;
$$;


ALTER FUNCTION "public"."current_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_project_v1"("p_project_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_profile public.profiles%rowtype;
  v_project public.projects%rowtype;
  v_revision_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_profile.role <> 'system_admin' then
    raise exception 'SYSTEM_ADMIN_REQUIRED';
  end if;

  select * into v_project
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    raise exception 'PROJECT_NOT_FOUND';
  end if;

  select count(*)::integer into v_revision_count
  from public.project_revisions
  where project_id = v_project.id;

  delete from public.projects
  where id = v_project.id;

  return jsonb_build_object(
    'ok', true,
    'project_id', v_project.id,
    'project_code', v_project.project_code,
    'project_name', v_project.project_name,
    'deleted_revision_count', v_revision_count
  );
end;
$$;


ALTER FUNCTION "public"."delete_project_v1"("p_project_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_usage_session_v1"("p_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if auth.uid() is null then return; end if;

  update public.usage_sessions
  set last_seen_at = now(),
      ended_at = now()
  where id = p_session_id
    and user_id = auth.uid();
end;
$$;


ALTER FUNCTION "public"."end_usage_session_v1"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_project_organization_access"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_org public.organizations%rowtype;
begin
  select * into v_org
  from public.organizations
  where id = new.organization_id;

  if not found then raise exception 'ORGANIZATION_NOT_FOUND'; end if;
  if v_org.is_active is not true then raise exception 'ORGANIZATION_INACTIVE'; end if;
  if v_org.license_start is not null and current_date < v_org.license_start then
    raise exception 'LICENSE_NOT_STARTED';
  end if;
  if v_org.license_end is not null and current_date > v_org.license_end then
    raise exception 'LICENSE_EXPIRED';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."enforce_project_organization_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."identify_usage_session_v1"("p_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_profile public.profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_session_id is null then raise exception 'SESSION_ID_REQUIRED'; end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  insert into public.usage_sessions (
    id, organization_id, user_id, username_snapshot, full_name_snapshot,
    started_at, last_seen_at, page_views
  ) values (
    p_session_id, v_log_org_id, v_profile.id,
    v_profile.username, v_profile.full_name,
    now(), now(), 1
  )
  on conflict (id) do update
  set organization_id = excluded.organization_id,
      user_id = excluded.user_id,
      username_snapshot = excluded.username_snapshot,
      full_name_snapshot = excluded.full_name_snapshot,
      last_seen_at = now();
end;
$$;


ALTER FUNCTION "public"."identify_usage_session_v1"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_activity_v1"("p_session_id" "uuid", "p_action" "text", "p_project_id" "uuid" DEFAULT NULL::"uuid", "p_project_code" "text" DEFAULT NULL::"text", "p_revision_no" integer DEFAULT NULL::integer, "p_detail" "jsonb" DEFAULT '{}'::"jsonb", "p_context_organization_id" "uuid" DEFAULT NULL::"uuid") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_profile public.profiles%rowtype;
  v_log_org_id uuid;
  v_log_id bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if lower(btrim(coalesce(p_action, ''))) !~ '^[a-z0-9_]{3,64}$' then
    raise exception 'ACTION_INVALID';
  end if;
  if jsonb_typeof(coalesce(p_detail, '{}'::jsonb)) <> 'object' then
    raise exception 'DETAIL_INVALID';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid()
    and is_active = true;

  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;

  v_log_org_id := v_profile.organization_id;
  if p_context_organization_id is not null
     and p_context_organization_id <> v_profile.organization_id then
    if v_profile.role <> 'system_admin' then
      raise exception 'ORGANIZATION_ACCESS_DENIED';
    end if;
    if not exists (select 1 from public.organizations o where o.id = p_context_organization_id) then
      raise exception 'ORGANIZATION_NOT_FOUND';
    end if;
    v_log_org_id := p_context_organization_id;
  end if;

  if p_project_id is not null and not exists (
    select 1 from public.projects pr
    where pr.id = p_project_id
      and pr.organization_id = v_log_org_id
  ) then
    raise exception 'PROJECT_ACCESS_DENIED';
  end if;

  update public.usage_sessions
  set last_seen_at = now()
  where id = p_session_id
    and user_id = auth.uid();

  insert into public.activity_logs (
    session_id, organization_id, user_id,
    username_snapshot, full_name_snapshot,
    action, project_id, project_code, revision_no, detail
  ) values (
    p_session_id, v_profile.organization_id, v_profile.id,
    v_profile.username, v_profile.full_name,
    lower(btrim(p_action)), p_project_id,
    nullif(btrim(coalesce(p_project_code, '')), ''),
    p_revision_no, coalesce(p_detail, '{}'::jsonb)
  ) returning id into v_log_id;

  return v_log_id;
end;
$_$;


ALTER FUNCTION "public"."log_activity_v1"("p_session_id" "uuid", "p_action" "text", "p_project_id" "uuid", "p_project_code" "text", "p_revision_no" integer, "p_detail" "jsonb", "p_context_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_project_identity"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.id := old.id;
  new.organization_id := old.organization_id;
  new.project_code := old.project_code;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  return new;
end;
$$;


ALTER FUNCTION "public"."protect_project_identity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."provision_invited_user_v1"("p_actor_id" "uuid", "p_user_id" "uuid", "p_organization_id" "uuid", "p_email" "text", "p_full_name" "text", "p_username" "text", "p_role" "text", "p_language" "text" DEFAULT 'tr'::"text") RETURNS "public"."profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_actor public.profiles%rowtype;
  v_org public.organizations%rowtype;
  v_result public.profiles%rowtype;
  v_active_users integer;
  v_next_code integer;
  v_user_code varchar(4);
begin
  select * into v_actor
  from public.profiles
  where id = p_actor_id
    and is_active = true;

  if not found or v_actor.role not in ('system_admin', 'company_admin') then
    raise exception 'ADMIN_REQUIRED';
  end if;
  if v_actor.role = 'company_admin' and v_actor.organization_id <> p_organization_id then
    raise exception 'ORGANIZATION_ACCESS_DENIED';
  end if;
  if p_role not in ('company_admin', 'designer') then raise exception 'ROLE_INVALID'; end if;
  if lower(btrim(coalesce(p_username, ''))) !~ '^[a-z0-9._-]{3,32}$' then
    raise exception 'USERNAME_INVALID';
  end if;
  if nullif(btrim(coalesce(p_full_name, '')), '') is null then raise exception 'FULL_NAME_REQUIRED'; end if;
  if nullif(btrim(coalesce(p_email, '')), '') is null then raise exception 'EMAIL_REQUIRED'; end if;

  perform pg_advisory_xact_lock(hashtext('PLMR_USER_CODE_' || p_organization_id::text));

  select * into v_org
  from public.organizations
  where id = p_organization_id
  for update;

  if not found then raise exception 'ORGANIZATION_NOT_FOUND'; end if;
  if v_org.is_active is not true then raise exception 'ORGANIZATION_INACTIVE'; end if;
  if v_org.license_start is not null and current_date < v_org.license_start then raise exception 'LICENSE_NOT_STARTED'; end if;
  if v_org.license_end is not null and current_date > v_org.license_end then raise exception 'LICENSE_EXPIRED'; end if;

  select count(*)::integer into v_active_users
  from public.profiles
  where organization_id = p_organization_id
    and is_active = true;

  if v_active_users >= v_org.max_users then raise exception 'USER_LIMIT_REACHED'; end if;

  select coalesce(max(user_code::integer), 0) + 1
  into v_next_code
  from public.profiles
  where organization_id = p_organization_id
    and user_code ~ '^[0-9]{4}$';

  if v_next_code > 9999 then raise exception 'USER_CODE_LIMIT_REACHED'; end if;
  v_user_code := lpad(v_next_code::text, 4, '0');

  insert into public.profiles (
    id, organization_id, username, email, full_name,
    role, language, user_code, next_project_number, is_active
  ) values (
    p_user_id,
    p_organization_id,
    lower(btrim(p_username)),
    lower(btrim(p_email)),
    btrim(p_full_name),
    p_role,
    case when p_language = 'en' then 'en' else 'tr' end,
    v_user_code,
    1,
    true
  )
  returning * into v_result;

  return v_result;
end;
$_$;


ALTER FUNCTION "public"."provision_invited_user_v1"("p_actor_id" "uuid", "p_user_id" "uuid", "p_organization_id" "uuid", "p_email" "text", "p_full_name" "text", "p_username" "text", "p_role" "text", "p_language" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_login_username_v1"("p_username" "text") RETURNS "text"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
declare
  v_email text;
  v_today date := current_date;
begin
  if lower(btrim(coalesce(p_username, ''))) !~ '^[a-z0-9._-]{3,32}$' then
    return null;
  end if;

  select p.email
    into v_email
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  where lower(p.username) = lower(btrim(p_username))
    and p.is_active = true
    and o.is_active = true
    and (o.license_start is null or o.license_start <= v_today)
    and (o.license_end is null or o.license_end >= v_today)
  limit 1;

  return v_email;
end;
$_$;


ALTER FUNCTION "public"."resolve_login_username_v1"("p_username" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resolve_login_username_v1"("p_username" "text") IS 'Resolves the internal Supabase Auth identity for an active PLMR username.';



CREATE OR REPLACE FUNCTION "public"."save_project_v1"("p_project_id" "uuid", "p_project_name" "text", "p_customer_name" "text", "p_product_type" "text", "p_project_data" "jsonb", "p_app_version" "text", "p_schema_version" integer) RETURNS "public"."projects"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_profile public.profiles%rowtype;
  v_project public.projects%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if nullif(btrim(coalesce(p_project_name, '')), '') is null then
    raise exception 'PROJECT_NAME_REQUIRED';
  end if;

  select * into v_profile
  from public.profiles
  where id = auth.uid();

  if not found then raise exception 'PROFILE_NOT_FOUND'; end if;
  if v_profile.is_active is not true then raise exception 'USER_INACTIVE'; end if;
  if v_profile.role not in ('system_admin', 'company_admin', 'designer') then
    raise exception 'READ_ONLY_USER';
  end if;

  select p.* into v_project
  from public.projects p
  where p.id = p_project_id
    and p.organization_id = v_profile.organization_id
  for update;

  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;

  update public.projects
  set customer_name = nullif(btrim(coalesce(p_customer_name, '')), ''),
      project_name = btrim(p_project_name),
      product_type = coalesce(nullif(btrim(coalesce(p_product_type, '')), ''), 'PERGO_RISE'),
      project_data = coalesce(p_project_data, '{}'::jsonb),
      app_version = coalesce(nullif(btrim(coalesce(p_app_version, '')), ''), '8.8.0'),
      schema_version = greatest(coalesce(p_schema_version, 1), 1),
      updated_by = auth.uid()
  where id = v_project.id
  returning * into v_project;

  insert into public.project_revisions (
    project_id, revision_no, project_data, app_version,
    schema_version, change_note, created_by
  ) values (
    v_project.id,
    v_project.current_revision,
    v_project.project_data,
    v_project.app_version,
    v_project.schema_version,
    case when v_project.current_revision = 1 then 'İlk kayıt' else null end,
    auth.uid()
  )
  on conflict (project_id, revision_no)
  do update set
    project_data = excluded.project_data,
    app_version = excluded.app_version,
    schema_version = excluded.schema_version;

  return v_project;
end;
$$;


ALTER FUNCTION "public"."save_project_v1"("p_project_id" "uuid", "p_project_name" "text", "p_customer_name" "text", "p_product_type" "text", "p_project_data" "jsonb", "p_app_version" "text", "p_schema_version" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_usage_session_v1"("p_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if p_session_id is null then raise exception 'SESSION_ID_REQUIRED'; end if;

  insert into public.usage_sessions (id, started_at, last_seen_at, page_views)
  values (p_session_id, now(), now(), 1)
  on conflict (id) do update
  set last_seen_at = now(),
      page_views = public.usage_sessions.page_views + 1;
end;
$$;


ALTER FUNCTION "public"."start_usage_session_v1"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_public_usage_session_v1"("p_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if p_session_id is null then return; end if;
  update public.usage_sessions
  set last_seen_at = now()
  where id = p_session_id;
end;
$$;


ALTER FUNCTION "public"."touch_public_usage_session_v1"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_usage_session_v1"("p_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  update public.usage_sessions
  set last_seen_at = now()
  where id = p_session_id
    and user_id = auth.uid();
end;
$$;


ALTER FUNCTION "public"."touch_usage_session_v1"("p_session_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" bigint NOT NULL,
    "session_id" "uuid",
    "organization_id" "uuid",
    "user_id" "uuid",
    "username_snapshot" "text",
    "full_name_snapshot" "text",
    "action" "text" NOT NULL,
    "project_id" "uuid",
    "project_code" "text",
    "revision_no" integer,
    "detail" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "activity_logs_action_format" CHECK (("action" ~ '^[a-z0-9_]{3,64}$'::"text")),
    CONSTRAINT "activity_logs_detail_object" CHECK (("jsonb_typeof"("detail") = 'object'::"text"))
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


ALTER TABLE "public"."activity_logs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."activity_logs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."project_revisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "revision_no" integer NOT NULL,
    "project_data" "jsonb" NOT NULL,
    "app_version" "text" NOT NULL,
    "schema_version" integer DEFAULT 1 NOT NULL,
    "change_note" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "project_revisions_revision_no_check" CHECK (("revision_no" > 0))
);


ALTER TABLE "public"."project_revisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."usage_sessions" (
    "id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "user_id" "uuid",
    "username_snapshot" "text",
    "full_name_snapshot" "text",
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_seen_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ended_at" timestamp with time zone,
    "page_views" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "usage_sessions_page_views_check" CHECK (("page_views" > 0))
);


ALTER TABLE "public"."usage_sessions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_revisions"
    ADD CONSTRAINT "project_revisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."project_revisions"
    ADD CONSTRAINT "project_revisions_project_id_revision_no_key" UNIQUE ("project_id", "revision_no");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_organization_id_project_code_key" UNIQUE ("organization_id", "project_code");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."usage_sessions"
    ADD CONSTRAINT "usage_sessions_pkey" PRIMARY KEY ("id");



CREATE INDEX "activity_logs_action_created_idx" ON "public"."activity_logs" USING "btree" ("action", "created_at" DESC);



CREATE INDEX "activity_logs_created_idx" ON "public"."activity_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "activity_logs_org_created_idx" ON "public"."activity_logs" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "activity_logs_user_created_idx" ON "public"."activity_logs" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "organizations_company_code_unique" ON "public"."organizations" USING "btree" ("company_code") WHERE ("company_code" IS NOT NULL);



CREATE UNIQUE INDEX "profiles_email_unique" ON "public"."profiles" USING "btree" ("lower"("email")) WHERE ("email" IS NOT NULL);



CREATE UNIQUE INDEX "profiles_org_user_code_unique" ON "public"."profiles" USING "btree" ("organization_id", "user_code") WHERE ("user_code" IS NOT NULL);



CREATE UNIQUE INDEX "profiles_username_unique" ON "public"."profiles" USING "btree" ("lower"("username")) WHERE ("username" IS NOT NULL);



CREATE INDEX "project_revisions_project_idx" ON "public"."project_revisions" USING "btree" ("project_id", "revision_no" DESC);



CREATE INDEX "projects_organization_updated_idx" ON "public"."projects" USING "btree" ("organization_id", "updated_at" DESC);



CREATE INDEX "usage_sessions_org_started_idx" ON "public"."usage_sessions" USING "btree" ("organization_id", "started_at" DESC);



CREATE INDEX "usage_sessions_started_idx" ON "public"."usage_sessions" USING "btree" ("started_at" DESC);



CREATE INDEX "usage_sessions_user_started_idx" ON "public"."usage_sessions" USING "btree" ("user_id", "started_at" DESC);



CREATE OR REPLACE TRIGGER "organizations_set_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "projects_enforce_organization_access" BEFORE INSERT OR UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_project_organization_access"();



CREATE OR REPLACE TRIGGER "projects_protect_identity" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."protect_project_identity"();



CREATE OR REPLACE TRIGGER "projects_set_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."usage_sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_revisions"
    ADD CONSTRAINT "project_revisions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."project_revisions"
    ADD CONSTRAINT "project_revisions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."usage_sessions"
    ADD CONSTRAINT "usage_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."usage_sessions"
    ADD CONSTRAINT "usage_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_select_own" ON "public"."organizations" FOR SELECT TO "authenticated" USING (("id" = ( SELECT "public"."current_organization_id"() AS "current_organization_id")));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_self_or_company_admin" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR (("organization_id" = ( SELECT "public"."current_organization_id"() AS "current_organization_id")) AND (( SELECT "public"."current_user_role"() AS "current_user_role") = ANY (ARRAY['system_admin'::"text", 'company_admin'::"text"])))));



ALTER TABLE "public"."project_revisions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "projects_select_own_org" ON "public"."projects" FOR SELECT TO "authenticated" USING (("organization_id" = ( SELECT "public"."current_organization_id"() AS "current_organization_id")));



CREATE POLICY "revisions_select_own_org" ON "public"."project_revisions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."projects" "p"
  WHERE (("p"."id" = "project_revisions"."project_id") AND ("p"."organization_id" = ( SELECT "public"."current_organization_id"() AS "current_organization_id"))))));



ALTER TABLE "public"."usage_sessions" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON TABLE "public"."organizations" TO "service_role";
GRANT SELECT ON TABLE "public"."organizations" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_create_organization_v1"("p_name" "text", "p_license_end" "date", "p_max_users" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_create_organization_v1"("p_name" "text", "p_license_end" "date", "p_max_users" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_create_organization_v1"("p_name" "text", "p_license_end" "date", "p_max_users" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_create_organization_v1"("p_name" "text", "p_license_end" "date", "p_max_users" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_list_activity_logs_v1"("p_organization_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_list_activity_logs_v1"("p_organization_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_list_activity_logs_v1"("p_organization_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_activity_logs_v1"("p_organization_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_list_organizations_v1"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_list_organizations_v1"() TO "anon";
GRANT ALL ON FUNCTION "public"."admin_list_organizations_v1"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_organizations_v1"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_list_usage_sessions_v1"("p_organization_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_list_usage_sessions_v1"("p_organization_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_list_usage_sessions_v1"("p_organization_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_usage_sessions_v1"("p_organization_id" "uuid", "p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_list_users_v1"("p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_list_users_v1"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_list_users_v1"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_list_users_v1"("p_organization_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_update_organization_v1"("p_organization_id" "uuid", "p_name" "text", "p_is_active" boolean, "p_license_end" "date", "p_max_users" integer, "p_enabled_products" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_update_organization_v1"("p_organization_id" "uuid", "p_name" "text", "p_is_active" boolean, "p_license_end" "date", "p_max_users" integer, "p_enabled_products" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_organization_v1"("p_organization_id" "uuid", "p_name" "text", "p_is_active" boolean, "p_license_end" "date", "p_max_users" integer, "p_enabled_products" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_organization_v1"("p_organization_id" "uuid", "p_name" "text", "p_is_active" boolean, "p_license_end" "date", "p_max_users" integer, "p_enabled_products" "jsonb") TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."admin_update_user_v1"("p_user_id" "uuid", "p_full_name" "text", "p_username" "text", "p_role" "text", "p_is_active" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_update_user_v1"("p_user_id" "uuid", "p_full_name" "text", "p_username" "text", "p_role" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_user_v1"("p_user_id" "uuid", "p_full_name" "text", "p_username" "text", "p_role" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_user_v1"("p_user_id" "uuid", "p_full_name" "text", "p_username" "text", "p_role" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "service_role";
GRANT SELECT ON TABLE "public"."projects" TO "authenticated";



REVOKE ALL ON FUNCTION "public"."create_project_v1"("p_project_name" "text", "p_customer_name" "text", "p_product_type" "text", "p_project_data" "jsonb", "p_app_version" "text", "p_schema_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_project_v1"("p_project_name" "text", "p_customer_name" "text", "p_product_type" "text", "p_project_data" "jsonb", "p_app_version" "text", "p_schema_version" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_project_v1"("p_project_name" "text", "p_customer_name" "text", "p_product_type" "text", "p_project_data" "jsonb", "p_app_version" "text", "p_schema_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_project_v1"("p_project_name" "text", "p_customer_name" "text", "p_product_type" "text", "p_project_data" "jsonb", "p_app_version" "text", "p_schema_version" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_revision_v1"("p_project_id" "uuid", "p_change_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_revision_v1"("p_project_id" "uuid", "p_change_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_revision_v1"("p_project_id" "uuid", "p_change_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_revision_v1"("p_project_id" "uuid", "p_change_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_organization_has_access"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_organization_has_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_organization_has_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_organization_has_access"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_organization_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_organization_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_organization_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_organization_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_can_write_projects"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_can_write_projects"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_can_write_projects"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_can_write_projects"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_is_system_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_is_system_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_is_system_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_is_system_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_project_v1"("p_project_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_project_v1"("p_project_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_project_v1"("p_project_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_project_v1"("p_project_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."end_usage_session_v1"("p_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."end_usage_session_v1"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."end_usage_session_v1"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."end_usage_session_v1"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_project_organization_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_project_organization_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_project_organization_access"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."identify_usage_session_v1"("p_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."identify_usage_session_v1"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."identify_usage_session_v1"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."identify_usage_session_v1"("p_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_activity_v1"("p_session_id" "uuid", "p_action" "text", "p_project_id" "uuid", "p_project_code" "text", "p_revision_no" integer, "p_detail" "jsonb", "p_context_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_activity_v1"("p_session_id" "uuid", "p_action" "text", "p_project_id" "uuid", "p_project_code" "text", "p_revision_no" integer, "p_detail" "jsonb", "p_context_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."log_activity_v1"("p_session_id" "uuid", "p_action" "text", "p_project_id" "uuid", "p_project_code" "text", "p_revision_no" integer, "p_detail" "jsonb", "p_context_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_activity_v1"("p_session_id" "uuid", "p_action" "text", "p_project_id" "uuid", "p_project_code" "text", "p_revision_no" integer, "p_detail" "jsonb", "p_context_organization_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_project_identity"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_project_identity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_project_identity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."provision_invited_user_v1"("p_actor_id" "uuid", "p_user_id" "uuid", "p_organization_id" "uuid", "p_email" "text", "p_full_name" "text", "p_username" "text", "p_role" "text", "p_language" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."provision_invited_user_v1"("p_actor_id" "uuid", "p_user_id" "uuid", "p_organization_id" "uuid", "p_email" "text", "p_full_name" "text", "p_username" "text", "p_role" "text", "p_language" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."provision_invited_user_v1"("p_actor_id" "uuid", "p_user_id" "uuid", "p_organization_id" "uuid", "p_email" "text", "p_full_name" "text", "p_username" "text", "p_role" "text", "p_language" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."provision_invited_user_v1"("p_actor_id" "uuid", "p_user_id" "uuid", "p_organization_id" "uuid", "p_email" "text", "p_full_name" "text", "p_username" "text", "p_role" "text", "p_language" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."resolve_login_username_v1"("p_username" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."resolve_login_username_v1"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_login_username_v1"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_login_username_v1"("p_username" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_project_v1"("p_project_id" "uuid", "p_project_name" "text", "p_customer_name" "text", "p_product_type" "text", "p_project_data" "jsonb", "p_app_version" "text", "p_schema_version" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_project_v1"("p_project_id" "uuid", "p_project_name" "text", "p_customer_name" "text", "p_product_type" "text", "p_project_data" "jsonb", "p_app_version" "text", "p_schema_version" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."save_project_v1"("p_project_id" "uuid", "p_project_name" "text", "p_customer_name" "text", "p_product_type" "text", "p_project_data" "jsonb", "p_app_version" "text", "p_schema_version" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_project_v1"("p_project_id" "uuid", "p_project_name" "text", "p_customer_name" "text", "p_product_type" "text", "p_project_data" "jsonb", "p_app_version" "text", "p_schema_version" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."start_usage_session_v1"("p_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."start_usage_session_v1"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."start_usage_session_v1"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_usage_session_v1"("p_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."touch_public_usage_session_v1"("p_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."touch_public_usage_session_v1"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."touch_public_usage_session_v1"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_public_usage_session_v1"("p_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."touch_usage_session_v1"("p_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."touch_usage_session_v1"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."touch_usage_session_v1"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_usage_session_v1"("p_session_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."activity_logs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."activity_logs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."activity_logs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."project_revisions" TO "service_role";
GRANT SELECT ON TABLE "public"."project_revisions" TO "authenticated";



GRANT ALL ON TABLE "public"."usage_sessions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































