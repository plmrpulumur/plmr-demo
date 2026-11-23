import fs from 'node:fs/promises';
import path from 'node:path';

/** Public connection metadata only. This is not an authentication or business-data adapter. */
export function validatePublicConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Bağlantı ayarı bir JSON nesnesi olmalı.');
  const allowed = new Set(['supabaseUrl', 'supabasePublishableKey', 'publicAppUrl']);
  if (Object.keys(input).some(key => !allowed.has(key))) throw Error('Bağlantı dosyasında yalnız public URL, publishable key ve uygulama yayın adresi bulunabilir.');
  if(input.publicAppUrl){
    let app;try{app=new URL(input.publicAppUrl)}catch(_){throw Error('Uygulama yayın adresi geçersiz.')}
    if(app.protocol!=='https:'||app.username||app.password||app.search||app.hash)throw Error('Uygulama yayın adresi yalnız HTTPS kök yolu olmalı.');
  }
  const url = input.supabaseUrl ?? '', key = input.supabasePublishableKey ?? '';
  if (typeof url !== 'string' || typeof key !== 'string') throw Error('Bağlantı değerleri metin olmalı.');
  if (!url && !key) return {configured: false, supabaseUrl: '', supabasePublishableKey: ''};
  if (!url || !key) throw Error('Supabase URL ve publishable key birlikte girilmeli.');
  let parsed;
  try { parsed = new URL(url); } catch { throw Error('Supabase URL geçersiz.'); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname)) {
    throw Error('Supabase için yalnız HTTPS proje kök adresini girin.');
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key)) {
    throw Error('Yalnız sb_publishable_ ile başlayan public anahtar kabul edilir; sunucu anahtarını kullanmayın.');
  }
  return {configured: true, supabaseUrl: parsed.origin, supabasePublishableKey: key};
}

export async function readPublicConfig(root, env = process.env) {
  const url = env.PLMR_SUPABASE_URL, key = env.PLMR_SUPABASE_PUBLISHABLE_KEY;
  if (url || key) return validatePublicConfig({supabaseUrl: url ?? '', supabasePublishableKey: key ?? ''});
  // Prefer the locally ignored override; in published GitHub builds use the tracked
  // public-only metadata file. Neither source may contain secret/service-role keys.
  for (const filename of ['supabase.public.local.json', 'supabase.public.json']) {
    try {
      return validatePublicConfig(JSON.parse(await fs.readFile(path.join(root, filename), 'utf8')));
    } catch (error) {
      if (error.code !== 'ENOENT') throw Error(filename + ' okunamadı veya geçersiz bağlantı değerleri içeriyor.');
    }
  }
  return validatePublicConfig({});
}
