/**
 * Archetypes that answer a desire: the modern figures, HipHop artists, animals
 * and zodiac animals (and pop-culture archetypes, when included) whose tags,
 * reasons to invoke and description share the most words with what was asked.
 */
import type { CorrespondenceResult, Entity } from './types';
import { normalizeText } from './matcher';
import entitiesData from '@/data/entities.json';

const ARCHETYPES = (entitiesData as Entity[]).filter((e) => e.type === 'archetype' || e.type === 'pop-culture');

// Words too general to say anything about a desire.
const STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'of', 'for', 'to', 'with', 'my', 'me', 'i', 'in', 'on', 'by', 'at', 'as', 'is', 'it', 'its',
  'or', 'into', 'from', 'your', 'you', 'who', 'that', 'their', 'his', 'her', 'ritual', 'working', 'spell', 'magic',
  'archetype', 'animal', 'zodiac', 'chinese', 'day', 'days', 'year', 'years',
]);

/** Lowercase words, lightly stemmed so "dreams" meets "dream". */
function words(text: string): string[] {
  return normalizeText(text)
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    .map((w) => (w.length > 4 && w.endsWith('s') && !/(ss|us|is)$/.test(w) ? w.slice(0, -1) : w));
}

export interface ArchetypeSuggestion {
  entity: Entity;
  /** The desire's words this archetype answers to. */
  matched: string[];
  /** Shares the working's planet — the reason, when no words are shared. */
  planet?: string;
}

export function suggestArchetypes(
  result: CorrespondenceResult,
  { includePopCulture = false, count = 3 }: { includePopCulture?: boolean; count?: number } = {}
): ArchetypeSuggestion[] {
  // The desire, word by word: what was asked counts double; then the intent it
  // was read as, and the deity it named (only one named outright — figures
  // matched loosely by theme would drift the desire away from the words).
  const desire = new Map<string, number>();
  const add = (list: string[], weight: number) => {
    for (const w of list) desire.set(w, Math.max(desire.get(w) ?? 0, weight));
  };
  const named = result.basis?.kind === 'entity' ? result.matchedEntities[0] : undefined;
  if (named) add(named.tags.flatMap(words), 1);
  // An archetype whose own story names the deity asked for — Athena's owl,
  // Shiva's bull — is the closest answer of all.
  const namedIn = named ? new RegExp(`\\b${normalizeText(named.name)}\\b`) : undefined;
  if (result.matchedIntent) add([result.matchedIntent.label, ...result.matchedIntent.tags].flatMap(words), 1);
  add(words(result.query), 2);
  const planet = result.correspondences.planet;
  const shown = new Set(result.matchedEntities.map((e) => e.id));

  const scored = ARCHETYPES.filter((e) => !shown.has(e.id) && (includePopCulture || !e.isPopCulture))
    .map((entity) => {
      const tags = new Set(entity.tags.flatMap(words));
      const reasons = new Set((entity.reasonsToInvoke ?? []).flatMap(words));
      const description = new Set(words(entity.description));
      const matched: string[] = [];
      let score = 0;
      const direct = !!named && namedIn!.test(normalizeText(entity.description));
      if (direct) {
        matched.push(named.name);
        score += 10;
      }
      for (const [w, importance] of desire) {
        if (named && w === normalizeText(named.name)) continue;
        // A tag says most about an archetype, its reasons to invoke next, its description least.
        const weight = tags.has(w) ? 3 : reasons.has(w) ? 2 : description.has(w) ? 1 : 0;
        if (weight > 0) matched.push(w);
        score += weight * importance;
      }
      // The working's own planet breaks ties (Venus archetypes for a Venus
      // working) and, where no words are shared, is reason enough on its own.
      const samePlanet = !!planet && !!entity.sphere?.split('/').includes(planet);
      if (samePlanet) score += score > 0 ? 1 : 0.5;
      return { entity, matched, score, direct, planet: samePlanet ? planet : undefined };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name));

  // Those whose story names the deity come first; then one from each
  // tradition, so a desire meets a person, an animal, a sign.
  const picked: typeof scored = scored.filter((s) => s.direct).slice(0, count);
  const traditions = new Set<string>(picked.map((s) => s.entity.tradition));
  for (const s of scored) {
    if (s.direct) continue;
    if (picked.length === count) break;
    if (!traditions.has(s.entity.tradition)) {
      picked.push(s);
      traditions.add(s.entity.tradition);
    }
  }
  for (const s of scored) {
    if (picked.length === count) break;
    if (!picked.includes(s)) picked.push(s);
  }
  return picked
    .sort((a, b) => b.score - a.score)
    .map(({ entity, matched, planet: p }) => ({ entity, matched, planet: p }));
}
