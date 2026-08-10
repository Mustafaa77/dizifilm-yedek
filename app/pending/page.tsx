'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, Mail, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function PendingPage() {
  const { user, userData, logout, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user && userData && (userData.role === 'approved' || userData.role === 'admin')) {
      toast.success('Hesabınız onaylandı! Hoş geldiniz 🎉');
      router.push('/');
    }
  }, [user, userData, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Stabil içerik: otomatik yönlendirme yok, duruma göre mesaj ve düğmeler
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        {!user && (
          <div>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Giriş Gerekli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertDescription>
                  Bu sayfayı görmek için giriş yapmanız gerekiyor.
                </AlertDescription>
              </Alert>
              <div className="flex flex-col gap-2">
                <Button onClick={() => router.push('/')} className="w-full">
                  Ana Sayfaya Dön
                </Button>
              </div>
            </CardContent>
          </div>
        )}

        {user && userData?.role === 'approved' && (
          <div>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Hesabınız Onaylı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertDescription>
                  Hesabınız zaten onaylı. Ana sayfaya gidebilirsiniz.
                </AlertDescription>
              </Alert>
              <div className="flex flex-col gap-2">
                <Button onClick={() => router.push('/')} className="w-full">
                  Ana Sayfaya Dön
                </Button>
              </div>
            </CardContent>
          </div>
        )}

        {/* Admin kullanıcı için yönlendirme/mesaj gösterme kaldırıldı */}

        {user && userData?.role === 'pending' && (
          <div>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <CardTitle className="text-2xl">Hesap Onayı Bekleniyor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Hesabınız admin onayı bekliyor. Onaylandıktan sonra tüm özelliklere erişebileceksiniz.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-semibold mb-2">Hesap Bilgileriniz</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{user?.email}</span>
                    </div>
                    <div>
                      <span className="font-medium">Kullanıcı Adı:</span> @{userData.username}
                    </div>
                    <div>
                      <span className="font-medium">Durum:</span> Onay Bekliyor
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Onay süreci hakkında:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Admin ekibimiz hesabınızı en kısa sürede inceleyecek</li>
                    <li>• Onay süreci genellikle 24 saat içinde tamamlanır</li>
                    <li>• Onaylandığınızda e-posta ile bilgilendirileceksiniz</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button onClick={handleLogout} variant="outline" className="w-full">
                  Çıkış Yap
                </Button>
                <Button onClick={() => window.location.reload()} className="w-full">
                  Durumu Yenile
                </Button>
              </div>
            </CardContent>
          </div>
        )}
      </Card>
    </div>
  );
}