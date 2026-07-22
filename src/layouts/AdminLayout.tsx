import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import EuroRoundedIcon from '@mui/icons-material/EuroRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import StadiumRoundedIcon from '@mui/icons-material/StadiumRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import SportsIcon from '@mui/icons-material/Sports';
import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Tab,
  Tabs,
  Tooltip,
  Toolbar,
  Typography,
} from '@mui/material';
import type { GridRowId } from '@mui/x-data-grid';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authStore } from '../features/auth/authStore';
import { NatioPage } from '../features/natio/NatioPage';
import { NatioTabFormPane } from '../features/natio/NatioTabFormPane';
import { VillePage } from '../features/ville/VillePage';
import { VilleTabFormPane } from '../features/ville/VilleTabFormPane';
import { TerrainPage } from '../features/terrain/TerrainPage';
import { TerrainTabFormPane } from '../features/terrain/TerrainTabFormPane';
import { DevisePage } from '../features/devise/DevisePage';
import { DeviseTabFormPane } from '../features/devise/DeviseTabFormPane';
import { CircPage } from '../features/circ/CircPage';
import { CircTabFormPane } from '../features/circ/CircTabFormPane';
import { ClubPage } from '../features/club/ClubPage';
import { ClubTabFormPane } from '../features/club/ClubTabFormPane';
import { ArbitrePage } from '../features/arbitre/ArbitrePage';
import { ArbitreTabFormPane } from '../features/arbitre/ArbitreTabFormPane';
import { EpreuvePage } from '../features/epreuve/EpreuvePage';
import { EpreuveTabFormPane } from '../features/epreuve/EpreuveTabFormPane';
import { JoueurPage } from '../features/joueur/JoueurPage';
import { JoueurTabFormPane } from '../features/joueur/JoueurTabFormPane';

const QUICK_ACTIONS = [
  { label: 'Joueurs', icon: <PeopleRoundedIcon />, path: '/joueurs' },
  { label: 'Statistiques', icon: <BarChartRoundedIcon /> },
  { label: 'Clubs', icon: <ShieldRoundedIcon />, path: '/clubs' },
  { label: 'Matchs', icon: <SportsSoccerRoundedIcon /> },
];

interface NavTab {
  key: string;
  label: string;
  path: string;
  closable: boolean;
}

interface OpenTabOptions {
  unique?: boolean;
  uniqueByPath?: boolean;
}

interface TabMeta {
  label: string;
  icon: ReactNode;
}

