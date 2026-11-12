import PersonOutlineRoundedIcon from '@mui/icons-material/PersonOutlineRounded';
import { Avatar, Box, Stack, Typography, type BoxProps } from '@mui/material';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { NatioFlag } from './NatioFlag';
import { useEntityImage } from '../lib/useEntityImage';
import { PITCH_AVATAR_SIZE, PITCH_SLOT_WIDTH, pitchPlayerLabel, type PitchPlayerIdentity } from './pitchSlots';

/** Terrain generique (pelouse + tracas reglementaires); les postes sont fournis en children. */
export function PitchField({ children }: { children?: ReactNode }) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        // Ratio longueur/largeur = 1,54 (mutualise pour match, stat saison et stat toutes saisons).
        paddingTop: '154%',
        bgcolor: '#2d8a4e',
        borderRadius: 2,
        border: '3px solid #fff',
        overflow: 'hidden',
      }}
    >
      {/* viewBox 70x107.8 calque exactement le paddingTop:154% (ratio 1.54) */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox="0 0 70 107.8"
        preserveAspectRatio="none"
      >
        <line x1="0" y1="53.9" x2="70" y2="53.9" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" />
        <circle cx="35" cy="53.9" r="9.15" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none" />
        <circle cx="35" cy="53.9" r="0.6" fill="rgba(255,255,255,0.5)" />

        <rect x="14.84" y="0" width="40.32" height="16.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none" />
        <rect x="25.84" y="0" width="18.32" height="5.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none" />
        <circle cx="35" cy="11" r="0.6" fill="rgba(255,255,255,0.5)" />
        <path d="M 27.69 16.5 A 9.15 9.15 0 0 0 42.31 16.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none" />

        <rect x="14.84" y="91.3" width="40.32" height="16.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none" />
        <rect x="25.84" y="102.3" width="18.32" height="5.5" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none" />
        <circle cx="35" cy="96.8" r="0.6" fill="rgba(255,255,255,0.5)" />
        <path d="M 27.69 91.3 A 9.15 9.15 0 0 1 42.31 91.3" stroke="rgba(255,255,255,0.4)" strokeWidth="0.4" fill="none" />
      </svg>
      {children}
    </Box>
  );
}

export function PitchPlayerAvatar({ playerId, size = PITCH_AVATAR_SIZE }: { playerId: string; size?: number }) {
  const { src } = useEntityImage('joueurrg', playerId);
  return (
    <Avatar src={src ?? undefined} sx={{ width: size, height: size, bgcolor: 'action.hover' }}>
      {!src && <PersonOutlineRoundedIcon sx={{ fontSize: size * 0.6 }} />}
    </Avatar>
  );
}

/** Conteneur positionne d'un poste sur le terrain. */
export function PitchSlotShell({ x, y, width = PITCH_SLOT_WIDTH, sx, children, ...boxProps }: { x: number; y: number; width?: number } & BoxProps) {
  return (
    <Box
      {...boxProps}
      sx={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width,
        userSelect: 'none',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/** Representation commune d'un joueur place sur le terrain: pastille + nom + drapeau. */
export function PitchPlayerMarker({ player, highlighted, avatarSize = PITCH_AVATAR_SIZE, showFlag = true, nameHref, avatarSx, ...avatarBoxProps }: {
  player: PitchPlayerIdentity;
  highlighted?: boolean;
  avatarSize?: number;
  showFlag?: boolean;
  nameHref?: string;
  avatarSx?: BoxProps['sx'];
} & Omit<BoxProps, 'sx'>) {
  return (
    <>
      <Box
        {...avatarBoxProps}
        sx={{
          borderRadius: '50%',
          border: highlighted ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.8)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
          ...avatarSx,
        }}
      >
        <PitchPlayerAvatar playerId={player.IDJOUEUR} size={avatarSize} />
      </Box>
      <Stack direction="row" spacing={0.4} sx={{ alignItems: 'center', maxWidth: '100%', mt: 0.25 }}>
        <Typography
          variant="caption"
          {...(nameHref ? { component: RouterLink, to: nameHref } : {})}
          sx={{
            fontSize: 9,
            lineHeight: 1.1,
            fontWeight: 700,
            color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            ...(nameHref ? { textDecoration: 'none', '&:hover': { textDecoration: 'underline' } } : {}),
          }}
        >
          {pitchPlayerLabel(player)}
        </Typography>
        {showFlag && player.IDNATIO?.trim() ? <NatioFlag idnatio={player.IDNATIO} /> : null}
      </Stack>
    </>
  );
}
