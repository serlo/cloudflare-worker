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
import { rest } from 'msw'

import {
  createUrlRegex,
  currentTestEnvironment,
  expectToBeRedirectTo,
  TestEnvironment,
} from './__utils__'

let env: TestEnvironment

beforeEach(() => {
  env = currentTestEnvironment()
  mockStatsServer()
})

test('Redirect of https://stats.serlo.org/ is not changed by CF worker', async () => {
  const response = await env.fetch({ subdomain: 'stats' })

  expectToBeRedirectTo(
    response,
    env.createUrl({ subdomain: 'stats', pathname: '/login' }),
    302
  )
})

test('Response of https://stats.serlo.org/login is not changed by CF worker', async () => {
  const response = await env.fetch({ subdomain: 'stats', pathname: '/login' })

  expect(await response.text()).toEqual(
    expect.stringContaining('<title>Grafana</title>')
  )
})

function mockStatsServer() {
  global.server.use(
    rest.get(createUrlRegex({ subdomains: ['stats'] }), (req, res, ctx) => {
      return req.url.pathname !== '/login'
        ? res(ctx.status(302), ctx.set('location', '/login'))
        : res(ctx.body('<title>Grafana</title>'))
    })
  )
}
