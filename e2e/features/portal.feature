# Séquentiel : ces scénarios partagent l'état EN MÉMOIRE du portail (les
# compteurs de tentatives) et un unique serveur. Les jouer en parallèle les
# ferait s'observer les uns les autres.
@mode:serial
Feature: Auth portal
  Première brique du cloud (silent-migration) : le portail présente les
  identifiants à TOUTES les instances qu'il connaît et route vers celle qui
  les accepte — identifiants legacy, URL historique conservée, aucune
  énumération de comptes.

  Pas d'annuaire email → instance : il serait une photographie, et un compte
  créé après sa génération se verrait refuser sans explication. Interroger les
  instances laisse la vérité là où elle est produite.

  Scenario: Delegated login hands a session to the instance
    Given an account "portal@e2e.fr" on the instance
    When the portal signs in "portal@e2e.fr" with the default password
    Then the portal returns a hand-off URL for that instance
    And the hand-off token opens a session on the instance

  Scenario: Unknown email gets the invalid-credentials answer
    When the portal signs in "inconnu@e2e.fr" with the default password
    Then the portal answers 401 with "Identifiants invalides"

  Scenario: Wrong password gets the same invalid-credentials answer
    Given an account "portal@e2e.fr" on the instance
    When the portal signs in "portal@e2e.fr" with password "mauvais-mot-de-passe"
    Then the portal answers 401 with "Identifiants invalides"

  # Une tentative de connexion en devient autant qu'il y a d'instances : sans
  # ce garde-fou, le portail amplifierait une attaque par force brute.
  Scenario: Repeated attempts are throttled
    When the portal is hammered 11 times with "brute@e2e.fr"
    Then the portal answers 429 with "Trop de tentatives, réessayez dans quelques minutes"

  # Le portail traduit l'événement métier de l'instance en email transactionnel.
  # Cette logique vit ICI, jamais dans le cœur : un self-hosteur doit rester
  # libre de brancher son propre fournisseur.
  Scenario: The email webhook refuses an unauthenticated caller
    When an email event is posted without the shared secret
    Then the portal answers 401 with "non autorisé"

  Scenario: A known event without a configured template is accepted, not lost
    When an email event "eventInconnu" is posted with the shared secret
    Then the portal accepts it without delivering
