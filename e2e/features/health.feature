Feature: API health

  Scenario: The API reports healthy over HTTP
    When I request the API health endpoint
    Then the API reports it is healthy

  Scenario: The core reports healthy over tRPC
    When I query the core health check
    Then it reports database connectivity
