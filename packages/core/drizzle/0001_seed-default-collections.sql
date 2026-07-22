-- Seed the four default content collections (design D6 rev. 2): standard
-- content ships as ordinary collections so communes can adapt or extend them.
-- Runs exactly once per database via the migration journal — a commune that
-- deletes one of these on purpose will NOT see it recreated on restart.
-- Fixed ids keep the seed deterministic; entry rows already carry title+slug,
-- so the fields below only describe the domain-specific data.

INSERT INTO `collection_definitions` (`id`, `name`, `slug`, `description`, `fields`, `created_at`, `updated_at`) VALUES
(
  'col_news', 'Actualités', 'news', 'Actualités de la collectivité',
  '[{"name":"excerpt","label":"Résumé","type":"text","required":false},{"name":"content","label":"Contenu","type":"rich-text","required":false},{"name":"cover","label":"Image de couverture","type":"media","required":false}]',
  strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')
),
(
  'col_events', 'Agenda', 'events', 'Événements et permanences',
  '[{"name":"start_date","label":"Date de début","type":"date","required":true},{"name":"end_date","label":"Date de fin","type":"date","required":false},{"name":"location","label":"Lieu","type":"text","required":false},{"name":"excerpt","label":"Résumé","type":"text","required":false},{"name":"content","label":"Contenu","type":"rich-text","required":false},{"name":"cover","label":"Image de couverture","type":"media","required":false}]',
  strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')
),
(
  'col_officials', 'Élus', 'officials', 'Annuaire des élus',
  '[{"name":"role","label":"Fonction","type":"text","required":false},{"name":"delegation","label":"Délégation","type":"text","required":false},{"name":"bio","label":"Biographie","type":"rich-text","required":false},{"name":"photo","label":"Photo","type":"media","required":false},{"name":"sort_order","label":"Ordre d''affichage","type":"number","required":false}]',
  strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')
),
(
  'col_projects', 'Projets', 'projects', 'Projets de la collectivité',
  '[{"name":"state","label":"État","type":"select","required":false,"options":["study","in-progress","done"]},{"name":"start_date","label":"Date de début","type":"date","required":false},{"name":"end_date","label":"Date de fin","type":"date","required":false},{"name":"excerpt","label":"Résumé","type":"text","required":false},{"name":"content","label":"Contenu","type":"rich-text","required":false},{"name":"cover","label":"Image de couverture","type":"media","required":false}]',
  strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now')
);
