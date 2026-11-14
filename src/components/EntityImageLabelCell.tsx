import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { useEntityImage } from '../lib/useEntityImage';

interface EntityImageLabelCellProps {
  /** Key of IMAGE_CONFIGS on the backend ('club', 'joueurrg', 'arbitre', 'competition'...). */
  entityType: string;
  entityId: string | number | null | undefined;
  label: ReactNode;
  /** Optional content rendered after the label (e.g. a flag). */
  children?: ReactNode;
}

// Grid cell with a decorative image left of the label. The 22px box (same size as ClubCell)
// fits inside a compact row without growing it; it stays empty when there is no image.
export function EntityImageLabelCell({ entityType, entityId, label, children }: EntityImageLabelCellProps) {
  const { src } = useEntityImage(entityType, entityId);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%', minWidth: 0 }}>
      <Box sx={{ width: 22, height: 22, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {src && (
          <Box component="img" src={src} alt="" sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        )}
      </Box>
      <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</Box>
      {children}
    </Box>
  );
}
