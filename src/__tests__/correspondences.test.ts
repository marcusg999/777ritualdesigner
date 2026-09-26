import { matchQuery, normalizeText } from '@/lib/matcher';
import { normalizeResult } from '@/lib/normalizer';
import { getOfferingsByEntityId } from '@/lib/offerings';
import { getSigilByEntityId } from '@/lib/sigils';
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

const ORISHA_IDS = ['obatala', 'yemaya', 'shango', 'ogun', 'eshu', 'oshun', 'ifa', 'oya', 'orunmila'];

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

  it('falls back to representative planetary correspondences for deities without a record', () => {
    const { result } = search('Ares');
    expect(result.basis?.kind).toBe('planetary');
    expect(result.correspondences.intentId).toBe('courage');
    expect(result.correspondences.planet).toBe('Mars');
  });

  it('resolves compound spheres such as "Mars / Geburah"', () => {
    const { result } = search('Archangel Kamael');
    expect(result.basis?.kind).not.toBe('default');
  });

  it('still matches plain intent queries', () => {
    expect(search('money').match.intent?.id).toBe('abundance');
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
