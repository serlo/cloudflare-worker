/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2013-2020 Serlo Education e.V.
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
 * @copyright Copyright (c) 2013-2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link     https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import { edtrIoStats } from './are-we-edtr-io-yet'
import { maintenanceMode } from './maintenance'
import { handleRequest as staticPages } from './static-pages'
import { getPathnameWithoutTrailingSlash, getSubdomain } from './url-utils'

addEventListener('fetch', (event: Event) => {
  const e = event as FetchEvent
  e.respondWith(handleRequest(e.request))
})

export async function handleRequest(request: Request) {
  return (
    (await edtrIoStats(request)) ||
    (await maintenanceMode(request)) ||
    (await enforceHttps(request)) ||
    (await redirects(request)) ||
    (await staticPages(request)) ||
    (await semanticFileNames(request)) ||
    (await packages(request)) ||
    (await fetch(request))
  )
}

async function enforceHttps(request: Request) {
  if (getSubdomain(request.url) === 'pacts') return null
  const url = new URL(request.url)
  if (url.protocol !== 'http:') return null
  url.protocol = 'https:'
  return Response.redirect(url.href)
}

async function redirects(request: Request) {
  if (getSubdomain(request.url) === 'start') {
    return Response.redirect(
      'https://docs.google.com/document/d/1qsgkXWNwC-mcgroyfqrQPkZyYqn7m1aimw2gwtDTmpM/',
      301
    )
  }

  if (
    getSubdomain(request.url) === 'de' &&
    getPathnameWithoutTrailingSlash(request.url) === '/labschool'
  ) {
    const url = new URL(request.url)
    url.host = url.host.replace('de.', 'labschool.')
    url.pathname = '/'
    return Response.redirect(url.href, 301)
  }

  if (
    getSubdomain(request.url) === 'de' &&
    getPathnameWithoutTrailingSlash(request.url) === '/hochschule'
  ) {
    const url = new URL(request.url)
    url.pathname = '/mathe/universitaet/44323'
    return Response.redirect(url.href, 301)
  }

  if (
    getSubdomain(request.url) === 'de' &&
    getPathnameWithoutTrailingSlash(request.url) === '/beitreten'
  ) {
    return Response.redirect(
      'https://docs.google.com/forms/d/e/1FAIpQLSdEoyCcDVP_G_-G_u642S768e_sxz6wO6rJ3tad4Hb9z7Slwg/viewform',
      301
    )
  }

  if (getSubdomain(request.url) === 'www') {
    const url = new URL(request.url)
    url.host = url.host.replace('www.', 'de.')
    return Response.redirect(url.href)
  }

  if (getSubdomain(request.url) === null) {
    const url = new URL(request.url)
    url.host = `de.${url.host}`
    return Response.redirect(url.href)
  }
}

async function semanticFileNames(request: Request) {
  if (getSubdomain(request.url) !== 'assets') return null

  const url = new URL(request.url)
  url.host = 'assets.serlo.org'

  if (url.pathname.startsWith('/meta')) return fetch(url.href, request)
  const re = /^\/(legacy\/|)((?!legacy)\w+)\/([\w\-+]+)\.(\w+)$/
  const match = url.pathname.match(re)

  if (!match) return fetch(url.href, request)

  const prefix = match[1]
  const hash = match[2]
  const extension = match[4]

  url.pathname = `${prefix}${hash}.${extension}`
  return fetch(url.href, request)
}

async function packages(request: Request) {
  if (getSubdomain(request.url) !== 'packages') return null

  const url = new URL(request.url)
  url.host = 'packages.serlo.org'

  const re = /([^\/]+)\//
  const match = url.pathname.match(re)

  if (!match) return fetch(url.href, request)

  const pkg = match[1]

  const resolvedPackage = await PACKAGES_KV.get(pkg)
  if (!resolvedPackage) return fetch(url.href, request)

  url.pathname = url.pathname.replace(`/${pkg}/`, `/${resolvedPackage}/`)
  let response = await fetch(new Request(url.href, request))
  response = new Response(response.body, response)
  response.headers.set('x-package', resolvedPackage)
  return response
}
