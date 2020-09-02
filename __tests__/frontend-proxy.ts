import { frontendProxy } from '../src/frontend-proxy'
import { createJsonResponse, Instance } from '../src/utils'
import {
  expectHasOkStatus,
  mockFetch,
  FetchMock,
  createApiResponse,
} from './_helper'

enum Backend {
  Frontend = 'frontend',
  Legacy = 'legacy',
}

describe('handleRequest()', () => {
  let fetch: FetchMock

  beforeEach(() => {
    global.FRONTEND_DOMAIN = 'frontend.serlo.org'
    global.API_ENDPOINT = 'https://api.serlo.org/'
    global.FRONTEND_SUPPORT_INTERNATIONALIZATION = 'false'

    global.FRONTEND_PROBABILITY = '0.5'
    Math.random = jest.fn().mockReturnValue(0.5)

    fetch = mockFetch()

    fetch.mockRequest({
      to: global.API_ENDPOINT,
      response: createApiResponse({ __typename: 'Subject' }),
    })
    global.FRONTEND_ALLOWED_TYPES = '["Subject"]'
  })

  describe('chooses backend based on random number', () => {
    test('chooses frontend when random number <= probability', async () => {
      global.FRONTEND_PROBABILITY = '0.5'
      Math.random = jest.fn().mockReturnValue(0.5)
      fetch.mockRequest({
        to: 'https://frontend.serlo.org/math',
        response: 'frontend',
      })

      const response = await handleUrl('https://de.serlo.org/math')

      expect(await response.text()).toBe('frontend')
      expect(fetch).toHaveExactlyOneRequestTo('https://frontend.serlo.org/math')
    })

    test('chose legacy backend for random number > probability', async () => {
      global.FRONTEND_PROBABILITY = '0.5'
      Math.random = jest.fn().mockReturnValue(0.75)
      fetch.mockRequest({
        to: 'https://de.serlo.org/math',
        response: 'legacy backend',
      })

      const response = await handleUrl('https://de.serlo.org/math')

      expect(await response.text()).toBe('legacy backend')
      expect(fetch).toHaveExactlyOneRequestTo('https://de.serlo.org/math')
    })
  })

  describe('returned response set cookie with calculated random number', () => {
    test.each([Backend.Frontend, Backend.Legacy])('%p', async (backend) => {
      global.DOMAIN = 'serlo.org'
      const backendUrl = getUrlFor(backend, 'https://de.serlo.org/math')

      setupProbabilityFor(backend)
      fetch.mockRequest({ to: backendUrl })
      Math.random = jest.fn().mockReturnValue(0.25)

      const response = await handleUrl('https://de.serlo.org/math')

      const cookieHeader = response.headers.get('Set-Cookie')
      expect(cookieHeader).toBe('useFrontend=0.25; path=/; domain=.serlo.org')
    })
  })

  describe('when FRONTEND_SUPPORT_INTERNATIONALIZATION is "true"', () => {
    beforeEach(() => {
      global.FRONTEND_SUPPORT_INTERNATIONALIZATION = 'true'
    })

    describe('prepends language code to path when backend is frontend', () => {
      test.each([Instance.En, Instance.De])(
        'language code = %p',
        async (lang) => {
          setupProbabilityFor(Backend.Frontend)
          fetch.mockRequest({ to: `https://frontend.serlo.org/${lang}/math` })

          await handleUrl(`https://${lang}.serlo.org/math`)

          expect(fetch).toHaveExactlyOneRequestTo(
            `https://frontend.serlo.org/${lang}/math`
          )
        }
      )
      test('prepends language prefix for special path /search', async () => {
        setupProbabilityFor(Backend.Frontend)
        fetch.mockRequest({ to: `https://frontend.serlo.org/en/search` })

        await handleUrl(`https://en.serlo.org/search`)

        expect(fetch).toHaveExactlyOneRequestTo(
          `https://frontend.serlo.org/en/search`
        )
      })

      test('removes trailing slashes from the frontend url', async () => {
        setupProbabilityFor(Backend.Frontend)
        fetch.mockRequest({ to: `https://frontend.serlo.org/de` })

        await handleUrl(`https://de.serlo.org/`)

        expect(fetch).toHaveExactlyOneRequestTo('https://frontend.serlo.org/de')
      })

      describe('special paths do not get a language prefix', () => {
        test.each([
          'https://de.serlo.org/spenden',
          'https://de.serlo.org/_next/script.js',
          'https://de.serlo.org/_assets/image.png',
          'https://de.serlo.org/api/frontend/privacy',
          'https://de.serlo.org/api/auth/login',
        ])('URL = %p', async (url) => {
          const backendUrl = getUrlFor(Backend.Frontend, url)
          fetch.mockRequest({ to: backendUrl })

          await handleUrl(url)

          expect(fetch).toHaveExactlyOneRequestTo(backendUrl)
        })
      })
    })

    describe('does not change path when backend is legacy backend', () => {
      test.each([Instance.En, Instance.De])(
        'language code = %p',
        async (lang) => {
          const url = `https://${lang}.serlo.org/math`
          global.FRONTEND_SUPPORT_INTERNATIONALIZATION = 'true'

          setupProbabilityFor(Backend.Legacy)
          fetch.mockRequest({ to: url })

          await handleUrl(url)

          expect(fetch).toHaveExactlyOneRequestTo(url)
        }
      )
    })
  })

  describe('when user is authenticated', () => {
    describe('when REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND = true', () => {
      beforeEach(() => {
        global.REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND = 'true'
        setupProbabilityFor(Backend.Frontend)
      })

      describe('when an entity is accessed', () => {
        let response: Response

        beforeEach(async () => {
          fetch.mockRequest({ to: 'https://de.serlo.org/math' })

          const request = new Request('https://de.serlo.org/math')
          request.headers.set('Cookie', 'authenticated=1')
          response = (await frontendProxy(request)) as Response
        })

        test('chooses legacy backend', () => {
          expect(fetch).toHaveExactlyOneRequestTo('https://de.serlo.org/math')
        })

        test('does not set cookie with random number', () => {
          expect(response.headers.get('Set-Cookie')).toBeNull()
        })

        test('does not check the path type', () => {
          expect(fetch).not.toHaveRequestsTo('https://api.serlo.org/')
        })
      })

      describe('/search and /spenden go to legacy backend', () => {
        test.each([
          'https://de.serlo.org/search',
          'https://de.serlo.org/spenden',
        ])('url = %p', async (url) => {
          fetch.mockRequest({ to: url })

          const request = new Request(url)
          request.headers.set('Cookie', 'authenticated=1')
          await frontendProxy(request)

          expect(fetch).toHaveExactlyOneRequestTo(url)
        })
      })
    })

    describe('when REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND = false', () => {
      test('does not choose legacy backend', async () => {
        global.REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND = 'false'

        setupProbabilityFor(Backend.Frontend)
        fetch.mockRequest({ to: 'https://frontend.serlo.org/math' })

        const request = new Request('https://de.serlo.org/math')
        request.headers.set('Cookie', 'authenticated=1')
        await frontendProxy(request)
        expect(fetch).toHaveExactlyOneRequestTo(
          'https://frontend.serlo.org/math'
        )
      })
    })
  })

  describe('when request contains content api parameter', () => {
    const url = 'https://de.serlo.org/math?contentOnly'
    let response: Response

    beforeEach(async () => {
      setupProbabilityFor(Backend.Frontend)
      fetch.mockRequest({ to: url })

      response = await handleUrl(url)
    })

    test('chooses legacy backend', () => {
      expect(fetch).toHaveExactlyOneRequestTo(url)
    })

    test('does not set cookie with random number', () => {
      expect(response.headers.get('Set-Cookie')).toBeNull()
    })

    test('does not check the path type', () => {
      expect(fetch).not.toHaveRequestsTo('https://api.serlo.org/')
    })
  })

  describe('uses cookie "useFrontend" to determine backend', () => {
    describe.each([
      {
        cookieValue: 'useFrontend=0.25',
        backend: Backend.Frontend,
      },
      {
        cookieValue: 'useFrontend=0.5; otherCookie=42;',
        backend: Backend.Frontend,
      },
      {
        cookieValue: 'useFrontend=0.75;',
        backend: Backend.Legacy,
      },
    ])('Parameters: %p', ({ cookieValue, backend }) => {
      let response: Response

      beforeEach(async () => {
        const url = 'https://de.serlo.org/math'
        const backendUrl = getUrlFor(backend, url)

        fetch.mockRequest({ to: backendUrl })
        global.FRONTEND_PROBABILITY = '0.5'

        const request = new Request(url, { headers: { Cookie: cookieValue } })
        response = (await frontendProxy(request)) as Response
      })

      test('new random number was not calculated', () => {
        expect(Math.random).not.toHaveBeenCalled()
      })

      test('cookie for storing random number is not set in response', () => {
        expect(response.headers.get('Set-Cookie')).toBeNull()
      })
    })
  })

  test('uses cookie "frontendUrl" to determine the url of the frontend', async () => {
    setupProbabilityFor(Backend.Frontend)
    fetch.mockRequest({ to: 'https://myfrontend.org/math' })

    const request = new Request('https://de.serlo.org/math')
    request.headers.set('Cookie', 'frontendDomain=myfrontend.org')
    await frontendProxy(request)

    expect(fetch).toHaveExactlyOneRequestTo('https://myfrontend.org/math')
  })

  test('ignore wrongly formatted cookie values', async () => {
    setupProbabilityFor(Backend.Frontend)
    fetch.mockRequest({ to: 'https://frontend.serlo.org/math' })

    const request = new Request('https://de.serlo.org/math')
    request.headers.set('Cookie', 'useFrontend=foo')
    await frontendProxy(request)

    expect(Math.random).toHaveBeenCalled()
  })

  test('return null when type of path is not allowed', async () => {
    fetch.mockRequest({
      to: 'https://api.serlo.org/',
      response: createApiResponse({ __typename: 'TaxonomyTerm' }),
    })
    global.FRONTEND_ALLOWED_TYPES = '["Page", "Article"]'

    const response = await handleUrl('https://de.serlo.org/42')

    expect(response).toBeNull()
  })

  test('returns null when type of path is unknown', async () => {
    fetch.mockRequest({
      to: 'https://api.serlo.org/',
      response: createJsonResponse({
        errors: [{ message: 'error' }],
        data: { uuid: null },
      }),
    })

    const response = await handleUrl('https://de.serlo.org/unknown')

    expect(response).toBeNull()
  })

  describe('special paths', () => {
    test('requests to /user/profile/... resolve to legacy backend when `User` is not in FRONTEND_ALLOWED_TYPES', async () => {
      global.FRONTEND_ALLOWED_TYPES = '[]'
      const backendUrl = 'https://de.serlo.org/user/profile/inyono'
      fetch.mockRequest({ to: backendUrl })

      const response = await handleUrl(backendUrl)

      expect(response).toBeNull()
    })

    test('requests to /user/profile/... resolve to frontend when `User` is in FRONTEND_ALLOWED_TYPES', async () => {
      global.FRONTEND_ALLOWED_TYPES = '["User"]'
      const backendUrl = 'https://frontend.serlo.org/user/profile/inyono'
      fetch.mockRequest({ to: backendUrl })

      await handleUrl('https://de.serlo.org/user/profile/inyono')

      expect(fetch).toHaveExactlyOneRequestTo(backendUrl)
    })

    test('requests to /api/auth/... always resolve to frontend', async () => {
      const backendUrl = 'https://frontend.serlo.org/api/auth/callback'

      fetch.mockRequest({ to: backendUrl })

      await handleUrl('https://de.serlo.org/api/auth/callback')

      expect(fetch).toHaveExactlyOneRequestTo(backendUrl)
    })

    test('requests to /api/frontend/... always resolve to frontend', async () => {
      const backendUrl = 'https://frontend.serlo.org/api/frontend/privacy/json'

      fetch.mockRequest({ to: backendUrl })

      await handleUrl('https://de.serlo.org/api/frontend/privacy/json')

      expect(fetch).toHaveExactlyOneRequestTo(backendUrl)
    })

    test('requests to /_next/... always resolve to frontend', async () => {
      fetch.mockRequest({ to: 'https://frontend.serlo.org/_next/script.js' })

      await handleUrl('https://de.serlo.org/_next/script.js')

      expect(fetch).toHaveExactlyOneRequestTo(
        'https://frontend.serlo.org/_next/script.js'
      )
    })

    test('requests to /_assets/... always resolve to frontend', async () => {
      fetch.mockRequest({
        to: 'https://frontend.serlo.org/_assets/img/picture.svg',
      })

      await handleUrl('https://de.serlo.org/_assets/img/picture.svg')

      expect(fetch).toHaveExactlyOneRequestTo(
        'https://frontend.serlo.org/_assets/img/picture.svg'
      )
    })

    test('requests to /search always resolve to frontend', async () => {
      fetch.mockRequest({ to: 'https://frontend.serlo.org/search' })

      await handleUrl('https://de.serlo.org/search')

      expect(fetch).toHaveExactlyOneRequestTo(
        'https://frontend.serlo.org/search'
      )
    })

    test('requests to /spenden always resolve to frontend', async () => {
      fetch.mockRequest({ to: 'https://frontend.serlo.org/spenden' })

      await handleUrl('https://de.serlo.org/spenden')

      expect(fetch).toHaveExactlyOneRequestTo(
        'https://frontend.serlo.org/spenden'
      )
    })

    describe('forwards authentication requests to legacy backend', () => {
      test.each([
        'https://de.serlo.org/auth/login',
        'https://de.serlo.org/auth/logout',
        'https://de.serlo.org/auth/activate/:token',
        'https://de.serlo.org/auth/password/change',
        'https://de.serlo.org/auth/password/restore/:token',
        'https://de.serlo.org/auth/hydra/login',
        'https://de.serlo.org/auth/hydra/consent',
        'https://de.serlo.org/user/register',
      ])('URL = %p', async (url) => {
        fetch.mockRequest({ to: url })

        await handleUrl(url)

        expect(fetch).toHaveExactlyOneRequestTo(url)
      })
    })

    describe('special paths need to have a trailing slash in their prefix', () => {
      test.each([
        'https://de.serlo.org/api/frontend-alternative',
        'https://de.serlo.org/_next-alias',
        'https://de.serlo.org/_assets-alias',
      ])('URL = %p', async (url) => {
        setupProbabilityFor(Backend.Legacy)
        fetch.mockRequest({ to: url })

        await handleUrl(url)

        expect(fetch).toHaveExactlyOneRequestTo(url)
      })
    })

    describe('type of special paths is not checked nor cached', () => {
      test.each([
        'https://de.serlo.org/',
        'https://de.serlo.org/spenden',
        'https://de.serlo.org/search',
        'https://de.serlo.org/_next/script.js',
        'https://de.serlo.org/_assets/image.png',
        'https://de.serlo.org/api/frontend/privacy',
        'https://de.serlo.org/auth/login',
        'https://de.serlo.org/auth/logout',
        'https://de.serlo.org/auth/activate/:token',
        'https://de.serlo.org/auth/password/change',
        'https://de.serlo.org/auth/password/restore/:token',
        'https://de.serlo.org/auth/hydra/login',
        'https://de.serlo.org/auth/hydra/consent',
        'https://de.serlo.org/user/register',
      ])('URL = %p', async (url) => {
        fetch.mockRequest({ to: getUrlFor(Backend.Frontend, url) })
        fetch.mockRequest({ to: getUrlFor(Backend.Legacy, url) })

        await handleUrl(url)

        expect(fetch).not.toHaveRequestsTo('https://api.serlo.org/')
      })
    })

    describe('Predetermined special paths do not set a cookie', () => {
      test.each([
        'https://de.serlo.org/spenden',
        'https://de.serlo.org/search',
        'https://de.serlo.org/_next/script.js',
        'https://de.serlo.org/_assets/image.png',
        'https://de.serlo.org/api/frontend/privacy',
        'https://de.serlo.org/auth/login',
        'https://de.serlo.org/auth/logout',
        'https://de.serlo.org/auth/activate/:token',
        'https://de.serlo.org/auth/password/change',
        'https://de.serlo.org/auth/password/restore/:token',
        'https://de.serlo.org/auth/hydra/login',
        'https://de.serlo.org/auth/hydra/consent',
        'https://de.serlo.org/user/register',
      ])('URL = %p', async (url) => {
        fetch.mockRequest({ to: getUrlFor(Backend.Frontend, url) })
        fetch.mockRequest({ to: getUrlFor(Backend.Legacy, url) })

        const response = await handleUrl(url)

        expect(response.headers.get('Set-Cookie')).toBeNull()
      })
    })
  })

  describe('returns null if language tenant is not "de"', () => {
    test('URL without subdomain', async () => {
      const response = await handleUrl('https://serlo.org/')

      expect(response).toBeNull()
    })

    test('URL with subdomain different from "de"', async () => {
      const response = await handleUrl('https://en.serlo.org/')

      expect(response).toBeNull()
    })
  })

  test('creates a copy of backend responses (otherwise there is an error in cloudflare)', async () => {
    const backendResponse = new Response('')

    setupProbabilityFor(Backend.Frontend)
    fetch.mockRequest({
      to: 'https://frontend.serlo.org/',
      response: backendResponse,
    })

    const response = await handleUrl('https://de.serlo.org/')

    expect(response).not.toBe(backendResponse)
  })

  describe('passes query string to backend', () => {
    test.each([Backend.Frontend, Backend.Legacy])('%p', async (backend) => {
      const backendUrl = getUrlFor(backend, 'https://de.serlo.org/?foo=bar')

      setupProbabilityFor(backend)
      fetch.mockRequest({ to: backendUrl })

      const request = new Request('https://de.serlo.org/?foo=bar')
      await frontendProxy(request)

      const backendRequest = fetch.getRequestTo(backendUrl) as Request
      const queryString = new URL(backendRequest.url).search
      expect(queryString).toEqual('?foo=bar')
    })
  })

  describe('transfers request headers to backend', () => {
    test.each([Backend.Frontend, Backend.Legacy])('%p', async (backend) => {
      const backendUrl = getUrlFor(backend, 'https://de.serlo.org/')

      setupProbabilityFor(backend)
      fetch.mockRequest({ to: backendUrl })

      const request = new Request('https://de.serlo.org/')
      request.headers.set('X-Header', 'foo')
      request.headers.set('Cookie', 'token=12345;')
      await frontendProxy(request)

      const backendRequest = fetch.getRequestTo(backendUrl) as Request
      expect(backendRequest.headers.get('X-Header')).toBe('foo')
      expect(backendRequest.headers.get('Cookie')).toBe('token=12345;')
    })
  })

  describe('transfers response headers from backend', () => {
    test.each([Backend.Frontend, Backend.Legacy])('%p', async (backend) => {
      const backendResponse = new Response('', {
        headers: {
          'X-Header': 'bar',
          'Set-Cookie': 'token=123456; path=/',
        },
      })

      setupProbabilityFor(backend)
      fetch.mockRequest({
        to: getUrlFor(backend, 'https://de.serlo.org/'),
        response: backendResponse,
      })

      const response = await handleUrl('https://de.serlo.org/')

      expect(response.headers.get('X-Header')).toBe('bar')
      expect(response.headers.get('Set-Cookie')).toEqual(
        expect.stringContaining(`token=123456; path=/`)
      )
    })
  })

  describe('requests to /enable-frontend enable use of frontend', () => {
    let res: Response

    beforeEach(async () => {
      res = await handleUrl('https://de.serlo.org/enable-frontend')
    })

    test('shows message that frontend was enabled', async () => {
      expectHasOkStatus(res)
      expect(await res.text()).toBe('Enabled: Use of new frontend')
    })

    test('sets cookie so that new frontend will be used', () => {
      expect(res.headers.get('Set-Cookie')).toEqual(
        expect.stringContaining('useFrontend=0;')
      )
    })

    test('main page will be loaded after 1 second', () => {
      expect(res.headers.get('Refresh')).toBe('1; url=/')
    })
  })

  describe('requests to /disable-frontend disable use of frontend', () => {
    let res: Response

    beforeEach(async () => {
      res = await handleUrl('https://de.serlo.org/disable-frontend')
    })

    test('shows message that frontend use is disabled', async () => {
      expectHasOkStatus(res)
      expect(await res.text()).toBe('Disabled: Use of new frontend')
    })

    test('sets cookie to that legacy backend will be used', () => {
      expect(res.headers.get('Set-Cookie')).toEqual(
        expect.stringContaining('useFrontend=1;')
      )
    })

    test('main page will be loaded after 1 second', () => {
      expect(res.headers.get('Refresh')).toBe('1; url=/')
    })
  })
})

async function handleUrl(url: string): Promise<Response> {
  return (await frontendProxy(new Request(url))) as Response
}

function getUrlFor(backend: Backend, url: string) {
  return backend === Backend.Frontend
    ? url.replace('de.serlo.org', 'frontend.serlo.org')
    : url
}

function setupProbabilityFor(backend: Backend) {
  global.FRONTEND_PROBABILITY = backend === Backend.Frontend ? '1' : '0'
}
