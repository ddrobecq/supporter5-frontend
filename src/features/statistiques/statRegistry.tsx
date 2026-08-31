import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

type StatComponent = ComponentType | LazyExoticComponent<ComponentType>;

function lazyStat(loader: () => Promise<{ default: ComponentType }>): LazyExoticComponent<ComponentType> {
  return lazy(loader);
}

const SaisonClassementTemps = lazyStat(() => import('./saison/classements/SaisonClassementGrid').then((module) => ({ default: () => <module.SaisonClassementGrid metric="temps" /> })));
const SaisonClassementButs = lazyStat(() => import('./saison/classements/SaisonClassementGrid').then((module) => ({ default: () => <module.SaisonClassementGrid metric="buts" /> })));
const SaisonClassementPasses = lazyStat(() => import('./saison/classements/SaisonClassementGrid').then((module) => ({ default: () => <module.SaisonClassementGrid metric="passes" /> })));
const SaisonClassementSanctions = lazyStat(() => import('./saison/classements/SaisonClassementGrid').then((module) => ({ default: () => <module.SaisonClassementGrid metric="sanctions" /> })));
const EquipeTypeSaison = lazyStat(() => import('./saison/equipeType/EquipeTypeView').then((module) => ({ default: module.EquipeTypeView })));
const EquipeTypeHistorique = lazyStat(() => import('./saison/equipeType/EquipeTypeView').then((module) => ({ default: () => <module.EquipeTypeView historique /> })));

const CompositionNombreJoueurs = lazyStat(() => import('./saison/composition/CompositionGrid').then((module) => ({ default: () => <module.CompositionGrid metric="nombre-joueurs" /> })));
const CompositionNombreEtrangers = lazyStat(() => import('./saison/composition/CompositionGrid').then((module) => ({ default: () => <module.CompositionGrid metric="nombre-etrangers" /> })));
const CompositionNombreNationalites = lazyStat(() => import('./saison/composition/CompositionGrid').then((module) => ({ default: () => <module.CompositionGrid metric="nombre-nationalites" /> })));
const CompositionAgeMoyen = lazyStat(() => import('./saison/composition/CompositionGrid').then((module) => ({ default: () => <module.CompositionGrid metric="age-moyen" /> })));
const CompositionNombreMatches = lazyStat(() => import('./saison/composition/CompositionGrid').then((module) => ({ default: () => <module.CompositionGrid metric="nombre-matches" /> })));
const CompositionNombreRemplacements = lazyStat(() => import('./saison/composition/CompositionGrid').then((module) => ({ default: () => <module.CompositionGrid metric="nombre-remplacements" /> })));
const SchemaEvolutionView = lazyStat(() => import('./saison/composition/SchemaEvolutionView').then((module) => ({ default: module.SchemaEvolutionView })));

const ButsEquipePour = lazyStat(() => import('./saison/performance/ButsEquipeGrid').then((module) => ({ default: () => <module.ButsEquipeGrid metric="buts-pour" /> })));
const ButsEquipeContre = lazyStat(() => import('./saison/performance/ButsEquipeGrid').then((module) => ({ default: () => <module.ButsEquipeGrid metric="buts-contre" /> })));
const ButsEquipePourMatch = lazyStat(() => import('./saison/performance/ButsEquipeGrid').then((module) => ({ default: () => <module.ButsEquipeGrid metric="buts-pour-match" /> })));
const ButsEquipeContreMatch = lazyStat(() => import('./saison/performance/ButsEquipeGrid').then((module) => ({ default: () => <module.ButsEquipeGrid metric="buts-contre-match" /> })));
const ButsEquipeMatch = lazyStat(() => import('./saison/performance/ButsEquipeGrid').then((module) => ({ default: () => <module.ButsEquipeGrid metric="buts-match" /> })));
const SanctionsEquipeAvertissements = lazyStat(() => import('./saison/sanctions/SanctionsEquipeGrid').then((module) => ({ default: () => <module.SanctionsEquipeGrid metric="avertissements" /> })));
const SanctionsEquipeExclusions = lazyStat(() => import('./saison/sanctions/SanctionsEquipeGrid').then((module) => ({ default: () => <module.SanctionsEquipeGrid metric="exclusions" /> })));
const SanctionsEquipeAvertissementsMatch = lazyStat(() => import('./saison/sanctions/SanctionsEquipeGrid').then((module) => ({ default: () => <module.SanctionsEquipeGrid metric="avertissements-match" /> })));
const SanctionsEquipeExclusionsMatch = lazyStat(() => import('./saison/sanctions/SanctionsEquipeGrid').then((module) => ({ default: () => <module.SanctionsEquipeGrid metric="exclusions-match" /> })));
const TransfertsEquipeAchats = lazyStat(() => import('./saison/transferts/TransfertsEquipeGrid').then((module) => ({ default: () => <module.TransfertsEquipeGrid metric="achats-cumules" /> })));
const TransfertsEquipeVentes = lazyStat(() => import('./saison/transferts/TransfertsEquipeGrid').then((module) => ({ default: () => <module.TransfertsEquipeGrid metric="ventes-cumulees" /> })));

