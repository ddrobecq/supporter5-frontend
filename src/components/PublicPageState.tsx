import { Box, CircularProgress, Typography } from '@mui/material';

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
