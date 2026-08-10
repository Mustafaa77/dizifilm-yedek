'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MovieCard } from '@/components/MovieCard';
import { MovieGridSkeleton } from '@/components/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight, TrendingUp, Star, ArrowLeft } from 'lucide-react';
import { TMDBItem, searchMulti, searchMovies, searchTVSeries, searchByYear, fetchPopularMovies, fetchTopRatedMovies, fetchNowPlayingMovies, fetchUpcomingMovies, fetchPopularTVSeries, fetchTopRatedTVSeries, fetchOnTheAirTVSeries, fetchMoviesByGenre, fetchTVSeriesByGenre, genreMap } from '@/lib/tmdb';
import { useRouter } from 'next/navigation';

const popularSearches = [
  'Marvel', 'DC', 'Star Wars', 'Harry Potter', 'Lord of the Rings',
  'Disney', 'Pixar', 'Christopher Nolan', 'Quentin Tarantino', 'Studio Ghibli'
];

const movieTypes = [
  { name: 'Popüler Filmler', type: 'popular', media: 'movie' },
  { name: 'En Çok Oy Alan Filmler', type: 'top_rated', media: 'movie' },
  { name: 'Vizyondaki Filmler', type: 'now_playing', media: 'movie' },
  { name: 'Yakında Gelecek Filmler', type: 'upcoming', media: 'movie' },
  { name: 'Popüler Diziler', type: 'popular', media: 'tv' },
  { name: 'En Çok Oy Alan Diziler', type: 'top_rated', media: 'tv' },
  { name: 'Yayındaki Diziler', type: 'on_the_air', media: 'tv' },
];

const imdbRatings = [
  { name: 'Tümü', value: '' },
  { name: '9+ IMDB', value: '9' },
  { name: '8+ IMDB', value: '8' },
  { name: '7+ IMDB', value: '7' },
  { name: '6+ IMDB', value: '6' },
  { name: '5+ IMDB', value: '5' },
];