const PlusSelectionnesGrid = lazyStat(() => import('./joueur/apparitions/PlusSelectionnesGrid').then((module) => ({ default: module.PlusSelectionnesGrid })));
const ParSaisonGrid = lazyStat(() => import('./joueur/apparitions/ParSaisonGrid').then((module) => ({ default: module.ParSaisonGrid })));
const AncienneteGrid = lazyStat(() => import('./joueur/apparitions/AncienneteGrid').then((module) => ({ default: module.AncienneteGrid })));
const PremierMatchGrid = lazyStat(() => import('./joueur/apparitions/PremierMatchGrid').then((module) => ({ default: module.PremierMatchGrid })));
const DernierMatchGrid = lazyStat(() => import('./joueur/apparitions/PremierMatchGrid').then((module) => ({ default: module.DernierMatchGrid })));

const ButeursGrid = lazyStat(() => import('./joueur/buts/ButeursGrid').then((module) => ({ default: module.ButeursGrid })));
const ButeursParSaisonGrid = lazyStat(() => import('./joueur/buts/ButeursGrid').then((module) => ({ default: module.ButeursParSaisonGrid })));
const EfficaciteButeursGrid = lazyStat(() => import('./joueur/buts/ButeursGrid').then((module) => ({ default: module.EfficaciteButeursGrid })));
const ButeursMatchGrid = lazyStat(() => import('./joueur/buts/ButeursMatchGrid').then((module) => ({ default: module.ButeursMatchGrid })));
const DoublesGrid = lazyStat(() => import('./joueur/buts/ButsMultiplesGrid').then((module) => ({ default: () => <module.ButsMultiplesGrid variant="doubles" /> })));
const TriplesGrid = lazyStat(() => import('./joueur/buts/ButsMultiplesGrid').then((module) => ({ default: () => <module.ButsMultiplesGrid variant="triples" /> })));
const QuadruplesGrid = lazyStat(() => import('./joueur/buts/ButsMultiplesGrid').then((module) => ({ default: () => <module.ButsMultiplesGrid variant="quadruples" /> })));
const SeriesGrid = lazyStat(() => import('./joueur/buts/SeriesGrid').then((module) => ({ default: module.SeriesGrid })));
const PasseursGrid = lazyStat(() => import('./joueur/buts/ButeursGrid').then((module) => ({ default: () => <module.ButeursGrid metric="passes" /> })));
const PasseursParSaisonGrid = lazyStat(() => import('./joueur/buts/ButeursGrid').then((module) => ({ default: () => <module.ButeursParSaisonGrid metric="passes" /> })));
const PasseursMatchGrid = lazyStat(() => import('./joueur/buts/ButeursMatchGrid').then((module) => ({ default: () => <module.ButeursMatchGrid metric="passes" /> })));
const PasseursDoublesGrid = lazyStat(() => import('./joueur/buts/ButsMultiplesGrid').then((module) => ({ default: () => <module.ButsMultiplesGrid metric="passes" variant="doubles" /> })));
const PasseursTriplesGrid = lazyStat(() => import('./joueur/buts/ButsMultiplesGrid').then((module) => ({ default: () => <module.ButsMultiplesGrid metric="passes" variant="triples" /> })));
const EfficacitePasseursGrid = lazyStat(() => import('./joueur/buts/ButeursGrid').then((module) => ({ default: () => <module.EfficaciteButeursGrid metric="passes" /> })));
const SeriesPasseursGrid = lazyStat(() => import('./joueur/buts/SeriesGrid').then((module) => ({ default: () => <module.SeriesGrid metric="passes" /> })));

