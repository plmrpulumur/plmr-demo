# PLMR FinalProcess V11

Hızlı yükleme: `hizliyukle.bat` dosyasını çalıştırın. Hedef `plmrpulumur/plmr-demo`, dal `main`. Ayrıntılar ve hata çözümü: [HIZLI_YUKLE_OKU.txt](HIZLI_YUKLE_OKU.txt).

Quick upload: run `hizliyukle.bat`. Target: `plmrpulumur/plmr-demo`, branch: `main`. See [HIZLI_YUKLE_OKU.txt](HIZLI_YUKLE_OKU.txt) for requirements, retained files and test limits.

Uygulama runtime'ı V10 ile byte eşittir. V11, yükleme/yayın paketi sürümüdür. GitHub Pages yalnız `_site` içeriğini alır. `npm run build` ve `npm run verify` Node.js 22+ ile yerelde de çalıştırılabilir. `npm start` mevcut yerel sunucuyu başlatır.

The application runtime is byte-identical to V10. V11 is the upload/publication package release. GitHub Pages publishes only `_site`. You can run `npm run build` and `npm run verify` with Node.js 22+ or use `npm start` for the local server.

Public bağlantı ayarı önceliği: ortam değişkenleri, `supabase.public.local.json`, `supabase.public.json`. Mevcut depodan yalnız public URL ve `sb_publishable_` anahtarı korunmuştur. İş verileri tarayıcıda kalır; merkezi Supabase Auth/veri senkronizasyonu eklenmedi.

Public connection priority: environment variables, ignored local file, tracked public file. Only the current public URL and publishable key are preserved. Business data stays in the browser; this package does not add shared Supabase Auth or data sync.

Gelecek uygulama arayüzü değişiklikleri TR+EN birlikte ve mevcut diğer dilleri koruyarak yapılır. Tam yedi dil kapsamı V10'dan kalan açık konudur.
Future application UI changes must include Turkish and English and preserve the other languages. Full seven-language coverage remains open from V10.
