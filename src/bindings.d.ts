/* eslint-disable no-var */
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
// Secrets
declare var API_SECRET: string
declare var SENTRY_DSN: string

// Variables
declare var ALLOW_AUTH_FROM_LOCALHOST: 'true' | 'false'
declare var API_ENDPOINT: string
declare var DOMAIN: string
declare var ENVIRONMENT: 'staging' | 'production' | 'local'
declare var ENABLE_BASIC_AUTH: 'true' | 'false'
declare var FRONTEND_DOMAIN: string
declare var FRONTEND_PROBABILITY: string

// KVs
declare var MAINTENANCE_KV: KVNamespace<'enabled'>
declare var PACKAGES_KV: KVNamespace<string>
declare var PATH_INFO_KV: KVNamespace<import('./utils').CacheKey>
