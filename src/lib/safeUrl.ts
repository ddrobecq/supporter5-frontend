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