const SanctionsAvertissementsGrid = lazyStat(() => import('./joueur/sanctions/SanctionsGrid').then((module) => ({ default: () => <module.SanctionsGrid metric="avertissements" /> })));
const SanctionsAvertissementsSaisonGrid = lazyStat(() => import('./joueur/sanctions/SanctionsGrid').then((module) => ({ default: () => <module.SanctionsParSaisonGrid metric="avertissements" /> })));
const SanctionsExclusionsGrid = lazyStat(() => import('./joueur/sanctions/SanctionsGrid').then((module) => ({ default: () => <module.SanctionsGrid metric="exclusions" /> })));
const SanctionsExclusionsSaisonGrid = lazyStat(() => import('./joueur/sanctions/SanctionsGrid').then((module) => ({ default: () => <module.SanctionsParSaisonGrid metric="exclusions" /> })));
const ExclusionsRapidesGrid = lazyStat(() => import('./joueur/sanctions/SanctionsGrid').then((module) => ({ default: module.ExclusionsRapidesGrid })));

const GardiensGrid = lazyStat(() => import('./joueur/gardiens/GardiensGrid').then((module) => ({ default: module.GardiensGrid })));
const SerieInviolabiliteGrid = lazyStat(() => import('./joueur/gardiens/SerieInviolabiliteGrid').then((module) => ({ default: module.SerieInviolabiliteGrid })));
const PerformancesVictoiresGrid = lazyStat(() => import('./joueur/performances/PerformancesGrid').then((module) => ({ default: () => <module.PerformancesGrid metric="victoires" /> })));
const PerformancesDefaitesGrid = lazyStat(() => import('./joueur/performances/PerformancesGrid').then((module) => ({ default: () => <module.PerformancesGrid metric="defaites" /> })));
const PerformancesNulsGrid = lazyStat(() => import('./joueur/performances/PerformancesGrid').then((module) => ({ default: () => <module.PerformancesGrid metric="nuls" /> })));
const TransfertsAchatsGrid = lazyStat(() => import('./joueur/transferts/TransfertsGrid').then((module) => ({ default: () => <module.TransfertsGrid metric="achats" /> })));
const TransfertsVentesGrid = lazyStat(() => import('./joueur/transferts/TransfertsGrid').then((module) => ({ default: () => <module.TransfertsGrid metric="ventes" /> })));
const TransfertsPlusValuesGrid = lazyStat(() => import('./joueur/transferts/TransfertsGrid').then((module) => ({ default: () => <module.TransfertsGrid metric="plus-values" /> })));
const TransfertsMoinsValuesGrid = lazyStat(() => import('./joueur/transferts/TransfertsGrid').then((module) => ({ default: () => <module.TransfertsGrid metric="moins-values" /> })));
const PhysiqueGrandsGrid = lazyStat(() => import('./joueur/physique/PhysiqueGrid').then((module) => ({ default: () => <module.PhysiqueGrid metric="grands" /> })));
const PhysiquePetitsGrid = lazyStat(() => import('./joueur/physique/PhysiqueGrid').then((module) => ({ default: () => <module.PhysiqueGrid metric="petits" /> })));
const PhysiqueGabaritsGrid = lazyStat(() => import('./joueur/physique/PhysiqueGrid').then((module) => ({ default: () => <module.PhysiqueGrid metric="gabarits" /> })));

