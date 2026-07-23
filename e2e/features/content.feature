Feature: Legacy content plane
  The static site builds fetch published content from /api/v1/content/records
  with an API token.

  Scenario: Content requires a valid API token
    When I request the legacy records payload without a token
    Then the content plane answers 401

  Scenario: Published entries are served, drafts stay hidden
    Given an API token and a published news entry "fete-du-village" plus a draft
    When I request the legacy records payload with the token
    Then the records payload contains the slug "fete-du-village" but not "fete-du-village-draft"
