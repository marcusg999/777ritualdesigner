'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import type { Correspondence } from '@/lib/types';
import {
  moonInfo,
  parseTiming,
  planetaryHours,
  sunSign,
  suggestDates,
  type DateSuggestion,
  type Planet,
  type PlanetaryHour,
} from '@/lib/timing';
import {
  getLocationSnapshot,
  getServerLocation,
  isValidLocation,
  setLocation,
  subscribeLocation,
  type SavedLocation,
} from '@/lib/location';

interface TimingCardProps {
  correspondences: Correspondence;
}

const TIME_OF_DAY_NOTE = {
  dawn: 'Traditionally begun at dawn.',
  noon: 'Traditionally performed at noon, with the sun at its height.',
  midnight: 'Traditionally performed at midnight.',
};

function formatDay(d: Date, now: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** The moon's lit shape for a phase angle (0 new → 180 full), as seen from the north. */
function MoonGlyph({ angle, size = 22 }: { angle: number; size?: number }) {
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

function HoursFor({ hours, planets }: { hours: PlanetaryHour[]; planets: Planet[] }) {
  return (
    <div className="space-y-1">
      {planets.map((planet) => {
        const windows = hours.filter((h) => h.planet === planet);
        return (
          <div key={planet} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-foreground/70">
            <span className="text-gold font-semibold">{planet} hours</span>
            {windows.map((h) => (
              <span key={h.index} className="whitespace-nowrap">
                {formatTime(h.start)}–{formatTime(h.end)}
                {h.night && <span className="text-foreground/40"> (night)</span>}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function LocationControls({ location }: { location: SavedLocation | null }) {
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

function Suggestion({
  s,
  now,
  hours,
  planets,
}: {
  s: DateSuggestion;
  now: Date;
  hours: PlanetaryHour[] | null | undefined;
  planets: Planet[];
}) {
  return (
    <li className="py-4 flex gap-4" style={{ borderTop: '1px solid var(--hairline)' }}>
      <div className="w-14 shrink-0 text-center">
        <p className="eyebrow text-foreground/50">{s.date.toLocaleDateString(undefined, { month: 'short' })}</p>
        <p className="text-3xl font-display text-gold font-bold leading-none mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {s.date.getDate()}
        </p>
      </div>
      <div className="flex-1 min-w-0 space-y-2">
        <p className="text-sm text-foreground/90 font-semibold">{formatDay(s.date, now)}</p>
        {s.reasons.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {s.reasons.map((r) => (
              <span key={r} className="tag">{r}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-foreground/60">
          <MoonGlyph angle={s.moon.angle} size={18} />
          <span>
            {s.moon.phaseName} · {Math.round(s.moon.illumination * 100)}% lit
            {s.exactPhase && <> · exact {s.exactPhase.name.toLowerCase()} at {formatTime(s.exactPhase.time)}</>}
            {s.exactEvent && <> · {s.exactEvent.name.toLowerCase()} at {formatTime(s.exactEvent.time)}</>}
          </span>
        </div>
        {s.partial && (
          <p className="text-xs text-foreground/50 italic">Closest available — not every condition is met.</p>
        )}
        {planets.length > 0 && hours && <HoursFor hours={hours} planets={planets} />}
        {planets.length > 0 && hours === null && (
          <p className="text-xs text-foreground/50 italic">
            The sun doesn&apos;t both rise and set here that day, so there are no planetary hours.
          </p>
        )}
      </div>
    </li>
  );
}

export default function TimingCard({ correspondences: c }: TimingCardProps) {
  const [now] = useState(() => new Date());
  const location = useSyncExternalStore(subscribeLocation, getLocationSnapshot, getServerLocation);

  const plan = useMemo(() => parseTiming(c), [c]);
  const suggestions = useMemo(() => suggestDates(plan, now), [plan, now]);
  const tonight = useMemo(() => moonInfo(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21)), [now]);

  const hoursByDay = useMemo(() => {
    if (!location || plan.hourPlanets.length === 0) return undefined;
    return suggestions.map((s) => planetaryHours(s.date, location.lat, location.lon));
  }, [location, plan.hourPlanets, suggestions]);

  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-display text-gold font-semibold">Timing</h3>
        <span className="eyebrow text-foreground/40 text-right">Next favorable dates</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2.5">
          <MoonGlyph angle={tonight.angle} size={30} />
          <div>
            <p className="section-label">Tonight</p>
            <p className="text-sm text-foreground/80">
              {tonight.phaseName} · {Math.round(tonight.illumination * 100)}% lit · Sun in {sunSign(now)}
            </p>
          </div>
        </div>
        <p className="text-sm text-foreground/55 italic flex-1 min-w-[12rem]">&ldquo;{c.timing}&rdquo;</p>
      </div>

      {suggestions.length > 0 ? (
        <ol className="list-none">
          {suggestions.map((s, i) => (
            <Suggestion key={s.date.getTime()} s={s} now={now} hours={hoursByDay?.[i]} planets={plan.hourPlanets} />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-foreground/60">No date in the next six months meets these conditions.</p>
      )}

      {plan.timeOfDay && <p className="text-sm text-foreground/60">{TIME_OF_DAY_NOTE[plan.timeOfDay]}</p>}

      {plan.hourPlanets.length > 0 && <LocationControls location={location} />}

      {c.eleke && (
        <p className="text-xs text-foreground/50 italic leading-relaxed">
          Lucumí practice times a working by the Orisha&apos;s day; planetary hours are a Western ceremonial
          practice and are not part of the tradition, so none are given here.
        </p>
      )}

      <p className="text-xs text-foreground/40">
        Moon phases and solstices computed with astronomy-engine for your time zone ({zone}). The moon is judged
        at {plan.timeOfDay ?? '9 pm'} on each day.
      </p>
    </div>
  );
}
