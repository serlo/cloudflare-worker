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
import { isInstance } from '../../src/utils'
import {
  TestEnvironment,
  domains,
  getTestEnvironment,
} from './test-environment'

export function fetchSerlo(spec: UrlSpec, init?: RequestInit) {
  const request = new Request(createUrl(spec), init)
  const { environment, subdomain } = withDefaults(spec)

  if (environment === TestEnvironment.Local) {
    return handleRequest(request)
  } else {
    // See https://github.com/mswjs/msw/blob/master/src/context/fetch.ts
    request.headers.set('x-msw-bypass', 'true')

    if (environment === TestEnvironment.Staging && isInstance(subdomain)) {
      request.headers.set('Authorization', 'Basic c2VybG90ZWFtOnNlcmxvdGVhbQ==')
    }

    return fetch(request, { redirect: 'manual' })
  }
}

export function createUrl(spec: UrlSpec) {
  const { protocol, subdomain, environment, pathname } = withDefaults(spec)

  return (
    protocol +
    '://' +
    subdomain +
    (subdomain.length > 0 ? '.' : '') +
    domains[environment] +
    pathname
  )
}

function withDefaults(spec: UrlSpec): Required<UrlSpec> {
  return {
    subdomain: spec.subdomain ?? '',
    pathname: spec.pathname ?? '/',
    environment: spec.environment ?? getTestEnvironment(),
    protocol: spec.protocol ?? 'https',
  }
}

interface UrlSpec {
  subdomain?: string
  pathname?: string
  environment?: TestEnvironment
  protocol?: 'http' | 'https'
}
