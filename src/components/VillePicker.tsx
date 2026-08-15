import ClearRoundedIcon from '@mui/icons-material/ClearRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import { Box, Dialog, DialogContent, DialogTitle, IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import { http } from '../lib/http';
import { fetchVilleById } from '../features/ville/villeApi';
import { VillePage } from '../features/ville/VillePage';
import type { VilleRow } from '../features/ville/types';
import { useEntityImage } from '../lib/useEntityImage';

export interface VillePickerProps {
  villeId: string;
  villeName: string;
  villeNatioId?: string;
  entityNatioId?: string;
  onChange: (id: string, name: string, natioId: string) => void;
  label?: string;
  size?: 'small' | 'medium';
  disabled?: boolean;
  required?: boolean;
  error?: boolean;
  helperText?: string;
  sx?: SxProps<Theme>;
}

function VilleFlagImg({ natioId }: { natioId: string }) {
  const { src } = useEntityImage('natio', natioId || null);
  const [natioName, setNatioName] = useState(natioId);

  useEffect(() => {
    if (!natioId) return;
    void http.get<Record<string, unknown>>(`/api/natio/${encodeURIComponent(natioId)}`)
      .then(({ data }) => setNatioName(String(data?.PAYS ?? natioId).trim() || natioId))
      .catch(() => {});
  }, [natioId]);

  if (!src) return null;
  return (
    <Tooltip title={natioName} placement="top">
      <Box
        component="img"
        src={src}
        alt={natioName}
        sx={{ width: 18, height: 13, objectFit: 'contain', flexShrink: 0, verticalAlign: 'middle', cursor: 'default' }}
      />
    </Tooltip>
  );
}

export function VillePicker({
  villeId,
  villeName,
  villeNatioId,
  entityNatioId,
  onChange,
  label = 'Ville',
  size = 'small',
  disabled,
  required,
  error,
  helperText,
  sx,
}: VillePickerProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  // Fetched natioId when prop not provided — allows flag to show on initial load
  const [fetchedNatioId, setFetchedNatioId] = useState('');
  const effectiveNatioId = villeNatioId || fetchedNatioId;

  useEffect(() => {
    if (!villeId || villeNatioId || !entityNatioId) {
      setFetchedNatioId('');
      return;
    }
    void fetchVilleById(villeId)
      .then((row) => setFetchedNatioId(String(row.IDNATIO ?? '').trim()))
      .catch(() => setFetchedNatioId(''));
  }, [villeId, villeNatioId, entityNatioId]);

  const displayValue = villeName || villeId;
  const hasValue = displayValue.trim().length > 0;
  const showFlag = !!effectiveNatioId && !!entityNatioId && effectiveNatioId !== entityNatioId;

  const handleSelect = (ville: VilleRow) => {
    const id = String(ville.VICLEUNIK ?? '').trim();
    const name = String(ville.NOM ?? '').trim();
    const natioId = String(ville.IDNATIO ?? '').trim();
    onChange(id, name, natioId);
    setSelectorOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '', '');
  };

  return (
    <>
      <TextField
        label={label}
        value={displayValue}
        size={size}
        fullWidth
        disabled={disabled}
        required={required}
        error={error}
        helperText={helperText}
        sx={sx}
        onContextMenu={(e) => { e.preventDefault(); if (!disabled) setSelectorOpen(true); }}
        slotProps={{
          input: {
            readOnly: true,
            startAdornment: showFlag ? (
              <InputAdornment position="start">
                <VilleFlagImg natioId={effectiveNatioId} />
              </InputAdornment>
            ) : undefined,
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Chercher une ville">
                  <IconButton size="small" onClick={() => setSelectorOpen(true)} disabled={disabled} edge="end" aria-label="Chercher une ville">
                    <LocationCityRoundedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {hasValue && !disabled ? (
                  <Tooltip title="Effacer">
                    <IconButton size="small" onClick={handleClear} edge="end" tabIndex={-1} aria-label="Effacer la ville">
                      <ClearRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                ) : null}
              </InputAdornment>
            ),
          },
        }}
      />

      <Dialog
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        fullWidth
        maxWidth="xl"
        slotProps={{
          paper: { sx: { height: 'min(90vh, 980px)' } },
        }}
      >
        <DialogTitle>Sélectionner une Ville</DialogTitle>
        <DialogContent dividers sx={{ p: 2, bgcolor: '#eef2f6', overflow: 'hidden', display: 'flex', minHeight: 0 }}>
          <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', '& > *': { flex: 1, minHeight: 0, minWidth: 0 } }}>
            <VillePage variant="modalPicker" onSelectVille={handleSelect} />
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
