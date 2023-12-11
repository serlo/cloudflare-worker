import { SentryFactory, Url } from './utils'

export function sentryHelloWorld(
  request: Request,
  sentryFactory: SentryFactory,
) {
  const url = Url.fromRequest(request)

  if (url.subdomain !== '') return null
  if (url.pathname !== '/sentry-report-hello-world') return null

  const sentry = sentryFactory.createReporter('sentry-hello-world')
  sentry.captureMessage('Hello World!', 'info')

  return new Response('Hello-World message send to sentry')
}
