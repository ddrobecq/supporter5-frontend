import { Autocomplete, Box, TextField } from '@mui/material';
import { useMemo } from 'react';
import type { NatioRow } from '../features/natio/types';
import { useEntityImage } from '../lib/useEntityImage';

interface NatioOption {
  id: string;
  label: string;
}

export interface NatioAutocompleteProps {
  natioDatas: NatioRow[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  size?: 'small' | 'medium';
  disabled?: boolean;
}

function FlagImg({ idnatio }: { idnatio: string }) {
  const { src } = useEntityImage('natio', idnatio || null);
  if (!src) return <Box sx={{ width: 20, height: 14, flexShrink: 0 }} />;
  return (
    <Box
      component="img"
      src={src}
      alt=""
      sx={{ width: 20, height: 14, objectFit: 'contain', flexShrink: 0 }}
    />
  );
}

export function NatioAutocomplete({
  natioDatas,
  value,
  onChange,
  label = 'Nationalité',
  error,
  helperText,
  required,
  size = 'small',
  disabled,
}: NatioAutocompleteProps) {
  const options = useMemo<NatioOption[]>(
    () =>
      natioDatas
        .map((row) => ({
          id: String(row.IDNATIO ?? row.ID ?? '').trim(),
          label: String(row.PAYS ?? row.NOM ?? '').trim(),
        }))
        .filter((opt) => opt.id.length > 0)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [natioDatas],
  );

  const selected = options.find((opt) => opt.id === value) ?? null;

  return (
    <Autocomplete
      options={options}
      value={selected}
      onChange={(_, option) => onChange(option?.id ?? '')}
      getOptionLabel={(option) => option.label}
      renderOption={(props, option) => (
        <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FlagImg idnatio={option.id} />
          {option.label}
        </Box>
      )}
      renderInput={(params) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = params as any;
        return (
          <TextField
            {...params}
            label={label}
            error={error}
            helperText={helperText}
            size={size}
            required={required}
            slotProps={{
              ...p.slotProps,
              input: {
                ...(p.slotProps?.input ?? {}),
                startAdornment: selected ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5, mr: 0.25, flexShrink: 0 }}>
                    <FlagImg idnatio={selected.id} />
                  </Box>
                ) : null,
              },
            }}
          />
        );
      }}
      size={size}
      disabled={disabled}
      autoHighlight
    />
  );
}
