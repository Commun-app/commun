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
