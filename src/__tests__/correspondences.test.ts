import { matchQuery, normalizeText } from '@/lib/matcher';
import { normalizeResult } from '@/lib/normalizer';
import { getOfferingsByEntityId } from '@/lib/offerings';
import { getSigilByEntityId } from '@/lib/sigils';
import { sunSign } from '@/lib/timing';
import intentsData from '@/data/intents.json';
import entitiesData from '@/data/entities.json';
import correspondencesData from '@/data/correspondences.json';
import ifaCorrespondencesData from '@/data/correspondences_ifa_yoruba.json';
import type { Intent, Entity, Correspondence } from '@/lib/types';

const intents = intentsData as Intent[];
const entities = entitiesData as Entity[];
const allCorrespondences = [
  ...(correspondencesData as Correspondence[]),
  ...(ifaCorrespondencesData as Correspondence[]),
];

function search(query: string, includePopCulture = true) {
  const match = matchQuery(query, intents, entities, includePopCulture);
  return { match, result: normalizeResult(match, query) };
}

const ORISHA_IDS = [
  'obatala', 'yemaya', 'shango', 'ogun', 'eshu', 'oshun', 'ifa', 'oya', 'orunmila',
  'ochosi', 'babalu-aye', 'osain', 'olokun', 'ibeji', 'aganju', 'oba', 'yewa',
];

