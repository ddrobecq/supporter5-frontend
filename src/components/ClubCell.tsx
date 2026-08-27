import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { Box, Stack } from '@mui/material';
import type { KeyboardEvent, MouseEvent } from 'react';
import { useEntityImage } from '../lib/useEntityImage';

interface ClubCellProps {
  clubId: string;
  clubName: string;
  alignRight?: boolean;
  italic?: boolean;
  bold?: boolean;
  onClick?: () => void;
}

export function ClubCell({ clubId, clubName, alignRight = false, italic = false, bold = false, onClick }: ClubCellProps) {
  const { src } = useEntityImage('club', clubId);
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.();
    }
  };
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onClick?.();
  };

  return (
    <Box
      component={onClick ? 'button' : 'div'}
      type={onClick ? 'button' : undefined}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      aria-label={onClick ? `Ouvrir la fiche de ${clubName}` : undefined}
      sx={{
        width: '100%',
        display: 'flex',
        justifyContent: alignRight ? 'flex-end' : 'flex-start',
        border: 0,
        p: 0,
        m: 0,
        bgcolor: 'transparent',
        color: 'inherit',
        font: 'inherit',
        textAlign: 'inherit',
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { textDecoration: 'underline' } : undefined,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        {alignRight ? (
          <>
            <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', fontStyle: italic ? 'italic' : 'normal', fontWeight: bold ? 700 : 400 }}>{clubName}</Box>
            <Box
              sx={{
                width: 22,
                height: 22,
                minWidth: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {src ? (
                <Box
                  component="img"
                  src={src}
                  alt={clubName}
                  sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', fontStyle: italic ? 'italic' : 'normal' }}
                />
              ) : (
                <ShieldOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              )}
            </Box>
          </>
        ) : (
          <>
            <Box
              sx={{
                width: 22,
                height: 22,
                minWidth: 22,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {src ? (
                <Box
                  component="img"
                  src={src}
                  alt={clubName}
                  sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                <ShieldOutlinedIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              )}
            </Box>
            <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontStyle: italic ? 'italic' : 'normal', fontWeight: bold ? 700 : 400 }}>{clubName}</Box>
          </>
        )}
      </Stack>
    </Box>
  );
}
