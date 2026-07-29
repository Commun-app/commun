## ADDED Requirements

### Requirement: CORS credentialed par reflet d'origine

Le serveur SHALL répondre aux requêtes cross-origin en REFLÉTANT l'origine appelante (`Access-Control-Allow-Origin: <origin>`) avec `Access-Control-Allow-Credentials: true`, en remplacement du wildcard `*` — les navigateurs refusent le wildcard en mode credentialed, imposé par les fetches de nuxt-auth 1.x. La politique reste « toute origine acceptée » : l'authentification est un Bearer pur, aucun cookie de session n'existe côté serveur.

#### Scenario: Preflight credentialed
- **WHEN** un preflight OPTIONS arrive avec un en-tête Origin
- **THEN** la réponse porte `Access-Control-Allow-Origin` égal à cette origine et `Access-Control-Allow-Credentials: true`

#### Scenario: Requête credentialed de l'admin
- **WHEN** l'admin émet un fetch en mode `credentials: 'include'` vers le plan tRPC
- **THEN** la réponse est acceptée par le navigateur (origine reflétée, pas de wildcard)
