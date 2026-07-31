import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import { IconButton, TextField } from '@mui/material';
import type { SxProps, TextFieldProps, Theme } from '@mui/material';
import { useRef, useState } from 'react';

// Maps unshifted AZERTY number-row chars to their digit equivalents
const AZERTY_DIGIT: Record<string, string> = {
  '&': '1', 'é': '2', '"': '3', "'": '4', '(': '5',
  '-': '6', 'è': '7', '_': '8', 'ç': '9', 'à': '0',
};

export function normalizeDisplayDateInput(input: string): string {
  const mapped = Array.from(input).map((ch) => AZERTY_DIGIT[ch] ?? ch).join('');
  const digits = mapped.replace(/\D+/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function toInputDateFromDisplay(value: string): string {
  const french = String(value ?? '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!french) return '';
  return `${french[3]}-${french[2]}-${french[1]}`;
}

export function fromInputDateToDisplay(value: string): string {
  const dashed = String(value ?? '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dashed) return '';
  return `${dashed[3]}/${dashed[2]}/${dashed[1]}`;
}

function isoFromAny(value: unknown): string {
  const text = String(value ?? '').trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const compact = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
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
  size = 'small',
  fullWidth = false,
  disabled = false,
  required = false,
  error = false,
  helperText,
  calendarAriaLabel = `Calendrier ${label}`,
  placeholder = 'JJ/MM/AAAA',
  maxLength = 10,
  sx,
}: DateInputFieldProps) {
  const pickerRef = useRef<HTMLInputElement | null>(null);
  const [focused, setFocused] = useState(false);

  // Show dd-mmm-yy when not editing; switch to DD/MM/YYYY on focus
  const displayValue = focused
    ? value
    : (value ? (formatDateShort(toInputDateFromDisplay(value)) || value) : '');

  return (
    <>
      <TextField
        label={label}
        value={displayValue}
        onChange={(event) => {
          if (focused) onChange(normalizeDisplayDateInput(event.target.value));
        }}
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

