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
import { api } from './api'
import { edtrIoStats } from './are-we-edtr-io-yet'
import { authFrontendSectorIdentifierUriValidation } from './auth'
import { frontendProxy } from './frontend-proxy'
import { maintenanceMode } from './maintenance'
import { staticPages } from './static-pages'
import {
  getPathnameWithoutTrailingSlash,
  getSubdomain,
  getPathname,
} from './url-utils'
import { getPathInfo, isInstance } from './utils'

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
    (await redirects(request)) ||
    (await staticPages(request)) ||
    (await semanticFileNames(request)) ||
    (await packages(request)) ||
    (await api(request)) ||
    (await frontendProxy(request)) ||
    (await fetch(request))
  )
}

// eslint-disable-next-line @typescript-eslint/require-await
async function enforceHttps(request: Request) {
  if (getSubdomain(request.url) === 'pacts') return null
  const url = new URL(request.url)
  if (url.protocol !== 'http:') return null
  url.protocol = 'https:'
  return Response.redirect(url.href)
}

async function redirects(request: Request) {
  const subdomain = getSubdomain(request.url)
  const path = getPathname(request.url)
  const pathWithoutSlash = getPathnameWithoutTrailingSlash(request.url)

  if (subdomain === 'start') {
    return Response.redirect(
      'https://docs.google.com/document/d/1qsgkXWNwC-mcgroyfqrQPkZyYqn7m1aimw2gwtDTmpM/',
      301
    )
  }

  if (subdomain === 'de' && pathWithoutSlash === '/labschool') {
    const url = new URL(request.url)

    url.host = url.host.replace('de.', 'labschool.')
    url.pathname = '/'

    return Response.redirect(url.href, 301)
  }

  if (subdomain === 'de' && pathWithoutSlash === '/hochschule') {
    const url = new URL(request.url)

    url.pathname = '/mathe/universitaet/44323'

    return Response.redirect(url.href, 301)
  }

  if (subdomain === 'de' && pathWithoutSlash === '/beitreten') {
    return Response.redirect(
      'https://docs.google.com/forms/d/e/1FAIpQLSdEoyCcDVP_G_-G_u642S768e_sxz6wO6rJ3tad4Hb9z7Slwg/viewform',
      301
    )
  }

  if (subdomain === 'www') {
    const url = new URL(request.url)

    url.host = url.host.replace('www.', 'de.')

    return Response.redirect(url.href)
  }

  if (subdomain === null) {
    const url = new URL(request.url)

    url.host = `de.${url.host}`

    return Response.redirect(url.href)
  }

  if (isInstance(subdomain)) {
    const pathInfo = await getPathInfo(subdomain, path)

    // TODO: Remove decodeURIComponent() when we the API returns an
    // URL encoded alias
    if (
      request.headers.get('X-Requested-With') !== 'XMLHttpRequest' &&
      pathInfo !== null &&
      decodeURIComponent(path) != decodeURIComponent(pathInfo.currentPath)
    ) {
      const url = new URL(request.url)

      url.pathname = pathInfo.currentPath

      return Response.redirect(url.href, 301)
    }
  }
}

async function semanticFileNames(request: Request) {
  if (getSubdomain(request.url) !== 'assets') return null

  const url = new URL(request.url)
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
  if (getSubdomain(request.url) !== 'packages') return null

  const url = new URL(request.url)
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
