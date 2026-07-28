## Context

Deux jobs legacy tournaient hors du serveur (repo `poulpus/jobs`, GitHub Actions sur runner self-hosted, crons UTC 00:30 deploy / 05:30 sync — dans le mauvais ordre) :

- **job-ssg-deploy** : boucle sur les organisations Mongo et GET du hook Vercel. Toute erreur était avalée (`exit 0` systématique).
- **job-data-sync** : pipeline injector (collect APIDAE/Airtable → mapping déclaratif → sink). Le sink était **hybride** : écritures métier en HTTP vers l'API avec un **JWT forgé** (secret `'@changeme'` en dur, une session Mongo fuitée par org et par exécution, jamais expirée côté serveur), mais lookups, unlink et médias existants en **Mongo direct**.

Commun est single-tenant (une organisation, id=1, SQLite) et le serveur Nitro v3 installé expose `defineTask`/`runTask` (`nitro/task`) et `scheduledTasks` : les jobs deviennent des tâches internes au serveur, sans infrastructure externe. La config injector et le hook Vercel sont déjà en base, préservés par la CLI de migration (`organization.legacyExtra.injector`, `organization.deployment.vercel.hook`).

Seul ot-pertuis a un injector actif : 2 pipelines APIDAE (`unlink: true`, sélections 148923 et 146701) + 1 pipeline Airtable abandonné. Les mappings réels utilisent : littéraux, `$concat`, `$mapping`, `$arrayFilters`, `@apidaeSchedules`, `@apidaeMedia` ; `$relation`/`$condition`/`@poulpusWYSIWYG` n'apparaissent que chez cmar-paca (dormant) mais font partie du moteur.

## Goals / Non-Goals

**Goals:**
- Bouton « Publier » fonctionnel (tRPC `organization.deploy`) + build quotidien automatique.
- Sync APIDAE quotidienne iso-fonctionnelle pour ot-pertuis, avec les mappings existants inchangés.
- Erreurs visibles : chaque tâche produit un rapport (compteurs, erreurs par objet) au lieu du `exit 0` legacy.
- Correction des 3 bugs legacy pertinents (periodRank `FIRST1`, unlink dans la boucle + créations omises, clé pointée `metaData`) ; le session leak disparaît par construction (plus de session forgée).

**Non-Goals:**
- Airtable (abandonné — les transforms `@airtable*` ne sont pas portés ; pipeline `sort: 'airtable'` ignoré avec log).
- Notifications Slack (abandonnées).
- Nouveau format de configuration injector ou UI d'édition des mappings (viendra avec la refonte admin si besoin).
- Multi-organisation : le code lit l'organisation singleton, pas de boucle.
- Planification persistante/observable des runs (un simple log structuré suffit pour cette phase).

## Decisions

**D1 — Nitro tasks + cron interne.** Tâches `deploy` et `apidae:sync` déclarées via `defineTask` dans `apps/api/server/tasks/`, planification par `scheduledTasks` dans la config Nitro (une entrée quotidienne, heure creuse Europe/Paris). *Alternative écartée : conserver des jobs externes (GitHub Actions) — inutile en single-tenant auto-hébergé, et le runner self-hosted disparaît avec Poulpus.*

**D2 — Ordonnancement par composition.** L'entrée cron unique exécute une tâche orchestratrice qui `runTask('apidae:sync')` PUIS `runTask('deploy')` ; le deploy s'exécute même si la sync échoue (les modifications éditoriales de la veille doivent partir). La procédure tRPC `organization.deploy` appelle `runTask('deploy')` seule. *Alternative écartée : deux entrées cron décalées (le travers legacy : l'ordre n'est pas garanti et dépend de la durée de la sync).*

