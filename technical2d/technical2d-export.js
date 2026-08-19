(function (root) {
  'use strict';

  const VERSION = 'PLMR V.32';
  const MODEL_UNITS = 'mm';
  const MODEL_SCALE = 1;
  const LAYERS = Object.freeze({
    frame: 'T2D_FRAME',
    vertical: 'T2D_VERTICAL_PROFILE',
    horizontal: 'T2D_HORIZONTAL_PROFILE',
    panel: 'T2D_PANEL',
    product: 'T2D_PRODUCT',
    glass: 'T2D_GLASS',
    dimension: 'T2D_DIMENSION',
    text: 'T2D_TEXT'
  });
  const VIEW_ORDER = Object.freeze(['rear','top','left','front','right']);
  const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  function roleLayer(item) {
    const role = String(item && item.role || '').toLowerCase();
    if (item && item.type === 'dimension') return LAYERS.dimension;
    if (role.includes('product')) return role.includes('glass') || role.includes('fabric') ? LAYERS.glass : LAYERS.product;
    if (role === 'post' || (role.includes('divider-profile') && finite(item.height) >= finite(item.width))) return LAYERS.vertical;
    if (role.includes('divider-profile') && finite(item.width) > finite(item.height)) return LAYERS.horizontal;
    if (role.includes('panel')) return LAYERS.panel;
    if (role.includes('glass')) return LAYERS.glass;
    if (role.includes('profile') || role.includes('outline') || role.includes('boundary') || role.includes('envelope') || role.includes('module')) return LAYERS.frame;
    if (item && item.type === 'text') return LAYERS.text;
    return LAYERS.frame;
  }

  function include(bounds, x, y) {
    x = finite(x, NaN); y = finite(y, NaN); if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    bounds.minX = Math.min(bounds.minX, x); bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x); bounds.maxY = Math.max(bounds.maxY, y);
  }
  function itemBounds(view) {
    const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    if (view && view.bounds) { include(b, view.bounds.minX, view.bounds.minY); include(b, view.bounds.maxX, view.bounds.maxY); }
    (view && Array.isArray(view.entities) ? view.entities : []).forEach(item => {
      if (!item) return;
      if (item.type === 'rect') { include(b,item.x,item.y); include(b,finite(item.x)+finite(item.width),finite(item.y)+finite(item.height)); }
      else if (item.type === 'line') { include(b,item.x1,item.y1); include(b,item.x2,item.y2); }
      else if (item.type === 'text') include(b,item.x,item.y);
      else if (item.type === 'dimension') {
        if (item.axis === 'x') { include(b,item.start,item.offset); include(b,item.end,item.offset); }
        else { include(b,item.offset,item.start); include(b,item.offset,item.end); }
      }
    });
    if (!Number.isFinite(b.minX)) return { minX:0,minY:0,maxX:1,maxY:1,width:1,height:1 };
    b.width = Math.max(1,b.maxX-b.minX); b.height = Math.max(1,b.maxY-b.minY); return b;
  }

  function viewLayout(projection) {
    const views = VIEW_ORDER.map(id => (projection.views || []).find(v => v.id === id)).filter(Boolean);
    const map = new Map(views.map(v => [v.id,{ view:v, bounds:itemBounds(v) }]));
    const gap = Math.max(500, ...Array.from(map.values()).map(x => Math.max(x.bounds.width,x.bounds.height)*0.10));
    const rear = map.get('rear'), top = map.get('top'), left = map.get('left'), front = map.get('front'), right = map.get('right');
    const topW = top ? top.bounds.width : 1, rearW = rear ? rear.bounds.width : 1;
    const upperW = Math.max(topW,rearW);
    const lowerW = [left,front,right].filter(Boolean).reduce((s,x)=>s+x.bounds.width,0) + Math.max(0,[left,front,right].filter(Boolean).length-1)*gap;
    const totalW = Math.max(upperW,lowerW);
    let cursorY = 0;
    // DXF/model space uses +Y upward. Keeping Top at the lower Y band and Rear
    // in the next higher band makes the rendered CAD/PDF sheet match the native
    // Technical2D page where Rear is visually above Top.
    if (top) { top.tx = (totalW-top.bounds.width)/2 - top.bounds.minX; top.ty = cursorY - top.bounds.minY; cursorY += top.bounds.height + gap; }
    if (rear) { rear.tx = (totalW-rear.bounds.width)/2 - rear.bounds.minX; rear.ty = cursorY - rear.bounds.minY; cursorY += rear.bounds.height + gap*1.3; }
    let x = (totalW-lowerW)/2;
    [left,front,right].filter(Boolean).forEach(entry => { entry.tx=x-entry.bounds.minX; entry.ty=cursorY-entry.bounds.minY; x += entry.bounds.width+gap; });
    return { map, gap, totalW, totalH: cursorY + Math.max(1,...[left,front,right].filter(Boolean).map(e=>e.bounds.height)) };
  }

  function pushLine(entities, x1,y1,x2,y2,layer) {
    if (Math.abs(x1-x2)<1e-9 && Math.abs(y1-y2)<1e-9) return;
    entities.push({ type:'line', layer, color:256, x1,y1,x2,y2 });
  }
  function pushRect(entities, x,y,w,h,layer) {
    if (!(w>0 && h>0)) return;
    entities.push({ type:'polyline', layer, color:256, closed:true, points:[[x,y],[x+w,y],[x+w,y+h],[x,y+h]] });
  }
  function pushText(entities, x,y,value,layer,height,rotation,align) {
    const text = String(value == null ? '' : value); if (!text) return;
    entities.push({ type:'text', layer:layer||LAYERS.text, color:256, x,y,value:text,height:Math.max(35,finite(height,70)),rotation:finite(rotation,0),align:align||'center' });
  }
  function convertDimension(entities, item, view, tx, ty) {
    const tick = 45, layer = LAYERS.dimension, bounds=view.bounds||{};
    if (item.axis === 'x') {
      const x1=finite(item.start)+tx,x2=finite(item.end)+tx,y=finite(item.offset)+ty;
      const anchor=(finite(item.offset)<finite(bounds.minY)?finite(bounds.minY):finite(bounds.maxY))+ty;
      pushLine(entities,x1,anchor,x1,y,layer); pushLine(entities,x2,anchor,x2,y,layer); pushLine(entities,x1,y,x2,y,layer);
      pushLine(entities,x1,y-tick,x1,y+tick,layer); pushLine(entities,x2,y-tick,x2,y+tick,layer);
      pushText(entities,(x1+x2)/2,y+90,item.text,layer,70,0,'center');
    } else {
      const y1=finite(item.start)+ty,y2=finite(item.end)+ty,x=finite(item.offset)+tx;
      const anchor=(finite(item.offset)<finite(bounds.minX)?finite(bounds.minX):finite(bounds.maxX))+tx;
      pushLine(entities,anchor,y1,x,y1,layer); pushLine(entities,anchor,y2,x,y2,layer); pushLine(entities,x,y1,x,y2,layer);
      pushLine(entities,x-tick,y1,x+tick,y1,layer); pushLine(entities,x-tick,y2,x+tick,y2,layer);
      pushText(entities,x+90,(y1+y2)/2,item.text,layer,70,90,'center');
    }
  }

  function convertView(entities, entry) {
    const view=entry.view, tx=finite(entry.tx), ty=finite(entry.ty);
    pushText(entities,(entry.bounds.minX+entry.bounds.maxX)/2+tx,entry.bounds.maxY+ty+180,String(view.title||view.id).toUpperCase(),LAYERS.text,95,0,'center');
    (Array.isArray(view.entities)?view.entities:[]).forEach(item=>{
      if(!item)return; const layer=roleLayer(item);
      if(item.type==='rect') pushRect(entities,finite(item.x)+tx,finite(item.y)+ty,finite(item.width),finite(item.height),layer);
      else if(item.type==='line') pushLine(entities,finite(item.x1)+tx,finite(item.y1)+ty,finite(item.x2)+tx,finite(item.y2)+ty,layer);
      else if(item.type==='text') pushText(entities,finite(item.x)+tx,finite(item.y)+ty,item.text,layer,Math.max(45,entry.bounds.height*.015),0,'center');
      else if(item.type==='dimension') convertDimension(entities,item,view,tx,ty);
    });
  }

  function drawingBounds(entities) {
    const b={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};
    entities.forEach(e=>{
      if(e.type==='line'){include(b,e.x1,e.y1);include(b,e.x2,e.y2);} else if(e.type==='polyline')(e.points||[]).forEach(p=>include(b,p[0],p[1])); else if(e.type==='text')include(b,e.x,e.y);
    });
    if(!Number.isFinite(b.minX)) return {minX:0,minY:0,maxX:1,maxY:1,width:1,height:1};
    b.width=Math.max(1,b.maxX-b.minX);b.height=Math.max(1,b.maxY-b.minY);return b;
  }

  function toDrawing(projection, options) {
    if(!projection || projection.valid!==true || !Array.isArray(projection.views)) throw new Error('TECHNICAL2D_EXPORT_PROJECTION_INVALID');
    const layout=viewLayout(projection),entities=[];
    VIEW_ORDER.forEach(id=>{const entry=layout.map.get(id);if(entry)convertView(entities,entry);});
    const layers=Object.values(LAYERS);
    const layerStyle={
      [LAYERS.frame]:{aci:7,stroke:'#1f2937',width:1.2},[LAYERS.vertical]:{aci:6,stroke:'#b02bb0',width:1.3},[LAYERS.horizontal]:{aci:5,stroke:'#2563eb',width:1.3},
      [LAYERS.panel]:{aci:3,stroke:'#4d7c0f',width:1},[LAYERS.product]:{aci:1,stroke:'#c2410c',width:1},[LAYERS.glass]:{aci:4,stroke:'#0891b2',width:.8},
      [LAYERS.dimension]:{aci:42,stroke:'#d97706',width:.7},[LAYERS.text]:{aci:7,stroke:'#111827',width:.7}
    };
    const bounds=drawingBounds(entities);
    return { schema:'plmr-technical2d-export-drawing-v1', sourceSchema:projection.schema, productId:projection.productId, productGroup:projection.productGroup, productLabel:projection.productLabel, units:MODEL_UNITS, modelScale:MODEL_SCALE, layers, layerStyle, entities, blocks:{}, bounds, metadata:{ release:VERSION, generatedAt:new Date().toISOString(), canonical:true, modelUnits:MODEL_UNITS, modelScale:MODEL_SCALE, technicalViewScale:'COMMON_1_TO_1_MODEL_SPACE', ...(options||{}) } };
  }

  function assertMetricDrawing(drawing) {
    if (!drawing || drawing.units !== MODEL_UNITS || Number(drawing.modelScale) !== MODEL_SCALE) throw new Error('TECHNICAL2D_EXPORT_MODEL_UNITS_INVALID');
    return drawing;
  }

  function toDxf(projection, options) {
    const drawing=assertMetricDrawing(toDrawing(projection,options));
    const prepared=root.PulumurExportService && typeof root.PulumurExportService.prepareDrawing==='function' ? root.PulumurExportService.prepareDrawing(drawing) : drawing;
    if(!root.PulumurModernDXF || typeof root.PulumurModernDXF.toDxf!=='function') throw new Error('TECHNICAL2D_DXF_ENGINE_MISSING');
    return root.PulumurModernDXF.toDxf(prepared);
  }

  function safeFileName(projection, extension) {
    const base=String(projection && projection.productLabel || projection && projection.productId || 'technical-2d').toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'technical-2d';
    const input=projection && projection.summary && projection.summary.input || {};
    const dims=[input.width,input.depth,input.height].map(v=>String(v||'').replace(/[^0-9;:NO-]+/gi,'')).filter(Boolean).join('x');
    return `${base}${dims?'-'+dims:''}.${extension||'dxf'}`;
  }

  const api=Object.freeze({ VERSION, MODEL_UNITS, MODEL_SCALE, LAYERS, VIEW_ORDER, toDrawing, toDxf, assertMetricDrawing, safeFileName, itemBounds, viewLayout });
  root.PulumurTechnical2DExport=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
