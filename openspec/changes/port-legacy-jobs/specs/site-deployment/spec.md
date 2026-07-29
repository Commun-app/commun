## ADDED Requirements

### Requirement: Déclenchement du build via hook Vercel

Le système SHALL déclencher le build du site statique par une requête GET sur le hook stocké dans `organization.deployment.vercel.hook` (JSON existant, préservé par la migration), avec un timeout borné. Contrairement au legacy (erreur avalée, sortie toujours en succès), un échec du GET SHALL être rapporté comme échec de la tâche.

#### Scenario: Hook configuré, build déclenché
- **WHEN** la tâche deploy s'exécute et que `organization.deployment.vercel.hook` est une URL non vide
- **THEN** un GET est émis sur cette URL et la tâche rapporte le succès

#### Scenario: Aucun hook configuré
- **WHEN** la tâche deploy s'exécute et que le hook est absent ou vide
- **THEN** la tâche se termine sans erreur avec un résultat explicite « aucun hook configuré » (aucune requête émise)

#### Scenario: Le hook répond en erreur
- **WHEN** le GET échoue (réseau, 4xx/5xx, timeout)
- **THEN** la tâche rapporte un échec avec le détail de l'erreur (pas de sortie silencieuse en succès)

### Requirement: Déclenchement à la demande depuis l'admin

Une procédure tRPC `organization.deploy` (plan admin, authentifiée) SHALL exécuter la tâche deploy à la demande et retourner son résultat — c'est elle que le bouton « Publier » de l'admin appelle.

#### Scenario: Publication manuelle
- **WHEN** un utilisateur authentifié appelle `organization.deploy` et qu'un hook est configuré
- **THEN** le GET est émis et la procédure retourne le succès

#### Scenario: Publication sans hook configuré
- **WHEN** un utilisateur authentifié appelle `organization.deploy` sans hook configuré
- **THEN** la procédure retourne une erreur explicite (`E_NO_DEPLOY_HOOK`) sans planter

### Requirement: Planification quotidienne, sync avant deploy

Les tâches SHALL être planifiées quotidiennement via les scheduled tasks Nitro, avec **une entrée cron par tâche** (review PR #4 — pas de tâche orchestratrice) : la sync APIDAE d'abord, la tâche deploy ensuite avec une marge horaire suffisante (30 min — la sync se compte en minutes). L'ordre corrige le legacy où le deploy à 00:30 précédait la sync de 05:30. Les deux entrées étant indépendantes, un échec de la sync SHALL NOT empêcher le deploy (les modifications éditoriales de la veille doivent être publiées même si APIDAE est en panne).

#### Scenario: Passe quotidienne nominale
- **WHEN** les déclencheurs quotidiens s'exécutent
- **THEN** la synchronisation APIDAE s'exécute à son horaire, puis la tâche deploy au sien, après la fin de la sync

#### Scenario: Sync en échec, deploy maintenu
- **WHEN** la synchronisation APIDAE échoue
- **THEN** la tâche deploy s'exécute quand même à son horaire (entrées cron indépendantes) et l'échec de la sync est rapporté
