/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2013-2020 Serlo Education e.V.
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
 * @copyright Copyright (c) 2013-2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link     https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import { AreWeEdtrIoYet } from './template'
import { PreactResponse } from '../utils'
import { getSubdomain } from '../url-utils'

export async function edtrIoStats(request: Request) {
  if (getSubdomain(request.url) !== 'are-we-edtr-io-yet') return null

  const url = new URL(request.url)
  url.host = url.host.replace('are-we-edtr-io-yet.', 'de.')
  url.pathname = '/entities/are-we-edtr-io-yet'
  const data = await fetch(url.href, ({
    cf: { cacheTtl: 60 * 60 }
  } as unknown) as RequestInit)

  return new PreactResponse(AreWeEdtrIoYet(await data.json()), {
    headers: {
      'Content-Type': 'text/html;charset=utf-8'
    }
  })
}
