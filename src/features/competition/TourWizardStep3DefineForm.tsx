import {
  Box,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityDataGrid } from '../../components/EntityDataGrid';
import { toErrorMessage } from '../../components/useEntityPage';
import { fetchTourDefsByType, fetchTourDefById } from './competitionApi';
import type { TourDefRow } from './types';

interface TourDefFormState {
  tourDefId: number;
  nom: string;
  dureeRegTime: number;
  dureeProlongTime: number;
  finTpsReg: number;
  finProlong: number;
  allerRetour: boolean;
  valeurVD: number;
  valeurVE: number;
  valeurND: number;
  valeurNE: number;
  valeurDD: number;
  valeurDE: number;
  tdCalculDiffBut: number;
  classGadScope: number;
  valeurBe: boolean;
  bonusType: number;
  bonusNbBut: number;
  valeurBonusV: number;
  valeurBonusN: number;
  valeurBonusD: number;
}

interface TourWizardStep3DefineFormProps {
  tourType: 'ligue' | 'eliminatoire';
  initialTourDefId?: number;
  onTourDefChange?: (tourDefId: number) => void;
  onError?: (message: string) => void;
}

const FIN_TIME_REG_OPTIONS = [
  { value: 1, label: 'Fin du match' },
  { value: 2, label: 'Prolongation' },
  { value: 3, label: 'Match rejoué' },
  { value: 4, label: 'Tirage au sort' },
];

const FIN_PROLONG_OPTIONS = [
  { value: 1, label: 'But en Or' },
  { value: 2, label: 'But en Argent' },
  { value: 3, label: 'Tirs au but' },
  { value: 4, label: 'Rejoué' },
  { value: 5, label: 'Tirage au sort' },
];

const BONUS_TYPE_OPTIONS = [
  { value: 1, label: 'Aucun' },
  { value: 2, label: 'sur nombre de buts marqués (bonus si supérieur)' },
  { value: 3, label: 'sur différence de buts (bonus si supérieur)' },
  { value: 4, label: 'sur nombre de buts marqués (bonus par but)' },
];

function createDefaultFormState(): TourDefFormState {
  return {
    tourDefId: 0,
    nom: '',
    dureeRegTime: 90,
    dureeProlongTime: 30,
    finTpsReg: 1,
    finProlong: 1,
    allerRetour: false,
    valeurVD: 3,
    valeurVE: 3,
    valeurND: 1,
    valeurNE: 1,
    valeurDD: 0,
    valeurDE: 0,
    tdCalculDiffBut: 1,
    classGadScope: 1,
    valeurBe: false,
    bonusType: 1,
    bonusNbBut: 0,
    valeurBonusV: 0,
    valeurBonusN: 0,
    valeurBonusD: 0,
  };
}

function createFormStateFromTourDef(tourDef: TourDefRow): TourDefFormState {
  const finTpsReg = Number(tourDef.FIN_TPS_REG);
  const finProlong = Number(tourDef.FIN_PROLONG);

  return {
    tourDefId: tourDef.TDCLEUNIK,
    nom: String(tourDef.NOM ?? ''),
    dureeRegTime: Number(tourDef.DUREE_TPS_REG ?? 90) || 90,
    dureeProlongTime: Number(tourDef.DUREE_TPS_PROLONG ?? 30) || 30,
    finTpsReg: Number.isInteger(finTpsReg) && finTpsReg >= 1 && finTpsReg <= 4 ? finTpsReg : 1,
    finProlong: Number.isInteger(finProlong) && finProlong >= 1 && finProlong <= 5 ? finProlong : 1,
    allerRetour: Number(tourDef.ALLER_RETOUR ?? 0) === 1,
    valeurVD: Number(tourDef.VALEUR_VD ?? 3) || 3,
    valeurVE: Number(tourDef.VALEUR_VE ?? 3) || 3,
    valeurND: Number(tourDef.VALEUR_ND ?? 1) || 1,
    valeurNE: Number(tourDef.VALEUR_NE ?? 1) || 1,
    valeurDD: Number(tourDef.VALEUR_DD ?? 0) || 0,
    valeurDE: Number(tourDef.VALEUR_DE ?? 0) || 0,
    tdCalculDiffBut: Number(tourDef.TDCalculDiffBut ?? 1) || 1,
    classGadScope: Number(tourDef.CLASS_GAD ?? 1) === 2 ? 2 : 1,
    valeurBe: Number(tourDef.VALEUR_BE ?? 0) === 1,
    bonusType: Number(tourDef.BONUS_TYPE ?? 1) || 1,
    bonusNbBut: Number(tourDef.BONUS_NB_BUT ?? 0) || 0,
    valeurBonusV: Number(tourDef.VALEUR_BONUS_V ?? 0) || 0,
    valeurBonusN: Number(tourDef.VALEUR_BONUS_N ?? 0) || 0,
    valeurBonusD: Number(tourDef.VALEUR_BONUS_D ?? 0) || 0,
  };
}

