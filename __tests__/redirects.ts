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
import { Instance } from '../src/utils'
import {
  expectIsNotFoundResponse,
  expectToBeRedirectTo,
  givenApi,
  givenUuid,
  mockHttpGet,
  returnsMalformedJson,
  returnsText,
} from './__utils__'

describe('meet.serlo.org', () => {
  test.each([
    ['/', '/vtk-ncrc-rdp'],
    ['/dev', '/rci-pize-jow'],
    ['/einbindung', '/qzv-ojgk-xqw'],
    ['/begleitung', '/kon-wdmt-yhb'],
    ['/reviewing', '/kon-wdmt-yhb'],
    ['/labschool', '/cvd-pame-zod'],
    ['/1', '/fxn-iprp-ezx'],
    ['/2', '/yku-aksd-fkk'],
    ['/3', '/qma-zouf-vcz'],
    ['/4', '/iskddmh-wrh'],
    ['/5', '/xqt-cdpm-nco'],
    ['/6', '/sui-yuwv-suh'],
  ])('meet.serlo.org%s', async (path, googleMeetRoom) => {
    const response = await handleUrl(`https://meet.serlo.local${path}`)

    const target = `https://meet.google.com${googleMeetRoom}`
    expectToBeRedirectTo(response, target, 302)
  })

  test('returns 404 when meet room is not defined', async () => {
    const response = await handleUrl('https://meet.serlo.local/def')

    await expectIsNotFoundResponse(response)
  })
})

test('de.serlo.org/datenschutz', async () => {
  const response = await handleUrl('https://de.serlo.local/datenschutz')

  const target = 'https://de.serlo.org/privacy'
  expectToBeRedirectTo(response, target, 301)
})

test('de.serlo.org/impressum', async () => {
  const response = await handleUrl('https://de.serlo.local/impressum')

  const target = 'https://de.serlo.org/imprint'
  expectToBeRedirectTo(response, target, 301)
})

test('de.serlo.org/nutzungsbedingungen ', async () => {
  const response = await handleUrl('https://de.serlo.local/nutzungsbedingungen')

  const target = 'https://de.serlo.org/terms'
  expectToBeRedirectTo(response, target, 301)
})

test('start.serlo.org', async () => {
  const response = await handleUrl('https://start.serlo.local/')

  const target =
    'https://docs.google.com/document/d/1qsgkXWNwC-mcgroyfqrQPkZyYqn7m1aimw2gwtDTmpM/'
  expectToBeRedirectTo(response, target, 301)
})

test.each(['/labschool', '/labschool/'])('serlo.org%s', async (path) => {
  const response = await handleUrl(`https://de.serlo.local${path}`)

  expectToBeRedirectTo(response, 'https://labschool.serlo.local/', 301)
})

test.each(['/hochschule', '/hochschule/'])('serlo.org%s', async (path) => {
  const response = await handleUrl(`https://de.serlo.local${path}`)

  const target = 'https://de.serlo.local/mathe/universitaet/44323'
  expectToBeRedirectTo(response, target, 301)
})

test.each(['/beitreten', '/beitreten/'])('serlo.org%s', async (path) => {
  const response = await handleUrl(`https://de.serlo.local${path}`)

  const target =
    'https://docs.google.com/forms/d/e/1FAIpQLSdEoyCcDVP_G_-G_u642S768e_sxz6wO6rJ3tad4Hb9z7Slwg/viewform'
  expectToBeRedirectTo(response, target, 301)
})

test('serlo.org/*', async () => {
  const response = await handleUrl('https://serlo.local/foo')

  expectToBeRedirectTo(response, 'https://de.serlo.local/foo', 302)
})

test('www.serlo.org/*', async () => {
  const response = await handleUrl('https://www.serlo.local/foo')

  expectToBeRedirectTo(response, 'https://de.serlo.local/foo', 302)
})

