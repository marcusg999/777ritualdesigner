import type { CorrespondenceResult } from './types';

const STORAGE_KEY = '777_ritual_saved';
const EMPTY: CorrespondenceResult[] = [];

// localStorage can be unavailable (private mode, blocked site data) or full,
// and can hold malformed data — every access is guarded so saving never
// crashes the page and a bad value reads as an empty grimoire.
function readRaw(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): CorrespondenceResult[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    return Array.isArray(data) ? (data as CorrespondenceResult[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

const listeners = new Set<() => void>();

function write(results: CorrespondenceResult[] | null): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (results) localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    return false;
  } finally {
    listeners.forEach((l) => l());
  }
  return true;
}

export function getSavedResults(): CorrespondenceResult[] {
  return parse(readRaw());
}

// useSyncExternalStore needs a stable snapshot between changes.
let snapshotRaw: string | null = null;
let snapshot: CorrespondenceResult[] = EMPTY;

export function getSavedSnapshot(): CorrespondenceResult[] {
  const raw = readRaw();
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshot = parse(raw);
  }
  return snapshot;
}

export function getServerSnapshot(): CorrespondenceResult[] {
  return EMPTY;
}

export function subscribeSaved(listener: () => void): () => void {
  listeners.add(listener);
  // Saves made in another tab arrive as storage events.
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/** Returns false if the browser refused to store the ritual. */
export function saveResult(result: CorrespondenceResult): boolean {
  const filtered = getSavedResults().filter((r) => r.query !== result.query);
  return write([result, ...filtered].slice(0, 50));
}

export function deleteResult(query: string): void {
  write(getSavedResults().filter((r) => r.query !== query));
}

export function clearAllResults(): void {
  write(null);
}
