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
import jwt from 'jsonwebtoken'

import { getPathname, getSubdomain } from '../url-utils'

export async function api(request: Request) {
  if (getSubdomain(request.url) !== 'api') return null
  if (getPathname(request.url) !== '/graphql') return null

  return await fetchApi(request)
}

export async function fetchApi(request: Request) {
  const serviceToken = jwt.sign({}, global.API_SECRET, {
    expiresIn: '2h',
    audience: 'api.serlo.org',
    issuer: 'serlo.org-cloudflare-worker',
  })

  request = new Request(request)
  request.headers.set('Authorization', getAuthorizationHeader())

  return await fetch(request)

  function getAuthorizationHeader() {
    const authorizationHeader = request.headers.get('Authorization')

    if (authorizationHeader === null) {
      const serviceToken = jwt.sign({}, global.API_SECRET, {
        expiresIn: '2h',
        audience: 'api.serlo.org',
        issuer: 'serlo.org-cloudflare-worker',
      })
      return `Serlo Service=${serviceToken}`
    }

    if (authorizationHeader.startsWith('Serlo')) return authorizationHeader

    return `Serlo Service=${serviceToken};User=${authorizationHeader.replace(
      'Bearer ',
      ''
    )}`
  }
}
