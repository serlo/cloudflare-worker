/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2022 Serlo Education e.V.
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

import { isInstance, Url, SentryFactory, responseToContext } from './utils'

export async function quickbarProxy(
  request: Request,
  sentryFactory: SentryFactory
): Promise<Response | null> {
  const url = Url.fromRequest(request)

  if (!isInstance(url.subdomain)) return null
  if (url.pathname !== '/api/stats/quickbar.json') return null

  const quickbarUrl = 'https://arrrg.de/serlo-stats/quickbar.json'
  const response = await fetch(quickbarUrl, { cf: { cacheTtl: 24 * 60 * 60 } })

  if (response.ok) {
    return response
  } else {
    const sentry = sentryFactory.createReporter('quickbar-proxy')

    sentry.setContext(
      'response',
      responseToContext({ response, text: await response.text() })
    )
    sentry.captureMessage(
      'Illegal response of quickbar server, arrrg',
      'warning'
    )

    return null
  }
}
