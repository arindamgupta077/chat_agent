import uniq from 'lodash/uniq'
import { ofetch } from 'ofetch'
import { cache } from '../utils/cache'

let API_ORIGIN = 'https://api.chatboxai.app'

let POOL = [
  'https://api.chatboxai.app',
  'https://chatboxai.app',
  'https://api.ai-chatbox.com',
  'https://api.chatboxapp.xyz',
]

export function isChatboxAPI(input: RequestInfo | URL) {
  const url = typeof input === 'string' ? input : ((input as Request).url ?? input.toString())
  return POOL.some((o) => url.startsWith(o)) || url.startsWith(getChatboxAPIOrigin())
}

export function getChatboxAPIOrigin() {
  if (process.env.USE_LOCAL_API) {
    return 'http://localhost:8002'
  }
  if (process.env.USE_BETA_API) {
    return 'https://api-beta.chatboxai.app'
  }
  if (process.env.USE_NEWDB_API) {
    return 'https://beta-new-db.chatboxai.app'
  }
  return API_ORIGIN
}

export async function testApiOrigins() {
  const result = await cache(
    'api_origins',
    async () => {
      let i = 0
      let pool = POOL
      while (i < pool.length) {
        try {
          const origin: string = pool[i]
          const controller = new AbortController()
          setTimeout(() => controller.abort(), 2000)
          const res = await ofetch<{ data: { api_origins: string[] } }>(`${origin}/api/api_origins`, {
            // ofetch and React Native expose compatible signals through different declarations.
            signal: controller.signal as unknown as NonNullable<Parameters<typeof ofetch>[1]>['signal'],
            retry: 1,
          })
          if (res.data.api_origins.length > 0) {
            pool = uniq([...pool, ...res.data.api_origins])
          }
          API_ORIGIN = origin
          pool = uniq([origin, ...pool])
          POOL = pool
          return pool
        } catch (e) {
          i++
        }
      }
      return POOL
    },
    { ttl: 1000 * 60 * 60, refreshFallbackToCache: true }
  )

  return result
}
