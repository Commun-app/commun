## 1. Socle Nitro tasks

- [x] 1.1 Activer les tasks dans la config Nitro d'apps/api (`defineTask`/`runTask` via `nitro/task`) et créer une task de démonstration exécutable, avec l'entrée `scheduledTasks` quotidienne (05:00 Europe/Paris) pointant sur la tâche orchestratrice
- [x] 1.2 Tâche orchestratrice `jobs:daily` : `runTask('apidae:sync')` puis `runTask('deploy')`, deploy maintenu si la sync échoue, rapport agrégé loggé

## 2. Deploy

- [x] 2.1 Tâche `deploy` : lecture de `organization.deployment.vercel.hook`, GET avec timeout, résultat explicite (succès / `E_NO_DEPLOY_HOOK` / échec détaillé)
- [x] 2.2 Procédure tRPC `organization.deploy` (plan admin, authentifiée) appelant `runTask('deploy')` et retournant le résultat
- [x] 2.3 Brancher le bouton « Publier » de l'admin sur `organization.deploy` (adaptation minimale de l'écran existant)
- [x] 2.4 Tests : hook présent (fixture HTTP locale), hook absent, hook en erreur

## 3. Moteur de sync (packages/core/src/sync)

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

- [x] 5.1 Fixtures issues de vraies réponses APIDAE ot-pertuis (pagination multi-pages, périodes variées dont `OUVERTURE_MOIS` et `tousLesAns`, illustrations avec/sans traduction fr)
- [x] 5.2 Test « mapping ot-pertuis reproduit » : record produit identique champ à champ au legacy sur fixture
- [x] 5.3 Tests unlink : disparition → draft, créations préservées, collecte en échec → unlink annulé
- [x] 5.4 Vérifier zéro appel réseau sortant dans la suite CI (fixtures uniquement)
- [ ] 5.5 Passe manuelle sur copie de la base ot-pertuis migrée : diff du contenu avec le legacy (plan de migration, étape 2)
