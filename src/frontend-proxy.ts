/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021-2022 Serlo Education e.V.
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
 * @copyright Copyright (c) 2022 Serlo Education e.V.
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import {
  getCookieValue,
  isInstance,
  SentryFactory,
  SentryReporter,
  Url,
} from './utils'
import * as vercelFrontendProxy from './utils/vercel-frontend-proxy'

export async function frontendSpecialPaths(
  request: Request,
  sentryFactory: SentryFactory
): Promise<Response | null> {
  const url = Url.fromRequest(request)
  const route = await getRoute(request)
  const sentry = sentryFactory.createReporter('frontend-special-paths')

  if (url.pathname === '/enable-frontend')
    return createConfigurationResponse('Enabled: Use of new frontend', 0)

  if (url.pathname === '/disable-frontend')
    return createConfigurationResponse('Disabled: Use of new frontend', 1.1)

  return route !== null && route.__typename === 'BeforeRedirectsRoute'
    ? fetchBackend({ request, sentry, route: route.route })
    : null
}

export async function frontendProxy(
  request: Request,
  sentryFactory: SentryFactory
): Promise<Response | null> {
  const url = Url.fromRequest(request)
  const cookies = request.headers.get('Cookie')
  const sentry = sentryFactory.createReporter('frontend')
  const route = await getRoute(request)
  if (route === null || route.__typename === 'BeforeRedirectsRoute') {
    return null
  } else if (route.__typename === 'AB') {
    const cookieValue = Number(getCookieValue('useFrontend', cookies) ?? 'NaN')
    const useFrontendNumber = Number.isNaN(cookieValue)
      ? Math.random()
      : cookieValue

    let contentApiRequest = null

    if (url.hasContentApiParameters()) {
      url.pathname = '/content-only' + url.pathname
      contentApiRequest = new Request(url.toString(), new Request(request))
    }

    const response = await fetchBackend({
      request: contentApiRequest ?? request,
      sentry,
      route: {
        __typename:
          useFrontendNumber <= route.probability ? 'Frontend' : 'Legacy',
        appendSubdomainToPath: true,
        redirect: 'follow',
        definite: false,
      },
    })

    if (Number.isNaN(cookieValue)) {
      setCookieUseFrontend(response, useFrontendNumber)
    }

    return response
  } else {
    return fetchBackend({ request, sentry, route })
  }
}

async function fetchBackend({
  request,
  sentry,
  route,
}: {
  request: Request
  sentry: SentryReporter
  route: vercelFrontendProxy.LegacyRoute | vercelFrontendProxy.FrontendRoute
}) {
  const cookies = request.headers.get('Cookie')
  const domain =
    getCookieValue('frontendDomain', cookies) ?? global.FRONTEND_DOMAIN

  return vercelFrontendProxy.fetchBackend({
    request,
    sentry,
    domain,
    route,
  })
}

async function getRoute(request: Request): Promise<RouteConfig | null> {
  const url = Url.fromRequest(request)
  const cookies = request.headers.get('Cookie')

  if (!isInstance(url.subdomain)) return null

  const routeConfig = vercelFrontendProxy.getRoute(request)

  if (routeConfig?.__typename === 'Frontend' && !routeConfig.definite) {
    if (getCookieValue('useFrontend', cookies) === 'always') {
      return routeConfig
    }

    if (request.headers.get('X-From') === 'legacy-serlo.org') {
      return {
        __typename: 'Legacy',
      }
    }

    if (
      (await url.isUuid()) ||
      url.pathname === '/' ||
      [
        '/search',
        '/spenden',
        '/subscriptions/manage',
        '/entity/unrevised',
        '/entity/create/',
        '/page/create',
        '/user/settings',
        '/discussions',
        '/backend',
        '/uuid/recycle-bin',
        '/pages',
        '/mathe',
        '/biologie',
        '/nachhaltigkeit',
        '/informatik',
        '/chemie',
        '/lerntipps',
        '/authorization/roles',
      ].includes(url.pathnameWithoutTrailingSlash) ||
      url.pathname.startsWith('/license/detail') ||
      (url.subdomain === 'de' && url.pathname.startsWith('/jobs')) ||
      url.pathname.startsWith('/entity/repository/history') ||
      url.pathname.startsWith('/entity/repository/add-revision/') ||
      url.pathname.startsWith('/entity/taxonomy/update/') ||
      url.pathname.startsWith('/entity/link/order/') ||
      url.pathname.startsWith('/entity/license/update/') ||
      url.pathname.startsWith('/taxonomy/term/move/batch/') ||
      url.pathname.startsWith('/taxonomy/term/copy/batch/') ||
      url.pathname.startsWith('/taxonomy/term/sort/entities/') ||
      url.pathname.startsWith('/event/history') ||
      url.pathname.startsWith('/error/deleted')
    ) {
      return {
        __typename: 'AB',
        probability: Number(global.FRONTEND_PROBABILITY),
      }
    }

    return null
  } else {
    return routeConfig
  }
}

function createConfigurationResponse(message: string, useFrontend: number) {
  const response = new Response(message)

  setCookieUseFrontend(response, useFrontend)
  response.headers.set('Refresh', '1; url=/')

  return response
}

function setCookieUseFrontend(res: Response, useFrontend: number) {
  res.headers.append(
    'Set-Cookie',
    `useFrontend=${useFrontend}; path=/; domain=.${global.DOMAIN}`
  )
}

type RouteConfig = vercelFrontendProxy.RouteConfig | ABRoute

interface ABRoute {
  __typename: 'AB'
  probability: number
}
