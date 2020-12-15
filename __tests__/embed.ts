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
  test('returns placeholder png for empty requests', async () => {
    const response = await requestThumbnail('')

    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('content-length')).toBe('135')
  })

  test('returns placeholder png for unsupported urls', async () => {
    const response = await requestThumbnail(
      'https://www.twitch.tv/videos/824398155'
    )

    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('content-length')).toBe('135')
  })

  test('returns thumbnail from youtube when url is youtube url', async () => {
    mockHttpGet(
      'https://i.ytimg.com/vi/KtV2wlp9Ts4/hqdefault.jpg',
      (_req, res, ctx) => {
        return res(
          ctx.set('content-type', 'image/jpeg'),
          ctx.set('content-length', '11464')
        )
      }
    )

    const response = await requestThumbnail(
      'https://www.youtube.com/watch?v=KtV2wlp9Ts4'
    )

    expect(response.headers.get('content-type')).toBe('image/jpeg')
    expect(response.headers.get('content-length')).toBe('11464')
  })

  test('returns thumbnail from youtube when url is not youtube url', async () => {
    mockHttpGet(
      `https://i.ytimg.com/vi/Wtvyw4NjJWc/sddefault.jpg`,
      (_req, res, ctx) => {
        return res(
          ctx.set('content-type', 'image/jpeg'),
          ctx.set('content-length', '11464')
        )
      }
    )

    const response = await requestThumbnail(
      'https://www.youtube.com/watch?v=Wtvyw4NjJWc'
    )

    expect(response.headers.get('content-type')).toBe('image/jpeg')
    expect(response.headers.get('content-length')).toBe('11464')
  })
  test('returns thumbnail from vimeo when url not vimeo url', async () => {
    mockHttpGet(
      'https://vimeo.com/api/oembed.json?url=',
      (_req, res, ctx) => {
        return res(
          ctx.json(''),
          ctx.set('content-length', '11464')
        )
      }
    )
  
    //how to determine the content length?

    const response = await requestThumbnail(
      'https://vimeo.com/api/oembed.json?url='
    )

    expect(response.headers.get('content-type')).toBe('image/jpeg')
    expect(response.headers.get('content-length')).toBe('11464')
  })



function requestThumbnail(url: string): Promise<Response> {
  const requestUrl =
    'https://embed.serlo.org/thumbnail?url=' + encodeURIComponent(url)

  return handleRequest(new Request(requestUrl))
}
