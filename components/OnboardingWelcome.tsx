'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Search,
  Heart,
  Bookmark,
  User,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Star,
  Film,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ONBOARDING_KEY = 'kino_onboarding_completed';

const steps = [
  {
    title: 'Hoş Geldin! 🎬',
    description: 'KINO\'ya kaydolduğun için teşekkürler. Sana 4 adımda platformu nasıl kullanacağını göstereceğim.',
    icon: Sparkles,
    iconBg: 'bg-primary/20 text-primary',
    tip: 'Hazırsan sağ oka tıkla ve başlayalım!',
  },
  {
    title: '1. Dizi ve Film Ara 🔍',
    description: 'Üstteki arama çubuğunu kullanarak istediğin filmi veya diziyi anında bulabilirsin. Marvel, Nolan, Disney gibi popüler aramaları da denemeyi unutma!',
    icon: Search,
    iconBg: 'bg-blue-500/20 text-blue-500',
    tip: '💡 İpucu: Yazmaya başladığında ilk 5 sonuç direkt olarak görünecek.',
  },
  {
    title: '2. Favorilere Ekle ❤️',
    description: 'Sevdiğin içeriklerin yanındaki kalp ikonuna tıklayarak onları favorilerine ekleyebilirsin. Favorilerine dilediğin zaman /favorites sayfasından erişebilirsin.',
    icon: Heart,
    iconBg: 'bg-red-500/20 text-red-500',
    tip: '❤️ Kalp = Favori, 🔖 Yer imi = İzlenecekler, 👁️ Göz = İzlendi',
  },
  {
    title: '3. İzleme Listeni Yönet 📋',
    description: 'Sonra izlemek için kaydettiğin her şey /watchlist sayfanda listelenir. İzlediğinde işaretleyebilir, puan verebilirsin.',
    icon: Bookmark,
    iconBg: 'bg-emerald-500/20 text-emerald-500',
    tip: '🎯 Bugün izlemeye ne başlayacağına karar vermekten sıkıldıysan anasayfadaki "Rastgele Film" butonunu dene!',
  },
  {
    title: '4. Profilini Özelleştir ✨',
    description: 'Sağ üstteki profil menüsünden /profile sayfasına gir, kullanıcı adı ve görünür ismini dilediğin gibi değiştir. İstatistiklerin de burada görünecek.',
    icon: User,
    iconBg: 'bg-violet-500/20 text-violet-500',
    tip: 'Yorum yaparak topluluğa katılmayı unutma! 💬',
  },
];

export function OnboardingWelcome() {
  const { user, userData, loading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user || !userData) return;

    const approved = userData.role === 'approved' || userData.role === 'admin';
    if (!approved) return;

    try {
      const stored = localStorage.getItem(ONBOARDING_KEY);
      if (!stored) {
        setVisible(true);
      }
    } catch (e) {
      console.warn('localStorage erişilemedi (SSR olabilir):', e);
    }
  }, [loading, user, userData]);

  if (!visible) return null;

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const handleClose = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
    } catch (e) {
      // ignore
    }
    setVisible(false);
  };

  const handleNext = () => {
    if (isLast) {
      handleClose();
    } else {
      setCurrentStep((s) => s + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStep((s) => s - 1);
    }
  };

  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <Card className="w-full max-w-xl rounded-[2rem] border-none shadow-2xl shadow-primary/20 animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 bg-background/95">
        <CardHeader className="text-center space-y-1 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="h-5 w-5 text-primary" />
              <span className="text-sm font-bold tracking-wider uppercase text-muted-foreground">
                Adım {currentStep + 1} / {steps.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive transition-all"
              aria-label="Kapat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-primary to-blue-500 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-4 pb-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div
              className={cn(
                'h-20 w-20 rounded-3xl flex items-center justify-center shadow-lg transition-all',
                step.iconBg
              )}
            >
              <Icon className="h-10 w-10" />
            </div>

            <CardTitle className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {step.title}
            </CardTitle>
            <CardDescription className="text-base leading-relaxed max-w-md">
              {step.description}
            </CardDescription>
          </div>

          <div className="bg-muted/50 border border-muted rounded-2xl p-4 space-y-1">
            <div className="flex items-start gap-2">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 mt-0.5 shrink-0" />
              <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                {step.tip}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 gap-3">
            <Button
              variant="ghost"
              onClick={handlePrev}
              disabled={isFirst}
              className="rounded-2xl h-12 px-6 font-semibold"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              Geri
            </Button>

            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <button
                  key={i}
                  aria-label={`${i + 1}. adıma git`}
                  onClick={() => setCurrentStep(i)}
                  className={cn(
                    'h-2.5 rounded-full transition-all',
                    i === currentStep
                      ? 'w-8 bg-primary'
                      : i < currentStep
                      ? 'w-2.5 bg-primary/50'
                      : 'w-2.5 bg-muted hover:bg-muted-foreground/20'
                  )}
                />
              ))}
            </div>

            <Button
              onClick={handleNext}
              className="rounded-2xl h-12 px-6 font-semibold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.99] transition-all"
            >
              {isLast ? (
                <>
                  Hadi Başlayalım!
                  <Sparkles className="h-5 w-5 ml-1" />
                </>
              ) : (
                <>
                  Sonraki
                  <ChevronRight className="h-5 w-5 ml-1" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
