/* eslint-disable react-refresh/only-export-components */
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import CalculateRoundedIcon from '@mui/icons-material/CalculateRounded';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import EuroRoundedIcon from '@mui/icons-material/EuroRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import MergeRoundedIcon from '@mui/icons-material/MergeRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import PersonSearchRoundedIcon from '@mui/icons-material/PersonSearchRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import SportsIcon from '@mui/icons-material/Sports';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import StadiumRoundedIcon from '@mui/icons-material/StadiumRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import type { GridRowId } from '@mui/x-data-grid';
import { lazy, type ReactNode } from 'react';

const NatioPage = lazy(() => import('../features/natio/NatioPage').then((module) => ({ default: module.NatioPage })));
const NatioTabFormPane = lazy(() => import('../features/natio/NatioTabFormPane').then((module) => ({ default: module.NatioTabFormPane })));
const VillePage = lazy(() => import('../features/ville/VillePage').then((module) => ({ default: module.VillePage })));
const VilleTabFormPane = lazy(() => import('../features/ville/VilleTabFormPane').then((module) => ({ default: module.VilleTabFormPane })));
const TerrainPage = lazy(() => import('../features/terrain/TerrainPage').then((module) => ({ default: module.TerrainPage })));
const TerrainTabFormPane = lazy(() => import('../features/terrain/TerrainTabFormPane').then((module) => ({ default: module.TerrainTabFormPane })));
const DevisePage = lazy(() => import('../features/devise/DevisePage').then((module) => ({ default: module.DevisePage })));
const DeviseTabFormPane = lazy(() => import('../features/devise/DeviseTabFormPane').then((module) => ({ default: module.DeviseTabFormPane })));
const CircPage = lazy(() => import('../features/circ/CircPage').then((module) => ({ default: module.CircPage })));
const CircTabFormPane = lazy(() => import('../features/circ/CircTabFormPane').then((module) => ({ default: module.CircTabFormPane })));
const ClubPage = lazy(() => import('../features/club/ClubPage').then((module) => ({ default: module.ClubPage })));
const ClubTabFormPane = lazy(() => import('../features/club/ClubTabFormPane').then((module) => ({ default: module.ClubTabFormPane })));
const ArbitrePage = lazy(() => import('../features/arbitre/ArbitrePage').then((module) => ({ default: module.ArbitrePage })));
const ArbitreTabFormPane = lazy(() => import('../features/arbitre/ArbitreTabFormPane').then((module) => ({ default: module.ArbitreTabFormPane })));
const EpreuvePage = lazy(() => import('../features/epreuve/EpreuvePage').then((module) => ({ default: module.EpreuvePage })));
const EpreuveTabFormPane = lazy(() => import('../features/epreuve/EpreuveTabFormPane').then((module) => ({ default: module.EpreuveTabFormPane })));
const CompetitionPage = lazy(() => import('../features/competition/CompetitionPage').then((module) => ({ default: module.CompetitionPage })));
const CompetitionTabFormPane = lazy(() => import('../features/competition/CompetitionTabFormPane').then((module) => ({ default: module.CompetitionTabFormPane })));
const TourDefPage = lazy(() => import('../features/tourdef/TourDefPage').then((module) => ({ default: module.TourDefPage })));
const TourDefTabFormPane = lazy(() => import('../features/tourdef/TourDefTabFormPane').then((module) => ({ default: module.TourDefTabFormPane })));
const JoueurPage = lazy(() => import('../features/joueur/JoueurPage').then((module) => ({ default: module.JoueurPage })));
const JoueurTabFormPane = lazy(() => import('../features/joueur/JoueurTabFormPane').then((module) => ({ default: module.JoueurTabFormPane })));

export interface NavTab {
  key: string;
  label: string;
  path: string;
  closable: boolean;
}

export interface TabMeta {
  label: string;
  icon: ReactNode;
}

export type PickerEntityKey = 'joueur' | 'arbitre' | 'epreuve' | 'competition' | 'tourdef' | 'club' | 'natio' | 'ville' | 'terrain' | 'devise' | 'circ';

