import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import { IconButton, Stack, TextField, Typography } from '@mui/material';
import type { SxProps, TextFieldProps, Theme } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  INVALID_DATE_MESSAGE,
  PART_ORDER,
  findInvalidDatePart,
  formatDateShort,
  nextFieldIndex,
  normalizeDateParts,
  normalizeDatePartValue,
  sanitizePartDigits,
  serializeDateParts,
  splitDisplayDate,
  toIsoDate,
} from './dateUtils';
import type { DatePart, DateParts } from './dateUtils';

interface DateInputFieldProps {
  label: string;
  /** Current value, in any format accepted by `toIsoDate` (ISO, YYYYMMDD, YYYY/MM/DD, DD/MM/YYYY). */
  value: string;
  /**
   * Called only with a validated value: ISO `YYYY-MM-DD`, or '' when the user cleared the field.
   * Fired on Enter, when focus leaves the field and on native picker selection; never while typing.
   * An incomplete or invalid entry leaves the value untouched and is flagged inside the field.
   */
  onChange: (nextValue: string) => void;
  /**
   * Called when the validity of the entry changes, i.e. when the "Date invalide" error appears
   * (an incomplete or invalid entry is left: blur, Tab, Enter) or disappears (the entry becomes a
   * valid or empty date, or the value is changed from outside). Not called on mount, where the
   * entry is assumed valid. Called with `true` on unmount if the entry was invalid, since the
   * discarded entry no longer blocks anything: the value itself was never changed.
   */
  onValidityChange?: (valid: boolean) => void;
  autoFocus?: boolean;
  size?: TextFieldProps['size'];
  fullWidth?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: TextFieldProps['helperText'];
  calendarAriaLabel?: string;
  placeholder?: string;
  sx?: SxProps<Theme>;
}

export function DateInputField({
  label,
  value,
  onChange,
  onValidityChange,
  autoFocus = false,
  size = 'small',
  fullWidth = false,
  disabled = false,
  required = false,
  error = false,
  helperText,
  calendarAriaLabel = `Calendrier ${label}`,
  placeholder = 'JJ/MM/AAAA',
  sx,
}: DateInputFieldProps) {
  const pickerRef = useRef<HTMLInputElement | null>(null);
  const dayRef = useRef<HTMLInputElement | null>(null);
  const monthRef = useRef<HTMLInputElement | null>(null);
  const yearRef = useRef<HTMLInputElement | null>(null);
  // autoFocus must only take effect on initial mount: since the field switches between
  // two different render trees (split day/month/year vs. collapsed) whenever `focused`
  // toggles, passing `autoFocus` straight to the underlying inputs would re-trigger native
  // autofocus on every remount, trapping focus in the field after each blur. It only seeds
  // the initial state; the effect on `focused` below then focuses the day part.
  const [focused, setFocused] = useState(autoFocus);
  const [parts, setParts] = useState<DateParts>(() => splitDisplayDate(value));
  const [invalid, setInvalid] = useState(false);
  const [syncedValue, setSyncedValue] = useState(value);

  // Resync the edited parts whenever the value changes from outside (or after our own emission).
  if (value !== syncedValue) {
    setSyncedValue(value);
    setParts(splitDisplayDate(value));
    setInvalid(false);
  }

  // Report validity changes to the parent once per transition. The latest callback is kept in a
  // ref so that an inline callback does not re-trigger the report.
  const onValidityChangeRef = useRef(onValidityChange);
  const reportedValidRef = useRef(true);
  useEffect(() => {
    onValidityChangeRef.current = onValidityChange;
  });
  useEffect(() => {
    const valid = !invalid;
    if (valid !== reportedValidRef.current) {
      reportedValidRef.current = valid;
      onValidityChangeRef.current?.(valid);
    }
  }, [invalid]);
  useEffect(() => () => {
    if (!reportedValidRef.current) {
      reportedValidRef.current = true;
      onValidityChangeRef.current?.(true);
    }
  }, []);

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
    const next = { ...parts, [part]: sanitizePartDigits(nextValue, maxLengthPart) };
    setParts(next);
    if (invalid && serializeDateParts(normalizeDateParts(next)) !== null) {
      setInvalid(false);
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

  const emitIfChanged = (iso: string): void => {
    if (iso !== value) {
      onChange(iso);
    }
  };

  /**
   * Validates the current entry. A valid (or cleared) entry is emitted as ISO and null is
   * returned; otherwise the error is flagged, the value is left untouched and the first
   * invalid part is returned.
   */
  const commit = (): DatePart | null => {
    const normalized = normalizeDateParts(parts);
    const iso = serializeDateParts(normalized);
    if (iso === null) {
      setInvalid(true);
      return findInvalidDatePart(normalized) ?? 'day';
    }
    setParts(normalized);
    setInvalid(false);
    emitIfChanged(iso);
    return null;
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
      setFocused(false);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const invalidPart = commit();
      if (invalidPart) {
        focusPart(invalidPart);
        return;
      }
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
      }

      // Leaving the whole field (Tab past year, or Shift+Tab before day): don't touch
      // the DOM here. Mutating it now (e.g. via setFocused(false), which unmounts the
      // day/month/year inputs) would race with the browser's own native Tab focus
      // resolution, which still needs the current inputs in place to find the
      // next/previous focusable element. The natural blur that follows once focus has
      // actually moved away is what validates and closes the field (see the Stack's onBlur below).
    }
  };

  const displayValue = value ? formatDateShort(value) : '';
  const fieldError = error || invalid;
  const fieldHelperText = invalid
    ? (helperText ? <>{INVALID_DATE_MESSAGE} – {helperText}</> : INVALID_DATE_MESSAGE)
    : helperText;

  return (
    <>
      {focused ? (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', ...sx }} onBlur={(event) => {
          const nextFocused = event.relatedTarget as Node | null;
          if (!event.currentTarget.contains(nextFocused)) {
            commit();
            setFocused(false);
          }
        }}>
          <TextField
            inputRef={dayRef}
            value={parts.day}
            onChange={(event) => updatePart('day', event.target.value)}
            onFocus={(event) => event.target.select()}
            onBlur={() => normalizePart('day')}
            onKeyDown={(event) => handlePartKeyDown(0, event)}
            size={size}
            disabled={disabled}
            error={fieldError}
            slotProps={{
              htmlInput: {
                inputMode: 'numeric',
                pattern: '[0-9]*',
                maxLength: 2,
                'aria-label': `${label} - jour`,
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
            onKeyDown={(event) => handlePartKeyDown(1, event)}
            size={size}
            disabled={disabled}
            error={fieldError}
            slotProps={{
              htmlInput: {
                inputMode: 'numeric',
                pattern: '[0-9]*',
                maxLength: 2,
                'aria-label': `${label} - mois`,
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
            onKeyDown={(event) => handlePartKeyDown(2, event)}
            size={size}
            disabled={disabled}
            error={fieldError}
            slotProps={{
              htmlInput: {
                inputMode: 'numeric',
                pattern: '[0-9]*',
                maxLength: 4,
                'aria-label': `${label} - année`,
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
          onFocus={(event) => {
            // Keep an invalid entry for correction; otherwise start from the current value.
            if (!invalid) {
              setParts(splitDisplayDate(value));
            }
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
          error={fieldError}
          helperText={fieldHelperText}
          sx={sx}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: {
              readOnly: true,
              placeholder,
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
        value={toIsoDate(value)}
        onChange={(event) => {
          const iso = toIsoDate(event.target.value);
          if (!iso) return;
          setParts(splitDisplayDate(iso));
          setInvalid(false);
          emitIfChanged(iso);
        }}
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  );
}
