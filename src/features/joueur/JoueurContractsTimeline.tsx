import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { ClubIdentityInline } from '../../components/ClubIdentityInline';
import { formatMoney } from '../../lib/formatMoney';
import type { JoueurTransactionRow } from './types';

interface JoueurContractsTimelineProps {
  rows: JoueurTransactionRow[];
  loading?: boolean;
  selectedTransactionId?: number | null;
  onSelectTransaction?: (transactionId: number) => void;
  onTransactionDoubleClick?: (transactionId: number) => void;
}

function formatDate(value: string): string {
  const text = String(value ?? '').trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!iso) return text;
  return `${iso[3]}/${iso[2]}/${iso[1]}`;
}

function normalizeLabel(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

const formatMoneyForSummary = formatMoney;

function isTransferTransaction(row: JoueurTransactionRow): boolean {
  const label = normalizeLabel(row.TYT_LIBELLE);
  return label.includes('transfert');
}

function isContractTransaction(row: JoueurTransactionRow): boolean {
  const label = normalizeLabel(row.TYT_LIBELLE);
  return label.includes('contrat');
}

function isLoanTransaction(row: JoueurTransactionRow): boolean {
  return Number(row.TYPE) === 3;
}

function getStatusPhrase(row: JoueurTransactionRow): string {
  const status = Number(row.STATUT);
  return status === 1
    ? String(row.TYT_PHRASE_DEPART ?? '').trim()
    : status === 2
      ? String(row.TYT_PHRASE_ARRIVEE ?? '').trim()
      : String(row.TYT_PHRASE_NEUTRE ?? '').trim();
}

function getStatusMeta(row: JoueurTransactionRow): {
  icon: typeof ArrowForwardRoundedIcon;
  sx: SxProps<Theme>;
} {
  const isLoan = Number(row.TYPE) === 3;
  const status = Number(row.STATUT);

  if (status === 2 && isLoan) {
    return {
      icon: CompareArrowsRoundedIcon,
      sx: { bgcolor: '#e3f2fd', color: '#1565c0' },
    };
  }
  if (status === 1 && isLoan) {
    return {
      icon: CompareArrowsRoundedIcon,
      sx: { bgcolor: '#fff3e0', color: '#ef6c00' },
    };
  }
  if (status === 2) {
    return {
      icon: ArrowForwardRoundedIcon,
      sx: { bgcolor: '#e8f0fe', color: '#1e5bd9' },
    };
  }
  if (status === 1) {
    return {
      icon: ArrowBackRoundedIcon,
      sx: { bgcolor: '#fff3e0', color: '#ef6c00' },
    };
  }
  if (status === 3) {
    return {
      icon: DescriptionRoundedIcon,
      sx: { bgcolor: '#f3e5f5', color: '#6a1b9a' },
    };
  }
  return {
    icon: DescriptionRoundedIcon,
    sx: { bgcolor: '#eceff1', color: '#455a64' },
  };
}

function buildSummary(row: JoueurTransactionRow): string {
  const phrase = getStatusPhrase(row);
  return phrase || String(row.TYT_LIBELLE ?? '').trim() || `Type ${row.TYPE}`;
}

function buildSummaryWithEcheance(row: JoueurTransactionRow): string {
  const base = buildSummary(row);
  const echeance = formatDate(String(row.TN_ECHEANCE ?? '').trim());
  if (!echeance) return base;
  return `${base} jusqu'au ${echeance}`;
}

const TRAILING_PREPOSITIONS = ['en provenance de', 'à', 'au', 'par', 'vers'];

function splitTrailingPreposition(phrase: string): { base: string; preposition: string } {
  const trimmed = phrase.trim();
  for (const preposition of TRAILING_PREPOSITIONS) {
    if (trimmed.toLowerCase().endsWith(` ${preposition}`)) {
      return { base: trimmed.slice(0, trimmed.length - preposition.length).trim(), preposition };
    }
  }
  return { base: trimmed, preposition: '' };
}

export function JoueurContractsTimeline({
  rows,
  loading = false,
  selectedTransactionId = null,
  onSelectTransaction,
  onTransactionDoubleClick,
}: JoueurContractsTimelineProps) {
  if (loading) {
    return (
      <Box sx={{ minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
          <CircularProgress size={18} />
          <Typography variant="body2">Chargement des transactions...</Typography>
        </Stack>
      </Box>
    );
  }

  if (!rows.length) {
    return (
      <Box
        sx={{
          minHeight: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 1,
          color: 'text.secondary',
          px: 2,
          textAlign: 'center',
        }}
      >
        <Typography variant="body2">Aucune transaction pour ce joueur.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.25 }}>
      <Stack spacing={1.5}>
        {rows.map((row, index) => {
          const statusMeta = getStatusMeta(row);
          const StatusIcon = statusMeta.icon;
          const hasClub = Boolean(String(row.IDCLUB ?? '').trim() || String(row.CLUB_NOM ?? '').trim());
          const isSelected = Number(selectedTransactionId ?? 0) === Number(row.TNCLEUNIK);
          const transferPhrase = getStatusPhrase(row);
          const transferIndemnites = formatMoneyForSummary(row.INDEMNITES, row.DEVISE_SYMBOLE);
          const showTransferAmountAfterClub = Boolean(
            isTransferTransaction(row)
            && transferPhrase
            && transferIndemnites,
          );
          const showLoanAmountAfterClub = Boolean(
            isLoanTransaction(row)
            && transferPhrase
            && transferIndemnites,
          );
          const isLoan = isLoanTransaction(row);
          const { base: loanBase, preposition: loanPreposition } = isLoan
            ? splitTrailingPreposition(transferPhrase)
            : { base: '', preposition: '' };
          const loanEcheance = formatDate(String(row.TN_ECHEANCE ?? '').trim());
          const loanPhraseBeforeClub = loanEcheance ? `${loanBase} jusqu'au ${loanEcheance}` : loanBase;
          const phraseBeforeClub = isLoan
            ? loanPhraseBeforeClub
            : showTransferAmountAfterClub
              ? transferPhrase
              : buildSummaryWithEcheance(row);
          const contractPhrase = getStatusPhrase(row);
          const contractSalary = formatMoneyForSummary(row.SALAIRE, row.DEVISE_SYMBOLE);
          const showContractAmount = Boolean(
            isContractTransaction(row)
            && contractPhrase
            && contractSalary,
          );

          return (
            <Box
              key={row.TNCLEUNIK}
              onClick={() => onSelectTransaction?.(Number(row.TNCLEUNIK))}
              onDoubleClick={() => onTransactionDoubleClick?.(Number(row.TNCLEUNIK))}
              sx={{
                display: 'grid',
                gridTemplateColumns: '18px 1fr',
                columnGap: 1.25,
                p: 0.5,
                borderRadius: 1,
                cursor: 'pointer',
                bgcolor: isSelected ? 'action.selected' : 'transparent',
                outline: isSelected ? '1px solid' : 'none',
                outlineColor: isSelected ? 'primary.light' : 'transparent',
                transition: 'background-color 120ms ease-out, outline-color 120ms ease-out',
                '&:hover': { bgcolor: isSelected ? 'action.selected' : 'action.hover' },
              }}
            >
              <Box sx={{ position: 'relative', pt: '6px' }}>
                <Box
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    mx: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...statusMeta.sx,
                  }}
                >
                  <StatusIcon sx={{ fontSize: 15 }} />
                </Box>
                {index < rows.length - 1 ? (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      top: '32px',
                      bottom: '-4px',
                      width: 2,
                      bgcolor: 'divider',
                    }}
                  />
                ) : null}
              </Box>

              <Stack spacing={0.5}>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{formatDate(row.DATE)}</Typography>
                </Stack>

                {hasClub ? (
                  <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {phraseBeforeClub}
                    </Typography>
                    {isLoan && loanPreposition ? (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {loanPreposition}
                      </Typography>
                    ) : null}
                    <ClubIdentityInline
                      clubId={row.IDCLUB}
                      clubName={row.CLUB_NOM}
                      size={22}
                    />
                    {showTransferAmountAfterClub || showLoanAmountAfterClub ? (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {`pour ${transferIndemnites}`}
                      </Typography>
                    ) : null}
                    {!showTransferAmountAfterClub && !showLoanAmountAfterClub && showContractAmount ? (
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {`pour ${contractSalary} de salaire mensuel`}
                      </Typography>
                    ) : null}
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {showTransferAmountAfterClub
                      ? `${transferPhrase} pour ${transferIndemnites}`
                      : showLoanAmountAfterClub
                        ? `${loanPhraseBeforeClub} pour ${transferIndemnites}`
                        : showContractAmount
                          ? `${buildSummaryWithEcheance(row)} pour ${contractSalary} de salaire mensuel`
                          : isLoan
                            ? loanPhraseBeforeClub
                            : buildSummaryWithEcheance(row)}
                  </Typography>
                )}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
