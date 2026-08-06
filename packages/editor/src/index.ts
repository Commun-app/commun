/**
 * Headless editor contract shared by the admin (editing) and, later, the
 * themes (rendering): extension assembly, node schemas, sanitation and the
 * embed service table. Vue node views stay with their consumers.
 */
export {
  communStarterKit,
  communSchemaExtensions,
  CommunLink,
  CommunOrderedList,
  type CommunEditorMedia,
} from './extensions.ts';
export { Uid, UID_TYPES } from './uid.ts';
export { Callout } from './callout.ts';
export { FileNode, fileInputRegex, type FileNodeOptions } from './file.ts';
export { ImageNode } from './image.ts';
export { Embed, EMBED_SERVICES, type EmbedService } from './embed.ts';
export { Details, DetailsSummary, DetailsContent } from './details.ts';
export { UploadPlaceholder } from './upload.ts';
export { sanitizeDoc } from './sanitize.ts';
