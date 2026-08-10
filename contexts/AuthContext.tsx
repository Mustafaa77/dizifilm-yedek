'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserSessionPersistence,
  sendEmailVerification as fbSendEmailVerification,
  sendPasswordResetEmail,
  applyActionCode,
  checkActionCode,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createOrUpdateUser, getUserData, UserData } from '@/lib/firestore';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyOtpCode: (email: string, code: string) => Promise<{ ok: boolean; dev?: boolean; code?: string }>;
  sendOtpEmail: (email: string) => Promise<{ ok: boolean; dev?: boolean; code?: string; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  // Firebase persistence'ı session olarak ayarla (tarayıcı kapanınca çıkış yap)
  useEffect(() => {
    setPersistence(auth, browserSessionPersistence).catch(console.error);
  }, []);

  const refreshUserData = async () => {
    if (user) {
      try {
        const data = await getUserData(user.uid);
        setUserData(data);
      } catch (error) {
        console.error('Kullanıcı verileri yenilenirken hata:', error);
        setUserData({
          userId: user.uid,
          favoriteItems: [],
          watchedItems: [],
          watchLaterItems: [], // Yeni alan
          email: user.email || '',
          displayName: user.displayName || '',
          username: 'user' + Date.now().toString().slice(-6),
          role: 'pending',
          status: 'active',
          avatarUrl: user.photoURL || undefined,
        });
      }
    }
  };

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.uid);
      setUser(user);

      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = undefined;
      }

      if (user) {
        try {
          let userData = await getUserData(user.uid);

          if (!userData) {
            console.log('Kullanıcı verisi bulunamadı, oluşturuluyor...');
            const defaultUsername = 'user' + Date.now().toString().slice(-6);
            await createOrUpdateUser({
              userId: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              username: defaultUsername,
            });
            userData = await getUserData(user.uid);
          }

          if (!userData) {
            userData = {
              userId: user.uid,
              favoriteItems: [],
              watchedItems: [],
              watchLaterItems: [],
              email: user.email || '',
              displayName: user.displayName || '',
              username: 'user' + Date.now().toString().slice(-6),
              role: 'pending',
              status: 'active',
              avatarUrl: user.photoURL || undefined,
            };
          }

          setUserData(userData);

          const userDocRef = doc(db, 'users', user.uid);
          unsubscribeFirestore = onSnapshot(userDocRef, (snap) => {
            if (snap.exists()) {
              const fresh = snap.data() as UserData;
              console.log('[Firestore onSnapshot] userData güncellendi:', fresh.role, fresh.status);
              setUserData(fresh);
            }
          }, (err) => {
            console.warn('Firestore snapshot hatası (permission olabilir — beklemedeyiz):', err.code);
          });
        } catch (error) {
          console.error('Kullanıcı verileri yüklenirken hata:', error);
          setUserData({
            userId: user.uid,
            favoriteItems: [],
            watchedItems: [],
            watchLaterItems: [],
            email: user.email || '',
            displayName: user.displayName || '',
            username: 'user' + Date.now().toString().slice(-6),
            role: 'pending',
            status: 'active',
            avatarUrl: user.photoURL || undefined,
          });
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubscribeFirestore) unsubscribeFirestore();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Giriş hatası:', error);
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    if (!auth.currentUser) return;
    try {
      await fbSendEmailVerification(auth.currentUser, {
        url: typeof window !== 'undefined' ? window.location.origin + '/pending' : undefined,
        handleCodeInApp: false,
      });
    } catch (error) {
      console.warn('Firebase doğrulama emaili gönderilemedi (SMTP ayarlanmamış olabilir). OTP akışı kullanılıyor.', error);
    }
  };

  const sendOtpEmail = async (email: string): Promise<{ ok: boolean; dev?: boolean; code?: string; message?: string }> => {
    try {
      const res = await fetch('/api-server/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        return { ok: false, message: data?.error || 'Gönderim hatası' };
      }
      return { ok: true, dev: data.dev, code: data.code };
    } catch (error) {
      console.error('OTP gönderim hatası (fetch):', error);
      return { ok: false, message: 'Ağ hatası' };
    }
  };

  const verifyOtpCode = async (
    email: string,
    code: string
  ): Promise<{ ok: boolean; dev?: boolean; code?: string }> => {
    const key = `otp_${email.toLowerCase()}`;
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem(key) : null;
    const now = Date.now();
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { code: string; exp: number; dev?: boolean };
        if (parsed.exp > now && parsed.code === code) {
          return { ok: true, dev: parsed.dev, code: parsed.code };
        }
      } catch {
        // ignore
      }
    }
    return { ok: false };
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email, {
        url: typeof window !== 'undefined' ? window.location.origin + '/' : undefined,
      });
    } catch (error) {
      console.error('Şifre sıfırlama hatası:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, username: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createOrUpdateUser({
        userId: userCredential.user.uid,
        email: userCredential.user.email || '',
        displayName: userCredential.user.displayName || '',
        username,
        role: 'pending',
        status: 'active',
        avatarUrl: userCredential.user.photoURL || undefined,
      });
      // Yeni akış: e‑posta link doğrulaması gönderilmiyor (OTP ile doğrulama yapılır)
    } catch (error) {
      console.error('Kayıt hatası:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      // Google ile giriş yapan kullanıcı için username oluştur
      const existingUser = await getUserData(result.user.uid);
      if (!existingUser) {
        let username = result.user.displayName?.toLowerCase().replace(/[^a-z0-9]/g, '') || 
                      result.user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '') || 
                      'user';
        
        // Benzersizlik için timestamp ekle
        username = username + Date.now().toString().slice(-6);
        
        await createOrUpdateUser({
          userId: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || '',
          username: username,
          role: 'pending',
          status: 'active',
          avatarUrl: result.user.photoURL || undefined,
        });
      }
    } catch (error) {
      console.error('Google giriş hatası:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Çıkış hatası:', error);
      throw error;
    }
  };

  const value = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    logout,
    refreshUserData,
    sendVerificationEmail,
    resetPassword,
    sendOtpEmail,
    verifyOtpCode,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}