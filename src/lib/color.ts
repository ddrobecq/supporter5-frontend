const HEX_COLOR_PATTERN = /^#[0-9A-F]{6}$/i;

/** Club sans couleur : texte noir sur fond bleu. */
export const CLUB_DEFAULT_FOND = '#244A73';
export const CLUB_DEFAULT_TEXTE = '#000000';

/** Couleur stockee en base ('#RRGGBB' majuscules) ou null si absente / invalide. */
export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return HEX_COLOR_PATTERN.test(trimmed) ? trimmed.toUpperCase() : null;
}

/** Couleur '#RRGGBB' a afficher, ou `fallback` si la valeur est absente / invalide. */
export function hexColorOrDefault(value: unknown, fallback: string): string {
  return normalizeHexColor(value) ?? fallback;
}
