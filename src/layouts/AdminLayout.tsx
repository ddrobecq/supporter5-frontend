import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tab,
  Tabs,
  Tooltip,
  Toolbar,
  Typography,
} from '@mui/material';
import { Fragment, lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authStore } from '../features/auth/authStore';
import type { HomePageOutletContext, RecentOpenedRecord } from '../features/home/types';
import { emitTabSaveRequest } from '../lib/useTabMetaEvents';
import { useEntityImage } from '../lib/useEntityImage';
import { supportedClubStore } from '../features/system/supportedClubStore';
import {
  RECENT_OPENED_STORAGE_KEY,
  readRecentOpenedRecordsFromStorage,
  renameRecentOpenedRecord,
  upsertRecentOpenedRecord,
} from './adminRecentRecords';
import {
  PICKER_ENTITY_DEFINITIONS,
  TAB_META,
  TOOLBAR_BUTTONS,
  TOOLBAR_SECONDARY_CATEGORIES,
  TOOLBAR_TOOLS_GROUPS,
  type NavTab,
  type PickerEntityKey,
  type PickerOpenPayload,
  type ToolbarButton,
  type ToolsMenuAction,
} from './adminLayoutConfig';
import { decodeRouteSegment, normalizeRoutePath, resolveTabMetaPath } from './adminLayoutRoutes';

const RencontreTabFormPane = lazy(() => import('../features/rencontre/RencontreTabFormPane').then((module) => ({ default: module.RencontreTabFormPane })));
const RencontreCreateWizardDialog = lazy(() => import('../features/rencontre/RencontreCreateWizardDialog').then((module) => ({ default: module.RencontreCreateWizardDialog })));
const TerrainPickerDialog = lazy(() => import('../features/terrain/TerrainPickerDialog').then((module) => ({ default: module.TerrainPickerDialog })));
const ClubMergeDialog = lazy(() => import('../features/club/ClubMergeDialog').then((module) => ({ default: module.ClubMergeDialog })));
const StatsRecomputeDialog = lazy(() => import('../features/statistiques/StatsRecomputeDialog').then((module) => ({ default: module.StatsRecomputeDialog })));
const RencontreImportWizardDialog = lazy(() => import('../features/import/RencontreImportWizardDialog').then((module) => ({ default: module.RencontreImportWizardDialog })));

interface OpenTabOptions {
  unique?: boolean;
  uniqueByPath?: boolean;
}

interface TabOpenEventDetail {
  path?: string;
  label?: string;
  unique?: boolean;
  uniqueByPath?: boolean;
}

