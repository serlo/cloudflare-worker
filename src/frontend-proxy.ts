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
import {
  getCookieValue,
  isInstance,
  SentryFactory,
  SentryReporter,
  Url,
} from './utils'
import * as vercelFrontendProxy from './utils/vercel-frontend-proxy'

const useLegacyCookieName = 'useLegacyFrontend'

export async function frontendSpecialPaths(
  request: Request,
  sentryFactory: SentryFactory
): Promise<Response | null> {
  const url = Url.fromRequest(request)
  const route = getRoute(request)
  const sentry = sentryFactory.createReporter('frontend-special-paths')

  if (url.pathname === '/disable-frontend')
    return createConfigurationResponse('Disabled: Now using legacy frontend', 1)

  if (url.pathname === '/enable-frontend')
    return createConfigurationResponse(
      'Enabled: Now using new frontend again',
      0
    )

  return route !== null && route.__typename === 'BeforeRedirectsRoute'
    ? fetchBackend({ request, sentry, route: route.route })
    : null
}

export async function frontendProxy(
  request: Request,
  sentryFactory: SentryFactory
): Promise<Response | null> {
  const sentry = sentryFactory.createReporter('frontend')
  const route = getRoute(request)
  if (route === null || route.__typename === 'BeforeRedirectsRoute') {
    return null
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

function getRoute(request: Request): RouteConfig | null {
  const url = Url.fromRequest(request)
  const cookies = request.headers.get('Cookie')

  if (!isInstance(url.subdomain)) return null

  const routeConfig = vercelFrontendProxy.getRoute(request)

  if (routeConfig?.__typename === 'Frontend' && !routeConfig.definite) {
    if (
      url.hasContentApiParameters() ||
      request.headers.get('X-From') === 'legacy-serlo.org' ||
      getCookieValue(useLegacyCookieName, cookies) === '1'
    ) {
      return {
        __typename: 'Legacy',
      }
    }

    // if (
    //   (await url.isUuid()) ||
    //   url.pathname === '/' ||
    //   [
    //     '/search',
    //     '/spenden',
    //     '/subscriptions/manage',
    //     '/entity/unrevised',
    //     '/user/settings',
    //     '/mathe',
    //     '/biologie',
    //     '/nachhaltigkeit',
    //     '/informatik',
    //     '/chemie',
    //     '/lerntipps',
    //   ].includes(url.pathnameWithoutTrailingSlash) ||
    //   url.pathname.startsWith('/license/detail') ||
    //   url.pathname.startsWith('/entity/repository/history') ||
    //   url.pathname.startsWith('/entity/repository/add-revision/') ||
    //   url.pathname.startsWith('/event/history')
    // ) {
    //   return {
    //     __typename: 'AB',
    //     probability: 1,
    //   }
    // }

    return routeConfig
  } else {
    return routeConfig
  }
}

function createConfigurationResponse(message: string, useLegacyNumber: number) {
  const response = new Response(message)

  setCookieUseLegacyFrontend(response, useLegacyNumber)
  response.headers.set('Refresh', '1; url=/')

  return response
}

function setCookieUseLegacyFrontend(res: Response, useLegacyNumber: number) {
  res.headers.append(
    'Set-Cookie',
    `${useLegacyCookieName}=${useLegacyNumber}; path=/; domain=.${
      global.DOMAIN
    } ${useLegacyNumber === 0 ? '; expires=Thu, 01 Jan 1970 00:00:00 GMT' : ''}`
  )
}

type RouteConfig = vercelFrontendProxy.RouteConfig
