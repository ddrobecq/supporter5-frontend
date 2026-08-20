import { Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { JoueurIdentityDisplay } from '../../../components/JoueurIdentityDisplay';
import type { StatPlayerRow } from './StatPlayerGrid';

/** Cellule "phrase" des stats joueur: identite generique + suite de la phrase (+ contenu flex final). */
export function StatPlayerSentence({ joueur, children, trailing }: { joueur: StatPlayerRow; children: ReactNode; trailing?: ReactNode }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
      <JoueurIdentityDisplay joueur={joueur} />
      <Typography
        variant="body2"
        sx={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {children}
      </Typography>
      {trailing}
    </Stack>
  );
}
