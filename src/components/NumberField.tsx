/**
 * Canonical component for all integer numeric input fields in the app.
 * ALL numeric-only fields MUST use this component so keyboard behavior
 * (AZERTY remapping, input filtering) stays consistent and centralized.
 *
 * Accepts only digit characters. Negative numbers and decimals are out of scope.
 */

import { InputAdornment, TextField } from '@mui/material';
import type { SxProps, TextFieldProps, Theme } from '@mui/material';
import type { ReactNode } from 'react';
import { useState } from 'react';

function formatWithThousands(digits: string): string {
  if (!digits) return '';
  const num = parseInt(digits, 10);
  return isNaN(num) ? digits : num.toLocaleString();
}

export interface NumberFieldProps {
  label: string;
  /** Current value as a string of digits, or empty string. */
  value: string;
  onChange: (nextValue: string) => void;
  maxLength?: number;
  min?: number;
  max?: number;
  /** Optional suffix shown as end adornment (e.g. "spect", "km"). */
  suffix?: ReactNode;
  align?: 'left' | 'center' | 'right';
  size?: TextFieldProps['size'];
  fullWidth?: boolean;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: TextFieldProps['helperText'];
  sx?: SxProps<Theme>;
}

export function NumberField({
  label,
  value,
  onChange,
  maxLength,
  min,
  max,
  suffix,
  align,
  size = 'small',
  fullWidth = false,
  disabled = false,
  required = false,
  error = false,
  helperText,
  sx,
}: NumberFieldProps) {
  const [focused, setFocused] = useState(false);
  const displayValue = focused ? value : formatWithThousands(value);

  // On AZERTY, unshifted Digit keys produce non-digit chars — remap them.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey
        && /^Digit\d$/.test(e.code) && !/^\d$/.test(e.key)) {
      e.preventDefault();
      document.execCommand('insertText', false, e.code.slice(-1));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '');
    if (maxLength !== undefined) digits = digits.slice(0, maxLength);
    if (max !== undefined && digits !== '') {
      const num = parseInt(digits, 10);
      if (!isNaN(num) && num > max) digits = String(max);
    }
    if (min !== undefined && digits !== '') {
      const num = parseInt(digits, 10);
      if (!isNaN(num) && num < min) digits = String(min);
    }
    onChange(digits);
  };

  return (
    <TextField
      label={label}
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
      error={error}
      helperText={helperText}
      sx={sx}
      slotProps={{
        htmlInput: { inputMode: 'numeric', pattern: '[0-9]*', maxLength, ...(align ? { style: { textAlign: align } } : {}) },
        ...(suffix ? { input: { endAdornment: <InputAdornment position="end">{suffix}</InputAdornment> } } : {}),
      }}
    />
  );
}
