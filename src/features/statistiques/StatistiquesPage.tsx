import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import {
  Box,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { STAT_DOMAINS, type StatDomain } from './statTree';
import { STAT_COMPONENTS } from './statRegistry';

const SIDEBAR_WIDTH = 300;
const NARROW_BREAKPOINT = 700;
const STATISTICS_UI_STORAGE_KEY = 'supporter:statistiques-ui:v1';

interface StatisticsUiState {
  search: string;
  expandedDomains: Record<string, boolean>;
  expandedThemes: Record<string, boolean>;
  drawerOpen: boolean;
}

const DEFAULT_STATISTICS_UI_STATE: StatisticsUiState = {
  search: '',
  expandedDomains: {},
  expandedThemes: {},
  drawerOpen: false,
};

function readStatisticsUiState(): StatisticsUiState {
  try {
    const stored = window.sessionStorage.getItem(STATISTICS_UI_STORAGE_KEY);
    if (!stored) return DEFAULT_STATISTICS_UI_STATE;
    const parsed = JSON.parse(stored) as Partial<StatisticsUiState>;
    return {
      ...DEFAULT_STATISTICS_UI_STATE,
      ...parsed,
      expandedDomains: parsed.expandedDomains ?? {},
      expandedThemes: parsed.expandedThemes ?? {},
    };
  } catch {
    return DEFAULT_STATISTICS_UI_STATE;
  }
}

interface SelectedStat {
  domainKey: string;
  themeKey: string;
  typeKey: string;
}

function statMatchesSearch(domain: StatDomain, themeLabel: string, typeLabel: string, search: string): boolean {
  const haystack = `${domain.label} ${themeLabel} ${typeLabel}`.toLowerCase();
  return haystack.includes(search.toLowerCase());
}

export function StatistiquesPage({ publicMode = false }: { publicMode?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [uiState, setUiState] = useState<StatisticsUiState>(() => readStatisticsUiState());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const { search, expandedDomains, expandedThemes, drawerOpen } = uiState;

  useEffect(() => {
    if (!publicMode || searchParams.get('d') || searchParams.get('t') || searchParams.get('s')) return;

    const firstDomain = STAT_DOMAINS[0];
    const firstTheme = firstDomain?.themes[0];
    const firstType = firstTheme?.types?.[0];
    if (firstDomain && firstTheme && firstType) {
      setSearchParams({ d: firstDomain.key, t: firstTheme.key, s: firstType.key }, { replace: true });
    }
  }, [publicMode, searchParams, setSearchParams]);

  useEffect(() => {
    window.sessionStorage.setItem(STATISTICS_UI_STORAGE_KEY, JSON.stringify(uiState));
  }, [uiState]);

  // Retracte le menu en tiroir quand le conteneur devient trop etroit.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? el.clientWidth;
      setIsNarrow(width < NARROW_BREAKPOINT);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // La selection est portee par l'URL (?d=...&t=...&s=...) pour rester partageable,
  // sans creer de nouvel onglet (AdminLayout ne suit que le pathname, pas la query string).
  const selected: SelectedStat | null = useMemo(() => {
    const domainKey = searchParams.get('d');
    const themeKey = searchParams.get('t');
    const typeKey = searchParams.get('s');
    return domainKey && themeKey && typeKey ? { domainKey, themeKey, typeKey } : null;
  }, [searchParams]);

  const selectStat = (domainKey: string, themeKey: string, typeKey: string) => {
    setSearchParams({ d: domainKey, t: themeKey, s: typeKey });
    if (isNarrow) setUiState((prev) => ({ ...prev, drawerOpen: false }));
  };

  const normalizedSearch = search.trim();
  const isFiltering = normalizedSearch.length > 0;

  const filteredDomains = useMemo(() => {
    if (!isFiltering) return STAT_DOMAINS;
    return STAT_DOMAINS
      .map((domain) => ({
        ...domain,
        themes: domain.themes
          .map((theme) => ({
            ...theme,
            types: theme.types?.filter((type) => statMatchesSearch(domain, theme.label, type.label, normalizedSearch)),
          }))
          .filter((theme) => (theme.types ? theme.types.length > 0 : statMatchesSearch(domain, theme.label, theme.label, normalizedSearch))),
      }))
      .filter((domain) => domain.themes.length > 0);
  }, [isFiltering, normalizedSearch]);

  const toggleDomain = (key: string) => {
    setUiState((prev) => ({
      ...prev,
      expandedDomains: { ...prev.expandedDomains, [key]: !prev.expandedDomains[key] },
    }));
  };

  const toggleTheme = (key: string) => {
    setUiState((prev) => ({
      ...prev,
      expandedThemes: { ...prev.expandedThemes, [key]: !prev.expandedThemes[key] },
    }));
  };

  const selectedDomain = selected ? STAT_DOMAINS.find((domain) => domain.key === selected.domainKey) : undefined;
  const selectedTheme = selectedDomain?.themes.find((theme) => theme.key === selected?.themeKey);
  const selectedType = selectedTheme?.types?.find((type) => type.key === selected?.typeKey);
  const StatComponent = selected ? STAT_COMPONENTS[`${selected.domainKey}/${selected.themeKey}/${selected.typeKey}`] : undefined;

  const sidebarContent = (
    <>
      <Box sx={{ p: 1.5 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Rechercher une statistique…"
          value={search}
          onChange={(event) => setUiState((prev) => ({ ...prev, search: event.target.value }))}
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
      </Box>
      <Divider />
      <List dense sx={{ overflowY: 'auto', flex: 1 }}>
        {filteredDomains.map((domain) => {
          const domainOpen = isFiltering || Boolean(expandedDomains[domain.key]);
          return (
            <Box key={domain.key}>
              <ListItemButton onClick={() => toggleDomain(domain.key)} sx={{ py: 0.75 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>{domain.icon}</ListItemIcon>
                <ListItemText slotProps={{ primary: { sx: { fontWeight: 700, fontSize: 14 } } }}>
                  {domain.label}
                </ListItemText>
                <ChevronRightRoundedIcon
                  fontSize="small"
                  sx={{ transform: domainOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', color: 'text.secondary' }}
                />
              </ListItemButton>
              <Collapse in={domainOpen} timeout="auto" unmountOnExit>
                {domain.themes.map((theme) => {
                  const themeStateKey = `${domain.key}/${theme.key}`;
                  const themeOpen = isFiltering || Boolean(expandedThemes[themeStateKey]);
                  const isLeafTheme = !theme.types;
                  const isLeafSelected = isLeafTheme
                    && selected?.domainKey === domain.key
                    && selected?.themeKey === theme.key;
                  if (isLeafTheme) {
                    return (
                      <ListItemButton
                        key={theme.key}
                        selected={isLeafSelected}
                        onClick={() => selectStat(domain.key, theme.key, theme.key)}
                        sx={{ pl: 4, py: 0.5 }}
                      >
                        <ListItemText slotProps={{ primary: { sx: { fontSize: 13, color: 'text.secondary', fontWeight: 600 } } }}>
                          {theme.label}
                        </ListItemText>
                      </ListItemButton>
                    );
                  }
                  return (
                    <Box key={theme.key}>
                      <ListItemButton onClick={() => toggleTheme(themeStateKey)} sx={{ pl: 4, py: 0.5 }}>
                        <ListItemText slotProps={{ primary: { sx: { fontSize: 13, color: 'text.secondary', fontWeight: 600 } } }}>
                          {theme.label}
                        </ListItemText>
                        <ChevronRightRoundedIcon
                          fontSize="inherit"
                          sx={{ transform: themeOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', color: 'text.disabled' }}
                        />
                      </ListItemButton>
                      <Collapse in={themeOpen} timeout="auto" unmountOnExit>
                        {theme.types?.map((type) => {
                          const isSelected = selected?.domainKey === domain.key
                            && selected?.themeKey === theme.key
                            && selected?.typeKey === type.key;
                          return (
                            <ListItemButton
                              key={type.key}
                              selected={isSelected}
                              onClick={() => selectStat(domain.key, theme.key, type.key)}
                              sx={{ pl: 6, py: 0.4 }}
                            >
                              <ListItemText slotProps={{ primary: { sx: { fontSize: 13 } } }}>
                                {type.label}
                              </ListItemText>
                            </ListItemButton>
                          );
                        })}
                      </Collapse>
                    </Box>
                  );
                })}
              </Collapse>
            </Box>
          );
        })}
        {isFiltering && filteredDomains.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1 }}>
            Aucune statistique ne correspond à « {normalizedSearch} ».
          </Typography>
        ) : null}
      </List>
    </>
  );

  return (
    <Box ref={containerRef} sx={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {isNarrow ? (
        <Drawer anchor="left" open={drawerOpen} onClose={() => setUiState((prev) => ({ ...prev, drawerOpen: false }))}>
          <Box sx={{ width: SIDEBAR_WIDTH, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {sidebarContent}
          </Box>
        </Drawer>
      ) : (
        <Box
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {sidebarContent}
        </Box>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {isNarrow ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', p: 1, borderBottom: '1px solid #e2e8f0' }}>
            <IconButton size="small" onClick={() => setUiState((prev) => ({ ...prev, drawerOpen: true }))} aria-label="Ouvrir le menu des statistiques">
              <MenuRoundedIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Statistiques
            </Typography>
          </Stack>
        ) : null}
        {selected && selectedDomain && selectedTheme && (selectedType || !selectedTheme.types) ? (
          <>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: '1px solid #e2e8f0' }}
            >
              <Stack spacing={0.25}>
                <Typography variant="caption" color="text.secondary">
                  {selectedDomain.label}{selectedType ? ` · ${selectedTheme.label}` : ''}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {selectedType?.label ?? selectedTheme.label}
                </Typography>
              </Stack>
            </Stack>
            {/* Zone filtres: à alimenter par stat (compétition, domicile/extérieur, saison…) */}
            <Box sx={{ p: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {StatComponent ? (
                <Suspense fallback={null}>
                  <StatComponent />
                </Suspense>
              ) : (
                <Stack spacing={1} sx={{ flex: 1, alignItems: 'center', justifyContent: 'center', color: 'text.secondary' }}>
                  <ArticleRoundedIcon sx={{ fontSize: 40 }} />
                  <Typography variant="body2">
                    StatGrid « {selectedType?.label ?? selectedTheme.label} » à venir.
                  </Typography>
                </Stack>
              )}
            </Box>
          </>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Stack spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
              <BarChartRoundedIcon sx={{ fontSize: 40 }} />
              <Typography variant="body2">
                Sélectionnez une statistique dans le menu à gauche.
              </Typography>
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  );
}
