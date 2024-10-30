import { http } from 'msw'

import { currentTestEnvironment } from './__utils__'

beforeEach(() => {
  globalThis.server.use(
    http.get('https://whatever.org/image', () => {
      return new Response('', {
        headers: {
          'content-type': 'image/png',
          'Set-Cookie':
            'sessionId=abc123; Expires=Wed, 09 Nov 2024 07:28:00 GMT; Path=/; Domain=whatever.org; Secure; HttpOnly; SameSite=None',
        },
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
  expect(response.headers.get('Set-Cookie')).toBeNull()
})
