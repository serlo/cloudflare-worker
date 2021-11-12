/* eslint-disable no-var */
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

declare global {
  declare namespace NodeJS {
    interface Global extends KVs, Variables, Secrets {}
  }
}

// Secrets
declare global {
  var API_SECRET: string
  var SENTRY_DSN: string
}

// Variables
declare global {
  var ALLOW_AUTH_FROM_LOCALHOST: 'true' | 'false'
  var API_ENDPOINT: string
  var DOMAIN: string
  var ENVIRONMENT: string
  var ENABLE_BASIC_AUTH: 'true' | 'false'
  var FRONTEND_DOMAIN: string
  var FRONTEND_PROBABILITY: string
}

// for tests, not sure how to share above types
export interface Variables {
  ALLOW_AUTH_FROM_LOCALHOST: 'true' | 'false'
  API_ENDPOINT: string
  DOMAIN: string
  ENVIRONMENT: string
  ENABLE_BASIC_AUTH: 'true' | 'false'
  FRONTEND_DOMAIN: string
  FRONTEND_PROBABILITY: string
}

// KVs
declare global {
  var MAINTENANCE_KV: KV<'enabled'>
  var PACKAGES_KV: KV<string>
  var PATH_INFO_KV: KV<import('./utils').CacheKey>
}

export interface KV<Key extends string> {
  get: (key: Key) => Promise<string | null>
  put: (
    key: Key,
    value: string,
    options?: { expirationTtl: number }
  ) => Promise<void>
}
