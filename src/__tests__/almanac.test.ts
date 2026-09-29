import {
  HOLY_DAYS,
  eclipses,
  monthAlmanac,
  moonSign,
  moonIngresses,
  planetaryStations,
  sunIngresses,
  voidOfCourse,
} from '@/lib/almanac';
import { SIGNS, lunarDay, moonQuarters, newMoons, parseTiming, suggestDates } from '@/lib/timing';
import { Body, Ecliptic, EclipticGeoMoon, GeoVector, SunPosition } from 'astronomy-engine';
import worldData from '@/data/correspondences_world.json';
import type { Correspondence } from '@/lib/types';

// jest.global-setup.js pins TZ=America/Los_Angeles.
const within = (actual: Date, iso: string, minutes: number) =>
  expect(Math.abs(actual.getTime() - Date.parse(iso)) / 60000).toBeLessThan(minutes);

describe('eclipses (2026, published)', () => {
  const all = eclipses(new Date('2026-01-01T00:00Z'), new Date('2027-01-01T00:00Z'));
  it('finds the four eclipses of 2026', () => {
    expect(all.map((e) => `${e.kind} ${e.type}`).sort()).toEqual(
      ['annular solar', 'partial lunar', 'total lunar', 'total solar'].sort()
    );
  });
  it('dates the 12 August 2026 total solar eclipse', () => {
    const e = all.find((x) => x.type === 'solar' && x.kind === 'total')!;
    within(e.time, '2026-08-12T17:46Z', 10);
  });
  it('dates the 3 March 2026 total lunar eclipse', () => {
    const e = all.find((x) => x.type === 'lunar' && x.kind === 'total')!;
    within(e.time, '2026-03-03T11:34Z', 10);
  });
});

describe('planetary stations', () => {
  it('matches the three Mercury retrogrades of 2024', () => {
    const s = planetaryStations(new Date('2024-01-10T00:00Z'), new Date('2024-12-31T00:00Z')).filter(
      (x) => x.planet === 'Mercury'
    );
    const dates = s.map((x) => `${x.direction[0].toUpperCase()} ${x.time.toISOString().slice(0, 10)}`);
    // Published stations (UTC): R Apr 1, D Apr 25, R Aug 5, D Aug 28, R Nov 26, D Dec 15.
    const expected = ['R 2024-04-01', 'D 2024-04-25', 'R 2024-08-05', 'D 2024-08-28', 'R 2024-11-26', 'D 2024-12-15'];
    expect(dates).toHaveLength(6);
    dates.forEach((d, i) => {
      const [dir, day] = d.split(' ');
      const [edir, eday] = expected[i].split(' ');
      expect(dir).toBe(edir);
      expect(Math.abs(Date.parse(day) - Date.parse(eday)) / 86_400_000).toBeLessThanOrEqual(1);
    });
  });
});

describe('ingresses', () => {
  it('moves the moon through the signs in order', () => {
    const ing = moonIngresses(new Date('2026-09-01T00:00Z'), new Date('2026-10-01T00:00Z'));
    expect(ing.length).toBeGreaterThanOrEqual(12);
    expect(ing.length).toBeLessThanOrEqual(14);
    for (let i = 1; i < ing.length; i++) {
      expect(SIGNS.indexOf(ing[i].sign)).toBe((SIGNS.indexOf(ing[i - 1].sign) + 1) % 12);
    }
  });
  it('puts the Sun into Libra at the September 2026 equinox', () => {
    const [libra] = sunIngresses(new Date('2026-09-20T00:00Z'), new Date('2026-09-30T00:00Z'));
    expect(libra.sign).toBe('Libra');
    within(libra.time, '2026-09-23T00:05Z', 5);
  });
});

describe('void-of-course moon', () => {
  const sept = voidOfCourse(new Date('2026-09-01T00:00Z'), new Date('2026-10-01T00:00Z'));

  it('runs from the last aspect in a sign until the next ingress', () => {
    expect(sept).toHaveLength(14);
    for (const v of sept) {
      expect(v.start.getTime()).toBeLessThan(v.end.getTime());
      expect(moonSign(new Date(v.start.getTime() + 1000))).toBe(v.from);
      expect(moonSign(new Date(v.end.getTime() + 1000))).toBe(v.to);
      expect(SIGNS.indexOf(v.to)).toBe((SIGNS.indexOf(v.from) + 1) % 12);
    }
  });

  it('lands last aspects to the Sun on the lunar phases', () => {
    // 18 Sept 2026: the First Quarter (Moon square Sun) is the Moon's last aspect in Sagittarius.
    const v = sept.find((x) => x.from === 'Sagittarius')!;
    expect(v.lastAspect).toBe('Moon square Sun');
    const [firstQuarter] = moonQuarters(new Date('2026-09-18T00:00Z'), new Date('2026-09-20T00:00Z'));
    within(v.start, firstQuarter.time.toISOString(), 2);
    within(v.end, '2026-09-19T04:55Z', 2);
  });

  it('leaves no aspect inside a void period', () => {
    const bodies = [Body.Sun, Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune, Body.Pluto];
    const angles = [0, 60, 90, 120, 180, 240, 270, 300];
    const sep = (b: Body, t: number) => {
      const d = new Date(t);
      const other = b === Body.Sun ? SunPosition(d).elon : Ecliptic(GeoVector(b, d, true)).elon;
      return (((EclipticGeoMoon(d).lon - other) % 360) + 360) % 360;
    };
    // The Moon always outruns the planets, so the separation only grows:
    // an aspect perfects wherever a sampled step crosses an aspect angle.
    for (const v of sept) {
      for (const b of bodies) {
        let prev = sep(b, v.start.getTime() + 1000);
        for (let t = v.start.getTime() + 10 * 60_000; ; t = Math.min(t + 10 * 60_000, v.end.getTime() - 1000)) {
          const s = sep(b, t);
          const crossed = angles.filter((a) => (a === 0 ? s < prev : prev < a && s >= a));
          expect({ body: b, start: v.start, crossed }).toEqual({ body: b, start: v.start, crossed: [] });
          prev = s;
          if (t >= v.end.getTime() - 1000) break;
        }
      }
    }
  });

  it('assigns an aspect just after an ingress to the new sign', () => {
    // 26 April 2026: the Moon squares Uranus (entering Gemini) 20 seconds after
    // it enters Virgo, so Leo's void begins at its earlier trine to Mercury.
    const leo = voidOfCourse(new Date('2026-04-25T00:00Z'), new Date('2026-04-26T00:00Z')).find((v) => v.from === 'Leo')!;
    expect(leo.lastAspect).toBe('Moon trine Mercury');
    within(leo.start, '2026-04-24T22:21Z', 2);
    within(leo.end, '2026-04-26T01:04Z', 2);
  });
});

