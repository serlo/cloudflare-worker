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

import { handleRequest } from '../src'
import {
  expectIsNotFoundResponse,
  givenApi,
  givenUuid,
  mockHttpGet,
  returnsMalformedJson,
  returnsText,
  Uuid,
} from './__utils__'

async function handleUrl(url: string): Promise<Response> {
  return await handleRequest(new Request(url))
}

function expectToBeRedirectTo(response: Response, url: string, status: number) {
  expect(response.headers.get('Location')).toBe(url)
  expect(response.status).toBe(status)
}

export async function redirects1(
  firstLink: string,
  secondLink: string,
  statusNum: number
) {
  const response = await handleUrl(firstLink)
  const target = secondLink
  const status = statusNum
  expectToBeRedirectTo(response, target, status)
} //can be shortened

export async function redirects2(
  object: Uuid,
  firstLink: string,
  secondLink: string
) {
  givenUuid(object)
  mockHttpGet(firstLink, returnsText('article content'))
  const response = await handleUrl(secondLink)
  expect(await response.text()).toBe('article content')
}

export async function redirects3(firstLink: string, secondLink: string) {
  mockHttpGet(firstLink, returnsText('article content'))
  const response = await handleUrl(secondLink)
  expect(await response.text()).toBe('article content')
}

export async function redirects4(firstLink: string, secondLink: string) {
  mockHttpGet(firstLink, returnsText('article content'))
  const request = new Request(secondLink, {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
    },
  })
  const response = await handleRequest(request)
  expect(await response.text()).toBe('article content')
}

export async function redirects5(firstLink: string, secondLink: string) {
  givenApi(returnsMalformedJson())

  mockHttpGet(firstLink, returnsText('article content'))
  const response = await handleUrl(secondLink)
  expect(await response.text()).toBe('article content')
}

export async function redirects6(
  object: Uuid,
  firstLink: string,
  secondLink: string,
  statusNum: number
) {
  givenUuid(object)
  const response = await handleUrl(firstLink)

  expectToBeRedirectTo(response, secondLink, statusNum)
}
export async function redirects7(firstLink: string) {
  const response = await handleUrl(firstLink)
  await expectIsNotFoundResponse(response)
}
