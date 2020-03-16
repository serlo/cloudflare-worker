/**
 * This file is part of Serlo.org Cloudflare Worker.
 *
 * Copyright (c) 2013-2020 Serlo Education e.V.
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
 * @copyright Copyright (c) 2013-2020 Serlo Education e.V.
 * @license   http://www.apache.org/licenses/LICENSE-2.0 Apache License 2.0
 * @link     https://github.com/serlo/serlo.org-cloudflare-worker for the canonical source repository
 */
import {
  isNotFoundResponse,
  hasOkStatus,
  containsText,
  contentTypeIsHtml
} from './utils'
import * as StaticPage from '../src/static-pages'
import { render } from '@testing-library/preact'

describe('handleRequest()', () => {
  const unrevisedConfig: StaticPage.UnrevisedConfig = {
    en: {
      imprint: { url: 'https://example.org/imprint.html' }
    },
    de: {
      terms: { url: 'https://example.org/terms.md' }
    }
  }

  const revisedConfig: StaticPage.RevisedConfig = {
    fr: { privacy: [] },
    de: {
      privacy: [
        { url: 'http://example.org/1', revision: new Date(2020, 11, 11) },
        { url: 'http://example.org/2', revision: new Date(1999, 9, 9) }
      ]
    }
  }

  async function handleRequest(url: string): Promise<Response | null> {
    return StaticPage.handleRequest(
      new Request(url),
      unrevisedConfig,
      revisedConfig
    )
  }

  describe('returns unrevised page response at /imprint (html specification)', () => {
    test.each([
      'https://en.serlo.org/imprint/',
      'https://de.serlo.org/imprint',
      'https://fr.serlo.org/imprint/'
    ])('URL is %p', async url => {
      await withMockedFetch('<p>Hello World</p>', async () => {
        const response = (await handleRequest(url)) as Response

        hasOkStatus(response)
        contentTypeIsHtml(response)
        await containsText(response, ['<p>Hello World</p>'])
      })
    })
  })

  test('returns unrevised page response at /terms (markdown specification)', async () => {
    await withMockedFetch('# Terms of Use', async () => {
      const url = 'https://de.serlo.org/terms'
      const response = (await handleRequest(url)) as Response

      hasOkStatus(response)
      contentTypeIsHtml(response)
      await containsText(response, ['<h1>Terms of Use</h1>'])
    })
  })

  test('returns current revisision for requests at /privacy', async () => {
    await withMockedFetch('<p>Hello</p>', async () => {
      const url = 'https://de.serlo.org/privacy/'
      const response = (await handleRequest(url)) as Response

      hasOkStatus(response)
      contentTypeIsHtml(response)
      await containsText(response, [
        '<p>Hello</p>',
        '(Current version of 12/11/2020)'
      ])
    })
  })

  test('returns archived revision for requests at /privacy/archiv/<id>', async () => {
    await withMockedFetch('<p>Hello</p>', async () => {
      const url = 'https://de.serlo.org/privacy/archiv/1999-10-09'
      const response = (await handleRequest(url)) as Response

      hasOkStatus(response)
      contentTypeIsHtml(response)
      await containsText(response, [
        '<p>Hello</p>',
        '(Archived version of 10/9/1999)'
      ])
    })
  })

  test('returns overview of revisions for requests at /privacy/archiv', async () => {
    const url = 'https://de.serlo.org/privacy/archiv'
    const response = (await handleRequest(url)) as Response

    hasOkStatus(response)
    contentTypeIsHtml(response)
    await containsText(response, [
      '<h1>Versions: Privacy</h1>',
      '12/11/2020 (current version)',
      '10/9/1999'
    ])
  })

  test('returns list of revision ids for requests at /privacy/json', async () => {
    const url = 'https://de.serlo.org/privacy/json'
    const response = (await handleRequest(url)) as Response

    // TODO: test header type is JSON
    hasOkStatus(response)
    expect(await response.json()).toEqual(['2020-12-11', '1999-10-09'])
  })

  describe('returns 404 reponse if requested page and its default is not configured', () => {
    test.each([
      'http://en.serlo.org/terms/',
      'https://fr.serlo.org/terms',
      'http://en.serlo.org/privacy/',
      'https://fr.serlo.org/privacy',
      'https://en.serlo.org/privacy/archiv',
      'http://fr.serlo.org/privacy/archiv/',
      'https://fr.serlo.org/privacy/json',
      'https://en.serlo.org/privacy/json',
      'http://de.serlo.org/privacy/archiv/2020-01-01',
      'http://de.serlo.org/privacy/archiv/1999-33-55'
    ])('URL is %p', async url => {
      await isNotFoundResponse((await handleRequest(url)) as Response)
    })
  })

  describe('returns null if requested domain is no serlo language tenant', () => {
    test.each([
      'https://stats.serlo.org/',
      'https://stats.fr.serlo.org/',
      'http://serlo.org',
      'http://gg.serlo.org/',
      'http://en.serlo.com/imprint',
      'http://deserlo.org/imprint',
      'http://en.google.org/imprint'
    ])('URL is %p', async url => {
      expect(await handleRequest(url)).toBeNull()
    })
  })

  describe('returns null if requested path does not belong to static pages', () => {
    test.each([
      'https://en.serlo.org/imprint/foo',
      'https://fr.serlo.org/foo/imprint',
      'https://de.serlo.org/imprint/json',
      'https://de.serlo.org/privacy/jsons'
    ])(' URL is %p', async url => {
      expect(await handleRequest(url)).toBeNull()
    })
  })
})

