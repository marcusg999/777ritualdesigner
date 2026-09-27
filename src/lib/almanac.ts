/**
 * The Almanac: everything notable about each day of a month — the moon's
 * phase and sign, the sun's ingresses and the Wheel of the Year, eclipses,
 * planetary stations and retrogrades, and holy days drawn from the app's own
 * correspondence records.
 *
 * Astronomy comes from astronomy-engine. Days are the viewer's local calendar
 * days; every exact event carries its instant so the UI can show local times.
 */
import {
  Body,
  Ecliptic,
  EclipticGeoMoon,
  GeoVector,
  NextGlobalSolarEclipse,
  NextLunarEclipse,
  SearchGlobalSolarEclipse,
  SearchLunarEclipse,
  SearchSunLongitude,
  Seasons,
  SunPosition,
} from 'astronomy-engine';
import type { Correspondence, Entity } from './types';
import {
  DAY_RULER,
  SIGNS,
  addDays,
  localDay,
  lunarDay,
  moonInfo,
  moonQuarters,
  newMoons,
  ordinal,
  type MoonInfo,
  type Planet,
} from './timing';
import correspondencesData from '@/data/correspondences.json';
import ifaData from '@/data/correspondences_ifa_yoruba.json';
import worldData from '@/data/correspondences_world.json';
import hiphopData from '@/data/correspondences_hiphop.json';
import entitiesData from '@/data/entities.json';

export type AlmanacEventKind = 'phase' | 'moon-sign' | 'season' | 'sabbat' | 'sun-sign' | 'eclipse' | 'station' | 'holy-day';

export interface AlmanacEvent {
  kind: AlmanacEventKind;
  title: string;
  detail?: string;
  /** The exact instant, when the event has one. */
  time?: Date;
  /** A generator query that opens the matching ritual. */
  query?: string;
}

export interface AlmanacDay {
  date: Date;
  /** Day of the lunar month (noumenia = 1), for the Athenian holy days. */
  lunarDay?: number;
  /** The moon as it stands at 9 pm local time. */
  moon: MoonInfo;
  moonSign: string;
  ruler: Planet;
  /** Classical planets appearing to move backwards on this day. */
  retrograde: Planet[];
  events: AlmanacEvent[];
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const HOUR = 3_600_000;

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const signOf = (longitude: number) => SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)];

// ─── Moon ───────────────────────────────────────────────────────────────────

export function moonSign(at: Date): string {
  return signOf(EclipticGeoMoon(at).lon);
}

/** Every instant the moon changes sign in [from, to), to the minute. */
export function moonIngresses(from: Date, to: Date): Array<{ sign: string; time: Date }> {
  const out: Array<{ sign: string; time: Date }> = [];
  const step = 2 * HOUR; // the moon spends ~2.3 days in each sign
  let t = from.getTime();
  let sign = moonSign(from);
  while (t < to.getTime()) {
    const next = t + step;
    const nextSign = moonSign(new Date(next));
    if (nextSign !== sign) {
      let lo = t;
      let hi = next;
      while (hi - lo > 60_000) {
        const mid = (lo + hi) / 2;
        if (moonSign(new Date(mid)) === sign) lo = mid;
        else hi = mid;
      }
      if (hi >= from.getTime() && hi < to.getTime()) out.push({ sign: nextSign, time: new Date(hi) });
      sign = nextSign;
    }
    t = next;
  }
  return out;
}

// ─── Sun and the Wheel of the Year ──────────────────────────────────────────

const SEASONS: Array<{ key: 'mar_equinox' | 'jun_solstice' | 'sep_equinox' | 'dec_solstice'; name: string; sabbat: string; query: string }> = [
  { key: 'mar_equinox', name: 'Spring equinox', sabbat: 'Ostara', query: 'rebirth' },
  { key: 'jun_solstice', name: 'Summer solstice', sabbat: 'Litha', query: 'summer solstice' },
  { key: 'sep_equinox', name: 'Autumn equinox', sabbat: 'Mabon', query: 'elemental balance' },
  { key: 'dec_solstice', name: 'Winter solstice', sabbat: 'Yule', query: 'winter solstice' },
];

/** The cross-quarter sabbats, on their traditional fixed dates. */
const CROSS_QUARTERS = [
  { month: 1, day: 1, sabbat: 'Imbolc', detail: 'Feast of Brigid', query: 'Brigid' },
  { month: 4, day: 1, sabbat: 'Beltane', detail: 'Cross-quarter day', query: 'beltane' },
  { month: 7, day: 1, sabbat: 'Lughnasadh', detail: 'Feast of Lugh', query: 'Lugh' },
  { month: 9, day: 31, sabbat: 'Samhain', detail: 'Cross-quarter day', query: 'samhain' },
];

