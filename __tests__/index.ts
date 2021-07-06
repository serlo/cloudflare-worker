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

import { Instance } from '../src/utils'
import {
  mockHttpGet,
  returnsText,
  givenUuid,
  currentTestEnvironment,
  currentTestEnvironmentWhen,
  givenAssets,
  defaultAssetsServer,
  expectImageReponse,
  givenCssOnPackages,
  expectToBeRedirectTo,
  localTestEnvironment,
} from './__utils__'

describe('Enforce HTTPS', () => {
  const env = currentTestEnvironment()

  test('HTTP URL', async () => {
    const response = await env.fetch({
      subdomain: 'en',
      protocol: 'http',
    })

    const target = env.createUrl({ subdomain: 'en' })
    expectToBeRedirectTo(response, target, 302)
  })

  test('HTTPS URL', async () => {
    givenUuid({
      __typename: 'Page',
      alias: '/',
      instance: Instance.De,
      content: 'Startseite',
    })

    const response = await env.fetch({
      subdomain: 'de',
      protocol: 'https',
    })
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

describe('Semantic file names', () => {
  beforeEach(() => {
    givenAssets(
      defaultAssetsServer({
        '/meta/serlo.jpg': { contentType: 'image/jpeg', contentLength: 139735 },
        '/5c766c2380ea6_13576fb9538fbbab5bbe8fad96bd16d80f7f5119.png': {
          contentType: 'image/png',
          contentLength: 3624,
        },
        '/legacy/58f090745b909_16a4cba82bd1cb09434b7f582e555b9ac7531922.png': {
          contentType: 'image/png',
          contentLength: 898192,
        },
      })
    )
  })

  test('assets.serlo.org/meta/*', async () => {
    const env = currentTestEnvironment()

    const response = await env.fetch({
      subdomain: 'assets',
      pathname: '/meta/serlo.jpg',
    })

    expectImageReponse({
      response,
      expectedImageType: 'image/jpeg',
      expectedContentLength: 139735,
    })
  })

  test('assets.serlo.org/<hash>/<fileName>.<ext>', async () => {
    const response = await currentTestEnvironment().fetch({
      subdomain: 'assets',
      pathname:
        '/5c766c2380ea6_13576fb9538fbbab5bbe8fad96bd16d80f7f5119/ashoka.png',
    })

    expectImageReponse({
      response,
      expectedContentLength: 3624,
      expectedImageType: 'image/png',
    })
  })

  test('assets.serlo.org/legacy/<hash>/<fileName>.<ext>', async () => {
    const response = await currentTestEnvironment().fetch({
      subdomain: 'assets',
      pathname:
        '/legacy/58f090745b909_16a4cba82bd1cb09434b7f582e555b9ac7531922/garden.png',
    })

    expectImageReponse({
      response,
      expectedContentLength: 898192,
      expectedImageType: 'image/png',
    })
  })
})

test('Disallow robots in staging', async () => {
  global.DOMAIN = 'serlo-staging.org'
  const env = currentTestEnvironmentWhen(
    (config) => config.DOMAIN === 'serlo-staging.org'
  )

  const request = new Request('https://de.serlo-staging.dev/robots.txt')
  const response = await env.fetchRequest(request)

  expect(await response.text()).toBe('User-agent: *\nDisallow: /\n')
})

describe('packages.serlo.org', () => {
  beforeEach(async () => {
    givenCssOnPackages('/serlo-org-client@10.0.0/main.css')

    await global.PACKAGES_KV.put(
      'serlo-org-client@10',
      'serlo-org-client@10.0.0'
    )
  })

  test('resolves to specific package version when package name is in PACKAGES_KV', async () => {
    const response = await currentTestEnvironment().fetch({
      subdomain: 'packages',
      pathname: '/serlo-org-client@10/main.css',
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/css')
  })

  test('forwards request when package name is not in PACKAGES_KV', async () => {
    const response = await currentTestEnvironment().fetch({
      subdomain: 'packages',
      pathname: '/serlo-org-client@10.0.0/main.css',
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/css')
  })
})
