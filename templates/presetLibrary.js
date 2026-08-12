(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.PulumurPresetLibrary=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const SCHEMA='plmr-preset-library-v1';
  const VERSION=2;
  const IDENTITY_KEYS=new Set(['id','projectId','projectCode','revision','revisionId','createdBy','updatedBy','customerName','projectName','companyId','tenantId']);
  const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
  function cleanValue(value){
    if(Array.isArray(value))return value.map(cleanValue);
    if(value&&typeof value==='object'){
      const out={};
      for(const [key,item] of Object.entries(value)){
        if(IDENTITY_KEYS.has(key))continue;
        if(item===undefined||typeof item==='function')continue;
        out[key]=cleanValue(item);
      }
      return out;
    }
    return value;
  }
  function normalizeName(name){return String(name||'').trim();}
  function normalizePreset(input){
    const p=clone(input||{});
    const name=normalizeName(p.name);
    if(!name)throw new Error('PRESET_NAME_REQUIRED');
    const payload=cleanValue(p.payload||p.values||{});
    if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new Error('PRESET_PAYLOAD_INVALID');
    return Object.freeze({
      schema:SCHEMA,
      version:VERSION,
      name,
      description:String(p.description||'').trim(),
      productType:p.productType?String(p.productType).trim().toUpperCase():null,
      payload:Object.freeze(payload),
      sourceVersion:Number.isFinite(Number(p.sourceVersion))?Number(p.sourceVersion):VERSION
    });
  }
  function migrate(input){
    if(!input||typeof input!=='object')throw new Error('PRESET_INVALID');
    const sourceVersion=Number(input.version||1);
    if(sourceVersion>VERSION)throw new Error('PRESET_VERSION_UNSUPPORTED');
    if(sourceVersion===1){
      return normalizePreset({
        name:input.name||input.title,
        description:input.description,
        productType:input.productType||input.product,
        payload:input.payload||input.settings||input.values||{},
        sourceVersion
      });
    }
    return normalizePreset({...input,sourceVersion});
  }
  class PresetLibrary{
    constructor(initial=[]){this.items=new Map();for(const item of initial)this.add(item);}
    _key(name){return normalizeName(name).toLocaleLowerCase('tr-TR');}
    add(input){const preset=migrate(input);const key=this._key(preset.name);if(this.items.has(key))throw new Error('PRESET_DUPLICATE_NAME');this.items.set(key,preset);return preset;}
    remove(name){return this.items.delete(this._key(name));}
    get(name){const p=this.items.get(this._key(name));return p?clone(p):null;}
    list(){return [...this.items.values()].map(clone).sort((a,b)=>a.name.localeCompare(b.name,'tr'));}
    preview(name,project){const preset=this.items.get(this._key(name));if(!preset)throw new Error('PRESET_NOT_FOUND');const before=clone(project||{});const result=clone(before);result.settings={...(result.settings||{}),...clone(preset.payload)};return Object.freeze({schema:'plmr-preset-preview-v1',name:preset.name,before,after:result,mutated:false,requiresConfirmation:true});}
    apply(name,project,options={}){if(options.confirmed!==true)throw new Error('PRESET_CONFIRMATION_REQUIRED');const preview=this.preview(name,project);const identity={};for(const key of IDENTITY_KEYS){if(Object.prototype.hasOwnProperty.call(project||{},key))identity[key]=clone(project[key]);}
      const after=clone(preview.after);Object.assign(after,identity);return after;}
    export(){return JSON.stringify({schema:SCHEMA,version:VERSION,presets:this.list()},null,2);}
    import(text){let parsed;try{parsed=typeof text==='string'?JSON.parse(text):clone(text);}catch(_){throw new Error('PRESET_IMPORT_INVALID_JSON');}
      if(!parsed||parsed.schema!==SCHEMA||!Array.isArray(parsed.presets))throw new Error('PRESET_IMPORT_SCHEMA_INVALID');const staged=parsed.presets.map(migrate);const seen=new Set(this.items.keys());for(const p of staged){const key=this._key(p.name);if(seen.has(key))throw new Error('PRESET_DUPLICATE_NAME');seen.add(key);}for(const p of staged)this.items.set(this._key(p.name),p);return staged.length;}
  }
  return Object.freeze({SCHEMA,VERSION,IDENTITY_KEYS,cleanValue,normalizePreset,migrate,PresetLibrary});
});
