/* Identities and physical position descriptors for the existing roof controller.
   No renderer, project store, pricing table or alternate save mechanism. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.PLMRRoofProducts=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const definitions=Object.freeze([
    Object.freeze({id:'justpergola',stateKey:'justPergola',viewKey:'justPergolaView',
      engineId:'PERGO_RISE',workspaceSchema:'plmr-justpergola-workspace-v1',
      label:'PLMR | Pergola',name:'Pergola',projection:'PERGOLA',codePrefix:'P'}),
    Object.freeze({id:'justveranda',stateKey:'justVeranda',viewKey:'justVerandaView',
      engineId:'VERANDA',workspaceSchema:'plmr-veranda-workspace-v1',
      label:'PLMR | Veranda',name:'Veranda',projection:'VERANDA',codePrefix:'VR'})
  ]);
  function definition(id){
    const value=definitions.find(item=>item.id===id);
    if(!value)throw Error('Tavan ürünü desteklenmiyor: '+id);
    return value;
  }
  function packet(scene,id){
    const d=definition(id);
    return {workspace:scene?.[d.stateKey]||null,view:scene?.sharedProductLayout?.[d.viewKey]||{}};
  }
  function descriptors(value,id){
    const d=definition(id),model=value?.workspace?.model;
    if(!model)return [];
    const scene=model.workspaces?.standalone?.project||{};
    const inputs=[{id:'roof-main',positions:model.positions,config:model.pergola,scene},
      ...(scene.copies||[]).map(copy=>({id:copy.id,positions:copy.input?.__positionDescriptors,
        config:copy.input?.__pergola,scene:copy.input?.__pergolaScene,input:copy.input}))];
    const rows=[];
    for(const owner of inputs){
      // Copies retain the original positional identity; dimensions are supplied
      // by their own canonical input, never read from another product workspace.
      const positions=owner.positions;
      if(!Array.isArray(positions))throw Error('Veranda kopyasının poz referansları eksik.');
      const quad=owner.config?.pergolaType==='Lean-Quad';
      const opposite=String(owner.scene?.oppositeOpening||'').split(';').map(Number);
      for(const wing of quad?['main','opposite']:['main'])for(const p of positions){
        const positionId=String(p.positionId||p.id);
        const key=[id,owner.id,positionId,wing].join(':');
        const opening=wing==='opposite'&&opposite.length&&opposite[0]>0?Number(opposite[Math.min(p.index,opposite.length-1)]):Number(p.opening);
        rows.push({key,owner:id,sourceOwner:owner.id,positionId,wing,moduleIndex:p.index,code:scene.positionCodes?.[key],
          width:Number(p.width),depth:opening,height:Number(p.frontHeight),rearHeight:Number(p.rearHeight),
          referenceKey:d.id,name:quad?'Lean Quad':'Lean',model:owner.config});
      }
    }
    return rows;
  }
  return Object.freeze({definitions,definition,packet,descriptors});
});
