/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021-2022 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2022 Serlo Education e.V.
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import { Toucan } from 'toucan-js'

export class SentryFactory {
  constructor(private event: FetchEvent) {}

  createReporter(service: string) {
    return new SentryReporter(this.event, service)
  }
}

export class SentryReporter {
  private context: Record<string, unknown>
  private tags: Array<[string, string | number | boolean]>
  private toucan?: Toucan

  constructor(private event: FetchEvent, private service: string) {
    this.context = {}
    this.tags = []
  }

  setContext(key: string, value: unknown) {
    this.context[key] = value
  }

  setTag(key: string, value: string | number | boolean) {
    this.tags.push([key, value])
  }

  captureMessage(message: string, level: 'error' | 'warning' | 'info') {
    this.getToucan().captureMessage(message, level)
  }

  captureException(err: unknown) {
    this.getToucan().captureException(err)
  }

  private getToucan() {
    this.toucan ??= new Toucan({
      dsn: globalThis.SENTRY_DSN,
      context: this.event,
      environment: globalThis.ENVIRONMENT,
    })

    this.toucan.setTag('service', this.service)

    if (Object.keys(this.context).length > 0) {
      this.toucan.setExtra('context', this.context)
    }

    for (const [key, value] of this.tags) {
      this.toucan.setTag(key, value)
    }

    return this.toucan
  }
}

export function responseToContext({
  response,
  text,
  json,
}: {
  response: Response
  text?: string
  json?: unknown
}) {
  const headers = {} as Record<string, string>

  response.headers.forEach((key, value) => {
    headers[key] = value
  })

  return {
    status: response.status,
    url: response.url,
    headers,
    ...(text ? { text } : {}),
    ...(json ? { json } : {}),
  }
}
