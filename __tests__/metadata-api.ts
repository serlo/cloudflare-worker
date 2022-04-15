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
import { expectSentryEvent, localTestEnvironment } from './__utils__'

describe('Sends a report to sentry when a legacy route of the Metadata API is used', () => {
  test.each([
    '/entity/api/json/export/article',
    '/entity/api/json/export/latest/article/5',
    '/entity/api/rss/article/5/feed.rss',
  ])('path: %s', async (pathname) => {
    const env = localTestEnvironment()
    await env.fetch(
      { subdomain: 'en', pathname },
      { headers: { 'User-Agent': 'MyCrawler' } }
    )

    expectSentryEvent({
      service: 'metadata-api',
      message: 'Legacy metadata API is used',
      context: {
        url: env.createUrl({ subdomain: 'en', pathname }),
        userAgent: 'MyCrawler',
      },
    })
  })
})
