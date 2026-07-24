// Role Model
import { Model } from 'pinia-orm'
import ModelAPI from '~/models/_factory'

const _roleModel = class Role extends Model {
  // This is the name used as module name of the Vuex Store.
  static entity = 'Role'
  static primaryKey = '_id'

  // List of all fields (schema) of the post model. `this.attr` is used
  // for the generic field type. The argument is the default value.
  static fields () {
    return {
      _id: this.attr(null),
      name: this.attr(''),
      description: this.attr(''),
      permissions: this.attr([]),
      onlyOwn: this.attr(false),
      mfa: this.attr(false),
      createdBy: this.attr({}),
      updatedBy: this.attr({}),
      createdAt: this.attr(0),
      updatedAt: this.attr(0)
    }
  }
}

/**
 * Les rôles paramétrables du legacy sont remplacés par le modèle fixe Commun
 * (admin / redacteur). La liste est statique ; le CRUD est inerte.
 */
const ROLES = [
  {
    _id: 'admin',
    name: 'Administrateur',
    description: 'Accès complet : contenus, médias, membres et réglages.',
    permissions: ['manage:all']
  },
  {
    _id: 'redacteur',
    name: 'Rédacteur',
    description: 'Gestion des contenus et des médias.',
    permissions: ['entrance:self', 'read:records', 'create:records', 'update:records', 'delete:records']
  }
]

const _roleAPI = class RoleAPI extends ModelAPI {
  async list() {
    this.repo.save(ROLES)
    return this.repo.query().all()
  }

  async create() {
    throw new Error('E_ROLES_FIXED')
  }

  async update() {
    throw new Error('E_ROLES_FIXED')
  }

  async remove() {
    throw new Error('E_ROLES_FIXED')
  }
}

export default { model: _roleModel, api: _roleAPI }
