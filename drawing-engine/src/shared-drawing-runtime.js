/* A single project scene. Product choice changes editing tools, never visibility. */
(function(root){
  'use strict';
  root.PLMRCreateDrawingRuntime=function(E){
    const {scene,camera,renderer,controls,tools,sketch,cube}=E,canvas=renderer.domElement,document=root.document;
    let current=null,drivers=new Map(),disposing=false,contextLost=false,frames=0;
    root.addEventListener('pagehide',()=>{disposing=true;},{once:true});
    canvas.addEventListener('webglcontextlost',()=>{contextLost=true;});
    canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;});
    const isCurrent=()=>!disposing&&!contextLost&&root.document===document&&(root.parent===root||root.frameElement?.isConnected&&root.frameElement.contentDocument===document);
    function bindContext(driver){
      const saved={position:camera.position.clone(),target:controls.target.clone(),up:camera.up.clone(),zoom:camera.zoom,fov:camera.fov,damping:controls.enableDamping};
      tools.setContext(driver?.tools);sketch.setContext(driver?.sketch);
      // Tool cancellation may normalize its working plane; product choice must
      // preserve even a Top/Bottom/isometric camera and any pending orbit delta.
      controls.enableDamping=false;controls.update();
      camera.position.copy(saved.position);camera.up.copy(saved.up);controls.target.copy(saved.target);
      camera.zoom=saved.zoom;camera.fov=saved.fov;camera.updateProjectionMatrix();controls.update();controls.enableDamping=saved.damping;
    }
    function release(owner){
      if(!current||current.owner!==owner)return;
      current=null;
      if(!isCurrent())return;
      bindContext(null);tools.setActive(root.PLMRV24StandaloneViewer.drawingMode()==='3D');
    }
    function acquire(driver){
      if(current===driver)return;
      if(current)release(current.owner);
      tools.clearSelection();current=driver;
      bindContext(driver);
      tools.setActive(root.PLMRV24StandaloneViewer.drawingMode()==='3D');
    }
    function render(){
      if(!isCurrent()||root.__PLMR_ANIMATION_VIEWER__?.active())return;
      for(const driver of drivers.values())driver.beforeRender?.();
      renderer.render(scene,camera);cube.update();
    }
    for(const type of ['pointerdown','pointermove','pointerleave','pointercancel','pointerup','keydown','keyup'])
      canvas.addEventListener(type,event=>current?.input?.[type]?.(event));
    controls.addEventListener('change',()=>current?.cameraChanged?.());
    function fitBounds(bounds){
      if(!isCurrent()||bounds.isEmpty())return false;
      const T=root.THREE,damping=controls.enableDamping;controls.enableDamping=false;controls.update();
      const target=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),direction=camera.position.clone().sub(controls.target);
      if(!direction.lengthSq())direction.set(.9,.5,1.2);direction.normalize();
      const half=T.MathUtils.degToRad(camera.fov/2),angle=Math.min(half,Math.atan(Math.tan(half)*camera.aspect)),distance=Math.max(100,size.length()/2/Math.sin(angle)*1.1);
      camera.zoom=1;camera.updateProjectionMatrix();controls.target.copy(target);camera.position.copy(target).addScaledVector(direction,distance);
      controls.maxDistance=Math.max(distance*5,10000);controls.update();controls.enableDamping=damping;return true;
    }
    return Object.freeze({scene,camera,renderer,controls,tools,sketch,cube,annotations:E.annotations,isCurrent,acquire,release,fitBounds,render,
      register(driver){
        if(drivers.has(driver.owner))throw Error('Ürün geometrisi zaten kayıtlı: '+driver.owner);
        drivers.set(driver.owner,driver);
        const releaseMeasurements=tools.registerProjection?.(driver.owner,driver.tools);
        return()=>{release(driver.owner);releaseMeasurements?.();drivers.delete(driver.owner);sketch.releaseProjection?.(driver.sketch.group());};
      },
      animationChannels:()=>[...drivers.values()].flatMap(d=>d.animationChannels?.()||[]),
      leased:()=>!!current,
      tick(){if(isCurrent()){
        frames++;tools.refreshProject?.();
        for(const driver of drivers.values()){
          if(!root.__PLMR_ANIMATION_VIEWER__?.active())driver.tick?.();
          driver.beforeRender?.();
        }
      }return false;},
      resize:()=>E.resize?.(),
      inspect:()=>({owner:current?.owner||'composite',sceneId:scene.uuid,canvasId:canvas.dataset.plmrRuntime,rendererCount:1,projections:[...drivers.keys()],frames,memory:{...renderer.info.memory}})
    });
  };
})(window);
