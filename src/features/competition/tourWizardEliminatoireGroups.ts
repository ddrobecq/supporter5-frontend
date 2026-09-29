import { compareDateHeure, getParticipantIdentityKey } from './tourWizardRencontresUtils';
import type { TourMatchRow, TourParticipantRow } from './types';

const MATCH_GROUP_PATTERN = /^Match (\d+)$/;

export interface EliminatoireGroupAssignment {
  participants: TourParticipantRow[];
  /** Confrontations incoherentes (un participant relie a deux groupes differents). */
  conflicts: string[];
}

function formatMatchGroupName(index: number): string {
  return `Match ${String(index).padStart(2, '0')}`;
}

function getMatchSideKey(clubId: unknown, source: unknown): string {
  const club = String(clubId ?? '').trim();
  if (club) return `club:${club}`;
  const paSource = String(source ?? '').trim();
  return paSource ? `src:${paSource}` : '';
}

/**
 * Renseigne le GROUPE ("Match NN") des participants d'un tour eliminatoire a partir des rencontres saisies.
 * Un groupe = une paire de participants (aller/retour et matchs rejoues partagent le meme groupe).
 * Un GROUPE deja renseigne n'est jamais modifie : les PASource des tours suivants s'appuient dessus.
 * Un participant sans rencontre reste sans groupe.
 */
export function assignEliminatoireMatchGroups(
  participants: TourParticipantRow[],
  rencontres: TourMatchRow[],
): EliminatoireGroupAssignment {
  const result = participants.map((row) => ({ ...row, GROUPE: String(row.GROUPE ?? '').trim() }));
  const byKey = new Map(result.map((row) => [getParticipantIdentityKey(row), row] as const));

  let nextIndex = 1 + result.reduce((max, row) => {
    const found = MATCH_GROUP_PATTERN.exec(row.GROUPE);
    return found ? Math.max(max, Number(found[1])) : max;
  }, 0);

  const membersOf = (group: string): number => result.filter((row) => row.GROUPE === group).length;
  const conflicts: string[] = [];

  const orderedMatches = rencontres
    .map((match, index) => ({ match, index }))
    .sort((a, b) => compareDateHeure(a.match, b.match) || a.index - b.index);

  orderedMatches.forEach(({ match }) => {
    const domKey = getMatchSideKey(match.DOMICILE, match.PADOMSource);
    const extKey = getMatchSideKey(match.EXTERIEUR, match.PAEXTSource);
    const dom = byKey.get(domKey);
    const ext = byKey.get(extKey);
    if (!dom || !ext || dom === ext) {
      return;
    }

    if (dom.GROUPE && ext.GROUPE) {
      if (dom.GROUPE !== ext.GROUPE) {
        conflicts.push(`${dom.CLUB || dom.PASource || dom.IDCLUB} (${dom.GROUPE}) / ${ext.CLUB || ext.PASource || ext.IDCLUB} (${ext.GROUPE})`);
      }
      return;
    }

    if (!dom.GROUPE && !ext.GROUPE) {
      const name = formatMatchGroupName(nextIndex);
      nextIndex += 1;
      dom.GROUPE = name;
      ext.GROUPE = name;
      return;
    }

    // Un seul des deux a un groupe : l'autre le rejoint s'il est encore seul dedans.
    const [withGroup, without] = dom.GROUPE ? [dom, ext] : [ext, dom];
    if (membersOf(withGroup.GROUPE) === 1) {
      without.GROUPE = withGroup.GROUPE;
    } else {
      conflicts.push(`${without.CLUB || without.PASource || without.IDCLUB} / ${withGroup.CLUB || withGroup.PASource || withGroup.IDCLUB} (${withGroup.GROUPE})`);
    }
  });

  return { participants: result, conflicts };
}
