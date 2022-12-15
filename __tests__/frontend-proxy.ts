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
import { Instance } from '../src/utils'
import {
  mockHttpGet,
  returnsText,
  givenUuid,
  localTestEnvironment,
  currentTestEnvironment,
  redirectsTo,
  givenFrontend,
  expectSentryEvent,
} from './__utils__'

test('Always choose new frontend as default route', async () => {
  await expectFrontend(
    await currentTestEnvironment().fetch({ subdomain: 'en' })
  )
})

test('No redirect for subjects', async () => {
  givenUuid({
    id: 1555,
    __typename: 'Article',
    alias: '/informatik/1235',
    oldAlias: '/informatik',
    instance: Instance.De,
  })

  const response = await currentTestEnvironment().fetch({
    subdomain: 'de',
    pathname: '/informatik',
  })

  await expectFrontend(response)
})

test('Uses legacy frontend when cookie "useLegacyFrontend" is "true"', async () => {
  const env = currentTestEnvironment()
  const request = env.createRequest({ subdomain: 'en' })

  request.headers.append('Cookie', 'useLegacyFrontend=true;')

  await expectLegacy(await env.fetchRequest(request))
})

test('chooses frontend when request contains content api parameter', async () => {
  givenUuid({
    id: 1555,
    __typename: 'Article',
    alias: '/mathe/1555/zylinder',
    instance: Instance.De,
  })
  const response = await currentTestEnvironment().fetch({
    subdomain: 'de',
    pathname: '/mathe/1555/zylinder?contentOnly',
  })

  await expectFrontend(response)
})

describe('when request contains header X-From: legacy-serlo.org', () => {
  let response: Response

  beforeEach(async () => {
    // TODO: Delete
    // setupProbabilityFor(Backend.Frontend)

    response = await currentTestEnvironment().fetch(
      {
        subdomain: 'en',
        pathname: '/',
      },
      { headers: { 'X-From': 'legacy-serlo.org' } }
    )
  })

  test('chooses legacy backend', async () => {
    await expectLegacy(response)
  })

  test('does not set cookie with random number', () => {
    expect(response.headers.get('Set-Cookie')).not.toEqual(
      expect.stringContaining('useFrontend')
    )
  })
})

test('Resports to sentry when frontend responded with redirect', async () => {
  givenFrontend(redirectsTo('https://frontend.serlo.org/'))
  mockHttpGet('https://frontend.serlo.org/', returnsText('Hello World'))

  const env = localTestEnvironment()
  const response = await env.fetch({ subdomain: 'en', pathname: '/math' })

  expect(await response.text()).toBe('Hello World')
  expectSentryEvent({
    message: 'Frontend responded with a redirect',
    level: 'error',
    context: {
      backendUrl: env.createUrl({
        subdomain: 'frontend',
        pathname: '/en/math',
      }),
      responseUrl: 'https://frontend.serlo.org/',
    },
  })
})

test('creates a copy of backend responses (otherwise there is an error in cloudflare)', async () => {
  const backendResponse = new Response('')
  global.fetch = jest.fn().mockResolvedValue(backendResponse)

  // There is not type checking for the main page and thus we do not need
  // to mock the api request here
  const response = await localTestEnvironment().fetch({ subdomain: 'en' })

  expect(response).not.toBe(backendResponse)
})

describe('requests to /enable-frontend enable use of frontend', () => {
  let ressponse: Response

  beforeEach(async () => {
    ressponse = await currentTestEnvironment().fetch({
      subdomain: 'en',
      pathname: '/enable-frontend',
    })
  })

  test('shows message that frontend was enabled', async () => {
    expect(ressponse.status).toBe(200)
    expect(await ressponse.text()).toBe('Enabled: Use of new frontend')
  })

  test('sets cookie so that new frontend will be used', () => {
    expect(ressponse.headers.get('Set-Cookie')).toEqual(
      expect.stringContaining('useLegacyFrontend=false;')
    )
  })

  test('main page will be loaded after 1 second', () => {
    expect(ressponse.headers.get('Refresh')).toBe('1; url=/')
  })
})

describe('requests to /disable-frontend disable use of frontend', () => {
  let response: Response

  beforeEach(async () => {
    response = await currentTestEnvironment().fetch({
      subdomain: 'en',
      pathname: '/disable-frontend',
    })
  })

  test('shows message that frontend use is disabled', async () => {
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('Disabled: Use of new frontend')
  })

  test('sets cookie to that legacy backend will be used', () => {
    expect(response.headers.get('Set-Cookie')).toEqual(
      expect.stringContaining('useLegacyFrontend=true;')
    )
  })

  test('main page will be loaded after 1 second', () => {
    expect(response.headers.get('Refresh')).toBe('1; url=/')
  })
})

async function expectLegacy(response: Response) {
  expect(await response.text()).toEqual(
    expect.stringContaining('<html class="fuelux"')
  )
  // Tests that backend headers are transfered to client
  expect(response.headers.get('x-powered-by')).toEqual(
    expect.stringContaining('PHP')
  )
}

async function expectFrontend(response: Response) {
  expect(await response.text()).toEqual(
    expect.stringContaining('<script id="__NEXT_DATA__"')
  )
  // Tests that backend headers are transfered to client
  expect(response.headers.get('x-vercel-cache')).toBeDefined()
}
