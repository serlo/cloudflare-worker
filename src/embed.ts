/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2021 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
import { Url } from './utils'

export async function embed(request: Request): Promise<Response | null> {
  const url = Url.fromRequest(request)

  // embed.serlo.org/thumbnail?url=...
  if (url.subdomain !== 'embed') return null

  const urlParam = url.searchParams.get('url')

  if (!urlParam) return getPlaceholder()

  try {
    const videoUrl = new Url(urlParam) || null
    switch (videoUrl.domain) {
      case 'youtube.com':
      case 'youtube-nocookie.com':
        return await getYoutubeThumbnail(videoUrl)
      case 'vimeo.com':
        return await getVimeoThumbnail(videoUrl)
      case 'wikimedia.org':
        return await getWikimediaThumbnail(videoUrl)
      case 'geogebra.org':
        return await getGeogebraThumbnail(videoUrl)
    }
  } catch (e) {
    //Invalid URL
    return getPlaceholder()
  }

  return getPlaceholder()
}

function getPlaceholder() {
  const placeholderB64 =
    'iVBORw0KGgoAAAANSUhEUgAAAwAAAAGwAQMAAAAkGpCRAAAAA1BMVEXv9/t0VvapAAAAP0lEQVR42u3BMQEAAADCIPuntsUuYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQOqOwAAHrgHqAAAAAAElFTkSuQmCC'
  const buffer = Buffer.from(placeholderB64, 'base64')
  return new Response(buffer, {
    status: 200,
    statusText: 'OK',
    headers: {
      'Content-Type': 'image/png',
      'Content-Length': Buffer.byteLength(buffer).toString(),
    },
  })
}

async function getYoutubeThumbnail(url: URL) {
  //example url https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&html5…

  const videoId = url.pathname.replace('/embed/', '')

  if (!videoId || !RegExp('[a-zA-Z0-9_-]{11}').test(videoId)) {
    getPlaceholder()
  }

  const baseUrl = `https://i.ytimg.com/vi/${videoId}`

  const bigImgRes = await fetch(`${baseUrl}/sddefault.jpg`)
  if (bigImgRes.status === 200) return bigImgRes

  const fallbackImgRes = await fetch(`${baseUrl}/hqdefault.jpg`)
  if (fallbackImgRes.status === 200) return fallbackImgRes

  return getPlaceholder()
}

async function getVimeoThumbnail(url: URL) {
  // exmaple url https://player.vimeo.com/video/${id}?autoplay=1

  const videoId = url.pathname.replace('/video/', '')

  if (!videoId || !RegExp('[0-9]+').test(videoId)) {
    return getPlaceholder()
  }
  const apiResponse = await fetch(
    'https://vimeo.com/api/oembed.json?url=' +
      encodeURIComponent(`https://vimeo.com/${videoId}`)
  )
  if (apiResponse.status !== 200) return getPlaceholder()

  const videoData = (await apiResponse.json()) as Record<string, unknown> & {
    thumbnail_url: string
  }
  const thumbnailUrl = videoData.thumbnail_url.replace(/_[0-9|x]+/, '')

  const imgRes = await fetch(thumbnailUrl)
  if (imgRes.status === 200) return imgRes

  return getPlaceholder()
}

async function getGeogebraThumbnail(url: URL) {
  //example url https://www.geogebra.org/material/iframe/id/100

  const appletId = url.pathname.replace('/material/iframe/id/', '')

  if (!appletId || !RegExp('[0-9]+').test(appletId)) return getPlaceholder()

  const apiResponse = await fetch('https://www.geogebra.org/api/json.php', {
    method: 'POST',
    body: JSON.stringify({
      request: {
        '-api': '1.0.0',
        task: {
          '-type': 'fetch',
          fields: {
            field: [
              { '-name': 'width' },
              { '-name': 'height' },
              { '-name': 'preview_url' },
            ],
          },
          filters: {
            field: [{ '-name': 'id', '#text': appletId }],
          },
          limit: { '-num': '1' },
        },
      },
    }),
  })

  const data = (await apiResponse.json()) as {
    responses: {
      response: {
        '-type': string
        item: Record<string, unknown> & {
          previewUrl: string
          width: string
          height: string
        }
      }
    }
  }

  const thumbnailUrl = data.responses.response.item.previewUrl

  const imgRes = await fetch(thumbnailUrl)
  if (imgRes.status === 200) return imgRes

  return getPlaceholder()
}

async function getWikimediaThumbnail(url: URL) {
  const filenameWithPath = url.pathname.replace('/wikipedia/commons/', '') // e.g. '1/15/filename.webm'
  const filename = filenameWithPath.substring(
    filenameWithPath.lastIndexOf('/') + 1
  )
  const previewImageUrl = `https://upload.wikimedia.org/wikipedia/commons/thumb/${filenameWithPath}/800px--${filename}.jpg`

  const imgRes = await fetch(previewImageUrl)
  if (imgRes.status === 200) return imgRes

  return getPlaceholder()
}
