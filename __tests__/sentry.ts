import { expectSentryEvent, localTestEnvironment } from './__utils__'

test('https://serlo.org/sentry-report-hello-world sends a "Hello World" message to sentry', async () => {
  await localTestEnvironment().fetch({ pathname: '/sentry-report-hello-world' })

  expectSentryEvent({ service: 'sentry-hello-world', message: 'Hello World!' })
})
