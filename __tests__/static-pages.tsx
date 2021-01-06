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
import { render, RenderResult } from '@testing-library/preact'
import { h } from 'preact'

import { handleRequest } from '../src'
import {
  UnrevisedConfig,
  RevisedConfig,
  RevisedType,
  UnrevisedType,
  staticPages,
  getPage,
  getRevisions,
  findRevisionById,
  RevisedSpec,
  fetchContent,
  Page,
  UnrevisedPage,
  RevisedPage,
  RevisionsOverview,
} from '../src/static-pages'
import { Instance } from '../src/utils'
import {
  expectIsNotFoundResponse,
  expectIsJsonResponse,
  expectHasOkStatus,
  expectContainsText,
  expectContentTypeIsHtml,
  mockHttpGet,
  returnsText,
  hasInternalServerError,
  setupProbabilityFor,
  Backend,
  fetchTestEnvironment,
} from './__utils__'

describe('serlo.org/terms', () => {
  test('is in German at de.serlo.org/terms', async () => {
    mockLegalPage('de/terms.md', 'Informationen für Weiternutzer')

    const response = await fetchTestEnvironment({
      subdomain: 'de',
      pathname: '/terms',
    })

    expect(await response.text()).toEqual(
      expect.stringContaining('Informationen für Weiternutzer')
    )
  })
})

function mockLegalPage(path: string, text: string) {
  mockHttpGet(
    `https://raw.githubusercontent.com/serlo/serlo.org-legal/master/${path}`,
    returnsText(text)
  )
}

describe('handleRequest()', () => {
  const unrevisedConfig: UnrevisedConfig = {
    en: {
      imprint: { url: 'https://example.org/imprint.html' },
    },
    de: {
      terms: { url: 'https://example.org/terms.md' },
    },
  }

  const revisedConfig: RevisedConfig = {
    fr: { privacy: [] },
    de: {
      privacy: [
        { url: 'http://example.org/privacy-current', revision: '2020-12-11' },
        { url: 'http://example.org/privacy-old', revision: '1999-10-09' },
      ],
    },
  }

  async function testHandleRequest(url: string): Promise<Response | null> {
    return staticPages(new Request(url), unrevisedConfig, revisedConfig)
  }

  describe('returns unrevised page response at /imprint (html specification)', () => {
    test.each([
      'https://en.serlo.org/imprint/',
      'https://de.serlo.org/imprint',
      'https://fr.serlo.org/imprint/',
    ])('URL is %p', async (url) => {
      mockHttpGet(
        'https://example.org/imprint.html',
        returnsText('<p>Hello World</p>')
      )

      const response = (await testHandleRequest(url))!

      expectHasOkStatus(response)
      expectContentTypeIsHtml(response)
      await expectContainsText(response, ['<p>Hello World</p>'])
    })
  })

  test('returns unrevised page response at /terms (markdown specification)', async () => {
    mockHttpGet('https://example.org/terms.md', returnsText('# Terms of Use'))

    const url = 'https://de.serlo.org/terms'
    const response = (await testHandleRequest(url))!

    expectHasOkStatus(response)
    expectContentTypeIsHtml(response)
    await expectContainsText(response, ['<h1>Terms of Use</h1>'])
  })

  test('returns current revision for requests at /privacy', async () => {
    const url = 'https://de.serlo.org/privacy/'
    mockHttpGet(
      'http://example.org/privacy-current',
      returnsText('<p>Hello</p>')
    )

    const response = (await testHandleRequest(url))!

    expectHasOkStatus(response)
    expectContentTypeIsHtml(response)
    await expectContainsText(response, [
      '<p>Hello</p>',
      'wirksam ab dem 11.12.2020',
    ])
  })

  test('returns archived revision for requests at /privacy/archive/<id>', async () => {
    mockHttpGet('http://example.org/privacy-old', returnsText('<p>Hello</p>'))

    const url = 'https://de.serlo.org/privacy/archive/1999-10-09'
    const response = (await testHandleRequest(url)) as Response

    expectHasOkStatus(response)
    expectContentTypeIsHtml(response)
    await expectContainsText(response, [
      '<p>Hello</p>',
      'wirksam ab dem 9.10.1999',
    ])
  })

  test('returns overview of revisions for requests at /privacy/archive', async () => {
    const url = 'https://de.serlo.org/privacy/archive'
    const response = (await testHandleRequest(url)) as Response

    expectHasOkStatus(response)
    expectContentTypeIsHtml(response)
    await expectContainsText(response, [
      '<h1>Aktualisierungen: Datenschutzerklärung</h1>',
      'Aktuelle Version',
      '9.10.1999',
    ])
  })

  test('returns list of revision ids for requests at /privacy/json', async () => {
    const url = 'https://de.serlo.org/privacy/json'
    const response = (await testHandleRequest(url)) as Response
    await expectIsJsonResponse(response, ['2020-12-11', '1999-10-09'])
  })

  describe('returns 404 reponse if requested page and its default is not configured', () => {
    test.each([
      'http://en.serlo.org/terms/',
      'https://fr.serlo.org/terms',
      'http://en.serlo.org/privacy/',
      'https://fr.serlo.org/privacy',
      'https://en.serlo.org/privacy/archive',
      'http://fr.serlo.org/privacy/archive/',
      'https://fr.serlo.org/privacy/json',
      'https://en.serlo.org/privacy/json',
      'http://de.serlo.org/privacy/archive/2020-01-01',
      'http://de.serlo.org/privacy/archive/1999-33-55',
    ])('URL is %p', async (url) => {
      await expectIsNotFoundResponse((await testHandleRequest(url)) as Response)
    })
  })

  describe('requests to paths which do not belong to static pages go to default backend', () => {
    test.each([
      'https://en.serlo.org/imprint/foo',
      'https://fr.serlo.org/foo/imprint',
      'https://de.serlo.org/imprint/json',
      'https://de.serlo.org/privacy/jsons',
    ])(' URL is %p', async (url) => {
      setupProbabilityFor(Backend.Legacy)
      mockHttpGet(url, returnsText('content'))

      const response = await handleRequest(new Request(url))

      expect(await response.text()).toBe('content')
    })
  })
})

