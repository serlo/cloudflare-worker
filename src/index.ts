import { api } from './api'
import { semanticFileNames } from './assets'
import { auth } from './auth'
import { cloudflareWorkerDev } from './cloudflare-worker-dev'
import { embed } from './embed'
import { frontendProxy, frontendSpecialPaths } from './frontend-proxy'
import { enforceHttps } from './http-to-https'
import { pdfProxy } from './pdf-proxy'
import { quickbarProxy } from './quickbar-proxy'
import { redirects } from './redirects'
import { robotsTxt } from './robots'
import { sentryHelloWorld } from './sentry'
import { SentryFactory, CFEnvironment } from './utils'

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
