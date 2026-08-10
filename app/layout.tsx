import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Toaster } from '@/components/ui/sonner';
import { Viewport } from 'next';
import CapacitorInit from '@/components/CapacitorInit';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CineMax - Film ve Dizi Keşif Platformu',
  description: 'Modern film ve dizi izleme platformu. Favorilerinizi keşfedin, inceleyin ve paylaşın.',
  keywords: 'film, dizi, inceleme, platform, imdb, izle',
  authors: [{ name: 'CineMax Team' }],
  creator: 'CineMax',
  publisher: 'CineMax',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <AuthProvider>
            <CapacitorInit />
            <div className="min-h-screen bg-background">
              <Header />
              <main className="pb-8">
                {children}
              </main>
              <Toaster 
                position="top-right"
                toastOptions={{
                  duration: 3000,
                }}
              />
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}