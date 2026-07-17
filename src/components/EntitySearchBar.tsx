import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { InputAdornment, TextField, type TextFieldProps } from '@mui/material';

interface EntitySearchBarProps extends Omit<TextFieldProps, 'type' | 'variant' | 'value' | 'onChange'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function EntitySearchBar({ label, value, onChange, inputRef, autoFocus = false, ...props }: EntitySearchBarProps) {
  return (
    <TextField
      size="small"
      label={label}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputRef={inputRef}
      autoFocus={autoFocus}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
      sx={{ minWidth: 280, ...props.sx }}
      {...props}
    />
  );
}