# api-server

## ADDED Requirements

### Requirement: Serveur Nitro v3
`apps/api` SHALL être un serveur Nitro v3 démarrable en dev (`bun run dev`) et en production (build `.output` exécuté par Bun), exposant un endpoint de santé `GET /health`.

#### Scenario: Healthcheck
- **WHEN** un client appelle `GET /health`
- **THEN** l'API répond 200 avec l'état de l'instance (version, base accessible)

### Requirement: Plan admin tRPC
L'API SHALL exposer le router tRPC de `@commun/core` sur `/api/trpc` (catch-all h3), couvrant les opérations CRUD des domaines du socle, réservé aux utilisateurs authentifiés par session.

#### Scenario: Appel authentifié
- **WHEN** un utilisateur authentifié appelle une procédure tRPC (ex. création d'une actualité)
- **THEN** l'entrée est validée par le schéma Zod du domaine, l'opération est exécutée et le résultat typé est retourné

#### Scenario: Appel non authentifié
- **WHEN** un client sans session valide appelle une procédure tRPC protégée
- **THEN** l'API répond avec une erreur UNAUTHORIZED et n'exécute pas l'opération

### Requirement: Plan public REST
L'API SHALL exposer des routes REST h3 publiques restreintes au strict minimum : lecture du contenu publié par domaine (destinée au build des sites, authentifiée par token API) et soumission des formulaires citoyens (publique). Toute autre surface d'API SHALL être exposée via tRPC.

#### Scenario: Récupération du contenu au build
- **WHEN** le build d'un site appelle les routes de contenu avec un token API valide
- **THEN** l'API retourne le contenu publié (actualités, agenda, élus, projets, délibérations, pages) en JSON, prêt pour Nuxt Content

#### Scenario: Soumission d'un formulaire citoyen
- **WHEN** un citoyen soumet un formulaire (contact, signalement) via la route publique
- **THEN** la soumission est validée, persistée, et visible côté admin ; les soumissions sont rate-limitées par IP

### Requirement: Gestion d'erreurs et journalisation
L'API SHALL retourner des erreurs structurées (code, message, sans fuite de détails internes) et journaliser les requêtes et erreurs via consola avec un niveau configurable.

#### Scenario: Erreur interne
- **WHEN** une opération échoue de manière inattendue
- **THEN** le client reçoit une erreur 500 générique et le détail complet est journalisé côté serveur
