const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const src=path.resolve(__dirname,'..'),dev=path.resolve(src,'..'),root=path.resolve(dev,'..'),hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const manifest=JSON.parse(fs.readFileSync(dev+'/SOURCE_BUILD_MANIFEST.json'));
const backend=JSON.parse(fs.readFileSync(dev+'/V46_BACKEND_MANIFEST.json'));
assert.equal(hash(path.join(dev,backend.output)),backend.sha256);
for(const [rel,sha]of Object.entries(backend.sourceHashes))assert.equal(hash(path.join(dev,rel)),sha,rel);
assert.equal(manifest.release,'PLMR_FinalProcess_v46');
for(const section of ['sourceHashes','styleHashes'])for(const [rel,sha]of Object.entries(manifest[section]))assert.equal(hash(path.join(src,rel)),sha,rel);
assert.equal(hash(root+'/Uygulama/github/index.html'),manifest.runtimeHash);
const webRoot=root+'/Uygulama/github/web',web=JSON.parse(fs.readFileSync(webRoot+'/WEB_FILES.json'));
assert.equal(web.release,'PLMR_FinalProcess_v46');
for(const [rel,sha] of Object.entries(web.files)){
 assert.equal(hash(webRoot+'/'+rel),sha,rel);
 if(fs.existsSync(src+'/dist/'+rel))assert.equal(hash(src+'/dist/'+rel),sha,rel);
}
for(const rel of ['src/app.js','src/final-host-bridge.js','src/rr-scene-viewer.js','src/v25-composite-runtime.js','src/v15-project-ui.js','src/v10-language.js'])assert.equal(hash(dev+'/drawing-engine/'+rel),hash(root+'/Uygulama/github/drawing-engine/'+rel),rel);
const deployment=JSON.parse(fs.readFileSync(dev+'/DEPLOYMENT_SOURCE_MANIFEST.json'));assert.equal(deployment.release,'PLMR_FinalProcess_v46');
for(const [rel,sha]of Object.entries(deployment.files))assert.equal(hash(root+'/Uygulama/'+rel),sha,rel);
const pwa=JSON.parse(fs.readFileSync(dev+'/PWA_BUILD_MANIFEST.json'));
for(const [target,build]of Object.entries(pwa)){
 assert.equal(build.release,'PLMR_FinalProcess_v46');const folder=path.resolve(dev,target);if(!fs.existsSync(folder))continue;
 for(const [rel,sha]of Object.entries(build.sources))assert.equal(hash(path.join(src,rel)),sha,rel);
 for(const [rel,sha]of Object.entries(build.outputs))assert.equal(hash(path.join(folder,rel)),sha,target+': '+rel);
 const worker=fs.readFileSync(folder+'/sw.js','utf8'),lines=worker.split('\n');
 // This generated Vite mirror is omitted from ZIPs, as in V15. build:offline /
 // build:web recreates it from the preserved canonical engine before Vite runs.
 if(target==='03_DEVELOPMENT_SOURCE/public'&&!fs.existsSync(folder+'/drawing-engine'))continue;
 const revisions=JSON.parse(lines[1].slice('const PLMR_ASSET_REVISIONS='.length,-1));
 for(const [rel,sha]of Object.entries(revisions))assert.equal(hash(path.join(folder,rel)),sha,target+': '+rel);
 assert.equal(lines.slice(3).join('\n'),fs.readFileSync(src+'/pwa/service-worker.js','utf8'));
}
const supabase=path.join(root,'Uygulama/supabase');
const schema=JSON.parse(fs.readFileSync(path.join(dev,'SUPABASE_SCHEMA_BASELINE.json')));
for(const [rel,sha]of Object.entries(schema.files))assert.equal(hash(path.join(supabase,rel)),sha,rel);
assert.equal(hash(path.join(supabase,'supabase/migrations/20261109192312_plmr_v40_project_performance.sql')),'e271c3d5da0a09f42c6d8808cb8f2fd7f0365a3cc7179ce2a424f55e130de5e1');
const migrationDir=path.join(supabase,'supabase/migrations');
assert.equal(fs.readdirSync(migrationDir).filter(name=>name.endsWith('.sql')).length,17);
assert(fs.readdirSync(migrationDir).some(name=>name.endsWith('_plmr_v41_isolated_projects.sql')));
const uploader=fs.readFileSync(path.join(supabase,'BAGLANTI_VE_YUKLEME.ps1'),'utf8');
const applied=uploader.indexOf("'db','push','--yes'"),checked=uploader.indexOf('Testler/verify-v46.sql');
assert(applied>=0&&checked>applied&&uploader.indexOf("'functions','deploy','plmr-platform'")>checked);
console.log('PASS V46 source/runtime, publication, PWA identities/icons/service-worker revisions and Supabase hashes');
