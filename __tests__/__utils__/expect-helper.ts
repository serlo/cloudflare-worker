/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021 Serlo Education e.V.
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
 * @copyright Copyright (c) 2021 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
import { Level } from 'toucan-js/dist/types'

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

export async function expectIsNotFoundResponse(
  response: Response
): Promise<void> {
  expect(response.status).toBe(404)
  expect(await response.text()).toEqual(
    expect.stringContaining('Page not found')
  )
}

export async function expectIsJsonResponse(
  response: Response,
  targetJson: unknown
) {
  expect(response.status).toBe(200)
  expect(response.headers.get('Content-Type')).toBe('application/json')
  expect(JSON.parse(await response.text())).toEqual(targetJson)
}

export function expectToBeRedirectTo(
  response: Response,
  url: string,
  status: number
) {
  expect(response.status).toBe(status)
  expect(response.headers.get('Location')).toBe(url)
}

export function expectSentryEvent({
  message,
  level,
  error,
  service,
  context,
}: {
  message?: string
  level?: Level
  error?: string
  service?: string
  context?: Record<string, unknown>
}) {
  expect(global.sentryEvents).toContainEqual(
    expect.objectContaining({
      ...(level ? { level } : error ? { level: 'error' } : {}),
      ...(message ? { message } : {}),
      ...(error
        ? {
            exception: {
              values: expect.arrayContaining([
                expect.objectContaining({ value: error }) as unknown,
              ]) as unknown,
            },
          }
        : {}),
      ...(service
        ? { tags: expect.objectContaining({ service }) as unknown }
        : {}),
      ...(context
        ? { extra: { context: expect.objectContaining(context) as unknown } }
        : {}),
    })
  )
}

export function expectNoSentryError() {
  expect(global.sentryEvents).toHaveLength(0)
}
