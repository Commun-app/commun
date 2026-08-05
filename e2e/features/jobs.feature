Feature: Scheduled jobs
  Portage des jobs legacy (change port-legacy-jobs) : la sync APIDAE écrit le
  contenu via les services du core, le deploy déclenche le hook Vercel
  (cron : une entrée par tâche, horaires iso legacy). Le mock APIDAE sert une
  CAPTURE RÉELLE ot-pertuis — les deux pipelines de production (lieux 148923
  + agenda 146701), mappings du dump, de bout en bout : API réelle, task
  réelle, S3 réel.

  Background:
    Given a logged-in "admin" session
    And an initialized organization
    And the APIDAE mock is up
    And the instance is configured with the ot-pertuis injector

  Scenario: The Publier button triggers the Vercel hook
    Given no Vercel deploy hook is configured
    When the site deployment is triggered
    Then the deployment fails with "deploy-hook-missing-error"
    When the Vercel deploy hook points at the local mock
    And the site deployment is triggered
    Then the deployment succeeds and the Vercel hook was called

  Scenario: Initial sync imports both real selections as published entries
    When the "apidae:sync" task runs
    Then the sync report for "lieux-apidae" counts 4 created, 0 updated and 0 expired
    And the sync report for "agenda-apidae" counts 4 created, 0 updated and 1 expired
    And the airtable pipeline was ignored
    And the entry for APIDAE id "3033090" is published
    And the entry for APIDAE id "4612219" is published
    And the pre-existing published entry "424242" is back to draft
    And the media library holds the APIDAE illustration "12460481"
    And the entry for APIDAE id "4612219" stores the schedules, the enum ids and the cover media

  Scenario: Second sync upserts without duplicates
    When the "apidae:sync" task runs
    Then the sync report for "lieux-apidae" counts 0 created, 4 updated and 0 expired
    And the sync report for "agenda-apidae" counts 0 created, 4 updated and 1 expired
    And the sync report reused every existing media without re-uploading
    And each collection holds a single entry per APIDAE id

  Scenario: An object gone from the source is unpublished
    When the object "3923166" disappears from the APIDAE selection
    And the "apidae:sync" task runs
    Then the entry for APIDAE id "3923166" is back to draft
    And the entry for APIDAE id "4612219" is published

  Scenario: An APIDAE outage never unpublishes anything
    Given the APIDAE API is down
    When the "apidae:sync" task runs
    Then the sync report flags a collect failure with the unlink skipped
    And the entry for APIDAE id "4612219" is published

