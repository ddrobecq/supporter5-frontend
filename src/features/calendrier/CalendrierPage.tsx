import { useCallback, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import {
  Alert,
  Box,
  Card,
  CardContent,
  IconButton,
  Stack,
  Tooltip,
} from '@mui/material';
import { MatchDataGrid } from '../../components/MatchDataGrid';
import { CalendarDateNavigator } from './CalendarDateNavigator';
import { entityPath } from '../../lib/entityNavigation';
import { isHttpUrl } from '../../lib/safeUrl';
import { TourClassementCard, type TourClassementCardHandle } from './TourClassementCard';
import type { CalendrierRow } from './types';
import { rowStatusClass } from '../../lib/matchStatus';
import { emitTabOpen } from '../../lib/useTabMetaEvents';
import {
  buildClassementBlockLabel,
  DEFAULT_SORT_MODEL,
  estimateCompactGridHeight,
  getSortedRows,
  isDefaultHeureSortModel,
  isProgrammedEncounter,
  resolveRowTourId,
} from './calendrierUtils';
import { useCalendrierDay } from './useCalendrierDay';
import { useEliminatoryWinners } from './useEliminatoryWinners';
import { useCalendrierRowEditing } from './useCalendrierRowEditing';
import { useCalendrierColumns } from './useCalendrierColumns';

export function CalendrierPage({ readOnly = false }: { readOnly?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    date,
    setDate,
    rows,
    setRows,
    loading,
    error,
    setError,
    selectedRowId,
    setSelectedRowId,
    selectedRow,
  } = useCalendrierDay();
  const [sortModel, setSortModel] = useState(DEFAULT_SORT_MODEL);
  const classementCardRef = useRef<TourClassementCardHandle | null>(null);

  const isDefaultHeureSort = isDefaultHeureSortModel(sortModel);
  const orderedRows = useMemo(() => getSortedRows(rows, sortModel), [rows, sortModel]);
  const compactMatchListHeight = useMemo(() => estimateCompactGridHeight(rows.length), [rows.length]);
  const isSelectedProgrammedEncounter = useMemo(() => isProgrammedEncounter(selectedRow), [selectedRow]);
  const activeTourId = useMemo(() => resolveRowTourId(selectedRow), [selectedRow]);
  const classementBlockLabel = useMemo(
    () => buildClassementBlockLabel(selectedRow),
    [selectedRow],
  );
  const displayedActiveTourId = isSelectedProgrammedEncounter ? null : activeTourId;

  const isEliminatoryMatchWinner = useEliminatoryWinners(rows, readOnly);

  const openClub = useCallback((clubId: string, clubName: string) => {
    const normalizedId = clubId.trim();
    if (!normalizedId) return;
    const path = entityPath('club', normalizedId, location.pathname);
    if (readOnly) {
      navigate(path);
      return;
    }
    emitTabOpen(path, clubName.trim() || normalizedId);
  }, [location.pathname, navigate, readOnly]);

  const competitionId = Number(selectedRow?.COCLEUNIK ?? 0);
  const competitionWebUrl = String(selectedRow?.CO_WEB ?? '').trim();
  const canOpenCompetitionWeb = useMemo(() => isHttpUrl(competitionWebUrl), [competitionWebUrl]);

  const openCompetitionTab = () => {
    if (!Number.isInteger(competitionId) || competitionId <= 0) {
      return;
    }
    const path = entityPath('competition', competitionId, location.pathname);
    if (readOnly) {
      navigate(path);
      return;
    }
    emitTabOpen(path, `${String(selectedRow?.COMPET_NOM ?? '').trim()} ${String(selectedRow?.SAISON ?? '').trim()}`.trim() || 'Compétition');
  };

  const openCompetitionWeb = () => {
    if (!canOpenCompetitionWeb) {
      return;
    }
    window.open(competitionWebUrl, '_blank', 'noopener,noreferrer');
  };

  // A saved status/score may change the ranking of the tour currently displayed.
  const refreshClassementIfActive = (row: CalendrierRow): void => {
    if (activeTourId != null && Number(row.TUCLEUNIK) === activeTourId) {
      classementCardRef.current?.refresh();
    }
  };

  const editing = useCalendrierRowEditing({
    orderedRows,
    setRows,
    setError,
    setSelectedRowId,
    onResultSaved: refreshClassementIfActive,
  });

  const columns = useCalendrierColumns({
    readOnly,
    editing,
    isEliminatoryMatchWinner,
    openClub,
  });

  return (
    <Stack spacing={2}>
      <Card>
        <CardContent>
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
          <CalendarDateNavigator date={date} onDateChange={setDate} />
        </Box>

          {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}

            <Box sx={{ mt: 2, height: compactMatchListHeight, minHeight: 150 }}>
            <MatchDataGrid
              rows={rows}
              columns={columns}
              loading={loading}
              rowSaveStatusMap={editing.rowSaveStatus}
              sortModel={sortModel}
              onSortModelChange={(model) => setSortModel(model)}
              getRowId={(row) => row.RECLEUNIK}
              getRowClassName={(params) => {
                const statusClass = rowStatusClass(Number(params.row.ETAT));
                const isSelected = String(params.row.RECLEUNIK) === String(selectedRowId ?? '');
                return isSelected ? `${statusClass} selected-calendar-row` : statusClass;
              }}
              disableRowSelectionOnClick
              onRowClick={(params) => {
                setSelectedRowId(params.row.RECLEUNIK);
              }}
              openMatchOnDoubleClick={!readOnly}
              onRowDoubleClick={readOnly ? (params) => {
                navigate(`/rencontres/${encodeURIComponent(String(params.row.RECLEUNIK))}`);
              } : undefined}
              disableColumnMenu
              density="compact"
              pageSizeOptions={[25, 50, 100]}
              isDefaultHeureSort={isDefaultHeureSort}
              initialScrollRight={readOnly}
            />
          </Box>
        </CardContent>
      </Card>

      {displayedActiveTourId !== null ? (
        <TourClassementCard
          ref={classementCardRef}
          tourId={displayedActiveTourId}
          publicMode={readOnly}
          matchForGroup={selectedRow}
          title={classementBlockLabel || 'Classement du tour'}
          onOpenClub={openClub}
          actions={
            <>
              <Tooltip title="Ouvrir la fiche de la compétition">
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={openCompetitionTab}
                    disabled={competitionId <= 0}
                    aria-label="Ouvrir la fiche de la compétition"
                  >
                    <EmojiEventsRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Ouvrir le site de la compétition">
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={openCompetitionWeb}
                    disabled={!canOpenCompetitionWeb}
                    aria-label="Ouvrir le site de la compétition"
                  >
                    <OpenInNewRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </>
          }
        />
      ) : null}
    </Stack>
  );
}