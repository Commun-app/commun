Feature: Media library
  Gestion des médias contre un S3 réel (MinIO monté par la suite) :
  URL présignée d'upload, écriture directe dans le bucket, URL signée de
  lecture, métadonnées, suppression. (Les variantes resize s'ajouteront ici
  quand elles seront implémentées.)

  Scenario: Full round trip, presigned upload then signed read
    Given the S3 bucket is provisioned
    And a logged-in "redacteur" session
    When the user requests an upload URL for "affiche.jpg" of type "image/jpeg"
    Then a signed S3 upload URL is delivered
    When the file bytes are uploaded to the presigned URL
    And the upload is finalized
    Then the media library lists it with signed object URLs
    And downloading the signed original URL returns the uploaded bytes
    When the media alt text is updated to "Affiche de la fête"
    Then the media alt text reads "Affiche de la fête"
    When the media is removed
    Then the media library no longer lists it