test('UnrevisedPage()', () => {
  const html = render(
    <UnrevisedPage
      page={{
        lang: Instance.De,
        title: 'Imprint',
        content: '<p>Hello World</p>',
        url: '',
      }}
    />
  )

  hasLangAttribute(html, 'de')

  expect(html.getByText('Imprint', { selector: 'h1' })).toBeVisible()
  expect(html.getByText('Hello World')).toBeVisible()
})

test('RevisedPage()', () => {
  const html = render(
    <RevisedPage
      page={{
        lang: Instance.En,
        revision: '2019-01-02',
        revisionDate: new Date('2019-01-02'),
        title: 'Privacy',
        content: '<p>Hello World</p>',
        url: '',
        isCurrentRevision: true,
        revisedType: 'privacy',
      }}
    />
  )

  hasLangAttribute(html, 'en')

  expect(html.getByText('Privacy', { selector: 'h1' })).toBeVisible()
  expect(html.getByText('effective 1/2/2019')).toBeVisible()
  expect(html.getByText('Hello World')).toBeVisible()
})

test('RevisionsOverview()', () => {
  const html = render(
    <RevisionsOverview
      revisions={[
        {
          revision: '2020-02-03',
          revisionDate: new Date('2020-02-03'),
          title: 'Privacy',
          lang: Instance.En,
          url: '',
          revisedType: 'privacy',
          isCurrentRevision: true,
        },
        {
          revision: '1999-12-07',
          revisionDate: new Date('1999-12-07'),
          title: 'Privacy',
          lang: Instance.En,
          url: '',
          revisedType: 'privacy',
          isCurrentRevision: false,
        },
      ]}
    />
  )

  hasLangAttribute(html, 'en')

  expect(html.getByText('Updates: Privacy', { selector: 'h1' })).toBeVisible()
  expect(html.getByText('current version')).toBeVisible()
  expect(html.getByText('12/7/1999')).toBeVisible()

  expect(html.getByText('current version')).toHaveAttribute(
    'href',
    '/privacy/archive/2020-02-03'
  )
  expect(html.getByText('12/7/1999')).toHaveAttribute(
    'href',
    '/privacy/archive/1999-12-07'
  )
})

