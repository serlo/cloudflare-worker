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
declare namespace NodeJS {
  interface Global {
    ALLOW_AUTH_FROM_LOCALHOST: 'true' | 'false'
    API_ENDPOINT: string
    DOMAIN: string
    ENABLE_BASIC_AUTH: 'true' | 'false'
    ENABLE_PATH_INFO_CACHE: 'true' | 'false'
    FRONTEND_ALLOWED_TYPES: string
    FRONTEND_DOMAIN: string
    FRONTEND_PROBABILITY: string
    FRONTEND_SUPPORT_INTERNATIONALIZATION: string
    REDIRECT_AUTHENTICATED_USERS_TO_LEGACY_BACKEND: 'true' | 'false'
    fetch: typeof fetch
  }
}
