import { PITCH_SLOTS } from '../../components/PitchField';
import { RENCONTRE_INCOMPLETE_CATEGORIES } from '../incomplets/incompletsApi';
import type { CompositionMap, RencontreHighlightEventRow } from './types';

const REMP_CODES = Array.from({ length: 11 }, (_, index) => `REMP${index + 1}`);
const STARTERS_EXPECTED = 11;

/** Categories d'incompletude qui ne correspondent a aucun champ de la fiche (controles de coherence inter-enregistrements). */
const EXCLUDED_CATEGORY_KEYS = new Set(['clubs', 'desynchro']);

function isGoalEvent(event: RencontreHighlightEventRow): boolean {
  return event.TYPE_EVENT === 1 || (event.TYPE_EVENT === 7 && Number(event.PERIODE ?? 0) !== 5);
}

function isCompositionSlotFilled(value: string | null | undefined): boolean {
  return Boolean(String(value ?? '').trim());
}

export interface RencontreCompletenessInput {
  etat: number;
  /** Date de la rencontre au format ISO (YYYY-MM-DD), pour le controle "score inconnu". */
  dateIso: string | null;
  arbitreId: string;
  terrainId: string;
  nbSpect: number;
  houseClosed: boolean;
  butDom: number;
  butExt: number;
  supportedClubSide: 'home' | 'away' | 'none';
  composition: CompositionMap | null;
  events: RencontreHighlightEventRow[] | null;
}

export interface RencontreMissingItem {
  key: string;
  label: string;
}

/**
 * Miroir cote front des regles de back/src/services/incomplets.service.ts (getRencontresIncompletes),
 * limite aux criteres correspondant a un champ de la fiche (arbitre, terrain, composition, score, evenements).
 * "Clubs incoherents" et "Desynchro RENCO/MATCH" restent reserves a Outils > Fiches incompletes.
 */
export function getRencontreCompleteness(input: RencontreCompletenessInput): RencontreMissingItem[] {
  const played = Number(input.etat) === 3;
  const events = input.events ?? [];
  const composition = input.composition ?? {};

  const goalEvents = events.filter(isGoalEvent);
  const expectedGoals = input.butDom + input.butExt;
  const expectedSupportedGoals = input.supportedClubSide === 'home'
    ? input.butDom
    : input.supportedClubSide === 'away'
      ? input.butExt
      : 0;
  const recordedSupportedGoals = goalEvents.filter((event) => Number(event.ADVERSAIRE ?? 0) === 0).length;

  const starterValues = PITCH_SLOTS
    .map((slot) => composition[slot.code])
    .filter(isCompositionSlotFilled);
  const subValues = REMP_CODES
    .map((code) => composition[code])
    .filter(isCompositionSlotFilled);
  const hasDuplicatePlayer = new Set([...starterValues, ...subValues]).size !== starterValues.length + subValues.length;
  const effectifKo = played && (starterValues.length !== STARTERS_EXPECTED || hasDuplicatePlayer);
  const todayIso = new Date().toISOString().slice(0, 10);

  const flags: Record<string, boolean> = {
    arbitre: played && !input.arbitreId.trim(),
    terrain: played && !input.terrainId.trim(),
    entraineur: played && !isCompositionSlotFilled(composition.ENTRAINEUR),
    effectif: effectifKo,
    score: Number(input.etat) === 1 && Boolean(input.dateIso?.trim()) && (input.dateIso as string) < todayIso,
    spectateurs: played && !input.houseClosed && input.nbSpect === 0,
    buteurs: played && goalEvents.length !== expectedGoals,
    'buteurs-club': played && recordedSupportedGoals !== expectedSupportedGoals,
    'minutes-buts': played && goalEvents.some((event) => Number(event.MINUTE ?? 0) <= 0),
    remplacements: played && events.some((event) => (
      event.TYPE_EVENT === 2
      && Number(event.ADVERSAIRE ?? 0) === 0
      && (!String(event.JOUEUR1 ?? '').trim() || !String(event.JOUEUR2 ?? '').trim() || Number(event.MINUTE ?? 0) <= 0)
    )),
  };

  return RENCONTRE_INCOMPLETE_CATEGORIES
    .filter((category) => !EXCLUDED_CATEGORY_KEYS.has(category.key) && flags[category.key])
    .map((category) => ({ key: category.key, label: category.label }));
}
