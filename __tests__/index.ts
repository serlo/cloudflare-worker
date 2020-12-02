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
  mockHttpGet,
  returnsText,
  givenUuid,
  givenApi,
  returnsMalformedJson,
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

describe('Redirects', () => {
  test('start.serlo.org', async () => {
    const response = await handleUrl('https://start.serlo.local/')

    const target =
      'https://docs.google.com/document/d/1qsgkXWNwC-mcgroyfqrQPkZyYqn7m1aimw2gwtDTmpM/'
    expectToBeRedirectTo(response, target, 301)
  })

  test.each(['/labschool', '/labschool/'])('serlo.org%s', async (path) => {
    const response = await handleUrl(`https://de.serlo.local${path}`)

    expectToBeRedirectTo(response, 'https://labschool.serlo.local/', 301)
  })

  test.each(['/hochschule', '/hochschule/'])('serlo.org%s', async (path) => {
    const response = await handleUrl(`https://de.serlo.local${path}`)

    const target = 'https://de.serlo.local/mathe/universitaet/44323'
    expectToBeRedirectTo(response, target, 301)
  })

  test.each(['/beitreten', '/beitreten/'])('serlo.org%s', async (path) => {
    const response = await handleUrl(`https://de.serlo.local${path}`)

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
      givenUuid({
        id: 78337,
        __typename: 'Page',
        oldAlias: '/sexed',
        alias: '/sex-ed',
        instance: 'en',
      })
    })

    test('redirects when current path is different than target path', async () => {
      const response = await handleUrl('https://en.serlo.org/sexed')

      expectToBeRedirectTo(response, 'https://en.serlo.org/sex-ed', 301)
    })

    test('redirects when current instance is different than target instance', async () => {
      const response = await handleUrl('https://de.serlo.org/78337')

      expectToBeRedirectTo(response, 'https://en.serlo.org/sex-ed', 301)
    })

    test('no redirect when current path is different than given path and XMLHttpRequest', async () => {
      mockHttpGet('https://en.serlo.org/sexed', returnsText('article content'))

      const request = new Request('https://en.serlo.org/sexed', {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
      const response = await handleRequest(request)

      expect(await response.text()).toBe('article content')
    })

    test('no redirect when current path is the same as given path', async () => {
      mockHttpGet('https://en.serlo.org/sex-ed', returnsText('article content'))

      const response = await handleUrl('https://en.serlo.org/sex-ed')

      expect(await response.text()).toBe('article content')
    })

    test('no redirect when requested entity has no alias', async () => {
      givenUuid({ id: 128620, __typename: 'ArticleRevision' })
      mockHttpGet('https://de.serlo.org/128620', returnsText('article content'))

      const response = await handleUrl('https://de.serlo.org/128620')

      expect(await response.text()).toBe('article content')
    })

    test('redirects to first course page when requested entity is empty', async () => {
      givenUuid({
        id: 61682,
        __typename: 'Course',
        alias:
          '/mathe/zahlen-gr%C3%B6%C3%9Fen/zahlenmengen%2C-rechenausdr%C3%BCcke-allgemeine-rechengesetze/zahlen/zahlenmengen-zahlengerade/ganze-zahlen',
        pages: [
          {
            alias:
              '/mathe/zahlen-gr%C3%B6%C3%9Fen/zahlenmengen%2C-rechenausdr%C3%BCcke-allgemeine-rechengesetze/zahlen/zahlenmengen-zahlengerade/ganze-zahlen/%C3%9Cbersicht',
          },
          {
            alias:
              '/mathe/zahlen-gr%C3%B6%C3%9Fen/zahlenmengen%2C-rechenausdr%C3%BCcke-allgemeine-rechengesetze/zahlen/zahlenmengen-zahlengerade/ganze-zahlen/negative-zahlen-alltag',
          },
        ],
      })

      const response = await handleUrl('https://de.serlo.org/61682')

      expectToBeRedirectTo(
        response,
        'https://de.serlo.org/mathe/zahlen-gr%C3%B6%C3%9Fen/zahlenmengen%2C-rechenausdr%C3%BCcke-allgemeine-rechengesetze/zahlen/zahlenmengen-zahlengerade/ganze-zahlen/%C3%9Cbersicht',
        301
      )
    })

    test('redirects to alias of course when list of course pages is empty', async () => {
      // TODO: Find an empty course at serlo.org
      givenUuid({
        id: 42,
        __typename: 'Course',
        alias: '/course',
        pages: [],
      })

      const response = await handleUrl('https://en.serlo.org/42')

      expectToBeRedirectTo(response, 'https://en.serlo.org/course', 301)
    })

    test('no redirect when current path cannot be requested', async () => {
      givenApi(returnsMalformedJson())

      mockHttpGet('https://en.serlo.org/path', returnsText('article content'))

      const response = await handleUrl('https://en.serlo.org/path')

      expect(await response.text()).toBe('article content')
    })

    test('handles URL encodings correctly', async () => {
      givenUuid({
        __typename: 'TaxonomyTerm',
        alias: '/mathe/zahlen-größen/größen-einheiten',
      })
      mockHttpGet(
        'https://de.serlo.org/mathe/zahlen-gr%C3%B6%C3%9Fen',
        returnsText('article content')
      )

      const response = await handleUrl(
        'https://de.serlo.org/mathe/zahlen-größen'
      )

      expect(await response.text()).toBe('article content')
    })
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
    mockKV('PACKAGES_KV', { foo: 'foo@1.0.0' })
    mockHttpGet(
      'https://packages.serlo.org/foo@1.0.0/bar',
      returnsText('content')
    )

    const response = await handleUrl('https://packages.serlo.local/foo/bar')

    expect(await response.text()).toBe('content')
  })

  test('packages.serlo.org/<package>/<filePath> (invalid)', async () => {
    mockKV('PACKAGES_KV', { foo: 'foo@1.0.0' })
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
