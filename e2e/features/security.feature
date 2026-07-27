Feature: Security
  Identité et accès de l'instance : invitations, sessions, mots de passe et
  tokens API — le token de session opaque voyage en Authorization: Bearer,
  aucun cookie (iso legacy).

  Scenario: Protected procedures refuse anonymous callers
    When I call the protected me procedure without a session
    Then the API answers UNAUTHORIZED

  Scenario: Invitation to logout lifecycle
    Given a virgin instance with an admin invitation for "maire@e2e.fr"
    When the invitee accepts the invitation and sets a password
    And logs in with those credentials
    Then a session token is returned
    And the me procedure returns the "maire@e2e.fr" account
    When the user logs out
    Then the me procedure refuses the revoked token

  Scenario: Password reset end to end through the email webhook
    Given an activated account "distrait@e2e.fr" named "Agent Distrait"
    When a password reset is requested for "distrait@e2e.fr"
    Then a "password-reset" email is emitted through the signed webhook
    When the reset link is consumed with the new password "toute-nouvelle-phrase"
    Then logging in "distrait@e2e.fr" with password "toute-nouvelle-phrase" succeeds
    And logging in "distrait@e2e.fr" with password "mot-de-passe-e2e" is refused
    And the account "distrait@e2e.fr" is still named "Agent Distrait"

  Scenario: Password reset stays silent for unknown accounts
    When a password reset is requested for "fantome@e2e.fr"
    Then the API answers ok without emitting any email

  Scenario: An expired invitation is refused
    Given a virgin instance with an admin invitation for "retardataire@e2e.fr"
    And the invitations of "retardataire@e2e.fr" are expired
    Then accepting that invitation is refused as invalid or expired

  Scenario: API tokens lifecycle
    Given a logged-in "admin" session
    When the admin creates an API token named "site-build"
    Then the content plane accepts the new token
    And the token list shows "site-build" as active
    When the admin revokes that token
    Then the content plane refuses the revoked token
    And the token list shows "site-build" as revoked

  Scenario: Session device list and targeted revocation
    Given an activated account "nomade@e2e.fr" named "Agent Nomade"
    When the account logs in from two devices
    Then the session list shows 2 active devices and flags the current one
    When the other device session is revoked
    Then the session list shows 1 active device
