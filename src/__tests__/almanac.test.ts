import {
  HOLY_DAYS,
  eclipses,
  monthAlmanac,
  moonIngresses,
  planetaryStations,
  sunIngresses,
} from '@/lib/almanac';
import { SIGNS, lunarDay, newMoons, parseTiming, suggestDates } from '@/lib/timing';
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

  it('marks Saturn retrograde through September 2026', () => {
    expect(sept.every((d) => d.retrograde.includes('Saturn'))).toBe(true);
  });

  it('shows Samhain on 31 October', () => {
    expect(monthAlmanac(2026, 9)[30].events.map((e) => e.title)).toContain('Samhain');
  });
});
