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
import { robotsProduction } from '../__fixtures__/robots'
import { api } from './api'
import { edtrIoStats } from './are-we-edtr-io-yet'
import { auth } from './auth'
import { embed } from './embed'
import { frontendProxy, frontendSpecialPaths } from './frontend-proxy'
import { legalPages } from './legal-pages'
import { maintenanceMode } from './maintenance'
import { metadataApi } from './metadata-api'
import { pdfProxy } from './pdf-proxy'
import { quickbarProxy } from './quickbar-proxy'
import { redirects } from './redirects'
import { SentryFactory, Url } from './utils'

if (typeof addEventListener === 'function') {
  addEventListener('fetch', (event: Event) => {
    const e = event as FetchEvent

    e.respondWith(handleFetchEvent(e))
  })
}

export async function handleFetchEvent(event: FetchEvent): Promise<Response> {
  const { request } = event
  const sentryFactory = new SentryFactory(event)

  try {
    return (
      auth(request) ||
      (await edtrIoStats(request)) ||
      (await maintenanceMode(request)) ||
      (await enforceHttps(request)) ||
      (await legalPages(request)) ||
      (await quickbarProxy(request, sentryFactory)) ||
      (await pdfProxy(request, sentryFactory)) ||
      robotsTxt(request) ||
      (await frontendSpecialPaths(request, sentryFactory)) ||
      sentryHelloWorld(request, sentryFactory) ||
      (await redirects(request)) ||
      (await embed(request, sentryFactory)) ||
      (await semanticFileNames(request)) ||
      (await packages(request)) ||
      (await api(request)) ||
      (await frontendProxy(request, sentryFactory)) ||
      (await metadataApi(request, sentryFactory)) ||
      (await fetch(request))
    )
  } catch (e) {
    sentryFactory.createReporter('handle-fetch-event').captureException(e)
    throw e
  }
}

function sentryHelloWorld(request: Request, sentryFactory: SentryFactory) {
  const url = Url.fromRequest(request)

  if (url.subdomain !== '') return null
  if (url.pathname !== '/sentry-report-hello-world') return null

  const sentry = sentryFactory.createReporter('sentry-hello-world')
  sentry.captureMessage('Hello World!', 'info')

  return new Response('Hello-World message send to sentry')
}

async function enforceHttps(request: Request) {
  const url = Url.fromRequest(request)
  if (url.subdomain === 'pacts') return null
  if (url.protocol !== 'http:') return null
  url.protocol = 'https:'
  return Promise.resolve(url.toRedirect())
}

function robotsTxt(request: Request) {
  const url = Url.fromRequest(request)
  if (url.pathname !== '/robots.txt') return null

  return new Response(
    global.ENVIRONMENT === 'production'
      ? robotsProduction
      : 'User-agent: *\nDisallow: /\n'
  )
}

async function semanticFileNames(request: Request) {
  const url = Url.fromRequest(request)

  if (url.subdomain !== 'assets') return null

  url.host = 'assets.serlo.org'

  const re = /^\/(legacy\/|)((?!legacy)[\w-]+)\/([\w\-+]+)\.(\w+)$/
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

  const paths = url.pathname.split('/')
  const resolvedPackage =
    paths.length >= 2 ? await global.PACKAGES_KV.get(paths[1]) : null

  if (resolvedPackage) {
    paths[1] = resolvedPackage
    url.pathname = paths.join('/')
  }

  let response = await fetch(url.href, request)

  if (resolvedPackage) {
    response = new Response(response.body, response)
    response.headers.set('x-package', resolvedPackage)
  }

  return response
}
