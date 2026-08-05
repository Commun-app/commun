// @commun/apidae-sync — portage APIDAE-only du job-data-sync legacy (change
// port-legacy-jobs). Moteur pur (client, mapper, transforms) + sink via les
// SERVICES du core, dépendances injectées : le package ne touche jamais la
// base directement, il reçoit tout de l'instance qui l'appelle.
//
// Frontière volontaire (review PR #4) : machinerie de bascule spécifique à
// ot-pertuis, hors du cœur open source — candidate à l'extraction dans un
// dépôt privé au moment de la publication (phase 6).
import { DefinitionRepository, EntryRepository, MediaRepository, type Core } from '@commun/core';
import type { ApidaeSyncDeps } from './injector.ts';

export {
  ApidaeClient,
  type ApidaeMediaRef,
  type ApidaePeriod,
  type ApidaeSchedules,
} from './apidae-client.ts';
export { ObjectMapper, type MappingDictionary, type TransformHandlers } from './mapper.ts';
export { transformWysiwyg } from './wysiwyg.ts';
export { ApidaeSink, type SinkDeps } from './sink.ts';
export {
  runApidaeSync,
  type ApidaeSyncDeps,
  type ApidaeSyncOptions,
  type ApidaeSyncReport,
  type InjectorConfig,
  type InjectorPipelineConfig,
  type PipelineReport,
} from './injector.ts';

/**
 * Construit les dépendances de la sync depuis un Core câblé — l'idempotence
 * (json_extract) et le legacyExtra passent par les repositories, sans surface
 * service publique.
 */
export function depsFromCore(core: Core): ApidaeSyncDeps {
  return {
    organization: core.services.organization,
    collections: core.services.collections,
    definitionRepository: new DefinitionRepository(core.db),
    entryRepository: new EntryRepository(core.db),
    media: core.services.media,
    mediaRepository: new MediaRepository(core.db),
  };
}
