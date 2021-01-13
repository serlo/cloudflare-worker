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
import { rest } from 'msw'

import {
  fetchTestEnvironment,
  mockHttpGetNoCheck,
  TestEnvironment,
} from './__utils__'

describe('embed.serlo.org/thumbnail?url=...', () => {
  describe('Youtube', () => {
    const videoHighQuality = {
      id: 'Wtvyw4NjJWc',
      contentLength: '20000',
    }
    const videoLowQuality = {
      id: 'KtV2wlp9Ts4',
      contentLength: '10000',
    }
    beforeEach(() => {
      mockHttpGetNoCheck(
        'https://i.ytimg.com/vi/:videoId/:format',
        (req, res, ctx) => {
          const { videoId, format } = req.params as {
            videoId: string
            format: string
          }
          const isHQ = videoId === videoHighQuality.id

          if (
            (isHQ && format === 'sddefault.jpg') ||
            (videoId === videoLowQuality.id && format === 'hqdefault.jpg')
          ) {
            return res(
              ctx.set('content-type', 'image/jpeg'),
              ctx.set(
                'content-length',
                isHQ
                  ? videoHighQuality.contentLength
                  : videoLowQuality.contentLength
              )
            )
          }
          return res(ctx.status(404))
        }
      )
    })

    test('returns sddefault.jpg thumbnail when it exists', async () => {
      const response = await requestThumbnail(
        `https://www.youtube-nocookie.com/embed/${videoHighQuality.id}?autoplay=1&html5=1`
      )
      expect(response.headers.get('content-length')).toBe(
        videoHighQuality.contentLength
      )
      expect(response.headers.get('content-type')).toBe('image/jpeg')
    })

    test('returns hqdefault.jpg thumbnail when sddefault.jpg does not exist', async () => {
      const response = await requestThumbnail(
        `https://www.youtube-nocookie.com/embed/${videoLowQuality.id}?autoplay=1&html5=1`
      )
      expect(response.headers.get('content-length')).toBe(
        videoLowQuality.contentLength
      )
      expect(response.headers.get('content-type')).toBe('image/jpeg')
    })

    test('returns placeholder when no image is available', async () => {
      const response = await requestThumbnail(
        `https://www.youtube-nocookie.com/embed/AaaAaaAaaAa?autoplay=1&html5=1`
      )
      expect(isPlaceholderResponse(response))
    })
  })

  describe('Vimeo', () => {
    const video = {
      id: '117611037',
      contentLength: '40000',
      thumbnailFilename: '505834070.webp',
      thumbnailUrl: 'https://i.vimeocdn.com/video/505834070_640.webp',
    }
    beforeEach(() => {
      //mock oembed endpoint
      mockHttpGetNoCheck(
        'https://vimeo.com/api/oembed.json?url=https%3A%2F%2Fvimeo.com%2F:videoId',
        (req, res, ctx) => {
          const videoId =
            req.url?.searchParams
              ?.get('url')
              ?.replace('https://vimeo.com/', '') || ''

          if (videoId === video.id) {
            return res(
              ctx.json({
                type: 'video',
                thumbnail_url: video.thumbnailUrl,
              })
            )
          }
          return res(ctx.status(403))
        }
      )
      mockHttpGetNoCheck(
        'https://i.vimeocdn.com/video/:thumbnailFilename',
        (req, res, ctx) => {
          const { thumbnailFilename } = req.params as {
            thumbnailFilename: string
          }
          if (thumbnailFilename === video.thumbnailFilename) {
            return res(
              ctx.set('content-type', 'image/webp'),
              ctx.set('content-length', video.contentLength)
            )
          }
          return res(ctx.status(404))
        }
      )
    })

    test('returns thumbnail as webp', async () => {
      const response = await requestThumbnail(
        `https://player.vimeo.com/video/${video.id}?autoplay=1`
      )
      expect(response.headers.get('content-length')).toBe(video.contentLength)
      expect(response.headers.get('content-type')).toBe('image/webp')
    })

    test('returns placeholder when video does not exist', async () => {
      const response = await requestThumbnail(
        `https://player.vimeo.com/video/999999999?autoplay=1`
      )
      expect(isPlaceholderResponse(response))
    })
  })

  describe('Wikimedia', () => {
    const video = {
      embedUrl:
        'https://upload.wikimedia.org/wikipedia/commons/1/15/Inerter_vibration_isolation_experiment.webm',
      contentLength: '74280',
      thumbnailUrl:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Inerter_vibration_isolation_experiment.webm/800px--Inerter_vibration_isolation_experiment.webm.jpg',
    }

    beforeEach(() => {
      mockHttpGetNoCheck(
        'https://upload.wikimedia.org/wikipedia/commons/thumb/*',
        (req, res, ctx) => {
          if (req.url.toString() === video.thumbnailUrl) {
            return res(
              ctx.set('content-type', 'image/jpeg'),
              ctx.set('content-length', video.contentLength)
            )
          }
          return res(ctx.status(404))
        }
      )
    })

    test('returns thumbnail', async () => {
      const response = await requestThumbnail(video.embedUrl)

      expect(response.headers.get('content-length')).toBe(video.contentLength)
      expect(response.headers.get('content-type')).toBe('image/jpeg')
    })

    test('returns placeholder when video/thumbnail does not exist', async () => {
      const response = await requestThumbnail(
        'https://upload.wikimedia.org/wikipedia/commons/2/55/must_see.webm'
      )
      expect(isPlaceholderResponse(response))
    })
  })

  describe('Geogebra', () => {
    const applet = {
      id: '100',
      contentLength: '10336',
      thumbnailUrl:
        'https://cdn.geogebra.org/resource/q9gNCVsS/lIoGcSJdoALG1cTd/material-q9gNCVsS.png',
    }
    beforeEach(() => {
      //mock geogebra api
      global.server.use(
        rest.post('https://www.geogebra.org/api/json.php', (req, res, ctx) => {
          if (typeof req.body === 'string') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            const appletId = JSON.parse(req.body).request?.task?.filters
              ?.field[0]['#text'] as string

            if (appletId == applet.id)
              return res(
                ctx.json({
                  responses: {
                    response: {
                      item: {
                        previewUrl: applet.thumbnailUrl,
                      },
                    },
                  },
                })
              )
          }

          return res(ctx.status(404))
        })
      )
      mockHttpGetNoCheck(
        'https://cdn.geogebra.org/resource/q9gNCVsS/lIoGcSJdoALG1cTd/material-q9gNCVsS.png',
        (_req, res, ctx) => {
          return res(
            ctx.set('content-type', 'image/png'),
            ctx.set('content-length', applet.contentLength)
          )
        }
      )
    })

    test('returns thumbnail', async () => {
      const response = await requestThumbnail(
        `https://www.geogebra.org/material/iframe/id/${applet.id}`
      )
      expect(response.headers.get('content-length')).toBe(applet.contentLength)
      expect(response.headers.get('content-type')).toBe('image/png')
    })

    test('returns placeholder with incorrect embed url', async () => {
      const response = await requestThumbnail(
        `https://www.geogebra.org/material/iframe/id/001`
      )
      expect(isPlaceholderResponse(response))
    })
  })

  describe('returns placeholder', () => {
    test('when url parameter is empty', async () => {
      const response = await requestThumbnail('')
      expect(isPlaceholderResponse(response))
    })

    test('when url is invalid', async () => {
      const response = await requestThumbnail('42')
      expect(isPlaceholderResponse(response))
    })

    test('when url is unsupported', async () => {
      const response = await requestThumbnail(
        'https://www.twitch.tv/videos/824398155'
      )
      expect(isPlaceholderResponse(response))
    })

    test('when path is not thumbnail', async () => {
      const response = await fetchTestEnvironment({
        subdomain: 'embed',
        pathname: '/foo',
      })
      expect(isPlaceholderResponse(response))
    })

    test('when url parameter is missing', async () => {
      const response = await fetchTestEnvironment({
        subdomain: 'embed',
        pathname: '/thumbnail',
      })
      expect(isPlaceholderResponse(response))
    })
  })
})

function isPlaceholderResponse(response: Response) {
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('image/png')
  expect(response.headers.get('content-length')).toBe('135')
}

async function requestThumbnail(
  url: string,
  environment?: TestEnvironment
): Promise<Response> {
  return await fetchTestEnvironment({
    subdomain: 'embed',
    pathname: '/thumbnail?url=' + encodeURIComponent(url),
    environment,
  })
}
