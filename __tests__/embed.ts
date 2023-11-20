import { HttpResponse, ResponseResolver, http } from 'msw'

import {
  hasInternalServerError,
  returnsMalformedJson,
  returnsJson,
  mockHttpGet,
  returnsText,
  currentTestEnvironment,
  localTestEnvironment,
  expectSentryEvent,
  expectNoSentryError,
} from './__utils__'
import { createJsonResponse } from '../src/utils'

describe('embed.serlo.org/thumbnail?url=...', () => {
  beforeEach(() => {
    mockHttpGet('https://malware.com/*', returnsText('bad'))
    mockHttpGet('http://malware.com/*', returnsText('bad'))
  })

  describe('Youtube', () => {
    const videos = {
      highQuality: {
        id: 'Wtvyw4NjJWc',
        contentLength: 17270,
        format: 'sddefault.jpg',
      },
      lowQuality: {
        id: 'KtV2wlp9Ts4',
        contentLength: 11464,
        format: 'hqdefault.jpg',
      },
    }

    beforeEach(() => {
      givenYoutube(defaultYoutubeServer())
    })

    afterEach(() => {
      expectNoSentryError()
    })

    test('returns sddefault.jpg thumbnail when it exists', async () => {
      const response = await requestThumbnail(
        `https://www.youtube-nocookie.com/embed/${videos.highQuality.id}?autoplay=1&html5=1`,
      )

      expectImageResponseWithError({
        response,
        expectedContentLength: videos.highQuality.contentLength,
        expectedImageType: 'image/jpeg',
      })
    })

    test('returns hqdefault.jpg thumbnail when sddefault.jpg does not exist', async () => {
      const response = await requestThumbnail(
        `https://www.youtube-nocookie.com/embed/${videos.lowQuality.id}?autoplay=1&html5=1`,
      )

      expectImageResponseWithError({
        response,
        expectedContentLength: videos.lowQuality.contentLength,
        expectedImageType: 'image/jpeg',
      })
    })

    describe('returns placeholder', () => {
      test('when no image is available', async () => {
        const response = await requestThumbnail(
          `https://www.youtube-nocookie.com/embed/AaaAaaAaaAa?autoplay=1&html5=1`,
        )

        expectIsPlaceholderResponse(response)
      })

      test('when video id is malformed', async () => {
        const response = await requestThumbnail(
          `https://www.youtube-nocookie.com/embed/foo:pass@malware.com`,
        )

        expectIsPlaceholderResponse(response)
      })

      test('when youtube does not return an image', async () => {
        givenYoutube(returnsText('Hello'))

        const response = await requestThumbnail(
          `https://www.youtube-nocookie.com/embed/${videos.highQuality.id}?autoplay=1&html5=1`,
          localTestEnvironment(),
        )

        expectIsPlaceholderResponse(response)
      })
    })

    function givenYoutube(resolver: YoutubeServer) {
      globalThis.server.use(
        http.get('https://i.ytimg.com/vi/:videoId/:format', resolver),
      )
    }

    function defaultYoutubeServer(): YoutubeServer {
      return ({ params }) => {
        const { videoId, format } = params

        for (const spec of Object.values(videos)) {
          if (videoId === spec.id && format === spec.format) {
            return imageResponse('image/jpeg', spec.contentLength)
          }
        }

        return new HttpResponse(null, { status: 404 })
      }
    }

    type YoutubeServer = ResponseResolver<{
      params: Record<string, string>
    }>
  })

  describe('Vimeo', () => {
    const video = {
      id: '117611037',
      contentLength: 60215,
      thumbnailUrl: 'https://i.vimeocdn.com/video/505834070.jpg',
    }
    beforeEach(() => {
      givenVimeoApi(defaultVimeoApi())
      givenVimeoCdn(defaultVimeoCdn())
    })

    test('returns thumbnail of vimeo video', async () => {
      const response = await requestThumbnail(
        `https://player.vimeo.com/video/${video.id}?autoplay=1`,
      )

      expectImageResponseWithError({
        response,
        expectedImageType: 'image/jpeg',
        expectedContentLength: video.contentLength,
      })
      expectNoSentryError()
    })

    describe('returns placeholder', () => {
      const thumbnailUrl = `https://player.vimeo.com/video/${video.id}?autoplay=1`

      test('when video does not exist', async () => {
        const response = await requestThumbnail(
          `https://player.vimeo.com/video/999999999?autoplay=1`,
        )

        expectIsPlaceholderResponse(response)
        expectNoSentryError()
      })

      test('when video id is malformed', async () => {
        const response = await requestThumbnail(
          `https://player.vimeo.com/video/foo:password@malware.com`,
        )

        expectIsPlaceholderResponse(response)
        expectNoSentryError()
      })

      test('when request to vimeo api fails', async () => {
        givenVimeoApi(hasInternalServerError())

        const response = await requestThumbnail(
          `https://player.vimeo.com/video/${video.id}?autoplay=1`,
          localTestEnvironment(),
        )

        expectIsPlaceholderResponse(response)
        expectSentryEvent({
          message: 'Request to Vimeo API was not successful',
          level: 'warning',
          service: 'embed',
          tags: { imageRepository: 'vimeo' },
          context: {
            thumbnailUrl,
            apiResponse: expect.objectContaining({ status: 500 }),
          },
        })
      })

      test('when vimeo api returns malformed json', async () => {
        givenVimeoApi(returnsMalformedJson())

        const response = await requestThumbnail(
          `https://player.vimeo.com/video/${video.id}?autoplay=1`,
          localTestEnvironment(),
        )

        expectIsPlaceholderResponse(response)
        expectSentryEvent({
          message: 'Vimeo API returns malformed JSON',
          level: 'warning',
          service: 'embed',
          tags: { imageRepository: 'vimeo' },
          context: {
            thumbnailUrl,
            apiResponse: expect.objectContaining({ text: 'malformed json' }),
          },
        })
      })

      describe('when vimeo api returns unsupported json', () => {
        test.each([
          42,
          { type: 'video' },
          { thumbnail_url: video.thumbnailUrl },
        ])('%p', async (returnedJson) => {
          givenVimeoApi(returnsJson(returnedJson))

          const response = await requestThumbnail(
            thumbnailUrl,
            localTestEnvironment(),
          )

          expectIsPlaceholderResponse(response)
          expectSentryEvent({
            message: 'Vimeo API returns unsupported JSON',
            level: 'warning',
            service: 'embed',
            tags: { imageRepository: 'vimeo' },
            context: {
              thumbnailUrl,
              apiResponse: expect.objectContaining({ json: returnedJson }),
            },
          })
        })
      })

      test('when vimeo api returns a malformed thumbnail_url', async () => {
        givenVimeoApi(returnsJson({ type: 'video', thumbnail_url: '42' }))

        const response = await requestThumbnail(
          `https://player.vimeo.com/video/${video.id}?autoplay=1`,
          localTestEnvironment(),
        )

        expectIsPlaceholderResponse(response)
        expectSentryEvent({
          message: 'Returned thumbnail url of Vimeo API is malformed',
          level: 'warning',
          service: 'embed',
          tags: { imageRepository: 'vimeo' },
          context: { thumbnailUrl, vimeoThumbnailUrl: '42' },
        })
      })

      test('when vimeo cdn doesn not return an image', async () => {
        givenVimeoCdn(returnsText('Hello'))

        const response = await requestThumbnail(
          `https://player.vimeo.com/video/${video.id}?autoplay=1`,
          localTestEnvironment(),
        )

        expectIsPlaceholderResponse(response)
        expectSentryEvent({
          message: 'Vimeo CDN did not return an image',
          level: 'warning',
          service: 'embed',
          tags: { imageRepository: 'vimeo' },
          context: { thumbnailUrl, vimeoThumbnailUrl: video.thumbnailUrl },
        })
      })

      test('when vimeo cdn does not responed with 200', async () => {
        givenVimeoCdn(hasInternalServerError())

        const response = await requestThumbnail(
          `https://player.vimeo.com/video/${video.id}?autoplay=1`,
          localTestEnvironment(),
        )

        expectIsPlaceholderResponse(response)
        expectSentryEvent({
          message: 'Vimeo CDN did not return an image',
          level: 'warning',
          service: 'embed',
          tags: { imageRepository: 'vimeo' },
          context: { thumbnailUrl, vimeoThumbnailUrl: video.thumbnailUrl },
        })
      })
    })

    function givenVimeoCdn(resolver: ResponseResolver) {
      globalThis.server.use(
        http.get('https://i.vimeocdn.com/video/:thumbnailFilename', resolver),
      )
    }

    function defaultVimeoCdn(): ResponseResolver {
      return ({ request }) => {
        if (request.url === video.thumbnailUrl) {
          return imageResponse('image/jpeg', video.contentLength)
        }

        return new HttpResponse(null, { status: 404 })
      }
    }

    function givenVimeoApi(resolver: ResponseResolver) {
      globalThis.server.use(
        http.get('https://vimeo.com/api/oembed.json', resolver),
      )
    }

    function defaultVimeoApi(): ResponseResolver {
      return ({ request }) => {
        const url = new URL(request.url)

        const videoId =
          url.searchParams?.get('url')?.replace('https://vimeo.com/', '') ?? ''

        if (videoId === video.id) {
          return createJsonResponse({
            type: 'video',
            thumbnail_url: video.thumbnailUrl,
          })
        }

        return new HttpResponse(null, { status: 404 })
      }
    }
  })

  describe('Wikimedia', () => {
    const video = {
      embedUrl:
        'https://upload.wikimedia.org/wikipedia/commons/1/15/Inerter_vibration_isolation_experiment.webm',
      contentLength: 54373,
      thumbnailUrl:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Inerter_vibration_isolation_experiment.webm/800px--Inerter_vibration_isolation_experiment.webm.jpg',
    }

    beforeEach(() => {
      givenWikimedia(defaultWikimediaServer())
    })

    test('returns thumbnail', async () => {
      // TODO: After fixing https://github.com/serlo/cloudflare-worker/issues/241
      // set `env` to `currentTestEnvironment()`
      const response = await requestThumbnail(
        video.embedUrl,
        localTestEnvironment(),
      )

      expectImageResponseWithError({
        response,
        expectedImageType: 'image/jpeg',
        expectedContentLength: video.contentLength,
      })
      expectNoSentryError()
    })

    test('returns placeholder when video/thumbnail does not exist', async () => {
      const response = await requestThumbnail(
        'https://upload.wikimedia.org/wikipedia/commons/2/55/must_see.webm',
      )

      expectIsPlaceholderResponse(response)
      expectNoSentryError()
    })

    test('returns placeholder when wikimedia does not return an image', async () => {
      givenWikimedia(returnsText('Hello'))

      const response = await requestThumbnail(
        video.embedUrl,
        localTestEnvironment(),
      )

      expectIsPlaceholderResponse(response)
    })

    function givenWikimedia(resolver: ResponseResolver) {
      globalThis.server.use(
        http.get(
          'https://upload.wikimedia.org/wikipedia/commons/thumb/*',
          resolver,
        ),
      )
    }

    function defaultWikimediaServer(): ResponseResolver {
      return ({ request }) => {
        return request.url === video.thumbnailUrl
          ? imageResponse('image/jpeg', video.contentLength)
          : new HttpResponse(null, { status: 404 })
      }
    }
  })

  describe('Geogebra', () => {
    const applet = {
      id: '100',
      contentLength: 10336,
      thumbnailUrl:
        'https://cdn.geogebra.org/resource/q9gNCVsS/lIoGcSJdoALG1cTd/material-q9gNCVsS.png',
    }
    beforeEach(() => {
      givenGeogebraApi(defaultGeogebraApi())
      givenGeogebraFile(defaultGeogebraFile())
    })

    test('returns thumbnail of geogebra applet', async () => {
      const response = await requestThumbnail(
        `https://www.geogebra.org/material/iframe/id/${applet.id}`,
      )

      expectImageResponseWithError({
        response,
        expectedContentLength: applet.contentLength,
        expectedImageType: 'image/png',
      })
      expectNoSentryError()
    })

    describe('returns placeholder', () => {
      const thumbnailUrl = `https://www.geogebra.org/material/iframe/id/${applet.id}`

      test('when geogebra id contains non digit characters', async () => {
        const response = await requestThumbnail(
          `https://www.geogebra.org/material/iframe/id/abc%@`,
        )

        expectIsPlaceholderResponse(response)
        expectNoSentryError()
      })

      test('when geogebra file does not exist', async () => {
        const response = await requestThumbnail(
          `https://www.geogebra.org/material/iframe/id/001`,
        )

        expectIsPlaceholderResponse(response)
        expectNoSentryError()
      })

      test('when geogebra api returns with a non 200 respond', async () => {
        givenGeogebraApi(hasInternalServerError())

        const response = await requestThumbnail(
          thumbnailUrl,
          localTestEnvironment(),
        )

        expectIsPlaceholderResponse(response)
        expectSentryEvent({
          message: 'Request to Geogebra API was not successful',
          level: 'warning',
          service: 'embed',
          tags: { imageRepository: 'geogebra' },
          context: {
            thumbnailUrl,
            apiResponse: expect.objectContaining({ status: 500 }),
          },
        })
      })

      test('when geogebra api returns malformed json', async () => {
        givenGeogebraApi(returnsMalformedJson())

        const response = await requestThumbnail(
          `https://www.geogebra.org/material/iframe/id/${applet.id}`,
          localTestEnvironment(),
        )

        expectIsPlaceholderResponse(response)
        expectSentryEvent({
          message: 'Geogebra API returned malformed JSON',
          level: 'warning',
          service: 'embed',
          tags: { imageRepository: 'geogebra' },
          context: {
            thumbnailUrl,
            apiResponse: expect.objectContaining({ text: 'malformed json' }),
          },
        })
      })

      test('when geogebra api returns unknwon json response', async () => {
        givenGeogebraApi(returnsJson({ type: 'video' }))

        const response = await requestThumbnail(
          thumbnailUrl,
          localTestEnvironment(),
        )

        expectIsPlaceholderResponse(response)
        expectSentryEvent({
          message: 'Geogebra API returned unsupported JSON',
          level: 'warning',
          service: 'embed',
          tags: { imageRepository: 'geogebra' },
          context: {
            thumbnailUrl,
            apiResponse: expect.objectContaining({ json: { type: 'video' } }),
          },
        })
      })

      test('when geogebra api returns malformed preview url', async () => {
        givenGeogebraApi(returnsPreviewUrl('bad'))

        const response = await requestThumbnail(
          thumbnailUrl,
          localTestEnvironment(),
        )

        expectIsPlaceholderResponse(response)
        expectSentryEvent({
          message: 'Geogebra API returned malformed preview url',
          level: 'warning',
          service: 'embed',
          tags: { imageRepository: 'geogebra' },
          context: { thumbnailUrl, geogebraPreviewUrl: 'bad' },
        })
      })

      test('when geogebra cdn does not respond with an image', async () => {
        givenGeogebraFile(returnsText('Some text'))

        const response = await requestThumbnail(
          `https://www.geogebra.org/material/iframe/id/${applet.id}`,
          localTestEnvironment(),
        )

        expectIsPlaceholderResponse(response)
        expectSentryEvent({
          message: 'Geogebra CDN does not respond with an image',
          level: 'warning',
          service: 'embed',
          tags: { imageRepository: 'geogebra' },
          context: { thumbnailUrl, geogebraPreviewUrl: applet.thumbnailUrl },
        })
      })

      test('when geogebra file does not exists', async () => {
        givenGeogebraFile(hasInternalServerError())

        const response = await requestThumbnail(
          `https://www.geogebra.org/material/iframe/id/${applet.id}`,
          localTestEnvironment(),
        )

        expectIsPlaceholderResponse(response)
        expectSentryEvent({
          message: 'Geogebra CDN does not respond with an image',
          level: 'warning',
          service: 'embed',
          tags: { imageRepository: 'geogebra' },
          context: { thumbnailUrl, geogebraPreviewUrl: applet.thumbnailUrl },
        })
      })
    })

    function givenGeogebraApi(resolver: ResponseResolver) {
      globalThis.server.use(
        http.post('https://www.geogebra.org/api/json.php', resolver),
      )
    }

    function defaultGeogebraApi(): ResponseResolver {
      return async ({ request }) => {
        const body = (await request.json()) as GeogebraApiBody
        const appletId = body.request.task.filters.field[0]['#text']

        return createJsonResponse(
          createPreviewUrlJSON(
            appletId === applet.id ? applet.thumbnailUrl : undefined,
          ),
        )
      }
    }

    interface GeogebraApiBody {
      request: { task: { filters: { field: Array<{ '#text': string }> } } }
    }

    function returnsPreviewUrl(previewUrl?: string) {
      return returnsJson(createPreviewUrlJSON(previewUrl))
    }

    function createPreviewUrlJSON(previewUrl?: string) {
      return {
        responses: {
          response: {
            '-type': 'listing',
            ...(previewUrl ? { item: { previewUrl } } : {}),
          },
        },
      }
    }

    function givenGeogebraFile(resolver: ResponseResolver) {
      globalThis.server.use(http.get(applet.thumbnailUrl, resolver))
    }

    function defaultGeogebraFile(): ResponseResolver {
      return () => imageResponse('image/png', applet.contentLength)
    }
  })

  describe('returns placeholder', () => {
    afterEach(() => {
      expectNoSentryError()
    })

    test('when url parameter is empty', async () => {
      const response = await requestThumbnail('')

      expectIsPlaceholderResponse(response)
    })

    test('when url is invalid', async () => {
      const response = await requestThumbnail('42')

      expectIsPlaceholderResponse(response)
    })

    test('when url is unsupported', async () => {
      const response = await requestThumbnail(
        'https://www.twitch.tv/videos/824398155',
      )

      expectIsPlaceholderResponse(response)
    })

    test('when path is not thumbnail', async () => {
      const response = await currentTestEnvironment().fetch({
        subdomain: 'embed',
        pathname: '/foo',
      })

      expectIsPlaceholderResponse(response)
    })

    test('when url parameter is missing', async () => {
      const response = await currentTestEnvironment().fetch({
        subdomain: 'embed',
        pathname: '/thumbnail',
      })

      expectIsPlaceholderResponse(response)
    })
  })
})

function expectIsPlaceholderResponse(response: Response) {
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('image/png')
  expect(response.headers.get('content-length')).toBe('135')
}

async function requestThumbnail(
  url: string,
  env = currentTestEnvironment(),
): Promise<Response> {
  return await env.fetch({
    subdomain: 'embed',
    pathname: '/thumbnail?url=' + encodeURIComponent(url),
  })
}

function expectImageResponseWithError({
  expectedContentLength,
  expectedImageType,
  response,
  maxRelativeError = 0.1,
}: {
  expectedImageType: string
  expectedContentLength: number
  response: Response
  maxRelativeError?: number
}) {
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe(expectedImageType)
  const contentLength = parseInt(response.headers.get('content-length') ?? '')

  expect(
    Math.abs(contentLength - expectedContentLength) / expectedContentLength,
  ).toBeLessThanOrEqual(maxRelativeError)
}

function imageResponse(
  contentType: 'image/jpeg' | 'image/png',
  contentLength: number,
) {
  const response = new Response()

  response.headers.set('content-type', contentType)
  response.headers.set('content-length', contentLength.toString())

  return response
}
