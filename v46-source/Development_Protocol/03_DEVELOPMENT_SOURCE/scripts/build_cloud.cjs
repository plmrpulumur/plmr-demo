/* V39: preserve identity/schema while building the active Edge separately. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const source=path.resolve(__dirname,'..'),dev=path.resolve(source,'..');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const frozen=JSON.parse(fs.readFileSync(path.join(dev,'SUPABASE_SCHEMA_BASELINE.json'),'utf8'));
for(const [name,expected]of Object.entries(frozen.files)){
 const file=path.join(dev,'Deployment/supabase',name);
 if(hash(file)!==expected)throw Error('Supabase V3 reference changed: '+name+'. Frontend build cannot replace the deployed backend.');
}
const publicFile=path.join(dev,'Deployment/github/supabase.public.json');
const config=JSON.parse(fs.readFileSync(publicFile,'utf8'));
fs.writeFileSync(path.join(source,'data/cloudPublicConfig.ts'),'// Public metadata generated from Deployment/github/supabase.public.json.\nexport default '+JSON.stringify(config,null,2)+' as const\n');
fs.writeFileSync(path.join(dev,'drawing-engine/src/v22-share-config.js'),`window.PLMR_ANIMATION_SHARE_CONFIG=location.protocol==='file:'?{mode:'inline'}:{mode:'cloud',endpoint:${JSON.stringify(config.supabaseUrl+'/functions/v1/plmr-platform')},publicKey:${JSON.stringify(config.supabasePublishableKey)},getAccessToken:()=>window.parent.PLMRCloud?.getAccessToken(),getCompanyId:()=>window.parent.PLMRCloud?.getCompanyId()};\n`);
const inputs=[__filename,publicFile,path.join(dev,'SUPABASE_SCHEMA_BASELINE.json'),...Object.keys(frozen.files).map(name=>path.join(dev,'Deployment/supabase',name))];
const outputs=[path.join(source,'data/cloudPublicConfig.ts'),path.join(dev,'drawing-engine/src/v22-share-config.js')];
fs.writeFileSync(path.join(dev,'CLOUD_SOURCE_MANIFEST.json'),JSON.stringify({release:'PLMR_FinalProcess_v46',backendMode:'canonical-active-edge-preserved-identity-schema',sourceHashes:Object.fromEntries(inputs.map(p=>[path.relative(dev,p).split(path.sep).join('/'),hash(p)])),outputHashes:Object.fromEntries(outputs.map(p=>[path.relative(dev,p).split(path.sep).join('/'),hash(p)]))},null,2)+'\n');
console.log('V41 public connection built; existing identity/schema hashes preserved.');
