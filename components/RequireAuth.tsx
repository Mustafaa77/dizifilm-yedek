'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

type RequiredRole = 'any' | 'pending' | 'approved' | 'admin';

interface RequireAuthProps {
  children: React.ReactNode;
  role?: RequiredRole;
  redirectTo?: string;
}

export function RequireAuth({
  children,
  role = 'approved',
  redirectTo,
}: RequireAuthProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push(redirectTo || '/');
      return;
    }

    if (!userData) return;

    if (userData.status === 'blocked') {
      router.push('/');
      return;
    }

    if (role === 'any') return;

    if (role === 'pending') {
      if (userData.role !== 'pending') {
        router.push('/');
      }
      return;
    }

    if (role === 'admin') {
      if (userData.role !== 'admin') {
        router.push('/');
      }
      return;
    }

    if (role === 'approved') {
      if (userData.role === 'pending') {
        router.push('/pending');
        return;
      }
      if (!['approved', 'admin'].includes(userData.role)) {
        router.push('/');
      }
      return;
    }
  }, [user, userData, loading, role, redirectTo, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!user || !userData) {
    return null;
  }

  return <>{children}</>;
}
