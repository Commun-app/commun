## Context

4 clients en prod sur le legacy (Mongo partagé, S3 partagé, admin multi-tenant sur app.poulp.us, sites statiques Vercel, jobs GitHub Actions). Commun est single-tenant : une instance = un client = une base SQLite + un bucket + un conteneur. La CLI de migration produit une base iso (0 diff golden sur les 4 orgs, auteurs préservés depuis la PR #5) ; le plan REST legacy-compat est golden-testé — les sites Vercel actuels peuvent consommer une instance Commun sans refonte.

Contraintes posées par Quentin (29/07) : un VPS avec **Dokploy existe déjà** (on l'utilise — amendement au cadrage « Scaleway brut » de la roadmap) ; le domaine cible (commun.app ou autre) **n'est pas encore acquis** ; app.poulp.us doit continuer de fonctionner pour les utilisateurs ; période d'observation de quelques jours avec Vercel de vérification par instance AVANT toute bascule ; le legacy n'est décommissionné qu'après validation complète.

## Goals / Non-Goals

**Goals:**
- 4 instances en marche sur le VPS Dokploy, chacune : domaine, S3 dédié, backups quotidiens, admin fonctionnel.
- Observation : instances alimentées depuis le legacy (contenus + médias), chacune avec un build Vercel de vérification comparable à la prod ; outillage de comparaison.
- Portail app.poulp.us : les utilisateurs gardent leur URL et leurs identifiants, atterrissent sur l'admin de LEUR instance sans friction.
- Bascule client par client, réversible jusqu'au décommissionnement ; runbook écrit.

**Non-Goals:**
- Temps réel legacy → instance (voir D6) ; provisioning automatisé du SaaS (control plane, phase 7) ; multi-domaines/thème sur instance (phase 5) ; app.commun.app (post-achat du domaine, alias trivial du portail) ; toute évolution fonctionnelle des instances.

## Decisions

**D1 — Une origine par client : l'admin est servi par l'API.** L'image d'instance embarque le build statique de l'admin, servi par Nitro avec fallback SPA ; l'admin appelle `/api/trpc` en RELATIF. Conséquences : UN domaine par client (`cmar.<base>`) au lieu des deux proposés (`cmar.commun.app` + `cmar.admin.commun.app`), un certificat, et surtout UNE image commune à tous les clients (rien de client-spécifique n'est cuit au build — l'URL d'API relative supprime la seule valeur bakée). *Alternative écartée : admin séparé par sous-domaine — impose un build d'admin PAR client (l'URL d'API est cuite au build en SPA statique), double les domaines/certs, et le CORS credentialed devient inutile en même origine.* ⚠️ Amendement à valider par Quentin (il proposait deux sous-domaines par client).

**D2 — Domaine de base paramétrique.** Le domaine cible n'existe pas encore : tout (compose, portail, runbook) prend un `BASE_DOMAIN` en paramètre. L'observation peut démarrer sur des sous-domaines poulp.us existants ou les domaines Traefik de Dokploy ; l'achat de commun.app ne bloque rien et le re-pointage est un changement DNS + variable.

**D3 — Image d'instance dédiée (`Dockerfile.instance`).** L'image actuelle (API seule) reste l'artefact open source du self-hosting. L'image d'instance ajoute l'étage admin : build avec `GITHUB_TOKEN`/`TIPTAP_PRO_TOKEN` en **secrets de build** (Dokploy les supporte) — prose est donc PRÉSENTE dans l'admin hébergé, patch bun inclus. Elle disparaîtra au profit de l'image unique quand prose sera remplacée (phase 4).

**D4 — Backup : Dokploy natif (amendé, review PR #6).** Les sauvegardes sont configurées DANS Dokploy (backups planifiés de volumes vers une destination S3) — pas de tâche applicative : l'app ne s'auto-sauvegarde pas, c'est le rôle de l'hébergeur (docs.dokploy.com/docs/core). Étape du gabarit d'app + runbook, rétention côté destination. *Version initiale écartée par la review : tâche Nitro `db:backup` in-process — retirée.*

**D5 — Pas de mode ombre : les crons TOURNENT pendant l'observation (amendé, review PR #6).** Décision Quentin : aucun interrupteur applicatif. Les instances d'observation exécutent leurs tâches normalement — `apidae:sync` écrit dans le SQLite de l'ombre (sans risque, et ça EXERCE la sync réelle en continu ; la resync nocturne réécrit la base de toute façon), et `deploy` déclenche le hook en base, qui est REMPLACÉ par celui du projet Vercel de TEST (URL .vercel.app dédiée) dès le premier resync. ⚠️ Garde-fou opérationnel : le pipeline de resync DOIT poser le hook de test après CHAQUE restauration de base (la base migrée contient le hook de PROD) — étape non optionnelle du pipeline, sinon le cron de 00:30 déclencherait un build de production.

**D6 — Resynchronisation périodique, PAS de temps réel.** Réponse à la question posée : le temps réel (CDC sur l'oplog Mongo + transformation continue + sync S3 événementielle) est une machinerie neuve avec ses propres modes de défaillance, construite pour une fenêtre de quelques JOURS — disproportionné et risqué. À la place, un pipeline `resync <client>` idempotent : mongodump legacy → CLI de migration (recrée la base de zéro, garantie d'idempotence par construction) → dépôt de la base sur l'instance (upload + restart du conteneur — SQLite ne se remplace pas à chaud) → `aws s3 sync` des objets du manifeste vers le bucket client → déclenchement du build Vercel d'observation. Nocturne + à la demande. La perte de fraîcheur intra-journée est sans enjeu (personne n'UTILISE les instances ombre) ; la bascule fait un GEL des écritures legacy + resync final → zéro perte. *Si l'observation révélait un vrai besoin temps réel, on réévaluerait — mais le gel final le rend inutile pour la correction.*

**D7 — Portail : authentification déléguée + remise de session.** `apps/portal` (app Nitro légère, UI de login ISO legacy) avec un mapping statique email → instance (généré depuis les bases migrées ; les emails sont disjoints par commune, les comptes Poulpus/Datack mappés sur une instance par défaut). Au login : le portail appelle `auth.login` de l'instance côté serveur, récupère le token, redirige vers `https://<slug>.<base>/sso#token=…` ; une page `/sso` minuscule dans l'admin stocke le token dans le storage nuxt-auth et route vers `/overview`. Le fragment (#) ne transite ni par les logs ni par le serveur. L'utilisateur : app.poulp.us → mêmes identifiants → son admin, comme avant. *Alternative écartée : reverse-proxy des admins SOUS app.poulp.us — mutualise un domaine mais complexifie cookies/chemins et contredit D1.* Le portail vit dans le monorepo (`apps/portal`) tant que le repo est privé — frontière AGPL à trancher en phase 6, comme apidae-sync.

**D8 — Vercel d'observation par client.** Un projet Vercel de test par client (clone du site actuel), pointé sur l'instance (URL REST + token API de l'instance) ; le hook stocké en base (`deployment.vercel.hook`) est remplacé par celui du projet de TEST pendant l'observation (étape du runbook) — le pipeline resync le déclenche après chaque passe. La comparaison s'appuie sur le golden-diff existant (payloads REST legacy-compat vs prod legacy) + revue visuelle des sites de test. À la bascule : le projet Vercel de PROD change ses variables d'env (API legacy → instance) et le hook en base redevient celui de prod.

**D9 — Ordre de bascule et réversibilité.** CMAR → Grigny → LCSS → Pertuis (du moins actif au plus riche, Pertuis en dernier pour l'APIDAE). Par client : gel legacy (lecture seule) → resync final → bascule portail (l'email route vers l'instance) → Vercel prod re-pointé → jobs activés → legacy conservé en lecture seule jusqu'au décommissionnement GLOBAL (dernier filet). Rollback à tout moment avant décommission : re-pointer Vercel + retirer le routage portail.

## Risks / Trade-offs

- [Un domaine au lieu de deux par client (D1) diverge de la demande initiale] → à valider explicitement ; si Quentin tient aux deux, le coût est un build admin par client (URL bakée) — faisable, documenté en repli.
- [Le VPS Dokploy est un point unique] → 4 clients + backups S3 quotidiens + bases recréables depuis dump : le risque résiduel est une indisponibilité, pas une perte ; dimensionnement à vérifier (4 × ~150 Mo RAM + builds).
- [Secrets de build sur Dokploy (tokens prose)] → secrets de build, jamais dans l'image finale ni le repo ; meurt en phase 4.
- [Mapping email → instance : collisions (comptes multi-org legacy)] → mapping généré + table d'exceptions ; les rares comptes concernés sont internes (Poulpus/Datack).
- [Remplacement de base à chaud impossible] → resync = restart du conteneur (secondes, la nuit, instances non utilisées) ; à la bascule le gel rend la fenêtre sûre.
- [Golden-diff sur données vivantes : diffs de timing légitimes] → comparer immédiatement après resync, tolérances documentées (updatedAt, URLs signées).

## Migration Plan

1. Infra : buckets S3 + secrets + 4 apps Dokploy (image d'instance), domaines d'observation — instances vides qui bootent.
2. Chargement initial : resync complet des 4 clients (base + S3), vérif santé + login + écrans.
3. Observation (quelques jours) : resync nocturne, Vercel de test par client, golden-diff après chaque passe, tests manuels Quentin ; portail déployé et testé en parallèle (sans bascule DNS).
4. Bascule client par client (D9), à la main, un client à la fois, avec point de contrôle après chacun.
5. Décommission legacy (checklist dédiée du runbook : jobs GitHub Actions, microservices, Mongo, S3 legacy — après le DERNIER client + délai de grâce).

## Open Questions

- **D1 à arbitrer** : un domaine par client (recommandé) ou deux (`<slug>` + `<slug>.admin`) comme proposé initialement ?
- Domaine de base de l'observation : sous-domaines poulp.us ou domaines Dokploy générés ? (sans enjeu, à choisir au premier déploiement)
- Durée du délai de grâce legacy en lecture seule après le dernier client (proposition : 2 semaines).
