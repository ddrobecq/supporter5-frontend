/** Formate une date base (YYYYMMDD ou YYYY-MM-DD) en JJ/MM/AAAA. */
export function formatDateFr(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (raw.includes('-')) {
    const [year, month, day] = raw.split('-');
    return `${day}/${month}/${year}`;
  }
  if (raw.length < 8) return raw;
  return `${raw.substring(6, 8)}/${raw.substring(4, 6)}/${raw.substring(0, 4)}`;
}

/** Formate un timestamp ISO en "JJ/MM/AAAA HH:mm" (heure locale). */
export function formatDateTimeFr(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()} ${hours}:${minutes}`;
}

const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Formate une date base en "JJ mmm AAAA"; l'annee est omise si c'est l'annee courante. */
export function formatDateLong(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  let year: string;
  let month: string;
  let day: string;
  if (raw.includes('-')) {
    [year, month, day] = raw.split('-');
  } else if (raw.length >= 8) {
    year = raw.substring(0, 4);
    month = raw.substring(4, 6);
    day = raw.substring(6, 8);
  } else {
    return raw;
  }

  const monthLabel = MONTHS_FR[Number(month) - 1] ?? month;
  const dayLabel = String(Number(day));
  const currentYear = new Date().getFullYear();
  return Number(year) === currentYear ? `${dayLabel} ${monthLabel}` : `${dayLabel} ${monthLabel} ${year}`;
}
