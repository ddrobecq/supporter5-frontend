import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import { IconButton, InputAdornment, Stack, TextField, Tooltip } from '@mui/material';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ClubSelectionDialog } from '../features/competition/ClubSelectionDialog';
import type { ClubGridRow } from '../features/club/types';
import { ClubIdentityInline } from './ClubIdentityInline';

interface ClubSelectFieldChange {
  clubId: string;
  clubName: string;
}

interface ClubSelectFieldProps {
  label?: string;
  clubId: string;
  clubName: string;
  onChange: (nextValue: ClubSelectFieldChange) => void;
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: ReactNode;
  selectLabel?: string;
  clearLabel?: string;
}

export function ClubSelectField({
  label = 'Club',
  clubId,
  clubName,
  onChange,
  disabled = false,
  required = false,
  error = false,
  helperText,
  selectLabel = 'Selectionner',
  clearLabel = 'Effacer',
}: ClubSelectFieldProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);

  const normalizedClubId = String(clubId ?? '').trim();
  const normalizedClubName = String(clubName ?? '').trim();
  const hasClub = Boolean(normalizedClubId || normalizedClubName);

  const handlePickClub = (selectedId: string, selectedRow?: ClubGridRow) => {
    const nextClubId = String(selectedId ?? '').trim();
    const rowName = String(selectedRow?.CLUB_NOM_COMPLET ?? '').trim();
    onChange({
      clubId: nextClubId,
      clubName: rowName || nextClubId,
    });
    setSelectorOpen(false);
  };

  return (
    <>
      <TextField
        label={label}
        value=""
        size="small"
        fullWidth
        required={required}
        error={error}
        helperText={helperText}
        slotProps={{
          htmlInput: {
            placeholder: hasClub ? undefined : 'Aucun club',
          },
          input: {
            readOnly: true,
            startAdornment: hasClub ? (
              <InputAdornment position="start" sx={{ mr: 0.75, maxWidth: '70%' }}>
                <ClubIdentityInline
                  clubId={normalizedClubId}
                  clubName={normalizedClubName || normalizedClubId}
                  size={20}
                  nameSx={{
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    fontWeight: 'inherit',
                    lineHeight: '1.4375em',
                    letterSpacing: 'inherit',
                    color: 'text.primary',
                  }}
                />
              </InputAdornment>
            ) : undefined,
            endAdornment: (
              <InputAdornment position="end" sx={{ ml: 0 }}>
                <Stack direction="row" spacing={0.5}>
                  <Tooltip title={selectLabel}>
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => setSelectorOpen(true)}
                        disabled={disabled}
                        aria-label={selectLabel}
                      >
                        <SearchRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={clearLabel}>
                    <span>
                      <IconButton
                        size="small"
                        color="inherit"
                        onClick={() => onChange({ clubId: '', clubName: '' })}
                        disabled={disabled || !hasClub}
                        aria-label={clearLabel}
                      >
                        <ClearRoundedIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </InputAdornment>
            ),
          },
        }}
      />

      <ClubSelectionDialog
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handlePickClub}
      />
    </>
  );
}
