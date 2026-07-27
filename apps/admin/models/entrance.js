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

  /** Mot de passe oublié (9.9) : réponse toujours ok (pas d'énumération). */
  async recoverPassword(emailAddress) {
    return this.trpc.auth.requestPasswordReset.mutate({ email: emailAddress })
  }

  /** Le lien du mail de reset pointe sur /password/define/<token> — même
   * acceptation d'invitation, sans nom (conservé côté serveur). */
  async updatePassword({ token, password }) {
    return this.trpc.auth.acceptInvitation.mutate({ token, password })
  }

  async confirmEmail() {
    throw new Error('E_NOT_AVAILABLE_YET')
  }
}

export default { model: _entranceModel, api: _entranceAPI }
