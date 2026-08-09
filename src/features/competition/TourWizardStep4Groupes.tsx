import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { type GridColDef, type GridRowId } from '@mui/x-data-grid';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { toErrorMessage } from '../../components/useEntityPage';
import { fetchTourDefById } from './competitionApi';
import { detectGroupNaming, makeAutoLabel, type GroupNameBase, type GroupNumbering } from './tourWizardGroupNaming';
import type { TourDefRow } from './types';

interface TourWizardStep4GroupesProps {
  tourType: 'ligue' | 'eliminatoire';
  tourDefId: number;
  initialGroupNames?: string[];
  nbParticipants: number;
  nbEquipe: number;
  nbGroupe: number;
  nbMatch: number;
  onNbEquipeChange: (value: number) => void;
  onNbGroupeChange: (value: number) => void;
  onNbMatchChange: (value: number) => void;
  onGroupNamesChange?: (value: string[]) => void;
  onError?: (message: string) => void;
}

interface GroupRow {
  id: number;
  NOM_GROUPE: string;
}

function normalizeInteger(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.trunc(parsed);
}

export function TourWizardStep4Groupes({
  tourType,
  tourDefId,
  initialGroupNames = [],
  nbParticipants,
  nbEquipe,
  nbGroupe,
  nbMatch,
  onNbEquipeChange,
  onNbGroupeChange,
  onNbMatchChange,
  onGroupNamesChange,
  onError,
}: TourWizardStep4GroupesProps) {
  const [groupNameBase, setGroupNameBase] = useState<GroupNameBase>('Groupe');
  const [groupNumbering, setGroupNumbering] = useState<GroupNumbering>('numeric');
  const [customNames, setCustomNames] = useState<string[]>([]);
  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [tourDef, setTourDef] = useState<TourDefRow | null>(null);
  const [tourDefLoading, setTourDefLoading] = useState(false);
  const [nbMatchTouched, setNbMatchTouched] = useState(false);
  const [maxPerGroupInput, setMaxPerGroupInput] = useState<string>('0');
  const [maxPerGroupTouched, setMaxPerGroupTouched] = useState(false);
  const initSignatureRef = useRef<string>('');

  const normalizedNbParticipants = Math.max(0, normalizeInteger(nbParticipants));
  const normalizedNbEquipe = Math.max(0, normalizeInteger(nbEquipe));
  const normalizedNbGroupe = Math.max(1, normalizeInteger(nbGroupe) || 1);
  const isSingleGroup = normalizedNbGroupe === 1;
  const isCustomNaming = groupNumbering === 'custom';
  const disableGroupConfig = isSingleGroup || tourType !== 'ligue';

  useEffect(() => {
    const existingNames = initialGroupNames
      .map((value) => String(value ?? '').trim())
      .filter((value) => value.length > 0)
      .slice(0, normalizedNbGroupe);
    if (existingNames.length === 0) {
      return;
    }

    const signature = existingNames.join('||');
    if (initSignatureRef.current === signature) {
      return;
    }
    initSignatureRef.current = signature;

    const detected = detectGroupNaming(existingNames);
    setGroupNameBase(detected.base);
    setGroupNumbering(detected.numbering);
    setCustomNames((prev) => {
      const next = [...prev];
      for (let i = 0; i < normalizedNbGroupe; i += 1) {
        next[i] = String(existingNames[i] ?? '').trim();
      }
      return next;
    });
  }, [initialGroupNames, normalizedNbGroupe]);

  useEffect(() => {
    if (!Number.isInteger(nbGroupe) || nbGroupe < 1) {
      onNbGroupeChange(1);
    }
  }, [nbGroupe, onNbGroupeChange]);

  useEffect(() => {
    setCustomNames((prev) => {
      const names = [...prev];
      if (names.length < normalizedNbGroupe) {
        for (let i = names.length; i < normalizedNbGroupe; i += 1) {
          names.push(``);
        }
      }
      if (names.length > normalizedNbGroupe) {
        names.length = normalizedNbGroupe;
      }
      return names;
    });
  }, [normalizedNbGroupe]);

  useEffect(() => {
    if (!Number.isInteger(tourDefId) || tourDefId <= 0) {
      setTourDef(null);
      return;
    }

    setTourDefLoading(true);
    void fetchTourDefById(tourDefId)
      .then((data) => setTourDef(data))
      .catch((error) => onError?.(toErrorMessage(error)))
      .finally(() => setTourDefLoading(false));
  }, [tourDefId, onError]);

  useEffect(() => {
    if (nbMatchTouched) {
      return;
    }

    const allerRetour = Number(tourDef?.ALLER_RETOUR ?? 0) === 1;
    const computedDefault = allerRetour
      ? Math.max(0, (2 * normalizedNbEquipe) - 2)
      : Math.max(0, normalizedNbEquipe - 1);

    if (normalizeInteger(nbMatch) !== computedDefault) {
      onNbMatchChange(computedDefault);
    }
  }, [tourDef, nbMatchTouched, normalizedNbEquipe, nbMatch, onNbMatchChange]);

  const computedMaxPerGroupFromParticipants = useMemo(() => {
    if (normalizedNbGroupe <= 1) {
      return normalizedNbParticipants;
    }
    return Math.ceil(normalizedNbParticipants / normalizedNbGroupe);
  }, [normalizedNbParticipants, normalizedNbGroupe]);

  useEffect(() => {
    if (maxPerGroupTouched) {
      return;
    }

    if (normalizedNbEquipe !== computedMaxPerGroupFromParticipants) {
      onNbEquipeChange(computedMaxPerGroupFromParticipants);
    }
  }, [computedMaxPerGroupFromParticipants, maxPerGroupTouched, normalizedNbEquipe, onNbEquipeChange]);

  useEffect(() => {
    if (isSingleGroup) {
      setMaxPerGroupTouched(false);
      setMaxPerGroupInput(String(normalizedNbEquipe));
      return;
    }

    if (!maxPerGroupTouched) {
      setMaxPerGroupInput(String(normalizedNbEquipe));
    }
  }, [isSingleGroup, maxPerGroupTouched, normalizedNbEquipe]);

  useEffect(() => {
    if (groupNumbering !== 'custom') {
      return;
    }

    setCustomNames((prev) => {
      const next = [...prev];
      for (let i = 0; i < normalizedNbGroupe; i += 1) {
        const current = String(next[i] ?? '').trim();
        if (!current) {
          next[i] = makeAutoLabel(groupNameBase, 'numeric', i);
        }
      }
      return next;
    });
  }, [groupNumbering, groupNameBase, normalizedNbGroupe]);

  const rows = useMemo<GroupRow[]>(() => {
    const nextRows: GroupRow[] = [];
    for (let i = 0; i < normalizedNbGroupe; i += 1) {
      if (isCustomNaming && !disableGroupConfig) {
        nextRows.push({
          id: i + 1,
          NOM_GROUPE: String(customNames[i] ?? ''),
        });
      } else {
        const numbering: Exclude<GroupNumbering, 'custom'> = groupNumbering === 'custom' ? 'numeric' : groupNumbering;
        nextRows.push({
          id: i + 1,
          NOM_GROUPE: makeAutoLabel(groupNameBase, numbering, i),
        });
      }
    }
    return nextRows;
  }, [normalizedNbGroupe, isCustomNaming, disableGroupConfig, customNames, groupNameBase, groupNumbering]);

  useEffect(() => {
    onGroupNamesChange?.(rows.map((row) => String(row.NOM_GROUPE ?? '').trim()));
  }, [rows, onGroupNamesChange]);

  const columns = useMemo<GridColDef<GroupRow>[]>(
    () => [
      { field: 'NOM_GROUPE', headerName: 'Nom du groupe', flex: 1, minWidth: 200, editable: true },
    ],
    [],
  );

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        Groupes
      </Typography>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
        <TextField
          label="Nombre de Groupes"
          size="small"
          type="number"
          value={String(normalizedNbGroupe)}
          onChange={(event) => {
            const parsed = Math.max(1, Math.min(99, normalizeInteger(event.target.value) || 1));
            onNbGroupeChange(parsed);
          }}
          slotProps={{ htmlInput: { min: 1, max: 99, step: 1 } }}
          sx={{ width: { xs: '100%', md: 220 } }}
          disabled={tourType !== 'ligue'}
        />

        <TextField
          label="Nombre d'équipes par groupe (max)"
          size="small"
          type="number"
          value={maxPerGroupInput}
          onChange={(event) => {
            setMaxPerGroupTouched(true);
            const parsed = Math.max(1, Math.min(99, normalizeInteger(event.target.value) || 1));
            setMaxPerGroupInput(String(parsed));
            onNbEquipeChange(parsed);
          }}
          slotProps={{ htmlInput: { min: 1, max: 99, step: 1 } }}
          sx={{ width: { xs: '100%', md: 280 } }}
          disabled={isSingleGroup || tourType !== 'ligue'}
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
        <TextField
          select
          label="Nom des Groupes"
          size="small"
          value={groupNameBase}
          onChange={(event) => setGroupNameBase(event.target.value as GroupNameBase)}
          sx={{ width: { xs: '100%', md: 260 } }}
          disabled={disableGroupConfig}
        >
          <MenuItem value="Division">Division</MenuItem>
          <MenuItem value="Groupe">Groupe</MenuItem>
          <MenuItem value="Ligue">Ligue</MenuItem>
          <MenuItem value="Poule">Poule</MenuItem>
        </TextField>

        <TextField
          select
          label="Numérotation des Groupes"
          size="small"
          value={groupNumbering}
          onChange={(event) => setGroupNumbering(event.target.value as GroupNumbering)}
          sx={{ width: { xs: '100%', md: 280 } }}
          disabled={disableGroupConfig}
        >
          <MenuItem value="custom">Personalisées</MenuItem>
          <MenuItem value="alpha">A, B, C</MenuItem>
          <MenuItem value="numeric">1, 2, 3</MenuItem>
        </TextField>
      </Stack>

      <TextField
        label="Nombre de match à jouer"
        size="small"
        type="number"
        value={String(Math.max(0, normalizeInteger(nbMatch)))}
        onChange={(event) => {
          setNbMatchTouched(true);
          const parsed = Math.max(0, Math.min(99, normalizeInteger(event.target.value) || 0));
          onNbMatchChange(parsed);
        }}
        slotProps={{ htmlInput: { min: 0, max: 99, step: 1 } }}
        sx={{ width: { xs: '100%', md: 240 } }}
      />

      {normalizedNbGroupe > 1 ? (
        <Stack spacing={0.75}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Liste des Groupes
          </Typography>
          <Box sx={{ height: 280, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <EntityDataGrid<GroupRow>
              rows={rows}
              columns={columns}
              loading={tourDefLoading}
              getRowId={(row) => row.id}
              selection={selection}
              onSelectionChange={setSelection}
              editMode="cell"
              isCellEditable={(params) => (
                params.field === 'NOM_GROUPE'
                && isCustomNaming
                && !disableGroupConfig
              )}
              processRowUpdate={(newRow) => {
                const id = Number(newRow.id);
                if (id <= 0 || id > customNames.length) {
                  return newRow;
                }
                const rawName = String(newRow.NOM_GROUPE ?? '');
                setCustomNames((prev) => {
                  const next = [...prev];
                  next[id - 1] = rawName;
                  return next;
                });
                return newRow;
              }}
              onProcessRowUpdateError={(error) => onError?.(toErrorMessage(error))}
            />
          </Box>
        </Stack>
      ) : null}
    </Stack>
  );
}
