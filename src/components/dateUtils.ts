export type DatePart = 'year' | 'month' | 'day';

export interface DateParts {
  day: string;
  month: string;
  year: string;
}

export const PART_ORDER: DatePart[] = ['day', 'month', 'year'];

export const INVALID_DATE_MESSAGE = 'Date invalide';

// Date reading, validation and serialization are centralized in this module
// (parseDateText, findInvalidDatePart, serializeDateParts) so that new formats, such as
// partial dates with an unknown day, can be supported in a single place.

/**
 * Structural parsing of every supported date text format, without calendar validation.
 * Supported: YYYY-MM-DD (optionally followed by a time), YYYY/MM/DD, DD/MM/YYYY.
 */
function parseDateText(value: unknown): DateParts | null {
  const text = String(value ?? '').trim();

  const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
    ?? text.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (ymd) {
    return { year: ymd[1], month: ymd[2], day: ymd[3] };
  }

  const dmy = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) {
    return { day: dmy[1], month: dmy[2], year: dmy[3] };
  }

  return null;
}

function isEmptyDateParts(parts: DateParts): boolean {
  return !parts.day && !parts.month && !parts.year;
}

export function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

/** Oldest accepted year, kept in sync with the API (back/src/lib/dates.ts). */
export const MIN_DATE_YEAR = 1800;

/** Returns the first part preventing the parts from forming a complete, real calendar date. */
export function findInvalidDatePart(parts: DateParts): DatePart | null {
  if (parts.day.length !== 2) return 'day';
  if (parts.month.length !== 2) return 'month';
  if (parts.year.length !== 4 || Number(parts.year) < MIN_DATE_YEAR) return 'year';
  if (!isValidCalendarDate(Number(parts.year), Number(parts.month), Number(parts.day))) return 'day';
  return null;
}

/** ISO `YYYY-MM-DD` for a complete valid date (year >= MIN_DATE_YEAR), '' when all parts are empty, null otherwise. */
export function serializeDateParts(parts: DateParts): string | null {
  if (isEmptyDateParts(parts)) return '';
  if (findInvalidDatePart(parts)) return null;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Converts a date in any supported format to ISO `YYYY-MM-DD`; returns '' when empty or invalid. */
export function toIsoDate(value: unknown): string {
  const parts = parseDateText(value);
  if (!parts) return '';
  return serializeDateParts(parts) ?? '';
}

/** ISO `YYYY-MM-DD` for API payloads; null when empty or invalid. */
export function isoDateOrNull(value: unknown): string | null {
  return toIsoDate(value) || null;
}

export function splitDisplayDate(value: string): DateParts {
  const parsed = parseDateText(value);
  if (parsed) {
    return parsed;
  }

  const digits = String(value ?? '').replace(/\D+/g, '').slice(0, 8);
  return {
    day: digits.slice(0, 2),
    month: digits.slice(2, 4),
    year: digits.slice(4, 8),
  };
}

export function sanitizePartDigits(value: string, maxLength: number): string {
  return value.replace(/\D+/g, '').slice(0, maxLength);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeDatePartValue(part: DatePart, value: string): string {
  const maxLength = part === 'year' ? 4 : 2;
  const digits = sanitizePartDigits(value, maxLength);

  if (part === 'year') {
    if (digits.length === 2) {
      return `20${digits}`;
    }
    return digits;
  }

  if (!digits) {
    return '';
  }

  const numeric = Number(digits);
  if (!Number.isFinite(numeric)) {
    return '';
  }

  if (part === 'month') {
    return String(clampNumber(numeric, 1, 12)).padStart(2, '0');
  }

  return String(clampNumber(numeric, 1, 31)).padStart(2, '0');
}

export function normalizeDateParts(parts: DateParts): DateParts {
  return {
    day: normalizeDatePartValue('day', parts.day),
    month: normalizeDatePartValue('month', parts.month),
    year: normalizeDatePartValue('year', parts.year),
  };
}

export function nextFieldIndex(currentIndex: number, shift: boolean): number | null {
  if (shift) {
    return currentIndex > 0 ? currentIndex - 1 : null;
  }
  return currentIndex < 2 ? currentIndex + 1 : null;
}

/** `YYYY-MM-DD` of a date in LOCAL time (unlike `toISOString()`, which is UTC). */
export function toLocalIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Today's local date as `YYYY-MM-DD`. */
export function todayIso(): string {
  return toLocalIsoDate(new Date());
}

/** Adds `days` to an ISO `YYYY-MM-DD` date (local calendar); returns '' when `iso` is not a valid ISO date. */
export function addDaysIso(iso: string, days: number): string {
  const match = String(iso ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (!isValidCalendarDate(year, month, day)) return '';
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return toLocalIsoDate(date);
}

/** Parses an API date (ISO `YYYY-MM-DD`) into a local Date at midnight; null when empty or invalid. */
export function parseDbDate(value: unknown): Date | null {
  const text = String(value ?? '').trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (!isValidCalendarDate(year, month, day)) return null;
  return new Date(year, month - 1, day);
}

/** True when both dates fall on the same local calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function todayOffset(delta: number): string {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return toLocalIsoDate(d);
}

/** Short French display of a date (Auj./Hier/Demain, `DD-mmm`, `DD-mmm-YYYY`); unparseable input is returned trimmed. */
export function formatDateShort(value: unknown): string {
  const iso = toIsoDate(value);
  if (!iso) return String(value ?? '').trim();
  if (iso === todayOffset(0)) return 'Auj.';
  if (iso === todayOffset(-1)) return 'Hier';
  if (iso === todayOffset(1)) return 'Demain';
  const date = new Date(`${iso}T00:00:00`);
  if (isNaN(date.getTime())) return iso;
  const dd = String(date.getDate()).padStart(2, '0');
  const mmm = date.toLocaleString('fr-FR', { month: 'short' }).replace('.', '');
  const yyyy = date.getFullYear();
  if (yyyy === new Date().getFullYear()) return `${dd}-${mmm}`;
  return `${dd}-${mmm}-${yyyy}`;
}
