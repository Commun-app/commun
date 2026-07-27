Feature: Infrastructure
  Santé de l'instance : API joignable, base de données connectée, stockage S3
  capable de délivrer des URLs signées.

  Scenario: The API reports healthy over HTTP
    When I request the API health endpoint
    Then the API reports it is healthy

  Scenario: The core reports healthy over tRPC
    When I query the core health check
    Then it reports database connectivity

  Scenario: The S3 storage delivers signed upload URLs
    Given a logged-in "admin" session
    When the user requests an upload URL for "photo.jpg" of type "image/jpeg"
    Then a signed S3 upload URL is delivered
