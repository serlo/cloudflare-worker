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
import { DateTime } from 'luxon'

import { handleRequest } from '../src'
import { createApiResponse } from './frontend-proxy'
import { contentTypeIsHtml, containsText, withMockedFetch } from './utils'

describe('Maintenance mode', () => {
  test('Disabled (no maintenance planned)', async () => {
    mockMaintenanceKV({})

    await withMockedFetch([createApiResponse(), echoUrl], async () => {
      const res = await handleUrl('https://de.serlo.org')
      expect(await res.text()).toBe('https://de.serlo.org/')
    })
  })

  test('Disabled (before scheduled maintenance)', async () => {
    const value = {
      start: DateTime.local().plus({ minutes: 10 }).toISO(),
      end: DateTime.local().plus({ minutes: 20 }).toISO(),
      subdomains: ['de'],
    }
    mockMaintenanceKV({
      enabled: JSON.stringify(value),
    })

    await withMockedFetch([createApiResponse(), echoUrl], async () => {
      const res = await handleUrl('https://de.serlo.org')
      expect(await res.text()).toBe('https://de.serlo.org/')
    })
  })

  test('Disabled (after scheduled maintenance)', async () => {
    const value = {
      start: DateTime.local().minus({ minutes: 20 }).toISO(),
      end: DateTime.local().minus({ minutes: 10 }).toISO(),
      subdomains: ['de'],
    }
    mockMaintenanceKV({
      enabled: JSON.stringify(value),
    })

    await withMockedFetch([createApiResponse(), echoUrl], async () => {
      const res = await handleUrl('https://de.serlo.org')
      expect(await res.text()).toBe('https://de.serlo.org/')
    })
  })

  test('Enabled (de, w/ end)', async () => {
    const end = DateTime.local().plus({ minutes: 10 })
    const value = {
      start: DateTime.local().minus({ minutes: 10 }).toISO(),
      end: end.toISO(),
      subdomains: ['de'],
    }
    mockMaintenanceKV({
      enabled: JSON.stringify(value),
    })

    const response = await handleUrl('https://de.serlo.org')
    expect(response.status).toEqual(503)
    contentTypeIsHtml(response)
    expect(response.headers.get('Retry-After')).toEqual(end.toHTTP())
    await containsText(response, [
      'Wartungsmodus',
      `gegen ${end.setLocale('de').toFormat('HH:mm (ZZZZ)')} wieder online`,
    ])
  })

  test('Enabled (en, w/ end)', async () => {
    const end = DateTime.local().plus({ minutes: 10 })
    const value = {
      start: DateTime.local().minus({ minutes: 10 }).toISO(),
      end: end.toISO(),
      subdomains: ['en'],
    }
    mockMaintenanceKV({
      enabled: JSON.stringify(value),
    })

    const response = await handleUrl('https://en.serlo.org')
    expect(response.status).toEqual(503)
    contentTypeIsHtml(response)
    expect(response.headers.get('Retry-After')).toEqual(end.toHTTP())
    await containsText(response, [
      'Maintenance mode',
      `We expect to be back by ${end.setLocale('en').toFormat('HH:mm (ZZZZ)')}`,
    ])
  })

  test('Enabled (de, w/o end)', async () => {
    const value = {
      start: DateTime.local().minus({ minutes: 10 }).toISO(),
      subdomains: ['de'],
    }
    mockMaintenanceKV({
      enabled: JSON.stringify(value),
    })

    const response = await handleUrl('https://de.serlo.org')
    expect(response.status).toEqual(503)
    contentTypeIsHtml(response)
    await containsText(response, [
      'Wartungsmodus',
      'in ein paar Stunden wieder online',
    ])
  })

  test('Enabled (en, w/o end)', async () => {
    const value = {
      start: DateTime.local().minus({ minutes: 10 }).toISO(),
      subdomains: ['en'],
    }
    mockMaintenanceKV({
      enabled: JSON.stringify(value),
    })

    const response = await handleUrl('https://en.serlo.org')
    expect(response.status).toEqual(503)
    contentTypeIsHtml(response)
    await containsText(response, [
      'Maintenance mode',
      'We expect to be back in a couple of hours.',
    ])
  })

  test('Enabled (different subdomain, w/ end)', async () => {
    const end = DateTime.local().plus({ minutes: 10 })
    const value = {
      start: DateTime.local().minus({ minutes: 10 }).toISO(),
      end: end.toISO(),
      subdomains: ['en'],
    }
    mockMaintenanceKV({
      enabled: JSON.stringify(value),
    })

    await withMockedFetch([createApiResponse(), echoUrl], async () => {
      const res = await handleUrl('https://de.serlo.org')
      expect(await res.text()).toBe('https://de.serlo.org/')
    })
  })

  test('Enabled (different subdomain, w/o end)', async () => {
    const value = {
      start: DateTime.local().minus({ minutes: 10 }).toISO(),
      subdomains: ['en'],
    }
    mockMaintenanceKV({
      enabled: JSON.stringify(value),
    })

    await withMockedFetch([createApiResponse(), echoUrl], async () => {
      const res = await handleUrl('https://de.serlo.org')
      expect(await res.text()).toBe('https://de.serlo.org/')
    })
  })
})

async function handleUrl(url: string): Promise<Response> {
  return await handleRequest(new Request(url))
}

function echoUrl(req: Request): Promise<Response> {
  return new Promise<Response>((resolve) => resolve(new Response(req.url)))
}

function mockMaintenanceKV(values: Record<string, unknown>) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
  // @ts-ignore
  window['MAINTENANCE_KV'] = {
    // eslint-disable-next-line @typescript-eslint/require-await
    async get(key: string) {
      return values[key] || null
    },
  }
}
