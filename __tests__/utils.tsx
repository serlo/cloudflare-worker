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

import { MockedRequest, rest } from 'msw'
import { h } from 'preact'

import { Template } from '../src/ui'
import {
  getCookieValue,
  sanitizeHtml,
  markdownToHtml,
  fetchWithCache,
  isInstance,
  createPreactResponse,
  createJsonResponse,
  createNotFoundResponse,
  getPathInfo,
  Instance,
} from '../src/utils'
import {
  expectContainsText,
  expectHasOkStatus,
  expectContentTypeIsHtml,
  expectIsJsonResponse,
  expectIsNotFoundResponse,
  mockKV,
  mockHttpGet,
  returnText,
  apiReturns,
  mockApi,
  returnMalformedJson,
  returnJson,
  returnBadRequest,
} from './__utils__'

describe('getCookieValue()', () => {
  describe('returns the cookie value of a given cookie header', () => {
    test('one cookie without semicolon in the end', () => {
      expect(getCookieValue('foo', 'foo=123')).toBe('123')
    })

    test('one cookie with semicolon in the end', () => {
      expect(getCookieValue('foo', 'foo=123;')).toBe('123')
    })

    test('multiple cookies', () => {
      expect(getCookieValue('foo', 'bar=1; foo=123; hey=a')).toBe('123')
    })

    test('cookie with empty definition', () => {
      expect(getCookieValue('foo', 'foo=; bar=1;')).toBe('')
    })
  })

  describe('return null if cookie was not defined in cookie header string', () => {
    test('multiple cookies without the cookie we are looking for', () => {
      expect(getCookieValue('foo', 'bar=1; hey=2;')).toBeNull()
    })

    test('cookie name is suffix of other cookie', () => {
      expect(getCookieValue('foo', 'foofoo=1;')).toBeNull()
    })

    test('empty cookie header string is given', () => {
      expect(getCookieValue('foo', '')).toBeNull()
    })
  })

  test('return null if cookie header string is null', () => {
    expect(getCookieValue('foo', null)).toBeNull()
  })
})

