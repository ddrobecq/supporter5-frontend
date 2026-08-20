import type { ReactNode } from 'react';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import SportsIcon from '@mui/icons-material/Sports';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';

export interface StatType {
  key: string;
  label: string;
}

export interface StatTheme {
  key: string;
  label: string;
  /** Absent = theme "feuille": clic direct ouvre la stat (registry key `${domain}/${theme}/${theme}`). */
  types?: StatType[];
}

export interface StatDomain {
  key: string;
  label: string;
  icon: ReactNode;
  themes: StatTheme[];
}

// Catalogue de démonstration: à remplacer/étendre par domaine au fur et à mesure des besoins réels.
export const STAT_DOMAINS: StatDomain[] = [
  {
    key: 'joueur',
    label: 'Joueur',
    icon: <PersonRoundedIcon sx={{ fontSize: 18 }} />,
    themes: [
      {
        key: 'apparitions',
        label: 'Apparitions',
        types: [
          { key: 'plus-selectionnes', label: 'Les plus sélectionnés' },
          { key: 'saison', label: 'Sur une saison' },
          { key: 'anciennete', label: "Nombre d'années au club" },
          { key: 'plus-jeune', label: 'Première apparition' },
          { key: 'plus-vieux', label: 'Plus vieux joueur' },
        ],
      },
      {
        key: 'buts',
        label: 'Buts',
        types: [
          { key: 'general', label: 'Général' },
          { key: 'saison', label: 'Sur une saison' },
          { key: 'match', label: 'Sur un match' },
          { key: 'moyenne', label: 'Efficacité' },
          { key: 'serie', label: 'Série' },
        ],
      },
      {
        key: 'passes',
        label: 'Passes décisives',
        types: [
          { key: 'general', label: 'Général' },
          { key: 'saison', label: 'Sur une saison' },
          { key: 'match', label: 'Sur un match' },
          { key: 'moyenne', label: 'Efficacité' },
          { key: 'serie', label: 'Série' },
        ],
      },
      {
        key: 'gardiens',
        label: 'Gardiens',
        types: [
          { key: 'meilleurs', label: 'Meilleurs gardiens' },
          { key: 'serie-inviolabilite', label: "Série d'inviolabilité" },
        ],
      },
      {
        key: 'sanctions',
        label: 'Sanctions',
        types: [
          { key: 'avertissements-general', label: 'Avertissements - Général' },
          { key: 'avertissements-saison', label: 'Avertissements - Sur une saison' },
          { key: 'exclusions-general', label: 'Exclusions - Général' },
          { key: 'exclusions-saison', label: 'Exclusions - Sur une saison' },
          { key: 'exclusions-rapides', label: 'Exclusions - les plus rapides' },
        ],
      },
      {
        key: 'performances',
        label: 'Performances',
        types: [
          { key: 'victoires', label: 'Victoires' },
          { key: 'defaites', label: 'Défaites' },
          { key: 'nuls', label: 'Nuls' },
        ],
      },
      {
        key: 'transferts',
        label: 'Transferts',
        types: [
          { key: 'achats', label: 'Achats' },
          { key: 'ventes', label: 'Ventes' },
          { key: 'plus-values', label: 'Plus-values' },
          { key: 'moins-values', label: 'Moins-values' },
        ],
      },
      {
        key: 'physique',
        label: 'Physique',
        types: [
          { key: 'grands', label: 'Grands' },
          { key: 'petits', label: 'Petits' },
          { key: 'gabarits', label: 'Gabarits' },
        ],
      },
    ],
  },
  {
    key: 'rencontre',
    label: 'Rencontre',
    icon: <SportsSoccerRoundedIcon sx={{ fontSize: 18 }} />,
    themes: [
      {
        key: 'scores',
        label: 'Scores',
        types: [
          { key: 'victoires', label: 'Victoires' },
          { key: 'defaites', label: 'Défaites' },
          { key: 'prolifiques', label: 'Prolifiques' },
        ],
      },
      {
        key: 'affluence',
        label: 'Affluence',
      },
      {
        key: 'sanctions',
        label: 'Sanctions',
        types: [
          { key: 'avertissements', label: 'Avertissements' },
          { key: 'exclusions', label: 'Exclusions' },
        ],
      },
      {
        key: 'series',
        label: 'Séries',
        types: [
          { key: 'victoires', label: 'Victoires' },
          { key: 'nuls', label: 'Nuls' },
          { key: 'defaites', label: 'Défaites' },
          { key: 'invincibilite', label: 'Invincibilité' },
          { key: 'inviolabilite', label: 'Inviolabilité' },
          { key: 'inefficacite', label: 'Inefficacité' },
        ],
      },
    ],
  },
  {
    key: 'arbitre',
    label: 'Arbitre',
    icon: <SportsIcon sx={{ fontSize: 18 }} />,
    themes: [
      {
        key: 'matches',
        label: 'Matches',
      },
      {
        key: 'sanctions',
        label: 'Sanctions',
        types: [
          { key: 'avertissements', label: 'Avertissements' },
          { key: 'exclusions', label: 'Exclusions' },
        ],
      },
    ],
  },
  {
    key: 'entraineur',
    label: 'Entraineur',
    icon: <SchoolRoundedIcon sx={{ fontSize: 18 }} />,
    themes: [
      {
        key: 'bilan',
        label: 'Bilan',
        types: [
          { key: 'general', label: 'Général' },
        ],
      },
    ],
  },
];