describe('deity-name searches', () => {
  it('resolves every entity name to that entity first', () => {
    for (const entity of entities) {
      const { match } = search(entity.name);
      expect(match.entities[0]?.id).toBe(entity.id);
    }
  });

  it("uses an Orisha's own correspondences, not a fuzzy-matched intent", () => {
    for (const id of ORISHA_IDS) {
      const entity = entities.find((e) => e.id === id)!;
      const { result } = search(entity.name);
      expect(result.correspondences.entityId).toBe(id);
      expect(result.basis).toEqual({ kind: 'entity', label: entity.name });
      expect(result.matchedIntent).toBeUndefined();
    }
  });

  it('matches alternate names and spellings, with or without diacritics', () => {
    const cases: Array<[string, string]> = [
      ['Oggún', 'ogun'], ['Ògún', 'ogun'], ['Elegua', 'eshu'], ['Elegguá', 'eshu'],
      ['Yemoja', 'yemaya'], ['Iemanjá', 'yemaya'], ['Ochún', 'oshun'], ['Changó', 'shango'],
      ['Xangô', 'shango'], ['Iansã', 'oya'], ['Orula', 'orunmila'], ['Ifa', 'ifa'],
      ['Oxóssi', 'ochosi'], ['Babalu Aye', 'babalu-aye'], ['San Lázaro', 'babalu-aye'], ['Osanyin', 'osain'],
      ['Olokun', 'olokun'], ['Jimaguas', 'ibeji'], ['Aggayú', 'aganju'], ['Obba', 'oba'], ['Yegua', 'yewa'],
    ];
    for (const [query, id] of cases) {
      expect(search(query).match.entities[0]?.id).toBe(id);
    }
  });

  it('does not pad a named deity with loosely related figures', () => {
    expect(search('Ogun').match.entities.map((e) => e.id)).toEqual(['ogun']);
    expect(search('Obatala').match.entities.map((e) => e.id)).toEqual(['obatala']);
  });

  it('ranks an exact name above an entity that merely shares a tag', () => {
    expect(search('Kanye West').match.entities[0]?.id).toBe('kanye-west');
  });

  it('keeps a real intent named alongside a deity', () => {
    const { match, result } = search('Oshun love');
    expect(match.intent?.id).toBe('love');
    expect(result.correspondences.entityId).toBe('oshun');
  });

  it('gives every deity and figure its own record', () => {
    for (const entity of entities.filter((e) => !e.isPopCulture)) {
      const { result } = search(entity.name, false);
      expect({ name: entity.name, kind: result.basis?.kind }).toEqual({ name: entity.name, kind: 'entity' });
    }
  });

  it('falls back to representative planetary correspondences for archetypes without a record', () => {
    const { result } = search('The Dark Knight Archetype');
    expect(result.basis?.kind).toBe('planetary');
    expect(result.correspondences.intentId).toBe('protection');
    expect(result.correspondences.planet).toBe('Saturn');
  });

  it('gives archangels their Liber 777 attributions', () => {
    const kamael = search('Archangel Kamael').result.correspondences;
    expect(kamael.divineName).toBe('Elohim Gibor');
    expect(kamael.day).toBe('Tuesday');
    expect(search('Archangel Haniel').result.correspondences.divineName).toBe('YHVH Tzabaoth');
  });

  it('sets Goetic planets and seal metals by rank', () => {
    for (const duke of ['Bune', 'Dantalion', 'Sallos']) {
      const c = search(duke).result.correspondences;
      expect([c.planet, c.metals]).toEqual(['Venus', ['Copper']]);
    }
    expect(search('Marbas').result.correspondences.planet).toBe('Mercury');
  });

  it('derives HipHop figures from their natal Sun and labels it as interpretation', () => {
    const dilla = search('J Dilla').result.correspondences;
    expect([dilla.birthDate, dilla.natalSun, dilla.planet, dilla.day]).toEqual([
      'February 7, 1974 · Detroit, Michigan', 'Aquarius', 'Saturn', 'Saturday',
    ]);
    expect(dilla.traditionNote).toMatch(/interpretation, not an established tradition/);
    // Madlib was born the day after the Sun entered Scorpio.
    expect(search('Madlib').result.correspondences.natalSun).toBe('Scorpio');
  });

  describe('modern archetypes', () => {
    const modern = entities.filter((e) => e.tradition === 'Modern');
    const RULER: Record<string, string> = {
      Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon', Leo: 'Sun', Virgo: 'Mercury',
      Libra: 'Venus', Scorpio: 'Mars', Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
    };

    it('covers six kinds of figure, five of each', () => {
      const counts: Record<string, number> = {};
      for (const e of modern) counts[e.category!] = (counts[e.category!] ?? 0) + 1;
      expect(counts).toEqual({ Artist: 5, Philosopher: 5, Scientist: 5, Leader: 5, Author: 5, Personality: 5 });
    });

    it('derives each natal Sun from the birth date, and the planet from its ruler', () => {
      for (const e of modern) {
        const c = search(e.name).result.correspondences;
        const born = new Date(`${c.birthDate!.split(' · ')[0]} 12:00 UTC`);
        expect({ id: e.id, sun: c.natalSun, planet: c.planet }).toEqual({
          id: e.id, sun: sunSign(born), planet: RULER[sunSign(born)],
        });
        expect(c.characteristics!.length).toBeGreaterThan(0);
        expect(c.signatureWorks!.length).toBeGreaterThan(0);
        expect(c.traditionNote).toMatch(/interpretation, not an established tradition/);
      }
    });

    it('answers to the names people use', () => {
      const cases: Array<[string, string]> = [
        ['MLK', 'martin-luther-king-jr'], ['Gandhi', 'mahatma-gandhi'], ['Madiba', 'nelson-mandela'],
        ['Gabo', 'garcia-marquez'], ['Garcia Marquez', 'garcia-marquez'], ['Madame Curie', 'marie-curie'],
        ['Cassius Clay', 'muhammad-ali'], ['El-Hajj Malik El-Shabazz', 'malcolm-x'], ['Tesla', 'tesla'],
      ];
      for (const [query, id] of cases) expect({ query, id: search(query).match.entities[0]?.id }).toEqual({ query, id });
    });

    it('surfaces a kind of figure by its category', () => {
      const found = search('philosopher').match.entities;
      expect(found.length).toBeGreaterThan(0);
      expect(found.every((e) => e.category === 'Philosopher')).toBe(true);
    });
  });

  it('finds every intent by its own id and name', () => {
    for (const intent of intents) {
      for (const q of [intent.id.replace(/_/g, ' '), intent.label]) {
        expect({ q, got: search(q).match.intent?.id }).toEqual({ q, got: intent.id });
      }
    }
  });

  it('prefers the intent that covers the whole query over a shared tag', () => {
    expect(search('summer solstice').match.intent?.id).toBe('summer_solstice');
    expect(search('elemental balance').match.intent?.id).toBe('elemental_balance');
    expect(search('rebirth').match.intent?.id).toBe('rebirth');
  });

  it('still matches plain intent queries', () => {
    // There is a dedicated Money intent; it must win over Abundance's "money" tag.
    expect(search('money').match.intent?.id).toBe('money');
    expect(search('prosperity').match.intent?.id).toBe('abundance');
    expect(search('love').result.basis?.kind).toBe('intent');
  });
});

describe('normalizeText', () => {
  it('folds Yorùbá tonal marks and case', () => {
    expect(normalizeText('Ọ̀rúnmìlà')).toBe('orunmila');
    expect(normalizeText('Ṣàngó')).toBe('sango');
    expect(normalizeText('Ifá')).toBe('ifa');
  });
});

