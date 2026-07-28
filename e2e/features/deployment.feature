Feature: Deployment plane
  Le plan de récupération que consomment les builds de sites : records
  (contenu publié), deployment (thème + pages + slugs) et routes legacy —
  sans déclencher de vrai build. (Le déclenchement des déploiements sera
  couvert avec le portage des jobs.)

  Scenario: Content requires a valid API token
    When I request the legacy records payload without a token
    Then the content plane answers 401

  Scenario: Published entries are served, drafts stay hidden
    Given an API token and a published news entry "fete-du-village" plus a draft
    When I request the legacy records payload with the token
    Then the records payload contains the slug "fete-du-village" but not "fete-du-village-draft"

  Scenario: Draft to published, visible on the fetch plane
    Given a logged-in "admin" session
    And an initialized organization
    And an API token
    When calling procedure "collections.create" with payload "collection-communiques" capturing the id as "collectionId"
    And calling procedure "collections.entries.create" with payload "entree-premier-communique" capturing the id as "entryId"
    Then the records payload has no entry for collection "communiques"
    When calling procedure "collections.entries.update" with payload "entree-publication" succeeds
    Then the legacy records payload contains the entry with collection "communiques"
    And the legacy deployment payload lists the slug "/communiques/premier-communique"

  Scenario: Legacy raw Authorization header is accepted
    Given an API token
    Then the legacy records payload is served with a raw Authorization header

  Scenario: The wordpress static route answers without authentication
    Then the wordpress marseille route serves the static payload
