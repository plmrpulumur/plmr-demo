(function(root){
'use strict';
const SCHEMA='plmr-guided-drawing-copilot-v1';
const LEVELS=Object.freeze(['BEGINNER','INTERMEDIATE','EXPERT']);
const PRODUCT_HINTS=Object.freeze({PERGO_RISE:'Ana pergola taşıyıcı sistemi',BCUBE_FREEDOM:'Bağımsız Freedom pergola',SLIDING:'Sürme cam ürünü',GUILLOTINE:'Giyotin cam ürünü',ZIP_SCREEN:'Zip perde ürünü'});
function level(value){const v=String(value||'BEGINNER').toUpperCase();return LEVELS.includes(v)?v:'BEGINNER';}
function recommend(input){const source=input||{},userLevel=level(source.userLevel),goal=String(source.goal||'').toLocaleLowerCase('tr-TR');let product='PERGO_RISE';if(/freedom/.test(goal))product='BCUBE_FREEDOM';else if(/sürme|cam/.test(goal))product='SLIDING';else if(/giyotin/.test(goal))product='GUILLOTINE';else if(/zip|perde/.test(goal))product='ZIP_SCREEN';const steps=userLevel==='BEGINNER'?['Ürünü seç','Temel ölçüleri gir','Önizlemeyi doğrula','DXF/PDF önizlemesini kontrol et']:userLevel==='INTERMEDIATE'?['Ürün ve görünüşü doğrula','Poz seçeneklerini tamamla','Çakışma taraması çalıştır','Export önizlemesini onayla']:['Runtime contract ve schema kontrolü','Scene graph owner/bounds kontrolü','Constraint ve export equivalence doğrulaması'];return Object.freeze({schema:SCHEMA,userLevel,proposal:Object.freeze({productType:product,view:'DEFAULT',reason:PRODUCT_HINTS[product]}),steps:Object.freeze(steps),applied:false});}
function applyRecommendation(result,callback,approval){if(!result||result.schema!==SCHEMA)throw new Error('COPILOT_RECOMMENDATION_INVALID');if(approval!==true)throw new Error('COPILOT_APPROVAL_REQUIRED');if(typeof callback!=='function')throw new TypeError('COPILOT_APPLY_CALLBACK_REQUIRED');return callback({...result.proposal});}
const api=Object.freeze({SCHEMA,LEVELS,recommend,applyRecommendation});root.PulumurDrawingCopilot=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
