## ADDED Requirements

### Requirement: Image d'instance API + admin même origine

Une image d'instance (`Dockerfile.instance`) SHALL embarquer l'API et le build statique de l'admin, servis sur la MÊME origine : l'admin est servi par Nitro (assets + fallback SPA pour les routes non-`/api`), et appelle le plan tRPC en chemin relatif. L'image SHALL être commune à tous les clients (aucune valeur client-spécifique cuite au build) ; les tokens des registres privés (prose) SHALL n'exister qu'en secrets de build, jamais dans l'image finale.

#### Scenario: Une instance sert l'admin et l'API
- **WHEN** un navigateur visite la racine du domaine d'une instance
- **THEN** l'admin se charge, et le login aboutit via `/api/trpc` sur la même origine

#### Scenario: Route SPA en accès direct
- **WHEN** un navigateur charge directement une route profonde de l'admin (ex. `/events`)
- **THEN** le fallback sert l'admin (pas de 404), et les routes `/api/*` restent servies par l'API

### Requirement: Une app Dokploy par client

Chaque client SHALL être déployé comme une app du VPS Dokploy : image d'instance, volume de données persistant, secrets d'environnement propres (S3 dédié, JWT, webhook email), domaine `<slug>.<BASE_DOMAIN>` (domaine de base paramétrique — le domaine cible n'est pas encore acquis). Un gabarit de configuration SHALL rendre l'ajout d'un client reproductible.

#### Scenario: Déploiement d'un client
- **WHEN** l'app Dokploy d'un client est créée depuis le gabarit avec ses secrets
- **THEN** l'instance boote (migrations, fail-fast satisfait), répond sur son domaine en HTTPS et `/health` est vert

### Requirement: S3 dédié par client

Chaque instance SHALL utiliser un bucket S3 qui lui est propre. Les objets legacy du client SHALL y être copiés en préservant les clés (le manifeste de la migration liste les objets du client) afin que les médias migrés se résolvent sans réécriture.

#### Scenario: Médias migrés servis depuis le bucket dédié
- **WHEN** la copie S3 d'un client est faite et sa base migrée chargée
- **THEN** les médias de l'admin et du payload public se résolvent en URLs signées du bucket dédié
