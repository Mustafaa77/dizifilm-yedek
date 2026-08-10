import { NextResponse } from 'next/server';
import '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, email, displayName, username } = body as {
      userId?: string;
      email?: string;
      displayName?: string;
      username?: string;
    };

    if (!userId || !email) {
      return NextResponse.json({ ok: false, error: 'userId ve email gerekli' }, { status: 400 });
    }

    const from = process.env.SMTP_FROM || 'no-reply@cinemax.local';
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
    const smtpUser = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof process !== 'undefined' ? 'http://localhost:3001' : '');

    const subject = '🎉 Hesabınız Onaylandı — CineMax';
    const text = `Merhaba ${displayName || username || 'Kullanıcı'},

CineMax hesabınız başarıyla onaylandı! Artık tüm özelliklerden (izleme listeleri, yorumlar, arama vb.) faydalanabilirsiniz.

Hesabınıza giriş yapın: ${siteUrl}/

Keyifli izlemeler dileriz.
CineMax Ekibi
`;
    const html = `
      <div style="font-family:Arial,sans-serif;font-size:15px;color:#111;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(90deg,#10b981,#06b6d4);padding:24px;color:#fff;border-radius:16px 16px 0 0">
          <h1 style="margin:0;font-size:26px">🎉 Hoş Geldiniz, ${displayName || username || 'Kullanıcı'}!</h1>
        </div>
        <div style="padding:32px 24px;background:#fff;border:1px solid #eee;border-top:none;border-radius:0 0 16px 16px">
          <p style="font-size:17px">CineMax hesabınız <strong>başarıyla onaylandı</strong>. 🎬</p>
          <p style="color:#555">Artık binlerce film ve diziyi keşfedebilir, izleme listelerini yönetebilir, yorumlarınızı paylaşabilirsiniz.</p>
          <div style="margin:24px 0; text-align:center">
            <a href="${siteUrl}/" style="display:inline-block;padding:14px 32px;background:#10b981;color:#fff;font-weight:600;border-radius:12px;text-decoration:none">Hemen Giriş Yap →</a>
          </div>
          <p style="color:#888;font-size:13px">Keyifli izlemeler dileriz.<br/>CineMax Ekibi</p>
        </div>
      </div>
    `;

    if (host && port && smtpUser && pass) {
      try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user: smtpUser, pass },
        });
        await transporter.sendMail({ from, to: email, subject, text, html });
        return NextResponse.json({ ok: true });
      } catch (mailErr) {
        console.error('Onay emaili SMTP hatası:', mailErr);
        console.log('[ONAY EMAILI - FALLBACK]', email, subject);
        return NextResponse.json({ ok: true, dev: true, fallback: true });
      }
    } else {
      console.log('[ONAY EMAILI - DEV]', email, subject);
      return NextResponse.json({ ok: true, dev: true });
    }
  } catch (err) {
    console.error('Onay emaili gönderim hatası:', err);
    return NextResponse.json({ ok: false, error: 'Gönderim hatası' }, { status: 500 });
  }
}