describe('getPathInfo()', () => {
  beforeEach(() => {
    mockKV('PATH_INFO_KV', {})
  })

  test('returns typename and currentPath from api.serlo.org', async () => {
    apiReturns({ __typename: 'Article', alias: '/current-path' })

    const pathInfo = await getPathInfo(Instance.En, '/path')

    expect(pathInfo).toEqual({
      typename: 'Article',
      currentPath: '/current-path',
    })
  })

  test('"currentPath" is given path when it does not refer to an entity', async () => {
    apiReturns({ __typename: 'ArticleRevision' })

    const pathInfo = await getPathInfo(Instance.En, '/path')

    expect(pathInfo).toEqual({
      typename: 'ArticleRevision',
      currentPath: '/path',
    })
  })

  describe('request to the api endpoint', () => {
    test('is signed', async () => {
      const apiRequest = await getApiRequest('/path')

      expect(apiRequest.headers.get('Authorization')).toMatch(/^Serlo Service/)
    })

    describe('contains right variables', () => {
      test.each([Instance.En, Instance.De])('lang = %p', async (lang) => {
        expect(await getApiVariables('/path', lang)).toEqual({
          alias: { instance: lang, path: '/path' },
        })
      })

      async function getApiVariables(path: string, lang = Instance.En) {
        const body = (await getApiRequest(path, lang))?.body as Record<
          string,
          unknown
        >

        return body.variables
      }
    })

    async function getApiRequest(
      path: string,
      lang = Instance.En
    ): Promise<MockedRequest> {
      let request!: MockedRequest

      global.server.use(
        rest.post(global.API_ENDPOINT, (req, res, ctx) => {
          request = req
          return res(ctx.json({ data: { __typename: 'Article', alias: path } }))
        })
      )

      await getPathInfo(lang, path)

      return request
    }
  })

  describe('returns null', () => {
    test('when there was an error with the api call', async () => {
      mockApi(returnBadRequest())

      expect(await getPathInfo(Instance.En, '/path')).toBeNull()
    })

    test('when api response is malformed JSON', async () => {
      mockApi(returnMalformedJson())

      expect(await getPathInfo(Instance.En, '/path')).toBeNull()
    })

    describe('when the response is not valid', () => {
      test.each([null, {}, { data: { uuid: {} } }])(
        'response = %p',
        async (response) => {
          mockApi(returnJson(response))

          expect(await getPathInfo(Instance.En, '/path')).toBeNull()
        }
      )
    })
  })

  describe('when path is a course', () => {
    test('"currentPath" is path of first course page', async () => {
      apiReturns({
        __typename: 'Course',
        alias: '/course',
        pages: [{ alias: '/course-page1' }, { alias: '/course-page2' }],
      })

      const pathInfo = await getPathInfo(Instance.En, '/course')

      expect(pathInfo).toEqual({
        typename: 'Course',
        currentPath: '/course-page1',
      })
    })

    test('"currentPath" is path of course when list of course pages is empty', async () => {
      apiReturns({ __typename: 'Course', alias: '/course', pages: [] })

      const pathInfo = await getPathInfo(Instance.En, '/course')

      expect(pathInfo).toEqual({
        typename: 'Course',
        currentPath: '/course',
      })
    })
  })

  describe('uses PATH_INFO_KV as a cache', () => {
    test('use value in cache', async () => {
      const cacheValue = { typename: 'Article', currentPath: '/current-path' }
      await global.PATH_INFO_KV.put('/en/path', JSON.stringify(cacheValue))

      const pathInfo = await getPathInfo(Instance.En, '/path')

      expect(pathInfo).toEqual({
        typename: 'Article',
        currentPath: '/current-path',
      })
    })

    test('saves values in cache for 1 hour', async () => {
      apiReturns({ __typename: 'Article', alias: '/current-path' })

      await getPathInfo(Instance.En, '/path')

      expect(await global.PATH_INFO_KV.get('/en/path')).toEqual(
        JSON.stringify({ typename: 'Article', currentPath: '/current-path' })
      )
    })

    test('cache key has maximum width of 512 characters by sha-1 hashing longer keys', async () => {
      const longTamilPath =
        '/%E0%AE%87%E0%AE%B2%E0%AE%95%E0%AF%8D%E0%AE%95%E0%AE%A3%E0' +
        '%AE%AE%E0%AF%8D/%E0%AE%85%E0%AE%9F%E0%AE%BF%E0%AE%AA%E0%AF%8D%E0' +
        '%AE%AA%E0%AE%9F%E0%AF%88-%E0%AE%87%E0%AE%B2%E0%AE%95%E0%AF%8D%E0' +
        '%AE%95%E0%AE%A3%E0%AE%AE%E0%AF%8D/%E0%AE%AE%E0%AF%8A%E0%AE%B4%E0' +
        '%AE%BF%E0%AE%AF%E0%AE%BF%E0%AE%A9%E0%AF%8D-%E0%AE%9A%E0%AF%8A%E0' +
        '%AE%B1%E0%AF%8D%E0%AE%AA%E0%AE%BE%E0%AE%95%E0%AF%81%E0%AE%AA%E0' +
        '%AE%BE%E0%AE%9F%E0%AF%81-%E0%AE%87%E0%AE%B2%E0%AE%95%E0%AF%8D%E0' +
        '%AE%95%E0%AE%BF%E0%AE%AF-%E0%AE%B5%E0%AE%95%E0%AF%88%E0%AE%95%E0' +
        '%AE%B3%E0%AF%8D'
      apiReturns({ __typename: 'Article', alias: longTamilPath })

      await getPathInfo(Instance.Ta, longTamilPath)

      const cacheKey = '23e2e346e649c466a41fabf38d7e8bf03333b007'
      expect(await global.PATH_INFO_KV.get(cacheKey)).toEqual(
        JSON.stringify({ typename: 'Article', currentPath: longTamilPath })
      )
    })

    describe('ignores malformed cache values', () => {
      const target = { typename: 'Article', currentPath: '/current-path' }

      beforeEach(() => {
        apiReturns({ __typename: 'Article', alias: '/current-path' })
      })

      test('when cached value is malformed JSON', async () => {
        await global.PATH_INFO_KV.put('/en/path', 'malformed json')

        const pathInfo = await getPathInfo(Instance.En, '/path')

        expect(pathInfo).toEqual(target)
        expect(await global.PATH_INFO_KV.get('/en/path')).toEqual(
          JSON.stringify(target)
        )
      })

      test('when cached value is no PathInfo', async () => {
        const malformedPathInfo = JSON.stringify({ typename: 'Course' })
        await global.PATH_INFO_KV.put('/en/path', malformedPathInfo)

        const pathInfo = await getPathInfo(Instance.En, '/path')

        expect(pathInfo).toEqual(target)
        expect(await global.PATH_INFO_KV.get('/en/path')).toEqual(
          JSON.stringify(target)
        )
      })
    })
  })
})

