(function(root){
'use strict';
const SCHEMA='plmr-assistant-intent-plan-v1';
const ALLOWED=Object.freeze(['EXPLAIN','SCAN_PROJECT','GUIDE_DRAWING','CREATE_DRAFT','VALIDATE_GEOMETRY']);
const BLOCKED_PATTERNS=[/ignore\s+(all|any|the)?\s*previous/i,/system\s*prompt/i,/developer\s*mode/i,/reveal\s+(secret|token|password)/i,/execute\s+(shell|powershell|cmd)/i,/drop\s+table/i,/bypass\s+(approval|security|rls)/i];
const now=()=>Date.now();
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
function normalizeIntent(value){return String(value||'').trim().toUpperCase().replace(/[^A-Z0-9_]+/g,'_');}
function inspectText(text){const value=String(text||'').trim();const hits=BLOCKED_PATTERNS.filter(p=>p.test(value)).map(p=>String(p));return Object.freeze({safe:hits.length===0,hits:Object.freeze(hits),text:value});}
function createPlan(input,context){const source=input||{},ctx=context||{};const intent=normalizeIntent(source.intent);if(!ALLOWED.includes(intent))throw Object.assign(new Error(`ASSISTANT_INTENT_NOT_ALLOWED:${intent||'EMPTY'}`),{code:'ASSISTANT_INTENT_NOT_ALLOWED'});const inspected=inspectText(source.text||source.prompt||'');if(!inspected.safe)throw Object.assign(new Error('ASSISTANT_PROMPT_INJECTION_BLOCKED'),{code:'ASSISTANT_PROMPT_INJECTION_BLOCKED',evidence:inspected.hits});const ttl=Math.min(10*60*1000,Math.max(30*1000,Number(source.ttlMs)||2*60*1000));const createdAt=now();return Object.freeze({schema:SCHEMA,id:`ai-plan-${createdAt}-${Math.random().toString(36).slice(2,9)}`,intent,userId:String(ctx.userId||source.userId||''),createdAt,expiresAt:createdAt+ttl,status:'PREVIEW',summary:String(source.summary||inspected.text||intent),payload:Object.freeze(clone(source.payload||{})),requiresApproval:intent!=='EXPLAIN'&&intent!=='SCAN_PROJECT'&&intent!=='GUIDE_DRAWING'});}
function approve(plan,context,executor){const ctx=context||{};if(!plan||plan.schema!==SCHEMA)throw new Error('ASSISTANT_PLAN_INVALID');if(plan.expiresAt<=now())throw new Error('ASSISTANT_PLAN_EXPIRED');if(plan.userId&&String(ctx.userId||'')!==plan.userId)throw new Error('ASSISTANT_PLAN_USER_MISMATCH');if(plan.requiresApproval!==true)throw new Error('ASSISTANT_PLAN_APPROVAL_NOT_REQUIRED');if(ctx.approved!==true)throw new Error('ASSISTANT_PLAN_APPROVAL_REQUIRED');if(typeof executor!=='function')throw new TypeError('ASSISTANT_PLAN_EXECUTOR_REQUIRED');return executor({intent:plan.intent,payload:clone(plan.payload),planId:plan.id});}
function route(input,context){return createPlan(input,context);}
const api=Object.freeze({SCHEMA,ALLOWED,inspectText,createPlan,approve,route});root.PulumurAssistantIntentRouter=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
