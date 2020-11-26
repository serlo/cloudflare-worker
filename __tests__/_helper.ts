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

import { rest, ResponseResolver, restContext, MockedRequest } from 'msw'

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

type RestResolver = ResponseResolver<MockedRequest, typeof restContext>

export function mockHttpGet(url: string, resolver: RestResolver) {
  global.server.use(
    rest.get(url, (req, res, ctx) => {
      if (req.url.toString() !== url)
        return res(ctx.status(400, 'Bad Request: Query string does not match'))

      return resolver(req, res, ctx)
    })
  )
}

export function mockApi(uuid: unknown) {
  global.server.use(
    rest.post(global.API_ENDPOINT, (_req, res, ctx) => {
      return res(ctx.json({ data: { uuid } }))
    })
  )
}

export function returnText(
  body: string,
  { status = 200 }: { status?: number } = {}
): RestResolver {
  return (_req, res, ctx) => res.once(ctx.body(body), ctx.status(status))
}

export function returnJson(json: Record<string, unknown>): RestResolver {
  return (_req, res, ctx) => res.once(ctx.json(json))
}

export function apiToReturnError(options?: { status?: number }): void {
  global.server.use(
    rest.post(global.API_ENDPOINT, (_req, res, ctx) =>
      res.once(ctx.status(options?.status ?? 404))
    )
  )
}

/*
export function apiToReturnMalformedJson(json: Record<string,unknown>): void{
  global.server.use(
    res.post(global.API_ENDPOINT, (_req, res, ctx) =>
    res.once(ctx.json(json)))
  )
}
*/
