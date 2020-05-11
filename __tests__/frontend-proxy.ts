import { handleRequest, createApiQuery } from '../src/frontend-proxy'
import { getPathname } from '../src/url-utils'
import { createJsonResponse } from '../src/utils'
import { hasOkStatus, mockFetch, mockKV } from './utils'

describe('handleRequest()', () => {
  beforeEach(() => {
    global.FRONTEND_DOMAIN = 'frontend.serlo.org'
    global.API_ENDPOINT = 'https://api.serlo.org/'
    global.API_SECRET = 'secret'
    global.FRONTEND_PROBABILITY = '0.1'
    global.FRONTEND_ALLOWED_TYPES = '[]'

    mockKV('FRONTEND_CACHE_TYPES_KV', {})
  })

  test('chooses frontend backend when random number <= probability', async () => {
    const url = 'https://de.serlo.org/math'
    const mockedFetch = mockFetch({
      'https://api.serlo.org/': createApiResponse('Subject'),
      'https://frontend.serlo.org/math': '',
    })
    Math.random = jest.fn().mockReturnValueOnce(0.25)
    global.FRONTEND_PROBABILITY = '0.5'
    global.FRONTEND_ALLOWED_TYPES = '["Subject"]'

    const request = new Request(url)
    const response = (await handleRequest(request))!

    const targetUrl = url.replace('de.serlo.org', 'frontend.serlo.org')
    expect(getBackendUrl(mockedFetch)).toBe(targetUrl)

    const cookieHeader = response.headers.get('Set-Cookie')
    expect(cookieHeader).toBe('useFrontend=0.25; path=/')

    expect(getHeaderApiEndpoint(mockedFetch)).toBe('https://api.serlo.org/')
    expect(await getCachedType(getPathname(url))).toBe('Subject')
  })

  test('chooses standard backend when random number > probability', async () => {
    const url = 'https://de.serlo.org/math'
    const mockedFetch = mockFetch({
      'https://api.serlo.org/': createApiResponse('Subject'),
      'https://de.serlo.org/math': '',
    })
    Math.random = jest.fn().mockReturnValueOnce(0.66)
    global.FRONTEND_PROBABILITY = '0.5'
    global.FRONTEND_ALLOWED_TYPES = '["Subject"]'

    const request = new Request(url)
    const response = (await handleRequest(request))!

    expect(getBackendUrl(mockedFetch)).toBe(url)

    const cookieHeader = response.headers.get('Set-Cookie')
    expect(cookieHeader).toBe('useFrontend=0.66; path=/')

    expect(getHeaderApiEndpoint(mockedFetch)).toBe('https://api.serlo.org/')
    expect(await getCachedType(getPathname(url))).toBe('Subject')
  })

  test('chooses standard backend for authenticated user', async () => {
    const mockedFetch = mockFetch({
      'https://de.serlo.org/math': '',
    })
    global.FRONTEND_PROBABILITY = '1'
    global.FRONTEND_ALLOWED_TYPES = '["Page"]'

    const request = new Request('https://de.serlo.org/math')
    request.headers.set('Cookie', 'authenticated=1')
    const response = (await handleRequest(request))!

    expect(getBackendUrl(mockedFetch)).toBe('https://de.serlo.org/math')
    expect(response.headers.get('Set-Cookie')).toBeNull()
    expect(getHeaderApiEndpoint(mockedFetch)).toBe('https://api.serlo.org/')
    expect(await getCachedType('/math')).toBeNull()
  })

  describe('uses cookie value to determine backend', () => {
    test.each([
      {
        cookieValue: 'useFrontend=0.25',
        backendDomain: 'frontend.serlo.org',
      },
      {
        cookieValue: 'useFrontend=0.5; otherCookie=42;',
        backendDomain: 'frontend.serlo.org',
      },
      {
        cookieValue: 'useFrontend=0.75;',
        backendDomain: 'de.serlo.org',
      },
    ])('Parameters: %p', async ({ cookieValue, backendDomain }) => {
      const url = 'https://de.serlo.org/math'
      const backendUrl = url.replace('de.serlo.org', backendDomain)
      const mockedFetch = mockFetch({
        'https://api.serlo.org/': createApiResponse('Page'),
        [backendUrl]: '',
      })
      Math.random = jest.fn().mockReturnValueOnce(1)
      global.FRONTEND_PROBABILITY = '0.5'
      global.FRONTEND_ALLOWED_TYPES = '["Page"]'

      const request = new Request(url, { headers: { Cookie: cookieValue } })
      const response = (await handleRequest(request))!

      expect(Math.random).not.toHaveBeenCalled()

      expect(getBackendUrl(mockedFetch)).toBe(backendUrl)
      expect(getHeaderApiEndpoint(mockedFetch)).toBe('https://api.serlo.org/')

      expect(response.headers.get('Set-Cookie')).toBeNull()
      expect(await getCachedType('/math')).toBe('Page')
    })

    test('ignore wrong formated cookie values', async () => {
      const url = 'https://de.serlo.org/math'
      const mockedFetch = mockFetch({
        'https://api.serlo.org/': createApiResponse('Page'),
        'https://frontend.serlo.org/math': '',
      })
      Math.random = jest.fn().mockReturnValueOnce(0.5)
      global.FRONTEND_PROBABILITY = '1'
      global.FRONTEND_ALLOWED_TYPES = '["Page"]'

      const request = new Request(url, {
        headers: { Cookie: 'useFrontend=foo' },
      })
      const response = (await handleRequest(request))!

      expect(Math.random).toHaveBeenCalled()
      expect(getBackendUrl(mockedFetch)).toBe('https://frontend.serlo.org/math')
      expect(response.headers.get('Set-Cookie')).toBe('useFrontend=0.5; path=/')
    })
  })

  describe('handles types of requested ressource', () => {
    test('uses cache to determine the type', async () => {
      const mockedFetch = mockFetch({
        'https://frontend.serlo.org/math': '',
      })
      global.FRONTEND_PROBABILITY = '1'
      global.FRONTEND_ALLOWED_TYPES = '["Page"]'
      await global.FRONTEND_CACHE_TYPES_KV.put('/math', 'Page')

      const request = new Request('https://de.serlo.org/math')
      await handleRequest(request)

      expect(getBackendUrl(mockedFetch)).toBe('https://frontend.serlo.org/math')
      expect(await getCachedType('/math')).toBe('Page')
    })

    test('type of start page is not checked', async () => {
      const mockedFetch = mockFetch({ 'https://frontend.serlo.org/': '' })
      Math.random = jest.fn().mockReturnValueOnce(0.25)
      global.FRONTEND_PROBABILITY = '1'

      const request = new Request('https://de.serlo.org/')
      const response = (await handleRequest(request))!

      expect(getBackendUrl(mockedFetch)).toBe('https://frontend.serlo.org/')
      expect(response.headers.get('Set-Cookie')).toBe(
        `useFrontend=0.25; path=/`
      )
      expect(getHeaderApiEndpoint(mockedFetch)).toBe('https://api.serlo.org/')
      expect(await getCachedType('/')).toBeNull()
    })

    test('returns null for not allowed types of paths', async () => {
      mockFetch({
        'https://api.serlo.org/': createApiResponse('TaxonomyTerm'),
      })
      global.FRONTEND_PROBABILITY = '1'
      global.FRONTEND_ALLOWED_TYPES = '["Page", "Article"]'

      const request = new Request('https://de.serlo.org/42')
      const response = await handleRequest(request)

      expect(response).toBeNull()
      expect(await getCachedType('/42')).toBe('TaxonomyTerm')
    })

    test('returns null for unknown paths', async () => {
      mockFetch({
        'https://api.serlo.org/': createApiErrorResponse(),
      })

      const request = new Request('https://de.serlo.org/math')
      const response = await handleRequest(request)

      expect(response).toBeNull()
      expect(await getCachedType('/math')).toBeNull()
    })
  })

  describe('special paths', () => {
    test('requests to /api/frontend/... always resolve to frontend', async () => {
      const url = 'https://de.serlo.org/api/frontend/privacy/json'
      const mockedFetch = mockFetch({
        'https://frontend.serlo.org/api/frontend/privacy/json': '',
      })

      const response = (await handleRequest(new Request(url)))!

      const targetUrl = url.replace('de.serlo.org', 'frontend.serlo.org')
      expect(getBackendUrl(mockedFetch)).toBe(targetUrl)
      expect(getHeaderApiEndpoint(mockedFetch)).toBe('https://api.serlo.org/')
      expect(response.headers.get('Set-Cookie')).toBeNull()
      expect(await getCachedType(getPathname(url))).toBeNull()
    })

    test('requests to /_next/... always resolve to frontend', async () => {
      const url = 'https://de.serlo.org/_next/script.js'
      const mockedFetch = mockFetch({
        'https://frontend.serlo.org/_next/script.js': '',
      })

      const response = (await handleRequest(new Request(url)))!

      const targetUrl = url.replace('de.serlo.org', 'frontend.serlo.org')
      expect(getBackendUrl(mockedFetch)).toBe(targetUrl)
      expect(getHeaderApiEndpoint(mockedFetch)).toBe('https://api.serlo.org/')
      expect(response.headers.get('Set-Cookie')).toBeNull()
      expect(await getCachedType(getPathname(url))).toBeNull()
    })

    test('requests to /_assets/... always resolve to frontend', async () => {
      const url = 'https://de.serlo.org/_assets/img/picture.svg'
      const mockedFetch = mockFetch({
        'https://frontend.serlo.org/_assets/img/picture.svg': '',
      })

      const response = (await handleRequest(new Request(url)))!

      const targetUrl = url.replace('de.serlo.org', 'frontend.serlo.org')
      expect(getBackendUrl(mockedFetch)).toBe(targetUrl)
      expect(getHeaderApiEndpoint(mockedFetch)).toBe('https://api.serlo.org/')
      expect(response.headers.get('Set-Cookie')).toBeNull()
      expect(await getCachedType(getPathname(url))).toBeNull()
    })

    describe('secial paths need to have a trailing slash in their prefix', () => {
      test.each([
        'https://de.serlo.org/api/frontend-alternative',
        'https://de.serlo.org/_next-alias',
        'https://de.serlo.org/_asstes-alias',
      ])('URL = %p', async (url) => {
        const mockedFetch = mockFetch({
          'https://api.serlo.org/': createApiResponse('Article'),
          [url]: '',
        })
        Math.random = jest.fn().mockReturnValue(1)
        global.FRONTEND_PROBABILITY = '0.5'
        global.FRONTEND_ALLOWED_TYPES = '["Article"]'

        await handleRequest(new Request(url))

        expect(getBackendUrl(mockedFetch)).toBe(url)
        expect(await getCachedType(getPathname(url))).toBe('Article')
      })
    })
  })

  describe('returns null if language tenant is not "de"', () => {
    test.each(['https://serlo.org/', 'http://en.serlo.org/math'])(
      'URL is %p',
      async (url) => {
        const response = await handleRequest(new Request(url))

        expect(response).toBeNull()
      }
    )
  })

  test('creates a copy of backend responses (otherwise there is an error in cloudflare)', async () => {
    const backendResponse = new Response('')
    mockFetch({ 'https://frontend.serlo.org/': backendResponse })
    global.FRONTEND_PROBABILITY = '1'

    const response = await handleRequest(new Request('https://de.serlo.org'))

    expect(response).not.toBe(backendResponse)
  })

  describe('transfers request headers to backend', () => {
    test.each([
      { probability: 1, backendUrl: 'https://frontend.serlo.org/' },
      { probability: 0, backendUrl: 'https://de.serlo.org/' },
    ])('Parameter = %p', async ({ probability, backendUrl }) => {
      const mockedFetch = mockFetch({ [backendUrl]: '' })
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
    test.each([
      { probability: 1, backendUrl: 'https://frontend.serlo.org/' },
      { probability: 0, backendUrl: 'https://de.serlo.org/' },
    ])('Parameter = %p', async ({ probability, backendUrl }) => {
      const backendResponse = new Response('', {
        headers: {
          'X-Header': 'bar',
          'Set-Cookie': 'token=123456; path=/',
        },
      })

      mockFetch({ [backendUrl]: backendResponse })
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

describe('createApiQuery()', () => {
  test('alias path', () => {
    expect(createApiQuery('/math')).toBe(
      '{ uuid(alias: { instance: de, path: "/math" }) { __typename } }'
    )
  })

  test('path with uuid', () => {
    expect(createApiQuery('/266')).toBe('{ uuid(id: 266) { __typename } }')
  })
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
  const apiRequest =
    mockedFetch.mock.calls[mockedFetch.mock.calls.length - 1][0]

  return apiRequest.headers.get('X-SERLO-API')
}

function getBackendUrl(mockedFetch: jest.Mock) {
  return mockedFetch.mock.calls[mockedFetch.mock.calls.length - 1][0].url
}

async function getCachedType(path: string) {
  return await global.FRONTEND_CACHE_TYPES_KV.get(path)
}
