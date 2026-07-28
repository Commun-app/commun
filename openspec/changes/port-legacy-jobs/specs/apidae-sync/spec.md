## ADDED Requirements

### Requirement: Configuration lue depuis legacyExtra.injector

La synchronisation SHALL lire sa configuration dans `organization.legacyExtra.injector` tel que préservé par la CLI de migration (`enable`, `pipelines[]` avec `sort`, `unlink`, `credentials.projectId/apiKey`, `collection`, `mapping`, `selectionIds`) — aucun nouveau format de configuration. Seuls les pipelines `sort: 'apidae'` SHALL être traités (Airtable abandonné, décision du 27/07) ; les autres sont ignorés avec un log.

#### Scenario: Configuration ot-pertuis
- **WHEN** la sync s'exécute sur une instance dont l'injector est `enable: true` avec 2 pipelines apidae et 1 pipeline airtable
- **THEN** les 2 pipelines apidae sont traités séquentiellement et le pipeline airtable est ignoré

#### Scenario: Injector absent ou désactivé
- **WHEN** `legacyExtra.injector` est absent ou `enable: false`
- **THEN** la sync se termine sans erreur avec un résultat explicite « rien à synchroniser »

### Requirement: Client APIDAE paginé

Le client APIDAE SHALL interroger `GET /v002/recherche/list-objets-touristiques` avec une query JSON (`responseFields: ['@all']`, `projetId`, `apiKey`, `selectionIds`, `first`, `count`) paginée par lots de 20, et s'arrêter à la première page vide. La base URL SHALL être `https://api.apidae-tourisme.com/api` par défaut (le legacy utilisait HTTP), surchargeable par variable d'environnement, avec un timeout borné. Une erreur réseau SHALL interrompre la collecte du pipeline et être rapportée (le legacy s'arrêtait silencieusement).

#### Scenario: Pagination complète
- **WHEN** la sélection APIDAE contient 45 objets touristiques
- **THEN** le client retourne les 45 objets et s'arrête à la première page vide (4 requêtes : first=0, 20, 40, 60)

#### Scenario: Échec réseau en cours de pagination
- **WHEN** une page renvoie une erreur réseau ou un statut non-2xx
- **THEN** la collecte s'arrête, l'erreur est comptabilisée dans le rapport du pipeline, et le mode unlink est désactivé pour cette passe

### Requirement: Moteur de mapping déclaratif iso-legacy

Le moteur SHALL appliquer les mappings existants sans modification de format : champs `{ [chemin.cible]: { source?, transform? } }`, chemins pointés avec itérateurs `$[nom]` et index `[n]`, et l'ensemble exact des transforms legacy : valeur littérale et `_source`, `$concat`, `$relation` (`relation-one-to-one`, `relation-one-to-many`, `relation-many-to-many` → tokens `collection:identifier:refId`), `$condition` (combinateurs `$and`/`$or`, comparateurs stricts `$eq`/`$ne`/`$gt`/`$gte`/`$lt`/`$lte`/`$in`/`$nin`, branches `$then`/`$else` récursives), `$mapping`, `$arrayFilters`, `@apidaeSchedules`, `@apidaeMedia`, `@poulpusWYSIWYG`. Les sémantiques legacy SHALL être préservées (valeurs falsy omises du record de sortie, transform inconnu → erreur `E_UNKNOWN_TRANSFORMATION` sur l'objet concerné) afin que les mappings validés en production produisent le même résultat.

