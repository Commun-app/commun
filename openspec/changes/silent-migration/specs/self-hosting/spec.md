## ADDED Requirements

### Requirement: Sauvegarde quotidienne SQLite vers S3

Une tâche Nitro `db:backup` SHALL produire un snapshot cohérent de la base SQLite (backup à chaud via l'API SQLite, jamais une copie brute du fichier ouvert) et le pousser via le driver de stockage sous `backups/<date>.db` dans le bucket de l'instance, quotidiennement via les scheduled tasks. La tâche SHALL purger les sauvegardes au-delà de la rétention (30 jours) et rapporter un résultat explicite (taille, clé, purges).

#### Scenario: Sauvegarde nocturne
- **WHEN** la tâche quotidienne `db:backup` s'exécute
- **THEN** un snapshot daté apparaît sous `backups/` dans le bucket et le rapport indique sa taille

#### Scenario: Rétention appliquée
- **WHEN** des sauvegardes de plus de 30 jours existent
- **THEN** elles sont supprimées lors de la passe et comptées dans le rapport
