import {
  parseTiming,
  suggestDates,
  planetaryHours,
  moonQuarters,
  sunSign,
  moonMatches,
  phaseName,
  CHALDEAN,
  DAY_RULER,
  voidOfCourse,
  type DateSuggestion,
} from '@/lib/timing';
import correspondencesData from '@/data/correspondences.json';
import ifaData from '@/data/correspondences_ifa_yoruba.json';
import worldData from '@/data/correspondences_world.json';
import hiphopData from '@/data/correspondences_hiphop.json';
import type { Correspondence } from '@/lib/types';

// jest.global-setup.js pins TZ=America/Los_Angeles so these run in local time.
const all = [...(correspondencesData as Correspondence[]), ...(ifaData as Correspondence[])];
const record = (key: string) => all.find((c) => (c.intentId ?? c.entityId) === key)!;
const LA = { lat: 34.05, lon: -118.24 };
const SAT_SEP_26_2026 = new Date(2026, 8, 26, 10, 0);

describe('time zone', () => {
  it('runs in a non-UTC zone so local-day logic is exercised', () => {
    expect(new Date(2026, 0, 1).getTimezoneOffset()).toBe(480);
  });
});

describe('astronomy against published events', () => {
  const near = (actual: Date, iso: string, minutes: number) =>
    expect(Math.abs(actual.getTime() - Date.parse(iso)) / 60000).toBeLessThan(minutes);

  it('finds the 8 April 2024 new moon (solar eclipse) at 18:21 UTC', () => {
    const q = moonQuarters(new Date('2024-04-06T00:00Z'), new Date('2024-04-10T00:00Z'));
    const nm = q.find((x) => x.name === 'New Moon')!;
    near(nm.time, '2024-04-08T18:21Z', 5);
  });

  it('finds the 25 January 2024 full moon at 17:54 UTC', () => {
    const q = moonQuarters(new Date('2024-01-23T00:00Z'), new Date('2024-01-27T00:00Z'));
    near(q.find((x) => x.name === 'Full Moon')!.time, '2024-01-25T17:54Z', 5);
  });

  it('places the Sun in Libra in late September and Capricorn on New Year', () => {
    expect(sunSign(new Date('2026-09-26T12:00Z'))).toBe('Libra');
    expect(sunSign(new Date('2027-01-01T12:00Z'))).toBe('Capricorn');
  });

  it('names phases by elongation', () => {
    expect(phaseName(0)).toBe('New Moon');
    expect(phaseName(90)).toBe('First Quarter');
    expect(phaseName(180)).toBe('Full Moon');
    expect(phaseName(300)).toBe('Waning Crescent');
    expect(moonMatches(175, 'full')).toBe(true);
    expect(moonMatches(175, 'waxing')).toBe(true);
    expect(moonMatches(200, 'waxing')).toBe(false);
    expect(moonMatches(340, 'dark')).toBe(true);
  });
});

describe('parseTiming', () => {
  it('reads weekday, moon and planetary hour', () => {
    const p = parseTiming(record('love'));
    expect(p.weekdays).toEqual([5]);
    expect(p.moon.sort()).toEqual(['full', 'waxing']);
    expect(p.hourPlanets).toEqual(['Venus']);
  });

  it('does not read "full sun" as a full moon', () => {
    const p = parseTiming(record('sun_magic'));
    expect(p.moon).toEqual([]);
    expect(p.timeOfDay).toBe('noon');
  });

  it("ignores other traditions' days given in parentheses", () => {
    expect(parseTiming(record('oshun')).weekdays).toEqual([6]);
    expect(parseTiming(record('shango')).weekdays).toEqual([5]);
  });

  it('gives Orisha records their day but no planetary hours', () => {
    const p = parseTiming(record('ogun'));
    expect(p.weekdays).toEqual([2]);
    expect(p.hourPlanets).toEqual([]);
    expect(p.dayNote).toBe("Ogun's day");
    expect(parseTiming(record('eshu')).dayNote).toBe("Elegguá's day");
  });

  it('recognises date-bound workings', () => {
    expect(parseTiming(record('winter_solstice')).fixedEvents).toEqual([{ kind: 'dec-solstice' }]);
    expect(parseTiming(record('samhain')).fixedEvents).toEqual([
      { kind: 'calendar', month: 9, day: 31, label: 'Samhain' },
    ]);
    expect(parseTiming(record('elemental_balance')).fixedEvents).toHaveLength(6);
  });

  it('reads days of the month', () => {
    const plan = parseTiming({ ...record('love'), timing: 'The 17th of each month; above all December 17' });
    expect(plan.monthDays).toEqual([17]);
    expect(plan.fixedEvents).toEqual([]);
    const s = suggestDates({ ...plan, moon: [] }, SAT_SEP_26_2026);
    expect(s[0].date.toDateString()).toBe('Sat Oct 17 2026');
    expect(s[0].reasons).toContain('The 17th of the month');
  });

  it('keeps only real zodiac signs', () => {
    expect(parseTiming(record('love')).signs).toEqual(['Libra', 'Taurus']);
  });

  it('parses every record without error', () => {
    for (const c of all) expect(() => parseTiming(c)).not.toThrow();
  });
});