describe('fetchContent()', () => {
  const exampleSpec: Page = {
    lang: Instance.En,
    title: 'Imprint',
    url: 'http://example.org/',
  }
  const exampleSpecMarkdown: Page = {
    lang: Instance.De,
    title: 'Imprint',
    url: 'http://example.org/imprint.md',
  }

  describe('returns page when url can be resolved', () => {
    test('parses reponse as Markdown if url ends with `.md`', async () => {
      mockHttpGet('http://example.org/imprint.md', returnsText('# Hello World'))

      expect(await fetchContent(exampleSpecMarkdown)).toEqual({
        lang: 'de',
        title: 'Imprint',
        content: '<h1>Hello World</h1>',
        url: 'http://example.org/imprint.md',
      })
    })

    test('returns response content when url does not end with `.md`', async () => {
      mockHttpGet('http://example.org/', returnsText('<h1>Hello World</h1>'))

      expect(await fetchContent(exampleSpec)).toEqual({
        lang: 'en',
        title: 'Imprint',
        content: '<h1>Hello World</h1>',
        url: 'http://example.org/',
      })
    })

    describe('returned HTML is sanitized', () => {
      test('HTML response', async () => {
        mockHttpGet(
          'http://example.org/',
          returnsText('<h1>Hello World</h1><script>alert(42)</script>')
        )

        expect(await fetchContent(exampleSpec)).toEqual({
          lang: 'en',
          title: 'Imprint',
          content: '<h1>Hello World</h1>',
          url: 'http://example.org/',
        })
      })

      test('Markdown response', async () => {
        mockHttpGet(
          'http://example.org/imprint.md',
          returnsText('Hello\n<iframe src="http://serlo.org/">')
        )

        expect(await fetchContent(exampleSpecMarkdown)).toEqual({
          lang: 'de',
          title: 'Imprint',
          content: '<p>Hello</p>',
          url: 'http://example.org/imprint.md',
        })
      })
    })
  })

  describe('support for JS-GOOGLE-ANALYTICS-DEACTIVATE', () => {
    test('HTML response', async () => {
      mockHttpGet(
        'http://example.org/',
        returnsText('Click <a href="JS-GOOGLE-ANALYTICS-DEACTIVATE">here</a>')
      )

      expect(await fetchContent(exampleSpec)).toEqual({
        lang: 'en',
        title: 'Imprint',
        content: 'Click <a href="javascript:gaOptout();">here</a>',
        url: 'http://example.org/',
      })
    })

    test('Markdown response', async () => {
      mockHttpGet(
        'http://example.org/imprint.md',
        returnsText('Click [here](JS-GOOGLE-ANALYTICS-DEACTIVATE)')
      )

      expect(await fetchContent(exampleSpecMarkdown)).toEqual({
        lang: 'de',
        title: 'Imprint',
        content: '<p>Click <a href="javascript:gaOptout();">here</a></p>',
        url: 'http://example.org/imprint.md',
      })
    })
  })

  test('returns null when request on the url of the spec fails', async () => {
    mockHttpGet('http://example.org/', hasInternalServerError())

    expect(await fetchContent(exampleSpec)).toBeNull()
  })
})

