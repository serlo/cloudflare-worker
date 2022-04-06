/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2021 Serlo Education e.V.
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import { getCookieValue, SentryReporter } from '.'
import { Url } from './url'

export async function fetchBackend({
  request,
  sentry,
  domain,
  route,
}: {
  request: Request
  sentry?: SentryReporter
  domain: string
  route: LegacyRoute | FrontendRoute
}) {
  const backendUrl = Url.fromRequest(request)

  if (route.__typename === 'Frontend') {
    if (route.appendSubdomainToPath) {
      backendUrl.pathname = `/${backendUrl.subdomain}${backendUrl.pathname}`
    }

    backendUrl.hostname = domain
    backendUrl.pathname = backendUrl.pathnameWithoutTrailingSlash
  }

  const response = await fetch(new Request(backendUrl.toString(), request), {
    redirect: route.__typename === 'Frontend' ? route.redirect : 'manual',
  })

  if (sentry && route.__typename === 'Frontend' && response.redirected) {
    sentry.setContext('backendUrl', backendUrl)
    sentry.setContext('responseUrl', response.url)
    sentry.captureMessage('Frontend responded with a redirect', 'error')
  }

  return new Response(response.body, response)
}

export function getRoute(request: Request): RouteConfig | null {
  if (forceLegacyRoute(request))
    return {
      __typename: 'BeforeRedirectsRoute',
      route: {
        __typename: 'Legacy',
      },
    }

  return {
    __typename: 'Frontend',
    redirect: 'follow',
    appendSubdomainToPath: true,
    definite: false,
  }
}

const legacyPathnames = [
  '/user/register',
  '/privacy',
  '/datenschutz',
  '/imprint',
  '/terms',
  '/disable-frontend',
  '/enable-frontend',
  '/beitreten',
  '/user/register',
  '/license/manage',
  '/license/add',
]

const legacyPathnamesStartsWith = [
  '/authorization',
  '/authentication/',
  '/auth/',
  '/api/auth',
  '/discussions',
  '/entity',
  '/math/wiki/',
  '/ref/',
  '/page',
  '/taxonomy',
  '/unsubscribe',
  '/user/profile/',
  '/user/register',
  '/users',
  '/subscription/update',
  '/entity/repository/add-revision-old/',
  '/flag',
  '/uuid',
  '/sitemap',
  '/backend',
  '/ads',
  '/blog',
  '/license/update',
  '/navigation/',
]

function forceLegacyRoute(request: Request): boolean {
  const url = Url.fromRequest(request)
  const cookies = request.headers.get('Cookie')

  if (request.method === 'POST') return true

  if (
    url.pathname.startsWith('/taxonomy/term/create/') &&
    global.ENVIRONMENT !== 'production'
  ) {
    return false
  }

  if (
    legacyPathnames.includes(url.pathnameWithoutTrailingSlash) ||
    legacyPathnamesStartsWith.some((pathnameStart) =>
      url.pathname.startsWith(pathnameStart)
    )
  ) {
    return true
  }

  if (
    url.pathname.startsWith('/entity/repository/add-revision/') &&
    getCookieValue('useLegacyEditor', cookies) === '1'
  ) {
    return true
  }

  return false
}

export type RouteConfig = LegacyRoute | FrontendRoute | BeforeRedirectsRoute

export interface BeforeRedirectsRoute {
  __typename: 'BeforeRedirectsRoute'
  route: LegacyRoute | FrontendRoute
}

export interface FrontendRoute {
  __typename: 'Frontend'
  redirect: 'manual' | 'follow'
  appendSubdomainToPath: boolean
  definite: boolean
}

export interface LegacyRoute {
  __typename: 'Legacy'
}
