import Organization from '~/models/organization'
import Collection from '~/models/collection'
import Media from '~/models/media'
import Record from '~/models/record'
import Role from '~/models/role'
import Token from '~/models/token'
import User from '~/models/user'
import Entrance from '~/models/entrance'

// @review on pourrait pas déplacer le dossier models dans le dossier composables pour ajouter plus de clareté ? Aussi cette factory me semble un peu alambiquée, pourquoi a t on besoin de passer le model + api url dans un objet exporté par le model lui meme
// bref, je pense que qu'il y a de l'overengineering ici aussi non ?

// Export models
export default () => {
  const { public: { apiURL } } = useRuntimeConfig()

  return {
    Organization: new Organization.api(Organization.model, apiURL),
    Collection: new Collection.api(Collection.model, apiURL),
    Media: new Media.api(Media.model, apiURL),
    Record: new Record.api(Record.model, apiURL),
    Role: new Role.api(Role.model, apiURL),
    Token: new Token.api(Token.model, apiURL),
    User: new User.api(User.model, apiURL),
    Entrance: new Entrance.api(Entrance.model, apiURL)
  }
}
