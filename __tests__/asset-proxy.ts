import { http } from 'msw'

import {
  currentTestEnvironment,
  expectIsPlaceholderResponse,
} from './__utils__'

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
    http.get('https://whatever.org/notimage', () => {
      return new Response('', {
        headers: { 'content-type': 'application/json' },
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

describe('returns placeholder', () => {
  test('when url parameter is empty', async () => {
    const response = await requestAsset('')

    expectIsPlaceholderResponse(response)
  })

  test('when url is invalid', async () => {
    const response = await requestAsset('42')

    expectIsPlaceholderResponse(response)
  })

  test('when url query parameter is missing', async () => {
    const response = await currentTestEnvironment().fetch({
      subdomain: 'asset-proxy',
      pathname: '/src',
    })

    expectIsPlaceholderResponse(response)
  })

  test('when response is not image', async () => {
    const response = await requestAsset('https://whatever.org/notimage')

    expectIsPlaceholderResponse(response)
  })
})

async function requestAsset(
  url: string,
  env = currentTestEnvironment(),
): Promise<Response> {
  return await env.fetch({
    subdomain: 'asset-proxy',
    pathname: '/src?url=' + encodeURIComponent(url),
  })
}
