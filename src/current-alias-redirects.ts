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
        legacyObject: t.type({ alias: t.string }),
        id: t.number,
        trashed: t.boolean,
      }),
    ]),
  }),
})

const CourseResult = t.type({
  id: t.number,
  alias: t.string,
})

/**
 * Check if a path is a common hacker/bot probe path that should not reach the database.
 * These are paths commonly used by bots to scan for vulnerabilities.
 */
function isCommonHackerPath(path: string): boolean {
  const lowerPath = path.toLowerCase()

  // Common file-based attacks
  if (
    lowerPath.startsWith('/.env') ||
    lowerPath.startsWith('/.git') ||
    lowerPath.startsWith('/.aws') ||
    lowerPath.startsWith('/.ssh') ||
    lowerPath.startsWith('/.docker') ||
    lowerPath === '/config.json' ||
    lowerPath === '/config.php' ||
    lowerPath === '/configuration.php'
  ) {
    return true
  }

  // WordPress-related paths
  if (
    lowerPath.startsWith('/wp-admin') ||
    lowerPath.startsWith('/wp-login') ||
    lowerPath.startsWith('/wp-content') ||
    lowerPath.startsWith('/wp-includes') ||
    lowerPath === '/xmlrpc.php' ||
    lowerPath === '/wp-config.php'
  ) {
    return true
  }

  // Other CMS and admin panels
  if (
    lowerPath.startsWith('/phpmyadmin') ||
    lowerPath.startsWith('/pma') ||
    lowerPath.startsWith('/admin') ||
    lowerPath.startsWith('/administrator') ||
    lowerPath.startsWith('/cpanel') ||
    lowerPath.startsWith('/plesk') ||
    lowerPath.startsWith('/webmail') ||
    lowerPath.startsWith('/joomla') ||
    lowerPath.startsWith('/drupal')
  ) {
    return true
  }

  // Common file extensions that Serlo doesn't use
  if (
    lowerPath.endsWith('.php') ||
    lowerPath.endsWith('.asp') ||
    lowerPath.endsWith('.aspx') ||
    lowerPath.endsWith('.jsp') ||
    lowerPath.endsWith('.cgi') ||
    lowerPath.endsWith('.pl')
  ) {
    return true
  }

  return false
}

async function getPathInfo(
  lang: Instance,
  path: string,
  env: CFEnvironment,
): Promise<PathInfo | null> {
  if (path === '/user/me' || path === '/user/public')
    return { currentPath: path }

  // Block common hacker paths before querying the database
  if (isCommonHackerPath(path)) return null

  const cacheKey = await toCacheKey(`/${lang}${path}`)
  const cachedValue = await env.PATH_INFO_KV.get(cacheKey)

  if (cachedValue !== null) {
    try {
      const result = PathInfo.decode(JSON.parse(cachedValue))

      if (E.isRight(result)) return result.right
    } catch {
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
          id
          alias
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
  } catch {
    return null
  }

  if (!ApiResult.is(apiResponseBody)) return null
  const uuid = apiResponseBody.data.uuid

  const coursePageMatch = path.match(
    /^\/(?<instance>[a-z]{2}\/)?(?<subject>[a-z]+\/)?(?<id>\d+)\/(?<coursePageId>[0-9a-f]+)\/(?<title>[^/]*)$/,
  )
  const coursePageId = coursePageMatch?.groups?.coursePageId ?? null

  const isTrashedComment = uuid.__typename === 'Comment' && uuid.trashed
  let currentPath: string = ''
  let hash: string = ''

  if (coursePageId !== null) {
    if (!CourseResult.is(uuid)) return null

    currentPath = uuid.alias
    hash = `#${coursePageId}`
  } else {
    currentPath = isTrashedComment
      ? `error/deleted/${uuid.__typename}`
      : uuid.legacyObject !== undefined
        ? uuid.legacyObject.alias
        : (uuid.alias ?? path)

    if (uuid.legacyObject !== undefined && !isTrashedComment) {
      hash = `#comment-${uuid.id ?? 0}`
    }
  }

  const result = {
    currentPath,
    instance: uuid.instance,
    ...(hash ? { hash } : {}),
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
