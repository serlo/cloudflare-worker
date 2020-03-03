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
import * as StaticPage from '../src/static-pages'
import { render } from '@testing-library/preact'

let fetch: jest.Mocked<any>

function newMockedFetch() {
  fetch = jest.fn()

  // @ts-ignore
  global.fetch = fetch
}

describe('handleRequest()', () => {
  beforeAll(newMockedFetch)

  const unrevisedConfig: StaticPage.UnrevisedConfig = {
    en: {
      imprint: {
        title: 'Imprint',
        url: 'https://example.org/imprint.html'
      }
    },
    de: {
      terms: {
        title: 'Nutzungsbedingungen',
        url: 'https://example.org/terms.md'
      }
    }
  }

  const revisedConfig: StaticPage.RevisedConfig = {
    fr: {
      privacy: []
    },
    de: {
      privacy: [
        {
          title: 'Foo',
          url: 'http://example.org/1',
          revision: new Date(2020, 11, 11)
        },
        {
          title: 'Bar',
          url: 'http://example.org/2',
          revision: new Date(1999, 9, 9)
        }
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
      fetch.mockReturnValueOnce(new Response('<p>Hello World</p>'))

      const response = (await handleRequest(url)) as Response

      expect(response).not.toBeNull()
      expect(response.status).toBe(200)
      expect(await response.text()).toEqual(
        expect.stringContaining('<p>Hello World</p>')
      )

      expect(fetch).toHaveBeenCalled()
    })
  })

  test('returns unrevised page response at /terms (markdown specification)', async () => {
    fetch.mockReturnValueOnce(new Response('# Terms of Use'))

    const url = 'https://de.serlo.org/terms'
    const response = (await handleRequest(url)) as Response

    // TODO Test response type is html
    expect(response).not.toBeNull()
    expect(response.status).toBe(200)
    expect(await response.text()).toEqual(
      expect.stringContaining('<h1>Terms of Use</h1>')
    )

    expect(fetch).toHaveBeenCalled()
  })

  test('returns list of revision ids for requests at /privacy/json', async () => {
    const url = 'https://de.serlo.org/privacy/json'
    const response = (await handleRequest(url)) as Response

    // TODO: test header type is JSON
    expect(response).not.toBeNull()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(['2020-12-11', '1999-10-09'])

    expect(fetch).toHaveBeenCalled()
  })

  describe('returns 404 reponse if requested page and its default is not configured', () => {
    test.each([
      'https://en.serlo.org/terms/',
      'https://fr.serlo.org/terms',
      'https://fr.serlo.org/privacy/json',
      'https://en.serlo.org/privacy/json'
    ])('URL is %p', async url => {
      const response = (await handleRequest(url)) as Response

      expect(response).not.toBeNull()
      expect(response.status).toBe(404)
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

test('UnrevisedPageView()', () => {
  const html = render(
    StaticPage.UnrevisedPageView({
      lang: 'de',
      title: 'Imprint',
      content: '<p>Hello World</p>'
    })
  )

  const htmlElement = html.getByText(/.*/, { selector: 'html' })
  expect(htmlElement).toHaveAttribute('lang', 'de')

  expect(html.getByText('Imprint', { selector: "h1" })).toBeVisible()
  expect(html.getByText('Hello World')).toBeVisible()
})

test('RevisedPageView()', () => {
  const html = render(
    StaticPage.RevisedPageView({
      lang: 'en',
      revision: new Date(2019, 0, 1),
      title: 'Privacy',
      content: '<p>Hello World</p>'
    })
  )

  const htmlElement = html.getByText(/.*/, { selector: 'html' })
  expect(htmlElement).toHaveAttribute('lang', 'en')

  expect(html.getByText('Privacy', { selector: 'h1' })).toBeVisible()
  expect(html.getByText('(1/1/2019)')).toBeVisible()
  expect(html.getByText('Hello World')).toBeVisible()
})

describe('getPage()', () => {
  beforeAll(newMockedFetch)

  const exampleSpec: StaticPage.Spec = {
    lang: 'en',
    title: 'Imprint',
    url: 'http://example.org/'
  }
  const exampleSpecMarkdown: StaticPage.Spec = {
    lang: 'de',
    title: 'Imprint',
    url: 'http://example.org/imprint.md'
  }

  describe('returns page when url can be resolved', () => {
    test('parses reponse as Markdown if url ends with `.md`', async () => {
      fetch.mockReturnValueOnce(new Response('# Hello World'))

      expect(await StaticPage.getPage(exampleSpecMarkdown)).toEqual({
        lang: 'de',
        title: 'Imprint',
        content: '<h1>Hello World</h1>'
      })

      expect(fetch).toHaveBeenCalled()
    })

    test('returns response content when url does not end with `.md`', async () => {
      fetch.mockReturnValueOnce(new Response('<h1>Hello World</h1>'))

      expect(await StaticPage.getPage(exampleSpec)).toEqual({
        lang: 'en',
        title: 'Imprint',
        content: '<h1>Hello World</h1>'
      })

      expect(fetch).toHaveBeenCalled()
    })

    describe('returned HTML is sanitized', () => {
      test('HTML response', async () => {
        fetch.mockReturnValueOnce(
          new Response('<h1>Hello World</h1><script>alert(42)</script>')
        )

        expect(await StaticPage.getPage(exampleSpec)).toEqual({
          lang: 'en',
          title: 'Imprint',
          content: '<h1>Hello World</h1>'
        })

        expect(fetch).toHaveBeenCalled()
      })

      test('Markdown response', async () => {
        fetch.mockReturnValueOnce(
          new Response('Hello\n<iframe src="http://serlo.org/">')
        )

        expect(await StaticPage.getPage(exampleSpecMarkdown)).toEqual({
          lang: 'de',
          title: 'Imprint',
          content: '<p>Hello</p>'
        })

        expect(fetch).toHaveBeenCalled()
      })
    })
  })

  describe('returns null when request on the url of the spec fails', () => {
    test.each([301, 404, 500])('status code %p', async code => {
      fetch.mockReturnValueOnce(new Response('', { status: code }))

      expect(await StaticPage.getPage(exampleSpec)).toBeNull()
      expect(fetch).toHaveBeenCalled()
    })
  })
})

describe('getRevisionId()', () => {
  test.each([
    [new Date(2020, 0, 3), '2020-01-03'],
    [new Date(20, 8, 6), '1920-09-06'],
    [new Date(1988, 11, 11), '1988-12-11']
  ])('date %p', (date, id) => {
    expect(StaticPage.getRevisionId({ revision: date })).toBe(id)
  })
})

describe('getRevisions()', () => {
  const englishRevisions = [
    {
      title: 'Foo',
      url: 'http://example.com/bar',
      revision: new Date(1995, 11, 17)
    },
    {
      title: 'Hello',
      url: 'http://example.com/world.md',
      revision: new Date(2009, 12, 17)
    }
  ]
  const germanRevisions = [
    {
      title: 'Imprint',
      url: 'http://example.org/impressum',
      revision: new Date(2020, 1, 1)
    }
  ]
  const exampleSpec: StaticPage.RevisedConfig = {
    en: { privacy: englishRevisions },
    de: { privacy: germanRevisions },
    fr: { privacy: [] }
  }

  test('returns revisions if they exist in config', () => {
    expect(
      StaticPage.getRevisions(exampleSpec, 'en', StaticPage.RevisedType.Privacy)
    ).toEqual(
      englishRevisions.map(x => {
        return { ...x, lang: 'en' }
      })
    )
    expect(
      StaticPage.getRevisions(exampleSpec, 'de', StaticPage.RevisedType.Privacy)
    ).toEqual(
      germanRevisions.map(x => {
        return { ...x, lang: 'de' }
      })
    )
  })

  test('returns revisions of default language if requested one does not exist', () => {
    expect(
      StaticPage.getRevisions(exampleSpec, 'fr', StaticPage.RevisedType.Privacy)
    ).toEqual(
      englishRevisions.map(x => {
        return { ...x, lang: 'en' }
      })
    )
  })

  test('returns null if requested and default revisions do not exist', () => {
    expect(
      StaticPage.getRevisions({}, 'en', StaticPage.RevisedType.Privacy)
    ).toBeNull()

    expect(
      StaticPage.getRevisions(
        { de: { privacy: germanRevisions } },
        'fr',
        StaticPage.RevisedType.Privacy
      )
    ).toBeNull()
  })
})

describe('getSpec()', () => {
  const englishImprint = {
    title: 'English Imprint',
    url: 'http://example.com/imprint'
  }
  const germanImprint = {
    title: 'German Imprint',
    url: 'https://example.org/impressum.md'
  }
  const germanTerms = {
    title: 'Nutzungsbedingungen',
    url: 'ftp://serlo.org/terms'
  }
  const exampleConfig: StaticPage.UnrevisedConfig = {
    en: {
      imprint: englishImprint
    },
    de: {
      imprint: germanImprint,
      terms: germanTerms
    }
  }

  test('returns Spec when it exists', () => {
    expect(
      StaticPage.getSpec(exampleConfig, 'en', StaticPage.UnrevisedType.Imprint)
    ).toEqual({ ...englishImprint, lang: 'en' })

    expect(
      StaticPage.getSpec(exampleConfig, 'de', StaticPage.UnrevisedType.Imprint)
    ).toEqual({ ...germanImprint, lang: 'de' })

    expect(
      StaticPage.getSpec(
        exampleConfig,
        'de',
        StaticPage.UnrevisedType.TermsOfUse
      )
    ).toEqual({ ...germanTerms, lang: 'de' })
  })

  test('returns English version when requested Spec does not exist', () => {
    expect(
      StaticPage.getSpec(exampleConfig, 'fr', StaticPage.UnrevisedType.Imprint)
    ).toEqual({ ...englishImprint, lang: 'en' })
  })

  test('returns null when no Spec or English Spec can be found', () => {
    expect(
      StaticPage.getSpec(
        exampleConfig,
        'fr',
        StaticPage.UnrevisedType.TermsOfUse
      )
    ).toBeNull()

    expect(
      StaticPage.getSpec(
        exampleConfig,
        'en',
        StaticPage.UnrevisedType.TermsOfUse
      )
    ).toBeNull()
  })
})

test('mapRevised()', () => {
  type Foo = { foo: number }
  const func = (x: Foo) => {
    return { foo: x.foo ** 2 }
  }

  expect(
    StaticPage.mapRevised(func, { foo: 4, revision: new Date(2020, 1, 1) })
  ).toEqual({ foo: 16, revision: new Date(2020, 1, 1) })
})
