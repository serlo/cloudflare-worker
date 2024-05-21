import { SignJWT } from 'jose'

import { Url, CFEnvironment } from './utils'

export async function api(request: Request, env: CFEnvironment) {
  const url = Url.fromRequest(request)

  if (url.subdomain !== 'api') return null
  if (url.pathname !== '/graphql') return null

  const originalResponse = await fetchApi(request, env)
  const response = new Response(originalResponse.body, originalResponse)

  response.headers.set(
    'Access-Control-Allow-Origin',
    getAllowedOrigin(request.headers.get('Origin'), env),
  )

  // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Origin#cors_and_caching
  // for an explanation why this header is needed to be set
  response.headers.set('Vary', 'Origin')

  return response
}

export async function fetchApi(request: Request, env: CFEnvironment) {
  request = new Request(request)

  // Hash the IP address for the rate limiting feature and include hashed IP in
  // the headers
  const clientIp = request.headers.get('CF-Connecting-IP')

  if (clientIp) {
    const hashedIp = await hashIpAddress(clientIp)
    request.headers.set('X-Hashed-Client-IP', hashedIp)
  }

  request.headers.set(
    'Authorization',
    await getAuthorizationHeader(request, env),
  )

  return await fetch(request)
}

async function getAuthorizationHeader(request: Request, env: CFEnvironment) {
  const authorizationHeader = request.headers.get('Authorization')
  const serviceToken = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('2h')
    .setAudience('api.serlo.org')
    .setIssuer('serlo.org-cloudflare-worker')
    .sign(new TextEncoder().encode(env.API_SECRET))

  if (authorizationHeader && authorizationHeader.startsWith('Serlo')) {
    return authorizationHeader
  } else {
    return `Serlo Service=${serviceToken}`
  }
}

function getAllowedOrigin(requestOrigin: string | null, env: CFEnvironment) {
  try {
    if (
      requestOrigin != null &&
      requestOrigin !== '*' &&
      requestOrigin !== 'null'
    ) {
      const url = new Url(requestOrigin)

      if (
        url.domain === env.DOMAIN ||
        (env.ENVIRONMENT !== 'production' &&
          ((url.domain === 'localhost' && url.port === '3000') ||
            url.hostname.includes('-serlo.vercel.app')))
      ) {
        return requestOrigin
      }
    }
  } catch {
    // return default value
  }
  return `https://${env.DOMAIN}`
}

export async function hashIpAddress(ip: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(ip)
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
