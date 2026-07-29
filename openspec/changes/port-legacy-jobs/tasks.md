## 1. Socle Nitro tasks

- [x] 1.1 Activer les tasks dans la config Nitro d'apps/api (`defineTask`/`runTask` via `nitro/task`) avec deux entrées `scheduledTasks` quotidiennes : `apidae:sync` 05:00, `deploy` 05:30 (review PR #4 : une entrée par tâche, ordre garanti par la marge)
- [x] 1.2 Route interne `/_tasks/:name` (COMMUN_TASKS_HTTP, harness E2E seul — l'endpoint natif de Nitro n'existe qu'en dev) ; tâche orchestratrice `jobs:daily` supprimée (review PR #4)

## 2. Deploy

- [x] 2.1 Tâche `deploy` : lecture de `organization.deployment.vercel.hook`, GET avec timeout, résultat explicite (succès / `E_NO_DEPLOY_HOOK` / échec détaillé)
- [x] 2.2 Procédure tRPC `organization.deploy` (plan admin, authentifiée) appelant `runTask('deploy')` et retournant le résultat
- [x] 2.3 Brancher le bouton « Publier » de l'admin sur `organization.deploy` (adaptation minimale de l'écran existant)
- [x] 2.4 Tests : hook présent (fixture HTTP locale), hook absent, hook en erreur

## 3. Moteur de sync (packages/apidae-sync — package dédié, review PR #4)

- [x] 3.1 Client APIDAE : pagination `list-objets-touristiques` (lots de 20, arrêt sur page vide, HTTPS par défaut, timeout, erreur réseau → collecte interrompue et rapportée)
- [x] 3.2 `transformSchedules` : périodicités UNIQUE/DAILY/WEEKLY/MONTHLY, `tousLesAns` rebasé, horaires, zone Europe/Paris, garde `E_EVENT_EXPIRED`, sortie ISO 8601 — correctifs `periodRank` (FIRST…LAST) et « maintenant » évalué à l'exécution
- [x] 3.3 `transformMedia` : traduction `fr` (absente → ignorée + log), mime, metaData `apidaeId`/`logo`/`header`
- [x] 3.4 Mapper déclaratif iso-legacy : chemins pointés, `$[itérateur]`, `[index]`, transforms littéral/`_source`/`$concat`/`$relation`/`$condition`/`$mapping`/`$arrayFilters`/`@apidaeSchedules`/`@apidaeMedia`/`@poulpusWYSIWYG`, évaluateur `$and`/`$or` + comparateurs stricts, `E_UNKNOWN_TRANSFORMATION`
- [x] 3.5 Porter `transformWYSIWYG` (sortie TipTap stringifiée) avec test de non-régression sur fixture

## 4. Sink via services du core

- [x] 4.1 Lecture de la config `legacyExtra.injector`, filtrage `sort: 'apidae'` (autres ignorés + log), exécution séquentielle des pipelines
- [x] 4.2 Sync des enums de collection : items `{ id, label }` manquants ajoutés à la définition, valeurs d'entrée réduites aux ids
- [x] 4.3 Sink médias : idempotence sur `metaData.apidaeId`, download → driver S3 → finalize via service media, clés metaData simples (correctif clé pointée)
- [x] 4.4 Résolution des relations (tokens `collection:identifier:refId` → ids d'entrées) et cas spécial de l'attribut `records`
- [x] 4.5 `syncRecord` idempotent sur l'attribut `apidaeId` via le service collections (create/update, statut `published` forcé, sans throttle)
- [x] 4.6 Unlink en fin de passe : dépublication des publiées non vues (créations incluses dans `linkedRecords`), annulé si la collecte a échoué
- [x] 4.7 Tâche Nitro `apidae:sync` : orchestration collect → transform → sink par pipeline, rapport (compteurs créés/mis à jour/erreurs/ignorés)

## 5. Tests et validation

- [x] 5.1 Mock APIDAE dans le harness E2E (pagination réelle, binaires de médias, hook Vercel compté, panne simulable) servant un dataset ot-pertuis — placeholder à remplacer par la capture réelle fournie par Quentin
- [x] 5.2 Scénarios E2E jobs.feature : deploy (sans/avec hook), import initial publié (schedules, enums, média), upsert sans doublon, expiration `E_EVENT_EXPIRED`
- [x] 5.3 Scénarios E2E unlink : disparition → draft, créations préservées, panne APIDAE → unlink annulé (le « deploy maintenu » est garanti par l'indépendance des entrées cron)
- [x] 5.4 Zéro appel réseau sortant en CI (URLs de médias réécrites vers le mock) ; suppression des tests unitaires bun (review PR #4)
- [ ] 5.5 Passe manuelle sur copie de la base ot-pertuis migrée : diff du contenu avec le legacy (plan de migration, étape 2)
