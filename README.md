# PLMR FinalProcess V74

Bu klasör hazır PLMR web uygulaması ile `plmrpulumur/plmr-demo` deposunun `main`
dalına yükleme araçlarını içerir. BAT çalıştırmak canlı depoya push yapar.

Tam ZIP'i yeni klasöre çıkarın. Önce `02_SUPABASE/hizliyukle.bat`, ardından
`01_APPLICATION/hizliyukle.bat` çalıştırılır. V72 yeni SQL migration eklemez;
V64 dahil 26 migration ve `verify-v64.sql` şema kapısı korunur. Migration güncellemek
veri sıfırlamaz. `-EdgeOnly` yalnız tüm şema kontrolleri geçiyorsa kullanılabilir.

V72: firma bazlı ayrı arayüz/teklif dili ve giriş/çizim birimi tercihleri; ürün
türüne göre Bioclimatic ayarları, cam/levha panel-bölme seçimi, sabit panel yüksekliği,
ortak teklif detayları ve sunum adı düzenlemesi. Frontend ve Edge aynı paketten
yüklenir. Yeni SQL/reset yok; mevcut sahne ve ticari akış korunur.

GitHub yükleyicisi Windows PowerShell 5.1 ve Git for Windows gerektirir. Başlık ve
commit etiketi package.json sürümünden türetilir; web kimliği/hashler Git işlemlerinden
önce doğrulanır. Yerel commitler normal commit/merge akışıyla korunur; force/reset
kullanılmaz. İlgisiz uzak dosyalar korunur. Önceki karara göre yalnız
assets/production ve assets/production-v49 kaldırılır; runtime/production korunur.

Pages Source: GitHub Actions. Publish PLMR iş akışında build ve deploy ayrıdır;
deploy needs: build kullanır. Node.js 24; checkout 7.0.1, setup-node 7.1.0,
configure-pages 6.0.0, upload-pages-artifact 5.0.0, deploy-pages 5.0.1.
Build → dosya doğrulama → tek upload → deploy sırası vardır. Artifact adı
`github-pages-<run_id>-<run_attempt>` olur ve aynı ad deploy işine aktarılır.
Eski başarısız çalışmada Re-run jobs kullanmayın: Publish PLMR → Run workflow
ile YENİ çalışma başlatın veya yeni commit gönderin. Eski run tekrarı reddedilir.

Yerel yayın kontrolü Node.js 24 ile `npm run build`, ardından `npm run verify`.
`npm start` yerel HTTP sunucusudur. Public bağlantı supabase.public.json içindedir.
Gizli anahtar, PIN veya token kaynağa eklenmez. Supabase kayıtlı CLI hesabı+hedef
proje erişimi doğrulaması ve veritabanı parolası kullanır; ilk/sona ermiş oturumda
resmi CLI login bir kez gerekebilir.

Bu teslim canlı GitHub/Supabase dağıtımı, gerçek Windows BAT ve AR cihaz kabulü
içermez. Gerçek yazılımsal WebGL ve diğer testlerin kapsamı güncel KABUL_V72.md içindedir.
Kaynak/sürüm hazırlama için kök READ_ME_FIRST.txt ve DEVIR_NOTU.md okuyun.

Tarihsel V69 değişiklikleri: Sabit doğramada keyfî 350/500 mm sınırları kaldırıldı; gerçek
50 mm kasa ve 30 mm cam çıtası boşluğu geometri tarafından kontrol edilir.
Sürme otomatik panel hesabı 1000 mm'ye göre yukarı yuvarlanır; merkezde otomatik
çift, manuel sayı veya sol+sağ (ör. 2+3) kabul edilir. İlk sayı seçilen bakışın
sol tarafıdır. 2D/3D ve açılma hareketi aynı panel dağılımı hesabını kullanır.
Pergola çelik kesitleri, arka/orta net yükseklik, arka 2D profil yerleşimi,
duvar şekline bağlı zone/ürün ölçüleri, modern Yan Kayıt ve Duvara Oturt,
cam+ZIP ortak poz etiketi ve Ctrl çoklu ölçü seçimi/H gizleme güncellendi.

V69: Yan kayıt düzenlemesi çalışan native kesit/uzunluk hesabına bağlandı; Cam
Kaydını Sil geri getirildi. Kesit değişimi dış yüzü ve üst kotu koruyup zone'ları
birlikte günceller. 2D'de eski kayıt konturu yeni konturun altında bırakılmaz.
Çelik silme, silinmiş duvar hücresine bağımlı değildir; destekler kalkınca ray ve
mekanizma aynı dış açılım içinde yeniden hesaplanır. Pergola 3D görünüm komutu ve
animasyon hazır olma yarışı düzeltildi. Proje/animasyon kısa bağlantıları p.html ve
a.html üzerinden mevcut sunum kimliğini kullanır. Kilitli 2D ölçü filtresi açıktır.

Yukarıdaki V69 bölümü tarihseldir. V72 gerçek test kapsamı KABUL_V72.md içindedir.


GÜNCEL V73 NOTU: Bağımsız Veranda ürünü (justveranda / VERANDA), VR pozları ve ortak çizim motoru entegrasyonu. Quad kanatları ayrı pozdur. Pergola korunur. Yeni SQL migration/reset yok. Güncel kabul KABUL_V73.md ve kök DEVIR_NOTU.md içindedir. Önceki sürüm özelliklerini anlatan bölümler tarihsel bilgidir. Teslim RC durumundadır; canlı dağıtım yapılmadı.
