/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2022 Serlo Education e.V.
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
import { Url } from '../utils'
import * as vercelFrontendProxy from '../utils/vercel-frontend-proxy'

const LENABI_PROXY_SUBDOMAIN = 'lenabi'
const LENABI_DOMAIN = `lenabi-vercel.${global.DOMAIN}`

export async function lenabiSpecialPaths(
  request: Request
): Promise<Response | null> {
  const url = Url.fromRequest(request)
  if (url.subdomain !== LENABI_PROXY_SUBDOMAIN) return null

  const route = vercelFrontendProxy.getRoute(request)

  if (route?.__typename === 'Frontend' && route.appendSubdomainToPath) {
    route.appendSubdomainToPath = false
  }

  return route !== null && route.__typename === 'BeforeRedirectsRoute'
    ? vercelFrontendProxy.fetchBackend({
        request,
        domain: LENABI_DOMAIN,
        route: route.route,
      })
    : null
}

export async function lenabiProxy(request: Request) {
  const url = Url.fromRequest(request)

  if (url.subdomain !== LENABI_PROXY_SUBDOMAIN) return null

  const route = vercelFrontendProxy.getRoute(request)

  if (route?.__typename === 'Frontend' && route.appendSubdomainToPath) {
    route.appendSubdomainToPath = false
  }

  return route === null || route.__typename === 'BeforeRedirectsRoute'
    ? null
    : vercelFrontendProxy.fetchBackend({
        request,
        domain: LENABI_DOMAIN,
        route,
      })
}
