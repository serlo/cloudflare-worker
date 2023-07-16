import { h } from 'preact'

import {
  expectContainsText,
  expectContentTypeIsHtml,
  expectIsJsonResponse,
  expectIsNotFoundResponse,
  givenApi,
  givenUuid,
  hasInternalServerError,
  returnsMalformedJson,
  returnsJson,
} from './__utils__'
import {
  getCookieValue,
  sanitizeHtml,
  markdownToHtml,
  isInstance,
  createPreactResponse,
  createJsonResponse,
  createNotFoundResponse,
  getPathInfo,
  Instance,
  toCacheKey,
} from '../src/utils'

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
  describe('returns null', () => {
    test('when there was an error with the api call', async () => {
      givenApi(hasInternalServerError())

      expect(await getPathInfo(Instance.En, '/path')).toBeNull()
    })

    test('when api response is malformed JSON', async () => {
      givenApi(returnsMalformedJson())

      expect(await getPathInfo(Instance.En, '/path')).toBeNull()
    })

    describe('when the response is not valid', () => {
      test.each([null, {}, { data: { uuid: {} } }])(
        'response = %p',
        async (invalidResponse) => {
          givenApi(returnsJson(invalidResponse))

          expect(await getPathInfo(Instance.En, '/path')).toBeNull()
        },
      )
    })
  })

  describe('uses PATH_INFO_KV as a cache', () => {
    test('use value in cache', async () => {
      const cacheValue = { typename: 'Article', currentPath: '/current-path' }
      await globalThis.PATH_INFO_KV.put(
        await toCacheKey('/en/path'),
        JSON.stringify(cacheValue),
      )

      const pathInfo = await getPathInfo(Instance.En, '/path')

      expect(pathInfo).toEqual({
        typename: 'Article',
        currentPath: '/current-path',
      })
    })

    test('saves values in cache for 1 hour', async () => {
      givenUuid({
        __typename: 'Article',
        alias: '/current-path',
        id: 42,
      })

      await getPathInfo(Instance.En, '/42')

      expect(
        await globalThis.PATH_INFO_KV.get(await toCacheKey('/en/42')),
      ).toEqual(
        JSON.stringify({ typename: 'Article', currentPath: '/current-path' }),
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
      givenUuid({
        __typename: 'Article',
        alias: decodeURIComponent(longTamilPath),
        instance: Instance.Ta,
      })

      const pathInfo = await getPathInfo(Instance.Ta, longTamilPath)

      expect(pathInfo).toEqual({
        typename: 'Article',
        currentPath: longTamilPath,
        instance: Instance.Ta,
      })
    })

    describe('ignores malformed cache values', () => {
      const target = { typename: 'Article', currentPath: '/current-path' }

      beforeEach(() => {
        givenUuid({
          __typename: 'Article',
          alias: '/current-path',
          id: 42,
        })
      })

      test('when cached value is malformed JSON', async () => {
        await globalThis.PATH_INFO_KV.put(
          await toCacheKey('/en/42'),
          'malformed json',
        )

        const pathInfo = await getPathInfo(Instance.En, '/42')

        expect(pathInfo).toEqual(target)
        expect(
          await globalThis.PATH_INFO_KV.get(await toCacheKey('/en/42')),
        ).toEqual(JSON.stringify(target))
      })

      test('when cached value is no PathInfo', async () => {
        const malformedPathInfo = JSON.stringify({ typename: 'Course' })
        await globalThis.PATH_INFO_KV.put(
          await toCacheKey('/en/42'),
          malformedPathInfo,
        )

        const pathInfo = await getPathInfo(Instance.En, await toCacheKey('/42'))

        expect(pathInfo).toEqual(target)
        expect(
          await globalThis.PATH_INFO_KV.get(await toCacheKey('/en/42')),
        ).toEqual(JSON.stringify(target))
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

  expect(hello.status).toBe(200)
  expectContentTypeIsHtml(hello)
  await expectContainsText(hello, ['<h1>Hello</h1>'])
})

test('JsonResponse', async () => {
  const response = createJsonResponse({ foo: [1, 2, 3] })
  await expectIsJsonResponse(response, { foo: [1, 2, 3] })
})

test('NotFoundResponse', async () => {
  await expectIsNotFoundResponse(createNotFoundResponse())
})
