# Audit de parité legacy → commun.app

> Audit croisé par 5 agents (un par service legacy), 2026-07-23. Chaque constat est vérifié
> fichier:ligne des deux côtés. Les décisions déjà actées (single-tenant, Bearer, S3-only,
> rôles fixes, routes mortes abandonnées…) ne sont pas recomptées.
>
> **STATUT (2026-07-23)** : annoté par Quentin (« ISO legacy » quasi général) et TRAITÉ.
> Implémenté : items 1-9, 12-20, 22(confirmé 30j), 23, 25, 26, 28 + SVG retiré (18) + TTL 7j (17).
> Reportés en tâches dédiées : 10 (admin → client tRPC, tasks 9.11), 11+24 (jobs → Nitro tasks, 9.10),
> 21 (Loops emails, 9.9), 27 (phase sécurité, 9.12).

---

## 🔴 P0 — Casse la bascule des thèmes (payload public `/api/v1/content/*`)

Les thèmes actuels consomment ces payloads tels quels. Tout écart = build cassé au cutover.

1. **WYSIWYG : string vs objet.** Le legacy renvoyait le rich-text **stringifié** (`JSON.stringify` après résolution — `content/records.action.js:83`) ; nous renvoyons un objet. Un thème qui fait `JSON.parse(record.body)` casse.
2. **`_media:<id>` non résolu dans `content/deployment`.** Le legacy remplaçait récursivement toute chaîne `_media:<id>` de `_theme`/`_pages` par un média signé (`_parseRecursively`, `deployment.action.js:38-68`). Chez nous : zéro occurrence de `_media` — logos/covers du thème sortiront en `_media:xxx` bruts → images cassées au build.
3. **Champ `media` : tableau de records complets vs `{id, url}` unique.** Legacy : `fetchMediaRecords` → **tableau** de médias complets avec `objects.original` = URL signée. Nous : un seul `{id, url}`. Casse les champs multi-médias et tout accès `objects.original`/`originalName`.
4. **`attrs.mediaRecord` absent des nœuds image/file du wysiwyg** (legacy posait `mediaRecord` complet + `src` ; nous ne posons que `src`).
5. **`options.hidden` non exclu** : les attributs marqués cachés dans la définition fuient dans le payload public (legacy les excluait).
6. **Events à `schedules.periods` vide publiés** (le legacy les filtrait par `$nor`) — pollue l'agenda des sites.
7. **`array-of-steps` non résolu** (type absent du jeu fermé ; le contenu des étapes reste brut).

## 🔴 P0 — Bloquants de bascule (infra)

8. **Continuité des tokens API : rompue.** La CLI de migration ne migre pas les tokens, et les formats sont incompatibles (legacy `<20>.<20>` **en clair** vs `commun_*` **hashés**). Au cutover, tous les builds de sites → 401. Options : (a) tâche de cutover = régénérer un token par site + MAJ config de build ; (b) faire importer par la CLI les tokens legacy en les hashant (continuité totale, les thèmes ne changent rien). **La (b) est faisable et invisible pour les sites.**
9. **Médias : aucune URL signée exposée côté tRPC.** `media.list` retourne les **clés S3 brutes** (`objects.original` = `"aB3x/photo.jpg"`) et aucune procédure `media.get`/`url` n'existe — le legacy signait à la lecture (7 jours). Tout client d'affichage est cassé. À porter : résolution d'URLs signées dans `list` + procédure `get`.

## 🟠 P1 — Le test "admin legacy contre commun.app" (votre prochaine étape)

Verdict du gateway : **aucun endpoint REST consommé par l'admin legacy n'est servi** — le test échouera dès `PUT /api/v1/entrance/local` (404). Pour le faire fonctionner il faudrait une couche compat complète : routes `/api/v1/{entrance,account,users,roles,organizations,records,media,tokens}`, enveloppe `{name, description, data}` sur chaque réponse, pagination `skip`/`limit`, token de login à `data.token` (pointer nuxt-auth), et acceptation du header `Authorization` **brut** (l'admin n'envoie pas toujours `Bearer`). Trois options à arbitrer :

10. **[DÉCISION]** (a) Construire la couche compat REST admin (~15 routes, jetable après la phase 2) → le test devient possible et l'admin legacy peut servir d'interim pendant la migration ; (b) sauter le test et aller directement à l'admin phase 2 (tRPC) ; (c) couche compat *partielle* (lecture seule + login) juste pour valider les données migrées visuellement.
11. **job-data-sync (APIDAE/Airtable) : aucune route d'écriture servie** (`POST/PATCH records`, `PATCH collections`, `PUT/POST media`). La roadmap prévoit de porter le connecteur en module interne (phase 4) — si la bascule de Pertuis/LCSS précède ce portage, il faut la couche compat écriture ou avancer le portage. **[DÉCISION : ordre]**

