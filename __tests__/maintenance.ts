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
import { DateTime } from 'luxon'

import { Instance } from '../src/utils'
import {
  expectContentTypeIsHtml,
  expectContainsText,
  createKV,
  givenUuid,
  localTestEnvironment,
} from './__utils__'

beforeEach(() => {
  givenUuid({
    __typename: 'Page',
    alias: '/',
    instance: Instance.De,
    content: 'Startseite',
  })
})

test('Disabled (no maintenance planned)', async () => {
  global.MAINTENANCE_KV = createKV()

  await expectNoMaintenanceModeForDe()
})

test('Disabled (before scheduled maintenance)', async () => {
  const value = {
    start: DateTime.local().plus({ minutes: 10 }).toISO(),
    end: DateTime.local().plus({ minutes: 20 }).toISO(),
    subdomains: ['de'],
  }
  await global.MAINTENANCE_KV.put('enabled', JSON.stringify(value))

  await expectNoMaintenanceModeForDe()
})

test('Disabled (after scheduled maintenance)', async () => {
  const value = {
    start: DateTime.local().minus({ minutes: 20 }).toISO(),
    end: DateTime.local().minus({ minutes: 10 }).toISO(),
    subdomains: ['de'],
  }
  await global.MAINTENANCE_KV.put('enabled', JSON.stringify(value))

  await expectNoMaintenanceModeForDe()
})

test('Enabled (de, w/ end)', async () => {
  const end = DateTime.local().plus({ minutes: 10 })
  const value = {
    start: DateTime.local().minus({ minutes: 10 }).toISO(),
    end: end.toISO(),
    subdomains: ['de'],
  }
  await global.MAINTENANCE_KV.put('enabled', JSON.stringify(value))

  const response = await fetchMainPage('de')

  expect(response.headers.get('Retry-After')).toEqual(end.toHTTP())
  await expectMaintenanceResponse({
    response,
    expectTexts: [
      'Wartungsmodus',
      `gegen ${end.setLocale('de').toFormat('HH:mm (ZZZZ)')} wieder online`,
    ],
  })
})

test('Enabled (en, w/ end)', async () => {
  const end = DateTime.local().plus({ minutes: 10 })
  const value = {
    start: DateTime.local().minus({ minutes: 10 }).toISO(),
    end: end.toISO(),
    subdomains: ['en'],
  }
  await global.MAINTENANCE_KV.put('enabled', JSON.stringify(value))

  const response = await fetchMainPage('en')

  expect(response.headers.get('Retry-After')).toEqual(end.toHTTP())
  await expectMaintenanceResponse({
    response,
    expectTexts: [
      'Maintenance mode',
      `We expect to be back by ${end.setLocale('en').toFormat('HH:mm (ZZZZ)')}`,
    ],
  })
})

test('Enabled (de, w/o end)', async () => {
  const value = {
    start: DateTime.local().minus({ minutes: 10 }).toISO(),
    subdomains: ['de'],
  }
  await global.MAINTENANCE_KV.put('enabled', JSON.stringify(value))

  const response = await fetchMainPage('de')

  await expectMaintenanceResponse({
    response,
    expectTexts: ['Wartungsmodus', 'in ein paar Stunden wieder online'],
  })
})

test('Enabled (en, w/o end)', async () => {
  const value = {
    start: DateTime.local().minus({ minutes: 10 }).toISO(),
    subdomains: ['en'],
  }
  await global.MAINTENANCE_KV.put('enabled', JSON.stringify(value))

  const response = await fetchMainPage('en')

  await expectMaintenanceResponse({
    response,
    expectTexts: [
      'Maintenance mode',
      'We expect to be back in a couple of hours.',
    ],
  })
})

test('Enabled (different subdomain, w/ end)', async () => {
  const end = DateTime.local().plus({ minutes: 10 })
  const value = {
    start: DateTime.local().minus({ minutes: 10 }).toISO(),
    end: end.toISO(),
    subdomains: ['en'],
  }
  await global.MAINTENANCE_KV.put('enabled', JSON.stringify(value))

  await expectNoMaintenanceModeForDe()
})

test('Enabled (different subdomain, w/o end)', async () => {
  const value = {
    start: DateTime.local().minus({ minutes: 10 }).toISO(),
    subdomains: ['en'],
  }
  await global.MAINTENANCE_KV.put('enabled', JSON.stringify(value))

  await expectNoMaintenanceModeForDe()
})

async function expectNoMaintenanceModeForDe() {
  const response = await fetchMainPage('de')

  expect(await response.text()).toEqual(expect.stringContaining('Startseite'))
}

async function expectMaintenanceResponse({
  response,
  expectTexts,
}: {
  response: Response
  expectTexts: string[]
}) {
  expect(response.status).toEqual(503)
  expectContentTypeIsHtml(response)
  await expectContainsText(response, expectTexts)
}

async function fetchMainPage(subdomain: string) {
  return await localTestEnvironment().fetch({ subdomain })
}
