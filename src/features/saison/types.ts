export interface SaisonRow {
  SAISON: string;
  SA_DEBUT: string;
  SA_FIN: string;
}

export interface SaisonWizardJoueurRow {
  JOCLEUNIK: number;
  IDJOUEUR: string;
  NOM: string | null;
  PRENOM: string | null;
  SURNOM: string | null;
  IDNATIO: string | null;
  JOUEUR_NOM: string;
  POSTE: number;
  POSTE_NOM: string;
  CONTRAT_FIN: string | null;
}

export interface SaisonWizardCompetitionRow {
  COCLEUNIK: number;
  SAISON: string;
  IDEPREUVE: number;
  NOM: string;
}

export interface SaisonCreateWizardPayload {
  saison: string;
  saDebut: string;
  saFin: string;
  joueurs: Array<{ idJoueur: string; poste: number }>;
  competitions: Array<{ competitionId: number; idem: boolean }>;
}

export interface SaisonCreateWizardResult extends SaisonRow {
  joueursCount: number;
  competitionsCount: number;
}
