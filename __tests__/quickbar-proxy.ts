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

import { currentTestEnvironment } from './__utils__'

describe('de.serlo.org/api/stats/quickbar.json', () => {
  beforeEach(() => {
    setupArrrg()
  })

  test('returns json file', async () => {
    const env = currentTestEnvironment()
    const response = await env.fetch({
      subdomain: 'de',
      pathname: '/api/stats/quickbar.json',
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/json')

    expect(await response.text()).toEqual(
      expect.stringContaining('"title":"Math Landing"')
    )
  })

  function setupArrrg() {
    global.server.use(
      rest.get(
        'https://arrrg.de/serlo-stats/quickbar.json',
        (req, res, ctx) => {
          return res(
            ctx.set('content-type', 'application/json'),
            ctx.body(
              '[{"id":"100","title":"Math Landing","path":[],"isTax":false,"count":10000}]'
            )
          )
        }
      )
    )
  }
})
