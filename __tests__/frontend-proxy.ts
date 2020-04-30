import {
  handleRequest,
  FRONTEND_DOMAIN,
  createApiQuery,
} from '../src/frontend-proxy'
import { createJsonResponse } from '../src/utils'
import { hasOkStatus, mockFetchReturning } from './utils'

describe('handleRequest()', () => {
  describe('returns null if language tenant is not "de"', () => {
    test.each([
      'https://serlo.org/',
      'http://ta.serlo.org/',
      'https://stats.serlo.org/',
      'http://en.serlo.org/math',
    ])('URL is %p', async (url) => {
      const response = await handleRequest(new Request(url))

      expect(response).toBeNull()
    })
  })

  describe('chooses frontend for probability 100%', () => {
    test.each([
      'https://de.serlo.org/math',
      'https://de.serlo.org/10',
      'https://de.serlo.org/_nextexample-url',
    ])('url=%p', async (url) => {
      const mockedFetch = mockFetchReturning(createApiResponse('User'), '')

      const request = new Request(url)
      const response = (await handleRequest(request, 1, ['User']))!

      const targetUrl = url.replace('de.serlo.org', FRONTEND_DOMAIN)
      expect(getBackendUrl(mockedFetch)).toBe(targetUrl)

      const cookieHeader = response.headers.get('Set-Cookie')
      expect(cookieHeader).toBe('useFrontend100=true; path=/')
    })
  })

  describe('chooses standard backend for probability 0%', () => {
    test.each([
      'https://de.serlo.org/math',
      'https://de.serlo.org/10',
      'https://de.serlo.org/_nextexample-url',
    ])('url=%p', async (url) => {
      const mockedFetch = mockFetchReturning(createApiResponse('User'), '')

      const request = new Request(url)
      const response = (await handleRequest(request, 0, ['User']))!

      expect(getBackendUrl(mockedFetch)).toBe(url)

      const cookieHeader = response.headers.get('Set-Cookie')
      expect(cookieHeader).toBe('useFrontend0=false; path=/')
    })
  })

  test('type of start page is not checked', async () => {
    const mockedFetch = mockFetchReturning('')

    const request = new Request('https://de.serlo.org/')
    const response = (await handleRequest(request, 1))!

    expect(getBackendUrl(mockedFetch)).toBe(`https://${FRONTEND_DOMAIN}/`)
    expect(response.headers.get('Set-Cookie')).toBe(
      `useFrontend100=true; path=/`
    )
  })

  describe('returns null for not allowed taxonomy types', () => {
    test.each(['Page', 'TaxonomyTerm'])('typename=%p', async (typename) => {
      mockFetchReturning(createApiResponse(typename))

      const request = new Request('https://de.serlo.org/math')
      const response = await handleRequest(request, 1, ['User', 'Article'])

      expect(response).toBeNull()
    })
  })

  test('returns null for unknown paths', async () => {
    mockFetchReturning(createApiErrorResponse())

    const request = new Request('https://de.serlo.org/math')
    const response = await handleRequest(request)

    expect(response).toBeNull()
  })

  describe('requests to /_next and /_assets always resolve to frontend', () => {
    test.each([
      'https://de.serlo.org/_next/script.js',
      'https://de.serlo.org/_next/img/picture.svg',
      'https://de.serlo.org/_assets/script.js',
      'https://de.serlo.org/_assets/img/picture.svg',
    ])('URL is %p', async (url) => {
      const mockedFetch = mockFetchReturning('')

      const response = (await handleRequest(new Request(url)))!

      const targetUrl = url.replace('de.serlo.org', FRONTEND_DOMAIN)
      expect(getBackendUrl(mockedFetch)).toBe(targetUrl)
      expect(response.headers.get('Set-Cookie')).toBeNull()
    })
  })

  describe('uses frontend when it is enabled via cookie', () => {
    test.each([
      'https://de.serlo.org/math',
      'https://de.serlo.org/10',
      'https://de.serlo.org/_nextexample-url',
    ])('URL=%p', async (url) => {
      const mockedFetch = mockFetchReturning(createApiResponse('User'), '')

      const request = new Request(url, {
        headers: { Cookie: 'useFrontend0=true;' },
      })
      const response = await handleRequest(request, 0, ['User'])

      const targetUrl = url.replace('de.serlo.org', FRONTEND_DOMAIN)
      expect(getBackendUrl(mockedFetch)).toBe(targetUrl)
      expect(response!.headers.get('Set-Cookie')).toBeNull()
    })
  })

  describe('does not use frontend when it is disabled via cookie', () => {
    test.each([
      'https://de.serlo.org/math',
      'https://de.serlo.org/10',
      'https://de.serlo.org/_nextexample-url',
    ])('URL=%p', async (url) => {
      const mockedFetch = mockFetchReturning(createApiResponse('User'), '')

      const request = new Request(url, {
        headers: { Cookie: 'useFrontend100=false;' },
      })
      const response = await handleRequest(request, 1, ['User'])

      expect(getBackendUrl(mockedFetch)).toBe(url)
      expect(response!.headers.get('Set-Cookie')).toBeNull()
    })
  })

  test('creates a copy of backend responses (otherwise there is an error in cloudflare)', async () => {
    const backendResponse = new Response('')
    mockFetchReturning(backendResponse)

    const res = (await handleRequest(new Request('https://de.serlo.org'), 1))!

    expect(res).not.toBe(backendResponse)
  })

  describe('transfers request meta data to backend', () => {
    test.each([1, 0])('useFrontendProbability=%p', async (probability) => {
      const mockedFetch = mockFetchReturning('')

      const req = new Request('https://de.serlo.org/')
      req.headers.set('X-Header', 'foo')
      await handleRequest(req, probability)

      const backendRequest = mockedFetch.mock.calls[0][0]

      expect(backendRequest.headers.get('X-Header')).toBe('foo')

      // TODO: Authentication Cookie
    })
  })

  describe('transfers response meta data from backend', () => {
    test.each([1, 0])('useFrontendProbability=%p', async (probability) => {
      mockFetchReturning(new Response('', { headers: { 'X-Header': 'bar' } }))

      const request = new Request('https://de.serlo.org')
      const response = (await handleRequest(request, probability))!

      expect(response).not.toBeNull()
      expect(response.headers.get('X-Header')).toBe('bar')

      // TODO: Authentication Cookie
    })
  })

  test('requests to /enable-frontend enable use of frontend', async () => {
    const url = 'https://de.serlo.org/enable-frontend'
    const res = (await handleRequest(new Request(url), 0.15))!

    hasOkStatus(res)
    expect(res.headers.get('Set-Cookie')).toBe('useFrontend15=true; path=/')
    expect(await res.text()).toBe('Enable frontend')
  })

  test('requests to /disable-frontend disable use of frontend', async () => {
    const url = 'https://de.serlo.org/disable-frontend'
    const res = (await handleRequest(new Request(url), 0.15))!

    hasOkStatus(res)
    expect(res.headers.get('Set-Cookie')).toBe('useFrontend15=false; path=/')
    expect(await res.text()).toBe('Disable frontend')
  })
})

test('createApiQuery()', () => {
  expect(createApiQuery('/math')).toBe(
    '{ uuid(alias: { instance: de, path: "/math" }) { __typename } }'
  )
  expect(createApiQuery('hello')).toBe(
    '{ uuid(alias: { instance: de, path: "/hello" }) { __typename } }'
  )
  expect(createApiQuery('/266/')).toBe(
    '{ uuid(alias: { instance: de, path: "/266/" }) { __typename } }'
  )
  expect(createApiQuery('/266')).toBe('{ uuid(id: 266) { __typename } }')
  expect(createApiQuery('/874329')).toBe('{ uuid(id: 874329) { __typename } }')
})

function createApiResponse(typename: string) {
  return createJsonResponse({ data: { uuid: { __typename: typename } } })
}

function createApiErrorResponse() {
  return createJsonResponse({
    errors: [{ message: 'error' }],
    data: { uuid: null },
  })
}

function getBackendUrl(mockedFetch: jest.Mock) {
  return mockedFetch.mock.calls[mockedFetch.mock.calls.length - 1][0].url
}
