import { http } from 'msw'

import { currentTestEnvironment } from './__utils__'

beforeEach(() => {
  globalThis.server.use(
    http.get('https://pdf.serlo.org/api/100', () => {
      return new Response('', {
        headers: { 'content-type': 'application/pdf' },
      })
    }),
  )
})

test('request to de.serlo.org/api/pdf/* gets pdf from pdf.serlo.org', async () => {
  const env = currentTestEnvironment()
  const response = await env.fetch({
    subdomain: 'de',
    pathname: '/api/pdf/100',
  })
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('application/pdf')
})
