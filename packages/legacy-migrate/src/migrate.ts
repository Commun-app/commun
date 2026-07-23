import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import {
  collectionDefinitions,
  collectionEntries,
  connectDb,
  organization,
  buildDataSchema,
  type FieldDefinition,
  type StoreDb,
} from '@commun/core';
import { mapAttributeDefinition, mapRecord } from './mapper.ts';
import { idOf, readCollection, type LegacyDoc } from './read-dump.ts';

export interface MigrationReport {
  organization: string;
  collections: Array<{
    legacyName: string;
    slug: string;
    fieldsMapped: number;
    fieldsUnmapped: string[];
    entries: number;
    entriesInvalid: number;
    attributesToLegacyExtra: number;
  }>;
  media: { count: number; manifest: Array<{ legacyId: string; targetKey: string; referencedBy: string[] }> };
  errors: string[];
}

/**
 * Offline migration of ONE legacy organization (spec legacy-migration).
 * Idempotent by construction: the target database file is recreated from
 * scratch on every run — no incremental state.
 */
export function migrateOrganization(options: {
  dumpDir: string;
  orgSlug: string;
  outDir: string;
  migrationsDir?: string;
}): MigrationReport {
  const report: MigrationReport = {
    organization: options.orgSlug,
    collections: [],
    media: { count: 0, manifest: [] },
    errors: [],
  };

  // Fresh output database (idempotence).
  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(join(options.outDir, `commun.db${suffix}`), { force: true });
  }
  const db = connectDb(options.outDir, options.migrationsDir);

  // ── Organization singleton ─────────────────────────────────────────────────
  const organizations = readCollection(options.dumpDir, 'organizations');
  const legacyOrg = organizations.find((doc) => doc.slug === options.orgSlug);
  if (!legacyOrg) {
    report.errors.push(`organisation "${options.orgSlug}" absente du dump`);
    return report;
  }
  const orgId = idOf(legacyOrg._id);
  db.insert(organization)
    .values({
      id: 1,
      name: String(legacyOrg.name ?? options.orgSlug),
      slug: options.orgSlug,
      type: 'commune',
      theme: (legacyOrg.settings as Record<string, unknown> | undefined) ?? null,
      legacyExtra: { legacyId: orgId, injector: legacyOrg.injector, deployment: legacyOrg.deployment },
    })
    .run();

  // ── Collections → definitions ──────────────────────────────────────────────
  const legacyCollections = readCollection(options.dumpDir, 'collections').filter(
    (doc) => idOf(doc.organization) === orgId || doc.organization === undefined,
  );
  const legacyRecords = readCollection(options.dumpDir, 'records');
  const seededSlugs = new Map(
    db.select().from(collectionDefinitions).all().map((definition) => [definition.slug, definition]),
  );
  /** legacy record _id → new entry id (relation remapping). */
  const entryIdByLegacyId = new Map<string, string>();
  const mediaReferences = new Map<string, string[]>();

  for (const legacyCollection of legacyCollections) {
    const legacyName = String(legacyCollection.name ?? legacyCollection.slug ?? 'collection');
    const slug = String(legacyCollection.slug ?? legacyName.toLowerCase());
    const attributes = Array.isArray(legacyCollection.attributes)
      ? (legacyCollection.attributes as LegacyDoc[])
      : [];

    const fields: FieldDefinition[] = [];
    const unmapped: string[] = [];
    const fieldsByLegacyName = new Map<string, FieldDefinition>();
    for (const attribute of attributes) {
      const mapped = mapAttributeDefinition(attribute);
      if (mapped.field) {
        fields.push(mapped.field);
        fieldsByLegacyName.set(mapped.legacyName, mapped.field);
      } else if (!['title', 'name', 'slug'].includes(mapped.legacyName)) {
        unmapped.push(`${mapped.legacyName} (${mapped.legacyComponent})`);
      }
    }

    // Reuse a seeded default collection when slugs collide, else create.
    let definition = seededSlugs.get(slug);
    if (definition) {
      db.update(collectionDefinitions)
        .set({ fields, legacyExtra: { editor: legacyCollection.editor, display: legacyCollection.display } })
        .where(eq(collectionDefinitions.id, definition.id))
        .run();
    } else {
      definition = db
        .insert(collectionDefinitions)
        .values({
          name: legacyName,
          slug,
          fields,
          legacyExtra: { editor: legacyCollection.editor, display: legacyCollection.display },
        })
        .returning()
        .get();
    }

    // ── Records → entries ────────────────────────────────────────────────────
    const collectionId = idOf(legacyCollection._id);
    const records = legacyRecords.filter((record) => idOf(record.relatedCollection) === collectionId);
    let inserted = 0;
    let invalid = 0;
    let extraCount = 0;
    const dataSchema = buildDataSchema(fields);

    for (const record of records) {
      const entry = mapRecord(record, fieldsByLegacyName);
      extraCount += Object.keys(entry.legacyExtra).length;
      const parsed = dataSchema.safeParse(entry.data);
      const data = parsed.success ? parsed.data : {};
      if (!parsed.success) {
        invalid += 1;
        Object.assign(entry.legacyExtra, { _invalidData: entry.data, _validationError: parsed.error.message });
      }
      const row = db
        .insert(collectionEntries)
        .values({
          collectionId: definition.id,
          title: entry.title,
          slug: entry.slug,
          data,
          status: entry.status,
          publishedAt: entry.publishedAt,
          legacyExtra: { legacyId: entry.legacyId, ...entry.legacyExtra },
        })
        .returning()
        .get();
      entryIdByLegacyId.set(entry.legacyId, row.id);
      for (const mediaRef of entry.mediaRefs) {
        mediaReferences.set(mediaRef, [...(mediaReferences.get(mediaRef) ?? []), row.id]);
      }
      inserted += 1;
    }

    report.collections.push({
      legacyName,
      slug,
      fieldsMapped: fields.length,
      fieldsUnmapped: unmapped,
      entries: inserted,
      entriesInvalid: invalid,
      attributesToLegacyExtra: extraCount,
    });
  }

  // ── Media manifest (objects transferred separately, phase 4) ───────────────
  const legacyMedia = readCollection(options.dumpDir, 'media').filter(
    (doc) => idOf(doc.organization) === orgId || doc.organization === undefined,
  );
  for (const doc of legacyMedia) {
    const legacyId = idOf(doc._id);
    report.media.manifest.push({
      legacyId,
      targetKey: `${legacyId}/${String(doc.filename ?? doc.name ?? 'file')}`,
      referencedBy: mediaReferences.get(legacyId) ?? [],
    });
  }
  report.media.count = legacyMedia.length;

  return report;
}

export type { StoreDb };
