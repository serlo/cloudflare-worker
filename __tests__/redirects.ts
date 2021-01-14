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
  expectIsNotFoundResponse,
  expectToBeRedirectTo,
  givenApi,
  givenUuid,
  returnsMalformedJson,
  expectContainsText,
  fetchTestEnvironment,
  createUrl,
  fetchLocally,
  TestEnvironment,
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
  ])('meet.serlo.org%s', async (pathname, googleMeetRoom) => {
    const response = await fetchTestEnvironment({ subdomain: 'meet', pathname })

    const target = `https://meet.google.com${googleMeetRoom}`
    expectToBeRedirectTo(response, target, 302)
  })

  test('returns 404 when meet room is not defined', async () => {
    const response = await fetchTestEnvironment({
      subdomain: 'meet',
      pathname: '/foo',
    })

    await expectIsNotFoundResponse(response)
  })
})

test('de.serlo.org/datenschutz', async () => {
  const response = await fetchTestEnvironment({
    subdomain: 'de',
    pathname: '/datenschutz',
  })

  const target = 'https://de.serlo.org/privacy'
  expectToBeRedirectTo(response, target, 301)
})

test('de.serlo.org/impressum', async () => {
  const response = await fetchTestEnvironment({
    subdomain: 'de',
    pathname: '/impressum',
  })

  const target = 'https://de.serlo.org/imprint'
  expectToBeRedirectTo(response, target, 301)
})

test('de.serlo.org/nutzungsbedingungen ', async () => {
  const response = await fetchTestEnvironment({
    subdomain: 'de',
    pathname: '/nutzungsbedingungen',
  })

  const target = 'https://de.serlo.org/terms'
  expectToBeRedirectTo(response, target, 301)
})

test('start.serlo.org', async () => {
  const response = await fetchTestEnvironment({ subdomain: 'start' })

  const target =
    'https://docs.google.com/document/d/1qsgkXWNwC-mcgroyfqrQPkZyYqn7m1aimw2gwtDTmpM/'
  expectToBeRedirectTo(response, target, 301)
})

test.each(['/labschool', '/labschool/'])(
  'de.serlo.org%s redirects to labschool homepage',
  async (pathname) => {
    const response = await fetchTestEnvironment({ subdomain: 'de', pathname })

    expectToBeRedirectTo(response, createUrl({ subdomain: 'labschool' }), 301)
  }
)

test.each(['/hochschule', '/hochschule/'])(
  'de.serlo.org%s redirects to taxonomy term of higher education',
  async (pathname) => {
    const response = await fetchTestEnvironment({ subdomain: 'de', pathname })

    const target = createUrl({
      subdomain: 'de',
      pathname: '/mathe/universitaet/44323',
    })
    expectToBeRedirectTo(response, target, 301)
  }
)

test.each(['/beitreten', '/beitreten/'])(
  'de.serlo.org%s redirects to form for joining Serlo Education e.V.',
  async (pathname) => {
    const response = await fetchTestEnvironment({ subdomain: 'de', pathname })

    const target =
      'https://docs.google.com/forms/d/e/1FAIpQLSdEoyCcDVP_G_-G_u642S768e_sxz6wO6rJ3tad4Hb9z7Slwg/viewform'
    expectToBeRedirectTo(response, target, 301)
  }
)

test('serlo.org/* redirects to de.serlo.org/*', async () => {
  const response = await fetchTestEnvironment({ pathname: '/foo' })

  const target = createUrl({ subdomain: 'de', pathname: '/foo' })
  expectToBeRedirectTo(response, target, 302)
})

test('www.serlo.org/* redirects to de.serlo.org/*', async () => {
  const response = await fetchTestEnvironment({
    subdomain: 'www',
    pathname: '/foo',
  })

  const target = createUrl({ subdomain: 'de', pathname: '/foo' })
  expectToBeRedirectTo(response, target, 302)
})

