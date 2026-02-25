import sigilsData from '@/data/sigils.json';
import ifaSigilsData from '@/data/sigils_ifa_yoruba.json';

export interface SigilRecord {
  entityId: string;
  symbolName: string;
  symbolDescription: string;
  svgContent: string;
  viewBox: string;
}

const allSigils: SigilRecord[] = [
  ...(sigilsData as SigilRecord[]),
  ...(ifaSigilsData as SigilRecord[]),
];

export function getSigilByEntityId(entityId: string): SigilRecord | undefined {
  return allSigils.find((s) => s.entityId === entityId);
}

export function getSigilsForEntities(entityIds: string[]): SigilRecord[] {
  return entityIds
    .map((id) => getSigilByEntityId(id))
    .filter((s): s is SigilRecord => s !== undefined);
}
