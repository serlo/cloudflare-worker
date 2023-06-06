import { isInstance, SentryFactory, Url } from './utils'

export async function metadataApi(
  request: Request,
  sentryFactory: SentryFactory
) {
  const url = Url.fromRequest(request)

  if (!isInstance(url.subdomain)) return null
  if (!url.pathname.startsWith('/entity/api')) return null

  const sentry = sentryFactory.createReporter('metadata-api')

  sentry.setContext('url', url.href)
  sentry.setContext('userAgent', request.headers.get('User-Agent'))
  sentry.captureMessage('Legacy metadata API is used', 'info')

  return fetch(request)
}
