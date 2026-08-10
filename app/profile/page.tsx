'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MovieCard } from '@/components/MovieCard';
import { MovieGridSkeleton } from '@/components/SkeletonLoader';
import { User, Heart, Eye, MessageSquare, Calendar, Star, ExternalLink, Bookmark, Trash2, Settings, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TMDBMovie, fetchMovieById } from '@/lib/tmdb';
import { getUserReviews, deleteReview, Review, updateUserProfile } from '@/lib/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatDate } from '@/lib/firestore';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RequireAuth } from '@/components/RequireAuth';

function ProfilePageContent() {
  const { user, userData, refreshUserData } = useAuth();
  const router = useRouter();
  const [favoriteMovies, setFavoriteMovies] = useState<TMDBMovie[]>([]);
  const [watchedMovies, setWatchedMovies] = useState<TMDBMovie[]>([]);
  const [watchLaterMovies, setWatchLaterMovies] = useState<TMDBMovie[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);

  const [editForm, setEditForm] = useState({
    username: '',
    displayName: '',
  });

  useEffect(() => {
    if (userData) {
      setEditForm({
        username: userData.username || '',
        displayName: userData.displayName || '',
      });
    }
  }, [userData]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUpdateLoading(true);
    try {
      await updateUserProfile(user.uid, {
        username: editForm.username.trim().toLowerCase().replace(/\s+/g, ''),
        displayName: editForm.displayName.trim(),
      });
      await refreshUserData();
      toast.success('Profil güncellendi');
    } catch (error) {
      console.error('Profil güncellenirken hata:', error);
      toast.error('Profil güncellenirken hata oluştu');
    } finally {
      setUpdateLoading(false);
    }
  };

  useEffect(() => {
    const loadUserData = async () => {
      setLoading(true);
      
      try {
        if (userData?.favoriteItems) {
          const favoritePromises = userData.favoriteItems.map(id => fetchMovieById(parseInt(id)));
          const favorites = await Promise.all(favoritePromises);
          setFavoriteMovies(favorites.filter(Boolean) as TMDBMovie[]);
        }

        if (userData?.watchedItems) {
          const watchedPromises = userData.watchedItems.map(id => fetchMovieById(parseInt(id)));
          const watched = await Promise.all(watchedPromises);
          setWatchedMovies(watched.filter(Boolean) as TMDBMovie[]);
        }

        if (userData?.watchLaterItems) {
          const watchLaterPromises = userData.watchLaterItems.map(id => fetchMovieById(parseInt(id)));
          const watchLater = await Promise.all(watchLaterPromises);
          setWatchLaterMovies(watchLater.filter(Boolean) as TMDBMovie[]);
        }

        if (user) {
          const reviews = await getUserReviews(user.uid);
          setUserReviews(reviews);
        }
      } catch (error) {
        console.error('Kullanıcı verileri yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user, userData]);

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await deleteReview(reviewId);
      if (user) {
        const updatedReviews = await getUserReviews(user.uid);
        setUserReviews(updatedReviews);
      }
      toast.success('Yorum silindi');
    } catch (error) {
      console.error('Yorum silinirken hata:', error);
      toast.error('Yorum silinirken hata oluştu');
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 space-y-12 animate-in fade-in duration-700">
      {/* Profil Başlığı */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-muted/30 p-8 md:p-12 border-none">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        
        <div className="relative flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-xl shadow-primary/20">
            <User className="h-12 w-12 md:h-16 md:w-16 text-white" />
          </div>
          <div className="text-center md:text-left space-y-3">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              @{userData?.username || 'kullanici'}
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Katılım: {userData?.createdAt ? new Date(userData.createdAt.toDate()).toLocaleDateString('tr-TR') : 'Yeni'}
              </div>
              <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary border-none px-4">
                {userData?.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="favorites" className="space-y-8">
        <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
          {[
            { id: 'favorites', name: 'Favoriler', icon: Heart, color: 'text-red-500' },
            { id: 'watched', name: 'İzlenenler', icon: Eye, color: 'text-green-500' },
            { id: 'watchlist', name: 'İzlenecekler', icon: Bookmark, color: 'text-blue-500' },
            { id: 'reviews', name: 'Yorumlarım', icon: MessageSquare, color: 'text-purple-500' },
            { id: 'settings', name: 'Profil Düzenle', icon: Settings, color: 'text-orange-500' }
          ].map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id} 
              className="rounded-2xl h-12 px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border-2 border-transparent transition-all hover:bg-muted/50"
            >
              <tab.icon className={cn("h-4 w-4 mr-2", tab.color)} />
              {tab.name}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="favorites" className="space-y-8">
          {loading ? <MovieGridSkeleton count={8} /> : favoriteMovies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
              {favoriteMovies.map((movie, index) => (
                <div key={movie.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms` }}>
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Heart} title="Favori listeniz boş" />
          )}
        </TabsContent>

        <TabsContent value="watched" className="space-y-8">
          {loading ? <MovieGridSkeleton count={8} /> : watchedMovies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
              {watchedMovies.map((movie, index) => (
                <div key={movie.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms` }}>
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Eye} title="İzlenenler listeniz boş" />
          )}
        </TabsContent>

        <TabsContent value="watchlist" className="space-y-8">
          {loading ? <MovieGridSkeleton count={8} /> : watchLaterMovies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
              {watchLaterMovies.map((movie, index) => (
                <div key={movie.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationDelay: `${index * 50}ms` }}>
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Bookmark} title="İzlenecekler listeniz boş" />
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Card key={i} className="h-32 animate-pulse bg-muted/30" />)}
            </div>
          ) : userReviews.length > 0 ? (
            <div className="grid grid-cols-1 gap-6">
              {userReviews.map((review) => (
                <Card key={review.id} className="group rounded-3xl border-none bg-muted/30 p-6 space-y-4 hover:bg-muted/40 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg text-primary">{review.movieTitle}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1 bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded-full font-bold">
                          <Star className="h-3 w-3 fill-current" />
                          {review.rating}/10
                        </div>
                        <span>{formatDate(review.createdAt)}</span>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="rounded-full text-destructive opacity-0 group-hover:opacity-100 transition-all"
                      onClick={() => handleDeleteReview(review.id!)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{review.comment}</p>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState icon={MessageSquare} title="Henüz yorum yapmamışsınız" />
          )}
        </TabsContent>

        <TabsContent value="settings" className="animate-in fade-in slide-in-from-bottom-4">
          <Card className="rounded-[2.5rem] border-none bg-muted/30 p-8 md:p-12">
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Profil Bilgileri</h2>
                <p className="text-muted-foreground text-sm">Görünür isminizi ve kullanıcı adınızı buradan güncelleyebilirsiniz.</p>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Görünür İsim</Label>
                    <Input
                      id="displayName"
                      placeholder="Adınız Soyadınız"
                      value={editForm.displayName}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                      className="rounded-2xl h-14 bg-background/50 border-none focus:ring-2 focus:ring-primary/20 transition-all text-lg px-6"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-bold uppercase tracking-wider text-muted-foreground ml-1">Kullanıcı Adı</Label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-lg">@</span>
                      <Input
                        id="username"
                        placeholder="kullaniciadi"
                        value={editForm.username}
                        onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                        className="rounded-2xl h-14 bg-background/50 border-none focus:ring-2 focus:ring-primary/20 transition-all text-lg pl-12 pr-6"
                        required
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground px-2 italic">Sadece küçük harf ve rakam kullanabilirsiniz.</p>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={updateLoading}
                  className="w-full h-14 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  {updateLoading ? (
                    <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-6 w-6" />
                  )}
                  Değişiklikleri Kaydet
                </Button>
              </form>

              <div className="pt-8">
                <Separator className="bg-primary/5" />
                <div className="mt-8 space-y-4">
                  <h3 className="font-bold text-destructive flex items-center gap-2">
                    Tehlikeli Bölge
                  </h3>
                  <p className="text-xs text-muted-foreground">Hesabınızı silmek kalıcı bir işlemdir ve geri alınamaz. Bu özellik yakında eklenecektir.</p>
                  <Button variant="outline" className="rounded-2xl border-destructive/20 text-destructive hover:bg-destructive/5" disabled>
                    Hesabı Sil
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Separator({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-border", className)} />;
}

function EmptyState({ icon: Icon, title }: { icon: any, title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 bg-muted/30 rounded-[3rem] border-2 border-dashed border-muted-foreground/10">
      <div className="h-24 w-24 rounded-full bg-muted/50 flex items-center justify-center">
        <Icon className="h-10 w-10 text-muted-foreground/20" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-muted-foreground max-w-sm">
          Keşfetmeye başlayarak bu listeyi doldurabilirsiniz.
        </p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth role="approved">
      <ProfilePageContent />
    </RequireAuth>
  );
}