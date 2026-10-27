/* Shared quote/drawing input contract. Geometry remains in the approved topology. */
(function(root){'use strict';
 function validate(input){
  const width=Number(input.width),depth=Number(input.depth),height=Number(input.height);
  if(![width,depth,height].every(Number.isFinite)||width<1000||depth<2104||height<1600||Math.max(width,depth,height)>1000000)throw Error('Cephe en az 1000 mm, açılım en az 2104 mm ve ayak yüksekliği en az 1600 mm olmalıdır.');
  return {width,depth,height};
 }
 root.PLMRRoofInput=Object.freeze({validate});
})(typeof window!=='undefined'?window:globalThis);