export type ToolbarButton =
  | {
      label: string;
      ariaLabel: string;
      icon: ReactNode;
      secondaryCategory?: 'Référentiels' | 'Compétitions' | 'Organisation';
      activeKey?: 'home' | 'calendrier' | 'statistiques' | PickerEntityKey;
      action: 'navigate';
      path: string;
      unique?: boolean;
    }
  | {
      label: string;
      ariaLabel: string;
      icon: ReactNode;
      secondaryCategory?: 'Référentiels' | 'Compétitions' | 'Organisation';
      activeKey?: 'home' | 'calendrier' | 'statistiques' | PickerEntityKey;
      action: 'picker';
      entity: PickerEntityKey;
    }
  | {
      label: string;
      ariaLabel: string;
      icon: ReactNode;
      secondaryCategory?: 'Référentiels' | 'Compétitions' | 'Organisation';
      activeKey?: 'home' | 'calendrier' | 'statistiques' | PickerEntityKey;
      action: 'wizard';
      wizard: 'rencontre';
    }
  | {
      label: string;
      ariaLabel: string;
      icon: ReactNode;
      secondaryCategory?: 'Référentiels' | 'Compétitions' | 'Organisation';
      activeKey?: 'home' | 'calendrier' | 'statistiques' | PickerEntityKey;
      action: 'noop';
    };

export interface PickerOpenPayload {
  rowId: GridRowId;
  label: string;
}

export interface PickerEntityDefinition {
  key: PickerEntityKey;
  basePath: string;
  shortPath: string;
  modalTitle: string;
  closeAriaLabel: string;
  titleIcon: ReactNode;
  renderPage: (onOpenInTab: (payload: PickerOpenPayload) => void) => ReactNode;
  renderTabPane: (args: { tab: NavTab; decodedId: string; active: boolean }) => ReactNode;
}

export const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { label: 'Accueil', ariaLabel: 'Accueil', icon: <HomeRoundedIcon />, activeKey: 'home', action: 'navigate', path: '/accueil', unique: true },
  { label: 'Calendrier', ariaLabel: 'Calendrier', icon: <CalendarMonthIcon />, activeKey: 'calendrier', action: 'navigate', path: '/admin/calendrier' },
  { label: 'Joueurs', ariaLabel: 'Joueurs', icon: <PersonRoundedIcon />, activeKey: 'joueur', action: 'picker', entity: 'joueur' },
  { label: 'Clubs', ariaLabel: 'Clubs', icon: <ShieldRoundedIcon />, activeKey: 'club', action: 'picker', entity: 'club' },
  { label: 'Competitions', ariaLabel: 'Competitions', icon: <EmojiEventsIcon />, activeKey: 'competition', action: 'picker', entity: 'competition' },
  { label: 'Arbitres', ariaLabel: 'Arbitres', icon: <SportsIcon />, secondaryCategory: 'Organisation', activeKey: 'arbitre', action: 'picker', entity: 'arbitre' },
  { label: 'Statistiques', ariaLabel: 'Statistiques', icon: <BarChartRoundedIcon />, activeKey: 'statistiques', action: 'navigate', path: '/admin/statistiques' },
  { label: 'Matchs', ariaLabel: 'Matchs', icon: <SportsSoccerRoundedIcon />, secondaryCategory: 'Organisation', action: 'wizard', wizard: 'rencontre' },
  { label: 'Pays', ariaLabel: 'Pays', icon: <FlagRoundedIcon />, secondaryCategory: 'Référentiels', activeKey: 'natio', action: 'picker', entity: 'natio' },
  { label: 'Villes', ariaLabel: 'Villes', icon: <LocationCityRoundedIcon />, secondaryCategory: 'Référentiels', activeKey: 'ville', action: 'picker', entity: 'ville' },
  { label: 'Stades', ariaLabel: 'Stades', icon: <StadiumRoundedIcon />, secondaryCategory: 'Référentiels', activeKey: 'terrain', action: 'picker', entity: 'terrain' },
  { label: 'Devises', ariaLabel: 'Devises', icon: <EuroRoundedIcon />, secondaryCategory: 'Référentiels', activeKey: 'devise', action: 'picker', entity: 'devise' },
  { label: 'Circonstances', ariaLabel: 'Circonstances', icon: <EventNoteRoundedIcon />, secondaryCategory: 'Référentiels', activeKey: 'circ', action: 'picker', entity: 'circ' },
  { label: 'Épreuves', ariaLabel: 'Épreuves', icon: <MilitaryTechIcon />, secondaryCategory: 'Référentiels', activeKey: 'epreuve', action: 'picker', entity: 'epreuve' },
  { label: 'Defs Tour', ariaLabel: 'Definitions de Tour', icon: <RuleRoundedIcon />, secondaryCategory: 'Référentiels', activeKey: 'tourdef', action: 'picker', entity: 'tourdef' },
];

