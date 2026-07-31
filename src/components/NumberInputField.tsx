import TextField from '@mui/material/TextField';
import type { SxProps, Theme } from '@mui/material/styles';

// AZERTY keys without Shift → their digit equivalents
const AZERTY_DIGIT: Record<string, string> = {
  '&': '1', 'é': '2', '"': '3', "'": '4', '(': '5',
  '-': '6', 'è': '7', '_': '8', 'ç': '9', 'à': '0',
};

function normalizeDigits(raw: string): string {
  return raw
    .split('')
    .map((ch) => AZERTY_DIGIT[ch] ?? ch)
    .join('')
    .replace(/[^0-9]/g, '');
}

function mapAzertyChars(raw: string): string {
  return raw
    .split('')
    .map((ch) => AZERTY_DIGIT[ch] ?? ch)
    .join('');
}

interface NumberInputFieldProps {
  id?: string;
  name?: string;
  label?: string;
  placeholder?: string;
  size?: 'small' | 'medium';
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
  value: number | string | null | undefined;
  onChange?: (value: number | null) => void;
  min?: number;
  max?: number;
}

export function NumberInputField({
  id,
  name,
  label,
  placeholder,
  size = 'medium',
  disabled,
  required,
  error,
  helperText,
  fullWidth = true,
  sx,
  value,
  onChange,
  min,
  max,
}: NumberInputFieldProps) {
  const displayValue = value == null ? '' : String(value);

  const clamp = (num: number): number => {
    if (min != null && num < min) return min;
    if (max != null && num > max) return max;
    return num;
  };

  const commitString = (raw: string) => {
    const normalized = normalizeDigits(raw);
    if (normalized === '') {
      onChange?.(null);
      return;
    }
    const num = parseInt(normalized, 10);
    if (!Number.isFinite(num)) return;
    onChange?.(clamp(num));
  };

  return (
    <TextField
      id={id}
      name={name}
      label={label}
      placeholder={placeholder}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
      error={error}
      helperText={helperText}
      sx={sx}
      value={displayValue}
      onChange={(e) => {
        const mapped = mapAzertyChars(e.target.value);
        commitString(mapped);
      }}
      slotProps={{
        htmlInput: {
          inputMode: 'numeric',
          pattern: '[0-9]*',
        },
        inputLabel: { shrink: true },
      }}
    />
  );
}