const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i);

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchResults, setSearchResults] = useState<TMDBItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState('all');
  const [selectedRating, setSelectedRating] = useState('');

  const loadContent = async (query?: string, genreId?: string, type?: string, media?: string, year?: string, rating?: string, page = 1) => {
    setLoading(true);
    setError('');
    
    try {
      let result;
      
      if (year) {
        result = await searchByYear(year, media || 'all', page);
      } else if (query) {
        if (media === 'movie') {
          result = await searchMovies(query, page);
        } else if (media === 'tv') {
          result = await searchTVSeries(query, page);
        } else {
          result = await searchMulti(query, page);
        }
      } else if (genreId) {
        if (media === 'tv') {
          result = await fetchTVSeriesByGenre(parseInt(genreId), page);
        } else {
          result = await fetchMoviesByGenre(parseInt(genreId), page);
        }
      } else if (type && media) {
        switch (`${type}_${media}`) {
          case 'popular':
          case 'popular_movie':
            result = await fetchPopularMovies(page);
            break;
          case 'top_rated':
          case 'top_rated_movie':
            result = await fetchTopRatedMovies(page);
            break;
          case 'now_playing':
          case 'now_playing_movie':
            result = await fetchNowPlayingMovies(page);
            break;
          case 'upcoming':
          case 'upcoming_movie':
            result = await fetchUpcomingMovies(page);
            break;
          case 'popular_tv':
            result = await fetchPopularTVSeries(page);
            break;
          case 'top_rated_tv':
            result = await fetchTopRatedTVSeries(page);
            break;
          case 'on_the_air_tv':
            result = await fetchOnTheAirTVSeries(page);
            break;
          default:
            result = await fetchPopularMovies(page);
        }
      } else if (!query && !genreId && !type && (year || rating || media !== 'all')) {
        // Sadece filtreler varsa, popüler içerikleri filtrele
        if (media === 'tv') {
          result = await fetchPopularTVSeries(page);
        } else if (media === 'movie') {
          result = await fetchPopularMovies(page);
        } else {
          // Her ikisini de getir ve birleştir
          const [movieResults, tvResults] = await Promise.all([
            fetchPopularMovies(page),
            fetchPopularTVSeries(page)
          ]);
          result = {
            page: page,
            results: [...movieResults.results, ...tvResults.results],
            total_pages: Math.max(movieResults.total_pages, tvResults.total_pages),
            total_results: movieResults.total_results + tvResults.total_results
          };
        }
      } else {
        result = await fetchPopularMovies(page);
      }
      
      // IMDB puanına göre filtrele
      if (rating && result.results) {
        const minRating = parseFloat(rating);
        result.results = result.results.filter(item => item.vote_average >= minRating);
        result.total_results = result.results.length;
      }
      
      setSearchResults(result.results);
      setTotalResults(result.total_results);
      setTotalPages(result.total_pages);
      setCurrentPage(page);
    } catch (error) {
      setError('Arama sırasında hata oluştu');
      setSearchResults([]);
      setTotalResults(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query = searchParams.get('q');
    const genreId = searchParams.get('genre');
    const type = searchParams.get('type');
    const media = searchParams.get('media');
    const year = searchParams.get('year');
    const rating = searchParams.get('rating');
    
    if (query || year || rating || (media && media !== 'all')) {
      // Arama terimi veya filtre varsa ara
      setSearchQuery(query || '');
      loadContent(query || undefined, undefined, undefined, media || 'all', year || undefined, rating || undefined);
    } else if (genreId) {
      loadContent(undefined, genreId, undefined, media || 'movie', undefined, rating || undefined);
    } else if (type && media) {
      loadContent(undefined, undefined, type, media, undefined, rating || undefined);
    } else {
      // Hiçbir parametre yoksa popüler içerikleri göster
      loadContent();
    }
    
    // URL parametrelerini form state'ine yansıt
    if (media) setSelectedMediaType(media);
    if (year) setSelectedYear(year);
    if (rating) setSelectedRating(rating);
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      let url = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
      if (selectedMediaType !== 'all') {
        url += `&media=${selectedMediaType}`;
      }
      if (selectedYear) {
        url += `&year=${selectedYear}`;
      }
      if (selectedRating) {
        url += `&rating=${selectedRating}`;
      }
      router.push(url);
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedYear('');
    setSelectedMediaType('all');
    setSelectedRating('');
    router.push('/search');
  };

  const handleQuickSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const handlePageChange = (page: number) => {
    const query = searchParams.get('q');
    const genreId = searchParams.get('genre');
    const type = searchParams.get('type');
    const media = searchParams.get('media');
    const year = searchParams.get('year');
    const rating = searchParams.get('rating');
    
    loadContent(query || undefined, genreId || undefined, type || undefined, media || undefined, year || undefined, rating || undefined, page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleFilterChange = (filterType: string, value: string) => {
    let url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    
    if (filterType === 'media') {
      setSelectedMediaType(value);
      params.set('media', value);
    } else if (filterType === 'year') {
      setSelectedYear(value);
      if (value) params.set('year', value);
      else params.delete('year');
    } else if (filterType === 'rating') {
      setSelectedRating(value);
      if (value) params.set('rating', value);
      else params.delete('rating');
    }
    
    router.push(`/search?${params.toString()}`);
  };

  const getPageTitle = () => {
    const query = searchParams.get('q');
    const genreId = searchParams.get('genre');
    const type = searchParams.get('type');
    const media = searchParams.get('media');
    const year = searchParams.get('year');
    const rating = searchParams.get('rating');
    
    if (year) {
      const mediaText = media === 'movie' ? 'Filmler' : media === 'tv' ? 'Diziler' : 'Film ve Diziler';
      let title = `${year} ${mediaText}`;
      if (rating) title += ` (${rating}+ IMDB)`;
      return title;
    } else if (query) {
      let title = `"${query}" için arama sonuçları`;
      if (rating) title += ` (${rating}+ IMDB)`;
      return title;
    } else if (genreId) {
      const genreName = genreMap[parseInt(genreId)] || 'Bilinmeyen Tür';
      const mediaText = media === 'tv' ? 'dizileri' : 'filmleri';
      let title = `${genreName} ${mediaText}`;
      if (rating) title += ` (${rating}+ IMDB)`;
      return title;
    } else if (type && media) {
      const typeObj = movieTypes.find(t => t.type === type && t.media === media);
      let title = typeObj ? typeObj.name : 'Filmler';
      if (rating) title += ` (${rating}+ IMDB)`;
      return title;
    }
    return 'Popüler Film ve Diziler';
  };

  return (
    <div className="container mx-auto px-4 py-12 space-y-12 animate-reveal fade-in duration-700">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-full pl-0 hover:pl-2 transition-all group"
            onClick={handleGoBack}
          >
            <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
            Geri Dön
          </Button>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            {searchParams.get('q') ? (
              <>
                <span className="text-muted-foreground">Sonuçlar:</span>{' '}
                <span className="text-gradient">"{searchParams.get('q')}"</span>
              </>
            ) : searchParams.get('genre') ? (
              <>
                <span className="text-muted-foreground">Tür:</span>{' '}
                <span className="text-gradient">{genreMap[parseInt(searchParams.get('genre')!)]}</span>
              </>
            ) : (
              <span className="text-gradient">Keşfet</span>
            )}
          </h1>
          <p className="text-muted-foreground font-medium">
            {totalResults > 0 ? `${totalResults.toLocaleString()} sonuç bulundu` : 'Binlerce içerik arasından dilediğinizi bulun'}
          </p>
        </div>

        {/* Quick Search Form */}
        <form onSubmit={handleSubmit} className="flex-1 max-w-lg">
          <div className="group relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              type="text"
              placeholder="Film, dizi veya oyuncu ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 rounded-2xl bg-muted/50 pl-12 pr-4 border-none focus:ring-2 focus:ring-primary/20 transition-all text-lg shadow-inner"
            />
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          <Card className="rounded-[2rem] border-none bg-muted/30 p-6 space-y-8 sticky top-24">
            <div className="space-y-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Filtreler
              </h3>
              
              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">İçerik Türü</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', name: 'Tümü' },
                    { id: 'movie', name: 'Filmler' },
                    { id: 'tv', name: 'Diziler' }
                  ].map((type) => (
                    <Button
                      key={type.id}
                      variant={selectedMediaType === type.id ? "default" : "outline"}
                      size="sm"
                      className="rounded-full px-4"
                      onClick={() => handleFilterChange('media', type.id)}
                    >
                      {type.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Minimum Puan</Label>
                <div className="grid grid-cols-3 gap-2">
                  {imdbRatings.map((rating) => (
                    <Button
                      key={rating.value}
                      variant={selectedRating === rating.value ? "default" : "outline"}
                      size="sm"
                      className="rounded-xl px-2 text-[10px]"
                      onClick={() => handleFilterChange('rating', rating.value)}
                    >
                      {rating.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Yıl</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={selectedYear === '' ? "default" : "outline"}
                    size="sm"
                    className="rounded-xl"
                    onClick={() => handleFilterChange('year', '')}
                  >
                    Tümü
                  </Button>
                  {years.slice(0, 5).map((year) => (
                    <Button
                      key={year}
                      variant={selectedYear === year.toString() ? "default" : "outline"}
                      size="sm"
                      className="rounded-xl"
                      onClick={() => handleFilterChange('year', year.toString())}
                    >
                      {year}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Popüler Aramalar</h4>
              <div className="flex flex-wrap gap-2">
                {popularSearches.slice(0, 6).map((search) => (
                  <Badge 
                    key={search} 
                    variant="secondary" 
                    className="cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors px-3 py-1 rounded-full text-xs"
                    onClick={() => handleQuickSearch(search)}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Results Main Content */}
        <div className="lg:col-span-3 space-y-12">
          {error && (
            <Alert variant="destructive" className="rounded-2xl border-none bg-destructive/10">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <MovieGridSkeleton count={12} />
          ) : searchResults.length > 0 ? (
            <div className="space-y-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {searchResults.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms` }}>
                    <MovieCard movie={item} />
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-8">
                  <Button
                    variant="outline"
                    className="rounded-2xl h-12 w-12 p-0"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center gap-2 font-bold bg-muted/50 px-6 h-12 rounded-2xl">
                    <span className="text-primary">{currentPage}</span>
                    <span className="text-muted-foreground">/</span>
                    <span>{totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-2xl h-12 w-12 p-0"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
              <div className="h-32 w-32 rounded-full bg-muted/50 flex items-center justify-center">
                <Search className="h-16 w-16 text-muted-foreground/20" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">Sonuç Bulunamadı</h3>
                <p className="text-muted-foreground max-w-sm">
                  Aradığınız kriterlere uygun içerik bulamadık. Lütfen farklı anahtar kelimeler deneyin.
                </p>
              </div>
              <Button variant="outline" className="rounded-full" onClick={handleReset}>
                Aramayı Temizle
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}