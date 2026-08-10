'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, User, LogOut, Heart, Eye, MessageSquare, Film, Moon, Sun, Shield } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { LoginForm } from './LoginForm';
import { SearchPreview } from './SearchPreview';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

export function Header() {
  const { user, logout, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowPreview(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Role-based navigation after login - sadece gerekli durumlarda yönlendir
  useEffect(() => {
    if (loading) return;
    
    if (user && userData) {
      // Blocked kullanıcıları çıkış yaptır
      if (userData.status === 'blocked') {
        logout();
        return;
      }
      
      // Pending kullanıcıları sadece ana sayfadayken pending'e yönlendir
      if (userData.role === 'pending' && pathname === '/') {
        router.push('/pending');
      }
      
      // Onaylanan kullanıcı pending sayfasındaysa anasayfaya yönlendir (live refresh ile)
      if ((userData.role === 'approved' || userData.role === 'admin') && pathname === '/pending') {
        toast.success('Hesabınız onaylandı! Hoş geldiniz 🎉');
        router.push('/');
      }
    }
  }, [user, userData, loading, pathname, router, logout]);

  // Arama sayfasında arama çubuğunu gizle
  const showSearchBar = pathname !== '/search';

  // Sorgu uzunluğuna göre önizleme görünürlüğü
  useEffect(() => {
    const open = searchQuery.trim().length > 2;
    setShowPreview(open);
  }, [searchQuery]);

  // Route değişiminde kapat
  useEffect(() => {
    setShowPreview(false);
  }, [pathname]);

  // Dış tıklamada kapat
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (previewRef.current && !previewRef.current.contains(target) && inputRef.current && !inputRef.current.contains(target)) {
        setShowPreview(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 pt-[env(safe-area-inset-top)]">
      <div className="container flex h-16 items-center justify-between gap-4 px-4">
        {/* Logo */}
        <Link href="/" className="group flex items-center space-x-2 transition-transform hover:scale-105 active:scale-95">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
            <Film className="h-6 w-6 text-primary transition-transform group-hover:rotate-12" />
          </div>
          <span className="hidden text-2xl font-bold tracking-tight sm:inline-block">
            <span className="text-gradient">CineMax</span>
          </span>
        </Link>

        {/* Arama - sadece arama sayfası dışında göster */}
        {showSearchBar && (
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4 md:mx-8">
            <div className="group relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input
                type="text"
                placeholder="Film ve dizi ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowPreview(false);
                }}
                onBlur={() => {
                  setTimeout(() => setShowPreview(false), 120);
                }}
                ref={inputRef}
                className="h-10 w-full rounded-full bg-muted/50 pl-10 pr-4 transition-all focus:bg-background focus:ring-2 focus:ring-primary/20 md:w-[300px] lg:w-[400px]"
              />
              
              {/* Anlık arama önizlemesi */}
              {showPreview && (
                <div ref={previewRef} className="absolute top-full left-0 right-0 mt-2 max-h-96 overflow-y-auto rounded-2xl border bg-background/95 p-2 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
                  <SearchPreview query={searchQuery} onSelect={() => setShowPreview(false)} />
                </div>
              )}
            </div>
          </form>
        )}

        {/* Navigasyon */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Tema değiştirici */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full transition-colors hover:bg-primary/10"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 transition-all hover:rotate-45" />
              ) : (
                <Moon className="h-5 w-5 transition-all hover:-rotate-12" />
              )}
              <span className="sr-only">Tema değiştir</span>
            </Button>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 ring-offset-background transition-all hover:ring-2 hover:ring-primary hover:ring-offset-2">
                  <Avatar className="h-10 w-10 border-2 border-transparent">
                    <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'Kullanıcı'} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-2xl p-2" align="end" sideOffset={8}>
                <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-medium leading-none">{user.displayName || 'Kullanıcı'}</p>
                    <p className="text-xs leading-none text-muted-foreground">@{userData?.username || 'kullanici'}</p>
                  </div>
                </div>
                <div className="h-px bg-border my-1" />
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link href="/favorites" className="flex items-center">
                    <Heart className="mr-2 h-4 w-4" />
                    <span>Favoriler</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link href="/watchlist" className="flex items-center">
                    <Eye className="mr-2 h-4 w-4" />
                    <span>İzleme Listesi</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-xl cursor-pointer">
                  <Link href="/reviews" className="flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Yorumlarım</span>
                  </Link>
                </DropdownMenuItem>
                {userData?.role === 'admin' && (
                  <>
                    <div className="h-px bg-border my-1" />
                    <DropdownMenuItem asChild className="rounded-xl cursor-pointer text-primary focus:text-primary">
                      <Link href="/admin" className="flex items-center">
                        <Shield className="mr-2 h-4 w-4" />
                        <span>Admin Paneli</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <div className="h-px bg-border my-1" />
                <DropdownMenuItem onClick={handleLogout} className="rounded-xl cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Çıkış Yap</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Dialog open={showLogin} onOpenChange={setShowLogin}>
              <DialogTrigger asChild>
                <Button className="rounded-full px-6 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                  Giriş Yap
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-3xl overflow-hidden border-none p-0">
                <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-8">
                  <DialogHeader className="mb-4">
                    <DialogTitle className="text-2xl font-bold text-center">Hoş Geldiniz</DialogTitle>
                  </DialogHeader>
                  <LoginForm onClose={() => setShowLogin(false)} />
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </header>
  );
}
