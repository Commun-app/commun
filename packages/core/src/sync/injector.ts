import { DateTime } from 'luxon';
import { consola } from 'consola';
import { ApidaeClient } from './apidae-client.ts';
import { ObjectMapper, type MappingDictionary } from './mapper.ts';
import { ApidaeSink, type SinkDeps } from './sink.ts';
import { transformWysiwyg } from './wysiwyg.ts';
import type { OrganizationService } from '../domains/organization/service.ts';

// Orchestration du portage job-data-sync, RÉDUITE À APIDAE (décision du
// 27/07 : Airtable et Slack abandonnés). La config est lue telle quelle
// depuis `organization.legacyExtra.injector` — aucun nouveau format.

export interface InjectorPipelineConfig {
  sort?: string;
  unlink?: boolean;
  credentials?: { projectId?: string; apiKey?: string };
  /** ObjectId legacy de la Collection (résolu via legacyExtra.legacyId). */
  collection?: string;
  mapping?: MappingDictionary;
  selectionIds?: unknown[];
}

export interface InjectorConfig {
  enable?: boolean;
  pipelines?: InjectorPipelineConfig[];
}

export interface PipelineReport {
  collection: string;
  total: number;
  created: number;
  updated: number;
  /** Objets rejetés par la garde E_EVENT_EXPIRED (dépubliés via unlink). */
  expired: number;
  errors: string[];
  collectFailed: boolean;
  mediaUploaded: number;
  mediaReused: number;
  mediaFailed: number;
  droppedFields: string[];
  unlinked: number;
  unlinkSkipped: boolean;
}

export interface ApidaeSyncReport {
  status: 'ok' | 'nothing-to-sync';
  pipelines: PipelineReport[];
  /** Pipelines non-APIDAE ignorés (Airtable abandonné). */
  ignored: number;
}

export interface ApidaeSyncDeps extends SinkDeps {
  organization: OrganizationService;
}

export interface ApidaeSyncOptions {
  fetchImpl?: typeof fetch;
  /** Surcharge de l'URL APIDAE (tests, env APIDAE_API_URL). */
  apidaeBaseUrl?: string;
  /** « Maintenant » des périodes — évalué à l'exécution (correctif legacy). */
  now?: DateTime;
}

export async function runApidaeSync(
  deps: ApidaeSyncDeps,
  options: ApidaeSyncOptions = {},
): Promise<ApidaeSyncReport> {
  const organization = await deps.organization.get();
  const injector = (organization?.legacyExtra as Record<string, unknown> | null)?.injector as
    | InjectorConfig
    | undefined;

  if (!injector?.enable || !injector.pipelines?.length) {
    return { status: 'nothing-to-sync', pipelines: [], ignored: 0 };
  }

  const now = options.now ?? DateTime.local({ zone: 'Europe/Paris' });
  const report: ApidaeSyncReport = { status: 'ok', pipelines: [], ignored: 0 };

  // Iso legacy : pipelines exécutés séquentiellement.
  for (const pipeline of injector.pipelines) {
    if (pipeline.sort !== 'apidae') {
      report.ignored += 1;
      consola.info(`[apidae-sync] pipeline "${pipeline.sort}" ignoré (APIDAE seul est porté)`);
      continue;
    }
    report.pipelines.push(await runPipeline(deps, pipeline, { ...options, now }));
  }

  return report;
}

async function runPipeline(
  deps: ApidaeSyncDeps,
  pipeline: InjectorPipelineConfig,
  options: ApidaeSyncOptions & { now: DateTime },
): Promise<PipelineReport> {
  const empty: PipelineReport = {
    collection: pipeline.collection ?? 'inconnue',
    total: 0,
    created: 0,
    updated: 0,
    expired: 0,
    errors: [],
    collectFailed: false,
    mediaUploaded: 0,
    mediaReused: 0,
    mediaFailed: 0,
    droppedFields: [],
    unlinked: 0,
    unlinkSkipped: false,
  };

  // La config legacy référence la collection par son ObjectId Mongo — résolu
  // via le legacyExtra.legacyId posé par la CLI de migration (fallback id/slug
  // pour une config écrite à la main).
  const definition =
    (pipeline.collection
      ? await deps.collectionsRepository.findDefinitionByLegacyId(pipeline.collection)
      : undefined) ??
    (await deps.collections.getDefinition(pipeline.collection ?? '').catch(() => undefined));
  if (!definition) {
    empty.errors.push(`collection legacy ${pipeline.collection} introuvable`);
    return empty;
  }
  empty.collection = definition.slug;

  const client = new ApidaeClient({
    credentials: pipeline.credentials ?? {},
    selectionIds: pipeline.selectionIds ?? [],
    baseUrl: options.apidaeBaseUrl,
    fetchImpl: options.fetchImpl,
  });
  const mapper = new ObjectMapper(pipeline.mapping, {
    '@apidaeSchedules': (value) =>
      ApidaeClient.transformSchedules(value as Record<string, unknown> | undefined, options.now),
    '@apidaeMedia': (value) => ApidaeClient.transformMedia((value as never) ?? []),
    '@poulpusWYSIWYG': (value) => transformWysiwyg(value),
  });
  const sink = new ApidaeSink(deps, definition, pipeline.mapping ?? {}, {
    unlink: pipeline.unlink ?? false,
    fetchImpl: options.fetchImpl,
  });

  const report = empty;
  for await (const { value, error } of client.collect()) {
    if (error) {
      report.collectFailed = true;
      report.errors.push(
        `collecte interrompue: ${error instanceof Error ? error.message : String(error)}`,
      );
      break;
    }
    report.total += 1;
    try {
      const mapped = mapper.mapObject(value);
      await sink.syncCollectionEnums(mapped);
      await sink.syncMedia(mapped);
      await sink.syncEntry(mapped);
    } catch (objectError) {
      const message = objectError instanceof Error ? objectError.message : String(objectError);
      if (message === 'E_EVENT_EXPIRED') {
        report.expired += 1;
      } else {
        report.errors.push(`objet ${value?.id ?? '?'}: ${message}`);
      }
    }
  }

  await sink.finalize(report.collectFailed);

  Object.assign(report, {
    created: sink.counters.created,
    updated: sink.counters.updated,
    mediaUploaded: sink.counters.mediaUploaded,
    mediaReused: sink.counters.mediaReused,
    mediaFailed: sink.counters.mediaFailed,
    droppedFields: sink.counters.droppedFields,
    unlinked: sink.counters.unlinked,
    unlinkSkipped: sink.counters.unlinkSkipped,
  });
  consola.info(
    `[apidae-sync] ${report.collection}: ${report.total} objet(s), ${report.created} créé(s), ` +
      `${report.updated} mis à jour, ${report.expired} expiré(s), ${report.errors.length} erreur(s), ` +
      `${report.unlinked} dépublié(s)`,
  );
  return report;
}
