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

import {
  mockHttpGet,
  returnsText,
  givenUuid,
  currentTestEnvironment,
  expectToBeRedirectTo,
  localTestEnvironment,
} from './__utils__'
import { Instance } from '../src/utils'

describe('Enforce HTTPS', () => {
  const env = currentTestEnvironment()

  test('HTTP URL', async () => {
    const response = await env.fetch({ subdomain: 'en', protocol: 'http' })

    expectToBeRedirectTo(response, env.createUrl({ subdomain: 'en' }), 302)
  })

  test('HTTPS URL', async () => {
    givenUuid({
      __typename: 'Page',
      alias: '/',
      instance: Instance.De,
      content: 'Startseite',
    })

    const response = await env.fetch({ subdomain: 'de', protocol: 'https' })

    expect(await response.text()).toEqual(expect.stringContaining('Startseite'))
  })

  test('Pact Broker', async () => {
    const local = localTestEnvironment()
    mockHttpGet(
      local.createUrl({ subdomain: 'pacts', pathname: '/bar' }),
      returnsText('content')
    )

    const response = await local.fetch({ subdomain: 'pacts', pathname: '/bar' })

    expect(await response.text()).toBe('content')
  })
})
