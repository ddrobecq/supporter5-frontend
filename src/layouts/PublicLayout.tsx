import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import { AppBar, Avatar, Box, IconButton, Toolbar, Tooltip } from '@mui/material';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEntityImage } from '../lib/useEntityImage';
import { supportedClubStore } from '../features/system/supportedClubStore';
import { PublicSearchDialog } from '../features/public/PublicSearchDialog';
import { useState } from 'react';
import { adminPathFromPublicPath, publicPathFromAdminPath } from '../lib/entityNavigation';

export function PublicLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isCalendar = location.pathname === '/calendrier';
  const isStatistics = location.pathname === '/statistiques';
  const isSettings = location.pathname === '/parametres';
  const [searchOpen, setSearchOpen] = useState(false);
  const clubId = supportedClubStore((state) => state.clubId);
  const clubName = supportedClubStore((state) => state.clubName);
  const loadSupportedClub = supportedClubStore((state) => state.load);
  const { src: clubLogo } = useEntityImage('club', clubId);

  useEffect(() => {
    void loadSupportedClub();
  }, [loadSupportedClub]);

  useEffect(() => {
    const handleProtectedNavigation = (event: Event) => {
      const detail = (event as CustomEvent<{ path?: string }>).detail;
      const path = String(detail?.path ?? '').trim();
      navigate(path.startsWith('/admin/') ? publicPathFromAdminPath(path) : (path || '/'));
    };
    window.addEventListener('supporter:tab-open', handleProtectedNavigation);
    return () => window.removeEventListener('supporter:tab-open', handleProtectedNavigation);
  }, [navigate]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Toolbar sx={{ minHeight: '60px !important', px: { xs: 1, sm: 2 }, position: 'relative' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2, md: 3 }, pr: { xs: 3, sm: 4, md: 4 }, flex: 1, justifyContent: 'space-evenly' }}>
              <Tooltip title="Retour" disableInteractive>
                <IconButton onClick={() => navigate(-1)} aria-label="Retour"><ArrowBackRoundedIcon /></IconButton>
              </Tooltip>
              <Tooltip title="Calendrier" disableInteractive>
                <IconButton color={isCalendar ? 'primary' : 'default'} onClick={() => navigate('/calendrier')} aria-label="Calendrier"><CalendarMonthRoundedIcon /></IconButton>
              </Tooltip>
              <Tooltip title="Rechercher Joueur, Club ou Compet" disableInteractive>
                <IconButton onClick={() => setSearchOpen(true)} aria-label="Rechercher"><SearchRoundedIcon /></IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconButton onClick={() => navigate('/')} aria-label={`Accueil ${clubName}`}>
                <Avatar src={clubLogo ?? undefined} alt={clubName} sx={{ width: 34, height: 34 }} />
              </IconButton>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2, md: 3 }, pl: { xs: 3, sm: 4, md: 4 }, flex: 1, justifyContent: 'space-evenly' }}>
              <Tooltip title="Statistiques" disableInteractive>
                <IconButton color={isStatistics ? 'primary' : 'default'} onClick={() => navigate('/statistiques')} aria-label="Statistiques"><BarChartRoundedIcon /></IconButton>
              </Tooltip>
              <Tooltip title="Paramètres" disableInteractive>
                <IconButton color={isSettings ? 'primary' : 'default'} onClick={() => navigate('/parametres')} aria-label="Paramètres"><SettingsRoundedIcon /></IconButton>
              </Tooltip>
              <Tooltip title="Mode Admin" disableInteractive>
                <IconButton onClick={() => navigate(adminPathFromPublicPath(`${location.pathname}${location.search}`))} aria-label="Mode Admin"><AdminPanelSettingsRoundedIcon /></IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ width: '100%', maxWidth: 1240, mx: 'auto', px: { xs: 1, sm: 2 }, py: 2, minHeight: 'calc(100vh - 60px)', height: 'auto', overflow: 'visible' }}>
        <Outlet />
      </Box>
      <PublicSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={(path) => navigate(path)} />
    </Box>
  );
}