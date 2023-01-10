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
import { SignJWT } from 'jose'

import { Url } from './utils'

export async function api(request: Request) {
  const url = Url.fromRequest(request)

  if (url.subdomain !== 'api') return null
  if (url.pathname !== '/graphql') return null

  const originalResponse = await fetchApi(request)
  const response = new Response(originalResponse.body, originalResponse)

  response.headers.set(
    'Access-Control-Allow-Origin',
    getAllowedOrigin(request.headers.get('Origin'))
  )

  // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin#cors_and_caching
  // for an explanation why this header is needed to be set
  response.headers.set('Vary', 'Origin')

  return response
}

export async function fetchApi(request: Request) {
  request = new Request(request)

  request.headers.set('Authorization', await getAuthorizationHeader(request))

  return await fetch(request)
}

async function getAuthorizationHeader(request: Request) {
  const authorizationHeader = request.headers.get('Authorization')
  const serviceToken = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('2h')
    .setAudience('api.serlo.org')
    .setIssuer('serlo.org-cloudflare-worker')
    .sign(Buffer.from(global.API_SECRET))

  if (authorizationHeader && authorizationHeader.startsWith('Serlo')) {
    return authorizationHeader
  } else {
    return `Serlo Service=${serviceToken}`
  }
}

function getAllowedOrigin(requestOrigin: string | null) {
  try {
    if (
      requestOrigin != null &&
      requestOrigin !== '*' &&
      requestOrigin !== 'null'
    ) {
      const url = new Url(requestOrigin)

      if (url.domain === global.DOMAIN || global.ENVIRONMENT !== 'production') {
        return requestOrigin
      }
    }
  } catch {
    // return default value
  }

  return `https://${global.DOMAIN}`
}
