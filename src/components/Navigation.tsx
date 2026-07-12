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
    <nav
      className="sticky top-0 z-50 border-b"
      style={{
        background: 'var(--nav-bg)',
        borderColor: 'var(--card-border)',
        backdropFilter: 'blur(22px) saturate(120%)',
        WebkitBackdropFilter: 'blur(22px) saturate(120%)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="flex items-center gap-2.5 group min-w-0"
          aria-label="777 Ritual Designer — home"
        >
          <span className="text-gold text-xl leading-none transition-transform group-hover:rotate-90 duration-500">
            ✦
          </span>
          <span className="flex flex-col leading-none min-w-0">
            <span className="font-display text-gold font-semibold tracking-[0.14em] text-[0.95rem] sm:text-base truncate">
              777 RITUAL
            </span>
            <span className="eyebrow text-foreground/40 mt-0.5 truncate">
              The Physics of HipHop
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? 'text-gold'
                    : 'text-foreground/55 hover:text-foreground'
                }`}
                style={
                  active
                    ? { background: 'color-mix(in srgb, var(--gold) 12%, transparent)' }
                    : undefined
                }
              >
                {link.label}
              </Link>
            );
          })}
          <div className="ml-1.5">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
