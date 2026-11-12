import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { INCOMPLETS_SCREEN_BY_PATH, incompletsViewStore } from '../features/incomplets/incompletsViewStore';
import type { HomePageOutletContext, RecentOpenedRecord } from '../features/home/types';
import { emitTabSaveRequest, TAB_EVENTS, type TabOpenEventDetail } from '../lib/useTabMetaEvents';
import {
  RECENT_OPENED_STORAGE_KEY,
  readRecentOpenedRecordsFromStorage,
  renameRecentOpenedRecord,
  upsertRecentOpenedRecord,
} from './adminRecentRecords';
import { PICKER_ENTITY_DEFINITIONS, TAB_META, type NavTab } from './adminLayoutConfig';
import { normalizeRoutePath, resolveTabMetaPath } from './adminLayoutRoutes';

export interface OpenTabOptions {
  unique?: boolean;
  uniqueByPath?: boolean;
}

export type OpenTab = (path: string, label?: string, options?: OpenTabOptions) => void;

export const HOME_TAB_KEY = 'tab-home';

interface TabsState {
  tabs: NavTab[];
  activeTabKey: string | false;
  // Compteur monotone servant a generer des cles d'onglet uniques (un onglet rouvert est remonte).
  counter: number;
}

type TabsAction =
  | { type: 'activate'; key: string | false }
  | { type: 'add'; path: string; label: string }
  | { type: 'remove'; key: string }
  | { type: 'rename'; path: string; label: string }
  | { type: 'syncLocation'; pathname: string };

const INITIAL_TABS_STATE: TabsState = {
  tabs: [
    {
      key: HOME_TAB_KEY,
      label: TAB_META['/admin/home'].label,
      path: '/admin/home',
      closable: false,
    },
  ],
  activeTabKey: HOME_TAB_KEY,
  counter: 0,
};

function activate(state: TabsState, key: string | false): TabsState {
  return state.activeTabKey === key ? state : { ...state, activeTabKey: key };
}

function addTab(state: TabsState, path: string, label: string): TabsState {
  const counter = state.counter + 1;
  const key = `tab-${path}-${counter}`;
  return {
    tabs: [...state.tabs, { key, label, path, closable: true }],
    activeTabKey: key,
    counter,
  };
}

function tabsReducer(state: TabsState, action: TabsAction): TabsState {
  switch (action.type) {
    case 'activate':
      return activate(state, action.key);
    case 'add':
      return addTab(state, action.path, action.label);
    case 'remove':
      return { ...state, tabs: state.tabs.filter((item) => item.key !== action.key) };
    case 'rename':
      return { ...state, tabs: state.tabs.map((tab) => (tab.path === action.path ? { ...tab, label: action.label } : tab)) };
    case 'syncLocation': {
      const normalizedPath = normalizeRoutePath(action.pathname);
      const metaPath = resolveTabMetaPath(normalizedPath);
      if (metaPath === '/admin/home') return activate(state, HOME_TAB_KEY);

      // Ne pas créer d'onglet pour les routes d'entité sans ID (qui se redirigeront)
      const isEntityListPath = PICKER_ENTITY_DEFINITIONS.some((entity) => normalizedPath === entity.basePath);
      if (isEntityListPath) return state;

      const currentTab = state.tabs.find((tab) => tab.path === normalizedPath);
      if (currentTab) return activate(state, currentTab.key);

      const label = TAB_META[metaPath]?.label;
      if (!label) return activate(state, false);
      return addTab(state, normalizedPath, label);
    }
  }
}

function omitPath(prev: Record<string, boolean>, path: string): Record<string, boolean> {
  const next = { ...prev };
  delete next[path];
  return next;
}

export interface TabCloseConfirmState {
  open: boolean;
  saving: boolean;
  cancel: () => void;
  closeWithoutSaving: () => void;
  saveAndClose: () => void;
}

export interface AdminTabsResult {
  tabs: NavTab[];
  activeTabKey: string | false;
  activeTab: NavTab | undefined;
  dirtyTabsByPath: Record<string, boolean>;
  italicTabsByPath: Record<string, boolean>;
  homeOutletContext: HomePageOutletContext;
  openTab: OpenTab;
  selectTab: (tabKey: string) => void;
  closeTab: (tabKey: string) => void;
  closeConfirm: TabCloseConfirmState;
}