describe('findRevisionById()', () => {
  const revs: RevisedSpec[] = [
    { revision: '2020-01-01', url: '1' },
    { revision: '1999-12-31', url: '2' },
    { revision: '2020-01-01', url: '3' },
  ]

  test('returns first found revision with given id', () => {
    expect(findRevisionById(revs, '2020-01-01')).toEqual({
      revision: '2020-01-01',
      url: '1',
    })
    expect(findRevisionById(revs, '1999-12-31')).toEqual({
      revision: '1999-12-31',
      url: '2',
    })
  })

  test('returns null if no revision has given id', () => {
    expect(findRevisionById(revs, '2020-00-01')).toBeNull()
    expect(findRevisionById(revs, '1999-11-31')).toBeNull()
  })
})

describe('getRevisions()', () => {
  const englishRevisions = [
    { url: 'bar', revision: '1995-12-17' },
    { url: 'w.md', revision: '2009-12-17' },
  ]
  const exampleSpec: RevisedConfig = {
    en: { privacy: englishRevisions },
    fr: { privacy: [] },
  }

  const target = [
    {
      url: 'bar',
      lang: 'en',
      revision: '1995-12-17',
      revisionDate: new Date('1995-12-17'),
      title: '#privacy#',
      revisedType: 'privacy',
      isCurrentRevision: true,
    },
    {
      url: 'w.md',
      lang: 'en',
      revision: '2009-12-17',
      revisionDate: new Date('2009-12-17'),
      title: '#privacy#',
      revisedType: 'privacy',
      isCurrentRevision: false,
    },
  ]

  test('returns revisions if they exist in config', () => {
    expect(
      getRevisions(exampleSpec, Instance.En, RevisedType.Privacy, getTitle)
    ).toEqual(target)
  })

  test('returns revisions of default language if requested one does not exist', () => {
    expect(
      getRevisions(exampleSpec, Instance.Fr, RevisedType.Privacy, getTitle)
    ).toEqual(target)
  })

  test('returns null if requested and default revisions do not exist', () => {
    expect(
      getRevisions({}, Instance.En, RevisedType.Privacy, getTitle)
    ).toBeNull()

    expect(
      getRevisions(
        { de: { privacy: [] } },
        Instance.Fr,
        RevisedType.Privacy,
        getTitle
      )
    ).toBeNull()
  })
})

describe('getPage()', () => {
  const exampleConfig: UnrevisedConfig = {
    en: { imprint: { url: 'http://e/' } },
    de: { imprint: { url: 'http://g/' }, terms: { url: 'ftp://gt/' } },
  }

  test('returns Spec when it exists', () => {
    expect(
      getPage(exampleConfig, Instance.En, UnrevisedType.Imprint, getTitle)
    ).toEqual({
      url: 'http://e/',
      lang: 'en',
      title: '#imprint#',
    })

    expect(
      getPage(exampleConfig, Instance.De, UnrevisedType.Imprint, getTitle)
    ).toEqual({
      url: 'http://g/',
      lang: 'de',
      title: '#imprint#',
    })

    expect(
      getPage(exampleConfig, Instance.De, UnrevisedType.Terms, getTitle)
    ).toEqual({
      url: 'ftp://gt/',
      lang: 'de',
      title: '#terms#',
    })
  })

  test('returns English version when requested Spec does not exist', () => {
    expect(
      getPage(exampleConfig, Instance.Fr, UnrevisedType.Imprint, getTitle)
    ).toEqual({
      url: 'http://e/',
      lang: 'en',
      title: '#imprint#',
    })
  })

  test('returns null when no Spec or English Spec can be found', () => {
    expect(getPage(exampleConfig, Instance.Fr, UnrevisedType.Terms)).toBeNull()
    expect(getPage(exampleConfig, Instance.En, UnrevisedType.Terms)).toBeNull()
  })
})

function getTitle(typeName: RevisedType | UnrevisedType): string {
  return '#' + typeName + '#'
}

function hasLangAttribute(html: RenderResult, lang: string): void {
  const htmlElement = html.getByText(/.*/, { selector: 'html' })
  expect(htmlElement).toHaveAttribute('lang', lang)
}
