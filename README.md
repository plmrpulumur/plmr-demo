# PLMR FinalProcess V12

Önce Supabase klasöründeki `hizliyukle.bat`, ardından bu klasördeki `hizliyukle.bat` çalıştırılır. Hedef: `plmrpulumur/plmr-demo`, `main`. GitHub Actions > Publish PLMR V12 sonucunu kontrol edin.

Node.js 22+ ve Git gerekir. `npm run build` statik siteyi `_site` altında hazırlar; `npm run verify` dosya/varlık/hash izin listesini doğrular. `npm start` HTTP yerel denemesini açar. Günlük kullanım yayımlanmış site üzerinden yapılır. Dosya olarak açılan index.html yerel test modudur.

HTTP(S) sürümü merkezi Supabase Auth ve `plmr-platform` kayıt servisini kullanır. Firma/cari/proje/dosya verisi tarayıcı veritabanına kaydedilmez. Public URL/anahtar kaynakta vardır; service_role/secret anahtarı yoktur. Bağlantı ayarı `supabase.public.json` içindedir ve uygulama kaynak derlemesinde de üretilir. Başka Supabase projesine geçiş tam kaynak derlemesi gerektirir; yalnız bu dosyayı değiştirerek mevcut runtime başka projeye taşınmaz.

Kısa sunum bağlantısı rastgele kimlik kullanır ve 30 gün geçerlidir. Linke sahip kişi girişsiz sunumu görür. Yeni sunum kurulum tamamlanmadan üretilmez; uzun veri URL'sine sessiz dönüş yoktur. localhost internetten erişilemez.

Eski yerel kayıtlar silinmez veya otomatik birleştirilmez. .plmr dışa aktar/aç akışı ile doğru firmaya proje aktarılabilir. Aynı hesapla son girişin geçerli olması mevcut Auth kuralıdır.

Yükleyici normal Git commit/push yapar, force/reset kullanmaz. Çatışmada durur. Yükleme araçları, cache ve yerel gizli dosyalar siteye girmez. Canlı dağıtım ve gerçek hesap testi kullanıcının yüklemesinden sonra yapılır.
