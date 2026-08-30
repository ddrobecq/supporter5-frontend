import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { toErrorMessage } from '../../components/useEntityPage';
import {
  fetchCompetition,
  fetchCompetitionToursPublic,
  fetchCompetitionWizardData,
} from '../competition/competitionApi';
import { buildCompetitionLabel } from './competitionLabel';
import type { CompetitionTourRow } from '../competition/types';
import { normalizeImportDate, normalizeImportNumber, normalizeImportTime, parseCsv, type ParsedCsv } from './csv';
import {
  IMPORT_TARGET_FIELDS,
  rencontreImportStore,
  type ImportDraftRow,
  type ImportTargetField,
} from './rencontreImportStore';

const STEPS = ['Destination', 'Fichier', 'Correspondance des champs'] as const;
const NO_COLUMN = '';

interface RencontreImportWizardDialogProps {
  open: boolean;
  onClose: () => void;
  onReady: () => void;
}

/** Devine la colonne du fichier correspondant a un champ cible via son libelle. */
function guessColumn(headers: string[], field: ImportTargetField, label: string): string {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const targets = [normalize(field), normalize(label)];
  return headers.find((header) => targets.includes(normalize(header))) ?? NO_COLUMN;
}

export function RencontreImportWizardDialog({ open, onClose, onReady }: RencontreImportWizardDialogProps) {
  const setSession = rencontreImportStore((state) => state.setSession);

  const [stepIndex, setStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [seasonOptions, setSeasonOptions] = useState<string[]>([]);
  const [season, setSeason] = useState('');
  const [competitionOptions, setCompetitionOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [competitionId, setCompetitionId] = useState('');
  const [tourOptions, setTourOptions] = useState<CompetitionTourRow[]>([]);
  const [tourId, setTourId] = useState('');

  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ParsedCsv>({ headers: [], rows: [] });
  const [mapping, setMapping] = useState<Record<ImportTargetField, string>>({} as Record<ImportTargetField, string>);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setErrorMessage('');
    setSeason('');
    setCompetitionId('');
    setTourId('');
    setCompetitionOptions([]);
    setTourOptions([]);
    setFileName('');
    setParsed({ headers: [], rows: [] });
    setMapping({} as Record<ImportTargetField, string>);

    setLoading(true);
    void fetchCompetitionWizardData()
      .then((data) => {
        setSeasonOptions((data.saisons ?? []).map((item) => String(item.SAISON ?? '').trim()).filter(Boolean));
      })
      .catch((error) => setErrorMessage(toErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open || !season) {
      setCompetitionOptions([]);
      setCompetitionId('');
      return;
    }
    setLoading(true);
    setCompetitionId('');
    void fetchCompetition('', season)
      .then((result) => {
        setCompetitionOptions((result.data ?? [])
          .map((row) => ({
            id: String(row.COCLEUNIK ?? '').trim(),
            label: buildCompetitionLabel(row as unknown as Record<string, unknown>) || String(row.COCLEUNIK ?? ''),
          }))
          .filter((row) => row.id));
      })
      .catch((error) => setErrorMessage(toErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [open, season]);

  useEffect(() => {
    if (!open || !competitionId) {
      setTourOptions([]);
      setTourId('');
      return;
    }
    setLoading(true);
    setTourId('');
    void fetchCompetitionToursPublic(competitionId)
      .then((rows) => setTourOptions(rows ?? []))
      .catch((error) => setErrorMessage(toErrorMessage(error)))
      .finally(() => setLoading(false));
  }, [competitionId, open]);

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setErrorMessage('');
    try {
      const text = await file.text();
      const next = parseCsv(text);
      if (next.headers.length === 0 || next.rows.length === 0) {
        setErrorMessage('Le fichier ne contient aucune ligne exploitable.');
        return;
      }
      setFileName(file.name);
      setParsed(next);
      setMapping(Object.fromEntries(
        IMPORT_TARGET_FIELDS.map((field) => [field.key, guessColumn(next.headers, field.key, field.label)]),
      ) as Record<ImportTargetField, string>);
    } catch (error) {
      setErrorMessage(toErrorMessage(error));
    }
  };

  const canGoNext = useMemo(() => {
    if (stepIndex === 0) return Boolean(season && competitionId && tourId);
    if (stepIndex === 1) return parsed.rows.length > 0;
    return IMPORT_TARGET_FIELDS.filter((field) => field.required).every((field) => mapping[field.key]);
  }, [competitionId, mapping, parsed.rows.length, season, stepIndex, tourId]);

  const handleFinish = () => {
    const columnIndex = (field: ImportTargetField): number => parsed.headers.indexOf(mapping[field] ?? NO_COLUMN);
    const read = (row: string[], field: ImportTargetField): string => {
      const index = columnIndex(field);
      return index >= 0 ? String(row[index] ?? '').trim() : '';
    };

    const rows: ImportDraftRow[] = parsed.rows.map((row, index) => ({
      id: `row-${index}`,
      DATE: normalizeImportDate(read(row, 'DATE')),
      HEURE: normalizeImportTime(read(row, 'HEURE')),
      IDCIRC: read(row, 'IDCIRC'),
      DOMICILE_LABEL: read(row, 'DOMICILE'),
      EXTERIEUR_LABEL: read(row, 'EXTERIEUR'),
      BUTDOM: normalizeImportNumber(read(row, 'BUTDOM')),
      BUTEXT: normalizeImportNumber(read(row, 'BUTEXT')),
      TABDOM: normalizeImportNumber(read(row, 'TABDOM')),
      TABEXT: normalizeImportNumber(read(row, 'TABEXT')),
      GROUPE: read(row, 'GROUPE'),
    }));

    setSession({
      saison: season,
      competitionId,
      competitionLabel: competitionOptions.find((item) => item.id === competitionId)?.label ?? competitionId,
      tourId: Number(tourId),
      tourLabel: tourOptions.find((item) => String(item.TUCLEUNIK) === tourId)?.TOUR ?? `Tour ${tourId}`,
      fileName,
      rows,
    });
    onReady();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Importer des rencontres</DialogTitle>
      <DialogContent dividers>
        <Stepper activeStep={stepIndex} sx={{ mb: 2.5 }}>
          {STEPS.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        {stepIndex === 0 ? (
          <Stack spacing={2}>
            <FormControl size="small" fullWidth>
              <InputLabel id="import-season-label">Saison</InputLabel>
              <Select
                labelId="import-season-label"
                label="Saison"
                value={season}
                onChange={(event) => setSeason(String(event.target.value))}
              >
                {seasonOptions.map((option) => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth disabled={!season}>
              <InputLabel id="import-competition-label">Compétition</InputLabel>
              <Select
                labelId="import-competition-label"
                label="Compétition"
                value={competitionId}
                onChange={(event) => setCompetitionId(String(event.target.value))}
              >
                {competitionOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth disabled={!competitionId}>
              <InputLabel id="import-tour-label">Tour</InputLabel>
              <Select
                labelId="import-tour-label"
                label="Tour"
                value={tourId}
                onChange={(event) => setTourId(String(event.target.value))}
              >
                {tourOptions.map((option) => (
                  <MenuItem key={option.TUCLEUNIK} value={String(option.TUCLEUNIK)}>{option.TOUR}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        ) : null}

        {stepIndex === 1 ? (
          <Stack spacing={2}>
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadFileRoundedIcon />}
              sx={{ alignSelf: 'flex-start' }}
            >
              Choisir un fichier .csv ou .txt
              <input
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                hidden
                onChange={(event) => void handleFileChange(event.target.files?.[0])}
              />
            </Button>
            {fileName ? (
              <Typography variant="body2">
                {`${fileName} — ${parsed.rows.length} ligne(s), ${parsed.headers.length} colonne(s).`}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                La première ligne du fichier doit contenir les noms de colonnes.
              </Typography>
            )}
          </Stack>
        ) : null}

        {stepIndex === 2 ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Champ</TableCell>
                <TableCell>Colonne du fichier</TableCell>
                <TableCell>Exemple</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {IMPORT_TARGET_FIELDS.map((field) => {
                const selected = mapping[field.key] ?? NO_COLUMN;
                const sampleIndex = parsed.headers.indexOf(selected);
                const sample = sampleIndex >= 0 ? String(parsed.rows[0]?.[sampleIndex] ?? '') : '';
                return (
                  <TableRow key={field.key}>
                    <TableCell sx={{ width: 160 }}>
                      {field.label}{field.required ? ' *' : ''}
                    </TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        fullWidth
                        displayEmpty
                        value={selected}
                        error={field.required && !selected}
                        onChange={(event) => setMapping((prev) => ({ ...prev, [field.key]: String(event.target.value) }))}
                      >
                        <MenuItem value={NO_COLUMN}><em>(aucune)</em></MenuItem>
                        {parsed.headers.map((header) => (
                          <MenuItem key={header} value={header}>{header}</MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{sample}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : null}

        {errorMessage ? <Alert severity="error" sx={{ mt: 2 }}>{errorMessage}</Alert> : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Annuler</Button>
        <Button onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))} disabled={stepIndex === 0}>
          Précédent
        </Button>
        {stepIndex < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={() => setStepIndex((prev) => prev + 1)}
            disabled={!canGoNext || loading}
          >
            Suivant
          </Button>
        ) : (
          <Button variant="contained" onClick={handleFinish} disabled={!canGoNext}>
            Terminer
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
