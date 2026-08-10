'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, ArrowLeft, Play, Star, Clock, Globe, Share2, Info } from 'lucide-react';
import { TMDBMovieDetail, fetchMovieById, getYouTubeTrailerUrl, getBackdropUrl } from '@/lib/tmdb';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { LoginForm } from '@/components/LoginForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false }) as any;

export default function WatchMoviePage() {
  const params = useParams();
  const router = useRouter();
  const movieId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params?.id[0] : '';
  const { user, userData } = useAuth();
  const [movie, setMovie] = useState<TMDBMovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const loadMovie = async () => {
      if (!movieId) return;
      try {
        const data = await fetchMovieById(parseInt(movieId));
        setMovie(data);
      } catch (err) {
        setError('Film yüklenirken bir hata oluştu.');
      } finally {
        setLoading(false);
      }
    };
    loadMovie();
  }, [movieId]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );

  if (error || !movie) return (
    <div className="flex flex-col h-screen items-center justify-center space-y-4">
      <p className="text-xl font-bold text-destructive">{error || 'Film bulunamadı'}</p>
      <Button onClick={() => router.back()}>Geri Dön</Button>
    </div>
  );

  const videoUrl = `https://www.youtube.com/watch?v=${movie.videos?.results?.find(v => v.type === 'Trailer')?.key || movie.videos?.results?.[0]?.key}`;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between pointer-events-none">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.back()}
          className="rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20 pointer-events-auto"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Geri Dön
        </Button>
        <div className="flex gap-2 pointer-events-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success('Link kopyalandı!');
            }}
            className="rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/20"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Paylaş
          </Button>
        </div>
      </div>

      {/* Video Player */}
      <div className="h-screen w-full flex items-center justify-center">
        {user ? (
          <ReactPlayer
            url={videoUrl}
            width="100%"
            height="100%"
            controls
            playing
          />
        ) : (
          <div className="text-center space-y-6 max-w-md px-6">
            <div className="h-24 w-24 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto">
              <Play className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">İzlemek için Giriş Yapın</h2>
              <p className="text-muted-foreground">Bu içeriği izleyebilmek için CineMax hesabınıza giriş yapmanız gerekmektedir.</p>
            </div>
            <Button size="lg" className="rounded-full px-8" onClick={() => setShowLogin(true)}>
              Giriş Yap
            </Button>
          </div>
        )}
      </div>

      {/* Login Dialog */}
      <Dialog open={showLogin} onOpenChange={setShowLogin}>
        <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-3xl overflow-hidden border-none p-0">
          <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8">
            <DialogHeader className="mb-4">
              <DialogTitle className="text-2xl font-bold text-center">Hoş Geldiniz</DialogTitle>
            </DialogHeader>
            <LoginForm onClose={() => setShowLogin(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}