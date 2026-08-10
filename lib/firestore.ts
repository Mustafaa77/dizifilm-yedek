import { db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, where, getDocs, orderBy, deleteDoc, serverTimestamp } from 'firebase/firestore';

export interface UserData {
  userId: string;
  username: string; // Zorunlu: Kullanıcı adı
  email?: string;
  displayName?: string;
  role: 'pending' | 'approved' | 'admin';
  status: 'active' | 'blocked' | 'pending';
  favoriteItems: string[];
  watchedItems: string[];
  watchLaterItems: string[]; // Yeni: İzlenecek listesi
  createdAt?: Date;
  lastLoginAt?: Date;
  avatarUrl?: string;
}

export interface Review {
  id?: string;
  imdbId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  spoiler?: boolean;
  movieTitle: string;
  createdAt: Date;
}

export interface Movie {
  id?: string;
  movieId: string;
  title: string;
  year: number;
  imdbRating: number;
  description: string;
  trailerUrl: string;
  posterUrl: string;
  category: 'movie' | 'tv';
  createdAt: Date;
  episodes?: number; // Diziler için
  genres: string[]; // Etiketler için
}

export interface WatchParty {
  id?: string;
  partyId: string;
  movieId: string;
  hostId: string;
  participants: string[];
  createdAt: Date;
  messages: WatchPartyMessage[];
  isActive: boolean;
}

export interface WatchPartyMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}
// Kullanıcı verilerini al
export async function getUserData(userId: string): Promise<UserData | null> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return userDoc.data() as UserData;
    }
    return null;
  } catch (error) {
    console.error('Kullanıcı verileri alınırken hata:', error);
    if (error instanceof Error && error.message.includes('permission')) {
      console.warn('Firestore izin hatası - kullanıcı verisi oluşturuluyor');
      return null;
    }
    return null;
  }
}

// Kullanıcı verilerini oluştur/güncelle
export async function createOrUpdateUser(userData: Partial<UserData>): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userData.userId!);
    const existingUser = await getDoc(userDocRef);
    
    if (existingUser.exists()) {
      await updateDoc(userDocRef, {
        ...userData,
        lastLoginAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      await setDoc(userDocRef, {
        favoriteItems: [],
        watchedItems: [],
        watchLaterItems: [], // Yeni alan
        role: 'pending', // Yeni kullanıcılar pending olarak başlar
        status: 'active',
        username: userData.username || ('user' + Date.now().toString().slice(-6)),
        createdAt: new Date(),
        lastLoginAt: new Date(),
        ...userData
      });
    }
  } catch (error) {
    console.error('Kullanıcı verileri kaydedilirken hata:', error);
    if (error instanceof Error && error.message.includes('permission')) {
      console.warn('Firestore izin hatası - kullanıcı verisi kaydedilemedi');
    }
  }
}

// Favorilere ekle/çıkar
export async function toggleFavorite(userId: string, imdbId: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userData = await getUserData(userId);
    
    if (userData?.favoriteItems.includes(imdbId)) {
      await updateDoc(userDocRef, {
        favoriteItems: arrayRemove(imdbId)
      });
    } else {
      await updateDoc(userDocRef, {
        favoriteItems: arrayUnion(imdbId)
      });
    }
  } catch (error) {
    console.error('Favori güncellenirken hata:', error);
    throw error;
  }
}

// İzleme listesine ekle/çıkar
export async function toggleWatched(userId: string, imdbId: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userData = await getUserData(userId);
    
    if (userData?.watchedItems.includes(imdbId)) {
      await updateDoc(userDocRef, {
        watchedItems: arrayRemove(imdbId)
      });
    } else {
      await updateDoc(userDocRef, {
        watchedItems: arrayUnion(imdbId)
      });
    }
  } catch (error) {
    console.error('İzleme listesi güncellenirken hata:', error);
    throw error;
  }
}

// İzlenecek listesine ekle/çıkar (Yeni)
export async function toggleWatchLater(userId: string, imdbId: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userData = await getUserData(userId);
    
    if (userData?.watchLaterItems?.includes(imdbId)) {
      await updateDoc(userDocRef, {
        watchLaterItems: arrayRemove(imdbId)
      });
    } else {
      await updateDoc(userDocRef, {
        watchLaterItems: arrayUnion(imdbId)
      });
    }
  } catch (error) {
    console.error('İzlenecek listesi güncellenirken hata:', error);
    throw error;
  }
}

// Yorum ekle
export async function addReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<void> {
  try {
    const reviewsCollection = collection(db, 'reviews');
    await addDoc(reviewsCollection, {
      ...review,
      spoiler: !!review.spoiler,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Yorum eklenirken hata:', error);
    throw error;
  }
}

// Yorum sil
export async function deleteReview(reviewId: string): Promise<void> {
  try {
    const reviewDocRef = doc(db, 'reviews', reviewId);
    await deleteDoc(reviewDocRef);
  } catch (error) {
    console.error('Yorum silinirken hata:', error);
    throw error;
  }
}

// Film/dizi yorumlarını al
export async function getReviews(imdbId: string): Promise<Review[]> {
  try {
    const reviewsCollection = collection(db, 'reviews');
    const q = query(reviewsCollection, where('imdbId', '==', imdbId));
    
    const querySnapshot = await getDocs(q);
    const reviews = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Review[];
    
    return reviews.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    console.error('Yorumlar alınırken hata:', error);
    return [];
  }
}

// Kullanıcı profilini güncelle
export async function updateUserProfile(userId: string, data: Partial<UserData>): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      ...data,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Profil güncellenirken hata:', error);
    throw error;
  }
}

