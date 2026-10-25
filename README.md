# PLMR FinalProcess v10 — GitHub / Supabase hazırlığı

`Uygulama/github` klasörü GitHub deposunun **kökü** olacak şekilde hazırlanmıştır. Yayın hesabı: **aytugkilinc@plmrsolutions.com**. GitHub kullanıcı adın, depo adresin, Supabase proje ref'in ve public anahtarın henüz verilmedi; bunlar uydurulmadı.

Seçtiğin kapsam **yayın ve bağlantı hazırlığıdır**. Uygulama internette statik çalışır; kullanıcı/firma/proje/teklif ve Bulut ekranının mevcut kayıtları tarayıcı depolarında kalır. Bu paket Supabase Auth ile uygulamaya giriş veya iş verilerinin ortak bulut senkronizasyonunu devreye almaz. Supabase bağlantı ayarları, kontrol komutu ve isteğe bağlı private Storage kurulumu hazırdır.

## Klasörün kullanımı

- `index.html`, `assets/`, `drawing-engine/`: çalışır, önceden derlenmiş uygulama.
- `.github/workflows/pages.yml`: GitHub Pages yayını.
- `scripts/`: izinli statik yayın paketi ve bağlantı kontrolü; ek npm bağımlılığı yok.
- Supabase SQL/CLI kurulumu ayrı `Uygulama/supabase/` klasöründedir; site dosyalarının arasında değildir.
- `supabase.public.example.json`: public bağlantı ayarı şablonu.
- `_site/`: `npm run build` ile üretilir; GitHub'a kaynak olarak gönderilmez. Workflow aynı klasörü kendisi üretir.

`Development_Protocol`, test sonuçları, kullanıcı referans projeleri ve eski sürüm notlarını bu depoya koyma. Değiştirilebilir React/native kaynaklar tam teslim paketinin `Development_Protocol/` klasöründedir. Yeni bir uygulama sürümünde oradan derlenmiş `Uygulama/github` içeriğini bu depoya güncellersin. `_site` yalnız statik dosyaları içerir; Supabase SQL, yerel ayarlar ve Node sunucu dosyaları sitede yayınlanmaz.

## 1. Yerelde aç

`index.html` dosyasını Chrome/Edge ile açabilirsin. Yerel sunucu için Node.js22+ veya24LTS kurulu olmalı; `BASLAT_WINDOWS.bat` ya da bu klasörde `npm start`. Adres `http://127.0.0.1:41760/`.

## 2. GitHub'a yükle

1. GitHub'a **aytugkilinc@plmrsolutions.com** hesabınla giriş yap. Bu e-posta GitHub kullanıcı adı değildir; URL'de gerçek kullanıcı adını kullan.
2. Örneğin `plmr-finalprocess` adlı depo oluştur. GitHub Pages kullanılabilirliği hesabın/deponun görünürlük planına bağlıdır; yönetim panelindeki Pages seçeneğini kontrol et.
3. **Yalnız `Uygulama/github` klasörünün içeriğini depo köküne** koy. Depo kökünde `index.html`, `package.json` ve `.github` bulunmalı.
4. GitHub Desktop'ta bu klasörü yerel depo olarak ekleyip `main` dalını yayınlamak uygundur. Windows'ta `.github` noktalı klasörünü de gönder. Tek dosyalık web yükleme sınırlarına takılmamak için GitHub Desktop/Git kullan.
5. Depoda **Settings → Pages → Build and deployment → Source: GitHub Actions** seç.
6. `main` dalına yükleme yapınca `Publish PLMR` akışı site paketini üretir, doğrular ve Pages'e yollar. Tekrar için **Actions → Publish PLMR → Run workflow**.
7. Adres `https://GERCEK_KULLANICI_ADIN.github.io/DEPO_ADIN/` biçimindedir; kesin adres Pages/Actions sonucunda görünür. Uygulama alt klasör adresinde çalışacak şekilde yerelde sınandı.

Supabase değerlerini henüz eklememiş olsan da site mevcut tarayıcıda çalışan haliyle yayınlanır. Özel alan adı veya mevcut plmr.solutions sitesinin DNS'i bu hazırlıkta değiştirilmez.

## 3. Supabase projesini hazırla

