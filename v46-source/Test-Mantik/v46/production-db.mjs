import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
const require=createRequire(import.meta.url);
const {PGlite}=require(process.env.PLMR_QA_NODE_MODULES+'/@electric-sql/pglite');
const db=new PGlite();
const migration=readFileSync(new URL('../../Development_Protocol/Deployment/supabase/supabase/migrations/20261111110424_plmr_v46_production_and_order.sql',import.meta.url),'utf8');
await db.exec(`
 create role anon; create role authenticated; create role service_role;
 create sequence public.plmr_v41_project_order start 2113;
 create table public.plmr_v41_index_mode(scope text primary key,legacy_version bigint not null,active boolean not null);
 create table public.plmr_v44_project_mode(scope text primary key);
 create table public.plmr_v41_projects(scope text,project_id bigint,position bigint not null,version bigint,value jsonb,primary key(scope,project_id));
 create function public.plmr_v44_index_snapshot(p_scope text) returns jsonb language sql stable as $$
   select jsonb_build_object('normalized',true,'version',1,'projects',coalesce(
     jsonb_agg(jsonb_build_object('id',project_id,'value',value,'version',version) order by position desc),'[]'::jsonb))
   from public.plmr_v41_projects where scope=p_scope and value is not null;
 $$;
 grant select on public.plmr_v41_projects,public.plmr_v41_index_mode,public.plmr_v44_project_mode to service_role;
 insert into public.plmr_v41_index_mode values ('test-firma',1,true),('foreign',1,true);
 insert into public.plmr_v44_project_mode values ('test-firma'),('foreign');
 insert into public.plmr_v41_projects
 select 'test-firma',n,case when n=3001 then 2112 else 2106+n end,1,jsonb_build_object(
  'id',n,'projectId','synthetic-'||n,'projKodu','V46-'||lpad(n::text,4,'0'),'siraNo',n::text,
  'musteriAdi','Müşteri '||n%100,'projeAdi',case when n=3000 then 'İzmir özel' else 'Ölçek projesi '||n end,
  'cizen','Test Tasarımcı','hasTechnicalDrawing',true,'updatedAt','2026-11-11T10:00:00Z',
  'ownerUserId',case when n%2=0 then 'owner' else 'other' end,
  'assignedUserIds',case when n%3=0 then '["owner"]'::jsonb else '[]'::jsonb end,
  'status',case when n%5=0 then 30 else 20 end,'olusturmaTarihi','2026-11-11T10:00:00Z',
  'quotes',jsonb_build_array(jsonb_build_object('id',case when n=3001 then 'q-1' else 'q-'||n end,
    'date',case when n=3000 then '2026-11-12' else '2026-11-11' end,'amount',100,'currency','EUR','kind','quick')),
  'productionItems',(select jsonb_agg(jsonb_build_object('id',n||'-'||item,'kod','GU-'||item,'urun','Giyotin',
    'miktar',item,'status',20,'teknikTamamlandi','complete','technicalDetail',repeat('a',45),
    'milestones',jsonb_build_object('onaylandi','11.11.26 13:00','uretimde','11.11.26 14:30'))) from generate_series(1,11) item)
 )||case when n<3001 then '{"plmrScaleSeed":"V46_LOCAL"}'::jsonb else '{}'::jsonb end
 from generate_series(1,3001) n;
 insert into public.plmr_v41_projects select 'foreign',project_id,position,version,value from public.plmr_v41_projects where project_id=3000;
`);
const one=async(sql,params=[])=> (await db.query(sql,params)).rows[0];
const snap45=()=>one("select public.plmr_v44_index_snapshot('test-firma') data");
const snap46=()=>one("select public.plmr_v46_compact_index('test-firma') data");
const before=await one("select count(*)::int n,count(distinct position)::int unique_positions from public.plmr_v41_projects where scope='test-firma'");
assert.deepEqual(before,{n:3001,unique_positions:3000});
const valueBefore=(await one("select value,version from public.plmr_v41_projects where scope='test-firma' and project_id=3001"));
await db.exec('begin;\n'+migration+'\ncommit;');
const after=await one("select count(*)::int n,count(distinct position)::int unique_positions,count(distinct value->>'projKodu')::int codes,count(distinct value->>'projectId')::int ids from public.plmr_v41_projects where scope='test-firma'");
assert.deepEqual(after,{n:3001,unique_positions:3001,codes:3001,ids:3001});
assert.deepEqual(await one("select value,version from public.plmr_v41_projects where scope='test-firma' and project_id=3001"),valueBefore);
await db.exec("begin; insert into public.plmr_v41_projects values ('test-firma',8000,2113,1,'{}'),('test-firma',8001,2113,1,'{}');");
const allocated=await one("select min(position)::int first,max(position)::int last from public.plmr_v41_projects where scope='test-firma' and project_id>=8000");
assert(allocated.first>5106&&allocated.last===allocated.first+1);
await db.exec("update public.plmr_v41_projects set value=value-'productionItems' where scope='test-firma' and project_id=3001;");
assert.deepEqual(await one("select value,version from public.plmr_v41_projects where scope='test-firma' and project_id=3001"),valueBefore);
await db.exec('rollback;');
console.log('PASS duplicate position repaired, append above maximum, identities/values unchanged, compact updates preserve positions and production items');

