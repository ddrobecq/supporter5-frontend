import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import {
  Alert,
  Box,
  Card,
  CardContent,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef, type GridSortModel } from '@mui/x-data-grid';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEntityImage } from '../../lib/useEntityImage';
import { fetchCalendarByDate, updateCalendarScore } from './calendrierApi';
import { ScoreCell, type ScoreDraft } from './ScoreCell';
import type { CalendrierRow } from './types';

const DEFAULT_SORT_MODEL: GridSortModel = [{ field: 'HEURE', sort: 'asc' }];

type RowSaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

type StatusAnchor = {
  rowId: string;
  status: Exclude<RowSaveStatus, 'idle'>;
  top: number;
};

function compareValues(a: unknown, b: unknown): number {
  const aNum = Number(a);
  const bNum = Number(b);
  const aIsNum = Number.isFinite(aNum);
  const bIsNum = Number.isFinite(bNum);

  if (aIsNum && bIsNum) {
    return aNum - bNum;
  }

  return String(a ?? '').localeCompare(String(b ?? ''), 'fr', { sensitivity: 'base' });
}

function getSortedRows(rows: CalendrierRow[], sortModel: GridSortModel): CalendrierRow[] {
  if (!sortModel.length) {
    return rows;
  }

  const [{ field, sort }] = sortModel;
  if (!sort) {
    return rows;
  }

  const multiplier = sort === 'asc' ? 1 : -1;
  const sortableFields = new Set(['ETAT', 'HEURE', 'DOMICILE_NOM', 'EXTERIEUR_NOM']);
  if (!sortableFields.has(field)) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    const cmp = compareValues(
      left[field as keyof CalendrierRow],
      right[field as keyof CalendrierRow],
    );
    if (cmp !== 0) {
      return cmp * multiplier;
    }
    return compareValues(left.RECLEUNIK, right.RECLEUNIK);
  });
}

function formatInputDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDate(date: string, deltaDays: number): string {
  const [year, month, day] = date.split('-').map((part) => Number(part));
  const base = new Date(year, month - 1, day);
  base.setDate(base.getDate() + deltaDays);
  return formatInputDate(base);
}

function mapStatus(etat: number): string {
  switch (Number(etat)) {
    case 1:
      return 'En attente';
    case 2:
      return 'En cours';
    case 3:
      return 'Terminée';
    case 4:
      return 'Non jouée';
    case 5:
      return 'Programmée';
    default:
      return `État ${etat}`;
  }
}

function scoreToInputValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  return String(Math.max(0, Math.trunc(numeric)));
}

function parseScoreInputValue(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.trunc(numeric);
}

function formatHeure(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const raw = String(value ?? '').trim();
  if (!raw || raw.toLowerCase() === 'null' || raw.toLowerCase() === 'undefined') return '';

  const parts = raw.split(':');
  const hh = parts[0] ?? '';
  const mm = parts[1] ?? '';

  if (hh.length === 0 || mm.length === 0) {
    return raw;
  }

  const hh2 = hh.padStart(2, '0').slice(-2);
  const mm2 = mm.padStart(2, '0').slice(0, 2);
  return `${hh2}h${mm2}`;
}

