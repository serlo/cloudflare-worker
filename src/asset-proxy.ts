import { SentryFactory, responseToContext, Url } from './utils'

export async function assetProxy(
  request: Request,
  sentryFactory: SentryFactory,
): Promise<Response | null> {
  const url = Url.fromRequest(request)

  if (url.subdomain !== 'asset-proxy') return null
  if (url.pathname !== '/src') return null

  const urlParam = url.searchParams.get('url')

  if (!urlParam) throw new Error('Missing url for the asset')

  const assetUrl = new Url(urlParam)

  const originalResponse = await fetch(assetUrl, { cf: { cacheTtl: 24 * 60 * 60 } })

  if (originalResponse.ok) {
    const response = new Response(originalResponse.body, originalResponse)
    response.headers.delete('set-cookie')
    return response
  } else {
    const sentry = sentryFactory.createReporter('asset-proxy')
    sentry.setContext(
      'response',
      responseToContext({ response: originalResponse, text: await originalResponse.text() }),
    )
    sentry.captureMessage(`Illegal response of ${assetUrl.toString()}`, 'warning')
  }

  return null
}
