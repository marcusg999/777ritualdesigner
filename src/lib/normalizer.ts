import type {
  MatchResult,
  CorrespondenceResult,
  Correspondence,
  CorrespondenceBasis,
  RitualStep,
  Intent,
  Entity,
} from './types';
import correspondencesData from '@/data/correspondences.json';
import ifaCorrespondencesData from '@/data/correspondences_ifa_yoruba.json';
import worldCorrespondencesData from '@/data/correspondences_world.json';
import hiphopCorrespondencesData from '@/data/correspondences_hiphop.json';
import modernCorrespondencesData from '@/data/correspondences_modern.json';
import animalCorrespondencesData from '@/data/correspondences_animals.json';
import { getOfferingsByEntityId } from './offerings';

const correspondences: Correspondence[] = [
  ...(correspondencesData as Correspondence[]),
  ...(ifaCorrespondencesData as Correspondence[]),
  ...(worldCorrespondencesData as Correspondence[]),
  ...(hiphopCorrespondencesData as Correspondence[]),
  ...(modernCorrespondencesData as Correspondence[]),
  ...(animalCorrespondencesData as Correspondence[]),
];

const IFA_TRADITION = 'Ifá/Yorùbá';

const DISCLAIMER =
  'This tool offers symbolic inspiration for personal reflection. No outcomes are guaranteed. Always approach spiritual practices with respect for their cultural origins.';

const DEFAULT_CORRESPONDENCE: Correspondence = {
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

// The most representative intent record for each planet/sphere, used when a
// deity has no record of its own. Compound spheres ("Mars / Geburah") are
// resolved part by part.
const PLANETARY_INTENT: Record<string, string> = {
  Sun: 'sun_magic',
  Moon: 'moon_magic',
  Mars: 'courage',
  Mercury: 'communication',
  Jupiter: 'abundance',
  Venus: 'love',
  Saturn: 'protection',
  Earth: 'grounding',
  Malkuth: 'grounding',
  Kether: 'spiritual_awakening',
  Neptune: 'psychic_development',
};

function planetaryCorrespondence(sphere: string): { correspondence: Correspondence; part: string } | undefined {
  const parts = sphere.split('/').map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const id = PLANETARY_INTENT[part];
    const found = id ? correspondences.find((c) => c.intentId === id) : undefined;
    if (found) return { correspondence: found, part };
  }
  for (const part of parts) {
    const found = correspondences.find((c) => c.intentId && (c.sphere === part || c.planet === part));
    if (found) return { correspondence: found, part };
  }
  return undefined;
}

function entityCorrespondence(entity: Entity): Correspondence | undefined {
  return correspondences.find((c) => c.entityId === entity.id);
}

function findCorrespondence(
  intent: Intent | undefined,
  entities: Entity[],
  primaryEntityNamed: boolean
): { correspondence: Correspondence; basis: CorrespondenceBasis } {
  // A deity the user names directly is the focus of the working: its own
  // correspondences are the accurate ones, whatever the intent.
  if (primaryEntityNamed && entities.length > 0) {
    const found = entityCorrespondence(entities[0]);
    if (found) {
      return { correspondence: found, basis: { kind: 'entity', label: entities[0].name } };
    }
  }

  if (intent) {
    const found = correspondences.find((c) => c.intentId === intent.id);
    if (found) return { correspondence: found, basis: { kind: 'intent', label: intent.label } };
  }

  for (const entity of entities) {
    const found = entityCorrespondence(entity);
    if (found) return { correspondence: found, basis: { kind: 'entity', label: entity.name } };
  }

  // No deity-specific record: fall back to the entity's planetary sphere,
  // drawn only from intent records so one deity never borrows another's.
  for (const entity of entities) {
    const planetary = entity.sphere ? planetaryCorrespondence(entity.sphere) : undefined;
    if (planetary) {
      return {
        correspondence: planetary.correspondence,
        basis: { kind: 'planetary', label: `${planetary.part} (via ${entity.name})` },
      };
    }
  }

  return { correspondence: DEFAULT_CORRESPONDENCE, basis: { kind: 'default', label: 'Universal' } };
}