export function useAdminTabs(): AdminTabsResult {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, dispatch] = useReducer(tabsReducer, INITIAL_TABS_STATE);
  const { tabs, activeTabKey } = state;
  const [dirtyTabsByPath, setDirtyTabsByPath] = useState<Record<string, boolean>>({});
  const [italicTabsByPath, setItalicTabsByPath] = useState<Record<string, boolean>>({});
  const [closeConfirmTabKey, setCloseConfirmTabKey] = useState<string | null>(null);
  const [savingBeforeClose, setSavingBeforeClose] = useState(false);
  const [recentOpenedRecords, setRecentOpenedRecords] = useState<RecentOpenedRecord[]>(() => readRecentOpenedRecordsFromStorage());
  // Derniere valeur commitee, lue par les callbacks stables (openTab, doCloseTab) et les ecouteurs d'evenements.
  const stateRef = useRef(state);
  // Retient la derniere URL complete (avec query string) visitee par onglet, pour la restaurer au retour sur l'onglet.
  const tabLocationByKeyRef = useRef<Record<string, string>>({});
  const activeTab = typeof activeTabKey === 'string' ? tabs.find((tab) => tab.key === activeTabKey) : undefined;

  // Synchronisation URL -> onglets, ajustee pendant le rendu quand le chemin change.
  const [syncedPathname, setSyncedPathname] = useState<string | null>(null);
  if (syncedPathname !== location.pathname) {
    setSyncedPathname(location.pathname);
    dispatch({ type: 'syncLocation', pathname: location.pathname });
  }

  // Memorise la fiche de l'onglet actif (changement d'onglet ou de libelle), ajuste pendant le rendu.
  const [rememberedTab, setRememberedTab] = useState<NavTab | undefined>(undefined);
  if (rememberedTab !== activeTab) {
    setRememberedTab(activeTab);
    if (activeTab) {
      setRecentOpenedRecords((prev) => upsertRecentOpenedRecord(prev, activeTab.path, activeTab.label));
    }
  }

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    window.localStorage.setItem(RECENT_OPENED_STORAGE_KEY, JSON.stringify(recentOpenedRecords));
  }, [recentOpenedRecords]);

  useEffect(() => {
    if (typeof activeTabKey === 'string') {
      tabLocationByKeyRef.current[activeTabKey] = `${location.pathname}${location.search}`;
    }
  }, [activeTabKey, location.pathname, location.search]);

  const openTab = useCallback<OpenTab>((path, label, options) => {
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
      dispatch({ type: 'activate', key: HOME_TAB_KEY });
      navigate('/admin/home');
      return;
    }

    const currentTabs = stateRef.current.tabs;
    const existing = options?.unique
      ? (options.uniqueByPath
        ? currentTabs.find((tab) => tab.path === normalizedPath)
        : currentTabs.find((tab) => tab.path === normalizedPath && tab.label === resolvedLabel))
      : undefined;

    if (existing) {
      dispatch({ type: 'activate', key: existing.key });
      // Restaure la derniere sous-navigation (query string) visitee dans cet onglet.
      navigate(query ? requestedPath : (tabLocationByKeyRef.current[existing.key] ?? normalizedPath));
      return;
    }

    dispatch({ type: 'add', path: normalizedPath, label: resolvedLabel });
    navigate(requestedPath);
  }, [navigate]);

  const doCloseTab = useCallback((tabKey: string) => {
    const { tabs: currentTabs, activeTabKey: currentActiveKey } = stateRef.current;
    const tab = currentTabs.find((item) => item.key === tabKey);
    if (!tab) return;

    const currentIndex = currentTabs.findIndex((item) => item.key === tabKey);
    const fallbackTab = currentTabs[currentIndex - 1] ?? currentTabs[currentIndex + 1] ?? currentTabs.find((item) => item.key === HOME_TAB_KEY);

    dispatch({ type: 'remove', key: tabKey });
    const incompletsScreen = INCOMPLETS_SCREEN_BY_PATH[tab.path];
    if (incompletsScreen) incompletsViewStore.getState().clear(incompletsScreen);
    setDirtyTabsByPath((prev) => omitPath(prev, tab.path));
    setItalicTabsByPath((prev) => omitPath(prev, tab.path));

    if (currentActiveKey === tabKey) {
      if (fallbackTab) {
        dispatch({ type: 'activate', key: fallbackTab.key });
        navigate(fallbackTab.path);
      } else {
        dispatch({ type: 'activate', key: false });
      }
    }
  }, [navigate]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<TabOpenEventDetail>;
      const path = customEvent.detail?.path;
      if (!path) return;

      openTab(path, customEvent.detail?.label, {
        unique: customEvent.detail?.unique ?? true,
        uniqueByPath: customEvent.detail?.uniqueByPath ?? true,
      });
    };

    window.addEventListener(TAB_EVENTS.open, handler);
    return () => window.removeEventListener(TAB_EVENTS.open, handler);
  }, [openTab]);

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

    window.addEventListener(TAB_EVENTS.dirty, handler);
    return () => window.removeEventListener(TAB_EVENTS.dirty, handler);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ path?: string; label?: string }>;
      const path = customEvent.detail?.path;
      const label = customEvent.detail?.label;
      if (!path || !label) return;
      const normalizedPath = normalizeRoutePath(path);
      dispatch({ type: 'rename', path: normalizedPath, label });
      setRecentOpenedRecords((prev) => renameRecentOpenedRecord(prev, normalizedPath, label));
    };

    window.addEventListener(TAB_EVENTS.label, handler);
    return () => window.removeEventListener(TAB_EVENTS.label, handler);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ path?: string; italic?: boolean }>;
      const path = customEvent.detail?.path;
      const italic = customEvent.detail?.italic;
      if (!path || typeof italic !== 'boolean') return;
      const normalizedPath = normalizeRoutePath(path);
      setItalicTabsByPath((prev) => {
        if (Boolean(prev[normalizedPath]) === italic) return prev;
        return { ...prev, [normalizedPath]: italic };
      });
    };

    window.addEventListener(TAB_EVENTS.labelStyle, handler);
    return () => window.removeEventListener(TAB_EVENTS.labelStyle, handler);
  }, []);

  useEffect(() => {
    if (!closeConfirmTabKey) return undefined;
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ path?: string }>;
      const path = customEvent.detail?.path;
      if (!path) return;
      const confirmTab = stateRef.current.tabs.find((item) => item.key === closeConfirmTabKey);
      if (!confirmTab || normalizeRoutePath(confirmTab.path) !== normalizeRoutePath(path)) return;
      setSavingBeforeClose(false);
      setCloseConfirmTabKey(null);
      doCloseTab(closeConfirmTabKey);
    };

    window.addEventListener(TAB_EVENTS.saveDone, handler);
    return () => window.removeEventListener(TAB_EVENTS.saveDone, handler);
  }, [closeConfirmTabKey, doCloseTab]);

  const selectTab = (tabKey: string) => {
    const tab = tabs.find((item) => item.key === tabKey);
    if (!tab) return;
    dispatch({ type: 'activate', key: tab.key });
    navigate(tabLocationByKeyRef.current[tab.key] ?? tab.path);
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

  const closeConfirm: TabCloseConfirmState = {
    open: Boolean(closeConfirmTabKey),
    saving: savingBeforeClose,
    cancel: () => setCloseConfirmTabKey(null),
    closeWithoutSaving: () => {
      if (!closeConfirmTabKey) return;
      doCloseTab(closeConfirmTabKey);
      setCloseConfirmTabKey(null);
    },
    saveAndClose: () => {
      const confirmTab = tabs.find((item) => item.key === closeConfirmTabKey);
      if (!confirmTab) return;
      setSavingBeforeClose(true);
      emitTabSaveRequest(confirmTab.path);
    },
  };

  return {
    tabs,
    activeTabKey,
    activeTab,
    dirtyTabsByPath,
    italicTabsByPath,
    homeOutletContext: { recentOpenedRecords },
    openTab,
    selectTab,
    closeTab,
    closeConfirm,
  };
}
