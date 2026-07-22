# core-domains

## ADDED Requirements

### Requirement: Organisation par domaines
`packages/core` SHALL organiser le code par domaine métier, chaque domaine regroupant son schéma Drizzle, ses schémas de validation Zod, ses queries et son router tRPC. Les domaines du socle v1 sont : collectivité (settings d'instance), utilisateurs/rôles, actualités, agenda, élus, projets, délibérations/séances, formulaires citoyens, médias, collections personnalisées.

#### Scenario: Structure d'un domaine
- **WHEN** on inspecte `packages/core/src/domains/<domaine>/`
- **THEN** on y trouve le schéma de table Drizzle, les schémas Zod (create/update), les queries et le router tRPC du domaine, agrégé dans le router racine

### Requirement: Persistance SQLite via Drizzle
Les données SHALL être persistées dans une base SQLite unique par instance via Drizzle ORM et le driver natif `bun:sqlite`, avec migrations versionnées (`drizzle-kit`) appliquées automatiquement au démarrage de l'instance.

#### Scenario: Première initialisation
- **WHEN** l'instance démarre avec une base vide
- **THEN** les migrations s'appliquent et créent l'ensemble des tables du socle, et un état prêt-à-l'emploi est journalisé

#### Scenario: Montée de version
- **WHEN** l'instance redémarre avec une base existante et de nouvelles migrations
- **THEN** seules les migrations manquantes sont appliquées, sans perte de données

### Requirement: Instance single-tenant
Le schéma SHALL être single-tenant : la configuration de la collectivité (identité, coordonnées, thème, domaines) est un enregistrement unique, et aucune table ne porte de clé de partition par organisation. Le vocabulaire du domaine SHALL être `collectivite` (couvre communes, communautés de communes et autres collectivités).

#### Scenario: Lecture de la configuration
- **WHEN** l'API lit la configuration de la collectivité
- **THEN** un unique enregistrement de settings est retourné, sans notion d'organisation multiple

### Requirement: Cycle de publication du contenu
Les contenus publiables (actualités, événements d'agenda, projets, délibérations) SHALL porter un statut (`draft`, `published`, avec date de publication programmable) et seuls les contenus publiés SHALL être exposés sur le plan public.

#### Scenario: Publication programmée
- **WHEN** une actualité a le statut publié avec une date de publication future
- **THEN** elle n'apparaît pas sur le plan public avant cette date, et y apparaît après

### Requirement: Délibérations et séances
Le domaine délibérations SHALL modéliser les séances du conseil (date, ordre du jour, statut) et leurs délibérations (numéro, objet, contenu, résultat de vote), publiables individuellement sur le site public.

#### Scenario: Publication d'une délibération
- **WHEN** une délibération d'une séance est marquée publiée
- **THEN** elle est exposée sur le plan public avec sa séance, son numéro et son résultat de vote

### Requirement: Collections personnalisées
Le socle SHALL permettre de définir des collections de contenu personnalisées : nom, slug et champs choisis dans un jeu fermé de types (texte, texte riche, nombre, booléen, date, média, relation, liste de choix). La validation Zod SHALL être générée depuis la définition, et les entrées SHALL bénéficier du même cycle de publication que les modules typés, exposées sur les plans tRPC et contenu public.

#### Scenario: Création d'une collection personnalisée
- **WHEN** un admin définit une collection « marchés publics » avec des champs typés (titre, date limite, document)
- **THEN** les entrées de cette collection sont validées selon ces champs, gérables en CRUD, et exposées sur le plan contenu une fois publiées

#### Scenario: Type de champ non autorisé
- **WHEN** une définition de collection utilise un type de champ hors du jeu fermé
- **THEN** la définition est rejetée à la validation avec une erreur explicite

### Requirement: Champ d'extension legacy
Chaque table de contenu SHALL comporter une colonne JSON `legacy_extra` destinée aux champs du legacy sans équivalent typé, afin qu'aucune donnée ne soit perdue à la migration.

#### Scenario: Migration d'un champ non mappé
- **WHEN** le script de migration rencontre un attribut legacy sans colonne cible
- **THEN** l'attribut est conservé dans `legacy_extra` de l'enregistrement migré