describe('suggestDates', () => {
  it("offers Ogun's next three Tuesdays", () => {
    const s = suggestDates(parseTiming(record('ogun')), SAT_SEP_26_2026);
    expect(s.map((x) => x.date.toDateString())).toEqual([
      'Tue Sep 29 2026',
      'Tue Oct 06 2026',
      'Tue Oct 13 2026',
    ]);
    expect(s[0].reasons[0]).toBe("Tuesday — Ogun's day");
  });

  it('only offers days meeting every stated condition', () => {
    for (const key of ['love', 'shadow_work', 'moon_magic', 'banishing']) {
      const plan = parseTiming(record(key));
      const s = suggestDates(plan, SAT_SEP_26_2026);
      expect(s.length).toBeGreaterThan(0);
      for (const x of s) {
        expect(x.partial).toBeUndefined();
        expect(plan.weekdays).toContain(x.date.getDay());
        expect(plan.moon.some((p) => moonMatches(x.moon.angle, p))).toBe(true);
      }
    }
  });

  it('judges the moon for the local evening, not a UTC day', () => {
    // Full moon 2026-10-26 04:12 UTC is Sunday 25 Oct 9:12 pm in Los Angeles,
    // so by Monday evening it is past full there.
    const s = suggestDates(parseTiming(record('moon_magic')), SAT_SEP_26_2026);
    expect(s.map((x) => x.date.toDateString())).not.toContain('Mon Oct 26 2026');
  });

  it('keeps suggestions on local midnight across the DST change', () => {
    const s = suggestDates(parseTiming(record('ogun')), new Date(2026, 9, 27), { count: 3 });
    expect(s.map((x) => x.date.toDateString())).toContain('Tue Nov 03 2026');
    for (const x of s) expect(x.date.getHours()).toBe(0);
  });

  it('dates the solstice astronomically, in local time', () => {
    const [first, second] = suggestDates(parseTiming(record('winter_solstice')), SAT_SEP_26_2026);
    expect(first.date.toDateString()).toBe('Mon Dec 21 2026');
    expect(first.exactEvent!.time.toISOString().slice(0, 16)).toBe('2026-12-21T20:50');
    // 2027's solstice is 22 Dec UTC but still the evening of the 21st in LA.
    expect(second.date.toDateString()).toBe('Tue Dec 21 2027');
  });

  it('flags near-misses when nothing in the window meets every condition', () => {
    const plan = { ...parseTiming(record('love')), moon: ['full' as const] };
    const s = suggestDates(plan, SAT_SEP_26_2026, { days: 5 });
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((x) => x.partial)).toBe(true);
  });
});

