'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ThemeToggle from './ThemeToggle';

const navLinks = [
  { href: '/', label: 'Generator' },
  { href: '/library', label: 'Library' },
  { href: '/saved', label: 'Saved' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gold/20 bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-gold font-serif text-xl font-bold tracking-wide hover:opacity-80 transition-opacity">
          <span className="text-2xl">✦</span>
          <span>The Physics of HipHop Ritual Designer</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-gold/20 text-gold'
                  : 'text-foreground/70 hover:text-foreground hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="ml-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