describe('Ogun correspondences', () => {
  const ogun = (ifaCorrespondencesData as Correspondence[]).find((c) => c.entityId === 'ogun')!;

  it('match the traditional Lucumí attributes', () => {
    expect(ogun.colors).toEqual(['green', 'black']);
    expect(ogun.eleke).toMatch(/green and black/i);
    expect(ogun.sacredNumbers).toEqual([3, 7]);
    expect(ogun.day).toBe('Tuesday');
    expect(ogun.syncretism?.[0]).toMatch(/Saint Peter/);
    expect(ogun.sacredPlaces).toEqual(expect.arrayContaining(['The wilderness', 'Forests', 'Train tracks and railroads']));
    expect(ogun.tools).toEqual(
      expect.arrayContaining(['Hammer', 'Anvil', 'Machete', 'Hoe', 'Shovel', 'Pick', 'Pike', 'Rake', 'All tools'])
    );
    expect(ogun.temperament).toEqual(expect.arrayContaining(['Hard-working', 'Inventive', 'Brooding', 'Prone to anger']));
  });

  it('flow into the generated ritual', () => {
    const steps = search('Ogun').result.ritualOutline;
    const text = steps.map((s) => `${s.action} ${s.notes ?? ''}`).join(' ');
    expect(steps).toHaveLength(7);
    expect(text).toMatch(/green and black candles/);
    expect(text).toMatch(/eleke/);
    expect(text).toMatch(/groups of 3 or 7/);
    expect(text).toMatch(/Èṣù \/ Elegguá is acknowledged first/);
  });
});

describe('Orisha data integrity', () => {
  it('gives every Orisha a correspondence record, offerings, and a sigil', () => {
    for (const id of ORISHA_IDS) {
      const c = allCorrespondences.find((x) => x.entityId === id);
      expect(c).toBeDefined();
      expect(c!.colors.length).toBeGreaterThan(0);
      expect(c!.eleke).toBeTruthy();
      expect(c!.sacredNumbers!.length).toBeGreaterThan(0);
      expect(c!.syncretism!.length).toBeGreaterThan(0);
      expect(getOfferingsByEntityId(id)).toBeDefined();
      expect(getSigilByEntityId(id)).toBeDefined();
    }
  });

  it('uses the Orisha numbers the tradition assigns', () => {
    const numbers = Object.fromEntries(
      (ifaCorrespondencesData as Correspondence[]).map((c) => [c.entityId, c.sacredNumbers])
    );
    expect(numbers).toMatchObject({
      eshu: [3, 21], ogun: [3, 7], shango: [4, 6], oshun: [5], yemaya: [7],
      obatala: [8, 16, 24], oya: [9], orunmila: [16],
      ochosi: [3, 7], 'babalu-aye': [17], osain: [7, 21], ibeji: [2, 4, 8], aganju: [9], oba: [8],
    });
  });

  it('references only entities that exist', () => {
    const ids = new Set(entities.map((e) => e.id));
    for (const c of allCorrespondences) {
      if (c.entityId) expect(ids.has(c.entityId)).toBe(true);
    }
  });

  it('keeps Obatala taboos out of his offerings', () => {
    const offerings = getOfferingsByEntityId('obatala')!.commonOfferings.join(' ').toLowerCase();
    for (const taboo of ['palm oil', 'palm wine', 'rum', 'salt', 'pepper']) {
      expect(offerings).not.toContain(taboo);
    }
  });

  it('labels kola nut and bitter kola correctly', () => {
    for (const id of ['ifa', 'orunmila']) {
      const offerings = getOfferingsByEntityId(id)!.commonOfferings;
      expect(offerings).toContain('Kola nut (obì abàtà)');
      expect(offerings).toContain('Bitter kola (orógbó)');
    }
  });

  it("draws Orunmila's ọ̀pẹ̀lẹ̀ with eight half-pods", () => {
    const svg = getSigilByEntityId('orunmila')!.svgContent;
    expect(svg.match(/<ellipse/g)).toHaveLength(8);
  });
});

describe('planetary timing', () => {
  it('only names planetary hours of the seven classical planets', () => {
    const valid = new Set(['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn']);
    for (const c of allCorrespondences) {
      for (const m of c.timing.matchAll(/(\w+)(?:\s+or\s+(\w+))?\s+hour/g)) {
        for (const planet of [m[1], m[2]].filter(Boolean)) {
          expect(valid.has(planet.toLowerCase())).toBe(true);
        }
      }
    }
  });
});
