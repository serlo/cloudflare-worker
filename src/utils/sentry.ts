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
import Toucan from 'toucan-js'

export class SentryReporter {
  private context: Record<string, unknown>
  private event: FetchEvent
  private service: string
  private toucan?: Toucan

  constructor({ event, service }: { event: FetchEvent; service: string }) {
    this.service = service
    this.event = event
    this.context = {}
  }

  setContext(key: string, value: unknown) {
    this.context[key] = value
  }

  captureMessage(message: string, level: 'error' | 'warning' | 'info') {
    this.getToucan().captureMessage(message, level)
  }

  private getToucan() {
    this.toucan ??= new Toucan({
      dsn: global.SENTRY_DSN,
      context: this.event,
      environment: global.ENVIRONMENT,
    })

    this.toucan.setTag('service', this.service)
    this.toucan.setExtra('context', this.context)

    return this.toucan
  }
}
