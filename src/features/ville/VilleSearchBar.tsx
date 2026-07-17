import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { InputAdornment, TextField, type TextFieldProps } from '@mui/material';

interface VilleSearchBarProps extends Omit<TextFieldProps, 'type' | 'variant' | 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

export function VilleSearchBar({ value, onChange, inputRef, autoFocus = false, ...props }: VilleSearchBarProps) {
  return (
    <TextField
      size="small"
      label="Rechercher une ville"
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
