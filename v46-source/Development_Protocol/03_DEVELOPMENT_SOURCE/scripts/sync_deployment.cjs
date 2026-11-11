/* Publication scaffold is maintained separately from the prebuilt application. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const dev=path.resolve(__dirname,'../..'),source=path.join(dev,'Deployment'),runtime=path.resolve(dev,'../Uygulama');
function walk(directory){return fs.readdirSync(directory,{withFileTypes:true}).filter(entry=>!['.temp','.branches','.git'].includes(entry.name)&&!entry.name.startsWith('.env')).flatMap(entry=>entry.isDirectory()?walk(path.join(directory,entry.name)):[path.join(directory,entry.name)]);}
const hashes={};
fs.rmSync(path.join(runtime,'supabase'),{recursive:true,force:true});
for(const file of walk(source)){
  const relative=path.relative(source,file);
  const target=path.join(runtime,relative);
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(file,target);
  hashes[relative.split(path.sep).join('/')]=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
fs.writeFileSync(path.join(dev,'DEPLOYMENT_SOURCE_MANIFEST.json'),JSON.stringify({release:'PLMR_FinalProcess_v46',scope:'static-publication-and-public-connection-preparation',businessDataMode:'supabase',files:hashes},null,2)+'\n');
if(JSON.stringify(fs.readdirSync(runtime).sort())!==JSON.stringify(['github','supabase']))throw Error('Uygulama must contain exactly github and supabase.');
console.log('GitHub and Supabase folders copied from canonical Deployment source.');
