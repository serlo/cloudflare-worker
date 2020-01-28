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
import { DateTime } from 'luxon'

import { render } from './render'

export async function maintenanceMode(request: Request) {
  const match = request.url.match(
    /^https:\/\/((community|stats|www|de|en|es|fr|hi|ta)\.)?serlo\.org/
  )
  if (!match) return null
  const subdomain = match[1]
  const lang =
    subdomain === undefined || subdomain === 'de.' || subdomain === 'www.'
      ? 'de'
      : 'en'
  const startISO = await MAINTENANCE_KV.get('start')
  if (!startISO) return null
  const now = DateTime.local()
  const start = DateTime.fromISO(startISO)
  if (now < start) return null
  const endISO = await MAINTENANCE_KV.get('end')
  if (endISO) {
    const end = DateTime.fromISO(endISO)
    if (now > end) return null
    return createMaintenanceResponse({ lang, end })
  }
  return createMaintenanceResponse({ lang })
}

function createMaintenanceResponse({
  lang,
  end
}: {
  lang: 'de' | 'en'
  end?: DateTime
}) {
  return new Response(render({ lang, end }), {
    status: 503,
    headers: getHeaders()
  })

  function getHeaders(): HeadersInit {
    return {
      'Content-Type': 'text/html;charset=utf-8',
      ...(end ? { 'Retry-After': end.toHTTP() } : {})
    }
  }
}
