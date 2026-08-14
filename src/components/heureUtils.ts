export function normalizeHeureDigits(value: unknown): string {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === 'null' || raw.toLowerCase() === 'undefined') return '';

  if (/^\d{2}:\d{2}$/.test(raw)) {
    return raw.replace(':', '');
  }
  if (/^\d{2}h\d{2}$/i.test(raw)) {
    return raw.replace(/h/i, '');
  }

  return raw.replace(/\D+/g, '').slice(0, 4);
}

export function sanitizeHeureDigits(value: string): string {
  const digits = value.replace(/\D+/g, '').slice(0, 4);
  if (digits.length < 2) {
    return digits;
  }

  const hour = Math.min(23, Number(digits.slice(0, 2)));
  const hourDigits = String(hour).padStart(2, '0');

  if (digits.length === 2) {
    return hourDigits;
  }
  if (digits.length === 3) {
    return `${hourDigits}${digits[2]}`;
  }

  const minute = Math.min(59, Number(digits.slice(2, 4)));
  const minuteDigits = String(minute).padStart(2, '0');
  return `${hourDigits}${minuteDigits}`;
}

export function isCompleteHeureDigits(value: string): boolean {
  return /^\d{4}$/.test(value);
}

export function isValidHeureDigits(value: string): boolean {
  if (/^\d{2}$/.test(value)) {
    return Number(value) <= 23;
  }
  if (!/^\d{4}$/.test(value)) {
    return false;
  }
  const hour = Number(value.slice(0, 2));
  const minute = Number(value.slice(2, 4));
  return hour <= 23 && minute <= 59;
}

export function formatHeureDigitsForInput(value: string): string {
  const digits = sanitizeHeureDigits(value);
  if (digits.length < 2) {
    return digits;
  }
  if (digits.length === 2) {
    return `${digits}h`;
  }
  return `${digits.slice(0, 2)}h${digits.slice(2)}`;
}

export function formatHeureDisplay(value: unknown): string {
  const digits = normalizeHeureDigits(value);
  if (!digits) return '';
  if (digits.length === 4) {
    return `${digits.slice(0, 2)}h${digits.slice(2)}`;
  }
  return formatHeureDigitsForInput(digits);
}

export function heureDigitsToApiValue(value: string): string {
  const digits = sanitizeHeureDigits(value);
  if (digits.length === 2) {
    if (!isValidHeureDigits(digits)) return '';
    return `${digits}:00`;
  }
  if (!isCompleteHeureDigits(digits) || !isValidHeureDigits(digits)) return '';
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}
