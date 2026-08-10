import { NextResponse } from 'next/server';

const otpStore = new Map<string, { code: string; exp: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of Array.from(otpStore.entries())) {
    if (v.exp < now) otpStore.delete(k);
  }
}, 60_000);

export function getStoredOtp(email: string): { code: string; exp: number } | undefined {
  const key = email.toLowerCase().trim();
  return otpStore.get(key);
}

export function setStoredOtp(email: string, code: string, ttlMs = 10 * 60 * 1000) {
  const key = email.toLowerCase().trim();
  otpStore.set(key, { code, exp: Date.now() + ttlMs });
}

export function deleteStoredOtp(email: string) {
  otpStore.delete(email.toLowerCase().trim());
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body as { email?: string };

    if (!email) {
      return NextResponse.json({ ok: false, error: 'E-posta gerekli' }, { status: 400 });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setStoredOtp(email, code);

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'no-reply@cinemax.local';

    if (host && port && user && pass) {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      const info = await transporter.sendMail({
        from,
        to: email,
        subject: 'CineMax Kayıt Doğrulama Kodu',
        text: `Doğrulama kodunuz: ${code}. Bu kod 10 dakika içinde geçerlidir.`,
        html: `
          <div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
            <h2>CineMax</h2>
            <p>Hesabınızı doğrulamak için aşağıdaki kodu girin:</p>
            <div style="font-size:28px;font-weight:bold;letter-spacing:6px;padding:12px 16px;background:#f5f5f5;border-radius:12px;display:inline-block">${code}</div>
            <p>Bu kod 10 dakika içinde geçerlidir. Başkasıyla paylaşmayın.</p>
          </div>
        `,
      });

      const shouldReturnCode = process.env.NEXT_PUBLIC_SHOW_DEV_OTP === 'true';
      return NextResponse.json({ ok: true, messageId: info.messageId, code: shouldReturnCode ? code : undefined });
    } else {
      console.log('[OTP]', email, code);
      return NextResponse.json({ ok: true, dev: true, code });
    }
  } catch (err) {
    console.error('OTP gönderim hatası:', err);
    return NextResponse.json({ ok: false, error: 'Gönderim hatası' }, { status: 500 });
  }
}
