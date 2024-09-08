import * as t from 'io-ts'

import { SentryFactory, SentryReporter, responseToContext, Url } from './utils'

export async function embed(
  request: Request,
  sentryFactory: SentryFactory,
): Promise<Response | null> {
  // example url: embed.serlo.org/thumbnail?url=...
  const url = Url.fromRequest(request)

  if (url.subdomain !== 'embed') return null

  const sentry = sentryFactory.createReporter('embed')
  const urlParam = url.searchParams.get('url')

  sentry.setContext('thumbnailUrl', urlParam)

  if (!urlParam) return getPlaceholder()

  try {
    const videoUrl = new Url(urlParam)

    switch (videoUrl.domain) {
      case 'youtube-nocookie.com':
        return await getYoutubeThumbnail(videoUrl)
      case 'vimeo.com':
        return await getVimeoThumbnail(videoUrl, sentry)
      case 'geogebra.org':
        return await getGeogebraThumbnail(videoUrl, sentry)
      case 'wikimedia.org':
        return await getWikimediaThumbnail(videoUrl)
    }
  } catch {
    //Invalid URL
  }

  return getPlaceholder()
}

async function getYoutubeThumbnail(url: URL) {
  // example url: https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&html5

  const videoId = url.pathname.replace('/embed/', '')

  if (!/[a-zA-Z0-9_-]{11}/.test(videoId)) {
    return getPlaceholder()
  }

  const baseUrl = `https://i.ytimg.com/vi/${videoId}`

  const bigImgRes = await fetch(`${baseUrl}/sddefault.jpg`)
  if (isImageResponse(bigImgRes)) return bigImgRes

  const fallbackImgRes = await fetch(`${baseUrl}/hqdefault.jpg`)
  if (isImageResponse(fallbackImgRes)) return fallbackImgRes

  return getPlaceholder()
}

const VimeoApiResponse = t.type({
  type: t.literal('video'),
  thumbnail_url: t.string,
})

async function getVimeoThumbnail(url: URL, sentry: SentryReporter) {
  sentry.setTag('imageRepository', 'vimeo')

  const videoId = url.pathname.replace('/video/', '')

  if (!/[0-9]+/.test(videoId)) return getPlaceholder()

  const apiResponse = await fetch(
    'https://vimeo.com/api/oembed.json?url=' +
      encodeURIComponent(`https://vimeo.com/${videoId}`),
  )
  const apiResponseText = await apiResponse.text()

  if (apiResponse.status !== 200) {
    if (apiResponse.status !== 404) {
      sentry.setContext(
        'apiResponse',
        responseToContext({ response: apiResponse, text: apiResponseText }),
      )
      sentry.captureMessage(
        'Request to Vimeo API was not successful',
        'warning',
      )
    }
    return getPlaceholder()
  }

  let apiResponseJson: unknown = undefined

  try {
    apiResponseJson = JSON.parse(apiResponseText) as unknown
  } catch {
    sentry.setContext(
      'apiResponse',
      responseToContext({ response: apiResponse, text: apiResponseText }),
    )
    sentry.captureMessage('Vimeo API returns malformed JSON', 'warning')
    return getPlaceholder()
  }

  if (!VimeoApiResponse.is(apiResponseJson)) {
    sentry.setContext(
      'apiResponse',
      responseToContext({ response: apiResponse, json: apiResponseJson }),
    )
    sentry.captureMessage('Vimeo API returns unsupported JSON', 'warning')
    return getPlaceholder()
  }

  let imgUrl: Url
  const vimeoThumbnailUrl = apiResponseJson.thumbnail_url.replace(
    /_[0-9|x]+/,
    '',
  )
  sentry.setContext('vimeoThumbnailUrl', vimeoThumbnailUrl)

  try {
    imgUrl = new Url(vimeoThumbnailUrl)
  } catch {
    sentry.setContext(
      'apiResponse',
      responseToContext({ response: apiResponse, json: apiResponseJson }),
    )
    sentry.captureMessage(
      'Returned thumbnail url of Vimeo API is malformed',
      'warning',
    )
    return getPlaceholder()
  }

  const imageResponse = await fetch(imgUrl.href)

  if (!isImageResponse(imageResponse)) {
    sentry.setContext(
      'vimdeoCdnResponse',
      responseToContext({ response: imageResponse }),
    )
    sentry.captureMessage('Vimeo CDN did not return an image', 'warning')
    return getPlaceholder()
  }

  return imageResponse
}

