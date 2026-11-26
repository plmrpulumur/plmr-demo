/* 10 mm closed panel; shared native geometry, renderer, document and forms. */
(function(root){
 'use strict';const G=root.PLMRReferenceGeometry;
 G.build=function(q,d=root.PLMR_PRODUCT){
  const m=G.start(q,d),layer=q.panelType==='SANDWICH_PANEL'?'Panel - Sandwich':'Panel - Levha';
  const inner=q.faceMode==='DIFFERENT'&&q.insideColor?root.PLMRRal.RAL_COLOR_CATALOG.find(r=>r.code===q.insideColor):null;
  if(q.faceMode==='DIFFERENT'&&(!inner||!q.insideColor))throw Error('İç yüzey rengini karteladan seçin.');
  G.box(m,'panel gövdesi',layer,0,0,q.width,q.height,{kind:'sheet',depth:9.8,z:-9.9});
  G.box(m,'dış yüzey',layer,0,0,q.width,q.height,{kind:'sheet',depth:.1,z:-.1,front:false,color:q.color});
  G.box(m,'iç yüzey',layer,0,0,q.width,q.height,{kind:'sheet',depth:.1,z:-10,front:false,color:inner?.hex||q.color});
  G.annotation(m,'position',q.width/2,q.height-60,55);
  m.metrics={panelThickness:10,panelType:q.panelType,insideColor:inner?.code||q.colorCode};return G.finish(m);
 };
})(window);
