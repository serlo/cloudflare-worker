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

  // Maybe add other validations?
  if (response.ok) {
    response.headers.delete('Set-Cookie')
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
