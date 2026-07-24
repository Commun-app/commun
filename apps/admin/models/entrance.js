// Entrance Model
import { Model } from 'pinia-orm'
import ModelAPI from '~/models/_factory'

const _entranceModel = class Entrance extends Model {
  // This is the name used as module name of the Vuex Store.
  static entity = 'Entrance'
  static primaryKey = '_id'

  // List of all fields (schema) of the post model. `this.attr` is used
  // for the generic field type. The argument is the default value.
  static fields () {
    return {}
  }
}

const _entranceAPI = class EntranceAPI extends ModelAPI {
  /**
   * Le flux legacy confirm-email → define-password est remplacé par
   * l'acceptation d'invitation Commun (une seule étape, publique).
   */
  async acceptInvitation({ token, name, password }) {
    return this.trpc.auth.acceptInvitation.mutate({ token, name, password })
  }

  // Récupération de mot de passe : pas d'équivalent serveur tant que l'envoi
  // de mails (tâche 9.9) n'est pas porté — écrans conservés mais inertes.
  async recoverPassword() {
    throw new Error('E_NOT_AVAILABLE_YET')
  }

  async updatePassword() {
    throw new Error('E_NOT_AVAILABLE_YET')
  }

  async confirmEmail() {
    throw new Error('E_NOT_AVAILABLE_YET')
  }
}

export default { model: _entranceModel, api: _entranceAPI }
