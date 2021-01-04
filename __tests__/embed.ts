/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2020 Serlo Education e.V.
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
 * @copyright Copyright (c) 2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo-org/serlo.org-cloudflare-worker for the canonical source repository
 */
import { handleRequest } from '../src'
import { mockHttpGet } from './__utils__'

describe('embed.serlo.org/thumbnail?url=...', () => {
  describe('Youtube', () => {
    beforeEach(() => {
      mockHttpGet(
        'https://i.ytimg.com/vi/:videoId/:format',
        (req, res, ctx) => {
          const { videoId, format } = req.params as {
            videoId: string
            format: string
          }

          let contentLength: number | null = null

          if (videoId === 'Wtvyw4NjJWc' && format === 'sddefault.jpg')
            contentLength = 17270
          if (videoId === 'KtV2wlp9Ts4') {
            if (format === 'sddefault.jpg') return res(ctx.status(404))
            if (format === 'hqdefault.jpg') contentLength = 11464
          }

          if (contentLength) {
            return res(
              ctx.set('content-type', 'image/jpeg'),
              ctx.set('content-length', contentLength.toString())
            )
          } else {
            return res(ctx.status(400, 'Bad Request'))
          }
        }
      )
    })

    test('returns sddefault.jpg thumbnail when it exists', async () => {
      const response = await requestThumbnail(
        'https://www.youtube.com/watch?v=Wtvyw4NjJWc'
      )

      expect(response.headers.get('content-type')).toBe('image/jpeg')
      expect(response.headers.get('content-length')).toBe('17270')
    })

    test('returns hqdefault.jpg thumbnail when sddefault.jpg does not exist', async () => {
      const response = await requestThumbnail(
        'https://www.youtube.com/watch?v=KtV2wlp9Ts4'
      )

      expect(response.headers.get('content-type')).toBe('image/jpeg')
      expect(response.headers.get('content-length')).toBe('11464')
    })
  })

  describe('returns placeholder', () => {
    test('when url parameter is not defined', async () => {
      // TODO Fix this test
      const response = await requestThumbnail('')

      expect(response.headers.get('content-type')).toBe('image/png')
      expect(response.headers.get('content-length')).toBe('135')
    })
    // TODO: Test, dass URL fehlerhaft ist
    // embed.serlo.org/thumbnail?url=42
    test('when url does not exist', async () => {
      // TODO Fix this test
      const response = await requestThumbnail('42')

      expect(response.headers.get('content-type')).toBe('image/png')
      expect(response.headers.get('content-length')).toBe('135')
    })

    // Youtube-Link ohne v-Parameter
    test('when youtube.link does not have a V-param', async () => {
      // TODO Fix this test
      const response = await requestThumbnail('https://www.youtube.com/watch?')

      expect(response.headers.get('content-type')).toBe('image/png')
      expect(response.headers.get('content-length')).toBe('135')
    })

    test('when unsupported url is unsupported', async () => {
      const response = await requestThumbnail(
        'https://www.twitch.tv/videos/824398155'
      )

      expect(response.headers.get('content-type')).toBe('image/png')
      expect(response.headers.get('content-length')).toBe('135')
    })

    function expectPlacholderResponse(response: Response) {
      // TODO
    }
  })

  // Test, dass path nicht thumbnail
  // embed.serlo.org/foo -> 404 exception
})

function requestThumbnail(url: string): Promise<Response> {
  const requestUrl =
    'https://embed.serlo.org/thumbnail?url=' + encodeURIComponent(url)

  return handleRequest(new Request(requestUrl))
}
