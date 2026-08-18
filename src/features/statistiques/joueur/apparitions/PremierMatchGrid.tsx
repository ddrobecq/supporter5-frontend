'use client';

import { Avatar, Link as MuiLink, Stack, Typography } from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { NatioFlag } from '../../../../components/NatioFlag';
import { useEntityImage } from '../../../../lib/useEntityImage';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { fetchDernierMatch, fetchPremierMatch, type PremierMatchRow } from './premierMatchApi';

interface PremierMatchWithAge extends PremierMatchRow {
  AGE_SORT: number;
}

/**
 * Calculate age in years, months, days from birth date and appearance date.
 * Dates can be in YYYY-MM-DD or YYYYMMDD format.
 */
function calculateAge(birthDateStr: string, appearanceDateStr: string): { years: number; months: number; days: number } {
  // Parse dates handling both YYYY-MM-DD and YYYYMMDD formats
  const parseDate = (dateStr: string) => {
    if (dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-').map(x => parseInt(x, 10));
      return { year, month, day };
    } else {
      return {
        year: parseInt(dateStr.substring(0, 4), 10),
        month: parseInt(dateStr.substring(4, 6), 10),
        day: parseInt(dateStr.substring(6, 8), 10),
      };
    }
  };

  const birth = parseDate(birthDateStr);
  const appearance = parseDate(appearanceDateStr);

  let years = appearance.year - birth.year;
  let months = appearance.month - birth.month;
  let days = appearance.day - birth.day;

  if (days < 0) {
    months -= 1;
    const daysInPrevMonth = new Date(appearance.year, appearance.month, 0).getDate();
    days += daysInPrevMonth;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  return { years, months, days };
}

/**
 * Format date from YYYY-MM-DD or YYYYMMDD to DD/MM/YYYY
 */
function formatDateDisplay(dateStr: string): string {
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${day}/${month}/${year}`;
}

const VALUE_COLUMNS: GridColDef<PremierMatchWithAge>[] = [
  { field: 'AGE_SORT', headerName: 'Tri âge', sortable: true },
  {
    field: 'FIRST_DATE',
    headerName: 'Joueurs',
    flex: 1,
    minWidth: 420,
    sortable: false,
    renderCell: (params) => {
      const row = params.row as PremierMatchWithAge;
      if (!row || !row.NAISSANCE || !row.FIRST_DATE) return null;
      return <PremierMatchCell row={row} />;
    },
  },
];

function PremierMatchCell({ row }: { row: PremierMatchWithAge }) {
  const { src } = useEntityImage('joueurrg', row.IDJOUEUR);
  const age = calculateAge(row.NAISSANCE, row.FIRST_DATE);
  const dateDisplay = formatDateDisplay(row.FIRST_DATE);
  const surnom = row.SURNOM?.trim();
  const nom = row.NOM?.trim() ? row.NOM.toUpperCase() : '';
  const prenom = row.PRENOM?.trim() ?? '';
  const nomJoueur = surnom || `${nom}${prenom ? ` ${prenom}` : ''}` || row.IDJOUEUR;

  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
      <Avatar src={src ?? undefined} sx={{ width: 30, height: 30, bgcolor: 'grey.300', flexShrink: 0 }}>
        {!src && <PersonRoundedIcon sx={{ fontSize: 17 }} />}
      </Avatar>
      {row.IDNATIO ? <NatioFlag idnatio={row.IDNATIO} /> : null}
      <Typography variant="body2" sx={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <b>{nomJoueur}</b>
        {' à l\'âge de '}
        {age.years} ans, {age.months} mois et {age.days} jours
        {' le '}
        <MuiLink
          component="button"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            window.dispatchEvent(new CustomEvent('supporter:tab-open', {
              detail: {
                path: `/admin/rencontres/${encodeURIComponent(String(row.RECLEUNIK ?? ''))}`,
                label: 'Rencontre',
                unique: true,
                uniqueByPath: true,
              },
            }));
          }}
          sx={{ cursor: 'pointer', textDecoration: 'underline', color: 'inherit', font: 'inherit', verticalAlign: 'baseline' }}
        >
          {dateDisplay}
        </MuiLink>
      </Typography>
    </Stack>
  );
}

/** Joueur > Apparitions > Premier match: First appearance on team sheet with age at debut. */
interface AppearanceGridProps {
  latest?: boolean;
}

export function PremierMatchGrid({ latest = false }: AppearanceGridProps) {
  const [rows, setRows] = useState<PremierMatchWithAge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    (latest ? fetchDernierMatch : fetchPremierMatch)(controller.signal)
      .then((data) => {
        const withAge = data.map((row) => {
          const age = calculateAge(row.NAISSANCE, row.FIRST_DATE);
          return { ...row, AGE_SORT: age.years * 10000 + age.months * 100 + age.days };
        });
        setRows(withAge);
      })
      .catch((err) => {
        console.error('PremierMatchGrid: Error fetching data:', err);
        setRows([]);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [latest]);

  return (
    <StatPlayerGrid<PremierMatchWithAge>
      rows={rows}
      valueColumns={VALUE_COLUMNS}
      loading={loading}
      getRowId={(row) => row.IDJOUEUR}
      hideIdentityColumn
      initialState={{
        sorting: { sortModel: [{ field: 'AGE_SORT', sort: latest ? 'desc' : 'asc' }] },
        columns: { columnVisibilityModel: { AGE_SORT: false } },
      }}
    />
  );
}

export function DernierMatchGrid() {
  return <PremierMatchGrid latest />;
}
