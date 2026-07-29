#!/usr/bin/env bun
// Génère le mapping email → instance du portail (spec auth-portal) depuis les
// bases MIGRÉES des clients. Usage :
//   bun infra/generate-portal-map.ts \
//     cmar=/path/cmar/commun.db:https://cmar.example \
//     grigny=/path/grigny/commun.db:https://grigny.example > portal-map.json
// Les comptes présents dans PLUSIEURS bases (internes Poulpus/Datack) sont
// affectés à la PREMIÈRE instance listée et signalés sur stderr — la table
// d'exceptions se fait en éditant le JSON produit.
import { Database } from 'bun:sqlite';

const instances: Record<string, string> = {};
const emails: Record<string, string> = {};
const duplicates: string[] = [];

for (const argument of process.argv.slice(2)) {
  const match = argument.match(/^([a-z0-9-]+)=([^:]+):(.+)$/);
  if (!match) {
    console.error(`argument invalide (attendu slug=/chemin/commun.db:https://url): ${argument}`);
    process.exit(1);
  }
  const [, slug, dbPath, url] = match;
  instances[slug!] = url!;

  const db = new Database(dbPath!, { readonly: true });
  const rows = db.query('SELECT email FROM users').all() as Array<{ email: string }>;
  db.close();
  for (const { email } of rows) {
    const normalized = email.toLowerCase();
    if (emails[normalized]) {
      duplicates.push(`${normalized} (${emails[normalized]} ← garde, ${slug} ← ignoré)`);
      continue;
    }
    emails[normalized] = slug!;
  }
}

if (duplicates.length) {
  console.error(`comptes multi-instances (affectés à la première, à arbitrer) :`);
  for (const duplicate of duplicates) console.error(`  - ${duplicate}`);
}
console.log(JSON.stringify({ instances, emails }, null, 2));