describe('redirects to current path of an resource', () => {
  beforeEach(() => {
    givenUuid({
      id: 78337,
      __typename: 'Page',
      oldAlias: '/sexed',
      alias: '/78337/sex-education',
      content: 'Sex Education',
      instance: Instance.En,
    })
  })

  test('redirects when current path is different than target path', async () => {
    const response = await fetchTestEnvironment({
      subdomain: 'en',
      pathname: '/sexed',
    })

    const target = createUrl({
      subdomain: 'en',
      pathname: '/78337/sex-education',
    })
    expectToBeRedirectTo(response, target, 301)
  })

  test('redirects when current instance is different than target instance', async () => {
    const response = await fetchTestEnvironment({
      subdomain: 'de',
      pathname: '/78337',
    })

    const target = createUrl({
      subdomain: 'en',
      pathname: '/78337/sex-education',
    })
    expectToBeRedirectTo(response, target, 301)
  })

  test('no redirect when current path is different than given path and XMLHttpRequest', async () => {
    const response = await fetchTestEnvironment(
      { subdomain: 'en', pathname: '/sexed' },
      { headers: { 'X-Requested-With': 'XMLHttpRequest' } }
    )

    await expectContainsText(response, ['Sex Education'])
  })

  test('no redirect when current path is the same as given path', async () => {
    const response = await fetchTestEnvironment({
      subdomain: 'en',
      pathname: '/78337/sex-education',
    })

    await expectContainsText(response, ['Sex Education'])
  })

  test('no redirect when requested entity has no alias', async () => {
    givenUuid({
      id: 27778,
      __typename: 'Comment',
      content: 'Applets vertauscht?',
    })

    const response = await fetchTestEnvironment({
      subdomain: 'de',
      pathname: '/27778',
    })

    await expectContainsText(response, ['Applets vertauscht'])
  })

  test('redirects to first course page when requested entity is a course', async () => {
    givenUuid({
      id: 61682,
      __typename: 'Course',
      alias: 'course-alias',
      pages: [
        { alias: '/mathe/61911/%C3%9Cbersicht' },
        { alias: '/mathe/61686/negative-zahlen-im-alltag' },
      ],
    })

    const response = await fetchTestEnvironment({
      subdomain: 'de',
      pathname: '/61682',
    })

    const target = createUrl({
      subdomain: 'de',
      pathname: '/mathe/61911/%C3%9Cbersicht',
    })
    expectToBeRedirectTo(response, target, 301)
  })

  test('redirects to exercise when requested entity is a solution', async () => {
    givenUuid({
      id: 57353,
      __typename: 'Solution',
      alias: '/mathe/57353/57353',
      exercise: { alias: '/mathe/57351/57351' },
    })

    const response = await fetchTestEnvironment({
      subdomain: 'de',
      pathname: '/57353',
    })

    const target = createUrl({
      subdomain: 'de',
      pathname: '/mathe/57351/57351',
    })
    expectToBeRedirectTo(response, target, 301)
  })

  test('redirects to alias of course when list of course pages is empty', async () => {
    // TODO: Find an empty course at serlo.org
    givenUuid({
      id: 42,
      __typename: 'Course',
      alias: '/course',
      pages: [],
    })

    const response = await fetchLocally({ subdomain: 'en', pathname: '/42' })

    const target = createUrl({
      subdomain: 'en',
      pathname: '/course',
      environment: TestEnvironment.Local,
    })
    expectToBeRedirectTo(response, target, 301)
  })

  test('no redirect when current path cannot be requested', async () => {
    givenApi(returnsMalformedJson())
    givenUuid({
      __typename: 'Article',
      alias: '/path',
      content: 'article content',
      instance: Instance.En,
    })

    const response = await fetchLocally({ subdomain: 'en', pathname: '/path' })

    await expectContainsText(response, ['article content'])
  })

  test('handles URL encodings correctly', async () => {
    givenUuid({
      id: 1385,
      __typename: 'TaxonomyTerm',
      alias: '/mathe/1385/zahlen-und-größen',
      instance: Instance.De,
      content: 'Zahlen und Größen',
    })

    const response = await fetchTestEnvironment({
      subdomain: 'de',
      pathname: '/mathe/1385/zahlen-und-größen',
    })

    await expectContainsText(response, ['Zahlen und Größen'])
  })
})
