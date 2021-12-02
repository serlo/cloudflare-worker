/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021 Serlo Education e.V.
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
 * @copyright Copyright (c) 2021 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
import {
  Url,
  getCookieValue,
  isInstance,
  getPathInfo,
  SentryReporter,
  SentryFactory,
} from './utils'

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

  if (route === null) return null

  if (route.__typename === 'BeforeRedirectsRoute') {
    return fetchBackend({ request, sentry, route: route.route })
  }

  return null
}

export async function frontendProxy(
  request: Request,
  sentryFactory: SentryFactory
): Promise<Response | null> {
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

    const response = await fetchBackend({
      request,
      sentry,
      route: {
        __typename:
          useFrontendNumber <= route.probability ? 'Frontend' : 'Legacy',
        appendSubdomainToPath: true,
        redirect: 'follow',
      },
    })
    if (Number.isNaN(cookieValue))
      setCookieUseFrontend(response, useFrontendNumber)

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
  route: LegacyRoute | FrontendRoute
}) {
  const backendUrl = Url.fromRequest(request)

  if (route.__typename === 'Frontend') {
    if (route.appendSubdomainToPath === true)
      backendUrl.pathname = `/${backendUrl.subdomain}${backendUrl.pathname}`

    const cookies = request.headers.get('Cookie')
    const frontendDomain =
      getCookieValue('frontendDomain', cookies) ?? global.FRONTEND_DOMAIN
    backendUrl.hostname = frontendDomain

    backendUrl.pathname = backendUrl.pathnameWithoutTrailingSlash
  }

  const response = await fetch(new Request(backendUrl.toString(), request), {
    redirect: route.__typename === 'Frontend' ? route.redirect : 'manual',
  })

  if (route.__typename === 'Frontend' && response.redirected) {
    sentry.setContext('backendUrl', backendUrl)
    sentry.setContext('responseUrl', response.url)
    sentry.captureMessage('Frontend responded with a redirect', 'error')
  }
  return new Response(response.body, response)
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

interface ABRoute {
  __typename: 'AB'
  probability: number
}

interface FrontendRoute {
  __typename: 'Frontend'
  redirect: 'manual' | 'follow'
  appendSubdomainToPath: boolean
}

interface LegacyRoute {
  __typename: 'Legacy'
}

interface BeforeRedirectsRoute {
  __typename: 'BeforeRedirectsRoute'
  route: LegacyRoute | FrontendRoute
}

type RouteConfig = LegacyRoute | FrontendRoute | ABRoute | BeforeRedirectsRoute

async function getRoute(request: Request): Promise<RouteConfig | null> {
  const url = Url.fromRequest(request)
  const cookies = request.headers.get('Cookie')

  if (!isInstance(url.subdomain)) return null

  if (url.pathname.startsWith('/api/auth/')) {
    return {
      __typename: 'BeforeRedirectsRoute',
      route: {
        __typename: 'Frontend',
        redirect: 'manual',
        appendSubdomainToPath: false,
      },
    }
  }

  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/_assets/') ||
    url.pathname.startsWith('/api/frontend/') ||
    url.pathname.startsWith('/___')
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

  if (url.pathname == '/user/notifications' || url.pathname == '/consent') {
    return {
      __typename: 'BeforeRedirectsRoute',
      route: {
        __typename: 'Frontend',
        redirect: 'follow',
        appendSubdomainToPath: true,
      },
    }
  }

  if (
    url.pathname.startsWith('/auth/activate/') ||
    url.pathname.startsWith('/auth/password/restore/') ||
    [
      '/auth/login',
      '/auth/logout',
      '/auth/password/change',
      '/auth/hydra/login',
      '/auth/hydra/consent',
      '/user/register',
    ].includes(url.pathname)
  ) {
    return {
      __typename: 'BeforeRedirectsRoute',
      route: {
        __typename: 'Legacy',
      },
    }
  }

  if (getCookieValue('useFrontend', cookies) === 'always') {
    return {
      __typename: 'Frontend',
      redirect: 'follow',
      appendSubdomainToPath: true,
    }
  }

  if (
    url.hasContentApiParameters() ||
    request.headers.get('X-From') === 'legacy-serlo.org'
  ) {
    return {
      __typename: 'Legacy',
    }
  }

  if (url.isFrontendSupportedAndProbablyUuid() && isInstance(url.subdomain)) {
    const pathInfo = await getPathInfo(url.subdomain, url.pathname)
    const typename = pathInfo?.typename ?? null

    if (typename === null || typename === 'Comment') return null
  }

  return {
    __typename: 'AB',
    probability: Number(global.FRONTEND_PROBABILITY),
  }
}
