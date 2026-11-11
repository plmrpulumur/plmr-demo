# PLMR FinalProcess V46 kabul raporu

Başlangıç: GitHub main `8678bb308cbc4dd7b01fdb0605f4d8021790e784`.
Web çıktısı V45 staging paketiyle karşılaştırıldı. İlk okumada canlı
`plmr-platform` V42 idi. Başlangıç proje sayımı 3.002 satır ve 3.000
benzersiz pozisyon gösterdi. Mevcut veriler çalışma sırasında başka bir
işlemle temizlendi. Bu görev proje veya Storage nesnesi silmedi.

## Uygulanan değişiklikler

| Konu | Neden ve çözüm |
|---|---|
| Üretim listesi | V45 yerel indeksin tüm uygun projelerini ve pozlarını çiziyordu. V46 SQL, arama, filtre, sıralama ve toplamı firma ve kullanıcı kapsamında hesaplıyor. Sayfa beş özet döndürüyor. Pozlar genişletme ile, Excel verisi dışa aktarma ile yükleniyor. |
| Snapshot | Üretim kalemleri başlangıçtaki en büyük alan grubuydu. V46 özetinde ürün bazında poz sayıları var. Pozlar istek üzerine okunuyor, özet üzerinden yazmada sunucu eksik alanı koruyor. Proje Merkezi başlangıçta kompakt firma indeksini kullanmaya devam ediyor. |
| Sıra tahsisi | Uygulama DB sequence kullanıyordu. İlk canlı sayımda sequence 2.113, maksimum pozisyon 5.106 idi ve iki konum çakışıyordu. Migration benzersiz indeks ekliyor ve tenant kilidi altında yeni konumu mevcut üst sınırın ilerisine alıyor. Çakışma onarımı yalnız fiziksel sıralamayı değiştiriyor. |
| Katalog ve üretim formu | Eksik medya satırı V45'te 400 üretiyor ve üretim önizlemesinin Promise zincirini durduruyordu. V46 eksik nesneyi kontrollü boş medya olarak ele alıyor, 60 saniye olumsuz önbelleğe alıyor ve teknik verileri koruyor. Başka firmaya ait istek yine reddediliyor. |
| Zone H | Tek seçim, Ctrl ile seçilen zone listesi ve genel açıklama seçimi farklı durumlardaydı. H işlemi ortak zone görünürlük filtresine doğru kimlikleri iletiyor. |
| Teklif işlemleri | Teklif ekranı onay bileşenini yalnız ilk aşama modunda kullanıyordu. Dört onay, iptal ve arşivleme aynı proje verisini ve onay kurallarını kullanıyor. |
| Proje dosyaları | Dosya listeleme ACK beklerken her açılışta uyarı gösterebiliyordu. Uyarı yalnız bekleyen kayıt geciktiğinde görünür. Liste okuması proje başına birleştirilir ve kısa süre yeniden kullanılır. |
| Dashboard | Son 7 gün İstanbul takvimine göre bugün dahil yedi tarih. Teklif kaynak kimliği, yoksa teklif kimliği kullanılır. Aynı teklifin tekrarlanan projeksiyonu bir kez sayılır. Bağımsız SQL ölçümü sentetik veride yapıldı. Eski 3.601 sayısının ayrıntılarını yeniden kontrol etmek için eski veri seti gerekir. |
| Bioclimatic 2D/DXF | Üretim sayfasındaki ortografik matematikte ön ve arka aynı yatay işareti kullanıyordu. Dışa bakan cephenin sağ ekseni dış normalden türetiliyor. Üst görünüş X/−Z, ön X/Y, arka −X/Y kullanıyor. |
| Yükleme etiketi | Kullanıcıya gösterilen metin `PLMR Çizim Motoru Yükleniyor` olarak değiştirildi. |

## Canlı PostgreSQL karşılaştırması

`live-scale-rollback.sql`: aynı 3.001 sentetik proje, 33.011 üretim
pozisyonu, her işlemde 10 kayıtlı örnek. SQL süreleri ağ, Edge ve
tarayıcıyı içermez. Baytlar SQL JSON metnini gösterir.

| İşlem | p50 | p95 | Yanıt |
|---|---:|---:|---:|
| V45 Snapshot | 572,62 ms | 969,99 ms | 8.993.480 B |
| V46 kompakt Snapshot | 125,41 ms | 204,04 ms | 1.599.189 B |
| V46 Üretim ilk 5 | 252,30 ms | 286,45 ms | 2.150 B |
| V46 Üretim arama | 725,35 ms | 743,17 ms | 517 B |

Canlı testten sonra sentetik kapsamda kalan satır sayısı 0.
V45'in kullanıcının bildirdiği canlı Edge p95'i 9,21 saniyeydi.
Bu tarihsel Edge değeri V46 SQL süresiyle doğrudan karşılaştırılmaz.

## Durum

- **VERIFIED · canlı DB:** Migration `20261111110424` kurulu. Benzersiz
  indeks geçerli. Liste ve kompakt indeks RPC'leri yalnız service role için.
  SQL ölçek testi ve sentetik bağımsız teklif sayımı tamamlandı.
- **VERIFIED · canlı Edge dağıtımı:** `plmr-platform` V43. İndirilen
  fonksiyon içeriği dağıtılan bundle ile birebir eşleşti.
- **VERIFIED · izole DB:** 3.001 proje için çakışma onarımı, kod ve kimlik
  sayıları, üst sınırdan sıra tahsisi, kayıp olmadan özet yazma, firma
  ve rol sınırları, sayfalama ve pozların isteğe bağlı okunması.
- **VERIFIED · Chromium:** 3.001 projelik kontrollü HTTP yanıtında ilk
  beş, sonraki beş, son projeyi arama ve açılan satırın poz çağrısı.
  Bir başlangıç Snapshot'ı, üç liste ve bir poz isteği. Tek çalışma
  ortamındaki ilk sayfa ölçümü 6.206 ms. Canlı kullanıcı bağlantısı
  veya üretim p95'i olarak kullanılmaz.
- **AÇIK:** Gerçek hesapla canlı uçtan uca Egress/p50/p95 ve fiziksel
  Storage yükleme/indirme örneklemi. Eski test verileri ve nesneleri
  çalışma sırasında temizlendi. Canlı HTTP isteği için geçerli kullanıcı
  oturumu bu oturumda bulunmadığından performans sonucu SQL düzeyinde.
