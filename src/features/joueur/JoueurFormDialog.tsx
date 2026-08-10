import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import AddCircleOutlineRoundedIcon from '@mui/icons-material/AddCircleOutlineRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DateInputField, fromInputDateToDisplay, toInputDateFromDisplay } from '../../components/DateInputField';
import { NumberField } from '../../components/NumberField';
import { ClubSelectField } from '../../components/ClubSelectField';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { EntityFormDialog } from '../../components/EntityFormDialog';
import { EntityImageFrame } from '../../components/EntityImageFrame';
import { useDirtySignature } from '../../lib/useDirtySignature';
import { useEntityImage } from '../../lib/useEntityImage';
import { TerrainVilleSelector } from '../terrain/TerrainVilleSelector';
import { VillePicker } from '../../components/VillePicker';
import type { NatioRow } from '../natio/types';
import { fetchVilleById } from '../ville/villeApi';
import {
  createJoueurHistory,
  createJoueurTransaction,
  deleteJoueurHistory,
  deleteJoueurTransaction,
  fetchJoueurHistory,
  fetchJoueurTransactionOptions,
  fetchJoueurTransactions,
  fetchSaisons,
  updateJoueurHistory,
  updateJoueurTransaction,
} from './joueurApi';
import { NatioAutocomplete } from '../../components/NatioAutocomplete';
import { JoueurContractsTimeline } from './JoueurContractsTimeline';
import { JoueurMatchesTab } from './JoueurMatchesTab';
import type {
  JoueurHistoryRow,
  JoueurRow,
  JoueurTransactionDeviseOption,
  JoueurTransactionRow,
  JoueurTransactionTypeOption,
  PosteOption,
} from './types';

interface JoueurFormDialogProps {
  open: boolean;
  mode: 'create' | 'edit';
  embedded?: boolean;
  initialData?: JoueurRow;
  natioDatas: NatioRow[];
  posteOptions: PosteOption[];
  onDirtyChange?: (dirty: boolean) => void;
  onClose: () => void;
  onSubmit: (payload: JoueurRow) => Promise<void>;
  saveCount?: number;
}

type JoueurFormTabKey = 'identite' | 'historique' | 'contrats' | 'matches';

interface JoueurHistoryDialogDraft {
  saison: string;
  poste: string;
}

interface JoueurTransactionDialogDraft {
  date: string;
  type: string;
  sens: string;
  idClub: string;
  clubName: string;
  deviseId: string;
  salaire: string;
  indemnites: string;
  echeance: string;
}

interface SensOption {
  value: '1' | '2' | '3';
  label: string;
}

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDisplayDate(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return text;
  return fromInputDateToDisplay(text);
}

function toSensValue(value: unknown): string {
  const numeric = Number(value);
  if (numeric === 1 || numeric === 2 || numeric === 3) return String(numeric);
  return '3';
}

function buildSensOptionsForType(type?: JoueurTransactionTypeOption): SensOption[] {
  if (!type) return [];
  const options: SensOption[] = [];
  if (normalizeNullableText(type.TYT_PHRASE_DEPART)) options.push({ value: '1', label: 'Depart' });
  if (normalizeNullableText(type.TYT_PHRASE_ARRIVEE)) options.push({ value: '2', label: 'Arrivee' });
  if (normalizeNullableText(type.TYT_PHRASE_NEUTRE)) options.push({ value: '3', label: 'Neutre' });
  return options;
}

function normalizeDateDigits(input: string): string {
  const digits = input.replace(/\D+/g, '').slice(0, 8);
  if (digits.length === 8) {
    const yyyy = digits.slice(0, 4);
    const mm = digits.slice(4, 6);
    const dd = digits.slice(6, 8);
    return `${dd}/${mm}/${yyyy}`;
  }
  return input;
}

function normalizeNullableText(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const lower = text.toLowerCase();
  if (lower === 'null' || lower === 'undefined') return '';
  return text;
}

function normalizeNullableCityId(value: unknown): string {
  const text = normalizeNullableText(value);
  if (!text || text === '0') return '';
  return text;
}

function upper(value: string): string {
  return value.toUpperCase();
}

function capitalize(value: string): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getHistoryDialogSignature(draft: JoueurHistoryDialogDraft): string {
  return JSON.stringify({
    saison: String(draft.saison ?? '').trim(),
    poste: String(draft.poste ?? '').trim(),
  });
}

function getContractsDialogSignature(draft: JoueurTransactionDialogDraft): string {
  return JSON.stringify({
    date: String(draft.date ?? '').trim(),
    type: String(draft.type ?? '').trim(),
    sens: String(draft.sens ?? '').trim(),
    idClub: String(draft.idClub ?? '').trim(),
    clubName: String(draft.clubName ?? '').trim(),
    deviseId: String(draft.deviseId ?? '').trim(),
    salaire: String(draft.salaire ?? '').trim(),
    indemnites: String(draft.indemnites ?? '').trim(),
    echeance: String(draft.echeance ?? '').trim(),
  });
}