const ScoresVictoiresGrid = lazyStat(() => import('./rencontre/scores/ScoresGrid').then((module) => ({ default: () => <module.ScoresGrid metric="victoires" /> })));
const ScoresDefaitesGrid = lazyStat(() => import('./rencontre/scores/ScoresGrid').then((module) => ({ default: () => <module.ScoresGrid metric="defaites" /> })));
const ScoresProlifiquesGrid = lazyStat(() => import('./rencontre/scores/ScoresGrid').then((module) => ({ default: () => <module.ScoresGrid metric="prolifiques" /> })));
const AffluenceGrid = lazyStat(() => import('./rencontre/affluence/AffluenceGrid').then((module) => ({ default: module.AffluenceGrid })));
const RencontreSanctionsAvertissementsGrid = lazyStat(() => import('./rencontre/sanctions/SanctionsGrid').then((module) => ({ default: () => <module.SanctionsGrid metric="avertissements" /> })));
const RencontreSanctionsExclusionsGrid = lazyStat(() => import('./rencontre/sanctions/SanctionsGrid').then((module) => ({ default: () => <module.SanctionsGrid metric="exclusions" /> })));
const RencontreSeriesVictoiresGrid = lazyStat(() => import('./rencontre/series/SeriesGrid').then((module) => ({ default: () => <module.SeriesGrid metric="victoires" /> })));
const RencontreSeriesNulsGrid = lazyStat(() => import('./rencontre/series/SeriesGrid').then((module) => ({ default: () => <module.SeriesGrid metric="nuls" /> })));
const RencontreSeriesDefaitesGrid = lazyStat(() => import('./rencontre/series/SeriesGrid').then((module) => ({ default: () => <module.SeriesGrid metric="defaites" /> })));
const RencontreSeriesInvincibiliteGrid = lazyStat(() => import('./rencontre/series/SeriesGrid').then((module) => ({ default: () => <module.SeriesGrid metric="invincibilite" /> })));
const RencontreSeriesInviolabiliteGrid = lazyStat(() => import('./rencontre/series/SeriesGrid').then((module) => ({ default: () => <module.SeriesGrid metric="inviolabilite" /> })));
const RencontreSeriesInefficaciteGrid = lazyStat(() => import('./rencontre/series/SeriesGrid').then((module) => ({ default: () => <module.SeriesGrid metric="inefficacite" /> })));

const ArbitreMatchesGrid = lazyStat(() => import('./arbitre/matches/ArbitreMatchesGrid').then((module) => ({ default: module.ArbitreMatchesGrid })));
const ArbitreSanctionsAvertissementsGrid = lazyStat(() => import('./arbitre/sanctions/ArbitreSanctionsGrid').then((module) => ({ default: () => <module.ArbitreSanctionsGrid metric="avertissements" /> })));
const ArbitreSanctionsExclusionsGrid = lazyStat(() => import('./arbitre/sanctions/ArbitreSanctionsGrid').then((module) => ({ default: () => <module.ArbitreSanctionsGrid metric="exclusions" /> })));

