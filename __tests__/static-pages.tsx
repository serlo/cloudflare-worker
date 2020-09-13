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
import { render, RenderResult } from '@testing-library/preact'
import { h } from 'preact'

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
  serverMock,
  returnResponseJson,
  returnResponseText,
} from './_helper'

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
      serverMock(
        'https://example.org/imprint.html',
        returnResponseText('<p>Hello World</p>')
      )

      const response = (await testHandleRequest(url))!

      expectHasOkStatus(response)
      expectContentTypeIsHtml(response)
      await expectContainsText(response, ['<p>Hello World</p>'])
    })
  })

  test('returns unrevised page response at /terms (markdown specification)', async () => {
    serverMock(
      'https://example.org/terms.md',
      returnResponseText('# Terms of Use')
    )

    const url = 'https://de.serlo.org/terms'
    const response = (await testHandleRequest(url))!

    expectHasOkStatus(response)
    expectContentTypeIsHtml(response)
    await expectContainsText(response, ['<h1>Terms of Use</h1>'])
  })

  test('returns current revision for requests at /privacy', async () => {
    const url = 'https://de.serlo.org/privacy/'
    serverMock(
      'http://example.org/privacy-current',
      returnResponseText('<p>Hello</p>')
    )

    const response = (await testHandleRequest(url))!

    expectHasOkStatus(response)
    expectContentTypeIsHtml(response)
    await expectContainsText(response, [
      '<p>Hello</p>',
      'wirksam ab dem 12/11/2020',
    ])
  })

  test('returns archived revision for requests at /privacy/archive/<id>', async () => {
    serverMock(
      'http://example.org/privacy-old',
      returnResponseText('<p>Hello</p>')
    )

    const url = 'https://de.serlo.org/privacy/archive/1999-10-09'
    const response = (await testHandleRequest(url)) as Response

    expectHasOkStatus(response)
    expectContentTypeIsHtml(response)
    await expectContainsText(response, [
      '<p>Hello</p>',
      'wirksam ab dem 10/9/1999',
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
      '10/9/1999',
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

  describe('returns null if requested domain is no serlo language tenant', () => {
    test.each([
      'https://stats.serlo.org/',
      'https://stats.fr.serlo.org/',
      'http://serlo.org',
      'http://gg.serlo.org/',
      'http://deserlo.org/imprint',
    ])('URL is %p', async (url) => {
      expect(await testHandleRequest(url)).toBeNull()
    })
  })

  describe('returns null if requested path does not belong to static pages', () => {
    test.each([
      'https://en.serlo.org/imprint/foo',
      'https://fr.serlo.org/foo/imprint',
      'https://de.serlo.org/imprint/json',
      'https://de.serlo.org/privacy/jsons',
    ])(' URL is %p', async (url) => {
      expect(await testHandleRequest(url)).toBeNull()
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
      serverMock('http://example.org/imprint.md', returnResponseJson(''))

      expect(await fetchContent(exampleSpecMarkdown)).toEqual({
        lang: 'de',
        title: 'Imprint',
        content: '<h1>Hello World</h1>',
        url: 'http://example.org/imprint.md',
      })
    })

    test('returns response content when url does not end with `.md`', async () => {
      serverMock(
        'http://example.org/',
        returnResponseText('<h1>Hello World</h1>')
      )

      expect(await fetchContent(exampleSpec)).toEqual({
        lang: 'en',
        title: 'Imprint',
        content: '<h1>Hello World</h1>',
        url: 'http://example.org/',
      })
    })

    describe('returned HTML is sanitized', () => {
      test('HTML response', async () => {
        serverMock(
          'http://example.org/',
          returnResponseJson('<h1>Hello World</h1>')
        )

        expect(await fetchContent(exampleSpec)).toEqual({
          lang: 'en',
          title: 'Imprint',
          content: '<h1>Hello World</h1>',
          url: 'http://example.org/',
        })
      })

      test('Markdown response', async () => {
        serverMock('http://example.org/imprint.md', returnResponseJson(''))

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
      serverMock(
        'http://example.org/',
        returnResponseJson('Click <a href="javascript:gaOptout();">here</a>')
      )

      expect(await fetchContent(exampleSpec)).toEqual({
        lang: 'en',
        title: 'Imprint',
        content: 'Click <a href="javascript:gaOptout();">here</a>',
        url: 'http://example.org/',
      })
    })

    test('Markdown response', async () => {
      serverMock(
        'http://example.org/imprint.md',
        returnResponseJson(
          '<p>Click <a href="javascript:gaOptout();">here</a></p>'
        )
      )

      expect(await fetchContent(exampleSpecMarkdown)).toEqual({
        lang: 'de',
        title: 'Imprint',
        content: '<p>Click <a href="javascript:gaOptout();">here</a></p>',
        url: 'http://example.org/imprint.md',
      })
    })
  })

  describe('returns null when request on the url of the spec fails', () => {
    test.each([301, 404, 500])('status code %p', async () => {
      //async (code) => {
      serverMock('http://example.org/', returnResponseText(''))

      //mockFetch({ 'http://example.org/': new Response('', { status: code }) })

      expect(await fetchContent(exampleSpec)).toBeNull()
    })
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
