import { computed, ref } from 'vue'

/**
 * Bearer-token session over the tRPC auth procedures. No cookies, no
 * credentialed requests; the guard is middleware/00.auth.global.
 */

const TOKEN_KEY = 'commun.session.token'

const token = ref<string | null>(null)
const user = ref<Record<string, unknown> | null>(null)

export default function useSession() {
  const isAuthenticated = computed(() => Boolean(token.value && user.value))

  const setToken = (value: string) => {
    token.value = value
    localStorage.setItem(TOKEN_KEY, value)
  }

  const clear = () => {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  /** Reloads the user from auth.me; clears the session on a dead token. */
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
   * Boot restore: localStorage first, then — once, transitional — the old
   * auth-module cookie so sessions opened before the refonte survive.
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
    setToken(result.token)
    user.value = result.user
    return result.user
  }

  /** Best-effort server-side revocation, then local clear. */
  const logout = async () => {
    try {
      await useTrpc().auth.logout.mutate()
    } catch {
      // Dead token or unreachable API: the local clear is enough.
    }
    clear()
  }

  return { token, user, isAuthenticated, login, logout, setToken, clear, refresh, restore }
}
