(function(){
 'use strict';
 try{
  const id=PLMRShareLinks.decode(location.hash.slice(1));
  const animation=document.documentElement.dataset.shareKind==='animation';
  const url=new URL(animation?'drawing-engine/index.html?presentation=1':'drawing-engine/project-view.html',location.href);
  url.hash=animation?'share='+id:id;location.replace(url.href);
 }catch(error){document.querySelector('[role=status]').textContent=error.message;}
})();
