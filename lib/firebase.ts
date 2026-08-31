import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Firebase yapılandırması - .env.local'dan çevresel değişkenlerle (trim ile boşlukları temizle)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim(),
} as const;

// Ortam değişken doğrulaması (hata nedenini açıkça göstermek için)
if (!firebaseConfig.apiKey || typeof firebaseConfig.apiKey !== "string" || firebaseConfig.apiKey.length < 10) {
  throw new Error(
    "Firebase API key bulunamadı veya geçersiz. .env.local içine NEXT_PUBLIC_FIREBASE_API_KEY değerini ekleyin ve dev sunucusunu yeniden başlatın."
  );
}

// Firebase uygulamasını başlat
const app = initializeApp(firebaseConfig);

// Auth servisini başlat
export const auth = getAuth(app);

// Firestore servisini başlat ve Offline desteğini yeni yöntemle (v10+) etkinleştir
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// Analytics sadece client-side'da ve production'da çalışır
export const analytics = typeof window !== 'undefined' && process.env.NODE_ENV === 'production'
  ? getAnalytics(app)
  : null;

export default app;
