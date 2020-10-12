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

import { maintenanceMode } from '../src/maintenance'
import { expectContentTypeIsHtml, expectContainsText, mockKV } from './_helper'

describe('Maintenance mode', () => {
  test('Disabled (no maintenance planned)', async () => {
    mockKV('MAINTENANCE_KV', {})

    expect(await handleUrl('https://de.serlo.org')).toBeNull()
  })

  test('Disabled (before scheduled maintenance)', async () => {
    const value = {
      start: DateTime.local().plus({ minutes: 10 }).toISO(),
      end: DateTime.local().plus({ minutes: 20 }).toISO(),
      subdomains: ['de'],
    }
    mockKV('MAINTENANCE_KV', { enabled: JSON.stringify(value) })

    expect(await handleUrl('https://de.serlo.org')).toBeNull()
  })

  test('Disabled (after scheduled maintenance)', async () => {
    const value = {
      start: DateTime.local().minus({ minutes: 20 }).toISO(),
      end: DateTime.local().minus({ minutes: 10 }).toISO(),
      subdomains: ['de'],
    }
    mockKV('MAINTENANCE_KV', { enabled: JSON.stringify(value) })

    expect(await handleUrl('https://de.serlo.org')).toBeNull()
  })

  test('Enabled (de, w/ end)', async () => {
    const end = DateTime.local().plus({ minutes: 10 })
    const value = {
      start: DateTime.local().minus({ minutes: 10 }).toISO(),
      end: end.toISO(),
      subdomains: ['de'],
    }
    mockKV('MAINTENANCE_KV', { enabled: JSON.stringify(value) })

    const response = await handleUrl('https://de.serlo.org')
    expect(response.status).toEqual(503)
    expectContentTypeIsHtml(response)
    expect(response.headers.get('Retry-After')).toEqual(end.toHTTP())
    await expectContainsText(response, [
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
    mockKV('MAINTENANCE_KV', { enabled: JSON.stringify(value) })

    const response = await handleUrl('https://en.serlo.org')
    expect(response.status).toEqual(503)
    expectContentTypeIsHtml(response)
    expect(response.headers.get('Retry-After')).toEqual(end.toHTTP())
    await expectContainsText(response, [
      'Maintenance mode',
      `We expect to be back by ${end.setLocale('en').toFormat('HH:mm (ZZZZ)')}`,
    ])
  })

  test('Enabled (de, w/o end)', async () => {
    const value = {
      start: DateTime.local().minus({ minutes: 10 }).toISO(),
      subdomains: ['de'],
    }
    mockKV('MAINTENANCE_KV', { enabled: JSON.stringify(value) })

    const response = await handleUrl('https://de.serlo.org')
    expect(response.status).toEqual(503)
    expectContentTypeIsHtml(response)
    await expectContainsText(response, [
      'Wartungsmodus',
      'in ein paar Stunden wieder online',
    ])
  })

  test('Enabled (en, w/o end)', async () => {
    const value = {
      start: DateTime.local().minus({ minutes: 10 }).toISO(),
      subdomains: ['en'],
    }
    mockKV('MAINTENANCE_KV', { enabled: JSON.stringify(value) })

    const response = await handleUrl('https://en.serlo.org')
    expect(response.status).toEqual(503)
    expectContentTypeIsHtml(response)
    await expectContainsText(response, [
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
    mockKV('MAINTENANCE_KV', { enabled: JSON.stringify(value) })

    expect(await handleUrl('https://de.serlo.org')).toBeNull()
  })

  test('Enabled (different subdomain, w/o end)', async () => {
    const value = {
      start: DateTime.local().minus({ minutes: 10 }).toISO(),
      subdomains: ['en'],
    }
    mockKV('MAINTENANCE_KV', { enabled: JSON.stringify(value) })

    expect(await handleUrl('https://de.serlo.org')).toBeNull()
  })
})

async function handleUrl(url: string): Promise<Response> {
  return (await maintenanceMode(new Request(url))) as Response
}
