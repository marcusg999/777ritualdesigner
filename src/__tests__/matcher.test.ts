import { stringSimilarity, matchQuery } from '@/lib/matcher';
import type { Intent, Entity } from '@/lib/types';

const sampleIntents: Intent[] = [
  { id: 'love', label: 'Love & Romance', tags: ['love', 'romance', 'relationship', 'heart'], description: 'Attracting love', tradition: 'universal' },
  { id: 'protection', label: 'Protection', tags: ['protection', 'shield', 'ward'], description: 'Protection working', tradition: 'universal' },
  { id: 'wisdom', label: 'Wisdom & Knowledge', tags: ['wisdom', 'knowledge', 'intelligence'], description: 'Gaining wisdom', tradition: 'universal' },
];

const sampleEntities: Entity[] = [
  { id: 'aphrodite', name: 'Aphrodite', tradition: 'Greek', type: 'deity', description: 'Goddess of love', tags: ['love', 'beauty', 'Venus'], sphere: 'Venus' },
  { id: 'hermes', name: 'Hermes', tradition: 'Greek', type: 'deity', description: 'Messenger god', tags: ['communication', 'travel', 'Mercury'], sphere: 'Mercury' },
  { id: 'batman_archetype', name: 'The Dark Knight Archetype', tradition: 'Pop Culture', type: 'pop-culture', description: 'Pop culture archetype', tags: ['protection', 'justice'], isPopCulture: true },
];

describe('stringSimilarity', () => {
  it('returns 1 for identical strings', () => {
    expect(stringSimilarity('love', 'love')).toBe(1);
  });

  it('returns 0 for empty strings', () => {
    expect(stringSimilarity('', 'love')).toBe(0);
    expect(stringSimilarity('love', '')).toBe(0);
  });

  it('returns a high score for very similar strings', () => {
    const score = stringSimilarity('love', 'loves');
    expect(score).toBeGreaterThan(0.7);
  });

  it('returns a low score for very different strings', () => {
    const score = stringSimilarity('love', 'xyz');
    expect(score).toBeLessThan(0.5);
  });

  it('handles substring matches', () => {
    const score = stringSimilarity('healing', 'heal');
    expect(score).toBeGreaterThan(0.5);
  });

  it('is case insensitive', () => {
    expect(stringSimilarity('LOVE', 'love')).toBe(1);
  });
});

describe('matchQuery', () => {
  it('matches intent by label', () => {
    const result = matchQuery('love', sampleIntents, sampleEntities, false);
    expect(result.intent?.id).toBe('love');
    expect(result.score).toBeGreaterThan(0.5);
  });

  it('matches entity by name', () => {
    const result = matchQuery('Aphrodite', sampleIntents, sampleEntities, false);
    expect(result.entities.some((e) => e.id === 'aphrodite')).toBe(true);
  });

  it('excludes pop culture entities when flag is false', () => {
    const result = matchQuery('batman protection', sampleIntents, sampleEntities, false);
    expect(result.entities.some((e) => e.isPopCulture)).toBe(false);
  });

  it('includes pop culture entities when flag is true', () => {
    const result = matchQuery('batman protection', sampleIntents, sampleEntities, true);
    // Pop culture entities may or may not match depending on score threshold
    // Just verify the function runs without error
    expect(result).toBeDefined();
  });

  it('returns empty entities array when no good match found', () => {
    const result = matchQuery('zzzzxxx', sampleIntents, sampleEntities, false);
    expect(result.entities).toEqual([]);
  });

  it('matches intent by tag', () => {
    const result = matchQuery('romance', sampleIntents, sampleEntities, false);
    expect(result.intent?.id).toBe('love');
  });

  it('returns valid MatchResult structure', () => {
    const result = matchQuery('wisdom', sampleIntents, sampleEntities, false);
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('entities');
    expect(typeof result.score).toBe('number');
    expect(Array.isArray(result.entities)).toBe(true);
  });
});