function ClubCell({
  clubId,
  clubName,
  alignRight = false,
}: {
  clubId: string;
  clubName: string;
  alignRight?: boolean;
}) {
  const { src } = useEntityImage('club', clubId);

  return (
    <Box sx={{ width: '100%', display: 'flex', justifyContent: alignRight ? 'flex-end' : 'flex-start' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        {alignRight ? (
          <>
            <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{clubName}</Box>
            <Box
              sx={{
                width: 22,
                height: 22,
                minWidth: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {src ? (
                <Box
                  component="img"
                  src={src}
                  alt={clubName}
                  sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <ShieldOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              )}
            </Box>
          </>
        ) : (
          <>
            <Box
              sx={{
                width: 22,
                height: 22,
                minWidth: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {src ? (
                <Box
                  component="img"
                  src={src}
                  alt={clubName}
                  sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <ShieldOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              )}
            </Box>
            <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clubName}</Box>
          </>
        )}
      </Stack>
    </Box>
  );
}

export function CalendrierPage() {
  const [date, setDate] = useState<string>(() => formatInputDate(new Date()));
  const [rows, setRows] = useState<CalendrierRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowSaveStatus, setRowSaveStatus] = useState<Record<string, RowSaveStatus>>({});
  const [editingScoreRowId, setEditingScoreRowId] = useState<string | number | null>(null);
  const [scoreDraft, setScoreDraft] = useState<ScoreDraft>({ tabDom: '', butDom: '', butExt: '', tabExt: '' });
  const [sortModel, setSortModel] = useState(DEFAULT_SORT_MODEL);
  const savingScoreRowIdRef = useRef<string | number | null>(null);
  const savedIconTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const gridWrapperRef = useRef<HTMLDivElement | null>(null);
  const [statusAnchors, setStatusAnchors] = useState<StatusAnchor[]>([]);

  const isDefaultHeureSort =
    sortModel.length === 1 && sortModel[0].field === 'HEURE' && sortModel[0].sort === 'asc';

  const orderedRows = useMemo(() => getSortedRows(rows, sortModel), [rows, sortModel]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void fetchCalendarByDate(date, controller.signal)
      .then((data) => setRows(data))
      .catch((err: unknown) => {
        if ((err as { code?: string })?.code === 'ERR_CANCELED') return;
        setError('Impossible de charger le calendrier.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [date]);

  useEffect(() => () => {
    Object.values(savedIconTimersRef.current).forEach((timer) => clearTimeout(timer));
    savedIconTimersRef.current = {};
  }, []);

  const updateStatusAnchors = useCallback(() => {
    const wrapper = gridWrapperRef.current;
    if (!wrapper) {
      setStatusAnchors([]);
      return;
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    const statusCells = wrapper.querySelectorAll<HTMLElement>('.MuiDataGrid-cell[data-field="ETAT"]');
    const nextAnchors: StatusAnchor[] = [];

    statusCells.forEach((cell) => {
      const rowId = cell.parentElement?.getAttribute('data-id') ?? '';
      if (!rowId) return;

      const status = rowSaveStatus[rowId] ?? 'idle';
      if (status === 'idle') return;

      const cellRect = cell.getBoundingClientRect();
      nextAnchors.push({
        rowId,
        status,
        top: cellRect.top - wrapperRect.top + (cellRect.height / 2),
      });
    });

    setStatusAnchors(nextAnchors);
  }, [rowSaveStatus]);

  useEffect(() => {
    const wrapper = gridWrapperRef.current;
    if (!wrapper) return;

    const refresh = () => {
      window.requestAnimationFrame(updateStatusAnchors);
    };

    const virtualScroller = wrapper.querySelector<HTMLElement>('.MuiDataGrid-virtualScroller');
    const renderZone = wrapper.querySelector<HTMLElement>('.MuiDataGrid-virtualScrollerRenderZone');

    refresh();
    virtualScroller?.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', refresh);

    const observer = new MutationObserver(refresh);
    if (renderZone) {
      observer.observe(renderZone, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'data-id'],
      });
    }

    return () => {
      virtualScroller?.removeEventListener('scroll', refresh);
      window.removeEventListener('resize', refresh);
      observer.disconnect();
    };
  }, [loading, orderedRows, sortModel, updateStatusAnchors]);

  const setRowStatusWithAutoHide = (rowId: string | number, status: RowSaveStatus): void => {
    const key = String(rowId);
    const timer = savedIconTimersRef.current[key];
    if (timer) {
      clearTimeout(timer);
      delete savedIconTimersRef.current[key];
    }

    setRowSaveStatus((prev) => ({ ...prev, [key]: status }));

    if (status === 'saved') {
      savedIconTimersRef.current[key] = setTimeout(() => {
        setRowSaveStatus((prev) => {
          if ((prev[key] ?? 'idle') !== 'saved') {
            return prev;
          }
          return { ...prev, [key]: 'idle' };
        });
        delete savedIconTimersRef.current[key];
      }, 3500);
    }
  };

  const startScoreEdit = (row: CalendrierRow): void => {
    setEditingScoreRowId(row.RECLEUNIK);
    setScoreDraft({
      tabDom: scoreToInputValue(row.TABDOM),
      butDom: scoreToInputValue(row.BUTDOM),
      butExt: scoreToInputValue(row.BUTEXT),
      tabExt: scoreToInputValue(row.TABEXT),
    });
  };

  const cancelScoreEdit = (row: CalendrierRow): void => {
    setScoreDraft({
      tabDom: scoreToInputValue(row.TABDOM),
      butDom: scoreToInputValue(row.BUTDOM),
      butExt: scoreToInputValue(row.BUTEXT),
      tabExt: scoreToInputValue(row.TABEXT),
    });
    setEditingScoreRowId((current) => (current === row.RECLEUNIK ? null : current));
  };

  const commitScoreEdit = async (row: CalendrierRow): Promise<void> => {
    const rowId = row.RECLEUNIK;
    if (editingScoreRowId !== rowId) return;
    if (savingScoreRowIdRef.current === rowId) return;

    savingScoreRowIdRef.current = rowId;
    const payload = {
      TABDOM: parseScoreInputValue(scoreDraft.tabDom),
      BUTDOM: parseScoreInputValue(scoreDraft.butDom),
      BUTEXT: parseScoreInputValue(scoreDraft.butExt),
      TABEXT: parseScoreInputValue(scoreDraft.tabExt),
    };

    setRowStatusWithAutoHide(rowId, 'saving');

    try {
      await updateCalendarScore(rowId, payload);
      setRows((prev) => prev.map((item) => (
        item.RECLEUNIK === rowId
          ? { ...item, TABDOM: payload.TABDOM, BUTDOM: payload.BUTDOM, BUTEXT: payload.BUTEXT, TABEXT: payload.TABEXT }
          : item
      )));
      setRowStatusWithAutoHide(rowId, 'saved');
    } catch {
      setError('Impossible d\'enregistrer le score.');
      setRowStatusWithAutoHide(rowId, 'failed');
    } finally {
      savingScoreRowIdRef.current = null;
      setEditingScoreRowId((current) => (current === rowId ? null : current));
    }
  };

  const moveScoreEditToAdjacentRow = async (row: CalendrierRow, direction: 'up' | 'down'): Promise<void> => {
    const currentIndex = orderedRows.findIndex((item) => item.RECLEUNIK === row.RECLEUNIK);
    if (currentIndex < 0) {
      return;
    }

    await commitScoreEdit(row);

    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= orderedRows.length) {
      return;
    }

    const nextRow = orderedRows[nextIndex];
    startScoreEdit(nextRow);
  };

  const columns = useMemo<GridColDef<CalendrierRow>[]>(() => [
    {
      field: 'ETAT',
      headerName: 'Statut',
      width: 90,
      sortable: true,
      renderCell: (params) => mapStatus(Number(params.row.ETAT)),
    },
    {
      field: 'HEURE',
      headerName: 'Heure',
      width: 70,
      align: 'center',
      headerAlign: 'center',
      sortable: true,
      renderCell: (params) => formatHeure(params.row.HEURE),
    },
    {
      field: 'DOMICILE_NOM',
      headerName: 'Domicile',
      headerAlign: 'right',
      minWidth: 120,
      flex: 1,
      resizable: false,
      sortable: true,
      renderCell: (params) => (
        <ClubCell
          clubId={String(params.row.DOMICILE ?? '')}
          clubName={String(params.row.DOMICILE_NOM ?? '')}
          alignRight
        />
      ),
    },
    {
      field: 'SCORE',
      headerName: 'Score',
      width: 72,
      align: 'center',
      headerAlign: 'center',
      sortable: false,
      renderCell: (params) => {
        const row = params.row;
        const isEditing = editingScoreRowId === row.RECLEUNIK;
        return (
          <ScoreCell
            row={row}
            isEditing={isEditing}
            draft={scoreDraft}
            onStartEdit={() => startScoreEdit(row)}
            onDraftChange={(patch) => setScoreDraft((prev) => ({ ...prev, ...patch }))}
            onCommit={() => commitScoreEdit(row)}
            onCancel={() => cancelScoreEdit(row)}
            onMoveVertical={(direction) => moveScoreEditToAdjacentRow(row, direction)}
          />
        );
      },
    },
    {
      field: 'EXTERIEUR_NOM',
      headerName: 'Extérieur',
      minWidth: 120,
      flex: 1,
      resizable: false,
      sortable: true,
      renderCell: (params) => (
        <ClubCell clubId={String(params.row.EXTERIEUR ?? '')} clubName={String(params.row.EXTERIEUR_NOM ?? '')} />
      ),
    },
  ], [editingScoreRowId, scoreDraft]);

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'center', width: '100%', flexWrap: 'nowrap' }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>Calendrier</Typography>

        <Box
          sx={{
            ml: 'auto',
            flex: 1,
            minWidth: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '1px', flexWrap: 'nowrap' }}>
            <IconButton
              color="primary"
              aria-label="Précédent"
              onClick={() => setDate((current) => shiftDate(current, -1))}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flex: '0 0 auto' }}
            >
              <ChevronLeftRoundedIcon />
            </IconButton>

            <TextField
              inputRef={dateInputRef}
              type="date"
              size="small"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              sx={{ width: { xs: '42vw', sm: 160 }, minWidth: 120, maxWidth: 170, flex: '0 0 auto' }}
            />

            <IconButton
              color="primary"
              aria-label="Suivant"
              onClick={() => setDate((current) => shiftDate(current, 1))}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, flex: '0 0 auto' }}
            >
              <ChevronRightRoundedIcon />
            </IconButton>
          </Box>
        </Box>
      </Stack>

      <Card>
        <CardContent>
          {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}

          <Box ref={gridWrapperRef} sx={{ mt: 2, height: 'calc(100vh - 270px)', minHeight: 420, position: 'relative' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              sortModel={sortModel}
              onSortModelChange={(model) => setSortModel(model)}
              getRowId={(row) => row.RECLEUNIK}
              disableRowSelectionOnClick
              disableColumnMenu
              density="compact"
              pageSizeOptions={[25, 50, 100]}
              sx={{
                width: '100%',
                '@keyframes spin': {
                  from: { transform: 'rotate(0deg)' },
                  to: { transform: 'rotate(360deg)' },
                },
                '& .MuiDataGrid-cell': { cursor: 'default' },
                ...(isDefaultHeureSort
                  ? {
                      '& .MuiDataGrid-columnHeader[data-field="HEURE"] .MuiDataGrid-iconButtonContainer': {
                        visibility: 'hidden',
                        width: 0,
                      },
                    }
                  : {}),
              }}
            />

            <Box
              sx={{
                position: 'absolute',
                left: -14,
                top: 0,
                width: 14,
                height: '100%',
                pointerEvents: 'none',
                zIndex: 2,
              }}
            >
              {statusAnchors.map((anchor) => (
                <Box
                  key={`${anchor.rowId}-${anchor.status}`}
                  sx={{
                    position: 'absolute',
                    top: anchor.top,
                    left: 0,
                    transform: 'translateY(-50%)',
                    width: 14,
                    height: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {anchor.status === 'saving' ? (
                    <AutorenewRoundedIcon sx={{ fontSize: 14, color: 'info.main', animation: 'spin 1s linear infinite' }} />
                  ) : anchor.status === 'saved' ? (
                    <CheckCircleRoundedIcon sx={{ fontSize: 14, color: 'success.main' }} />
                  ) : (
                    <ErrorOutlineRoundedIcon sx={{ fontSize: 14, color: 'error.main' }} />
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Stack>
  );
}