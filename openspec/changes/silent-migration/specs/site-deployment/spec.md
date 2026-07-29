## ADDED Requirements

### Requirement: Mode ombre

Quand `COMMUN_JOBS_DISABLED=1`, la tâche `deploy` (planifiée OU déclenchée via `organization.deploy`) SHALL retourner un no-op explicite (`skipped: 'shadow-mode'`) sans émettre le GET du hook — pendant l'observation, le legacy reste l'unique déclencheur des builds de production, et le hook en base pointe sur le projet Vercel de TEST piloté par le pipeline de resync.

#### Scenario: Cron neutralisé en observation
- **WHEN** le cron quotidien s'exécute sur une instance avec `COMMUN_JOBS_DISABLED=1`
- **THEN** la tâche retourne `skipped: 'shadow-mode'` et aucune requête n'est émise
