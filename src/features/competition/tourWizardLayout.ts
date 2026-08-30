import type { SxProps, Theme } from '@mui/material';

/** Hauteur des grilles de l'assistant sur ecran etroit, quand les blocs sont empiles. */
export const WIZARD_GRID_COMPACT_HEIGHT = 286;

/** Hauteur minimale conservee quand la grille s'etire, pour rester utilisable sur un dialogue court. */
export const WIZARD_GRID_MIN_HEIGHT = 200;

/**
 * Conteneur de grille de l'assistant : hauteur fixe sur ecran etroit, et occupation de tout
 * l'espace vertical restant a partir du breakpoint `md` (mode ecran large).
 * Le parent doit etre un conteneur flex en colonne avec `minHeight: 0`.
 */
export const wizardGridBoxSx: SxProps<Theme> = {
  height: { xs: WIZARD_GRID_COMPACT_HEIGHT, md: 'auto' },
  flex: { xs: '0 0 auto', md: 1 },
  minHeight: { xs: WIZARD_GRID_COMPACT_HEIGHT, md: WIZARD_GRID_MIN_HEIGHT },
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
};

/** Bloc intermediaire qui doit propager la hauteur disponible jusqu'a la grille. */
export const wizardGridFillSx: SxProps<Theme> = {
  flex: 1,
  minHeight: 0,
};
