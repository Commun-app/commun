## ADDED Requirements

### Requirement: Login unique iso legacy

Le portail (`apps/portal`) SHALL présenter l'écran de connexion iso legacy (mêmes champs, même apparence) sur l'URL historique app.poulp.us (et tout alias futur). L'utilisateur SHALL se connecter avec ses identifiants existants (hash migrés) — aucune réinscription, aucun nouveau mot de passe.

#### Scenario: Connexion d'un utilisateur migré
- **WHEN** un utilisateur saisit ses identifiants legacy valides sur le portail
- **THEN** il est authentifié et redirigé vers l'admin de SON instance, déjà connecté

### Requirement: Routage email vers instance

Le portail SHALL router chaque email vers l'instance de son client via un mapping généré depuis les bases migrées, avec table d'exceptions pour les comptes multi-organisations (comptes internes). Un email inconnu SHALL recevoir la même erreur qu'un mot de passe invalide (pas d'énumération de comptes).

#### Scenario: Email inconnu
- **WHEN** un email absent du mapping tente de se connecter
- **THEN** le portail répond « identifiants invalides » sans révéler l'existence ou non du compte

### Requirement: Authentification déléguée et remise de session

Le portail SHALL déléguer l'authentification à l'instance cible (`auth.login` appelé côté serveur — le portail ne stocke NI mot de passe NI session) puis remettre le token à l'admin par fragment d'URL (`/sso#token=…`, jamais en query ni en cookie portail). L'échec de l'instance SHALL être restitué tel quel (identifiants invalides, instance indisponible).

#### Scenario: Remise de session
- **WHEN** l'authentification déléguée réussit
- **THEN** le navigateur est redirigé vers `https://<instance>/sso#token=…` et le token n'apparaît dans aucun log serveur

#### Scenario: Instance indisponible
- **WHEN** l'instance cible ne répond pas
- **THEN** le portail affiche une erreur d'indisponibilité explicite, sans fuite technique
