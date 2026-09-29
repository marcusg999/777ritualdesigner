'use client';

// Sky widgets shared by the Timing card and the Almanac.
import { useState } from 'react';
import type { Planet, PlanetaryHour, VoidOfCourse } from '@/lib/timing';
import { isValidLocation, setLocation, type SavedLocation } from '@/lib/location';

export function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** How a void-of-course period reads on one day: a range, or where it starts or ends. */
export function voidOnDay(v: VoidOfCourse, day: Date): string {
  const starts = sameDay(v.start, day);
  const ends = sameDay(v.end, day);
  if (starts && ends) return `${formatTime(v.start)} – ${formatTime(v.end)}`;
  if (starts) return `from ${formatTime(v.start)}`;
  if (ends) return `until ${formatTime(v.end)}`;
  return 'all day';
}

/** The moon's lit shape for a phase angle (0 new → 180 full), as seen from the north. */
export function MoonGlyph({ angle, size = 22 }: { angle: number; size?: number }) {
  const r = 9;
  const k = Math.cos((angle * Math.PI) / 180);
  const rx = Math.abs(k) * r;
  const waxing = angle < 180;
  const outer = waxing ? 1 : 0;
  const terminator = waxing ? (k > 0 ? 0 : 1) : k > 0 ? 1 : 0;
  const lit = `M12 3 A${r} ${r} 0 0 ${outer} 12 21 A${rx.toFixed(2)} ${r} 0 0 ${terminator} 12 3 Z`;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="12" r={r} fill="color-mix(in srgb, var(--foreground) 10%, transparent)" stroke="var(--tag-border)" />
      <path d={lit} fill="var(--gold)" />
    </svg>
  );
}

export function HoursFor({ hours, planets, voids = [] }: { hours: PlanetaryHour[]; planets: Planet[]; voids?: VoidOfCourse[] }) {
  return (
    <div className="space-y-1">
      {planets.map((planet) => {
        const windows = hours.filter((h) => h.planet === planet);
        return (
          <div key={planet} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-foreground/70">
            <span className="text-gold font-semibold">{planet} hours</span>
            {windows.map((h) => {
              const isVoid = voids.some((v) => v.start < h.end && v.end > h.start);
              return (
                <span key={h.index} className={`whitespace-nowrap ${isVoid ? 'text-foreground/35' : ''}`}>
                  {formatTime(h.start)}–{formatTime(h.end)}
                  {h.night && <span className="text-foreground/40"> (night)</span>}
                  {isVoid && (
                    <abbr title="The moon is void of course during this hour" className="no-underline">
                      {' '}
                      v/c
                    </abbr>
                  )}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function LocationControls({ location }: { location: SavedLocation | null }) {
  const [status, setStatus] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');

  const useDevice = () => {
    if (!('geolocation' in navigator)) {
      setStatus('This browser cannot share a location — enter coordinates instead.');
      return;
    }
    setStatus('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setStatus('');
      },
      () => setStatus('Location unavailable or declined — you can enter coordinates instead.'),
      { timeout: 10000, maximumAge: 24 * 60 * 60 * 1000 }
    );
  };

  const saveManual = () => {
    const la = Number(lat);
    const lo = Number(lon);
    if (lat.trim() === '' || lon.trim() === '' || !isValidLocation(la, lo)) {
      setStatus('Latitude must be between -90 and 90, longitude between -180 and 180.');
      return;
    }
    setLocation({ lat: la, lon: lo });
    setStatus('');
  };

  if (location) {
    return (
      <p className="text-xs text-foreground/50">
        Hours calculated for {location.lat.toFixed(2)}°, {location.lon.toFixed(2)}° from local sunrise and sunset ·{' '}
        <button type="button" onClick={() => setLocation(null)} className="underline hover:text-gold">
          forget location
        </button>
      </p>
    );
  }

  return (
    <div className="notice p-4 space-y-3">
      <p className="notice-text text-sm leading-relaxed">
        Planetary hours are unequal divisions of each day and night, so they depend on your local sunrise and
        sunset. Share an approximate location to see them — it is rounded to about a kilometre and stays in this
        browser.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={useDevice} className="btn-ghost px-4 py-2 text-sm">
          ⌖ Use my location
        </button>
        <details className="text-sm">
          <summary className="cursor-pointer text-foreground/60 hover:text-gold">Enter coordinates</summary>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <input
              aria-label="Latitude"
              inputMode="decimal"
              placeholder="Latitude, e.g. 34.05"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="field px-3 py-2 text-sm w-40"
            />
            <input
              aria-label="Longitude"
              inputMode="decimal"
              placeholder="Longitude, e.g. -118.24"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              className="field px-3 py-2 text-sm w-40"
            />
            <button type="button" onClick={saveManual} className="btn-ghost px-3 py-2 text-sm">
              Save
            </button>
          </div>
        </details>
      </div>
      {status && <p className="text-xs text-foreground/60" role="status">{status}</p>}
    </div>
  );
}
