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
import { rest } from 'msw'

import { createUrlRegex, currentTestEnvironment } from './__utils__'

beforeEach(async () => {
  givenCssOnPackagesServer('/serlo-org-client@10.0.0/main.css')

  await global.PACKAGES_KV.put('serlo-org-client@10', 'serlo-org-client@10.0.0')
})

test('resolves to specific package version when package name is in PACKAGES_KV', async () => {
  const response = await currentTestEnvironment().fetch({
    subdomain: 'packages',
    pathname: '/serlo-org-client@10/main.css',
  })

  expectCssResponse(response)
})

test('forwards request when package name is not in PACKAGES_KV', async () => {
  const response = await currentTestEnvironment().fetch({
    subdomain: 'packages',
    pathname: '/serlo-org-client@10.0.0/main.css',
  })

  expectCssResponse(response)
})

function expectCssResponse(response: Response) {
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('text/css')
}

function givenCssOnPackagesServer(pathname: string) {
  global.server.use(
    rest.get(createUrlRegex({ subdomains: ['packages'] }), (req, res, ctx) => {
      return req.url.pathname === pathname
        ? res(ctx.set('content-type', 'text/css'))
        : res(ctx.status(404))
    })
  )
}
