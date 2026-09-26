import type { Intent, Entity, MatchResult } from './types';

// A query naming a deity or alias at or above this score is treated as a
// direct invocation of that entity rather than a loose thematic match.
const NAMED_THRESHOLD = 0.8;
// Minimum score for an entity to surface when nothing is named directly.
const THEMATIC_ENTITY_THRESHOLD = 0.6;
// Minimum score for an intent when the query has no named entity.
const INTENT_THRESHOLD = 0.3;
// When a deity is named, leftover words must match an intent strongly —
// otherwise a name like "Ogun" fuzzily matches an unrelated intent.
const INTENT_WITH_ENTITY_THRESHOLD = 0.75;

// Filler words that should never be read as an intent once a deity is named.
const STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'of', 'for', 'to', 'with', 'my', 'me', 'i', 'in', 'on', 'by',
  'ritual', 'rite', 'spell', 'working', 'work', 'invoke', 'invoking', 'invocation',
  'call', 'calling', 'honor', 'honoring', 'offering', 'offerings', 'prayer', 'altar',
]);

/**
 * Lowercases, folds diacritics (Ọ̀ṣun → osun, Ifá → ifa) and strips punctuation
 * so names written with or without tonal marks compare equal.
 */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stringSimilarity(a: string, b: string): number {
  const la = normalizeText(a);
  const lb = normalizeText(b);
  if (la === lb) return la.length === 0 ? 0 : 1;
  if (la.length === 0 || lb.length === 0) return 0;

  // Check if one contains the other
  if (la.includes(lb) || lb.includes(la)) {
    const longer = Math.max(la.length, lb.length);
    const shorter = Math.min(la.length, lb.length);
    return (shorter / longer) * 0.9 + 0.1;
  }

  // Levenshtein distance
  const dp: number[][] = Array.from({ length: la.length + 1 }, (_, i) =>
    Array.from({ length: lb.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= la.length; i++) {
    for (let j = 1; j <= lb.length; j++) {
      if (la[i - 1] === lb[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  const maxLen = Math.max(la.length, lb.length);
  return 1 - dp[la.length][lb.length] / maxLen;
}

function tokenSimilarity(query: string, tags: string[]): number {
  const queryTokens = normalizeText(query).split(' ').filter(Boolean);
  let maxScore = 0;
  for (const token of queryTokens) {
    for (const tag of tags) {
      const score = stringSimilarity(token, tag);
      if (score > maxScore) maxScore = score;
    }
  }
  return maxScore;
}

/**
 * How strongly the query names this entity. An exact name/alias, or the name
 * appearing as whole words inside a longer query ("Ogun protection"), scores
 * near 1. Single-word names also tolerate small spelling variations per token
 * ("Oggun", "Yemoja").
 */
function nameScore(q: string, entity: Entity): { score: number; matched?: string } {
  let best = 0;
  let matched: string | undefined;
  const padded = ` ${q} `;
  const tokens = q.split(' ').filter(Boolean);

  for (const raw of [entity.name, ...(entity.aliases ?? [])]) {
    const name = normalizeText(raw);
    if (!name) continue;
    let s: number;
    if (q === name) s = 1;
    else if (padded.includes(` ${name} `)) s = 0.97;
    else {
      s = stringSimilarity(q, name);
      if (!name.includes(' ') && name.length >= 4) {
        for (const t of tokens) {
          if (t.length >= 4) s = Math.max(s, stringSimilarity(t, name) * 0.95);
        }
      }
    }
    if (s > best) {
      best = s;
      matched = name;
    }
  }
  return { score: best, matched };
}

function removePhrase(q: string, phrase: string): string {
  if (` ${q} `.includes(` ${phrase} `)) {
    return ` ${q} `.replace(` ${phrase} `, ' ').trim();
  }
  // Fuzzy single-token match ("oggun") — drop the closest token.
  const tokens = q.split(' ');
  let bestIdx = -1;
  let bestSim = 0;
  tokens.forEach((t, i) => {
    const sim = stringSimilarity(t, phrase);
    if (sim > bestSim) {
      bestSim = sim;
      bestIdx = i;
    }
  });
  if (bestIdx >= 0 && bestSim >= NAMED_THRESHOLD) tokens.splice(bestIdx, 1);
  return tokens.join(' ').trim();
}

function scoreIntent(q: string, intent: Intent): number {
  const labelSim = stringSimilarity(q, intent.label);
  const idSim = stringSimilarity(q, intent.id.replace(/_/g, ' '));
  const tagSim = tokenSimilarity(q, intent.tags);
  const descSim = intent.description ? stringSimilarity(q, intent.description) * 0.5 : 0;
  return Math.max(labelSim, idSim, tagSim, descSim);
}

export function matchQuery(
  query: string,
  intents: Intent[],
  entities: Entity[],
  includePopCulture: boolean
): MatchResult {
  const q = normalizeText(query);

  const scored: Array<{ entity: Entity; score: number; name: number; matchedName?: string }> = [];

  for (const entity of entities) {
    if (!includePopCulture && entity.isPopCulture) continue;
    const { score: nameSim, matched } = nameScore(q, entity);
    const tagSim = tokenSimilarity(q, entity.tags);
    const tradSim = stringSimilarity(q, entity.tradition) * 0.6;
    const score = Math.max(nameSim, tagSim, tradSim);
    scored.push({ entity, score, name: nameSim, matchedName: matched });
  }

  // Entities the user explicitly named always outrank thematic tag matches, so
  // "Kanye West" is never displaced by an archangel tagged "west".
  const named = scored
    .filter((s) => s.name >= NAMED_THRESHOLD)
    .sort((a, b) => b.name - a.name || b.score - a.score);

  let topEntities: Entity[];
  let residual = q;
  if (named.length > 0) {
    // A named deity is the focus: don't pad the result with loosely related
    // figures whose sigils and offerings would then be shown alongside it.
    topEntities = named.slice(0, 3).map((s) => s.entity);
    for (const s of named.slice(0, 3)) {
      if (s.matchedName) residual = removePhrase(residual, s.matchedName);
    }
    residual = residual
      .split(' ')
      .filter((t) => t && !STOPWORDS.has(t))
      .join(' ');
  } else {
    topEntities = scored
      .filter((s) => s.score >= THEMATIC_ENTITY_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((s) => s.entity);
  }

  let bestIntent: Intent | undefined;
  let bestIntentScore = 0;
  if (residual) {
    for (const intent of intents) {
      const score = scoreIntent(residual, intent);
      if (score > bestIntentScore) {
        bestIntentScore = score;
        bestIntent = intent;
      }
    }
  }

  const intentThreshold = named.length > 0 ? INTENT_WITH_ENTITY_THRESHOLD : INTENT_THRESHOLD;
  const topEntityScore = named.length > 0 ? named[0].name : topEntities.length > 0
    ? scored.find((s) => s.entity === topEntities[0])!.score
    : 0;

  return {
    score: Math.max(bestIntentScore, topEntityScore),
    intent: bestIntentScore > intentThreshold ? bestIntent : undefined,
    entities: topEntities,
    primaryEntityNamed: named.length > 0,
  };
}
