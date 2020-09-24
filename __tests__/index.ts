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
  mockKV,
  serverMock,
  returnResponseText,
  returnResponseJson,
  returnResponseApi,
} from './_helper'

describe('Enforce HTTPS', () => {
  test('HTTP URL', async () => {
    const response = await handleUrl('http://foo.serlo.local/bar')

    expectToBeRedirectTo(response, 'https://foo.serlo.local/bar', 302)
  })

  test('HTTPS URL', async () => {
    serverMock('https://foo.serlo.local/bar', returnResponseText(''))

    await handleUrl('https://foo.serlo.local/bar')

    expect(fetch).toHaveExactlyOneRequestTo('https://foo.serlo.local/bar')
  })

  test('Pact Broker', async () => {
    serverMock('http://pacts.serlo.local/bar', returnResponseText(''))

    await handleUrl('http://pacts.serlo.local/bar')

    expect(fetch).toHaveExactlyOneRequestTo('http://pacts.serlo.local/bar')
  })
})

describe('Redirects', () => {
  test('start.serlo.org', async () => {
    const response = await handleUrl('https://start.serlo.local/')

    const target =
      'https://docs.google.com/document/d/1qsgkXWNwC-mcgroyfqrQPkZyYqn7m1aimw2gwtDTmpM/'
    expectToBeRedirectTo(response, target, 301)
  })

  test('de.serlo.org/labschool', async () => {
    const response = await handleUrl('https://de.serlo.local/labschool')

    expectToBeRedirectTo(response, 'https://labschool.serlo.local/', 301)
  })

  test('de.serlo.org/hochschule', async () => {
    const response = await handleUrl('https://de.serlo.local/hochschule')

    const target = 'https://de.serlo.local/mathe/universitaet/44323'
    expectToBeRedirectTo(response, target, 301)
  })

  test('de.serlo.org/beitreten', async () => {
    const response = await handleUrl('https://de.serlo.local/beitreten')

    const target =
      'https://docs.google.com/forms/d/e/1FAIpQLSdEoyCcDVP_G_-G_u642S768e_sxz6wO6rJ3tad4Hb9z7Slwg/viewform'
    expectToBeRedirectTo(response, target, 301)
  })

  test('serlo.org/*', async () => {
    const response = await handleUrl('https://serlo.local/foo')

    expectToBeRedirectTo(response, 'https://de.serlo.local/foo', 302)
  })

  test('www.serlo.org/*', async () => {
    const response = await handleUrl('https://www.serlo.local/foo')

    expectToBeRedirectTo(response, 'https://de.serlo.local/foo', 302)
  })

  describe('redirects to current path of an resource', () => {
    beforeEach(() => {
      global.API_ENDPOINT = 'https://api.serlo.org/graphql'
    })

    test('redirects when current path is different than given path', async () => {
      serverMock(
        'https://api.serlo.org/graphql',
        returnResponseApi({
          uuid: { __typename: 'Article', alias: '/current-path' },
        })
      )

      const response = await handleUrl('https://en.serlo.org/path')

      expectToBeRedirectTo(response, 'https://en.serlo.org/current-path', 301)
    })

    test('no redirect when current path is different than given path and XMLHttpRequest', async () => {
      serverMock(
        'https://en.serlo.org/path',
        returnResponseText('article content')
      )
      serverMock(
        'https://api.serlo.org/graphql',
        returnResponseApi({
          uuid: { __typename: 'Article', alias: '/current-path' },
        })
      )

      const response = await handleRequest(
        new Request('https://en.serlo.org/path', {
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
          },
        })
      )

      expect(await response.text()).toBe('article content')
    })

    test('no redirect when current path is the same as given path', async () => {
      serverMock(
        'https://en.serlo.org/path',
        returnResponseText('article content')
      )
      serverMock(
        'https://api.serlo.org/graphql',
        returnResponseApi({ uuid: { __typename: 'Article', alias: '/path' } })
      )

      const response = await handleUrl('https://en.serlo.org/path')

      expect(await response.text()).toBe('article content')
    })

    test('no redirect when current path cannot be requested', async () => {
      serverMock(
        'https://api.serlo.org/graphql',
        returnResponseText('malformed json')
      )

      const response = await handleUrl('https://en.serlo.org/path')

      expect(await response.text()).toBe('article content')
    })

    describe('handles URL encodings correctly', () => {
      test('API result is URL encoded', async () => {
        serverMock(
          'https://de.serlo.org/größen',
          returnResponseApi({
            uuid: { __typename: 'Article', alias: '/gr%C3%B6%C3%9Fen' },
          })
        )

        const response = await handleUrl('https://de.serlo.org/größen')

        expect(await response.text()).toBe('article content')
      })

      test('API result is not URL encoded', async () => {
        serverMock(
          'https://de.serlo.org/größen',
          returnResponseJson({
            data: { uuid: { __typename: 'Article', alias: '/größen' } },
          })
        )

        const response = await handleUrl('https://de.serlo.org/größen')

        expect(await response.text()).toBe('article content')
      })
    })
  })
})

describe('Semantic file names', () => {
  test('assets.serlo.org/meta/*', async () => {
    serverMock('https://assets.serlo.org/meta/foo', returnResponseText(''))

    await handleUrl('https://assets.serlo.local/meta/foo')

    expect(fetch).toHaveExactlyOneRequestTo('https://assets.serlo.org/meta/foo')
  })

  test('assets.serlo.org/<hash>/<fileName>.<ext>', async () => {
    serverMock('https://assets.serlo.org/hash.ext', returnResponseText(''))

    await handleUrl('https://assets.serlo.local/hash/fileName.ext')

    expect(fetch).toHaveExactlyOneRequestTo('https://assets.serlo.org/hash.ext')
  })

  test('assets.serlo.org/legacy/<hash>/<fileName>.<ext>', async () => {
    serverMock(
      'https://assets.serlo.org/legacy/hash.ext',
      returnResponseText('')
    )

    await handleUrl('https://assets.serlo.local/legacy/hash/fileName.ext')

    const target = 'https://assets.serlo.org/legacy/hash.ext'
    expect(fetch).toHaveExactlyOneRequestTo(target)
  })
})

describe('Packages', () => {
  test('packages.serlo.org/<package>/<filePath>', async () => {
    serverMock(
      'https://packages.serlo.org/foo@1.0.0/bar',
      returnResponseText('')
    )

    await handleUrl('https://packages.serlo.local/foo/bar')

    const target = 'https://packages.serlo.org/foo@1.0.0/bar'
    expect(fetch).toHaveExactlyOneRequestTo(target)
  })

  test('packages.serlo.org/<package>/<filePath> (invalid)', async () => {
    serverMock('https://packages.serlo.org/foobar/bar', returnResponseText(''))

    await handleUrl('https://packages.serlo.local/foobar/bar')

    const target = 'https://packages.serlo.org/foobar/bar'
    expect(fetch).toHaveExactlyOneRequestTo(target)
  })
})

async function handleUrl(url: string): Promise<Response> {
  return await handleRequest(new Request(url))
}

function expectToBeRedirectTo(response: Response, url: string, status: number) {
  expect(response.headers.get('Location')).toBe(url)
  expect(response.status).toBe(status)
}
