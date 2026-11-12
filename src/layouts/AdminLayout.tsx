import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
} from '@mui/material';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppFeedbackSnackbar, type FeedbackMessage } from '../components/AppFeedbackSnackbar';
import { BACKUP_RESULT_EVENT, maybeRunAutomaticBackup, type BackupResultEventDetail } from '../features/maintenance/backupRunner';
import { supportedClubStore } from '../features/system/supportedClubStore';
import { PICKER_ENTITY_DEFINITIONS, TAB_META, type PickerEntityKey } from './adminLayoutConfig';
import { decodeRouteSegment, normalizeRoutePath, resolveTabMetaPath } from './adminLayoutRoutes';
import { AdminToolbar } from './AdminToolbar';
import { AdminToolDialogs, type AdminToolDialogFlag, type AdminToolDialogsState } from './AdminToolDialogs';
import { useAdminTabs } from './useAdminTabs';

const RencontreTabFormPane = lazy(() => import('../features/rencontre/RencontreTabFormPane').then((module) => ({ default: module.RencontreTabFormPane })));

const CLOSED_TOOL_DIALOGS: AdminToolDialogsState = {
  picker: null,
  clubMerge: false,
  statsRecompute: false,
  rencontreImport: false,
  saisonWizard: false,
  rencontreWizard: false,
};

const isDynamicFormPath = (path: string) => (
  path.startsWith('/admin/rencontres/')
  || PICKER_ENTITY_DEFINITIONS.some((entity) => path.startsWith(`${entity.basePath}/`))
);

export function AdminLayout() {
  const location = useLocation();
  const loadSupportedClub = supportedClubStore((s) => s.load);
  const [toolDialogs, setToolDialogs] = useState<AdminToolDialogsState>(CLOSED_TOOL_DIALOGS);
  const [toolsFeedback, setToolsFeedback] = useState<FeedbackMessage | null>(null);
  const {
    tabs,
    activeTabKey,
    activeTab,
    dirtyTabsByPath,
    italicTabsByPath,
    homeOutletContext,
    openTab,
    selectTab,
    closeTab,
    closeConfirm,
  } = useAdminTabs();
  const activeTabIsDynamicForm = Boolean(activeTab?.path && isDynamicFormPath(activeTab.path)) || isDynamicFormPath(location.pathname);

  const openPicker = useCallback((entity: PickerEntityKey) => {
    setToolDialogs((prev) => ({ ...prev, picker: entity }));
  }, []);
  const closePicker = useCallback(() => {
    setToolDialogs((prev) => ({ ...prev, picker: null }));
  }, []);
  const openToolDialog = useCallback((dialog: AdminToolDialogFlag) => {
    setToolDialogs((prev) => ({ ...prev, [dialog]: true }));
  }, []);
  const closeToolDialog = useCallback((dialog: AdminToolDialogFlag) => {
    setToolDialogs((prev) => ({ ...prev, [dialog]: false }));
  }, []);

  useEffect(() => {
    void loadSupportedClub();
  }, [loadSupportedClub]);

  useEffect(() => {
    void maybeRunAutomaticBackup();
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<BackupResultEventDetail>;
      const { success, message } = customEvent.detail ?? {};
      if (!message) return;
      setToolsFeedback({ severity: success ? 'success' : 'error', message });
    };

    window.addEventListener(BACKUP_RESULT_EVENT, handler);
    return () => window.removeEventListener(BACKUP_RESULT_EVENT, handler);
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar + 2,
          boxShadow: '0 1px 0 rgba(15, 23, 42, 0.08)',
        }}
      >
        <AdminToolbar openTab={openTab} onOpenPicker={openPicker} onOpenDialog={openToolDialog} />

        <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', px: 1.5 }}>
          <Tabs
            value={activeTabKey}
            variant="scrollable"
            scrollButtons="auto"
            onChange={(_event, newValue: string) => selectTab(newValue)}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.key}
                value={tab.key}
                label={(
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                      {TAB_META[resolveTabMetaPath(tab.path)]?.icon ?? null}
                    </Box>
                    <span style={{ fontStyle: italicTabsByPath[normalizeRoutePath(tab.path)] ? 'italic' : 'normal' }}>{tab.label}</span>
                    {dirtyTabsByPath[normalizeRoutePath(tab.path)] ? (
                      <Box
                        component="span"
                        aria-label="Modifications non enregistrées"
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: 'warning.main',
                          display: 'inline-block',
                          ml: 0.25,
                        }}
                      />
                    ) : null}
                    {tab.closable ? (
                      <IconButton
                        size="small"
                        aria-label={`Fermer ${tab.label}`}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          closeTab(tab.key);
                        }}
                        sx={{ p: 0.1 }}
                      >
                        <CloseRoundedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    ) : null}
                  </Box>
                )}
              />
            ))}
          </Tabs>
        </Box>
      </Box>

      <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
        <Suspense fallback={null}>
          {tabs
            .filter((tab) => tab.path.startsWith('/admin/rencontres/'))
            .map((tab) => {
              const encodedId = tab.path.slice('/admin/rencontres/'.length);
              if (!encodedId) return null;
              const decodedId = decodeRouteSegment(encodedId);
              return (
                <RencontreTabFormPane
                  key={tab.key}
                  tabPath={tab.path}
                  rencontreId={decodedId}
                  active={activeTabKey === tab.key}
                />
              );
            })}
          {PICKER_ENTITY_DEFINITIONS.flatMap((entity) => tabs
            .filter((tab) => tab.path.startsWith(`${entity.basePath}/`))
            .map((tab) => {
              const encodedId = tab.path.slice(`${entity.basePath}/`.length);
              if (!encodedId) return null;
              const decodedId = decodeRouteSegment(encodedId);
              return entity.renderTabPane({ tab, decodedId, active: activeTabKey === tab.key });
            }))}
          {!activeTabIsDynamicForm ? <Outlet context={homeOutletContext} /> : null}
        </Suspense>
      </Box>

      <AdminToolDialogs
        state={toolDialogs}
        onCloseDialog={closeToolDialog}
        onClosePicker={closePicker}
        openTab={openTab}
        onFeedback={setToolsFeedback}
      />

      <Dialog
        open={closeConfirm.open}
        onClose={() => { if (!closeConfirm.saving) closeConfirm.cancel(); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Modifications non enregistrées</DialogTitle>
        <DialogContent>
          Voulez-vous enregistrer les modifications avant de fermer cet onglet ?
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeConfirm.cancel}
            disabled={closeConfirm.saving}
            color="inherit"
          >
            Annuler
          </Button>
          <Button
            onClick={closeConfirm.closeWithoutSaving}
            disabled={closeConfirm.saving}
            color="error"
          >
            Fermer sans enregistrer
          </Button>
          <Button
            variant="contained"
            disabled={closeConfirm.saving}
            onClick={closeConfirm.saveAndClose}
          >
            {closeConfirm.saving ? 'Enregistrement...' : 'Enregistrer et fermer'}
          </Button>
        </DialogActions>
      </Dialog>

      <AppFeedbackSnackbar value={toolsFeedback} onClose={() => setToolsFeedback(null)} />
    </Box>
  );
}
