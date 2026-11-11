import type {ProjectMaster} from '../domain/project';
import {sameDocument} from '../domain/documentIdentity';
import {listOperations,removeOperation,stageOperation,type OutboxOperation} from './cloudOutbox';
import config from '../data/cloudPublicConfig';
import { cloudRequest, CloudRequestError } from './cloudRequest';
export interface CloudRow {
    key: string;
    value: string | null;
    version: number;
}
interface Tokens {
    access_token: string;
    refresh_token: string;
}
interface Snapshot {
    rows: CloudRow[];
    userId: string;
    projectFilesDeferred?: boolean;
    projectFileStorage?: boolean;
    projectEpochs?: Record<string,number>;
    projectIndexPatches?: boolean;
    durableDrawingWrites?:boolean;
    normalizedProjectScopes?:string[];
    splitIndexVersions?:Record<string,{id:number;version:number}[]>;
}
const sessionKey = 'plmr.cloud.session.v12', values: Record<string, string> = Object.create(null), versions = new Map<string, number>();
let projectFilesDeferred=false,projectIndexPatches=false,projectFileStorage=false;
let session: Tokens | null = null, queue = Promise.resolve(), pending = 0, problem = '', epoch = 0;
let durableOwner='', durableDrawingWrites=false, journalError='',indexError='', indexQueue=Promise.resolve(),lastOperationAt=0;
const normalizedScopes=new Set<string>();
export const cloudUsesProjectSummaries=(cid:string)=>normalizedScopes.has(cid);
const indexInFlight=new Map<string,Promise<void>>();
const indexTaskKey=(cid:string,id:number)=>JSON.stringify([cid,id]);
const indexVersions=new Map<string,Map<number,number>>();
const indexDocuments=new Map<string,readonly ProjectMaster[]>();
const journal=new Map<string,OutboxOperation>();
const staleJournal=new Map<string,OutboxOperation>();
let projectEpochs:Record<string,number>={};
const projectEpochFor=(cid:string|null)=>cid&&Object.hasOwn(projectEpochs,cid)?projectEpochs[cid]:0;
const matchesProjectEpoch=(entry:OutboxOperation)=>(entry.projectEpoch??0)===projectEpochFor(entry.companyId);
const volatileJournal=new Map<string,OutboxOperation>();
const recoveringIndex=new Set<string>(),refreshIndex=new Set<string>();
const blockedIndexProjects=new Map<string,Set<number>>();
const attempts=new Map<string,Promise<DurableAck>>();
type DurableAck={operationId:string}&({version:number;replayed?:boolean}|{projects:{id:number;version:number}[]});
type OperationData=OutboxOperation extends infer Op ? Op extends OutboxOperation ? Pick<Op,'action'|'data'> : never : never;
let companyId: () => string | null = () => null, allowWrite: (key: string) => boolean = () => true;
const listeners = new Set<() => void>(), notify = () => listeners.forEach(fn => fn());
export const cloudEnabled = () => typeof location !== 'undefined' && location.protocol !== 'file:';
export const cloudHasSession = () => !!session;
export const cloudStatus = () => ({pending,error:problem||indexError||journalError,local:journal.size});
export const cloudOutboxBackup=()=>[...journal.values(),...volatileJournal.values(),...staleJournal.values()].map(({owner,...entry})=>entry);
export function subscribeCloud(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function configureCloudAccess(company: () => string | null, guard: (key: string) => boolean) { companyId = company; allowWrite = guard; }
function install(rows: CloudRow[], deferFiles=false, indexPatches=false) {
    projectEpochs={};projectFileStorage=false;staleJournal.clear();normalizedScopes.clear();indexInFlight.clear();
    durableOwner='';durableDrawingWrites=false;journal.clear();volatileJournal.clear();journalError='';indexError='';indexVersions.clear();indexDocuments.clear();recoveringIndex.clear();refreshIndex.clear();blockedIndexProjects.clear();
    projectFilesDeferred=deferFiles; projectIndexPatches=indexPatches; invalidateCloudReads(); for (const k of Object.keys(values))
    delete values[k]; versions.clear(); for (const r of rows) {
    versions.set(r.key, r.version);
    if (r.value !== null)
        values[r.key] = r.value;
} }
export const cloudProjectFileStorage=()=>projectFileStorage&&Boolean(session);
export const cloudProjectFileSession=(cid:string)=>JSON.stringify([durableOwner,projectEpochFor(cid)]);
function remember(tokens: Tokens | null) { session = tokens; if (tokens)
    sessionStorage.setItem(sessionKey, JSON.stringify(tokens));
else
    sessionStorage.removeItem(sessionKey); }
function tokenExpiry() { try {
    return Number(JSON.parse(atob(session!.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp) * 1000;
}
catch {
    return 0;
} }
let refreshing: Promise<void> | undefined;
async function refresh() {
    if (!session || tokenExpiry() > Date.now() + 60000)
        return;
    if (!refreshing) {
        const current = epoch, token = session.refresh_token;
        refreshing = (async () => {
            const next = await cloudRequest<Tokens>(config.supabaseUrl + '/auth/v1/token?grant_type=refresh_token', {
                method: 'POST', headers: { apikey: config.supabasePublishableKey, 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: token })
            }, { label: 'Oturum yenileniyor…' });
            if (current !== epoch) throw Error('Giriş işlemi iptal edildi.');
            remember(next);
        })().finally(() => { refreshing = undefined; });
    }
    await refreshing;
}
export async function cloudCall<T>(action: string, data: Record<string, unknown> = {}, projectEpoch?:number): Promise<T> {
    const generation = epoch;
    const cid=typeof data.companyId==='string'?data.companyId:companyId();
    const writeEpoch=projectEpoch??projectEpochFor(cid);
    if (!session)
        throw Error('Bulut oturumu gerekli.');
    await refresh();
    if (generation !== epoch || !session) throw Error('Oturum değişti.');
    const result = await cloudRequest<T>(config.supabaseUrl + '/functions/v1/plmr-platform', {
        method: 'POST', headers: { apikey: config.supabasePublishableKey, Authorization: 'Bearer ' + session!.access_token, 'Content-Type': 'application/json',
            ...(writeEpoch?{'x-plmr-project-epoch':String(writeEpoch)}:{}) },
        body: JSON.stringify({ action, ...data })
    }, { foreground: false, label: ['write', 'record_put', 'record_delete_many'].includes(action) ? 'Buluta kaydediliyor…' : action === 'snapshot' ? 'Çalışma alanı yükleniyor…' : 'Bulut işlemi sürüyor…',
        safeRead: ['snapshot', 'record_get', 'record_list', 'project_headers', 'project_content','project_overview','drawing_workspace','stock_read','project_files_read','project_master_detail','library_file_read','production_page','production_items','production_export'].includes(action) });
    if (generation !== epoch) throw Error('Oturum değişti.');
    return result;
}
async function installSnapshot(snapshot:Snapshot){
    install(snapshot.rows,snapshot.projectFilesDeferred,snapshot.projectIndexPatches);
    projectFileStorage=snapshot.projectFileStorage===true;
    projectEpochs=snapshot.projectEpochs??{};
    for(const cid of snapshot.normalizedProjectScopes??[])normalizedScopes.add(cid);
    durableDrawingWrites=snapshot.durableDrawingWrites===true;
    for(const [cid,projects] of Object.entries(snapshot.splitIndexVersions??{}))
        indexVersions.set(cid,new Map(projects.map(({id,version})=>[id,version])));
    durableOwner=config.supabaseUrl+':'+snapshot.userId;
    if(typeof indexedDB==='undefined'){
        if(durableDrawingWrites||indexVersions.size)journalError='Tarayıcı kalıcı taslak alanını açamadı.';
        return;
    }
    const owner=durableOwner,generation=epoch;
    try{
        const entries=await listOperations(owner);
        if(generation!==epoch||owner!==durableOwner)return;
        for(const entry of entries){
            if(!matchesProjectEpoch(entry)){staleJournal.set(entry.id,entry);continue;}
            journal.set(entry.id,entry);
            if(entry.action!=='record_put')recoveringIndex.add(entry.companyId);
        }
        notify();
        if(entries.length)setTimeout(()=>{if(generation===epoch)void retryCloudWrites().catch(()=>{});},0);
    }catch{
        if(generation===epoch){journalError='Tarayıcı kalıcı taslak alanını açamadı.';notify();}
    }
}
function createOperation(cid:string,data:OperationData):OutboxOperation{
    if(!durableOwner||typeof indexedDB==='undefined')throw Error('Kalıcı taslak alanı açılmadı. Tarayıcı ayarlarını kontrol edin.');
    lastOperationAt=Math.max(Date.now(),lastOperationAt+1);
    return {...structuredClone(data),owner:durableOwner,companyId:cid,projectEpoch:projectEpochFor(cid),id:crypto.randomUUID(),createdAt:lastOperationAt};
}
async function persistOperation(entry:OutboxOperation){
    volatileJournal.set(entry.id,entry);
    try{await stageOperation(entry);}
    catch{throw Error('Taslak diske yazılamadı. Bu sekmeden taslağı indirin.');}
    if(entry.owner!==durableOwner)throw Error('Oturum değişti. Taslak önceki oturumda korunuyor.');
    volatileJournal.delete(entry.id);journal.set(entry.id,entry);notify();
}
function sendOperation(entry:OutboxOperation):Promise<DurableAck>{
    const existing=attempts.get(entry.id);
    if(existing)return existing;
    const request=(async()=>{
        if(entry.owner!==durableOwner)throw Error('Oturum değişti.');
        if(!matchesProjectEpoch(entry))throw Error('Eski proje taslağı yeni veri dönemine gönderilemez.');
        let data:Record<string,unknown>=entry.data;
        if(entry.action==='record_put'&&entry.data.retainedHistory?.length){
            const value=entry.data.value as import('./drawingPersistence').DrawingProjectRecord;
            const workflow={...value.workflow} as Record<string,unknown>;
            for(const field of entry.data.retainedHistory)delete workflow[field];
            data={...entry.data,value:{...value,workflow}};
        }
        const result=await cloudCall<DurableAck>(entry.action,{...data,companyId:entry.companyId,operationId:entry.id},entry.projectEpoch??0);
        const valid=entry.action==='record_put'
            ? result&&'version' in result&&Number.isSafeInteger(result.version)&&result.version>entry.data.expectedVersion
            : result&&'projects' in result&&Array.isArray(result.projects)&&result.projects.length===entry.data.entries.length&&
                entry.data.entries.every(({id,expectedVersion})=>result.projects.some(item=>item.id===id&&item.version===expectedVersion+1));
        if(result?.operationId!==entry.id||!valid)throw Error('Bulut işlem onayı doğrulanamadı. Taslağınız korunuyor.');
        // Server receipt is authoritative. If cleanup fails, a later replay is idempotent.
        await removeOperation(entry).catch(()=>{});
        journal.delete(entry.id);notify();
        return result;
    })().finally(()=>attempts.delete(entry.id));
    attempts.set(entry.id,request);
    return request;
}
function indexTargets(entry:OutboxOperation){
    return entry.action!=='record_put'?entry.data.entries.map(({id})=>id):[];
}
function blockIndex(entry:OutboxOperation){
    if(entry.action==='record_put')return;
    const ids=blockedIndexProjects.get(entry.companyId)??new Set<number>();
    for(const id of indexTargets(entry))ids.add(id);
    blockedIndexProjects.set(entry.companyId,ids);
}
async function resumeJournal(){
    if(!journal.size&&!volatileJournal.size&&!refreshIndex.size)return;
    const owner=durableOwner,generation=epoch;
    const run=async()=>{
        for(const entry of volatileJournal.values())await persistOperation(entry);
        const entries=(await listOperations(owner)).filter(matchesProjectEpoch);
        if(generation!==epoch)return;
        for(const entry of entries)if(entry.action!=='record_put')recoveringIndex.add(entry.companyId);
        let firstError='';
        const failedTargets=new Set<string>();
        for(const entry of entries){
            if(generation!==epoch)break;
            const targets=entry.action==='record_put'
                ?[JSON.stringify([entry.companyId,'drawing',entry.data.key])]
                :indexTargets(entry).map(id=>JSON.stringify([entry.companyId,'index',id]));
            if(targets.some(target=>failedTargets.has(target)))continue;
            try{
                await sendOperation(entry);
                if(entry.action!=='record_put')refreshIndex.add(entry.companyId);
                else invalidateCloudReads();
            }catch(error){
                firstError||=(error as Error).message;
                for(const target of targets)failedTargets.add(target);
            }
        }
        if(generation!==epoch)return;
        if(refreshIndex.size){
            const keys=[...refreshIndex].map(cid=>'plmr.tenant.v68.'+cid+'.plmr.project.index.v11');
            const snapshot=await cloudCall<Snapshot>('snapshot',{keys,projectSummaries:true,deferProjectFiles:true});
            if(generation!==epoch)return;
            if([...refreshIndex].some(cid=>(snapshot.projectEpochs?.[cid]??0)!==projectEpochFor(cid)))
                throw Error('Proje veri dönemi değişti. Uygulamayı yeniden açın.');
            for(const row of snapshot.rows)if(row.value!==null){values[row.key]=row.value;indexDocuments.delete(row.key);}
            for(const [cid,projects]of Object.entries(snapshot.splitIndexVersions??{}))
                indexVersions.set(cid,new Map(projects.map(({id,version})=>[id,version])));
            refreshIndex.clear();
            if(typeof window!=='undefined')window.dispatchEvent(new Event('plmr-project-index-replayed'));
        }
        const remaining=(await listOperations(owner)).filter(matchesProjectEpoch);
        if(generation!==epoch)return;
        journal.clear();recoveringIndex.clear();blockedIndexProjects.clear();
        for(const entry of remaining){journal.set(entry.id,entry);blockIndex(entry);}
        journalError=firstError;indexError=remaining.some(entry=>entry.action!=='record_put')?firstError:'';
        if(typeof window!=='undefined'&&remaining.length<entries.length)window.dispatchEvent(new Event('plmr-cloud-recovered'));
        notify();
        if(firstError)throw Error(firstError);
    };
    if(typeof navigator!=='undefined'&&navigator.locks)await navigator.locks.request('plmr-cloud-replay:'+owner,run);
    else await run();
}
/** Mixed-version rollout: only an explicitly unsupported action uses the old read path. */
export async function cloudProjectRead<T>(action:'project_headers'|'project_content',data:Record<string,unknown>):Promise<T|undefined>{
    // Header reconciliation compares against the queued master index. Search reads canonical content.
    if(action==='project_headers')await flushCloud();
    try{return await cloudCall<T>(action,data)}catch(error){
        if(error instanceof CloudRequestError&&error.message==='INVALID_ACTION')return undefined;
        throw error;
    }
}
interface IndexWrite {base:readonly ProjectMaster[];rows:readonly ProjectMaster[]}
interface PendingWrite { index?:IndexWrite; key: string; value: string | null; companyId: string | null; generation: number; projectEpoch:number; expectedVersion?: number; started?: boolean }
const unsaved = new Set<PendingWrite>();
function enqueue(key: string, value: string | null, index?:IndexWrite) {
    const cid = companyId();
    const waiting = [...unsaved].find(job=>!job.started && job.key===key && job.companyId===cid && job.generation===epoch);
    if(waiting){
        waiting.value=value;
        waiting.index=waiting.index&&index?{base:waiting.index.base,rows:index.rows}:undefined;
        return;
    }
    const job: PendingWrite = { key, value, index, companyId: cid, generation: epoch, projectEpoch:projectEpochFor(cid) };
    unsaved.add(job); pending++; notify();
    queue = queue.then(async () => {
        if (problem) return;
        if (job.generation !== epoch) throw Error('Oturum değişti.');
        job.started = true;
        job.expectedVersion = versions.get(key) || 0;
        const row = await persistCloudWrite(job,job.expectedVersion);
        versions.set(key, row.version); unsaved.delete(job);
    }).catch(error => { problem = (error as Error).message; }).finally(() => { pending--; notify(); });
}
function projectIndexChanges({base,rows}:IndexWrite){
    const previous=new Map(base.map(project=>[project.id,project])),remaining=new Set(rows.map(project=>project.id));
    return {upserts:rows.filter(project=>previous.get(project.id)!==project),
        remove:base.filter(project=>!remaining.has(project.id)).map(project=>project.id)};
}
function persistedIndexChanges(index:IndexWrite,raw:string|null){
    const projects=new Map((JSON.parse(raw??'[]') as ProjectMaster[]).map(project=>[project.id,project]));
    const {upserts,remove}=projectIndexChanges(index);
    return upserts.every(project=>sameDocument(projects.get(project.id),project))&&remove.every(id=>!projects.has(id));
}
function persistCloudWrite(job:PendingWrite,expectedVersion:number){
    if(job.index){
        const {upserts,remove}=projectIndexChanges(job.index);
        if(!upserts.length&&!remove.length)return Promise.resolve({version:expectedVersion});
        return cloudCall<{version:number}>('project_index_patch',{companyId:job.companyId,expectedVersion,upserts,remove},job.projectEpoch);
    }
    return cloudCall<{version:number}>('write',{key:job.key,value:job.value,companyId:job.companyId,expectedVersion,versionOnly:true},job.projectEpoch);
}
export async function awaitProjectMasterSave(id:number){
    if(!cloudEnabled())return;
    const cid=companyId();
    if(!cid||!normalizedScopes.has(cid)){await flushCloud();return;}
    const generation=epoch;
    await indexInFlight.get(indexTaskKey(cid,id));
    if(epoch!==generation||companyId()!==cid)throw Error('Firma veya oturum değişti.');
    if(blockedIndexProjects.get(cid)?.has(id)||recoveringIndex.has(cid))
        throw Error(indexError||'Projenin yerel kaydı sunucu onayı bekliyor.');
}
export function projectMasterSavePending(id:number){
    const cid=companyId();
    return Boolean(cid&&(indexInFlight.has(indexTaskKey(cid,id))||blockedIndexProjects.get(cid)?.has(id)));
}
export async function cloudReadProjectMaster(cid:string,id:number){
    await indexInFlight.get(indexTaskKey(cid,id));
    if(companyId()!==cid||blockedIndexProjects.get(cid)?.has(id)||recoveringIndex.has(cid))
        throw Error('Projenin bekleyen kayıtlarını eşitleyin.');
    const expected=indexVersions.get(cid)?.get(id);
    const result=await cloudCall<{id:number;version:number;value:ProjectMaster}>('project_master_detail',{companyId:cid,id});
    if(companyId()!==cid||result.id!==id||result.value.id!==id||result.version!==expected||
        indexVersions.get(cid)?.get(id)!==expected)throw Error('Proje güncellendi. Çalışma alanını yenileyin.');
    return result.value;
}
function normalizedMasterValue(project:ProjectMaster,prior?:ProjectMaster){
    const {projectDetailsDeferred,packageRevisionIds,revisions,productionPackages,pricing,productionPositionCounts,productionItems,...fields}=project;
    const summary=projectDetailsDeferred&&productionPositionCounts?fields:{...fields,productionItems};
    if(projectDetailsDeferred)return summary;
    return {...summary,
        ...(!sameDocument(prior?.revisions,revisions)?{revisions:revisions??[]}:{}),
        ...(!sameDocument(prior?.productionPackages,productionPackages)?{productionPackages:productionPackages??{}}:{}),
        ...(!sameDocument(prior?.pricing,pricing)?{pricing:pricing??null}:{})
    };
}
export function cloudWriteProjectIndex(key:string,base:readonly ProjectMaster[],rows:readonly ProjectMaster[]){
    if(!projectIndexPatches||!versions.has(key)||!key.endsWith('.plmr.project.index.v11'))return false;
    if(!allowWrite(key))throw Error('Bu kaydı değiştirme yetkiniz yok.');
    const cid=companyId(),known=cid?indexVersions.get(cid):undefined;
    if(known){
        if(recoveringIndex.has(cid!))throw Error('Bekleyen proje dizini kayıtları eşitleniyor.');
        const {upserts,remove}=projectIndexChanges({base,rows});
        const normalized=normalizedScopes.has(cid!);
        const prior=normalized?new Map(base.map(project=>[project.id,project])):undefined;
        const entries=[
            ...upserts.map(project=>({id:project.id,expectedVersion:known.get(project.id)??0,
                value:prior?normalizedMasterValue(project,prior.get(project.id)):project})),
            ...remove.map(id=>({id,expectedVersion:known.get(id)??0,value:null})),
        ];
        if(!entries.length)return true;
        if(entries.some(({id})=>blockedIndexProjects.get(cid!)?.has(id)))
            throw Error('Bu projenin yerel dizin kaydı bekliyor. Önce bulut kaydını yeniden deneyin.');
        const operation=createOperation(cid!,{action:normalized?'project_master_commit':'project_index_commit',data:{entries}});
        indexDocuments.set(key,rows);
        for(const {id,expectedVersion} of entries)known.set(id,expectedVersion+1);
        const staged=persistOperation(operation).then(()=>null,error=>error as Error);
        pending++;notify();
        const keys=entries.map(({id})=>indexTaskKey(cid!,id));
        const dependencies=normalized?keys.map(id=>indexInFlight.get(id)):[indexQueue];
        const work=Promise.all(dependencies).then(async()=>{
            const failure=await staged;
            if(failure)throw failure;
            if(indexTargets(operation).some(id=>blockedIndexProjects.get(cid!)?.has(id)))return;
            await sendOperation(operation);
        }).catch(error=>{blockIndex(operation);indexError=(error as Error).message;}).finally(()=>{
            for(const id of keys)if(indexInFlight.get(id)===work)indexInFlight.delete(id);
            pending--;notify();
        });
        for(const id of keys)indexInFlight.set(id,work);
        indexQueue=Promise.all([indexQueue,work]).then(()=>{});

        return true;
    }
    if(problem)throw Error(problem);
    const value=JSON.stringify(rows);
    if(values[key]===value)return true;
    values[key]=value;
    enqueue(key,value,{base,rows});
    return true;
}
/** Explicit recovery reconciles uncertain commits before retrying, preserving drafts and CAS. */
let recovering: Promise<void> | undefined;
export function retryCloudWrites(): Promise<void> {
    if (!recovering) recovering = recoverCloudWrites().finally(() => { recovering = undefined; });
    return recovering;
}
async function recoverCloudWrites() {
    await Promise.all([queue,indexQueue]);
    let durableFailure:unknown;
    try{await resumeJournal();}catch(error){durableFailure=error;journalError=(error as Error).message;notify();}
    if (!unsaved.size && durableFailure)throw durableFailure;
    if (!unsaved.size) { problem = ''; notify(); return; }
        pending = unsaved.size; notify();
        try {
            const remote = new Map((await cloudCall<Snapshot>('snapshot',{projectSummaries:true,keys:[...new Set([...unsaved].map(job=>job.key))]})).rows.map(row => [row.key, row]));
            for (const job of unsaved) {
                if (job.generation !== epoch) throw Error('Oturum değişti. Taslağı indirip yeniden giriş yapın.');
                const row = remote.get(job.key), version = row?.version || 0;
                if ((row?.value ?? null) === job.value || (job.index && persistedIndexChanges(job.index,row?.value??null))) {
                    versions.set(job.key, version);
                } else {
                    const expected = job.expectedVersion ?? versions.get(job.key) ?? 0;
                    if (version !== expected) throw Error('Kayıt başka bir oturumda değişti. Taslağınız korundu; önce taslağı indirin.');
                    const saved = await persistCloudWrite(job,expected);
                    versions.set(job.key, saved.version); remote.set(job.key, { ...saved, value: job.value, key: job.key });
                }
                unsaved.delete(job); pending--; notify();
            }
            problem = '';
        } catch (error) { problem = (error as Error).message; throw error; }
        finally { pending = 0; notify(); }
    if(durableFailure)throw durableFailure;
}

function cloudStoredValue(key:string){
    const document=indexDocuments.get(key);
    if(document){values[key]=JSON.stringify(document);indexDocuments.delete(key);}
    return values[key]??null;
}
export const cloudStorage: Storage = Object.defineProperties(values, {
    length: { get: () => Object.keys(values).length }, key: { value: (i: number) => Object.keys(values)[i] ?? null }, getItem: { value: cloudStoredValue },
    setItem: { value: (k: string, v: string) => { v = String(v); if (cloudStoredValue(k) === v)
            return; if (problem)
            throw Error(problem); if (!allowWrite(k)) {
            if (values[k] === undefined) {
                values[k] = v;
                return;
            }
            throw Error('Bu kaydı değiştirme yetkiniz yok.');
        } indexDocuments.delete(k); values[k] = v; enqueue(k, v); } },
    removeItem: { value: (k: string) => { if (!(k in values))
            return; if (problem)
            throw Error(problem); if (!allowWrite(k))
            throw Error('Bu kaydı değiştirme yetkiniz yok.'); indexDocuments.delete(k);delete values[k]; enqueue(k, null); } }, clear: { value: () => { throw Error('Bulut kayıtları topluca temizlenemez.'); } }
}) as Storage;
export async function flushCloud() {
    await Promise.all([queue,indexQueue]);
    if(problem||indexError)throw Error(problem||indexError);
}
export function resetCloudSignIn() {
    if (unsaved.size||volatileJournal.size) throw Error('Kaydedilmemiş taslağınız var. Önce taslağı indirin.');
    epoch++; remember(null); install([]); problem = '';
    sessionStorage.removeItem('plmr.auth.session.v68'); notify();
}
export async function initializeCloud() { if (!cloudEnabled())
    return; const raw = sessionStorage.getItem(sessionKey); if (!raw)
    return; try {
    session = JSON.parse(raw);
    const snapshot=await cloudCall<Snapshot>('snapshot',{deferProjectFiles:true,projectSummaries:true,compactProjects:true});
    await installSnapshot(snapshot);
}
catch (e) {
    // A transient network failure must not destroy a still-valid refresh token.
    if (e instanceof CloudRequestError && [401, 403].includes(e.status)) remember(null);
    throw e;
} }
export async function cloudLogin(username: string, pin: string, onProgress?: (progress:number,label:string)=>void) {
    if (unsaved.size||volatileJournal.size) throw Error('Kaydedilmemiş taslağınız var. Önce taslağı indirin.');
    const generation = ++epoch;
    remember(null);
    install([]);
    problem = '';
    onProgress?.(10,'Kullanıcı doğrulanıyor…');
    const result = await cloudRequest<{ session?: Tokens }>(config.supabaseUrl + '/functions/v1/admin-users', {
        method: 'POST', headers: { apikey: config.supabasePublishableKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username: username.trim().toLowerCase(), pin })
    }, { label: 'Giriş yapılıyor…', foreground: !onProgress });
    if (!result.session?.access_token) throw Error('Kullanıcı adı veya PIN hatalı.');
    if (generation !== epoch)
        throw Error('Giriş işlemi iptal edildi.');
    remember(result.session);
    onProgress?.(45,'Çalışma alanı yükleniyor…');
    try {
        const snapshot = await cloudCall<Snapshot>('snapshot',{deferProjectFiles:true,projectSummaries:true,compactProjects:true});
        if (generation !== epoch)
            throw Error('Giriş işlemi iptal edildi.');
        await installSnapshot(snapshot);
        if(generation!==epoch)throw Error('Giriş işlemi iptal edildi.');
        onProgress?.(90,'Oturum hazırlanıyor…');
        return snapshot.userId;
    }
    catch (e) {
        if (generation === epoch && e instanceof CloudRequestError && [401, 403].includes(e.status)) remember(null);
        throw e;
    }
}
export function cancelCloudLogin() { epoch++; }
export async function cloudLogout() { await flushCloud(); if(volatileJournal.size)throw Error('Taslağınız henüz tarayıcıya yazılmadı. Önce taslağı indirin.'); if (session) {
    await cloudRequest(config.supabaseUrl + '/auth/v1/logout?scope=local', {
        method: 'POST', headers: { apikey: config.supabasePublishableKey, Authorization: 'Bearer ' + session.access_token }
    }, { label: 'Oturum kapatılıyor…' });
} remember(null); install([]); epoch++; }
export const cloudProjectFilesDeferred=()=>projectFilesDeferred;
export async function cloudReadProjectFiles(cid:string){
    const row=await cloudCall<CloudRow>('project_files_read',{companyId:cid});
    const key=`plmr.tenant.v68.${cid}.plmr.project.attachments.v10`;
    if(companyId()!==cid||row.key!==key)throw Error('Firma veya oturum değişti.');
    if(row.value!==null)values[key]=row.value;
    versions.set(key,row.version);
    projectFilesDeferred=false;
    return row.value;
}
export async function cloudSetPin(userId: string, pin: string) { await flushCloud(); await cloudCall('set_pin', { userId, pin, companyId: companyId() }); const key = 'plmr.credentials.v68'; values[key] = JSON.stringify({ ...JSON.parse(values[key] || '{}'), [userId]: { version: 1 } }); }
// Versioned read reuse is scoped by login and company, re-authorized on every call.
// Only in-flight reads coalesce. Writes fetch fresh CAS state; drafts receive clones.
const recordReads = new Map<string,{at:number;promise:Promise<{value:unknown;version:number}>}>();
type ListRead = { promise: Promise<Array<{ key:string; value:unknown; version:number }>>; invalidated?: boolean }
const listReads = new Map<string,ListRead>();
const pendingReads = new Map<string,Promise<unknown>>();
let readRevision=0;
export function invalidateCloudReads(){readRevision++;recordReads.clear();listReads.clear();pendingReads.clear()}
function readScope(cid:string){return epoch+':'+cid+':'}
const drawingStore='drawing.projects',navigationAge=15_000;
async function recentDrawing(key:string,cid:string){
 const entry=recordReads.get(readScope(cid)+drawingStore+':'+key);
 if(!entry||Date.now()-entry.at>navigationAge)return undefined;
 const generation=epoch,revision=readRevision;
 const row=await entry.promise.catch(()=>undefined);
 if(generation!==epoch||companyId()!==cid)throw Error('Firma veya oturum değişti.');
 return revision===readRevision&&row?.value&&row.version>=cloudRecordVersion(drawingStore,key,cid)?
    row.value as import('./drawingPersistence').DrawingProjectRecord:undefined;
}
export async function cloudDrawingOverview(key:string,cid:string){
 const cached=await recentDrawing(key,cid);
 if(cached){const {projectOverview}=await import('../domain/projectOverview');return projectOverview(cached)}
 try{
  const result=await cloudCall<import('../domain/projectOverview').ProjectOverview|null>('project_overview',{key,companyId:cid});
  if(companyId()!==cid)throw Error('Firma değişti.');
  return result;
 }
 catch(error){if(error instanceof CloudRequestError&&error.message==='INVALID_ACTION')return undefined;throw error}
}
export async function cloudRecord<T>(store:string,key:string,cid:string,fresh=false,navigation=false):Promise<T|null>{
 const generation=epoch;
 if(navigation&&!fresh&&store===drawingStore){
  const cached=await recentDrawing(key,cid);
  if(cached)return structuredClone(cached) as T;
 }
 if(!navigation)await flushCloud();
 if(generation!==epoch)throw Error('Oturum değişti.');
 const revision=readRevision,id=readScope(cid)+store+':'+key,now=Date.now();
 let promise=pendingReads.get(id) as Promise<{value:unknown;version:number}>|undefined;
 if(fresh||!promise){
  const previous=fresh?undefined:recordReads.get(id);
  promise=(async()=>{
   const known=previous?await previous.promise:undefined;
   const response=await cloudCall<{value:unknown;version:number;notModified?:boolean}>('record_get',{store,key,companyId:cid,...known?{knownVersion:known.version}:{}});
   if(response.notModified&&!known)throw Error('Bulut kayıt doğrulaması tamamlanamadı.');
   return response.notModified?known!:response;
  })();
  if(recordReads.size>=64)recordReads.clear();
  const entry={at:now,promise};recordReads.set(id,entry);pendingReads.set(id,promise);
  const captured=entry;void promise.catch(()=>{if(recordReads.get(id)===captured)recordReads.delete(id)});
  void promise.finally(()=>{if(pendingReads.get(id)===promise)pendingReads.delete(id)}).catch(()=>{});
 }
 const r=await promise;if(generation!==epoch||navigation&&companyId()!==cid)throw Error('Firma veya oturum değişti.');
 if(revision!==readRevision||r.version<cloudRecordVersion(store,key,cid)){
  if(fresh)throw Error('Kayıt okuma sırasında değişti. Tekrar deneyin.');
  return cloudRecord<T>(store,key,cid,true,navigation);
 }
 versions.set(`record:${cid}:${store}:${key}`,r.version);
 return structuredClone(r.value) as T|null;
}
export async function cloudRecords<T>(store:string,cid:string):Promise<T[]>{
 const generation=epoch;
 for(let attempt=0;attempt<2;attempt++){
  if(generation!==epoch||companyId()!==cid)throw Error('Firma veya oturum değişti.');
  const revision=readRevision,id=readScope(cid)+store;
  let entry=listReads.get(id);
  if(!entry){
   const promise=cloudCall<Array<{key:string;value:unknown;version:number}>>('record_list',{store,companyId:cid});
   const pending={promise};
   entry=pending;listReads.set(id,pending);
   void promise.finally(()=>{if(listReads.get(id)===pending)listReads.delete(id)}).catch(()=>{});
  }
  const rows=await entry.promise;
  if(generation!==epoch||companyId()!==cid)throw Error('Firma veya oturum değişti.');
  if(revision!==readRevision||entry.invalidated)continue;
  for(const r of rows)versions.set(`record:${cid}:${store}:${r.key}`,r.version);
  return structuredClone(rows.map(r=>r.value)) as T[];
 }
 throw Error('Liste okuma sırasında değişti. Tekrar deneyin.');
}
export async function cloudRecordForUpdate<T>(store:string,key:string,cid:string){
 if(store!==drawingStore)await flushCloud();
 const cached=store===drawingStore&&normalizedScopes.has(cid)
    ?await recordReads.get(readScope(cid)+store+':'+key)?.promise.catch(()=>undefined):undefined;
 const row=await cloudCall<{value:T|null;version:number;notModified?:boolean}>('record_get',
    {store,key,companyId:cid,...cached?{knownVersion:cached.version}:{}});
 if(companyId()!==cid)throw Error('Firma veya oturum değişti.');
 if(row.notModified){
    if(!cached||cached.version!==row.version)throw Error('Bulut kayıt doğrulaması tamamlanamadı.');
    return {value:structuredClone(cached.value) as T|null,version:cached.version};
 }
 return {value:row.value,version:row.version};
}
export async function cloudReadDrawingWorkspace(key:string,cid:string):Promise<{record:import('./drawingPersistence').DrawingProjectRecord|null;recovery:import('./drawingPersistence').DrawingWorkingDraft|null}|undefined>{
 const generation=epoch,revision=readRevision;
 if(generation!==epoch)throw Error('Oturum değişti.');
 try{
  const id=readScope(cid)+'drawing.projects:'+key;
  const previous=await recordReads.get(id)?.promise.catch(()=>undefined);
  if(generation!==epoch)throw Error('Oturum değişti.');
  const result=await cloudCall<{record:{value?:import('./drawingPersistence').DrawingProjectRecord|null;version:number;notModified?:boolean};recovery:import('./drawingPersistence').DrawingWorkingDraft|null}>('drawing_workspace',{key,companyId:cid,knownVersion:previous?.version});
  if(generation!==epoch||companyId()!==cid)throw Error('Firma veya oturum değişti.');
  if(revision!==readRevision||result.record.version<cloudRecordVersion(drawingStore,key,cid))return cloudReadDrawingWorkspace(key,cid);
  if(result.record.notModified&&(!previous||previous.version!==result.record.version))throw Error('Bulut kayıt doğrulaması tamamlanamadı.');
  const row={value:(result.record.notModified?previous!.value:result.record.value) as import('./drawingPersistence').DrawingProjectRecord|null,version:result.record.version};
  if(recordReads.size>=64)recordReads.clear();
  recordReads.set(id,{at:Date.now(),promise:Promise.resolve(row)});
  versions.set('record:'+cid+':drawing.projects:'+key,row.version);
  return {record:structuredClone(row.value),recovery:result.recovery};
 }catch(error){
  if(error instanceof CloudRequestError&&error.message==='INVALID_ACTION')return undefined;
  throw error;
 }
}
export async function cloudKnownDrawingForUpdate(key:string,cid:string,workflowVersion:number){
 const generation=epoch,revision=readRevision;
 const saved=await recordReads.get(readScope(cid)+'drawing.projects:'+key)?.promise.catch(()=>undefined);
 const value=saved?.value as import('./drawingPersistence').DrawingProjectRecord|null|undefined;
 if(generation===epoch&&revision===readRevision&&saved&&value?.workflow?.version===workflowVersion)return {value,version:saved.version};
 return undefined;
}
export const cloudRecordVersion=(store:string,key:string,cid:string)=>versions.get(`record:${cid}:${store}:${key}`)||0;
function rememberRecord(store:string,key:string,cid:string,row:{value:unknown;version:number}){
 const id=readScope(cid)+store+':'+key;
 versions.set(`record:${cid}:${store}:${key}`,row.version);
 const listId=readScope(cid)+store,list=listReads.get(listId);
 if(list)list.invalidated=true;
 listReads.delete(listId);
 pendingReads.delete(id);
 if(recordReads.size>=64)recordReads.clear();
 recordReads.set(id,{at:Date.now(),promise:Promise.resolve(row)});
}
export async function cloudApproveProject(key:string,stage:import('../domain/projectApprovals').ApprovalStage,expectedWorkflowVersion:number,cid:string,productionPackage?:import('../domain/project').SavedGiyotinProduction,sourceSignature?:string) {
 if(stage==='package'&&!productionPackage)await flushCloud();
 const row=await cloudCall<{value:import('./drawingPersistence').DrawingProjectRecord;version:number}>('project_approve',{key,stage,expectedWorkflowVersion,companyId:cid,productionPackage,sourceSignature}).catch(error=>{
  if(error instanceof CloudRequestError&&error.message==='INVALID_ACTION')throw Error('Supabase klasöründeki hizliyukle.bat ile V36 bulut hizmetini güncelleyin.');
  throw error;
 });
 rememberRecord(drawingStore,key,cid,row);
 return row.value;
}
export async function cloudWithdrawProject(key:string,target:import('../domain/projectStatus').BusinessStatus,expectedWorkflowVersion:number,cid:string,note:string){
 const row=await cloudCall<{value:import('./drawingPersistence').DrawingProjectRecord;version:number}>('project_withdraw',{key,target,expectedWorkflowVersion,companyId:cid,note}).catch(error=>{
  if(error instanceof CloudRequestError&&error.message==='INVALID_ACTION')throw Error('Supabase klasöründeki hizliyukle.bat ile bulut hizmetini V39 sürümüne güncelleyin.');
  throw error;
 });
 rememberRecord(drawingStore,key,cid,row);
 return row.value;
}
export async function cloudContinueDrawing<T>(key:string,revisionId:string,expectedWorkflowVersion:number,cid:string):Promise<T>{
 const row=await cloudCall<{value:T;version:number}>('continue_drawing',{key,revisionId,expectedWorkflowVersion,companyId:cid}).catch(error=>{
  if(error instanceof CloudRequestError && error.message==='INVALID_ACTION')throw Error('Bu çizimden devam etmek için bulut hizmetini V19 sürümüne güncelleyin.');
  throw error;
 });
 rememberRecord(drawingStore,key,cid,row);
 return row.value;
}
export async function cloudPutRecord(store:string,key:string,value:unknown,cid:string,expected?:number,base?:import('./drawingPersistence').DrawingProjectRecord|null){
    if(store!==drawingStore)await flushCloud();
    const expectedVersion=expected??cloudRecordVersion(store,key,cid);
    if(store===drawingStore&&durableDrawingWrites){
        const prior=[...journal.values(),...volatileJournal.values()].find(entry=>entry.action==='record_put'&&entry.companyId===cid&&entry.data.key===key);
        if(prior?.action==='record_put'&&(prior.data.expectedVersion!==expectedVersion||!sameDocument(prior.data.value,value)))
            throw Error('Bu projenin yerel kaydı bekliyor. Önce bulut kaydını yeniden deneyin.');
        const next=value as import('./drawingPersistence').DrawingProjectRecord|null;
        const previous=base?.workflow;
        const retainedHistory=normalizedScopes.has(cid)
            ?(['drawings','quotes','withdrawnPackages'] as const).filter(field=>expectedVersion>0&&previous&&next?.workflow&&
                sameDocument(previous[field],next.workflow[field]))
            :undefined;
        const entry=prior??createOperation(cid,{action:'record_put',data:{store:drawingStore,key,value,expectedVersion,versionOnly:true,retainedHistory}});
        pending++;notify();
        try{
            if(!journal.has(entry.id))await persistOperation(entry);
            const result=await sendOperation(entry);
            if(!('version' in result))throw Error('Bulut kayıt onayı geçersiz.');
            if(result.replayed)invalidateCloudReads();
            else rememberRecord(store,key,cid,{value:structuredClone(value),version:result.version});
            journalError='';notify();
        }catch(error){journalError=(error as Error).message;throw error;}
        finally{pending--;notify();}
        return;
    }
    const result=await cloudCall<{version:number}>('record_put',{store,key,value,companyId:cid,expectedVersion,versionOnly:true});
    rememberRecord(store,key,cid,{value:structuredClone(value),version:result.version});
}
export async function cloudDeleteRecords(store: string, keys: string[], cid: string) {
    await flushCloud();
    const unique = [...new Set(keys)], items = [];
    for (const key of unique) {
        await cloudRecord(store, key, cid);
        items.push({ key, version: versions.get(`record:${cid}:${store}:${key}`) || 0 });
    }
    await cloudCall('record_delete_many', { store, items, companyId: cid });
    invalidateCloudReads();
    for (const item of items)
        versions.set(`record:${cid}:${store}:${item.key}`, item.version + 1);
}
export async function cloudSequence(key: string, minimum: number, cid: string) { return (await cloudCall<{
    value: number;
}>('sequence', { key, minimum, companyId: cid })).value; }
export async function cloudAccessToken() { await flushCloud(); await refresh(); return session?.access_token || null; }
if (typeof window !== 'undefined') {
    window.addEventListener('focus',invalidateCloudReads);
    window.addEventListener('online',()=>{if(journal.size)void retryCloudWrites().catch(()=>{});});
    window.addEventListener('beforeunload', e => { if (pending || problem) {
        e.preventDefault();
        e.returnValue = '';
    } });
    (window as unknown as {
        PLMRCloud: unknown;
    }).PLMRCloud = { getAccessToken: cloudAccessToken, getCompanyId: () => companyId(), endpoint: config.supabaseUrl + '/functions/v1/plmr-platform', key: config.supabasePublishableKey };
}

/** Bulk catalog publication shares the current cloud queue and optimistic version. */
export async function cloudCatalogCommit(cid:string,key:string,rows:unknown[]){
 await flushCloud();const full='plmr.tenant.v68.'+cid+'.'+key,generation=epoch;
 const result=await cloudCall<{value:string;version:number}>('catalog_commit',{companyId:cid,key,rows,expectedVersion:versions.get(full)||0});
 if(generation!==epoch)throw Error('Oturum değişti.');values[full]=result.value;versions.set(full,result.version);invalidateCloudReads();notify();return JSON.parse(result.value);
}
