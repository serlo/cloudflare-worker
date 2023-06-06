import { expectSentryEvent, localTestEnvironment } from './__utils__'

describe('Sends a report to sentry when a legacy route of the Metadata API is used', () => {
  test.each([
    '/entity/api/json/export/article',
    '/entity/api/json/export/latest/article/5',
    '/entity/api/rss/article/5/feed.rss',
  ])('path: %s', async (pathname) => {
    const env = localTestEnvironment()
    await env.fetch(
      { subdomain: 'en', pathname },
      { headers: { 'User-Agent': 'MyCrawler' } }
    )

    expectSentryEvent({
      service: 'metadata-api',
      message: 'Legacy metadata API is used',
      context: {
        url: env.createUrl({ subdomain: 'en', pathname }),
        userAgent: 'MyCrawler',
      },
    })
  })
})
