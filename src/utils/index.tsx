import { either as E } from 'fp-ts'
import * as t from 'io-ts'

import { fetchApi } from '../api'
import { CFEnvironment } from '../cf-environment'

export * from './sentry'
export * from './url'

export enum Instance {
  De = 'de',
  En = 'en',
  Es = 'es',
  Fr = 'fr',
  Hi = 'hi',
  Ta = 'ta',
}

export function isInstance(code: unknown): code is Instance {
  return Object.values(Instance).some((x) => x === code)
}

const PathInfo = t.intersection([
  t.type({ typename: t.string, currentPath: t.string }),
  t.partial({ instance: t.string, hash: t.string }),
])
type PathInfo = t.TypeOf<typeof PathInfo>

const ApiResult = t.type({
  data: t.type({
    uuid: t.intersection([
      t.type({ __typename: t.string }),
      t.partial({
        alias: t.string,
        instance: t.string,
        pages: t.array(t.type({ alias: t.string })),
        legacyObject: t.type({ alias: t.string }),
        exerciseGroup: t.type({ alias: t.string }),
        id: t.number,
        trashed: t.boolean,
      }),
    ]),
  }),
})

export async function getPathInfo(
  lang: Instance,
  path: string,
  env: CFEnvironment,
): Promise<PathInfo | null> {
  if (path === '/user/me' || path === '/user/public')
    return { typename: 'User', currentPath: path }

  const cacheKey = await toCacheKey(`/${lang}${path}`)
  const cachedValue = await env.PATH_INFO_KV.get(cacheKey)

  if (cachedValue !== null) {
    try {
      const result = PathInfo.decode(JSON.parse(cachedValue))

      if (E.isRight(result)) return result.right
    } catch (e) {
      // ignore
    }
  }

  const query = `
    query TypenameAndCurrentPath($alias: AliasInput) {
      uuid(alias: $alias) {
        __typename
        ... on AbstractUuid {
          alias
        }
        ... on InstanceAware {
          instance
        }
        ... on Course {
          pages(trashed: false, hasCurrentRevision: true) {
            alias
          }
        }
        ... on Comment {
          id
          trashed
          legacyObject {
            alias
          }
        }
        ... on GroupedExercise {
          exerciseGroup {
            alias
          }
        }
      }
    }`
  const variables = { alias: { instance: lang, path } }

  let apiResponseBody: unknown

  try {
    const apiResponse = await fetchApi(
      new Request(env.API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      }),
      env,
    )
    apiResponseBody = await apiResponse.json()
  } catch (e) {
    return null
  }

  if (!ApiResult.is(apiResponseBody)) return null
  const uuid = apiResponseBody.data.uuid

  const isTrashedComment = uuid.__typename === 'Comment' && uuid.trashed

  const currentPath = isTrashedComment
    ? `error/deleted/${uuid.__typename}`
    : uuid.legacyObject !== undefined
      ? uuid.legacyObject.alias
      : uuid.exerciseGroup !== undefined
        ? uuid.exerciseGroup.alias
        : uuid.pages !== undefined && uuid.pages.length > 0
          ? uuid.pages[0].alias
          : uuid.alias ?? path

  const result = {
    typename: uuid.__typename,
    currentPath,
    instance: uuid.instance,
    ...(uuid.legacyObject !== undefined && !isTrashedComment
      ? { hash: `#comment-${uuid.id ?? 0}` }
      : {}),
  }

  await env.PATH_INFO_KV.put(cacheKey, JSON.stringify(result), {
    expirationTtl: 60 * 60,
  })

  return result
}

export function createHtmlResponse(html: string, opt?: ResponseInit) {
  return new Response(html, {
    ...opt,
    headers: {
      ...opt?.headers,
      'Content-Type': 'text/html;charset=utf-8',
    },
  })
}

interface CacheKeyBrand {
  readonly CacheKey: unique symbol
}

const CacheKey = t.brand(
  t.string,
  (text): text is t.Branded<string, CacheKeyBrand> => text.length <= 512,
  'CacheKey',
)
export type CacheKey = t.TypeOf<typeof CacheKey>

export async function toCacheKey(key: string): Promise<CacheKey> {
  const shortenKey = key.length > 512 ? await digestMessage(key) : key

  return E.getOrElse<unknown, CacheKey>(() => {
    throw new Error('Illegal State')
  })(CacheKey.decode(shortenKey))
}

async function digestMessage(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
