import { getSubdomain, getPathname } from './url-utils'

export const FRONTEND_DOMAIN = 'frontend-sooty-ten.now.sh'

export async function handleRequest(
  request: Request
): Promise<Response | null> {
  const url = request.url

  if (getSubdomain(url) !== 'de') return null

  const path = getPathname(url)

  if (path === '/enable-frontend') {
    return createResponse('Enable frontend', true)
  }

  if (path === '/disable-frontend') {
    return createResponse('Disable frontend', false)
  }

  const { useFrontend } = chooseBackend(request)
  const backendRequest = useFrontend
    ? new Request(`https://${FRONTEND_DOMAIN}${path}`)
    : request

  return await fetch(backendRequest)
}

function createResponse(body: string, futureFrontendUse?: boolean) {
  const response = new Response(body)

  if (futureFrontendUse !== undefined) {
    const cookie = `${formatCookie(futureFrontendUse)}; path=/`

    response.headers.set('Set-Cookie', cookie)
  }

  return response
}

function chooseBackend(req: Request): { useFrontend: boolean } {
  const path = getPathname(req.url)
  const cookies = req.headers.get('Cookie')

  if (path.startsWith('/_next')) return { useFrontend: true }
  if (cookies?.includes(formatCookie(true))) return { useFrontend: true }
  if (cookies?.includes(formatCookie(false))) return { useFrontend: false }

  return { useFrontend: false }
}

function formatCookie(useFrontend: boolean) {
  return `useFrontend=${useFrontend}`
}
