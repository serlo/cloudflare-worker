import { http } from 'msw'

import { currentTestEnvironment } from './__utils__'

beforeEach(() => {
  globalThis.server.use(
    http.get('https://whatever.org/image', () => {
      return new Response('', {
        headers: { 'content-type': 'image/png' },
      })
    }),
  )
})

test('request to https://asset-proxy.serlo.org/src?url=* gets asset from url query parameter', async () => {
  const env = currentTestEnvironment()
  const response = await env.fetch({
    subdomain: 'asset-proxy',
    pathname: '/src?url=https://whatever.org/image',
  })
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('image/png')
})

// TODO: be sure the user IP is not sent
