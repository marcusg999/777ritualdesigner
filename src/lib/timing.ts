/**
 * Ritual timing: turns a correspondence's timing text ("Friday, waxing moon,
 * Venus hour") into concrete upcoming dates, moon phases, and planetary hours.
 *
 * All astronomy comes from astronomy-engine (moon phase, sun position,
 * sunrise/sunset), accurate to well under a minute and fully offline. Dates
 * are the viewer's local calendar days; a planetary day runs from sunrise to
 * the next sunrise, as the tradition defines it.
 */
import {
  Body,
  Ecliptic,
  EclipticGeoMoon,
  GeoVector,
  Illumination,
  MoonPhase,
  NextMoonQuarter,
  Observer,
  SearchMoonQuarter,
  SearchRiseSet,
  Seasons,
  SunPosition,
} from 'astronomy-engine';
import type { Correspondence, Entity } from './types';
import entitiesData from '@/data/entities.json';
import { hinduFestivals, type HinduFestival, type Place } from './panchang';
import { sexagenaryDay, ZODIAC_ANIMALS } from './chinese';

export type Planet = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';
export type MoonPreference = 'new' | 'dark' | 'waxing' | 'full' | 'waning';
export type TimeOfDay = 'dawn' | 'noon' | 'midnight';

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** The planet ruling each weekday, indexed by Date.getDay(). */
export const DAY_RULER: Planet[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
/** Chaldean order, slowest to fastest — the sequence planetary hours follow. */
export const CHALDEAN: Planet[] = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];
export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];
const PLANET_RE = '(?:Sun|Moon|Mars|Mercury|Jupiter|Venus|Saturn)';

// Traditions whose workings are timed by Western astrology, where the
// void-of-course moon applies. Religions with sacred calendars of their own —
// Lucumí, Greek, Egyptian, Norse, Celtic, Hindu — keep their days as they are.
const ASTROLOGICAL_TRADITIONS = new Set(['Kabbalistic', 'Abrahamic', 'Goetia', 'HipHop', 'Modern', 'Animal Kingdom', 'Pop Culture']);
const TRADITION = new Map((entitiesData as Entity[]).map((e) => [e.id, e.tradition]));
const ENTITY_NAME = new Map((entitiesData as Entity[]).map((e) => [e.id, e.name]));

type FixedEvent =
  | { kind: 'dec-solstice' | 'jun-solstice' | 'mar-equinox' | 'sep-equinox' }
  | { kind: 'calendar'; month: number; day: number; label: string };

type SeasonalBonus = 'solstice' | 'equinox' | 'mar-equinox' | 'samhain';

export interface TimingPlan {
  /** Preferred weekdays (Date.getDay()), primary first. */
  weekdays: number[];
  /** Days of the month ("the 17th of each month"); either these or a weekday satisfies the day. */
  monthDays: number[];
  /** Days of the lunar month ("the 4th day of each lunar month"), counted from the noumenia. */
  lunarDays: number[];
  /** Chinese zodiac animals (0 = Rat) whose days in the sixty-day cycle suit the working. */
  branches: number[];
  /** Acceptable moon phases; empty means any phase. */
  moon: MoonPreference[];
  /** Planets whose hours suit the working; empty when the tradition doesn't use them. */
  hourPlanets: Planet[];
  /** Workings tied to specific dates (solstices, Samhain…) rather than weekdays. */
  fixedEvents: FixedEvent[];
  seasonalBonus: SeasonalBonus[];
  signs: string[];
  timeOfDay?: TimeOfDay;
  /** Traditional phrase for the day, e.g. "Ogun's day". */
  dayNote?: string;
  /**
   * Whether the void-of-course moon applies. It belongs to Western astrology,
   * so it governs the ceremonial intents and figures, not religions with their
   * own sacred calendars (Lucumí times a working by the Orisha's day).
   */
  observesVoidMoon: boolean;
  /** A Hindu deity, whose Panchang festivals join the suggestions. */
  hinduDeity?: string;
}

