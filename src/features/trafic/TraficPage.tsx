import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  LinearProgress,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import type { GridColDef } from '@mui/x-data-grid';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DateInputField } from '../../components/DateInputField';
import { toLocalIsoDate } from '../../components/dateUtils';
import { toErrorMessage } from '../../components/useEntityPage';
import { entityPath } from '../../lib/entityNavigation';
import { formatDateLong } from '../../lib/formatDate';
import { formatInteger } from '../../lib/formatNumber';
import { isAbortError } from '../../lib/httpErrors';
import { emitTabOpen } from '../../lib/useTabMetaEvents';
import {
  fetchTraficAppareils,
  fetchTraficPages,
  fetchTraficPays,
  fetchTraficReferents,
  fetchTraficResume,
  fetchTraficSerie,
  fetchTraficTempsReel,
  type TraficAppareils,
  type TraficFilters,
  type TraficGrain,
  type TraficPageRow,
  type TraficPaysRow,
  type TraficReferentRow,
  type TraficRepartitionItem,
  type TraficResume,
  type TraficSeriePoint,
  type TraficTempsReel,
} from './traficApi';
import { TraficServerGrid } from './TraficServerGrid';

type PeriodPreset = 'today' | '7d' | '30d' | '12m' | 'custom';

const DAY_MS = 24 * 60 * 60 * 1000;
const REALTIME_REFRESH_MS = 30_000;
const REALTIME_PAGE_LIMIT = 5;
const REPARTITION_MAX_SLICES = 5;
const CHART_LOCALE_TEXT = { noData: 'Aucune donnée sur la période', loading: 'Chargement…' };

const PRESET_LABELS: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'today', label: "Aujourd'hui" },
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '12m', label: '12 mois' },
  { value: 'custom', label: 'Personnalisée' },
];

const APPAREIL_LABELS: Record<string, string> = {
  desktop: 'Ordinateur',
  mobile: 'Mobile',
  tablet: 'Tablette',
};

const regionNames = new Intl.DisplayNames(['fr'], { type: 'region' });

function utcIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Bornes UTC d'une periode predefinie, aujourd'hui inclus. */
function presetRange(preset: Exclude<PeriodPreset, 'custom'>): { from: string; to: string } {
  const now = new Date();
  const [year, month, day] = [now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()];
  const to = utcIso(now);
  switch (preset) {
    case 'today':
      return { from: to, to };
    case '7d':
      return { from: utcIso(new Date(Date.UTC(year, month, day - 6))), to };
    case '30d':
      return { from: utcIso(new Date(Date.UTC(year, month, day - 29))), to };
    case '12m':
      return { from: utcIso(new Date(Date.UTC(year - 1, month, day + 1))), to };
  }
}

function dayCount(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
}

