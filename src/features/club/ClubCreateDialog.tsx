import {
  Collapse,
  Box,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import { EntityFormDialog } from '../../components/EntityFormDialog';
import { toErrorMessage } from '../../components/useEntityPage';
import { fetchClubSuggestions } from './clubApi';
import type { ClubSuggestionRow } from './types';

interface ClubCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onNext: (name: string) => void;
  onError: (message: string) => void;
}

export function ClubCreateDialog({
  open,
  onClose,
  onNext,
  onError,
}: ClubCreateDialogProps) {
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
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

  useEffect(() => {
    if (!open) {
      setName('');
      setSuggestions([]);
      setExpandedClubId(null);
      setSelectedClubId(null);
      setLoading(false);
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
  }, [name, onError, open]);

  const canGoNext = name.trim().length > 0;

  return (
    <EntityFormDialog
      open={open}
      onClose={onClose}
      title="Nouveau Club"
      onSave={() => onNext(name.trim())}
      saveLabel="Suivant"
      cancelLabel="Annuler"
      saving={false}
    >
      <TextField
        label="Nom"
        value={name}
        onChange={(event) => setName(event.target.value)}
        inputRef={nameInputRef}
        fullWidth
        size="small"
        autoFocus
      />

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

      {!canGoNext ? (
        <Typography variant="caption" color="text.secondary">
          Saisissez un nom pour lancer la recherche de clubs approchants.
        </Typography>
      ) : null}
    </EntityFormDialog>
  );
}