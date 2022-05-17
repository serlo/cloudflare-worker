/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021-2022 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2022 Serlo Education e.V.
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import { Instance } from '../src/utils'
import {
  mockHttpGet,
  returnsText,
  givenUuid,
  givenApi,
  returnsJson,
  Backend,
  setupProbabilityFor,
  localTestEnvironment,
  currentTestEnvironment,
  redirectsTo,
  givenFrontend,
  expectSentryEvent,
  expectToBeRedirectTo,
  givenSerlo,
  currentTestEnvironmentWhen,
} from './__utils__'

beforeEach(() => {
  global.FRONTEND_PROBABILITY = '0.5'
  Math.random = jest.fn().mockReturnValue(0.5)

  givenUuid({
    id: 23591,
    __typename: 'Page',
    alias: '/math',
    instance: Instance.En,
  })
})

describe('chooses backend based on random number', () => {
  const env = localTestEnvironment()

  describe('for desktop', () => {
    test('chooses frontend when random number <= probability', async () => {
      global.FRONTEND_PROBABILITY = '0.5'
      Math.random = jest.fn().mockReturnValue(0.5)

      const response = await env.fetch({ subdomain: 'en', pathname: '/math' })

      await expectFrontend(response)
    })

    test('chooses legacy backend for random number > probability', async () => {
      global.FRONTEND_PROBABILITY = '0.5'
      Math.random = jest.fn().mockReturnValue(0.75)

      const response = await env.fetch({ subdomain: 'en', pathname: '/math' })

      await expectLegacy(response)
    })
  })
})

describe('returned response set cookie with calculated random number', () => {
  test.each([Backend.Frontend, Backend.Legacy])('%p', async (backend) => {
    const env = localTestEnvironment()

    setupProbabilityFor(backend)
    Math.random = jest.fn().mockReturnValue(0.25)

    const response = await env.fetch({ subdomain: 'en', pathname: '/math' })

    const cookieHeader = response.headers.get('Set-Cookie')
    expect(cookieHeader).toBe(
      'useFrontend=0.25; path=/; domain=.serlo.localhost'
    )
  })
})

test('removes trailing slashes and prepends language code when the backend is frontend', async () => {
  const env = currentTestEnvironment()
  setupProbabilityFor(Backend.Frontend)

  await expectFrontend(await env.fetch({ subdomain: 'en' }))
})

describe('when request contains content api parameter', () => {
  beforeEach(() => {
    setupProbabilityFor(Backend.Frontend)

    givenUuid({
      id: 1555,
      __typename: 'Article',
      alias: '/1555',
      instance: Instance.En,
    })
  })

  test('chooses frontend', async () => {
    const response = await currentTestEnvironment().fetch({
      subdomain: 'en',
      pathname: '/1555?contentOnly',
    })

    await expectFrontend(response)
  })

  test('handles trailing slash and redirects', async () => {
    const response = await currentTestEnvironment().fetch({
      subdomain: 'en',
      pathname: '/1555/?contentOnly',
    })
    expect(response.status).toBe(301)
  })
})