#### Scenario: Mapping ot-pertuis reproduit
- **WHEN** un objet touristique de fixture est passé dans le mapping réel du pipeline ot-pertuis (title, description, `$concat` d'adresse, `$arrayFilters` sur les moyens de communication, `$mapping` des services)
- **THEN** le record produit est identique champ à champ à celui que produisait le legacy

#### Scenario: Transform inconnu
- **WHEN** un mapping référence un transform non supporté
- **THEN** l'objet est compté en erreur avec `E_UNKNOWN_TRANSFORMATION` et la passe continue sur les objets suivants

### Requirement: Transformation des périodes d'ouverture

`@apidaeSchedules` SHALL transformer `ouverture.periodesOuvertures[]` en `{ summary, periods: [{ periodicity, weekDays, fromDate, toDate }] }` avec luxon en zone Europe/Paris : périodicités `UNIQUE` (durée < 2 jours), `DAILY`, `WEEKLY` (jours ISO 1-7), `MONTHLY` (rang + jour), rebasage des périodes `tousLesAns` sur l'année courante, horaires appliqués sur les bornes. Les dates SHALL être sérialisées en ISO 8601 (le legacy laissait transiter des objets luxon). Deux corrections par rapport au legacy : `periodRank` SHALL valoir `FIRST`/`SECOND`/`THIRD`/`FOURTH`/`LAST` (le legacy concaténait `+ 1` produisant `"FIRST1"`), et « maintenant » SHALL être évalué à l'exécution de la tâche, pas à l'import du module.

#### Scenario: Période mensuelle
- **WHEN** une période `OUVERTURE_MOIS` indique le premier mardi du mois
- **THEN** la sortie contient `periodicity: 'MONTHLY'` et `weekDays: [{ day: 2, periodRank: 'FIRST' }]`

#### Scenario: Événement expiré
- **WHEN** toutes les périodes d'un objet sont terminées depuis plus d'un mois
- **THEN** l'objet est rejeté avec `E_EVENT_EXPIRED`, n'est pas écrit, et sera dépublié par le mode unlink

### Requirement: Synchronisation des médias

`@apidaeMedia` SHALL extraire des `illustrations` la traduction `fr` (nom, extension, URL, mime) et le `metaData` (`apidaeId`, heuristiques `logo`/`header` sur la légende) ; une illustration sans traduction `fr` SHALL être ignorée avec un log (le legacy plantait en TypeError). Le sink média SHALL être idempotent sur `metaData.apidaeId` (média existant → mise à jour du metaData, pas de re-téléchargement) et, pour un nouveau média, télécharger l'original puis l'écrire via le driver de stockage S3 du core et le finaliser via le service media — sans URL pré-signée ni HTTP interne. Le `metaData` SHALL être écrit sous des clés simples (le legacy envoyait la clé pointée `"metaData.apidaeId"` dans le payload de création).

#### Scenario: Nouveau média
- **WHEN** un objet référence une illustration inconnue de la bibliothèque
- **THEN** le fichier est téléchargé, stocké via le driver S3, finalisé via le service media avec `metaData: { apidaeId, logo, header }`, et l'id du média remplace le champ dans le record

#### Scenario: Média déjà connu
- **WHEN** un média avec le même `metaData.apidaeId` existe déjà
- **THEN** aucun téléchargement n'a lieu et l'id existant est réutilisé

### Requirement: Écriture idempotente via les services du core

Le sink SHALL écrire les entrées directement via les services du core (in-process) — plus de JWT forgé, plus de session, plus d'écriture directe en base hors services. L'idempotence SHALL reposer sur l'attribut `apidaeId` : entrée existante → mise à jour, sinon création. Le statut SHALL être `published` à chaque passage. Les enums de collection SHALL être synchronisées (items `{ id, label }` manquants ajoutés à la définition, la valeur de l'entrée ne conservant que les ids) et les tokens de relation `collection:identifier:refId` résolus en ids d'entrées.

#### Scenario: Objet inconnu créé publié
- **WHEN** un objet APIDAE n'a aucune entrée correspondante (attribut `apidaeId`)
- **THEN** une entrée est créée via le service collections avec le statut `published`

#### Scenario: Objet connu mis à jour
- **WHEN** un objet APIDAE correspond à une entrée existante
- **THEN** l'entrée est mise à jour (attributs et statut `published`), sans doublon

#### Scenario: Nouvelle valeur d'enum
- **WHEN** un record contient pour un attribut `enumeration` un item absent de la définition de la collection
- **THEN** l'item `{ id, label }` est ajouté à la définition et l'entrée ne stocke que les ids

### Requirement: Unlink en fin de passe

Pour un pipeline `unlink: true`, la dépublication (passage en `draft`) des entrées publiées absentes de la source SHALL s'exécuter UNE SEULE FOIS en fin de passe, sur l'ensemble des entrées vues (mises à jour ET créées — le legacy exécutait l'unlink à chaque record et omettait les créations, dépubliant chaque nouvelle entrée à l'itération suivante). L'unlink SHALL être annulé si la collecte APIDAE a échoué, pour ne jamais dépublier une collection entière sur une panne réseau.

#### Scenario: Entrée disparue de la source
- **WHEN** une entrée publiée porte un `apidaeId` qui n'apparaît plus dans la sélection APIDAE
- **THEN** elle passe en `draft` en fin de passe

#### Scenario: Créations préservées
- **WHEN** la passe crée de nouvelles entrées
- **THEN** ces entrées restent `published` après l'unlink de fin de passe

#### Scenario: Collecte en échec
- **WHEN** la collecte APIDAE s'est interrompue sur une erreur
- **THEN** aucun unlink n'est exécuté pour ce pipeline et l'annulation est rapportée

### Requirement: Tests sur fixtures APIDAE

La synchronisation SHALL être testée sur des fixtures de réponses APIDAE (pagination, périodes, médias, unlink) sans aucun appel réseau sortant en CI.

#### Scenario: Suite de tests hors ligne
- **WHEN** la suite de tests de la sync s'exécute en CI
- **THEN** tous les échanges APIDAE et téléchargements de médias sont servis par des fixtures locales
