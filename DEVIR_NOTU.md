# PLMR JustPergola V15 — tek güncel devir

**Sürüm:** 15.0.0, teslim adı `PLMR_JustPergola_v15.zip`. **Durum:** DEVELOPMENT / kısmi doğrulama. Zorunlu CAD ve ticari entegrasyon kabulleri karşılanmadı; hedef tamamlandı sayılmaz. Canlı dağıtım, migration, gerçek veri silme/yazma yapılmadı.

## Doğrulanmış başlangıç ve kaynak

- Kullanıcı V14 ZIP SHA-256: `fa84ac53359b1421a53899ab9ce41ac0a33410f14513be51521bb17a33562e8c`. Özgün ZIP ve başlangıç çalışma kopyası korunmuştur.
- Ana uygulama: kullanıcının doğruladığı `plmrpulumur/plmr-demo`, main başlangıç commit'i `4430d5f4013159236d4a5a0856b1c15eb6442d56`, paket 51.0.0. V51 ZIP'i 32 MiB aktarım sınırı nedeniyle okunamadı; depo kaynak olarak yetkilendirildi.
- Düzenleme kaynağı `Development_Protocol/peri01`, `source`, `shared`. Runtime `Uygulama`. Sadece üretilmiş dosyalara yama yapılmadı; aynı build betiği kullanıldı.
- Kaynak değişiklik hashleri `Development_Protocol/V15_CHANGED_SOURCES.json`; runtime `Uygulama/SOURCE_SHA256.json`; paket `PACKAGE_SHA256.json`.
- Ana dal/bundle/patch bilgisi `Entegrasyon/GIT_STATE.json`. Dal `codex/justpergola-v15`; remote main'e push/merge yapılmadı, PR oluşturulmadı.

## Gerçek düzeltmeler

1. Gizlenen ara ölçü menüden düşüyordu. Menü fiziksel görünürlükten ayrıldı; gizli ölçü listede kalıyor ve yinelenen ölçü kimlikleri tek satırda gösteriliyor. V14'te hata yeniden üretildi, V15'te aynı akış geçti.
2. DXF ilişkileri yalnız köşe noktalarını arıyordu. Gerçek düz profil kenarı iç noktaları ve LINE uçları desteklendi; polyline referansı için kenar marker'ı, parametre ve WCS noktası yazılıyor. Sağ/sol görünüş, sistem ve karşı kanat sınırı korunuyor. 70 gerçek DIMENSION içinde 33 yapısal/koordinat bağı var; V14'te 31 idi. 37 ölçü hâlâ bağlantısız.
3. Ana geçmiş boş Pergola durumuna döndüğünde veya hassas model temizlendiğinde eski sahne/2D çizim/seçim kalmaması için model temizleme yolu eklendi. Eski assembly ve çelik duvar kökü temizleniyor, ölçü kökü güncelleniyor.
4. Mevcut V51 ürün kayıt arabirimine Pergola çalışma alanı bağlandı. Ana model snapshot'ı ve history tek kayıt sahibidir; metadata ana projeden alınır. Beklenen mevcut model karşılaştırması eski değişikliğin üstüne yazmayı reddeder. Kilit fiziksel yazmayı engeller.
5. Mevcut ana `.plmr` indirme/açma, native SVG ve görüntü/camera olayına bağlantı geliştirildi. Ana proje kodu/revizyonu native antette güncelleniyor; ayrı müşteri kaydı oluşturulmuyor. Desteklenmeyen 3D PDF/animasyon/feet ve birleşik ürün çıktıları başka motordan yanlış çıktı üretmeden açıkça durdurulur.

6. İlk görünüm/birim değişiminde `null` sahnenin varsayılan fiziksel sahneye dönüşmesi snapshot'ı değişmiş gösteriyordu. Görünüm verisi ayrılmadan önce tek native sahne sahibiyle kanonikleştirme yapıldı. Gerçek ana mm/inch kontrol testi, fiziksel workspace'in birebir korunduğunu ve native CAD stilinin değiştiğini doğruladı.

7. Native ölçü editöründeki Gizle işleminin geri gösterme düğmesi eski gizli toolbar'da kalıyordu. Aynı native düğüm/komut mevcut ölçü menüsüne taşındı; yeni kayıt sistemi kurulmadı. Gerçek seç/Gizle/Gizli Ölçüleri Göster turu 2D, 3D ve DXF'de geçti.
8. Boş modele dönüşte store temizliği eski form girdilerini bırakıyordu. Var olan snapshot-restoration yolu boş modele de uygulanır; boş undo sonrasında Yenile eski modeli geri getirmiyor. Gelen yeni snapshot'ta eski native editörler kapatılır. Metadata yenilemesi fiziksel snapshot yüklemeden yapılır.

## Korunan kararlar

Normal ray +30 mm; Curve-Quad iki dış uç +30/+30 mm. Gerçek arka alt montaj deliği hizası, arka görünüşün üstte yerleşimi, standart sağ görünüş ve Curve-Quad plan adı merkezi korunur. Özgün referans DXF/native bloklar byte olarak korunmuştur. Gerçek V14 ile 63 fiziksel 2D/3D ürün/yerleşim karşılaştırması geçti. Ana React runtime ve mevcut CSS/sol menü değiştirilmedi. Standalone proje şeması 3, ana snapshot şeması mevcut sürümünde kaldı. Yeni tablo/reset/migration yok.

