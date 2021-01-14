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
import { api } from './api'
import { edtrIoStats } from './are-we-edtr-io-yet'
import { authFrontendSectorIdentifierUriValidation } from './auth'
import { embed } from './embed'
import { frontendProxy, frontendSpecialPaths } from './frontend-proxy'
import { maintenanceMode } from './maintenance'
import { redirects } from './redirects'
import { staticPages } from './static-pages'
import { Url } from './utils'

addEventListener('fetch', (event: Event) => {
  const e = event as FetchEvent
  e.respondWith(handleRequest(e.request))
})

export async function handleRequest(request: Request) {
  return (
    authFrontendSectorIdentifierUriValidation(request) ||
    (await edtrIoStats(request)) ||
    (await maintenanceMode(request)) ||
    (await enforceHttps(request)) ||
    (await staticPages(request)) ||
    (await frontendSpecialPaths(request)) ||
    (await redirects(request)) ||
    (await embed(request)) ||
    (await semanticFileNames(request)) ||
    (await packages(request)) ||
    (await api(request)) ||
    (await frontendProxy(request)) ||
    (await fetch(request))
  )
}

async function enforceHttps(request: Request) {
  const url = Url.fromRequest(request)
  if (url.subdomain === 'pacts') return null
  if (url.protocol !== 'http:') return null
  url.protocol = 'https:'
  return Promise.resolve(url.toRedirect())
}

async function semanticFileNames(request: Request) {
  const url = Url.fromRequest(request)

  if (url.subdomain !== 'assets') return null

  url.host = 'assets.serlo.org'

  const re = /^\/(legacy\/|)((?!legacy)\w+)\/([\w\-+]+)\.(\w+)$/
  const match = re.exec(url.pathname)

  if (!url.pathname.startsWith('/meta') && match) {
    const prefix = match[1]
    const hash = match[2]
    const extension = match[4]

    url.pathname = `${prefix}${hash}.${extension}`
  }
  return await fetch(url.href, request)
}

async function packages(request: Request) {
  const url = Url.fromRequest(request)

  if (url.subdomain !== 'packages') return null

  url.host = 'packages.serlo.org'

  const re = /([^/]+)\//
  const match = re.exec(url.pathname)

  if (!match) return fetch(url.href, request)

  const pkg = match[1]

  const resolvedPackage = await global.PACKAGES_KV.get(pkg)
  if (!resolvedPackage) return fetch(url.href, request)

  url.pathname = url.pathname.replace(`/${pkg}/`, `/${resolvedPackage}/`)
  let response = await fetch(new Request(url.href, request))
  response = new Response(response.body, response)
  response.headers.set('x-package', resolvedPackage)
  return response
}
