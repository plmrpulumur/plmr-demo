(function(root){
'use strict';
const SCHEMA='plmr-voice-form-draft-v1';
const VoiceCommandService=root.PulumurVoiceCommandService||null;
const PRODUCTS=Object.freeze({sürme:'SLIDING',surme:'SLIDING',giyotin:'GUILLOTINE',zip:'ZIP_SCREEN','zip perde':'ZIP_SCREEN',freedom:'BCUBE_FREEDOM','pergo rise':'PERGO_RISE'});
const VIEWS=Object.freeze({üst:'TOP',ust:'TOP',ön:'FRONT',on:'FRONT',yan:'SIDE',arka:'REAR'});
const WORDS=Object.freeze({sıfır:0,bir:1,iki:2,üç:3,uc:3,dört:4,dort:4,beş:5,bes:5,altı:6,alti:6,yedi:7,sekiz:8,dokuz:9,on:10,yirmi:20,otuz:30,kırk:40,kirk:40,elli:50,yüz:100,yuz:100,bin:1000});
function numberFromWords(text){let total=0,current=0,seen=false;for(const token of String(text||'').toLocaleLowerCase('tr-TR').split(/\s+/)){if(!(token in WORDS))continue;seen=true;const n=WORDS[token];if(n===100||n===1000){current=(current||1)*n;if(n===1000){total+=current;current=0;}}else current+=n;}return seen?total+current:null;}
function parseNumber(text){const m=String(text||'').match(/-?\d+(?:[.,]\d+)?/);if(m)return Number(m[0].replace(',','.'));return numberFromWords(text);}
function toMm(value,unit){if(!Number.isFinite(value))return null;const u=String(unit||'mm').toLowerCase();if(u==='m'||u==='metre')return value*1000;if(u==='cm'||u==='santimetre')return value*10;return value;}
function parse(transcript){const text=String(transcript||'').trim().toLocaleLowerCase('tr-TR');if(!text)return Object.freeze({schema:SCHEMA,status:'SILENCE',errors:['VOICE_SILENCE'],changes:[]});const changes=[],errors=[];const unit=(text.match(/\b(mm|cm|m|milimetre|santimetre|metre)\b/)||[])[1]||'mm';
  const fieldPatterns=[['width','genişlik'],['height','yükseklik'],['positionNo','poz']];for(const [field,label] of fieldPatterns){if(text.includes(label)){const value=parseNumber(text.slice(text.indexOf(label)+label.length));if(value==null)errors.push(`VOICE_NUMBER_UNRECOGNIZED:${field}`);else if(field==='positionNo')changes.push({field,value:`P${String(Math.trunc(value)).padStart(2,'0')}`,critical:false});else changes.push({field,value:toMm(value,unit),unit:'mm',critical:true});}}
  for(const [label,value] of Object.entries(PRODUCTS))if(text.includes(label)){changes.push({field:'productType',value,critical:true});break;}
  for(const [label,value] of Object.entries(VIEWS))if(text.includes(label)){changes.push({field:'view',value,critical:false});break;}
  if(/geri\s+al|undo/.test(text))changes.push({field:'command',value:'UNDO',critical:false});
  if(/ileri\s+al|redo/.test(text))changes.push({field:'command',value:'REDO',critical:false});
  if(!changes.length&&!errors.length)errors.push('VOICE_COMMAND_UNRECOGNIZED');
  return Object.freeze({schema:SCHEMA,status:errors.length?'INVALID':'PREVIEW',transcript:text,changes:Object.freeze(changes),errors:Object.freeze(errors),requiresConfirmation:changes.some(x=>x.critical),readback:changes.map(x=>`${x.field}: ${x.value}${x.unit?' '+x.unit:''}`).join(', ')});
}
function apply(draft,context={}){if(!draft||draft.schema!==SCHEMA)throw new Error('VOICE_DRAFT_INVALID');if(draft.status!=='PREVIEW')throw new Error('VOICE_DRAFT_NOT_APPLICABLE');if(draft.requiresConfirmation&&context.confirmed!==true)throw new Error('VOICE_CONFIRMATION_REQUIRED');if(typeof context.applyChange!=='function')throw new Error('VOICE_APPLY_CALLBACK_REQUIRED');const applied=[];for(const change of draft.changes)applied.push(context.applyChange(JSON.parse(JSON.stringify(change))));return Object.freeze({schema:SCHEMA,status:'APPLIED',count:applied.length,applied:Object.freeze(applied)});}
const api=Object.freeze({SCHEMA,PRODUCTS,VIEWS,VoiceCommandService,numberFromWords,parseNumber,toMm,parse,apply});root.PulumurVoiceFormAssistant=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
