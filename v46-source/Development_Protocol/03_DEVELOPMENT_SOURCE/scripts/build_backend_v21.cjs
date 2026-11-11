const fs=require('fs'),path=require('path'),crypto=require('crypto'),esbuild=require('esbuild');
const dev=path.resolve(__dirname,'../..');
const outfile=path.join(dev,'Deployment/supabase/supabase/functions/plmr-platform/index.ts');
const built=esbuild.buildSync({entryPoints:[path.join(dev,'Cloud/edge-v21.ts')],outfile,bundle:true,format:'esm',platform:'neutral',target:'es2022',external:['npm:*','node:*'],metafile:true});
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const inputs=[__filename,...Object.keys(built.metafile.inputs).map(file=>path.resolve(file))];
fs.writeFileSync(path.join(dev,'V46_BACKEND_MANIFEST.json'),JSON.stringify({entry:'Cloud/edge-v21.ts',output:path.relative(dev,outfile),sha256:hash(outfile),sourceHashes:Object.fromEntries(inputs.map(file=>[path.relative(dev,file).split(path.sep).join('/'),hash(file)])),schemaChange:true,reset:false},null,2)+'\n');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).filter(entry=>!['.temp','.branches','.git'].includes(entry.name)&&!entry.name.startsWith('.env')).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)])}
const root=path.join(dev,'Deployment/supabase');
fs.writeFileSync(path.join(root,'KAYNAK_SHA256.json'),JSON.stringify(Object.fromEntries(walk(root).filter(f=>!['KAYNAK_SHA256.json','SON_YUKLEME_SONUCU.json'].includes(path.basename(f))&&!(f.includes(path.sep+'Testler'+path.sep)&&f.endsWith('.json'))).map(f=>[path.relative(root,f).split(path.sep).join('/'),hash(f)])),null,2)+String.fromCharCode(10));
console.log('V46 Edge built; production pagination and compact index migration required.');
