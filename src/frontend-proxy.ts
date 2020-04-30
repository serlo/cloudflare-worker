import { getSubdomain, getPathname } from './url-utils'

export const FRONTEND_DOMAIN = 'frontend.serlo.now.sh'
const API_ENDPOINT = 'https://api.serlo.org/graphql'
const FRONTEND_ALLOWED_TYPES = [
  'Article',
  'Applet',
  'Course',
  'CoursePage',
  'Page',
  'TaxonomyTerm',
  'Video',
]
const FRONTEND_PROBABILITY = 0.1

export async function handleRequest(
  request: Request,
  probability = FRONTEND_PROBABILITY,
  allowedTypes = FRONTEND_ALLOWED_TYPES
): Promise<Response | null> {
  const url = request.url
  const path = getPathname(url)

  if (getSubdomain(url) !== 'de') return null

  if (path === '/enable-frontend') {
    const response = new Response('Enable frontend')

    setFrontendUseCookie(response, true)

    return response
  }

  if (path === '/disable-frontend') {
    const response = new Response('Disable frontend')

    setFrontendUseCookie(response, false)

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
    const frontendUrl = `https://${FRONTEND_DOMAIN}${getPathname(request.url)}`
    const backendRequest = useFrontend
      ? new Request(frontendUrl, request)
      : request
    const response = (await fetch(backendRequest)).clone()

    if (setCookie) setFrontendUseCookie(response, useFrontend)

    return response
  }

  function setFrontendUseCookie(res: Response, useFrontend: boolean) {
    res.headers.set('Set-Cookie', `${formatCookie(useFrontend)}; path=/`)
  }

  function formatCookie(useFrontend: boolean) {
    return `useFrontend${Math.floor(probability * 100)}=${useFrontend}`
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
