Feature: Authentication over HTTP
  The full identity flow of an instance: single-use invitation, login with an
  httpOnly session cookie, authenticated access, logout.

  Scenario: Protected procedures refuse anonymous callers
    When I call the protected me procedure without a session
    Then the API answers UNAUTHORIZED

  Scenario: Invitation to logout lifecycle
    Given a virgin instance with an admin invitation for "maire@e2e.fr"
    When the invitee accepts the invitation and sets a password
    And logs in with those credentials
    Then a session cookie is set
    And the me procedure returns the "maire@e2e.fr" account
    When the user logs out
    Then the me procedure refuses the revoked session
