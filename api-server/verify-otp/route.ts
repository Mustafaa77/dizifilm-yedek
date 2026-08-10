import { NextResponse } from 'next/server';
import { getStoredOtp, deleteStoredOtp } from '../send-otp/route';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code } = body as { email?: string; code?: string };

    if (!email || !code) {
      return NextResponse.json({ ok: false, error: 'E-posta ve kod gerekli' }, { status: 400 });
    }

    const stored = getStoredOtp(email);
    if (!stored) {
      return NextResponse.json({ ok: false, error: 'Doğrulama kodu bulunamadı veya süresi doldu' }, { status: 400 });
    }

    if (Date.now() > stored.exp) {
      deleteStoredOtp(email);
      return NextResponse.json({ ok: false, error: 'Doğrulama kodunun süresi doldu' }, { status: 400 });
    }

    if (stored.code !== code.trim()) {
      return NextResponse.json({ ok: false, error: 'Hatalı doğrulama kodu' }, { status: 400 });
    }

    deleteStoredOtp(email);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('OTP doğrulama hatası:', err);
    return NextResponse.json({ ok: false, error: 'Sunucu hatası' }, { status: 500 });
  }
}
