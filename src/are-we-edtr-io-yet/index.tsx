/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2021-2022 Serlo Education e.V.
 *
 * Licensed under the Apache License, Version 2.0 (the "License")
 * you may not use this file except in compliance with the License
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * @copyright Copyright (c) 2022 Serlo Education e.V.
 * @license   https://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link      https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import { h } from 'preact'

import { createPreactResponse, getBasicAuthHeaders, Url } from '../utils'
import { AreWeEdtrIoYet } from './template'

export async function edtrIoStats(request: Request) {
  const url = Url.fromRequest(request)

  if (url.subdomain !== 'are-we-edtr-io-yet') return null

  url.subdomain = 'de'
  url.pathname = '/entities/are-we-edtr-io-yet'

  const data = await fetch(url.href, {
    cf: { cacheTtl: 60 * 60 },
    headers: getBasicAuthHeaders(),
  })

  return createPreactResponse(<AreWeEdtrIoYet data={await data.json()} />)
}
