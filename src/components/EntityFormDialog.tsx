import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import type { DialogProps } from '@mui/material';
import type { ReactNode } from 'react';

interface EntityFormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  saving?: boolean;
  onSave: () => void;
  children: ReactNode;
  maxWidth?: DialogProps['maxWidth'];
  fullWidth?: boolean;
  saveLabel?: string;
  savingLabel?: string;
  cancelLabel?: string;
}

export function EntityFormDialog({
  open,
  onClose,
  title,
  saving = false,
  onSave,
  children,
  maxWidth = 'sm',
  fullWidth = true,
  saveLabel = 'OK',
  savingLabel = 'Enregistrement...',
  cancelLabel = 'Annuler',
}: EntityFormDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth={fullWidth} maxWidth={maxWidth}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent sx={{ p: 0, overflowX: 'hidden' }}>
        <Box sx={{ px: 3, pt: 1.5, pb: 1.5 }}>
          <Stack spacing={2} sx={{ width: '100%' }}>
            {children}
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 1, justifyContent: 'flex-end' }}>
        <Button onClick={onClose} color="inherit">{cancelLabel}</Button>
        <Button onClick={onSave} variant="contained" disabled={saving}>
          {saving ? savingLabel : saveLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