function joinList(items: string[], conj: 'and' | 'or'): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} ${conj} ${items[items.length - 1]}`;
}

// Ritual prose reads the lists inline: drop "(modern)" provenance labels
// (shown on the card instead) and lowercase the leading letter.
function inline(item: string): string {
  const t = item.replace(/\s*\(modern\)/i, '').trim();
  return t.charAt(0).toLowerCase() + t.slice(1);
}

function withNoun(items: string[], conj: 'and' | 'or', noun: string): string {
  const list = joinList(items.map(inline), conj);
  return items.some((i) => i.toLowerCase().includes(noun.replace(/s$/, ''))) ? list : `${list} ${noun}`;
}

function buildRitualOutline(
  correspondence: Correspondence,
  intent: Intent | undefined,
  entities: Entity[]
): RitualStep[] {
  const focusSubject = intent?.label || (entities.length > 0 ? entities[0].name : 'your intention');

  const entityNames = entities.map((e) => e.name).join(', ');
  const entityNote = entityNames ? ` Call upon the energies of ${entityNames} for support.` : '';

  const colorStr = joinList(correspondence.colors.slice(0, 2).map(inline), 'and');
  const stones = correspondence.stones.slice(0, 2);
  const herbs = correspondence.herbs.slice(0, 2);
  const scents = correspondence.scents.slice(0, 1);

  const gather = [
    colorStr && `${colorStr} candles`,
    stones.length > 0 && withNoun(stones, 'or', 'stones'),
    herbs.length > 0 && withNoun(herbs, 'and', 'herbs'),
  ].filter(Boolean) as string[];

  // Orisha workings follow the tradition's own protocol: the eleke, the
  // sacred number, the offerings the Orisha accepts, and Èṣù honored first.
  const orisha = entities.find((e) => e.tradition === IFA_TRADITION);
  const orishaOffering = orisha ? getOfferingsByEntityId(orisha.id) : undefined;
  // Offerings belong to whichever figure these correspondences describe.
  const owner = orisha ?? entities.find((e) => e.id === correspondence.entityId);
  const offerings = (orishaOffering?.commonOfferings ?? correspondence.offerings ?? []).filter(
    // Historical sacrifices are documented on the card, never suggested.
    (o) => !/in antiquity|contexts only/i.test(o)
  );
  // Only numbers you can sensibly arrange offerings by (not 42 or 108).
  const numbers = (correspondence.sacredNumbers ?? []).filter((n) => n <= 21);

  const prepNotes = [
    `Element: ${correspondence.element}`,
    `Sphere: ${correspondence.sphere}`,
    correspondence.planet ? `Planet: ${correspondence.planet}` : '',
  ].filter(Boolean).join(' | ');

  let prepAction = `Begin at the appropriate time: ${correspondence.timing}. Cleanse yourself and your space.`;
  if (gather.length > 0) prepAction += ` Gather ${joinList(gather, 'and')} as focal points for your working.`;
  if (orisha && correspondence.eleke) prepAction += ` Wear or lay out ${orisha.name}'s eleke: ${correspondence.eleke.charAt(0).toLowerCase()}${correspondence.eleke.slice(1)}.`;

  let setupAction =
    'Create a sacred circle or altar space facing the direction most aligned with your intent. Arrange your gathered materials.';
  if (scents.length > 0) {
    setupAction += ` Let the scent of ${inline(scents[0])} fill the space to purify it and signal your intention to begin.`;
  }
  let setupNotes: string | undefined;
  if (orisha) {
    setupNotes =
      orisha.id === 'eshu'
        ? 'In Lucumí and Yorùbá practice Èṣù / Elegguá is honored first in every ceremony, before any other Orisha.'
        : `In Lucumí and Yorùbá practice Èṣù / Elegguá is acknowledged first, before approaching ${orisha.name}.`;
  }

  let symbolicAction = `Hold your chosen focal objects in your hands. Light a ${colorStr || 'white'} candle, watching the flame as a symbol of your focused will.`;
  if (owner && offerings.length > 0) {
    const offered = joinList(offerings.slice(0, 3).map((o) => inline(o)), 'and');
    symbolicAction += ` Present offerings traditionally given to ${owner.name}, such as ${offered}`;
    symbolicAction += numbers.length > 0 ? `, arranged in groups of ${joinList(numbers.map(String), 'or')}.` : '.';
  } else if (herbs.length > 0) {
    symbolicAction += ' If you have herbs, you may burn them safely or arrange them on your altar.';
  }
  symbolicAction += ' Let the symbols work on your unconscious mind.';

  let symbolicNotes: string | undefined;
  if (correspondence.taboos && correspondence.taboos.length > 0 && orisha) {
    symbolicNotes = `Keep away from ${orisha.name}'s altar: ${joinList(correspondence.taboos.map((t) => t.toLowerCase()), 'and')}.`;
  } else if (correspondence.tarotCards && correspondence.tarotCards.length > 0) {
    symbolicNotes = `Optional: place the ${correspondence.tarotCards[0]} card on your altar as a focal image.`;
  }

  return [
    { phase: 'Timing & Preparation', action: prepAction, notes: prepNotes },
    { phase: 'Sacred Space Setup', action: setupAction, notes: setupNotes },
    {
      phase: 'Focus Statement / Intention Setting',
      action: `State clearly and with feeling: "I open this space with the intention of ${focusSubject}." Breathe deeply three times, fully inhabiting your purpose.${entityNote}`,
    },
    { phase: 'Symbolic Actions', action: symbolicAction, notes: symbolicNotes },
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
  const entities = match.entities ?? [];
  const { correspondence, basis } = findCorrespondence(match.intent, entities, !!match.primaryEntityNamed);
  const ritualOutline = buildRitualOutline(correspondence, match.intent, entities);

  return {
    query,
    matchedIntent: match.intent,
    matchedEntities: entities,
    correspondences: correspondence,
    ritualOutline,
    basis,
    disclaimer: DISCLAIMER,
  };
}
