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
// eslint-disable-next-line import/no-unassigned-import
import '@testing-library/jest-dom'
import * as cryptoNode from 'crypto'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import fetchNode, {
  Response as NodeResponse,
  Request as NodeRequest,
} from 'node-fetch'
import { Event as SentryEvent } from 'toucan-js/dist/types'
import * as util from 'util'

import {
  createKV,
  givenApi,
  defaultApiServer,
  Uuid,
  givenSerlo,
  defaultSerloServer,
  currentTestEnvironment,
  givenFrontend,
  defaultFrontendServer,
} from './__tests__/__utils__'

const timeout = currentTestEnvironment().getNeededTimeout()

if (timeout) {
  jest.setTimeout(timeout)
}

beforeAll(() => {
  global.API_ENDPOINT = 'https://api.serlo.org/graphql'
  global.server = setupServer()
  global.server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  global.API_SECRET = 'secret'
  global.DOMAIN = 'serlo.localhost'
  global.ENVIRONMENT = 'local'
  global.FRONTEND_DOMAIN = 'frontend.serlo.localhost'

  global.MAINTENANCE_KV = createKV()
  global.PATH_INFO_KV = createKV()
  global.PACKAGES_KV = createKV()

  global.uuids = new Array<Uuid>()

  givenApi(defaultApiServer())
  givenFrontend(defaultFrontendServer())
  givenSerlo(defaultSerloServer())

  global.SENTRY_DSN = 'https://public@127.0.0.1/0'
  global.sentryEvents = []
  mockSentryServer()

  addGlobalMocks()
})

afterEach(() => {
  global.server.resetHandlers()
})

afterAll(() => {
  global.server.close()
})

function addGlobalMocks() {
  global.fetch = fetchNode as unknown as typeof fetch
  global.Response = NodeResponse as unknown as typeof Response
  global.Request = NodeRequest as unknown as typeof Request
  global.crypto = {
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
  } as unknown as typeof crypto
  global.TextEncoder = util.TextEncoder
}

function mockSentryServer() {
  const { hostname, pathname } = new URL(global.SENTRY_DSN)
  const sentryUrl = `https://${hostname}/api${pathname}/store/`

  global.server.use(
    rest.post<SentryEvent>(sentryUrl, (req, res, ctx) => {
      global.sentryEvents.push(req.body)

      return res(ctx.status(200))
    })
  )
}

export {}

declare global {
  // eslint-disable-next-line no-var
  var server: ReturnType<typeof import('msw/node').setupServer>
  // eslint-disable-next-line no-var
  var uuids: Uuid[]
  // eslint-disable-next-line no-var
  var sentryEvents: SentryEvent[]
}
