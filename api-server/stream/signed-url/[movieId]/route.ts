import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminFirestore } from '@/lib/firebase-admin';
import { generateSignedUrl } from '@/lib/backblaze';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { movieId: string } }
) {
  try {
    // 1. Firebase ID Token'ı al
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Yetkilendirme başlığı gerekli' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];
    
    // 2. Token'ı doğrula ve kullanıcı bilgilerini al
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;
    
    // 3. Film ID'sini al
    const { movieId } = params;
    if (!movieId) {
      return NextResponse.json(
        { error: 'Film ID\'si gerekli' },
        { status: 400 }
      );
    }
    
    // 4. Kullanıcının bu filme erişim izni olup olmadığını kontrol et
    const permissionDoc = await adminFirestore
      .collection('moviePermissions')
      .where('userId', '==', userId)
      .where('movieId', '==', movieId)
      .where('hasAccess', '==', true)
      .limit(1)
      .get();
    
    if (permissionDoc.empty) {
      return NextResponse.json(
        { error: 'Bu filme erişim izniniz yok' },
        { status: 403 }
      );
    }
    
    // 5. İmzalı URL oluştur
    const signedUrl = await generateSignedUrl(movieId);
    
    // 6. İmzalı URL'yi döndür
    return NextResponse.json({ url: signedUrl });
    
  } catch (error: any) {
    console.error('İmzalı URL oluşturma hatası:', error);
    
    // Token doğrulama hatası
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/id-token-revoked') {
      return NextResponse.json(
        { error: 'Oturum süresi dolmuş, lütfen tekrar giriş yapın' },
        { status: 401 }
      );
    }
    
    // Diğer hatalar
    return NextResponse.json(
      { error: 'Sunucu hatası' },
      { status: 500 }
    );
  }
}