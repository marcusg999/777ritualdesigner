import type { EnrichmentProvider, EnrichmentData, CorrespondenceResult } from './types';

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export class StubEnrichmentProvider implements EnrichmentProvider {
  async enrich(query: string, result: CorrespondenceResult): Promise<EnrichmentData> {
    const hash = simpleHash(query);
    const additionalColors = ['silver', 'iridescent', 'deep violet'];
    const additionalStones = ['selenite', 'moldavite', 'sugilite', 'labradorite'];
    const interpretations = [
      `From an archetypal perspective, "${query}" resonates with themes of inner alchemy and soul-level remembering. The symbols arising in your practice are mirrors of deeper currents within the psyche.`,
      `The query "${query}" touches a timeless pattern in the collective unconscious. Your work with these correspondences may reveal unexpected connections between your personal story and universal myth.`,
      `Exploring "${query}" through the lens of symbolic wisdom invites you to examine what this quality means to your own lived experience—beyond any one tradition's definition.`,
      `In working with "${query}", notice what emerges from the margins of your awareness. Often the most powerful insights arrive sideways, in dreams or synchronicities after the ritual itself.`,
    ];

    const steps = [
      `After completing your ritual, sit in silence for three breaths and ask: "What symbol wants to emerge?" Write or draw whatever comes without judgment.`,
      `Consider creating a small sigil or symbol that represents your intention. This becomes a personal talisman you can return to.`,
      `Notice what metaphors arise naturally when you speak about this intention to a trusted friend—these spontaneous images often hold deeper symbolic weight.`,
    ];

    return {
      additionalCorrespondences: {
        colors: [additionalColors[hash % additionalColors.length]],
        stones: [additionalStones[hash % additionalStones.length]],
      },
      additionalSteps: [
        {
          phase: 'Symbolic Reflection (AI Insight)',
          action: steps[hash % steps.length],
        },
      ],
      interpretation: interpretations[hash % interpretations.length],
      source: 'stub',
    };
  }
}

export const stubEnrichmentProvider = new StubEnrichmentProvider();
