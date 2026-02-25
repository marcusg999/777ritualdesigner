import { getOfferingsByEntityId, getOfferingsForEntities } from '@/lib/offerings';

describe('getOfferingsByEntityId', () => {
  it('returns offerings for a known Orisha entity', () => {
    const record = getOfferingsByEntityId('obatala');
    expect(record).toBeDefined();
    expect(record?.entityId).toBe('obatala');
    expect(record?.tradition).toBe('Ifá/Yorùbá');
    expect(Array.isArray(record?.commonOfferings)).toBe(true);
    expect(Array.isArray(record?.symbolism)).toBe(true);
    expect(Array.isArray(record?.ritualObjects)).toBe(true);
    expect(Array.isArray(record?.cautions)).toBe(true);
  });

  it('returns undefined for an unknown entity', () => {
    const record = getOfferingsByEntityId('nonexistent');
    expect(record).toBeUndefined();
  });

  it('returns correct offerings for each of the 9 Orishas', () => {
    const ids = ['obatala', 'yemaya', 'shango', 'ogun', 'eshu', 'oshun', 'ifa', 'oya', 'orunmila'];
    for (const id of ids) {
      const record = getOfferingsByEntityId(id);
      expect(record).toBeDefined();
      expect(record?.entityId).toBe(id);
      expect(record?.commonOfferings.length).toBeGreaterThan(0);
      expect(record?.cautions.length).toBeGreaterThan(0);
    }
  });
});

describe('getOfferingsForEntities', () => {
  it('returns offerings for multiple entity IDs', () => {
    const records = getOfferingsForEntities(['obatala', 'oshun']);
    expect(records).toHaveLength(2);
    expect(records.map((r) => r.entityId)).toContain('obatala');
    expect(records.map((r) => r.entityId)).toContain('oshun');
  });

  it('filters out unknown entity IDs', () => {
    const records = getOfferingsForEntities(['obatala', 'aphrodite', 'oshun']);
    expect(records).toHaveLength(2);
    expect(records.map((r) => r.entityId)).not.toContain('aphrodite');
  });

  it('returns empty array for all unknown IDs', () => {
    const records = getOfferingsForEntities(['zeus', 'odin']);
    expect(records).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    const records = getOfferingsForEntities([]);
    expect(records).toEqual([]);
  });
});
