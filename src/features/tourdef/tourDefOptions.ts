export type SortDirection = '+' | '-';

export interface SortFieldOption {
  field: string;
  label: string;
}

export const FIN_TIME_REG_OPTIONS = [
  { value: 1, label: 'Fin du match' },
  { value: 2, label: 'Prolongation' },
  { value: 3, label: 'Match rejoué' },
  { value: 4, label: 'Tirage au sort' },
];

export const FIN_PROLONG_OPTIONS = [
  { value: 1, label: 'But en Or' },
  { value: 2, label: 'But en Argent' },
  { value: 3, label: 'Tirs au but' },
  { value: 4, label: 'Rejoué' },
  { value: 5, label: 'Tirage au sort' },
];

export const BONUS_TYPE_OPTIONS = [
  { value: 1, label: 'Aucun' },
  { value: 2, label: 'sur nombre de buts marqués (bonus si supérieur ou égal)' },
  { value: 3, label: 'sur différence de buts (bonus si supérieur ou égal)' },
  { value: 4, label: 'sur nombre de buts marqués (bonus par but)' },
];

export const PARTICIP_SORT_FIELD_OPTIONS: SortFieldOption[] = [
  { field: 'PANbPoints', label: 'Points' },
  { field: 'PANbMatch', label: 'Nombre de matchs' },
  { field: 'PANbVD', label: 'Victoires domicile' },
  { field: 'PANbVE', label: 'Victoires extérieur' },
  { field: 'PANbND', label: 'Nuls domicile' },
  { field: 'PANbNE', label: 'Nuls extérieur' },
  { field: 'PANbDD', label: 'Défaites domicile' },
  { field: 'PANbDE', label: 'Défaites extérieur' },
  { field: 'PANbBPD', label: 'Buts pour domicile' },
  { field: 'PANbBCD', label: 'Buts contre domicile' },
  { field: 'PABonus', label: 'Bonus' },
  { field: 'PANbBPE', label: 'Buts pour extérieur' },
  { field: 'PANbBCE', label: 'Buts contre extérieur' },
  { field: 'PADiff', label: 'Différence de buts' },
  { field: 'PANbBP', label: 'Buts pour' },
  { field: 'PANbV', label: 'Victoires totales' },
  { field: 'PANbTaBP', label: 'TAB pour' },
  { field: 'PANbTaBC', label: 'TAB contre' },
  { field: 'PADiffTaB', label: 'Différence TAB' },
  { field: 'PANbBC', label: 'Buts contre' },
  { field: 'PARatio', label: 'Ratio BP / BC' },
];

export function getSortFieldLabel(field: string): string {
  return PARTICIP_SORT_FIELD_OPTIONS.find((item) => item.field === field)?.label ?? field;
}

export function normalizeSortBusinessLabel(label: string): string {
  return String(label ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeSortTechnicalField(field: string): string {
  return String(field ?? '')
    .replace(/[^A-Za-z0-9_]/g, '')
    .trim();
}

export function buildSortKeyFromRules(rules: Array<{ field: string; direction: SortDirection }>): string {
  return rules
    .map((rule) => {
      const direction: SortDirection = rule.direction === '+' ? '+' : '-';
      const businessLabel = normalizeSortBusinessLabel(getSortFieldLabel(rule.field));
      const technicalField = normalizeSortTechnicalField(rule.field);
      // Compat format kept intentionally: +/-Nom metier<TAB>Nom technique
      return `${direction}${businessLabel}\t${technicalField}`;
    })
    .join('\n');
}

export function parseNumericInput(rawValue: string): number | '' {
  if (rawValue.trim() === '') return '';
  const parsed = Number(rawValue);
  return Number.isNaN(parsed) ? '' : parsed;
}

export function toNumberOrDefault(value: number | '', fallback: number): number {
  if (value === '' || Number.isNaN(value)) return fallback;
  return Number(value);
}
