import {inspectCatalogWebp} from './catalogWebp';
// V21 read adapter: batched platform lookup and JSONB projections.
// Native Auth, session/profile validation, PIN and share behavior are preserved.
import {createClient} from 'npm:@supabase/supabase-js@2.95.0';
import {createCloudHandler} from './handler';
import {createHash} from 'node:crypto';
import {projectFileBucket,type ProjectFileBackend} from './projectFiles';
import {libraryBucket} from './libraryFiles';
import Animation from '../drawing-engine/src/v22-animation-core.js';
import Project from '../drawing-engine/src/v15-core.js';

var url = Deno.env.get("SUPABASE_URL");
var secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
var anon = Deno.env.get("SUPABASE_ANON_KEY");
var admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
function checked(result) {
  if (result.error)
    throw Error(result.error.message);
  return result.data;
}
function storageBackend(fileObjects):Pick<ProjectFileBackend,'projectFileUpload'|'projectFileUrl'|'projectFileVerify'>{
return {
  async projectFileUpload(path){
    return checked(await fileObjects.createSignedUploadUrl(path,{upsert:false}));
  },
  async projectFileUrl(path,download){
    return checked(await fileObjects.createSignedUrl(path,60,download?{download}:undefined)).signedUrl;
  },
  async projectFileVerify(path,size,sha){
    const signed=await fileObjects.createSignedUrl(path,60);
    if(signed.error){
      if(/not found|404/i.test(signed.error.message))return false;
      checked(signed);
    }
    const response=await fetch(signed.data.signedUrl,{signal:AbortSignal.timeout(25000)});
    if(!response.ok||!response.body){
      await response.body?.cancel();
      if(response.status===404)return false;
      throw Error('PROJECT_FILE_STORAGE_UNAVAILABLE');
    }
    const reader=response.body.getReader(), digest=createHash('sha256');
    let bytes=0;
    try {
      for(;;){
        const {value,done}=await reader.read();
        if(done)break;
        bytes+=value.byteLength;
        if(bytes>size){await reader.cancel();return false;}
        digest.update(value);
      }
      return bytes===size&&digest.digest('hex')===sha;
    } finally { reader.releaseLock(); }
  },
};
}
function libraryBackend(admin){
  const objects=admin.storage.from(libraryBucket);
  return {...storageBackend(objects),
    sha256(bytes){return createHash('sha256').update(bytes).digest('hex');},
    async importLegacy(path,bytes,mime){
      const result=await objects.upload(path,bytes,{contentType:mime,upsert:false});
      if(result.error&&!/already exists|duplicate/i.test(result.error.message))checked(result);
    },
    async remove(paths){checked(await objects.remove(paths));}
  };
}
function fileBackend(admin):ProjectFileBackend {
const fileObjects=admin.storage.from(projectFileBucket);
const fileRows=()=>admin.from('plmr_v43_project_files');
return {
  async fileProject(scope,project){
    return checked(await admin.rpc('plmr_v43_file_project',{p_scope:scope,p_project:project}));
  },
  async fileOwners(scope,projects){
    return checked(await admin.rpc('plmr_v43_file_owners',{p_scope:scope,p_projects:projects}));
  },
  async searchFiles(scope,projects){
    let after:string|null=null;
    const files=[];
    for(;;){
      const page=checked(await admin.rpc('plmr_v43_file_search',{p_scope:scope,p_projects:projects,p_after:after}));
      files.push(...page.map(row=>row.metadata));
      if(page.length<128)return files;
      after=page.at(-1).id;
    }
  },
  async legacyProjectFiles(scope,project,id){
    return checked(await admin.rpc('plmr_v43_legacy_project_files',{p_scope:scope,p_project:project,p_id:id??null}));
  },
  async projectFileList(scope,project){
    const result=[];
    let after:string|undefined;
    for(;;){
      let query=fileRows().select('id,metadata').eq('scope',scope).eq('project_id',project)
        .in('metadata->>status',['active','deleted']).order('id').limit(100);
      if(after)query=query.gt('id',after);
      const rows=checked(await query);
      result.push(...rows.map(row=>row.metadata));
      if(rows.length<100)return result;
      after=rows.at(-1).id;
    }
  },
  async projectFileGet(scope,id){
    return checked(await fileRows().select('metadata,version').eq('scope',scope).eq('id',id).maybeSingle());
  },
  async projectFileInsert(scope,metadata){
    checked(await fileRows().upsert({scope,id:metadata.attachmentId,project_id:metadata.projectId,metadata},
      {onConflict:'scope,id',ignoreDuplicates:true}));
  },
  async projectFileUpdate(scope,before,metadata){
    const row=checked(await fileRows().update({metadata,version:before.version+1}).eq('scope',scope)
      .eq('id',metadata.attachmentId).eq('version',before.version).select('id').maybeSingle());
    if(!row)throw Error('VERSION_CONFLICT');
  },
  ...storageBackend(fileObjects),
  async projectFileCopy(from,to){ checked(await fileObjects.copy(from,to)); }
};}
async function allRows(table, fields, scope, excludeKey,excludeAlso) {
  const result = [];
  for (let from = 0; ; from += 1e3) {
    let query = admin.from(table).select(fields).range(from, from + 999);
    if (scope)
      query = query.eq("scope", scope);
    if (excludeKey) query = query.neq('key',excludeKey);
    if (excludeAlso) query = query.neq('key',excludeAlso);
    if (table === 'plmr_v12_records') query = query.order('key');
    const rows = checked(await query);
    result.push(...rows);
    if (rows.length < 1e3)
      return result;
  }
}
async function projectPage(scope,kind,commercial,legacy,key,after,limit){
  if(kind==='header'&&/:(drawing\.projects|quote\.quotes)$/.test(scope)){
    const rows=checked(await admin.rpc('plmr_v43_project_header_page',{p_scope:scope,p_key:key,p_after:after,p_limit:limit}));
    return rows.map(row=>({...row,version:Number(row.version)}));
  }
  const rows=checked(await admin.rpc('plmr_v40_project_rows',{
    p_scope:scope,p_kind:kind,p_commercial:commercial,p_legacy:legacy,p_key:key,p_after:after,p_limit:limit
  }));
  return rows.map(row=>({...row,version:Number(row.version)}));
}
Deno.serve(async (request) => {
  const projectEpoch=request.headers.get('x-plmr-project-epoch')||'0';
  const admin=createClient(url,secret,{global:{headers:{'x-plmr-project-epoch':projectEpoch,'x-plmr-project-protocol':'44'}},
    auth:{persistSession:false,autoRefreshToken:false}});
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""), userClient = createClient(url, anon, { global: { headers: { Authorization: "Bearer " + token } }, auth: { persistSession: false, autoRefreshToken: false } });
  const backend = {
    projectFiles:fileBackend(admin),
    libraryObjects:libraryBackend(admin),
    async projectEpochs(scopes){
      if(!scopes.length)return {};
      const rows=checked(await admin.from('plmr_v43_project_epoch').select('scope,epoch').in('scope',scopes));
      return Object.fromEntries(rows.map(row=>[row.scope,row.epoch]));
    },
    async authenticate() {
      if (!token)
        throw Error("Oturum gerekli.");
      const [auth,session] = await Promise.all([admin.auth.getUser(token),userClient.rpc("assert_current_session_v2")]);
      const result = checked(auth);
      if (!result.user)
        throw Error("Oturum ge\xE7ersiz.");
      checked(session);
      const profile = checked(await admin.from("profiles").select("role,is_active,organization_id").eq("id", result.user.id).single());
      return { id: result.user.id, profile };
    },
    async uploadCatalogMedia(cid,input) {
      const data=String(input.data||'');if(!data.startsWith('data:image/webp;base64,')||data.length>3*1024*1024)throw Error('INVALID_WEBP');
      const bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));
      const metadata=inspectCatalogWebp(bytes);if(input.encoding==='lossless'&&!metadata.lossless)throw Error('LOSSLESS_WEBP_REQUIRED');
      const id=crypto.randomUUID(),path=cid+'/'+id+'.webp',sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
      checked(await admin.storage.from('plmr-catalog-media').upload(path,bytes,{contentType:'image/webp',upsert:false}));
      return {fileName:String(input.fileName||'image.webp').slice(0,200),mimeType:'image/webp',sizeBytes:bytes.length,storage:{bucket:'plmr-catalog-media',path,id,companyId:cid,sha256:sha,width:512,height:512,encoding:metadata.lossless?'lossless':'photo'}};
    },
    async catalogMediaUrl(path){
      const result=await admin.storage.from('plmr-catalog-media').createSignedUrl(path,300);
      if(!result.error)return result.data.signedUrl;
      const error=result.error;
      if(Number(error.statusCode)===404||/^object not found$/i.test(error.message))return null;
      throw Error('CATALOG_STORAGE_UNAVAILABLE');
    },
    async directory() {
      const [profiles,organizations] = await Promise.all([
        allRows("profiles", "id,organization_id,full_name,username,email,role,is_active,user_code,created_at,updated_at"),
        allRows("organizations", "id,name,company_code,is_active,license_start,license_end,max_users,created_at,updated_at"),
      ]);
      const users = profiles.map((p, index) => {
        const names = String(p.full_name || p.username || "").split(" "), firstName = names.shift() || "", lastName = names.join(" ");
        return { userId: p.id, firstName, lastName, fullName: p.full_name || p.username || "", username: p.username || "", email: p.email || "", roleId: p.role === "system_admin" ? "SYSTEM_ADMIN" : "VIEWER", status: p.is_active ? "ACTIVE" : "INACTIVE", projectCodeUserNo: Number(p.user_code) || index + 1, memberships: p.organization_id && p.role !== "system_admin" ? [{ companyId: p.organization_id, roleId: p.role === "company_admin" ? "COMPANY_ADMIN" : "DESIGNER", status: p.is_active ? "ACTIVE" : "INACTIVE", permissionOverrides: {}, dataScopeOverrides: {} }] : [], permissionOverrides: {}, dataScopeOverrides: {}, createdAt: p.created_at, updatedAt: p.updated_at, createdBy: "CLOUD_IMPORT", updatedBy: "CLOUD_IMPORT" };
      });
      const companies = organizations.map((o) => ({ companyId: o.id, code: o.company_code || "PLMR", status: o.is_active ? "ACTIVE" : "INACTIVE", licenseStart: o.license_start || "2000-01-01", licenseEnd: o.license_end || "2099-12-31", userLimit: o.max_users, settings: { companyName: o.name, documentBrandName: o.name, address: "", phone: "", email: "", website: "", defaultLanguage: "TR", defaultCurrency: "TRY" }, createdAt: o.created_at, updatedAt: o.updated_at }));
      return { users, companies };
    },
    async get(scope, key) {
      if(scope.endsWith(':drawing.projects'))
        return checked(await admin.rpc('plmr_v44_drawing_get',{p_scope:scope,p_key:key}))||{key,value:null,version:0};
      if(key==='plmr.project.index.v11'){
        const split=await this.splitIndex(scope);
        if(split)return {key,version:split.version,value:JSON.stringify(split.projects.map(row=>row.value))};
      }
      return checked(await admin.from("plmr_v12_records").select("key,value,version").eq("scope", scope).eq("key", key).maybeSingle()) || { key, value: null, version: 0 };
    },
    async getMany(scope, keys) {
      return checked(await admin.from('plmr_v12_records').select('key,value,version').eq('scope', scope).in('key', keys));
    },
    async header(scope,key){
      return (await projectPage(scope,'header',false,false,key,null,1))[0]??{key,value:null,version:0};
    },
    async overview(scope,key){
      return (await projectPage(scope,'overview',false,false,key,null,1))[0]??{key,value:null,version:0};
    },
    async projectRowsForKeys(scope,kind,commercial,legacy,keys){
      const rows=checked(await admin.rpc('plmr_v45_project_rows_for_keys',{
        p_scope:scope,p_kind:kind,p_commercial:commercial,p_legacy:legacy,p_keys:keys
      }));
      return rows.map(row=>({...row,version:Number(row.version)}));
    },
    async unlinkedProjectHeaders(companyId){
      const result=[];
      let after=null;
      for(;;){
        const rows=checked(await admin.rpc('plmr_v45_unlinked_headers',{p_company:companyId,p_after:after}));
        result.push(...rows.map(row=>({...row,version:Number(row.version)})));
        if(rows.length<128)return result;
        after=rows.at(-1).key;
      }
    },
    async projectRows(scope,kind,commercial=false,legacy=false){
      const pageSize=128, result=[];
      let cursor=null;
      for(;;){
        const rows=await projectPage(scope,kind,commercial,legacy,null,cursor,pageSize);
        result.push(...rows);
        if(rows.length<pageSize)return result;
        cursor=rows.at(-1).key;
      }
    },
    async projectPackage(scope,code,revision){
      return checked(await admin.rpc('plmr_v41_index_package',{p_scope:scope,p_code:code,p_revision:revision}));
    },
    async projectIndexState(scope,ids){
      return checked(await admin.rpc('plmr_v41_legacy_index_state',{p_scope:scope,p_ids:ids}));
    },
    async patchProjectIndex(scope,expected,upserts,remove){
      return Number(checked(await admin.rpc('plmr_v40_project_index_patch',{
        p_scope:scope,p_expected:expected,p_upserts:upserts,p_remove:remove
      })));
    },
    async splitIndex(scope,compact=false){
      return checked(await admin.rpc(compact?'plmr_v46_compact_index':'plmr_v44_index_snapshot',{p_scope:scope}));
    },
    async productionPage(company,actor,projects,operations,technical,query,offset,limit,includeItems,id,facets){
      return checked(await admin.rpc('plmr_v46_production_page',{
        p_company:company,p_actor:actor,p_projects:projects,p_operations:operations,p_technical:technical,
        p_query:query,p_offset:offset,p_limit:limit,p_include_items:includeItems,p_id:id,p_facets:facets
      }));
    },
    async masterProject(scope,id){
      return checked(await admin.rpc('plmr_v44_index_project',{p_scope:scope,p_code:'',p_id:id}));
    },
    async masterOwner(scope,reference){
      return checked(await admin.rpc('plmr_v44_index_owner',{p_scope:scope,p_reference:reference}));
    },
    async masterState(scope,ids,actor,operation,details){
      return checked(await admin.rpc('plmr_v44_index_state',{p_scope:scope,p_ids:ids,p_actor:actor,p_operation:operation,p_details:details}));
    },
    async masterCommit(scope,actor,operation,entries){
      return checked(await admin.rpc('plmr_v44_index_commit',{p_scope:scope,p_actor:actor,p_operation:operation,p_entries:entries}));
    },
    async splitIndexState(scope,ids,actor,operation){
      return checked(await admin.rpc('plmr_v41_index_state',{p_scope:scope,p_ids:ids,p_actor:actor,p_operation:operation}));
    },
    async splitIndexCommit(scope,actor,operation,entries){
      return checked(await admin.rpc('plmr_v41_index_commit',{p_scope:scope,p_actor:actor,p_operation:operation,p_entries:entries}));
    },
    async drawingWriteState(scope,key,actor,operation,inserting,retain=[]){
      return checked(await admin.rpc('plmr_v44_drawing_state',{
        p_scope:scope,p_key:key,p_actor:actor,p_operation:operation,p_insert:inserting,p_ignore:retain
      }));
    },
    async drawingCommit(scope,key,actor,operation,expected,value){
      return checked(await admin.rpc('plmr_v41_drawing_commit',{
        p_scope:scope,p_key:key,p_actor:actor,p_operation:operation,p_expected:expected,p_value:value
      }));
    },
    async compactDrawingCommit(scope,key,actor,operation,expected,value,retain){
      return checked(await admin.rpc('plmr_v44_drawing_commit',{
        p_scope:scope,p_key:key,p_actor:actor,p_operation:operation,p_expected:expected,p_value:value,p_retained:retain
      }));
    },
    async list(scope, excludeKey,excludeAlso) {
      if(scope.endsWith(':drawing.projects')){
        const rows=[];
        let after=null;
        for(;;){
          const page=checked(await admin.rpc('plmr_v44_drawing_page',{p_scope:scope,p_after:after}));
          rows.push(...page);
          if(page.length<24)return rows;
          after=page.at(-1).key;
        }
      }
      return await allRows("plmr_v12_records", "key,value,version", scope, excludeKey,excludeAlso);
    },
    async cas(scope,key,value,expected,versionOnly=false){
      const args={p_scope:scope,p_key:key,p_value:value,p_expected:expected};
      if(!versionOnly)return checked(await admin.rpc('plmr_v12_cas',args));
      const version=checked(await admin.rpc(scope.endsWith(':drawing.projects')?'plmr_v44_drawing_cas':'plmr_v40_cas_version',args));
      return {key,value:null,version:Number(version)};
    },
    async deleteMany(scope, items) {
      checked(await admin.rpc("plmr_v12_delete_many", { p_scope: scope, p_items: items }));
    },
    async appendAudit(scope, key, events) {
      return checked(await admin.rpc("plmr_v12_append_audit", { p_scope: scope, p_key: key, p_events: events }));
    },
    async sequence(scope, key, minimum) {
      return checked(await admin.rpc("plmr_v12_sequence", { p_scope: scope, p_key: key, p_minimum: minimum }));
    },
    async setPin(actor2, user2, pin) {
      const mapping = checked(await admin.from("plmr_v12_records").select("key").eq("scope", "platform").eq("value", JSON.stringify(user2.userId)).like("key", "@auth:%").maybeSingle()), nativeId = mapping?.key.slice(6) || user2.userId;
      const existing = checked(await admin.from("profiles").select("id,username").eq("id", nativeId).maybeSingle());
      let body;
      if (existing) {
        if (existing.username !== user2.username.toLowerCase())
          checked(await admin.from("profiles").update({ username: user2.username.toLowerCase() }).eq("id", nativeId));
        body = { action: "set_pin", userId: nativeId, pin };
      } else {
        if (user2.roleId === "SYSTEM_ADMIN") {
          if (actor2.profile.role !== "system_admin")
            throw Error("System Admin gerekli.");
          const pepper = Deno.env.get("PLMR_PIN_PEPPER");
          if (!pepper)
            throw Error("PIN_PEPPER_MISSING");
          const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${pepper}|${user2.username.toLowerCase()}|${pin}`));
          const password = "P!" + Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(""), email = `plmr.${crypto.randomUUID().replaceAll("-", "")}@auth.pulumur.app`;
          const created = checked(await admin.auth.admin.createUser({ email, password, email_confirm: true }));
          if (!created.user)
            throw Error("Bulut hesab\u0131 olu\u015Fturulamad\u0131.");
          try {
            checked(await admin.from("profiles").upsert({ id: created.user.id, username: user2.username.toLowerCase(), email, full_name: user2.fullName, role: "system_admin", organization_id: null, is_active: user2.status === "ACTIVE", user_code: String(user2.projectCodeUserNo).padStart(4, "0") }));
            await this.cas("platform", "@auth:" + created.user.id, user2.userId, 0);
          } catch (error) {
            const cleanup = await admin.auth.admin.deleteUser(created.user.id);
            if (cleanup.error)
              throw Error("Yeni hesap kurulumu tamamlanamad\u0131; y\xF6netimden kontrol edin.");
            throw error;
          }
          return;
        }
        const member = user2.memberships[0];
        if (!member)
          throw Error("Firma se\xE7in.");
        body = { action: "create", organizationId: member.companyId, fullName: user2.fullName, username: user2.username.toLowerCase(), pin, role: member.roleId === "COMPANY_ADMIN" ? "company_admin" : "designer", language: "tr" };
      }
      const response = await fetch(url + "/functions/v1/admin-users", { method: "POST", headers: { Authorization: "Bearer " + token, apikey: anon, "Content-Type": "application/json" }, body: JSON.stringify(body) }), result = await response.json();
      if (!response.ok)
        throw Error(result.error || "PIN belirlenemedi.");
      if (!existing) {
        const id = result.user?.id;
        if (!id)
          throw Error("Bulut hesab\u0131 yan\u0131t\u0131 ge\xE7ersiz.");
        await this.cas("platform", "@auth:" + id, user2.userId, 0);
      }
    },
    async shareGet(id) {
      const result = checked(await admin.from("plmr_v12_presentations").select("presentation,expires_at").eq("id", id).gt("expires_at", (/* @__PURE__ */ new Date()).toISOString()).maybeSingle());
      return result ? { presentation: Animation.validate(result.presentation, Project), expiresAt: result.expires_at } : null;
    },
    async sharePut(owner, cid, presentation) {
      const count = await admin.from("plmr_v12_presentations").select("id", { count: "exact", head: true }).eq("owner_id", owner.id).gte("created_at", new Date(Date.now() - 36e5).toISOString());
      if (count.error)
        throw Error(count.error.message);
      if ((count.count || 0) >= 100)
        throw Error("Payla\u015F\u0131m s\u0131n\u0131r\u0131na ula\u015F\u0131ld\u0131. Daha sonra tekrar deneyin.");
      const id = crypto.randomUUID().replace(/-/g, ""), expiresAt = new Date(Date.now() + 30 * 864e5).toISOString();
      checked(await admin.from("plmr_v12_presentations").insert({ id, owner_id: owner.id, company_id: cid, presentation, expires_at: expiresAt }));
      return { id, expiresAt };
    }
  };
  return createCloudHandler(backend, (value) => Animation.validate(value, Project))(request);
});