export function TourWizardStep3DefineForm({
  tourType,
  initialTourDefId,
  onTourDefChange,
  onError,
}: TourWizardStep3DefineFormProps) {
  const [tourDefs, setTourDefs] = useState<TourDefRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTourDefId, setSelectedTourDefId] = useState<number | null>(null);
  const [form, setForm] = useState<TourDefFormState>(createDefaultFormState());
  
  const onErrorRef = useRef(onError);
  const onTourDefChangeRef = useRef(onTourDefChange);

  useEffect(() => {
    onErrorRef.current = onError;
    onTourDefChangeRef.current = onTourDefChange;
  }, [onError, onTourDefChange]);

  const typeId = tourType === 'eliminatoire' ? 2 : 1;

  // Fetch tour definitions when type changes
  useEffect(() => {
    setLoading(true);
    void fetchTourDefsByType(typeId)
      .then((defs) => {
        setTourDefs(defs);
        
        // Determine which TOURDEF to select:
        // 1. If initialTourDefId is provided and exists in defs, use it
        // 2. Otherwise, use the first def in the list
        if (defs.length > 0) {
          if (initialTourDefId && defs.some(def => def.TDCLEUNIK === initialTourDefId)) {
            setSelectedTourDefId(initialTourDefId);
          } else {
            setSelectedTourDefId(defs[0].TDCLEUNIK);
          }
        }
      })
      .catch((error) => {
        onErrorRef.current?.(toErrorMessage(error));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [typeId, initialTourDefId]);

  // Load tour def form data when selectedTourDefId changes or when tourDefs are loaded
  useEffect(() => {
    if (!selectedTourDefId || tourDefs.length === 0) {
      return;
    }

    setLoading(true);
    void fetchTourDefById(selectedTourDefId)
      .then((tourDef) => {
        const nextForm = createFormStateFromTourDef(tourDef);
        setForm(nextForm);
        onTourDefChangeRef.current?.(tourDef.TDCLEUNIK);
      })
      .catch((error) => {
        onErrorRef.current?.(toErrorMessage(error));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedTourDefId, tourDefs.length]);

  const columns = useMemo(
    () => [
      {
        field: 'NOM',
        headerName: 'Nom',
        flex: 1,
        minWidth: 200,
      },
    ],
    [],
  );

  const selectedConfigSummary = useMemo(() => {
    const finTpsRegLabel = FIN_TIME_REG_OPTIONS.find((opt) => opt.value === form.finTpsReg)?.label ?? 'Fin du match';
    const finProlongLabel = FIN_PROLONG_OPTIONS.find((opt) => opt.value === form.finProlong)?.label ?? 'But en Or';
    const bonusLabel = BONUS_TYPE_OPTIONS.find((opt) => opt.value === form.bonusType)?.label ?? 'Aucun';
    const modeCalculLabel = form.tdCalculDiffBut === 2
      ? 'Ratio : Buts Pour / Buts Contre'
      : 'Différence : Buts Pour - Buts Contre';
    const scopeLabel = form.classGadScope === 2 ? 'Général' : 'Direct';

    const lines: string[] = [
      `Durée: ${form.dureeRegTime} min de temps réglementaire${form.finTpsReg === 2 ? `, puis ${form.dureeProlongTime} min de prolongation` : ''}.`,
      `Issue du match: ${finTpsRegLabel}${form.finTpsReg === 2 ? `, avec fin de prolongation par ${finProlongLabel}` : ''}.`,
      `Points: V domicile ${form.valeurVD}, V extérieur ${form.valeurVE}, N domicile ${form.valeurND}, N extérieur ${form.valeurNE}, D domicile ${form.valeurDD}, D extérieur ${form.valeurDE}.`,
      `Goalaverage: calcul ${modeCalculLabel.toLowerCase()}, scope ${scopeLabel}${form.valeurBe ? ', avec prise en compte des buts à l\'extérieur' : ''}.`,
      form.allerRetour ? 'Format aller/retour activé.' : 'Format aller simple.',
    ];

    if (form.bonusType === 1) {
      lines.push('Bonus: aucun bonus.');
    } else {
      lines.push(
        `Bonus: ${bonusLabel}, seuil ${form.bonusNbBut}, valeurs V/N/D ${form.valeurBonusV}/${form.valeurBonusN}/${form.valeurBonusD}.`,
      );
    }

    return lines;
  }, [form]);

  return (
    <Stack spacing={2.5}>
      {/* Grid de TourDefs */}
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Sélectionner une définition de tour
        </Typography>
        <Box sx={{ height: 250, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <EntityDataGrid<TourDefRow>
            rows={tourDefs}
            columns={columns}
            loading={loading}
            getRowId={(row) => row.TDCLEUNIK}
            selection={selectedTourDefId ? [selectedTourDefId] : []}
            onSelectionChange={(selection) => {
              const id = Array.isArray(selection) && selection.length > 0 ? selection[0] : null;
              if (id) {
                const numId = typeof id === 'string' ? parseInt(id, 10) : Number(id);
                setSelectedTourDefId(numId);
              }
            }}
            onRowDoubleClick={(id) => {
              if (id) {
                setSelectedTourDefId(id as number);
              }
            }}
            disableRowSelectionOnClick={true}
          />
        </Box>
      </Box>

      {/* Résumé de configuration */}
      <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          Résumé de la configuration
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {form.nom ? `${form.nom} (ID ${form.tourDefId})` : `TourDef #${form.tourDefId}`}
        </Typography>
        <Stack spacing={0.75}>
          {selectedConfigSummary.map((line) => (
            <Typography key={line} variant="body2" color="text.secondary">
              {line}
            </Typography>
          ))}
        </Stack>
      </Box>
    </Stack>
  );
}
