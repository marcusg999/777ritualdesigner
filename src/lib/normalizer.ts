import type { MatchResult, CorrespondenceResult, Correspondence, RitualStep, Intent, Entity } from './types';
import correspondencesData from '@/data/correspondences.json';

const correspondences = correspondencesData as Correspondence[];

const DISCLAIMER =
  'This tool offers symbolic inspiration for personal reflection. No outcomes are guaranteed. Always approach spiritual practices with respect for their cultural origins.';

function findCorrespondence(intent?: Intent, entities?: Entity[]): Correspondence {
  // Try to find by intentId first
  if (intent) {
    const found = correspondences.find((c) => c.intentId === intent.id);
    if (found) return found;
  }

  // Try to find by entityId
  if (entities && entities.length > 0) {
    for (const entity of entities) {
      const found = correspondences.find((c) => c.entityId === entity.id);
      if (found) return found;
    }
  }

  // Default fallback
  return {
    colors: ['white', 'gold', 'purple'],
    stones: ['clear quartz', 'amethyst'],
    herbs: ['lavender', 'rosemary'],
    metals: ['silver', 'gold'],
    scents: ['frankincense', 'sandalwood'],
    timing: 'Full moon, midnight or dawn',
    element: 'Spirit',
    sphere: 'Universal',
    planet: 'Sun',
    zodiac: 'Universal',
    tarotCards: ['The World', 'The Magician'],
    runeAssociations: ['Dagaz', 'Sowilo'],
    numerology: 7,
  };
}

function buildRitualOutline(
  correspondence: Correspondence,
  intent?: Intent,
  entities?: Entity[]
): RitualStep[] {
  const focusSubject =
    intent?.label || (entities && entities.length > 0 ? entities[0].name : 'your intention');

  const entityNames = entities && entities.length > 0 ? entities.map((e) => e.name).join(', ') : '';
  const entityNote = entityNames ? ` Call upon the energies of ${entityNames} for support.` : '';

  const colorStr = correspondence.colors.slice(0, 2).join(' and ');
  const stoneStr = correspondence.stones.slice(0, 2).join(' or ');
  const herbStr = correspondence.herbs.slice(0, 2).join(' and ');
  const scentStr = correspondence.scents.slice(0, 1).join(', ');

  return [
    {
      phase: 'Timing & Preparation',
      action: `Begin during ${correspondence.timing}. Cleanse yourself and your space. Gather ${colorStr} candles, ${stoneStr} stones, and ${herbStr} herbs as focal points for your working.`,
      notes: `Element: ${correspondence.element} | Sphere: ${correspondence.sphere}${correspondence.planet ? ' | Planet: ' + correspondence.planet : ''}`,
    },
    {
      phase: 'Sacred Space Setup',
      action: `Create a sacred circle or altar space facing the direction most aligned with your intent. Arrange your gathered materials. Light incense of ${scentStr} to purify the atmosphere and signal your intention to begin.`,
    },
    {
      phase: 'Focus Statement / Intention Setting',
      action: `State clearly and with feeling: "I open this space with the intention of ${focusSubject}." Breathe deeply three times, fully inhabiting your purpose.${entityNote}`,
    },
    {
      phase: 'Symbolic Actions',
      action: `Hold your chosen stones in your hands. Light a ${colorStr} candle, watching the flame as a symbol of your focused will. If you have herbs, you may burn them safely or arrange them on your altar. Let the symbols work on your unconscious mind.`,
      notes:
        correspondence.tarotCards && correspondence.tarotCards.length > 0
          ? `Optional: place the ${correspondence.tarotCards[0]} card on your altar as a focal image.`
          : undefined,
    },
    {
      phase: 'Meditation / Visualization',
      action: `Close your eyes and visualize your intention fully realized. See it, feel it, sense it as already present. Spend at least 5–10 minutes in this state, letting the vision take on depth and texture.`,
    },
    {
      phase: 'Journaling',
      action: `After your meditation, write freely about what you experienced—images, feelings, insights, resistances. Note the date, moon phase, and any notable symbols that arose. Your journal becomes a record of your practice.`,
    },
    {
      phase: 'Closing & Gratitude',
      action: `Thank any energies, archetypes, or entities you invoked. Extinguish candles respectfully (rather than blowing them out). Close your circle. Allow yourself a moment of stillness before returning to ordinary awareness.`,
    },
  ];
}

export function normalizeResult(match: MatchResult, query: string): CorrespondenceResult {
  const correspondence = findCorrespondence(match.intent, match.entities);
  const ritualOutline = buildRitualOutline(correspondence, match.intent, match.entities);

  return {
    query,
    matchedIntent: match.intent,
    matchedEntities: match.entities,
    correspondences: correspondence,
    ritualOutline,
    disclaimer: DISCLAIMER,
  };
}
