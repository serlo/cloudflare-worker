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
import { givenUuid, currentTestEnvironment } from './__utils__'

const env = currentTestEnvironment()

const url = { subdomain: 'api', pathname: '/graphql' }

const query = `
query($alias: AliasInput) {
  uuid(alias: $alias) {
    __typename
    id
    ... on Page {
      alias
    }
  }
}
`

const requestPayload = {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query,
    variables: { alias: { instance: 'de', path: '/23591' } },
  }),
}

let response: Response

beforeEach(async () => {
  givenUuid({
    id: 23591,
    __typename: 'Page',
    alias: '/23591/math',
  })

  response = await env.fetch(url, requestPayload)
})

test('Calls to API get a signature', async () => {
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({
    data: { uuid: { __typename: 'Page', alias: '/23591/math', id: 23591 } },
  })
})

async function fetchWithOriginHeader(origin: string) {
  return await env.fetch(url, {
    ...requestPayload,
    headers: { ...requestPayload.headers, Origin: origin },
  })
}

test("header `Access-Control-Allow-Origin` is set to Serlo's domain or subdomains", async () => {
  const domainOrigin = `https://${env.getDomain()}`

  const responseWithoutOriginHeader = response

  expect(
    responseWithoutOriginHeader.headers.get('Access-Control-Allow-Origin')
  ).toBe(domainOrigin)

  const responseWithRightDomain = await fetchWithOriginHeader(domainOrigin)

  expect(
    responseWithRightDomain.headers.get('Access-Control-Allow-Origin')
  ).toBe(domainOrigin)

  const subdomainOrigin = `https://de.${env.getDomain()}`

  const responseWithRightSubdomain = await fetchWithOriginHeader(
    subdomainOrigin
  )

  expect(
    responseWithRightSubdomain.headers.get('Access-Control-Allow-Origin')
  ).toBe(subdomainOrigin)

  const responseWithWrongOrigin = await fetchWithOriginHeader(
    `https://verybad-${env.getDomain()}`
  )

  expect(
    responseWithWrongOrigin.headers.get('Access-Control-Allow-Origin')
  ).not.toBe(`https://verybad-${env.getDomain()}`)
})

test('header `Vary` avoids caching of Origin header', () => {
  expect(response.headers.get('Vary')).toBe('Origin')
})
