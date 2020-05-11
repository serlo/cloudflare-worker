import { fetchApi } from './api'
import { getSubdomain, getPathname } from './url-utils'

export async function handleRequest(
  request: Request
): Promise<Response | null> {
  const probability = Number(global.FRONTEND_PROBABILITY)
  const allowedTypes = JSON.parse(global.FRONTEND_ALLOWED_TYPES)

  const url = request.url
  const path = getPathname(url)

  if (getSubdomain(url) !== 'de') return null

  if (path === '/enable-frontend') {
    const response = new Response('Enable frontend')

    setCookieUseFrontend(response, 0)

    return response
  }

  if (path === '/disable-frontend') {
    const response = new Response('Disable frontend')

    setCookieUseFrontend(response, 1)

    return response
  }

  if (
    path.startsWith('/_next/') ||
    path.startsWith('/_assets/') ||
    path.startsWith('/api/frontend/')
  )
    return await fetchBackend(true)

  const cookies = request.headers.get('Cookie')

  if (cookies?.includes('authenticated=1')) return await fetchBackend(false)

  if (path !== '/') {
    const typename = await queryTypename(path)
    if (typename === null || !allowedTypes.includes(typename)) return null
  }

  const cookieUseFrontend = cookies?.match(/useFrontend=([^;]+)/)?.[1]
  const convertedCookieValue = Number(cookieUseFrontend)
  const useFrontendNumber = Number.isNaN(convertedCookieValue)
    ? Math.random()
    : convertedCookieValue

  const response = await fetchBackend(useFrontendNumber <= probability)
  if (Number.isNaN(convertedCookieValue))
    setCookieUseFrontend(response, useFrontendNumber)

  return response

  async function fetchBackend(useFrontend: boolean) {
    const backendUrl = useFrontend
      ? `https://${global.FRONTEND_DOMAIN}${getPathname(request.url)}`
      : request.url
    const backendRequest = new Request(backendUrl, request)
    backendRequest.headers.set('X-SERLO-API', global.API_ENDPOINT)

    const response = await fetch(backendRequest)

    return new Response(response.body, response)
  }

  function setCookieUseFrontend(res: Response, useFrontend: number) {
    res.headers.append('Set-Cookie', `useFrontend=${useFrontend}; path=/`)
  }

  async function queryTypename(path: string): Promise<string | null> {
    const cachedType = await global.FRONTEND_CACHE_TYPES_KV.get(path)
    if (cachedType !== null) return cachedType

    const apiResponse = await fetchApi(global.API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: createApiQuery(path) }),
    })
    const apiResult = await apiResponse.json()
    const typename = apiResult?.data?.uuid?.__typename ?? null

    if (typename !== null)
      await global.FRONTEND_CACHE_TYPES_KV.put(path, typename, {
        expirationTtl: 60 * 60,
      })

    return typename
  }
}

export function createApiQuery(path: string): string {
  const query = /^\/\d+$/.test(path)
    ? `id: ${path.slice(1)}`
    : `alias: { instance: de, path: "${path}" }`

  return `{ uuid(${query}) { __typename } }`
}
