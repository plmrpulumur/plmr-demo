/* Product applicability consumes the shared roof option contract; existing RAL controls are reused. */
(function(root){
 'use strict';let target,parking,baseRows;
 const $=id=>document.getElementById(id),rowOf=id=>$(id)?.closest('.plmr-cell-row');
 function patch(values){root.PLMRV17Commands.patchRoofSettings(values);if(values.led!==undefined&&$('ledInput')){const input=$('ledInput');if(![...input.options].some(o=>o.value===values.led))input.add(new Option(values.led,values.led));input.value=values.led;}}
 function field(label,key,control){const row=document.createElement(key==='led'?'div':'label');row.className='plmr-cell-row';row.dataset.roofOption=key;const text=document.createElement('span');text.textContent=label;control.id='rrBioOption-'+key;control.setAttribute('aria-label',label);row.append(text,control);return row;}
 function render(id){
  if(!target||!root.PLMRV17Commands?.roofSettings)return;
  for(const n of target.querySelectorAll('[data-roof-option]'))n.remove();
  for(const row of Object.values(baseRows))if(row)parking.append(row);
  const value={...root.PLMRRoofSettings.roofOptionDefaults(id),...root.PLMRV17Commands.roofSettings()};
  for(const def of root.PLMRRoofSettings.roofSettingsFields(id)){
   if(baseRows[def.key]){
    const row=baseRows[def.key],caption=row.querySelector('span');if(caption?.firstChild?.nodeType===3)caption.firstChild.textContent=def.label+' ';
    row.hidden=false;target.append(row);continue;
   }
   let control;
   if(def.key==='led'){
    control=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Led Seçimi';control.append(summary);
    const selected=new Set(root.PLMRRoofSettings.selectedLed(value.led));
    for(const [key,label]of root.PLMRRoofSettings.ledChoices){const option=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.value=key;input.checked=selected.has(key);input.setAttribute('aria-label',label);input.onchange=()=>{const chosen=[...control.querySelectorAll('input:checked')].map(n=>n.value);patch({led:root.PLMRRoofSettings.ledValue(chosen)});};option.className='rr-v11-filter-row';option.append(input,document.createTextNode(label));control.append(option);}
   }else if(def.key==='fabricColor'){
    control=document.createElement('input');control.type='color';control.value=value.fabricColor;control.oninput=()=>patch({fabricColor:control.value});
   }else{
    control=document.createElement('select');const options=def.key==='glassType'?[['SINGLE','Tek Cam'],['INSULATED','Isıcam']]:root.PLMRRoofSettings.roofGlassChoices;
    for(const [key,label]of options)control.add(new Option(label,key));control.value=value[def.key];control.onchange=()=>{patch({[def.key]:control.value});if(def.key==='glassColor')render(id);};
   }
   target.append(field(def.label,def.key,control));
   if(def.key==='glassColor'&&value.glassColor==='OTHER'){
    const other=document.createElement('input');other.type='text';other.value=value.glassColorOther||'';other.placeholder='#808080';other.oninput=()=>patch({glassColorOther:other.value});target.append(field('Cam Rengi / Diğer','glassColorOther',other));
   }
  }
 }
 function mount(options){
  target=options;parking=$('rrV13ParserControls');if(!parking)throw Error('Ortak eski veri kontrol alanı hazır değil.');
  baseRows={systemColor:rowOf('systemColorTrigger'),panelColor:rowOf('panelColorTrigger'),panelFill:rowOf('panelFillInput'),dimmer:rowOf('dimmerInput')};
  for(const id of ['motorInput','remoteInput','ledInput','extrasInput','parapetInput','parapetHeightInput','pergoDimmerInput','pergoFabricInput','pergoFabricProfilesInput','pergoStructureColorInput','pergoGlassTrackInput']){const row=rowOf(id);if(row)parking.append(row);}
  render($('rrV17SystemSelect')?.value||'zagro');
 }
 root.PLMRBioclimaticSettingsUI=Object.freeze({mount,render});
})(window);
