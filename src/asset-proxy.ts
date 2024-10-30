import { SentryFactory, responseToContext, Url } from './utils'

export async function assetProxy(
  request: Request,
  sentryFactory: SentryFactory,
): Promise<Response | null> {
  const url = Url.fromRequest(request)

  if (url.subdomain !== 'asset-proxy') return null
  if (url.pathname !== '/src') return null

  const assetUrl = url.searchParams.get('url')

  if (!assetUrl) throw new Error('Missing url for the asset')

  const response = await fetch(assetUrl, { cf: { cacheTtl: 24 * 60 * 60 } })

  if (response.ok) {
    return response
  } else {
    const sentry = sentryFactory.createReporter('asset-proxy')
    sentry.setContext(
      'response',
      responseToContext({ response, text: await response.text() }),
    )
    sentry.captureMessage(`Illegal response of ${assetUrl}`, 'warning')
  }

  return null
}
