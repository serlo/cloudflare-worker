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
import { render } from '@testing-library/preact'
import { h } from 'preact'

import {
  UnrevisedConfig,
  RevisedConfig,
  RevisedType,
  UnrevisedType,
  handleRequest,
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
import { LanguageCode } from '../src/utils'
import {
  isNotFoundResponse,
  isJsonResponse,
  hasOkStatus,
  containsText,
  contentTypeIsHtml,
  withMockedFetch,
} from './utils'

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
        { url: 'http://example.org/1', revision: '2020-12-11' },
        { url: 'http://example.org/2', revision: '1999-10-09' },
      ],
    },
  }

  async function testHandleRequest(url: string): Promise<Response | null> {
    return handleRequest(new Request(url), unrevisedConfig, revisedConfig)
  }

  describe('returns unrevised page response at /imprint (html specification)', () => {
    test.each([
      'https://en.serlo.org/imprint/',
      'https://de.serlo.org/imprint',
      'https://fr.serlo.org/imprint/',
    ])('URL is %p', async (url) => {
      await withMockedFetch('<p>Hello World</p>', async () => {
        const response = (await testHandleRequest(url)) as Response

        hasOkStatus(response)
        contentTypeIsHtml(response)
        await containsText(response, ['<p>Hello World</p>'])
      })
    })
  })

  test('returns unrevised page response at /terms (markdown specification)', async () => {
    await withMockedFetch('# Terms of Use', async () => {
      const url = 'https://de.serlo.org/terms'
      const response = (await testHandleRequest(url)) as Response

      hasOkStatus(response)
      contentTypeIsHtml(response)
      await containsText(response, ['<h1>Terms of Use</h1>'])
    })
  })

  test('returns current revision for requests at /privacy', async () => {
    await withMockedFetch('<p>Hello</p>', async () => {
      const url = 'https://de.serlo.org/privacy/'
      const response = (await testHandleRequest(url)) as Response

      hasOkStatus(response)
      contentTypeIsHtml(response)
      await containsText(response, [
        '<p>Hello</p>',
        'wirksam ab dem 12/11/2020',
      ])
    })
  })

  test('returns archived revision for requests at /privacy/archive/<id>', async () => {
    await withMockedFetch('<p>Hello</p>', async () => {
      const url = 'https://de.serlo.org/privacy/archive/1999-10-09'
      const response = (await testHandleRequest(url)) as Response

      hasOkStatus(response)
      contentTypeIsHtml(response)
      await containsText(response, ['<p>Hello</p>', 'wirksam ab dem 10/9/1999'])
    })
  })

  test('returns overview of revisions for requests at /privacy/archive', async () => {
    const url = 'https://de.serlo.org/privacy/archive'
    const response = (await testHandleRequest(url)) as Response

    hasOkStatus(response)
    contentTypeIsHtml(response)
    await containsText(response, [
      '<h1>Aktualisierungen: Datenschutzerklärung</h1>',
      'Aktuelle Version',
      '10/9/1999',
    ])
  })

  test('returns list of revision ids for requests at /privacy/json', async () => {
    const url = 'https://de.serlo.org/privacy/json'
    const response = (await testHandleRequest(url)) as Response

    isJsonResponse(response, ['2020-12-11', '1999-10-09'])
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
      await isNotFoundResponse((await testHandleRequest(url)) as Response)
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
        lang: LanguageCode.De,
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
        lang: LanguageCode.En,
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
          lang: LanguageCode.En,
          url: '',
          revisedType: 'privacy',
          isCurrentRevision: true,
        },
        {
          revision: '1999-12-07',
          revisionDate: new Date('1999-12-07'),
          title: 'Privacy',
          lang: LanguageCode.En,
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
    lang: LanguageCode.En,
    title: 'Imprint',
    url: 'http://example.org/',
  }
  const exampleSpecMarkdown: Page = {
    lang: LanguageCode.De,
    title: 'Imprint',
    url: 'http://example.org/imprint.md',
  }

  describe('returns page when url can be resolved', () => {
    test('parses reponse as Markdown if url ends with `.md`', async () => {
      await withMockedFetch('# Hello World', async () => {
        expect(await fetchContent(exampleSpecMarkdown)).toEqual({
          lang: 'de',
          title: 'Imprint',
          content: '<h1>Hello World</h1>',
          url: 'http://example.org/imprint.md',
        })
      })
    })

    test('returns response content when url does not end with `.md`', async () => {
      await withMockedFetch('<h1>Hello World</h1>', async () => {
        expect(await fetchContent(exampleSpec)).toEqual({
          lang: 'en',
          title: 'Imprint',
          content: '<h1>Hello World</h1>',
          url: 'http://example.org/',
        })
      })
    })

    describe('returned HTML is sanitized', () => {
      test('HTML response', async () => {
        await withMockedFetch(
          '<h1>Hello World</h1><script>alert(42)</script>',
          async () => {
            expect(await fetchContent(exampleSpec)).toEqual({
              lang: 'en',
              title: 'Imprint',
              content: '<h1>Hello World</h1>',
              url: 'http://example.org/',
            })
          }
        )
      })

      test('Markdown response', async () => {
        await withMockedFetch(
          'Hello\n<iframe src="http://serlo.org/">',
          async () => {
            expect(await fetchContent(exampleSpecMarkdown)).toEqual({
              lang: 'de',
              title: 'Imprint',
              content: '<p>Hello</p>',
              url: 'http://example.org/imprint.md',
            })
          }
        )
      })
    })
  })

  describe('support for __JS_GOOGLE_ANALYTICS_DEACTIVATE__', () => {
    test('HTML response', async () => {
      await withMockedFetch(
        'Click <a href="__JS_GOOGLE_ANALYTICS_DEACTIVATE__">here</a>',
        async () => {
          expect(await fetchContent(exampleSpec)).toEqual({
            lang: 'en',
            title: 'Imprint',
            content: 'Click <a href="javascript:gaOptout();">here</a>',
            url: 'http://example.org/',
          })
        }
      )
    })

    test('Markdown response', async () => {
      await withMockedFetch(
        'Click [here](__JS_GOOGLE_ANALYTICS_DEACTIVATE__)',
        async () => {
          expect(await fetchContent(exampleSpecMarkdown)).toEqual({
            lang: 'de',
            title: 'Imprint',
            content: '<p>Click <a href="javascript:gaOptout();">here</a></p>',
            url: 'http://example.org/imprint.md',
          })
        }
      )
    })
  })

  describe('support for MATOMO-OPT-OUT-FORM', () => {
    test('HTML response with English opt out', async () => {
      await withMockedFetch('<p>Opt out:</p> MATOMO-OPT-OUT-FORM', async () => {
        expect(await fetchContent(exampleSpec)).toEqual({
          lang: 'en',
          title: 'Imprint',
          content:
            '<p>Opt out:</p> <iframe style="width: 100%; height: 130px; border: none;" src="https://analytics.serlo-development.dev/index.php?module=CoreAdminHome&action=optOut&language=en&fontSize=16px&fontFamily=Open%20Sans,sans-serif"></iframe>',
          url: 'http://example.org/',
        })
      })
    })

    test('Markdown response with German opt out', async () => {
      await withMockedFetch('Opt out:\n\nMATOMO-OPT-OUT-FORM', async () => {
        expect(await fetchContent(exampleSpecMarkdown)).toEqual({
          lang: 'de',
          title: 'Imprint',
          content:
            '<p>Opt out:</p>\n<p><iframe style="width: 100%; height: 130px; border: none;" src="https://analytics.serlo-development.dev/index.php?module=CoreAdminHome&action=optOut&language=de&fontSize=16px&fontFamily=Open%20Sans,sans-serif"></iframe></p>',
          url: 'http://example.org/imprint.md',
        })
      })
    })
  })

  describe('returns null when request on the url of the spec fails', () => {
    test.each([301, 404, 500])('status code %p', async (code) => {
      await withMockedFetch(new Response('', { status: code }), async () => {
        expect(await fetchContent(exampleSpec)).toBeNull()
      })
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
      getRevisions(exampleSpec, LanguageCode.En, RevisedType.Privacy, getTitle)
    ).toEqual(target)
  })

  test('returns revisions of default language if requested one does not exist', () => {
    expect(
      getRevisions(exampleSpec, LanguageCode.Fr, RevisedType.Privacy, getTitle)
    ).toEqual(target)
  })

  test('returns null if requested and default revisions do not exist', () => {
    expect(
      getRevisions({}, LanguageCode.En, RevisedType.Privacy, getTitle)
    ).toBeNull()

    expect(
      getRevisions(
        { de: { privacy: [] } },
        LanguageCode.Fr,
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
      getPage(exampleConfig, LanguageCode.En, UnrevisedType.Imprint, getTitle)
    ).toEqual({
      url: 'http://e/',
      lang: 'en',
      title: '#imprint#',
    })

    expect(
      getPage(exampleConfig, LanguageCode.De, UnrevisedType.Imprint, getTitle)
    ).toEqual({
      url: 'http://g/',
      lang: 'de',
      title: '#imprint#',
    })

    expect(
      getPage(exampleConfig, LanguageCode.De, UnrevisedType.Terms, getTitle)
    ).toEqual({
      url: 'ftp://gt/',
      lang: 'de',
      title: '#terms#',
    })
  })

  test('returns English version when requested Spec does not exist', () => {
    expect(
      getPage(exampleConfig, LanguageCode.Fr, UnrevisedType.Imprint, getTitle)
    ).toEqual({
      url: 'http://e/',
      lang: 'en',
      title: '#imprint#',
    })
  })

  test('returns null when no Spec or English Spec can be found', () => {
    expect(
      getPage(exampleConfig, LanguageCode.Fr, UnrevisedType.Terms)
    ).toBeNull()
    expect(
      getPage(exampleConfig, LanguageCode.En, UnrevisedType.Terms)
    ).toBeNull()
  })
})

function getTitle(typeName: RevisedType | UnrevisedType): string {
  return '#' + typeName + '#'
}

function hasLangAttribute(html: ReturnType<typeof render>, lang: string): void {
  const htmlElement = html.getByText(/.*/, { selector: 'html' })
  expect(htmlElement).toHaveAttribute('lang', lang)
}
