'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MovieDetailSkeleton } from '@/components/SkeletonLoader';
import { MovieCard } from '@/components/MovieCard';
import { Heart, Eye, Star, Calendar, Clock, User, MessageSquare, Send, Play, Share2, Bookmark, ExternalLink, ArrowLeft, Globe, Award, Users, Film, X, Trash2, RefreshCw, ChevronRight } from 'lucide-react';
import { TMDBMovieDetail, TMDBVideo, TMDBCredits, TMDBCastMember, TMDBSearchResult, fetchMovieById, fetchMovieVideos, fetchCredits, fetchSimilarMovies, getYouTubeTrailerUrl, getPosterUrl, getBackdropUrl } from '@/lib/tmdb';
import { useAuth } from '@/contexts/AuthContext';
import { toggleFavorite, toggleWatched, toggleWatchLater, addReview, getReviews, deleteReview, Review, formatDate } from '@/lib/firestore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, userData, refreshUserData } = useAuth();
  
  const movieId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params?.id[0] : '';
  const [movie, setMovie] = useState<TMDBMovieDetail | null>(null);
  const [videos, setVideos] = useState<TMDBVideo[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [credits, setCredits] = useState<TMDBCredits | null>(null);
  const [similar, setSimilar] = useState<TMDBSearchResult | null>(null);
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

  const isFavorite = userData?.favoriteItems?.includes(movieId) || false;
  const isWatched = userData?.watchedItems?.includes(movieId) || false;
  const isWatchLater = userData?.watchLaterItems?.includes(movieId) || false;

  const loadReviews = async () => {
    setReviewsLoading(true);
    try {
      const reviewsData = await getReviews(movieId);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Yorumlar yüklenirken hata:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    const loadMovieDetails = async () => {
      if (!movieId) {
        setError('Film ID bulunamadı');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError('');
      
      try {
        const [movieData, videosData, creditsData, similarData] = await Promise.all([
          fetchMovieById(parseInt(movieId)),
          fetchMovieVideos(parseInt(movieId)),
          fetchCredits(parseInt(movieId), 'movie'),
          fetchSimilarMovies(parseInt(movieId)),
        ]);
        
        if (movieData) {
          setMovie(movieData);
          setVideos(videosData);
          setCredits(creditsData);
          setSimilar(similarData);
          await loadReviews();
        } else {
          setError('Film detayları bulunamadı');
        }
      } catch (error) {
        console.error('Film detayları yüklenirken hata:', error);
        setError('Film detayları yüklenirken hata oluştu');
      } finally {
        setLoading(false);
      }
    };

    loadMovieDetails();
  }, [movieId]);

  const handleFavorite = async () => {
    if (!user) {
      toast.error('Favorilere eklemek için giriş yapın');
      return;
    }
    
    setActionLoading(true);
    try {
      await toggleFavorite(user.uid, movieId);
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
      await toggleWatched(user.uid, movieId);
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
      await toggleWatchLater(user.uid, movieId);
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
        imdbId: movieId,
        userId: user.uid,
        userName: user.displayName || user.email || 'Anonim',
        rating: parseInt(newReview.rating),
        comment: newReview.comment.trim(),
        spoiler: !!newReview.spoiler,
        movieTitle: movie?.title || '',
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
    if (navigator.share && movie) {
      try {
        await navigator.share({
          title: movie.title,
          text: `${movie.title} - ${movie.overview}`,
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

  if (error || !movie) {
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
          <AlertDescription>{error || 'Film bulunamadı'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  const posterUrl = getPosterUrl(movie.poster_path);
  const backdropUrl = getBackdropUrl(movie.backdrop_path);
  const trailerUrl = getYouTubeTrailerUrl(videos);
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
  const runtime = movie.runtime ? `${movie.runtime} dakika` : '';

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Backdrop Section */}
      <div className="relative h-[60vh] w-full overflow-hidden">
        <Image
          src={getBackdropUrl(movie.backdrop_path)}
          alt={movie.title}
          fill
          className="object-cover transition-transform duration-1000 scale-105"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent hidden lg:block" />
        
        {/* Back Button */}
        <div className="container relative z-10 h-full flex flex-col justify-end pb-12 px-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleGoBack}
            className="absolute top-8 left-4 rounded-full bg-background/20 backdrop-blur-md hover:bg-background/40 transition-all"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Geri Dön
          </Button>
          
          <div className="max-w-4xl space-y-6 animate-reveal fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="bg-primary/20 text-primary border-none rounded-full px-4 py-1 backdrop-blur-md">
                {movie.genres?.[0]?.name || 'Film'}
              </Badge>
              {movie.vote_average > 0 && (
                <Badge variant="outline" className="bg-black/20 text-yellow-500 border-yellow-500/20 rounded-full px-4 py-1 backdrop-blur-md">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  {movie.vote_average.toFixed(1)} TMDB
                </Badge>
              )}
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-gradient leading-tight">
              {movie.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-6 text-sm md:text-base font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {new Date(movie.release_date).getFullYear()}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                {movie.runtime} dk
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                {movie.spoken_languages?.[0]?.name || 'Türkçe'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Poster & Actions */}
          <div className="lg:col-span-4 space-y-8">
            <div className="relative group">
              <div className="absolute -inset-4 bg-primary/20 rounded-[3rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Card className="relative overflow-hidden rounded-[2.5rem] border-none shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
                <Image
                  src={getPosterUrl(movie.poster_path)}
                  alt={movie.title}
                  width={500}
                  height={750}
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <Button 
                    size="lg" 
                    className="rounded-full h-16 w-16 p-0 bg-primary hover:scale-110 transition-transform shadow-xl shadow-primary/40"
                    onClick={handleWatchTrailer}
                  >
                    <Play className="h-8 w-8 fill-current" />
                  </Button>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                size="lg" 
                variant={isFavorite ? "default" : "outline"}
                className={cn(
                  "rounded-2xl h-14 transition-all duration-300",
                  isFavorite ? "bg-red-500 hover:bg-red-600 border-none shadow-lg shadow-red-500/20" : "hover:bg-red-500/10 hover:border-red-500/20"
                )}
                onClick={handleFavorite}
                disabled={actionLoading}
              >
                <Heart className={cn("h-5 w-5 mr-2", isFavorite && "fill-current")} />
                {isFavorite ? 'Favoride' : 'Favoriye Ekle'}
              </Button>
              <Button 
                size="lg" 
                variant={isWatched ? "default" : "outline"}
                className={cn(
                  "rounded-2xl h-14 transition-all duration-300",
                  isWatched ? "bg-green-500 hover:bg-green-600 border-none shadow-lg shadow-green-500/20" : "hover:bg-green-500/10 hover:border-green-500/20"
                )}
                onClick={handleWatched}
                disabled={actionLoading}
              >
                <Eye className={cn("h-5 w-5 mr-2", isWatched && "fill-current")} />
                {isWatched ? 'İzlendi' : 'İzledim'}
              </Button>
              <Button 
                size="lg" 
                variant={isWatchLater ? "default" : "outline"}
                className={cn(
                  "rounded-2xl h-14 col-span-2 transition-all duration-300",
                  isWatchLater ? "bg-blue-600 hover:bg-blue-700 border-none shadow-lg shadow-blue-600/20" : "hover:bg-blue-600/10 hover:border-blue-600/20"
                )}
                onClick={handleWatchLater}
                disabled={actionLoading}
              >
                <Bookmark className={cn("h-5 w-5 mr-2", isWatchLater && "fill-current")} />
                {isWatchLater ? 'Listede' : 'Daha Sonra İzle'}
              </Button>
            </div>
          </div>

          {/* Right Column: Info & Tabs */}
          <div className="lg:col-span-8 space-y-12">
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-1 w-12 bg-primary rounded-full" />
                <h2 className="text-2xl font-bold tracking-tight">Özet</h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {movie.overview}
              </p>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="rounded-3xl bg-muted/30 border-none p-6 space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" /> Yapım Bilgileri
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Orijinal İsim</span>
                    <span className="font-medium">{movie.original_title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Durum</span>
                    <Badge variant="outline" className="rounded-full">{movie.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bütçe</span>
                    <span className="font-medium">${movie.budget?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hasılat</span>
                    <span className="font-medium text-green-500">${movie.revenue?.toLocaleString()}</span>
                  </div>
                </div>
              </Card>

              <Card className="rounded-3xl bg-muted/30 border-none p-6 space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Şirketler
                </h3>
                <div className="flex flex-wrap gap-2">
                  {movie.production_companies?.map((company) => (
                    <Badge key={company.id} variant="secondary" className="bg-background/50 rounded-full px-3 py-1">
                      {company.name}
                    </Badge>
                  ))}
                </div>
              </Card>
            </section>

            {/* Oyuncular Bölümü (Credits - TMDB'den çekildi) */}
            <section className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-1 w-12 bg-primary rounded-full" />
                <h2 className="text-2xl font-bold tracking-tight">Oyuncular</h2>
                <Badge variant="secondary" className="rounded-full">
                  {credits?.cast?.length || 0} kişi
                </Badge>
              </div>
              {credits?.cast?.length ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                  {credits.cast.slice(0, 12).map((person: TMDBCastMember) => (
                    <div
                      key={person.id}
                      className="group flex flex-col items-center text-center space-y-2 p-3 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-md"
                    >
                      <div className="relative h-24 w-24 rounded-full overflow-hidden ring-2 ring-transparent group-hover:ring-primary/30 transition-all bg-muted">
                        {person.profile_path ? (
                          <Image
                            src={getPosterUrl(person.profile_path).replace('w500', 'w185')}
                            alt={person.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <User className="h-10 w-10 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-0.5 min-h-[3.5rem]">
                        <h4 className="text-sm font-bold leading-tight line-clamp-2">{person.name}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">{person.character}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground bg-muted/20 rounded-3xl border border-dashed border-muted">
                  Oyuncu bilgisi bulunamadı.
                </div>
              )}
            </section>

            {/* İzle Butonu ve Watch Party */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <Button 
                size="lg" 
                className="h-16 rounded-2xl text-xl font-bold bg-gradient-to-r from-primary to-blue-600 shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all"
                onClick={() => router.push(`/movie/${movieId}/watch`)}
              >
                <Play className="h-6 w-6 mr-3 fill-current" />
                Hemen İzle
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="hidden h-16 rounded-2xl text-xl font-bold border-2 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all group"
                onClick={() => {
                  const roomId = Math.random().toString(36).substring(2, 9);
                  router.push(`/watch-party/${roomId}?movieId=${movieId}`);
                }}
              >
                <Users className="h-6 w-6 mr-3 transition-transform group-hover:scale-110" />
                Birlikte İzle
              </Button>
            </div>

            {/* Yorumlar Bölümü */}
            <Separator className="bg-muted/50" />
            
            <section className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-1 w-12 bg-primary rounded-full" />
                  <h2 className="text-2xl font-bold tracking-tight">Yorumlar</h2>
                  <Badge variant="secondary" className="rounded-full">{reviews.length}</Badge>
                </div>
                {user && (
                  <Button variant="outline" className="rounded-full" onClick={() => document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth' })}>
                    Yorum Yap
                  </Button>
                )}
              </div>

              {/* Yorum Formu */}
              {user ? (
                <Card id="review-form" className="rounded-3xl bg-muted/30 border-none p-6 space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                      <AvatarImage src={user.photoURL || ''} />
                      <AvatarFallback>{user.displayName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-bold">{user.displayName || 'Kullanıcı'}</h4>
                      <p className="text-xs text-muted-foreground">Fikrinizi paylaşın</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Puanınız</Label>
                      <Select value={newReview.rating} onValueChange={(v) => setNewReview(prev => ({ ...prev, rating: v }))}>
                        <SelectTrigger className="rounded-xl bg-background/50 border-none h-12">
                          <SelectValue placeholder="Puan seçin" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(num => (
                            <SelectItem key={num} value={num.toString()} className="rounded-lg">
                              <div className="flex items-center gap-2">
                                <Star className={cn("h-4 w-4", num >= 7 ? "text-yellow-500" : "text-muted-foreground")} />
                                <span>{num} - {num >= 9 ? 'Harika' : num >= 7 ? 'İyi' : num >= 5 ? 'Orta' : 'Kötü'}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end pb-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="spoiler" 
                          checked={newReview.spoiler} 
                          onCheckedChange={(checked) => setNewReview(prev => ({ ...prev, spoiler: checked === true }))}
                          className="rounded-md border-primary"
                        />
                        <Label htmlFor="spoiler" className="text-sm font-medium cursor-pointer">Spoiler içeriyor mu?</Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Yorumunuz</Label>
                    <Textarea 
                      placeholder="Film hakkında ne düşünüyorsunuz?" 
                      className="rounded-2xl bg-background/50 border-none min-h-[120px] focus:ring-2 focus:ring-primary/20 transition-all"
                      value={newReview.comment}
                      onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                    />
                  </div>

                  <Button 
                    className="w-full h-12 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                    onClick={handleSubmitReview}
                    disabled={reviewLoading}
                  >
                    {reviewLoading ? <RefreshCw className="h-5 w-5 animate-spin mr-2" /> : <Send className="h-5 w-5 mr-2" />}
                    Gönder
                  </Button>
                </Card>
              ) : (
                <Card className="rounded-3xl bg-muted/30 border-dashed border-2 border-muted-foreground/20 p-8 text-center space-y-4">
                  <MessageSquare className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                  <div className="space-y-2">
                    <h4 className="font-bold text-lg">Yorum Yapmak İçin Giriş Yapın</h4>
                    <p className="text-sm text-muted-foreground">Düşüncelerinizi paylaşmak için önce giriş yapmalısınız.</p>
                  </div>
                  <Button onClick={() => router.push('/')} className="rounded-full">Giriş Yap</Button>
                </Card>
              )}

              {/* Yorum Listesi */}
              <div className="space-y-6">
                {reviewsLoading ? (
                  <div className="flex justify-center py-12">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : reviews.length > 0 ? (
                  reviews.map((review) => (
                    <Card key={review.id} className="rounded-3xl bg-muted/30 border-none p-6 space-y-4 transition-all hover:bg-muted/40 group">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">{review.userName?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold">{review.userName}</h4>
                              <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-full text-xs font-bold">
                                <Star className="h-3 w-3 fill-current" />
                                {review.rating}/10
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                          </div>
                        </div>
                        {(user?.uid === review.userId || userData?.role === 'admin') && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-full text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleDeleteReview(review.id!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="pl-16">
                        {review.spoiler && !revealed[review.id!] ? (
                          <div className="bg-background/40 backdrop-blur-sm rounded-2xl p-6 text-center space-y-3 border border-dashed border-primary/20">
                            <p className="text-sm font-bold text-destructive flex items-center justify-center gap-2">
                              <X className="h-4 w-4" /> Dikkat: Bu yorum spoiler içermektedir!
                            </p>
                            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setRevealed(prev => ({ ...prev, [review.id!]: true }))}>
                              Yine de Göster
                            </Button>
                          </div>
                        ) : (
                          <p className="text-muted-foreground leading-relaxed">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <MessageSquare className="h-16 w-16 text-muted-foreground/20 mx-auto" />
                    <p className="text-muted-foreground font-medium">Henüz yorum yapılmamış. İlk yorumu siz yapın!</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* BENZER İÇERİKLER (TMDB Similar - Sadece film detayında) */}
        {similar?.results?.length ? (
          <section className="mt-16 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-1 w-12 bg-primary rounded-full" />
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                  Benzer Filmler
                </h2>
                <Badge variant="secondary" className="rounded-full">
                  {similar.results.length}
                </Badge>
              </div>
              <Button
                variant="ghost"
                onClick={() => router.push('/search?type=similar&movieId=' + movieId)}
                className="rounded-full hidden md:flex gap-2 font-semibold hover:text-primary"
              >
                Tümünü Gör
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
              {similar.results.slice(0, 12).map((item) => (
                <MovieCard key={item.id} movie={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <Dialog open={showTrailer} onOpenChange={setShowTrailer}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden bg-black border-none rounded-[2.5rem] w-[95vw] md:w-full">
          <DialogHeader className="sr-only">
            <DialogTitle>{movie?.title} Fragman</DialogTitle>
          </DialogHeader>
          <div className="relative w-full pt-[56.25%] bg-black">
            {trailerUrl ? (
              <iframe
                src={`${trailerUrl.replace('autoplay=0', 'autoplay=1')}`}
                title={`${movie?.title} Fragman`}
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
    </div>
  );
}
