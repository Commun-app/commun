# legacy-migration Specification

## Purpose
TBD - created by archiving change scaffold-monorepo. Update Purpose after archive.
## Requirements
### Requirement: CLI de migration hors ligne
`packages/legacy-migrate` (projet bun LOCAL hors repo — gitignoré, données de production) SHALL fournir une CLI qui lit un dump MongoDB Poulpus (mongodump bson ou export jsonl) **hors ligne** — sans connexion à la production — et produit une base SQLite Commun pour UNE organisation donnée (sélection par slug).

#### Scenario: Migration d'une organisation
- **WHEN** la CLI est exécutée avec le chemin du dump et le slug d'une organisation (ex. `grigny`)
- **THEN** une base SQLite est produite contenant les contenus de cette organisation mappés vers les domaines typés du socle

### Requirement: Mapping des Collections legacy vers les domaines typés
Le script SHALL mapper les Collections/Records legacy (structure `attributes` JSON) vers les domaines Commun (actualités, agenda, élus, projets, délibérations, médias, pages), en résolvant les relations (labels, records liés, médias) et en préservant les statuts de publication. Les Collections legacy sans domaine typé cible SHALL être migrées vers des collections personnalisées plutôt qu'abandonnées.

#### Scenario: Record avec relations
- **WHEN** un record legacy référence des labels et des médias
- **THEN** l'enregistrement migré référence les entités migrées correspondantes, sans lien cassé

#### Scenario: Attribut sans destination typée
- **WHEN** un attribut legacy n'a pas de colonne cible dans le schéma v1
- **THEN** il est conservé dans la colonne JSON `legacy_extra` de l'enregistrement, et compté dans le rapport

### Requirement: Migration des médias
Le script SHALL générer un manifeste des médias à transférer (objets S3 legacy → stockage cible par commune) avec correspondance ancienne/nouvelle référence ; le transfert effectif des objets est exécutable séparément (phase 4), mais le manifeste et le remapping des références SHALL être produits dès ce change.

#### Scenario: Manifeste des médias
- **WHEN** la migration d'une organisation s'exécute
- **THEN** un manifeste liste chaque objet média legacy, sa destination cible et les enregistrements qui le référencent

### Requirement: Rapport de couverture (livrable de dérisquage)
Chaque exécution SHALL produire un rapport par organisation : entités migrées par domaine, attributs mappés vs relégués en `legacy_extra`, entités sans domaine cible, erreurs. Le rapport SHALL être exécuté sur un dump réel des 4 organisations (Grigny, LCSS, Pertuis, CMAR PACA) avant la clôture de ce change.

#### Scenario: Rapport sur dump réel
- **WHEN** la CLI est exécutée sur le dump de production des 4 organisations
- **THEN** 4 rapports de couverture sont produits, identifiant précisément ce qui ne mappe pas — sans aucune écriture vers la production

### Requirement: Idempotence
La migration SHALL être rejouable : relancer la CLI sur le même dump SHALL produire une base cible identique (reconstruction complète, pas d'accumulation).

#### Scenario: Double exécution
- **WHEN** la CLI est exécutée deux fois de suite avec les mêmes entrées
- **THEN** la base produite au second passage est équivalente à celle du premier

