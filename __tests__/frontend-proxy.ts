import { handleRequest, createApiQuery } from '../src/frontend-proxy'
import { getPathname } from '../src/url-utils'
import { createJsonResponse } from '../src/utils'
import { hasOkStatus, mockFetchReturning, mockKV } from './utils'

describe('handleRequest()', () => {
  beforeEach(() => {
    global.FRONTEND_DOMAIN = 'frontend.domain'
    global.API_ENDPOINT = 'api.endpoint'
    global.FRONTEND_PROBABILITY = '0.1'
    global.FRONTEND_ALLOWED_TYPES = '[]'

    mockKV('FRONTEND_CACHE_TYPES_KV', {})
  })

  const randomCopy = Math.random

  afterEach(() => {
    Math.random = randomCopy
  })

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
      Math.random = jest.fn().mockReturnValueOnce(0.25)
      global.FRONTEND_PROBABILITY = '0.5'
      global.FRONTEND_ALLOWED_TYPES = '["User"]'

      const request = new Request(url)
      const response = (await handleRequest(request))!

      const targetUrl = url.replace('de.serlo.org', 'frontend.domain')
      expect(getBackendUrl(mockedFetch)).toBe(targetUrl)

      const cookieHeader = response.headers.get('Set-Cookie')
      expect(cookieHeader).toBe('useFrontend=0.25; path=/')

      expect(getHeaderApiEndpoint(mockedFetch)).toBe('api.endpoint')
      const cachedType = await global.FRONTEND_CACHE_TYPES_KV.get(
        getPathname(url)
      )
      expect(cachedType).toBe('User')
    })
  })

  describe('chooses standard backend for probability 0%', () => {
    test.each([
      'https://de.serlo.org/math',
      'https://de.serlo.org/10',
      'https://de.serlo.org/_nextexample-url',
    ])('url=%p', async (url) => {
      const mockedFetch = mockFetchReturning(createApiResponse('User'), '')
      Math.random = jest.fn().mockReturnValueOnce(0.66)
      global.FRONTEND_PROBABILITY = '0.5'
      global.FRONTEND_ALLOWED_TYPES = '["User"]'

      const request = new Request(url)
      const response = (await handleRequest(request))!

      expect(getBackendUrl(mockedFetch)).toBe(url)

      const cookieHeader = response.headers.get('Set-Cookie')
      expect(cookieHeader).toBe('useFrontend=0.66; path=/')

      expect(getHeaderApiEndpoint(mockedFetch)).toBe('api.endpoint')

      const cachedType = await global.FRONTEND_CACHE_TYPES_KV.get(
        getPathname(url)
      )
      expect(cachedType).toBe('User')
    })
  })

  test('uses standard backend for authenticated user', async () => {
    const mockedFetch = mockFetchReturning('')
    global.FRONTEND_PROBABILITY = '1'
    global.FRONTEND_ALLOWED_TYPES = '["Page"]'

    const request = new Request('https://de.serlo.org/math')
    request.headers.set('Cookie', 'authenticated=1')
    const response = (await handleRequest(request))!

    expect(getBackendUrl(mockedFetch)).toBe('https://de.serlo.org/math')
    expect(response.headers.get('Set-Cookie')).toBeNull()
    expect(getHeaderApiEndpoint(mockedFetch)).toBe('api.endpoint')

    const cachedType = await global.FRONTEND_CACHE_TYPES_KV.get('/math')
    expect(cachedType).toBeNull()
  })

  test('Uses cache to determine the type of an path', async () => {
    const mockedFetch = mockFetchReturning('')
    global.FRONTEND_PROBABILITY = '1'
    global.FRONTEND_ALLOWED_TYPES = '["Page"]'
    await global.FRONTEND_CACHE_TYPES_KV.put('/math', 'Page')

    const request = new Request('https://de.serlo.org/math')
    await handleRequest(request)

    expect(getBackendUrl(mockedFetch)).toBe('https://frontend.domain/math')
    expect(await global.FRONTEND_CACHE_TYPES_KV.get('/math')).toBe('Page')
  })

  test('type of start page is not checked', async () => {
    const mockedFetch = mockFetchReturning('')
    Math.random = jest.fn().mockReturnValueOnce(0.25)
    global.FRONTEND_PROBABILITY = '1'

    const request = new Request('https://de.serlo.org/')
    const response = (await handleRequest(request))!

    expect(getBackendUrl(mockedFetch)).toBe('https://frontend.domain/')
    expect(response.headers.get('Set-Cookie')).toBe(`useFrontend=0.25; path=/`)
    expect(getHeaderApiEndpoint(mockedFetch)).toBe('api.endpoint')
    expect(await global.FRONTEND_CACHE_TYPES_KV.get('/')).toBeNull()
  })

  describe('returns null for not allowed taxonomy types', () => {
    test.each(['Page', 'TaxonomyTerm'])('typename=%p', async (typename) => {
      mockFetchReturning(createApiResponse(typename))
      global.FRONTEND_PROBABILITY = '1'
      global.FRONTEND_ALLOWED_TYPES = '["User", "Article"]'

      const request = new Request('https://de.serlo.org/math')
      const response = await handleRequest(request)

      expect(response).toBeNull()
      expect(await global.FRONTEND_CACHE_TYPES_KV.get('/math')).toBe(typename)
    })
  })

  test('returns null for unknown paths', async () => {
    mockFetchReturning(createApiErrorResponse())

    const request = new Request('https://de.serlo.org/math')
    const response = await handleRequest(request)

    expect(response).toBeNull()
    expect(await global.FRONTEND_CACHE_TYPES_KV.get('/math')).toBeNull()
  })

  describe('requests to /_next, /api/frontend and /_assets always resolve to frontend', () => {
    test.each([
      'https://de.serlo.org/_next/script.js',
      'https://de.serlo.org/_next/img/picture.svg',
      'https://de.serlo.org/_assets/script.js',
      'https://de.serlo.org/_assets/img/picture.svg',
      'https://de.serlo.org/api/frontend/script.js',
      'https://de.serlo.org/api/frontend/img/picture.svg',
    ])('URL is %p', async (url) => {
      const mockedFetch = mockFetchReturning('')

      const response = (await handleRequest(new Request(url)))!

      const targetUrl = url.replace('de.serlo.org', 'frontend.domain')
      expect(getBackendUrl(mockedFetch)).toBe(targetUrl)
      expect(response.headers.get('Set-Cookie')).toBeNull()
      expect(getHeaderApiEndpoint(mockedFetch)).toBe('api.endpoint')
      expect(
        await global.FRONTEND_CACHE_TYPES_KV.get(getPathname(url))
      ).toBeNull()
    })
  })

  describe('uses cookie value to determine backend', () => {
    describe.each([
      ['https://de.serlo.org/math', '0.5'],
      ['https://de.serlo.org/10', '0.00001'],
      ['https://de.serlo.org/_nextexample-url', '1'],
    ])('URL=%p Cookie=%p', (url, cookieValue) => {
      test('frontend backend', async () => {
        const mockedFetch = mockFetchReturning(createApiResponse('User'), '')
        Math.random = jest.fn().mockReturnValueOnce(1)
        global.FRONTEND_PROBABILITY = '1'
        global.FRONTEND_ALLOWED_TYPES = '["User"]'

        // TODO: With with multiple Cookies
        const request = new Request(url, {
          headers: { Cookie: `useFrontend=${cookieValue}` },
        })
        const response = (await handleRequest(request))!

        const targetUrl = url.replace('de.serlo.org', 'frontend.domain')
        expect(getBackendUrl(mockedFetch)).toBe(targetUrl)
        expect(response.headers.get('Set-Cookie')).toBeNull()
        expect(getHeaderApiEndpoint(mockedFetch)).toBe('api.endpoint')

        expect(Math.random).not.toHaveBeenCalled()

        const path = getPathname(url)
        const cachedType = await global.FRONTEND_CACHE_TYPES_KV.get(path)
        expect(cachedType).toBe('User')
      })

      test('standard backend', async () => {
        const mockedFetch = mockFetchReturning(createApiResponse('User'), '')
        Math.random = jest.fn().mockReturnValueOnce(0)
        global.FRONTEND_PROBABILITY = '0'
        global.FRONTEND_ALLOWED_TYPES = '["User"]'

        const request = new Request(url, {
          headers: { Cookie: `useFrontend=${cookieValue};` },
        })
        const response = (await handleRequest(request))!

        expect(Math.random).not.toHaveBeenCalled()

        expect(getBackendUrl(mockedFetch)).toBe(url)
        expect(response.headers.get('Set-Cookie')).toBeNull()
        expect(getHeaderApiEndpoint(mockedFetch)).toBe('api.endpoint')

        const path = getPathname(url)
        const cachedType = await global.FRONTEND_CACHE_TYPES_KV.get(path)
        expect(cachedType).toBe('User')
      })
    })
  })

  test('creates a copy of backend responses (otherwise there is an error in cloudflare)', async () => {
    const backendResponse = new Response('')
    mockFetchReturning(backendResponse)
    global.FRONTEND_PROBABILITY = '1'

    const response = await handleRequest(new Request('https://de.serlo.org'))

    expect(response).not.toBe(backendResponse)
  })

  describe('transfers request headers to backend', () => {
    test.each([1, 0])('useFrontendProbability=%p', async (probability) => {
      const mockedFetch = mockFetchReturning('')
      global.FRONTEND_PROBABILITY = probability.toString()

      const request = new Request('https://de.serlo.org/')
      request.headers.set('X-Header', 'foo')
      request.headers.set('Cookie', 'token=12345;')
      await handleRequest(request)

      const backendRequest = mockedFetch.mock.calls[0][0]

      expect(backendRequest.headers.get('X-Header')).toBe('foo')
      expect(backendRequest.headers.get('Cookie')).toBe('token=12345;')
    })
  })

  describe('transfers response headers from backend', () => {
    test.each([1, 0])('useFrontendProbability=%p', async (probability) => {
      mockFetchReturning(
        new Response('', {
          headers: {
            'X-Header': 'bar',
            'Set-Cookie': 'token=123456; path=/',
          },
        })
      )
      Math.random = jest.fn().mockReturnValueOnce(0.5)
      global.FRONTEND_PROBABILITY = probability.toString()

      const request = new Request('https://de.serlo.org')
      const response = (await handleRequest(request))!

      expect(response).not.toBeNull()
      expect(response.headers.get('X-Header')).toBe('bar')

      // FIXME: Use getAll() after https://github.com/whatwg/fetch/issues/973
      // got implemented. See also
      // https://community.cloudflare.com/t/dont-fold-set-cookie-headers-with-headers-append/165934/3
      expect(response.headers.get('Set-Cookie')).toBe(
        `token=123456; path=/, useFrontend=0.5; path=/`
      )
    })
  })

  test('requests to /enable-frontend enable use of frontend', async () => {
    const url = 'https://de.serlo.org/enable-frontend'
    const res = (await handleRequest(new Request(url)))!

    hasOkStatus(res)
    expect(res.headers.get('Set-Cookie')).toBe('useFrontend=0; path=/')
    expect(await res.text()).toBe('Enable frontend')
  })

  test('requests to /disable-frontend disable use of frontend', async () => {
    const url = 'https://de.serlo.org/disable-frontend'
    const res = (await handleRequest(new Request(url)))!

    hasOkStatus(res)
    expect(res.headers.get('Set-Cookie')).toBe('useFrontend=1; path=/')
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

function getHeaderApiEndpoint(mockedFetch: jest.Mock) {
  const backendRequest =
    mockedFetch.mock.calls[mockedFetch.mock.calls.length - 1][0]

  return backendRequest.headers.get('X-SERLO-API')
}

function getBackendUrl(mockedFetch: jest.Mock) {
  return mockedFetch.mock.calls[mockedFetch.mock.calls.length - 1][0].url
}
