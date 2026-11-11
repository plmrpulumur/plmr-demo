do $$
declare
  signature text:='public.plmr_v46_production_page(text,text,text,text,boolean,jsonb,integer,integer,boolean,bigint,boolean)';
begin
  if not exists(select 1 from pg_index where indexrelid='public.plmr_v46_unique_project_position'::regclass and indisunique and indisvalid) then
    raise exception 'Project sort position uniqueness is missing';
  end if;
  if has_function_privilege('anon',signature,'execute') or has_function_privilege('authenticated',signature,'execute')
     or not has_function_privilege('service_role',signature,'execute') then
    raise exception 'Unexpected production page privileges';
  end if;
  if has_function_privilege('anon','public.plmr_v46_compact_index(text)','execute') or
     has_function_privilege('authenticated','public.plmr_v46_compact_index(text)','execute') then
    raise exception 'Compact index is not private';
  end if;
end $$;
select 'V46 schema verified' as result,count(*) as master_rows from public.plmr_v41_projects;
