import { Link as MuiLink } from '@mui/material';
import { formatDateLong } from '../../../lib/formatDate';
import { emitTabOpen } from '../../../lib/useTabMetaEvents';

/** Date d'une rencontre, cliquable: ouvre la fiche dans un onglet interne. */
export function RencontreDateLink({ date, recleunik }: { date: string; recleunik: number | string | null | undefined }) {
  return (
    <MuiLink
      component="button"
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        emitTabOpen(`/admin/rencontres/${encodeURIComponent(String(recleunik ?? ''))}`, 'Rencontre');
      }}
      sx={{ cursor: 'pointer', textDecoration: 'underline', color: 'inherit', font: 'inherit', verticalAlign: 'baseline' }}
    >
      {formatDateLong(date)}
    </MuiLink>
  );
}
