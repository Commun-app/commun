## ADDED Requirements

### Requirement: Mode ombre

Quand `COMMUN_JOBS_DISABLED=1`, la tâche planifiée `apidae:sync` SHALL retourner un no-op explicite (`skipped: 'shadow-mode'`) sans collecter ni écrire — pendant l'observation, le legacy reste l'unique synchroniseur APIDAE et le contenu synchronisé arrive dans l'instance par la resynchronisation. Le déclenchement MANUEL (route interne des tasks) SHALL rester possible pour comparaison ponctuelle.

#### Scenario: Cron neutralisé en observation
- **WHEN** le cron quotidien s'exécute sur une instance avec `COMMUN_JOBS_DISABLED=1`
- **THEN** la tâche retourne `skipped: 'shadow-mode'` sans aucun appel APIDAE
