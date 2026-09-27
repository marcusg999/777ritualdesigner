'use client';

import dynamic from 'next/dynamic';

// Everything below depends on today's date and the viewer's time zone, so it
// renders on the client only (a static build would freeze the build date).
const AlmanacView = dynamic(() => import('@/components/AlmanacView'), {
  ssr: false,
  loading: () => <div className="card min-h-[24rem] animate-pulse" aria-label="Loading the almanac" />,
});

export default function AlmanacPage() {
  return (
    <div className="space-y-8">
      <header className="pt-4">
        <p className="eyebrow text-gold/60">Moon · Sky · Holy Days</p>
        <h1 className="display-title text-4xl sm:text-5xl mt-3">
          <span className="gilt">The Almanac</span>
        </h1>
        <p className="text-foreground/55 mt-3 text-lg max-w-2xl">
          The month&apos;s moon and sky, the Wheel of the Year, and the holy days of the traditions — each linked to
          its ritual.
        </p>
      </header>
      <AlmanacView />
    </div>
  );
}
