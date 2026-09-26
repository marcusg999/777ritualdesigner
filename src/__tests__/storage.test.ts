import { parseSaved, saveRitual, getSavedRituals, deleteRitual } from '@/lib/storage';
import { buildRitual } from '@/lib/ritual';

describe('saved rituals', () => {
  beforeEach(() => localStorage.clear());

  it('upgrades the legacy snapshot format to a recipe', () => {
    const legacy = JSON.stringify([
      // A pre-fix snapshot of "Ogun" carrying Sun Magic's wrong correspondences.
      { query: 'Ogun', matchedEntities: [{ id: 'ogun' }], correspondences: { colors: ['yellow', 'gold'] } },
      { query: 'batman protection', matchedEntities: [{ id: 'batman_archetype', isPopCulture: true }], enrichment: { source: 'stub' } },
    ]);
    expect(parseSaved(legacy)).toEqual([
      { query: 'Ogun', includePopCulture: false, reflection: false },
      { query: 'batman protection', includePopCulture: true, reflection: true },
    ]);
  });

  it('rebuilds a legacy save with the corrected data', () => {
    const [recipe] = parseSaved(JSON.stringify([{ query: 'Ogun', matchedEntities: [], correspondences: { colors: ['yellow'] } }]));
    const rebuilt = buildRitual(recipe.query, recipe);
    expect(rebuilt.correspondences.colors).toEqual(['green', 'black']);
  });

  it('ignores malformed storage instead of crashing', () => {
    expect(parseSaved('not json')).toEqual([]);
    expect(parseSaved('{"query":"x"}')).toEqual([]);
    expect(parseSaved(JSON.stringify([null, 42, { query: '' }, { query: 'love' }]))).toHaveLength(1);
  });

  it('saves newest first, replaces the same query, and deletes', () => {
    saveRitual({ query: 'love', includePopCulture: false, reflection: false });
    saveRitual({ query: 'Ogun', includePopCulture: false, reflection: true });
    saveRitual({ query: 'love', includePopCulture: true, reflection: false });
    const saved = getSavedRituals();
    expect(saved.map((r) => [r.query, r.includePopCulture])).toEqual([['love', true], ['Ogun', false]]);
    expect(typeof saved[0].savedAt).toBe('string');
    deleteRitual('Ogun');
    expect(getSavedRituals().map((r) => r.query)).toEqual(['love']);
  });

  it('only adds reflection prompts, never extra correspondences', () => {
    const plain = buildRitual('Ogun', { includePopCulture: false, reflection: false });
    const withPrompts = buildRitual('Ogun', { includePopCulture: false, reflection: true });
    expect(withPrompts.correspondences).toEqual(plain.correspondences);
    expect(withPrompts.enrichment?.additionalCorrespondences).toBeUndefined();
    expect(withPrompts.enrichment?.interpretation).toBeTruthy();
  });
});
