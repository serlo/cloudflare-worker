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
import { handleRequest } from '../src'
import { mockHttpGetNoCheck } from './__utils__'

describe('embed.serlo.org/thumbnail?url=...', () => {
  describe('Youtube', () => {
    const videoHQ = {
      videoId: 'Wtvyw4NjJWc',
      contentLength: '17270',
    }
    const videoSD = {
      videoId: 'KtV2wlp9Ts4',
      contentLength: '11464',
    }
    beforeEach(() => {
      mockHttpGetNoCheck(
        'https://i.ytimg.com/vi/:videoId/:format',
        (req, res, ctx) => {
          const { videoId, format } = req.params as {
            videoId: string
            format: string
          }
          let contentLength: string | null = null

          if (videoId === videoHQ.videoId && format === 'sddefault.jpg')
            contentLength = videoHQ.contentLength
          if (videoId === videoSD.videoId) {
            if (format === 'sddefault.jpg') return res(ctx.status(404))
            if (format === 'hqdefault.jpg')
              contentLength = videoSD.contentLength
          }

          if (contentLength) {
            return res(
              ctx.set('content-type', 'image/jpeg'),
              ctx.set('content-length', contentLength)
            )
          } else {
            return res(ctx.status(404))
          }
        }
      )
    })

    test('returns sddefault.jpg thumbnail when it exists', async () => {
      const response = await requestThumbnail(
        `https://www.youtube-nocookie.com/embed/${videoHQ.videoId}?autoplay=1&html5=1`
      )

      expect(response.headers.get('content-length')).toBe(videoHQ.contentLength)
      expect(response.headers.get('content-type')).toBe('image/jpeg')
    })

    test('returns hqdefault.jpg thumbnail when sddefault.jpg does not exist', async () => {
      const response = await requestThumbnail(
        `https://www.youtube-nocookie.com/embed/${videoSD.videoId}?autoplay=1&html5=1`
      )

      expect(response.headers.get('content-length')).toBe(videoSD.contentLength)
      expect(response.headers.get('content-type')).toBe('image/jpeg')
    })
  })

  describe('returns placeholder', () => {
    test('when url parameter is empty', async () => {
      const response = await requestThumbnail('')
      expect(checkPlaceholderResponse(response))
    })

    test('when url is invalid', async () => {
      const response = await requestThumbnail('42')
      expect(checkPlaceholderResponse(response))
    })

    // test('when youtube.link does not have a V-param', async () => {
    //   const response = await requestThumbnail('https://www.youtube.com/watch?')
    //   expect(checkPlaceholderResponse(response))
    // })

    test('when url is unsupported', async () => {
      const response = await requestThumbnail(
        'https://www.twitch.tv/videos/824398155'
      )
      expect(checkPlaceholderResponse(response))
    })

    test('when path is not thumbnail', async () => {
      const requestUrl = 'https://embed.serlo.org/foo'
      const response = await handleRequest(new Request(requestUrl))
      expect(checkPlaceholderResponse(response))
    })

    function checkPlaceholderResponse(response: Response) {
      expect(response.headers.get('content-type')).toBe('image/png')
      expect(response.headers.get('content-length')).toBe('135')
    }
  })
})

function requestThumbnail(url: string): Promise<Response> {
  const requestUrl =
    'https://embed.serlo.org/thumbnail?url=' + encodeURIComponent(url)

  return handleRequest(new Request(requestUrl))
}