**D3 — Découpage du code (amendé, review PR #4).** Le moteur pur (client APIDAE, mapper, transforms schedules/media) va dans un package workspace dédié **`packages/apidae-sync`** — frontière volontaire hors du cœur open source, candidat à l'extraction dans un dépôt privé au moment de la publication (phase 6). Un connecteur APIDAE « produit » éventuel sera une réécriture typée, pas ce portage. Le sink s'appuie sur les services core existants (collections, media, storage driver) **in-process** : plus de HTTP interne, plus de JWT, plus d'accès base hors services. Les tasks Nitro dans `apps/api` ne sont que des wrappers fins. *Alternative écartée : tout dans apps/api — le moteur serait couplé au serveur et intestable isolément.*

**D4 — Iso-legacy strict sauf bugs documentés.** Les sémantiques discutables mais inoffensives du mapper sont conservées à l'identique (valeurs falsy omises via `if (value)`, `replace('\n', '\\n')` première occurrence seulement, comparateurs stricts) : les mappings d'ot-pertuis sont validés en production et le portage ne doit pas faire diverger les données. Seuls les 3 bugs avérés sont corrigés (specs). *Alternative écartée : « nettoyer » le mapper — risque de régression silencieuse sur des données réelles sans bénéfice.*

**D5 — Sérialisation des périodes.** Le legacy laissait des objets luxon `DateTime` traverser le pipeline (sérialisés en ISO par axios). Le port sérialise explicitement `fromDate`/`toDate` en ISO 8601 à la sortie de `transformSchedules` — même résultat en base, comportement explicite.

**D6 — Throttle supprimé.** Le délai de 500 ms entre records (contournement du rate-limit de l'API HTTP legacy) disparaît : les écritures sont in-process sur SQLite. Les téléchargements de médias restent séquentiels avec timeout.

**D7 — Secrets APIDAE en base.** `credentials.apiKey`/`projectId` restent dans `legacyExtra.injector` (état migré). Acceptable en single-tenant (la base EST l'instance du client) ; à revoir si une UI d'édition des mappings apparaît.

**D8 — E2E sur mock APIDAE, pas de tests unitaires (amendé, review PR #4).** La suite E2E est la spécification exécutable : jobs.feature boote l'API réelle, un mock APIDAE sert un jeu de données réel d'ot-pertuis (URLs de médias réécrites vers le mock — zéro réseau sortant), la task est déclenchée par la route interne `/_tasks/:name` (COMMUN_TASKS_HTTP, posé par le seul harness E2E) et les assertions passent par la surface tRPC de l'admin. Le dataset placeholder sera remplacé par une capture réelle fournie par Quentin.

## Risks / Trade-offs

- [L'API APIDAE change ou tombe] → la collecte échoue proprement, l'unlink est annulé (garde spec), le deploy quotidien part quand même ; le rapport de tâche rend l'échec visible.
- [Divergence mapping vs production] → scénario « mapping ot-pertuis reproduit » sur fixtures réelles ; comparaison manuelle possible avec le dump `.dump` avant bascule.
- [Dépublication massive accidentelle] → unlink uniquement en fin de passe réussie, jamais après une collecte en erreur ; les créations alimentent `linkedRecords`.
- [Tâche longue dans le serveur web] (téléchargements médias) → timeouts bornés, exécution séquentielle, nocturne ; si ça devenait un problème, Nitro permet de déporter la tâche, hors scope ici.
- [`@poulpusWYSIWYG` mal porté] → fonction pure copiée du legacy avec test de non-régression sur fixture (sortie TipTap stringifiée identique).

## Migration Plan

1. Merge → les instances existantes n'ont rien à faire : config déjà en base via la migration.
2. Pour ot-pertuis : première exécution manuelle de `apidae:sync` en local sur une copie de la base migrée, diff du contenu avec le legacy avant d'activer le cron en production.
3. Rollback : désactiver l'entrée `scheduledTasks` (le contenu déjà écrit reste valide, l'unlink n'a lieu qu'en passe réussie).

## Open Questions

- Heure du cron quotidien (proposition : 05:00 Europe/Paris, iso legacy sync, le deploy suivant immédiatement).
- Faut-il exposer un déclenchement manuel de la sync dans l'admin (comme `organization.deploy`) ? Proposition : pas dans ce change, un `runTask` via l'endpoint Nitro `/dev/tasks` suffit en interne.
