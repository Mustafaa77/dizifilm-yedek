import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    // Sadece değişkenler varsa başlat
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
      });
      console.log('Firebase Admin başarıyla başlatıldı');
    } else {
      console.warn('Firebase Admin değişkenleri eksik, başlatılmadı.');
    }
  } catch (error) {
    console.error('Firebase Admin başlatma hatası:', error);
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : {} as any;
export const adminFirestore = admin.apps.length ? admin.firestore() : {} as any;