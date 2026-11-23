/* Compact URL representation of the existing 128-bit presentation ID.
   No public shortening service, new identifier or project payload is involved. */
(function(root){
 'use strict';
 function encode(id){
  if(!/^[a-f0-9]{32}$/.test(id))throw Error('Paylaşım kimliği geçersiz.');
  let raw='';for(let i=0;i<32;i+=2)raw+=String.fromCharCode(parseInt(id.slice(i,i+2),16));
  return btoa(raw).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
 }
 function decode(value){
  if(/^[a-f0-9]{32}$/.test(value))return value;
  if(!/^[A-Za-z0-9_-]{22}$/.test(value))throw Error('Paylaşım bağlantısı geçersiz.');
  const raw=atob(value.replaceAll('-','+').replaceAll('_','/')+'==');
  const id=Array.from(raw,c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('');
  if(raw.length!==16||encode(id)!==value)throw Error('Paylaşım bağlantısı geçersiz.');
  return id;
 }
 function base(config={}){
  const value=location.protocol==='file:'?config.publicAppUrl:new URL('../',location.href).href;
  if(!value||!/^https?:/.test(value))throw Error('Kısa bağlantı için uygulamanın yayın adresi gerekli.');
  return new URL(value.endsWith('/')?value:value+'/');
 }
 function url(kind,id,config){
  if(!['project','animation'].includes(kind))throw Error('Paylaşım türü geçersiz.');
  const out=new URL(kind==='project'?'p.html':'a.html',base(config));out.hash=encode(id);return out.href;
 }
 root.PLMRShareLinks=Object.freeze({encode,decode,url});
})(window);
