Feature: Roles and permissions
  Two fixed roles per instance: admin manages everything, redacteur manages
  content only.

  Scenario: A redacteur cannot manage users or collections
    Given a logged-in "redacteur" session
    Then listing users is FORBIDDEN
    And creating a collection is FORBIDDEN

  Scenario: An admin manages users and invites members
    Given a logged-in "admin" session
    Then listing users succeeds
    And inviting "nouveau@e2e.fr" as redacteur returns a single-use link
