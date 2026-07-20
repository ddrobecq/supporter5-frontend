import { Box, Stack, TextField } from '@mui/material';
import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

export interface HeureCellProps {
  value: unknown;
  isEditing: boolean;
  draftDigits: string;
  onStartEdit: () => void;
  onDraftChange: (nextDigits: string) => void;
  onCommit: () => Promise<void> | void;
  onCancel: () => void;
  onMoveVertical: (direction: 'up' | 'down') => Promise<void> | void;
}

export function normalizeHeureDigits(value: unknown): string {
  if (value === null || value === undefined) return '';
  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === 'null' || raw.toLowerCase() === 'undefined') return '';

  if (/^\d{2}:\d{2}$/.test(raw)) {
    return raw.replace(':', '');
  }
  if (/^\d{2}h\d{2}$/i.test(raw)) {
    return raw.replace(/h/i, '');
  }

  return raw.replace(/\D+/g, '').slice(0, 4);
}

export function sanitizeHeureDigits(value: string): string {
  return value.replace(/\D+/g, '').slice(0, 4);
}

export function isCompleteHeureDigits(value: string): boolean {
  return /^\d{4}$/.test(value);
}

export function isValidHeureDigits(value: string): boolean {
  return /^\d{2}(\d{2})?$/.test(value);
}

export function formatHeureDigitsForInput(value: string): string {
  const digits = sanitizeHeureDigits(value);
  if (digits.length < 2) {
    return digits;
  }
  if (digits.length === 2) {
    return `${digits}h`;
  }
  return `${digits.slice(0, 2)}h${digits.slice(2)}`;
}

export function formatHeureDisplay(value: unknown): string {
  const digits = normalizeHeureDigits(value);
  if (!digits) return '';
  if (digits.length === 4) {
    return `${digits.slice(0, 2)}h${digits.slice(2)}`;
  }
  return formatHeureDigitsForInput(digits);
}

export function heureDigitsToApiValue(value: string): string {
  const digits = sanitizeHeureDigits(value);
  if (digits.length === 2) {
    return `${digits}:00`;
  }
  if (!isCompleteHeureDigits(digits)) return '';
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function HeureCell({ value, isEditing, draftDigits, onStartEdit, onDraftChange, onCommit, onCancel, onMoveVertical }: HeureCellProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const focusInput = (): void => {
    inputRef.current?.focus();
  };

  const commitIfValid = (): void => {
    if (!isValidHeureDigits(draftDigits)) {
      window.requestAnimationFrame(focusInput);
      return;
    }
    void onCommit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onCancel();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      commitIfValid();
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      if (!isValidHeureDigits(draftDigits)) {
        window.requestAnimationFrame(focusInput);
        return;
      }
      void onMoveVertical('up');
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      if (!isValidHeureDigits(draftDigits)) {
        window.requestAnimationFrame(focusInput);
        return;
      }
      void onMoveVertical('down');
    }
  };

  if (isEditing) {
    return (
      <Stack
        direction="row"
        spacing={0}
        sx={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
        onBlur={(event) => {
          const nextFocused = event.relatedTarget as Node | null;
          if (!event.currentTarget.contains(nextFocused)) {
            commitIfValid();
          }
        }}
      >
        <TextField
          inputRef={inputRef}
          value={formatHeureDigitsForInput(draftDigits)}
          onChange={(event) => onDraftChange(sanitizeHeureDigits(event.target.value))}
          onFocus={(event) => event.target.select()}
          autoFocus
          size="small"
          variant="outlined"
          slotProps={{
            htmlInput: {
              inputMode: 'numeric',
              pattern: '[0-9]*',
              maxLength: 5,
              style: { textAlign: 'center', padding: '2px 0', fontSize: '0.72rem' },
            },
          }}
          sx={{
            width: 52,
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
          }}
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
      {formatHeureDisplay(value)}
    </Box>
  );
}
