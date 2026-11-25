import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { formatDateLong } from '../../lib/formatDate';
import type { TourMalusRow } from './types';

interface TourMalusListDialogProps {
  open: boolean;
  participantLabel: string;
  /** Draft malus of the participant. */
  rows: TourMalusRow[];
  onClose: () => void;
  onAdd: () => void;
  onEdit: (malusId: number) => void;
  onRemove: (malusId: number) => void;
}

/** Lists the draft malus of one participant, with add / edit / remove actions. */
export function TourMalusListDialog({ open, participantLabel, rows, onClose, onAdd, onEdit, onRemove }: TourMalusListDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{`Malus — ${participantLabel}`}</DialogTitle>
      <DialogContent>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Aucun malus.</Typography>
        ) : (
          <Table size="small" aria-label={`Malus de ${participantLabel}`}>
            <TableHead>
              <TableRow>
                <TableCell align="right">Points</TableCell>
                <TableCell>Motif</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="right" sx={{ width: 88 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((malus) => {
                const malusId = Number(malus.MLCLEUNIK);
                const date = formatDateLong(malus.MLDate);
                const description = `${malus.MLPoints} points${date ? ` du ${date}` : ''}`;
                return (
                  <TableRow key={malusId} hover>
                    <TableCell align="right">{`−${malus.MLPoints}`}</TableCell>
                    <TableCell>{malus.MLMotif ?? ''}</TableCell>
                    <TableCell>{date}</TableCell>
                    <TableCell align="right" sx={{ py: 0 }}>
                      <Tooltip title="Modifier">
                        <IconButton size="small" color="primary" aria-label={`Modifier le malus de ${description}`} onClick={() => onEdit(malusId)}>
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton size="small" color="error" aria-label={`Supprimer le malus de ${description}`} onClick={() => onRemove(malusId)}>
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions>
        <Button startIcon={<AddCircleOutlineRoundedIcon />} onClick={onAdd}>Ajouter</Button>
        <Button onClick={onClose} color="inherit">Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
