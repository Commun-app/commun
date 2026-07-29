Feature: Auth portal
  Première brique du cloud (silent-migration) : le portail authentifie
  l'utilisateur auprès de SON instance (mapping email → instance) et remet la
  session à l'admin par fragment d'URL — identifiants legacy, URL historique
  conservée, aucune énumération de comptes.

  Scenario: Delegated login hands a session to the instance
    Given a portal-mapped account "portal@e2e.fr"
    When the portal signs in "portal@e2e.fr" with the default password
    Then the portal returns an sso hand-off URL for the mapped instance
    And the hand-off token opens a session on the instance

  Scenario: Unknown email gets the invalid-credentials answer
    When the portal signs in "inconnu@e2e.fr" with the default password
    Then the portal answers 401 with "Identifiants invalides"

  Scenario: Wrong password gets the same invalid-credentials answer
    Given a portal-mapped account "portal@e2e.fr"
    When the portal signs in "portal@e2e.fr" with password "mauvais-mot-de-passe"
    Then the portal answers 401 with "Identifiants invalides"
