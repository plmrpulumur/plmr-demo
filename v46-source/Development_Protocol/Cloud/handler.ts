import {applyStockMovement,emptyStock,existingStockMovement,stockCatalogKeys,validateStockCommand,type StockCommand,type StockState} from '../03_DEVELOPMENT_SOURCE/domain/stock';
import {catalogAction,isMaterialCatalog,validateMaterials,visibleMaterials} from './catalog';
import {sameDocument} from '../03_DEVELOPMENT_SOURCE/domain/documentIdentity';
import {approveProjectRecord,withdrawProjectRecord,approvalStage,approvalPermissions,assertApprovedRecordUnchanged,assertApprovedMasterChange} from '../03_DEVELOPMENT_SOURCE/domain/projectApprovals';
import type {SavedGiyotinProduction} from '../03_DEVELOPMENT_SOURCE/domain/project';
import { createDefaultRoles, resolvePermission, type DataScope, type PermissionId, type RoleDefinition, type ScopeFamily } from '../03_DEVELOPMENT_SOURCE/domain/authorization';
import { cloudPolicy } from '../03_DEVELOPMENT_SOURCE/domain/cloudPolicy';
import type { User } from '../03_DEVELOPMENT_SOURCE/domain/user';
import type { CompanyRecord } from '../03_DEVELOPMENT_SOURCE/domain/company';
import { assertLockedProductionHistory, type ProjectMaster } from '../03_DEVELOPMENT_SOURCE/domain/project';
import { drawingFingerprint } from '../03_DEVELOPMENT_SOURCE/domain/projectWorkflow';
import {continueDrawingRecord} from '../03_DEVELOPMENT_SOURCE/domain/drawingContinuation';
import type { DrawingProjectRecord } from '../03_DEVELOPMENT_SOURCE/services/drawingPersistence';
import { projectContent } from '../03_DEVELOPMENT_SOURCE/services/projectSearch';
import {ownershipFields,type ProjectionKind} from './recordProjection';
import {projectOverview} from '../03_DEVELOPMENT_SOURCE/domain/projectOverview';
import {projectFileAction,projectFileActions,type ProjectFileBackend} from './projectFiles';
import {libraryActions,libraryFileAction,libraryMaxBytes,libraryPointer,type LibraryObjects} from './libraryFiles';
import {DEFAULT_COMPANY_LIMITS,SYSTEM_HARD_LIMITS} from '../03_DEVELOPMENT_SOURCE/domain/limits';
export interface Row {
    key: string;
    value: unknown;
    version: number;
}
export interface IndexItem {id:number;version:number;value:unknown}
export interface IndexEntry {id:number;expectedVersion:number;value:unknown}
export interface IndexVersion {id:number;version:number}
export interface SplitIndex {version:number;projects:IndexItem[];normalized?:boolean}
export interface Principal {
    id: string;
    profile: {
        role: string;
        is_active: boolean;
        organization_id: string | null;
    };
}
export interface Backend {
    projectFiles?: ProjectFileBackend;
    libraryObjects?: LibraryObjects;
    projectEpochs?(scopes:string[]):Promise<Record<string,number>>;
    uploadCatalogMedia?(cid:string,input:Record<string,unknown>):Promise<any>;
    catalogMediaUrl?(path:string):Promise<string|null>;
    authenticate(request: Request): Promise<Principal>;
    directory(): Promise<{
        users: User[];
        companies: CompanyRecord[];
    }>;
    get(scope: string, key: string): Promise<Row>;
    getMany?(scope: string, keys: string[]): Promise<Row[]>;
    header?(scope: string, key: string): Promise<Row>;
    overview?(scope: string, key: string): Promise<Row>;
    projectRowsForKeys?(scope:string,kind:ProjectionKind,commercial:boolean,legacy:boolean,keys:string[]):Promise<Row[]>;
    unlinkedProjectHeaders?(companyId:string):Promise<Row[]>;
    projectRows?(scope: string, kind: ProjectionKind, commercial?: boolean, legacy?: boolean): Promise<Row[]>;
    list(scope: string, excludeKey?: string, excludeAlso?:string): Promise<Row[]>;
    splitIndex?(scope:string,compact?:boolean):Promise<SplitIndex|null>;
    productionPage?(companyId:string,actorId:string,projects:DataScope,operations:DataScope,technical:boolean,
        query:Record<string,unknown>,offset:number,limit:number,includeItems:boolean,id:number|null,facets:boolean):Promise<unknown>;
    splitIndexState?(scope:string,ids:number[],actor:string,operation:string):Promise<{receipt:IndexVersion[]|null;projects:IndexItem[]|null}|null>;
    splitIndexCommit?(scope:string,actor:string,operation:string,entries:IndexEntry[]):Promise<IndexVersion[]>;
    masterProject?(scope:string,id:number):Promise<IndexItem|null>;
    masterState?(scope:string,ids:number[],actor:string,operation:string,details:boolean):Promise<{receipt:IndexVersion[]|null;projects:IndexItem[]|null}|null>;
    masterCommit?(scope:string,actor:string,operation:string,entries:IndexEntry[]):Promise<IndexVersion[]>;
    masterOwner?(scope:string,reference:string):Promise<{value:Record<string,unknown>|null}|null>;
    drawingWriteState?(scope:string,key:string,actor:string,operation:string,inserting:boolean,retain?:string[]):Promise<{receipt?:{version:number};row?:Row}>;
    drawingCommit?(scope:string,key:string,actor:string,operation:string,expected:number,value:unknown):Promise<{version:number;replayed?:boolean}>;
    compactDrawingCommit?(scope:string,key:string,actor:string,operation:string,expected:number,value:unknown,retain:string[]):Promise<{version:number;replayed?:boolean}>;
    projectPackage?(scope:string,code:string,revision:string):Promise<SavedGiyotinProduction|null>;
    projectIndexState?(scope:string,ids:string[]):Promise<{version:number; projects:unknown[]}>;
    patchProjectIndex?(scope:string,expected:number,upserts:unknown[],remove:string[]):Promise<number>;
    cas(scope: string, key: string, value: unknown, expected: number, versionOnly?:boolean): Promise<Row>;
    deleteMany(scope: string, items: {
        key: string;
        version: number;
    }[]): Promise<void>;
    appendAudit(scope: string, key: string, events: unknown[]): Promise<Row>;
    sequence(scope: string, key: string, minimum: number): Promise<number>;
    setPin(actor: Principal, user: User, pin: string): Promise<void>;
    shareGet(id: string): Promise<{
        presentation: unknown;
        expiresAt: string;
    } | null>;
    sharePut(owner: Principal, cid: string, presentation: unknown): Promise<{
        id: string;
        expiresAt: string;
    }>;
}
const USERS = 'plmr.users.v13', COMPANIES = 'plmr.companies.v68', CREDS = 'plmr.credentials.v68';
class Failure extends Error {
    constructor(message: string, readonly status = 403) { super(message); }
}
function object(v: unknown): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v))
    throw new Failure('INVALID_OBJECT', 400); return v as Record<string, unknown>; }
function text(v: unknown, max = 600): string { if (typeof v !== 'string' || v.length > max)
    throw new Failure('INVALID_TEXT', 400); return v; }
function integer(v: unknown): number { if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0)
    throw new Failure('INVALID_VERSION', 400); return v; }
