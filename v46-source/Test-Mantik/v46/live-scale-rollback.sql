-- Synthetic isolated scope. A subtransaction rolls back every inserted row.
do $v46$
declare
  tenant constant text:='V46_QA_3001_20261111';
  measurements jsonb:='[]';
  output jsonb;
  kind text;
  started timestamptz;
  run integer;
  n integer;
begin
  if exists(select 1 from public.plmr_v41_index_mode where scope=tenant) then
    raise exception 'Synthetic QA scope already exists';
  end if;
  begin
    insert into public.plmr_v41_index_mode(scope,legacy_version,active) values(tenant,1,true);
    insert into public.plmr_v44_project_mode(scope) values(tenant);
    perform set_config('plmr.v44_write_scope',tenant,true);
    insert into public.plmr_v41_projects(scope,project_id,position,version,value)
    select tenant,i,i,1,jsonb_build_object(
      'id',i,'projectId',gen_random_uuid(),'projKodu','V46-QA-'||i,'siraNo',i::text,
      'ownerUserId','qa-owner','status',case when i%5=0 then 30 else 20 end,
      'musteriAdi','QA Müşteri '||i%120,'projeAdi',case when i=3001 then 'İzmir QA Özel' else 'QA Proje '||i end,
      'olusturmaTarihi','2026-11-11T08:00:00Z','sonIslemTarihi','11.11.26 11:00','hasTechnicalDrawing',true,
      'quotes',jsonb_build_array(jsonb_build_object('id',case when i=3000 then 'QA-1' else 'QA-'||i end,
        'date',case when i=3001 then '2026-11-12' else '2026-11-11' end,'amount',100,'currency','EUR','kind','quick')),
      'productionItems',(select jsonb_agg(jsonb_build_object('id',i||'-'||j,'kod','GU-'||j,'urun','Giyotin',
        'miktar',j,'status',20,'teknikTamamlandi','complete','technicalDetail',repeat('a',45),
        'milestones',jsonb_build_object('onaylandi','11.11.26 11:00'))) from generate_series(1,11) j)
    ) from generate_series(1,3001) i;
    select count(distinct quote->>'id') into n from public.plmr_v41_projects p,
      lateral jsonb_array_elements(p.value->'quotes') quote
    where p.scope=tenant and (quote->>'date')::date between date '2026-11-05' and date '2026-11-11';
    if n<>2999 then raise exception 'Incorrect independent quote count: %',n; end if;
    for kind in select unnest(array['v45_snapshot','v46_snapshot','v46_production_page','v46_production_filter']) loop
      for run in 0..10 loop
        started:=clock_timestamp();
        case kind
          when 'v45_snapshot' then output:=public.plmr_v44_index_snapshot(tenant);
          when 'v46_snapshot' then output:=public.plmr_v46_compact_index(tenant);
          when 'v46_production_page' then
            output:=public.plmr_v46_production_page(tenant,'qa-owner','ALL_COMPANY','ALL_COMPANY',true,'{}',0,5);
          else
            output:=public.plmr_v46_production_page(tenant,'qa-owner','ALL_COMPANY','ALL_COMPANY',true,'{"search":"İzmir"}',0,5);
        end case;
        if run>0 then
          measurements:=measurements||jsonb_build_array(jsonb_build_object(
            'kind',kind,'elapsed_ms',extract(epoch from clock_timestamp()-started)*1000,
            'bytes',octet_length(output::text)));
        end if;
      end loop;
    end loop;
    if (output->>'total')::int<>1 or output->'rows'->0->>'projKodu'<>'V46-QA-3001' then
      raise exception 'Filtered page did not find project 3001';
    end if;
    raise sqlstate 'P4601';
  exception when sqlstate 'P4601' then
    null;
  end;
  perform set_config('plmr.v46_bench',measurements::text,false);
end $v46$;
select item->>'kind' as operation,count(*) as samples,
  round(percentile_disc(.5) within group(order by (item->>'elapsed_ms')::numeric),2) p50_ms,
  round(percentile_disc(.95) within group(order by (item->>'elapsed_ms')::numeric),2) p95_ms,
  max((item->>'bytes')::bigint) bytes,
  (select count(*) from public.plmr_v41_projects where scope='V46_QA_3001_20261111') as remaining_test_rows
from jsonb_array_elements(current_setting('plmr.v46_bench')::jsonb) item
group by 1 order by 1;