export const TOOLBAR_SECONDARY_CATEGORIES: Array<NonNullable<ToolbarButton['secondaryCategory']>> = [
  'Référentiels',
  'Organisation',
];

export type ToolsMenuAction =
  | 'club-merge'
  | 'stats-recompute'
  | 'rencontres-import'
  | 'incomplets-joueurs'
  | 'incomplets-clubs'
  | 'incomplets-rencontres';

export interface ToolsMenuGroup {
  label: string;
  items: Array<{ label: string; icon: ReactNode; action: ToolsMenuAction; disabled?: boolean }>;
}

export const TOOLBAR_TOOLS_GROUPS: ToolsMenuGroup[] = [
  {
    label: 'Actions',
    items: [
      { label: 'Fusionner...', icon: <MergeRoundedIcon />, action: 'club-merge' },
      { label: 'Importer...', icon: <UploadFileRoundedIcon />, action: 'rencontres-import' },
      { label: 'Calculer statistiques...', icon: <CalculateRoundedIcon />, action: 'stats-recompute' },
    ],
  },
  {
    label: 'Fiches incomplètes',
    items: [
      { label: 'Joueurs incomplets', icon: <PersonSearchRoundedIcon />, action: 'incomplets-joueurs' },
      { label: 'Clubs incomplets', icon: <ShieldRoundedIcon />, action: 'incomplets-clubs' },
      { label: 'Rencontres incomplètes', icon: <SportsSoccerRoundedIcon />, action: 'incomplets-rencontres' },
    ],
  },
];

