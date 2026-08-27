import StadiumRoundedIcon from '@mui/icons-material/StadiumRounded';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import type { GridRowId } from '@mui/x-data-grid';
import { TerrainPage } from './TerrainPage';

interface TerrainPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (payload: { rowId: GridRowId; label: string }) => void;
}

export function TerrainPickerDialog({ open, onClose, onSelect }: TerrainPickerDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      slotProps={{
        paper: {
          sx: {
            height: 'min(90vh, 980px)',
          },
        },
      }}
    >
      <DialogTitle sx={{ pr: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
            <StadiumRoundedIcon sx={{ fontSize: 18 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Sélectionner un Stade</Typography>
          </Box>
          <IconButton aria-label="Fermer la liste des stades" onClick={onClose}>
            <CloseRoundedIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2, bgcolor: 'background.default', overflow: 'hidden', display: 'flex', minHeight: 0, minWidth: 0 }}>
        <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', '& > *': { flex: 1, minHeight: 0, minWidth: 0 } }}>
          <TerrainPage
            variant="modalPicker"
            onOpenInTab={(payload) => {
              onSelect(payload);
              onClose();
            }}
          />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
