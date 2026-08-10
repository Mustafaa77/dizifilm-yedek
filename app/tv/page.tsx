'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MovieDetailSkeleton } from '@/components/SkeletonLoader';
import { Heart, Eye, Star, Calendar, Clock, User, MessageSquare, Send, Play, Share2, Bookmark, ExternalLink, ArrowLeft, Globe, Award, Users, Tv, RefreshCw, Trash2, Film } from 'lucide-react';
import { TMDBTVDetail, TMDBVideo, fetchTVById, fetchTVVideos, getYouTubeTrailerUrl, getPosterUrl, getBackdropUrl } from '@/lib/tmdb';
import { useAuth } from '@/contexts/AuthContext';
import { toggleFavorite, toggleWatched, toggleWatchLater, addReview, getReviews, deleteReview, Review, formatDate } from '@/lib/firestore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import EpisodeSelector from '@/components/EpisodeSelector';
import { Checkbox } from '@/components/ui/checkbox';

function TVShowDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, userData, refreshUserData } = useAuth();
  const [tvShow, setTVShow] = useState<TMDBTVDetail | null>(null);
  const [videos, setVideos] = useState<TMDBVideo[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTrailer, setShowTrailer] = useState(false);
  
  const [newReview, setNewReview] = useState({
    rating: '',
    comment: '',
    spoiler: false,
  });
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const tvId = searchParams.get('id') || '';
  const isFavorite = userData?.favoriteItems?.includes(tvId) || false;
  const isWatched = userData?.watchedItems?.includes(tvId) || false;
  const isWatchLater = userData?.watchLaterItems?.includes(tvId) || false;

  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const reviewsData = await getReviews(tvId);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Yorumlar yüklenirken hata:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    const loadTVDetails = async () => {
      if (!tvId) {
        setError('Dizi ID bulunamadı');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError('');
      
      try {
        const [tvData, videosData] = await Promise.all([
          fetchTVById(parseInt(tvId)),
          fetchTVVideos(parseInt(tvId))
        ]);
        
        if (tvData) {
          setTVShow(tvData);
          setVideos(videosData);
          await loadReviews();
        } else {
          setError('Dizi detayları bulunamadı');
        }
      } catch (error) {
        console.error('Dizi detayları yüklenirken hata:', error);
        setError('Dizi detayları yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadTVDetails();
  }, [tvId]);

  const handleFavorite = async () => {
    if (!user) {
      toast.error('Favorilere eklemek için giriş yapın');
      return;
    }
    
    setActionLoading(true);
    try {
      await toggleFavorite(user.uid, tvId);
      await refreshUserData();
      toast.success(isFavorite ? 'Favorilerden çıkarıldı' : 'Favorilere eklendi');
    } catch (error) {
      console.error('Favori güncellenirken hata:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWatched = async () => {
    if (!user) {
      toast.error('İzleme listesine eklemek için giriş yapın');
      return;
    }
    
    setActionLoading(true);
    try {
      await toggleWatched(user.uid, tvId);
      await refreshUserData();
      toast.success(isWatched ? 'İzleme listesinden çıkarıldı' : 'İzleme listesine eklendi');
    } catch (error) {
      console.error('İzleme listesi güncellenirken hata:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWatchLater = async () => {
    if (!user) {
      toast.error('İzlenecek listesine eklemek için giriş yapın');
      return;
    }
    
    setActionLoading(true);
    try {
      await toggleWatchLater(user.uid, tvId);
      await refreshUserData();
      toast.success(isWatchLater ? 'İzlenecek listesinden çıkarıldı' : 'İzlenecek listesine eklendi');
    } catch (error) {
      console.error('İzlenecek listesi güncellenirken hata:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error('Yorum yapmak için giriş yapın');
      return;
    }
    
    if (!newReview.rating || !newReview.comment.trim()) {
      toast.error('Lütfen puan ve yorum alanlarını doldurun');
      return;
    }
    
    setReviewLoading(true);
    
    try {
      await addReview({
        imdbId: tvId,
        userId: user.uid,
        userName: user.displayName || user.email || 'Anonim',
        rating: parseInt(newReview.rating),
        comment: newReview.comment.trim(),
        spoiler: !!newReview.spoiler,
        movieTitle: tvShow?.name || '',
      });
      
      await loadReviews();
      setNewReview({ rating: '', comment: '', spoiler: false });
      toast.success('Yorumunuz başarıyla eklendi');
    } catch (error) {
      console.error('Yorum gönderilirken hata:', error);
      toast.error('Yorum gönderilirken hata oluştu');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!user) return;
    
    try {
      await deleteReview(reviewId);
      await loadReviews();
      toast.success('Yorum silindi');
    } catch (error) {
      console.error('Yorum silinirken hata:', error);
      toast.error('Yorum silinirken hata oluştu');
    }
  };

  const handleShare = async () => {
    if (navigator.share && tvShow) {
      try {
        await navigator.share({
          title: tvShow.name,
          text: `${tvShow.name} - ${tvShow.overview}`,
          url: window.location.href,
        });
      } catch (error) {
        // Kullanıcı paylaşımı iptal etti
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link kopyalandı');
      } catch (error) {
        toast.error('Link kopyalanamadı');
      }
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleWatchTrailer = () => {
    setShowTrailer(true);
  };

  if (loading) {
    return <MovieDetailSkeleton />;
  }

  if (error || !tvShow) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="outline" 
          onClick={handleGoBack}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Geri Dön
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error || 'Dizi bulunamadı'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  const posterUrl = getPosterUrl(tvShow.poster_path);
  const backdropUrl = getBackdropUrl(tvShow.backdrop_path);
  const trailerUrl = getYouTubeTrailerUrl(videos);
  const releaseYear = tvShow.first_air_date ? new Date(tvShow.first_air_date).getFullYear() : '';
  const episodeRuntime = tvShow.episode_run_time && tvShow.episode_run_time.length > 0 
    ? `${tvShow.episode_run_time[0]} dakika/bölüm` 
    : '';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Geri Dön Butonu */}
      <Button 
        variant="outline" 
        onClick={handleGoBack}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Geri Dön
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Poster */}
        <div className="lg:col-span-1">
          <Card className="overflow-hidden sticky top-8">
            <div className="relative aspect-[2/3] group">
              <Image
                src={posterUrl}
                alt={tvShow.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
                priority
              />
            </div>
            
            {/* Quick Actions */}
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => router.push(`/tv/watch?id=${tvId}`)}
                  className="w-full h-10 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Play className="h-4 w-4 mr-2" />
                  İzle
                </Button>
                <Button
                  variant={isFavorite ? "default" : "outline"}
                  onClick={handleFavorite}
                  disabled={actionLoading}
                  className="w-full h-10"
                >
                  <Heart className={cn("h-4 w-4 mr-2", isFavorite && "fill-current")} />
                  {isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                </Button>
                
                <Button
                  variant={isWatched ? "default" : "outline"}
                  onClick={handleWatched}
                  disabled={actionLoading}
                  className="w-full h-10"
                >
                  <Eye className={cn("h-4 w-4 mr-2", isWatched && "fill-current")} />
                  {isWatched ? 'İzlendi' : 'İzledim'}
                </Button>

                <Button
                  variant={isWatchLater ? "default" : "outline"}
                  onClick={handleWatchLater}
                  disabled={actionLoading}
                  className="w-full h-10"
                >
                  <Bookmark className={cn("h-4 w-4 mr-2", isWatchLater && "fill-current")} />
                  {isWatchLater ? 'İzlenecek Listesinden Çıkar' : 'İzlenecek Listesine Ekle'}
                </Button>

                {trailerUrl && (
                  <Button
                    variant="secondary"
                    onClick={handleWatchTrailer}
                    className="w-full h-10 bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Fragmanı İzle
                  </Button>
                )}

                <Button
                  variant="secondary"
                  onClick={() => router.push(`/watch-party?id=${tvId}`)}
                  className="w-full h-10 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Watch Party
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="w-full h-8" onClick={handleShare}>
                  <Share2 className="h-3 w-3 mr-1" />
                  <span className="text-xs">Paylaş</span>
                </Button>
                <Button variant="outline" size="sm" className="w-full h-8" asChild>
                  <a 
                    href={`https://www.themoviedb.org/tv/${tvShow.id}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    <span className="text-xs">TMDB</span>
                  </a>
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* İçerik */}
        <div className="lg:col-span-2 space-y-6">
          {/* Başlık ve Temel Bilgiler */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-2xl lg:text-4xl font-bold leading-tight">{tvShow.name}</h1>
            </div>
            
            <div className="mb-4">
              <EpisodeSelector 
                tvId={parseInt(tvId)} 
                seasons={tvShow.seasons || []} 
                onEpisodeSelect={(seasonNum, episodeNum) => {
                  const { buildTVWatchUrl } = require('@/lib/utils');
                  const watchUrl = buildTVWatchUrl(tvId, seasonNum, episodeNum);
                  // Convert watch URL if necessary, but buildTVWatchUrl should handle it
                  router.push(watchUrl.replace('/tv/', '/tv/watch?id=').replace('/watch', '')); 
                  // Wait, let's fix buildTVWatchUrl later. For now, manual:
                  router.push(`/tv/watch?id=${tvId}&season=${seasonNum}&episode=${episodeNum}`);
                }}
              />
            </div>

            {/* İzle Butonu ve Watch Party */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <Button 
                size="lg" 
                className="h-16 rounded-2xl text-xl font-bold bg-gradient-to-r from-primary to-blue-600 shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all"
                onClick={() => router.push(`/tv/watch?id=${tvId}`)}
              >
                <Play className="h-6 w-6 mr-3 fill-current" />
                Hemen İzle
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="h-16 rounded-2xl text-xl font-bold border-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all group"
                onClick={() => {
                  const roomId = Math.random().toString(36).substring(2, 9);
                  router.push(`/watch-party?roomId=${roomId}&tvId=${tvId}`);
                }}
              >
                <Users className="h-6 w-6 mr-3 transition-transform group-hover:scale-110" />
                Birlikte İzle
              </Button>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <Badge variant="secondary" className="text-sm flex items-center gap-1">
                <Tv className="h-3 w-3" />
                Dizi
              </Badge>
              
              {releaseYear && (
                <div className="flex items-center space-x-1 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{releaseYear}</span>
                </div>
              )}
              
              {episodeRuntime && (
                <div className="flex items-center space-x-1 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{episodeRuntime}</span>
                </div>
              )}
              
              {tvShow.vote_average > 0 && (
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="font-semibold">{tvShow.vote_average.toFixed(1)}</span>
                  <span className="text-muted-foreground">TMDB</span>
                </div>
              )}
              
              {averageRating > 0 && (
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-blue-500 fill-current" />
                  <span className="font-semibold">{averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">Kullanıcı</span>
                </div>
              )}
            </div>

            {/* Türler */}
            {tvShow.genres && tvShow.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {tvShow.genres.map((genre) => (
                  <Badge key={genre.id} variant="outline" className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                    {genre.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Slogan */}
            {tvShow.tagline && (
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                <p className="text-lg italic text-center">{tvShow.tagline}</p>
              </div>
            )}
          </div>

          {/* Özet */}
          {tvShow.overview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Özet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed text-lg">{tvShow.overview}</p>
              </CardContent>
            </Card>
          )}

          {/* Dizi Bilgileri */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Yapım Bilgileri */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Yapım Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tvShow.created_by && tvShow.created_by.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-1 flex items-center gap-2">
                      👨‍💼 Yaratıcılar
                    </h4>
                    <p className="text-muted-foreground">
                      {tvShow.created_by.map(creator => creator.name).join(', ')}
                    </p>
                  </div>
                )}

                {tvShow.networks && tvShow.networks.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-1 flex items-center gap-2">
                      📺 Yayın Kanalları
                    </h4>
                    <p className="text-muted-foreground">
                      {tvShow.networks.map(network => network.name).join(', ')}
                    </p>
                  </div>
                )}
                
                {tvShow.production_companies && tvShow.production_companies.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-1 flex items-center gap-2">
                      🏭 Yapım Şirketleri
                    </h4>
                    <p className="text-muted-foreground">
                      {tvShow.production_companies.map(company => company.name).join(', ')}
                    </p>
                  </div>
                )}
                
                {tvShow.production_countries && tvShow.production_countries.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-1 flex items-center gap-2">
                      🌍 Yapım Ülkeleri
                    </h4>
                    <p className="text-muted-foreground">
                      {tvShow.production_countries.map(country => country.name).join(', ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Teknik Bilgiler */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Dizi Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tvShow.first_air_date && (
                  <div>
                    <h4 className="font-semibold mb-1 flex items-center gap-2">
                      📅 İlk Yayın Tarihi
                    </h4>
                    <p className="text-muted-foreground">
                      {new Date(tvShow.first_air_date).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-semibold mb-1 flex items-center gap-2">
                    📊 Sezon Sayısı
                  </h4>
                  <p className="text-muted-foreground">{tvShow.number_of_seasons}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-1 flex items-center gap-2">
                    🎬 Bölüm Sayısı
                  </h4>
                  <p className="text-muted-foreground">{tvShow.number_of_episodes}</p>
                </div>
                
                {tvShow.status && (
                  <div>
                    <h4 className="font-semibold mb-1 flex items-center gap-2">
                      📊 Durum
                    </h4>
                    <p className="text-muted-foreground">{tvShow.status}</p>
                  </div>
                )}

                {tvShow.spoken_languages && tvShow.spoken_languages.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-1 flex items-center gap-2">
                      🗣️ Diller
                    </h4>
                    <p className="text-muted-foreground">
                      {tvShow.spoken_languages.map(lang => lang.name).join(', ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Puanlama Sistemi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Puanlar ve Değerlendirmeler
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tvShow.vote_average > 0 && (
                  <div className="text-center p-6 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                    <div className="text-3xl font-bold text-yellow-600 mb-2">{tvShow.vote_average.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground mb-1">TMDB Puanı</div>
                    <div className="text-xs text-muted-foreground">10 üzerinden ({tvShow.vote_count.toLocaleString()} oy)</div>
                  </div>
                )}
                
                {averageRating > 0 && (
                  <div className="text-center p-6 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <div className="text-3xl font-bold text-blue-600 mb-2">{averageRating.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground mb-1">Kullanıcı Puanı</div>
                    <div className="text-xs text-muted-foreground">{reviews.length} değerlendirme</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showTrailer} onOpenChange={setShowTrailer}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black border-none rounded-[2.5rem] w-[95vw] md:w-full">
          <DialogHeader className="sr-only">
            <DialogTitle>{tvShow?.name} Fragman</DialogTitle>
          </DialogHeader>
          <div className="relative w-full pt-[56.25%] bg-black">
            {trailerUrl ? (
              <iframe
                src={`${trailerUrl.replace('autoplay=0', 'autoplay=1')}`}
                title={`${tvShow?.name} Fragman`}
                className="absolute inset-0 w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-4">
                <Film className="h-16 w-16 opacity-20" />
                <p className="text-xl font-bold opacity-50">Fragman bulunamadı</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Yorumlar Bölümü */}
      <div className="mt-12 space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Kullanıcı Yorumları</span>
                {reviews.length > 0 && (
                  <div className="flex items-center space-x-2 ml-4">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="font-semibold">{averageRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({reviews.length} yorum)</span>
                  </div>
                )}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={loadReviews}
                disabled={reviewsLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", reviewsLoading && "animate-spin")} />
                Yenile
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Yorum Ekleme */}
            {user && (
              <div className="space-y-4">
                <h3 className="font-semibold">Yorumunuzu Ekleyin</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rating">Puan</Label>
                    <Select value={newReview.rating} onValueChange={(value) => setNewReview({ ...newReview, rating: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Puan verin" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <SelectItem key={rating} value={rating.toString()}>
                            {rating} ★
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <Label htmlFor="comment">Yorumunuz</Label>
                    <Textarea
                      id="comment"
                      placeholder="Bu dizi hakkında ne düşünüyorsunuz?"
                      value={newReview.comment}
                      onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="review-spoiler" checked={newReview.spoiler} onCheckedChange={(v) => setNewReview({ ...newReview, spoiler: !!v })} />
                  <Label htmlFor="review-spoiler">Spoiler içeriyor</Label>
                </div>
                <Button 
                  onClick={handleSubmitReview}
                  disabled={reviewLoading || !newReview.rating || !newReview.comment.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {reviewLoading ? 'Gönderiliyor...' : 'Yorumu Gönder'}
                </Button>
              </div>
            )}

            <Separator />

            {/* Yorumlar Listesi */}
            <div className="space-y-4">
              {reviewsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                      <div className="h-20 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : reviews.length > 0 ? (
                reviews.map((review) => (
                  <Card key={review.id} className="bg-muted/50 hover:bg-muted/70 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{review.userName}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            {Array.from({ length: review.rating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 text-yellow-500 fill-current" />
                            ))}
                            {Array.from({ length: 5 - review.rating }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 text-muted-foreground" />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(review.createdAt)}
                          </span>
                          {user && user.uid === review.userId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReview(review.id!)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div
                        className="relative rounded-md"
                        onClick={() => {
                          if (review.spoiler && !revealed[review.id!]) {
                            setRevealed((r) => ({ ...r, [review.id!]: true }));
                          }
                        }}
                      >
                        {review.spoiler && !revealed[review.id! ] && (
                          <div
                            className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm font-medium rounded-md cursor-pointer"
                            onClick={() => setRevealed((r) => ({ ...r, [review.id!]: true }))}
                          >
                            Spoiler! Görmek için tıkla
                          </div>
                        )}
                        <div className={`${review.spoiler && !revealed[review.id! ] ? 'blur-md select-none' : ''}`}>
                          <p className="text-muted-foreground leading-relaxed">{review.comment}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Henüz yorum yok</h3>
                  <p className="text-muted-foreground">
                    {user ? 'İlk yorumu siz yapın!' : 'Yorum yapmak için giriş yapın'}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TVShowDetailPage() {
  return (
    <Suspense fallback={<MovieDetailSkeleton />}>
      <TVShowDetailContent />
    </Suspense>
  );
}
