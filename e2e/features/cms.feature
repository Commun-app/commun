Feature: CMS
  Le moteur de contenu : définir une collection (son schéma), y créer des
  entrées, les modifier, les lister, les supprimer — et le cycle de vie
  éditorial qui gouverne la visibilité publique.

  Scenario: Full collection and entry lifecycle
    Given a logged-in "admin" session
    When the admin creates a collection "dossiers"
    And creates a draft entry "premier-dossier" in "dossiers"
    Then the collection "dossiers" lists 1 entry
    When the entry data field "body" is updated to "Texte corrigé"
    Then the entry keeps its title and stores "Texte corrigé"
    When the entry is removed
    Then the collection "dossiers" lists 0 entries
    When the collection "dossiers" is removed
    Then the collection "dossiers" no longer exists

  Scenario: Every field type accepts a valid value
    Given a logged-in "admin" session
    And a collection "types-demo" defining every field type
    When an entry is created with valid values for every field type
    Then the entry stores every typed value

  Scenario: Invalid values are rejected per field type
    Given a logged-in "admin" session
    And a collection "types-demo" defining every field type
    Then a "boolean" field refuses the string "oui"
    And a "select" field refuses a value outside its options
    And an unknown field name is rejected

  Scenario: A select field without options is refused at definition time
    Given a logged-in "admin" session
    Then defining a collection with an optionless select is rejected

  Scenario: Slugs are unique per collection with incremental suffixes
    Given a logged-in "admin" session
    When the admin creates a collection "notes"
    And creates two entries titled "Réunion publique" in "notes"
    Then their slugs are "reunion-publique" and "reunion-publique-1"

  Scenario: Removing a field masks its values without breaking existing entries
    Given a logged-in "admin" session
    And an initialized organization
    And an API token
    When the admin creates a collection "fiches" with fields "corps" and "note"
    And creates a published entry in "fiches" with "corps" and "note" filled
    And the field "note" is removed from the collection "fiches"
    Then the records payload masks the attribute "note" for that entry
    And updating the field "corps" of the entry still succeeds
    When the field "note" is added back to the collection "fiches"
    Then the records payload serves the attribute "note" again

  Scenario: Entry listing is paginated
    Given a logged-in "admin" session
    When the admin creates a collection "annonces"
    And creates 5 entries in "annonces"
    Then listing "annonces" with limit 2 returns 2 entries
    And listing "annonces" with skip 4 returns 1 entry

  Scenario: A future publishedAt keeps a published entry off the public plane
    Given a logged-in "admin" session
    And an initialized organization
    And an API token
    When the admin creates a collection "convocations"
    And creates a draft entry "seance-prochaine" in "convocations"
    And the entry is published with a publishedAt one hour in the future
    Then the records payload has no entry for collection "convocations"

  Scenario: Editorial lifecycle gates public visibility
    Given a logged-in "admin" session
    And an initialized organization
    And an API token
    When the admin creates a collection "arretes"
    And creates a draft entry "premier-arrete" in "arretes"
    And the entry moves through the statuses "waiting" and "ready"
    Then the records payload has no entry for collection "arretes"
    When the entry is published
    Then the legacy records payload contains the entry with collection "arretes"
    And the entry carries an automatic publishedAt
