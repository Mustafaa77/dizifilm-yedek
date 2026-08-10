# DiziFilm (CineMax)

Modern Next.js 14 (App Router) ile geliştirilmiş film/dizi keşif, izleme listesi ve yorum platformu. Firebase Authentication + Firestore kullanır; e-posta/şifre ile kayıt, yorumlar, favoriler ve admin paneli ile içerik/yönetim özellikleri içerir.

## Özellikler
- E-posta/şifre ile kayıt ve giriş
- OTP ile kayıt doğrulama (e-posta üzerinden kod gönderimi)
- Profil, favoriler, izleme listesi, yorumlar sayfaları
- Film/dizi arama ve detay sayfaları
- Admin paneli: kullanıcı yönetimi, yorum/film yönetimi, istatistikler

## Teknolojiler
- Next.js 14 App Router, TypeScript, Tailwind CSS
- Firebase Auth + Firestore
- Nodemailer ile SMTP e-posta entegrasyonu

## Kurulum

1. Bağımlılıkları yükleyin:

```
npm install
```

2. Geliştirme sunucusunu başlatın:

```
npm run dev
```

3. Tarayıcıdan açın: `http://localhost:3000`

## Ortam Değişkenleri

`.env.local` dosyasına aşağıdaki değerleri ekleyin:

### Firebase
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Bu değerler `lib/firebase.ts` içinde kullanılır.

### SMTP (OTP e-posta gönderimi)
- `SMTP_HOST` (Ör: `smtp.gmail.com`)
- `SMTP_PORT` (Ör: `587`)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM` (Ör: `"CineMax <you@example.com>"`)

Geliştirme sırasında testi kolaylaştırmak için:
- `NEXT_PUBLIC_SHOW_DEV_OTP=true` (Geliştirme modunda OTP kodu API yanıtında ve opsiyonel olarak UI’da görünür.)

## OTP Akışı
- Kayıt formunda e-posta girildiğinde `/api/send-otp` rotası çağrılır.
- Sunucu tarafında rastgele 6 haneli kod üretilir ve e-posta ile gönderilir.
- SMTP yapılandırılmadıysa, kod sunucu loglarına yazılır ve API yanıtında döner.
- `NEXT_PUBLIC_SHOW_DEV_OTP=true` ile geliştirme modunda kod UI’da görülebilir.
- Kullanıcı OTP’yi girerek kayıt işlemini tamamlar.

Not: Üretim ortamında güvenlik için OTP’nin süreli saklanması, deneme sayısı sınırlaması ve sunucu tarafı doğrulaması eklenmelidir.

## Admin Paneli
- Yol: `/admin`
- Admin kullanıcılar, kullanıcı/yorum/film yönetimi ve istatistikleri görüntüleyebilir.

## Sık Karşılaşılan Sorunlar

### `net::ERR_ABORTED` Hataları
- Geliştirme sırasında hızla yapılan yönlendirmeler veya HMR (hot reload) istekleri iptal edebilir.
- Header ve Pending sayfasındaki agresif yönlendirmeler azaltıldı.
- Firestore’un WebChannel istekleri dev ortamda abort görünebilir; çoğu durumda işlevselliği etkilemez.

### E-posta Gelmiyor
- SMTP değişkenlerinin doğru olduğundan emin olun.
- Gmail kullanıyorsanız “Uygulama Şifreleri” ile şifre oluşturun.
- Geliştirme modunda kod sunucu loglarında ve API yanıtında döner.

## Komutlar
- `npm run dev`: Geliştirme sunucusu
- `npm run build`: Üretim derlemesi
- `npm run start`: Üretim sunucusu

## Lisans
Bu proje eğitim ve demo amaçlıdır.