import { Stack, TextField, Typography } from '@mui/material';
import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

type DatePart = 'year' | 'month' | 'day';

interface DateGridEditorProps {
  value: string;
  onChange: (nextValue: string) => void;
  onCommit: (nextValue: string) => Promise<void> | void;
  onCancel: () => void;
}

interface DateParts {
  day: string;
  month: string;
  year: string;
}

const PART_ORDER: DatePart[] = ['day', 'month', 'year'];

function splitDisplayDate(value: string): DateParts {
  const text = String(value ?? '').trim();

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return {
      day: iso[3],
      month: iso[2],
      year: iso[1],
    };
  }

  const ymd = text.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (ymd) {
    return {
      day: ymd[3],
      month: ymd[2],
      year: ymd[1],
    };
  }

  const dmy = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) {
    return {
      day: dmy[1],
      month: dmy[2],
      year: dmy[3],
    };
  }

  const digits = text.replace(/\D+/g, '').slice(0, 8);
  return {
    day: digits.slice(0, 2),
    month: digits.slice(2, 4),
    year: digits.slice(4, 8),
  };
}

function composeDisplayDate(parts: DateParts): string {
  if (!parts.day && !parts.month && !parts.year) {
    return '';
  }

  let text = parts.day;
  if (parts.month || parts.year) {
    text += `/${parts.month}`;
  }
  if (parts.year) {
    text += `/${parts.year}`;
  }

  return text;
}

function sanitizePartDigits(value: string, maxLength: number): string {
  return value.replace(/\D+/g, '').slice(0, maxLength);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeDatePartValue(part: DatePart, value: string): string {
  const maxLength = part === 'year' ? 4 : 2;
  const digits = sanitizePartDigits(value, maxLength);

  if (part === 'year') {
    if (digits.length === 2) {
      return `20${digits}`;
    }
    return digits;
  }

  if (!digits) {
    return '';
  }

  const numeric = Number(digits);
  if (!Number.isFinite(numeric)) {
    return '';
  }

  if (part === 'month') {
    return String(clampNumber(numeric, 1, 12)).padStart(2, '0');
  }

  return String(clampNumber(numeric, 1, 31)).padStart(2, '0');
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function nextFieldIndex(currentIndex: number, shift: boolean): number | null {
  if (shift) {
    return currentIndex > 0 ? currentIndex - 1 : null;
  }
  return currentIndex < 2 ? currentIndex + 1 : null;
}

export function DateGridEditor({ value, onChange, onCommit, onCancel }: DateGridEditorProps) {
  const [parts, setParts] = useState<DateParts>(() => splitDisplayDate(value));

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
    const sanitized = sanitizePartDigits(nextValue, maxLength);

    setParts((current) => {
      const next = { ...current, [part]: sanitized };
      onChange(composeDisplayDate(next));
      return next;
    });
  };

  const normalizePart = (part: DatePart): void => {
    setParts((current) => {
      const normalizedValue = normalizeDatePartValue(part, current[part]);
      if (normalizedValue === current[part]) {
        return current;
      }
      const next = { ...current, [part]: normalizedValue };
      onChange(composeDisplayDate(next));
      return next;
    });
  };

  const focusPart = (part: DatePart): void => {
    const index = PART_ORDER.indexOf(part);
    if (index >= 0) {
      focusPartAtIndex(index);
    }
  };

  const commitIfValid = (): void => {
    const normalized: DateParts = {
      year: normalizeDatePartValue('year', parts.year),
      month: normalizeDatePartValue('month', parts.month),
      day: normalizeDatePartValue('day', parts.day),
    };

    if (normalized.day.length !== 2) {
      focusPart('day');
      return;
    }
    if (normalized.month.length !== 2) {
      focusPart('month');
      return;
    }
    if (normalized.year.length !== 4) {
      focusPart('year');
      return;
    }

    const year = Number(normalized.year);
    const month = Number(normalized.month);
    const day = Number(normalized.day);

    if (!isValidCalendarDate(year, month, day)) {
      focusPart('day');
      return;
    }

    const normalizedDisplay = composeDisplayDate(normalized);
    setParts(normalized);
    onChange(normalizedDisplay);
    void onCommit(normalizedDisplay);
  };

  const handlePartKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>): void => {
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
      normalizePart(PART_ORDER[index]);
      if (nextIndex !== null) {
        event.preventDefault();
        focusPartAtIndex(nextIndex);
      }
    }
  };

  return (
    <Stack
      direction="row"
      spacing={0.35}
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
        onKeyDown={handlePartKeyDown(0)}
        autoFocus
        size="small"
        variant="outlined"
        slotProps={{
          htmlInput: {
            inputMode: 'numeric',
            pattern: '[0-9]*',
            maxLength: 2,
            style: { textAlign: 'center', padding: '2px 0', fontSize: '0.70rem' },
          },
        }}
        sx={{
          width: 22,
          '& .MuiOutlinedInput-root': { height: 22, bgcolor: 'grey.200' },
          '& .MuiOutlinedInput-notchedOutline': { border: 0 },
          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { border: 0 },
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 0 },
        }}
        onClick={(event) => event.stopPropagation()}
      />

      <Typography component="span" sx={{ fontSize: '0.68rem', lineHeight: 1, color: 'text.secondary' }}>/</Typography>

      <TextField
        inputRef={monthRef}
        value={parts.month}
        onChange={(event) => updatePart('month', event.target.value)}
        onFocus={(event) => event.target.select()}
        onBlur={() => normalizePart('month')}
        onKeyDown={handlePartKeyDown(1)}
        size="small"
        variant="outlined"
        slotProps={{
          htmlInput: {
            inputMode: 'numeric',
            pattern: '[0-9]*',
            maxLength: 2,
            style: { textAlign: 'center', padding: '2px 0', fontSize: '0.70rem' },
          },
        }}
        sx={{
          width: 22,
          '& .MuiOutlinedInput-root': { height: 22, bgcolor: 'grey.200' },
          '& .MuiOutlinedInput-notchedOutline': { border: 0 },
          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { border: 0 },
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 0 },
        }}
        onClick={(event) => event.stopPropagation()}
      />

      <Typography component="span" sx={{ fontSize: '0.68rem', lineHeight: 1, color: 'text.secondary' }}>/</Typography>

      <TextField
        inputRef={yearRef}
        value={parts.year}
        onChange={(event) => updatePart('year', event.target.value)}
        onFocus={(event) => event.target.select()}
        onBlur={() => normalizePart('year')}
        onKeyDown={handlePartKeyDown(2)}
        size="small"
        variant="outlined"
        slotProps={{
          htmlInput: {
            inputMode: 'numeric',
            pattern: '[0-9]*',
            maxLength: 4,
            style: { textAlign: 'center', padding: '2px 0', fontSize: '0.70rem' },
          },
        }}
        sx={{
          width: 34,
          '& .MuiOutlinedInput-root': { height: 22, bgcolor: 'grey.200' },
          '& .MuiOutlinedInput-notchedOutline': { border: 0 },
          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { border: 0 },
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 0 },
        }}
        onClick={(event) => event.stopPropagation()}
      />
    </Stack>
  );
}