## Çalıştırma ve doğrulama

```sh
python3 Development_Protocol/build.py
python3 -m http.server 8000 --directory Uygulama
# http://localhost:8000
python3 -m pip install -r Test-Mantik/requirements.txt
python3 Test-Mantik/run-v15-checks.py --full --out work/checks
```

Test bağımlılıkları yalnız doğrulama içindir; uygulamaya yeni npm bağımlılığı eklenmedi. Playwright kurulum ve gerçek tarayıcı komutları `Test-Mantik/KABUL.md` içinde; ana repo build/test komutları `BAGLANTI_REHBERI.md` içinde. Browser testinde file:// yönetici politikası nedeniyle HTTP kullanıldı. Linux Chromium + ANGLE/SwiftShader gerçek yazılımsal WebGL'dir; donanım GPU kanıtı değildir.

Güncel kabul: `Test-Mantik/KABUL.md`; kanıtlar `Test-Mantik/v15-output`. 378 model senaryosu, 63 vaka/2009 geometri assertion'ı, 56 görünüş vakası, 27 ürün/birim DXF vakası, 30 gerçek arayüz ürün/yerleşim senaryosu ve 9 ürünün bağımsız DXF/PDF/DAE kontrolü geçti. Tekrar koşularının assertion'ları yeni kapsam diye toplanmadı. Gerçek çelik silme/yenileme/undo/redo/kayıt/kapat/aç hem 3D hem 2D başlangıcından çalıştırıldı; bireysel ve tüm ölçü görünürlüğü kayıt/aç ve çıktıyla kontrol edildi.

Ana motor testi gerçek V51 motorunu, sentetik üst pencere bağlamıyla çalıştırır. Ana snapshot ve yerel dosya kayıt/aç/geçmiş/kilit geçti; gerçek kullanıcı/firma ile React → Supabase iş kaydı/revizyon/teklif/üretim turu değildir. Yayımdaki Edge kaynakları salt okunur alındı; sentetik backend birim testleri canlı oturum testinin yerine geçmez.

## Kritik açık kabuller ve sonraki adım

1. **CAD:** 37 ölçü için güvenli geometri ilişkisi açık. Kalan native INSERT alt öğeleri, ARC ve datum/ofset ilişkileri araştırılmalı. Mevcut 33 bağın doğru parçayı AutoCAD STRETCH ile takip etmesi ve kayıt/aç davranışı da sınanmadı. `Test-Mantik/DXF_ACIK_ISLER.md` ve `autocad/KABUL.md` devam kaydıdır. ezdxf referans yorumlayıcısı AutoCAD reaktörü değildir. Native hizalı/açısal CAD kabulü açık; mevcut diyagonal sabit açılı doğrusal yazım korundu.
2. **Ticari entegrasyon:** Kullanıcı Andes/Avila çeşitlerinin ayrı ticari ürün olmasını kararlaştırdı. Antero kimliği kullanılmaz. UUID/kod, fiyat/üretim kuralları ve mevcut merkezi istemci/sunucu resolver eşlemesi tanımlanmadı. Yerel sunucu mantığı yeni anahtarları reddediyor; gerçek iş kaydı/teklif/üretim başarısı iddia edilemez.
3. **Ana kaynak:** Main V51'de prebuilt React dosyaları var. Git geçmişi/yedeklerdeki V46 kaynakları kısmi; eksik giriş/domain/build dosyaları nedeniyle güncel V51 istemcisi yeniden derlenemiyor. Supabase'den alınan platform v54 bundle'ı tam geliştirme ağacı değildir. `Entegrasyon/SOURCE_ACCESS.json` bulunan ve eksik yolları kaydeder. V51 ZIP'inin erişilebilir indirme kaynağı veya tam geliştirme ağacı geldiğinde mevcut V51 davranışları korunarak ticari bağlantı tamamlanmalı.
4. **Kimlikli kabul:** Gerçek test kullanıcılarıyla firma/rol/PIN, sunucuda yarış/atomiklik, kilit/revizyon, eski onaylı kayıt bütünlüğü ve üretim kabulü yapılmadı. Eşzamanlı kullanıcı oluşturma/koltuk sınırı da açık. `Entegrasyon/SUPABASE_INCELEME.md` kaynak kapsamını belirtir.
5. **Kapsam sınırı:** Başka ürünlerle birleşik teknik çıktı, Pergola 3D PDF ve mevcut bağımsız modülde henüz bağlanmamış cephe ürün montajı/sahne paylaşımı tamamlanmadı. Bunlar gizli başarı olarak sunulmadı.

Bu teslimden sonraki kod güncellemesi V16 olarak sürümlenmelidir; doğrulama statüsü sürüm numarasından ayrıdır.

Sonraki çalışma bu açık kabullerden devam etmeli; geçmiş sürümlerin PASS kayıtları yeni kanıt yerine kullanılmamalı. Kod ve paket hazır olması, bütün görev hedefinin tamamlanması değildir.
