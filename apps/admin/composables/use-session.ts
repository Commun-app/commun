import { computed, ref } from 'vue'

/**
 * Session de l'admin (refonte-admin-ui, D7) — remplace @sidebase/nuxt-auth :
 * un token Bearer émis par `auth.login`, porté en en-tête par use-trpc,
 * restauré au démarrage (plugin 01.session), gardé par le middleware
 * 00.auth. Aucun cookie de session, aucune requête credentialed.
 */

const TOKEN_KEY = 'commun.session.token'

// État module : une seule session par app, partagée par tous les appelants.
const token = ref<string | null>(null)
const user = ref<Record<string, unknown> | null>(null)

export default function useSession() {
  const isAuthenticated = computed(() => Boolean(token.value && user.value))

  const adopt = (value: string) => {
    token.value = value
    localStorage.setItem(TOKEN_KEY, value)
  }

  const clear = () => {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  /** Recharge l'utilisateur depuis `auth.me` ; purge la session si le token est mort. */
  const refresh = async () => {
    if (!token.value) return null
    try {
      const { user: me } = await useTrpc().auth.me.query()
      user.value = me
      return me
    } catch {
      clear()
      return null
    }
  }

  /**
   * Restauration au démarrage : localStorage, puis — une fois, pour la
   * transition — le cookie de l'ancien nuxt-auth, pour que les sessions
   * ouvertes avant la refonte survivent au déploiement sans re-login.
   */
  const restore = async () => {
    let saved = localStorage.getItem(TOKEN_KEY)
    if (!saved) {
      for (const legacy of ['auth.token', 'auth:token']) {
        const cookie = useCookie<string | null>(legacy)
        if (cookie.value) {
          saved = cookie.value
          cookie.value = null
          break
        }
      }
    }
    if (!saved) return
    token.value = saved
    localStorage.setItem(TOKEN_KEY, saved)
    await refresh()
  }

  const login = async (email: string, password: string) => {
    const result = await useTrpc().auth.login.mutate({ email, password })
    adopt(result.token)
    user.value = result.user
    return result.user
  }

  /** Révoque la session côté serveur (au mieux), puis purge localement. */
  const logout = async () => {
    try {
      await useTrpc().auth.logout.mutate()
    } catch {
      // Token déjà mort ou API injoignable : la purge locale suffit.
    }
    clear()
  }

  return { token, user, isAuthenticated, login, logout, adopt, clear, refresh, restore }
}
