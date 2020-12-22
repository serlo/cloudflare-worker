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
import {
  createKV,
  mockHttpGet,
  returnsText,
  givenStats,
  defaultStatsServer,
} from './__utils__'

describe('Enforce HTTPS', () => {
  test('HTTP URL', async () => {
    const response = await handleUrl('http://foo.serlo.local/bar')

    expectToBeRedirectTo(response, 'https://foo.serlo.local/bar', 302)
  })

  test('HTTPS URL', async () => {
    mockHttpGet('https://foo.serlo.local/bar', returnsText('content'))

    const response = await handleUrl('https://foo.serlo.local/bar')

    expect(await response.text()).toBe('content')
  })

  test('Pact Broker', async () => {
    mockHttpGet('http://pacts.serlo.local/bar', returnsText('content'))

    const response = await handleUrl('http://pacts.serlo.local/bar')

    expect(await response.text()).toBe('content')
  })
})

describe('Semantic file names', () => {
  test('assets.serlo.org/meta/*', async () => {
    mockHttpGet('https://assets.serlo.org/meta/foo', returnsText('content'))

    const response = await handleUrl('https://assets.serlo.local/meta/foo')

    expect(await response.text()).toBe('content')
  })

  test('assets.serlo.org/<hash>/<fileName>.<ext>', async () => {
    mockHttpGet('https://assets.serlo.org/hash.ext', returnsText('image'))

    const response = await handleUrl(
      'https://assets.serlo.local/hash/fileName.ext'
    )

    expect(await response.text()).toBe('image')
  })

  test('assets.serlo.org/legacy/<hash>/<fileName>.<ext>', async () => {
    mockHttpGet(
      'https://assets.serlo.org/legacy/hash.ext',
      returnsText('image')
    )

    const response = await handleUrl(
      'https://assets.serlo.local/legacy/hash/fileName.ext'
    )

    expect(await response.text()).toBe('image')
  })
})

describe('Packages', () => {
  test('packages.serlo.org/<package>/<filePath>', async () => {
    global.PACKAGES_KV.put('foo', 'foo@1.0.0')
    mockHttpGet(
      'https://packages.serlo.org/foo@1.0.0/bar',
      returnsText('content')
    )

    const response = await handleUrl('https://packages.serlo.local/foo/bar')

    expect(await response.text()).toBe('content')
  })

  test('packages.serlo.org/<package>/<filePath> (invalid)', async () => {
    global.PACKAGES_KV.put('foo', 'foo@1.0.0')
    mockHttpGet('https://packages.serlo.org/foobar/bar', returnsText('content'))

    const response = await handleUrl('https://packages.serlo.local/foobar/bar')

    expect(await response.text()).toBe('content')
  })
})

describe('HTTPS requests to stats.serlo.org are not altered', () => {
  beforeEach(() => {
    givenStats(defaultStatsServer())
  })

  test('when url is https://stats.serlo.org/', async () => {
    const response = await handleUrl('https://stats.serlo.org/')

    // TODO: msw seems to make automatically a redirect here which we
    // won't have in the cloudflare worker. Look for a way to change the next
    // line to:
    //
    // expectToBeRedirectTo(response, '/login', 302)
    expect(response.url).toBe('https://stats.serlo.org/login')
  })

  test('when url is https://stats.serlo.org/login', async () => {
    const response = await handleUrl('https://stats.serlo.org/login')

    expect(await response.text()).toEqual(
      expect.stringContaining('<title>Grafana</title>')
    )
  })
})

async function handleUrl(url: string): Promise<Response> {
  return await handleRequest(new Request(url))
}

function expectToBeRedirectTo(response: Response, url: string, status: number) {
  expect(response.headers.get('Location')).toBe(url)
  expect(response.status).toBe(status)
}
