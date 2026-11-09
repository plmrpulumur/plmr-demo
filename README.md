# PLMR FinalProcess V38

GitHub Pages hedefi: `plmrpulumur/plmr-demo`, `main`. Bu klasör hazır web uygulaması ve yayın araçlarıdır.

ZIP'i tamamen çıkarın. GitHub için `hizliyukle.bat`, güncel sunucu için kardeş `supabase/hizliyukle.bat` çalıştırın. Bu sürümde **iki taraf da güncellenmelidir**. Supabase yeniden kurulmaz, mevcut proje güncellenir. Kullanıcı/firma/PIN/iş verileri sıfırlanmaz.

GitHub yüklemesi Git for Windows ve Windows PowerShell 5.1 gerektirir; BAT için Node.js gerekmez. Depoya yazma yetkisi olan GitHub hesabını kullanın. Normal commit/push yapılır; force/reset yoktur. Merge çatışmasında kopyalama durur. İlgisiz uzak dosyalar korunur. Kullanıcı kararıyla yalnız eski `assets/production` ve `assets/production-v49` klasörleri artık kaldırılır.

Katalog görselleri firma bazlı özel Supabase Storage üzerinden okunur. Yerel katalog görseli veya seed çalışma zamanına eklenmez. Üretim hesabının gerekli dört betiği `runtime/production` altındadır; bunlar mevcut formu çalıştırır.

GitHub Settings → Pages → Source: GitHub Actions. Actions bölümündeki Publish PLMR V38 sonucunu kontrol edin. Başarılı push tek başına canlı yayın kanıtı değildir. İş akışı Node.js 24 ile `npm run build` ve `npm run verify` çalıştırıp yalnız doğrulanan `_site` klasörünü yayımlar.

Yerel HTTP için Node.js 22+ ile `npm start`; yayın dosyası hazırlamak için `npm run build && npm run verify`. Public bağlantı `supabase.public.json` içindedir. Gizli anahtar/PIN/token bu klasöre eklenmez. Bağlantıyı değiştirmek kaynak derlemesini de gerektirir.

Bu teslimde gerçek GitHub push ve Windows BAT çalıştırılmadı. Yerel build, yayın manifesti/varlık kontrolü ve tarayıcı testleri ana paketteki güncel devir notunda belirtilir. Canlı dağıtım ve kimlikli kabul ayrı doğrulanmalıdır.