describe('when request contains header X-From: legacy-serlo.org', () => {
  let response: Response

  beforeEach(async () => {
    setupProbabilityFor(Backend.Frontend)

    response = await currentTestEnvironment().fetch(
      {
        subdomain: 'en',
        pathname: '/',
      },
      { headers: { 'X-From': 'legacy-serlo.org' } }
    )
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
    global.FRONTEND_PROBABILITY = '0.5'

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
  mockHttpGet('https://myfrontend.org/en/math', returnsText('content'))

  const env = localTestEnvironment()

  const request = env.createRequest({ subdomain: 'en', pathname: '/math' })
  request.headers.set('Cookie', 'frontendDomain=myfrontend.org')
  const response = await env.fetchRequest(request)

  expect(await response.text()).toBe('content')
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
  const env = currentTestEnvironment()

  const request = env.createRequest({ subdomain: 'en' })
  request.headers.set('Cookie', 'useFrontend=foo')
  const response = await env.fetchRequest(request)

  expect(response.status).toBe(200)
  expect(response.headers.get('Set-Cookie')).toEqual(
    expect.stringContaining('useFrontend')
  )
})

test('chooses legacy backend when type of ressource is unknown', async () => {
  givenApi(returnsJson({}))
  givenUuid({
    __typename: 'Article',
    alias: '/unknown',
    instance: Instance.En,
  })

  const response = await localTestEnvironment().fetch({
    subdomain: 'en',
    pathname: '/unknown',
  })

  await expectLegacy(response)
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
    expect(response.headers.get('Set-Cookie')).not.toEqual(
      expect.stringContaining('useFrontend')
    )
  })

  describe('/next/*', () => {
    test('always resolve to frontend', async () => {
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
      expect(response.headers.get('Set-Cookie')).not.toEqual(
        expect.stringContaining('useFrontend')
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

  test('/api/frontend/* always resolves to frontend', async () => {
    const response = await env.fetch({
      subdomain: 'en',
      pathname: '/api/frontend/privacy',
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(
      expect.arrayContaining(['2020-02-10'])
    )
    expect(response.headers.get('Set-Cookie')).not.toEqual(
      expect.stringContaining('useFrontend')
    )
  })

  test('/api/auth/* always resolves to frontend (and transfers request header to backend)', async () => {
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
    expect(response.headers.get('Set-Cookie')).not.toEqual(
      expect.stringContaining('useFrontend')
    )
  })

  test('/user/notifications always resolve to frontend', async () => {
    const response = await env.fetch({
      subdomain: 'en',
      pathname: '/user/notifications',
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toEqual(
      expect.stringContaining('Notifications')
    )
  })

  test('/consent always resolve to frontend', async () => {
    const response = await env.fetch({
      subdomain: 'en',
      pathname: '/consent',
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toEqual(expect.stringContaining('Consent'))
  })

  test('GET /entity/repository/add-revision/123 resolves to frontend', async () => {
    const request = env.createRequest({
      subdomain: 'en',
      pathname: '/entity/repository/add-revision/123',
    })

    const response = await env.fetchRequest(request)

    await expectFrontend(response)
  })

  test('GET /entity/repository/add-revision/123 and useLegacyEditor cookie resolves to legacy', async () => {
    const request = env.createRequest({
      subdomain: 'en',
      pathname: '/entity/repository/add-revision/123',
    })

    request.headers.set('Cookie', 'useLegacyEditor=1;authenticated=1')
    const response = await env.fetchRequest(request)

    await expectLegacy(response)
  })

  test('GET /entity/repository/add-revision-old/123 resolves to legacy', async () => {
    const request = env.createRequest({
      subdomain: 'en',
      pathname: '/entity/repository/add-revision-old/123',
    })

    const response = await env.fetchRequest(request)

    await expectLegacy(response)
  })

  test('POST /entity/repository/add-revision/123 uses legacy', async () => {
    const request = env.createRequest(
      {
        subdomain: 'en',
        pathname: '/entity/repository/add-revision/123',
      },
      { method: 'POST' }
    )
    const response = await env.fetchRequest(request)

    await expectLegacy(response)
  })

  test('/event/history always resolve to frontend', async () => {
    const response = await env.fetch({
      subdomain: 'en',
      pathname: '/event/history',
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toEqual(expect.stringContaining('Event Log'))
  })

  test('/event/history/[id] always resolve to frontend', async () => {
    const response = await env.fetch({
      subdomain: 'en',
      pathname: '/event/history/201375',
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toEqual(expect.stringContaining('Event Log'))
  })

  test('/event/history/user/[userId]/… always resolve to frontend', async () => {
    const response = await env.fetch({
      subdomain: 'en',
      pathname: '/event/history/user/1/arekkas',
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toEqual(expect.stringContaining('arekkas'))
  })

  test('/entity/unrevised always resolve to frontend', async () => {
    const response = await env.fetch({
      subdomain: 'en',
      pathname: '/entity/unrevised',
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toEqual(
      expect.stringContaining('Unrevised Revisions')
    )
  })

  describe('/taxonomy/term/create/:id/:id', () => {
    test('resolves to frontend in staging', async () => {
      global.ENVIRONMENT = 'staging'
      const env = currentTestEnvironmentWhen(
        (config) => config.ENVIRONMENT === 'staging'
      )

      const response = await env.fetch({
        subdomain: 'de',
        pathname: '/taxonomy/term/create/10/10',
      })

      await expectFrontend(response)
    })

    test('resolves to legacy in staging with POST', async () => {
      global.ENVIRONMENT = 'staging'
      const env = currentTestEnvironmentWhen(
        (config) => config.ENVIRONMENT === 'staging'
      )

      const response = await env.fetch(
        {
          subdomain: 'de',
          pathname: '/taxonomy/term/create/10/10',
        },
        { method: 'POST' }
      )

      await expectLegacy(response)
    })

    test('resolves to Legacy in production', async () => {
      global.ENVIRONMENT = 'production'
      const env = currentTestEnvironmentWhen(
        (config) => config.ENVIRONMENT === 'production'
      )

      const response = await env.fetch({
        subdomain: 'de',
        pathname: '/taxonomy/term/create/10/10',
      })

      await expectLegacy(response)
    })
  })

  test('links starting with /___ always resolve to frontend', async () => {
    const response = await env.fetch({
      subdomain: 'en',
      pathname: '/___funfunfun',
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toEqual(expect.stringContaining('funfunfun'))
  })

  describe('special paths where the cookie determines the backend', () => {
    describe.each(['/', '/search', '/spenden', '/license/detail/1'])(
      'URL = %p',
      (pathname) => {
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

            const env = localTestEnvironment()
            const response = await env.fetch({ subdomain: 'de', pathname })

            await expectBackend(response, backend)
          }
        )
      }
    )
  })

  describe('forwards authentication requests to legacy backend', () => {
    test.each([
      '/auth/login',
      '/auth/logout',
      '/auth/activate/12345678',
      '/auth/password/change',
      '/auth/password/restore/:token',
      '/auth/hydra/login',
      '/auth/hydra/consent',
      '/user/register',
    ])('URL = %p', async (pathname) => {
      const env = currentTestEnvironment()
      const response = await env.fetch({ subdomain: 'en', pathname })

      expect(response.headers.get('Set-Cookie')).not.toEqual(
        expect.stringContaining('useFrontend')
      )
    })
  })
})

test('Resports to sentry when frontend responded with redirect', async () => {
  setupProbabilityFor(Backend.Frontend)
  givenFrontend(redirectsTo('https://frontend.serlo.org/'))
  mockHttpGet('https://frontend.serlo.org/', returnsText('Hello World'))

  const env = localTestEnvironment()
  const response = await env.fetch({ subdomain: 'en', pathname: '/math' })

  expect(await response.text()).toBe('Hello World')
  expectSentryEvent({
    message: 'Frontend responded with a redirect',
    level: 'error',
    context: {
      backendUrl: env.createUrl({
        subdomain: 'frontend',
        pathname: '/en/math',
      }),
      responseUrl: 'https://frontend.serlo.org/',
    },
  })
})

test('Redirects of the legacy backend are always passed to the client', async () => {
  setupProbabilityFor(Backend.Legacy)

  const env = localTestEnvironment()
  const location = env.createUrl({
    subdomain: 'en',
    pathname: '/auth/hydra/login?login_challenge=foo',
  })
  givenSerlo(redirectsTo(location))

  const response = await env.fetch({
    subdomain: 'en',
    pathname: '/auth/hydra/login',
  })

  expectToBeRedirectTo(response, location, 302)
})

test('creates a copy of backend responses (otherwise there is an error in cloudflare)', async () => {
  const backendResponse = new Response('')
  global.fetch = jest.fn().mockResolvedValue(backendResponse)

  // There is not type checking for the main page and thus we do not need
  // to mock the api request here
  const response = await localTestEnvironment().fetch({ subdomain: 'en' })

  expect(response).not.toBe(backendResponse)
})

test('passes query string to backend', async () => {
  const response = await fetchBackend({
    backend: Backend.Legacy,
    pathname: '/search?q=Pythagoras',
  })

  expect(await response.text()).toEqual(expect.stringContaining('Pythagoras'))
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
    expect(ressponse.status).toBe(200)
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
    expect(response.status).toBe(200)
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

function fetchBackend({
  env = currentTestEnvironment(),
  pathname,
  subdomain = 'en',
  backend,
}: {
  env?: ReturnType<typeof currentTestEnvironment>
  pathname: string
  subdomain?: string
  backend: Backend
}) {
  const request = env.createRequest({ subdomain, pathname })
  const cookieValue = backend === Backend.Frontend ? '0' : '1.1'
  request.headers.set('Cookie', `useFrontend=${cookieValue}`)

  return env.fetchRequest(request)
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
  // Tests that backend headers are transfered to client
  expect(response.headers.get('x-powered-by')).toEqual(
    expect.stringContaining('PHP')
  )
}

async function expectFrontend(response: Response) {
  expect(await response.text()).toEqual(
    expect.stringContaining('<script id="__NEXT_DATA__"')
  )
  // Tests that backend headers are transfered to client
  expect(response.headers.get('x-vercel-cache')).toEqual('HIT')
}
