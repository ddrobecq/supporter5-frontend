import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import type { ReactNode } from 'react';
import { EPREUVE_SCOPE_OPTIONS } from '../../../lib/epreuveScope';

interface StatGridToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  hideSearch?: boolean;
  scope?: number | null;
  onScopeChange?: (scope: number | null) => void;
  toolbarActions?: ReactNode;
}

export function StatGridToolbar({
  search,
  onSearchChange,
  searchLabel,
  searchPlaceholder,
  hideSearch,
  scope,
  onScopeChange,
  toolbarActions,
}: StatGridToolbarProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      {hideSearch ? null : (
        <TextField
          size="small"
          fullWidth
          autoFocus
          label={searchLabel}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      )}
      {onScopeChange ? (
        <TextField
          select
          size="small"
          label="Type de compétition"
          value={scope ?? ''}
          onChange={(event) => onScopeChange(event.target.value === '' ? null : Number(event.target.value))}
          sx={{ minWidth: 220, flexShrink: 0 }}
        >
          <MenuItem value="">Aucun</MenuItem>
          {EPREUVE_SCOPE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
          ))}
        </TextField>
      ) : null}
      {toolbarActions}
    </Stack>
  );
}