/** Sun sign ingresses in [from, to); the four quarter ingresses are the seasons. */
export function sunIngresses(from: Date, to: Date): Array<{ sign: string; time: Date }> {
  const out: Array<{ sign: string; time: Date }> = [];
  let start = from;
  for (let guard = 0; guard < 3; guard++) {
    const target = (Math.floor(SunPosition(start).elon / 30) + 1) * 30;
    const t = SearchSunLongitude(target % 360, start, 40);
    if (!t || t.date >= to) break;
    out.push({ sign: signOf(target), time: t.date });
    start = new Date(t.date.getTime() + HOUR);
  }
  return out;
}

// ─── Planets ────────────────────────────────────────────────────────────────

const PLANETS: Array<{ planet: Planet; body: Body }> = [
  { planet: 'Mercury', body: Body.Mercury },
  { planet: 'Venus', body: Body.Venus },
  { planet: 'Mars', body: Body.Mars },
  { planet: 'Jupiter', body: Body.Jupiter },
  { planet: 'Saturn', body: Body.Saturn },
];

/** Apparent geocentric motion in ecliptic longitude over a day centred on t (degrees; negative = retrograde). */
function dailyMotion(body: Body, t: number): number {
  const lon = (ms: number) => Ecliptic(GeoVector(body, new Date(ms), true)).elon;
  let d = lon(t + 12 * HOUR) - lon(t - 12 * HOUR);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** Stations (turning retrograde or direct) in [from, to), to within the hour. */
export function planetaryStations(from: Date, to: Date): Array<{ planet: Planet; direction: 'retrograde' | 'direct'; time: Date }> {
  const out: Array<{ planet: Planet; direction: 'retrograde' | 'direct'; time: Date }> = [];
  for (const { planet, body } of PLANETS) {
    let t = from.getTime() - 24 * HOUR;
    let motion = dailyMotion(body, t);
    while (t < to.getTime()) {
      const next = t + 24 * HOUR;
      const nextMotion = dailyMotion(body, next);
      if (Math.sign(nextMotion) !== Math.sign(motion) && nextMotion !== 0) {
        let lo = t;
        let hi = next;
        while (hi - lo > HOUR) {
          const mid = (lo + hi) / 2;
          if (Math.sign(dailyMotion(body, mid)) === Math.sign(motion)) lo = mid;
          else hi = mid;
        }
        if (hi >= from.getTime() && hi < to.getTime()) {
          out.push({ planet, direction: nextMotion < 0 ? 'retrograde' : 'direct', time: new Date(hi) });
        }
      }
      t = next;
      motion = nextMotion;
    }
  }
  return out;
}

export function retrogradePlanets(at: Date): Planet[] {
  return PLANETS.filter(({ body }) => dailyMotion(body, at.getTime()) < 0).map(({ planet }) => planet);
}

// ─── Eclipses ───────────────────────────────────────────────────────────────

export function eclipses(from: Date, to: Date): Array<{ type: 'lunar' | 'solar'; kind: string; time: Date }> {
  const out: Array<{ type: 'lunar' | 'solar'; kind: string; time: Date }> = [];
  for (let e = SearchLunarEclipse(from); e.peak.date < to; e = NextLunarEclipse(e.peak)) {
    out.push({ type: 'lunar', kind: e.kind, time: e.peak.date });
  }
  for (let e = SearchGlobalSolarEclipse(from); e.peak.date < to; e = NextGlobalSolarEclipse(e.peak)) {
    out.push({ type: 'solar', kind: e.kind, time: e.peak.date });
  }
  return out;
}

// ─── Holy days from the correspondence records ─────────────────────────────

export interface HolyDay {
  entityId: string;
  name: string;
  label: string;
  /** A yearly date (month is 0-based)… */
  month?: number;
  day?: number;
  /** …or a day of every calendar month… */
  monthly?: number;
  /** …or a day of every lunar month, counted from the noumenia. */
  lunar?: number;
}

const MONTH_RE = MONTH_NAMES.join('|');

function extractHolyDays(): HolyDay[] {
  const names = new Map((entitiesData as Entity[]).map((e) => [e.id, e.name]));
  const records = [
    ...(correspondencesData as Correspondence[]),
    ...(ifaData as Correspondence[]),
    ...(worldData as Correspondence[]),
    ...(hiphopData as Correspondence[]),
  ].filter((c) => c.entityId && names.has(c.entityId));

  const out: HolyDay[] = [];
  const seen = new Set<string>();
  const add = (h: HolyDay) => {
    const key = `${h.entityId}|${h.month ?? ''}|${h.day ?? ''}|${h.monthly ?? ''}|${h.lunar ?? ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(h);
    }
  };

  for (const c of records) {
    const entityId = c.entityId!;
    const name = names.get(entityId)!;
    // Feast days: "June 29 (Saint Peter)", "February 2 (Candelaria) · October 15 (Saint Teresa)"
    for (const m of (c.feastDay ?? '').matchAll(new RegExp(`(${MONTH_RE})\\s+(\\d{1,2})(?:\\s*\\(([^)]+)\\))?`, 'g'))) {
      add({ entityId, name, month: MONTH_NAMES.indexOf(m[1]), day: Number(m[2]), label: m[3] ? `Feast of ${m[3]}` : 'Feast day' });
    }
    // A date-bound timing ("February 1, Imbolc") on a figure's own record.
    const fixed = c.timing.match(new RegExp(`^(${MONTH_RE})\\s+(\\d{1,2}),\\s*([^(,]+)`));
    if (fixed) {
      add({ entityId, name, month: MONTH_NAMES.indexOf(fixed[1]), day: Number(fixed[2]), label: fixed[3].trim() });
    }
    // Days of every month ("the 17th of each month", "the 4th of each month was his birthday").
    for (const m of c.timing.matchAll(/\b(\d{1,2})(?:st|nd|rd|th) of (?:each|every) month\b/gi)) {
      add({ entityId, name, monthly: Number(m[1]), label: 'Monthly holy day' });
    }
    // Days of every lunar month ("the 4th day of each lunar month" — the Athenian calendar).
    for (const m of c.timing.matchAll(/\b(\d{1,2})(?:st|nd|rd|th) day of (?:each|every) lunar month\b/gi)) {
      add({ entityId, name, lunar: Number(m[1]), label: `${ordinal(Number(m[1]))} day of the lunar month` });
    }
  }
  return out;
}

export const HOLY_DAYS: HolyDay[] = extractHolyDays();

// ─── The month ──────────────────────────────────────────────────────────────

const ECLIPSE_LABEL: Record<string, string> = {
  penumbral: 'Penumbral',
  partial: 'Partial',
  annular: 'Annular',
  total: 'Total',
};

export function monthAlmanac(year: number, month: number): AlmanacDay[] {
  const first = new Date(year, month, 1);
  const next = new Date(year, month + 1, 1);
  const days: AlmanacDay[] = [];
  const byKey = new Map<string, AlmanacDay>();

  for (let d = first; d < next; d = addDays(d, 1)) {
    const evening = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 21);
    const noon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
    const day: AlmanacDay = {
      date: localDay(d),
      moon: moonInfo(evening),
      moonSign: moonSign(evening),
      ruler: DAY_RULER[d.getDay()],
      retrograde: retrogradePlanets(noon),
      events: [],
    };
    days.push(day);
    byKey.set(dayKey(d), day);
  }
  const push = (at: Date, event: AlmanacEvent) => byKey.get(dayKey(at))?.events.push(event);

  for (const q of moonQuarters(first, next)) {
    push(q.time, { kind: 'phase', title: q.name, time: q.time });
  }
  for (const ing of moonIngresses(first, next)) {
    push(ing.time, { kind: 'moon-sign', title: `Moon enters ${ing.sign}`, time: ing.time });
  }

  const seasons = Seasons(year);
  const seasonTimes = new Set<number>();
  for (const s of SEASONS) {
    const time = seasons[s.key].date;
    if (time >= first && time < next) {
      seasonTimes.add(Math.round(time.getTime() / 60_000));
      push(time, { kind: 'season', title: `${s.name} · ${s.sabbat}`, time, query: s.query });
    }
  }
  for (const ing of sunIngresses(first, next)) {
    // A quarter ingress is already shown as its season.
    if (seasonTimes.has(Math.round(ing.time.getTime() / 60_000))) continue;
    push(ing.time, { kind: 'sun-sign', title: `Sun enters ${ing.sign}`, time: ing.time });
  }
  for (const cq of CROSS_QUARTERS) {
    if (cq.month === month) {
      push(new Date(year, month, cq.day), { kind: 'sabbat', title: cq.sabbat, detail: cq.detail, query: cq.query });
    }
  }

  for (const e of eclipses(addDays(first, -1), next)) {
    push(e.time, {
      kind: 'eclipse',
      title: `${ECLIPSE_LABEL[e.kind] ?? e.kind} ${e.type} eclipse`,
      detail: e.type === 'solar' ? 'Visible only along its path — check a local eclipse map' : 'Visible wherever the moon is up',
      time: e.time,
    });
  }
  for (const s of planetaryStations(first, next)) {
    push(s.time, {
      kind: 'station',
      title: `${s.planet} stations ${s.direction}`,
      detail: s.direction === 'retrograde' ? `${s.planet} appears to move backwards` : `${s.planet} resumes forward motion`,
      time: s.time,
    });
  }

  const moonsForLunarDays = newMoons(addDays(first, -32), next);
  for (const day of days) {
    const lunar = lunarDay(day.date, moonsForLunarDays);
    day.lunarDay = lunar;
    for (const h of HOLY_DAYS) {
      const yearly = h.month === month && h.day === day.date.getDate();
      const monthly = h.monthly === day.date.getDate();
      const lunarHit = h.lunar !== undefined && h.lunar === lunar;
      if (yearly || monthly || lunarHit) {
        day.events.push({ kind: 'holy-day', title: h.name, detail: h.label, query: h.name });
      }
    }
    day.events.sort((a, b) => (a.time?.getTime() ?? Infinity) - (b.time?.getTime() ?? Infinity));
  }
  return days;
}

export function monthName(month: number): string {
  return MONTH_NAMES[month];
}
