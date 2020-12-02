/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2020 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
import { either as E } from 'fp-ts'
import * as t from 'io-ts'
import marked from 'marked'
import { h, VNode } from 'preact'
import renderToString from 'preact-render-to-string'
import sanitize from 'sanitize-html'

import { fetchApi } from '../api'
import { NotFound } from '../ui'

export * from './url'

export enum Instance {
  De = 'de',
  En = 'en',
  Es = 'es',
  Fr = 'fr',
  Hi = 'hi',
  Ta = 'ta',
}

export function isInstance(code: string): code is Instance {
  return Object.values(Instance).some((x) => x === code)
}

export function getCookieValue(
  name: string,
  cookieHeader: string | null
): string | null {
  return cookieHeader === null
    ? null
    : cookieHeader
        .split(';')
        .map((c) => c.trim())
        .filter((c) => c.startsWith(`${name}=`))
        .map((c) => c.substring(name.length + 1))[0] ?? null
}

const PathInfo = t.intersection([
  t.type({ typename: t.string, currentPath: t.string }),
  t.partial({ instance: t.string }),
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
      }),
    ]),
  }),
})

export async function getPathInfo(
  lang: Instance,
  path: string
): Promise<PathInfo | null> {
  if (path === '/user/me' || path === '/user/public')
    return { typename: 'User', currentPath: path }

  const useCache = global.ENABLE_PATH_INFO_CACHE === 'true'

  const cacheKey = await toCacheKey(`/${lang}${path}`)
  const cachedValue = useCache ? await global.PATH_INFO_KV.get(cacheKey) : null

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
        ... on TaxonomyTerm {
          instance
        }
        ... on AbstractRepository {
          instance
        }
        ... on Course {
          pages {
            alias
          }
        }
      }
    }`
  const variables = { alias: { instance: lang, path } }

  let apiResponseBody: unknown

  try {
    const apiResponse = await fetchApi(
      new Request(global.API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      })
    )
    apiResponseBody = (await apiResponse.json()) as unknown
  } catch (e) {
    return null
  }

  const apiResult = ApiResult.decode(apiResponseBody)

  if (E.isLeft(apiResult)) return null

  const uuid = apiResult.right.data.uuid
  const currentPath =
    uuid.pages !== undefined && uuid.pages.length > 0
      ? uuid.pages[0].alias
      : uuid.alias ?? path

  const result = {
    typename: uuid.__typename,
    currentPath,
    instance: uuid.instance,
  }

  if (useCache) {
    await global.PATH_INFO_KV.put(cacheKey, JSON.stringify(result), {
      expirationTtl: 60 * 60,
    })
  }

  return result
}

export function sanitizeHtml(html: string): string {
  return sanitize(html, {
    allowedTags: sanitize.defaults.allowedTags
      .filter((x) => x !== 'iframe')
      .concat(['h1', 'h2']),
  }).trim()
}

export function markdownToHtml(markdown: string): string {
  return marked(markdown, { headerIds: false }).trim()
}

export async function fetchWithCache(
  url: string | Request,
  init?: RequestInit
): Promise<Response> {
  return await fetch(url, ({
    cf: { cacheTtl: 60 * 60 },
    ...init,
  } as unknown) as RequestInit)
}

export function getBasicAuthHeaders(): Record<string, string> {
  return global.ENABLE_BASIC_AUTH === 'true'
    ? { Authorization: 'Basic c2VybG90ZWFtOnNlcmxvdGVhbQ==' }
    : {}
}

export function createPreactResponse(component: VNode, opt?: ResponseInit) {
  return new Response(renderToString(component), {
    ...opt,
    headers: {
      ...opt?.headers,
      'Content-Type': 'text/html;charset=utf-8',
    },
  })
}

export function createJsonResponse(json: unknown) {
  return new Response(JSON.stringify(json), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export function createNotFoundResponse() {
  return createPreactResponse(<NotFound />, { status: 404 })
}

async function toCacheKey(key: string): Promise<string> {
  return key.length > 512 ? await digestMessage(key) : key
}

async function digestMessage(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}
