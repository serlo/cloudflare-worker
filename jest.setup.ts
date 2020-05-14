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
import { Response, Request } from 'node-fetch'

import { mockKV } from './__tests__/_helper'

const fetchCopy = global.fetch
const randomCopy = Math.random

afterEach(() => {
  Math.random = randomCopy
  global.fetch = fetchCopy
})

beforeEach(() => {
  global.API_ENDPOINT = 'https://api.serlo.org'
  global.API_SECRET = 'secret'
  global.FRONTEND_DOMAIN = 'frontend.serlo.org'
  global.FRONTEND_PROBABILITY = '1'
  global.FRONTEND_ALLOWED_TYPES = '[]'

  mockKV('MAINTENANCE_KV', {})
})

global.Response = Response
global.Request = Request

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      Response: typeof Response
      Request: typeof Request
    }
  }
}

// TODO: Delete the following mock, when node-fetch is available in version 3.0.0
// See https://github.com/node-fetch/node-fetch/commit/0959ca9739850bbd24e0721cc1296e7a0aa5c2bd#diff-d0f5704ae0738a7bd1f54aff42ddcb41
// eslint-disable-next-line @typescript-eslint/unbound-method
Response.redirect = function (url: string, status = 302) {
  return new Response('', { status, headers: { location: url } })
}
