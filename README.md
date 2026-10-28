# PLMR FinalProcess V21 — RC

GitHub Pages hedefi: `plmrpulumur/plmr-demo`, `main`; yayın tabanı `/plmr-demo/`.
Supabase zaten kuruludur. Bu sürüm için eski Supabase yükleyicisini çalıştırmayın. V21 trafik iyileştirmesi ayrı Edge güncellemesi içerir; kontrollü yayın sırası ve canlı PT409 koruması için paket kökündeki `DEVIR_NOTU.md` ve `Uygulama/supabase/ONCE_OKU_V21.md` belgesini izleyin. Bu RC canlıya yayımlanmadı.

ZIP'i tamamen çıkarıp `Uygulama/github/hizliyukle.bat` dosyasını çalıştırın. Git for Windows ve Windows PowerShell 5.1 gerekir. GitHub hesabınızın depoya yazma yetkisi olmalı. BAT için Node.js gerekmez. Yükleyici normal commit/push kullanır; uzak-only dosyaları silmez, force/reset yapmaz ve merge çatışmasında kaynak kopyalanmadan durur. Aynı adlı kaynak dosyaları güncellenir. İşlemin ayrıntıları `HIZLI_YUKLE_OKU.txt` içindedir.

GitHub Settings → Pages → Source: GitHub Actions. Actions bölümünde `Publish PLMR V18` iş akışının başarılı olmasını bekleyin. İş akışı Node.js 24 ile `npm run build` ve `npm run verify` çalıştırır; yalnız doğrulanan `_site` dizinini yayımlar. Başarılı push tek başına yayın kanıtı değildir.

Yerel HTTP denemesi için Node.js 22+ ile bu klasörde `npm start` çalıştırın. `npm run build` yayın kopyasını, `npm run verify` dosya/varlık/hash denetimini üretir. `index.html` dosyasını çift tıklamak farklı, yerel dosya modudur; bulut giriş kabulü sayılmaz.

HTTP(S) uygulama `yackwdxdyajejtdxvncu` Supabase projesini kullanır. Kullanıcı adı/PIN formu mevcut `admin-users` servisine; kullanıcı, firma ve iş kayıtları `plmr-platform` servisine bağlanır. Yeni yönetici oluşturulmaz. Mevcut Aytug hesabını kullanın. Aynı kullanıcıyla ikinci tarayıcıdan giriş yapmak önceki oturumu geçersiz kılabilir. Eski tarayıcı iş verileri silinmez veya otomatik taşınmaz.

Public bağlantı `supabase.public.json` dosyasından tam uygulama derlemesine gömülür. Yalnız JSON değiştirmek çalışan uygulamanın bağlantısını değiştirmez. Gizli anahtar, PIN veya kullanıcı tokenı bu klasöre konmamalıdır.

Kısa sunum bağlantıları mevcut yetki ve 30 gün kurallarıyla çalışır. localhost bağlantısı internetten erişilemez. İlk yayın sonrasında mevcut Aytug/PIN girişi, yenileme, çıkış ve temiz tarayıcı girişi normal uygulama formundan kontrol edilmelidir. Gerçek PIN ve canlı Pages kabul durumu kökteki DEVIR_NOTU.md içinde ayrı belirtilir.
