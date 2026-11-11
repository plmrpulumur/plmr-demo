const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');
let ts;
for (const candidate of [
  '/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js',
  '/usr/local/lib/node_modules/typescript/lib/typescript.js',
  '/usr/lib/node_modules/typescript/lib/typescript.js',
]) {
  if (fs.existsSync(candidate)) { ts = require(candidate); break; }
}
if (!ts) {
  try { ts = require('typescript'); } catch (_) {}
}
if (!ts) throw new Error('TypeScript compiler module not found. Install TypeScript or run this build in the PLMR development environment.');

const sourceRoot = path.resolve(__dirname, '..');
const outputFile = path.resolve(process.argv[2] || path.join(sourceRoot, '../..', 'Uygulama', 'github', 'index.html'));

function walk(dir) {
  const output = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'public' || entry.name === 'vendor' || entry.name === 'scripts' || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) output.push(...walk(full));
    else if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) output.push(full);
  }
  return output;
}
function moduleId(file) {
  return './' + path.relative(sourceRoot, file).replace(/\\/g, '/').replace(/\.(tsx?|jsx?)$/, '');
}
function transpile(file) {
  const source = fs.readFileSync(file, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2018,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      resolveJsonModule: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
    },
    fileName: file,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) {
    const message = errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n');
    throw new Error(`Transpile failed: ${file}\n${message}`);
  }
  return result.outputText;
}
function sha256(text) { return crypto.createHash('sha256').update(text).digest('hex'); }
function escapeScript(text) { return text.replace(/<\/script/gi, '<\\/script'); }

const files = walk(sourceRoot).filter(file => !file.endsWith(path.sep + 'main.tsx') && !['data/v49MaterialSeed.ts','services/v49MaterialMigration.ts'].includes(path.relative(sourceRoot,file).replace(/\\/g,'/')));
const compiled = {};
for (const file of files) compiled[moduleId(file)] = transpile(file);

