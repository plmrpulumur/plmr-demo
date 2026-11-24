/* V17 identities, local zone directions and measurable product geometry. No second physical store. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PLMRV17Core = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const prefixes = Object.freeze({
      guillotine: 'GU',
      sliding: 'SL',
      balcony: 'FG',
      zip: 'ZS',
      folding: 'AG',
      fixed: 'FJ',
      door: 'DO',justveranda:'VR'
    }),
    pad = n => String(n).padStart(2, '0');
  function nextNumber(store, prefix, positions = []) {
    return Math.max(1, Number(store?.next?.[prefix]) || 1,
      ...Object.values(store?.items || {}).filter(e => e.code?.startsWith(prefix + '-')).map(e => Number(e.code.split('-')[1]) + 1),
      ...positions.filter(p => String(p.positionNo || '').startsWith(prefix + '-')).map(p => Number(String(p.positionNo).split('-')[1]) + 1));
  }
  function previewCode(model, type, positions = []) {
    const prefix = prefixes[type];
    if (!prefix) throw Error('Poz türü geçersiz.');
    return prefix + '-' + pad(nextNumber(model.codeRegistry, prefix, positions));
  }
  function codes(model, owners) {
    const store = model.codeRegistry || (model.codeRegistry = {
      next: {},
      items: {}
    });
    store.next = store.next || {};
    store.items = store.items || {};
    const live = new Set(),
      activeKeys = new Set();
    function assign(key, prefix, owner, candidate) {
      let entry = store.items[key],
        code = entry?.active === false && !candidate ? null : entry?.code;
      if (!code && candidate?.startsWith(prefix + '-') && Object.values(store.items).some(e => e.owner === owner && e.code === candidate) && !live.has(candidate)) code = candidate;
      if (!code || live.has(code)) {
        const n = nextNumber(store, prefix);
        code = prefix + '-' + pad(n);
        store.next[prefix] = n + 1;
      }
      store.items[key] = {
        code,
        owner,
        prefix,
        active: true
      };
      activeKeys.add(key);
      live.add(code);
      return code;
    }
    for (const o of owners) {
      o.spec.sceneEditor = o.spec.sceneEditor || {};
      o.spec.sceneEditor.bioCodes = {};
      for (const m of o.spec.freedomLayout?.modules || []) o.spec.sceneEditor.bioCodes[m.moduleIndex] = assign('BIO:' + o.id + ':' + m.moduleIndex, 'BIO', o.id);
      for (const [slot, placements] of [['primary', o.spec.placements], ['zip', o.spec.zipPlacements]]) for (const [id, p] of Object.entries(placements || {})) {
        const prefix = prefixes[p.type];
        if (prefix) p.positionCode = assign(prefix + ':' + o.id + ':' + slot + ':' + id, prefix, o.id, p.positionCode);
      }
    } // Standalone positions use the same project-wide namespace as mounted products.
    // Pergola facade placements share the existing project-wide namespace.
    for(const def of globalThis.PLMRRoofProducts?.definitions||[{id:'justpergola',stateKey:'justPergola'}]){
      const workspace=model.sceneEditor?.[def.stateKey],scene=workspace?.model?.workspaces?.standalone?.project;
      if(def.id==='justveranda'&&scene){
        const codes={};
        for(const p of globalThis.PLMRRoofProducts.descriptors({workspace},def.id)){
          const key='VR:'+p.key;
          if(typeof window!=='undefined'&&window.PLMRFinalReadOnly?.()){
            if(store.items[key]){activeKeys.add(key);live.add(store.items[key].code);codes[p.key]=store.items[key].code;}continue;
          }
          const candidate=scene.positionCodes?.[p.key];if(!store.items[key]&&/^VR-[0-9]{2,}$/.test(candidate||'')&&!live.has(candidate)&&!Object.values(store.items).some(e=>e.active!==false&&e.code===candidate))store.items[key]={code:candidate,owner:def.id,prefix:'VR',active:true};
          codes[p.key]=assign(key,'VR',def.id,candidate);
        }
        scene.positionCodes=codes;
      }
      const owners=[{id:'main',state:scene},...(scene?.copies||[]).map(c=>({id:c.id,state:c.input?.__pergolaScene}))];
      for(const owner of owners)for(const [zoneId,slots]of Object.entries(owner.state?.facadeProducts||{}))for(const [slot,placement]of Object.entries(slots)){
        const prefix=prefixes[placement.type];if(!prefix)continue;
        const key=prefix+':'+def.id+':'+(owner.id==='main'?'':owner.id+':')+slot+':'+zoneId;
        if(typeof window!=='undefined'&&window.PLMRFinalReadOnly?.()){
          if(store.items[key]){activeKeys.add(key);live.add(store.items[key].code);}continue;
        }
        placement.positionCode=assign(key,prefix,def.id,placement.positionCode);
      }
    }
    for (const [type, workspace] of Object.entries(model.sceneEditor?.nativeWorkspaces || {})) {
      const prefix = prefixes[type];
      if (!prefix) continue;
      for (const position of workspace.positions || []) {
        const key = 'native:' + type + ':' + position.id,
          candidate = String(position.positionNo || '');
        if (typeof window !== 'undefined' && window.PLMRFinalReadOnly?.()) {
          if (store.items[key]) {
            activeKeys.add(key);
            live.add(store.items[key].code);
          }
          continue;
        }
        if (!store.items[key] && new RegExp('^' + prefix + '-[0-9]{2,}$').test(candidate) && !live.has(candidate) && !Object.values(store.items).some(e => e.active !== false && e.code === candidate)) store.items[key] = {
          code: candidate,
          owner: 'native',
          prefix,
          active: true
        };
        position.positionNo = assign(key, prefix, 'native', candidate);
      }
    }
    for (const [key, entry] of Object.entries(store.items)) if (!activeKeys.has(key)) entry.active = false;
    return store;
  }
  function orient(z, layout, directions = {}) {
    const axis = z.axis === 'x' ? 'z' : 'x',
      coordinate = axis === 'z' ? z.cz : z.cx;
    let inward = Number(z.inward) || 1;
    if (!z.connection && z.group !== 'internal') {
      const ms = layout?.modules || [],
        along = z.axis === 'x' ? 'x' : 'z',
        u = along === 'x' ? z.cx : z.cz,
        near = ms.filter(m => {
          const c = along === 'x' ? m.centerX : m.centerZ,
            h = (along === 'x' ? m.outerWidth : m.depth) / 2;
          return u >= (c || 0) - h - .5 && u <= (c || 0) + h + .5;
        }).sort((a, b) => Math.abs((axis === 'z' ? a.centerZ : a.centerX) - coordinate) - Math.abs((axis === 'z' ? b.centerZ : b.centerX) - coordinate));
      if (near.length) {
        const delta = (axis === 'z' ? near[0].centerZ : near[0].centerX) - coordinate;
        if (Math.abs(delta) > .5) inward = Math.sign(delta);
      }
    }
    const value = directions[z.id] ?? directions[z.directionSourceId];
    return {
      ...z,
      defaultInward: inward,
      inward: value === 1 || value === -1 ? value : inward
    };
  }
  function profileSource(z) {
    return z.profileSourceId || z.facadeId || String(z.id).split('|')[0];
  }
  function editable(z, profiles) {
    const ps = profiles?.[profileSource(z)] || [];
    return {
      width: ps.some(p => p.orientation !== 'horizontal' && [z.leftBoundaryId, z.rightBoundaryId].includes(p.id)),
      height: ps.some(p => p.orientation === 'horizontal' && [z.topBoundaryId, z.bottomBoundaryId].includes(p.id))
    };
  }
  function optionsKeys() {
    return ['colorMode', 'systemColor', 'panelColor', 'panelColorIndependent', 'panelFill', 'roofOptions', 'motor', 'remote', 'led', 'dimmer', 'glassPreferences', 'waterStandard', 'waterOutletPlacement', 'triangleJoinery', 'extras', 'pergoOptions'];
  }
  function zonePoint(z, u, y) {
    let x = z.axis === 'x' ? z.cx + u : z.cx,
      t = z.axis === 'x' ? z.cz : z.cz + u;
    if (z.frameAngle) {
      const a = -z.frameAngle,
        cx = z.frameCenter.x,
        cz = z.frameCenter.z,
        dx = x - cx,
        dz = t - cz;
      x = cx + Math.cos(a) * dx - Math.sin(a) * dz;
      t = cz + Math.sin(a) * dx + Math.cos(a) * dz;
    }
    return [x, y, t];
  }
  function measureDefinitions(owners) {
    const out = [];
    for (const o of owners) for (const f of o.spec.sceneEditor?.facadeGraph || []) for (const z of f.zones || []) {
      if (!z.postBounded || z.boundaryKinds?.some(k => k !== 'post') || !z.boundaryKinds?.length || !(z.width > 0)) continue;
      const normal = z.axis === 'x' ? [0, 0, 1] : [1, 0, 0];
      const point = u => zonePoint(z, u, z.bottomY + z.height / 2);
      if (z.frameAngle) {
        const a = -z.frameAngle,
          x = normal[0],
          t = normal[2];
        normal[0] = Math.cos(a) * x - Math.sin(a) * t;
        normal[2] = Math.sin(a) * x + Math.cos(a) * t;
      }
      const index = z.moduleIndex || 0;
      out.push({
        owner: o.id,
        moduleIndex: index,
        id: o.id + '|zone:' + z.id + ':width',
        title: (o.spec.sceneEditor?.bioCodes?.[index] || 'BIO') + ' · Dikmeler arası genişlik',
        value: z.width,
        a: point(-z.width / 2),
        b: point(z.width / 2),
        normal,
        group: 'Dikmeler arası'
      });
    }
    return out;
  }
  return Object.freeze({
    prefixes,
    previewCode,
    codes,
    orient,
    profileSource,
    editable,
    optionsKeys,
    zonePoint,
    measureDefinitions
  });
});
