import { Avatar, Stack, Typography } from '@mui/material';
import SportsIcon from '@mui/icons-material/Sports';
import { NatioFlag } from './NatioFlag';
import { useEntityImage } from '../lib/useEntityImage';

export interface ArbitreIdentityData {
  IDARBITRE: string;
  NOM?: string | null;
  PRENOM?: string | null;
  IDNATIO?: string | null;
}

/** Affichage generique d'un arbitre (meme principe que JoueurIdentityDisplay): photo + nom + drapeau. */
export function ArbitreStatIdentityDisplay({ arbitre, size = 30 }: { arbitre: ArbitreIdentityData; size?: number }) {
  const { src } = useEntityImage('arbitre', arbitre.IDARBITRE);
  const nom = arbitre.NOM?.trim() ? arbitre.NOM.toUpperCase() : '';
  const prenom = arbitre.PRENOM?.trim() ?? '';
  const label = `${nom}${prenom ? ` ${prenom}` : ''}` || arbitre.IDARBITRE;

  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Avatar src={src ?? undefined} sx={{ width: size, height: size, bgcolor: 'grey.300', flexShrink: 0 }}>
        {!src && <SportsIcon sx={{ fontSize: Math.round(size * 0.58) }} />}
      </Avatar>
      <Typography
        variant="body2"
        sx={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {label}
      </Typography>
      {arbitre.IDNATIO ? <NatioFlag idnatio={arbitre.IDNATIO} /> : null}
    </Stack>
  );
}