## 🟠 P1 — Comportements CRUD perdus (admin + injecteur)

12. **Slug : ni slugify(fr) ni unicité incrémentale.** Le legacy générait le slug depuis le titre et suffixait `-1`, `-2`… en cas de collision ; nous **rejetons** (erreur). Impact : l'admin doit fournir un slug, un ré-import APIDAE avec deux titres identiques échoue.
13. **Update partiel impossible.** Legacy : patch attribut par attribut (`arrayFilters`). Nous : `strictObject` impose le `data` **complet** à chaque update. Pénible pour l'admin, risqué pour les writes concurrents.
14. **Listes : pas de pagination (`skip`/`limit`), tri `createdAt` au lieu d'`updatedAt`, pas de `updatedBy`.** Grigny a des centaines d'entrées.
15. **`publishedAt` non auto-posé au passage à `published`** (le legacy le posait ; chez nous il reste null — visible immédiatement, donc effet proche, mais la date de publication réelle n'est pas tracée).

## 🟡 P2 — À arbitrer (perte réelle mais portée limitée)

16. **`metaData` média perdu** (ni en base ni en métadonnée d'objet S3) — utilisé par job-data-sync pour la dédup (`apidaeId`). À porter avec le connecteur.
17. **TTL des URLs signées : 1 h vs 7 jours legacy** — risque de 403 sur des URLs cachées côté client/build.
18. **SVG désormais accepté** à l'upload (le legacy le refusait) — surface XSS ; retirer de l'allowlist ?
19. **Traçabilité `createdBy`/`updatedBy` abandonnée** partout (l'admin legacy affichait l'auteur).
20. **Métadonnées d'appareil des sessions perdues** (`ua`/`ip`/`os`/`device` — l'admin affichait « vos appareils ») ; porter a minima `ua`+`ip` à la création de session ?
21. **Mot de passe : ni historique anti-réutilisation, ni AUCUN flux "changer mon mot de passe"** (le legacy en avait un via token ; la ré-invitation est notre seul chemin). À construire en phase 2 ?
22. **TTL de session : 30 jours vs 24 h legacy.**
23. **`editor`/`display` de collection : migrés en `legacyExtra` mais ni servis ni éditables ; `headings` de collection PAS capturé du tout par la CLI** (perdu). A minima : corriger la CLI pour capturer `headings` ; le reste à trancher avec l'admin phase 2.
24. **`injector` (pipelines APIDAE) : en `legacyExtra` uniquement, non éditable** — cohérent si le connecteur phase 4 a sa propre config, à confirmer.
25. **CLI : mapping `settings → theme` suspect** (`settings` legacy = `ticketRef`, sémantiquement ≠ theme) — à corriger avant le dump réel.
26. **Relations bidirectionnelles perdues** (le legacy maintenait `records[]` dans les deux sens) — qui consommait le sens inverse ? À vérifier sur les thèmes avant d'arbitrer.
27. **Transverse : rate limiting (300 req/60 s/IP), `X-Request-Id`, headers helmet/HSTS/CSP non reproduits** ; healthcheck de contrat différent (`GET /` enveloppé vs `/health` DTO).
28. **`users.get` unitaire absent** (list seul) ; `users.update` restreint à `name`/`role` (durcissement voulu, à confirmer).

## ✅ Confirmations rassurantes de l'audit

- **Thèmes** : seuls clients dont le contrat est déjà entièrement servi (enveloppe legacy reproduite, header brut accepté) — modulo les écarts de payload P0 ci-dessus.
- `relatedCollection` était déjà un **slug** côté legacy → notre payload concorde.
- Permissions fines legacy : les blocs `onlyOwn`/`ownerFilter` étaient **tous commentés** → notre admin/redacteur est fidèle au comportement réel.
- MIME média : notre allowlist est un **superset** du legacy (aucune régression, cf. n°18 pour le SVG).
- 2FA, `lastSeenAt`, `geo`, lockout : morts côté legacy, rien à porter.
- `wordpress-marseille-15-16` : fidèle (et corrige un bug de mutation du JSON).
- Suppression user → sessions : couverte par cascade FK.
- Nos ajouts sans équivalent legacy : anti-timing login, anti-auto-suppression, tokens hashés, révocation ciblée, `size` des médias, validation Zod générée.

---

*Rapports détaillés des 5 agents (fichier:ligne des deux côtés) disponibles sur demande — ce document est la synthèse arbitrable.*
