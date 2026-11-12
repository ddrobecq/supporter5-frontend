import { Box, Tooltip, Typography } from '@mui/material';
import { useEntityImage } from '../lib/useEntityImage';
import { useNatio } from '../features/natio/natioStore';

interface NatioFlagProps {
  idnatio: string | null | undefined;
  name?: string | null;
  showLocal?: boolean;
}

export function NatioFlag({ idnatio, name, showLocal = false }: NatioFlagProps) {
  const normalized = String(idnatio ?? '').trim();
  const { src } = useEntityImage('natio', normalized || null);
  const { natio, loaded } = useNatio(normalized || null);

  // Identifiant absent de la liste ou liste en erreur : nom = name ?? id, NALOCAL = 0.
  const pays = String(natio?.PAYS ?? '').trim();
  const resolvedName = natio ? (pays || normalized) : (name ?? normalized);
  const nalocal = loaded ? Number(natio?.NALOCAL ?? 0) : null;

  // NALOCAL = 1 means a local/fictional nationality — don't display
  if (!normalized || nalocal === null || (!showLocal && nalocal !== 0)) return null;

  const tooltipTitle = resolvedName || normalized;

  return (
    <Tooltip title={tooltipTitle} placement="top">
      {src ? (
        <Box
          component="img"
          src={src}
          alt={tooltipTitle}
          sx={{
            height: '1em',
            width: 'auto',
            display: 'inline-block',
            verticalAlign: 'middle',
            objectFit: 'contain',
            borderRadius: '1px',
          }}
        />
      ) : (
        <Typography
          component="span"
          variant="inherit"
          sx={{ fontStyle: 'normal', verticalAlign: 'middle', fontSize: 'inherit' }}
        >
          {normalized}
        </Typography>
      )}
    </Tooltip>
  );
}
