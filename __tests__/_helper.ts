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
export async function containsText(response: Response, texts: string[]) {
  expect(response).not.toBeNull()

  const responseText = await response.text()
  texts.forEach((text) =>
    expect(responseText).toEqual(expect.stringContaining(text))
  )
}

export function contentTypeIsHtml(response: Response): void {
  expect(response.headers.get('Content-Type')).toBe('text/html;charset=utf-8')
}

export function hasOkStatus(response: Response): void {
  expect(response).not.toBeNull()
  expect(response.status).toBe(200)
  expect(response.statusText).toBe('OK')
}

export async function isNotFoundResponse(response: Response): Promise<void> {
  expect(response).not.toBeNull()
  expect(response.status).toBe(404)
  expect(response.statusText).toBe('Not Found')
  expect(await response.text()).toEqual(
    expect.stringContaining('Page not found')
  )
}

export async function isJsonResponse(response: Response, targetJson: unknown) {
  hasOkStatus(response)
  expect(response.headers.get('Content-Type')).toBe('application/json')
  expect(JSON.parse(await response.text())).toEqual(targetJson)
}

export function mockFetch(spec: Record<string, string | Response>) {
  function mockedFetchImpl(reqInfo: Request | string): Promise<Response> {
    const url = typeof reqInfo === 'string' ? reqInfo : reqInfo.url
    const responseSpec = spec[url]

    return responseSpec === undefined
      ? Promise.reject(new Error(`URL ${url} not defined in mocked fetch`))
      : Promise.resolve(convertToResponse(responseSpec))
  }

  const mockedFetch = jest.fn().mockImplementation(mockedFetchImpl)

  global.fetch = mockedFetch

  return mockedFetch
}

function convertToResponse(spec: string | Response): Response {
  return typeof spec === 'string' ? new Response(spec) : spec
}

export function mockKV(name: string, values: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  global[name] = {
    async get(key: string) {
      return Promise.resolve(values[key] ?? null)
    },

    put(key: string, value: unknown, _?: { expirationTtl: number }) {
      values[key] = value
    },
  }
}
