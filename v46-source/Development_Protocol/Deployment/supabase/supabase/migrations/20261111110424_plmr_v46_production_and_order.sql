-- Keep identity and workflow untouched. Only duplicate physical sort positions move.
lock table public.plmr_v41_projects in share row exclusive mode;
do $$
declare tenant text;
begin
  for tenant in select distinct scope from (
    select scope from public.plmr_v41_projects group by scope,position having count(*)>1
  ) duplicates loop
    perform set_config('plmr.v44_write_scope',tenant,true);
    with ranked as (
      select project_id,position,row_number() over(partition by position order by
        (value->>'plmrScaleSeed' is null),project_id) as duplicate
      from public.plmr_v41_projects where scope=tenant
    ), moves as (
      select project_id,row_number() over(order by position,project_id) +
        (select max(position) from public.plmr_v41_projects where scope=tenant) as new_position
      from ranked where duplicate>1
    )
    update public.plmr_v41_projects p set position=m.new_position
      from moves m where p.scope=tenant and p.project_id=m.project_id;
  end loop;
  perform set_config('plmr.v44_write_scope','',true);
  execute format('alter sequence public.plmr_v41_project_order restart with %s',
    greatest((select last_value+1 from public.plmr_v41_project_order),
             coalesce((select max(position)+1 from public.plmr_v41_projects),1)));
end $$;
create unique index plmr_v46_unique_project_position on public.plmr_v41_projects(scope,position);

create function public.plmr_v46_master_before_write() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='INSERT' then
    perform pg_advisory_xact_lock(hashtextextended(new.scope,46));
    new.position:=greatest(new.position,coalesce((
      select position+1 from public.plmr_v41_projects where scope=new.scope order by position desc limit 1
    ),1));
  elsif new.value is not null and old.value ? 'productionItems' and not new.value ? 'productionItems' then
    new.value:=new.value||jsonb_build_object('productionItems',old.value->'productionItems');
  end if;
  return new;
end $$;
revoke all on function public.plmr_v46_master_before_write() from public,anon,authenticated;
create trigger plmr_v43_v46_master_before_write before insert or update on public.plmr_v41_projects
  for each row execute function public.plmr_v46_master_before_write();

create function public.plmr_v46_compact_index(p_scope text)
returns jsonb language sql stable security invoker set search_path='' as $$
select case when not exists(select 1 from public.plmr_v44_project_mode where scope=p_scope)
  then public.plmr_v44_index_snapshot(p_scope)
  else jsonb_build_object('version',mode.legacy_version,'normalized',true,
    'projects',coalesce((select jsonb_agg(jsonb_build_object('id',p.project_id,'version',p.version,
      'value',p.value-'productionItems'||jsonb_build_object('productionPositionCounts',
        coalesce((select jsonb_object_agg(product,n) from (
          select coalesce(nullif(item->>'urun',''),'Belirtilmemiş') product,count(*) n
          from jsonb_array_elements(coalesce(nullif(p.value->'productionItems','null'::jsonb),'[]'::jsonb)) item group by 1
        ) counts),'{}'::jsonb))) order by p.position desc)
      from public.plmr_v41_projects p where p.scope=p_scope and p.value is not null),'[]'::jsonb))
  end
from public.plmr_v41_index_mode mode where mode.scope=p_scope and mode.active;
$$;
revoke all on function public.plmr_v46_compact_index(text) from public,anon,authenticated;
grant execute on function public.plmr_v46_compact_index(text) to service_role;

create function public.plmr_v46_project_scope(p_value jsonb,p_actor text,p_scope text)
returns boolean language sql immutable security invoker set search_path='' as $$
  select coalesce(p_scope='ALL_COMPANY'
    or (p_scope in ('OWN','OWN_OR_ASSIGNED') and p_actor in
      (p_value->>'ownerUserId',p_value->>'createdByUserId',p_value->>'projectRepresentativeUserId'))
    or (p_scope in ('ASSIGNED','OWN_OR_ASSIGNED') and (p_value->'assignedUserIds') ? p_actor),false);
$$;

create function public.plmr_v46_text_match(p_value text,p_query text)
returns boolean language sql immutable security invoker set search_path='' as $$
  select coalesce(btrim(p_query),'')='' or strpos(
    lower(translate(coalesce(p_value,''),'Iİ','ıi')),lower(translate(btrim(p_query),'Iİ','ıi'))) > 0;
$$;

create function public.plmr_v46_sort_date(p_value text)
returns timestamptz language plpgsql stable security invoker set search_path='' as $$
declare
  parts text[];
