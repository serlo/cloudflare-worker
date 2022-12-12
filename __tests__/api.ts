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
import { givenUuid, currentTestEnvironment } from './__utils__'

const env = currentTestEnvironment()

beforeEach(() => {
  givenUuid({
    id: 23591,
    __typename: 'Page',
    alias: '/23591/math',
  })
})

test('calls to API are signed', async () => {
  const response = await fetchApi()

  // unsigned calls would result in an unseccessful response
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    data: { uuid: { __typename: 'Page', alias: '/23591/math', id: 23591 } },
  })
})

describe('setting of response header `Access-Control-Allow-Origin`', () => {
  let domain: string

  beforeAll(() => {
    domain = `https://${env.getDomain()}`
  })

  test('when `Origin` is not set, `Access-Control-Allow-Origin` defaults to the current domain', async () => {
    const response = await fetchApi()

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(domain)
  })

  test('when `Origin` is the current serlo domain, it is returned as as `Access-Control-Allow-Origin`', async () => {
    const response = await fetchApi({ headers: { Origin: domain } })

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(domain)
  })

  test('when `Origin` is a subdomain of the current serlo domain, this subdomain is returned as `Access-Control-Allow-Origin`', async () => {
    const subdomain = env.createUrl({ subdomain: 'de' })

    const response = await fetchApi({ headers: { Origin: subdomain } })

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(subdomain)
  })

  test('when `Origin` is not a subdomain of the current serlo domain, the current serlo domain is returned as `Access-Control-Allow-Origin`', async () => {
    const response = await fetchApi({
      headers: { Content: `https://verybad-${domain}` },
    })

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(domain)
  })
})

test('header `Vary` is set to `Origin` to avoid caching of requests', async () => {
  const response = await fetchApi()

  expect(response.headers.get('Vary')).toBe('Origin')
})

function fetchApi(args?: { headers?: RequestInit['headers'] }) {
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
