import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import { IconButton, TextField } from '@mui/material';
import type { SxProps, TextFieldProps, Theme } from '@mui/material';
import { useRef } from 'react';

export function normalizeDisplayDateInput(input: string): string {
  const digits = input.replace(/\D+/g, '').slice(0, 8);
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

  return (
    <>
      <TextField
        label={label}
        value={value}
        onChange={(event) => onChange(normalizeDisplayDateInput(event.target.value))}
        size={size}
        fullWidth={fullWidth}
        disabled={disabled}
        required={required}
        error={error}
        helperText={helperText}
        sx={sx}
        slotProps={{
          inputLabel: { shrink: true },
          htmlInput: { maxLength, placeholder },
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
