import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Backblaze B2 S3 uyumlu istemci yapılandırması
const s3Client = new S3Client({
  region: 'auto', // Backblaze B2 için 'auto' kullanılır
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.B2_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Belirtilen film dosyası için imzalı URL oluşturur
 * @param movieId Film ID'si
 * @param fileName Dosya adı (varsayılan: 'movie.mp4')
 * @param expiresIn URL'nin geçerlilik süresi (saniye cinsinden, varsayılan: 15 dakika)
 * @returns İmzalı URL
 */
export async function generateSignedUrl(
  movieId: string, 
  fileName: string = 'movie.mp4',
  expiresIn: number = 15 * 60 // 15 dakika
): Promise<string> {
  try {
    // Dosya yolu: movies/{movieId}/{fileName}
    const key = `movies/${movieId}/${fileName}`;
    
    const command = new GetObjectCommand({
      Bucket: process.env.B2_BUCKET || '',
      Key: key,
    });

    // İmzalı URL oluştur
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('İmzalı URL oluşturma hatası:', error);
    throw new Error('İmzalı URL oluşturulamadı');
  }
}