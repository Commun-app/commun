## 1. CORS et fixes préalables (côté API)

- [x] 1.1 `apps/api/server/middleware/1.cors.ts` : reflet d'origine (`origin: () => true`) + `credentials: true`, commentaire expliquant la contrainte navigateur/nuxt-auth
- [x] 1.2 Scénario E2E CORS credentialed (preflight avec Origin → origine reflétée + Allow-Credentials, jamais de wildcard)

## 2. Upgrade Nuxt 4 + dépendances

- [x] 2.1 Bumps majeurs dans apps/admin/package.json (Nuxt 4.5, nuxt-auth 1.3, vueuse 14, CASL 7, pinia-orm 2, @pinia/nuxt 1.0, iconify 5, playwright 1.62) — reprise PR #3
- [x] 2.2 Lock validé : arbre prose/tiptap complet (épinglé 2.11.7 iso legacy), installs répétées sans dérive (`bun install` → « no changes »), admin de Quentin installé avec ses tokens sans diff signalé
- [x] 2.3 Ajustements nuxt.config (options dépréciées Vite 8/Rolldown) + fix assets `~/public/logo-*.svg` → `/logo-*.svg`
- [x] 2.4 `nuxt prepare`, `nuxt build` et boot dev verts (avec et sans prose)

## 3. Retrait de la machinerie multi-tenant

- [x] 3.1 Pages remontées de `pages/[workspace]/…` vers `pages/…`, liens internes réécrits
- [x] 3.2 Suppression des middlewares `01.workspaces`/`02.workspace` et des stores workspace ; adaptation des composants qui les consommaient
- [x] 3.3 Accès direct (rechargement) fonctionnel sur chaque écran remonté

## 4. Validation

- [x] 4.1 Smoke de login Playwright contre l'admin dev (script réutilisable dans le repo, hors CI) : login smoke@…, atterrissage dashboard, zéro erreur console
- [x] 4.2 Suite E2E complète verte (API + nouveau scénario CORS) ; typecheck et lint verts
- [x] 4.3 Passe manuelle Quentin effectuée (29/07, deux lots de retours) — 7 divergences relevées, toutes traitées comme défauts (section 5), éditeur prose inclus (accordéons validés iso legacy) ; merge = validation finale
- [x] 4.4 PR #3 Dependabot fermée le 29/07 avec commentaire de renvoi vers la PR #5

## 5. Retours de la passe manuelle (Quentin, 29/07)

- [x] 5.1 Accordéon WYSIWYG (diagnostic v2, retour Quentin : le rendu doit être ISO legacy +/−) : l'UI vit dans les node views summary/content du dist — le VRAI bug est le wrapper sans `NodeViewContent`, dont TipTap ≤2.11 faisait retomber le contentDOM sur l'élément racine, plus TipTap 2.27 (tiré par le lock régénéré) → enfants jamais montés. Patch bun v2 : le wrapper gagne un `<node-view-content>`, summary/content d'origine conservés — rendu iso legacy vérifié (18 encadrés +/−, toggle OK). Meurt avec prose en phase 4
- [x] 5.2 Relations : l'adaptateur tRPC n'envoyait JAMAIS `records[]` (écran inerte depuis la phase 1) → `related` ouvert à l'update (DTO + service, symétrie des liens inverses via linkRelations), envoyé par le modèle admin ; scénario E2E « liens libres mutuels » + delta de spec core-domains
- [x] 5.3 updatedBy vide sur données migrées : la CLI ne préservait ni les ids users ni les auteurs → ids users legacy PRÉSERVÉS + createdBy/updatedBy copiés (mapper + migrate) ; smoke-grigny régénérée (594 entrées avec auteur) — le dump de bascule inclura les auteurs
- [x] 5.4 Tableau hors écran : table-auto suit la largeur max-content — titre `truncate` (nowrap) et description non bornés dictaient la colonne → `max-w-xl` + `line-clamp-2` (data-summary), zéro débordement vérifié à 1440px
- [x] 5.5 Thématiques sans couleur : badge blanc-sur-blanc par défaut + parseur de contraste ignorant l'hex → repli gris neutre lisible et luminance hex/rgb correcte (badge.vue)
- [x] 5.6 ~700 appels médias simultanés sur un record riche (arrêtés) gelaient la page : chaque nœud fichier/image prose résout son média au montage (comportement prose, iso legacy) → cache partagé + concurrence plafonnée à 6 dans input-wysiwyg ; page réactive vérifiée sur le record aux 858 fichiers
- [x] 5.7 Post-merge : le job Docker (main seul) échouait — Dockerfile jamais mis à jour pour le workspace packages/apidae-sync (PR #4) ni patches/ (patch prose) ; COPY ajoutés, image buildée + smoke localement, poussé sur main