test('UnrevisedPage()', () => {
  const html = render(
    StaticPage.UnrevisedPage({
      lang: 'de',
      title: 'Imprint',
      content: '<p>Hello World</p>',
      url: ''
    })
  )

  hasLangAttribute(html, 'de')

  expect(html.getByText('Imprint', { selector: 'h1' })).toBeVisible()
  expect(html.getByText('Hello World')).toBeVisible()
})

test('RevisedPage()', () => {
  const html = render(
    StaticPage.RevisedPage({
      lang: 'en',
      revision: new Date(2019, 0, 2),
      title: 'Privacy',
      content: '<p>Hello World</p>',
      url: '',
      isCurrentRevision: true,
      revisedType: 'privacy'
    })
  )

  hasLangAttribute(html, 'en')

  expect(html.getByText('Privacy', { selector: 'h1' })).toBeVisible()
  expect(html.getByText('(Current version of 1/2/2019)')).toBeVisible()
  expect(html.getByText('Hello World')).toBeVisible()
})

test('RevisionsOverview()', () => {
  const html = render(
    StaticPage.RevisionsOverview([
      {
        revision: new Date(2020, 1, 3),
        title: 'Privacy',
        lang: 'en',
        url: '',
        revisedType: 'privacy',
        isCurrentRevision: true
      },
      {
        revision: new Date(1999, 11, 7),
        title: 'Privacy',
        lang: 'en',
        url: '',
        revisedType: 'privacy',
        isCurrentRevision: false
      }
    ])
  )

  hasLangAttribute(html, 'en')

  expect(html.getByText('Versions: Privacy', { selector: 'h1' })).toBeVisible()
  expect(html.getByText('2/3/2020 (current version)')).toBeVisible()
  expect(html.getByText('12/7/1999')).toBeVisible()

  expect(html.getByText('2/3/2020 (current version)')).toHaveAttribute(
    'href',
    '/privacy/archiv/2020-02-03'
  )
  expect(html.getByText('12/7/1999')).toHaveAttribute(
    'href',
    '/privacy/archiv/1999-12-07'
  )
})

describe('fetchContent()', () => {
  const exampleSpec: StaticPage.Page = {
    lang: 'en',
    title: 'Imprint',
    url: 'http://example.org/'
  }
  const exampleSpecMarkdown: StaticPage.Page = {
    lang: 'de',
    title: 'Imprint',
    url: 'http://example.org/imprint.md'
  }

  describe('returns page when url can be resolved', () => {
    test('parses reponse as Markdown if url ends with `.md`', async () => {
      await withMockedFetch('# Hello World', async () => {
        expect(await StaticPage.fetchContent(exampleSpecMarkdown)).toEqual({
          lang: 'de',
          title: 'Imprint',
          content: '<h1>Hello World</h1>',
          url: 'http://example.org/imprint.md'
        })
      })
    })

    test('returns response content when url does not end with `.md`', async () => {
      await withMockedFetch('<h1>Hello World</h1>', async () => {
        expect(await StaticPage.fetchContent(exampleSpec)).toEqual({
          lang: 'en',
          title: 'Imprint',
          content: '<h1>Hello World</h1>',
          url: 'http://example.org/'
        })
      })
    })

    describe('returned HTML is sanitized', () => {
      test('HTML response', async () => {
        await withMockedFetch(
          '<h1>Hello World</h1><script>alert(42)</script>',
          async () => {
            expect(await StaticPage.fetchContent(exampleSpec)).toEqual({
              lang: 'en',
              title: 'Imprint',
              content: '<h1>Hello World</h1>',
              url: 'http://example.org/'
            })
          }
        )
      })

      test('Markdown response', async () => {
        await withMockedFetch(
          'Hello\n<iframe src="http://serlo.org/">',
          async () => {
            expect(await StaticPage.fetchContent(exampleSpecMarkdown)).toEqual({
              lang: 'de',
              title: 'Imprint',
              content: '<p>Hello</p>',
              url: 'http://example.org/imprint.md'
            })
          }
        )
      })
    })
  })

  describe('returns null when request on the url of the spec fails', () => {
    test.each([301, 404, 500])('status code %p', async code => {
      await withMockedFetch(new Response('', { status: code }), async () => {
        expect(await StaticPage.fetchContent(exampleSpec)).toBeNull()
      })
    })
  })
})

