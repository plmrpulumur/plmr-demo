const fs=require('fs'),path=require('path'),crypto=require('crypto'),vm=require('vm'),esbuild=require('esbuild');
const src=path.resolve(__dirname,'..'),root=path.resolve(process.argv[2]||path.resolve(src,'../../Uygulama/github'));
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const compiled=esbuild.buildSync({entryPoints:[path.join(src,'data/sidebarLogo.ts')],bundle:true,write:false,format:'cjs',platform:'node'}).outputFiles[0].text;
const box={module:{exports:{}}};vm.runInNewContext(compiled,box);const logo=box.module.exports.SIDEBAR_LOGO;
fs.mkdirSync(path.join(root,'assets/pwa'),{recursive:true});
for(const size of [192,512]){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 512 512"><rect width="512" height="512" fill="white"/><svg x="31" y="194" width="450" height="124" viewBox="441 158 1330 364"><image xlink:href="${logo}" width="2048" height="640"/></svg></svg>`;
 fs.writeFileSync(path.join(root,'assets/pwa/icon-'+size+'.svg'),svg);
}
const manifest={id:'./',name:'PLMR | Pülümür Automation Studio',short_name:'PLMR',start_url:'./',scope:'./',display:'standalone',background_color:'#eef0f3',theme_color:'#0f1623',prefer_related_applications:false,icons:[192,512].map(size=>({src:'./assets/pwa/icon-'+size+'.svg',sizes:size+'x'+size,type:'image/svg+xml',purpose:'any'}))};
fs.writeFileSync(path.join(root,'manifest.webmanifest'),JSON.stringify(manifest,null,2)+'\n');
const revisions={};
function visit(directory){if(!fs.existsSync(directory))return;for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
 const file=path.join(directory,entry.name),relative=path.relative(root,file).split(path.sep).join('/');
 if(entry.isDirectory()){if(!['node_modules','server','deployment'].includes(entry.name))visit(file)}
 else if(/\.(?:js|css|html|png|jpe?g|webp|svg|webm|mp4|woff2?|json)$/i.test(entry.name)&&!relative.endsWith('sw.js'))revisions[relative]=hash(fs.readFileSync(file));
}}
visit(path.join(root,'runtime'));visit(path.join(root,'assets'));visit(path.join(root,'drawing-engine'));
const build=hash(JSON.stringify(revisions)).slice(0,20);
const engineBuild=JSON.parse(fs.readFileSync(path.join(src,'data/finalEngineBuild.ts'),'utf8').match(/FINAL_ENGINE_BUILD=("[a-f0-9]+")/)[1]);
fs.writeFileSync(path.join(root,'sw.js'),`const PLMR_ASSET_BUILD=${JSON.stringify(build)};\nconst PLMR_ASSET_REVISIONS=${JSON.stringify(revisions)};\nconst PLMR_ENGINE_BUILD=${JSON.stringify(engineBuild)};\n`+fs.readFileSync(path.join(src,'pwa/service-worker.js'),'utf8'));
const dev=path.resolve(src,'..'),record=path.join(dev,'PWA_BUILD_MANIFEST.json');
const previous=fs.existsSync(record)?JSON.parse(fs.readFileSync(record,'utf8')):{};
previous[path.relative(dev,root).split(path.sep).join('/')]= {
 release:'PLMR_FinalProcess_v46',assetBuild:build,
 sources:Object.fromEntries(['scripts/build_pwa.cjs','pwa/service-worker.js','data/sidebarLogo.ts'].map(p=>[p,hash(fs.readFileSync(path.join(src,p)))])),
 outputs:Object.fromEntries(['manifest.webmanifest','sw.js','assets/pwa/icon-192.svg','assets/pwa/icon-512.svg'].map(p=>[p,hash(fs.readFileSync(path.join(root,p)))]))
};
fs.writeFileSync(record,JSON.stringify(previous,null,2)+'\n');
console.log('PWA manifest, sidebar-derived icons, revisioned asset cache:',Object.keys(revisions).length,'assets;',build);
