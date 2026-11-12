/** Valeurs du champ ETAT d'une rencontre. */
export const MatchEtat = {
  EnAttente: 1,
  EnCours: 2,
  Terminee: 3,
  NonJoueeAnnulee: 4,
  Programmee: 5,
} as const;

export type MatchEtatValue = (typeof MatchEtat)[keyof typeof MatchEtat];

/** Options de statut, dans l'ordre d'affichage des listes de selection. */
export const MATCH_STATUS_OPTIONS = [
  { value: MatchEtat.EnAttente, label: 'En attente' },
  { value: MatchEtat.EnCours, label: 'En cours' },
  { value: MatchEtat.Terminee, label: 'Terminée' },
  { value: MatchEtat.Programmee, label: 'Programmée' },
  { value: MatchEtat.NonJoueeAnnulee, label: 'Non jouée / Annulée' },
] as const;

export function getMatchStatusLabel(value: number): string {
  return MATCH_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? `État ${value}`;
}

/** Rencontre en cours ou terminee (score significatif). */
export function isMatchPlayed(etat: number): boolean {
  return etat === MatchEtat.EnCours || etat === MatchEtat.Terminee;
}

export function canEditScore(etat: number): boolean {
  return etat !== MatchEtat.NonJoueeAnnulee && etat !== MatchEtat.Programmee;
}

export function rowStatusClass(etat: number): string {
  switch (Number(etat)) {
    case MatchEtat.EnAttente:
      return 'status-en-attente';
    case MatchEtat.EnCours:
      return 'status-en-cours';
    case MatchEtat.Terminee:
      return 'status-terminee';
    case MatchEtat.Programmee:
      return 'status-programmee';
    case MatchEtat.NonJoueeAnnulee:
      return 'status-non-jouee';
    default:
      return 'status-default';
  }
}

export function scoreToInputValue(value: unknown): string {
  if (value === null || value === undefined) return '0';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';
  return String(Math.max(0, Math.trunc(numeric)));
}

export function parseScoreInputValue(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.trunc(numeric);
}
