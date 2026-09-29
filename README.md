# PLMR V47 RC — Giyotin çizim düzeltmeleri

Sürüm: **10.47-r47**. Çalışma kaynağı: V46. Durum: **RC**.

ZIP'i yeni bir klasöre tamamen çıkarıp GitHub/index.html dosyasını açın. Giyotin, geçerli ölçülerle doğrudan **3D** modunda ve **kapalı** başlar; 2D düğmesi kullanılabilir. Kod düzenlemesi veya uygulama için npm kurulumu gerekmez.

## Uygulanan düzeltmeler

- Dosyadan açılışta file:// origin kullanılarak gönderilen/alınan mesajların reddedilmesi düzeltildi. file: için uygun mesaj hedefi kullanılır; gönderen pencere, şema, ürün ve oturum kontrolleri korunur. HTTPS için tam origin eşleşmesi sürer.
- Giyotin önizlemesi ana çatı ürününün eksik ölçü ekranını başlangıç olarak kullanmaz. Bağlantı bekleme/hata durumu açıklanır. Bağlantı denemeleri tükendiğinde Çizimi Oluştur yeniden deneme başlatır.
- Genişlik kasa dıştan dışa, yükseklik motor kutusu dahil toplam ölçüdür. Bağımsız çizimde eski 5 mm montaj boşluğu düşümü uygulanmaz. Çatı/cephe girdileri istenmez; seri seçimi şimdilik A serisiyle bypass edilir.
- İlk görünüm kapalıdır. Standart tip açıldığında paneller aşağı toplanır; ilk sabit panel yerinde kalır. Aç/Kapat düğmesi ve poz üzerindeki çift tıklama mesajı kendi Giyotin durumuna bağlandı.
- Alt Panel ve Gösterim satırları Giyotin ortak/poz seçeneklerinde gizlenir; görünüm hareketleri çizimden yönetilir.
- Sağ/sol seçilen bakışa göre hesaplanır. İç bakışta ürün kendi merkezi etrafında çevrilir; MOTOR ve İÇ BAKIŞ etiketleri iç yüzde, motor kutusu orta yüksekliğinde görünür. Dış bakışta DIŞ BAKIŞ etiketi dış yüzdedir.
- Yüzey seçiminin küçük renk örnekleri seçilen RAL rengini kullanır; sabit gri önizleme kaldırıldı.
- Çoklu pozlar 2, 3 veya 4 sütun dahil seçilen sütun sayısıyla yerleşir. Tek poz merkezlenir; farklı ölçülerdeki pozlar için satır/sütun boşlukları korunur.

## Doğrulama sınırı

**14/14 kaynak entegrasyonu ve gerçek Three.js CPU geometri testi geçti.** Değişen 7 JavaScript dosyası sözdizimi kontrolünden geçti. DOM/canvas/renderer/controls test uyarlayıcılarıdır; gerçek tarayıcı/GPU görüntüsü doğrulanmış değildir.

Kullanıcının V46 ekran görüntüsündeki kırmızı mesaj, 3D görüntüleyici hazır yanıtının alınamadığını gösteriyordu. V46'nın file:// yerel origin ile null mesaj origin birleşiminde INIT mesajını reddettiği testte yeniden üretildi. V47 aynı testte hazır yanıtı ve çizim durumunu aktarır. Bu, belgelenmiş bir kaynak/iletişim hatasının düzeltmesidir; kullanıcının tarayıcısında sonucun görsel kabulü henüz yapılmadı.

Önceki gerçek tarayıcı girişimleri ortamın yerel HTTP/file gezinme politikasıyla engellendi. Bu sınır aşılmadı. Network, aktif Service Worker/cache ve gerçek GPU testi için PASS iddiası yoktur. Test konsolundaki önceden mevcut Three.js transmission uyarısı sürer.

2D geometri adapteri, yerleşim motoru, PDF/DXF dışa aktarımı, çekirdek proje modeli ve üretim paketi dosyaları korunmuştur. Giyotin standalone seçenek normalizasyonu, onaylanan seri/kapalı başlangıç kuralları için değişmiştir. Çizen/auth konusunda yeni kabul iddiası yoktur.

Testler ve kanıtlar: PLMR Development Protocol/tests/v47/. Güncel devam notu: PLMR Development Protocol/PROJECT-CHECKPOINT.md. Önceki sürüm raporları V47 gerçek tarayıcı kabulü sayılmaz.
