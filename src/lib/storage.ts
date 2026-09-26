import type { RitualOptions } from './ritual';

const STORAGE_KEY = '777_ritual_saved';

/**
 * A saved ritual is its recipe — the query and options — not a snapshot of
 * the result. It is rebuilt when opened, so corrections to the data reach
 * rituals saved before them.
 */
export interface SavedRitual extends RitualOptions {
  query: string;
  /** ISO timestamp; absent for rituals saved before this format existed. */
  savedAt?: string;
}

const EMPTY: SavedRitual[] = [];

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

/**
 * Accepts both the current format and the legacy one, which stored the full
 * result: its query is kept, and its options are recovered from what it
 * contains (pop-culture matches, an attached reflection).
 */
function toSavedRitual(item: unknown): SavedRitual | null {
  if (!item || typeof item !== 'object') return null;
  const v = item as Record<string, unknown>;
  if (typeof v.query !== 'string' || !v.query.trim()) return null;
  if (typeof v.includePopCulture === 'boolean' && typeof v.reflection === 'boolean') {
    return {
      query: v.query,
      includePopCulture: v.includePopCulture,
      reflection: v.reflection,
      savedAt: typeof v.savedAt === 'string' ? v.savedAt : undefined,
    };
  }
  const matched = Array.isArray(v.matchedEntities) ? (v.matchedEntities as Array<{ isPopCulture?: boolean }>) : [];
  return {
    query: v.query,
    includePopCulture: matched.some((e) => e?.isPopCulture === true),
    reflection: !!v.enrichment,
  };
}

export function parseSaved(raw: string | null): SavedRitual[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    return data.map(toSavedRitual).filter((r): r is SavedRitual => r !== null);
  } catch {
    return EMPTY;
  }
}

const listeners = new Set<() => void>();

function write(rituals: SavedRitual[] | null): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (rituals) localStorage.setItem(STORAGE_KEY, JSON.stringify(rituals));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    return false;
  } finally {
    listeners.forEach((l) => l());
  }
  return true;
}

export function getSavedRituals(): SavedRitual[] {
  return parseSaved(readRaw());
}

// useSyncExternalStore needs a stable snapshot between changes.
let snapshotRaw: string | null = null;
let snapshot: SavedRitual[] = EMPTY;

export function getSavedSnapshot(): SavedRitual[] {
  const raw = readRaw();
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshot = parseSaved(raw);
  }
  return snapshot;
}

export function getServerSnapshot(): SavedRitual[] {
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
export function saveRitual(ritual: SavedRitual): boolean {
  const others = getSavedRituals().filter((r) => r.query !== ritual.query);
  return write([{ ...ritual, savedAt: ritual.savedAt ?? new Date().toISOString() }, ...others].slice(0, 50));
}

export function deleteRitual(query: string): void {
  write(getSavedRituals().filter((r) => r.query !== query));
}

export function clearAllRituals(): void {
  write(null);
}
