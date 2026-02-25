import type { CorrespondenceResult } from './types';

const STORAGE_KEY = '777_ritual_saved';

export function getSavedResults(): CorrespondenceResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CorrespondenceResult[];
  } catch {
    return [];
  }
}

export function saveResult(result: CorrespondenceResult): void {
  if (typeof window === 'undefined') return;
  const existing = getSavedResults();
  const filtered = existing.filter((r) => r.query !== result.query);
  const updated = [result, ...filtered].slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function deleteResult(query: string): void {
  if (typeof window === 'undefined') return;
  const existing = getSavedResults();
  const updated = existing.filter((r) => r.query !== query);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function clearAllResults(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
