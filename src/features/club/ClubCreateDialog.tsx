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
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { toErrorMessage } from '../../components/useEntityPage';
import { useDepsChanged } from '../../lib/useDepsChanged';
import { fetchClubSuggestions } from './clubApi';
import { DateInputField } from '../../components/DateInputField';
import { toIsoDate } from '../../components/dateUtils';
import { useInvalidDateFields } from '../../components/useInvalidDateFields';
import { DEFAULT_NATIO_ID, NatioAutocomplete } from '../../components/NatioAutocomplete';
import { VillePicker } from '../../components/VillePicker';
import { useNatioList } from '../natio/natioStore';
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
  const [natioId, setNatioId] = useState(DEFAULT_NATIO_ID);
  const [creationDate, setCreationDate] = useState('');
  const [isSelection, setIsSelection] = useState(false);
  const [villeId, setVilleId] = useState('');
  const [villeName, setVilleName] = useState('');
  const [villeNatioId, setVilleNatioId] = useState('');
  const { rows: natioRows, loading: loadingNatio, error: natioError } = useNatioList();
  const [loading, setLoading] = useState(false);
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

  // Reset on close, while rendering.
  const openChanged = useDepsChanged([open]);
  if (openChanged && !open) {
    setStep(1);
    setSaving(false);
    setName('');
    setNatioId(DEFAULT_NATIO_ID);
    setCreationDate('');
    setIsSelection(false);
    setVilleId('');
    setVilleName('');
    setSuggestions([]);
    setExpandedClubId(null);
    setSelectedClubId(null);
    setLoading(false);
  }

  useEffect(() => {
    if (open && natioError) onError(natioError);
  }, [natioError, onError, open]);

  // An empty query clears the suggestions while rendering, on the dependencies of the search effect below.
  const suggestionDepsChanged = useDepsChanged([name, onError, open, step]);
  if (suggestionDepsChanged && open && step === 1 && !name.trim()) {
    setSuggestions([]);
    setLoading(false);
  }

  useEffect(() => {
    if (!open || step !== 1) {
      return;
    }

    const query = name.trim();
    if (!query) return;

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

  const { dateValidityHandler, isDateInvalid } = useInvalidDateFields();

  const canGoNext = name.trim().length > 0;
  const canCreate = name.trim().length > 0
    && natioId.trim().length > 0;

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
    if (isDateInvalid('creationDate')) {
      onError('La date de création est invalide.');
      return;
    }

    setSaving(true);
    try {
      await onCreate({
        name: name.trim(),
        natioId: natioId.trim().toUpperCase(),
        isSelection,
        creationDate: toIsoDate(creationDate) || undefined,
        // The city is optional (e.g. national team): none chosen means an empty city.
        villeId: villeId.trim(),
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
      // Always consume Enter here: this dialog is a MUI Portal, so React's synthetic
      // event would otherwise keep bubbling through the *component* tree into whatever
      // dialog/picker sits behind it in the DOM (e.g. a "Sélection d'un club" modal),
      // validating its own selection.
      event.stopPropagation();

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'textarea') return;

      const comboBox = target?.closest('[role="combobox"]');
      if (comboBox?.getAttribute('aria-expanded') === 'true') {
        // An open dropdown (e.g. the nationality or city autocomplete) handles Enter
        // itself to select its highlighted option; don't also advance the wizard step.
        return;
      }

      event.preventDefault();
      if (!saving) {
        handlePrimaryAction();
      }
    }
  };

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
        required
        size="small"
        autoFocus
        slotProps={{ htmlInput: { maxLength: 100 } }}
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
                      bgcolor: isSelected ? 'primary.main' : 'transparent',
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
                            bgcolor: 'action.hover',
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
                                    bgcolor: isHistorySelected ? 'action.selected' : undefined,
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
          <DateInputField
            label="Date de création"
            value={creationDate}
            onChange={setCreationDate}
            onValidityChange={dateValidityHandler('creationDate')}
            fullWidth
            calendarAriaLabel="Calendrier date de création"
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <NatioAutocomplete
                natioDatas={natioRows}
                value={natioId}
                onChange={setNatioId}
                label="Pays"
                disabled={loadingNatio}
              />
            </Box>

            <FormControlLabel
              label="Sélection nationale"
              control={<Switch checked={isSelection} onChange={(_, checked) => setIsSelection(checked)} />}
              sx={{ ml: 0, mr: 0, mb: 0, whiteSpace: 'nowrap' }}
            />
          </Box>

          {!isSelection ? (
            <VillePicker
              villeId={villeId}
              villeName={villeName}
              villeNatioId={villeNatioId}
              entityNatioId={natioId}
              onChange={(id, name, nId) => { setVilleId(id); setVilleName(name); setVilleNatioId(nId); }}
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
            <Button onClick={() => setStep(1)} color="inherit" disabled={saving}>Précédent</Button>
          ) : null}
          <Button
            onClick={handlePrimaryAction}
            variant="contained"
            disabled={saving || (step === 1 ? !canGoNext : !canCreate)}
          >
            {saving ? 'Enregistrement...' : step === 1 ? 'Suivant' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

    </>
  );
}