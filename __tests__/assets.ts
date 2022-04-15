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
import { rest } from 'msw'

import {
  createUrlRegex,
  currentTestEnvironment,
  TestEnvironment,
} from './__utils__'

let env: TestEnvironment

beforeEach(() => {
  env = currentTestEnvironment()
  givenAssets({
    '/meta/serlo.jpg': { contentLength: 371895 },
    '/5c766c2380ea6_13576fb9538fbbab5bbe8fad96bd16d80f7f5119.png': {
      contentLength: 4774,
    },
    '/legacy/58f090745b909_16a4cba82bd1cb09434b7f582e555b9ac7531922.png': {
      contentLength: 899629,
    },
  })
})

test('assets.serlo.org/meta/*', async () => {
  const response = await env.fetch({
    subdomain: 'assets',
    pathname: '/meta/serlo.jpg',
  })

  expectAsset({ response, expectedStoredContentLength: 371895 })
})

test('assets.serlo.org/<hash>/<fileName>.<ext>', async () => {
  const response = await env.fetch({
    subdomain: 'assets',
    pathname:
      '/5c766c2380ea6_13576fb9538fbbab5bbe8fad96bd16d80f7f5119/ashoka.png',
  })

  expectAsset({ response, expectedStoredContentLength: 4774 })
})

test('assets.serlo.org/legacy/<hash>/<fileName>.<ext>', async () => {
  const response = await env.fetch({
    subdomain: 'assets',
    pathname:
      '/legacy/58f090745b909_16a4cba82bd1cb09434b7f582e555b9ac7531922/garden.png',
  })

  expectAsset({ response, expectedStoredContentLength: 899629 })
})

function givenAssets(assets: { [P in string]?: { contentLength: number } }) {
  global.server.use(
    rest.get(createUrlRegex({ subdomains: ['assets'] }), (req, res, ctx) => {
      const asset = assets[req.url.pathname]

      return asset !== undefined
        ? res(
            ctx.set(
              'x-goog-stored-content-length',
              asset.contentLength.toString()
            )
          )
        : res(ctx.status(404))
    })
  )
}

function expectAsset({
  response,
  expectedStoredContentLength,
}: {
  response: Response
  expectedStoredContentLength: number
}) {
  expect(response.status).toBe(200)
  expect(response.headers.get('x-goog-stored-content-length')).toBe(
    expectedStoredContentLength.toString()
  )
}