const TAB_META: Record<string, TabMeta> = {
  '/admin/home': { label: 'Accueil', icon: <HomeRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/natio': { label: 'Pays', icon: <FlagRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/ville': { label: 'Villes', icon: <LocationCityRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/arbitre': { label: 'Arbitres', icon: <SportsIcon sx={{ fontSize: 14 }} /> },
  '/admin/terrain': { label: 'Stades', icon: <StadiumRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/devise': { label: 'Devises', icon: <EuroRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/circ': { label: 'Circonstances', icon: <EventNoteRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/epreuve': { label: 'Épreuves', icon: <EmojiEventsRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/calendrier': { label: 'Calendrier', icon: <CalendarMonthIcon sx={{ fontSize: 14 }} /> },
  '/admin/joueurs': { label: 'Joueurs', icon: <PeopleRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/clubs': { label: 'Clubs', icon: <ShieldRoundedIcon sx={{ fontSize: 14 }} /> },
};

const HOME_TAB_KEY = 'tab-home';

function normalizeRoutePath(path: string): string {
  const trimmedPath = path.trim();
  const normalized = trimmedPath.toLowerCase();
  switch (normalized) {
    case '/accueil':
      return '/admin/home';
    case '/natio':
      return '/admin/natio';
    case '/ville':
      return '/admin/ville';
    case '/arbitre':
      return '/admin/arbitre';
    case '/terrain':
      return '/admin/terrain';
    case '/devise':
      return '/admin/devise';
    case '/circ':
      return '/admin/circ';
    case '/epreuve':
      return '/admin/epreuve';
    case '/calendrier':
      return '/admin/calendrier';
    case '/joueurs':
      return '/admin/joueurs';
    case '/clubs':
      return '/admin/clubs';
    default:
      // Keep original case for dynamic segments like /admin/natio/FRA.
      return trimmedPath;
  }
}

function resolveTabMetaPath(path: string): string {
  const normalized = normalizeRoutePath(path);
  if (normalized.startsWith('/admin/arbitre/')) return '/admin/arbitre';
  if (normalized.startsWith('/admin/epreuve/')) return '/admin/epreuve';
  if (normalized.startsWith('/admin/joueurs/')) return '/admin/joueurs';
  if (normalized.startsWith('/admin/clubs/')) return '/admin/clubs';
  if (normalized.startsWith('/admin/natio/')) return '/admin/natio';
  if (normalized.startsWith('/admin/ville/')) return '/admin/ville';
  if (normalized.startsWith('/admin/terrain/')) return '/admin/terrain';
  if (normalized.startsWith('/admin/devise/')) return '/admin/devise';
  if (normalized.startsWith('/admin/circ/')) return '/admin/circ';
  return normalized;
}

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = authStore((s) => s.logout);
  const navButtonsRowRef = useRef<HTMLDivElement | null>(null);
  const searchAreaRef = useRef<HTMLDivElement | null>(null);
  const [compactNavButtons, setCompactNavButtons] = useState(false);
  const [compactSearchAction, setCompactSearchAction] = useState(false);
  const [natioModalOpen, setNatioModalOpen] = useState(false);
  const [villeModalOpen, setVilleModalOpen] = useState(false);
  const [terrainModalOpen, setTerrainModalOpen] = useState(false);
  const [deviseModalOpen, setDeviseModalOpen] = useState(false);
  const [circModalOpen, setCircModalOpen] = useState(false);
  const [clubModalOpen, setClubModalOpen] = useState(false);
  const [arbitreModalOpen, setArbitreModalOpen] = useState(false);
  const [epreuveModalOpen, setEpreuveModalOpen] = useState(false);
  const [joueurModalOpen, setJoueurModalOpen] = useState(false);
  const [dirtyTabsByPath, setDirtyTabsByPath] = useState<Record<string, boolean>>({});
  const tabCounterRef = useRef(0);
  const [tabs, setTabs] = useState<NavTab[]>([
    {
      key: HOME_TAB_KEY,
      label: TAB_META['/admin/home'].label,
      path: '/admin/home',
      closable: false,
    },
  ]);
  const [activeTabKey, setActiveTabKey] = useState<string | false>(HOME_TAB_KEY);
  const isHomeActive = location.pathname === '/admin/home' || location.pathname === '/accueil';
  const isCalendrierActive = location.pathname === '/admin/calendrier' || location.pathname === '/calendrier';
  const isJoueursActive = location.pathname === '/admin/joueurs' || location.pathname === '/joueurs' || location.pathname.startsWith('/admin/joueurs/');
  const isClubsActive = location.pathname === '/admin/clubs' || location.pathname === '/clubs' || location.pathname.startsWith('/admin/clubs/');
  const isNatioActive = location.pathname === '/admin/natio' || location.pathname === '/natio' || location.pathname.startsWith('/admin/natio/');
  const isVilleActive = location.pathname === '/admin/ville' || location.pathname === '/ville' || location.pathname.startsWith('/admin/ville/');
  const isArbitreActive = location.pathname === '/admin/arbitre' || location.pathname === '/arbitre' || location.pathname.startsWith('/admin/arbitre/');
  const isTerrainActive = location.pathname === '/admin/terrain' || location.pathname === '/terrain' || location.pathname.startsWith('/admin/terrain/');
  const isDeviseActive = location.pathname === '/admin/devise' || location.pathname === '/devise' || location.pathname.startsWith('/admin/devise/');
  const isCircActive = location.pathname === '/admin/circ' || location.pathname === '/circ' || location.pathname.startsWith('/admin/circ/');
  const isEpreuveActive = location.pathname === '/admin/epreuve' || location.pathname === '/epreuve' || location.pathname.startsWith('/admin/epreuve/');
  const activeTab = typeof activeTabKey === 'string' ? tabs.find((tab) => tab.key === activeTabKey) : undefined;
  const activeTabIsNatioForm = Boolean(activeTab?.path.startsWith('/admin/natio/')) || location.pathname.startsWith('/admin/natio/');
  const activeTabIsVilleForm = Boolean(activeTab?.path.startsWith('/admin/ville/')) || location.pathname.startsWith('/admin/ville/');
  const activeTabIsTerrainForm = Boolean(activeTab?.path.startsWith('/admin/terrain/')) || location.pathname.startsWith('/admin/terrain/');
  const activeTabIsDeviseForm = Boolean(activeTab?.path.startsWith('/admin/devise/')) || location.pathname.startsWith('/admin/devise/');
  const activeTabIsCircForm = Boolean(activeTab?.path.startsWith('/admin/circ/')) || location.pathname.startsWith('/admin/circ/');
  const activeTabIsClubForm = Boolean(activeTab?.path.startsWith('/admin/clubs/')) || location.pathname.startsWith('/admin/clubs/');
  const activeTabIsArbitreForm = Boolean(activeTab?.path.startsWith('/admin/arbitre/')) || location.pathname.startsWith('/admin/arbitre/');
  const activeTabIsEpreuveForm = Boolean(activeTab?.path.startsWith('/admin/epreuve/')) || location.pathname.startsWith('/admin/epreuve/');
  const activeTabIsJoueurForm = Boolean(activeTab?.path.startsWith('/admin/joueurs/')) || location.pathname.startsWith('/admin/joueurs/');
  const arbitreFormTabs = tabs.filter((tab) => tab.path.startsWith('/admin/arbitre/'));
  const epreuveFormTabs = tabs.filter((tab) => tab.path.startsWith('/admin/epreuve/'));
  const joueurFormTabs = tabs.filter((tab) => tab.path.startsWith('/admin/joueurs/'));
  const clubFormTabs = tabs.filter((tab) => tab.path.startsWith('/admin/clubs/'));
  const natioFormTabs = tabs.filter((tab) => tab.path.startsWith('/admin/natio/'));
  const villeFormTabs = tabs.filter((tab) => tab.path.startsWith('/admin/ville/'));
  const terrainFormTabs = tabs.filter((tab) => tab.path.startsWith('/admin/terrain/'));
  const deviseFormTabs = tabs.filter((tab) => tab.path.startsWith('/admin/devise/'));
  const circFormTabs = tabs.filter((tab) => tab.path.startsWith('/admin/circ/'));

  useEffect(() => {
    const row = navButtonsRowRef.current;
    if (!row) return;

    const updateCompactState = () => {
      const buttonCount = 8 + QUICK_ACTIONS.length;
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
    const normalizedPath = normalizeRoutePath(path);
    const metaPath = resolveTabMetaPath(normalizedPath);
    const resolvedLabel = label ?? TAB_META[metaPath]?.label;
    if (!resolvedLabel) {
      navigate(normalizedPath);
      return;
    }

    if (metaPath === '/admin/home') {
      setActiveTabKey(HOME_TAB_KEY);
      navigate('/admin/home');
      return;
    }

    setTabs((prev) => {
      if (options?.unique) {
        const existing = options.uniqueByPath
          ? prev.find((tab) => tab.path === normalizedPath)
          : prev.find((tab) => tab.path === normalizedPath && tab.label === resolvedLabel);
        if (existing) {
          setActiveTabKey(existing.key);
          return prev;
        }
      }

      tabCounterRef.current += 1;
      const key = `tab-${normalizedPath}-${tabCounterRef.current}`;
      setActiveTabKey(key);
      return [...prev, { key, label: resolvedLabel, path: normalizedPath, closable: true }];
    });
    navigate(normalizedPath);
  };

  const closeTab = (tabKey: string) => {
    const tab = tabs.find((item) => item.key === tabKey);
    if (!tab || !tab.closable) {
      return;
    }

    const currentIndex = tabs.findIndex((item) => item.key === tabKey);
    const fallbackTab = tabs[currentIndex - 1] ?? tabs[currentIndex + 1] ?? tabs.find((item) => item.key === HOME_TAB_KEY);

    setTabs((prev) => prev.filter((item) => item.key !== tabKey));
    setDirtyTabsByPath((prev) => {
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
    };

    window.addEventListener('supporter:tab-label', handler);
    return () => window.removeEventListener('supporter:tab-label', handler);
  }, []);

  const handleOpenNatioInTab = ({ rowId, label }: { rowId: GridRowId; label: string }) => {
    setNatioModalOpen(false);
    openTab(`/admin/natio/${encodeURIComponent(String(rowId))}`, label, { unique: true, uniqueByPath: true });
  };

  const handleOpenVilleInTab = ({ rowId, label }: { rowId: GridRowId; label: string }) => {
    setVilleModalOpen(false);
    openTab(`/admin/ville/${encodeURIComponent(String(rowId))}`, label, { unique: true, uniqueByPath: true });
  };

  const handleOpenTerrainInTab = ({ rowId, label }: { rowId: GridRowId; label: string }) => {
    setTerrainModalOpen(false);
    openTab(`/admin/terrain/${encodeURIComponent(String(rowId))}`, label, { unique: true, uniqueByPath: true });
  };

  const handleOpenDeviseInTab = ({ rowId, label }: { rowId: GridRowId; label: string }) => {
    setDeviseModalOpen(false);
    openTab(`/admin/devise/${encodeURIComponent(String(rowId))}`, label, { unique: true, uniqueByPath: true });
  };

  const handleOpenCircInTab = ({ rowId, label }: { rowId: GridRowId; label: string }) => {
    setCircModalOpen(false);
    openTab(`/admin/circ/${encodeURIComponent(String(rowId))}`, label, { unique: true, uniqueByPath: true });
  };

  const handleOpenClubInTab = ({ rowId, label }: { rowId: GridRowId; label: string }) => {
    setClubModalOpen(false);
    openTab(`/admin/clubs/${encodeURIComponent(String(rowId))}`, label, { unique: true, uniqueByPath: true });
  };

  const handleOpenArbitreInTab = ({ rowId, label }: { rowId: GridRowId; label: string }) => {
    setArbitreModalOpen(false);
    openTab(`/admin/arbitre/${encodeURIComponent(String(rowId))}`, label, { unique: true, uniqueByPath: true });
  };

  const handleOpenEpreuveInTab = ({ rowId, label }: { rowId: GridRowId; label: string }) => {
    setEpreuveModalOpen(false);
    openTab(`/admin/epreuve/${encodeURIComponent(String(rowId))}`, label, { unique: true, uniqueByPath: true });
  };

  const handleOpenJoueurInTab = ({ rowId, label }: { rowId: GridRowId; label: string }) => {
    setJoueurModalOpen(false);
    openTab(`/admin/joueurs/${encodeURIComponent(String(rowId))}`, label, { unique: true, uniqueByPath: true });
  };

  useEffect(() => {
    const area = searchAreaRef.current;
    if (!area) return;

    const updateCompactState = () => {
      // Keep the label only when the right search area has enough room.
      setCompactSearchAction(area.clientWidth < 440);
    };

    updateCompactState();
    const observer = new ResizeObserver(updateCompactState);
    observer.observe(area);

    return () => observer.disconnect();
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#eef2f6' }}>
      <AppBar position="static" color="inherit" elevation={1}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'baseline' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
              Supporter
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
              v5.0.0.0
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="outlined"
              color="inherit"
              startIcon={<SettingsRoundedIcon />}
              sx={{
                '.MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Configuration
              </Box>
            </Button>

            <Button
              variant="contained"
              color="primary"
              startIcon={<LogoutRoundedIcon />}
              sx={{
                minWidth: { xs: 40, sm: 'auto' },
                px: { xs: 1, sm: 1.5 },
                '.MuiButton-startIcon': { mr: { xs: 0, sm: 1 } },
              }}
              onClick={() => {
                logout();
                navigate('/login');
              }}
            >
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                Deconnexion
              </Box>
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#ffffff' }}>
        <Toolbar
          sx={{
            gap: 1,
            py: 1,
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <Box ref={navButtonsRowRef} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
            <Tooltip title="Accueil" disableHoverListener={!compactNavButtons}>
              <Button
                size="small"
                variant={isHomeActive ? 'contained' : 'outlined'}
                color={isHomeActive ? 'primary' : 'inherit'}
                startIcon={compactNavButtons ? undefined : <HomeRoundedIcon />}
                sx={{
                  minWidth: 36,
                  px: compactNavButtons ? 1 : 1.25,
                  '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                }}
                aria-label="Accueil"
                onClick={() => openTab('/accueil', 'Accueil', { unique: true })}
              >
                {compactNavButtons ? <HomeRoundedIcon /> : 'Accueil'}
              </Button>
            </Tooltip>

            <Tooltip title="Pays" disableHoverListener={!compactNavButtons}>
              <Button
                size="small"
                variant={isNatioActive ? 'contained' : 'outlined'}
                color={isNatioActive ? 'primary' : 'inherit'}
                startIcon={compactNavButtons ? undefined : <FlagRoundedIcon />}
                sx={{
                  minWidth: 36,
                  px: compactNavButtons ? 1 : 1.25,
                  '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                }}
                aria-label="Pays"
                onClick={() => setNatioModalOpen(true)}
              >
                {compactNavButtons ? <FlagRoundedIcon /> : 'Pays'}
              </Button>
            </Tooltip>

            <Tooltip title="Villes" disableHoverListener={!compactNavButtons}>
              <Button
                size="small"
                variant={isVilleActive ? 'contained' : 'outlined'}
                color={isVilleActive ? 'primary' : 'inherit'}
                startIcon={compactNavButtons ? undefined : <LocationCityRoundedIcon />}
                sx={{
                  minWidth: 36,
                  px: compactNavButtons ? 1 : 1.25,
                  '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                }}
                aria-label="Villes"
                onClick={() => setVilleModalOpen(true)}
              >
                {compactNavButtons ? <LocationCityRoundedIcon /> : 'Villes'}
              </Button>
            </Tooltip>

            <Tooltip title="Arbitres" disableHoverListener={!compactNavButtons}>
              <Button
                size="small"
                variant={isArbitreActive ? 'contained' : 'outlined'}
                color={isArbitreActive ? 'primary' : 'inherit'}
                startIcon={compactNavButtons ? undefined : <SportsIcon />}
                sx={{
                  minWidth: 36,
                  px: compactNavButtons ? 1 : 1.25,
                  '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                }}
                aria-label="Arbitres"
                onClick={() => setArbitreModalOpen(true)}
              >
                {compactNavButtons ? <SportsIcon /> : 'Arbitres'}
              </Button>
            </Tooltip>

            <Tooltip title="Stades" disableHoverListener={!compactNavButtons}>
              <Button
                size="small"
                variant={isTerrainActive ? 'contained' : 'outlined'}
                color={isTerrainActive ? 'primary' : 'inherit'}
                startIcon={compactNavButtons ? undefined : <StadiumRoundedIcon />}
                sx={{
                  minWidth: 36,
                  px: compactNavButtons ? 1 : 1.25,
                  '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                }}
                aria-label="Stades"
                onClick={() => setTerrainModalOpen(true)}
              >
                {compactNavButtons ? <StadiumRoundedIcon /> : 'Stades'}
              </Button>
            </Tooltip>

            <Tooltip title="Devises" disableHoverListener={!compactNavButtons}>
              <Button
                size="small"
                variant={isDeviseActive ? 'contained' : 'outlined'}
                color={isDeviseActive ? 'primary' : 'inherit'}
                startIcon={compactNavButtons ? undefined : <EuroRoundedIcon />}
                sx={{
                  minWidth: 36,
                  px: compactNavButtons ? 1 : 1.25,
                  '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                }}
                aria-label="Devises"
                onClick={() => setDeviseModalOpen(true)}
              >
                {compactNavButtons ? <EuroRoundedIcon /> : 'Devises'}
              </Button>
            </Tooltip>

            <Tooltip title="Circonstances" disableHoverListener={!compactNavButtons}>
              <Button
                size="small"
                variant={isCircActive ? 'contained' : 'outlined'}
                color={isCircActive ? 'primary' : 'inherit'}
                startIcon={compactNavButtons ? undefined : <EventNoteRoundedIcon />}
                sx={{
                  minWidth: 36,
                  px: compactNavButtons ? 1 : 1.25,
                  '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                }}
                aria-label="Circonstances"
                onClick={() => setCircModalOpen(true)}
              >
                {compactNavButtons ? <EventNoteRoundedIcon /> : 'Circonstances'}
              </Button>
            </Tooltip>

            <Tooltip title="Épreuves" disableHoverListener={!compactNavButtons}>
              <Button
                size="small"
                variant={isEpreuveActive ? 'contained' : 'outlined'}
                color={isEpreuveActive ? 'primary' : 'inherit'}
                startIcon={compactNavButtons ? undefined : <EmojiEventsRoundedIcon />}
                sx={{
                  minWidth: 36,
                  px: compactNavButtons ? 1 : 1.25,
                  '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                }}
                aria-label="Épreuves"
                onClick={() => setEpreuveModalOpen(true)}
              >
                {compactNavButtons ? <EmojiEventsRoundedIcon /> : 'Épreuves'}
              </Button>
            </Tooltip>

            <Tooltip title="Calendrier" disableHoverListener={!compactNavButtons}>
              <Button
                size="small"
                variant={isCalendrierActive ? 'contained' : 'outlined'}
                color={isCalendrierActive ? 'primary' : 'inherit'}
                startIcon={compactNavButtons ? undefined : <CalendarMonthIcon />}
                sx={{
                  minWidth: 36,
                  px: compactNavButtons ? 1 : 1.25,
                  '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                }}
                aria-label="Calendrier"
                onClick={() => openTab('/calendrier', 'Calendrier')}
              >
                {compactNavButtons ? <CalendarMonthIcon /> : 'Calendrier'}
              </Button>
            </Tooltip>

            {QUICK_ACTIONS.map((action) => (
              <Tooltip key={action.label} title={action.label} disableHoverListener={!compactNavButtons}>
                <Button
                  size="small"
                  variant={
                    (action.label === 'Joueurs' && isJoueursActive)
                    || (action.label === 'Clubs' && isClubsActive)
                      ? 'contained'
                      : 'outlined'
                  }
                  color={
                    (action.label === 'Joueurs' && isJoueursActive)
                    || (action.label === 'Clubs' && isClubsActive)
                      ? 'primary'
                      : 'inherit'
                  }
                  startIcon={compactNavButtons ? undefined : action.icon}
                  sx={{
                    minWidth: 36,
                    px: compactNavButtons ? 1 : 1.25,
                    '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                  }}
                  aria-label={action.label}
                  onClick={() => {
                    if (action.path) {
                      if (action.path === '/clubs') {
                        setClubModalOpen(true);
                      } else if (action.path === '/joueurs') {
                        setJoueurModalOpen(true);
                      } else {
                        openTab(action.path, action.label);
                      }
                    }
                  }}
                >
                  {compactNavButtons ? action.icon : action.label}
                </Button>
              </Tooltip>
            ))}
          </Box>

          <Box
            ref={searchAreaRef}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr auto', md: '1fr auto' },
              gap: 1,
              alignItems: 'center',
              width: { xs: '100%', md: 'auto' },
              minWidth: 0,
            }}
          >
            <OutlinedInput
              size="small"
              placeholder="Rechercher..."
              sx={{ minWidth: { xs: 0, sm: 260 }, width: '100%' }}
              startAdornment={
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              }
            />
            <Box sx={{ minWidth: 0 }}>
              <Tooltip title="Recherche" disableHoverListener={!compactSearchAction}>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={compactSearchAction ? undefined : <SearchRoundedIcon />}
                  aria-label="Recherche"
                  sx={{
                    minWidth: 36,
                    px: compactSearchAction ? 1 : 1.25,
                    '.MuiButton-startIcon': { mr: compactSearchAction ? 0 : 1 },
                  }}
                >
                  {compactSearchAction ? <SearchRoundedIcon /> : 'Recherche'}
                </Button>
              </Tooltip>
            </Box>
          </Box>
        </Toolbar>
      </Box>

      <Box sx={{ bgcolor: '#ffffff', borderBottom: '1px solid', borderColor: 'divider', px: 1.5 }}>
        <Tabs
          value={activeTabKey}
          variant="scrollable"
          scrollButtons="auto"
          onChange={(_event, newValue: string) => {
            const tab = tabs.find((item) => item.key === newValue);
            if (!tab) return;
            setActiveTabKey(tab.key);
            navigate(tab.path);
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
                  <span>{tab.label}</span>
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

      <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
        {arbitreFormTabs.map((tab) => {
          const encodedId = tab.path.slice('/admin/arbitre/'.length);
          if (!encodedId) return null;
          const decodedId = decodeURIComponent(encodedId);
          return (
            <ArbitreTabFormPane
              key={tab.key}
              tabPath={tab.path}
              arbitreId={decodedId}
              active={activeTabKey === tab.key}
            />
          );
        })}
        {epreuveFormTabs.map((tab) => {
          const encodedId = tab.path.slice('/admin/epreuve/'.length);
          if (!encodedId) return null;
          const decodedId = decodeURIComponent(encodedId);
          return (
            <EpreuveTabFormPane
              key={tab.key}
              tabPath={tab.path}
              epreuveId={decodedId}
              active={activeTabKey === tab.key}
            />
          );
        })}
        {joueurFormTabs.map((tab) => {
          const encodedId = tab.path.slice('/admin/joueurs/'.length);
          if (!encodedId) return null;
          const decodedId = decodeURIComponent(encodedId);
          return (
            <JoueurTabFormPane
              key={tab.key}
              tabPath={tab.path}
              joueurId={decodedId}
              active={activeTabKey === tab.key}
            />
          );
        })}
        {clubFormTabs.map((tab) => {
          const encodedId = tab.path.slice('/admin/clubs/'.length);
          if (!encodedId) return null;
          const decodedId = decodeURIComponent(encodedId);
          return (
            <ClubTabFormPane
              key={tab.key}
              tabPath={tab.path}
              clubId={decodedId}
              active={activeTabKey === tab.key}
            />
          );
        })}
        {natioFormTabs.map((tab) => {
          const encodedId = tab.path.slice('/admin/natio/'.length);
          if (!encodedId) return null;
          const decodedId = decodeURIComponent(encodedId);
          return (
            <NatioTabFormPane
              key={tab.key}
              tabPath={tab.path}
              natioId={decodedId}
              active={activeTabKey === tab.key}
            />
          );
        })}
        {villeFormTabs.map((tab) => {
          const encodedId = tab.path.slice('/admin/ville/'.length);
          if (!encodedId) return null;
          const decodedId = decodeURIComponent(encodedId);
          return (
            <VilleTabFormPane
              key={tab.key}
              tabPath={tab.path}
              villeId={decodedId}
              active={activeTabKey === tab.key}
            />
          );
        })}
        {terrainFormTabs.map((tab) => {
          const encodedId = tab.path.slice('/admin/terrain/'.length);
          if (!encodedId) return null;
          const decodedId = decodeURIComponent(encodedId);
          return (
            <TerrainTabFormPane
              key={tab.key}
              tabPath={tab.path}
              terrainId={decodedId}
              active={activeTabKey === tab.key}
            />
          );
        })}
        {deviseFormTabs.map((tab) => {
          const encodedId = tab.path.slice('/admin/devise/'.length);
          if (!encodedId) return null;
          const decodedId = decodeURIComponent(encodedId);
          return (
            <DeviseTabFormPane
              key={tab.key}
              tabPath={tab.path}
              deviseId={decodedId}
              active={activeTabKey === tab.key}
            />
          );
        })}
        {circFormTabs.map((tab) => {
          const encodedId = tab.path.slice('/admin/circ/'.length);
          if (!encodedId) return null;
          const decodedId = decodeURIComponent(encodedId);
          return (
            <CircTabFormPane
              key={tab.key}
              tabPath={tab.path}
              circId={decodedId}
              active={activeTabKey === tab.key}
            />
          );
        })}
        {!(
          activeTabIsNatioForm
          || activeTabIsClubForm
          || activeTabIsArbitreForm
          || activeTabIsEpreuveForm
          || activeTabIsJoueurForm
          || activeTabIsVilleForm
          || activeTabIsTerrainForm
          || activeTabIsDeviseForm
          || activeTabIsCircForm
        ) ? <Outlet /> : null}
      </Box>

      <Dialog
        open={joueurModalOpen}
        onClose={() => setJoueurModalOpen(false)}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle sx={{ pr: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <PeopleRoundedIcon sx={{ fontSize: 18 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Selectionner un Joueur</Typography>
            </Box>
            <IconButton aria-label="Fermer la liste des joueurs" onClick={() => setJoueurModalOpen(false)}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, bgcolor: '#eef2f6' }}>
          <JoueurPage variant="modalPicker" onOpenInTab={handleOpenJoueurInTab} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={arbitreModalOpen}
        onClose={() => setArbitreModalOpen(false)}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle sx={{ pr: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <SportsIcon sx={{ fontSize: 18 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Selectionner un Arbitre</Typography>
            </Box>
            <IconButton aria-label="Fermer la liste des arbitres" onClick={() => setArbitreModalOpen(false)}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, bgcolor: '#eef2f6' }}>
          <ArbitrePage variant="modalPicker" onOpenInTab={handleOpenArbitreInTab} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={epreuveModalOpen}
        onClose={() => setEpreuveModalOpen(false)}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle sx={{ pr: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <EmojiEventsRoundedIcon sx={{ fontSize: 18 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Selectionner une Epreuve</Typography>
            </Box>
            <IconButton aria-label="Fermer la liste des epreuves" onClick={() => setEpreuveModalOpen(false)}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, bgcolor: '#eef2f6' }}>
          <EpreuvePage variant="modalPicker" onOpenInTab={handleOpenEpreuveInTab} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={clubModalOpen}
        onClose={() => setClubModalOpen(false)}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle sx={{ pr: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <ShieldRoundedIcon sx={{ fontSize: 18 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Selectionner un Club</Typography>
            </Box>
            <IconButton aria-label="Fermer la liste des clubs" onClick={() => setClubModalOpen(false)}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, bgcolor: '#eef2f6' }}>
          <ClubPage variant="modalPicker" onOpenInTab={handleOpenClubInTab} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={natioModalOpen}
        onClose={() => setNatioModalOpen(false)}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle sx={{ pr: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <FlagRoundedIcon sx={{ fontSize: 18 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Sélectionner un Pays</Typography>
            </Box>
            <IconButton aria-label="Fermer la liste des pays" onClick={() => setNatioModalOpen(false)}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, bgcolor: '#eef2f6' }}>
          <NatioPage variant="modalPicker" onOpenInTab={handleOpenNatioInTab} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={villeModalOpen}
        onClose={() => setVilleModalOpen(false)}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle sx={{ pr: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <LocationCityRoundedIcon sx={{ fontSize: 18 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Sélectionner une Ville</Typography>
            </Box>
            <IconButton aria-label="Fermer la liste des villes" onClick={() => setVilleModalOpen(false)}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, bgcolor: '#eef2f6' }}>
          <VillePage variant="modalPicker" onOpenInTab={handleOpenVilleInTab} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={terrainModalOpen}
        onClose={() => setTerrainModalOpen(false)}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle sx={{ pr: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <StadiumRoundedIcon sx={{ fontSize: 18 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Sélectionner un Stade</Typography>
            </Box>
            <IconButton aria-label="Fermer la liste des stades" onClick={() => setTerrainModalOpen(false)}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, bgcolor: '#eef2f6' }}>
          <TerrainPage variant="modalPicker" onOpenInTab={handleOpenTerrainInTab} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={deviseModalOpen}
        onClose={() => setDeviseModalOpen(false)}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle sx={{ pr: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <EuroRoundedIcon sx={{ fontSize: 18 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Sélectionner une Devise</Typography>
            </Box>
            <IconButton aria-label="Fermer la liste des devises" onClick={() => setDeviseModalOpen(false)}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, bgcolor: '#eef2f6' }}>
          <DevisePage variant="modalPicker" onOpenInTab={handleOpenDeviseInTab} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={circModalOpen}
        onClose={() => setCircModalOpen(false)}
        fullWidth
        maxWidth="xl"
      >
        <DialogTitle sx={{ pr: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
              <EventNoteRoundedIcon sx={{ fontSize: 18 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Sélectionner une Circonstance</Typography>
            </Box>
            <IconButton aria-label="Fermer la liste des circonstances" onClick={() => setCircModalOpen(false)}>
              <CloseRoundedIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2, bgcolor: '#eef2f6' }}>
          <CircPage variant="modalPicker" onOpenInTab={handleOpenCircInTab} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