describe('lunar days (Athenian reckoning)', () => {
  const moons = newMoons(new Date('2026-08-01T00:00Z'), new Date('2026-10-15T00:00Z'));
  it('counts the day after the new moon as the noumenia', () => {
    // New moon 10 Sept 2026, 8:27 pm in Los Angeles. August's new moon fell on
    // the 12th, so its month is "hollow" — 29 days, as Athenian months alternated.
    expect(lunarDay(new Date(2026, 8, 10), moons)).toBe(29);
    expect(lunarDay(new Date(2026, 8, 11), moons)).toBe(1);
    expect(lunarDay(new Date(2026, 8, 14), moons)).toBe(4);
  });
  it("puts Hermes's holy day on the 4th day of the lunar month, not the calendar", () => {
    const hermes = (worldData as Correspondence[]).find((c) => c.entityId === 'hermes')!;
    const plan = parseTiming(hermes);
    expect(plan.lunarDays).toEqual([4]);
    expect(plan.monthDays).toEqual([]);
    const s = suggestDates({ ...plan, weekdays: [] }, new Date(2026, 8, 1));
    expect(s[0].date.toDateString()).toBe('Mon Sep 14 2026');
    expect(s[0].reasons).toContain('The 4th day of the lunar month');
  });
});

describe('holy days', () => {
  it('extracts feast days, monthly days and lunar days from the records', () => {
    const find = (name: string) => HOLY_DAYS.filter((h) => h.name === name);
    expect(find('Ogun')).toEqual([expect.objectContaining({ month: 5, day: 29, label: 'Feast of Saint Peter' })]);
    expect(find('Babalú-Ayé')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ month: 11, day: 17 }),
        expect.objectContaining({ monthly: 17 }),
      ])
    );
    expect(find('Oya')).toHaveLength(2); // Candelaria and Saint Teresa
    expect(find('Athena')).toEqual([expect.objectContaining({ lunar: 3 })]);
    expect(find('Brigid')).toEqual([expect.objectContaining({ month: 1, day: 1, label: 'Imbolc' })]);
  });
});

describe('monthAlmanac', () => {
  const sept = monthAlmanac(2026, 8);
  const on = (d: number) => sept[d - 1];
  const titles = (d: number) => on(d).events.map((e) => e.title);

  it('covers every local day of the month', () => {
    expect(sept).toHaveLength(30);
    sept.forEach((day, i) => {
      expect(day.date.getDate()).toBe(i + 1);
      expect(day.date.getHours()).toBe(0);
    });
  });

  it('places events on their local day', () => {
    expect(titles(26)).toEqual(expect.arrayContaining(['Full Moon', 'Ibeji']));
    // The equinox is 00:05 UTC on the 23rd — the evening of the 22nd in Los Angeles.
    expect(titles(22)).toContain('Autumn equinox · Mabon');
    expect(titles(23)).not.toContain('Autumn equinox · Mabon');
    expect(titles(17)).toEqual(expect.arrayContaining(['Babalú-Ayé', 'Apollo']));
    expect(titles(29).length + titles(28).length).toBeGreaterThan(0);
  });

  it('links sabbats and holy days to rituals', () => {
    const equinox = on(22).events.find((e) => e.kind === 'season')!;
    expect(equinox.query).toBe('elemental balance');
    expect(on(26).events.find((e) => e.title === 'Ibeji')!.query).toBe('Ibeji');
  });

  it('lists void-of-course periods on the days they touch', () => {
    // Libra → Scorpio: 7:26 am on the 13th to 11:44 pm on the 13th, Los Angeles time.
    const event = on(13).events.find((e) => e.kind === 'void')!;
    expect(event.detail).toBe('After its last aspect (Moon square Mars) in Libra, until it enters Scorpio');
    expect(event.end!.getDate()).toBe(13);
    // 29 Sept 4:36 pm to 30 Sept 10:26 am: shown on both days, as one event on the first.
    expect(on(29).voids).toHaveLength(1);
    expect(on(30).voids[0]).toBe(on(29).voids[0]);
    expect(on(30).events.filter((e) => e.kind === 'void')).toHaveLength(0);
  });

  it('marks Saturn retrograde through September 2026', () => {
    expect(sept.every((d) => d.retrograde.includes('Saturn'))).toBe(true);
  });

  it('shows Samhain on 31 October', () => {
    expect(monthAlmanac(2026, 9)[30].events.map((e) => e.title)).toContain('Samhain');
  });
});
