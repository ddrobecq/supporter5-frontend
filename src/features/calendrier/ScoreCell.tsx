import { Box, Stack, TextField, Typography } from '@mui/material';
import { useRef } from 'react';
import type { KeyboardEvent, ReactNode, RefObject } from 'react';
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
  onCancel: () => void;
  onMoveVertical: (direction: 'up' | 'down') => Promise<void> | void;
}

type ScoreField = keyof ScoreDraft;

const SCORE_FIELDS: ScoreField[] = ['tabDom', 'butDom', 'butExt', 'tabExt'];

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

function isDigitsOnly(value: string): boolean {
  return /^\d+$/.test(value);
}

function isDraftValid(draft: ScoreDraft): boolean {
  return SCORE_FIELDS.every((field) => isDigitsOnly(draft[field]));
}

function sanitizeDigits(value: string): string {
  return value.replace(/\D+/g, '');
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

export function ScoreCell({ row, isEditing, draft, onStartEdit, onDraftChange, onCommit, onCancel, onMoveVertical }: ScoreCellProps) {
  const tabDomRef = useRef<HTMLInputElement | null>(null);
  const butDomRef = useRef<HTMLInputElement | null>(null);
  const butExtRef = useRef<HTMLInputElement | null>(null);
  const tabExtRef = useRef<HTMLInputElement | null>(null);

  const focusField = (field: ScoreField): void => {
    const refMap: Record<ScoreField, RefObject<HTMLInputElement | null>> = {
      tabDom: tabDomRef,
      butDom: butDomRef,
      butExt: butExtRef,
      tabExt: tabExtRef,
    };

    refMap[field].current?.focus();
  };

  const focusFirstInvalidField = (): void => {
    const invalidField = SCORE_FIELDS.find((field) => !isDigitsOnly(draft[field]));
    if (invalidField) {
      focusField(invalidField);
    }
  };

  const handleBlurOutside = (): void => {
    if (!isDraftValid(draft)) {
      window.requestAnimationFrame(focusFirstInvalidField);
      return;
    }

    void onCommit();
  };

  const handleInputChange = (field: ScoreField, value: string): void => {
    onDraftChange({ [field]: sanitizeDigits(value) });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      if (!isDraftValid(draft)) {
        focusFirstInvalidField();
        return;
      }
      void onCommit();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      if (!isDraftValid(draft)) {
        focusFirstInvalidField();
        return;
      }
      void onMoveVertical('up');
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      if (!isDraftValid(draft)) {
        focusFirstInvalidField();
        return;
      }
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
            handleBlurOutside();
          }
        }}
      >
        <TextField
          inputRef={tabDomRef}
          value={draft.tabDom}
          onChange={(event) => handleInputChange('tabDom', event.target.value)}
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
          inputRef={butDomRef}
          value={draft.butDom}
          onChange={(event) => handleInputChange('butDom', event.target.value)}
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
          inputRef={butExtRef}
          value={draft.butExt}
          onChange={(event) => handleInputChange('butExt', event.target.value)}
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
          inputRef={tabExtRef}
          value={draft.tabExt}
          onChange={(event) => handleInputChange('tabExt', event.target.value)}
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
