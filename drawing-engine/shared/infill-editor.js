/** Actual native polygons and the existing modal service; no second model or renderer. */
(function(root){'use strict';
function openNative(config,G,services,onSave){let draft=config.panelInfills||'';const model=G.build(config),parts=model.parts.filter(p=>p.infillKey),esc=services.esc;
 services.modal('Bölmeleri Özelleştir','DOLGU',body=>{const note=document.createElement('p');note.textContent='Değiştirmek istediğiniz paneli seçin.';body.append(note);const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`-30 -30 ${model.width+60} ${model.height+60}`);svg.style.cssText='width:100%;height:340px;background:#f8fafc';body.append(svg);const controls=document.createElement('div');body.append(controls);
 function render(){svg.innerHTML=parts.map(p=>`<polygon data-infill-key="${esc(p.infillKey)}" points="${p.outline.map(([x,y])=>x+','+(model.height-y)).join(' ')}" fill="${root.PLMRInfill.infillKind({...config,panelInfills:draft},p.infillKey)==='SHEET'?'#64748b':'#bae6fd'}" stroke="#334155" stroke-width="3"/>`).join('');for(const node of svg.querySelectorAll('[data-infill-key]'))node.onclick=()=>{controls.replaceChildren();const label=document.createElement('label');label.textContent='Dolgu';const input=document.createElement('select');input.id='panelInfill';input.setAttribute('aria-label','Dolgu');for(const[v,t]of [['GLASS','Cam'],['SHEET','Levha']])input.add(new Option(t,v));input.value=root.PLMRInfill.infillKind({...config,panelInfills:draft},node.dataset.infillKey);input.onchange=()=>{draft=root.PLMRInfill.withInfill(draft,node.dataset.infillKey,input.value);render();};label.append(input);controls.append(label);};}render();
 },()=>onSave(draft),{width:940});
}
root.PLMRInfillEditor={openNative};
})(window);
