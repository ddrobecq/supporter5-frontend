export function buildCompetitionLabel(row: Record<string, unknown>): string {
  const nom = String(row.NOM ?? '').trim();
  const saison = String(row.SAISON ?? '').trim();
  return [nom, saison].filter(Boolean).join(' ');
}
