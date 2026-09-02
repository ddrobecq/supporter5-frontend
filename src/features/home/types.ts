export type RecentEntityKind =
  | 'joueur'
  | 'club'
  | 'arbitre'
  | 'rencontre'
  | 'epreuve'
  | 'competition'
  | 'tourdef'
  | 'natio'
  | 'ville'
  | 'terrain'
  | 'devise'
  | 'circ';

export interface RecentOpenedRecord {
  path: string;
  label: string;
  entityKind: RecentEntityKind;
  entityId: string;
  lastOpenedAt: number;
}

export interface HomePageOutletContext {
  recentOpenedRecords: RecentOpenedRecord[];
}
