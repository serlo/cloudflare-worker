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
import { setupServer } from 'msw/node'
import fetchNode, {
  Response as NodeResponse,
  Request as NodeRequest,
} from 'node-fetch'

import { mockKV } from './__tests__/_helper'

global.server = setupServer()
const randomCopy = Math.random

beforeAll(() => {
  global.server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  global.API_ENDPOINT = 'https://api.serlo.org'
  global.API_SECRET = 'secret'
  global.FRONTEND_DOMAIN = 'frontend.serlo.org'
  global.FRONTEND_PROBABILITY = '1'
  global.FRONTEND_ALLOWED_TYPES = '[]'
  // TODO: Remove this since this tests an implementation details
  global.fetch = jest.fn().mockImplementation(fetchNode)

  mockKV('MAINTENANCE_KV', {})
  mockKV('PATH_INFO_KV', {})
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

// FIXME: Delete the following mock, when node-fetch is available in version 3.0.0
// See https://github.com/node-fetch/node-fetch/commit/0959ca9739850bbd24e0721cc1296e7a0aa5c2bd#diff-d0f5704ae0738a7bd1f54aff42ddcb41
// eslint-disable-next-line @typescript-eslint/unbound-method
NodeResponse.redirect = function (url: string, status = 302) {
  return new NodeResponse('', { status, headers: { location: url } })
}

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace NodeJS {
    interface Global {
      server: ReturnType<typeof import('msw/node').setupServer>
    }
  }
}
