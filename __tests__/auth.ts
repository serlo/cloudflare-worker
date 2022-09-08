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

import {
  currentTestEnvironment,
  currentTestEnvironmentWhen,
  expectIsJsonResponse,
} from './__utils__'

test('Frontend Sector Identifier URI Validation (block localhost)', async () => {
  global.ALLOW_AUTH_FROM_LOCALHOST = 'false'
  const env = currentTestEnvironmentWhen(
    (config) => config.ALLOW_AUTH_FROM_LOCALHOST === 'false'
  )

  const response = await env.fetch({
    pathname: '/auth/frontend-redirect-uris.json',
  })

  await expectIsJsonResponse(response, [
    env.createUrl({ subdomain: 'de', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'en', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'es', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'fr', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'hi', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'ta', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'de', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'en', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'es', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'fr', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'hi', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'ta', pathname: '/api/auth/callback/hydra' }),
  ])
})

test('Frontend Sector Identifier URI Validation (allow localhost)', async () => {
  global.ALLOW_AUTH_FROM_LOCALHOST = 'true'
  const env = currentTestEnvironmentWhen(
    (config) => config.ALLOW_AUTH_FROM_LOCALHOST === 'true'
  )

  const response = await env.fetch({
    pathname: '/auth/frontend-redirect-uris.json',
  })

  await expectIsJsonResponse(response, [
    env.createUrl({ subdomain: 'de', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'en', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'es', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'fr', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'hi', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'ta', pathname: '/api/auth/callback' }),
    env.createUrl({ subdomain: 'de', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'en', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'es', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'fr', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'hi', pathname: '/api/auth/callback/hydra' }),
    env.createUrl({ subdomain: 'ta', pathname: '/api/auth/callback/hydra' }),
    'http://localhost:3000/api/auth/callback',
    'http://localhost:3000/api/auth/callback/hydra',
  ])
})

test('Kratos Identity Schema', async () => {
  const env = currentTestEnvironment()
  const response = await env.fetch({
    pathname: '/auth/kratos-identity.schema.json',
  })

  expect(response.status).toBe(200)
})

test('Kratos After Registration Hook Payload', async () => {
  const env = currentTestEnvironment()
  const response = await env.fetch({
    pathname: '/auth/after-registration-hook-payload.jsonnet',
  })

  expect(response.status).toBe(200)
})
