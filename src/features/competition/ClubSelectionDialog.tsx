import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import { ClubPage } from '../club/ClubPage';
import type { ClubGridRow } from '../club/types';

interface ClubSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (clubId: string, club?: ClubGridRow) => void;
}

export function ClubSelectionDialog({ open, onClose, onSelect }: ClubSelectionDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xl" slotProps={{ paper: { sx: { height: 'min(90vh, 980px)' } } }}>
      <DialogTitle>Sélectionner un club</DialogTitle>
      <DialogContent dividers sx={{ p: 2, bgcolor: '#eef2f6', overflow: 'hidden', display: 'flex', minHeight: 0 }}>
        <ClubPage
          variant="modalPicker"
          onSelectClub={(club) => {
            onSelect(String(club.IDCLUB), club);
            onClose();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
