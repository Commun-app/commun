## Why

La phase 1 (scaffold) est close, mais deux automatismes du legacy n'ont pas été portés : le déclenchement du build Vercel (sans lui, le bouton « Publier » de l'admin est inerte et les sites ne se reconstruisent jamais) et la synchronisation APIDAE (sans elle, ot-pertuis — seul client avec un injector actif — perd l'alimentation de son agenda touristique). Ce sont les derniers blocs nécessaires pour faire tourner les instances migrées en autonomie.

## What Changes

- Ajout des **Nitro tasks** dans `apps/api` (première utilisation : nécessite `tasks: true` expérimental ou équivalent v3) avec planification quotidienne.
- **Job deploy** : GET sur le hook Vercel stocké dans `organization.deployment.vercel.hook` ; planifié quotidiennement et déclenchable à la demande via une nouvelle procédure tRPC `organization.deploy` (branchée sur le bouton « Publier » de l'admin).
- **Job apidae-sync** : portage du `job-data-sync` legacy **réduit à APIDAE seul** (décision du 27/07 : Airtable et Slack abandonnés) —
  - client APIDAE (pagination `list-objets-touristiques`, `transformMedia`, moteur de périodes `transformSchedules` en luxon/Europe-Paris) ;
  - moteur de mapping déclaratif (transforms `$concat`/`$relation`/`$condition`/`$mapping`/`$arrayFilters`/`@apidaeSchedules`/`@apidaeMedia`/`@poulpusWYSIWYG`, évaluateur `$and`/`$or`/`$eq`…) ;
  - sink via les services du core directement (**plus de JWT forgé ni d'écriture Mongo directe**) : sync des enums de collection, médias via download → driver S3 → finalize, `syncRecord` idempotent sur `apidaeId`, mode unlink (dépublication de ce qui a disparu de la source), statut `published` direct.
- **Ordonnancement** : une entrée cron par tâche, **horaires legacy reproduits** (deploy 00:30 puis sync 05:30 — review PR #4, décision du 29/07 : iso-legacy strict, le contenu APIDAE part au build du lendemain comme aujourd'hui).
- Config lue depuis `organization.legacyExtra.injector` (mappings préservés tels quels par la CLI de migration — pas de nouveau format).
- **Correction des bugs legacy documentés** au passage : tri des périodes (PERIODRANKS/FIRST1), unlink exécuté dans la boucle, clé pointée `metaData` (le session leak est sans objet en SQLite).
- Tests **E2E** sur un mock APIDAE servant un jeu de données réel (review PR #4 : pas de tests unitaires, la suite E2E est la spécification exécutable) — aucun appel réseau réel en CI.

## Capabilities

### New Capabilities

- `site-deployment` : déclenchement du build du site statique — tâche Nitro quotidienne + procédure tRPC `organization.deploy`, GET du hook Vercel, tolérance à l'absence de hook configuré.
- `apidae-sync` : synchronisation APIDAE → collections du core — client paginé, moteur de mapping déclaratif, périodes/horaires, médias, idempotence, unlink, ordonnancement sync-puis-deploy.

### Modified Capabilities

_Aucune : la procédure `organization.deploy` s'inscrit dans le plan admin tRPC existant sans en changer les exigences, et `legacyExtra` est déjà spécifié comme champ d'extension._

## Impact

- `apps/api` : nouvelles tasks Nitro (`tasks/deploy.ts`, `tasks/apidae-sync.ts`), activation des tasks + `scheduledTasks` dans `nitro.config`, nouvelle procédure tRPC `organization.deploy`.
- `packages/apidae-sync` (package workspace dédié, review PR #4) : client APIDAE, moteur de mapping, sink s'appuyant sur les services collections/media du core (dépendances injectées) — frontière volontaire, candidat à l'extraction hors monorepo en phase 6. Aucun changement de schéma DB (lecture de `organization.deployment` et `organization.legacyExtra.injector` existants).
- `apps/admin` : le bouton « Publier » appelle `organization.deploy` (écran existant, adaptation minimale — la refonte admin viendra après).
- Dépendances : `luxon` (déjà décidé de le conserver), aucune nouvelle dépendance réseau — fetch natif.
- E2E/CI : mock APIDAE + hook Vercel dans le harness (jobs.feature), route interne `/_tasks/:name` activée par COMMUN_TASKS_HTTP (E2E seul) ; le smoke Docker n'est pas impacté (tasks inactives sans config).
