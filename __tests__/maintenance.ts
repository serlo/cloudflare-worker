import { DateTime } from 'luxon'

import {
  expectContentTypeIsHtml,
  expectContainsText,
  createKV,
  givenUuid,
  localTestEnvironment,
} from './__utils__'
import { Instance } from '../src/utils'

beforeEach(() => {
  givenUuid({
    __typename: 'Page',
    alias: '/',
    instance: Instance.De,
    content: 'Startseite',
  })
})

test('Disabled (no maintenance planned)', async () => {
  globalThis.MAINTENANCE_KV = createKV()

  await expectNoMaintenanceModeForDe()
})

test('Disabled (before scheduled maintenance)', async () => {
  const value = {
    start: DateTime.local().plus({ minutes: 10 }).toISO(),
    end: DateTime.local().plus({ minutes: 20 }).toISO(),
    subdomains: ['de'],
  }
  await globalThis.MAINTENANCE_KV.put('enabled', JSON.stringify(value))

  await expectNoMaintenanceModeForDe()
})

test('Disabled (after scheduled maintenance)', async () => {
  const value = {
    start: DateTime.local().minus({ minutes: 20 }).toISO(),
    end: DateTime.local().minus({ minutes: 10 }).toISO(),
    subdomains: ['de'],
  }
  await globalThis.MAINTENANCE_KV.put('enabled', JSON.stringify(value))

  await expectNoMaintenanceModeForDe()
})

test('Enabled (de, w/ end)', async () => {
  const end = DateTime.local().plus({ minutes: 10 })
  const value = {
    start: DateTime.local().minus({ minutes: 10 }).toISO(),
    end: end.toISO(),
    subdomains: ['de'],
  }
  await globalThis.MAINTENANCE_KV.put('enabled', JSON.stringify(value))

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
  await globalThis.MAINTENANCE_KV.put('enabled', JSON.stringify(value))

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
  await globalThis.MAINTENANCE_KV.put('enabled', JSON.stringify(value))

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
  await globalThis.MAINTENANCE_KV.put('enabled', JSON.stringify(value))

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
  await globalThis.MAINTENANCE_KV.put('enabled', JSON.stringify(value))

  await expectNoMaintenanceModeForDe()
})

test('Enabled (different subdomain, w/o end)', async () => {
  const value = {
    start: DateTime.local().minus({ minutes: 10 }).toISO(),
    subdomains: ['en'],
  }
  await globalThis.MAINTENANCE_KV.put('enabled', JSON.stringify(value))

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
