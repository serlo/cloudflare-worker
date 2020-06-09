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

import { h } from 'preact'

import { Template } from '../src/ui'
import {
  convertTo,
  sanitizeHtml,
  markdownToHtml,
  fetchWithCache,
  isLanguageCode,
  isNotNullable,
  createPreactResponse,
  createJsonResponse,
  createNotFoundResponse,
} from '../src/utils'
import {
  mockFetch,
  expectContainsText,
  expectHasOkStatus,
  expectContentTypeIsHtml,
  expectIsJsonResponse,
  expectIsNotFoundResponse,
} from './_helper'

describe('isLanguageCode()', () => {
  expect(isLanguageCode('de')).toBe(true)
  expect(isLanguageCode('fr')).toBe(true)

  expect(isLanguageCode('serlo')).toBe(false)
  expect(isLanguageCode('EN_EN')).toBe(false)
  expect(isLanguageCode('')).toBe(false)
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

test('JsonResponse', () => {
  const response = createJsonResponse({ foo: [1, 2, 3] })
  expectIsJsonResponse(response, { foo: [1, 2, 3] })
})

test('NotFoundResponse', async () => {
  await expectIsNotFoundResponse(createNotFoundResponse())
})

describe('fetchWithCache()', () => {
  test('returns the result of fetch()', async () => {
    mockFetch({ 'http://example.com/': 'test' })

    const response = await fetchWithCache('http://example.com/')

    expect(await response.text()).toBe('test')
  })

  test('responses are cached for 1 hour', async () => {
    const mockedFetch = mockFetch({ 'http://example.com/': '' })

    await fetchWithCache('http://example.com/')

    expect(mockedFetch.getCallArgumentsFor('http://example.com/')).toEqual([
      'http://example.com/',
      { cf: { cacheTtl: 3600 } },
    ])
  })
})

describe('convertTo()', () => {
  type Foo = 'foo'

  function isFoo(value: unknown): value is Foo {
    return value === 'foo'
  }

  test('returns argument if it fulfills the type guard', () => {
    expect(convertTo(isFoo, 'foo')).toBe('foo')
  })

  test('returns null if argument does not fulfill the type guard', () => {
    expect(convertTo(isFoo, 'bar')).toBeNull()
  })
})

describe('isNotNullable()', () => {
  test('returns false for null', () => {
    expect(isNotNullable(null)).toBe(false)
  })

  test('returns false for undefined', () => {
    expect(isNotNullable(undefined)).toBe(false)
  })

  test('returns true for all other values', () => {
    expect(isNotNullable([])).toBe(true)
    expect(isNotNullable({})).toBe(true)
    expect(isNotNullable('')).toBe(true)
    expect(isNotNullable(true)).toBe(true)
    expect(isNotNullable(1)).toBe(true)
  })
})
