import { api } from './api'
import { auth } from './auth'
import { CFEnvironment } from './cf-environment'
import { cloudflareWorkerDev } from './cloudflare-worker-dev'
import { embed } from './embed'
import { frontendProxy, frontendSpecialPaths } from './frontend-proxy'
import { pdfProxy } from './pdf-proxy'
import { quickbarProxy } from './quickbar-proxy'
import { redirects } from './redirects'
import { robotsTxt } from './robots'
import { SentryFactory, Url } from './utils'

// eslint-disable-next-line import/no-default-export
export default {
  async fetch(request: Request, env: CFEnvironment, context: ExecutionContext) {
    const sentryFactory = new SentryFactory(env, context)

    try {
      return (
        cloudflareWorkerDev(request) ||
        auth(request, env) ||
        (await enforceHttps(request)) ||
        (await quickbarProxy(request, sentryFactory)) ||
        (await pdfProxy(request, sentryFactory)) ||
        robotsTxt(request, env) ||
        (await frontendSpecialPaths(request, sentryFactory, env)) ||
        sentryHelloWorld(request, sentryFactory) ||
        (await redirects(request, env)) ||
        (await embed(request, sentryFactory)) ||
        (await semanticFileNames(request)) ||
        (await api(request, env)) ||
        (await frontendProxy(request, sentryFactory, env)) ||
        (await fetch(request))
      )
    } catch (e) {
      sentryFactory.createReporter('handle-fetch-event').captureException(e)
      throw e
    }
  },
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
