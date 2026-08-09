import type { CircOptionRow, TourMatchRow, TourParticipantRow } from './types';

export interface PendingRencontreModel {
  date: string;
  heure: string | null;
  domicileParticipantId: string;
  domicile: string;
  domicileSource: string;
  domicileLabel: string;
}

export interface RencontresGridModelRow extends TourMatchRow {
  DOMICILE_NOM: string;
  EXTERIEUR_NOM: string;
}

export function buildParticipantMapByClubId(rows: TourParticipantRow[]): Map<string, TourParticipantRow> {
  const map = new Map<string, TourParticipantRow>();
  rows.forEach((row) => {
    const clubId = String(row.IDCLUB ?? '').trim();
    if (clubId) {
      map.set(clubId, row);
    }
  });
  return map;
}

export function buildParticipantMapBySource(rows: TourParticipantRow[]): Map<string, TourParticipantRow> {
  const map = new Map<string, TourParticipantRow>();
  rows.forEach((row) => {
    const source = String(row.PASource ?? '').trim();
    if (source) {
      map.set(source, row);
    }
  });
  return map;
}

export function buildLockedParticipantKeys(
  rencontres: TourMatchRow[],
  selectedCircId: string,
  normalizeCircId: (value: unknown) => string,
): Set<string> {
  const keys = new Set<string>();
  const selectedCirc = normalizeCircId(selectedCircId);

  rencontres.forEach((match) => {
    const matchCirc = normalizeCircId(match.IDCIRC);
    if (matchCirc !== selectedCirc) {
      return;
    }

    const dom = String(match.DOMICILE ?? '').trim();
    const ext = String(match.EXTERIEUR ?? '').trim();
    const domSource = String(match.PADOMSource ?? '').trim();
    const extSource = String(match.PAEXTSource ?? '').trim();
    if (dom) keys.add(`club:${dom}`);
    if (ext) keys.add(`club:${ext}`);
    if (domSource) keys.add(`src:${domSource}`);
    if (extSource) keys.add(`src:${extSource}`);
  });

  return keys;
}

export function buildAvailableClubRows(
  participants: TourParticipantRow[],
  lockedParticipantKeys: Set<string>,
  hasMultipleGroups: boolean,
  selectedGroup: string,
  pendingDomicileParticipantId: string | null,
  getParticipantIdentityKey: (row: TourParticipantRow) => string,
): TourParticipantRow[] {
  let rows = participants.filter((row) => !lockedParticipantKeys.has(getParticipantIdentityKey(row)));

  if (hasMultipleGroups) {
    if (!selectedGroup) {
      return [];
    }
    rows = rows.filter((row) => String(row.GROUPE ?? '').trim() === selectedGroup);
  }

  if (pendingDomicileParticipantId) {
    return rows.filter((row) => String(row.PACLEUNIK) !== pendingDomicileParticipantId);
  }

  return rows;
}

export function buildFilteredCircOptions(
  circRows: CircOptionRow[],
  tourType: 'ligue' | 'eliminatoire',
  normalizedNbMatch: number,
): CircOptionRow[] {
  return tourType === 'ligue' && normalizedNbMatch > 0
    ? circRows.slice(0, normalizedNbMatch)
    : circRows;
}

export function buildFilteredRencontreRows(
  rencontreRows: TourMatchRow[],
  selectedCircId: string,
  normalizeCircId: (value: unknown) => string,
): TourMatchRow[] {
  const selectedCirc = normalizeCircId(selectedCircId);
  return rencontreRows.filter((row) => normalizeCircId(row.IDCIRC) === selectedCirc);
}

export function buildRencontreGridRows(
  filteredRencontreRows: TourMatchRow[],
  pending: PendingRencontreModel | null,
  participantById: Map<string, TourParticipantRow>,
  participantBySource: Map<string, TourParticipantRow>,
  getProgrammedParticipantLabel: (row: TourParticipantRow) => string,
): RencontresGridModelRow[] {
  const rows = filteredRencontreRows.map((match) => {
    const domicileClubId = String(match.DOMICILE ?? '').trim();
    const domicileSource = String(match.PADOMSource ?? '').trim();
    const domicileParticipant = domicileClubId
      ? participantById.get(domicileClubId)
      : (domicileSource ? participantBySource.get(domicileSource) : undefined);

    const exterieurClubId = String(match.EXTERIEUR ?? '').trim();
    const exterieurSource = String(match.PAEXTSource ?? '').trim();
    const exterieurParticipant = exterieurClubId
      ? participantById.get(exterieurClubId)
      : (exterieurSource ? participantBySource.get(exterieurSource) : undefined);

    return {
      ...match,
      DOMICILE_NOM: domicileParticipant
        ? getProgrammedParticipantLabel(domicileParticipant)
        : (domicileClubId || (domicileSource ? `Programme (${domicileSource})` : '')),
      EXTERIEUR_NOM: exterieurParticipant
        ? getProgrammedParticipantLabel(exterieurParticipant)
        : (exterieurClubId || (exterieurSource ? `Programme (${exterieurSource})` : '')),
    };
  });

  if (pending) {
    rows.push({
      RECLEUNIK: -1,
      DATE: pending.date,
      HEURE: pending.heure ?? '',
      DOMICILE: pending.domicile,
      EXTERIEUR: '',
      PADOMSource: pending.domicileSource,
      PAEXTSource: '',
      DOMICILE_NOM: pending.domicileLabel,
      EXTERIEUR_NOM: '',
    } as RencontresGridModelRow);
  }

  return rows;
}
