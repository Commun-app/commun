#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineCommand, runMain } from 'citty';
import { consola } from 'consola';
import { migrateOrganization } from './migrate.ts';

const main = defineCommand({
  meta: {
    name: 'legacy-migrate',
    description: 'Migration hors ligne : dump MongoDB Poulpus → instance SQLite Commun',
  },
  args: {
    dump: { type: 'string', required: true, description: 'Dossier du dump (mongodump ou jsonl)' },
    org: { type: 'string', required: true, description: "Slug de l'organisation (ex. grigny)" },
    out: { type: 'string', description: 'Dossier de sortie', default: './migrated' },
  },
  run({ args }) {
    const outDir = resolve(join(args.out, args.org));
    mkdirSync(outDir, { recursive: true });

    consola.start(`Migration de "${args.org}" depuis ${args.dump} (hors ligne)`);
    const report = migrateOrganization({ dumpDir: resolve(args.dump), orgSlug: args.org, outDir });

    const reportPath = join(outDir, 'report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    for (const collection of report.collections) {
      const invalid = collection.entriesInvalid ? ` (${collection.entriesInvalid} invalides → legacy_extra)` : '';
      consola.info(
        `${collection.legacyName} → ${collection.slug}: ${collection.entries} entrées${invalid}, ` +
          `${collection.fieldsMapped} champs mappés` +
          (collection.fieldsUnmapped.length
            ? `, non mappés: ${collection.fieldsUnmapped.join(', ')}`
            : ''),
      );
    }
    consola.info(`Médias: ${report.media.count} objets dans le manifeste`);
    for (const error of report.errors) consola.error(error);

    consola.success(`Base: ${join(outDir, 'commun.db')} — rapport: ${reportPath}`);
    if (report.errors.length > 0) process.exit(1);
  },
});

runMain(main);
