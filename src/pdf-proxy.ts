import { isInstance, Url, SentryFactory, responseToContext } from './utils'

export async function pdfProxy(
  request: Request,
  sentryFactory: SentryFactory,
): Promise<Response | null> {
  const url = Url.fromRequest(request)

  if (!isInstance(url.subdomain)) return null
  const pdfMatch = /^\/api\/pdf\/(\d+)/.exec(url.pathname)
  if (!pdfMatch) return null

  url.hostname = 'pdf.serlo.org'
  url.pathname = `/api/${pdfMatch[1]}`

  const response = await fetch(url.href, { cf: { cacheTtl: 24 * 60 * 60 } })

  if (response.ok) {
    return response
  } else {
    const sentry = sentryFactory.createReporter('pdf-proxy')
    sentry.setContext(
      'response',
      responseToContext({ response, text: await response.text() }),
    )
    sentry.captureMessage('Illegal response of pdf.serlo.org', 'warning')
  }

  return null
}
