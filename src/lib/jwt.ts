/**
 * Decode le payload d'un JWT (base64url -> JSON) sans verifier la signature
 * (la verification reste du ressort de l'API). Retourne null si le jeton est mal forme.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : null;
  } catch {
    // Jeton illisible : traite comme invalide par l'appelant.
    return null;
  }
}

/** Vrai si le jeton est illisible, sans `exp` numerique, ou expire. */
export function isJwtExpired(token: string, now: number = Date.now()): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 <= now;
}
