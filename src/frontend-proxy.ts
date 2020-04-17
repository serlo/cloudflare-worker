import { getSubdomain, getPathname } from './url-utils'

export async function handleRequest(
  request: Request
): Promise<Response | null> {
  const url = request.url

  if (getSubdomain(url) !== 'de') return null

  const path = getPathname(url)

  if (path === "/enable-frontend") {
    const response = new Response("Enable frontend")
    response.headers.set("Set-Cookie", formatFrontendCookie(true))
    return response
  }

  return new Response('')
}

export function formatFrontendCookie(useFrontend: boolean) {
  return `useFrontend=${useFrontend}; path=/`
}
