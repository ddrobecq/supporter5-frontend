/**
 * Canonical component for all time input fields in the app.
 * ALL hour/time fields MUST use this component to centralize future changes
 * (timezone support, display format, validation, etc.).
 *
 * Internal format: "HH:MM" (e.g. "14:30")
 * Display format:  "HHhMM" (e.g. "14h30")
 *
 * Props reserved for future use:
 *   - timezone: IANA timezone id (e.g. "Europe/Paris") -- not yet implemented
 */

import { TextField } from '@mui/material';
import type { SxProps, TextFieldProps, Theme } from '@mui/material';
import { useEffect, useState } from 'react';

/** Converts stored "HH:MM" to display "HHhMM". */
function storageToDisplay(value: string): string {
  const digits = String(value ?? '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}h${digits.slice(2)}`;
}

/** Converts 4 raw digits to clamped "HH:MM", or '' if incomplete. */
function digitsToStorage(digits: string): string {
  if (digits.length < 4) return '';
  const hh = Math.min(23, parseInt(digits.slice(0, 2), 10));
  const mm = Math.min(59, parseInt(digits.slice(2, 4), 10));
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export interface TimeInputFieldProps {
  label: string;
  /** Current value in "HH:MM" format, or empty string. */
  value: string;
  /** Called with "HH:MM" when a complete valid time is entered, or '' when cleared. */
  onChange: (nextValue: string) => void;
  /** IANA timezone id (e.g. "Europe/Paris") -- reserved for future use. */
  timezone?: string;
  size?: TextFieldProps['size'];
  fullWidth?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: TextFieldProps['helperText'];
  sx?: SxProps<Theme>;
}

export function TimeInputField({
  label,
  value,
  onChange,
  timezone: _timezone,
  size = 'small',
  fullWidth = false,
  disabled = false,
  required = false,
  error = false,
  helperText,
  sx,
}: TimeInputFieldProps) {
  const [display, setDisplay] = useState(() => storageToDisplay(value));

  // Sync when value changes externally (e.g. reset/reload)
  useEffect(() => {
    setDisplay(storageToDisplay(value));
  }, [value]);

  // On AZERTY, unshifted Digit keys produce non-digit chars (e.g. "&" for "1").
  // Remap them to their digit via execCommand so onChange handles the rest normally.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey
        && /^Digit\d$/.test(e.code) && !/^\d$/.test(e.key)) {
      e.preventDefault();
      document.execCommand('insertText', false, e.code.slice(-1));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 4);

    if (digits.length === 4) {
      // Clamp and immediately show the corrected value (e.g. "2599" → "23h59")
      const storage = digitsToStorage(digits);
      const clamped = storage.replace(/\D/g, '');
      setDisplay(`${clamped.slice(0, 2)}h${clamped.slice(2)}`);
      onChange(storage);
    } else {
      setDisplay(digits.length <= 2 ? digits : `${digits.slice(0, 2)}h${digits.slice(2)}`);
      if (digits.length === 0) onChange('');
    }
  };

  return (
    <TextField
      label={label}
      value={display}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
      error={error}
      helperText={helperText}
      placeholder="HHhMM"
      slotProps={{ htmlInput: { inputMode: 'numeric' } }}
      sx={{ width: '6.5rem', flexShrink: 0, ...sx }}
    />
  );
}

