import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useSeoRobots } from './lib/useSeoRobots';

const LoginPage = lazy(() => import('./features/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const HomePage = lazy(() => import('./features/home/HomePage').then((module) => ({ default: module.HomePage })));
const VillePage = lazy(() => import('./features/ville/VillePage').then((module) => ({ default: module.VillePage })));
const NatioPage = lazy(() => import('./features/natio/NatioPage').then((module) => ({ default: module.NatioPage })));
const ArbitrePage = lazy(() => import('./features/arbitre/ArbitrePage').then((module) => ({ default: module.ArbitrePage })));
const TerrainPage = lazy(() => import('./features/terrain/TerrainPage').then((module) => ({ default: module.TerrainPage })));
const DevisePage = lazy(() => import('./features/devise/DevisePage').then((module) => ({ default: module.DevisePage })));
const CircPage = lazy(() => import('./features/circ/CircPage').then((module) => ({ default: module.CircPage })));
const EpreuvePage = lazy(() => import('./features/epreuve/EpreuvePage').then((module) => ({ default: module.EpreuvePage })));
const CompetitionPage = lazy(() => import('./features/competition/CompetitionPage').then((module) => ({ default: module.CompetitionPage })));
const JoueurPage = lazy(() => import('./features/joueur/JoueurPage').then((module) => ({ default: module.JoueurPage })));
const JoueurPublicPage = lazy(() => import('./features/joueur/JoueurPublicPage').then((module) => ({ default: module.JoueurPublicPage })));
const RencontrePublicPage = lazy(() => import('./features/rencontre/RencontrePublicPage').then((module) => ({ default: module.RencontrePublicPage })));
const CalendrierPage = lazy(() => import('./features/calendrier/CalendrierPage').then((module) => ({ default: module.CalendrierPage })));
const CalendrierPublicPage = lazy(() => import('./features/calendrier/CalendrierPublicPage').then((module) => ({ default: module.CalendrierPublicPage })));
const StatistiquesPage = lazy(() => import('./features/statistiques/StatistiquesPage').then((module) => ({ default: module.StatistiquesPage })));
const JoueursIncompletsPage = lazy(() => import('./features/incomplets/JoueursIncompletsPage').then((module) => ({ default: module.JoueursIncompletsPage })));
const ClubsIncompletsPage = lazy(() => import('./features/incomplets/ClubsIncompletsPage').then((module) => ({ default: module.ClubsIncompletsPage })));
const RencontresIncompletesPage = lazy(() => import('./features/incomplets/RencontresIncompletesPage').then((module) => ({ default: module.RencontresIncompletesPage })));
const RencontreImportPage = lazy(() => import('./features/import/RencontreImportPage').then((module) => ({ default: module.RencontreImportPage })));
const MaintenancePage = lazy(() => import('./features/maintenance/MaintenancePage').then((module) => ({ default: module.MaintenancePage })));
const BackendMaintenancePage = lazy(() => import('./features/maintenance/BackendMaintenancePage').then((module) => ({ default: module.BackendMaintenancePage })));
const ClubPage = lazy(() => import('./features/club/ClubPage').then((module) => ({ default: module.ClubPage })));
const ClubPublicPage = lazy(() => import('./features/club/ClubPublicPage').then((module) => ({ default: module.ClubPublicPage })));
const TourDefPage = lazy(() => import('./features/tourdef/TourDefPage').then((module) => ({ default: module.TourDefPage })));
const RssPage = lazy(() => import('./features/rss/RssPage').then((module) => ({ default: module.RssPage })));
const ConfigurationPage = lazy(() => import('./features/configuration/ConfigurationPage').then((module) => ({ default: module.ConfigurationPage })));
const AdminLayout = lazy(() => import('./layouts/AdminLayout').then((module) => ({ default: module.AdminLayout })));
const PublicLayout = lazy(() => import('./layouts/PublicLayout').then((module) => ({ default: module.PublicLayout })));
const PublicSettingsPage = lazy(() => import('./features/public/PublicSettingsPage').then((module) => ({ default: module.PublicSettingsPage })));

type RouteComponent = ComponentType | LazyExoticComponent<ComponentType>;

interface EntityRouteDefinition {
  shortPath: string;
  adminPath: string;
  paramName: string;
  PageComponent: RouteComponent;
}

interface RedirectByParamProps {
  paramName: string;
  toPrefix: string;
}

function RedirectByParam({ paramName, toPrefix }: RedirectByParamProps) {
  const params = useParams<Record<string, string | undefined>>();
  const raw = params[paramName];
  const resolvedId = raw ? encodeURIComponent(raw) : '';
  return <Navigate to={`${toPrefix}/${resolvedId}`} replace />;
}

function EmptyRoute() {
  return null;
}

const ENTITY_ROUTES: EntityRouteDefinition[] = [
  { shortPath: 'joueurs', adminPath: 'admin/joueurs', paramName: 'joueurId', PageComponent: JoueurPage },
  { shortPath: 'clubs', adminPath: 'admin/clubs', paramName: 'clubId', PageComponent: ClubPage },
  { shortPath: 'ville', adminPath: 'admin/ville', paramName: 'villeId', PageComponent: VillePage },
  { shortPath: 'natio', adminPath: 'admin/natio', paramName: 'natioId', PageComponent: NatioPage },
  { shortPath: 'arbitre', adminPath: 'admin/arbitre', paramName: 'arbitreId', PageComponent: ArbitrePage },
  { shortPath: 'terrain', adminPath: 'admin/terrain', paramName: 'terrainId', PageComponent: TerrainPage },
  { shortPath: 'devise', adminPath: 'admin/devise', paramName: 'deviseId', PageComponent: DevisePage },
  { shortPath: 'circ', adminPath: 'admin/circ', paramName: 'circId', PageComponent: CircPage },
  { shortPath: 'epreuve', adminPath: 'admin/epreuve', paramName: 'epreuveId', PageComponent: EpreuvePage },
  { shortPath: 'competitions', adminPath: 'admin/competitions', paramName: 'competitionId', PageComponent: CompetitionPage },
  { shortPath: 'tourdefs', adminPath: 'admin/tourdefs', paramName: 'tourDefId', PageComponent: TourDefPage },
  { shortPath: 'rss', adminPath: 'admin/rss', paramName: 'rssId', PageComponent: RssPage },
];

function App() {
  useSeoRobots();

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage publicMode />} />
          <Route path="/calendrier" element={<CalendrierPublicPage />} />
          <Route path="/statistiques" element={<StatistiquesPage publicMode />} />
          <Route path="/parametres" element={<PublicSettingsPage />} />
          <Route path="/clubs/:clubId" element={<ClubPublicPage />} />
          <Route path="/joueurs/:joueurId" element={<JoueurPublicPage />} />
                  <Route path="/rencontres/:rencontreId" element={<RencontrePublicPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/accueil" element={<Navigate to="/admin/home" replace />} />
            <Route path="/admin/home" element={<HomePage />} />
            <Route path="/configuration" element={<Navigate to="/admin/configuration" replace />} />
            <Route path="/admin/configuration" element={<ConfigurationPage />} />
            <Route path="/calendrier" element={<Navigate to="/admin/calendrier" replace />} />
            <Route path="/admin/calendrier" element={<CalendrierPage />} />
            <Route path="/statistiques" element={<Navigate to="/admin/statistiques" replace />} />
            <Route path="/admin/statistiques" element={<StatistiquesPage />} />
            <Route path="/joueurs-incomplets" element={<Navigate to="/admin/joueurs-incomplets" replace />} />
            <Route path="/admin/joueurs-incomplets" element={<JoueursIncompletsPage />} />
            <Route path="/clubs-incomplets" element={<Navigate to="/admin/clubs-incomplets" replace />} />
            <Route path="/admin/clubs-incomplets" element={<ClubsIncompletsPage />} />
            <Route path="/rencontres-incompletes" element={<Navigate to="/admin/rencontres-incompletes" replace />} />
            <Route path="/admin/rencontres-incompletes" element={<RencontresIncompletesPage />} />
            <Route path="/import-rencontres" element={<Navigate to="/admin/import-rencontres" replace />} />
            <Route path="/admin/import-rencontres" element={<RencontreImportPage />} />
            <Route path="/maintenance" element={<Navigate to="/admin/maintenance" replace />} />
            <Route path="/admin/maintenance" element={<MaintenancePage />} />
            <Route path="/admin/maintenance-backend" element={<BackendMaintenancePage />} />
            <Route path="/rencontres/:rencontreId" element={<RedirectByParam paramName="rencontreId" toPrefix="/admin/rencontres" />} />
            <Route path="/admin/rencontres/:rencontreId" element={<EmptyRoute />} />
            {ENTITY_ROUTES.map(({ shortPath, adminPath, paramName, PageComponent }) => (
              <Route key={adminPath}>
                <Route path={`/${shortPath}`} element={<Navigate to={`/${adminPath}`} replace />} />
                <Route path={`/${shortPath}/:${paramName}`} element={<RedirectByParam paramName={paramName} toPrefix={`/${adminPath}`} />} />
                <Route path={`/${adminPath}`} element={<PageComponent />} />
                <Route path={`/${adminPath}/:${paramName}`} element={<PageComponent />} />
              </Route>
            ))}
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/admin/home" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
