import type { ComponentType } from 'react';
import { PlusSelectionnesGrid } from './joueur/apparitions/PlusSelectionnesGrid';
import { ParSaisonGrid } from './joueur/apparitions/ParSaisonGrid';
import { AncienneteGrid } from './joueur/apparitions/AncienneteGrid';
import { DernierMatchGrid, PremierMatchGrid } from './joueur/apparitions/PremierMatchGrid';
import { ButeursGrid, ButeursParSaisonGrid, EfficaciteButeursGrid } from './joueur/buts/ButeursGrid';
import { ButeursMatchGrid } from './joueur/buts/ButeursMatchGrid';
import { SeriesGrid } from './joueur/buts/SeriesGrid';
import { ExclusionsRapidesGrid, SanctionsGrid, SanctionsParSaisonGrid } from './joueur/sanctions/SanctionsGrid';
import { GardiensGrid } from './joueur/gardiens/GardiensGrid';
import { SerieInviolabiliteGrid } from './joueur/gardiens/SerieInviolabiliteGrid';

// Registre des grilles de stat implementees, une entree par fichier de stat.
// Cle = `${domainKey}/${themeKey}/${typeKey}` (mirroir de STAT_DOMAINS dans statTree.tsx).
export const STAT_COMPONENTS: Record<string, ComponentType> = {
  'joueur/apparitions/plus-selectionnes': PlusSelectionnesGrid,
  'joueur/apparitions/saison': ParSaisonGrid,
  'joueur/apparitions/anciennete': AncienneteGrid,
  'joueur/apparitions/plus-jeune': PremierMatchGrid,
  'joueur/apparitions/plus-vieux': DernierMatchGrid,
  'joueur/buts/general': ButeursGrid,
  'joueur/buts/saison': ButeursParSaisonGrid,
  'joueur/buts/match': ButeursMatchGrid,
  'joueur/buts/moyenne': EfficaciteButeursGrid,
  'joueur/buts/serie': SeriesGrid,
  'joueur/passes/general': () => <ButeursGrid metric="passes" />,
  'joueur/passes/saison': () => <ButeursParSaisonGrid metric="passes" />,
  'joueur/passes/match': () => <ButeursMatchGrid metric="passes" />,
  'joueur/passes/moyenne': () => <EfficaciteButeursGrid metric="passes" />,
  'joueur/passes/serie': () => <SeriesGrid metric="passes" />,
  'joueur/sanctions/avertissements-general': () => <SanctionsGrid metric="avertissements" />,
  'joueur/sanctions/avertissements-saison': () => <SanctionsParSaisonGrid metric="avertissements" />,
  'joueur/sanctions/exclusions-general': () => <SanctionsGrid metric="exclusions" />,
  'joueur/sanctions/exclusions-saison': () => <SanctionsParSaisonGrid metric="exclusions" />,
  'joueur/sanctions/exclusions-rapides': ExclusionsRapidesGrid,
  'joueur/gardiens/meilleurs': GardiensGrid,
  'joueur/gardiens/serie-inviolabilite': SerieInviolabiliteGrid,
};
