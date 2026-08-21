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
import { PerformancesGrid } from './joueur/performances/PerformancesGrid';
import { TransfertsGrid } from './joueur/transferts/TransfertsGrid';
import { PhysiqueGrid } from './joueur/physique/PhysiqueGrid';
import { SerieInviolabiliteGrid } from './joueur/gardiens/SerieInviolabiliteGrid';
import { ScoresGrid } from './rencontre/scores/ScoresGrid';
import { AffluenceGrid } from './rencontre/affluence/AffluenceGrid';
import { SanctionsGrid as RencontreSanctionsGrid } from './rencontre/sanctions/SanctionsGrid';
import { SeriesGrid as RencontreSeriesGrid } from './rencontre/series/SeriesGrid';
import { ArbitreMatchesGrid } from './arbitre/matches/ArbitreMatchesGrid';
import { ArbitreSanctionsGrid } from './arbitre/sanctions/ArbitreSanctionsGrid';
import { SaisonClassementGrid } from './saison/classements/SaisonClassementGrid';
import { EquipeTypeView } from './saison/equipeType/EquipeTypeView';

// Registre des grilles de stat implementees, une entree par fichier de stat.
// Cle = `${domainKey}/${themeKey}/${typeKey}` (mirroir de STAT_DOMAINS dans statTree.tsx).
export const STAT_COMPONENTS: Record<string, ComponentType> = {
  'saison/temps/temps': () => <SaisonClassementGrid metric="temps" />,
  'saison/buts/buts': () => <SaisonClassementGrid metric="buts" />,
  'saison/passes/passes': () => <SaisonClassementGrid metric="passes" />,
  'saison/sanctions/sanctions': () => <SaisonClassementGrid metric="sanctions" />,
  'saison/equipe-type/equipe-type': EquipeTypeView,
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
  'joueur/performances/victoires': () => <PerformancesGrid metric="victoires" />,
  'joueur/performances/defaites': () => <PerformancesGrid metric="defaites" />,
  'joueur/performances/nuls': () => <PerformancesGrid metric="nuls" />,
  'joueur/transferts/achats': () => <TransfertsGrid metric="achats" />,
  'joueur/transferts/ventes': () => <TransfertsGrid metric="ventes" />,
  'joueur/transferts/plus-values': () => <TransfertsGrid metric="plus-values" />,
  'joueur/transferts/moins-values': () => <TransfertsGrid metric="moins-values" />,
  'joueur/physique/grands': () => <PhysiqueGrid metric="grands" />,
  'joueur/physique/petits': () => <PhysiqueGrid metric="petits" />,
  'joueur/physique/gabarits': () => <PhysiqueGrid metric="gabarits" />,
  'rencontre/scores/victoires': () => <ScoresGrid metric="victoires" />,
  'rencontre/scores/defaites': () => <ScoresGrid metric="defaites" />,
  'rencontre/scores/prolifiques': () => <ScoresGrid metric="prolifiques" />,
  'rencontre/affluence/affluence': AffluenceGrid,
  'rencontre/sanctions/avertissements': () => <RencontreSanctionsGrid metric="avertissements" />,
  'rencontre/sanctions/exclusions': () => <RencontreSanctionsGrid metric="exclusions" />,
  'rencontre/series/victoires': () => <RencontreSeriesGrid metric="victoires" />,
  'rencontre/series/nuls': () => <RencontreSeriesGrid metric="nuls" />,
  'rencontre/series/defaites': () => <RencontreSeriesGrid metric="defaites" />,
  'rencontre/series/invincibilite': () => <RencontreSeriesGrid metric="invincibilite" />,
  'rencontre/series/inviolabilite': () => <RencontreSeriesGrid metric="inviolabilite" />,
  'rencontre/series/inefficacite': () => <RencontreSeriesGrid metric="inefficacite" />,
  'arbitre/matches/matches': ArbitreMatchesGrid,
  'arbitre/sanctions/avertissements': () => <ArbitreSanctionsGrid metric="avertissements" />,
  'arbitre/sanctions/exclusions': () => <ArbitreSanctionsGrid metric="exclusions" />,
};
