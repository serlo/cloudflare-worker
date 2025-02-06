import { Url, getPlaceholder, isImageResponse } from './utils'

export async function assetProxy(request: Request): Promise<Response | null> {
  const url = Url.fromRequest(request)

  if (url.subdomain !== 'asset-proxy') return null
  if (url.pathname !== '/image') return null

  const urlParam = url.searchParams.get('url')

  if (!urlParam) return getPlaceholder()

  let assetUrl: Url

  try {
    assetUrl = new Url(urlParam)
  } catch {
    return getPlaceholder()
  }

  const originalResponse = await fetch(
    new Request(assetUrl.toString(), request),
    {
      cf: { cacheTtl: 24 * 60 * 60 * 30 },
    },
  )

  if (
    originalResponse.ok &&
    (isImageResponse(originalResponse) || isFromPixabayCdn(originalResponse))
  ) {
    const response = new Response(originalResponse.body, originalResponse)
    response.headers.delete('set-cookie')
    response.headers.set('cache-control', 'public, max-age=31536000, immutable')
    return response
  }

  return getPlaceholder()
}

function isFromPixabayCdn(response: Response) {
  const url = new Url(response.url)
  const contentType = response.headers.get('content-type')

  return (
    response.status === 200 &&
    `${url.subdomain}.${url.domain}` === 'cdn.pixabay.com' &&
    contentType === 'binary/octet-stream'
  )
}
