/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2020 Serlo Education e.V.
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
 * @copyright Copyright (c) 2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
import { handleRequest, createApiQuery } from '../src/frontend-proxy'
import { getPathname } from '../src/url-utils'
import { createJsonResponse } from '../src/utils'
import { expectHasOkStatus, mockFetch, mockKV, FetchMock } from './_helper'

enum Backend {
  Frontend = 'frontend',
  DefaultBackend = 'default backend',
}

describe('handleRequest()', () => {
  let fetch: FetchMock

  beforeEach(() => {
    global.FRONTEND_DOMAIN = 'frontend.serlo.org'
    global.API_ENDPOINT = 'https://api.serlo.org/'

    global.FRONTEND_PROBABILITY = '0.5'
    Math.random = jest.fn().mockReturnValue(0.5)

    mockKV('FRONTEND_CACHE_TYPES_KV', {})
    fetch = mockFetch()

    fetch.mockRequest({
      to: global.API_ENDPOINT,
      response: createApiResponse('Subject'),
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

    test('choosed default backend for random number > probability', async () => {
      global.FRONTEND_PROBABILITY = '0.5'
      Math.random = jest.fn().mockReturnValue(0.75)
      fetch.mockRequest({
        to: 'https://de.serlo.org/math',
        response: 'default backend',
      })

      const response = await handleUrl('https://de.serlo.org/math')

      expect(await response.text()).toBe('default backend')
      expect(fetch).toHaveExactlyOneRequestTo('https://de.serlo.org/math')
    })
  })

  describe('returned response set cookie with calculated random number', () => {
    test.each([Backend.Frontend, Backend.DefaultBackend])(
      '%p',
      async (backend) => {
        const backendUrl = getUrlFor(backend, 'https://de.serlo.org/math')

        setupProbabilityFor(backend)
        fetch.mockRequest({ to: backendUrl })
        Math.random = jest.fn().mockReturnValue(0.25)

        const response = await handleUrl('https://de.serlo.org/math')

        const cookieHeader = response.headers.get('Set-Cookie')
        expect(cookieHeader).toBe('useFrontend=0.25; path=/')
      }
    )
  })

  describe('when user is authenticated', () => {
    let response: Response

    beforeEach(async () => {
      setupProbabilityFor(Backend.Frontend)
      fetch.mockRequest({ to: 'https://de.serlo.org/math' })

      const request = new Request('https://de.serlo.org/math')
      request.headers.set('Cookie', 'authenticated=1')
      response = (await handleRequest(request)) as Response
    })

    test('chooses standard backend', () => {
      expect(fetch).toHaveExactlyOneRequestTo('https://de.serlo.org/math')
    })

    test('does not set cookie with random number', () => {
      expect(response.headers.get('Set-Cookie')).toBeNull()
    })

    test('does not check the path type', async () => {
      expect(fetch).not.toHaveRequestsTo('https://api.serlo.org/')
      expect(await getCachedType('/math')).toBeNull()
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

    test('chooses standard backend', () => {
      expect(fetch).toHaveExactlyOneRequestTo(url)
    })

    test('does not set cookie with random number', () => {
      expect(response.headers.get('Set-Cookie')).toBeNull()
    })

    test('does not check the path type', async () => {
      expect(fetch).not.toHaveRequestsTo('https://api.serlo.org/')
      expect(await getCachedType('/math')).toBeNull()
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
        backend: Backend.DefaultBackend,
      },
    ])('Parameters: %p', ({ cookieValue, backend }) => {
      let response: Response

      beforeEach(async () => {
        const url = 'https://de.serlo.org/math'
        const backendUrl = getUrlFor(backend, url)

        fetch.mockRequest({ to: backendUrl })
        global.FRONTEND_PROBABILITY = '0.5'

        const request = new Request(url, { headers: { Cookie: cookieValue } })
        response = (await handleRequest(request)) as Response
      })

      test('new random number was not calculated', () => {
        expect(Math.random).not.toHaveBeenCalled()
      })

      test('cookie for storing random number is not set in response', () => {
        expect(response.headers.get('Set-Cookie')).toBeNull()
      })
    })
  })

  test('ignore wrong formated cookie values', async () => {
    setupProbabilityFor(Backend.Frontend)
    fetch.mockRequest({ to: 'https://frontend.serlo.org/math' })

    const request = new Request('https://de.serlo.org/math')
    request.headers.set('Cookie', 'useFrontend=foo')
    await handleRequest(request)

    expect(Math.random).toHaveBeenCalled()
  })

  describe('handles types of requested ressource', () => {
    test('saves type in cache', async () => {
      fetch.mockRequest({
        to: global.API_ENDPOINT,
        response: createApiResponse('Page'),
      })

      await handleUrl('https://de.serlo.org/example-page')

      expect(await getCachedType('/example-page')).toBe('Page')
    })

    test('uses cache to determine the type', async () => {
      setupProbabilityFor(Backend.Frontend)
      fetch.mockRequest({ to: 'https://frontend.serlo.org/math' })

      await global.FRONTEND_CACHE_TYPES_KV.put('/math', 'Page')
      global.FRONTEND_ALLOWED_TYPES = '["Page"]'

      await handleUrl('https://de.serlo.org/math')

      expect(fetch.getAllRequestsTo('https://api.serlo.org/')).toHaveLength(0)
      expect(await getCachedType('/math')).toBe('Page')
    })

    test('type of start page is not checked', async () => {})

    describe('when type of path is not allowed', () => {
      let response: Response

      beforeEach(async () => {
        const apiResponse = createApiResponse('TaxonomyTerm')
        fetch.mockRequest({
          to: 'https://api.serlo.org/',
          response: apiResponse,
        })
        global.FRONTEND_ALLOWED_TYPES = '["Page", "Article"]'

        response = await handleUrl('https://de.serlo.org/42')
      })

      test('returns null', () => {
        expect(response).toBeNull()
      })

      test('caches type of path', async () => {
        expect(await getCachedType('/42')).toBe('TaxonomyTerm')
      })
    })

    describe('when type of path is unknown', () => {
      let response: Response

      beforeEach(async () => {
        fetch.mockRequest({
          to: 'https://api.serlo.org/',
          response: createApiErrorResponse(),
        })

        response = await handleUrl('https://de.serlo.org/unknown')
      })

      test('returns null', () => {
        expect(response).toBeNull()
      })

      test('does not cache type of path', async () => {
        expect(await getCachedType('/unknown')).toBeNull()
      })
    })
  })

  describe('special paths', () => {
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

    describe('forwards authentication requests to default backend', () => {
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
        setupProbabilityFor(Backend.DefaultBackend)
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
        'https://de.serlo.org/api/frontend/',
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
        fetch.mockRequest({ to: getUrlFor(Backend.DefaultBackend, url) })

        await handleUrl(url)

        expect(fetch).not.toHaveRequestsTo('https://api.serlo.org/')
        expect(await getCachedType(getPathname(url))).toBeNull()
      })
    })

    describe('Predetermined special paths do not set a cookie', () => {
      test.each([
        'https://de.serlo.org/spenden',
        'https://de.serlo.org/search',
        'https://de.serlo.org/_next/script.js',
        'https://de.serlo.org/_assets/image.png',
        'https://de.serlo.org/api/frontend/',
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
        fetch.mockRequest({ to: getUrlFor(Backend.DefaultBackend, url) })

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

  describe('transfers request headers to backend', () => {
    test.each([Backend.Frontend, Backend.DefaultBackend])(
      '%p',
      async (backend) => {
        const backendUrl = getUrlFor(backend, 'https://de.serlo.org/')

        setupProbabilityFor(backend)
        fetch.mockRequest({ to: backendUrl })

        const request = new Request('https://de.serlo.org/')
        request.headers.set('X-Header', 'foo')
        request.headers.set('Cookie', 'token=12345;')
        await handleRequest(request)

        const backendRequest = fetch.getRequestTo(backendUrl)
        expect(backendRequest.headers.get('X-Header')).toBe('foo')
        expect(backendRequest.headers.get('Cookie')).toBe('token=12345;')
      }
    )
  })

  describe('transfers response headers from backend', () => {
    test.each([Backend.Frontend, Backend.DefaultBackend])(
      '%p',
      async (backend) => {
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
        // FIXME: Use getAll() after https://github.com/whatwg/fetch/issues/973
        // got implemented. See also
        // https://community.cloudflare.com/t/dont-fold-set-cookie-headers-with-headers-append/165934/3
        expect(response.headers.get('Set-Cookie')).toBe(
          `token=123456; path=/, useFrontend=0.5; path=/`
        )
      }
    )
  })

  test('requests to /enable-frontend enable use of frontend', async () => {
    const res = await handleUrl('https://de.serlo.org/enable-frontend')

    expectHasOkStatus(res)
    expect(res.headers.get('Set-Cookie')).toBe('useFrontend=0; path=/')
    expect(await res.text()).toBe('Enabled: Use of new frontend')
  })

  test('requests to /disable-frontend disable use of frontend', async () => {
    const res = await handleUrl('https://de.serlo.org/disable-frontend')

    expectHasOkStatus(res)
    expect(res.headers.get('Set-Cookie')).toBe('useFrontend=1; path=/')
    expect(await res.text()).toBe('Disabled: Use of new frontend')
  })
})

describe('createApiQuery()', () => {
  test('alias path', () => {
    expect(createApiQuery('/math')).toBe(
      '{ uuid(alias: { instance: de, path: "/math" }) { __typename } }'
    )
  })

  test('uuid path', () => {
    expect(createApiQuery('/266')).toBe('{ uuid(id: 266) { __typename } }')
  })
})

async function handleUrl(url: string): Promise<Response> {
  return (await handleRequest(new Request(url))) as Response
}

function createApiResponse(typename: string) {
  return createJsonResponse({ data: { uuid: { __typename: typename } } })
}

function createApiErrorResponse() {
  return createJsonResponse({
    errors: [{ message: 'error' }],
    data: { uuid: null },
  })
}

async function getCachedType(path: string) {
  return await global.FRONTEND_CACHE_TYPES_KV.get(path)
}

function getUrlFor(backend: Backend, url: string) {
  return backend === Backend.Frontend
    ? url.replace('de.serlo.org', 'frontend.serlo.org')
    : url
}

function setupProbabilityFor(backend: Backend) {
  global.FRONTEND_PROBABILITY = backend === Backend.Frontend ? '1' : '0'
}
