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
import {
  TestEnvironment,
  domains,
  getTestEnvironment,
} from './test-environment'

export function fetchSerlo(spec: UrlSpec, init?: RequestInit) {
  const request = new Request(createUrl(spec), init)

  if ((spec.environment ?? getTestEnvironment()) === TestEnvironment.Local) {
    return handleRequest(request)
  } else {
    // See https://github.com/mswjs/msw/blob/master/src/context/fetch.ts
    request.headers.set('x-msw-bypass', 'true')

    return fetch(request, { redirect: 'manual' })
  }
}

export function createUrl({
  subdomain = '',
  pathname = '/',
  environment = getTestEnvironment(),
  protocol = 'https',
}: UrlSpec) {
  return (
    protocol +
    '://' +
    subdomain +
    (subdomain.length > 0 ? '.' : '') +
    domains[environment] +
    pathname
  )
}

interface UrlSpec {
  subdomain?: string
  pathname?: string
  environment?: TestEnvironment
  protocol?: 'http' | 'https'
}
