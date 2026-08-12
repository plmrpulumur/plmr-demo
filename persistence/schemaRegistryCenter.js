(function (root) {
  'use strict';
  const SCHEMA='plmr-schema-registry-center-v1';
  const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
  const plain=value=>Boolean(value&&typeof value==='object'&&!Array.isArray(value));
  const schemaKey=(kind,version)=>`${String(kind||'').toUpperCase()}@${Number(version)}`;

  function canonical(value){
    if(value===null)return 'null';
    if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
    if(plain(value))return `{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
    if(typeof value==='number'&&!Number.isFinite(value))throw new Error('SCHEMA_NON_FINITE');
    return JSON.stringify(value);
  }
  function fallbackChecksum(value){const text=canonical(value);let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return `fnv1a32:${(hash>>>0).toString(16).padStart(8,'0')}:${text.length}`;}
  async function checksum(value){if(root.PulumurRevisionCore&&typeof root.PulumurRevisionCore.checksum==='function')return root.PulumurRevisionCore.checksum(value);return fallbackChecksum(value);}

  function typeOk(value,type){if(type==='object')return plain(value);if(type==='array')return Array.isArray(value);if(type==='integer')return Number.isInteger(value);if(type==='number')return typeof value==='number'&&Number.isFinite(value);if(type==='null')return value===null;return typeof value===type;}
  function validateJsonSchema(schema,value,path,errors){
    const at=path||'$';const out=errors||[];if(!schema)return out;
    if(schema.type&&!typeOk(value,schema.type)){out.push(`${at}:TYPE:${schema.type}`);return out;}
    if(schema.const!==undefined&&value!==schema.const)out.push(`${at}:CONST`);
    if(Array.isArray(schema.enum)&&!schema.enum.includes(value))out.push(`${at}:ENUM`);
    if(typeof value==='number'&&schema.minimum!==undefined&&value<schema.minimum)out.push(`${at}:MINIMUM`);
    if(plain(value)&&schema.type==='object'){
      (schema.required||[]).forEach(key=>{if(!(key in value))out.push(`${at}.${key}:REQUIRED`);});
      for(const [key,sub] of Object.entries(schema.properties||{}))if(key in value)validateJsonSchema(sub,value[key],`${at}.${key}`,out);
    }
    if(Array.isArray(value)&&schema.items)value.forEach((item,index)=>validateJsonSchema(schema.items,item,`${at}[${index}]`,out));
    return out;
  }

  class MigrationCenter{
    constructor(){this.schemas=new Map();this.migrations=new Map();}
    registerSchema(descriptor){const d=descriptor||{};const kind=String(d.kind||'').toUpperCase();const version=Number(d.version);const id=d.id||schemaKey(kind,version);if(!kind||!Number.isInteger(version)||version<1)throw new Error('SCHEMA_DESCRIPTOR_INVALID');if(this.schemas.has(id))throw new Error(`SCHEMA_DUPLICATE:${id}`);this.schemas.set(id,Object.freeze({id,kind,version,jsonSchema:clone(d.jsonSchema||{}),validate:typeof d.validate==='function'?d.validate:null,description:String(d.description||'')}));return this;}
    registerMigration(descriptor){const d=descriptor||{};const kind=String(d.kind||'').toUpperCase();const from=Number(d.fromVersion),to=Number(d.toVersion);if(!this.schemas.has(schemaKey(kind,from))||!this.schemas.has(schemaKey(kind,to)))throw new Error('MIGRATION_SCHEMA_UNKNOWN');if(typeof d.migrate!=='function')throw new Error('MIGRATION_HANDLER_REQUIRED');const id=`${kind}@${from}->${to}`;if(this.migrations.has(id))throw new Error(`MIGRATION_DUPLICATE:${id}`);this.migrations.set(id,Object.freeze({id,kind,fromVersion:from,toVersion:to,migrate:d.migrate,rollback:typeof d.rollback==='function'?d.rollback:null,description:String(d.description||'')}));return this;}
    getSchema(kind,version){const item=this.schemas.get(schemaKey(kind,version));if(!item)throw new Error(`SCHEMA_NOT_REGISTERED:${schemaKey(kind,version)}`);return item;}
    validate(kind,version,value){const schema=this.getSchema(kind,version);const errors=validateJsonSchema(schema.jsonSchema,value);if(schema.validate){const result=schema.validate(value);if(result===false)errors.push('$:CUSTOM');else if(Array.isArray(result))errors.push(...result);}
      if(errors.length)throw new Error(`SCHEMA_VALIDATION_FAILED:${schema.id}:${errors.join('|')}`);return true;}
    path(kind,from,to){const k=String(kind).toUpperCase();if(from===to)return [];const queue=[[from,[]]],seen=new Set([from]);while(queue.length){const [current,steps]=queue.shift();for(const m of this.migrations.values()){if(m.kind!==k||m.fromVersion!==current||seen.has(m.toVersion))continue;const next=steps.concat(m);if(m.toVersion===to)return next;seen.add(m.toVersion);queue.push([m.toVersion,next]);}}throw new Error(`MIGRATION_PATH_MISSING:${k}@${from}->${to}`);}
    async preview(value,options){const source=clone(value);const supplied=Boolean(options&&options.kind&&options.fromVersion);const detected=supplied?{kind:options.kind,version:options.fromVersion}:detect(source);const kind=String(options&&options.kind||detected.kind).toUpperCase();const fromVersion=Number(options&&options.fromVersion||detected.version);const targetVersion=Number(options&&options.targetVersion||fromVersion);this.validate(kind,fromVersion,source);let output=clone(source);const steps=this.path(kind,fromVersion,targetVersion);const reportSteps=[];for(const step of steps){output=step.migrate(clone(output),Object.freeze({kind,fromVersion:step.fromVersion,toVersion:step.toVersion,preview:true}));this.validate(kind,step.toVersion,output);reportSteps.push(Object.freeze({id:step.id,fromVersion:step.fromVersion,toVersion:step.toVersion,reversible:Boolean(step.rollback),description:step.description}));}
      const beforeChecksum=await checksum(source),afterChecksum=await checksum(output);return Object.freeze({schema:SCHEMA,kind,fromVersion,targetVersion,changed:beforeChecksum!==afterChecksum,source:clone(source),output:clone(output),beforeChecksum,afterChecksum,steps:Object.freeze(reportSteps),rollback:createRollbackReport(kind,reportSteps)});}
    async migrate(value,options){return this.preview(value,options);}
  }
  function createRollbackReport(kind,steps){const reversed=[...(steps||[])].reverse();return Object.freeze({schema:'plmr-migration-rollback-report-v1',kind:String(kind||'').toUpperCase(),possible:reversed.every(step=>step.reversible),steps:Object.freeze(reversed.map(step=>Object.freeze({migrationId:step.id,fromVersion:step.toVersion,toVersion:step.fromVersion,reversible:step.reversible})))});}
  function detect(value){const v=value||{};if(v.format==='PULUMUR_PROJECT')return {kind:'PROJECT',version:Number(v.schemaVersion)};if(v.format==='PLMR_PRODUCT_PROJECT')return {kind:'STANDALONE',version:1};if(v.format==='PLMR_STANDALONE_MULTI_PROJECT'||v.schema==='plmr-standalone-products-v2')return {kind:'STANDALONE',version:2};if(v.schema==='bcube-freedom-project-v1')return {kind:'FREEDOM',version:1};throw new Error('SCHEMA_KIND_UNDETECTED');}
  function createDefaultCenter(){const c=new MigrationCenter();
    c.registerSchema({kind:'PROJECT',version:1,jsonSchema:{type:'object',required:['format','schemaVersion','projectModel'],properties:{format:{const:'PULUMUR_PROJECT'},schemaVersion:{const:1},projectModel:{type:'object'}}}})
     .registerSchema({kind:'PROJECT',version:2,jsonSchema:{type:'object',required:['format','schemaVersion','projectModel'],properties:{format:{const:'PULUMUR_PROJECT'},schemaVersion:{const:2},projectModel:{type:'object'}}}})
     .registerMigration({kind:'PROJECT',fromVersion:1,toVersion:2,description:'Legacy project envelope v1 to canonical v2',migrate:raw=>({...raw,schemaVersion:2,createdAt:String(raw.createdAt||raw.projectModel&&raw.projectModel.metadata&&raw.projectModel.metadata.createdAt||''),updatedAt:String(raw.updatedAt||raw.createdAt||'')}),rollback:raw=>{const out=clone(raw);out.schemaVersion=1;delete out.createdAt;delete out.updatedAt;return out;}})
     .registerSchema({kind:'STANDALONE',version:1,jsonSchema:{type:'object',required:['format','productType','project'],properties:{format:{const:'PLMR_PRODUCT_PROJECT'},productType:{type:'string'},project:{type:'object'}}}})
     .registerSchema({kind:'STANDALONE',version:2,jsonSchema:{type:'object',required:['format','schema','schemaVersion','project'],properties:{format:{const:'PLMR_STANDALONE_MULTI_PROJECT'},schema:{const:'plmr-standalone-products-v2'},schemaVersion:{const:2},project:{type:'object',required:['positions'],properties:{positions:{type:'array'}}}}}})
     .registerMigration({kind:'STANDALONE',fromVersion:1,toVersion:2,description:'Single standalone product to multi-position project',migrate:raw=>{const p=clone(raw.project||{}),productType=String(raw.productType||p.productType||'SLIDING').toUpperCase();const blocked=new Set(['productType','schemaVersion','projectName','width','height','id','pozNo','positionNo','quantity','description']);const options=Object.fromEntries(Object.entries(p).filter(([k])=>!blocked.has(k)));return {format:'PLMR_STANDALONE_MULTI_PROJECT',schema:'plmr-standalone-products-v2',schemaVersion:2,project:{format:'PLMR_STANDALONE_MULTI_PROJECT',schema:'plmr-standalone-products-v2',schemaVersion:2,projectInfo:{projectName:p.projectName||'İçe Aktarılan Proje'},commonSettings:{color:'NATURAL',glassType:'CLEAR',generalDescription:'',outputScale:'AUTO',expandQuantity:false,defaultsByProduct:{}},layout:{mode:'AUTO',columnCount:2,horizontalGap:800,verticalGap:800,titleGap:150,pageMargin:200},positions:[{id:p.id||'migrated-p01',positionNo:p.pozNo||p.positionNo||'P01',order:1,productType,quantity:Math.max(1,Number(p.quantity)||1),width:Number(p.width)||0,height:Number(p.height)||0,description:String(p.description||''),options}]}};},rollback:raw=>{const pos=raw.project.positions[0]||{};return {format:'PLMR_PRODUCT_PROJECT',productType:pos.productType,project:{productType:pos.productType,pozNo:pos.positionNo,width:pos.width,height:pos.height,quantity:pos.quantity,description:pos.description,...clone(pos.options||{})}};}})
     .registerSchema({kind:'FREEDOM',version:1,jsonSchema:{type:'object',required:['schema'],properties:{schema:{const:'bcube-freedom-project-v1'}}}});return c;}
  const defaultCenter=createDefaultCenter();
  const api=Object.freeze({SCHEMA,MigrationCenter,validateJsonSchema,detect,createRollbackReport,createDefaultCenter,defaultCenter,preview:(value,options)=>defaultCenter.preview(value,options),migrate:(value,options)=>defaultCenter.migrate(value,options),checksum});
  root.PulumurSchemaRegistryCenter=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
