Feature: Media library
  Gestion des médias : URLs signées, allowlist de types, métadonnées.
  (Les opérations exigeant un bucket réel — finalize, suppression S3, resize —
  seront couvertes avec le profil MinIO.)

  Scenario: The upload allowlist refuses SVG
    Given a logged-in "redacteur" session
    When the user requests an upload URL for "logo.svg" of type "image/svg+xml"
    Then the upload request is rejected

  Scenario: A stored media serves signed URLs and editable metadata
    Given a logged-in "redacteur" session
    And a stored media "affiche.jpg"
    Then the media library lists it with signed object URLs
    When the media alt text is updated to "Affiche de la fête"
    Then the media alt text reads "Affiche de la fête"
