import { either as E } from 'fp-ts'
import * as t from 'io-ts'

import { fetchApi } from './api'
import { toCacheKey, CFEnvironment, Instance, Url, isInstance } from './utils'

export async function redirectToCurrentAlias(
  request: Request,
  env: CFEnvironment,
) {
  const url = Url.fromRequest(request)
  if (isInstance(url.subdomain)) {
    const pathInfo = await getPathInfo(url.subdomain, url.pathname, env)

    if (pathInfo !== null) {
      const newUrl = new Url(url.href)
      const { currentPath, instance, hash } = pathInfo

      if (instance && isInstance(instance) && url.subdomain !== instance)
        newUrl.subdomain = instance
      if (url.pathname !== currentPath) newUrl.pathname = currentPath
      if (hash !== undefined) newUrl.hash = hash

      if (newUrl.href !== url.href) return newUrl.toRedirect(301)
    }
  }
  return null
}

const PathInfo = t.intersection([
  t.type({ currentPath: t.string }),
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
        id: t.number,
        trashed: t.boolean,
      }),
    ]),
  }),
})

async function getPathInfo(
  lang: Instance,
  path: string,
  env: CFEnvironment,
): Promise<PathInfo | null> {
  if (path === '/user/me' || path === '/user/public')
    return { currentPath: path }

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

  const query = gql`
    query ($alias: AliasInput) {
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
      }
    }
  `
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
      : uuid.pages !== undefined && uuid.pages.length > 0
        ? uuid.pages[0].alias
        : uuid.alias ?? path

  const result = {
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

/**
 * This marker is used by https://github.com/serlo/unused-graphql-properties
 * to detect graphql statements.
 */
function gql(strings: TemplateStringsArray): string {
  return strings[0]
}
