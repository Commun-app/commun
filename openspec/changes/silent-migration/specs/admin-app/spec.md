## ADDED Requirements

### Requirement: Base API relative en même origine

Quand aucune URL d'API n'est configurée, l'admin SHALL appeler le plan tRPC en chemin RELATIF (`/api/trpc`) — cas nominal de l'image d'instance où l'admin et l'API partagent l'origine. La configuration explicite (`NUXT_ENV_API_URL`) SHALL rester prioritaire (dev local, harness).

#### Scenario: Admin servi par l'instance
- **WHEN** l'admin est servi par l'image d'instance sans URL d'API configurée
- **THEN** login et écrans fonctionnent via `/api/trpc` sur la même origine

### Requirement: Remise de session par le portail

Une page `/sso` SHALL accepter un token de session transmis en fragment d'URL par le portail, le stocker comme une session nuxt-auth normale, puis router vers l'accueil — sans jamais afficher le token ni le laisser dans l'historique (nettoyage du fragment). Un token invalide SHALL renvoyer à l'écran de login.

#### Scenario: Arrivée depuis le portail
- **WHEN** le navigateur arrive sur `/sso#token=…` avec un token valide
- **THEN** la session est établie, le fragment est nettoyé et l'utilisateur atterrit sur `/overview`

#### Scenario: Token invalide
- **WHEN** le token du fragment est expiré ou invalide
- **THEN** l'utilisateur est renvoyé à l'écran de login sans erreur technique
