import { Avatar, Stack, Tooltip, Typography } from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import FiberManualRecordRoundedIcon from '@mui/icons-material/FiberManualRecordRounded';
import { NatioFlag } from './NatioFlag';
import { useEntityImage } from '../lib/useEntityImage';

export interface JoueurIdentityData {
  IDJOUEUR: string;
  NOM?: string | null;
  PRENOM?: string | null;
  SURNOM?: string | null;
  IDNATIO?: string | null;
  EN_CLUB?: number | boolean | null;
}

export function JoueurClubIndicator() {
  return (
    <Tooltip title="Joueur encore au club">
      <FiberManualRecordRoundedIcon
        aria-label="Joueur encore au club"
        sx={{
          color: 'success.main',
          fontSize: 8,
          verticalAlign: 'baseline',
          position: 'relative',
          top: '-0.45em',
          ml: 0.25,
          animation: 'supporter-club-indicator-blink 1.4s ease-in-out infinite',
          '@keyframes supporter-club-indicator-blink': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.2 },
          },
        }}
      />
    </Tooltip>
  );
}

interface JoueurIdentityDisplayProps {
  joueur: JoueurIdentityData;
  size?: number;
}

/** Affichage generique d'un joueur: photo + surnom (ou nom+prenom) + drapeau de sa natio. */
export function JoueurIdentityDisplay({ joueur, size = 30 }: JoueurIdentityDisplayProps) {
  const { src } = useEntityImage('joueurrg', joueur.IDJOUEUR);
  const surnom = joueur.SURNOM?.trim();
  const nom = joueur.NOM?.trim() ? joueur.NOM.toUpperCase() : '';
  const prenom = joueur.PRENOM?.trim() ?? '';
  const label = surnom || `${nom}${prenom ? ` ${prenom}` : ''}` || joueur.IDJOUEUR;

  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Avatar src={src ?? undefined} sx={{ width: size, height: size, bgcolor: 'grey.300', flexShrink: 0 }}>
        {!src && <PersonRoundedIcon sx={{ fontSize: Math.round(size * 0.58) }} />}
      </Avatar>
      <Typography
        variant="body2"
        sx={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {label}
      </Typography>
      {joueur.EN_CLUB ? <JoueurClubIndicator /> : null}
      {joueur.IDNATIO ? <NatioFlag idnatio={joueur.IDNATIO} /> : null}
    </Stack>
  );
}