export const TAB_META: Record<string, TabMeta> = {
  '/admin/home': { label: 'Accueil', icon: <HomeRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/calendrier': { label: 'Calendrier', icon: <CalendarMonthIcon sx={{ fontSize: 14 }} /> },
  '/admin/joueurs': { label: 'Joueurs', icon: <PersonRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/clubs': { label: 'Clubs', icon: <ShieldRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/competitions': { label: 'Competitions', icon: <EmojiEventsIcon sx={{ fontSize: 14 }} /> },
  '/admin/arbitre': { label: 'Arbitres', icon: <SportsIcon sx={{ fontSize: 14 }} /> },
  '/admin/configuration': { label: 'Configuration', icon: <SettingsRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/natio': { label: 'Pays', icon: <FlagRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/ville': { label: 'Villes', icon: <LocationCityRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/terrain': { label: 'Stades', icon: <StadiumRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/devise': { label: 'Devises', icon: <EuroRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/circ': { label: 'Circonstances', icon: <EventNoteRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/epreuve': { label: 'Épreuves', icon: <MilitaryTechIcon sx={{ fontSize: 14 }} /> },
  '/admin/tourdefs': { label: 'Defs Tour', icon: <RuleRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/statistiques': { label: 'Statistiques', icon: <BarChartRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/joueurs-incomplets': { label: 'Joueurs incomplets', icon: <PersonSearchRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/clubs-incomplets': { label: 'Clubs incomplets', icon: <ShieldRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/rencontres-incompletes': { label: 'Rencontres incomplètes', icon: <SportsSoccerRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/import-rencontres': { label: 'Import de rencontres', icon: <UploadFileRoundedIcon sx={{ fontSize: 14 }} /> },
  '/admin/rencontres': { label: 'Rencontres', icon: <SportsSoccerRoundedIcon sx={{ fontSize: 14 }} /> },
};

export const PICKER_ENTITY_DEFINITIONS: PickerEntityDefinition[] = [
  {
    key: 'joueur',
    basePath: '/admin/joueurs',
    shortPath: '/joueurs',
    modalTitle: 'Selectionner un Joueur',
    closeAriaLabel: 'Fermer la liste des joueurs',
    titleIcon: <PersonRoundedIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <JoueurPage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => <JoueurTabFormPane key={tab.key} tabPath={tab.path} joueurId={decodedId} active={active} />,
  },
  {
    key: 'arbitre',
    basePath: '/admin/arbitre',
    shortPath: '/arbitre',
    modalTitle: 'Selectionner un Arbitre',
    closeAriaLabel: 'Fermer la liste des arbitres',
    titleIcon: <SportsIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <ArbitrePage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => <ArbitreTabFormPane key={tab.key} tabPath={tab.path} arbitreId={decodedId} active={active} />,
  },
  {
    key: 'epreuve',
    basePath: '/admin/epreuve',
    shortPath: '/epreuve',
    modalTitle: 'Selectionner une Epreuve',
    closeAriaLabel: 'Fermer la liste des epreuves',
    titleIcon: <EmojiEventsIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <EpreuvePage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => <EpreuveTabFormPane key={tab.key} tabPath={tab.path} epreuveId={decodedId} active={active} />,
  },
  {
    key: 'competition',
    basePath: '/admin/competitions',
    shortPath: '/competitions',
    modalTitle: 'Selectionner une Competition',
    closeAriaLabel: 'Fermer la liste des competitions',
    titleIcon: <MilitaryTechIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <CompetitionPage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => <CompetitionTabFormPane key={tab.key} tabPath={tab.path} competitionId={decodedId} active={active} />,
  },
  {
    key: 'tourdef',
    basePath: '/admin/tourdefs',
    shortPath: '/tourdefs',
    modalTitle: 'Selectionner une Definition de Tour',
    closeAriaLabel: 'Fermer la liste des definitions de tour',
    titleIcon: <RuleRoundedIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <TourDefPage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => <TourDefTabFormPane key={tab.key} tabPath={tab.path} tourDefId={decodedId} active={active} />,
  },
  {
    key: 'club',
    basePath: '/admin/clubs',
    shortPath: '/clubs',
    modalTitle: 'Selectionner un Club',
    closeAriaLabel: 'Fermer la liste des clubs',
    titleIcon: <ShieldRoundedIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <ClubPage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => <ClubTabFormPane key={tab.key} tabPath={tab.path} clubId={decodedId} active={active} />,
  },
  {
    key: 'natio',
    basePath: '/admin/natio',
    shortPath: '/natio',
    modalTitle: 'Sélectionner un Pays',
    closeAriaLabel: 'Fermer la liste des pays',
    titleIcon: <FlagRoundedIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <NatioPage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => <NatioTabFormPane key={tab.key} tabPath={tab.path} natioId={decodedId} active={active} />,
  },
  {
    key: 'ville',
    basePath: '/admin/ville',
    shortPath: '/ville',
    modalTitle: 'Sélectionner une Ville',
    closeAriaLabel: 'Fermer la liste des villes',
    titleIcon: <LocationCityRoundedIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <VillePage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => <VilleTabFormPane key={tab.key} tabPath={tab.path} villeId={decodedId} active={active} />,
  },
  {
    key: 'terrain',
    basePath: '/admin/terrain',
    shortPath: '/terrain',
    modalTitle: 'Sélectionner un Stade',
    closeAriaLabel: 'Fermer la liste des stades',
    titleIcon: <StadiumRoundedIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <TerrainPage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => <TerrainTabFormPane key={tab.key} tabPath={tab.path} terrainId={decodedId} active={active} />,
  },
  {
    key: 'devise',
    basePath: '/admin/devise',
    shortPath: '/devise',
    modalTitle: 'Sélectionner une Devise',
    closeAriaLabel: 'Fermer la liste des devises',
    titleIcon: <EuroRoundedIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <DevisePage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => <DeviseTabFormPane key={tab.key} tabPath={tab.path} deviseId={decodedId} active={active} />,
  },
  {
    key: 'circ',
    basePath: '/admin/circ',
    shortPath: '/circ',
    modalTitle: 'Sélectionner une Circonstance',
    closeAriaLabel: 'Fermer la liste des circonstances',
    titleIcon: <EventNoteRoundedIcon sx={{ fontSize: 18 }} />,
    renderPage: (onOpenInTab) => <CircPage variant="modalPicker" onOpenInTab={onOpenInTab} />,
    renderTabPane: ({ tab, decodedId, active }) => <CircTabFormPane key={tab.key} tabPath={tab.path} circId={decodedId} active={active} />,
  },
];
