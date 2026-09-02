import { useEffect } from 'react';
import { entityPathForPublicMode } from '../../lib/entityNavigation';
import { publicRecentRecordsStore } from './publicRecentRecordsStore';

type PublicRecentEntity = 'joueur' | 'club' | 'rencontre';

/** Enregistre la visite d'une fiche publique dans "Dernieres fiches ouvertes". */
export function useRecentRecordVisit(kind: PublicRecentEntity, id: string, label: string, ready: boolean): void {
  const remember = publicRecentRecordsStore((state) => state.remember);

  useEffect(() => {
    if (!ready || !id) return;
    remember(entityPathForPublicMode(kind, id), label);
  }, [kind, id, label, ready, remember]);
}
