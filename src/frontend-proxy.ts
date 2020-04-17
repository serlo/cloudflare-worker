import { getSubdomain, getPathname } from './url-utils'

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

  return new Response('')
}

export function formatFrontendCookie(useFrontend: boolean) {
  return `useFrontend=${useFrontend}; path=/`
}

function createFrontendUsageResponse(body: string, useFrontend: boolean) {
  const response = new Response(body)

  response.headers.set('Set-Cookie', formatFrontendCookie(useFrontend))

  return response
}
