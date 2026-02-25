import { normalizeResult } from '@/lib/normalizer';
import type { MatchResult, Intent, Entity } from '@/lib/types';

const sampleIntent: Intent = {
  id: 'love',
  label: 'Love & Romance',
  tags: ['love', 'romance'],
  description: 'Attracting love',
  tradition: 'universal',
};

const sampleEntity: Entity = {
  id: 'aphrodite',
  name: 'Aphrodite',
  tradition: 'Greek',
  type: 'deity',
  description: 'Goddess of love',
  tags: ['love', 'beauty'],
  sphere: 'Venus',
};

describe('normalizeResult', () => {
  it('returns a valid CorrespondenceResult with intent and entities', () => {
    const match: MatchResult = {
      score: 0.9,
      intent: sampleIntent,
      entities: [sampleEntity],
    };

    const result = normalizeResult(match, 'love ritual');

    expect(result.query).toBe('love ritual');
    expect(result.matchedIntent?.id).toBe('love');
    expect(result.matchedEntities).toHaveLength(1);
    expect(result.matchedEntities[0].id).toBe('aphrodite');
    expect(result.disclaimer).toBeTruthy();
    expect(result.correspondences).toBeDefined();
    expect(Array.isArray(result.ritualOutline)).toBe(true);
  });

  it('generates a ritual outline with 7 steps', () => {
    const match: MatchResult = {
      score: 0.8,
      intent: sampleIntent,
      entities: [sampleEntity],
    };

    const result = normalizeResult(match, 'love');
    expect(result.ritualOutline.length).toBe(7);
  });

  it('each ritual step has phase and action', () => {
    const match: MatchResult = {
      score: 0.8,
      intent: sampleIntent,
      entities: [],
    };

    const result = normalizeResult(match, 'love');
    for (const step of result.ritualOutline) {
      expect(step.phase).toBeTruthy();
      expect(step.action).toBeTruthy();
    }
  });

  it('works with no intent or entities (fallback)', () => {
    const match: MatchResult = {
      score: 0.1,
      intent: undefined,
      entities: [],
    };

    const result = normalizeResult(match, 'something unknown');
    expect(result.correspondences).toBeDefined();
    expect(result.correspondences.colors.length).toBeGreaterThan(0);
    expect(result.ritualOutline.length).toBeGreaterThan(0);
    expect(result.disclaimer).toContain('symbolic inspiration');
  });

  it('includes the correct disclaimer', () => {
    const match: MatchResult = { score: 0.5, intent: sampleIntent, entities: [] };
    const result = normalizeResult(match, 'test');
    expect(result.disclaimer).toContain('No outcomes are guaranteed');
  });

  it('correspondences have required fields', () => {
    const match: MatchResult = { score: 0.9, intent: sampleIntent, entities: [sampleEntity] };
    const result = normalizeResult(match, 'love');
    const c = result.correspondences;
    expect(Array.isArray(c.colors)).toBe(true);
    expect(Array.isArray(c.stones)).toBe(true);
    expect(Array.isArray(c.herbs)).toBe(true);
    expect(Array.isArray(c.metals)).toBe(true);
    expect(Array.isArray(c.scents)).toBe(true);
    expect(typeof c.timing).toBe('string');
    expect(typeof c.element).toBe('string');
    expect(typeof c.sphere).toBe('string');
  });
});
