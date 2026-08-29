import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import { IconButton, Stack, TextField, Typography } from '@mui/material';
import type { SxProps, TextFieldProps, Theme } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  PART_ORDER,
  composeDisplayDate,
  isValidCalendarDate,
  nextFieldIndex,
  normalizeDatePartValue,
  sanitizePartDigits,
  splitDisplayDate,
} from './DateGridEditor';
import type { DatePart, DateParts } from './DateGridEditor';

// Maps unshifted AZERTY number-row chars to their digit equivalents
const AZERTY_DIGIT: Record<string, string> = {
  '&': '1', 'é': '2', '"': '3', "'": '4', '(': '5',
  '-': '6', 'è': '7', '_': '8', 'ç': '9', 'à': '0',
};

export function normalizeDisplayDateInput(input: string): string {
  const mapped = Array.from(input).map((ch) => AZERTY_DIGIT[ch] ?? ch).join('');
  const digits = mapped.replace(/\D+/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}/${digits.slice(4)}`;
  return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`;
}

export function toInputDateFromDisplay(value: string): string {
  const text = String(value ?? '').trim();

  const ymd = text.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  }

  // Backward compatibility: accept legacy DD/MM/YYYY values.
  const dmy = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  }

  return '';
}

export function fromInputDateToDisplay(value: string): string {
  const dashed = String(value ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dashed) return '';
  return `${dashed[1]}/${dashed[2]}/${dashed[3]}`;
}

function isoFromAny(value: unknown): string {
  const text = String(value ?? '').trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const ymd = text.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const french = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (french) return `${french[3]}-${french[2]}-${french[1]}`;
  return '';
}

