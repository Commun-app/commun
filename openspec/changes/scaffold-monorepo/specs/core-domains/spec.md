# core-domains

## ADDED Requirements

### Requirement: Organisation par domaines
`packages/core` SHALL organiser le code par domaine, chaque domaine regroupant son schéma Drizzle, ses schémas de validation Zod, ses queries et son router tRPC. Les domaines système du socle v1 sont : `organization` (settings d'instance), `users` (utilisateurs/sessions/invitations/tokens API), `media`, `collections` (moteur de contenu générique). Périmètre acté (review 2026-07-23) : la phase 1 reproduit l'existant legacy à iso-fonctionnalités — les délibérations et les formulaires citoyens sont des fonctionnalités NOUVELLES, hors périmètre, réintroduites par leurs propres changes ultérieurs. Le code, les identifiants et les noms de tables SHALL être en anglais ; seules les chaînes destinées aux utilisateurs restent en français.

#### Scenario: Structure d'un domaine
- **WHEN** on inspecte `packages/core/src/domains/<domain>/`
- **THEN** on y trouve le schéma de table Drizzle, les schémas Zod, les queries et le router tRPC du domaine, agrégé dans le router racine

### Requirement: Persistance SQLite via Drizzle
Les données SHALL être persistées dans une base SQLite unique par instance via Drizzle ORM et le driver natif `bun:sqlite`, avec migrations versionnées (`drizzle-kit`) appliquées automatiquement au démarrage de l'instance et clés étrangères activées (`PRAGMA foreign_keys=ON`).

#### Scenario: Première initialisation
- **WHEN** l'instance démarre avec une base vide
- **THEN** les migrations s'appliquent et créent l'ensemble des tables du socle ainsi que les collections par défaut

#### Scenario: Montée de version
- **WHEN** l'instance redémarre avec une base existante et de nouvelles migrations
- **THEN** seules les migrations manquantes sont appliquées, sans perte de données

### Requirement: Instance single-tenant
Le schéma SHALL être single-tenant : la configuration de la collectivité est un enregistrement unique de la table `organization` (id=1), et aucune table ne porte de clé de partition par tenant.

#### Scenario: Lecture de la configuration
- **WHEN** l'API lit la configuration de l'organisation
- **THEN** un unique enregistrement de settings est retourné, sans notion de tenant multiple

### Requirement: Collections génériques comme modèle de contenu principal
Le contenu SHALL être modélisé par le moteur de collections : définitions en base (nom, slug, champs choisis dans un jeu fermé de 8 types — text, rich-text, number, boolean, date, media, relation, select), validation Zod générée depuis la définition, entrées (table `entries`) avec titre/slug/données typées et cycle de publication. Les entrées invalides SHALL être rejetées, et le slug d'une entrée SHALL être unique au sein de sa collection (les slugs sont des segments de route du site publié).

#### Scenario: Création d'une collection et d'une entrée valide
- **WHEN** un admin définit une collection « marchés publics » avec des champs typés et qu'une entrée conforme est créée
- **THEN** l'entrée est validée selon ces champs, gérable en CRUD, et exposée sur le plan contenu une fois publiée

#### Scenario: Type de champ non autorisé
- **WHEN** une définition de collection utilise un type de champ hors du jeu fermé
- **THEN** la définition est rejetée à la validation avec une erreur explicite

#### Scenario: Entrée non conforme
- **WHEN** une entrée viole la définition de sa collection (champ requis manquant, choix hors liste)
- **THEN** l'écriture est refusée avec une erreur explicite

#### Scenario: Slug en double dans une collection
- **WHEN** une entrée est créée avec un slug déjà utilisé dans la même collection
- **THEN** l'écriture est refusée avec une erreur explicite (le même slug reste permis dans une autre collection)

### Requirement: Collections par défaut seedées par migration — RETIRÉ (décision Quentin, 2026-07-28)
Le seed des quatre collections par défaut a été SUPPRIMÉ (revue PR #1) : une
instance neuve démarre sans collection, l'admin les crée librement ; les
instances migrées reçoivent celles du legacy.

### Requirement: Cycle de publication du contenu
Les entrées de collections SHALL porter un statut (`draft`, `published`, avec date de publication programmable) et seuls les contenus publiés SHALL être exposés sur le plan public.

#### Scenario: Publication programmée — RETIRÉ (revue 2026-07-28, vérifié dans service-records)
- Le legacy filtre le plan public sur le STATUT seul ; `publishedAt` n'est qu'un horodatage réécrit à chaque publication. La planification n'existait pas — elle reviendra éventuellement comme vraie feature post-bascule.

### Requirement: Champ d'extension legacy
Chaque table de contenu SHALL comporter une colonne JSON `legacy_extra` destinée aux champs du legacy sans équivalent, afin qu'aucune donnée ne soit perdue à la migration.

#### Scenario: Migration d'un champ non mappé
- **WHEN** le script de migration rencontre un attribut legacy sans destination
- **THEN** l'attribut est conservé dans `legacy_extra` de l'enregistrement migré
