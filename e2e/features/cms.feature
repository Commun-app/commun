Feature: CMS
  Le moteur de contenu : définir une collection (son schéma), y créer des
  entrées, les modifier, les lister, les supprimer — et le cycle de vie
  éditorial qui gouverne la visibilité publique. Les payloads nommés vivent
  dans e2e/data ($clef = interpolé depuis l'état du scénario).

  Scenario: Full collection and entry lifecycle
    Given a logged-in "admin" session
    When calling procedure "collections.create" with payload "collection-dossiers" capturing the id as "collectionId"
    And calling procedure "collections.entries.create" with payload "entree-premier-dossier" capturing the id as "entryId"
    Then the collection "dossiers" lists 1 entry
    When calling procedure "collections.entries.update" with payload "entree-maj-body" succeeds
    Then the entry keeps its title "Premier dossier" and stores "Texte corrigé"
    When calling procedure "collections.entries.remove" with payload "entree-suppression" succeeds
    Then the collection "dossiers" lists 0 entries
    When calling procedure "collections.remove" with payload "collection-suppression" succeeds
    Then the collection "dossiers" no longer exists

  Scenario: Every field type accepts a valid value
    Given a logged-in "admin" session
    When calling procedure "collections.create" with payload "collection-types-valides" capturing the id as "collectionId"
    And calling procedure "collections.entries.create" with payload "entree-tous-types" capturing the id as "entryId"
    Then the entry stores every typed value

  Scenario: Invalid values are rejected per field type
    Given a logged-in "admin" session
    When calling procedure "collections.create" with payload "collection-types-invalides" capturing the id as "collectionId"
    Then calling procedure "collections.entries.create" with payload "entree-booleen-invalide" fails with "BAD_REQUEST"
    And calling procedure "collections.entries.create" with payload "entree-select-hors-options" fails with "BAD_REQUEST"
    And calling procedure "collections.entries.create" with payload "entree-champ-inconnu" fails with "BAD_REQUEST"

  Scenario: A select field without options is refused at definition time
    Given a logged-in "admin" session
    Then calling procedure "collections.create" with payload "collection-select-sans-options" fails with "BAD_REQUEST"

  Scenario: Slugs are unique per collection with incremental suffixes
    Given a logged-in "admin" session
    When calling procedure "collections.create" with payload "collection-notes" capturing the id as "collectionId"
    And calling procedure "collections.entries.create" with payload "entree-reunion" capturing the id as "firstEntryId"
    And calling procedure "collections.entries.create" with payload "entree-reunion" capturing the id as "secondEntryId"
    Then the entries captured as "firstEntryId" and "secondEntryId" have slugs "reunion-publique" and "reunion-publique-1"

  Scenario: Removing a field masks its values without breaking existing entries
    Given a logged-in "admin" session
    And an initialized organization
    And an API token
    When calling procedure "collections.create" with payload "collection-fiches" capturing the id as "collectionId"
    And calling procedure "collections.entries.create" with payload "entree-fiche-complete" capturing the id as "entryId"
    And calling procedure "collections.update" with payload "collection-fiches-sans-note" succeeds
    Then the records payload masks the attribute "note" for that entry
    And calling procedure "collections.entries.update" with payload "entree-fiche-corps-corrige" succeeds
    When calling procedure "collections.update" with payload "collection-fiches-avec-note" succeeds
    Then the records payload serves the attribute "note" again

  Scenario: Entry listing is paginated
    Given a logged-in "admin" session
    When calling procedure "collections.create" with payload "collection-annonces" capturing the id as "collectionId"
    And creates 5 entries in "annonces"
    Then listing "annonces" with limit 2 returns 2 entries
    And listing "annonces" with skip 4 returns 1 entry

  Scenario: Editorial lifecycle gates public visibility
    Given a logged-in "admin" session
    And an initialized organization
    And an API token
    When calling procedure "collections.create" with payload "collection-arretes" capturing the id as "collectionId"
    And calling procedure "collections.entries.create" with payload "entree-premier-arrete" capturing the id as "entryId"
    And calling procedure "collections.entries.update" with payload "entree-statut-waiting" succeeds
    And calling procedure "collections.entries.update" with payload "entree-statut-ready" succeeds
    Then the records payload has no entry for collection "arretes"
    When calling procedure "collections.entries.update" with payload "entree-publication" succeeds
    Then the legacy records payload contains the entry with collection "arretes"
    And the entry carries an automatic publishedAt
