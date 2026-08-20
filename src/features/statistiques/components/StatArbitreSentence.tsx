import { Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { ArbitreStatIdentityDisplay, type ArbitreIdentityData } from '../../../components/ArbitreStatIdentityDisplay';

/** Cellule "phrase" des stats arbitre: identite generique + suite de la phrase (meme principe que StatPlayerSentence). */
export function StatArbitreSentence({ arbitre, children }: { arbitre: ArbitreIdentityData; children: ReactNode }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
      <ArbitreStatIdentityDisplay arbitre={arbitre} />
      <Typography
        variant="body2"
        sx={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {children}
      </Typography>
    </Stack>
  );
}
