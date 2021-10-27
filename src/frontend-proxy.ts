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
  Instance,
  getPathInfo,
  SentryReporter,
  SentryFactory,
} from './utils'

export async function frontendSpecialPaths(
  request: Request,
  sentryFactory: SentryFactory
): Promise<Response | null> {
  const config = getConfig(request)
  const url = Url.fromRequest(request)

  const sentry = sentryFactory.createReporter('frontend-special-paths')

  if (!config.relevantRequest) return null

  if (url.pathname === '/enable-frontend')
    return createConfigurationResponse('Enabled: Use of new frontend', 0)

  if (url.pathname === '/disable-frontend')
    return createConfigurationResponse('Disabled: Use of new frontend', 1.1)

  if (url.pathname.startsWith('/api/auth/'))
    return await fetchBackend({
      ...config,
      useFrontend: true,
      request,
      redirect: 'manual',
      sentry,
    })

  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/_assets/') ||
    url.pathname.startsWith('/api/frontend/') ||
    url.pathname.startsWith('/___')
  )
    return await fetchBackend({ ...config, useFrontend: true, request, sentry })

  if (url.pathname == '/user/notifications' || url.pathname == '/consent')
    return await fetchBackend({
      ...config,
      useFrontend: true,
      request,
      pathPrefix: config.instance,
      sentry,
    })

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
  )
    return await fetchBackend({
      ...config,
      useFrontend: false,
      request,
      sentry,
    })

  return null
}

export async function frontendProxy(
  request: Request,
  sentryFactory: SentryFactory
): Promise<Response | null> {
  const config = getConfig(request)
  const url = Url.fromRequest(request)
  const cookies = request.headers.get('Cookie')
  const sentry = sentryFactory.createReporter('frontend')

  if (!config.relevantRequest) return null

  if (url.isFrontendSupportedAndProbablyUuid()) {
    const pathInfo = await getPathInfo(config.instance, url.pathname)
    const typename = pathInfo?.typename ?? null

    if (typename === null || !config.allowedTypes.includes(typename))
      return null
  }

  if (getCookieValue('useFrontend', cookies) === 'always')
    return await fetchBackend({
      ...config,
      useFrontend: true,
      pathPrefix: config.instance,
      request,
      sentry,
    })

  if (
    url.hasContentApiParameters() ||
    request.headers.get('X-From') === 'legacy-serlo.org'
  )
    return await fetchBackend({
      ...config,
      useFrontend: false,
      request,
      sentry,
    })

  const cookieValue = Number(getCookieValue('useFrontend', cookies) ?? 'NaN')
  const useFrontendNumber = Number.isNaN(cookieValue)
    ? Math.random()
    : cookieValue

  const response = await fetchBackend({
    ...config,
    useFrontend: useFrontendNumber <= config.probability,
    pathPrefix: config.instance,
    request,
    sentry,
  })
  if (Number.isNaN(cookieValue))
    setCookieUseFrontend(response, useFrontendNumber)

  return response
}

async function fetchBackend({
  frontendDomain,
  pathPrefix,
  request,
  useFrontend,
  redirect,
  sentry,
}: {
  pathPrefix?: Instance
  request: Request
  useFrontend: boolean
  redirect?: Request['redirect']
  sentry: SentryReporter
} & RelevantRequestConfig) {
  const backendUrl = Url.fromRequest(request)

  if (useFrontend) {
    backendUrl.hostname = frontendDomain

    if (pathPrefix !== undefined)
      backendUrl.pathname = `/${pathPrefix}${backendUrl.pathname}`

    backendUrl.pathname = backendUrl.pathnameWithoutTrailingSlash
  }
  const response = await fetch(new Request(backendUrl.toString(), request), {
    redirect: redirect ?? (useFrontend ? 'follow' : 'manual'),
  })

  if (useFrontend && response.redirected) {
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

function getConfig(request: Request): Config {
  const url = Url.fromRequest(request)
  const cookies = request.headers.get('Cookie')

  if (!isInstance(url.subdomain)) return { relevantRequest: false }

  return {
    relevantRequest: true,
    allowedTypes: JSON.parse(global.FRONTEND_ALLOWED_TYPES) as string[],
    frontendDomain:
      getCookieValue('frontendDomain', cookies) ?? global.FRONTEND_DOMAIN,
    instance: url.subdomain,
    probability: Number(global.FRONTEND_PROBABILITY),
  }
}

type Config = RelevantRequestConfig | IrrelevantRequestConfig

interface RelevantRequestConfig {
  relevantRequest: true
  instance: Instance
  allowedTypes: string[]
  frontendDomain: string
  probability: number
}

interface IrrelevantRequestConfig {
  relevantRequest: false
}
