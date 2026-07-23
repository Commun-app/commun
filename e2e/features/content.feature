Feature: Public content plane
  The static site build fetches published content with an API token.

  Scenario: Content requires a valid API token
    When I request the news content without a token
    Then the content plane answers 401

  Scenario: Published entries are served, drafts stay hidden
    Given an API token and a published news entry "fete-du-village" plus a draft
    When I request the news content with the token
    Then only "fete-du-village" is returned

  Scenario: Unknown collections yield 404
    Given an API token and a published news entry "fete-du-village" plus a draft
    When I request the "does-not-exist" content with the token
    Then the content plane answers 404
