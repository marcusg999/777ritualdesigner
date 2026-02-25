import type { Intent, Entity, MatchResult } from './types';

export function stringSimilarity(a: string, b: string): number {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return 1;
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
  const queryTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  let maxScore = 0;
  for (const token of queryTokens) {
    for (const tag of tags) {
      const score = stringSimilarity(token, tag);
      if (score > maxScore) maxScore = score;
    }
  }
  return maxScore;
}

export function matchQuery(
  query: string,
  intents: Intent[],
  entities: Entity[],
  includePopCulture: boolean
): MatchResult {
  const q = query.toLowerCase().trim();

  let bestIntent: Intent | undefined;
  let bestIntentScore = 0;

  for (const intent of intents) {
    const labelSim = stringSimilarity(q, intent.label);
    const idSim = stringSimilarity(q, intent.id.replace(/_/g, ' '));
    const tagSim = tokenSimilarity(q, intent.tags);
    const descSim = intent.description ? stringSimilarity(q, intent.description) * 0.5 : 0;
    const score = Math.max(labelSim, idSim, tagSim, descSim);
    if (score > bestIntentScore) {
      bestIntentScore = score;
      bestIntent = intent;
    }
  }

  const matchedEntities: Array<{ entity: Entity; score: number }> = [];

  for (const entity of entities) {
    if (!includePopCulture && entity.isPopCulture) continue;
    const nameSim = stringSimilarity(q, entity.name);
    const tagSim = tokenSimilarity(q, entity.tags);
    const tradSim = stringSimilarity(q, entity.tradition) * 0.6;
    const score = Math.max(nameSim, tagSim, tradSim);
    if (score > 0.35) {
      matchedEntities.push({ entity, score });
    }
  }

  matchedEntities.sort((a, b) => b.score - a.score);
  const topEntities = matchedEntities.slice(0, 3).map((e) => e.entity);

  const overallScore = Math.max(
    bestIntentScore,
    matchedEntities.length > 0 ? matchedEntities[0].score : 0
  );

  return {
    score: overallScore,
    intent: bestIntentScore > 0.3 ? bestIntent : undefined,
    entities: topEntities,
  };
}
