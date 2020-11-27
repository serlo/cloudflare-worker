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
import { handleRequest } from '../src'
import { api, fetchApi } from '../src/api'
import { mockHttpGet } from './__utils__'

describe('api calls', () => {
  test('get a signature', async () => {
    global.apiServer.uuids.push({
      id: 23591,
      __typename: 'Page',
      alias: '/math',
    })

    const req = new Request(global.API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variables: { alias: { path: '/23591' } } }),
    })
    const response = await handleRequest(req)

    expect(response.statusText).toBe('OK')
    expect(await response.json()).toEqual({
      data: { uuid: { __typename: 'Page', alias: '/math' } },
    })
  })
})

describe('api()', () => {
  describe('returns null if subdomain is not "api"', () => {
    test('url without subdomain', async () => {
      const response = await api(new Request('https://serlo.org/graphql'))

      expect(response).toBeNull()
    })

    test('url without subdomain different than "api"', async () => {
      const response = await api(new Request('https://stats.serlo.org/graphql'))

      expect(response).toBeNull()
    })
  })

  test('returns null if path is not /graphql', async () => {
    const response = await api(new Request('https://api.serlo.org/something'))

    expect(response).toBeNull()
  })
})

describe('fetchApi()', () => {
  test('returns the result of fetch()', async () => {
    global.API_SECRET = 'my-secret'

    mockHttpGet('https://api.serlo.org/', (req, res, ctx) => {
      if (req.headers.get('Content-Type') !== 'application/json')
        return res(ctx.status(415))
      if (!req.headers.get('Authorization')?.match(/^Serlo Service=ey/))
        return res(ctx.status(401))

      return res.once(ctx.json({ result: 42 }))
    })

    const request = new Request('https://api.serlo.org/', {
      headers: { 'Content-Type': 'application/json' },
    })
    const response = await fetchApi(request)

    expect(await response.text()).toBe('{"result":42}')
  })
})
