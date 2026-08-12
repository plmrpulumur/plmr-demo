(function(root){
'use strict';
const SCHEMA='plmr-ai-project-scan-v1';
const SENSITIVE=/^(customer(name)?|email|phone|token|access_?token|refresh_?token|password|secret|user(id)?|company(id)?|tenant(id)?)$/i;
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
function redact(value){if(Array.isArray(value))return value.map(redact);if(value&&typeof value==='object'){const out={};Object.entries(value).forEach(([k,v])=>{if(!SENSITIVE.test(k))out[k]=redact(v);});return out;}return value;}
function scan(input,options){const source=input||{},engine=(options&&options.constraintEngine)||root.PulumurConstraintEngine;const findings=engine&&typeof engine.evaluate==='function'?engine.evaluate({project:source.project,drawing:source.drawing}):[];const errors=findings.filter(f=>f.severity==='ERROR');const warnings=findings.filter(f=>f.severity==='WARNING');const productCounts={};((source.project&&source.project.positions)||[]).forEach(p=>{const id=String(p.productType||'UNKNOWN');productCounts[id]=(productCounts[id]||0)+1;});return Object.freeze({schema:SCHEMA,deterministic:true,exportReady:errors.length===0,summary:Object.freeze({positions:((source.project&&source.project.positions)||[]).length,entities:((source.drawing&&source.drawing.entities)||[]).length,errors:errors.length,warnings:warnings.length,productCounts:Object.freeze(productCounts)}),findings:Object.freeze(findings.map(clone)),publicContext:Object.freeze(redact({projectInfo:source.project&&source.project.projectInfo,layout:source.project&&source.project.layout,productCounts}))});}
const api=Object.freeze({SCHEMA,redact,scan});root.PulumurAiProjectScanner=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
