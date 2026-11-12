import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import {
  AppBar,
  Box,
  Button,
  Divider,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Toolbar,
  Typography,
} from '@mui/material';
import { Fragment, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { authStore } from '../features/auth/authStore';
import { SUPPORTED_CLUB_FALLBACK_ID, supportedClubStore } from '../features/system/supportedClubStore';
import { useEntityImage } from '../lib/useEntityImage';
import {
  PICKER_ENTITY_DEFINITIONS,
  TOOLBAR_BUTTONS,
  TOOLBAR_SECONDARY_CATEGORIES,
  TOOLBAR_TOOLS_GROUPS,
  type PickerEntityKey,
  type ToolbarButton,
  type ToolsMenuAction,
} from './adminLayoutConfig';
import type { AdminToolDialogFlag } from './AdminToolDialogs';
import type { OpenTab } from './useAdminTabs';
import { useCompactToolbar } from './useCompactToolbar';

const PICKER_DEFINITION_BY_KEY = new Map(PICKER_ENTITY_DEFINITIONS.map((entity) => [entity.key, entity]));
const PRIMARY_TOOLBAR_BUTTONS = TOOLBAR_BUTTONS.filter((button) => !button.secondaryCategory);
const SECONDARY_TOOLBAR_BUTTONS = TOOLBAR_BUTTONS.filter((button) => Boolean(button.secondaryCategory));
// Boutons primaires + bouton Outils.
const NAV_BUTTON_COUNT = PRIMARY_TOOLBAR_BUTTONS.length + 1;
const UNIQUE_TAB = { unique: true, uniqueByPath: true } as const;

const TOOLS_MENU_TABS: Partial<Record<ToolsMenuAction, { path: string; label: string }>> = {
  'rss-feed': { path: '/admin/rss', label: 'Flux RSS' },
  'incomplets-joueurs': { path: '/admin/joueurs-incomplets', label: 'Joueurs incomplets' },
  'incomplets-clubs': { path: '/admin/clubs-incomplets', label: 'Clubs incomplets' },
  'incomplets-rencontres': { path: '/admin/rencontres-incompletes', label: 'Rencontres incomplètes' },
  maintenance: { path: '/admin/maintenance', label: 'Requête' },
  'maintenance-backend': { path: '/admin/maintenance-backend', label: 'Maintenance' },
};

const TOOLS_MENU_DIALOGS: Partial<Record<ToolsMenuAction, AdminToolDialogFlag>> = {
  'club-merge': 'clubMerge',
  'stats-recompute': 'statsRecompute',
  'rencontres-import': 'rencontreImport',
};

interface AdminToolbarProps {
  openTab: OpenTab;
  onOpenPicker: (entity: PickerEntityKey) => void;
  onOpenDialog: (dialog: AdminToolDialogFlag) => void;
}

export function AdminToolbar({ openTab, onOpenPicker, onOpenDialog }: AdminToolbarProps) {
  const location = useLocation();
  const supportedClubId = supportedClubStore((s) => s.clubId);
  const monacoLogo = useEntityImage('club', supportedClubId || SUPPORTED_CLUB_FALLBACK_ID);
  const logout = authStore((s) => s.logout);
  const [toolsMenuAnchorEl, setToolsMenuAnchorEl] = useState<null | HTMLElement>(null);
  const {
    topToolbarRef,
    topBrandRef,
    topActionsMeasureRef,
    navButtonsRowRef,
    compactNavButtons,
    compactTopActions,
  } = useCompactToolbar(NAV_BUTTON_COUNT);

  const isHomeActive = location.pathname === '/admin/home' || location.pathname === '/accueil';
  const isConfigurationActive = location.pathname === '/admin/configuration' || location.pathname === '/configuration';
  const isCalendrierActive = location.pathname === '/admin/calendrier' || location.pathname === '/calendrier';
  const isStatistiquesActive = location.pathname === '/admin/statistiques' || location.pathname === '/statistiques';
  const isEntityActive = (entityKey: PickerEntityKey) => {
    const entity = PICKER_DEFINITION_BY_KEY.get(entityKey);
    if (!entity) return false;
    return location.pathname === entity.basePath
      || location.pathname === entity.shortPath
      || location.pathname.startsWith(`${entity.basePath}/`);
  };
  const isToolbarButtonActive = (button: ToolbarButton) => {
    if (button.activeKey === 'home') return isHomeActive;
    if (button.activeKey === 'calendrier') return isCalendrierActive;
    if (button.activeKey === 'statistiques') return isStatistiquesActive;
    return button.activeKey ? isEntityActive(button.activeKey) : false;
  };

  const handleToolsMenuAction = (action: ToolsMenuAction) => {
    const dialog = TOOLS_MENU_DIALOGS[action];
    if (dialog) {
      onOpenDialog(dialog);
      return;
    }
    const tab = TOOLS_MENU_TABS[action];
    if (tab) openTab(tab.path, tab.label, UNIQUE_TAB);
  };

  const handleToolbarButtonClick = (button: ToolbarButton) => {
    switch (button.action) {
      case 'navigate':
        openTab(button.path, button.label, UNIQUE_TAB);
        return;
      case 'picker':
        onOpenPicker(button.entity);
        return;
      case 'wizard':
        if (button.wizard === 'rencontre') {
          onOpenDialog('rencontreWizard');
        } else if (button.wizard === 'saison') {
          onOpenDialog('saisonWizard');
        }
        return;
      case 'noop':
        return;
    }
  };

  const compactTopButtonSx = {
    minWidth: 40,
    px: compactTopActions ? 1 : 1.5,
    '.MuiButton-startIcon': { mr: compactTopActions ? 0 : 1 },
  };
  const compactNavButtonSx = {
    minWidth: 36,
    px: compactNavButtons ? 1 : 1.25,
    '.MuiButton-startIcon': { mr: compactNavButtons ? 0 : 1 },
  };

  return (
    <>
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
                  ...compactTopButtonSx,
                  color: isConfigurationActive ? undefined : 'text.primary',
                  borderColor: isConfigurationActive ? undefined : 'divider',
                }}
                aria-label="Configuration"
                onClick={() => openTab('/configuration', 'Configuration', UNIQUE_TAB)}
              >
                {compactTopActions ? <SettingsRoundedIcon /> : 'Configuration'}
              </Button>
            </Tooltip>

            <Tooltip title="Refresh" disableHoverListener={!compactTopActions}>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={compactTopActions ? undefined : <RefreshRoundedIcon />}
                sx={{ ...compactTopButtonSx, color: 'text.primary', borderColor: 'divider' }}
                aria-label="Refresh"
                onClick={() => {
                  window.location.reload();
                }}
              >
                {compactTopActions ? <RefreshRoundedIcon /> : 'Refresh'}
              </Button>
            </Tooltip>

            <Tooltip title="Déconnexion" disableHoverListener={!compactTopActions}>
              <Button
                variant="contained"
                color="primary"
                startIcon={compactTopActions ? undefined : <LogoutRoundedIcon />}
                sx={compactTopButtonSx}
                aria-label="Déconnexion"
                onClick={() => {
                  logout();
                  window.location.assign('/');
                }}
              >
                {compactTopActions ? <LogoutRoundedIcon /> : 'Déconnexion'}
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
                Déconnexion
              </Button>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Toolbar
          sx={{
            gap: 1,
            py: 1,
            flexWrap: 'wrap',
            justifyContent: 'space-between',
          }}
        >
          <Box ref={navButtonsRowRef} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
            {PRIMARY_TOOLBAR_BUTTONS.map((button) => {
              const active = isToolbarButtonActive(button);
              return (
                <Tooltip key={button.label} title={button.label} disableHoverListener={!compactNavButtons}>
                  <Button
                    size="small"
                    variant={active ? 'contained' : 'outlined'}
                    color={active ? 'primary' : 'inherit'}
                    startIcon={compactNavButtons ? undefined : button.icon}
                    sx={compactNavButtonSx}
                    aria-label={button.ariaLabel}
                    onClick={() => handleToolbarButtonClick(button)}
                  >
                    {compactNavButtons ? button.icon : button.label}
                  </Button>
                </Tooltip>
              );
            })}

            <Tooltip title="Outils" disableHoverListener={!compactNavButtons}>
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                startIcon={compactNavButtons ? undefined : <BuildRoundedIcon />}
                sx={compactNavButtonSx}
                aria-label="Outils"
                aria-haspopup="menu"
                aria-expanded={toolsMenuAnchorEl ? 'true' : undefined}
                onClick={(event) => setToolsMenuAnchorEl(event.currentTarget)}
              >
                {compactNavButtons ? <BuildRoundedIcon /> : 'Outils'}
              </Button>
            </Tooltip>

            <Menu
              anchorEl={toolsMenuAnchorEl}
              open={Boolean(toolsMenuAnchorEl)}
              onClose={() => setToolsMenuAnchorEl(null)}
              slotProps={{ list: { 'aria-label': 'Outils' } }}
            >
              {TOOLBAR_TOOLS_GROUPS.map((group, groupIndex) => (
                <Fragment key={group.label}>
                  {groupIndex > 0 && <Divider />}
                  <MenuItem disabled sx={{ opacity: 1, fontWeight: 700 }}>
                    {group.label}
                  </MenuItem>
                  {group.items.map((item) => (
                    <MenuItem
                      key={item.label}
                      disabled={item.disabled}
                      onClick={() => {
                        setToolsMenuAnchorEl(null);
                        handleToolsMenuAction(item.action);
                      }}
                    >
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText>{item.label}</ListItemText>
                    </MenuItem>
                  ))}
                </Fragment>
              ))}
              {SECONDARY_TOOLBAR_BUTTONS.length > 0 && <Divider />}
              {TOOLBAR_SECONDARY_CATEGORIES.map((category, categoryIndex) => {
                const categoryButtons = SECONDARY_TOOLBAR_BUTTONS.filter(
                  (button) => button.secondaryCategory === category,
                );
                if (categoryButtons.length === 0) return null;

                return (
                  <Fragment key={category}>
                    {categoryIndex > 0 && <Divider />}
                    <MenuItem disabled sx={{ opacity: 1, fontWeight: 700 }}>
                      {category}
                    </MenuItem>
                    {categoryButtons.map((button) => (
                      <MenuItem
                        key={button.label}
                        selected={isToolbarButtonActive(button)}
                        onClick={() => {
                          setToolsMenuAnchorEl(null);
                          handleToolbarButtonClick(button);
                        }}
                      >
                        <ListItemIcon>{button.icon}</ListItemIcon>
                        <ListItemText>{button.label}</ListItemText>
                      </MenuItem>
                    ))}
                  </Fragment>
                );
              })}
            </Menu>
          </Box>
        </Toolbar>
      </Box>
    </>
  );
}
