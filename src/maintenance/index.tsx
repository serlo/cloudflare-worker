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
import { DateTime } from 'luxon'
import { h } from 'preact'

import { Maintenance } from './template'
import { createPreactResponse, Url } from '../utils'

export async function maintenanceMode(request: Request) {
  const url = Url.fromRequest(request)
  const enabled = await global.MAINTENANCE_KV.get('enabled')
  if (!enabled) return null
  const {
    start: startISO,
    end: endISO,
    subdomains = [],
  } = JSON.parse(enabled) as {
    start: string
    end: string
    subdomains?: string[]
  }
  if (!subdomains.includes(url.subdomain)) return null
  if (!startISO) return null
  const now = DateTime.local()
  const start = DateTime.fromISO(startISO)
  if (now < start) return null
  if (endISO) {
    const end = DateTime.fromISO(endISO)
    if (now > end) return null
    return createMaintenanceResponse({ lang: getLanguage(), end })
  }
  return createMaintenanceResponse({ lang: getLanguage() })

  function getLanguage() {
    return ['', 'de', 'www'].includes(url.subdomain) ? 'de' : 'en'
  }
}

function createMaintenanceResponse({
  lang,
  end,
}: {
  lang: 'de' | 'en'
  end?: DateTime
}) {
  return createPreactResponse(<Maintenance lang={lang} end={end} />, {
    status: 503,
    headers: end ? { 'Retry-After': end.toHTTP() } : {},
  })
}
