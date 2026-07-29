Feature: Scheduled jobs
  Portage des jobs legacy (change port-legacy-jobs) : la sync APIDAE écrit le
  contenu via les services du core, le deploy déclenche le hook Vercel
  (cron : une entrée par tâche, sync avant deploy par la marge horaire). Le mock APIDAE sert un jeu de
  données ot-pertuis de bout en bout — API réelle, task réelle, S3 réel.

  Background:
    Given a logged-in "admin" session
    And an initialized organization
    And the APIDAE mock is up
    And the instance is configured with the ot-pertuis injector

  Scenario: The Publier button triggers the Vercel hook
    Given no Vercel deploy hook is configured
    When the site deployment is triggered
    Then the deployment fails with "E_NO_DEPLOY_HOOK"
    When the Vercel deploy hook points at the local mock
    And the site deployment is triggered
    Then the deployment succeeds and the Vercel hook was called

  Scenario: Initial sync imports the selection as published entries
    When the "apidae:sync" task runs
    Then the sync report counts 2 created, 0 updated and 1 expired object
    And the airtable pipeline was ignored
    And the entry for APIDAE id "5211547" is published
    And the entry for APIDAE id "5211999" is published
    And the pre-existing published entry "424242" is back to draft
    And the media library holds the APIDAE illustration "111"
    And the entry for APIDAE id "5211547" stores the schedules, the enum ids and the cover media

  Scenario: Second sync upserts without duplicates
    When the "apidae:sync" task runs
    Then the sync report counts 0 created, 2 updated and 1 expired object
    And the sync report reused the existing media without re-uploading
    And the collection holds a single entry per APIDAE id

  Scenario: An object gone from the source is unpublished
    When the object "5211999" disappears from the APIDAE selection
    And the "apidae:sync" task runs
    Then the entry for APIDAE id "5211999" is back to draft
    And the entry for APIDAE id "5211547" is published

  Scenario: An APIDAE outage never unpublishes anything
    Given the APIDAE API is down
    When the "apidae:sync" task runs
    Then the sync report flags a collect failure with the unlink skipped
    And the entry for APIDAE id "5211547" is published
