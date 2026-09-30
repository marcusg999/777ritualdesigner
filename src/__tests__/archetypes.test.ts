import { buildRitual } from '@/lib/ritual';
import { suggestArchetypes } from '@/lib/archetypes';

const suggest = (q: string, includePopCulture = false) =>
  suggestArchetypes(buildRitual(q, { includePopCulture, reflection: false }), { includePopCulture });

describe('archetypes for a desire', () => {
  it('offers three, from different traditions where it can', () => {
    const s = suggest('courage');
    expect(s).toHaveLength(3);
    expect(new Set(s.map((x) => x.entity.tradition)).size).toBe(3);
    expect(s.map((x) => x.entity.name)).toEqual(expect.arrayContaining(['Muhammad Ali', 'Lion']));
    for (const x of s) expect(x.matched.length).toBeGreaterThan(0);
  });

  it('puts the asker’s own words first', () => {
    // "new beginnings" is among the Scarab's reasons to invoke.
    expect(suggest('new beginnings')[0].entity.name).toBe('Scarab');
    expect(suggest('focus')[0].matched).toContain('focus');
  });

  it('leads with the archetype whose story names the deity asked for', () => {
    expect(suggest('Athena')[0]).toMatchObject({ entity: { name: 'Owl' }, matched: expect.arrayContaining(['Athena']) });
    expect(suggest('Shiva')[0].entity.name).toBe('Bull');
    expect(suggest('Odin').map((x) => x.entity.name)).toEqual(expect.arrayContaining(['Wolf']));
  });

  it('never repeats an archetype the ritual already shows', () => {
    const r = buildRitual('Muhammad Ali', { includePopCulture: false, reflection: false });
    expect(suggestArchetypes(r).map((x) => x.entity.id)).not.toContain('muhammad-ali');
  });

  it('keeps pop-culture archetypes to when they are asked for', () => {
    for (const q of ['justice', 'protection', 'strength']) {
      expect(suggest(q).some((x) => x.entity.isPopCulture)).toBe(false);
    }
    expect(suggest('justice', true).length).toBe(3);
  });

  it('falls back on the working’s planet when no words are shared', () => {
    const s = suggest('money');
    expect(s).toHaveLength(3);
    expect(s.some((x) => x.matched.length === 0 && x.planet === 'Jupiter')).toBe(true);
  });
});
