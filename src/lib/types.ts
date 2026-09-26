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
  /** Alternate names and spellings (e.g. Oggún, Ògún, Ogum for Ogun). */
  aliases?: string[];
  attributes?: string[];
  reasonsToInvoke?: string[];
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
  // Orisha correspondences (Lucumí / Yorùbá)
  /** Description of the eleke (beaded necklace) — its colors and pattern. */
  eleke?: string;
  /** All sacred numbers, when a tradition assigns more than one. */
  sacredNumbers?: number[];
  sacredPlaces?: string[];
  /** Emblems and working tools (herramientas). */
  tools?: string[];
  temperament?: string[];
  /** Catholic saint(s) the Orisha is syncretized with, by region. */
  syncretism?: string[];
  feastDay?: string;
  taboos?: string[];
  /** Which lineage's conventions the record follows, and caveats. */
  traditionNote?: string;
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
  /** Where the correspondences came from, so the UI can say so. */
  basis?: CorrespondenceBasis;
  enrichment?: EnrichmentData;
  disclaimer: string;
}

export interface CorrespondenceBasis {
  kind: 'entity' | 'intent' | 'planetary' | 'default';
  label: string;
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
  /** True when the query names the top entity (or an alias) directly. */
  primaryEntityNamed?: boolean;
}
