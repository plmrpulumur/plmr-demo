import{Q as s}from"./quoteTerms-DiI_dpfe.js";function u(a){const e=s[a];return a==="TR"?{notes:`1. Üretim, onaylanmış teknik çizime dayalı olarak gerçekleştirilir. Üretim çizimi müşteri temsilcisinden talep edilmelidir.
2. Teklifte aksi belirtilmedikçe montaj hizmeti dahil değildir.
3. Elektrik altyapısı ve gerekli saha hazırlıkları müşterinin sorumluluğundadır.
4. Ürünler teslim alındığında kontrol edilmelidir. Nakliye hasarları en geç 48 saat içinde yazılı olarak bildirilmelidir.
5. Teslimata hazır ürünlerin müşteri kaynaklı nedenlerle 15 günden fazla bekletilmesi durumunda günlük depolama bedeli yansıtılır.
6. Ürün demonte sevk edilir. Standart montaj kılavuzu dahildir. Canlı video desteği ve süpervizör yönlendirmesi ek ücrete tabidir.`,warranty:`1. Sistem iskeleti ve yapısal gövdesi: 10 yıl
2. Cam ve camlama sistemleri: 10 yıl
3. Su sızdırmazlığı: 10 yıl
4. Aksesuarlar ve sistem bileşenleri: 5 yıl
5. Motorlar, otomasyon ve işçilik: 2 yıl`,terms:`1. Teslimat Programı: Nihai teknik çizimlerin onayından itibaren 45 iş günü.
2. Ödeme Takvimi
  • %50 depozito: {DEPOSIT_50} — Sipariş onayında.
  • %30 ara ödeme: {PAYMENT_30} — Gümrük işlemleri sırasında.
  • %20 son ödeme: {PAYMENT_20} — Teslimatta.
  • Toplam sözleşme tutarı: {TOTAL}
3. Teklif Geçerliliği: {VALID_UNTIL} tarihine kadar.`}:{notes:e.specLines.map((r,i)=>i+1+". "+r).join(`
`),warranty:e.warrantyLines.map((r,i)=>i+1+". "+r).join(`
`),terms:"1. "+e.delivery+": "+e.deliveryText+`
2. `+e.payment+`
  • 50% `+e.paymentLabels[0]+`: {DEPOSIT_50}
  • 30% `+e.paymentLabels[1]+`: {PAYMENT_30}
  • 20% `+e.paymentLabels[2]+`: {PAYMENT_20}
  • `+e.payment+`: {TOTAL}
3. `+e.validity+": {VALID_UNTIL}"}}function c(a,e,r=!1){if(!r&&a.state==="FINAL"&&(a.documentIssuer?.documentProfileVersion||0)>=65)return a;const i=(m,o)=>m.trim().toLocaleLowerCase("tr-TR")===o.trim().toLocaleLowerCase("tr-TR"),t=!!(e.companyName&&(!a.issuerCompany||i(a.issuerCompany,e.companyName)||i(a.issuerCompany,e.documentBrandName))),l=a.documentIssuer?.name===a.issuerCompany?a.documentIssuer:void 0,n={documentTexts:e.documentTexts,documentTextLanguage:e.defaultLanguage,documentProfileVersion:67};return t?{...a,issuerCompany:e.companyName,documentIssuer:{name:e.companyName,displayName:e.documentBrandName||e.companyName,documentAssets:e.documentAssets,logoDataUrl:e.logoDataUrl,address:e.address,phone:e.phone,email:e.email,website:e.website,letterheadDataUrl:e.letterheadDataUrl,useLetterhead:e.useLetterhead,signatureDataUrl:e.signatureDataUrl,...n}}:l?a:{...a,documentIssuer:void 0}}async function y(a,e){if(!["image/png","image/jpeg","image/webp"].includes(a.type))throw new Error("PNG, JPG veya WebP görseli seçin.");if(a.size>5*1024*1024)throw new Error("Görsel en fazla 5 MB olabilir.");const r=await createImageBitmap(a);try{const i=r.width,t=r.height,l=e==="letterhead";if(i*t>25e6)throw new Error("Görsel en fazla 25 megapiksel olabilir.");if(l?i<1e3||t<1400||Math.abs(i/t-210/297)>.025:i<100||t<40||i/t<.35||i/t>10)throw new Error(l?"Antet dikey A4 oranında, en az 1000 × 1400 piksel olmalıdır.":"Logo en az 100 × 40 piksel olmalıdır. Çok dar veya çok uzun görsel seçmeyin.");const n=document.createElement("canvas");n.width=l?1240:e==="sidebar"?240:e==="signature"?600:900,n.height=l?1754:e==="sidebar"?120:300;const m=n.getContext("2d");if(!m)throw new Error("Görsel işlenemedi.");l&&(m.fillStyle="#fff",m.fillRect(0,0,n.width,n.height));const o=Math.min(n.width/i,n.height/t);return m.drawImage(r,(n.width-i*o)/2,(n.height-t*o)/2,i*o,t*o),n.toDataURL(l?"image/jpeg":"image/png",.9)}finally{r.close()}}export{u as d,y as n,c as w};
