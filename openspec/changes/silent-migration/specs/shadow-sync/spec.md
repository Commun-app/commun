## ADDED Requirements

### Requirement: Pipeline de resynchronisation legacy vers instance

Un pipeline `resync <client>` SHALL rejouer l'état legacy sur l'instance d'un client : dump Mongo → CLI de migration (base recréée de zéro, idempotence par construction) → remplacement de la base de l'instance (dépôt + redémarrage du conteneur — SQLite ne se remplace pas à chaud) → synchronisation S3 incrémentale des objets du manifeste → déclenchement du build Vercel d'observation. Il SHALL être exécutable à la demande et planifiable la nuit. Aucune synchronisation temps réel n'est fournie (décision D6) : la bascule repose sur un gel des écritures legacy suivi d'un resync final.

#### Scenario: Resync nominal
- **WHEN** `resync cmar` s'exécute
- **THEN** l'instance CMAR sert le contenu du dernier dump (base + médias), et son build Vercel d'observation est déclenché

#### Scenario: Échec en cours de pipeline
- **WHEN** une étape échoue (dump, migration, dépôt)
- **THEN** le pipeline s'arrête en erreur explicite sans laisser l'instance dans un état mixte (la base n'est remplacée qu'une fois la migration réussie)

### Requirement: Vérification d'iso-fonctionnement

L'observation SHALL s'appuyer sur une comparaison outillée entre l'instance et la prod legacy : golden-diff des payloads REST legacy-compat (tolérances documentées : horodatages, URLs signées) après chaque resync, plus le site Vercel d'observation pour la revue visuelle. Un écart hors tolérance SHALL être traité comme un défaut bloquant la bascule du client.

#### Scenario: Golden-diff après resync
- **WHEN** un resync se termine
- **THEN** le golden-diff du client s'exécute contre la prod legacy et son résultat est consigné (0 écart hors tolérance attendu)
