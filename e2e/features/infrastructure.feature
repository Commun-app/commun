Feature: Infrastructure
  Santé de l'instance : API joignable, base de données connectée.
  (La connectivité S3 est couverte de bout en bout par media.feature.)

  Scenario: The API reports healthy over HTTP
    When I request the API health endpoint
    Then the API reports it is healthy

  Scenario: The core reports healthy over tRPC
    When I query the core health check
    Then it reports database connectivity
