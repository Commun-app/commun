import { consola } from 'consola';
import type { CollectionsRepository } from '../domains/collections/repository.ts';
import type { CollectionsService } from '../domains/collections/service.ts';
import type {
  CollectionDefinition,
  Entry,
  FieldDefinition,
} from '../domains/collections/schema.ts';
import type { MediaRepository } from '../domains/media/repository.ts';
import type { MediaService } from '../domains/media/service.ts';
import type { MappingDictionary } from './mapper.ts';
import type { ApidaeMediaRef } from './apidae-client.ts';

// Sink du portage job-data-sync : écrit les objets mappés via les SERVICES du
// core, in-process — plus de JWT forgé, plus d'écriture directe hors services
// (le legacy mélangeait HTTP authentifié et Mongo direct).

const MEDIA_DOWNLOAD_TIMEOUT_MS = 600_000; // iso legacy

export interface SinkDeps {
  collections: CollectionsService;
  collectionsRepository: CollectionsRepository;
  media: MediaService;
  mediaRepository: MediaRepository;
}

export interface SinkOptions {
  unlink: boolean;
  fetchImpl?: typeof fetch;
}

export interface SinkCounters {
  created: number;
  updated: number;
  mediaUploaded: number;
  mediaReused: number;
  mediaFailed: number;
  droppedFields: string[];
  unlinked: number;
  unlinkSkipped: boolean;
}

// biome-ignore lint/suspicious/noExplicitAny: records mappés du moteur legacy non typé
type LooseDoc = Record<string, any>;

/** Iso legacy-migrate `tryJson` : les valeurs complexes legacy sont souvent stringifiées. */
function tryJson(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return raw;
  try {
    return JSON.parse(trimmed);
  } catch {
    return raw;
  }
}

export class ApidaeSink {
  /**
   * Entrées vues pendant la passe — mises à jour ET créées. Correctif legacy :
   * le job n'y ajoutait que les mises à jour, si bien que chaque création
   * était dépubliée par l'unlink de l'itération suivante.
   */
  private readonly seenEntryIds: string[] = [];
  private readonly fetchImpl: typeof fetch;
  readonly counters: SinkCounters = {
    created: 0,
    updated: 0,
    mediaUploaded: 0,
    mediaReused: 0,
    mediaFailed: 0,
    droppedFields: [],
    unlinked: 0,
    unlinkSkipped: false,
  };