/** Instant d'un point de serie: minuit local du jour UTC pour le grain jour, instant reel pour le grain heure. */
function pointDate(t: string, grain: TraficGrain): Date {
  if (grain === 'heure') return new Date(t);
  const [year, month, day] = t.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatHour(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}h`;
}

function formatPointDate(date: Date, grain: TraficGrain, location: string): string {
  const dayLabel = formatDateLong(toLocalIsoDate(date));
  if (grain === 'jour') return dayLabel;
  if (location === 'tick' && date.getHours() !== 0) return formatHour(date);
  return `${dayLabel} ${formatHour(date)}`;
}

function formatRatio(value: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
}

function pagesPerVisit(pagesVues: number, visites: number): number {
  return visites > 0 ? pagesVues / visites : 0;
}

interface Evolution {
  label: string;
  color: 'success.main' | 'error.main' | 'text.secondary';
}

function evolution(current: number, previous: number): Evolution {
  if (previous === 0) {
    return current === 0
      ? { label: '= période précédente', color: 'text.secondary' }
      : { label: 'Nouveau (aucun précédent)', color: 'success.main' };
  }
  const pct = ((current - previous) / previous) * 100;
  const rounded = Math.round(pct * 10) / 10;
  if (rounded === 0) return { label: '0 % vs période précédente', color: 'text.secondary' };
  const sign = rounded > 0 ? '+' : '';
  return {
    label: `${sign}${rounded.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % vs période précédente`,
    color: rounded > 0 ? 'success.main' : 'error.main',
  };
}

function countryName(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return 'Inconnu';
  try {
    return regionNames.of(normalized) ?? normalized;
  } catch (error) {
    // Code hors norme ISO 3166: on affiche le code brut plutot que de casser la grille.
    if (error instanceof RangeError) return normalized;
    throw error;
  }
}

function repartitionData(items: TraficRepartitionItem[], labelOf: (valeur: string) => string) {
  const sorted = [...items].sort((a, b) => b.visites - a.visites);
  const head = sorted.slice(0, REPARTITION_MAX_SLICES);
  const othersTotal = sorted.slice(REPARTITION_MAX_SLICES).reduce((sum, item) => sum + item.visites, 0);
  const data = head.map((item, index) => ({ id: index, value: item.visites, label: labelOf(item.valeur) }));
  if (othersTotal > 0) data.push({ id: head.length, value: othersTotal, label: 'Autres' });
  return data;
}

const labelOrUnknown = (valeur: string) => valeur.trim() || 'Inconnu';
const appareilLabel = (valeur: string) => APPAREIL_LABELS[valeur] ?? labelOrUnknown(valeur);

function openPageEntity(row: TraficPageRow): void {
  if (!row.entityType || !row.entityId) return;
  emitTabOpen(entityPath(row.entityType, row.entityId, '/admin'), row.libelle || row.path);
}

const canOpenPageEntity = (row: TraficPageRow) => Boolean(row.entityType && row.entityId);

const integerColumn = { type: 'number', width: 110, valueFormatter: (value: number) => formatInteger(value) } as const;

const PAGE_COLUMNS: GridColDef<TraficPageRow>[] = [
  {
    field: 'libelle',
    headerName: 'Page',
    flex: 1,
    minWidth: 200,
    renderCell: (params) => (
      <Box component="span" title={params.row.path} sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {params.row.libelle || params.row.path}
      </Box>
    ),
  },
  { field: 'pagesVues', headerName: 'Pages vues', ...integerColumn },
  { field: 'visiteurs', headerName: 'Visiteurs', ...integerColumn },
];

const REFERENT_COLUMNS: GridColDef<TraficReferentRow>[] = [
  {
    field: 'referent',
    headerName: 'Référent',
    flex: 1,
    minWidth: 180,
    valueFormatter: (value: string) => value.trim() || 'Accès direct',
  },
  { field: 'visites', headerName: 'Visites', ...integerColumn },
  { field: 'visiteurs', headerName: 'Visiteurs', ...integerColumn },
];

const PAYS_COLUMNS: GridColDef<TraficPaysRow>[] = [
  {
    field: 'pays',
    headerName: 'Pays',
    flex: 1,
    minWidth: 160,
    valueFormatter: (value: string) => countryName(value),
  },
  { field: 'visites', headerName: 'Visites', ...integerColumn },
  { field: 'visiteurs', headerName: 'Visiteurs', ...integerColumn },
];

const getPageRowId = (row: TraficPageRow) => row.path;
const getReferentRowId = (row: TraficReferentRow) => row.referent;
const getPaysRowId = (row: TraficPaysRow) => row.pays;

interface KpiCardProps {
  label: string;
  value: string;
  evolution: Evolution | null;
}

function KpiCard({ label, value, evolution: delta }: KpiCardProps) {
  return (
    <Card>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>{value}</Typography>
        <Typography variant="caption" sx={{ color: delta?.color ?? 'text.secondary' }}>
          {delta?.label ?? ' '}
        </Typography>
      </CardContent>
    </Card>
  );
}

function RealtimeCard({ refreshKey }: { refreshKey: number }) {
  const [data, setData] = useState<TraficTempsReel | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let controller = new AbortController();
    const load = () => {
      controller.abort();
      controller = new AbortController();
      fetchTraficTempsReel(controller.signal)
        .then((result) => {
          setData(result);
          setErrorMessage('');
        })
        .catch((error: unknown) => {
          if (!isAbortError(error)) setErrorMessage(toErrorMessage(error));
        });
    };
    load();
    const intervalId = window.setInterval(load, REALTIME_REFRESH_MS);
    return () => {
      window.clearInterval(intervalId);
      controller.abort();
    };
  }, [refreshKey]);

  const pages = data?.pages.slice(0, REALTIME_PAGE_LIMIT) ?? [];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">Temps réel (5 min)</Typography>
          <Typography variant="caption" color="text.secondary">hors bots</Typography>
        </Stack>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {data ? `${formatInteger(data.visiteurs)} visiteur${data.visiteurs > 1 ? 's' : ''}` : '…'}
        </Typography>
        {errorMessage ? <Alert severity="error" sx={{ mt: 1 }}>{errorMessage}</Alert> : null}
        {pages.length > 0 ? (
          <List dense disablePadding aria-label="Pages consultées en temps réel">
            {pages.map((page) => (
              <ListItem key={page.path} disableGutters secondaryAction={<Typography variant="caption">{formatInteger(page.visiteurs)}</Typography>}>
                <ListItemText
                  primary={page.libelle || page.path}
                  slotProps={{ primary: { noWrap: true, title: page.path, variant: 'caption' } }}
                  sx={{ my: 0, pr: 4 }}
                />
              </ListItem>
            ))}
          </List>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface RepartitionChartProps {
  title: string;
  items: TraficRepartitionItem[] | undefined;
  labelOf: (valeur: string) => string;
  loading: boolean;
}

function RepartitionChart({ title, items, labelOf, loading }: RepartitionChartProps) {
  const data = useMemo(() => repartitionData(items ?? [], labelOf), [items, labelOf]);
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
        <Box sx={{ height: 200 }}>
          <PieChart
            series={[{ data, innerRadius: 35, outerRadius: 70, paddingAngle: 1, cornerRadius: 3 }]}
            loading={loading}
            localeText={CHART_LOCALE_TEXT}
            slotProps={{ tooltip: { trigger: 'item' } }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}

interface OverviewData {
  resume: TraficResume;
  serie: TraficSeriePoint[];
  grain: TraficGrain;
  appareils: TraficAppareils;
}

interface OverviewResult {
  /** Requete a laquelle correspond ce resultat: la page charge tant qu'elle differe de la requete courante. */
  requestKey: string;
  data: OverviewData | null;
  errorMessage: string;
}

/** Outils > Trafic: audience du site public. */
export function TraficPage() {
  const [preset, setPreset] = useState<PeriodPreset>('7d');
  const [customRange, setCustomRange] = useState(() => presetRange('7d'));
  const [bots, setBots] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [overviewResult, setOverviewResult] = useState<OverviewResult>({ requestKey: '', data: null, errorMessage: '' });

  // Recalcule a chaque rendu: une periode predefinie suit le changement de jour au rafraichissement.
  const range = preset === 'custom' ? customRange : presetRange(preset);
  const rangeValid = Boolean(range.from && range.to && range.from <= range.to);
  const { from, to } = range;
  const filters = useMemo<TraficFilters>(() => ({ from, to, bots }), [from, to, bots]);
  const grain: TraficGrain = rangeValid && dayCount(from, to) <= 2 ? 'heure' : 'jour';

  const requestKey = `${from}|${to}|${bots}|${grain}|${refreshKey}`;
  const loading = overviewResult.requestKey !== requestKey;
  const { data: overview, errorMessage } = overviewResult;

  useEffect(() => {
    if (!rangeValid) return undefined;
    const controller = new AbortController();
    Promise.all([
      fetchTraficResume(filters, controller.signal),
      fetchTraficSerie(filters, grain, controller.signal),
      fetchTraficAppareils(filters, controller.signal),
    ])
      .then(([resume, serie, appareils]) => setOverviewResult({
        requestKey,
        data: { resume, serie, grain, appareils },
        errorMessage: '',
      }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return;
        setOverviewResult({ requestKey, data: null, errorMessage: toErrorMessage(error) });
      });
    return () => controller.abort();
  }, [filters, grain, rangeValid, requestKey]);

  const handlePresetChange = (_event: unknown, next: PeriodPreset | null) => {
    if (!next) return;
    if (next === 'custom' && preset !== 'custom') setCustomRange(range);
    setPreset(next);
  };

  const chart = useMemo(() => {
    const points = overview?.serie ?? [];
    const pointGrain = overview?.grain ?? 'jour';
    return {
      grain: pointGrain,
      dates: points.map((point) => pointDate(point.t, pointGrain)),
      pagesVues: points.map((point) => point.pagesVues),
      visites: points.map((point) => point.visites),
      visiteurs: points.map((point) => point.visiteurs),
    };
  }, [overview]);

  const formatAxisDate = useCallback(
    (value: Date, context: { location: string }) => formatPointDate(value, chart.grain, context.location),
    [chart.grain],
  );

  const resume = overview?.resume;
  const previous = resume?.precedent;
  const kpis = resume && previous ? [
    { label: 'Pages vues', value: formatInteger(resume.pagesVues), evolution: evolution(resume.pagesVues, previous.pagesVues) },
    { label: 'Visites', value: formatInteger(resume.visites), evolution: evolution(resume.visites, previous.visites) },
    { label: 'Visiteurs', value: formatInteger(resume.visiteurs), evolution: evolution(resume.visiteurs, previous.visiteurs) },
    {
      label: 'Pages / visite',
      value: formatRatio(pagesPerVisit(resume.pagesVues, resume.visites)),
      evolution: evolution(
        pagesPerVisit(resume.pagesVues, resume.visites),
        pagesPerVisit(previous.pagesVues, previous.visites),
      ),
    },
  ] : [
    { label: 'Pages vues', value: '…', evolution: null },
    { label: 'Visites', value: '…', evolution: null },
    { label: 'Visiteurs', value: '…', evolution: null },
    { label: 'Pages / visite', value: '…', evolution: null },
  ];

  const periodLabel = rangeValid
    ? (from === to ? formatDateLong(from) : `Du ${formatDateLong(from)} au ${formatDateLong(to)}`)
    : '';

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Trafic</Typography>
        {periodLabel ? <Typography variant="body2" color="text.secondary">{periodLabel} (UTC)</Typography> : null}
      </Stack>

      <Card>
        <CardContent>
          <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={preset}
              onChange={handlePresetChange}
              aria-label="Période"
              sx={{ flexWrap: 'wrap' }}
            >
              {PRESET_LABELS.map((item) => (
                <ToggleButton key={item.value} value={item.value}>{item.label}</ToggleButton>
              ))}
            </ToggleButtonGroup>
            {preset === 'custom' ? (
              <>
                <DateInputField
                  label="Du"
                  value={customRange.from}
                  onChange={(value) => setCustomRange((current) => ({ ...current, from: value }))}
                  sx={{ width: 170 }}
                />
                <DateInputField
                  label="Au"
                  value={customRange.to}
                  onChange={(value) => setCustomRange((current) => ({ ...current, to: value }))}
                  sx={{ width: 170 }}
                />
              </>
            ) : null}
            <FormControlLabel
              control={<Checkbox size="small" checked={bots} onChange={(_event, checked) => setBots(checked)} />}
              label="Inclure les bots"
            />
            <Box sx={{ flex: 1 }} />
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<RefreshRoundedIcon />}
              onClick={() => setRefreshKey((key) => key + 1)}
              sx={{ color: 'text.primary', borderColor: 'divider' }}
            >
              Rafraîchir
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {!rangeValid ? (
        <Alert severity="warning">Saisissez une période valide : la date de début doit précéder ou égaler la date de fin.</Alert>
      ) : null}
      {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
      {rangeValid && loading ? <LinearProgress aria-label="Chargement du trafic" /> : null}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr) 1.4fr' },
          alignItems: 'stretch',
        }}
      >
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
        <Box sx={{ gridColumn: { xs: 'auto', sm: '1 / -1', lg: 'auto' } }}>
          <RealtimeCard refreshKey={refreshKey} />
        </Box>
      </Box>

      {rangeValid ? (
        <>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Évolution {chart.grain === 'heure' ? 'par heure' : 'par jour'}
              </Typography>
              <Box sx={{ height: 320 }}>
                <LineChart
                  xAxis={[{ data: chart.dates, scaleType: 'time', valueFormatter: formatAxisDate }]}
                  series={[
                    { data: chart.pagesVues, label: 'Pages vues', showMark: false, valueFormatter: (value) => formatInteger(value) },
                    { data: chart.visites, label: 'Visites', showMark: false, valueFormatter: (value) => formatInteger(value) },
                    { data: chart.visiteurs, label: 'Visiteurs', showMark: false, valueFormatter: (value) => formatInteger(value) },
                  ]}
                  loading={loading}
                  localeText={CHART_LOCALE_TEXT}
                />
              </Box>
            </CardContent>
          </Card>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' } }}>
            <RepartitionChart title="Appareils" items={overview?.appareils.appareils} labelOf={appareilLabel} loading={loading} />
            <RepartitionChart title="Navigateurs" items={overview?.appareils.navigateurs} labelOf={labelOrUnknown} loading={loading} />
            <RepartitionChart title="Systèmes" items={overview?.appareils.os} labelOf={labelOrUnknown} loading={loading} />
          </Box>

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr 1fr' } }}>
            <TraficServerGrid<TraficPageRow>
              title="Pages"
              filters={filters}
              refreshKey={refreshKey}
              fetchPage={fetchTraficPages}
              columns={PAGE_COLUMNS}
              getRowId={getPageRowId}
              onRowOpen={openPageEntity}
              canOpenRow={canOpenPageEntity}
            />
            <TraficServerGrid<TraficReferentRow>
              title="Référents"
              filters={filters}
              refreshKey={refreshKey}
              fetchPage={fetchTraficReferents}
              columns={REFERENT_COLUMNS}
              getRowId={getReferentRowId}
            />
            <TraficServerGrid<TraficPaysRow>
              title="Pays"
              filters={filters}
              refreshKey={refreshKey}
              fetchPage={fetchTraficPays}
              columns={PAYS_COLUMNS}
              getRowId={getPaysRowId}
            />
          </Box>
        </>
      ) : null}

      <Divider />
      <Typography variant="caption" color="text.secondary">
        Géolocalisation IP :{' '}
        <Link href="https://db-ip.com" target="_blank" rel="noopener noreferrer" color="inherit">DB-IP (https://db-ip.com)</Link>
        , licence CC BY 4.0
      </Typography>
    </Stack>
  );
}
