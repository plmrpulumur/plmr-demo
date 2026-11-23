/* Shared orbit controls and zone feedback for every product projection. */
(function(root){
  'use strict';
  function configure(controls){
    controls.screenSpacePanning=true;controls.enableDamping=true;controls.dampingFactor=.08;
    controls.mouseButtons={LEFT:root.THREE.MOUSE.ROTATE,MIDDLE:root.THREE.MOUSE.DOLLY,RIGHT:root.THREE.MOUSE.PAN};
  }
  function styleZone(mesh,hover,bulk=false){
    if(!mesh?.material)return;
    const data=mesh.userData;
    if(data.v42Selected&&!bulk){mesh.material.opacity=.28;mesh.material.color.setHex(0x16a34a);return;}
    if(bulk){
      const eligible=!!data.toolboxEligible,selected=!!data.toolboxSelected;
      mesh.material.opacity=selected?.30:eligible?(hover?.22:.13):.002;
      mesh.material.color.setHex(selected?0x16a34a:eligible?0x38bdf8:0x64748b);return;
    }
    const selected=!!data.selected;
    mesh.material.opacity=selected?.18:hover?(data.occupied?.20:.16):(data.occupied?.025:.018);
    mesh.material.color.setHex(selected?0xf59e0b:data.occupied?0x22c55e:0x38bdf8);
  }
  function pick(scene,camera,canvas,event,predicate=()=>true){
    const T=root.THREE,rect=canvas.getBoundingClientRect();
    if(!rect.width||!rect.height)return null;
    scene.updateWorldMatrix(true,true);camera.updateMatrixWorld(true);
    const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1),camera);
    const objects=[];
    scene.traverse(object=>{
      if(!object.isMesh||!predicate(object))return;
      for(let p=object;p;p=p.parent){const d=p.userData||{};
        if(!p.visible||d.isDimension||d.dimension||d.annotation||d.presentationAnnotation||d.movementIndicator||d.v24Highlight)return;
      }
      objects.push(object);
    });
    return root.PLMRV13Core.nearestHit(ray.intersectObjects(objects,false))||null;
  }
  function zones(E){
    let hovered=null,lastPointer=null;
    const paint=(mesh,hover)=>styleZone(mesh,hover,!!E.bulk?.());
    function clear(){if(hovered)paint(hovered,false);hovered=null;lastPointer=null;}
    function update(event){
      lastPointer=event;
      if(E.tool()!=='select'){clear();return;}
      if(event.buttons)return;
      const hit=E.pick(event),next=hit?.userData?.zone?hit:null;
      if(hovered&&hovered!==next)paint(hovered,false);
      hovered=next;if(next)paint(next,true);
      E.canvas.style.cursor=next?'pointer':'grab';
    }
    return {update,clear,changed:()=>{if(lastPointer&&!lastPointer.buttons)update(lastPointer);},
      initialise:mesh=>paint(mesh,false),inspect:()=>hovered?.userData.zone.id||null};
  }
  root.PLMRSceneInteraction=Object.freeze({configure,styleZone,zones,pick});
})(window);
