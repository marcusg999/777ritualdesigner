/**
 * Hindu festivals from the lunisolar Panchang.
 *
 * A tithi is a lunar day: each 12° the Moon gains on the Sun. Lunar months run
 * new moon to new moon (amanta) and take their names from the sidereal
 * sankranti — the Sun's entry into a sign — that falls within them; a month
 * with none is adhika (a leap month) and holds no festivals. A festival falls
 * on the day its tithi is in force at its prescribed time: Diwali in the
 * evening twilight (Pradosh), Maha Shivaratri at midnight (Nishita), Ganesh
 * Chaturthi at midday (Madhyahna), and so on.
 *
 * Days run sunrise to sunrise at the viewer's location, as a local panchang
 * reckons them; without one, sunrise and sunset are taken as 6 am and 6 pm.
 */
import { Body, MoonPhase, Observer, SearchMoonPhase, SearchRiseSet, SunPosition } from 'astronomy-engine';
import { addDays, localDay } from './timing';

export interface Place {
  lat: number;
  lon: number;
}

const HOUR = 3_600_000;
const MINUTE = 60_000;
const DAY = 24 * HOUR;

// ─── Tithis ─────────────────────────────────────────────────────────────────

const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami',
  'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
];

/** The tithi (1–30) in force at an instant: 1–15 the waxing (Shukla) half, 16–30 the waning (Krishna). */
export function tithiAt(t: Date): number {
  return Math.floor(MoonPhase(t) / 12) + 1;
}

export function tithiName(tithi: number): string {
  if (tithi === 15) return 'Purnima';
  if (tithi === 30) return 'Amavasya';
  return `${tithi < 15 ? 'Shukla' : 'Krishna'} ${TITHI_NAMES[(tithi - 1) % 15]}`;
}

/** When the given tithi of the lunar month beginning at `newMoon` starts and ends. */
function tithiSpan(newMoon: Date, tithi: number): { start: number; end: number } {
  const start = tithi === 1 ? newMoon : SearchMoonPhase((tithi - 1) * 12, newMoon, 32)!.date;
  const end = SearchMoonPhase((tithi * 12) % 360, start, 3)!.date;
  return { start: start.getTime(), end: end.getTime() };
}

// ─── Lunar months ───────────────────────────────────────────────────────────

/** Amanta month names, indexed by the sidereal sign whose sankranti falls in them (Mesha → Chaitra). */
export const LUNAR_MONTHS = [
  'Chaitra', 'Vaishakha', 'Jyeshtha', 'Ashadha', 'Shravana', 'Bhadrapada',
  'Ashvin', 'Kartika', 'Margashirsha', 'Pausha', 'Magha', 'Phalguna',
];

/** Lahiri (Chitrapaksha) ayanamsa in degrees: 23°51′25.5″ at J2000, precessing 50.29″ a year. */
function ayanamsa(t: Date): number {
  const years = (t.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * DAY);
  return 23.857092 + (50.2878 / 3600) * years;
}

function siderealSign(t: Date): number {
  const lon = SunPosition(t).elon - ayanamsa(t);
  return Math.floor((((lon % 360) + 360) % 360) / 30);
}

export interface LunarMonth {
  /** Index into LUNAR_MONTHS. */
  month: number;
  adhika: boolean;
  newMoon: Date;
  next: Date;
}

/** The lunar months overlapping [from, to). */
export function lunarMonths(from: Date, to: Date): LunarMonth[] {
  const moons: Date[] = [];
  let t = SearchMoonPhase(0, new Date(from.getTime() - 31 * DAY), 32)!.date;
  while (t < to) {
    moons.push(t);
    t = SearchMoonPhase(0, new Date(t.getTime() + DAY), 32)!.date;
  }
  moons.push(t);
  const out: LunarMonth[] = [];
  for (let i = 0; i + 1 < moons.length; i++) {
    if (moons[i + 1] <= from) continue;
    const a = siderealSign(moons[i]);
    const b = siderealSign(moons[i + 1]);
    // No sankranti in the month: a leap month, named for the month it precedes.
    const adhika = a === b;
    out.push({ month: adhika ? (b + 1) % 12 : b, adhika, newMoon: moons[i], next: moons[i + 1] });
  }
  return out;
}

