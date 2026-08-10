'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, MessageSquare, Settings, Shield, Trash2, Edit, UserCheck, UserX, Crown, Film, Plus } from 'lucide-react';
import { updateUserRole, updateUserStatus, deleteUser, getUserReviews, deleteReview, UserData, Review, getAllMovies, addMovie, deleteMovie, Movie } from '@/lib/firestore';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatDate } from '@/lib/firestore';
import { RequireAuth } from '@/components/RequireAuth';

 function AdminPageInner() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [userFilter, setUserFilter] = useState('all');
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    adminUsers: 0,
    totalReviews: 0,
    totalMovies: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddMovie, setShowAddMovie] = useState(false);
  const [newMovie, setNewMovie] = useState({
    movieId: '',
    title: '',
    year: new Date().getFullYear(),
    imdbRating: 0,
    description: '',
    trailerUrl: '',
    posterUrl: '',
    category: 'movie' as 'movie' | 'tv',
    episodes: undefined as number | undefined,
    genres: '' // Virgülle ayrılmış string olarak
  });
  
  // Kullanıcı filtreleme
  useEffect(() => {
    console.log("Filtreleme çalıştı, filtre:", userFilter);
    if (userFilter === 'all') {
      setFilteredUsers(users);
    } else if (userFilter === 'pending') {
      const pendingUsers = users.filter(user => user.status === 'pending');
      console.log("Onay bekleyen kullanıcılar:", pendingUsers.length);
      setFilteredUsers(pendingUsers);
    } else {
      setFilteredUsers(users.filter(user => user.role === userFilter));
    }
  }, [userFilter, users]);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }

    // Eğer userData henüz yüklenmediyse bekle
    if (userData === undefined || userData === null) {
      return;
    }

    // Artık userData var, role kontrolü yapılabilir
    if (userData.role !== "admin") {
      router.push("/");
      return;
    }

    // Admin kullanıcısı olduğu doğrulandı, verileri yükle
    loadAdminData();
    
    // Onay bekleyen kullanıcıları otomatik olarak göster
    if (stats.pendingUsers > 0) {
      setUserFilter('pending');
    }
  }, [user, userData, router]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // Admin yetkisi kontrolü
      if (!user || !userData || userData.role !== 'admin') {
        console.error("Admin yetkisi yok");
        toast.error("Bu sayfaya erişim için admin yetkisi gerekiyor");
        router.push('/');
        return;
      }
      
      // Firebase bağlantı hatalarını yakalamak için timeout ekle
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Firebase veri yükleme zaman aşımı')), 15000)
      );

      // Doğrudan Firestore'a erişim kullanarak kullanıcı verilerini yükle
      const usersData: UserData[] = await Promise.race([
        import('firebase/firestore').then(async ({ collection, getDocs, query, where, getFirestore }) => {
          const db = getFirestore();
          const usersRef = collection(db, 'users');
          const querySnapshot = await getDocs(usersRef);
          return querySnapshot.docs.map(doc => ({ ...doc.data(), userId: doc.id })) as UserData[];
        }) as Promise<UserData[]>,
        timeoutPromise as Promise<UserData[]>
      ]).catch(err => {
        console.error('Kullanıcılar alınırken hata:', err.message);
        toast.error('Kullanıcı verileri yüklenirken bir sorun oluştu. Lütfen sayfayı yenileyin.');
        return [] as UserData[];
      });
      setUsers(usersData || []);
      
      // Onay bekleyen kullanıcıları otomatik filtrele
      const pendingUsers = usersData.filter(user => user.status === 'pending');
      if (pendingUsers.length > 0) {
        setUserFilter('pending');
        setFilteredUsers(pendingUsers);
      } else {
        setFilteredUsers(usersData);
      }
      
      // İstatistikleri doğrudan hesapla
      try {
        // Kullanıcı verilerinden istatistikleri hesapla
        const statsData = {
          totalUsers: usersData.length,
          activeUsers: usersData.filter(u => u.status === 'active').length,
          pendingUsers: usersData.filter(u => u.status === 'pending').length,
          adminUsers: usersData.filter(u => u.role === 'admin').length,
          totalReviews: 0,
          totalMovies: 0
        };
        
        // Film sayısını doğrudan Firestore'dan al
        const moviesCount = await import('firebase/firestore').then(async ({ collection, getDocs, getFirestore }) => {
          const db = getFirestore();
          const moviesRef = collection(db, 'movies');
          const querySnapshot = await getDocs(moviesRef);
          return querySnapshot.size;
        }).catch(() => 0);
        
        statsData.totalMovies = moviesCount;
        setStats(statsData);
      } catch (error) {
        console.error('İstatistikler hesaplanırken hata:', error);
        setStats({
          totalUsers: usersData.length,
          activeUsers: usersData.filter(u => u.status === 'active').length,
          pendingUsers: usersData.filter(u => u.status === 'pending').length,
          adminUsers: usersData.filter(u => u.role === 'admin').length,
          totalReviews: 0,
          totalMovies: 0
        });
      }
      
      // Filmleri doğrudan Firestore'dan yükle
      try {
        const moviesData = await import('firebase/firestore').then(async ({ collection, getDocs, getFirestore }) => {
          const db = getFirestore();
          const moviesRef = collection(db, 'movies');
          const querySnapshot = await getDocs(moviesRef);
          return querySnapshot.docs.map(doc => ({ ...doc.data(), movieId: doc.id })) as Movie[];
        });
        setMovies(moviesData || []);
      } catch (error) {
        console.error('Filmler alınırken hata:', error);
        toast.error('Film verileri yüklenirken bir sorun oluştu');
        setMovies([]);
      }
      
      // Tüm yorumları yükle
      if (usersData.length > 0) {
        try {
          const reviewPromises = usersData.map(user => getUserReviews(user.userId).catch(() => []));
          const allUserReviews = await Promise.all(reviewPromises);
          const flatReviews = allUserReviews.flat();
          setAllReviews(flatReviews);
        } catch (reviewError) {
          console.error('Yorumlar yüklenirken hata:', reviewError);
          setAllReviews([]);
        }
      }
    } catch (error) {
      console.error('Admin verileri yüklenirken hata:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'pending' | 'approved' | 'admin') => {
    try {
      await updateUserRole(userId, newRole);
      if (newRole === 'approved') {
        await sendApprovalEmail(userId);
      }
      await loadAdminData();
      toast.success('Kullanıcı rolü güncellendi');
    } catch (error) {
      console.error('Rol güncellenirken hata:', error);
      toast.error('Rol güncellenirken hata oluştu');
    }
  };

  const sendApprovalEmail = async (userId: string) => {
    try {
      const u = users.find((x) => x.userId === userId);
      if (!u || !u.email) return;
      await fetch('/api-server/send-approval-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: u.userId,
          email: u.email,
          displayName: u.displayName,
          username: u.username,
        }),
      }).catch((e) => console.warn('Onay emaili gönderim isteği başarısız:', e));
    } catch (e) {
      console.warn('Onay emaili gönderim hatası:', e);
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: 'approved',
        status: 'active',
        updatedAt: serverTimestamp()
      });
      console.log("Kullanıcı onaylandı:", userId);
      toast.success("Kullanıcı onaylandı");
      await sendApprovalEmail(userId);
      await loadAdminData();
    } catch (error) {
      console.error("Kullanıcı onaylanamadı:", error);
      toast.error("Kullanıcı onaylanamadı: " + (error as Error).message);
    }
  };
  
  const handleRejectUser = async (userId: string) => {
    try {
      // Doğrudan Firestore'a erişim
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: 'pending',
        status: 'blocked',
        updatedAt: serverTimestamp()
      });
      console.log("Kullanıcı reddedildi:", userId);
      toast.success("Kullanıcı reddedildi");
      await loadAdminData();
    } catch (error) {
      console.error("Kullanıcı reddedilemedi:", error);
      toast.error("Kullanıcı reddedilemedi: " + (error as Error).message);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'blocked') => {
    try {
      // Admin yetkisi ile işlem yapıldığından emin ol
      if (!user || !userData || userData.role !== 'admin') {
        toast.error("Bu işlem için admin yetkisi gerekiyor");
        return;
      }

      await updateUserStatus(userId, newStatus);
      await loadAdminData();
      
      console.log(`Kullanıcı durumu güncellendi: ${userId}, yeni durum: ${newStatus}`);
      toast.success(`Kullanıcı ${newStatus === 'active' ? 'aktif edildi' : 'engellendi'}`);
    } catch (error) {
      console.error('Durum güncellenirken hata:', error);
      toast.error(`Durum güncellenirken hata oluştu: ${(error as Error).message}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      try {
        await deleteUser(userId);
        await loadAdminData();
        toast.success('Kullanıcı silindi');
      } catch (error) {
        console.error('Kullanıcı silinirken hata:', error);
        toast.error('Kullanıcı silinirken hata oluştu');
      }
    }
  };

  const handleQuickApprove = async (userId: string) => {
    try {
      if (!user || !userData || userData.role !== 'admin') {
        toast.error("Bu işlem için admin yetkisi gerekiyor");
        return;
      }
      await updateUserRole(userId, 'approved');
      await updateUserStatus(userId, 'active');
      await sendApprovalEmail(userId);
      await loadAdminData();
      toast.success('Kullanıcı başarıyla onaylandı');
    } catch (error) {
      console.error('Onaylama hatası:', error);
      toast.error('Onaylama sırasında hata oluştu');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (confirm('Bu yorumu silmek istediğinizden emin misiniz?')) {
      try {
        await deleteReview(reviewId);
        await loadAdminData();
        toast.success('Yorum silindi');
      } catch (error) {
        console.error('Yorum silinirken hata:', error);
        toast.error('Yorum silinirken hata oluştu');
      }
    }
  };

  const handleAddMovie = async () => {
    try {
      const genresArray = newMovie.genres
        .split(',')
        .map(genre => genre.trim())
        .filter(genre => genre.length > 0);

      await addMovie({
        ...newMovie,
        movieId: Date.now().toString(),
        genres: genresArray,
        episodes: newMovie.category === 'tv' ? newMovie.episodes : undefined
      });
      await loadAdminData();
      setShowAddMovie(false);
      setNewMovie({
        movieId: '',
        title: '',
        year: new Date().getFullYear(),
        imdbRating: 0,
        description: '',
        trailerUrl: '',
        posterUrl: '',
        category: 'movie',
        episodes: undefined,
        genres: ''
      });
      toast.success('Film/Dizi eklendi');
    } catch (error) {
      console.error('Film eklenirken hata:', error);
      toast.error('Film eklenirken hata oluştu');
    }
  };

  const handleDeleteMovie = async (movieId: string) => {
    if (confirm('Bu film/diziyi silmek istediğinizden emin misiniz?')) {
      try {
        await deleteMovie(movieId);
        await loadAdminData();
        toast.success('Film/Dizi silindi');
      } catch (error) {
        console.error('Film silinirken hata:', error);
        toast.error('Film silinirken hata oluştu');
      }
    }
  };
  if (!user || userData?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Bu sayfaya erişim yetkiniz yok. Sadece admin kullanıcıları bu paneli görüntüleyebilir.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">CineMax yönetim paneli</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Crown className="h-4 w-4 mr-2" />
          Admin
        </Badge>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Kullanıcı</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeUsers}</div>
          </CardContent>
        </Card>

        <Card className={stats.pendingUsers > 0 ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-700" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${stats.pendingUsers > 0 ? "text-yellow-700 dark:text-yellow-400" : ""}`}>
              Onay Bekleyen
            </CardTitle>
            <UserX className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingUsers}</div>
              {stats.pendingUsers > 0 && (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="ml-2 text-yellow-600 p-0 h-auto"
                  onClick={() => setUserFilter('pending')}
                >
                  Görüntüle
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Sayısı</CardTitle>
            <Crown className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.adminUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Yorum</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalReviews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Film/Dizi</CardTitle>
            <Film className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.totalMovies}</div>
          </CardContent>
        </Card>
      </div>

      {/* Ana İçerik */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Kullanıcı Yönetimi
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Yorum Yönetimi
          </TabsTrigger>
          <TabsTrigger value="movies" className="flex items-center gap-2">
            <Film className="h-4 w-4" />
            Film/Dizi Yönetimi
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Ayarlar
          </TabsTrigger>
        </TabsList>

        {/* Kullanıcı Yönetimi */}
        <TabsContent value="users">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Kullanıcı Listesi
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="px-3 py-1">
                  <UserX className="h-4 w-4 mr-1" />
                  Onay Bekleyen: {users.filter(u => u.role === 'pending').length}
                </Badge>
                <Select 
                  defaultValue="all" 
                  onValueChange={(value) => setUserFilter(value)}
                  value={userFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrele" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tüm Kullanıcılar</SelectItem>
                    <SelectItem value="pending">Onay Bekleyenler</SelectItem>
                    <SelectItem value="approved">Onaylı Kullanıcılar</SelectItem>
                    <SelectItem value="admin">Adminler</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {users.filter(u => u.role === 'pending').length > 0 && (
                <Alert className="mb-4 bg-yellow-50 border-yellow-200">
                  <AlertDescription className="flex items-center text-yellow-800">
                    <UserX className="h-4 w-4 mr-2 text-yellow-600" />
                    <span className="font-medium">Dikkat:</span> {users.filter(u => u.role === 'pending').length} kullanıcı onay bekliyor. Lütfen en kısa sürede onaylayın veya reddedin.
                  </AlertDescription>
                </Alert>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kullanıcı</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Kayıt Tarihi</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell>
                          <div>
                            <div className="font-medium">@{user.username}</div>
                            <div className="text-sm text-muted-foreground">{user.displayName}</div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value: 'pending' | 'approved' | 'admin') => 
                              handleRoleChange(user.userId, value)
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">
                                <Badge variant="secondary">Beklemede</Badge>
                              </SelectItem>
                              <SelectItem value="approved">
                                <Badge variant="default">Onaylı</Badge>
                              </SelectItem>
                              <SelectItem value="admin">
                                <Badge variant="destructive">Admin</Badge>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                            {user.status === 'active' ? 'Aktif' : 'Engelli'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.createdAt ? formatDate(user.createdAt) : 'Bilinmiyor'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.role === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleRoleChange(user.userId, 'approved')}
                                >
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Onayla
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    handleRoleChange(user.userId, 'pending');
                                    handleStatusChange(user.userId, 'blocked');
                                  }}
                                >
                                  <UserX className="h-3 w-3 mr-1" />
                                  Reddet
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusChange(
                                user.userId, 
                                user.status === 'active' ? 'blocked' : 'active'
                              )}
                            >
                              {user.status === 'active' ? (
                                <UserX className="h-3 w-3" />
                              ) : (
                                <UserCheck className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(user.userId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Yorum Yönetimi */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Yorum Listesi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allReviews.length > 0 ? (
                  allReviews.map((review) => (
                    <Card key={review.id} className="bg-muted/50">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">{review.movieTitle || 'Film/Dizi'}</Badge>
                            <span className="font-semibold">{review.userName}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-1">
                              {Array.from({ length: review.rating }).map((_, i) => (
                                <span key={i} className="text-yellow-500">★</span>
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(review.createdAt)}
                            </span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteReview(review.id!)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-muted-foreground">{review.comment}</p>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Henüz yorum yok</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Film/Dizi Yönetimi */}
        <TabsContent value="movies">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Film className="h-5 w-5" />
                  Film/Dizi Listesi
                </CardTitle>
                <Dialog open={showAddMovie} onOpenChange={setShowAddMovie}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Film/Dizi Ekle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl rounded-[2.5rem] border-none bg-background p-8">
                    <DialogHeader className="mb-6">
                      <DialogTitle className="text-2xl font-bold">Yeni Film/Dizi Ekle</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Başlık</Label>
                        <Input
                          id="title"
                          value={newMovie.title}
                          onChange={(e) => setNewMovie({ ...newMovie, title: e.target.value })}
                          className="rounded-2xl h-12 bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all px-4"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="year" className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Yıl</Label>
                        <Input
                          id="year"
                          type="number"
                          value={newMovie.year}
                          onChange={(e) => setNewMovie({ ...newMovie, year: parseInt(e.target.value) })}
                          className="rounded-2xl h-12 bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all px-4"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="imdbRating" className="ml-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">IMDb Puanı</Label>
                        <Input
                          id="imdbRating"
                          type="number"
                          step="0.1"
                          max="10"
                          value={newMovie.imdbRating}
                          onChange={(e) => setNewMovie({ ...newMovie, imdbRating: parseFloat(e.target.value) })}
                          className="rounded-2xl h-12 bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all px-4"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Kategori</Label>
                        <Select
                          value={newMovie.category}
                          onValueChange={(value: 'movie' | 'tv') => setNewMovie({ ...newMovie, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="movie">Film</SelectItem>
                            <SelectItem value="tv">Dizi</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="description">Açıklama</Label>
                        <Input
                          id="description"
                          value={newMovie.description}
                          onChange={(e) => setNewMovie({ ...newMovie, description: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="genres">Türler (virgülle ayırın)</Label>
                        <Input
                          id="genres"
                          placeholder="aksiyon, komedi, dram"
                          value={newMovie.genres}
                          onChange={(e) => setNewMovie({ ...newMovie, genres: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="trailerUrl">Fragman URL</Label>
                        <Input
                          id="trailerUrl"
                          value={newMovie.trailerUrl}
                          onChange={(e) => setNewMovie({ ...newMovie, trailerUrl: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="posterUrl">Poster URL</Label>
                        <Input
                          id="posterUrl"
                          value={newMovie.posterUrl}
                          onChange={(e) => setNewMovie({ ...newMovie, posterUrl: e.target.value })}
                        />
                      </div>
                      {newMovie.category === 'tv' && (
                        <div className="space-y-2">
                          <Label htmlFor="episodes">Bölüm Sayısı</Label>
                          <Input
                            id="episodes"
                            type="number"
                            value={newMovie.episodes || ''}
                            onChange={(e) => setNewMovie({ ...newMovie, episodes: e.target.value ? parseInt(e.target.value) : undefined })}
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end space-x-2 mt-4">
                      <Button variant="outline" onClick={() => setShowAddMovie(false)}>
                        İptal
                      </Button>
                      <Button onClick={handleAddMovie}>
                        Ekle
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Başlık</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Yıl</TableHead>
                      <TableHead>IMDb</TableHead>
                      <TableHead>Türler</TableHead>
                      <TableHead>Bölüm</TableHead>
                      <TableHead>Eklenme Tarihi</TableHead>
                      <TableHead>İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movies.map((movie) => (
                      <TableRow key={movie.id}>
                        <TableCell className="font-medium">{movie.title}</TableCell>
                        <TableCell>
                          <Badge variant={movie.category === 'movie' ? 'default' : 'secondary'}>
                            {movie.category === 'movie' ? 'Film' : 'Dizi'}
                          </Badge>
                        </TableCell>
                        <TableCell>{movie.year}</TableCell>
                        <TableCell>{movie.imdbRating}/10</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {movie.genres?.slice(0, 2).map((genre, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {genre}
                              </Badge>
                            ))}
                            {movie.genres && movie.genres.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{movie.genres.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {movie.category === 'tv' && movie.episodes ? `${movie.episodes} bölüm` : '-'}
                        </TableCell>
                        <TableCell>{formatDate(movie.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteMovie(movie.id!)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Ayarlar */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Sistem Ayarları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Sistem ayarları yakında eklenecek. Şu anda temel kullanıcı ve yorum yönetimi aktif.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth role="admin">
      <AdminPageInner />
    </RequireAuth>
  );
}