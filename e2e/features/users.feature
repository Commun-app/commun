Feature: Users
  Comptes et rôles de l'instance : deux rôles fixes — admin gère tout,
  rédacteur gère le contenu. Le « /me » décrit le compte appelant.

  Scenario: Me returns the calling account and its role
    Given a logged-in "redacteur" session
    Then the me procedure reports the "redacteur" role

  Scenario: A redacteur cannot manage users or collections
    Given a logged-in "redacteur" session
    Then listing users is FORBIDDEN
    And creating a collection is FORBIDDEN

  Scenario: A redacteur can read the member directory
    Given a logged-in "redacteur" session
    Then the member directory lists names without emails

  Scenario: An admin manages users and invites members
    Given a logged-in "admin" session
    Then listing users succeeds
    And inviting "nouveau@e2e.fr" as redacteur returns a single-use link

  Scenario: An admin renames a member and changes their role
    Given a logged-in "admin" session
    And another member exists with role "redacteur"
    When the admin renames that member to "Agent Renommé" with role "admin"
    Then the member appears as "Agent Renommé" with role "admin"
