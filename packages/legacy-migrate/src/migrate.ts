import { createHash } from 'node:crypto';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import {
  apiTokens,
  media as mediaTable,
  collectionDefinitions,
  entries as entriesTable,
  connectDb,
  organization,
  users as usersTable,
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
  media: {
    count: number;
    manifest: Array<{ legacyId: string; targetKey: string; referencedBy: string[] }>;
  };
  tokens?: number;
  users?: number;
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
      // Iso legacy: settings ≠ theme — chacun sa colonne (le thème visuel vit
      // dans deployment.theme, servi par /api/v1/content/deployment).
      settings: (legacyOrg.settings as Record<string, unknown> | undefined) ?? null,
      // Served ISO on /api/v1/content/deployment during the cutover.
      deployment: (legacyOrg.deployment as Record<string, unknown> | undefined) ?? null,
      legacyExtra: { legacyId: orgId, injector: legacyOrg.injector },
    })
    .run();

  // ── Collections → definitions ──────────────────────────────────────────────
  // Modèle réel (découvert sur le dump de prod) : les DÉFINITIONS appartiennent
  // à des organisations GABARITS ancêtres (héritage par `path`), et l'org de
  // prod les référence via son tableau `collections[]`. Les records lient leur
  // définition par SLUG.
  const allCollections = readCollection(options.dumpDir, 'collections');
  const collectionById = new Map(allCollections.map((doc) => [idOf(doc._id), doc]));
  const ancestorSlugs = String(legacyOrg.path ?? '')
    .split('/')
    .filter(Boolean);
  const ancestorIds = new Set(
    organizations
      .filter((doc) => ancestorSlugs.includes(String(doc.slug)))
      .map((doc) => idOf(doc._id)),
  );
  const orgRecords = readCollection(options.dumpDir, 'records').filter(
    (doc) => idOf(doc.organization) === orgId,
  );
  const legacyCollections: LegacyDoc[] = [];
  for (const ref of (legacyOrg.collections as unknown[]) ?? []) {
    const definition = collectionById.get(idOf(ref));
    if (definition && !legacyCollections.some((c) => c.slug === definition.slug)) {
      legacyCollections.push(definition);
    }
  }
  // Filet : toute collection utilisée par les records mais absente de la liste
  // explicite est résolue chez les ancêtres (la plus proche gagne).
  for (const slug of new Set(orgRecords.map((doc) => String(doc.relatedCollection)))) {
    if (legacyCollections.some((c) => String(c.slug) === slug)) continue;
    const candidates = allCollections.filter(
      (c) =>
        String(c.slug) === slug &&
        (ancestorIds.has(idOf(c.organization)) || idOf(c.organization) === orgId),
    );
    const found = candidates[candidates.length - 1];
    if (found) legacyCollections.push(found);
    else report.errors.push(`définition introuvable pour la collection "${slug}"`);
  }
  const seededSlugs = new Map(
    db
      .select()
      .from(collectionDefinitions)
      .all()
      .map((definition) => [definition.slug, definition]),
  );
  /** Seeds réutilisés par une collection legacy (les autres seront retirés). */
  const reusedSeedIds = new Set<string>();
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
    // Attributs colonnes (title/name/slug) réellement DÉFINIS par la collection
    // (non cachés) : seuls ceux-là écrasent le champ document (iso legacy).
    const definedColumns = new Set(
      attributes
        .filter((attribute) => {
          const name = String(attribute.name);
          if (!['title', 'name', 'slug'].includes(name)) return false;
          const options = attribute.options as LegacyDoc | undefined;
          const componentOptions = attribute.componentOptions as LegacyDoc | undefined;
          return !options?.hidden && !componentOptions?.hidden;
        })
        .map((attribute) => String(attribute.name)),
    );
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
    // Iso legacy : la définition legacy REMPLACE intégralement le seed
    // (nom, éditeur, affichage… — sinon l'admin montrerait « Agenda » à la
    // place d'« Evènement(s) » et perdrait la config d'éditeur).
    let definition = seededSlugs.get(slug);
    if (definition) {
      reusedSeedIds.add(definition.id);
      db.update(collectionDefinitions)
        .set({
          name: legacyName,
          description: (legacyCollection.description as string | undefined) ?? null,
          fields,
          editor: (legacyCollection.editor as Record<string, unknown> | undefined) ?? null,
          display: (legacyCollection.display as Record<string, unknown> | undefined) ?? null,
          headings: (legacyCollection.headings as Record<string, unknown> | undefined) ?? null,
        })
        .where(eq(collectionDefinitions.id, definition.id))
        .run();
      definition = { ...definition, name: legacyName };
    } else {
      definition = db
        .insert(collectionDefinitions)
        .values({
          name: legacyName,
          slug,
          fields,
          editor: (legacyCollection.editor as Record<string, unknown> | undefined) ?? null,
          display: (legacyCollection.display as Record<string, unknown> | undefined) ?? null,
          headings: (legacyCollection.headings as Record<string, unknown> | undefined) ?? null,
        })
        .returning()
        .get();
    }

    // ── Records → entries ────────────────────────────────────────────────────
    // Lien record → définition par SLUG (modèle réel du dump).
    const records = orgRecords.filter((record) => String(record.relatedCollection) === slug);
    let inserted = 0;
    let invalid = 0;
    let extraCount = 0;
    const dataSchema = buildDataSchema(fields);
    // Iso legacy : unicité de slug par collection via suffixe incrémental
    // (le dump réel contient des doublons — imports APIDAE).
    const usedSlugs = new Set<string>();

    for (const record of records) {
      const entry = mapRecord(record, fieldsByLegacyName, definedColumns);
      if (usedSlugs.has(entry.slug)) {
        const base = entry.slug;
        let suffix = 1;
        while (usedSlugs.has(`${base}-${suffix}`)) suffix++;
        entry.slug = `${base}-${suffix}`;
        entry.legacyExtra._slugAdjusted = base;
      }
      usedSlugs.add(entry.slug);
      extraCount += Object.keys(entry.legacyExtra).length;
      const parsed = dataSchema.safeParse(entry.data);
      const data = parsed.success ? parsed.data : {};
      if (!parsed.success) {
        invalid += 1;
        Object.assign(entry.legacyExtra, {
          _invalidData: entry.data,
          _validationError: parsed.error.message,
        });
      }
      const row = db
        .insert(entriesTable)
        .values({
          // Id legacy PRÉSERVÉ (golden-master + relations sans remap + iso).
          id: entry.legacyId,
          collectionId: definition.id,
          title: entry.title,
          slug: entry.slug,
          data,
          status: entry.status,
          publishedAt: entry.publishedAt,
          ...(entry.createdAt ? { createdAt: entry.createdAt } : {}),
          ...(entry.updatedAt ? { updatedAt: entry.updatedAt } : {}),
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

  // ── Purge des seeds produit non réclamés (iso legacy) ──────────────────────
  // Les collections par défaut (news/events/officials/projects) servent les
  // instances NEUVES ; sur une migration, seules les collections du legacy
  // doivent exister — un seed sans équivalent resterait vide et dupliquerait
  // la navigation de l'admin.
  for (const definition of seededSlugs.values()) {
    if (reusedSeedIds.has(definition.id)) continue;
    db.delete(collectionDefinitions).where(eq(collectionDefinitions.id, definition.id)).run();
  }

  // ── Media manifest (objects transferred separately, phase 4) ───────────────
  const allMedia = readCollection(options.dumpDir, 'media');
  const legacyMedia = allMedia.filter(
    (doc) =>
      idOf(doc.organization) === orgId ||
      doc.organization === undefined ||
      // Médias référencés par les entrées mais possédés par une org gabarit.
      mediaReferences.has(idOf(doc._id)),
  );
  for (const doc of legacyMedia) {
    const legacyId = idOf(doc._id);
    const objects = (doc.objects as Record<string, unknown> | undefined) ?? {};
    const originalKey = String(
      objects.original ?? `${legacyId}/${String(doc.originalName ?? 'file')}`,
    );
    // Insertion de la ligne media (id = ObjectId legacy : les entrées migrées
    // référencent ces ids dans leurs données). La clé S3 d'origine est
    // conservée telle quelle — le bucket ne bouge pas à la bascule.
    db.insert(mediaTable)
      .values({
        id: legacyId,
        filename: String(doc.originalName ?? doc.filename ?? 'file'),
        mime: String(doc.mime ?? 'application/octet-stream'),
        size: Number(doc.size ?? 0) || 0,
        metaData: (doc.metaData as Record<string, unknown> | undefined) ?? null,
        objects: { original: originalKey, variants: {} },
        legacyExtra: { legacyObjects: objects },
      })
      .run();
    report.media.manifest.push({
      legacyId,
      targetKey: originalKey,
      referencedBy: mediaReferences.get(legacyId) ?? [],
    });
  }
  report.media.count = legacyMedia.length;

  // ── API tokens (continuité de bascule, iso legacy) ─────────────────────────
  // Les tokens device legacy sont stockés EN CLAIR dans Mongo : on les importe
  // hashés (sha256) — les sites en prod gardent leur token, zéro changement.
  const legacyTokens = readCollection(options.dumpDir, 'tokens').filter(
    (doc) => idOf(doc.organization) === orgId || doc.organization === undefined,
  );
  for (const doc of legacyTokens) {
    const plaintext = String(doc.token ?? '');
    if (!plaintext) continue;
    db.insert(apiTokens)
      .values({
        name: String(doc.name ?? `legacy-${idOf(doc._id)}`),
        tokenHash: createHash('sha256').update(plaintext).digest('hex'),
      })
      .run();
  }
  report.tokens = legacyTokens.length;

  // ── Utilisateurs (continuité de bascule) ───────────────────────────────────
  // Import : membres de l'organisation + comptes racine plateforme
  // (rôle legacy `manage:all` → admin ; « Editeur de contenu » → redacteur).
  // Les hash bcrypt legacy ($2a) restent vérifiables par Bun.password :
  // les mots de passe existants continuent de fonctionner tels quels.
  const legacyRoles = new Map(
    readCollection(options.dumpDir, 'roles').map((doc) => [
      idOf(doc._id),
      Array.isArray(doc.permissions) ? (doc.permissions as unknown[]).map(String) : [],
    ]),
  );
  const isRootRole = (roleId: string) => (legacyRoles.get(roleId) ?? []).includes('manage:all');
  const seenEmails = new Set<string>();
  let importedUsers = 0;
  for (const doc of readCollection(options.dumpDir, 'users')) {
    const memberships = Array.isArray(doc.organizations) ? (doc.organizations as LegacyDoc[]) : [];
    const membership = memberships.find((entry) => idOf(entry.organization) === orgId);
    const isRoot = memberships.some((entry) => isRootRole(idOf(entry.role)));
    if (!membership && !isRoot) continue;

    const email = String(doc.emailAddress ?? '').toLowerCase();
    const passwordHash = String(doc.encryptedPassword ?? '');
    if (!email || !passwordHash || seenEmails.has(email)) continue;
    seenEmails.add(email);

    db.insert(usersTable)
      .values({
        email,
        name:
          [doc.firstName, doc.lastName].filter(Boolean).join(' ') ||
          email.split('@')[0] ||
          email,
        passwordHash,
        role: isRoot || isRootRole(idOf(membership?.role)) ? 'admin' : 'redacteur',
      })
      .run();
    importedUsers++;
  }
  report.users = importedUsers;

  // ── Relations inverses (iso legacy `records[]`) ────────────────────────────
  // Post-passe : remappe les tableaux records[] legacy vers les nouveaux ids.
  for (const record of orgRecords) {
    const newId = entryIdByLegacyId.get(idOf(record._id));
    if (!newId || !Array.isArray(record.records)) continue;
    // Iso legacy : ids BRUTS conservés, y compris les références orphelines
    // (les ids d'entrées sont préservés, aucun remap nécessaire).
    const related = (record.records as unknown[]).map(idOf).filter(Boolean);
    if (related.length > 0) {
      db.update(entriesTable).set({ related }).where(eq(entriesTable.id, newId)).run();
    }
  }

  return report;
}

export type { StoreDb };
