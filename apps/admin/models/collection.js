// Collection Model
import { Model } from 'pinia-orm'
import ModelAPI from '~/models/_factory'
import {
  attributeToField,
  definitionToCollection,
  invalidateDefinitions
} from '~/models/_commun'

const _collectionModel = class Collection extends Model {
  // This is the name used as module name of the Vuex Store.
  static entity = 'Collection'
  static primaryKey = '_id'

  // List of all fields (schema) of the post model. `this.attr` is used
  // for the generic field type. The argument is the default value.
  static fields () {
    return {
      _id: this.attr(null),
      name: this.attr(''),
      slug: this.attr(''),
      description: this.attr(''),
      headings: this.attr({}),
      display: this.attr({}),
      editor: this.attr({}),
      attributes: this.attr([]),
      organization: this.attr(''),
      createdBy: this.attr({}),
      updatedBy: this.attr({}),
      createdAt: this.attr(0),
      updatedAt: this.attr(0)
    }
  }
}

/** collection legacy (attributes[]) → payload collections.create/update. */
function toDefinitionPayload(record) {
  const payload = {}
  for (const key of ['name', 'slug', 'description', 'editor', 'display', 'headings']) {
    if (record[key] !== undefined) payload[key] = record[key]
  }
  if (Array.isArray(record.attributes)) {
    payload.fields = record.attributes.map(attributeToField).filter(Boolean)
  }
  return payload
}

const _collectionAPI = class CollectionAPI extends ModelAPI {
  async list() {
    const definitions = await this.trpc.collections.list.query()
    this.repo.save(definitions.map(definitionToCollection))
    return this.repo.query().all()
  }

  async read(_id) {
    const definition = await this.trpc.collections.get.query({ idOrSlug: _id })
    const collection = definitionToCollection(definition)
    this.repo.save(collection)
    return this.repo.find(collection._id)
  }

  async create(record) {
    const definition = await this.trpc.collections.create.mutate(toDefinitionPayload(record))
    invalidateDefinitions()
    const collection = definitionToCollection(definition)
    this.repo.save(collection)
    return this.repo.find(collection._id)
  }

  async update(_id, record) {
    const definition = await this.trpc.collections.update.mutate({
      id: _id,
      data: toDefinitionPayload(record)
    })
    invalidateDefinitions()
    this.repo.save(definitionToCollection(definition))
    return this.repo.find(_id)
  }

  async remove(_id) {
    await this.trpc.collections.remove.mutate({ id: _id })
    invalidateDefinitions()
    return this.repo.destroy(_id)
  }
}

export default { model: _collectionModel, api: _collectionAPI }
