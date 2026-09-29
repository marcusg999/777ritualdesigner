'use client';

import Link from 'next/link';
import { useMemo, useState, useSyncExternalStore } from 'react';
import {
  monthAlmanac,
  monthName,
  type AlmanacDay,
  type AlmanacEvent,
  type AlmanacEventKind,
  type VoidOfCourse,
} from '@/lib/almanac';
import { WEEKDAYS, localDay, ordinal, planetaryHours, sunSign } from '@/lib/timing';
import { getLocationSnapshot, getServerLocation, subscribeLocation } from '@/lib/location';
import type { Correspondence, Entity } from '@/lib/types';
import ifaData from '@/data/correspondences_ifa_yoruba.json';
import entitiesData from '@/data/entities.json';
import { formatTime, LocationControls, MoonGlyph } from './Sky';

type Category = 'moon' | 'sky' | 'holy';

const CATEGORY: Record<AlmanacEventKind, Category> = {
  phase: 'moon',
  'moon-sign': 'moon',
  void: 'moon',
  season: 'sky',
  'sun-sign': 'sky',
  eclipse: 'sky',
  station: 'sky',
  sabbat: 'holy',
  'holy-day': 'holy',
};

const CATEGORY_COLOR: Record<Category, string> = {
  moon: 'var(--gold)',
  sky: 'var(--amethyst)',
  holy: 'var(--holy)',
};

const CATEGORY_LABEL: Record<Category, string> = {
  moon: 'Moon',
  sky: 'Sun & planets',
  holy: 'Holy days & sabbats',
};

// Orishas honored on each weekday in Lucumí practice, from their records.
const ENTITY_NAMES = new Map((entitiesData as Entity[]).map((e) => [e.id, e.name]));
const ORISHA_WEEKDAYS = (ifaData as Correspondence[])
  .filter((c) => c.eleke && c.day && c.entityId)
  .map((c) => ({ day: c.day!, name: ENTITY_NAMES.get(c.entityId!) ?? c.entityId! }));

const ritualHref = (query: string) => `/?q=${encodeURIComponent(query)}`;

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** A time, prefixed with its weekday when it falls on a different day than `day`. */
function timeOn(t: Date, day: Date) {
  return sameDay(t, day) ? formatTime(t) : `${t.toLocaleDateString(undefined, { weekday: 'short' })} ${formatTime(t)}`;
}

/** How a void-of-course period reads on one day: a range, or where it starts or ends. */
function voidOnDay(v: VoidOfCourse, day: Date) {
  const starts = sameDay(v.start, day);
  const ends = sameDay(v.end, day);
  if (starts && ends) return `${formatTime(v.start)} – ${formatTime(v.end)}`;
  if (starts) return `from ${formatTime(v.start)}`;
  if (ends) return `until ${formatTime(v.end)}`;
  return 'all day';
}

function Dot({ category }: { category: Category }) {
  return <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CATEGORY_COLOR[category] }} />;
}

/** Short cell label: the most notable events first. */
function cellEvents(day: AlmanacDay): AlmanacEvent[] {
  const rank: Record<AlmanacEventKind, number> = {
    eclipse: 0, season: 1, sabbat: 2, phase: 3, station: 4, 'holy-day': 5, 'sun-sign': 6, 'moon-sign': 7, void: 8,
  };
  return [...day.events].sort((a, b) => rank[a.kind] - rank[b.kind]);
}

