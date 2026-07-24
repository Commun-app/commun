// User Model
import { Model } from 'pinia-orm'
import ModelAPI from '~/models/_factory'

const _userModel = class User extends Model {
  // This is the name used as module name of the Vuex Store.
  static entity = 'User'
  static primaryKey = '_id'

  // List of all fields (schema) of the post model. `this.attr` is used
  // for the generic field type. The argument is the default value.
  static fields () {
    return {
      _id: this.attr(null),
      firstName: this.attr(''),
      lastName: this.attr(''),
      phone: this.attr(''),
      emailAddress: this.attr(''),
      emailStatus: this.attr(''),
      emailChangeCandidate: this.attr(''),
      avatar: this.attr({}),
      role: this.attr(''),
      organizations: this.attr([]),
      permissions: this.attr([]),
      createdBy: this.attr({}),
      updatedBy: this.attr({}),
      createdAt: this.attr(0),
      updatedAt: this.attr(0)
    }
  }

  /**
   * Get full name of the user.
   */
  get fullName () {
    return [this.firstName, this.lastName].join(' ')
  }
}

/** PublicUser Commun { id, email, name, role } → user legacy. */
function userToLegacy(user) {
  return {
    _id: user.id,
    firstName: user.name ?? '',
    lastName: '',
    emailAddress: user.email,
    emailStatus: 'confirmed',
    role: user.role,
    organizations: [],
    permissions: []
  }
}

const _userAPI = class UserAPI extends ModelAPI {
  async list() {
    const users = await this.trpc.users.list.query()
    this.repo.save(users.map(userToLegacy))
    return this.repo.query().all()
  }

  async read(_id) {
    const user = await this.trpc.users.get.query({ id: _id })
    this.repo.save(userToLegacy(user))
    return this.repo.find(_id)
  }

  /**
   * La création directe n'existe plus : on émet une INVITATION (le lien est
   * affiché à l'admin tant que l'envoi de mails — tâche 9.9 — n'est pas porté).
   * Retourne { token, expiresAt } en plus de rafraîchir la liste.
   */
  async create(record) {
    const invitation = await this.trpc.users.invite.mutate({
      email: record.emailAddress,
      role: record.role || 'redacteur'
    })
    return invitation
  }

  async update(_id, record) {
    const data = {}
    if (record.firstName !== undefined || record.lastName !== undefined) {
      data.name = [record.firstName, record.lastName].filter(Boolean).join(' ')
    }
    if (record.role !== undefined) data.role = record.role
    const user = await this.trpc.users.update.mutate({ id: _id, data })
    this.repo.save(userToLegacy(user))
    return this.repo.find(_id)
  }

  async remove(_id) {
    await this.trpc.users.remove.mutate({ id: _id })
    return this.repo.destroy(_id)
  }
}

export default { model: _userModel, api: _userAPI }
