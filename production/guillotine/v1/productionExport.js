(function (root) {
  'use strict';

  const STATUS = Object.freeze({ NORMAL:'NORMAL', ZERO_RESULT:'ZERO_RESULT', MANUAL_OVERRIDE:'MANUAL_OVERRIDE', MANUAL_REQUIRED:'MANUAL_REQUIRED' });
  const STATUS_COLORS = Object.freeze({ NORMAL:'#ffffff', ZERO_RESULT:'#f8c7c9', MANUAL_OVERRIDE:'#d9eaf7', MANUAL_REQUIRED:'#f9cb9c' });
  const STATUS_RGB = Object.freeze({ NORMAL:[255,255,255], ZERO_RESULT:[248,199,201], MANUAL_OVERRIDE:[217,234,247], MANUAL_REQUIRED:[249,203,156] });
  const SOURCE_ORANGE = '#f4b183';
  const SOURCE_ORANGE_RGB = [244,177,131];
  const STATUS_STYLE = Object.freeze({ NORMAL:3, ZERO_RESULT:5, MANUAL_OVERRIDE:6, MANUAL_REQUIRED:7 });
  const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const htmlEsc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeSheet = value => String(value || 'POZ').replace(/[\\/*?:\[\]]/g,'-').slice(0,31) || 'POZ';
  const colName = index => { let name=''; let n=index; while(n>0){n-=1;name=String.fromCharCode(65+(n%26))+name;n=Math.floor(n/26);} return name; };
  const cellRef=(row,col)=>`${colName(col)}${row}`;
  const statusStyle = value => STATUS_STYLE[value] || STATUS_STYLE.NORMAL;
  const fieldStatus = (line, field) => line && line.fieldStatus && line.fieldStatus[field] || line && line.status || STATUS.NORMAL;
  const roundMm = value => value == null || value === '' ? '' : Math.round(Number(value));
  const fmtQty = value => value == null || value === '' ? '' : (Number.isFinite(Number(value)) ? new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2}).format(Number(value)) : String(value));
  const formatDate = value => {
    const raw=String(value||'').trim(); if(!raw)return'';
    const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})/); return m?`${m[3]}.${m[2]}.${m[1]}`:raw;
  };
  const DISPLAY_NOTES = Object.freeze({
    'A32-AKS0005':'H21 = H20 düzeltilmiş değeri kullanılır.',
    'A34-AKS0007':'Kumanda adedi proje girdisinden alınır; çoklu pozda ilk desteklenen pozda gösterilir.'
  });
  const lineNote = line => {
    if (line && line.description && line.description !== line.profileName) return line.description;
    return line && (DISPLAY_NOTES[line.ruleId] || line.notes) || '';
  };
  const rowBaseStatus = line => line && line.status===STATUS.ZERO_RESULT ? STATUS.ZERO_RESULT : STATUS.NORMAL;

  function materialIndex(materials) {
    const map = new Map();
    (Array.isArray(materials)?materials:[]).forEach(item => { if(item && item.code) map.set(String(item.code).toUpperCase(), item); });
    return map;
  }
  function imageDataFor(code){const all=root.PulumurGuillotineMaterialImageDataV1||{};return all[String(code||'').toUpperCase()]||'';}
  function imageSrc(material,prefix){return material&&material.image?`${prefix||''}${material.image}`:'';}
  function lineByRow(position){const map=new Map();(position&&position.lines||[]).forEach(line=>map.set(Number(line.sourceRow),line));return map;}

  function positionFormModel(pkg, position, materials) {
    const rows=lineByRow(position), mat=materialIndex(materials), profiles=[], accessories=[];
    for(let r=12;r<=26;r+=1){const line=rows.get(r);if(!line)continue;const material=mat.get(String(line.materialCode).toUpperCase())||{};profiles.push({...line,image:material.image||null,imageSha256:material.imageSha256||null});}
    for(let r=29;r<=36;r+=1){const line=rows.get(r);if(!line)continue;const material=mat.get(String(line.materialCode).toUpperCase())||{};accessories.push({...line,image:material.image||null,imageSha256:material.imageSha256||null});}
    return {profiles,accessories};
  }

  function sourceFormValues(pkg,position){
    const info=pkg.projectInfo||{}, source=position.source||{};
    return {
      poz:source.positionNo||position.positionNo||'', country:info.country||'', customer:info.customerName||'', project:info.projectName||info.projectCode||'', date:formatDate(info.date),
      packaging:info.packaging||'', color:`${source.systemColor||''} ${source.surface||''}`.trim(), width:roundMm(source.width), height:roundMm(source.height), quantity:source.quantity||'',
      glassType:source.glassThickness||'', glassColor:source.glassColor||'', view:source.view||'', motorDirection:source.motorDirection||'', motor:source.motorType||'',
      remote:source.remoteControl||'', remoteQuantity:source.remoteQuantity==null?'':source.remoteQuantity, description:source.description||''
    };
  }

  function xCell(value,row,col,style){
    const ref=cellRef(row,col), s=style==null?'':` s="${style}"`;
    if(value==null||value==='')return `<c r="${ref}"${s} t="inlineStr"><is><t></t></is></c>`;
    if(typeof value==='number'&&Number.isFinite(value))return `<c r="${ref}"${s}><v>${value}</v></c>`;
    return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
  }
  function worksheetXml(def,hasDrawing){
    const cols=(def.columns||[]).map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('');
    const rowXml=(def.rows||[]).map((row,ri)=>{
      const rn=ri+1,h=row.height?` ht="${row.height}" customHeight="1"`:'';
      const cells=(row.cells||[]).map((c,ci)=>xCell(c&&Object.prototype.hasOwnProperty.call(c,'v')?c.v:c,rn,ci+1,c&&c.s!=null?c.s:3)).join('');
      return `<row r="${rn}"${h}>${cells}</row>`;
    }).join('');
    const merges=(def.merges||[]).length?`<mergeCells count="${def.merges.length}">${def.merges.map(x=>`<mergeCell ref="${x}"/>`).join('')}</mergeCells>`:'';
    const filter=def.autoFilter?`<autoFilter ref="${def.autoFilter}"/>`:'';
    const freeze=def.freeze?`<sheetViews><sheetView workbookViewId="0"><pane ySplit="${def.freeze}" topLeftCell="A${def.freeze+1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`:'<sheetViews><sheetView workbookViewId="0"/></sheetViews>';
    const maxCols=Math.max(1,...(def.rows||[]).map(r=>(r.cells||[]).length)),maxRows=Math.max(1,(def.rows||[]).length);
    return `${XML_HEADER}<worksheet xmlns="${NS}" xmlns:r="${REL_NS}"><dimension ref="A1:${colName(maxCols)}${maxRows}"/>${freeze}<sheetFormatPr defaultRowHeight="18"/><cols>${cols}</cols><sheetData>${rowXml}</sheetData>${filter}${merges}<printOptions horizontalCentered="1" verticalCentered="0"/><pageMargins left="0.15" right="0.15" top="0.2" bottom="0.2" header="0.1" footer="0.1"/><pageSetup paperSize="9" orientation="${def.orientation||'portrait'}" fitToWidth="1" fitToHeight="${def.fitToHeight==null?1:def.fitToHeight}"/>${hasDrawing?'<drawing r:id="rId1"/>':''}</worksheet>`;
  }
  const xc=(v,s=3)=>({v,s});
  const blankCells=(n,s=3)=>Array.from({length:n},()=>xc('',s));

  function positionSheet(pkg,position,materials){
    const m=positionFormModel(pkg,position,materials), v=sourceFormValues(pkg,position), rows=[],merges=[],images=[];
    rows.push({height:30,cells:[xc('GİYOTİN ÜRETİM FORMU (ISICAM 1+2)',1),...blankCells(8,1)]});merges.push('A1:I1');
    const headerInfo=(a,b,c,d,e)=>{rows.push({height:21,cells:[xc(a,2),xc(b,2),xc('',2),xc(c,2),xc('',2),xc(d,2),xc('',2),xc(e,2),xc('',2)]});const n=rows.length;merges.push(`B${n}:C${n}`,`D${n}:E${n}`,`F${n}:G${n}`,`H${n}:I${n}`);};
    const valueInfo=(a,b,c,d,e)=>{rows.push({height:30,cells:[xc(a,3),xc(b,3),xc('',3),xc(c,3),xc('',3),xc(d,3),xc('',3),xc(e,3),xc('',3)]});const n=rows.length;merges.push(`B${n}:C${n}`,`D${n}:E${n}`,`F${n}:G${n}`,`H${n}:I${n}`);};
    headerInfo('POZ NO','ÜLKE','MÜŞTERİ','PROJE','TARİH');valueInfo(v.poz,v.country,v.customer,v.project,v.date);
    headerInfo('PAKETLEME','SİSTEM RENGİ','GENİŞLİK','YÜKSEKLİK','ADET');valueInfo(v.packaging,v.color,v.width,v.height,v.quantity);
    headerInfo('CAM TÜRÜ','CAM RENGİ','BAKIŞ YÖNÜ','MOTOR YÖNÜ','MOTOR');valueInfo(v.glassType,v.glassColor,v.view,v.motorDirection,v.motor);
    rows.push({height:21,cells:[xc('KUMANDA',2),xc('KUMANDA ADET',2),xc('',2),xc('AÇIKLAMA',2),...blankCells(5,2)]});merges.push('B8:C8','D8:I8');
    rows.push({height:30,cells:[xc(v.remote,3),xc(v.remoteQuantity,3),xc('',3),xc(v.description,3),...blankCells(5,3)]});merges.push('B9:C9','D9:I9');
    rows.push({height:24,cells:[xc('PROFİL KESİM LİSTESİ',8),...blankCells(8,8)]});merges.push('A10:I10');
    rows.push({height:22,cells:[xc('MALZEME KODU',9),xc('MALZEME İSİM',9),xc('',9),xc('RESİM',9),xc('NOT',9),xc('',9),xc('',9),xc('KESİM ÖLÇÜ',9),xc('ADET',9)]});merges.push('B11:C11','E11:G11');
    m.profiles.forEach(line=>{
      const base=rowBaseStatus(line),rn=rows.length+1,ls=fieldStatus(line,'length'),qs=fieldStatus(line,'quantity'),ds=fieldStatus(line,'description');
      rows.push({height:28,cells:[xc(line.materialCode,statusStyle(base)),xc(line.profileName,statusStyle(base)),xc('',statusStyle(base)),xc('',statusStyle(base)),xc(lineNote(line),statusStyle(ds===STATUS.MANUAL_OVERRIDE?ds:base)),xc('',statusStyle(base)),xc('',statusStyle(base)),xc(line.effectiveLength==null?'':roundMm(line.effectiveLength),statusStyle(ls)),xc(line.effectiveQuantity==null?'GİRİŞ GEREKLİ':Number(line.effectiveQuantity),statusStyle(qs))]});
      merges.push(`B${rn}:C${rn}`,`E${rn}:G${rn}`);if(imageDataFor(line.materialCode))images.push({code:line.materialCode,row:rn,col:4});
    });
    rows.push({height:24,cells:[xc('AKSESUAR LİSTESİ',8),...blankCells(8,8)]});merges.push(`A${rows.length}:I${rows.length}`);
    const ah=rows.length+1;rows.push({height:22,cells:[xc('MALZEME KODU',9),xc('MALZEME İSİM',9),xc('',9),xc('RESİM',9),xc('NOT',9),xc('',9),xc('',9),xc('BİRİM',9),xc('MİKTAR',9)]});merges.push(`B${ah}:C${ah}`,`E${ah}:G${ah}`);
    m.accessories.forEach(line=>{
      const base=rowBaseStatus(line),rn=rows.length+1,qs=fieldStatus(line,'quantity'),ds=fieldStatus(line,'description');
      rows.push({height:28,cells:[xc(line.materialCode,statusStyle(base)),xc(line.profileName,statusStyle(base)),xc('',statusStyle(base)),xc('',statusStyle(base)),xc(line.detail||lineNote(line),statusStyle(ds===STATUS.MANUAL_OVERRIDE?ds:base)),xc('',statusStyle(base)),xc('',statusStyle(base)),xc(line.unit||'',statusStyle(base)),xc(line.effectiveQuantity==null?'GİRİŞ GEREKLİ':Number(line.effectiveQuantity),statusStyle(qs))]});
      merges.push(`B${rn}:C${rn}`,`E${rn}:G${rn}`);if(imageDataFor(line.materialCode))images.push({code:line.materialCode,row:rn,col:4});
    });
    return {name:safeSheet(position.positionNo),columns:[15,15,15,15,15,15,15,15,15],rows,merges,images,orientation:'portrait',fitToHeight:1,printArea:'A1:I36'};
  }

  function summarySheet(pkg){
    const rows=[{height:30,cells:[xc('GİYOTİN ÜRETİM PAKETİ',1),...blankCells(10,1)]},{height:22,cells:['Poz','Genişlik','Yükseklik','Panel','Adet','Bakış','Motor Yönü','Motor','Sistem Rengi','Üretime Uygunluk','Açıklama'].map(x=>xc(x,9))}];
    (pkg.sourcePositions||[]).forEach(src=>{const pos=(pkg.positions||[]).find(p=>p.positionId===src.positionId);const s=pos&&pos.suitability||{status:'UNKNOWN',reasons:[]};rows.push({cells:[xc(src.positionNo,3),xc(roundMm(src.width),4),xc(roundMm(src.height),4),xc(src.panelLayout||'',3),xc(Number(src.quantity)||0,4),xc(src.view||'',3),xc(src.motorDirection||'',3),xc(src.motorType||'',3),xc(`${src.systemColor||''} ${src.surface||''}`.trim(),3),xc(s.status,3),xc((s.reasons||[]).map(x=>x.message).join('; '),3)]});});
    return {name:'ÖZET',columns:[14,14,14,14,10,18,16,20,24,20,44],rows,merges:['A1:K1'],orientation:'landscape',fitToHeight:0,freeze:2,autoFilter:`A2:K${rows.length}`,printArea:`A1:K${rows.length}`};
  }
  function cutsSheet(pkg){
    const rows=[{height:30,cells:[xc('KESİM LİSTESİ',1),...blankCells(9,1)]},{height:22,cells:['Pozlar','Kod','Görsel','Profil','Boy (mm)','Toplam Adet','RAL','Yüzey','Açıklama','Durum'].map(x=>xc(x,9))}],images=[];
    (pkg.cutItems||[]).forEach(line=>{const base=rowBaseStatus(line),rn=rows.length+1;rows.push({height:28,cells:[xc(line.positionNo||'',statusStyle(base)),xc(line.materialCode||'',statusStyle(base)),xc('',statusStyle(base)),xc(line.profileName||'',statusStyle(base)),xc(line.effectiveLength==null?'':roundMm(line.effectiveLength),statusStyle(fieldStatus(line,'length'))),xc(line.effectiveQuantity==null?'GİRİŞ GEREKLİ':Number(line.effectiveQuantity),statusStyle(fieldStatus(line,'quantity'))),xc(line.ral||'',statusStyle(fieldStatus(line,'ral'))),xc(line.surface||'',statusStyle(fieldStatus(line,'surface'))),xc(lineNote(line),statusStyle(fieldStatus(line,'description'))),xc(line.status||'',statusStyle(base))]});if(imageDataFor(line.materialCode))images.push({code:line.materialCode,row:rn,col:3});});
    return {name:'KESİM LİSTESİ',columns:[14,15,12,34,16,15,18,16,42,20],rows,images,merges:['A1:J1'],orientation:'landscape',fitToHeight:0,freeze:2,autoFilter:`A2:J${rows.length}`,printArea:`A1:J${rows.length}`};
  }

  function stylesXml(){
    return `${XML_HEADER}<styleSheet xmlns="${NS}"><fonts count="4"><font><sz val="9"/><name val="Arial"/></font><font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><b/><sz val="9"/><color rgb="FF000000"/><name val="Arial"/></font><font><b/><sz val="9"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="10"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4B183"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF8C7C9"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9EAF7"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF9CB9C"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4B183"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF4B183"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FF666666"/></left><right style="thin"><color rgb="FF666666"/></right><top style="thin"><color rgb="FF666666"/></top><bottom style="thin"><color rgb="FF666666"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="13"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="5" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="6" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="7" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="3" fillId="8" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="9" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  }
  function dataUriBytes(uri){
    const raw=String(uri||'').split(',')[1]||''; if(!raw)return new Uint8Array(0);
    if(typeof atob==='function'){const bin=atob(raw),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}
    if(typeof Buffer!=='undefined')return new Uint8Array(Buffer.from(raw,'base64'));
    return new Uint8Array(0);
  }
  function mediaName(code){return `material-${String(code||'item').replace(/[^A-Za-z0-9_-]/g,'_')}.png`;}
  function drawingXml(images){
    return `${XML_HEADER}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${REL_NS}">${images.map((img,i)=>{const col=Math.max(0,(img.col||1)-1),row=Math.max(0,(img.row||1)-1);return `<xdr:oneCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>80000</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>50000</xdr:rowOff></xdr:from><xdr:ext cx="620000" cy="320000"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i+1}" name="${esc(img.code)}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${i+1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="620000" cy="320000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln><a:noFill/></a:ln></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;}).join('')}</xdr:wsDr>`;
  }
  function drawingRels(images){return `${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${images.map((img,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${mediaName(img.code)}"/>`).join('')}</Relationships>`;}

  function createWorkbook(pkg,materials){
    if(!pkg||pkg.schema!=='plmr-guillotine-production-result-v1')throw new Error('GUILLOTINE_PRODUCTION_PACKAGE_REQUIRED');
    if(!root.PulumurProductionXlsxWriter||typeof root.PulumurProductionXlsxWriter.zip!=='function')throw new Error('XLSX_ZIP_WRITER_REQUIRED');
    const sheets=[summarySheet(pkg),cutsSheet(pkg),...(pkg.positions||[]).map(p=>positionSheet(pkg,p,materials))];
    const drawings=sheets.map((s,i)=>({sheetIndex:i+1,images:s.images||[]})).filter(x=>x.images.length);
    const contentTypes=[`${XML_HEADER}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`,...sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`),...drawings.map((_,i)=>`<Override PartName="/xl/drawings/drawing${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`),'</Types>'].join('');
    const workbookSheets=sheets.map((s,i)=>`<sheet name="${esc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('');
    const names=sheets.map((s,i)=>{const area=s.printArea||'A1:A1';const [a,b]=area.split(':');return `<definedName name="_xlnm.Print_Area" localSheetId="${i}">'${s.name.replace(/'/g,"''")}'!$${a.replace(/(\D+)(\d+)/,'$1$$$2')}:$${b.replace(/(\D+)(\d+)/,'$1$$$2')}</definedName>`;}).join('');
    const workbook=`${XML_HEADER}<workbook xmlns="${NS}" xmlns:r="${REL_NS}"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="15000"/></bookViews><sheets>${workbookSheets}</sheets><definedNames>${names}</definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`;
    const rels=`${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const rootRels=`${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const files={'[Content_Types].xml':contentTypes,'_rels/.rels':rootRels,'xl/workbook.xml':workbook,'xl/_rels/workbook.xml.rels':rels,'xl/styles.xml':stylesXml()};
    let drawingNo=0;const mediaDone=new Set();
    sheets.forEach((s,i)=>{
      const has=(s.images||[]).length>0;files[`xl/worksheets/sheet${i+1}.xml`]=worksheetXml(s,has);
      if(!has)return; drawingNo+=1;
      files[`xl/worksheets/_rels/sheet${i+1}.xml.rels`]=`${XML_HEADER}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawingNo}.xml"/></Relationships>`;
      files[`xl/drawings/drawing${drawingNo}.xml`]=drawingXml(s.images);files[`xl/drawings/_rels/drawing${drawingNo}.xml.rels`]=drawingRels(s.images);
      s.images.forEach(img=>{const name=mediaName(img.code);if(mediaDone.has(name))return;const bytes=dataUriBytes(imageDataFor(img.code));if(bytes.length){files[`xl/media/${name}`]=bytes;mediaDone.add(name);}});
    });
    return root.PulumurProductionXlsxWriter.zip(files);
  }

  function pdfStatusFill(pdf,status){const rgb=STATUS_RGB[status]||STATUS_RGB.NORMAL;pdf.setFillColor(rgb[0],rgb[1],rgb[2]);}
  function pdfCell(pdf,x,y,w,h,textValue,options){
    const o=options||{}; if(o.orange)pdf.setFillColor(...SOURCE_ORANGE_RGB);else pdfStatusFill(pdf,o.status||STATUS.NORMAL); pdf.rect(x,y,w,h,'F');pdf.setDrawColor(80,80,80);pdf.setLineWidth(.12);pdf.rect(x,y,w,h,'S');
    pdf.setTextColor(o.orange?255:0,o.orange?255:0,o.orange?255:0);pdf.setFontSize(o.fontSize||6.5);pdf.setFont('helvetica',o.bold?'bold':'normal');
    const text=String(textValue==null?'':textValue);let lines;
    if(typeof pdf.splitTextToSize==='function') lines=pdf.splitTextToSize(text,Math.max(2,w-2)).slice(0,2);
    else { const limit=Math.max(3,Math.floor(w/(o.fontSize||6.5)*2.15)); lines=[text.length>limit?text.slice(0,Math.max(1,limit-1))+'…':text]; }
    pdf.text(lines,o.align==='right'?x+w-1:o.align==='center'?x+w/2:x+1,y+h/2,{align:o.align||'left',baseline:'middle'});pdf.setFont('helvetica','normal');
  }
  function pdfMergedRow(pdf,y,cells,height,header){
    let x=7;cells.forEach(cell=>{pdfCell(pdf,x,y,cell.w,height,cell.text,{orange:header,bold:true,align:'center',fontSize:header?6.2:6.7,status:cell.status||STATUS.NORMAL});x+=cell.w;});return y+height;
  }
  function addPdfImage(pdf,code,x,y,w,h){const data=imageDataFor(code);if(!data)return;try{pdf.addImage(data,'PNG',x+.7,y+.5,w-1.4,h-1);}catch(_){} }
  function drawPositionPdf(pdf,pkg,position){
    const m=positionFormModel(pkg,position,[]),v=sourceFormValues(pkg,position);let y=7;
    pdfCell(pdf,7,y,196,9,'GİYOTİN ÜRETİM FORMU (ISICAM 1+2)',{orange:true,bold:true,align:'center',fontSize:12});y+=9;
    const ws=[22,43.5,43.5,43.5,43.5];
    y=pdfMergedRow(pdf,y,[{w:ws[0],text:'POZ NO'},{w:ws[1],text:'ÜLKE'},{w:ws[2],text:'MÜŞTERİ'},{w:ws[3],text:'PROJE'},{w:ws[4],text:'TARİH'}],6,true);
    y=pdfMergedRow(pdf,y,[{w:ws[0],text:v.poz},{w:ws[1],text:v.country},{w:ws[2],text:v.customer},{w:ws[3],text:v.project},{w:ws[4],text:v.date}],8,false);
    y=pdfMergedRow(pdf,y,[{w:ws[0],text:'PAKETLEME'},{w:ws[1],text:'SİSTEM RENGİ'},{w:ws[2],text:'GENİŞLİK'},{w:ws[3],text:'YÜKSEKLİK'},{w:ws[4],text:'ADET'}],6,true);
    y=pdfMergedRow(pdf,y,[{w:ws[0],text:v.packaging},{w:ws[1],text:v.color},{w:ws[2],text:v.width},{w:ws[3],text:v.height},{w:ws[4],text:v.quantity}],8,false);
    y=pdfMergedRow(pdf,y,[{w:ws[0],text:'CAM TÜRÜ'},{w:ws[1],text:'CAM RENGİ'},{w:ws[2],text:'BAKIŞ YÖNÜ'},{w:ws[3],text:'MOTOR YÖNÜ'},{w:ws[4],text:'MOTOR'}],6,true);
    y=pdfMergedRow(pdf,y,[{w:ws[0],text:v.glassType},{w:ws[1],text:v.glassColor},{w:ws[2],text:v.view},{w:ws[3],text:v.motorDirection},{w:ws[4],text:v.motor}],8,false);
    y=pdfMergedRow(pdf,y,[{w:ws[0],text:'KUMANDA'},{w:ws[1],text:'KUMANDA ADET'},{w:130.5,text:'AÇIKLAMA'}],6,true);
    y=pdfMergedRow(pdf,y,[{w:ws[0],text:v.remote},{w:ws[1],text:v.remoteQuantity},{w:130.5,text:v.description}],8,false);
    pdfCell(pdf,7,y,196,7,'PROFİL KESİM LİSTESİ',{orange:true,bold:true,align:'center',fontSize:8});y+=7;
    const cw=[22,43,22,65,22,22];let x=7;['MALZEME KODU','MALZEME İSİM','RESİM','NOT','KESİM ÖLÇÜ','ADET'].forEach((h,i)=>{pdfCell(pdf,x,y,cw[i],6,h,{orange:true,bold:true,align:'center',fontSize:5.7});x+=cw[i];});y+=6;
    m.profiles.forEach(line=>{const base=rowBaseStatus(line);x=7;const vals=[line.materialCode,line.profileName,'',lineNote(line),line.effectiveLength==null?'':`${roundMm(line.effectiveLength)} MM`,line.effectiveQuantity==null?'GİRİŞ':fmtQty(line.effectiveQuantity)];const sts=[base,base,base,fieldStatus(line,'description')===STATUS.MANUAL_OVERRIDE?STATUS.MANUAL_OVERRIDE:base,fieldStatus(line,'length'),fieldStatus(line,'quantity')];const rowY=y;vals.forEach((val,i)=>{pdfCell(pdf,x,y,cw[i],7,val,{status:sts[i],bold:i===0||i===1,align:i>=4?'center':'left',fontSize:5.8});if(i===2)addPdfImage(pdf,line.materialCode,x,y,cw[i],7);x+=cw[i];});y+=7;});
    pdfCell(pdf,7,y,196,7,'AKSESUAR LİSTESİ',{orange:true,bold:true,align:'center',fontSize:8});y+=7;
    x=7;['MALZEME KODU','MALZEME İSİM','RESİM','NOT','BİRİM','MİKTAR'].forEach((h,i)=>{pdfCell(pdf,x,y,cw[i],6,h,{orange:true,bold:true,align:'center',fontSize:5.7});x+=cw[i];});y+=6;
    m.accessories.forEach(line=>{const base=rowBaseStatus(line);x=7;const vals=[line.materialCode,line.profileName,'',line.detail||lineNote(line),line.unit||'',line.effectiveQuantity==null?'GİRİŞ':fmtQty(line.effectiveQuantity)];const sts=[base,base,base,fieldStatus(line,'description')===STATUS.MANUAL_OVERRIDE?STATUS.MANUAL_OVERRIDE:base,base,fieldStatus(line,'quantity')];vals.forEach((val,i)=>{pdfCell(pdf,x,y,cw[i],7,val,{status:sts[i],bold:i===0||i===1,align:i>=4?'center':'left',fontSize:5.8});if(i===2)addPdfImage(pdf,line.materialCode,x,y,cw[i],7);x+=cw[i];});y+=7;});
  }
  function pdfJpegBytes(uri){ return dataUriBytes(uri); }
  function canvasStatusColor(status){return STATUS_COLORS[status]||STATUS_COLORS.NORMAL;}
  function canvasFitText(ctx,text,maxWidth){
    const raw=String(text==null?'':text);if(ctx.measureText(raw).width<=maxWidth)return raw;
    let out=raw;while(out.length>1&&ctx.measureText(out+'…').width>maxWidth)out=out.slice(0,-1);return out+'…';
  }
  async function loadCanvasMaterialImages(){
    const cache=new Map(), all=root.PulumurGuillotineMaterialImageDataV1||{};
    await Promise.all(Object.entries(all).map(([code,src])=>new Promise(resolve=>{const img=new Image();img.onload=()=>{cache.set(String(code).toUpperCase(),img);resolve();};img.onerror=()=>resolve();img.src=src;})));
    return cache;
  }
  function drawCanvasCell(ctx,mm,x,y,w,h,text,options){
    const o=options||{},fill=o.orange?SOURCE_ORANGE:canvasStatusColor(o.status||STATUS.NORMAL);
    ctx.fillStyle=fill;ctx.fillRect(mm(x),mm(y),mm(w),mm(h));ctx.strokeStyle='#505050';ctx.lineWidth=Math.max(1,mm(.12));ctx.strokeRect(mm(x),mm(y),mm(w),mm(h));
    if(text==null||text==='')return;
    ctx.fillStyle=o.orange?'#ffffff':'#000000';ctx.font=`${o.bold?'700':'600'} ${o.fontSize||10}px Arial, sans-serif`;ctx.textBaseline='middle';ctx.textAlign=o.align||'left';
    const tx=o.align==='right'?mm(x+w)-mm(1):o.align==='center'?mm(x+w/2):mm(x)+mm(1);const shown=canvasFitText(ctx,text,mm(w)-mm(2));ctx.fillText(shown,tx,mm(y+h/2),Math.max(1,mm(w)-mm(2)));
  }
  function drawCanvasMaterialImage(ctx,mm,image,x,y,w,h){
    if(!image||!image.naturalWidth||!image.naturalHeight)return;const pad=mm(.65),maxW=Math.max(1,mm(w)-pad*2),maxH=Math.max(1,mm(h)-pad*2);const scale=Math.min(maxW/image.naturalWidth,maxH/image.naturalHeight);const dw=image.naturalWidth*scale,dh=image.naturalHeight*scale;ctx.drawImage(image,mm(x)+(mm(w)-dw)/2,mm(y)+(mm(h)-dh)/2,dw,dh);
  }
  async function rasterizePositionToJpeg(pkg,position,materials){
    if(typeof document==='undefined'||typeof Image==='undefined')throw new Error('BROWSER_RASTER_REQUIRED');
    const canvas=document.createElement('canvas');canvas.width=1588;canvas.height=2246;const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('PRODUCTION_PDF_CANVAS_REQUIRED');
    const mm=value=>Number(value)*canvas.width/210;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);
    const images=await loadCanvasMaterialImages(),m=positionFormModel(pkg,position,materials),v=sourceFormValues(pkg,position);let y=7;
    drawCanvasCell(ctx,mm,7,y,196,9,'GİYOTİN ÜRETİM FORMU (ISICAM 1+2)',{orange:true,bold:true,align:'center',fontSize:20});y+=9;
    const ws=[22,43.5,43.5,43.5,43.5];
    const merged=(cells,height,header)=>{let x=7;cells.forEach(cell=>{drawCanvasCell(ctx,mm,x,y,cell.w,height,cell.text,{orange:header,bold:true,align:'center',fontSize:header?10:11,status:cell.status||STATUS.NORMAL});x+=cell.w;});y+=height;};
    merged([{w:ws[0],text:'POZ NO'},{w:ws[1],text:'ÜLKE'},{w:ws[2],text:'MÜŞTERİ'},{w:ws[3],text:'PROJE'},{w:ws[4],text:'TARİH'}],6,true);
    merged([{w:ws[0],text:v.poz},{w:ws[1],text:v.country},{w:ws[2],text:v.customer},{w:ws[3],text:v.project},{w:ws[4],text:v.date}],8,false);
    merged([{w:ws[0],text:'PAKETLEME'},{w:ws[1],text:'SİSTEM RENGİ'},{w:ws[2],text:'GENİŞLİK'},{w:ws[3],text:'YÜKSEKLİK'},{w:ws[4],text:'ADET'}],6,true);
    merged([{w:ws[0],text:v.packaging},{w:ws[1],text:v.color},{w:ws[2],text:v.width},{w:ws[3],text:v.height},{w:ws[4],text:v.quantity}],8,false);
    merged([{w:ws[0],text:'CAM TÜRÜ'},{w:ws[1],text:'CAM RENGİ'},{w:ws[2],text:'BAKIŞ YÖNÜ'},{w:ws[3],text:'MOTOR YÖNÜ'},{w:ws[4],text:'MOTOR'}],6,true);
    merged([{w:ws[0],text:v.glassType},{w:ws[1],text:v.glassColor},{w:ws[2],text:v.view},{w:ws[3],text:v.motorDirection},{w:ws[4],text:v.motor}],8,false);
    merged([{w:ws[0],text:'KUMANDA'},{w:ws[1],text:'KUMANDA ADET'},{w:130.5,text:'AÇIKLAMA'}],6,true);
    merged([{w:ws[0],text:v.remote},{w:ws[1],text:v.remoteQuantity},{w:130.5,text:v.description}],8,false);
    drawCanvasCell(ctx,mm,7,y,196,7,'PROFİL KESİM LİSTESİ',{orange:true,bold:true,align:'center',fontSize:12});y+=7;
    const cw=[22,43,22,65,22,22];let x=7;['MALZEME KODU','MALZEME İSİM','RESİM','NOT','KESİM ÖLÇÜ','ADET'].forEach((h,i)=>{drawCanvasCell(ctx,mm,x,y,cw[i],6,h,{orange:true,bold:true,align:'center',fontSize:9});x+=cw[i];});y+=6;
    m.profiles.forEach(line=>{const base=rowBaseStatus(line),vals=[line.materialCode,line.profileName,'',lineNote(line),line.effectiveLength==null?'':`${roundMm(line.effectiveLength)} MM`,line.effectiveQuantity==null?'GİRİŞ':fmtQty(line.effectiveQuantity)],sts=[base,base,base,fieldStatus(line,'description')===STATUS.MANUAL_OVERRIDE?STATUS.MANUAL_OVERRIDE:base,fieldStatus(line,'length'),fieldStatus(line,'quantity')];x=7;vals.forEach((val,i)=>{drawCanvasCell(ctx,mm,x,y,cw[i],7,val,{status:sts[i],bold:i<2,align:i>=4?'center':'left',fontSize:9});if(i===2)drawCanvasMaterialImage(ctx,mm,images.get(String(line.materialCode).toUpperCase()),x,y,cw[i],7);x+=cw[i];});y+=7;});
    drawCanvasCell(ctx,mm,7,y,196,7,'AKSESUAR LİSTESİ',{orange:true,bold:true,align:'center',fontSize:12});y+=7;x=7;
    ['MALZEME KODU','MALZEME İSİM','RESİM','NOT','BİRİM','MİKTAR'].forEach((h,i)=>{drawCanvasCell(ctx,mm,x,y,cw[i],6,h,{orange:true,bold:true,align:'center',fontSize:9});x+=cw[i];});y+=6;
    m.accessories.forEach(line=>{const base=rowBaseStatus(line),vals=[line.materialCode,line.profileName,'',line.detail||lineNote(line),line.unit||'',line.effectiveQuantity==null?'GİRİŞ':fmtQty(line.effectiveQuantity)],sts=[base,base,base,fieldStatus(line,'description')===STATUS.MANUAL_OVERRIDE?STATUS.MANUAL_OVERRIDE:base,base,fieldStatus(line,'quantity')];x=7;vals.forEach((val,i)=>{drawCanvasCell(ctx,mm,x,y,cw[i],7,val,{status:sts[i],bold:i<2,align:i>=4?'center':'left',fontSize:9});if(i===2)drawCanvasMaterialImage(ctx,mm,images.get(String(line.materialCode).toUpperCase()),x,y,cw[i],7);x+=cw[i];});y+=7;});
    return canvas.toDataURL('image/jpeg',0.93);
  }
  function buildJpegPagesPdf(jpegs){
    const enc=new TextEncoder(),ascii=value=>enc.encode(String(value)),objects=[null],reserve=()=>{objects.push(null);return objects.length-1;},set=(id,chunks)=>{objects[id]=Array.isArray(chunks)?chunks:[ascii(chunks)];},add=chunks=>{const id=reserve();set(id,chunks);return id;};
    const catalogId=reserve(),pagesId=reserve(),pageIds=[];(jpegs||[]).forEach((uri,index)=>{const bytes=pdfJpegBytes(uri);if(!bytes.length)throw new Error('PRODUCTION_PDF_IMAGE_EMPTY');const imageId=add([ascii(`<< /Type /XObject /Subtype /Image /Width 1588 /Height 2246 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`),bytes,ascii('\nendstream')]);const name=`Im${index+1}`,content=ascii(`q 595.2756 0 0 841.8898 0 0 cm /${name} Do Q`),contentId=add([ascii(`<< /Length ${content.length} >>\nstream\n`),content,ascii('\nendstream')]),pageId=reserve();pageIds.push(pageId);set(pageId,`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595.2756 841.8898] /Resources << /XObject << /${name} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`);});
    set(pagesId,`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] >>`);set(catalogId,`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
    const chunks=[ascii('%PDF-1.4\n%PLMR\n')],offsets=[0];let offset=chunks[0].length;for(let id=1;id<objects.length;id+=1){offsets[id]=offset;const head=ascii(`${id} 0 obj\n`),tail=ascii('\nendobj\n');chunks.push(head,...objects[id],tail);offset+=head.length+objects[id].reduce((a,b)=>a+b.length,0)+tail.length;}const xrefOffset=offset;let xref=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let id=1;id<objects.length;id+=1)xref+=`${String(offsets[id]).padStart(10,'0')} 00000 n \n`;xref+=`trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;chunks.push(ascii(xref));return new Blob(chunks,{type:'application/pdf'});
  }
  async function createPdf(pkg,materials){
    if(!pkg||pkg.schema!=='plmr-guillotine-production-result-v1')throw new Error('GUILLOTINE_PRODUCTION_PACKAGE_REQUIRED');if(!(pkg.positions||[]).length)throw new Error('GUILLOTINE_PRODUCTION_POSITIONS_REQUIRED');const pages=[];for(const position of pkg.positions)pages.push(await rasterizePositionToJpeg(pkg,position,materials));return buildJpegPagesPdf(pages);
  }

  function statusClass(status){return `production-cell-${String(status||STATUS.NORMAL).toLowerCase().replace(/_/g,'-')}`;}
  function statusCellClass(line,field){const s=field?fieldStatus(line,field):rowBaseStatus(line);return statusClass(s);}
  function sourceInfoRowsHtml(v){
    return `<table class="production-source-form production-source-info"><colgroup>${'<col/>'.repeat(9)}</colgroup><tbody>
      <tr class="source-title"><th colspan="9">GİYOTİN ÜRETİM FORMU (ISICAM 1+2)</th></tr>
      <tr class="source-header"><th>POZ NO</th><th colspan="2">ÜLKE</th><th colspan="2">MÜŞTERİ</th><th colspan="2">PROJE</th><th colspan="2">TARİH</th></tr>
      <tr class="source-value"><td>${htmlEsc(v.poz)}</td><td colspan="2">${htmlEsc(v.country)}</td><td colspan="2">${htmlEsc(v.customer)}</td><td colspan="2">${htmlEsc(v.project)}</td><td colspan="2">${htmlEsc(v.date)}</td></tr>
      <tr class="source-header"><th>PAKETLEME</th><th colspan="2">SİSTEM RENGİ</th><th colspan="2">GENİŞLİK</th><th colspan="2">YÜKSEKLİK</th><th colspan="2">ADET</th></tr>
      <tr class="source-value"><td>${htmlEsc(v.packaging)}</td><td colspan="2">${htmlEsc(v.color)}</td><td colspan="2">${htmlEsc(v.width)}</td><td colspan="2">${htmlEsc(v.height)}</td><td colspan="2">${htmlEsc(v.quantity)}</td></tr>
      <tr class="source-header"><th>CAM TÜRÜ</th><th colspan="2">CAM RENGİ</th><th colspan="2">BAKIŞ YÖNÜ</th><th colspan="2">MOTOR YÖNÜ</th><th colspan="2">MOTOR</th></tr>
      <tr class="source-value"><td>${htmlEsc(v.glassType)}</td><td colspan="2">${htmlEsc(v.glassColor)}</td><td colspan="2">${htmlEsc(v.view)}</td><td colspan="2">${htmlEsc(v.motorDirection)}</td><td colspan="2">${htmlEsc(v.motor)}</td></tr>
      <tr class="source-header"><th>KUMANDA</th><th colspan="2">KUMANDA ADET</th><th colspan="6">AÇIKLAMA</th></tr>
      <tr class="source-value"><td>${htmlEsc(v.remote)}</td><td colspan="2">${htmlEsc(v.remoteQuantity)}</td><td colspan="6" class="source-note">${htmlEsc(v.description)}</td></tr>
    </tbody></table>`;
  }
  function positionPageHtml(pkg,position,materials,options){
    const m=positionFormModel(pkg,position,materials),v=sourceFormValues(pkg,position),opts=options||{},prefix=opts.imagePrefix==null?'../../':opts.imagePrefix,mat=materialIndex(materials);
    const profileRows=m.profiles.map(line=>{const material=mat.get(String(line.materialCode).toUpperCase())||{},img=imageSrc(material,prefix),base=statusCellClass(line);return `<tr><td class="${base}">${htmlEsc(line.materialCode)}</td><td colspan="2" class="${base}">${htmlEsc(line.profileName)}</td><td class="${base} source-image-cell">${img?`<img src="${htmlEsc(img)}" alt=""/>`:''}</td><td colspan="3" class="${statusCellClass(line,'description')}">${htmlEsc(lineNote(line))}</td><td class="${statusCellClass(line,'length')}">${line.effectiveLength==null?'':`${htmlEsc(roundMm(line.effectiveLength))} MM`}</td><td class="${statusCellClass(line,'quantity')}">${line.effectiveQuantity==null?'GİRİŞ GEREKLİ':htmlEsc(fmtQty(line.effectiveQuantity))}</td></tr>`;}).join('');
    const accessoryRows=m.accessories.map(line=>{const material=mat.get(String(line.materialCode).toUpperCase())||{},img=imageSrc(material,prefix),base=statusCellClass(line);return `<tr><td class="${base}">${htmlEsc(line.materialCode)}</td><td colspan="2" class="${base}">${htmlEsc(line.profileName)}</td><td class="${base} source-image-cell">${img?`<img src="${htmlEsc(img)}" alt=""/>`:''}</td><td colspan="3" class="${statusCellClass(line,'description')}">${htmlEsc(line.detail||lineNote(line))}</td><td class="${base}">${htmlEsc(line.unit||'')}</td><td class="${statusCellClass(line,'quantity')}">${line.effectiveQuantity==null?'GİRİŞ GEREKLİ':htmlEsc(fmtQty(line.effectiveQuantity))}</td></tr>`;}).join('');
    return `<article class="production-a4-page source-form-page" data-position-id="${htmlEsc(position.positionId)}">${sourceInfoRowsHtml(v)}<table class="production-source-form source-material-table"><colgroup>${'<col/>'.repeat(9)}</colgroup><tbody><tr class="source-section"><th colspan="9">PROFİL KESİM LİSTESİ</th></tr><tr class="source-header"><th>MALZEME KODU</th><th colspan="2">MALZEME İSİM</th><th>RESİM</th><th colspan="3">NOT</th><th>KESİM ÖLÇÜ</th><th>ADET</th></tr>${profileRows}<tr class="source-section"><th colspan="9">AKSESUAR LİSTESİ</th></tr><tr class="source-header"><th>MALZEME KODU</th><th colspan="2">MALZEME İSİM</th><th>RESİM</th><th colspan="3">NOT</th><th>BİRİM</th><th>MİKTAR</th></tr>${accessoryRows}</tbody></table></article>`;
  }
  function printCss(){return `@page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;background:#e8edf1;font-family:Arial,sans-serif;color:#000}.production-a4-page{width:210mm;height:297mm;margin:0 auto 8mm;padding:5mm;background:#fff;overflow:hidden;page-break-after:always}.production-a4-page:last-child{page-break-after:auto}.production-source-form{width:100%;border-collapse:collapse;table-layout:fixed}.production-source-form col{width:11.111%}.production-source-form th,.production-source-form td{border:.2mm solid #666;padding:.5mm 1mm;text-align:center;vertical-align:middle;font-size:6.8pt;font-weight:700;overflow:hidden}.source-title th{height:8mm;background:${SOURCE_ORANGE};color:#fff;font-size:13pt}.source-header th,.source-section th{background:${SOURCE_ORANGE};color:#fff;font-size:6.4pt}.production-source-info .source-header th{height:6mm}.production-source-info .source-value td{height:8mm}.source-note{text-align:left!important}.source-section th{height:7mm;font-size:9pt}.source-material-table .source-header th{height:6.5mm}.source-material-table td{height:7.4mm}.source-image-cell img{display:block;max-width:13mm;max-height:6mm;object-fit:contain;margin:auto}.production-cell-zero-result{background:${STATUS_COLORS.ZERO_RESULT}!important}.production-cell-manual-override{background:${STATUS_COLORS.MANUAL_OVERRIDE}!important}.production-cell-manual-required{background:${STATUS_COLORS.MANUAL_REQUIRED}!important}.production-cell-normal{background:#fff!important}@media print{body{background:#fff}.production-a4-page{margin:0;box-shadow:none}}`;}
  function buildPrintHtml(pkg,materials,options){const opts=options||{},pages=(pkg.positions||[]).map(p=>positionPageHtml(pkg,p,materials,{imagePrefix:opts.imagePrefix==null?'../../':opts.imagePrefix})).join('');return `<!doctype html><html lang="tr"><head><meta charset="utf-8">${opts.baseHref?`<base href="${htmlEsc(opts.baseHref)}">`:''}<title>PLMR Giyotin Üretim Formu</title><style>${printCss()}</style></head><body>${pages}</body></html>`;}

  root.PulumurGuillotineProductionExportV1=Object.freeze({STATUS,STATUS_COLORS,SOURCE_ORANGE,statusClass,fieldStatus,roundMm,positionFormModel,positionPageHtml,printCss,buildPrintHtml,createWorkbook,createPdf});
  if(typeof module!=='undefined')module.exports=root.PulumurGuillotineProductionExportV1;
})(typeof window!=='undefined'?window:globalThis);
