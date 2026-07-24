// Organization Model
import { Model } from 'pinia-orm'
import ModelAPI from '~/models/_factory'

const _organizationModel = class Organization extends Model {
  // This is the name used as module name of the Vuex Store.
  static entity = 'Organization'
  static primaryKey = '_id'

  // List of all fields (schema) of the post model. `this.attr` is used
  // for the generic field type. The argument is the default value.
  static fields () {
    return {
      _id: this.attr(''),
      logo: this.attr(null),
      name: this.attr(''),
      slug: this.attr(''),
      type: this.attr(''),
      path: this.attr(''),
      location: this.attr({}),
      settings: this.attr({}),
      injector: this.attr({}),
      deployment: this.attr({}),
      collections: this.attr([]),
      directParent: this.attr({}),
      createdBy: this.attr({}),
      updatedBy: this.attr({}),
      createdAt: this.attr(0),
      updatedAt: this.attr(0)
    }
  }
}

// Clés acceptées par organization.update côté Commun.
const UPDATABLE = [
  'name', 'type', 'slug', 'description', 'address', 'postalCode', 'city',
  'phone', 'email', 'website', 'theme', 'deployment', 'social', 'settings'
]

const _organizationAPI = class OrganizationAPI extends ModelAPI {
  /** Organization Commun (singleton) → organisation legacy, _id = slug (routes). */
  async _toLegacy(organization) {
    const definitions = await this.trpc.collections.list.query()
    return {
      _id: organization.slug,
      name: organization.name,
      slug: organization.slug,
      type: organization.type,
      path: `/${organization.slug}`,
      logo: organization.settings?.logo ?? null,
      location: {},
      settings: organization.settings ?? {},
      injector: {},
      deployment: organization.deployment ?? {},
      // Single-tenant : toutes les collections sont « actives ».
      collections: definitions.map((definition) => definition.id),
      directParent: {},
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt
    }
  }

  async list() {
    const organization = await this.trpc.organization.get.query()
    if (!organization) return []
    this.repo.save(await this._toLegacy(organization))
    return this.repo.query().all()
  }

  async update(_id, record) {
    const payload = {}
    for (const key of UPDATABLE) {
      if (record[key] !== undefined) payload[key] = record[key]
    }
    // Ex : toggle d'usage des collections (multi-tenant) → sans objet ici.
    if (!Object.keys(payload).length) return this.repo.find(_id)
    const organization = await this.trpc.organization.update.mutate(payload)
    this.repo.save(await this._toLegacy(organization))
    return this.repo.find(_id)
  }

  // Déploiements : portage prévu avec les jobs (tâche 9.10). Le bouton
  // Publier est désactivé d'ici là ; le polling reste silencieux.
  async createDeployment() {
    throw new Error('E_DEPLOYMENTS_NOT_PORTED')
  }

  async getDeployment() {
    return { state: 'READY' }
  }
}

export default { model: _organizationModel, api: _organizationAPI }
