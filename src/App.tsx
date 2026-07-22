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

function RedirectNatioById() {
  const { natioId } = useParams<{ natioId: string }>();
  const resolvedId = natioId ? encodeURIComponent(natioId) : '';
  return <Navigate to={`/admin/natio/${resolvedId}`} replace />;
}

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
          <Route path="/joueurs" element={<Navigate to="/admin/joueurs" replace />} />
          <Route path="/admin/joueurs" element={<JoueurPage />} />
          <Route path="/clubs" element={<Navigate to="/admin/clubs" replace />} />
          <Route path="/admin/clubs" element={<ClubPage />} />
          <Route path="/natio" element={<Navigate to="/admin/natio" replace />} />
          <Route path="/natio/:natioId" element={<RedirectNatioById />} />
          <Route path="/admin/natio" element={<NatioPage />} />
          <Route path="/admin/natio/:natioId" element={<NatioPage />} />
          <Route path="/ville" element={<Navigate to="/admin/ville" replace />} />
          <Route path="/admin/ville" element={<VillePage />} />
          <Route path="/arbitre" element={<Navigate to="/admin/arbitre" replace />} />
          <Route path="/admin/arbitre" element={<ArbitrePage />} />
          <Route path="/terrain" element={<Navigate to="/admin/terrain" replace />} />
          <Route path="/admin/terrain" element={<TerrainPage />} />
          <Route path="/devise" element={<Navigate to="/admin/devise" replace />} />
          <Route path="/admin/devise" element={<DevisePage />} />
          <Route path="/circ" element={<Navigate to="/admin/circ" replace />} />
          <Route path="/admin/circ" element={<CircPage />} />
          <Route path="/epreuve" element={<Navigate to="/admin/epreuve" replace />} />
          <Route path="/admin/epreuve" element={<EpreuvePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/admin/home" replace />} />
    </Routes>
  );
}

export default App;
