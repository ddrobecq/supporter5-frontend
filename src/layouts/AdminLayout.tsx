import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import EuroRoundedIcon from '@mui/icons-material/EuroRounded';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import StadiumRoundedIcon from '@mui/icons-material/StadiumRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import SportsIcon from '@mui/icons-material/Sports';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import {
  AppBar,
  Box,
  Button,
  Dialog,
  DialogActions,
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
import type { HomePageOutletContext, RecentEntityKind, RecentOpenedRecord } from '../features/home/types';
import { emitTabSaveRequest } from '../lib/useTabMetaEvents';
import { useEntityImage } from '../lib/useEntityImage';
import { supportedClubStore } from '../features/system/supportedClubStore';
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
import { CompetitionPage } from '../features/competition/CompetitionPage';
import { CompetitionTabFormPane } from '../features/competition/CompetitionTabFormPane';
import { TourDefPage } from '../features/tourdef/TourDefPage';
import { TourDefTabFormPane } from '../features/tourdef/TourDefTabFormPane';
import { JoueurPage } from '../features/joueur/JoueurPage';
import { JoueurTabFormPane } from '../features/joueur/JoueurTabFormPane';
import { RencontreTabFormPane } from '../features/rencontre/RencontreTabFormPane';
import { RencontreCreateWizardDialog } from '../features/rencontre/RencontreCreateWizardDialog';
import { TerrainPickerDialog } from '../features/terrain/TerrainPickerDialog';

