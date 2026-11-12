import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import { lazy, Suspense } from 'react';
import type { FeedbackMessage } from '../components/AppFeedbackSnackbar';
import { PICKER_ENTITY_DEFINITIONS, type PickerEntityKey, type PickerOpenPayload } from './adminLayoutConfig';
import type { OpenTab } from './useAdminTabs';

const RencontreCreateWizardDialog = lazy(() => import('../features/rencontre/RencontreCreateWizardDialog').then((module) => ({ default: module.RencontreCreateWizardDialog })));
const TerrainPickerDialog = lazy(() => import('../features/terrain/TerrainPickerDialog').then((module) => ({ default: module.TerrainPickerDialog })));
const ClubMergeDialog = lazy(() => import('../features/club/ClubMergeDialog').then((module) => ({ default: module.ClubMergeDialog })));
const StatsRecomputeDialog = lazy(() => import('../features/statistiques/StatsRecomputeDialog').then((module) => ({ default: module.StatsRecomputeDialog })));
const RencontreImportWizardDialog = lazy(() => import('../features/import/RencontreImportWizardDialog').then((module) => ({ default: module.RencontreImportWizardDialog })));
const SaisonCreateWizardDialog = lazy(() => import('../features/saison/SaisonCreateWizardDialog').then((module) => ({ default: module.SaisonCreateWizardDialog })));

const PICKER_DEFINITION_BY_KEY = new Map(PICKER_ENTITY_DEFINITIONS.map((entity) => [entity.key, entity]));

export interface AdminToolDialogsState {
  picker: PickerEntityKey | null;
  clubMerge: boolean;
  statsRecompute: boolean;
  rencontreImport: boolean;
  saisonWizard: boolean;
  rencontreWizard: boolean;
}

export type AdminToolDialogFlag = Exclude<keyof AdminToolDialogsState, 'picker'>;

interface AdminToolDialogsProps {
  state: AdminToolDialogsState;
  onCloseDialog: (dialog: AdminToolDialogFlag) => void;
  onClosePicker: () => void;
  openTab: OpenTab;
  onFeedback: (feedback: FeedbackMessage) => void;
}

export function AdminToolDialogs({ state, onCloseDialog, onClosePicker, openTab, onFeedback }: AdminToolDialogsProps) {
  const activePickerEntity = state.picker ? PICKER_DEFINITION_BY_KEY.get(state.picker) ?? null : null;

  const handlePickerOpenInTab = ({ rowId, label }: PickerOpenPayload) => {
    const entity = activePickerEntity;
    if (!entity) return;
    onClosePicker();
    openTab(`${entity.basePath}/${encodeURIComponent(String(rowId))}`, label, { unique: true, uniqueByPath: true });
  };

  return (
    <>
      <Dialog
        open={activePickerEntity !== null && activePickerEntity.key !== 'terrain'}
        onClose={onClosePicker}
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
        {activePickerEntity ? (
          <>
            <DialogTitle sx={{ pr: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                  {activePickerEntity.titleIcon}
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{activePickerEntity.modalTitle}</Typography>
                </Box>
                <IconButton aria-label={activePickerEntity.closeAriaLabel} onClick={onClosePicker}>
                  <CloseRoundedIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 2, bgcolor: 'background.default', overflow: 'hidden', display: 'flex', minHeight: 0, minWidth: 0 }}>
              <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', '& > *': { flex: 1, minHeight: 0, minWidth: 0 } }}>
                <Suspense fallback={null}>
                  {activePickerEntity.renderPage(handlePickerOpenInTab)}
                </Suspense>
              </Box>
            </DialogContent>
          </>
        ) : null}
      </Dialog>

      {activePickerEntity?.key === 'terrain' ? (
        <Suspense fallback={null}>
          <TerrainPickerDialog
            open
            onClose={onClosePicker}
            onSelect={handlePickerOpenInTab}
          />
        </Suspense>
      ) : null}

      {state.rencontreWizard ? (
        <Suspense fallback={null}>
          <RencontreCreateWizardDialog
            open
            onClose={() => onCloseDialog('rencontreWizard')}
            onCreated={async (createdId, label) => {
              openTab(`/admin/rencontres/${encodeURIComponent(String(createdId))}`, label || 'Rencontre', { unique: true, uniqueByPath: true });
            }}
          />
        </Suspense>
      ) : null}

      {state.clubMerge ? (
        <Suspense fallback={null}>
          <ClubMergeDialog open onClose={() => onCloseDialog('clubMerge')} />
        </Suspense>
      ) : null}

      {state.statsRecompute ? (
        <Suspense fallback={null}>
          <StatsRecomputeDialog open onClose={() => onCloseDialog('statsRecompute')} />
        </Suspense>
      ) : null}

      {state.rencontreImport ? (
        <Suspense fallback={null}>
          <RencontreImportWizardDialog
            open
            onClose={() => onCloseDialog('rencontreImport')}
            onReady={() => openTab('/admin/import-rencontres', 'Import de rencontres', { unique: true, uniqueByPath: true })}
          />
        </Suspense>
      ) : null}

      {state.saisonWizard ? (
        <Suspense fallback={null}>
          <SaisonCreateWizardDialog
            open
            onClose={() => onCloseDialog('saisonWizard')}
            onCreated={(result) => {
              onFeedback({
                severity: 'success',
                message: `Saison ${result.SAISON} créée (${result.joueursCount} joueur(s), ${result.competitionsCount} compétition(s)).`,
              });
            }}
            onError={(message) => onFeedback({ severity: 'error', message })}
          />
        </Suspense>
      ) : null}
    </>
  );
}
