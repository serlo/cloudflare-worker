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
  givenFrontend,
  defaultFrontendServer,
  localTestEnvironment,
  currentTestEnvironment,
  currentTestEnvironmentWhen,
} from './__utils__'

describe('handleRequest()', () => {
  beforeEach(() => {
    // TODO: DELETE
    global.FRONTEND_DOMAIN = 'frontend.serlo.org'
    givenFrontend(defaultFrontendServer())

    global.FRONTEND_ALLOWED_TYPES = '["Page"]'
    global.FRONTEND_PROBABILITY_DESKTOP = '0.5'
    Math.random = jest.fn().mockReturnValue(0.5)

    givenUuid({
      id: 23591,
      __typename: 'Page',
      alias: '/math',
      instance: Instance.En,
    })
    givenUuid({
      __typename: 'Page',
      alias: '/',
      content: '',
      instance: Instance.En,
    })
  })

  describe('chooses backend based on random number', () => {
    const env = localTestEnvironment()

    describe('for desktop', () => {
      test('chooses frontend when random number <= probability', async () => {
        global.FRONTEND_PROBABILITY_DESKTOP = '0.5'
        Math.random = jest.fn().mockReturnValue(0.5)

        const response = await env.fetch({ subdomain: 'en', pathname: '/math' })

        await expectFrontend(response)
      })

      test('chooses legacy backend for random number > probability', async () => {
        global.FRONTEND_PROBABILITY_DESKTOP = '0.5'
        Math.random = jest.fn().mockReturnValue(0.75)

        const response = await env.fetch({ subdomain: 'en', pathname: '/math' })

        await expectLegacy(response)
      })
    })

    describe('for mobile', () => {
      test('chooses frontend when random number <= probability', async () => {
        setupProbabilityFor(Backend.Legacy)
        global.FRONTEND_PROBABILITY_MOBILE = '0.5'
        Math.random = jest.fn().mockReturnValue(0.5)

        await expectFrontend(await doMobileRequest())
      })

      test('chooses legacy backend for random number > probability', async () => {
        setupProbabilityFor(Backend.Frontend)
        global.FRONTEND_PROBABILITY_MOBILE = '0.5'
        Math.random = jest.fn().mockReturnValue(0.75)

        await expectLegacy(await doMobileRequest())
      })

      function doMobileRequest() {
        const request = env.createRequest({ subdomain: 'en' })
        const userAgent =
          'Mozilla/5.0 (Android 4.0.3; de-ch) Version/4.0 Mobile Safari/534.30'
        request.headers.set('user-agent', userAgent)

        return env.fetchRequest(request)
      }
    })
  })

  describe('returned response set cookie with calculated random number', () => {
    test.each([Backend.Frontend, Backend.Legacy])('%p', async (backend) => {
      const env = localTestEnvironment()

      setupProbabilityFor(backend)
      Math.random = jest.fn().mockReturnValue(0.25)

      const response = await env.fetch({ subdomain: 'en', pathname: '/math' })

      const cookieHeader = response.headers.get('Set-Cookie')
      expect(cookieHeader).toBe('useFrontend=0.25; path=/; domain=.serlo.local')
    })
  })

  test('removes trailing slashes and prepends language code when the backend is frontend', async () => {
    const env = currentTestEnvironment()
    setupProbabilityFor(Backend.Frontend)

    await expectFrontend(await env.fetch({ subdomain: 'en' }))
  })

  describe('special paths', () => {
    const env = currentTestEnvironment()

    test('/_assets/* always resolves to frontend', async () => {
      const response = await env.fetch({
        subdomain: 'en',
        pathname: '/_assets/favicon.ico',
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe(
        'image/vnd.microsoft.icon'
      )
    })

    test('/_next/* always resolve to frontend', async () => {
      // Make sure that special paths of the frontend are resolved before the
      // redirects
      //
      // See also https://github.com/serlo/serlo.org-cloudflare-worker/issues/71
      givenUuid({ id: 5, __typename: 'TaxonomyTerm', alias: '/mathe/-5' })

      const response = await env.fetch({
        subdomain: 'en',
        pathname: await getJavascriptPathname(),
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toEqual(
        expect.stringContaining('application/javascript')
      )
    })

    test('/api/frontend/* always resolves to frontend', async () => {
      const response = await env.fetch({
        subdomain: 'en',
        pathname: '/api/frontend/privacy',
      })

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual(
        expect.arrayContaining(['2020-02-10'])
      )
    })

    test('/api/auth/* always resolves to frontend', async () => {
      const request = env.createRequest({
        subdomain: 'en',
        pathname: '/api/auth/login',
      })
      request.headers.set('referer', env.createUrl({ subdomain: 'en' }))

      const response = await env.fetchRequest(request)

      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toEqual(
        expect.stringContaining(env.createUrl({ subdomain: 'hydra' }))
      )
    })

    async function getJavascriptPathname() {
      const regex = /\/_next\/static\/chunks\/main-[0-9a-f]+.js/
      const response = await env.fetch({ subdomain: 'en', pathname: '/' })
      const match = regex.exec(await response.text())

      if (match === null) throw new Error('javascript pathname not found')

      return match[0]
    }
  })

  describe('when user is authenticated', () => {
    describe('when REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND = true', () => {
      let response: Response

      beforeEach(async () => {
        global.REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND = 'true'
        setupProbabilityFor(Backend.Frontend)
        const env = currentTestEnvironmentWhen(
          (config) =>
            config.REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND === 'true'
        )
        response = await doAuthedRequest(env)
      })

      test('chooses legacy backend', async () => {
        await expectLegacy(response)
      })

      test('does not set cookie "useFrontend"', () => {
        expect(response.headers.get('Set-Cookie')).not.toEqual(
          expect.stringContaining('useFrontend')
        )
      })
    })

    describe('when REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND = false', () => {
      beforeEach(() => {
        global.REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND = 'false'
      })

      test('chooses frontend when random number <= probability', async () => {
        setupProbabilityFor(Backend.Legacy)
        global.FRONTEND_PROBABILITY_AUTHENTICATED = '0.5'
        Math.random = jest.fn().mockReturnValue(0.5)

        await expectFrontend(await doAuthedRequest(localTestEnvironment()))
      })

      test('chooses legacy backend for random number > probability', async () => {
        setupProbabilityFor(Backend.Frontend)
        global.FRONTEND_PROBABILITY_AUTHENTICATED = '0.5'
        Math.random = jest.fn().mockReturnValue(0.75)

        await expectLegacy(await doAuthedRequest(localTestEnvironment()))
      })
    })

    function doAuthedRequest(env: ReturnType<typeof currentTestEnvironment>) {
      const request = env.createRequest({ subdomain: 'en' })
      request.headers.set('Cookie', 'authenticated=1')
      return env.fetchRequest(request)
    }
  })

  describe('when request contains content api parameter', () => {
    let response: Response

    beforeEach(async () => {
      setupProbabilityFor(Backend.Frontend)

      response = await currentTestEnvironment().fetch({
        subdomain: 'en',
        pathname: '/?contentOnly',
      })
    })

    test('chooses legacy backend', async () => {
      await expectLegacy(response)
    })

    test('does not set cookie with random number', () => {
      expect(response.headers.get('Set-Cookie')).not.toEqual(
        expect.stringContaining('useFrontend')
      )
    })
  })

  describe('uses cookie "useFrontend" to determine backend', () => {
    test.each([
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
    ])('Parameters: %p', async ({ cookieValue, backend }) => {
      global.FRONTEND_PROBABILITY_DESKTOP = '0.5'

      const env = localTestEnvironment()

      const request = env.createRequest({ subdomain: 'en' })
      request.headers.set('Cookie', cookieValue)
      const response = await env.fetchRequest(request)

      await expectBackend(response, backend)
      expect(response.headers.get('Set-Cookie')).toBeNull()
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

  test('uses frontend when cookie "useFrontend" is "always"', async () => {
    setupProbabilityFor(Backend.Legacy)
    const env = currentTestEnvironment()

    const request = env.createRequest({ subdomain: 'en' })
    request.headers.set('Cookie', 'useFrontend=always;authenticated=1')
    const response = await env.fetchRequest(request)

    await expectFrontend(response)
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
    test('requests to /user/notifications always resolve to frontend', async () => {
      await expectResponseFrom({
        backend: 'https://frontend.serlo.org/de/user/notifications',
        request: 'https://de.serlo.org/user/notifications',
      })
    })

    test('requests to /consent always resolve to frontend', async () => {
      await expectResponseFrom({
        backend: 'https://frontend.serlo.org/en/consent',
        request: 'https://en.serlo.org/consent',
      })
    })

    test('requests to /___graphql always resolve to frontend', async () => {
      await expectResponseFrom({
        backend: 'https://frontend.serlo.org/___graphql',
        request: 'https://en.serlo.org/___graphql',
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
    let ressponse: Response

    beforeEach(async () => {
      ressponse = await currentTestEnvironment().fetch({
        subdomain: 'en',
        pathname: '/enable-frontend',
      })
    })

    test('shows message that frontend was enabled', async () => {
      expectHasOkStatus(ressponse)
      expect(await ressponse.text()).toBe('Enabled: Use of new frontend')
    })

    test('sets cookie so that new frontend will be used', () => {
      expect(ressponse.headers.get('Set-Cookie')).toEqual(
        expect.stringContaining('useFrontend=0;')
      )
    })

    test('main page will be loaded after 1 second', () => {
      expect(ressponse.headers.get('Refresh')).toBe('1; url=/')
    })
  })

  describe('requests to /disable-frontend disable use of frontend', () => {
    let response: Response

    beforeEach(async () => {
      response = await currentTestEnvironment().fetch({
        subdomain: 'en',
        pathname: '/disable-frontend',
      })
    })

    test('shows message that frontend use is disabled', async () => {
      expectHasOkStatus(response)
      expect(await response.text()).toBe('Disabled: Use of new frontend')
    })

    test('sets cookie to that legacy backend will be used', () => {
      expect(response.headers.get('Set-Cookie')).toEqual(
        expect.stringContaining('useFrontend=1.1;')
      )
    })

    test('main page will be loaded after 1 second', () => {
      expect(response.headers.get('Refresh')).toBe('1; url=/')
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

async function expectBackend(response: Response, backend: Backend) {
  if (backend === Backend.Frontend) {
    await expectFrontend(response)
  } else {
    await expectLegacy(response)
  }
}

async function expectLegacy(response: Response) {
  expect(await response.text()).toEqual(
    expect.stringContaining('<html class="fuelux"')
  )
}

async function expectFrontend(response: Response) {
  expect(await response.text()).toEqual(
    expect.stringContaining('<script id="__NEXT_DATA__"')
  )
}
