(function (root) {
  'use strict';
  const crypto = typeof require !== 'undefined' ? require('crypto') : null;
  const SCHEMA = 'plmr-export-golden-contract-v1';
  const round = value => Number.isFinite(Number(value)) ? Number(Number(value).toFixed(4)) : value;
  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    return typeof value === 'number' ? round(value) : value;
  }
  function canonicalText(value) { return JSON.stringify(canonical(value)); }
  function hash(value) { if (!crypto) throw new Error('SHA256_UNAVAILABLE'); return crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : canonicalText(value)).digest('hex'); }
  function dxfPairs(text) {
    const lines=String(text||'').replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n'); if(lines.at(-1)==='') lines.pop();
    if(lines.length%2) throw new Error(`DXF_ODD_LINE_COUNT:${lines.length}`);
    const pairs=[]; for(let i=0;i<lines.length;i+=2){const code=lines[i].trim();if(!code)throw new Error(`DXF_BLANK_GROUP_CODE_LINE:${i+1}`);if(!/^-?\d+$/.test(code))throw new Error(`DXF_INVALID_GROUP_CODE:${code}:${i+1}`);pairs.push({code:Number(code),value:lines[i+1],line:i+1});} return pairs;
  }
  function sectionRanges(pairs){const out=[];let active=null;for(let i=0;i<pairs.length;i++){const p=pairs[i];if(p.code===0&&p.value==='SECTION'){const name=pairs[i+1]&&pairs[i+1].code===2?pairs[i+1].value:'';active={name,start:i};out.push(active);}else if(active&&p.code===0&&p.value==='ENDSEC'){active.end=i;active=null;}}return out;}
  function recordsIn(pairs,start,end){const result=[];for(let i=start;i<=end;i++){if(pairs[i].code!==0)continue;let j=i+1;while(j<=end&&pairs[j].code!==0)j++;result.push({type:pairs[i].value,pairs:pairs.slice(i,j)});}return result;}
  const valueOf=(record,code)=>{const p=record.pairs.find(x=>x.code===code);return p?p.value:null;};
  function dxfSnapshot(text){
    const pairs=dxfPairs(text), sections=sectionRanges(pairs); const names=sections.map(s=>s.name); const tables={}; let table='';
    for(let i=0;i<pairs.length;i++){const p=pairs[i];if(p.code===0&&p.value==='TABLE'){table=pairs[i+1]&&pairs[i+1].code===2?pairs[i+1].value:'';tables[table]=tables[table]||[];continue;}if(table&&p.code===0&&p.value==='ENDTAB'){table='';continue;}if(table&&p.code===0&&p.value!=='TABLE'){let j=i+1;while(j<pairs.length&&pairs[j].code!==0)j++;const r={type:p.value,pairs:pairs.slice(i,j)};tables[table].push({type:r.type,name:valueOf(r,2),handle:valueOf(r,5)});}}
    const blocksSection=sections.find(s=>s.name==='BLOCKS');const entitySection=sections.find(s=>s.name==='ENTITIES');
    const blocks=blocksSection?recordsIn(pairs,blocksSection.start,blocksSection.end).filter(r=>r.type==='BLOCK').map(r=>valueOf(r,2)).filter(Boolean):[];
    const entities=entitySection?recordsIn(pairs,entitySection.start,entitySection.end).filter(r=>!['SECTION','ENDSEC'].includes(r.type)).map(r=>({type:r.type,layer:valueOf(r,8)||'0',handle:valueOf(r,5)||''})):[];
    const layers=(tables.LAYER||[]).map(x=>x.name).filter(Boolean), blockRecords=(tables.BLOCK_RECORD||[]).map(x=>x.name).filter(Boolean);
    const numericErrors=[];for(const p of pairs){const c=p.code;const numeric=(c>=10&&c<=59)||(c>=110&&c<=149)||(c>=210&&c<=239)||(c>=1010&&c<=1059);if(numeric&&!Number.isFinite(Number(p.value)))numericErrors.push({line:p.line,code:c,value:p.value});}
    const semantic={schema:SCHEMA,kind:'DXF',sections:names,tables:Object.fromEntries(Object.entries(tables).map(([k,v])=>[k,v.length])),layers,blockRecords,blocks,entityTypes:entities.map(e=>e.type),entityLayers:entities.map(e=>e.layer),counts:{pairs:pairs.length,layers:layers.length,blockRecords:blockRecords.length,blocks:blocks.length,entities:entities.length},numericErrors};
    return Object.freeze({...semantic,semanticSha256:hash(semantic)});
  }
  function validateDxf(text){const errors=[];let snapshot;try{snapshot=dxfSnapshot(text);}catch(e){return {valid:false,errors:[e.message]};}const required=['HEADER','TABLES','BLOCKS','ENTITIES'];required.forEach(x=>{if(!snapshot.sections.includes(x))errors.push(`SECTION_MISSING:${x}`);});for(let i=1;i<required.length;i++){if(snapshot.sections.indexOf(required[i])<snapshot.sections.indexOf(required[i-1]))errors.push(`SECTION_ORDER:${required[i]}`);}if(new Set(snapshot.layers).size!==snapshot.layers.length)errors.push('LAYER_DUPLICATE');if(new Set(snapshot.blockRecords).size!==snapshot.blockRecords.length)errors.push('BLOCK_RECORD_DUPLICATE');snapshot.blocks.forEach(name=>{if(!snapshot.blockRecords.includes(name))errors.push(`BLOCK_RECORD_MISSING:${name}`);});if(snapshot.numericErrors.length)errors.push(`NON_FINITE_COORDINATE:${snapshot.numericErrors.length}`);return {valid:!errors.length,errors,snapshot};}
  function pdfSnapshot(bytes){const b=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);const s=b.toString('latin1');const media=[...s.matchAll(/\/MediaBox\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\]/g)].map(m=>m.slice(1).map(Number));const fonts=[...new Set([...s.matchAll(/\/BaseFont\s*\/([^\s/<>\[\]()]+)/g)].map(m=>m[1]))].sort();const semantic={schema:SCHEMA,kind:'PDF',signature:s.startsWith('%PDF-'),eof:s.trimEnd().endsWith('%%EOF'),pages:(s.match(/\/Type\s*\/Page\b/g)||[]).length,objects:(s.match(/\d+\s+0\s+obj\b/g)||[]).length,streams:(s.match(/\bstream\r?\n/g)||[]).length,mediaBoxes:media,fonts,hasNaN:/\b(?:NaN|Infinity|undefined)\b/.test(s),byteLength:b.length};return Object.freeze({...semantic,semanticSha256:hash(semantic)});}
  function validatePdf(bytes){const snapshot=pdfSnapshot(bytes),errors=[];if(!snapshot.signature)errors.push('PDF_SIGNATURE');if(!snapshot.eof)errors.push('PDF_EOF');if(snapshot.pages<1)errors.push('PDF_PAGE_MISSING');if(!snapshot.mediaBoxes.length||snapshot.mediaBoxes.some(box=>box.length!==4||box.some(x=>!Number.isFinite(x))||box[2]<=box[0]||box[3]<=box[1]))errors.push('PDF_MEDIA_BOX');if(!snapshot.fonts.length)errors.push('PDF_FONT_MISSING');if(snapshot.hasNaN)errors.push('PDF_NON_FINITE');return {valid:!errors.length,errors,snapshot};}
  function visualSnapshot(drawing){const source=drawing&&drawing.sceneGraph&&root.PulumurSceneGraph?root.PulumurSceneGraph.exportEntities(drawing.sceneGraph):(drawing&&drawing.entities||[]).filter(e=>e&&e.type!=='interaction'&&!e.previewOnly&&!e.hidden);const compact=source.map(e=>{const out={type:e.type||'',layer:e.layer||'0',owner:e.ownerInstance||e.ownerId||'',product:e.productType||''};['x','y','x1','y1','x2','y2','r','width','height','rotation'].forEach(k=>{if(Number.isFinite(Number(e[k])))out[k]=round(e[k]);});if(Array.isArray(e.points))out.points=e.points.map(p=>p.map(round));if(e.value!=null)out.value=String(e.value);return out;});const bounds=drawing&&drawing.bounds?canonical(drawing.bounds):null;const semantic={schema:SCHEMA,kind:'VISUAL_GEOMETRY',bounds,entityCount:compact.length,entities:compact};return Object.freeze({...semantic,semanticSha256:hash(semantic)});}
  function compare(actual,expected){const a=canonicalText(actual),e=canonicalText(expected);return {equal:a===e,actualSha256:hash(actual),expectedSha256:hash(expected)};}
  const api=Object.freeze({SCHEMA,canonical,canonicalText,hash,dxfPairs,dxfSnapshot,validateDxf,pdfSnapshot,validatePdf,visualSnapshot,compare});root.PulumurGoldenContractLab=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
