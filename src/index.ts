import { api } from './api'
import { assetProxy } from './asset-proxy'
import { semanticFileNames } from './assets'
import { auth } from './auth'
import { blockCommonHackerPaths } from './block-common-hacker-paths'
import { cloudflareWorkerDev } from './cloudflare-worker-dev'
import { redirectToCurrentAlias } from './current-alias-redirects'
import { embed } from './embed'
import { frontendProxy, frontendSpecialPaths } from './frontend-proxy'
import { enforceHttps } from './http-to-https'
import { pdfProxy } from './pdf-proxy'
import { quickbarProxy } from './quickbar-proxy'
import { redirects } from './redirects'
import { robotsTxt } from './robots'
import { sentryHelloWorld } from './sentry'
import { SentryFactory, CFEnvironment } from './utils'

export default {
  async fetch(
    request: Request,
    env: CFEnvironment,
    context: ExecutionContext,
  ): Promise<Response> {
    const sentryFactory = new SentryFactory(env, context)

    try {
      return (
        cloudflareWorkerDev(request) ||
        auth(request, env) ||
        (await enforceHttps(request)) ||
        (await quickbarProxy(request, sentryFactory)) ||
        (await pdfProxy(request, sentryFactory)) ||
        robotsTxt(request, env) ||
        blockCommonHackerPaths(request) ||
        (await frontendSpecialPaths(request, sentryFactory, env)) ||
        sentryHelloWorld(request, sentryFactory) ||
        redirects(request, env) ||
        (await redirectToCurrentAlias(request, env)) ||
        (await embed(request, sentryFactory)) ||
        (await semanticFileNames(request)) ||
        (await api(request, env)) ||
        (await frontendProxy(request, sentryFactory, env)) ||
        (await assetProxy(request)) ||
        (await fetch(request))
      )
    } catch (e) {
      sentryFactory.createReporter('handle-fetch-event').captureException(e)
      throw e
    }
  },
}
