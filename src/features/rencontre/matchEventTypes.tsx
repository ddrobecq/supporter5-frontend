import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import HealingRoundedIcon from '@mui/icons-material/HealingRounded';
import ReportRoundedIcon from '@mui/icons-material/ReportRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import SquareRoundedIcon from '@mui/icons-material/SquareRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import TimerRoundedIcon from '@mui/icons-material/TimerRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';

/** Valeurs de EVENT.TYPE_EVENT. */
export const MatchEventType = {
  But: 1,
  Remplacement: 2,
  CartonJaune: 3,
  SecondJaune: 4,
  CartonRouge: 5,
  PenaltySiffle: 6,
  PenaltyMarque: 7,
  PenaltyManque: 8,
  Blessure: 9,
  TempsAdditionnel: 10,
} as const;

export type MatchEventTypeValue = (typeof MatchEventType)[keyof typeof MatchEventType];

export interface MatchEventTypeDef {
  value: MatchEventTypeValue;
  label: string;
  Icon: SvgIconComponent;
  color: string;
}

export const MATCH_EVENT_TYPES: readonly MatchEventTypeDef[] = [
  { value: MatchEventType.But,              label: 'But',                    Icon: SportsSoccerRoundedIcon, color: '#0f766e' },
  { value: MatchEventType.Remplacement,     label: 'Remplacement',           Icon: AutorenewRoundedIcon,    color: '#1d4ed8' },
  { value: MatchEventType.CartonJaune,      label: 'Carton Jaune',           Icon: SquareRoundedIcon,       color: '#eab308' },
  { value: MatchEventType.SecondJaune,      label: '2ème Jaune / Expulsion', Icon: ReportRoundedIcon,       color: '#ea580c' },
  { value: MatchEventType.CartonRouge,      label: 'Carton Rouge',           Icon: SquareRoundedIcon,       color: '#dc2626' },
  { value: MatchEventType.PenaltySiffle,    label: 'Penalty sifflé',         Icon: FlagRoundedIcon,         color: '#7c3aed' },
  { value: MatchEventType.PenaltyMarque,    label: 'Penalty marqué',         Icon: TaskAltRoundedIcon,      color: '#16a34a' },
  { value: MatchEventType.PenaltyManque,    label: 'Penalty manqué',         Icon: CancelRoundedIcon,       color: '#b91c1c' },
  { value: MatchEventType.Blessure,         label: 'Blessure',               Icon: HealingRoundedIcon,      color: '#be185d' },
  { value: MatchEventType.TempsAdditionnel, label: 'Temps additionnel',      Icon: TimerRoundedIcon,        color: '#475569' },
];

const MATCH_EVENT_TYPE_BY_VALUE = new Map<number, MatchEventTypeDef>(MATCH_EVENT_TYPES.map((def) => [def.value, def]));

/** Rendu d'un type d'événement ; fallback neutre pour un type inconnu. */
export function getMatchEventVisual(typeEvent: number): { Icon: SvgIconComponent; color: string; backgroundColor: string } {
  const def = MATCH_EVENT_TYPE_BY_VALUE.get(typeEvent);
  if (!def) {
    return { Icon: FlagRoundedIcon, color: '#4b5563', backgroundColor: 'action.hover' };
  }
  return { Icon: def.Icon, color: def.color, backgroundColor: alpha(def.color, 0.15) };
}
