'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MovieCard } from '@/components/MovieCard';
import { MovieGridSkeleton } from '@/components/SkeletonLoader';
import { OnboardingWelcome } from '@/components/OnboardingWelcome';
import { Shuffle, TrendingUp, Star, Film, Tv, Calendar, Award, Clock, Users, Play, Eye, Heart, Zap, Crown, Globe, Sparkles, MessageSquare } from 'lucide-react';
import { TMDBItem, fetchPopularMovies, fetchTopRatedMovies, fetchNowPlayingMovies, fetchUpcomingMovies, fetchPopularTVSeries, fetchTopRatedTVSeries, getRandomMovieId } from '@/lib/tmdb';
import { useRouter } from 'next/navigation';

const categories = [
  { name: 'Aksiyon', icon: '🎬', genreId: 28, color: 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20' },
  { name: 'Komedi', icon: '😄', genreId: 35, color: 'bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20' },
  { name: 'Drama', icon: '🎭', genreId: 18, color: 'bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20' },
  { name: 'Korku', icon: '👻', genreId: 27, color: 'bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/20' },
  { name: 'Romantik', icon: '💕', genreId: 10749, color: 'bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/20' },
  { name: 'Bilim Kurgu', icon: '🚀', genreId: 878, color: 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/20' },
  { name: 'Gerilim', icon: '🔍', genreId: 53, color: 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20' },
  { name: 'Animasyon', icon: '🎨', genreId: 16, color: 'bg-green-500/10 hover:bg-green-500/20 border-green-500/20' },
  { name: 'Fantastik', icon: '🧙‍♂️', genreId: 14, color: 'bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20' },
  { name: 'Suç', icon: '🕵️', genreId: 80, color: 'bg-gray-500/10 hover:bg-gray-500/20 border-gray-500/20' },
  { name: 'Belgesel', icon: '📽️', genreId: 99, color: 'bg-teal-500/10 hover:bg-teal-500/20 border-teal-500/20' },
  { name: 'Aile', icon: '👨‍👩‍👧‍👦', genreId: 10751, color: 'bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20' },
];

const quickLinks = [
  { name: 'En İyi Filmler', icon: Award, color: 'text-yellow-500', type: 'top_rated', bg: 'bg-yellow-500/10' },
  { name: 'Yeni Çıkanlar', icon: Calendar, color: 'text-green-500', type: 'upcoming', bg: 'bg-green-500/10' },
  { name: 'Vizyondakiler', icon: Tv, color: 'text-blue-500', type: 'now_playing', bg: 'bg-blue-500/10' },
  { name: 'Popüler Filmler', icon: TrendingUp, color: 'text-red-500', type: 'popular', bg: 'bg-red-500/10' },
  { name: 'Popüler Diziler', icon: Crown, color: 'text-amber-500', type: 'popular_tv', bg: 'bg-amber-500/10' },
  { name: 'En İyi Diziler', icon: Sparkles, color: 'text-rose-500', type: 'top_rated_tv', bg: 'bg-rose-500/10' },
];

const trendingTopics = [
  { name: 'Marvel Filmleri', icon: '🦸‍♂️', query: 'marvel' },
  { name: 'DC Filmleri', icon: '🦇', query: 'dc' },
  { name: 'Star Wars', icon: '⭐', query: 'star wars' },
  { name: 'Harry Potter', icon: '⚡', query: 'harry potter' },
  { name: 'Yüzüklerin Efendisi', icon: '💍', query: 'lord of the rings' },
  { name: 'Disney Filmleri', icon: '🏰', query: 'disney' },
  { name: 'Pixar Filmleri', icon: '🎭', query: 'pixar' },
  { name: 'Christopher Nolan', icon: '🎬', query: 'christopher nolan' },
];

const featuredCollections = [
  {
    title: 'Bu Hafta Trend',
    description: 'En çok izlenen içerikler',
    icon: TrendingUp,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    type: 'popular'
  },
  {
    title: 'Eleştirmenlerin Seçimi',
    description: 'Yüksek puanlı yapımlar',
    icon: Star,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    type: 'top_rated'
  },
  {
    title: 'Vizyondaki Filmler',
    description: 'Şu anda sinemalarda',
    icon: Eye,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    type: 'now_playing'
  },
  {
    title: 'Yakında Gelecek',
    description: 'Merakla beklenenler',
    icon: Heart,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    type: 'upcoming'
  }
];

export default function Home() {
  const [popularMovies, setPopularMovies] = useState<TMDBItem[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<TMDBItem[]>([]);
  const [popularTVSeries, setPopularTVSeries] = useState<TMDBItem[]>([]);
  const [topRatedTVSeries, setTopRatedTVSeries] = useState<TMDBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [randomLoading, setRandomLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadMovies = async () => {
      setLoading(true);
      try {
        const [popularResult, topRatedResult, popularTVResult, topRatedTVResult] = await Promise.all([
          fetchPopularMovies(),
          fetchTopRatedMovies(),
          fetchPopularTVSeries(),
          fetchTopRatedTVSeries(),
        ]);
        setPopularMovies(popularResult.results.slice(0, 12));
        setTopRatedMovies(topRatedResult.results.slice(0, 12));
        setPopularTVSeries(popularTVResult.results.slice(0, 12));
        setTopRatedTVSeries(topRatedTVResult.results.slice(0, 12));
      } catch (error) {
        console.error('Filmler yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    loadMovies();
  }, []);

  const handleRandomMovie = async () => {
    setRandomLoading(true);
    try {
      const randomId = getRandomMovieId();
      router.push(`/movie/${randomId}`);
    } catch (error) {
      console.error('Rastgele film alınırken hata:', error);
    } finally {
      setRandomLoading(false);
    }
  };

  const handleCategoryClick = (genreId: number) => {
    router.push(`/search?genre=${genreId}`);
  };

  const handleQuickLinkClick = (type: string) => {
    if (type === 'popular_tv') {
      router.push(`/search?type=popular&media=tv`);
    } else if (type === 'top_rated_tv') {
      router.push(`/search?type=top_rated&media=tv`);
    } else {
      router.push(`/search?type=${type}&media=movie`);
    }
  };

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute -left-[10%] -top-[10%] h-[50%] w-[50%] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
          <div className="absolute -right-[10%] -bottom-[10%] h-[50%] w-[50%] rounded-full bg-blue-600/20 blur-[120px] animate-pulse [animation-delay:2s]" />
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:32px_32px]" />
        </div>

        <div className="container relative z-10 px-4">
          <div className="mx-auto max-w-4xl text-center space-y-10 animate-reveal fade-in slide-in-from-bottom-8 duration-1000">
            <div className="space-y-6">
              <Badge variant="outline" className="rounded-full px-4 py-1 text-sm font-medium border-primary/20 bg-primary/5 text-primary backdrop-blur-sm animate-bounce">
                ✨ Yeni Nesil Sinema Deneyimi
              </Badge>
              <h1 className="text-6xl font-extrabold tracking-tight sm:text-7xl md:text-8xl">
                <span className="text-gradient">NOXEN</span>
                <span className="block text-2xl md:text-3xl font-medium text-muted-foreground mt-4">
                  Sınır Tanımayan Eğlence Dünyası
                </span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed">
                Binlerce film ve diziyi keşfedin, inceleyin ve favorilerinizi oluşturun.
                En yeni yapımlardan klasiklere kadar her şey parmaklarınızın ucunda.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Button
                size="lg"
                className="group h-14 rounded-full px-8 text-lg font-semibold shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                onClick={() => router.push('/search')}
              >
                <Play className="mr-2 h-5 w-5 fill-current" />
                Hemen Keşfet
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-full px-8 text-lg font-semibold backdrop-blur-sm transition-all hover:bg-primary/5 hover:scale-105 active:scale-95"
                onClick={handleRandomMovie}
                disabled={randomLoading}
              >
                <Shuffle className={`mr-2 h-5 w-5 ${randomLoading ? 'animate-spin' : ''}`} />
                {randomLoading ? 'Hazırlanıyor...' : 'Sürpriz Film'}
              </Button>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 animate-reveal fade-in slide-in-from-bottom-12 duration-1000 delay-300">
              {[
                { label: 'İçerik', value: '1M+', color: 'text-primary' },
                { label: 'Kullanıcı', value: '100K+', color: 'text-blue-500' },
                { label: 'Yorum', value: '500K+', color: 'text-purple-500' },
                { label: 'Puan', value: '4.9/5', color: 'text-yellow-500' }
              ].map((stat, i) => (
                <div key={i} className="group rounded-2xl border border-white/5 bg-white/5 p-4 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/10">
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
          <div className="h-10 w-6 rounded-full border-2 border-muted-foreground flex justify-center p-1">
            <div className="h-2 w-1 rounded-full bg-muted-foreground" />
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 space-y-24">
        {/* Featured Collections Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredCollections.map((collection, i) => (
            <Card
              key={i}
              className="group relative overflow-hidden rounded-3xl border-none bg-muted/30 transition-all hover:bg-muted/50 cursor-pointer"
              onClick={() => handleQuickLinkClick(collection.type)}
            >
              <CardContent className="p-6">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${collection.bg} ${collection.color} transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                  <collection.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-1">{collection.title}</h3>
                <p className="text-sm text-muted-foreground">{collection.description}</p>
              </CardContent>
              <div className="absolute bottom-0 left-0 h-1 w-0 bg-primary transition-all duration-500 group-hover:w-full" />
            </Card>
          ))}
        </section>

        {/* Kategoriler Scrollable */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold tracking-tight">Kategoriler</h2>
              <p className="text-muted-foreground font-medium">İlginizi çeken türü seçin</p>
            </div>
            <Button variant="ghost" className="rounded-full group" onClick={() => router.push('/search')}>
              Tümünü Gör <Globe className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 mask-fade-edges">
            {categories.map((category) => (
              <Button
                key={category.name}
                variant="outline"
                className={`h-auto flex-shrink-0 flex flex-col items-center gap-3 px-8 py-6 rounded-3xl border-2 transition-all hover:scale-105 active:scale-95 ${category.color}`}
                onClick={() => handleCategoryClick(category.genreId)}
              >
                <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">{category.icon}</span>
                <span className="font-bold">{category.name}</span>
              </Button>
            ))}
          </div>
        </section>
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Kategoriler</h2>
            <p className="text-muted-foreground text-lg">Sevdiğiniz türde film ve dizileri keşfedin</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Card
                key={category.name}
                className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${category.color} border-2 group`}
                onClick={() => handleCategoryClick(category.genreId)}
              >
                <CardContent className="p-6 text-center">
                  <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{category.icon}</div>
                  <h3 className="font-semibold text-sm group-hover:font-bold transition-all duration-300">{category.name}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Öne Çıkan Koleksiyonlar */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Öne Çıkan Koleksiyonlar</h2>
            <p className="text-muted-foreground text-lg">Özel seçilmiş film ve dizi koleksiyonları</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredCollections.map((collection) => (
              <Card
                key={collection.title}
                className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg ${collection.bg} border-2`}
                onClick={() => handleQuickLinkClick(collection.type)}
              >
                <CardContent className="p-6 text-center">
                  <collection.icon className={`h-8 w-8 mx-auto mb-4 ${collection.color}`} />
                  <h3 className="font-bold text-lg mb-2">{collection.title}</h3>
                  <p className="text-sm text-muted-foreground">{collection.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* En Çok Yorum Alan ve En Yüksek Puanlı */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Öne Çıkan İçerikler</h2>
            <p className="text-muted-foreground text-lg">En çok yorum alan ve en yüksek puanlı yapımlar</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  En Çok Yorum Alan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <MovieGridSkeleton count={4} />
                ) : (
                  <div className="space-y-3">
                    {popularMovies.slice(0, 4).map((movie, index) => (
                      <div key={movie.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors" onClick={() => router.push(`/movie/${movie.id}`)}>
                        <div className="text-sm font-bold text-muted-foreground w-6">#{index + 1}</div>
                        <div className="flex-1">
                          <div className="font-medium text-sm line-clamp-1">{movie.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {movie.release_date ? new Date(movie.release_date).getFullYear() : ''}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-3 w-3 text-blue-500" />
                          <span className="text-xs font-medium">{Math.floor(Math.random() * 50) + 10}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  En Yüksek Puanlı
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <MovieGridSkeleton count={4} />
                ) : (
                  <div className="space-y-3">
                    {topRatedMovies.slice(0, 4).map((movie, index) => (
                      <div key={movie.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors" onClick={() => router.push(`/movie/${movie.id}`)}>
                        <div className="text-sm font-bold text-muted-foreground w-6">#{index + 1}</div>
                        <div className="flex-1">
                          <div className="font-medium text-sm line-clamp-1">{movie.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {movie.release_date ? new Date(movie.release_date).getFullYear() : ''}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-xs font-medium">{movie.vote_average.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
        {/* Trend Konular */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Trend Konular</h2>
            <p className="text-muted-foreground text-lg">Popüler arama konuları</p>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            {trendingTopics.map((topic) => (
              <Badge
                key={topic.name}
                variant="secondary"
                className="text-sm py-2 px-4 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => router.push(`/search?q=${encodeURIComponent(topic.query)}`)}
              >
                <span className="mr-2">{topic.icon}</span>
                {topic.name}
              </Badge>
            ))}
          </div>
        </section>

        {/* Ana İçerik Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Ana İçerik */}
          <div className="lg:col-span-3 space-y-12">
            {/* Popüler Filmler */}
            <section>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-2xl">
                    <TrendingUp className="h-6 w-6 text-red-500" />
                    <span>Popüler Filmler</span>
                    <Badge variant="secondary" className="ml-auto">TMDB</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <MovieGridSkeleton count={8} />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {popularMovies.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* En Çok Oy Alan Filmler */}
            <section>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-2xl">
                    <Star className="h-6 w-6 text-yellow-500" />
                    <span>En Çok Oy Alan Filmler</span>
                    <Badge variant="secondary" className="ml-auto">TMDB</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <MovieGridSkeleton count={8} />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                      {topRatedMovies.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Hızlı Linkler */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <span>Hızlı Erişim</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quickLinks.map((link) => (
                  <Button
                    key={link.name}
                    variant="ghost"
                    className={`w-full justify-start h-auto p-3 hover:bg-primary/10 ${link.bg}`}
                    onClick={() => handleQuickLinkClick(link.type)}
                  >
                    <link.icon className={`h-4 w-4 mr-3 ${link.color}`} />
                    <span className="text-sm">{link.name}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Platform Özellikleri */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-blue-500" />
                  <span>Platform Özellikleri</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Heart className="h-5 w-5 text-red-500" />
                  <div>
                    <div className="font-semibold text-sm">Favori Listesi</div>
                    <div className="text-xs text-muted-foreground">Sevdiklerinizi kaydedin</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Eye className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="font-semibold text-sm">İzleme Listesi</div>
                    <div className="text-xs text-muted-foreground">İzlediklerinizi takip edin</div>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <div>
                    <div className="font-semibold text-sm">Puanlama Sistemi</div>
                    <div className="text-xs text-muted-foreground">Yorumlarınızı paylaşın</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* İstatistikler */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  <span>Platform İstatistikleri</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Film & Dizi</span>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">1,000,000+</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Aktif Kullanıcı</span>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">100,000+</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Toplam İnceleme</span>
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">1,000,000+</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Günlük Güncelleme</span>
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">24/7</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Popüler Diziler */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Tv className="h-5 w-5 text-purple-500" />
                  <span>Popüler Diziler</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <MovieGridSkeleton count={4} />
                ) : (
                  <div className="space-y-3">
                    {popularTVSeries.slice(0, 4).map((series, index) => (
                      <div key={series.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-lg cursor-pointer transition-colors" onClick={() => router.push(`/tv/${series.id}`)}>
                        <div className="text-sm font-bold text-muted-foreground w-6">#{index + 1}</div>
                        <div className="flex-1">
                          <div className="font-medium text-sm line-clamp-1">{series.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {series.first_air_date ? new Date(series.first_air_date).getFullYear() : ''}
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          <span className="text-xs font-medium">{series.vote_average.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Popüler Diziler Bölümü */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-2xl">
                <Tv className="h-6 w-6 text-purple-500" />
                <span>Popüler Diziler</span>
                <Badge variant="secondary" className="ml-auto">TMDB</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <MovieGridSkeleton count={8} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {popularTVSeries.map((series) => (
                    <MovieCard key={series.id} movie={series} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* En Çok Oy Alan Diziler */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-2xl">
                <Star className="h-6 w-6 text-yellow-500" />
                <span>En Çok Oy Alan Diziler</span>
                <Badge variant="secondary" className="ml-auto">TMDB</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <MovieGridSkeleton count={8} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {topRatedTVSeries.map((series) => (
                    <MovieCard key={series.id} movie={series} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
      <OnboardingWelcome />
    </div>
  );
}