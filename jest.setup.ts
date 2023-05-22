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
import { type Event as SentryEvent } from '@sentry/types'
import * as cryptoNode from 'crypto'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import fetchNode, {
  Response as NodeResponse,
  Request as NodeRequest,
} from 'node-fetch'
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
  localTestEnvironment,
} from './__tests__/__utils__'

const timeout = currentTestEnvironment().getNeededTimeout()

if (timeout) {
  jest.setTimeout(timeout)
}

beforeAll(() => {
  globalThis.API_ENDPOINT = 'https://api.serlo.org/graphql'
  globalThis.server = setupServer()
  globalThis.server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  globalThis.API_SECRET = 'secret'
  globalThis.DOMAIN = localTestEnvironment().getDomain()
  globalThis.ENVIRONMENT = 'local'
  globalThis.FRONTEND_DOMAIN = 'frontend.serlo.localhost'

  globalThis.MAINTENANCE_KV = createKV()
  globalThis.PATH_INFO_KV = createKV()
  globalThis.PACKAGES_KV = createKV()

  globalThis.uuids = new Array<Uuid>()

  givenApi(defaultApiServer())
  givenFrontend(defaultFrontendServer())
  givenSerlo(defaultSerloServer())

  globalThis.SENTRY_DSN = 'https://public@127.0.0.1/0'
  globalThis.sentryEvents = []
  mockSentryServer()

  addGlobalMocks()
})

afterEach(() => {
  globalThis.server.resetHandlers()
})

afterAll(() => {
  globalThis.server.close()
})

function addGlobalMocks() {
  globalThis.fetch = fetchNode as unknown as typeof fetch
  globalThis.Response = NodeResponse as unknown as typeof Response
  globalThis.Request = NodeRequest as unknown as typeof Request
  globalThis.crypto = {
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
    randomUUID: cryptoNode.randomUUID,
  } as unknown as typeof crypto
  globalThis.TextEncoder = util.TextEncoder
}

function mockSentryServer() {
  const { hostname, pathname } = new URL(globalThis.SENTRY_DSN)
  const sentryUrl = `https://${hostname}/api${pathname}/envelope/`

  globalThis.server.use(
    rest.post<SentryEvent>(sentryUrl, async (req, res, ctx) => {
      globalThis.sentryEvents.push(
        ...(await req.text())
          .split('\n')
          .map((x) => JSON.parse(x) as SentryEvent)
      )

      return res(ctx.status(200))
    })
  )
}

export {}

declare global {
  // eslint-disable-next-line no-var
  var server: ReturnType<typeof import('msw/node').setupServer>
  // eslint-disable-next-line no-var
  var sentryEvents: SentryEvent[]
}
