import { Avatar, Box, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import SportsIcon from '@mui/icons-material/Sports';
import { NatioFlag } from './NatioFlag';
import { useEntityImage } from '../lib/useEntityImage';
import { fetchArbitreById } from '../features/rencontre/rencontreApi';

interface ArbitreIdentityDisplayProps {
  arbitreId: string | null | undefined;
  size?: number;
  compact?: boolean;
  inField?: boolean;
}

export function ArbitreIdentityDisplay({ arbitreId, size = 30, compact = false, inField = false }: ArbitreIdentityDisplayProps) {
  const normalizedId = String(arbitreId ?? '').trim();
  const { src } = useEntityImage('arbitre', normalizedId);
  const [data, setData] = useState<{ NOM: string; PRENOM: string; IDNATIO: string } | null>(null);

  useEffect(() => {
    if (!normalizedId) {
      setData(null);
      return;
    }

    let cancelled = false;
    void fetchArbitreById(normalizedId).then((arbitre) => {
      if (!cancelled) {
        setData(arbitre);
      }
    }).catch(() => {
      if (!cancelled) {
        setData(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [normalizedId]);

  if (!normalizedId) {
    if (inField) {
      return null;
    }

    return (
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Avatar sx={{ width: size, height: size, bgcolor: 'grey.300' }}>
          <SportsIcon sx={{ fontSize: Math.round(size * 0.58) }} />
        </Avatar>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            fontSize: inField ? '0.875rem' : (compact ? 11 : 12),
            lineHeight: inField ? 1.4375 : undefined,
          }}
        >
          Aucun arbitre
        </Typography>
      </Stack>
    );
  }

  const nom = data?.NOM?.trim() ? data.NOM.toUpperCase() : normalizedId;
  const prenom = data?.PRENOM?.trim() ?? '';

  if (inField) {
    return (
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Avatar src={src ?? undefined} sx={{ width: size, height: size, bgcolor: 'grey.300', flexShrink: 0 }}>
          {!src && <SportsIcon sx={{ fontSize: Math.round(size * 0.58) }} />}
        </Avatar>
        <Stack direction="row" spacing={0.5} sx={{ minWidth: 0, alignItems: 'center' }}>
          <Typography
            variant="body2"
            sx={{
              fontSize: '0.875rem',
              lineHeight: 1.4375,
              fontWeight: 400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {nom}{prenom ? ` ${prenom}` : ''}
          </Typography>
          {data?.IDNATIO ? <NatioFlag idnatio={data.IDNATIO} /> : null}
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Avatar src={src ?? undefined} sx={{ width: size, height: size, bgcolor: 'grey.300', flexShrink: 0 }}>
        {!src && <SportsIcon sx={{ fontSize: Math.round(size * 0.58) }} />}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontSize: compact ? 11 : 12, fontWeight: 600, lineHeight: 1.1 }}>
          {nom}{prenom ? ` ${prenom}` : ''}
        </Typography>
        {data?.IDNATIO ? <NatioFlag idnatio={data.IDNATIO} /> : null}
      </Box>
    </Stack>
  );
}
