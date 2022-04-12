/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2022 Serlo Education e.V.
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

import { getUuid } from './database'
import { RestResolver, createUrlRegex } from './utils'

export function givenApi(resolver: RestResolver) {
  global.server.use(
    rest.post(
      createUrlRegex({ subdomains: ['api'], pathname: '/graphql' }),
      resolver
    )
  )
}

export function defaultApiServer(): RestResolver<any> {
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
    const { instance, path } = (req.body?.variables?.alias ?? {}) as {
      instance: string
      path: string
    }

    if (path == null || instance == null)
      return res(ctx.status(400, 'variable "alias" wrongly defined'))

    const uuid = getUuid(instance, path)

    if (uuid === undefined) {
      const statusText = `Nothing found for "${path}"`

      return res(ctx.status(404, statusText))
    }

    const result = { ...uuid }
    delete result['oldAlias']

    if (result.alias !== undefined)
      result.alias = encodeURIComponent(result.alias).replace(/%2F/g, '/')

    return res(ctx.json({ data: { uuid: result } }))
  }
}