Ayrı `Uygulama/supabase/README.md` rehberini kullan. SQL/CLI dosyaları `Uygulama/supabase/supabase/` içindedir. SQL dosyalarını GitHub Pages deposuna yüklemene gerek yoktur; Supabase bir statik uygulama dosyası barındırıcısı olarak kullanılmaz. Yönetim hesabı **aytugkilinc@plmrsolutions.com**. Bu hazırlık iş verilerini veya uygulama girişini Supabase'e taşımaz.

## 4. Public bağlantı ayarını gir ve kontrol et

Yerelde `supabase.public.example.json` dosyasını `supabase.public.local.json` adıyla kopyala. İki boş alanı gerçek URL ve publishable key ile doldur. Bu yerel dosya `.gitignore` içindedir.

Bu klasörde:

```
npm run connection:check
npm run build
npm run verify
```

Bağlantı kontrolü yalnız Supabase'in public Auth ayar uç noktasına GET gönderir; veri/hesap oluşturmaz. Henüz URL/anahtar yoksa başarı iddia etmez. `build`, public bağlantı bilgisini `_site/plmr-public-config.json` içine yazar; uygulamanın iş verisi modunu değiştirmez.

GitHub yayını için yerel dosya yerine **Settings → Secrets and variables → Actions → Variables** alanında iki Repository Variable ekle:

| İsim | Değer |
|---|---|
| `PLMR_SUPABASE_URL` | gerçek `https://…supabase.co` proje adresi |
| `PLMR_SUPABASE_PUBLISHABLE_KEY` | gerçek `sb_publishable_…` anahtarı |

Sonra Pages workflow'unu yeniden çalıştır. Anahtarlar public türdedir; yine de parola, erişim token'ı veya veritabanı şifresini bu alanların yerine koyma. Workflow otomatik Supabase SQL çalıştırmaz ve Supabase hesabına erişmez; SQL'i sen uygularsın.

## Veri ve mevcut özellikler

- Yeni web adresi, `file://` ve localhost farklı tarayıcı depolarına sahiptir. Eski kayıtlar otomatik taşınmaz; mevcut `.plmr` indir/aç yolu ile çizimleri taşıyabilirsin. Yerel kayıtlar bu paketle silinmez. Aynı web adresinde tarayıcıyı/cihazı değiştirince kayıtlar kendiliğinden paylaşılmaz.
- DXF/DAE/PDF ve çizim işlemleri tarayıcıda çalışır. GitHub Pages statik paketi animasyon sunum verisini URL içinde taşır; alıcı uygulama hesabı olmadan açabilir. Bu bağlantı uzun olabilir ve bir sunucuya kaydedilmez. `npm start` yerel Node kısa bağlantısını destekler; localhost linki başka bir bilgisayardan internette açılmaz. İnternette kısa bağlantı için uyumlu backend gerekir. İki yol ayrı alıcı oturumlarında yerelde sınandı; canlı URL doğrulaması yayın sonrasındadır.
- Bu teslimde uzak GitHub/Supabase yüklemesi veya canlı alan adı testi yapılmadı. Yerel statik paket, alt yol WebGL açılışı ve bağlantı kontrolünün hata/başarı sözleşmeleri sınanır. Gerçek URL/anahtar doğrulamasını sen kurulum sırasında `connection:check` ile yaparsın.

## Resmî kaynaklar —25.10.2026 kontrolü

- [GitHub Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Pages yayın kaynağı](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [Supabase API anahtarları](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase Storage erişimi](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase CLI](https://supabase.com/docs/reference/cli/global-flags)

## V10 kullanım ve dil kuralları

Arayüz dilleri TR, EN, DE, FR, RO, NL, SR sırasındadır. Arayüz dili, teklif belgesinin dili değildir. Dil değişimi mevcut projeyi yeniden başlatmaz. Kullanıcı adını hatırlama ve PIN kaydı ayrıdır; PIN düz metin depoya yazılmaz, tarayıcı parola yöneticisi kullanılır. Eksiksiz SaaS kimlik doğrulaması ve iş verisi senkronizasyonu henüz bağlı değildir.

Bundan sonraki her arayüz değişikliği Türkçe ve İngilizce birlikte yapılmalıdır. Çeviriler geliştirme kaynağındaki `i18n/messages.tsv` dosyasından derlenir; dağıtılmış HTML veya generated JS elle değiştirilmez. Diğer beş dilde mevcut çeviriler korunur. Yeni metin eklendiğinde yedi dilin satırları tamamlanır ve açık proje/form korunumu tekrar sınanır.
