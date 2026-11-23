/* Validation at PLMR's existing model boundary; no project or auth store. */
(function(root){
  'use strict';
  const types=['Lean','Lean-Suspend','Lean-Wing','Lean-Quad','Curve','Curve-Suspend','Curve-Wing','Curve-Quad','Curve-Quad-Wing'];
  const clone=x=>JSON.parse(JSON.stringify(x));
  function validate(packet){
    if(!packet||typeof packet!=='object'||Array.isArray(packet)||JSON.stringify(packet).length>5*1024*1024)throw Error('Pergola çalışma verisi geçersiz veya çok büyük.');
    if(packet.workspace===null)return {workspace:null,view:{}};
    const w=packet.workspace,m=w?.model;
    if(w?.schema!=='plmr-justpergola-workspace-v1'||m?.schemaVersion!==3||!m.pergola||!types.includes(m.pergola.pergolaType)||!['Andes','Avila'].includes(m.pergola.series))throw Error('Pergola sürümü veya ürün tanımı desteklenmiyor.');
    if(m.pergola.railType!==(m.pergola.pergolaType.startsWith('Curve')?'Curved':'Linear'))throw Error('Pergola ray ailesi ürünle uyuşmuyor.');
    if(!Array.isArray(m.positions)||m.positions.length<1||m.positions.length>30)throw Error('Pergola poz sayısı geçersiz.');
    const ids=new Set();
    for(const p of m.positions){
      if(!p.id||ids.has(p.id))throw Error('Pergola poz kimliği geçersiz.');ids.add(p.id);
      for(const key of ['width','opening','rearHeight','frontHeight'])if(!Number.isFinite(p[key])||p[key]<=0||p[key]>1000000)throw Error('Pergola poz ölçüsü geçersiz: '+key);
    }
    if(!m.workspaces?.standalone||typeof m.frontView!=='object'||typeof m.sideViews!=='object')throw Error('Pergola fiziksel modeli eksik.');
    function check(value,depth=0){
      if(depth>60)throw Error('Pergola veri derinliği geçersiz.');
      if(value&&typeof value==='object')for(const [key,v]of Object.entries(value)){
        if(['__proto__','constructor','prototype'].includes(key)||typeof v==='number'&&!Number.isFinite(v))throw Error('Pergola veri alanı geçersiz.');check(v,depth+1);
      }
    }
    check(packet);return clone(packet);
  }
  function rows(packet){
    if(!packet?.workspace)return [];
    const {model:m}=validate(packet).workspace;
    return m.positions.map(p=>({kind:'roof',key:'justpergola:'+p.id,owner:'justpergola',moduleIndex:p.index,
      poz:'P'+String(p.index+1).padStart(2,'0'),name:m.pergola.series+' '+m.pergola.pergolaType,description:m.pergola.series+' '+m.pergola.pergolaType,productName:'Pergola',
      // Product identity is resolved by the shared commercial registry.
      referenceKey:'justpergola',
      width:p.width,depth:p.opening,height:p.frontHeight,quantity:1,
      color:m.drawingOptions?.structureColor,settings:{pergola:m.pergola,pergolaModel:m.pergola.series+' '+(m.pergola.railType==='Curved'?'Curve':'Lean'),systemColor:m.drawingOptions?.structureColor,surface:m.drawingOptions?.structureSurface,fabricProfileSurface:m.drawingOptions?.fabricProfileSurface,fabricProfiles:m.drawingOptions?.fabricProfiles},lines:[['Arka H',root.PLMRUnits.formatMeasurement(p.rearHeight,{mm:true})],['Ön H',root.PLMRUnits.formatMeasurement(p.frontHeight,{mm:true})],['Sistem rengi',m.drawingOptions?.structureColor||'—'],['Kumaş profili rengi',m.drawingOptions?.fabricProfiles||'—']]}));
  }
  root.PLMRJustPergolaContract=Object.freeze({validate,rows});
})(globalThis);
