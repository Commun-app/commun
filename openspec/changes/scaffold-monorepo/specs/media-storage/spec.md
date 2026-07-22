# media-storage

## ADDED Requirements

### Requirement: Interface de stockage à deux drivers
La gestion des médias SHALL passer par une interface de stockage unique dans `@commun/core` avec deux drivers sélectionnés par configuration : S3-compatible (un bucket par commune, URLs pré-signées) et disque local (répertoire de l'instance, servi par l'API). L'auto-hébergement SHALL fonctionner sans aucun service externe avec le driver local.

#### Scenario: Instance en driver local
- **WHEN** une instance est configurée sans identifiants S3
- **THEN** les uploads sont stockés sur le disque local et servis par l'API, sans erreur ni dépendance externe

#### Scenario: Instance en driver S3
- **WHEN** une instance est configurée avec un endpoint S3-compatible
- **THEN** les uploads passent par URL pré-signée vers le bucket de la commune et les lectures par URL signée à durée limitée

### Requirement: Upload validé et traité
Les uploads SHALL être réservés aux utilisateurs authentifiés, limités en taille et en types MIME autorisés (images, PDF, documents bureautiques usuels), et les images SHALL être déclinées en variantes web (webp, tailles multiples) par des tâches asynchrones internes à l'instance (Nitro tasks + sharp), sans file d'attente externe.

#### Scenario: Upload d'une image
- **WHEN** un rédacteur uploade une image JPEG valide
- **THEN** l'original est stocké, une tâche interne génère les variantes webp, et l'enregistrement média référence l'ensemble

#### Scenario: Type refusé
- **WHEN** un utilisateur tente d'uploader un fichier d'un type non autorisé (ex. exécutable)
- **THEN** l'upload est rejeté avec une erreur explicite et rien n'est stocké

### Requirement: Bibliothèque de médias
Chaque média SHALL être enregistré en base (nom, mime, taille, variantes, légende/alt) et listable/supprimable via le plan admin ; la suppression SHALL retirer les objets du stockage.

#### Scenario: Suppression d'un média
- **WHEN** un admin supprime un média
- **THEN** l'enregistrement et tous les objets stockés (original + variantes) sont supprimés
