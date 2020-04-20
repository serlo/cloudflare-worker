import { getSubdomain, getPathname } from './url-utils'

export const FRONTEND_DOMAIN = 'frontend-sooty-ten.now.sh'

export async function handleRequest(
  request: Request
): Promise<Response | null> {
  const url = request.url

  if (getSubdomain(url) !== 'de') return null

  const path = getPathname(url)

  if (path === '/enable-frontend') {
    return createFrontendUsageResponse('Enable frontend', true)
  }

  if (path === '/disable-frontend') {
    return createFrontendUsageResponse('Disable frontend', false)
  }

  if (path.startsWith('/_next')) {
    const frontendUrl = `https://${FRONTEND_DOMAIN}${path}`
    const frontendResponse = await fetch(frontendUrl)

    const response = new Response(frontendResponse.body)
    return response
  }

  return new Response('')
}

export function formatFrontendUsageCookie(useFrontend: boolean) {
  return `useFrontend=${useFrontend}; path=/`
}

function createFrontendUsageResponse(body: string, useFrontend: boolean) {
  const response = new Response(body)

  response.headers.set('Set-Cookie', formatFrontendUsageCookie(useFrontend))

  return response
}
