import { getSubdomain, getPathname } from './url-utils'

export async function handleRequest(
  request: Request
): Promise<Response | null> {
  if (global.FRONTEND_DOMAIN === undefined) throw new Error('Test')

  const probability = Number(global.FRONTEND_PROBABILITY)
  const allowedTypes = JSON.parse(global.FRONTEND_ALLOWED_TYPES)

  const url = request.url
  const path = getPathname(url)

  if (getSubdomain(url) !== 'de') return null

  if (path === '/enable-frontend') {
    const response = new Response('Enable frontend')

    setCookieUseFrontend(response, true)

    return response
  }

  if (path === '/disable-frontend') {
    const response = new Response('Disable frontend')

    setCookieUseFrontend(response, false)

    return response
  }

  if (path.startsWith('/_next/') || path.startsWith('/_assets/'))
    return await fetchBackend({ useFrontend: true, setCookie: false })

  if (path !== '/') {
    const typename = await queryTypename(path)
    if (typename === null || !allowedTypes.includes(typename)) return null
  }

  const cookies = request.headers.get('Cookie')

  if (cookies?.includes(formatCookie(true)))
    return fetchBackend({ useFrontend: true, setCookie: false })
  if (cookies?.includes(formatCookie(false)))
    return await fetchBackend({ useFrontend: false, setCookie: false })

  return await fetchBackend({
    useFrontend: Math.random() < probability,
    setCookie: true,
  })

  async function fetchBackend({
    useFrontend,
    setCookie,
  }: {
    useFrontend: boolean
    setCookie: boolean
  }) {
    const backendUrl = useFrontend
      ? `https://${global.FRONTEND_DOMAIN}${getPathname(request.url)}`
      : request.url
    const backendRequest = new Request(backendUrl, request)
    backendRequest.headers.set('X-SERLO-API', global.API_ENDPOINT)

    const response = await fetch(backendRequest)

    const clonedResponse = new Response(response.body, response)
    if (setCookie) setCookieUseFrontend(clonedResponse, useFrontend)

    return clonedResponse
  }

  function setCookieUseFrontend(res: Response, useFrontend: boolean) {
    res.headers.set('Set-Cookie', `${formatCookie(useFrontend)}; path=/`)
  }

  function formatCookie(useFrontend: boolean) {
    return `useFrontend${Math.floor(probability * 100)}=${useFrontend}`
  }

  async function queryTypename(path: string): Promise<string | null> {
    const cachedType = await global.FRONTEND_CACHE_TYPES.get(path)
    if (cachedType !== null) return cachedType

    const apiResponse = await fetch(global.API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: createApiQuery(path) }),
    })
    const apiResult = await apiResponse.json()
    const typename = apiResult?.data?.uuid?.__typename ?? null

    if (typename !== null)
      await global.FRONTEND_CACHE_TYPES.put(path, typename, {
        expirationTtl: 60 * 60,
      })

    return typename
  }
}

export function createApiQuery(path: string): string {
  const pathWithoutSlash = path.startsWith('/') ? path.slice(1) : path
  const query = /^\/?\d+$/.test(pathWithoutSlash)
    ? `id: ${pathWithoutSlash}`
    : `alias: { instance: de, path: "/${pathWithoutSlash}" }`

  return `{ uuid(${query}) { __typename } }`
}
