/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2013-2020 Serlo Education e.V.
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
 * @copyright Copyright (c) 2013-2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link     https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import {
  sanitizeHtml,
  markdownToHtml,
  ALL_LANGUAGE_CODES,
  isLanguageCode
} from '../src/utils'

test('ALL_LANGUAGE_CODES', () => {
  expect(ALL_LANGUAGE_CODES.length).toBeGreaterThan(0)
})

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
      '<h1>Hello</h1>'
    ],
    ['console.log(42)\n   ', 'console.log(42)']
  ])('HTML-Code %p', (html, sanitizedHtml) => {
    expect(sanitizeHtml(html)).toBe(sanitizedHtml)
  })
})

describe('markdownToHtml()', () => {
  test.each([
    ['# Hello', '<h1>Hello</h1>'],
    ['* 1\n* 2', '<ul>\n<li>1</li>\n<li>2</li>\n</ul>'],
    ['', '']
  ])('Markdown: %p', (markdown, html) => {
    expect(markdownToHtml(markdown)).toBe(html)
  })
})
