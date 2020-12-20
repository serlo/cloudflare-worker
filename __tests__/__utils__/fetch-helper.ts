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

import { handleRequest } from '../../src'

interface PartialUrlSpec {
  subdomain?: string
  pathname?: string
}

interface UrlSpec extends PartialUrlSpec {
  environment: TestEnvironment
}

enum TestEnvironment {
  Local = 'local',
  Dev = 'dev',
  Staging = 'staging',
  Production = 'production',
}

export function fetchTestEnvironment(spec: PartialUrlSpec, init?: RequestInit) {
  return fetchAt({ ...spec, environment: getTestEnvironment() }, init)
}

export function fetchLocally(spec: PartialUrlSpec, init?: RequestInit) {
  return fetchAt({ ...spec, environment: TestEnvironment.Local }, init)
}

function fetchAt(
  { subdomain = '', pathname = '/', environment }: UrlSpec,
  init?: RequestInit
) {
  const url =
    'https://' +
    subdomain +
    (subdomain.length > 0 ? '.' : '') +
    getDomain(environment) +
    pathname
  const request = new Request(url, init)

  if (environment === TestEnvironment.Local) {
    return handleRequest(request)
  } else {
    // See https://github.com/mswjs/msw/blob/master/src/context/fetch.ts
    request.headers.set('x-msw-bypass', 'true')

    return fetch(request)
  }
}

function getDomain(environment: TestEnvironment): string {
  switch (environment) {
    case TestEnvironment.Production:
      return 'serlo.org'
    case TestEnvironment.Staging:
      return 'serlo-staging.dev'
    case TestEnvironment.Dev:
      return 'serlo-development.dev'
    case TestEnvironment.Local:
      return 'serlo.local'
  }
}

function getTestEnvironment(): TestEnvironment {
  const environment = (process.env.TEST_ENVIRONMENT ?? '').toLowerCase()

  return isTestEnvironment(environment) ? environment : TestEnvironment.Local
}

function isTestEnvironment(env: string): env is TestEnvironment {
  return Object.values(TestEnvironment).includes(env as TestEnvironment)
}
