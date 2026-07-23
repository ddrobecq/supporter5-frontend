import { Box, CircularProgress, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface CreateWizardSuggestionPanelProps<Row> {
  loading: boolean;
  rows: Row[];
  emptyText: string;
  getKey: (row: Row) => string | number;
  getPrimaryText: (row: Row) => ReactNode;
}

export function CreateWizardSuggestionPanel<Row>({
  loading,
  rows,
  emptyText,
  getKey,
  getPrimaryText,
}: CreateWizardSuggestionPanelProps<Row>) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, minHeight: 220, maxHeight: 220, overflowY: 'auto' }}>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1.25 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Recherche en cours...</Typography>
        </Box>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 1.25 }}>
          {emptyText}
        </Typography>
      ) : (
        <List dense disablePadding>
          {rows.map((row) => (
            <ListItemButton key={getKey(row)} sx={{ py: 0.4 }}>
              <ListItemText primary={getPrimaryText(row)} />
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
}