// Registre des grilles de stat implementees, une entree par fichier de stat.
// Cle = `${domainKey}/${themeKey}/${typeKey}` (mirroir de STAT_DOMAINS dans statTree.tsx).
export const STAT_COMPONENTS: Record<string, StatComponent> = {
  'saison/performance/temps': SaisonClassementTemps,
  'saison/performance/buts': SaisonClassementButs,
  'saison/performance/passes': SaisonClassementPasses,
  'saison/performance/sanctions': SaisonClassementSanctions,
  'saison/performance/equipe-type': EquipeTypeSaison,
  'saison/composition/nombre-joueurs': CompositionNombreJoueurs,
  'saison/composition/nombre-etrangers': CompositionNombreEtrangers,
  'saison/composition/nombre-nationalites': CompositionNombreNationalites,
  'saison/composition/age-moyen': CompositionAgeMoyen,
  'saison/composition/nombre-matches': CompositionNombreMatches,
  'saison/composition/nombre-remplacements': CompositionNombreRemplacements,
  'saison/composition/evolution-schema': SchemaEvolutionView,
  'saison/buts-equipe/buts-pour': ButsEquipePour,
  'saison/buts-equipe/buts-contre': ButsEquipeContre,
  'saison/buts-equipe/buts-pour-match': ButsEquipePourMatch,
  'saison/buts-equipe/buts-contre-match': ButsEquipeContreMatch,
  'saison/buts-equipe/buts-match': ButsEquipeMatch,
  'saison/sanctions-equipe/avertissements': SanctionsEquipeAvertissements,
  'saison/sanctions-equipe/exclusions': SanctionsEquipeExclusions,
  'saison/sanctions-equipe/avertissements-match': SanctionsEquipeAvertissementsMatch,
  'saison/sanctions-equipe/exclusions-match': SanctionsEquipeExclusionsMatch,
  'saison/transferts-equipe/achats-cumules': TransfertsEquipeAchats,
  'saison/transferts-equipe/ventes-cumulees': TransfertsEquipeVentes,
  'joueur/apparitions/plus-selectionnes': PlusSelectionnesGrid,
  'joueur/apparitions/saison': ParSaisonGrid,
  'joueur/apparitions/anciennete': AncienneteGrid,
  'joueur/apparitions/plus-jeune': PremierMatchGrid,
  'joueur/apparitions/plus-vieux': DernierMatchGrid,
  'joueur/apparitions/equipe-type': EquipeTypeHistorique,
  'joueur/buts/general': ButeursGrid,
  'joueur/buts/saison': ButeursParSaisonGrid,
  'joueur/buts/match': ButeursMatchGrid,
  'joueur/buts/doubles': DoublesGrid,
  'joueur/buts/triples': TriplesGrid,
  'joueur/buts/quadruples': QuadruplesGrid,
  'joueur/buts/moyenne': EfficaciteButeursGrid,
  'joueur/buts/serie': SeriesGrid,
  'joueur/passes/general': PasseursGrid,
  'joueur/passes/saison': PasseursParSaisonGrid,
  'joueur/passes/match': PasseursMatchGrid,
  'joueur/passes/doubles': PasseursDoublesGrid,
  'joueur/passes/triples': PasseursTriplesGrid,
  'joueur/passes/moyenne': EfficacitePasseursGrid,
  'joueur/passes/serie': SeriesPasseursGrid,
  'joueur/sanctions/avertissements-general': SanctionsAvertissementsGrid,
  'joueur/sanctions/avertissements-saison': SanctionsAvertissementsSaisonGrid,
  'joueur/sanctions/exclusions-general': SanctionsExclusionsGrid,
  'joueur/sanctions/exclusions-saison': SanctionsExclusionsSaisonGrid,
  'joueur/sanctions/exclusions-rapides': ExclusionsRapidesGrid,
  'joueur/gardiens/meilleurs': GardiensGrid,
  'joueur/gardiens/serie-inviolabilite': SerieInviolabiliteGrid,
  'joueur/performances/victoires': PerformancesVictoiresGrid,
  'joueur/performances/defaites': PerformancesDefaitesGrid,
  'joueur/performances/nuls': PerformancesNulsGrid,
  'joueur/transferts/achats': TransfertsAchatsGrid,
  'joueur/transferts/ventes': TransfertsVentesGrid,
  'joueur/transferts/plus-values': TransfertsPlusValuesGrid,
  'joueur/transferts/moins-values': TransfertsMoinsValuesGrid,
  'joueur/physique/grands': PhysiqueGrandsGrid,
  'joueur/physique/petits': PhysiquePetitsGrid,
  'joueur/physique/gabarits': PhysiqueGabaritsGrid,
  'rencontre/scores/victoires': ScoresVictoiresGrid,
  'rencontre/scores/defaites': ScoresDefaitesGrid,
  'rencontre/scores/prolifiques': ScoresProlifiquesGrid,
  'rencontre/affluence/affluence': AffluenceGrid,
  'rencontre/sanctions/avertissements': RencontreSanctionsAvertissementsGrid,
  'rencontre/sanctions/exclusions': RencontreSanctionsExclusionsGrid,
  'rencontre/series/victoires': RencontreSeriesVictoiresGrid,
  'rencontre/series/nuls': RencontreSeriesNulsGrid,
  'rencontre/series/defaites': RencontreSeriesDefaitesGrid,
  'rencontre/series/invincibilite': RencontreSeriesInvincibiliteGrid,
  'rencontre/series/inviolabilite': RencontreSeriesInviolabiliteGrid,
  'rencontre/series/inefficacite': RencontreSeriesInefficaciteGrid,
  'arbitre/matches/matches': ArbitreMatchesGrid,
  'arbitre/sanctions/avertissements': ArbitreSanctionsAvertissementsGrid,
  'arbitre/sanctions/exclusions': ArbitreSanctionsExclusionsGrid,
};
