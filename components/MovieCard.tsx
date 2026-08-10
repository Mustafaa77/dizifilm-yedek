'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Eye, Star, Calendar, Bookmark } from 'lucide-react';
import { TMDBItem, getPosterUrl, genreMap, getTitle, getReleaseDate, getDetailUrl } from '@/lib/tmdb';
import { useAuth } from '@/contexts/AuthContext';
import { toggleFavorite, toggleWatched, toggleWatchLater } from '@/lib/firestore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MovieCardProps {
  movie: TMDBItem;
  showActions?: boolean;
  className?: string;
}

export function MovieCard({ movie, showActions = true, className }: MovieCardProps) {
  const { user, userData, refreshUserData } = useAuth();
  const [loading, setLoading] = useState(false);

  const isFavorite = userData?.favoriteItems?.includes(movie.id.toString()) || false;
  const isWatched = userData?.watchedItems?.includes(movie.id.toString()) || false;
  const isWatchLater = userData?.watchLaterItems?.includes(movie.id.toString()) || false;

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('Favorilere eklemek için giriş yapın');
      return;
    }
    
    setLoading(true);
    try {
      await toggleFavorite(user.uid, movie.id.toString());
      await refreshUserData();
      toast.success(isFavorite ? 'Favorilerden çıkarıldı' : 'Favorilere eklendi');
    } catch (error) {
      console.error('Favori güncellenirken hata:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleWatched = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('İzleme listesine eklemek için giriş yapın');
      return;
    }
    
    setLoading(true);
    try {
      await toggleWatched(user.uid, movie.id.toString());
      await refreshUserData();
      toast.success(isWatched ? 'İzleme listesinden çıkarıldı' : 'İzleme listesine eklendi');
    } catch (error) {
      console.error('İzleme listesi güncellenirken hata:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleWatchLater = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast.error('İzlenecek listesine eklemek için giriş yapın');
      return;
    }
    
    setLoading(true);
    try {
      await toggleWatchLater(user.uid, movie.id.toString());
      await refreshUserData();
      toast.success(isWatchLater ? 'İzlenecek listesinden çıkarıldı' : 'İzlenecek listesine eklendi');
    } catch (error) {
      console.error('İzlenecek listesi güncellenirken hata:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const posterUrl = getPosterUrl(movie.poster_path);
  const title = getTitle(movie);
  const releaseDate = getReleaseDate(movie);
  const releaseYear = releaseDate ? new Date(releaseDate).getFullYear() : '';
  const mediaType = movie.media_type || 'movie';
  const isTV = mediaType === 'tv';
  const genres = movie.genre_ids?.slice(0, 2).map(id => genreMap[id]).filter(Boolean) || [];

  return (
    <Card className={cn(
      "group relative flex flex-col overflow-hidden rounded-3xl border-none bg-muted/30 transition-all duration-500 hover:bg-muted/50 hover:shadow-2xl hover:shadow-primary/10 hover-lift",
      className
    )}>
      <Link href={getDetailUrl(movie)} className="flex flex-col flex-1">
        <div className="relative aspect-[2/3] overflow-hidden rounded-t-3xl">
          <Image
            src={posterUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110 group-hover:rotate-1"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          
          {/* Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80" />
          
          {/* Media türü badge */}
          <Badge className={cn(
            "absolute top-3 left-3 rounded-full border-none px-3 py-1 text-[10px] font-bold tracking-wider uppercase text-white shadow-lg backdrop-blur-md",
            isTV ? 'bg-purple-500/80' : 'bg-primary/80'
          )}>
            {isTV ? 'Dizi' : 'Film'}
          </Badge>
          
          {/* TMDB Puanı */}
          {movie.vote_average > 0 && (
            <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[11px] font-bold text-white backdrop-blur-md transition-colors group-hover:bg-primary/80">
              <Star className="h-3 w-3 text-yellow-400 fill-current" />
              <span>{movie.vote_average.toFixed(1)}</span>
            </div>
          )}

          {/* Quick Info Overlay (Bottom) */}
          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <div className="flex flex-wrap gap-1">
              {genres.map((genre) => (
                <span key={genre} className="text-[10px] font-medium text-white/90 bg-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {genre}
                </span>
              ))}
            </div>
          </div>
        </div>
        
        <CardContent className="flex flex-col flex-1 p-5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="flex-1 font-bold text-base line-clamp-1 group-hover:text-primary transition-colors leading-tight">
              {title}
            </h3>
            {releaseYear && (
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {releaseYear}
              </span>
            )}
          </div>
          
          {movie.overview && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-4">
              {movie.overview}
            </p>
          )}

          {/* Favori/İzlendi durumu göstergesi (üstte, her zaman görünür ama soft) */}
          {user && (isFavorite || isWatched || isWatchLater) && (
            <div className="mt-auto pt-2 flex gap-2">
              {isFavorite && (
                <Badge variant="outline" className="h-5 px-1.5 border-red-500/20 bg-red-500/5 text-red-500 text-[9px] rounded-full">
                  <Heart className="h-2.5 w-2.5 mr-1 fill-current" /> Favori
                </Badge>
              )}
              {isWatched && (
                <Badge variant="outline" className="h-5 px-1.5 border-green-500/20 bg-green-500/5 text-green-500 text-[9px] rounded-full">
                  <Eye className="h-2.5 w-2.5 mr-1 fill-current" /> İzlendi
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Link>
      
      {showActions && user && (
        <CardFooter className="p-4 pt-0">
          <div className="grid grid-cols-3 gap-2 w-full">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleFavorite}
              disabled={loading}
              className={cn(
                "h-9 rounded-xl transition-all duration-300",
                isFavorite ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : "hover:bg-primary/10"
              )}
              title={isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
            >
              <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              onClick={handleWatched}
              disabled={loading}
              className={cn(
                "h-9 rounded-xl transition-all duration-300",
                isWatched ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "hover:bg-primary/10"
              )}
              title={isWatched ? 'İzleme Listesinden Çıkar' : 'İzlendi Olarak İşaretle'}
            >
              <Eye className={cn("h-4 w-4", isWatched && "fill-current")} />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleWatchLater}
              disabled={loading}
              className={cn(
                "h-9 rounded-xl transition-all duration-300",
                isWatchLater ? "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" : "hover:bg-primary/10"
              )}
              title={isWatchLater ? 'İzleneceklerden Çıkar' : 'Daha Sonra İzle'}
            >
              <Bookmark className={cn("h-4 w-4", isWatchLater && "fill-current")} />
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}