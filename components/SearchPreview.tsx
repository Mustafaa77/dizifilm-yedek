'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TMDBSearchResult, searchTMDB } from '@/lib/tmdb';
import { Film, Tv } from 'lucide-react';

interface SearchPreviewProps {
  query: string;
  onSelect?: () => void;
}

export function SearchPreview({ query, onSelect }: SearchPreviewProps) {
  const [results, setResults] = useState<TMDBSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchResults = async () => {
      if (query.trim().length < 3) return;
      
      setLoading(true);
      try {
        // Sadece ilk 5 sonucu göster
        const data = await searchTMDB(query, 1);
        setResults(data.results.slice(0, 5));
      } catch (error) {
        console.error('Arama önizleme hatası:', error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchResults();
    }, 300); // Debounce

    return () => clearTimeout(timer);
  }, [query]);

  if (loading) {
    return (
      <div className="p-3 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-2">
            <Skeleton className="h-16 w-12 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-3/4 rounded-full" />
              <Skeleton className="h-3 w-1/2 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="p-8 text-center space-y-2">
        <div className="text-4xl">🔍</div>
        <p className="text-sm font-medium text-muted-foreground">Sonuç bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1">
      {results.map((item) => (
        <Card 
          key={item.id} 
          className="group border-none bg-transparent hover:bg-primary/5 transition-all cursor-pointer rounded-xl overflow-hidden"
          onClick={() => {
            onSelect?.();
            router.push(`/${item.media_type}/${item.id}`);
          }}
        >
          <CardContent className="p-2 flex items-center gap-4">
            <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg shadow-sm">
              {item.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                  alt={item.title || item.name || ''}
                  fill
                  className="object-cover transition-transform group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  {item.media_type === 'movie' ? (
                    <Film className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <Tv className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                {item.title || item.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.media_type === 'movie' ? 'Film' : 'Dizi'} • 
                {item.release_date || item.first_air_date
                  ? ` ${new Date(item.release_date || item.first_air_date || '').getFullYear()}`
                  : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
      
      <div 
        className="text-center p-2 text-sm text-primary hover:underline cursor-pointer"
        onClick={() => {
          onSelect?.();
          router.push(`/search?q=${encodeURIComponent(query)}`);
        }}
      >
        Tüm sonuçları göster
      </div>
    </div>
  );
}
