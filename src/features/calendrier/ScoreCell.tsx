import { Box, Stack, TextField, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import type { CalendrierRow } from './types';

export interface ScoreDraft {
  tabDom: string;
  butDom: string;
  butExt: string;
  tabExt: string;
}

interface ScoreCellProps {
  row: CalendrierRow;
  isEditing: boolean;
  draft: ScoreDraft;
  onStartEdit: () => void;
  onDraftChange: (patch: Partial<ScoreDraft>) => void;
  onCommit: () => Promise<void> | void;
  onMoveVertical: (direction: 'up' | 'down') => Promise<void> | void;
}

function isWaitingOrProgrammed(etat: number): boolean {
  return etat === 1 || etat === 5;
}

function isNoGame(etat: number): boolean {
  return etat === 4;
}

function isInProgressOrDone(etat: number): boolean {
  return etat === 2 || etat === 3;
}

function normalizeScoreValue(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function renderScoreDisplay(row: CalendrierRow): ReactNode {
  const etat = Number(row.ETAT ?? 0);

  if (isWaitingOrProgrammed(etat)) {
    return '-vs-';
  }

  if (isNoGame(etat) || !isInProgressOrDone(etat)) {
    return '';
  }

  const tabDom = Number(row.TABDOM ?? 0);
  const tabExt = Number(row.TABEXT ?? 0);
  const butDom = normalizeScoreValue(row.BUTDOM);
  const butExt = normalizeScoreValue(row.BUTEXT);
  const hasPenalties = tabDom > 0 || tabExt > 0;

  if (!hasPenalties) {
    return `${butDom}-${butExt}`;
  }

  return (
    <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center', justifyContent: 'center' }}>
      <Typography component="span" sx={{ fontSize: '0.72rem', lineHeight: 1 }}>
        {tabDom}
      </Typography>
      <Typography component="span" sx={{ fontSize: '0.82rem', lineHeight: 1 }}>
        {`${butDom}-${butExt}`}
      </Typography>
      <Typography component="span" sx={{ fontSize: '0.72rem', lineHeight: 1 }}>
        {tabExt}
      </Typography>
    </Stack>
  );
}

export function ScoreCell({ row, isEditing, draft, onStartEdit, onDraftChange, onCommit, onMoveVertical }: ScoreCellProps) {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      void onMoveVertical('up');
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      void onMoveVertical('down');
    }
  };

  if (isEditing) {
    const editInputSx = {
      width: 18,
      '& .MuiOutlinedInput-root': {
        height: 22,
        bgcolor: 'grey.200',
      },
      '& .MuiOutlinedInput-notchedOutline': {
        border: 0,
      },
      '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
        border: 0,
      },
      '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
        border: 0,
      },
    } as const;

    return (
      <Stack
        direction="row"
        spacing={0.35}
        sx={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
        onBlur={(event) => {
          const nextFocused = event.relatedTarget as Node | null;
          if (!event.currentTarget.contains(nextFocused)) {
            void onCommit();
          }
        }}
      >
        <TextField
          value={draft.tabDom}
          onChange={(event) => onDraftChange({ tabDom: event.target.value })}
          onFocus={(event) => event.target.select()}
          size="small"
          variant="outlined"
          slotProps={{
            htmlInput: {
              inputMode: 'numeric',
              pattern: '[0-9]*',
              style: { textAlign: 'center', padding: '2px 0', fontSize: '0.66rem' },
            },
          }}
          sx={editInputSx}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleKeyDown}
        />
        <TextField
          value={draft.butDom}
          onChange={(event) => onDraftChange({ butDom: event.target.value })}
          onFocus={(event) => event.target.select()}
          size="small"
          autoFocus
          variant="outlined"
          slotProps={{
            htmlInput: {
              inputMode: 'numeric',
              pattern: '[0-9]*',
              style: { textAlign: 'center', padding: '2px 0', fontSize: '0.72rem' },
            },
          }}
          sx={editInputSx}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleKeyDown}
        />
        <Typography component="span" sx={{ fontSize: '0.68rem', lineHeight: 1, color: 'text.secondary' }}>-</Typography>
        <TextField
          value={draft.butExt}
          onChange={(event) => onDraftChange({ butExt: event.target.value })}
          onFocus={(event) => event.target.select()}
          size="small"
          variant="outlined"
          slotProps={{
            htmlInput: {
              inputMode: 'numeric',
              pattern: '[0-9]*',
              style: { textAlign: 'center', padding: '2px 0', fontSize: '0.72rem' },
            },
          }}
          sx={editInputSx}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleKeyDown}
        />
        <TextField
          value={draft.tabExt}
          onChange={(event) => onDraftChange({ tabExt: event.target.value })}
          onFocus={(event) => event.target.select()}
          size="small"
          variant="outlined"
          slotProps={{
            htmlInput: {
              inputMode: 'numeric',
              pattern: '[0-9]*',
              style: { textAlign: 'center', padding: '2px 0', fontSize: '0.66rem' },
            },
          }}
          sx={editInputSx}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleKeyDown}
        />
      </Stack>
    );
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        fontVariantNumeric: 'tabular-nums',
        cursor: 'text',
      }}
      onClick={(event) => {
        event.stopPropagation();
        onStartEdit();
      }}
    >
      {renderScoreDisplay(row)}
    </Box>
  );
}
