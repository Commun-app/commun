# api-server Specification

## Purpose
TBD - created by archiving change scaffold-monorepo. Update Purpose after archive.
## Requirements
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
Le plan REST public SHALL se limiter aux routes legacy-compat `/api/v1/content/*` (lecture seule) — le plan de contenu moderne par collection est reporté au change de la layer de thèmes (phase 3), qui définira son propre contrat (review 2026-07-23). Toute autre surface d'API SHALL être exposée via tRPC.

#### Scenario: Résolution des médias dans le contenu (iso legacy)
- **WHEN** une entrée publiée référence des médias (champ `media` ou nœud image/file dans un rich-text)
- **THEN** le payload records retourne les champs media en TABLEAUX de records legacy signés (`objects` : original + 7 variantes), et le rich-text STRINGIFIÉ avec `attrs.mediaRecord` + `attrs.src` signé dans les nœuds — les champs `hidden` sont exclus

### Requirement: Plan legacy-compat pour les builds actuels
L'API SHALL exposer, sous les chemins legacy exacts, les routes que les builds de sites ACTUELS consomment sans modification : `GET /api/v1/content/records` (map plate des entrées publiées par id, médias résolus, enveloppe `{ name, description, data }` legacy), `GET /api/v1/content/deployment` (`_theme`, `_pages`, `slugs`) et `GET /api/v1/content/wordpress-marseille-15-16` (JSON statique, avatars enrichis quand l'instance est marseille15-16, sans authentification — iso legacy). Les deux premières SHALL accepter le header `Authorization` brut (sans préfixe Bearer) envoyé par les clients legacy.

#### Scenario: Build de site actuel inchangé
- **WHEN** un thème actuel appelle `/api/v1/content/records` avec son header `Authorization: <token>` brut
- **THEN** il reçoit la map des entrées publiées au format legacy, sans modification de son code

#### Scenario: Route wordpress statique
- **WHEN** un client appelle `/api/v1/content/wordpress-marseille-15-16` sans authentification
- **THEN** le JSON statique est servi (enrichi des avatars si l'instance est l'organisation marseille15-16)

### Requirement: Gestion d'erreurs et journalisation
L'API SHALL retourner des erreurs structurées (catalogues typés par domaine, `error.data.type` exposé aux clients, sans fuite de détails internes). RECTIFICATIF (revue 2026-07-28) : la journalisation des requêtes est REPORTÉE en phase 4 (observabilité structurée : entrée/chaîne de services/sortie/durée, correlation id `X-Request-Id` via AsyncLocalStorage) — seul le header `X-Request-Id` est posé dès la phase 1.

#### Scenario: Erreur interne
- **WHEN** une opération échoue de manière inattendue
- **THEN** le client reçoit une erreur 500 générique et le détail complet est journalisé côté serveur

