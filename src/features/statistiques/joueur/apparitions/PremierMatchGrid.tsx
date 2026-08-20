'use client';

import type { GridColDef } from '@mui/x-data-grid';
import { useEffect, useState } from 'react';
import { RencontreDateLink } from '../../components/RencontreDateLink';
import { StatPlayerGrid } from '../../components/StatPlayerGrid';
import { StatPlayerSentence } from '../../components/StatPlayerSentence';
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
  const age = calculateAge(row.NAISSANCE, row.FIRST_DATE);

  return (
    <StatPlayerSentence joueur={row}>
      {' à l\'âge de '}
      {age.years} ans, {age.months} mois et {age.days} jours
      {' le '}
      <RencontreDateLink date={row.FIRST_DATE} recleunik={row.RECLEUNIK} />
    </StatPlayerSentence>
  );
}

/** Joueur > Apparitions > Premier match: First appearance on team sheet with age at debut. */
interface AppearanceGridProps {
  latest?: boolean;
}

export function PremierMatchGrid({ latest = false }: AppearanceGridProps) {
  const [rows, setRows] = useState<PremierMatchWithAge[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (latest ? fetchDernierMatch : fetchPremierMatch)(scope, controller.signal)
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
  }, [latest, scope]);

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
      scope={scope}
      onScopeChange={setScope}
    />
  );
}

export function DernierMatchGrid() {
  return <PremierMatchGrid latest />;
}