const prod=async({query={},offset=0,items=false,id=null,scope='ALL_COMPANY',technical=true,facets=false}={})=>
 (await one("select public.plmr_v46_production_page('test-firma','owner',$1,$1,$2,$3,$4,5,$5,$6,$7) data",
  [scope,technical,JSON.stringify(query),offset,items,id,facets])).data;
const first=await prod(),next=await prod({offset:5});
assert.equal(first.total,3001);assert.equal(first.rows.length,5);
assert.equal(next.rows.length,5);assert(first.rows.every(row=>row.productionItems.length===0));
assert(first.rows.every(row=>!next.rows.some(other=>other.id===row.id)));
assert.equal((await prod({query:{search:'İZMİR'}})).rows[0].projKodu,'V46-3000');
assert.equal((await prod({query:{sort:'project',direction:'asc',columns:{code:'GU-11',inProduction:'14:30'}}})).rows[0].projKodu,'V46-0001');
assert.equal((await prod({query:{status:'30'}})).total,600);
assert.equal((await prod({items:true,id:3001})).rows[0].productionItems.length,11);
assert.equal((await prod({scope:'OWN'})).total,1500);
assert.equal((await prod({scope:'ASSIGNED'})).total,1000);
assert.equal((await prod({technical:false})).total,0);
assert.equal((await prod({facets:true})).customers.length,100);
await db.exec('set role authenticated');
await assert.rejects(prod(),/permission denied/);
await db.exec('reset role');
console.log('PASS 3,001-row SQL, five headers per page, full-data filters/sort, item-on-demand, scope and RPC grants');

const pctl=(values,p)=>[...values].sort((a,b)=>a-b)[Math.ceil(p*values.length)-1].toFixed(1);
async function measure(name,fn,repeat){
 const durations=[];let bytes=0;
 for(let i=0;i<repeat+1;i++){
  const start=performance.now(),data=await fn(),serialized=JSON.stringify(data);
  const elapsed=performance.now()-start;
  if(i)durations.push(elapsed);
  bytes=Buffer.byteLength(serialized);
 }
 return {name,samples:repeat,p50Ms:pctl(durations,.5),p95Ms:pctl(durations,.95),bytes};
}
const results=[await measure('V45 database snapshot',snap45,8),await measure('V46 compact database snapshot',snap46,8),
 await measure('V46 production page',()=>prod(),16),await measure('V46 production filtered',()=>prod({query:{search:'İzmir'}}),16)];
assert(results[1].bytes<results[0].bytes*.55);
assert(results[2].bytes<5000);
const compact=(await snap46()).data;
assert(compact.projects.every(p=>!('productionItems' in p.value)&&p.value.productionPositionCounts.Giyotin===11));
console.log(JSON.stringify({engine:'PostgreSQL/PGlite, synthetic 3001 projects, SQL + result decode + serialization, no remote network',results},null,2));
await db.close();
