import type { ReactNode } from 'react';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import SportsSoccerRoundedIcon from '@mui/icons-material/SportsSoccerRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import SportsIcon from '@mui/icons-material/Sports';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';

export interface StatType {
  key: string;
  label: string;
}

export interface StatTheme {
  key: string;
  label: string;
  types: StatType[];
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
        key: 'titres',
        label: 'Titres',
        types: [
          { key: 'general', label: 'Général' },
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
          { key: 'plus-large',label: 'Plus large victoire' },
          { key: 'plus-buts', label: 'Match le plus prolifique' },
        ],
      },
      {
        key: 'affluence',
        label: 'Affluence',
        types: [
          { key: 'general', label: 'Général' },
        ],
      },
    ],
  },
  {
    key: 'competition',
    label: 'Compétition',
    icon: <EmojiEventsRoundedIcon sx={{ fontSize: 18 }} />,
    themes: [
      {
        key: 'palmares',
        label: 'Palmarès',
        types: [
          { key: 'general', label: 'Général' },
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
        key: 'sanctions',
        label: 'Sanctions données',
        types: [
          { key: 'general', label: 'Général' },
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