const GeogebraApiResponse = t.type({
  responses: t.type({
    response: t.intersection([
      t.type({ '-type': t.literal('listing') }),
      t.partial({ item: t.type({ previewUrl: t.string }) }),
    ]),
  }),
})

async function getGeogebraThumbnail(url: URL, sentry: SentryReporter) {
  sentry.setTag('imageRepository', 'geogebra')

  //example url https://www.geogebra.org/material/iframe/id/100
  const appletId = url.pathname.replace('/material/iframe/id/', '')

  if (!/[0-9]+/.test(appletId)) return getPlaceholder()

  const apiResponse = await fetch('https://www.geogebra.org/api/json.php', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      request: {
        '-api': '1.0.0',
        task: {
          '-type': 'fetch',
          fields: { field: [{ '-name': 'preview_url' }] },
          filters: { field: [{ '-name': 'id', '#text': appletId }] },
          limit: { '-num': '1' },
        },
      },
    }),
    cf: { cacheTtl: 7 * 24 * 60 * 60, cacheEverything: true },
  })
  const apiResponseText = await apiResponse.text()

  if (apiResponse.status !== 200) {
    sentry.setContext(
      'apiResponse',
      responseToContext({ response: apiResponse, text: apiResponseText }),
    )
    sentry.captureMessage(
      'Request to Geogebra API was not successful',
      'warning',
    )
    return getPlaceholder()
  }

  let apiResponseJson: unknown

  try {
    apiResponseJson = JSON.parse(apiResponseText)
  } catch {
    sentry.setContext(
      'apiResponse',
      responseToContext({ response: apiResponse, text: apiResponseText }),
    )
    sentry.captureMessage('Geogebra API returned malformed JSON', 'warning')
    return getPlaceholder()
  }

  if (!GeogebraApiResponse.is(apiResponseJson)) {
    sentry.setContext(
      'apiResponse',
      responseToContext({ response: apiResponse, json: apiResponseJson }),
    )
    sentry.captureMessage('Geogebra API returned unsupported JSON', 'warning')
    return getPlaceholder()
  }

  const { item } = apiResponseJson.responses.response
  if (item === undefined) {
    // Geogebra material does not exist
    return getPlaceholder()
  }

  let previewUrl: Url
  sentry.setContext('geogebraPreviewUrl', item.previewUrl)

  try {
    previewUrl = new Url(item.previewUrl)
  } catch {
    sentry.setContext(
      'apiResponse',
      responseToContext({ response: apiResponse, json: apiResponseJson }),
    )
    sentry.captureMessage(
      'Geogebra API returned malformed preview url',
      'warning',
    )
    return getPlaceholder()
  }

  const imageResponse = await fetch(previewUrl.href)
  if (!isImageResponse(imageResponse)) {
    sentry.setContext(
      'geogebraImageResponse',
      responseToContext({ response: imageResponse }),
    )
    sentry.captureMessage(
      'Geogebra CDN does not respond with an image',
      'warning',
    )
    return getPlaceholder()
  }

  return imageResponse
}

async function getWikimediaThumbnail(url: URL) {
  const filenameWithPath = url.pathname.replace('/wikipedia/commons/', '') // e.g. '1/15/filename.webm'
  const filename = filenameWithPath.substring(
    filenameWithPath.lastIndexOf('/') + 1,
  )
  const previewImageUrl = `https://upload.wikimedia.org/wikipedia/commons/thumb/${filenameWithPath}/800px--${filename}.jpg`

  // note: this adds manual caching settings,
  // since wikimedia does not return a max - age setting that cf can adopt
  const imgRes = await fetch(previewImageUrl, {
    cf: { cacheTtl: 7 * 24 * 60 * 60, cacheEverything: true },
  })
  if (isImageResponse(imgRes)) return imgRes

  return getPlaceholder()
}

function getPlaceholder() {
  const placeholderBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAwAAAAGwAQMAAAAkGpCRAAAAA1BMVEXv9/t0VvapAAAAP0lEQVR42u3BMQEAAADCIPuntsUuYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQOqOwAAHrgHqAAAAAAElFTkSuQmCC'
  const placeholder = Uint8Array.from(atob(placeholderBase64), (c) =>
    c.charCodeAt(0),
  )
  return new Response(placeholder, {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': placeholder.length.toString(),
    },
  })
}

function isImageResponse(res: Response): boolean {
  const contentType = res.headers.get('content-type') ?? ''
  return res.status === 200 && contentType.startsWith('image/')
}
