Feature: Users
  Comptes et rôles de l'instance : deux rôles fixes — admin gère tout,
  rédacteur gère le contenu. Le « /me » décrit le compte appelant.

  Scenario Outline: Me returns the calling account and its role
    Given a logged-in "<role>" session
    Then the me procedure reports the "<role>" role

    Examples:
      | role      |
      | admin     |
      | redacteur |

  Scenario: A redacteur cannot manage users or collections
    Given a logged-in "redacteur" session
    Then calling procedure "users.list" fails with "FORBIDDEN"
    And calling procedure "collections.create" with payload "collection-interdite" fails with "FORBIDDEN"

  Scenario: A redacteur can read the member directory
    Given a logged-in "redacteur" session
    Then the member directory lists names without emails

  Scenario: An admin manages users and invites members
    Given a logged-in "admin" session
    Then calling procedure "users.list" succeeds
    And inviting "nouveau@e2e.fr" as redacteur returns a single-use link

  Scenario: An admin renames a member and changes their role
    Given a logged-in "admin" session
    And another member exists with role "redacteur"
    When the admin renames that member to "Agent Renommé" with role "admin"
    Then the member appears as "Agent Renommé" with role "admin"

  Scenario: An admin removes a member but never their own account
    Given a logged-in "admin" session
    And another member exists with role "redacteur"
    When the admin removes that member
    Then the member no longer exists
    And removing their own account is refused

  Scenario: The organization settings are readable and editable by the admin
    Given a logged-in "admin" session
    And an initialized organization
    When the admin updates the organization name to "Commune Renommée"
    Then the organization reads "Commune Renommée"
    And initializing the organization again is refused
