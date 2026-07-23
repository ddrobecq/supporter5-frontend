import type { ComponentType } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { HomePage } from './features/home/HomePage';
import { NatioPage } from './features/natio/NatioPage';
import { VillePage } from './features/ville/VillePage';
import { ArbitrePage } from './features/arbitre/ArbitrePage';
import { TerrainPage } from './features/terrain/TerrainPage';
import { DevisePage } from './features/devise/DevisePage';
import { CircPage } from './features/circ/CircPage';
import { EpreuvePage } from './features/epreuve/EpreuvePage';
import { JoueurPage } from './features/joueur/JoueurPage';
import { CalendrierPage } from './features/calendrier/CalendrierPage';
import { ClubPage } from './features/club/ClubPage';
import { AdminLayout } from './layouts/AdminLayout';

interface EntityRouteDefinition {
  shortPath: string;
  adminPath: string;
  paramName: string;
  PageComponent: ComponentType;
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

const ENTITY_ROUTES: EntityRouteDefinition[] = [
  { shortPath: 'joueurs', adminPath: 'admin/joueurs', paramName: 'joueurId', PageComponent: JoueurPage },
  { shortPath: 'clubs', adminPath: 'admin/clubs', paramName: 'clubId', PageComponent: ClubPage },
  { shortPath: 'natio', adminPath: 'admin/natio', paramName: 'natioId', PageComponent: NatioPage },
  { shortPath: 'ville', adminPath: 'admin/ville', paramName: 'villeId', PageComponent: VillePage },
  { shortPath: 'arbitre', adminPath: 'admin/arbitre', paramName: 'arbitreId', PageComponent: ArbitrePage },
  { shortPath: 'terrain', adminPath: 'admin/terrain', paramName: 'terrainId', PageComponent: TerrainPage },
  { shortPath: 'devise', adminPath: 'admin/devise', paramName: 'deviseId', PageComponent: DevisePage },
  { shortPath: 'circ', adminPath: 'admin/circ', paramName: 'circId', PageComponent: CircPage },
  { shortPath: 'epreuve', adminPath: 'admin/epreuve', paramName: 'epreuveId', PageComponent: EpreuvePage },
];

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/accueil" element={<Navigate to="/admin/home" replace />} />
          <Route path="/admin/home" element={<HomePage />} />
          <Route path="/calendrier" element={<Navigate to="/admin/calendrier" replace />} />
          <Route path="/admin/calendrier" element={<CalendrierPage />} />
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
  );
}

export default App;
