/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021 Serlo Education e.V.
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
 * @copyright Copyright (c) 2021 Serlo Education e.V.
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import { currentTestEnvironment, currentTestEnvironmentWhen } from './__utils__'

describe('LENABI redirect links', () => {
  test.each([
    '/metadata-api',
    '/data-wallet',
    '/docs',
    '/sso',
    '/user-journey',
    '/docs/sso',
  ])('%s', async (pathname) => {
    const response = await currentTestEnvironmentWhen((config) =>
      ['production', 'local'].includes(config.ENVIRONMENT)
    ).fetch({
      subdomain: 'lenabi',
      pathname,
    })

    expect(response.status).toBe(302)
  })
})

describe('Legacy LENABI redirect links', () => {
  test.each(['/metadata-api', '/data-wallet', '/user-journey'])(
    '%s',
    async (pathname) => {
      const response = await currentTestEnvironment().fetch({
        subdomain: 'de',
        pathname: `/lenabi${pathname}`,
      })

      expect(response.status).toBe(301)
    }
  )
})
