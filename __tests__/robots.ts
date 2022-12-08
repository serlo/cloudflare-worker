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
import { currentTestEnvironmentWhen } from './__utils__'

test('Disallow robots in non-productive environments', async () => {
  const env = currentTestEnvironmentWhen(
    (config) => config.ENVIRONMENT !== 'production'
  )

  const response = await env.fetch({ subdomain: 'de', pathname: '/robots.txt' })

  expect(await response.text()).toBe('User-agent: *\nDisallow: /\n')
})

test('Return explicit robots rules in production', async () => {
  global.ENVIRONMENT = 'production'
  const env = currentTestEnvironmentWhen(
    (config) => config.ENVIRONMENT === 'production'
  )

  const request = new Request('https://de.serlo.org/robots.txt')
  const response = await env.fetchRequest(request)
  const text = await response.text()

  expect(text).toContain('User-agent: *')
  expect(text).toContain('Disallow: /backend')
})
