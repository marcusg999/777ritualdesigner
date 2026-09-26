/**
 * The viewer's location for planetary hours, kept only in their own browser.
 * Rounded to two decimals (~1 km): sunrise moves by seconds over that
 * distance, so nothing more precise is ever stored.
 */
export interface SavedLocation {
  lat: number;
  lon: number;
}

const KEY = '777_location';
const listeners = new Set<() => void>();

function readRaw(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function isValidLocation(lat: number, lon: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

function parse(raw: string | null): SavedLocation | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<SavedLocation>;
    return typeof v.lat === 'number' && typeof v.lon === 'number' && isValidLocation(v.lat, v.lon)
      ? { lat: v.lat, lon: v.lon }
      : null;
  } catch {
    return null;
  }
}

let snapshotRaw: string | null = null;
let snapshot: SavedLocation | null = null;
// Where storage is blocked, the location still works for this session.
let memory: SavedLocation | null = null;

export function getLocationSnapshot(): SavedLocation | null {
  const raw = readRaw();
  if (raw === null && memory) return memory;
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshot = parse(raw);
  }
  return snapshot;
}

export function getServerLocation(): SavedLocation | null {
  return null;
}

export function subscribeLocation(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

/** Saves (or with null, forgets) the location. Returns false if storage is unavailable. */
export function setLocation(loc: SavedLocation | null): boolean {
  const round = (n: number) => Math.round(n * 100) / 100;
  memory = loc ? { lat: round(loc.lat), lon: round(loc.lon) } : null;
  let ok = true;
  try {
    if (memory) localStorage.setItem(KEY, JSON.stringify(memory));
    else localStorage.removeItem(KEY);
  } catch {
    ok = false;
  }
  listeners.forEach((l) => l());
  return ok;
}
