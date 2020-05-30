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
import {
  getPathname,
  getPathnameWithoutTrailingSlash,
  getSubdomain,
} from '../src/url-utils'

describe('getPathname()', () => {
  test('returns the pathname of the url', () => {
    expect(getPathname('http://serlo.org/math')).toBe('/math')
  })

  test('returns "/" when url does not end with "/"', () => {
    expect(getPathname('http://de.serlo.org')).toBe('/')
  })
})

describe('getPathnameWithoutTrailingSlash()', () => {
  test('returns pathname without trailing slash', () => {
    const path = getPathnameWithoutTrailingSlash('http://serlo.org/math/')

    expect(path).toBe('/math')
  })

  test('returns pathname when it has no trailing slash', () => {
    const path = getPathnameWithoutTrailingSlash('http://serlo.org/math')

    expect(path).toBe('/math')
  })

  test('returns empty string when url request root path', () => {
    const path = getPathnameWithoutTrailingSlash('http://serlo.org')

    expect(path).toBe('')
  })
})

describe('getSubdomain()', () => {
  test('returns subdomain of given url', () => {
    expect(getSubdomain('https://de.serlo.local')).toEqual('de')
  })

  test('returns second and lower level domains combined with dots', () => {
    expect(getSubdomain('https://stats.en.serlo.org/')).toBe('stats.en')
  })

  test('returns null for url without subdomain', () => {
    expect(getSubdomain('https://serlo.local')).toBeNull()
  })
})