// Tarih formatını düzelt
export function formatDate(date: any): string {
  try {
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (date && typeof date === 'object' && date.seconds) {
      // Firestore Timestamp
      dateObj = new Date(date.seconds * 1000);
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      return 'Geçersiz tarih';
    }
    
    if (isNaN(dateObj.getTime())) {
      return 'Geçersiz tarih';
    }
    
    return dateObj.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('Tarih formatlanırken hata:', error);
    return 'Geçersiz tarih';
  }
}
// Kullanıcının yorumlarını al
export async function getUserReviews(userId: string): Promise<Review[]> {
  try {
    const reviewsCollection = collection(db, 'reviews');
    const q = query(reviewsCollection, where('userId', '==', userId));
    
    const querySnapshot = await getDocs(q);
    const reviews = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Review[];
    
    return reviews.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  } catch (error) {
    console.error('Kullanıcı yorumları alınırken hata:', error);
    return [];
  }
}

// Admin işlemleri
export async function getAllUsers(): Promise<UserData[]> {
  try {
    const usersCollection = collection(db, 'users');
    const q = query(usersCollection, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(doc => ({
      userId: doc.id,
      ...doc.data()
    })) as UserData[];
    
    return users;
  } catch (error) {
    console.error('Kullanıcılar alınırken hata:', error);
    return [];
  }
}

export async function updateUserRole(userId: string, role: 'pending' | 'approved' | 'admin'): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      role: role,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Kullanıcı rolü güncellenirken hata:', error);
    throw error;
  }
}

export async function updateUserStatus(userId: string, status: 'active' | 'blocked' | 'pending'): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      status: status,
      updatedAt: serverTimestamp()
    });
    console.log(`Kullanıcı durumu güncellendi: ${userId}, yeni durum: ${status}`);
  } catch (error) {
    console.error('Kullanıcı durumu güncellenirken hata:', error);
    throw error;
  }
}

export async function deleteUser(userId: string): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
  } catch (error) {
    console.error('Kullanıcı silinirken hata:', error);
    throw error;
  }
}

// Film/Dizi işlemleri
export async function addMovie(movie: Omit<Movie, 'id' | 'createdAt'>): Promise<void> {
  try {
    const moviesCollection = collection(db, 'movies');
    await addDoc(moviesCollection, {
      ...movie,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Film eklenirken hata:', error);
    throw error;
  }
}

export async function getAllMovies(): Promise<Movie[]> {
  try {
    const moviesCollection = collection(db, 'movies');
    const q = query(moviesCollection, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const movies = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Movie[];
    
    return movies;
  } catch (error) {
    console.error('Filmler alınırken hata:', error);
    return [];
  }
}

export async function updateMovie(movieId: string, movieData: Partial<Movie>): Promise<void> {
  try {
    const movieDocRef = doc(db, 'movies', movieId);
    await updateDoc(movieDocRef, {
      ...movieData,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Film güncellenirken hata:', error);
    throw error;
  }
}

export async function deleteMovie(movieId: string): Promise<void> {
  try {
    const movieDocRef = doc(db, 'movies', movieId);
    await deleteDoc(movieDocRef);
  } catch (error) {
    console.error('Film silinirken hata:', error);
    throw error;
  }
}

// Watch Party işlemleri
export async function createWatchParty(party: Omit<WatchParty, 'id' | 'createdAt' | 'messages'>): Promise<string> {
  try {
    const partiesCollection = collection(db, 'watchparties');
    const docRef = await addDoc(partiesCollection, {
      ...party,
      messages: [],
      createdAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Watch Party oluşturulurken hata:', error);
    throw error;
  }
}

export async function joinWatchParty(partyId: string, userId: string): Promise<void> {
  try {
    const partyDocRef = doc(db, 'watchparties', partyId);
    await updateDoc(partyDocRef, {
      participants: arrayUnion(userId)
    });
  } catch (error) {
    console.error('Watch Party\'ye katılırken hata:', error);
    throw error;
  }
}

export async function leaveWatchParty(partyId: string, userId: string): Promise<void> {
  try {
    const partyDocRef = doc(db, 'watchparties', partyId);
    await updateDoc(partyDocRef, {
      participants: arrayRemove(userId)
    });
  } catch (error) {
    console.error('Watch Party\'den ayrılırken hata:', error);
    throw error;
  }
}

export async function addWatchPartyMessage(partyId: string, message: WatchPartyMessage): Promise<void> {
  try {
    const partyDocRef = doc(db, 'watchparties', partyId);
    await updateDoc(partyDocRef, {
      messages: arrayUnion(message)
    });
  } catch (error) {
    console.error('Watch Party mesajı eklenirken hata:', error);
    throw error;
  }
}
// İstatistikler
export async function getStats() {
  try {
    const usersCollection = collection(db, 'users');
    const reviewsCollection = collection(db, 'reviews');
    const moviesCollection = collection(db, 'movies');
    
    const [usersSnapshot, reviewsSnapshot, moviesSnapshot] = await Promise.all([
      getDocs(usersCollection),
      getDocs(reviewsCollection),
      getDocs(moviesCollection)
    ]);
    
    const users = usersSnapshot.docs.map(doc => doc.data() as UserData);
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.status === 'active').length;
    const pendingUsers = users.filter(user => user.role === 'pending').length;
    const adminUsers = users.filter(user => user.role === 'admin').length;
    
    return {
      totalUsers,
      activeUsers,
      pendingUsers,
      adminUsers,
      totalReviews: reviewsSnapshot.size,
      totalMovies: moviesSnapshot.size
    };
  } catch (error) {
    console.error('İstatistikler alınırken hata:', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      pendingUsers: 0,
      adminUsers: 0,
      totalReviews: 0,
      totalMovies: 0
    };
  }
}
