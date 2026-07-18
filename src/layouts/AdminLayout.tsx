import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import EventNoteRoundedIcon from '@mui/icons-material/EventNoteRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import LocationCityRoundedIcon from '@mui/icons-material/LocationCityRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import EuroRoundedIcon from '@mui/icons-material/EuroRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import SportsIcon from '@mui/icons-material/Sports';
import {
  AppBar,
  Box,
  Button,
  InputAdornment,
  OutlinedInput,
  Tooltip,
  Toolbar,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authStore } from '../features/auth/authStore';

const QUICK_ACTIONS = [
  { label: 'Calendrier', icon: <EventNoteRoundedIcon /> },
  { label: 'Joueurs', icon: <PeopleRoundedIcon /> },
  { label: 'Statistiques', icon: <BarChartRoundedIcon /> },
  { label: 'Clubs', icon: <GroupsRoundedIcon /> },
  { label: 'Matchs', icon: <SportsSoccerRoundedIcon /> },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = authStore((s) => s.logout);
  const navButtonsRowRef = useRef<HTMLDivElement | null>(null);
  const searchAreaRef = useRef<HTMLDivElement | null>(null);
  const [compactNavButtons, setCompactNavButtons] = useState(false);
  const [compactSearchAction, setCompactSearchAction] = useState(false);
  const isHomeActive = location.pathname === '/admin/home' || location.pathname === '/accueil';
  const isNatioActive = location.pathname === '/admin/natio' || location.pathname === '/natio';
  const isVilleActive = location.pathname === '/admin/ville' || location.pathname === '/ville';
  const isArbitreActive = location.pathname === '/admin/arbitre' || location.pathname === '/arbitre';
  const isTerrainActive = location.pathname === '/admin/terrain' || location.pathname === '/terrain';
  const isDeviseActive = location.pathname === '/admin/devise' || location.pathname === '/devise';
  const isCircActive = location.pathname === '/admin/circ' || location.pathname === '/circ';

  useEffect(() => {
    const row = navButtonsRowRef.current;
    if (!row) return;

    const updateCompactState = () => {
      const buttonCount = 2 + QUICK_ACTIONS.length;
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
                onClick={() => navigate('/accueil')}
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
                onClick={() => navigate('/natio')}
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
                onClick={() => navigate('/ville')}
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
                onClick={() => navigate('/arbitre')}
              >
                {compactNavButtons ? <SportsIcon /> : 'Arbitres'}
              </Button>
            </Tooltip>

            <Tooltip title="Stades" disableHoverListener={!compactNavButtons}>
              <Button
                size="small"
                variant={isTerrainActive ? 'contained' : 'outlined'}
                color={isTerrainActive ? 'primary' : 'inherit'}
                startIcon={compactNavButtons ? undefined : <PlaceRoundedIcon />}
                sx={{
                  minWidth: 36,
                  px: compactNavButtons ? 1 : 1.25,
                  '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                }}
                aria-label="Stades"
                onClick={() => navigate('/terrain')}
              >
                {compactNavButtons ? <PlaceRoundedIcon /> : 'Stades'}
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
                onClick={() => navigate('/devise')}
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
                onClick={() => navigate('/circ')}
              >
                {compactNavButtons ? <EventNoteRoundedIcon /> : 'Circonstances'}
              </Button>
            </Tooltip>

            {QUICK_ACTIONS.map((action) => (
              <Tooltip key={action.label} title={action.label} disableHoverListener={!compactNavButtons}>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={compactNavButtons ? undefined : action.icon}
                  sx={{
                    minWidth: 36,
                    px: compactNavButtons ? 1 : 1.25,
                    '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
                  }}
                  aria-label={action.label}
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

      <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
        <Outlet />
      </Box>
    </Box>
  );
}