begin
  if p_value ~ '^\d{4}-\d{2}-\d{2}' then return p_value::timestamptz; end if;
  parts:=regexp_match(p_value,'^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})(?:[, ]+(\d{1,2}):(\d{2}))?$');
  if parts is null then return null; end if;
  return make_timestamptz(parts[3]::int+case when length(parts[3])=2 then 2000 else 0 end,
    parts[2]::int,parts[1]::int,coalesce(parts[4]::int,0),coalesce(parts[5]::int,0),0,'Europe/Istanbul');
exception when invalid_datetime_format or datetime_field_overflow then return null;
end $$;

create function public.plmr_v46_production_page(
  p_company text,p_actor text,p_projects text,p_operations text,p_technical boolean,p_query jsonb,
  p_offset integer,p_limit integer,p_include_items boolean default false,p_id bigint default null,
  p_facets boolean default false
) returns jsonb language sql stable security invoker set search_path='' as $$
with authorized as materialized (
  select p.project_id,p.position,p.value v,
    coalesce(nullif(p.value->'productionItems','null'::jsonb),'[]'::jsonb) items,
    case p.value->>'status'
      when 'onaylandi' then '20' when 'uretimde' then '30'
      when 'sevke-hazir' then '30' when 'sevk-edildi' then '40' else p.value->>'status' end status
  from public.plmr_v41_projects p
  where p.scope=p_company and p.value is not null and (p_id is null or p.project_id=p_id)
    and (p_technical or (nullif(p.value->>'sourceQuickQuoteId','') is not null and p.value->>'hasTechnicalDrawing' is distinct from 'true'))
    and public.plmr_v46_project_scope(p.value,p_actor,p_projects)
    and public.plmr_v46_project_scope(p.value-'projectRepresentativeUserId'||
      jsonb_build_object('projectRepresentativeUserId',p.value->'representativeUserId'),p_actor,p_projects)
    and public.plmr_v46_project_scope(p.value,p_actor,p_operations)
), eligible as materialized (
  select *,jsonb_array_length(items) item_count from authorized
  where jsonb_array_length(items)>0 and (
    (nullif(v->>'deletedAt','') is null and status in ('20','30','40','50','60'))
    or (status='arsivlendi' and not exists(select 1 from jsonb_array_elements(items) i where i->>'status' is distinct from '60'))
  )
), filtered as materialized (
  select e.*,p_query->>'sort' sort_field,p_query->>'direction' direction
  from eligible e
  where (nullif(p_query->>'status','') is null or e.status=p_query->>'status')
    and (nullif(p_query->>'customer','') is null or v->>'musteriAdi'=p_query->>'customer')
    and (coalesce(p_query->>'search','')='' or
      public.plmr_v46_text_match(concat_ws(' ',v->>'projKodu',v->>'projeAdi',v->>'musteriAdi'),p_query->>'search')
      or exists(select 1 from jsonb_array_elements(items) i where public.plmr_v46_text_match(i->>'kod',p_query->>'search')
        or public.plmr_v46_text_match(i->>'urun',p_query->>'search')))
    and not exists (
      select 1 from jsonb_each_text(coalesce(p_query->'columns','{}'::jsonb)) f(key,q) where btrim(q)<>'' and not
      case key
        when 'sira' then public.plmr_v46_text_match(v->>'siraNo',q)
        when 'project' then public.plmr_v46_text_match(v->>'projKodu',q)
        when 'name' then public.plmr_v46_text_match(v->>'projeAdi',q)
        when 'customer' then public.plmr_v46_text_match(v->>'musteriAdi',q)
        when 'representative' then public.plmr_v46_text_match(coalesce(v->>'cizen','—'),q)
        when 'openedBy' then public.plmr_v46_text_match(coalesce(v->>'uretimiAcan','—'),q)
        when 'orderDate' then public.plmr_v46_text_match(coalesce(to_char(public.plmr_v46_sort_date(v->>'orderApprovedAt') at time zone 'Europe/Istanbul','DD.MM.YYYY HH24:MI')||' ','')||coalesce(v->>'orderApprovedAt','—'),q)
        when 'lastAction' then public.plmr_v46_text_match(coalesce(to_char(public.plmr_v46_sort_date(v->>'sonIslemTarihi') at time zone 'Europe/Istanbul','DD.MM.YYYY HH24:MI')||' ','')||coalesce(v->>'sonIslemTarihi','—'),q)
        when 'status' then e.status=q
        when 'code' then exists(select 1 from jsonb_array_elements(items) i where public.plmr_v46_text_match(i->>'kod',q))
        when 'qty' then public.plmr_v46_text_match(item_count::text,q) or exists(
          select 1 from jsonb_array_elements(items) i where public.plmr_v46_text_match(i->>'miktar',q))
        when 'product' then exists(select 1 from jsonb_array_elements(items) i where i->>'urun'=q)
        when 'technical' then exists(select 1 from jsonb_array_elements(items) i where i->>'teknikTamamlandi'=q)
        when 'approved' then exists(select 1 from jsonb_array_elements(items) i where public.plmr_v46_text_match(coalesce(i->'milestones'->>'onaylandi','—'),q))
        when 'inProduction' then exists(select 1 from jsonb_array_elements(items) i where public.plmr_v46_text_match(coalesce(i->'milestones'->>'uretimde','—'),q))
        when 'transfer' then exists(select 1 from jsonb_array_elements(items) i where public.plmr_v46_text_match(coalesce(i->'milestones'->>'transfer','—'),q))
        when 'ready' then exists(select 1 from jsonb_array_elements(items) i where public.plmr_v46_text_match(coalesce(i->'milestones'->>'delivery','—'),q))
        when 'shipped' then exists(select 1 from jsonb_array_elements(items) i where public.plmr_v46_text_match(coalesce(i->'milestones'->>'delivered','—'),q))
        else true
      end
    )
), sortable as (
  select *,
    case sort_field when 'sira' then v->>'siraNo' when 'project' then v->>'projKodu'
      when 'name' then v->>'projeAdi' when 'customer' then v->>'musteriAdi'
      when 'representative' then v->>'cizen' when 'openedBy' then v->>'uretimiAcan' end sort_text,
    case when sort_field in ('qty','productCount') then item_count
      when sort_field='status' then case when status='arsivlendi' then -1 else status::int end end sort_number,
    case when sort_field='lastAction' then public.plmr_v46_sort_date(v->>'sonIslemTarihi')
      when sort_field='orderDate' then public.plmr_v46_sort_date(v->>'orderApprovedAt')
      when coalesce(sort_field,'created') not in ('sira','project','name','customer','representative','openedBy','qty','productCount','status')
      then public.plmr_v46_sort_date(v->>'olusturmaTarihi') end sort_date
  from filtered
), page as (
  select * from sortable order by
    case when direction='asc' then sort_text end asc nulls last,
    case when direction is distinct from 'asc' then sort_text end desc nulls last,
    case when direction='asc' then sort_number end asc nulls last,
    case when direction is distinct from 'asc' then sort_number end desc nulls last,
    case when direction='asc' then sort_date end asc nulls last,
    case when direction is distinct from 'asc' then sort_date end desc nulls last,
    position desc
  offset greatest(p_offset,0) limit least(greatest(p_limit,1),case when p_include_items then 100 else 5 end)
)
select jsonb_build_object(
  'rows',coalesce((select jsonb_agg(jsonb_build_object('id',project_id,'productionItemCount',item_count,'status',status,
    'projectId',v->'projectId','siraNo',v->'siraNo','projKodu',v->'projKodu','projeAdi',v->'projeAdi',
    'musteriAdi',v->'musteriAdi','cizen',v->'cizen','uretimiAcan',v->'uretimiAcan','orderApprovedAt',v->'orderApprovedAt',
    'sonIslemTarihi',v->'sonIslemTarihi','olusturmaTarihi',v->'olusturmaTarihi',
    'productionItems',case when p_include_items then items else '[]'::jsonb end,
    'productionLocked',v->'approvals'->'production' is not null and v->'approvals'->'production'<>'null'::jsonb))
    from page),'[]'::jsonb),
  'total',(select count(*) from filtered),
  'available',(select count(*) from eligible),
  'counts',coalesce((select jsonb_object_agg(status,n) from (select status,count(*) n from eligible group by status) grouped),'{}'::jsonb),
  'products',case when p_facets then coalesce((select jsonb_agg(product order by product) from (
    select distinct i->>'urun' product from eligible cross join lateral jsonb_array_elements(items) i
    where nullif(i->>'urun','') is not null
  ) products),'[]'::jsonb) else '[]'::jsonb end,
  'customers',case when p_facets then coalesce((select jsonb_agg(customer order by customer) from (
    select distinct v->>'musteriAdi' customer from eligible where nullif(v->>'musteriAdi','') is not null
  ) customers),'[]'::jsonb) else '[]'::jsonb end
);
$$;
revoke all on function public.plmr_v46_project_scope(jsonb,text,text),
  public.plmr_v46_text_match(text,text), public.plmr_v46_sort_date(text),
  public.plmr_v46_production_page(text,text,text,text,boolean,jsonb,integer,integer,boolean,bigint,boolean)
from public,anon,authenticated;
grant execute on function public.plmr_v46_project_scope(jsonb,text,text),
  public.plmr_v46_text_match(text,text), public.plmr_v46_sort_date(text),
  public.plmr_v46_production_page(text,text,text,text,boolean,jsonb,integer,integer,boolean,bigint,boolean)
to service_role;
