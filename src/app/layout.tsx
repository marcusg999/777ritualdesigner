import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import Navigation from '@/components/Navigation';
import ConstellationBackground from '@/components/ConstellationBackground';
import './globals.css';

export const metadata: Metadata = {
  title: '777 Ritual Designer',
  description: 'Design rituals and explore occult correspondences',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '777✦',
  },
};

export const viewport: Viewport = {
  themeColor: '#c9a84c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="min-h-screen text-foreground antialiased">
        <ConstellationBackground />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <div className="relative" style={{ zIndex: 1 }}>
            <Navigation />
            <main className="max-w-6xl mx-auto px-4 py-8">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
