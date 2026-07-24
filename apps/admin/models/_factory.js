import { useRepo } from 'pinia-orm'
import { useWorkspaceStore } from '~/store/layout/workspace'

const HOOK_DEFAULT = (val) => val

/**
 * Couche d'accès au monolithe Commun : chaque modèle implémente ses méthodes
 * via le client tRPC (plan admin). L'interface publique legacy est conservée
 * (read/list/create/update/remove + repo pinia-orm + hooks onRetrieve/onSave)
 * pour ne pas toucher aux pages/composants.
 */
export default class ModelAPI {

  constructor(model, baseURL) {
    const { entity, editForms, onRetrieve, onSave } = model
    this.baseURL = baseURL
    this.entity = entity
    this.editForms = editForms?.()
    this.onRetrieve = onRetrieve || HOOK_DEFAULT
    this.onSave = onSave || HOOK_DEFAULT
    this.repo = useRepo(model)
    this.workspace = useWorkspaceStore()
    this.auth = useAuth()
    this.trpc = useTrpc()
  }

  // Chaque modèle surcharge ce dont il a besoin — iso convention legacy
  // (Entrance/Media jetaient déjà E_UNKNOWN_ENDPOINT sur les verbes absents).
  async read() { throw new Error('E_UNKNOWN_ENDPOINT') }
  async list() { throw new Error('E_UNKNOWN_ENDPOINT') }
  async create() { throw new Error('E_UNKNOWN_ENDPOINT') }
  async update() { throw new Error('E_UNKNOWN_ENDPOINT') }
  async remove() { throw new Error('E_UNKNOWN_ENDPOINT') }

}
