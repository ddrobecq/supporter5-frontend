import { PITCH_SLOTS } from '../../components/pitchSlots';
import { todayIso as getTodayIso } from '../../components/dateUtils';
import { RENCONTRE_INCOMPLETE_CATEGORIES } from '../incomplets/incompletsApi';
import { MatchEventType } from './matchEventTypes';
import type { CompositionMap, RencontreHighlightEventRow } from './types';

const REMP_CODES = Array.from({ length: 11 }, (_, index) => `REMP${index + 1}`);
const STARTERS_EXPECTED = 11;

/** Categories d'incompletude qui ne correspondent a aucun champ de la fiche (controles de coherence inter-enregistrements). */
const EXCLUDED_CATEGORY_KEYS = new Set(['clubs', 'desynchro']);

function isGoalEvent(event: RencontreHighlightEventRow): boolean {
  return event.TYPE_EVENT === MatchEventType.But || (event.TYPE_EVENT === MatchEventType.PenaltyMarque && Number(event.PERIODE ?? 0) !== 5);
}

function isCompositionSlotFilled(value: string | null | undefined): boolean {
  return Boolean(String(value ?? '').trim());
}

/** Types d'evenement ne citant pas un joueur de la compo (exclus du controle "joueur hors effectif"). */
const EVENT_TYPES_WITHOUT_PLAYER = new Set<number>([MatchEventType.PenaltySiffle, MatchEventType.TempsAdditionnel]);
/** Buts et penaltys marques: JOUEUR2 designe le passeur. */
const EVENT_TYPES_WITH_ASSIST = new Set<number>([MatchEventType.But, MatchEventType.PenaltyMarque]);
/** Code joueur reserve au but contre son camp. */
const OWN_GOAL_PLAYER_CODE = '0000';

function readPlayerCode(value: string | null | undefined): string {
  return String(value ?? '').trim();
}

/**
 * Miroir de getEventIssuesByMatch (back): evenements du club supporte incoherents avec la compo
 * (si au moins un titulaire). Retourne une ligne "<minute>' <texte> — <motifs>" par evenement fautif.
 */
function getEventIssueDetails(events: RencontreHighlightEventRow[], composition: CompositionMap): string[] {
  const starters = new Set(PITCH_SLOTS.map((slot) => readPlayerCode(composition[slot.code])).filter(Boolean));
  if (starters.size === 0) return [];
  const subs = new Set(REMP_CODES.map((code) => readPlayerCode(composition[code])).filter(Boolean));
  const coach = readPlayerCode(composition.ENTRAINEUR);
  const supportedEvents = events.filter((event) => Number(event.ADVERSAIRE ?? 0) === 0);

  const incomingPlayers = new Set(supportedEvents
    .filter((event) => event.TYPE_EVENT === MatchEventType.Remplacement)
    .map((event) => readPlayerCode(event.JOUEUR2))
    .filter(Boolean));

  const isUnknownPlayer = (code: string): boolean => Boolean(code)
    && code !== OWN_GOAL_PLAYER_CODE
    && code !== coach
    && !starters.has(code)
    && !subs.has(code)
    && !incomingPlayers.has(code);

  return supportedEvents.flatMap((event) => {
    const reasons: string[] = [];
    const player1 = readPlayerCode(event.JOUEUR1);
    const player2 = readPlayerCode(event.JOUEUR2);

    if (event.TYPE_EVENT === MatchEventType.Remplacement && player2) {
      if (starters.has(player2)) reasons.push('entrant déjà titulaire');
      if (subs.size > 0 && !subs.has(player2)) reasons.push('entrant absent des remplaçants');
      if (player1 === player2) reasons.push('sortant = entrant');
    }
    if (!EVENT_TYPES_WITHOUT_PLAYER.has(event.TYPE_EVENT) && (
      isUnknownPlayer(player1) || (EVENT_TYPES_WITH_ASSIST.has(event.TYPE_EVENT) && isUnknownPlayer(player2))
    )) {
      reasons.push('joueur hors effectif');
    }

    return reasons.length > 0 ? [`${event.MINUTE}' ${event.TEXT} — ${reasons.join(', ')}`] : [];
  });
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
  /** Detail des anomalies (categorie "evenements" : une ligne par evenement fautif). */
  details?: string[];
}

/**
 * Miroir cote front des regles de back/src/services/incomplets.service.ts (getRencontresIncompletes),
 * limite aux criteres correspondant a un champ de la fiche (arbitre, terrain, composition, score, evenements).
 * "Evenements incoherents" (miroir de getEventIssuesByMatch) porte en `details` la liste des evenements fautifs.
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
  const todayIso = getTodayIso();
  const eventIssueDetails = played ? getEventIssueDetails(events, composition) : [];

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
      event.TYPE_EVENT === MatchEventType.Remplacement
      && Number(event.ADVERSAIRE ?? 0) === 0
      && (!String(event.JOUEUR1 ?? '').trim() || !String(event.JOUEUR2 ?? '').trim() || Number(event.MINUTE ?? 0) <= 0)
    )),
    evenements: eventIssueDetails.length > 0,
  };

  return RENCONTRE_INCOMPLETE_CATEGORIES
    .filter((category) => !EXCLUDED_CATEGORY_KEYS.has(category.key) && flags[category.key])
    .map((category) => (category.key === 'evenements'
      ? { key: category.key, label: category.label, details: eventIssueDetails }
      : { key: category.key, label: category.label }));
}
