# Plan Frontend - Supporter v5

## Contexte
- Backend deploye sur Render et valide.
- Base de donnees migree sur Turso.
- Le frontend demarre dans `front/` (actuellement vide hors consignes).
- Priorite: espace Admin, en commencant par l'entite NATIO (Pays).

## Choix techniques valides
- Framework: React + Vite.
- Langage: TypeScript.
- UI: MUI (sobre).
- Data table: MUI X Data Grid Community (gratuite).
- Etat auth: sessionStorage (JWT), pas de persistance longue duree.
- Navigation: principes repliques pour les autres entites.
- Exceptions futures: MATCH et RENCO auront un traitement specifique.

## Objectif de la premiere iteration (simple)
Construire un module Admin NATIO reutilisable comme modele:
1. Vue Table (liste + recherche + actions).
2. Vue Fiche en modale (creation/edition).
3. Suppression avec confirmation et gestion integrite.

## UX/UI cible (Option B - moderne sobre)
- Ecran Admin minimal avec barre haute, titre de page et zone contenu.
- Page "Pays (NATIO)" avec:
  - Barre d'actions: Nouveau, Ouvrir, Supprimer.
  - Champ de recherche unique, simple.
  - Data Grid affichant tous les champs NATIO.
- Fiche modale:
  - Tous les champs NATIO.
  - Boutons "OK" et "Annuler".
- Suppression:
  - Demande de confirmation obligatoire.
  - Si contrainte d'integrite: message explicite et blocage.

## Parcours utilisateur NATIO
1. L'utilisateur ouvre la page Pays.
2. Il recherche un pays via la barre de recherche.
3. Il ouvre une ligne (double-clic ou bouton Ouvrir).
4. Il modifie les champs et valide avec OK.
5. Il peut creer un nouveau pays via Nouveau (fiche vide).
6. Il peut supprimer un pays apres confirmation.
7. En cas de dependance, la suppression est refusee avec explication.

## Architecture frontend prevue
- `src/app/`: bootstrap app, routing, providers.
- `src/features/auth/`: login, guard, stockage token.
- `src/features/natio/`: page liste, fiche modale, api service, types.
- `src/shared/`: composants communs, helpers API, notifications.
- `src/layouts/`: structure Admin.

## API attendue pour NATIO
- Lecture liste paginee + recherche.
- Lecture detail par identifiant.
- Creation d'un pays.
- Modification d'un pays.
- Suppression d'un pays.

## Strategie "simple d'abord"
- Pas de filtres avances.
- Pas de logique bulk complexe dans v1.
- Pas de theming pousse: style sobre et lisible.
- Validation basique des champs au plus proche du besoin.

## Definition of Done - V1 NATIO
- Auth admin operationnelle avec token en sessionStorage.
- Ecran liste Pays fonctionnel.
- Fiche modale creation/edition fonctionnelle.
- Suppression avec confirmation et gestion propre des erreurs d'integrite.
- Messages utilisateur clairs (succes/erreur).
- Base technique reusable pour entites suivantes.

## Extension aux autres entites
Apres NATIO, appliquer le meme patron:
1. Liste (Data Grid)
2. Fiche modale
3. Suppression securisee
4. Service API dedie

Ordre propose (hors MATCH/RENCO):
- CLUB_NOM
- SAISON
- TOUR
- EQUIPE
- JOUEURRG

## Notes de pilotage
- Ne pas coder de cas specifiques MATCH/RENCO dans cette phase.
- Prioriser stabilite, lisibilite et repetition de pattern.
- Faire des increments courts et validables.
