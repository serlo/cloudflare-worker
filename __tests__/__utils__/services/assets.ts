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

import { createUrlRegex, RestResolver } from './utils'

export function givenAssets(resolver: RestResolver) {
  global.server.use(
    rest.get(createUrlRegex({ subdomains: ['assets'] }), resolver)
  )
}

export function defaultAssetsServer(
  assets: { [P in string]?: { contentType: string; contentLength: number } }
): RestResolver {
  return (req, res, ctx) => {
    const asset = assets[req.url.pathname]

    return asset !== undefined
      ? res(
          ctx.set('content-length', asset.contentLength.toString()),
          ctx.set('content-type', asset.contentType)
        )
      : res(ctx.status(404))
  }
}