# Conventions de code

Règles pour toute contribution, humaine ou assistée par IA. Elles naissent de
défauts réellement constatés en revue — chacune corrige une dérive observée.

## Langue

- **Code, identifiants, commentaires, messages d'erreur : en anglais.**
- **Prose produit** (README, `docs/`, interface) : en français.

Une erreur remonte en anglais et n'est traduite qu'à l'affichage, par le
dictionnaire de l'interface. Le code n'est pas un support de traduction.

## Commentaires

**Écrivez-en peu.** Un commentaire justifie un choix ; il ne raconte pas le
code, ni son histoire.

Ce qui n'a pas sa place dans un commentaire :

- la paraphrase de la ligne suivante ;
- les dates, numéros de PR, noms de personnes, comptes rendus de décision —
  cela vit dans les messages de commit et les specs ;
- les alternatives écartées et leur argumentaire.

Ce qui la mérite : un invariant non évident, un piège qu'on retomberait à
corriger, une contrainte imposée de l'extérieur. Si le code peut être rendu
clair à la place du commentaire, faites-le.

```ts
// ✗ Le legacy signait ses URLs 7 jours (X-Amz-Expires=604800), or elles sont
//   figées dans un site statique : un site non reconstruit perdait ses images,
//   et le cron quotidien masquait la panne. Décision Quentin du 31/07…
// ✓ Public prefix: these URLs are frozen into static builds, so they must not expire.
```

## Configuration

Le schéma Zod de `common/env` est le **seul** contrat. Une variable requise se
déclare requise dans le schéma ; le parsing échoue au démarrage avec un message
clair.

Ne revalidez jamais une variable en aval : un `if (!env.X) throw` après le
parsing signifie que le schéma ment sur son propre contrat.

## Erreurs

Une erreur de domaine porte **un type et un code**, rien de plus. Pas de message
par défaut : le type suffit à l'identifier, et l'interface possède le texte.

## Structure

- **Un domaine est autonome** : `schema`, `dtos`, `repository`, `service` et
  `errors` vivent dans le même dossier. On ne disperse pas un domaine entre
  plusieurs arborescences transverses.
- **Ce qui se répète se factorise** : un helper de DTO utilisé par trois
  domaines appartient à `common/`, pas recopié dans chacun.
- **N'exportez que ce qui est consommé.** Un type exporté « au cas où » est une
  surface d'API à maintenir.

## Tests

La suite E2E est la **spécification exécutable** : un comportement se décrit en
Gherkin et se vérifie contre l'application réelle. Les scénarios partageant un
état en mémoire portent `@mode:serial`.

Avant de conclure qu'un test échoue à tort, vérifiez que le harness ne vous ment
pas — un contrôle qui compare la sortie sans identifier sa source valide parfois
la mauvaise chose.
