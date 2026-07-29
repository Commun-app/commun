## ADDED Requirements

### Requirement: Liens libres entre entrées

Une entrée SHALL pouvoir être liée librement à d'autres entrées (iso legacy `records[]`, onglet Relations de l'admin) : la liste `related` est modifiable à l'update et le serveur SHALL entretenir la symétrie des liens inverses (une entrée ajoutée référence en retour l'entrée d'origine ; un retrait retire le lien inverse), comme pour les champs de type relation.

#### Scenario: Liaison mutuelle
- **WHEN** l'entrée A est mise à jour avec `related: [B]`
- **THEN** A référence B et B référence A dans leurs listes `related` respectives

#### Scenario: Retrait symétrique
- **WHEN** l'entrée A est mise à jour avec une liste `related` ne contenant plus B
- **THEN** B ne référence plus A
