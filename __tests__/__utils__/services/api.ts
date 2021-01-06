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
import * as R from 'ramda'

import { RestResolver } from './utils'

export function givenApi(resolver: RestResolver) {
  global.server.use(rest.post(global.API_ENDPOINT, resolver))
}

export function defaultApiServer(): RestResolver {
  return (req, res, ctx) => {
    if (!req.headers.get('Authorization')?.match(/^Serlo Service=ey/))
      return res(ctx.status(401, 'No authorization header given'))

    if (req.body === undefined)
      return res(ctx.status(400, 'request body is missing'))
    if (
      req.headers.get('Content-Type') !== 'application/json' ||
      typeof req.body === 'string'
    )
      return res(ctx.status(400, 'Content-Type is not application/json'))

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const path = req.body?.variables?.alias?.path as string | undefined

    if (path == null)
      return res(ctx.status(400, 'variable "alias" is not defined'))

    const id = getIdFromPath(path)
    const result = id
      ? global.uuids.find((u) => u.id === id)
      : global.uuids.find((u) => u.alias === path || u.oldAlias === path)

    if (result === undefined) {
      const statusText = `Nothing found for "${path}"`

      return res(ctx.status(404, statusText))
    }

    const uuid = R.omit(['id', 'oldAlias'], result)

    return res(ctx.json({ data: { uuid } }))
  }
}

function getIdFromPath(path: string): number | null {
  const regexes = [
    new RegExp('^/(?<id>\\d+)$'),
    new RegExp('(?<subject>[^/]+/)?(?<id>\\d+)/(?<title>[^/]*)$'),
  ]

  for (const regex of regexes) {
    const match = regex.exec(path)

    if (match) return parseInt(match?.groups?.id ?? '')
  }

  return null
}
