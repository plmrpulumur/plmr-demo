import type {DrawingCamera} from '../services/pdfRuntime';
import {runtimeUrl} from '../products/platform/runtimeAssetLoader'
import {beginOperation} from '../services/operationProgress'
import {Ui,t} from '../i18n/react'
import {useWorkspaceActive} from '../state/WorkspaceActivity'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { DrawingProductWorkspaceRecord } from '../services/drawingPersistence';
import { assertFinalScene, type FinalSceneData, type FinalSceneSnapshot } from '../domain/finalProcess';
import type {ProductListRow} from '../utils/drawingProductList';
export interface FinalSurfaceApi {
    capture: () => Promise<FinalSceneData>;
    command: (type: string, payload?: unknown) => Promise<unknown>;
}
interface Props {
    previewOnly?: boolean;
    onCapture?: (data:{dataUrl:string;width:number;height:number;camera?:DrawingCamera})=>void;
    quoteRows?: import('../domain/quickQuote').QuotePosition[];
    referenceKey?: string;
    snapshot?: FinalSceneSnapshot;
    workspaces?: Record<string, DrawingProductWorkspaceRecord>;
    projectInfo: unknown;
    readOnly: boolean;
    onChange?: (data: FinalSceneData) => void;
    onReady?: (ready: boolean) => void;
    onError?: (message: string) => void;
    onProduction?: (data: FinalSceneData) => void;
    onProductList?: (rows:ProductListRow[]) => Promise<void>;
}
const CHANNEL = 'plmr-final-v1';
/** A session-bound RPC boundary also works for file://, where iframe DOM access is forbidden. */
const FinalDrawingSurface = forwardRef<FinalSurfaceApi, Props>(function FinalDrawingSurface(props, ref) {
    const active = useWorkspaceActive();
    const activity = useRef(active); activity.current = active;
    const iframe = useRef<HTMLIFrameElement>(null), latest = useRef(props);
    latest.current = props;
    const session = useRef(crypto.randomUUID()), pending = useRef(new Map<string, {
        resolve: (v: any) => void;
        reject: (e: Error) => void;
        timer: ReturnType<typeof setTimeout>;
    }>());
    const nativeOperations = useRef(new Map<string, ReturnType<typeof beginOperation>>());
    const mounted = useRef(true);
    const connected = useRef(false), started = useRef(false), [ready, setReady] = useState(false), [error, setError] = useState('');
    function command(type: string, payload: unknown = {}) {
        const operation = ['ACTIVE','READONLY','METADATA','INIT','EDIT','ACTIVATE','PLACEMENT_OPTIONS'].includes(type) ? null : beginOperation('Çizim işlemi sürüyor…');
        return new Promise<any>((resolve, reject) => {
            if (!iframe.current?.contentWindow) {
                reject(Error('Çizim penceresi bulunamadı.'));
                return;
            }
            const requestId = crypto.randomUUID(), timer = setTimeout(() => { pending.current.delete(requestId); reject(Error('Çizim işlemi zamanında tamamlanmadı. Taslağınız korunuyor.')); }, 65000);
            pending.current.set(requestId, { resolve, reject, timer });
            iframe.current.contentWindow.postMessage({ channel: CHANNEL, session: session.current, type, payload, requestId }, '*');
        }).finally(() => operation?.end());
    }
    useImperativeHandle(ref, () => ({ capture: async () => { if (!connected.current)
            throw Error('Çizim henüz hazır değil.'); const data = await command('CAPTURE'); assertFinalScene(data.snapshot); return data; }, command }));
    function fail(message: string) { if (!mounted.current)
        return; setError(message); latest.current.onError?.(message); }
    useEffect(() => {
        let live = true;
        mounted.current = true;
        async function receive(e: MessageEvent) {
            if (e.source !== iframe.current?.contentWindow || e.data?.channel !== CHANNEL || e.data.session !== session.current)
                return;
            const { type, payload, requestId } = e.data;
            if (type === 'PROCESS_START' && typeof payload?.id === 'string' && typeof payload?.label === 'string') {
                nativeOperations.current.get(payload.id)?.end();
                if(activity.current&&connected.current) nativeOperations.current.set(payload.id, beginOperation(payload.label));
                return;
            }
            if (type === 'PROCESS_END') {
                nativeOperations.current.get(payload.id)?.end(); nativeOperations.current.delete(payload.id); return;
            }
            if (type === 'RESULT') {
                const request = pending.current.get(requestId);
                if (!request)
                    return;
                clearTimeout(request.timer);
                pending.current.delete(requestId);
                payload.error ? request.reject(Error(payload.error)) : request.resolve(payload.value);
                return;
            }
            if (type === 'READY' && !started.current) {
                started.current = true;
                try {
                    const p = latest.current;
                    const value = await command('INIT', { snapshot: p.snapshot, workspaces: p.workspaces, projectInfo: p.projectInfo, readOnly: p.readOnly, quoteRows: p.quoteRows, referenceKey: p.referenceKey,previewOnly:p.previewOnly,productList:!!p.onProductList });
                    if (live) {
                        connected.current = true;
                        setReady(true);
                        setError('');
                        p.onChange?.(value);
                        p.onReady?.(true);
                    }
                }
                catch (e) {
                    if (live)
                        fail((e as Error).message);
                }
                return;
            }
            if (type === 'CHANGE') {
                try {
                    assertFinalScene(payload.snapshot);
                    latest.current.onChange?.(payload);
                }
                catch (e) {
                    fail((e as Error).message);
                }
            }
            if (type === 'ERROR')
                fail(payload.message);
            if(type==='DRAWING_CAPTURE')latest.current.onCapture?.(payload);
            if (type === 'PRODUCTION')
                latest.current.onProduction?.(payload);
            if(type==='PRODUCT_LIST'&&activity.current&&connected.current&&latest.current.onProductList&&Array.isArray(payload)){
                if(nativeOperations.current.has('product-list'))return;
                const operation=beginOperation('Çıktı hazırlanıyor…');
                nativeOperations.current.set('product-list',operation);
                try{await latest.current.onProductList(payload);}
                catch(error){latest.current.onError?.(error instanceof Error?error.message:String(error));}
                finally{operation.end();nativeOperations.current.delete('product-list');}
            }
        }
        window.addEventListener('message', receive);
        const watchdog = setTimeout(() => { if (!connected.current) fail('Çizim motoru zamanında yüklenemedi. Sayfayı yeniden açıp tekrar deneyin.'); }, 70000);
        const connect = setInterval(() => { if (!started.current)
            iframe.current?.contentWindow?.postMessage({ channel: CHANNEL, session: session.current, type: 'CONNECT' }, '*'); }, 300);
        return () => { live = false; mounted.current = false; clearTimeout(watchdog); clearInterval(connect); window.removeEventListener('message', receive); connected.current = false; latest.current.onReady?.(false); for (const r of pending.current.values()) {
            clearTimeout(r.timer);
            r.reject(Error('Çizim penceresi kapandı.'));
        } pending.current.clear(); for (const op of nativeOperations.current.values()) op.end(); nativeOperations.current.clear(); };
    }, []);
    useEffect(() => { if (ready)
        void command('READONLY', { readOnly: props.readOnly }).catch(e => fail(e.message)); }, [ready, props.readOnly]);
    useEffect(() => { if(ready) void command('ACTIVE',{active}).catch(e=>fail(e.message)); },[ready,active]);
    useEffect(() => { if (ready)
        void command('METADATA', props.projectInfo).catch(e => fail(e.message)); }, [ready, props.projectInfo]);
    return <div className="final-drawing-surface" style={{ position: 'relative', height: '100%', minHeight: 0, flex: 1 }}>
 {!ready && <p role="status" style={{ position: 'absolute', inset: 0, margin: 0, display: 'grid', placeItems: 'center', zIndex: 2, background: '#f8fafc', color: '#475569', font: '600 12px Segoe UI,Arial' }}><Ui value={error || 'PLMR Çizim Motoru Yükleniyor'}/></p>}
 {ready && error && <div role="alert" style={{ position: 'absolute', top: 5, left: 10, zIndex: 2, background: '#fff', color: '#b91c1c' }}><Ui value={error}/></div>}
 <iframe ref={iframe} title={t("PLMR V34 Çizim Motoru")} src={runtimeUrl("./drawing-engine/embedded.html")} style={{ width: '100%', height: '100%', border: 0, display: 'block' }} allow="fullscreen; clipboard-write"/>
 </div>;
});
export default FinalDrawingSurface;
