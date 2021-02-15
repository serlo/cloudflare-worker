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

import {
  createUrl,
  currentTestEnvironmentWhen,
  expectIsJsonResponse,
  fetchSerlo,
} from './__utils__'

test('Frontend Sector Identifier URI Validation (block localhost)', async () => {
  global.ALLOW_AUTH_FROM_LOCALHOST = 'false'

  const response = await fetchSerlo({
    pathname: '/auth/frontend-redirect-uris.json',
    environment: currentTestEnvironmentWhen(
      (config) => config.ALLOW_AUTH_FROM_LOCALHOST === 'false'
    ),
  })

  await expectIsJsonResponse(response, [
    createUrl({ subdomain: 'de', pathname: '/api/auth/callback' }),
    createUrl({ subdomain: 'en', pathname: '/api/auth/callback' }),
    createUrl({ subdomain: 'es', pathname: '/api/auth/callback' }),
    createUrl({ subdomain: 'fr', pathname: '/api/auth/callback' }),
    createUrl({ subdomain: 'hi', pathname: '/api/auth/callback' }),
    createUrl({ subdomain: 'ta', pathname: '/api/auth/callback' }),
  ])
})

test('Frontend Sector Identifier URI Validation (allow localhost)', async () => {
  global.ALLOW_AUTH_FROM_LOCALHOST = 'true'

  const response = await fetchSerlo({
    pathname: '/auth/frontend-redirect-uris.json',
    environment: currentTestEnvironmentWhen(
      (config) => config.ALLOW_AUTH_FROM_LOCALHOST === 'true'
    ),
  })

  await expectIsJsonResponse(response, [
    createUrl({ subdomain: 'de', pathname: '/api/auth/callback' }),
    createUrl({ subdomain: 'en', pathname: '/api/auth/callback' }),
    createUrl({ subdomain: 'es', pathname: '/api/auth/callback' }),
    createUrl({ subdomain: 'fr', pathname: '/api/auth/callback' }),
    createUrl({ subdomain: 'hi', pathname: '/api/auth/callback' }),
    createUrl({ subdomain: 'ta', pathname: '/api/auth/callback' }),
    'http://localhost:3000/api/auth/callback',
  ])
})
