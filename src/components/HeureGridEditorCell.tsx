import { Stack, TextField } from '@mui/material';
import { useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { formatHeureDigitsForInput, isValidHeureDigits, sanitizeHeureDigits } from './heureUtils';

interface HeureGridEditorCellProps {
  digits: string;
  onDigitsChange: (nextDigits: string) => void;
  onCommit: () => Promise<unknown> | void;
  onCancel: () => void;
  onMoveVertical?: (direction: 'up' | 'down') => Promise<unknown> | void;
  onTabOut?: (direction: 'next' | 'prev') => void;
  width?: number;
}

export function HeureGridEditorCell({
  digits,
  onDigitsChange,
  onCommit,
  onCancel,
  onMoveVertical,
  onTabOut,
  width = 52,
}: HeureGridEditorCellProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const commitIfValid = () => {
    if (!isValidHeureDigits(digits)) {
      window.requestAnimationFrame(focusInput);
      return;
    }
    void onCommit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey
        && /^Digit\d$/.test(event.code) && !/^\d$/.test(event.key)) {
      event.preventDefault();
      document.execCommand('insertText', false, event.code.slice(-1));
      return;
    }

    if (
      event.key === 'ArrowLeft'
      || event.key === 'ArrowRight'
      || event.key === 'Home'
      || event.key === 'End'
    ) {
      event.stopPropagation();
      return;
    }

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
      if (!onMoveVertical) {
        return;
      }
      if (!isValidHeureDigits(digits)) {
        window.requestAnimationFrame(focusInput);
        return;
      }
      void onMoveVertical('up');
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      if (!onMoveVertical) {
        return;
      }
      if (!isValidHeureDigits(digits)) {
        window.requestAnimationFrame(focusInput);
        return;
      }
      void onMoveVertical('down');
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      event.stopPropagation();
      if (!isValidHeureDigits(digits)) {
        window.requestAnimationFrame(focusInput);
        return;
      }
      const direction: 'next' | 'prev' = event.shiftKey ? 'prev' : 'next';
      void Promise.resolve(onCommit()).then(() => {
        onTabOut?.(direction);
      });
    }
  };

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
        value={formatHeureDigitsForInput(digits)}
        onChange={(event) => onDigitsChange(sanitizeHeureDigits(event.target.value))}
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
          width,
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
