/** Vrai si la valeur est une URL absolue en `http:` ou `https:` (refuse `javascript:`, `data:`...). */
export function isHttpUrl(value: string | null | undefined): boolean {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return false;
  try {
    const { protocol } = new URL(trimmed);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    // URL relative ou mal formee : non autorisee.
    return false;
  }
}

/**
 * Forme canonique d'une URL saisie (`new URL(...).toString()`, comme le faisait le back), a appliquer
 * a la sortie du champ. Une saisie qui n'est pas une URL valide est rendue telle quelle : le back la refusera.
 */
export function normalizeUrlInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return value;
  try {
    return new URL(trimmed).toString();
  } catch {
    // Not a valid URL: keep the input as typed so the user can fix it.
    return value;
  }
}
