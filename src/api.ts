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

  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, x-serlo-editor-testing',
  )

  return response
}

export async function fetchApi(request: Request, env: CFEnvironment) {
  request = new Request(request)

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
          ((url.domain === 'localhost' &&
            (url.port === '3000' || url.port === '3001')) ||
            url.hostname.includes('-serlo.vercel.app'))) ||
        url.hostname.includes('.adornis.de')
      ) {
        return requestOrigin
      }
    }
  } catch {
    // return default value
  }
  return `https://${env.DOMAIN}`
}
