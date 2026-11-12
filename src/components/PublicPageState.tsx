import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';

export function PublicLoadingState() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: 360 }}>
      <CircularProgress />
    </Box>
  );
}

export function PublicNotFoundState({ entity }: { entity: string }) {
  return <Typography color="text.secondary">{entity} introuvable.</Typography>;
}

/** `entity` is a noun phrase completing "Impossible de charger …" (ex. "la fiche club"). */
export function PublicErrorState({ entity, onRetry }: { entity: string; onRetry?: () => void }) {
  return (
    <Stack spacing={1.5} role="alert" sx={{ alignItems: 'flex-start' }}>
      <Typography color="text.secondary">Impossible de charger {entity}. Vérifiez votre connexion ou réessayez plus tard.</Typography>
      {onRetry ? <Button variant="outlined" size="small" onClick={onRetry}>Réessayer</Button> : null}
    </Stack>
  );
}
