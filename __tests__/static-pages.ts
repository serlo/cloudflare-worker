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
  expect(html.getByText('Imprint')).toBeVisible()
  expect(html.getByText('Hello World')).toBeVisible()
})

describe('getPage()', () => {
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

  let fetch: jest.Mocked<any>

  beforeAll(() => {
    fetch = jest.fn()

    // @ts-ignore
    global.fetch = fetch
  })

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
    de: { privacy: germanRevisions }
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