const HOME_TAB_KEY = 'tab-home';

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const supportedClubId = supportedClubStore((s) => s.clubId);
  const loadSupportedClub = supportedClubStore((s) => s.load);
  const monacoLogo = useEntityImage('club', supportedClubId || '0001');
  const logout = authStore((s) => s.logout);
  const topToolbarRef = useRef<HTMLDivElement | null>(null);
  const topBrandRef = useRef<HTMLDivElement | null>(null);
  const topActionsMeasureRef = useRef<HTMLDivElement | null>(null);
  const navButtonsRowRef = useRef<HTMLDivElement | null>(null);
  const [compactNavButtons, setCompactNavButtons] = useState(false);
  const [compactTopActions, setCompactTopActions] = useState(false);
  const [toolsMenuAnchorEl, setToolsMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [clubMergeOpen, setClubMergeOpen] = useState(false);
  const [statsRecomputeOpen, setStatsRecomputeOpen] = useState(false);
  const [rencontreImportOpen, setRencontreImportOpen] = useState(false);
  const [pickerModal, setPickerModal] = useState<PickerEntityKey | null>(null);
  const [rencontreWizardOpen, setRencontreWizardOpen] = useState(false);
  const [dirtyTabsByPath, setDirtyTabsByPath] = useState<Record<string, boolean>>({});
  const [italicTabsByPath, setItalicTabsByPath] = useState<Record<string, boolean>>({});
  const [closeConfirmTabKey, setCloseConfirmTabKey] = useState<string | null>(null);
  const [savingBeforeClose, setSavingBeforeClose] = useState(false);
  const [recentOpenedRecords, setRecentOpenedRecords] = useState<RecentOpenedRecord[]>(() => readRecentOpenedRecordsFromStorage());
  const tabCounterRef = useRef(0);
  // Retient la derniere URL complete (avec query string) visitee par onglet, pour la restaurer au retour sur l'onglet.
  const tabLocationByKeyRef = useRef<Record<string, string>>({});
  const [tabs, setTabs] = useState<NavTab[]>([
    {
      key: HOME_TAB_KEY,
      label: TAB_META['/admin/home'].label,
      path: '/admin/home',
      closable: false,
    },
  ]);
  const [activeTabKey, setActiveTabKey] = useState<string | false>(HOME_TAB_KEY);
  const pickerDefinitionByKey = new Map(PICKER_ENTITY_DEFINITIONS.map((entity) => [entity.key, entity]));
  const isHomeActive = location.pathname === '/admin/home' || location.pathname === '/accueil';
  const isConfigurationActive = location.pathname === '/admin/configuration' || location.pathname === '/configuration';
  const isCalendrierActive = location.pathname === '/admin/calendrier' || location.pathname === '/calendrier';
  const isStatistiquesActive = location.pathname === '/admin/statistiques' || location.pathname === '/statistiques';
  const isEntityActive = (entityKey: PickerEntityKey) => {
    const entity = pickerDefinitionByKey.get(entityKey);
    if (!entity) return false;
    return location.pathname === entity.basePath
      || location.pathname === entity.shortPath
      || location.pathname.startsWith(`${entity.basePath}/`);
  };
  const isToolbarButtonActive = (button: ToolbarButton) => {
    if (button.activeKey === 'home') return isHomeActive;
    if (button.activeKey === 'calendrier') return isCalendrierActive;
    if (button.activeKey === 'statistiques') return isStatistiquesActive;
    return button.activeKey ? isEntityActive(button.activeKey) : false;
  };
  const primaryToolbarButtons = TOOLBAR_BUTTONS.filter((button) => !button.secondaryCategory);
  const secondaryToolbarButtons = TOOLBAR_BUTTONS.filter((button) => Boolean(button.secondaryCategory));
  const activeTab = typeof activeTabKey === 'string' ? tabs.find((tab) => tab.key === activeTabKey) : undefined;
  const isDynamicFormPath = (path: string) => (
    path.startsWith('/admin/rencontres/')
    || PICKER_ENTITY_DEFINITIONS.some((entity) => path.startsWith(`${entity.basePath}/`))
  );
  const activeTabIsDynamicForm = Boolean(activeTab?.path && isDynamicFormPath(activeTab.path)) || isDynamicFormPath(location.pathname);

  const handleToolsMenuAction = (action: ToolsMenuAction) => {
    if (action === 'club-merge') {
      setClubMergeOpen(true);
    } else if (action === 'stats-recompute') {
      setStatsRecomputeOpen(true);
    } else if (action === 'rencontres-import') {
      setRencontreImportOpen(true);
    } else if (action === 'rss-feed') {
      openTab('/admin/rss', 'Flux RSS', { unique: true, uniqueByPath: true });
    } else if (action === 'incomplets-joueurs') {
      openTab('/admin/joueurs-incomplets', 'Joueurs incomplets', { unique: true, uniqueByPath: true });
    } else if (action === 'incomplets-clubs') {
      openTab('/admin/clubs-incomplets', 'Clubs incomplets', { unique: true, uniqueByPath: true });
    } else if (action === 'incomplets-rencontres') {
      openTab('/admin/rencontres-incompletes', 'Rencontres incomplètes', { unique: true, uniqueByPath: true });
    }
  };

  const handleToolbarButtonClick = (button: ToolbarButton) => {
    switch (button.action) {
      case 'navigate':
        openTab(button.path, button.label, { unique: true, uniqueByPath: true });
        return;
      case 'picker':
        setPickerModal(button.entity);
        return;
      case 'wizard':
        if (button.wizard === 'rencontre') {
          setRencontreWizardOpen(true);
        }
        return;
      case 'noop':
        return;
    }
  };

  const rememberOpenedRecord = (path: string, label: string) => {
    setRecentOpenedRecords((prev) => upsertRecentOpenedRecord(prev, path, label));
  };

  useEffect(() => {
    void loadSupportedClub();
  }, [loadSupportedClub]);

  useEffect(() => {
    window.localStorage.setItem(RECENT_OPENED_STORAGE_KEY, JSON.stringify(recentOpenedRecords));
  }, [recentOpenedRecords]);

  useEffect(() => {
    if (!activeTab) return;
    rememberOpenedRecord(activeTab.path, activeTab.label);
  }, [activeTab]);

  useEffect(() => {
    if (typeof activeTabKey === 'string') {
      tabLocationByKeyRef.current[activeTabKey] = `${location.pathname}${location.search}`;
    }
  }, [activeTabKey, location.pathname, location.search]);

  useEffect(() => {
    const row = navButtonsRowRef.current;
    if (!row) return;

    const updateCompactState = () => {
      const buttonCount = primaryToolbarButtons.length + 1;
      const spacingPx = 8;
      const totalSpacing = spacingPx * Math.max(0, buttonCount - 1);
      const widthPerButton = (Math.max(0, row.clientWidth) - totalSpacing) / buttonCount;
      setCompactNavButtons(widthPerButton < 110);
    };

    updateCompactState();
    const observer = new ResizeObserver(updateCompactState);
    observer.observe(row);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const normalizedPath = normalizeRoutePath(location.pathname);
    const metaPath = resolveTabMetaPath(normalizedPath);
    if (metaPath === '/admin/home') {
      setActiveTabKey(HOME_TAB_KEY);
      return;
    }

    // Ne pas créer d'onglet pour les routes d'entité sans ID (qui se redirigeront)
    // Vérifier si le path est exactement un basePath d'entité sans ID après
    const isEntityListPath = PICKER_ENTITY_DEFINITIONS.some(
      (entity) => normalizedPath === entity.basePath
    );
    if (isEntityListPath) {
      // Cette route sera redirigée, ne pas créer d'onglet
      return;
    }

    setTabs((prev) => {
      const currentTab = prev.find((tab) => tab.path === normalizedPath);
      if (currentTab) {
        setActiveTabKey(currentTab.key);
        return prev;
      }

      const label = TAB_META[metaPath]?.label;
      if (!label) {
        setActiveTabKey(false);
        return prev;
      }
      tabCounterRef.current += 1;
      const key = `tab-${normalizedPath}-${tabCounterRef.current}`;
      setActiveTabKey(key);
      return [...prev, { key, label, path: normalizedPath, closable: true }];
    });
  }, [location.pathname]);

  const openTab = (path: string, label?: string, options?: OpenTabOptions) => {
    const requestedPath = normalizeRoutePath(path);
    // Une query string (ex: selection de stat) cible un onglet existant sans creer de doublon.
    const [normalizedPath, query] = requestedPath.split('?');
    const metaPath = resolveTabMetaPath(normalizedPath);
    const resolvedLabel = label ?? TAB_META[metaPath]?.label;
    if (!resolvedLabel) {
      navigate(requestedPath);
      return;
    }

    if (metaPath === '/admin/home') {
      setActiveTabKey(HOME_TAB_KEY);
      navigate('/admin/home');
      return;
    }

    const existing = options?.unique
      ? (options.uniqueByPath
        ? tabs.find((tab) => tab.path === normalizedPath)
        : tabs.find((tab) => tab.path === normalizedPath && tab.label === resolvedLabel))
      : undefined;

    if (existing) {
      setActiveTabKey(existing.key);
      // Restaure la derniere sous-navigation (query string) visitee dans cet onglet.
      navigate(query ? requestedPath : (tabLocationByKeyRef.current[existing.key] ?? normalizedPath));
      return;
    }

    tabCounterRef.current += 1;
    const key = `tab-${normalizedPath}-${tabCounterRef.current}`;
    setActiveTabKey(key);
    setTabs((prev) => [...prev, { key, label: resolvedLabel, path: normalizedPath, closable: true }]);
    navigate(requestedPath);
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<TabOpenEventDetail>;
      const path = customEvent.detail?.path;
      if (!path) {
        return;
      }

      openTab(path, customEvent.detail?.label, {
        unique: customEvent.detail?.unique ?? true,
        uniqueByPath: customEvent.detail?.uniqueByPath ?? true,
      });
    };

    window.addEventListener('supporter:tab-open', handler);
    return () => window.removeEventListener('supporter:tab-open', handler);
  }, [openTab]);

  const doCloseTab = (tabKey: string) => {
    const tab = tabs.find((item) => item.key === tabKey);
    if (!tab) return;

    const currentIndex = tabs.findIndex((item) => item.key === tabKey);
    const fallbackTab = tabs[currentIndex - 1] ?? tabs[currentIndex + 1] ?? tabs.find((item) => item.key === HOME_TAB_KEY);

    setTabs((prev) => prev.filter((item) => item.key !== tabKey));
    setDirtyTabsByPath((prev) => {
      const next = { ...prev };
      delete next[tab.path];
      return next;
    });
    setItalicTabsByPath((prev) => {
      const next = { ...prev };
      delete next[tab.path];
      return next;
    });

    if (activeTabKey === tabKey) {
      if (fallbackTab) {
        setActiveTabKey(fallbackTab.key);
        navigate(fallbackTab.path);
      } else {
        setActiveTabKey(false);
      }
    }
  };

  const closeTab = (tabKey: string) => {
    const tab = tabs.find((item) => item.key === tabKey);
    if (!tab || !tab.closable) return;
    if (dirtyTabsByPath[tab.path]) {
      setCloseConfirmTabKey(tabKey);
      return;
    }
    doCloseTab(tabKey);
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ path?: string; dirty?: boolean }>;
      const path = customEvent.detail?.path;
      const dirty = customEvent.detail?.dirty;
      if (!path || typeof dirty !== 'boolean') return;
      const normalizedPath = normalizeRoutePath(path);
      setDirtyTabsByPath((prev) => {
        if (prev[normalizedPath] === dirty) return prev;
        return { ...prev, [normalizedPath]: dirty };
      });
    };

    window.addEventListener('supporter:tab-dirty', handler);
    return () => window.removeEventListener('supporter:tab-dirty', handler);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ path?: string; label?: string }>;
      const path = customEvent.detail?.path;
      const label = customEvent.detail?.label;
      if (!path || !label) return;
      const normalizedPath = normalizeRoutePath(path);
      setTabs((prev) => prev.map((tab) => (tab.path === normalizedPath ? { ...tab, label } : tab)));
      setRecentOpenedRecords((prev) => renameRecentOpenedRecord(prev, normalizedPath, label));
    };

    window.addEventListener('supporter:tab-label', handler);
    return () => window.removeEventListener('supporter:tab-label', handler);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ path?: string; italic?: boolean }>;
      const path = customEvent.detail?.path;
      const italic = customEvent.detail?.italic;
      if (!path || typeof italic !== 'boolean') return;
      const normalizedPath = normalizeRoutePath(path);
      setItalicTabsByPath((prev) => {
        if (Boolean(prev[normalizedPath]) === italic) {
          return prev;
        }
        return { ...prev, [normalizedPath]: italic };
      });
    };

    window.addEventListener('supporter:tab-label-style', handler);
    return () => window.removeEventListener('supporter:tab-label-style', handler);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ path?: string }>;
      const path = customEvent.detail?.path;
      if (!path || !closeConfirmTabKey) return;
      const confirmTab = tabs.find((item) => item.key === closeConfirmTabKey);
      if (!confirmTab || normalizeRoutePath(confirmTab.path) !== normalizeRoutePath(path)) return;
      setSavingBeforeClose(false);
      setCloseConfirmTabKey(null);
      doCloseTab(closeConfirmTabKey);
    };

    window.addEventListener('supporter:tab-save-done', handler);
    return () => window.removeEventListener('supporter:tab-save-done', handler);
  }, [closeConfirmTabKey, tabs]);

  const handleOpenPickerEntityInTab = (entityKey: PickerEntityKey) => ({ rowId, label }: PickerOpenPayload) => {
    const entity = pickerDefinitionByKey.get(entityKey);
    if (!entity) return;
    setPickerModal(null);
    openTab(`${entity.basePath}/${encodeURIComponent(String(rowId))}`, label, { unique: true, uniqueByPath: true });
  };

  const activePickerEntity = pickerModal ? pickerDefinitionByKey.get(pickerModal) ?? null : null;
  const homeOutletContext: HomePageOutletContext = {
    recentOpenedRecords,
    reopenRecentRecord: (record) => {
      openTab(record.path, record.label, { unique: true, uniqueByPath: true });
    },
  };

  useEffect(() => {
    const toolbar = topToolbarRef.current;
    const brand = topBrandRef.current;
    const actionsMeasure = topActionsMeasureRef.current;
    if (!toolbar || !brand || !actionsMeasure) return;

    const updateCompactState = () => {
      const availableWidth = Math.max(0, toolbar.clientWidth - brand.clientWidth - 24);
      const requiredWidth = actionsMeasure.scrollWidth;
      setCompactTopActions(availableWidth < requiredWidth);
    };

    updateCompactState();
    const observer = new ResizeObserver(updateCompactState);
    observer.observe(toolbar);
    observer.observe(brand);
    observer.observe(actionsMeasure);

    return () => observer.disconnect();
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar + 2,
          boxShadow: '0 1px 0 rgba(15, 23, 42, 0.08)',
        }}
      >
        <AppBar position="static" color="inherit" elevation={1}>
          <Toolbar ref={topToolbarRef} sx={{ justifyContent: 'space-between', position: 'relative' }}>
            <Box ref={topBrandRef} sx={{ display: 'flex', gap: 1.25, alignItems: 'center' }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  minWidth: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {monacoLogo.src ? (
                  <Box
                    component="img"
                    src={monacoLogo.src}
                    alt="AS Monaco"
                    sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <ShieldRoundedIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
                )}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
                Supporter
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                {'v' + __APP_VERSION__}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Tooltip title="Configuration" disableHoverListener={!compactTopActions}>
                <Button
                  variant={isConfigurationActive ? 'contained' : 'outlined'}
                  color={isConfigurationActive ? 'primary' : 'inherit'}
                  startIcon={compactTopActions ? undefined : <SettingsRoundedIcon />}
                  sx={{
                    minWidth: 40,
                    px: compactTopActions ? 1 : 1.5,
                    color: isConfigurationActive ? undefined : 'text.primary',
                    borderColor: isConfigurationActive ? undefined : 'divider',
                    '.MuiButton-startIcon': { mr: compactTopActions ? 0 : 1 },
                  }}
                  aria-label="Configuration"
                  onClick={() => openTab('/configuration', 'Configuration', { unique: true, uniqueByPath: true })}
                >
                  {compactTopActions ? <SettingsRoundedIcon /> : 'Configuration'}
                </Button>
              </Tooltip>

              <Tooltip title="Refresh" disableHoverListener={!compactTopActions}>
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={compactTopActions ? undefined : <RefreshRoundedIcon />}
                  sx={{
                    minWidth: 40,
                    px: compactTopActions ? 1 : 1.5,
                    color: 'text.primary',
                    borderColor: 'divider',
                    '.MuiButton-startIcon': { mr: compactTopActions ? 0 : 1 },
                  }}
                  aria-label="Refresh"
                  onClick={() => {
                    window.location.reload();
                  }}
                >
                  {compactTopActions ? <RefreshRoundedIcon /> : 'Refresh'}
                </Button>
              </Tooltip>

              <Tooltip title="Deconnexion" disableHoverListener={!compactTopActions}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={compactTopActions ? undefined : <LogoutRoundedIcon />}
                  sx={{
                    minWidth: 40,
                    px: compactTopActions ? 1 : 1.5,
                    '.MuiButton-startIcon': { mr: compactTopActions ? 0 : 1 },
                  }}
                  aria-label="Deconnexion"
                  onClick={() => {
                    logout();
                    window.location.assign('/');
                  }}
                >
                  {compactTopActions ? <LogoutRoundedIcon /> : 'Deconnexion'}
                </Button>
              </Tooltip>
            </Box>

            <Box
              ref={topActionsMeasureRef}
              sx={{
                position: 'absolute',
                visibility: 'hidden',
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                height: 0,
                overflow: 'hidden',
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button variant={isConfigurationActive ? 'contained' : 'outlined'} color={isConfigurationActive ? 'primary' : 'inherit'} startIcon={<SettingsRoundedIcon />} sx={{ minWidth: 40, px: 1.5, '.MuiButton-startIcon': { mr: 1 } }}>
                  Configuration
                </Button>
                <Button variant="outlined" color="inherit" startIcon={<RefreshRoundedIcon />} sx={{ minWidth: 40, px: 1.5, '.MuiButton-startIcon': { mr: 1 } }}>
                  Refresh
                </Button>
                <Button variant="contained" color="primary" startIcon={<LogoutRoundedIcon />} sx={{ minWidth: 40, px: 1.5, '.MuiButton-startIcon': { mr: 1 } }}>
                  Deconnexion
                </Button>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>

        <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Toolbar
            sx={{
              gap: 1,
              py: 1,
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            }}
          >
          <Box ref={navButtonsRowRef} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
            {primaryToolbarButtons.map((button) => {
              const active = isToolbarButtonActive(button);
              return (
                <Tooltip key={button.label} title={button.label} disableHoverListener={!compactNavButtons}>
                  <Button
                    size="small"
                    variant={active ? 'contained' : 'outlined'}
                    color={active ? 'primary' : 'inherit'}
                    startIcon={compactNavButtons ? undefined : button.icon}
                    sx={{
                      minWidth: 36,
                      px: compactNavButtons ? 1 : 1.25,
                      '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                    }}
                    aria-label={button.ariaLabel}
                    onClick={() => handleToolbarButtonClick(button)}
                  >
                    {compactNavButtons ? button.icon : button.label}
                  </Button>
                </Tooltip>
              );
            })}

            <Tooltip title="Outils" disableHoverListener={!compactNavButtons}>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                startIcon={compactNavButtons ? undefined : <BuildRoundedIcon />}
                sx={{
                  minWidth: 36,
                  px: compactNavButtons ? 1 : 1.25,
                  '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                }}
                aria-label="Outils"
                aria-haspopup="menu"
                aria-expanded={Boolean(toolsMenuAnchorEl) ? 'true' : undefined}
                onClick={(event) => setToolsMenuAnchorEl(event.currentTarget)}
              >
                {compactNavButtons ? <BuildRoundedIcon /> : 'Outils'}
              </Button>
            </Tooltip>

            <Menu
              anchorEl={toolsMenuAnchorEl}
              open={Boolean(toolsMenuAnchorEl)}
              onClose={() => setToolsMenuAnchorEl(null)}
              slotProps={{ list: { 'aria-label': 'Outils' } }}
            >
              {TOOLBAR_TOOLS_GROUPS.map((group, groupIndex) => (
                <Fragment key={group.label}>
                  {groupIndex > 0 && <Divider />}
                  <MenuItem disabled sx={{ opacity: 1, fontWeight: 700 }}>
                    {group.label}
                  </MenuItem>
                  {group.items.map((item) => (
                    <MenuItem
                      key={item.label}
                      disabled={item.disabled}
                      onClick={() => {
                        setToolsMenuAnchorEl(null);
                        handleToolsMenuAction(item.action);
                      }}
                    >
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText>{item.label}</ListItemText>
                    </MenuItem>
                  ))}
                </Fragment>
              ))}
              {secondaryToolbarButtons.length > 0 && <Divider />}
              {TOOLBAR_SECONDARY_CATEGORIES.map((category, categoryIndex) => {
                const categoryButtons = secondaryToolbarButtons.filter(
                  (button) => button.secondaryCategory === category,
                );
                if (categoryButtons.length === 0) return null;

                return (
                  <Fragment key={category}>
                    {categoryIndex > 0 && <Divider />}
                    <MenuItem disabled sx={{ opacity: 1, fontWeight: 700 }}>
                      {category}
                    </MenuItem>
                    {categoryButtons.map((button) => (
                      <MenuItem
                        key={button.label}
                        selected={isToolbarButtonActive(button)}
                        onClick={() => {
                          setToolsMenuAnchorEl(null);
                          handleToolbarButtonClick(button);
                        }}
                      >
                        <ListItemIcon>{button.icon}</ListItemIcon>
                        <ListItemText>{button.label}</ListItemText>
                      </MenuItem>
                    ))}
                  </Fragment>
                );
              })}
            </Menu>

          </Box>

          </Toolbar>
        </Box>

        <Box sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', px: 1.5 }}>
          <Tabs
            value={activeTabKey}
            variant="scrollable"
            scrollButtons="auto"
            onChange={(_event, newValue: string) => {
              const tab = tabs.find((item) => item.key === newValue);
              if (!tab) return;
              setActiveTabKey(tab.key);
              navigate(tabLocationByKeyRef.current[tab.key] ?? tab.path);
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.key}
                value={tab.key}
                label={(
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                      {TAB_META[resolveTabMetaPath(tab.path)]?.icon ?? null}
                    </Box>
                    <span style={{ fontStyle: italicTabsByPath[normalizeRoutePath(tab.path)] ? 'italic' : 'normal' }}>{tab.label}</span>
                    {dirtyTabsByPath[normalizeRoutePath(tab.path)] ? (
                      <Box
                        component="span"
                        aria-label="Modifications non enregistrees"
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          bgcolor: 'warning.main',
                          display: 'inline-block',
                          ml: 0.25,
                        }}
                      />
                    ) : null}
                    {tab.closable ? (
                      <IconButton
                        size="small"
                        aria-label={`Fermer ${tab.label}`}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          closeTab(tab.key);
                        }}
                        sx={{ p: 0.1 }}
                      >
                        <CloseRoundedIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    ) : null}
                  </Box>
                )}
              />
            ))}
          </Tabs>
        </Box>
      </Box>

      <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
        <Suspense fallback={null}>
          {tabs
            .filter((tab) => tab.path.startsWith('/admin/rencontres/'))
            .map((tab) => {
              const encodedId = tab.path.slice('/admin/rencontres/'.length);
              if (!encodedId) return null;
              const decodedId = decodeRouteSegment(encodedId);
              return (
                <RencontreTabFormPane
                  key={tab.key}
                  tabPath={tab.path}
                  rencontreId={decodedId}
                  active={activeTabKey === tab.key}
                />
              );
            })}
          {PICKER_ENTITY_DEFINITIONS.flatMap((entity) => tabs
            .filter((tab) => tab.path.startsWith(`${entity.basePath}/`))
            .map((tab) => {
              const encodedId = tab.path.slice(`${entity.basePath}/`.length);
              if (!encodedId) return null;
              const decodedId = decodeRouteSegment(encodedId);
              return entity.renderTabPane({ tab, decodedId, active: activeTabKey === tab.key });
            }))}
          {!activeTabIsDynamicForm ? <Outlet context={homeOutletContext} /> : null}
        </Suspense>
      </Box>

      <Dialog
        open={activePickerEntity !== null && activePickerEntity.key !== 'terrain'}
        onClose={() => setPickerModal(null)}
        fullWidth
        maxWidth="xl"
        slotProps={{
          paper: {
            sx: {
              height: 'min(90vh, 980px)',
            },
          },
        }}
      >
        {activePickerEntity ? (
          <>
            <DialogTitle sx={{ pr: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                  {activePickerEntity.titleIcon}
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>{activePickerEntity.modalTitle}</Typography>
                </Box>
                <IconButton aria-label={activePickerEntity.closeAriaLabel} onClick={() => setPickerModal(null)}>
                  <CloseRoundedIcon />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent dividers sx={{ p: 2, bgcolor: 'background.default', overflow: 'hidden', display: 'flex', minHeight: 0, minWidth: 0 }}>
              <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', '& > *': { flex: 1, minHeight: 0, minWidth: 0 } }}>
                <Suspense fallback={null}>
                  {activePickerEntity.renderPage(handleOpenPickerEntityInTab(activePickerEntity.key))}
                </Suspense>
              </Box>
            </DialogContent>
          </>
        ) : null}
      </Dialog>

      {activePickerEntity?.key === 'terrain' ? (
        <Suspense fallback={null}>
          <TerrainPickerDialog
            open
            onClose={() => setPickerModal(null)}
            onSelect={handleOpenPickerEntityInTab('terrain')}
          />
        </Suspense>
      ) : null}

      {rencontreWizardOpen ? (
        <Suspense fallback={null}>
          <RencontreCreateWizardDialog
            open
            onClose={() => setRencontreWizardOpen(false)}
            onCreated={async (createdId, label) => {
              openTab(`/admin/rencontres/${encodeURIComponent(String(createdId))}`, label || 'Rencontre', { unique: true, uniqueByPath: true });
            }}
          />
        </Suspense>
      ) : null}

      {clubMergeOpen ? (
        <Suspense fallback={null}>
          <ClubMergeDialog open onClose={() => setClubMergeOpen(false)} />
        </Suspense>
      ) : null}

      {statsRecomputeOpen ? (
        <Suspense fallback={null}>
          <StatsRecomputeDialog open onClose={() => setStatsRecomputeOpen(false)} />
        </Suspense>
      ) : null}

      {rencontreImportOpen ? (
        <Suspense fallback={null}>
          <RencontreImportWizardDialog
            open
            onClose={() => setRencontreImportOpen(false)}
            onReady={() => openTab('/admin/import-rencontres', 'Import de rencontres', { unique: true, uniqueByPath: true })}
          />
        </Suspense>
      ) : null}

      <Dialog
        open={Boolean(closeConfirmTabKey)}
        onClose={() => { if (!savingBeforeClose) setCloseConfirmTabKey(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Modifications non enregistrees</DialogTitle>
        <DialogContent>
          Voulez-vous enregistrer les modifications avant de fermer cet onglet ?
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setCloseConfirmTabKey(null)}
            disabled={savingBeforeClose}
            color="inherit"
          >
            Annuler
          </Button>
          <Button
            onClick={() => {
              if (!closeConfirmTabKey) return;
              doCloseTab(closeConfirmTabKey);
              setCloseConfirmTabKey(null);
            }}
            disabled={savingBeforeClose}
            color="error"
          >
            Fermer sans enregistrer
          </Button>
          <Button
            variant="contained"
            disabled={savingBeforeClose}
            onClick={() => {
              const confirmTab = tabs.find((item) => item.key === closeConfirmTabKey);
              if (!confirmTab) return;
              setSavingBeforeClose(true);
              emitTabSaveRequest(confirmTab.path);
            }}
          >
            {savingBeforeClose ? 'Enregistrement...' : 'Enregistrer et fermer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