describe('void-of-course moon in suggestions', () => {
  const at9pm = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 21);
  const voidAt = (t: Date) =>
    voidOfCourse(new Date(t.getTime() - 86_400_000), new Date(t.getTime() + 86_400_000)).some(
      (v) => v.start <= t && t < v.end
    );
  const days = (s: DateSuggestion[]) => s.map((x) => x.date.toDateString());

  it('passes over days when the moon is void at the working time', () => {
    // Justice: Saturday or Tuesday, waning moon. On Tuesday 29 Sept 2026 the moon
    // is void from 4:35 pm until 10:25 am, and on Saturday 3 Oct through the evening.
    const plan = parseTiming(record('justice'));
    expect(plan.observesVoidMoon).toBe(true);
    expect(days(suggestDates({ ...plan, observesVoidMoon: false }, SAT_SEP_26_2026))).toEqual([
      'Sat Sep 26 2026', 'Tue Sep 29 2026', 'Sat Oct 03 2026',
    ]);
    const s = suggestDates(plan, SAT_SEP_26_2026);
    expect(days(s)).toEqual(['Sat Sep 26 2026', 'Tue Oct 06 2026', 'Tue Oct 27 2026']);
    for (const x of s) expect(voidAt(at9pm(x.date))).toBe(false);
  });

  it('reports the void periods on a suggested day, so the working can begin outside them', () => {
    const [sat] = suggestDates(parseTiming(record('justice')), SAT_SEP_26_2026);
    // 26 Sept: void from 1:31 am to 3:23 am, well before the evening working.
    expect(sat.voids).toHaveLength(1);
    expect(sat.voids[0].end.getHours()).toBe(3);
    expect(sat.voidAtWorking).toBe(false);
  });

  it('never suggests a void working time for any Western working', () => {
    const western = (correspondencesData as Correspondence[]).filter((_, i) => i % 6 === 0);
    for (const c of western) {
      const plan = parseTiming(c);
      if (!plan.observesVoidMoon || plan.fixedEvents.length > 0 || plan.timeOfDay) continue;
      for (const x of suggestDates(plan, SAT_SEP_26_2026)) {
        if (x.partial || x.voidAtWorking) continue;
        expect({ id: c.intentId, day: x.date.toDateString(), void: voidAt(at9pm(x.date)) }).toEqual({
          id: c.intentId, day: x.date.toDateString(), void: false,
        });
      }
    }
  });

  it('keeps a fixed holy date and says when the moon is void', () => {
    const [samhain] = suggestDates(parseTiming(record('samhain')), SAT_SEP_26_2026);
    expect(samhain.date.toDateString()).toBe('Sat Oct 31 2026');
    expect(samhain.voidAtWorking).toBe(true);
  });

  it('applies only to traditions timed by Western astrology', () => {
    const find = (id: string) =>
      [...(worldData as Correspondence[]), ...(hiphopData as Correspondence[])].find((c) => c.entityId === id)!;
    expect(parseTiming(record('ogun')).observesVoidMoon).toBe(false);
    for (const id of ['ares', 'tyr', 'durga', 'osiris', 'brigid']) expect(parseTiming(find(id)).observesVoidMoon).toBe(false);
    for (const id of ['kamael', 'bune', 'jdilla']) expect(parseTiming(find(id)).observesVoidMoon).toBe(true);
    // Ogun keeps Tuesday 29 Sept, void or not — Lucumí times a working by the Orisha's day.
    const [ogun] = suggestDates(parseTiming(record('ogun')), SAT_SEP_26_2026);
    expect([ogun.date.toDateString(), ogun.voids]).toEqual(['Tue Sep 29 2026', []]);
  });
});

describe('Hindu festivals in suggestions', () => {
  const DELHI = { lat: 28.61, lon: 77.21 };
  const hindu = (id: string) =>
    [...all, ...(worldData as Correspondence[])].find((c) => c.entityId === id)!;
  const TUE_SEP_29_2026 = new Date(2026, 8, 29, 10);
  const list = (s: DateSuggestion[]) =>
    s.map((x) => `${x.date.toDateString()}${x.festival ? ` · ${x.festival.name}` : ''}`);

  it('adds the next of each of the deity’s festivals to its days', () => {
    // Lakshmi: her Fridays, then Diwali on 8 Nov (as published for New Delhi).
    const s = suggestDates(parseTiming(hindu('lakshmi')), TUE_SEP_29_2026, { place: DELHI });
    expect(list(s)).toEqual([
      'Fri Oct 02 2026', 'Fri Oct 09 2026', 'Fri Oct 16 2026', 'Sun Nov 08 2026 · Diwali · Lakshmi Puja',
    ]);
    const diwali = s[3].festival!;
    expect(diwali.detail).toMatch(/Amavasya/);
    expect(diwali.end!.getTime() - diwali.start!.getTime()).toBeGreaterThan(2 * 3_600_000);
  });

  it('keeps the next monthly observance and the great annual one', () => {
    // Tuesdays count for Ganesha only as Angaraki Sankashti, which the calendar supplies.
    expect(parseTiming(hindu('ganesha')).weekdays).toEqual([3]);
    const s = suggestDates(parseTiming(hindu('ganesha')), TUE_SEP_29_2026, { place: DELHI });
    expect(list(s)).toEqual([
      'Tue Sep 29 2026 · Angaraki Sankashti Chaturthi', 'Wed Sep 30 2026', 'Wed Oct 07 2026', 'Wed Oct 14 2026',
      'Sat Sep 04 2027 · Ganesh Chaturthi',
    ]);
    // Sankashti is kept by moonrise, so its time is the moonrise.
    expect(s[0].festival!.start).toBeDefined();
    expect(s[0].festival!.end).toBeUndefined();
  });

  it('merges a festival into a day already suggested', () => {
    // Durga's Tuesdays from 12 Oct 2026 include Vijayadashami, Tuesday 20 Oct.
    const s = suggestDates(parseTiming(hindu('durga')), new Date(2026, 9, 12), { place: DELHI });
    const dashami = s.find((x) => x.festival?.name === 'Vijayadashami')!;
    expect(dashami.date.toDateString()).toBe('Tue Oct 20 2026');
    expect(dashami.reasons[0]).toBe('Vijayadashami');
    expect(dashami.reasons[1]).toMatch(/^Tuesday/);
    expect(s.filter((x) => x.date.toDateString() === 'Tue Oct 20 2026')).toHaveLength(1);
  });

  it('offers only festivals when the deity has no day of its own', () => {
    // Saraswati: "Vasant Panchami above all … no weekday is universal".
    const s = suggestDates(parseTiming(hindu('saraswati')), TUE_SEP_29_2026, { place: DELHI });
    expect(list(s)).toEqual(['Thu Feb 11 2027 · Vasant Panchami']);
  });

  it('gives Kali her three nights', () => {
    const s = suggestDates(parseTiming(hindu('kali')), TUE_SEP_29_2026, { place: DELHI });
    expect(list(s).filter((x) => x.includes(' · '))).toEqual([
      'Sat Nov 07 2026 · Kali Chaudas',
      'Sun Nov 08 2026 · Kali Puja',
      'Thu Feb 04 2027 · Ratanti Kali Puja',
    ]);
  });

  it('leaves other traditions alone', () => {
    expect(parseTiming(record('ogun')).hinduDeity).toBeUndefined();
    expect(parseTiming(record('justice')).hinduDeity).toBeUndefined();
    expect(parseTiming(hindu('kali')).hinduDeity).toBe('Kali');
  });
});

