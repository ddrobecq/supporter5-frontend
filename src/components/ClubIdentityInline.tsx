import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import { Avatar, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { NatioFlag } from './NatioFlag';
import { useEntityImage } from '../lib/useEntityImage';
import { entityPath } from '../lib/entityNavigation';

interface ClubIdentityInlineProps {
  clubId: string | null | undefined;
  clubName: string | null | undefined;
  natioId?: string | null | undefined;
  size?: number;
  nameSx?: SxProps<Theme>;
  sx?: SxProps<Theme>;
  showName?: boolean;
}

export function ClubIdentityInline({ clubId, clubName, natioId, size = 24, nameSx, sx, showName = true }: ClubIdentityInlineProps) {
  const location = useLocation();
  const normalizedClubId = String(clubId ?? '').trim();
  const normalizedName = String(clubName ?? '').trim();
  const normalizedNatio = String(natioId ?? '').trim();
  const { src } = useEntityImage('club', normalizedClubId || null);

  if (!normalizedClubId && !normalizedName) return null;

  const hasClubLink = Boolean(normalizedClubId);
  const clubHref = hasClubLink ? entityPath('club', normalizedClubId, location.pathname) : undefined;

  return (
    <Stack
      direction="row"
      spacing={0.9}
      component={hasClubLink ? RouterLink : 'div'}
      to={clubHref}
      sx={{
        alignItems: 'center',
        minWidth: 0,
        color: 'inherit',
        textDecoration: 'none',
        ...(hasClubLink ? { cursor: 'pointer' } : null),
        ...sx,
      }}
    >
      <Avatar src={src ?? undefined} sx={{ width: size, height: size, bgcolor: 'action.hover', flexShrink: 0 }}>
        {!src ? <ShieldRoundedIcon sx={{ fontSize: Math.round(size * 0.62) }} /> : null}
      </Avatar>
      <Stack direction="row" spacing={0.7} sx={{ alignItems: 'center', minWidth: 0, flexWrap: 'wrap' }}>
        {showName ? (
          <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.15, ...nameSx }}>
            {normalizedName || normalizedClubId}
          </Typography>
        ) : null}
        {normalizedNatio ? <NatioFlag idnatio={normalizedNatio} /> : null}
      </Stack>
    </Stack>
  );
}
