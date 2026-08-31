import { JOUEUR_INCOMPLET_CATEGORIES } from '../incomplets/incompletsApi';
import type { JoueurRow } from './types';

export interface JoueurMissingItem {
  key: string;
  label: string;
}

function isEmpty(value: unknown): boolean {
  return !String(value ?? '').trim();
}

/**
 * Miroir cote front des regles de back/src/services/incomplets.service.ts (getJoueursIncomplets).
 * "Matches incomplets" est exclu : c'est un agregat calcule sur l'historique, pas un champ de cette fiche.
 */
export function getJoueurCompleteness(values: JoueurRow, hasPortrait: boolean): JoueurMissingItem[] {
  const flags: Record<string, boolean> = {
    prenom: isEmpty(values.PRENOM),
    naissance: isEmpty(values.NAISSANCE),
    'lieu-naissance': isEmpty(values.IDVILLE),
    mensurations: Number(values.HAUTEUR ?? 0) === 0 || Number(values.POIDS ?? 0) === 0,
    portrait: !hasPortrait,
  };

  return JOUEUR_INCOMPLET_CATEGORIES
    .filter((category) => flags[category.key])
    .map((category) => ({ key: category.key, label: category.label }));
}
