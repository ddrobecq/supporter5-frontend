import { Box, Stack, Tooltip, Typography } from '@mui/material';

export interface CompletenessChipItem {
  key: string;
  label: string;
}

interface CompletenessChipProps {
  missing: CompletenessChipItem[];
}

/** Indicateur discret de complétude d'une fiche (Joueur/Club/Match) : aucun champ n'est rendu obligatoire, ceci ne fait qu'informer. */
export function CompletenessChip({ missing }: CompletenessChipProps) {
  if (missing.length === 0) return null;

  return (
    <Tooltip
      title={(
        <Stack spacing={0.25}>
          {missing.map((item) => (
            <Typography key={item.key} variant="caption" sx={{ display: 'block' }}>{item.label}</Typography>
          ))}
        </Stack>
      )}
    >
      <Box
        aria-label={`${missing.length} information${missing.length > 1 ? 's' : ''} manquante${missing.length > 1 ? 's' : ''}`}
        sx={{
          width: 20,
          height: 20,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'warning.main',
          color: 'warning.contrastText',
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1,
          cursor: 'default',
        }}
      >
        {missing.length}
      </Box>
    </Tooltip>
  );
}