// ─── Days and their divisions ───────────────────────────────────────────────

interface HinduDay {
  /** Local midnight of the calendar day. */
  date: Date;
  rise: number;
  set: number;
  nextRise: number;
  observer?: Observer;
}

function hinduDay(date: Date, place?: Place | null): HinduDay {
  const day = localDay(date);
  if (place) {
    // Anchored, like planetary hours, to the place's own solar midnight.
    const observer = new Observer(place.lat, place.lon, 0);
    const midnight = new Date(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) - (place.lon / 15) * HOUR);
    const rise = SearchRiseSet(Body.Sun, observer, +1, midnight, 1);
    const set = rise && SearchRiseSet(Body.Sun, observer, -1, rise.date, 1);
    const next = set && SearchRiseSet(Body.Sun, observer, +1, set.date, 2);
    if (rise && set && next) {
      return { date: day, rise: rise.date.getTime(), set: set.date.getTime(), nextRise: next.date.getTime(), observer };
    }
  }
  const at = (h: number, d = day) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h).getTime();
  return { date: day, rise: at(6), set: at(18), nextRise: at(6, addDays(day, 1)) };
}

/** Sunrise for the day at the place (6 am without one) — when a day's tithi is read. */
export function sunriseOn(date: Date, place?: Place | null): Date {
  return new Date(hinduDay(date, place).rise);
}

type Kaal = 'morning' | 'purvahna' | 'madhyahna' | 'aparahna' | 'pradosh' | 'nishita' | 'moonrise';

/** The window of the day in which a festival's tithi must be in force. */
function kaalWindow(d: HinduDay, kaal: Kaal): { start: number; end: number } {
  const day = d.set - d.rise;
  const night = d.nextRise - d.set;
  switch (kaal) {
    // The first third of the day, when Ghatasthapana is performed.
    case 'morning':
      return { start: d.rise, end: d.rise + day / 3 };
    case 'purvahna':
      return { start: d.rise, end: d.rise + day / 2 };
    // The third and fourth of the day's five parts.
    case 'madhyahna':
      return { start: d.rise + (2 * day) / 5, end: d.rise + (3 * day) / 5 };
    case 'aparahna':
      return { start: d.rise + (3 * day) / 5, end: d.rise + (4 * day) / 5 };
    // The first fifth of the night.
    case 'pradosh':
      return { start: d.set, end: d.set + night / 5 };
    // The eighth of the night's fifteen muhurtas.
    case 'nishita':
      return { start: d.set + (7 * night) / 15, end: d.set + (8 * night) / 15 };
    case 'moonrise': {
      const rise = d.observer && SearchRiseSet(Body.Moon, d.observer, +1, new Date(d.rise), 1);
      // Without a location, the waning moon rises about 50 minutes later for each 12° past full.
      const t = rise ? rise.date.getTime() : d.set + ((MoonPhase(new Date(d.set)) - 180) / 360) * 24.84 * HOUR;
      return { start: t, end: t + MINUTE };
    }
  }
}

// ─── Festivals ──────────────────────────────────────────────────────────────

interface FestivalRule {
  name: string;
  deity: string;
  tithi: number;
  kaal: Kaal;
  detail: string;
  /** Once a year in this lunar month; otherwise every month. */
  month?: number;
  /** Months in which a monthly observance gives way to its great annual form. */
  except?: number[];
  /** Diwali: when Amavasya covers Pradosh on both evenings, the second is kept. */
  preferLater?: boolean;
}

const MAGHA = 10;
const BHADRAPADA = 5;
const ASHVIN = 6;

