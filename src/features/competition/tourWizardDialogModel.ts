import { toIsoDate } from '../../components/dateUtils';
import type { CompetitionTourDetailRow } from './types';

export type TourType = 'ligue' | 'eliminatoire';
export type SelectionMode = 'tirage' | 'programmation';

export interface TourDraft {
  id: number;
  tourDefKey: number;
  nom: string;
  type: TourType;
  participants: number;
  final: boolean;
  selectionMode: SelectionMode;
  dateTirage: string;
  heureTirage: string;
  dateDebut: string;
  dateFin: string;
  heureMatches: string;
  ordre: number;
  nbEquipe: number;
  nbGroupe: number;
  nbMatch: number;
}

export function toDisplayTime(value: string | null | undefined): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const match = text.match(/^(\d{2}):(\d{2})/);
  if (!match) return '';
  return `${match[1]}:${match[2]}`;
}

export function mapTourTypeFromDb(tourDefType: number | undefined): TourType {
  return Number(tourDefType) === 2 ? 'eliminatoire' : 'ligue';
}

export function mapTourTypeToDb(type: TourType): number {
  return type === 'eliminatoire' ? 2 : 1;
}

export function createDefaultDraft(proposedOrder: number): TourDraft {
  return {
    id: 0,
    tourDefKey: 1,
    nom: '',
    type: 'ligue',
    participants: 2,
    final: false,
    selectionMode: 'programmation',
    dateTirage: '',
    heureTirage: '',
    dateDebut: '',
    dateFin: '',
    heureMatches: '',
    ordre: proposedOrder,
    nbEquipe: 0,
    nbGroupe: 0,
    nbMatch: 0,
  };
}

export function createDraftFromDetail(source: CompetitionTourDetailRow): TourDraft {
  const participants = Number(source.NB_PARTICIPANTS ?? 2) || 2;
  const type = mapTourTypeFromDb(Number(source.TDTYPETOUR ?? 1));
  const isFinal = Number(source.TU_FINAL ?? 0) === 1;
  const hasTirageValues = String(source.TU_DATETIRAGE ?? '').trim().length > 0
    || String(source.TU_HEURETIRAGE ?? '').trim().length > 0;

  return {
    id: Number(source.TUCLEUNIK ?? 0),
    tourDefKey: Number(source.TDCLEUNIK ?? 1) || 1,
    nom: String(source.NOM ?? ''),
    type,
    participants,
    final: isFinal,
    selectionMode: hasTirageValues ? 'tirage' : 'programmation',
    dateTirage: toIsoDate(source.TU_DATETIRAGE),
    heureTirage: toDisplayTime(source.TU_HEURETIRAGE as string | null | undefined),
    dateDebut: toIsoDate(source.DATE_DEBUT),
    dateFin: toIsoDate(source.DATE_FIN),
    heureMatches: toDisplayTime(source.TUHEURE as string | null | undefined),
    ordre: Number(source.TU_ORDRE ?? 1) || 1,
    nbEquipe: Number(source.NB_EQUIPE ?? 0) || 0,
    nbGroupe: Number(source.NB_GROUPE ?? 0) || 0,
    nbMatch: Number(source.NB_MATCH ?? 0) || 0,
  };
}
