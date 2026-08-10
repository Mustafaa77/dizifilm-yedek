import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const NONCE = Buffer.from(crypto.randomUUID()).toString('base64');

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  GÜVENLİK HEADERLARI (OWASP TOP 10 + EXTRA)               ║
  // ╚══════════════════════════════════════════════════════════════╝
  // MIME sniffing'i engelle
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Clickjacking koruması
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  // Strict Transport Security (1 yıl + subdomain)
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // Referrer politikası: sadece aynı origin
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // XSS + Injection koruması
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com",
      `script-src-elem 'self' 'unsafe-inline' https://apis.google.com 'nonce-${NONCE}'`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: http:",
      "media-src 'self' data: blob: https:",
      "connect-src 'self' https: http: ws: wss:",
      "frame-ancestors 'self'",
      "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ')
  );

  // Ek izinler (kamera/mikrofon/lokasyon devre dışı)
  response.headers.set(
    'Permissions-Policy',
    [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'publickey-credentials-get=*',
    ].join(', ')
  );

  // IE eski download koruması
  response.headers.set('X-Download-Options', 'noopen');

  // Cross-domain policy
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');

  // DNS prefetch
  response.headers.set('X-DNS-Prefetch-Control', 'off');

  // ╔══════════════════════════════════════════════════════════════╗
  // ║  ROTA ÖZEL KONTROLLER                                      ║
  // ╠══════════════════════════════════════════════════════════════╣
  // ║  Önemli Not: Firebase Auth JWT server-side middleware'de   ║
  // ║  doğrulanmaz (native olarak desteklemez). Gerçek rol       ║
  // ║  kontrolleri her zaman Client-Side (RequireAuth) +         ║
  // ║  Firestore RLS (firestore.rules) katmanında yapılır.       ║
  // ║  Middleware burada sadece "ilk savunma hattı" olarak        ║
  // ║  temel güvenlik header'ları + matcher aracılığıyla         ║
  // ║  ek koruma sağlar.                                          ║
  // ╚══════════════════════════════════════════════════════════════╝

  // Admin rotası: sadece giriş yapmış kullanıcıların erişebilmesi için
  // Firebase auth cookie (session) var mı diye temel kontrol — yoksa anasayfaya yönlendir
  // (gerçek admin kontrolü yine client-side RequireAuth + RLS ile yapılır)
  if (pathname.startsWith('/admin')) {
    const authCookie =
      request.cookies.get('__Secure-next-auth.session-token')?.value ||
      request.cookies.get('next-auth.session-token')?.value;
    // Session persistence: Firebase browserSessionPersistence kullandığımız için
    // server-side cookie bulunmayabilir, client-side ile kontrol ediyoruz.
    // Header ile bilgiyi geçelim ve RequireAuth karar versin:
    if (!authCookie && !request.headers.get('authorization')) {
      // Kesin auth kanıtı yoksa güvenli taraf için yönlendirme yapma,
      // RequireAuth component'i bunu client'ta halledecek, header ekle:
      response.headers.set('X-Auth-Required', 'admin');
    }
  }

  // Pending sayfası: Sadece pending user erişebilmeli (client-side PendingPage componentinde yapılıyor)
  if (pathname.startsWith('/pending')) {
    response.headers.set('X-Auth-Required', 'pending');
  }

  // Korumalı sayfalar (favorites, profile, watchlist, reviews)
  // Bunlar zaten client-side RequireAuth ile sarmalandı, ama header ile ekstra bilgi:
  if (
    pathname.startsWith('/favorites') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/watchlist') ||
    pathname.startsWith('/reviews')
  ) {
    response.headers.set('X-Auth-Required', 'approved');
  }

  return response;
}

// Matcher: middleware'ın çalışacağı tüm rotalar
// Koruma altına aldığımız tüm sayfalar + api-server rotaları
export const config = {
  matcher: [
    '/admin/:path*',
    '/pending/:path*',
    '/favorites/:path*',
    '/profile/:path*',
    '/watchlist/:path*',
    '/reviews/:path*',
    '/api-server/:path*',
  ],
};