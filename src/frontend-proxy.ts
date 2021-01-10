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
import { Url, getCookieValue, isInstance, Instance, getPathInfo } from './utils'

export async function frontendSpecialPaths(
  request: Request
): Promise<Response | null> {
  const config = getConfig(request)
  const url = Url.fromRequest(request)

  if (!config.relevantRequest) return null

  if (url.pathname === '/enable-frontend')
    return createConfigurationResponse('Enabled: Use of new frontend', 0)

  if (url.pathname === '/disable-frontend')
    return createConfigurationResponse('Disabled: Use of new frontend', 1)

  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/_assets/') ||
    url.pathname.startsWith('/api/auth/') ||
    url.pathname.startsWith('/api/frontend/')
  )
    return await fetchBackend({ ...config, useFrontend: true, request })

  if (url.pathname == '/user/notifications')
    return await fetchBackend({
      ...config,
      useFrontend: true,
      request,
      pathPrefix: config.instance,
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
    return await fetchBackend({ ...config, useFrontend: false, request })

  return null
}

export async function frontendProxy(
  request: Request
): Promise<Response | null> {
  const config = getConfig(request)
  const url = Url.fromRequest(request)
  const cookies = request.headers.get('Cookie')

  if (!config.relevantRequest) return null

  if (
    url.hasContentApiParameters() ||
    (global.REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND === 'true' &&
      getCookieValue('authenticated', cookies) === '1')
  )
    return await fetchBackend({ ...config, useFrontend: false, request })

  if (url.isFrontendSupportedAndProbablyUuid()) {
    const pathInfo = await getPathInfo(config.instance, url.pathname)
    const typename = pathInfo?.typename ?? null

    if (typename === null || !config.allowedTypes.includes(typename))
      return null
  }

  if (
    global.REDIRECT_MOBILE_USERS_TO_FRONTEND === 'true' &&
    (request.headers.get('user-agent') ?? '').indexOf('Mobi') > -1
  )
    return await fetchBackend({
      ...config,
      useFrontend: true,
      pathPrefix: config.instance,
      request,
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
}: {
  pathPrefix?: Instance
  request: Request
  useFrontend: boolean
} & RelevantRequestConfig) {
  const backendUrl = Url.fromRequest(request)

  if (useFrontend) {
    backendUrl.hostname = frontendDomain

    if (pathPrefix !== undefined)
      backendUrl.pathname = `/${pathPrefix}${backendUrl.pathname}`

    backendUrl.pathname = backendUrl.pathnameWithoutTrailingSlash
  }

  const response = await fetch(new Request(backendUrl.toString(), request))

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
  probability: number
  frontendDomain: string
}

interface IrrelevantRequestConfig {
  relevantRequest: false
}
