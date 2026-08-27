import { Box, Tooltip, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useEntityImage } from '../lib/useEntityImage';
import { http } from '../lib/http';

interface NatioFlagProps {
  idnatio: string | null | undefined;
  name?: string | null;
  showLocal?: boolean;
}

export function NatioFlag({ idnatio, name, showLocal = false }: NatioFlagProps) {
  const normalized = String(idnatio ?? '').trim();
  const { src } = useEntityImage('natio', normalized || null);
  const [resolvedName, setResolvedName] = useState<string>(() => name ?? normalized);
  const [nalocal, setNalocal] = useState<number | null>(null);

  useEffect(() => {
    if (!normalized) { setNalocal(null); return; }

    void http.get<Record<string, unknown>>(`/api/natio/${encodeURIComponent(normalized)}`)
      .then(({ data }) => {
        const pays = String(data?.PAYS ?? '').trim();
        setResolvedName(pays || normalized);
        setNalocal(Number(data?.NALOCAL ?? 0));
      })
      .catch(() => {
        setResolvedName(name ?? normalized);
        setNalocal(0);
      });
  }, [normalized, name]);

  // NALOCAL = 1 means a local/fictional nationality — don't display
  if (!normalized || nalocal === null || (!showLocal && nalocal !== 0)) return null;

  const tooltipTitle = resolvedName || normalized;

  return (
    <Tooltip title={tooltipTitle} placement="top">
      {src ? (
        <Box
          component="img"
          src={src}
          alt={tooltipTitle}
          sx={{
            height: '1em',
            width: 'auto',
            display: 'inline-block',
            verticalAlign: 'middle',
            objectFit: 'contain',
            borderRadius: '1px',
          }}
        />
      ) : (
        <Typography
          component="span"
          variant="inherit"
          sx={{ fontStyle: 'normal', verticalAlign: 'middle', fontSize: 'inherit' }}
        >
          {normalized}
        </Typography>
      )}
    </Tooltip>
  );
}