describe('redirects to current path of an resource', () => {
  beforeEach(() => {
    givenUuid({
      id: 78337,
      __typename: 'Page',
      oldAlias: '/sexed',
      alias: '/sex-ed',
      instance: Instance.En,
    })
  })

  test('redirects when current path is different than target path', async () => {
    const response = await handleUrl('https://en.serlo.org/sexed')

    expectToBeRedirectTo(response, 'https://en.serlo.org/sex-ed', 301)
  })

  test('redirects when current instance is different than target instance', async () => {
    const response = await handleUrl('https://de.serlo.org/78337')

    expectToBeRedirectTo(response, 'https://en.serlo.org/sex-ed', 301)
  })

  test('no redirect when current path is different than given path and XMLHttpRequest', async () => {
    mockHttpGet('https://en.serlo.org/sexed', returnsText('article content'))

    const request = new Request('https://en.serlo.org/sexed', {
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
    const response = await handleRequest(request)

    expect(await response.text()).toBe('article content')
  })

  test('no redirect when current path is the same as given path', async () => {
    mockHttpGet('https://en.serlo.org/sex-ed', returnsText('article content'))

    const response = await handleUrl('https://en.serlo.org/sex-ed')

    expect(await response.text()).toBe('article content')
  })

  test('no redirect when requested entity has no alias', async () => {
    givenUuid({ id: 128620, __typename: 'ArticleRevision' })
    mockHttpGet('https://de.serlo.org/128620', returnsText('article content'))

    const response = await handleUrl('https://de.serlo.org/128620')

    expect(await response.text()).toBe('article content')
  })

  test('redirects to first course page when requested entity is empty', async () => {
    givenUuid({
      id: 61682,
      __typename: 'Course',
      alias:
        '/mathe/zahlen-gr%C3%B6%C3%9Fen/zahlenmengen%2C-rechenausdr%C3%BCcke-allgemeine-rechengesetze/zahlen/zahlenmengen-zahlengerade/ganze-zahlen',
      pages: [
        {
          alias:
            '/mathe/zahlen-gr%C3%B6%C3%9Fen/zahlenmengen%2C-rechenausdr%C3%BCcke-allgemeine-rechengesetze/zahlen/zahlenmengen-zahlengerade/ganze-zahlen/%C3%9Cbersicht',
        },
        {
          alias:
            '/mathe/zahlen-gr%C3%B6%C3%9Fen/zahlenmengen%2C-rechenausdr%C3%BCcke-allgemeine-rechengesetze/zahlen/zahlenmengen-zahlengerade/ganze-zahlen/negative-zahlen-alltag',
        },
      ],
    })

    const response = await handleUrl('https://de.serlo.org/61682')

    expectToBeRedirectTo(
      response,
      'https://de.serlo.org/mathe/zahlen-gr%C3%B6%C3%9Fen/zahlenmengen%2C-rechenausdr%C3%BCcke-allgemeine-rechengesetze/zahlen/zahlenmengen-zahlengerade/ganze-zahlen/%C3%9Cbersicht',
      301
    )
  })

  test('redirects to alias of course when list of course pages is empty', async () => {
    // TODO: Find an empty course at serlo.org
    givenUuid({
      id: 42,
      __typename: 'Course',
      alias: '/course',
      pages: [],
    })

    const response = await handleUrl('https://en.serlo.org/42')

    expectToBeRedirectTo(response, 'https://en.serlo.org/course', 301)
  })

  test('no redirect when current path cannot be requested', async () => {
    givenApi(returnsMalformedJson())

    mockHttpGet('https://en.serlo.org/path', returnsText('article content'))

    const response = await handleUrl('https://en.serlo.org/path')

    expect(await response.text()).toBe('article content')
  })

  test('handles URL encodings correctly', async () => {
    givenUuid({
      __typename: 'TaxonomyTerm',
      alias: '/mathe/zahlen-größen/größen-einheiten',
    })
    mockHttpGet(
      'https://de.serlo.org/mathe/zahlen-gr%C3%B6%C3%9Fen',
      returnsText('article content')
    )

    const response = await handleUrl('https://de.serlo.org/mathe/zahlen-größen')

    expect(await response.text()).toBe('article content')
  })
})

async function handleUrl(url: string): Promise<Response> {
  return await handleRequest(new Request(url))
}
