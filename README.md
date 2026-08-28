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

## Build pour deploiement AWS Amplify

### Build local (verification)

Depuis le dossier `front`:

```bash
npm ci
npm run build
```

Le build de production est genere dans le dossier `dist`.

### Variables d'environnement (Vite)

Dans AWS Amplify, definir les variables `VITE_*` utilisees par l'application.
Exemple minimal:

- `VITE_API_BASE_URL=https://votre-api.example.com`

Si besoin, ajouter aussi les ressources API surchargeables (noms presentes dans `src/config/env.ts`).

### Configuration Amplify (Console)

Dans l'app Amplify:

1. Connecter le repository Git et la branche a deployer.
2. Build image: laisser l'image par defaut (Node 20 recommande).
3. Build settings:
	 - Base directory: `front`
	 - Build command: `npm ci && npm run build`
	 - Artifacts directory: `dist`

### Configuration via `amplify.yml` (option recommande)

A la racine du repository (ou dans la configuration Amplify), utiliser:

```yaml
version: 1
frontend:
	phases:
		preBuild:
			commands:
				- cd front
				- npm ci
		build:
			commands:
				- npm run build
	artifacts:
		baseDirectory: front/dist
		files:
			- '**/*'
	cache:
		paths:
			- front/node_modules/**/*
```

### Redirection SPA (React Router)

Configurer une regle de rewrite dans Amplify pour eviter les 404 sur refresh:

- Source address: `/<*>`
- Target address: `/index.html`
- Type: `200 (Rewrite)`

### Sitemap dynamique

Le sitemap n'est pas servi par le frontend. La route dynamique est exposee par le backend:

`https://supporter5-backend.onrender.com/sitemap.xml`

Dans les redirects/rewrites de l'application Amplify, ajouter une regle avant le fallback SPA:

```text
/sitemap.xml  https://supporter5-backend.onrender.com/sitemap.xml  200
```

Le fallback `/<*> -> /index.html` doit rester apres cette regle. Ainsi,
`https://www.asmonaco.app/sitemap.xml` est proxifie vers le backend et beneficie
du cache serveur de 24 heures. Le fichier `robots.txt` reste servi par Amplify
et reference l'URL publique `https://www.asmonaco.app/sitemap.xml`.