describe('findRevisionById()', () => {
  const revs: StaticPage.RevisedSpec[] = [
    { revision: new Date(2020, 0, 1), url: '1' },
    { revision: new Date(1999, 11, 31), url: '2' },
    { revision: new Date(2020, 0, 1), url: '3' }
  ]

  test('returns first found revision with given id', () => {
    expect(StaticPage.findRevisionById(revs, '2020-01-01')).toEqual({
      revision: new Date(2020, 0, 1),
      url: '1'
    })
    expect(StaticPage.findRevisionById(revs, '1999-12-31')).toEqual({
      revision: new Date(1999, 11, 31),
      url: '2'
    })
  })

  test('returns null if no revision has given id', () => {
    expect(StaticPage.findRevisionById(revs, '2020-00-01')).toBeNull()
    expect(StaticPage.findRevisionById(revs, '1999-11-31')).toBeNull()
  })
})

describe('getRevisionId()', () => {
  test.each([
    [new Date(2020, 0, 3), '2020-01-03'],
    [new Date(20, 8, 6), '1920-09-06'],
    [new Date(1988, 11, 11), '1988-12-11']
  ])('date %p', (date, id) => {
    expect(StaticPage.getRevisionId({ revision: date, url: '' })).toBe(id)
  })
})

describe('getRevisions()', () => {
  const englishRevisions = [
    { url: 'bar', revision: new Date(1995, 11, 17) },
    { url: 'w.md', revision: new Date(2009, 12, 17) }
  ]
  const exampleSpec: StaticPage.RevisedConfig = {
    en: { privacy: englishRevisions },
    fr: { privacy: [] }
  }

  const target = [
    {
      url: 'bar',
      lang: 'en',
      revision: new Date(1995, 11, 17),
      title: '#privacy#',
      revisedType: 'privacy',
      isCurrentRevision: true
    },
    {
      url: 'w.md',
      lang: 'en',
      revision: new Date(2009, 12, 17),
      title: '#privacy#',
      revisedType: 'privacy',
      isCurrentRevision: false
    }
  ]

  test('returns revisions if they exist in config', () => {
    expect(
      StaticPage.getRevisions(exampleSpec, 'en', 'privacy', getTitle)
    ).toEqual(target)
  })

  test('returns revisions of default language if requested one does not exist', () => {
    expect(
      StaticPage.getRevisions(exampleSpec, 'fr', 'privacy', getTitle)
    ).toEqual(target)
  })

  test('returns null if requested and default revisions do not exist', () => {
    expect(StaticPage.getRevisions({}, 'en', 'privacy', getTitle)).toBeNull()

    expect(
      StaticPage.getRevisions(
        { de: { privacy: [] } },
        'fr',
        'privacy',
        getTitle
      )
    ).toBeNull()
  })
})

describe('getPage()', () => {
  const exampleConfig: StaticPage.UnrevisedConfig = {
    en: { imprint: { url: 'http://e/' } },
    de: { imprint: { url: 'http://g/' }, terms: { url: 'ftp://gt/' } }
  }

  test('returns Spec when it exists', () => {
    expect(
      StaticPage.getPage(exampleConfig, 'en', 'imprint', getTitle)
    ).toEqual({
      url: 'http://e/',
      lang: 'en',
      title: '#imprint#'
    })

    expect(
      StaticPage.getPage(exampleConfig, 'de', 'imprint', getTitle)
    ).toEqual({
      url: 'http://g/',
      lang: 'de',
      title: '#imprint#'
    })

    expect(StaticPage.getPage(exampleConfig, 'de', 'terms', getTitle)).toEqual({
      url: 'ftp://gt/',
      lang: 'de',
      title: '#terms#'
    })
  })

  test('returns English version when requested Spec does not exist', () => {
    expect(
      StaticPage.getPage(exampleConfig, 'fr', 'imprint', getTitle)
    ).toEqual({
      url: 'http://e/',
      lang: 'en',
      title: '#imprint#'
    })
  })

  test('returns null when no Spec or English Spec can be found', () => {
    expect(StaticPage.getPage(exampleConfig, 'fr', 'terms')).toBeNull()
    expect(StaticPage.getPage(exampleConfig, 'en', 'terms')).toBeNull()
  })
})

function getTitle(
  typeName: StaticPage.RevisedType | StaticPage.UnrevisedType
): string {
  return '#' + typeName + '#'
}

async function withMockedFetch(
  response: Response | string,
  fn: () => Promise<void>
): Promise<void> {
  const value = typeof response === 'string' ? new Response(response) : response
  const fetch = jest.fn().mockReturnValueOnce(value)

  // @ts-ignore
  global.fetch = fetch

  await fn()

  expect(fetch).toHaveBeenCalled()
}

function hasLangAttribute(html: ReturnType<typeof render>, lang: string): void {
  const htmlElement = html.getByText(/.*/, { selector: 'html' })
  expect(htmlElement).toHaveAttribute('lang', lang)
}
