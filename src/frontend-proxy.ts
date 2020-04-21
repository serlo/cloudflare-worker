import { getSubdomain, getPathname } from './url-utils'

export const FRONTEND_DOMAIN = 'frontend-sooty-ten.now.sh'
const FRONTEND_PROBABILITY = 0.1

export async function handleRequest(
  request: Request,
  probability = FRONTEND_PROBABILITY
): Promise<Response | null> {
  const url = request.url
  const path = getPathname(url)

  if (getSubdomain(url) !== 'de') return null
  if (path === '/enable-frontend')
    return createResponse('Enable frontend', probability, true)
  if (path === '/disable-frontend')
    return createResponse('Disable frontend', probability, false)

  const { useFrontend, setCookie } = chooseBackend(request, probability)

  const backendRequest = useFrontend
    ? new Request(`https://${FRONTEND_DOMAIN}${path}`, request)
    : request

  return createResponse(
    await fetch(backendRequest),
    probability,
    setCookie ? useFrontend : undefined
  )
}

function chooseBackend(
  req: Request,
  probability: number
): { useFrontend: boolean; setCookie: boolean } {
  const path = getPathname(req.url)
  const cookies = req.headers.get('Cookie')

  if (path.startsWith('/_next')) return { useFrontend: true, setCookie: false }

  if (cookies?.includes(formatCookie(true, probability)))
    return { useFrontend: true, setCookie: false }
  if (cookies?.includes(formatCookie(false, probability)))
    return { useFrontend: false, setCookie: false }

  return { useFrontend: Math.random() < probability, setCookie: true }
}

function createResponse(
  text: string | Response,
  probability: number,
  futureFrontendUse?: boolean
) {
  const response = typeof text === 'string' ? new Response(text) : text

  if (futureFrontendUse !== undefined) {
    const cookie = `${formatCookie(futureFrontendUse, probability)}; path=/`

    response.headers.set('Set-Cookie', cookie)
  }

  return response
}

function formatCookie(useFrontend: boolean, probability: number) {
  return `useFrontend${Math.floor(probability * 100)}=${useFrontend}`
}