function todayOffset(delta: number): string {
  const d = new Date();
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDateShort(value: unknown): string {
  const iso = isoFromAny(value);
  if (!iso) return String(value ?? '').trim();
  if (iso === todayOffset(0)) return 'Auj.';
  if (iso === todayOffset(-1)) return 'Hier';
  if (iso === todayOffset(1)) return 'Demain';
  const date = new Date(`${iso}T00:00:00`);
  if (isNaN(date.getTime())) return iso;
  const dd = String(date.getDate()).padStart(2, '0');
  const mmm = date.toLocaleString('fr-FR', { month: 'short' }).replace('.', '');
  const yyyy = date.getFullYear();
  if (yyyy === new Date().getFullYear()) return `${dd}-${mmm}`;
  return `${dd}-${mmm}-${yyyy}`;
}

interface DateInputFieldProps {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  autoFocus?: boolean;
  size?: TextFieldProps['size'];
  fullWidth?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: TextFieldProps['helperText'];
  calendarAriaLabel?: string;
  placeholder?: string;
  maxLength?: number;
  sx?: SxProps<Theme>;
}

export function DateInputField({
  label,
  value,
  onChange,
  autoFocus = false,
  size = 'small',
  fullWidth = false,
  disabled = false,
  required = false,
  error = false,
  helperText,
  calendarAriaLabel = `Calendrier ${label}`,
  placeholder = 'AAAA/MM/JJ',
  maxLength = 10,
  sx,
}: DateInputFieldProps) {
  const pickerRef = useRef<HTMLInputElement | null>(null);
  const dayRef = useRef<HTMLInputElement | null>(null);
  const monthRef = useRef<HTMLInputElement | null>(null);
  const yearRef = useRef<HTMLInputElement | null>(null);
  const [focused, setFocused] = useState(false);
  const [parts, setParts] = useState<DateParts>(() => splitDisplayDate(value));

  useEffect(() => {
    setParts(splitDisplayDate(value));
  }, [value]);

  useEffect(() => {
    if (!focused) return;

    const frame = window.requestAnimationFrame(() => {
      if (!dayRef.current) return;
      dayRef.current.focus();
      dayRef.current.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focused]);

  const focusPartAtIndex = (index: number): void => {
    const refs = [dayRef, monthRef, yearRef];
    const input = refs[index]?.current;
    if (!input) return;
    input.focus();
    input.select();
  };

  const updatePart = (part: DatePart, nextValue: string): void => {
    const maxLengthPart = part === 'year' ? 4 : 2;
    const sanitized = sanitizePartDigits(nextValue, maxLengthPart);

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
      setFocused(false);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      commitIfValid();
      setFocused(false);
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
        return;
      }

      setFocused(false);
    }
  };

  const displayValue = focused
    ? value
    : (value ? (formatDateShort(toInputDateFromDisplay(value)) || value) : '');

  return (
    <>
      {focused ? (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', ...sx }} onBlur={(event) => {
          const nextFocused = event.relatedTarget as Node | null;
          if (!event.currentTarget.contains(nextFocused)) {
            commitIfValid();
            setFocused(false);
          }
        }}>
          <TextField
            inputRef={dayRef}
            value={parts.day}
            onChange={(event) => updatePart('day', event.target.value)}
            onFocus={(event) => event.target.select()}
            onBlur={() => normalizePart('day')}
            onKeyDown={handlePartKeyDown(0)}
            autoFocus={autoFocus}
            size={size}
            disabled={disabled}
            error={error}
            slotProps={{
              htmlInput: {
                inputMode: 'numeric',
                pattern: '[0-9]*',
                maxLength: 2,
                style: { textAlign: 'center', padding: '2px 6px', fontSize: '0.875rem' },
              },
            }}
            sx={{ width: 64 }}
          />
          <Typography component="span" sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>/</Typography>
          <TextField
            inputRef={monthRef}
            value={parts.month}
            onChange={(event) => updatePart('month', event.target.value)}
            onFocus={(event) => event.target.select()}
            onBlur={() => normalizePart('month')}
            onKeyDown={handlePartKeyDown(1)}
            size={size}
            disabled={disabled}
            error={error}
            slotProps={{
              htmlInput: {
                inputMode: 'numeric',
                pattern: '[0-9]*',
                maxLength: 2,
                style: { textAlign: 'center', padding: '2px 6px', fontSize: '0.875rem' },
              },
            }}
            sx={{ width: 64 }}
          />
          <Typography component="span" sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>/</Typography>
          <TextField
            inputRef={yearRef}
            value={parts.year}
            onChange={(event) => updatePart('year', event.target.value)}
            onFocus={(event) => event.target.select()}
            onBlur={() => normalizePart('year')}
            onKeyDown={handlePartKeyDown(2)}
            size={size}
            disabled={disabled}
            error={error}
            slotProps={{
              htmlInput: {
                inputMode: 'numeric',
                pattern: '[0-9]*',
                maxLength: 4,
                style: { textAlign: 'center', padding: '2px 6px', fontSize: '0.875rem' },
              },
            }}
            sx={{ width: 78 }}
          />
        </Stack>
      ) : (
        <TextField
          label={label}
          value={displayValue}
          autoFocus={autoFocus}
          onChange={(event) => {
            if (focused) onChange(normalizeDisplayDateInput(event.target.value));
          }}
          onFocus={(event) => {
            setFocused(true);
            const input = event.currentTarget;
            window.requestAnimationFrame(() => {
              input.select();
            });
          }}
          onBlur={() => setFocused(false)}
          size={size}
          fullWidth={fullWidth}
          disabled={disabled}
          required={required}
          error={error}
          helperText={helperText}
          sx={sx}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: {
              maxLength: focused ? maxLength : undefined,
              placeholder: focused ? placeholder : undefined,
            },
            input: {
              endAdornment: (
                <IconButton
                  aria-label={calendarAriaLabel}
                  size="small"
                  onClick={() => {
                    pickerRef.current?.showPicker?.();
                  }}
                  edge="end"
                  disabled={disabled}
                >
                  <CalendarMonthRoundedIcon fontSize="small" />
                </IconButton>
              ),
            },
          }}
        />
      )}

      <input
        ref={pickerRef}
        type="date"
        value={toInputDateFromDisplay(value)}
        onChange={(event) => {
          const next = fromInputDateToDisplay(event.target.value);
          if (!next) return;
          onChange(next);
        }}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  );
}

