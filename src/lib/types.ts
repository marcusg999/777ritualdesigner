export interface Intent {
  id: string;
  label: string;
  tags: string[];
  description?: string;
  tradition?: string;
}

export interface Entity {
  id: string;
  name: string;
  tradition: string;
  type: 'deity' | 'angel' | 'demon' | 'spirit' | 'archetype' | 'pop-culture';
  description: string;
  tags: string[];
  isPopCulture?: boolean;
  isClosed?: boolean;
  sphere?: string;
}

export interface Correspondence {
  intentId?: string;
  entityId?: string;
  colors: string[];
  stones: string[];
  herbs: string[];
  metals: string[];
  scents: string[];
  timing: string;
  element: string;
  sphere: string;
  day?: string;
  planet?: string;
  zodiac?: string;
  tarotCards?: string[];
  runeAssociations?: string[];
  numerology?: number;
  // 777 Correspondences (Crowley)
  magicalWeapon?: string[];
  magicalPowers?: string[];
  virtue?: string;
  vice?: string;
  divineName?: string;
  animals?: string[];
  alchemicalProcess?: string;
  bodyPart?: string;
  // Witcheslore Correspondences
  flowers?: string[];
  woods?: string[];
  candleColor?: string;
  essentialOils?: string[];
  direction?: string;
  moonPhase?: string;
}

export interface RitualStep {
  phase: string;
  action: string;
  notes?: string;
}

export interface CorrespondenceResult {
  query: string;
  matchedIntent?: Intent;
  matchedEntities: Entity[];
  correspondences: Correspondence;
  ritualOutline: RitualStep[];
  enrichment?: EnrichmentData;
  disclaimer: string;
}

export interface EnrichmentData {
  additionalCorrespondences?: Partial<Correspondence>;
  additionalSteps?: RitualStep[];
  interpretation?: string;
  source: string;
}

export interface EnrichmentProvider {
  enrich(query: string, result: CorrespondenceResult): Promise<EnrichmentData>;
}

export interface MatchResult {
  score: number;
  intent?: Intent;
  entities: Entity[];
}
