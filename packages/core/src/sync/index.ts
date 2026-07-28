// Module sync — portage APIDAE-only du job-data-sync legacy (change
// port-legacy-jobs). Moteur pur (client, mapper, transforms) + sink via les
// services du core ; consommé par la tâche Nitro `apidae:sync` d'apps/api.
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
