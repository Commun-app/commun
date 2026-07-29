## 1. Image d'instance et socle applicatif

- [x] 1.1 Admin en base API relative : `/api/trpc` par défaut quand `NUXT_ENV_API_URL` est absente (auth, client tRPC, axios) — dev et harness inchangés
- [x] 1.2 `Dockerfile.instance` : étage admin buildé avec secrets de build (GITHUB_TOKEN, TIPTAP_PRO_TOKEN — prose + patch inclus), statique servi par Nitro avec fallback SPA hors `/api`, image commune à tous les clients ; build + smoke local
- [x] 1.3 ~~Tâche db:backup~~ RETIRÉE (review PR #6) : les sauvegardes sont des backups de volume Dokploy → S3 (voir 3.1) — aucune logique applicative
- [x] 1.4 ~~Mode ombre~~ RETIRÉ (review PR #6) : les crons tournent pendant l'observation — apidae:sync écrit dans l'ombre (exerce la sync réelle), deploy frappe le hook de TEST posé par le resync (garde-fou : étape obligatoire du pipeline)

## 2. Portail de connexion (apps/portal)

- [x] 2.1 App Nitro `apps/portal` : écran de login iso legacy, mapping email → instance (généré depuis les bases migrées + table d'exceptions pour les comptes internes multi-org)
- [x] 2.2 Authentification déléguée : `auth.login` de l'instance appelé côté serveur, erreurs restituées (invalides / indisponible), aucune énumération de comptes, aucun stockage de session côté portail
- [x] 2.3 Page `/sso` dans l'admin : token en fragment → session nuxt-auth, nettoyage du fragment, redirection `/overview` ; token invalide → login
- [x] 2.4 Scénario E2E portail (login délégué de bout en bout contre une instance du harness)

## 3. Infra par client (opérations Quentin + gabarits fournis)

- [ ] 3.1 Gabarit Dokploy documenté (app : image d'instance ghcr, volume, secrets, domaine `<slug>.<BASE_DOMAIN>`, **backup planifié du volume → S3 + restauration testée**) + dimensionnement du VPS vérifié pour 4 instances
- [ ] 3.2 Buckets S3 dédiés créés (×4) + script de copie initiale des objets legacy depuis le manifeste de migration (clés préservées)
- [ ] 3.3 Déploiement des 4 instances (CMAR, Grigny, LCSS, Pertuis) en mode ombre : boot, `/health`, login, écrans, médias signés depuis le bucket dédié
- [ ] 3.4 Portail déployé sur le VPS (sans bascule DNS d'app.poulp.us) et testé contre les 4 instances

## 4. Observation

- [ ] 4.1 Pipeline `resync <client>` : dump Mongo → CLI migration → dépôt base + restart conteneur → `s3 sync` incrémental → déclenchement Vercel d'observation ; arrêt propre sur échec d'étape
- [ ] 4.2 Projets Vercel d'observation (×4, clones des sites actuels pointés sur les instances) ; hook de TEST posé en base sur chaque instance
- [ ] 4.3 Golden-diff post-resync automatisé (payloads REST vs prod legacy, tolérances documentées : horodatages, URLs signées) + consignation des résultats
- [ ] 4.4 Resync nocturne planifié pendant la fenêtre d'observation ; comparaison manuelle apidae:sync (déclenchement ponctuel sur une instance ombre vs résultat legacy)
- [ ] 4.5 Validation Quentin : quelques jours d'observation, revue visuelle des 4 sites de test, zéro écart hors tolérance — GO/NO-GO par client

## 5. Bascule et décommission (runbook)

- [ ] 5.1 Runbook de bascule PAR CLIENT : gel legacy (lecture seule) → resync final → routage portail actif → app.poulp.us basculée sur le portail (DNS) → Vercel PROD re-pointé sur l'instance → `COMMUN_JOBS_DISABLED` retiré (jobs actifs, horaires iso) → contrôles post-bascule
- [ ] 5.2 Bascule CMAR → Grigny → LCSS → Pertuis, un client à la fois, point de contrôle après chacun (site publié, admin utilisé, jobs passés)
- [ ] 5.3 Checklist de décommission legacy (après le DERNIER client + délai de grâce) : jobs GitHub Actions coupés, microservices éteints, Mongo et S3 legacy archivés puis décommissionnés
- [ ] 5.4 ROADMAP et mémoire à jour (phase 3 close) ; reliquats notés pour la phase 6 (frontière du portail, domaine définitif)