function DayCell({ day, selected, isToday, onSelect }: { day: AlmanacDay; selected: boolean; isToday: boolean; onSelect: () => void }) {
  const events = cellEvents(day);
  const categories = [...new Set(events.map((e) => CATEGORY[e.kind]))];
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${day.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}: ${day.moon.phaseName}, moon in ${day.moonSign}${events.length ? `, ${events.map((e) => e.title).join(', ')}` : ''}`}
      className="text-left rounded-md p-1.5 sm:p-2 min-h-[4.25rem] sm:min-h-[6.5rem] flex flex-col gap-1 transition-colors"
      style={{
        border: `1px solid ${selected ? 'var(--gold)' : 'var(--card-border)'}`,
        background: selected ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'color-mix(in srgb, var(--surface) 55%, transparent)',
      }}
    >
      <div className="flex items-center justify-between gap-1">
        <span
          className={`text-sm font-display leading-none ${isToday ? 'text-gold font-bold' : 'text-foreground/80'}`}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {day.date.getDate()}
        </span>
        <MoonGlyph angle={day.moon.angle} size={14} />
      </div>
      {/* Phones: one dot per category. Wider screens: the events themselves. */}
      <div className="flex gap-1 sm:hidden">
        {categories.map((c) => (
          <Dot key={c} category={c} />
        ))}
      </div>
      <ul className="hidden sm:block space-y-0.5 list-none">
        {events.slice(0, 3).map((e, i) => (
          <li key={i} className="flex items-center gap-1 min-w-0">
            <Dot category={CATEGORY[e.kind]} />
            <span className="text-[0.68rem] leading-tight text-foreground/70 truncate">{e.title}</span>
          </li>
        ))}
        {events.length > 3 && <li className="text-[0.62rem] text-foreground/40 pl-2.5">+{events.length - 3} more</li>}
      </ul>
    </button>
  );
}

function EventRow({ event, day }: { event: AlmanacEvent; day: Date }) {
  return (
    <li className="py-2.5 flex items-start gap-3" style={{ borderTop: '1px solid var(--hairline)' }}>
      <span className="flex items-center h-5">
        <Dot category={CATEGORY[event.kind]} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/90">
          {event.title}
          {event.time && (
            <span className="text-foreground/50">
              {' · '}
              {formatTime(event.time)}
              {event.end && ` – ${timeOn(event.end, day)}`}
            </span>
          )}
        </p>
        {event.detail && <p className="text-xs text-foreground/55 mt-0.5">{event.detail}</p>}
      </div>
      {event.query && (
        <Link href={ritualHref(event.query)} className="text-xs text-gold hover:underline whitespace-nowrap mt-0.5">
          Open ritual →
        </Link>
      )}
    </li>
  );
}

function DayDetail({ day, today }: { day: AlmanacDay; today: Date }) {
  const location = useSyncExternalStore(subscribeLocation, getLocationSnapshot, getServerLocation);
  const hours = useMemo(
    () => (location ? planetaryHours(day.date, location.lat, location.lon) : undefined),
    [day.date, location]
  );
  const weekday = WEEKDAYS[day.date.getDay()];
  const orishas = ORISHA_WEEKDAYS.filter((o) => o.day === weekday);
  const now = new Date();
  const noon = new Date(day.date.getFullYear(), day.date.getMonth(), day.date.getDate(), 12);

  return (
    <div className="card space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-display text-gold font-semibold">
          {day.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </h3>
        {sameDay(day.date, today) && <span className="eyebrow text-foreground/40">Today</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3">
          <MoonGlyph angle={day.moon.angle} size={34} />
          <div>
            <p className="section-label">Moon</p>
            <p className="text-sm text-foreground/80">
              {day.moon.phaseName} · {Math.round(day.moon.illumination * 100)}% lit
            </p>
            <p className="text-sm text-foreground/80">in {day.moonSign}</p>
            {day.voids.map((v) => (
              <p key={v.start.getTime()} className="text-sm text-foreground/60">
                Void of course {voidOnDay(v, day.date)}
              </p>
            ))}
          </div>
        </div>
        <div>
          <p className="section-label">Day</p>
          <p className="text-sm text-foreground/80">
            {weekday}, ruled by {day.ruler}
          </p>
          <p className="text-sm text-foreground/80">Sun in {sunSign(noon)}</p>
        </div>
        <div>
          <p className="section-label">Lunar month</p>
          <p className="text-sm text-foreground/80">
            {day.lunarDay ? `${ordinal(day.lunarDay)} day (Athenian reckoning)` : '—'}
          </p>
          <p className="text-sm text-foreground/80">
            {day.retrograde.length > 0 ? `Retrograde: ${day.retrograde.join(', ')}` : 'No planet retrograde'}
          </p>
        </div>
      </div>

      {day.events.length > 0 ? (
        <ul className="list-none">
          {day.events.map((e, i) => (
            <EventRow key={i} event={e} day={day.date} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-foreground/50 italic">No phase, ingress, station or holy day falls on this day.</p>
      )}

      {orishas.length > 0 && (
        <div>
          <p className="section-label mb-1.5">Honored on {weekday}s (Lucumí)</p>
          <div className="flex flex-wrap gap-1.5">
            {orishas.map((o) => (
              <Link key={o.name} href={ritualHref(o.name)} className="tag hover:text-gold">
                {o.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="section-label">Planetary hours</p>
        {hours && (
          <ol className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 list-none">
            {hours.map((h) => {
              const current = now >= h.start && now < h.end;
              const isVoid = day.voids.some((v) => v.start < h.end && v.end > h.start);
              return (
                <li
                  key={h.index}
                  className={`text-xs flex justify-between gap-2 ${current ? 'text-gold font-semibold' : 'text-foreground/70'}`}
                >
                  <span>
                    {h.planet}
                    {h.night ? ' ☾' : ''}
                    {isVoid && (
                      <abbr title="The moon is void of course during this hour" className="text-foreground/40 no-underline">
                        {' '}
                        v/c
                      </abbr>
                    )}
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(h.start)}</span>
                </li>
              );
            })}
          </ol>
        )}
        {hours === null && (
          <p className="text-xs text-foreground/50 italic">The sun doesn&apos;t both rise and set here on this day.</p>
        )}
        <LocationControls location={location} />
      </div>
    </div>
  );
}

export default function AlmanacView() {
  const [today] = useState(() => localDay(new Date()));
  const [cursor, setCursor] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
  const [selected, setSelected] = useState<Date>(today);

  const days = useMemo(() => monthAlmanac(cursor.year, cursor.month), [cursor]);
  const selectedDay = days.find((d) => sameDay(d.date, selected)) ?? days[0];
  const leading = days[0].date.getDay();

  const go = (delta: number) => {
    const d = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(d);
  };
  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelected(today);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => go(-1)} className="btn-ghost px-3 py-1.5" aria-label="Previous month">
            ‹
          </button>
          <h2 className="text-2xl font-display text-gold font-semibold min-w-[11rem] text-center">
            {monthName(cursor.month)} {cursor.year}
          </h2>
          <button type="button" onClick={() => go(1)} className="btn-ghost px-3 py-1.5" aria-label="Next month">
            ›
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
            <span key={c} className="flex items-center gap-1.5 text-xs text-foreground/60">
              <Dot category={c} /> {CATEGORY_LABEL[c]}
            </span>
          ))}
          <button type="button" onClick={goToday} className="btn-ghost px-3 py-1.5 text-sm">
            Today
          </button>
        </div>
      </div>

      <div>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5">
          {WEEKDAYS.map((w) => (
            <div key={w} className="eyebrow text-foreground/40 text-center">
              <span className="sm:hidden">{w.slice(0, 1)}</span>
              <span className="hidden sm:inline">{w.slice(0, 3)}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {Array.from({ length: leading }, (_, i) => (
            <div key={`blank-${i}`} aria-hidden="true" />
          ))}
          {days.map((day) => (
            <DayCell
              key={day.date.getTime()}
              day={day}
              selected={sameDay(day.date, selectedDay.date)}
              isToday={sameDay(day.date, today)}
              onSelect={() => setSelected(day.date)}
            />
          ))}
        </div>
      </div>

      <DayDetail day={selectedDay} today={today} />

      <div className="text-xs text-foreground/45 space-y-1.5 leading-relaxed">
        <p>
          Times are in your time zone ({Intl.DateTimeFormat().resolvedOptions().timeZone}); the moon&apos;s phase and
          sign are shown as at 9 pm. Computed with astronomy-engine.
        </p>
        <p>
          Sabbat names follow the Northern Hemisphere Wheel of the Year — south of the equator they are traditionally
          reversed. Solar eclipses are visible only along their path.
        </p>
        <p>
          The moon is void of course (v/c) from its last major aspect in a sign — a conjunction, sextile, square, trine
          or opposition to the Sun or a planet, Mercury through Pluto — until it enters the next sign. Tradition holds
          it a poor time to begin new workings; it suits rest, reflection and finishing what is already under way.
          Traditional astrologers count the seven classical planets only, so their void periods can start earlier.
        </p>
        <p>
          Greek holy days follow the Athenian lunar month, counted from the noumenia (the day after the new moon).
          Hindu festivals such as Diwali, Navaratri and Maha Shivaratri follow the lunisolar Panchang and aren&apos;t
          shown yet.
        </p>
      </div>
    </div>
  );
}
