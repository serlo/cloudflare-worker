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

import { isInstance, Url, SentryFactory, responseToContext } from './utils'

export async function pdfProxy(
  request: Request,
  sentryFactory: SentryFactory
): Promise<Response | null> {
  const url = Url.fromRequest(request)

  if (!isInstance(url.subdomain)) return null
  const pdfMatch = /^\/api\/pdf\/(\d+)/.exec(url.pathname)
  if (!pdfMatch) return null

  url.hostname = 'pdf.serlo.org'
  url.pathname = `/api/${pdfMatch[1]}`

  const response = await fetch(url.href, { cf: { cacheTtl: 24 * 60 * 60 } })

  if (response.ok) {
    return response
  } else {
    const sentry = sentryFactory.createReporter('pdf-proxy')
    sentry.setContext(
      'response',
      responseToContext({ response, text: await response.text() })
    )
    sentry.captureMessage('Illegal response of pdf.serlo.org', 'warning')
  }

  return null
}
