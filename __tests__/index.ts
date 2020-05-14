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
import { mockKV, mockFetch } from './_helper'

describe('Enforce HTTPS', () => {
  test('HTTP URL', async () => {
    const response = await handleUrl('http://foo.serlo.local/bar')

    expectToBeRedirectTo(response, 'https://foo.serlo.local/bar', 302)
  })

  test('HTTPS URL', async () => {
    const mockedFetch = mockFetch({ 'https://foo.serlo.local/bar': '' })

    await handleUrl('https://foo.serlo.local/bar')

    expectToHaveBeenCalledWith(mockedFetch, 'https://foo.serlo.local/bar')
  })

  test('Pact Broker', async () => {
    const mockedFetch = mockFetch({ 'http://pacts.serlo.local/bar': '' })

    await handleUrl('http://pacts.serlo.local/bar')

    expectToHaveBeenCalledWith(mockedFetch, 'http://pacts.serlo.local/bar')
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
})

describe('Semantic file names', () => {
  test('assets.serlo.org/meta/*', async () => {
    const mockedFetch = mockFetch({ 'https://assets.serlo.org/meta/foo': '' })

    await handleUrl('https://assets.serlo.local/meta/foo')

    expectToHaveBeenCalledWith(mockedFetch, 'https://assets.serlo.org/meta/foo')
  })

  test('assets.serlo.org/<hash>/<fileName>.<ext>', async () => {
    const mockedFetch = mockFetch({ 'https://assets.serlo.org/hash.ext': '' })

    await handleUrl('https://assets.serlo.local/hash/fileName.ext')

    expectToHaveBeenCalledWith(mockedFetch, 'https://assets.serlo.org/hash.ext')
  })

  test('assets.serlo.org/legacy/<hash>/<fileName>.<ext>', async () => {
    const mockedFetch = mockFetch({
      'https://assets.serlo.org/legacy/hash.ext': '',
    })

    await handleUrl('https://assets.serlo.local/legacy/hash/fileName.ext')

    const target = 'https://assets.serlo.org/legacy/hash.ext'
    expectToHaveBeenCalledWith(mockedFetch, target)
  })
})

describe('Packages', () => {
  test('packages.serlo.org/<package>/<filePath>', async () => {
    const mockedFetch = mockFetch({
      'https://packages.serlo.org/foo@1.0.0/bar': '',
    })
    mockKV('PACKAGES_KV', { foo: 'foo@1.0.0' })

    await handleUrl('https://packages.serlo.local/foo/bar')

    const target = 'https://packages.serlo.org/foo@1.0.0/bar'
    expectToHaveBeenCalledWith(mockedFetch, target)
  })

  test('packages.serlo.org/<package>/<filePath> (invalid)', async () => {
    const mockedFetch = mockFetch({
      'https://packages.serlo.org/foobar/bar': '',
    })
    mockKV('PACKAGES_KV', { foo: 'foo@1.0.0' })

    await handleUrl('https://packages.serlo.local/foobar/bar')

    const target = 'https://packages.serlo.org/foobar/bar'
    expectToHaveBeenCalledWith(mockedFetch, target)
  })
})

async function handleUrl(url: string): Promise<Response> {
  return await handleRequest(new Request(url))
}

function expectToHaveBeenCalledWith(mockedFetch: jest.Mock, targetUrl: string) {
  expect(mockedFetch).toHaveBeenCalledTimes(1)

  const arg = mockedFetch.mock.calls[0][0] as string | Request
  const url = typeof arg === 'string' ? arg : arg.url
  expect(url).toBe(targetUrl)
}

function expectToBeRedirectTo(response: Response, url: string, status: number) {
  expect(response.headers.get('Location')).toBe(url)
  expect(response.status).toBe(status)
}
