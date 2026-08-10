'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MovieCard } from '@/components/MovieCard';
import { MovieGridSkeleton } from '@/components/SkeletonLoader';
import { Heart } from 'lucide-react';
import { TMDBMovie, fetchMovieById } from '@/lib/tmdb';
import { useRouter } from 'next/navigation';
import { RequireAuth } from '@/components/RequireAuth';

function FavoritesPageContent() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [favoriteMovies, setFavoriteMovies] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      setLoading(true);
      
      try {
        if (userData?.favoriteItems && userData.favoriteItems.length > 0) {
          const moviePromises = userData.favoriteItems.map(id => fetchMovieById(parseInt(id)));
          const movies = await Promise.all(moviePromises);
          setFavoriteMovies(movies.filter(Boolean) as TMDBMovie[]);
        }
      } catch (error) {
        console.error('Favoriler yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [user, userData]);

  return (
    <div className="container mx-auto px-4 py-12 space-y-12 animate-reveal fade-in duration-700">
      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <Heart className="h-6 w-6 text-red-500 fill-current" />
          </div>
          <span className="text-gradient">Favorilerim</span>
        </h1>
        <p className="text-muted-foreground font-medium">
          {favoriteMovies.length > 0 ? `${favoriteMovies.length} favori içeriğiniz bulunuyor` : 'Kalbinizde yer edinen tüm içerikler burada'}
        </p>
      </div>

      <div className="min-h-[400px]">
        {loading ? (
          <MovieGridSkeleton count={10} />
        ) : favoriteMovies.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
            {favoriteMovies.map((movie, index) => (
              <div key={movie.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms` }}>
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-muted/30 rounded-[3rem] border-2 border-dashed border-muted-foreground/10">
            <div className="h-32 w-32 rounded-full bg-muted/50 flex items-center justify-center">
              <Heart className="h-16 w-16 text-muted-foreground/20" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Henüz Favori Yok</h3>
              <p className="text-muted-foreground max-w-sm">
                Keşfettiğiniz ve sevdiğiniz içerikleri kalp ikonuna tıklayarak buraya ekleyebilirsiniz.
              </p>
            </div>
            <Button size="lg" className="rounded-full px-8" onClick={() => router.push('/search')}>
              Keşfetmeye Başla
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  return (
    <RequireAuth role="approved">
      <FavoritesPageContent />
    </RequireAuth>
  );
}