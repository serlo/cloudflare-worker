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
  currentRevision: t.type({ content: t.string }),
})

const CourseContent = t.type({
  state: t.type({
    pages: t.array(t.type({ title: t.string, id: t.string })),
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
          id
          alias
          currentRevision {
            content
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

  const coursePageMatch = path.match(
    /^\/(?<instance>[a-z]{2}\/)?(?<subject>[a-z]+\/)?(?<id>\d+)\/(?<coursePageId>[0-9a-f]+)\/(?<title>[^/]*)$/,
  )
  const coursePageId = coursePageMatch?.groups?.coursePageId ?? null

  const isTrashedComment = uuid.__typename === 'Comment' && uuid.trashed
  let currentPath: string = ''

  if (coursePageId !== null) {
    if (!CourseResult.is(uuid)) return null

    try {
      const courseContent = JSON.parse(uuid.currentRevision.content) as unknown

      if (!CourseContent.is(courseContent)) return null

      if (courseContent.state.pages.at(0)?.id?.startsWith(coursePageId)) {
        currentPath = uuid.alias
      } else {
        const coursePage = courseContent.state.pages.find((page) =>
          page.id.startsWith(coursePageId),
        )

        if (coursePage === undefined) {
          // This case should never happen => return course alias as a fallback
          currentPath = uuid.alias
        } else {
          const subject = uuid.alias.split('/').at(1) ?? 'serlo'
          const slugTitle = toSlug(coursePage.title)
          const shortPageId = coursePage.id.split('-').at(0)
          if (!shortPageId) {
            currentPath = uuid.alias
          } else {
            currentPath = `/${subject}/${uuid.id}/${shortPageId}/${slugTitle}`
          }
        }
      }
    } catch (e) {
      return null
    }
  } else {
    currentPath = isTrashedComment
      ? `error/deleted/${uuid.__typename}`
      : uuid.legacyObject !== undefined
        ? uuid.legacyObject.alias
        : uuid.alias ?? path
  }

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

// Copied from https://github.com/serlo/api.serlo.org/blob/ce94045b513e59da1ddd191b498fe01f6ff6aa0a/packages/server/src/schema/uuid/abstract-uuid/resolvers.ts#L685-L703
// Try to keep both functions in sync
function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ñ/g, 'n')
    .replace(/ /g, '-') // replace spaces with hyphens
    .replace(/[^\w-]+/g, '') // remove all non-word chars including _
    .replace(/--+/g, '-') // replace multiple hyphens
    .replace(/^-+/, '') // trim starting hyphen
    .replace(/-+$/, '') // trim end hyphen
}
