import { createJsonResponse } from '../src/utils'

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
export async function expectContainsText(response: Response, texts: string[]) {
  expect(response).not.toBeNull()

  const responseText = await response.text()
  texts.forEach((text) =>
    expect(responseText).toEqual(expect.stringContaining(text))
  )
}

export function expectContentTypeIsHtml(response: Response): void {
  expect(response.headers.get('Content-Type')).toBe('text/html;charset=utf-8')
}

export function expectHasOkStatus(response: Response): void {
  expect(response).not.toBeNull()
  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')
}

export async function expectIsNotFoundResponse(
  response: Response
): Promise<void> {
  expect(response).not.toBeNull()
  expect(response.status).toBe(404)
  expect(response.statusText).toBe('Not Found')
  expect(await response.text()).toEqual(
    expect.stringContaining('Page not found')
  )
}

export async function expectIsJsonResponse(
  response: Response,
  targetJson: unknown
) {
  expectHasOkStatus(response)
  expect(response.headers.get('Content-Type')).toBe('application/json')
  expect(JSON.parse(await response.text())).toEqual(targetJson)
}

export function createApiResponse(uuid: {
  __typename: string
  alias?: string
  username?: string
  pages?: { alias: string }[]
}) {
  return createJsonResponse({ data: { uuid } })
}

type ResponseSpec = string | Response
type FetchSpec = Record<string, ResponseSpec>

export function mockFetch(spec: FetchSpec = {}): FetchMock {
  const mockedFetch = jest.fn()
  const mockedInternet = new FetchMock(spec, mockedFetch)

  mockedFetch.mockImplementation((reqInfo) => mockedInternet.fetch(reqInfo))

  global.fetch = mockedFetch

  return mockedInternet
}

export class FetchMock {
  constructor(
    private specs: FetchSpec,
    private mockedFetch: jest.Mock<any, [RequestInfo, RequestInit | undefined]>
  ) {}

  get mock() {
    return this.mockedFetch
  }

  fetch(reqInfo: RequestInfo) {
    const url = typeof reqInfo === 'string' ? reqInfo : reqInfo.url
    const responseSpec = this.specs[url]
    const errorMessage = `Response for URL ${url} is not defined in mocked fetch`

    return responseSpec === undefined
      ? Promise.reject(new Error(errorMessage))
      : Promise.resolve(FetchMock.convertToResponse(responseSpec))
  }

  mockRequest({ to, response = '' }: { to: string; response?: ResponseSpec }) {
    this.specs[to] = response
  }

  getAllCallArgumentsFor(url: string) {
    return this.mockedFetch.mock.calls.filter(
      ([req]) => FetchMock.getUrl(req) === url
    )
  }

  getCallArgumentsFor(url: string) {
    const argsList = this.getAllCallArgumentsFor(url)

    if (argsList.length === 0) throw new Error(`URL ${url} was never fetched`)
    if (argsList.length > 1)
      throw new Error(`URL ${url} was fetched more than one time`)

    return argsList[0]
  }

  getRequestTo(url: string): RequestInfo {
    return this.getCallArgumentsFor(url)[0]
  }

  getAllRequestsTo(url: string): RequestInfo[] {
    return this.getAllCallArgumentsFor(url).map((x) => x[0])
  }

  static getUrl(req: RequestInfo): string {
    return typeof req === 'string' ? req : req.url
  }
  static convertToResponse(spec: ResponseSpec): Response {
    return typeof spec === 'string' ? new Response(spec) : spec
  }
}

type KV_NAMES = 'MAINTENANCE_KV' | 'PACKAGES_KV' | 'PATH_INFO_KV'

export function mockKV(name: KV_NAMES, values: Record<string, string>) {
  global[name] = {
    async get(key: string): Promise<string | null> {
      return Promise.resolve(values[key] ?? null)
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async put(key: string, value: string, _?: { expirationTtl: number }) {
      values[key] = value
    },
  }
}
