'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

// True only after hydration, without a setState-in-effect re-render.
const noopSubscribe = () => () => {};

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  if (!mounted) return <div className="w-9 h-9" />;

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to daylight' : 'Switch to night'}
      title={isDark ? 'Daylight' : 'Night sky'}
      className="w-9 h-9 flex items-center justify-center rounded-full text-gold transition-colors hover:bg-[color-mix(in_srgb,var(--gold)_12%,transparent)]"
      style={{ border: '1px solid var(--card-border)' }}
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-[1.15rem] h-[1.15rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-[1.15rem] h-[1.15rem]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
