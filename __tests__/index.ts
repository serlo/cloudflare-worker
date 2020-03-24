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
import { handleRequest as f } from '../src'

let fetchMock: jest.Mock
class ResponseMock {
  constructor(
    public html: string,
    public init?: {
      headers?: Record<string, string>
      status?: number
      statusText?: string
    }
  ) {}

  public get headers() {
    return {
      set() {},
    }
  }

  static redirect(url: string, status?: number) {
    return {
      __type__: 'redirect',
      url,
      status,
    }
  }
}

class RequestMock {
  constructor(public url: string) {}
}

beforeEach(() => {
  fetchMock = jest.fn((...args) => {
    return true
  })
  // @ts-ignore
  window['fetch'] = fetchMock
  // @ts-ignore
  window['Response'] = ResponseMock
  // @ts-ignore
  window['Request'] = RequestMock
  // @ts-ignore
  window['MAINTENANCE_KV'] = {
    async get(key: string) {
      return null
    },
  }
})

describe('Enforce HTTPS', () => {
  test('HTTP URL', async () => {
    const response = await handleRequest('http://foo.serlo.local/bar')
    expectToBeRedirectTo(response, 'https://foo.serlo.local/bar')
  })

  test('HTTPS URL', async () => {
    await handleRequest('https://foo.serlo.local/bar')
    expectFetchToHaveBeenCalledWithRequest({
      url: 'https://foo.serlo.local/bar',
    } as Request)
  })

  test('Pact Broker', async () => {
    await handleRequest('http://pacts.serlo.local/bar')
    expectFetchToHaveBeenCalledWithRequest({
      url: 'http://pacts.serlo.local/bar',
    } as Request)
  })
})

describe('Redirects', () => {
  test('start.serlo.org', async () => {
    const response = await handleRequest('https://start.serlo.local/')
    expectToBeRedirectTo(
      response,
      'https://docs.google.com/document/d/1qsgkXWNwC-mcgroyfqrQPkZyYqn7m1aimw2gwtDTmpM/',
      301
    )
  })

  test('de.serlo.org/labschool', async () => {
    const response = await handleRequest('https://de.serlo.local/labschool')
    expectToBeRedirectTo(response, 'https://labschool.serlo.local/', 301)
  })

  test('de.serlo.org/hochschule', async () => {
    const response = await handleRequest('https://de.serlo.local/hochschule')
    expectToBeRedirectTo(
      response,
      'https://de.serlo.local/mathe/universitaet/44323',
      301
    )
  })

  test('de.serlo.org/beitreten', async () => {
    const response = await handleRequest('https://de.serlo.local/beitreten')
    expectToBeRedirectTo(
      response,
      'https://docs.google.com/forms/d/e/1FAIpQLSdEoyCcDVP_G_-G_u642S768e_sxz6wO6rJ3tad4Hb9z7Slwg/viewform',
      301
    )
  })

  test('serlo.org/*', async () => {
    const response = await handleRequest('https://serlo.local/foo')
    expectToBeRedirectTo(response, 'https://de.serlo.local/foo')
  })

  test('www.serlo.org/*', async () => {
    const response = await handleRequest('https://www.serlo.local/foo')
    expectToBeRedirectTo(response, 'https://de.serlo.local/foo')
  })
})

describe('Semantic file names', () => {
  test('assets.serlo.org/meta/*', async () => {
    await handleRequest('https://assets.serlo.local/meta/foo')
    expectFetchToHaveBeenCalledWithRequest({
      url: 'https://assets.serlo.org/meta/foo',
    } as Request)
  })

  test('assets.serlo.org/<hash>/<fileName>.<ext>', async () => {
    await handleRequest('https://assets.serlo.local/hash/fileName.ext')
    expectFetchToHaveBeenCalledWithRequest({
      url: 'https://assets.serlo.org/hash.ext',
    } as Request)
  })

  test('assets.serlo.org/legacy/<hash>/<fileName>.<ext>', async () => {
    await handleRequest('https://assets.serlo.local/legacy/hash/fileName.ext')
    expectFetchToHaveBeenCalledWithRequest({
      url: 'https://assets.serlo.org/legacy/hash.ext',
    } as Request)
  })
})

describe('Packages', () => {
  test('packages.serlo.org/<package>/<filePath>', async () => {
    mockPackagesKV({
      foo: 'foo@1.0.0',
    })
    const response = await handleRequest('https://packages.serlo.local/foo/bar')
    expectFetchToHaveBeenCalledWithRequest({
      url: 'https://packages.serlo.org/foo@1.0.0/bar',
    } as Request)
  })

  test('packages.serlo.org/<package>/<filePath> (invalid)', async () => {
    mockPackagesKV({
      foo: 'foo@1.0.0',
    })
    await handleRequest('https://packages.serlo.local/foobar/bar')
    expectFetchToHaveBeenCalledWithRequest({
      url: 'https://packages.serlo.org/foobar/bar',
    } as Request)
  })
})

async function handleRequest(url: string): Promise<ResponseMock> {
  const response = await f({ url } as Request)
  return (response as unknown) as ResponseMock
}

function mockPackagesKV(packages: Record<string, unknown>) {
  // @ts-ignore
  window['PACKAGES_KV'] = {
    async get(key: string) {
      return packages[key] || null
    },
  }
}

function expectFetchToHaveBeenCalledWithRequest(request: Request) {
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [arg1, arg2] = fetchMock.mock.calls[0]
  if (typeof arg1 === 'string') {
    expect({ ...arg2, url: arg1 }).toEqual(request)
  } else {
    expect(arg1).toEqual(request)
  }
}

function expectToBeRedirectTo(
  response: ResponseMock,
  url: string,
  status?: number
) {
  expect(response).toEqual({
    __type__: 'redirect',
    url,
    status,
  })
}
