import { lunarNewYear, sexagenaryDay, yearAnimal, ZODIAC_ANIMALS } from '@/lib/chinese';
import { parseTiming, suggestDates } from '@/lib/timing';
import { monthAlmanac } from '@/lib/almanac';
import { matchQuery } from '@/lib/matcher';
import { normalizeResult } from '@/lib/normalizer';
import intentsData from '@/data/intents.json';
import entitiesData from '@/data/entities.json';
import animalsData from '@/data/correspondences_animals.json';
import type { Correspondence, Entity, Intent } from '@/lib/types';

// Reference values from lunar-python (6tail), an independent implementation
// of the Chinese calendar; the day cycle also matched it on 1,000 random dates.
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const records = animalsData as Correspondence[];
const entities = entitiesData as Entity[];
const search = (q: string) => {
  const match = matchQuery(q, intentsData as Intent[], entities, true);
  return { match, result: normalizeResult(match, q) };
};

describe('the sixty-day cycle', () => {
  it('names days as the Chinese calendar does', () => {
    expect(sexagenaryDay(new Date(2000, 0, 1)).name).toBe('戊午');
    expect(sexagenaryDay(new Date(1949, 9, 1)).name).toBe('甲子');
    expect(sexagenaryDay(new Date(2026, 8, 30))).toMatchObject({ name: '丁未', animal: 'Goat' });
  });

  it('runs unbroken — the same animal every twelve days', () => {
    const start = sexagenaryDay(new Date(2026, 0, 1)).branch;
    for (let i = 0; i < 400; i++) {
      expect(sexagenaryDay(new Date(2026, 0, 1 + i)).branch).toBe((start + i) % 12);
    }
  });
});

describe('Lunar New Year', () => {
  it('falls on the published dates', () => {
    const expected: Record<number, string> = {
      2023: '2023-01-22', 2024: '2024-02-10', 2025: '2025-01-29', 2026: '2026-02-17',
      2027: '2027-02-06', 2028: '2028-01-26', 2029: '2029-02-13',
    };
    for (const [y, iso] of Object.entries(expected)) expect(ymd(lunarNewYear(Number(y)))).toBe(iso);
  });

  it('waits a month when a leap month intervenes (the 2033 problem)', () => {
    // 2033 has a leap eleventh month, so 2034 begins on the third new moon after the solstice.
    expect(ymd(lunarNewYear(2034))).toBe('2034-02-19');
  });

  it('names the year', () => {
    expect(yearAnimal(2026)).toEqual({ animal: 'Horse', element: 'Fire' });
    expect(yearAnimal(1984)).toEqual({ animal: 'Rat', element: 'Wood' });
    expect(yearAnimal(2027)).toEqual({ animal: 'Goat', element: 'Fire' });
  });

  it('is in the Almanac, linked to its animal', () => {
    const feb = monthAlmanac(2026, 1);
    const ny = feb[16].events.find((e) => e.title.startsWith('Lunar New Year'))!;
    expect(ny).toMatchObject({ title: 'Lunar New Year · Year of the Fire Horse', query: 'Horse' });
    expect(monthAlmanac(2026, 8)[29].cycleDay.name).toBe('丁未');
  });
});

describe('the zodiac animals', () => {
  const zodiac = (animal: string) => records.find((r) => r.entityId === `zodiac-${animal.toLowerCase()}`)!;

  it('are all twelve, in order, with their branch, element and yin or yang', () => {
    const elements = ['Water', 'Earth', 'Wood', 'Wood', 'Earth', 'Fire', 'Fire', 'Earth', 'Metal', 'Metal', 'Earth', 'Water'];
    ZODIAC_ANIMALS.forEach((animal, i) => {
      expect(zodiac(animal).element).toBe(`${elements[i]} (${i % 2 === 0 ? 'yang' : 'yin'})`);
      expect(entities.find((e) => e.id === `zodiac-${animal.toLowerCase()}`)!.name).toBe(animal);
    });
  });

  it('keep their trines, secret friends and clashes consistent', () => {
    const lore = (a: string) => zodiac(a).lore!.find((l) => l.startsWith('Trine'))!;
    expect(lore('Rat')).toBe('Trine: Rat, Dragon and Monkey (Water). Secret friend: the Ox. Clash: the Horse.');
    expect(lore('Horse')).toBe('Trine: Horse, Tiger and Dog (Fire). Secret friend: the Goat. Clash: the Rat.');
    expect(lore('Rabbit')).toBe('Trine: Rabbit, Goat and Pig (Wood). Secret friend: the Dog. Clash: the Rooster.');
  });

  it('are timed by their own days in the sixty-day cycle', () => {
    const plan = parseTiming(zodiac('Horse'));
    expect(plan.branches).toEqual([6]);
    expect(plan.hourPlanets).toEqual([]);
    expect(plan.observesVoidMoon).toBe(false);
    const s = suggestDates(plan, new Date(2026, 8, 30));
    expect(s.map((x) => sexagenaryDay(x.date).animal)).toEqual(['Horse', 'Horse', 'Horse']);
    expect((s[1].date.getTime() - s[0].date.getTime()) / 86_400_000).toBe(12);
    expect(s[0].reasons[0]).toMatch(/^Day of the Horse · .午$/);
  });

  it('answer to their names and years', () => {
    expect(search('Year of the Horse').match.entities[0].id).toBe('zodiac-horse');
    expect(search('Snake').match.entities[0].id).toBe('zodiac-snake');
    expect(search('Sheep').match.entities[0].id).toBe('zodiac-goat');
    // An intent named exactly outranks a near-miss animal: "money" is not the Monkey.
    expect(search('money').match.intent?.id).toBe('money');
  });
});

describe('the animal kingdom', () => {
  const kingdom = entities.filter((e) => e.tradition === 'Animal Kingdom');

  it('places every animal under a planet, citing Agrippa', () => {
    expect(kingdom).toHaveLength(19);
    for (const e of kingdom) {
      const c = records.find((r) => r.entityId === e.id)!;
      expect(c.lore![0]).toMatch(/Agrippa/);
      expect(parseTiming(c).hourPlanets).toEqual([c.planet]);
      expect(c.characteristics!.length).toBe(4);
    }
    const planet = (id: string) => records.find((r) => r.entityId === `animal-${id}`)!.planet;
    expect([planet('lion'), planet('wolf'), planet('cat'), planet('ibis'), planet('eagle'), planet('dove')]).toEqual([
      'Sun', 'Mars', 'Moon', 'Mercury', 'Jupiter', 'Venus',
    ]);
  });

  it('answers to its names', () => {
    expect(search('Wolf').match.entities[0].id).toBe('animal-wolf');
    expect(search('Hawk').match.entities[0].id).toBe('animal-falcon');
    expect(search('Serpent').match.entities[0].id).toBe('animal-serpent');
    expect(search('Owl').result.correspondences.entityId).toBe('animal-owl');
  });
});
