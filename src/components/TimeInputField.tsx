import { TextField } from '@mui/material';
import type { SxProps, TextFieldProps, Theme } from '@mui/material';

function normalizeTimeInput(input: string): string {
  const text = String(input ?? '').trim();
  if (!text) return '';

  const withSeparator = text.includes(':')
    ? text
    : text.replace(/\D+/g, '').slice(0, 4).replace(/^(\d{2})(\d{0,2}).*$/, (_match, hh, mm) => (mm ? `${hh}:${mm}` : hh));

  const parts = withSeparator.split(':');
  if (parts.length !== 2) {
    return '';
  }

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return '';
  }

  const hh = String(Math.max(0, Math.min(23, Math.trunc(hours)))).padStart(2, '0');
  const mm = String(Math.max(0, Math.min(59, Math.trunc(minutes)))).padStart(2, '0');
  return `${hh}:${mm}`;
}

interface TimeInputFieldProps {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
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
  size = 'small',
  fullWidth = false,
  disabled = false,
  required = false,
  error = false,
  helperText,
  sx,
}: TimeInputFieldProps) {
  return (
    <TextField
      label={label}
      type="time"
      value={normalizeTimeInput(value)}
      onChange={(event) => onChange(normalizeTimeInput(event.target.value))}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      required={required}
      error={error}
      helperText={helperText}
      sx={sx}
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: { step: 60 },
      }}
    />
  );
}
