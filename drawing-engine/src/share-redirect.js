(function(){
 'use strict';
 try{
  const id=PLMRShareLinks.decode(location.hash.slice(1));
  const animation=document.documentElement.dataset.shareKind==='animation';
  const url=new URL('drawing-engine/share-shell.html',location.href);
  url.searchParams.set('view',animation?'animation':'project');
  url.hash=animation?'share='+id:id;location.replace(url.href);
 }catch(error){document.querySelector('[role=status]').textContent=error.message;}
})();
