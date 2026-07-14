import type { Metadata, Viewport } from 'next';
import { Cinzel, Cormorant_Garamond, JetBrains_Mono } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import Navigation from '@/components/Navigation';
import ConstellationBackground from '@/components/ConstellationBackground';
import './globals.css';

// Display: inscriptional Roman capitals — the temple / talisman voice.
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

// Body: a high-contrast literary serif — the grimoire voice.
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  display: 'swap',
});

// Utility: a technical monospace — the star-chart annotation voice.
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

// Empty for local/Netlify (served at root), '/777ritualdesigner' on Pages.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const metadata: Metadata = {
  title: '777 Ritual Designer',
  description: 'Design rituals and explore occult correspondences across world traditions',
  manifest: `${basePath}/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '777✦',
  },
};

export const viewport: Viewport = {
  themeColor: '#08060f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cinzel.variable} ${cormorant.variable} ${jetbrains.variable}`}
    >
      <head>
        <link rel="apple-touch-icon" href={`${basePath}/icons/icon-192.png`} />
      </head>
      <body className="min-h-screen text-foreground antialiased">
        <ConstellationBackground />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <div className="relative" style={{ zIndex: 1 }}>
            <Navigation />
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
              {children}
            </main>
            <footer className="max-w-6xl mx-auto px-4 sm:px-6 pb-12 pt-4">
              <div className="rule" />
              <p className="eyebrow text-foreground/35 pt-5 text-center">
                The Physics of HipHop · Symbolic inspiration, not prescription
              </p>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
