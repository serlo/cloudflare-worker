import {
  SentryFactory,
  responseToContext,
  Url,
  getPlaceholder,
  isImageResponse,
} from './utils'

export async function assetProxy(
  request: Request,
  sentryFactory: SentryFactory,
): Promise<Response | null> {
  const url = Url.fromRequest(request)

  if (url.subdomain !== 'asset-proxy') return null
  if (url.pathname !== '/src') return null

  const urlParam = url.searchParams.get('url')

  if (!urlParam) return getPlaceholder()

  let assetUrl: Url

  try {
    assetUrl = new Url(urlParam)
  } catch {
    return getPlaceholder()
  }

  const originalResponse = await fetch(assetUrl, {
    cf: { cacheTtl: 24 * 60 * 60 },
  })

  if (originalResponse.ok && isImageResponse(originalResponse)) {
    const response = new Response(originalResponse.body, originalResponse)
    response.headers.delete('set-cookie')
    return response
  }

  return getPlaceholder()
}