describe('isInstance()', () => {
  expect(isInstance('de')).toBe(true)
  expect(isInstance('fr')).toBe(true)

  expect(isInstance('serlo')).toBe(false)
  expect(isInstance('EN_EN')).toBe(false)
  expect(isInstance('')).toBe(false)
})

describe('sanitizeHtml()', () => {
  test.each([
    ['<p>Hello</p>\n\n<script>42;</script>\n', '<p>Hello</p>'],
    [
      '<h1 id="test":>Hello</h1><iframe src="https://google.de/" />',
      '<h1>Hello</h1>',
    ],
    ['console.log(42)\n   ', 'console.log(42)'],
  ])('HTML-Code %p', (html, sanitizedHtml) => {
    expect(sanitizeHtml(html)).toBe(sanitizedHtml)
  })
})

describe('markdownToHtml()', () => {
  test.each([
    ['# Hello', '<h1>Hello</h1>'],
    ['* 1\n* 2', '<ul>\n<li>1</li>\n<li>2</li>\n</ul>'],
    ['', ''],
  ])('Markdown: %p', (markdown, html) => {
    expect(markdownToHtml(markdown)).toBe(html)
  })
})

test('PreactResponse', async () => {
  const hello = createPreactResponse(<h1>Hello</h1>)

  expectHasOkStatus(hello)
  expectContentTypeIsHtml(hello)
  await expectContainsText(hello, ['<h1>Hello</h1>'])

  const template = (
    <Template title="not modified" lang="en">
      <p>Not Modified</p>
    </Template>
  )

  const notModified = createPreactResponse(template, { status: 304 })

  expect(notModified.status).toBe(304)
  expectContentTypeIsHtml(notModified)
  await expectContainsText(notModified, [
    '<p>Not Modified</p>',
    '<title>Serlo - not modified</title>',
  ])
})

test('JsonResponse', async () => {
  const response = createJsonResponse({ foo: [1, 2, 3] })
  await expectIsJsonResponse(response, { foo: [1, 2, 3] })
})

test('NotFoundResponse', async () => {
  await expectIsNotFoundResponse(createNotFoundResponse())
})

describe('fetchWithCache()', () => {
  test('returns the result of fetch()', async () => {
    mockHttpGet('http://example.com/', returnText('test'))

    const response = await fetchWithCache('http://example.com/')

    expect(await response.text()).toBe('test')
  })

  test('responses are cached for 1 hour', async () => {
    mockHttpGet('http://example.com/', returnText(''))

    await fetchWithCache('http://example.com/')

    expect(fetch).toHaveBeenCalledWith('http://example.com/', {
      cf: { cacheTtl: 3600 },
    })
  })
})
