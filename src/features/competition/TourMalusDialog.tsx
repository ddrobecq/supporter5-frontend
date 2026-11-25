import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { useState } from 'react';
import { DateInputField } from '../../components/DateInputField';
import { NumberField } from '../../components/NumberField';
import type { TourMalusPayload } from './types';

export const MALUS_MOTIF_MAX_LENGTH = 100;

/** Malus fields edited by the dialog; the participant is fixed before opening it. */
export type TourMalusFormValues = Omit<TourMalusPayload, 'PACLEUNIK'>;

interface TourMalusDialogProps {
  open: boolean;
  /** Label of the participant the malus applies to, shown in the title. */
  participantLabel: string;
  /** Values of the malus being edited; null in creation mode. */
  initialValues: TourMalusFormValues | null;
  onClose: () => void;
  onSubmit: (values: TourMalusFormValues) => void;
}

/**
 * Add / edit dialog for a points penalty of a Ligue tour. Only edits the wizard draft: nothing is
 * sent to the API before the wizard is completed. Mount it with a `key` per opening so that its
 * state is reinitialised from the props.
 */
export function TourMalusDialog({
  open,
  participantLabel,
  initialValues,
  onClose,
  onSubmit,
}: TourMalusDialogProps) {
  const isEdit = initialValues !== null;
  const [points, setPoints] = useState<string>(() => (initialValues ? String(initialValues.MLPoints) : ''));
  const [motif, setMotif] = useState<string>(initialValues?.MLMotif ?? '');
  const [date, setDate] = useState<string>(initialValues?.MLDate ?? '');
  const [dateValid, setDateValid] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};
    const parsedPoints = Number(points);
    const trimmedMotif = motif.trim();

    if (!points || !Number.isInteger(parsedPoints) || parsedPoints < 1) {
      nextErrors.points = 'Nombre de points requis (entier supérieur ou égal à 1).';
    }
    if (trimmedMotif.length > MALUS_MOTIF_MAX_LENGTH) {
      nextErrors.motif = `${MALUS_MOTIF_MAX_LENGTH} caractères maximum.`;
    }

    setErrors(nextErrors);
    // An invalid date entry is already flagged "Date invalide" on its field.
    if (Object.keys(nextErrors).length > 0 || !dateValid) return;

    onSubmit({
      MLPoints: parsedPoints,
      MLMotif: trimmedMotif || null,
      MLDate: date,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{`Malus — ${participantLabel}`}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          <NumberField
            label="Points retirés"
            value={points}
            onChange={(value) => {
              setPoints(value);
              setErrors((prev) => ({ ...prev, points: '' }));
            }}
            min={1}
            maxLength={3}
            required
            error={Boolean(errors.points)}
            helperText={errors.points}
          />

          <TextField
            label="Motif"
            size="small"
            value={motif}
            onChange={(event) => {
              setMotif(event.target.value);
              setErrors((prev) => ({ ...prev, motif: '' }));
            }}
            error={Boolean(errors.motif)}
            helperText={errors.motif || `${motif.trim().length}/${MALUS_MOTIF_MAX_LENGTH}`}
            slotProps={{ htmlInput: { maxLength: MALUS_MOTIF_MAX_LENGTH } }}
          />

          <DateInputField
            label="Date"
            value={date}
            onChange={setDate}
            onValidityChange={setDateValid}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Annuler</Button>
        <Button variant="contained" onClick={handleSubmit}>{isEdit ? 'Valider' : 'Ajouter'}</Button>
      </DialogActions>
    </Dialog>
  );
}
