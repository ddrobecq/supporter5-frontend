import type { GridRowId } from '@mui/x-data-grid';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import type { FeedbackMessage } from './AppFeedbackSnackbar';
import type { IntegrityConstraint } from './EntityPageLayout';

export interface EntityApi<Row> {
  fetchAll: (search: string, signal?: AbortSignal) => Promise<{ data?: Row[] }>;
  fetchById: (id: string | number) => Promise<Row>;
  create: (payload: Row) => Promise<unknown>;
  update: (id: string | number, payload: Row) => Promise<unknown>;
  remove: (id: string | number) => Promise<unknown>;
  canDelete: (id: string | number) => Promise<{ constraints: IntegrityConstraint[] }>;
}

export interface EntityLabels {
  /** Ex: "pays", "ville", "arbitre", "terrain" */
  singular: string;
  /** Ex: "ce pays", "cette ville", "cet arbitre", "ce terrain" */
  singularArticle: string;
  created: string;
  updated: string;
  deleted: string;
  selectToOpen: string;
  selectToDelete: string;
  noneSelected: string;
}

export function toErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiMessage = (error.response?.data as { message?: string } | undefined)?.message;
    if (apiMessage) return apiMessage;
    if (error.response?.status === 401) return 'Session expiree. Reconnectez-vous.';
    if (error.response?.status === 409) return 'Suppression impossible: des enregistrements dependants existent.';
  }
  return 'Une erreur est survenue.';
}

export function useEntityPage<Row extends Record<string, unknown>>(
  api: EntityApi<Row>,
  labels: EntityLabels,
  onInitialLoad?: () => void,
) {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const didFocusSearchRef = useRef(false);
  const actionButtonsRowRef = useRef<HTMLDivElement | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  const [selection, setSelection] = useState<GridRowId[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [activeRow, setActiveRow] = useState<Row | undefined>(undefined);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteConstraints, setDeleteConstraints] = useState<IntegrityConstraint[]>([]);

  const [snackbar, setSnackbar] = useState<FeedbackMessage | null>(null);
  const [compactActionButtons, setCompactActionButtons] = useState(false);

  const loadData = async (query: string) => {
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    setLoading(true);
    try {
      const result = await api.fetchAll(query.trim(), controller.signal);
      if (controller.signal.aborted) return;
      setRows(result.data ?? []);
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') return;
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    } finally {
      if (activeRequestRef.current === controller) {
        setLoading(false);
        activeRequestRef.current = null;
      }
    }
  };

  const openCreateDialog = () => {
    setDialogMode('create');
    setActiveRow(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = async (
    rowId?: GridRowId,
    options?: { preloadedRow?: Row },
  ) => {
    const selectedId = rowId ?? selection.at(0);
    if (selectedId === undefined || selectedId === null) {
      setSnackbar({ severity: 'error', message: labels.selectToOpen });
      return;
    }

    if (options?.preloadedRow) {
      setDialogMode('edit');
      setActiveRow(options.preloadedRow);
      setSelection([selectedId]);
      setDialogOpen(true);
      return;
    }

    try {
      const row = await api.fetchById(selectedId as string | number);
      setDialogMode('edit');
      setActiveRow(row);
      setSelection([selectedId]);
      setDialogOpen(true);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  const handleFormSubmit = async (payload: Row) => {
    try {
      if (dialogMode === 'create') {
        await api.create(payload);
        setSnackbar({ severity: 'success', message: labels.created });
      } else {
        const selectedId = selection.at(0);
        if (!selectedId) {
          setSnackbar({ severity: 'error', message: labels.noneSelected });
          return;
        }
        await api.update(selectedId as string | number, payload);
        setSnackbar({ severity: 'success', message: labels.updated });
      }
      setDialogOpen(false);
      await loadData(search);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  const handleDelete = async () => {
    const selectedId = selection.at(0);
    if (!selectedId) {
      setSnackbar({ severity: 'error', message: labels.selectToDelete });
      return;
    }
    try {
      await api.remove(selectedId as string | number);
      setSnackbar({ severity: 'success', message: labels.deleted });
      setConfirmDeleteOpen(false);
      setDeleteConstraints([]);
      setSelection([]);
      await loadData(search);
    } catch (error) {
      const message = toErrorMessage(error);
      setSnackbar({ severity: 'error', message });
      setConfirmDeleteOpen(false);
      setDeleteConstraints([]);
    }
  };

  const handleOpenDeleteConfirm = async () => {
    const selectedId = selection.at(0);
    if (!selectedId) {
      setSnackbar({ severity: 'error', message: labels.selectToDelete });
      return;
    }
    try {
      const result = await api.canDelete(selectedId as string | number);
      setDeleteConstraints(result.constraints);
      setConfirmDeleteOpen(true);
    } catch (error) {
      setSnackbar({ severity: 'error', message: toErrorMessage(error) });
    }
  };

  const closeDeleteConfirm = () => {
    setConfirmDeleteOpen(false);
    setDeleteConstraints([]);
  };

  // Focus initial après chargement
  useEffect(() => {
    if (!loading && !didFocusSearchRef.current) {
      searchInputRef.current?.focus();
      didFocusSearchRef.current = true;
    }
  }, [loading]);

  // Debounce recherche
  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadData(search);
    }, 320);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Chargement initial optionnel
  useEffect(() => {
    onInitialLoad?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup AbortController
  useEffect(() => () => {
    activeRequestRef.current?.abort();
  }, []);

  // Boutons compacts (ResizeObserver)
  useEffect(() => {
    const row = actionButtonsRowRef.current;
    if (!row) return;
    const update = () => {
      const widthPerButton = (row.clientWidth - 16) / 3;
      setCompactActionButtons(widthPerButton < 120);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(row);
    return () => observer.disconnect();
  }, []);

  return {
    rows,
    search, setSearch,
    loading,
    searchInputRef,
    actionButtonsRowRef,
    selection, setSelection,
    dialogOpen, setDialogOpen,
    dialogMode,
    activeRow,
    confirmDeleteOpen,
    deleteConstraints,
    snackbar, setSnackbar,
    compactActionButtons,
    openCreateDialog,
    openEditDialog,
    reloadData: async () => {
      await loadData(search);
    },
    handleFormSubmit,
    handleDelete,
    handleOpenDeleteConfirm,
    closeDeleteConfirm,
  };
}
