/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2020 Serlo Education e.V.
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
 * @copyright Copyright (c) 2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
// eslint-disable-next-line import/no-unassigned-import
import '@testing-library/jest-dom'
import * as cryptoNode from 'crypto'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import fetchNode, {
  Response as NodeResponse,
  Request as NodeRequest,
} from 'node-fetch'
import * as R from 'ramda'
import * as util from 'util'

import { mockKV } from './__tests__/__utils__'

const randomCopy = Math.random

beforeAll(() => {
  global.API_ENDPOINT = 'https://api.serlo.org/graphql'
  global.server = setupServer(
    rest.post(global.API_ENDPOINT, (req, res, ctx) => {
      if (global.apiServer.hasInternalServerError) return res(ctx.status(500))
      if (global.apiServer.returnsMalformedJson)
        return res(ctx.body('malformed json'))
      if (global.apiServer.returnsInvalidJson !== undefined)
        return res(ctx.json(global.apiServer.returnsMalformedJson as any))

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

      let result: Uuid | undefined

      const idMatch = /\/(\d+)/.exec(path)

      if (idMatch) {
        const id = parseInt(idMatch[1])
        result = global.apiServer.uuids.find((uuid) => uuid.id === id)
      } else {
        result = global.apiServer.uuids.find(
          (uuid) => uuid.alias === path || uuid.oldAlias === path
        )
      }

      if (result === undefined) {
        const statusText = `Nothing found for "${path}"`

        return res(ctx.status(404, statusText))
      }

      const uuid = R.omit(['id', 'oldAlias'], result)

      if (uuid.alias !== undefined)
        uuid.alias = encodeURIComponent(uuid.alias).replace(/%2F/g, '/')

      return res(ctx.json({ data: { uuid } }))
    })
  )
  global.server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  global.API_SECRET = 'secret'
  global.ENABLE_PATH_INFO_CACHE = 'true'
  global.FRONTEND_DOMAIN = 'frontend.serlo.org'
  global.FRONTEND_PROBABILITY = '1'
  global.FRONTEND_ALLOWED_TYPES = '[]'
  // TODO: Remove this since this tests an implementation details
  global.fetch = jest.fn().mockImplementation(fetchNode)

  mockKV('MAINTENANCE_KV', {})
  mockKV('PATH_INFO_KV', {})

  global.apiServer = {
    hasInternalServerError: false,
    returnsMalformedJson: false,
    uuids: [],
  }
})

afterEach(() => {
  global.server.resetHandlers()
  Math.random = randomCopy
})

afterAll(() => {
  global.server.close()
})

global.Response = (NodeResponse as unknown) as typeof Response
global.Request = (NodeRequest as unknown) as typeof Request
global.crypto = ({
  subtle: {
    digest(encoding: string, message: Uint8Array) {
      return Promise.resolve(
        cryptoNode
          .createHash(encoding.toLowerCase().replace('-', ''))
          .update(message)
          .digest()
      )
    },
  },
} as unknown) as typeof crypto
global.TextEncoder = util.TextEncoder

// FIXME: Delete the following mock, when node-fetch is available in version 3.0.0
// See https://github.com/node-fetch/node-fetch/commit/0959ca9739850bbd24e0721cc1296e7a0aa5c2bd#diff-d0f5704ae0738a7bd1f54aff42ddcb41
// eslint-disable-next-line @typescript-eslint/unbound-method
NodeResponse.redirect = function (url: string, status = 302) {
  return new NodeResponse('', { status, headers: { location: url } })
}

interface ApiServerState {
  uuids: Uuid[]
  hasInternalServerError: Boolean
  returnsMalformedJson: Boolean
  returnsInvalidJson?: unknown
}

interface Uuid {
  __typename?: string
  id?: number
  alias?: string
  oldAlias?: string
  username?: string
  pages?: { alias: string }[]
}

export {}

declare global {
  namespace NodeJS {
    interface Global {
      server: ReturnType<typeof import('msw/node').setupServer>
      apiServer: ApiServerState
    }
  }
}
