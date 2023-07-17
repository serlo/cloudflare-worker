import { api } from './api'
import { auth } from './auth'
import { cloudflareWorkerDev } from './cloudflare-worker-dev'
import { embed } from './embed'
import { frontendProxy, frontendSpecialPaths } from './frontend-proxy'
import { legalPages } from './legal-pages'
import { metadataApi } from './metadata-api'
import { pdfProxy } from './pdf-proxy'
import { quickbarProxy } from './quickbar-proxy'
import { redirects } from './redirects'
import { robotsTxt } from './robots'
import { SentryFactory, Url } from './utils'

// eslint-disable-next-line import/no-default-export
export default {
  fetch(request: Request, env: unknown, context: ExecutionContext) {
    return handleFetchEvent(request, context)
  },
}

export async function handleFetchEvent(
  request: Request,
  context: ExecutionContext,
): Promise<Response> {
  const sentryFactory = new SentryFactory(context)

  try {
    return (
      cloudflareWorkerDev(request) ||
      auth(request) ||
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
    paths.length >= 2 ? await globalThis.PACKAGES_KV.get(paths[1]) : null

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
