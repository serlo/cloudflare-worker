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

import { currentTestEnvironment } from './__utils__'

describe('proxy for pdf.serlo.org', () => {
  beforeEach(() => {
    setupPdfSerloOrg()
  })

  test('request to de.serlo.org/api/pdf/* gets pdf from pdf.serlo.org', async () => {
    const env = currentTestEnvironment()
    const response = await env.fetch({
      subdomain: 'de',
      pathname: '/api/pdf/100',
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
  })

  function setupPdfSerloOrg() {
    global.server.use(
      rest.get('https://pdf.serlo.org/api/100', (_req, res, ctx) => {
        return res(ctx.set('content-type', 'application/pdf'))
      })
    )
  }
})