export function JoueurFormDialog({
  open,
  mode,
  embedded = false,
  initialData,
  natioDatas,
  posteOptions,
  onDirtyChange,
  onClose,
  onSubmit,
  saveCount = 0,
}: JoueurFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [values, setValues] = useState<JoueurRow>({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [villeSelectorOpen, setVilleSelectorOpen] = useState(false);
  const [birthVilleName, setBirthVilleName] = useState('');
  const [birthVilleNatioId, setBirthVilleNatioId] = useState('');
  const [deathVilleName, setDeathVilleName] = useState('');
  const [deathVilleNatioId, setDeathVilleNatioId] = useState('');
  const [photoDraft, setPhotoDraft] = useState<string | null | undefined>(undefined);
  const [imageRefreshToken, setImageRefreshToken] = useState(0);
  const [historyRows, setHistoryRows] = useState<JoueurHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historySelection, setHistorySelection] = useState<GridRowId[]>([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyDialogMode, setHistoryDialogMode] = useState<'create' | 'edit'>('create');
  const [historyDialogId, setHistoryDialogId] = useState<number | null>(null);
  const [historyDialogSaving, setHistoryDialogSaving] = useState(false);
  const [historyDialogDraft, setHistoryDialogDraft] = useState<JoueurHistoryDialogDraft>({ saison: '', poste: '' });
  const [historyDeleteConfirmOpen, setHistoryDeleteConfirmOpen] = useState(false);
  const [historyDeleteSaving, setHistoryDeleteSaving] = useState(false);
  const [contractsRows, setContractsRows] = useState<JoueurTransactionRow[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsSelection, setContractsSelection] = useState<number | null>(null);
  const [contractsTypes, setContractsTypes] = useState<JoueurTransactionTypeOption[]>([]);
  const [contractsDevises, setContractsDevises] = useState<JoueurTransactionDeviseOption[]>([]);
  const [contractsDefaultDeviseId, setContractsDefaultDeviseId] = useState<number | null>(null);
  const [contractsDialogOpen, setContractsDialogOpen] = useState(false);
  const [contractsDialogMode, setContractsDialogMode] = useState<'create' | 'edit'>('create');
  const [contractsDialogId, setContractsDialogId] = useState<number | null>(null);
  const [contractsDialogSaving, setContractsDialogSaving] = useState(false);
  const [contractsDialogDraft, setContractsDialogDraft] = useState<JoueurTransactionDialogDraft>({
    date: '',
    type: '',
    sens: '',
    idClub: '',
    clubName: '',
    deviseId: '',
    salaire: '',
    indemnites: '',
    echeance: '',
  });
  const [contractsDeleteConfirmOpen, setContractsDeleteConfirmOpen] = useState(false);
  const [contractsDeleteSaving, setContractsDeleteSaving] = useState(false);
  const [saisonOptions, setSaisonOptions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<JoueurFormTabKey>('identite');
  const [isIdentityDirty, setIsIdentityDirty] = useState(false);
  const historyDialogInitialSignatureRef = useRef('');
  const contractsDialogInitialSignatureRef = useRef('');
  const { setInitialSignature, syncDirty, markClean } = useDirtySignature(open, setIsIdentityDirty);

  const editId = mode === 'edit' ? (initialData?.IDJOUEUR as string | number | undefined) : undefined;
  const existingPhoto = useEntityImage('joueurrg', editId, imageRefreshToken);

  const posteSelectOptions = useMemo(
    () => posteOptions.map((poste) => ({ value: poste.POS_ID, label: poste.POS_NOM })),
    [posteOptions],
  );

  const selectedHistoryId = Number(historySelection[0] ?? 0);
  const selectedHistoryRow = historyRows.find((historyRow) => Number(historyRow.JOCLEUNIK) === selectedHistoryId);
  const selectedContractRow = contractsRows.find((contractRow) => Number(contractRow.TNCLEUNIK) === Number(contractsSelection ?? 0));
  const selectedContractType = contractsTypes.find((option) => String(option.TYT_CLEUNIK) === contractsDialogDraft.type);
  const selectedContractSensOptions = useMemo(
    () => buildSensOptionsForType(selectedContractType),
    [selectedContractType],
  );
  const shouldShowSensSelector = selectedContractSensOptions.length >= 2;
  const transactionRequiresClub = Number(selectedContractType?.TYT_CLUB ?? 0) !== 0;
  const transactionRequiresEcheance = Number(selectedContractType?.TYT_ECHEANCE ?? 0) !== 0;
  const transactionUsesSalaire = Number(selectedContractType?.TYT_SALAIRE ?? 0) !== 0;
  const transactionUsesIndemnites = Number(selectedContractType?.TYT_INDEMNITES ?? 0) !== 0;
  const transactionUsesMoney = transactionUsesSalaire || transactionUsesIndemnites;
  const isHistoryDialogDirty = historyDialogOpen
    && getHistoryDialogSignature(historyDialogDraft) !== historyDialogInitialSignatureRef.current;
  const isContractsDialogDirty = contractsDialogOpen
    && getContractsDialogSignature(contractsDialogDraft) !== contractsDialogInitialSignatureRef.current;

  const historyColumns = useMemo<GridColDef<JoueurHistoryRow>[]>(() => [
    { field: 'SAISON', headerName: 'Saison', minWidth: 110, flex: 0.65 },
    { field: 'POSTE_NOM', headerName: 'Poste', minWidth: 130, flex: 1 },
    {
      field: 'MATCHES',
      headerName: 'Matches',
      minWidth: 90,
      width: 90,
      maxWidth: 90,
      flex: 0,
      sortable: false,
      renderHeader: () => (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', pr: 0.5 }}>
          <Box component="span">Matches</Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', width: '100%', columnGap: 0.75 }}>
            <Box component="span" sx={{ textAlign: 'right', fontSize: '0.7rem', color: 'text.secondary' }}>Tit.</Box>
            <Box component="span" sx={{ textAlign: 'right', fontSize: '0.7rem', color: 'text.secondary' }}>Remp.</Box>
          </Box>
        </Box>
      ),
      renderCell: (params) => (
        <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 0.75, pr: 0.5 }}>
          <Box component="span" sx={{ textAlign: 'right' }}>{Number(params.row.TITULAIRETOTAL ?? 0)}</Box>
          <Box component="span" sx={{ textAlign: 'right' }}>{Number(params.row.REMPTOTAL ?? 0)}</Box>
        </Box>
      ),
    },
    { field: 'BUTTOTAL', headerName: 'Buts', type: 'number', minWidth: 90, width: 90, maxWidth: 90, flex: 0, align: 'right', headerAlign: 'right', valueGetter: (value) => Number(value ?? 0) },
    { field: 'PASSETOTAL', headerName: 'Passes', type: 'number', minWidth: 90, width: 90, maxWidth: 90, flex: 0, align: 'right', headerAlign: 'right', valueGetter: (value) => Number(value ?? 0) },
    { field: 'JAUNETOTAL', headerName: 'Avert.', type: 'number', minWidth: 90, width: 90, maxWidth: 90, flex: 0, align: 'right', headerAlign: 'right', valueGetter: (value) => Number(value ?? 0) },
    { field: 'ROUGETOTAL', headerName: 'Exclu.', type: 'number', minWidth: 90, width: 90, maxWidth: 90, flex: 0, align: 'right', headerAlign: 'right', valueGetter: (value) => Number(value ?? 0) },
  ], []);

  const birthDateDisplay = normalizeNullableText(values.NAISSANCE);
  const deathDateDisplay = normalizeNullableText(values.DECES);

  useEffect(() => {
    if (!open) return;
    setActiveTab('identite');
    const nextValues: JoueurRow = { ...(initialData ?? {}) };
    nextValues.NAISSANCE = normalizeDateDigits(normalizeNullableText(nextValues.NAISSANCE));
    nextValues.DECES = normalizeDateDigits(normalizeNullableText(nextValues.DECES));
    nextValues.IDVILLE = normalizeNullableCityId(nextValues.IDVILLE);
    nextValues.VILLE_DECES = normalizeNullableCityId(nextValues.VILLE_DECES);
    setValues(nextValues);
    setBirthVilleName(normalizeNullableText(nextValues.VILLE_NOM));
    setDeathVilleName(normalizeNullableText(nextValues.VILLE_DECES_NOM));
    setErrors({});
    setPhotoDraft(undefined);
    setInitialSignature(JSON.stringify({ ...nextValues, PHOTO: '', VILLE_NOM: normalizeNullableText(nextValues.VILLE_NOM), VILLE_DECES_NOM: normalizeNullableText(nextValues.VILLE_DECES_NOM) }));
  }, [open, initialData, setInitialSignature]);

  useEffect(() => {
    const currentSignature = JSON.stringify({
      ...values,
      PHOTO: photoDraft === undefined ? '' : photoDraft,
      VILLE_NOM: birthVilleName,
      VILLE_DECES_NOM: deathVilleName,
    });
    syncDirty(currentSignature);
  }, [birthVilleName, deathVilleName, photoDraft, syncDirty, values]);

  useEffect(() => {
    onDirtyChange?.(isIdentityDirty || isHistoryDialogDirty || isContractsDialogDirty);
  }, [isContractsDialogDirty, isHistoryDialogDirty, isIdentityDirty, onDirtyChange]);

  useEffect(() => {
    if (!open) return;
    const birthId = values.IDVILLE;
    const deathId = values.VILLE_DECES;
    if (!birthVilleName && birthId !== undefined && birthId !== null && String(birthId).trim()) {
      void fetchVilleById(String(birthId)).then((row) => setBirthVilleName(String(row.NOM ?? ''))).catch(() => {});
    }
    if (!deathVilleName && deathId !== undefined && deathId !== null && String(deathId).trim()) {
      void fetchVilleById(String(deathId)).then((row) => setDeathVilleName(String(row.NOM ?? ''))).catch(() => {});
    }
  }, [birthVilleName, deathVilleName, open, values.IDVILLE, values.VILLE_DECES]);

  useEffect(() => {
    if (!open || mode !== 'edit') {
      setHistoryRows([]);
      setHistorySelection([]);
      setHistoryLoading(false);
      return;
    }
    const idJoueur = normalizeNullableText(values.IDJOUEUR);
    if (!idJoueur) {
      setHistoryRows([]);
      setHistorySelection([]);
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    void fetchJoueurHistory(idJoueur)
      .then((rows) => {
        setHistoryRows(rows);
        setHistorySelection([]);
      })
      .catch(() => {
        setHistoryRows([]);
        setHistorySelection([]);
      })
      .finally(() => setHistoryLoading(false));
  }, [mode, open, values.IDJOUEUR]);

  useEffect(() => {
    if (!open || mode !== 'edit') {
      setContractsRows([]);
      setContractsSelection(null);
      setContractsTypes([]);
      setContractsDevises([]);
      setContractsDefaultDeviseId(null);
      setContractsLoading(false);
      return;
    }
    const idJoueur = normalizeNullableText(values.IDJOUEUR);
    if (!idJoueur) {
      setContractsRows([]);
      setContractsSelection(null);
      setContractsTypes([]);
      setContractsDevises([]);
      setContractsDefaultDeviseId(null);
      setContractsLoading(false);
      return;
    }
    setContractsLoading(true);
    void Promise.all([fetchJoueurTransactions(idJoueur), fetchJoueurTransactionOptions(idJoueur)])
      .then(([rows, options]) => {
        setContractsRows(rows);
        setContractsSelection(null);
        setContractsTypes(options.types ?? []);
        setContractsDevises(options.devises ?? []);
        setContractsDefaultDeviseId(options.defaultDeviseId ?? null);
      })
      .catch(() => {
        setContractsRows([]);
        setContractsSelection(null);
        setContractsTypes([]);
        setContractsDevises([]);
        setContractsDefaultDeviseId(null);
      })
      .finally(() => setContractsLoading(false));
  }, [mode, open, values.IDJOUEUR]);

  useEffect(() => {
    if (!open) {
      setSaisonOptions([]);
      return;
    }
    void fetchSaisons()
      .then((rows) => {
        const seasons = Array.from(new Set(rows.map((row) => String(row.SAISON ?? '').trim()).filter(Boolean)));
        setSaisonOptions(seasons);
      })
      .catch(() => setSaisonOptions([]));
  }, [open]);

  useEffect(() => {
    if (!contractsDialogOpen) return;
    const sensValues = selectedContractSensOptions.map((option) => option.value);
    const defaultSens = selectedContractSensOptions.length === 1
      ? selectedContractSensOptions[0].value
      : selectedContractSensOptions.length >= 2
        ? ''
        : toSensValue(selectedContractType?.TYT_STATUT);
    setContractsDialogDraft((prev) => ({
      ...prev,
      sens: defaultSens
        ? defaultSens
        : (prev.sens && sensValues.includes(prev.sens as '1' | '2' | '3') ? prev.sens : ''),
      idClub: transactionRequiresClub ? prev.idClub : '',
      clubName: transactionRequiresClub ? prev.clubName : '',
      salaire: transactionUsesSalaire ? prev.salaire : '',
      indemnites: transactionUsesIndemnites ? prev.indemnites : '',
      echeance: transactionRequiresEcheance ? prev.echeance : '',
    }));
  }, [contractsDialogOpen, selectedContractType, selectedContractSensOptions, transactionRequiresClub, transactionRequiresEcheance, transactionUsesIndemnites, transactionUsesSalaire]);

  const reloadHistory = async () => {
    const idJoueur = normalizeNullableText(values.IDJOUEUR);
    if (!idJoueur) {
      setHistoryRows([]);
      setHistorySelection([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const rows = await fetchJoueurHistory(idJoueur);
      setHistoryRows(rows);
      setHistorySelection([]);
    } catch {
      setHistoryRows([]);
      setHistorySelection([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const reloadContracts = async () => {
    const idJoueur = normalizeNullableText(values.IDJOUEUR);
    if (!idJoueur) {
      setContractsRows([]);
      setContractsSelection(null);
      return;
    }
    setContractsLoading(true);
    try {
      const rows = await fetchJoueurTransactions(idJoueur);
      setContractsRows(rows);
      setContractsSelection((prev) => (prev != null && rows.some((row) => Number(row.TNCLEUNIK) === Number(prev)) ? prev : null));
    } catch {
      setContractsRows([]);
      setContractsSelection(null);
    } finally {
      setContractsLoading(false);
    }
  };

  const openContractsCreateDialog = () => {
    const defaultType = contractsTypes[0]?.TYT_CLEUNIK;
    const defaultTypeRow = contractsTypes.find((option) => Number(option.TYT_CLEUNIK) === Number(defaultType));
    const defaultTypeSensOptions = buildSensOptionsForType(defaultTypeRow);
    const nextDraft = {
      date: fromInputDateToDisplay(todayIsoDate()),
      type: defaultType != null ? String(defaultType) : '',
      sens: defaultTypeSensOptions.length === 1
        ? defaultTypeSensOptions[0].value
        : defaultTypeSensOptions.length >= 2
          ? ''
          : toSensValue(defaultTypeRow?.TYT_STATUT),
      idClub: '',
      clubName: '',
      deviseId: contractsDefaultDeviseId != null ? String(contractsDefaultDeviseId) : (contractsDevises[0] ? String(contractsDevises[0].DVCLEUNIK) : ''),
      salaire: '',
      indemnites: '',
      echeance: '',
    };
    setContractsDialogMode('create');
    setContractsDialogId(null);
    setContractsDialogDraft(nextDraft);
    contractsDialogInitialSignatureRef.current = getContractsDialogSignature(nextDraft);
    setContractsDialogOpen(true);
  };

  const openContractsEditDialog = (row?: JoueurTransactionRow) => {
    const selectedRow = row ?? selectedContractRow;
    if (!selectedRow) {
      setErrors((prev) => ({ ...prev, contracts: 'Selectionnez une transaction a modifier.' }));
      return;
    }

    const nextDraft = {
      date: toDisplayDate(selectedRow.DATE),
      type: String(selectedRow.TYPE ?? ''),
      sens: Number(selectedRow.STATUT) === 1 ? '1' : Number(selectedRow.STATUT) === 2 ? '2' : '3',
      idClub: String(selectedRow.IDCLUB ?? '').trim(),
      clubName: String(selectedRow.CLUB_NOM ?? '').trim(),
      deviseId: String(selectedRow.DVCLEUNIK ?? contractsDefaultDeviseId ?? ''),
      salaire: selectedRow.SALAIRE == null ? '' : String(selectedRow.SALAIRE),
      indemnites: selectedRow.INDEMNITES == null ? '' : String(selectedRow.INDEMNITES),
      echeance: toDisplayDate(selectedRow.TN_ECHEANCE),
    };
    setContractsDialogMode('edit');
    setContractsDialogId(Number(selectedRow.TNCLEUNIK));
    setContractsDialogDraft(nextDraft);
    contractsDialogInitialSignatureRef.current = getContractsDialogSignature(nextDraft);
    setContractsDialogOpen(true);
  };

  const openContractsDeleteConfirm = () => {
    if (!selectedContractRow) {
      setErrors((prev) => ({ ...prev, contracts: 'Selectionnez une transaction a supprimer.' }));
      return;
    }
    setContractsDeleteConfirmOpen(true);
  };

  const handleContractsDialogSave = async (): Promise<boolean> => {
    const idJoueur = normalizeNullableText(values.IDJOUEUR);
    if (!idJoueur) {
      setErrors((prev) => ({ ...prev, contracts: 'Identifiant joueur invalide.' }));
      return false;
    }

    const typeId = Number(contractsDialogDraft.type);
    if (!Number.isInteger(typeId) || typeId <= 0) {
      setErrors((prev) => ({ ...prev, contracts: 'Le type de transaction est requis.' }));
      return false;
    }
    const dateIso = toInputDateFromDisplay(contractsDialogDraft.date);
    if (!dateIso) {
      setErrors((prev) => ({ ...prev, contracts: 'La date de transaction est requise.' }));
      return false;
    }

    const fallbackDeviseId = Number(contractsDefaultDeviseId ?? contractsDevises[0]?.DVCLEUNIK ?? 0);
    const deviseId = transactionUsesMoney
      ? Number(contractsDialogDraft.deviseId)
      : fallbackDeviseId;
    if (!Number.isInteger(deviseId) || deviseId <= 0) {
      setErrors((prev) => ({ ...prev, contracts: 'La devise est requise.' }));
      return false;
    }

    if (transactionRequiresClub && !contractsDialogDraft.idClub) {
      setErrors((prev) => ({ ...prev, contracts: 'Le club est requis pour ce type de transaction.' }));
      return false;
    }

    const sensValues = selectedContractSensOptions.map((option) => option.value);
    const selectedSens = String(contractsDialogDraft.sens ?? '') as '1' | '2' | '3';
    const hasValidSelectedSens = sensValues.includes(selectedSens);

    if (selectedContractSensOptions.length >= 2 && !hasValidSelectedSens) {
      setErrors((prev) => ({ ...prev, contracts: 'Le sens est obligatoire pour ce type de transaction.' }));
      return false;
    }

    const statutValue = selectedContractSensOptions.length === 0
      ? Number(toSensValue(selectedContractType?.TYT_STATUT))
      : selectedContractSensOptions.length === 1
        ? Number(selectedContractSensOptions[0].value)
        : Number(selectedSens);

    const echeanceIso = contractsDialogDraft.echeance ? toInputDateFromDisplay(contractsDialogDraft.echeance) : '';
    if (transactionRequiresEcheance && !echeanceIso) {
      setErrors((prev) => ({ ...prev, contracts: 'La date d echeance est requise pour ce type de transaction.' }));
      return false;
    }

    const salaireValue = transactionUsesSalaire
      ? (contractsDialogDraft.salaire.trim() ? Number(contractsDialogDraft.salaire.replace(',', '.')) : null)
      : null;
    if (salaireValue != null && (!Number.isFinite(salaireValue) || salaireValue < 0)) {
      setErrors((prev) => ({ ...prev, contracts: 'Le salaire est invalide.' }));
      return false;
    }

    const indemnitesValue = transactionUsesIndemnites
      ? (contractsDialogDraft.indemnites.trim() ? Number(contractsDialogDraft.indemnites.replace(',', '.')) : 0)
      : 0;
    if (!Number.isFinite(indemnitesValue) || indemnitesValue < 0) {
      setErrors((prev) => ({ ...prev, contracts: 'Les indemnites sont invalides.' }));
      return false;
    }

    setContractsDialogSaving(true);
    try {
      const payload = {
        date: dateIso,
        type: typeId,
        statut: statutValue,
        idClub: transactionRequiresClub ? contractsDialogDraft.idClub : null,
        salaire: salaireValue,
        indemnites: indemnitesValue,
        deviseId,
        echeance: transactionRequiresEcheance ? echeanceIso : null,
      };

      if (contractsDialogMode === 'create') {
        await createJoueurTransaction(idJoueur, payload);
      } else {
        if (!contractsDialogId) {
          setErrors((prev) => ({ ...prev, contracts: 'Transaction invalide.' }));
          return false;
        }
        await updateJoueurTransaction(idJoueur, contractsDialogId, payload);
      }
      await reloadContracts();
      setContractsDialogOpen(false);
      setErrors((prev) => ({ ...prev, contracts: '' }));
      return true;
    } catch (error) {
      setErrors((prev) => ({ ...prev, contracts: String((error as { message?: string })?.message ?? 'Erreur de sauvegarde.') }));
      return false;
    } finally {
      setContractsDialogSaving(false);
    }
  };

  const handleContractsDeleteConfirm = async () => {
    const idJoueur = normalizeNullableText(values.IDJOUEUR);
    if (!idJoueur || !selectedContractRow) {
      setContractsDeleteConfirmOpen(false);
      return;
    }
    setContractsDeleteSaving(true);
    try {
      await deleteJoueurTransaction(idJoueur, selectedContractRow.TNCLEUNIK);
      await reloadContracts();
      setContractsDeleteConfirmOpen(false);
      setErrors((prev) => ({ ...prev, contracts: '' }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, contracts: String((error as { message?: string })?.message ?? 'Erreur de suppression.') }));
    } finally {
      setContractsDeleteSaving(false);
    }
  };

  const handleContractsRowDoubleClick = (transactionId: number) => {
    const clicked = contractsRows.find((row) => Number(row.TNCLEUNIK) === Number(transactionId));
    if (!clicked) return;
    setContractsSelection(clicked.TNCLEUNIK);
    openContractsEditDialog(clicked);
  };

  const openHistoryCreateDialog = () => {
    const latestSeasonPoste = historyRows[0]?.POSTE;
    const currentPoste = Number(values.POSTE ?? 0);
    const resolvedDefaultPoste = Number.isInteger(Number(latestSeasonPoste)) && Number(latestSeasonPoste) > 0
      ? String(latestSeasonPoste)
      : Number.isInteger(currentPoste) && currentPoste > 0
        ? String(currentPoste)
        : posteSelectOptions[0]
          ? String(posteSelectOptions[0].value)
          : '';
    const nextDraft = { saison: saisonOptions[0] ?? '', poste: resolvedDefaultPoste };
    setHistoryDialogMode('create');
    setHistoryDialogId(null);
    setHistoryDialogDraft(nextDraft);
    historyDialogInitialSignatureRef.current = getHistoryDialogSignature(nextDraft);
    setHistoryDialogOpen(true);
  };

  const openHistoryEditDialog = (historyRow?: JoueurHistoryRow) => {
    const rowToEdit = historyRow ?? selectedHistoryRow;
    if (!rowToEdit) {
      setErrors((prev) => ({ ...prev, history: 'Selectionnez une saison a modifier.' }));
      return;
    }
    const nextDraft = { saison: String(rowToEdit.SAISON ?? ''), poste: String(rowToEdit.POSTE ?? '') };
    setHistoryDialogMode('edit');
    setHistoryDialogId(Number(rowToEdit.JOCLEUNIK));
    setHistoryDialogDraft(nextDraft);
    historyDialogInitialSignatureRef.current = getHistoryDialogSignature(nextDraft);
    setHistoryDialogOpen(true);
  };

  const openHistoryDeleteConfirm = () => {
    if (!selectedHistoryRow) {
      setErrors((prev) => ({ ...prev, history: 'Selectionnez une saison a supprimer.' }));
      return;
    }
    setHistoryDeleteConfirmOpen(true);
  };

  const handleHistoryDialogSave = async (): Promise<boolean> => {
    const idJoueur = normalizeNullableText(values.IDJOUEUR);
    const saison = String(historyDialogDraft.saison ?? '').trim();
    const poste = String(historyDialogDraft.poste ?? '').trim();

    if (!idJoueur) {
      setErrors((prev) => ({ ...prev, history: 'Identifiant joueur invalide.' }));
      return false;
    }
    if (!saison) {
      setErrors((prev) => ({ ...prev, history: 'La saison est requise.' }));
      return false;
    }
    if (!poste) {
      setErrors((prev) => ({ ...prev, history: 'Le poste est requis.' }));
      return false;
    }

    setHistoryDialogSaving(true);
    try {
      if (historyDialogMode === 'create') {
        await createJoueurHistory(idJoueur, { saison, poste });
      } else {
        if (!historyDialogId) {
          setErrors((prev) => ({ ...prev, history: 'Historique invalide.' }));
          return false;
        }
        await updateJoueurHistory(idJoueur, historyDialogId, { saison, poste });
      }
      await reloadHistory();
      setHistoryDialogOpen(false);
      setErrors((prev) => ({ ...prev, history: '' }));
      return true;
    } catch (error) {
      setErrors((prev) => ({ ...prev, history: String((error as { message?: string })?.message ?? 'Erreur de sauvegarde.') }));
      return false;
    } finally {
      setHistoryDialogSaving(false);
    }
  };

  const handleHistoryDeleteConfirm = async () => {
    const idJoueur = normalizeNullableText(values.IDJOUEUR);
    if (!idJoueur || !selectedHistoryRow) {
      setHistoryDeleteConfirmOpen(false);
      return;
    }
    setHistoryDeleteSaving(true);
    try {
      await deleteJoueurHistory(idJoueur, selectedHistoryRow.JOCLEUNIK);
      await reloadHistory();
      setHistoryDeleteConfirmOpen(false);
      setErrors((prev) => ({ ...prev, history: '' }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, history: String((error as { message?: string })?.message ?? 'Erreur de suppression.') }));
    } finally {
      setHistoryDeleteSaving(false);
    }
  };

  const handleHistoryRowDoubleClick = (rowId: GridRowId) => {
    const clicked = historyRows.find((historyRow) => Number(historyRow.JOCLEUNIK) === Number(rowId));
    if (!clicked) return;
    setHistorySelection([clicked.JOCLEUNIK]);
    openHistoryEditDialog(clicked);
  };

  const historyActions = (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title="Ajouter">{isMobile ? <IconButton size="small" color="primary" aria-label="Ajouter" onClick={openHistoryCreateDialog} disabled={!normalizeNullableText(values.IDJOUEUR)}><AddCircleOutlineRoundedIcon fontSize="small" /></IconButton> : <Button size="small" variant="outlined" startIcon={<AddCircleOutlineRoundedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={openHistoryCreateDialog} disabled={!normalizeNullableText(values.IDJOUEUR)}>Ajouter</Button>}</Tooltip>
      <Tooltip title="Modifier">{isMobile ? <IconButton size="small" color="primary" aria-label="Modifier" onClick={() => openHistoryEditDialog()} disabled={!selectedHistoryRow}><EditOutlinedIcon fontSize="small" /></IconButton> : <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={() => openHistoryEditDialog()} disabled={!selectedHistoryRow}>Modifier</Button>}</Tooltip>
      <Tooltip title="Supprimer">{isMobile ? <IconButton size="small" color="error" aria-label="Supprimer" onClick={openHistoryDeleteConfirm} disabled={!selectedHistoryRow}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton> : <Button size="small" color="error" variant="outlined" startIcon={<DeleteOutlineRoundedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={openHistoryDeleteConfirm} disabled={!selectedHistoryRow}>Supprimer</Button>}</Tooltip>
    </Stack>
  );

  const contractsActions = (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title="Ajouter">{isMobile ? <IconButton size="small" color="primary" aria-label="Ajouter" onClick={openContractsCreateDialog} disabled={!normalizeNullableText(values.IDJOUEUR)}><AddCircleOutlineRoundedIcon fontSize="small" /></IconButton> : <Button size="small" variant="outlined" startIcon={<AddCircleOutlineRoundedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={openContractsCreateDialog} disabled={!normalizeNullableText(values.IDJOUEUR)}>Ajouter</Button>}</Tooltip>
      <Tooltip title="Modifier">{isMobile ? <IconButton size="small" color="primary" aria-label="Modifier" onClick={() => openContractsEditDialog()} disabled={!selectedContractRow}><EditOutlinedIcon fontSize="small" /></IconButton> : <Button size="small" variant="outlined" startIcon={<EditOutlinedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={() => openContractsEditDialog()} disabled={!selectedContractRow}>Modifier</Button>}</Tooltip>
      <Tooltip title="Supprimer">{isMobile ? <IconButton size="small" color="error" aria-label="Supprimer" onClick={openContractsDeleteConfirm} disabled={!selectedContractRow}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton> : <Button size="small" color="error" variant="outlined" startIcon={<DeleteOutlineRoundedIcon />} sx={{ minWidth: 0, px: 1.1 }} onClick={openContractsDeleteConfirm} disabled={!selectedContractRow}>Supprimer</Button>}</Tooltip>
    </Stack>
  );

  const handleSave = async (): Promise<boolean> => {
    const nextErrors: Record<string, string> = {};
    if (!String(values.IDJOUEUR ?? '').trim()) nextErrors.IDJOUEUR = 'ID Joueur requis';
    if (!String(values.NOM ?? '').trim()) nextErrors.NOM = 'Nom requis';
    if (!String(values.PRENOM ?? '').trim()) nextErrors.PRENOM = 'Prénom requis';
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return false;
    }

    setSaving(true);
    try {
      const payload: JoueurRow = { ...values };
      payload.NAISSANCE = normalizeNullableText(payload.NAISSANCE);
      payload.DECES = normalizeNullableText(payload.DECES);
      payload.IDVILLE = normalizeNullableCityId(payload.IDVILLE);
      payload.VILLE_DECES = normalizeNullableCityId(payload.VILLE_DECES);
      delete payload.VILLE_NOM;
      delete payload.VILLE_DECES_NOM;
      if (photoDraft === undefined) {
        delete payload.PHOTO;
      } else {
        payload.PHOTO = photoDraft;
      }
      await onSubmit(payload);
      if (mode === 'edit' && photoDraft !== undefined) {
        setPhotoDraft(undefined);
        setImageRefreshToken((prev) => prev + 1);
      }
      markClean();
      return true;
    } finally {
      setSaving(false);
    }
  };

  const handleGlobalSave = async (): Promise<boolean> => {
    if (historyDialogOpen) {
      const historySaved = await handleHistoryDialogSave();
      if (!historySaved) {
        return false;
      }
    }

    if (contractsDialogOpen) {
      const contractsSaved = await handleContractsDialogSave();
      if (!contractsSaved) {
        return false;
      }
    }

    if (isIdentityDirty) {
      return handleSave();
    }

    return true;
  };

  const handleGlobalCancel = () => {
    setHistoryDialogOpen(false);
    setContractsDialogOpen(false);
    setHistoryDeleteConfirmOpen(false);
    setContractsDeleteConfirmOpen(false);
    onClose();
  };

  const handleSaveRef = useRef(handleGlobalSave);
  handleSaveRef.current = handleGlobalSave;
  useEffect(() => { if (saveCount > 0) void handleSaveRef.current(); }, [saveCount]);

  const identityTab = (
    <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ alignItems: 'stretch' }}>
      <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
          <EntityImageFrame
            width={120}
            height={150}
            loading={photoDraft === undefined && existingPhoto.loading}
            src={photoDraft === undefined ? existingPhoto.src : photoDraft}
            alt="Portrait du joueur"
            objectFit="contain"
            editable
            accept="image/jpeg,image/png,image/webp"
            onChangeImage={(nextValue) => {
              setPhotoDraft(nextValue);
              setErrors((prev) => ({ ...prev, photo: '' }));
            }}
            onActionError={(message) => setErrors((prev) => ({ ...prev, photo: message }))}
            actionLabels={{
              upload: 'Importer une photo',
              paste: 'Coller une photo depuis le presse-papiers',
              clear: 'Supprimer la photo',
            }}
            fallback={(
              <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 0.5, color: 'text.disabled' }}>
                <PersonRoundedIcon sx={{ fontSize: 64 }} />
                <Box sx={{ fontSize: '0.7rem' }}>Portrait</Box>
              </Box>
            )}
          />
          <Stack spacing={1} sx={{ flex: 1 }}>
            <TextField
              label="Identifiant"
              value={String(values.IDJOUEUR ?? '')}
              onChange={(event) => setValues((prev) => ({ ...prev, IDJOUEUR: event.target.value }))}
              disabled={mode === 'edit'}
              error={Boolean(errors.IDJOUEUR)}
              fullWidth
              size="small"
            />
            {errors.photo ? <Typography sx={{ color: 'error.main', fontSize: '0.75rem' }}>{errors.photo}</Typography> : null}
          </Stack>
        </Stack>

        <TextField
          label="Nom"
          value={String(values.NOM ?? '')}
          onChange={(event) => setValues((prev) => ({ ...prev, NOM: upper(event.target.value) }))}
          error={Boolean(errors.NOM)}
          helperText={errors.NOM}
          fullWidth
          size="small"
        />
        <TextField
          label="Prénom"
          value={String(values.PRENOM ?? '')}
          onChange={(event) => setValues((prev) => ({ ...prev, PRENOM: capitalize(event.target.value) }))}
          error={Boolean(errors.PRENOM)}
          helperText={errors.PRENOM}
          fullWidth
          size="small"
        />
        <TextField
          label="Alias"
          value={String(values.SURNOM ?? '')}
          onChange={(event) => setValues((prev) => ({ ...prev, SURNOM: upper(event.target.value) }))}
          fullWidth
          size="small"
        />

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'nowrap', pt: 0.5 }}>
          <DateInputField
            label="Né le"
            value={birthDateDisplay}
            onChange={(nextDate) => setValues((prev) => ({ ...prev, NAISSANCE: nextDate }))}
            sx={{ width: 152, flexShrink: 0 }}
            calendarAriaLabel="Calendrier naissance"
          />
          <VillePicker
            villeId={String(values.IDVILLE ?? '')}
            villeName={birthVilleName}
            villeNatioId={birthVilleNatioId}
            entityNatioId={String(values.IDNATIO ?? '')}
            onChange={(id, name, natioId) => {
              setValues((prev) => ({ ...prev, IDVILLE: id || null }));
              setBirthVilleName(name);
              setBirthVilleNatioId(natioId);
            }}
            label="à"
            sx={{ minWidth: 180, flex: 1 }}
          />
        </Stack>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'nowrap', pt: 0.5 }}>
          <DateInputField
            label="Décédé le"
            value={deathDateDisplay}
            onChange={(nextDate) => setValues((prev) => ({ ...prev, DECES: nextDate }))}
            sx={{ width: 152, flexShrink: 0 }}
            calendarAriaLabel="Calendrier décès"
          />
          <VillePicker
            villeId={String(values.VILLE_DECES ?? '')}
            villeName={deathVilleName}
            villeNatioId={deathVilleNatioId}
            entityNatioId={String(values.IDNATIO ?? '')}
            onChange={(id, name, natioId) => {
              setValues((prev) => ({ ...prev, VILLE_DECES: id || null }));
              setDeathVilleName(name);
              setDeathVilleNatioId(natioId);
            }}
            label="à"
            sx={{ minWidth: 180, flex: 1 }}
          />
        </Stack>

        <NatioAutocomplete
          natioDatas={natioDatas}
          value={String(values.IDNATIO ?? '')}
          onChange={(id) => setValues((prev) => ({ ...prev, IDNATIO: id }))}
          label="Nationalité"
        />

        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <NumberField
            label="Taille"
            value={String(values.HAUTEUR ?? '')}
            onChange={(v) => setValues((prev) => ({ ...prev, HAUTEUR: v }))}
            maxLength={3}
            suffix="cm"
            sx={{ width: 110, flexShrink: 0 }}
          />
          <NumberField
            label="Poids"
            value={String(values.POIDS ?? '')}
            onChange={(v) => setValues((prev) => ({ ...prev, POIDS: v }))}
            maxLength={3}
            suffix="kg"
            sx={{ width: 110, flexShrink: 0 }}
          />
        </Stack>

        <Autocomplete
          options={posteSelectOptions}
          getOptionLabel={(option) => option.label}
          value={posteSelectOptions.find((option) => Number(option.value) === Number(values.POSTE)) ?? null}
          onChange={(_, option) => setValues((prev) => ({ ...prev, POSTE: option?.value ?? '' }))}
          renderInput={(params) => <TextField {...params} label="Poste" size="small" />}
          size="small"
        />

        <TextField
          label="Commentaire"
          value={String(values.COMMENT ?? '')}
          onChange={(event) => setValues((prev) => ({ ...prev, COMMENT: event.target.value }))}
          size="small"
          fullWidth
          multiline
          minRows={3}
        />
      </Stack>
    </Stack>
  );

  const historyTab = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Historique dans le Club</Typography>
        {historyActions}
      </Stack>
      <Box
        sx={{
          height: 340,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <EntityDataGrid
          rows={historyRows}
          columns={historyColumns}
          loading={historyLoading}
          getRowId={(row) => row.JOCLEUNIK}
          selection={historySelection}
          onSelectionChange={setHistorySelection}
          onRowDoubleClick={handleHistoryRowDoubleClick}
          disableRowSelectionOnClick
          pageSizeOptions={[5, 10, 25]}
          density="compact"
          label="Historique dans le Club"
        />
      </Box>
      {errors.history ? <Typography sx={{ color: 'error.main', fontSize: '0.75rem' }}>{errors.history}</Typography> : null}
    </Box>
  );

  const contractsTab = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Contrats</Typography>
        {contractsActions}
      </Stack>
      <JoueurContractsTimeline
        rows={contractsRows}
        loading={contractsLoading}
        selectedTransactionId={contractsSelection}
        onSelectTransaction={(transactionId) => {
          setContractsSelection(transactionId);
          setErrors((prev) => ({ ...prev, contracts: '' }));
        }}
        onTransactionDoubleClick={handleContractsRowDoubleClick}
      />
      {errors.contracts ? <Typography sx={{ color: 'error.main', fontSize: '0.75rem' }}>{errors.contracts}</Typography> : null}
    </Box>
  );

  const content = (
    <Stack spacing={2}>
      <Tabs
        value={activeTab}
        onChange={(_event, newValue: JoueurFormTabKey) => setActiveTab(newValue)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36 } }}
      >
        <Tab value="identite" label="Identité" />
        <Tab value="historique" label="Historique dans le Club" />
        <Tab value="contrats" label="Contrats" />
        <Tab value="matches" label="Matches" />
      </Tabs>
      <Box sx={{ display: activeTab === 'identite' ? 'block' : 'none' }}>{identityTab}</Box>
      <Box sx={{ display: activeTab === 'historique' ? 'block' : 'none' }}>{historyTab}</Box>
      <Box sx={{ display: activeTab === 'contrats' ? 'block' : 'none' }}>{contractsTab}</Box>
      <Box sx={{ display: activeTab === 'matches' ? 'block' : 'none' }}>
        <JoueurMatchesTab joueurId={String(initialData?.IDJOUEUR ?? '')} active={activeTab === 'matches'} />
      </Box>
    </Stack>
  );

  return (
    <>
      {embedded ? (
        <Box sx={{ bgcolor: '#ffffff', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
          <Stack spacing={2}>
            {content}
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
              <Button onClick={handleGlobalCancel} color="inherit">Annuler</Button>
              <Button onClick={() => void handleGlobalSave()} variant="contained" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
            </Stack>
          </Stack>
        </Box>
      ) : (
        <EntityFormDialog open={open} onClose={handleGlobalCancel} title={mode === 'create' ? 'Nouveau Joueur' : 'Modifier un Joueur'} saving={saving} onSave={() => void handleGlobalSave()} maxWidth="lg">
          {content}
        </EntityFormDialog>
      )}

      <TerrainVilleSelector open={villeSelectorOpen} onClose={() => setVilleSelectorOpen(false)} onSelect={() => {}} />

      <Dialog open={historyDialogOpen} onClose={() => { if (!historyDialogSaving) setHistoryDialogOpen(false); }} fullWidth maxWidth="sm">
        <DialogTitle>{historyDialogMode === 'create' ? 'Ajouter une saison' : 'Modifier une saison'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.75 }}>
            <Autocomplete
              options={saisonOptions}
              getOptionLabel={(option) => option}
              value={historyDialogDraft.saison || null}
              onChange={(_, option) => setHistoryDialogDraft((prev) => ({ ...prev, saison: String(option ?? '') }))}
              renderInput={(params) => <TextField {...params} label="Saison" size="small" />}
              size="small"
            />
            <Autocomplete
              options={posteSelectOptions}
              getOptionLabel={(option) => option.label}
              value={posteSelectOptions.find((option) => String(option.value) === historyDialogDraft.poste) ?? null}
              onChange={(_, option) => setHistoryDialogDraft((prev) => ({ ...prev, poste: option ? String(option.value) : '' }))}
              renderInput={(params) => <TextField {...params} label="Poste" size="small" />}
              size="small"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)} disabled={historyDialogSaving}>Annuler</Button>
          <Button variant="contained" onClick={() => void handleHistoryDialogSave()} disabled={historyDialogSaving}>OK</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={historyDeleteConfirmOpen} onClose={() => { if (!historyDeleteSaving) setHistoryDeleteConfirmOpen(false); }}>
        <DialogTitle>Supprimer une saison</DialogTitle>
        <DialogContent>
          <DialogContentText>Confirmez-vous la suppression de cette saison dans l historique du club ?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDeleteConfirmOpen(false)} disabled={historyDeleteSaving}>Annuler</Button>
          <Button color="error" variant="contained" onClick={() => void handleHistoryDeleteConfirm()} disabled={historyDeleteSaving}>Supprimer</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={contractsDialogOpen} onClose={() => { if (!contractsDialogSaving) setContractsDialogOpen(false); }} fullWidth maxWidth="sm">
        <DialogTitle>{contractsDialogMode === 'create' ? 'Ajouter une transaction' : 'Modifier une transaction'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.75 }}>
            <Autocomplete
              options={contractsTypes}
              getOptionLabel={(option) => option.TYT_LIBELLE}
              value={contractsTypes.find((option) => String(option.TYT_CLEUNIK) === contractsDialogDraft.type) ?? null}
              onChange={(_event, option) => {
                const nextSensOptions = buildSensOptionsForType(option ?? undefined);
                const nextSens = nextSensOptions.length === 1
                  ? nextSensOptions[0].value
                  : nextSensOptions.length >= 2
                    ? ''
                    : toSensValue(option?.TYT_STATUT);
                setContractsDialogDraft((prev) => ({
                  ...prev,
                  type: option ? String(option.TYT_CLEUNIK) : '',
                  sens: nextSens,
                }));
              }}
              renderInput={(params) => <TextField {...params} label="Type de transaction" size="small" autoFocus />}
              size="small"
            />

            {shouldShowSensSelector ? (
              <Autocomplete
                options={selectedContractSensOptions}
                getOptionLabel={(option) => option.label}
                value={selectedContractSensOptions.find((option) => option.value === contractsDialogDraft.sens) ?? null}
                onChange={(_event, option) => setContractsDialogDraft((prev) => ({ ...prev, sens: option?.value ?? '' }))}
                renderInput={(params) => <TextField {...params} label="Sens" size="small" />}
                size="small"
              />
            ) : null}

            <DateInputField
              label="Date"
              value={contractsDialogDraft.date}
              onChange={(nextDate) => setContractsDialogDraft((prev) => ({ ...prev, date: nextDate }))}
              size="small"
              fullWidth
              calendarAriaLabel="Calendrier transaction"
            />

            {transactionRequiresClub ? (
              <Stack spacing={1}>
                <ClubSelectField
                  label="Club"
                  clubId={contractsDialogDraft.idClub}
                  clubName={contractsDialogDraft.clubName}
                  onChange={(nextValue) => {
                    setContractsDialogDraft((prev) => ({
                      ...prev,
                      idClub: nextValue.clubId,
                      clubName: nextValue.clubName,
                    }));
                  }}
                />
              </Stack>
            ) : null}

            {transactionUsesIndemnites ? (
              <>
                {transactionUsesSalaire ? (
                  <TextField
                    label="Salaire"
                    value={contractsDialogDraft.salaire}
                    onChange={(event) => setContractsDialogDraft((prev) => ({ ...prev, salaire: event.target.value }))}
                    size="small"
                    fullWidth
                    slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                  />
                ) : null}

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ alignItems: { sm: 'flex-start' } }}>
                  <TextField
                    label="Indemnites"
                    value={contractsDialogDraft.indemnites}
                    onChange={(event) => setContractsDialogDraft((prev) => ({ ...prev, indemnites: event.target.value }))}
                    size="small"
                    fullWidth
                    slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                  />

                  <Autocomplete
                    options={contractsDevises}
                    getOptionLabel={(option) => `${option.NOM} (${option.SYMBOLE})`}
                    value={contractsDevises.find((option) => String(option.DVCLEUNIK) === contractsDialogDraft.deviseId) ?? null}
                    onChange={(_event, option) => setContractsDialogDraft((prev) => ({ ...prev, deviseId: option ? String(option.DVCLEUNIK) : '' }))}
                    renderInput={(params) => <TextField {...params} label="Devise" size="small" />}
                    size="small"
                    sx={{ width: { xs: '100%', sm: 170 }, flexShrink: 0 }}
                  />
                </Stack>
              </>
            ) : (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ alignItems: { sm: 'flex-start' } }}>
                {transactionUsesSalaire ? (
                  <TextField
                    label="Salaire"
                    value={contractsDialogDraft.salaire}
                    onChange={(event) => setContractsDialogDraft((prev) => ({ ...prev, salaire: event.target.value }))}
                    size="small"
                    fullWidth
                    slotProps={{ htmlInput: { inputMode: 'decimal' } }}
                  />
                ) : null}

                {transactionUsesMoney ? (
                  <Autocomplete
                    options={contractsDevises}
                    getOptionLabel={(option) => `${option.NOM} (${option.SYMBOLE})`}
                    value={contractsDevises.find((option) => String(option.DVCLEUNIK) === contractsDialogDraft.deviseId) ?? null}
                    onChange={(_event, option) => setContractsDialogDraft((prev) => ({ ...prev, deviseId: option ? String(option.DVCLEUNIK) : '' }))}
                    renderInput={(params) => <TextField {...params} label="Devise" size="small" />}
                    size="small"
                    sx={{ width: { xs: '100%', sm: 170 }, flexShrink: 0 }}
                  />
                ) : null}
              </Stack>
            )}

            {transactionRequiresEcheance ? (
              <DateInputField
                label="Echeance"
                value={contractsDialogDraft.echeance}
                onChange={(nextDate) => setContractsDialogDraft((prev) => ({ ...prev, echeance: nextDate }))}
                size="small"
                fullWidth
                calendarAriaLabel="Calendrier echeance"
              />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContractsDialogOpen(false)} disabled={contractsDialogSaving}>Annuler</Button>
          <Button variant="contained" onClick={() => void handleContractsDialogSave()} disabled={contractsDialogSaving}>OK</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={contractsDeleteConfirmOpen} onClose={() => { if (!contractsDeleteSaving) setContractsDeleteConfirmOpen(false); }}>
        <DialogTitle>Supprimer une transaction</DialogTitle>
        <DialogContent>
          <DialogContentText>Confirmez-vous la suppression de la transaction selectionnee ?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setContractsDeleteConfirmOpen(false)} disabled={contractsDeleteSaving}>Annuler</Button>
          <Button color="error" variant="contained" onClick={() => void handleContractsDeleteConfirm()} disabled={contractsDeleteSaving}>Supprimer</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
