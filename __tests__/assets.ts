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
  expectImageReponse,
  TestEnvironment,
} from './__utils__'

let env: TestEnvironment

beforeEach(() => {
  env = currentTestEnvironment()
  givenAssets({
    '/meta/serlo.jpg': { contentType: 'image/jpeg', contentLength: 139735 },
    '/5c766c2380ea6_13576fb9538fbbab5bbe8fad96bd16d80f7f5119.png': {
      contentType: 'image/png',
      contentLength: 3624,
    },
    '/legacy/58f090745b909_16a4cba82bd1cb09434b7f582e555b9ac7531922.png': {
      contentType: 'image/png',
      contentLength: 898192,
    },
  })
})

test('assets.serlo.org/meta/*', async () => {
  const response = await env.fetch({
    subdomain: 'assets',
    pathname: '/meta/serlo.jpg',
  })

  expectImageReponse({
    response,
    expectedImageType: 'image/jpeg',
    expectedContentLength: 139735,
  })
})

test('assets.serlo.org/<hash>/<fileName>.<ext>', async () => {
  const response = await env.fetch({
    subdomain: 'assets',
    pathname:
      '/5c766c2380ea6_13576fb9538fbbab5bbe8fad96bd16d80f7f5119/ashoka.png',
  })

  expectImageReponse({
    response,
    expectedContentLength: 3624,
    expectedImageType: 'image/png',
  })
})

test('assets.serlo.org/legacy/<hash>/<fileName>.<ext>', async () => {
  const response = await env.fetch({
    subdomain: 'assets',
    pathname:
      '/legacy/58f090745b909_16a4cba82bd1cb09434b7f582e555b9ac7531922/garden.png',
  })

  expectImageReponse({
    response,
    expectedContentLength: 898192,
    expectedImageType: 'image/png',
  })
})

function givenAssets(
  assets: { [P in string]?: { contentType: string; contentLength: number } }
) {
  global.server.use(
    rest.get(createUrlRegex({ subdomains: ['assets'] }), (req, res, ctx) => {
      const asset = assets[req.url.pathname]

      return asset !== undefined
        ? res(
            ctx.set('content-length', asset.contentLength.toString()),
            ctx.set('content-type', asset.contentType)
          )
        : res(ctx.status(404))
    })
  )
}