  constructor(
    private readonly deps: SinkDeps,
    private definition: CollectionDefinition,
    private readonly mapping: MappingDictionary,
    private readonly options: SinkOptions,
  ) {
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  // ── Enums de collection ────────────────────────────────────────────────────

  /**
   * Iso legacy `syncCollectionEnums`. Le modèle Commun a migré les attributs
   * `enumeration` en champs `json` servis bruts : la liste `{ id, label }`
   * n'a plus de destination typée — elle est maintenue dans le `legacyExtra`
   * de la définition (`enumItems[champ]`), sa vocation de fourre-tout legacy.
   * La valeur de l'entrée est réduite aux ids (iso legacy).
   */
  async syncCollectionEnums(record: LooseDoc): Promise<LooseDoc> {
    const enumItems: Record<string, Array<{ id: unknown; label: unknown }>> = ((
      this.definition.legacyExtra as LooseDoc | null
    )?.enumItems as LooseDoc) ?? {};
    let updateCollection = false;

    for (const fieldName in this.mapping) {
      const transform = this.mapping[fieldName]?.transform as LooseDoc | undefined;
      const value = record[fieldName];
      // Détection : $mapping produisant des éléments { id, libelleFr } — la
      // forme exacte des enums APIDAE (le type `enumeration` legacy a disparu
      // du modèle typé).
      if (
        !transform?.$mapping ||
        !Array.isArray(value) ||
        !value.length ||
        !value.every((item) => typeof item === 'object' && item !== null && 'id' in item) ||
        !value.some((item) => 'libelleFr' in item)
      ) {
        continue;
      }

      const items = enumItems[fieldName] ?? [];
      const existingIds = new Set(items.map(({ id }) => id));
      const missing = value.filter(({ id }) => !existingIds.has(id));
      if (missing.length) {
        updateCollection = true;
        items.push(...missing.map(({ id, libelleFr }) => ({ id, label: libelleFr })));
        enumItems[fieldName] = items;
      }

      // Iso legacy : l'entrée ne stocke que les ids.
      record[fieldName] = value.map(({ id }) => id);
    }

    if (updateCollection) {
      const updated = await this.deps.collectionsRepository.updateDefinition(this.definition.id, {
        legacyExtra: { ...(this.definition.legacyExtra ?? {}), enumItems },
      });
      if (updated) this.definition = updated;
    }

    return record;
  }

  // ── Médias ─────────────────────────────────────────────────────────────────

  /**
   * Iso legacy `syncMedia`, via le driver de stockage : idempotence sur
   * `metaData.apidaeId` (existant → refresh du metaData, pas de re-download),
   * sinon téléchargement de l'original puis `uploadDirect` (put S3 + row).
   * Correctif legacy : le metaData est écrit sous des clés simples (le job
   * envoyait la clé pointée `"metaData.apidaeId"` dans le payload).
   */
  async syncMedia(record: LooseDoc): Promise<LooseDoc> {
    for (const fieldName in this.mapping) {
      const transform = this.mapping[fieldName]?.transform as LooseDoc | undefined;
      if (!transform?.['@apidaeMedia'] || !record[fieldName]) continue;

      const mediaIds: string[] = [];
      for (const ref of record[fieldName] as ApidaeMediaRef[]) {
        try {
          const existing = await this.deps.mediaRepository.findByMetaData(
            'apidaeId',
            ref.metaData.apidaeId,
          );
          if (existing) {
            await this.deps.mediaRepository.update(existing.id, { metaData: ref.metaData });
            mediaIds.push(existing.id);
            this.counters.mediaReused += 1;
            continue;
          }

          const response = await this.fetchImpl(ref.originalUrl, {
            signal: AbortSignal.timeout(MEDIA_DOWNLOAD_TIMEOUT_MS),
          });
          if (!response.ok) {
            throw new Error(`téléchargement ${ref.originalUrl}: ${response.status}`);
          }
          const body = new Uint8Array(await response.arrayBuffer());
          const row = await this.deps.media.uploadDirect(
            ref.originalName,
            ref.mime,
            body,
            ref.metaData,
          );
          mediaIds.push(row.id);
          this.counters.mediaUploaded += 1;
        } catch (error) {
          // Iso legacy (Promise.allSettled) : un média en échec n'invalide pas
          // l'objet — mais l'échec est compté et loggé, plus avalé.
          this.counters.mediaFailed += 1;
          consola.warn(
            `[apidae-sync] média ${ref.metaData?.apidaeId ?? ref.originalUrl} en échec: ${
              error instanceof Error ? error.message : error
            }`,
          );
        }
      }
      record[fieldName] = mediaIds;
    }
    return record;
  }

  // ── Écriture de l'entrée ───────────────────────────────────────────────────

  /**
   * Iso legacy `syncRecord` : résolution des relations, idempotence sur
   * l'attribut `apidaeId`, statut `published` forcé à chaque passage.
   * Les créations alimentent aussi `seenEntryIds` (correctif unlink).
   */
  async syncEntry(record: LooseDoc): Promise<Entry> {
    const mapped = { ...record };
    const title = String(mapped.title ?? 'Sans titre');
    delete mapped.title;
    delete mapped.status; // iso legacy : toujours forcé à published

    // Iso legacy : l'attribut `records` est sorti des données et porte les
    // relations inverses (`related` dans le modèle Commun).
    let related: string[] | undefined;
    if (Array.isArray(mapped.records)) {
      related = (await this.resolveRelationTokens(mapped.records)).ids;
      delete mapped.records;
    }

    await this.resolveRelations(mapped);
    const data = this.normalizeData(mapped);

    const apidaeId = data.apidaeId;
    if (apidaeId === undefined || apidaeId === null || apidaeId === '') {
      throw new Error('E_MISSING_REFERENCE_ATTRIBUTE');
    }

    const existing = await this.deps.collectionsRepository.findEntryByDataField(
      this.definition.id,
      'apidaeId',
      apidaeId as string | number,
    );

    let entry: Entry;
    if (existing) {
      entry = await this.deps.collections.updateEntry(existing.id, {
        title,
        data,
        status: 'published',
      });
      this.counters.updated += 1;
    } else {
      entry = await this.deps.collections.createEntry(this.definition.id, {
        title,
        data,
        status: 'published',
      });
      this.counters.created += 1;
    }
    this.seenEntryIds.push(entry.id);

    if (related) {
      await this.deps.collectionsRepository.updateEntry(entry.id, { related });
    }
    return entry;
  }

  // ── Unlink de fin de passe ─────────────────────────────────────────────────

  /**
   * Correctif legacy : l'unlink s'exécute UNE fois en fin de passe (le job le
   * lançait à chaque record, dépubliant transitoirement toute la collection),
   * et JAMAIS après une collecte en échec — une panne APIDAE ne doit pas
   * dépublier une collection entière.
   */
  async finalize(collectFailed: boolean): Promise<void> {
    if (!this.options.unlink) return;
    if (collectFailed) {
      this.counters.unlinkSkipped = true;
      consola.warn(`[apidae-sync] collecte en échec sur ${this.definition.slug} — unlink annulé`);
      return;
    }
    const published = await this.deps.collectionsRepository.listPublishedEntries(
      this.definition.id,
    );
    const seen = new Set(this.seenEntryIds);
    for (const entry of published) {
      if (seen.has(entry.id)) continue;
      await this.deps.collections.updateEntry(entry.id, { status: 'draft' });
      this.counters.unlinked += 1;
    }
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  /** Tokens `collection:identifier:refId` → ids d'entrées Commun (iso legacy). */
  private async resolveRelationTokens(
    tokens: unknown[],
  ): Promise<{ ids: string[]; missing: number }> {
    const ids: string[] = [];
    let missing = 0;
    for (const token of tokens) {
      const [collectionSlug, refName, refId] = String(token).split(':');
      let target: Entry | undefined;
      if (collectionSlug && refName && refId !== undefined) {
        try {
          const targetDefinition = await this.deps.collections.getDefinition(collectionSlug);
          target = await this.deps.collectionsRepository.findEntryByDataField(
            targetDefinition.id,
            refName,
            refId,
          );
        } catch {
          target = undefined;
        }
      }
      if (target) ids.push(target.id);
      else missing += 1;
    }
    return { ids, missing };
  }

  /** Iso legacy : les champs relation portent des tokens à résoudre en ids. */
  private async resolveRelations(mapped: LooseDoc): Promise<void> {
    for (const field of this.definition.fields) {
      if (field.type !== 'relation') continue;
      const value = mapped[field.name];
      if (!Array.isArray(value)) continue;
      const { ids } = await this.resolveRelationTokens(value);
      // Iso legacy : one-to-one → premier id, sinon tableau des trouvés.
      mapped[field.name] = ids.length && !this.isMultiRelation(field) ? ids[0] : ids;
    }
  }

  private isMultiRelation(_field: FieldDefinition): boolean {
    // Le modèle Commun ne distingue plus one-to-one/one-to-many : un champ
    // relation accepte id ou id[] — le tableau (forme produite par $relation)
    // est toujours valide, on le conserve.
    return true;
  }

  /**
   * Normalisation des valeurs mappées vers les types de champs Commun — même
   * logique que la CLI de migration (mapper.ts) pour produire des entrées
   * indistinguables des entrées migrées. Les clés sans champ défini sont
   * écartées avec un log (dérive mapping/définition).
   */
  private normalizeData(mapped: LooseDoc): Record<string, unknown> {
    const fieldsByName = new Map(this.definition.fields.map((field) => [field.name, field]));
    const data: Record<string, unknown> = {};

    for (const [name, raw] of Object.entries(mapped)) {
      const field = fieldsByName.get(name);
      if (!field) {
        if (!this.counters.droppedFields.includes(name)) {
          this.counters.droppedFields.push(name);
          consola.warn(
            `[apidae-sync] champ "${name}" absent de la définition ${this.definition.slug} — écarté`,
          );
        }
        continue;
      }
      if (raw == null) continue;
      switch (field.type) {
        case 'boolean':
          data[name] = Boolean(raw);
          break;
        case 'date':
          data[name] = String(raw);
          break;
        case 'rich-text': {
          const parsed = tryJson(raw);
          data[name] =
            typeof parsed === 'object' && parsed !== null
              ? parsed
              : { type: 'doc', legacyHtml: String(raw) };
          break;
        }
        case 'number':
        case 'media':
        case 'relation':
        case 'json':
        case 'steps':
          data[name] = raw;
          break;
        default:
          // text / select : iso migration (stringify des non-strings).
          data[name] = typeof raw === 'string' ? raw : JSON.stringify(raw);
      }
    }
    return data;
  }
}
