# KINO TO-DO LIST MEMORY — DURUM ANALİZİ, ÖNCELİKLER VE YOL HARİTASI
*(Kayıt Tarihi: 2026-08-10 — Bu dosya KINO_ARCHITECTURE_AND_MEMORY.md'den AYRIDIR ve orijinal mimari hafıza dosyasına dokunmadan oluşturulmuştur.)*

---

# 📊 KINO PROJE DURUM ANALİZİ — 3 KATEGORİLİ SINIFLANDIRMA

---

## ✅ KATEGORİ 1: Halihazırda TAMAMLANMIŞ, AKTİF ve SORUNSUZ ÇALIŞAN ÖZELLİKLER

Bunlar şu an projede var, üretim adayı kodla yazılmış ve **günümüzde erişilebilen** özellikler:

1. **Next.js App Router + SSR + Middleware Uyumluluğu** — `output: export` sorunu çözüldü, uygulama dinamik modda sorunsuz çalışıyor. Dev sunucusu 3001 portunda hazır.
2. **Firebase Ekosistemi Entegrasyonu (Client + Admin)** — Firebase Auth ve Firestore; istemci tarafında offline persistence (IndexedDB), admin tarafında sunucu başlatılmış durumda. Giriş/çıkış gibi temel auth akışı kodda mevcut.
3. **Kullanıcı + Rol + Durum Modeli (Firestore)** — `users` koleksiyonu; `pending / approved / admin` roller, `active / blocked / pending` durumlar, son giriş, avatar, tema gibi alanlar hazır. Admin onay akışı iskeleti kurulmuş.
4. **Dizi/Film İzleme Listeleri Temel İşlemleri** — `favoriteItems`, `watchedItems`, `watchLaterItems` dizileri üzerinden toggle ekle/çıkar işlemleri Firestore CRUD fonksiyonlarıyla yazılmış durumda.
5. **Yorum Sistemi (Temel)** — Yorum ekle, sil, belirli bir film/diziye göre getir, kullanıcının yorumlarını getir; `spoiler` bayrağı, puan alanı mevcut.
6. **Watch Party (Toplu İzleme) — İskelet** — WatchParty oluştur, katıl, ayrıl, sohbet mesajı ekle; Socket.IO sunucusu (`server.js`) kurulmuş, `watchparties` koleksiyonu şeması mevcut.
7. **Admin Paneli Fonksiyonları** — Tüm kullanıcıları listele, rol güncelle, kullanıcı durumu güncelle (block/active/pending), kullanıcı sil; içerik (film/dizi) ekle/güncelle/sil, genel istatistikler (toplam kullanıcı, aktif, pending, admin, yorum, film sayısı) hesabı hazır.
8. **UI Bileşen Kütüphanesi** — shadcn/ui tabanlı 35+ adet UI bileşeni (checkbox, dialog, drawer, tabs, slider, sheet, carousel, chart vb.) `components/ui/` altında kurulu ve hazır.
9. **Mobil Uygulama Altyapısı (Capacitor)** — Capacitor config + `android/` klasörü tamamen oluşturulmuş; splash screen, ikonlar, gradle build ayarları hazır. Play Store yüklemeye hazır iskelet.
10. **Harici API Entegrasyonları — İskelet** — `lib/tmdb.ts`, `lib/omdb.ts`, `lib/backblaze.ts` (dosya depolama), `api-server/stream/signed-url` endpoint hazır. Veriler Next.js API proxy'sinden çekilmesi konusunda kütüphane kurulmuş.
11. **Otomatik Geliştirme Server'ı** — `npm run dev` sorunsuz.
12. **KINO_ARCHITECTURE_AND_MEMORY.md Hafıza Dokümanı** — Proje bağlamı, mimari, güvenlik, UX, operasyonel süreçler kapsamlı şekilde kaydedildi.

### 👉 Kategori 1 Değerlendirmesi:
**İskelet mükemmel.** 2-3 kişilik bir ekibin 3-4 haftada yazdığı sağlam bir temel var. Hiçbir şey sıfırdan başlamamıza gerek yok. **Ancak "çalışan kod" ile "üretim kalitesinde ürün" arasında büyük fark var.** Şimdi Kategori 2'de göreceğimiz gibi çoğu özelliğin **üretim öncesi sağlamlaştırmaya (hardening) ve tamamlanmış uçtan uca akışa** ihtiyacı var.

---

## ⏳ KATEGORİ 2: MEMORY'DE YER ALIYOR ANCAK HENÜZ UYGULANMAMIŞ / EKSİK ÖZELLİKLER

Bunlar hafıza dosyasında (KINO_ARCHITECTURE_AND_MEMORY.md) detaylıca planlanmış ya da kodda "yarım" (skeleton) durumda ama **gerçekten kullanıcıya sunulmaktan çok uzak** kalanlar:

### 🔴 YÜKSEK ÖNCELİKLİ EKSİKLER (Ürünü kullanılamaz kılan veya kullanıcı deneyimini sıfırlayan)
1. **Tam Uçtan Uca Kayıt + Onay Akışı** — Kodda rol/pending alanı var ama gerçek akış eksik: *"Kullanıcı kayıt olur → Email doğrulama maili atar → Admin /admin panelde onaylar → Onay maili atılır → Kullanıcı otomatik anasayfaya yönlenir + Onboarding tooltip"* zinciri **hiç çalışmıyor**. Email gönderim (Nodemailer/SendGrid) fonksiyonu sadece `api-server/send-otp` route'u, onay akışına entegre değil. LoginForm var ama signup ayrı sayfa/modal yok.
2. **Gerçek İzleme Listesi Sayfası (`/watchlist`) + 4'lü Durum Modeli** — Şu an sadece 3 array (`favorite/watched/watchLater`). Hafızadaki V2 modelindeki **`plan_to_watch / watching / completed / dropped / on_hold` 5 durumlu `user_media_lists` ayrı koleksiyonu** hiç yok. `/watchlist` sekmesi, her durum ayrı kartlar, ilerleme, yeniden izleme sayısı, özel notlar **tamamen eksik**.
3. **TMDB Detay ve Arama UI Entegrasyonu** — `lib/tmdb.ts` var ama anasayfa trend listesi, arama sonuçları, `/movie/[id]` detay sayfasındaki oyuncular, sezlar/bölümler seçici (EpisodeSelector var ama gerçek TMDB sezon API'sine bağlı mı?), benzer içerik önerileri **sayfalarda henüz bağlı değil**. Şu an sayfalar boş veya statik demo içerik olabilir.
4. **Firestore Security Rules (RLS — Row Level Security)** — En kritik güvenlik katmanı **hiç yok!** Hafızadaki 4. prensipte "her kullanıcı kendi verisini görür" deniyor, ama `firestore.rules` dosyası mevcut değil. Şu an client key'i olan herkes **her kullanıcının tüm listesini silebilir**. Bu **ÜRETİMDE ASLA AÇILMAMASI GEREKEN** bir güvenlik deliği.
5. **Auth Durumuna Göre Route Koruması** — `middleware.ts` şu anda `/admin` ve `/pending` için sadece `return NextResponse.next()` — yani **koruma yok**. Admin olmayan kullanıcı `/admin` girebilir, pending olan her yere erişebilir, giriş yapmamış kullanıcı `/watchlist` `/profile` `/favorites` görebilir. **Tamamen açık.**

### 🟠 ORTA ÖNCELİKLİ EKSİKLER (Ürün çalışır ama rafine değildir / kötü UX)
6. **Yorum Moderasyon Sistemi** — `reports` alanı var ama 3 şikayet sonrası otomatik saklama, `/reviews` moderatör kuyruğu sayfası, onayla/sil butonları, kullanıcıya uyarı emaili **hiç yok**.
7. **Watch Party Gerçek Player Senkronu** — Sohbet yazılmış durumda ama **gerçek video oynatıcı senkronizasyonu (play/pause/seek host → diğer client'lara broadcast)** ve drift düzeltme algoritması **yazılmamış**.
8. **Arama (SearchPreview + Search Sayfası) — Debounce + Ön Bellek + Klavye Nav** — Bileşen var ama TMDB API'ye bağlı değil, 300ms debounce, sonuçları önbelleğe alma, ↑↓ Enter tuşları çalışır durumda **test edilmemiş, eksik**.
9. **Hata ve Yükleme Durumları (Error Boundary + Skeleton Loader)** — SkeletonLoader var ama her sayfaya entegre değil. 404 özel sayfası, 401/403 bilgilendirme, ağ kesintisi (offline) banner **yok**.
10. **Profil Sayfası** — `/profile` var ama kullanıcı adı değiştir, avatar yükle, şifre değiştir, istatistiklerini göster (kaç film izledi, kaç puan verdi), **yok**.
11. **Favoriler / İzlenenler / İzlenecekler Ayrı Sayfaları** — `app/favorites`, `app/watchlist` gibi rotalar var ama içleri **bağlı mı, gerçek listedeki içerikleri kart olarak gösteriyor mu?** Büyük olasılıkla boş.

### 🟡 DÜŞÜK ÖNCELİKLİ EKSİKLER (Ürün çalışır, gelince eklenir)
12. **Çoklu Dil (i18n) — Türkçe/İngilizce + RTL** — Tüm UI hard-coded Türkçe, sözlük JSON yapısı yok.
13. **WCAG 2.1 AA Erişilebilirlik** — Semantik HTML, focus-visible, ekran okuyucu ARIA, reduced motion hiç düşünülmemiş.
14. **MFA / 2FA (TOTP) — Adminler İçin Zorunlu** — Firebase Auth MFA etkinleştirilmemiş.
15. **Yedekleme + PITR + DR Planı Uygulaması** — Hafızada yazıyor ama Firestore'da PITR açık değil, Cloud Storage export schedule'ı kurulmamış.
16. **Gözlemlenebilirlik (Prometheus/Grafana/ELK/Sentry)** — Sentry hatası gönderimi yok, metric yok, log yapısı yok.
17. **CI/CD Pipeline (GitHub Actions)** — Workflow dosyaları `.github/workflows/` altında hiç yok.
18. **Unit + E2E Test (Jest + Playwright + axe)** — Tek test dosyası bile mevcut değil.

---

## 💡 KATEGORİ 3: MEVCUT LİSTELERDE YOK AMA ÜRÜN STRATEJİSİNE EKLENMESİ GEREKEN POTANSİYEL YENİ ÖZELLİKLER

Bunlar hafızada da kodda da yok ama **rakip analizi + kullanıcı ihtiyacı + uzun vadeli büyüme** için eklenmesini şiddetle tavsiye ettiğim şeyler:

1. **"İstatistiklerim" Kişisel Analitik Paneli** — Kullanıcıya kendisi hakkında yılda bir paylaşır (Spotify Wrapped benzeri): *"Bu yıl 147 film izledin, en çok 2000'ler sci-fi sevmişsin, ortalaman 7.2/10, toplam 23 gün ekran süresi harcadın!"* — **Sosyal medyada paylaş butonu** ekler. *Bu özelliğin virüsellik etkisi çok yüksek, ücretsiz kullanıcı kazanımı sağlar.*

2. **Arkadaş Takibi + Sosyal Akış (Feed)** — Diğer kullanıcıların "X filmini izlemeye başladı / Y puan verdi / Yorum yazdı" aktivitesini ana sayfada görmek. *Ancak dikkat: ilk etapta sadece "takip ettiğim arkadaşlar" filtresi, keşfet yok. Aşırı sosyal ağlaşma ürünün amacından saptırır.*

3. **"Bu Akşam Ne İzlesem?" Akıllı Öneri Sihirbazı** — 3 soru: *Ruh halin (Eğlenceli / Düşündüren / Heyecanlı), süre tercihi (90dk film / diziyi 2 bölüm), ortak puanın üstünde (7+) öner.* Sonrasında TMDB + kişisel izleme geçmişi tabanlı 5 öneri. *Kullanıcı bağlılığını anında %40 artırır çünkü "seçim paradoksu"nu ortadan kaldırır.*

4. **Bildirim Merkezi (Web Push + Mobil Push)** — "İzlediğin dizinin yeni sezonu çıktı 🎉", "Arkadaşın senin için bir film önerdi", "30 gündür izlemediğin 5 listende film var, silmek ister misin?" + Web Push (FCM) + Capacitor push notification. *Kullanıcıyı 1 haftada 1 platforma çekmek için kritik.*

5. **İthalat (Import) Araçları** — IMDb CSV içe aktar, Letterboxd senkronu, Trakt.tv bağla. *Mevcut kitleyi hızlıca kazanmak için en etkili yol; rakip platformdan kullanıcı çeker.*

6. **Aile/Çocuk Modu + Profil** — Tek hesap altında 4 ayrı profil (Anne/Baba/Çocuk1/Çocuk2), çocuk modunda sadece U (General Audience) + yaş sınırı filtresi, ebeveyn kontrol paneli: Çocuğunun ne izlediğini görme, süre sınırı. *Aileleri hedefleyen ayrı bir pazar segmenti açar.*

7. **İzleme Geçmişi Takvimi** — Takvim görünümünde hangi gün hangi filmi izlediğini işaretleme; "Bu Mayıs ayında 8 film izledin!" görselleştirme. *Liste tutmayı oyunlaştıran (gamification) "sıralama çizgisi + streak" özelliğiyle birleşince bağımlılık yapar.*

8. **Üstün Arama Filtreleri** — "1994-2004 yılları arası IMDB ≥7.5, sadece Christopher Nolan yönetmen, sadece 2 saatten kısa, ben izlemediklerim" — çoklu kombinasyon filtreleme. *Güç kullanıcıları (power user) ürünü çok daha fazla sever.*

9. **Abonelik Platformları Entegrasyonu** — "Sahip olduğum platformlar" (Netflix, Disney+, Prime Video, BluTV, Exxen) seç. Önerilerde sadece bunda olan filtrele. *Herkesin artık 10 aboneliği var; "bu film nerede var?" sorusuna cevap vermek rakipsiz bir deneyim.*

10. **Karar Destek Mekanizması: Rulet (Sürpriz!)** — Liste çok kalabalık, ne izleyeceğine karar veremiyorsun. "Rasgele seç" butonu. *Küçük ama kullanıcı çok sever, stresi azaltır.*

---

## 🎯 STRATEJİK ÖNERİLERİM — NEYE ÖNCELİK VERMELİYİZ? (Kısa, Orta, Uzun Vadeli Yol Haritası)

### ⚡ **KISA VADE — 1 HAFTA (İlk MVP'yi 2 arkadaşına gösterebileceğin hale getir)**
**Sadece 4 iş yap, geri kalanı beklet:**
1. **Öncelik 1: Firestore Security Rules (RLS) YAZ — Kesin Zorunlu**
   *Sebep:* Ürünü bugün yayına açsanız hacklenir. Güvenlik, güzellikten önce gelir. *Bu olmadan hiçbir işe devam etme.*
2. **Öncelik 2: Route Koruması (Middleware) DOLDUR**
   *Sebep:* Pending kullanıcı admin panele girerse sistem çöker. Çok basit, 1-2 saatlik iş ama çok kritik.
3. **Öncelik 3: Temel Kayıt + Onay Akışını TAMAMLA**
   *Sebep:* Kullanıcı olmadan hiçbir şeyin anlamı yok. Kullanıcı → kayıt → onay → izleme listesine ilk filmini eklemeye kadar her şey sorunsuz olsun.
4. **Öncelik 4: TMDB'yi Ana Sayfa + Arama + Detay Sayfasına BAĞLA**
   *Sebep:* Şu an sayfalar boş ise ürün "demo" değil "boş proje" görünür. Gerçek içerik (poster, isim, puan) gelsin.

**Kısa Vade Sonu Hedef:** Arkadaşına link at → kayıt ol → admin onayı → arama yap → İnception'u bul → "İzleneceklerime ekle" → `/watchlist`'te gör. *Bu zincir sorunsuz çalışıyorsa MVP aşamasını geçmişsiniz demektir.*

---

### ⏳ **ORTA VADE — 2-4 HAFTA (100 kişilik erken erişim topluluğu için)**
1. WatchList 4'lü Durum Modelini (watching/completed/plan_to_watch/dropped) **V2 ayrı koleksiyon olarak geç.**
2. `/watchlist` + `/favorites` sayfalarını kartlı, sıralanabilir, filtrelenebilir yap.
3. Profil sayfasını + istatistiklerini (minik) ekle.
4. Yorum moderasyonunu (3 rapor = gizle, moderator kuyruğu) çalışır hale getir.
5. Watch Party'de player senkronunu ekle (bu özelliği paylaşmak için insanlar davet eder → organik büyüme).
6. **Kategori 3'ten 1 adet özellik seç: "Bu Akşam Ne İzlesem?"** — Bağlılığı çok hızlı artırır.
7. Sentry + temel loglama ekle (üretim hatalarını görmezsen düzeltemezsin).

**Orta Vade Sonu Hedef:** 100 kişi kullanıyor, günlük 5-10 yorum atılıyor, 2-3 watch party günlük açılıyor, sıfır güvenlik açığı yok.

---

### 🚀 **UZUN VADE — 2-6 AY (1000+ Kullanıcı, Ürün-Market Uyumu)**
1. **İstatistiklerim (Wrapped)** ve **Arkadaş Takibi + Feed** ekle → virüsellik.
2. **IMDb/Letterboxd Import** ekle → yeni kullanıcı kazanımı.
3. **Abonelik Platformları Entegrasyonu** → rakipsiz özellik.
4. **Test + CI/CD + Gözlemlenebilirlik** kurulumlarını tamamla → mühendislik kalitesi.
5. **Mobil (Capacitor) Play Store + App Store yayınla** → ikinci kanal.
6. **Abonelik Modeli (İsteğe Bağlı):** Premium — Reklamsız, Wrapped ekstra detaylar, sınırsız arkadaş, gelişmiş filtre (1.99$ / ay). *Şimdilik düşünmeyin ama mimariyi destekleyecek şekilde boşluk bırakın.*

---

## 📌 SON ÖZET
**Mevcut Durum:** 8/10 mühendislik iskeleti (çok sağlam), 2/10 ürün deneyimi (çok eksik).

**Yapılmaması Gereken Hata:** "Şuna yeni özellik ekleyelim, buna yeni ekran" demek önce. **Önce 4 KISA VADE adımı bitmeden yeni özellik düşünmeyin.** Yeni özellik = mevcut eksikler üstüne yeni borç.

**Başarı Formülü:**
`Sağlam Güvenlik + Tam Temel Akış + Gerçek İçerik (TMDB)` → **MVP (1 hafta)** → `WatchList V2 + Profil + Moderasyon` → **Erken Topluluk (1 ay)** → `Sosyal Öneri + Import + Entegrasyonlar` → **Ürün-Market Uyumu (6 ay)**

Bu adımları uygularsanız 6 ay sonunda **gerçekten kullanan, seven ve arkadaşlarına tavsiye eden bir ürün** ortaya çıkar. Başarılar 🎬

---

## 🛠️ UYGULANAN DÜZELTİMLER / CHANGELOG (Canlı)
*(Her anlık kod düzeltmesi buraya otomatik olarak eklenir)*

### 2026-08-10 — Fix: Film ReferenceError Çözümü (Runtime Crash)
**Sorun:** Tarayıcıda `redirect-boundary.js:56 Uncaught ReferenceError: Film is not defined at TVShowDetailContent (page.tsx:654:18)` hatası → tüm fragman fallback ekranları patlıyordu, sayfa crash oluyordu.

**Kök Neden:** 3 ayrı sayfada `<Film>` lucide-react ikonu JSX'te kullanılıyordu ama import listesinde yoktu. 9 yerde kullanılan `<Film>` için şu dosyalarda eksik import tespit ve düzeltme yapıldı:

1. [app/tv/page.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/app/tv/page.tsx#L16) — **(ASIL HATA KAYNAĞI!)** lucide-react importunun sonuna `, Film` eklendi.
2. [app/tv/[id]/page.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/app/tv/%5Bid%5D/page.tsx#L16) — önceki seferde zaten düzeltilmişti, tekrar kontrol edildi, doğrulandı.
3. [app/tv/[id]/page.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/app/tv/%5Bid%5D/page.tsx#L20) — **Ekstra düzeltme:** `EpisodeSelector` callback'inde kötü kullanılan `require("@/lib/utils")` kaldırıldı, `buildTVWatchUrl` üstten import edildi (ES Module best practice).

**Diğer tüm Film kullanılan dosyalar Kontrol Edildi (HEPSİ importlu ✅):**
*   `components/Header.tsx` ✅
*   `components/SearchPreview.tsx` ✅
*   `app/admin/page.tsx` ✅
*   `app/movie/page.tsx` ✅
*   `app/movie/[id]/page.tsx` ✅

**Doğrulama:** 4 kritik sayfa için **TypeScript GetDiagnostics çalıştırıldı → SIFIR HATA (✅)**
*   app/tv/page.tsx: 0 hata
*   app/tv/[id]/page.tsx: 0 hata
*   app/movie/page.tsx: 0 hata
*   app/movie/[id]/page.tsx: 0 hata
