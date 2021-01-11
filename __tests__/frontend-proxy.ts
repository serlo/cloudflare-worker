/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2021 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
import { handleRequest } from '../src'
import { Url, Instance } from '../src/utils'
import {
  expectHasOkStatus,
  mockHttpGet,
  returnsText,
  givenUuid,
  givenApi,
  returnsMalformedJson,
  returnsJson,
  Backend,
  setupProbabilityFor,
} from './__utils__'

describe('handleRequest()', () => {
  beforeEach(() => {
    global.FRONTEND_DOMAIN = 'frontend.serlo.org'
    global.FRONTEND_ALLOWED_TYPES = '["Page"]'
    global.FRONTEND_PROBABILITY_DESKTOP = '0.5'
    Math.random = jest.fn().mockReturnValue(0.5)

    givenUuid({
      id: 23591,
      __typename: 'Page',
      alias: '/math',
      instance: Instance.En,
    })
  })

  describe('chooses backend based on random number', () => {
    describe('for desktop', () => {
      test('chooses frontend when random number <= probability', async () => {
        global.FRONTEND_PROBABILITY_DESKTOP = '0.5'
        Math.random = jest.fn().mockReturnValue(0.5)

        await expectResponseFrom({
          backend: 'https://frontend.serlo.org/en/math',
          request: 'https://en.serlo.org/math',
        })
      })

      test('chose legacy backend for random number > probability', async () => {
        global.FRONTEND_PROBABILITY_DESKTOP = '0.5'
        Math.random = jest.fn().mockReturnValue(0.75)

        await expectResponseFrom({
          backend: 'https://en.serlo.org/math',
          request: 'https://en.serlo.org/math',
        })
      })
    })

    describe('for mobile', () => {
      test('chooses frontend when random number <= probability', async () => {
        global.FRONTEND_PROBABILITY_DESKTOP = '0'
        global.FRONTEND_PROBABILITY_MOBILE = '0.5'
        Math.random = jest.fn().mockReturnValue(0.5)

        await expectResponseFrom({
          backend: 'https://frontend.serlo.org/en/math',
          request: getMobileRequest(),
        })
      })

      test('chose legacy backend for random number > probability', async () => {
        global.FRONTEND_PROBABILITY_DESKTOP = '1'
        global.FRONTEND_PROBABILITY_MOBILE = '0.5'
        Math.random = jest.fn().mockReturnValue(0.75)

        await expectResponseFrom({
          backend: 'https://en.serlo.org/math',
          request: getMobileRequest(),
        })
      })
      function getMobileRequest() {
        const request = new Request('https://en.serlo.org/math')
        request.headers.set(
          'user-agent',
          'Mozilla/5.0 (Linux; U; Android 4.0.3; de-ch; HTC Sensation Build/IML74K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30'
        )
        return request
      }
    })

    //test for authenticated users below
  })

  describe('returned response set cookie with calculated random number', () => {
    test.each([Backend.Frontend, Backend.Legacy])('%p', async (backend) => {
      global.DOMAIN = 'serlo.org'
      const backendUrl = getUrlFor(backend, 'https://en.serlo.org/math')

      setupProbabilityFor(backend)
      mockHttpGet(backendUrl, returnsText(''))
      Math.random = jest.fn().mockReturnValue(0.25)

      const response = await handleUrl('https://en.serlo.org/math')

      const cookieHeader = response.headers.get('Set-Cookie')
      expect(cookieHeader).toBe('useFrontend=0.25; path=/; domain=.serlo.org')
    })
  })

  test('removes trailing slashes and prepends language code when the backend is frontend', async () => {
    setupProbabilityFor(Backend.Frontend)

    await expectResponseFrom({
      backend: 'https://frontend.serlo.org/de',
      request: 'https://de.serlo.org/',
    })
  })

  describe('special paths do not get a language prefix', () => {
    test.each([
      'https://de.serlo.org/_next/script.js',
      'https://de.serlo.org/_assets/image.png',
      'https://de.serlo.org/api/frontend/privacy',
      'https://de.serlo.org/api/auth/login',
    ])('URL = %p', async (url) => {
      const backendUrl = new Url(url)
      backendUrl.hostname = 'frontend.serlo.org'

      await expectResponseFrom({
        backend: backendUrl.href,
        request: url,
      })
    })
  })

  describe('when user is authenticated', () => {
    describe('when REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND = true', () => {
      beforeEach(() => {
        global.REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND = 'true'
        setupProbabilityFor(Backend.Frontend)
      })

      describe('when an entity is accessed', () => {
        test('chooses legacy backend', async () => {
          await expectResponseFrom({
            backend: 'https://en.serlo.org/math',
            request: getAuthedRequest(),
          })
        })

        test('does not set cookie with random number', async () => {
          mockHttpGet(Backend.Legacy, returnsText(''))
          const response = await handleRequest(getAuthedRequest())
          expect(response.headers.get('Set-Cookie')).toBeNull()
        })
      })
    })

    describe('when REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND = false', () => {
      beforeEach(() => {
        global.REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND = 'false'
        setupProbabilityFor(Backend.Frontend)
      })

      describe('when an entity is accessed', () => {
        test('chooses frontend when random number <= probability', async () => {
          setupProbabilityFor(Backend.Legacy)
          global.FRONTEND_PROBABILITY_AUTHENTICATED = '0.5'
          Math.random = jest.fn().mockReturnValue(0.5)

          await expectResponseFrom({
            backend: 'https://frontend.serlo.org/en/math',
            request: getAuthedRequest(),
          })
        })

        test('chose legacy backend for random number > probability', async () => {
          setupProbabilityFor(Backend.Frontend)
          global.FRONTEND_PROBABILITY_AUTHENTICATED = '0.5'
          Math.random = jest.fn().mockReturnValue(0.75)

          await expectResponseFrom({
            backend: 'https://en.serlo.org/math',
            request: getAuthedRequest(),
          })
        })
      })
    })

    function getAuthedRequest() {
      const request = new Request('https://en.serlo.org/math')
      request.headers.set('Cookie', 'authenticated=1')
      return request
    }
  })

  describe('when request contains content api parameter', () => {
    const url = 'https://de.serlo.org/math?contentOnly'
    let response: Response

    beforeEach(async () => {
      givenApi(returnsMalformedJson())
      setupProbabilityFor(Backend.Frontend)
      mockHttpGet(url, returnsText('content'))

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
        const url = 'https://en.serlo.org/math'
        const backendUrl = getUrlFor(backend, url)

        mockHttpGet(backendUrl, returnsText('content'))
        global.FRONTEND_PROBABILITY_DESKTOP = '0.5'

        const request = new Request(url, { headers: { Cookie: cookieValue } })
        response = await handleRequest(request)
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

    const request = new Request('https://en.serlo.org/math')
    request.headers.set('Cookie', 'frontendDomain=myfrontend.org')

    await expectResponseFrom({
      backend: 'https://myfrontend.org/en/math',
      request,
    })
  })

  test('ignore wrongly formatted cookie values', async () => {
    setupProbabilityFor(Backend.Frontend)

    const request = new Request('https://en.serlo.org/math')
    request.headers.set('Cookie', 'useFrontend=foo')

    await expectResponseFrom({
      backend: 'https://frontend.serlo.org/en/math',
      request,
    })
    expect(Math.random).toHaveBeenCalled()
  })

  test('chooses legacy backend when type of ressource is not in FRONTEND_ALLOWED_TYPES', async () => {
    global.FRONTEND_ALLOWED_TYPES = '["Page", "Article"]'
    givenUuid({ id: 42, __typename: 'TaxonomyTerm' })

    await expectResponseFrom({
      backend: 'https://de.serlo.org/42',
      request: 'https://de.serlo.org/42',
    })
  })

  test('chooses legacy backend when type of ressource is unknown', async () => {
    givenApi(returnsJson({}))

    await expectResponseFrom({
      backend: 'https://de.serlo.org/unknown',
      request: 'https://de.serlo.org/unknown',
    })
  })

  describe('special paths', () => {
    test('requests to /api/auth/... always resolve to frontend', async () => {
      await expectResponseFrom({
        backend: 'https://frontend.serlo.org/api/auth/callback',
        request: 'https://de.serlo.org/api/auth/callback',
      })
    })

    test('requests to /api/frontend/... always resolve to frontend', async () => {
      await expectResponseFrom({
        backend: 'https://frontend.serlo.org/api/frontend/privacy/json',
        request: 'https://de.serlo.org/api/frontend/privacy/json',
      })
    })

    test('requests to /_next/... always resolve to frontend', async () => {
      // Make sure that special paths of the frontend are resolved before the
      // redirects
      //
      // See also https://github.com/serlo/serlo.org-cloudflare-worker/issues/71
      givenUuid({ id: 5, __typename: 'TaxonomyTerm', alias: '/mathe/-5' })

      await expectResponseFrom({
        backend: 'https://frontend.serlo.org/_next/static/Xi-nU5/script.js',
        request: 'https://de.serlo.org/_next/static/Xi-nU5/script.js',
      })
    })

    test('requests to /_assets/... always resolve to frontend', async () => {
      await expectResponseFrom({
        backend: 'https://frontend.serlo.org/_assets/img/picture.svg',
        request: 'https://de.serlo.org/_assets/img/picture.svg',
      })
    })

    test('requests to /user/notifications always resolve to frontend', async () => {
      await expectResponseFrom({
        backend: 'https://frontend.serlo.org/de/user/notifications',
        request: 'https://de.serlo.org/user/notifications',
      })
    })

    describe('special paths where the cookie determines the backend', () => {
      describe.each([
        'https://de.serlo.org/',
        'https://de.serlo.org/search',
        'https://de.serlo.org/spenden',
        'https://de.serlo.org/license/detail/1',
      ])('URL = %p', (url) => {
        test.each([Backend.Frontend, Backend.Legacy])(
          'backend = %p',
          async (backend) => {
            // Make sure that there is no redirect before the frontend is
            // resolved
            givenUuid({
              __typename: 'Page',
              oldAlias: '/spenden',
              alias: '/21565/spenden',
            })
            givenUuid({
              __typename: 'Page',
              oldAlias: '/search',
              alias: '/21565/spenden',
            })

            setupProbabilityFor(backend)
            Math.random = jest.fn().mockReturnValue(0.5)

            await expectResponseFrom({
              backend: getUrlFor(backend, url),
              request: url,
            })
          }
        )
      })
    })

    describe('special paths where the cookie determines the backend when USER is in FRONTEND_ALLOWED_TYPES', () => {
      describe.each([
        'https://de.serlo.org/user/public',
        'https://de.serlo.org/user/me',
      ])('URL = %p', (url) => {
        test.each([Backend.Frontend, Backend.Legacy])(
          'backend = %p',
          async (backend) => {
            global.FRONTEND_ALLOWED_TYPES = '["User"]'
            setupProbabilityFor(backend)
            Math.random = jest.fn().mockReturnValue(0.5)

            await expectResponseFrom({
              backend: getUrlFor(backend, url),
              request: url,
            })
          }
        )
      })
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
        await expectResponseFrom({ backend: url, request: url })
      })
    })

    describe('special paths need to have a trailing slash in their prefix', () => {
      test.each([
        'https://de.serlo.org/api/frontend-alternative',
        'https://de.serlo.org/_next-alias',
        'https://de.serlo.org/_assets-alias',
      ])('URL = %p', async (url) => {
        givenUuid({
          __typename: 'Page',
          alias: new URL(url).pathname,
        })
        setupProbabilityFor(Backend.Legacy)

        await expectResponseFrom({ backend: url, request: url })
      })
    })

    describe('Predetermined special paths do not set a cookie', () => {
      test.each([
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
        const backendUrl = new Url(url)
        backendUrl.hostname = 'frontend.serlo.org'

        mockHttpGet(backendUrl.href, returnsText(url))
        mockHttpGet(getUrlFor(Backend.Legacy, url), returnsText(url))

        const response = await handleUrl(url)

        expect(response.headers.get('Set-Cookie')).toBeNull()
      })
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

      await expectResponseFrom({
        backend: getUrlFor(backend, 'https://de.serlo.org/?foo=bar'),
        request: 'https://de.serlo.org/?foo=bar',
      })
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
      const response = await handleRequest(request)

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

async function expectResponseFrom({
  backend,
  request,
}: {
  backend: string
  request: Request | string
}) {
  mockHttpGet(backend, returnsText('content'))

  request = typeof request === 'string' ? new Request(request) : request
  const response = await handleRequest(request)

  expect(await response.text()).toBe('content')
}

async function handleUrl(url: string): Promise<Response> {
  return await handleRequest(new Request(url))
}

function getUrlFor(backend: Backend, url: string) {
  const backendUrl = new Url(url)

  if (backend === Backend.Frontend) {
    backendUrl.pathname = '/' + backendUrl.subdomain + backendUrl.pathname
    backendUrl.hostname = 'frontend.serlo.org'
    backendUrl.pathname = backendUrl.pathnameWithoutTrailingSlash
  }

  return backendUrl.href
}
