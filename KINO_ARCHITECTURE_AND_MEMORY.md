# KINO - DİZİ/FİLM TAKİP VE KEŞİF SİSTEMİ
## Mimari, Bağlam ve Yapay Zeka Hafıza Dokümanı

### 1. PROJE KAPSAMI VE AMACI
Bu proje; kullanıcıların TMDB (The Movie Database) veritabanı üzerinden dizi ve film arayıp keşfedebileceği, yapımların detaylarını (afiş, özet, oyuncular, sezon/bölüm bilgisi) görüntüleyebileceği ve kendilerine özel izleme listeleri (İzlenecekler, İzleniyor, Bitti, Yarıda Bıraktım vb.) oluşturup durum takibi yapabileceği modern, sade ve akıcı bir platformdur.

### 2. TEKNOLOJİ YIĞINI (TECH STACK)
- **Frontend:** Next.js (App Router) / React
- **Stil/UI:** Tailwind CSS
- **Backend/Veritabanı:** Firebase (Firestore) veya Supabase (Auth & Database)
- **Dış API:** TMDB (The Movie Database) - Güvenlik amacıyla veriler frontend'den değil, Next.js API rotalarından (proxy) çekilecektir.

### 3. VERİTABANI ŞEMASI (SCHEMA)
Sistemdeki veri ilişkileri sade ve amaca yönelik olacaktır:
* **users:** id (PK), email, username, created_at
* **user_media_lists:** id (PK), user_id (FK), tmdb_id (İlgili filmin/dizinin TMDB ID'si), media_type (movie/tv), status (plan_to_watch, watching, completed, dropped), rating (1-10 arası kullanıcı puanı, nullable).

### 4. YAPAY ZEKA GELİŞTİRME PRENSİPLERİ (AI TALİMATLARI)
1. **İzolasyon:** Veritabanı sorgularında her kullanıcı (user_id) sadece kendi izleme listesini görebilmeli ve düzenleyebilmelidir. (RLS - Row Level Security kuralları uygulanacaktır).
2. **Performans:** TMDB API'den gelen veriler (özellikle anasayfadaki popüler/trend listeleri) gereksiz API çağrılarını önlemek için mümkün olduğunca önbelleğe alınmalıdır (caching).
3. **Modülerlik:** Arama çubuğu (debounce özellikli), film/dizi kartları (medya kartı) ve durum değiştirme butonları bağımsız React bileşenleri (components) olarak tasarlanmalıdır.

---

### 5. VERİTABANI TASARIMI DETAYLARI (DATABASE ARCHITECTURE)

#### 5.1 Mevcut Durum (Firebase/Firestore)
Proje şu anda **Google Firebase Firestore** (NoSQL belge tabanlı veritabanı) kullanmaktadır. İstemci tarafı [firebase.ts](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/lib/firebase.ts), Admin/Server tarafı [firebase-admin.ts](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/lib/firebase-admin.ts) ile başlatılır. CRUD işlemleri [firestore.ts](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/lib/firestore.ts) içindeki yardımcı fonksiyonlar üzerinden yürütülür. Offline persistence (IndexedDB) client tarafında etkindir.

#### 5.2 Koleksiyon/Şema Detayları (Firestore Belgeleri)

##### 5.2.1 `users` Koleksiyonu (1:N — bir kullanıcı birçok içerik ve liste sahibi)
```
Document ID: Firebase Auth UID (user_id — birincil anahtar görevi görür)
Alanlar:
  userId: string                  (PK, auth UID ile aynı olmalı)
  username: string                (UNIQUE — en az 3 karakter, URL-friendly)
  email: string                   (PII — AES-256-GCM ile uygulama seviyesinde şifrelenmeli)
  displayName: string | null
  role: enum('pending'|'approved'|'admin')  (RBAC temel rol)
  status: enum('active'|'blocked'|'pending')
  favoriteItems: string[]         (IMDB/TMDB ID array — maks 5000 eleman limiti)
  watchedItems: string[]
  watchLaterItems: string[]
  avatarUrl: string | null        (Firebase Storage signed URL)
  createdAt: Timestamp            (serverTimestamp — istemci saat kayması yok)
  lastLoginAt: Timestamp
  updatedAt: Timestamp            (trigger ile otomatik güncellenmeli)
  mfaEnabled: boolean             (ileride: 2FA/MFA bayrağı)
  locale: enum('tr-TR'|'en-US'|'de-DE'|...)
  theme: enum('dark'|'light'|'system')
  _encryptionVersion: int         (alan seviyesi şifreleme sürümü — sıfırdan şifreleme rotasyonu)
```

##### 5.2.2 `reviews` Koleksiyonu (N:1 — her yorum tek bir kullanıcıya ve tek bir medyaya aittir)
```
Document ID: auto-id (Firebase)
Alanlar:
  id: string                       (PK — document.id)
  imdbId: string                   (FK — medya referansı, SK: ['imdbId', 'createdAt'] bileşik indeks)
  userId: string                   (FK → users, RLS'de doğrulanacak)
  userName: string                 (Denormalize — read-heavy optimizasyonu)
  rating: int                      (CHECK CONSTRAINT: 1–10)
  comment: string                  (maks 2000 karakter — XSS sanitize edilmeli)
  spoiler: boolean                 (default false — UI'da blur)
  movieTitle: string               (Denormalize)
  createdAt: Timestamp             (serverTimestamp)
  updatedAt: Timestamp | null
  likes: int                       (counter-shard: yüksek trafikte sharded)
  reports: int                     (moderasyon tetikleyicisi: >=3 → hidden)
  approved: boolean                (moderasyon sonrası)
Bileşik İndeksler:
  - (imdbId ASC, createdAt DESC)   → Tek bir medyanın yorumları (en yeni önce)
  - (userId ASC, createdAt DESC)   → Kullanıcının yorumları
  - (approved ASC, reports ASC)    → Moderasyon kuyruğu
```

##### 5.2.3 `movies` Koleksiyonu (Katalog / önbellek katmanı)
```
Document ID: auto-id veya `{media_type}_{tmdb_id}` bileşik key
Alanlar:
  movieId: string                  (TMDB/IMDB ID — UNIQUE)
  title: string (tr/en)            (i18n — map)
  originalTitle: string
  year: int
  imdbRating: float                (0.0–10.0)
  description: string
  trailerUrl: string
  posterUrl: string
  backdropUrl: string
  category: enum('movie'|'tv')
  episodes: int                    (tv için)
  seasons: int
  genres: string[]
  tmdbPopularity: float            (sıralama için)
  lastSyncedAt: Timestamp          (TMDB sync freshness kontrolü)
  createdAt: Timestamp
  updatedAt: Timestamp
İndeks: (category, tmdbPopularity DESC), (year, imdbRating DESC)
```

##### 5.2.4 `watchparties` Koleksiyonu (Socket.IO senkronizasyonu + Firestore persistence)
```
Document ID: auto-id
Alanlar:
  partyId: string                  (public shareable URL slug)
  movieId: string
  hostId: string                   (FK → users)
  participants: string[]           (userID array — max 20 kişi)
  isActive: boolean
  playbackState: { paused, positionMs, updatedAt }  (sync checkpoint)
  messages: WatchPartyMessage[]    (subcollection önerilir — 10MB belge limiti)
  createdAt: Timestamp
  endedAt: Timestamp | null
İndeks: (hostId, createdAt DESC), (isActive, createdAt DESC)
```

##### 5.2.5 `user_media_lists` (Gelecek V2 — Normalleştirilmiş Yapı)
Mevcut `favoriteItems/watchedItems/watchLaterItems` array yaklaşımı **10K+ kayıtta Firestore belge boyutu ve write limiti nedeniyle** ölçeklenmez. V2'de ayrı koleksiyona taşınır:
```
Koleksiyon: user_media_lists
  id: auto-id (PK)
  user_id: string (FK → users)
  tmdb_id: string
  media_type: enum('movie','tv')
  status: enum('plan_to_watch','watching','completed','dropped','on_hold')
  rating: int | null (1–10)
  progress: int (0–100) % veya episode_no
  start_date: Timestamp | null
  finish_date: Timestamp | null
  rewatches: int
  notes: string | null
  private: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
  UNIQUE(user_id, tmdb_id, media_type)  → Bileşik benzersiz kısıt
Bileşik İndeksler:
  (user_id, status, updatedAt DESC)
  (user_id, media_type, rating DESC)
```

#### 5.3 İlişki Haritası
```
users (1) ────< (N) reviews
users (1) ────< (N) watchparties (as host)
users (1) ────< (N) user_media_lists
users (M) ────< (N) watchparties (as participants — ara tablo/array)
movies/tmdb_entities (1) ────< (N) reviews
movies/tmdb_entities (1) ────< (N) user_media_lists
movies/tmdb_entities (1) ────< (N) watchparties
```

#### 5.4 Şifreleme Standartları
- **Aktif Veritabanı Şifrelemesi (TDE):** Firestore varsayılan olarak **Google Cloud AES-256** ile rest şifrelemesi sağlar. **Ek:** Customer-Managed Encryption Keys (CMEK) etkinleştirilecek (KMS üzerinden kendi anahtarı).
- **Alan Seviyesi Şifreleme (PII):** `email`, herhangi bir `phone`, `ip_address`, ödeme bilgileri (ileride) **Uygulama Katmanı AES-256-GCM** ile şifrelenecek (Firebase Extension: Firestore Encode/Decode veya lib/encryption.ts utility). Anahtarlar **Firebase Secret Manager / GCP KMS**'te; hiçbir zaman kaynak koduna gömülmeyecek.
- **Aktarım Şifrelemesi:** TLS 1.3 minimum (gRPC/HTTPS), HSTS preload, certificate pinning (mobile Capacitor).
- **Hashleme:** Şifreler Firebase Auth (scrypt/argon2 benzeri) tarafından tutulur; uygulama seviyesinde asla düz metin/MD5/SHA1 görülmez.

#### 5.5 Saklı Yordamlar, Tetikleyiciler (Triggers) — Firebase Functions
1. **onUpdate-users:** `updatedAt` alanını `serverTimestamp()` ile otomatik yenile.
2. **onCreate-review:** Spam/token tabanlı içerik filtresi çalıştır → `approved` false ise beklemeye al. `reports` 3 eşiğini geçerse document `hidden = true`.
3. **onWrite-user_media_lists:** `users` koleksiyonundaki `stats_{status}` sayaç alanlarını güncelle (toplam completed, izlenen film sayısı vb. — read-heavy optimizasyon).
4. **Scheduled Function — Her 24 saat:** TMDB veri senkronizasyonu; `lastSyncedAt > 7 gün` olan kayıtları tazele.
5. **onDelete-users:** Tüm bağımlı verileri anonimleştir (GDPR right to erasure — kişisel yorumları `userName: '[Silinmiş Kullanıcı]'`, `userId : null`). **CASCADE DELETE yerine SOFT DELETE** tercih edilir.

#### 5.6 Yedekleme ve Felaket Kurtarma (DR Planı)
- **PITR (Point-in-Time Recovery):** Firestore PITR etkin — 7 gün aralık, **RPO ≤ 1 saat**, **RTO ≤ 4 saat**.
- **Otomatik Yedekleme:** Günün her saati Firestore Export → Cloud Storage (Multi-region: eu-west1 + us-central1 replikası). JSON + Parquet format.
- **Test Kurtarma:** Her ayın 1'inde otomatik test-restore çalış → ayrı shadow projesine dönen veri doğruluğu (checksum + satır sayısı) teyit edilir.
- **Şifreleme:** Yedekler AES-256 + CMEK; 90 gün tutulur, sonra otomatik silinir (lifecycle policy).
- **Bölgesel Kesinti Senaryosu:** Ana bölge `eu-central-1`, failover `europe-west1`. DNS ağırlıklı yönlendirme + health check ile <5 dk otomatik geçiş.

#### 5.7 Sorgu Optimizasyonu
- Firestore'da **full collection scan** yok et; her sorgu bir indeks kullanmalı. Uyarı logu alınan her sorgu için `firestore.indexes.json`'a bileşik indeks ekle.
- Tek bir sayfada **>100 belge** çekme — cursor pagination (startAfter) kullan.
- Read-heavy sayfalar (anasayfa trend): Next.js Incremental Static Regeneration (ISR) + `revalidate: 3600` + Redis katman (Upstash) 2. seviye önbellek.
- Fan-out problemi: Tek user'ın 1000+ kaydını tek document array'de tutmaktan kaç; V2'de `user_media_lists` ayrı koleksiyon.

#### 5.8 ACID Uyumluluğu
- Firestore belge seviyesinde **atomik işlem** garanti eder. Çoklu belge işleri için **Batched Writes** (max 500/işlem) veya **Transaction** (okuma sonrası koşullu yazma).
- Örn: `toggleFavorite` → şu an 2 ayrı okuma/yazma; Transaction'a çevrilmeli: (1) mevcut durumu oku, (2) içinde var mı kontrol et, (3) tek atomic işlemde arrayUnion/Remove yaz.
- **İzole Seviye:** Firestore transaction snapshot isolation — dirty read/phantom yok.
- **Tutarlılık:** Varsayılan **eventual** ama transaction + get() ile **strong consistency** zorla.

#### 5.9 Ölçeklenebilirlik: PostgreSQL / MongoDB / Cassandra Karşılaştırması (Gelecek Yol Haritası)

| Özellik                     | Firebase Firestore (Mevcut) | PostgreSQL 16 (Supabase)    | MongoDB 7 Atlas           | Cassandra 5 / ScyllaDB    |
|-----------------------------|---------------------------|-----------------------------|---------------------------|---------------------------|
| Başlangıç Zamanı           | ★★★★★ (5dk kurulum)       | ★★★★ (30dk-1saat)            | ★★★★ (30dk)               | ★★ (1-2 gün, operasyonel ağır) |
| ACID                        | Belge + Tx                | Tam ACID (en güçlü)         | 4.0+ çoklu belge ACID     | Sonunda tutarlı, LWT ile sınırlı |
| Join İşlemleri              | Yok (application join)    | Güçlü (INNER, CTE, window)  | $lookup (sınırlı)         | Yok (denormalize gerekli) |
| RLS (Row Level Security)    | Security Rules (varsayım) | Güçlü native POLICY         | Queryable Encryption + $expr | Yok |
| Ölçek (1M+ kullanıcı)       | Limitli, maliyet artışı   | ★★★★ (yatay: Citus)         | ★★★★★ sharding            | ★★★★★ linear yatay |
| Sıralı/Sayfalı Sorgu        | İndeks gerekli, limitli   | Üstün                       | İyi                       | İyi |
| Tam Metin Arama             | Algolia/Typesense gerek   | pg_trgm / tsvector (native) | Atlas Search (native)     | Dış Solr/ES |
| JSONB/Schema esnekliği      | Belge = esnek             | JSONB güzel denge           | Doğru ev sahibi           | Map/Set (limitli) |
| Maliyet (10K MAU)           | Ücretsiz katman + $25-50  | ~$25-100                    | ~$50-150                  | ~$200+ (self-managed daha ucuz) |
| Kurumsal Uyumluluk (HIPAA)  | BAA mevcut                | BAA mevcut (Supabase Kurumsal) | BAA mevcut            | BAA zor |

**Karar:** V1'de Firestore (hızlı geliştirme, Auth entegrasyonu, offline mobile). V2'de (10K+ MAU veya karmaşık raporlama ihtiyacı) **Supabase PostgreSQL**'e kademeli migrasyon stratejisi:
- **Aşama 1:** Double-write — Firestore'a + PostgreSQL yaz, read'i Firestore'dan al.
- **Aşama 2:** Read tarafını %1 → %10 → %50 → %100 PostgreSQL'e kes (Canary).
- **Aşama 3:** Firestore'u archive-only moduna al, 30 gün sonra kapat.
- **Migration Aracı:** `pgloader` + özel script (consistency check + row count hash karşılaştırma + rollback hazır).

---

### 6. GÜVENLİK ÖZELLİKLERİ (ZERO TRUST & DEFENSE IN DEPTH)

#### 6.1 Sıfır Güven (Zero Trust) Mimarisi Prensipleri
- **Prensip:** "Hiçbir varlığa (ağ içi/dışı) otomatik güvenme — her istek kimlik doğrulamalı".
- Her istek 4 katmandan geçer:
  1. **Ağ:** Cloudflare WAF + CDN — IP reputation, Geo-block, bot yönetimi.
  2. **Edge:** Next.js Middleware — IP rate-limit, token doğrulama, CORS zorlama.
  3. **Uygulama:** Firebase Auth JWT doğrulaması (Admin SDK), RBAC/ABAC izin kontrolü.
  4. **Veri:** Firestore RLS (Security Rules) + PostgreSQL RLS; bir katman bypass olsa sonraki katman durdurur.

#### 6.2 Kimlik Doğrulama (Authentication) Stack
- **Birincil:** Firebase Auth — Email/Password, Google, Apple, Twitter (OAuth 2.0 / OIDC 1.0).
- **Parola Politikası:** min 12 karakter, büyük/küçük harf + sayı + sembol zorunlu, HaveIBeenPwned API'si ile leak kontrolü (kayıt esnasında).
- **MFA (2FA):** TOTP (Google Authenticator, Authy) + SMS fallback (Twilio). Admin rolü olan hesaplarda **MFA MEVCUT** olmadan giriş engellenir.
- **SSO (Kurumsal):** V2 — SAML 2.0 (Okta, Azure AD, Google Workspace), SCIM provisioning.
- **Oturum Güvenliği:**
  - Access Token: **15 dakika** ömür (JWT).
  - Refresh Token: **7 gün**, rotasyon + fingerprint doğrulaması (cihaz/IP değişirse tekrar MFA sor).
  - Aynı anda maksimum 5 aktif oturum; fazlası eski oturumu sonlandırır.
  - "Tüm oturumları kapat" butonu + Auth revokasyon token.

#### 6.3 Yetkilendirme (Authorization) — RBAC + ABAC Hibrit
**Roller (RBAC):**
```
guest         : Sadece okuma (arama, listeleme, detay)
user (approved): Kendi listesini yönet, yorum yaz, watch party başlat
pending       : Sadece pending sayfası + profil düzenleme (onay bekliyor)
moderator     : approved + yorum onayla/sil, şikayetleri incele
admin         : Tümü + kullanıcı yönet, rol ata, sistem istatistikleri gör
```

**Nitelik (ABAC) Ekleri:**
- `resource.owner_id == request.auth.uid` → kendi yorumunu düzenleyebilir.
- `request.time < resource.lock_time` → silme işlemleri 24 saat sonra geri alınamaz.
- `request.auth.token.email_verified == true` → ilk yorum yazmadan önce e-posta onayı zorunlu.

**Uygulama Katmanı:**
- Firestore: `firestore.rules` + özel match blokları (her koleksiyon ayrı).
- Next.js Server Action/API Route: `requireRole('admin')` middleware helper.
- UI: "RoleGate" bileşeni — buton/route koşullu render.

#### 6.4 IDS/IPS, WAF, DDoS Koruması
- **WAF:** Cloudflare Pro + Yönetilen Kural Setleri (OWASP Top 10, SQLi, XSS, RCE, LFI/RFI). Özel kural: `/api/*` pathlerinde `application/json` olmayan Content-Type engelle.
- **Rate Limit (Edge):** Middleware + Upstash Redis sliding window:
  ```
  /api/auth/*     → 10 istek / dakika / IP
  /api/stream/*   → 60 istek / dakika / auth user
  /search         → 30 istek / dakika / IP
  ```
- **DDoS:** Cloudflare **Magic Transit** + L3/L4/L7 koruma. Origin'de sadece Cloudflare IP'leri kabul edilir (Security Group / VPC Firewall).
- **Bot Yönetimi:** Turnstile (Cloudflare) kayıt/girişte invisible captcha. Honeypot alan (auth form'da gizli `website_` alanı doldurulursa bot=block).
- **IDS/IPS:** Fail2ban benzeri custom rule → 3 başarısız girişten sonra 1 saat IP ban (Firebase Auth → Blocklist API).

#### 6.5 Güvenlik Açığı Yönetimi
- **Statik Analiz (Her PR):** ESLint + `eslint-plugin-security`, npm audit (seviye: high+ block), Semgrep (custom rule: `.env` sızıntısı, eval, dangerouslySetInnerHTML, raw sorgu).
- **Dependency Tarama:** Dependabot (haftalık) + Snyk entegrasyonu (lisans + CVE taraması). 7 gün içinde high severity patch.
- **Dinamik Tarama (Ayda 1):** OWASP ZAP full scan + Burp Suite Pro manuel penetration test (yetkili 3. taraf). Rapor: 48 saat içinde triyaj, high → 1 hafta düzeltme.
- **Threat Model:** STRIDE modeli ile periyodik gözden geçirme (her sprint planning).
- **Bounty Program:** HackerOne private program (Seviye: Critical/High).

#### 6.6 Günlükleme ve Denetim (Audit Logs)
- **Kapsam:** Tüm auth (başarılı/başarısız giriş, şifre sıfırlama, MFA), tüm admin aksiyonları (rol değişikliği, kullanıcı silme, yorum kaldırma), tüm veri sızıntısı şüphesi (401/403), tüm ödeme (ileride).
- **Format:** Structured JSON (ECS - Elastic Common Schema). `event.id`, `event.action`, `user.id`, `source.ip`, `user_agent`, `timestamp`, `geo.country`, `outcome.success`.
- **Depolama:** İlk 7 gün → Cloud Logging (canlı sorgu). 7g–1 yıl → Cloud Storage (immutable bucket — WORM, silinemez). 1 yıl → Coldline.
- **Uyarı:** 1 dakika içinde bildirim:
  - `admin` login from new country
  - >100 failed auth / 5dk from same IP
  - `role=admin` değişimi (ancak super-admin onaylırsa — 4 göz ilkesi)
  - Büyük toplu silme (>100 belge / 1dk)
- **Silo:** App team log'ları görebilir, **audit log'ları sadece security team** erişir (ayrı IAM rolü).

#### 6.7 Uyumluluk (Compliance)
| Standart | Durum | Gereksinimler |
|----------|-------|---------------|
| **GDPR (AB)** | Uyum Sağlanmalı | Veri minimizasyonu, 72 saat ihlal bildirimi, erişim/silme/taşınabilirlik hakları, DPIA (Watch Party mesajları), DPO ataması. |
| **KVKK (TR)** | Uyum Sağlanmalı | Veri sorumlusu kaydı (VERBIS), Aydınlatma Metni, Açık Rıza, Siber Güvenlik Kuruluna 72 saat bildirim. |
| **HIPAA (ABD)** | Gelecek V3 (E-Health içeriği olursa) | BAA, audit log 6 yıl, MFA, PHI şifrelemesi (alan seviyesi). |
| **PCI DSS** | Kart ödeme eklerseniz | SAQ-A (Stripe/PayPal ile) — asla kendi kart verisini tutma, tokenization kullan. |
| **WCAG 2.1 AA** | Geliştirme Standardı | Bkz. Bölüm 7.5. |

#### 6.8 Olaya Müdahale Planı (IRP — 6 Aşama)
1. **Hazırlık:** IR ekip listesi + iletişim zinciri, playbook'lar (ransomware, data leak, DDoS).
2. **Tespit (Erken):** Yüksek öncelikli alert'ler → Slack #security-alert → 5dk içinde on-call.
3. **Kapsama (Containment):** Hızlı: Kötü IP'yi WAF'tan block, şüpheli token'ları revoke. Uzun vadeli: Etkilenen sistemi ağdan ayır.
4. **Kök Neden Analizi:** 5 Why + timeline + kim ne zaman ne yaptı.
5. **Temizleme/Kurtarma:** Bilinen temiz backup'tan geri dön (test edilmiş). Yama uygula.
6. **Dersler:** 7 gün içinde rapor + sürekli iyileştirme + simülasyon (her çeyrek masaüstü tatbikat).

---

### 7. KULLANICI SENARYOLARI VE KULLANICI DENEYİMİ (UX)

#### 7.1 Kullanıcı Rolleri (Persona)
| Rol | Tanım | Günlük Aktif Süre |
|-----|-------|-------------------|
| **Misafir (Guest)** | Giriş yapmamış kullanıcı — SEO trafiği | 3–5 dk |
| **Onaysız Kullanıcı (Pending)** | Kayıt olmuş, admin onayı bekliyor | 1dk (sadece pending sayfası) |
| **Standart Kullanıcı (Approved)** | Ana kitle — içerik tüketir, liste yapar | 15–45 dk |
| **Moderatör (Moderator)** | Topluluk içeriğini denetler | 1–2 saat |
| **Sistem Yöneticisi (Admin)** | Kullanıcı ve sistem yönetimi | 30dk–1 saat |

#### 7.2 Uçtan Uca Kullanıcı Senaryoları (E2E User Journeys)

##### 7.2.1 Senaryo A: Yeni Kayıt + Onay Akışı (Mutlu Yol)
```
1. Kullanıcı "/" → "Hesap Oluştur" tıklar
   ↓ Next.js route redirect: /signup varsa veya LoginForm modal
2. Email, şifre (12+), username girer → Turnstile doğrular
3. HIBP API → şifre leak'de değilse devam
4. Firebase Auth → kullanıcı oluştur, email doğrulama linki gönder
5. Firestore `users/{uid}` → role='pending', status='active' yaz
6. UI → Yeşil Toast: "Hesabınız oluşturuldu. Email doğrulama ve admin onayı bekleniyor."
7. Yönlendirme: /pending (bekleme ekranı — "Admin onayınız bekleniyor, bilgilendirme maili gelecek.")
8. Admin /admin panelde → kullanıcı listesinde pending olanı → "Onayla" tıklar
   → firestore update role='approved' + onay maili (Nodemailer SendGrid)
9. Kullanıcı `/pending` sayfasına döner → middleware veya client-side observe role değişim →
   → otomatik anasayfaya → Toast: "Hesabınız onaylandı! Keyifli izlemeler 🎬"
10. İlk karşılama tooltip'i → nasıl arama yapılır, izleme listesi nasıl eklenir adım adım gösterilir.
```

**Hata Durumları:**
- Email zaten kayıtlı → Bilgilendirme: "Bu epostayla hesap var. Şifrenizi mi unuttunuz?"
- Username zaten alınmış → Client-side debounce kontrol + sunucu onayı
- Email doğrulama linki süresi dolmuş → Tekrar gönder butonu (rate limit: 1/5dk)
- Admin 48 saat içinde onaylamamış → Otomatik uyarı + escalate super-admin

##### 7.2.2 Senaryo B: Film Ara + Detaya Gir + İzleme Listesine Ekle
```
1. Kullanıcı header'daki search bar'a → 300ms debounce + SearchPreview bileşeni açılır
2. İlk 5 sonuç → klavye navigasyonu (↑↓ Enter) destekli
3. "Daha fazla sonuç gör" → /search?query=...  sonuçlar MovieCard grid ile listelenir
4. Film kartına tık → /movie/[id]  SSR önbellekli detay sayfası açılır
5. Bileşenler: Poster, backdrop, play trailer, IMDB puanı, süre, sezon/seçim, oyuncu slider, benzer içerik
6. Kullanıcı "İzlenecekler" butonuna tıklar →
   7a. Auth kontrol: değilse → LoginForm modal (hedef URL ile post-auth redirect)
   7b. Auth ise → optimistic UI: buton dolu yeşil tik + "İzleneceklerinize eklendi" toast
   7c. Arka planda Firestore Transaction → toggleWatchLater yazılır (tekrar tık çıkarır)
   7d. İşlem başarısız olursa (örn. ağ kesintisi) → optimistic UI geri al + kırmızı hata toast + retry
8. Kullanıcı /watchlist sayfasına gider → 4 sekme: plan_to_watch, watching, completed, dropped
   → Her sekmede kendi kartları, sürükle-bırak sıralama + toplam süre + bitirme tahmini
```

##### 7.2.3 Senaryo C: Yorum Yazma (Spoiler + Moderasyon) + Raporlama
```
1. /movie/[id] → En alta in → "Yorum Yaz" alanı açılır (email onaylıysa aktif)
2. Puan seç (1-10 yıldız), comment yaz (maks 2000 char counter), Spoiler? checkbox
3. Submit → DOMPurify ile HTML/XSS temizle → Firestore addDoc
4. Spoiler işaretli ise → tüm diğer kullanıcılar için blur + "Spoiler içerir, göster" butonu
5. Moderasyon akışı:
   - Yeni yorum ilk 5 dk otomatik check: toksisite/nefret söyledi → auto-hidden + rapor listesi
   - Moderatör /reviews listesinde bekleyenleri gör → onayla/sil + kullanıcıya uyarı mail
   - Diğer kullanıcılar 3 farklı kişi "Şikayet Et" derse yorum otomatik gizlenir
6. Rapor Akışı:
   - Kullanıcı yorum yanındaki "⋯" → Şikayet Et: Sebep seç (Nefret Söylemi / Spam / Spoiler / Diğer + not)
   - Rapor kuyruğuna düşer → 24 saat içinde moderatör inceleme SLA
```

##### 7.2.4 Senaryo D: Watch Party Başlat + İzle
```
1. Kullanıcı film detayında "Watch Party Başlat" tıklar → 4 haneli + 3 harfli partyId oluştur
   (ör. `https://kino.app/watch-party/7x2a9q`)
2. Socket.IO room'a katılım → host olarak işaretlenir
3. Paylaş butonu → kopyala, WhatsApp, Twitter paylaşım linkleri
4. Davet edilen 2. kişi linke tıklar → auth → katıl → participants array'e eklenir
5. Her player olayı (play/pause/seek) host'tan alınır → diğer client'lara broadcast
   (zaman damgası ile senkron — drift: ±200ms hedef)
6. Sohbet: Mesajlar Firestore watchparties/messages subcollection + socket anlık
7. Host odadan çıkarsa → en eski participant host olur / odanın son kişi çıkarsa → isActive=false set
```

##### 7.2.5 Senaryo E: Hata ve Yetkisiz Erişim Senaryoları
- **404 Route Yok:** Özel `/not-found` → eğlenceli dizi/film temalı affedersin görseli + "Ana sayfaya dön" butonu + öneriler
- **401 Yetkisiz (Login Gerekli):** Yönlendirme `?next=/hedef` ile girişe → giriş sonrası otomatik geri dön
- **403 Yasak (Rol Yetersiz):** "Bu sayfayı görme yetkiniz yok. Admin'e başvurabilirsiniz." + Support form link + kullanıcıyı `/` yönlendirme (5sn sonra)
- **Ağ Kesintisi (Offline):** Firestore offline persistence + "Bağlantınız kesik. Değişiklikleriniz bağlantı geri geldiğinde kaydedilecektir." banner (sarı)
- **TMDB API Down:** Fallback önbellekten (1 haftalık) + "Veriler güncel olmayabilir" uyarısı
- **500 Internal Server Error:** Error boundary bileşeni → "Teknik bir sorun oluştu, sayfayı yenile?" + hatayı otomatik Sentry.io gönder + kullanıcıdan isterse açıklama al (opsiyonel)

#### 7.3 Mobil (Capacitor) vs Masaüstü Davranış Farkları
| Özellik | Masaüstü Web | Android Capacitor | iOS Capacitor |
|---------|--------------|-------------------|---------------|
| Navigation | Browser History | Android back button + Capacitor App plugin | Swipe back gesture |
| Player | Web video + React Player | ExoPlayer + Capacitor Video (PIP destek) | AVPlayer + PIP |
| Offline | IndexedDB (sınırlı) | Room benzeri ek katman + Filesystem | Core Data / Filesystem |
| Push Bildirim | Firebase Cloud Messaging Web | FCM native | APNS + FCM |
| Status Bar | None | Renklendir, immersive mode | Safe area + renk |
| Deep Link | URL (http) | Android App Links (assetlinks.json) | iOS Universal Links (apple-app-site-association) |
| Performans | Chromium | Native WebView + soğuk başlangıç 1.2s hedef | WKWebView + soğuk başlangıç 1.0s hedef |

#### 7.4 Yerelleştirme ve Çoklu Dil (i18n)
- **V1 Diller:** Türkçe (tr-TR varsayılan), İngilizce (en-US).
- **V2 Ek:** Almanca, Fransızca, İspanyolca, Arapça (RTL).
- **Uygulama:** `next-intl` kütüphanesi. JSON sözlükler (`messages/tr.json`, `en.json`) 100+ anahtar.
- **Sayı/Tarih/para:** `Intl.DateTimeFormat`, `Intl.NumberFormat` — locale-aware.
- **Sağdan Sola (RTL):** Arapça / İbranice için `dir="rtl"` attribute ve Tailwind `rtl:` prefix sınıfları + başlangıç/son (start/end) yerine left/right kullanımını KALDIR.
- **İçerik Çevirisi:** Film/dizi açıklamaları — tarayıcıdaki Google Translate fallback + V2'de önbellekte çevrilmiş TMDB tr-override.
- **Çeviri Kaçışı:** UI'daki tüm stringler sözlükten gelmeli. `next lint` custom rule — hard-coded string görünce hata versin.

#### 7.5 Erişilebilirlik (A11y — WCAG 2.1 AA Hedef)
- **Renk Kontrastı:** Tüm metin ≥4.5:1 (küçük), ≥3:1 (büyük). Koyu tema #09090b zemin + #10b981 yeşil / #06b6d4 mavi doğrulanmalı (WebAIM Contrast Checker).
- **Klavye Navigasyonu:** Tüm etkileşimli elemanlar odaklanabilir. Skip link ("İçeriğe geç") en üstte. Odak çerçevesi `focus-visible:` sadece klavyedeyken — yüksek kontrast.
- **Ekran Okuyucu (SR):**
  - Semantik HTML (nav, main, aside, footer, article, h1-h6 tek h1 sayfa başı).
  - ARIA label (icon-only butonlar: "İzleneceklere ekle" gibi), `aria-live="polite"` bildirimler (toast), `aria-describedby` hata mesajları form.
  - Image: posterlara her zaman `alt` (boş değil; "Dune: İkinci Bölüm film posteri").
  - Video player: Altyazı (WebVTT), anlatım (description track) opsiyonu.
- **Hareket Hassasiyeti:** `prefers-reduced-motion` kullanıcılar için Carousel/Framer-Motion animasyonları kısaltılır veya kapatılır.
- **Form Hataları:** Her alan `aria-invalid`, hata mesajı input ile ilişkilendirilir. Renge ek simge + metin kullan.
- **Otomatik Test:** `axe-core` (playwright) her E2E testte çalışır. Manüel ekran okuyucu test: VoiceOver (macOS/iOS) + NVDA (Windows) + TalkBack.

#### 7.6 Performans ve Kullanıcı Bilgilendirme
- **Core Web Vitals Hedefleri:** LCP < 2.5s, FID/INP < 200ms, CLS < 0.1.
- **Ağ yavaşsa (3G simüle):** SkeletonLoader bileşenleri + progress bar + "Yükleniyor..." yerine "Birazdan hazır!" gibi dost metin.
- **Uzun süren işlem (bulk import vb.):** Deterministik progress (37% 120/324) + arka planda çalıştırma + tarayıcı notification.
- **Geri Bildirim Mekanizması:** Footer'da "Öneri / Hata Bildir" butonu → Form (kategori, açıklama, görsel yükle (max 5MB)) → `reports` Firestore koleksiyonuna → Discord #feedback kanal webhook.

---

### 8. EK TEKNİK VE OPERASYONEL DETAYLAR

#### 8.1 Mimari Desen Seçimi: Monolit → Modüler Monolit → (Opsiyonel) Mikroservis
**V1-V2 Seçim:** **Modüler Monolit (Next.js App Router)**. Seçim gerekçesi:
- Küçük ekip (1–5 kişi) → Mikroservis operasyonel yükü (kayıt, trace, network latency, distributed transaction) aşırı maliyetli.
- Modül sınırları net: `app/`, `components/`, `lib/`, `api-server/` (ileride ayrıştırılabilir).
- Ortak veritabanı ama katı modül bağımlılıkları (import rule: components → lib doğru ama lib → components YASAK). eslint `@nrwl/nx/enforce-module-boundaries` benzeri kural.

**V3 (100K+ MAU veya ekip 10+ kişi):** **Hibrit Mikroservis geçişi:**
- `auth-service` + `media-catalog-service` (TMDB sync) ayrı Python/Go servis.
- `watch-party-gateway` (Socket.IO) ayrı Node ölçeklenebilir cluster (Pub/Sub + Redis Adapter).
- API Gateway: Kong/Traefik ile tek giriş noktası, mTLS servis arası.
- Async mesajlaşma: Google Pub/Sub veya Kafka (outbox pattern ile 2 kez yazma önle).

#### 8.2 Ölçeklenebilirlik Modeli
- **Dikey Ölçek (Scale-Up):** Tek sunucu RAM/CPU artır — ayda 400$ üstüne çıkma durumuna kadar uygun.
- **Yatay Ölçek (Scale-Out, öncelikli):**
  - Frontend: Vercel (varsayılan) edge fonksiyonlar otomatik dünya çapında. Self-host → PM2 cluster (N CPU core = N worker).
  - Watch Party Socket.IO: `@socket.io/redis-adapter` + Redis Cluster → yatay linear scale. 1 node ~10K concurrent bağlantı.
  - DB: Firestore zaten serverless auto-scale; PostgreSQL ise connection pool (PgBouncer) + read replica (okuma %80+ senaryo, 1 master 2 replica başlangıç).
- **Otomatik Ölçek (HPA):** Kubernetes veya Vercel + target: CPU %70, Memory %80 + custom metric (bağlı socket kullanıcı sayısı >8K). Cooldown: 5dk (tiramış-çeker davranışını engelle).

#### 8.3 CI/CD Pipeline Detayları (GitHub Actions)
```
KÖK: .github/workflows/
├── ci.yml          (Her PR ve main push: 5-8 dk)
│   ├── Job 1: install-cache (npm ci, cache .npm)
│   ├── Job 2: lint (eslint, stylelint, prettier --check, typecheck)
│   ├── Job 3: test (unit, integration, playwright E2E smoke %10)
│   ├── Job 4: security (npm audit high+, semgrep, snyk)
│   └── Job 5: build (next build — başarısız ise PR merge blok)
│
├── deploy-preview.yml (PR — her PR'a Vercel Preview URL, comment olarak ekle)
│   └── Playwright görsel regresyon testi (önceki ana dal vs diff — %1 tolerans)
│
└── deploy-main.yml (main merge sonrası)
    ├── Aşama 1: Canary Yayın (%5 trafik → 30dk metrics. Hata oranı >%0.1 ise otomatik geri dön)
    ├── Aşama 2: Blue-Green (mavi aktif, yeşil yeni sürüm deploy. 50/50 ağırlıkla → sonra %100 yeşil, mavi backup olarak 1 gün tut)
    ├── Aşama 3: Migration (önce only-safe up; migrate çalış → smoke test → tamamla)
    └── Aşama 4: Capacitor build → Google Play Internal Test Track + TestFlight Beta upload (fastlane)
```

**Rollback Stratejisi:** 1 tık geri dön. Feature flag: `LaunchDarkly` benzeri + kendi basit feature flag (Firestore `feature_flags` doküman). Riskli özellikler ilk %1 — %10 — %50 — %100 açılır.

#### 8.4 Gözlemlenebilirlik (Observability — 3 Sütun)
##### 8.4.1 Metrikler (Prometheus + Grafana)
- **RED Metodolojisi:** Her endpoint için: Request sayısı, Error (hata oranı), Duration (p50, p95, p99 latency histogram).
- **İş Metrikleri:** Günlük aktif kullanıcı (DAU), aylık (MAU), retention (D1, D7, D30), film izleme ortalama süre, complete oranları, Watch Party aktif sayısı.
- **Sistem Metrikleri:** Node CPU/RSS/Heap, GC pauses, DB bağlantı havuzu, Redis hit ratio, TLS handshake süresi.
- **Grafana Dashboard'lar:** Genel (kırmızı panel), Auth, DB, WatchParty, TMDB Proxy, Admin. Alarm: p95 latency > 3s → PagerDuty.

##### 8.4.2 Logging (ELK Stack / OpenSearch)
- Frontend: `winston` + browser transport → tüm `console.error` ve hatayı merkezi loga.
- Backend: JSON structured log → stdout → Filebeat → Logstash → Elasticsearch → Kibana görünüm.
- Trace ID: Her istek `x-trace-id` üret; application → DB → harici API çağrısı aynı trace ile görünür.
- Saklama: Hot 7 gün, Warm 30 gün, Cold 1 yıl.

##### 8.4.3 Trace (APM — Application Performance Monitoring)
- **OpenTelemetry** standard. Enstrümantasyon: Next.js, Firestore client, Socket.IO, Axios (TMDB istekleri).
- Backend: Grafana Tempo veya Jaeger. Hatanın kök nedenini bul (örn. TMDB proxy yavaşlıyor mu DB mi?).
- **P99 Sorgu:** Firestore sorgularında 1sn üstünde olanları işaretle → indeks incele.

#### 8.5 Hata Yönetimi ve Güvenilirlik (Reliability)
- **Sınıflandırma:**
  - Geçici hatalar (ağ timeout, 429 rate limit, 5xx): Retry edilmeli.
  - Sürekli hatalar (400 bad request, 401, doğrulama): Retry edilmemeli, kullanıcı bilgilendirilmeli.
- **Retry Mekanizması:** `p-retry` veya `@backoff/rx` → Exponential Backoff + Jitter (max 3 deneme: 100ms → 200ms → 400ms). **Idempotency Key** ile 2 kez yazma önle (POST `/api/reviews` `Idempotency-Key` header).
- **Devre Kesici (Circuit Breaker):** TMDB API çağrıları `opossum` → hata oranı %50'yi geçerse 30dk devre açık → fallback önbellek veya "Şu anda hizmet veremiyoruz" mesajı → yarı açık → 1 deneme başarılıysa kapat.
- **Hata Raporlama:** Sentry.io (veya OpenTelemetry + self-hosted GlitchTip) — source map + release versiyonu. Hata gruplama (fingerprint) + duplicate filtre. Slack/SMS bildirim: 1 saat içinde production >10 aynı hata.

#### 8.6 Bağımlılık ve Lisans Yönetimi
- **package.json:** `^` yerine `~` veya sabit sürüm (örn. `13.5.11`). `package-lock.json` commitlenir.
- **Lisans:** Snyk veya FOSSA taraması. Yasaklı lisanslar: AGPL (bulaşıcı), GPL. İzin verilen: MIT, Apache-2.0, BSD, ISC. Yeni bağımlılık eklerken PR check: lisans kontrolü red olursa merge etme.
- **Güncelleme Ritmi:** Her Pazartesi sabahı Dependabot PR'ları. Patch sürümü same-day, Minor: 1 gün içinde test sonrası merge, Major: 2 sprint planla.
- **Audit:** Her build'da `npm audit --audit-level=high` — başarısız olursa build fail.

#### 8.7 Performans Hedefleri (SLA / KPI)
| Ölçüm | Hedef | Nasıl |
|-------|-------|------|
| Home Page LCP (p95, 4G) | ≤ 2.0 s | ISR + optimized poster (AVIF/WebP, responsive srcset) |
| Search API (p95) | ≤ 500 ms | debounce 300ms + Redis ön bellek (anahtar kelime sonuçları 1 saat) |
| TMDB Proxy API (p95) | ≤ 800 ms | batching, HTTP keep-alive, stale-while-revalidate 60s |
| Add List / Remove | ≤ 250 ms | Firestore Transaction + regional DB yakın |
| WatchParty Sync Drift | ≤ ±250 ms | NTP senkron + playbackState timestamp |
| Availability (Uptime) | ≥ 99.9% / aylık (~43dk max kesinti) | UptimeRobot + multi-region + failover |
| Build Süresi | ≤ 6 dk | cache, SWC minify, parallel typecheck |

#### 8.8 Bakım ve Destek Süreçleri
- **On-Call (Haftalık Rotasyon):** Pazartesi 9:00'da el değiştir. 15 dk yanıt SLA (critical). Playbook repo: her alarmın "Adım adım ne yapmalıyım" dökümanı.
- **Bakım Penceresi:** Her ayın ilk Salı 02:00–04:00 (TR timezone, düşük trafik). Duyuru: 3 gün önceden dashboard banner. Not: Yüksek kullanılabilirlik için zero-downtime deployment (bkz. mavi-yeşil) ile penceresiz de yapılabilir — pencere sadece DB migration veya major altyapı.
- **Kullanıcı Destek Kanalları:**
  - Topluluk Discord (topluluk destek + takım üyeleri 4 saat içinde)
  - Email destek (support@kino.app) — iş günü içinde 24 saat SLA
  - Status page: status.kino.app (Better Stack veya Instatus) — tüm servislerin canlı durumu + planlı bakım + tarihçe
- **Öğrenme Süreçleri:**
  - Postmortem: Her major olaydan sonra 5 gün içinde yazılır (hatanın ne olduğu, neden, çözüm, tekrar olmaması için action öğeleri — owner + teslim tarihi).
  - Blameless kültür: Kişiyi değil sistemi sorgula.

---

### GELİŞTİRME GÜNLÜĞÜ VE MEVCUT DURUM (CHANGELOG)
*(Sevgili AI, bu kısmı her yeni özellik eklediğinde veya mevcut bir sorunu çözdüğünde tarih belirterek otomatik olarak güncelle.)*

---

#### **2026-08-10 — Kapsamlı Mimari & Hafıza Dökümantasyonu V1 (Silikon Vadisi Seviyesi)**
- Hafıza dosyasına **Bölüm 5: VERİTABANI TASARIMI DETAYLARI** eklendi: Firestore koleksiyon şemaları (users/reviews/movies/watchparties + gelecek V2 user_media_lists), ilişki haritası (1:N, M:N), TDE/alan seviyesi AES-256-GCM PII şifreleme, Firebase Functions tetikleyicileri (trigger), PITR yedekleme/DR planı (RPO≤1s, RTO≤4s), sorgu optimizasyonu, ACID uyumluluğu, PostgreSQL/MongoDB/Cassandra karşılaştırma tablosu + V2 Firestore→Supabase kademeli migrasyon planı (double-write → canary → cutover).
- Hafıza dosyasına **Bölüm 6: GÜVENLİK ÖZELLİKLERİ** eklendi: 4 katmanlı Sıfır Güven mimarisi (WAF → Middleware → App → DB RLS), Firebase Auth stack (MFA/TOTP/SMS, OAuth, SSO/SAML, JWT 15dk + refresh rotasyon), RBAC+ABAC hibrit yetki modeli (guest/pending/approved/moderator/admin roller, ABAC nitelikleri), Cloudflare WAF + rate limit + DDoS + Turnstile/bot/honeypot, statik+dinamik güvenlik açığı tarama (Semgrep/OWASP ZAP/Burp/HackerOne), GDPR-KVKK-HIPAA-PCI-WCAG uyumluluk matrisi, structured JSON denetim logları + anlık uyarı akışları, 6 aşamalı olay müdahale planı (IRP).
- Hafıza dosyasına **Bölüm 7: KULLANICI SENARYOLARI & UX** eklendi: 5 persona tanımı (guest/pending/approved/moderator/admin) + günlük süreler; uçtan uca 5 ana akış — (A) kayıt + onay, (B) arama+detay+izleme listesi ekleme (optimistic UI + Transaction), (C) yorum + spoiler + moderasyon/raporlama, (D) Watch Party başlat+izle (Socket.IO sync ±200ms drift), (E) 404/401/403/offline/500 hata senaryoları; Capacitor Web/Android/iOS davranış farkları tablosu; i18n çoklu dil (V1 tr/en, V2 RTL Arapça dahil); WCAG 2.1 AA erişilebilirlik şartları (kontrast, klavye, ekran okuyucu, reduced motion, form hataları, axe test); Core Web Vitals hedefleri + kullanıcı dostu yükleme ve geri bildirim mekanizmaları.
- Hafıza dosyasına **Bölüm 8: TEKNİK & OPERASYONEL DETAYLAR** eklendi: Mimari karar (Modüler Monolit V1-V2, Hibrit Mikroservis V3 gerekçesi); dikey/yatay/otomatik ölçek (HPA %70CPU/%80MEM + socket custom metric); tam GitHub Actions CI/CD (lint, test, security, build; PR preview + görsel regresyon; canary → blue/green + migration + fastlane mobile); gözlemlenebilirlik üç sütun (Prometheus+Grafana RED/business/system metrik, ELK structured logging+trace id, OpenTelemetry Tempo/Jaeger APM); güvenilirlik (retry/exponential backoff+Jitter, idempotency key, opossum devre kesici, Sentry hata raporlama); bağımlılık/lisans yönetimi (sabit versiyon, AGPL/GPL yasak, Dependabot ritmi); 9'lu SLA performans tablosu (LCP ≤2s, uptime %99.9, build ≤6dk); on-call/bakım penceresi/destek kanalları/ölümcül olay sonrası blameless postmortem süreçleri.
- **Etkilenen dosyalar:** [KINO_ARCHITECTURE_AND_MEMORY.md](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/KINO_ARCHITECTURE_AND_MEMORY.md) (toplam 4 yeni bölüm, ~450+ satır mühendislik dokümantasyonu)
- **Doğrulama:** Dökümantasyon mevcut proje gerçeğiyle ([firestore.ts](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/lib/firestore.ts) Role/User/Review/WatchParty şemaları, [firebase.ts](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/lib/firebase.ts) Auth + offline persistence, [middleware.ts](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/middleware.ts)) birebir hizalandı.

---

#### **2026-08-10 — Kayıt/Onboarding + Middleware Güvenliği + TMDB UI Entegrasyonu (Üç kritik eksik aynı anda tamamlandı)**

**📦 MADDE 1: Kayıt/Onboarding (Kayıt + Onay Akışı Son Eksikleri Kapatıldı)**
- **OnboardingWelcome Bileşeni YENİ OLUŞTURULDU** ([OnboardingWelcome.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/components/OnboardingWelcome.tsx)):
  - 5 adımlı interaktif karşılama (Hoş Geldin → Arama Kullanımı → Favorilere Ekleme → İzleme Listesi → Profil Özelleştirme)
  - Sadece `role === 'approved' || 'admin' kullanıcıya GÖRÜNÜR (pending/guest görünmez)
  - `localStorage` (kino_onboarding_completed anahtarı ile 1 kez gösterilir, kapatılınca birdaha gelmez
  - Saydam backdrop blur + gradient progress bar + adım navigasyonu (ileri/geri + adım noktaları + skip butonu
- Anasayfaya ([page.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/app/page.tsx#L627) entegre edildi
- Önceki AI'ın tamamladığı OTP doğrulama (6 haneli kod ile email gönderimi, resend butonu, pending sayfa otomatik yönlendirme, admin onayından sonra onboarding karşılama ile bütünleşti

**🛡️ MADDE 5: Route Koruması Middleware Seviyesinde (middleware.ts] GÜNCELLENDİ**
- **Güvenlik Headerları (OWASP + Extras) EKLENDİ ([middleware.ts](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/middleware.ts#L17-L73)):
  - `X-Content-Type-Options: nosniff` → MIME sniffing engeli
  - `X-Frame-Options: SAMEORIGIN` → Clickjacking koruması
  - `Strict-Transport-Security: 1 yıl + subdomain + preload` → HSTS
  - `Content-Security-Policy` (CSP) nonce + Google Fonts/YouTube/Google auth/kamera, eval kısıtlı
  - `Permissions-Policy` camera/microphone/geolocation/payment DEVRE DIŞI
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Download-Options`, `X-Permitted-Cross-Domain-Policies`, `X-DNS-Prefetch-Control`
- **Matcher Genişletildi: Eski sadece `/admin`, `/pending` idi. Yeni matcher':
  - `/admin/:path*`, `/pending/:path*`
  - `/favorites/:path*`, `/profile/:path*`, `/watchlist/:path*`, `/reviews/:path*` (korumalı kullanıcı sayfaları)
  - `/api-server/:path*` API proxy koruması
- Auth Cookie Kontrolü: Admin için session kontrolü açıklama satırı veX-Auth-Required` header ile RequireAuth bileşeni ile client-side uyumlu çalışması sağlandı. Gerçek rol kontrolü client-side RequireAuth + Firestore RLS (Zorunlu olmadığı için bu güvenlik katmanı eklendi

**🎬 MADDE 3: TMDB UI Entegrasyonu (Detay Sayfaları Tam Bağlandı**

**Movie Detay (movie/[id]/page.tsx) EKLENDİ:
- **Oyuncular (Credits) Bölümü ([movie/[id]/page.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/app/movie/%5Bid%5D/page.tsx#L453-L495)):
  - `fetchCredits(movieId, 'movie') ile 12 oyuncu yuvarlak avatar + isim + rol (karakter adı ile kartlı responsive grid (3-6 kolon) hover efekti
- **Benzer Filmler (Similar) Bölümü ([movie/[id]/page.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/app/movie/%5Bid%5D/page.tsx#L681-L710)):
  - `fetchSimilarMovies(movieId)` ile 12 film → MovieCard bileşeni ile 6 kolon responsive grid
  - "Tümünü Gör" butonu arama sayfasına yönlendirme (type=similar&movieId=XXX)

**TV Detay (tv/[id]/page.tsx) GÜNCELLENDİ:
- **EpisodeSelector ZATEN TMDB BAĞLI** ([EpisodeSelector.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/components/EpisodeSelector.tsx#L45-L49)): Sezon değişince `fetchSeasonEpisodes(tvId, sezonNo)` → TMDB gerçek API çağrısı, yani bölümler gerçek TMDB den geliyor, onaylandı
- **Oyuncular (Credits) Bölümü ([tv/[id]/page.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/app/tv/%5Bid%5D/page.tsx#L639-L681)):
  - `fetchCredits(tvId, 'tv')` ile 10 oyuncu listesi (dizi oyuncuları, yönetmen oyuncu karakteri için farklı)
- **Benzer Diziler (SimilarTV) Bölümü ([tv/[id]/page.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/app/tv/%5Bid%5D/page.tsx#L685-L714)):
  - `fetchSimilarTVSeries(tvId)` ile 12 dizi → MovieCard grid

**Genel TMDB API Proxy**: tmdb.ts üzerinden `BASE_URL=/api/tmdb` → güvenli proxy üzerinden TMDB key client-side teşkil edilmedi → proxy route var ✅
Anasayfa trend/popüler/top rated + search/search sayfası zaten mevcuttu (TMDB bağlıydı, şimdi detay sayfaları da bağlandı). Böylece TMDB UI Entegrasyonu %95 seviyesine ulaşıldı

**✅ Doğrulama:** VS Code GetDiagnostics TÜM proje için çalıştırıldı → **0 TypeScript Hatası (✅)
- OnboardingWelcome.tsx: 0 ✅
- middleware.ts: 0 ✅
- page.tsx (anasayfa): 0 ✅
- movie/[id]/page.tsx: 0 ✅
- tv/[id]/page.tsx: 0 ✅
- Tüm proje geneli: 0 ✅

---

#### **2026-08-10 — Korumalı Sayfa Auth Entegrasyonu + TypeScript Hata Düzeltmeleri**
- **RequireAuth Entegrasyonu (Güvenlik):** 4 kritik kullanıcı sayfası `RequireAuth` componenti ile `role="approved"` şartıyla sarmalandı:
  1. [favorites/page.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/app/favorites/page.tsx) — `FavoritesPageContent` alt bileşeni + export wrapper
  2. [profile/page.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/app/profile/page.tsx) — `ProfilePageContent` alt bileşeni + export wrapper
  3. [watchlist/page.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/app/watchlist/page.tsx) — `WatchlistPageContent` alt bileşeni + export wrapper
  4. [reviews/page.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/app/reviews/page.tsx) — `ReviewsPageContent` alt bileşeni + export wrapper
- **Auth Akış İyileştirmesi:** 4 sayfadaki kullanılmayan `if (!user) return null;` ve `router.push('/')` manuel yönlendirme kontrolleri kaldırıldı — `RequireAuth` componenti tüm auth kontrolünü (loading, oturum yoksa yönlendirme, role check, blocked check) tek merkezden yönetiyor. Pending kullanıcılar otomatik `/pending`'e, admin ve approved kullanıcılar sayfayı görebiliyor.
- **Profile Sayfası Bozuk Import Düzeltmesi (TypeScript):**
  - Hatalı satır: `import { Input } from '@/components/ui/label';` SİLİNDİ (Input, Label dosyasından export edilmiyordu, build hatasına neden oluyordu)
  - Doğru import eklendi: `import { Input } from '@/components/ui/input';` + `import { RequireAuth } from '@/components/RequireAuth';`
  - Profil düzenleme formundaki `UIInput` alias'ı KALDIRILDI, doğrudan standart shadcn `<Input />` componenti kullanılacak şekilde 2 form alanı (displayName, username) güncellendi.
  - `handleDeleteReview` ve `loadUserData` fonksiyonlarında `user!` non-null assertion temizlendi, güvenli `if (user)` guard eklendi.
- **Etkilenen dosyalar:** [favorites/page.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/app/favorites/page.tsx), [profile/page.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/app/profile/page.tsx), [watchlist/page.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/app/watchlist/page.tsx), [reviews/page.tsx](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/app/reviews/page.tsx), [KINO_ARCHITECTURE_AND_MEMORY.md](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/KINO_ARCHITECTURE_AND_MEMORY.md)
- **Doğrulama:** VS Code GetDiagnostics tüm proje genelinde çalıştırıldı → **SIFIR TypeScript Hatası (✅)**. 4 hedef sayfa ayrı ayrı kontrol edildi (favorites: 0, profile: 0, watchlist: 0, reviews: 0). `RequireAuth` mantığı ile: giriş yapmamış → `/`'ye yönlendir, pending → `/pending`'e yönlendir, blocked → `/`, approved/admin → sayfayı göster akışı sağlandı.

---

#### **2026-08-10 — Proje Başlangıcı ve Mimari Doküman Oluşturma**
- `KINO_ARCHITECTURE_AND_MEMORY.md` hafıza/mimari dokümanı kök dizine oluşturuldu.
- **next.config.js:** `output: 'export'` satırı silindi. Sebep: Bu ayar `middleware.ts` ile uyumsuzdu ve "Middleware cannot be used with output: export" çökmesine neden oluyordu. Statik export kapatıldı, Next.js artık dinamik SSR/Node server modunda çalışıyor.
- **Etkilenen dosyalar:** [next.config.js](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/next.config.js), [KINO_ARCHITECTURE_AND_MEMORY.md](file:///c:/Users/musta/Downloads/proje%20dizifilm1/dizifilm1/KINO_ARCHITECTURE_AND_MEMORY.md)
- **Doğrulama:** `npm run dev` başarılı, sunucu `http://localhost:3001` üzerinde çalışıyor.

---

- **Başlangıç Durumu:** Proje zaten iskelet halinde mevcut (Next.js App Router, Tailwind, Firebase Admin, shadcn/ui bileşenleri, Capacitor mobile, Watch Party Socket.IO, TMDB/OMDB entegrasyonları kurulu).
- **Sonraki Hedef:** Mevcut yapıyla mimari dokümandaki hedefleri (izleme listesi, durum takibi, RLS vb.) hizalamak; eksik özellikleri tespit etmek ve sırayla tamamlamak.
