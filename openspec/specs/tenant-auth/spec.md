# tenant-auth Specification

## Purpose
TBD - created by archiving change scaffold-monorepo. Update Purpose after archive.
## Requirements
### Requirement: Authentification par session
Les utilisateurs SHALL s'authentifier par email + mot de passe (hash argon2id). Une session est créée en base et un JWT HS256 `{ session: <uuid> }` (jose, `COMMUN_JWT_SECRET`) est retourné au client — RECTIFICATIF revue PR #1 (2026-07-28) : la révocation reste en base (lookup de la session à chaque requête), le token n'est plus stocké hashé, qui le transmet en `Authorization: Bearer <token>` — SANS cookie, iso transport legacy (review du 2026-07-23). Expiration, liste des sessions actives et révocation individuelle (appareil ciblé) SHALL être supportées.

#### Scenario: Connexion réussie
- **WHEN** un utilisateur soumet des identifiants valides
- **THEN** un token de session est retourné ; les procédures protégées deviennent accessibles avec `Authorization: Bearer <token>`

#### Scenario: Déconnexion
- **WHEN** un utilisateur se déconnecte
- **THEN** la session est révoquée en base ; toute requête ultérieure avec l'ancien token est rejetée

### Requirement: Rôles admin et rédacteur
Le système SHALL distinguer deux rôles : `admin` (gestion des utilisateurs, réglages de la commune, tous contenus) et `redacteur` (gestion des contenus uniquement). Les procédures tRPC SHALL vérifier le rôle requis.

#### Scenario: Rédacteur tente une action admin
- **WHEN** un utilisateur `redacteur` appelle une procédure réservée aux admins (ex. inviter un utilisateur)
- **THEN** l'API répond FORBIDDEN et l'action n'est pas exécutée

### Requirement: Invitations à usage unique
Les nouveaux utilisateurs SHALL être créés par invitation : un lien à usage unique et à durée limitée, généré cryptographiquement (`crypto.randomBytes` — jamais `Math.random`), permet de définir son mot de passe.

#### Scenario: Invitation consommée
- **WHEN** un invité ouvre un lien d'invitation valide et définit son mot de passe
- **THEN** le compte est activé et le lien devient inutilisable

#### Scenario: Lien expiré ou réutilisé
- **WHEN** un lien d'invitation expiré ou déjà consommé est ouvert
- **THEN** l'accès est refusé avec un message explicite, sans révéler d'information sur le compte

### Requirement: Tokens API machine
Les consommateurs machine (build des sites) SHALL s'authentifier par token API : généré aléatoirement, affiché une seule fois, stocké uniquement hashé en base, révocable, en lecture seule sur le plan public.

#### Scenario: Token révoqué
- **WHEN** un build appelle le plan contenu avec un token révoqué
- **THEN** l'API répond UNAUTHORIZED

### Requirement: Aucun secret codé en dur
Aucun secret ne SHALL être codé en dur dans le code source, et aucun secret ne SHALL avoir de valeur par défaut fonctionnelle. Le système ne fait AUCUNE vérification heuristique de la qualité des secrets configurés (décision de review du 2026-07-23) — leur gestion relève de l'exploitation. RECTIFICATIF (revue PR #1, 2026-07-28) : l'authentification exige UN secret de configuration, `COMMUN_JWT_SECRET` (JWT de session) — requis fail-fast au boot, sans valeur par défaut.

#### Scenario: Recherche de secrets en dur
- **WHEN** on audite le code source du monolithe
- **THEN** aucun secret fonctionnel (clé, mot de passe, token) n'y figure

