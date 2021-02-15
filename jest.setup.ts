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
// eslint-disable-next-line import/no-unassigned-import
import '@testing-library/jest-dom'
import * as cryptoNode from 'crypto'
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
  getCurrentTestEnvironment,
  TestEnvironment,
  currentTestEnvironmentConfig,
} from './__tests__/__utils__'

const randomCopy = Math.random

if (getCurrentTestEnvironment() !== TestEnvironment.Local) {
  jest.setTimeout(20000)
}

beforeAll(() => {
  global.API_ENDPOINT = 'https://api.serlo.org/graphql'
  global.server = setupServer()
  global.server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  global.API_SECRET = 'secret'

  global.DOMAIN = currentTestEnvironmentConfig().DOMAIN ?? 'serlo.local'

  global.FRONTEND_DOMAIN = 'frontend.serlo.org'
  global.FRONTEND_PROBABILITY_DESKTOP = '1'
  global.FRONTEND_PROBABILITY_MOBILE = '1'
  global.FRONTEND_PROBABILITY_AUTHENTICATED = '1'
  global.FRONTEND_ALLOWED_TYPES = '[]'
  // TODO: Remove this since this tests an implementation details
  global.fetch = jest.fn().mockImplementation(fetchNode)

  global.MAINTENANCE_KV = createKV()
  global.PATH_INFO_KV = createKV()
  global.PACKAGES_KV = createKV()

  global.uuids = new Array<Uuid>()

  givenApi(defaultApiServer())
  givenSerlo(defaultSerloServer())
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

export {}

declare global {
  namespace NodeJS {
    interface Global {
      server: ReturnType<typeof import('msw/node').setupServer>
      uuids: Uuid[]
    }
  }
}
