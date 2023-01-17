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
import {
  givenUuid,
  currentTestEnvironment,
  currentTestEnvironmentWhen,
} from './__utils__'

const currentEnv = currentTestEnvironment()

beforeEach(() => {
  givenUuid({
    id: 23591,
    __typename: 'Page',
    alias: '/23591/mathematics-homepage',
  })
})

test('calls to API are signed', async () => {
  const response = await fetchApi()

  // unsigned calls would result in an unsuccessful response
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    data: {
      uuid: {
        __typename: 'Page',
        alias: '/23591/mathematics-homepage',
        id: 23591,
      },
    },
  })
})

describe('setting of response header `Access-Control-Allow-Origin`', () => {
  const currentDomain = `https://${currentEnv.getDomain()}`
  const subdomainOfCurrentDomain = `https://de.${currentEnv.getDomain()}`

  test('when `Origin` is not set, `Access-Control-Allow-Origin` defaults to the current serlo domain', async () => {
    const response = await fetchApi()

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      currentDomain
    )
  })

  test.each([
    currentDomain,
    subdomainOfCurrentDomain,
    currentEnv.createUrl({ pathname: '/', protocol: 'http' }),
    currentEnv.createUrl({ pathname: '/', subdomain: 'de' }),
    currentEnv.createUrl({ pathname: '/foo', subdomain: 'ta' }),
  ])(
    'when `Origin` is `%s`, the same value is returned as `Access-Control-Allow-Origin`',
    async (origin) => {
      const response = await fetchApi({
        headers: origin ? { Origin: origin } : {},
      })

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    }
  )

  describe('when `Origin` is from within the current serlo domain, the same value is returned as `Access-Control-Allow-Origin`', () => {
    test.each([
      currentDomain,
      subdomainOfCurrentDomain,
      currentEnv.createUrl({ pathname: '/', protocol: 'http' }),
      currentEnv.createUrl({ pathname: '/', subdomain: 'de' }),
      currentEnv.createUrl({ pathname: '/foo', subdomain: 'ta' }),
    ])('when `Origin` is `%s`', async (origin) => {
      const response = await fetchApi({
        headers: origin ? { Origin: origin } : {},
      })
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    })
  })

  describe('when CORS is sent from the local frontend development or preview deployment', () => {
    const domains = [
      'http://localhost:3000',
      'https://frontend-7md9ymhyw-serlo.vercel.app',
    ]

    describe('when we are in the staging environment, the same value is sent back in `Access-Control-Allow-Origin`', () => {
      test.each(domains)('when `Origin` is `%s`', async (origin) => {
        global.ENVIRONMENT = 'staging'

        const response = await fetchApi(
          { headers: { Origin: origin } },
          currentTestEnvironmentWhen((conf) => conf.ENVIRONMENT === 'staging')
        )

        expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
      })
    })

    describe('when we are in the production environment, the current domain is sent back in `Access-Control-Allow-Origin`', () => {
      test.each(domains)('when `Origin` is `%s`', async (origin) => {
        global.ENVIRONMENT = 'production'
        const env = currentTestEnvironmentWhen(
          (conf) => conf.ENVIRONMENT === 'production'
        )

        const response = await fetchApi({ headers: { Origin: origin } }, env)

        expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
          `https://${env.getDomain()}`
        )
      })
    })
  })

  describe('when `Origin` is not from the current serlo domain, the current serlo domain is returned as `Access-Control-Allow-Origin`', () => {
    test.each([
      `http://verybad-${currentEnv.getDomain()}`,
      '*',
      'null',
      'http//invalid-url',
    ])('when `Origin` is `%s`', async (origin) => {
      const response = await fetchApi({
        headers: origin ? { Origin: origin } : {},
      })

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        currentDomain
      )
    })
  })
})

test('header `Vary` is set to `Origin` to avoid caching of requests', async () => {
  const response = await fetchApi()

  expect(response.headers.get('Vary')).toContain('Origin')
})

function fetchApi(
  args?: { headers?: RequestInit['headers'] },
  env = currentEnv
) {
  const { headers = {} } = args ?? {}
  const query = `
    query($alias: AliasInput) {
      uuid(alias: $alias) {
        __typename
        id
        ... on Page {
          alias
        }
      }
    }
  `

  return env.fetch(
    { subdomain: 'api', pathname: '/graphql' },
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({
        query,
        variables: { alias: { instance: 'de', path: '/23591' } },
      }),
    }
  )
}
