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

import { handleRequest as f } from '../src'

let fetchMock: jest.Mock
class ResponseMock {
  constructor(
    public html: string,
    public init?: {
      headers?: Record<string, string>
      status?: number
      statusText?: string
    }
  ) {}
}

beforeEach(() => {
  fetchMock = jest.fn((...args) => {
    return true
  })
  // @ts-ignore
  window['fetch'] = fetchMock
  // @ts-ignore
  window['Response'] = ResponseMock
})

describe('Maintenance mode', () => {
  test('Disabled (no maintenance planned)', async () => {
    mockMaintenanceKV({})
    await handleRequest('https://de.serlo.org')
    expectFetchToHaveBeenCalledWithRequest({
      url: 'https://de.serlo.org'
    } as Request)
  })

  test('Disabled (before scheduled maintenance)', async () => {
    const value = {
      start: DateTime.local()
        .plus({ minutes: 10 })
        .toISO(),
      end: DateTime.local()
        .plus({ minutes: 20 })
        .toISO(),
      subdomains: ['de']
    }
    mockMaintenanceKV({
      enabled: JSON.stringify(value)
    })
    await handleRequest('https://de.serlo.org')
    expectFetchToHaveBeenCalledWithRequest({
      url: 'https://de.serlo.org'
    } as Request)
  })

  test('Disabled (after scheduled maintenance)', async () => {
    const value = {
      start: DateTime.local()
        .minus({ minutes: 20 })
        .toISO(),
      end: DateTime.local()
        .minus({ minutes: 10 })
        .toISO(),
      subdomains: ['de']
    }
    mockMaintenanceKV({
      enabled: JSON.stringify(value)
    })
    await handleRequest('https://de.serlo.org')
    expectFetchToHaveBeenCalledWithRequest({
      url: 'https://de.serlo.org'
    } as Request)
  })

  test('Enabled (de, w/ end)', async () => {
    const end = DateTime.local().plus({ minutes: 10 })
    const value = {
      start: DateTime.local()
        .minus({ minutes: 10 })
        .toISO(),
      end: end.toISO(),
      subdomains: ['de']
    }
    mockMaintenanceKV({
      enabled: JSON.stringify(value)
    })
    const { html, init } = await handleRequest('https://de.serlo.org')
    expect(init && init.status).toEqual(503)
    expect(init && init.headers && init.headers['Content-Type']).toEqual(
      'text/html;charset=utf-8'
    )
    expect(init && init.headers && init.headers['Retry-After']).toEqual(
      end.toHTTP()
    )
    expect(html).toContain('Wartungsmodus')
    expect(html).toContain(
      `gegen ${end.setLocale('de').toFormat('HH:mm (ZZZZ)')} wieder online`
    )
  })

  test('Enabled (en, w/ end)', async () => {
    const end = DateTime.local().plus({ minutes: 10 })
    const value = {
      start: DateTime.local()
        .minus({ minutes: 10 })
        .toISO(),
      end: end.toISO(),
      subdomains: ['en']
    }
    mockMaintenanceKV({
      enabled: JSON.stringify(value)
    })
    const { html, init } = await handleRequest('https://en.serlo.org')
    expect(init && init.status).toEqual(503)
    expect(init && init.headers && init.headers['Content-Type']).toEqual(
      'text/html;charset=utf-8'
    )
    expect(init && init.headers && init.headers['Retry-After']).toEqual(
      end.toHTTP()
    )
    expect(html).toContain('Maintenance mode')
    expect(html).toContain(
      `We expect to be back by ${end.setLocale('en').toFormat('HH:mm (ZZZZ)')}`
    )
  })

  test('Enabled (de, w/o end)', async () => {
    const value = {
      start: DateTime.local()
        .minus({ minutes: 10 })
        .toISO(),
      subdomains: ['de']
    }
    mockMaintenanceKV({
      enabled: JSON.stringify(value)
    })
    const { html, init } = await handleRequest('https://de.serlo.org')
    expect(init && init.status).toEqual(503)
    expect(init && init.headers && init.headers['Content-Type']).toEqual(
      'text/html;charset=utf-8'
    )
    expect(html).toContain('Wartungsmodus')
    expect(html).toContain('in ein paar Stunden wieder online')
  })

  test('Enabled (en, w/o end)', async () => {
    const value = {
      start: DateTime.local()
        .minus({ minutes: 10 })
        .toISO(),
      subdomains: ['en']
    }
    mockMaintenanceKV({
      enabled: JSON.stringify(value)
    })
    const { html, init } = await handleRequest('https://en.serlo.org')
    expect(init && init.status).toEqual(503)
    expect(init && init.headers && init.headers['Content-Type']).toEqual(
      'text/html;charset=utf-8'
    )
    expect(html).toContain('Maintenance mode')
    expect(html).toContain('We expect to be back in a couple of hours.')
  })

  test('Enabled (different subdomain, w/ end)', async () => {
    const end = DateTime.local().plus({ minutes: 10 })
    const value = {
      start: DateTime.local()
        .minus({ minutes: 10 })
        .toISO(),
      end: end.toISO(),
      subdomains: ['en']
    }
    mockMaintenanceKV({
      enabled: JSON.stringify(value)
    })
    await handleRequest('https://de.serlo.org')
    expectFetchToHaveBeenCalledWithRequest({
      url: 'https://de.serlo.org'
    } as Request)
  })

  test('Enabled (different subdomain, w/o end)', async () => {
    const value = {
      start: DateTime.local()
        .minus({ minutes: 10 })
        .toISO(),
      subdomains: ['en']
    }
    mockMaintenanceKV({
      enabled: JSON.stringify(value)
    })
    await handleRequest('https://de.serlo.org')
    expectFetchToHaveBeenCalledWithRequest({
      url: 'https://de.serlo.org'
    } as Request)
  })
})

async function handleRequest(url: string): Promise<ResponseMock> {
  const response = await f({ url } as Request)
  return (response as unknown) as ResponseMock
}

function mockMaintenanceKV(values: Record<string, unknown>) {
  // @ts-ignore
  window['MAINTENANCE_KV'] = {
    async get(key: string) {
      return values[key] || null
    }
  }
}

function expectFetchToHaveBeenCalledWithRequest(request: Request) {
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const [arg1, arg2] = fetchMock.mock.calls[0]
  if (typeof arg1 === 'string') {
    expect({ ...arg2, url: arg1 }).toEqual(request)
  } else {
    expect(arg1).toEqual(request)
  }
}
