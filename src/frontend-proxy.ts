import { getSubdomain } from './url-utils'

export async function handleRequest(
  request: Request
): Promise<Response | null> {
  if (getSubdomain(request.url) !== 'de') return null

  return new Response('')
}