const FESTIVALS: FestivalRule[] = [
  { name: 'Chaitra Navaratri begins', deity: 'Durga', month: 0, tithi: 1, kaal: 'morning', detail: 'Ghatasthapana — the spring Navaratri of Durga' },
  { name: 'Ganesh Chaturthi', deity: 'Ganesha', month: BHADRAPADA, tithi: 4, kaal: 'madhyahna', detail: 'Ganesha’s birth, worshipped at midday' },
  { name: 'Sharad Navaratri begins', deity: 'Durga', month: ASHVIN, tithi: 1, kaal: 'morning', detail: 'Ghatasthapana — nine nights for Durga’s nine forms' },
  { name: 'Durga Ashtami', deity: 'Durga', month: ASHVIN, tithi: 8, kaal: 'morning', detail: 'Maha Ashtami of Navaratri' },
  { name: 'Vijayadashami', deity: 'Durga', month: ASHVIN, tithi: 10, kaal: 'aparahna', detail: 'Dussehra — the victory of Durga, kept in the afternoon' },
  { name: 'Diwali · Lakshmi Puja', deity: 'Lakshmi', month: ASHVIN, tithi: 30, kaal: 'pradosh', preferLater: true, detail: 'Lakshmi worshipped in the evening twilight (Pradosh) of the new moon' },
  { name: 'Kali Puja', deity: 'Kali', month: ASHVIN, tithi: 30, kaal: 'nishita', detail: 'Shyama Puja, at midnight on the new moon of Diwali' },
  { name: 'Vasant Panchami', deity: 'Saraswati', month: MAGHA, tithi: 5, kaal: 'purvahna', detail: 'Saraswati Puja in the forenoon; yellow is worn' },
  { name: 'Maha Shivaratri', deity: 'Shiva', month: MAGHA, tithi: 29, kaal: 'nishita', detail: 'The great night of Shiva, worshipped at midnight (Nishita)' },
  { name: 'Masik Shivaratri', deity: 'Shiva', tithi: 29, kaal: 'nishita', except: [MAGHA], detail: 'The monthly night of Shiva, at midnight' },
  { name: 'Sankashti Chaturthi', deity: 'Ganesha', tithi: 19, kaal: 'moonrise', detail: 'Ganesha’s fast, kept until moonrise' },
];

export interface HinduFestival {
  name: string;
  deity: string;
  /** Local midnight of the day it is kept. */
  date: Date;
  detail: string;
  /** When the tithi and the festival's time of day coincide (the puja window), or moonrise for Sankashti. */
  start?: Date;
  end?: Date;
}

function observe(rule: FestivalRule, span: { start: number; end: number }, place?: Place | null) {
  const days: Array<{ day: HinduDay; start: number; end: number; score: number; kaal: { start: number; end: number } }> = [];
  const first = addDays(localDay(new Date(span.start)), -1);
  for (let d = first; d.getTime() <= span.end + DAY; d = addDays(d, 1)) {
    const day = hinduDay(d, place);
    const k = kaalWindow(day, rule.kaal);
    const start = Math.max(k.start, span.start);
    const end = Math.min(k.end, span.end);
    // Overlap when the tithi touches the window; otherwise how far it misses by.
    days.push({ day, start, end, score: end - start, kaal: k });
  }
  let best = days.reduce((a, b) => (b.score > a.score ? b : a));
  if (rule.preferLater) {
    // A ghati (24 minutes) of Amavasya in the second evening's Pradosh suffices.
    const covered = days.filter((d) => d.score >= 24 * MINUTE);
    if (covered.length > 0) best = covered[covered.length - 1];
  }
  return best;
}

/** Hindu festivals kept in [from, to), for the viewer's location if known. */
export function hinduFestivals(from: Date, to: Date, place?: Place | null): HinduFestival[] {
  const out: HinduFestival[] = [];
  for (const m of lunarMonths(addDays(from, -2), addDays(to, 2))) {
    for (const rule of FESTIVALS) {
      if (rule.month !== undefined ? rule.month !== m.month || m.adhika : rule.except?.includes(m.month)) continue;
      const span = tithiSpan(m.newMoon, rule.tithi);
      const kept = observe(rule, span, place);
      if (kept.day.date < from || kept.day.date >= to) continue;
      const angaraki = rule.tithi === 19 && kept.day.date.getDay() === 2;
      out.push({
        name: angaraki ? 'Angaraki Sankashti Chaturthi' : rule.name,
        deity: rule.deity,
        date: kept.day.date,
        detail: `${rule.deity} · ${tithiName(rule.tithi)} — ${angaraki ? 'on a Tuesday, the most auspicious Sankashti' : rule.detail}`,
        // Sankashti's fast is broken at moonrise, so that is its time.
        ...(rule.kaal === 'moonrise'
          ? { start: new Date(kept.kaal.start) }
          : kept.score > 0
            ? { start: new Date(kept.start), end: new Date(kept.end) }
            : {}),
      });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}