// ─── Parsing ────────────────────────────────────────────────────────────────

export function parseTiming(c: Correspondence): TimingPlan {
  // Parentheticals name other traditions' customs ("Wednesday in Candomblé"),
  // not this record's preference, so they never score.
  const text = c.timing.replace(/\([^)]*\)/g, ' ');
  const lower = text.toLowerCase();
  const segments = text.split(',').map((s) => s.trim());

  const weekdays: number[] = [];
  // "also Tuesday for Angaraki Chaturthi" names a weekday only when it brings
  // a particular observance, whose dates come from the calendar instead.
  const dayText = text.replace(/\balso \w+day for [^;,]+/g, ' ');
  for (const m of dayText.matchAll(/\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\b/g)) {
    const idx = WEEKDAYS.indexOf(m[1]);
    if (!weekdays.includes(idx)) weekdays.push(idx);
  }

  const monthDays: number[] = [];
  for (const m of text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th) of (?:each|every) month\b/gi)) {
    const d = Number(m[1]);
    if (d >= 1 && d <= 31 && !monthDays.includes(d)) monthDays.push(d);
  }

  const lunarDays: number[] = [];
  for (const m of text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th) day of (?:each|every) lunar month\b/gi)) {
    const d = Number(m[1]);
    if (d >= 1 && d <= 30 && !lunarDays.includes(d)) lunarDays.push(d);
  }

  const branchMatch = text.match(new RegExp(`day of the (${ZODIAC_ANIMALS.join('|')}) in the sixty-day cycle`));
  const branches = branchMatch ? [ZODIAC_ANIMALS.indexOf(branchMatch[1])] : [];

  const moon = new Set<MoonPreference>();
  for (const seg of segments) {
    const s = seg.toLowerCase();
    // Only clauses about the moon — "full sun" is not a full moon.
    if (!/\bmoon\b|\bwaxing\b|\bwaning\b/.test(s) || /\bany moon\b/.test(s)) continue;
    for (const p of ['new', 'dark', 'waxing', 'full', 'waning'] as const) {
      if (new RegExp(`\\b${p}\\b`).test(s)) moon.add(p);
    }
  }

  const hourPlanets: Planet[] = [];
  const hourMatch = text.match(new RegExp(`(${PLANET_RE}(?:\\s+or\\s+${PLANET_RE})*)\\s+hour`));
  // Planetary hours are a Western ceremonial practice; Orisha timing follows
  // the Orisha's own day, so records with an eleke never get them.
  if (hourMatch && !c.eleke) {
    for (const p of hourMatch[1].split(/\s+or\s+/)) hourPlanets.push(p as Planet);
  }

  const fixedEvents: FixedEvent[] = [];
  const dateMatch = lower.match(new RegExp(`^(${MONTHS.join('|')})\\s+(\\d{1,2})\\b`));
  if (dateMatch) {
    const month = MONTHS.indexOf(dateMatch[1]);
    const day = Number(dateMatch[2]);
    if (lower.includes('solstice') && month === 11) fixedEvents.push({ kind: 'dec-solstice' });
    else if (lower.includes('solstice') && month === 5) fixedEvents.push({ kind: 'jun-solstice' });
    else fixedEvents.push({ kind: 'calendar', month, day, label: calendarLabel(month, day) });
  } else if (/^equinox or cross-quarter/.test(lower)) {
    fixedEvents.push(
      { kind: 'mar-equinox' },
      { kind: 'sep-equinox' },
      { kind: 'calendar', month: 1, day: 1, label: 'Imbolc' },
      { kind: 'calendar', month: 4, day: 1, label: 'Beltane' },
      { kind: 'calendar', month: 7, day: 1, label: 'Lughnasadh' },
      { kind: 'calendar', month: 9, day: 31, label: 'Samhain' }
    );
  }

  const seasonalBonus: SeasonalBonus[] = [];
  if (fixedEvents.length === 0) {
    if (lower.includes('solstice')) seasonalBonus.push('solstice');
    if (/\bspring\b/.test(lower)) seasonalBonus.push('mar-equinox');
    else if (lower.includes('equinox')) seasonalBonus.push('equinox');
    if (lower.includes('samhain')) seasonalBonus.push('samhain');
  }

  const signs = (c.zodiac ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => SIGNS.includes(s));

  const tod = lower.match(/\b(dawn|noon|midnight)\b/);
  const dayNote = text.match(/([^,]*'s day[^,—]*)/)?.[1].trim();

  return {
    weekdays,
    monthDays,
    lunarDays,
    branches,
    moon: [...moon],
    hourPlanets,
    fixedEvents,
    seasonalBonus,
    signs,
    timeOfDay: tod ? (tod[1] as TimeOfDay) : undefined,
    dayNote,
    observesVoidMoon: !c.eleke && (!c.entityId || ASTROLOGICAL_TRADITIONS.has(TRADITION.get(c.entityId) ?? '')),
    hinduDeity: c.entityId && TRADITION.get(c.entityId) === 'Hindu' ? ENTITY_NAME.get(c.entityId) : undefined,
  };
}

export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${s}`;
}

function calendarLabel(month: number, day: number): string {
  if (month === 9 && day === 31) return 'Samhain';
  if (month === 4 && day === 1) return 'Beltane';
  if (month === 1 && day === 1) return 'Imbolc';
  if (month === 7 && day === 1) return 'Lughnasadh';
  return new Date(2000, month, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

// ─── Local-date helpers (DST-safe: built from calendar fields) ─────────────

export function localDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function atHour(day: Date, hours: number, minutes = 0): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

// ─── Moon & sun ─────────────────────────────────────────────────────────────

export interface MoonInfo {
  /** Degrees past new moon: 0 new, 90 first quarter, 180 full, 270 last quarter. */
  angle: number;
  phaseName: string;
  /** Fraction of the disc lit, 0–1. */
  illumination: number;
}

export function moonInfo(at: Date): MoonInfo {
  const angle = MoonPhase(at);
  return { angle, phaseName: phaseName(angle), illumination: Illumination(Body.Moon, at).phase_fraction };
}

/** Eight-phase name; the four principal phases get about a day either side. */
export function phaseName(angle: number): string {
  if (angle < 12 || angle >= 348) return 'New Moon';
  if (angle < 78) return 'Waxing Crescent';
  if (angle < 102) return 'First Quarter';
  if (angle < 168) return 'Waxing Gibbous';
  if (angle < 192) return 'Full Moon';
  if (angle < 258) return 'Waning Gibbous';
  if (angle < 282) return 'Last Quarter';
  return 'Waning Crescent';
}

export function moonMatches(angle: number, pref: MoonPreference): boolean {
  switch (pref) {
    case 'new':
      return angle < 12 || angle >= 348;
    case 'dark': // the moonless nights leading into (and just past) the new moon
      return angle < 12 || angle >= 324;
    case 'waxing':
      return angle >= 12 && angle < 180;
    case 'full':
      return angle >= 168 && angle < 192;
    case 'waning':
      return angle >= 180 && angle < 348;
  }
}

export function sunSign(at: Date): string {
  return SIGNS[Math.floor(SunPosition(at).elon / 30) % 12];
}

const QUARTER_NAMES = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'];

/** Exact new moons between two instants, ascending. */
export function newMoons(from: Date, to: Date): Date[] {
  return moonQuarters(from, to).filter((q) => q.name === 'New Moon').map((q) => q.time);
}

/**
 * Day of the lunar month in the Athenian reckoning: the noumenia — the local
 * day after the new moon, when the first crescent can be seen — is day 1.
 * Undefined if no new moon precedes the day in the list given.
 */
export function lunarDay(day: Date, moons: Date[]): number | undefined {
  const d = localDay(day);
  let noumenia: Date | undefined;
  for (const nm of moons) {
    const n = addDays(localDay(nm), 1);
    if (n.getTime() <= d.getTime()) noumenia = n;
    else break;
  }
  if (!noumenia) return undefined;
  // Rounded, so a 23- or 25-hour DST day still counts as one day.
  return Math.round((d.getTime() - noumenia.getTime()) / 86_400_000) + 1;
}

/** Exact principal moon phases between two instants. */
export function moonQuarters(from: Date, to: Date): Array<{ name: string; time: Date }> {
  const out: Array<{ name: string; time: Date }> = [];
  let mq = SearchMoonQuarter(from);
  while (mq.time.date < to) {
    out.push({ name: QUARTER_NAMES[mq.quarter], time: mq.time.date });
    mq = NextMoonQuarter(mq);
  }
  return out;
}

function fixedEventDate(event: FixedEvent, year: number): { date: Date; label: string } {
  switch (event.kind) {
    case 'dec-solstice':
      return { date: Seasons(year).dec_solstice.date, label: 'Winter solstice' };
    case 'jun-solstice':
      return { date: Seasons(year).jun_solstice.date, label: 'Summer solstice' };
    case 'mar-equinox':
      return { date: Seasons(year).mar_equinox.date, label: 'Spring equinox' };
    case 'sep-equinox':
      return { date: Seasons(year).sep_equinox.date, label: 'Autumn equinox' };
    case 'calendar':
      return { date: new Date(year, event.month, event.day), label: event.label };
  }
}

// ─── Moon signs and the void-of-course moon ────────────────────────────────

const HOUR = 3_600_000;
const signOf = (longitude: number) => SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)];

export function moonSign(at: Date): string {
  return signOf(EclipticGeoMoon(at).lon);
}

/** Every instant the moon changes sign in [from, to), to the second. */
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
      while (hi - lo > 1000) {
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

// The bodies and aspects of the modern definition used by published almanacs:
// Sun through Pluto, and the five Ptolemaic aspects.
const ASPECT_BODIES: Array<{ name: string; body: Body }> = [
  { name: 'Sun', body: Body.Sun },
  { name: 'Mercury', body: Body.Mercury },
  { name: 'Venus', body: Body.Venus },
  { name: 'Mars', body: Body.Mars },
  { name: 'Jupiter', body: Body.Jupiter },
  { name: 'Saturn', body: Body.Saturn },
  { name: 'Uranus', body: Body.Uranus },
  { name: 'Neptune', body: Body.Neptune },
  { name: 'Pluto', body: Body.Pluto },
];
// Separation (Moon minus body, 0–360°) at which each aspect is exact.
const ASPECT_ANGLES: Array<{ angle: number; aspect: string }> = [
  { angle: 0, aspect: 'conjunct' },
  { angle: 60, aspect: 'sextile' },
  { angle: 90, aspect: 'square' },
  { angle: 120, aspect: 'trine' },
  { angle: 180, aspect: 'opposite' },
  { angle: 240, aspect: 'trine' },
  { angle: 270, aspect: 'square' },
  { angle: 300, aspect: 'sextile' },
];

const norm360 = (x: number) => ((x % 360) + 360) % 360;

function bodyLongitude(body: Body, t: number): number {
  const date = new Date(t);
  return body === Body.Sun ? SunPosition(date).elon : Ecliptic(GeoVector(body, date, true)).elon;
}

// The outer planets crawl (under 0.07° a day) and Pluto is by far the most
// expensive body to compute, so across the two or three days the Moon spends
// in a sign their longitude is interpolated between its ends — true to
// within seconds of time.
const OUTER = new Set([Body.Uranus, Body.Neptune, Body.Pluto]);

/** The body's longitude over [from, to], exact or interpolated. */
function longitudeOver(body: Body, from: number, to: number): (t: number) => number {
  if (!OUTER.has(body)) return (t) => bodyLongitude(body, t);
  const l0 = bodyLongitude(body, from);
  let d = bodyLongitude(body, to) - l0;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return (t) => l0 + (d * (t - from)) / (to - from);
}

export interface VoidOfCourse {
  /** The Moon's last exact aspect in the sign it is leaving… */
  start: Date;
  /** …until it enters the next sign. */
  end: Date;
  /** The sign the Moon is leaving and the one it enters. */
  from: string;
  to: string;
  /** e.g. "Moon trine Saturn"; absent if the Moon made no aspect in the whole sign. */
  lastAspect?: string;
}

/**
 * The last exact aspect the Moon makes to `body` in (from, to], if any. The
 * Moon outruns every planet, so the separation only ever increases — each
 * aspect angle is crossed at most once while the Moon crosses a single sign.
 */
function lastAspectTo(body: Body, from: number, to: number): { time: number; aspect: string } | undefined {
  const lon = longitudeOver(body, from, to);
  // The Moon's ecliptic longitude minus the body's.
  const separation = (t: number) => norm360(EclipticGeoMoon(new Date(t)).lon - lon(t));
  const s0 = separation(from);
  const unwrap = (t: number) => s0 + norm360(separation(t) - s0);
  const s1 = unwrap(to);
  let target: { angle: number; aspect: string } | undefined;
  for (let k = Math.floor(s1 / 360); k >= 0 && !target; k--) {
    for (let i = ASPECT_ANGLES.length - 1; i >= 0; i--) {
      const angle = ASPECT_ANGLES[i].angle + 360 * k;
      if (angle > s0 && angle <= s1) {
        target = { angle, aspect: ASPECT_ANGLES[i].aspect };
        break;
      }
    }
  }
  if (!target) return undefined;
  let lo = from;
  let hi = to;
  while (hi - lo > 1000) {
    const mid = (lo + hi) / 2;
    if (unwrap(mid) < target.angle) lo = mid;
    else hi = mid;
  }
  return { time: hi, aspect: target.aspect };
}

/**
 * Void-of-course periods overlapping [from, to): from the Moon's last major
 * aspect in a sign until it enters the next one.
 */
export function voidOfCourse(from: Date, to: Date): VoidOfCourse[] {
  // Start a sign early so the period running into `from` is found too.
  const ingresses = moonIngresses(new Date(from.getTime() - 3 * 24 * HOUR), new Date(to.getTime() + 3 * 24 * HOUR));
  const out: VoidOfCourse[] = [];
  for (let i = 1; i < ingresses.length; i++) {
    const entered = ingresses[i - 1];
    const leaves = ingresses[i];
    // A void lies within its sign, so skip signs outside the range.
    if (leaves.time <= from || entered.time >= to) continue;
    const signStart = entered.time.getTime();
    const signEnd = leaves.time.getTime();
    let last: { time: number; aspect: string; name: string } | undefined;
    for (const { name, body } of ASPECT_BODIES) {
      const a = lastAspectTo(body, signStart, signEnd);
      if (a && (!last || a.time > last.time)) last = { ...a, name };
    }
    const start = new Date(last ? last.time : signStart);
    if (start < leaves.time && start < to && leaves.time > from) {
      out.push({
        start,
        end: leaves.time,
        from: entered.sign,
        to: leaves.sign,
        lastAspect: last && `Moon ${last.aspect} ${last.name}`,
      });
    }
  }
  return out;
}

// ─── Suggestions ────────────────────────────────────────────────────────────

export interface DateSuggestion {
  /** Local midnight of the suggested day. */
  date: Date;
  score: number;
  reasons: string[];
  moon: MoonInfo;
  /** Exact principal moon phase falling on this day, if any. */
  exactPhase?: { name: string; time: Date };
  /** Exact solstice/equinox instant, for date-bound workings. */
  exactEvent?: { name: string; time: Date };
  sign: string;
  /** Meets only some of the stated conditions (no full match in the window). */
  partial?: boolean;
  /** Void-of-course periods overlapping this day, so the working can begin outside them. */
  voids: VoidOfCourse[];
  /** The moon is void at the working's usual time — only where the date can't move (a holy day) or is a near-miss. */
  voidAtWorking?: boolean;
  /** A Hindu festival of the deity kept on this day. */
  festival?: HinduFestival;
}

/** Void-of-course periods overlapping a local day, and whether one covers the working's time. */
function voidsOn(plan: TimingPlan, day: Date): { voids: VoidOfCourse[]; voidAtWorking: boolean } {
  if (!plan.observesVoidMoon) return { voids: [], voidAtWorking: false };
  const at = evaluationTime(day, plan.timeOfDay);
  const voids = voidOfCourse(day, addDays(day, 1));
  return { voids, voidAtWorking: voids.some((v) => v.start <= at && at < v.end) };
}

/** When the moon is judged for a day: the working's time of day, else 9 pm. */
function evaluationTime(day: Date, tod?: TimeOfDay): Date {
  if (tod === 'dawn') return atHour(day, 6);
  if (tod === 'noon') return atHour(day, 12);
  if (tod === 'midnight') return atHour(day, 23, 59);
  return atHour(day, 21);
}

/**
 * The next favourable days for a working. For a Hindu deity, the next time
 * each of its festivals is kept (within a year) joins them, reckoned from
 * sunrise at `place` as the Almanac does.
 */
export function suggestDates(
  plan: TimingPlan,
  from: Date,
  options: { days?: number; count?: number; place?: Place | null } = {}
): DateSuggestion[] {
  if (!plan.hinduDeity) return suggestFromTiming(plan, from, options);
  // With no day or moon of its own ("no weekday is universal"), every day
  // would qualify, so a Hindu deity is then offered its festivals alone.
  const unconditioned =
    plan.weekdays.length + plan.monthDays.length + plan.lunarDays.length + plan.moon.length +
      plan.fixedEvents.length + plan.seasonalBonus.length === 0;
  const base = unconditioned ? [] : suggestFromTiming(plan, from, options);
  return withFestivals(base, plan, localDay(from), options.place);
}

function withFestivals(base: DateSuggestion[], plan: TimingPlan, start: Date, place?: Place | null): DateSuggestion[] {
  const next = new Map<string, HinduFestival>();
  for (const f of hinduFestivals(start, addDays(start, 366), place, plan.hinduDeity)) {
    // Sankashti is called Angaraki on a Tuesday; either is the next Sankashti.
    const key = f.name.replace(/^Angaraki /, '');
    if (!next.has(key)) next.set(key, f);
  }
  const out = [...base];
  for (const festival of next.values()) {
    const same = out.findIndex((s) => s.date.getTime() === festival.date.getTime());
    if (same >= 0) {
      const s = out[same];
      out[same] = { ...s, festival, score: s.score + 5, reasons: [festival.name, ...s.reasons] };
    } else {
      out.push({
        date: festival.date,
        score: 5,
        reasons: [festival.name],
        moon: moonInfo(evaluationTime(festival.date, plan.timeOfDay)),
        sign: sunSign(atHour(festival.date, 12)),
        voids: [],
        festival,
      });
    }
  }
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function suggestFromTiming(
  plan: TimingPlan,
  from: Date,
  { days = 180, count = 3 }: { days?: number; count?: number }
): DateSuggestion[] {
  const start = localDay(from);

  if (plan.fixedEvents.length > 0) return suggestFixed(plan, start, count);

  const quarters = moonQuarters(addDays(start, -1), addDays(start, days + 1));
  const quarterByDay = new Map(quarters.map((q) => [dayKey(q.time), q]));
  const bonusDays = seasonalBonusDays(plan.seasonalBonus, start, days);
  const moonsForLunarDays = plan.lunarDays.length > 0 ? newMoons(addDays(start, -32), addDays(start, days + 1)) : [];

  const full: DateSuggestion[] = [];
  // Near-misses get their void periods worked out only if they're chosen.
  const partial: Array<Omit<DateSuggestion, 'voids'> & { voids?: VoidOfCourse[] }> = [];
  for (let i = 0; i < days && full.length < count; i++) {
    const day = addDays(start, i);
    const moon = moonInfo(evaluationTime(day, plan.timeOfDay));
    const reasons: string[] = [];
    let score = 0;

    const wd = plan.weekdays.indexOf(day.getDay());
    if (wd === 0) {
      score += 3;
      reasons.push(
        plan.dayNote
          ? `${WEEKDAYS[day.getDay()]} — ${plan.dayNote}`
          : `${WEEKDAYS[day.getDay()]}, ruled by ${DAY_RULER[day.getDay()]}`
      );
    } else if (wd > 0) {
      score += 2;
      reasons.push(`${WEEKDAYS[day.getDay()]}, ruled by ${DAY_RULER[day.getDay()]}`);
    }

    const monthDayHit = plan.monthDays.includes(day.getDate());
    if (monthDayHit) {
      score += 3;
      reasons.push(`The ${ordinal(day.getDate())} of the month`);
    }
    const lunar = plan.lunarDays.length > 0 ? lunarDay(day, moonsForLunarDays) : undefined;
    const lunarDayHit = lunar !== undefined && plan.lunarDays.includes(lunar);
    if (lunarDayHit) {
      score += 3;
      reasons.push(`The ${ordinal(lunar)} day of the lunar month`);
    }

    const cycle = plan.branches.length > 0 ? sexagenaryDay(day) : undefined;
    const branchHit = !!cycle && plan.branches.includes(cycle.branch);
    if (branchHit) {
      score += 3;
      reasons.push(`Day of the ${cycle.animal} · ${cycle.name}`);
    }

    const moonHit = plan.moon.some((p) => moonMatches(moon.angle, p));
    if (moonHit) {
      score += 2;
      reasons.push(moon.phaseName);
    }

    // "full moon or solstice": the seasonal event stands in for the moon.
    const bonus = bonusDays.get(dayKey(day));
    if (bonus) {
      score += 2;
      reasons.push(bonus);
    }

    const sign = sunSign(atHour(day, 12));
    const dayOk =
      (plan.weekdays.length === 0 && plan.monthDays.length === 0 && plan.lunarDays.length === 0 && plan.branches.length === 0) ||
      wd >= 0 ||
      monthDayHit ||
      lunarDayHit ||
      branchHit;
    const moonOk = plan.moon.length === 0 || moonHit || !!bonus;
    // The zodiac season is extra colour, never a reason on its own.
    if (score > 0 && plan.signs.includes(sign)) reasons.push(`Sun in ${sign}`);

    const suggestion = { date: day, score, reasons, moon, exactPhase: quarterByDay.get(dayKey(day)), sign };
    const nearMiss = score > 0 && i < 60;
    if (dayOk && moonOk) {
      // Tradition holds that nothing begun while the moon is void of course
      // comes to fruition, so a day whose working time falls in a void is
      // only a near-miss — unless the date itself is the occasion (a holy day,
      // or the solstice standing in for the moon), which can't move.
      const voids = voidsOn(plan, day);
      if (!voids.voidAtWorking || monthDayHit || lunarDayHit || bonus) full.push({ ...suggestion, ...voids });
      else if (nearMiss) partial.push({ ...suggestion, ...voids, partial: true });
    } else if (nearMiss) {
      partial.push({ ...suggestion, partial: true });
    }
  }

  // Every stated condition met, soonest first. Only if the sky offers none in
  // the window do near-misses appear, best first, flagged as partial.
  if (full.length > 0) return full;
  return partial
    .sort((a, b) => b.score - a.score || a.date.getTime() - b.date.getTime())
    .slice(0, count)
    .map((s) => (s.voids ? (s as DateSuggestion) : { ...s, ...voidsOn(plan, s.date) }));
}

function suggestFixed(plan: TimingPlan, start: Date, count: number): DateSuggestion[] {
  const year = start.getFullYear();
  const events: Array<{ date: Date; label: string; exact?: Date }> = [];
  for (const y of [year, year + 1]) {
    for (const ev of plan.fixedEvents) {
      const { date, label } = fixedEventDate(ev, y);
      const exact = ev.kind === 'calendar' ? undefined : date;
      const day = localDay(date);
      if (day >= start) events.push({ date: day, label, exact });
    }
  }
  events.sort((a, b) => a.date.getTime() - b.date.getTime());

  return events.slice(0, count).map(({ date, label, exact }) => {
    const moon = moonInfo(evaluationTime(date, plan.timeOfDay));
    const reasons = [label];
    let score = 3;
    if (plan.moon.some((p) => moonMatches(moon.angle, p))) {
      score += 2;
      reasons.push(moon.phaseName);
    }
    // A fixed date can't move, so a void is reported rather than avoided.
    return {
      date,
      score,
      reasons,
      moon,
      exactEvent: exact ? { name: label, time: exact } : undefined,
      sign: sunSign(atHour(date, 12)),
      ...voidsOn(plan, date),
    };
  });
}

function seasonalBonusDays(bonuses: SeasonalBonus[], start: Date, days: number): Map<string, string> {
  const out = new Map<string, string>();
  if (bonuses.length === 0) return out;
  const end = addDays(start, days);
  const kinds: Array<FixedEvent> = [];
  if (bonuses.includes('solstice')) kinds.push({ kind: 'dec-solstice' }, { kind: 'jun-solstice' });
  if (bonuses.includes('equinox')) kinds.push({ kind: 'mar-equinox' }, { kind: 'sep-equinox' });
  if (bonuses.includes('mar-equinox')) kinds.push({ kind: 'mar-equinox' });
  if (bonuses.includes('samhain')) kinds.push({ kind: 'calendar', month: 9, day: 31, label: 'Samhain' });
  for (const y of [start.getFullYear(), start.getFullYear() + 1]) {
    for (const k of kinds) {
      const { date, label } = fixedEventDate(k, y);
      const day = localDay(date);
      if (day >= start && day < end) out.set(dayKey(day), label);
    }
  }
  return out;
}

// ─── Planetary hours ────────────────────────────────────────────────────────

export interface PlanetaryHour {
  planet: Planet;
  start: Date;
  end: Date;
  /** Hours 1–12 run sunrise→sunset, 13–24 sunset→next sunrise. */
  index: number;
  night: boolean;
}

/**
 * The 24 unequal planetary hours of the planetary day beginning at sunrise on
 * the given calendar date at the given place. The first hour belongs to the
 * weekday's ruler and the rest follow the Chaldean order. Returns null where
 * the sun doesn't both rise and set that day (polar day or night).
 *
 * The day is anchored to the location's solar midnight (from its longitude),
 * not the device's, so coordinates in another time zone still get that
 * date's own sunrise and ruler.
 */
export function planetaryHours(day: Date, latitude: number, longitude: number): PlanetaryHour[] | null {
  const observer = new Observer(latitude, longitude, 0);
  const calendar = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const solarMidnight = new Date(
    Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) - (longitude / 15) * 3_600_000
  );
  const sunrise = SearchRiseSet(Body.Sun, observer, +1, solarMidnight, 1);
  if (!sunrise) return null;
  const sunset = SearchRiseSet(Body.Sun, observer, -1, sunrise.date, 1);
  if (!sunset) return null;
  const nextSunrise = SearchRiseSet(Body.Sun, observer, +1, sunset.date, 2);
  if (!nextSunrise) return null;

  const rise = sunrise.date.getTime();
  const set = sunset.date.getTime();
  const next = nextSunrise.date.getTime();
  const dayHour = (set - rise) / 12;
  const nightHour = (next - set) / 12;
  const first = CHALDEAN.indexOf(DAY_RULER[calendar.getDay()]);

  return Array.from({ length: 24 }, (_, i) => {
    const night = i >= 12;
    const s = night ? set + (i - 12) * nightHour : rise + i * dayHour;
    return {
      planet: CHALDEAN[(first + i) % 7],
      start: new Date(s),
      end: new Date(s + (night ? nightHour : dayHour)),
      index: i + 1,
      night,
    };
  });
}
