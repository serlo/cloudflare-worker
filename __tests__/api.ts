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
import { api, fetchApi } from '../src/api'
import { mockFetch, FetchMock } from './_helper'

describe('api()', () => {
  let fetchApi: FetchMock

  beforeEach(() => {
    fetchApi = mockFetch({ 'https://api.serlo.org/graphql': '<api-result>' })
  })

  test('uses fetchApi() for requests to the serlo api', async () => {
    const req = new Request('https://api.serlo.org/graphql')
    const response = (await api(req, fetchApi.mock)) as Response

    expect(await response.text()).toBe('<api-result>')
    expect(fetchApi).toHaveExactlyOneRequestTo('https://api.serlo.org/graphql')
  })

  describe('returns null if subdomain is not "api"', () => {
    test('url without subdomain', async () => {
      const response = await api(new Request('https://serlo.org/graphql'))

      expect(response).toBeNull()
      expect(fetchApi.mock).not.toHaveBeenCalled()
    })

    test('url without subdomain different than "api"', async () => {
      const response = await api(new Request('https://stats.serlo.org/graphql'))

      expect(response).toBeNull()
      expect(fetchApi.mock).not.toHaveBeenCalled()
    })
  })

  test('returns null if path is not /graphql', async () => {
    const response = await api(new Request('https://api.serlo.org/something'))

    expect(response).toBeNull()
    expect(fetchApi.mock).not.toHaveBeenCalled()
  })
})

describe('fetchApi()', () => {
  let fetch: FetchMock
  let response: Response

  beforeAll(async () => {
    global.API_SECRET = 'my-secret'

    fetch = mockFetch({ 'https://api.serlo.org/': '{ "result": 42 }' })
    response = await fetchApi('https://api.serlo.org/', {
      headers: { 'Content-Type': 'application/json' },
    })
  })

  test('returns the result of fetch()', async () => {
    expect(await response.text()).toBe('{ "result": 42 }')
  })

  test('transfers meta data to fetch()', () => {
    const apiRequest = fetch.getRequestTo('https://api.serlo.org/')

    expect(apiRequest.headers.get('Content-Type')).toBe('application/json')
  })

  test('sets authorization header', () => {
    const apiRequest = fetch.getRequestTo('https://api.serlo.org/')

    expect(apiRequest.headers.get('Authorization')).toMatch(/^Serlo Service=ey/)
  })
})
