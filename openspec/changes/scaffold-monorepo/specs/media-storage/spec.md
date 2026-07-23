# media-storage

## ADDED Requirements

### Requirement: Stockage S3-compatible uniquement
Les médias SHALL être stockés sur un stockage objet S3-compatible (Scaleway, MinIO, Garage…), l'UNIQUE backend — iso legacy (review du 2026-07-23 : pas de driver disque local). Sans configuration `COMMUN_S3_*`, les opérations médias SHALL échouer avec une erreur explicite, sans empêcher le reste de l'instance de fonctionner.

#### Scenario: Instance sans configuration S3
- **WHEN** une opération média est tentée sur une instance sans variables S3
- **THEN** elle échoue avec un message explicite indiquant les variables à renseigner, et le reste de l'API reste fonctionnel

### Requirement: Flux d'upload iso legacy (URL pré-signée)
L'upload SHALL suivre le flux legacy en deux temps : `requestUpload` (mime validé contre une allowlist fermée — jamais d'exécutable) retourne une URL S3 pré-signée pour un PUT direct du client ; `finalize` confirme l'existence de l'objet (head) et enregistre le média en base. Un `finalize` sur un objet jamais uploadé SHALL être refusé.

#### Scenario: Upload complet
- **WHEN** un rédacteur demande un upload, PUT le fichier sur l'URL signée puis finalise
- **THEN** le média est enregistré (taille lue du stockage) et son URL signée de lecture est disponible

#### Scenario: Type refusé
- **WHEN** un upload est demandé pour un type hors allowlist (ex. exécutable)
- **THEN** la demande est refusée avant toute URL signée

### Requirement: Variantes d'images différées
Le retraitement en variantes webp SHALL être stubé (log explicite listant les 7 variantes legacy) — le legacy publiait ces jobs sur SQS mais plus aucun worker n'écoute. L'implémentation réelle est reportée en fin de phase (décision de review) ; l'original est immédiatement utilisable.

#### Scenario: Finalisation d'une image
- **WHEN** un média image est finalisé
- **THEN** l'original est enregistré et utilisable, et le stub de resize est journalisé

### Requirement: Bibliothèque de médias
Chaque média SHALL être enregistré en base (nom, mime, taille, alt/légende) et listable/éditable/supprimable via le plan admin ; la suppression SHALL retirer les objets du stockage (original + variantes éventuelles).

#### Scenario: Suppression d'un média
- **WHEN** un admin supprime un média
- **THEN** l'enregistrement et tous les objets stockés sont supprimés
