import { isInstance, Url, SentryFactory, responseToContext } from './utils'

export async function quickbarProxy(
  request: Request,
  sentryFactory: SentryFactory
): Promise<Response | null> {
  const url = Url.fromRequest(request)

  if (!isInstance(url.subdomain)) return null
  if (url.pathname !== '/api/stats/quickbar.json') return null

  const quickbarUrl = 'https://arrrg.de/serlo-stats/quickbar.json'
  const response = await fetch(quickbarUrl, { cf: { cacheTtl: 24 * 60 * 60 } })

  if (response.ok) {
    return response
  } else {
    const sentry = sentryFactory.createReporter('quickbar-proxy')

    sentry.setContext(
      'response',
      responseToContext({ response, text: await response.text() })
    )
    sentry.captureMessage(
      'Illegal response of quickbar server, arrrg',
      'warning'
    )

    return null
  }
}