const coreChunk = fs.readFileSync(path.join(sourceRoot, 'vendor/offline/react-18.2.0.chunk.js'), 'utf8');
const domChunk = fs.readFileSync(path.join(sourceRoot, 'vendor/offline/react-dom-18.2.0.chunk.js'), 'utf8');
// A source-only manifest cannot detect a damaged offline React dependency.
for(const [name,code] of [['react',coreChunk],['react-dom',domChunk]])new vm.Script(code,{filename:name+'.chunk.js'});
let css = fs.readFileSync(path.join(sourceRoot, 'index.css'), 'utf8');
css = css
  .replace(/@import url\([^\n]+\);?\s*/g, '')
  .replace(/@import ['\"]tailwindcss['\"];?\s*/g, '')
  .replace(/@theme\s+inline\s*\{/, ':root {');
// Embed the same licensed local faces for file:// operation without font CORS.
css = css.replace(/url\((?:['"])?\/assets\/fonts\/([a-z0-9.-]+\.woff2)(?:['"])?\)/g, (_url, name) =>
  `url(data:font/woff2;base64,${fs.readFileSync(path.join(sourceRoot, 'public/assets/fonts', name)).toString('base64')})`);

css += `\n/* Minimal utility parity for classes used by the canonical source in offline mode. */\n.text-slate-400{color:#94a3b8}\n.text-slate-500{color:#64748b}\n`;

css += fs.readFileSync(path.join(sourceRoot,'giyotin-v33.css'),'utf8');
css += fs.readFileSync(path.join(sourceRoot,'surme-v15.css'),'utf8');
css += fs.readFileSync(path.join(sourceRoot,'v33-workspace.css'),'utf8');
css += fs.readFileSync(path.join(sourceRoot,'quick-quote.css'),'utf8');
css += fs.readFileSync(path.join(sourceRoot,'project-review.css'),'utf8');
css += fs.readFileSync(path.join(sourceRoot,'brand-welcome.css'),'utf8');
css += fs.readFileSync(path.join(sourceRoot,'company-settings.css'),'utf8');
css += fs.readFileSync(path.join(sourceRoot,'components/platform.css'),'utf8');

const protectedFiles = ['components/MainMenu.tsx', 'components/ProjectEntryWorkspace.tsx', 'components/TabBar.tsx'];
const manifest = {
  release: 'PLMR_FinalProcess_v46',
  generatedFrom: 'Development_Protocol/03_DEVELOPMENT_SOURCE',
  generatedAt: new Date().toISOString(),
  sourceHashes: {},
  protectedFileHashes: {},
  vendorHashes: {},
};
for(const rel of ['vendor/offline/react-18.2.0.chunk.js','vendor/offline/react-dom-18.2.0.chunk.js'])manifest.vendorHashes[rel]=sha256(fs.readFileSync(path.join(sourceRoot,rel)));
for (const file of files) {
  const rel = path.relative(sourceRoot, file).replace(/\\/g, '/');
  manifest.sourceHashes[rel] = sha256(fs.readFileSync(file));
}
for (const rel of protectedFiles) manifest.protectedFileHashes[rel] = sha256(fs.readFileSync(path.join(sourceRoot, rel)));

// V16 runtime assets are generated from the canonical public/assets folder.
// Hash them into the manifest so release verification detects asset drift.
manifest.assetHashes = {};
const publicAssetsRoot = path.join(sourceRoot, 'public', 'assets');
function walkAssets(dir) {
  if (!fs.existsSync(dir)) return [];
  const out=[];
  for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
    const full=path.join(dir,entry.name);
    if (entry.isDirectory()) out.push(...walkAssets(full)); else out.push(full);
  }
  return out;
}
for (const asset of [...walkAssets(publicAssetsRoot),...walkAssets(path.join(sourceRoot,'public/runtime'))]) {
  const rel=path.relative(path.join(sourceRoot,'public'),asset).replace(/\\/g,'/');
  manifest.assetHashes[rel]=sha256(fs.readFileSync(asset));
}
manifest.styleHashes={};for(const rel of ['index.css','giyotin-v33.css','surme-v15.css','v33-workspace.css','quick-quote.css','project-review.css','brand-welcome.css','company-settings.css','components/platform.css'])manifest.styleHashes[rel]=sha256(fs.readFileSync(path.join(sourceRoot,rel)));
const manifestJson = JSON.stringify(manifest);
const manifestHash = sha256(manifestJson);

const moduleDefinitions = Object.entries(compiled)
  .map(([id, code]) => `${JSON.stringify(id)}:function(module,exports,require){\n${code}\n}`)
  .join(',\n');

const reactBootstrap = `(function(){
  const __wmods={};
  const chunks=[];
  chunks.push=function(payload){const defs=payload&&payload[1]||{};Object.keys(defs).forEach(k=>{__wmods[k]=defs[k]});return Array.prototype.push.call(this,payload)};
  self.webpackChunk_jupyterlab_application_top=chunks;
  window.__installPLMRReact=function(){
    __wmods['44914']=function(module,exports,req){module.exports=req(15287)};
    const cache={};
    function req(id){id=String(id);if(cache[id])return cache[id].exports;const fn=__wmods[id];if(!fn)throw new Error('Missing React module '+id);const module={exports:{}};cache[id]=module;fn(module,module.exports,req);return module.exports;}
    window.React=req(15287);window.ReactDOM=req(40961);
  };
})();`;

const applicationBootstrap = `(function(){
  const modules={${moduleDefinitions}};
  const cache={};
  function normalize(value){const parts=[];value.replace(/\\\\/g,'/').split('/').forEach(part=>{if(!part||part==='.')return;if(part==='..')parts.pop();else parts.push(part)});return './'+parts.join('/');}
  function resolve(from,request){
    if(request==='react')return 'react';
    if(request==='react/jsx-runtime')return 'react/jsx-runtime';
    if(request==='react-dom')return 'react-dom';
    if(request==='react-dom/client')return 'react-dom/client';
    if(request.endsWith('.css'))return '__css__';
    if(request.startsWith('.')){const base=from.slice(0,from.lastIndexOf('/')+1);const id=normalize(base+request);if(modules[id])return id;if(modules[id+'/index'])return id+'/index';throw new Error('Module not found: '+request+' from '+from+' -> '+id);}
    throw new Error('Unsupported external module: '+request+' from '+from);
  }
  function load(id,from){
    if(id==='react')return window.React;
    if(id==='react-dom')return window.ReactDOM;
    if(id==='react-dom/client')return {createRoot:window.ReactDOM.createRoot};
    if(id==='react/jsx-runtime'){
      const R=window.React;
      const make=(type,props,key)=>{props=props||{};const next=Object.assign({},props);const children=next.children;delete next.children;if(key!==undefined)next.key=key;if(Array.isArray(children))return R.createElement(type,next,...children);if(children!==undefined)return R.createElement(type,next,children);return R.createElement(type,next);};
      return {jsx:make,jsxs:make,Fragment:R.Fragment};
    }
    if(id==='__css__')return {};
    if(cache[id])return cache[id].exports;
    const fn=modules[id];if(!fn)throw new Error('Unknown module '+id);const module={exports:{}};cache[id]=module;fn(module,module.exports,(request)=>load(resolve(id,request),id));return module.exports;
  }
  window.__PLMR_RUNTIME_MANIFEST__=${manifestJson};
  window.__PLMR_RUNTIME_MANIFEST_HASH__=${JSON.stringify(manifestHash)};
  const AppModule=load('./App','./entry');
  const App=AppModule.default||AppModule;
  window.ReactDOM.createRoot(document.getElementById('root')).render(window.React.createElement(App));
})();`;

const html = `<!doctype html><html lang="tr"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>PLMR | Pülümür Automation Studio</title><meta name="theme-color" content="#0f1623"/><link rel="manifest" href="./manifest.webmanifest"/><link rel="icon" href="./assets/pwa/icon-192.svg" type="image/svg+xml"/><style>${css}</style></head><body><div id="root"></div><script>${escapeScript(reactBootstrap)}</script><script>${escapeScript(coreChunk)}</script><script>${escapeScript(domChunk)}</script><script>window.__installPLMRReact();</script><script>${escapeScript(applicationBootstrap)}</script></body></html>`;
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
new vm.Script(applicationBootstrap,{filename:'plmr-application.js'});
fs.writeFileSync(outputFile+'.tmp', html);
fs.renameSync(outputFile+'.tmp',outputFile);
const runtimeRoot=path.dirname(outputFile);
fs.rmSync(path.join(runtimeRoot,'runtime'),{recursive:true,force:true});fs.cpSync(path.join(sourceRoot,'public/runtime'),path.join(runtimeRoot,'runtime'),{recursive:true});
const runtimeAssets=path.join(runtimeRoot,'assets');
fs.rmSync(runtimeAssets,{recursive:true,force:true,maxRetries:3,retryDelay:100});
if(fs.existsSync(publicAssetsRoot)) fs.cpSync(publicAssetsRoot,runtimeAssets,{recursive:true});
fs.writeFileSync(path.join(sourceRoot,'..', 'SOURCE_BUILD_MANIFEST.json'), JSON.stringify({ ...manifest, manifestHash, runtimeHash:sha256(html) }, null, 2) + '\n');
console.log(`Built ${outputFile}`);
console.log(`Modules: ${Object.keys(compiled).length}`);
console.log(`Manifest: ${manifestHash}`);
