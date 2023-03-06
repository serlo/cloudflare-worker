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
  Instance,
} from './utils'

export async function frontendSpecialPaths(
  request: Request,
  sentryFactory: SentryFactory
): Promise<Response | null> {
  const url = Url.fromRequest(request)
  const route = getRoute(request)
  const sentry = sentryFactory.createReporter('frontend-special-paths')

  if (url.pathname === '/enable-frontend')
    return createConfigurationResponse({
      message: 'Enabled: Use of new frontend',
      useLegacyFrontend: false,
    })

  if (url.pathname === '/disable-frontend')
    return createConfigurationResponse({
      message: 'Disabled: Use of new frontend',
      useLegacyFrontend: true,
    })

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

  return route !== null && route.__typename !== 'BeforeRedirectsRoute'
    ? fetchBackend({ request, sentry, route })
    : null
}

async function fetchBackend({
  request,
  sentry,
  route,
}: {
  request: Request
  sentry: SentryReporter
  route: LegacyRoute | FrontendRoute
}) {
  const backendUrl = Url.fromRequest(request)

  if (route.__typename === 'Frontend') {
    if (backendUrl.hasContentApiParameters()) {
      backendUrl.pathname = '/content-only' + backendUrl.pathname
    }

    if (route.appendSubdomainToPath) {
      backendUrl.pathname = `/${backendUrl.subdomain}${backendUrl.pathname}`
    }

    backendUrl.hostname = global.FRONTEND_DOMAIN
    backendUrl.pathname = backendUrl.pathnameWithoutTrailingSlash
  }

  const response = await fetch(new Request(backendUrl.toString(), request), {
    redirect: route.__typename === 'Frontend' ? route.redirect : 'manual',
  })

  if (sentry) {
    if (route.__typename === 'Frontend' && response.redirected) {
      sentry.setContext('backendUrl', backendUrl)
      sentry.setContext('responseUrl', response.url)
      sentry.captureMessage('Frontend responded with a redirect', 'error')
    }

    if (isLegacyRequestToBeReported()) {
      sentry.setContext('legacyUrl', backendUrl)
      sentry.setContext('method', request.method)
      sentry.setContext(
        'useLegacyFrontend',
        getCookieValue('useLegacyFrontend', request.headers.get('Cookie'))
      )
      sentry.captureMessage('Request to legacy system registered', 'info')
    }
  }

  return new Response(response.body, response)

  function isLegacyRequestToBeReported() {
    if (route.__typename != 'Legacy') return false
    if (
      request.method === 'GET' &&
      response.headers.get('Content-type') === 'text/html'
    )
      return true
    if (request.method === 'POST') return true

    return false
  }
}

function getRoute(request: Request): RouteConfig | null {
  const url = Url.fromRequest(request)
  const cookies = request.headers.get('Cookie')

  if (!isInstance(url.subdomain)) return null

  if (getCookieValue('useLegacyFrontend', cookies) === 'true') {
    return { __typename: 'Legacy' }
  }

  if (
    url.pathname.startsWith('/api/auth/') ||
    url.pathname.startsWith('/api/oauth/') ||
    url.pathname.startsWith('/api/.ory/')
  ) {
    return {
      __typename: 'BeforeRedirectsRoute',
      route: {
        __typename: 'Frontend',
        redirect: 'manual',
        appendSubdomainToPath: false,
      },
    }
  }

  const subjectStartPages: { [I in Instance]?: string[] } = {
    de: [
      '/biologie',
      '/chemie',
      '/lerntipps',
      '/mathe',
      '/nachhaltigkeit',
      '/informatik',
    ],
  }

  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/_assets/') ||
    url.pathname.startsWith('/api/frontend/') ||
    url.pathname.startsWith('/___') ||
    url.pathname === '/user/notifications' ||
    url.pathname === '/consent' ||
    url.pathname === '/editor' ||
    (subjectStartPages[url.subdomain] &&
      subjectStartPages[url.subdomain]?.includes(
        url.pathnameWithoutTrailingSlash
      ))
  ) {
    return {
      __typename: 'BeforeRedirectsRoute',
      route: {
        __typename: 'Frontend',
        redirect: 'follow',
        appendSubdomainToPath: false,
      },
    }
  }

  if (
    url.pathname.startsWith('/entity/api/rss/') ||
    url.pathname.startsWith('/entity/api/json/')
  )
    return null

  if (
    request.headers.get('X-From') === 'legacy-serlo.org' ||
    url.pathname.startsWith('/taxonomy/term/organize/') ||
    url.pathname.startsWith('/notification/') ||
    url.pathname.startsWith('/entity/repository/add-revision-old/') ||
    (url.pathname.startsWith('/entity/repository/add-revision/') &&
      (request.method === 'POST' ||
        getCookieValue('useLegacyEditor', cookies) === '1'))
  ) {
    return {
      __typename: 'BeforeRedirectsRoute',
      route: {
        __typename: 'Legacy',
      },
    }
  }

  return {
    __typename: 'Frontend',
    redirect: 'follow',
    appendSubdomainToPath: true,
  }
}

function createConfigurationResponse({
  message,
  useLegacyFrontend,
}: {
  message: string
  useLegacyFrontend: boolean
}) {
  const response = new Response(message)

  response.headers.append(
    'Set-Cookie',
    `useLegacyFrontend=${useLegacyFrontend.toString()}; path=/; domain=.${
      global.DOMAIN
    }`
  )
  response.headers.set('Refresh', '1; url=/')

  return response
}

type RouteConfig = LegacyRoute | FrontendRoute | BeforeRedirectsRoute

interface BeforeRedirectsRoute {
  __typename: 'BeforeRedirectsRoute'
  route: LegacyRoute | FrontendRoute
}

interface FrontendRoute {
  __typename: 'Frontend'
  redirect: 'manual' | 'follow'
  appendSubdomainToPath: boolean
}

interface LegacyRoute {
  __typename: 'Legacy'
}
