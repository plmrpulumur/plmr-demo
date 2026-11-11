import type { MaterialImage } from "../domain/productMaster";
import { cloudCall, cloudEnabled } from "./cloudPlatform";
import {
  assertTenantReadable,
  assertTenantWrite,
  actorCan,
} from "./platformAccess";
let encoder: Promise<void> | undefined;
function ensureEncoder() {
  return (encoder ||= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "./assets/catalog-webp/entry.js";
    script.onload = () => resolve();
    script.onerror = () => {
      encoder = undefined;
      reject(Error("WebP modülü yüklenemedi."));
    };
    document.head.append(script);
  }));
}
export async function prepareCatalogImage(file: File, technical = true) {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 12 * 1024 * 1024
  )
    throw Error("En fazla 12 MB PNG/JPG/WebP seçin.");
  await ensureEncoder();
  const bitmap = await createImageBitmap(file);
  if (
    !bitmap.width ||
    !bitmap.height ||
    bitmap.width * bitmap.height > 40_000_000
  ) {
    bitmap.close();
    throw Error("Görsel boyutları çok büyük.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw Error("Görsel hazırlanamadı.");
  }
  const scale = Math.min(512 / bitmap.width, 512 / bitmap.height),
    width = Math.max(1, Math.round(bitmap.width * scale)),
    height = Math.max(1, Math.round(bitmap.height * scale));
  ctx.clearRect(0, 0, 512, 512);
  ctx.drawImage(
    bitmap,
    Math.floor((512 - width) / 2),
    Math.floor((512 - height) / 2),
    width,
    height,
  );
  bitmap.close();
  const data = await (window as any).PLMRWebP.encode(
    ctx.getImageData(0, 0, 512, 512),
    technical,
  );
  return new File([data], file.name.replace(/\.[^.]+$/, ".webp"), {
    type: "image/webp",
  });
}
export function blobData(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
export async function uploadCatalogImage(
  file: File,
  technical = true,
): Promise<MaterialImage> {
  const cid = assertTenantWrite();
  if (!actorCan("product.create") && !actorCan("product.edit"))
    throw Error("Görsel yükleme yetkiniz yok.");
  if (!cloudEnabled())
    throw Error("Görsel yüklemek için çevrimiçi uygulamayı açın.");
  const ready = await prepareCatalogImage(file, technical);
  const result = await cloudCall<MaterialImage>("catalog_media_upload", {
    companyId: cid,
    data: await blobData(ready),
    fileName: file.name,
    encoding: technical ? "lossless" : "photo",
  });
  if (assertTenantReadable() !== cid) throw Error("Firma değişti.");
  return result;
}
const urls = new Map<string, { expires: number; promise: Promise<string> }>();
function rememberMissing(key:string){
  urls.set(key,{promise:Promise.resolve(''),expires:Date.now()+60_000});
}
export async function catalogImageUrl(image: MaterialImage | null | undefined) {
  if (!image) return "";
  if (!image.storage) return image.dataUrl || "";
  const cid = assertTenantReadable();
  if (image.storage.companyId !== cid)
    throw Error("Görsele erişim yetkiniz yok.");
  if (!actorCan("product.view") && !actorCan("operations.view"))
    throw Error("Görsele erişim yetkiniz yok.");
  const key = cid + ":" + image.storage.id,
    old = urls.get(key);
  if (old && old.expires > Date.now()) return old.promise;
  if(urls.size>=1024)urls.delete(urls.keys().next().value!);
  const promise = cloudCall<{ url: string|null; missing?:boolean }>("catalog_media_url", {
    companyId: cid,
    id: image.storage.id,
  }).then((r) => {
    if (assertTenantReadable() !== cid) throw Error("Firma değişti.");
    if(r.missing){rememberMissing(key);return '';}
    return r.url||'';
  }).catch(error=>{
    if(error instanceof Error&&error.message==='CATALOG_IMAGE_NOT_FOUND'){rememberMissing(key);return '';}
    if(urls.get(key)?.promise===promise)urls.delete(key);
    throw error;
  });
  urls.set(key, { promise, expires: Date.now() + 240000 });
  return promise;
}
export async function productionImageMaterials(materials: any[], mode:'preview'|'output'='output') {
  return Promise.all(
    materials.map(async (m) => {
      const image = m.imageRef as MaterialImage | undefined;
      if (!image?.storage) return { ...m };
      const url = await catalogImageUrl(image);
      if(!url)return {...m,image:''};
      if(mode==='preview')return {...m,image:url};
      const response = await fetch(url);
      if(response.status===404){
        rememberMissing(image.storage.companyId+':'+image.storage.id);
        return {...m,image:''};
      }
      if (!response.ok) throw Error("Üretim görseli indirilemedi.");
      return { ...m, image: await blobData(await response.blob()) };
    }),
  );
}
