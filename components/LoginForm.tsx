'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, Eye, EyeOff, Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { collection, query, where, getDocs, getFirestore } from 'firebase/firestore';

interface LoginFormProps {
  onClose: () => void;
}

const PASSWORD_MIN = 6;

export function LoginForm({ onClose }: LoginFormProps) {
  const { signIn, signUp, signInWithGoogle, resetPassword, sendOtpEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
  });

  const [otpStage, setOtpStage] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [pendingSignup, setPendingSignup] = useState<{
    email: string;
    password: string;
    username: string;
  } | null>(null);

  const [forgotStage, setForgotStage] = useState<null | 'form' | 'sent'>(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const startResendCooldown = () => {
    setOtpResendCooldown(60);
    const t = setInterval(() => {
      setOtpResendCooldown((c) => {
        if (c <= 1) {
          clearInterval(t);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const checkUsernameUnique = async (username: string): Promise<boolean> => {
    if (!username || username.length < 3) return false;
    try {
      const dbFS = getFirestore();
      const usersRef = collection(dbFS, 'users');
      const q = query(usersRef, where('username', '==', username.toLowerCase()));
      const snap = await getDocs(q);
      return snap.empty;
    } catch (err) {
      console.warn('Username unique kontrolünde hata (RLS olabilir):', err);
      return true;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(loginForm.email.trim().toLowerCase(), loginForm.password);
      onClose();
      toast.success('Giriş başarılı, hoş geldiniz!');
    } catch (err: any) {
      let msg = err?.message || 'Giriş yapılamadı.';
      if (msg?.includes('user-not-found') || msg?.includes('invalid-credential')) {
        msg = 'E-posta veya şifre hatalı.';
      } else if (msg?.includes('too-many-requests')) {
        msg = 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const email = signupForm.email.trim().toLowerCase();
    const username = signupForm.username.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setError('Kullanıcı adı 3-20 karakter, sadece küçük harf, sayı ve alt çizgi içermeli.');
      return;
    }
    if (signupForm.password.length < PASSWORD_MIN) {
      setError(`Şifre en az ${PASSWORD_MIN} karakter olmalı.`);
      return;
    }
    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    try {
      const unique = await checkUsernameUnique(username);
      if (!unique) {
        setError('Bu kullanıcı adı zaten alınmış. Başka bir tane deneyin.');
        return;
      }
      const res = await sendOtpEmail(email);
      if (!res.ok) {
        setError(res.message || 'Doğrulama kodu gönderilemedi.');
        return;
      }
      setPendingSignup({ email, password: signupForm.password, username });
      setOtpStage(true);
      setOtpInput('');
      setOtpError('');
      startResendCooldown();
      if (res.dev && res.code) {
        toast.success(`[Geliştirme] Doğrulama kodunuz: ${res.code}`, { duration: 10000 });
      } else {
        toast.success(`${email} adresine doğrulama kodu gönderildi.`);
      }
    } catch (err: any) {
      setError(err?.message || 'Kayıt işlemi başlatılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingSignup || otpResendCooldown > 0) return;
    setOtpLoading(true);
    try {
      const res = await sendOtpEmail(pendingSignup.email);
      if (!res.ok) {
        setOtpError(res.message || 'Kod tekrar gönderilemedi.');
        return;
      }
      startResendCooldown();
      setOtpError('');
      if (res.dev && res.code) {
        toast.success(`[Geliştirme] Yeni kodunuz: ${res.code}`, { duration: 10000 });
      } else {
        toast.success('Yeni doğrulama kodu gönderildi.');
      }
    } catch (err: any) {
      setOtpError(err?.message || 'Tekrar gönderim hatası.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyAndSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSignup) return;
    if (otpInput.length !== 6) {
      setOtpError('Lütfen 6 haneli kodu girin.');
      return;
    }
    setOtpLoading(true);
    setOtpError('');
    try {
      const verifyRes = await fetch('/api-server/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingSignup.email, code: otpInput }),
      });
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !verifyData.ok) {
        setOtpError(verifyData?.error || 'Hatalı veya süresi dolmuş kod.');
        return;
      }
      await signUp(pendingSignup.email, pendingSignup.password, pendingSignup.username);
      toast.success('Hesabınız oluşturuldu! Admin onayından sonra erişebileceksiniz.');
      onClose();
    } catch (err: any) {
      let msg = err?.message || 'Doğrulama başarısız.';
      if (msg?.includes('email-already-in-use')) {
        msg = 'Bu e-posta adresiyle zaten hesap var. Giriş yapmayı deneyin.';
      }
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      onClose();
      toast.success('Google ile giriş başarılı!');
    } catch (err: any) {
      let msg = err?.message || 'Google ile giriş başarısız.';
      if (msg?.includes('popup-closed')) {
        msg = 'Google penceresini kapattınız.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !/^\S+@\S+\.\S+$/.test(forgotEmail)) {
      setError('Geçerli bir e-posta adresi girin.');
      return;
    }
    setForgotLoading(true);
    setError('');
    try {
      await resetPassword(forgotEmail.trim().toLowerCase());
      setForgotStage('sent');
    } catch (err: any) {
      let msg = err?.message || 'Sıfırlama linki gönderilemedi.';
      if (msg?.includes('user-not-found')) {
        msg = 'Bu e-postayla kayıtlı hesap bulunamadı.';
      }
      setError(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="w-full">
      {forgotStage ? (
        <div className="space-y-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setForgotStage(null);
              setForgotEmail('');
              setError('');
            }}
            className="px-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Girişe Dön
          </Button>
          {forgotStage === 'form' ? (
            <form onSubmit={handleSendReset} className="space-y-5">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Şifremi Sıfırla</h3>
                <p className="text-sm text-muted-foreground">
                  E-postanıza şifre sıfırlama linki göndereceğiz.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">E-posta</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="rounded-2xl h-12 bg-muted/50 !border-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all px-4"
                  required
                  disabled={forgotLoading}
                />
              </div>
              {error && (
                <Alert variant="destructive" className="rounded-xl border-none bg-destructive/10 text-destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]" disabled={forgotLoading}>
                {forgotLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Sıfırlama Linki Gönder
              </Button>
            </form>
          ) : (
            <div className="space-y-5 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-9 w-9 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold">Link Gönderildi!</h3>
              <p className="text-muted-foreground">
                <strong>{forgotEmail}</strong> adresine şifre sıfırlama linki gönderildi.
                Gelen kutunuzu (ve isterseniz Spam klasörünü) kontrol edin.
              </p>
              <Button onClick={() => { setForgotStage(null); onClose(); }} className="w-full h-12 rounded-xl font-bold">
                Tamam
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 rounded-2xl bg-muted/50 p-1">
            <TabsTrigger value="login" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Giriş Yap</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Kayıt Ol</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="space-y-6 mt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">E-posta</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  className="rounded-2xl h-12 bg-muted/50 !border-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all px-4"
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password" className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Şifre</Label>
                  <button
                    type="button"
                    onClick={() => setForgotStage('form')}
                    className="text-xs font-semibold text-primary hover:underline ml-auto"
                  >
                    Şifremi Unuttum
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Şifrenizi girin"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="rounded-2xl h-12 bg-muted/50 !border-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all px-4 pr-12"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="rounded-xl border-none bg-destructive/10 text-destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                Giriş Yap
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><Separator /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-4 text-muted-foreground font-medium">veya şununla devam et</span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              className="w-full h-12 rounded-xl border-2 transition-all hover:bg-muted/50 hover:scale-[1.02]"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27.81-.57z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335" />
              </svg>
              Google ile Giriş Yap
            </Button>
          </TabsContent>

          <TabsContent value="signup" className="space-y-6 mt-6">
            {!otpStage ? (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">E-posta</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="ornek@email.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    className="rounded-2xl h-12 bg-muted/50 !border-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all px-4"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-username" className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Kullanıcı Adı</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="kullaniciadi (3-20 karakter)"
                    value={signupForm.username}
                    onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    className="rounded-2xl h-12 bg-muted/50 !border-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all px-4"
                    minLength={3}
                    maxLength={20}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Şifre</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={`En az ${PASSWORD_MIN} karakter`}
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      className="rounded-2xl h-12 bg-muted/50 !border-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all px-4 pr-12"
                      required
                      disabled={loading}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} disabled={loading} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password" className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Şifre Tekrar</Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Şifrenizi tekrar girin"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                      className="rounded-2xl h-12 bg-muted/50 !border-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all px-4 pr-12"
                      required
                      disabled={loading}
                    />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={loading} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="rounded-xl border-none bg-destructive/10 text-destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]" disabled={loading || otpLoading}>
                  {loading || otpLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mail className="mr-2 h-5 w-5" />}
                  Doğrulama Kodu Gönder
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndSignup} className="space-y-6">
                <div className="space-y-4 text-center">
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-bold text-lg">E-postanızı Doğrulayın</h3>
                  <p className="text-sm text-muted-foreground">
                    <strong>{pendingSignup?.email}</strong> adresine gönderilen 6 haneli kodu girin.
                  </p>
                  <div className="flex justify-center py-4">
                    <InputOTP
                      maxLength={6}
                      value={otpInput}
                      onChange={(val) => setOtpInput(String(val).replace(/\D/g, ''))}
                      disabled={otpLoading}
                      autoFocus
                    >
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} className="rounded-xl border-2 w-10 h-12" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                {otpError && (
                  <Alert variant="destructive" className="rounded-xl border-none bg-destructive/10 text-destructive">
                    <AlertDescription>{otpError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <Button type="submit" className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]" disabled={otpLoading || otpInput.length !== 6}>
                    {otpLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                    Hesabımı Oluştur
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1 h-12 rounded-xl"
                      onClick={() => {
                        setOtpStage(false);
                        setPendingSignup(null);
                        setOtpError('');
                      }}
                      disabled={otpLoading}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" /> Geri
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 h-12 rounded-xl"
                      onClick={handleResendOtp}
                      disabled={otpLoading || otpResendCooldown > 0}
                    >
                      {otpLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : otpResendCooldown > 0 ? (
                        `Tekrar Gönder (${otpResendCooldown}s)`
                      ) : (
                        'Tekrar Gönder'
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
