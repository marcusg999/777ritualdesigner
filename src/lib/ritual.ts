import type { CorrespondenceResult, Entity, Intent } from './types';
import { matchQuery } from './matcher';
import { normalizeResult } from './normalizer';
import { reflectionPrompts } from './enrichment';
import intentsData from '@/data/intents.json';
import entitiesData from '@/data/entities.json';

const intents = intentsData as Intent[];
const entities = entitiesData as Entity[];

export interface RitualOptions {
  includePopCulture: boolean;
  /** Append a journaling / reflection prompt (not AI-generated). */
  reflection: boolean;
}

/**
 * The single path from a query to a ritual. The generator and the Saved page
 * both call it, so a saved ritual always reflects the current, corrected data.
 */
export function buildRitual(query: string, options: RitualOptions): CorrespondenceResult {
  const match = matchQuery(query, intents, entities, options.includePopCulture);
  const result = normalizeResult(match, query);
  return options.reflection ? { ...result, enrichment: reflectionPrompts(query) } : result;
}
