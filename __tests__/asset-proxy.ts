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
    http.get(
      'https://upload.wikimedia.org/wikipedia/commons/8/8b/Sinus_mit_y.svg',
      () => {
        return new Response('', {
          headers: { 'content-type': 'image/svg+xml' },
        })
      },
    ),
    http.get(
      'https://cdn.pixabay.com/photo/2018/06/27/16/56/minimal-3502044_1280.jpg',
      () => {
        return new Response('', {
          headers: { 'content-type': 'binary/octet-stream' },
        })
      },
    ),
  )
})

test('request to https://asset-proxy.serlo.org/image?url=* gets asset from url query parameter', async () => {
  const env = currentTestEnvironment()
  const response = await env.fetch({
    subdomain: 'asset-proxy',
    pathname: '/image?url=https://whatever.org/image',
  })
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('image/png')
  expect(response.headers.get('Set-Cookie')).toBeNull()
  expect(response.headers.get('cache-control')).toBe(
    'public, max-age=31536000, immutable',
  )
})

test('request to asset-proxy works also in case of other encodings', async () => {
  const env = currentTestEnvironment()
  const response = await env.fetch(
    {
      subdomain: 'asset-proxy',
      pathname:
        '/image?url=https://upload.wikimedia.org/wikipedia/commons/8/8b/Sinus_mit_y.svg',
    },
    {
      headers: {
        'Accept-Encoding': '*',
      },
    },
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('image/svg+xml')
  expect(response.headers.get('Set-Cookie')).toBeNull()
  expect(response.headers.get('cache-control')).toBe(
    'public, max-age=31536000, immutable',
  )
})

test('request to asset-proxy works for pixabays CDN even if its response content-type is not image ', async () => {
  const env = currentTestEnvironment()
  const response = await env.fetch(
    {
      subdomain: 'asset-proxy',
      pathname:
        '/image?url=https://cdn.pixabay.com/photo/2018/06/27/16/56/minimal-3502044_1280.jpg',
    },
    {
      headers: {
        'Accept-Encoding': '*',
      },
    },
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('binary/octet-stream')
  expect(response.headers.get('Set-Cookie')).toBeNull()
  expect(response.headers.get('cache-control')).toBe(
    'public, max-age=31536000, immutable',
  )
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
      pathname: '/image',
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
    pathname: '/image?url=' + encodeURIComponent(url),
  })
}
