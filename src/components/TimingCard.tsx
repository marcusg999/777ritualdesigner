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
import { getLocationSnapshot, getServerLocation, subscribeLocation } from '@/lib/location';
import { formatTime, HoursFor, LocationControls, MoonGlyph, voidOnDay } from './Sky';

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
        {s.voids.length > 0 && (
          <p className="text-xs text-foreground/60">
            Moon void of course {s.voids.map((v) => voidOnDay(v, s.date)).join(' and ')}
            {s.voidAtWorking
              ? ' — including the usual time for this working, so begin before or after it.'
              : ' — begin the working outside it.'}
          </p>
        )}
        {s.partial && (
          <p className="text-xs text-foreground/50 italic">Closest available — not every condition is met.</p>
        )}
        {planets.length > 0 && hours && <HoursFor hours={hours} planets={planets} voids={s.voids} />}
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
          Lucumí practice times a working by the Orisha&apos;s day; planetary hours and the void-of-course moon
          belong to Western astrology and are not part of the tradition, so neither is given here.
        </p>
      )}

      <p className="text-xs text-foreground/40">
        Moon phases and solstices computed with astronomy-engine for your time zone ({zone}). The moon is judged
        at {plan.timeOfDay ?? '9 pm'} on each day.
        {plan.observesVoidMoon &&
          ' Days when the moon is void of course at that time are passed over, since a working begun then is held not to come to fruition — except fixed holy days, which can’t move.'}
      </p>
    </div>
  );
}