const QUICK_ACTIONS = [
  { label: 'Joueurs', icon: <PersonRoundedIcon />, path: '/joueurs' },
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

type PickerEntityKey = 'joueur' | 'arbitre' | 'epreuve' | 'competition' | 'tourdef' | 'club' | 'natio' | 'ville' | 'terrain' | 'devise' | 'circ';

interface PickerOpenPayload {
  rowId: GridRowId;
  label: string;
}

interface PickerEntityDefinition {
  key: PickerEntityKey;
  basePath: string;
  shortPath: string;
  modalTitle: string;
  closeAriaLabel: string;
  titleIcon: ReactNode;
  renderPage: (onOpenInTab: (payload: PickerOpenPayload) => void) => ReactNode;
  renderTabPane: (args: { tab: NavTab; decodedId: string; active: boolean }) => ReactNode;
}

const TAB_META: Record<string, TabMeta> = {
  '/admin/home': { label: 'Accueil', icon: <HomeRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/configuration': { label: 'Configuration', icon: <SettingsRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/natio': { label: 'Pays', icon: <FlagRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/ville': { label: 'Villes', icon: <LocationCityRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/arbitre': { label: 'Arbitres', icon: <SportsIcon sx={{ fontSize: 14 }} /> },
  '/admin/terrain': { label: 'Stades', icon: <StadiumRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/devise': { label: 'Devises', icon: <EuroRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/circ': { label: 'Circonstances', icon: <EventNoteRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/epreuve': { label: 'Épreuves', icon: <MilitaryTechIcon sx={{ fontSize: 14 }} /> },
  '/admin/competitions': { label: 'Competitions', icon: <EmojiEventsIcon sx={{ fontSize: 14 }} /> },
  '/admin/tourdefs': { label: 'Defs Tour', icon: <RuleRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/calendrier': { label: 'Calendrier', icon: <CalendarMonthIcon sx={{ fontSize: 14 }} /> },
  '/admin/rencontres': { label: 'Rencontres', icon: <SportsSoccerRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/joueurs': { label: 'Joueurs', icon: <PersonRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/clubs': { label: 'Clubs', icon: <ShieldRoundedIcon sx={{ fontSize: 14 }} /> },
};

const HOME_TAB_KEY = 'tab-home';
const RECENT_OPENED_STORAGE_KEY = 'supporter:recent-opened-records:v1';
const MAX_RECENT_OPENED_RECORDS = 10;

const PICKER_ENTITY_DEFINITIONS: PickerEntityDefinition[] = [
  {
    key: 'joueur',
    basePath: '/admin/joueurs',
    shortPath: '/joueurs',
    modalTitle: 'Selectionner un Joueur',
    closeAriaLabel: 'Fermer la liste des joueurs',
    titleIcon: <PersonRoundedIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <JoueurPage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => (
      <JoueurTabFormPane key={tab.key} tabPath={tab.path} joueurId={decodedId} active={active} />
    ),
  },
  {
    key: 'arbitre',
    basePath: '/admin/arbitre',
    shortPath: '/arbitre',
    modalTitle: 'Selectionner un Arbitre',
    closeAriaLabel: 'Fermer la liste des arbitres',
    titleIcon: <SportsIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <ArbitrePage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => (
      <ArbitreTabFormPane key={tab.key} tabPath={tab.path} arbitreId={decodedId} active={active} />
    ),
  },
  {
    key: 'epreuve',
    basePath: '/admin/epreuve',
    shortPath: '/epreuve',
    modalTitle: 'Selectionner une Epreuve',
    closeAriaLabel: 'Fermer la liste des epreuves',
    titleIcon: <EmojiEventsIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <EpreuvePage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => (
      <EpreuveTabFormPane key={tab.key} tabPath={tab.path} epreuveId={decodedId} active={active} />
    ),
  },
  {
    key: 'competition',
    basePath: '/admin/competitions',
    shortPath: '/competitions',
    modalTitle: 'Selectionner une Competition',
    closeAriaLabel: 'Fermer la liste des competitions',
    titleIcon: <MilitaryTechIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <CompetitionPage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => (
      <CompetitionTabFormPane key={tab.key} tabPath={tab.path} competitionId={decodedId} active={active} />
    ),
  },
  {
    key: 'tourdef',
    basePath: '/admin/tourdefs',
    shortPath: '/tourdefs',
    modalTitle: 'Selectionner une Definition de Tour',
    closeAriaLabel: 'Fermer la liste des definitions de tour',
    titleIcon: <RuleRoundedIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <TourDefPage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => (
      <TourDefTabFormPane key={tab.key} tabPath={tab.path} tourDefId={decodedId} active={active} />
    ),
  },
  {
    key: 'club',
    basePath: '/admin/clubs',
    shortPath: '/clubs',
    modalTitle: 'Selectionner un Club',
    closeAriaLabel: 'Fermer la liste des clubs',
    titleIcon: <ShieldRoundedIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <ClubPage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => (
      <ClubTabFormPane key={tab.key} tabPath={tab.path} clubId={decodedId} active={active} />
    ),
  },
  {
    key: 'natio',
    basePath: '/admin/natio',
    shortPath: '/natio',
    modalTitle: 'Sélectionner un Pays',
    closeAriaLabel: 'Fermer la liste des pays',
    titleIcon: <FlagRoundedIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <NatioPage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => (
      <NatioTabFormPane key={tab.key} tabPath={tab.path} natioId={decodedId} active={active} />
    ),
  },
  {
    key: 'ville',
    basePath: '/admin/ville',
    shortPath: '/ville',
    modalTitle: 'Sélectionner une Ville',
    closeAriaLabel: 'Fermer la liste des villes',
    titleIcon: <LocationCityRoundedIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <VillePage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => (
      <VilleTabFormPane key={tab.key} tabPath={tab.path} villeId={decodedId} active={active} />
    ),
  },
  {
    key: 'terrain',
    basePath: '/admin/terrain',
    shortPath: '/terrain',
    modalTitle: 'Sélectionner un Stade',
    closeAriaLabel: 'Fermer la liste des stades',
    titleIcon: <StadiumRoundedIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <TerrainPage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => (
      <TerrainTabFormPane key={tab.key} tabPath={tab.path} terrainId={decodedId} active={active} />
    ),
  },
  {
    key: 'devise',
    basePath: '/admin/devise',
    shortPath: '/devise',
    modalTitle: 'Sélectionner une Devise',
    closeAriaLabel: 'Fermer la liste des devises',
    titleIcon: <EuroRoundedIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <DevisePage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => (
      <DeviseTabFormPane key={tab.key} tabPath={tab.path} deviseId={decodedId} active={active} />
    ),
  },
  {
    key: 'circ',
    basePath: '/admin/circ',
    shortPath: '/circ',
    modalTitle: 'Sélectionner une Circonstance',
    closeAriaLabel: 'Fermer la liste des circonstances',
    titleIcon: <EventNoteRoundedIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <CircPage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => (
      <CircTabFormPane key={tab.key} tabPath={tab.path} circId={decodedId} active={active} />
    ),
  },
];

function normalizeRoutePath(path: string): string {
  const trimmedPath = path.trim();
  const normalized = trimmedPath.toLowerCase();
  switch (normalized) {
    case '/accueil':
      return '/admin/home';
    case '/configuration':
      return '/admin/configuration';
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
    case '/competitions':
      return '/admin/competitions';
    case '/tourdefs':
      return '/admin/tourdefs';
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
  if (normalized.startsWith('/admin/rencontres/')) {
    return '/admin/rencontres';
  }
  for (const entity of PICKER_ENTITY_DEFINITIONS) {
    if (normalized.startsWith(`${entity.basePath}/`)) {
      return entity.basePath;
    }
  }
  return normalized;
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function sanitizeRecentLabel(label: string, fallback: string): string {
  const trimmed = String(label ?? '').trim();
  return trimmed || fallback;
}

function buildRecentOpenedRecord(path: string, label: string): RecentOpenedRecord | null {
  const normalizedPath = normalizeRoutePath(path);

  if (normalizedPath.startsWith('/admin/rencontres/')) {
    const entityId = decodeSegment(normalizedPath.slice('/admin/rencontres/'.length));
    if (!entityId) return null;
    return {
      path: normalizedPath,
      label: sanitizeRecentLabel(label, `Rencontre ${entityId}`),
      entityKind: 'rencontre',
      entityId,
      lastOpenedAt: Date.now(),
    };
  }

  for (const entity of PICKER_ENTITY_DEFINITIONS) {
    const prefix = `${entity.basePath}/`;
    if (!normalizedPath.startsWith(prefix)) continue;

    const entityId = decodeSegment(normalizedPath.slice(prefix.length));
    if (!entityId) return null;

    return {
      path: normalizedPath,
      label: sanitizeRecentLabel(label, entityId),
      entityKind: entity.key as RecentEntityKind,
      entityId,
      lastOpenedAt: Date.now(),
    };
  }

  return null;
}

function readRecentOpenedRecordsFromStorage(): RecentOpenedRecord[] {
  try {
    const raw = window.localStorage.getItem(RECENT_OPENED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const normalizedRows = parsed.flatMap((row): RecentOpenedRecord[] => {
      if (!row || typeof row !== 'object') return [];

      const path = String((row as { path?: unknown }).path ?? '');
      const label = String((row as { label?: unknown }).label ?? '');
      const base = buildRecentOpenedRecord(path, label);
      if (!base) return [];

      const lastOpenedAtRaw = Number((row as { lastOpenedAt?: unknown }).lastOpenedAt);
      return [{
        ...base,
        lastOpenedAt: Number.isFinite(lastOpenedAtRaw) ? lastOpenedAtRaw : Date.now(),
      }];
    });

    return normalizedRows
      .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
      .slice(0, MAX_RECENT_OPENED_RECORDS);
  } catch {
    return [];
  }
}

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
  const searchAreaRef = useRef<HTMLDivElement | null>(null);
  const [compactNavButtons, setCompactNavButtons] = useState(false);
  const [compactTopActions, setCompactTopActions] = useState(false);
  const [compactSearchAction, setCompactSearchAction] = useState(false);
  const [pickerModal, setPickerModal] = useState<PickerEntityKey | null>(null);
  const [rencontreWizardOpen, setRencontreWizardOpen] = useState(false);
  const [dirtyTabsByPath, setDirtyTabsByPath] = useState<Record<string, boolean>>({});
  const [closeConfirmTabKey, setCloseConfirmTabKey] = useState<string | null>(null);
  const [savingBeforeClose, setSavingBeforeClose] = useState(false);
  const [recentOpenedRecords, setRecentOpenedRecords] = useState<RecentOpenedRecord[]>(() => readRecentOpenedRecordsFromStorage());
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
  const pickerDefinitionByKey = new Map(PICKER_ENTITY_DEFINITIONS.map((entity) => [entity.key, entity]));
  const isHomeActive = location.pathname === '/admin/home' || location.pathname === '/accueil';
  const isConfigurationActive = location.pathname === '/admin/configuration' || location.pathname === '/configuration';
  const isCalendrierActive = location.pathname === '/admin/calendrier' || location.pathname === '/calendrier';
  const isEntityActive = (entityKey: PickerEntityKey) => {
    const entity = pickerDefinitionByKey.get(entityKey);
    if (!entity) return false;
    return location.pathname === entity.basePath
      || location.pathname === entity.shortPath
      || location.pathname.startsWith(`${entity.basePath}/`);
  };
  const isJoueursActive = isEntityActive('joueur');
  const isClubsActive = isEntityActive('club');
  const isNatioActive = isEntityActive('natio');
  const isVilleActive = isEntityActive('ville');
  const isArbitreActive = isEntityActive('arbitre');
  const isTerrainActive = isEntityActive('terrain');
  const isDeviseActive = isEntityActive('devise');
  const isCircActive = isEntityActive('circ');
  const isEpreuveActive = isEntityActive('epreuve');
  const isCompetitionActive = isEntityActive('competition');
  const isTourDefActive = isEntityActive('tourdef');
  const activeTab = typeof activeTabKey === 'string' ? tabs.find((tab) => tab.key === activeTabKey) : undefined;
  const isDynamicFormPath = (path: string) => (
    path.startsWith('/admin/rencontres/')
    || PICKER_ENTITY_DEFINITIONS.some((entity) => path.startsWith(`${entity.basePath}/`))
  );
  const activeTabIsDynamicForm = Boolean(activeTab?.path && isDynamicFormPath(activeTab.path)) || isDynamicFormPath(location.pathname);

  const rememberOpenedRecord = (path: string, label: string) => {
    const next = buildRecentOpenedRecord(path, label);
    if (!next) return;
    setRecentOpenedRecords((prev) => {
      const deduped = prev.filter((row) => row.path !== next.path);
      return [next, ...deduped].slice(0, MAX_RECENT_OPENED_RECORDS);
    });
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
    const row = navButtonsRowRef.current;
    if (!row) return;

    const updateCompactState = () => {
      const buttonCount = 10 + QUICK_ACTIONS.length;
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
      setRecentOpenedRecords((prev) => {
        let changed = false;
        const next = prev.map((row) => {
          if (row.path !== normalizedPath || row.label === label) return row;
          changed = true;
          return { ...row, label };
        });
        return changed ? next : prev;
      });
    };

    window.addEventListener('supporter:tab-label', handler);
    return () => window.removeEventListener('supporter:tab-label', handler);
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
                    navigate('/login');
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
                onClick={() => setPickerModal('natio')}
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
                onClick={() => setPickerModal('ville')}
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
                onClick={() => setPickerModal('arbitre')}
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
                onClick={() => setPickerModal('terrain')}
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
                onClick={() => setPickerModal('devise')}
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
                onClick={() => setPickerModal('circ')}
              >
                {compactNavButtons ? <EventNoteRoundedIcon /> : 'Circonstances'}
              </Button>
            </Tooltip>

            <Tooltip title="Épreuves" disableHoverListener={!compactNavButtons}>
              <Button
                size="small"
                variant={isEpreuveActive ? 'contained' : 'outlined'}
                color={isEpreuveActive ? 'primary' : 'inherit'}
                startIcon={compactNavButtons ? undefined : <MilitaryTechIcon />}
                sx={{
                  minWidth: 36,
                  px: compactNavButtons ? 1 : 1.25,
                  '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                }}
                aria-label="Épreuves"
                onClick={() => setPickerModal('epreuve')}
              >
                {compactNavButtons ? <MilitaryTechIcon /> : 'Épreuves'}
              </Button>
            </Tooltip>

            <Tooltip title="Competitions" disableHoverListener={!compactNavButtons}>
              <Button
                size="small"
                variant={isCompetitionActive ? 'contained' : 'outlined'}
                color={isCompetitionActive ? 'primary' : 'inherit'}
                startIcon={compactNavButtons ? undefined : <EmojiEventsIcon />}
                sx={{
                  minWidth: 36,
                  px: compactNavButtons ? 1 : 1.25,
                  '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                }}
                aria-label="Competitions"
                onClick={() => setPickerModal('competition')}
              >
                {compactNavButtons ? <EmojiEventsIcon /> : 'Competitions'}
              </Button>
            </Tooltip>

            <Tooltip title="Defs Tour" disableHoverListener={!compactNavButtons}>
              <Button
                size="small"
                variant={isTourDefActive ? 'contained' : 'outlined'}
                color={isTourDefActive ? 'primary' : 'inherit'}
                startIcon={compactNavButtons ? undefined : <RuleRoundedIcon />}
                sx={{
                  minWidth: 36,
                  px: compactNavButtons ? 1 : 1.25,
                  '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                }}
                aria-label="Definitions de Tour"
                onClick={() => setPickerModal('tourdef')}
              >
                {compactNavButtons ? <RuleRoundedIcon /> : 'Defs Tour'}
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
                        setPickerModal('club');
                      } else if (action.path === '/joueurs') {
                        setPickerModal('joueur');
                      } else {
                        openTab(action.path, action.label);
                      }
                    } else if (action.label === 'Matchs') {
                      setRencontreWizardOpen(true);
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
      </Box>

      <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
        {tabs
          .filter((tab) => tab.path.startsWith('/admin/rencontres/'))
          .map((tab) => {
            const encodedId = tab.path.slice('/admin/rencontres/'.length);
            if (!encodedId) return null;
            const decodedId = decodeURIComponent(encodedId);
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
            const decodedId = decodeURIComponent(encodedId);
            return entity.renderTabPane({ tab, decodedId, active: activeTabKey === tab.key });
          }))}
        {!activeTabIsDynamicForm ? <Outlet context={homeOutletContext} /> : null}
      </Box>

      <Dialog
        open={Boolean(activePickerEntity) && activePickerEntity?.key !== 'terrain'}
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
            <DialogContent dividers sx={{ p: 2, bgcolor: '#eef2f6', overflow: 'hidden', display: 'flex', minHeight: 0, minWidth: 0 }}>
              <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', '& > *': { flex: 1, minHeight: 0, minWidth: 0 } }}>
                {activePickerEntity.renderPage(handleOpenPickerEntityInTab(activePickerEntity.key))}
              </Box>
            </DialogContent>
          </>
        ) : null}
      </Dialog>

      {activePickerEntity?.key === 'terrain' ? (
        <TerrainPickerDialog
          open
          onClose={() => setPickerModal(null)}
          onSelect={handleOpenPickerEntityInTab('terrain')}
        />
      ) : null}

      <RencontreCreateWizardDialog
        open={rencontreWizardOpen}
        onClose={() => setRencontreWizardOpen(false)}
        onCreated={async (createdId, label) => {
          openTab(`/admin/rencontres/${encodeURIComponent(String(createdId))}`, label || 'Rencontre', { unique: true, uniqueByPath: true });
        }}
      />

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
