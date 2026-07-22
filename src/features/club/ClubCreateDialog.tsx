import {
  Collapse,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import InputAdornment from '@mui/material/InputAdornment';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { toErrorMessage } from '../../components/useEntityPage';
import { fetchClubSuggestions } from './clubApi';
import { fetchNatio } from '../natio/natioApi';
import { TerrainVilleSelector } from '../terrain/TerrainVilleSelector';
import type { NatioRow } from '../natio/types';
import type { ClubCreateWizardPayload, ClubSuggestionRow } from './types';

interface ClubCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: ClubCreateWizardPayload) => Promise<void>;
  onError: (message: string) => void;
}

export function ClubCreateDialog({
  open,
  onClose,
  onCreate,
  onError,
}: ClubCreateDialogProps) {
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const countryInputRef = useRef<HTMLInputElement | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [natioId, setNatioId] = useState('');
  const [isSelection, setIsSelection] = useState(false);
  const [villeId, setVilleId] = useState('');
  const [villeName, setVilleName] = useState('');
  const [villeSelectorOpen, setVilleSelectorOpen] = useState(false);
  const [natioRows, setNatioRows] = useState<NatioRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingNatio, setLoadingNatio] = useState(false);
  const [suggestions, setSuggestions] = useState<ClubSuggestionRow[]>([]);
  const [expandedClubId, setExpandedClubId] = useState<string | null>(null);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 10);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setSaving(false);
      setName('');
      setNatioId('');
      setIsSelection(false);
      setVilleId('');
      setVilleName('');
      setNatioRows([]);
      setSuggestions([]);
      setExpandedClubId(null);
      setSelectedClubId(null);
      setLoading(false);
      setLoadingNatio(false);
      return;
    }

    const controller = new AbortController();
    setLoadingNatio(true);
    void fetchNatio('', controller.signal)
      .then((result) => {
        setNatioRows(result.data ?? []);
      })
      .catch((error: unknown) => {
        if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') {
          return;
        }
        onError(toErrorMessage(error));
      })
      .finally(() => setLoadingNatio(false));

    return () => controller.abort();
  }, [onError, open]);

  useEffect(() => {
    if (!open || step !== 1) {
      return;
    }

    const query = name.trim();
    if (!query) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      // Keep the list container mounted but clear its items while searching.
      setSuggestions([]);
      setLoading(true);
      void fetchClubSuggestions(query, controller.signal)
        .then((result) => {
          setSuggestions(result.data ?? []);
        })
        .catch((error: unknown) => {
          if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') {
            return;
          }
          onError(toErrorMessage(error));
        })
        .finally(() => {
          setLoading(false);
        });
    }, 320);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [name, onError, open, step]);

  useEffect(() => {
    if (!open || step !== 2) {
      return;
    }
    const timer = window.setTimeout(() => {
      countryInputRef.current?.focus();
    }, 10);
    return () => window.clearTimeout(timer);
  }, [open, step]);

  const canGoNext = name.trim().length > 0;
  const canCreate = name.trim().length > 0 && natioId.trim().length > 0 && (isSelection || villeId.trim().length > 0);

  const handleNext = () => {
    if (!canGoNext) {
      onError('Le nom du club est requis.');
      return;
    }
    setStep(2);
  };

  const handleCreate = async () => {
    if (!natioId.trim()) {
      onError('Le pays est requis.');
      return;
    }
    if (!isSelection && !villeId.trim()) {
      onError('La ville est requise si le club nest pas une selection nationale.');
      return;
    }

    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        natioId: natioId.trim().toUpperCase(),
        isSelection,
        villeId: villeId.trim() || undefined,
      });
      onClose();
    } catch (error) {
      onError(toErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handlePrimaryAction = () => {
    if (step === 1) {
      handleNext();
      return;
    }
    void handleCreate();
  };

  const handleDialogKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (!saving) {
        onClose();
      }
      return;
    }

    if (event.key === 'Enter') {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'textarea') return;
      event.preventDefault();
      if (!saving) {
        handlePrimaryAction();
      }
    }
  };

  const countryOptions = natioRows
    .map((row) => ({
      id: String(row.IDNATIO ?? row.ID ?? '').trim(),
      label: String(row.PAYS ?? row.NOM ?? '').trim(),
    }))
    .filter((row) => row.id.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label));

  const selectedCountry = countryOptions.find((option) => option.id === natioId) ?? null;

  const showSuggestions = step === 1;

  return (
    <>
      <Dialog open={open} onClose={() => { if (!saving) onClose(); }} fullWidth maxWidth="sm" onKeyDown={handleDialogKeyDown}>
        <DialogTitle>Nouveau Club</DialogTitle>
        <DialogContent sx={{ p: 0, overflowX: 'hidden' }}>
          <Box sx={{ px: 3, pt: 1.5, pb: 1.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
      <TextField
        label="Nom"
        value={name}
        onChange={(event) => setName(event.target.value)}
        inputRef={nameInputRef}
        fullWidth
        size="small"
        autoFocus
      />

      {showSuggestions ? (
        <Paper
        variant="outlined"
        sx={{
          minHeight: 220,
          maxHeight: 220,
          overflowY: 'auto',
          visibility: name.trim().length > 0 ? 'visible' : 'hidden',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1.25 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">Recherche en cours...</Typography>
          </Box>
        ) : suggestions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 1.5, py: 1.25 }}>
            Aucun club approchant trouvé.
          </Typography>
        ) : (
          <List
            dense
            disablePadding
            sx={{
              py: 0,
              '& .MuiListItem-root': {
                py: 0,
                my: 0,
              },
              '& .MuiListItemButton-root': {
                minHeight: 18,
              },
            }}
          >
            {suggestions
              .filter((club) => String(club.CLUB_NOM_COMPLET ?? '').trim().length > 0)
              .map((club) => {
                const historyNames = club.CLUB_NOMS ?? [];
                const hasMultipleNames = historyNames.length > 1;
                const isExpanded = expandedClubId === club.IDCLUB;
                const isSelected = selectedClubId === club.IDCLUB;

                return (
                  <Box
                    key={club.IDCLUB}
                    sx={{
                      bgcolor: isSelected ? '#244a73' : 'transparent',
                      color: isSelected ? '#ffffff' : 'inherit',
                      borderRadius: isSelected ? 0.75 : 0,
                      mx: 0.25,
                    }}
                  >
                    <ListItem disableGutters sx={{ px: 0 }}>
                      {hasMultipleNames ? (
                        <IconButton
                          size="small"
                          aria-label={isExpanded ? 'Masquer les noms du club' : 'Afficher les noms du club'}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedClubId(club.IDCLUB);
                            setExpandedClubId((prev) => (prev === club.IDCLUB ? null : club.IDCLUB));
                          }}
                          sx={{ ml: 0.5, mr: 0.5 }}
                        >
                          {isExpanded ? <RemoveRoundedIcon sx={{ fontSize: 14 }} /> : <AddRoundedIcon sx={{ fontSize: 14 }} />}
                        </IconButton>
                      ) : (
                        <Box sx={{ width: 30, flexShrink: 0 }} />
                      )}

                      <ListItemButton
                        selected={isSelected}
                        sx={{
                          pl: 0.5,
                          pr: 0.75,
                          py: 0.125,
                          minHeight: 0,
                          '& .MuiListItemText-root': {
                            my: 0,
                          },
                          '& .MuiListItemText-primary': {
                            fontSize: '0.78rem',
                            lineHeight: 1.1,
                          },
                          '&.Mui-selected': {
                            bgcolor: 'transparent',
                            color: 'inherit',
                          },
                          '&.Mui-selected:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.08)',
                          },
                        }}
                        onClick={() => {
                          setSelectedClubId(club.IDCLUB);
                          setExpandedClubId(hasMultipleNames ? club.IDCLUB : null);
                        }}
                      >
                        <ListItemText primary={club.CLUB_NOM_COMPLET} />
                      </ListItemButton>
                    </ListItem>

                    {hasMultipleNames ? (
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <List
                          dense
                          disablePadding
                          sx={{
                            ml: 4.5,
                            mr: 1,
                            mt: 0,
                            mb: 0,
                            py: 0,
                          }}
                        >
                          {historyNames.map((clubName, index) => {
                            const itemKey = `${club.IDCLUB}-${clubName}-${index}`;
                            const isHistorySelected = isSelected && isExpanded;
                            return (
                              <ListItemButton
                                key={itemKey}
                                selected={false}
                                onClick={(event) => event.stopPropagation()}
                                sx={{
                                  py: 0,
                                  minHeight: 0,
                                  borderRadius: 0.75,
                                  '& .MuiListItemText-root': {
                                    my: 0,
                                  },
                                  color: isHistorySelected ? 'inherit' : undefined,
                                  '&:hover': {
                                    bgcolor: isHistorySelected ? 'rgba(255, 255, 255, 0.08)' : undefined,
                                  },
                                }}
                              >
                                <ListItemText
                                  primary={(
                                    <Typography
                                      variant="caption"
                                      color={isHistorySelected
                                        ? 'inherit'
                                        : index === 0
                                          ? 'text.primary'
                                          : 'text.secondary'}
                                      sx={{ lineHeight: 1.05 }}
                                    >
                                      {index === 0 ? `${clubName} (actuel)` : clubName}
                                    </Typography>
                                  )}
                                />
                              </ListItemButton>
                            );
                          })}
                        </List>
                      </Collapse>
                    ) : null}
                  </Box>
                );
              })}
          </List>
        )}
      </Paper>
      ) : (
        <>
          <TextField
            select
            label="Pays"
            value={selectedCountry?.id ?? ''}
            onChange={(event) => setNatioId(event.target.value)}
            fullWidth
            size="small"
            inputRef={countryInputRef}
            slotProps={{ select: { native: true } }}
            disabled={loadingNatio}
          >
            <option value=""></option>
            {countryOptions.map((option) => (
              <option key={option.id} value={option.id}>{`${option.label} (${option.id})`}</option>
            ))}
          </TextField>

          <FormControlLabel
            label="Selection nationale"
            control={<Switch checked={isSelection} onChange={(_, checked) => setIsSelection(checked)} />}
            sx={{ ml: 0 }}
          />

          {!isSelection ? (
            <TextField
              label="Ville"
              value={villeName || villeId}
              fullWidth
              size="small"
              onContextMenu={(event) => {
                event.preventDefault();
                setVilleSelectorOpen(true);
              }}
              slotProps={{
                input: {
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => setVilleSelectorOpen(true)}
                        sx={{ minWidth: 36, p: 0 }}
                      >
                        <EditRoundedIcon fontSize="small" />
                      </Button>
                    </InputAdornment>
                  ),
                },
              }}
            />
          ) : null}
        </>
      )}

      {!canGoNext ? (
        <Typography variant="caption" color="text.secondary">
          Saisissez un nom pour lancer la recherche de clubs approchants.
        </Typography>
      ) : null}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1, justifyContent: 'flex-end' }}>
          <Button onClick={onClose} color="inherit" disabled={saving}>Annuler</Button>
          {step === 2 ? (
            <Button onClick={() => setStep(1)} color="inherit" disabled={saving}>Precedent</Button>
          ) : null}
          <Button
            onClick={handlePrimaryAction}
            variant="contained"
            disabled={saving || (step === 1 ? !canGoNext : !canCreate)}
          >
            {saving ? 'Enregistrement...' : step === 1 ? 'Suivant' : 'Creer'}
          </Button>
        </DialogActions>
      </Dialog>

      <TerrainVilleSelector
        open={villeSelectorOpen}
        onClose={() => setVilleSelectorOpen(false)}
        onSelect={(ville) => {
          const selectedVilleId = String(ville.VICLEUNIK ?? '').trim();
          const selectedVilleName = String(ville.NOM ?? '').trim();
          setVilleId(selectedVilleId);
          setVilleName(selectedVilleName);
          setVilleSelectorOpen(false);
        }}
      />
    </>
  );
}