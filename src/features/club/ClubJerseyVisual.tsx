import type { SxProps, Theme } from '@mui/material';
import type { ReactNode } from 'react';
import { EntityImageFrame } from '../../components/EntityImageFrame';
import { CLUB_DEFAULT_FOND, CLUB_DEFAULT_TEXTE, hexColorOrDefault } from '../../lib/color';
import { createJerseyVisualDataUri } from './clubJerseySvg';

interface ClubJerseyVisualProps {
  /** Couleur de fond du club, '#RRGGBB' ; null ou invalide = defaut club. */
  fond: unknown;
  /** Couleur de texte du club, meme format que `fond`. */
  texte: unknown;
  clubName: string;
  /** Boutons superposes au survol (ex: pipettes de couleur en Admin). Absent en Public. */
  overlay?: ReactNode;
  sx?: SxProps<Theme>;
}

/** Visuel du maillot d'un club, couleurs derivees des champs FOND/TEXTE. Partage entre les fiches Admin et Public. */
export function ClubJerseyVisual({ fond, texte, clubName, overlay, sx }: ClubJerseyVisualProps) {
  const fondColor = hexColorOrDefault(fond, CLUB_DEFAULT_FOND);
  const texteColor = hexColorOrDefault(texte, CLUB_DEFAULT_TEXTE);
  const kitVisualSrc = createJerseyVisualDataUri(fondColor, texteColor, clubName);

  return (
    <EntityImageFrame
      width={132}
      height={150}
      src={kitVisualSrc}
      alt={`Maillot ${clubName}`.trim()}
      objectFit="contain"
      objectPosition="center top"
      imageSx={{ transform: 'translateY(-10px) scale(1.56)', transformOrigin: 'center 24%' }}
      sx={{
        bgcolor: 'background.paper',
        '&:hover .club-kit-actions, &:focus-within .club-kit-actions': {
          opacity: 1,
          pointerEvents: 'auto',
        },
        // EntityImageFrame merges `sx` with a plain object spread, not MUI's array-aware
        // sx merging, so this prop must stay a plain object rather than an array.
        ...sx,
      }}
      overlay={overlay}
    />
  );
}
