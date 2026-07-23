Feature: Content lifecycle and legacy fetch routes
  A collection is created, an entry moves draft → published, and both content
  planes serve it: /api/content/<slug> and the legacy-compat /api/v1 routes
  the current site builds consume.

  Scenario: Draft to published, visible on every fetch plane
    Given a logged-in "admin" session
    And an initialized organization
    And an API token
    When the admin creates a collection "communiques"
    And creates a draft entry "premier-communique" in "communiques"
    Then the content plane for "communiques" is empty
    When the entry is published
    Then the content plane for "communiques" contains "premier-communique"
    And the legacy records payload contains the entry with collection "communiques"
    And the legacy deployment payload lists the slug "/communiques/premier-communique"

  Scenario: Legacy raw Authorization header is accepted
    Given an API token
    Then the legacy records payload is served with a raw Authorization header

  Scenario: The wordpress static route answers without authentication
    Then the wordpress marseille route serves the static payload
