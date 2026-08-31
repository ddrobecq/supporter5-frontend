import { CLUB_INCOMPLET_CATEGORIES } from '../incomplets/incompletsApi';

export interface ClubMissingItem {
  key: string;
  label: string;
}

export interface ClubCompletenessInput {
  natioId: string;
  villeId: string;
  hasStade: boolean;
  hasCreationDate: boolean;
  hasLogo: boolean;
}

/** Miroir cote front des regles de back/src/services/incomplets.service.ts (getClubsIncomplets). */
export function getClubCompleteness(input: ClubCompletenessInput): ClubMissingItem[] {
  const flags: Record<string, boolean> = {
    pays: !input.natioId.trim(),
    ville: !input.villeId.trim(),
    stade: !input.hasStade,
    création: !input.hasCreationDate,
    logo: !input.hasLogo,
  };

  return CLUB_INCOMPLET_CATEGORIES
    .filter((category) => flags[category.key])
    .map((category) => ({ key: category.key, label: category.label }));
}
