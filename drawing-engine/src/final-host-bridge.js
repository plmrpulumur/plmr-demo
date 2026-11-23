/* Integration boundary only. V29 model, forms, geometry and motion remain owners. */
(function () {
    'use strict';
    const CHANNEL = 'plmr-final-v1', $ = id => document.getElementById(id), clone = x => JSON.parse(JSON.stringify(x));
    window.PLMRFinalReadOnly = () => readOnly;
    window.PLMRFinalCanShare = () => {
        if(initialized&&drawingLocked&&!previewOnly)return true;
        window.PLMRUnifiedDrawingWorkspaceV4?.notify('Paylaşım ve sahne seçimi için önce çizimi kilitleyin.');
        return false;
    };
    let session = '', initialized = false, readOnly = true, drawingLocked=false, last = '', suspended = false, info = {}, timer, active=true, previewOnly=false, motionCacheFailed=false, productList=false;
    const diagnostics = {phase:'boot'};window.PLMRFinalDiagnostics=diagnostics;
    const file = location.protocol === 'file:';
    const hostOrigin = file ? '*' : location.origin;
    const send = (type, payload = {}, requestId) => parent.postMessage({ channel: CHANNEL, session, type, payload, requestId }, hostOrigin);
    document.addEventListener("plmr:drawing-capture",event=>{if(initialized&&active)send("DRAWING_CAPTURE",event.detail);});
    window.PLMRProcess = {
        begin(label) {
            const id = crypto.randomUUID();
            if (session) send('PROCESS_START', {id, label});
            return { end() { if (session) send('PROCESS_END', {id}); } };
        }
    };
    document.addEventListener('plmr:presentation-mode',event=>{if(initialized&&typeof event.detail?.active==='boolean')send('PRESENTATION_STATE',{active:event.detail.active});});
    function viewer() { return $('viewerFrame')?.contentWindow; }
    const previewViewControls=new Map();
    function previewControls(){
      const toolbar=document.querySelector('.v33-toolbar-view');if(!toolbar)return;
      for(const id of ['toolbarArBtn','toolbarFullscreenBtn','rrV45ToolbarMessage']){
        const button=document.querySelector('[data-legacy-id="'+id+'"]')||document.getElementById(id);if(!button)continue;
        if(previewOnly){
          if(!previewViewControls.has(button))previewViewControls.set(button,{parent:button.parentNode,next:button.nextSibling,className:button.className});
          if(id!=='rrV45ToolbarMessage'){
            button.className='v33-tool '+(id==='toolbarArBtn'?'teal2':'light');
            button.classList.add('plmr-customer-view-tool');
            button.setAttribute('aria-label',id==='toolbarArBtn'?'AR · Gerçek Alan':'Tam Ekran');
          }
          toolbar.append(button);
        }else if(previewViewControls.has(button)){
          const {parent,next,className}=previewViewControls.get(button);button.className=className;
          parent.insertBefore(button,next?.parentNode===parent?next:null);previewViewControls.delete(button);
        }
      }
    }
    window.PLMRFinalProductList=()=>{
        if(!session||!initialized)return false;
        if(!active||!productList)return true;
        try{
            PLMRV24Host.placementRecovery.assertComplete();
            const parts=[...PLMRV16Commands.detailRows(),...(window.PLMRJustPergolaIntegration?.rows()||[])];
            send('PRODUCT_LIST',parts.map(({kind,poz,name,productName,width,depth,height,quantity,color,finish,description})=>
                ({kind,poz,name:productName||name,width,depth,height,quantity,color,finish,description})));
        }catch(error){send('ERROR',{message:error.message});}
        return true;
    };
    function ready() { return !!(window.PLMRV15Project && window.PLMRV24Host && window.PLMRUnifiedDrawingWorkspaceV4?.activateProduct && window.PLMRV24Workspace && window.PLMRV16Commands && viewer()?.PLMRV24StandaloneViewer && window.__P3DV_HOST_BRIDGE__?.runtimeDiagnostics().viewerReady && (window.PLMRJustPergolaIntegration?.ready()??true)); }
    function rows(nativeWorkspaces) {
        const source = PLMRV16Commands.detailRows();
        const frames = new Map(source.filter(row=>row.kind==='frame').map(row=>[row.owner+':'+row.moduleIndex,row]));
        const nativePositions = new Map();
        return source.map(row => {
            const {zone,placement,...r}=row;
            if (row.kind === 'native') {
                r.key = row.nativeId;
                r.referenceKey = row.nativeType;
                const w = nativeWorkspaces[row.nativeType];
                if(!nativePositions.has(row.nativeType))nativePositions.set(row.nativeType,new Map(w.positions.map(p=>[p.id,p])));
                const p=nativePositions.get(row.nativeType).get(row.nativeId);
                r.settings = w.settings;
                r.overrides = p.overrides || {};
            }
            else if (row.kind === 'roof') {
                r.key = row.owner + ':roof:' + row.moduleIndex;
                r.referenceKey = row.productId;
                const frame = frames.get(row.owner+':'+row.moduleIndex);
                r.width = frame.width;
                r.depth = frame.depth;
                r.height = frame.height;
                r.lines = [['Sistem Yüksekliği', frame.height + ' mm'], ...frame.lines, ...row.lines];
                r.settings = { systemColor: row.color, surface: row.finish };
            }
            else if (row.kind === 'facade') {
                if(row.placementStatus!=='unresolved')Object.assign(r,PLMRV24Native.row(zone,placement,{owner:row.owner,slot:row.slot,poz:row.poz}));
                r.key = row.owner + ':' + row.slot + ':' + row.zoneId;
                r.referenceKey = row.type;
                const provider = PLMRV24Native.provider(row.type);
                r.settings = { ...provider.model.common(), ...placement?.options };
                r.overrides = {};
            }
            else
                r.key = row.kind === 'frame' ? row.owner + ':frame:' + row.moduleIndex : 'wall:' + row.wallId;
            return r;
        });
    }
    function capture() {
        const activeViewer = viewer()?.PLMRV24StandaloneViewer;
        if (!activeViewer)
            throw Error('Çizim sahnesi hazırlanıyor.');
        window.PLMRJustPergolaIntegration?.flush();
        const snapshot = PLMRV15Project.capture();snapshot.runtimeMotion=activeViewer.runtimeMotion();
        delete snapshot.capturedAt;
        return { snapshot, rows: [...rows(snapshot.modelState.sceneEditor?.nativeWorkspaces||{}),...(window.PLMRJustPergolaIntegration?.rows({workspace:snapshot.modelState.sceneEditor?.justPergola||null,view:snapshot.modelState.sceneEditor?.sharedProductLayout?.justPergolaView||{}})||[])], mode: window.PLMRJustPergolaIntegration?.inspect().mode || activeViewer.drawingMode(), active: window.PLMRJustPergolaIntegration?.inspect().active ? 'justpergola' : PLMRV24Workspace.active() };
    }
    function publish(force = false) { if (!initialized || suspended || !active || !ready())
        return; try {
        const data = capture(), signature = JSON.stringify(data);
        if (force || signature !== last) {
            last = signature;
            send('CHANGE', data);
        }
    }
    catch (e) {
        send('ERROR', { message: e.message });
    } }
    function metadata(value) {
        info = clone(value || {});
        window.PLMRFinalMetadata = { projectInfo: info };
        window.PLMRJustPergolaIntegration?.updateMetadata(info);
        $('projectCodeValue').textContent = info.projectCode || '—';
        if ($('plmrProjectDate'))
            $('plmrProjectDate').textContent = info.createdAt || '';
        viewer()?.PLMRV24StandaloneViewer?.refreshDocument?.();
        // Only document fields; no geometry command and no competing customer database.
    }
    async function edit(key, settings = false) {
        const pergola=PLMRJustPergolaIntegration.rows().find(row=>row.key===key);
        if(pergola){
            PLMRUnifiedDrawingWorkspaceV4.activateProduct('justpergola');
            const end=Date.now()+30000;
            while(!PLMRJustPergolaIntegration.inspect().ready){if(Date.now()>end)throw Error('Pergola hazırlanamadı.');await new Promise(resolve=>setTimeout(resolve,50));}
            return PLMRJustPergolaIntegration.edit(pergola);
        }
        const row = PLMRV16Commands.detailRows().find(r => r.kind === 'native' ? r.nativeId === key : r.kind === 'roof' ? r.owner + ':roof:' + r.moduleIndex === key : r.kind === 'frame' ? r.owner + ':frame:' + r.moduleIndex === key : r.owner + ':' + r.slot + ':' + r.zoneId === key);
        if (!row)
            throw Error('Düzenlenecek ürün sahnede bulunamadı.');
        if (row.kind === 'native') {
            PLMRUnifiedDrawingWorkspaceV4.activateProduct(row.nativeType);
            if (settings)
                $('rrV45SettingsBtn').click();
            else
                PLMRV24Workspace.editPosition(row.nativeType, row.nativeId);
        }
        else if (row.kind === 'roof') {
            if (settings)
                PLMRV16Commands.openRoofChoice([{ owner: row.owner, moduleIndex: row.moduleIndex }]);
            else
                PLMRV12UI.editPosition(row.owner, row.moduleIndex);
        }
        else if (row.kind === 'frame')
            PLMRV12UI.editPosition(row.owner, row.moduleIndex);
        else if (row.kind === 'facade')
            PLMRV11Commands.editSelection([{ kind: 'facade', owner: row.owner, zoneId: row.zoneId, slot: row.slot, zone: row.zone }]);
    }
    function optionsFor(provider, value) {
        const options = provider.model.common();
        for (const key of provider.model.optionKeys)
            if (Object.prototype.hasOwnProperty.call(value || {}, key))
                options[key] = clone(value[key]);
        return options;
    }
    function overridesFor(provider, value) {
        const options = {};
        for (const [key, v] of Object.entries(value || {})) {
            if (!provider.model.optionKeys.includes(key))
                throw Error('Bilinmeyen poz ayarı: ' + key);
            options[key] = clone(v);
        }
        return options;
    }
    function legacy(input) {
        const before = PLMRV15Project.capture(), snapshot = clone(before), workspaces = {};
        for (const [name, ws] of Object.entries(input || {})) {
            if (!ws.positions?.length)
                continue;
            const type = { Giyotin: 'guillotine', 'Sürme': 'sliding' }[name];
            if (!type)
                throw Error('Eski çizimde desteklenmeyen ürün var: ' + name);
            const provider = PLMRV24Native.provider(type), w = provider.model.initial();
            w.settings = clone(ws.settings);
            w.positions = clone(ws.positions);
            w.drawingLayout = { ...w.drawingLayout, ...ws.drawingLayout };
            workspaces[type] = provider.model.validate(w);
        }
        if (!Object.keys(workspaces).length)
            return;
        const m = snapshot.modelState;
        m.width = m.height = m.depth = 0;
        m.sceneEditor = { ...m.sceneEditor, mainDeleted: true, roofCopies: [], nativeWorkspaces: workspaces };
        const first = Object.values(workspaces)[0];
        m.sceneEditor.sharedProductLayout = clone(first.drawingLayout);
        snapshot.v24ActiveProduct = Object.keys(workspaces)[0];
        PLMRV15Project.load(JSON.stringify({ schema: 'plmr-bioclimatic-project-v1', version: 1, snapshot }));
    }
    async function command(type, p) {
        if (type === 'INIT') {
            diagnostics.phase='init-wait';
            await waitReady();
            suspended = true;
            try {
                readOnly = !!p.readOnly;drawingLocked=p.drawingLocked===true;previewOnly=!!p.previewOnly;document.documentElement.classList.toggle('final-preview',previewOnly);document.documentElement.classList.toggle('plmr-customer-view',p.customerView===true);previewControls();
                diagnostics.phase='init-model';metadata(p.projectInfo);productList=p.productList===true;
                if (p.snapshot)
                    PLMRV15Project.load(JSON.stringify({ schema: 'plmr-bioclimatic-project-v1', version: 1, snapshot: p.snapshot }));
                else
                    legacy(p.workspaces);
                if(previewOnly&&!window.PLMRJustPergolaIntegration?.isActive()){
                    const dimensions=PLMRV11Commands.dimensions();
                    PLMRV24Host.setLayout({showDimensions:!!(dimensions.main||dimensions.intermediate)});
                }
                if (p.quoteRows?.length && PLMRV24Native.types.includes(p.referenceKey)) {
                    const provider = PLMRV24Native.provider(p.referenceKey), w = provider.model.initial(), first = p.quoteRows[0];
                    w.settings = optionsFor(provider, first.productOptions || first.finalRow?.settings || first.baseSettings || first.settings);
                    w.positions = p.quoteRows.map(row => ({ ...provider.model.position(row.positionNo), id: row.finalRow?.nativeId || row.sourceDrawingPositionId || row.id, positionNo: row.positionNo, width: provider.nativeV70 ? String(row.width) : Number(row.width), height: provider.nativeV70 ? String(row.height) : Number(row.height), quantity: provider.nativeV70 ? String(row.quantity) : Number(row.quantity), description: row.description || '', inputUnit:window.PLMRUnits.positionInputUnit(row.inputUnit,info.outputUnit||'inch'), overrides: overridesFor(provider, row.productOptions || row.overrides) }));
                    const snapshot = PLMRV15Project.capture(), m = snapshot.modelState;
                    m.width = 0;
                    m.height = 0;
                    m.placements = {};
                    m.zipPlacements = {};
                    m.sketchWalls = [];
                    m.sceneEditor = { ...m.sceneEditor, mainDeleted: true, roofCopies: [], nativeWorkspaces: { [p.referenceKey]: provider.model.validate(w) } };
                    PLMRV15Project.load(JSON.stringify({ schema: 'plmr-bioclimatic-project-v1', version: 1, snapshot }));
                }
                if (!p.snapshot && !Object.values(p.workspaces||{}).some(work=>work.positions?.length))PLMRV24Host.setLayout({dimensionUnits:window.PLMRUnits.displayUnitsFor('mm')});
                initialized = true;
                document.documentElement.classList.toggle('final-readonly', readOnly);
                diagnostics.phase='model-ready-wait';await waitReady();
                diagnostics.phase='restore-motion';
                const key=motionCacheKey();let cached=null;
                if(key)try{cached=JSON.parse(sessionStorage.getItem(key)||'null');}catch(e){motionCacheFailed=true;send('ERROR',{message:'Görünüm tercihi okunamadı; proje kaydı korunmuştur.'});}
                viewer().PLMRV24StandaloneViewer.restoreMotion(cached||p.snapshot?.runtimeMotion);
                window.PLMRZones?.setVisible(!readOnly);window.PLMRJustPergolaIntegration?.setZonesVisible(!readOnly);
                diagnostics.phase='initialized';protect();lockControls();
            }
            finally {
                suspended = false;
            }
            publish(true);
            return capture();
        }
        if (!initialized)
            throw Error('Çizim modülü henüz hazır değil.');
        if(type==='ACTIVE'){active=!!p.active;window.PLMRJustPergolaIntegration?.setRuntimeActive(active);window.__P3DV_HOST_BRIDGE__?.setRuntimeActive(active);viewer()?.postMessage({source:'product-3d-host',type:'plmr-workspace-active',active},'*');if(active){window.__P3DV_HOST_BRIDGE__?.resize();schedulePublish();}return true;}
        if (type === 'CAPTURE') {
            await waitReady();
            return capture();
        }
        if (type === 'METADATA') {
            metadata(p);
            return true;
        }
        if (type === 'READONLY') {
            readOnly = !!p.readOnly;drawingLocked=p.drawingLocked===true;
            window.PLMRUnifiedDrawingWorkspaceV4.closeToolbarMenus();
            window.PLMRZones?.setVisible(!readOnly);
            window.PLMRJustPergolaIntegration?.setZonesVisible(!readOnly);
            window.PLMRJustPergolaIntegration?.synchronize();
            document.documentElement.classList.toggle('final-readonly', readOnly);viewer()?.dispatchEvent(new CustomEvent('plmr-readonly',{detail:{readOnly}}));lockControls();
            return true;
        }
        if(type==='EXPORT'){
            await waitReady();
            if(window.PLMRJustPergolaIntegration?.isActive()&&!['PDF_3D','JPEG'].includes(p.format))return window.PLMRJustPergolaIntegration.exportData(p);
            await waitReady();PLMRV24Host.placementRecovery.assertComplete();const v=viewer().PLMRV24StandaloneViewer,L=PLMRV24Libraries;
            if(p.format==='JPEG')return PLMRV24Workspace.captureView();
            if(p.format==='PDF_2D'){
                const svg=v.svg();if(!svg)throw Error('Çizim pozu bulunmuyor.');
                return {bytes:await window.PLMRPdf.drawing(svg,p.paper)};
            }
            if(p.format==='PDF_3D'){
                const outputs=viewer().PLMRV24Viewer,camera=p.camera;
                if(camera&&(!['position','target','up'].every(key=>Array.isArray(camera[key])&&camera[key].length===3&&camera[key].every(Number.isFinite))||!(camera.fov>0&&camera.fov<180)))throw Error('3D kamera açısı geçersiz.');
                return {bytes:await PLMRV24Workspace.export3d(p.paper,[camera||outputs.cameraState()])};
            }
            if(p.format==='SVG')return {svg:v.svg()};throw Error('Çıktı biçimi tanımlı değil.');
        }
        if (type === 'VIEW') {
            if(window.PLMRJustPergolaIntegration?.inspect().active){window.PLMRJustPergolaIntegration.view(p);return true;}
            if (p.mode)
                PLMRV24Workspace.mode(p.mode);
            if (p.fit)
                viewer().PLMRV24StandaloneViewer.fit();
            if (p.unit)
                $({mm:'rrV45MmBtn',inch:'rrV45InchBtn',ft:'rrV45FeetBtn'}[p.unit]||'rrV45MmBtn').click();
            if (p.dimensions !== undefined) {
                PLMRV24Workspace.setDimensionsVisible(p.dimensions);
            }
            if (p.motion !== undefined)
                viewer().PLMRV24StandaloneViewer.commonMotion([], typeof p.motion==='number' ? {seek:Math.max(0,Math.min(1,p.motion))} : {target:p.motion});
            return true;
        }
        if (readOnly)
            throw Error('Çizim kilitli veya salt okunur. Önce Çizimi Düzenle işlemini kullanın.');
        if(type==='PLACEMENT_OPTIONS')return PLMRV24Host.placementRecovery.options(p.key);
        if(type==='PLACEMENT_RELOCATE'){PLMRV24Host.placementRecovery.relocate(p.key,p.target);publish(true);return capture();}
        if(type==='PLACEMENT_REMOVE'){PLMRV24Host.placementRecovery.remove(p.key);publish(true);return capture();}
        if (type === 'ACTIVATE') {
            const type = p.referenceKey==='justpergola'||p.referenceKey?.startsWith('justpergola:')?'justpergola':PLMRV24Native.types.includes(p.referenceKey)?p.referenceKey:'rolling-roof';
            PLMRUnifiedDrawingWorkspaceV4.activateProduct(type);
            return true;
        }
        if (type === 'EDIT') {
            await edit(p.key, p.settings);
            return true;
        }
        if (type === 'IMPORT_QUOTE') {
            const entries = p.rows;
            if (!Array.isArray(entries) || !entries.length)
                throw Error('Aktarılacak ürün bulunamadı.');
            const type = entries[0].referenceKey;
            if (entries.some(row => row.referenceKey !== type))
                throw Error('Tek işlemde aynı üründen pozlar seçin.');
            let links;
            if (PLMRV24Native.types.includes(type)) {
                const provider = PLMRV24Native.provider(type), w = PLMRV24Host.getWork(type), all = Object.values(PLMRV24Host.getState().sceneEditor.nativeWorkspaces || {}).flatMap(w => w.positions || []), used = new Set(all.map(p => p.positionNo));
                let sequence = 1;
                links = [];
                for (const row of entries) {
                    while (used.has('P' + String(sequence).padStart(2, '0')))
                        sequence++;
                    const no = 'P' + String(sequence++).padStart(2, '0');
                    used.add(no);
                    const position = { ...provider.model.position(no), id: crypto.randomUUID(), positionNo: no, width: provider.nativeV70 ? String(row.width) : Number(row.width), height: provider.nativeV70 ? String(row.height) : Number(row.height), quantity: provider.nativeV70 ? String(row.quantity) : Number(row.quantity), description: row.description || '', overrides: { ...optionsFor(provider, row.productOptions || row.settings), ...overridesFor(provider, row.overrides) } };
                    w.positions.push(position);
                    links.push({ product: row.product, drawingPositionId: position.id, quotePositionId: row.sourceQuotePositionId || row.id });
                }
                const validated = provider.model.validate(w);
                PLMRV24Host.setWork(type, validated);
                PLMRUnifiedDrawingWorkspaceV4.activateProduct(type);
            }
            else
                links = PLMRV24Host.importQuoteRoofs(entries);
            publish(true);
            return links;
        }
        if (type === 'IMPORT_LEGACY') {
            legacy(p.workspaces);
            publish(true);
            return true;
        }
        throw Error('Desteklenmeyen çizim komutu: ' + type);
    }
    let restoreGeneration=0;
    window.PLMRFinalRestoreMotion=value=>{
        const generation=++restoreGeneration;
        void waitReady().then(()=>{if(generation===restoreGeneration)viewer().PLMRV24StandaloneViewer.restoreMotion(value);}).catch(e=>send('ERROR',{message:e.message}));
    };
    async function waitReady() { const end = Date.now() + 45000; while (!ready()) {
        const failure=window.PLMRJustPergolaIntegration?.error();if(failure)throw failure;
        if (Date.now() > end)
            throw Error('Çizim sahnesi zamanında hazır olmadı.');
        await new Promise(r => setTimeout(r, 60));
    } }
    window.addEventListener('message', async (e) => {
        if (e.origin !== (file?'null':hostOrigin)) return;
        if (e.source !== parent || e.data?.channel !== CHANNEL)
            return;
        const msg = e.data;
        if (msg.type === 'CONNECT') {
            session = msg.session;
            const connectingSession = session;
            try {
                await waitReady();
                if (session === connectingSession) send('READY');
            } catch (error) {send('ERROR', {message: error.message});}
            return;
        }
        if (!session || msg.session !== session)
            return;
        const commandSession=session;
        try {
            const value = await command(msg.type, msg.payload || {});
            if(session!==commandSession)return;
            send('RESULT', { value }, msg.requestId);
        }
        catch (error) {
            if(session!==commandSession)return;
            send('RESULT', { error: error.message }, msg.requestId);
        }
    });
    const readonlyButtons = new Set(['toolbarArBtn','toolbarFullscreenBtn','rrV11ProductListPdfBtn','exportProductListPdfBtn','rrV45ProductionBtn','rrV11DimensionsBtnArrow','rrV15ProjectDownload','rrV45ValidateBtn','rrV45ColumnsSelect','rrV45Mode2DBtn', 'rrV45Mode3DBtn', 'rrV45Pdf2dBtn', 'rrV45Pdf3dBtn', 'rrV45DxfBtn', 'rrV45DaeBtn', 'rrV45FitBtn', 'rrV45MmBtn', 'rrV45InchBtn', 'rrV45FeetBtn', 'rrV11DimensionsBtn', 'rrV45CaptureBtn', 'rrV22ScenesBtn', 'rrV22ShareBtn', 'plmrProjectShare', 'v24Open', 'v24Close','v24ClearSelection']);
    const lockState=new WeakMap();
    const viewLegacy=new Set(['toolbarArBtn','toolbarZoomInBtn','toolbarZoomOutBtn','toolbarFitBtn','toolbarFullscreenBtn','toolboxResetCameraBtn','toolbarRefreshBtn']);
    function permitted(control){if(readOnly&&control.closest('#rrV45ZonesBtnMenu'))return false;return readonlyButtons.has(control.id)||control.closest('.rr-v11-filter-menu,.v36-pdf-formats,.v24-shot,#plmrSharedProducts')||control.closest('.plmr-animation-panel,.plmr-animation-share,.plmr-animation-player,.plmr-animation-window,.plmr-share-dialog')||viewLegacy.has(control.dataset.legacyId)||control.classList.contains('close');}
    function lockControls(){
        for(const b of document.querySelectorAll('#rrV45Workspace button,#rrV45Workspace select,#rrV45Workspace input')){
            if(b.id==='rrV45ProductionBtn'){b.disabled=false;b.removeAttribute('aria-disabled');b.title='Üretim Paketi Oluştur';continue;}
            if(permitted(b)||b.closest('#v24Player'))continue;
            if(readOnly){if(!lockState.has(b))lockState.set(b,b.disabled);b.dataset.finalLocked='true';b.setAttribute('aria-disabled','true');b.title='Düzenlemek için çizim kilidini kaldırın.';b.disabled=true;}
            else if(b.dataset.finalLocked){b.disabled=lockState.get(b)||false;lockState.delete(b);delete b.dataset.finalLocked;b.removeAttribute('aria-disabled');b.removeAttribute('title');}
        }
    }
    function motionCacheKey(){return info.projectCode?'plmr.view.motion.v2:'+info.projectCode+':'+String(info.revision||''):null;}
    function rememberMotion(){const key=motionCacheKey();if(!initialized||suspended||!ready()||!key||motionCacheFailed)return;try{sessionStorage.setItem(key,JSON.stringify(viewer().PLMRV24StandaloneViewer.runtimeMotion()));}catch(e){motionCacheFailed=true;send('ERROR',{message:'Görünüm tercihi saklanamadı; proje kaydı korunmuştur.'});}}
    let hint;
    document.addEventListener('pointerover',e=>{const b=e.target.closest('[data-final-locked]');if(!b)return;if(!hint){hint=document.createElement('div');hint.id='finalLockHint';hint.role='tooltip';document.body.append(hint);}hint.textContent='Düzenlemek için çizim kilidini kaldırın.';hint.hidden=false;const box=b.getBoundingClientRect();hint.style.left=Math.min(innerWidth-290,Math.max(8,box.left))+'px';hint.style.top=Math.min(innerHeight-50,box.bottom+7)+'px';},true);
    document.addEventListener('pointerout',()=>{if(hint)hint.hidden=true},true);
    function gate(e) { if (!readOnly)
        return; const b = e.target.closest('button'); if (!b)
        return; if (permitted(b))
        return; e.preventDefault(); e.stopImmediatePropagation(); }
    document.addEventListener('click', e => { if(e.target.closest('[data-toolbar-unavailable]')){e.preventDefault();e.stopImmediatePropagation();return;} if (e.target.closest('#rrV45ProductionBtn')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        try{send('PRODUCTION',capture());}catch(error){send('ERROR',{message:error.message});}
        return;
    } gate(e); }, true);
    document.addEventListener('keydown', e => { if (readOnly && (e.key === 'Delete' || e.key === 'Backspace' || (e.ctrlKey || e.metaKey) && ['z', 'y'].includes(e.key.toLowerCase()))) {
        e.preventDefault();
        e.stopImmediatePropagation();
    } }, true);
    // Source viewer is same document/srcdoc as V29. Its canvas keeps camera gestures.
    let protectedViewer = null;
    function protect() { const d = viewer()?.document; if (!d?.head) return;
        let style=d.getElementById('plmrFinalPreviewStyle');
        if(previewOnly&&!style){style=d.createElement('style');style.id='plmrFinalPreviewStyle';style.textContent='#v25CubeWrap,.v33-viewcube-wrap,#cubeWrap{display:none!important}';d.head.append(style);}
        if(!previewOnly&&style)style.remove();
        if(d===protectedViewer)return;protectedViewer=d; d.addEventListener('dblclick', e => { if (readOnly) {
        e.preventDefault();
        e.stopImmediatePropagation();
    } }, true); d.addEventListener('keydown', e => { if (readOnly && ['Delete', 'Backspace'].includes(e.key)) {
        e.preventDefault();
        e.stopImmediatePropagation();
    } }, true); }
    // Publish only after a model event. Idle scenes no longer serialize the entire project.
    let publishTimer;
    let publishGeneration=0;
    function schedulePublish(){const generation=++publishGeneration;clearTimeout(publishTimer);publishTimer=setTimeout(()=>{void waitReady().then(()=>{if(generation===publishGeneration)publish();}).catch(error=>send('ERROR',{message:error.message}));},250);}
    const changeEvents=['plmr-model-changed','plmr-project-loaded','plmr-v12-change','plmr-v24-native-change','plmr-v11-dimensions','plmr-v16-reset'];
    for(const event of changeEvents)document.addEventListener(event,schedulePublish);
    waitReady().then(() => { timer = setInterval(() => { if(active&&!document.hidden){protect();lockControls();rememberMotion();} }, 2000); send('BOOT'); }).catch(e => send('ERROR', { message: e.message }));
    window.addEventListener('pagehide', () => {clearInterval(timer);clearTimeout(publishTimer);for(const event of changeEvents)document.removeEventListener(event,schedulePublish);});
})();
