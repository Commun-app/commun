// Token Model
import { Model } from 'pinia-orm'
import ModelAPI from '~/models/_factory'

const _tokenModel = class Token extends Model {
  // This is the name used as module name of the Vuex Store.
  static entity = 'Token'
  static primaryKey = '_id'

  // List of all fields (schema) of the post model. `this.attr` is used
  // for the generic field type. The argument is the default value.
  static fields () {
    return {
      _id: this.attr(null),
      name: this.attr(''),
      token: this.attr(''),
      lastEntrance: this.attr(0),
      organization: this.attr({}),
      createdBy: this.attr({}),
      createdAt: this.attr(0),
      updatedAt: this.attr(0)
    }
  }
}

const _tokenAPI = class TokenAPI extends ModelAPI {
  async list() {
    const tokens = await this.trpc.apiTokens.list.query()
    // Les tokens sont désormais stockés hachés : la valeur en clair n'est
    // visible qu'à la création (différence assumée vs legacy plaintext).
    this.repo.save(
      tokens
        .filter((token) => !token.revokedAt)
        .map((token) => ({
          _id: token.id,
          name: token.name,
          lastEntrance: token.lastUsedAt ?? 0,
          createdAt: token.createdAt
        }))
    )
    return this.repo.query().all()
  }

  async create(record) {
    const created = await this.trpc.apiTokens.create.mutate({ name: record.name })
    this.repo.save({ _id: created.id, name: created.name, token: created.token })
    return this.repo.find(created.id)
  }

  async remove(_id) {
    await this.trpc.apiTokens.revoke.mutate({ id: _id })
    return this.repo.destroy(_id)
  }
}

export default { model: _tokenModel, api: _tokenAPI }