describe('planetaryHours', () => {
  const tue = planetaryHours(new Date(2026, 8, 29), LA.lat, LA.lon)!;

  it('begins at local sunrise with the ruler of the day', () => {
    expect(tue).toHaveLength(24);
    expect(tue[0].planet).toBe(DAY_RULER[2]);
    expect(tue[0].planet).toBe('Mars');
    const rise = tue[0].start;
    expect(rise.getHours()).toBe(6);
    expect(rise.getMinutes()).toBeGreaterThanOrEqual(40);
    expect(rise.getMinutes()).toBeLessThanOrEqual(52);
  });

  it('follows the Chaldean order and hands off to the next day', () => {
    tue.forEach((h, i) => expect(h.planet).toBe(CHALDEAN[(CHALDEAN.indexOf('Mars') + i) % 7]));
    const wed = planetaryHours(new Date(2026, 8, 30), LA.lat, LA.lon)!;
    expect(wed[0].planet).toBe('Mercury');
    expect(Math.abs(tue[23].end.getTime() - wed[0].start.getTime())).toBeLessThan(1000);
  });

  it('divides day and night into twelve equal hours each', () => {
    const len = (h: { start: Date; end: Date }) => h.end.getTime() - h.start.getTime();
    for (let i = 1; i < 12; i++) expect(Math.abs(len(tue[i]) - len(tue[0]))).toBeLessThan(2);
    for (let i = 13; i < 24; i++) expect(Math.abs(len(tue[i]) - len(tue[12]))).toBeLessThan(2);
    expect(tue[12].night).toBe(true);
    expect(tue[11].end.getTime()).toBe(tue[12].start.getTime());
  });

  it("uses the location's own sunrise even when it is in another time zone", () => {
    // Device in Los Angeles (TZ pinned), coordinates in Tokyo: Friday 16 Oct's
    // hours must start at Tokyo's Friday sunrise (~5:40 JST = 20:40 UTC on the
    // 15th) and belong to Venus, not to Saturday's sunrise a day later.
    const tokyo = planetaryHours(new Date(2026, 9, 16), 35.68, 139.69)!;
    expect(tokyo[0].planet).toBe('Venus');
    const utcMinutes = tokyo[0].start.getUTCHours() * 60 + tokyo[0].start.getUTCMinutes();
    expect(tokyo[0].start.getUTCDate()).toBe(15);
    expect(utcMinutes).toBeGreaterThan(20 * 60 + 25);
    expect(utcMinutes).toBeLessThan(20 * 60 + 55);
  });

  it('returns null where the sun does not rise (polar night)', () => {
    expect(planetaryHours(new Date(2026, 11, 21), 69.65, 18.96)).toBeNull();
  });
});