function operationId(v:unknown):string{
    if(typeof v!=='string'||!/^([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/i.test(v))
        throw new Failure('INVALID_OPERATION_ID',400);
    return v;
}
function array(v: unknown): unknown[] { if (!Array.isArray(v))
    throw new Failure('INVALID_ARRAY', 400); return v; }
function parse(v: unknown): unknown { return v === null ? null : JSON.parse(text(v, 64 * 1024 * 1024)); }
const same = sameDocument;
function identity(value: unknown): string { const r = object(value); return String(r.userId || r.companyId || r.attachmentId || r.auditEventId || r.orderId || r.paymentId || r.transactionId || r.proformaId || r.itemId || r.versionId || r.taskId || r.reminderId || r.id || r.projectId || r.projKodu || r.projectCode || ''); }
function user(value: unknown): User { const u = object(value); for (const k of ['userId', 'username', 'fullName', 'roleId', 'status'])
    text(u[k], 200); if (!/^[A-Za-z0-9_.-]{3,40}$/.test(String(u.username)) || !createDefaultRoles().some(r => r.roleId === u.roleId) || !['ACTIVE', 'INACTIVE'].includes(String(u.status)))
    throw new Failure('INVALID_USER', 400); for (const v of array(u.memberships)) {
    const m = object(v);
    text(m.companyId);
    if (!createDefaultRoles().some(r => r.roleId === m.roleId && r.roleId !== 'SYSTEM_ADMIN') || !['ACTIVE', 'INACTIVE'].includes(String(m.status)))
        throw new Failure('INVALID_MEMBERSHIP', 400);
} return u as unknown as User; }
function company(value: unknown): CompanyRecord { const c = object(value); for (const k of ['companyId', 'code', 'status', 'licenseStart', 'licenseEnd'])
    text(c[k], 160); if (!/^[A-Za-z0-9_-]{2,24}$/.test(String(c.code)) || !['ACTIVE', 'INACTIVE'].includes(String(c.status)) || !Number.isSafeInteger(c.userLimit) || Number(c.userLimit) < 1 || Number(c.userLimit) > 9999)
    throw new Failure('INVALID_COMPANY', 400); text(object(c.settings).companyName, 500); return c as unknown as CompanyRecord; }
export function createCloudHandler(db: Backend, validatePresentation: (input: unknown) => unknown) {
    const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-plmr-project-epoch', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
    return async (request: Request): Promise<Response> => {
        const requestId=globalThis.crypto?.randomUUID(), startedAt=Date.now();
        let bytes=0, actionLabel='unknown';
        const timings:Record<string,number>={};
        function reply(value:unknown,status=200){
            const serializeAt=Date.now(), body=JSON.stringify(value);
            const serializeMs=Math.round(Date.now()-serializeAt),durationMs=Date.now()-startedAt;
            if(requestId&&(status>=400||durationMs>=1000||Object.keys(timings).length))
                console.info(JSON.stringify({event:'plmr_request',requestId,action:actionLabel,status,durationMs,requestBytes:bytes,
                    responseBytes:new TextEncoder().encode(body).byteLength,serializeMs,...timings}));
            return new Response(body,{status,headers:requestId?{
                ...headers,'x-plmr-request-id':requestId,'Access-Control-Expose-Headers':'x-plmr-request-id'
            }:headers});
        }
        if (request.method === 'OPTIONS')
            return new Response('ok', { headers });
        try {
            if (request.method === 'GET') {
                const url = new URL(request.url), id = url.searchParams.get('share') || url.pathname.split('/').at(-1) || '';
                if (!/^[a-f0-9]{32}$/.test(id))
                    throw new Failure('Sunum bağlantısı geçersiz.', 400);
                const result = await db.shareGet(id);
                return result ? reply(result) : reply({ error: 'Sunum bulunamadı veya süresi doldu.' }, 404);
            }
            if (request.method !== 'POST')
                throw new Failure('METHOD_NOT_ALLOWED', 405);
            const maxBodyBytes=64 * 1024 * 1024;
            if (Number(request.headers.get('Content-Length') || 0) > maxBodyBytes)
                throw new Failure('Dosya çok büyük.', 413);
            const principal=await db.authenticate(request);
            if (!principal.profile.is_active)
                throw new Failure('ACCOUNT_DISABLED');
            if(!request.body)throw new Failure('INVALID_OBJECT',400);
            const bounded=request.body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({
                transform(chunk,controller){
                    bytes+=chunk.byteLength;
                    if(bytes>maxBodyBytes)throw new Failure('Dosya çok büyük.',413);
                    controller.enqueue(chunk);
                }
            }));
            const input=object(await new Response(bounded).json());
            // Request-local coalescing: permissions are always re-read on the next request.
            const reads = new Map<string, Promise<Row>>();
            const get = (scope: string, key: string) => {
                const id = JSON.stringify([scope, key]);
                if (!reads.has(id)) reads.set(id, db.get(scope, key));
                return reads.get(id)!;
            };
            const platformKeys = [USERS, COMPANIES, '@auth:' + principal.id];
            const snapshot = input.action === 'snapshot';
            if(typeof input.action==='string'&&['snapshot','record_put','record_get','record_list','write','project_index_patch','project_index_commit','project_overview','project_headers','project_content','project_files_read','drawing_workspace','project_approve','project_withdraw','continue_drawing','stock_read'].includes(input.action))
                actionLabel=input.action;
            const [platformRows, snapshotDirectory] = await Promise.all([
                snapshot ? db.list('platform') : db.getMany ? db.getMany('platform', platformKeys) : Promise.all(platformKeys.map(key => get('platform', key))),
                snapshot ? db.directory() : Promise.resolve(undefined),
            ]);
            const [usersRow, companiesRow, map] = platformKeys.map(key => platformRows.find(row => row.key === key) || { key, value: null, version: 0 });
            const base = snapshotDirectory ?? (usersRow.value === null || companiesRow.value === null ? await db.directory() : { users: [], companies: [] });
            const users = usersRow.value === null ? base.users : array(parse(usersRow.value)).map(user), companies = companiesRow.value === null ? base.companies : array(parse(companiesRow.value)).map(company);
            const appId = typeof map.value === 'string' ? map.value : principal.id, actor = users.find(u => u.userId === appId);
            if (!actor || actor.status !== 'ACTIVE')
                throw new Failure('ACCOUNT_DISABLED');
            const system = actor.roleId === 'SYSTEM_ADMIN' && principal.profile.role === 'system_admin', membership = (cid: string) => actor.memberships.find(m => m.companyId === cid && m.status === 'ACTIVE');
            const allowed = companies.filter(c => system || c.status === 'ACTIVE' && !!membership(c.companyId));
            function accessible(cid: string, write = false) { const c = allowed.find(c => c.companyId === cid); if (!c)
                throw new Failure('Firma erişimi tanımlı değil.'); const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }); if (write && !system && (today < c.licenseStart || today > c.licenseEnd))
                throw new Failure('Lisans süresi dışında kayıtlar yalnız görüntülenebilir.'); return c; }
            const roleCache = new Map<string, Promise<RoleDefinition[]>>();
            async function roles(cid: string) {
                if (!roleCache.has(cid)) roleCache.set(cid, get(cid, 'plmr.roles.v13').then(row => {
                    const custom = row.value ? array(parse(row.value)) as RoleDefinition[] : [];
                    return createDefaultRoles().map(r => r.locked ? r : custom.find(c => c.roleId === r.roleId) || r);
                }));
                return roleCache.get(cid)!;
            }
            async function can(cid: string, permission: PermissionId) { accessible(cid); if (system)
                return true; const m = membership(cid)!, r = (await roles(cid)).find(r => r.roleId === m.roleId); return !!r && resolvePermission(r, m.permissionOverrides, permission); }
            async function requireAny(cid: string, permissions: PermissionId[], write = false) { accessible(cid, write); if (!(await Promise.all(permissions.map(p => can(cid, p)))).some(Boolean))
                throw new Failure('Bu işlem için yetkiniz yok.'); }
            const projectOwners=new Map<string,Promise<Map<unknown,Record<string,unknown>>>>();
            async function projectOwner(cid:string,reference:unknown){
                if(db.masterOwner&&typeof reference==='string'){
                    const result=await db.masterOwner(cid,reference);
                    if(result)return result.value??undefined;
                }
                if(!projectOwners.has(cid))projectOwners.set(cid,get(cid,'plmr.project.index.v11').then(index=>{
                    const owners=new Map<unknown,Record<string,unknown>>();
                    for(const value of array(index.value?parse(index.value):[])){
                        const row=object(value),owner=Object.fromEntries(ownershipFields.map(field=>[field,row[field]]));
                        for(const key of [row.projectId,row.projKodu])if(key&&!owners.has(key))owners.set(key,owner);
                    }
                    return owners;
                }));
                return projectOwners.get(cid)!.then(owners=>owners.get(reference));
            }
            async function visible(cid: string, value: unknown, family: ScopeFamily = 'PROJECTS', ancestors: ReadonlySet<string> = new Set()): Promise<boolean> {
                if (system || membership(cid)?.roleId === 'COMPANY_ADMIN')
                    return true;
                const r = object(value), m = membership(cid)!, role = (await roles(cid)).find(r => r.roleId === m.roleId)!, scope = m.dataScopeOverrides?.[family] || role.dataScopes[family];
                // Legacy indexes can refer to themselves or form a parent cycle.
                // Track logical references: parsing the cached JSON creates fresh objects.
                const projectRef = JSON.stringify([cid, 'PROJECTS', r.projectId]);
                if (r.projectId && !r.ownerUserId && !r.createdByUserId && !ancestors.has(projectRef)) {
                    const parent=await projectOwner(cid,r.projectId);
                    if (parent)
                        return visible(cid, parent, family, new Set([...ancestors, projectRef]));
                }
                const customerRef = JSON.stringify([cid, 'CUSTOMERS', r.customerId]);
                if (r.customerId && !r.ownerUserId && !r.createdByUserId && !ancestors.has(customerRef)) {
                    const index = await get(cid, 'plmr.customer.master.v10'), parent = array(index.value ? parse(index.value) : []).find(v => object(v).id === r.customerId);
                    if (parent)
                        return visible(cid, parent, 'CUSTOMERS', new Set([...ancestors, customerRef]));
                }
                const own = [r.ownerUserId, r.createdByUserId, r.createdBy, r.uploadedBy, r.actorUserId, r.representativeUserId, r.userId].includes(actor.userId), assigned = Array.isArray(r.assignedUserIds) && r.assignedUserIds.includes(actor.userId) || r.assigneeUserId === actor.userId;
                return scope === 'ALL_COMPANY' || scope === 'OWN' && own || scope === 'ASSIGNED' && assigned || scope === 'OWN_OR_ASSIGNED' && (own || assigned);
            }
            async function subset(cid: string, items: unknown, family: ScopeFamily) { return (await Promise.all(array(items).map(async (v) => await visible(cid, v, family) ? v : null))).filter(v => v !== null); }
            async function filter(cid: string, key: string, value: unknown) {
                const p = cloudPolicy(key);
                if (!(await Promise.all(p.read.map(x => can(cid, x)))).some(Boolean))
                    return null;
                if(isMaterialCatalog(key))return visibleMaterials(value,p=>can(cid,p));
                if (p.family && Array.isArray(value))
                    return subset(cid, value, p.family);
                if (key === 'plmr.task-reminder.v12' && value) {
                    const v = object(value);
                    return { ...v, tasks: await subset(cid, v.tasks || [], 'OPERATIONS'), reminders: await subset(cid, v.reminders || [], 'OPERATIONS') };
                }
                if (key === 'plmr.cloud.library.meta.v12' && value) {
                    const v = object(value), items = await subset(cid, v.items || [], 'PROJECTS'), ids = new Set(items.map(identity));
                    return { ...v, items, versions: array(v.versions || []).filter(x => ids.has(String(object(x).itemId))) };
                }
                return value;
            }
            async function mergeVisible(cid: string, old: unknown[], next: unknown[], family: ScopeFamily) {
                const permitted=new Set<string>(),previous=new Map<string,unknown>();
                for(const value of old){
                    const id=identity(value);
                    if(!previous.has(id))previous.set(id,value);
                    if(await visible(cid,value,family))permitted.add(id);
                }
                for(const value of next){
                    const id=identity(value),prior=previous.get(id);
                    if(prior&&!permitted.has(id)&&!same(prior,value))throw new Failure('Bu kayda erişim yetkiniz yok.');
                    if(!prior&&!system&&!await visible(cid,value,family))throw new Failure('Kayıt sahipliği geçersiz.');
                }
                return [...old.filter(v=>!permitted.has(identity(v))),...next.filter(v=>!previous.has(identity(v))||permitted.has(identity(v)))];
            }
            async function validateProjectIndexChange(cid:string,before:unknown,after:unknown,overviews?:Map<string,Row>){
                const oldProject=before as ProjectMaster|undefined,newProject=after as ProjectMaster|undefined;
                if(oldProject&&newProject&&oldProject.projKodu!==newProject.projKodu)
                    throw new Failure('Proje kodu değiştirilemez.',400);
                if(oldProject&&newProject){
                    const from=oldProject.status,to=newProject.status;
                    if(from!==to&&(from==='arsivlendi'||to==='arsivlendi')){
                        await requireAny(cid,['project.archive'],true);
                        if(to==='arsivlendi'&&newProject.archivedFromStatus!==undefined&&newProject.archivedFromStatus!==from||
                            from==='arsivlendi'&&(newProject.archivedFromStatus!==undefined||
                            oldProject.archivedFromStatus!==undefined&&to!==oldProject.archivedFromStatus))
                            throw new Failure('Arşiv durumu güncel değil. Projeyi yeniden açın.',409);
                    }else if(oldProject.archivedFromStatus!==newProject.archivedFromStatus){
                        throw new Failure('Arşiv durumu geçersiz.',400);
                    }
                    if(from!==to&&to==='iptal'&&from!=='arsivlendi')
                        await requireAny(cid,['project.status.change'],true);
                }
                const code=text(object(after??before).projKodu);
                const scope=cid+':drawing.projects';
                const overview=!oldProject?.approvals&&!newProject?.approvals
                    ?overviews?.get(code)??(overviews?{key:code,value:null,version:0}:await db.overview?.(scope,code)):undefined;
                const overviewRecord=overview?.value as DrawingProjectRecord|null|undefined;
                const canonical=overview&&!Object.values(overviewRecord?.workflow?.approvals??{}).some(Boolean)?overview:await get(scope,code);
                assertApprovedMasterChange(oldProject,newProject,canonical.value as DrawingProjectRecord|null);
                if(oldProject&&newProject)assertLockedProductionHistory(oldProject,newProject);
            }
            const action = text(input.action, 40);
            if(action==='production_page'||action==='production_items'||action==='production_export'){
                actionLabel=action;
                const cid=text(input.companyId);
                await requireAny(cid,['operations.view']);
                await requireAny(cid,['project.view','commercial.quote.view']);
                if(action==='production_export')await requireAny(cid,['project.export']);
                if(!db.productionPage)throw new Failure('INVALID_ACTION',400);
                const m=membership(cid);
                const role=m?(await roles(cid)).find(r=>r.roleId===m.roleId):undefined;
                const scope=(family:ScopeFamily):DataScope=>{
                    if(system)return 'ALL_COMPANY';
                    return m?.dataScopeOverrides?.[family]??role?.dataScopes[family]??'OWN';
                };
                const requestQuery=action==='production_page'?object(input.query??{}):{};
                const columns=object(requestQuery.columns??{});
                if(Object.keys(columns).length>20)throw new Failure('INVALID_FILTERS',400);
                const query={
                    search:text(requestQuery.search??'',200).trim(),status:text(requestQuery.status??'',20),
                    customer:text(requestQuery.customer??'',400),sort:text(requestQuery.sort??'created',40),
                    direction:requestQuery.direction==='asc'?'asc':'desc',
                    columns:Object.fromEntries(Object.entries(columns).map(([key,value])=>[key,text(value,200)]))
                };
                const offset=integer(input.offset??0);
                if(offset>10_000_000)throw new Failure('INVALID_PAGE',400);
                const dbAt=Date.now();
                const result=await db.productionPage(cid,actor.userId,scope('PROJECTS'),scope('OPERATIONS'),
                    await can(cid,'project.view'),query,offset,action==='production_export'?100:5,
                    action!=='production_page',action==='production_items'?integer(input.id):null,
                    action==='production_page'&&input.facets===true);
                timings.databaseMs=Date.now()-dbAt;
                return reply(result);
            }
            if(libraryActions.includes(action)){
                actionLabel=action;
                const cid=text(input.companyId), metaKey='plmr.cloud.library.meta.v12';
                if(!db.libraryObjects)throw new Failure('INVALID_ACTION',400);
                if(action==='library_file_migrate'&&!system)throw new Failure('LIBRARY_MIGRATION_ADMIN_ONLY');
                if(action==='library_file_read'||action==='library_file_migrate')
                    await requireAny(cid,['cloud.download'],action==='library_file_migrate');
                else await requireAny(cid,['cloud.upload','cloud.version.manage'],true);
                async function libraryMeta(){
                    const row=await get(cid,metaKey);
                    const value=row.value?object(parse(row.value)):{};
                    return {items:array(value.items||[]).map(object),versions:array(value.versions||[]).map(object),folders:array(value.folders||[]).map(object)};
                }
                const maxBytes=action==='library_file_begin'?Math.min(libraryMaxBytes,...(await Promise.all([
                    get('platform','plmr.system.hardLimits.v13'),get(cid,'plmr.company.limits.v13')
                ])).map((row,index)=>{
                    const raw=row.value?object(parse(row.value)).cloudFileMaxFileSizeBytes:undefined;
                    return typeof raw==='number'&&Number.isSafeInteger(raw)&&raw>0?raw:
                        (index?DEFAULT_COMPANY_LIMITS:SYSTEM_HARD_LIMITS).cloudFileMaxFileSizeBytes;
                })):libraryMaxBytes;
                return reply(await libraryFileAction(db.libraryObjects,{
                    get,cas:(scope,key,value,version)=>db.cas(scope,key,value,version,true),
                    visible:value=>visible(cid,value),
                    fail:(message,status)=>{throw new Failure(message,status);},
                    linked:async key=>{
                        const meta=await libraryMeta();
                        const version=meta.versions.find(v=>v.storagePath===key);
                        const item=meta.items.find(i=>i.type==='FILE'&&(i.storagePath===key||i.itemId===version?.itemId));
                        if(!item||!await visible(cid,{ownerUserId:item.createdBy}))return null;
                        const source=version??item;
                        return {ownerUserId:String(item.createdBy),sizeBytes:Number(source.sizeBytes),name:String(source.fileName??'')};
                    },
                    uploadAllowed:async key=>{
                        const [,folderId,itemId]=key.split('/');
                        const meta=await libraryMeta(), item=meta.items.find(i=>i.itemId===itemId);
                        if(item){
                            await requireAny(cid,['cloud.version.manage'],true);
                            if(item.type!=='FILE'||item.folderId!==folderId||!await visible(cid,{ownerUserId:item.createdBy}))
                                throw new Failure('LIBRARY_FILE_ACCESS_DENIED');
                        }else{
                            await requireAny(cid,['cloud.upload'],true);
                            if(!meta.folders.some(f=>f.folderId===folderId&&f.status==='ACTIVE'))throw new Failure('LIBRARY_FOLDER_NOT_FOUND',404);
                        }
                    }
                },action,input,cid,actor.userId,maxBytes));
            }
            if(projectFileActions.includes(action)){
                actionLabel=action;
                if(!db.projectFiles)throw new Failure('INVALID_ACTION',400);
                const cid=text(input.companyId);
                const reading=['project_file_list','project_file_download'].includes(action);
                const uploading=['project_file_begin','project_file_finish','project_file_copy'].includes(action);
                await requireAny(cid,reading?['project.files.view']:uploading?['project.files.upload']:['project.files.manage'],!reading);
                if(action==='project_file_copy'){
                    await requireAny(cid,['project.files.view']);
                    await requireAny(cid,['project.create'],true);
                }
                let maxBytes:number|undefined;
                if(action==='project_file_begin'||action==='project_file_copy'){
                    const [hard,company]=await Promise.all([get('platform','plmr.system.hardLimits.v13'),get(cid,'plmr.company.limits.v13')]);
                    const limit='projectAttachmentMaxFileSizeBytes';
                    const size=(row:Row,fallback:number)=>{
                        const value=row.value===null?undefined:object(parse(row.value))[limit];
                        return typeof value==='number'&&Number.isSafeInteger(value)&&value>0?value:fallback;
                    };
                    maxBytes=Math.min(50*1024*1024,size(hard,SYSTEM_HARD_LIMITS[limit]),size(company,DEFAULT_COMPANY_LIMITS[limit]));
                }
                return reply(await projectFileAction(db.projectFiles,action,input,cid,actor.userId,
                    row=>visible(cid,row),(message,status)=>{throw new Failure(message,status)},maxBytes));
            }
            if(['catalog_commit','catalog_media_upload','catalog_media_url'].includes(action)){
                actionLabel=action;
                const cid=text(input.companyId);accessible(cid,action!=='catalog_media_url');
                if(action==='catalog_media_url')await requireAny(cid,['product.view','operations.view']);
                return reply(await catalogAction(db,input,cid,p=>can(cid,p)));
            }
            if (action === 'project_headers' || action === 'project_content') {
                const cid = text(input.companyId);
                await requireAny(cid, ['project.view', 'commercial.quote.view']);
                const commercial = input.commercial === true && await can(cid, 'commercial.quote.view');
                const codes=input.codes===undefined?undefined:[...new Set(array(input.codes).map(code=>text(code,200)))];
                if(codes&&(codes.length>128||!db.projectRowsForKeys))throw new Failure('INVALID_PROJECT_READ_SCOPE',400);
                const select = async (store: string, legacy = false) => {
                    const scope = cid + ':' + store;
                    if(codes&&!legacy)return db.projectRowsForKeys!(scope,action==='project_headers'?'header':'search',commercial,false,codes);
                    return db.projectRows ? db.projectRows(scope, action === 'project_headers' ? 'header' : 'search', commercial, legacy) : db.list(scope);
                };
                const dbAt=Date.now();
                const drawingRead=action==='project_headers'&&input.onlyUnlinked===true&&db.unlinkedProjectHeaders
                    ?db.unlinkedProjectHeaders(cid):select('drawing.projects');
                const [records,commercialRows]=await Promise.all([drawingRead,
                    action==='project_content'&&commercial?select('quote.quotes',true):Promise.resolve([])]);
                timings.dbProjectionMs=Math.round(Date.now()-dbAt);
                const processAt=Date.now();
                if (action === 'project_headers') {
                    const result = [];
                    for (const row of records) if (row.value !== null && await visible(cid, row.value)) {
                        const record = object(row.value), workflow = record.workflow ? object(record.workflow) : null;
                        result.push({ key: row.key, version: row.version, projectCode: record.projectCode || row.key, workflowVersion: workflow?.version ?? null });
                    }
                    timings.projectionProcessingMs=Math.round(Date.now()-processAt);
                    return reply(result);
                }
                const index: Record<string, { text: string; representative: string }> = Object.create(null), canonicalQuotes = new Set<string>();
                for (const row of records) if (row.value !== null && await visible(cid, row.value)) {
                    const record = object(row.value), code = text(record.projectCode);
                    index[code] = projectContent(record, undefined, commercial);
                    if (record.workflow && object(record.workflow).quote) canonicalQuotes.add(code);
                }
                const legacyQuotes = new Map<string, Record<string, unknown>>();
                for (const row of commercialRows) if (row.value !== null && await visible(cid, row.value)) {
                    const quote = object(row.value), code = text(quote.projectCode);
                    if (canonicalQuotes.has(code)||codes&&!codes.includes(code)) continue;
                    legacyQuotes.set(code, quote);
                }
                for (const [code, quote] of legacyQuotes) {
                    const legacy = projectContent(undefined, quote, true), prior = index[code];
                    index[code] = { text: [prior?.text, legacy.text].filter(Boolean).join(' '), representative: prior?.representative || legacy.representative };
                }
                timings.projectionProcessingMs=Math.round(Date.now()-processAt);
                return reply(index);
            }
            if (action === 'snapshot') {
                const keys = input.keys === undefined ? undefined : new Set(array(input.keys).map(key => text(key, 300)));
                if (keys && keys.size > 250) throw new Failure('Kayıt doğrulama sınırı aşıldı.',400);
                const deferFiles = !keys && input.deferProjectFiles === true;
                const filesKey = 'plmr.project.attachments.v10';
                const selectedUsers = users.filter(u => system || u.userId === actor.userId || u.memberships.some(m => allowed.some(c => c.companyId === m.companyId)));
                const provisioned = new Set([...base.users.map(u => u.userId), ...platformRows.filter(r => r.key.startsWith('@auth:')).map(r => r.value)]);
                const pinReady = (u: User) => provisioned.has(u.userId);
                const result: CloudSnapshotRow[] = [{ key: USERS, value: JSON.stringify(selectedUsers.map(u => system ? u : { ...u, memberships: u.memberships.filter(m => allowed.some(c => c.companyId === m.companyId)) })), version: usersRow.version }, { key: COMPANIES, value: JSON.stringify(allowed), version: companiesRow.version }, { key: CREDS, value: JSON.stringify(Object.fromEntries(selectedUsers.filter(pinReady).map(u => [u.userId, { version: 1 }]))), version: 0 }];
                for (const row of platformRows)
                    if (![USERS, COMPANIES, CREDS].includes(row.key) && !row.key.startsWith('@') && (system || row.key === 'plmr.help.shared.v73' || row.key === 'plmr.system.hardLimits.v13'))
                        result.push({ key: row.key, value: row.value as string | null, version: row.version });
                const splitIndexVersions:Record<string,IndexVersion[]>=Object.create(null);
                const normalizedProjectScopes:string[]=[];
                const companiesToLoad = !keys ? allowed : allowed.filter(c=>[...keys].some(key=>key.startsWith(`plmr.tenant.v68.${c.companyId}.`)));
                const snapshotScopes=companiesToLoad.map(c=>c.companyId);
                const projectEpochs=await db.projectEpochs?.(snapshotScopes);
                for (let i = 0; i < companiesToLoad.length; i += 3) {
                    const groups = await Promise.all(companiesToLoad.slice(i, i + 3).map(async ({companyId: cid}) => {
                        const prefix = `plmr.tenant.v68.${cid}.`;
                        const names = keys ? [...keys].filter(key=>key.startsWith(prefix)).map(key=>key.slice(prefix.length)) : undefined;
                        const selected = (scope:string, wanted:string[]) => !wanted.length ? Promise.resolve([]) : db.getMany ? db.getMany(scope,wanted) : Promise.all(wanted.map(key=>get(scope,key)));
                        const prefsScope=cid + ':prefs:' + actor.userId;
                        const indexKey='plmr.project.index.v11';
                        const split=(!names||names.includes(indexKey))&&db.splitIndex?await db.splitIndex(cid,input.compactProjects===true):null;
                        const [tenant,prefs]=await (names ? Promise.all([
                            selected(cid,names.filter(key=>!cloudPolicy(key).personal&&(!split||key!==indexKey))),
                            selected(prefsScope,names.filter(key=>cloudPolicy(key).personal)),
                        ]) : Promise.all([db.list(cid,deferFiles?filesKey:undefined,split?indexKey:undefined),db.list(prefsScope)]));
                        const rows: CloudSnapshotRow[] = [];
                        if(split){
                            if(split.normalized){
                                if(input.projectSummaries!==true)throw new Failure('PROJECT_INDEX_UPGRADE_REQUIRED',409);
                                normalizedProjectScopes.push(cid);
                            }
                            const projects=split.projects;
                            if((await Promise.all(cloudPolicy(indexKey).read.map(permission=>can(cid,permission)))).some(Boolean)){
                                const canViewTechnical=!split.normalized||await can(cid,'project.view');
                                const visibleProjects=(await Promise.all(projects.map(async item=>{
                                    const project=object(item.value);
                                    if(!canViewTechnical&&(!project.sourceQuickQuoteId||project.hasTechnicalDrawing))return null;
                                    return await visible(cid,project,'PROJECTS')?item:null;
                                })))
                                    .filter((item):item is IndexItem=>item!==null);
                                rows.push({key:prefix+indexKey,value:JSON.stringify(visibleProjects.map(item=>
                                    split.normalized?{...object(item.value),projectDetailsDeferred:true}:item.value)),version:split.version});
                                splitIndexVersions[cid]=visibleProjects.map(({id,version})=>({id,version}));
                            }
                        }
                        for (const row of tenant) {
                            if (deferFiles && row.key === filesKey) continue;
                            if (row.key==='plmr.project.index.v11' && (system || membership(cid)?.roleId==='COMPANY_ADMIN')) {
                                if ((await Promise.all(cloudPolicy(row.key).read.map(permission=>can(cid,permission)))).some(Boolean))
                                    rows.push({key:prefix+row.key,value:row.value as string|null,version:row.version});
                                continue;
                            }
                            const value = row.value === null ? null : await filter(cid, row.key, parse(row.value));
                            if (row.value === null || value !== null)
                                rows.push({ key: `plmr.tenant.v68.${cid}.${row.key}`, value: value === null ? null : JSON.stringify(value), version: row.version });
                        }
                        for (const row of prefs)
                            rows.push({ key: `plmr.tenant.v68.${cid}.${row.key}`, value: row.value as string | null, version: row.version });
                        return rows;
                    }));
                    for (const rows of groups) for (const row of rows) result.push(row);
                }
                const latestEpochs=await db.projectEpochs?.(snapshotScopes);
                if(snapshotScopes.some(cid=>projectEpochs?.[cid]!==latestEpochs?.[cid]))
                    throw new Failure('PROJECT_EPOCH_CHANGED',409);
                return reply({rows:keys?result.filter(row=>keys.has(row.key)):result,userId:actor.userId,projectEpochs,
                    projectIndexPatches:true,durableDrawingWrites:Boolean(db.drawingCommit&&db.drawingWriteState),splitIndexVersions,normalizedProjectScopes,
                    projectFileStorage:Boolean(db.projectFiles),...(deferFiles?{projectFilesDeferred:true}:{})});
            }
            if(action==='project_files_read'){
                const cid=text(input.companyId),key='plmr.project.attachments.v10';
                await requireAny(cid,['project.files.view']);
                const row=await get(cid,key);
                return reply({key:`plmr.tenant.v68.${cid}.${key}`,version:row.version,value:row.value===null?null:
                    JSON.stringify(await filter(cid,key,parse(row.value)))});

            }
            if(action==='project_master_detail'){
                actionLabel=action;
                const cid=text(input.companyId),id=integer(input.id);
                await requireAny(cid,cloudPolicy('plmr.project.index.v11').read);
                if(!db.masterProject)throw new Failure('INVALID_ACTION',400);
                const project=await db.masterProject(cid,id);
                if(!project||!await visible(cid,project.value))throw new Failure('Bu projeye erişim yetkiniz yok.');
                const detail=object(project.value);
                if(!detail.sourceQuickQuoteId||detail.hasTechnicalDrawing)await requireAny(cid,['project.view']);
                return reply(project);
            }
            if(action==='project_index_commit'||action==='project_master_commit'){
                actionLabel=action;
                const normalized=action==='project_master_commit';
                const cid=text(input.companyId),operation=operationId(input.operationId);
                await requireAny(cid,cloudPolicy('plmr.project.index.v11').write,true);
                const stateRead=normalized?db.masterState:db.splitIndexState;
                const commit=normalized?db.masterCommit:db.splitIndexCommit;
                if(!stateRead||!commit)throw new Failure('INVALID_ACTION',400);
                const entries=array(input.entries).map(value=>{
                    const row=object(value),id=integer(row.id);
                    if(row.value!==null&&(identity(row.value)!==String(id)||object(row.value).id!==id))
                        throw new Failure('Proje kimliği geçersiz.',400);
                    return {id,expectedVersion:integer(row.expectedVersion),value:row.value};
                });
                if(!entries.length||entries.length>250||new Set(entries.map(row=>row.id)).size!==entries.length)
                    throw new Failure('Proje değişiklik listesi geçersiz.',400);
                const details=normalized&&entries.some(row=>row.value!==null&&
                    ['revisions','productionPackages','pricing','approvals'].some(field=>Object.hasOwn(object(row.value),field)));
                const state=await stateRead.call(db,cid,entries.map(row=>row.id),actor.userId,operation,details);
                if(!state)throw new Failure('PROJECT_INDEX_MODE_CHANGED',409);
                if(!state.receipt){
                    const previous=new Map(state.projects?.map(row=>[row.id,row]));
                    let overviews:Map<string,Row>|undefined;
                    if(db.projectRowsForKeys&&entries.length>1){
                        const codes=entries.flatMap(row=>{
                            const before=previous.get(row.id)?.value as ProjectMaster|undefined;
                            const after=row.value as ProjectMaster|null;
                            return !before?.approvals&&!after?.approvals?[text((after??before)?.projKodu,200)]:[];
                        });
                        const chunks=[];
                        for(let i=0;i<codes.length;i+=128)chunks.push(codes.slice(i,i+128));
                        const rows=await Promise.all(chunks.map(keys=>db.projectRowsForKeys!(cid+':drawing.projects','overview',false,false,keys)));
                        overviews=new Map(rows.flat().map(row=>[row.key,row]));
                    }
                    for(let i=0;i<entries.length;i+=4)await Promise.all(entries.slice(i,i+4).map(async row=>{
                            const prior=previous.get(row.id);
                            if((prior?.version??0)!==row.expectedVersion)throw new Failure('VERSION_CONFLICT',409);
                            if(!prior?.value&&row.value===null)throw new Failure('Proje değişiklik listesi geçersiz.',400);
                            if(!await visible(cid,prior?.value??row.value,'PROJECTS'))throw new Failure('Bu projeye erişim yetkiniz yok.');
                            let candidate=row.value??undefined;
                            if(normalized&&candidate){
                                const next={...object(candidate)};
                                delete next.projectDetailsDeferred;delete next.packageRevisionIds;
                                for(const field of ['revisions','productionPackages','pricing','productionItems']){
                                    if(!Object.hasOwn(next,field)&&prior?.value&&Object.hasOwn(object(prior.value),field))
                                        next[field]=object(prior.value)[field];
                                }
                                if(next.pricing===null)delete next.pricing;
                                candidate=next;
                            }
                            await validateProjectIndexChange(cid,prior?.value??undefined,candidate,overviews);
                    }));
                }
                return reply({operationId:operation,projects:await commit.call(db,cid,actor.userId,operation,entries)});
            }
            if(action==='project_index_patch'){
                const cid=text(input.companyId),key='plmr.project.index.v11';
                const policy=cloudPolicy(key);
                await requireAny(cid,policy.write,true);
                const expected=integer(input.expectedVersion);
                const upserts=array(input.upserts), remove=array(input.remove).map(id=>String(integer(id)));
                const changes=new Map<string,unknown>();
                for(const project of upserts){
                    const id=String(integer(object(project).id));
                    if(changes.has(id)||identity(project)!==id)throw new Failure('Proje kimliği geçersiz veya tekrarlanıyor.',400);
                    changes.set(id,project);
                }
                for(const id of remove){
                    if(changes.has(id))throw new Failure('Proje değişiklik listesi geçersiz.',400);
                    changes.set(id,undefined);
                }
                const targeted=db.projectIndexState&&db.patchProjectIndex;
                const state=targeted?await db.projectIndexState!(cid,[...changes.keys()]):undefined;
                const oldRow=state?undefined:await get(cid,key);
                const currentVersion=state?.version??oldRow!.version;
                if(currentVersion!==expected)throw new Failure('VERSION_CONFLICT',409);
                if(!changes.size)return reply({version:currentVersion});
                const old=state?.projects??(oldRow!.value===null?[]:array(parse(oldRow!.value)));
                const before=new Map(old.map(project=>[identity(project),project]));
                if(remove.some(id=>!before.has(id)))throw new Failure('Proje değişiklik listesi geçersiz.',400);
                const touched=[...changes];
                for(let i=0;i<touched.length;i+=4)await Promise.all(touched.slice(i,i+4).map(async ([id,next])=>{
                    const prior=before.get(id);
                    if(!await visible(cid,prior??next,'PROJECTS'))throw new Failure('Bu projeye erişim yetkiniz yok.');
                    await validateProjectIndexChange(cid,prior,next);
                }));
                if(targeted)return reply({version:await db.patchProjectIndex!(cid,expected,upserts,remove)});
                const inserted=touched.filter(([id])=>!before.has(id)).map(([,project])=>project);
                const updated=old.flatMap(project=>{
                    const id=identity(project);
                    if(!changes.has(id))return [project];
                    const next=changes.get(id);
                    return next===undefined?[]:[next];
                });
                const saved=await db.cas(cid,key,JSON.stringify([...inserted,...updated]),expected,true);
                return reply({version:saved.version});
            }
            if (action === 'write') {
                const key = text(input.key), expected = integer(input.expectedVersion), rawValue = input.value === null ? null : text(input.value, 64 * 1024 * 1024);
                const versionOnly=input.versionOnly===true;
                const written=(row:Row)=>reply(input.versionOnly===true?{version:row.version}:row);
                if (key === CREDS || /credentials|auth\.attempts|clean-start/.test(key))
                    throw new Failure('CREDENTIAL_WRITE_FORBIDDEN');
                if (key === USERS) {
                    let proposed = array(parse(rawValue)).map(user);
                    if (!system) {
                        const cid = text(input.companyId);
                        accessible(cid, true);
                        const visibleUsers = users.filter(u => u.userId === actor.userId || u.memberships.some(m => allowed.some(c => c.companyId === m.companyId)));
                        if (visibleUsers.some(u => !proposed.some(p => p.userId === u.userId)))
                            throw new Failure('Kullanıcı silme yetkiniz yok.');
                        const merged = users.slice();
                        for (const next of proposed) {
                            const old = users.find(u => u.userId === next.userId);
                            const projected = old ? { ...old, memberships: old.memberships.filter(m => allowed.some(c => c.companyId === m.companyId)) } : null;
                            if (projected && same(projected, next))
                                continue;
                            if (next.roleId === 'SYSTEM_ADMIN' || old?.roleId === 'SYSTEM_ADMIN' || next.roleId !== 'VIEWER')
                                throw new Failure('System Admin hesabı korunmaktadır.');
                            await requireAny(cid, [old ? 'admin.users.edit' : 'admin.users.create'], true);
                            const changed = next.memberships.find(m => m.companyId === cid);
                            if (!changed || next.memberships.some(m => m.companyId !== cid && !same(m, old?.memberships.find(o => o.companyId === m.companyId))))
                                throw new Failure('Firmalar arası erişimi yalnız System Admin tanımlayabilir.');
                            if (old && !old.memberships.some(m => m.companyId === cid))
                                throw new Failure('Bu kullanıcıya erişim yetkiniz yok.');
                            if (!old && next.memberships.length !== 1)
                                throw new Failure('Firma seçimi geçersiz.');
                            if (membership(cid)?.roleId !== 'COMPANY_ADMIN' && (changed.roleId === 'COMPANY_ADMIN' || old?.memberships.find(m => m.companyId === cid)?.roleId === 'COMPANY_ADMIN'))
                                throw new Failure('Yönetici hesabı korunmaktadır.');
                            for (const [permission, value] of Object.entries(changed.permissionOverrides || {}))
                                if (value === 'ALLOW' && !await can(cid, permission as PermissionId))
                                    throw new Failure('Sahip olmadığınız yetkiyi veremezsiniz.');
                            if (old?.memberships.some(m => m.companyId !== cid) && !same({ ...old, memberships: null, updatedAt: null, updatedBy: null }, { ...next, memberships: null, updatedAt: null, updatedBy: null }))
                                throw new Failure('Ortak hesap bilgilerini yalnız System Admin düzenleyebilir.');
                            const saved = { ...next, memberships: old ? [...old.memberships.filter(m => m.companyId !== cid), changed] : [changed] };
                            if (old)
                                merged[merged.findIndex(u => u.userId === old.userId)] = saved;
                            else
                                merged.push(saved);
                        }
                        proposed = merged;
                    }
                    if (!proposed.some(u => u.roleId === 'SYSTEM_ADMIN' && u.status === 'ACTIVE'))
                        throw new Failure('Son aktif System Admin korunmalıdır.');
                    for (const old of users) {
                        const next = proposed.find(u => u.userId === old.userId);
                        if (next && next.username.toLowerCase() !== old.username.toLowerCase())
                            throw new Failure('Bulut hesabının kullanıcı adı değiştirilemez. Yeni hesap oluşturun.');
                    }
                    if (new Set(proposed.map(u => u.userId)).size !== proposed.length || new Set(proposed.map(u => u.username.toLowerCase())).size !== proposed.length)
                        throw new Failure('Kullanıcı adı kullanılıyor.', 400);
                    for (const c of companies)
                        if (proposed.filter(u => u.status === 'ACTIVE' && u.memberships.some(m => m.companyId === c.companyId && m.status === 'ACTIVE')).length > c.userLimit)
                            throw new Failure('Aktif kullanıcı limiti dolu.');
                    return written(await db.cas('platform', key, JSON.stringify(proposed), expected,versionOnly));
                }
                if (key === COMPANIES) {
                    const proposed = array(parse(rawValue)).map(company);
                    if (!system) {
                        if (proposed.length !== allowed.length)
                            throw new Failure('Firma listesi değiştirilemez.');
                        for (const c of proposed) {
                            await requireAny(c.companyId, ['admin.company_settings.edit'], true);
                            const old = companies.find(x => x.companyId === c.companyId);
                            if (!old || !same({ ...c, settings: null, updatedAt: null }, { ...old, settings: null, updatedAt: null }))
                                throw new Failure('Firma lisansı değiştirilemez.');
                        }
                    }
                    const merged = system ? proposed : companies.map(c => proposed.find(p => p.companyId === c.companyId) || c);
                    if (new Set(merged.map(c => c.companyId)).size !== merged.length || new Set(merged.map(c => c.code.toLowerCase())).size !== merged.length)
                        throw new Failure('Firma kodu kullanılıyor.', 400);
                    return written(await db.cas('platform', key, JSON.stringify(merged), expected,versionOnly));
                }
                if (!key.startsWith('plmr.tenant.')) {
                    if (!system)
                        throw new Failure('PLATFORM_ADMIN_REQUIRED');
                    if (key === 'plmr.platform.audit.v68')
                        return written(await db.appendAudit('platform', key, array(parse(rawValue)).filter(v => object(v).actorUserId === actor.userId)));
                    return written(await db.cas('platform', key, rawValue, expected,versionOnly));
                }
                const match = /^plmr\.tenant\.v68\.([^.]+)\.(.+)$/.exec(key);
                if (!match)
                    throw new Failure('INVALID_TENANT_KEY', 400);
                const cid = match[1], name = match[2], policy = cloudPolicy(name);
                await requireAny(cid, isMaterialCatalog(name)?['product.edit','product.create']:policy.write, true);
                if (name === 'plmr.audit.v13')
                    return written(await db.appendAudit(cid, name, array(parse(rawValue)).filter(v => object(v).actorUserId === actor.userId)));
                if (policy.personal)
                    return written(await db.cas(cid + ':prefs:' + actor.userId, name, rawValue, expected,versionOnly));
                const oldRow = await db.get(cid, name), old = oldRow.value === null ? null : parse(oldRow.value), next = parse(rawValue);
                let value = isMaterialCatalog(name)?await validateMaterials(db,cid,name,old,next,p=>can(cid,p)):next;
                if (name === 'plmr.project.attachments.v10') {
                    const index = await db.get(cid, 'plmr.project.index.v11');
                    const projects = array(index.value ? parse(index.value) : []);
                    const before = old ? array(old) : [], after = next ? array(next) : [];
                    for (const attachment of [...before, ...after]) {
                        const record = object(attachment);
                        if (same(before.find(v => identity(v) === identity(record)), after.find(v => identity(v) === identity(record)))) continue;
                        const parent = projects.find(v => { const p = object(v); return p.projectId === record.projectId || p.projKodu === record.projectId; });
                        if (!parent) continue;
                        const project = object(parent), packages = object(project.productionPackages || {});
                        const canonical=await get(cid+':drawing.projects',String(project.projKodu));
                        if((canonical.value as DrawingProjectRecord|null)?.workflow?.approvals?.package)
                            throw new Failure('Üretim paketi onaylandı. Proje dosyaları salt okunurdur.');
                        if (packages[String(project.revisionId)] || packages[String(record.revisionId)])
                            throw new Failure('Üretim paketi kaydedildi. Bu revizyonun dosyaları salt okunurdur.');
                    }
                }
                if (Array.isArray(next) && policy.family) {
                    value = await mergeVisible(cid, old ? array(old) : [], next, policy.family);
                    if (/project.index/.test(name)) {
                        const beforeById=new Map((old?array(old):[]).map(v=>[identity(v),v]));
                        const afterById=new Map(array(value).map(v=>[identity(v),v]));
                        if(afterById.size!==array(value).length)throw new Failure('Tekrarlanan proje kimliği.',400);
                        const changes=[...new Set([...beforeById.keys(),...afterById.keys()])]
                            .map(id=>[beforeById.get(id),afterById.get(id)] as const)
                            .filter(([before,after])=>!same(before,after));
                        for(let i=0;i<changes.length;i+=4)
                            await Promise.all(changes.slice(i,i+4).map(([before,after])=>validateProjectIndexChange(cid,before,after)));
                    }
                }
                if (name === 'plmr.task-reminder.v12' && next) {
                    const n = object(next), o = old ? object(old) : {};
                    value = { ...n, tasks: await mergeVisible(cid, array(o.tasks || []), array(n.tasks || []), 'OPERATIONS'), reminders: await mergeVisible(cid, array(o.reminders || []), array(n.reminders || []), 'OPERATIONS') };
                }
                if (name === 'plmr.cloud.library.meta.v12' && next) {
                    const n = object(next), o = old ? object(old) : {}, items = await mergeVisible(cid, array(o.items || []), array(n.items || []), 'PROJECTS'), visibleIds = new Set((await subset(cid, o.items || [], 'PROJECTS')).map(identity));
                    value = { ...n, items, versions: [...array(o.versions || []).filter(v => !visibleIds.has(String(object(v).itemId))), ...array(n.versions || [])] };
                }
                return written(await db.cas(cid, name, value === null ? null : JSON.stringify(value), expected,versionOnly));
            }
            if (action === 'set_pin') {
                const target = users.find(u => u.userId === text(input.userId)), pin = text(input.pin, 4);
                if (!target || !/^\d{4}$/.test(pin))
                    throw new Failure('PIN tam 4 rakamdan oluşmalıdır.', 400);
                if (!system) {
                    const cid = text(input.companyId);
                    await requireAny(cid, ['admin.users.edit'], true);
                    if (target.roleId === 'SYSTEM_ADMIN' || target.memberships.length !== 1 || target.memberships[0].companyId !== cid)
                        throw new Failure('Bu hesabın PIN’ini yalnız System Admin belirleyebilir.');
                }
                await db.setPin(principal, target, pin);
                return reply({ ok: true });
            }
            if (action === 'sequence') {
                const cid = text(input.companyId), key = text(input.key);
                await requireAny(cid, ['project.create', 'commercial.quote.create'], true);
                if (!/^plmr\.project\.sequence\.user\.\d{4}$/.test(key))
                    throw new Failure('INVALID_SEQUENCE', 400);
                return reply({ value: await db.sequence(cid + ':sequence', key, integer(input.minimum)) });
            }
            if (action === 'share_create') {
                const cid = text(input.companyId);
                await requireAny(cid, ['project.export']);
                return reply(await db.sharePut(principal, cid, validatePresentation(input.presentation)), 201);
            }
            if (action === 'continue_drawing') {
                const cid=text(input.companyId),key=text(input.key);
                await requireAny(cid,['project.edit'],true);
                await requireAny(cid,['project.revision.create'],true);
                const scope=cid+':drawing.projects',row=await db.get(scope,key);
                if(!row.value || !await visible(cid,row.value))throw new Failure('Bu projeye erişim yetkiniz yok.');
                const before=row.value as DrawingProjectRecord;
                if(!before.workflow || before.workflow.version!==integer(input.expectedWorkflowVersion))throw new Failure('Proje başka bir sekmede değişti. Güncel kaydı açın.',409);
                const next=continueDrawingRecord(before,text(input.revisionId),actor.userId);
                assertApprovedRecordUnchanged(before,next);
                const saved=await db.cas(scope,key,next,row.version,true);
                return reply({value:next,version:saved.version});
            }
            if(action==='project_overview') {
                const cid=text(input.companyId),key=text(input.key);
                await requireAny(cid,['project.view','commercial.quote.view']);
                const scope=cid+':drawing.projects';
                const row=await (db.overview?db.overview(scope,key):db.get(scope,key));
                if(row.value&&!await visible(cid,row.value))throw new Failure('Bu projeye erişim yetkiniz yok.');
                return reply(projectOverview(row.value as DrawingProjectRecord|null));
            }
            if(action==='drawing_workspace') {
                const cid=text(input.companyId),key=text(input.key);
                await requireAny(cid,['project.view','commercial.quote.view']);
                const scope=cid+':drawing.projects',known=input.knownVersion===undefined?undefined:integer(input.knownVersion);
                const canonical=async()=>{
                    if(known!==undefined&&db.header){
                        const header=await db.header(scope,key);
                        if(header.version===known)return {row:header,notModified:true};
                    }
                    return {row:await db.get(scope,key),notModified:false};
                };
                const [{row,notModified},draft]=await Promise.all([canonical(),db.get(cid+':drawing.drafts:'+actor.userId,key)]);
                if(row.value&&!await visible(cid,row.value))throw new Failure('Bu projeye erişim yetkiniz yok.');
                const current=row.value as DrawingProjectRecord|null,candidate=draft.value?object(draft.value):null;
                const recovery=current&&!current.workflow?.drawingLocked&&candidate&&Date.parse(String(candidate.expiresAt))>Date.now()&&await visible(cid,candidate)?candidate:null;
                return reply({record:notModified?{version:row.version,notModified:true}:row,recovery});
            }
            if(action==='stock_read'||action==='stock_move'){
                const cid=text(input.companyId),writing=action==='stock_move';
                await requireAny(cid,writing?['product.edit']:['product.view','operations.view'],writing);
                const scope=cid+':stock',key='ledger';
                if(!writing){
                    const row=await db.get(scope,key),state=(row.value||emptyStock()) as StockState;
                    return reply(input.balancesOnly===true?{balances:state.balances,movements:[]}:state);
                }
                const raw=object(input.command) as unknown as StockCommand;
                validateStockCommand(raw);
                const command:StockCommand={id:raw.id,direction:raw.direction,note:raw.note,lines:raw.lines.map(({kind,materialId,lengthMm,quantity})=>({kind,materialId,lengthMm,quantity}))};
                const kinds=[...new Set(command.lines.map(l=>l.kind))],keys=kinds.map(k=>stockCatalogKeys[k]);
                const [row,catalog]=await Promise.all([db.get(scope,key),db.getMany?db.getMany(cid,keys):Promise.all(keys.map(k=>get(cid,k)))]);
                const state=(row.value||emptyStock()) as StockState;
                if(existingStockMovement(state,command))return reply(state);
                const identities=new Map(kinds.map(kind=>{
                    const value=catalog.find(r=>r.key===stockCatalogKeys[kind])?.value;
                    const rows=value?(typeof value==='string'?array(parse(value)):array(value)):[];
                    return [kind,new Set(rows.map(m=>object(m)[kind+'Id']))];
                }));
                if(command.lines.some(line=>!identities.get(line.kind)?.has(line.materialId)))throw new Failure('Firma kataloğunda stok malzemesi bulunamadı.',400);
                const next=applyStockMovement(state,command,{id:actor.userId,name:actor.fullName},new Date().toISOString());
                await db.cas(scope,key,next,row.version,true);
                return reply(next);
            }
            if(action==='project_withdraw'){
                const cid=text(input.companyId),key=text(input.key),target=input.target;
                await requireAny(cid,['project.status.change'],true);
                if(target!==10&&target!==20&&target!==30&&target!==40)throw new Failure('Geri çekme aşaması geçersiz.',400);
                const scope=cid+':drawing.projects',row=await get(scope,key);
                if(!row.value||!await visible(cid,row.value))throw new Failure('Bu projeye erişim yetkiniz yok.');
                const before=row.value as DrawingProjectRecord;
                if(before.workflow?.version!==integer(input.expectedWorkflowVersion))throw new Failure('Proje başka bir sekmede değişti. Güncel kaydı açın.',409);
                const next=withdrawProjectRecord(before,target,actor.userId,text(input.note,2000));
                const saved=await db.cas(scope,key,next,row.version,true);
                return reply({value:next,version:saved.version});
            }
            if(action==='project_approve') {
                const cid=text(input.companyId),key=text(input.key),stage=approvalStage(input.stage);
                await requireAny(cid,[approvalPermissions[stage]],true);
                const scope=cid+':drawing.projects';
                const row=await get(scope,key);
                if(!row.value||!await visible(cid,row.value))throw new Failure('Bu projeye erişim yetkiniz yok.');
                const before=row.value as DrawingProjectRecord;
                if(!before.workflow||before.workflow.version!==integer(input.expectedWorkflowVersion))throw new Failure('Proje başka bir sekmede değişti. Güncel kaydı açın.',409);
                let document:SavedGiyotinProduction|undefined;
                if(stage==='package') {
                    const signature=drawingFingerprint(before);
                    if(input.sourceSignature!==signature)throw new Failure('Çizim değişti. Güncel kaydı açın.',409);
                    const revision=before.workflow.activeDrawingRevisionId;
                    if(revision&&before.workflow.lockedSignature===signature){
                        if(db.projectPackage)document=(await db.projectPackage(cid,key,revision))??undefined;
                        else{
                            const index=await get(cid,'plmr.project.index.v11');
                            const master=(index.value?array(parse(index.value)):[]).find(v=>object(v).projKodu===key) as ProjectMaster|undefined;
                            document=master?.productionPackages?.[revision];
                        }
                    }
                    document??=input.productionPackage as SavedGiyotinProduction|undefined;
                }
                const next=approveProjectRecord(before,stage,actor.userId,actor.fullName,document);
                assertApprovedRecordUnchanged(before,next,true);
                if(next===before)return reply({value:before,version:row.version});
                const saved=await db.cas(scope,key,next,row.version,true);
                return reply({value:next,version:saved.version});
            }
            if (action.startsWith('record_')) {
                const cid = text(input.companyId), store = text(input.store, 80), key = ['record_list', 'record_delete_many'].includes(action) ? '' : text(input.key);
                if (!['drawing.projects', 'drawing.drafts', 'drawing.meta', 'drawing.audit', 'quote.quotes', 'quote.captures', 'binary'].includes(store))
                    throw new Failure('INVALID_STORE', 400);
                const writing = action === 'record_put' || action === 'record_delete_many';
                await requireAny(cid, writing ? (store === 'binary' ? (action === 'record_delete_many' || input.value === null ? ['cloud.archive'] : ['cloud.upload', 'cloud.version.manage']) : ['project.edit', 'project.create', 'commercial.quote.create']) : (store === 'binary' ? ['cloud.download'] : ['project.view', 'commercial.quote.view']), writing);
                const scope = cid + ':' + store + (/drafts|meta/.test(store) ? ':' + actor.userId : '');
                const allowedRecord = async (v: unknown) => /projects|quotes|drafts|binary|captures/.test(store) ? visible(cid, v) : true;
                if (action === 'record_delete_many') {
                    if (store !== 'binary')
                        throw new Failure('INVALID_STORE', 400);
                    const items = array(input.items).map(v => { const o = object(v); return { key: text(o.key), version: integer(o.version) }; });
                    if (items.length > 500 || new Set(items.map(i => i.key)).size !== items.length)
                        throw new Failure('INVALID_BATCH', 400);
                    const rows=db.getMany?await db.getMany(scope,items.map(i=>i.key)):
                        await Promise.all(items.map(item=>db.get(scope,item.key)));
                    for (const row of rows) {
                        if (row.value !== null && !await allowedRecord(row.value))
                            throw new Failure('Bu dosyayı silme yetkiniz yok.');
                    }
                    await db.deleteMany(scope, items);
                    const paths=rows.flatMap(row=>{
                        const pointer=libraryPointer(row.value);
                        return pointer&&pointer.storagePath===encodeURIComponent(cid)+'/'+row.key+'/'+pointer.sha256?[pointer.storagePath]:[];
                    });
                    if(paths.length&&db.libraryObjects){
                        try{await db.libraryObjects.remove(paths);}
                        catch{console.warn(JSON.stringify({event:'plmr_library_cleanup_pending',requestId,objects:paths.length}));}
                    }
                    return reply({ ok: true });
                }
                if (action === 'record_list') {
                    const result = [];
                    for (const row of await db.list(scope))
                        if (row.value !== null && await allowedRecord(row.value))
                            result.push(row);
                    return reply(result);
                }
                if (action === 'record_get' && input.knownVersion !== undefined && db.header) {
                    const header = await db.header(scope, key);
                    if (header.value !== null && !await allowedRecord(header.value))
                        throw new Failure('Bu projeye erişim yetkiniz yok.');
                    if (header.version === integer(input.knownVersion)) return reply({ key, version: header.version, notModified: true });
                }
                // An expected version of zero cannot update an existing record:
                // the CAS also checks it under lock, including concurrent creates.
                const insertingDrawing = action === 'record_put' && store === 'drawing.projects' && input.expectedVersion === 0 &&
                    input.value && object(input.value).ownerUserId === actor.userId && object(input.value).createdByUserId === actor.userId;
                const operation=action==='record_put'&&store==='drawing.projects'&&input.operationId!==undefined
                    ?operationId(input.operationId):undefined;
                const retain=input.retainedHistory===undefined?undefined:array(input.retainedHistory).map(field=>text(field,24));
                if(retain&&(!operation||!db.compactDrawingCommit||new Set(retain).size!==retain.length||
                    retain.some(field=>!['drawings','quotes','withdrawnPackages'].includes(field))))
                    throw new Failure('INVALID_RETAINED_HISTORY',400);
                if(operation&&(!db.drawingWriteState||!db.drawingCommit))throw new Failure('INVALID_ACTION',400);
                const commitDrawing=()=>retain
                    ?db.compactDrawingCommit!(scope,key,actor.userId,operation!,integer(input.expectedVersion),input.value,retain)
                    :db.drawingCommit!(scope,key,actor.userId,operation!,integer(input.expectedVersion),input.value);
                const state=operation?await db.drawingWriteState!(scope,key,actor.userId,operation,Boolean(insertingDrawing),retain):undefined;
                if(state?.receipt)return reply({operationId:operation,...await commitDrawing()});
                const prior = state?.row??(insertingDrawing ? {key, value: null, version: 0} : await db.get(scope, key));
                if (prior.value !== null && !await allowedRecord(prior.value))
                    throw new Failure('Bu projeye erişim yetkiniz yok.');
                if (action === 'record_get')
                    return reply(prior);
                if (action !== 'record_put')
                    throw new Failure('INVALID_ACTION', 400);
                if(operation&&prior.version!==integer(input.expectedVersion))throw new Failure('VERSION_CONFLICT',409);
                let value = input.value;
                if(retain?.length){
                    const before=object(object(prior.value).workflow),next={...object(object(value).workflow)};
                    for(const field of retain){
                        if(Object.hasOwn(next,field))throw new Failure('INVALID_RETAINED_HISTORY',400);
                        if(Object.hasOwn(before,field))next[field]=before[field];
                    }
                    value={...object(value),workflow:next};
                }
                if(store==='drawing.projects')assertApprovedRecordUnchanged(prior.value as DrawingProjectRecord|null,value as DrawingProjectRecord|null);
                if(['drawing.drafts','quote.quotes','quote.captures'].includes(store)) {
                    const projectCode=String((value?object(value).projectCode:prior.value?object(prior.value).projectCode:'')||key);
                    const canonical=await get(cid+':drawing.projects',projectCode);
                    const a=(canonical.value as DrawingProjectRecord|null)?.workflow?.approvals;
                    if((['drawing.drafts','quote.captures'].includes(store)&&a?.package)||(store==='quote.quotes'&&a?.quote))throw new Failure('Onaylanmış belge salt okunurdur.');
                }
                if (value === null && ['drawing.projects', 'quote.quotes'].includes(store))
                    await requireAny(cid, ['project.archive'], true);
                if (value !== null && store === 'binary') {
                    if(libraryPointer(prior.value))throw new Failure('LIBRARY_FILE_IMMUTABLE',409);
                    const binary = object(value);
                    if (typeof binary.data !== 'string' || !/^data:[\w.+/-]*;base64,[A-Za-z0-9+/]*={0,2}$/.test(binary.data))
                        throw new Failure('Dosya içeriği geçersiz.', 400);
                }
                if (value !== null && /binary|captures/.test(store)) {
                    const r = object(value);
                    if (prior.value === null) {
                        if (r.ownerUserId !== actor.userId)
                            throw new Failure('Kayıt sahipliği geçersiz.');
                    }
                    else if (r.ownerUserId !== object(prior.value).ownerUserId)
                        throw new Failure('Kayıt sahipliği değiştirilemez.');
                }
                if (value !== null && /projects|quotes|drafts/.test(store)) {
                    const r = object(value);
                    if (store === 'drawing.projects' && r.projectCode !== key)
                        throw new Failure('INVALID_PROJECT_KEY', 400);
                    if (prior.value === null && !system && !await visible(cid, r))
                        throw new Failure('Kayıt sahipliği geçersiz.');
                    if (prior.value !== null) {
                        const before = object(prior.value);
                        if (before.ownerUserId && r.ownerUserId !== before.ownerUserId)
                            throw new Failure('Proje sahibi değiştirilemez.');
                        if (store === 'drawing.projects' && before.workflow) {
                            const oldWorkflow = object(before.workflow), newWorkflow = object(r.workflow);
                            for (const list of ['drawings', 'quotes']) {
                                if(retain?.includes(list))continue;
                                const revisions=new Map(array(newWorkflow[list]||[]).map(v=>[identity(v),v]));
                                for (const frozen of array(oldWorkflow[list] || [])) {
                                    const next = revisions.get(identity(frozen));
                                    if (!same(frozen, next))
                                        throw new Failure('Kaydedilmiş revizyon değiştirilemez.');
                                }
                            }
                            if (oldWorkflow.drawingLocked && drawingFingerprint(before as unknown as DrawingProjectRecord) !== drawingFingerprint(r as unknown as DrawingProjectRecord))
                                throw new Failure('Çizim kilitli. Önce Çizimi Düzenle işlemini kullanın.');
                        }
                    }
                }
                if(operation)return reply({operationId:operation,...await commitDrawing()});
                const saved = await db.cas(scope, key, value, integer(input.expectedVersion),input.versionOnly===true);
                return reply(input.versionOnly === true ? {version:saved.version} : saved);
            }
            throw new Failure('INVALID_ACTION', 400);
        }
        catch (e) {
            const err = e as Error;
            if(/PROJECT_EPOCH_CHANGED/.test(err.message))return reply({
                error:'Proje veri dönemi değişti. Eski taslak sunucuya gönderilmedi. Uygulamayı yeniden açın.',
                code:'PROJECT_EPOCH_CHANGED'
            },409);
            if(/PROJECT_MAINTENANCE/.test(err.message))return reply({error:'Proje bakım işlemi sürüyor.',code:'PROJECT_MAINTENANCE'},503);
            if(/PROJECT_FILE_STORAGE_UNAVAILABLE/.test(err.message))return reply({error:'Dosya deposu şu anda yanıt veremiyor.',code:'PROJECT_FILE_STORAGE_UNAVAILABLE'},503);
            if(/CATALOG_STORAGE_(UNAVAILABLE|NOT_INSTALLED)/.test(err.message))return reply({error:'Katalog görsel deposu şu anda yanıt veremiyor.',code:err.message},503);
            if(err.message==='PROJECT_FILES_READ_ONLY')return reply({error:'Bu revizyonun dosyaları salt okunurdur.',code:err.message},403);
            if(/PROJECT_INDEX_(UPGRADE_REQUIRED|MODE_CHANGED)/.test(err.message))
                return reply({error:'Proje kayıt biçimi değişti. Taslak korunuyor. Uygulamayı yeniden açın.',code:'PROJECT_INDEX_MODE_CHANGED'},409);
            if(/OPERATION_ID_REUSED/.test(err.message))return reply({error:'OPERATION_ID_REUSED'},409);
            if(/statement timeout/i.test(err.message))
                return reply({error:'Veritabanı işlemi zaman sınırını aştı.',code:'STATEMENT_TIMEOUT'},503);
            return reply({ error: err.message }, e instanceof Failure ? e.status : /VERSION_CONFLICT/.test(err.message) ? 409 : 400);
        }
    };
}
interface CloudSnapshotRow {
    key: string;
    value: string | null;
    version: number;
}
