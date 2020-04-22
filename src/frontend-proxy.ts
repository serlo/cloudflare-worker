import { getSubdomain, getPathname } from './url-utils'

export const FRONTEND_DOMAIN = 'frontend-sooty-ten.now.sh'
const API_ENDPOINT = 'https://api.serlo.org/graphql'
const FRONTEND_ALLOWED_TYPES = ['Article', 'TaxonomyTerm']
const FRONTEND_PROBABILITY = 0.1

export async function handleRequest(
  request: Request,
  probability = FRONTEND_PROBABILITY,
  allowedTypes = FRONTEND_ALLOWED_TYPES
): Promise<Response | null> {
  const url = request.url
  const path = getPathname(url)

  if (getSubdomain(url) !== 'de') return null

  if (path === '/enable-frontend')
    return createResponse('Enable frontend', probability, true)
  if (path === '/disable-frontend')
    return createResponse('Disable frontend', probability, false)

  if (path.startsWith('/_next')) return await fetchBackend(true, false)

  const typename = await queryTypename(path)
  if (typename === null || !allowedTypes.includes(typename)) return null

  const cookies = request.headers.get('Cookie')

  if (cookies?.includes(formatCookie(true, probability)))
    return fetchBackend(true, false)
  if (cookies?.includes(formatCookie(false, probability)))
    return await fetchBackend(false, false)

  return await fetchBackend(Math.random() < probability, true)

  async function fetchBackend(useFrontend: boolean, setCookie?: boolean) {
    const backendRequest = useFrontend
      ? new Request(
          `https://${FRONTEND_DOMAIN}${getPathname(request.url)}`,
          request
        )
      : request

    return await createResponse(
      await fetch(backendRequest),
      probability,
      setCookie ? useFrontend : undefined
    )
  }
}

async function queryTypename(path: string): Promise<string | null> {
  const apiRequest = new Request(API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: createApiQuery(path) }),
  })
  const apiResponse = await fetch(apiRequest)
  const apiResult = await apiResponse.json()

  return apiResult?.data?.uuid?.__typename ?? null
}

export function createApiQuery(path: string): string {
  const pathWithoutSlash = path.startsWith('/') ? path.slice(1) : path
  const query = /^\/?\d+$/.test(pathWithoutSlash)
    ? `id: ${pathWithoutSlash}`
    : `alias: { instance: de, path: "/${pathWithoutSlash}" }`

  return `{ uuid(${query}) { __typename } }`
}

async function createResponse(
  resInfo: string | Response,
  probability: number,
  futureFrontendUse?: boolean
) {
  const body = typeof resInfo === 'string' ? resInfo : await resInfo.text()
  const init = typeof resInfo === 'string' ? undefined : resInfo
  const response = new Response(body, init)

  if (futureFrontendUse !== undefined) {
    const cookie = `${formatCookie(futureFrontendUse, probability)}; path=/`

    response.headers.set('Set-Cookie', cookie)
  }

  return response
}

function formatCookie(useFrontend: boolean, probability: number) {
  return `useFrontend${Math.floor(probability * 100)}=${useFrontend}`
}
