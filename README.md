# Frontend - Supporter v5

## Lancer le front en local

Depuis le dossier `front`, execute:

```bash
npm run dev
```

Le serveur Vite demarre ensuite en local (souvent sur `http://localhost:5173`).

## Installation (si necessaire)

Si les dependances ne sont pas encore installees:

```bash
npm install
```

## Regles UX projet

- Toujours mettre le focus sur le premier champ de saisie d'une page au chargement.
- Pour les actions principales (`Nouveau`, `Ouvrir`, `Supprimer`) :
	- afficher les boutons sur une seule ligne, repartis sur toute la largeur disponible ;
	- en largeur reduite, afficher uniquement l'icone ;
	- en mode icone seule, afficher un tooltip au survol avec le libelle du bouton.
