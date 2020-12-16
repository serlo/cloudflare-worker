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
import { embed } from './embed'
import { frontendProxy, frontendSpecialPaths } from './frontend-proxy'
import { maintenanceMode } from './maintenance'
import { staticPages } from './static-pages'
import {
  Url,
  getPathInfo,
  isInstance,
  Instance,
  createNotFoundResponse,
} from './utils'

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
    (await frontendSpecialPaths(request)) ||
    (await redirects(request)) ||
    (await embed(request)) ||
    (await staticPages(request)) ||
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

async function redirects(request: Request) {
  const url = Url.fromRequest(request)

  if (url.subdomain === 'start') {
    return Response.redirect(
      'https://docs.google.com/document/d/1qsgkXWNwC-mcgroyfqrQPkZyYqn7m1aimw2gwtDTmpM/',
      301
    )
  }

  if (url.subdomain === 'meet') {
    switch (url.pathname) {
      case '/':
        return Response.redirect('https://meet.google.com/vtk-ncrc-rdp')
      case '/dev':
        return Response.redirect('https://meet.google.com/rci-pize-jow')
      case '/einbindung':
        return Response.redirect('https://meet.google.com/qzv-ojgk-xqw')
      case '/begleitung':
        return Response.redirect('https://meet.google.com/kon-wdmt-yhb')
      case '/reviewing':
        return Response.redirect('https://meet.google.com/kon-wdmt-yhb')
      case '/labschool':
        return Response.redirect('https://meet.google.com/cvd-pame-zod')
      default:
        return createNotFoundResponse()
    }
  }

  if (
    url.subdomain === Instance.De &&
    url.pathnameWithoutTrailingSlash === '/labschool'
  ) {
    url.subdomain = 'labschool'
    url.pathname = '/'
    return url.toRedirect(301)
  }

  if (
    url.subdomain === Instance.De &&
    url.pathnameWithoutTrailingSlash === '/hochschule'
  ) {
    url.pathname = '/mathe/universitaet/44323'
    return url.toRedirect(301)
  }

  if (
    url.subdomain === Instance.De &&
    url.pathnameWithoutTrailingSlash === '/beitreten'
  ) {
    return Response.redirect(
      'https://docs.google.com/forms/d/e/1FAIpQLSdEoyCcDVP_G_-G_u642S768e_sxz6wO6rJ3tad4Hb9z7Slwg/viewform',
      301
    )
  }

  if (url.subdomain === 'www' || url.subdomain === '') {
    url.subdomain = 'de'
    return url.toRedirect()
  }

  if (
    isInstance(url.subdomain) &&
    url.isProbablyUuid() &&
    request.headers.get('X-Requested-With') !== 'XMLHttpRequest'
  ) {
    const pathInfo = await getPathInfo(url.subdomain, url.pathname)

    if (pathInfo !== null) {
      const newUrl = new Url(url.href)
      const { currentPath, instance } = pathInfo

      if (instance && url.subdomain !== instance) newUrl.subdomain = instance
      if (url.pathname !== currentPath) newUrl.pathname = currentPath

      if (newUrl.href !== url.href) return newUrl.toRedirect(301)
    }
  }
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
