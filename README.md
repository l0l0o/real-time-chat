# Application de Chat en Temps Réel

Une application de messagerie instantanée moderne construite avec Next.js (React) et NestJS, utilisant Socket.IO pour les communications en temps réel.

## Fonctionnalités

- Conversation en temps réel
- Authentification des utilisateurs
- Interface utilisateur moderne et réactive
- Stockage persistant des messages

## Technologies utilisées

### Backend (API)

- NestJS (Framework Node.js)
- Socket.IO (WebSockets)
- TypeORM & PostgreSQL (Base de données)
- JWT pour l'authentification
- Docker pour la conteneurisation

### Frontend

- React 19
- Vite
- Socket.IO Client
- TailwindCSS
- React Router
- React Query

## Prérequis

- Node.js (v18 ou supérieur)
- npm ou pnpm
- Docker et Docker Compose

## Installation et démarrage

### Base de données (PostgreSQL)

```bash
# Démarrer la base de données avec Docker
cd api
docker compose up -d
```

### API (Backend)

```bash
# Dans le dossier api
cd api

# Installer les dépendances
npm install

# Démarrer l'API en mode développement
npm run start:dev
```

L'API sera accessible à l'adresse: http://localhost:3000

### Application Frontend

```bash
# Dans le dossier app
cd app

# Installer les dépendances
npm install

# Démarrer l'application en mode développement
npm run dev
```

L'application sera accessible à l'adresse: http://localhost:5173

## Structure du projet

- `/api` - Backend NestJS

  - `/src` - Code source
    - `/auth` - Module d'authentification
    - `/users` - Gestion des utilisateurs
    - `/messages` - Gestion des messages
    - `/conversations` - Gestion des conversations
    - `gateway.ts` - Configuration Socket.IO

- `/app` - Frontend React
  - `/src` - Code source
    - `/components` - Composants React réutilisables
    - `/contexts` - Contextes React
    - `/pages` - Pages de l'application
    - `/services` - Services pour communiquer avec l'API

## Accès à l'interface d'administration

Une interface Adminer est disponible pour gérer la base de données:

- URL: http://localhost:8080
- Serveur: database
- Utilisateur: postgres
- Mot de passe: postgres
- Base de données: test
