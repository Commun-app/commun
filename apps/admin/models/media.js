// Media Model
import { Model } from 'pinia-orm'
import ModelAPI from '~/models/_factory'
import { mediaToLegacy } from '~/models/_commun'

const _mediaModel = class Media extends Model {
  // This is the name used as module name of the Vuex Store.
  static entity = 'Media'
  static primaryKey = '_id'

  // List of all fields (schema) of the post model. `this.attr` is used
  // for the generic field type. The argument is the default value.
  static fields () {
    return {
      _id: this.attr(null),
      originalName: this.attr(''),
      mime: this.attr(''),
      objects: this.attr({}),
      organization: this.attr(''),
      createdBy: this.attr(''),
      updatedBy: this.attr(''),
      createdAt: this.attr(0),
      updatedAt: this.attr(0)
    }
  }
}

const _mediaAPI = class MediaAPI extends ModelAPI {
  async list() {
    throw new Error('E_UNKNOWN_ENDPOINT')
  }

  /**
   * Flux presigned iso legacy en 2 temps : requestUpload rend { key, url } —
   * la clé S3 joue le rôle du `_id` transitoire que create() (finalize)
   * transmet ensuite.
   */
  async getS3PreSignedUrl(media) {
    const { key, url } = await this.trpc.media.requestUpload.mutate({
      filename: media.name || 'fichier',
      mime: media.mime
    })
    return { _id: key, url }
  }

  async create(record) {
    const media = await this.trpc.media.finalize.mutate({
      key: record._id,
      filename: record.name || 'fichier',
      mime: record.mime
    })
    // Relecture résolue : objects doit contenir les URLs signées, pas les clés.
    const resolved = await this.trpc.media.get.query({ id: media.id })
    const legacy = mediaToLegacy(resolved)
    this.repo.save(legacy)
    return this.repo.find(legacy._id)
  }

  async read(_id) {
    const resolved = await this.trpc.media.get.query({ id: _id })
    const legacy = mediaToLegacy(resolved)
    this.repo.save(legacy)
    return this.repo.find(legacy._id)
  }

  async update(_id, record) {
    const data = {}
    if (record.alt !== undefined) data.alt = record.alt
    if (record.caption !== undefined) data.caption = record.caption
    if (record.originalName !== undefined) data.filename = record.originalName
    const media = await this.trpc.media.update.mutate({ id: _id, data })
    this.repo.save(mediaToLegacy(media))
    return this.repo.find(_id)
  }

  async remove(_id) {
    await this.trpc.media.remove.mutate({ id: _id })
    return this.repo.destroy(_id)
  }
}

export default { model: _mediaModel, api: _mediaAPI }
