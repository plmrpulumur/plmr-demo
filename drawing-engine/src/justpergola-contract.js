/* Validation at PLMR's existing model boundary; no project or auth store. */
(function(root){
  'use strict';
  const products=root.PLMRRoofProducts||(typeof module==='object'&&module.exports?require('./roof-products.js'):null);
  const types=['Lean','Lean-Suspend','Lean-Wing','Lean-Quad','Curve','Curve-Suspend','Curve-Wing','Curve-Quad','Curve-Quad-Wing'];
  const clone=x=>JSON.parse(JSON.stringify(x));
  function validate(packet,id='justpergola'){
    const def=products.definition(id),veranda=id==='justveranda';
    if(!packet||typeof packet!=='object'||Array.isArray(packet)||JSON.stringify(packet).length>5*1024*1024)throw Error(def.name+' çalışma verisi geçersiz veya çok büyük.');
    if(packet.workspace===null)return {workspace:null,view:{}};
    const w=packet.workspace,m=w?.model;
    if(w?.schema!==def.workspaceSchema||m?.schemaVersion!==3||!m.pergola||!(veranda?['Lean','Lean-Quad']:types).includes(m.pergola.pergolaType)||!['Andes','Avila'].includes(m.pergola.series))throw Error(def.name+' sürümü veya ürün tanımı desteklenmiyor.');
    if(m.workspaces?.standalone?.productId!==def.engineId)throw Error(def.name+' ürün kimliği uyuşmuyor.');
    if(m.pergola.railType!==(m.pergola.pergolaType.startsWith('Curve')?'Curved':'Linear'))throw Error(def.name+' ray ailesi ürünle uyuşmuyor.');
    if(!Array.isArray(m.positions)||m.positions.length<1||m.positions.length>30)throw Error(def.name+' poz sayısı geçersiz.');
    const ids=new Set();
    for(const p of m.positions){
      if(!p.id||ids.has(p.id))throw Error(def.name+' poz kimliği geçersiz.');ids.add(p.id);
      for(const key of ['width','opening','rearHeight','frontHeight'])if(!Number.isFinite(p[key])||p[key]<=0||p[key]>1000000)throw Error(def.name+' poz ölçüsü geçersiz: '+key);
    }
    if(!m.workspaces?.standalone||typeof m.frontView!=='object'||typeof m.sideViews!=='object')throw Error(def.name+' fiziksel modeli eksik.');
    function check(value,depth=0){
      if(depth>60)throw Error(def.name+' veri derinliği geçersiz.');
      if(value&&typeof value==='object')for(const [key,v]of Object.entries(value)){
        if(['__proto__','constructor','prototype'].includes(key)||typeof v==='number'&&!Number.isFinite(v))throw Error(def.name+' veri alanı geçersiz.');check(v,depth+1);
      }
    }
    check(packet);return clone(packet);
  }
  function rows(packet,id='justpergola'){
    if(!packet?.workspace)return [];
    const {model:m}=validate(packet,id).workspace;
    if(id==='justveranda'){
      const scene=m.workspaces.standalone.project||{};
      return products.descriptors(packet,id).map(p=>{
        // A copied assembly can have a different model, finish and glazing.
        // Project its own canonical input, never the main assembly's options.
        const options=p.sourceOwner==='roof-main'?m.drawingOptions:
          scene.copies.find(copy=>copy.id===p.sourceOwner)?.input;
        if(!options)throw Error('Veranda pozunun ayar kaynağı bulunamadı.');
        const settings={veranda:p.model,verandaModel:p.model.pergolaType,
          rearHeight:String(p.rearHeight),systemColor:options.structureColor,
          surface:options.structureSurface,
          glassType:({'Isıcam':'INSULATED','Tekcam':'SINGLE','Sandwich Panel':'SANDWICH_PANEL'})[options.glassType]||'INSULATED',
          glassColor:({'Şeffaf':'TRANSPARENT','Füme':'GREY','Bronz':'BRONZE','Low-e':'LOW-E GLASS','Diğer':'OTHER'})[options.glassColor]||'TRANSPARENT',
          glassColorOther:options.glassColorCustom,
          led:['YES','EVET'].includes(options.led)?'DAYLIGHT':!options.led||['-','NO','HAYIR'].includes(options.led)?'NO':String(options.led),
          dimmer:['YES','EVET'].includes(options.dimmer)?'EVET':'HAYIR'};
        return {kind:'roof',...p,poz:p.code||'',name:'Veranda '+p.name,
          description:'Veranda '+p.name,productName:'Veranda',quantity:1,
          lines:[['Model',p.name],['Arka H',root.PLMRUnits.formatMeasurement(p.rearHeight,{mm:true})],
            ['Ön H',root.PLMRUnits.formatMeasurement(p.height,{mm:true})],
            ['Sistem Rengi',options.structureColor||'—'],['Cam Tipi',options.glassType||'Isıcam'],
            ['Cam Rengi',options.glassColor||'Şeffaf']],color:options.structureColor,settings};
      });
    }
    return m.positions.map(p=>({kind:'roof',key:'justpergola:'+p.id,owner:'justpergola',moduleIndex:p.index,
      poz:'P'+String(p.index+1).padStart(2,'0'),name:m.pergola.series+' '+m.pergola.pergolaType,description:m.pergola.series+' '+m.pergola.pergolaType,productName:'Pergola',
      // Product identity is resolved by the shared commercial registry.
      referenceKey:'justpergola',
      width:p.width,depth:p.opening,height:p.frontHeight,quantity:1,
      color:m.drawingOptions?.structureColor,settings:{pergola:m.pergola,pergolaModel:m.pergola.series+' '+(m.pergola.railType==='Curved'?'Curve':'Lean'),systemColor:m.drawingOptions?.structureColor,surface:m.drawingOptions?.structureSurface,fabricProfileSurface:m.drawingOptions?.fabricProfileSurface,fabricProfiles:m.drawingOptions?.fabricProfiles},lines:[['Arka H',root.PLMRUnits.formatMeasurement(p.rearHeight,{mm:true})],['Ön H',root.PLMRUnits.formatMeasurement(p.frontHeight,{mm:true})],['Sistem rengi',m.drawingOptions?.structureColor||'—'],['Kumaş profili rengi',m.drawingOptions?.fabricProfiles||'—']]}));
  }
  root.PLMRRoofProductContract=Object.freeze({validate,rows});
  root.PLMRJustPergolaContract=Object.freeze({validate:packet=>validate(packet),rows:packet=>rows(packet)});
})(globalThis);
