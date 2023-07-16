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
    getAllowedOrigin(request.headers.get('Origin')),
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
    .sign(new TextEncoder().encode(globalThis.API_SECRET))

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

      if (
        url.domain === globalThis.DOMAIN ||
        (globalThis.ENVIRONMENT !== 'production' &&
          ((url.domain === 'localhost' && url.port === '3000') ||
            url.hostname.includes('-serlo.vercel.app')))
      ) {
        return requestOrigin
      }
    }
  } catch {
    // return default value
  }
  return `https://${globalThis.DOMAIN}`
}
