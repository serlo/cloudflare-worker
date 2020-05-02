import { getSubdomain, getPathname } from './url-utils'

export async function handleRequest(
  request: Request
): Promise<Response | null> {
  const frontendDomain = getEnvironmentVariable('FRONTEND_DOMAIN')
  const apiEndpoint = getEnvironmentVariable('API_ENDPOINT')
  const probability = Number(getEnvironmentVariable('FRONTEND_PROBABILITY'))
  const allowedTypes = JSON.parse(
    getEnvironmentVariable('FRONTEND_ALLOWED_TYPES')
  )

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
    const frontendUrl = `https://${frontendDomain}${getPathname(request.url)}`
    const backendRequest = useFrontend
      ? new Request(frontendUrl, request)
      : request
    const response = (await fetch(backendRequest)).clone()

    if (setCookie) setCookieUseFrontend(response, useFrontend)

    return response
  }

  function setCookieUseFrontend(res: Response, useFrontend: boolean) {
    res.headers.set('Set-Cookie', `${formatCookie(useFrontend)}; path=/`)
  }

  function formatCookie(useFrontend: boolean) {
    return `useFrontend${Math.floor(probability * 100)}=${useFrontend}`
  }

  async function queryTypename(path: string): Promise<string | null> {
    const apiRequest = new Request(apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: createApiQuery(path) }),
    })
    const apiResponse = await fetch(apiRequest)
    const apiResult = await apiResponse.json()

    return apiResult?.data?.uuid?.__typename ?? null
  }
}

export function createApiQuery(path: string): string {
  const pathWithoutSlash = path.startsWith('/') ? path.slice(1) : path
  const query = /^\/?\d+$/.test(pathWithoutSlash)
    ? `id: ${pathWithoutSlash}`
    : `alias: { instance: de, path: "/${pathWithoutSlash}" }`

  return `{ uuid(${query}) { __typename } }`
}

function getEnvironmentVariable(envName: string): string {
  const value = process.env[envName]

  if (value === undefined) throw new TypeError(`${envName} is not set`)

  return value
}
