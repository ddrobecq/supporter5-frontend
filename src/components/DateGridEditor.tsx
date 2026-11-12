import { Stack, TextField, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  INVALID_DATE_MESSAGE,
  PART_ORDER,
  findInvalidDatePart,
  nextFieldIndex,
  normalizeDateParts,
  normalizeDatePartValue,
  sanitizePartDigits,
  serializeDateParts,
  splitDisplayDate,
} from './dateUtils';
import type { DatePart, DateParts } from './dateUtils';

interface DateGridEditorProps {
  /** Initial value, in any format accepted by `toIsoDate`. */
  value: string;
  /** Draft value while typing: ISO `YYYY-MM-DD` whenever the parts form a valid date, '' when all parts are empty. */
  onChange: (nextValue: string) => void;
  /** Validated value (Enter or blur): ISO `YYYY-MM-DD`, or '' when the user cleared the date. */
  onCommit: (nextValue: string) => Promise<unknown> | void;
  onCancel: () => void;
  onTabOut?: (direction: 'next' | 'prev') => void;
}

function partSx(width: number, invalid: boolean): SxProps<Theme> {
  const outline = invalid ? { border: 1, borderColor: 'error.main' } : { border: 0 };
  return {
    width,
    '& .MuiOutlinedInput-root': { height: 22, bgcolor: 'action.hover' },
    '& .MuiOutlinedInput-notchedOutline': outline,
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': outline,
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': outline,
  };
}

export function DateGridEditor({ value, onChange, onCommit, onCancel, onTabOut }: DateGridEditorProps) {
  const [parts, setParts] = useState<DateParts>(() => splitDisplayDate(value));
  const [invalid, setInvalid] = useState(false);

  const yearRef = useRef<HTMLInputElement | null>(null);
  const monthRef = useRef<HTMLInputElement | null>(null);
  const dayRef = useRef<HTMLInputElement | null>(null);

  const focusPartAtIndex = (index: number): void => {
    const refs = [dayRef, monthRef, yearRef];
    const input = refs[index]?.current;
    if (!input) return;
    input.focus();
    input.select();
  };

  const updatePart = (part: DatePart, nextValue: string): void => {
    const maxLength = part === 'year' ? 4 : 2;
    const next = { ...parts, [part]: sanitizePartDigits(nextValue, maxLength) };
    setParts(next);

    const draft = serializeDateParts(normalizeDateParts(next));
    if (draft !== null) {
      setInvalid(false);
      onChange(draft);
    }
  };

  const normalizePart = (part: DatePart): void => {
    const normalizedValue = normalizeDatePartValue(part, parts[part]);
    if (normalizedValue !== parts[part]) {
      setParts({ ...parts, [part]: normalizedValue });
    }
  };

  const focusPart = (part: DatePart): void => {
    const index = PART_ORDER.indexOf(part);
    if (index >= 0) {
      focusPartAtIndex(index);
    }
  };

  /** Normalizes the parts and returns the ISO value ('' when empty), or null after flagging the error. */
  const validate = (): string | null => {
    const normalized = normalizeDateParts(parts);
    const iso = serializeDateParts(normalized);
    if (iso === null) {
      setInvalid(true);
      focusPart(findInvalidDatePart(normalized) ?? 'day');
      return null;
    }
    setParts(normalized);
    setInvalid(false);
    return iso;
  };

  const commitIfValid = (): void => {
    const iso = validate();
    if (iso === null) return;
    onChange(iso);
    void onCommit(iso);
  };

  const handlePartKeyDown = (index: number, event: KeyboardEvent<HTMLDivElement>): void => {
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

    if (event.key === '/') {
      event.preventDefault();
      event.stopPropagation();
      normalizePart(PART_ORDER[index]);
      const nextIndex = nextFieldIndex(index, false);
      if (nextIndex !== null) {
        focusPartAtIndex(nextIndex);
      }
      return;
    }

    if (event.key === 'Tab') {
      const nextIndex = nextFieldIndex(index, event.shiftKey);
      event.stopPropagation();
      if (nextIndex !== null) {
        normalizePart(PART_ORDER[index]);
        event.preventDefault();
        focusPartAtIndex(nextIndex);
        return;
      }

      // Leaving the editor: an incomplete or invalid date keeps the focus in the editor
      // and is flagged, instead of being handed over to the caller.
      const iso = validate();
      if (iso === null) {
        event.preventDefault();
        return;
      }
      onChange(iso);

      if (onTabOut) {
        event.preventDefault();
        onTabOut(event.shiftKey ? 'prev' : 'next');
      }
    }
  };

  return (
    <Stack
      direction="row"
      spacing={0.35}
      title={invalid ? INVALID_DATE_MESSAGE : undefined}
      sx={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
      onBlur={(event) => {
        const nextFocused = event.relatedTarget as Node | null;
        if (!event.currentTarget.contains(nextFocused)) {
          commitIfValid();
        }
      }}
    >
      <TextField
        inputRef={dayRef}
        value={parts.day}
        onChange={(event) => updatePart('day', event.target.value)}
        onFocus={(event) => event.target.select()}
        onBlur={() => normalizePart('day')}
        onKeyDown={(event) => handlePartKeyDown(0, event)}
        autoFocus
        size="small"
        variant="outlined"
        error={invalid}
        slotProps={{
          htmlInput: {
            inputMode: 'numeric',
            pattern: '[0-9]*',
            maxLength: 2,
            'aria-label': 'Jour',
            style: { textAlign: 'center', padding: '2px 0', fontSize: '0.70rem' },
          },
        }}
        sx={partSx(22, invalid)}
        onClick={(event) => event.stopPropagation()}
      />

      <Typography component="span" sx={{ fontSize: '0.68rem', lineHeight: 1, color: 'text.secondary' }}>/</Typography>

      <TextField
        inputRef={monthRef}
        value={parts.month}
        onChange={(event) => updatePart('month', event.target.value)}
        onFocus={(event) => event.target.select()}
        onBlur={() => normalizePart('month')}
        onKeyDown={(event) => handlePartKeyDown(1, event)}
        size="small"
        variant="outlined"
        error={invalid}
        slotProps={{
          htmlInput: {
            inputMode: 'numeric',
            pattern: '[0-9]*',
            maxLength: 2,
            'aria-label': 'Mois',
            style: { textAlign: 'center', padding: '2px 0', fontSize: '0.70rem' },
          },
        }}
        sx={partSx(22, invalid)}
        onClick={(event) => event.stopPropagation()}
      />

      <Typography component="span" sx={{ fontSize: '0.68rem', lineHeight: 1, color: 'text.secondary' }}>/</Typography>

      <TextField
        inputRef={yearRef}
        value={parts.year}
        onChange={(event) => updatePart('year', event.target.value)}
        onFocus={(event) => event.target.select()}
        onBlur={() => normalizePart('year')}
        onKeyDown={(event) => handlePartKeyDown(2, event)}
        size="small"
        variant="outlined"
        error={invalid}
        slotProps={{
          htmlInput: {
            inputMode: 'numeric',
            pattern: '[0-9]*',
            maxLength: 4,
            'aria-label': 'Année',
            style: { textAlign: 'center', padding: '2px 0', fontSize: '0.70rem' },
          },
        }}
        sx={partSx(34, invalid)}
        onClick={(event) => event.stopPropagation()}
      />
    </Stack>
  );
}
