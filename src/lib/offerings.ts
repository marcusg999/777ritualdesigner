import offeringsData from '@/data/offerings_ifa_yoruba.json';

export interface OfferingRecord {
  entityId: string;
  tradition: string;
  commonOfferings: string[];
  symbolism: string[];
  ritualObjects: string[];
  cautions: string[];
}

const offerings = offeringsData as OfferingRecord[];

export function getOfferingsByEntityId(entityId: string): OfferingRecord | undefined {
  return offerings.find((o) => o.entityId === entityId);
}

export function getOfferingsForEntities(entityIds: string[]): OfferingRecord[] {
  return entityIds
    .map((id) => getOfferingsByEntityId(id))
    .filter((o): o is OfferingRecord => o !== undefined);
}
