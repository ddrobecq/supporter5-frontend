import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './features/auth/LoginPage';
import { HomePage } from './features/home/HomePage';
import { NatioPage } from './features/natio/NatioPage';
import { AdminLayout } from './layouts/AdminLayout';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/accueil" element={<Navigate to="/admin/home" replace />} />
          <Route path="/admin/home" element={<HomePage />} />
          <Route path="/natio" element={<Navigate to="/admin/natio" replace />} />
          <Route path="/admin/natio" element={<NatioPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/admin/natio" replace />} />
    </Routes>
  );
}

export default App;
