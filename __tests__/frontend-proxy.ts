import { frontendProxy } from '../src/frontend-proxy'
import { Instance } from '../src/utils'
import {
  expectHasOkStatus,
  mockHttpPost,
  returnApiUuid,
  mockHttpGet,
  returnText,
  returnJson,
} from './_helper'

enum Backend {
  Frontend = 'frontend',
  Legacy = 'legacy',
}

describe('handleRequest()', () => {
  beforeEach(() => {
    global.FRONTEND_DOMAIN = 'frontend.serlo.org'
    global.API_ENDPOINT = 'https://api.serlo.org/'
    global.FRONTEND_SUPPORT_INTERNATIONALIZATION = 'false'

    global.FRONTEND_PROBABILITY = '0.5'
    Math.random = jest.fn().mockReturnValue(0.5)

    mockHttpPost(global.API_ENDPOINT, returnApiUuid({ __typename: 'Subject' }))
    global.FRONTEND_ALLOWED_TYPES = '["Subject"]'
  })

  describe('chooses backend based on random number', () => {
    test('chooses frontend when random number <= probability', async () => {
      global.FRONTEND_PROBABILITY = '0.5'
      Math.random = jest.fn().mockReturnValue(0.5)
      mockHttpGet('https://frontend.serlo.org/math', returnText('frontend'))

      const response = await handleUrl('https://de.serlo.org/math')

      expect(await response.text()).toBe('frontend')
    })

    test('chose legacy backend for random number > probability', async () => {
      global.FRONTEND_PROBABILITY = '0.5'
      Math.random = jest.fn().mockReturnValue(0.75)
      mockHttpGet('https://de.serlo.org/math', returnText('legacy backend'))

      const response = await handleUrl('https://de.serlo.org/math')

      expect(await response.text()).toBe('legacy backend')
    })
  })

  describe('returned response set cookie with calculated random number', () => {
    test.each([Backend.Frontend, Backend.Legacy])('%p', async (backend) => {
      global.DOMAIN = 'serlo.org'
      const backendUrl = getUrlFor(backend, 'https://de.serlo.org/math')

      setupProbabilityFor(backend)
      mockHttpGet(backendUrl, returnText(''))
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
          mockHttpGet(
            `https://frontend.serlo.org/${lang}/math`,
            returnText('content')
          )

          const response = await handleUrl(`https://${lang}.serlo.org/math`)

          expect(await response.text()).toBe('content')
        }
      )

      test('prepends language prefix for special path /search', async () => {
        setupProbabilityFor(Backend.Frontend)
        mockHttpGet(
          `https://frontend.serlo.org/en/search`,
          returnText('content')
        )

        const response = await handleUrl(`https://en.serlo.org/search`)

        expect(await response.text()).toBe('content')
      })

      test('removes trailing slashes from the frontend url', async () => {
        setupProbabilityFor(Backend.Frontend)
        mockHttpGet(`https://frontend.serlo.org/de`, returnText('content'))

        const response = await handleUrl(`https://de.serlo.org/`)

        expect(await response.text()).toBe('content')
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
          mockHttpGet(backendUrl, returnText('content'))

          const response = await handleUrl(url)

          expect(await response.text()).toBe('content')
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
          mockHttpGet(url, returnText('content'))

          const response = await handleUrl(url)

          expect(await response.text()).toBe('content')
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
          setupApiToReturnError()
          mockHttpGet('https://de.serlo.org/math', returnText('content'))

          const request = new Request('https://de.serlo.org/math')
          request.headers.set('Cookie', 'authenticated=1')
          response = (await frontendProxy(request)) as Response
        })

        test('chooses legacy backend', async () => {
          expect(await response.text()).toBe('content')
        })

        test('does not set cookie with random number', () => {
          expect(response.headers.get('Set-Cookie')).toBeNull()
        })
      })

      describe('/search and /spenden go to legacy backend', () => {
        test.each([
          'https://de.serlo.org/search',
          'https://de.serlo.org/spenden',
        ])('url = %p', async (url) => {
          mockHttpGet(url, returnText('legacy backend'))

          const request = new Request(url)
          request.headers.set('Cookie', 'authenticated=1')
          const response = (await frontendProxy(request)) as Response

          expect(await response.text()).toBe('legacy backend')
        })
      })
    })

    describe('when REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND = false', () => {
      test('does not choose legacy backend', async () => {
        global.REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND = 'false'

        setupProbabilityFor(Backend.Frontend)
        mockHttpGet('https://frontend.serlo.org/math', returnText('content'))

        const request = new Request('https://de.serlo.org/math')
        request.headers.set('Cookie', 'authenticated=1')
        const response = (await frontendProxy(request)) as Response

        expect(await response.text()).toBe('content')
      })
    })
  })

  describe('when request contains content api parameter', () => {
    const url = 'https://de.serlo.org/math?contentOnly'
    let response: Response

    beforeEach(async () => {
      setupApiToReturnError()
      setupProbabilityFor(Backend.Frontend)
      mockHttpGet(url, returnText('content'))

      response = await handleUrl(url)
    })

    test('chooses legacy backend', async () => {
      expect(await response.text()).toBe('content')
    })

    test('does not set cookie with random number', () => {
      expect(response.headers.get('Set-Cookie')).toBeNull()
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

        mockHttpGet(backendUrl, returnText('content'))
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
    mockHttpGet('https://myfrontend.org/math', returnText('content'))

    const request = new Request('https://de.serlo.org/math')
    request.headers.set('Cookie', 'frontendDomain=myfrontend.org')
    const response = (await frontendProxy(request)) as Response

    expect(await response.text()).toBe('content')
  })

  test('ignore wrongly formatted cookie values', async () => {
    setupProbabilityFor(Backend.Frontend)
    mockHttpGet('https://frontend.serlo.org/math', returnText('content'))

    const request = new Request('https://de.serlo.org/math')
    request.headers.set('Cookie', 'useFrontend=foo')
    await frontendProxy(request)

    expect(Math.random).toHaveBeenCalled()
  })

  test('return null when type of path is not allowed', async () => {
    global.FRONTEND_ALLOWED_TYPES = '["Page", "Article"]'
    mockHttpPost(
      global.API_ENDPOINT,
      returnApiUuid({ __typename: 'TaxonomyTerm' })
    )

    const response = await handleUrl('https://de.serlo.org/42')

    expect(response).toBeNull()
  })

  test('returns null when type of path is unknown', async () => {
    mockHttpPost(
      global.API_ENDPOINT,
      returnJson({ errors: [{ message: 'error' }], data: { uuid: null } })
    )

    const response = await handleUrl('https://de.serlo.org/unknown')

    expect(response).toBeNull()
  })

  describe('special paths', () => {
    test('requests to /user/profile/... resolve to legacy backend when `User` is not in FRONTEND_ALLOWED_TYPES', async () => {
      global.FRONTEND_ALLOWED_TYPES = '[]'
      const backendUrl = 'https://de.serlo.org/user/profile/inyono'
      mockHttpGet(backendUrl, returnText('content'))

      const response = await handleUrl(backendUrl)

      expect(response).toBeNull()
    })

    test('requests to /user/profile/... resolve to frontend when `User` is in FRONTEND_ALLOWED_TYPES', async () => {
      global.FRONTEND_ALLOWED_TYPES = '["User"]'
      mockHttpGet(
        'https://frontend.serlo.org/user/profile/inyono',
        returnText('content')
      )

      const response = await handleUrl(
        'https://de.serlo.org/user/profile/inyono'
      )

      expect(await response.text()).toBe('content')
    })

    test('requests to /api/auth/... always resolve to frontend', async () => {
      mockHttpGet(
        'https://frontend.serlo.org/api/auth/callback',
        returnText('content')
      )

      const response = await handleUrl('https://de.serlo.org/api/auth/callback')

      expect(await response.text()).toBe('content')
    })

    test('requests to /api/frontend/... always resolve to frontend', async () => {
      mockHttpGet(
        'https://frontend.serlo.org/api/frontend/privacy/json',
        returnText('content')
      )

      const response = await handleUrl(
        'https://de.serlo.org/api/frontend/privacy/json'
      )

      expect(await response.text()).toBe('content')
    })

    test('requests to /_next/... always resolve to frontend', async () => {
      mockHttpGet(
        'https://frontend.serlo.org/_next/script.js',
        returnText('content')
      )

      const response = await handleUrl('https://de.serlo.org/_next/script.js')

      expect(await response.text()).toBe('content')
    })

    test('requests to /_assets/... always resolve to frontend', async () => {
      mockHttpGet(
        'https://frontend.serlo.org/_assets/img/picture.svg',
        returnText('content')
      )

      const response = await handleUrl(
        'https://de.serlo.org/_assets/img/picture.svg'
      )

      expect(await response.text()).toBe('content')
    })

    test('requests to /search always resolve to frontend', async () => {
      mockHttpGet('https://frontend.serlo.org/search', returnText('content'))

      const response = await handleUrl('https://de.serlo.org/search')

      expect(await response.text()).toBe('content')
    })

    test('requests to /spenden always resolve to frontend', async () => {
      mockHttpGet('https://frontend.serlo.org/spenden', returnText('content'))

      const response = await handleUrl('https://de.serlo.org/spenden')

      expect(await response.text()).toBe('content')
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
        mockHttpGet(url, returnText('content'))

        const response = await handleUrl(url)

        expect(await response.text()).toBe('content')
      })
    })

    describe('special paths need to have a trailing slash in their prefix', () => {
      test.each([
        'https://de.serlo.org/api/frontend-alternative',
        'https://de.serlo.org/_next-alias',
        'https://de.serlo.org/_assets-alias',
      ])('URL = %p', async (url) => {
        setupProbabilityFor(Backend.Legacy)
        mockHttpGet(url, returnText('content'))

        const response = await handleUrl(url)

        expect(await response.text()).toBe('content')
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
        setupApiToReturnError()
        mockHttpGet(getUrlFor(Backend.Frontend, url), returnText('content'))
        mockHttpGet(getUrlFor(Backend.Legacy, url), returnText('content'))

        const response = await handleUrl(url)

        expect(await response.text()).toBe('content')
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
        mockHttpGet(getUrlFor(Backend.Frontend, url), returnText(url))
        mockHttpGet(getUrlFor(Backend.Legacy, url), returnText(url))

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
    global.fetch = jest.fn().mockResolvedValue(backendResponse)

    // There is not type checking for the main page and thus we do not need
    // to mock the api request here
    const response = await handleUrl('https://de.serlo.org/')

    expect(response).not.toBe(backendResponse)
  })

  describe('passes query string to backend', () => {
    test.each([Backend.Frontend, Backend.Legacy])('%p', async (backend) => {
      setupProbabilityFor(backend)
      const backendUrl = getUrlFor(backend, 'https://de.serlo.org/?foo=bar')
      mockHttpGet(backendUrl, returnText('content'))

      const response = await handleUrl('https://de.serlo.org/?foo=bar')

      expect(await response.text()).toBe('content')
    })
  })

  describe('transfers request headers to backend', () => {
    test.each([Backend.Frontend, Backend.Legacy])('%p', async (backend) => {
      setupProbabilityFor(backend)
      mockHttpGet(
        getUrlFor(backend, 'https://de.serlo.org/'),
        (req, res, ctx) =>
          res(ctx.status(req.headers.get('Cookie') === 'token=123' ? 200 : 400))
      )

      const request = new Request('https://de.serlo.org/')
      request.headers.set('Cookie', 'token=123')
      const response = (await frontendProxy(request)) as Response

      expectHasOkStatus(response)
    })
  })

  describe('transfers response headers from backend', () => {
    test.each([Backend.Frontend, Backend.Legacy])('%p', async (backend) => {
      const headers = {
        'X-Header': 'bar',
        'Set-Cookie': 'token=123456; path=/',
      }
      mockHttpGet(
        getUrlFor(backend, 'https://de.serlo.org/'),
        (_req, res, ctx) => res(ctx.set(headers))
      )

      setupProbabilityFor(backend)
      const response = await handleUrl('https://de.serlo.org/')

      expect(response.headers.get('X-Header')).toBe('bar')
      expect(response.headers.get('Set-Cookie')).toEqual(
        expect.stringContaining(`token=123456; path=/`)
      )
    })
  })

  test('requests to /enable-frontend enable use of frontend', async () => {
    const res = await handleUrl('https://de.serlo.org/enable-frontend')

    expectHasOkStatus(res)
    expect(res.headers.get('Set-Cookie')).toEqual(
      expect.stringContaining('useFrontend=0;')
    )
    expect(await res.text()).toBe('Enabled: Use of new frontend')
  })

  test('requests to /disable-frontend disable use of frontend', async () => {
    const res = await handleUrl('https://de.serlo.org/disable-frontend')

    expectHasOkStatus(res)
    expect(res.headers.get('Set-Cookie')).toEqual(
      expect.stringContaining('useFrontend=1;')
    )
    expect(await res.text()).toBe('Disabled: Use of new frontend')
  })
})

function setupProbabilityFor(backend: Backend) {
  global.FRONTEND_PROBABILITY = backend === Backend.Frontend ? '1' : '0'
}

function setupApiToReturnError() {
  mockHttpPost(global.API_ENDPOINT, (_req, res, ctx) => res(ctx.status(404)))
}

async function handleUrl(url: string): Promise<Response> {
  return (await frontendProxy(new Request(url))) as Response
}

function getUrlFor(backend: Backend, url: string) {
  return backend === Backend.Frontend
    ? url.replace('de.serlo.org', 'frontend.serlo.org')
    : url
}
