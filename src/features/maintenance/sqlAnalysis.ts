const MUTATION_KEYWORDS = /\b(insert|update|delete|replace|drop|alter|create|truncate|vacuum|attach|detach|reindex|begin|commit|rollback|savepoint|release)\b/i;
const READ_ONLY_START = /^(select|with|explain|pragma)\b/i;

/** Retire commentaires et litteraux texte pour que l'analyse ne se fasse pas piéger par les données. */
function stripSqlNoise(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .replace(/'(?:[^']|'')*'/g, "''")
    .trim();
}

/**
 * Determine si la requete doit etre confirmee avant execution.
 * Analyse volontairement prudente : au moindre doute on demande confirmation.
 * Le backend reste l'autorite finale (il refuse toute ecriture non confirmee),
 * donc un faux negatif ici ne peut pas laisser passer une modification silencieuse.
 */
export function requiresConfirmation(sql: string): boolean {
  const cleaned = stripSqlNoise(sql).replace(/;\s*$/, '').trim();
  if (!cleaned) return false;
  // Plusieurs instructions enchainees : traitees comme un script modifiant.
  if (cleaned.includes(';')) return true;
  if (MUTATION_KEYWORDS.test(cleaned)) return true;
  return !READ_ONLY_START.test(cleaned);
}
