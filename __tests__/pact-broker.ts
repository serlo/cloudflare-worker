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
}

beforeEach(() => {
  fetchMock = jest.fn((...args) => {
    return true
  })
  // @ts-ignore
  window['fetch'] = fetchMock
  // @ts-ignore
  window['Response'] = ResponseMock
})

describe('Pacts broker', () => {
  test('HTTP', async () => {
    await handleRequest('http://pacts.serlo.org/foo-bar')
    expectFetchToHaveBeenCalledWithRequest(({
      url: 'https://pacts.serlo.org/foo-bar',
      headers: {
        'X-Forwarded-Scheme': 'https',
        'X-Forwarded-Host': 'pacts.serlo.org',
        'X-Forwarded-Port': '443',
        'X-Forwarded-Ssl': 'On'
      }
    } as unknown) as Request)
  })

  test('HTTPS', async () => {
    await handleRequest('https://pacts.serlo.org/foo-bar')
    expectFetchToHaveBeenCalledWithRequest(({
      url: 'https://pacts.serlo.org/foo-bar',
      headers: {
        'X-Forwarded-Scheme': 'https',
        'X-Forwarded-Host': 'pacts.serlo.org',
        'X-Forwarded-Port': '443',
        'X-Forwarded-Ssl': 'On'
      }
    } as unknown) as Request)
  })
})

async function handleRequest(url: string): Promise<ResponseMock> {
  const response = await f({ url } as Request)
  return (response as unknown) as ResponseMock
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
