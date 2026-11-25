// Anonymous visitor identifier used for audience measurement, plus the visitor's opt-out choice.
const TRAFFIC_VISITOR_STORAGE_KEY = 'supporter:trafic:visitor:v1';
const TRAFFIC_OPT_OUT_STORAGE_KEY = 'supporter:trafic:opt-out:v1';

// The identifier lives 13 months from its creation date; visits do not extend it.
const VISITOR_LIFETIME_MONTHS = 13;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

interface StoredTrafficVisitor {
  id: string;
  createdAt: string;
}

function isStillValid(value: unknown, now: Date): value is StoredTrafficVisitor {
  if (typeof value !== 'object' || value === null) return false;
  const { id, createdAt } = value as Partial<StoredTrafficVisitor>;
  if (typeof id !== 'string' || !UUID_PATTERN.test(id) || typeof createdAt !== 'string') return false;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime()) || created > now) return false;
  const expiresAt = new Date(created);
  expiresAt.setMonth(expiresAt.getMonth() + VISITOR_LIFETIME_MONTHS);
  return now < expiresAt;
}

function parseStoredVisitor(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    // Unreadable value: treated as missing, a new identifier replaces it.
    return null;
  }
}

/** Returns the persistent visitor id (created or renewed if needed), or null when storage is unavailable. */
export function getTrafficVisitorId(): string | null {
  try {
    const now = new Date();
    const stored = parseStoredVisitor(window.localStorage.getItem(TRAFFIC_VISITOR_STORAGE_KEY));
    if (isStillValid(stored, now)) return stored.id;

    if (typeof crypto?.randomUUID !== 'function') return null;
    const visitor: StoredTrafficVisitor = { id: crypto.randomUUID().toLowerCase(), createdAt: now.toISOString() };
    window.localStorage.setItem(TRAFFIC_VISITOR_STORAGE_KEY, JSON.stringify(visitor));
    return visitor.id;
  } catch {
    // localStorage unavailable (privacy mode, disabled or full storage): send no id, the back falls back on its own.
    return null;
  }
}

export function isTrafficOptedOut(): boolean {
  try {
    return window.localStorage.getItem(TRAFFIC_OPT_OUT_STORAGE_KEY) === '1';
  } catch {
    // Storage unavailable: the choice could never have been saved, so no opt-out is recorded.
    return false;
  }
}

/** Saves the opt-out choice; opting out also deletes the visitor id. Returns false if storage failed. */
export function setTrafficOptOut(optOut: boolean): boolean {
  try {
    if (optOut) {
      window.localStorage.setItem(TRAFFIC_OPT_OUT_STORAGE_KEY, '1');
      window.localStorage.removeItem(TRAFFIC_VISITOR_STORAGE_KEY);
    } else {
      window.localStorage.removeItem(TRAFFIC_OPT_OUT_STORAGE_KEY);
    }
    return true;
  } catch {
    // Storage unavailable: the choice cannot be persisted, report failure to the caller.
    return false;
  }
}
